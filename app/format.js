// format.js — money, number and time formatting for the whole app.
// Every figure the app prints comes through here, so a dollar is a dollar
// everywhere: two decimals from the API's own strings, never re-rounded.

export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyShort(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return '$' + n.toLocaleString('en-US');
  return money(n);
}

export function int(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

// Win rates travel as micro values (956066 = 95.6066%).
export function pct(micro, digits = 2) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(digits) + '%';
}

export function plural(n, one, many) {
  return n === 1 ? one : many || one + 's';
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "2h 06m left", "1d 8h left", "Closed".
export function timeLeft(deadline, now = Date.now()) {
  const t = new Date(deadline).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = t - now;
  if (diff <= 0) return 'Closed';
  if (diff >= DAY) {
    const d = Math.floor(diff / DAY);
    const h = Math.floor((diff % DAY) / HOUR);
    return `${d}d ${h}h left`;
  }
  if (diff >= HOUR) {
    const h = Math.floor(diff / HOUR);
    const m = Math.floor((diff % HOUR) / MINUTE);
    return `${h}h ${String(m).padStart(2, '0')}m left`;
  }
  if (diff >= MINUTE) {
    const m = Math.floor(diff / MINUTE);
    const s = Math.floor((diff % MINUTE) / SECOND);
    return `${m}m ${String(s).padStart(2, '0')}s left`;
  }
  return `${Math.floor(diff / SECOND)}s left`;
}

// "02:06:32" ticking countdown for the deadline box and fact cards.
export function countdown(deadline, now = Date.now()) {
  const t = new Date(deadline).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = t - now;
  if (diff <= 0) return '00:00:00';
  const total = Math.floor(diff / SECOND);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
  return d > 0 ? `${d}d ${hms}` : hms;
}

export function dateShort(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return '—';
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
