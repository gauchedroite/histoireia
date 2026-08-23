# HistoireIA

Interactive AI-powered story game engine — "des histoires avec l'IA". French-language UI and content.

## Tech Stack

- **Client**: TypeScript (ES2024, ESNext modules) → compiles to `public/js/`
- **Server**: TypeScript (ES2024, CommonJS) with Express on port 9340 → compiles to `server/dist/`
- **LLM providers**: Ollama (local, default) and OpenAI (cloud)
- **Reverse proxy**: Caddy handles HTTPS and routes to Express
- **No framework** — vanilla DOM with MorphDOM for diffing, hash-based routing

## Project Structure

```
client/src/          # Frontend TypeScript
  core/              # App framework (router, rendering, themes)
  games/             # Game implementations (game1/, game2/, editor, home, login)
  common/            # Utilities, WebGL shader runner
server/src/          # Express API + LLM chat implementations (chat01–04)
public/              # Static files served by Express
  assets/            # Game content folders (metadata.json, prompt.txt, images)
  data/lookup/       # Config (llm.json, kind.json)
  data/users/        # Per-user game state (file-based)
  js/                # Compiled client TypeScript (do not edit)
```

## Development

Requires Node >= 22 and four terminal sessions:

```bash
# 1. Ollama (LLM inference)
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 2. Caddy (reverse proxy)
caddy run --watch

# 3. Express server
cd server && npm run dev

# 4. TypeScript compiler (client)
cd client && npm run dev
```

Production build: `cd client && npm run live` (outputs to `../live/`).

## Key API Endpoints (server/src/server.ts)

- `GET /stories-for/:username` — list available games
- `GET /stories/:gameid` — fetch game definition
- `PUT /stories/:gameid` — create/update story
- `DELETE /stories/:gameid` — delete story
- `POST /chat/:gameid` — stream LLM response (SSE)
- `GET/PUT /users/:username/:gameid` — user game state

## Game Content

Each game lives in `public/assets/<gameid>/` with:
- `metadata.json` — title, LLM config, game kind (llm or adv)
- `prompt.txt` — system prompt for LLM
- Optional: background images, `data.tsv` for data-driven adventures

## Conventions

- **Never commit unless explicitly instructed.** Make changes, leave them staged or unstaged, and let the user review.
- When the user reports a compile/watch error you don't reproduce, believe the report — don't dismiss it. The dev `tsc -w` watcher runs incrementally from a cached graph and can surface errors a one-shot `npx tsc` in a fresh process won't reproduce. Investigate the reported file/line, don't re-run and declare "clean for me."
- **Run the server/client with `npm run dev`, not a one-off `node dist/server.js`.** `npm run dev` runs `tsc -w` + `node --watch dist/server.js`, so recompiles hot-reload. A plain `node` process won't pick up recompiled `dist/` and will serve stale code — a "doesn't work" report is almost always a stale server, not a code bug. Before debugging any runtime issue, first confirm the running server/client process is the dev watcher (or restart with `npm run dev`); that's rung 0, before touching code.
- New client `.ts` files with no `import`/`export` are global scripts — their top-level names leak globally and collide with other global scripts (TS6200). Add `export {}` to make any new top-level file a module, isolating its scope.
- **Per-page CSS overrides:** `app.ts` sets `document.body.id = context.toLowerCase()` on each screen (e.g. `gnew`, `menu`, `story`), so `body#<id>` scopes rules to that page alone. Prefer a page-scoped rule (e.g. `#gnew { .app-header { text-align: left; } }` in `public/css/<page>.css`, `@import`-ed by `index.css`) over inline styles or a one-off class — leaves the global rule intact everywhere else.
- All UI text and game content is in French
- Game IDs are random 8-letter strings (e.g. `aviwujef`, `calogonu`)
- User state is file-based: `public/data/users/{username}_{gameid}_state.json`
- Client uses strict TypeScript (`strict: true`, `noImplicitAny: true`)
- No test suite currently exists
- `public/js/` contains compiled output — do not edit directly

## Production URL

`https://lebaudy.gauchedroite.com/histoireia/index.html`
