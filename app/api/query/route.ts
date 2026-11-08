import { queryPinecone } from "@/lib/pinecone/queryPinecone";
import { requireUser } from '@/lib/auth';

// this is for querying content from the vector db. 
export async function POST(req: Request) {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { query } = await req.json();
  const matches = await queryPinecone(query);
  return Response.json({ matches });
}
