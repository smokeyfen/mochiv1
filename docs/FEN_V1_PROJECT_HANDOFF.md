# FEN Review — Project Handoff

Date: 2026-09-06
Status: Canonical working handoff
Primary baseline: FEN V1 FEASIBILITY LOCK -> FEN V1 FOUNDATION

---

## 1. Project Goal

Build a production-grade AI tool for TikTok Affiliate product review videos.

The first production target is NOT a full-face KOC. V1 is:

**POV Authentic On-Hand Review**

Desired user experience:

Product input
-> Build Blueprint
-> Produce
-> internal planning / validation / generation / QC / repair
-> 4 approved scenes
-> final ready-to-upload video
-> user manually uploads to TikTok and attaches product cart

The user should experience "one-click success", but internally the system may validate, reject, regenerate, repair, or rank multiple candidates.

Core principle:

**Zero visible defect in final released output is the target. Zero model-generation failure is not required or realistic.**

---

## 2. Strategic Direction

### Source of truth

GitHub repo = source of truth

Gemini 3.5 Flash Free Tier = intelligence / multimodal-analysis provider only

Google Flow = production video renderer

Flow credits = preferred production generation resource

The product should be built from scratch in our own repo. Existing open-source repos are donors/references, not the product base.

### Why repo-first

- Easier architecture control
- Easier testing and rollback
- Clear contracts between engines
- Easier model/provider switching
- Gemini can be used for provider-isolated intelligence and multimodal analysis
- Flow remains the separate video renderer
- Avoid coupling business logic to Flow internals

---

## 3. Open-Source Repos and Their Roles

### Flowboard
Use as donor/reference for:

- Google Flow browser-session authentication bridge
- Chrome extension / WebSocket bridge
- Flow project creation
- Flow asset upload
- Flow mediaId handling
- Nano Banana image generation
- Veo generation
- Omni Flash generation
- referenceImages[]
- async polling
- credits / paygate detection

Do NOT use Flowboard as the final application architecture.

Reason:
Flowboard is generic infinite-canvas/node-graph software, while FEN is a deterministic product-review production pipeline.

### ClipForge
Use as donor/reference for:

- Product truth
- Product fidelity ideas
- UGC realism
- multi-scene planning
- continuity ideas
- quality gates
- selective scene repair
- candidate versions
- production-control concepts

Do not use its rendering/provider architecture as the core.

### TVC Director
Use as donor/reference for:

- shot grammar
- camera language
- storyboard logic
- production direction
- prompt compilation concepts

### Other repos reviewed
Open-AI-UGC, OpenShorts, Atlas Marketing Studio, n8n UGC generator, UGC-ads, short-video-factory, etc.

They are useful references, but most depend on external paid APIs such as MuAPI, fal.ai, Atlas Cloud, ElevenLabs, VEED, etc., so they are not preferred as the base if Flow credits are the production resource.

---

## 4. Why V1 = POV Authentic On-Hand Review

Two directions were considered:

1. Full KOC review
2. On-hand review

Decision:

**V1 will focus entirely on POV Authentic On-Hand Review.**

Reason:

Full KOC has a higher theoretical conversion ceiling if perfectly generated, but it adds many failure modes:

- facial identity
- eyes
- facial micro-expression
- teeth / mouth
- lip-sync
- head/body motion
- full identity consistency
- human uncanny-valley risk

On-hand removes most of those and focuses the model on:

- hands
- product
- interaction
- physics
- camera
- environment

This gives better:

- generation reliability
- product visibility
- product fidelity
- AI realism
- scalability across SKUs
- chance of approved output after internal QC

The desired format is not a sterile product commercial. It should look like a real creator filming a product without showing the face.

V1 style:

- real-world location
- human hands
- smartphone POV
- natural camera imperfections
- real product interaction
- natural Vietnamese KOC-style voice-over
- product proof/demo
- no face required

---

## 5. Version Roadmap

### V1
**POV Authentic On-Hand Review**

First production-grade system.

### V1.1
**Reliability Hardening**

