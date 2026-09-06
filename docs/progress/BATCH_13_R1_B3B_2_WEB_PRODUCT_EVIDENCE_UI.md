# Batch 13 — R1-B3B.2 apps/web Product Evidence UI

- Branch: `codex/feasibility-lock-candidate`
- Application implementation commit: `e236d02f2a994684dee23f5b8c372ac67a261f86`
- Status: PASS
- Scope: browser-only Product Evidence client and factual analysis UI
- Claim allowed-state correction commit: `d6b2f4e6cff0fb5bcac1359ef9926c64e17c16b6`

## Changed files

- `apps/web/src/product-evidence-client.ts`
- `apps/web/src/product-evidence-client.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/styles.css`

## Behavior recorded

The client posts relative `POST /api/product-evidence` multipart data only. `product` is a `ProductInput` JSON part and each logical asset has exactly one `asset:<assetId>` browser File part. It does not attach manual content-type headers and never serializes creative direction, project IDs, provider identifiers, object URLs, paths, credentials, or runtime transport details.

The client fail-closes before fetch for invalid ProductInput, absent files, non-image or empty files, and MIME mismatches. It strictly decodes successful responses and runs `validateProductEvidence` against the submitted factual product before rendering. Browser-visible failures use only stable safe codes.

Factual product mutations abort and clear the current analysis, and a request-generation token ignores late results. Creative-direction mutations do not fetch, abort, or clear factual evidence; they continue to invalidate the separate canonical project-input preview.

R1-B3B.2.1 is PASS: each ProductClaim now renders its `source` and direct `allowed` value as `ALLOWED` or `NOT ALLOWED`. A reference-evidence claim shows only its supporting-reference count; raw `evidenceAssetIds` are not rendered in the claim UI.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 87 tests
- `npm run benchmark:dry` — PASS with expected fail-closed `action_untested:PICK_UP`
- `npm run build -w @mochi/web` — PASS

## R1-LIVE runtime validation

Status: PASS, recorded from the completed controlled runtime validation.

- Observed path: apps/web → relative `POST /api/product-evidence` → apps/server → Gemini 3.5 Flash → validated ProductEvidence → Product Analysis UI
- Backend: `127.0.0.1:8787`; frontend: `localhost:5173`
- One live request returned HTTP 200 and reached `PRODUCT_ANALYSIS_READY`
- Identity, geometry, colors, packaging, visible labels, claims, uncertainties, contradictions, and prohibited inferences rendered
- Claims displayed source and direct `ALLOWED` / `NOT ALLOWED` state
- Creative mutations preserved visible ProductEvidence and did not create a second request
- A Product Name mutation immediately cleared ProductEvidence and did not re-run analysis

## Runtime accounting and locks

- Gemini live calls: 1
- Flow calls: 0
- Real video generation: 0
- Action promotions: 0; all ActionIds remain `UNTESTED`
- Architecture deviations: none
- R1-B3B.2.1 Claim Allowed-State UI: PASS
- R1 Application Path: FINAL LOCKED
- R1-LIVE: PASS
- R1 Product Evidence: RUNTIME VALIDATED / FINAL LOCKED
- RUBRIC-0: NEXT / NOT STARTED
- R2 Product Truth / Blueprint: NOT STARTED

STOP. Do not begin RUBRIC-0 or R2 without explicit authorization.
