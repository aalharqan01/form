# FORM development

FORM is an existing React 19 / Vinext app using Cloudflare D1 and R2. Preserve the Sites deployment manifest and authentication for that target. The separate Cloudflare entry point validates Access JWTs before invoking the same application.

## Local workflow

- Node 22.13+; use the committed npm lockfiles. Root and `mobile/` install independently.
- `npm run dev:roles` applies local migrations, inserts reserved fixture records without overwriting progress, and serves coach (3100), coached client (3101) and an uncoached solo trainee (3103) through one backend (3102).
- `npm run mobile:web` serves the Expo prototype on 8081. `http://127.0.0.1:3100/__dev/phones` shows both roles. It always pairs the coach website with the trainee app.
- Role identities and proxy capabilities belong only in Vite development middleware. Never add a production role switch or trust identity headers from clients.
- E2E tests modify only the reserved `local-form-*` fixtures; they clear that fixture client's active workout. Never run test seeding against a remote database.

## Validation

Run `npm test`, `npm run test:roles`, `npm run test:access`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run cloudflare:check` for backend/auth changes. The last command builds the Cloudflare target and performs a dry run using explicit offline configuration fixtures; it does not deploy.

For mobile changes, run `npm --prefix mobile run typecheck`, `npm --prefix mobile run export:web`, and `npm run test:e2e`. The local browser test uses Chromium with an iPhone viewport; CI uses WebKit. Neither replaces an Xcode Simulator or real-device check. The development Mac has macOS 26.6.2 and Xcode 26.6; check installed Simulator runtimes before native tests.

## Architecture

- Pure reusable domain functions stay in `lib/`; no React, DOM, or server dependencies in mobile-shared modules.
- `PRODUCT-DECISIONS.md` defines the agreed trainee-only React Native app and coach website. Coach-defined workout-day templates create independent copies in client programs.
- `mobile/` is a scoped trainee-only Expo prototype, not a completed migration. Its two loopback endpoints are intentionally local-only. Add real native authentication before any external distribution. Its UI mirrors the web tracker in `app/`: keep `mobile/src/theme.tsx` tokens aligned with `app/globals.css`, build screens from `mobile/src/ui.tsx` primitives, and preserve accessibility labels used by `tests/e2e`.
- Keep database authorization and optimistic revision checks server-side.
- Build the existing Sites target with `npm run build`; build the separate team Cloudflare target with `npm run cloudflare:configure` and `npm run build:cloudflare`.
- D1 migrations are reviewed SQL. Prefer additive changes so the previous application version can still run during deployment and rollback. App rollback does not undo database migrations.
- Keep secrets out of Git and prompts. GitHub Actions deployment credentials belong in repository secrets.

## Collaboration and design

Use feature branches and pull requests. Keep changes scoped and explain validation and unresolved deployment prerequisites. Preserve FORM's established green palette, typography, responsive behavior, and accessible controls. Use existing component primitives for the web app. Prefer current official framework documentation over assumptions when working across Vinext, Expo, or Cloudflare.
