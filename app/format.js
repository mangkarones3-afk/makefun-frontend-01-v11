// format.js — money, number, date and time-left formatting for the make.fun API's shapes.
// The API sends money as decimal strings ("810.00") or numbers (500); both land here.

export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function count(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function ratePct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(2) + '%';
}

export function dateShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeLeft(iso, now) {
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return '—';
  let ms = end - now;
  if (ms <= 0) return 'Closed';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return days + 'd ' + hours + 'h left';
  if (hours > 0) return hours + 'h ' + String(mins).padStart(2, '0') + 'm left';
  return mins + 'm ' + String(secs).padStart(2, '0') + 's left';
}

export function countdown(iso, now) {
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return '—';
  let ms = end - now;
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (days > 0 ? days + 'd ' : '') + hh + ':' + mm + ':' + ss;
}
