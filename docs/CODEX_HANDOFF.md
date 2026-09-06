# MochiV1 — Detailed Codex Handoff

Date: 2026-09-06
Handoff target: Codex repo-wide implementation agent
Project state: M0 skeleton exists; next objective is reproducible baseline, then feasibility benchmark foundation
Canonical direction: repo-first, POV Authentic On-Hand V1

---

## 1. Executive summary

MochiV1 is a production-oriented AI tool for TikTok Affiliate product review videos.

The first version is deliberately **not** a full-face KOC generator. V1 is **POV Authentic On-Hand Review**: realistic hands, real-world environment, smartphone/POV camera language, product interaction, Vietnamese KOC-style voice-over, no visible face required.

The primary engineering objective is not "generate a video". It is:

Input -> validated product truth -> continuity-aware 4-scene plan -> feasibility preflight -> production contract -> generation candidate -> QC -> repair/retry when needed -> only approved output -> final sellable video.

"One-click success" is a UX outcome, not a single-model-call constraint. Internal retries and repairs are allowed. Final visible critical defects are not.

---

## 2. Strategic decisions that are LOCKED

1. Build our own repository from scratch. Do not fork another app as the product base.
2. GitHub repository is the source of truth.
3. Gemini 3.5 Flash on the Gemini Free Tier is the intelligence and multimodal-analysis provider only.
4. Google Flow is the video renderer because Flow credits are the approved video-generation resource.
5. Flow-specific implementation must be isolated behind an adapter/provider.
6. Flowboard is a donor/reference for Flow auth/project/upload/mediaId/Omni/polling, not the product architecture.
7. ClipForge is a donor/reference for product fidelity, UGC planning, continuity and QC concepts.
8. TVC Director is a donor/reference for shot grammar/camera/storyboard concepts.
9. V1 is POV Authentic On-Hand only. No KOC face.
10. UI is intentionally minimal and must not consume project focus.
11. Quality outranks cost and speed.
12. The first commercial milestone is V1.2, not V1.0.

---

## 3. Product roadmap

### Pre-build / Feasibility

#### FEN V1 FEASIBILITY SPIKE
Prove the hardest assumption empirically:

Can the Flow video runtime consistently produce realistic hand-product interaction while preserving product fidelity for representative packaging/action types?

#### FEN V1 FEASIBILITY LOCK
Gate passes only after representative real benchmarks establish a Safe Action Grammar.

### V1.0 — Continuity-aware On-Hand generation

- Product input contracts
- Product truth/evidence
- Blueprint
- Global continuity state
- 4-scene planner
- feasibility engine
- deterministic production compiler
- runtime candidate generation

Continuity and QC lifecycle semantics exist from day one; they are not later retrofits.

### V1.1 — Reliability Hardening

- automated QC gates
- failure classification
- local edit vs regenerate vs re-plan policy
- selective retry
- candidate ranking

### V1.2 — First Sellable Video

- stronger product fidelity
- first-frame gate
- cross-scene continuity enforcement
- start/end handoffs
- final assembly
- stable voice-over track
- ready-to-upload 9:16 MP4

At V1.2 the user can manually upload to TikTok and attach a product cart.

### V1.3 — Scale / cost optimization

Only after quality is stable:

- caching
- parallelism
- batch
- draft resolution strategy
- credit optimization
- latency optimization
- asset reuse

### V2+

V2: Advanced On-Hand
V3: Hybrid KOC
V4: Full KOC
V5: Autonomous affiliate factory / posting pipeline

Do not pull V2+ scope into V1.

---

## 4. Why On-Hand is V1

Full KOC can theoretically achieve stronger human connection, but it adds major AI failure surfaces:

- face identity
- eyes/gaze
- facial micro-expression
- mouth/teeth
- lip-sync
- head/body motion
- full-character consistency
- uncanny-valley risk

On-Hand reduces the active visual problem to:

- hands
- product
- interaction
- physics
- camera
- environment

This improves expected generation reliability, product visibility and scalability across SKUs.

Hands are therefore the V1 character identity.

---

## 5. Quality definition

