// Audiotest im echten (unsichtbaren) Edge: Autoplay-Sperre, Musikwechsel, Effekte, Ducking, Stummschaltung,
// gespeicherte Lautstärke, Pegel/Übersteuerung und „keine Musik“ auf Schüler- und Lehrkraftseite.
// Aufruf: node tests/audio.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { launch } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 33000 + Math.floor(Math.random() * 20000), PASS = 'audio-test-7';
const base = `http://localhost:${port}`;
const srv = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), ADMIN_PASSWORD: PASS }, stdio: 'ignore' });
const out = [], levels = {};
const ok = (m) => { out.push(m); console.log('  ✓ ' + m); };
const COUNT_AC = `(() => { window.__acCount = 0; for (const k of ['AudioContext','webkitAudioContext']) { const O = window[k]; if (!O) continue; window[k] = function (...a) { window.__acCount++; return new O(...a); }; } })();`;

let b;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await sleep(100); }
  b = await launch();
  const A = await b.newPage({ width: 1920, height: 1080 });
  await A.goto(base + '/login.html');
  await A.eval(`document.getElementById('password').value=${JSON.stringify(PASS)};document.getElementById('form').requestSubmit()`);
  await A.waitFor(`location.pathname === '/' && window.__audio && window.__game`, 10000, 'Admin-Seite mit Audio');
  const st = () => A.eval('__audio.state()');
  const lvl = async (name, ms = 1200) => { const l = await A.eval(`__audio.level(${ms})`); levels[name] = l; return l; };
  const has = async (name, sinceIdx = 0) => (await st()).log.slice(sinceIdx).some(e => e.name === name);

  // 1. Autoplay: nichts ohne Interaktion
  await sleep(1500);
  let s = await st();
  if (s.unlocked || s.ctx) throw Error('Audio ohne Benutzerinteraktion gestartet');
  ok('Ohne Benutzerinteraktion: kein AudioContext, keine Musik');
  await A.mouse(300, 1000);                       // echter Klick auf freie Fläche
  await A.waitFor(`__audio.state().track === 'prelude' && __audio.state().ctx === 'running'`, 4000, 'Prelude nach Klick');
  let l = await lvl('prelude');
  if (!(l.rms > 0.002)) throw Error('Prelude ist stumm: ' + JSON.stringify(l));
  ok(`Nach echtem Klick startet „Courtroom Prelude“ (RMS ${l.rms.toFixed(4)}, Spitze ${l.peak.toFixed(3)})`);

  // 2. Stummschaltung (kleines Symbol) und Wiederherstellen
  await A.mouseOn('#audio-mute');
  await sleep(600); l = await lvl('stumm', 600);
  if (l.rms > 0.0002 || !(await st()).muted) throw Error('Stummschaltung wirkt nicht: ' + JSON.stringify(l));
  await A.mouseOn('#audio-mute'); await sleep(400);
  ok('Stumm-Symbol schaltet sofort stumm und wieder ein');

  // 3. Lautstärke bleibt nach Neuladen erhalten
  await A.eval(`(()=>{const r=document.getElementById('au-mvol');r.value='35';r.dispatchEvent(new Event('input'));const e=document.getElementById('au-svol');e.value='70';e.dispatchEvent(new Event('input'))})()`);
  await A.reload();
  await A.waitFor(`window.__audio && window.__game`, 8000);
  const set = await A.eval(`[__audio.settings.musicVol, __audio.settings.sfxVol, document.getElementById('au-mvol').value, __audio.state().unlocked]`);
  if (set[0] !== 0.35 || set[1] !== 0.7 || set[2] !== '35' || set[3]) throw Error('Einstellungen nach Neuladen falsch: ' + set);
  ok('Musik-/Effektlautstärke bleiben nach Neuladen erhalten (35 % / 70 %); nach Neuladen wieder erst nach Klick');
  await A.mouse(300, 1000);
  await A.waitFor(`__audio.state().track === 'prelude'`, 4000);
  await A.eval(`(()=>{const r=document.getElementById('au-mvol');r.value='60';r.dispatchEvent(new Event('input'))})()`);

  // 4. Live-Raum, Schüler und Lehrkraft (mit AudioContext-Zähler)
  await A.eval(`document.getElementById('ap-create').click()`);
  await A.waitFor(`document.documentElement.classList.contains('live-room')`, 5000);
  const code = await A.eval(`document.getElementById('ap-code').textContent`);
  await A.eval(`(()=>{const s=document.getElementById('ap-duration');s.value='20';s.dispatchEvent(new Event('change'))})()`);
  const S1 = await b.newPage({ width: 390, height: 844, mobile: true });
  await S1.initScript(COUNT_AC);
  await S1.goto(`${base}/abstimmen.html?code=${code}`);
  await S1.eval(`document.getElementById('name').value='Ton';document.getElementById('join-form').requestSubmit()`);
  await S1.waitFor(`!document.getElementById('v-game').classList.contains('hidden')`, 5000);
  await S1.mouse(100, 300);
  await A.eval(`document.getElementById('ap-obs-create').click()`);
  await A.waitFor(`document.getElementById('ap-obs-link').value.includes('token=')`, 5000);
  const O = await b.newPage({ width: 1280, height: 900 });
  await O.initScript(COUNT_AC);
  await O.goto(await A.eval(`document.getElementById('ap-obs-link').value`));
  await O.mouse(200, 200);

  // 5. Ablauf: Eröffnung → Frage → Abstimmung → Ergebnis → Bewertung
  await A.eval(`__game.setCinema(false)`);
  let mark = (await st()).log.length;
  await A.eval(`document.getElementById('btn-start').click()`);
  await sleep(500);
  if (!(await has('trialStart', mark - 40))) throw Error('Kein Verhandlungsbeginn-Sound');
  ok('Verhandlungsbeginn: Richterhammer + Streicher-Akzent');

  await A.eval(`__game.showIntro(0, 1)`);
  await A.waitFor(`__audio.state().track === 'trial'`, 4000, 'Trial-Musik');
  await sleep(1600); const trialL = await lvl('trial');
  await A.eval(`__game.showQuestion(0, 0)`);
  await A.waitFor(`__audio.state().track === 'vote'`, 4000, 'Abstimmungsmusik');
  const duckedDuringSpeech = await A.eval(`new Promise(r=>{const t0=Date.now();(function c(){if(__audio.state().ducked)return r(true);if(Date.now()-t0>800)return r(false);setTimeout(c,30)})()})`);
  if (!duckedDuringSpeech) throw Error('Musik wird während des Dialogs nicht abgesenkt');
  if (!(await has('question'))) throw Error('Kein Sound für neue Frage');
  await sleep(1300); l = await lvl('vote');
  if (l.rms > 2.2 * Math.max(trialL.rms, levels.prelude.rms)) throw Error('Abstimmungsmusik zu laut: ' + l.rms + ' vs ' + trialL.rms);
  ok(`Musikwechsel: Trial Begins → Critical Decision; neue Frage mit Signalton; Musik leiser während die Richterin spricht (RMS Trial ${trialL.rms.toFixed(4)}, Abstimmung ${l.rms.toFixed(4)})`);

  await S1.waitFor(`document.querySelectorAll('#g-choices .choice').length === 3`, 6000);
  mark = (await st()).log.length;
  await S1.mouseOn('#g-choices .choice:nth-child(2)');   // einziger Schüler → Abstimmung endet sofort
  await A.waitFor(`document.getElementById('stage').classList.contains('show-vote-result')`, 6000, 'Ergebnisphase');
  await sleep(2300);
  const logAfter = (await st()).log.slice(-12).map(e => e.name);
  for (const n of ['voteEnd', 'drumroll', 'majority']) if (!logAfter.includes(n)) throw Error('Fehlender Ergebnis-Sound ' + n + ': ' + logAfter);
  const trackDuring = (await st()).track;
  if (trackDuring !== null) throw Error('Abstimmungsmusik läuft im Ergebnis weiter: ' + trackDuring);
  l = await lvl('verdict-sting', 800);
  ok(`Abstimmungsende: Musik endet, Schlag + Trommelwirbel, neutraler Akzent bei „Mehrheitsentscheidung“ (Spitze ${l.peak.toFixed(3)})`);

  await A.eval(`document.getElementById('vr-continue').click()`);
  await A.waitFor(`__game.state().scene === 'explain'`, 6000);
  await sleep(300);
  const judged = (await st()).log.slice(-6).map(e => e.name);
  if (!judged.includes('correct') && !judged.includes('wrong')) throw Error('Kein Bewertungssound: ' + judged);
  l = await lvl('judge-sting', 1200);
  if (l.peak >= 1) throw Error('Übersteuerung beim Bewertungssound: ' + l.peak);
  await A.waitFor(`__audio.state().track === 'trial'`, 4000, 'Trial-Musik nach Bewertung');
  ok(`Bewertung „${judged.includes('correct') ? 'Justice Prevails' : 'Objection Denied'}“ ohne Übersteuerung (Spitze ${l.peak.toFixed(3)}), danach wieder Verhandlungsmusik`);

  // 6. Countdown der letzten 5 Sekunden + Timer-Ende ohne Stimmen
  await A.eval(`__game.showQuestion(0, 1)`);
  await A.waitFor(`document.getElementById('stage').classList.contains('live-voting')`, 5000);
  mark = (await st()).log.length;
  await A.waitFor(`document.getElementById('stage').classList.contains('show-vote-result')`, 26000, 'Timer-Ende');
  const ticks = (await st()).log.slice(-20).filter(e => e.name === 'tick' || e.name === 'tickLast').length;
  if (ticks < 4) throw Error('Countdown-Ticks fehlen: ' + ticks);
  await sleep(2100);
  if (!(await st()).log.slice(-6).some(e => e.name === 'suspense')) throw Error('Kein Sound bei „keine Stimmen“');
  ok(`Countdown: ${ticks} Ticks in den letzten 5 Sekunden; Timer-Ende ohne Stimmen → ernster Akzent, keine erfundene Mehrheit`);

  // 7. Fallauswertung und Finale
  await A.eval(`__game.showSummary(0)`);
  await A.waitFor(`__audio.state().track === 'prelude'`, 4000, 'Prelude in Fallauswertung');
  await A.eval(`__game.showFinal()`);
  await sleep(300);
  if (!(await st()).log.slice(-4).some(e => e.name === 'verdict')) throw Error('Kein Urteilssound');
  await A.waitFor(`/finale/.test(__audio.state().track || '')`, 5000, 'Finalmusik');
  const fin = (await st()).track;
  l = await lvl('finale');
  ok(`Urteil: dreifacher Richterhammer, danach „Final Judgment“ (${fin === 'finaleLow' ? 'ernste Variante bei < 700 Punkten' : 'festliche Variante'}; RMS ${l.rms.toFixed(4)})`);
  const maxParallel = await A.eval(`(async()=>{let m=0;for(let i=0;i<10;i++){m=Math.max(m,__audio.state().playing);await new Promise(r=>setTimeout(r,100))}return m})()`);
  if (maxParallel > 1) throw Error('Mehrere Tracks gleichzeitig: ' + maxParallel);
  ok('Nie mehr als ein Musiktrack gleichzeitig aktiv (Crossfade, keine Doppelwiedergabe)');

  // 8. Audio-Test-Button und Musik/Effekte getrennt schaltbar
  await A.eval(`document.getElementById('au-music').click()`); await sleep(600);
  const noMusic = await lvl('musik-aus', 500);
  await A.eval(`document.getElementById('au-test').click()`); await sleep(250);
  const testSfx = await lvl('audio-test', 700);
  await A.eval(`document.getElementById('au-music').click()`);
  if (noMusic.rms > 0.0003 || testSfx.rms < 0.002) throw Error('Musik/Effekte nicht getrennt: ' + JSON.stringify([noMusic, testSfx]));
  ok('„Musik: AUS“ trennt Musik von Effekten; „Audio testen“ spielt Hammer + Erfolgssound');

  // 9. Keine Musik auf Schülerhandy und in der Lehrkraftansicht
  for (const [p, name] of [[S1, 'Schülerhandy'], [O, 'Lehrkraft-Übersicht']]) {
    const r = await p.eval(`[window.__acCount, !!window.__audio, document.querySelectorAll('audio,video').length, [...document.scripts].some(x=>/audio/.test(x.src))]`);
    if (r[0] !== 0 || r[1] || r[2] !== 0 || r[3]) throw Error(name + ' erzeugt Audio: ' + r);
  }
  ok('Schülerhandy und Lehrkraft-Übersicht: kein AudioContext, kein Audio-Code, keine Wiedergabe');

  // 10. Keine Browserfehler
  const errs = [...A.errors, ...S1.errors, ...O.errors].filter(e => !/favicon/.test(e));
  if (errs.length) throw Error('Browserfehler: ' + errs.join(' | '));
  ok('Keine Browserfehler und keine fehlenden Dateien (Admin, Handy, Lehrkraft)');
  console.log(`AUDIO PASS: ${out.length} Prüfungen`);
} catch (e) {
  console.error('AUDIO FAIL:', e.message);
  process.exitCode = 1;
} finally {
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  writeFileSync(join(root, 'artifacts', 'audio-report.json'), JSON.stringify({ passed: out, levels }, null, 2));
  if (b) await b.close();
  srv.kill();
}
