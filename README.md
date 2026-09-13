# Form

An installable workout and weight tracker with a coach–trainee Marketplace. Built with React 19, Vinext, Cloudflare D1 and R2.

## The development site

The latest `main` is always deployed to **https://form-dev.al3kbari131.workers.dev**. It sits behind Cloudflare Access: enter your email on the login page, click **Send me a code**, and paste the code from the email. Only addresses on the Access policy get in; ask Hassan to add yours.

Every developer who signs in gets the same setup as the local launcher, created automatically on the first visit: you are the coach **That Guy** with sample clients, your own account is a coached client of That Guy, and you own two fixture trainees you can open the app as. Nothing is shared between developers.

| What you want to see | Open |
| --- | --- |
| Coach website | `/coaching` |
| Trainee app as the coached client (Abdullah, program assigned, 8 weeks of history) | `/app/?role=coached` |
| Trainee app as the independent trainee (Sara, free tier, 10 weeks of history) | `/app/?role=solo` |
| All three side by side at phone size | `/__dev/phones` |
| Trainee app as yourself, coached by That Guy | `/app/` |
| Trainee web tracker as yourself | `/` |

Assign a workout as the coach, complete it as Abdullah, and the coach sees it, exactly like the local preview. Data lives in the development database only; nothing here touches production, and production never enables these preview roles.

## Run on another computer

Install **Git** and **Node.js 22.13 or later** (Node 22 LTS is recommended). npm comes with Node. Sign into the GitHub account that has access to this private repository, then:

```sh
git clone https://github.com/aalharqan01/form.git
cd form
npm run setup
npm run dev
```

`npm run setup` installs the exact dependency versions in the lockfile and applies all database migrations to a local database. Confirm the local migration prompt if it appears. It does not need a Cloudflare account, API keys or a paid service. Local video storage is created automatically when the app runs.

Open the **localhost URL printed in your terminal**; Vite may choose another port if 3000 is busy. Local sign-in uses the development identity `seedy@sites.test`. It does not connect to your live account.

- `/` — personal tracker, assigned workouts, nutrition targets, Marketplace and My coach.
- `/coaching` — coach workspace, packages, client progress and program editor.
- `/__dev/phones` — coach website and trainee app side by side at phone size (local launcher and the deployed development site).

To get later code changes, stop the development server and run:

```sh
git pull
npm run setup
npm run dev
```

The migration runner records applied migrations. Subsequent runs apply only new migrations to a database initialized with this setup command. Existing local databases created by manually executing SQL before this command was introduced need their migration history baselined before using `db:local`; do not rerun old table-creation migrations against them.

Recent changes and what is still open are summarised in [CHANGELOG.md](CHANGELOG.md).

## Phones and other devices

For separate coach and client sessions and the Expo mobile prototype, see [Development workflow](docs/DEVELOPMENT.md). Run `npm run dev:roles` and, in another terminal, `npm run mobile:web` after `npm run mobile:setup`. Open `http://127.0.0.1:3100/__dev/phones` for both role previews. Native iOS testing requires full Xcode and an installed Simulator runtime.

Every merge to `main` deploys the development build to Cloudflare through GitHub Actions once the repository secret and variables in [Deployment setup](docs/DEPLOYMENT.md) are configured.

The commands above run the app on each computer's own localhost. The local sign-in fixture deliberately accepts only loopback requests, so simply exposing a laptop's development port on Wi-Fi does not enable sign-in from a phone.

