# MOCHI V1.2 Scene Output Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved MOCHI V1.2 scene-output architecture as a complete side-by-side path without changing or partially mixing the working V1 authority.

**Architecture:** Add versioned V1.2 contracts and modules beside V1, preserve R1/R2 and the four persisted L1→L4 macro layers, and cut over only after a lossless four-card pre-Flow audit passes. L4 remains deterministic with zero IntelligenceProvider and zero generation calls; Flow remains the only video generator behind the provider edge.

**Tech Stack:** TypeScript strict mode, Node.js 22+, npm workspaces, `node:test`, provider-neutral Core/Reasoning contracts, canonical JSON content-addressed persistence, React browser surface.

**Spec:** `docs/superpowers/specs/2026-09-10-mochi-v1-2-scene-output-architecture-design.md`

## Global Constraints

- Preserve R1 Product Evidence and R2 Product Truth behavior and factual authority.
- Keep V1 working until the complete V1.2 cutover gate passes.
- Never produce a half-V1/half-V1.2 `READY_FOR_FLOW` authority.
- Preserve exactly four persisted macro layers in `L1 → L2 → L3 → L4` order.
- Every V1.2 output has exactly four ordered 8-second, 9:16, `SMARTPHONE_POV` scenes: `HOOK`, `FEATURE`, `PROOF`, `CTA`.
- Reviewer face is forbidden; every scene uses `TWO_BEAT_ACTION_SEQUENCE_V1_2` with exactly two ordered Semantic Pairs and exactly two sequential Primary Actions.
- Action A targets the first ~4 seconds, Action B targets the last ~4 seconds, their handoff occurs between 3.5s and 4.5s, and total scene duration remains exactly 8 seconds.
- State authority is `START → Action A → MID → Action B → END`; Action B consumes the exact valid `MID` produced by Action A, and adjacent scene state remains continuous where applicable.
- Every individual Action Definition has exactly one bounded semantic goal. No third Primary Action, hidden reset, teleportation, or state-hiding cut is permitted.
- Empirical capability and production authorization are separate: `UNTESTED` is never promoted without evidence, while `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` is available only after every bounded action and pair gate passes. `AVOID` and unsupported affordances remain blocked.
- Flow is the only video generator; Core remains provider-neutral.
- Preserve the existing logical voice identities and provider-edge Flow mappings unchanged.
- L4 has zero `IntelligenceProvider` calls and zero generation calls.
- Pair 1 maps exactly to Action Beat A, Dialogue Sentence 1, and Key Point 1; Pair 2 maps to Action Beat B, Dialogue Sentence 2, and Key Point 2.
- Scene 1 Sentence 1 contains the exact Product Name; Scene 1 Key Point 1 equals it exactly; the other seven Key Points target 5–7 Vietnamese spoken words.
- Camera/Focus, Human Realism, and SFX are per beat. Prefer one continuous ordinary smartphone-style take with a natural transition. BGM is `NONE`; VFX is `NONE`; per-beat SFX is physically grounded or `NONE`.
- QC, Final Acceptance, and Delivery remain fail-closed.
- Do not call Gemini, Flow, Saydi, or any live provider during Tasks 1–11.
- Every task is an independent review gate. Stop after its verification and commit; do not combine gates.

## Planned file structure

Create focused V1.2 modules rather than expanding the existing V1 monoliths:

- `packages/contracts/src/v1-2.ts`: shared V1.2 types, exact-shape validators, version constants, Scene Execution Contract V2.
- `packages/reasoning/src/v1-2/plannable-truth.ts`: Plannable Truth Gate.
- `packages/reasoning/src/v1-2/insight-bank.ts`: grounded insight compilation/ranking.
- `packages/reasoning/src/v1-2/affordance-profile.ts`: Product Truth-backed affordance derivation.
- `packages/reasoning/src/v1-2/seeded-selection.ts`: deterministic weighted constrained selection and seed namespaces.
- `packages/reasoning/src/v1-2/action-library.ts`: expanded single-goal action definitions and per-action eligibility.
- `packages/reasoning/src/v1-2/action-sequence.ts`: two-action sequence compatibility and `TWO_BEAT_ACTION_SEQUENCE_V1_2` assembly.
- `packages/reasoning/src/v1-2/state-v2.ts`: physical plus bounded functional `START/MID/END` state resolution.
- `packages/reasoning/src/v1-2/camera-focus.ts`: four-scene global composition.
- `packages/reasoning/src/v1-2/human-realism-v2.ts`: lossless one/two-hand realism plan.
- `packages/reasoning/src/v1-2/dialogue-v2.ts`: exactly-two-sentence Vietnamese dialogue.
- `packages/reasoning/src/v1-2/key-points-v2.ts`: dialogue-derived eight Key Points.
- `packages/reasoning/src/v1-2/sfx-plan-v2.ts`: grounded SFX plan.
- `packages/reasoning/src/v1-2/production-v1-2.ts`: deterministic R8 V1.2 compilation.
- `packages/reasoning/src/v1-2/layer-contracts-v1-2.ts`: V1.2 L1/L2/L3/L4 persisted artifacts.
- `apps/server/src/v1-2/`: version-specific stores, orchestration, HTTP composition, and pre-Flow gate.
- `packages/providers/src/flow-scene-prompt-v2.ts`: lossless provider-edge prompt compiler.
- `packages/providers/src/flow-production-v2.ts`: V1.2 Flow request preparation only.
- `apps/web/src/v1-2/`: strict V1.2 client decoders and Scene Card presentation.

Existing barrel exports may be modified only to export completed versioned modules. Do not rename or remove V1 exports.

---

### Task 1: V1.2 contract namespace

**Review gate:** A complete provider-neutral namespace exists; V1 accepts only V1 and V1.2 accepts only V1.2.

**Files:**