Locked priority:

1. Correctness
2. Product fidelity
3. Human realism
4. Requirement adherence
5. Continuity
6. Reliability
7. Maintainability
8. Cost
9. Speed

A scene can look beautiful and still fail.

Critical failures include, at minimum:

- wrong SKU / product identity
- severe product geometry drift
- severe hand/anatomy defect
- required physical action not completed
- impossible physics / grip
- hallucinated product fact
- unexplained continuity reset
- major visible generation artifact

Do not average critical defects away with a high overall score.

---

## 6. Current exported repository state

Root package:

- name: `mochi-v1`
- version: `0.0.1`
- npm workspaces: `apps/*`, `packages/*`
- Node engine: `>=22`

Current tree:

- `apps/harness` — dry feasibility harness
- `apps/web` — minimal React/Vite status UI
- `packages/contracts` — core domain contracts and validation
- `packages/core` — feasibility, continuity carryover, lifecycle helpers
- `packages/providers` — provider-agnostic video-provider interface
- `tests/fixtures` — fixture placeholder
- `docs` — architecture and project handoff

Important export facts:

- The exported folder currently has no `node_modules`.
- The exported folder currently has no `package-lock.json`.
- The exported folder may not itself contain `.git`; GitHub remains the intended source of truth once placed in the real worktree.
- A prior environment validated the non-web M0 core logic, but the handoff agent must re-run the full reproducible baseline in its own environment.
- `docs/M0-ACCEPTANCE.md` describes the target M0 acceptance requirements. Treat it as a specification until commands prove them in the current worktree.

Do not assume "M0 PASS" without re-running.

---

## 7. Existing contracts

Current `packages/contracts/src/index.ts` defines:

### Versioning

- `SCHEMA_VERSION = '1.0.0'`

### AssetRef

Logical asset identity. Current fields include:

- `assetId`
- role
- source
- mimeType
- optional hash/view angle/quality

Core sees only logical assets and provider-agnostic metadata. Provider and infrastructure layers resolve logical IDs to provider-specific URIs or media IDs; those bindings must never be stored on `AssetRef`.

### ProductInput

Includes:

- productId
- name
- details
- category
- assets

### CreativeDirectionInput

Contains user-production controls kept separate from product truth:

- audience
- shooting context
- reviewer persona
- tone and voice style
- voice gender and region

### MochiProjectInput

The canonical project boundary combines schema version, project ID, factual `ProductInput`, and `CreativeDirectionInput`. It contains logical assets only; it never contains provider identifiers, upload bytes, `File`/`Blob` values, credentials, or local file-system paths.

### ProductEvidence

Includes canonical asset IDs, identity/geometry/color/label notes, allowed claims and prohibited inferences.

### GlobalContinuityState

Contains immutable:

- productId
- hand identity
- environment
- camera family
- voice identity

And current physical state.

### PhysicalState

Currently includes:

- productState map
- propState map
- heldBy
- productOrientation
- productPosition

### ActionId

Current controlled action vocabulary:

- REACH
- PICK_UP
- HOLD
- MOVE_CLOSER
- ROTATE_SLOW
- PLACE_DOWN
- OPEN_SIMPLE
- PRESS_BUTTON
- POUR_SIMPLE
- APPLY_SIMPLE
- POINT

This list is a hypothesis set, not an approved action grammar. Every action starts UNTESTED.

### ScenePlan

Locked V1 fields currently include:

- scene index 1..4
- role HOOK / FEATURE / PROOF / CTA
- duration 8
- aspect 9:16
- primary objective
- dialogue
- start state
- action steps
- end state
- transition type
- required assets

### SceneProductionContract

Provider-agnostic production contract with:

- scene
- deterministic production prompt
- HARD/SOFT/FREE constraints
- logical reference asset IDs
- optional first/last frame logical asset IDs
- compiler version

### GeneratedCandidate

Generation is Candidate-only, with status:

- GENERATED
- QC_PENDING
- APPROVED
- REJECTED

### QCReport

Current QC gates include:

