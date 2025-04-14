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
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    // 1. Generate query embedding from the user's message.
    const embedding = await getEmbedding(message);
    console.log('Generated embedding for message');

    // 2. Retrieve context snippets from Pinecone.
    const contextSnippets = await fetchFromPinecone(embedding, 3, destination);
    console.log('Retrieved context snippets:', contextSnippets.length, 'snippets');
    
    // If no context snippets are found, return early with a message
    if (contextSnippets.length === 0) {
      return NextResponse.json({ 
        response: "CONTEXT IS EMPTY.",
        role: 'assistant'
      });
    }
    
    // 3. Construct a detailed prompt that includes the user query and the retrieved context.
    const prompt = constructPrompt(message, contextSnippets, chatHistory);
    console.log('Constructed prompt with history and context');

    const template = `
  STRICT INSTRUCTION: You are a travel assistant that can ONLY provide information that is EXPLICITLY present in the context snippets provided below.
  You MUST NOT use any external knowledge, make assumptions, or infer information not directly stated in the context.
  If the user asks about something not covered in the context, respond with: "I don't have specific information about that in my database. Please try asking about something else."
  
  Provide concise, practical advice with the following formatting:
  - Do NOT start your response with a title that repeats the user's question
  - Use headings with # for main sections (but not as the first line)
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
    console.log(`Fetching from Pinecone with destination: ${destination || 'default'}`);
    
    const queryOptions = {
      vector: embedding,
      topK,
      includeMetadata: true
    };

    let index = pineconeIndex;
    if (destination) {
      const namespace = destination.toLowerCase();
      console.log(`Using namespace: ${namespace}`);
      index = pineconeIndex.namespace(namespace);
    }

    const queryResponse = await index.query(queryOptions);

    if (!queryResponse || !queryResponse.matches) {
      console.log("No matches found in Pinecone.");
      return [];
    }

    console.log(`Found ${queryResponse.matches.length} matches in Pinecone.`);
    const contextSnippets = queryResponse.matches.map((match) => {
      const metadata = match.metadata as any;
      return metadata ? metadata.text : 'No context available';
    });

    return contextSnippets;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return [];
  }
}

// Helper function to generate a query embedding using OpenAI's API.
async function getEmbedding(message: string) {
  console.log(`Generating embedding for message: "${message}"`);
  
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      input: message,
      model: 'text-embedding-3-small'
    })
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`OpenAI API error: ${res.status} ${res.statusText}`, errorText);
    throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.data[0].embedding;
}

// Helper function that constructs the final prompt using user input and context.
function constructPrompt(userMessage: string, contextSnippets: string[], messageHistory: Message[] = []) {
  // Format message history for context
  const formattedHistory = messageHistory
    .map(msg => `User: ${msg.content}`)
    .join('\n');
  
  return `User Query: "${userMessage}"\n\nContext:\n${contextSnippets.join("\n")}\n\nPrevious User Messages:\n${formattedHistory}\n\nBased STRICTLY on the above context and conversation history, provide a detailed travel recommendation specific to ${userMessage}. IMPORTANT: Do NOT start your response with a title or heading that repeats the user's question. Begin directly with the content of your response. ONLY use information EXPLICITLY stated in the provided context snippets. DO NOT use any external knowledge or make assumptions.`;
}
