const fs = require('fs');
const assert = require('assert');
const {spawnSync} = require('child_process');

const sw = fs.readFileSync('sw.js', 'utf8');
const install = sw.split("addEventListener('activate'")[0].split("addEventListener('install'")[1];
const message = sw.split("addEventListener('fetch'")[0].split("addEventListener('message'")[1];
assert.ok(install && !install.includes('skipWaiting'), 'install handler must not skipWaiting');
assert.ok(message.includes("ACTIVATE_UPDATE") && message.includes('skipWaiting'), 'ACTIVATE_UPDATE must skipWaiting');
assert.ok(sw.includes('clients.claim()'), 'activate must keep clients.claim()');
assert.ok(sw.includes("CACHE='qazaq-offline-live-20261010-nav01'"), 'cache name');
assert.equal((sw.match(/skipWaiting/g) || []).length, 1);

const py = process.env.PYTHON || 'python';
const probe = spawnSync(py, ['-c', 'import playwright'], { encoding: 'utf8' });
if (probe.status !== 0) {
  console.log('N-PWA browser NOT_RUN: python playwright is not installed here');
  console.log('VERIFY_NAV01_PWA_OK');
  process.exit(0);
}
const child = spawnSync(py, ['-u', 'tools/nav01_pwa_browser.py'], {
  cwd: __dirname,
  stdio: 'inherit',
  timeout: 360000,
  env: process.env,
});
if (child.error) {
  console.error(child.error);
  process.exit(1);
}
if (child.status !== 0) process.exit(child.status == null ? 1 : child.status);
