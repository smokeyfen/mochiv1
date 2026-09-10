# MOCHI V1.2 Scene Output Architecture Design

**Status:** APPROVED / ARCHITECTURE AUTHORITY
**Date:** 2026-09-10
**Scope:** Next versioned architecture authority; documentation only at this checkpoint
**Predecessor:** Frozen MOCHI V1 architecture remains the working implementation until the V1.2 migration gate passes

## 1. Decision

MOCHI V1.2 replaces the fixed V1 scene choreography with an evidence-backed, commercially useful, seeded four-scene plan while preserving every factual, provider, voice, safety, acceptance, and delivery authority that is not explicitly superseded here.

The migration is side-by-side and versioned. V1 remains valid and operational during implementation. A production lineage must be entirely V1 or entirely V1.2; no artifact assembled from mixed V1/V1.2 contracts may obtain `READY_FOR_FLOW`. V1.2 becomes the active runtime authority only after all implementation gates in the companion plan pass and a separate runtime cutover is explicitly authorized.

## 2. Preserved authorities and invariants

The following are unchanged and remain binding:

- R1 Product Evidence is the visual/factual evidence authority.
- R2 Product Truth is the canonical factual authority. Intelligence may select or rank grounded facts but may never author Product Truth facts.
- The normal product workflow has four persisted macro layers, ordered `L1 → L2 → L3 → L4`.
- Google Flow is the only video generator. Reasoning and QC providers never generate video.
- Core contracts remain provider-neutral. Provider IDs, credentials, endpoints, operation IDs, media IDs, file URIs, sessions, cookies, and provider voice names remain outside Core.
- Existing voice authority remains unchanged: the canonical logical identities are `VN_FEMALE_SOUTH_REVIEW_V1` and `VN_MALE_SOUTH_REVIEW_V1`; both are `vi-VN` / `SOUTH` / `review`. Flow bindings remain provider-edge-only, and Saydi remains fallback infrastructure.
- QC, Final Acceptance, and Delivery remain fail-closed. A generated output is a Candidate until every required gate passes; a critical failure cannot approve or deliver it.
- Output is exactly four ordered scenes: `HOOK`, `FEATURE`, `PROOF`, `CTA`. Every scene is exactly 8 seconds, 9:16, and `SMARTPHONE_POV`.
- Reviewer face visibility is `FORBIDDEN` in every scene.
- Each scene implements `TWO_BEAT_ACTION_SEQUENCE_V1_2` with exactly two ordered Semantic Pairs and exactly two sequential Primary Actions. Action A targets the first ~4 seconds, Action B targets the last ~4 seconds, and their handoff occurs between 3.5s and 4.5s while total scene duration remains exactly 8 seconds.
- Each individual Action Definition has exactly one bounded semantic goal. No scene may introduce a third Primary Action, hidden reset, teleportation, or state-hiding cut.
- BGM remains `NONE`. VFX remains `NONE`.
- L4 is deterministic: zero `IntelligenceProvider` calls and zero generation calls.
- No Flow generation may begin until all four final V1.2 Scene Cards pass the pre-Flow audit.

## 3. Explicit V1.2 supersessions

V1.2 removes the fixed `PICK_UP → HOLD → ROTATE_SLOW → HOLD` scene spine. It replaces that choreography with evidence-backed selection of exactly two sequential Primary Actions per scene under `TWO_BEAT_ACTION_SEQUENCE_V1_2`.

The eligible library may include broad, bounded, single-goal simple or functional actions such as open, close, remove cap, replace cap, press, switch, pour, dispense, apply, assemble, and other actions admitted by the versioned Action Library. Functional actions are eligible only when Product Truth and the Product Affordance Profile establish the required product parts, relationships, and state transitions. Unsupported affordances fail closed. Library support does not confer empirical capability or production authority. Expanded V1.2 actions may retain `capability=UNTESTED`, and no `UNTESTED` action may be promoted to `SAFE` without empirical evidence under the locked promotion policy. Production authorization is a separate authority: `productionEligibility=V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` may be assigned only when all bounded V1.2 truth, affordance, state, hand, timing, camera, Human Realism, risk, and pair-sequence gates pass. `AVOID` remains blocked. Deterministic tests may exercise explicit capability and production-eligibility fixtures but may not publish them as empirical evidence or promotions.