- PRODUCT_IDENTITY
- PRODUCT_GEOMETRY
- HAND_ANATOMY
- ACTION_COMPLETION
- PHYSICS
- ENVIRONMENT
- CAMERA
- FACTS
- AUDIO
- CONTINUITY
- ARTIFACTS

Failure classes:

- NONE
- LOCAL_DEFECT
- STRUCTURAL_DEFECT
- CONTRACT_DEFECT

Preserve this fail-closed architecture.

---

## 8. Existing core behavior

Current `packages/core/src/index.ts` defines:

### ActionCapabilityMap

Capability levels:

- UNTESTED
- SAFE
- RISKY
- AVOID

`createUntestedActionCapabilityMap()` returns every known action as UNTESTED.

This behavior is LOCKED.

### evaluateSceneFeasibility

Current policy:

- sums action complexity
- fails if total exceeds budget
- fails on UNTESTED
- fails on AVOID

Future policy may become product-archetype-specific, but do not weaken fail-closed behavior.

### validateStateCarryover

Detects unexplained mismatches between previous END state and next START state.

Long term it must work with explicit transition semantics and allowed hidden transitions, but current behavior is the baseline.

### lifecycle

PLANNED -> PREFLIGHT_PASS -> GENERATING -> GENERATED -> QC_PENDING -> APPROVED | REJECTED

Direct GENERATED -> APPROVED is forbidden.

This is LOCKED.

---

## 9. Existing provider boundary

Current `packages/providers/src/index.ts` defines provider capabilities:

- referenceToVideo
- firstFrame
- firstAndLastFrame
- statefulEdit
- portrait9x16
- supported durations

`VideoProvider.generate()` consumes:

- a provider-agnostic SceneProductionContract
- resolved logical assets

Provider-specific fields must never be added to core domain contracts for convenience.

If a required capability is unavailable, use a capability error. Do not silently degrade to a different generation mode.

---

## 10. Existing dry harness

`apps/harness/src/index.ts` currently creates a bottle PICK_UP fixture.

It loads the default ActionCapabilityMap, where PICK_UP is UNTESTED.

Expected M0 behavior:

- feasibility returns `passed = false`
- reason includes `action_untested:PICK_UP`

This dry failure is intentional and correct.

Do not change it to PASS just to make the demo green.

---

## 11. Current test intent

Existing domain tests verify:

- ProductInput rejects missing assets
- ScenePlan locks 8 seconds
- ScenePlan locks 9:16
- Feasibility fails closed for UNTESTED actions
- Feasibility can pass after an explicit SAFE classification
- Continuity catches an unexplained product-state reset
- Lifecycle cannot skip QC

Existing web test only verifies that feasibility lock is shown as blocked.

Tests are small by design because M0 is a skeleton, not a finished implementation.

---

## 12. Continuity architecture

Continuity is a state machine, not visual similarity.

Definition of PASS:

A reasonable viewer should believe the 4 scenes were filmed by the same person, using the same product, in the same review session, with a physically plausible sequence of actions.

Continuity layers:

1. product
2. hand/human
3. environment
4. camera
5. action
6. temporal
7. narrative
8. audio

For V1, the first five are critical.

### Immutable state

Must not drift without an explicit architectural decision:

- product identity
- product geometry/color family
- hand identity
- nail style
- jewelry
- environment family
- lighting family
- camera family
- voice identity

### Mutable state

May change only through valid action or explicit hidden transition:

- cap closed/open
- box sealed/opened
- product table/hand
- device off/on
- prop positions

No unexplained reset.

### Scene contract

Every scene is:

START STATE -> ACTION -> END STATE

### Transition types

- CONTINUOUS
- MATCH_CUT
- JUMP_CUT

V1 principle:

**STATE CONTINUITY > PIXEL CONTINUITY**

Intentional TikTok cuts are preferred over forcing a fake 32-second seamless take.

---

## 13. Physical action policy

This is the most important empirical risk in V1.

Do not let a planner invent unrestricted hand choreography.

Core rule:

**One scene = one primary physical objective.**

Example preferred temporal envelope:

- 0-2s approach
- 2-5s primary action
- 5-8s natural hold / inspection

