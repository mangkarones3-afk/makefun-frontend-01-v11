// main.js — the shell every route shares: masthead, the live status bar
// (with the cache's real counters), the board rail, and the hash router.
// Views arrive by import() only when their route is opened, so the first
// load stays the shell page alone.

import { get, onStatus, statusSnapshot } from './api.js';
import { money, timeLeft, clockTime } from './format.js';

export function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const app = document.getElementById('app');

app.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="#/">make.fun</a>
    <span class="tagline">The bounty board, read live.</span>
    <nav class="topnav">
      <a href="#/">Board</a>
      <span class="navhint">Pick a bounty for its page, its leaderboard and its people.</span>
    </nav>
  </header>
  <section class="statusbar" aria-label="Live status">
    <span class="status-dot" aria-hidden="true"></span>
    <span class="status-label" id="statusLabel">Live status</span>
    <span class="status-counts" id="statusCounts"></span>
    <span class="status-clock" id="statusClock"></span>
  </section>
  <div class="layout">
    <aside class="rail" id="rail" aria-label="All bounties"></aside>
    <main class="view" id="view"></main>
  </div>`;

const viewEl = document.getElementById('view');
const railEl = document.getElementById('rail');
const labelEl = document.getElementById('statusLabel');
const countsEl = document.getElementById('statusCounts');
const clockEl = document.getElementById('statusClock');

function paintStatus(snap) {
  labelEl.textContent = snap.label;
  const s = snap.stats;
  countsEl.textContent =
    `${s.requests} request${s.requests === 1 ? '' : 's'} · ` +
    `${s.revalidated} revalidated (304) · ${s.cacheServes} from cache`;
}
paintStatus(statusSnapshot());
onStatus(paintStatus);

// One tick a second: the status clock and every live countdown on the page
// (elements carrying data-left="<deadline iso>") stay honest.
function tick() {
  clockEl.textContent = clockTime(new Date());
  const now = Date.now();
  for (const node of document.querySelectorAll('[data-left]')) {
    node.textContent = timeLeft(node.dataset.left, now);
  }
}
tick();
setInterval(tick, 1000);

// --- the rail: the board's own read, reused beside every view ---------

let railSlug = null;

function paintRail(items) {
  const now = Date.now();
  railEl.innerHTML =
    '<h2 class="rail-title">Live board</h2>' +
    items
      .map((b) => {
        const cls = b.slug === railSlug ? 'rail-item active' : 'rail-item';
        return `<a class="${cls}" href="#/bounty/${encodeURIComponent(b.slug)}">
          <span class="rail-name">${esc(b.title)}</span>
          <span class="rail-meta">${money(b.potUsd ?? b.rewardAmount)} pot · ` +
          `<span data-left="${esc(b.deadline)}">${timeLeft(b.deadline, now)}</span></span></a>`;
      })
      .join('');
}

async function loadRail() {
  try {
    const data = await get('/competitions');
    paintRail(data.items || []);
  } catch {
    railEl.innerHTML = '<h2 class="rail-title">Live board</h2><p class="rail-note">Board unavailable.</p>';
  }
}
loadRail();

// --- the router ---------------------------------------------------------

const routes = [
  { pattern: /^#\/bounty\/([^/]+)\/leaderboard$/, view: 'leaderboard', key: 'slug' },
  { pattern: /^#\/bounty\/([^/]+)$/, view: 'bounty', key: 'slug' },
  { pattern: /^#\/u\/([^/]+)$/, view: 'profile', key: 'handle' },
];

let navigation = 0;

async function render() {
  const ticket = ++navigation;
  window.__shotReady = false;
  const hash = location.hash || '#/';
  let name = 'board';
  let param = null;
  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (match) {
      name = route.view;
      param = decodeURIComponent(match[1]);
      break;
    }
  }
  railSlug = name === 'bounty' || name === 'leaderboard' ? param : null;
  if (railEl.children.length > 1) loadRail();

  try {
    let mod;
    if (name === 'bounty') mod = await import('./bounty.js');
    else if (name === 'leaderboard') mod = await import('./leaderboard.js');
    else if (name === 'profile') mod = await import('./profile.js');
    else mod = await import('./board.js');
    if (ticket !== navigation) return;
    await mod.render(viewEl, param);
  } catch (err) {
    if (ticket !== navigation) return;
    viewEl.innerHTML = `<section class="notice"><h1>Something failed to load</h1>` +
      `<p>${esc(err && err.message ? err.message : err)}</p>` +
      `<p><a href="#/">Back to the board</a></p></section>`;
  }
  if (ticket === navigation) window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();

// "/" focuses the board search from anywhere.
window.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  event.preventDefault();
  const box = document.getElementById('boardSearch');
  if (box) {
    box.focus();
  } else {
    location.hash = '#/';
    setTimeout(() => document.getElementById('boardSearch')?.focus(), 60);
  }
});
