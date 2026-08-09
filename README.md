# SQLite CRUD API

A small dependency-free JSON API built with Node.js and SQLite. It demonstrates a production-minded baseline for a fixed-price freelance task: parameterized SQL, input validation, request-size limits, consistent JSON errors, health checks, and end-to-end tests.

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)

## Run

```bash
npm start
```

The server listens on `http://127.0.0.1:3000` and stores data in `data.sqlite`.

## Test

```bash
npm test
```

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

## Scope notes

Authentication, pagination, migrations, and deployment are intentionally outside this compact demo. They can be added when a client confirms those requirements in a funded contract.
