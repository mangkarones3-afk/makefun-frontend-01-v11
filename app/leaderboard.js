// leaderboard.js — a bounty's standings: rank, entrant, win rate with
// its 90% interval (the API carries judge_low / judge_high), and the
// prize each place pays now. 100 rows a page, paged in place.

import { get } from './api.js';
import { esc } from './main.js';
import { money2, ratePct } from './format.js';

const PAGE_SIZE = 100;
let page = 0;

export async function render(root, slug) {
  root.innerHTML = '<p class="loading">Loading the leaderboard…</p>';
  const [comp, board] = await Promise.all([
    get('/competitions/' + encodeURIComponent(slug)),
    get('/competitions/' + encodeURIComponent(slug) + '/leaderboard'),
  ]);
  const entries = board.entries || [];
  const paysNow = new Map(
    (comp.rewardsNow || []).map((r) => [r.place, r.amountUsd]),
  );
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  if (page >= pages) page = 0;

  function paint() {
    const from = page * PAGE_SIZE;
    const slice = entries.slice(from, from + PAGE_SIZE);
    const rows = slice.map((e) => {
      const v = e.values || {};
      const prize = e.prize_rank != null && paysNow.has(e.prize_rank)
        ? money2(paysNow.get(e.prize_rank))
        : '—';
      const avatar = e.image
        ? `<img class="avatar" crossorigin="anonymous" src="https://make.fun${esc(e.image)}" alt="">`
        : '';
      return `<tr>
        <td class="rank">${e.rank}</td>
        <td>${avatar}<a href="#/u/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>
          <span class="entry-title">${esc(e.title || '')}</span></td>
        <td class="rate"><strong>${ratePct(v.judge)}</strong>
          <span class="interval">${ratePct(v.judge_low)} – ${ratePct(v.judge_high)}</span></td>
        <td>${prize}</td></tr>`;
    }).join('');
    root.innerHTML = `
      <p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(comp.title)}</a></p>
      <h1 class="bounty-h">Leaderboard</h1>
      <p class="subline">${entries.length} ranked entries · win rate with its 90% interval · prizes at the live pot.</p>
      <table class="standings"><thead><tr>
        <th>Rank</th><th>Entrant</th><th>Win rate</th><th>Prize</th>
        </tr></thead><tbody>${rows}</tbody></table>
      <footer class="pager">
        <button type="button" id="pagePrev"${page === 0 ? ' disabled' : ''}>← Prev</button>
        <span>Rows ${entries.length ? from + 1 : 0}–${Math.min(entries.length, from + PAGE_SIZE)} of ${entries.length} · Page ${page + 1} of ${pages}</span>
        <button type="button" id="pageNext"${page >= pages - 1 ? ' disabled' : ''}>Next →</button>
      </footer>`;
    root.querySelector('#pagePrev')?.addEventListener('click', () => { page -= 1; paint(); });
    root.querySelector('#pageNext')?.addEventListener('click', () => { page += 1; paint(); });
  }

  paint();
}
