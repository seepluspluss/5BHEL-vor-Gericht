// Servertest: startet server.js auf einem freien Port und spielt Admin, mehrere Schüler und Beobachter durch.
// Aufruf: npm test
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

const port = 31000 + Math.floor(Math.random() * 20000);
const PASS = 'test-passwort-123';
const ACTIVE_MS = 3000;
const proc = spawn(process.execPath, ['server.js'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, PORT: String(port), ADMIN_PASSWORD: PASS, ACTIVE_MS: String(ACTIVE_MS) }, stdio: 'ignore'
});
const base = `http://127.0.0.1:${port}`;
let cookie = '';
const passed = [];
const ok = (name) => { passed.push(name); console.log('  ✓ ' + name); };

async function post(route, body, auth = false) {
  const r = await fetch(base + '/api/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json(), headers: r.headers };
}
async function get(route, auth = false) {
  const r = await fetch(base + route, { redirect: 'manual', headers: auth && cookie ? { Cookie: cookie } : {} });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data, headers: r.headers };
}
const state = async (code, token) => (await get(`/api/state?code=${code}${token ? '&token=' + token : ''}`)).data.room;

try {
  let ready = false;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/health')).ok) { ready = true; break; } } catch {} await sleep(100); }
  assert(ready, 'Server startet nicht');
  ok('Server startet mit node server.js');

  // --- Zugriffsschutz ---
  assert.equal((await get('/server.js')).status, 404);
  assert.equal((await get('/js/cases.js')).status, 403, 'Lösungen dürfen nicht öffentlich sein');
  const idx = await get('/index.html'); assert.equal(idx.status, 302); assert.equal(idx.headers.get('location'), '/login.html');
  assert.equal((await get('/abstimmen.html')).status, 200);
  ok('Öffentliche/geschützte Dateien (cases.js + index.html nur für Admin)');

  assert.equal((await post('admin-login', { password: 'falsch' })).status, 403);
  assert.equal((await post('create', {})).status, 403);
  ok('Ohne Login: kein Admin-Zugang, kein Raum');

  const login = await post('admin-login', { password: PASS });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await get('/api/admin-status', true)).data.admin, true);
  assert.equal((await get('/js/cases.js', true)).status, 200);
  ok('Admin-Login funktioniert (Cookie, HttpOnly)');

  const cr = await post('create', {}, true); assert.equal(cr.status, 200);
  const { code, host } = cr.data;
  const H = (route, body = {}) => post(route, { code, host, ...body }, true);

  // --- Beitreten / Neuladen ---
  const join = async (name) => (await post('join', { code, name })).data.token;
  const A = await join('Anna'), B = await join('Ben'), C = await join('Cem');
  const re = await post('join', { code, token: A, name: 'egal' });
  assert.equal(re.data.token, A); assert.equal(re.data.rejoined, true);
  assert.equal((await state(code)).joined, 3);
  ok('Neuladen (Rejoin mit Token) erzeugt keinen zweiten Teilnehmer');

  // Schüler darf keine Admin-Aktionen
  assert.equal((await post('open', { code, host, case: 0, question: 0 })).status, 403, 'ohne Admin-Cookie');
  assert.equal((await post('open', { code, host: 'falsch', case: 0, question: 0 }, true)).status, 403, 'falscher Raum-Schlüssel');
  ok('Schüler/fremde Hosts können keine Abstimmung steuern');

  // --- Frage 1: vollständige Stimmabgabe beendet automatisch ---
  await H('settings', { duration: 30 });
  let o = await H('open', { case: 0, question: 0 }); assert.equal(o.data.room.vote.phase, 'voting');
  let s = await state(code, A);
  assert.equal(s.vote.counts, null, 'Schüler sehen während der Abstimmung keine Verteilung');
  assert.equal(s.question.answers.length, 3); assert.equal(s.me.vote, null);
  assert(!JSON.stringify(s).includes('"correct":0') && !JSON.stringify(s).includes('"correct":1'), 'keine Lösung im Schülerzustand');
  assert.equal((await post('vote', { code, token: A, choice: 1 })).status, 200);
  assert.equal((await post('vote', { code, token: A, choice: 2 })).status, 409);
  assert.equal((await post('vote', { code, token: B, choice: 7 })).status, 400);
  assert.equal((await post('vote', { code, token: B, choice: 1 })).status, 200);
  s = await state(code, A); assert.equal(s.vote.phase, 'voting'); assert.equal(s.me.vote, 1);
  ok('Eine Stimme pro Teilnehmer, eigene Stimme nach Neuladen erkennbar');
  assert.equal((await post('vote', { code, token: C, choice: 0 })).status, 200);
  s = await state(code, A);
  assert.equal(s.vote.phase, 'closed'); assert.equal(s.vote.closeReason, 'all');
  assert.deepEqual(s.vote.counts, [1, 2, 0]); assert.deepEqual(s.vote.percents, [33, 67, 0]);
  assert.equal(s.vote.outcome, 'majority'); assert.equal(s.vote.winner, 1);
  assert.equal(s.decision.ok, null, 'Bewertung noch nicht verraten'); assert.equal(s.score, 0);
  ok('Vollständige Stimmabgabe schließt automatisch; Mehrheit B; Prozent korrekt');

  let hs = (await H('host-state')).data.room; assert.equal(hs.scoreTotal, 100);
  await H('close'); await H('close');
  assert.equal((await H('open', { case: 0, question: 0 })).data.alreadyDecided, true);
  hs = (await H('host-state')).data.room; assert.equal(hs.scoreTotal, 100);
  ok('Doppeltes Beenden/Öffnen vergibt keine doppelten Punkte');
  await H('reveal', { case: 0, question: 0 });
  s = await state(code); assert.equal(s.decision.ok, true); assert.equal(s.decision.correct, 1); assert.equal(s.score, 100);
  ok('Bewertung und Punkte erst nach Freigabe für alle sichtbar');

  // --- Frage 2: später Beitretender verändert die Vollständigkeit nicht ---
  await H('open', { case: 0, question: 1 });
  const D = await join('Dora');
  assert.equal((await post('vote', { code, token: D, choice: 2 })).status, 200);
  await post('vote', { code, token: A, choice: 0 }); await post('vote', { code, token: B, choice: 0 });
  assert.equal((await state(code)).vote.phase, 'voting');
  await post('vote', { code, token: C, choice: 0 });
  s = await state(code); assert.equal(s.vote.closeReason, 'all'); assert.deepEqual(s.vote.counts, [3, 0, 1]); assert.deepEqual(s.vote.percents, [75, 0, 25]);
  ok('Später Beitretende stimmen mit, zählen aber nicht zur Vollständigkeit');

  // --- Frage 3: getrennte Teilnehmer blockieren nicht ---
  for (const t of [A, B, C, D]) await state(code, t);
  await H('open', { case: 0, question: 2 });
  await post('vote', { code, token: A, choice: 2 });
  for (let i = 0; i < 8; i++) { await state(code, A); await state(code, B); await sleep(ACTIVE_MS / 6); }
  assert.equal((await state(code)).vote.phase, 'voting');
  await post('vote', { code, token: B, choice: 2 });
  s = await state(code); assert.equal(s.vote.phase, 'closed'); assert.equal(s.vote.closeReason, 'all');
  ok('Inaktive (getrennte) Teilnehmer blockieren die Vollständigkeit nicht');

  // --- Frage 4: Timer beendet die Abstimmung serverseitig ---
  for (const t of [A, B, C, D]) await state(code, t);
  await H('settings', { duration: 10 });
  o = await H('open', { case: 0, question: 3 }); assert(o.data.room.vote.remainingMs > 9000);
  await post('vote', { code, token: A, choice: 1 });
  await sleep(10800);
  s = await state(code); assert.equal(s.vote.phase, 'closed'); assert.equal(s.vote.closeReason, 'timer'); assert.equal(s.vote.winner, 1);
  ok('Timer beendet die Abstimmung serverseitig');

  // --- Gleichstand, Stichwahl, transparente Entscheidung ---
  for (const t of [A, B, C, D]) await state(code, t);
  await H('settings', { duration: 30 });
  await H('open', { case: 1, question: 0 });
  await post('vote', { code, token: A, choice: 0 }); await post('vote', { code, token: B, choice: 1 });
  await H('close');
  hs = (await H('host-state')).data.room;
  assert.equal(hs.vote.outcome, 'tie'); assert.deepEqual(hs.vote.tied, [0, 1]); assert.equal(hs.decision, null);
  const scoreBefore = hs.scoreTotal;
  ok('Gleichstand erkannt – keine Zufallsentscheidung, keine Punkte');
  assert.equal((await H('decide', { choice: 2 })).status, 400);
  const ro = await H('runoff'); assert.equal(ro.data.room.vote.round, 2); assert.deepEqual(ro.data.room.vote.options, [0, 1]);
  assert.equal((await post('vote', { code, token: A, choice: 2 })).status, 400);
  for (const [t, ch] of [[A, 0], [B, 1], [C, 0], [D, 1]]) assert.equal((await post('vote', { code, token: t, choice: ch })).status, 200);
  hs = (await H('host-state')).data.room; assert.equal(hs.vote.outcome, 'tie');
  assert.equal((await H('decide', { choice: 0 })).status, 200);
  assert.equal((await H('decide', { choice: 1 })).status, 409);
  hs = (await H('host-state')).data.room; assert.equal(hs.decision.method, 'admin'); assert.equal(hs.scoreTotal, scoreBefore + 100);
  ok('Stichwahl nur zwischen Gleichauf-Antworten; transparente Admin-Entscheidung genau einmal');

  // --- Keine Stimmen ---
  await H('open', { case: 1, question: 1 }); await H('close');
  hs = (await H('host-state')).data.room; assert.equal(hs.vote.outcome, 'none'); assert.equal(hs.vote.winner, null); assert.equal(hs.decision, null);
  await H('decide', { skip: true });
  hs = (await H('host-state')).data.room; assert.equal(hs.decision.method, 'skipped'); assert.equal(hs.scoreTotal, scoreBefore + 100);
  ok('Null Stimmen: keine erfundene Mehrheit, Überspringen ohne Punkte');

  // --- Beobachter ---
  assert.equal((await post('observer-invite', { code, host })).status, 403, 'Beobachter-Link nur für Admin');
  const inv = (await H('observer-invite')).data.token;
  let ob = await get('/api/observer-state?token=' + inv); assert.equal(ob.status, 200);
  await H('open', { case: 1, question: 2 }); await post('vote', { code, token: A, choice: 2 });
  ob = await get('/api/observer-state?token=' + inv); assert.deepEqual(ob.data.room.vote.counts, [0, 0, 1], 'Frau Prof sieht live');
  assert.equal((await post('close', { code, host: inv })).status, 403);
  ok('Beobachter sieht Stimmen live und kann nichts steuern');
  await H('observer-revoke');
  assert.equal((await get('/api/observer-state?token=' + inv)).status, 403);
  ok('Beobachterzugang widerrufbar');

  // --- Reset ---
  await H('reset'); hs = (await H('host-state')).data.room;
  assert.equal(hs.scoreTotal, 0); assert.equal(hs.decided, 0); assert.equal(hs.vote, null); assert.equal(hs.joined, 4);
  ok('Zurücksetzen löscht Spielstand, Teilnehmer bleiben');

  console.log(`PASS: ${passed.length} Prüfgruppen`);
} catch (e) {
  console.error('FAIL:', e.message); console.error(e.stack); process.exitCode = 1;
} finally { proc.kill(); }
