import { test, expect } from '@playwright/test';
import { fixture } from './fixtures';
import { weekOf } from '../../lib/coaching';

test('trainee navigation, independent sets and rest timer survive reopening and offline edits', async ({
  page,
  request,
}) => {
  const clean = await fixture(request);
  try {
    await page.goto('http://127.0.0.1:8081/');
    for (const name of ['Train', 'Weight', 'History', 'My coach'])
      await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Start workout', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Add exercise', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Search exercises', exact: true })
      .fill('Bench press');
    await page
      .getByRole('button', { name: 'Add Bench press', exact: true })
      .click();
    const weight = page.getByRole('textbox', {
      name: 'Bench press set 1 weight',
      exact: true,
    });
    await weight.fill('100');
    await page
      .getByRole('checkbox', {
        name: 'Complete Bench press set 1',
        exact: true,
      })
      .click();
    await expect(page.getByLabel('Rest countdown', { exact: true })).toHaveText(
      /^1:[0-5]\d$/,
    );
    await page
      .getByRole('button', { name: 'Increase rest by 15 seconds', exact: true })
      .click();
    const timer = await page
      .getByLabel('Rest countdown', { exact: true })
      .innerText();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Workout name', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Rest countdown', { exact: true })).toHaveText(
      /^1:[0-5]\d$/,
    );
    expect(timer).toMatch(/^1:/);
    await expect(weight).toHaveValue('100');
    await page
      .getByRole('button', { name: 'Bench press lb', exact: true })
      .click();
    await expect(weight).toHaveValue('220.46');
    await page
      .getByRole('button', { name: 'Skip rest timer', exact: true })
      .click();
    await expect(
      page.getByLabel('Rest countdown', { exact: true }),
    ).toHaveCount(0);
    await page.route('http://127.0.0.1:3101/api/**', (route) => route.abort());
    await page
      .getByRole('button', { name: /Notes and session options/ })
      .click();
    await page
      .getByRole('textbox', { name: 'Workout notes', exact: true })
      .fill('Controlled reps, even without a connection.');
    await expect(
      page.getByText('Saved on device · sync pending', { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Workout name', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Notes and session options/ })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Workout notes', exact: true }),
    ).toHaveValue('Controlled reps, even without a connection.');
    await page.unroute('http://127.0.0.1:3101/api/**');
    await page
      .getByRole('button', { name: 'Refresh training data', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await (await request.get('http://127.0.0.1:3101/api/data')).json())
            .data.active?.notes,
      )
      .toBe('Controlled reps, even without a connection.');
    await expect(
      page.getByRole('tab', { name: 'Train', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.close().catch(() => {});
    await clean.restore();
  }
});

test('dated weigh-ins show arithmetic weekly change to trainee and coach; coaching remains available', async ({
  page,
  request,
}) => {
  const clean = await fixture(request);
  const monday = weekOf();
  const previous = new Date(monday + 'T00:00:00Z');
  previous.setUTCDate(previous.getUTCDate() - 7);
  try {
    await clean.write({
      ...clean.saved,
      active: null,
      unit: 'kg',
      weights: [
        { date: previous.toISOString().slice(0, 10), kg: 80, note: '' },
      ],
    });
    await page.goto('http://127.0.0.1:8081/');
    await page.getByRole('tab', { name: 'Weight', exact: true }).click();
    await page.getByRole('button', { name: 'Log weight', exact: true }).click();
    await page.getByRole('textbox', { name: 'Date', exact: true }).fill(monday);
    await page
      .getByRole('textbox', { name: 'Weight (kg)', exact: true })
      .fill('79.5');
    await page
      .getByRole('button', { name: 'Save weigh-in', exact: true })
      .click();
    await expect(
      page.getByText('-0.50 kg', { exact: true }).first(),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await (
              await request.get('http://127.0.0.1:3100/api/coaching')
            ).json()
          ).clients.find(
            (m: { id: string }) => m.id === 'local-form-membership',
          ).stats.averageChangeKg,
      )
      .toBe(-0.5);
    await page.getByRole('tab', { name: 'My coach', exact: true }).click();
    await expect(
      page.getByText('Calorie & macro targets', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Messages', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Message your coach', exact: true })
      .fill('Training felt controlled today.');
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click();
    await expect(
      page.getByText('Message sent.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Check-ins', exact: true }).click();
    if (
      await page
        .getByRole('button', { name: 'Submit check-in', exact: true })
        .count()
    ) {
      await page
        .getByRole('textbox', { name: 'What went well?', exact: true })
        .fill('Completed all planned sessions.');
      await page
        .getByRole('button', { name: 'Submit check-in', exact: true })
        .click();
      await expect(
        page.getByText('Check-in sent to your coach.', { exact: true }),
      ).toBeVisible();
    }
    await page.goto('http://127.0.0.1:3100/coaching');
    await expect(
      page.locator('.co-client-row').filter({ hasText: 'Alex Client' }),
    ).toContainText('−0.5 kg');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.close().catch(() => {});
    await clean.restore();
  }
});

