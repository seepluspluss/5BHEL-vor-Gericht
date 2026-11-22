// Minimaler Chrome-DevTools-Protocol-Client für Edge headless (ohne externe Pakete, Node >= 22).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);

export async function launch() {
  if (!EDGE) throw Error('Edge nicht gefunden');
  const profile = mkdtempSync(join(tmpdir(), '5bhel-cdp-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 80 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(150); } }
  if (!wsUrl) throw Error('DevTools nicht erreichbar');
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(Error(d.error.message)) : p.res(d.result); } };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

  async function newPage({ width = 1920, height = 1080, mobile = false, scale = 1 } = {}) {
    const { browserContextId } = await send('Target.createBrowserContext'); // eigener Cookie-Speicher je Rolle
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    if (mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true });
    const page = {
      async goto(url) { await s('Page.navigate', { url }); await page.waitFor('document.readyState === "complete"', 15000); await sleep(150); },
      async eval(expr) {
        const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw Error('JS-Fehler: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
        return r.result.value;
      },
      async waitFor(expr, timeout = 10000, label) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) { try { if (await page.eval(`!!(${expr})`)) return true; } catch {} await sleep(120); }
        throw Error('Zeitüberschreitung: ' + (label || expr));
      },
      async click(sel) { const ok = await page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`); if (!ok) throw Error('Element fehlt: ' + sel); await sleep(60); },
      async key(key) { await s('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key === 'Escape' ? 'Escape' : key }); await s('Input.dispatchKeyEvent', { type: 'keyUp', key }); await sleep(80); },
      async resize(w, h, mob = false) { await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob }); await sleep(250); },
      async shot(file) { const { data } = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(data, 'base64')); },
      async reload() { await s('Page.reload', {}); await sleep(300); await page.waitFor('document.readyState === "complete"', 15000); await sleep(300); },
    };
    return page;
  }
  async function close() { try { await send('Browser.close'); } catch {} proc.kill(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch {} }
  return { newPage, close };
}
