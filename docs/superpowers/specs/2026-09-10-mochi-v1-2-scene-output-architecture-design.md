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
- Each scene has exactly one semantic Primary Action. Presentation beats may support that action but may not introduce a second semantic action or a second goal.
- BGM remains `NONE`. VFX remains `NONE`.
- L4 is deterministic: zero `IntelligenceProvider` calls and zero generation calls.
- No Flow generation may begin until all four final V1.2 Scene Cards pass the pre-Flow audit.

## 3. Explicit V1.2 supersessions

V1.2 removes the fixed `PICK_UP → HOLD → ROTATE_SLOW → HOLD` scene spine. It replaces that choreography with evidence-backed Single Primary Action selection.

The eligible library may include broad, bounded, single-goal simple or functional actions such as open, close, remove cap, replace cap, press, switch, pour, dispense, apply, assemble, and other actions admitted by the versioned Action Library. Functional actions are eligible only when Product Truth and the Product Affordance Profile establish the required product parts, relationships, and state transitions. Unsupported affordances fail closed. Library support does not confer production authority: the current trusted capability state and V1 fast-track remain unchanged, so newly represented functional actions remain production-ineligible until separately gathered evidence satisfies the locked promotion policy or a separately approved V1.2 production policy admits them. Deterministic tests may use explicit fixture capability maps but may not publish them as production evidence.

One or two hands may appear. Two hands are allowed only when the selected action explicitly supports or requires them, the hand count is declared in the action definition, State Engine V2 can resolve the contacts and transitions, and Human Realism V2 preserves them. No scene may add an undeclared hand.

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
- the eligible Single Primary Action;
- visual composition choices.

Randomness operates only after deterministic eligibility. It cannot select an ungrounded insight, unsupported affordance, infeasible action, broken state chain, disallowed camera behavior, or duplicate composition that violates useful diversity. The plan records candidate sets, weights, selected IDs, and seed namespaces so replay is deterministic and auditable.

Scene 1 `HOOK` and Scene 4 `CTA` each use a versioned family of diverse seeded approaches. Hook approaches may vary how attention is earned; CTA approaches may vary how usefulness or purchase intent is closed. Neither role has a single hard-coded template.

### L3 — Finalized Script V1.2

L3 finalizes Vietnamese dialogue first, then derives Key Points from the accepted dialogue.

Each scene contains exactly two Vietnamese dialogue sentences:

- sentence 1 maps to Semantic Pair 1;
- sentence 2 maps to Semantic Pair 2;
- Scene 1 sentence 1 contains the exact canonical Product Name;
- both sentences pass the existing logical voice identity and timing authority for an eight-second scene.

After dialogue passes semantic and timing validation, L3 generates exactly two Key Points per scene, eight total. Scene 1 Key Point 1 is the exact Product Name. The other seven Key Points are concise Vietnamese, each expresses one semantic idea, and each targets 5–7 spoken words. Each Key Point is bound to the same Semantic Pair as its corresponding sentence and may not introduce a new fact.

L3 also persists SFX Plan V2:

- SFX is physically grounded in the selected action, affordance, state transition, and visible interaction;
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

Every scene contains exactly two ordered Semantic Pairs. After seeded insight allocation, a deterministic Semantic Pair composer binds each selected insight/truth intent to sentence index 1 or 2 and Key Point index 1 or 2. It enforces two pairs per scene, ordered distinctness where grounded choices permit it, source bindings, and no new facts. A Semantic Pair is not a second action. Scene 1 Semantic Pair 1 is locked to the exact Product Name identity requirement.

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

Broad support does not mean automatic eligibility. Each selected action must pass Product Truth grounding, affordance matching, Action Library validation, capability/production eligibility, State Engine V2 resolution, Scene Risk V2 evaluation, and four-scene continuity. Scene Risk V2 consumes the expanded action/state/affordance contract and preserves the existing capability precedence and fail-closed semantics. `PRODUCTION_ELIGIBILITY_POLICY_V1_2` denies every `UNTESTED` or `AVOID` action and cannot infer trust from library membership; newly represented actions default to `UNTESTED`. A bounded V1.2 replan may select only from already eligible grounded actions, preserves the seed and every locked scene field, recomputes State Engine V2 and risk after each attempt, and stops at `MAX_SCENE_REPLAN_ATTEMPTS_V1_2 = 2`.

State Engine V2 carries both physical state and bounded functional state. Physical state includes placement, orientation, grip/contact, active hands, visible components, and relevant contained material. Functional state includes only facts needed by admitted actions, such as open/closed, cap attached/removed, switch off/on, actuator idle/pressed, assembled/disassembled, or content retained/dispensed. Unknown state is not silently coerced into a usable precondition.

