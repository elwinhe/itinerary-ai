// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { pineconeIndex } from '@/lib/pinecone'; // Import Pinecone client

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  namespace?: string;
}

// Define a proper type for filters
interface TravelFilters {
  destination?: string;
  budget?: string;
  activities?: string[];
  accessibility?: {
    wheelchair?: boolean;
    brailleSignage?: boolean;
    audioDescriptions?: boolean;
    quietSpaces?: boolean;
  };
  familyFeatures?: {
    kidZones?: boolean;
    strollerAccess?: boolean;
    familyRooms?: boolean;
    childCare?: boolean;
  };
  sustainability?: {
    ecoCertified?: boolean;
    renewableEnergy?: boolean;
    waterConservation?: boolean;
    localSourcing?: boolean;
  };
  season?: string;
  peakSeasons?: string[];
  language?: string;
  minRating?: number;
  sentiment?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  maxDistance?: number;
}

export async function POST(request: Request) {
  try {
    const { message, destination, chatHistory = [], filters = {} } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const embedding = await getEmbedding(message);
    const contextSnippets = await fetchFromPinecone(embedding, 3, destination, filters);
    
    if (contextSnippets.length === 0) {
      return NextResponse.json({ 
        response: "I don't have specific information about that in my database. Please try asking about something else.",
        role: 'assistant'
      });
    }
    
    const prompt = constructPrompt(message, contextSnippets, chatHistory);

    const template = `STRICT INSTRUCTION: You are a travel assistant that can ONLY provide information that is EXPLICITLY present in the context snippets provided below.
You MUST NOT use any external knowledge, make assumptions, or infer information not directly stated in the context.
If the user asks about something not covered in the context, respond with: "I don't have specific information about that in my database. Please try asking about something else."

Provide concise, practical advice with the following formatting:
- Use bulleted paragraphs for detailed explanations
- Highlight important information with **bold text**
- Keep responses focused and to the point
- If suggesting locations, include brief descriptions
- If suggesting activities, include approximate durations
- If suggesting accommodations, include price ranges when possible
- If mentioning accessibility features, highlight them
- If mentioning family-friendly features, highlight them
- If mentioning sustainability features, highlight them`;

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

    const assistantMessage = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json({ 
      response: assistantMessage,
      role: 'assistant',
      namespace: destination ? destination.toLowerCase() : undefined
    });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}

async function fetchFromPinecone(embedding: number[], topK: number = 3, destination?: string, filters: TravelFilters = {}): Promise<string[]> {
  try {
    const queryOptions: {
      vector: number[];
      topK: number;
      includeMetadata: boolean;
      namespace?: string;
      filter?: Record<string, unknown>;
    } = {
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    };
    
    if (destination) {
      const namespace = destination.toLowerCase();
      
      try {
        const queryResponse = await pineconeIndex.namespace(namespace).query(queryOptions);
        
        if (queryResponse.matches && queryResponse.matches.length > 0) {
          const contextSnippets = queryResponse.matches.map((match) => {
            const metadata = match.metadata as Record<string, unknown>;
            if (!metadata || !metadata.text) {
              return null;
            }
            return metadata.text as string;
          }).filter(Boolean) as string[];
          
          if (contextSnippets.length > 0) {
            return contextSnippets;
          }
        }
      } catch (namespaceError) {
        console.error(`Error querying namespace ${namespace}:`, namespaceError);
      }
    }
    
    const queryResponse = await pineconeIndex.query(queryOptions);
    
    if (!queryResponse || !queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }
    
    const contextSnippets = queryResponse.matches.map((match) => {
      const metadata = match.metadata as Record<string, unknown>;
      if (!metadata || !metadata.text) {
        return null;
      }
      return metadata.text as string;
    }).filter(Boolean) as string[];

    return contextSnippets;
  } catch (error) {
    console.error('Error in fetchFromPinecone:', error);
    return [];
  }
}

// Helper function to build filter from user preferences
function buildFilterFromPreferences(preferences: TravelFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  
  if (preferences.destination) {
    filter.destination = { $eq: preferences.destination };
  }
  
  if (preferences.budget) {
    filter.budget_category = { $eq: preferences.budget };
  }
  
  if (preferences.activities && preferences.activities.length > 0) {
    filter.activities = { $in: preferences.activities };
  }
  
  // Enhanced filters for accessibility
  if (preferences.accessibility) {
    if (preferences.accessibility.wheelchair) {
      filter['accessibility.wheelchair'] = { $eq: true };
    }
    if (preferences.accessibility.brailleSignage) {
      filter['accessibility.brailleSignage'] = { $eq: true };
    }
    if (preferences.accessibility.audioDescriptions) {
      filter['accessibility.audioDescriptions'] = { $eq: true };
    }
    if (preferences.accessibility.quietSpaces) {
      filter['accessibility.quietSpaces'] = { $eq: true };
    }
  }
  
  // Family-friendly filters
  if (preferences.familyFeatures) {
    if (preferences.familyFeatures.kidZones) {
      filter['familyFeatures.kidZones'] = { $eq: true };
    }
    if (preferences.familyFeatures.strollerAccess) {
      filter['familyFeatures.strollerAccess'] = { $eq: true };
    }
    if (preferences.familyFeatures.familyRooms) {
      filter['familyFeatures.familyRooms'] = { $eq: true };
    }
    if (preferences.familyFeatures.childCare) {
      filter['familyFeatures.childCare'] = { $eq: true };
    }
  }
  
  // Sustainability filters
  if (preferences.sustainability) {
    if (preferences.sustainability.ecoCertified) {
      filter['sustainability.ecoCertified'] = { $eq: true };
    }
    if (preferences.sustainability.renewableEnergy) {
      filter['sustainability.renewableEnergy'] = { $eq: true };
    }
    if (preferences.sustainability.waterConservation) {
      filter['sustainability.waterConservation'] = { $eq: true };
    }
    if (preferences.sustainability.localSourcing) {
      filter['sustainability.localSourcing'] = { $eq: true };
    }
  }
  
  // Seasonal filters
  if (preferences.season) {
    filter.season = { $eq: preferences.season };
  }
  
  if (preferences.peakSeasons && preferences.peakSeasons.length > 0) {
    filter.peakSeasons = { $in: preferences.peakSeasons };
  }
  
  // Language filter
  if (preferences.language) {
    filter.language = { $eq: preferences.language };
  }
  
  // Rating filter
  if (preferences.minRating) {
    filter.numericalRating = { $gte: preferences.minRating };
  }
  
  // Sentiment filter
  if (preferences.sentiment) {
    filter.sentiment = { $eq: preferences.sentiment };
  }
  
  // Proximity search (if coordinates are provided)
  if (preferences.coordinates && preferences.maxDistance) {
    // This is a simplified approach - in a real implementation, you would use
    // a more sophisticated geospatial query
    filter.hasCoordinates = { $eq: true };
  }
  
  return filter;
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
      model: 'text-embedding-ada-002'
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
  const formattedHistory = messageHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
  
  const context = contextSnippets.join("\n");
  
  return `Context:\n${context}\n\nConversation History:\n${formattedHistory}\n\nUser Query: "${userMessage}"\n\nBased STRICTLY on the above context and conversation history, provide a detailed travel recommendation specific to ${userMessage}. IMPORTANT: Do NOT start your response with a title or heading that repeats the user's question. Begin directly with the content of your response. DO NOT use any leading '#' characters in your response. ONLY use information EXPLICITLY stated in the provided context snippets. DO NOT use any external knowledge or make assumptions.`;
}
