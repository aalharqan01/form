import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, videoStorage } from '@/db/store';
import { handleVideo } from '@/lib/video-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handleVideo(
    database(),
    videoStorage(),
    await getChatGPTUser(),
    request,
  );
}
export const HEAD = GET;
export const POST = GET;
