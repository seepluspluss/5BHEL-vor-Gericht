// Rollenbesetzung: Namen überall korrekt, Prof. Lehrner (Richterin) ≠ Herr Lehrner (Fall 2, Unternehmen),
// Lösungen unverändert, Sprecher und Namensschilder im Saal korrekt. Aufruf: node tests/cast.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { launch } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (m) => console.log('  ✓ ' + m);
const sb = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'js/cases.js'), 'utf8'), sb);
const D = JSON.parse(JSON.stringify(sb.window.GAME_DATA)); // aus dem vm-Kontext lösen
let b;
try {
  // 1. Keine alten Namen in ausgelieferten Dateien
  const files = ['index.html', 'abstimmen.html', 'beobachten.html', ...readdirSync(join(root, 'js')).map(f => 'js/' + f)];
  for (const f of files) {
    const t = readFileSync(join(root, f), 'utf8');
    const m = t.match(/Sorger|Reiniger|Herr(n)? Huber|Herr(n)? Winter|Milutin|Bankvertretung/);
    assert(!m, `Alter Name „${m && m[0]}“ in ${f}`);
  }
  ok('Keine alten Namen (Sorger, Reiniger, Huber, Winter, Milutin) in ' + files.length + ' Dateien');

  // 2. Rollen je Fall
  const [c1, c2, c3] = D.cases;
  assert.equal(c1.cast.client.name, 'Efe'); assert.equal(c1.cast.opponent.name, 'Rohallah');
  assert.equal(c1.parties.plaintiff, 'Efe'); assert.equal(c1.parties.defendant, 'Rohallah');
  assert.equal(c2.cast.client.name, 'Lukas'); assert.equal(c2.cast.opponent.name, 'Herr Lehrner');
  assert.equal(c2.parties.defendant, 'Lukas'); assert.equal(c2.parties.plaintiff, 'Mobilfunkunternehmen');
  assert.equal(c3.cast.client.name, 'Glück'); assert.equal(c3.cast.opponent.name, 'Mikail');
  assert.equal(c3.parties.defendant, 'Glück'); assert.equal(c3.parties.plaintiff, 'Bank');
  ok('Fall 1: Efe klagt gegen Rohallah · Fall 2: Unternehmen (Herr Lehrner) gegen Lukas · Fall 3: Bank (Anwalt Mikail) gegen Glück');

  // 3. Lösungen unverändert
  assert.deepEqual(D.cases.map(c => c.questions.map(q => q.correct)), [[1, 0, 2, 1], [0, 2, 1, 0], [2, 0, 1, 2]]);
  assert.equal(D.cases.reduce((n, c) => n + c.questions.length, 0), 12);
  ok('12 Fragen, richtige Lösungen unverändert');

  // 4. Prof. Lehrner vs. Herr Lehrner
  const txt = JSON.stringify(D);
  const bare = txt.match(/(?<!Prof\. |Herr |Herrn )Lehrner/g);
  assert(!bare, '„Lehrner“ ohne Prof./Herr: ' + bare);
  for (const [i, part] of [[1, D.cases[0]], [3, D.cases[2]], [1, D.hearing[0]], [3, D.hearing[2]], ['Eröffnung', D.opening]]) {
    assert(!/Herrn? Lehrner/.test(JSON.stringify(part)), 'Herr Lehrner außerhalb von Fall 2: ' + i);
  }
  assert(/Herr Lehrner/.test(JSON.stringify(D.cases[1])) && /Herr Lehrner/.test(JSON.stringify(D.hearing[1])));
  assert(!/Prof\. Lehrner/.test(JSON.stringify(D.cases.map(c => c.cast))), 'Prof. Lehrner darf keine Partei sein');
  ok('„Herr Lehrner“ nur in Fall 2 (Unternehmen); „Prof. Lehrner“ nur als Richterin; nie „Lehrner“ ohne Zusatz');

  // 5. Im Browser: Sprecher, Namensschilder, Figuren je Fall
  b = await launch();
  const p = await b.newPage({ width: 1366, height: 768 });
  await p.goto(pathToFileURL(join(root, 'index.html')).href + '?shot=opening');
  for (let c = 0; c < 3; c++) {
    const cs = D.cases[c];
    await p.eval(`__game.setCinema(false); __game.showIntro(${c}, 0)`);
    const seen = [];
    for (let i = 0; i < cs.intro.length; i++) {
      const r = await p.eval(`({ who: document.getElementById('dialog-speaker').getAttribute('data-who'), label: document.getElementById('dialog-speaker').textContent.replace(/\\s+/g,' ').trim(),
        left: document.getElementById('plate-left-name').textContent, right: document.getElementById('plate-right-name').textContent, rsub: document.getElementById('plate-right-sub').textContent,
        bl: document.getElementById('cast-left').getAttribute('data-name'), br: document.getElementById('cast-right').getAttribute('data-name'),
        clip: (()=>{const e=document.getElementById('dialog-body');return e.scrollHeight>e.clientHeight+2})() })`);
      const want = cs.intro[i].who;
      assert.equal(r.who, want, `Fall ${c + 1} Zeile ${i + 1}: Sprecher`);
      if (want === 'judge') assert.equal(r.label, 'PROF. LEHRNER · Richterin');
      else assert(r.label.startsWith(cs.cast[want].name.toUpperCase() + ' ·'), 'Etikett: ' + r.label);
      assert.equal(r.left, cs.cast.client.name.toUpperCase()); assert.equal(r.right, cs.cast.opponent.name.toUpperCase());
      assert.equal(r.bl, cs.cast.client.name); assert.equal(r.br, cs.cast.opponent.name);
      assert(!r.clip, `Fall ${c + 1} Zeile ${i + 1}: Text abgeschnitten`);
      seen.push(r.label);
      await p.eval(`__game.next()`);
    }
    console.log(`     Fall ${c + 1}: ` + seen.join(' → '));
  }
  const judgePlate = await p.eval(`document.querySelector('#plate-judge .plate-name').textContent + ' / ' + document.querySelector('#plate-judge .plate-sub').textContent`);
  assert.equal(judgePlate, 'PROF. LEHRNER / Richterin');
  assert.deepEqual(p.errors, []);
  ok('Dialoge: Sprecherwechsel Richterin/Mandant/Gegenseite korrekt, Namensschilder und Figuren je Fall, kein Text abgeschnitten (1366×768)');
  console.log('CAST PASS');
} catch (e) {
  console.error('CAST FAIL:', e.message); process.exitCode = 1;
} finally { if (b) await b.close(); }
