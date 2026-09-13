import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../lib/i18n/en.ts';
import { ar } from '../lib/i18n/ar.ts';
import { resolveLocale, translate } from '../lib/i18n/index.ts';

test('every English key has a non-empty Arabic string with the same placeholders', () => {
  const missing = Object.keys(en).filter((k) => !ar[k] || !ar[k].trim());
  assert.deepEqual(missing, []);
  const extra = Object.keys(ar).filter((k) => !(k in en));
  assert.deepEqual(extra, []);
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));
  for (const k of Object.keys(en)) assert.deepEqual(holes(ar[k]), holes(en[k]), k);
});

test('locale resolution and placeholder filling', () => {
  assert.equal(resolveLocale('system', ['ar-SA', 'en-US']), 'ar');
  assert.equal(resolveLocale('system', ['fr-FR']), 'en');
  assert.equal(resolveLocale('en', ['ar']), 'en');
  assert.equal(translate('en', 'train.sessionMeta', { exercises: 5, sets: 15, minutes: 35 }), '5 exercises · 15 sets · about 35 min');
  assert.equal(translate('ar', 'tab.train'), 'تدريب');
  assert.equal(translate('ar', 'you.streak', { weeks: 3 }), 'سلسلة 3 أسابيع');
});
