# Development deployment on Cloudflare via GitHub Actions

Every merge to `main` runs the full check suite and then deploys the **development** build to a Cloudflare Worker named `form-dev`. Feature branches and pull requests are verified only; they never receive credentials. Until the repository is configured, the deploy job prints a warning naming the missing values and finishes without deploying.

The Worker is a separate target from any older Cloudflare Sites deployment. Nothing is migrated automatically; development has its own D1 database and R2 bucket.

**If the Cloudflare dashboard is also connected to this GitHub repository (Workers Builds), disconnect that build integration.** There is no `wrangler.jsonc` committed at the repository root, so Cloudflare's own builds fail, and two deployers would race each other. GitHub Actions is the single deploy path.

## Deployment behavior

`.github/workflows/ci.yml` runs tests, lint, typechecks, both Worker builds, an Expo web export and the browser tests in WebKit. On a push to `main`, the `Deploy development to Cloudflare` job then checks that the secret and variables below are present, generates the Wrangler configuration, applies reviewed D1 migrations and deploys the Worker and assets with the pinned Wrangler from the lockfile. Deployments are serialized per target. The job's environment URL points at the deployed Worker.

The native app is not published by this workflow.

## One-time account setup

Use one team-owned Cloudflare account and individual member logins. Authenticate Wrangler locally with `npx wrangler login`; OAuth login is for local provisioning and is not the GitHub Actions credential.

1. Create or select a Workers `workers.dev` subdomain in that account.
2. Create a D1 database named `form-dev-db` and an R2 bucket named `form-dev-videos`. If Cloudflare requires R2 activation/billing agreement, the account owner completes it. Do not use the colleague's Sites-managed storage.
3. Create a Cloudflare Zero Trust team and a self-hosted Access application covering the full development hostname (`form-dev.<account-subdomain>.workers.dev`). Allow only the team's explicitly chosen email addresses. Enable Access protection for the Worker's `workers.dev` URL. Configure equivalent protection before adding a custom domain.
4. Copy the Access team domain and application audience (AUD) tag into the configuration below. The Worker also verifies the Access JWT signature, issuer, audience and expiry. Missing/invalid authentication fails closed, including direct requests with forged Sites identity headers.
5. Create a Cloudflare API token scoped to this account with **Workers Scripts: Edit**, **D1: Edit**, **Workers R2 Storage: Edit**, and **Account Settings: Read**. Add zone/route permissions only if a custom-domain setup requires them. Store it using `gh secret set CLOUDFLARE_API_TOKEN --repo aalharqan01/form`, entering it at the prompt; do not paste it into chat or Git.
6. Configure the GitHub repository variables below. The workflow uses a GitHub environment named `development`; it is created on first run, and the owner can add reviewers there later.

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo aalharqan01/form
gh variable set CLOUDFLARE_ACCOUNT_ID --repo aalharqan01/form --body "<account id>"
gh variable set FORM_D1_DATABASE_ID --repo aalharqan01/form --body "<d1 uuid>"
gh variable set FORM_R2_BUCKET --repo aalharqan01/form --body "form-dev-videos"
gh variable set FORM_ACCESS_TEAM_DOMAIN --repo aalharqan01/form --body "https://<team>.cloudflareaccess.com"
gh variable set FORM_ACCESS_AUD --repo aalharqan01/form --body "<audience tag>"
```

| Repository variable       | Value                                                     |
| ------------------------- | --------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`   | The team account's 32-character ID                        |
| `FORM_D1_DATABASE_ID`     | The development D1 database UUID                          |
| `FORM_R2_BUCKET`          | `form-dev-videos`, or the chosen bucket                   |
| `FORM_ACCESS_TEAM_DOMAIN` | `https://<team>.cloudflareaccess.com` (no trailing slash) |
| `FORM_ACCESS_AUD`         | The Access application's audience tag                     |
| `FORM_WORKER_NAME`        | Optional. Defaults to `form-dev`                          |

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

Verify unauthorized requests cannot read private APIs, sign in as each allowed team member, and confirm persistence. After that, every green merge to `main` updates the development Worker automatically. Re-run the workflow from the Actions tab (`workflow_dispatch`) to deploy without a new commit.

For CI without cloud credentials, `npm run cloudflare:check` uses explicit offline configuration fixtures, builds the authenticated Worker, and invokes `wrangler deploy --dry-run`. It creates no resources and cannot publish.

## Identity, data and rollback

Cloudflare identities are namespaced with `cf-access:` and derived from verified token subjects. They will differ from existing Sites identities, so live account migration requires an explicit mapping and data migration plan. Do not seed local fixture memberships remotely. New real memberships remain subject to the application's payment-verification rules.

Use additive migrations compatible with the previous Worker version. Rolling back a Worker does not roll back D1 schema or data. Use Cloudflare deployment history for a known-good application version, and D1 recovery facilities only with a deliberate database recovery plan. Keep development separate from production until native authentication, payments, and production readiness are completed.

Official references:

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
