// src/lib/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing Pinecone API Key in .env.local');
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('Missing Pinecone Index Name in .env.local');
}

if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing Pinecone Environment in .env.local');
}

// Initialize Pinecone client with the correct configuration for version 5.1.1
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Get the index
export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

export default pinecone;