- automated QC
- failure classification
- retry policy
- repair strategy
- selective regeneration
- candidate ranking

### V1.2
**Fidelity + Continuity + First Sellable Video**

- advanced product fidelity
- first-frame gate
- start/end state
- scene handoff contracts
- cross-scene continuity QC
- final assembly
- ready-to-upload MP4

This is the first milestone at which a finished TikTok Affiliate video should be ready to upload manually and attach product cart.

### V1.3
**Scale & Cost Optimization**

Only after quality is stable:

- cache
- parallelism
- batch generation
- Flow credit optimization
- 360p draft strategy
- upscale
- latency optimization
- asset reuse

### V2
**Advanced On-Hand**

More controlled formats:

- unboxing
- POV usage
- desk review
- kitchen demo
- bathroom demo
- bedroom/lifestyle
- before-after
- close-up proof
- category-specific action grammars

### V3
**Hybrid KOC**

Add limited KOC face in controlled scenes.

Example:

Scene 1: on-hand
Scene 2: on-hand
Scene 3: product proof
Scene 4: optional KOC face

### V4
**Full KOC Review**

Only after reliability is high enough:

- persistent character identity
- face
- eye gaze
- micro-expression
- body dynamics
- lip-sync
- exact dialogue
- hands + product + face consistency

### V5
**Autonomous Affiliate Factory**

Product
-> research
-> creative variants
-> video
-> QC / repair
-> edit
-> caption
-> schedule
-> upload
-> cart/product linking
-> performance feedback loop

---

## 6. First Commercial Milestone

The first video that can be uploaded to TikTok and manually attached to product cart should arrive at:

**V1.2 — First Sellable Video**

Required output:

- 4 scenes
- each scene approved
- 9:16
- stable product identity
- stable hand identity
- coherent continuity
- complete voice-over
- final assembled MP4
- no visible critical defect
- ready to upload

V1.3 is not required for first commercial testing. It is optimization.

---

## 7. Quality Priority

Locked priority order:

1. Correctness
2. Product fidelity
3. Human realism
4. Requirement adherence
5. Continuity
6. Reliability
7. Maintainability
8. Cost
9. Speed

Do not optimize credits or latency before quality is stable.

---

## 8. Product Architecture

Recommended structure:

fen/
  apps/
    studio/

  engines/
    input/
    blueprint/
    evidence/
    planner/
    feasibility/
    realism/
    production/
    preflight/
    qc/
    repair/
    delivery/

  providers/
    intelligence/
    image/
    video/

  adapters/
    ai-studio/
    flow/

  contracts/

  tests/
    unit/
    integration/
    regression/
    golden/
    e2e/

  fixtures/
    products/

Every engine should have:

Input Contract
-> Process
-> Output Contract
-> Validator
-> Tests
-> Lock

---

## 9. Existing FEN Architecture Concepts to Preserve

The previous FEN architecture already had strong separation:

- Input
- Blueprint
- Reference Evidence
- Global Scene Planner
- Human Realism
- Production Contract
- Video Runtime

The rebuild should preserve these ideas while adding missing reliability layers.

Important previous concepts:

### Blueprint
Committed, versioned project state.

### Reference Evidence
Product references are analyzed and converted into structured evidence, not treated as anonymous attachments.

### Global Scene Planner
All 4 scenes are planned together rather than independently.

### Human Realism
Actions must be natural and plausible.

### Production Contract
Deterministic contract consumed by runtime.

Key principle:

**Planner != Compiler != Runtime**

Avoid unnecessary AI-on-AI polishing layers.

Anything deterministic should be compiled by code.

---

## 10. New Engines Required for V1

### Scene Feasibility Engine

Critical addition.

Its job is to reject or simplify scenes that are physically too complex before video generation.

Bad example:

- open cap
- rotate bottle
- show logo
- squeeze product
- transfer cap
- point to label
- all in one 8-second scene

Preferred:

One scene = one primary physical objective

Example:

0-2s approach
2-5s primary action
5-8s natural hold / inspection