For the shared installable phone app, use the existing [hosted Form app](https://form-training-weight.qtr-ar.chatgpt.site) with your authorized account. A separate internet or LAN deployment requires configured authentication and persistent storage; see the deployment notes below.

## What is included

- Workout tracking with sets, reps, kg/lb conversion, previous performance, editable rest timers, routines, session recovery and workout history.
- Daily weigh-ins, smoothed weight trends, weekly averages, weekly gain/loss comparisons and coach access to individual entries.
- Marketplace profiles and packages; trainee requests; coach acceptance/rejection; payment-gated memberships.
- Coach-assigned workouts directly in the trainee's workout tab, shared completed workout progress, check-ins and messaging.
- Coach-set daily calories, protein, carbohydrates, fat and notes.
- A searchable 98-exercise library, 67 matching illustrations, and neutral icons for unmatched/custom movements.
- Coach-uploaded MP4/WebM exercise demonstrations up to 25 MB, authenticated streaming with seeking, and supported external video embeds.
- Light/dark themes, installable PWA, offline logging with synchronization, and JSON fitness backup export/import.
- Database schema and migrations, exercise assets and license notices, dependency lockfile, tests and the isolated simulation.

Live payments, subscription renewals and trainer payouts are **not implemented**. Accepted requests remain awaiting payment until a verified payment integration is built. The simulation's payment action does not activate real memberships. See [COACHING-PILOT.md](COACHING-PILOT.md) for the lifecycle and access rules.

## Source code versus account data

Git transfers the application and its history. It does not transfer live D1 account records, R2 video uploads, device backups, environment secrets, dependencies or generated build output.

Each local checkout stores its own database and uploaded videos beneath `.wrangler/`. The normal tracker also maintains device-local offline state. These are ignored by Git. Personal fitness logs can be moved using the app's JSON export/import; coaching memberships and video files are not part of that fitness export. Shared live data across devices comes from using the same hosted app and signed-in account, not from `git pull`.

## Checks and build

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

The tests cover the coaching lifecycle, permissions, nutrition, weights, mixed units, offline reconciliation, video access/ranges and media isolation. The build creates `dist/server` and `dist/client`, including the offline shell.

With the development server running, the persistence API check can be pointed at its printed URL. For example, in macOS/Linux:

```sh
FORM_TEST_ORIGIN=http://localhost:3000 npm run test:api
```

In PowerShell:

```powershell
$env:FORM_TEST_ORIGIN = 'http://localhost:3000'
npm run test:api
```

The API check restores the original local fitness document afterward. `tests/video-api-check.mjs` additionally tests the local Cloudflare upload runtime; it requires `FORM_TEST_ORIGIN` and `FORM_TEST_DB` pointing to the local `.wrangler/state/v3/d1/...sqlite` database. It uses a temporary membership and never connects to production.

`npm start` serves an existing Worker build through Wrangler. It does **not** provide the Vite plugin's local sign-in fixture; use `npm run dev` for local interactive use.

## Deployment and authentication

The current production app is privately hosted through Sites. `.openai/hosting.json` preserves its existing project ID and logical `DB` and `VIDEOS` bindings; the ID is not a credential. Local development emulates those bindings without contacting the hosted databases.

Production identity currently comes from the trusted Sites gateway. `app/chatgpt-auth.ts` reads gateway-supplied identity headers. A standalone public deployment must supply a verified authentication layer that strips untrusted identity headers and provisions D1/R2. Do not expose the Worker directly while treating arbitrary incoming identity headers as authenticated users.

Keep deployment secrets in the hosting platform or ignored local environment files. Cloning or building this repository does not deploy or alter the existing live app.

## Brand

The wordmark masters live in `public/brand/` (`form-wordmark.svg` on light, `form-wordmark-dark.svg` on dark). In code use `Wordmark` from `app/wordmark.tsx` (web) or `mobile/src/wordmark.tsx` (app); it takes a `height` and follows the current text colour. The typeface is Outfit on both surfaces. Brand green is `#70c37b`, ink `#081a0d`, app green `#245b3e`, page background `#f6f7f4`.

## Project map

| Path | Purpose |
| --- | --- |
| `app/` | Tracker, coaching and API routes |
| `lib/` | Data models, validation, coaching logic and video streaming |
| `hooks/use-fitness.ts` | Offline-aware persistence and synchronization |
| `db/`, `drizzle/` | Database schema, bindings and migrations |
| `public/` | PWA resources, exercise illustrations and their license notices |
| `scripts/` | Build and offline-shell preparation |
| `tests/` | Automated and local API checks |

## Exercise artwork

Exercise illustrations are by **Everkinetic / Greg Priday**, used under **CC BY-SA 4.0**. The bundled images are unchanged. Preserve the notices and applicable share-alike terms when distributing or adapting that artwork.

See [attribution](public/exercise-images/ATTRIBUTION.md), [full license](public/exercise-images/EVERKINETIC-LICENSE.md), and [per-image sources](public/exercise-images/sources.json). No new open-source license is granted for the application code by this repository setup.