- Create: `packages/contracts/src/v1-2.ts`
- Create: `packages/contracts/src/v1-2.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**

- Produce version constants `PRODUCT_FOUNDATION_V1_2`, `SCENE_BLUEPRINT_V1_2`, `FINALIZED_SCRIPT_V1_2`, `PRODUCTION_COMPILED_V1_2`, `PRODUCTION_READY_V1_2`, `TWO_BEAT_ACTION_SEQUENCE_V1_2`, `STATE_ENGINE_V2`, `HUMAN_REALISM_V2`, `SFX_PLAN_V2`, and `SCENE_EXECUTION_CONTRACT_V2`.
- Produce strict types for reference purpose, commercial score, Semantic Pair, seeded decision trace, two sequential Primary Actions, sequence compatibility, physical/functional `START/MID/END` state, action timing/handoff evidence, per-beat camera/focus, two-sentence dialogue, dialogue-derived Key Points, per-beat Human Realism/SFX, effects, and execution lineage.
- Produce `validateSceneExecutionContractV2(value: unknown): readonly string[]` plus exact-shape validators for every shared V1.2 type.
- Produce shared `ActionCapabilityMapV1_2`, `ProductionEligibilityPolicyV1_2`, `ProductionContractV1_2`, `ProductionSnapshotV1_2`, `SceneAnchorV2`, and `FourSceneExecutionSetV2` types so expanded actions are versioned and providers never import reasoning-owned types.
- Define `PRODUCTION_ELIGIBILITY_POLICY_V1_2` to keep empirical capability separate from production authorization, default every newly represented action to `UNTESTED`, never promote `UNTESTED` to `SAFE`, block `AVOID` and unsupported affordances, and permit `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` only after every bounded per-action and pair gate passes. Define `MAX_SCENE_REPLAN_ATTEMPTS_V1_2 = 2`.
- Produce `auditFourSceneExecutionSetV2(value: unknown): FourSceneAuditResultV1_2`, the reusable pure all-or-nothing structural audit used by L4, the browser, and the final server pre-Flow gate.

- [ ] **Step 1: Write failing namespace and invariant tests**

Add tests that construct four valid scene contracts, then independently mutate version, scene count/order, duration, aspect ratio, camera family, reviewer-face rule, action-sequence contract name, Primary Action count (one or three), action order, `START/MID/END`, Action A output/Action B input equality, 3.5s–4.5s handoff, dialogue sentence count, Pair↔Beat↔Sentence↔Key Point mapping, Key Point count, Scene 1 Product Name fields, per-beat Camera/Focus, Human Realism, SFX, BGM/VFX, seed, and provider-only fields. Assert each mutation fails. The four-scene audit must also reject mixed source/seed/version lineage, broken adjacent physical or functional state, hidden reset/state-hiding cut, reference-variant mutation, and missing useful camera diversity.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -w @mochi/contracts`
Expected: FAIL because the V1.2 namespace is not exported.

- [ ] **Step 3: Implement the minimal versioned types and validators**

Keep provider identifiers structurally absent. Use exact key lists as the current contracts do. Encode `dialogueSentences` and `keyPoints` as two-element tuples and scene collections as four-element tuples; validate values at runtime rather than relying only on TypeScript.

```ts
export const SCENE_EXECUTION_CONTRACT_V2 = 'SCENE_EXECUTION_CONTRACT_V2' as const;
export function validateSceneExecutionContractV2(value: unknown): readonly string[];
export function auditFourSceneExecutionSetV2(value: unknown): FourSceneAuditResultV1_2;
```

- [ ] **Step 4: Prove cross-version rejection and V1 preservation**

Run: `npm test -w @mochi/contracts`
Expected: PASS, including existing V1 contract and SceneAnchor tests.

- [ ] **Step 5: Commit Gate 1**

```bash
git add packages/contracts/src/v1-2.ts packages/contracts/src/v1-2.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add MOCHI V1.2 namespace"
```

### Task 2: Plannable Truth + Insight Bank + Affordance Profile

**Review gate:** L1-derived planning material is fully traceable to unchanged R1/R2 authority and fails closed when grounding is insufficient.

**Files:**

- Create: `packages/reasoning/src/v1-2/plannable-truth.ts`
- Create: `packages/reasoning/src/v1-2-plannable-truth.test.ts`
- Create: `packages/reasoning/src/v1-2/insight-bank.ts`
- Create: `packages/reasoning/src/v1-2-insight-bank.test.ts`
- Create: `packages/reasoning/src/v1-2/affordance-profile.ts`
- Create: `packages/reasoning/src/v1-2-affordance-profile.test.ts`
- Create: `packages/reasoning/src/v1-2/reference-purpose.ts`
- Create: `packages/reasoning/src/v1-2-reference-purpose.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Produce `assessReferencePurposesV1_2(context, fingerprints, media, intelligence): Promise<ReferencePurposesV1_2>` as an enum-only provider-neutral assessment plus deterministic compiler. `fingerprints` comes from the trusted R1 receipt/L1 composition boundary and contains exact ordered asset ID/MIME/SHA-256 values.
- Produce `evaluatePlannableTruthV1_2(context, referencePurposes): PlannableTruthResultV1_2`.
- Produce `compileProductInsightBankV1_2(context): ProductInsightBankV1_2` and `rankProductInsightsV1_2(bank): readonly RankedProductInsightV1_2[]`.
- Produce `compileProductAffordanceProfileV1_2(context, referencePurposes): ProductAffordanceProfileV1_2`.
- Every insight/affordance consumes only exact Product Truth IDs/text and validated reference assessment; none accepts Creative Direction or media bytes.

- [ ] **Step 1: Write failing grounding tests**

Cover exact Product Name, five bounded commercial rank dimensions, the fixed 35/25/20/10/10 integer weighted utility, descending `utilityScore` ranking, stable-`insightId` final tie-breaking, exactly-once enum-only reference assessment, canonical identity versus supporting reference purpose, contradictory/unknown variant rejection, missing/duplicate media rejection, wrong bytes, wrong MIME, reordered fingerprints/media, stale receipt binding, logical-ID relabeling before intelligence, functional affordance truth bindings, absent-affordance exclusion, and zero model-authored factual prose.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because the compilers do not exist.

- [ ] **Step 3: Implement deterministic compilers and fail-closed gate**

Reuse `R2CommittedProductContext` and existing R2 validators. Model judgments may supply bounded integer component scores in `0..100`, but cannot author or strengthen facts. Compute the deterministic integer utility in `0..10000` as `purchaseTrigger * 35 + productAppeal * 25 + visualDemonstrability * 20 + relevanceUsefulness * 10 + distinctiveness * 10`. Rank primarily by `utilityScore` descending and use stable `insightId` as the deterministic final tie-breaker. Do not use lexicographic dimension priority as ranking authority.

```ts
export function evaluatePlannableTruthV1_2(context: R2CommittedProductContext, purposes: ReferencePurposesV1_2): PlannableTruthResultV1_2;
export function assessReferencePurposesV1_2(context: R2CommittedProductContext, fingerprints: readonly ReferenceContentFingerprintV1_2[], media: readonly IntelligenceMediaInput[], intelligence: IntelligenceProvider): Promise<ReferencePurposesV1_2>;
export function compileProductInsightBankV1_2(context: R2CommittedProductContext): ProductInsightBankV1_2;
export function compileProductAffordanceProfileV1_2(context: R2CommittedProductContext, purposes: ReferencePurposesV1_2): ProductAffordanceProfileV1_2;
```

- [ ] **Step 4: Verify R1/R2 are unchanged**

Run: `npm test -w @mochi/evidence && npm test -w @mochi/reasoning`
Expected: PASS with all existing truth/reference/commit tests unchanged.

- [ ] **Step 5: Commit Gate 2**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-plannable-truth.test.ts packages/reasoning/src/v1-2-insight-bank.test.ts packages/reasoning/src/v1-2-affordance-profile.test.ts packages/reasoning/src/v1-2-reference-purpose.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add V1.2 plannable product foundation"
```

