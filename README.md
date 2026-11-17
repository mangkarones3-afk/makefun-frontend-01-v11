[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v11/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Frontend v11c — a make.fun client in ink and green

A read-only frontend for [make.fun](https://make.fun), built for the
*Build the best make.fun frontend* bounty. Vanilla JavaScript, no
framework, no build step: the files in `app/` are the app.

Four surfaces, each with its own hash route:

- `#/` — the board: every live bounty with its pot, entry fee, time left
  and entries, with search, filter chips, three sorts and keyboard
  navigation (press `/`, arrow keys, Enter).
- `#/bounty/<slug>` — a bounty's page: live-pot fact cards, a rewards
  table whose Base prize / Fee share / Pays now columns are the API's own
  `rewardsNow` figures, and its rules rendered from markdown, escaped
  first.
- `#/leaderboard/<slug>` — the standings, paginated 100 to a page, each
  win rate carrying the interval the API reports.
- `#/profile/<handle>` — an account's public profile: record cards and
  recent entries.

One ETag cache in `app/api.js` serves every read: each URL is fetched
once, later reads answer from the cache and revalidate with
`If-None-Match`, and in-flight requests are shared — the master-detail
rail and the board read the board list through the same single request.
The Live status bar prints the cache's real counters as the app works.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

## Measured

- First load: 1 file, 311 bytes gzip-9 (435 raw) — the shell alone.
- Whole app: 9 files, 37,696 bytes.
- Dossier: 246,708 bytes, sha256 c74165de010cc0dc82d645540e0cd3f9397b8fa4895ecf7d219779c4b03e74a8.
