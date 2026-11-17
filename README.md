[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Frontend v11b — a make.fun client in ink and green

A read-only web client for [make.fun](https://make.fun), built from static
files with no framework and no build step. It reads make.fun's public API
and shows the four surfaces the bounty asks for, each at its own URL:

- **The board** (`#/`): every live bounty with its pot, entry fee, time
  left and entry count — searchable, filterable by phase, sortable, with a
  ticking next-deadline box and keyboard navigation (`/` to search, arrow
  keys to walk the rows, Enter to open).
- **A bounty's page** (`#/bounty/<slug>`): fact cards for the live pot
  (base + fees), entry fee, time left and entries; a rewards table at
  today's values (base prize, fee share, pays now); and the description
  rendered from markdown with the HTML escaped first.
- **Its leaderboard** (`#/leaderboard/<slug>`): the standings 100 rows to
  a page, win rates with their 90% intervals, and prizes at live values.
- **A public profile** (`#/profile/<handle>`): entered / placed / won,
  best placement and prizes, plus recent entries.

Beside every view on a wide screen sits the live board rail — the same
cached read, so the master-detail layout costs no extra request.

## Performance

- The first load is the shell alone: **321 bytes gzip-9** for
  `app/index.html`; the stylesheet and every view module arrive after, by
  `import()`.
- One ETag cache serves all reads: repeats revalidate with
  `If-None-Match` and a 304 serves the cached body; overlapping requests
  share one fetch. The status bar counts them as they happen.
- The hand-in dossier (`dossier.json`, built by `main.ts`) is
  **242,504 bytes**; `main.ts` builds it twice and refuses if the two
  builds differ.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Then open <http://localhost:8080>. To build the dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/` — the frontend: `index.html` (the shell), `main.js` (shell +
  router + rail), `api.js` (the one cache), `format.js`, and one module
  per view (`board.js`, `bounty.js`, `leaderboard.js`, `profile.js`),
  plus `style.css`.
- `main.ts` — builds the dossier with the vendored library.
- `vendor/makefun-frontend.ts` — the kit's library, copied unchanged.
- `screenshots/` — the three judged screenshots, mapped in `shots.json`.

MIT licensed — see `LICENSE`.
