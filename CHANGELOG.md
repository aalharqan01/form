# Changelog

Newest first. Each entry says what changed, how to run it, and what is still open, so a fresh `git pull` is enough to get going.

## 12 September 2026 — conversation with attachments, progress photos, weekly change

### What changed

- **Conversation rebuilt** on the coach website and in the trainee app: day-grouped thread, tight bubbles, a composer that sends on Enter, and attachments. Both people can send JPEG/PNG/WebP photos up to 12 MB and MP4/WebM/MOV videos up to 25 MB. Images open in a lightbox with keyboard and swipe-style navigation.
- **Progress photos**: front, side and back views grouped by date, with a compare mode for two dates. Either person can add photos; only the person who added one can remove it. Each saved photo also posts into the conversation so the coach sees it in context.
- **Storage and API**: new `coaching_media` and `progress_photos` tables (migration `0005_coaching_media.sql`) and a `/api/media` route backed by the same R2 bucket as demonstration videos. Every read and write is checked against the membership; media can only be attached by its uploader.
- **Weekly average weight** now shows the change against last week's average as a signed number next to the average, on the coach client overview and in the trainee app's My coach overview.
- **Coach program editor**: saved templates are now cards; adding one scrolls to and highlights the new session. The per-exercise coaching instructions field is gone (existing notes still display where they were saved).
- Local dev proxies allow the `X-Media-Size` header so uploads work from the Expo web app.

### How to run

Same as before; `npm run dev:roles` applies migration 0005 automatically. The mobile app gained `expo-image-picker`, so run `npm --prefix mobile ci` after pulling.

### Still open

- Media stays in R2 when a photo or message is removed; a cleanup job for orphaned objects is future work.
- Upload progress is a real percentage on the web and an indeterminate bar in the app.
- Video thumbnails are not generated; videos show the player's own poster.

## 10 September 2026 — trainee app rebuilt in the original design, coach templates, rest timers

### What changed

- **Trainee mobile app (`mobile/`) rebuilt to match the original web tracker design.** Same green palette, Geist type, bezel cards, floating tab bar, light and dark themes. Tabs are Train, Weight, History and, only while a coaching membership is active, My coach. Personal routines are now called **plans** in the app.
  - `mobile/src/theme.tsx` holds the design tokens (mirrors `app/globals.css`), `mobile/src/ui.tsx` the shared primitives, `mobile/src/shell.tsx` the top bar, tab bar and rest island, `mobile/src/screens/*` the screens.
  - Animations: tab content and exercise cards reveal on mount, set completion pops with a ripple, the rest island slides in, dialogs scale in, buttons press down. A sticky Finish bar appears when scrolling an active workout.
  - Dependencies added: `expo-font`, `@expo-google-fonts/geist`, `lucide-react-native`.
- **Coach workout templates** on the website: a private template library, "Add template" and "Save as template" inside the program editor, new D1 table via `drizzle/0004_coach_workout_templates.sql`.
- **Per-exercise rest targets** (0–600 s) set by the coach, copied into the trainee's workout and adjustable there. Completing a set starts that exercise's countdown.
- **Finish early**: a workout with at least one logged set can be saved with the remaining sets marked skipped. Coach and trainee history label it "Finished early"; it does not count as a completed scheduled session.
- **Weekly average weight change** (Monday to Sunday) shown to the trainee and on the coach's client row.
- **Local development**: `npm run dev:roles` now serves three identities through one backend: coach (3100), coached client Alex (3101) and an uncoached trainee Riley (3103). `http://127.0.0.1:3100/__dev/phones` shows all three side by side. The Expo app picks the account with `?role=solo` on web.
- **App icon** updated from the FORM icon master (iOS icon, Android adaptive icons, PWA icons). The wordmark stays as text until vector artwork exists.

### How to run

```sh
npm ci && npm --prefix mobile ci
npm run dev:roles          # terminal 1
npm run mobile:web         # terminal 2
open http://127.0.0.1:3100/__dev/phones
```

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm --prefix mobile run typecheck`, `npm run test:e2e` (all passing at this entry).

### Still open

- Premium feature boundary and in-app store billing are not built; nothing is paywalled yet. The `coached` flag in `mobile/App.tsx` is where entitlement gating will hang.
- Native sign-in for the mobile app (it still talks to the local loopback backend).
- Vector wordmark assets for the logo; see the prompt notes in the PR description.
- Native iOS verification: the rebuild was verified in Chromium at iPhone size, not yet in the Simulator (`npm run mobile:ios`).
