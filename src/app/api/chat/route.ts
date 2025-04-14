// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { pineconeIndex } from '@/lib/pinecone'; // Import Pinecone client

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  namespace?: string;
}

export async function POST(request: Request) {
  try {
    const { message, destination, chatHistory = [] } = await request.json();
    console.log('Received request with message:', message);
    console.log('Received chat history:', chatHistory.length, 'messages');
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    // 1. Generate query embedding from the user's message.
    const embedding = await getEmbedding(message);
    console.log('Generated embedding for message');

    // 2. Retrieve context snippets from Pinecone.
    const contextSnippets = await fetchFromPinecone(embedding, 3, destination);
    console.log('Retrieved context snippets:', contextSnippets.length, 'snippets');
    
    // 3. Construct a detailed prompt that includes the user query and the retrieved context.
    const prompt = constructPrompt(message, contextSnippets, chatHistory);
    console.log('Constructed prompt with history and context');

    const template = `Answer the user's questions based only on the following context. 
If the answer is not in the context, reply politely that you do not have that information available.
Provide concise, practical advice with the following formatting:
- Do not reiterate the user's message in your response
- Use headings with # for main sections
- Use bullet points - for lists
- Use paragraphs for detailed explanations
- Highlight important information with **bold text**
- Keep responses focused and to the point
- If suggesting locations, include brief descriptions
- If suggesting activities, include approximate durations
- If suggesting accommodations, include price ranges when possible

START CONTEXT BLOCK
Context: {context}
END CONTEXT BLOCK

START CONVERSATION BLOCK
Current conversation: {chat_history}
END CONVERSATION BLOCK

START USER MESSAGE BLOCK
user: {user_message}
END USER MESSAGE BLOCK

START ASSISTANT MESSAGE BLOCK
assistant: {assistant_message}
END ASSISTANT MESSAGE BLOCK` 

    // 4. Call the OpenAI Chat Completion API with the constructed prompt.
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: template
        },
        { role: "user", content: prompt }
      ],
      temperature: 0,
      max_tokens: 500,
    });

    // Extract the assistant's response.
    const assistantMessage = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    // Return the response.
    return NextResponse.json({ 
      response: assistantMessage,
      role: 'assistant'
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}

function buildFilterFromPreferences(preferences: any = {}) {
  const filter: any = {};
  
  if (preferences.destination) {
    filter.destination = { $eq: preferences.destination };
  }
  
  if (preferences.budget) {
    filter.budget_category = { $eq: preferences.budget };
  }
  
  if (preferences.activities && preferences.activities.length > 0) {
    filter.activities = { $in: preferences.activities };
  }
  
  return Object.keys(filter).length > 0 ? filter : undefined;
}

async function fetchFromPinecone(embedding: number[], topK: number = 3, destination?: string): Promise<string[]> {
  try {
    const queryOptions: any = {
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    };

    if (destination) {
      queryOptions.namespace = destination.toLowerCase(); // Use destination as namespace
    }

    const queryResponse = await pineconeIndex.query(queryOptions);

    if (!queryResponse || !queryResponse.matches) {
      console.log("No matches found in Pinecone.");
      return [];
    }

    const contextSnippets = queryResponse.matches.map((match) => {
      const metadata = match.metadata as any;
      return metadata ? metadata.text : 'No context available';
    });

    return contextSnippets;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return [];
  }
}

// Helper function to generate a query embedding using OpenAI's API.
async function getEmbedding(message: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      input: message,
      model: 'text-embedding-3-large'
    })
  });
  const data = await res.json();
  return data.data[0].embedding;
}

// Helper function that constructs the final prompt using user input and context.
function constructPrompt(userMessage: string, contextSnippets: string[], messageHistory: Message[] = []) {
  // Format message history for context
  const formattedHistory = messageHistory
    .map(msg => `User: ${msg.content}`)
    .join('\n');
  
  return `User Query: "${userMessage}"\n\nContext:\n${contextSnippets.join("\n")}\n\nPrevious User Messages:\n${formattedHistory}\n\nBased on the above context and conversation history, provide a detailed travel recommendation specific to ${userMessage}.`;
}
