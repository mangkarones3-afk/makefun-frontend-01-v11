// api.js — the app's only door to the make.fun API: one cache for every read.
// Each URL is fetched once; later reads are served from the cache at once and
// revalidated in the background with If-None-Match (the API's ETags turn over
// each minute, so a 304 is the common answer). In-flight requests are shared,
// so the board list the rail and the board view both need costs one request.

export const API_BASE = 'https://make.fun/api';

const cache = new Map(); // url -> { etag, body }
const inflight = new Map(); // url -> Promise<body>
const listeners = new Set();

export const counters = { requests: 0, revalidated: 0, fromCache: 0 };

export function onApiEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(kind) {
  for (const fn of listeners) fn(kind, counters);
}

async function fetchBody(url, etag) {
  const headers = {};
  if (etag) headers['If-None-Match'] = etag;
  counters.requests += 1;
  emit('request');
  const res = await fetch(url, { headers });
  if (res.status === 304) {
    counters.revalidated += 1;
    emit('revalidated');
    return { notModified: true, body: null, etag };
  }
  if (!res.ok) throw new Error('API ' + res.status + ' for ' + url);
  const body = await res.json();
  return { notModified: false, body, etag: res.headers.get('etag') };
}

// getJSON(path) -> Promise<body>. A cached body answers immediately; the
// revalidation still runs, and if it brings new data the cache updates and
// listeners hear 'updated' so the shell can re-render the current view.
export function getJSON(path) {
  const url = API_BASE + path;
  const hit = cache.get(url);
  if (hit) {
    counters.fromCache += 1;
    emit('cache');
    revalidate(url, hit);
    return Promise.resolve(hit.body);
  }
  if (inflight.has(url)) return inflight.get(url);
  const p = fetchBody(url, null)
    .then((r) => {
      cache.set(url, { etag: r.etag, body: r.body });
      inflight.delete(url);
      return r.body;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });
  inflight.set(url, p);
  return p;
}

function revalidate(url, hit) {
  if (inflight.has(url)) return;
  const p = fetchBody(url, hit.etag)
    .then((r) => {
      inflight.delete(url);
      if (!r.notModified) {
        cache.set(url, { etag: r.etag, body: r.body });
        emit('updated');
      }
    })
    .catch(() => {
      inflight.delete(url);
    });
  inflight.set(url, p);
}

// peek(path) -> the cached body or null, synchronously, with no fetch.
export function peek(path) {
  const hit = cache.get(API_BASE + path);
  return hit ? hit.body : null;
}
