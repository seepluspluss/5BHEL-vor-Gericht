'use strict';
/* 5BHEL vor Gericht – Live-Server.
 * Der Server ist die einzige verbindliche Quelle für Frage, Abstimmungsstatus, Teilnehmer, Stimmen,
 * Timer-Endzeit, Mehrheitsentscheidung, Punkte und Beobachterrechte. Alle Daten liegen im Arbeitsspeicher.
 * Start: node server.js   (Umgebungsvariable ADMIN_PASSWORD ist Pflicht)
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
let QRCode = null;
try { QRCode = require('qrcode'); } catch { console.warn('Modul "qrcode" fehlt – QR-Codes deaktiviert (npm install).'); }

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) { console.error('ADMIN_PASSWORD fehlt. Setze die Umgebungsvariable in Render.'); process.exit(1); }

// ---------- Spielinhalte (gleiche Datei wie im Browser, nur für Admins ausgeliefert) ----------
function loadGame() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'cases.js'), 'utf8'), sandbox, { filename: 'cases.js' });
  return sandbox.window.GAME_DATA;
}
const GAME = loadGame();
const CASE_TITLES = GAME.cases.map(c => c.title);
const N_CASES = GAME.cases.length, N_Q = 4, PER_Q = GAME.pointsPerQuestion || 100, MAX_SCORE = N_CASES * N_Q * PER_Q;

// ---------- Konstanten ----------
const MAX_ROOMS = 80, MAX_PEOPLE = 150, ROOM_TTL = 6 * 60 * 60 * 1000;
const ACTIVE_MS = Number(process.env.ACTIVE_MS) || 20000; // Teilnehmer gilt als verbunden, wenn er sich innerhalb von 20 s gemeldet hat
const DEFAULT_DURATION = 30, MIN_DURATION = 10, MAX_DURATION = 180;
const OBSERVER_TTL = 4 * 60 * 60 * 1000;

const rooms = new Map();
const sessions = new Map();          // Admin-Sitzungen: token -> Ablaufzeit
const observerInvites = new Map();   // token -> {code, expires}

// ---------- Hilfsfunktionen ----------
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=').slice(0, 2)).filter(x => x.length === 2)); }
function isAdmin(req) { const t = cookies(req).court_admin; return !!t && sessions.has(t) && sessions.get(t) > Date.now(); }
function isHttps(req) { return req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted; }
function send(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', b => { s += b; if (s.length > 8192) { reject(Error('Anfrage zu groß')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { reject(Error('Ungültiges JSON')); } });
    req.on('error', reject);
  });
}
function newCode() { let c; do { c = String(crypto.randomInt(100000, 1000000)); } while (rooms.has(c)); return c; }
const key = (c, q) => c + ':' + q;
const validCQ = (c, q) => Number.isInteger(c) && c >= 0 && c < N_CASES && Number.isInteger(q) && q >= 0 && q < N_Q;
function clampDuration(d) { d = Math.round(Number(d)); return Number.isFinite(d) ? Math.min(MAX_DURATION, Math.max(MIN_DURATION, d)) : DEFAULT_DURATION; }

/** Prozentwerte nach dem Verfahren der größten Reste: Summe ist bei mindestens einer Stimme exakt 100. */
function percents(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map(c => c * 100 / total), base = raw.map(Math.floor);
  let rest = 100 - base.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest > 0) { base[i]++; rest--; } });
  return base;
}

function isActive(p, now) { return now - p.lastSeen <= ACTIVE_MS; }
function activeCount(r, now = Date.now()) { let n = 0; for (const p of r.people.values()) if (isActive(p, now)) n++; return n; }