### Complexity

Action complexity is structured data.

The exact scoring/promotion rules are not final and should be informed by real benchmark evidence.

### Capability Map

The feasibility spike must produce evidence across representative product archetypes, e.g.:

- bottle
- tube
- box
- device
- soft package

And actions such as:

- hold
- pick up
- move closer
- slow rotate
- open simple
- simple demo
- place down

Do not promote capability based on intuition or one lucky clip.

---

## 14. Golden benchmark design

M1 should establish reproducible benchmark data structures before real model calls.

Recommended additions:

### Product archetype fixture

A tracked deterministic metadata fixture describing:

- fixture ID
- archetype
- product truth
- expected reference roles
- allowed claims
- prohibited inferences
- physical risk notes

Do not fabricate product image content if real images are not present.

### BenchmarkCase

Recommended fields:

- benchmarkCaseId
- fixture/product ID
- action ID
- scene contract ID/version
- provider target
- model target
- expected invariants
- attempt number

### BenchmarkObservation

Recommended evidence dimensions:

- product fidelity
- hand anatomy
- action completion
- physics
- camera realism
- unexpected cuts
- visible artifacts
- reviewer notes
- final verdict

### CapabilityEvidence

Promotion must be evidence-backed and reviewable.

Do not let a single generation automatically set a global action to SAFE.

The exact evidence threshold should be explicit and testable.

---

## 15. Feasibility spike acceptance

The spike does not need a polished UI.

It needs:

- deterministic input manifest
- real provider execution when credentials/assets are available
- output artifact references
- per-attempt metadata
- repeatable QC observation format
- aggregate capability summary
- no silent errors
- no fake SAFE promotion

The output of the spike is the **Physical Action Capability Map**, supported by evidence.

Only then is FEN V1 FEASIBILITY LOCK eligible to pass.

---

## 16. Provider order and separation

### M2-A: Gemini 3.5 Flash Free Intelligence Provider

Purpose:

- product image understanding
- structured multimodal analysis
- future video analysis and QC support
- model/config validation
- provider error normalization

Implement behind a dedicated intelligence-provider interface. Keep credentials in environment variables only. Gemini intelligence must never implement or be substituted for `VideoProvider`.

Do not implement Product Evidence, Planner or full QC in M2-A. The milestone establishes the boundary only.

### R0 input and reasoning stages

After M2-A, the locked order is R0-A Canonical Project Input Contracts, R0-B apps/web Input Surface, then the reasoning pipeline. Gemini remains intelligence-only throughout. Local/free TTS is the default future voice direction and will be benchmarked separately.

### M2-B: Google Flow Video Canary

Purpose:

- production renderer
- use Flow credits

Do NOT implement Flow before the R0 stages and reasoning pipeline are stable. Google Flow remains the only planned video renderer and consumes Flow credits.

Later Flow adapter responsibilities include:

- auth/session bridge
- Flow project
- upload
- mediaId resolution
- reference images
- generation dispatch
- polling
- result ingestion
- credits/paygate metadata
- provider error mapping

Flow internals remain isolated.

---

## 17. First-frame strategy

First-frame preflight is strongly preferred before expensive video generation.

Concept:

product refs + hand/environment refs -> first frame -> image QC -> PASS -> video

Use first-frame QC to catch:

- wrong product
- wrong hand
- wrong environment
- wrong framing
- wrong scale
- obvious logo/geometry problem

If first frame fails, do not generate the video.

Do not synthesize a new anchor when a real source image is already a better source of truth.

---

## 18. Product truth vs creative direction

These must remain separate.

Product Truth includes:

- identity
- geometry
- color
- packaging
- allowed facts/claims
- prohibited inferences

Creative Direction includes:

- camera framing
- action timing
- scene role
- visual composition
- narrative emphasis

Creative systems may not invent new product facts.

This separation is a major anti-hallucination boundary.

---

## 19. Voice strategy

V1 should not depend on video-model native Vietnamese speech for correctness.

Preferred architecture:

visual generation -> separate persistent Vietnamese voice-over -> assembly

