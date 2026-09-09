# Form: product and business decisions

Last updated: 9 September 2026. Keep these decisions as the baseline until the user explicitly changes them. This document defines the target product for the next implementation phase; it does not claim the existing application already implements it. Recommendations and unresolved commercial details are identified separately from confirmed product requirements.

## Two paid offerings, with free tracking underneath

1. **Form Premium:** an optional, low-priced subscription for additional Form app features. No coach is involved in this purchase. The user explicitly confirmed that standalone Premium purchases stay in the trainee mobile app through Apple/Google store billing; do not move them to the website as the default approach.
2. **Coach Marketplace:** trainees browse coaches, choose an available package and purchase immediately on the website. Coaches control package capacity and availability in advance. Packages with no available slots display **Full** and cannot be purchased. There is no enrolment request, acceptance or rejection step; this supersedes the earlier approval workflow. This is a separate coaching membership. Users with a coach receive Form Premium features as part of their coaching membership, without a separate Premium purchase.

Confirmed purchase flow: the trainee signs into the website with the same Form account used in the app, chooses an available package and pays directly. Confirmed successful payment activates the coaching membership and included Premium automatically. The coach receives a new-member notification without needing to approve the membership and begins onboarding/programme preparation.

Recommended lifecycle details: incomplete or failed checkout must not activate membership. Included Premium lasts through the coaching membership's paid term. Afterwards, independent tracking and historical data remain available, and Premium continues only if another valid entitlement exists. Existing standalone Premium subscribers must receive clear guidance for managing renewal; do not assume Form can automatically cancel or refund their store subscription. Track standalone Premium and coaching access independently so expiry of one does not remove access still granted by the other. Detailed refund, pause, grace-period and onboarding-time commitments remain to be agreed before production billing.

Capacity implementation recommendation: protect the last available slot against simultaneous checkouts with a temporary reservation and clear expiry, releasing abandoned or failed checkout reservations. Membership expiry and renewal must update capacity consistently; cancelling future renewal must not free a slot while that member remains active. Do not promise a personalised programme is ready immediately just because membership has activated.

Independent workout and body-weight tracking remain available free.

Do not redefine these two offerings as remote-coaching, live-session, and in-person package categories. Those service types were discussed to understand store billing exceptions, not approved as a product-scope change.

## Experience and commercial priorities

- Maintain one Form account and shared membership/progress data across the website and mobile app.
- The user has replaced the earlier in-app marketplace proposal: the mobile app is now for trainees only. All marketplace browsing, coach discovery profiles, package details, enrolment and coaching payments belong on the website. Do not retain an in-app "See packages" purchase link as the default design.
- The trainee app supports independent tracking and ongoing coaching delivery. A paid, active website coaching membership is reflected in the app, including access to the assigned coach and Premium. When membership expires, the app returns to independent tracking, retaining any separately valid Premium access. Cancellation timing should respect the remaining paid term rather than immediately removing access merely because renewal was cancelled.
- Coaches use the website only: packages and slot availability, programme/schedule creation, exercise videos, nutrition targets, client progress review, communication and business administration. Do not build a native coach mode. Trainees communicate through their app with coaches using the website.
- The website must be fully optimised for both iPhone/iOS browser use and desktop computers. Coaches must be able to complete all core workflows on either device, with layouts and controls designed for each screen size, not a desktop dashboard merely shrunk to fit. The trainee marketplace and checkout must also work well on phones. An installable web app (PWA/Home Screen experience) is the proposed delivery enhancement; a separate native coach app is outside scope.
- This website/mobile split is a product direction, not confirmation that Apple or Google will exempt Form's exact offering from billing requirements. Because standalone Premium remains purchasable inside the trainee app, do not assess the whole app as a purchase-free companion or consumption-only app. Coaching checkout and included Premium still require assessment under the applicable store rules.
- Coaches are expected to bring clients through their own advertising; the marketplace also allows discovery. Enrolment is not invite-only.
- Maximise coach earnings while retaining enough Form revenue to cover costs.
- Prefer provider-managed settlement directly to coaches, with Form's commission separated automatically. This is a desired outcome, not a confirmed payment capability for every billing route.
- Company registration is planned in Qatar, serving Qatar and Saudi Arabia.
- React Native is the chosen framework for the trainee mobile app on iOS and Android. These decisions are ready to guide implementation; this document update does not itself change application code.
- Do not import the user's shared coaching spreadsheet data. Its workflow is a reference; exercises can use kilograms or pounds.