### Task 3: Seeded insight allocation + Hook/CTA diversity

**Review gate:** The same seed replays byte-identical decisions; deliberate regeneration changes the seed; retries preserve it.

**Files:**

- Create: `packages/reasoning/src/v1-2/seeded-selection.ts`
- Create: `packages/reasoning/src/v1-2-seeded-selection.test.ts`
- Create: `packages/reasoning/src/v1-2/scene-strategy.ts`
- Create: `packages/reasoning/src/v1-2-scene-strategy.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Produce `deriveSeededDecisionV1_2<T>(input: SeededSelectionInputV1_2<T>): SeededSelectionResultV1_2<T>`.
- Produce `allocateSceneInsightsV1_2(bank, creativeSeed): SceneInsightAllocationV1_2`.
- Produce `composeSemanticPairsV1_2(allocation, context): FourSceneSemanticPairsV1_2` after allocation and before dialogue.
- Produce `selectHookApproachV1_2(...)` and `selectCtaApproachV1_2(...)` from versioned approach catalogs.
- Persist namespace, ordered candidates, integer weights, selected ID, and `creativeSeed` for every decision.

- [ ] **Step 1: Write failing reproducibility and constraint tests**

Test same-seed replay, different-seed diversity across a fixed seed table, zero/negative weight rejection, deterministic candidate ordering, no duplicate insight where distinct eligible insights exist, and multiple reachable Hook/CTA approaches without snapshotting one mandatory template. Test exactly two ordered grounded Semantic Pairs per scene, Scene 1 Pair 1 exact Product Name binding, pair distinctness where possible, and no fact not present in R2.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because no V1.2 seeded selector exists.

- [ ] **Step 3: Implement integer weighted constrained selection**

Use a repository-owned deterministic PRNG/hash derivation; do not use `Math.random()`, time, process state, provider output order, or platform-dependent floating-point sampling.

```ts
export function deriveSeededDecisionV1_2<T>(input: SeededSelectionInputV1_2<T>): SeededSelectionResultV1_2<T>;
export function allocateSceneInsightsV1_2(bank: ProductInsightBankV1_2, creativeSeed: string): SceneInsightAllocationV1_2;
export function composeSemanticPairsV1_2(allocation: SceneInsightAllocationV1_2, context: R2CommittedProductContext): FourSceneSemanticPairsV1_2;
```

- [ ] **Step 4: Verify deterministic replay**

Run the focused test twice and compare results; then run `npm test -w @mochi/reasoning`.
Expected: both focused runs and the complete reasoning suite PASS.

- [ ] **Step 5: Commit Gate 3**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-seeded-selection.test.ts packages/reasoning/src/v1-2-scene-strategy.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add seeded V1.2 scene strategy"
```

### Task 4: Expanded Action Library + two-action compatibility + State/Risk V2 + bounded authorization/replan

**Review gate:** The expanded Action Library, two-action sequence compatibility, State Engine V2 `START/MID/END`, `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED`, Scene Risk V2, and bounded replan form one fail-closed Gate 4 authority.

**Files:**