Voice contract should eventually preserve:

- speaker identity
- gender
- region
- tone
- pace
- energy
- exact script

Do not couple voice identity to the video provider.

---

## 20. QC architecture direction

Generation candidate must be evaluated across decomposed gates.

Suggested future layers:

### Frame QC

- product identity
- product geometry
- hand anatomy
- environment
- artifacts

### Temporal QC

- action completion
- morphing
- physics
- unintended cuts

### Contract QC

- scene purpose
- required action
- prohibited behavior
- product facts

### Cross-scene QC

- product
- hand
- state
- environment
- lighting
- narrative

One critical gate failure blocks release.

Do not build the full automated QC engine before the feasibility foundation is stable, but preserve the lifecycle and contracts from M0.

---

## 21. Repair direction

Future failure classifier:

### LOCAL_DEFECT

Examples:

- slightly wrong scale
- minor background issue
- minor lighting issue

Preferred response:

- stateful/local edit when supported

### STRUCTURAL_DEFECT

Examples:

- malformed hand
- product morphing
- impossible grip

Preferred response:

- regenerate scene

### CONTRACT_DEFECT

Examples:

- physical action too complex
- impossible scene plan

Preferred response:

- return to feasibility/planner

Do not repeatedly re-run the same prompt without diagnosis.

---

## 22. UI requirements

Keep it basic.

Target:

- desktop-first
- readable
- static
- plain cards/tables/forms
- no required animation
- no fancy transitions
- no node graph
- no infinite canvas
- no timeline editor in V1

Eventually the UI needs only enough to:

- enter product data
- view product refs/evidence
- build Blueprint
- inspect 4 scenes
- produce scene(s)
- see lifecycle/QC status
- preview approved video
- inspect debug contract/JSON/prompt/reason

Do not spend milestone time polishing UI.

---

## 23. Security / secret policy

Never commit:

- API keys
- bearer tokens
- browser session tokens
- private Flow auth material
- `.env`

Provider runtime secrets must be environment-only.

Do not log full bearer/session tokens.

The later Flow bridge requires extra care because it is browser/session-coupled.

---

## 24. Reproducibility / observability direction

Every real GeneratedCandidate should eventually be traceable to:

- project version
- blueprint version
- scene contract version
- compiler version
- provider
- model
- model config
- references
- seed when supported
- operation/request ID
- timestamps
- QC report
- repair history

This does not all need to be implemented in M1, but do not design data structures that make it impossible.

---

## 25. Immediate Codex sequence

### Task 0 — Reproduce M0

This is the current immediate task.

Read `CODEX_START_HERE.md` and do only baseline verification.

PASS requires actual command evidence in the current environment.

### M1 — Golden Fixture + Benchmark Evidence Foundation

Only after M0 is verified.

Objective:

Create the typed fixture/benchmark/evidence model and a deterministic non-network benchmark runner foundation.

M1 should NOT claim any action is SAFE.

Acceptance should include tests proving:

- benchmark metadata is schema-versioned
- no real evidence => no capability promotion
- action capability remains UNTESTED by default
- invalid/missing fixture evidence fails closed
- tracked fixtures contain product truth metadata but no fabricated visual evidence

### M2-A — Gemini 3.5 Flash Free Intelligence Provider

Only after M1 PASS.

Objective:

Establish a separate intelligence-provider boundary for Gemini 3.5 Flash Free Tier with typed provider-neutral output, environment-only configuration and normalized errors.

Must preserve:

- no provider leakage into Core
- no silent fallback
- no Gemini implementation of `VideoProvider`
- no action-capability promotion from intelligence output
- mock/stub tests only during the provider-foundation milestone

### R0-A — Canonical Project Input Contracts

Only after M2-A PASS.

Objective:

Add provider-neutral `MochiProjectInput` from separate factual ProductInput and CreativeDirectionInput concerns.

Do not implement apps/web, a backend, Flow, voice, Product Evidence, or a planner.

### R0-B — apps/web Input Surface

Only after R0-A PASS.

Objective:

Expose the canonical project input through the minimal application surface.

