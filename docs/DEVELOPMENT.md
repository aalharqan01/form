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
- Expo coach: http://127.0.0.1:8081/?role=coach
- Expo client: http://127.0.0.1:8081/?role=client

Both roles use one local D1 database and R2 store. The launcher inserts Sam Coach and Alex Client plus one active, fictional coaching membership. It does not simulate a payment against a live account or overwrite existing fixture progress. Stop both terminals with Ctrl+C. Ports are fixed and fail if occupied, rather than silently opening the wrong environment.

The backend's port 3102 accepts role requests only from the local proxies using a random capability generated at launch. The proxies discard caller-supplied identity headers and set their own fixed role. Neither role middleware nor the phone-preview HTML is shipped in the Worker. Do not expose these development ports on the LAN or through a tunnel.

## Try the complete flow

1. In the coach view, name the session and choose **Assign workout**.
2. In the client view, wait for the assignment, then choose **Start workout**.
3. Enter weights and reps, and check off each completed set. Completed-set changes persist through the real local API.
4. Choose **Finish workout**. The coach's activity list updates with the saved weights and reps.

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

The local browser engine is Chromium with iPhone 13 viewport/touch settings. GitHub Actions runs the same interaction in WebKit on Linux. The macOS 14.1 machine's Playwright WebKit binary crashes before launch, so local Chromium results are not claimed as Safari results.

For standalone browser windows, run `npm run dev:phones -- --chromium --native` after starting the servers. Omit `--native` to preview the existing web app instead. Without `--chromium`, the launcher uses WebKit on machines where it is supported.

## Xcode / iPhone Simulator

The current Mac has macOS 14.1 and Command Line Tools, but no full Xcode or iOS runtime. The installed React Native dependency requires Xcode 16.1 or newer, so first select a supported macOS/Xcode pairing from Apple's official compatibility table: https://developer.apple.com/support/xcode/ . A macOS update is required for the modern toolchain; this setup has not performed one.

After installing a compatible Xcode:

1. Open Xcode and complete its first-launch setup and any agreement yourself.
2. In Xcode Settings, install an iOS Simulator runtime. Select full Xcode as the active developer directory if the command-line tools are still selected.
3. Start `npm run dev:roles`, then `npm run mobile:ios`. Expo starts the Simulator workflow; there is no cloud build account requirement for local development.
4. Use two iPhone simulators with separate app instances for coach and client, selecting the preview role in each. The API remains on the Mac's loopback interface.

Browser exports have been tested; native iOS compilation and Simulator operation require the toolchain above and must be verified separately. Before TestFlight distribution, replace the local role endpoints with a real native sign-in flow. Cloudflare Access staging in this PR is for the web application; it is not an authentication implementation for the native prototype.
