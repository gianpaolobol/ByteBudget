# ByteBudget — direct GitHub store delivery

Both native compilation and store upload run in GitHub Actions. Expo was used only to recover previously stored Apple signing originals after explicit authorization; no new EAS build or submission is part of this delivery path.

## Verified iOS release

- iOS1.0.0(3), app6832104168, bundlecom.bytebudget.app, teamBX9MDXAHKG.
- Source39c13c1248215d3b7eeca77f571312241df35a61; Checks42498125754 SUCCESS (109tests).
- GitHub run42498229021/job128785112149 SUCCESS: https://github.com/gianpaolobol/ByteBudget/actions/runs/42498229021 .
- IPA exported/signed; Apple upload and processing succeeded; assigned/distributed to existing internal ByteBudget Demo group (1tester). ASC UI independently confirms build3 UUID42b36574-751e-4119-8168-4147cd3a72df.
- Artifact13624646856, ByteBudget-iOS-2-1, retention7days. IPA SHA256bbdd73f9ac86e7c9236e2f0a43ae3daa260fd54ad93cfdb0d20edb505f308397.
- Actual IPA inspection confirms version/build, foreground location usage description, public real-data API origin, no demo-preview startup marker and no Google key in client. Physical-device GPS QA remains pending.

This is internal TestFlight delivery, not production or external beta review. No new tester invitations were sent. Android was skipped; its existing1.0(1) demo has not been replaced.

## How to run

Actions → **Store live beta (direct GitHub)** → Run workflow → main → ios/android/both. Select ios until Android secrets are configured. Only main publishes; runs are serialized. The iOS lane uses canonical Xcode/SPM, macos-15/Xcode26.3, Ruby3.3/Fastlane2.240.1, Node24. Android uses ubuntu-24.04/JDK21/Gradle. Tests, live bundling, Capacitor sync and public backend/native-CORS readiness precede signing/upload. BYTEBUDGET_API_BASE is configured to the existing public ByteBudget Site origin.

Build numbers come from the current store maximum. Keep this workflow the sole publisher to avoid collisions. Signed artifacts are downloadable from Actions within7days; artifact availability does not prove device QA.

## Existing iOS secrets — configured and verified

| Secret | Constraint |
| --- | --- |
| IOS_DISTRIBUTION_P12_BASE64 | Existing Apple Distribution PKCS12 with private key, teamBX9MDXAHKG, serial569DFE74C581A4C72A8127ECC90F4E48 |
| IOS_DISTRIBUTION_P12_PASSWORD | Password for that encrypted PKCS12; cryptographically validated |
| IOS_PROFILE_BASE64 | App Store profile for BX9MDXAHKG.com.bytebudget.app, UUID3fb318ca-80c4-404d-b16a-c12df37dd574, expires2027-10-09 |
| ASC_KEY_P8_BASE64 | Dedicated ByteBudget GitHub keyY58R2Y3BW9, issuer8f57d241-76f9-4226-a912-f2ef24ac1a92, App Manager role |

All values are encrypted GitHub secrets, never source, logs, issues or artifacts. PKCS12 private key/certificate/profile match verified. Runtime Google key is a separate server-only secret. Existing Apple certificates/other keys were not revoked. Reuse the existing credentials for subsequent iOS runs; repeated authorization is not a request to create duplicate keys. Fastlane uses the dedicated public key IDY58R2Y3BW9.

## Android prerequisites — still missing

ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, PLAY_SERVICE_ACCOUNT_JSON. Recover the original ByteBudget upload key used for Android1.0(1); do not generate a substitute. Store release track must remain internal. New delegation/credential transfers need their applicable owner authorization. Do not dispatch a known-to-fail Android build before setup.

## Signing and cleanup

The lane checks exact profile app/team, expiry and App Store distribution; imports the encrypted certificate into a temporary unlocked keychain, then removes installed profile/keychain and temporary signing files. Hosted runners are disposable. Only signed IPA/AAB artifacts are uploaded. Current app declares no nonexempt encryption (platform HTTPS); reassess if app encryption changes.
