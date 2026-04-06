# Recommendations for HistoireIA

## Done

- ~~Path traversal on file-based endpoints~~ — `sanitizeParam()` validates all route params
- ~~No authentication~~ — shared secret via `APP_SECRET` env var, checked by middleware
- ~~OpenAI API key exposure risk~~ — `.env` added to `.gitignore`
- ~~Unrestricted file upload~~ — filename validated, writes to dedicated `uploads/` directory, auth required

---

## Priority 1 — Robustness

### No error feedback in the UI

If the LLM is down, Ollama is not running, or the network fails, the user sees a spinner that never resolves. The `story.ts` fetch/render flow doesn't handle rejected promises with visible error messages.

**Fix:** Add a catch handler in `render_and_fetch_more` that sets `assistant_text` to an error message and calls `App.render()`. The user should see something like "Le serveur ne répond pas" instead of an infinite loading state.

### Streaming error handling is fragile

In `chat03.ts`, if the LLM returns a non-200 status, the code still tries to read the stream body and will throw an opaque error. Check `aiResp.ok` before streaming:

```typescript
if (!aiResp.ok) {
    const errBody = await aiResp.text();
    throw new Error(`LLM returned ${aiResp.status}: ${errBody}`);
}
```

### User state write failures are silent

`PUT /users/:username/:gameid` will fail silently if the user's directory doesn't exist yet (first-time user). The endpoint should create the directory if missing:

```typescript
await fs.ensureDir(path.dirname(pages_Path));
await fs.writeFile(pages_Path, JSON.stringify(req.body));
```

---

## Priority 2 — Code Quality

### Consolidate chat implementations

There are four chat files (`chat01.ts` through `chat04.ts`) with only `chat03` active. The others are dead code that adds confusion. Either:
- Delete `chat01`, `chat02`, `chat04` if they are purely historical iterations.
- Or extract the common pattern into one module with a `version` parameter if you need to switch between them.

### Add a linter

There is no ESLint configuration. Adding one catches real bugs (not just style issues):

```bash
cd server && npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
cd client && npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Start with `@typescript-eslint/recommended` — it catches unused variables, implicit `any` leaks, and unsafe assignments with minimal config.

### Enable unused variable detection

Both `tsconfig.json` files set `noUnusedLocals: false` and `noUnusedParameters: false`. Enabling these flags helps catch stale code after refactors. Address existing violations once, then keep the flags on.

### Compiled JS should not be in the repo

`public/js/` contains compiled TypeScript output. This creates noisy diffs and merge conflicts. Add `public/js/` to `.gitignore` and build as part of deployment.

---

## Priority 3 — Infrastructure

### Add a lockfile

There is no `package-lock.json` in either `client/` or `server/`. Without it, `npm install` can resolve different versions on different machines, leading to "works on my machine" bugs.

**Fix:** Run `npm install` in both `client/` and `server/` and commit the resulting `package-lock.json` files.

### Add minimal CI

A single GitHub Action that runs `tsc --noEmit` on both client and server catches type errors before they reach the server:

```yaml
# .github/workflows/typecheck.yml
name: Typecheck
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd client && npm ci && npx tsc --noEmit
      - run: cd server && npm ci && npx tsc --noEmit
```

### Caddy hardcodes a LAN IP

The `Caddyfile` reverse proxies to `192.168.50.199:9340`. If the server's IP changes, the proxy breaks silently.

**Fix:** Use `localhost:9340` instead — Caddy and Express run on the same machine.

---

## Priority 4 — Nice to Have

### Add basic tests for the API

Even 5-10 tests covering the happy path of each endpoint would catch regressions. Use a lightweight framework like `vitest` or Node's built-in test runner (`node --test`).

### Consider SQLite instead of flat files

The file-based storage works but has no atomicity — a crash during `writeFile` can corrupt state. SQLite is a single-file database that gives you atomic writes, concurrent reads, and query capability with almost no setup overhead.

### Deduplicate config loading

`llm.json` and `kind.json` are read from disk on every request (`GET /stories-for`, `GET /stories/:gameid`, `POST /chat/:gameid`). Load them once at startup and reload on file change (or on a simple timer). This is not a performance issue today but it will be if usage grows.
