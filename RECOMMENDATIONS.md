# Recommendations for HistoireIA

## Nice to Have

### Add basic API tests

A handful of tests covering the happy path of each endpoint would catch regressions. Use `vitest` or Node's built-in test runner.

### Consider SQLite instead of flat files

File-based storage has no atomicity — a crash during `writeFile` can corrupt state. SQLite gives atomic writes and concurrent reads with minimal setup.

### Deduplicate config loading

`llm.json` and `kind.json` are read from disk on every request. Load them once at startup and reload on file change.