## Trainee mobile app — confirmed scope

- Independent workout logging: exercises, sets, repetitions and loads in kg or lb; default to kg when starting a workout.
- A scrollable active workout page, with rest time that can be increased or reduced.
- Small exercise images and embedded demonstration videos within the workout experience.
- Daily bodyweight entries, weekly averages, trends and gain/loss.
- Standalone Premium purchase and subscription management through the relevant store.
- An assigned-coach entry such as **My Coach** for active coaching members, with communication, check-ins and feedback.
- Assigned schedules and workouts directly in the **Workouts** tab. Trainees must be able to start and complete them there without being redirected to My Coach.
- Coach-assigned calorie and macronutrient targets.
- Completed workout logs and weigh-ins shared with the assigned coach through the website.

Public coach discovery profiles, marketplace browsing, package details and coaching checkout belong on the website. Information about the trainee's already assigned coach remains part of ongoing coaching delivery in the app.

## Website — confirmed scope

### Marketplace and trainee account

- Browse coaches, view profiles and compare packages, prices and inclusions.
- Purchase available memberships immediately; show **Full** and prevent checkout when capacity is exhausted.
- Use the same Form account as the mobile app, with membership changes reflected automatically.
- Manage coaching membership status, receipts, renewal and cancellation.
- Distinguish website coaching billing from standalone app-store Premium billing.

### Coach workspace

- Create and edit public profiles, packages, pricing and slot availability.
- Receive new-member notifications and manage onboarding.
- Create programmes and assign schedules to individual trainees.
- Select exercises from a preloaded library rather than requiring exercise names to be typed from scratch.
- Upload demonstration videos directly and attach them to exercises for embedded playback. A video-link-only workflow does not meet the requirement.
- Assign and update calorie and macronutrient targets.
- Review workout completion, logged sets/reps/loads and changes in lifting performance across weeks.
- Prioritise weekly average bodyweight over the latest isolated weigh-in in client summaries, with weekly gain/loss. Open the summary to inspect the client's individual dated entries.
- Communicate with trainees, review check-ins and provide feedback. Coach website and trainee app share the same conversation and records.
- View earnings, payout information and business administration.

### Phone and computer experience

Full core workflows must work on both iPhone browsers and desktop computers. Phone support includes programme and package editing, video uploads, progress review and messaging. Use touch-friendly controls and layouts adapted to small screens; use desktop space for detailed comparisons and management of multiple clients. Marketplace browsing and checkout must also work well on phones.

Recommended enhancement: provide installable web app/PWA access from the Home Screen while preserving browser access. Verify notifications on supported devices; do not assume identical browser capabilities or promise offline functionality without implementation and testing. Coaches do not need a separate native app.

## Access model

| Trainee status | App access |
| --- | --- |
| No paid entitlement | Free independent tracking |
| Valid standalone Premium subscription | Independent tracking and Premium |
| Active coaching membership | Tracking, ongoing coaching and included Premium |
| Coaching membership expires | Independent tracking; Premium remains only if another valid entitlement exists |

Recommended behaviour: cancellation of future renewal preserves the remaining paid term; distinguish it from expiry or immediate termination/refund. Preserve historical workout logs, weigh-ins and completed coaching records when ongoing coaching ends. A newly active membership should show its actual onboarding/programme status rather than imply a personalised programme is already ready.

