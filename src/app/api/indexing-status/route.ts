// src/app/api/indexing-status/route.ts
import { NextResponse } from 'next/server';
import { pineconeIndex } from '@/lib/pinecone';

export async function GET() {
  try {
    // Get stats from Pinecone
    const stats = await pineconeIndex.describeIndexStats();
    
    return NextResponse.json({
      namespaces: stats.namespaces,
      totalVectorCount: stats.totalRecordCount,
      dimensions: stats.dimension
    });
  } catch (error) {
    console.error('Error fetching index stats:', error);
    return NextResponse.json(
      { error: 'Failed to get indexing status' },
      { status: 500 }
    );
  }
}
