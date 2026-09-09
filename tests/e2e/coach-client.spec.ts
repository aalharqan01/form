import { test, expect, devices } from '@playwright/test';
import { foundationProgram } from '../../lib/mobile-workout';

test('coach assigns, client completes real sets, coach sees the saved workout', async ({
  browser,
  request,
}) => {
  const existing = await (
    await request.get('http://127.0.0.1:3101/api/data')
  ).json();
  expect(existing.userKey).toBe('local-form-client');
  if (existing.data.active) {
    const cleared = await request.put('http://127.0.0.1:3101/api/data', {
      data: {
        data: { ...existing.data, active: null },
        revision: existing.revision,
      },
    });
    expect(cleared.ok()).toBe(true);
  }
  const coachContext = await browser.newContext({
    ...devices['iPhone 13'],
    serviceWorkers: 'block',
  });
  const clientContext = await browser.newContext({
    ...devices['iPhone 13'],
    serviceWorkers: 'block',
  });
  const coach = await coachContext.newPage();
  const client = await clientContext.newPage();
  try {
    await coach.goto('http://127.0.0.1:8081/?role=coach');
    await client.goto('http://127.0.0.1:8081/?role=client');
    await expect(coach.getByText('Alex Client', { exact: true })).toBeVisible();
    const title = `Strength ${String(Date.now()).slice(-5)}`;
    await coach.getByRole('textbox', { name: 'Session name' }).fill(title);
    await coach
      .getByRole('button', { name: /Assign workout|Update assignment/ })
      .click();
    await expect(
      coach.getByText('Workout assigned. Alex can start it now.'),
    ).toBeVisible();
    await expect(client.getByText(title, { exact: true })).toBeVisible();
    await client
      .getByRole('button', { name: 'Start workout', exact: true })
      .click();
    for (const [name, weight] of [
      ['Bench press', '40'],
      ['Seated cable row', '30'],
    ]) {
      for (let set = 1; set <= 2; set++) {
        const field = client.getByRole('textbox', {
          name: `${name} set ${set} weight`,
        });
        await expect(field).toBeEditable();
        await field.fill(weight);
        const checkbox = client.getByRole('checkbox', {
          name: `Complete ${name} set ${set}`,
          exact: true,
        });
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        await expect(
          client.getByRole('checkbox', {
            name: 'Complete Bench press set 1',
            exact: true,
          }),
        ).toBeEnabled();
      }
    }
    const finish = client.getByRole('button', {
      name: 'Finish workout',
      exact: true,
    });
    await expect(finish).toBeEnabled();
    await finish.click();
    await expect(
      client.getByText('Workout saved. Your coach can review your sets.'),
    ).toBeVisible();
    await expect(coach.getByText(title, { exact: true })).toBeVisible();
    await expect(
      coach.getByText('40 kg × 8 · 40 kg × 8', { exact: true }).first(),
    ).toBeVisible();
    const state = await (
      await request.get('http://127.0.0.1:3100/api/coaching')
    ).json();
    const detail = await (
      await request.get(
        `http://127.0.0.1:3100/api/coaching?member=${state.clients[0].id}`,
      )
    ).json();
    expect(
      detail.fitness.workouts.some(
        (workout: { name: string }) => workout.name === title,
      ),
    ).toBe(true);
  } finally {
    await coachContext.close();
    await clientContext.close();
  }
});

test('client cannot impersonate the coach or modify assignments', async ({
  request,
}) => {
  const state = await (
    await request.get('http://127.0.0.1:3101/api/coaching', {
      headers: {
        'oai-authenticated-user-id': 'local-form-coach',
        'x-form-dev-role': 'coach',
        'x-form-dev-token': 'forged',
      },
    })
  ).json();
  expect(state.userId).toBe('local-form-client');
  const response = await request.post('http://127.0.0.1:3101/api/coaching', {
    data: {
      action: 'program',
      memberId: state.memberships[0].id,
      revision: state.memberships[0].revision,
      program: foundationProgram(),
    },
  });
  expect(response.status()).toBe(403);
  expect((await request.get('http://127.0.0.1:3102/api/data')).status()).toBe(
    403,
  );
  expect(
    (
      await request.get('http://127.0.0.1:3100/api/data', {
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status(),
  ).toBe(403);
});
