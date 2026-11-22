// Ende-zu-Ende-Test mit echtem (unsichtbarem) Edge: Admin, 3 Schüler-Handys und Frau Prof gleichzeitig.
// Aufruf: node tests/e2e.mjs [--no-cinema] [--shots]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { launch } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots'), CINEMA = !process.argv.includes('--no-cinema');
const shotDir = join(root, 'artifacts', 'e2e');
mkdirSync(shotDir, { recursive: true });
const port = 32000 + Math.floor(Math.random() * 20000), PASS = 'e2e-geheim-42';
const base = `http://localhost:${port}`;
const srv = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), ADMIN_PASSWORD: PASS }, stdio: 'ignore' });
const results = [];
const ok = (m) => { results.push({ ok: true, m }); console.log('  ✓ ' + m); };
const shot = async (p, name) => { if (SHOTS) await p.shot(join(shotDir, name + '.png')); };
const CORRECT = [[1, 0, 2, 1], [0, 2, 1, 0], [2, 0, 1, 2]];
const L = 'ABC';

const LAYOUT = `(() => {
  const bad = [], vis = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const st = document.getElementById('stage'), sr = st.getBoundingClientRect();
  if (sr.right > innerWidth + 1 || sr.bottom > innerHeight + 1 || sr.left < -1 || sr.top < -1) bad.push('Bühne ragt aus dem Fenster');
  document.querySelectorAll('#stage .fit, #stage .answer-text, .vr-text').forEach(e => { if (vis(e) && (e.scrollHeight > e.clientHeight + 2)) bad.push('Text abgeschnitten: ' + (e.id || e.className) + ' ' + e.textContent.trim().slice(0, 40)); });
  document.querySelectorAll('#stage button').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.right > sr.right + 1 || r.bottom > sr.bottom + 1) bad.push('Button außerhalb: ' + e.textContent.trim().slice(0, 30)); });
  return bad; })()`;
async function layoutOk(p, tag) { const bad = await p.eval(LAYOUT); if (bad.length) throw Error(tag + ': ' + bad.join(' | ')); }

