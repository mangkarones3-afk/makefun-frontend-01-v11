// api.js — the app's one cache for every make.fun read.
//
// A Map keyed by URL holds { etag, body }. A repeat read revalidates with
// If-None-Match and treats a 304 as "unchanged": the cached body is served
// again instead of the payload being downloaded twice. Requests for the
// same URL that overlap in time share one fetch (in-flight de-dup), so the
// board rail and the board view never cost two requests between them.
//
// The counters are honest session counts, shown in the status bar:
//   requests    — fetches actually made
//   revalidated — fetches the server answered 304
//   fromCache   — reads served out of the cache after a 304

const BASE = 'https://make.fun/api';

const cache = new Map();
const inflight = new Map();

export const stats = { requests: 0, revalidated: 0, fromCache: 0 };
export const state = { status: 'Live — fetching…', at: 0 };

const listeners = new Set();

export function onStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn({ ...stats }, { ...state });
}

export function apiUrl(path) {
  return BASE + path;
}

export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return 'https://make.fun' + path;
}

export async function get(path) {
  const url = BASE + path;
  const pending = inflight.get(url);
  if (pending) return pending;

  const run = (async () => {
    const hit = cache.get(url);
    const headers = {};
    if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
    stats.requests += 1;
    let res;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      state.status = 'Offline — showing the last cached read';
      emit();
      if (hit) return hit.body;
      throw err;
    }
    if (res.status === 304 && hit) {
      stats.revalidated += 1;
      stats.fromCache += 1;
      state.status = 'Served from cache — revalidated, unchanged';
      state.at = Date.now();
      emit();
      return hit.body;
    }
    if (!res.ok) throw new Error('make.fun answered HTTP ' + res.status);
    const body = await res.json();
    cache.set(url, { etag: res.headers.get('etag'), body });
    state.status = 'Live — fetched just now';
    state.at = Date.now();
    emit();
    return body;
  })();

  inflight.set(url, run);
  try {
    return await run;
  } finally {
    inflight.delete(url);
  }
}
