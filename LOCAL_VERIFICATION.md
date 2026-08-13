# Local verification

Date: 13 August 2026

Runtime: bundled Node.js 22+ environment

Command: `node --test test/*.test.mjs`

```text
tests 7
pass 7
fail 0
cancelled 0
skipped 0
todo 0
```

Covered behavior:

1. readiness endpoint;
2. runtime configuration validation;
3. idempotent graceful shutdown and listener cleanup;
4. local API explorer;
5. complete CRUD cycle;
6. malformed JSON and invalid item data;
7. JSON media-type and request-size enforcement.

This result applies to the local working copy. It does not prove that the same changes are already present on GitHub, and it is not a production load, security, or deployment test.

## Bounded microbenchmark

Command parameters: 3 runs, 100 `POST /items` requests per run, in-memory SQLite. All 600 requests across sequential and concurrent samples returned the expected success response.

```text
sequential median: 70.23 requests/second
concurrent median: 720.49 requests/second
```

These numbers are only a local reproducibility check on Node.js `v24.19.0`. They must not be presented as production capacity or an SLA.
