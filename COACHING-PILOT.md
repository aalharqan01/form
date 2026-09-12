# Form Marketplace pilot

Trainees use the Marketplace tab (`/?view=marketplace`) to browse listed coaches, compare paid monthly packages and submit a coaching request with intake and explicit consent. Coaches see requests and an in-app notification, review the intake, and accept or decline with an optional response. Trainees track decisions in My coach. Accepted requests wait for payment; they do not become active memberships.

## State and privacy

The request lifecycle is `requested → awaiting_payment` or `rejected`. Trainees can withdraw requested or accepted-but-unpaid requests. Only the owning coach can decide a request. Membership activation must come from verified payment processing; there is currently no activation endpoint. Checkout returns an explicit unavailable error. Client-supplied paid flags cannot activate membership. The package and price are snapshotted from the server at request time; stale catalog revisions are rejected. A unique open key prevents duplicate concurrent requests for the same coach and trainee.

Only the intake is shared during review and payment waiting. Workout and weight history, program access, check-ins and messages are available only to active membership participants. Ending coaching immediately removes shared access while preserving the personal fitness log. Existing active pilot memberships remain intact; they are not evidence of payment. Old invitation creation and acceptance APIs return 410, and `/join` redirects to the Marketplace. Token fields are retained solely for existing database compatibility.

Profiles are drafts by default. Coaches explicitly opt into listing their profile and packages. All listed coaches are available in the app's searchable catalog; no private contact details are included. Existing profiles are not silently listed. Each listed package must have a price greater than zero.

## Payments and audience

The user has no payment provider account yet. Qatar business, coach payout destinations Qatar and Saudi Arabia, SADAD under consideration. No live payment, auto-renewal, commission or payout is implemented. New memberships cannot start until a provider is connected and a verified-payment activation flow is built and tested. No synthetic checkout or manual mark-paid mechanism is offered.

Current authentication is ChatGPT sign-in inherited from Form. The Sites audience remains private to the owner. Marketplace listing does not change platform access. Real pilot participants need Sites access before using the app.

## Validation

`npm test` covers Marketplace draft/listed visibility, server-owned pricing, request consent, duplicate prevention, accept/decline authorization, stale decisions, payment gating, disabled legacy invitations, request withdrawal and re-requesting. A separate isolated active-membership fixture retains tests for programs, progress, messaging, check-ins and revocation; it is never created in the live application. `npm run lint`, `npx tsc --noEmit` and `npm run build` validate the implementation. No browser UI QA was performed, per Sites skill policy.

