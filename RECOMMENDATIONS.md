# Recommendations for HistoireIA

## Infrastructure

### Add a lockfile

No `package-lock.json` in either `client/` or `server/`. Run `npm install` in both and commit the lockfiles.

### Add minimal CI

A GitHub Action running `tsc --noEmit` on both client and server catches type errors before they reach production.

### Caddy hardcodes a LAN IP

The `Caddyfile` reverse proxies to `192.168.50.199:9340`. Use `localhost:9340` instead.

### Add a linter

No ESLint configuration exists. Start with `@typescript-eslint/recommended` to catch implicit `any` leaks and unsafe assignments.

---

## Nice to Have

### Add basic API tests

A handful of tests covering the happy path of each endpoint would catch regressions. Use `vitest` or Node's built-in test runner.

### Consider SQLite instead of flat files

File-based storage has no atomicity — a crash during `writeFile` can corrupt state. SQLite gives atomic writes and concurrent reads with minimal setup.

### Deduplicate config loading

`llm.json` and `kind.json` are read from disk on every request. Load them once at startup and reload on file change.