## Superseded approaches — do not reintroduce

- A mobile marketplace, public coach discovery profiles, package listings or a **See packages** checkout link.
- A native coach interface or a role switch into coach tools in the trainee app.
- Invite-only membership or the request → accept/reject → payment funnel.
- Moving standalone Premium purchases to the website as the default.
- Requiring coached trainees to purchase Premium separately.
- Redirecting assigned workouts away from the trainee's Workouts tab.

## Still unresolved

- Payment provider selection: MyFatoorah and SADAD have been discussed; no provider account or commercial terms are confirmed.
- Apple/Google billing classification of website coaching memberships accessed in a trainee app that also sells standalone Premium, including Qatar/Saudi storefront behaviour and the inclusion of Premium digital app features in coaching memberships.
- Cross-border coach onboarding, settlement, fees, refunds, and payout responsibilities.
- Premium pricing, marketplace commission, coach earnings guarantees, and whether coaches will have a separate software fee. Assistant examples are proposals, not agreed prices.
- The previously discussed 90–95% coach share and 5–10% Form share are commercial targets, not guaranteed net payouts. Processing costs and other obligations must be included before making earnings promises.
- Exact standalone Premium feature boundaries; do not arbitrarily paywall currently free tracking while implementing this split.
- Competitor marketing pages or payment integrations do not establish Form's eligibility for a store-billing exception.

These unresolved questions do not prevent reversible product/UI work. Production payment promises and live billing must reflect verified provider capabilities and applicable store requirements.

## Next implementation checklist

This is a work plan, not completed implementation.

GitHub is the execution tracker: [master implementation issue #1](https://github.com/aalharqan01/form/issues/1) and [delivery milestone](https://github.com/aalharqan01/form/milestone/1). Each issue contains acceptance criteria, dependencies and verification requirements. Use linked PRs and verification evidence to track completion. Provider/store research can proceed alongside product work; live billing is gated separately.

- [ ] [#2 — Audit existing routes, navigation, screens and data](https://github.com/aalharqan01/form/issues/2) against this document.
- [ ] [#3 — Separate trainee mobile navigation](https://github.com/aalharqan01/form/issues/3) from website marketplace and coach navigation.
- [ ] [#5 — Replace request/approval with capacity and direct checkout](https://github.com/aalharqan01/form/issues/5), including **Full** states and migration of existing records without deleting user data.
- [ ] [#4 — Support shared account identity](https://github.com/aalharqan01/form/issues/4) and synchronised membership/Premium access across app and website.
- [ ] [#6 — Implement membership and Premium lifecycle](https://github.com/aalharqan01/form/issues/6): activation, expiry, renewal cancellation and overlapping standalone Premium access without losing history.
- [ ] [#7 — Complete trainee workflows](https://github.com/aalharqan01/form/issues/7): workout, bodyweight, nutrition and coaching communication.
- [ ] [#8 — Complete coach website workflows](https://github.com/aalharqan01/form/issues/8), including exercise selection, direct video uploads and weekly client progress review.
- [ ] [#9 — Optimise and verify the website on iPhone and desktop](https://github.com/aalharqan01/form/issues/9); evaluate the proposed PWA and notification experience.
- [ ] [#10 — Update simulations and demo copy](https://github.com/aalharqan01/form/issues/10) to match immediate purchase and capacity rules; clearly distinguish simulated payments from real transactions.
- [ ] [#12 — Verify the full website-to-app journey](https://github.com/aalharqan01/form/issues/12): discovery → available package → confirmed payment → app coaching/Premium → assigned workout → trainee logs → coach progress review → membership expiry.
- [ ] [#11 — Resolve live billing readiness](https://github.com/aalharqan01/form/issues/11): provider onboarding/settlement and store requirements, payment failures, duplicate notifications, last-slot concurrency and safe reconciliation of payments received after a checkout reservation expires.
