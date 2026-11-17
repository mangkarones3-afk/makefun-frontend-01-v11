// profile.js — an account's public profile: who they are, their record
// across competitions, and what they have entered lately.

import { get } from './api.js';
import { esc } from './main.js';
import { commas, dateShort, money } from './format.js';

export async function render(root, handle) {
  root.innerHTML = '<p class="loading">Loading the profile…</p>';
  const p = await get('/profiles/' + encodeURIComponent(handle));
  const rec = p.record || {};
  const avatar = p.image || p.avatar?.url;
  const solutions = p.solutions || [];

  root.innerHTML = `
    <section class="profile-head">
      ${avatar ? `<img class="avatar-lg" crossorigin="anonymous" src="https://make.fun${esc(avatar)}" alt="">` : ''}
      <div>
        <h1 class="bounty-h">@${esc(p.handle)}</h1>
        <p class="subline">${p.display_name ? esc(p.display_name) + ' · ' : ''}Joined ${dateShort(p.joined_at)}</p>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      </div>
    </section>
    <section class="cards" aria-label="Record">
      <div class="card"><label>Entered</label><strong class="card-big">${commas(rec.competitions_entered || 0)}</strong><span>Competitions</span></div>
      <div class="card"><label>Placed</label><strong class="card-big">${commas(rec.competitions_placed || 0)}</strong><span>${commas(rec.competitions_won || 0)} won</span></div>
      <div class="card"><label>Best placement</label><strong class="card-big">${rec.best_placement ? '#' + commas(rec.best_placement) : '—'}</strong><span>Across all entries</span></div>
      <div class="card"><label>Prizes</label><strong class="card-big">${money(rec.prize_usd || 0)}</strong><span>Won so far</span></div>
    </section>
    <h2 class="section-h">Recent entries</h2>
    ${solutions.length
      ? `<ul class="entries-list">${solutions.slice(0, 12).map((s) => {
          const comp = s.competition || {};
          const where = comp.slug
            ? `<a href="#/bounty/${encodeURIComponent(comp.slug)}">${esc(comp.title || comp.slug)}</a>`
            : esc(comp.title || 'Competition');
          const placed = s.placement ? ` · placed #${commas(s.placement)}` : '';
          const prize = s.prize_usd ? ` · ${money(s.prize_usd)}` : '';
          return `<li>${esc(s.title || 'Untitled entry')} — ${where}
            <span class="entry-status">${dateShort(s.entered_at)}${placed}${prize}</span></li>`;
        }).join('')}</ul>`
      : '<p>No entries yet.</p>'}`;
}
