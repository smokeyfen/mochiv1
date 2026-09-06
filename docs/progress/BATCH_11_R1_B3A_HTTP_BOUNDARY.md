# Batch 11 — R1-B3A Server HTTP Analysis Boundary

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `eb1f618194ef9b2794266f9a350e07f5fb074ce4`
- Implementation commit: `8ab8e002b246b689ba3d80fed074f306b279e20c`
- Status: PASS

## Boundary

`createProductEvidenceHttpHandler({ service })` implements `POST /api/product-evidence` using the standard Web Request/Response interface. It accepts exactly one `product` JSON field and image parts named `asset:<assetId>`. The strict decoder rejects undeclared product/asset properties and copies only canonical ProductInput fields. It accepts all canonical roles, including `PRODUCT_REFERENCE`, and sources.

The multipart parser requires one matching image file per logical asset, rejects unknown, duplicate, malformed, non-image, empty, and MIME-mismatched parts before the service call, and transforms bytes only into runtime `IntelligenceMediaInput`. ProductInput and ProductEvidence never retain File, Blob, FormData, base64, local paths, or untrusted extra fields.

The injected ProductEvidenceService runs at most once. HTTP responses return sanitized validated ProductEvidence only, or a stable small error object. Normalized rate-limit, availability, authentication, configuration, invalid-response, and provider-failure categories map to safe HTTP status/error codes without provider details.

## Verification

- Server HTTP tests: PASS, including valid one/multiple-reference multipart requests, strict JSON rejection, media integrity, methods/content types, normalized errors, and response-leakage checks.
- `npm run typecheck`: PASS across seven workspaces.
- `npm test`: PASS, 76 tests total.
- `npm run benchmark:dry`: PASS with expected `action_untested:PICK_UP`; all actions remain `UNTESTED`.
- `npm run build -w @mochi/web`: PASS; apps/web source unchanged.
- Evidence identifier audit: PASS.

Live Gemini calls: 0. Flow calls: 0. Real video generation: 0. Action promotions: 0. No live smoke command was run. `main` was not merged, rebased, or cherry-picked.

## Next action

STOP. R1-B3B apps/web Product Evidence Integration is NOT STARTED. The sequence is R1-B3A → R1-B3B → R1 Application Path Complete → Deferred Live Runtime Validation → R2 Product Truth / Blueprint. Do not begin Flow integration.