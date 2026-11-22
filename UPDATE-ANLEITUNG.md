# 5BHEL vor Gericht – Version 2.0 (Cinematic Redesign & Live-Voting 2.0)

## Neue Version auf GitHub und Render veröffentlichen

Render baut automatisch neu, sobald sich das verbundene GitHub-Repository ändert.

### Variante A – über die GitHub-Webseite (ohne Programme)
1. Öffne dein Repository auf github.com und wechsle in den Ordner, in dem `server.js` liegt.
2. Klicke **Add file → Upload files**.
3. Ziehe **alle Dateien und Ordner** aus diesem Projektordner hinein – **außer** `node_modules` und `artifacts`.
   Wichtig sind: `server.js`, `package.json`, `package-lock.json`, `render.yaml`, `index.html`, `abstimmen.html`,
   `beobachten.html`, `login.html`, die Ordner `css/`, `js/`, `tests/`.
4. Unten **Commit changes** klicken. Gleichnamige Dateien werden ersetzt.
5. In Render (dashboard.render.com → dein Web Service → **Events**) warten, bis „Deploy live“ erscheint (1–3 Minuten).

### Variante B – mit Git
```powershell
git add -A
git commit -m "Version 2.0: Cinematic Redesign und Live-Voting 2.0"
git push
```

### Einmalig prüfen
- Render → Environment: `ADMIN_PASSWORD` muss gesetzt sein (sonst startet der Server nicht).
- Start Command: `npm start` (führt `node server.js` aus), Build Command: `npm install --omit=dev`.
- Health Check Path: `/health`.

## Ablauf in der Stunde
1. Render-Adresse öffnen → Anmeldung Spielleitung → Passwort.
2. Zahnrad oben rechts (oder Taste **M**) → **Raum erstellen**. Der QR-Code erscheint groß auf dem Startbildschirm.
3. Optional: **Beobachter-Link erzeugen** → nur an Frau Prof senden.
4. **Präsentationsmodus** einschalten → Vollbild, keine Verwaltungselemente sichtbar.
5. **VERHANDLUNG ERÖFFNEN**. Vor jedem Fall läuft ein ca. 25-Sekunden-Intro (überspringbar).
6. Bei jeder Frage stimmt die Klasse am Handy ab. Die Abstimmung endet automatisch, wenn die Zeit abläuft
   oder alle verbundenen Schüler abgestimmt haben. Danach: Ergebnisbalken → Mehrheit → Bewertung der Richterin.
7. Gleichstand: Stichwahl oder offene Entscheidung der Spielleitung (Buttons direkt im Ergebnisbild).

Tasten: **M** Spielleitung · **Esc** schließen · **Enter/→** weiter · **F11** Vollbild.

## Zeitbudget (Richtwert)
Intro 1 min · drei Fälle à ca. 5 min (inkl. 25-s-Filmintro, 4 × 30 s Abstimmung, Ergebnis und Erklärung) · Abschluss 1–2 min ≈ 17–18 min.
Intros lassen sich im Panel abschalten (**Fall-Intros: AUS**), die Abstimmungsdauer ist einstellbar (20–90 s).

## Fachliche Hinweise zur späteren Prüfung
Die Fälle sind didaktisch vereinfacht. Folgende Werte bitte vor der Präsentation mit dem Schulbuch bzw. der aktuellen Rechtslage abgleichen,
weil sich Wertgrenzen durch Gesetzesänderungen verschieben können (Recherche am 22.11.2026 fand keine Bestätigung einer Änderung):
- Wertgrenze Bezirksgericht/Landesgericht: **15.000 €** (Fall 1 Frage 2, Fall 3 Frage 1, Merksätze).
- Mahnverfahren für Geldforderungen bis **75.000 €** (Fall 2 Frage 2).
- Einspruchsfrist gegen den bedingten Zahlungsbefehl: **4 Wochen** (Fall 2 Frage 3).
Die Antworten bleiben auch bei geänderter Wertgrenze eindeutig (6.000 € → Bezirksgericht, 28.000 € → Landesgericht),
nur die genannte Zahl in der Begründung müsste angepasst werden (`js/cases.js`).

## Tests lokal ausführen
```powershell
$env:ADMIN_PASSWORD="test"; npm start
```
```powershell
npm test
```
```powershell
node tests/e2e.mjs --shots
```
`npm test` prüft den Server mit simulierten Schülern; `tests/e2e.mjs` startet ein unsichtbares Edge mit Admin-, drei Handy- und einer Beobachteransicht.
