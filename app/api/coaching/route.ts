import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/store';
import { handleCoaching } from '@/lib/coaching-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handleCoaching(database(), await getChatGPTUser(), request);
}
export async function POST(request: Request) {
  return handleCoaching(database(), await getChatGPTUser(), request);
}
