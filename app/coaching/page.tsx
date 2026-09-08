import { requireChatGPTUser } from '../chatgpt-auth';
import CoachingWorkspace from './coaching-ui';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireChatGPTUser('/coaching');
  return <CoachingWorkspace />;
}