One or two hands may appear. Two hands are allowed only when the relevant action beat explicitly supports or requires them, the hand count is declared in that action definition, State Engine V2 can resolve its contacts and transition, and per-beat Human Realism V2 preserves them. No scene may add an undeclared hand.

The V1 rules fixing SFX to `NONE`, generating Key Points before dialogue, limiting physical planning to the legacy state model, and treating all product references as one undifferentiated authority are superseded as described below. All other V1 locks remain in force.

## 4. Versioned four-layer authority

### L1 — Product Foundation V1.2

L1 persists the existing validated R1 Product Evidence and committed R2 Product Truth/Reference Assessment authority without changing their behavior. It adds three derived, provider-neutral artifacts:

1. **Plannable Truth Gate** — proves there is enough grounded identity, commercial, reference, and action-affordance information to plan. It returns a bounded PASS or fail-closed result with stable reason codes. It cannot invent facts or weaken R1/R2 validation.
2. **Product Insight Bank** — a grounded catalog of candidate commercial insights. Every insight binds to one or more Product Truth fact IDs or the exact Product Name. It stores ranking dimensions for purchase trigger, product appeal, visual demonstrability, relevance/usefulness, and distinctiveness. Those dimensions are the primary ranking authority.
3. **Product Affordance Profile** — an evidence-backed catalog of product parts, controls, openings, closures, dispensers, contents, compatible hand counts, preconditions, state changes, and supporting reference IDs. Every functional affordance traces to Product Truth; absence or contradiction is ineligible, never guessed.

L1 also distinguishes reference purposes without changing factual authority:

- **Canonical reviewed-product identity references** establish the exact reviewed product and variant identity across all scenes.
- **Supporting feature/function/variant references** may support a grounded feature, function, or view, but never replace the canonical identity or mutate the product variant across scenes.

Reference-purpose classification is a derived, validated authority; V1.2 does not require manual front/side/back classification. A bounded enum-only L1 assessment examines each existing canonical Product Evidence asset exactly once with its runtime image, then a deterministic compiler binds the result to the R2 committed context and the trusted ordered R1 asset ID/MIME/SHA-256 fingerprints. Bytes and MIME are rehashed and compared before intelligence; wrong bytes, wrong MIME, reordered assets, stale receipts, and logical-ID relabeling fail closed. The assessment may report only identity authority, supporting feature/function/variant purpose, same-variant compatibility, conflict, or insufficient evidence; it cannot author product prose. Missing, duplicate, unknown, contradictory, or incomplete results also fail closed. Any supporting reference that conflicts with canonical product identity is excluded or blocks planning.

### L2 — Scene Blueprint V1.2

L2 persists a `creativeSeed` and the complete four-scene creative/physical blueprint. The seed belongs to the L2 lineage and is copied losslessly downstream.

- A deliberate regenerate operation creates a new seed and therefore a new L2 lineage.
- A retry of the same failed planning or Flow generation attempt preserves the seed and the same audited execution intent.
- Random choices are reproducible functions of the seed, a stable decision namespace, the ordered eligible candidates, and explicit weights.

The server owns seed creation. Before L2 execution it creates a 128-bit cryptographically random lowercase hexadecimal seed and a bounded opaque blueprint-attempt receipt bound to the exact L1 ID and creative-input revision. A failed L2 response retains that receipt in the existing bounded process-memory pattern so an explicit retry reuses the same seed; a deliberate regenerate creates a new receipt and seed. Receipt loss on restart fails closed and requires a deliberate regenerate. The browser never authors or edits a seed, and changed/stale attempt bindings are rejected.

Weighted constrained randomness applies to:

- Product Insight allocation across scenes;
- the Scene 1 Hook approach;
- the Scene 4 CTA approach;
- the eligible ordered Action A + Action B sequence;
- visual composition choices.

Randomness operates only after deterministic eligibility. It cannot select an ungrounded insight, unsupported affordance, infeasible action, broken state chain, disallowed camera behavior, or duplicate composition that violates useful diversity. The plan records candidate sets, weights, selected IDs, and seed namespaces so replay is deterministic and auditable.

Scene 1 `HOOK` and Scene 4 `CTA` each use a versioned family of diverse seeded approaches. Hook approaches may vary how attention is earned; CTA approaches may vary how usefulness or purchase intent is closed. Neither role has a single hard-coded template.

### L3 — Finalized Script V1.2

L3 finalizes Vietnamese dialogue first, then derives Key Points from the accepted dialogue.

