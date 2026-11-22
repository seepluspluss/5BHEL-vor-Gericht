// Headless-Tests mit Microsoft Edge (kein sichtbares Fenster).
// Aufruf:  node tests/run_tests.mjs [--shots]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexUrl = pathToFileURL(join(root, 'index.html')).href;
const edgeCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const edge = edgeCandidates.find(existsSync);
if (!edge) { console.error('Microsoft Edge nicht gefunden'); process.exit(2); }

const outDir = join(root, 'artifacts');
mkdirSync(join(outDir, 'screens'), { recursive: true });
const profile = join(tmpdir(), '5bhel-test-profile');

// Headless-Edge zieht vom Fenster einen festen Rahmen ab; so wird der Viewport exakt w×h.
const DW = 24, DH = 92;
const win = (w, h) => `--window-size=${w + DW},${h + DH}`;
function runEdge(args, timeout = 180000) {
  return spawnSync(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', `--user-data-dir=${profile}`, ...args], { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const sizes = [[1920, 1080], [1366, 768], [1280, 720], [1024, 768]];
let allPass = true;
const report = [];

for (const [w, h] of sizes) {
  const r = runEdge([win(w, h), '--virtual-time-budget=120000', '--dump-dom', `${indexUrl}?autotest=1`]);
  const m = /<pre id="autotest-out">([\s\S]*?)<\/pre>/.exec(r.stdout || '');
  if (!m) {
    allPass = false;
    report.push({ size: `${w}x${h}`, result: 'NO-RESULT', stderr: (r.stderr || '').slice(-800), status: r.status });
    console.log(`${w}x${h}: KEIN ERGEBNIS (status ${r.status})`);
    continue;
  }
  const res = JSON.parse(decode(m[1]));
  res.size = `${w}x${h}`;
  report.push(res);
  if (res.result !== 'PASS') allPass = false;
  console.log(`${w}x${h} (Viewport ${res.viewport}): ${res.result} – ${res.checks} Prüfungen, ${res.failures.length} Fehler`);
  res.failures.slice(0, 15).forEach((f) => console.log('   ✗ ' + f));
}
console.log('Durchläufe:'); (report.find((r) => r.runs) || { runs: [] }).runs.forEach((x) => console.log('   ' + x));
writeFileSync(join(outDir, 'autotest-report.json'), JSON.stringify(report, null, 2), 'utf8');

if (process.argv.includes('--shots')) {
  const shots = [
    ['title', ''], ['opening', ''], ['intro', '&c=0'], ['question', '&c=0&q=2'], ['right', '&c=0&q=1'],
    ['wrong', '&c=1&q=1'], ['question', '&c=2&q=1'], ['wrong', '&c=2&q=1'], ['right', '&c=2&q=3'],
    ['summary', '&c=1'], ['final', ''], ['mod', '&c=1&q=0'], ['timer', '&c=2&q=2'],
  ];
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    for (const [shot, extra] of shots) {
      const name = `${w}x${h}_${shot}${extra.replace(/[&=]/g, '_')}.png`;
      const file = join(outDir, 'screens', name);
      rmSync(file, { force: true });
      runEdge([win(w, h), '--virtual-time-budget=3000', `--screenshot=${file}`, `${indexUrl}?shot=${shot}${extra}`], 60000);
      console.log((existsSync(file) ? 'Screenshot ' : 'FEHLT ') + name);
    }
  }
}
console.log(allPass ? 'GESAMT: PASS' : 'GESAMT: FAIL');
process.exit(allPass ? 0 : 1);
