import { requireChatGPTUser } from '../chatgpt-auth';
import SimulationApp from './simulation-app';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireChatGPTUser('/simulate');
  return <SimulationApp />;
}
