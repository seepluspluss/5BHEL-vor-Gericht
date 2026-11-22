/* Automatischer Selbsttest – wird nur mit index.html?autotest=1 geladen.
 * Spielt das Spiel mehrfach über echte Button-Klicks durch und prüft Ablauf, Punkte, Layout und Ressourcen.
 * Ergebnis: document.title = "AUTOTEST:PASS" bzw. "AUTOTEST:FAIL" und JSON in <pre id="autotest-out">. */
window.__runAutotest = async function (G) {
  var out = { viewport: innerWidth + 'x' + innerHeight, checks: 0, failures: [], runs: [], notes: [] };
  var stage = document.getElementById('stage');
  function ok(c, m) { out.checks++; if (!c && out.failures.length < 60) out.failures.push(m); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function visible(e) {
    if (!e || e.offsetParent === null) return false;
    var cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function desc(e) { return (e.id ? '#' + e.id : e.className) + ' "' + (e.textContent || '').trim().slice(0, 40) + '"'; }
  async function click(target, label) {
    var b = typeof target === 'string' ? document.querySelector(target) : target;
    ok(b && visible(b), 'Button nicht sichtbar: ' + (label || target));
    if (b) b.click();
    await sleep(0);
  }
  var S = function () { return G.state(); };
  var D = G.data;

  function layout(tag) {
    var sr = stage.getBoundingClientRect();
    ok(sr.left >= -1 && sr.top >= -1 && sr.right <= innerWidth + 1 && sr.bottom <= innerHeight + 1, tag + ': Bühne ragt aus dem Fenster');
    var nodes = document.querySelectorAll('#stage button, #stage .fit, #stage .plate, #dialog, #lower, #hud-case-label');
    Array.prototype.forEach.call(nodes, function (e) {
      if (!visible(e)) return;
      var r = e.getBoundingClientRect();
      ok(r.left >= sr.left - 1 && r.right <= sr.right + 1 && r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1, tag + ': außerhalb der Bühne: ' + desc(e));
    });
    Array.prototype.forEach.call(document.querySelectorAll('#stage .fit, #stage .answer-text, #hud-case-label'), function (e) {
      if (!visible(e)) return;
      ok(e.scrollHeight <= e.clientHeight + 2 && e.scrollWidth <= e.clientWidth + 2,
        tag + ': Text abgeschnitten: ' + desc(e) + ' (' + e.scrollHeight + '>' + e.clientHeight + ')');
    });
    // Antworttext darf nicht über den Button hinausragen
    Array.prototype.forEach.call(document.querySelectorAll('.answer'), function (b) {
      if (!visible(b)) return;
      var t = b.querySelector('.answer-text').getBoundingClientRect(), br = b.getBoundingClientRect();
      ok(t.top >= br.top - 1 && t.bottom <= br.bottom + 1, tag + ': Antworttext zu hoch: ' + desc(b));
    });
  }

  // ---------- 1. Inhalte ----------
  ok(D.cases.length === 3, '3 Fälle');
  var total = 0;
  D.cases.forEach(function (cs, ci) {
    ok(cs.questions.length === 4, 'Fall ' + (ci + 1) + ': 4 Fragen');
    ok(cs.intro.length > 0 && cs.outcomes.length === 3, 'Fall ' + (ci + 1) + ': Intro/Ausgänge');
    cs.questions.forEach(function (q, qi) {
      total++;
      var id = 'F' + (ci + 1) + 'Q' + (qi + 1);
      ok(q.answers.length === 3, id + ': 3 Antworten');
      ok(q.correct >= 0 && q.correct <= 2, id + ': gültiger Lösungsindex');
      ok(q.explanation && q.explanation.length > 40, id + ': Erklärung');
      ok(new Set(q.answers).size === 3, id + ': Antworten verschieden');
    });
  });
  ok(total === 12, '12 Fragen insgesamt');

  // ---------- 2. Durchläufe ----------
  var patterns = [
    { name: 'alle richtig', pick: function (g, q) { return q.correct; }, expect: 1200, cases: [400, 400, 400] },
    { name: 'alle falsch', pick: function (g, q) { return (q.correct + 1) % 3; }, expect: 0, cases: [0, 0, 0] },
    { name: 'abwechselnd', pick: function (g, q) { return g % 2 === 0 ? q.correct : (q.correct + 2) % 3; }, expect: 600, cases: [200, 200, 200] },
    { name: 'nur Fall 1 richtig', pick: function (g, q) { return g < 4 ? q.correct : (q.correct + 1) % 3; }, expect: 400, cases: [400, 0, 0] },
    { name: 'fast perfekt', pick: function (g, q) { return g === 11 ? (q.correct + 1) % 3 : q.correct; }, expect: 1100, cases: [400, 400, 300] }
  ];

  for (var pi = 0; pi < patterns.length; pi++) {
    var p = patterns[pi], run = { name: p.name, seen: [], summaries: [] };
    ok(S().scene === 'title', p.name + ': startet beim Titel');
    layout(p.name + '/title');
    await click('#btn-start');
    var guard = 0;
    while (S().scene !== 'final' && guard++ < 300) {
      var sc = S().scene;
      layout(p.name + '/' + sc + '/F' + (S().c + 1) + 'Q' + (S().q + 1));
      if (sc === 'question') {
        var g = S().c * 4 + S().q, q = D.cases[S().c].questions[S().q];
        run.seen.push(g);
        var btns = document.querySelectorAll('.answer');
        ok(btns.length === 3, 'drei Antwortbuttons');
        ok(btns[0].querySelector('.answer-text').textContent === q.answers[0], 'Antworttext korrekt angezeigt');
        var before = S().score, choice = p.pick(g, q);
        await click(btns[choice], 'Antwort ' + choice);
        ok(S().scene === 'explain', p.name + ': Erklärung nach Antwort');
        ok(S().score === before + (choice === q.correct ? 100 : 0), p.name + ': Punkte nach F' + (S().c + 1) + 'Q' + (S().q + 1));
        ok(document.getElementById('explain-text').textContent === q.explanation, 'Erklärung angezeigt');
        ok(document.getElementById('say-sub').textContent.indexOf(q.answers[q.correct]) >= 0, 'richtige Lösung genannt');
        ok(document.getElementById('hud-score-val').textContent === String(S().score).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), 'HUD-Punkte');
        layout(p.name + '/explain/F' + (S().c + 1) + 'Q' + (S().q + 1));
        await click('#btn-next');
      } else if (sc === 'summary') {
        run.summaries.push(document.getElementById('sum-points').textContent);
        await click('#btn-case-next');
      } else {
        await click('#btn-next');
      }
    }
    layout(p.name + '/final');
    var uniq = new Set(run.seen);
    ok(run.seen.length === 12 && uniq.size === 12, p.name + ': alle 12 Fragen genau einmal (' + run.seen.length + ')');
    ok(S().score === p.expect, p.name + ': Gesamtpunkte ' + S().score + ' erwartet ' + p.expect);
    p.cases.forEach(function (cp, ci) {
      ok(run.summaries[ci] === cp + ' / 400 Punkte', p.name + ': Fallauswertung ' + (ci + 1) + ' = ' + run.summaries[ci]);
    });
    var fs = document.getElementById('final-score').textContent;
    ok(fs === String(p.expect).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), p.name + ': Urteil zeigt ' + fs);
    ok(document.getElementById('final-title').textContent === G.tierFor(p.expect).title, p.name + ': passende Urteilsstufe');
    run.final = fs + ' – ' + document.getElementById('final-title').textContent;
    out.runs.push(run.name + ': ' + run.final + ' | Fälle ' + run.summaries.join(', '));
    // Neustart
    await click('#btn-restart');
    ok(S().scene === 'title' && S().score === 0, p.name + ': Neustart setzt zurück');
    ok(S().results.every(function (c) { return c.every(function (r) { return r === null; }); }), p.name + ': Ergebnisse geleert');
    ok(document.getElementById('hud-score-val').textContent === '0', p.name + ': HUD zurückgesetzt');
  }

  // Urteilsstufen-Grenzen
  [[1200, 0], [1100, 1], [1000, 1], [900, 2], [700, 2], [600, 3], [400, 3], [300, 4], [0, 4]].forEach(function (t) {
    ok(G.tierFor(t[0]) === D.finalTiers[t[1]], 'Urteilsstufe für ' + t[0]);
  });

  // ---------- 3. Timer ----------
  await click('#btn-start');
  G.showQuestion(0, 0); await sleep(0);
  ok(visible(document.getElementById('btn-timer')), 'Timer-Button sichtbar');
  await click('#btn-timer');
  ok(G.timer.running && G.timer.remaining === 30, 'Timer läuft (30 s)');
  await sleep(3100);
  ok(G.timer.remaining === 27, 'Timer zählt herunter (' + G.timer.remaining + ')');
  await click(document.querySelectorAll('.answer')[0]);
  ok(!G.timer.running, 'Timer stoppt nach Antwort');
  await click('#btn-next');
  ok(S().scene === 'question' && !G.timer.running, 'Timer startet nicht automatisch');
  await click('#btn-timer'); await sleep(31100);
  ok(G.timer.remaining <= 0 && !G.timer.running, 'Timer endet bei 0');
  ok(S().scene === 'question', 'Timer-Ablauf erzwingt keine Antwort');

  // ---------- 4. Moderator ----------
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); await sleep(0);
  ok(document.body.classList.contains('admin-open'), 'Taste M öffnet Moderator');
  layout('moderator');
  await click('#mod-timer');
  ok(!visible(document.getElementById('btn-timer')), 'Timer deaktivierbar');
  await click('#mod-timer');
  ok(visible(document.getElementById('btn-timer')), 'Timer reaktivierbar');
  var qBefore = S().q;
  await click('#mod-next');
  ok(S().scene === 'explain' && S().results[0][qBefore].skipped, 'Nächste Szene überspringt Frage (0 Punkte)');
  await click('#mod-next');
  ok(S().scene === 'question' && S().q === qBefore + 1, 'Nächste Szene geht weiter');
  await click(document.querySelector('[data-jump="2"]'));
  ok(S().scene === 'intro' && S().c === 2, 'Sprung zu Fall 3');
  await click(document.querySelector('[data-jump="final"]'));
  ok(S().scene === 'final', 'Sprung zum Urteil');
  await click('#mod-reset');
  ok(S().scene === 'final', 'Zurücksetzen braucht Bestätigung');
  await click('#mod-reset');
  ok(S().scene === 'title' && S().score === 0 && !document.body.classList.contains('admin-open'), 'Zurücksetzen funktioniert');

  // Dialog überspringbar (Schreibmaschine)
  ok(document.getElementById('say-text').textContent.length >= 0, 'Dialog vorhanden');

  // ---------- 5. Keine externen Ressourcen ----------
  var ext = performance.getEntriesByType('resource').filter(function (r) { return !/^file:/.test(r.name); });
  ok(ext.length === 0, 'Externe Ressourcen geladen: ' + ext.map(function (r) { return r.name; }).join(', '));
  var html = document.documentElement.outerHTML;
  ok(!/(src|href)\s*=\s*["']https?:/i.test(html), 'Keine http(s)-Verweise im DOM');
  ok(location.protocol === 'file:', 'Läuft über file:// (' + location.protocol + ')');

  out.result = out.failures.length ? 'FAIL' : 'PASS';
  var pre = document.createElement('pre');
  pre.id = 'autotest-out';
  pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
  document.title = 'AUTOTEST:' + out.result;
};
