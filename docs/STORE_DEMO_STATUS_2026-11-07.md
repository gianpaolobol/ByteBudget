# Store demo status — updated 2026-11-08

## Android — available for internal testers

- App4976403458411629633; com.bytebudget.app; release ByteBudget Demo1.0(1), track4699301258049471482, Active / Available for internal testers confirmed.
- Sole enabled owner list: gianpaolo.franceschini@gmail.com. No other app tester lists selected; no invitation emails sent.
- Verified owner opt-in: https://play.google.com/apps/internaltest/4699301258049471482 . Installation/device QA remains user action.
- Existing successful EAS build6e473499-6d72-42f2-80c9-9991f7164c95, source1ae66565ea752d94a5139389ca2d6081840f1955.
- AAB SHA256302efceb6990672a646c40fbe13127d406dd5d55165db95fefc00fff268d3919; CMS, manifest and526 entry digests verified.

## iOS — uploaded and VALID; group assignment unconfirmed

- ASC6832104168, ByteBudget: Eat Your Way; bundle com.bytebudget.app; teamBX9MDXAHKG.
- Existing authorized App Store profileJ9SLRNCRDG, UUID3fb318ca-80c4-404d-b16a-c12df37dd574, expires2027-10-09. Existing distribution certificate reused.
- User specifically authorized saved ASC keyfungoitalia/Q867WLD8JD for ByteBudget. Associated in Expo, upload accepted.
- Build1 icon rejected due alpha. Fixed approved icon to opaque1024px RGB PNG; build2 version1.0.0(2) compiled, uploaded, Apple stateVALID.
- Build2 EAS523b8dc3-6e73-4779-8fde-df88c385ce06; sourcee9a6da34ff518a43304aabfea001626b3cb49bb4; combined workflow01a1b83a-bb6f-7284-9800-382346d2b051.
- Old Fastlane2.220.0 failed distribution on duplicate matching rows for the same version/build. Do not claim TestFlight readiness.
- Internal groupByteBudget Demo, IDcdf92ece-dc93-444f-9170-76fac56510b3, sole verified account holderaranciam@gmail.com; automatic distribution disabled.
- Recovery by immutable ASC build ID committed ascf5d361ec7fd6fc1cbbda68dff042ba464cdc81b, not launched before user changed delivery preference.

## New direction — direct GitHub, no Expo

User requested build and submission directly from GitHub. New workflowStore demo (direct GitHub), Xcode/SPM + Gradle/JDK21 + Fastlane2.240.1; internal releases only. No new EAS run initiated. No production store publication claimed.

Latest GitHub Checks42424214585 blocked before start by payments/spending-limit issue. ByteBudget GitHub repository/environment secrets absent. Direct workflow run42425160090 (source6279294a85aaf785c9e4a15f8401bd4eecfd8127) was dispatched and both jobs were rejected before startup for the same billing/spending-limit reason. It cannot execute until billing and authorized signing/upload secrets are configured. See GITHUB_STORE_DELIVERY.md for exact names. No private keys copied, account access broadened or billing changed.

74 Node tests pass. Explicit demo build and Capacitor sync pass. New workflow not yet compiled or uploaded on native runners. Physical-device QA pending. Venues, prices and reviews are fictional, explicitly labelled; real-data provider unconfigured.
