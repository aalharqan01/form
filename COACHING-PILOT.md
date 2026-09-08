# Form coaching pilot

The coaching workspace is at `/coaching`. The existing tracker now includes My coach. Client invitations point to `/join?invite=…` and require the invited email's authenticated account. Current authentication is ChatGPT sign-in, inherited from the original app. The Sites audience remains private to the owner; invitation links do not grant Sites access. Real pilot participants must also receive access through the Sites sharing controls before they can open an invitation.

Implemented: coach profile and packages, email-bound expiring invitations, explicit intake and progress-sharing consent, coach/client membership views, weekly scheduled programs with per-exercise units and video links, personal workout integration, shared weight and exercise progress, weekly check-ins with coach feedback, direct messages and unread indicators, and immediate access revocation when either participant ends coaching. Personal fitness logs are never edited by a coach. Program and profile changes use revision checks; repeated message and check-in submissions are idempotent. Coaching requires a connection; the existing personal tracker retains its offline behavior.

## Payments are intentionally not enabled

The user has no payment-provider account yet and selected building the coaching pilot first. Prices are indicative. Accepting an invitation creates unpaid pilot access, not a paid subscription. There is no live checkout, automatic renewal, commission collection, payout, or fabricated transaction history. The server rejects checkout attempts. Never enable a payment button without a real provider integration.

Business: Qatar entity. Intended coach payout destinations: Qatar and Saudi Arabia. SADAD is under consideration, not selected. Its Qatar materials describe recurring payments, but cross-border coach settlements and marketplace split payments have not been confirmed.

Sources reviewed 2026-09-08:
- https://sadad.qa/en/online-invoice-software-qatar/
- https://sadad.qa/en/terms-conditions/
- https://www.tap.company/en-qa/products/marketplaces

Before implementing paid memberships, obtain written provider confirmation of Qatar marketplace onboarding, Saudi/Qatari coach verification and settlement, recurring billing API, supported settlement currencies, processing and payout fees, refund handling and dispute responsibility. Then implement verified webhooks, idempotent billing events, a separate financial ledger, subscription lifecycle and cancellation, and settlement reconciliation against a sandbox. No provider secrets belong in source control or chat.

## Validation

`npm test` covers the original tracker plus a separate-coach/trainee SQLite lifecycle: invitation identity, consent, unauthorized access, program ownership and revisions, real shared progress, message idempotency, read receipts, weekly check-ins, feedback ownership, checkout rejection, and access revocation with personal-log preservation.

`npm run test:api` exercises the running local D1 tracker API and restores original local test data. Set FORM_TEST_ORIGIN if its port differs from 3002. `npm run lint`, `npx tsc --noEmit`, and `npm run build` provide source validation. No browser UI QA was performed because the Sites skill permits that only when requested.

## Pilot boundaries

Packages are snapshotted when invited. Later edits apply only to new invitations. Invitations expire after 14 days and can be revoked; raw tokens are returned only at creation and only their SHA-256 hashes are stored. Existing and future fitness history is shared after consent, and all coaching data access is revoked at the end of a membership. Current adherence calculations use UTC calendar days and stable program session IDs, and the UI labels this explicitly. Messages show the latest 200 messages; check-in history covers up to 104 entries. Dashboards load up to 300 memberships. These limits should become paginated before a larger rollout.
