import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import { FeatureExtractionPipeline } from '@xenova/transformers';
import { pipeline } from '@xenova/transformers';

const client =  new QdrantClient({ url: 'http://localhost:6333'} );

let embedder: FeatureExtractionPipeline | null = null;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = body.query;

  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const output = await embedder(query, {
    pooling: 'mean',
    normalize: true,
  })

  const vector = Array.from(output.data as ArrayLike<number>);
  
  const searchResult = await client.search('memories', {
    vector,
    limit: 5,
  });
  
  return NextResponse.json({ results: searchResult });
}