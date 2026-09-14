import { test, expect, type Page } from '@playwright/test';
import { fixture } from './fixtures';

const origin = process.env.FORM_COACH_TEST_URL ?? 'http://127.0.0.1:3100';
// Only the loopback role fixture is allowed, including an alternate local port.
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
  throw new Error('Local fixtures only');

async function language(page: Page, value: 'ar' | 'en') {
  await page.locator('.co-prefs-button').click();
  await page
    .getByRole('button', {
      name: value === 'ar' ? 'العربية' : 'English',
      exact: true,
    })
    .click();
  await page.locator('.co-prefs-button').click();
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    value === 'ar' ? 'rtl' : 'ltr',
  );
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

for (const width of [1440, 390]) {
  test(`coach Arabic navigation, forms and saved template at ${width}px`, async ({
    page,
    request,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/coaching');
    await expect(
      page.getByText('Abdullah Al-Harbi', { exact: true }),
    ).toBeVisible();
    const clean = await fixture(request, {
      coach: origin,
      client: origin.replace(/:(\d+)$/, (_, port) => ':' + (Number(port) + 1)),
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.screenshot({
        path: info.outputPath('english-clients.png'),
        fullPage: true,
      });
      await language(page, 'ar');
      await expect(
        page.getByRole('heading', { name: 'متدربوك.' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'المتدربون والطلبات', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.co-client-row').first()).not.toContainText(
        /trained|no workouts|check-in|unread/,
      );
      await fits(page);
      if (width > 767) {
        const sidebar = await page.locator('.co-sidebar').boundingBox();
        const content = await page.locator('.co-main').boundingBox();
        expect(sidebar!.x).toBeGreaterThan(content!.x + content!.width - 1);
      }
      await page.screenshot({
        path: info.outputPath('arabic-clients.png'),
        fullPage: true,
      });
      await page
        .locator('.co-client-row')
        .filter({ hasText: 'Abdullah Al-Harbi' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Abdullah Al-Harbi', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: /^(تعديل|تحديد) الأهداف$/ })
        .click();
      await expect(page.getByRole('dialog')).toContainText(
        'أهداف التغذية اليومية',
      );
      await expect(
        page.getByLabel('البروتين (g)', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
      await page.getByRole('button', { name: 'البرنامج', exact: true }).click();
      await expect(page.locator('.co-program')).toContainText('الاثنين');
      await page
        .getByRole('button', { name: 'تعديل البرنامج', exact: true })
        .click();
      await expect(page.getByLabel('يوم التدريب').first()).toHaveValue('1');
      await page.screenshot({
        path: info.outputPath('arabic-program.png'),
        fullPage: false,
      });
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'المتابعات الأسبوعية', exact: true })
        .click();
      await expect(page.locator('.co-checkins')).not.toContainText(
        /Week of|hours|Your feedback/,
      );
      await page.getByRole('button', { name: /^الرسائل/ }).click();
      await expect(
        page.getByRole('heading', { name: 'المحادثة' }),
      ).toBeVisible();
      await page.getByRole('button', { name: /^صور التقدم/ }).click();
      await page
        .getByRole('button', { name: 'إضافة صورة', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toContainText('أمامي');
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'جميع المتدربين', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'قوالب الحصص', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'إنشاء قالب', exact: true })
        .click();
      const name = `اختبار عربي ${width} — Bench`;
      await page.getByLabel('اسم القالب', { exact: true }).fill(name);
      await page
        .getByRole('button', { name: 'إضافة تمرين', exact: true })
        .click();
      await page.getByRole('button', { name: 'الصدر', exact: true }).click();
      await page
        .getByLabel('Search exercises')
        .count()
        .then((count) => expect(count).toBe(0));
      await page
        .locator('.exercise-options button')
        .filter({ has: page.getByText('Bench press', { exact: true }) })
        .click();
      await expect(page.getByLabel('المجموعات', { exact: true })).toHaveValue(
        '3',
      );
      await page
        .getByRole('button', { name: 'حفظ القالب', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name, exact: true }),
      ).toBeVisible();
      const saved = await (
        await request.get(origin + '/api/coaching?templates=1')
      ).json();
      const template = saved.templates.find(
        (v: { routine: { name: string } }) => v.routine.name === name,
      );
      expect(template.routine.exercises[0].name).toBe('Bench press');
      expect(template.routine.exercises[0].muscle).toBe('Chest');
      await language(page, 'en');
      await expect(
        page.getByRole('heading', { name: 'Workout templates', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: `Edit template ${name}`, exact: true })
        .click();
      await expect(
        page.getByLabel('Template name', { exact: true }),
      ).toHaveValue(name);
      await expect(page.getByLabel('Sets', { exact: true })).toHaveValue('3');
      await page.keyboard.press('Escape');
      await fits(page);
      await page.screenshot({
        path: info.outputPath('english-templates.png'),
        fullPage: true,
      });
      await language(page, 'ar');
      await page
        .getByRole('button', { name: 'الملف والباقات', exact: true })
        .click();
      await expect(page.getByLabel('التخصصات', { exact: true })).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: info.outputPath('arabic-profile.png'),
        fullPage: true,
      });
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'متدربوك.' }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await clean.restore();
    }
  });
}
