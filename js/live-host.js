/* 5BHEL VOR GERICHT – Spielleitung (Admin) und Live-Abstimmung auf der Beamer-Seite.
 * Der Server entscheidet verbindlich über Abstimmungsende, Mehrheit und Punkte; diese Datei zeigt nur an und
 * sendet Admin-Befehle. Ohne Server (index.html per Doppelklick) bleibt das Spiel als Einzelspieler-Version nutzbar. */
(function () {
  'use strict';
  var G = window.__game, D = window.GAME_DATA;
  var SERVER = /^https?:$/.test(location.protocol);
  var LETTERS = ['A', 'B', 'C'];
  var STORE = '5bhel-host-room';
  var MIN_RESULT_MS = 3000, AUTO_RESULT_MS = 8000;
  function $(id) { return document.getElementById(id); }
  var stage = $('stage');

  var room = null;          // {code, host}
  var S = null;             // letzter Serverzustand (Admin-Sicht)
  var pollHandle = null, pollBusy = false, deadlineLocal = 0;
  var presentedKey = '', resultShownAt = 0, autoHandle = null, continuing = false;
  var lastScene = '', lastVoted = { id: '', n: 0 };

  if (!SERVER) document.documentElement.classList.add('offline');

  // ---------- Server-Kommunikation ----------
  function api(ep, data) {
    var payload = Object.assign({ code: room && room.code, host: room && room.host }, data || {});
    return fetch('/api/' + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 403 && /Moderatoren/.test(j.error || '')) { status('Anmeldung abgelaufen – bitte neu anmelden.'); setTimeout(function () { location.href = '/login.html'; }, 1500); }
          if (!r.ok) throw Error(j.error || 'Serverfehler');
          if (j.room) onState(j.room);
          return j;
        });
      });
  }
  function status(t) { $('ap-status').textContent = t || ''; }

  // ---------- Raum ----------
  function createRoom() {
    status('Raum wird erstellt …');
    fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: Number($('ap-duration').value) }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw Error(j.error || 'Fehler'); return j; }); })
      .then(function (j) {
        room = { code: j.code, host: j.host };
        try { localStorage.setItem(STORE, JSON.stringify(room)); } catch (e) {}
        attach(j.room);
        status('Raum erstellt. QR-Code ist auf dem Startbildschirm sichtbar.');
      })
      .catch(function (e) { status(e.message); });
  }
  function attach(state) {
    document.documentElement.classList.add('live-room');
    var link = location.origin + '/abstimmen.html?code=' + room.code;
    $('ap-code').textContent = room.code;
    $('ap-link').textContent = link.replace(/^https?:\/\//, '');
    $('ap-link').href = link;
    $('join-code').textContent = room.code;
    $('join-url').textContent = location.host + '/abstimmen.html';
    var qr = '/api/qr?code=' + encodeURIComponent(room.code);
    $('ap-qr').src = qr; $('join-qr').src = qr;
    onState(state);
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = setInterval(poll, 700);
  }
  function poll() {
    if (!room || pollBusy) return;
    pollBusy = true;
    api('host-state').then(function () { $('ap-conn').textContent = '● verbunden'; $('ap-conn').className = 'ap-conn ok'; })
      .catch(function (e) {
        $('ap-conn').textContent = '● Verbindung unterbrochen'; $('ap-conn').className = 'ap-conn bad';
        if (/Raum nicht gefunden/.test(e.message)) dropRoom('Der Raum existiert nicht mehr (Server-Neustart?). Bitte neu erstellen.');
      })
      .then(function () { pollBusy = false; });
  }
  function dropRoom(msg) {
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = null; room = null; S = null;
    try { localStorage.removeItem(STORE); } catch (e) {}
    document.documentElement.classList.remove('live-room');
    hideResult();
    status(msg || '');
  }

  // ---------- Zustand anzeigen ----------
  function onState(s) {
    S = s;
    var v = s.vote;
    if (v && v.phase === 'voting') deadlineLocal = Date.now() + v.remainingMs;
    renderPanel(s);
    renderStage(s);
    handleFlow(s);
  }

  function renderPanel(s) {
    var v = s.vote;
    $('ap-people').textContent = s.participants + ' verbunden · ' + s.joined + ' beigetreten';
    $('hud-live-text').textContent = 'Code ' + s.code + ' · ' + s.participants + ' verbunden';
    $('ap-score').textContent = (s.scoreTotal != null ? s.scoreTotal : s.score) + ' / ' + s.maxScore + ' Punkte · ' + s.decided + ' von 12 entschieden';
    var vs = 'Keine Abstimmung aktiv.';
    if (v) {
      var label = 'Fall ' + (v.c + 1) + ' · Frage ' + (v.q + 1) + (v.round > 1 ? ' · Stichwahl' : '');
      if (v.phase === 'voting') vs = label + ': läuft – ' + v.voted + ' von ' + v.required + ' Stimmen' + (v.voted > v.required ? ' (inkl. Nachzügler)' : '');
      else if (v.outcome === 'majority') vs = label + ': beendet (' + reasonText(v.closeReason) + ') – Mehrheit ' + LETTERS[v.winner];
      else if (v.outcome === 'tie') vs = label + ': Gleichstand ' + v.tied.map(function (i) { return LETTERS[i]; }).join(' / ') + (s.decision ? ' – entschieden' : ' – Entscheidung nötig');
      else vs = label + ': keine Stimmen abgegeben';
    }
    $('ap-vote').textContent = vs;
    var voting = !!(v && v.phase === 'voting');
    $('ap-close').disabled = !voting; $('ap-extend').disabled = !voting;
    // Live-Verteilung nur auf Wunsch (sonst beeinflusst der offene Beamer die Klasse)
    var show = $('ap-showdist').checked && v && v.counts;
    $('ap-dist').hidden = !show;
    if (show) {
      var tot = v.counts.reduce(function (a, b) { return a + b; }, 0) || 1;
      [0, 1, 2].forEach(function (i) {
        $('ap-bar-' + i).style.width = (100 * v.counts[i] / tot) + '%';
        $('ap-cnt-' + i).textContent = v.counts[i];
      });
    }
  }
  function reasonText(r) { return r === 'timer' ? 'Zeit abgelaufen' : r === 'all' ? 'alle haben abgestimmt' : 'durch Spielleitung'; }

  function renderStage(s) {
    var v = s.vote, gs = G.state();
    var here = v && gs.scene === 'question' && gs.c === v.c && gs.q === v.q;
    var voting = here && v.phase === 'voting';
    stage.classList.toggle('live-voting', !!voting);
    stage.classList.toggle('live-mode', true);
    if (voting) {
      if (lastVoted.id === v.id && v.voted > lastVoted.n) window.dispatchEvent(new CustomEvent('vote-received', { detail: { voted: v.voted } }));
      lastVoted = { id: v.id, n: v.voted };
      $('lv-label').textContent = v.round > 1 ? 'STICHWAHL · nur ' + v.options.map(function (i) { return LETTERS[i]; }).join(' oder ') : 'JETZT AM HANDY ABSTIMMEN';
      $('lv-count').textContent = v.voted + ' / ' + Math.max(v.required, v.voted) + ' Stimmen';
      document.querySelectorAll('.answer').forEach(function (b, i) { b.classList.toggle('dimmed', v.options.indexOf(i) < 0); });
    } else {
      document.querySelectorAll('.answer').forEach(function (b) { b.classList.remove('dimmed'); });
    }
  }
  // flüssiger Countdown zwischen zwei Abfragen
  setInterval(function () {
    if (!S || !S.vote || S.vote.phase !== 'voting') return;
    var left = Math.max(0, deadlineLocal - Date.now()), sec = Math.ceil(left / 1000);
    var total = S.vote.duration * 1000;
    if (String(sec) !== $('lv-sec').textContent) window.dispatchEvent(new CustomEvent('vote-countdown', { detail: { sec: sec } }));
    $('lv-sec').textContent = sec;
    $('lv-ring').style.strokeDashoffset = String(276.5 * (1 - left / total));
    $('live-vote').classList.toggle('urgent', sec <= 10);
    $('ap-timeleft').textContent = sec + ' s';
  }, 200);

  // ---------- Ablauf: Abstimmung → Ergebnisphase → Bewertung ----------
  window.addEventListener('game-question', function (e) {
    if (!room) return;
    hideResult();
    api('open', { case: e.detail.c, question: e.detail.q }).catch(function (err) { status(err.message); });
  });
  window.addEventListener('game-scene', function (e) {
    if (!room) return;
    var d = e.detail, k = d.name + ':' + d.c + ':' + d.q;
    if (k === lastScene) return;
    lastScene = k;
    api('scene', { name: d.name, c: d.c, q: d.q }).catch(function () {});
  });

  function handleFlow(s) {
    var v = s.vote, gs = G.state();
    if (!v || gs.scene !== 'question' || gs.c !== v.c || gs.q !== v.q) return;
    if (v.phase === 'voting') { if (stage.classList.contains('show-vote-result')) hideResult(); return; } // z. B. Stichwahl oder Neustart
    var k = v.id + (s.decision ? ':' + s.decision.method : ':open');
    if (k === presentedKey) return;
    var afterTie = presentedKey === v.id + ':open';
    presentedKey = k;
    showResult(s);
    var d = s.decision;
    window.dispatchEvent(new CustomEvent('vote-result', { detail: { kind: !d ? v.outcome : d.method === 'skipped' ? 'skipped' : afterTie ? 'decided' : 'decision' } }));
  }

  function showResult(s) {
    var v = s.vote, d = s.decision, q = D.cases[v.c].questions[v.q];
    var ov = $('vote-result');
    var tot = v.total || 0;
    clearTimeout(autoHandle);
    $('vr-kicker').textContent = v.round > 1 ? 'ERGEBNIS DER STICHWAHL' : 'DIE KLASSE HAT ENTSCHIEDEN';
    $('vr-total').textContent = tot + (tot === 1 ? ' Stimme' : ' Stimmen') + ' · ' + reasonText(v.closeReason);
    [0, 1, 2].forEach(function (i) {
      var row = $('vr-row-' + i), inRound = v.options.indexOf(i) >= 0;
      row.className = 'vr-row' + (inRound ? '' : ' out') + ((d && d.chosen === i) || (!d && v.winner === i) ? ' win' : '') + (v.tied && v.tied.indexOf(i) >= 0 ? ' tied' : '');
      row.querySelector('.vr-text').textContent = q.answers[i];
      row.querySelector('.vr-num').textContent = v.counts[i] + (v.counts[i] === 1 ? ' Stimme' : ' Stimmen') + ' · ' + v.percents[i] + ' %';
      var fill = row.querySelector('.vr-fill');
      fill.style.transition = 'none'; fill.style.width = '0%';
      void fill.offsetWidth;
      fill.style.transition = ''; fill.style.width = v.percents[i] + '%';
    });
    var verdict = $('vr-verdict'), actions = $('vr-actions');
    actions.replaceChildren();
    verdict.className = 'vr-verdict';
    if (d && d.method !== 'skipped') {
      verdict.textContent = d.method === 'admin' ? 'GLEICHSTAND – ENTSCHEIDUNG DER SPIELLEITUNG: ' + LETTERS[d.chosen] : 'MEHRHEITSENTSCHEIDUNG: ' + LETTERS[d.chosen];
      verdict.classList.add('show');
      actions.append(button('Weiter ▸', 'vr-continue', continueToJudge, true));
      resultShownAt = Date.now();
      autoHandle = setTimeout(continueToJudge, AUTO_RESULT_MS);
      $('vr-hint').textContent = 'Prof. Lehrner bewertet die Entscheidung gleich …';
    } else if (d && d.method === 'skipped') {
      verdict.textContent = 'FRAGE ÜBERSPRUNGEN';
      verdict.classList.add('show');
      actions.append(button('Weiter ▸', 'vr-continue', continueToJudge, true));
      resultShownAt = 0;
      $('vr-hint').textContent = '';
    } else if (v.outcome === 'tie') {
      var tl = v.tied.map(function (i) { return LETTERS[i]; });
      verdict.textContent = 'GLEICHSTAND: ' + tl.join(' UND ');
      verdict.classList.add('show', 'tie');
      actions.append(button('Stichwahl ' + tl.join(' / ') + ' starten', '', function () { api('runoff').catch(function (e) { status(e.message); }); }, true));
      v.tied.forEach(function (i) {
        actions.append(button('Spielleitung wählt ' + LETTERS[i], '', function () { api('decide', { choice: i }).catch(function (e) { status(e.message); }); }));
      });
      $('vr-hint').textContent = 'Keine Zufallsentscheidung: Stichwahl oder offene Entscheidung der Spielleitung.';
    } else {
      verdict.textContent = 'KEINE STIMMEN ABGEGEBEN';
      verdict.classList.add('show', 'tie');
      actions.append(button('Abstimmung neu starten', '', function () { api('open', { case: v.c, question: v.q, force: true }).catch(function (e) { status(e.message); }); }, true));
      actions.append(button('Frage überspringen (0 Punkte)', '', function () { api('decide', { skip: true }).catch(function (e) { status(e.message); }); }));
      $('vr-hint').textContent = 'Ohne Stimmen wird keine Mehrheit angenommen.';
    }
    stage.classList.add('show-vote-result');
  }
  function button(label, id, fn, primary) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label; if (id) b.id = id;
    b.className = primary ? 'btn-primary' : 'btn-ghost vr-alt';
    b.addEventListener('click', fn);
    return b;
  }
  function hideResult() { clearTimeout(autoHandle); stage.classList.remove('show-vote-result'); }

  function continueToJudge() {
    if (!S || !S.vote || !S.decision || continuing) return;
    var wait = MIN_RESULT_MS - (Date.now() - resultShownAt);
    if (resultShownAt && wait > 0 && !continueToJudge.forced) { clearTimeout(autoHandle); autoHandle = setTimeout(continueToJudge, wait); return; }
    continuing = true;
    var v = S.vote;
    api('reveal', { case: v.c, question: v.q }).then(function (j) {
      var d = j.room.decision;
      hideResult();
      G.applyDecision({ c: v.c, q: v.q, chosen: d.chosen, ok: d.ok, method: d.method, score: j.room.score });
    }).catch(function (e) { status(e.message); }).then(function () { continuing = false; });
  }

  // Moderator „Nächste Szene“ in der Frage: Abstimmung beenden bzw. weiter
  window.__live = {
    active: function () { return !!room; },
    handleNext: function () {
      if (!room) return false;
      var gs = G.state();
      if (stage.classList.contains('show-vote-result')) { continueToJudge.forced = true; continueToJudge(); continueToJudge.forced = false; return true; }
      if (gs.scene !== 'question') return false;
      var v = S && S.vote;
      if (v && v.c === gs.c && v.q === gs.q && v.phase === 'voting') { api('close').catch(function (e) { status(e.message); }); return true; }
      if (!v || v.c !== gs.c || v.q !== gs.q) { api('skip', { case: gs.c, question: gs.q }).catch(function (e) { status(e.message); }); return true; }
      return true; // Gleichstand/keine Stimmen: Entscheidung über die Buttons
    },
    resetRoom: function () { if (room) { presentedKey = ''; hideResult(); api('reset').catch(function () {}); } }
  };
  window.__liveVotingActive = function () { return !!room; };

  document.addEventListener('keydown', function (e) {
    if (!stage.classList.contains('show-vote-result')) return;
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      var b = $('vr-continue');
      if (b) { e.preventDefault(); e.stopImmediatePropagation(); continueToJudge.forced = true; continueToJudge(); continueToJudge.forced = false; }
    }
  }, true);

  // ---------- Panel-Bedienelemente ----------
  $('ap-create').addEventListener('click', createRoom);
  $('ap-close').addEventListener('click', function () { api('close').catch(function (e) { status(e.message); }); });
  $('ap-extend').addEventListener('click', function () { api('extend', { seconds: 15 }).catch(function (e) { status(e.message); }); });
  $('ap-duration').addEventListener('change', function () { if (room) api('settings', { duration: Number($('ap-duration').value) }).then(function () { status('Abstimmungsdauer: ' + $('ap-duration').value + ' s (ab der nächsten Frage)'); }).catch(function (e) { status(e.message); }); });
  $('ap-showdist').addEventListener('change', function () { if (S) renderPanel(S); });
  $('ap-copy').addEventListener('click', function () { copy($('ap-link').href, 'Teilnehmer-Link kopiert.'); });
  $('ap-joincard').addEventListener('change', function () { stage.classList.toggle('force-join', $('ap-joincard').checked); });
  $('ap-obs-create').addEventListener('click', function () {
    api('observer-invite').then(function (j) {
      var url = location.origin + '/beobachten.html?token=' + encodeURIComponent(j.token);
      $('ap-obs-link').value = url; $('ap-obs').hidden = false;
      status('Beobachter-Link erstellt (gültig ' + Math.round(j.expiresInMinutes / 60) + ' h). Nur an Frau Prof senden.');
    }).catch(function (e) { status(e.message); });
  });
  $('ap-obs-copy').addEventListener('click', function () { copy($('ap-obs-link').value, 'Beobachter-Link kopiert.'); });
  $('ap-obs-revoke').addEventListener('click', function () {
    api('observer-revoke').then(function () { $('ap-obs').hidden = true; $('ap-obs-link').value = ''; status('Beobachterzugang widerrufen.'); }).catch(function (e) { status(e.message); });
  });
  $('ap-endroom').addEventListener('click', function () {
    if (!room) return;
    if (!confirm('Raum endgültig schließen? Schüler können danach nicht mehr abstimmen.')) return;
    api('end').then(function () { dropRoom('Raum geschlossen.'); }).catch(function (e) { status(e.message); });
  });
  $('ap-logout').addEventListener('click', function () {
    fetch('/api/admin-logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(function () { location.href = '/login.html'; });
  });
  function copy(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { status(msg); }, function () { status(text); });
    else status(text);
  }

  // ---------- Wiederherstellen nach Neuladen ----------
  if (SERVER) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
    if (saved && saved.code && saved.host) {
      room = saved;
      fetch('/api/host-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(room) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw Error(j.error); return j.room; }); })
        .then(function (s) {
          attach(s);
          G.restore(s.results, s.score);
          var v = s.vote;
          if (v) {
            G.showQuestion(v.c, v.q);
            if (s.decision && s.decision.revealed) G.applyDecision({ c: v.c, q: v.q, chosen: s.decision.chosen, ok: s.decision.ok, method: s.decision.method, score: s.score });
          }
          status('Verbindung zum laufenden Raum ' + s.code + ' wiederhergestellt.');
        })
        .catch(function () { room = null; dropRoom('Gespeicherter Raum nicht mehr verfügbar.'); });
    }
  }
})();
