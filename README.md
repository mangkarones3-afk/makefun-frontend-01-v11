# Frontend v11 — a make.fun client in ink and green

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-fcfcfa)](https://github.com/mangkarones3-afk/makefun-frontend-01-v11/blob/main/LICENSE)

A read-only frontend for [make.fun](https://make.fun), built for the
*Build the best make.fun frontend* bounty. Vanilla JavaScript, no
framework, no build step: the files in `app/` are the app.

Four surfaces, each with its own hash route:

- **Board** (`#/`) — every live bounty with its live pot, entry fee,
  time left and entry count; search, filter chips and sorting in place.
- **Bounty** (`#/bounty/<slug>`) — fact cards (live pot with its base +
  fees split, entry fee, time left, entries), a rewards table priced
  off the live pot (base prize · fee share · pays now), and the bounty
  description rendered from markdown, escaped first.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`) — standings with win
  rates and their 90% intervals, 100 rows a page.
- **Profile** (`#/u/<handle>`) — an account's record and recent entries.

On wide screens the board stays beside every view as a rail, fed by the
same cached read. Every API read goes through one ETag cache in
`app/api.js`: fresh entries serve with no request, older ones revalidate
and a 304 serves the cached body. The status bar prints the cache's real
counters — requests, revalidations, cache serves — as the session runs.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
node serve.ts --port 9000
```

Then open the printed address in a browser. The app reads
`https://make.fun/api/...` live; there is nothing to install.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's `buildDossier`, twice; the two
builds must agree byte for byte or it refuses.

Measured on the shipped files: first load is the shell alone,
**315 B gzip (440 B raw)** (index.html, nothing else); the whole app is **34,922 bytes**
across **9** files, and the dossier is **260,821 bytes**.
