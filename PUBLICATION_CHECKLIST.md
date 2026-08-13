# GitHub publication checklist

Prepared: 13 August 2026

Remote: `https://github.com/yuzhackovsereja2014-dotcom/sqlite-crud-api.git`

Base public commit before this release: `a566964`

Publication approval received from the repository owner on 13 August 2026. Final commit and remote verification are recorded in Git history.

## Verified

- `git diff --check`: no whitespace errors;
- automated tests: 7 passed, 0 failed;
- bounded benchmark: 600/600 successful requests;
- likely-secret scan: no matches for private-key, GitHub-token, AWS-key, OpenAI-key, password, token, secret, or API-key patterns;
- all documentation files and test paths referenced by the portfolio notes exist;
- no runtime dependency was added;
- Docker behavior is explicitly marked unverified;
- AI authorship and absence of commercial experience are disclosed.

## Files intended for publication

- updated `README.md`;
- updated `package.json`;
- updated `src/server.mjs`;
- updated `test/api.test.mjs`;
- new `.dockerignore` and `Dockerfile`;
- new `demo/` API explorer;
- new `scripts/benchmark.mjs`;
- new `PORTFOLIO.md`;
- new `LOCAL_VERIFICATION.md`;
- this checklist.

## Before push

1. Obtain explicit user approval to publish the listed changes to GitHub. Completed 13 August 2026.
2. Review the final staged diff and ensure no unrelated files are included.
3. Create one descriptive commit.
4. Push only to the configured `origin` repository.
5. Open the GitHub page and verify `PORTFOLIO.md`, test count, and README links.

The remaining steps must include only the reviewed files listed above.
