'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
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
const ids = Nav.SECTIONS.map(name => name + '-view');
for (const view of Nav.SECTIONS) assert.deepEqual(Nav.sectionPlan(ids, view), [view + '-view']);
assert.deepEqual(Nav.sectionPlan(ids, 'library'), ['today-view']);
assert.equal(Nav.sectionPlan(ids, 'settings').length, 1);
assert.equal(Nav.sectionPlan([], 'library').length, 0);
ok('registry: ready routes, homework ids, anchor, unknown, one section');

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
  assert.equal(Object.prototype.hasOwnProperty.call(packed, 'nav2'), false);
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
  let stopped = 0;
  const internal = {state: {nav2: 1}, stopImmediatePropagation(){ stopped += 1; }};
  assert.equal(Nav.onPop(internal), false);
  assert.equal(stopped, 0);
  const fs2 = {state: {fs2: {id: 'a', part: 1}}, stopImmediatePropagation(){ stopped += 1; }};
  assert.equal(Nav.onPop(fs2), false);
  assert.equal(stopped, 0);
  const external = {state: {qzNav: {route: '#/library'}}, stopImmediatePropagation(){ stopped += 1; }};
  assert.equal(Nav.onPop(external), true);
  assert.equal(stopped, 1);
  assert.equal(Nav.claimed(external), true);
  const anchor = {state: null, stopImmediatePropagation(){ stopped += 1; }};
  const prev = global.location;
  global.location = {hash: '#main'};
  assert.equal(Nav.onPop(anchor), true);
  global.location = prev;
  assert.equal(Nav.claimed(anchor), true);
  assert.ok(read('navigation.js').includes("addEventListener('popstate',onPop,true)"), 'capture guard is registered');
  assert.equal(read('navigation.js').includes('history.pushState=') || read('navigation.js').includes('History.prototype'), false);
}
ok('N-HISTORY-4 capture guard leaves nav2/fs2 and stops an external pop');

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
  shell.show('practice');
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
ok('N-HISTORY-5 and N-HISTORY-6: #main is not a route; explicit URL beats morph; unknown keeps one section');

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
    shell.show('personal');
    assert.equal(page.window.location.hash, '#/practices');
    const box = page.window.document.getElementById('pref-letters');
    box.checked = false;
    box.onchange();
    shell.show('today');
    shell.show('personal');
    assert.equal(page.window.location.hash, '#/practices');
    page.window.PersonalTrainers.openTrainer('harmony_letters');
    assert.equal(page.window.location.hash, '#/practices/letters');
    const cold = boot(null, function(win){ win.location.hash = '#/practices/letters'; });
    assert.equal(cold.window.location.hash, '#/practices/letters');
    assert.equal(cold.window.document.body.dataset.view, 'personal');
    ok('N-ROUTE-PRACTICES-TAB hub stays #/practices; explicit letters keep their address');

    console.log('verify_navigation_history: ' + passed + ' checks passed');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
