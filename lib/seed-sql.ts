import { EMPTY } from './fitness.ts';
import { coachedHistory, soloHistory } from './synthetic.ts';
import {
  coachProfile,
  templates,
  program as buildProgram,
  EXTRA_CLIENTS,
  INTAKE,
} from './fixtures.ts';

export type SeedPlan = {
  /** Id prefix for fixture rows: local-form on a laptop, dev-form on the dev site. */
  prefix: string;
  coach: { id: string; name: string };
  /** The coached client. `id` is null when the client has not signed in yet:
   *  the membership then waits on the email and the log under pending:<email>. */
  client: { id: string | null; email: string; name: string };
  /** Account that receives the independent-trainee history, if any. */
  solo: { id: string } | null;
  /** Rewrite existing fixture history and names instead of only filling gaps. */
  refresh: boolean;
  now?: Date;
};

const quote = (value: unknown) =>
  "'" + String(value).replaceAll("'", "''") + "'";
const json = (value: unknown) => quote(JSON.stringify(value));
const EMPTY_LOG =
  "json_array_length(json_extract(data,'$.workouts'))=0 AND json_array_length(json_extract(data,'$.weights'))=0";

/** Statements that insert the sample coach, clients and history. Idempotent. */
export function seedStatements(plan: SeedPlan): string[] {
  const now = plan.now ?? new Date();
  const stamp = now.toISOString();
  const { prefix, refresh } = plan;
  const profile = coachProfile(plan.coach.name, prefix);
  const program = buildProgram(prefix, now);
  const membership = `${prefix}-membership`;
  const clientAccount =
    plan.client.id ?? `pending:${plan.client.email.toLowerCase()}`;
  const fill = (id: string, data: unknown) =>
    `UPDATE fitness_accounts SET data=${json(data)}, revision=revision+1, updated_at=${quote(stamp)} WHERE user_id=${quote(id)}${refresh ? '' : ` AND ${EMPTY_LOG}`};`;
  const account = (id: string) =>
    `INSERT OR IGNORE INTO fitness_accounts (user_id,data,revision,updated_at) VALUES (${quote(id)},${json(EMPTY)},0,${quote(stamp)});`;
  const member = (
    id: string,
    traineeId: string | null,
    email: string,
    name: string,
    status: 'active' | 'requested',
  ) =>
    `INSERT OR IGNORE INTO coaching_memberships
(id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,program,nutrition,revision,created_at,accepted_at,open_key)
VALUES (${quote(id)},${quote(plan.coach.id)},${traineeId === null ? 'NULL' : quote(traineeId)},${quote(email)},${quote(name)},${quote(status)},${quote(`${prefix}-fixture-${id}`)},
'2099-01-01T00:00:00.000Z',${json(profile.offers[0])},
${json({ ...INTAKE, goals: status === 'active' ? 'Build strength' : 'Lose weight and feel stronger' })},
${status === 'active' ? json(program) : "'null'"},'null',0,${quote(stamp)},${status === 'active' ? quote(stamp) : 'NULL'},${quote(`${plan.coach.id}:${traineeId ?? email}`)});
${refresh ? `UPDATE coaching_memberships SET name=${quote(name)}, program=${status === 'active' ? json(program) : "'null'"}, revision=revision+1 WHERE id=${quote(id)};` : `UPDATE coaching_memberships SET program=${json(program)}, revision=revision+1 WHERE id=${quote(id)} AND status='active' AND program='null';`}`;
  const lines = [
    `INSERT OR IGNORE INTO coach_profiles (user_id,profile,revision,updated_at) VALUES (${quote(plan.coach.id)},${json(profile)},0,${quote(stamp)});`,
    refresh
      ? `UPDATE coach_profiles SET profile=${json(profile)}, revision=revision+1, updated_at=${quote(stamp)} WHERE user_id=${quote(plan.coach.id)};`
      : '',
    ...templates(prefix).map(
      (routine) =>
        `INSERT OR IGNORE INTO coach_workout_templates (id,coach_id,routine,revision,updated_at) VALUES (${quote(routine.id)},${quote(plan.coach.id)},${json(routine)},1,${quote(stamp)});`,
    ),
    account(clientAccount),
    member(
      membership,
      plan.client.id,
      plan.client.email,
      plan.client.name,
      'active',
    ),
    fill(clientAccount, coachedHistory(program, membership, now)),
    ...(plan.solo
      ? [account(plan.solo.id), fill(plan.solo.id, soloHistory(now))]
      : []),
    ...EXTRA_CLIENTS.flatMap((c) => {
      const id = `${prefix}-client-${c.slug}`;
      const m = `${prefix}-membership-${c.slug}`;
      return [
        account(id),
        member(m, id, c.email, c.name, c.status),
        c.history ? fill(id, coachedHistory(program, m, now, c.history)) : '',
      ];
    }),
  ];
  return lines.filter(Boolean);
}
/** The same statements as one SQL script. */
export const seedSql = (plan: SeedPlan) =>
  seedStatements(plan).join('\n') + '\n';
