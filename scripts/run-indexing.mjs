import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// First check the index
console.log('Checking Pinecone index...');
const checkProcess = spawn('npx', ['ts-node', '--esm', resolve(__dirname, 'checkIndex.ts')], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm' }
});

checkProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Error checking index');
    process.exit(1);
  }
  
  console.log('\nIndexing travel data...');
  const indexProcess = spawn('npx', ['ts-node', '--esm', resolve(__dirname, 'indexTravelData.ts')], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm' }
  });
  
  indexProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('Error indexing travel data');
      process.exit(1);
    }
  });
}); 