### R1-A — Product Evidence Engine

Only after R0-B PASS.

Objective:

Build the provider-neutral product-evidence path through the intelligence abstraction with mock/stub verification. Gemini 3.5 Flash remains reasoning-only; no video generation may be added.

### R1-B1 — Intelligence Trust Boundary

Only after R1-A PASS.

Objective:

Separate authoritative intelligence rules from untrusted product input before the first live intelligence call. Provider instructions contain fixed policy only; sanitized factual input travels independently as data. Do not make live calls in this step.

### R1-B2 — Server-side live Gemini bridge

Only after R1-B1 PASS and separately authorized provider configuration.

Objective:

Connect the validated provider-neutral evidence path to Gemini through a server-side bridge without exposing credentials or provider details through apps/web.

### M2-B — Flow Video Canary

Only after R1-B2 is stable and when real product references plus Flow runtime access are available.

Objective:

Wire the first real video canary through a Flow-backed `VideoProvider` and validate explicit 8-second, 9:16 reference-conditioned generation.

Must preserve:

- all Flow identifiers inside adapter/infrastructure code
- no silent fallback
- no automatic SAFE classification from a single successful generation
- all generated files remain Candidates

### M3 — Safe Action Grammar

Use actual benchmark evidence to classify action × product-archetype capability.

Do not start Product Evidence / Planner before the feasibility gate is genuinely understood.

---

## 26. What Codex must NOT do now

Do not:

- redesign the repo into a different framework
- migrate to a different language
- build a polished UI
- implement KOC face
- implement TikTok posting
- implement CapCut automation
- implement full Flow adapter
- optimize credits
- add batch generation
- make all actions SAFE for convenience
- bypass QC lifecycle
- remove 8s / 9:16 locks
- put Flow media IDs in core contracts
- add a chain of LLM prompt-polishing calls
- replace empirical feasibility with hardcoded assumptions

---

## 27. Preservation locks for first implementation stages

When modifying M0/M1, preserve all of the following unless an explicit approved architecture change says otherwise:

- `SCHEMA_VERSION` discipline
- provider-agnostic asset/production contracts
- ActionCapabilityMap default UNTESTED
- UNTESTED/AVOID fail-closed feasibility
- lifecycle cannot skip QC
- 8-second scene constraint
- 9:16 constraint
- 4 scene role model
- continuity START/ACTION/END semantics
- minimal UI

Any necessary breaking contract change must include:

- rationale
- schema migration/version decision
- tests
- documentation update

---

## 28. Definition of "one-click success"

Incorrect interpretation:

"The model must generate a perfect clip on the first API call."

Correct interpretation:

"The user clicks Produce once. MochiV1 internally validates, generates, evaluates, repairs/regenerates when needed, and releases only an output that passes all critical gates."

This definition should guide architecture decisions.

---

## 29. Commercial outcome

The first business-relevant endpoint is V1.2:

Product Input
-> Blueprint
-> four approved On-Hand scenes
-> complete Vietnamese voice-over
-> coherent continuity
-> final 9:16 MP4
-> manually upload to TikTok
-> manually attach product cart

Auto-publish/cart attachment is much later scope.

---

## 30. Recovery checkpoints

Use these exact names in docs/status where useful:

- FEN V1 FEASIBILITY LOCK
- FEN V1 FOUNDATION
- FEN V1 ON-HAND LOCK
- FEN V1 RELIABILITY LOCK
- FEN V1 PRODUCTION LOCK
- FEN V2 START
- FEN V3 HYBRID KOC
- FEN V4 FULL KOC

Current focus is before FEN V1 FEASIBILITY LOCK.

---

## 31. Success criteria for Codex as builder

Codex should act as an implementation engineer, not an autonomous product strategist.

For each task:

1. identify the exact affected module(s)
2. preserve unrelated stable behavior
3. implement the smallest complete change
4. add/update tests
5. run typecheck/test/build relevant to the change
6. report PASS/FAIL with exact evidence
7. stop at the milestone boundary

Do not race ahead because implementation is easy.

The project intentionally values correctness and reproducibility over speed.
