import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
const pineconeIndex = pinecone.index(indexName);

async function checkIndex() {
  try {
    console.log('Checking Pinecone index...');
    
    // Get index stats
    const stats = await pineconeIndex.describeIndexStats();
    console.log('Index stats:', stats);
    
    // Query a test vector
    const testVector = new Array(1536).fill(0);
    const queryResponse = await pineconeIndex.query({
      vector: testVector,
      topK: 5,
      includeMetadata: true
    });
    
    console.log('Query response:', queryResponse);
  } catch (error) {
    console.error('Error checking index:', error);
  }
}

checkIndex().catch(console.error); 