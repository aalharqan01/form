# Changelog

Newest first. Each entry says what changed, how to run it, and what is still open, so a fresh `git pull` is enough to get going.

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
