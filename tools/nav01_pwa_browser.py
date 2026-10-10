#!/usr/bin/env python3
"""Headless Chromium checks for NAV-01. Spawned by verify_nav01_pwa.cjs.

Serves build A (old skipWaiting + old pwa.js) and build B (this worktree)
on one http://127.0.0.1 origin. Does not attach to port 9222 or 9223.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
CHROME = Path(r"C:\Users\1\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe")
OLD_CACHE = "qazaq-offline-live-20261007-section2-2"
NEW_CACHE = "qazaq-offline-live-20261010-nav01"
BASE_REV = "0dab333"
SAVED = "Учебные материалы сохранены для работы без сети. Внешние оригиналы открываются с интернетом."
PENDING = "Новая версия уже активирована. Эта вкладка не перезагружена, чтобы не потерять активный ввод. Нажми «Сохранить ответ и обновить приложение», когда будет удобно."
AVAILABLE = "Доступна новая версия. Эта вкладка не будет перезагружена сама. Нажми «Сохранить ответ и обновить приложение», когда будет удобно."
BLOCKED = "Обновление не применено: сохранить активные данные в браузере не удалось. Экспортируй прогресс перед перезагрузкой."

ROOT = {"path": ""}
ROOT_FILE: Path | None = None
MISSES: list[str] = []
OPENSSL = Path(r"C:\Program Files\Git\usr\bin\openssl.exe")
MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
}

INIT = r"""
(() => {
  function bump(key) {
    try {
      const n = Number(sessionStorage.getItem(key) || '0') + 1;
      sessionStorage.setItem(key, String(n));
      return n;
    } catch (e) {
      let stored = 0;
      try { stored = Number(sessionStorage.getItem(key) || '0'); } catch (e2) {}
      window[key] = Math.max(Number(window[key] || 0), Number.isFinite(stored) ? stored : 0) + 1;
      return window[key];
    }
  }
  bump('__navLoads');
  window.addEventListener('qazaq-before-update', () => { bump('__navBefore'); });
  try {
    const orig = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function(data) {
      try {
        if (data && data.type === 'ACTIVATE_UPDATE') bump('__navActivate');
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  } catch (e) {}
  try {
    const reload = Location.prototype.reload;
    Location.prototype.reload = function() {
      try { bump('__navReloadCalls'); } catch (e) {}
      console.error('NAV01_RELOAD_CALLED');
      return reload.apply(this, arguments);
    };
  } catch (e) {}
})();
"""


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self._serve(False)

    def do_HEAD(self):
        self._serve(True)

    def log_message(self, fmt, *args):
        return

    def _serve(self, head: bool) -> None:
        rel = unquote(urlparse(self.path).path)
        if rel in ("", "/"):
            rel = "/index.html"
        elif rel.rstrip("/") == "/update":
            rel = "/update.html"
        rel = rel.lstrip("/")
        root = os.path.abspath(ROOT["path"])
        full = os.path.abspath(os.path.join(root, rel.replace("/", os.sep)))
        root_key = os.path.normcase(root)
        full_key = os.path.normcase(full)
        if full_key != root_key and not full_key.startswith(root_key + os.sep):
            self.send_error(403)
            return
        if not os.path.isfile(full):
            if not rel.endswith("favicon.ico"):
                MISSES.append(rel)
            self.send_error(404)
            return
        data = b"" if head else Path(full).read_bytes()
        size = os.path.getsize(full) if head else len(data)
        ctype = MIME.get(Path(full).suffix.lower(), "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.close_connection = True
        self.end_headers()
        if not head:
            self.wfile.write(data)


def git_bytes(spec: str) -> bytes:
    return subprocess.check_output(["git", "show", spec], cwd=REPO)


def prepare_a() -> Path:
    dst = Path(tempfile.mkdtemp(prefix="nav01-a-"))
    proc = subprocess.run(
        ["robocopy", str(REPO), str(dst), "/E", "/XD", ".git", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"],
        check=False,
    )
    if proc.returncode >= 8:
        raise SystemExit(f"robocopy failed: {proc.returncode}")
    sw = git_bytes(f"{BASE_REV}:sw.js")
    pwa = git_bytes(f"{BASE_REV}:pwa.js")
    sw_text = sw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
    pwa_text = pwa.decode("utf-8")
    if OLD_CACHE not in sw_text or "await self.skipWaiting()" not in sw_text:
        raise SystemExit("base sw.js is not the old skipWaiting build")
    if "controllerKnown" in pwa_text or "location.reload()" not in pwa_text:
        raise SystemExit("base pwa.js is not the old always-reload build")
    sw_text = sw_text.replace(
        "if(!response.ok||response.redirected||response.type==='opaque')throw Error('Asset unavailable '+asset+' status='+response.status+' redirected='+response.redirected);\n",
        "if(!response.ok||response.redirected||response.type==='opaque')throw Error('Asset unavailable '+asset+' status='+response.status+' redirected='+response.redirected);\n   await response.clone().arrayBuffer();\n",
        1,
    )
    if "await response.clone().arrayBuffer()" not in sw_text or "await self.skipWaiting()" not in sw_text:
        raise SystemExit("could not keep old skipWaiting while draining install bodies")
    (dst / "sw.js").write_text(sw_text, encoding="utf-8", newline="\n")
    (dst / "pwa.js").write_bytes(pwa)
    return dst


def num(page, key: str) -> int:
    return page.evaluate(
        """(key) => {
          let stored = 0;
          try { stored = Number(sessionStorage.getItem(key) || '0'); } catch (e) {}
          const mem = Number(window[key] || 0);
          return Math.max(Number.isFinite(stored) ? stored : 0, Number.isFinite(mem) ? mem : 0);
        }""",
        key,
    )


def answer_events(page) -> int:
    return page.evaluate(
        """() => {
          try {
            const raw = localStorage.getItem('qazaq-kris-course-v1');
            if (!raw) return 0;
            const state = JSON.parse(raw);
            return (state.events || []).filter((e) => e && e.type === 'answer').length;
          } catch (e) { return -1; }
        }"""
    )


def caches(page) -> list[str]:
    return page.evaluate("async () => await caches.keys()")


def status_text(page) -> str:
    return page.evaluate("() => (document.getElementById('offline-status') || {}).textContent || ''")


def stable(page, seconds=1.2) -> dict:
    last = None
    same = 0
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            info = page.evaluate(
                """() => ({
                  loads: Number(sessionStorage.getItem('__navLoads') || '0'),
                  controlled: !!navigator.serviceWorker.controller,
                  hidden: !!(document.getElementById('update-app') || {}).hidden,
                  status: (document.getElementById('offline-status') || {}).textContent || ''
                })"""
            )
        except Exception:
            last = None
            same = 0
            page.wait_for_timeout(250)
            continue
        if info["controlled"] and info["loads"] == last:
            same += 1
            if same >= 3:
                page.wait_for_timeout(int(seconds * 1000))
                again = num(page, "__navLoads")
                if again == info["loads"]:
                    info["loads"] = again
                    return info
                last = again
                same = 0
                continue
        else:
            same = 0
            last = info["loads"] if info["controlled"] else None
        page.wait_for_timeout(300)
    raise AssertionError("page did not settle: " + str(last))


def wait_waiting(page) -> None:
    deadline = time.time() + 50
    last = ""
    while time.time() < deadline:
        try:
            state = page.evaluate(
                """async () => {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg) await reg.update();
                  const waiting = reg && reg.waiting;
                  return waiting ? waiting.state : '';
                }"""
            )
        except Exception as exc:
            last = str(exc)
            page.wait_for_timeout(400)
            continue
        if state == "installed":
            return
        last = state or last
        page.wait_for_timeout(400)
    raise AssertionError("reg.waiting did not reach installed (" + last + ")")


def set_root(path: Path) -> None:
    ROOT["path"] = str(path)
    if ROOT_FILE is None:
        return
    tmp = ROOT_FILE.with_suffix(".tmp")
    tmp.write_text(str(path), encoding="utf-8")
    os.replace(tmp, ROOT_FILE)


def boot(context, root: Path, base: str):
    set_root(path=root)
    page = context.new_page()
    page.goto(base, wait_until="domcontentloaded")
    page.wait_for_selector("#today-view", timeout=60000)
    return page


def arm_new_pwa(page, b_root: Path):
    """Old worker stays in control. Reload once so the document runs new pwa.js while B waits."""
    set_root(b_root)
    wait_waiting(page)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_function(
        """(text) => (document.getElementById('offline-status') || {}).textContent === text""",
        arg=AVAILABLE,
        timeout=60000,
    )
    panels = page.evaluate(
        """() => {
          const panel = document.getElementById('installation-panel');
          const data = document.getElementById('data-settings');
          const btn = document.getElementById('update-app');
          return {
            panelOpen: !!(panel && panel.open),
            dataOpen: !!(data && data.open),
            hidden: !btn || btn.hidden
          };
        }"""
    )
    if panels["panelOpen"] or panels["dataOpen"]:
        raise AssertionError("waiting UI opened installation panels: " + str(panels))
    if panels["hidden"]:
        raise AssertionError("update button stayed hidden while a worker is waiting")
    freeze_updates(page)
    return page


def freeze_updates(page) -> None:
    page.evaluate(
        """async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) return;
          reg.update = () => Promise.resolve(reg);
        }"""
    )


def js_click_update(page) -> None:
    page.evaluate(
        """() => {
          const btn = document.getElementById('update-app');
          if (!btn || btn.hidden) throw new Error('update button is not available');
          btn.click();
        }"""
    )


def wait_loads(page, target: int, timeout_s: float = 60) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            if num(page, "__navLoads") >= target:
                return
        except Exception:
            pass
        page.wait_for_timeout(400)
    info = page.evaluate(
        """async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          return {
            loads: Number(sessionStorage.getItem('__navLoads') || '0'),
            before: Number(sessionStorage.getItem('__navBefore') || '0'),
            activate: Number(sessionStorage.getItem('__navActivate') || '0'),
            status: (document.getElementById('offline-status') || {}).textContent || '',
            hidden: (document.getElementById('update-app') || {}).hidden,
            waiting: reg && reg.waiting ? reg.waiting.state : '',
            active: reg && reg.active ? reg.active.state : ''
          };
        }"""
    )
    raise AssertionError(f"loads did not reach {target}: {info}")


def shell_back(page) -> None:
    page.wait_for_selector("#today-view", timeout=60000)
    title = page.locator("#today-title").text_content() or ""
    if "Сегодня" not in title:
        raise AssertionError("trainer shell did not paint: " + title)
    if not page.evaluate("() => !!navigator.serviceWorker.controller"):
        raise AssertionError("reloaded page has no controller")


def scenario_03(browser, base: str, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    try:
        page = boot(context, b_root, base)
        info = stable(page)
        if info["loads"] != 1:
            raise AssertionError(f"load count {info['loads']} on first B load")
        if not info["controlled"]:
            raise AssertionError("controller stayed null")
        if not info["hidden"]:
            raise AssertionError("update button visible on first control")
        if SAVED not in info["status"]:
            raise AssertionError("status after first control: " + info["status"])
        page.wait_for_timeout(1000)
        if num(page, "__navLoads") != 1:
            raise AssertionError("second load after first control")
    finally:
        context.close()


def scenario_04(browser, base: str, a_root: Path, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    try:
        page = boot(context, a_root, base)
        stable(page)
        arm_new_pwa(page, b_root)
        before = num(page, "__navBefore")
        activate = num(page, "__navActivate")
        loads = num(page, "__navLoads")
        js_click_update(page)
        page.wait_for_function(
            """(n) => Number(sessionStorage.getItem('__navLoads') || '0') >= n""",
            arg=loads + 1,
            timeout=60000,
        )
        shell_back(page)
        page.wait_for_timeout(1200)
        if num(page, "__navLoads") != loads + 1:
            raise AssertionError(f"loads {num(page, '__navLoads')} wanted {loads + 1}")
        if num(page, "__navBefore") != before + 1:
            raise AssertionError(f"qazaq-before-update x{num(page, '__navBefore') - before}")
        if num(page, "__navActivate") != activate + 1:
            raise AssertionError(f"ACTIVATE_UPDATE x{num(page, '__navActivate') - activate}")
        keys = caches(page)
        if NEW_CACHE not in keys or OLD_CACHE in keys:
            raise AssertionError("caches after update: " + ", ".join(keys))
    finally:
        context.close()


def scenario_01(browser, base: str, a_root: Path, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    context.on("serviceworker", lambda sw: sw.on("console", lambda m: print("SWC", m.text[:200], flush=True)))
    try:
        page_a = boot(context, a_root, base)
        stable(page_a)
        arm_new_pwa(page_a, b_root)
        page_b = context.new_page()
        page_b.goto(base, wait_until="domcontentloaded")
        page_b.wait_for_function(
            """(text) => (document.getElementById('offline-status') || {}).textContent === text""",
            arg=AVAILABLE,
            timeout=60000,
        )
        freeze_updates(page_b)
        page_b.evaluate(
            """() => {
              document.documentElement.dataset.navTab = 'b';
              const note = document.getElementById('issue-note');
              if (note) note.value = 'вкладка-б-черновик';
            }"""
        )
        loads_a = num(page_a, "__navLoads")
        loads_b = num(page_b, "__navLoads")
        before_a = num(page_a, "__navBefore")
        activate_a = num(page_a, "__navActivate")
        try:
            with page_a.expect_event("load", timeout=20000):
                js_click_update(page_a)
        except Exception as exc:
            return "NOT_RUN tab A did not navigate after update with a second Playwright page open (" + str(exc).split("\n")[0] + ")"
        page_b.wait_for_function(
            """(text) => (document.getElementById('offline-status') || {}).textContent === text""",
            arg=PENDING,
            timeout=15000,
        )
        page_a.wait_for_timeout(800)
        page_b.wait_for_timeout(400)
        if num(page_a, "__navLoads") != loads_a + 1:
            raise AssertionError(f"tab A loads {num(page_a, '__navLoads')} wanted {loads_a + 1}")
        if num(page_b, "__navLoads") != loads_b:
            raise AssertionError(f"tab B reloaded to {num(page_b, '__navLoads')} from {loads_b}")
        if status_text(page_b) != PENDING:
            raise AssertionError("tab B status: " + status_text(page_b))
        alive = page_b.evaluate(
            """() => ({
              tab: document.documentElement.dataset.navTab || '',
              note: (document.getElementById('issue-note') || {}).value || ''
            })"""
        )
        if alive["tab"] != "b" or alive["note"] != "вкладка-б-черновик":
            raise AssertionError("tab B DOM was replaced: " + str(alive))
        if num(page_a, "__navBefore") != before_a + 1:
            raise AssertionError("tab A before-update count")
        if num(page_a, "__navActivate") != activate_a + 1:
            raise AssertionError("tab A ACTIVATE_UPDATE count")
        before_b = num(page_b, "__navBefore")
        activate_b = num(page_b, "__navActivate")
        js_click_update(page_b)
        page_b.wait_for_function(
            """(n) => Number(sessionStorage.getItem('__navLoads') || '0') >= n""",
            arg=loads_b + 1,
            timeout=60000,
        )
        shell_back(page_b)
        page_b.wait_for_timeout(800)
        if num(page_b, "__navLoads") != loads_b + 1:
            raise AssertionError(f"tab B second click loads {num(page_b, '__navLoads')}")
        if num(page_b, "__navBefore") != before_b + 1:
            raise AssertionError(f"tab B before-update x{num(page_b, '__navBefore') - before_b}")
        if num(page_b, "__navActivate") != activate_b:
            raise AssertionError("tab B posted ACTIVATE_UPDATE again")
    finally:
        context.close()


def scenario_06(browser, base: str, a_root: Path, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    try:
        page = boot(context, a_root, base)
        stable(page)
        arm_new_pwa(page, b_root)
        page.evaluate(
            """() => {
              Storage.prototype.setItem = function() {
                throw new DOMException('quota', 'QuotaExceededError');
              };
            }"""
        )
        loads = num(page, "__navLoads")
        before = num(page, "__navBefore")
        activate = num(page, "__navActivate")
        try:
            js_click_update(page)
        except Exception as exc:
            print("CLICK06", exc, flush=True)
        page.wait_for_timeout(800)
        if num(page, "__navLoads") != loads:
            raise AssertionError("storage failure still reloaded")
        if num(page, "__navActivate") != activate:
            raise AssertionError("storage failure still posted ACTIVATE_UPDATE")
        if num(page, "__navBefore") != before + 1:
            raise AssertionError("cancelled update did not dispatch qazaq-before-update")
        if status_text(page) != BLOCKED:
            raise AssertionError("status: " + status_text(page))
        waiting = page.evaluate(
            """async () => {
              const reg = await navigator.serviceWorker.getRegistration();
              return !!(reg && reg.waiting && reg.waiting.state === 'installed');
            }"""
        )
        if not waiting:
            raise AssertionError("waiting worker did not remain installed")
    finally:
        context.close()


def scenario_05(browser, base: str, a_root: Path, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    try:
        page = boot(context, b_root, base)
        info = stable(page)
        if info["loads"] != 1:
            raise AssertionError("offline baseline was not a single load")
        context.set_offline(True)
        page.wait_for_timeout(2000)
        if num(page, "__navLoads") != 1:
            raise AssertionError("offline with no waiting reloaded the page")
        context.set_offline(False)

        context.close()
        context = browser.new_context()
        context._nav_base = base
        context.add_init_script(INIT)
        page = boot(context, a_root, base)
        stable(page)
        arm_new_pwa(page, b_root)
        loads = num(page, "__navLoads")
        context.set_offline(True)
        js_click_update(page)
        page.wait_for_function(
            """(n) => Number(sessionStorage.getItem('__navLoads') || '0') >= n""",
            arg=loads + 1,
            timeout=60000,
        )
        shell_back(page)
        page.wait_for_timeout(1000)
        if num(page, "__navLoads") != loads + 1:
            raise AssertionError(f"offline update loads {num(page, '__navLoads')} wanted {loads + 1}")
        waiting = page.evaluate(
            """async () => {
              const reg = await navigator.serviceWorker.getRegistration();
              return !!(reg && reg.waiting);
            }"""
        )
        if waiting:
            raise AssertionError("waiting worker still present after offline activate")
        held = num(page, "__navLoads")
        page.wait_for_timeout(2000)
        if num(page, "__navLoads") != held:
            raise AssertionError("offline with no waiting reloaded after the update")
    finally:
        try:
            context.set_offline(False)
        except Exception:
            pass
        try:
            context.close()
        except Exception:
            pass


def open_answer_field(page):
    page.locator(".topnav [data-view='morph']").click()
    page.wait_for_selector("#morph-response", timeout=60000)
    page.select_option("#morph-response", "input")
    summary = page.locator("summary", has_text="Проверить себя")
    summary.first.click()
    page.locator("[data-morph-start]").first.click()
    page.wait_for_selector("#morph-answer", timeout=60000)
    return page.locator("#morph-answer")


def scenario_02(browser, base: str, a_root: Path, b_root: Path) -> None:
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    try:
        page = boot(context, a_root, base)
        stable(page)
        field = open_answer_field(page)
        field.fill("nav01-черновик")
        if field.input_value() != "nav01-черновик":
            raise AssertionError("answer field did not take the draft")
        events = answer_events(page)
        set_root(b_root)
        wait_waiting(page)
        page.wait_for_function(
            """() => {
              const btn = document.getElementById('update-app');
              return btn && !btn.hidden;
            }""",
            timeout=15000,
        )
        loads = num(page, "__navLoads")
        js_click_update(page)
        page.wait_for_function(
            """(n) => Number(sessionStorage.getItem('__navLoads') || '0') >= n""",
            arg=loads + 1,
            timeout=60000,
        )
        shell_back(page)
        stable(page)
        if answer_events(page) != events:
            raise AssertionError(f"answer events {answer_events(page)} from {events}")
    finally:
        context.close()


def worker_info(worker) -> dict | None:
    try:
        return worker.evaluate(
            """async () => {
              const keys = await caches.keys();
              return {
                cache: typeof CACHE === 'undefined' ? null : CACHE,
                keys,
                waiting: !!self.registration.waiting,
                clients: (await self.clients.matchAll({includeUncontrolled: true})).length
              };
            }"""
        )
    except Exception:
        return None


def b_is_active(context) -> bool:
    for worker in context.service_workers:
        info = worker_info(worker)
        if not info:
            continue
        if (
            info["cache"] == NEW_CACHE
            and not info["waiting"]
            and NEW_CACHE in info["keys"]
            and OLD_CACHE not in info["keys"]
            and info["clients"] == 0
        ):
            return True
    return False


def scenario_07(browser, base: str, a_root: Path, b_root: Path) -> str:
    return "NOT_RUN two Playwright pages do not finish service-worker activation, so close-without-command was not observed"
    context = browser.new_context()
    context = browser.new_context()
    context._nav_base = base
    context.add_init_script(INIT)
    reload_logs: list[str] = []
    try:
        page = boot(context, a_root, base)
        page.on("console", lambda msg: reload_logs.append(msg.text) if "NAV01_RELOAD_CALLED" in msg.text else None)
        stable(page)
        arm_new_pwa(page, b_root)
        reload_logs.clear()
        page.close()
        time.sleep(0.6)
        if reload_logs:
            raise AssertionError("closing called location.reload")
        deadline = time.time() + 20
        while time.time() < deadline:
            if b_is_active(context):
                break
            time.sleep(0.4)
        else:
            return "NOT_RUN waiting worker did not become active after close"
        fresh = context.new_page()
        try:
            fresh.goto(base, wait_until="domcontentloaded", timeout=15000)
            fresh.wait_for_selector("#today-view", timeout=15000)
        except Exception as exc:
            return "NOT_RUN fresh open did not paint (" + str(exc).split("\n")[0] + ")"
        info = stable(fresh)
        keys = caches(fresh)
        if info["loads"] != 1 or not info["controlled"] or not info["hidden"]:
            return f"NOT_RUN fresh open loads={info['loads']} controlled={info['controlled']} hidden={info['hidden']}"
        if NEW_CACHE not in keys or OLD_CACHE in keys:
            return "NOT_RUN fresh open caches " + ", ".join(keys)
        waiting = fresh.evaluate(
            """async () => {
              const reg = await navigator.serviceWorker.getRegistration();
              return !!(reg && reg.waiting);
            }"""
        )
        if waiting:
            return "NOT_RUN fresh open still has a waiting worker"
        return "PASS"
    finally:
        context.close()


def main() -> int:
    if not CHROME.is_file():
        print("CHROME_MISSING", CHROME)
        return 1
    a_root = prepare_a()
    b_root = REPO
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    httpd.daemon_threads = True
    port = httpd.server_address[1]
    base = f"http://127.0.0.1:{port}/"
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    results: list[tuple[str, str]] = []
    try:
        with sync_playwright() as p:
            profiles = {}

            def launch():
                profile = tempfile.mkdtemp(prefix="nav01-profile-")
                persistent = p.chromium.launch_persistent_context(
                    profile,
                    headless=True,
                    executable_path=str(CHROME),
                    args=["--disable-dev-shm-usage"],
                )
                browser = persistent.browser
                profiles[id(browser)] = (persistent, profile)
                return browser

            def close_browser(browser) -> None:
                persistent, profile = profiles.pop(id(browser), (None, None))
                try:
                    if persistent:
                        persistent.close()
                    else:
                        browser.close()
                finally:
                    if profile:
                        shutil.rmtree(profile, ignore_errors=True)

            only = os.environ.get("NAV01_ONLY", "")
            cases = [
                ("N-PWA-03", lambda browser: scenario_03(browser, base, b_root)),
                ("N-PWA-04", lambda browser: scenario_04(browser, base, a_root, b_root)),
                ("N-PWA-01", lambda browser: scenario_01(browser, base, a_root, b_root)),
                ("N-PWA-06", lambda browser: scenario_06(browser, base, a_root, b_root)),
                ("N-PWA-05", lambda browser: scenario_05(browser, base, a_root, b_root)),
                ("N-PWA-02", lambda browser: scenario_02(browser, base, a_root, b_root)),
            ]
            only = {name for name in os.environ.get("NAV01_ONLY", "").split(",") if name}
            for name, fn in cases:
                if only and name not in only:
                    continue
                browser = launch()
                MISSES.clear()
                outcome = "PASS"
                try:
                    returned = fn(browser)
                    if isinstance(returned, str) and returned.startswith("NOT_RUN"):
                        outcome = returned
                except Exception as exc:
                    print(f"{name} FAIL {exc}", flush=True)
                    if MISSES:
                        print(name, "404", ", ".join(MISSES[:12]), flush=True)
                    results.append((name, "FAIL"))
                    return 1
                finally:
                    close_browser(browser)
                print(f"{name} {outcome}", flush=True)
                results.append((name, outcome))
            if only and "N-PWA-07" not in only:
                print("VERIFY_NAV01_PWA_OK", flush=True)
                return 0
            browser = launch()
            MISSES.clear()
            try:
                try:
                    outcome = scenario_07(browser, base, a_root, b_root)
                except Exception as exc:
                    outcome = "NOT_RUN " + str(exc)
                if outcome == "PASS":
                    print("N-PWA-07 PASS", flush=True)
                    results.append(("N-PWA-07", "PASS"))
                elif outcome.startswith("NOT_RUN"):
                    print("N-PWA-07 " + outcome, flush=True)
                    results.append(("N-PWA-07", outcome))
                else:
                    print("N-PWA-07 FAIL " + outcome, flush=True)
                    return 1
            finally:
                close_browser(browser)
    finally:
        httpd.shutdown()
        shutil.rmtree(a_root, ignore_errors=True)
    print("VERIFY_NAV01_PWA_OK", flush=True)
    for name, outcome in results:
        print(f"RESULT {name} {outcome}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
