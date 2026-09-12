import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, previewRolesEnabled } from '@/db/store';
import { handleCoaching } from '@/lib/coaching-server';
import { ensureDeveloperFixtures } from '@/lib/dev-fixtures';
export const dynamic = 'force-dynamic';
async function handle(request: Request) {
  const user = await getChatGPTUser();
  if (user && previewRolesEnabled())
    await ensureDeveloperFixtures(database(), user);
  return handleCoaching(database(), user, request);
}
export const GET = handle;
export const POST = handle;
