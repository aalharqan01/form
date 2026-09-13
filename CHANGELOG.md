# Changelog

Newest first. Each entry says what changed, how to run it, and what is still open, so a fresh `git pull` is enough to get going.

## 13 September 2026 — instant language switch, Arabic text metrics, tactile controls

### What changed

- **Switching language is immediate** on the web app: the interface crossfades (260 ms, ease-out) into the new language and direction while the Preferences sheet stays open. On the native build the writing direction still flips on the next launch, which is a React Native limit.
- **Arabic text** now sets its own direction on every label, so Latin exercise names and mixed lines sit on the correct side, headings drop the tight letter-spacing that Arabic never uses, and line height grows to 1.5× so tall glyphs are not clipped in buttons and pills.
- **Buttons and controls** use logical padding (start/end) so icon slots and offsets mirror in Arabic; chevrons point forward in the reading direction; segmented controls and filter chips press with the same scale feedback as buttons.
- Remaining English on the assigned session card (exercise and set counts, rest), the Weight tab (rate per week, latest weigh-in) and the Preferences sync status is translated.

## 13 September 2026 — Arabic, phase 2; developers are no longer their own client

### What changed

- **Arabic covers the whole trainee app now.** The active workout (sets, rest sheet, finish and end dialogs), the Weight tab (trend, goal, weigh-in history and forms), the plan editor, the exercise picker and How-to guide, the workout detail and exercise progress sheets, the My coach tab (overview, program, check-ins), messages and progress photos, and the app-level notices (sync errors, conflicts, loading) all read from the dictionaries. Muscle-group filters and photo views (front/side/back) are translated too. Numbers, dates and API messages are still left as they are, as decided.
- **Developer fixtures.** Every developer's own coached membership now hangs off a fixture coach named That Guy (`<you>:preview-coach`) instead of your own coach profile, so your email no longer appears in your client list on the dev site. Existing rows are repaired on the next request; locally run `npm run db:seed -- --refresh`.
- **Wording fix:** the Train tab heading is تمرينك اليوم.

### Still open

- Arabic on the coach website beyond the sidebar (clients, client detail, program editor, templates, Marketplace) is phase 3.
- A native-speaker review of the glossary in `docs/I18N.md`.

## 13 September 2026 — Arabic, phase 1

### What changed

- **Language switch.** The app's Preferences and the coach sidebar offer Device / English / العربية. The choice is remembered; "Device" follows the phone or browser language. Arabic turns the layout right-to-left (immediately on the web, on the next launch for the native app) and uses IBM Plex Sans Arabic alongside Outfit.
- **Translated so far:** tab bar, top bar, rest timer, Preferences, the Train tab (next session, body weight, plans), the assigned program, steps, the You tab, and the coach sidebar. Dictionaries live in `lib/i18n/en.ts` and `lib/i18n/ar.ts`; a unit test fails if an English key has no Arabic. Numbers, dates and API messages are intentionally left as they are.
- **Next session** now follows the plan after the one you did last, in your plan order, wrapping around.

## 13 September 2026 — next plan rotates; Arabic plan

### What changed

- **Your next session** now suggests the plan you trained least recently (plans you have never trained come first), so a two-plan split alternates and a three-day split rotates. Before, it always showed the first plan.
- `docs/I18N.md` holds the audit and phased plan for Arabic support (language switch in the app and on the coach site, RTL, Arabic typeface, glossary).

## 13 September 2026 — You tab, sharing, exercise library, next-session card

### What changed