test('trainee finishes early with completed work and skipped sets visible to the coach', async ({
  page,
  request,
}) => {
  const clean = await fixture(request);
  try {
    await page.goto('http://127.0.0.1:8081/');
    await page
      .getByRole('button', { name: 'Start workout', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Workout name', exact: true })
      .fill('Technique practice');
    await page
      .getByRole('button', { name: 'Add exercise', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Search exercises', exact: true })
      .fill('Bench press');
    await page
      .getByRole('button', { name: 'Add Bench press', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Rest time for Bench press', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Bench press rest seconds', exact: true })
      .fill('75');
    await page
      .getByRole('button', { name: 'Save rest for Bench press', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', {
        name: 'Rest time for Bench press',
        exact: true,
      }),
    ).toHaveText('Rest · 1:15');
    await page
      .getByRole('textbox', { name: 'Bench press set 1 weight', exact: true })
      .fill('40');
    // New exercises copy the last logged sets, like the web tracker, so the
    // number of skipped sets depends on the fixture history.
    const total = await page
      .getByRole('checkbox', { name: /^Complete Bench press set \d+$/ })
      .count();
    const skipped = total - 1;
    expect(skipped).toBeGreaterThan(0);
    await page
      .getByRole('checkbox', {
        name: 'Complete Bench press set 1',
        exact: true,
      })
      .click();
    await expect(page.getByLabel('Rest countdown', { exact: true })).toHaveText(
      /^1:1\d$/,
    );
    await page
      .getByRole('button', { name: 'Finish workout', exact: true })
      .click();
    await expect(
      page.getByText(
        `${skipped} unfinished ${skipped === 1 ? 'set' : 'sets'} will be marked as skipped.`,
        { exact: false },
      ),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Save & finish early', exact: true })
      .click();
    await expect(
      page.getByText('Workout saved. Your coach can review your sets.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await (
              await request.get(
                'http://127.0.0.1:3100/api/coaching?member=local-form-membership',
              )
            ).json()
          ).fitness.workouts.find(
            (w: { name: string }) => w.name === 'Technique practice',
          )?.endedEarly,
      )
      .toBe(true);
    const detail = await (
      await request.get(
        'http://127.0.0.1:3100/api/coaching?member=local-form-membership',
      )
    ).json();
    const workout = detail.fitness.workouts.find(
      (w: { name: string }) => w.name === 'Technique practice',
    );
    expect(workout.exercises[0].restSeconds).toBe(75);
    expect(
      workout.exercises[0].sets.filter((v: { done: boolean }) => v.done),
    ).toHaveLength(1);
    expect(
      workout.exercises[0].sets.filter((v: { done: boolean }) => !v.done),
    ).toHaveLength(skipped);
    await page.getByRole('tab', { name: 'History', exact: true }).click();
    await expect(
      page
        .getByRole('button', { name: /^View Technique practice/ })
        .getByText(
          `Finished early · ${skipped} skipped ${skipped === 1 ? 'set' : 'sets'}`,
          { exact: true },
        ),
    ).toBeVisible();
  } finally {
    await page.close().catch(() => {});
    await clean.restore();
  }
});
