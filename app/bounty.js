// bounty.js — one bounty's page: summary, fact cards, the rewards table
// priced off the live pot, its description and its latest entries.

import { get } from './api.js';
import { esc } from './main.js';
import { commas, dateShort, isOpen, money, money2, timeLeft } from './format.js';

// Escape first, then a small markdown subset — API text can never
// become markup the author did not write.
function inline(text) {
  return text
    .split('`')
    .map((part, i) => {
      if (i % 2 === 1) return '<code>' + part + '</code>';
      return part
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) =>
          /^(https:\/\/|\/|#)/.test(url) ? `<a href="${url}">${label}</a>` : label);
    })
    .join('');
}

function markdown(src) {
  const lines = esc(src || '').split('\n');
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (list) out.push('<ul>' + list.map((li) => '<li>' + inline(li) + '</li>').join('') + '</ul>');
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara(); flushList();
      const tag = heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4';
      out.push(`<${tag}>` + inline(heading[2]) + `</${tag}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      (list ??= []).push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

function rewardsTable(b) {
  const now = Array.isArray(b.rewardsNow) ? b.rewardsNow : [];
  if (now.length) {
    const rows = now.map((r) =>
      `<tr><td>${r.place}</td><td>${money2(r.baseUsd)}</td>` +
      `<td>${money2(r.feeShareUsd)}</td><td><strong>${money2(r.amountUsd)}</strong></td></tr>`).join('');
    return `<table class="rewards"><thead><tr>
      <th>Place</th><th>Base prize</th><th>Fee share</th><th>Pays now</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <p class="table-note">Pays now is the live figure: the base prize plus this place's share of the entry fees in the pot.</p>`;
  }
  const base = b.rewards || {};
  const places = Object.keys(base).sort((a, c) => Number(a) - Number(c));
  if (!places.length) return '<p>No rewards published.</p>';
  const rows = places.map((p) =>
    `<tr><td>${p}</td><td><strong>${money2(base[p])}</strong></td></tr>`).join('');
  return `<table class="rewards"><thead><tr><th>Place</th><th>Base prize</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export async function render(root, slug) {
  root.innerHTML = '<p class="loading">Loading the bounty…</p>';
  const b = await get('/competitions/' + encodeURIComponent(slug));
  const open = isOpen(b);
  const potSub = b.rewardAmount != null && b.entryFeesUsd != null
    ? `${money(b.rewardAmount)} base + ${money(b.entryFeesUsd)} fees`
    : 'Base prize pool';
  const latest = (b.submissions || []).slice(0, 8);

  root.innerHTML = `
    <p class="crumbs"><a href="#/">← Board</a> · <a href="#/bounty/${encodeURIComponent(slug)}/leaderboard">Leaderboard →</a></p>
    <h1 class="bounty-h">${esc(b.title)}</h1>
    <p class="subline">make.fun · ${esc(b.category)}${b.skills?.length ? ' · ' + esc(b.skills.join(', ')) : ''}
      · ${open ? 'Open for entries' : 'Closed'} · Published ${dateShort(b.publishedAt)} · Deadline ${dateShort(b.deadline)}</p>
    <section class="cards" aria-label="Bounty facts">
      <div class="card"><label>Live pot</label><strong class="card-big">${money(b.potUsd ?? b.rewardAmount)}</strong><span>${potSub}</span></div>
      <div class="card"><label>Entry fee</label><strong class="card-big">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</strong><span>${b.entryFeeUsd ? 'Paid once per account' : 'No fee to enter'}</span></div>
      <div class="card"><label>Time left</label><strong class="card-big" data-left="${esc(b.deadline)}">${timeLeft(b.deadline)}</strong><span>Deadline ${dateShort(b.deadline)}</span></div>
      <div class="card"><label>Entries</label><strong class="card-big">${commas(b.submissionCount || 0)}</strong><span>${b.entryFeePayers ? commas(b.entryFeePayers) + ' fee payers' : 'Submitted so far'}</span></div>
    </section>
    <h2 class="section-h">Rewards</h2>
    ${rewardsTable(b)}
    <h2 class="section-h">About this bounty</h2>
    <div class="prose">${markdown(b.description)}</div>
    ${b.resolution?.summary ? `<h2 class="section-h">How it is decided</h2><div class="prose">${markdown(b.resolution.summary)}</div>` : ''}
    ${latest.length ? `<h2 class="section-h">Latest entries</h2>
      <ul class="entries-list">${latest.map((s) =>
        `<li><a href="#/u/${encodeURIComponent(s.hunter)}">@${esc(s.hunter)}</a> — ${esc(s.title || 'Untitled entry')}
         <span class="entry-status">${esc(s.status || '')}</span></li>`).join('')}</ul>` : ''}`;
}
