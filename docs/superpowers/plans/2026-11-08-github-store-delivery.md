# Direct GitHub store delivery implementation plan

Goal: build ByteBudget and send its demo directly from GitHub Actions to TestFlight and Google Play internal testing. No Expo CLI, EAS build, Expo authentication or Expo artifact download in this delivery path.

User selected direct GitHub delivery and delegated implementation. Use existing Capacitor SPM iOS project, Xcode on macOS, Gradle/JDK21 on Linux, Fastlane for store APIs. Keep current demos and UI intact. Manual workflow with platform selection avoids accidental paid builds on every push. Existing EAS files remain historical; do not launch them.

- [x] Add direct workflow and signing/build/upload configuration. Validate required secrets before building; use existing identities, never generate replacement signing keys. Build numbers are allocated above current store maxima, including retries of older workflows. Always clean temporary signing material.
- [x] Validate YAML, shell, tests, demo package, native synchronization and Fastlane syntax where runtime permits. Cloud/native execution remains unverified until Actions billing and secrets are available.
- [x] Update README, continuity and exact store status; push source to GitHub, inspect visible workflow and report concrete blockers.

Review focus: internal-only distribution; same Android upload key; Apple profile/team/bundle match; no secret echo/artifact; rerun build uniqueness. Account billing changes and credential relocation are separate from source implementation.

Observed prerequisite failures: latest Checks run 42424214585 never started due account payments/spending-limit block. GitHub repository and environments have no configured secrets (UI verified). Existing Apple build 1.0.0(2) is VALID, uploaded by prior EAS attempt; TestFlight group assignment not confirmed. Android 1.0(1) is already active internally.

Review: independent reviewer identified decreasing run-derived numbers on stale retries. Replaced allocation with latest_testflight_build_number and maximum standard Play track version codes. Official macos-15 image defaults to Xcode16.4; selected installed Xcode26.3 explicitly for Capacitor8/store SDK requirements. Native/cloud verification remains blocked.

Final evidence: 74/74 Node tests PASS; demo build and native sync PASS; YAML/Bash/Ruby parse PASS. Direct workflow pushed6279294a85aaf785c9e4a15f8401bd4eecfd8127 and dispatched run42425160090: ios/android both rejected before runner startup by account billing/spending limit. No native compile/upload occurred.