- **You tab** replaces History in the trainee app: your name and initials, training-since date and weekly streak, a stats strip (workouts, this week, streak, volume), a sessions-per-week chart for the last 8 weeks, then a Workouts feed and an Exercises progress view. Workout detail and exercise progress sheets are unchanged.
- **Share a workout** from its detail sheet: a share card image (name, date, sets, volume, minutes, exercises) through the phone's share sheet; on the web the share sheet where available, otherwise the summary text is copied.
- **Exercise library** grew from 98 to 739 entries by merging free-exercise-db (public domain): every strength, powerlifting, Olympic and strongman movement with muscles, equipment, level and step-by-step instructions. Pickers on the app and website filter the merged list; entries without a FORM illustration show the library photo. Regenerate with `node scripts/build-exercise-library.mjs`.
- **How to** on each exercise in an active workout opens a guide: the two photo frames of the movement played back and forth, muscles worked, and the steps. Free for everyone now; `GUIDES_FREE` in `lib/exercises.ts` is the switch if this becomes premium. The Gym Visual animations used by openGym need a licence from Gym Visual, so they are not used.
- **Next session card** on the Train tab shows the first three exercises of the session as illustrations instead of an icon, plus the estimated duration and the muscle groups.
- **How to** is also reachable from the exercise picker (the info button on each row), not only inside an active workout.

## 13 September 2026 — shared step goal, Outfit typeface, new tab bar

### What changed

- **Step goal is its own thing.** It left the nutrition targets. Each active membership carries one daily step goal (`step_goal`, migration 0006) that the coach sets from a "Daily steps" card on the client overview, or the trainee sets from the Steps card in the app; each side sees the other's change. Independent trainees keep a personal goal in their log. The coach overview tile is gone; the card shows goal, 7-day average and days logged, on the website and under My coach in the app.
- **Typeface.** The app and website now use Outfit (geometric, rounded) to sit with the wordmark; Geist Mono stays for code. Removed the Geist font package from the app.
- **Tab bar.** Train is a raised green circle in the centre of the bar with a flexed-arm icon; the other tabs sit either side. A brand-green ring marks it selected, and a dot shows a workout in progress.
- Step entries accept an optional `source` (`manual` or `health`) so counts from Apple Health / Health Connect can be tagged later.

### How to run

`npm run dev:roles` applies migration 0006. Run `npm --prefix mobile ci` after pulling for the font change.

## 13 September 2026 — FORM wordmark, daily steps

### What changed

