> Aktuelle Kurzanleitung für Version 2.0: siehe UPDATE-ANLEITUNG.md.

# 5BHEL vor Gericht – online veröffentlichen

## Ziel
Auf einem beliebigen Schullaptop `https://DEINE-ADRESSE.onrender.com` öffnen; Schüler stimmen auf ihren Handys über einen Teilnehmer-Link ab. Auf dem Schullaptop muss nichts installiert werden.

## Einmalige Einrichtung über Render und GitHub

1. Entpacke den Projektordner und lade **den Inhalt des Ordners `5BHEL-vor-Gericht`** in ein neues GitHub-Repository. Wenn du das Repository öffentlich machst, sind Spielcode und Fragen öffentlich sichtbar; keine Passwörter oder privaten Daten einchecken.
2. Melde dich bei https://dashboard.render.com/ an, verbinde dein GitHub-Konto und wähle **New > Blueprint** (Render unterstützt `render.yaml`). Wähle das Repository aus und bestätige die Bereitstellung. Alternativ: **New > Web Service**, Repository auswählen, Runtime **Node**, Build Command `npm install --omit=dev`, Start Command `npm start`, Free-Tarif, falls angeboten.
3. Warte, bis Render den Dienst als bereit meldet. Öffne die von Render angezeigte HTTPS-Adresse.
4. Melde dich an, öffne über das Zahnrad oben rechts die Spielleitung und klicke auf **Raum erstellen**. Kopiere den angezeigten Teilnehmer-Link und teile ihn mit der Klasse. Die Schüler geben ihren Namen ein.
5. Starte die Verhandlung. Bei jeder Frage können Schüler A, B oder C wählen. Beende die Abstimmung über den Button; die Mehrheitsantwort wird übernommen.

## Vor der Präsentation testen

- Öffne die Moderatorseite auf einem Laptop und den Teilnehmer-Link auf zwei Handys mit **unterschiedlichen Internetverbindungen**.
- Stimme mit beiden Handys ab und prüfe die Stimmenanzeige und die Mehrheitsentscheidung.
- Probiere mindestens einen kompletten Fall und den Neustart aus.
- Teste am Präsentationstag die Schul-Firewall und den Beamer.

## Einschränkungen

- Render-Free-Dienste können bei Inaktivität einschlafen; der erste Aufruf kann dann länger dauern. Tarifbedingungen können sich ändern.
- Räume und Stimmen liegen nur im **Arbeitsspeicher**. Bei Serverneustart, Ruhezustand oder Neuveröffentlichung gehen aktive Räume verloren. Daher kurz vor der Präsentation einen neuen Raum erstellen.
- Die Moderatorseite ist über die normale Startadresse erreichbar. Jeder kann einen **eigenen** Raum eröffnen; nur wer den geheimen Moderator-Token des jeweiligen Raums hat, kann dessen Abstimmungen steuern. Der Raum-Schlüssel wird im Browser der Spielleitung gespeichert; nach einem Neuladen wird das laufende Spiel wiederhergestellt.
- Das System verwendet einen zufälligen Teilnahmetoken pro Browser, aber keine echten Nutzerkonten. Es verhindert Mehrfachstimmen **pro Anmeldung**, nicht absichtliche Mehrfachanmeldungen. Für eine Schulklasse genügt das meist, ist aber keine manipulationssichere Wahl.
- Bei Gleichstand gibt es keine Zufallsauswahl: Stichwahl oder offene Entscheidung der Spielleitung. Ohne Stimmen wird keine Mehrheit angenommen.
- Für den Online-Betrieb ist Internetzugang erforderlich. `index.html` bleibt als lokale Einzelspieler-Version nutzbar, Live-Abstimmung benötigt den Server.

## Lokal testen

Mit installiertem Node.js im Projektordner `npm start` ausführen und `http://localhost:3000` öffnen. Zum Testen `npm test` ausführen.

## Datenschutz

Für die Teilnahme reichen frei gewählte Spitznamen. Keine Klarnamen verlangen. Die Daten werden in dieser Version nur im Arbeitsspeicher des Servers gehalten, bis der Prozess neu startet oder der Raum abläuft (spätestens nach ungefähr sechs Stunden). Der Hosting-Anbieter kann eigene technische Zugriffsprotokolle führen.
