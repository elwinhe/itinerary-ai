// src/scripts/indexTravelData.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

function getContinent(destination: string): string {
  const continentMap: Record<string, string> = {
    'Paris': 'Europe',
    'Kyoto': 'Asia',
    'Bali': 'Asia',
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

// Helper function to extract accessibility information
function extractAccessibility(content: string): Record<string, boolean> {
  const lowerContent = content.toLowerCase();
  
  return {
    wheelchair: lowerContent.includes('wheelchair accessible') || 
                lowerContent.includes('wheelchair-friendly') || 
                lowerContent.includes('wheelchair access'),
    brailleSignage: lowerContent.includes('braille signage') || 
                    lowerContent.includes('braille signs'),
    audioDescriptions: lowerContent.includes('audio description') || 
                      lowerContent.includes('audio guide'),
    quietSpaces: lowerContent.includes('quiet space') || 
                lowerContent.includes('sensory-friendly') ||
                lowerContent.includes('low-stimulus')
  };
}

// Helper function to extract family-friendly features
function extractFamilyFeatures(content: string): Record<string, boolean> {
  const lowerContent = content.toLowerCase();
  
  return {
    kidZones: lowerContent.includes('kid zone') || 
              lowerContent.includes('children\'s area') || 
              lowerContent.includes('play area'),
    strollerAccess: lowerContent.includes('stroller access') || 
                   lowerContent.includes('stroller-friendly'),
    familyRooms: lowerContent.includes('family room') || 
                lowerContent.includes('family suite'),
    childCare: lowerContent.includes('childcare') || 
              lowerContent.includes('babysitting')
  };
}

// Helper function to extract sustainability metrics
function extractSustainability(content: string): Record<string, boolean> {
  const lowerContent = content.toLowerCase();
  
  return {
    ecoCertified: lowerContent.includes('eco-certified') || 
                 lowerContent.includes('green certified'),
    renewableEnergy: lowerContent.includes('renewable energy') || 
                    lowerContent.includes('solar power'),
    waterConservation: lowerContent.includes('water conservation') || 
                      lowerContent.includes('water-saving'),
    localSourcing: lowerContent.includes('local sourcing') || 
                  lowerContent.includes('locally sourced')
  };
}

// Helper function to analyze weather patterns and detect peak seasons
function analyzeWeatherPatterns(content: string): Record<string, string> {
  const lowerContent = content.toLowerCase();
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const weatherTerms = {
    hot: ['hot', 'warm', 'humid', 'tropical', 'heat'],
    mild: ['mild', 'pleasant', 'temperate', 'moderate'],
    cool: ['cool', 'chilly', 'cold', 'frost', 'snow']
  };
  
  const monthlyWeather: Record<string, string> = {};
  
  // Extract weather information for each month
  months.forEach(month => {
    if (lowerContent.includes(month)) {
      // Find weather terms near the month mention
      const monthIndex = lowerContent.indexOf(month);
      const context = lowerContent.substring(Math.max(0, monthIndex - 50), Math.min(lowerContent.length, monthIndex + 50));
      
      if (weatherTerms.hot.some(term => context.includes(term))) {
        monthlyWeather[month] = 'hot';
      } else if (weatherTerms.mild.some(term => context.includes(term))) {
        monthlyWeather[month] = 'mild';
      } else if (weatherTerms.cool.some(term => context.includes(term))) {
        monthlyWeather[month] = 'cool';
      } else {
        monthlyWeather[month] = 'unknown';
      }
    }
  });
  
  return monthlyWeather;
}

// Helper function to detect peak seasons based on weather patterns
function detectPeakSeasons(monthlyWeather: Record<string, string>): string[] {
  const peakSeasons: string[] = [];
  
  // Count occurrences of each weather type
  const weatherCounts: Record<string, number> = {
    hot: 0,
    mild: 0,
    cool: 0
  };
  
  Object.values(monthlyWeather).forEach(weather => {
    if (weather !== 'unknown') {
      weatherCounts[weather]++;
    }
  });
  
  // Determine peak seasons based on weather patterns
  if (weatherCounts.hot > 3) {
    peakSeasons.push('summer');
  }
  
  if (weatherCounts.mild > 3) {
    peakSeasons.push('spring');
    peakSeasons.push('fall');
  }
  
  if (weatherCounts.cool > 3) {
    peakSeasons.push('winter');
  }
  
  return peakSeasons.length > 0 ? peakSeasons : ['year-round'];
}

// Helper function to extract media references
function extractMediaReferences(content: string): Record<string, string[]> {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const videoPattern = /<video[^>]*src="([^"]+)"[^>]*>/g;
  
  const imageUrls: string[] = [];
  const videoIds: string[] = [];
  
  // Extract image URLs
  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    imageUrls.push(match[2]);
  }
  
  // Extract video IDs
  while ((match = videoPattern.exec(content)) !== null) {
    videoIds.push(match[1]);
  }
  
  return {
    imageUrls,
    videoIds
  };
}

