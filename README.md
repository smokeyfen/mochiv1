# MochiV1

MochiV1 is the repo-first implementation of FEN V1: POV Authentic On-Hand Review.

## Current milestone

M0 — Contracts + feasibility harness skeleton.

This milestone intentionally does **not** call a real video model. Gemini 3.5 Flash Free Tier is used only for intelligence and multimodal-analysis provider work. Video generation remains behind a separate `VideoProvider`; the next video runtime gate is the Flow Video Canary using Google Flow credits.

## Principles

- GitHub repo is source of truth.
- Gemini 3.5 Flash Free Tier is the intelligence and multimodal-analysis provider.
- Google Flow is the future video runtime and remains separate from intelligence.
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
