'use strict';
/* Recapture the five must navigation fixtures from the product.
   node tools/capture_nav_must_fixtures.js
   Writes fixtures/navigation/must-*.json. Does not change product code.
   queueEpoch and sitting timestamps change on every run. Tests restore the
   committed file; they do not byte-compare two captures. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FIX = path.join(ROOT, 'fixtures', 'navigation');
const KEY = 'qazaq-kris-course-v1';
const MUST_FILES = Object.freeze({
  'first-show': 'must-first-show.json',
  idk: 'must-idk.json',
  wrong: 'must-wrong.json',
  boundary: 'must-boundary.json',
  summary: 'must-summary.json'
});

function boot(seed, prep) {
  const nodes = new Map();
  const kids = [];
  function makeEl(key) {
    if (nodes.has(key)) return nodes.get(key);
    const bag = {
      id: String(key).replace(/^#/, ''), hidden: false, textContent: '', innerHTML: '', value: '',
      className: 'feedback', dataset: {}, disabled: false, type: 'text', checked: false,
      style: new Proxy({}, {get: () => () => {}, set: () => true})
    };
    const classList = {add() {}, remove() {}, toggle() {}, contains() { return false; }};
    const el = new Proxy(bag, {
      get(t, p) {
        if (p === 'classList') return classList;
        if (p in t) return t[p];
        if (typeof p === 'symbol') return undefined;
        return function () {
          const a = arguments;
          if (p === 'querySelector') return query(a[0]);
          if (p === 'querySelectorAll') return queryAll(a[0]);
          if (p === 'closest') return String(a[0] || '').split(',').some(s => s.trim() === '#' + t.id) ? el : null;
          if (p === 'matches' || p === 'hasAttribute' || p === 'contains') return false;
          if (p === 'getAttribute') return t['attr_' + a[0]] == null ? null : t['attr_' + a[0]];
          if (p === 'setAttribute') { t['attr_' + a[0]] = a[1]; if (String(a[0]).startsWith('data-')) kids.push(el); return; }
          if (p === 'addEventListener') { (t._ev || (t._ev = {}))[a[0]] = (t._ev[a[0]] || []).concat(a[1]); return; }
          if (p === 'appendChild') return a[0];
          return undefined;
        };
      },
      set(t, p, v) {
        t[p] = v;
        if (p === 'innerHTML') {
          const html = String(v);
          for (const m of html.matchAll(/\sid="([^"]+)"/g)) if (!nodes.has(m[1])) makeEl(m[1]);
        }
        return true;
      }
    });
    nodes.set(key, el);
    return el;
  }
  function query(sel) {
    const s = String(sel || '');
    const id = s.match(/#([A-Za-z0-9_-]+)/);
    if (id) return makeEl(id[1]);
    return makeEl('sel:' + s);
  }
  function queryAll(sel) {
    const s = String(sel || '');
    if (s.includes('data-course')) return kids.filter(el => el.getAttribute && el.getAttribute('data-course'));
    return [];
  }
  const listeners = {};
  const window = {
    document: {
      readyState: 'complete', hidden: false, visibilityState: 'visible',
      querySelector: query, querySelectorAll: queryAll,
      getElementById(id) { return makeEl(id); },
      createElement() { return makeEl('el:' + Math.random()); },
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      removeEventListener() {}
    },
    localStorage: {
      _d: Object.create(null),
      getItem(k) { return this._d[k] == null ? null : this._d[k]; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; }
    },
    sessionStorage: {getItem() { return null; }, setItem() {}, removeItem() {}},
    navigator: {userAgent: 'node', language: 'ru'},
    location: {hostname: 'localhost', href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', protocol: 'http:', hash: ''},
    history: {state: {}, replaceState(s) { this.state = s; }, pushState(s) { this.state = s; }, back() {}},
    matchMedia() { return {matches: false, addListener() {}, addEventListener() {}}; },
    console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Object, Array, Map, Set, WeakMap, WeakSet, Promise, Number, String, Boolean, RegExp, Error, TypeError, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined, URL, URLSearchParams, Intl, TextEncoder, TextDecoder,
    performance: {now() { return Date.now(); }},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    requestIdleCallback(cb) { return setTimeout(() => cb(), 30); },
    getComputedStyle() { return {position: 'static', display: 'block'}; },
    innerWidth: 390, innerHeight: 844, scrollTo() {}, scrollY: 0,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; Object.assign(this, init || {}); } },
    Event: class Event { constructor(type) { this.type = type; } }
  };
  window.document.documentElement = makeEl('documentElement');
  window.document.body = makeEl('body');
  window.document.head = makeEl('head');
  window.window = window; window.globalThis = window; window.self = window;
  if (prep) prep(window);
  if (seed) window.localStorage.setItem(KEY, seed);
  const ctx = vm.createContext(window);
  const skip = new Set(['pwa.js', 'design-ui.js', 'cloud.js', 'firebase-config.js']);
  const files = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/src="([^"]+\.js)"/g).map(s => s.slice(5, -1)).filter(f => !skip.has(f));
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  function saveNow() {
    const list = listeners.pagehide || [];
    if (!list.length) throw new Error('pagehide save listener missing');
    for (const fn of list) fn();
  }
  function session() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw).session;
  }
  function cardOf(s) {
    const id = s && s.queue && s.queue[s.position];
    return window.COURSE.questions.find(q => q.id === id) || null;
  }
  function answerOf(q) {
    const field = q && q.fields && q.fields[0];
    const answers = field && field.answers;
    return answers && answers.length ? answers[0] : null;
  }
  function submit(text) {
    if (text != null) makeEl('answer-0').value = text;
    const evs = makeEl('answer-form')._ev && makeEl('answer-form')._ev.submit || [];
    if (!evs.length) throw new Error('answer-form submit listener missing');
    evs[evs.length - 1]({preventDefault() {}, isComposing: false});
  }
  return {window, listeners, makeEl, saveNow, session, cardOf, answerOf, submit};
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureFive() {
  const first = boot();
  first.window.TrainerCatalogBridge.launch('vocab:must');
  first.saveNow();
  const firstSession = first.session();

  const idk = boot();
  idk.window.TrainerCatalogBridge.launch('vocab:must');
  idk.makeEl('reveal-button').onclick();
  idk.saveNow();

  const wrong = boot();
  wrong.window.TrainerCatalogBridge.launch('vocab:must');
  wrong.saveNow();
  wrong.submit('неттакого');
  wrong.saveNow();

  const boundary = boot();
  boundary.window.TrainerCatalogBridge.launch('vocab:must');
  for (let i = 0; i < 8; i++) {
    boundary.saveNow();
    const s = boundary.session();
    if (s.position === s.queue.length - 1) break;
    const answer = boundary.answerOf(boundary.cardOf(s));
    if (!answer) throw new Error('boundary card has no answer at ' + s.queue[s.position]);
    boundary.submit(answer);
    await sleep(700);
  }
  boundary.saveNow();
  const boundarySession = boundary.session();
  if (boundarySession.position !== boundarySession.queue.length - 1) {
    throw new Error('boundary capture did not stop on the last unanswered card');
  }

  const summary = boot();
  summary.window.TrainerCatalogBridge.launch('vocab:must');
  summary.makeEl('vocab-finish').onclick();
  if (!String(summary.makeEl('exercise').innerHTML).includes('Итог')) {
    throw new Error('summary capture did not open the summary');
  }
  summary.saveNow();

  return {
    'first-show': firstSession,
    idk: idk.session(),
    wrong: wrong.session(),
    boundary: boundarySession,
    summary: summary.session()
  };
}

function writeFixtures(sessions, capturedFrom) {
  fs.mkdirSync(FIX, {recursive: true});
  for (const [scene, session] of Object.entries(sessions)) {
    const name = MUST_FILES[scene];
    if (!name) throw new Error('unknown scene ' + scene);
    const body = {
      capturedBy: 'tools/capture_nav_must_fixtures.js',
      capturedFrom,
      scene,
      session
    };
    fs.writeFileSync(path.join(FIX, name), JSON.stringify(body, null, 2) + '\n');
    const v = session.vocab || {};
    const sit = v.sitting || {};
    console.log('WROTE', name, scene, 'pos', session.position + '/' + session.queue.length, 'card', session.queue[session.position], 'retry', v.retry && v.retry.kind, 'shown', (sit.shown || []).length);
  }
}

module.exports = {boot, sleep, KEY, ROOT, FIX, MUST_FILES, captureFive, writeFixtures};

if (require.main === module) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
  captureFive().then(sessions => {
    writeFixtures(sessions, sha);
    console.log('CAPTURE_OK', sha);
  }).catch(err => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
