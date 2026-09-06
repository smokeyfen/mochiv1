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

M1 PASS before M2.

## M2 — Real Gemini/Omni Feasibility Provider

Prerequisites:

- M1 PASS
- real product references
- configured model credentials

Goal:

Run repeatable real feasibility cases through `VideoProvider`.

Required behavior:

- capability negotiation
- explicit 9:16 / 8s request
- reference-conditioned request when required
- no silent fallback
- candidate metadata persisted/reported
- benchmark observation can be recorded per attempt
- errors classified and surfaced
- secrets not committed/logged

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