- Create: `packages/reasoning/src/v1-2/action-library.ts`
- Create: `packages/reasoning/src/v1-2-action-library.test.ts`
- Create: `packages/reasoning/src/v1-2/action-sequence.ts`
- Create: `packages/reasoning/src/v1-2-action-sequence.test.ts`
- Create: `packages/reasoning/src/v1-2/state-v2.ts`
- Create: `packages/reasoning/src/v1-2-state-v2.test.ts`
- Create: `packages/reasoning/src/v1-2/action-eligibility.ts`
- Create: `packages/reasoning/src/v1-2-action-eligibility.test.ts`
- Create: `packages/reasoning/src/v1-2/scene-risk-v2.ts`
- Create: `packages/reasoning/src/v1-2-scene-risk-v2.test.ts`
- Create: `packages/reasoning/src/v1-2/replan-v1-2.ts`
- Create: `packages/reasoning/src/v1-2-replan-v1-2.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Define stable V1.2 action IDs for open, close, remove/replace cap, press, switch, pour, dispense, apply, assemble, and bounded simple presentation actions.
- Produce `getEligiblePrimaryActionsV1_2(profile, state, capability, policy): readonly EligiblePrimaryActionV1_2[]` using the versioned capability map, initialized `UNTESTED` for every V1.2 action, and a production-authorization result separate from empirical capability.
- Produce `selectPrimaryActionSequenceV1_2(eligible, creativeSeed, sceneNamespace): SeededSelectionResultV1_2<TwoBeatActionSequenceV1_2>` using the Gate 3 weighted selector only after per-action eligibility and ordered-pair compatibility.
- Produce `validateActionSequenceCompatibilityV1_2(actionA, actionB, start): ActionSequenceCompatibilityResultV1_2`, proving Action B consumes the exact valid `MID` produced by Action A and the pair has no hidden reset, teleportation, state-hiding cut, or third Primary Action.
- Produce `resolveSceneStatesV2(plan): StateResolved4ScenePlanV2`.
- Produce `evaluateSceneRiskV2(statePlan, capability, policy): SceneRisk4ScenePlanV2` and bounded `targetedReplanV1_2(...)` for the expanded types, using `MAX_SCENE_REPLAN_ATTEMPTS_V1_2 = 2`.
- Encode each individual action's one bounded semantic goal, hand-count rule, affordance requirements, preconditions, deterministic effects, timing eligibility, per-beat camera/Human Realism/SFX eligibility, and permissible grounded sound events.

- [ ] **Step 1: Write failing action-table and state-transition tests**

Use table-driven tests for every individual action and ordered pair. Assert functional actions fail without matching Product Truth-backed affordances; two hands fail unless supported/required; every scene has exactly Action A and Action B and no third action; state resolves as `START → Action A → MID → Action B → END`; Action B rejects any stale or altered `MID`; every adjacent `END N === START N+1`; hidden reset/refill/reassembly/teleportation/state-hiding cut/variant change fails. Assert each action independently fails on truth, affordance, state, hand, timing, camera, Human Realism, or risk ineligibility, and the pair fails on sequence incompatibility. Assert `UNTESTED` remains empirically `UNTESTED` but can receive only the separate `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` result after every bounded gate passes; `AVOID` and unsupported affordances always fail. Assert risk precedence is deterministic, replan selects only grounded pairs capable of authorization, seed and locked fields survive, state/risk recompute after each attempt, and the bounded attempt limit cannot loop.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because the library and engine do not exist.

- [ ] **Step 3: Implement the declarative library, eligibility pipeline, and pure resolver**

Keep V1 `ActionId`, `ACTION_SEMANTICS`, `resolveSceneStates`, capability evidence, and fast-track behavior unchanged. New V1.2 eligibility must not interpret “broad support” or bounded production authorization as `SAFE`. Actual newly represented actions remain empirically `UNTESTED` until trusted evidence satisfies the locked promotion policy. The separate V1.2 production policy may authorize only a fully bounded two-beat pair as `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED`; it never changes the capability map.

```ts
export function getEligiblePrimaryActionsV1_2(profile: ProductAffordanceProfileV1_2, state: FunctionalPhysicalStateV2, capability: ActionCapabilityMapV1_2, policy: ProductionEligibilityPolicyV1_2): readonly EligiblePrimaryActionV1_2[];
export function validateActionSequenceCompatibilityV1_2(actionA: EligiblePrimaryActionV1_2, actionB: EligiblePrimaryActionV1_2, start: FunctionalPhysicalStateV2): ActionSequenceCompatibilityResultV1_2;
export function selectPrimaryActionSequenceV1_2(eligible: readonly EligiblePrimaryActionV1_2[], creativeSeed: string, sceneNamespace: string): SeededSelectionResultV1_2<TwoBeatActionSequenceV1_2>;
export function resolveSceneStatesV2(plan: Global4ScenePlanV1_2): StateResolved4ScenePlanV2;
export function evaluateSceneRiskV2(statePlan: StateResolved4ScenePlanV2, capability: ActionCapabilityMapV1_2, policy: ProductionEligibilityPolicyV1_2): SceneRisk4ScenePlanV2;
export function targetedReplanV1_2(input: ReplanInputV1_2): Promise<ReplanResultV1_2>;
```

- [ ] **Step 4: Verify old and new engines independently**

Run: `npm test -w @mochi/core && npm test -w @mochi/reasoning`
Expected: PASS; existing V1 state/risk tests still prove the legacy spine, while V1.2 tests prove expanded behavior.

- [ ] **Step 5: Commit Gate 4**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-action-library.test.ts packages/reasoning/src/v1-2-action-sequence.test.ts packages/reasoning/src/v1-2-state-v2.test.ts packages/reasoning/src/v1-2-action-eligibility.test.ts packages/reasoning/src/v1-2-scene-risk-v2.test.ts packages/reasoning/src/v1-2-replan-v1-2.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add V1.2 action and state engine"
```

### Task 5: Global Camera/Focus + Human Realism V2

**Review gate:** Four-scene composition is usefully diverse and realistic, each scene has Camera/Focus A + B and Human Realism A + B, and every per-beat field is retained for downstream compilation.

**Files:**

- Create: `packages/reasoning/src/v1-2/camera-focus.ts`
- Create: `packages/reasoning/src/v1-2-camera-focus.test.ts`
- Create: `packages/reasoning/src/v1-2/human-realism-v2.ts`
- Create: `packages/reasoning/src/v1-2-human-realism-v2.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Produce `composeGlobalCameraFocusV1_2(plan, statePlan, creativeSeed): GlobalCameraFocusPlanV1_2` with Camera/Focus A for Beat A and Camera/Focus B for Beat B.
- Produce `planHumanRealismV2(input, intelligence): Promise<HumanRealism4ScenePlanV2>` with Human Realism A and Human Realism B limited to behavior fields and deterministically bound to their corresponding action, `START/MID/END` transition, timing, and camera composition.
- Diversity proof covers distance, angle, focus target, and behavior across all four scenes.
- Prefer one continuous ordinary smartphone-style take with a natural transition between beats; reject a state-hiding cut.

- [ ] **Step 1: Write failing global-composition tests**

Assert composition considers role + insight + Action A + Action B + `START/MID/END`; validates per-beat action visibility and the 3.5s–4.5s handoff; and rejects cinematic orbit/drone/gimbal, obscured actions, state-hiding cuts, redundant four-scene composition, face visibility, undeclared second hands, impossible grip, altered `MID`, and state mutation. Include one-hand and valid two-hand fixtures.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement global composition and versioned realism**

Keep ordinary subtle handheld behavior and prefer one continuous take. Bind every generated realism string to its scene/beat/action/state/timing/composition and reject missing, extra, stale, cross-beat, or summarized behavior fields.

```ts
export function composeGlobalCameraFocusV1_2(plan: Global4ScenePlanV1_2, statePlan: StateResolved4ScenePlanV2, creativeSeed: string): GlobalCameraFocusPlanV1_2;
export function planHumanRealismV2(input: HumanRealismInputV2, intelligence: IntelligenceProvider): Promise<HumanRealism4ScenePlanV2>;
```

- [ ] **Step 4: Verify realism isolation**

Run: `npm test -w @mochi/reasoning`
Expected: PASS, including unchanged R7-A V1 tests.

- [ ] **Step 5: Commit Gate 5**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-camera-focus.test.ts packages/reasoning/src/v1-2-human-realism-v2.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add V1.2 camera and realism planning"
```

