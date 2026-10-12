'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Nav = require('./navigation.js');
const Engine = require('./morph-engine.js');
const {boot} = require('./tools/capture_nav_must_fixtures.js');

const ROOT = __dirname;
let passed = 0;
function ok(name){ passed += 1; console.log('PASS ' + name); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const ready = [
  ['#/lesson', 'lesson', 'today'],
  ['#/lesson/theory?lesson=1-1', 'theory', 'path'],
  ['#/words', 'words', 'practice'],
  ['#/practice?lesson=2-2', 'practice', 'practice'],
  ['#/morph', 'morph', 'morph'],
  ['#/lessons', 'lessons', 'learn'],
  ['#/practices/letters', 'letters', 'personal'],
  ['#/practices/numbers', 'practices-numbers', 'personal'],
  ['#/practices/session?kind=lesson&id=plural-1', 'extra', 'practice'],
  ['#/ready/homework/1-1', 'homework', 'homework'],
  ['#/ready/homework/2-2/session', 'homework-session', 'practice'],
  ['#/ready/exam', 'exam', 'exam'],
  ['#/ready/exam/session', 'exam-session', 'practice'],
  ['#/ready/preexam', 'preexam', 'practice'],
  ['#/rules', 'rules', 'rules'],
  ['#/dict', 'dict', 'vocabulary'],
  ['#/materials', 'materials', 'materials'],
  ['#/results', 'results', 'review']
];
for (const [href, name, view] of ready) {
  const parsed = Nav.parse(href);
  assert.equal(parsed.kind, 'route', href);
  assert.equal(parsed.route.name, name, href);
  assert.equal(parsed.route.view, view, href);
  assert.equal(Nav.parse(parsed.route.href).route.href, parsed.route.href, href);
}
assert.notEqual(Nav.parse('#/ready/homework/1-1').route.href, Nav.parse('#/ready/homework/2-2').route.href);
assert.equal(Nav.parse('#/ready/homework/1-1').route.context.id, '1-1');
assert.equal(Nav.parse('#/ready/homework/2-2').route.context.id, '2-2');
assert.equal(Nav.parse('#main').kind, 'anchor');
assert.equal(Nav.parse('#main').anchor, 'main');
assert.equal(Nav.parse('#/no-such-room').kind, 'unknown');
assert.equal(Nav.parse('').kind, 'none');
assert.equal(Nav.parentOf(Nav.parse('#/words').route).href, '#/lesson');
assert.equal(Nav.parentOf(Nav.parse('#/lesson/theory').route).href, '#/lesson');
assert.equal(Nav.parentOf(Nav.parse('#/practices/session?kind=numbers&id=numbers-0').route).href, '#/practices');
assert.equal(Nav.parentOf(Nav.parse('#/ready/exam/session').route).href, '#/ready');
assert.equal(Nav.parse('#/practices/session?kind=words&id=used').route.sessionKey, 'vocab:used');
{
  const extra = Nav.legacyRoute('practice', {view: 'practice', mode: 'words', topic: 'vocab', trainerReturn: 'vocab:used', launchKey: 'vocab:used'});
  assert.equal(extra.href, '#/practices/session?kind=words&id=used');
  assert.equal(Nav.parse(extra.href).route.sessionKey, extra.sessionKey, 'generic extra keeps sessionKey across F5 parse round-trip');
}
assert.equal(Nav.parse('#/practices/session?kind=numbers&id=numbers-0').route.sessionKey, 'number:numbers-0');
assert.equal(Nav.parse('#/ready/preexam').route.sessionKey, 'preexam:3-3');
{
  const savedHistory = global.history;
  global.history = {state: {qzNav: {route: '#/ready/exam/session', sessionKey: 'exam:sounds'}}};
  assert.equal(Nav.parse('#/ready/exam/session').route.sessionKey, 'exam:sounds', 'F5 keeps exact exam sessionKey from history.state');
  global.history = {state: {qzNav: {route: '#/ready/homework/2-2/session', sessionKey: 'homework:2-2:words:1'}}};
  assert.equal(Nav.parse('#/ready/homework/2-2/session').route.sessionKey, 'homework:2-2:words:1', 'F5 keeps exact homework sessionKey from history.state');
  global.history = savedHistory;
}
const ids = Nav.SECTIONS.map(name => name + '-view');
for (const view of Nav.SECTIONS) assert.deepEqual(Nav.sectionPlan(ids, view), [view + '-view']);
assert.deepEqual(Nav.sectionPlan(ids, 'library'), ['today-view']);
assert.equal(Nav.sectionPlan(ids, 'settings').length, 1);
assert.equal(Nav.sectionPlan([], 'library').length, 0);
ok('registry: ready routes, homework ids, anchor, unknown, one section');

{
  const appNav = read('app.js');
  assert.ok(appNav.includes("if(item.session){openSessionRoute(item,'history');return;}"), 'every history session route uses the owner check');
  assert.ok(appNav.includes("if(routeItem.session){openSessionRoute(routeItem,'boot');return;}"), 'every boot session route uses the owner check');
  assert.ok(appNav.includes("if(name==='exam-session')return key.indexOf('exam:')===0;"), 'exam-session accepts exam:* only');
  assert.ok(appNav.includes("if(name==='preexam')return key.indexOf('preexam:')===0;"), 'preexam accepts preexam:* only');
}
ok('F1 session ownership: history and boot share openSessionRoute; exam/preexam key families stay disjoint');

{
  const foreign = {nav2: 1, fs2: {id: 'x'}, queue: ['secret'], draft: {answers: ['a']}, keep: 'yes'};
  const item = Nav.parse('#/words').route;
  item.origin = Nav.lessonHome();
  const packed = Nav.packState(foreign, item, 'practice');
  assert.equal(packed.qzView, 'practice');
  assert.equal(packed.qzNav.version, 1);
  assert.equal(packed.qzNav.route, '#/words');
  assert.equal(packed.qzNav.origin.href, '#/lesson');
  assert.equal(packed.keep, 'yes');
  assert.equal(Object.prototype.hasOwnProperty.call(packed, 'queue'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(packed, 'draft'), false);
  assert.equal(packed.nav2, 1);
  assert.equal(packed.fs2.id, 'x');
  assert.equal(JSON.stringify(packed).includes('secret'), false);
}
ok('history.state keeps foreign fields and omits queues');

{
  Nav.resetTrace();
  const lesson = Nav.parse('#/lesson').route;
  const library = Nav.parse('#/library').route;
  const results = Nav.parse('#/results').route;
  assert.equal(Nav.commit({view: 'today', source: 'boot', route: lesson}).pushed, false);
  assert.equal(Nav.commit({view: 'today', source: 'user', route: library}).pushed, true);
  assert.equal(Nav.commit({view: 'review', source: 'user', route: results}).pushed, true);
  assert.equal(Nav.pushCount, 2);
  assert.equal(Nav.goBack(), true);
  assert.equal(Nav.stack().pop().href, '#/library');
  assert.equal(Nav.goBack(), true);
  assert.equal(Nav.stack().pop().href, '#/lesson');
  assert.equal(Nav.goForward(), true);
  assert.equal(Nav.stack().pop().href, '#/library');
  const before = Nav.pushCount;
  assert.equal(Nav.commit({view: 'review', source: 'render', route: results}).pushed, false);
  assert.equal(Nav.pushCount, before);
  const same = Nav.commit({view: 'today', source: 'user', route: lesson});
  Nav.commit({view: 'today', source: 'user', route: lesson});
  assert.equal(Nav.pushCount, before + (same.pushed ? 1 : 0));
  const again = Nav.pushCount;
  Nav.commit({view: 'today', source: 'user', route: lesson});
  assert.equal(Nav.pushCount, again, 'same screen does not push again');
}
ok('N-HISTORY-1 one push per external hop; render and a repeat do not push');

{
  Nav.resetTrace();
  const savedLocation = global.location;
  const savedHistory = global.history;
  const entries = [{href: '#/morph', state: null}];
  let pos = 0;
  let view = 'morph';
  const morph = {cursor: 0, navBack: []};
  function morphPush(){
    morph.navBack.push({cursor: morph.cursor});
    morph.cursor += 1;
    global.history.pushState({nav2: 1}, '', '#/morph');
  }
  function morphPop(){
    if (!morph.navBack.length) return false;
    const prev = morph.navBack.pop();
    morph.cursor = prev.cursor;
    return true;
  }
  global.location = {hash: '#/morph'};
  global.history = {
    get state(){ return entries[pos] && entries[pos].state; },
    pushState(state, title, href){
      entries.splice(pos + 1);
      entries.push({href: href || global.location.hash, state});
      pos = entries.length - 1;
      global.location.hash = entries[pos].href;
    },
    replaceState(state, title, href){
      entries[pos] = {href: href || entries[pos].href, state};
      global.location.hash = entries[pos].href;
    },
    back(){
      if (pos <= 0) return;
      pos -= 1;
      global.location.hash = entries[pos].href;
      const ev = {state: entries[pos].state, stopImmediatePropagation(){}};
      if (!Nav.onPop(ev)) morphPop();
    },
    forward(){
      if (pos >= entries.length - 1) return;
      pos += 1;
      global.location.hash = entries[pos].href;
      const ev = {state: entries[pos].state, stopImmediatePropagation(){}};
      if (!Nav.onPop(ev)) morphPop();
    }
  };
  Nav.bind(function(item){ view = item.view; Nav.commit({view: item.view, source: 'history', route: item}); });
  Nav.commit({view: 'morph', source: 'boot', route: Nav.parse('#/morph').route});
  morphPush();
  morphPush();
  const before = JSON.parse(JSON.stringify(morph));
  Nav.commit({view: 'today', source: 'user', route: Nav.parse('#/library').route});
  view = 'today';
  global.history.back();
  assert.equal(view, 'morph');
  assert.deepEqual(morph, before, 'Library -> Back must not consume a MorphNav2 step');
  global.history.forward();
  assert.equal(view, 'today');
  global.history.back();
  assert.equal(view, 'morph');
  assert.deepEqual(morph, before, 'Forward -> Library -> Back keeps the same morph cursor/navBack');

  Nav.resetTrace();
  entries.splice(0, entries.length, {href: '#/morph', state: null});
  pos = 0;
  global.location.hash = '#/morph';
  morph.cursor = 0;
  morph.navBack = [];
  view = 'morph';
  Nav.commit({view: 'morph', source: 'boot', route: Nav.parse('#/morph').route});
  morphPush();
  assert.equal(morph.cursor, 1);
  assert.equal(morph.navBack.length, 1);
  global.history.back();
  assert.equal(view, 'morph');
  assert.equal(morph.cursor, 0, 'first nav2 Back to the shell morph record is owned by MorphNav2');
  assert.equal(morph.navBack.length, 0);
  Nav.bind(null);
  global.location = savedLocation;
  global.history = savedHistory;
}
ok('N-HISTORY-4: morph internal x2 -> Library -> Back/Forward preserves cursor/navBack; first nav2 Back stays internal');


{
  const navText = read('navigation.js');
  assert.ok(navText.includes("addEventListener('popstate',onPop,true)"), 'capture guard is registered');
  assert.equal(navText.includes('history.pushState=') || navText.includes('History.prototype'), false, 'navigation must not patch History APIs');
}
ok('N-HISTORY-4 guard: capture popstate registration stays native and History APIs stay unpatched');

{
  const html = read('index.html');
  const scripts = Array.from(html.matchAll(/<script defer src="([^"]+\.js)"><\/script>/g), function(match){ return match[1]; });
  const navAt = scripts.indexOf('navigation.js');
  const morphAt = scripts.indexOf('morph-ui.js');
  assert.ok(navAt >= 0 && morphAt >= 0, 'navigation.js and morph-ui.js are both wired in index.html');

  const morphSrc = read('morph-ui.js');
  const prefix = "window.addEventListener('popstate',";
  const listenerStart = morphSrc.indexOf(prefix);
  const listenerEnd = morphSrc.indexOf("\n});\nwindow.MorphTrainer", listenerStart);
  assert.ok(listenerStart >= 0 && listenerEnd > listenerStart, 'real morph-ui popstate listener is present');
  const listenerExpr = morphSrc.slice(listenerStart + prefix.length, listenerEnd + 2);

  const listeners = Object.create(null);
  const location = {hash: '#/morph'};
  let historyState = null;
  let morphBackCalls = 0;
  const window = {
    location,
    document: {getElementById(){ return null; }},
    history: {
      get state(){ return historyState; },
      pushState(state, title, href){ historyState = state; if (href) location.hash = href; },
      replaceState(state, title, href){ historyState = state; if (href) location.hash = href; },
      back(){}, forward(){}
    },
    addEventListener(type, fn, capture){
      (listeners[type] || (listeners[type] = [])).push({fn, capture: !!capture});
    },
    MorphNav2: {back(){ morphBackCalls += 1; return true; }}
  };
  window.window = window;
  window.globalThis = window;
  const context = vm.createContext({
    window, globalThis: window, self: window, history: window.history,
    URLSearchParams, WeakSet, Set, Object, Array, String, Boolean, Number,
    JSON, RegExp, Error, TypeError, Math, Date, parseInt, decodeURIComponent,
    encodeURIComponent, console,
    fs2Depth: 0, render(){}, saveCursor(){}, showSectionHome(){}
  });

  for (const name of scripts) {
    if (name === 'navigation.js') vm.runInContext(read('navigation.js'), context, {filename: 'navigation.js'});
    if (name === 'morph-ui.js') {
      const handler = vm.runInContext('(' + listenerExpr + ')', context, {filename: 'morph-ui-popstate.js'});
      window.addEventListener('popstate', handler, false);
    }
  }
  const nav = window.QazaqNav;
  assert.ok(nav, 'navigation.js loaded from real index order');
  nav.commit({view: 'morph', source: 'boot', route: nav.parse('#/morph').route});
  window.history.pushState({nav2: 1}, '', '#/morph');

  // Chrome dispatches popstate at Window; listeners on that target run in registration order.
  // A direct hash hop away from the nav2 entry arrives with state=null. Shell must claim it
  // before the already-existing morph-ui listener can interpret it as MorphNav2.back().
  location.hash = '#/library';
  historyState = null;
  const event = {
    state: null,
    stopped: false,
    stopImmediatePropagation(){ this.stopped = true; }
  };
  for (const entry of listeners.popstate || []) {
    entry.fn(event);
    if (event.stopped) break;
  }
  assert.equal(event.stopped, true, 'external hash pop is claimed by shell navigation');
  assert.equal(morphBackCalls, 0, 'leaving morph for #/library must not consume MorphNav2.back()');
  assert.equal(nav.stack().at(-1).href, '#/library');
  assert.ok(navAt < morphAt, 'navigation.js must register before morph-ui.js on the Window popstate target');
}
ok('N-HISTORY-4 browser listener order: real morph-ui popstate cannot consume a step on morph -> #/library');

{
  const navSrc = read('navigation.js');
  const app = read('app.js');
  const start = app.slice(app.indexOf('function startLesson('), app.indexOf('function startContrast('));
  const logo = app.slice(app.indexOf("const brandLink=document.querySelector('a.brand');"), app.indexOf("$('#pause-session').onclick"));
  assert.equal(start.includes('history.pushState'), false);
  assert.equal(logo.includes('history.pushState'), false);
  assert.ok(app.includes('QazaqNav.sectionPlan'));
  assert.ok(app.includes('openExplicitRoute'));
  assert.ok(navSrc.includes('stopImmediatePropagation'));
  const morphFiles = [
    'morph-ui.js', 'morph-nav2.js', 'morph.css',
    'free-practice-config.js', 'free-practice-queue.js', 'free-practice-state.js',
    'free-practice-content.js', 'free-practice-view.js'
  ];
  const hashes = JSON.parse(read('fixtures/navigation/protected-sha256.json'));
  for (const name of morphFiles) {
    const digest = crypto.createHash('sha256').update(Buffer.from(read(name).replace(/\r\n/g, '\n'), 'utf8')).digest('hex');
    assert.equal(digest, hashes.files[name], name);
  }
}
ok('writers: startLesson and the logo do not push; morph bytes match HEAD');

{
  const probe = boot();
  const lesson = probe.window.GrammarPath.lesson('1-1');
  assert.ok(lesson && lesson.chapters && lesson.chapters.length, '1-1 theory chapter is available');
  const theory = JSON.parse(read('fixtures/navigation/theory-draft.json'));
  theory.grammarPath.lessonId = '1-1';
  theory.grammarPath.phase = 'beat';
  theory.grammarPath.chapterId = lesson.chapters[0].id;
  theory.grammarPath.beat = 0;
  theory.grammarPath.canonShownFor = null;
  theory.grammarPath.canonVisible = false;
  const page = boot(JSON.stringify(theory), function(win){ win.location.hash = '#/lesson/theory?lesson=1-1'; });
  const q = page.window.QazaqNav;
  const shell = page.window.QazaqShell;
  assert.equal(page.window.document.body.dataset.view, 'path');
  const beforePush = q.pushCount;
  const beforeStack = q.stack().length;
  let rawPushes = 0;
  const realPush = page.window.history.pushState.bind(page.window.history);
  page.window.history.pushState = function(){ rawPushes += 1; return realPush.apply(null, arguments); };
  const previous = page.window.document.getElementById('path-back');
  assert.equal(typeof previous.onclick, 'function', 'theory previous-step button is wired');
  previous.onclick();
  assert.equal(rawPushes, 0, 'Предыдущий шаг does not write browser history');
  assert.equal(q.pushCount, beforePush, 'Предыдущий шаг does not add a shell hop');
  assert.equal(q.stack().length, beforeStack, 'Предыдущий шаг keeps shell stack length');
  shell.show('today');
  assert.equal(q.pushCount, beforePush + 1, 'leaving theory is the one external hop');
  assert.equal(q.stack().length, beforeStack + 1, 'only the pause/leave hop grows shell history');
}
ok('N-HISTORY-3: theory previous step is internal; leaving theory is one external history hop');

{
  const page = boot();
  const q = page.window.QazaqNav;
  const shell = page.window.QazaqShell;
  assert.equal(page.window.document.body.dataset.view, 'today');
  assert.equal(page.window.location.hash, '#/lesson');
  const base = q.pushCount;
  shell.show('learn');
  shell.show('review');
  assert.equal(q.pushCount, base + 2);
  assert.equal(q.stack().map(item => item.href).join(' '), '#/lesson #/lessons #/results');
  assert.equal(q.goBack(), true);
  assert.equal(q.goBack(), true);
  assert.equal(page.window.location.hash, '#/lesson');
  assert.equal(q.goForward(), true);
  assert.equal(page.window.location.hash, '#/lessons');
  const card = q.pushCount;
  q.commit({view: 'learn', source: 'render', route: q.parse('#/lessons').route});
  assert.equal(q.pushCount, card, 'a card step does not push');
  const sections = ['today-view', 'learn-view', 'review-view', 'practice-view', 'morph-view'];
  assert.equal(q.sectionPlan(sections, 'library').length, 1);
  assert.equal(q.sectionPlan(sections, 'nope')[0], 'today-view');
}
ok('live shell: lesson, lessons, results, Back, Back, Forward; one visible section plan');

{
  const page = boot();
  const shell = page.window.QazaqShell;
  const launched = shell.launch ? null : page.window.TrainerCatalogBridge.launch('vocab:must');
  assert.equal(launched, undefined);
  const epoch = page.session() && page.session().queueEpoch;
  const key = page.window.QazaqShell.key();
  assert.equal(key, 'vocab:must');
  assert.ok(epoch, 'must launched once');
  const q = page.window.QazaqNav;
  page.window.document.getElementById('pause-session').onclick();
  assert.equal(page.window.document.body.dataset.view, 'today');
  assert.equal(page.window.location.hash, '#/lesson');
  const parked = page.window.QazaqShell.resume().slots['vocab:must'];
  assert.equal(parked && parked.status, 'paused');
  const mid = q.pushCount;
  shell.startCourse('1-1');
  assert.equal(page.window.document.body.dataset.view, 'practice', 'real course practice opened');
  assert.equal(page.window.QazaqShell.key(), 'course:1-1', 'N-HISTORY-2 uses a real practice session, not shell.show');
  assert.equal(page.window.location.hash, '#/practice?lesson=1-1');
  assert.equal(q.pushCount, mid + 1, 'real practice is one external hop');
  q.goBack();
  assert.equal(page.window.location.hash, '#/lesson');
  assert.notEqual(page.window.location.hash, '#/words');
  const before = q.pushCount;
  page.window.TrainerCatalogBridge.launch('vocab:must');
  assert.equal(page.session().queueEpoch, epoch, 'Слова restores the parked must');
  assert.ok(q.pushCount <= before + 1, 'restore is one hop, not a second launch');
  const contBefore = q.pushCount;
  const card = page.session().queue[page.session().position];
  const finish = page.window.document.getElementById('vocab-finish');
  if (finish && finish.onclick) finish.onclick();
  const cont = page.window.document.getElementById('vocab-summary-continue');
  if (cont && cont.onclick) cont.onclick();
  assert.equal(q.pushCount, contBefore, 'summary continue does not push');
  assert.equal(page.window.location.hash, '#/words');
  assert.equal(page.session().queue[page.session().position], card);
}
ok('N-HISTORY-2 and summary-continue: pause returns to lesson; Слова keeps the epoch; #/words');

function coursePracticeSession(lessonId){
  const session = JSON.parse(read('fixtures/navigation/practice-mid.json'));
  session.mode = 'course';
  session.topic = 'all';
  session.courseBlock = lessonId;
  session.launchKey = 'course:' + lessonId;
  session.view = 'practice';
  session.sessionOrigin = 'today';
  return session;
}
{
  const session = coursePracticeSession('1-1');
  const page = boot(JSON.stringify({session}), function(win){ win.location.hash = '#/practice?lesson=1-1'; });
  const q = page.window.QazaqNav;
  assert.equal(page.window.QazaqShell.key(), 'course:1-1');
  page.window.TrainerCatalogBridge.launch('vocab:must');
  assert.equal(page.window.location.hash, '#/words');
  assert.equal(page.window.QazaqShell.key(), 'vocab:must');
  assert.equal(q.goBack(), true);
  assert.equal(page.window.location.hash, '#/practice?lesson=1-1');
  assert.equal(page.window.document.body.dataset.view, 'practice');
  assert.equal(page.window.QazaqShell.key(), 'course:1-1');
  assert.equal(page.session().courseBlock, '1-1');
}
ok('N-HISTORY-SESSION-MATCH: words -> Back restores the practice session owned by the route');

{
  const live = coursePracticeSession('2-1');
  const parked = coursePracticeSession('2-2');
  const seed = {
    session: live,
    navigationResume: {
      version: 1,
      lastRoute: 'course:2-2',
      slots: {
        'course:2-2': {status: 'paused', updatedAt: 1, origin: 'test', snapshot: {kind: 'session', session: parked}}
      }
    }
  };
  const page = boot(JSON.stringify(seed), function(win){ win.location.hash = '#/practice?lesson=2-2'; });
  assert.equal(page.window.location.hash, '#/practice?lesson=2-2');
  assert.equal(page.window.document.body.dataset.view, 'practice');
  assert.equal(page.window.QazaqShell.key(), 'course:2-2');
  assert.equal(page.session().courseBlock, '2-2');
  assert.notEqual(page.window.QazaqShell.key(), 'course:2-1');
}
ok('N-ROUTE-SESSION-MISMATCH-COLD: cold lesson route rejects a foreign live queue and restores its parked slot');

function ownedSession(key, patch){
  const session = JSON.parse(read('fixtures/navigation/practice-mid.json'));
  Object.assign(session, {view: 'practice', launchKey: key, answered: false, position: 0}, patch || {});
  return session;
}
function vocabUsedSession(){
  const body = JSON.parse(read('fixtures/navigation/must-first-show.json'));
  const session = JSON.parse(JSON.stringify(body.session));
  session.launchKey = 'vocab:used';
  session.trainerReturn = 'vocab:used';
  session.vocabRole = 'used';
  delete session.vocab;
  return session;
}
function seedWithParked(live, key, parked){
  return {
    session: live,
    navigationResume: {
      version: 1,
      lastRoute: key,
      slots: {[key]: {status: 'paused', updatedAt: 9, origin: 'test-f1', snapshot: {kind: 'session', session: parked}}}
    }
  };
}
function popRoute(page, href, sessionKey){
  const q = page.window.QazaqNav;
  const parsed = q.parse(href).route;
  const state = {qzView: parsed.view, qzNav: {version: 1, route: parsed.href, name: parsed.name, context: parsed.context || {}, origin: null, originAdjacent: false, sessionKey: sessionKey || parsed.sessionKey || null}};
  page.window.history.state = state;
  page.window.location.hash = parsed.href;
  assert.equal(q.onPop({state, stopImmediatePropagation(){}}), true, 'history route claimed: ' + href);
}

{
  const live = ownedSession('homework:1-1:exercises:0', {mode: 'homework', hwLesson: '1-1', hwPart: 'exercises', hwSection: 0, courseBlock: '1-1'});
  const target = ownedSession('homework:2-2:exercises:0', {mode: 'homework', hwLesson: '2-2', hwPart: 'exercises', hwSection: 0, courseBlock: '2-2'});
  const key = target.launchKey;
  const cold = boot(JSON.stringify(seedWithParked(live, key, target)), function(win){ win.location.hash = '#/ready/homework/2-2/session'; });
  assert.equal(cold.window.document.body.dataset.view, 'practice', 'cold homework session restores its own parked queue');
  assert.equal(cold.window.QazaqShell.key(), key);
  cold.saveNow();
  assert.equal(cold.session().hwLesson, '2-2');

  const history = boot(JSON.stringify({session: live}));
  popRoute(history, '#/ready/homework/2-2/session', 'homework:2-2:exercises:0');
  assert.notEqual(history.window.document.body.dataset.view, 'practice', 'history homework route rejects foreign live homework');
  assert.equal(history.window.location.hash, '#/ready');
}
ok('F1-homework: boot restores matching slot; history rejects a foreign homework key');

{
  const preexam = ownedSession('preexam:3-3', {mode: 'course', topic: 'sounds', courseBlock: null});
  const exam = ownedSession('exam:sounds', {mode: 'exam', topic: 'sounds', courseBlock: null});
  const cold = boot(JSON.stringify(seedWithParked(preexam, exam.launchKey, exam)), function(win){ win.location.hash = '#/ready/exam/session'; });
  assert.equal(cold.window.document.body.dataset.view, 'practice');
  assert.equal(cold.window.QazaqShell.key(), 'exam:sounds', 'exam route must not accept preexam:*');

  const history = boot(JSON.stringify({session: preexam}));
  popRoute(history, '#/ready/exam/session', 'exam:sounds');
  assert.notEqual(history.window.document.body.dataset.view, 'practice', 'history exam route rejects live preexam when no exam slot exists');
  assert.equal(history.window.location.hash, '#/ready');
}
ok('F1-exam: exam-session owns exam:* only; preexam:* cannot satisfy it');

{
  const exam = ownedSession('exam:sounds', {mode: 'exam', topic: 'sounds', courseBlock: null});
  const preexam = ownedSession('preexam:3-3', {mode: 'course', topic: 'sounds', courseBlock: null});
  const cold = boot(JSON.stringify(seedWithParked(exam, preexam.launchKey, preexam)), function(win){ win.location.hash = '#/ready/preexam'; });
  assert.equal(cold.window.document.body.dataset.view, 'practice');
  assert.equal(cold.window.QazaqShell.key(), 'preexam:3-3', 'preexam route must not accept exam:*');

  const history = boot(JSON.stringify({session: exam}));
  popRoute(history, '#/ready/preexam', 'preexam:3-3');
  assert.notEqual(history.window.document.body.dataset.view, 'practice', 'history preexam route rejects live exam when no preexam slot exists');
  assert.equal(history.window.location.hash, '#/ready');
}
ok('F1-preexam: preexam route owns preexam:* only; exam:* cannot satisfy it');

{
  const used = vocabUsedSession();
  const href = '#/practices/session?kind=words&id=used';
  const parsed = Nav.parse(href).route;
  assert.equal(parsed.sessionKey, 'vocab:used', 'generic extra reconstructs vocab:used from its URL after F5');
  const cold = boot(JSON.stringify({session: used}), function(win){ win.location.hash = href; });
  assert.equal(cold.window.document.body.dataset.view, 'practice');
  assert.equal(cold.window.QazaqShell.key(), 'vocab:used');
  assert.equal(cold.window.location.hash, href);
}
ok('F1-generic-extra: #/practices/session reconstructs sessionKey and keeps the matching live queue after F5');

{
  const page = boot();
  const q = page.window.QazaqNav;
  const shell = page.window.QazaqShell;
  shell.show('review');
  assert.equal(page.window.document.body.dataset.view, 'review');
  page.window.location.hash = '';
  assert.equal(q.onPop({state: {qzView: 'today'}, stopImmediatePropagation(){}}), true);
  assert.equal(page.window.document.body.dataset.view, 'today');
  assert.equal(page.window.location.hash, '#/lesson');
  shell.show('review');
  assert.equal(page.window.document.body.dataset.view, 'review');
  page.window.location.hash = '';
  assert.equal(q.onPop({state: {qzView: 'practice'}, stopImmediatePropagation(){}}), true);
  assert.equal(page.window.document.body.dataset.view, 'today', 'legacy practice without a live queue falls back to its parent');
  assert.equal(page.window.location.hash, '#/lesson');
}
ok('N-HISTORY-LEGACY-QZVIEW: old qzView entries route today and empty practice instead of becoming dead Back entries');

function morphSitting(){
  const session = Engine.createSession({level: 'harmony', mode: 'learn', responseMode: 'choice', seed: 11, limit: 8});
  session.cursor = 4;
  return session;
}
function seedNav2(win, hash){
  const bag = Object.create(null);
  bag['qazaqsha-nav2-v1'] = JSON.stringify({
    schemaVersion: 2, catalogVersion: 'NAV-2.3-1TO1', migrated: true, bookmarkApplied: true,
    screen: 'lesson', part: 1, lessonId: 'nav2.1.1', homeLessonId: 'nav2.1.1', step: 2, tab: 'learn',
    navBack: [{screen: 'home'}, {screen: 'part'}],
    viewed: {}, log: {}, explained: {}, perLessonCursors: {}, draftAnswers: {}, oldViews: {}
  });
  win.sessionStorage = {
    getItem(k){ return bag[k] == null ? null : bag[k]; },
    setItem(k, v){ bag[k] = String(v); },
    removeItem(k){ delete bag[k]; }
  };
  win.location.hash = hash;
}
{
  const clean = JSON.parse(read('fixtures/navigation/clean.json'));
  clean.morphTrainer.session = morphSitting();
  clean.session = {view: 'morph', mode: 'ordered', topic: 'all', queue: [], position: 0, answered: false};
  const words = boot(JSON.stringify(clean), function(win){ seedNav2(win, '#/words'); });
  assert.notEqual(words.window.document.body.dataset.view, 'morph');
  const saved = JSON.parse(words.window.localStorage.getItem('qazaq-kris-course-v1'));
  assert.equal(saved.morphTrainer.session.cursor, 4);
  const nav2 = JSON.parse(words.window.sessionStorage.getItem('qazaqsha-nav2-v1'));
  assert.equal(nav2.navBack.length, 2);
  const must = JSON.parse(read('fixtures/navigation/must-first-show.json'));
  const lesson = boot(JSON.stringify({session: must.session, morphTrainer: clean.morphTrainer}), function(win){ win.location.hash = '#/lesson'; });
  assert.equal(lesson.window.document.body.dataset.view, 'today');
  assert.notEqual(lesson.window.document.body.dataset.view, 'morph');
  const after = lesson.session();
  assert.equal(after && after.trainerReturn, 'vocab:must');
  assert.equal(after.queueEpoch, must.session.queueEpoch);
  const anchor = boot(JSON.stringify({session: must.session}), function(win){ win.location.hash = '#main'; });
  assert.equal(anchor.window.location.hash, '#main');
  assert.equal(anchor.session().queueEpoch, must.session.queueEpoch);
  assert.notEqual(anchor.window.QazaqNav.parse('#main').kind, 'route');
  const unknown = boot(null, function(win){ win.location.hash = '#/no-such-room'; });
  assert.equal(unknown.window.document.body.dataset.view, 'today');
  assert.equal(unknown.window.location.hash, '#/lesson');
  const note = unknown.window.document.getElementById('route-note');
  assert.equal(note.hidden, false);
  assert.equal(note.textContent, 'Такого адреса нет. Открыт урок.');
  const shown = unknown.window.QazaqNav.sectionPlan(unknown.window.QazaqNav.SECTIONS.map(name => name + '-view'), 'missing');
  assert.equal(shown.length, 1);
  assert.equal(shown[0], 'today-view');
}
ok('N-HISTORY-6: #main is not a route; explicit URL beats morph; unknown keeps one section');

{
  const mid = JSON.parse(read('fixtures/navigation/practice-mid.json'));
  let browser = null;
  const page = boot(JSON.stringify({session: mid}), function(win){
    const entries = [{href: '', state: null}];
    let pos = 0;
    win.location.hash = '';
    win.history = {
      get state(){ return entries[pos] ? entries[pos].state : null; },
      get length(){ return entries.length; },
      pushState(state, title, href){
        const url = href || win.location.hash;
        entries.splice(pos + 1);
        entries.push({href: url, state});
        pos = entries.length - 1;
        win.location.hash = url;
      },
      replaceState(state, title, href){
        const url = href || (entries[pos] && entries[pos].href) || win.location.hash;
        entries[pos] = {href: url, state};
        win.location.hash = url;
      },
      back(){
        if (pos <= 0) return;
        pos -= 1;
        win.location.hash = entries[pos].href;
        win.dispatchEvent({type: 'popstate', state: entries[pos].state, stopImmediatePropagation(){}});
      },
      forward(){
        if (pos >= entries.length - 1) return;
        pos += 1;
        win.location.hash = entries[pos].href;
        win.dispatchEvent({type: 'popstate', state: entries[pos].state, stopImmediatePropagation(){}});
      }
    };
    browser = {entries, get pos(){ return pos; }};
  });
  assert.equal(page.window.document.body.dataset.view, 'practice');
  assert.equal(page.window.location.hash, '#/practice');
  const before = page.session();
  assert.ok(before && before.queueEpoch, 'practice-mid is live');
  const main = page.window.document.getElementById('main');
  main.focus = function(){ page.window.document.activeElement = main; };
  page.window.history.pushState(null, '', '#main');
  main.focus();
  assert.equal(page.window.location.hash, '#main');
  assert.equal(page.window.document.activeElement, main);
  page.window.history.back();
  assert.equal(page.window.location.hash, '#/practice');
  assert.equal(page.window.document.body.dataset.view, 'practice');
  let after = page.session();
  assert.equal(after.queueEpoch, before.queueEpoch);
  assert.equal(after.position, before.position);
  assert.deepEqual(after.queue, before.queue);
  page.window.history.forward();
  assert.equal(page.window.location.hash, '#main');
  assert.equal(page.window.document.activeElement, main);
  after = page.session();
  assert.equal(after.queueEpoch, before.queueEpoch);
  assert.equal(after.position, before.position);
  assert.deepEqual(after.queue, before.queue);
  assert.equal(browser.entries.length, 2, 'anchor adds one browser entry only');
}
ok('N-HISTORY-5: practice -> #main -> Back/Forward keeps queueEpoch, position, queue and main focus');

function flush(){ return new Promise(function(resolve){ setTimeout(resolve, 0); }); }
function installAsyncHistory(){
  const entries = [{href: '', state: null}];
  let pos = 0;
  const loc = {hash: ''};
  global.location = loc;
  global.history = {
    get state(){ return entries[pos] ? entries[pos].state : null; },
    get length(){ return entries.length; },
    pushState(state, title, href){
      const url = href || loc.hash;
      entries.splice(pos + 1);
      entries.push({href: url, state: state});
      pos = entries.length - 1;
      loc.hash = url;
    },
    replaceState(state, title, href){
      const url = href || (entries[pos] && entries[pos].href) || loc.hash;
      entries[pos] = {href: url, state: state};
      loc.hash = url;
    },
    back(){
      const target = Math.max(0, pos - 1);
      setTimeout(function(){
        pos = target;
        loc.hash = entries[pos].href;
        Nav.onPop({state: entries[pos].state, stopImmediatePropagation(){}});
      }, 0);
    },
    forward(){
      const target = Math.min(entries.length - 1, pos + 1);
      setTimeout(function(){
        pos = target;
        loc.hash = entries[pos].href;
        Nav.onPop({state: entries[pos].state, stopImmediatePropagation(){}});
      }, 0);
    }
  };
  return {
    hrefs(){ return entries.map(function(entry){ return entry.href; }); },
    pos(){ return pos; },
    length(){ return entries.length; }
  };
}
function lessonDupes(hrefs){
  for (let i = 1; i < hrefs.length; i += 1) {
    if (hrefs[i] === '#/lesson' && hrefs[i - 1] === '#/lesson') return true;
  }
  return false;
}

{
  const must = JSON.parse(read('fixtures/navigation/must-first-show.json'));
  const page = boot(JSON.stringify({session: must.session}), function(win){ win.location.hash = '#/words'; });
  const q = page.window.QazaqNav;
  assert.equal(page.window.document.body.dataset.view, 'practice');
  assert.deepEqual(Array.from(q.stack(), function(item){ return item.href; }), ['#/words']);
  const beforePush = q.pushCount;
  const pause = q.pauseReturn();
  assert.equal(pause.how, 'push', 'cold/F5 session with unknown adjacency uses safe push fallback');
  page.window.document.getElementById('pause-session').onclick();
  assert.equal(page.window.location.hash, '#/lesson');
  assert.equal(page.window.document.body.dataset.view, 'today');
  assert.equal(q.pushCount, beforePush + 1, 'fallback pause is a push, not replace');
  assert.deepEqual(Array.from(q.stack(), function(item){ return item.href; }), ['#/words', '#/lesson']);
}
ok('N-HISTORY-PAUSE-FALLBACK-PUSH: unknown adjacency preserves the session entry by pushing its parent');

(async function(){
  try {
    Nav.resetTrace();
    const hist = installAsyncHistory();
    assert.equal(Nav.commit({view: 'today', source: 'boot', route: Nav.lessonHome()}).pushed, false);
    assert.equal(Nav.commit({view: 'practice', source: 'user', route: Nav.parse('#/words').route}).pushed, true);
    const beforePause = hist.hrefs().slice();
    const beforePos = hist.pos();
    const beforeLen = hist.length();
    const pushes = Nav.pushCount;
    console.log('D1-TRACE before pause ' + JSON.stringify(beforePause) + ' pos ' + beforePos);
    assert.equal(Nav.goBack(), true);
    assert.deepEqual(hist.hrefs(), beforePause, 'replaceState must not rewrite the words entry in the same tick as back()');
    assert.equal(hist.pos(), beforePos);
    await flush();
    console.log('D1-TRACE after pause ' + JSON.stringify(hist.hrefs()) + ' pos ' + hist.pos());
    assert.equal(hist.length(), beforeLen, 'pause does not grow history.length');
    assert.equal(Nav.pushCount, pushes, 'pause pushCount stays 0');
    assert.equal(hist.hrefs()[hist.pos()], '#/lesson');
    assert.equal(hist.hrefs()[hist.pos() + 1], '#/words');
    assert.equal(lessonDupes(hist.hrefs()), false);
    assert.equal(Nav.goForward(), true);
    assert.equal(hist.hrefs()[0], '#/lesson', 'forward must not rewrite the lesson entry in the same tick');
    await flush();
    assert.equal(hist.hrefs()[hist.pos()], '#/words');
    assert.equal(hist.hrefs()[hist.pos() - 1], '#/lesson');
    assert.equal(Nav.goBack(), true);
    await flush();
    assert.equal(hist.hrefs()[hist.pos()], '#/lesson');
    assert.equal(hist.hrefs()[hist.pos() + 1], '#/words');
    assert.equal(Nav.goForward(), true);
    await flush();
    assert.equal(hist.hrefs()[hist.pos()], '#/words');
    assert.equal(Nav.goBack(), true);
    await flush();
    assert.equal(hist.hrefs()[hist.pos()], '#/lesson');
    assert.equal(hist.hrefs()[hist.pos() + 1], '#/words');
    assert.equal(lessonDupes(hist.hrefs()), false);
    assert.equal(hist.length(), beforeLen);
    assert.equal(Nav.pushCount, pushes);
    ok('N-HISTORY-PAUSE-FWD async back/forward keeps #/words at index+1');

    Nav.resetTrace();
    const reloadHist = installAsyncHistory();
    assert.equal(Nav.commit({view: 'today', source: 'boot', route: Nav.lessonHome()}).pushed, false);
    assert.equal(Nav.commit({view: 'practice', source: 'user', route: Nav.parse('#/words').route}).pushed, true);
    assert.equal(global.history.state.qzNav.origin.href, '#/lesson');
    assert.equal(global.history.state.qzNav.originAdjacent, true);
    const reloadStack = reloadHist.hrefs().slice();
    Nav.resetTrace();
    assert.equal(Nav.commit({view: 'practice', source: 'boot', route: Nav.parse('#/words').route}).pushed, false);
    assert.deepEqual(Nav.stack().map(function(item){ return item.href; }), ['#/lesson', '#/words']);
    const pauseAfterReload = Nav.pauseReturn();
    assert.equal(pauseAfterReload.how, 'back');
    assert.equal(Nav.goBack(), true);
    await flush();
    assert.equal(reloadHist.hrefs()[reloadHist.pos()], '#/lesson');
    assert.equal(reloadHist.hrefs()[reloadHist.pos() + 1], '#/words');
    assert.deepEqual(reloadHist.hrefs(), reloadStack);
    assert.equal(lessonDupes(reloadHist.hrefs()), false);
    assert.equal(Nav.goForward(), true);
    await flush();
    assert.equal(reloadHist.hrefs()[reloadHist.pos()], '#/words');
    ok('N-HISTORY-PAUSE-F5 reload reconstructs adjacent origin; pause uses Back and Forward keeps #/words');

    Nav.resetTrace();
    const live = installAsyncHistory();
    const note = {hidden: true, textContent: ''};
    global.document = {getElementById(id){ return id === 'route-note' ? note : null; }};
    Nav.commit({view: 'today', source: 'boot', route: Nav.lessonHome()});
    Nav.commit({view: 'practice', source: 'user', route: Nav.parse('#/words').route});
    const stamped = Nav.pushCount;
    global.history.pushState(null, '', '#/no-such-room');
    Nav.onPop({state: null, stopImmediatePropagation(){}});
    Nav.onHash();
    assert.equal(global.location.hash, '#/lesson');
    assert.equal(note.hidden, false);
    assert.equal(note.textContent, 'Такого адреса нет. Открыт урок.');
    assert.equal(Nav.pushCount, stamped);
    assert.equal(Nav.stack().pop().href, '#/lesson');
    assert.equal(live.hrefs()[live.pos()], '#/lesson');
    assert.equal(live.hrefs().indexOf('#/no-such-room'), -1);
    assert.equal(live.hrefs()[live.pos() - 1], '#/words');
    Nav.commit({view: 'today', source: 'user', route: Nav.parse('#/library').route});
    assert.equal(note.hidden, true, '#route-note hides on the next hop');
    ok('N-ROUTE-UNKNOWN-LIVE typed unknown hash replaces onto the lesson');

    const page = boot();
    const shell = page.window.QazaqShell;
    const q = page.window.QazaqNav;
    shell.show('personal');
    assert.equal(page.window.location.hash, '#/practices');
    const box = page.window.document.getElementById('pref-letters');
    box.checked = false;
    box.onchange();
    shell.show('today');
    shell.show('personal');
    assert.equal(page.window.location.hash, '#/practices');
    assert.ok(page.window.document.getElementById('personal-content').innerHTML.includes('<h2>Тренажёры</h2>'));
    page.window.PersonalTrainers.openTrainer('harmony_letters');
    assert.equal(page.window.location.hash, '#/practices/letters');
    assert.ok(page.window.document.getElementById('personal-content').innerHTML.includes('Твёрдые / мягкие звуки'));
    assert.equal(q.goBack(), true);
    assert.equal(page.window.location.hash, '#/practices');
    assert.ok(page.window.document.getElementById('personal-content').innerHTML.includes('<h2>Тренажёры</h2>'));
    assert.equal(q.goForward(), true);
    assert.equal(page.window.location.hash, '#/practices/letters');
    assert.ok(page.window.document.getElementById('personal-content').innerHTML.includes('Твёрдые / мягкие звуки'));
    const cold = boot(null, function(win){ win.location.hash = '#/practices/letters'; });
    assert.equal(cold.window.location.hash, '#/practices/letters');
    assert.equal(cold.window.document.body.dataset.view, 'personal');
    assert.ok(cold.window.document.getElementById('personal-content').innerHTML.includes('Твёрдые / мягкие звуки'));
    assert.equal(cold.window.document.getElementById('personal-content').innerHTML.includes('<h2>Тренажёры</h2>'), false);
    const numbers = boot(null, function(win){ win.location.hash = '#/practices/numbers'; });
    assert.equal(numbers.window.location.hash, '#/practices/numbers');
    assert.equal(numbers.window.document.body.dataset.view, 'personal');
    assert.ok(numbers.window.document.getElementById('personal-content').innerHTML.includes('Лестница чисел'));
    assert.equal(numbers.window.document.getElementById('personal-content').innerHTML.includes('<h2>Тренажёры</h2>'), false);
    ok('N-ROUTE-PRACTICES-TAB / F6: hub, cold letters/numbers and Back/Forward render the addressed personal screen');

    console.log('verify_navigation_history: ' + passed + ' checks passed');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