### Action Grammar

V1 should use a controlled action vocabulary rather than unlimited free-form physical actions.

Examples:

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

The real capability map should be determined experimentally, not guessed.

---

## 11. FEN V1 Feasibility Spike

Before building the full application, test the hardest assumption:

**Can the Google Flow video runtime consistently generate realistic hand-product interaction with product fidelity?**

This phase comes before FEN V1 FOUNDATION.

Suggested product archetypes:

- bottle
- tube
- box
- device
- soft package

Suggested actions:

- pick up
- hold
- slow rotate
- open
- simple demo
- place down

Record:

- product fidelity
- hand defects
- action completion
- physics
- camera realism
- unexpected cuts
- AI artifacts

Result:

Create a **Physical Action Capability Map**

Each action becomes:

- SAFE
- RISKY
- UNSUPPORTED / AVOID

Only SAFE and acceptable RISKY actions enter V1 Scene Grammar.

Checkpoint:

**FEN V1 FEASIBILITY LOCK**

Achieved only when product-reference + on-hand action + Google Flow video generation + 9:16/8s works sufficiently well across representative product types.

---

## 12. Continuity Strategy

Continuity is not "all scenes look identical."

Definition:

The viewer should believe all 4 scenes were filmed by the same person, using the same product, in the same review session, with a physically plausible sequence of actions.

### Continuity layers

1. Product continuity
2. Human/hand continuity
3. Environment continuity
4. Camera continuity
5. Action continuity
6. Temporal continuity
7. Narrative continuity
8. Audio continuity

For V1, the first five are critical.

---

## 13. Global Continuity State

Continuity should be state-driven.

Example:

environment:
- location
- table/surface
- background
- lighting direction
- lighting temperature

human:
- skin tone
- dominant hand
- nail style
- jewelry
- sleeve if visible

product:
- exact identity
- geometry
- color
- label orientation
- scale

camera:
- smartphone POV
- natural lens
- height
- handheld behavior

voice:
- speaker identity
- region
- tone
- speaking rate
- energy

---

## 14. Immutable vs Mutable State

### Immutable

Must not change between scenes:

- product identity
- product geometry
- product color
- hand identity
- nail style
- jewelry state
- environment
- lighting family
- camera family
- voice identity

### Mutable

Changes only through valid actions:

- cap closed -> open
- box sealed -> opened
- product table -> hand
- device off -> on
- product full -> partially used if intentionally shown

Mutable state must have causal history.

No unexplained reset.

---

## 15. Scene State Contract

Each scene should have:

START STATE
-> ACTION
-> END STATE

Example:

Scene 2

start:
- bottle in right hand
- label forward
- cap closed

action:
- left hand removes cap
- right hand stabilizes bottle

end:
- bottle open in right hand
- cap in left hand

Scene 3 start must respect the previous end state unless a valid jump-cut hidden action is declared.

---

## 16. Scene Handoff Contract

Scenes should not be independent objects.

Scene 1
-> handoff 1->2
-> Scene 2
-> handoff 2->3
-> Scene 3
-> handoff 3->4
-> Scene 4

Handoff defines required carry-over state.

Examples:

- product state
- hand
- cap state
- orientation
- prop position

---

## 17. Continuity Transition Types

V1 only needs three:

### CONTINUOUS
Next scene begins almost exactly from previous end state.

### MATCH_CUT
Composition can change, but important object/state constraints carry over.

### JUMP_CUT
Allows reasonable hidden actions between shots while preserving invariants.

For TikTok, intentional hard/jump cuts are preferred over forcing all 4 scenes into a fake seamless continuous shot.

Core principle:

**STATE CONTINUITY > PIXEL CONTINUITY**

---

## 18. Hand Identity = Character Identity in V1

Because no face exists in V1, hands become the character.

Lock:

- skin tone
- hand proportions
- nail length
- nail color
- jewelry
- dominant hand
- sleeve if visible

If Scene 1 has natural nails/no ring and Scene 3 suddenly has long polished nails/ring, continuity fails.

