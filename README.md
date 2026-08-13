# SQLite CRUD API

A small dependency-free JSON API built with Node.js and SQLite. It demonstrates a production-minded baseline for a fixed-price freelance task: parameterized SQL, input validation, request-size limits, consistent JSON errors, health checks, and end-to-end tests.

For an honest description of authorship, public versus local state, and current learning gaps, see [PORTFOLIO.md](PORTFOLIO.md). Local test evidence is recorded in [LOCAL_VERIFICATION.md](LOCAL_VERIFICATION.md).

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)

## Run

```bash
npm start
```

The server listens on `http://127.0.0.1:3000` and stores data in `data.sqlite`.

Open `http://127.0.0.1:3000/demo` for the local API explorer.

## Configuration

- `HOST` — bind address, defaults to `127.0.0.1`;
- `PORT` — TCP port from 1 to 65535, defaults to `3000`;
- `DB_PATH` — SQLite filename, defaults to `data.sqlite`.

## Container

The repository includes a dependency-free Dockerfile with a persistent
`/app/data` volume and a `/health` healthcheck:

```bash
docker build -t sqlite-crud-api .
docker run --rm -p 3000:3000 -v sqlite-data:/app/data sqlite-crud-api
```

The Dockerfile is prepared but has not yet been runtime-tested in the current
development environment because Docker is not installed there.

## Test

```bash
npm test
```

The local test suite covers health, the browser demo, a complete CRUD cycle,
invalid input, JSON media-type enforcement, the 1 MB request-body limit,
runtime configuration, and idempotent graceful shutdown for `SIGINT`/`SIGTERM`.

## Local microbenchmark

```bash
npm run benchmark
```

The default benchmark runs five alternating sequential/concurrent samples with
200 `POST /items` requests per sample. Override the bounded inputs with
`BENCHMARK_REQUESTS` (1–5000) and `BENCHMARK_RUNS` (1–20). Set
`BENCHMARK_DATABASE=file` to use a fresh temporary SQLite file for every
sample; the default is `memory`. Temporary benchmark directories are removed
after their server closes.

It uses a loopback HTTP server in the same Node.js process. Treat the result as
a reproducible comparison of local request patterns and storage modes, not as
production capacity or a load-test claim.

## Endpoints

- `GET /health`
- `GET /items`
- `POST /items`
- `GET /items/:id`
- `PUT /items/:id`
- `DELETE /items/:id`

Example request body:

```json
{
  "title": "Example item",
  "description": "Optional description"
}
```

`POST` and `PUT` require `Content-Type: application/json` (or an
`application/*+json` media type). Unsupported media types return `415`; request
bodies larger than 1 MB return `413`.

## Scope notes

Authentication, pagination, migrations, and deployment are intentionally outside this compact demo. They can be added when a client confirms those requirements in a funded contract.
