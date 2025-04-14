const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

console.log('Starting travel data indexing process...');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

try {
  execSync('npx tsx scripts/indexTravelData.ts', { 
    stdio: 'inherit',
    env: { ...process.env } // Pass the loaded environment variables
  });
  console.log('Indexing completed successfully!');
} catch (error) {
  console.error('Error during indexing:', error.message);
  process.exit(1);
} 