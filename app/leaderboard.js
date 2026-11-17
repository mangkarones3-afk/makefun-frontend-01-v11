// leaderboard.js — the standings for one bounty, 100 rows to a page.
// Win rates and their intervals come straight from the payload's micro
// fields (values.judge / judge_low / judge_high); prizes are the bounty
// payload's own rewardsNow amounts for the row's prize rank.

import { assetUrl, get } from './api.js';
import { int, money, pct } from './format.js';
import { escapeHtml } from './main.js';

const PAGE = 100;

export async function render(el, slug) {
  const [lb, bounty] = await Promise.all([
    get('/competitions/' + slug + '/leaderboard'),
    get('/competitions/' + slug),
  ]);
  const entries = lb.entries || [];
  const prizeByPlace = new Map((bounty.rewardsNow || []).map((r) => [r.place, r.amountUsd]));
  const pages = Math.max(1, Math.ceil(entries.length / PAGE));
  let page = 1;

  el.innerHTML = `
    <p class="crumbs"><a href="#/bounty/${slug}">← ${escapeHtml(bounty.title)}</a></p>
    <h1>Leaderboard</h1>
    <p class="subline">${int(entries.length)} ranked entries · win rates from the judge's matches, intervals at 90%.</p>
    <table class="standings">
      <thead><tr><th>Rank</th><th>Entrant</th><th>Win rate</th><th>W–D–L</th><th>Prize</th></tr></thead>
      <tbody id="lbBody"></tbody>
    </table>
    <div class="pager">
      <button id="lbPrev" class="pagerbtn">← Prev</button>
      <span id="lbRows" class="rowsline"></span>
      <button id="lbNext" class="pagerbtn">Next →</button>
    </div>`;

  const body = el.querySelector('#lbBody');
  const rowsLine = el.querySelector('#lbRows');
  const prev = el.querySelector('#lbPrev');
  const next = el.querySelector('#lbNext');

  function paint() {
    const from = (page - 1) * PAGE;
    const slice = entries.slice(from, from + PAGE);
    body.innerHTML = slice.map((e) => {
      const v = e.values || {};
      const j = e.judge || {};
      const prize = e.prize_rank ? prizeByPlace.get(e.prize_rank) : null;
      return `<tr>
        <td class="rankcell">${e.rank ?? '—'}</td>
        <td>
          <a class="entrant" href="#/profile/${encodeURIComponent(e.handle)}">
            ${e.image ? `<img class="avatar" src="${assetUrl(e.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
            <span><span class="handle">@${escapeHtml(e.handle)}</span>
            <span class="entrytitle">${escapeHtml(e.title || '')}</span></span>
          </a>
        </td>
        <td><span class="winrate">${pct(v.judge)}</span>
          <span class="interval">${pct(v.judge_low, 1)} – ${pct(v.judge_high, 1)}</span></td>
        <td>${j.wins ?? 0}–${j.draws ?? 0}–${j.losses ?? 0}</td>
        <td>${prize ? money(prize) : '—'}</td>
      </tr>`;
    }).join('');
    rowsLine.textContent = entries.length
      ? `Rows ${from + 1}–${Math.min(from + PAGE, entries.length)} of ${int(entries.length)} · Page ${page} of ${pages}`
      : 'No ranked entries yet';
    prev.disabled = page <= 1;
    next.disabled = page >= pages;
  }

  prev.addEventListener('click', () => { if (page > 1) { page -= 1; paint(); } });
  next.addEventListener('click', () => { if (page < pages) { page += 1; paint(); } });
  paint();
}
