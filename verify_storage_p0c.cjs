/* Storage P0c (GPT round 2 + fix design, 11.10.2026): legacy {"saved_at"} copies are a real format; a page that
   could not read IndexedDB at start records only what it changed (_pending.touch) and the next normal start applies
   just that delta on top of the newer mirror (P.reconcilePending) instead of a two-way P.merge. Import and reset wait
   until storage is reconciled. Each scenario is reported; any failure exits 1. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const H = require('./tools/storage_harness.cjs');
const {makeLS, makeIDB, start, answer, mirrorRaw, archives, events, hangOnce, failOnce, rehead, sleep, KEY, SNAP} = H;
const P = require('./progress.js');
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, String(e && e.message || e).split('\n')[0].slice(0, 160)]); }
}
const ids = raw => events(raw).map(e => e.id).sort();
const lastLS = ls => JSON.parse(ls.getItem(KEY));
const head = raw => String(raw).slice(0, 80);
async function ready(a) { for (let i = 0; i < 100 && !a.dash(); i++) await sleep(20); assert.ok(a.dash(), 'app booted'); return a; }
async function reboot(env, wait) { const a = await ready(start(env)); await sleep(wait || 80); a.saveNow(); await sleep(450); return a; }
async function blindStart(env, kind) { (kind === 'fail' ? failOnce : hangOnce)(env.idb); const a = start(env); await sleep(kind === 'fail' ? 80 : 1700); return ready(a); }
// two answers in a fresh sitting (stored session is null, so these are answers the mirror cannot have)
async function twoNewAnswers(a, ls) { a.window.TrainerCatalogBridge.launch('vocab:must'); a.saveNow(); await sleep(30); await answer(a, 2, () => JSON.parse(ls.getItem(KEY)).session); a.saveNow(); await sleep(30); }

(async () => {
  // ---------- fixtures made by the app: A = 3 answers, B = A + 3 more answers (what only IndexedDB kept)
  const e0 = {ls: makeLS(), idb: makeIDB()};
  const a0 = start(e0); await sleep(30);
  a0.window.TrainerCatalogBridge.launch('vocab:must'); a0.saveNow();
  await answer(a0, 3, () => a0.session()); await sleep(450);
  const A = e0.ls.getItem(KEY);
  const e1 = {ls: makeLS(), idb: makeIDB()}; e1.ls._d[KEY] = A;
  const a1 = start(e1); await sleep(60); a1.window.TrainerCatalogBridge.launch('vocab:must'); a1.saveNow();
  await answer(a1, 3, () => a1.session()); await sleep(450);
  const B = e1.ls.getItem(KEY);
  assert.equal(events(A).length, 3); assert.equal(events(B).length, 6);
  const noSession = (raw, patch) => { const s = JSON.parse(raw); s.session = null; if (patch) patch(s); return JSON.stringify(s); };
  const mirrorRec = raw => ({raw, saved_at: 0, activity: Math.max(0, ...events(raw).map(e => e.at))});

  // T1 legacy 9dcd838 format both sides; IDB times out; blind page answers; next start: B + the blind answers
  await check('T1 legacy LS A + legacy IDB B(newer) -> IDB timeout -> save -> reload: B kept + blind answers', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A), {saved_at: 100});
    idb.data.set('state', mirrorRec(rehead(B, {saved_at: 200})));
    const a = await blindStart({ls, idb}, 'hang');
    await twoNewAnswers(a, ls);
    assert.match(head(ls.getItem(KEY)), /^\{"rev":0,"saved_at":\d+,"pending":1,/, 'blind write: rev 0, pending');
    const blind = ids(ls.getItem(KEY));
    await reboot({ls, idb});
    const want = [...new Set(blind.concat(ids(B)))].sort();
    assert.deepEqual(ids(ls.getItem(KEY)), want, 'every answer of B and of the blind page');
    assert.deepEqual(ids(mirrorRaw(idb)), want, 'mirror holds the same');
    assert.match(head(ls.getItem(KEY)), /^\{"rev":[1-9]\d*,"saved_at":\d+,"schema"/, 'first real rev after reconcile, not pending');
  });

  // T1b LEGACY_TIMEOUT_SECOND_RELOAD: newer legacy IDB copy differs only in values (note, step), same answers
  await check('T1b legacy LS saved_at=100, legacy IDB saved_at=200 (note+step newer, same answers), timeout, answers, reload', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A, s => { s.learning.steps = {zz: 2}; s.learning.notes = {k: 'old'}; }), {saved_at: 100});
    idb.data.set('state', mirrorRec(rehead(noSession(A, s => { s.learning.steps = {zz: 5}; s.learning.notes = {k: 'new'}; }), {saved_at: 200})));
    const a = await blindStart({ls, idb}, 'hang');
    await twoNewAnswers(a, ls);
    const blind = ids(ls.getItem(KEY)).filter(id => !ids(A).includes(id));
    await reboot({ls, idb});
    const s = lastLS(ls);
    assert.equal(s.learning.notes.k, 'new', 'IDB note');
    assert.equal(s.learning.steps.zz, 5, 'IDB step');
    for (const id of blind) assert.ok(ids(ls.getItem(KEY)).includes(id), 'blind answer kept');
    assert.match(head(ls.getItem(KEY)), /^\{"rev":[1-9]\d*,"saved_at":\d+,"schema"/, 'rev 1+ after reconcile');
  });

  // T2 same, blind page did nothing but auto-save: the newer IndexedDB copy stays whole
  await check('T2 legacy + IDB timeout, no user action on the blind page: B stays whole', async () => {
    const ls = makeLS(), idb = makeIDB();
    const Bx = (() => { const s = JSON.parse(B); s.explainDepth = {T05_x: 'closed'}; s.learning.notes = {k: 'new'}; return JSON.stringify(s); })();
    ls._d[KEY] = rehead(A, {saved_at: 100});
    idb.data.set('state', mirrorRec(rehead(Bx, {saved_at: 200})));
    const a = await blindStart({ls, idb}, 'hang');
    a.saveNow(); await sleep(30);
    await reboot({ls, idb});
    const s = lastLS(ls);
    assert.deepEqual(ids(ls.getItem(KEY)), ids(B), 'B answers');
    assert.equal(s.explainDepth.T05_x, 'closed', 'B explainDepth');
    assert.equal(s.learning.notes.k, 'new', 'B note');
  });

  // T3 GPT P0-2: mirror steps=5, stale pending steps=2, two new answers -> steps 5 and both answers
  await check('T3 IDB rev11 steps=5, LS rev10 steps=2, read error, 2 answers -> steps 5 + both answers', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A, s => { s.learning.steps = {zz: 2}; }), {rev: 10, saved_at: 100});
    idb.data.set('state', mirrorRec(rehead((() => { const s = JSON.parse(B); s.learning.steps = {zz: 5}; return JSON.stringify(s); })(), {rev: 11, saved_at: 50})));
    const a = await blindStart({ls, idb}, 'fail');
    await twoNewAnswers(a, ls);
    const blind = ids(ls.getItem(KEY)).filter(id => !ids(A).includes(id));
    assert.equal(blind.length >= 2, true, 'two new answers on the blind page');
    await reboot({ls, idb});
    const s = lastLS(ls);
    assert.equal(s.learning.steps.zz, 5, 'steps not rolled back');
    for (const id of blind) assert.ok(ids(ls.getItem(KEY)).includes(id), 'blind answer kept ' + id);
    for (const id of ids(B)) assert.ok(ids(ls.getItem(KEY)).includes(id), 'mirror answer kept ' + id);
  });

  // T9 blind -> change -> F5 still blind -> change -> IndexedDB back: both changes, untouched mirror values stay
  await check('T9 two blind sessions in a row: both changes kept, untouched mirror value stays', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A), {rev: 10, saved_at: 100});
    idb.data.set('state', mirrorRec(rehead((() => { const s = JSON.parse(B); s.explainDepth = {T01_a: 'open', T03_c: 'closed'}; return JSON.stringify(s); })(), {rev: 11, saved_at: 100})));
    const a = await blindStart({ls, idb}, 'fail');
    a.window.ExplainDepth.set('T01_a', false); await sleep(30);
    const b = await blindStart({ls, idb}, 'fail');
    assert.ok(JSON.parse(ls.getItem(KEY))._pending, 'pending kept across a blind reload');
    b.window.ExplainDepth.set('T02_b', true); await sleep(30);
    await reboot({ls, idb});
    const s = lastLS(ls);
    assert.equal(s.explainDepth.T01_a, 'closed', 'first blind change');
    assert.equal(s.explainDepth.T02_b, 'open', 'second blind change');
    assert.equal(s.explainDepth.T03_c, 'closed', 'untouched mirror value');
    assert.deepEqual(ids(ls.getItem(KEY)), ids(B), 'mirror answers');
  });

  // T12 reset while storage is not reconciled is refused
  await check('T12 reset at untrusted boot: cancelled, progress unchanged', async () => {
    const ls = makeLS(), idb = makeIDB(); ls._d[KEY] = A; idb.data.set('state', mirrorRec(B));
    const a = await blindStart({ls, idb}, 'fail');
    const alerts = []; a.window.confirm = () => true; a.window.alert = t => alerts.push(t);
    a.dash().action('reset'); await sleep(80); a.saveNow(); await sleep(30);
    assert.equal(alerts.length, 1, 'message');
    assert.equal(events(ls.getItem(KEY)).length, 3, 'not cleared');
  });

  // T13 trusted reset: LS backup does not fit, IndexedDB archive works -> reset done, full archive, rev goes up
  await check('T13 trusted reset with full LS: IDB backup confirmed, reset done, rev higher', async () => {
    const ls = makeLS(); ls._d[KEY] = A; ls.limit = ls.size() + 10; const idb = makeIDB();
    const a = await ready(start({ls, idb}));
    a.window.confirm = () => true; a.window.alert = () => {};
    const rev0 = JSON.parse(ls.getItem(KEY)).rev;
    a.dash().action('reset'); await sleep(100); a.saveNow(); await sleep(60);
    const k = archives(idb, SNAP[0]);
    assert.equal(k.length, 1); assert.equal(events(idb.data.get(k[0]).raw).length, 3);
    assert.equal(events(ls.getItem(KEY)).length, 0);
    assert.ok(JSON.parse(ls.getItem(KEY)).rev > rev0, 'rev higher after reset');
  });

  // T15/T16 import (merge or replace) at untrusted boot is refused before anything changes
  await check('T15/T16 import at untrusted boot refused (merge and replace)', async () => {
    const ls = makeLS(), idb = makeIDB(); ls._d[KEY] = A; idb.data.set('state', mirrorRec(B));
    const a = await blindStart({ls, idb}, 'fail');
    let err = null; try { await a.dash().prepareImport(); } catch (e) { err = e; }
    assert.ok(err && /Импорт временно недоступен/.test(err.message), 'prepareImport rejects');
    const dash = fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8');
    assert.ok(!dash.includes('api.prepareImport().then(go,go)'), 'dashboard does not import after a rejected prepare');
    assert.ok(/api\.prepareImport\(\)\.then\(go,error=>/.test(dash), 'dashboard shows the refusal');
  });

  // T17 trusted «Заменить» with fewer answers survives reload (higher rev beats the older mirror)
  await check('T17 trusted replace with fewer events stays after reload', async () => {
    const ls = makeLS(), idb = makeIDB(); ls._d[KEY] = B;
    const a = await ready(start({ls, idb})); a.saveNow(); await sleep(450);
    const before = idb.data.get('state');
    const small = P.validate(P.serialize(JSON.parse(A)), new Set(a.window.COURSE.questions.map(q => q.id))).state;
    await a.dash().prepareImport(); a.dash().import(small, 'replace'); await sleep(450);
    idb.data.set('state', before); // mirror still holds the bigger, older copy (write not landed)
    await reboot({ls, idb});
    assert.equal(events(ls.getItem(KEY)).length, 3, 'replace kept');
  });

  // ---------- unit: P.pendingTouch / P.reconcilePending (three-way recovery)
  const base = () => { const s = P.migrate(JSON.parse(A)); s.session = null; return s; };
  await check('T4 steps: blind 2->3, mirror 5 -> 5', async () => {
    const Ab = base(); Ab.learning.steps.zz = 5; const S0 = base(); S0.learning.steps.zz = 2; const Pg = base(); Pg.learning.steps.zz = 3;
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).learning.steps.zz, 5);
  });
  await check('T5 steps: blind 2->6, mirror 5 -> 6', async () => {
    const Ab = base(); Ab.learning.steps.zz = 5; const S0 = base(); S0.learning.steps.zz = 2; const Pg = base(); Pg.learning.steps.zz = 6;
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).learning.steps.zz, 6);
  });
  await check('T6 note untouched on the blind page: mirror text stays', async () => {
    const Ab = base(); Ab.learning.notes.k = 'new'; const S0 = base(); S0.learning.notes.k = 'old'; const Pg = base(); Pg.learning.notes.k = 'old';
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).learning.notes.k, 'new');
  });
  await check('T7 note edited after the failure: page text wins', async () => {
    const Ab = base(); Ab.learning.notes.k = 'new'; const S0 = base(); S0.learning.notes.k = 'old'; const Pg = base(); Pg.learning.notes.k = 'mine';
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).learning.notes.k, 'mine');
  });
  await check('T8 events: one shared + one unique each side -> 3 unique', async () => {
    const shared = JSON.parse(A).events[0], x = Object.assign({}, shared, {id: 'ans:x:0:hw1-1-kk', at: shared.at + 1}), y = Object.assign({}, shared, {id: 'ans:y:0:hw1-1-kk', at: shared.at + 2});
    const Ab = base(); Ab.events = [shared, x]; const Pg = base(); Pg.events = [shared, y];
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(base(), Pg)).events.length, 3);
  });
  const lid = P.courseIds()[0];
  const withBeat = (s, beat, upd) => { s.courseProgress.lessons[lid].path = Object.assign({}, s.courseProgress.lessons[lid].path, {chapterId: 'ch1', beat, updatedAt: upd}); return s; };
  await check('T10 course path: mirror beat 5, stale beat 2 not changed (fresh updatedAt) -> 5', async () => {
    const Ab = withBeat(base(), 5, 1000), S0 = withBeat(base(), 2, 900), Pg = withBeat(base(), 2, 99999);
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).courseProgress.lessons[lid].path.beat, 5);
  });
  await check('T11 course path: blind page reached beat 6 in the same chapter -> 6', async () => {
    const Ab = withBeat(base(), 5, 1000), S0 = withBeat(base(), 2, 900), Pg = withBeat(base(), 6, 950);
    assert.equal(P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).courseProgress.lessons[lid].path.beat, 6);
  });
  await check('T18 c039451 pending without _pending: additive only, scalars from the mirror', async () => {
    const Ab = base(); Ab.learning.steps.zz = 5; Ab.learning.notes.k = 'new'; const Pg = base(); Pg.learning.steps.zz = 2; Pg.learning.notes.k = 'old';
    const r = P.reconcilePending(Ab, Pg, {});
    assert.equal(r.learning.steps.zz, 5); assert.equal(r.learning.notes.k, 'new');
  });
  await check('T19 normal P.merge: learning.steps never goes back', async () => {
    const x = base(); x.learning.steps.zz = 5; const y = base(); y.learning.steps.zz = 2;
    assert.equal(P.merge(x, y).learning.steps.zz, 5);
  });
  await check('T20 headOf: legacy {"saved_at"} is its own format', async () => {
    const S = require('./store-idb.js');
    assert.equal(S.headOf('{"saved_at":123,"schema":7}').kind, 'legacy');
    assert.equal(S.headOf('{"rev":2,"saved_at":5,"schema":7}').kind, 'rev');
    assert.equal(S.headOf('{"schema":7}').kind, 'none');
  });

  // ---------- round 3 (GPT review 3): namespaces that P.merge replaces wholesale must not roll back on recovery
  const S = require('./morph-state.js'), E = require('./morph-engine.js');
  const morphAt = (m, n, at) => { for (let k = 0; k < n; k++) { const q = E.getItem(m.session.queue[m.session.cursor].id); const r = S.accept(m, E.answer(m.session, q.expected, 100, at + k)); assert.ok(r.accepted, 'morph answer accepted'); m = S.putSession(r.state, E.next(r.state.session)); } return m; };
  const m0 = S.putSession(S.empty(), E.createSession({seed: 7, limit: 10}));
  const m2 = morphAt(m0, 2, 1000), m5 = morphAt(m2, 3, 2000), m6 = morphAt(m2, 4, 3000);
  const hw = (ids, extra) => ({'1-1': Object.assign({lessonId: '1-1', started_at: 5000, items: ids.map((id, i) => ({id, answers: ['x'], correct: true, at: 5000 + i * 10 + (extra && extra.shift || 0)})), rule_peeks: ids.length, answer_peeks: 0, submitted_at: null, export_rev: 0, cursor: ids[ids.length - 1], checklist: {method: ids.length > 2, exercises: false, words: false, external_test: false, keyboard: false, cheat: false}, previous: []}, extra || {})});
  await check('T21 homework: IDB [q1,q2,q3] vs stale LS [q1] same started_at, blind save, reload -> q1,q2,q3', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A, s => { s.homeworkAttempts = hw(['q1']); }), {rev: 10, saved_at: 100});
    idb.data.set('state', mirrorRec(rehead(noSession(B, s => { s.homeworkAttempts = hw(['q1', 'q2', 'q3']); }), {rev: 11, saved_at: 100})));
    const a = await blindStart({ls, idb}, 'fail'); a.saveNow(); await sleep(30);
    await reboot({ls, idb});
    const at = lastLS(ls).homeworkAttempts['1-1'];
    assert.deepEqual(at.items.map(i => i.id), ['q1', 'q2', 'q3'], 'IDB items kept');
    assert.equal(at.rule_peeks, 3, 'peek counter not back'); assert.equal(at.checklist.method, true, 'checklist not back'); assert.equal(at.cursor, 'q3', 'cursor not back');
  });
  await check('T22 homework: blind page continued the same attempt (q4) -> q1..q4, counters max, checklist OR', async () => {
    const Ab = base(); Ab.homeworkAttempts = hw(['q1', 'q2', 'q3']);
    const S0 = base(); S0.homeworkAttempts = hw(['q1']);
    const Pg = base(); Pg.homeworkAttempts = hw(['q1', 'q4']); Pg.homeworkAttempts['1-1'].checklist.words = true; Pg.homeworkAttempts['1-1'].items[1].at = 9000;
    const at = P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).homeworkAttempts['1-1'];
    assert.deepEqual(at.items.map(i => i.id).sort(), ['q1', 'q2', 'q3', 'q4']);
    assert.equal(at.rule_peeks, 3); assert.equal(at.checklist.method, true); assert.equal(at.checklist.words, true); assert.equal(at.cursor, 'q4');
  });
  await check('T23 homework: blind page started a new attempt -> new attempt, old one kept in previous', async () => {
    const Ab = base(); Ab.homeworkAttempts = hw(['q1', 'q2', 'q3']);
    const S0 = base(); S0.homeworkAttempts = hw(['q1']);
    const Pg = base(); Pg.homeworkAttempts = hw(['q9'], {started_at: 8000});
    const at = P.reconcilePending(Ab, Pg, P.pendingTouch(S0, Pg)).homeworkAttempts['1-1'];
    assert.equal(at.started_at, 8000);
    assert.ok(at.previous.some(p => p.started_at === 5000 && p.items.length === 3), 'IDB attempt in previous');
  });
  await check('T24 morph: IDB cursor5 + stale LS cursor2, blind advances to 6, reload -> cursor 6 + all events', async () => {
    const ls = makeLS(), idb = makeIDB();
    ls._d[KEY] = rehead(noSession(A, s => { s.morphTrainer = m2; }), {rev: 10, saved_at: 100});
    idb.data.set('state', mirrorRec(rehead(noSession(B, s => { s.morphTrainer = m5; }), {rev: 11, saved_at: 100})));
    const a = await blindStart({ls, idb}, 'fail');
    const W = a.window;
    for (let k = 0; k < 4; k++) { const st = W.MorphState.migrate(JSON.parse(ls.getItem(KEY)).morphTrainer).session; const q = W.MorphEngine.getItem(st.queue[st.cursor].id); assert.ok(W.MorphBridge.answer(W.MorphEngine.answer(st, q.expected, 100, 4000 + k)), 'blind answer'); W.MorphBridge.session(W.MorphEngine.next(W.MorphState.migrate(JSON.parse(ls.getItem(KEY)).morphTrainer).session)); }
    assert.equal(JSON.parse(ls.getItem(KEY)).morphTrainer.session.cursor, 6, 'blind page at 6');
    await reboot({ls, idb});
    const mt = lastLS(ls).morphTrainer;
    assert.equal(mt.session.cursor, 6, 'cursor 6');
    assert.deepEqual(mt.events.map(e => e.eventId.split(':').pop()).sort(), ['0', '1', '2', '3', '4', '5'], 'all events');
  });
  await check('T25 morph unit: blind 2->6 vs IDB 5 -> 6; untouched stale 2 -> 5', async () => {
    const mk = m => { const s = base(); s.morphTrainer = m; return s; };
    assert.equal(P.reconcilePending(mk(m5), mk(m6), P.pendingTouch(mk(m2), mk(m6))).morphTrainer.session.cursor, 6);
    assert.equal(P.reconcilePending(mk(m5), mk(m2), P.pendingTouch(mk(m2), mk(m2))).morphTrainer.session.cursor, 5);
  });
  await check('T26 morph: IDB session closed (null), stale page untouched at cursor 2 -> stays closed', async () => {
    const mk = m => { const s = base(); s.morphTrainer = m; return s; };
    const closed = S.putSession(m5, null);
    assert.equal(P.reconcilePending(mk(closed), mk(m2), P.pendingTouch(mk(m2), mk(m2))).morphTrainer.session, null);
  });
  await check('T27 lesson package differing between copies does not break the start (IDB copy kept)', async () => {
    const Ab = base(), Pg = base();
    const ex = n => ({id: 'pk-q' + n, topic: 'vocab', title: 'Переведи', stimulus: 'сөз', explanation: 'объяснение', fields: [{kind: 'text', label: 'Ответ', answers: ['слово']}]});
    const pk = {app: 'qazaq-lesson', format_version: 1, lesson_id: 'pk-1', lesson_title: 'Пакет', source: {title: 'Источник', url: 'https://example.org/a'}, dependencies: ['pk-0'], words: [{kazakh: 'сөз', translation: ['слово']}], exercises: [ex(1), ex(2)], blocks: [{title: 'Шаг', explanation: 'Объяснение', examples: [{kazakh: 'сөз', translation: 'слово'}], question_ids: ['pk-q1', 'pk-q2']}]};
    Ab.lesson_packages = [pk]; Pg.lesson_packages = [Object.assign({}, pk, {lesson_title: 'Пакет (старый)'})];
    assert.equal(P.migrate(Ab).lesson_packages.length, 1, 'fixture package valid');
    const r = P.reconcilePending(Ab, Pg, P.pendingTouch(base(), Pg));
    assert.equal(JSON.stringify(r.lesson_packages), JSON.stringify(P.migrate(Ab).lesson_packages));
  });

  await check('T28 P.merge (import «Объединить»): same homework attempt merged item by item', async () => {
    const x = base(); x.homeworkAttempts = hw(['q1', 'q2', 'q3']); const y = base(); y.homeworkAttempts = hw(['q1']);
    assert.deepEqual(P.merge(x, y).homeworkAttempts['1-1'].items.map(i => i.id), ['q1', 'q2', 'q3']);
  });

  for (const r of results) console.log(r.join('  '));
  const failed = results.filter(r => r[0] === 'FAIL').length;
  console.log('verify_storage_p0c: ' + (failed ? failed + ' FAILED' : 'OK') + ' (' + results.length + ' scenarios)');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