// ---------- Abstimmungslogik ----------
function openVote(r, c, q, options) {
  const now = Date.now();
  if (r.vote && r.vote.timer) clearTimeout(r.vote.timer);
  const eligible = new Set();
  for (const [t, p] of r.people) if (isActive(p, now)) eligible.add(t);
  r.vote = {
    id: crypto.randomBytes(6).toString('hex'), c, q,
    round: options ? (r.vote && r.vote.c === c && r.vote.q === q ? r.vote.round + 1 : 2) : 1,
    options: options || [0, 1, 2], votes: new Map(), eligible,
    openedAt: now, duration: r.duration, deadline: now + r.duration * 1000,
    phase: 'voting', closeReason: null, counts: null, outcome: null, winner: null, tied: null, timer: null
  };
  scheduleClose(r);
  r.version++;
}
function scheduleClose(r) {
  const v = r.vote;
  if (v.timer) clearTimeout(v.timer);
  v.timer = setTimeout(() => closeVote(r, 'timer'), Math.max(0, v.deadline - Date.now()) + 20);
  v.timer.unref && v.timer.unref();
}
/** Pflichtwähler: bei Abstimmungsbeginn verbunden UND weiterhin verbunden. Später Beitretende zählen nicht zur Vollständigkeit. */
function requiredVoters(r, now = Date.now()) {
  const v = r.vote, req = [];
  for (const t of v.eligible) { const p = r.people.get(t); if (p && isActive(p, now)) req.push(t); }
  return req;
}
function checkComplete(r) {
  const v = r.vote;
  if (!v || v.phase !== 'voting') return;
  const req = requiredVoters(r);
  if (v.votes.size > 0 && req.length > 0 && req.every(t => v.votes.has(t))) closeVote(r, 'all');
}
/** Schließt eine Abstimmung genau einmal (idempotent). Punkte werden nur über recordDecision vergeben. */
function closeVote(r, reason) {
  const v = r.vote;
  if (!v || v.phase !== 'voting') return false;
  if (v.timer) clearTimeout(v.timer);
  v.timer = null;
  v.phase = 'closed'; v.closeReason = reason; v.closedAt = Date.now();
  const counts = [0, 0, 0];
  for (const ch of v.votes.values()) counts[ch]++;
  v.counts = counts;
  const max = Math.max(...v.options.map(i => counts[i]));
  if (max === 0) { v.outcome = 'none'; }
  else {
    const leaders = v.options.filter(i => counts[i] === max);
    if (leaders.length > 1) { v.outcome = 'tie'; v.tied = leaders; }
    else { v.outcome = 'majority'; v.winner = leaders[0]; recordDecision(r, v.c, v.q, leaders[0], v.round > 1 ? 'runoff' : 'majority'); }
  }
  r.version++;
  return true;
}
/** Hält das Ergebnis einer Frage fest – höchstens einmal pro Frage, damit Punkte nie doppelt vergeben werden. */
function recordDecision(r, c, q, chosen, method) {
  const k = key(c, q);
  if (r.decisions.has(k)) return false;
  const correct = GAME.cases[c].questions[q].correct;
  const ok = chosen === correct;
  r.decisions.set(k, { c, q, chosen, method, ok, correct, revealed: false, counts: r.vote && r.vote.counts ? r.vote.counts.slice() : null, at: Date.now() });
  if (ok) r.score += PER_Q;
  r.version++;
  return true;
}

// ---------- Zustandsansichten ----------
function voteView(r, { live }) {
  const v = r.vote;
  if (!v) return null;
  const now = Date.now(), closed = v.phase !== 'voting';
  const showCounts = closed || live;
  const counts = showCounts ? (closed ? v.counts : [0, 1, 2].map(i => [...v.votes.values()].filter(x => x === i).length)) : null;
  return {
    id: v.id, c: v.c, q: v.q, round: v.round, options: v.options, phase: v.phase, closeReason: v.closeReason,
    duration: v.duration, remainingMs: closed ? 0 : Math.max(0, v.deadline - now),
    voted: v.votes.size, required: closed ? null : requiredVoters(r, now).length, eligible: v.eligible.size,
    counts, percents: counts ? percents(counts) : null, total: counts ? counts.reduce((a, b) => a + b, 0) : null,
    outcome: v.outcome, winner: v.winner, tied: v.tied
  };
}
function decisionView(d) {
  if (!d) return null;
  return { c: d.c, q: d.q, chosen: d.chosen, method: d.method, revealed: d.revealed, ok: d.revealed ? d.ok : null, correct: d.revealed ? d.correct : null };
}
function publicState(r, { live = false, admin = false } = {}) {
  const v = r.vote;
  const q = v ? GAME.cases[v.c].questions[v.q] : null;
  const results = [];
  for (let c = 0; c < N_CASES; c++) for (let qi = 0; qi < N_Q; qi++) {
    const d = r.decisions.get(key(c, qi));
    results.push(d ? { method: d.method, revealed: d.revealed, ok: d.revealed || admin ? d.ok : null, chosen: d.revealed || admin ? d.chosen : null } : null);
  }
  const revealedScore = [...r.decisions.values()].reduce((s, d) => s + (d.revealed && d.ok ? PER_Q : 0), 0);
  return {
    code: r.code, version: r.version, closed: r.closed, caseTitles: CASE_TITLES,
    participants: activeCount(r), joined: r.people.size, duration: r.duration,
    scene: r.scene, score: revealedScore, scoreTotal: admin ? r.score : undefined, maxScore: MAX_SCORE, decided: r.decisions.size, results,
    question: v ? { c: v.c, q: v.q, caseTitle: GAME.cases[v.c].title, topic: q.topic, ask: q.ask, answers: q.answers } : null,
    vote: voteView(r, { live }),
    decision: v ? decisionView(r.decisions.get(key(v.c, v.q))) : null
  };
}

