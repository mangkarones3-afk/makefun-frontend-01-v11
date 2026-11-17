// board.js — the bounty board: search, filter chips, sort, the deadline
// countdown box, and the strategy footer with the measured first load.

import { get } from './api.js';
import { countdown, int, money, moneyShort, timeLeft } from './format.js';
import { escapeHtml, onCleanup } from './main.js';

const FIRST_LOAD_GZIP = 321; // bytes, gzip-9 — main.ts's Totals line, checked at build

function phaseOf(b, now) {
  const t = new Date(b.deadline).getTime();
  if (!Number.isFinite(t) || t <= now || b.status === 'resolved' || b.status === 'closed') return 'closed';
  if (t - now <= 48 * 3600 * 1000) return 'closing';
  return 'open';
}

export async function render(el) {
  const data = await get('/competitions');
  const items = data.items || [];
  const now = Date.now();

  const next = items
    .filter((b) => phaseOf(b, now) !== 'closed')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  el.innerHTML = `
    <section class="boardhead">
      <div>
        <h1>The board</h1>
        <p class="subline">Live bounties on make.fun — reward, fee, time left and entries, straight from the API.</p>
      </div>
      ${next ? `
      <div class="deadlinebox">
        <span class="deadlinelabel">Next deadline</span>
        <span class="deadlineclock" id="deadlineClock">${countdown(next.deadline)}</span>
        <span class="deadlinename">${escapeHtml(next.title)}</span>
      </div>` : ''}
    </section>
    <div class="toolbar">
      <label class="searchbox">
        <span class="searchlabel">Search bounties</span>
        <input id="boardSearch" type="search" placeholder="Search title, category, skill…  ( / )" autocomplete="off">
      </label>
      <div class="chips" role="group" aria-label="Filter">
        <button class="chip active" data-chip="all">All</button>
        <button class="chip" data-chip="open">Open</button>
        <button class="chip" data-chip="closing">Closing soon</button>
        <button class="chip" data-chip="closed">Closed</button>
      </div>
      <label class="sortbox">
        <span class="searchlabel">Sort</span>
        <select id="boardSort">
          <option value="deadline">Deadline first</option>
          <option value="pot">Biggest pot</option>
          <option value="entries">Most entries</option>
        </select>
      </label>
      <span class="showncount" id="shownCount"></span>
    </div>
    <div class="boardlist" id="boardList"></div>
    <p class="strategy">First load ${FIRST_LOAD_GZIP} B gzip · one ETag cache, revalidated not refetched · views load by import() · the rail reuses this read · leaderboard pages 100 at a time</p>`;

  const listEl = el.querySelector('#boardList');
  const countEl = el.querySelector('#shownCount');
  const searchEl = el.querySelector('#boardSearch');
  const sortEl = el.querySelector('#boardSort');
  let chip = 'all';
  let focusIdx = -1;

  function visible() {
    const q = searchEl.value.trim().toLowerCase();
    let rows = items.filter((b) => {
      const ph = phaseOf(b, Date.now());
      if (chip === 'open' && ph !== 'open') return false;
      if (chip === 'closing' && ph !== 'closing') return false;
      if (chip === 'closed' && ph !== 'closed') return false;
      if (!q) return true;
      const hay = [b.title, b.category, b.sponsor?.name, ...(b.skills || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
    if (sortEl.value === 'pot') rows.sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
    else if (sortEl.value === 'entries') rows.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
    else rows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return rows;
  }

  function paint() {
    const rows = visible();
    countEl.textContent = `${rows.length} of ${items.length} shown`;
    listEl.innerHTML = rows.map((b, i) => {
      const ph = phaseOf(b, Date.now());
      return `
      <a class="boardrow${i === focusIdx ? ' focused' : ''}" href="#/bounty/${b.slug}" data-row="${i}">
        <span class="rowmain">
          <span class="rowtitle">${escapeHtml(b.title)}</span>
          <span class="rowsub">${escapeHtml(b.sponsor?.name || 'make.fun')} · ${escapeHtml(b.category || '')}</span>
        </span>
        <span class="rowcell"><span class="celllabel">Pot</span><strong>${moneyShort(b.potUsd ?? b.rewardAmount)}</strong></span>
        <span class="rowcell"><span class="celllabel">Fee</span>${b.entryFeeUsd ? money(b.entryFeeUsd) + ' entry fee' : 'Free entry'}</span>
        <span class="rowcell"><span class="celllabel">${ph === 'closed' ? 'Deadline' : 'Time left'}</span>${ph === 'closed' ? 'Closed' : timeLeft(b.deadline)}</span>
        <span class="rowcell"><span class="celllabel">Entries</span>${int(b.submissionCount)}</span>
      </a>`;
    }).join('') || '<p class="empty">No bounties match.</p>';
  }

  paint();
  searchEl.addEventListener('input', paint);
  sortEl.addEventListener('change', paint);
  el.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      chip = btn.dataset.chip;
      focusIdx = -1;
      paint();
    });
  });

  // Arrow keys walk the rows; Enter opens the focused bounty.
  function onKey(e) {
    const rows = visible();
    if (!rows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusIdx = e.key === 'ArrowDown'
        ? Math.min(focusIdx + 1, rows.length - 1)
        : Math.max(focusIdx - 1, 0);
      paint();
      listEl.querySelector(`[data-row="${focusIdx}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && focusIdx >= 0 && document.activeElement !== searchEl) {
      location.hash = '#/bounty/' + rows[focusIdx].slug;
    }
  }
  document.addEventListener('keydown', onKey);
  onCleanup(() => document.removeEventListener('keydown', onKey));

  if (next) {
    const clock = el.querySelector('#deadlineClock');
    const timer = setInterval(() => { if (clock) clock.textContent = countdown(next.deadline); }, 1000);
    onCleanup(() => clearInterval(timer));
  }
}
