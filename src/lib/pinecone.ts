// src/lib/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing Pinecone API Key in .env.local');
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('Missing Pinecone Index Name in .env.local');
}

const pinecone = new Pinecone();

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

export default pinecone;
