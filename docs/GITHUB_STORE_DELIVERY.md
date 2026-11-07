# ByteBudget — direct GitHub store delivery

User selected this path on 2026-11-08. Both native compilation and upload run in GitHub Actions, without Expo/EAS commands, tokens, artifacts or services. Existing app identities and UI are preserved.

## How to run

Actions → **Store demo (direct GitHub)** → Run workflow → main → ios/android/both.
Only main can publish. Jobs are serialized across workflow runs; each selected platform builds independently. iOS uses macos-15/Xcode26.3 and canonical ios/App/App.xcodeproj with SPM; Android uses ubuntu-24.04/JDK21/Gradle. Tests, explicit demo packaging and Capacitor sync precede signing. Fastlane2.240.1 delivers to the existing ByteBudget Demo internal TestFlight group or Google Play internal track, never production/external testing. No new tester invitations are created.

Build numbers are allocated above the current store maximum: the current1.0.0 TestFlight train for iOS and the standard internal/alpha/beta/production Google Play tracks for Android. Even a retry of an older workflow reads current store state. Use this workflow as the sole publisher; concurrent outside uploads or custom Google tracks require extending this coordination. Download successful signed artifacts from Actions within7days. They are not proof of physical-device QA.

## Verified blockers

1. Latest Checks run42424214585 (sourcecf5d361ec7fd6fc1cbbda68dff042ba464cdc81b) failed before a runner started: “recent account payments have failed or your spending limit needs to be increased.” Owner must resolve account billing/spending limits or provide a separately configured runner. No billing change made.
2. ByteBudget repository and environments show no Actions secrets. Secret values cannot be recovered from GitHub by reading other repositories. They must be provisioned securely from authorized originals. No signing credentials transferred or replacement keys created in this change.
3. Direct workflow run42425160090 on source6279294a85aaf785c9e4a15f8401bd4eecfd8127 was dispatched for both platforms; both jobs were rejected before startup by that same billing/spending-limit block. Cloud/native execution is pending. Local verification covers Node suite, explicit demo packaging, Capacitor sync and workflow structure, shell syntax and Ruby parsing with tree-sitter; Linux workspace lacks Xcode/Android SDK/Ruby. Fastlane dependency resolution and native runner validation remain pending.

## Required GitHub Actions secrets

| Secret | Value / constraint |
| --- | --- |
| IOS_DISTRIBUTION_P12_BASE64 | Base64 of existing Apple Distribution certificate with private key, for team BX9MDXAHKG; must match provisioning profile |
| IOS_DISTRIBUTION_P12_PASSWORD | Nonempty password protecting that PKCS12 export |
| IOS_PROFILE_BASE64 | Base64 App Store profile for BX9MDXAHKG.com.bytebudget.app, current UUID3fb318ca-80c4-404d-b16a-c12df37dd574 |
| ASC_KEY_P8_BASE64 | Base64 of original .p8 for saved keyQ867WLD8JD; issuer8f57d241-76f9-4226-a912-f2ef24ac1a92 |
| ANDROID_KEYSTORE_BASE64 | Base64 existing ByteBudget Google Play upload keystore; must match upload certificate used by Android1.0(1) |
| ANDROID_KEYSTORE_PASSWORD | Existing keystore password |
| ANDROID_KEY_ALIAS | Existing upload-key alias |
| ANDROID_KEY_PASSWORD | Existing upload-key password |
| PLAY_SERVICE_ACCOUNT_JSON | Original JSON credential for Google Play API service account authorized to release com.bytebudget.app to internal testing |

Store these in Actions secrets through an authorized secure setup, never in source, issues, chat or artifacts. No new Android key should be generated as a substitute: Google would reject updates signed by the wrong key. Creating/granting a Google service account or copying shared Apple credentials to GitHub requires explicit access authorization. The source workflow itself does not create account access.

## Signing and cleanup

Apple profile is checked for exact app/team, expiry and App Store distribution. Certificate imported into a temporary unlocked keychain; the installed profile and keychain are removed in ensure blocks. Temporary signing files are removed when the lane exits. Hosted runners are disposable; forced termination also discards the machine. Android signing passwords are read from environment by Gradle, not appended to shell commands. Only signed IPA/AAB artifacts are uploaded to Actions.

Apple upload declares no nonexempt encryption: current app uses platform HTTPS and no custom encryption. Reassess this if crypto behavior changes. API credentials and signing keys remain distinct: an ASC API key alone cannot sign an iOS binary.

## Existing demos (before migration)

Android1.0(1) already active internally: https://play.google.com/apps/internaltest/4699301258049471482 with owner gianpaolo.franceschini@gmail.com. iOS1.0.0(2) uploaded and processed VALID; assignment to owner-only ByteBudget Demo group for aranciam@gmail.com not yet confirmed. All restaurant/pricing/review datasets remain explicitly fictional.
