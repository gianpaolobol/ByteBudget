# ByteBudget — direct GitHub store delivery

Both native compilations run in GitHub Actions. iOS is uploaded automatically from that workflow; Android's signed AAB is uploaded to Test interni through the existing authenticated Play Console UI. Expo was used only to recover previously stored signing originals after explicit authorization; no new EAS build or submission is part of this delivery path.

## Verified iOS release

- iOS1.0.0(3), app6832104168, bundlecom.bytebudget.app, teamBX9MDXAHKG.
- Source39c13c1248215d3b7eeca77f571312241df35a61; Checks42498125754 SUCCESS (109tests).
- GitHub run42498229021/job128785112149 SUCCESS: https://github.com/gianpaolobol/ByteBudget/actions/runs/42498229021 .
- IPA exported/signed; Apple upload and processing succeeded; assigned/distributed to existing internal ByteBudget Demo group (1tester). ASC UI independently confirms build3 UUID42b36574-751e-4119-8168-4147cd3a72df.
- Artifact13624646856, ByteBudget-iOS-2-1, retention7days. IPA SHA256bbdd73f9ac86e7c9236e2f0a43ae3daa260fd54ad93cfdb0d20edb505f308397.
- Actual IPA inspection confirms version/build, foreground location usage description, public real-data API origin, no demo-preview startup marker and no Google key in client. Physical-device GPS QA remains pending.

This is internal TestFlight delivery, not production or external beta review. No new tester invitations were sent. Android1.0(2) has now replaced its earlier demo in Test interni; see the Android release below.

## How to run

iOS: Actions → **Store live beta (direct GitHub)** → Run workflow → main → ios. Android: Actions → **Android live beta package (direct GitHub)** → Run workflow → main → version_code greater than every existing Play upload (currently2). Then upload its signed AAB to the existing Test interni track via Play Console. The old Android API-upload lane still requires PLAY_SERVICE_ACCOUNT_JSON and is not configured; do not select android/both there. Only main publishes; runs are serialized. The iOS lane uses canonical Xcode/SPM, macos-15/Xcode26.3, Ruby3.3/Fastlane2.240.1, Node24. Android uses ubuntu-24.04/JDK21/Gradle. Tests, live bundling, Capacitor sync and public backend/native-CORS readiness precede signing/upload. BYTEBUDGET_API_BASE is configured to the existing public ByteBudget Site origin.

The iOS build number comes from the current store maximum; the Android version code is explicitly validated and must be checked against Play before dispatch. Avoid concurrent publishers to prevent collisions. Signed artifacts are downloadable from Actions within7days; artifact availability does not prove device QA.

## Existing iOS secrets — configured and verified

| Secret | Constraint |
| --- | --- |
| IOS_DISTRIBUTION_P12_BASE64 | Existing Apple Distribution PKCS12 with private key, teamBX9MDXAHKG, serial569DFE74C581A4C72A8127ECC90F4E48 |
| IOS_DISTRIBUTION_P12_PASSWORD | Password for that encrypted PKCS12; cryptographically validated |
| IOS_PROFILE_BASE64 | App Store profile for BX9MDXAHKG.com.bytebudget.app, UUID3fb318ca-80c4-404d-b16a-c12df37dd574, expires2027-10-09 |
| ASC_KEY_P8_BASE64 | Dedicated ByteBudget GitHub keyY58R2Y3BW9, issuer8f57d241-76f9-4226-a912-f2ef24ac1a92, App Manager role |

All values are encrypted GitHub secrets, never source, logs, issues or artifacts. PKCS12 private key/certificate/profile match verified. Runtime Google key is a separate server-only secret. Existing Apple certificates/other keys were not revoked. Reuse the existing credentials for subsequent iOS runs; repeated authorization is not a request to create duplicate keys. Fastlane uses the dedicated public key IDY58R2Y3BW9.

## Verified Android release and configured signing

- Android1.0/versionCode2, packagecom.bytebudget.app, API36, existing internal track4699301258049471482.
- Source2f2d1754cb774e45fc2e875599f90b7d284cf2f5; run42522167699/job128857831733 SUCCESS (114tests, build, native CORS, signed AAB, jarsigner and artifact).
- Artifact13633454146, ByteBudget-Android-live-2-3-1, retention7days. AAB SHA25615fb6747a5dcab12b955abca36bd11a5a8a6ad7a3d1a72d85a76be24b836c6b1.
- Original upload JKS and both passwords validated privately; its certificate matches Play. Encrypted repository secrets ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD are configured and must be reused.
- Actual AAB inspection confirms foreground coarse/fine location, no background location, live public backend, no client Maps key and no demo-preview HTML marker.
- Play accepted the upload and independently shows release **ByteBudget1.0(2) — Live location** available to internal testers. No production publication or new tester invitation.
- No new Google publishing identity or Publisher JSON was created; the artifact/UI delivery route does not need one. Missing deobfuscation mapping was the only nonblocking warning; minifyEnabled=false.
- Physical Android GPS/permission QA remains pending.

## Signing and cleanup

The lane checks exact profile app/team, expiry and App Store distribution; imports the encrypted certificate into a temporary unlocked keychain, then removes installed profile/keychain and temporary signing files. Hosted runners are disposable. Only signed IPA/AAB artifacts are uploaded. Current app declares no nonexempt encryption (platform HTTPS); reassess if app encryption changes.