Each scene contains exactly two Vietnamese dialogue sentences:

- sentence 1 maps to Semantic Pair 1 and Action Beat A;
- sentence 2 maps to Semantic Pair 2 and Action Beat B;
- Scene 1 sentence 1 contains the exact canonical Product Name;
- both sentences pass the existing logical voice identity and timing authority for an eight-second scene.

After dialogue passes semantic and timing validation, L3 generates exactly two Key Points per scene, eight total. Scene 1 Key Point 1 is the exact Product Name. The other seven Key Points are concise Vietnamese, each expresses one semantic idea, and each targets 5–7 spoken words. Each Key Point is bound to the same Semantic Pair as its corresponding sentence and may not introduce a new fact.

L3 also persists SFX Plan V2:

- Beat A has SFX A, physically grounded in Action A, its affordance, `START → MID` transition, and visible interaction;
- Beat B has SFX B, physically grounded in Action B, its affordance, `MID → END` transition, and visible interaction;
- `NONE` remains valid when no physical sound is justified;
- BGM is always `NONE`;
- VFX is always `NONE`.

### L4 — Production Compile V1.2

L4 consumes only the exact persisted V1.2 L3 lineage. It has zero `IntelligenceProvider` and zero generation capability. It validates and compiles:

`Finalized Script V1.2 → Scene Execution Contract V2 → R8 V1.2 → P0 V1.2 → SceneAnchor V2 → Flow request/prompt preview → four final Scene Cards → pre-Flow audit`

Only after all four cards pass as one coherent set may the browser expose `READY_FOR_FLOW`. L4 never calls a Flow driver.

## 5. Commercial insight and semantic structure

The Product Insight Bank separates factual grounding from creative allocation. Each entry has a stable insight ID, supporting truth IDs, optional supporting reference IDs, eligibility limitations, and five primary commercial scores:

1. purchase trigger;
2. product appeal;
3. visual demonstrability;
4. relevance/usefulness;
5. distinctiveness.

The ranker is deterministic for a given bank and policy. Seeded allocation selects among the highest useful eligible choices using documented weights and constraints. Across four scenes, allocation should avoid redundant claims, cover distinct useful reasons to care, and reserve role-appropriate material for Hook and CTA.

Every scene contains exactly two ordered Semantic Pairs. After seeded insight allocation, a deterministic Semantic Pair composer binds each selected insight/truth intent to the corresponding action beat, sentence, and Key Point. It enforces the exact synchronization `Semantic Pair 1 ↔ Action Beat A ↔ Dialogue Sentence 1 ↔ Key Point 1` and `Semantic Pair 2 ↔ Action Beat B ↔ Dialogue Sentence 2 ↔ Key Point 2`, ordered distinctness where grounded choices permit it, source bindings, and no new facts. Scene 1 Semantic Pair 1 is locked to the exact Product Name identity requirement; therefore Scene 1 Sentence 1 must contain the exact Product Name and Scene 1 Key Point 1 must equal it exactly.

## 6. Action Library and State Engine V2

The V1.2 Action Library defines each action as data with:

- a stable action ID and one semantic goal;
- action family (`SIMPLE_PRESENTATION` or `FUNCTIONAL`);
- allowed hand count (`ONE`, `TWO`, or `ONE_OR_TWO`);
- required affordance kinds and truth bindings;
- physical and functional preconditions;
- deterministic physical and functional state effects;
- allowed presentation beats and grounded sound events;
- empirical capability/production eligibility requirements.

Broad support does not mean automatic eligibility. Each selected action independently passes Product Truth grounding, affordance matching, Action Library validation, state, hand, timing, camera, Human Realism, Scene Risk V2, and production-eligibility gates. The ordered Action A + Action B pair additionally passes sequence compatibility: Action B must consume the exact valid `MID` produced by Action A, both actions must complete within their bounded timing windows, and their combined effects must preserve scene and adjacent-scene continuity. Failure of either action or the pair blocks the whole scene.

Empirical capability and production authorization are separate V1.2 authorities. Newly represented actions default to `capability=UNTESTED` and remain `UNTESTED` until empirical evidence satisfies the unchanged promotion policy; production authorization must never rewrite or imply a `SAFE` capability. `PRODUCTION_ELIGIBILITY_POLICY_V1_2` blocks `AVOID` and unsupported affordances, but may record `productionEligibility=V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` for an `UNTESTED` expanded action only after every bounded action gate and the sequence-compatibility gate pass. A bounded V1.2 replan may select only actions and ordered pairs capable of passing those gates, preserves the seed and every locked scene field, recomputes State Engine V2 and risk after each attempt, and stops at `MAX_SCENE_REPLAN_ATTEMPTS_V1_2 = 2`.