let b;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await sleep(100); }
  b = await launch();

  // ---------- 1. Login und Rollen ----------
  const admin = await b.newPage({ width: 1920, height: 1080 });
  await admin.goto(base + '/');
  if (!(await admin.eval('location.pathname')).includes('login')) throw Error('Ohne Login keine Umleitung');
  await admin.eval(`document.getElementById('password').value='falsch';document.getElementById('form').requestSubmit()`);
  await admin.waitFor(`document.getElementById('error').textContent.length > 0`, 5000, 'Fehlermeldung bei falschem Passwort');
  await admin.eval(`document.getElementById('password').value=${JSON.stringify(PASS)};document.getElementById('form').requestSubmit()`);
  await admin.waitFor(`location.pathname === '/' && window.__game && document.getElementById('stage')`, 10000, 'Admin-Seite');
  ok('Admin-Login (falsches Passwort abgewiesen, richtiges akzeptiert)');

  // ---------- 2. Seitenleiste ----------
  if (await admin.eval(`document.body.classList.contains('admin-open')`)) throw Error('Panel sollte geschlossen starten');
  const fullW = await admin.eval(`Math.round(document.getElementById('stage').getBoundingClientRect().width)`);
  if (fullW !== 1920) throw Error('Saal nutzt bei geschlossenem Panel nicht die volle Breite: ' + fullW);
  await admin.click('#admin-toggle');
  await admin.waitFor(`document.body.classList.contains('admin-open') && document.body.classList.contains('admin-docked')`);
  const dockR = await admin.eval(`Math.round(document.getElementById('stage').getBoundingClientRect().right)`);
  if (dockR > 1920 - 400 + 1) throw Error('Saal wird vom angedockten Panel verdeckt');
  await shot(admin, '01_admin_panel_offen_1920');
  await admin.key('Escape');
  await admin.waitFor(`!document.body.classList.contains('admin-open')`, 3000, 'ESC schließt Panel');
  await admin.resize(1366, 768);
  await admin.click('#admin-toggle');
  await admin.waitFor(`document.body.classList.contains('admin-open')`);
  await admin.click('#mod-close');
  await admin.waitFor(`!document.body.classList.contains('admin-open')`);
  await admin.resize(1920, 1080);
  ok('Admin-Panel: startet ausgeblendet, öffnet/schließt (Button, X, ESC), Saal volle Breite, angedockt ohne Verdecken');

  // ---------- 3. Raum, Schüler, Beobachter ----------
  await admin.click('#admin-toggle');
  await admin.click('#ap-create');
  await admin.waitFor(`document.documentElement.classList.contains('live-room')`, 5000, 'Raum erstellt');
  const code = await admin.eval(`document.getElementById('ap-code').textContent`);
  await admin.waitFor(`document.getElementById('ap-qr').naturalWidth > 0`, 5000, 'QR-Code geladen');
  await admin.key('Escape');
  await admin.waitFor(`document.getElementById('join-card').offsetParent !== null && document.getElementById('join-qr').naturalWidth > 0`, 5000, 'QR auf Startbildschirm');
  await shot(admin, '02_start_mit_qr_1920');
  ok('Raum erstellt; QR-Code im Panel und auf dem Startbildschirm');

  const students = [];
  for (const name of ['Anna', 'Ben', 'Cem']) {
    const s = await b.newPage({ width: 390, height: 844, mobile: true, scale: 2 });
    await s.goto(`${base}/abstimmen.html?code=${code}`);
    if (name === 'Anna') await shot(s, '10_handy_beitreten');
    await s.eval(`document.getElementById('name').value=${JSON.stringify(name)};document.getElementById('join-form').requestSubmit()`);
    await s.waitFor(`!document.getElementById('v-game').classList.contains('hidden')`, 5000, name + ' beigetreten');
    students.push(s);
  }
  await admin.waitFor(`/3 verbunden/.test(document.getElementById('ap-people').textContent)`, 5000, '3 Teilnehmer');
  const forb = await students[0].eval(`Promise.all([fetch('/js/cases.js').then(r=>r.status), fetch('/api/create',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status), fetch('/',{redirect:'manual'}).then(r=>r.type)])`);
  if (forb[0] !== 403 || forb[1] !== 403 || forb[2] !== 'opaqueredirect') throw Error('Schüler erreicht Admin-Bereich: ' + forb);
  ok('3 Schüler (Handy-Hochformat) beigetreten; Schüler erhalten keinen Admin-Zugang und keine Lösungen');

  await admin.click('#ap-obs-create');
  await admin.waitFor(`document.getElementById('ap-obs-link').value.includes('token=')`, 5000, 'Beobachter-Link');
  const obsUrl = await admin.eval(`document.getElementById('ap-obs-link').value`);
  const obs = await b.newPage({ width: 1280, height: 900 });
  await obs.goto(obsUrl);
  await obs.waitFor(`/verbunden/.test(document.getElementById('conn').textContent)`, 5000, 'Beobachter verbunden');
  const obsCtl = await obs.eval(`fetch('/api/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:${JSON.stringify(code)}})}).then(r=>r.status)`);
  if (obsCtl !== 403) throw Error('Beobachter kann steuern');
  ok('Beobachterzugang funktioniert und ist schreibgeschützt');

  // ---------- 4. Präsentationsmodus ----------
  await admin.click('#ap-present');
  await admin.waitFor(`document.documentElement.classList.contains('presentation') && !document.body.classList.contains('admin-open')`);
  await sleep(500);
  const pres = await admin.eval(`[getComputedStyle(document.getElementById('admin-toggle')).opacity, getComputedStyle(document.getElementById('btn-fs-hud')).display, getComputedStyle(document.getElementById('admin-panel')).visibility === 'hidden']`);
  if (pres[0] !== '0' || pres[1] !== 'none' || !pres[2]) throw Error('Präsentationsmodus zeigt Verwaltungselemente: ' + pres);
  await admin.key('m');
  await admin.waitFor(`document.body.classList.contains('admin-open')`, 3000, 'M öffnet Panel im Präsentationsmodus');
  await admin.click('#ap-present');
  await admin.waitFor(`!document.documentElement.classList.contains('presentation')`);
  await admin.key('Escape');
  await admin.click('#ap-present'); await admin.waitFor(`document.documentElement.classList.contains('presentation')`); // für den Durchlauf an
  ok('Präsentationsmodus: keine Verwaltungsbuttons, kein Beobachterlink; jederzeit verlassbar (M → Panel)');

  // ---------- 5. Alle 12 Fragen live ----------
  await admin.eval(`__game.setCinema(false)`);
  await admin.click('#btn-start');
  let expected = 0; const cur = { c: 0, q: 0 };
  const vote = async (s, choice) => {
    await s.waitFor(`document.querySelectorAll('#g-choices .choice').length === 3 && !document.getElementById('g-vote').classList.contains('hidden') && document.getElementById('g-kicker').textContent.startsWith('Fall ${cur.c + 1} · Frage ${cur.q + 1}')`, 8000, 'Abstimmung am Handy');
    await s.eval(`document.querySelectorAll('#g-choices .choice')[${choice}].click()`);
    try { await s.waitFor(`!document.getElementById('g-voted').classList.contains('hidden') || !document.getElementById('g-result').classList.contains('hidden')`, 5000, 'Stimme bestätigt'); }
    catch (e) { throw Error(e.message + ' | Diagnose: ' + JSON.stringify(await s.eval(`({err: document.getElementById('g-error').textContent, kicker: document.getElementById('g-kicker').textContent, views: ['g-wait','g-vote','g-result'].filter(i=>!document.getElementById(i).classList.contains('hidden')), disabled: [...document.querySelectorAll('#g-choices .choice')].map(b=>b.disabled), choice: ${choice}})`))); }
  };
  const waitOverlay = () => admin.waitFor(`document.getElementById('stage').classList.contains('show-vote-result')`, 30000, 'Ergebnisphase');
  const overlay = () => admin.eval(`[0,1,2].map(i=>document.querySelector('#vr-row-'+i+' .vr-num').textContent).concat(document.getElementById('vr-verdict').textContent)`);
  const toJudge = async (g) => {
    await sleep(3200);
    await admin.click('#vr-continue');
    await admin.waitFor(`__game.state().scene === 'explain'`, 8000, 'Bewertung der Richterin');
    const hud = await admin.eval(`document.getElementById('hud-score-val').textContent.replace('.','')`);
    if (Number(hud) !== expected) throw Error(`Punkte nach Frage ${g + 1}: ${hud} statt ${expected}`);
  };

  for (let g = 0; g < 12; g++) {
    const c = Math.floor(g / 4), q = g % 4, cor = CORRECT[c][q], wrong = (cor + 1) % 3, wrong2 = (cor + 2) % 3;
    cur.c = c; cur.q = q;
    if (g === 2) await admin.eval(`(()=>{const s=document.getElementById('ap-duration');s.value='20';s.dispatchEvent(new Event('change'))})()`);
    if (g === 3) await admin.eval(`(()=>{const s=document.getElementById('ap-duration');s.value='30';s.dispatchEvent(new Event('change'))})()`);
    await sleep(300);
    await admin.eval(`__game.showQuestion(${c}, ${q})`);
    await admin.waitFor(`document.getElementById('stage').classList.contains('live-voting')`, 5000, 'Abstimmung läuft (Beamer)');
    if (g === 0) {
      await vote(students[0], cor);
      await students[0].reload();
      await students[0].waitFor(`!document.getElementById('g-voted').classList.contains('hidden')`, 8000, 'Stimme nach Neuladen erkannt');
      const again = await students[0].eval(`document.querySelectorAll('#g-choices .choice:not(:disabled)').length`);
      if (again !== 0) throw Error('Nach Neuladen erneut abstimmbar');
      ok('Handy-Neuladen: eigene Stimme bleibt erkannt, keine Doppelstimme möglich');
      await shot(admin, '03_frage_abstimmung_1920'); await shot(students[1], '11_handy_abstimmen');
      await obs.waitFor(`document.getElementById('m-votes').textContent.startsWith('1')`, 4000, 'Frau Prof sieht Stimme live');
      ok('Frau Prof sieht abgegebene Stimmen live');
      await vote(students[1], cor); await vote(students[2], wrong);
      await waitOverlay();
      const o = await overlay();
      if (!o[cor].includes('2 Stimmen · 67 %') || !o[wrong].includes('1 Stimme · 33 %') || !o[3].includes('MEHRHEITSENTSCHEIDUNG: ' + L[cor])) throw Error('Ergebnisbalken falsch: ' + o);
      if (await admin.eval(`__game.state().scene`) !== 'question') throw Error('Bewertung vor Mehrheitsentscheidung');
      await sleep(2200); await shot(admin, '04_ergebnisphase_1920'); await shot(students[2], '12_handy_ergebnis');
      ok('Vollständige Stimmabgabe beendet automatisch; Balken 67 %/33 %; Mehrheit ' + L[cor] + '; Bewertung erst danach');
      expected += 100; await toJudge(g); await shot(admin, '05_bewertung_1920');
      await students[0].waitFor(`/korrekt entschieden/.test(document.getElementById('g-judgement').textContent)`, 5000, 'Handy zeigt Bewertung');
    } else if (g === 1) {
      await vote(students[0], cor); await vote(students[1], wrong);
      await admin.eval(`document.getElementById('ap-close').click()`);
      await waitOverlay();
      const o = await overlay();
      if (!o[3].startsWith('GLEICHSTAND')) throw Error('Gleichstand nicht erkannt: ' + o);
      await shot(admin, '06_gleichstand_1920');
      await admin.eval(`document.querySelector('#vr-actions button').click()`); // Stichwahl
      await admin.waitFor(`document.getElementById('stage').classList.contains('live-voting') && !document.getElementById('stage').classList.contains('show-vote-result')`, 5000, 'Stichwahl läuft');
      const outCount = await students[2].eval(`new Promise(r=>setTimeout(()=>r(document.querySelectorAll('#g-choices .choice.out').length),1600))`);
      if (outCount !== 1) throw Error('Stichwahl zeigt nicht nur 2 Optionen');
      await vote(students[0], cor); await vote(students[1], cor); await vote(students[2], wrong);
      await waitOverlay();
      if (!(await overlay())[3].includes('MEHRHEITSENTSCHEIDUNG: ' + L[cor])) throw Error('Stichwahl-Ergebnis falsch');
      ok('Gleichstand: keine Zufallswahl, Stichwahl nur mit den gleichauf liegenden Antworten');
      expected += 100; await toJudge(g);
    } else if (g === 2) {
      await vote(students[0], cor);
      const t0 = Date.now();
      await waitOverlay();
      const sec = (Date.now() - t0) / 1000;
      if (sec < 12) throw Error('Timer zu früh: ' + sec);
      const reason = await admin.eval(`document.getElementById('vr-total').textContent`);
      if (!reason.includes('Zeit abgelaufen')) throw Error('Timer-Ende nicht gemeldet: ' + reason);
      ok(`Timer (20 s) beendet die Abstimmung serverseitig (nach ${sec.toFixed(1)} s)`);
      expected += 100; await toJudge(g);
    } else if (g === 3) {
      await admin.eval(`document.getElementById('ap-close').click()`);
      await waitOverlay();
      if (!(await overlay())[3].includes('KEINE STIMMEN')) throw Error('Null Stimmen falsch behandelt');
      await admin.eval(`document.querySelectorAll('#vr-actions button')[1].click()`); // überspringen
      await admin.waitFor(`document.getElementById('vr-verdict').textContent.includes('ÜBERSPRUNGEN')`, 5000);
      await admin.click('#vr-continue');
      await admin.waitFor(`__game.state().scene === 'explain'`, 8000);
      ok('Null Stimmen: keine erfundene Mehrheit; Überspringen ohne Punkte');
    } else if (g === 4) {
      await vote(students[0], cor); await vote(students[1], wrong); await vote(students[2], wrong2);
      await waitOverlay();
      if (!(await overlay())[3].includes('GLEICHSTAND')) throw Error('3er-Gleichstand nicht erkannt');
      const btn = await admin.eval(`[...document.querySelectorAll('#vr-actions button')].findIndex(b=>b.textContent.endsWith(' ${L[cor]}') && b.textContent.includes('Spielleitung'))`);
      await admin.eval(`document.querySelectorAll('#vr-actions button')[${btn}].click()`);
      await admin.waitFor(`document.getElementById('vr-verdict').textContent.includes('ENTSCHEIDUNG DER SPIELLEITUNG: ${L[cor]}')`, 5000);
      ok('Gleichstand: transparente Entscheidung der Spielleitung');
      expected += 100; await toJudge(g);
    } else if (g === 5) {
      await vote(students[0], cor); await vote(students[1], wrong); await vote(students[2], wrong);
      await waitOverlay(); await toJudge(g);
      await admin.waitFor(`document.getElementById('say-text').textContent.includes('Mehrheit hat sich geirrt')`, 8000, 'Reaktion bei falscher Mehrheit');
      await shot(admin, '07_falsch_1920');
      ok('Falsche Mehrheit: keine Punkte, Reaktion „Die Mehrheit hat sich geirrt …“');
    } else {
      await vote(students[0], cor);
      if (g === 6) {
        await admin.reload();
        await admin.waitFor(`window.__game && __game.state().scene === 'question' && __game.state().c === ${c} && __game.state().q === ${q} && document.documentElement.classList.contains('live-room')`, 10000, 'Admin-Neuladen stellt Spiel wieder her');
        const hud = await admin.eval(`document.getElementById('hud-score-val').textContent`);
        if (Number(hud) !== expected) throw Error('Punkte nach Admin-Neuladen falsch: ' + hud);
        ok('Admin-Neuladen: Raum, aktuelle Frage und Punktestand werden wiederhergestellt');
        await admin.eval(`__game.setCinema(false)`);
      }
      await vote(students[1], cor); await vote(students[2], cor);
      await waitOverlay(); expected += 100; await toJudge(g);
    }
    if (g === 7) { await admin.resize(1366, 768); await layoutOk(admin, '1366 Bewertung'); await shot(admin, '08_bewertung_1366'); await admin.resize(1920, 1080); }
  }
  ok('Alle 12 Fragen live erreicht; Punkte stimmen nach jeder Frage (' + expected + ')');

  // Summen am Ende
  await admin.eval(`__game.showFinal()`);
  const fin = await admin.eval(`document.getElementById('final-score').textContent.replace('.','')`);
  await obs.waitFor(`document.getElementById('m-score').textContent === '${expected}'`, 4000, 'Beobachter-Punkte');
  if (Number(fin) !== expected) throw Error('Urteilspunkte falsch: ' + fin);
  await shot(admin, '09_urteil_1920'); await shot(obs, '20_beobachter');
  ok('Urteil und Beobachteransicht zeigen dieselbe Punktzahl (' + expected + ')');

  // Widerruf
  await admin.click('#admin-toggle');
  await admin.click('#ap-obs-revoke');
  await obs.waitFor(`/ungültig|widerrufen|abgelaufen/.test(document.getElementById('conn').textContent)`, 5000, 'Widerruf wirkt');
  ok('Beobachterzugang widerrufen – Übersicht sofort gesperrt');
  await admin.key('Escape');

  // ---------- 6. Filmische Intros ----------
  if (CINEMA) {
    await admin.eval(`__game.setCinema(true)`);
    for (let c = 0; c < 3; c++) {
      await admin.eval(`__game.showIntro(${c}, 0)`);
      await admin.waitFor(`document.getElementById('stage').classList.contains('cinema-on')`, 3000, 'Intro startet');
      const t0 = Date.now();
      await sleep(6000); await shot(admin, `3${c}_intro_fall${c + 1}`);
      await admin.waitFor(`__game.state().scene === 'intro'`, 40000, `Intro Fall ${c + 1} endet`);
      const dur = (Date.now() - t0) / 1000;
      if (dur > 32) throw Error(`Intro ${c + 1} zu lang: ${dur}`);
      ok(`Intro Fall ${c + 1} läuft vollständig (${dur.toFixed(1)} s) und wechselt in den Gerichtssaal`);
      await admin.eval(`__game.showIntro(${c}, 0)`);
      await admin.waitFor(`document.getElementById('stage').classList.contains('cinema-on')`, 3000);
      await sleep(1500); await admin.click('#cinema-skip');
      await admin.waitFor(`__game.state().scene === 'intro' && !document.getElementById('stage').classList.contains('cinema-on')`, 3000, 'Überspringen');
      ok(`Intro Fall ${c + 1} lässt sich überspringen`);
    }
  }

  // ---------- 7. Layout 1366 / Handy ----------
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    await admin.resize(w, h);
    for (const js of ['__game.showQuestion(1,2)', '__game.showFinal()']) { await admin.eval(js); await sleep(400); await layoutOk(admin, `${w}x${h} ${js}`); }
  }
  const phone = await students[1].eval(`document.documentElement.scrollWidth <= innerWidth + 1`);
  if (!phone) throw Error('Handy-Ansicht scrollt horizontal');
  ok('Darstellung 1920×1080, 1366×768 ohne abgeschnittene Texte; Handy ohne horizontales Scrollen');

  console.log(`E2E PASS: ${results.length} Prüfungen`);
} catch (e) {
  console.error('E2E FAIL:', e.message);
  process.exitCode = 1;
} finally {
  writeFileSync(join(root, 'artifacts', 'e2e-report.json'), JSON.stringify(results, null, 2));
  if (b) await b.close();
  srv.kill();
}