### Task 6: Exactly-two-sentence Dialogue + dialogue-derived Key Points + timing

**Review gate:** Every scene has exactly two timed Vietnamese sentences and exactly two later-derived Key Points with exact Pair↔Beat↔Sentence↔Key Point synchronization.

**Files:**

- Create: `packages/reasoning/src/v1-2/dialogue-v2.ts`
- Create: `packages/reasoning/src/v1-2-dialogue-v2.test.ts`
- Create: `packages/reasoning/src/v1-2/key-points-v2.ts`
- Create: `packages/reasoning/src/v1-2-key-points-v2.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Produce `finalizeDialogueV2(input, profile, intelligence): Promise<DialoguePlanV2>` with sentence-level timing evidence bound to Beat A and Beat B plus exact eight-second scene timing evidence.
- Produce `deriveKeyPointsV2(dialoguePlan, context): KeyPointsPlanV2` only after dialogue validation.
- Sentence 1 maps Pair 1 and Action Beat A; sentence 2 maps Pair 2 and Action Beat B. Scene 1 sentence 1 contains the exact Product Name.
- Key Point 1.1 equals Product Name exactly; the other seven are one-idea Vietnamese strings targeting 5–7 spoken words.

- [ ] **Step 1: Write failing ordering, semantic, and timing tests**

Reject one or three sentences, wrong language, swapped Pair↔Beat↔Sentence mapping, sentence content or timing evidence not synchronized to its action beat, missing/altered Scene 1 Product Name, Key Points created from unvalidated/stale dialogue, swapped Sentence↔Key Point binding, new facts in Key Points, wrong eight-point count, and non-name secondary points outside the 5–7-word target.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because V2 dialogue and derivation do not exist.

- [ ] **Step 3: Implement dialogue-first compilation and deterministic derivation**

Reuse existing Vietnamese spoken-unit normalization and unchanged voice identities. Make dialogue validation a hard predecessor to Key Point derivation; never feed Key Points forward to author dialogue in V1.2.

```ts
export function finalizeDialogueV2(input: DialogueInputV2, profile: VoiceTimingProfile, intelligence: IntelligenceProvider): Promise<DialoguePlanV2>;
export function deriveKeyPointsV2(dialoguePlan: DialoguePlanV2, context: R2CommittedProductContext): KeyPointsPlanV2;
```

- [ ] **Step 4: Verify timing and V1 voice preservation**

Run: `npm test -w @mochi/core && npm test -w @mochi/reasoning && npm test -w @mochi/providers`
Expected: PASS with existing voice bindings unchanged.

- [ ] **Step 5: Commit Gate 6**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-dialogue-v2.test.ts packages/reasoning/src/v1-2-key-points-v2.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add V1.2 dialogue and key points"
```

### Task 7: SFX Plan V2

**Review gate:** Beat A has SFX A and Beat B has SFX B; each is physically justified by its corresponding Primary Action or canonically `NONE`, while BGM/VFX cannot change.

**Files:**

- Create: `packages/reasoning/src/v1-2/sfx-plan-v2.ts`
- Create: `packages/reasoning/src/v1-2-sfx-plan-v2.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- Produce `compileSfxPlanV2(sequence, affordances, state): SfxPlanV2`.
- Each SFX A event binds only to Action A and `START → MID`; each SFX B event binds only to Action B and `MID → END`. Every event has a stable kind, action phase, visible physical cause, and restrained intensity; a beat returns `NONE` when physical justification is absent.

- [ ] **Step 1: Write failing grounded-sound tests**

Cover click for a grounded switch/closure, press sound only for a supported actuator, pour/dispense sound only with supported content state, independent `NONE` for either silent beat, and rejection of cross-beat causes, music, voice replacement, cinematic whoosh, unsupported off-screen sound, BGM other than `NONE`, or VFX other than `NONE`.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning`
Expected: FAIL because the compiler does not exist.

- [ ] **Step 3: Implement the pure SFX compiler**

Derive SFX A only from Action A, its matched affordance, and `START → MID`; derive SFX B only from Action B, its matched affordance, and `MID → END`. Do not call intelligence or accept free-form sound design.

```ts
export function compileSfxPlanV2(sequence: TwoBeatActionSequenceV1_2, affordances: TwoBeatAffordanceBindingsV1_2, state: ResolvedSceneStateV2): SfxPlanV2;
```

- [ ] **Step 4: Verify effects policy**

Run: `npm test -w @mochi/reasoning && npm test -w @mochi/contracts`
Expected: PASS; V1 `EffectsV1` remains fixed to `NONE/NONE` and V1.2 validates SFX V2 plus `bgm: NONE`, `vfx: NONE`.

