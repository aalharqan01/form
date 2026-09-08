import { requireChatGPTUser } from '../chatgpt-auth';
import { JoinCoaching } from '../coaching/coaching-ui';
export const dynamic = 'force-dynamic';
export const metadata = { referrer: 'no-referrer' };
async function AuthenticatedJoin({ returnTo }: { returnTo: string }) {
  await requireChatGPTUser(returnTo);
  return <JoinCoaching />;
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthenticatedJoin
      returnTo={
        '/join' + (p.invite ? '?invite=' + encodeURIComponent(p.invite) : '')
      }
    />
  );
}
