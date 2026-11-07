# Store demo status — 2026-11-07

## Current outcome
- Android demo 1.0 (1) is published in Google Play internal testing. Owner-only access was verified at https://play.google.com/apps/internaltest/4699301258049471482. Google shows the expected temporary name com.bytebudget.app (unreviewed).
- iOS build 1.0.0 (1) compiled/signed, but Apple rejected upload because the 1024px icon contained an alpha channel. Fixed by rendering the approved SVG into opaque RGB PNG; regression test now checks dimensions and PNG color type. Build number bumped to 2; source e9a6da34ff518a43304aabfea001626b3cb49bb4 includes a combined build/TestFlight workflow. Build 2 release is being started; do not claim iOS available until processing and group assignment pass.
- User confirmed both Apple profile/Expo binding and Google policy/export attestations, then explicitly authorized saved ASC key fungoitalia (Q867WLD8JD) for ByteBudget after automatic approval review had rejected its unapproved reuse. Reuse now completed in Expo. Do NOT ask for that approval again. No new private key generated or downloaded.

## Identifiers and distribution
- Google app ID 4976403458411629633; package com.bytebudget.app; internal track 4699301258049471482.
- Google owner list contains only gianpaolo.franceschini@gmail.com; other apps' tester lists were not selected.
- Apple app ID 6832104168; listing ByteBudget: Eat Your Way (exact ByteBudget was unavailable); team BX9MDXAHKG.
- Apple profile ByteBudget App Store: portal ID J9SLRNCRDG, UUID 3fb318ca-80c4-404d-b16a-c12df37dd574; expires 2027-10-09. Existing distribution certificate used in Expo.
- TestFlight internal group ByteBudget Demo: cdf92ece-dc93-444f-9170-76fac56510b3. Sole tester is verified account holder aranciam@gmail.com. Automatic distribution disabled; release workflow explicitly assigns the build.
- Expo project 31af7833-38c6-4b74-8002-57222b1b03e8, gianpaolobol/bytebudget; connected private GitHub repository.

## Verified artifacts and history
- Android EAS build 6e473499-6d72-42f2-80c9-9991f7164c95 succeeded. AAB SHA256 302efceb6990672a646c40fbe13127d406dd5d55165db95fefc00fff268d3919; CMS signature, manifest digest and 526 entry digests verified; explicit demo startup marker present.
- iOS build 0fe76313-ed6d-46af-8aa4-fd0a41684c35 succeeded from d0ff4d15512b5f51560a71d9c8849e5fd94598c8. Version 1.0.0(1), Xcode 27.1 / iphoneos27.1 SDK, correct identifier, embedded profile and signature resources, explicit demo marker. IPA SHA256 ec00eab025952fb37ebfc4f6db73287d5edb7c872f75e9ff9d34823697dd7ed1. Not usable for store submission due icon alpha.
- Submission workflow 01a1b835-09b4-7bc4-ae68-46c210b030e4 from 0f422c26a6a55d53ebe349b6bd0e4bda873b9d03 reached Apple and failed validation for that icon.

## Validation and next work
- 71/71 Node tests pass; icon regression observed RED (color type6) then GREEN (color type2). Both native compilers passed before icon correction. Physical-device QA remains pending.
- Demo data stays explicitly fictional; no live restaurant provider enabled.
- Run .eas/workflows/ios-demo-release.yml: build demo then TestFlight job uses saved authorized key, profile demo and existing ByteBudget Demo group. Verify App Store processing and final testing status. Handle any further factual compliance fields accurately.
- Wider tester invitations require a named recipient request. Android owner can accept the existing opt-in link.
