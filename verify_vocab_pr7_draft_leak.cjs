'use strict';
/* PR-7 (iPhone QA 11.10): «Новые слова» (vocab:must).
   D1 P0  a card that returns after «Не знаю» / a wrong answer comes with an empty field. The retyped answer is not
          kept as a card draft, and a draft from another show of the card is not filled in (no blind credit).
   D7 P2  Chrome fires change on the removed field while the next card renders: the old text must not land there.
   D3 P1  two cards of one lemma never stand next to each other after the shown card (scheduleReturn).
   Kept: an unchecked fragment of the current card survives reload and leaving the screen. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('./core.js');
const VM = require('./vocab-must.js');
const {boot, sleep, KEY} = require('./tools/capture_nav_must_fixtures.js');

const DRAFT_KEY = KEY + '-drafts';
const ROOT = __dirname;

function cardId(s) { return s.queue[s.position]; }
function drafts(api) {
  const raw = api.window.localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : {};
}
function draftHas(api, id, text) {
  return Object.entries(drafts(api)).some(([k, r]) => k.includes('|' + id + '|') && (r.a || []).includes(text));
}
function lemOf(api, id) {
  return core.lemmaKey(api.window.COURSE.questions.find(q => q.id === id));
}
function retype(api, text) {
  // «Ещё раз» on the feedback, then type and Enter.
  const retry = api.makeEl('retry-button');
  if (typeof retry.onclick === 'function') retry.onclick({preventDefault() {}});
  api.makeEl('retry-button').hidden = true;
  api.submit(text);
}

// Walks one must sitting: card 0 right, card 1 missed (idk or wrong) and retyped, then right answers until card 1
// returns. Returns what the field and the saved state hold at that moment.
async function walkToReturn(kind) {
  const api = boot();
  api.window.TrainerCatalogBridge.launch('vocab:must');
  const shown = [];
  api.saveNow();
  let s = api.session();
  shown.push(cardId(s));
  api.submit(api.answerOf(api.cardOf(s)));
  await sleep(700);
  api.saveNow();
  s = api.session();
  const missed = api.cardOf(s);
  const answer = api.answerOf(missed);
  assert.ok(answer, kind + ': missed card has an answer');
  shown.push(missed.id);
  const missedPos = s.position;
  if (kind === 'idk') api.makeEl('reveal-button').onclick();
  else api.submit('неттакогослова');
  api.saveNow();
  assert.equal(api.session().position, missedPos, kind + ': still on the missed card');
  assert.equal(api.session().vocab.retry.kind, kind, kind + ': retype is open');
  retype(api, answer);
  api.saveNow();
  s = api.session();
  assert.ok(s.position > missedPos, kind + ': retype closed the show and moved on');
  for (let step = 0; step < 14; step++) {
    s = api.session();
    const id = cardId(s);
    shown.push(id);
    if (id === missed.id && s.position > missedPos) {
      return {api, missed, answer, field: api.makeEl('answer-0').value, session: s, shown};
    }
    const q = api.cardOf(s);
    api.submit(api.answerOf(q));
    await sleep(700);
    api.saveNow();
  }
  throw new Error(kind + ': missed card ' + missed.id + ' did not return; shown ' + shown.join(','));
}

function adjacentSame(api, ids) {
  for (let i = 1; i < ids.length; i++) if (lemOf(api, ids[i]) === lemOf(api, ids[i - 1])) return [ids[i - 1], ids[i]];
  return null;
}

(async () => {
  // D1: «Не знаю» → «Ещё раз» → answer → Enter → … → the card returns with an empty field.
  for (const kind of ['idk', 'wrong']) {
    const r = await walkToReturn(kind);
    assert.equal(r.field, '', 'D1 ' + kind + ': returned ' + r.missed.id + ' came prefilled with «' + r.field + '»');
    assert.deepEqual((r.session.draft && r.session.draft.answers || []).filter(Boolean), [], 'D1 ' + kind + ': session draft carries the answer');
    assert.equal(draftHas(r.api, r.missed.id, r.answer), false, 'D1 ' + kind + ': card draft kept the retyped answer');
    // Submitting the untouched field is not a blind correct answer.
    const before = JSON.parse(r.api.window.localStorage.getItem(KEY)).events.length;
    r.api.submit();
    r.api.saveNow();
    const evs = JSON.parse(r.api.window.localStorage.getItem(KEY)).events.slice(before);
    assert.equal(evs.filter(e => e && e.card_id === r.missed.id && e.correct === true).length, 0, 'D1 ' + kind + ': empty return counted as correct');
    console.log('D1', kind, 'return of', r.missed.id, 'field empty; shown', r.shown.join(' '));
  }

  // D1 guard: a card draft written on an earlier show of the card (old leak in localStorage) is not filled in.
  {
    const api = boot();
    api.window.TrainerCatalogBridge.launch('vocab:must');
    api.saveNow();
    const s = api.session();
    const q = api.cardOf(s);
    const answer = api.answerOf(q);
    const book = drafts(api);
    const scope = 'words:t-vocab:must';
    const key = 'q|' + scope + '|' + q.id + '|' + String(q.stimulus || '').slice(0, 80);
    book[key] = {a: [answer], t: Date.now()};
    api.window.localStorage.setItem(DRAFT_KEY, JSON.stringify(book));
    api.window.QazaqShell.show('vocabulary');
    api.window.QazaqShell.show('practice');
    assert.equal(api.makeEl('answer-0').value, '', 'D1 guard: draft of another show refilled «' + answer + '»');
    book[key] = {a: [answer], t: Date.now(), p: String(s.queueEpoch) + ':' + (s.position + 7) + ':' + q.id};
    api.window.localStorage.setItem(DRAFT_KEY, JSON.stringify(book));
    api.window.QazaqShell.show('vocabulary');
    api.window.QazaqShell.show('practice');
    assert.equal(api.makeEl('answer-0').value, '', 'D1 guard: draft of a later show refilled');
    console.log('D1 guard: draft from another show of', q.id, 'not filled in');
  }

  // D7: Chrome sends change from the field being removed while the next card renders.
  {
    const api = boot();
    api.window.TrainerCatalogBridge.launch('vocab:must');
    api.saveNow();
    let s = api.session();
    api.submit(api.answerOf(api.cardOf(s)));
    await sleep(700);
    api.saveNow();
    s = api.session();
    const missed = api.cardOf(s);
    const answer = api.answerOf(missed);
    api.makeEl('reveal-button').onclick();
    const doc = api.window.document;
    const realQ = doc.querySelector;
    let armed = false, fired = 0;
    doc.querySelector = sel => {
      const el = realQ(sel);
      if (sel !== '#exercise' || !armed) return el;
      return new Proxy(el, {set(t, p, v) {
        if (p === 'innerHTML' && armed) {
          armed = false;
          const old = realQ('#answer-form');
          for (const fn of (old._ev && old._ev.change) || []) { fired++; fn({type: 'change', target: realQ('#answer-0')}); }
        }
        t[p] = v;
        return true;
      }});
    };
    const retry = api.makeEl('retry-button');
    if (typeof retry.onclick === 'function') retry.onclick({preventDefault() {}});
    api.makeEl('retry-button').hidden = true;
    armed = true;
    api.submit(answer);
    doc.querySelector = realQ;
    assert.ok(fired > 0, 'D7 harness fired change on the removed form');
    api.saveNow();
    s = api.session();
    assert.notEqual(cardId(s), missed.id, 'D7 moved to the next card');
    assert.equal(api.makeEl('answer-0').value, '', 'D7 next card ' + cardId(s) + ' came with «' + api.makeEl('answer-0').value + '»');
    assert.deepEqual((s.draft && s.draft.answers || []).filter(Boolean), [], 'D7 session draft holds the previous answer');
    console.log('D7 change from the removed field does not reach', cardId(s));
  }

  // Kept: an unchecked fragment of the current card survives a reload and leaving the screen.
  {
    const api = boot();
    api.window.TrainerCatalogBridge.launch('vocab:must');
    api.saveNow();
    const s = api.session();
    api.makeEl('answer-0').value = 'қы';
    for (const fn of api.makeEl('answer-form')._ev.input || []) fn({type: 'input'});
    api.saveNow();
    assert.deepEqual(api.session().draft.answers, ['қы'], 'fragment in the session draft');
    const store = Object.assign({}, api.window.localStorage._d);
    const again = boot(null, w => { Object.assign(w.localStorage._d, store); });
    again.saveNow();
    const got = again.session();
    assert.equal(cardId(got), cardId(s), 'reload keeps the card');
    assert.deepEqual(got.draft.answers, ['қы'], 'reload keeps the fragment');
    assert.equal(again.makeEl('answer-0').value, 'қы', 'reload puts the fragment back in the field');
    api.window.QazaqShell.show('vocabulary');
    api.makeEl('answer-0').value = '';
    api.window.QazaqShell.show('practice');
    assert.equal(api.makeEl('answer-0').value, 'қы', 'fragment back after leaving the screen');
    console.log('KEPT fragment «қы» on', cardId(s), 'after leave and reload');
  }

  // D3 unit: removing the later copy of the card leaves two cards of one lemma side by side.
  {
    const fake = {lemmaKey: q => String(q && q.id || '').split('-')[0]};
    const pool = ['a-kk', 'a-ru', 'b-kk', 'b-ru', 'c-kk', 'd-kk'].map(id => ({id, wordRole: 'must'}));
    const plan = {newLemmas: ['a', 'b', 'c']};
    const lem = id => id.split('-')[0];
    const adj = (q, from) => { for (let i = from + 1; i < q.length; i++) if (lem(q[i]) === lem(q[i - 1])) return [q[i - 1], q[i]]; return null; };
    const gapBefore = (q, from, id) => { let n = 0; for (let i = from + 1; i < q.length; i++) { if (q[i] === id) return n; if (lem(q[i]) !== lem(id)) n++; } return -1; };
    // removal case
    let r = VM.scheduleReturn({queue: ['a-kk', 'b-kk', 'a-kk', 'b-ru', 'c-kk'], position: 0, cardId: 'a-kk', pool, plan, core: fake, minGap: 2});
    assert.equal(r.scheduled, true);
    assert.equal(adj(r.queue, 0), null, 'D3 removal case adjacent ' + r.queue.join(','));
    assert.ok(gapBefore(r.queue, 0, 'a-kk') >= 2, 'D3 removal case keeps the return gap ' + r.queue.join(','));
    // pause-card case: the first free pause card is the same lemma as the tail
    r = VM.scheduleReturn({queue: ['a-kk', 'b-kk'], position: 0, cardId: 'a-kk', pool: ['a-kk', 'b-kk', 'b-ru', 'c-kk'].map(id => ({id, wordRole: 'must'})), plan, core: fake, minGap: 2});
    assert.equal(r.scheduled, true);
    assert.equal(adj(r.queue, 0), null, 'D3 pause case adjacent ' + r.queue.join(','));
    assert.deepEqual(r.queue, ['a-kk', 'b-kk', 'c-kk', 'a-kk'], 'D3 pause case: the pause card avoids the tail lemma, the portion does not grow');
    // the shown card and its other direction right after it
    r = VM.scheduleReturn({queue: ['a-kk', 'a-ru', 'b-kk', 'c-kk', 'd-kk'], position: 0, cardId: 'a-kk', pool, plan, core: fake, minGap: 2});
    assert.equal(adj(r.queue, 0), null, 'D3 shown-card case adjacent ' + r.queue.join(','));
    // no swap can help: one more known pause card goes between the pair
    r = VM.scheduleReturn({queue: ['c-kk', 'b-ru', 'b-kk'], position: 0, cardId: 'c-kk', pool, plan: {newLemmas: ['b', 'c']}, state: {records: {}, skills: {}, events: [{type: 'answer', card_id: 'd-kk'}]}, core: fake, minGap: 2});
    assert.equal(r.scheduled, true);
    assert.equal(adj(r.queue, 0), null, 'D3 insert case adjacent ' + r.queue.join(','));
    assert.ok(r.queue.includes('d-kk'), 'D3 insert case used the known pause card ' + r.queue.join(','));
    // fallback: only one lemma to pause with — still scheduled, order kept as best possible
    r = VM.scheduleReturn({queue: ['a-kk', 'b-kk', 'b-ru'], position: 0, cardId: 'a-kk', pool: ['a-kk', 'b-kk', 'b-ru'].map(id => ({id, wordRole: 'must'})), plan: {newLemmas: ['a', 'b']}, core: fake, minGap: 1});
    assert.equal(r.scheduled, true, 'D3 fallback still schedules the return');
    assert.equal(r.queue.filter(id => id === 'a-kk').length, 2, 'D3 fallback returns the card once');
    // GPT P1-1 regression: a swap must not bring an already scheduled repeat (a-ru → a-ru) closer than minGap.
    const gapsOf = (q, from) => {
      const out = [];
      const last = new Map();
      q.forEach((id, i) => {
        if (last.has(id) && i > from) { let n = 0; for (let k = last.get(id) + 1; k < i; k++) if (lem(q[k]) !== lem(id)) n++; out.push([id, last.get(id), i, n]); }
        last.set(id, i);
      });
      return out;
    };
    const gapsKept = (before, after, from, minGap) => {
      const b = gapsOf(before, from), a = gapsOf(after, from);
      for (const [id] of b) {
        const bl = b.filter(x => x[0] === id).map(x => x[3]), al = a.filter(x => x[0] === id).map(x => x[3]);
        for (let k = 0; k < bl.length; k++) if (al[k] != null && al[k] < Math.min(bl[k], minGap)) return id + ' gap ' + al[k] + ' < ' + Math.min(bl[k], minGap);
      }
      return null;
    };
    {
      const q0 = ['d-ru', 'a-ru', 'b-kk', 'b-ru', 'a-ru', 'd-kk'];
      const p5 = ['a-ru', 'b-kk', 'b-ru', 'd-ru', 'd-kk'].map(id => ({id, wordRole: 'must'}));
      r = VM.scheduleReturn({queue: q0, position: 2, cardId: 'b-kk', pool: p5, plan: {newLemmas: ['a', 'b', 'd']}, core: fake, minGap: 2});
      assert.equal(r.scheduled, true, 'P1-1 case schedules the return');
      assert.ok(gapBefore(r.queue, 1, 'a-ru') >= 2, 'P1-1 case: a-ru → a-ru keeps 2 cards between ' + r.queue.join(','));
      assert.deepEqual(r.queue, ['d-ru', 'a-ru', 'b-kk', 'b-ru', 'a-ru', 'd-kk', 'b-kk'], 'P1-1 case: no swap breaks the a-ru gap ' + r.queue.join(','));
      assert.ok(gapBefore(r.queue, 2, 'b-kk') >= 2, 'P1-1 case: return gap of b-kk ' + r.queue.join(','));
      // with one more known pause card the pair b-kk/b-ru is split by an insert, not by a swap that hurts a-ru
      r = VM.scheduleReturn({queue: q0, position: 2, cardId: 'b-kk', pool: p5.concat([{id: 'e-kk', wordRole: 'must'}]), plan: {newLemmas: ['a', 'b', 'd']}, state: {records: {}, skills: {}, events: [{type: 'answer', card_id: 'e-kk'}]}, core: fake, minGap: 2});
      assert.equal(adj(r.queue, 2), null, 'P1-1 case + pause card: adjacent ' + r.queue.join(','));
      assert.equal(gapsKept(q0, r.queue, 2, 2), null, 'P1-1 case + pause card: ' + r.queue.join(','));
      console.log('P1-1 regression: a-ru repeat keeps its gap', r.queue.join(','));
    }
    // randomized: no new adjacency, gap kept, same multiset
    let seed = 7;
    const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const ids = ['a-kk', 'a-ru', 'b-kk', 'b-ru', 'c-kk', 'c-ru', 'd-kk', 'd-ru', 'e-kk'];
    const bigPool = ids.map(id => ({id, wordRole: 'must'}));
    const seen = {records: {}, skills: {}, events: ids.map(id => ({type: 'answer', card_id: id}))};
    let fixedRuns = 0;
    for (let n = 0; n < 400; n++) {
      const tail = ids.slice().sort(() => rnd(3) - 1).slice(0, 3 + rnd(5));
      const card = tail[0];
      const q = [card].concat(tail.slice(1));
      if (rnd(2)) q.splice(1 + rnd(q.length - 1), 0, card);
      const out = VM.scheduleReturn({queue: q, position: 0, cardId: card, pool: bigPool, plan: {newLemmas: [...new Set(q.map(lem))]}, state: seen, core: fake, minGap: 2});
      if (!out.scheduled) continue;
      fixedRuns++;
      assert.equal(adj(out.queue, 0), null, 'D3 random ' + q.join(',') + ' -> ' + out.queue.join(','));
      assert.ok(gapBefore(out.queue, 0, card) >= 2, 'D3 random gap ' + out.queue.join(','));
      const base = q.filter((id, i) => i === 0 || id !== card);
      const bad = gapsKept(base, out.queue, 0, 2);
      assert.equal(bad, null, 'D3 random all-repeat gap ' + q.join(',') + ' -> ' + out.queue.join(','));
    }
    assert.ok(fixedRuns > 100, 'D3 random runs scheduled ' + fixedRuns);
    // randomized (GPT P1-1): any position, shown history before it, repeats of other cards already in the tail.
    // No repeat of any card that ends after the shown card gets closer than min(minGap, what it had).
    let gapRuns = 0;
    for (let n = 0; n < 400; n++) {
      const pre = Array.from({length: rnd(4)}, () => ids[rnd(ids.length)]);
      const card = ids[rnd(ids.length)];
      const tail = Array.from({length: 2 + rnd(6)}, () => ids[rnd(ids.length)]);
      const q = pre.concat([card], tail);
      const position = pre.length;
      const out = VM.scheduleReturn({queue: q, position, cardId: card, pool: bigPool, plan: {newLemmas: [...new Set(q.map(lem))]}, state: seen, core: fake, minGap: 2});
      if (!out.scheduled) continue;
      gapRuns++;
      assert.deepEqual(out.queue.slice(0, position + 1), q.slice(0, position + 1), 'P1-1 random: shown part untouched');
      assert.ok(gapBefore(out.queue, position, card) >= 2, 'P1-1 random return gap ' + q.join(',') + ' @' + position + ' -> ' + out.queue.join(','));
      const base = q.filter((id, i) => i <= position || id !== card);
      const bad = gapsKept(base, out.queue, position, 2);
      assert.equal(bad, null, 'P1-1 random all-repeat gap ' + q.join(',') + ' @' + position + ' -> ' + out.queue.join(',') + ' : ' + bad);
    }
    assert.ok(gapRuns > 100, 'P1-1 random runs scheduled ' + gapRuns);
    console.log('P1-1 random: all repeats keep their gap in', gapRuns, 'returns at random positions');
    console.log('D3 scheduleReturn: no side-by-side lemma in', fixedRuns, 'random returns; gap kept');
  }

  // D3 in the product (iPhone QA repro_adj): right, «Не знаю»+retype, right, wrong+retype, then right answers.
  {
    const api = boot();
    api.window.TrainerCatalogBridge.launch('vocab:must');
    const script = ['ok', 'idk', 'ok', 'wrong', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'];
    const shown = [];
    for (const act of script) {
      api.saveNow();
      const s = api.session();
      const q = api.cardOf(s);
      if (!q) break;
      shown.push(q.id);
      const answer = api.answerOf(q);
      if (act === 'idk') { api.makeEl('reveal-button').onclick(); retype(api, answer); }
      else if (act === 'wrong') { api.submit('бала'); retype(api, answer); }
      else { api.submit(answer); await sleep(700); }
    }
    const pair = adjacentSame(api, shown);
    assert.equal(pair, null, 'D3 walk shows one lemma twice in a row: ' + (pair || []).join(' → ') + ' in ' + shown.join(' '));
    console.log('D3 walk', shown.join(' '), 'no lemma twice in a row');
  }

  // GPT P1-2 (general): two tabs on one show (same queueEpoch/position). Tab A gives the first answer of every kind,
  // the cloud sync (applyRemote) brings it into tab B, where the card is still on screen with B's own typing, and B
  // presses «Проверить» (right or wrong) or «Не знаю». Table: first answer × B action. B must not count anything,
  // not write an answer/retry_close/draft, and must end with the queue (return) of the one-tab outcome. A first
  // answer that is done (right, near-miss, assisted, rule-viewed, closed retype) moves B on; an open retype is the
  // same retype in B (the first answer's retry), and across both tabs only one retry_close survives the sync.
  const fakeCloud = w => {
    w.QazaqCloud = {configured: true, user: null, remote: null, async start() {}, async pull() { return JSON.parse(JSON.stringify(this.remote)); }, async push() {}, async login() {}, async logout() {}};
  };
  const stateOf = api => { api.saveNow(); return JSON.parse(api.window.localStorage.getItem(KEY)); };
  async function sync(to, from) {
    to.window.QazaqCloud.remote = stateOf(from);
    to.window.QazaqCloud.user = {email: 'x@y'};
    to.window.dispatchEvent(new to.window.CustomEvent('qazaq-cloud-user'));
    await sleep(30);
    to.saveNow();
  }
  const showOf = e => String(e.session_id) + '|' + e.presentation + '|' + e.card_id;
  const countOf = (api, type, key) => stateOf(api).events.filter(e => e.type === type && showOf(e) === key).length;
  const counters = s => [s.sessionAttempts || 0, s.sessionCorrect || 0, s.sessionAssisted || 0, (s.vocab.sitting || {}).answers || 0].join('/');
  const table = [];
  async function combo(first, bAct) {
    const tag = 'P1-2 [' + first + ' × B ' + bAct + ']: ';
    const A = boot(null, fakeCloud);
    A.window.TrainerCatalogBridge.launch('vocab:must');
    A.saveNow();
    if (first === 'near') {
      // near-miss exists for Russian answers only: right, then «Не знаю» + retype brings a Russian side in
      A.submit(A.answerOf(A.cardOf(A.session()))); await sleep(700); A.saveNow();
      const c = A.cardOf(A.session()); A.makeEl('reveal-button').onclick(); retype(A, A.answerOf(c)); A.saveNow();
      for (let step = 0; step < 10; step++) {
        const c2 = A.cardOf(A.session());
        if (/русском/.test(c2.fields[0].label || '')) break;
        A.submit(A.answerOf(c2)); await sleep(700); A.saveNow();
      }
    }
    const store = Object.assign({}, A.window.localStorage._d);
    const B = boot(null, w => { fakeCloud(w); Object.assign(w.localStorage._d, store); });
    await sleep(20);
    B.saveNow();
    const s0 = B.session();
    const q = B.cardOf(s0);
    const answer = B.answerOf(q);
    const key = String(s0.queueEpoch) + '|' + s0.position + '|' + q.id;
    assert.equal(A.session().queueEpoch, s0.queueEpoch, tag + 'tabs share the session');
    assert.equal(A.session().position, s0.position, tag + 'tabs share the position');
    // Tab A: the first answer, exactly as in one tab.
    if (first === 'assisted') A.makeEl('hint-button').onclick();
    if (first === 'rule') {
      // hw1 cards carry no rule text; give this card one so «Правило» opens (sets rulePeeked) as on a rule card
      const H = A.window.Homework, own = H.ruleText;
      H.ruleText = c => (c && c.id === q.id ? 'Правило: проверочный текст.' : own.call(H, c));
      A.makeEl('rule-button').onclick();
    }
    if (first.startsWith('idk')) A.makeEl('reveal-button').onclick();
    else A.submit(first.startsWith('wrong') ? 'неттакогослова' : first === 'near' ? answer + answer.slice(-1) : answer);
    A.saveNow();
    const refQueue = A.session().queue.slice();
    if (first.endsWith('-closed')) { retype(A, answer); A.saveNow(); }
    const aEv = stateOf(A).events.filter(e => e.type === 'answer' && showOf(e) === key);
    assert.equal(aEv.length, 1, tag + 'A wrote the first answer');
    const ev = aEv[0];
    const want = {right: [true, false, 0], near: [true, false, 0], assisted: [true, true, 0], rule: [true, true, 0], wrong: [false, false, 0], 'wrong-closed': [false, false, 0], idk: [false, true, 1], 'idk-closed': [false, true, 1]}[first];
    assert.deepEqual([!!ev.correct, !!ev.hinted, ev.idk ? 1 : 0], want, tag + 'A answer kind ' + JSON.stringify(ev));
    if (first === 'near') assert.equal(ev.near_miss, 1, tag + 'A answer is a near-miss');
    if (first === 'rule') assert.ok(stateOf(A).events.some(e => e.type === 'rule_peek' && e.card_id === q.id), tag + 'A viewed the rule');
    const good = first === 'right' || first === 'near';
    assert.equal(refQueue.slice(s0.position + 1).includes(q.id), !good, tag + 'one-tab return planned: ' + refQueue.join(','));
    const aRc = countOf(A, 'retry_close', key);
    assert.equal(aRc, first.endsWith('-closed') ? 1 : 0, tag + 'A retry_close');
    // Tab B: typing on the still open card, then the sync lands.
    const bText = bAct === 'right' ? answer : bAct === 'wrong' ? 'неттакогослова' : 'аа';
    B.makeEl('answer-0').value = bText;
    for (const fn of B.makeEl('answer-form')._ev.input || []) fn({type: 'input'});
    await sync(B, A);
    assert.equal(countOf(B, 'answer', key), 1, tag + 'B merged the first answer');
    assert.equal(B.session().position, s0.position, tag + 'B card still on screen after the sync');
    const before = counters(B.session());
    if (bAct === 'idk') B.makeEl('reveal-button').onclick();
    else B.submit(bText);
    B.saveNow();
    const s = B.session();
    const open = first === 'wrong' || first === 'idk';
    assert.deepEqual(s.queue, refQueue, tag + 'B queue = one-tab queue ' + s.queue.join(','));
    assert.equal(countOf(B, 'answer', key), 1, tag + 'no second answer');
    assert.equal(countOf(B, 'retry_close', key), aRc, tag + 'no new retry_close');
    assert.equal(counters(s), before, tag + 'nothing counted');
    assert.ok(!draftHas(B, q.id, bText), tag + 'no card draft with B text');
    assert.ok(!(s.draft && (s.draft.answers || []).includes(bText)), tag + 'no session draft with B text');
    assert.equal(B.makeEl('answer-0').value, '', tag + 'field empty');
    if (!open) {
      assert.equal(s.position, s0.position + 1, tag + 'B moved on');
      assert.equal(s.vocab.retry, null, tag + 'no retype');
      assert.ok((s.vocab.closed || []).includes(key), tag + 'show closed in B');
      const next = B.cardOf(s);
      B.submit(B.answerOf(next));
      await sleep(700);
      B.saveNow();
      assert.equal(stateOf(B).events.filter(e => e.type === 'answer' && String(e.session_id) === String(s0.queueEpoch) && e.presentation === s0.position + 1).length, 1, tag + 'next Enter answers the next card once');
      assert.equal(countOf(B, 'retry_close', key), aRc, tag + 'still no new retry_close');
      table.push(first + ' × ' + bAct + ' → moved on');
    } else {
      assert.equal(s.position, s0.position, tag + 'B stays on the card');
      assert.ok(s.vocab.retry, tag + 'retype open');
      assert.equal(s.vocab.retry.kind, first, tag + 'the first answer kind, not a new one');
      assert.equal(s.vocab.retry.answerEventId, ev.id, tag + 'the first answer retry record');
      // both tabs close the same retype (B, then A offline), then sync both ways: one retry_close
      retype(B, answer); B.saveNow();
      assert.equal(B.session().position, s0.position + 1, tag + 'B retype closed the show');
      assert.equal(countOf(B, 'retry_close', key), 1, tag + 'B wrote the close');
      retype(A, answer); A.saveNow();
      await sync(A, B); await sync(B, A);
      assert.equal(countOf(A, 'retry_close', key), 1, tag + 'one retry_close in A after the sync');
      assert.equal(countOf(B, 'retry_close', key), 1, tag + 'one retry_close in B after the sync');
      assert.equal(countOf(B, 'answer', key), 1, tag + 'one answer after the sync');
      table.push(first + ' × ' + bAct + ' → same retype');
    }
    if (first.endsWith('-closed')) { await sync(A, B); assert.equal(countOf(A, 'retry_close', key), 1, tag + 'one retry_close in A'); }
  }
  for (const first of ['right', 'near', 'assisted', 'rule', 'wrong', 'wrong-closed', 'idk', 'idk-closed'])
    for (const bAct of ['right', 'wrong', 'idk']) await combo(first, bAct);
  console.log('P1-2 table (' + table.length + '):', table.join('; '));

  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(sw, /qazaq-offline-live-20261011-nav02e['"]/, 'sw.js CACHE is nav02e after main is merged in');
  console.log('VERIFY_VOCAB_PR7_DRAFT_LEAK_OK');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
