# Portfolio notes for employers

This repository is a learning project prepared by Sergey Yuzhakov together with an AI assistant. It is not evidence of commercial backend experience. Sergey defined the learning direction and constraints; the AI assistant produced much of the implementation and documentation. The useful signal here is the transparent, testable workflow rather than a claim of independent authorship.

## What is publicly available now

The current GitHub commit `a566964` contains a dependency-free Node.js + SQLite JSON API with:

- a readiness endpoint;
- create, list, read, update, and delete operations;
- parameterized SQL;
- JSON parsing and item validation;
- consistent JSON errors;
- three end-to-end tests.

Public repository: https://github.com/yuzhackovsereja2014-dotcom/sqlite-crud-api

## Locally verified improvements awaiting publication

The working copy additionally includes:

- validation of host, port, and database configuration;
- idempotent graceful shutdown for `SIGINT` and `SIGTERM`;
- a browser-based API explorer at `/demo`;
- enforcement of JSON media types;
- a 1 MB request-body limit;
- a dependency-free Dockerfile and healthcheck definition;
- a bounded local microbenchmark;
- seven automated tests.

Verification on 13 August 2026:

```text
tests 7
pass 7
fail 0
```

Docker runtime behavior is not claimed: Docker is not installed in the verification environment. The Dockerfile has only been reviewed as source code.

## Example support and QA discussion

The API can be used to explain entry-level diagnostic scenarios:

| Symptom | Fact to collect | Likely first-line result |
|---|---|---|
| `415 Unsupported Media Type` | method, URL, `Content-Type` | repeat with `application/json` |
| `400` invalid JSON | redacted request body and exact response | correct JSON syntax |
| `413 Payload Too Large` | approximate body size | reduce the body or agree another transfer method |
| `404 Item not found` | item ID and whether it existed earlier | verify ID; escalate unexpected data loss |
| `/health` unavailable | time, URL, scope, network error | escalate with impact and completed checks |

Passwords, access tokens, and personal data should never be included in a public bug report.

## Questions Sergey can discuss honestly

- Why a health endpoint is different from a CRUD endpoint.
- Why user input should not be concatenated into SQL.
- How expected and actual results differ in a bug report.
- Why malformed JSON and invalid business data are separate cases.
- What the automated tests prove and what they do not prove.
- When a first-line specialist should escalate rather than guess.

## Current learning gaps

- No commercial production support or backend experience.
- Implementation work still relies heavily on an AI assistant.
- Authentication, authorization, pagination, migrations, observability, CI/CD, and deployment are not implemented.
- Independent code-reading and debugging skills still require validation.

These gaps are intentionally stated so an interviewer can assess the project at the correct Intern level.
