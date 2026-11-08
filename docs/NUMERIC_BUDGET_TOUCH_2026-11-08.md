# Numeric budget and gesture correction

Approved correction after installed iOS4 feedback. Google qualitative priceLevel no longer decides a price category. Real numeric range upper endpoints determine categories, with exclusive endpoints handled at the currency's minor unit. Missing, expired and wrong-currency prices cannot enter budget results; no inference from reviews or fictional amounts.

Italy reference budget thresholds: Low<20EUR; Mid20–50EUR inclusive; High>50–120EUR inclusive; Luxury>120EUR. These are explicitly labelled reference budgets, not claimed city statistics. Explicit city configuration overrides; other countries require local numeric calibration, never a global Euro fallback. Sparse international samples can therefore produce no budget-matched result; further coverage needs a reliable local source, not qualitative-to-money guessing.

Both sliders have an88px surface with a9px rail. Near-thumb offset prevents jumps. Pointer capture retains drag after finger drift; horizontal intent leaves vertical scrolling to the browser. Labels move immediately; spending result cards/count/photos and preferences update once on release. Distance remains local until Find/Refresh.

Native layout uses contentInsetnever with explicit safe-area padding and an opaque fixed top mask. Browser measured both88px surfaces and pan-y; keyboard controls work. Real-DOM tests cover deferred cards/observer replacement, unknown exclusion, distance drag and cancellation recovery. No physical iPhone/Android is attached, so physical gesture feel, OS scrolling/cancellation and safe-area appearance remain to be checked on the replacement beta.

No changes to credentials, paid usage, search/photo limits, existing provider attribution or release audiences. Store delivery checkpoint follows in CONTINUITA.md; do not call local fixes delivered before signed replacement binaries finish processing.

## Delivered evidence

Code commit54fd12a80767998a4b0912d960e0161397fd44a2,133tests/build pass; Checks42532688510SUCCESS. Independent review issues (exclusive ranges and stale count) fixed before release. Public Castelletto query confirms actual Trentatre30–40EUR→Mid;4missing-price places excluded. Public Siteversion17/sourceffce1383691227d1b632a22aeb82dcf7eb673e33 succeeded, same audience/envrevision2.

| Channel | Delivered build | GitHub run | Verified evidence |
|---|---|---|---|
| TestFlight internal |1.0.0(5)|42532738172|Signed/exported, Apple processing completed and internal group distribution succeeded in authenticated Fastlane logs. Browser ASC session expired; no independent UI recheck claimed.|
| Google Play Test interni |1.0(4)|42532771926|Signed AAB/jarsigner passed, actual original certificate matches, UI confirms latest4 available to internal testers.|

Actual IPA SHA25659a43765113446e38db693a422df7e06260aa485fe4f3f9e0772763be4207f37; AABSHA25679a5d0ba488225a1627085f34797403c783ba4ff1269421f6779a578657b473b. Both binaries inspected for newnumeric/gesturecode,88px/safeareaCSS,liveorigin/no demomarker. iOScontentInsetnever verified in packagedconfig. No productionrelease/invites/newcredentials. Physical phone QA still pending.
