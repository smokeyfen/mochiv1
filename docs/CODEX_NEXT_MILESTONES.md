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

## M2-A — Gemini 3.5 Flash Free Intelligence Provider

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

## M2-B — Flow Video Canary

Prerequisites:

- M2-A PASS
- real product references
- working Google Flow session/runtime access

Goal:

Run the first real 8-second, 9:16, reference-conditioned video canary through a Flow-backed `VideoProvider` while keeping Flow identifiers inside the adapter/infrastructure layer.

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