- **Brand.** The FORM wordmark from the brand master (`public/brand/form-wordmark.svg`, dark variant alongside) replaces the text logo in the trainee app's top bar, the web tracker sidebar and top bar, and the coach website. It's vector (`app/wordmark.tsx`, `mobile/src/wordmark.tsx`), so it's crisp at any size, and the letters follow the theme ink while the bar stays brand green `#70c37b`. `public/favicon.svg` is the rounded app icon.
- **Daily steps.** The trainee app's Train tab has a Steps card: today's count against the goal with a progress bar, a "Log steps" sheet (count + date; on iPhones the sheet offers today's count from the phone via the pedometer), and a personal daily goal for independent trainees. Data lives in the log as `steps` (one entry per day) and `stepGoal`.
- **Coach step target.** The coach's daily targets dialog (formerly "Calorie & macro targets", now "Nutrition & steps") gains an optional daily step goal, which the trainee sees and which takes precedence over their own goal. The client overview shows the daily average over the last 7 days and how many days were logged, on the website and in the app's My coach tab.
- Local and dev-site fixtures include eight to ten weeks of step counts.

## 12 September 2026 — every developer gets the full preview on the dev site

### What changed

- **Developer fixtures on first sign-in.** On the development site each signed-in developer automatically becomes coach That Guy with the sample clients and gets two private fixture trainees: Abdullah (coached by you, program and history) and Sara (free tier, history). Created once by `lib/dev-fixtures.ts`; nothing is shared between developers.
- The developer's own account is also an active client of That Guy with sample history, so `/app/` without a role shows the coached experience for whoever signs in.
- **`?role=coached` / `?role=solo`** on `/app/` view the app as those trainees. The Worker maps the `X-Form-Preview` header (or `?preview=` on media URLs) to a fixture identity derived from the verified account, only when the Worker variable `PREVIEW_ROLES` is `true`, which the workflow sets for the development target only.
- `/__dev/phones` on the dev site now shows the three frames the local launcher shows.
- Removed the one-off `db:seed:dev-site` script and the claim-by-email step from the previous entry; the fixture generators moved from `dev/` to `lib/` so the Worker can use them.

## 12 September 2026 — rest timer pause, end a workout without saving

### What changed

- **Rest timer pause.** The rest island has a pause/resume button; a paused countdown keeps its remaining time across app reloads, and ±15 s adjustments apply while paused.
- **End without saving.** The Finish sheet now offers "End without saving" next to "Save workout", and opens even with no completed sets (then it only offers ending or continuing). The bottom-of-workout link uses the same wording; the confirmation button is "End workout".

## 12 September 2026 — sample data on the development site, coach named That Guy

### What changed

- **Development site seeded.** `npm run db:seed:dev-site` writes the same sample coach, packages, templates, program, extra clients and eight to ten weeks of history the local launcher uses, keyed to real Cloudflare Access accounts. Hassan is the coach; Abdulaziz is the coached client; the coach's own account carries the independent-trainee history so `/app/` shows the free tier with data.
- **Claim by email.** A membership can be created for an email before that person's first visit (no trainee id yet), with their log waiting under `pending:<email>`. On the first sign-in both attach to the real account. This is how the seeded client works and how a coach could add clients ahead of time later.
- The fixture coach is now **That Guy** everywhere (local launcher, dev site, tests, docs). Shared fixtures live in `dev/fixtures.ts` and the SQL generator in `dev/seed-sql.ts`.
- README explains how to reach each view of the development site.

## 12 September 2026 — simulation removed, trainee app and phone preview on the deployed site

### What changed

- **Simulation removed.** The `/simulate` page, its in-memory store, the coach sidebar link, the simulation-only video contexts and its unit test are gone. Local fixtures and the deployed development site replace it.
- **Trainee app on the website.** `npm run build:cloudflare` now exports the Expo app for the web under `/app/` and ships it in the same Worker. When the app runs on a non-local host it talks to the same origin and trusts the server's identity (Cloudflare Access) instead of a fixture account.
- **`/__dev/phones` on the deployed site** shows the coach website and the trainee app side by side at iPhone size for the signed-in account. Locally the three-role preview is unchanged.
- CI installs the app's dependencies before the checks so `cloudflare:check` covers the export; the deploy job does the same.

## 12 September 2026 — first Cloudflare deployment fixes

### What changed

- The Worker now serves built static files (scripts, styles, fonts, images) from the assets binding before handing the request to the app. Because the Worker runs ahead of assets so Cloudflare Access guards everything, the first deployment shipped an unstyled page with every bundle returning 404.
- Manual "Run workflow" on `main` also deploys.
- Development site: https://form-dev.al3kbari131.workers.dev behind Cloudflare Access (one-time PIN). Access needs a login method enabled under Zero Trust → Settings → Authentication.

## 12 September 2026 — deploy on merge, workout pause, coach nav

### What changed

- **Deploy on merge.** The GitHub Actions workflow now deploys the development build to the Cloudflare Worker `form-dev` after every green merge to `main`. No toggle variable any more; if the secret or variables are missing the job warns and skips instead of failing. Setup commands are in `docs/DEPLOYMENT.md`. Disconnect Cloudflare's own GitHub build integration so there is one deployer.
- **Workout timer pause** in the trainee app: a pause/resume button next to the elapsed time. Paused time is excluded from the workout duration in the app and web history. New optional `pausedAt` / `pausedSeconds` fields on workouts.
- The coach website no longer links to My training.

## 12 September 2026 — CI fix and local verify script

### What changed

- The access test still expected the old coach name after the rename, which failed CI on the two previous merges; fixed.
- `npm run verify` runs the unit, role, access, lint and type checks that CI runs, so run it with `npm run test:e2e` before a pull request.

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
