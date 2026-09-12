import { test, expect, devices } from '@playwright/test';
import { fixture } from './fixtures';
import { foundationProgram } from '../../lib/mobile-workout';

test('coach assigns, client completes real sets, coach sees the saved workout', async ({
  browser,
  request,
}) => {
  const clean = await fixture(request);
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
    await coach.goto('http://127.0.0.1:3100/coaching');
    await client.goto('http://127.0.0.1:8081/');
    await expect(coach.getByText('Alex Client', { exact: true })).toBeVisible();
    await expect(
      client.getByRole('button', { name: /Preview as coach/ }),
    ).toHaveCount(0);
    const templateName = 'Upper Body Strength — Technique';
    const title = 'Upper Body Strength — Alex';
    await coach
      .getByRole('button', { name: 'Workout templates', exact: true })
      .click();
    await coach
      .getByRole('button', { name: 'Create template', exact: true })
      .click();
    await coach.getByLabel('Template name', { exact: true }).fill(templateName);
    for (const [name, reps] of [
      ['Bench press', '8'],
      ['Seated cable row', '10'],
    ]) {
      await coach
        .getByRole('button', { name: 'Add exercise', exact: true })
        .click();
      await coach
        .locator('.exercise-options button')
        .filter({ has: coach.getByText(name, { exact: true }) })
        .click();
      await coach.getByLabel('Sets', { exact: true }).last().fill('2');
      await coach.getByLabel('Reps', { exact: true }).last().fill(reps);
      await coach
        .getByLabel('Rest between sets (seconds)', { exact: true })
        .last()
        .fill(name === 'Bench press' ? '120' : '45');
    }
    await coach
      .getByRole('button', { name: 'Save template', exact: true })
      .click();
    await expect(
      coach.getByRole('heading', { name: templateName, exact: true }),
    ).toBeVisible();
    await coach
      .getByRole('button', {
        name: `Edit template ${templateName}`,
        exact: true,
      })
      .click();
    await coach.getByLabel('Reps', { exact: true }).last().fill('12');
    await coach
      .getByRole('button', { name: 'Save template', exact: true })
      .click();
    await expect(coach.getByRole('dialog')).toHaveCount(0);
    await coach
      .getByRole('button', { name: 'Clients & requests', exact: true })
      .click();
    await coach
      .locator('.co-client-row')
      .filter({ hasText: 'Alex Client' })
      .click();
    await coach
      .getByRole('button', { name: /^(Edit program|Assign program)$/ })
      .click();
    const dialog = coach.getByRole('dialog');
    await dialog.getByLabel('Program title', { exact: true }).fill(title);
    while (
      await dialog.getByRole('button', { name: /^Remove session/ }).count()
    ) {
      await dialog
        .getByRole('button', { name: /^Remove session/ })
        .first()
        .click();
    }
    const addTemplate = dialog.getByRole('button', {
      name: `Add template ${templateName}`,
      exact: true,
    });
    await addTemplate.click();
    await expect(dialog.getByRole('status')).toContainText(
      `${templateName} added as session 1`,
    );
    await dialog
      .getByLabel('Name', { exact: true })
      .fill('Upper Body Strength — Foundation');
    await addTemplate.click();
    await expect(dialog.getByRole('status')).toContainText(
      `${templateName} added as session 2`,
    );
    await dialog.getByLabel('Name', { exact: true }).nth(1).fill(title);
    await dialog
      .getByRole('button', { name: 'Save as template', exact: true })
      .nth(1)
      .click();
    await expect(dialog.getByRole('status')).toContainText(
      `Saved ${title} to your template library.`,
    );
    await dialog
      .getByRole('button', { name: 'Assign program', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    const library = await (
      await request.get('http://127.0.0.1:3100/api/coaching?templates=1')
    ).json();
    const saved = library.templates.find(
      (item: { routine: { name: string } }) =>
        item.routine.name === templateName,
    );
    expect(saved.routine.exercises[1].reps).toBe(12);
    expect(saved.revision).toBe(2);
    expect(saved.routine.name).toBe(templateName);
    expect(saved.routine.exercises[0].restSeconds).toBe(120);
    expect(saved.routine.exercises[1].restSeconds).toBe(45);
    expect(
      await coach.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await client.getByRole('tab', { name: 'Train', exact: true }).click();
    await expect(
      client.getByText(title, { exact: true }).first(),
    ).toBeVisible();
    await client
      .getByRole('button', { name: `Start workout: ${title}`, exact: true })
      .click();
    await expect(
      client.getByRole('textbox', { name: 'Workout name', exact: true }),
    ).toHaveValue(title);
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
          client.getByLabel('Rest countdown', { exact: true }),
        ).toHaveText(
          name === 'Bench press' ? /^(2:00|1:5\d)$/ : /^0:4\d$/,
        );
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
    await client
      .getByRole('button', { name: 'Save workout', exact: true })
      .click();
    await expect(
      client.getByText('Workout saved. Your coach can review your sets.'),
    ).toBeVisible();
    await coach.reload();
    await expect(coach.getByText('Alex Client', { exact: true })).toBeVisible();
    await coach
      .locator('.co-client-row')
      .filter({ hasText: 'Alex Client' })
      .click();
    await expect(coach.getByText(title, { exact: true }).first()).toBeVisible();
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
    await Promise.allSettled([coachContext.close(), clientContext.close()]);
    await clean.restore();
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