- [ ] **Step 5: Commit Gate 7**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-sfx-plan-v2.test.ts packages/reasoning/src/index.ts
git commit -m "feat(reasoning): add grounded SFX Plan V2"
```

### Task 8: Lossless R8/P0/SceneAnchor/Flow boundary

**Review gate:** Every production-relevant field survives exact and unchanged through all four boundaries; preparation performs no generation.

**Files:**

- Create: `packages/reasoning/src/v1-2/production-v1-2.ts`
- Create: `packages/reasoning/src/v1-2-production-v1-2.test.ts`
- Create: `apps/server/src/v1-2/production-snapshot-v1-2.ts`
- Create: `apps/server/src/v1-2-production-snapshot-v1-2.test.ts`
- Create: `packages/providers/src/flow-scene-prompt-v2.ts`
- Create: `packages/providers/src/flow-scene-prompt-v2.test.ts`
- Create: `packages/providers/src/flow-production-v2.ts`
- Create: `packages/providers/src/flow-production-v2.test.ts`
- Modify: `packages/reasoning/src/index.ts`
- Modify: `packages/providers/src/index.ts`

**Interfaces:**

- Produce `compileProductionContractV1_2(input): ProductionContractV1_2` containing four exact `SceneExecutionContractV2` values.
- Produce content-addressed `ProductionSnapshotV1_2` storage with create/load/revalidate semantics parallel to V1 P0.
- Produce `compileSceneAnchorV2(snapshot, index): SceneAnchorV2` and `prepareFlowProductionRequestV2(anchor, bindings): FlowProductionRequestV2`.
- Produce `compileFlowScenePromptV2(anchor): CompiledFlowScenePromptV2` containing lossless Action A + Action B, `START/MID/END`, timing/handoff, per-beat camera/realism/SFX, Pair↔Beat↔Sentence↔Key Point, reference, and production-authorization semantics.

- [ ] **Step 1: Write a lossless field matrix test first**

Create one sentinel value per production-relevant field—including both action beats, each action's one bounded goal and eligibility evidence, sequence compatibility, `START/MID/END`, Action A output/Action B input binding, beat timing and 3.5s–4.5s handoff evidence, both Semantic Pair mappings, Camera/Focus A + B, Human Realism A + B, and SFX A + B—and assert exact equality at R8, reloaded P0, SceneAnchor, Flow request, and prompt semantic sections. Mutate or omit every field class and assert fail-closed rejection. Assert provider IDs occur only in the provider request and cannot re-enter Core snapshots.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/reasoning && npm test -w @mochi/server && npm test -w @mochi/providers`.
Expected: FAIL because the V1.2 compiler, store, and provider boundary do not exist.

- [ ] **Step 3: Implement R8, P0, SceneAnchor, and Flow preparation side-by-side**

Use canonical UTF-8 JSON, content hashes excluding the content ID, atomic no-overwrite publication, load-time validation, exact lineage comparison, and provider-edge-only reference/voice resolution. Do not expose or call `generateScene` from preparation.

```ts
export function compileProductionContractV1_2(input: ProductionCompilerInputV1_2): ProductionContractV1_2;
export function compileSceneAnchorV2(snapshot: ProductionSnapshotV1_2, index: 1 | 2 | 3 | 4): SceneAnchorV2;
export function prepareFlowProductionRequestV2(anchor: SceneAnchorV2, bindings: FlowReferenceBindingsV2): FlowProductionRequestV2;
```

- [ ] **Step 4: Verify losslessness and V1 compatibility**

Run: `npm test -w @mochi/reasoning && npm test -w @mochi/server && npm test -w @mochi/providers`
Expected: PASS, including all existing V1 R8/P0/SceneAnchor/Flow tests.