For every adjacent scene, continuity applies to all declared physical and functional product state: `END` of scene N must exactly match `START` of scene N+1. Framing may change through the camera/focus contract, but V1.2 defines no product-state discontinuity or reset mechanism. Teleportation, refill, reassembly, undeclared hand swap, and variant change are forbidden.

## 7. Global Camera / Focus Composer

One global composer plans all four scenes together. Composition considers:

- scene role;
- allocated insight;
- selected Primary Action;
- start, action, and end state.

The composer must produce useful diversity across distance, angle, focus target, and camera/hand behavior while preserving ordinary smartphone realism. It may use subtle handheld movement and feasible reframing. Cinematic orbit, drone, gimbal, impossible tracking, and camera motion that competes with action completion are forbidden.

The global composer records its chosen composition and diversity proof in L2. Seeded variation is constrained by continuity, product legibility, action visibility, reference support, and `SMARTPHONE_POV`.

## 8. Human Realism V2 and SFX Plan V2

Human Realism V2 covers one-hand and admitted two-hand execution, approach, grip/contact, force, timing, micro-adjustment, action completion, settling, and ordinary phone-camera behavior. It may not alter Product Truth, insight intent, action, state, dialogue, reference scope, or camera composition.

Every Human Realism V2 field is production-relevant and must survive losslessly into the Flow prompt. No generic summary may replace or drop the structured behavior.

SFX Plan V2 records zero or more bounded physically justified sound events for the one Primary Action. Events bind to an action phase and visible cause. It forbids music, invented off-screen activity, exaggerated cinematic sound design, and sounds unsupported by the action. `NONE` is canonical when no event is justified.

## 9. Lossless Scene Execution Contract V2

`SCENE_EXECUTION_CONTRACT_V2` is the complete, exact-shape provider-neutral handoff for one final scene. It contains:

- source lineage, version, project/product identity, scene index and role;
- `creativeSeed` and recorded seeded decision IDs;
- exact canonical and supporting logical reference roles;
- both Semantic Pairs, both dialogue sentences, both Key Points, timing evidence, and logical voice identity;
- exactly one Primary Action, hand count, affordance bindings, and action eligibility evidence;
- physical and functional start/action/end state;
- global camera/focus composition;
- complete Human Realism V2 behavior;
- SFX Plan V2, `bgm: NONE`, and `vfx: NONE`;
- duration 8 seconds, aspect ratio 9:16, `SMARTPHONE_POV`, and reviewer face forbidden.

No production-relevant field may disappear, be summarized, or be re-authored through `R8 → P0 → SceneAnchor → Flow request/prompt`. Every boundary has exact-shape validation and an explicit lossless comparison/binding test. Provider resolution may add provider-only identifiers at the edge but cannot change the contract meaning.

## 10. Pre-Flow audit and downstream lifecycle

The pre-Flow gate evaluates the four final Scene Cards as a set. It requires:

- one coherent V1.2 lineage and one persisted `creativeSeed`;
- exactly four ordered 8-second 9:16 `SMARTPHONE_POV` scenes;
- reviewer face forbidden and valid one/two-hand declarations;
- exactly one eligible Primary Action per scene;
- grounded insights, affordances, references, dialogue, Key Points, and SFX;
- exact applicable state continuity;
- useful camera/focus diversity without cinematic behavior;
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

The companion plan's pre-Flow tranche is complete only when all eleven review gates independently pass, V1 remains operational, the qualification matrix covers representative simple and functional products/actions, and the final pre-Flow gate proves that no generation can occur before all four Scene Cards pass audit. Positive functional fixtures use explicit test-only capability maps; the production path remains blocked for any action lacking trusted authority.

Active V1.2 runtime cutover additionally requires a separately authorized post-Flow compatibility tranche for versioned Candidate mapping, V1.2-aware QC input binding, selective repair, Final Acceptance, and Delivery. That tranche must reuse or strengthen the current fail-closed decisions, retain exact approved four-MP4/eight-Key-Point delivery, and prove that the new action/state/reference/camera/realism/SFX fields cannot bypass approval. Until that work passes, V1.2 `READY_FOR_FLOW` is a pre-Flow architecture authority only and V1 remains the active end-to-end runtime.

This document authorizes architecture and future scoped implementation planning only. It does not authorize runtime implementation, provider calls, Flow generation, voice changes, frontend changes, persistence changes, or validator weakening in this documentation checkpoint.
