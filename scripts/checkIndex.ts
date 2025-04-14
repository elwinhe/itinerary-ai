import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('Environment variables loaded');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME ? '✓ Set' : '✗ Not set');
console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT ? '✓ Set' : '✗ Not set');

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

const indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
console.log(`Using index: ${indexName}`);

async function checkIndex() {
  try {
    console.log('Initializing Pinecone client...');
    const pineconeIndex = pinecone.index(indexName);
    
    console.log('Checking Pinecone index...');
    
    // Get index stats
    console.log('Fetching index stats...');
    const stats = await pineconeIndex.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));
    
    // Query a test vector
    console.log('Running test query...');
    const testVector = new Array(1536).fill(0);
    const queryResponse = await pineconeIndex.query({
      vector: testVector,
      topK: 5,
      includeMetadata: true
    });
    
    console.log('Query response:', JSON.stringify(queryResponse, null, 2));
    console.log('Pinecone index check completed successfully');
  } catch (error) {
    console.error('Error checking index:', error);
    process.exit(1);
  }
}

// Run the check and handle any unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

checkIndex(); 