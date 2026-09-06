# Batch 12 — R1-B3B.1 HTTP Runtime Adapter

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `9f8c05eb9c7831ba2fac012a126ad5f32135957e`
- Implementation commit: `242cc9b16cecb7a967330b2e20b840f63e4c882c`
- Status: PASS

## Runtime adapter

`createNodeHttpServerAdapter` uses native `node:http` only. It converts Node IncomingMessage values into Web Request values, invokes the locked handler once, and writes the Web Response status, headers, and body to Node ServerResponse. It preserves method, path, query, headers, and multipart body bytes. The adapter has a bounded 10 MiB request-body limit and does not log bodies, credentials, authorization data, or image bytes.

`npm run dev -w @mochi/server` now starts the server-only composition on `127.0.0.1:8787`; `MOCHI_SERVER_PORT` can override the port. The Vite development proxy forwards relative `/api` requests to `http://127.0.0.1:8787`. No server credential is exposed to apps/web and no `VITE_GEMINI_API_KEY` exists.

## Verification

- Adapter tests: PASS. A local Node server with mock handlers proves multipart method/path/query/header/body preservation, response preservation, one handler invocation, and locked 404 behavior without service execution.
- `npm run typecheck`: PASS across seven workspaces.
- `npm test`: PASS, 78 tests total.
- `npm run benchmark:dry`: PASS with expected `action_untested:PICK_UP`; all actions remain `UNTESTED`.
- `npm run build -w @mochi/web`: PASS.

Gemini live calls: 0. Flow calls: 0. Real video generation: 0. Action promotions: 0. The server dev process and live smoke command were not run. `main` was not merged, rebased, or cherry-picked.

## Next action

STOP. R1-B3B.2 apps/web Product Evidence UI is NOT STARTED. Live runtime validation remains DEFERRED.