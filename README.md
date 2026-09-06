# Form — Training & Weight

Private, installable personal fitness tracker built with React, Vinext, and Cloudflare D1 through Sites.

## Features

- Custom exercises, editable sets/reps/kg, completion checks, and a timestamp-based rest timer.
- Reusable routines, previous performance, session notes, unfinished-session recovery, and workout history.
- Dated weigh-ins, kg/lb body-weight display, goals, and an exponential weight trend with a seven-day time constant.
- Account-scoped database storage and optimistic revision checks to prevent cross-device overwrites.
- JSON backup export/restore; isolated sample-data mode.
- PWA manifest, home-screen icons, and a public offline notice. Internet is required to load and save data.

The Google Sheet has not been imported. Historical dates must be grounded before importing weight logs. The trend algorithm is independent of Happy Scale.

## Development

Use Node 22.13 or later. Run `npm install`, then initialize local D1 with:

`npx wrangler d1 execute DB --local --config wrangler.local.json --file drizzle/0000_illegal_bug.sql`

Run `npm run dev` and use the localhost URL it prints. Local sign-in uses the Sites development fixture; production identity is injected by the private Sites gateway. Database access is always scoped by that identity.

## Checks

- `npm test` covers trend mathematics, unit conversion, validation, and workout volume.
- `npm run lint` checks authored code; unmodified generated UI primitives are excluded.
- `npx tsc --noEmit` checks TypeScript across the project.
- `npm run test:api` runs only against localhost:3002 and restores the initial database document afterward.
- `npm run build` produces the Worker and client assets.

No broad browser interaction/visual QA was performed. The optional read-only WebMCP summary tool is feature-detected; its browser contract remains unverified.

## Storage behavior

Workout edits are debounced and saved serially. A save conflict or network failure preserves current in-memory edits and warns before page unload. Users can export unsaved changes. Do not close the page when it reports unsaved changes. Successfully saved active workouts are restored from D1 on the next visit. There is no offline write queue.
