/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
  },
};

export default nextConfig;
