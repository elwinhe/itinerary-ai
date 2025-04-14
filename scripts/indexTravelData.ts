import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper function to categorize destinations by continent
function getContinent(destination: string): string {
  const continentMap: Record<string, string> = {
    'Paris': 'Europe',
    'London': 'Europe',
    'Tokyo': 'Asia',
    'Kyoto': 'Asia',
    'New York': 'North America',
    'Los Angeles': 'North America',
    'Sydney': 'Oceania',
    'Cairo': 'Africa',
    'Cape Town': 'Africa',
    'Rio de Janeiro': 'South America',
    'Buenos Aires': 'South America'
  };
  
  return continentMap[destination] || 'Unknown';
}

// Helper function to extract season information from content
function getSeason(content: string): string {
  const seasons = ['spring', 'summer', 'fall', 'winter', 'autumn'];
  const lowerContent = content.toLowerCase();
  
  for (const season of seasons) {
    if (lowerContent.includes(season)) {
      return season.charAt(0).toUpperCase() + season.slice(1);
    }
  }
  
  return 'Any';
}

// Helper function to determine budget category from content
function getBudgetCategory(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('luxury') || lowerContent.includes('expensive') || lowerContent.includes('high-end')) {
    return 'luxury';
  } else if (lowerContent.includes('budget') || lowerContent.includes('cheap') || lowerContent.includes('affordable')) {
    return 'budget';
  } else {
    return 'mid-range';
  }
}

// Helper function to extract activities from content
function extractActivities(content: string): string[] {
  const commonActivities = [
    'hiking', 'swimming', 'sightseeing', 'shopping', 'dining', 
    'museum', 'beach', 'temple', 'park', 'garden', 'tour', 
    'photography', 'cycling', 'fishing', 'camping', 'skiing'
  ];
  
  const lowerContent = content.toLowerCase();
  const foundActivities = commonActivities.filter(activity => 
    lowerContent.includes(activity)
  );
  
  return foundActivities.length > 0 ? foundActivities : ['general'];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
const pineconeIndex = pinecone.Index(indexName);

async function fetchFromPinecone(embedding: number[], topK: number = 3, destination?: string): Promise<string[]> {
  try {
    const queryOptions: any = {
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    };
    
    if (destination) {
      queryOptions.namespace = destination.toLowerCase();
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


// Enhanced chunking that preserves semantic integrity
async function semanticChunking(text: string, metadata: any) {
  // First, split into semantic sections (e.g., "Things to Do", "Where to Stay")
  const sections = extractSections(text);
  
  const chunks = [];
  
  for (const section of sections) {
    // Further chunk each section if it's too large
    if (estimateTokens(section.content) > MAX_CHUNK_SIZE) {
      const sectionChunks = await chunkDocument(section.content, {
        ...metadata,
        section_title: section.title
      });
      chunks.push(...sectionChunks);
    } else {
      chunks.push({
        text: section.content,
        metadata: {
          ...metadata,
          section_title: section.title,
          chunkId: uuidv4()
        }
      });
    }
  }
  
  return chunks;
}

function extractSections(text: string) {
  const headingPattern = /^(#{1,3})\s+(.+)$/gm;
  const sections = [];
  let lastIndex = 0;
  let currentTitle = "Introduction";
  
  const matches = [...text.matchAll(headingPattern)];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    if (match.index > lastIndex) {
      sections.push({
        title: currentTitle,
        content: text.substring(lastIndex, match.index).trim()
      });
    }
    
    currentTitle = match[2];
    lastIndex = match.index + match[0].length;
    
    if (i === matches.length - 1) {
      sections.push({
        title: currentTitle,
        content: text.substring(lastIndex).trim()
      });
    }
  }
  
  if (sections.length === 0) {
    sections.push({
      title: "Content",
      content: text
    });
  }
  
  return sections;
}

const MAX_CHUNK_SIZE = 500; // Optimal for travel content and text-embedding-3-small

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function chunkDocument(text: string, metadata: any) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  const chunks = [];
  let currentChunk = '';
  let currentTokenCount = 0;
  
  for (const paragraph of paragraphs) {
    const estimatedTokens = Math.ceil(paragraph.length / 4);
    
    if (currentTokenCount + estimatedTokens > MAX_CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: { ...metadata, chunkId: uuidv4() }
        });
      }
      currentChunk = paragraph;
      currentTokenCount = estimatedTokens;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokenCount += estimatedTokens;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: { ...metadata, chunkId: uuidv4() }
    });
  }
  
  return chunks;
}