---

## 19. Product Orientation and Prop State

Product orientation should be structured, not vague.

Examples:

- front-facing
- 45-degree clockwise
- side view
- cap-up
- cap-down

Props need a state ledger.

Example:

BOX:
- Scene 1 closed
- Scene 2 open
- Scene 3 open/empty
- Scene 4 open in background

CAP:
- attached
- removed
- placed left
- remains left unless intentionally changed

---

## 20. Camera and Lighting Continuity

Camera can vary by shot:

- medium POV
- close-up
- macro demo
- medium POV

But remain in the same family:

- smartphone
- handheld
- natural perspective
- same environment
- same lighting logic

Avoid mixing:

- amateur smartphone POV
- cinematic dolly
- studio macro
- DSLR commercial shallow depth

Lighting should preserve:

- source
- direction
- temperature
- intensity range
- shadow softness

---

## 21. Narrative Continuity

Dialogue/story claims must not contradict themselves.

Example of bad continuity:

Scene 1: "I just bought this"
Scene 2: "I've used it for a month"
Scene 3: "This is my first time"

Global narrative state should include:

- reviewer relationship to product
- experience claim
- allowed claims
- prohibited claims
- buying reason

---

## 22. Voice Strategy

V1 should separate voice-over from video generation.

Preferred pipeline:

VideoProvider / Google Flow
-> visual / optional ambient audio

Voice Engine
-> exact Vietnamese voice-over

Assembly
-> mix

Benefits:

- exact script
- stable speaker
- stable gender/region
- stable tone
- better audio continuity
- no dependence on native video speech reliability

The voice may be generated as one continuous narration or from the same persistent voice identity across scenes.

---

## 23. First Frame Gate

Strongly recommended.

Pipeline:

Product refs
+ hand/environment refs
-> generate or prepare first frame
-> image QC
-> PASS
-> video generation

Catch before spending video generation:

- wrong product
- wrong hand
- wrong environment
- wrong framing
- wrong product scale
- logo/geometry problem

If first frame fails:

**DO NOT GENERATE VIDEO**

Do not synthesize a new first frame when a real source image already gives a better anchor.

---

## 24. Production Contract

Core should end at a provider-agnostic contract.

Example fields:

- sceneId
- duration
- aspectRatio
- role
- dialogue
- action
- camera
- product references
- hand references
- environment references
- start state
- end state
- transition type
- production prompt
- hard constraints
- soft constraints
- free variables

The core must not know:

- Flow mediaId
- Bearer token
- browser extension
- provider-specific endpoints
- Flow project internals

---

## 25. Constraint Levels

### HARD
Never violate:

- product identity
- critical product state
- hand identity
- critical prop state
- required action outcome

### SOFT
May drift slightly:

- camera position
- hand exact position
- product screen position
- minor framing

### FREE
Model may vary naturally:

- micro hand movement
- subtle camera shake
- small timing variations
- natural pauses
- minor background motion

Do not overconstrain every pixel. Excessive constraints can reduce realism and generation success.

---

## 26. QC Architecture

Generation output is never automatically final.

Candidate
-> Evaluation
-> Approved Output

States should exist from day one:

- PLANNED
- PREFLIGHT_PASS
- GENERATING
- GENERATED
- QC_PENDING
- APPROVED
- REJECTED

### Scene QC decomposition

#### Frame QC
- product identity
- product geometry
- anatomy
- environment
- artifacts

#### Temporal QC
- action completion
- morphing
- physics
- unintended cuts

#### Contract QC
- scene purpose
- required action
- prohibited behavior
- facts

#### Cross-scene QC
- product identity
- hand identity
- state continuity
- environment
- lighting
- narrative

One critical failure = scene/final output blocked.

Do not average scores in a way that hides critical defects.

---

## 27. Repair Strategy

Do not simply re-run the same prompt.

Failure Classifier decides:

### LOCAL DEFECT
Examples:
- product slightly too small
- small background issue
- minor lighting issue

