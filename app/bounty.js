// bounty.js — one bounty's page: fact cards from the live payload, the
// rewards table at today's values, and the description's markdown
// rendered safely (HTML escaped first, a small subset applied after).

import { get } from './api.js';
import { countdown, int, money, timeLeft } from './format.js';
import { escapeHtml, onCleanup } from './main.js';

function mdInline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

// Escape first, then structure: headings, lists, paragraphs. Nothing the
// payload contains can become markup the author did not intend.
export function markdown(src) {
  const lines = escapeHtml(src || '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(list === 'ul' ? '</ul>' : '</ol>'); list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length + 1}>${mdInline(h[2])}</h${h[1].length + 1}>`); continue; }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${mdInline(bullet[1])}</li>`);
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${mdInline(numbered[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${mdInline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

export async function render(el, slug) {
  const b = await get('/competitions/' + slug);
  const rewards = b.rewardsNow || [];
  const closed = new Date(b.deadline).getTime() <= Date.now();

  el.innerHTML = `
    <p class="crumbs"><a href="#/">← The board</a> · ${escapeHtml(b.sponsor?.name || 'make.fun')} · ${escapeHtml(b.category || '')}</p>
    <h1 class="bountytitle">${escapeHtml(b.title)}</h1>
    <section class="factcards">
      <div class="factcard">
        <span class="factlabel">Live pot</span>
        <span class="factvalue">${money(b.potUsd ?? b.rewardAmount)}</span>
        <span class="factsub">${money(b.rewardAmount)} base + ${money(b.entryFeesUsd)} fees</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Entry fee</span>
        <span class="factvalue">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</span>
        <span class="factsub">${b.entryFeeUsd ? 'paid once per account' : 'no fee to enter'}</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Time left</span>
        <span class="factvalue" id="bountyClock">${closed ? 'Closed' : countdown(b.deadline)}</span>
        <span class="factsub">${closed ? 'deadline passed' : 'until the deadline'}</span>
      </div>
      <div class="factcard">
        <span class="factlabel">Entries</span>
        <span class="factvalue">${int(b.submissionCount)}</span>
        <span class="factsub">submissions so far</span>
      </div>
    </section>
    ${rewards.length ? `
    <h2>Rewards — what each place pays now</h2>
    <table class="rewards">
      <thead><tr><th>Place</th><th>Base prize</th><th>Fee share</th><th>Pays now</th></tr></thead>
      <tbody>
        ${rewards.map((r) => `<tr><td>${r.place}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`).join('')}
      </tbody>
    </table>` : ''}
    <p class="viewlinks"><a class="buttonlink" href="#/leaderboard/${b.slug}">See the leaderboard →</a></p>
    <h2>About this bounty</h2>
    <div class="prose">${markdown(b.description)}</div>`;

  if (!closed) {
    const clock = el.querySelector('#bountyClock');
    const timer = setInterval(() => { if (clock) clock.textContent = countdown(b.deadline); }, 1000);
    onCleanup(() => clearInterval(timer));
  }
}
