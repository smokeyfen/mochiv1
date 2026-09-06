# MochiV1

MochiV1 is the repo-first implementation of FEN V1: POV Authentic On-Hand Review.

## Current milestone

R0-B — apps/web Project Input Surface.

The locked execution order is M2-A PASS → R0-A → R0-B → R1 Product Evidence / reasoning pipeline → Flow integration. This milestone intentionally does **not** call a real model. Gemini 3.5 Flash Free Tier is used only for intelligence and multimodal-analysis provider work. Google Flow remains the only planned video renderer and consumes Flow credits; Flow integration begins only after the reasoning pipeline is stable. Local/free TTS is the default future voice direction and will be benchmarked later.

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
