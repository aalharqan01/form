# Changelog

Newest first. Each entry says what changed, how to run it, and what is still open, so a fresh `git pull` is enough to get going.

## 12 September 2026 — dashboard tiles filter properly

### What changed

- The three tiles on the coach dashboard (Active clients, Needs attention, New requests) are now one filter: the selected tile is highlighted, the others are plain, and the list below plus the All clients / Needs attention / New requests switch follow it. "Review requests" jumps to the New requests view. Tiles have hover, press and 200 ms colour transitions, disabled under reduced motion.
- The Weekly average weight card shows the average and the change side by side with their captions beneath, on desktop and phone.

## 12 September 2026 — Saudi fixture names

### What changed

- Local fixture people now have Saudi names: coach Faisal Al-Qahtani, coached client Abdullah Al-Harbi (port 3101), independent trainee Sara Al-Otaibi (port 3103), extra clients Mohammed Al-Ghamdi, Noura Al-Shehri, Khalid Al-Dossari and the pending request Reem Al-Zahrani. The simulation trainee is Abdullah.
- `npm run db:seed -- --refresh` now also rewrites membership names, so existing databases pick the new names up.

## 12 September 2026 — package client limits, more sample clients, one-decimal changes

### What changed

- **Client limit per package.** In Profile & packages a coach can set a client limit on each package (blank means unlimited). Requested, accepted-awaiting-payment and active memberships count toward it. The Marketplace shows "N of M places left" and disables the request button when a package is full; the API refuses requests for a full package. The coach dashboard's Active clients tile shows "X of Y places taken" when any package has a limit.
- **Client row labels** now read "2 of 3 sessions · 7 days" and "−0.5 kg weight · this week" instead of "3/3".
- **More local clients.** The seed adds Jordan Reyes, Priya Nair and Omar Haddad (active, with sample history) and Lina Karam (a pending request) to Sam Coach's list; the fixture package has a limit of 8. Run `npm run db:seed -- --refresh` to pick them up on an existing database.
- **Trainee app** weekly average change is shown to one decimal place everywhere.

### How to run

`npm run db:seed -- --refresh` (the launcher seeds new databases automatically).

### Still open

- The extra clients have no login of their own; only Alex has a proxy port.

## 12 September 2026 — coach site on phones, compact client list, sample history

### What changed

- **Program editor works as a full-height sheet on phones.** Sessions are collapsible: only the session you are editing is open, each exercise sits in one compact row (sets, reps, unit, rest), demonstration video controls are tucked behind a disclosure, and the Assign/Save button stays pinned at the bottom with safe-area padding. The one program note replaces per-session notes.
- **All clients list is denser.** Each row is one line: initials, name, offer and last workout, sessions done this week, weekly weight change, and a badge only when there is something to act on.
- **Sample history for both local trainees.** Alex (coached) has eight weeks of weigh-ins and program workouts including a missed day and an early finish; Riley (no coach) has ten weeks of weigh-ins and plan workouts. Generated deterministically in `dev/synthetic.ts` and applied by `npm run db:seed`, which only fills empty accounts.
- Vercel's agent skills (web-design-guidelines, react-best-practices, react-native-skills, composition-patterns) are installed for reviews; the coaching UI was checked against the web interface guidelines (focus clearance under the sticky footer, tabular numbers, hover states, reduced motion).

### How to run

`npm run db:seed -- --refresh` replaces existing fixture history with fresh sample data. Without the flag, accounts that already have workouts or weights are left alone.

### Still open

- The phone sheet has no drag-to-dismiss; use the close button.
- Sample data is for local fixtures only; nothing changes in production.

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
