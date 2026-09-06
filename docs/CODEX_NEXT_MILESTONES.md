# Codex Next Milestones — Execution Order

## Task 0 — M0 reproducibility

Goal: prove the exported baseline works in the Codex worktree.

Do not implement new domain features.

Commands:

```bash
node --version
npm install
npm run typecheck
npm test
npm run benchmark:dry
npm run build -w @mochi/web
```

PASS only when all expected commands succeed or a clearly documented environment-only blocker remains.

## M1 — Golden Fixture + Benchmark Evidence Foundation

Goal: typed deterministic benchmark data model; no real network model call yet.

Expected additions (names may vary if a better local convention exists):

- benchmark case contract
- benchmark observation contract
- capability evidence contract
- product archetype fixture metadata
- evidence aggregation function
- promotion policy that cannot promote without sufficient evidence
- tests
- CLI/dry runner output manifest

Preservation Lock:

- do not weaken UNTESTED fail-closed policy
- do not add provider-specific fields to Core
- do not implement planner/product evidence engine yet

Gate:

M1 PASS before M2-A.

## M2-A — Gemini 3.5 Flash Free Intelligence Provider (PASS)

Prerequisites:

- M1 PASS

Goal:

Establish the minimum provider boundary for Gemini 3.5 Flash on the Gemini Free Tier.

Required behavior:

- separate `IntelligenceProvider` contract; no `VideoProvider` implementation
- environment-only `GEMINI_API_KEY`
- clear missing-key failure
- typed, provider-neutral structured results
- model/config validation
- provider error normalization
- mock/stub tests only

Do not implement a Product Evidence Engine, Planner, full QC Engine, or any Gemini video generation. Intelligence output cannot promote Action Capability classifications.

## R0-A — Canonical Project Input Contracts

Prerequisites:

- M2-A PASS

Goal:

Establish the provider-neutral project boundary: factual `ProductInput` plus separate creative/user-production controls in `CreativeDirectionInput`, composed as `MochiProjectInput`.

Do not add provider fields, upload bytes, `File`/`Blob` objects, a backend, Flow, voice, planner, Product Evidence, or production UI.

## R0-B — apps/web Input Surface (PASS)

Prerequisites:

- R0-A PASS

Goal:

Expose the canonical project input boundary through the minimal `apps/web` surface. Do not add a backend or provider runtime in this milestone.

## R1-A — Product Evidence Engine (PASS)

Prerequisites:

- R0-B PASS

Goal:

Introduce the provider-neutral Product Evidence boundary behind the application surface. It uses the IntelligenceProvider abstraction with mock/stub verification only, and Gemini 3.5 Flash remains reasoning and multimodal analysis only.

## R1-B1 — Intelligence Trust Boundary (PASS)

Prerequisites:

- R1-A PASS

Goal:

Separate authoritative intelligence-provider rules from untrusted caller data before any live request. `instruction` carries rules only; optional `inputText` carries sanitized factual data only. The provider transport maps rules to its system-instruction mechanism and does not duplicate them in user content. This milestone makes no live call and does not change apps/web.

## R1-B2 — Server-side live Gemini bridge (IMPLEMENTATION PASS / LIVE SMOKE BLOCKED)

Prerequisites:

- R1-B1 PASS
- separately authorized provider configuration

Goal:

Connect the validated evidence boundary to a live Gemini intelligence provider through a server-side bridge without exposing credentials or provider details through apps/web. The service and one-call smoke runner are implemented and locally verified. The live smoke is blocked until a server-only `GEMINI_API_KEY` and a valid local `R1_B2_SMOKE_MANIFEST` with real product images are present. Local/free TTS remains the default future voice direction and will be benchmarked separately.

## R1-B3 — apps/web integration

Prerequisites:

- R1-B2 live smoke PASS

Goal:

Connect the future user-facing app surface to the trusted server boundary. This milestone is NOT STARTED.

## M2-B — Flow Video Canary

Prerequisites:

- R1-B3 integration stable
- real product references
- working Google Flow session/runtime access

Goal:

Run the first real 8-second, 9:16, reference-conditioned video canary through a Flow-backed `VideoProvider` while keeping Flow identifiers inside the adapter/infrastructure layer. Google Flow is the only planned video renderer and consumes Flow credits.

Do not auto-promote actions from a single output.

## M3 — Physical Action Capability Map

Goal:

Classify action x product archetype from real evidence.

Initial archetypes:

- bottle
- tube
- box
- device
- soft package

Initial actions:

- HOLD
- PICK_UP
- MOVE_CLOSER
- ROTATE_SLOW
- PLACE_DOWN
- OPEN_SIMPLE when basic actions are stable

Outputs:

- evidence table
- SAFE / RISKY / AVOID decisions
- known failure notes
- complexity guidance

Gate:

Only after this evidence is credible can FEN V1 FEASIBILITY LOCK pass.
