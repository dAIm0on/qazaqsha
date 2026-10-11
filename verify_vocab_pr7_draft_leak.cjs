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
    }
    assert.ok(fixedRuns > 100, 'D3 random runs scheduled ' + fixedRuns);
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

  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(sw, /qazaq-offline-live-20261011-vocab-pr7['"]/, 'sw.js CACHE is the PR-7 cache');
  console.log('VERIFY_VOCAB_PR7_DRAFT_LEAK_OK');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
