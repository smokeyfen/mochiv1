# F0 Trusted Action Capability Campaign V1

`F0_BOTTLE_BASELINE_CAPABILITY_V1` is the deterministic authority for the canonical `f0-cocoon-turmeric-serum-bottle-v1` bottle fixture. It is limited to `PICK_UP`, `HOLD`, and `ROTATE_SLOW`, each bound to its existing canonical ScenePlan, `GOOGLE_FLOW`, `OMNI_FLASH_1_1`, and the exact benchmark invariants already recorded in the attempt-one cases.

The campaign plans exactly ten independent cases per action (30 total). Attempt one remains the preserved historical case. Attempts two through ten are deterministic plans only: they are not generated videos, observations, verdicts, or capability promotions.

The locked `DEFAULT_CAPABILITY_PROMOTION_POLICY` remains the sole classification policy: a minimum of 10 human-reviewed real-model-video observations, SAFE at pass rate at least 0.90, and RISKY at pass rate at least 0.60. The existing `classifyCapabilityEvidence` authority performs this math; the campaign layer does not reproduce it.

## Current reviewed state

| Action | Accepted reviewed observations | Minimum remaining | Classification |
| --- | ---: | ---: | --- |
| PICK_UP | 1 | 9 | UNTESTED |
| HOLD | 1 | 9 | UNTESTED |
| ROTATE_SLOW | 0 | 10 | UNTESTED |

The count target to reach the minimum sample size for all three actions is 28 further reviewed attempts. It does not guarantee SAFE: actual human-reviewed PASS/FAIL outcomes still determine the classifier result. Current promotions are 0 and `campaignReady=false`; this baseline requires all three actions to be SAFE, not merely RISKY, before it is ready.

## Trust boundary

Only explicit, human-reviewed `BenchmarkObservation` records can count. Every record must pass `validateBenchmarkObservation`, be `REAL_MODEL_VIDEO`, use the canonical fixture and `BOTTLE` archetype, bind its action to the approved case for that exact action, and have globally unique observation ID, candidate asset ID, and benchmark case ID. Invalid, synthetic, duplicate, malformed, and out-of-campaign records are reported as rejected and never counted.

Rubric-0 remains the only review rubric. Its dimensions are PRODUCT_FIDELITY, HAND_ANATOMY, ACTION_COMPLETION, PHYSICS, CAMERA_REALISM, UNEXPECTED_CUTS, and VISIBLE_ARTIFACTS. There is no weighted or averaged scoring, automatic Gemini review, automatic observation creation, or automatic promotion writeback.

`npm run benchmark:capability:dry` reads only repository campaign and reviewed-evidence data, validates the campaign, and prints the deterministic status. It makes no provider or network calls. It does not connect the map to `getCurrentTrustedCapabilityMap()`; PRE-F1-LIVE remains BLOCKED / NOT RUN until this foundation has external audit and sufficient reviewed Flow evidence.
