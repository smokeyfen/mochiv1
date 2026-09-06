# MochiV1

MochiV1 is the repo-first implementation of FEN V1: POV Authentic On-Hand Review.

## Current milestone

M0 — Contracts + feasibility harness skeleton.

This milestone intentionally does **not** call a real video model. The next gate is the Omni feasibility spike, which will empirically classify physical actions as SAFE / RISKY / AVOID.

## Principles

- GitHub repo is source of truth.
- AI Studio is a test bench.
- Google Flow is the preferred production renderer.
- Core contracts are provider-agnostic.
- Generation output is a Candidate, never automatically Final.
- QC is fail-closed.
- Continuity state exists from V1.0.
- One scene has one primary physical objective.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run benchmark:dry
npm run dev
```