// ---------- Aufräumen und Sicherheitsnetz für Timer ----------
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.lastActivity > ROOM_TTL) { if (r.vote && r.vote.timer) clearTimeout(r.vote.timer); rooms.delete(id); continue; }
    if (r.vote && r.vote.phase === 'voting') { if (now >= r.vote.deadline) closeVote(r, 'timer'); else checkComplete(r); }
  }
  for (const [t, exp] of sessions) if (exp < now) sessions.delete(t);
  for (const [t, inv] of observerInvites) if (inv.expires < now || !rooms.has(inv.code)) observerInvites.delete(t);
}, 1000).unref();

// ---------- API ----------
function hostCheck(req, res, r, p) {
  if (!isAdmin(req)) { send(res, 403, { error: 'Nur für angemeldete Moderatoren' }); return false; }
  if (!r) { send(res, 404, { error: 'Raum nicht gefunden' }); return false; }
  if (typeof p.host !== 'string' || p.host !== r.host) { send(res, 403, { error: 'Moderator-Zugriff verweigert' }); return false; }
  r.lastActivity = Date.now();
  return true;
}
const hostReply = (res, r, extra = {}) => send(res, 200, { ...extra, room: publicState(r, { live: true, admin: true }) });

async function api(req, res, url) {
  let p;
  try { p = await body(req); } catch (e) { return send(res, 400, { error: e.message }); }
  const ep = url.pathname.slice(5);

  if (ep === 'admin-login') {
    if (typeof p.password !== 'string' || Buffer.byteLength(p.password) > 512) return send(res, 403, { error: 'Zugriff verweigert' });
    const a = crypto.createHash('sha256').update(p.password).digest(), b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
    if (!crypto.timingSafeEqual(a, b)) return send(res, 403, { error: 'Falsches Moderator-Passwort' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
    res.setHeader('Set-Cookie', `court_admin=${token}; HttpOnly;${isHttps(req) ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=43200`);
    return send(res, 200, { ok: true });
  }
  if (ep === 'admin-logout') {
    const t = cookies(req).court_admin; if (t) sessions.delete(t);
    res.setHeader('Set-Cookie', 'court_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return send(res, 200, { ok: true });
  }
  if (ep === 'create') {
    if (!isAdmin(req)) return send(res, 403, { error: 'Nur für angemeldete Moderatoren' });
    if (rooms.size >= MAX_ROOMS) return send(res, 429, { error: 'Zu viele aktive Räume' });
    const c = newCode(), host = crypto.randomBytes(24).toString('hex'), now = Date.now();
    const r = { code: c, host, created: now, lastActivity: now, people: new Map(), duration: clampDuration(p.duration || DEFAULT_DURATION),
      vote: null, decisions: new Map(), score: 0, scene: { name: 'lobby', c: null, q: null }, closed: false, version: 0 };
    rooms.set(c, r);
    return send(res, 200, { code: c, host, room: publicState(r, { live: true, admin: true }) });
  }

  const r = rooms.get(String(p.code || ''));

  // ----- Schüler -----
  if (ep === 'join') {
    if (!r) return send(res, 404, { error: 'Raum nicht gefunden' });
    if (r.closed) return send(res, 403, { error: 'Diese Verhandlung ist beendet' });
    if (typeof p.token === 'string' && r.people.has(p.token)) { // Wiederverbindung nach Neuladen: gleiche Identität, keine neue Stimme
      const person = r.people.get(p.token); person.lastSeen = Date.now();
      return send(res, 200, { token: p.token, name: person.name, rejoined: true, room: publicState(r) });
    }
    if (r.people.size >= MAX_PEOPLE) return send(res, 429, { error: 'Raum ist voll' });
    const name = String(p.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 32);
    if (!name) return send(res, 400, { error: 'Bitte Namen eingeben' });
    const token = crypto.randomBytes(24).toString('hex'), now = Date.now();
    r.people.set(token, { name, joined: now, lastSeen: now });
    r.lastActivity = now; r.version++;
    return send(res, 200, { token, name, room: publicState(r) });
  }
  if (ep === 'vote') {
    if (!r) return send(res, 404, { error: 'Raum nicht gefunden' });
    const person = r.people.get(p.token);
    if (!person) return send(res, 403, { error: 'Bitte erneut anmelden' });
    person.lastSeen = Date.now();
    const v = r.vote;
    if (!v || v.phase !== 'voting') return send(res, 409, { error: 'Aktuell keine offene Abstimmung' });
    if (typeof p.voteId === 'string' && p.voteId !== v.id) return send(res, 409, { error: 'Diese Abstimmung ist bereits vorbei' });
    if (!Number.isInteger(p.choice) || !v.options.includes(p.choice)) return send(res, 400, { error: 'Ungültige Antwort' });
    if (v.votes.has(p.token)) return send(res, 409, { error: 'Du hast bereits abgestimmt', myVote: v.votes.get(p.token) });
    v.votes.set(p.token, p.choice);
    r.version++;
    checkComplete(r);
    return send(res, 200, { ok: true, myVote: p.choice });
  }

  // ----- Moderator (Admin-Sitzung + Raum-Schlüssel) -----
  if (!hostCheck(req, res, r, p)) return;
  switch (ep) {
    case 'host-state': return hostReply(res, r);
    case 'scene': {
      const name = String(p.name || '').slice(0, 20);
      r.scene = { name, c: Number.isInteger(p.c) ? p.c : null, q: Number.isInteger(p.q) ? p.q : null };
      r.version++; return hostReply(res, r);
    }
    case 'settings': { r.duration = clampDuration(p.duration); r.version++; return hostReply(res, r); }
    case 'open': {
      if (!validCQ(p.case, p.question)) return send(res, 400, { error: 'Ungültige Frage' });
      if (r.decisions.has(key(p.case, p.question)) && !p.force) return hostReply(res, r, { alreadyDecided: true });
      if (r.vote && r.vote.c === p.case && r.vote.q === p.question && r.vote.phase === 'voting' && !p.force) return hostReply(res, r, { alreadyOpen: true });
      if (p.force) r.decisions.delete(key(p.case, p.question)) && recalcScore(r);
      openVote(r, p.case, p.question, null);
      return hostReply(res, r);
    }
    case 'close': {
      if (!r.vote || r.vote.phase !== 'voting') return hostReply(res, r, { alreadyClosed: true });
      closeVote(r, 'admin'); return hostReply(res, r);
    }
    case 'extend': {
      if (!r.vote || r.vote.phase !== 'voting') return send(res, 409, { error: 'Keine offene Abstimmung' });
      const add = Math.min(120, Math.max(5, Math.round(Number(p.seconds) || 15)));
      r.vote.deadline += add * 1000; r.vote.duration += add; scheduleClose(r); r.version++;
      return hostReply(res, r);
    }
    case 'runoff': {
      const v = r.vote;
      if (!v || v.phase !== 'closed' || v.outcome !== 'tie' || r.decisions.has(key(v.c, v.q))) return send(res, 409, { error: 'Keine Stichwahl möglich' });
      openVote(r, v.c, v.q, v.tied.slice());
      return hostReply(res, r);
    }
    case 'decide': {
      const v = r.vote;
      if (!v || v.phase !== 'closed' || r.decisions.has(key(v.c, v.q))) return send(res, 409, { error: 'Keine offene Entscheidung' });
      if (p.skip === true) { recordDecision(r, v.c, v.q, -1, 'skipped'); return hostReply(res, r); }
      if (v.outcome !== 'tie' || !Number.isInteger(p.choice) || !v.tied.includes(p.choice)) return send(res, 400, { error: 'Nur eine der gleichauf liegenden Antworten ist wählbar' });
      recordDecision(r, v.c, v.q, p.choice, 'admin');
      return hostReply(res, r);
    }
    case 'skip': { // Frage ohne Abstimmung überspringen (0 Punkte)
      if (!validCQ(p.case, p.question)) return send(res, 400, { error: 'Ungültige Frage' });
      if (r.vote && r.vote.c === p.case && r.vote.q === p.question && r.vote.phase === 'voting') closeVote(r, 'admin');
      recordDecision(r, p.case, p.question, -1, 'skipped');
      return hostReply(res, r);
    }
    case 'reveal': {
      const d = r.decisions.get(key(p.case, p.question));
      if (!d) return send(res, 409, { error: 'Noch keine Entscheidung' });
      if (!d.revealed) { d.revealed = true; r.version++; }
      return hostReply(res, r);
    }
    case 'reset': {
      if (r.vote && r.vote.timer) clearTimeout(r.vote.timer);
      r.vote = null; r.decisions.clear(); r.score = 0; r.closed = false; r.scene = { name: 'lobby', c: null, q: null }; r.version++;
      return hostReply(res, r);
    }
    case 'observer-invite': {
      for (const [t, v] of observerInvites) if (v.code === r.code) observerInvites.delete(t);
      const token = crypto.randomBytes(24).toString('hex');
      observerInvites.set(token, { code: r.code, expires: Date.now() + OBSERVER_TTL });
      return send(res, 200, { token, expiresInMinutes: OBSERVER_TTL / 60000 });
    }
    case 'observer-revoke': {
      for (const [t, v] of observerInvites) if (v.code === r.code) observerInvites.delete(t);
      return send(res, 200, { ok: true });
    }
    case 'end': {
      if (r.vote && r.vote.phase === 'voting') closeVote(r, 'admin');
      r.closed = true; r.version++; return hostReply(res, r);
    }
  }
  return send(res, 404, { error: 'Unbekannter Endpunkt' });
}
function recalcScore(r) { r.score = [...r.decisions.values()].reduce((s, d) => s + (d.ok ? PER_Q : 0), 0); return true; }

// ---------- HTTP ----------
const PUBLIC_FILES = new Set(['/abstimmen.html', '/login.html', '/beobachten.html', '/css/style.css', '/css/live.css']);
const ADMIN_FILES = new Set(['/index.html', '/css/admin.css', '/css/theme.css', '/js/cases.js', '/js/game.js', '/js/live-host.js', '/js/cinema.js', '/js/audio.js', '/js/autotest.js']);

http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: 'Ungültige URL' }); }
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) return api(req, res, url).catch(() => send(res, 500, { error: 'Serverfehler' }));
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Methode nicht erlaubt' });

  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (url.pathname === '/api/admin-status') return send(res, 200, { admin: isAdmin(req) });
  if (url.pathname === '/api/state') {
    const r = rooms.get(url.searchParams.get('code') || '');
    if (!r) return send(res, 404, { error: 'Raum nicht gefunden' });
    const token = url.searchParams.get('token') || '';
    const person = r.people.get(token);
    const state = publicState(r);
    if (person) {
      person.lastSeen = Date.now();
      const v = r.vote;
      state.me = { name: person.name, vote: v && v.votes.has(token) ? v.votes.get(token) : null, voteId: v ? v.id : null, eligible: v ? v.eligible.has(token) : false };
    }
    return send(res, 200, { room: state });
  }
  if (url.pathname === '/api/observer-state') {
    const inv = observerInvites.get(url.searchParams.get('token') || '');
    if (!inv || inv.expires < Date.now()) return send(res, 403, { error: 'Zugang ungültig, widerrufen oder abgelaufen' });
    const r = rooms.get(inv.code);
    if (!r) return send(res, 404, { error: 'Raum nicht mehr verfügbar' });
    return send(res, 200, { room: publicState(r, { live: true }), expiresAt: inv.expires });
  }
  if (url.pathname === '/api/qr') {
    if (!isAdmin(req)) return send(res, 403, { error: 'Nur für angemeldete Moderatoren' });
    const c = url.searchParams.get('code');
    if (!rooms.has(c)) return send(res, 404, { error: 'Raum nicht gefunden' });
    if (!QRCode) return send(res, 501, { error: 'QR-Modul nicht installiert' });
    const target = `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}/abstimmen.html?code=${encodeURIComponent(c)}`;
    try {
      const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0d1626', light: '#ffffff' } });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(svg);
    } catch { return send(res, 500, { error: 'QR-Code Fehler' }); }
  }

  let filename;
  try { filename = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Ungültiger Pfad' }); }
  if (filename === '/') filename = '/index.html';
  if (ADMIN_FILES.has(filename) && !isAdmin(req)) {
    if (filename === '/index.html') { res.writeHead(302, { Location: '/login.html', 'Cache-Control': 'no-store' }); return res.end(); }
    return send(res, 403, { error: 'Nur für angemeldete Moderatoren' });
  }
  if (!ADMIN_FILES.has(filename) && !PUBLIC_FILES.has(filename)) return send(res, 404, { error: 'Nicht gefunden' });
  const full = path.resolve(root, '.' + filename);
  if (!full.startsWith(root + path.sep)) return send(res, 403, { error: 'Zugriff verweigert' });
  fs.stat(full, (e, s) => {
    if (e || !s.isFile()) return send(res, 404, { error: 'Nicht gefunden' });
    res.writeHead(200, { 'Content-Type': mime[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}).listen(port, '0.0.0.0', () => console.log('5BHEL Live-Abstimmung: http://localhost:' + port));

module.exports = { percents };
