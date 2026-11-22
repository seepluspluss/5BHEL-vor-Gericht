/* 5BHEL VOR GERICHT – Stilisierte, klar fiktive Spielfiguren (SVG) für Mandanten und Gegenseite.
 * Keine Nachbildung realer Personen: einheitlicher Grafikstil, unterschieden nur durch Frisur und Kleidung.
 * Wird auch von cinema.js für die Filmsequenzen verwendet. */
(function () {
  'use strict';
  var D = window.GAME_DATA;
  var SKIN = '#edcaab', SKIN_SH = '#dcb08e';

  function hair(style, c) {
    switch (style) {
      case 'side': return '<path d="M82 72 C76 30 110 14 134 20 C154 26 164 46 158 72 C152 52 140 44 126 42 C112 48 96 58 82 72 Z" fill="' + c + '"/><path d="M96 34 C112 26 132 26 148 36" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>';
      case 'wavy': return '<path d="M82 74 C74 40 92 18 108 24 C114 12 134 12 140 24 C154 20 166 42 158 74 C152 54 146 46 140 50 C132 40 112 40 102 50 C94 46 86 58 82 74 Z" fill="' + c + '"/><path d="M98 30 C108 22 118 30 126 24" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="3"/>';
      case 'neat': return '<path d="M84 66 C82 32 106 20 124 20 C146 20 160 36 156 66 C150 46 132 38 114 40 C100 42 90 52 84 66 Z" fill="' + c + '"/><path d="M108 24 C104 32 102 38 104 44" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/><path d="M86 60 C84 70 86 78 88 84 M154 60 C156 70 154 78 152 84" stroke="#a49a90" stroke-width="5" stroke-linecap="round"/>';
      case 'curly':
        var g = '<path d="M84 70 C82 40 100 26 120 26 C140 26 158 40 156 70 Z" fill="' + c + '"/>';
        [[88, 56], [94, 40], [106, 30], [120, 26], [134, 30], [146, 40], [152, 56], [100, 46], [140, 46], [120, 38]].forEach(function (p) { g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" fill="' + c + '"/>'; });
        return g + '<circle cx="114" cy="30" r="4" fill="#fff" fill-opacity=".15"/>';
      case 'slick': return '<path d="M84 62 C84 28 108 16 124 16 C146 16 160 32 156 62 C146 40 130 34 116 36 C102 38 92 46 84 62 Z" fill="' + c + '"/><path d="M98 30 C114 22 134 22 150 32 M100 38 C114 30 132 30 146 38" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5"/>';
      default: return '<path d="M84 66 C82 30 104 20 122 20 C144 20 160 34 156 66 C150 48 138 40 120 40 C104 40 92 48 84 66 Z" fill="' + c + '"/><path d="M100 28 C112 22 130 22 142 30" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>';
    }
  }

  // Brustbild im Koordinatensystem 0..240 × 0..200 (Kopfmitte 120/70)
  function bust(look) {
    var L = look || {}, coat = L.coat || '#2f4a78', shirt = L.shirt || '#efe6d4', hc = L.hair || '#2b211b';
    var s = '<g class="bust">';
    s += '<path d="M8 200 C12 150 50 124 96 116 L120 142 L144 116 C190 124 228 150 232 200 Z" fill="' + coat + '"/>';
    s += '<path d="M96 116 L110 168 L120 142 Z M144 116 L130 168 L120 142 Z" fill="#000" fill-opacity=".22"/>';
    s += '<path d="M102 112 L120 146 L138 112 Z" fill="' + shirt + '"/>';
    if (L.tie) s += '<path d="M116 134 L124 134 L129 180 L120 192 L111 180 Z" fill="' + L.tie + '"/><path d="M115 128 L125 128 L124 136 L116 136 Z" fill="' + L.tie + '"/>';
    s += '<rect x="108" y="94" width="24" height="26" fill="' + SKIN_SH + '"/>';
    s += '<ellipse cx="84" cy="74" rx="6" ry="9" fill="' + SKIN_SH + '"/><ellipse cx="156" cy="74" rx="6" ry="9" fill="' + SKIN_SH + '"/>';
    s += '<ellipse cx="120" cy="70" rx="36" ry="43" fill="' + SKIN + '"/>';
    s += '<g class="c-eyes"><path d="M100 72 Q109 65 118 72 Q109 77 100 72 Z M122 72 Q131 65 140 72 Q131 77 122 72 Z" fill="#fff"/>' +
      '<circle cx="109" cy="71.6" r="3.6" fill="#3b2a20"/><circle cx="131" cy="71.6" r="3.6" fill="#3b2a20"/>' +
      '<circle cx="110.2" cy="70.4" r="1" fill="#fff"/><circle cx="132.2" cy="70.4" r="1" fill="#fff"/>' +
      '<path d="M99 71 Q109 63 119 70 M121 70 Q131 63 141 71" fill="none" stroke="#2a1d14" stroke-width="2.2" stroke-linecap="round"/></g>';
    s += '<path d="M100 60 Q109 55 118 58 M122 58 Q131 55 140 60" fill="none" stroke="' + hc + '" stroke-width="3.4" stroke-linecap="round"/>';
    if (L.glasses) s += '<g fill="none" stroke="#3a3530" stroke-width="2.2"><rect x="98" y="63" width="21" height="16" rx="5"/><rect x="121" y="63" width="21" height="16" rx="5"/><line x1="119" y1="70" x2="121" y2="70"/></g>';
    s += '<path d="M120 76 Q117 86 122 89" fill="none" stroke="#cf9f80" stroke-width="2" stroke-linecap="round"/>';
    s += '<path class="c-mouth" d="M110 98 Q120 103 130 98" fill="none" stroke="#a5535a" stroke-width="3" stroke-linecap="round"/>';
    s += '<ellipse class="c-talk" cx="120" cy="99" rx="7" ry="4.5" fill="#7a2f36"/>';
    s += hair(L.style, hc);
    return s + '</g>';
  }

  var SLOTS = { left: { id: 'cast-left', x: 150 }, right: { id: 'cast-right', x: 1530 } };
  var Y = 258;
  var defaults = {};
  function show(ci) {
    ['left', 'right'].forEach(function (side) {
      var g = document.getElementById(SLOTS[side].id);
      if (!g) return;
      if (!(SLOTS[side].id in defaults)) defaults[SLOTS[side].id] = g.innerHTML;
      var cs = ci != null && D.cases[ci];
      var p = cs && cs.cast && cs.cast[side === 'left' ? 'client' : 'opponent'];
      if (!p) { g.innerHTML = defaults[SLOTS[side].id]; g.removeAttribute('data-name'); return; }
      if (g.getAttribute('data-name') === p.name) return;
      g.setAttribute('data-name', p.name);
      g.innerHTML = '<g transform="translate(' + SLOTS[side].x + ' ' + Y + ')"><g class="bust-anim">' + bust(p.look) + '</g></g>';
    });
  }

  window.__cast = { show: show, bust: bust, hair: hair, SKIN: SKIN };
})();
