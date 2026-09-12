# Local coach/client development

## Start the previews

Install Node 22.13 or later, then run once:

```sh
npm ci
npm --prefix mobile ci
npx playwright install chromium
```

In one terminal run `npm run dev:roles`. In another run `npm run mobile:web`. Open:

- All iPhone-size previews: http://127.0.0.1:3100/__dev/phones
- Coach web workspace: http://127.0.0.1:3100/coaching
- Trainee Expo app, coached (browser fallback): http://127.0.0.1:8081/
- Trainee Expo app, no coach: http://127.0.0.1:8081/?role=solo

Open the served HTTP preview URL, not `dev/phones.html` as a `file://` page. The single preview pairs the coach website with the trainee app. Old `app=web` and `app=mobile` query parameters resolve to this same view. The native app has no coach switch or marketplace.

All roles use one local D1 database and R2 store. The launcher inserts Sam Coach, Alex Client (coached, proxy port 3101) and Riley Solo (no membership, proxy port 3103) plus one active, fictional coaching membership for Alex. Riley shows the free-tier app: Train, Weight and History only, with no My coach tab. It does not simulate a payment against a live account or overwrite existing fixture progress. Stop both terminals with Ctrl+C. Ports are fixed and fail if occupied, rather than silently opening the wrong environment.

The backend's port 3102 accepts role requests only from the local proxies using a random capability generated at launch. The proxies discard caller-supplied identity headers and set their own fixed role. Neither role middleware nor the phone-preview HTML is shipped in the Worker. Do not expose these development ports on the LAN or through a tunnel.

## Try the complete flow

1. On the coach website, open **Workout templates → Create template**. Name the day freely, select exercises, and set reps, sets, units and coaching instructions.
2. Save the template. It persists in the coach's private database library across devices signed into that account. **Edit template** changes the original; it leaves existing client assignments unchanged.
3. Open **Clients & requests → Alex Client → Assign/Edit program**. Choose a saved template and **Add template**, select its training day, and personalise its name or exercises. **Save as template** can also save an existing program day as a new library entry.
4. Choose **Assign program**. On the trainee app, the assigned day appears under **Your assigned workouts** at the top of **Train**; choose **Start workout** on that day.
5. Enter weights and reps, complete each set, then **Finish workout**. Reload the coach's client overview to review the saved workout.

Each assigned session has its own identity and exercise copy. Templates save external demonstration URLs; existing client-specific uploaded videos must be attached independently to each program, preserving their current membership access controls. A reusable uploaded-video library is separate work. Templates do not contain personal progress or client identity.

The new additive migration is `0004_coach_workout_templates.sql`; existing records are retained. Concurrent template edits use revision checks. Close and reload the editor if another device saved a newer version.

The trainee app refreshes shared data every three seconds. Its Train, Weight, History and My coach tabs use the same training account and reproduce the original web tracker design: Geist type, bezel cards, the floating tab bar, and light/dark themes (Preferences → Appearance). Design tokens live in `mobile/src/theme.tsx` and shared primitives in `mobile/src/ui.tsx`; screens are under `mobile/src/screens/`. Train shows assigned workouts, the next-session card, body weight, the weekly activity strip, routines, starter templates and the last session. An active workout takes over the Train tab with the web tracker's exercise cards, kg/lb switch, weight and rep steppers, warm-up sets, exercise search and coaching instructions. History includes every saved session, per-exercise load/volume records and PR badges.

The workout elapsed timer stays visible throughout an active session. Each exercise has its own rest target (0–600 seconds), set in the coach template/program editor and copied into the trainee workout. The trainee can adjust it from that exercise’s Rest control. Completing a set starts that exercise’s countdown; add/subtract 15 seconds, start it manually or skip it. Legacy exercises without a rest target begin at 90 seconds. Both the workout and the exercise-linked absolute rest deadline persist on the device across reopening. The rest island above the tab bar shows the countdown with ±15 s and skip controls. A foreground vibration signals rest completion; background notification/audio delivery is not implemented.

A workout with at least one logged set can be finished early after confirmation. Unfinished sets remain skipped, the session is labelled “Finished early” in trainee and coach history, and it does not count as a fully completed assigned day. A session with no logged sets can be discarded.

Messages on both sides support photo and short video attachments through `/api/media`, and the Progress photos view groups front, side and back photos by date with a two-date compare. The route reuses the R2 `VIDEOS` binding locally; uploads and access are scoped to the membership, and only the uploader can attach or remove their media. Migration `0005_coaching_media.sql` adds the tables.

Daily weigh-ins, editable dated entries, weight goals, weekly arithmetic averages and a separate smoothed trend are available in Weight. Both coach and trainee can see the difference between consecutive Monday–Sunday (UTC) averages. A missing adjacent week displays no comparison; the current week uses only readings so far. Nutrition, messages, weekly check-ins and coach feedback are in My coach.

Fitness changes are stored on device before syncing and reconcile through the shared three-way merge. Conflicting edits require an explicit choice and retain a device backup. Cached coaching content can be read offline; sending messages/check-ins requires a connection. Native authentication and store distribution remain pending; this is a local development app using the existing backend.

## Automated checks

```sh
npm test
npm run test:roles
npm run test:access
npm run lint
npm run typecheck
npm --prefix mobile run typecheck
npm run test:e2e
```

The E2E test starts required servers if they are not already running. It uses only the reserved local fixture identities and temporarily clears their in-progress workout. Tests restore fixture fitness/program/nutrition and remove newly created test templates, messages and check-ins when finished. Do not use those identities for data you need to preserve. Existing non-fixture accounts are untouched.

The local browser engine is Chromium with iPhone 13 viewport/touch settings. GitHub Actions runs the same interaction in WebKit on Linux. To run the full browser flow locally in WebKit on macOS, install it with `npx playwright install webkit`, then run `FORM_E2E_WEBKIT=1 npm run test:e2e`. WebKit browser tests still do not replace real iPhone Safari or native Simulator verification.

For standalone browser windows, run `npm run dev:phones -- --chromium` after starting the servers. Without `--chromium`, the launcher uses WebKit on machines where it is supported.

## Xcode / iPhone Simulator

The development Mac now has macOS 26.6.2 and Xcode 26.6 selected. Expo SDK 57 requires Xcode 26.4+ according to its versioned documentation: https://docs.expo.dev/versions/v57.0.0/ . An iOS Simulator runtime must also be installed in Xcode Settings → Components, or with `xcodebuild -downloadPlatform iOS`.

1. Start `npm run dev:roles` for the shared local backend and coach website.
2. Run `npm run mobile:ios` in a second terminal for the trainee app. If `mobile:web` is already running on 8081, stop that Metro server first.
3. Keep the coach website open alongside Simulator at http://127.0.0.1:3100/coaching. Test it at desktop width and in iPhone Safari; coaches always use the website.
4. The native trainee app connects to the Mac's loopback API. There is no coach mode in the native app.

Before TestFlight distribution, replace the local endpoint with a real native sign-in flow. Cloudflare Access staging is for the website; it is not production native authentication. Account onboarding, production native authentication, store billing and distribution remain separate prerequisites.
