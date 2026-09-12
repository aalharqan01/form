import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, videoStorage } from '@/db/store';
import { handleMedia } from '@/lib/media-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handleMedia(
    database(),
    videoStorage(),
    await getChatGPTUser(),
    request,
  );
}
export const HEAD = GET;
export const POST = GET;
