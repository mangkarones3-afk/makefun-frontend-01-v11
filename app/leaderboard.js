// leaderboard.js — a bounty's standings, paginated 100 to a page from the one
// leaderboard read. Each win rate carries the interval the API itself reports
// (values.judge / judge_low / judge_high, in millionths), and the prize column
// is the place's live Pays now figure from the bounty's rewardsNow.

import { getJSON } from './api.js';
import { money, ratePct } from './format.js';

const PAGE_SIZE = 100;

function avatarImg(path) {
  const img = document.createElement('img');
  img.className = 'avatar';
  img.alt = '';
  img.loading = 'lazy';
  img.setAttribute('crossorigin', 'anonymous'); // set before src: the API's images send CORP same-origin
  img.src = path.startsWith('http') ? path : 'https://make.fun' + path;
  return img;
}

export async function renderLeaderboard(view, slug) {
  const data = await getJSON('/competitions/' + encodeURIComponent(slug) + '/leaderboard');
  const detail = await getJSON('/competitions/' + encodeURIComponent(slug)).catch(() => null);
  const entries = data.entries || [];
  const paysNow = new Map();
  if (detail && Array.isArray(detail.rewardsNow)) {
    for (const r of detail.rewardsNow) paysNow.set(r.place, r.amountUsd);
  }
  let page = 0;
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  view.innerHTML =
    '<section class="leaderboard">' +
    '<p class="crumbs"><a href="#/bounty/' + encodeURIComponent(slug) + '">← Bounty</a> · <a href="#/">Board</a></p>' +
    '<h1>Leaderboard</h1>' +
    '<p class="subline"></p>' +
    '<table class="standings"><thead><tr><th>Rank</th><th>Entrant</th><th>Win rate</th><th>Pays now</th></tr></thead>' +
    '<tbody></tbody></table>' +
    '<div class="pager"><button class="pager-prev">← Prev</button>' +
    '<span class="pager-line"></span>' +
    '<button class="pager-next">Next →</button></div>' +
    '</section>';
  view.querySelector('.subline').textContent =
    (data.competition ? data.competition.title : slug) + ' — ' + entries.length + ' ranked entries, judged head to head.';

  const tbody = view.querySelector('tbody');
  const line = view.querySelector('.pager-line');
  const prev = view.querySelector('.pager-prev');
  const next = view.querySelector('.pager-next');

  function paint() {
    const from = page * PAGE_SIZE;
    const slice = entries.slice(from, from + PAGE_SIZE);
    tbody.textContent = '';
    for (const e of slice) {
      const tr = document.createElement('tr');
      const prize = paysNow.get(e.prize_rank ?? e.rank);
      tr.innerHTML =
        '<td class="rank"></td>' +
        '<td class="entrant"><span class="entrant-name"></span><span class="entrant-title"></span></td>' +
        '<td class="rate"><strong></strong><span class="interval"></span></td>' +
        '<td class="prize"></td>';
      tr.querySelector('.rank').textContent = e.rank;
      const name = tr.querySelector('.entrant-name');
      if (e.image) name.appendChild(avatarImg(e.image));
      const link = document.createElement('a');
      link.href = '#/profile/' + encodeURIComponent(e.handle);
      link.textContent = '@' + e.handle;
      name.appendChild(link);
      tr.querySelector('.entrant-title').textContent = e.title || '';
      tr.querySelector('.rate strong').textContent = ratePct(e.values ? e.values.judge : null);
      tr.querySelector('.interval').textContent =
        e.values && e.values.judge_low != null
          ? ratePct(e.values.judge_low) + ' – ' + ratePct(e.values.judge_high)
          : '';
      tr.querySelector('.prize').textContent = prize != null ? money(prize) : '—';
      tbody.appendChild(tr);
    }
    line.textContent =
      'Rows ' + (entries.length ? from + 1 : 0) + '–' + Math.min(from + PAGE_SIZE, entries.length) +
      ' of ' + entries.length + ' · Page ' + (page + 1) + ' of ' + pages;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
  }

  prev.addEventListener('click', () => {
    if (page > 0) {
      page -= 1;
      paint();
    }
  });
  next.addEventListener('click', () => {
    if (page < pages - 1) {
      page += 1;
      paint();
    }
  });
  paint();
}