- [ ] **Step 5: Commit Gate 8**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-production-v1-2.test.ts packages/reasoning/src/index.ts apps/server/src/v1-2 apps/server/src/v1-2-production-snapshot-v1-2.test.ts packages/providers/src/flow-scene-prompt-v2.ts packages/providers/src/flow-scene-prompt-v2.test.ts packages/providers/src/flow-production-v2.ts packages/providers/src/flow-production-v2.test.ts packages/providers/src/index.ts
git commit -m "feat(production): add lossless V1.2 execution boundary"
```

### Task 9: L1–L4 orchestration migration

**Review gate:** Four complete persisted V1.2 layers compose in order, while V1 remains intact and L4 has no intelligence or generation capability.

**Files:**

- Create: `packages/reasoning/src/v1-2/layer-contracts-v1-2.ts`
- Create: `packages/reasoning/src/v1-2-layer-contracts-v1-2.test.ts`
- Create: `apps/server/src/v1-2/layer-artifact-store-v1-2.ts`
- Create: `apps/server/src/v1-2/blueprint-attempt-receipt-v1-2.ts`
- Create: `apps/server/src/v1-2-blueprint-attempt-receipt-v1-2.test.ts`
- Create: `apps/server/src/v1-2/layered-orchestration-v1-2.ts`
- Create: `apps/server/src/v1-2-layered-orchestration-v1-2.test.ts`
- Modify: `packages/reasoning/src/index.ts`

**Interfaces:**

- L1 persists R1/R2 plus Plannable Truth, Insight Bank, Affordance Profile, and reference purposes.
- L2 persists `creativeSeed`, seeded decisions, Semantic Pairs, Action A + Action B selection, sequence compatibility, exact `ActionCapabilityMapV1_2`, exact `ProductionEligibilityPolicyV1_2`, separate `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` evidence, initial/final `START/MID/END` State V2 and Risk V2, bounded-replan trace/result, Camera/Focus A + B, and Human Realism A + B.
- L3 persists two-sentence dialogue, exact Pair↔Beat↔Sentence↔Key Point bindings, dialogue-derived Key Points, timing/handoff evidence, and SFX A + B.
- L4 first persists a non-routable `PRODUCTION_COMPILED_V1_2` artifact only after exact lineage reload, R8/P0/SceneAnchor/Flow preparation, and Gate 1 four-card structural audit PASS. It cannot claim `READY_FOR_FLOW`; Gate 11 alone certifies that exact compiled artifact as `PRODUCTION_READY_V1_2` after final qualification.
- Produce separate `runProductFoundationV1_2`, `runSceneBlueprintV1_2`, `runFinalizedScriptV1_2`, and `runProductionCompileV1_2` functions.
- Produce a bounded process-memory `BlueprintAttemptReceiptStoreV1_2`: `CREATE` generates a 32-character lowercase hexadecimal seed with `crypto.randomBytes(16)`, binds it to exact `foundationId` plus canonical Creative Direction hash, and returns an opaque attempt ID; `RETRY` resolves that exact binding and seed; `REGENERATE` always creates a new receipt/seed. Restart loss, mismatch, mutation, and unknown IDs fail closed.

- [ ] **Step 1: Write failing four-layer lineage tests**

Test content-addressed idempotence, immutable predecessor IDs, server-owned 128-bit seed format, deliberate-regenerate new seed, same-failure retry seed preservation, receipt loss/mismatch failure, stale/corrupt/mixed-version rejection, no partial artifact after failure, and no V1.2 compiled artifact until the Gate 1 `auditFourSceneExecutionSetV2` returns PASS for all four cards. Reload must recompute and compare capability map without promotion, production-eligibility policy/result, Action A + B sequence compatibility, initial/final `START/MID/END` State V2, initial/final Risk V2, per-beat camera/realism, and replan trace; stale policy/map/authorization/state/risk fails. Both actions and their pair must be `READY` before camera/realism, L3, or L4.

- [ ] **Step 2: Add zero-call dependency tests before implementation**

Use a dependency object whose intelligence/generation accessors throw. Assert L4's public dependency type has neither accessor and runtime execution never touches either.

- [ ] **Step 3: Confirm RED**

Run: `npm test -w @mochi/server`
Expected: FAIL because the V1.2 stores and runners do not exist.

- [ ] **Step 4: Implement stores and orchestration**

Follow existing canonical persistence principles, but use distinct version prefixes/directories so V1 and V1.2 artifacts cannot collide. Normalize failures to bounded versioned layer diagnostics.

L2 execution order is fixed: seeded grounded Action A + Action B pair selection → sequence compatibility → initial State Engine V2 `START/MID/END` → independent per-action plus pair Scene Risk V2 → bounded replan when non-READY → recomputed sequence compatibility → recomputed final State Engine V2 → recomputed final Scene Risk V2 → per-beat Global Camera/Focus → per-beat Human Realism V2 → final `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` only when both actions and the pair have passed every truth, affordance, state, hand, timing, camera, Human Realism, risk, and sequence gate. Any failure stops before the next stage and commits no L2 artifact.

```ts
export function runProductFoundationV1_2(deps: L1DependenciesV1_2, input: L1InputV1_2): Promise<ProductFoundationV1_2>;
export function beginBlueprintAttemptV1_2(store: BlueprintAttemptReceiptStoreV1_2, input: BlueprintAttemptInputV1_2): BlueprintAttemptReceiptV1_2;
export function runSceneBlueprintV1_2(deps: L2DependenciesV1_2, input: L2InputV1_2): Promise<SceneBlueprintV1_2>;
export function runFinalizedScriptV1_2(deps: L3DependenciesV1_2, input: L3InputV1_2): Promise<FinalizedScriptV1_2>;
export function runProductionCompileV1_2(deps: L4DeterministicDependenciesV1_2, input: L4InputV1_2): Promise<ProductionCompiledV1_2>;
```

- [ ] **Step 5: Verify both paths**

Run: `npm test -w @mochi/server && npm test -w @mochi/reasoning`
Expected: PASS; existing `runProductFoundation`/`runSceneBlueprint`/`runFinalizedScript`/`runProductionCompile` remain unchanged.

- [ ] **Step 6: Commit Gate 9**

```bash
git add packages/reasoning/src/v1-2 packages/reasoning/src/v1-2-layer-contracts-v1-2.test.ts packages/reasoning/src/index.ts apps/server/src/v1-2 apps/server/src/v1-2-blueprint-attempt-receipt-v1-2.test.ts apps/server/src/v1-2-layered-orchestration-v1-2.test.ts
git commit -m "feat(server): add four-layer V1.2 orchestration"
```

### Task 10: Browser Scene Card migration

**Review gate:** The browser can use one complete V1.2 lineage, displays all audit-relevant data, and cannot express mixed readiness or call Flow before Gate 11 certification.

**Files:**

- Create: `apps/web/src/v1-2/production-client-v1-2.ts`
- Create: `apps/web/src/v1-2/production-client-v1-2.test.ts`
- Create: `apps/web/src/v1-2/SceneCardsV1_2.tsx`
- Create: `apps/web/src/v1-2/SceneCardsV1_2.test.tsx`
- Create: `apps/server/src/v1-2/production-http-v1-2.ts`
- Create: `apps/server/src/v1-2-production-http-v1-2.test.ts`
- Modify: `apps/server/src/node-http-adapter.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**

- Add version-explicit V1.2 routes or an exact version discriminator that cannot fall through to V1 decoding.
- Display four progressive Scene Cards with insight, Hook/CTA approach, Action A + Action B and per-action hand count/eligibility, sequence compatibility, `START/MID/END`, beat timing and handoff evidence, Camera/Focus A + B, two Pair-bound dialogue sentences, two Pair/Beat/Sentence-bound Key Points, Human Realism A + B, references, SFX A + B, and audit status.
- Deliberate Regenerate requests a new server-owned blueprint-attempt receipt; Retry carries only the existing opaque attempt ID and exact predecessor lineage. The browser may display a bounded seed fingerprint for audit but never creates or edits the seed.

- [ ] **Step 1: Write failing strict decoder and UI state tests**

