# Store demo status — 2026-11-07

## Verified Android deliverable
- EAS build succeeded: https://expo.dev/accounts/gianpaolobol/projects/bytebudget/builds/6e473499-6d72-42f2-80c9-9991f7164c95
- Source commit: 1ae66565ea752d94a5139389ca2d6081840f1955
- Version 1.0 (1), profile demo, Play Store AAB.
- Artifact SHA256: 302efceb6990672a646c40fbe13127d406dd5d55165db95fefc00fff268d3919
- Downloaded archive verified: 526 manifest entry digests, CMS detached signature and signed manifest digest; explicit demo startup marker present.
- Not uploaded to Play. Create-app form is filled, package com.bytebudget.app available, English, free, name ByteBudget. Developer-policy and US export attestations remain unchecked pending specific confirmation.

## iOS
- Apple App ID registered com.bytebudget.app, team BX9MDXAHKG.
- ASC listing 6832104168: ByteBudget: Eat Your Way. Exact name ByteBudget rejected as already used.
- TestFlight contains no builds. Latest cloud job 4a053d8e-f54f-4c11-9a0f-d69aec0985f0 now recognizes the root adapter/scheme, stops because remote signing credentials are not configured.
- Apple portal prepared at final Generate screen: new App Store provisioning profile ByteBudget App Store, explicit app ID, existing account distribution certificate (expires 2027-10-09). Generate has NOT been clicked. This authorizes app signing and needs action-time confirmation before creation/upload to Expo.
- Expo credential wizard prepared at provisioning-profile upload, with existing saved distribution certificate chosen. No private key downloaded or new signing key generated.

## Build corrections and validation
- 70/70 Node tests pass, including using pinned Node 24.11.0.
- Demo/live packaging regression passes, native sync passes.
- Node24/current EAS image pinned after default Node18 rejected JSON import attributes.
- Java21 provisioned on Android EAS worker; successful native build proves the hook.
- Capacitor canonical iOS project remains ios/App/App.xcodeproj. scripts/prepare-eas-ios.mjs derives ios/App.xcodeproj with corrected asset, Info.plist, xcconfig and local SPM paths for EAS scheme discovery. Post-install regenerates the adapter after cap sync. Empty ios/Podfile creates workspace without duplicating SPM dependencies.
- No iOS native compilation/device QA yet. No store publication yet. Restaurant data remains explicitly fictional.

## Next authorized work after specific confirmations
1. Generate/download ByteBudget provisioning profile and upload to Expo's existing certificate binding; rerun only iOS.
2. Complete Google create-app attestations and create app; upload verified AAB to internal test track, inspect any additional signing/terms prompts before accepting.
3. Set up store submission credentials using existing scoped credentials where available; never invent keys or claim uploads without store evidence.
