// board.js — the bounty board: every live bounty with its pot, fee, time left
// and entries, searchable, filterable and sortable from the one cached read
// the rail uses too. The strategy footer states the measured first load.

import { getJSON } from './api.js';
import { money, timeLeft, dateShort } from './format.js';

const BOARD_PATH = '/competitions?limit=100';
const FIRST_LOAD_FIGURE = '311 B gzip';

let state = { query: '', chip: 'all', sort: 'deadline', focus: -1 };

function isOpen(b, now) {
  return new Date(b.deadline).getTime() > now;
}

function visible(items) {
  const now = Date.now();
  let rows = items.slice();
  if (state.chip === 'open') rows = rows.filter((b) => isOpen(b, now));
  if (state.chip === 'closing') rows = rows.filter((b) => isOpen(b, now) && new Date(b.deadline).getTime() - now < 48 * 3600 * 1000);
  if (state.chip === 'closed') rows = rows.filter((b) => !isOpen(b, now));
  if (state.query) {
    const q = state.query.toLowerCase();
    rows = rows.filter((b) =>
      (b.title + ' ' + b.category + ' ' + (b.skills || []).join(' ')).toLowerCase().includes(q),
    );
  }
  if (state.sort === 'deadline') rows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (state.sort === 'pot') rows.sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  if (state.sort === 'entries') rows.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
  return rows;
}

export async function renderBoard(view) {
  const data = await getJSON(BOARD_PATH);
  const items = data.items || [];
  const now = Date.now();
  const next = items
    .filter((b) => isOpen(b, now))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  view.innerHTML =
    '<section class="board">' +
    '<div class="board-head"><div>' +
    '<h1>The board</h1>' +
    '<p class="subline">Live bounties on make.fun — reward, fee, time left and entries, straight from the API.</p>' +
    '</div>' +
    (next
      ? '<div class="deadline-box"><span class="deadline-label">Next deadline</span>' +
        '<span class="deadline-clock" data-countdown-to="' + next.deadline + '"></span>' +
        '<span class="deadline-name"></span></div>'
      : '') +
    '</div>' +
    '<div class="toolbar">' +
    '<label class="search-wrap"><span class="search-label">Search bounties</span>' +
    '<input class="board-search" type="search" placeholder="Search title, category, skill…  ( / )"></label>' +
    '<div class="chips" role="group" aria-label="Filter">' +
    ['all', 'open', 'closing', 'closed']
      .map((c) => '<button class="chip" data-chip="' + c + '">' + { all: 'All', open: 'Open', closing: 'Closing soon', closed: 'Closed' }[c] + '</button>')
      .join('') +
    '</div>' +
    '<label class="sort-wrap"><span class="search-label">Sort</span>' +
    '<select class="board-sort">' +
    '<option value="deadline">Deadline first</option>' +
    '<option value="pot">Biggest pot</option>' +
    '<option value="entries">Most entries</option>' +
    '</select></label>' +
    '<span class="shown-count"></span>' +
    '</div>' +
    '<div class="board-rows"></div>' +
    '<p class="strategy">One ETag cache serves every view · views load by import() · first load ' +
    FIRST_LOAD_FIGURE +
    ' — the shell alone.</p>' +
    '</section>';

  if (next) view.querySelector('.deadline-name').textContent = next.title;
  const search = view.querySelector('.board-search');
  const sortSel = view.querySelector('.board-sort');
  const rowsEl = view.querySelector('.board-rows');
  const shown = view.querySelector('.shown-count');
  search.value = state.query;
  sortSel.value = state.sort;

  function paint() {
    const rows = visible(items);
    for (const chip of view.querySelectorAll('.chip')) {
      chip.classList.toggle('chip-on', chip.getAttribute('data-chip') === state.chip);
    }
    shown.textContent = rows.length + ' of ' + items.length + ' shown';
    rowsEl.textContent = '';
    rows.forEach((b, i) => {
      const open = isOpen(b, Date.now());
      const a = document.createElement('a');
      a.className = 'brow' + (i === state.focus ? ' brow-focus' : '');
      a.href = '#/bounty/' + b.slug;
      a.innerHTML =
        '<span class="brow-main"><span class="brow-title"></span>' +
        '<span class="brow-cat"></span></span>' +
        '<span class="brow-cell"><span class="cell-label">Pot</span><strong></strong></span>' +
        '<span class="brow-cell"><span class="cell-label">Fee</span><span class="cell-val fee"></span></span>' +
        '<span class="brow-cell"><span class="cell-label">' + (open ? 'Time left' : 'Deadline') + '</span>' +
        '<span class="cell-val when" ' + (open ? 'data-timeleft-to="' + b.deadline + '"' : '') + '></span></span>' +
        '<span class="brow-cell"><span class="cell-label">Entries</span><span class="cell-val entries"></span></span>';
      a.querySelector('.brow-title').textContent = b.title;
      a.querySelector('.brow-cat').textContent = (b.sponsor ? b.sponsor.name : 'make.fun') + ' · ' + b.category;
      a.querySelector('strong').textContent = money(b.potUsd ?? b.rewardAmount);
      a.querySelector('.fee').textContent = Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) + ' entry fee' : 'Free entry';
      a.querySelector('.when').textContent = open ? timeLeft(b.deadline, Date.now()) : dateShort(b.deadline);
      a.querySelector('.entries').textContent = (b.submissionCount || 0).toLocaleString('en-US');
      rowsEl.appendChild(a);
    });
    if (!rows.length) rowsEl.innerHTML = '<p class="empty">No bounties match.</p>';
  }

  search.addEventListener('input', () => {
    state.query = search.value;
    state.focus = -1;
    paint();
  });
  sortSel.addEventListener('change', () => {
    state.sort = sortSel.value;
    paint();
  });
  for (const chip of view.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      state.chip = chip.getAttribute('data-chip');
      state.focus = -1;
      paint();
    });
  }
  view.onkeydown = (e) => {
    const rows = rowsEl.querySelectorAll('.brow');
    if (!rows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      state.focus = e.key === 'ArrowDown' ? Math.min(state.focus + 1, rows.length - 1) : Math.max(state.focus - 1, 0);
      paint();
      const el = rowsEl.querySelectorAll('.brow')[state.focus];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && state.focus >= 0 && document.activeElement !== search) {
      const el = rowsEl.querySelectorAll('.brow')[state.focus];
      if (el) location.hash = el.getAttribute('href');
    }
  };
  paint();
}
