// board.js — the bounty board: every live bounty with its pot, fee,
// time left and entries, searchable, filterable and sortable in place.

import { get } from './api.js';
import { esc } from './main.js';
import { commas, isOpen, money, timeLeft } from './format.js';

// The shell's measured first-load figure, read off the dossier's Totals
// line at build time and kept true of the shipped files.
const FIRST_LOAD_GZIP = '315 B gzip';

const DAY_MS = 24 * 60 * 60 * 1000;
let items = [];
let query = '';
let chip = 'all';
let sort = 'deadline';
let focusIndex = -1;

function visible() {
  const now = Date.now();
  const q = query.trim().toLowerCase();
  let list = items.filter((b) => {
    if (chip === 'open' && !isOpen(b, now)) return false;
    if (chip === 'closed' && isOpen(b, now)) return false;
    if (chip === 'closing') {
      const ms = new Date(b.deadline).getTime() - now;
      if (ms <= 0 || ms > DAY_MS) return false;
    }
    if (!q) return true;
    const hay = (b.title + ' ' + b.category + ' ' + (b.skills || []).join(' ')).toLowerCase();
    return hay.includes(q);
  });
  if (sort === 'deadline') {
    list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (sort === 'pot') {
    list.sort((a, b) => parseFloat(b.potUsd || b.rewardAmount) - parseFloat(a.potUsd || a.rewardAmount));
  } else if (sort === 'entries') {
    list.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
  }
  return list;
}

function rowHtml(b, index) {
  const fee = b.entryFeeUsd ? money(b.entryFeeUsd) + ' entry fee' : 'Free entry';
  const when = isOpen(b)
    ? `<span data-left="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>`
    : 'Closed';
  return `<a class="bounty-row" data-row="${index}" href="#/bounty/${encodeURIComponent(b.slug)}">
    <span class="bounty-main">
      <span class="bounty-title">${esc(b.title)}</span>
      <span class="bounty-sub">make.fun · ${esc(b.category)}${b.skills?.length ? ' · ' + esc(b.skills.join(', ')) : ''}</span>
    </span>
    <span class="bounty-cell"><label>Pot</label><strong>${money(b.potUsd ?? b.rewardAmount)}</strong></span>
    <span class="bounty-cell"><label>Fee</label>${fee}</span>
    <span class="bounty-cell"><label>${isOpen(b) ? 'Time left' : 'Deadline'}</label>${when}</span>
    <span class="bounty-cell"><label>Entries</label>${commas(b.submissionCount || 0)}</span>
  </a>`;
}

export function render(root) {
  root.innerHTML = `
    <section class="board-head">
      <div>
        <h1>The board</h1>
        <p class="subline">Live bounties on make.fun — reward, fee, time left and entries, straight from the API.</p>
      </div>
      <div class="next-deadline" id="nextDeadline"></div>
    </section>
    <section class="toolbar" aria-label="Board tools">
      <label class="search-label" for="boardSearch">Search bounties</label>
      <input id="boardSearch" type="search" placeholder="Search title, category, skill…  ( / )" autocomplete="off">
      <div class="chips" role="group" aria-label="Filter">
        ${['all', 'open', 'closing', 'closed'].map((c) =>
          `<button type="button" class="chip${c === chip ? ' active' : ''}" data-chip="${c}">${c === 'closing' ? 'Closing soon' : c[0].toUpperCase() + c.slice(1)}</button>`).join('')}
      </div>
      <label class="sort-label">Sort
        <select id="boardSort">
          <option value="deadline"${sort === 'deadline' ? ' selected' : ''}>Deadline first</option>
          <option value="pot"${sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
          <option value="entries"${sort === 'entries' ? ' selected' : ''}>Most entries</option>
        </select>
      </label>
      <span class="shown-count" id="shownCount"></span>
    </section>
    <section class="board-list" id="boardList"><p class="loading">Loading the board…</p></section>
    <footer class="strategy">One ETag cache for every read · each view its own module, loaded by route · first load ${FIRST_LOAD_GZIP} — the shell alone.</footer>`;

  const listEl = root.querySelector('#boardList');
  const countEl = root.querySelector('#shownCount');
  const nextEl = root.querySelector('#nextDeadline');

  function paint() {
    const list = visible();
    countEl.textContent = `${list.length} of ${items.length} shown`;
    listEl.innerHTML = list.length
      ? list.map(rowHtml).join('')
      : '<p class="loading">No bounties match.</p>';
    const now = Date.now();
    const next = items
      .filter((b) => isOpen(b, now))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
    nextEl.innerHTML = next
      ? `<span class="nd-label">Next deadline</span>
         <span class="nd-time" data-left="${esc(next.deadline)}">${timeLeft(next.deadline, now)}</span>
         <span class="nd-name">${esc(next.title)}</span>`
      : '';
  }

  root.querySelector('#boardSearch').addEventListener('input', (e) => {
    query = e.target.value;
    paint();
  });
  root.querySelector('.chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chip]');
    if (!btn) return;
    chip = btn.dataset.chip;
    for (const node of root.querySelectorAll('.chip')) {
      node.classList.toggle('active', node.dataset.chip === chip);
    }
    paint();
  });
  root.querySelector('#boardSort').addEventListener('change', (e) => {
    sort = e.target.value;
    paint();
  });
  listEl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...listEl.querySelectorAll('.bounty-row')];
    if (!rows.length) return;
    e.preventDefault();
    focusIndex = e.key === 'ArrowDown'
      ? Math.min(rows.length - 1, focusIndex + 1)
      : Math.max(0, focusIndex - 1);
    rows[focusIndex].focus();
  });

  return get('/competitions').then((data) => {
    items = data.items || [];
    paint();
  });
}
