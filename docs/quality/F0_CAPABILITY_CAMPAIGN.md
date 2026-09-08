# F0 Trusted Action Capability Campaign V1

F0-B is FINAL LOCKED / DIRECTLY AUDITED at `da3b289c76795e2a33360525c11e1ca4451fcffa`. F0-C is FINAL LOCKED / DIRECTLY AUDITED at `812af23a5737c58b60d76ef533e0574e927d6ed3`; F0-C1 case-state, receipt guard, and next-batch planning remains at `533960348da9ba03e29ed259bcdc689522116116`.

`F0_BOTTLE_BASELINE_CAPABILITY_V1` is the deterministic authority for the canonical `f0-cocoon-turmeric-serum-bottle-v1` bottle fixture. It is limited to `PICK_UP`, `HOLD`, and `ROTATE_SLOW`, each bound to its existing canonical ScenePlan, `GOOGLE_FLOW`, `OMNI_FLASH_1_1`, and the exact benchmark invariants already recorded in the attempt-one cases.

The campaign plans exactly ten independent cases per action (30 total). Attempt one remains the preserved historical case. Attempts two through ten are deterministic plans only: they are not generated videos, observations, verdicts, or capability promotions.

The locked `DEFAULT_CAPABILITY_PROMOTION_POLICY` remains the sole classification policy: a minimum of 10 human-reviewed real-model-video observations, SAFE at pass rate at least 0.90, and RISKY at pass rate at least 0.60. The existing `classifyCapabilityEvidence` authority performs this math; the campaign layer does not reproduce it.

## V1 fast-track decision

The user has selected the provider-neutral `SIMPLE_ACTION_FAST_TRACK_V1` policy for bounded V1 production feasibility. It authorizes exactly `PICK_UP`, `HOLD`, and `ROTATE_SLOW`; it is not empirical evidence and creates no BenchmarkObservation, ActionCapability promotion, or SAFE classification. The production path records `FAST_TRACK_AUTHORIZED` separately from the empirical `UNTESTED` state and still requires canonical single-primary-action R5 START → ACTION → END validation plus existing R6 risk validation. It does not authorize secondary actions, cap removal, dispensing, product-state transformation outside the canonical action, unrelated UNTESTED actions, or AVOID.

F0 is **PAUSED AFTER BATCH 1 FOR V1 FAST-TRACK**. It is not statistically complete: PICK_UP remains 2/10 UNTESTED, HOLD 2/10 UNTESTED, ROTATE_SLOW 1/10 UNTESTED, `campaignReady=false`, and promotions=0. No further F0 batch is required for the V1 critical path unless production evidence later shows a reliability problem.

## Current reviewed state

| Action | Accepted reviewed observations | Minimum remaining | Classification |
| --- | ---: | ---: | --- |
| PICK_UP | 2 | 8 | UNTESTED |
| HOLD | 2 | 8 | UNTESTED |
| ROTATE_SLOW | 1 | 9 | UNTESTED |

The count target to reach the minimum sample size for all three actions is 25 further reviewed attempts. It does not guarantee SAFE: actual human-reviewed PASS/FAIL outcomes still determine the classifier result. Current promotions are 0 and `campaignReady=false`; this baseline requires all three actions to be SAFE, not merely RISKY, before it is ready.

## Trust boundary

Only explicit, human-reviewed `BenchmarkObservation` records can count. Every record must pass `validateBenchmarkObservation`, be `REAL_MODEL_VIDEO`, use the canonical fixture and `BOTTLE` archetype, bind its action to the approved case for that exact action, and have globally unique observation ID, candidate asset ID, and benchmark case ID. Invalid, synthetic, duplicate, malformed, and out-of-campaign records are reported as rejected and never counted.

Rubric-0 remains the only review rubric. Its dimensions are PRODUCT_FIDELITY, HAND_ANATOMY, ACTION_COMPLETION, PHYSICS, CAMERA_REALISM, UNEXPECTED_CUTS, and VISIBLE_ARTIFACTS. There is no weighted or averaged scoring, automatic Gemini review, automatic observation creation, or automatic promotion writeback.

`npm run benchmark:capability:dry` reads only repository campaign and reviewed-evidence data, validates the campaign, and prints the deterministic status. It makes no provider or network calls. Its dry output remains the empirical authority and does not change when the production fast-track policy is used.

## F0-C controlled execution planning

F0-C Controlled Flow Benchmark Execution Planner is FINAL LOCKED / DIRECTLY AUDITED at `812af23a5737c58b60d76ef533e0574e927d6ed3`. It is a deterministic inspection layer, not an execution adapter. F0-D1 retains three `GENERATED_AWAITING_REVIEW` logical receipts in execution history for the reviewed Batch 1 candidates. REVIEWED evidence takes precedence over those receipts, preventing duplicate eligibility. The next controlled batch is planning only:

| Order | Action | Attempt |
| ---: | --- | ---: |
| 1 | PICK_UP | 3 |
| 2 | HOLD | 3 |
| 3 | ROTATE_SLOW | 2 |

The maximum real batch size is 3. `npm run benchmark:execution:dry` compiles and validates one `F0_BENCHMARK_EXECUTION_PACKET_V1` per selected case and prints the selected benchmark case IDs, packet order, plannedGenerations=3, Flow/Gemini/Saydi calls=0, generationsPerformed=0, and `campaignReady=false`. Each packet is bound to the canonical campaign case, Cocoon reference identity/SHA-256/MIME type, and canonical eight-second 9:16 ScenePlan. Its prompt is physical-only and byte-identical across attempts for a given action; it has no speech dependency, voice selection, provider/session data, candidate ID, or attempt identity.

F0-D1 Controlled Flow Benchmark Batch 1 is EMPIRICAL PASS / human Rubric-0 reviewed: PICK_UP attempt 2 PASS, HOLD attempt 2 PASS, and ROTATE_SLOW attempt 1 PASS. These are five total trusted empirical observations with 2 / 2 / 1 accepted counts, all still UNTESTED under the unchanged 10 / 0.90 / 0.60 policy. Total real Flow generations are 5; Batch 1 added three and its exact added credit count is unspecified. It added no Gemini or Saydi calls and no ActionCapability promotions. Future operator sequence only: plan batch → inspect packets/prompts → explicit user authorization → generate at most 3 Flow candidates → record execution receipts → STOP → human Rubric-0 review each candidate → record BenchmarkObservations → derive trusted capability status → decide next batch. A generation never becomes PASS evidence automatically. PRE-F1-LIVE is BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN and F1 is NOT STARTED. Batch 2 requires explicit user authorization and is not authorized by this plan.

F0-D1 verification: `npm run typecheck` PASS; `npm test` PASS (246 tests); `npm run benchmark:capability:dry` PASS; `npm run benchmark:execution:dry` PASS with planning-only PICK_UP attempt 3, HOLD attempt 3, and ROTATE_SLOW attempt 2; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. No Gemini, Flow, or Saydi calls or video generations occurred during the Codex recording task.
