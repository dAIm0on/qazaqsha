/* Storage tests: localStorage with a character quota, in-memory IndexedDB, app boot with both (verify_storage_*.cjs). */
'use strict';
const assert = require('assert');
const {boot, sleep, KEY} = require('./capture_nav_must_fixtures.js');
const SNAP = [KEY + '-before-import', KEY + '-before-r7-freg', KEY + '-before-r7', KEY + '-before-schema-5'];
function quotaError() { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; e.code = 22; return e; }
function makeLS(limit) {
  const ls = {
    _d: Object.create(null), limit: limit == null ? Infinity : limit, writes: 0,
    size() { let n = 0; for (const k in this._d) n += k.length + this._d[k].length; return n; },
    getItem(k) { return k in this._d ? this._d[k] : null; },
    setItem(k, v) { v = String(v); const prev = k in this._d ? k.length + this._d[k].length : 0; if (this.size() - prev + k.length + v.length > this.limit) throw quotaError(); this._d[k] = v; this.writes++; },
    removeItem(k) { delete this._d[k]; },
    key(i) { return Object.keys(this._d)[i] || null; },
    get length() { return Object.keys(this._d).length; }
  };
  return ls;
}
function makeSS() { const d = Object.create(null); return {getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, _d: d}; }
// Minimal IndexedDB: one database, one object store, structured clone by JSON, async like the real one.
function makeIDB() {
  const data = new Map();
  const idb = {data, failWrites: false, opens: 0, hang: false, _held: []};
  idb.release = () => { const h = idb._held.splice(0); h.forEach(fn => fn()); };
  const later = fn => setTimeout(fn, 1);
  idb.open = () => {
    idb.opens++;
    const req = {};
    later(() => {
      const names = new Set(idb._created ? ['kv'] : []);
      const db = {
        objectStoreNames: {contains: n => names.has(n)},
        createObjectStore(n) { names.add(n); idb._created = true; },
        transaction(_n, mode) {
          const tx = {}; let pendingReq = 0, failed = false;
          const done = () => later(() => { if (failed) { tx.error = quotaError(); tx.onerror && tx.onerror(); } else tx.oncomplete && tx.oncomplete(); });
          const wrap = fn => { const r = {}; pendingReq++; later(() => { try { r.result = fn(); r.onsuccess && r.onsuccess(); } catch (e) { failed = true; } if (--pendingReq === 0) done(); }); return r; };
          tx.objectStore = () => ({
            put(value, key) {
              if (mode !== 'readwrite') throw new Error('readonly');
              if (idb.hang) { const r = {}; pendingReq++; idb._held.push(() => { data.set(key, JSON.parse(JSON.stringify(value))); r.onsuccess && r.onsuccess(); if (--pendingReq === 0) done(); }); return r; }
              return wrap(() => { if (idb.failWrites) throw quotaError(); data.set(key, JSON.parse(JSON.stringify(value))); return key; });
            },
            get(key) { return wrap(() => (data.has(key) ? JSON.parse(JSON.stringify(data.get(key))) : undefined)); },
            getAllKeys() { return wrap(() => [...data.keys()]); }
          });
          return tx;
        }
      };
      req.result = db;
      if (!idb._created) req.onupgradeneeded && req.onupgradeneeded();
      req.onsuccess && req.onsuccess();
    });
    return req;
  };
  return idb;
}
function start(env) {
  const reloads = [];
  let dashApi = null;
  const api = boot(null, w => {
    w.localStorage = env.ls; w.sessionStorage = env.ss || makeSS();
    if (env.idb) w.indexedDB = env.idb;
    w.location.reload = () => reloads.push(Date.now());
    let real;
    Object.defineProperty(w, 'DashboardUI', {configurable: true, get: () => real, set(v) { real = {create(a) { dashApi = a; return v.create(a); }}; }});
  });
  api.reloads = reloads; api.dash = () => dashApi;
  return api;
}
async function answer(api, n, read) {
  for (let i = 0; i < n; i++) {
    const s = read();
    const q = api.cardOf(s);
    assert.ok(q, 'card to answer');
    api.submit(api.answerOf(q));
    await sleep(700);
    api.saveNow();
  }
}
const mirrorRaw = idb => idb.data.get('state') && idb.data.get('state').raw;
const archives = (idb, name) => [...idb.data.keys()].filter(k => String(k).startsWith('archive:' + name + ':'));
const banner = api => api.makeEl('save-status');
const events = raw => JSON.parse(raw).events;
// first open of this IndexedDB never answers / fails, later opens work (boot timeout or read error, then recovery)
function hangOnce(idb) { const real = idb.open; let first = true; idb.open = () => { if (!first) return real(); first = false; return {}; }; return idb; }
function failOnce(idb) { const real = idb.open; let first = true; idb.open = () => { if (!first) return real(); first = false; const req = {}; setTimeout(() => { req.error = new Error('boom'); req.onerror && req.onerror(); }, 1); return req; }; return idb; }
// same state with another storage header in front
function rehead(raw, head) { const body = JSON.parse(raw); delete body.rev; delete body.saved_at; delete body.pending; delete body._pending; return JSON.stringify(Object.assign({}, head, body)); }
module.exports = {SNAP, quotaError, makeLS, makeSS, makeIDB, start, answer, mirrorRaw, archives, banner, events, hangOnce, failOnce, rehead, sleep, KEY};
