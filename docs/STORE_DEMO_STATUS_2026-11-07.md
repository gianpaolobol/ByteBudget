# Store demo status — 2026-11-07

## Android — published to internal testing
- Google Play app ID: 4976403458411629633; package com.bytebudget.app; free; English default. User explicitly confirmed developer-policy and US export declarations before creation.
- Release ByteBudget Demo 1.0 (1) published to internal track 4699301258049471482. Play confirms Available for internal testers and Active.
- Owner list enabled: one verified account, gianpaolo.franceschini@gmail.com. No other app tester lists selected; no invitation emails sent.
- Opt-in link verified in signed-in owner browser: https://play.google.com/apps/internaltest/4699301258049471482 shows invitation to test com.bytebudget.app (unreviewed). User can accept it. Temporary unreviewed name is expected before store review.
- EAS build: https://expo.dev/accounts/gianpaolobol/projects/bytebudget/builds/6e473499-6d72-42f2-80c9-9991f7164c95
- Source: 1ae66565ea752d94a5139389ca2d6081840f1955. AAB SHA256 302efceb6990672a646c40fbe13127d406dd5d55165db95fefc00fff268d3919. CMS signature, signed manifest and 526 entry digests verified; explicit demo marker present.

## iOS — signed build succeeded; TestFlight upload pending approval
- ASC app 6832104168, ByteBudget: Eat Your Way; exact ByteBudget name was unavailable.
- Explicit App ID com.bytebudget.app, Apple team BX9MDXAHKG.
- User explicitly confirmed creation and Expo binding of ByteBudget App Store provisioning profile; created J9SLRNCRDG, UUID 3fb318ca-80c4-404d-b16a-c12df37dd574, expires 2027-10-09. Bound to existing distribution certificate in Expo; no private key downloaded or new signing key generated.
- EAS iOS build succeeded: https://expo.dev/accounts/gianpaolobol/projects/bytebudget/builds/0fe76313-ed6d-46af-8aa4-fd0a41684c35
- Workflow 01a1b830-185e-78fe-887f-b059441ae649, source d0ff4d15512b5f51560a71d9c8849e5fd94598c8.
- IPA inspected: com.bytebudget.app, version 1.0.0 (1), Xcode 27.1 / iphoneos27.1 SDK, embedded provisioning profile and signature resources, explicit demo startup marker.
- IPA SHA256 ec00eab025952fb37ebfc4f6db73287d5edb7c872f75e9ff9d34823697dd7ed1.
- No IPA uploaded to App Store Connect yet. Automatic approval review rejected associating saved ASC key named fungoitalia (Key ID Q867WLD8JD) because specific authorization for reusing that credential with ByteBudget was missing. Did not retry or bypass: skipped API-key step and completed build signing only. Saved-key dialog is prepared, radio not selected, Save not clicked. Ask for explicit approval for that key/ByteBudget upload before association and submission; creating another key is not a workaround.

## Validation and remaining work
- 70/70 Node tests pass, including pinned Node24.11; demo/live packaging regression and Capacitor sync pass.
- Native Android and iOS cloud compilation now both pass. Physical-device QA remains pending.
- Demo venues/prices/reviews remain explicitly fictional; no live provider activation.
- Android owner opt-in and device installation remain user actions. Wider tester invitations need a named recipient request.
- After key-specific approval: associate existing key in Expo, add/run an iOS submit-only workflow for the already successful build, wait for App Store processing and verify TestFlight availability before claiming publication.