Action:
- edit existing candidate when provider supports stateful edit

### STRUCTURAL DEFECT
Examples:
- malformed hand
- morphing product
- impossible grip

Action:
- regenerate scene

### CONTRACT / PLANNING DEFECT
Examples:
- action too complex
- scene physically impossible

Action:
- go back to Feasibility Engine / Planner

Selective repair only.

Do not regenerate all 4 scenes because one fails.

---

## 28. Candidate Strategy

"One-click success" may internally mean:

Candidate A
-> QC fail

Candidate B
-> QC pass

User only sees:

Scene 2 approved

The tool may generate multiple candidates, repair, or regenerate as needed.

---

## 29. Gemini Intelligence Strategy

Gemini 3.5 Flash on the Gemini Free Tier is used only for intelligence and multimodal analysis. GitHub remains the source of truth.

Use it for:

- product image understanding
- structured multimodal analysis
- future video analysis and QC support
- intelligence-provider integration verification

Do not use Gemini API for video generation and do not couple Gemini intelligence to `VideoProvider`.

---

## 30. Flow Strategy

Flow is the preferred production renderer because the goal is to use Flow credits.

Flow runtime should be isolated behind a FlowProvider / FlowAdapter.

Flow-specific responsibilities:

- auth/session
- project
- upload
- mediaId
- referenceImages[]
- model dispatch
- polling
- download/result ingestion
- credits/paygate
- runtime error mapping

Core business logic must remain independent.

Flowboard has already demonstrated an implementation pattern for:

- browser-session authentication
- Flow project
- mediaId
- referenceImages
- Omni generation
- polling

But because this is session/browser-coupled rather than a stable public SDK abstraction, the Flow adapter must be replaceable.

---

## 31. Intelligence Provider vs Video Provider

These are separate responsibilities:

- `IntelligenceProvider`: Gemini 3.5 Flash Free Tier for typed analysis
- `VideoProvider`: Google Flow for actual video generation

Gemini file URIs, upload IDs, request IDs, API details and credentials remain inside Gemini provider/infrastructure code. Flow session, media and operation identifiers remain inside the Flow adapter.

Core contracts contain neither provider's infrastructure identifiers.

---

## 32. Flow Video Runtime Assumption

The current project direction requires the Flow video runtime to be empirically tested for the capabilities needed by V1:

- 9:16
- reference-conditioned generation
- first-frame workflows
- first+last-frame workflows
- short scene durations such as 8 seconds
- repair/edit capabilities where available

The project must not trust capability claims alone. The Feasibility Spike must empirically establish what is actually safe.

---

## 33. Golden Regression Suite

Do not validate only one product.

Create a fixed test suite with different product types:

- cosmetics
- bottle
- food packaging
- electronics
- clothing
- baby product
- kitchen product
- transparent product
- reflective product
- small handheld product

Later every engine change must run regression.

If a new feature breaks previously stable products:

FAIL
Do not merge.

---

## 34. Release Reliability

Do not accept:

"Tested three times and looked okay."

Use progressively stronger gates:

- 10 consecutive approved generations
- 30 consecutive
- 50 consecutive
- multi-category regression
- stress testing

Critical visible defects should be effectively zero in the release test suite.

---

## 35. Development Rules

### One objective per change
Keep implementation prompts small.

### Preserve stable modules
No unrelated refactor during bug fixes.

### Test after each change
Each module needs explicit PASS/FAIL verification.

### Do not build batch too early
First:

Scene 1 PASS
Scene 2 PASS
Scene 3 PASS
Scene 4 PASS

Only later:
Produce All / batch.

### Do not optimize cost early
Credits and speed come after reliability.

### Do not use extra AI calls when deterministic code can compile the result
Avoid:
Planner AI -> Polisher AI -> Prompt improver AI -> another AI rewrite

Prefer:
Planner -> structured state -> deterministic compiler

---

## 36. Important Reality Check

Not realistic:

"Every model call must be perfect first try for every product."

Realistic engineering target:

