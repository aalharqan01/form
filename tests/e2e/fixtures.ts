import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import type { FitnessData } from '../../lib/fitness';
import type { MemberDetail, WorkoutTemplate } from '../../lib/coaching';
const client = 'http://127.0.0.1:3101';
const coach = 'http://127.0.0.1:3100';
const quote = (value: unknown) =>
  "'" + String(value).replaceAll("'", "''") + "'";
export async function fixture(
  request: APIRequestContext,
  endpoints = { coach, client },
) {
  const { coach, client } = endpoints;
  if (
    ![coach, client].every((url) => /^http:\/\/127\.0\.0\.1:\d+$/.test(url))
  ) {
    throw new Error('Local fixtures only');
  }
  const saved = await (await request.get(client + '/api/data')).json();
  expect(saved.userKey).toBe('local-form-client');
  const detail: MemberDetail = await (
    await request.get(coach + '/api/coaching?member=local-form-membership')
  ).json();
  expect(detail.member.coach_id).toBe('local-form-coach');
  const before = await (
    await request.get(coach + '/api/coaching?templates=1')
  ).json();
  const startedAt = new Date().toISOString();
  const write = async (data: FitnessData, api = request) => {
    const current = await (await api.get(client + '/api/data')).json();
    expect(current.userKey).toBe('local-form-client');
    expect(
      (
        await api.put(client + '/api/data', {
          data: { data, revision: current.revision },
        })
      ).ok(),
    ).toBe(true);
  };
  await write({ ...saved.data, active: null });
  return {
    saved: saved.data as FitnessData,
    write,
    async restore() {
      const cleanup = await playwrightRequest.newContext();
      try {
        await write(saved.data, cleanup);
        const after = await (
          await cleanup.get(coach + '/api/coaching?templates=1')
        ).json();
        const added: WorkoutTemplate[] = after.templates.filter(
          (t: WorkoutTemplate) =>
            !before.templates.some((v: WorkoutTemplate) => v.id === t.id),
        );
        const latest: MemberDetail = await (
          await cleanup.get(
            coach + '/api/coaching?member=local-form-membership',
          )
        ).json();
        const messages = latest.messages.filter(
          (v) => !detail.messages.some((x) => x.id === v.id),
        );
        const checkins = latest.checkins.filter(
          (v) => !detail.checkins.some((x) => x.id === v.id),
        );
        const photos = (latest.photos ?? []).filter(
          (v) => !(detail.photos ?? []).some((x) => x.id === v.id),
        );
        const statements = [
          `UPDATE coaching_memberships SET program=${quote(JSON.stringify(detail.member.program))},nutrition=${quote(JSON.stringify(detail.member.nutrition))},revision=revision+1 WHERE id='local-form-membership' AND coach_id='local-form-coach' AND trainee_id='local-form-client'`,
          ...added.map(
            (t) =>
              `DELETE FROM coach_workout_templates WHERE id=${quote(t.id)} AND coach_id='local-form-coach'`,
          ),
          ...messages.map(
            (m) =>
              `DELETE FROM coaching_messages WHERE id=${quote(m.id)} AND membership_id='local-form-membership'`,
          ),
          ...checkins.map(
            (c) =>
              `DELETE FROM coaching_checkins WHERE id=${quote(c.id)} AND membership_id='local-form-membership'`,
          ),
          ...photos.map(
            (p) =>
              `DELETE FROM progress_photos WHERE id=${quote(p.id)} AND membership_id='local-form-membership'`,
          ),
          `DELETE FROM coaching_media WHERE membership_id='local-form-membership' AND created_at>${quote(startedAt)}`,
        ];
        // Explicit local-only config. Never seed or clean a remote database.
        // The script goes through a file: a long --command has hit wrangler's
        // argument handling on CI, and local D1 occasionally returns a
        // transient internal error, so one retry is allowed.
        await mkdir('.wrangler', { recursive: true });
        const file = `.wrangler/e2e-restore-${process.pid}-${Date.now()}.sql`;
        await writeFile(file, statements.join(';\n') + ';\n');
        try {
          for (let attempt = 1; ; attempt++) {
            try {
              execFileSync(
                'npx',
                [
                  'wrangler',
                  'd1',
                  'execute',
                  'DB',
                  '--local',
                  '--config',
                  'wrangler.local.json',
                  '--file',
                  file,
                ],
                { stdio: 'pipe' },
              );
              break;
            } catch (error) {
              if (attempt >= 2) throw error;
            }
          }
        } finally {
          await unlink(file).catch(() => {});
        }
      } finally {
        await cleanup.dispose();
      }
    },
  };
}
