/* 5BHEL VOR GERICHT – Spiellogik (reines JavaScript, offline, ohne Abhängigkeiten). */
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var params = new URLSearchParams(location.search);
  var AUTOTEST = params.has('autotest');
  var SHOT = params.get('shot');
  var INSTANT = AUTOTEST || !!SHOT;
  var LETTERS = ['A', 'B', 'C'];
  var PER_Q = D.pointsPerQuestion;
  var Q_PER_CASE = 4;
  var TIMER_SECONDS = 30;

  var stage = document.getElementById('stage');
  function $(id) { return document.getElementById(id); }
  var el = {
    sayText: $('say-text'), saySub: $('say-sub'), stamp: $('verdict-stamp'),
    btnNext: $('btn-next'), btnTimer: $('btn-timer'), timerLabel: $('timer-label'),
    hudLabel: $('hud-case-label'), hudDots: $('hud-dots'), hudScore: $('hud-score-val'), hudGain: $('hud-score-gain'),
    answers: Array.prototype.slice.call(document.querySelectorAll('.answer')),
    explain: $('explain-text'), banner: $('case-banner'),
    modPanel: $('mod-panel'), modTimer: $('mod-timer'), modReset: $('mod-reset')
  };

  // ---------- Zustand ----------
  var st;
  var timerEnabled = true; // Moderator-Einstellung, bleibt beim Zurücksetzen erhalten
  function freshState() {
    return {
      scene: 'title', c: 0, q: 0, line: 0, score: 0,
      results: D.cases.map(function (cs) { return cs.questions.map(function () { return null; }); })
    };
  }

  function curCase() { return D.cases[st.c]; }
  function curQ() { return curCase().questions[st.q]; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function casePoints(ci) {
    return st.results[ci].reduce(function (s, r) { return s + (r && r.ok ? PER_Q : 0); }, 0);
  }

  // ---------- Skalierung auf das Fenster (16:9, Letterbox) ----------
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var x = (window.innerWidth - 1920 * s) / 2, y = (window.innerHeight - 1080 * s) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  // ---------- Modus / Klassen ----------
  var MODES = ['mode-title', 'mode-opening', 'mode-intro', 'mode-question', 'mode-explain', 'mode-summary', 'mode-final'];
  function setMode(m) {
    if (m !== 'question' && m !== 'explain') $('hearing-cue').classList.remove('active');
    MODES.forEach(function (x) { stage.classList.remove(x); });
    stage.classList.add('mode-' + m);
    stage.classList.toggle('timer-on', timerEnabled);
  }
  function setMood(m) {
    stage.classList.remove('judge-stern', 'judge-pleased');
    if (m) stage.classList.add('judge-' + m);
  }
  function animate(node) {
    if (INSTANT || !node) return;
    node.classList.remove('fade-in'); void node.offsetWidth; node.classList.add('fade-in');
  }

  // ---------- Schreibmaschinen-Dialog (jederzeit überspringbar) ----------
  var tw = { handle: null, full: '', i: 0, done: true };
  function say(text, sub) {
    stopTyping();
    tw.full = text; tw.i = 0; tw.done = false;
    el.saySub.textContent = sub || '';
    el.saySub.style.visibility = 'hidden';
    if (INSTANT) { finishTyping(); return; }
    el.sayText.textContent = '';
    stage.classList.add('speaking');
    tw.handle = setInterval(function () {
      tw.i = Math.min(tw.full.length, tw.i + 2);
      el.sayText.textContent = tw.full.slice(0, tw.i);
      if (tw.i >= tw.full.length) finishTyping();
    }, 26);
  }
  function stopTyping() { if (tw.handle) { clearInterval(tw.handle); tw.handle = null; } }
  function finishTyping() {
    stopTyping();
    el.sayText.textContent = tw.full;
    el.saySub.style.visibility = 'visible';
    tw.done = true;
    stage.classList.remove('speaking');
  }

  // ---------- HUD ----------
  function renderHud() {
    var label;
    if (st.scene === 'opening' || st.scene === 'title') label = 'Eröffnung der Verhandlung';
    else if (st.scene === 'final') label = 'Urteilsverkündung';
    else {
      var cs = curCase();
      label = 'FALL ' + (st.c + 1) + ' · ' + cs.title.toUpperCase();
      if (st.scene === 'question' || st.scene === 'explain') label += ' · Frage ' + (st.q + 1) + '/' + Q_PER_CASE;
    }
    el.hudLabel.textContent = label;
    el.hudScore.textContent = fmt(st.score);
    var html = '';
    for (var ci = 0; ci < D.cases.length; ci++) {
      html += '<span class="grp">';
      for (var qi = 0; qi < Q_PER_CASE; qi++) {
        var r = st.results[ci][qi], cls = 'dot';
        if (r) cls += r.skipped ? ' skip' : (r.ok ? ' ok' : ' bad');
        if ((st.scene === 'question' || st.scene === 'explain') && ci === st.c && qi === st.q) cls += ' cur';
        html += '<span class="' + cls + '"></span>';
      }
      html += '</span>';
    }
    el.hudDots.innerHTML = html;
  }
  function popGain(text) {
    el.hudGain.textContent = text;
    el.hudGain.classList.remove('pop'); void el.hudGain.offsetWidth; el.hudGain.classList.add('pop');
  }

  // ---------- Namensschilder und Akt ----------
  function renderParties() {
    var cs = curCase();
    $('plate-left-sub').textContent = 'für ' + cs.clientFor;
    $('plate-right-sub').textContent = cs.opponent;
    $('file-plaintiff').textContent = cs.parties.plaintiff;
    $('file-defendant').textContent = cs.parties.defendant;
    $('file-subject').textContent = cs.subject;
    $('file-amount').textContent = cs.amount;
    var diff = $('file-diff');
    diff.textContent = cs.difficulty;
    diff.className = 'diff diff-' + cs.difficulty.toLowerCase();
    $('file-client').innerHTML = '';
    var b = document.createElement('b'); b.textContent = 'Die 5BHEL vertritt: ';
    $('file-client').appendChild(b);
    $('file-client').appendChild(document.createTextNode(cs.client + ' (' + (cs.parties.plaintiff === cs.client ? 'klagende' : 'beklagte') + ' Partei)'));
  }
  function resetPlates() {
    $('plate-left-sub').textContent = 'Kanzlei';
    $('plate-right-sub').textContent = '–';
  }

  // ---------- Szenen ----------
  function showTitle() {
    stopTimer(); stopTyping(); stage.classList.remove('speaking', 'show-banner');
    st = freshState();
    resetPlates(); setMood(null);
    setMode('title'); renderHud();
  }

  function showOpening(line) {
    st.scene = 'opening'; st.line = line || 0;
    resetPlates(); setMood(null);
    stage.classList.remove('show-banner');
    setMode('opening'); renderHud();
    say(D.opening[st.line]);
  }

  function showIntro(ci, line) {
    stopTimer();
    st.scene = 'intro'; st.c = ci; st.q = 0; st.line = line || 0;
    renderParties(); setMood(null);
    $('case-banner-kicker').textContent = 'FALL ' + (ci + 1) + ' · ' + curCase().difficulty.toUpperCase();
    $('case-banner-title').textContent = curCase().title;
    stage.classList.toggle('show-banner', st.line === 0);
    setMode('intro'); renderHud();
    if (st.line === 0) animate($('lower-file'));
    say(curCase().intro[st.line]);
  }

  function setHearing(ci, qi, outcome) {
    var item = D.hearing && D.hearing[ci] && D.hearing[ci][qi];
    var cue = $('hearing-cue');
    if (!item) { cue.classList.remove('active'); return; }
    $('hearing-phase').textContent = outcome ? 'REAKTION IM SAAL' : item.phase;
    $('hearing-voice').textContent = outcome ? 'Prof. Lehrner' : item.voice;
    $('hearing-line').textContent = outcome === 'right' ? item.right : outcome === 'wrong' ? item.wrong : item.line;
    cue.classList.add('active');
    cue.classList.remove('cue-pulse'); void cue.offsetWidth; cue.classList.add('cue-pulse');
  }

  function showQuestion(ci, qi) {
    stopTimer();
    st.scene = 'question'; st.c = ci; st.q = qi;
    renderParties(); setMood(null);
    stage.classList.remove('show-banner');
    var q = curQ();
    setHearing(ci, qi);
    el.answers.forEach(function (b, i) {
      b.classList.remove('is-correct', 'is-wrong');
      b.disabled = false;
      b.querySelector('.answer-text').textContent = q.answers[i];
    });
    el.stamp.className = '';
    resetTimerUi();
    setMode('question'); renderHud();
    animate($('lower-answers'));
    say(q.ask);
    window.dispatchEvent(new CustomEvent('game-question', {detail:{c:ci,q:qi}}));
  }

  function answer(i) {
    if (st.scene !== 'question') return;
    finishTyping();
    var q = curQ(), ok = i === q.correct;
    st.results[st.c][st.q] = { chosen: i, ok: ok, skipped: false };
    if (ok) { st.score += PER_Q; popGain('+' + PER_Q); }
    showExplain();
  }

  function skipQuestion() {
    if (st.scene !== 'question') return;
    st.results[st.c][st.q] = { chosen: -1, ok: false, skipped: true };
    showExplain();
  }

  function showExplain() {
    stopTimer();
    st.scene = 'explain';
    var q = curQ(), r = st.results[st.c][st.q], g = st.c * Q_PER_CASE + st.q;
    var reaction, sub;
    var right = LETTERS[q.correct] + ' – ' + q.answers[q.correct];
    if (r.skipped) {
      reaction = D.reactions.skipped; sub = right;
      el.stamp.className = ''; setMood(null);
    } else if (r.ok) {
      reaction = D.reactions.right[g % D.reactions.right.length];
      sub = 'Ihre Antwort ' + right;
      el.stamp.textContent = '✓ RICHTIG · +' + PER_Q; el.stamp.className = 'ok'; setMood('pleased');
    } else {
      reaction = D.reactions.wrong[g % D.reactions.wrong.length];
      sub = 'Richtig ist ' + right;
      el.stamp.textContent = '✗ FALSCH (' + LETTERS[r.chosen] + ') · 0'; el.stamp.className = 'bad'; setMood('stern');
    }
    setHearing(st.c, st.q, r.skipped ? 'wrong' : (r.ok ? 'right' : 'wrong'));
    el.explain.textContent = q.explanation;
    setMode('explain'); renderHud();
    animate($('lower-explain'));
    say(reaction, sub);
  }

  function showSummary(ci) {
    stopTimer(); stopTyping(); stage.classList.remove('speaking');
    st.scene = 'summary'; st.c = ci;
    renderParties();
    var cs = curCase(), pts = casePoints(ci);
    $('sum-kicker').textContent = 'FALL ' + (ci + 1) + ' ABGESCHLOSSEN';
    $('sum-title').textContent = cs.title;
    $('sum-points').textContent = fmt(pts) + ' / ' + fmt(PER_Q * Q_PER_CASE) + ' Punkte';
    var list = $('sum-list'); list.innerHTML = '';
    cs.questions.forEach(function (q, qi) {
      var r = st.results[ci][qi];
      var li = document.createElement('li');
      var t = document.createElement('span'); t.textContent = (qi + 1) + '. ' + q.topic;
      var m = document.createElement('span');
      if (!r) { m.className = 'sum-mark skip'; m.textContent = '– offen'; }
      else if (r.skipped) { m.className = 'sum-mark skip'; m.textContent = '– übersprungen'; }
      else if (r.ok) { m.className = 'sum-mark ok'; m.textContent = '✓ +' + PER_Q; }
      else { m.className = 'sum-mark bad'; m.textContent = '✗ 0'; }
      li.appendChild(t); li.appendChild(m); list.appendChild(li);
    });
    var oi = pts >= 300 ? 0 : (pts >= 200 ? 1 : 2);
    $('sum-outcome').textContent = cs.outcomes[oi];
    $('btn-case-next').textContent = ci < D.cases.length - 1 ? 'NÄCHSTEN FALL AUFRUFEN' : 'ZUR URTEILSVERKÜNDUNG';
    setMood(null);
    setMode('summary'); renderHud();
    animate(document.querySelector('.summary-card'));
  }

  function tierFor(score) {
    for (var i = 0; i < D.finalTiers.length; i++) if (score >= D.finalTiers[i].min) return D.finalTiers[i];
    return D.finalTiers[D.finalTiers.length - 1];
  }

  function showFinal() {
    stopTimer(); stopTyping(); stage.classList.remove('speaking', 'show-banner');
    st.scene = 'final';
    var t = tierFor(st.score);
    $('final-score').textContent = fmt(st.score);
    $('final-title').textContent = t.title;
    $('final-text').textContent = t.text;
    $('final-cases').innerHTML = '';
    D.cases.forEach(function (cs, ci) {
      var s = document.createElement('span');
      s.textContent = 'Fall ' + (ci + 1) + ': ' + casePoints(ci) + ' / 400';
      $('final-cases').appendChild(s);
    });
    var tk = $('takeaways'); tk.innerHTML = '';
    D.takeaways.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; tk.appendChild(li); });
    resetPlates(); setMood(null);
    setMode('final'); renderHud();
    animate(document.querySelector('.verdict-paper'));
  }

  // ---------- Ablaufsteuerung ----------
  function next() {
    switch (st.scene) {
      case 'title': showOpening(0); break;
      case 'opening':
        if (st.line + 1 < D.opening.length) showOpening(st.line + 1); else showIntro(0, 0);
        break;
      case 'intro':
        if (st.line + 1 < curCase().intro.length) showIntro(st.c, st.line + 1); else showQuestion(st.c, 0);
        break;
      case 'question': skipQuestion(); break; // nur über Moderator erreichbar
      case 'explain':
        if (st.q + 1 < Q_PER_CASE) showQuestion(st.c, st.q + 1); else showSummary(st.c);
        break;
      case 'summary':
        if (st.c + 1 < D.cases.length) showIntro(st.c + 1, 0); else showFinal();
        break;
      case 'final': break;
    }
  }

  function onNext() {
    if (!tw.done) { finishTyping(); return; } // erster Klick: Text vollständig anzeigen
    next();
  }

  // ---------- Beratungstimer ----------
  var timer = { handle: null, remaining: TIMER_SECONDS, running: false };
  function resetTimerUi() {
    el.btnTimer.className = 'btn-timer';
    el.timerLabel.textContent = '⏱ Beratung ' + TIMER_SECONDS + ' s';
    timer.remaining = TIMER_SECONDS;
  }
  function renderTimer() {
    var r = timer.remaining;
    el.timerLabel.textContent = r > 0 ? '0:' + (r < 10 ? '0' : '') + r : 'Zeit! Bitte wählen';
    el.btnTimer.classList.toggle('urgent', r > 0 && r <= 10);
    el.btnTimer.classList.toggle('done', r <= 0);
  }
  function startTimer() {
    stopTimer();
    timer.remaining = TIMER_SECONDS; timer.running = true;
    el.btnTimer.classList.add('running');
    renderTimer();
    timer.handle = setInterval(function () {
      timer.remaining -= 1;
      renderTimer();
      if (timer.remaining <= 0) { clearInterval(timer.handle); timer.handle = null; timer.running = false; }
    }, 1000);
  }
  function stopTimer() {
    if (timer.handle) clearInterval(timer.handle);
    timer.handle = null; timer.running = false;
  }
  function onTimerClick() {
    if (timer.running) { stopTimer(); resetTimerUi(); } // erneuter Klick bricht ab
    else startTimer();
  }
  function setTimerEnabled(on) {
    timerEnabled = on;
    if (!on) { stopTimer(); resetTimerUi(); }
    stage.classList.toggle('timer-on', on);
    el.modTimer.textContent = '⏱ Timer: ' + (on ? 'AN' : 'AUS');
  }

  // ---------- Vollbild ----------
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* z. B. in eingeschränkten Umgebungen – F11 funktioniert weiterhin */ }
  }

  // ---------- Moderator ----------
  var resetArmed = null;
  function toggleMod(force) {
    var open = typeof force === 'boolean' ? force : !stage.classList.contains('mod-open');
    stage.classList.toggle('mod-open', open);
    disarmReset();
  }
  function disarmReset() {
    if (resetArmed) clearTimeout(resetArmed);
    resetArmed = null;
    el.modReset.classList.remove('armed');
    el.modReset.textContent = '↺ Spiel zurücksetzen';
  }
  function onModReset() {
    if (!resetArmed) {
      el.modReset.classList.add('armed');
      el.modReset.textContent = '↺ Wirklich zurücksetzen? Nochmal klicken';
      resetArmed = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset(); toggleMod(false); showTitle();
  }
  function onModNext() {
    if (st.scene === 'title') { showOpening(0); return; }
    finishTyping(); next();
  }
  function onJump(target) {
    if (target === 'opening') showOpening(0);
    else if (target === 'final') showFinal();
    else showIntro(parseInt(target, 10), 0);
  }

  // ---------- Ereignisse ----------
  $('btn-start').addEventListener('click', function () { showOpening(0); });
  el.btnNext.addEventListener('click', onNext);
  $('dialog-body').addEventListener('click', function () { if (!tw.done) finishTyping(); });
  el.answers.forEach(function (b) {
    b.addEventListener('click', function () { if (window.__liveVotingActive && window.__liveVotingActive()) return; answer(parseInt(b.getAttribute('data-i'), 10)); });
  });
  el.btnTimer.addEventListener('click', onTimerClick);
  $('btn-case-next').addEventListener('click', next);
  $('btn-restart').addEventListener('click', showTitle);
  $('btn-fs-hud').addEventListener('click', toggleFullscreen);
  $('btn-fs-title').addEventListener('click', toggleFullscreen);
  $('mod-toggle').addEventListener('click', function () { toggleMod(); });
  $('mod-close').addEventListener('click', function () { toggleMod(false); });
  $('mod-next').addEventListener('click', onModNext);
  el.modTimer.addEventListener('click', function () { setTimerEnabled(!timerEnabled); });
  $('mod-fs').addEventListener('click', toggleFullscreen);
  el.modReset.addEventListener('click', onModReset);
  Array.prototype.forEach.call(document.querySelectorAll('[data-jump]'), function (b) {
    b.addEventListener('click', function () { onJump(b.getAttribute('data-jump')); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'm' || e.key === 'M') { toggleMod(); return; }
    if (e.key === 'Escape') { toggleMod(false); return; }
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
      if (e.target && e.target.tagName === 'BUTTON' && e.key !== 'ArrowRight') return; // Button-Fokus: Browser löst Klick aus
      if (st.scene === 'opening' || st.scene === 'intro' || st.scene === 'explain') { e.preventDefault(); onNext(); }
      else if (st.scene === 'summary') { e.preventDefault(); next(); }
    }
  });

  // ---------- Start ----------
  showTitle();
  fit();

  // Test-Schnittstelle (nur für automatisierte Prüfungen)
  window.__game = {
    state: function () { return st; }, data: D, tierFor: tierFor, timer: timer,
    showOpening: showOpening, showIntro: showIntro, showQuestion: showQuestion, answer: answer,
    showSummary: showSummary, showFinal: showFinal, setTimerEnabled: setTimerEnabled, toggleMod: toggleMod
  };

  // Screenshot-Voreinstellungen: index.html?shot=question&c=1&q=2
  if (SHOT) {
    var c = parseInt(params.get('c') || '0', 10), q = parseInt(params.get('q') || '0', 10);
    var fillTo = function (ci, qi, ok) {
      for (var a = 0; a < D.cases.length; a++) for (var b = 0; b < Q_PER_CASE; b++) {
        if (a < ci || (a === ci && b < qi)) {
          var good = ok === undefined ? (a + b) % 3 !== 2 : ok;
          st.results[a][b] = { chosen: good ? D.cases[a].questions[b].correct : (D.cases[a].questions[b].correct + 1) % 3, ok: good, skipped: false };
          if (good) st.score += PER_Q;
        }
      }
    };
    if (SHOT === 'opening') showOpening(0);
    else if (SHOT === 'intro') { fillTo(c, 0); showIntro(c, 0); }
    else if (SHOT === 'question') { fillTo(c, q); showQuestion(c, q); }
    else if (SHOT === 'right' || SHOT === 'wrong') {
      fillTo(c, q); showQuestion(c, q);
      var cq = D.cases[c].questions[q].correct;
      answer(SHOT === 'right' ? cq : (cq + 1) % 3);
    }
    else if (SHOT === 'summary') { fillTo(c, Q_PER_CASE); showSummary(c); }
    else if (SHOT === 'final') { fillTo(D.cases.length, 0); showFinal(); }
    else if (SHOT === 'mod') { fillTo(c, q); showQuestion(c, q); toggleMod(true); }
    else if (SHOT === 'timer') { fillTo(c, q); showQuestion(c, q); startTimer(); timer.remaining = 12; renderTimer(); stopTimer(); el.btnTimer.classList.add('running'); }
  }

  if (AUTOTEST) {
    var s = document.createElement('script');
    s.src = 'js/autotest.js';
    s.onload = function () { window.__runAutotest(window.__game); };
    s.onerror = function () { document.title = 'AUTOTEST:FAIL autotest.js fehlt'; };
    document.body.appendChild(s);
  }
})();