"User clicks Produce once. The tool performs all required validation, generation, rejection, repair, retry and QC internally, and only returns output that passes all critical gates."

This is the definition of "một phát ăn ngay" for FEN.

---

## 37. Key Risks

### HIGH
Hand-product interaction physics

Mitigation:
- Action Grammar
- complexity budget
- Feasibility Engine
- first-frame gate
- QC
- selective retry

### HIGH
Exact product fidelity

Mitigation:
- Product Evidence
- reference ranking
- stable angles
- geometry constraints
- source-image comparison
- QC

### MEDIUM-HIGH
Automated QC accuracy

Mitigation:
- decomposed gates
- multiple evidence types
- no single "is this good?" judge

### MEDIUM
Flow adapter stability

Mitigation:
- isolate provider
- keep core independent

### MEDIUM-LOW
Cross-scene continuity

Reduced by:
- On-hand format
- semantic continuity
- intentional TikTok cuts

### LOW
UI / contracts / software plumbing

Standard software engineering problem.

---

## 38. Checkpoints

### FEN V1 FEASIBILITY LOCK
Before full build.

Meaning:
On-hand + correct product references + Google Flow video generation + 9:16/8s has been experimentally validated across representative product archetypes and Safe Action Grammar is known.

### FEN V1 FOUNDATION
Repo-first architecture established.

Meaning:
- own repo
- On-Hand V1
- contracts
- continuity-aware architecture
- QC-aware lifecycle
- Gemini intelligence-provider test path
- Flow production adapter path

### FEN V1 ON-HAND LOCK
V1 On-Hand end-to-end generation is stable.

### FEN V1 RELIABILITY LOCK
QC + repair + retry pass.

### FEN V1 PRODUCTION LOCK
Flow production runtime + Golden Suite pass.

### FEN V2 START
Advanced On-Hand begins.

### FEN V3 HYBRID KOC
Controlled face/KOC mode begins.

### FEN V4 FULL KOC
Full KOC generation begins.

---

## 39. Current Canonical Path

The project path from now:

FEN V1 FEASIBILITY SPIKE
-> FEN V1 FEASIBILITY LOCK
-> FEN V1 FOUNDATION
-> V1.0 continuity-aware On-Hand generation
-> V1.1 Reliability Hardening
-> V1.2 First Sellable Video
-> manual TikTok upload + product cart
-> V1.3 optimization
-> V2 Advanced On-Hand
-> V3 Hybrid KOC
-> V4 Full KOC
-> V5 Autonomous Affiliate Factory

---

## 40. Current Decision Summary

LOCKED:

- Build our own repo from scratch
- GitHub is source of truth
- Gemini 3.5 Flash Free Tier is intelligence/multimodal analysis only
- Flow is preferred production renderer
- Flow credits preferred for production video generation
- Flowboard is a donor for Flow runtime code, not the application base
- ClipForge is a donor/reference for product fidelity, planning and QC
- TVC Director is a donor/reference for shot grammar
- V1 is POV Authentic On-Hand Review
- No KOC face in V1
- One scene = one primary physical objective
- Continuity architecture exists from V1.0
- QC lifecycle exists from V1.0
- State continuity is more important than pixel continuity
- Voice-over should be separated from video generation in V1
- First-frame preflight is strongly preferred
- User only receives APPROVED output
- Internal retries/repairs are allowed
- Quality before cost and speed
- First commercial milestone is V1.2
- Full automation/publishing belongs much later

---

## 41. Recovery Phrase

If context is lost in a later chat, use:

**"Resume from FEN V1 FEASIBILITY LOCK / FEN V1 FOUNDATION handoff."**

The intended baseline is:

Repo-first
+ POV Authentic On-Hand V1
+ continuity-aware contracts
+ QC-aware lifecycle
+ feasibility benchmark first
+ Gemini 3.5 Flash Free Tier for intelligence and multimodal analysis only
+ Google Flow for production rendering
+ no early KOC face
+ no early cost optimization
+ final objective: only approved, sellable output reaches the user.
