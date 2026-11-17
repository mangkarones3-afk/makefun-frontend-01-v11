// profile.js — an account's public profile: stat cards from the payload's
// record block and the account's recent entries from its solutions list.

import { assetUrl, get } from './api.js';
import { dateShort, int, money } from './format.js';
import { escapeHtml } from './main.js';

export async function render(el, handle) {
  const p = await get('/profiles/' + encodeURIComponent(handle));
  const r = p.record || {};
  const solutions = p.solutions || [];
  const name = p.display_name || '@' + p.handle;

  el.innerHTML = `
    <section class="profilehead">
      ${p.image ? `<img class="bigavatar" src="${assetUrl(p.image)}" alt="" onerror="this.remove()">` : ''}
      <div>
        <h1>${escapeHtml(name)}</h1>
        <p class="subline">@${escapeHtml(p.handle)}${p.joined_at ? ' · on make.fun since ' + dateShort(p.joined_at) : ''}</p>
        ${p.bio ? `<p class="bio">${escapeHtml(p.bio)}</p>` : ''}
      </div>
    </section>
    <section class="factcards">
      <div class="factcard">
        <span class="factlabel">Entered</span>
        <span class="factvalue">${int(r.competitions_entered)}</span>
        <span class="factsub">competitions</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Placed / won</span>
        <span class="factvalue">${int(r.competitions_placed)} / ${int(r.competitions_won)}</span>
        <span class="factsub">in the prizes / first place</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Best placement</span>
        <span class="factvalue">${r.best_placement ? '#' + r.best_placement : '—'}</span>
        <span class="factsub">${int(r.podium_finishes)} podium finishes</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Prizes won</span>
        <span class="factvalue">${money(r.prize_usd)}</span>
        <span class="factsub">across all bounties</span>
      </div>
    </section>
    <h2>Recent entries</h2>
    <div class="solutionlist">
      ${solutions.slice(0, 10).map((s) => `
        <a class="solutionrow" href="#/bounty/${s.competition?.slug || ''}">
          <span class="rowmain">
            <span class="rowtitle">${escapeHtml(s.title || 'Entry')}</span>
            <span class="rowsub">${escapeHtml(s.competition?.title || '')}</span>
          </span>
          <span class="rowcell"><span class="celllabel">Status</span>${escapeHtml(s.competition?.status || '')}</span>
        </a>`).join('') || '<p class="empty">No entries yet.</p>'}
    </div>`;
}
