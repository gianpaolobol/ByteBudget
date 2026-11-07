# ByteBudget store demo plan

Goal: deliver the approved fictional-data demo through TestFlight and Google Play internal testing.
Architecture: preserve Capacitor native projects; use the existing Expo account for cloud builds, without rewriting UI. Demo builds bundle an explicit marker so native startup works offline; normal builds remain live-only. No secret in Git.
Authorization: user requested autonomous development and store demos; proceed with routine implementation choices.

- [x] Bundle an explicit demo variant; regress native startup and reject unknown build modes.
- [x] Configure Expo project 31af7833-38c6-4b74-8002-57222b1b03e8, demo build profiles and native version/signing integration.
- [ ] Register Apple app, prepare Google app, build and submit where credentials permit. Pause only for actual legal/security approval or account blockers.
- [ ] Run tests, both builds and Capacitor sync; save source to GitHub and record actual store/build evidence.

Review: no silent fake data in production; demo startup needs no network; finite prices shown; bundle identifiers match stores; no fabricated publication status.
