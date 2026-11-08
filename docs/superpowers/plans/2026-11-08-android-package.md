# Android artifact delivery

Goal: compile a signed live AAB on GitHub using the original Android upload keystore, then upload through the existing authenticated Play Console internal track. No new Google publishing credential or permission is needed for this path.

Task: add a focused manual Android packaging workflow and a Node packaging helper. Consume four existing signing secrets and an explicit version code checked against Play Console before dispatch. Keep the iOS and API-based publisher workflows unchanged. Validate version code1..2100000000, reject noncanonical/missing values, keep signing material in a private temporary directory and remove it on success, Gradle failure or process error. Run Gradle with an argument array and credentials in child environment, never shell command strings. Produce only the signed AAB as an artifact; packaging is not store publication.

Tests: real temp files/permissions/cleanup; fake Gradle process boundary; invalid version input before side effects; successful output, nonzero exit, launch error, missing AAB; missing/malformed signing values. Run tests red then implement, whole suite/build, independent review. Native signed build and Play signature match remain downstream verification gates.

Release preflight: Play currently shows ByteBudget Demo1.0(1) active internally. Verify fresh highest version code before choosing next code. Android key transfer to GitHub needs explicit destination approval; do not dispatch an intentionally failing job before secrets exist.