State Engine V2 carries both physical state and bounded functional state through the authoritative chain `START → Action A → MID → Action B → END`. Physical state includes placement, orientation, grip/contact, active hands, visible components, and relevant contained material. Functional state includes only facts needed by admitted actions, such as open/closed, cap attached/removed, switch off/on, actuator idle/pressed, assembled/disassembled, or content retained/dispensed. Unknown state is not silently coerced into a usable precondition. The `MID` value is a first-class validated state: it is the exact output of Action A and the exact input to Action B.

For every adjacent scene, continuity applies to all declared physical and functional product state: `END` of scene N must exactly match `START` of scene N+1. Framing may change through the camera/focus contract, but V1.2 defines no product-state discontinuity or reset mechanism. Teleportation, refill, reassembly, undeclared hand swap, and variant change are forbidden.

## 7. Global Camera / Focus Composer

One global composer plans all four scenes together. Composition considers:

- scene role;
- allocated insight;
- selected Action A and Action B;
- `START`, `MID`, and `END` state plus the Action A/Action B timing handoff.

The composer must produce useful diversity across distance, angle, focus target, and camera/hand behavior while preserving ordinary smartphone realism. It may use subtle handheld movement and feasible reframing. Cinematic orbit, drone, gimbal, impossible tracking, and camera motion that competes with action completion are forbidden.

Each scene has Camera/Focus A for Beat A and Camera/Focus B for Beat B. The global composer records both per-beat compositions and its diversity proof in L2. It prefers one continuous ordinary smartphone-style take with a natural transition at the action handoff. Seeded variation is constrained by continuity, product legibility, action visibility, reference support, and `SMARTPHONE_POV`.

## 8. Human Realism V2 and SFX Plan V2

Human Realism V2 is per beat. Human Realism A covers Action A approach, grip/contact, force, timing, micro-adjustment, completion into `MID`, and Camera/Focus A behavior. Human Realism B covers Action B consumption of `MID`, grip/contact, force, timing, micro-adjustment, completion into `END`, settling, and Camera/Focus B behavior. Both support one-hand and admitted two-hand execution and ordinary phone-camera behavior. They may not alter Product Truth, insight intent, actions, state, dialogue, reference scope, or camera composition.

Every Human Realism V2 field is production-relevant and must survive losslessly into the Flow prompt. No generic summary may replace or drop the structured behavior.

SFX Plan V2 is per beat: SFX A binds only to Action A and its visible cause; SFX B binds only to Action B and its visible cause. Each beat records zero or more bounded physically justified sound events and may independently use canonical `NONE` when no physical sound is justified. It forbids music, invented off-screen activity, exaggerated cinematic sound design, and sounds unsupported by the corresponding action.

## 9. Lossless Scene Execution Contract V2

`SCENE_EXECUTION_CONTRACT_V2` is the complete, exact-shape provider-neutral handoff for one final scene. It contains:

- source lineage, version, project/product identity, scene index and role;
- `creativeSeed` and recorded seeded decision IDs;
- exact canonical and supporting logical reference roles;
- `TWO_BEAT_ACTION_SEQUENCE_V1_2` and exactly two sequential Primary Actions, with each action's one bounded semantic goal, hand count, affordance bindings, capability evidence, and production-eligibility evidence;
- both Semantic Pairs, both dialogue sentences, both Key Points, their exact Pair↔Beat↔Sentence↔Key Point bindings, timing evidence, and logical voice identity;
- Action A targeting the first ~4 seconds, Action B targeting the last ~4 seconds, and evidence that the handoff occurs between 3.5s and 4.5s;
- complete physical and functional `START`, `MID`, and `END` state, including exact Action A output/Action B input equality;
- Camera/Focus A and Camera/Focus B;
- Human Realism A and Human Realism B;
- SFX A and SFX B, `bgm: NONE`, and `vfx: NONE`;
- duration 8 seconds, aspect ratio 9:16, `SMARTPHONE_POV`, and reviewer face forbidden.

