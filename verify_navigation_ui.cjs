'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const BASE = '0dab333adac7c95c2dd486b85eaaf1c20cff6f5f';
const ROOT = __dirname;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function lineOf(text, needle) {
  const at = text.indexOf(needle);
  assert.ok(at >= 0, needle);
  return text.slice(0, at).split('\n').length;
}
function git(args) {
  return execFileSync('git', args, {cwd: ROOT, encoding: 'utf8'}).replace(/\r\n/g, '\n').trim();
}

const html = read('index.html');
const viewIds = [...html.matchAll(/id="([a-z0-9-]+-view)"/g)].map(m => m[1]);
assert.deepEqual(viewIds, [
  'today-view',
  'review-view',
  'vocabulary-view',
  'learn-view',
  'morph-view',
  'personal-view',
  'practice-view',
  'homework-view',
  'path-view',
  'exam-view',
  'rules-view',
  'materials-view'
]);
for (const id of ['today-view', 'practice-view', 'morph-view']) assert.ok(viewIds.includes(id), id);
console.log('VIEW_IDS', viewIds.join(','));

const bottom = html.match(/<nav class="bottom-nav" aria-label="Основная навигация">([\s\S]*?)<\/nav>/);
const top = html.match(/<nav class="topnav" aria-label="Разделы">([\s\S]*?)<\/nav>/);
function navLabels(fragment) {
  return [...fragment.matchAll(/<button\b([^>]*)>([^<]+)<\/button>/g)].map(m => {
    const view = m[1].match(/data-view="([^"]+)"/);
    return {view: view && view[1], label: m[2]};
  });
}
const bottomLabels = navLabels(bottom[1]);
const topLabels = navLabels(top[1]);
assert.deepEqual(bottomLabels, [
  {view: 'today', label: 'Учёба'},
  {view: 'morph', label: 'Форма слова'},
  {view: 'personal', label: 'Тренажёры'}
]);
assert.deepEqual(topLabels, bottomLabels);
console.log('BOTTOM_NAV', bottomLabels.map(item => item.label).join(' / '));
console.log('EXPECTED_LATER NAV-08 future 4-item menu Урок / Слова / Практика / Форма слова is not a failing requirement on this baseline');
assert.equal(html.includes('fixtures/navigation'), false);

const theme = read('theme-redesign.css');
const mobile = '@media(max-width:690px){';
const practiceHeader = 'body[data-view=practice] .topbar{display:none}';
const practiceMenu = 'body[data-view=practice] .bottom-nav{display:none!important}';
const headerAt = theme.indexOf(practiceHeader);
const menuAt = theme.indexOf(practiceMenu);
const mobileAt = theme.lastIndexOf(mobile, headerAt);
assert.ok(mobileAt >= 0, mobile);
assert.ok(headerAt > mobileAt && menuAt > headerAt);
assert.equal(theme.slice(mobileAt + mobile.length, headerAt).includes('@media'), false);
assert.equal(theme.slice(mobileAt + mobile.length, menuAt).includes('@media'), false);
const pathNav = 'body.path-immersive .bottom-nav{display:none!important}';
const pathAt = theme.indexOf(pathNav);
assert.ok(pathAt >= 0);
console.log('CSS_LINE theme-redesign.css', lineOf(theme, practiceHeader), practiceHeader);
console.log('CSS_LINE theme-redesign.css', lineOf(theme, practiceMenu), practiceMenu);
console.log('CSS_LINE theme-redesign.css', lineOf(theme, pathNav), pathNav);

const morph = read('morph.css');
const morphSession = 'body[data-morph-immersive="1"] .bottom-nav{display:none}';
assert.ok(morph.includes(morphSession));
console.log('CSS_LINE morph.css', lineOf(morph, morphSession), morphSession);

const tokens = read('design-tokens.css');
assert.ok(tokens.includes('#FF5A1F'));
assert.equal(git(['diff', '--name-only', BASE, '--', 'design-tokens.css']), '');
assert.equal(git(['diff', '--name-only', BASE, '--', 'theme-redesign.css', 'morph.css']), '');
assert.match(html, /id="today-view"/);
assert.match(html, /id="practice-view"/);
assert.match(html, /id="morph-view"/);
assert.match(html, /<nav class="bottom-nav"/);
console.log('PALETTE #FF5A1F still in design-tokens.css; index.html is checked by structure, not a frozen diff');
console.log('VERIFY_NAVIGATION_UI_OK');