async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });
  
  return response.data[0].embedding;
}

// Process a single travel document
async function processDocument(filePath: string, destination: string, type: string) {
  try {
    console.log(`Processing ${filePath}...`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    const fileName = path.basename(filePath);

    const slug = fileName
      .replace(/\.[^/.]+$/, "")  // Remove file extension.
      .toLowerCase()             
      .replace(/\s+/g, '-')        // Replace spaces with dashes.
      .replace(/[^a-z0-9-]/g, '');  // Remove any non-alphanumeric/dash characters.

    const baseURL = process.env.BASE_URL || "https://www.worldtravelguide.net/";
    const destinationSlug = destination.toLowerCase().replace(/\s+/g, '-');
    const url = `${baseURL}/${destinationSlug}/${slug}`;

    const metadata = {
      source: fileName,                 // Source file
      destination: destination,         // City/country name
      type: type,                       // 'guide', 'blog', 'review', etc.
      continent: getContinent(destination), // Helper function to categorize by continent
      season: getSeason(content),       // Optional: Extract season information
      budget_category: getBudgetCategory(content), // Optional: 'budget', 'mid-range', 'luxury'
      activities: extractActivities(content), // Optional: Extract mentioned activities
      url: url,                          // Default empty string for URL
      dateIndexed: new Date().toISOString()
    };
    
    
    // Chunk the document
    const chunks = await chunkDocument(content, metadata);
    console.log(`Created ${chunks.length} chunks from ${fileName}`);
    
    // Process each chunk (in batches to avoid rate limits)
    const BATCH_SIZE = 10;
    const vectorsToUpsert = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const embedding = await generateEmbedding(chunk.text);
      
      // Prepare vector for upsert
      vectorsToUpsert.push({
        id: `${destination.toLowerCase()}-${uuidv4()}`,
        values: embedding,
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
          chunk_index: i,
          total_chunks: chunks.length
        }
      });
      
      // Upsert in batches
      if (vectorsToUpsert.length >= BATCH_SIZE || i === chunks.length - 1) {
        // Create a namespace-specific index
        const namespaceIndex = pineconeIndex.namespace(destination.toLowerCase());
        await namespaceIndex.upsert(vectorsToUpsert);
        console.log(`Upserted batch of ${vectorsToUpsert.length} vectors to namespace: ${destination.toLowerCase()}`);
        vectorsToUpsert.length = 0; // Clear the batch
      }
    }
    
    console.log(`Finished processing ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Main function to process all travel documents
async function indexTravelData() {
  const dataDir = path.join(process.cwd(), 'data');

  if (!(await fs.stat(dataDir).catch(() => false))) {
    console.error(`Data directory not found at ${dataDir}`);
    return;
  }

  const destinations = [
    { name: 'Kyoto', type: 'guide', files: ['kyoto_food.txt', 'kyoto_attractions.txt', 'kyoto_lodging.txt'] },
    { name: 'Paris', type: 'guide', files: ['paris_food.txt', 'paris_attractions.txt', 'paris_lodging.txt'] },
    { name: 'Bali', type: 'blog', files: ['bali_food.txt', 'bali_attractions.txt', 'bali_lodging.txt', 'bali_beaches.txt'] },
  ];

  for (const destination of destinations) {
    const namespace = destination.name.toLowerCase();
    
    console.log(`Processing destination: ${destination.name}`);
    
    for (const file of destination.files) {
      const filePath = path.join(dataDir, namespace, file);
      
      if (!(await fs.stat(filePath).catch(() => false))) {
        console.error(`File not found: ${filePath}`);
        continue;
      }

      await processDocument(filePath, destination.name, destination.type);
    }
  }

  console.log('Indexing complete!');
}


// Run the indexing process
indexTravelData().catch(console.error);