No production-relevant field may disappear, be summarized, or be re-authored through `R8 → P0 → SceneAnchor → Flow request/prompt`. Every boundary has exact-shape validation and an explicit lossless comparison/binding test. Provider resolution may add provider-only identifiers at the edge but cannot change the contract meaning.

## 10. Pre-Flow audit and downstream lifecycle

The pre-Flow gate evaluates the four final Scene Cards as a set. It requires:

- one coherent V1.2 lineage and one persisted `creativeSeed`;
- exactly four ordered 8-second 9:16 `SMARTPHONE_POV` scenes;
- reviewer face forbidden and valid one/two-hand declarations;
- `TWO_BEAT_ACTION_SEQUENCE_V1_2` with exactly two eligible sequential Primary Actions per scene, no third action, and one bounded semantic goal per action definition;
- Action A in the first ~4 seconds, Action B in the last ~4 seconds, and a validated 3.5s–4.5s handoff;
- exact `START → Action A → MID → Action B → END` state resolution, with Action B consuming the exact valid `MID` from Action A;
- independent truth, affordance, state, hand, timing, camera, Human Realism, and risk eligibility for both actions plus pair sequence compatibility;
- empirical capability preserved without false promotion and `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` present only when every bounded gate passes;
- grounded insights, affordances, references, dialogue, Key Points, and SFX;
- exact Pair 1↔Beat A↔Sentence 1↔Key Point 1 and Pair 2↔Beat B↔Sentence 2↔Key Point 2 synchronization;
- exact applicable state continuity;
- complete per-beat Camera/Focus, Human Realism, and SFX, with useful diversity and no cinematic behavior;
- complete lossless Scene Execution Contract V2 bindings;
- unchanged voice authority;
- no critical validation issue.

The gate is all-or-nothing. A failed card prevents all Flow generation. A passed audit creates a V1.2 `READY_FOR_FLOW` authority but performs no generation.

After generation, the existing Candidate lifecycle, Frame QC, Temporal QC, Speech QC, Pairwise Continuity QC, Global Cumulative QC, selective repair, Final Acceptance, and Delivery remain fail-closed. V1.2 extends their inputs only where needed to verify its new action/state/reference/camera/realism/SFX contracts; it does not weaken any existing validator or approval rule. Delivery remains exactly four approved complete scene MP4 files plus UTF-8 `key-points.txt` with exactly eight ordered lines.

## 11. Migration and compatibility

Implementation creates versioned V1.2 contracts, validators, stores, engines, routes, and browser decoders beside V1 first. Existing V1 tests and behavior remain green throughout.

The cutover rule is strict:

- a V1 request uses only V1 artifacts and V1 readiness;
- a V1.2 request uses only V1.2 artifacts from L1 through Flow preparation;
- adapters may read both versions only to route to a complete version-specific path;
- an adapter may never fill a missing V1.2 field from a V1 artifact;
- `READY_FOR_FLOW` is unavailable for a partially migrated lineage.

The browser V1.2 path is added only after the reusable four-scene audit authority, Core/reasoning contracts, and lossless execution boundary pass. It remains non-default and cannot reach Flow while L1–L4 qualification is incomplete. Runtime cutover and V1 removal are separate future decisions and are not authorized by this design.

## 12. Acceptance criteria

The companion plan's pre-Flow tranche is complete only when all eleven review gates independently pass, V1 remains operational, the qualification matrix covers representative simple and functional two-action sequences, and the final pre-Flow gate proves that no generation can occur before all four Scene Cards pass audit. Positive expanded-action fixtures preserve `capability=UNTESTED` while proving that the separate `V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` result is available only after every per-action and pair gate passes; `AVOID`, unsupported affordances, and any incomplete or incompatible pair remain blocked.

Active V1.2 runtime cutover additionally requires a separately authorized post-Flow compatibility tranche for versioned Candidate mapping, V1.2-aware QC input binding, selective repair, Final Acceptance, and Delivery. That tranche must reuse or strengthen the current fail-closed decisions, retain exact approved four-MP4/eight-Key-Point delivery, and prove that the new action/state/reference/camera/realism/SFX fields cannot bypass approval. Until that work passes, V1.2 `READY_FOR_FLOW` is a pre-Flow architecture authority only and V1 remains the active end-to-end runtime.

This document authorizes architecture and future scoped implementation planning only. It does not authorize runtime implementation, provider calls, Flow generation, voice changes, frontend changes, persistence changes, or validator weakening in this documentation checkpoint.