// Helper function to detect language
function detectLanguage(content: string): string {
  // Simple language detection based on common words
  const languagePatterns: Record<string, string[]> = {
    'english': ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had'],
    'french': ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'être'],
    'spanish': ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son'],
    'japanese': ['です', 'ます', 'した', 'ている', 'いる', 'ある', 'ない'],
    'chinese': ['的', '是', '在', '有', '不', '了', '我', '你', '他']
  };
  
  const lowerContent = content.toLowerCase();
  const wordCounts: Record<string, number> = {};
  
  // Count occurrences of common words for each language
  Object.entries(languagePatterns).forEach(([lang, words]) => {
    wordCounts[lang] = words.filter(word => lowerContent.includes(word)).length;
  });
  
  // Find the language with the most matches
  let detectedLang = 'unknown';
  let maxCount = 0;
  
  Object.entries(wordCounts).forEach(([lang, count]) => {
    if (count > maxCount) {
      maxCount = count;
      detectedLang = lang;
    }
  });
  
  return detectedLang;
}

// Helper function to extract sentiment from content
function analyzeSentiment(content: string): string {
  const lowerContent = content.toLowerCase();
  
  const positiveWords = ['amazing', 'excellent', 'great', 'wonderful', 'perfect', 'beautiful', 'fantastic', 'best', 'love', 'enjoy'];
  const negativeWords = ['terrible', 'awful', 'bad', 'poor', 'disappointing', 'worst', 'hate', 'avoid', 'waste', 'overpriced'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  if (positiveCount > negativeCount * 2) {
    return 'positive';
  } else if (negativeCount > positiveCount * 2) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

// Helper function to extract numerical rating
function extractNumericalRating(content: string): number | null {
  // Look for patterns like "4.5/5" or "4.5 out of 5"
  const ratingPattern = /(\d+(\.\d+)?)\s*\/\s*5|(\d+(\.\d+)?)\s*out\s*of\s*5/i;
  const match = content.match(ratingPattern);
  
  if (match) {
    return parseFloat(match[1] || match[3]);
  }
  
  // Look for star ratings
  const starPattern = /(\d+(\.\d+)?)\s*stars?/i;
  const starMatch = content.match(starPattern);
  
  if (starMatch) {
    return parseFloat(starMatch[1]);
  }
  
  return null;
}

// Helper function to extract GPS coordinates
function extractGPSCoordinates(content: string): { lat: number | null, lng: number | null } {
  // Look for patterns like "35.0116° N, 135.7681° E" or "35.0116, 135.7681"
  const coordPattern = /(\d+(\.\d+)?)\s*°?\s*([NSns])\s*,\s*(\d+(\.\d+)?)\s*°?\s*([EWew])/;
  const match = content.match(coordPattern);
  
  if (match) {
    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[4]);
    
    // Adjust for N/S and E/W
    if (match[3].toLowerCase() === 's') lat = -lat;
    if (match[6].toLowerCase() === 'w') lng = -lng;
    
    return { lat, lng };
  }
  
  // Look for simpler patterns like "35.0116, 135.7681"
  const simplePattern = /(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)/;
  const simpleMatch = content.match(simplePattern);
  
  if (simpleMatch) {
    return { 
      lat: parseFloat(simpleMatch[1]), 
      lng: parseFloat(simpleMatch[3]) 
    };
  }
  
  return { lat: null, lng: null };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
const pineconeIndex = pinecone.Index(indexName);

async function fetchFromPinecone(embedding: number[], topK: number = 3, destination?: string, filters?: Record<string, any>): Promise<string[]> {
  try {
    const queryOptions: any = {
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    };
    
    if (destination) {
      queryOptions.namespace = destination.toLowerCase();
    }
    
    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      queryOptions.filter = buildFilterFromPreferences(filters);
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

// Helper function to build filter from user preferences
function buildFilterFromPreferences(preferences: Record<string, any>): Record<string, any> {
  const filter: Record<string, any> = {};
  
  // Basic filters
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

const MAX_CHUNK_SIZE = 500; 

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

// Helper function to extract metadata from structured content
function extractStructuredMetadata(content: string): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  // Extract title (first line starting with #)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract description
  const descriptionMatch = content.match(/\*\*Description:\*\*\s*(.+)$/m);
  if (descriptionMatch) {
    metadata.description = descriptionMatch[1].trim();
  }
  
  // Extract highlights
  const highlightsMatch = content.match(/\*\*Highlights:\*\*\s*(.+)$/m);
  if (highlightsMatch) {
    metadata.highlights = highlightsMatch[1].trim();
  }
  
  // Extract best for
  const bestForMatch = content.match(/\*\*Best For:\*\*\s*(.+)$/m);
  if (bestForMatch) {
    metadata.bestFor = bestForMatch[1].trim();
  }
  
  // Extract location
  const locationMatch = content.match(/\*\*Location\*\*:\s*(.+)$/m);
  if (locationMatch) {
    metadata.location = locationMatch[1].trim();
  }
  
  // Extract seasonal availability
  const seasonalMatch = content.match(/\*\*Seasonal Availability:\*\*\s*(.+)$/m);
  if (seasonalMatch) {
    metadata.seasonal_availability = seasonalMatch[1].trim();
  }
  
  // Extract accessibility
  const accessibilityMatch = content.match(/\*\*Accessibiliy:\*\*\s*(.+)$/m);
  if (accessibilityMatch) {
    metadata.accessibility = accessibilityMatch[1].trim();
  }
  
  // Extract peak seasons
  const peakSeasonsMatch = content.match(/\*\*Peak Seasons:\*\*\s*(.+)$/m);
  if (peakSeasonsMatch) {
    metadata.peakSeasons = peakSeasonsMatch[1].trim();
  }
  
  // Extract price range
  const priceRangeMatch = content.match(/\*\*Price Range:\*\*\s*(.+)$/m);
  if (priceRangeMatch) {
    metadata.price_range = priceRangeMatch[1].trim();
  }
  
  // Extract activities
  const activitiesMatch = content.match(/\*\*Activities:\*\*\s*(.+)$/m);
  if (activitiesMatch) {
    metadata.activities = activitiesMatch[1].trim();
  }
  
  // Extract sustainability
  const sustainabilityMatch = content.match(/\*\*Sustainability:\*\*\s*(.+)$/m);
  if (sustainabilityMatch) {
    metadata.sustainability = sustainabilityMatch[1].trim();
  }
  
  // Extract rating
  const ratingMatch = content.match(/\*\*Rating:\*\*\s*(.+)$/m);
  if (ratingMatch) {
    metadata.rating = ratingMatch[1].trim();
  }
  
  return metadata;
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

    // Generate a content hash for version control
    const contentHash = createHash('md5').update(content).digest('hex');

    // Extract structured metadata from the content
    const structuredMetadata = extractStructuredMetadata(content);
    
    const metadata = {
      source: fileName,                 // Source file
      destination,                      // City/country name
      type,                            // 'guide', 'blog', 'review', etc.
      continent: getContinent(destination), // Helper function to categorize by continent
      url,                             // Default empty string for URL
      dateIndexed: new Date().toISOString(),
      documentVersion: contentHash,     // Add version control
      // Fields from structured metadata
      title: structuredMetadata.title || '',
      description: structuredMetadata.description || '',
      highlights: structuredMetadata.highlights || '',
      bestFor: structuredMetadata.bestFor || '',
      location: structuredMetadata.location || '',
      seasonal_availability: structuredMetadata.seasonal_availability || '',
      accessibility: structuredMetadata.accessibility || '',
      peakSeasons: structuredMetadata.peakSeasons || '',
      price_range: structuredMetadata.price_range || '',
      activities: structuredMetadata.activities || '',
      sustainability: structuredMetadata.sustainability || '',
      rating: structuredMetadata.rating || ''
    };
    
    // Special handling for different content types
    let chunks;
    if (type === 'itinerary') {
      // Split itineraries by day
      chunks = splitByDay(content, metadata);
    } else if (type === 'review') {
      // For reviews, keep them as single chunks to preserve context
      chunks = [{
        text: content,
        metadata: {
          ...metadata,
          chunkId: uuidv4()
        }
      }];
    } else {
      // Default chunking for other content types
      chunks = await chunkDocument(content, metadata);
    }
    
    console.log(`Created ${chunks.length} chunks from ${fileName}`);
    
    // Process each chunk (in batches to avoid rate limits)
    const BATCH_SIZE = process.env.NODE_ENV === 'production' ? 50 : 10;
    const vectorsToUpsert = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let chunkText: string;
      let chunkMetadata: any = {};
      
      if (typeof chunk === 'string') {
        chunkText = chunk;
      } else {
        chunkText = chunk.text;
        chunkMetadata = chunk.metadata || {};
      }
      
      // Generate embedding
      const embedding = await generateEmbedding(chunkText);
      
      // Prepare vector for upsert
      vectorsToUpsert.push({
        id: `${destination.toLowerCase()}-${uuidv4()}`,
        values: embedding,
        metadata: {
          ...chunkMetadata,
          text: chunkText,
          chunk_index: i.toString(),
          total_chunks: chunks.length.toString()
        }
      });
      
      // Fix index reference (around line 782)
      if (vectorsToUpsert.length >= BATCH_SIZE || i === chunks.length - 1) {
        const namespace = destination.toLowerCase();
        const index = pineconeIndex.namespace(namespace);
        
        // Implement exponential backoff for upsert
        let retries = 0;
        const maxRetries = 3;
        let success = false;
        
        while (!success && retries < maxRetries) {
          try {
            await index.upsert(vectorsToUpsert.map(vector => ({
              id: vector.id,
              values: vector.values,
              metadata: vector.metadata
            })));
            console.log(`Upserted batch of ${vectorsToUpsert.length} vectors to namespace: ${namespace}`);
            success = true;
          } catch (error) {
            retries++;
            const backoffTime = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.error(`Error upserting batch (attempt ${retries}/${maxRetries}):`, error);
            console.log(`Retrying in ${backoffTime/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
        
        if (!success) {
          console.error(`Failed to upsert batch after ${maxRetries} attempts`);
        }
        
        vectorsToUpsert.length = 0;
      }
    }
    
    console.log(`Finished processing ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Helper function to split itineraries by day
function splitByDay(content: string, metadata: any): Array<{text: string, metadata: any}> {
  const dayPattern = /(?:Day|Day\s+\d+|[Dd]ay\s+\d+|[Dd]ay\s+[Oo]ne|[Dd]ay\s+[Tt]wo|[Dd]ay\s+[Tt]hree|[Dd]ay\s+[Ff]our|[Dd]ay\s+[Ff]ive|[Dd]ay\s+[Ss]ix|[Dd]ay\s+[Ss]even|[Dd]ay\s+[Ee]ight|[Dd]ay\s+[Nn]ine|[Dd]ay\s+[Tt]en)/g;
  
  // Split content by day headers
  const parts = content.split(dayPattern);
  
  // If no day headers found, return the whole content as one chunk
  if (parts.length <= 1) {
    return [{
      text: content,
      metadata: {
        ...metadata,
        chunkId: uuidv4(),
        section_title: "Itinerary"
      }
    }];
  }
  
  // Process parts to create day-based chunks
  const chunks: Array<{text: string, metadata: any}> = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // This is the content between day headers
      if (parts[i].trim()) {
        chunks.push({
          text: parts[i].trim(),
          metadata: {
            ...metadata,
            chunkId: uuidv4(),
            section_title: i === 0 ? "Introduction" : `Day ${Math.floor(i/2)}`
          }
        });
      }
    } else {
      // This is a day header
      if (i + 1 < parts.length && parts[i + 1].trim()) {
        chunks.push({
          text: parts[i + 1].trim(),
          metadata: {
            ...metadata,
            chunkId: uuidv4(),
            section_title: parts[i].trim()
          }
        });
      }
    }
  }
  
  return chunks;
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
    { name: 'Bali', type: 'blog', files: ['bali_food.txt', 'bali_attractions.txt', 'bali_lodging.txt'] },
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
