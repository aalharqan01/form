# Team Cloudflare staging and GitHub Actions

This repository preserves the colleague's existing Sites deployment and adds a **separate** Cloudflare Workers target. No existing Sites data, users, or video uploads are migrated automatically. Staging starts with its own D1 database and R2 bucket.

## Deployment behavior

`.github/workflows/ci.yml` runs tests, lint, typechecks, both Worker builds, an Expo web export, and the coach/client interaction in WebKit. A push to `main` deploys staging only after those checks pass and the repository variable `FORM_DEPLOY_ENABLED` is `true`. Feature branches and pull requests never receive deployment credentials or deploy.

Deployments to the same staging target are serialized. The workflow applies reviewed D1 migrations and deploys the generated Worker/assets using the pinned Wrangler version in the root lockfile. It does not publish the native prototype to TestFlight or the App Store. A mobile release requires a separate signing/distribution workflow once native authentication and the full mobile app are ready.

## One-time account setup

Use one team-owned Cloudflare account and individual member logins. Authenticate Wrangler locally with `npx wrangler login`; OAuth login is for local provisioning and is not the GitHub Actions credential.

1. Create or select a Workers `workers.dev` subdomain in that account.
2. Create a D1 database named `form-staging-db` and an R2 bucket named `form-staging-videos`. If Cloudflare requires R2 activation/billing agreement, the account owner completes it. Do not use the colleague's Sites-managed storage.
3. Create a Cloudflare Zero Trust team and a self-hosted Access application covering the full staging hostname (`form-staging.<account-subdomain>.workers.dev`). Allow only the team's explicitly chosen email addresses. Enable Access protection for the Worker's `workers.dev` URL. Configure equivalent protection before adding a custom domain.
4. Copy the Access team domain and application audience (AUD) tag into the configuration below. The Worker also verifies the Access JWT signature, issuer, audience and expiry. Missing/invalid authentication fails closed, including direct requests with forged Sites identity headers.
5. Create a Cloudflare API token scoped to this account with **Workers Scripts: Edit**, **D1: Edit**, **Workers R2 Storage: Edit**, and **Account Settings: Read**. Add zone/route permissions only if a custom-domain setup requires them. Store it using `gh secret set CLOUDFLARE_API_TOKEN --repo aalharqan01/form`, entering it at the prompt; do not paste it into chat or Git.
6. Configure the GitHub repository variables below. Create/allow the `staging` deployment environment if the repository's plan supports it; the owner manages any deployment restrictions. Keep `FORM_DEPLOY_ENABLED` unset until Access and the initial deployment have been verified.

| Repository variable | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The team account's 32-character ID |
| `FORM_D1_DATABASE_ID` | The staging D1 database UUID |
| `FORM_R2_BUCKET` | `form-staging-videos`, or the chosen staging bucket |
| `FORM_ACCESS_TEAM_DOMAIN` | `https://<team>.cloudflareaccess.com` (no trailing slash) |
| `FORM_ACCESS_AUD` | The Access application's audience tag |
| `FORM_DEPLOY_ENABLED` | `true`, only after setup verification |

GitHub repository permissions for code collaboration do not automatically grant Cloudflare access or permission to manage repository environments. The account/repository owner completes any operations your membership cannot perform.

## Local build and initial deployment

Load the configuration variables above into your terminal from an ignored local environment source. Then:

```sh
npm run cloudflare:configure
npm run build:cloudflare
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

The configuration generator validates required values and writes ignored `.cloudflare/wrangler.json`. It does not create resources or deploy. It refuses missing values instead of shipping placeholder infrastructure IDs.

When the account, Access policy, and storage are ready, apply the initial migrations and deploy:

```sh
npx wrangler d1 migrations apply DB --remote --config .cloudflare/wrangler.json
npx wrangler deploy --config dist/server/wrangler.json
```

Verify unauthorized requests cannot read private APIs, sign in as each allowed team member, and confirm persistence. Only then set the repository deployment toggle and merge the setup PR. Subsequent successful merges update staging automatically.

For CI without cloud credentials, `npm run cloudflare:check` uses explicit offline configuration fixtures, builds the authenticated Worker, and invokes `wrangler deploy --dry-run`. It creates no resources and cannot publish.

## Identity, data and rollback

Cloudflare identities are namespaced with `cf-access:` and derived from verified token subjects. They will differ from existing Sites identities, so live account migration requires an explicit mapping and data migration plan. Do not seed local fixture memberships remotely. New real memberships remain subject to the application's payment-verification rules.

Use additive migrations compatible with the previous Worker version. Rolling back a Worker does not roll back D1 schema or data. Use Cloudflare deployment history for a known-good application version, and D1 recovery facilities only with a deliberate database recovery plan. Keep staging separate from production until native authentication, payments, and production readiness are completed.

Official references:
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
