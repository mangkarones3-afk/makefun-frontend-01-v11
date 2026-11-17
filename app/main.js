// main.js — the shell and the router. The masthead, the Live status bar and the
// master-detail rail are built once here; each route's view is loaded by a
// literal import() only when its route is opened, so the first load is the
// shell alone and every view arrives later, named in the dossier's Load block.

import { getJSON, onApiEvent, counters } from './api.js';
import { money, countdown, timeLeft } from './format.js';

const BOARD_PATH = '/competitions?limit=100';

const app = document.createElement('div');
app.className = 'app';
document.body.appendChild(app);

const masthead = document.createElement('header');
masthead.className = 'masthead';
masthead.innerHTML =
  '<a class="wordmark" href="#/">make.fun</a>' +
  '<span class="tagline">The bounty board, read live.</span>' +
  '<nav class="topnav"><a href="#/"><strong>Board</strong></a>' +
  '<span class="navhint">Pick a bounty for its page, its leaderboard and its people.</span></nav>';
app.appendChild(masthead);

const statusBar = document.createElement('div');
statusBar.className = 'statusbar';
statusBar.innerHTML =
  '<span class="status-dot" aria-hidden="true"></span>' +
  '<span class="status-label">Live status</span>' +
  '<span class="status-text">Connecting…</span>' +
  '<span class="status-counts"></span>' +
  '<span class="status-clock"></span>';
app.appendChild(statusBar);
const statusText = statusBar.querySelector('.status-text');
const statusCounts = statusBar.querySelector('.status-counts');
const statusClock = statusBar.querySelector('.status-clock');

const layout = document.createElement('div');
layout.className = 'layout';
const rail = document.createElement('aside');
rail.className = 'rail';
rail.innerHTML = '<h2 class="rail-title">Live board</h2><div class="rail-list"><p class="rail-loading">Loading bounties…</p></div>';
const view = document.createElement('main');
view.className = 'view';
layout.appendChild(rail);
layout.appendChild(view);
app.appendChild(layout);

const railList = rail.querySelector('.rail-list');

let statusNote = 'Connecting…';
function paintStatus() {
  statusText.textContent = statusNote;
  statusCounts.textContent =
    counters.requests + ' requests · ' + counters.revalidated + ' revalidated (304) · ' + counters.fromCache + ' from cache';
}
onApiEvent((kind) => {
  if (kind === 'request' && counters.requests === 1) statusNote = 'Live — fetching…';
  if (kind === 'revalidated') statusNote = 'Served from cache — revalidated, unchanged';
  if (kind === 'updated') {
    statusNote = 'Live — updated just now';
    renderRoute();
  }
  paintStatus();
});
paintStatus();

setInterval(() => {
  const now = Date.now();
  statusClock.textContent = new Date(now).toLocaleTimeString('en-GB');
  for (const el of document.querySelectorAll('[data-countdown-to]')) {
    el.textContent = countdown(el.getAttribute('data-countdown-to'), now);
  }
  for (const el of document.querySelectorAll('[data-timeleft-to]')) {
    el.textContent = timeLeft(el.getAttribute('data-timeleft-to'), now);
  }
}, 1000);

async function paintRail() {
  try {
    const data = await getJSON(BOARD_PATH);
    const items = (data.items || []).slice(0, 14);
    railList.textContent = '';
    for (const b of items) {
      const a = document.createElement('a');
      a.className = 'rail-item';
      a.href = '#/bounty/' + b.slug;
      const closed = new Date(b.deadline).getTime() <= Date.now();
      a.innerHTML = '<span class="rail-item-title"></span><span class="rail-item-meta"></span>';
      a.querySelector('.rail-item-title').textContent = b.title;
      a.querySelector('.rail-item-meta').textContent =
        money(b.potUsd ?? b.rewardAmount) + ' pot · ' + (closed ? 'Closed' : 'Open');
      railList.appendChild(a);
    }
    if (statusNote === 'Connecting…' || statusNote === 'Live — fetching…') statusNote = 'Live — fetched just now';
    paintStatus();
  } catch (err) {
    railList.innerHTML = '<p class="rail-loading">The board could not be loaded.</p>';
  }
}

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'leaderboard' && parts[1]) return { name: 'leaderboard', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'profile' && parts[1]) return { name: 'profile', handle: decodeURIComponent(parts[1]) };
  return { name: 'board' };
}

let rendering = false;
async function renderRoute() {
  if (rendering) return;
  rendering = true;
  window.__shotReady = false;
  const route = parseRoute();
  for (const item of railList.querySelectorAll('.rail-item')) {
    const on = route.name === 'bounty' && item.getAttribute('href') === '#/bounty/' + route.slug;
    item.classList.toggle('rail-on', on);
    if (on) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  try {
    if (route.name === 'bounty') {
      const mod = await import('./bounty.js');
      await mod.renderBounty(view, route.slug);
    } else if (route.name === 'leaderboard') {
      const mod = await import('./leaderboard.js');
      await mod.renderLeaderboard(view, route.slug);
    } else if (route.name === 'profile') {
      const mod = await import('./profile.js');
      await mod.renderProfile(view, route.handle);
    } else {
      const mod = await import('./board.js');
      await mod.renderBoard(view);
    }
  } catch (err) {
    view.innerHTML = '<p class="error">This page could not be loaded. <a href="#/">Back to the board</a></p>';
  }
  rendering = false;
  window.__shotReady = true;
}

window.addEventListener('hashchange', renderRoute);

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    e.preventDefault();
    const input = document.querySelector('.board-search');
    if (input) input.focus();
    else {
      location.hash = '#/';
      setTimeout(() => {
        const el = document.querySelector('.board-search');
        if (el) el.focus();
      }, 350);
    }
  }
});

paintRail();
renderRoute();
