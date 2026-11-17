// format.js — small display helpers shared by every view.
// All money on make.fun is USD; API amounts arrive as numbers or
// decimal strings, so every helper accepts either.

export function num(value) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function commas(value) {
  return Math.round(num(value)).toLocaleString('en-US');
}

// Whole dollars when the amount is integral, cents otherwise.
export function money(value) {
  const n = num(value);
  const body = Number.isInteger(n)
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + body;
}

// Always two decimals — for the rewards table, where columns must line up.
export function money2(value) {
  return '$' + num(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function dateShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function clockTime(date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// "2h 14m left", "3d 4h left", "Closed" once the deadline has passed.
export function timeLeft(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'Closed';
  if (ms < HOUR) return Math.max(1, Math.floor(ms / MIN)) + 'm left';
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    return m ? `${h}h ${m}m left` : `${h}h left`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  return h ? `${d}d ${h}h left` : `${d}d left`;
}

export function isOpen(item, now = Date.now()) {
  return new Date(item.deadline).getTime() > now;
}

// Win rates travel as micro values (956066 means 0.956066).
export function ratePct(micro) {
  return (num(micro) / 10_000).toFixed(2) + '%';
}
