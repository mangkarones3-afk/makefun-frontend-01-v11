// bounty.js — one bounty's page: summary, rules and description (markdown
// rendered safely: the text is escaped first, then a small markdown subset is
// applied), the live-pot fact cards, and the rewards table whose Base prize,
// Fee share and Pays now columns are the API's own rewardsNow figures.

import { getJSON } from './api.js';
import { money, count, dateShort, timeLeft } from './format.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

// markdown(md) — headings, lists, paragraphs and inline marks, on escaped text.
export function markdown(md) {
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) {
      out.push('</' + list + '>');
      list = null;
    }
  };
  for (const raw of escapeHtml(md || '').split('\n')) {
    const line = raw.trim();
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const bullet = line.match(/^[-*]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 5);
      out.push('<h' + level + '>' + inlineMd(h[2]) + '</h' + level + '>');
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push('<' + kind + '>');
        list = kind;
      }
      out.push('<li>' + inlineMd((bullet || numbered)[1]) + '</li>');
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push('<p>' + inlineMd(line) + '</p>');
    }
  }
  closeList();
  return out.join('\n');
}

function factCard(label, big, sub) {
  return (
    '<div class="fact"><span class="fact-label">' + label + '</span>' +
    '<span class="fact-big">' + big + '</span>' +
    '<span class="fact-sub">' + sub + '</span></div>'
  );
}

export async function renderBounty(view, slug) {
  const b = await getJSON('/competitions/' + encodeURIComponent(slug));
  const now = Date.now();
  const open = new Date(b.deadline).getTime() > now;
  const rewards = Array.isArray(b.rewardsNow) ? b.rewardsNow : [];
  const leaders = await getJSON('/competitions/' + encodeURIComponent(slug) + '/leaderboard').catch(() => null);
  const top = leaders && leaders.entries ? leaders.entries.slice(0, 5) : [];

  const facts =
    factCard('Live pot', money(b.potUsd ?? b.rewardAmount), money(b.rewardAmount) + ' base + ' + money(b.entryFeesUsd) + ' fees') +
    factCard('Entry fee', Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free entry', 'Paid once per account') +
    factCard(
      'Time left',
      '<span data-timeleft-to="' + b.deadline + '">' + (open ? timeLeft(b.deadline, now) : 'Closed') + '</span>',
      'Deadline ' + dateShort(b.deadline),
    ) +
    factCard('Entries', count(b.submissionCount), count(b.entryFeePayers) + ' fee payers');

  const rewardRows = rewards
    .map(
      (r) =>
        '<tr><td>' + r.place + '</td><td>' + money(r.baseUsd) + '</td><td>' + money(r.feeShareUsd) + '</td>' +
        '<td><strong>' + money(r.amountUsd) + '</strong></td></tr>',
    )
    .join('');

  const leaderRows = top
    .map(
      (e) =>
        '<li><a href="#/profile/' + encodeURIComponent(e.handle) + '">@' + escapeHtml(e.handle) + '</a>' +
        ' <span class="leader-title">' + escapeHtml(e.title || '') + '</span></li>',
    )
    .join('');

  view.innerHTML =
    '<article class="bounty">' +
    '<p class="crumbs"><a href="#/">← Board</a> · <a href="#/leaderboard/' + encodeURIComponent(slug) + '">Leaderboard →</a></p>' +
    '<h1 class="bounty-title"></h1>' +
    '<p class="bounty-meta"></p>' +
    '<section class="facts">' + facts + '</section>' +
    '<h2>Rewards</h2>' +
    '<table class="rewards"><thead><tr><th>Place</th><th>Base prize</th><th>Fee share</th><th>Pays now</th></tr></thead>' +
    '<tbody>' + rewardRows + '</tbody></table>' +
    (top.length ? '<h2>Leading entries</h2><ul class="leaders">' + leaderRows + '</ul>' : '') +
    '<div class="prose"></div>' +
    '</article>';

  view.querySelector('.bounty-title').textContent = b.title;
  view.querySelector('.bounty-meta').textContent =
    (b.sponsor ? b.sponsor.name : 'make.fun') + ' · ' + b.category +
    ((b.skills && b.skills.length) ? ' · ' + b.skills.join(', ') : '') +
    ' · ' + (open ? 'Open for entries' : 'Closed') +
    ' · Published ' + dateShort(b.publishedAt) + ' · Deadline ' + dateShort(b.deadline);
  view.querySelector('.prose').innerHTML = markdown(b.description || b.summary || '');
}