Reject unknown/extra/mixed-version response fields. Test factual invalidation of L1–L4, creative invalidation of L2–L4, stale completion suppression, regenerate versus retry seed semantics, four-card completeness, both action beats and `START/MID/END` visibility, per-beat camera/realism/SFX visibility, Pair↔Beat↔Sentence↔Key Point visibility, 3.5s–4.5s handoff visibility, reviewer-face warning visibility, and absence of a Flow action before all-card PASS.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/web && npm test -w @mochi/server`.
Expected: FAIL because the client, cards, and routes do not exist.

- [ ] **Step 3: Implement the minimal static migration surface**

Follow the existing UI policy: readable cards, ordinary controls, no animation, canvas, node graph, or redesign. Keep current V1 routes and UI path available until final cutover authorization.

```ts
export type SceneCardStateV1_2 = 'LOCKED' | 'READY' | 'RUNNING' | 'PASS' | 'FAIL' | 'STALE' | 'NEEDS_REBUILD' | 'NEEDS_REANALYSIS' | 'READY_FOR_FLOW';
export function decodeProductionCompiledV1_2(value: unknown): ProductionCompiledViewV1_2;
```

- [ ] **Step 4: Verify web/server regression safety**

Run: `npm test -w @mochi/web && npm test -w @mochi/server && npm run build -w @mochi/web`
Expected: PASS; V1 browser behavior and production workspace remain passing.

- [ ] **Step 5: Commit Gate 10**

```bash
git add apps/web/src/v1-2 apps/web/src/App.tsx apps/web/src/App.test.tsx apps/server/src/v1-2 apps/server/src/v1-2-production-http-v1-2.test.ts apps/server/src/node-http-adapter.ts
git commit -m "feat(web): add V1.2 scene cards"
```

### Task 11: Qualification matrix and pre-Flow gate

**Review gate:** Representative product/action fixtures pass or fail for the documented reason, and no Flow generation is reachable before the coherent four-card audit passes.

**Files:**

- Create: `apps/harness/src/v1-2-qualification-fixtures.ts`
- Create: `apps/harness/src/v1-2-qualification-matrix.ts`
- Create: `apps/harness/src/v1-2-qualification-matrix.test.ts`
- Create: `apps/server/src/v1-2/pre-flow-audit-v1-2.ts`
- Create: `apps/server/src/v1-2-pre-flow-audit-v1-2.test.ts`
- Modify: `apps/harness/src/index.ts`
- Modify: `apps/harness/package.json`
- Modify: root `package.json`
- Update after PASS: `STATUS.md`
- Update after PASS: `docs/CODEX_HANDOFF.md`

**Interfaces:**

- Produce `certifyProductionReadyV1_2(input): ProductionReadyV1_2` as the sole promotion from the exact Gate 9 `PRODUCTION_COMPILED_V1_2` artifact to `READY_FOR_FLOW`; it composes the pure Gate 1 structural audit with lineage reload and Gate 8 lossless checks.
- Add `npm run qualification:v1-2:dry` with repository-only fixtures and zero provider calls.
- Matrix includes compatible two-action sequences composed from simple presentation plus grounded open/close, remove/replace cap, press, switch, pour, dispense, apply, assemble, eligible two-hand actions, and corresponding unsupported, contradictory, or sequence-incompatible cases.

- [ ] **Step 1: Write failing matrix and generation-order tests**

Assert every fixture's exact capability and separate production-eligibility result. Positive expanded-action fixtures retain explicit `UNTESTED` capability and receive `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` only when each action and the ordered pair pass all bounded gates; assert the capability map remains byte-identical and no `SAFE` promotion appears. Inject a Flow driver spy and prove zero generation calls for one failing card, mixed lineage, lost execution field, broken `START/MID/END` or adjacent continuity, one/three/reordered Primary Actions, Action B consuming the wrong `MID`, handoff outside 3.5s–4.5s, hidden reset/teleportation/state-hiding cut, `AVOID`, unsupported affordance, failed sequence compatibility, invalid reference role, per-beat camera/Human Realism/SFX violation, or Pair↔Beat↔Sentence↔Key Point violation.

- [ ] **Step 2: Confirm RED**

Run: `npm test -w @mochi/harness && npm test -w @mochi/server`.
Expected: FAIL because the matrix and final audit do not exist.

- [ ] **Step 3: Implement the pure audit and dry matrix**

The server pre-Flow gate certifies, rather than duplicates, the exact Gate 9 compiled artifact. It composes the already-passing Gate 1 structural audit with exact L1→L4 persisted-lineage reload and Gate 8 lossless boundary checks. It validates `TWO_BEAT_ACTION_SEQUENCE_V1_2`, both action beats, `START/MID/END`, Action A output/Action B input equality, per-action eligibility, pair compatibility, timing/handoff evidence, per-beat Camera/Focus, Human Realism, and SFX, exact Sentence-to-Beat synchronization, and adjacent continuity. It emits the sole `READY_FOR_FLOW` authority only for four exact V1.2 Scene Execution Contracts with a shared source lineage and seed, returns bounded fail-closed reason codes, and never calls Flow.

```ts
export function certifyProductionReadyV1_2(input: ProductionCompiledCertificationInputV1_2): ProductionReadyV1_2;
```

- [ ] **Step 4: Run the full qualification and regression suite**

Run:

```bash
npm run typecheck
npm test
npm run benchmark:capability:dry
npm run benchmark:execution:dry
npm run qualification:v1-2:dry
npm run build -w @mochi/web
git diff --check
```

Expected: all commands PASS; historical action evidence and promotions remain unchanged; live provider and generation counts remain zero.

- [ ] **Step 5: Perform source-boundary audit**

Confirm by source inspection that Core has no provider fields, L4 has no `IntelligenceProvider` or generation dependency, all four-card failures precede Flow driver access, empirical capability remains unchanged by bounded production authorization, and every Scene Execution Contract V2 field—including both action beats, `START/MID/END`, timing/handoff, per-beat Camera/Focus, Human Realism, SFX, and Sentence-to-Beat mappings—reaches the prompt/request losslessly.

- [ ] **Step 6: Record Gate 11, without live execution**

Update `STATUS.md` and `docs/CODEX_HANDOFF.md` with exact command results, zero-call accounting, and the explicit statement that the implementation gate does not authorize Gemini, Flow, Saydi, or live provider use.

- [ ] **Step 7: Commit Gate 11**

```bash
git add apps/harness/src apps/harness/package.json apps/server/src/v1-2 apps/server/src/v1-2-pre-flow-audit-v1-2.test.ts package.json STATUS.md docs/CODEX_HANDOFF.md
git commit -m "feat(v1.2): lock pre-Flow qualification gate"
```

## Completion boundary

Passing Task 11 establishes the complete pre-Flow, auditable V1.2 `READY_FOR_FLOW` authority. It does not authorize Flow generation, active runtime cutover, or deletion of V1.

Before active V1.2 runtime cutover, a separately authorized post-Flow compatibility plan must add and verify versioned Candidate mapping, V1.2-bound Scene/Sequence/Global QC inputs, selective repair, Final Acceptance, and Delivery. That plan must preserve or strengthen every current fail-closed decision, prove the new action/state/reference/camera/realism/SFX fields cannot be lost or bypass approval, retain unchanged logical voice/provider mappings, and deliver exactly four approved MP4 files plus the exact eight-line UTF-8 `key-points.txt`. Until that later plan passes, V1 stays the active end-to-end runtime.
