/* 5BHEL VOR GERICHT – Filmische Fall-Einführungen (animierte 2D-Szenen aus SVG + CSS, ohne Ton, offline).
 * Je Fall 5 Einstellungen à 4,8 s (≈ 25 s). Überspringbar per Button, Enter oder Moderator. */
(function () {
  'use strict';
  var SHOT_MS = 4800, FADE_MS = 700;
  var stage = document.getElementById('stage');
  var film = document.getElementById('cinema-film'), cap = document.getElementById('cinema-caption');
  var bar = document.getElementById('cinema-progress-fill'), skipBtn = document.getElementById('cinema-skip');
  if (!film) return;

  // ---------- Zeichen-Bausteine ----------
  function defs() {
    return '<defs>' +
      '<linearGradient id="cSkyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1530"/><stop offset=".55" stop-color="#2a3a68"/><stop offset=".8" stop-color="#c0785a"/><stop offset="1" stop-color="#f1b86f"/></linearGradient>' +
      '<linearGradient id="cNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070c1a"/><stop offset="1" stop-color="#18264a"/></linearGradient>' +
      '<linearGradient id="cRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1420"/><stop offset="1" stop-color="#3a2420"/></linearGradient>' +
      '<radialGradient id="cLampGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd896" stop-opacity=".65"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cVig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>' +
      '<linearGradient id="cGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc9a"/><stop offset="1" stop-color="#b0823a"/></linearGradient>' +
      '<linearGradient id="cPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf6ea"/><stop offset="1" stop-color="#ece2cb"/></linearGradient>' +
      '</defs>';
  }
  function car(x, y, body, opts) {
    opts = opts || {};
    var f = opts.flip ? ' transform="translate(' + (x * 2 + 300) + ' 0) scale(-1 1)"' : '';
    return '<g' + f + '><g transform="translate(' + x + ' ' + y + ')">' +
      '<ellipse cx="150" cy="96" rx="150" ry="10" fill="#000" opacity=".35"/>' +
      '<path d="M10 70 C10 52 26 46 46 44 L84 14 C92 8 104 6 116 6 L190 6 C204 6 214 10 222 18 L254 44 C280 46 296 54 296 72 L296 82 L10 82 Z" fill="' + body + '"/>' +
      '<path d="M92 20 L118 12 L150 12 L150 42 L74 42 Z M162 12 L192 12 C200 12 206 14 212 20 L236 42 L162 42 Z" fill="#a9c4e6" opacity=".85"/>' +
      '<path d="M10 66 L296 66" stroke="#000" stroke-opacity=".18" stroke-width="3"/>' +
      '<rect x="282" y="56" width="14" height="9" rx="3" fill="#ffe7a8"/><rect x="10" y="56" width="10" height="9" rx="3" fill="#d84a3a"/>' +
      (opts.dent ? '<path d="M240 30 L262 46 L250 58 L270 70 L246 78 L236 60 Z" fill="#2a2a30" opacity=".75"/><path d="M282 56 l14 0 l-6 9 z" fill="#555"/>' : '') +
      '<g class="' + (opts.spin ? 'wheel' : '') + '"><circle cx="72" cy="82" r="22" fill="#15161b"/><circle cx="72" cy="82" r="9" fill="#9aa3b5"/><rect x="69" y="62" width="6" height="40" fill="#15161b" opacity=".6"/></g>' +
      '<g class="' + (opts.spin ? 'wheel' : '') + '"><circle cx="230" cy="82" r="22" fill="#15161b"/><circle cx="230" cy="82" r="9" fill="#9aa3b5"/><rect x="227" y="62" width="6" height="40" fill="#15161b" opacity=".6"/></g>' +
      '</g></g>';
  }
  function carTop(cls, x, y, body, rot) {
    return '<g class="' + cls + '"><g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')">' +
      '<rect x="-80" y="-38" width="160" height="76" rx="22" fill="' + body + '"/>' +
      '<rect x="-30" y="-30" width="52" height="60" rx="10" fill="#a9c4e6" opacity=".8"/>' +
      '<rect x="-22" y="-26" width="34" height="52" rx="6" fill="' + body + '"/>' +
      '<rect x="66" y="-30" width="10" height="14" rx="3" fill="#ffe7a8"/><rect x="66" y="16" width="10" height="14" rx="3" fill="#ffe7a8"/>' +
      '</g></g>';
  }
  // Stilisierte Figur. pose: stand | headhand | crossed | point | phone | sit
  function person(x, y, o) {
    o = o || {};
    var s = o.scale || 1, skin = o.skin || '#f0cfb3', coat = o.coat || '#2f4a78', hair = o.hair || '#4a3020';
    var g = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">';
    g += '<ellipse cx="0" cy="372" rx="70" ry="10" fill="#000" opacity=".35"/>';
    if (o.pose !== 'sit') g += '<rect x="-30" y="230" width="24" height="140" rx="10" fill="#1d2230"/><rect x="6" y="230" width="24" height="140" rx="10" fill="#1d2230"/>';
    g += '<path d="M-52 250 C-56 170 -46 112 0 104 C46 112 56 170 52 250 Z" fill="' + coat + '"/>';
    g += '<path d="M-10 108 L0 140 L10 108 Z" fill="#f3efe6"/>';
    var arm = function (d) { return '<path d="' + d + '" fill="none" stroke="' + coat + '" stroke-width="24" stroke-linecap="round"/>'; };
    var hand = function (cx, cy) { return '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="' + skin + '"/>'; };
    if (o.pose === 'headhand') g += arm('M-40 128 C-70 150 -60 90 -30 56') + hand(-28, 52) + arm('M40 128 C54 170 52 200 48 226') + hand(48, 230);
    else if (o.pose === 'crossed') g += arm('M-40 130 C-30 176 20 176 34 160') + arm('M40 130 C30 186 -20 180 -34 164') + hand(34, 160) + hand(-34, 164);
    else if (o.pose === 'point') g += arm('M40 128 C80 120 110 110 130 100') + hand(134, 98) + arm('M-40 128 C-54 170 -52 200 -48 226') + hand(-48, 230);
    else if (o.pose === 'phone') g += arm('M40 128 C70 160 50 120 26 70') + hand(26, 68) + '<rect x="14" y="40" width="18" height="34" rx="4" fill="#111"/>' + arm('M-40 128 C-54 170 -52 200 -48 226') + hand(-48, 230);
    else if (o.pose === 'sit') g += arm('M-40 130 C-50 180 -20 210 10 214') + arm('M40 130 C50 180 40 206 20 214') + hand(14, 216);
    else g += arm('M-40 128 C-54 170 -52 200 -48 226') + hand(-48, 230) + arm('M40 128 C54 170 52 200 48 226') + hand(48, 230);
    g += '<g class="' + (o.headCls || '') + '"><rect x="-10" y="80" width="20" height="28" fill="' + skin + '"/>';
    g += '<ellipse cx="0" cy="54" rx="34" ry="40" fill="' + skin + '"/>';
    if (o.female) g += '<path d="M-38 60 C-44 6 -10 -6 6 -4 C34 0 44 24 38 70 C30 40 18 24 -4 22 C-20 30 -30 44 -38 60 Z M-38 56 C-44 90 -40 110 -28 124 L-20 70 Z M36 56 C44 90 40 110 28 124 L22 70 Z" fill="' + hair + '"/>';
    else g += '<path d="M-36 50 C-40 10 -8 0 6 2 C30 4 40 22 36 50 C30 30 14 22 -4 22 C-20 26 -30 36 -36 50 Z" fill="' + hair + '"/>';
    g += '<circle cx="-12" cy="56" r="3.4" fill="#2a1a10"/><circle cx="12" cy="56" r="3.4" fill="#2a1a10"/>';
    g += o.frown ? '<path d="M-10 78 Q0 72 10 78" stroke="#8a4a3a" stroke-width="3" fill="none"/>' : '<path d="M-9 74 Q0 79 9 74" stroke="#8a4a3a" stroke-width="3" fill="none"/>';
    if (o.frown) g += '<path d="M-20 42 L-6 46 M20 42 L6 46" stroke="#3a2818" stroke-width="3"/>';
    g += '</g></g>';
    return g;
  }
  function bubble(x, y, w, text, cls, tailLeft) {
    var lines = text.split('\n'), h = 34 + lines.length * 44;
    var tx = tailLeft ? x + 60 : x + w - 90;
    var t = lines.map(function (l, i) { return '<tspan x="' + (x + w / 2) + '" dy="' + (i ? 44 : 0) + '">' + l + '</tspan>'; }).join('');
    return '<g class="' + (cls || 'pop-in d1') + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="24" fill="#fbf6ea" stroke="#13203a" stroke-width="3"/>' +
      '<path d="M' + tx + ' ' + (y + h - 2) + ' l30 0 l-22 36 z" fill="#fbf6ea" stroke="#13203a" stroke-width="3" stroke-linejoin="round"/><rect x="' + (tx + 2) + '" y="' + (y + h - 6) + '" width="26" height="8" fill="#fbf6ea"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 56) + '" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#13203a">' + t + '</text></g>';
  }
  function paper(x, y, w, h, title, rows, o) {
    o = o || {};
    var g = '<g class="' + (o.cls || '') + '"><g transform="translate(' + x + ' ' + y + ') rotate(' + (o.rot || 0) + ')">';
    g += '<rect x="8" y="10" width="' + w + '" height="' + h + '" rx="6" fill="#000" opacity=".35"/>';
    g += '<rect width="' + w + '" height="' + h + '" rx="6" fill="url(#cPaper)"/>';
    if (o.header) g += '<rect width="' + w + '" height="64" rx="6" fill="' + o.header + '"/><text x="30" y="42" font-family="Segoe UI, sans-serif" font-size="26" font-weight="bold" fill="#fff">' + o.headerText + '</text>';
    var ty = o.header ? 120 : 70;
    g += '<text x="30" y="' + ty + '" font-family="Georgia, serif" font-size="' + (o.titleSize || 40) + '" font-weight="bold" fill="#13203a">' + title + '</text>';
    rows.forEach(function (r, i) {
      var yy = ty + 64 + i * 56;
      if (r.hl) g += '<rect x="16" y="' + (yy - 38) + '" width="' + (w - 32) + '" height="52" rx="6" fill="#ffd8cf" class="mark"/>';
      g += '<text x="30" y="' + yy + '" font-family="Segoe UI, sans-serif" font-size="28" fill="#2a3550">' + r.l + '</text>';
      if (r.v) g += '<text x="' + (w - 30) + '" y="' + yy + '" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="28" font-weight="bold" fill="' + (r.hl ? '#b0302a' : '#13203a') + '">' + r.v + '</text>';
    });
    if (o.stamp) g += '<g class="stamp"><rect x="' + (w - 330) + '" y="' + (h - 150) + '" width="290" height="90" rx="8" fill="none" stroke="#b0302a" stroke-width="7"/><text x="' + (w - 185) + '" y="' + (h - 90) + '" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="40" font-weight="900" fill="#b0302a" letter-spacing="4">' + o.stamp + '</text></g>';
    if (o.seal) g += '<g transform="translate(' + (w - 90) + ' 90)"><circle r="48" fill="#13203a"/><circle r="40" fill="none" stroke="url(#cGold)" stroke-width="3"/>' + scales(0, 0, 0.9, '#f3d58e') + '</g>';
    g += '</g></g>';
    return g;
  }
  function scales(x, y, s, col) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round"><line x1="0" y1="-22" x2="0" y2="20"/><line x1="-22" y1="-12" x2="22" y2="-12"/><path d="M-22 -12 L-30 6 L-14 6 Z"/><path d="M22 -12 L14 6 L30 6 Z"/><line x1="-10" y1="20" x2="10" y2="20"/></g>';
  }
  function envelope(x, y, label, cls) {
    return '<g class="' + (cls || '') + '"><g transform="translate(' + x + ' ' + y + ')"><rect x="8" y="10" width="640" height="400" rx="10" fill="#000" opacity=".4"/>' +
      '<rect width="640" height="400" rx="10" fill="#efe4cc"/><path d="M0 0 L320 230 L640 0" fill="#e2d4b4" stroke="#c9b68e" stroke-width="3"/>' +
      '<g transform="translate(320 232)"><circle r="56" fill="#13203a"/><circle r="47" fill="none" stroke="url(#cGold)" stroke-width="3"/>' + scales(0, 0, 1.1, '#f3d58e') + '</g>' +
      '<text x="320" y="352" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#13203a">' + label + '</text></g></g>';
  }
  function titleCard(kicker, big, sub) {
    return '<rect width="1920" height="1080" fill="#05080f"/><rect width="1920" height="1080" fill="url(#cVig)"/>' +
      '<g transform="translate(960 470)">' + scales(0, -190, 2.2, '#c9a458') + '</g>' +
      '<text class="fade-late" x="960" y="390" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="34" font-weight="700" letter-spacing="12" fill="#c9a458">' + kicker + '</text>' +
      '<text class="title-rise" x="960" y="530" text-anchor="middle" font-family="Georgia, serif" font-size="' + (big.length > 26 ? 78 : 104) + '" font-weight="bold" fill="#f6eedd">' + big + '</text>' +
      '<line x1="660" y1="580" x2="1260" y2="580" stroke="url(#cGold)" stroke-width="3" class="fade-late"/>' +
      '<text class="fade-late" x="960" y="650" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="44" fill="#e7d6b0">' + sub + '</text>';
  }
  function street(dusk) {
    var g = '<rect width="1920" height="1080" fill="url(#' + (dusk ? 'cSkyDusk' : 'cNight') + ')"/>';
    g += '<path d="M0 560 C300 520 520 540 760 520 C1000 500 1200 540 1500 520 C1700 510 1840 530 1920 520 L1920 700 L0 700 Z" fill="#1a2440" opacity=".9"/>';
    g += '<g fill="#101a30">' + [80, 260, 520, 900, 1240, 1560, 1780].map(function (x, i) { return '<rect x="' + x + '" y="' + (440 - (i % 3) * 60) + '" width="' + (120 + (i % 2) * 60) + '" height="' + (300 + (i % 3) * 60) + '"/>'; }).join('') + '</g>';
    g += '<g fill="#ffd38a" opacity=".7">' + [110, 150, 300, 560, 600, 940, 1280, 1600, 1820].map(function (x, i) { return '<rect x="' + x + '" y="' + (480 - (i % 3) * 40) + '" width="16" height="22"/>'; }).join('') + '</g>';
    g += '<rect y="700" width="1920" height="380" fill="#1b1f2a"/><rect y="700" width="1920" height="12" fill="#3a3f4c"/>';
    g += '<g fill="#e8e2d0">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (i * 260 + 40) + '" y="868" width="140" height="10" rx="4"/>'; }).join('') + '</g>';
    [240, 960, 1680].forEach(function (x) { g += '<rect x="' + x + '" y="430" width="10" height="276" fill="#2a2f3c"/><path d="M' + (x - 30) + ' 430 L' + (x + 40) + ' 430 L' + (x + 30) + ' 446 L' + (x - 20) + ' 446 Z" fill="#3a3f4c"/><ellipse cx="' + (x + 5) + '" cy="560" rx="150" ry="190" fill="url(#cLampGlow)" opacity=".5"/>'; });
    return g;
  }
  function room(lampX) {
    return '<rect width="1920" height="1080" fill="url(#cRoom)"/><rect y="760" width="1920" height="320" fill="#24161a"/>' +
      '<rect x="1300" y="160" width="420" height="300" rx="6" fill="#0d1630"/><rect x="1312" y="172" width="396" height="276" fill="#1a2a52"/><line x1="1510" y1="172" x2="1510" y2="448" stroke="#0d1630" stroke-width="8"/>' +
      '<ellipse cx="' + lampX + '" cy="520" rx="420" ry="360" fill="url(#cLampGlow)" opacity=".7"/>';
  }
  function shotSvg(inner, camCls) {
    return '<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">' + defs() +
      '<g class="cam ' + camCls + '" style="animation-duration:' + (SHOT_MS + FADE_MS) + 'ms">' + inner + '</g>' +
      '<rect width="1920" height="1080" fill="url(#cVig)" pointer-events="none"/></svg>';
  }

  // ---------- Drehbücher ----------
  var FILMS = [
    [ // Fall 1: Der Verkehrsunfall
      { cam: 'cam-pan-r', cap: 'Ein Abend in der Stadt. Zwei Autos sind unterwegs.',
        svg: function () { return street(true) + '<g class="drive-r">' + car(300, 760, '#b8463a', { spin: true }) + '</g><g class="drive-l">' + car(1100, 900, '#4a6a92', { spin: true, flip: true }) + '</g>'; } },
      { cam: 'cam-crash', cap: 'An der Kreuzung kommt es zum Zusammenstoß.',
        svg: function () {
          return '<rect width="1920" height="1080" fill="#20242e"/><rect x="0" y="420" width="1920" height="240" fill="#2c303b"/><rect x="840" y="0" width="240" height="1080" fill="#2c303b"/>' +
            '<g fill="#e8e2d0">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (i * 140 + 20) + '" y="535" width="80" height="10"/><rect x="' + (1140 + i * 140) + '" y="535" width="80" height="10"/>'; }).join('') + '</g>' +
            '<g fill="#e8e2d0">' + [0, 1, 2].map(function (i) { return '<rect x="955" y="' + (i * 120 + 30) + '" width="10" height="70"/><rect x="955" y="' + (720 + i * 120) + '" width="10" height="70"/>'; }).join('') + '</g>' +
            '<g fill="#f0ede4">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (850 + i * 40) + '" y="672" width="22" height="60"/>'; }).join('') + '</g>' +
            carTop('crashA', 860, 500, '#b8463a', 0) + carTop('crashB', 1000, 520, '#4a6a92', -90) +
            '<g class="flash"><circle cx="940" cy="520" r="150" fill="#fff3c8" opacity=".9"/><path d="M940 380 L965 480 L1060 440 L990 515 L1090 560 L985 560 L1010 660 L945 580 L880 660 L900 560 L790 560 L890 515 L820 440 L915 480 Z" fill="#fff"/></g>';
        } },
      { cam: 'cam-zoom-in', cap: 'Frau Sorger: „Mein Auto ist schwer beschädigt.“',
        svg: function () {
          return street(false) + car(820, 790, '#b8463a', { dent: true }) +
            '<g fill="#9aa3b5"><circle class="smoke" cx="1100" cy="820" r="40"/><circle class="smoke d2" cx="1080" cy="830" r="34"/><circle class="smoke d3" cx="1120" cy="810" r="30"/></g>' +
            person(600, 520, { female: true, hair: '#6a3a22', coat: '#7a3a4a', pose: 'headhand', scale: 1.05 }) +
            '<g class="pop-in d2s"><rect x="1180" y="730" width="300" height="70" rx="10" fill="#13203a" stroke="#e2bb6c" stroke-width="3"/><text x="1330" y="776" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="30" font-weight="bold" fill="#f3d58e">Schaden: 6.000 €</text></g>';
        } },
      { cam: 'cam-zoom-in', cap: 'Herr Reiniger bestreitet, allein schuld zu sein.',
        svg: function () {
          return street(false) + car(1080, 800, '#4a6a92', { flip: true }) +
            person(780, 500, { hair: '#2a2a2e', coat: '#2c3d5a', pose: 'crossed', frown: true, scale: 1.08 }) +
            bubble(880, 300, 640, 'Ich bin nicht\nallein schuld!', 'pop-in d1', true);
        } },
      { cam: 'cam-zoom-out', cap: 'Frau Sorger klagt auf Schadenersatz.',
        svg: function () { return titleCard('FALL 1 · SORGER GEGEN REINIGER', 'Schadenersatzforderung: 6.000 €', 'Wer muss den Schaden ersetzen?'); } }
    ],
    [ // Fall 2: Die unbezahlte Rechnung
      { cam: 'cam-zoom-in', cap: 'Herr Huber erhält seine Handyrechnung.',
        svg: function () {
          return room(760) + person(760, 420, { hair: '#5a3a1e', coat: '#3a5a7a', pose: 'phone', scale: 1.05 }) +
            '<g class="buzz"><g transform="translate(1040 300)"><rect width="300" height="560" rx="40" fill="#0b0f18" stroke="#3a4256" stroke-width="6"/><rect x="18" y="40" width="264" height="480" rx="18" fill="#14223e"/>' +
            '<g class="slide-in-r"><rect x="34" y="90" width="232" height="150" rx="18" fill="#fbf6ea"/><text x="56" y="134" font-family="Segoe UI, sans-serif" font-size="24" font-weight="bold" fill="#13203a">Neue Rechnung</text><text x="56" y="178" font-family="Segoe UI, sans-serif" font-size="22" fill="#2a3550">Betrag fällig:</text><text x="56" y="218" font-family="Segoe UI, sans-serif" font-size="34" font-weight="bold" fill="#b0302a">480,00 €</text></g></g></g>';
        } },
      { cam: 'cam-zoom-in', cap: 'Er prüft die Posten – und stutzt.',
        svg: function () {
          return room(960) + paper(560, 150, 800, 640, 'Rechnung November', [
            { l: 'Grundgebühr', v: '39,90 €' }, { l: 'Datenpaket', v: '24,90 €' }, { l: 'Premium-Dienste', v: '398,20 €', hl: true }, { l: 'Roaming', v: '17,00 €' }, { l: 'Summe', v: '480,00 €' }
          ], { header: '#13203a', headerText: 'Mobilfunkunternehmen', titleSize: 38 }) +
            '<g class="scan"><g transform="translate(1180 430)"><circle r="96" fill="#ffffff" opacity=".18" stroke="#e2bb6c" stroke-width="12"/><line x1="66" y1="66" x2="150" y2="150" stroke="#e2bb6c" stroke-width="22" stroke-linecap="round"/></g></g>' +
            '<g class="mark"><text x="1400" y="470" font-family="Georgia, serif" font-size="90" font-weight="bold" fill="#e0675a">?</text></g>';
        } },
      { cam: 'cam-pan-l', cap: 'Das Unternehmen besteht auf Zahlung.',
        svg: function () {
          return '<rect width="1920" height="1080" fill="#101828"/>' + paper(520, 110, 880, 760, 'Zahlungsaufforderung', [
            { l: 'Offener Betrag', v: '480,00 €' }, { l: 'Bitte zahlen Sie binnen 14 Tagen.' }, { l: 'Andernfalls leiten wir' }, { l: 'rechtliche Schritte ein.' }
          ], { header: '#5a2219', headerText: 'Mobilfunkunternehmen · Inkasso', stamp: 'MAHNUNG', cls: 'slide-up' });
        } },
      { cam: 'cam-zoom-in', cap: 'Dann kommt Post vom Gericht: ein bedingter Zahlungsbefehl.',
        svg: function () {
          return '<rect width="1920" height="1080" fill="#0c1424"/>' + envelope(300, 380, 'Post vom Gericht', 'fly-in') +
            paper(1010, 170, 640, 640, 'Bedingter', [{ l: 'Forderung', v: '480,00 €' }, { l: 'Klagende Partei:' }, { l: 'Mobilfunkunternehmen' }], { cls: 'slide-up d2s', titleSize: 46, seal: true }) +
            '<text class="fade-late" x="1040" y="306" font-family="Georgia, serif" font-size="46" font-weight="bold" fill="#13203a">Zahlungsbefehl</text>';
        } },
      { cam: 'cam-zoom-out', cap: 'Die 5BHEL vertritt Herrn Huber.',
        svg: function () { return titleCard('FALL 2 · DIE UNBEZAHLTE RECHNUNG', 'Wie kann sich der Kunde wehren?', 'Die Rechnung ist strittig – die Zeit läuft.'); } }
    ],
    [ // Fall 3: Der Bankprozess
      { cam: 'cam-zoom-in', cap: 'Herr Winter prüft seine Kontoauszüge.',
        svg: function () {
          return room(700) + '<rect x="380" y="640" width="1160" height="40" rx="6" fill="#5a2a1a"/><rect x="420" y="680" width="40" height="320" fill="#3a1a10"/><rect x="1460" y="680" width="40" height="320" fill="#3a1a10"/>' +
            '<g transform="translate(560 420)"><rect x="-6" y="0" width="12" height="220" fill="#b88a45"/><path d="M-70 0 L70 0 L44 -60 L-44 -60 Z" fill="#f3d58e"/></g>' +
            person(980, 300, { hair: '#9a9a9a', coat: '#2f3e5a', pose: 'sit', scale: 1.0 }) +
            paper(1120, 520, 420, 300, 'Kontoauszug', [{ l: 'Rate Kredit', v: '450,00' }, { l: 'Rate Kredit', v: '450,00' }], { rot: -6, titleSize: 30 });
        } },
      { cam: 'cam-pan-r', cap: 'Die Bank verlangt 28.000 €.',
        svg: function () {
          var cols = ''; for (var i = 0; i < 6; i++) cols += '<rect x="' + (560 + i * 150) + '" y="420" width="56" height="400" fill="#c9c2b2"/><rect x="' + (552 + i * 150) + '" y="404" width="72" height="20" fill="#e6dfcf"/>';
          return street(false) + '<rect x="480" y="300" width="960" height="560" fill="#9a9384"/><path d="M440 310 L960 120 L1480 310 Z" fill="#b8b1a1"/><rect x="460" y="300" width="1000" height="30" fill="#d8d1c1"/>' +
            cols + '<text x="960" y="270" text-anchor="middle" font-family="Georgia, serif" font-size="80" font-weight="bold" fill="#3a3428" letter-spacing="20">BANK</text>' +
            paper(1220, 440, 560, 360, 'Forderung', [{ l: 'Kreditvertrag', v: 'offen' }, { l: 'Gesamt', v: '28.000,00 €', hl: true }], { cls: 'slide-in-r', header: '#13203a', headerText: 'Bank · Rechtsabteilung', titleSize: 34 });
        } },
      { cam: 'cam-zoom-in', cap: 'Herr Winter bestreitet die Forderung und ihre Höhe.',
        svg: function () {
          return room(900) + person(700, 470, { hair: '#9a9a9a', coat: '#2f3e5a', pose: 'point', frown: true, scale: 1.06, headCls: 'shake-head' }) +
            bubble(380, 200, 620, 'Diese Höhe\nstimmt nicht!', 'pop-in d1', false) +
            paper(1100, 340, 560, 460, 'Aufstellung der Bank', [{ l: 'Kapital', v: '23.620 €' }, { l: 'Zinsen + Spesen', v: '4.380 €', hl: true }, { l: 'Bezahlte Raten?', v: '???', hl: true }], { titleSize: 32 });
        } },
      { cam: 'cam-zoom-in', cap: 'Ein Schreiben des Gerichts trifft ein: Die Bank hat geklagt.',
        svg: function () {
          return '<rect width="1920" height="1080" fill="#0c1424"/>' + envelope(640, 340, 'Bank gegen Winter', 'fly-in') +
            '<g class="pop-in d3s"><rect x="740" y="800" width="440" height="70" rx="10" fill="#13203a" stroke="#e2bb6c" stroke-width="3"/><text x="960" y="846" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="30" font-weight="bold" fill="#f3d58e">Klage über 28.000 €</text></g>';
        } },
      { cam: 'cam-zoom-out', cap: 'Die 5BHEL vertritt Herrn Winter.',
        svg: function () { return titleCard('FALL 3 · BANK GEGEN WINTER', '28.000 € – Wer kann seine Position beweisen?', 'Jetzt zählen Beweise, nicht Behauptungen.'); } }
    ]
  ];

  // ---------- Abspielen ----------
  var timers = [], playing = false, onDone = null;
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function play(ci, done) {
    stop(true);
    var shots = FILMS[ci];
    if (!shots) { if (done) done(); return; }
    playing = true; onDone = done;
    stage.classList.add('cinema-on');
    film.replaceChildren(); cap.classList.remove('on');
    var total = shots.length * SHOT_MS + FADE_MS;
    bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth;
    bar.style.transition = 'width ' + total + 'ms linear'; bar.style.width = '100%';
    shots.forEach(function (sh, i) {
      at(i * SHOT_MS, function () {
        var wrap = document.createElement('div');
        wrap.innerHTML = shotSvg(sh.svg(), sh.cam);
        var svg = wrap.firstChild;
        film.appendChild(svg);
        requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('on'); }); });
        var old = film.children; // ältere Einstellung nach der Überblendung entfernen
        if (old.length > 2) film.removeChild(old[0]);
        at(FADE_MS + 50, function () { while (film.children.length > 1) film.removeChild(film.children[0]); });
        cap.classList.remove('on');
        at(250, function () { cap.textContent = sh.cap; cap.classList.add('on'); });
      });
    });
    at(total - 200, function () { cap.classList.remove('on'); film.style.transition = 'opacity .6s'; film.style.opacity = '0'; });
    at(total + 450, finish);
    skipBtn.focus({ preventScroll: true });
  }
  function finish() {
    if (!playing) return;
    var cb = onDone;
    stop(true);
    if (cb) cb();
  }
  function stop(silent) {
    clearTimers();
    var was = playing;
    playing = false; onDone = null;
    stage.classList.remove('cinema-on');
    film.replaceChildren(); film.style.transition = ''; film.style.opacity = '1';
    cap.classList.remove('on');
    bar.style.transition = 'none'; bar.style.width = '0%';
    return was && !silent;
  }
  skipBtn.addEventListener('click', function (e) { e.stopPropagation(); finish(); });

  window.__cinema = { play: play, stop: function () { stop(true); }, finish: finish, playing: function () { return playing; }, count: FILMS.length };
})();
