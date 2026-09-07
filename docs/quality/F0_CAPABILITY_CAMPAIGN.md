# F0 Trusted Action Capability Campaign V1

F0-B is FINAL LOCKED / DIRECTLY AUDITED at `da3b289c76795e2a33360525c11e1ca4451fcffa`. F0-C1 case-state, receipt guard, and next-batch planning is implemented at `533960348da9ba03e29ed259bcdc689522116116`.

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

## F0-C controlled execution planning

F0-C Controlled Flow Benchmark Execution Planner is PASS / LOCKED locally / awaiting external audit. It is a deterministic inspection layer, not an execution adapter. The current repository has zero execution receipts. Its case-state guard prevents regeneration of a candidate awaiting review and blocks a case with rejected review evidence. The current controlled next batch is:

| Order | Action | Attempt |
| ---: | --- | ---: |
| 1 | PICK_UP | 2 |
| 2 | HOLD | 2 |
| 3 | ROTATE_SLOW | 1 |

The maximum real batch size is 3. `npm run benchmark:execution:dry` compiles and validates one `F0_BENCHMARK_EXECUTION_PACKET_V1` per selected case and prints the selected benchmark case IDs, packet order, plannedGenerations=3, Flow/Gemini/Saydi calls=0, generationsPerformed=0, and `campaignReady=false`. Each packet is bound to the canonical campaign case, Cocoon reference identity/SHA-256/MIME type, and canonical eight-second 9:16 ScenePlan. Its prompt is physical-only and byte-identical across attempts for a given action; it has no speech dependency, voice selection, provider/session data, candidate ID, or attempt identity.

Future operator sequence only: plan batch → inspect packets/prompts → explicit user authorization → generate at most 3 Flow candidates → record execution receipts → STOP → human Rubric-0 review each candidate → record BenchmarkObservations → derive trusted capability status → decide next batch. A generation never becomes PASS evidence automatically. PRE-F1-LIVE is BLOCKED / NOT RUN and F1 is NOT STARTED.
