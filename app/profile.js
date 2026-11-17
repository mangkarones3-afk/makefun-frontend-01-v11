// profile.js — an account's public profile: who they are, their record across
// every competition they have entered, and their recent entries, each linking
// back to its bounty's page.

import { getJSON } from './api.js';
import { money, count, dateShort } from './format.js';

function statCard(label, big, sub) {
  return (
    '<div class="fact"><span class="fact-label">' + label + '</span>' +
    '<span class="fact-big">' + big + '</span>' +
    '<span class="fact-sub">' + sub + '</span></div>'
  );
}

export async function renderProfile(view, handle) {
  const p = await getJSON('/profiles/' + encodeURIComponent(handle));
  const rec = p.record || {};
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];

  view.innerHTML =
    '<article class="profile">' +
    '<p class="crumbs"><a href="#/">← Board</a></p>' +
    '<div class="profile-head"><span class="profile-avatar"></span>' +
    '<div><h1 class="profile-name"></h1><p class="profile-meta"></p></div></div>' +
    '<section class="facts">' +
    statCard('Entered', count(rec.competitions_entered), 'Competitions') +
    statCard('Placed', count(rec.competitions_placed), count(rec.competitions_won) + ' won') +
    statCard('Best placement', rec.best_placement ? '#' + rec.best_placement : '—', 'Across all entries') +
    statCard('Prizes', money(rec.prize_usd), 'Won so far') +
    '</section>' +
    '<h2>Recent entries</h2>' +
    '<ul class="recent"></ul>' +
    '</article>';

  const avatarSlot = view.querySelector('.profile-avatar');
  const imgPath = (p.avatar && p.avatar.url) || p.image;
  if (imgPath) {
    const img = document.createElement('img');
    img.alt = '';
    img.setAttribute('crossorigin', 'anonymous'); // set before src: the API's images send CORP same-origin
    img.src = imgPath.startsWith('http') ? imgPath : 'https://make.fun' + imgPath;
    avatarSlot.appendChild(img);
  }
  view.querySelector('.profile-name').textContent = '@' + p.handle;
  view.querySelector('.profile-meta').textContent =
    (p.display_name ? p.display_name + ' · ' : '') + 'Joined ' + dateShort(p.joined_at) +
    (p.bio ? ' · ' + p.bio : '');

  const list = view.querySelector('.recent');
  for (const s of solutions.slice(0, 12)) {
    const li = document.createElement('li');
    const comp = s.competition || {};
    const a = document.createElement('a');
    a.href = '#/bounty/' + encodeURIComponent(comp.slug || '');
    a.textContent = s.title || comp.title || 'Entry';
    li.appendChild(a);
    const meta = document.createElement('span');
    meta.className = 'recent-meta';
    meta.textContent =
      ' — ' + (comp.title || '') +
      (s.placement ? ' · placed #' + s.placement : '') +
      (s.prize_usd ? ' · ' + money(s.prize_usd) : '');
    li.appendChild(meta);
    list.appendChild(li);
  }
  if (!solutions.length) list.innerHTML = '<li class="empty">No entries yet.</li>';
}
