# Local coach/client development

## Start the previews

Install Node 22.13 or later, then run once:

```sh
npm ci
npm --prefix mobile ci
npx playwright install chromium
```

In one terminal run `npm run dev:roles`. In another run `npm run mobile:web`. Open:

- Both iPhone-size previews: http://127.0.0.1:3100/__dev/phones
- Existing web app previews: http://127.0.0.1:3100/__dev/phones?app=web
- Coach web workspace: http://127.0.0.1:3100/coaching
- Client web workspace: http://127.0.0.1:3101/
- Trainee Expo app (browser fallback): http://127.0.0.1:8081/

Open the served HTTP preview URL, not `dev/phones.html` as a `file://` page. The default preview pairs the coach website with the trainee app; the native app has no coach switch.

Both roles use one local D1 database and R2 store. The launcher inserts Sam Coach and Alex Client plus one active, fictional coaching membership. It does not simulate a payment against a live account or overwrite existing fixture progress. Stop both terminals with Ctrl+C. Ports are fixed and fail if occupied, rather than silently opening the wrong environment.

The backend's port 3102 accepts role requests only from the local proxies using a random capability generated at launch. The proxies discard caller-supplied identity headers and set their own fixed role. Neither role middleware nor the phone-preview HTML is shipped in the Worker. Do not expose these development ports on the LAN or through a tunnel.

## Try the complete flow

1. On the coach website, open **Workout templates → Create template**. Name the day freely, select exercises, and set reps, sets, units and coaching instructions.
2. Save the template. It persists in the coach's private database library across devices signed into that account. **Edit template** changes the original; it leaves existing client assignments unchanged.
3. Open **Clients & requests → Alex Client → Assign/Edit program**. Choose a saved template and **Add template**, select its training day, and personalise its name or exercises. **Save as template** can also save an existing program day as a new library entry.
4. Choose **Assign program**. On the trainee app, choose an assigned day and **Start workout**.
5. Enter weights and reps, complete each set, then **Finish workout**. Reload the coach's client overview to review the saved workout.

Each assigned session has its own identity and exercise copy. Templates save external demonstration URLs; existing client-specific uploaded videos must be attached independently to each program, preserving their current membership access controls. A reusable uploaded-video library is separate work. Templates do not contain personal progress or client identity.

The new additive migration is `0004_coach_workout_templates.sql`; existing records are retained. Concurrent template edits use revision checks. Close and reload the editor if another device saved a newer version.

The prototype refreshes shared data every three seconds. A network or revision conflict displays a save error rather than silently reporting success. The existing application remains available alongside the prototype; this is not a full framework migration.

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

The E2E test starts required servers if they are not already running. It uses only the reserved local fixture identities, clears their in-progress test workout, and leaves completed fixture workouts visible. Do not use those identities for data you need to preserve. Existing non-fixture accounts are untouched.

The local browser engine is Chromium with iPhone 13 viewport/touch settings. GitHub Actions runs the same interaction in WebKit on Linux. To run the full browser flow locally in WebKit on macOS, install it with `npx playwright install webkit`, then run `FORM_E2E_WEBKIT=1 npm run test:e2e`. WebKit browser tests still do not replace real iPhone Safari or native Simulator verification.

For standalone browser windows, run `npm run dev:phones -- --chromium --native` after starting the servers. Omit `--native` to preview the existing web app instead. Without `--chromium`, the launcher uses WebKit on machines where it is supported.

## Xcode / iPhone Simulator

The development Mac now has macOS 26.6.2 and Xcode 26.6 selected. Expo SDK 57 requires Xcode 26.4+ according to its versioned documentation: https://docs.expo.dev/versions/v57.0.0/ . An iOS Simulator runtime must also be installed in Xcode Settings → Components, or with `xcodebuild -downloadPlatform iOS`.

1. Start `npm run dev:roles` for the shared local backend and coach website.
2. Run `npm run mobile:ios` in a second terminal for the trainee app. If `mobile:web` is already running on 8081, stop that Metro server first.
3. Keep the coach website open alongside Simulator at http://127.0.0.1:3100/coaching. Test it at desktop width and in iPhone Safari; coaches always use the website.
4. The native trainee app connects to the Mac's loopback API. There is no coach mode in the native app.

Before TestFlight distribution, replace the local endpoint with a real native sign-in flow. Cloudflare Access staging is for the website; it is not production native authentication. The trainee app remains a scoped workout prototype, not a completed migration of all tracking/coaching features.
