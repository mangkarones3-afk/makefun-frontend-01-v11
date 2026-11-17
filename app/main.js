// main.js — the shell: masthead, Live status bar, the board rail, routing.
//
// Views are separate modules attached by dynamic import(), so the first
// load is this shell alone and each view's code arrives only when its
// route is opened. The rail and the board view read the same cached
// /competitions response, so the master-detail layout costs one request.

import { get, onStats, stats, state } from './api.js';
import { moneyShort, timeLeft } from './format.js';

const app = document.getElementById('app');

app.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="#/">make.fun</a>
    <p class="tagline">The bounty board, read live.</p>
    <nav class="mainnav">
      <a href="#/" data-nav="board">Board</a>
      <a href="#/leaderboard/makefun-frontend-01" data-nav="leaderboard">Leaderboard</a>
      <a href="#/profile/mangkarones" data-nav="profile">Profile</a>
    </nav>
  </header>
  <div class="statusbar" role="status">
    <span class="statuslabel">Live status</span>
    <span id="statusText">Live — fetching…</span>
    <span class="statussep">·</span>
    <span id="statusCounts">0 requests · 0 revalidated (304) · 0 from cache</span>
    <span class="clock" id="clock">--:--:--</span>
  </div>
  <div class="layout">
    <aside class="rail" id="rail" aria-label="Live board"></aside>
    <main class="view" id="view"></main>
  </div>`;

const viewEl = document.getElementById('view');
const railEl = document.getElementById('rail');
const statusText = document.getElementById('statusText');
const statusCounts = document.getElementById('statusCounts');
const clockEl = document.getElementById('clock');

function paintStatus() {
  statusText.textContent = state.status;
  statusCounts.textContent =
    `${stats.requests} ${stats.requests === 1 ? 'request' : 'requests'} · ` +
    `${stats.revalidated} revalidated (304) · ${stats.fromCache} from cache`;
}
onStats(paintStatus);
paintStatus();

setInterval(() => {
  clockEl.textContent = new Date().toLocaleTimeString('en-GB');
}, 1000);
clockEl.textContent = new Date().toLocaleTimeString('en-GB');

// --- cleanups: views register timers/listeners, the router runs them ---
let cleanups = [];
export function onCleanup(fn) {
  cleanups.push(fn);
}
function runCleanups() {
  for (const fn of cleanups) {
    try { fn(); } catch { /* a view's cleanup must never break routing */ }
  }
  cleanups = [];
}

// --- the rail: the live board list beside every view (one cached read) ---
let railSlug = null;
async function paintRail() {
  try {
    const data = await get('/competitions');
    const items = (data.items || []).slice(0, 14);
    railEl.innerHTML =
      `<p class="railhead">Live board</p>` +
      items.map((b) => `
        <a class="railrow${b.slug === railSlug ? ' active' : ''}" href="#/bounty/${b.slug}">
          <span class="railtitle">${escapeHtml(b.title)}</span>
          <span class="railmeta">${moneyShort(b.potUsd ?? b.rewardAmount)} · ${timeLeft(b.deadline)}</span>
        </a>`).join('');
  } catch {
    railEl.innerHTML = '<p class="railhead">Live board</p><p class="railmeta">Board unavailable.</p>';
  }
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// --- routing ---
const routes = [
  { name: 'board', pattern: /^\/?$/, load: () => import('./board.js') },
  { name: 'bounty', pattern: /^\/bounty\/([\w-]+)$/, load: () => import('./bounty.js') },
  { name: 'leaderboard', pattern: /^\/leaderboard\/([\w-]+)$/, load: () => import('./leaderboard.js') },
  { name: 'profile', pattern: /^\/profile\/([\w-]+)$/, load: () => import('./profile.js') },
];

let routeToken = 0;

async function route() {
  const token = ++routeToken;
  runCleanups();
  window.__shotReady = false;
  const hash = location.hash.replace(/^#/, '');
  let matched = routes[0];
  let arg = null;
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) { matched = r; arg = m[1] ?? null; break; }
  }
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('current', a.dataset.nav === matched.name);
  });
  railSlug = matched.name === 'bounty' ? arg : null;
  viewEl.innerHTML = '<p class="loading">Loading…</p>';
  paintRail();
  try {
    const mod = await matched.load();
    if (token !== routeToken) return;
    await mod.render(viewEl, arg);
  } catch (err) {
    if (token !== routeToken) return;
    viewEl.innerHTML = `<p class="error">This view could not load. ${escapeHtml(err.message || err)}</p>`;
  }
  if (token === routeToken) window.__shotReady = true;
}

window.addEventListener('hashchange', route);

// "/" focuses the board search from anywhere: on the board it focuses the
// input directly; elsewhere it goes to the board first, then focuses.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  e.preventDefault();
  const focusSearch = () => {
    const input = document.getElementById('boardSearch');
    if (input) input.focus();
  };
  if (document.getElementById('boardSearch')) focusSearch();
  else {
    location.hash = '#/';
    setTimeout(focusSearch, 350);
  }
});

route();
