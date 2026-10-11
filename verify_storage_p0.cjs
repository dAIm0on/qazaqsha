/* Storage P0 (11.10.2026): iPhone localStorage full -> «Сохранение недоступно», answers lost on reload.
   Real app boot (tools/capture_nav_must_fixtures.js) with a localStorage that throws QuotaExceededError past a
   character limit and an in-memory IndexedDB. Checks: rescue (snapshots -> IndexedDB, then compaction), the
   IndexedDB mirror and the newer-copy load, import «Объединить» and the update gate on a full localStorage. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {boot, sleep, KEY} = require('./tools/capture_nav_must_fixtures.js');
const SNAP = [KEY + '-before-import', KEY + '-before-r7-freg', KEY + '-before-r7', KEY + '-before-schema-5'];
const DAY = 864e5;

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

(async () => {
  // ---------- base progress, made by the app itself (3 answered words)
  const baseEnv = {ls: makeLS(), idb: makeIDB()};
  const a0 = start(baseEnv);
  await sleep(30);
  a0.window.TrainerCatalogBridge.launch('vocab:must');
  a0.saveNow();
  await answer(a0, 3, () => a0.session());
  await sleep(450);
  const base = baseEnv.ls.getItem(KEY);
  assert.ok(/^\{"rev":\d+,"saved_at":\d+,"schema"/.test(base), 'rev header first, not pending');
  assert.equal(mirrorRaw(baseEnv.idb), base, 'P2: IndexedDB mirrors exactly what localStorage holds');
  assert.equal(baseEnv.idb.data.get('state').activity, Math.max(...events(base).map(e => e.at)), 'mirror records last activity');
  assert.equal(events(base).length, 3);
  assert.equal(banner(a0).hidden, true);
  const P = require('./progress.js');

  // ---------- P1a: stuck user: snapshots fill localStorage. Rescue moves them to IndexedDB, nothing is lost.
  {
    const ls = makeLS(); ls._d[KEY] = base; for (const k of SNAP) ls._d[k] = base.replace('"saved_at"', '"copy":"' + k + '","saved_at"');
    const snapCopy = Object.fromEntries(SNAP.map(k => [k, ls._d[k]]));
    ls.limit = ls.size() + 50;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow();
    await sleep(80);
    await answer(a, 3, () => JSON.parse(ls.getItem(KEY)).session);
    await sleep(450);
    for (const k of SNAP) {
      assert.equal(ls.getItem(k), null, 'P1: ' + k + ' left localStorage');
      const keys = archives(idb, k);
      assert.equal(keys.length, 1, 'P1: ' + k + ' archived once');
      assert.equal(idb.data.get(keys[0]).raw, snapCopy[k], 'P1: archive is byte-identical');
    }
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P1: new answers saved in localStorage after the rescue');
    assert.equal(banner(a).hidden, true, 'P4: banner gone');
    assert.equal(mirrorRaw(idb), ls.getItem(KEY), 'P2: mirror follows');
    // reload: everything is there
    const b = start({ls, idb});
    await sleep(60);
    b.saveNow(); await sleep(30);
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P4: answers survive reload');
    assert.equal(b.reloads.length, 0);
    // restore-backup button finds the archived pre-import copy
    let downloaded = null;
    b.window.URL = {createObjectURL: () => 'blob:x', revokeObjectURL() {}};
    b.window.Blob = class { constructor(parts) { downloaded = parts.join(''); } };
    b.window.document.createElement = () => ({click() {}, remove() {}, set href(v) {}, set download(v) {}, style: {}});
    b.window.document.body.appendChild = x => x;
    b.dash().restoreBackup();
    await sleep(40);
    assert.equal(downloaded, snapCopy[SNAP[0]], 'restore offers the archived pre-import copy');
  }

  // ---------- P1b: no snapshots left, state itself is too big: compact answers older than 14 days.
  {
    const old = JSON.parse(base);
    const now = Date.now();
    const extra = [];
    for (let i = 0; i < 40; i++) for (const e of JSON.parse(base).events) { e.id = e.id + ':old' + i; e.at = now - 30 * DAY + i * 1000; extra.push(e); }
    old.events = extra.concat(old.events);
    const heavy = JSON.stringify(old);
    const fsrsChars = extra.reduce((n, e) => n + e.skills.reduce((m, s) => m + JSON.stringify(s.fsrs_log).length + JSON.stringify(s.fsrs_state).length, 0), 0);
    const ls = makeLS(); ls._d[KEY] = heavy; ls.limit = ls.size() + 50;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow();
    await sleep(80);
    await answer(a, 2, () => JSON.parse(ls.getItem(KEY)).session);
    await sleep(450);
    const saved = JSON.parse(ls.getItem(KEY));
    assert.equal(saved.events.length, old.events.length + 2, 'P1b: every event kept, new answers saved');
    const oldOnes = saved.events.filter(e => e.at < now - 14 * DAY);
    assert.equal(oldOnes.length, 120);
    for (const e of oldOnes) for (const s of e.skills) {
      assert.ok(!('fsrs_log' in s) && !('fsrs_state' in s), 'P1b: unread FSRS copies dropped from old answers');
      assert.ok(s.skill_id && 'rating' in s && 'correct' in s, 'P1b: read skill fields stay');
    }
    for (const e of oldOnes) assert.ok('response_time' in e && 'latency_ms' in e && 'response_time_ms' in e && e.answers.length, 'P1b: read event fields stay');
    const recent = saved.events.filter(e => e.at >= now - 14 * DAY);
    assert.ok(recent.every(e => e.skills.every(s => 'fsrs_log' in s)), 'P1b: recent answers untouched');
    const full = archives(idb, 'before-compact');
    assert.equal(full.length, 1, 'P1b: full copy archived before compacting');
    assert.equal(JSON.parse(idb.data.get(full[0]).raw).events.length, old.events.length, 'P1b: archive holds the uncompacted history');
    assert.ok(JSON.parse(idb.data.get(full[0]).raw).events[0].skills[0].fsrs_log, 'P1b: archive keeps the FSRS copies');
    assert.ok(fsrsChars > 1000, 'fixture has real FSRS weight');
    assert.equal(banner(a).hidden, true, 'P1b: banner gone');
  }

  // ---------- P2/P4: localStorage cannot take even the compacted state: IndexedDB keeps it, reload takes the newer copy.
  const stuck = {};
  {
    const ls = makeLS(); ls._d[KEY] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow();
    await sleep(80);
    await answer(a, 3, () => JSON.parse(mirrorRaw(idb)).session);
    await sleep(80);
    assert.equal(ls.getItem(KEY), base, 'localStorage still old (full)');
    assert.equal(events(mirrorRaw(idb)).length, 6, 'P2: IndexedDB has the 3 new answers');
    assert.equal(banner(a).hidden, true, 'P2: no banner while IndexedDB saves');
    // update gate: localStorage failed -> wait for the mirror, then press update again
    let clicks = 0, prevented = 0;
    a.makeEl('update-app').click = () => { clicks++; const ev = {type: 'qazaq-before-update', preventDefault() { prevented++; }}; a.window.dispatchEvent(ev); };
    a.window.dispatchEvent({type: 'qazaq-before-update', preventDefault() { prevented++; }});
    assert.equal(prevented, 1, 'P3: update held until the mirror is flushed');
    await sleep(40);
    assert.equal(clicks, 1, 'P3: update pressed again after the mirror write');
    assert.equal(prevented, 1, 'P3: second pass not blocked');
    assert.equal(events(mirrorRaw(idb)).length, 6);
    Object.assign(stuck, {state: JSON.parse(JSON.stringify(idb.data.get('state')))});
    assert.ok(stuck.state.rev > JSON.parse(base).rev, 'mirror carries a higher rev');
    // reload (same full localStorage): the mirror is newer and is used, nothing lost
    const b = start({ls, idb});
    await sleep(80);
    b.saveNow(); await sleep(60);
    assert.equal(events(mirrorRaw(idb)).length, 6, 'P2: newer IndexedDB copy adopted on load');
    assert.equal(b.reloads.length, 0, 'no reload');
    assert.equal(JSON.parse(mirrorRaw(idb)).session.position, JSON.parse(stuck.state.raw).session.position, 'P2: session resumes from the newer copy, not the stale localStorage');
    assert.equal(banner(b).hidden, true);
    // keep studying on this page: new answers keep landing in IndexedDB
    b.window.TrainerCatalogBridge.launch('vocab:must');
    b.saveNow(); await sleep(30);
    await answer(b, 2, () => JSON.parse(mirrorRaw(idb)).session);
    await sleep(60);
    assert.equal(events(mirrorRaw(idb)).length, 8, 'P2: answers after adopting the mirror are saved');
    assert.equal(ls.getItem(KEY), base, 'localStorage untouched while full');
  }

  // ---------- P2: mirror newer and localStorage has room once snapshots move: start from the mirror, write it back.
  {
    const ls = makeLS(); ls._d[KEY] = base; ls._d[SNAP[3]] = base; ls.limit = ls.size() + 20;
    const idb = makeIDB();
    idb.data.set('state', JSON.parse(JSON.stringify(stuck.state)));
    const a = start({ls, idb});
    await sleep(80);
    a.saveNow(); await sleep(80);
    assert.equal(a.reloads.length, 0, 'no reload needed');
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P2: localStorage now holds the newer copy');
    assert.equal(ls.getItem(SNAP[3]), null);
    assert.equal(archives(idb, SNAP[3]).length, 1);
    assert.deepEqual(JSON.parse(ls.getItem(KEY)).session.queue, JSON.parse(stuck.state.raw).session.queue, 'P2: session resumes from the newer copy');
  }

  // ---------- P2: IndexedDB never answers at boot: start from localStorage after the timeout, never write the mirror.
  {
    const ls = makeLS(); ls._d[KEY] = base;
    const idb = makeIDB(); idb.data.set('state', JSON.parse(JSON.stringify(stuck.state)));
    const realOpen = idb.open; idb.open = () => ({});
    const a = start({ls, idb});
    await sleep(200);
    assert.equal(a.window.TrainerCatalogBridge, undefined, 'app waits for IndexedDB');
    await sleep(1500);
    assert.ok(a.window.TrainerCatalogBridge, 'app starts after the timeout');
    a.saveNow(); await sleep(450);
    assert.equal(events(ls.getItem(KEY)).length, 3, 'started from localStorage');
    assert.equal(events(idb.data.get('state').raw).length, 6, 'P2: an unread mirror is never overwritten by older data');
    assert.ok(/^\{"rev":\d+,"saved_at":\d+,"pending":1,/.test(ls.getItem(KEY)), 'P0-1: writes of an untrusted page are marked pending');
    assert.equal(JSON.parse(ls.getItem(KEY)).rev, JSON.parse(base).rev, 'P0-1: an untrusted page never raises rev');
    // P0-1: next start with a working IndexedDB: the newer mirror is not beaten by the re-saved old copy
    idb.open = realOpen;
    const b = start({ls, idb});
    await sleep(80); b.saveNow(); await sleep(450);
    assert.equal(events(mirrorRaw(idb)).length, 6, 'P0-1: mirror answers survive the second reload');
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P0-1: localStorage gets the merged progress');
    assert.ok(!/"pending":1/.test(ls.getItem(KEY).slice(0, 60)), 'pending cleared after a normal start');
  }

  // ---------- P2: IndexedDB read fails at boot (then recovers): never write the mirror from this page.
  {
    // stored copy without an open sitting, so this page answers in a new session (answers the mirror does not have)
    const ls = makeLS(); const noSitting = JSON.parse(base); noSitting.session = null; ls._d[KEY] = JSON.stringify(noSitting);
    const idb = makeIDB(); idb.data.set('state', JSON.parse(JSON.stringify(stuck.state)));
    const realOpen = idb.open; let first = true;
    idb.open = () => { if (!first) return realOpen(); first = false; const req = {}; setTimeout(() => { req.error = new Error('boom'); req.onerror && req.onerror(); }, 1); return req; };
    const a = start({ls, idb});
    await sleep(60);
    a.saveNow(); await sleep(450);
    assert.equal(events(ls.getItem(KEY)).length, 3, 'started from localStorage');
    assert.equal(events(idb.data.get('state').raw).length, 6, 'P2: an unread mirror is never overwritten (read error)');
    // P0-1: answer on the untrusted page, then reload normally: both the mirror answers and the new ones are kept
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow(); await sleep(30);
    await answer(a, 2, () => JSON.parse(ls.getItem(KEY)).session);
    const pageIds = events(ls.getItem(KEY)).map(e => e.id);
    assert.equal(events(ls.getItem(KEY)).length, 5);
    const b = start({ls, idb});
    await sleep(80); b.saveNow(); await sleep(450);
    const got = events(ls.getItem(KEY));
    const union = new Set(pageIds.concat(events(stuck.state.raw).map(e => e.id)));
    assert.equal(union.size, 8, 'fixture: 2 answers only the untrusted page has');
    assert.deepEqual(got.map(e => e.id).sort(), [...union].sort(), 'P0-1: merge keeps every answer of the mirror and of the untrusted page');
    assert.deepEqual(events(mirrorRaw(idb)).map(e => e.id).sort(), [...union].sort(), 'P0-1: mirror holds the merge');
  }

  // ---------- P2: an older mirror never overwrites newer localStorage
  {
    const ls = makeLS(); const idb = makeIDB();
    ls._d[KEY] = stuck.state.raw;
    idb.data.set('state', {raw: base, saved_at: P.serialize ? Number(/"saved_at":(\d+)/.exec(base)[1]) : 0, activity: Math.max(...events(base).map(e => e.at))});
    const a = start({ls, idb});
    await sleep(80);
    a.saveNow(); await sleep(450);
    assert.equal(events(ls.getItem(KEY)).length, 6, 'older mirror ignored');
    assert.equal(events(mirrorRaw(idb)).length, 6, 'mirror refreshed from localStorage');
  }

  // ---------- P2: a newer localStorage write with fewer answers (reset / «Заменить») beats an older mirror
  {
    const ls = makeLS(); const idb = makeIDB();
    const fresh = JSON.parse(base); fresh.events = []; fresh.rev = stuck.state.rev + 1; fresh.saved_at = 1;  // clock went back: rev decides
    ls._d[KEY] = JSON.stringify(Object.assign({rev: fresh.rev, saved_at: 1}, fresh));
    idb.data.set('state', JSON.parse(JSON.stringify(stuck.state)));
    const a = start({ls, idb});
    await sleep(80); a.saveNow(); await sleep(60);
    assert.equal(events(ls.getItem(KEY)).length, 0, 'P2: later write wins over an older mirror with more answers');
  }
  // ---------- P2: old unstamped localStorage (first run of this version) vs a mirror with newer answers
  {
    const ls = makeLS(); const idb = makeIDB();
    const legacy = JSON.parse(base); delete legacy.saved_at; delete legacy.rev; ls._d[KEY] = JSON.stringify(legacy);
    idb.data.set('state', JSON.parse(JSON.stringify(stuck.state)));
    const a = start({ls, idb});
    await sleep(80); a.saveNow(); await sleep(60);
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P2: unstamped copy: the newest answers win');
  }

  // ---------- P3: import «Объединить» on a full localStorage
  {
    // other device: base + 2 other answers, exported
    const dEnv = {ls: makeLS(), idb: makeIDB()}; dEnv.ls._d[KEY] = base;
    const d = start(dEnv);
    await sleep(60);
    d.window.TrainerCatalogBridge.launch('vocab:must');
    d.saveNow();
    await answer(d, 2, () => d.session());
    const exported = P.serialize(JSON.parse(dEnv.ls.getItem(KEY)));
    const incoming = P.validate(exported, new Set(d.window.COURSE.questions.map(q => q.id))).state;
    // this device: stuck full localStorage with snapshots
    const ls = makeLS(); ls._d[KEY] = base; for (const k of SNAP.slice(1)) ls._d[k] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    const before = JSON.parse(P.serialize(JSON.parse(base)));
    const dash = a.dash();
    let error = null;
    await dash.prepareImport();
    try { dash.import(incoming, 'merge'); } catch (e) { error = e; }
    assert.equal(error, null, 'P3: merge import works on a full localStorage');
    await sleep(450);
    const pre = archives(idb, SNAP[0]);
    assert.equal(pre.length, 1, 'P3: pre-import copy in IndexedDB');
    assert.deepEqual(events(idb.data.get(pre[0]).raw), before.events, 'P3: pre-import copy is the old progress');
    const merged = ls.getItem(KEY) && events(ls.getItem(KEY)).length === 5 ? ls.getItem(KEY) : mirrorRaw(idb);
    assert.equal(events(merged).length, 5, 'P3: merged 3 + 2 answers');
    assert.equal(a.window.__qzImportReady, false, 'import flag cleared');
    const b = start({ls, idb});
    await sleep(80); b.saveNow(); await sleep(450);
    assert.equal(events(ls.getItem(KEY) && events(ls.getItem(KEY)).length === 5 ? ls.getItem(KEY) : mirrorRaw(idb)).length, 5, 'P3: merge survives reload');
  }

  // ---------- P3b: import when localStorage cannot take the merged progress even after freeing space: IndexedDB keeps it
  {
    const ls = makeLS(); ls._d[KEY] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    const extra = JSON.parse(base); extra.events = extra.events.map(e => Object.assign({}, e, {id: e.id + ':other', at: e.at + 5000}));
    const incoming = P.validate(P.serialize(extra), new Set(a.window.COURSE.questions.map(q => q.id))).state;
    let error = null;
    await a.dash().prepareImport();
    try { a.dash().import(incoming, 'merge'); } catch (e) { error = e; }
    assert.equal(error, null, 'P3b: import goes to IndexedDB when localStorage is too small');
    await sleep(450);
    assert.equal(ls.getItem(KEY), base, 'P3b: localStorage untouched (full)');
    assert.equal(events(mirrorRaw(idb)).length, 6, 'P3b: merged progress in IndexedDB');
    const b = start({ls, idb});
    await sleep(80); b.saveNow(); await sleep(60);
    assert.equal(events(mirrorRaw(idb)).length, 6, 'P3b: merged progress survives reload');
  }

  // ---------- P1-1: same millisecond / clock back: rev decides, never saved_at
  {
    const A = JSON.parse(base), B = JSON.parse(stuck.state.raw);
    const ls = makeLS(); ls._d[KEY] = JSON.stringify(Object.assign({rev: 50, saved_at: 1000}, A, {rev: 50, saved_at: 1000}));
    const idb = makeIDB(); const braw = JSON.stringify(Object.assign({rev: 51, saved_at: 1000}, B, {rev: 51, saved_at: 1000}));
    idb.data.set('state', {raw: braw, saved_at: 1000, activity: 0});
    const a = start({ls, idb}); await sleep(80); a.saveNow(); await sleep(60);
    assert.equal(events(ls.getItem(KEY)).length, 6, 'P1-1: equal saved_at, higher rev in IndexedDB wins');
    assert.ok(JSON.parse(ls.getItem(KEY)).rev > 51, 'P1-1: next writes continue above the mirror revision');
    const ls2 = makeLS(); ls2._d[KEY] = JSON.stringify(Object.assign({rev: 51, saved_at: 9e12}, A, {rev: 51, saved_at: 9e12}));
    const idb2 = makeIDB(); idb2.data.set('state', {raw: JSON.stringify(Object.assign({rev: 52, saved_at: 5}, B, {rev: 52, saved_at: 5})), saved_at: 5, activity: 0});
    const b = start({ls: ls2, idb: idb2}); await sleep(80); b.saveNow(); await sleep(60);
    assert.equal(events(ls2.getItem(KEY)).length, 6, 'P1-1: clock moved back: still the higher rev');
  }

  // ---------- P1-2: localStorage full, an IndexedDB write hangs after earlier success: banner within seconds
  {
    const ls = makeLS(); ls._d[KEY] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow(); await sleep(80);
    assert.equal(banner(a).hidden, true, 'mirror confirmed: no banner');
    idb.hang = true;
    await answer(a, 1, () => JSON.parse(mirrorRaw(idb)).session);
    a.saveNow(); await sleep(100);
    let prevented = 0; a.makeEl('update-app').click = () => {};
    a.window.dispatchEvent({type: 'qazaq-before-update', preventDefault() { prevented++; }});
    assert.equal(prevented, 1, 'P1-2: update blocked while this revision is unconfirmed');
    await sleep(3200);
    assert.equal(banner(a).hidden, false, 'P1-2: hung write -> banner (state honest)');
    idb.hang = false; idb.release();
    await sleep(100);
    assert.equal(banner(a).hidden, true, 'P1-2: banner goes away once this revision is committed');
  }

  // ---------- P0-2: reset with full localStorage and a failing IndexedDB archive is cancelled; nothing cleared
  {
    const ls = makeLS(); ls._d[KEY] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB();
    const a = start({ls, idb});
    await sleep(60);
    const alerts = []; a.window.confirm = () => true; a.window.alert = t => alerts.push(t);
    idb.failWrites = true;
    a.dash().action('reset');
    await sleep(100);
    assert.equal(alerts.length, 1, 'P0-2: reset cancelled with a message');
    a.saveNow(); await sleep(60);
    assert.equal(events(ls.getItem(KEY)).length, 3, 'P0-2: progress not cleared');
    idb.failWrites = false;
    a.dash().action('reset');
    await sleep(100);
    const keys = archives(idb, SNAP[0]);
    assert.equal(keys.length, 1, 'P0-2: reset goes on once the IndexedDB backup is confirmed');
    assert.equal(events(idb.data.get(keys[0]).raw).length, 3, 'P0-2: backup is the full old progress');
    a.saveNow(); await sleep(60);
    assert.equal(events(ls.getItem(KEY)).length, 0, 'reset done');
  }

  // ---------- P2-1: two archive copies in the same millisecond never overwrite each other
  {
    const idb = makeIDB(); const a = start({ls: makeLS(), idb}); await sleep(40);
    const S = a.window.QazaqStore;
    const realNow = Date.now; a.window.Date.now = () => 777;
    await Promise.all([S.archive('x', 'old'), S.archive('x', 'new')]);
    a.window.Date.now = realNow;
    assert.equal(archives(idb, 'x').length, 2, 'P2-1: distinct keys');
    assert.equal(await S.latestArchive(['x']), 'new', 'P2-1: the later copy is the latest');
  }

  // ---------- both stores broken: banner shows, update blocked (old behaviour, no false «saved»)
  {
    const ls = makeLS(); ls._d[KEY] = base; ls.limit = ls.size() + 10;
    const idb = makeIDB(); idb.failWrites = true;
    const a = start({ls, idb});
    await sleep(60);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow();
    await sleep(200);
    assert.equal(banner(a).hidden, false, 'banner when nothing could save');
    let prevented = 0, clicks = 0;
    a.makeEl('update-app').click = () => { clicks++; };
    a.window.dispatchEvent({type: 'qazaq-before-update', preventDefault() { prevented++; }});
    await sleep(60);
    assert.equal(prevented, 1, 'update blocked');
    assert.equal(clicks, 0, 'no auto update when IndexedDB failed');
    assert.equal(ls.getItem(KEY), base, 'nothing deleted');
  }

  // ---------- no IndexedDB (old browser / node): old behaviour exactly
  {
    const ls = makeLS(); ls._d[KEY] = base; ls._d[SNAP[3]] = base; ls.limit = ls.size() + 10;
    const a = start({ls});
    await sleep(30);
    a.window.TrainerCatalogBridge.launch('vocab:must');
    a.saveNow();
    assert.equal(banner(a).hidden, false, 'no IndexedDB: banner as before');
    assert.equal(ls.getItem(SNAP[3]), base, 'no IndexedDB: snapshot never removed');
  }

  // ---------- store-idb unit: compactEvents drops only fsrs_log/fsrs_state of old events
  {
    const S = require('./store-idb.js');
    const st = {events: [{at: 0, response_time: 5, skills: [{skill_id: 'x', rating: 3, fsrs_log: {}, fsrs_state: {}}]}, {at: Date.now(), skills: [{fsrs_log: {}, fsrs_state: {}}]}]};
    assert.equal(S.countCompactable(st, Date.now(), 14), 1);
    assert.equal(S.compactEvents(st, Date.now(), 14), 1);
    assert.deepEqual(st.events[0], {at: 0, response_time: 5, skills: [{skill_id: 'x', rating: 3}]});
    assert.ok(st.events[1].skills[0].fsrs_log);
    assert.deepEqual(S.headOf('{"rev":4,"saved_at":123,"x":1}'), {stamped: true, rev: 4, saved_at: 123, pending: false});
    assert.deepEqual(S.headOf('{"rev":4,"saved_at":123,"pending":1,"x":1}'), {stamped: true, rev: 4, saved_at: 123, pending: true});
    assert.equal(S.headOf('{"schema":7}').stamped, false);
  }
  // index.html loads store-idb.js before app.js; sw caches it
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(html.indexOf('src="store-idb.js"') > 0 && html.indexOf('src="store-idb.js"') < html.indexOf('src="app.js"'));
  assert.ok(fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8').includes('"store-idb.js"'));
  const dashSrc = fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8');
  assert.ok(dashSrc.includes('if(api.prepareImport)api.prepareImport().then(go,go);else go();'), 'dashboard: pre-import copy to IndexedDB before import');
  console.log('verify_storage_p0: OK');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
