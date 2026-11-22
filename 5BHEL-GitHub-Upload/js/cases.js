/* 5BHEL VOR GERICHT – Spielinhalte
 * Didaktisch vereinfachte Beispielfälle zum österreichischen Zivilverfahrensrecht (ZPO, JN).
 * Die Schulbuchseiten 306–318 lagen bei der Erstellung nicht vor; es werden keine Schulbuchzitate verwendet.
 * Rollen: Fall 1 Efe (Kläger) gegen Rohallah; Fall 2 Mobilfunkunternehmen (vertreten durch Herrn Lehrner) gegen Lukas;
 * Fall 3 Bank (Anwalt: Mikail) gegen Glück. Richterin in allen Fällen: Prof. Lehrner – nicht zu verwechseln mit Herrn Lehrner.
 * Alle Personen sind fiktive Spielfiguren. correct = Index der richtigen Antwort (0 = A, 1 = B, 2 = C).
 */
window.GAME_DATA = {
  pointsPerQuestion: 100,

  opening: [
    "Ruhe im Saal! Ich bin Prof. Lehrner und eröffne hiermit die Verhandlung.",
    "Die Klasse 5BHEL tritt heute als Anwaltskanzlei auf und vertritt drei Mandanten in drei Zivilverfahren.",
    "Zu jeder Entscheidung beraten Sie sich kurz. Dann wählt die Kanzlei ihre Antwort – und das Gericht prüft, ob sie hält.",
    "Jede richtige Entscheidung bringt 100 Punkte, höchstens 1.200. Ich rufe den ersten Fall auf."
  ],

  rules: [
    "3 Fälle mit je 4 Entscheidungen",
    "Die Klasse berät – optional mit 30-Sekunden-Timer",
    "Antwort per Mausklick: richtig = +100 Punkte",
    "Am Ende verkündet das Gericht sein Urteil"
  ],

  cases: [
    {
      title: "Der Verkehrsunfall",
      difficulty: "Einfach",
      parties: { plaintiff: "Efe", defendant: "Rohallah" },
      client: "Efe",
      clientFor: "Efe",
      clientRole: "Mandant",
      opponent: "Rohallah",
      cast: {
        client: { name: "Efe", label: "Mandant · klagende Partei", look: { hair: "#2b211b", style: "short", coat: "#7a3a2a", shirt: "#efe6d4" } },
        opponent: { name: "Rohallah", label: "beklagte Partei", look: { hair: "#17130f", style: "side", coat: "#3b4b60", shirt: "#dfe5ee" } }
      },
      subject: "Schadenersatz nach Verkehrsunfall",
      amount: "6.000 €",
      intro: [
        { who: "judge", text: "Die Verhandlung ist eröffnet. Efe fordert von Rohallah 6.000 Euro Schadenersatz. 5BHEL, sind Sie bereit, Ihren Mandanten zu vertreten?" },
        { who: "client", text: "Mein Auto wurde beschädigt. Ich möchte, dass der Schaden ersetzt wird." },
        { who: "opponent", text: "So einfach ist das nicht! Ich bin nicht allein für den Unfall verantwortlich." },
        { who: "judge", text: "Dann klären wir das Schritt für Schritt. Die Kanzlei 5BHEL vertritt Efe als klagende Partei." }
      ],
      questions: [
        {
          topic: "Zivil- oder Strafgericht",
          ask: "5BHEL, Efe will Geld von Rohallah – nicht dessen Bestrafung. Vor welchem Gericht wird seine Klage verhandelt?",
          answers: [
            "Vor dem Strafgericht – ein Verkehrsunfall ist immer eine Straftat.",
            "Vor dem Zivilgericht – es geht um einen privaten Anspruch auf Schadenersatz.",
            "Vor dem Verwaltungsgericht – der Unfall geschah auf einer öffentlichen Straße."
          ],
          correct: 1,
          explanation: "Streiten Privatpersonen über Geld oder andere Rechte, entscheidet das Zivilgericht im Zivilprozess. Das Strafgericht klärt dagegen, ob jemand wegen einer Straftat bestraft wird. Eine Schadenersatzklage wie die von Efe gehört daher vor das Zivilgericht."
        },
        {
          topic: "Sachliche Zuständigkeit",
          ask: "Der Streitwert beträgt 6.000 €. Welches Gericht ist in erster Instanz sachlich zuständig?",
          answers: [
            "Das Bezirksgericht",
            "Das Landesgericht",
            "Der Oberste Gerichtshof"
          ],
          correct: 0,
          explanation: "Die sachliche Zuständigkeit richtet sich vor allem nach dem Streitwert: Bezirksgerichte entscheiden Geldstreitigkeiten bis 15.000 €, darüber ist das Landesgericht zuständig. Der Oberste Gerichtshof ist die höchste Instanz und entscheidet nie in erster Instanz."
        },
        {
          topic: "Beweismittel",
          ask: "Rohallah behauptet, Efe sei zu schnell gefahren. Womit belegen wir am besten, wie der Unfall wirklich passiert ist?",
          answers: [
            "Mit der Aussage von Efe allein – das Gericht muss dem Kläger glauben.",
            "Mit Online-Kommentaren über den Fahrstil von Rohallah.",
            "Mit Unfallzeugen, Fotos der Unfallstelle und einem Gutachten eines Kfz-Sachverständigen."
          ],
          correct: 2,
          explanation: "Die ZPO kennt fünf Beweismittel: Urkunden, Zeugen, Sachverständige, Augenschein und die Vernehmung der Parteien. Das Gericht würdigt alle Beweise frei – keine Aussage gilt automatisch als wahr, auch nicht die des eigenen Mandanten."
        },
        {
          topic: "Prozesskosten",
          ask: "Angenommen, das Gericht spricht Efe nur 3.000 € statt 6.000 € zu. Wer trägt dann die Prozesskosten?",
          answers: [
            "Immer Rohallah – er war am Unfall beteiligt.",
            "Die Kosten werden nach dem Verhältnis von Gewinnen und Verlieren verteilt oder gegeneinander aufgehoben.",
            "Niemand – Zivilprozesse sind in Österreich grundsätzlich kostenlos."
          ],
          correct: 1,
          explanation: "Grundsatz: Wer den Prozess verliert, muss dem Gegner die Kosten ersetzen. Gewinnt jede Seite nur teilweise, werden die Kosten verhältnismäßig geteilt oder gegeneinander aufgehoben – dann trägt jede Partei ihre eigenen Kosten. Gerichtsgebühren fallen jedenfalls an."
        }
      ],
      outcomes: [
        "Das Gericht folgt der Argumentation der 5BHEL. Efe kann seinen Anspruch sauber belegen und ist hervorragend vertreten.",
        "Efe hat gute Chancen – einige Schritte der Kanzlei waren aber unsicher.",
        "Für Efe wird es eng: Ohne saubere Prozessführung droht er zu verlieren und Rohallahs Kosten ersetzen zu müssen."
      ]
    },
    {
      title: "Die unbezahlte Rechnung",
      difficulty: "Mittel",
      parties: { plaintiff: "Mobilfunkunternehmen", defendant: "Lukas" },
      client: "Lukas",
      clientFor: "Lukas",
      clientRole: "Mandant",
      opponent: "Herr Lehrner",
      opponentNote: "für das Mobilfunkunternehmen",
      cast: {
        client: { name: "Lukas", label: "Mandant · beklagte Partei", look: { hair: "#6b4a2b", style: "wavy", coat: "#2f5f6c", shirt: "#e9eef0" } },
        opponent: { name: "Herr Lehrner", label: "für das Unternehmen", look: { hair: "#5d544c", style: "neat", coat: "#1d2537", shirt: "#f3f1ea", tie: "#8a2f2f", glasses: true } }
      },
      subject: "Offene Handyrechnung",
      amount: "480 €",
      intro: [
        { who: "judge", text: "Im nächsten Verfahren geht es um eine unbezahlte Handyrechnung über 480 Euro. Lukas bestreitet die Forderung, die Herr Lehrner für das Unternehmen geltend macht." },
        { who: "client", text: "Ich soll für etwas bezahlen, das meiner Meinung nach falsch verrechnet wurde!" },
        { who: "opponent", text: "Unser Unternehmen fordert die Begleichung der offenen Rechnung." },
        { who: "judge", text: "Zur Klarstellung: Herr Lehrner vertritt heute das Unternehmen, ich bin die Richterin. 5BHEL, welche rechtlichen Möglichkeiten hat Ihr Mandant?" }
      ],
      questions: [
        {
          topic: "Verfahrensart",
          ask: "Ein Unternehmen klagt eine offene Geldforderung gegen einen Kunden ein. In welcher Verfahrensart wird gestritten?",
          answers: [
            "Im streitigen Verfahren – also im Zivilprozess nach der ZPO.",
            "Im Außerstreitverfahren – wie bei Verlassenschaften oder Obsorge.",
            "Im Verwaltungsstrafverfahren vor der Bezirkshauptmannschaft."
          ],
          correct: 0,
          explanation: "Klagt eine Partei gegen eine andere auf Zahlung, entscheidet das Gericht im streitigen Verfahren, dem Zivilprozess. Das Außerstreitverfahren ist für andere Angelegenheiten vorgesehen, etwa Verlassenschaften, Obsorge oder Unterhalt von Kindern."
        },
        {
          topic: "Zahlungsbefehl",
          ask: "Lukas bekommt Post vom Gericht: einen bedingten Zahlungsbefehl. Was bedeutet das?",
          answers: [
            "Das Gericht hat nach Prüfung aller Beweise entschieden, dass Lukas zahlen muss.",
            "Das ist nur eine Mahnung des Unternehmens auf Gerichtspapier – rechtlich bedeutungslos.",
            "Das Gericht hat ihn auf Grund der Klage ohne Beweisaufnahme erlassen. Er wird nur rechtskräftig, wenn kein Einspruch kommt."
          ],
          correct: 2,
          explanation: "Bei Geldforderungen bis 75.000 € gibt es das Mahnverfahren: Das Gericht erlässt auf Grund der Klage einen bedingten Zahlungsbefehl – ohne Lukas anzuhören und ohne Beweise zu prüfen. „Bedingt“ heißt: Er wird nur wirksam, wenn sich der Beklagte nicht rechtzeitig wehrt."
        },
        {
          topic: "Einspruch",
          ask: "5BHEL, Lukas hält die Rechnung für falsch. Wie wehrt er sich gegen den bedingten Zahlungsbefehl?",
          answers: [
            "Mit einer Berufung an das Landesgericht innerhalb von 14 Tagen.",
            "Mit einem Einspruch beim Gericht innerhalb von 4 Wochen ab Zustellung.",
            "Gar nicht – er wartet ab, denn ohne Beweise passiert ohnehin nichts."
          ],
          correct: 1,
          explanation: "Gegen den Zahlungsbefehl erhebt man Einspruch – binnen 4 Wochen ab Zustellung. Dann tritt der Zahlungsbefehl außer Kraft und es kommt zur Verhandlung, in der das Unternehmen seine Forderung beweisen muss. Eine Berufung richtet sich dagegen gegen ein Urteil."
        },
        {
          topic: "Kein Einspruch",
          ask: "Und wenn Lukas die Frist versäumt und keinen Einspruch erhoben hätte – was wäre dann passiert?",
          answers: [
            "Der Zahlungsbefehl wird rechtskräftig und vollstreckbar – das Unternehmen kann Exekution führen.",
            "Das Gericht lädt trotzdem zur Verhandlung und prüft die Rechnung genau.",
            "Die Forderung verfällt, weil das Unternehmen nichts bewiesen hat."
          ],
          correct: 0,
          explanation: "Ohne rechtzeitigen Einspruch wird der Zahlungsbefehl rechtskräftig und wirkt wie ein Urteil: Er ist ein Exekutionstitel. Das Unternehmen kann dann zum Beispiel eine Lohn- oder Kontopfändung beantragen. Deshalb gilt: Post vom Gericht nie ignorieren!"
        }
      ],
      outcomes: [
        "Dank rechtzeitigem Einspruch muss das Unternehmen seine Forderung erst beweisen. Lukas ist bestens verteidigt.",
        "Lukas kommt mit einem blauen Auge davon – beim Mahnverfahren war die Kanzlei nicht ganz sattelfest.",
        "Für Lukas wird es teuer: Wer Fristen und Einspruch nicht kennt, riskiert eine Exekution."
      ]
    },
    {
      title: "Der Bankprozess",
      difficulty: "Schwer",
      parties: { plaintiff: "Bank", defendant: "Glück" },
      client: "Glück",
      clientFor: "Glück",
      clientRole: "Mandant",
      opponent: "Mikail",
      opponentNote: "als Anwalt der Bank",
      cast: {
        client: { name: "Glück", label: "Mandant · beklagte Partei", look: { hair: "#3a2a20", style: "curly", coat: "#4b3b6b", shirt: "#ece6f2" } },
        opponent: { name: "Mikail", label: "Anwalt der Bank", look: { hair: "#141210", style: "slick", coat: "#101318", shirt: "#f4f4f2", tie: "#c9a458" } }
      },
      subject: "Forderung aus Kreditvertrag",
      amount: "28.000 €",
      intro: [
        { who: "judge", text: "Im letzten Verfahren fordert die Bank 28.000 Euro aus einem Kreditvertrag von Glück. Mikail vertritt die Bank." },
        { who: "client", text: "Ich bestreite diese Forderung. Ich habe Raten bezahlt und möchte wissen, wie die Bank auf diesen Betrag kommt." },
        { who: "opponent", text: "Die Bank ist überzeugt, dass die Forderung berechtigt ist." },
        { who: "judge", text: "5BHEL, Sie vertreten Glück. Jetzt kommt es auf Ihre juristische Argumentation an." }
      ],
      questions: [
        {
          topic: "Sachliche Zuständigkeit",
          ask: "Die Bank fordert 28.000 €. Welches Gericht ist in erster Instanz sachlich zuständig?",
          answers: [
            "Das Bezirksgericht – es ist für alle Klagen gegen Privatpersonen zuständig.",
            "Das Oberlandesgericht – weil es um einen hohen Betrag geht.",
            "Das Landesgericht – weil der Streitwert über 15.000 € liegt."
          ],
          correct: 2,
          explanation: "Liegt der Streitwert über 15.000 €, ist in erster Instanz das Landesgericht zuständig. Das Oberlandesgericht entscheidet erst in zweiter Instanz, etwa über Berufungen gegen Urteile des Landesgerichts."
        },
        {
          topic: "Anwaltspflicht & Verfahrenshilfe",
          ask: "Glück möchte sich vor Gericht selbst vertreten – ein Anwalt sei ihm zu teuer. Was gilt?",
          answers: [
            "Vor dem Landesgericht besteht Anwaltspflicht. Kann er die Kosten nicht tragen, kann er Verfahrenshilfe beantragen – samt beigestelltem Anwalt.",
            "Er darf sich selbst vertreten – eine Anwaltspflicht gibt es nur im Strafverfahren.",
            "Er braucht einen Anwalt. Die Verfahrenshilfe zahlt dann auch die Kosten der Bank, falls er verliert."
          ],
          correct: 0,
          explanation: "Vor dem Landesgericht gilt absolute Anwaltspflicht – für beide Seiten. Wer die Kosten nicht tragen kann, ohne seinen notwendigen Unterhalt zu gefährden, erhält auf Antrag Verfahrenshilfe, wenn der Prozess nicht aussichtslos oder mutwillig ist. Die Kosten des Gegners übernimmt sie aber nicht."
        },
        {
          topic: "Beweismittel",
          ask: "Die Bank legt eine Forderungsaufstellung vor. Wie lassen sich Bestand und Höhe der Forderung überprüfen?",
          answers: [
            "Gar nicht nötig – was eine Bank berechnet, gilt vor Gericht als bewiesen.",
            "Mit Kreditvertrag, Kontoauszügen und Zahlungsbelegen, Bankmitarbeitern als Zeugen und einem Sachverständigen für die Zinsen.",
            "Mit einer Online-Umfrage, ob die Zinsen fair wirken."
          ],
          correct: 1,
          explanation: "Die Bank muss beweisen, dass und in welcher Höhe die Forderung besteht – etwa mit Kreditvertrag und Kontoauszügen. Glück kann mit Zahlungsbelegen nachweisen, dass er Raten bezahlt hat. Ein Sachverständiger kann die Zinsberechnung prüfen. Das Gericht würdigt alle Beweise frei."
        },
        {
          topic: "Gerichtlicher Vergleich",
          ask: "Mikail bietet für die Bank an: Glück zahlt 20.000 € in Raten, dann ist alles erledigt. Was bewirkt ein solcher gerichtlicher Vergleich?",
          answers: [
            "Er ist nur ein unverbindlicher Vorschlag – das Gericht fällt danach trotzdem ein Urteil.",
            "Er ist ein Urteil, gegen das man Berufung erheben kann.",
            "Er beendet den Prozess. Er ist kein Urteil, aber wie ein Urteil vollstreckbar – zahlt Glück nicht, droht Exekution."
          ],
          correct: 2,
          explanation: "Ein gerichtlicher Vergleich ist eine Einigung der Parteien, die das Gericht protokolliert. Er beendet den Prozess ohne Urteil, eine Berufung ist daher nicht möglich – und er ist ein Exekutionstitel. Oft vereinbaren die Parteien eine Frist, in der sie den Vergleich noch widerrufen können."
        }
      ],
      outcomes: [
        "Glück ist bestens vertreten – ob Urteil oder Vergleich, er weiß genau, was auf ihn zukommt.",
        "Glück ist ordentlich vertreten, doch vor dem Landesgericht hätte die Kanzlei präziser sein müssen.",
        "Vor dem Landesgericht war die Kanzlei überfordert. Glück sollte sich gut überlegen, ob er die Vollmacht verlängert."
      ]
    }
  ],

  // Dramaturgische Einwürfe: kurze, fallbezogene Wortmeldungen statt generischer Quiztexte.
  hearing: [
    [
      {phase:"ANTRAG", voice:"Efe", line:"Ich will meinen Schaden ersetzt bekommen. Rohallah soll die Reparatur bezahlen.", right:"Das ist der richtige Rechtsweg. Wir verhandeln einen Schadenersatzanspruch.", wrong:"Das Gericht widerspricht Ihrer Einordnung, Kanzlei 5BHEL. Hier geht es um Schadenersatz, nicht um Bestrafung."},
      {phase:"ZUSTÄNDIGKEIT", voice:"Gerichtsdiener", line:"Die Klage über 6.000 Euro liegt vor. An welches Gericht soll die Akte gehen?", right:"Die Akte kann an das sachlich zuständige Gericht weitergeleitet werden.", wrong:"Halt! Prüfen Sie den Streitwert, bevor Sie die Akte weiterschicken."},
      {phase:"BEWEISAUFNAHME", voice:"Rohallah", line:"Efe war zu schnell! Ich bestreite, dass ich allein verantwortlich bin.", right:"Gut. Behauptungen allein reichen nicht – wir brauchen überprüfbare Beweise.", wrong:"Eine bloße Behauptung gewinnt noch keinen Prozess. Was lässt sich tatsächlich beweisen?"},
      {phase:"KOSTENENTSCHEIDUNG", voice:"Efe", line:"Und wenn ich nur die Hälfte bekomme – muss ich trotzdem alles bezahlen?", right:"Richtig. Auch das Verhältnis von Obsiegen und Unterliegen zählt.", wrong:"Die Kostenfrage ist heikel. Ein teilweiser Erfolg bedeutet nicht automatisch einen vollen Kostenersatz."}
    ],
    [
      {phase:"KLAGE", voice:"Lukas", line:"Ich habe diese Zusatzdienste nie bestellt. Trotzdem verlangt das Unternehmen 480 Euro.", right:"Die Kanzlei hat die Verfahrensart richtig eingeordnet.", wrong:"Das ist ein Streit über eine Geldforderung. Prüfen Sie die Verfahrensart erneut."},
      {phase:"GERICHTSPOST", voice:"Lukas", line:"Da steht 'bedingter Zahlungsbefehl'. Hat mich das Gericht schon verurteilt?", right:"Gut erkannt. Dieser Zahlungsbefehl ist noch keine Entscheidung nach einer Beweisaufnahme.", wrong:"Vorsicht! Der bedingte Zahlungsbefehl hat eine besondere Funktion im Mahnverfahren."},
      {phase:"FRIST", voice:"Lukas", line:"Die Rechnung stimmt nicht. Was muss ich jetzt tun, bevor es zu spät ist?", right:"Rechtzeitig reagiert. Damit kann die Forderung im Verfahren geprüft werden.", wrong:"Fristenfehler können teuer werden. Das richtige Rechtsmittel heißt hier Einspruch."},
      {phase:"VOLLSTRECKUNG", voice:"Herr Lehrner", line:"Angenommen, es wäre kein Einspruch gekommen: Dann würde das Unternehmen die Forderung eintreiben.", right:"Genau. Die Rechtskraft hätte konkrete Folgen für Lukas.", wrong:"Ein Zahlungsbefehl verschwindet nicht, nur weil niemand darauf antwortet."}
    ],
    [
      {phase:"KLAGEEINGANG", voice:"Mikail", line:"Ich klage für die Bank 28.000 Euro ein. Glück bestreitet die Höhe unserer Forderung.", right:"Die Zuständigkeit ist geklärt. Das Verfahren kann weitergehen.", wrong:"Die Höhe des Streitwerts ist entscheidend. Prüfen Sie die erste Instanz."},
      {phase:"VERTRETUNG", voice:"Glück", line:"Ich kann mir keinen Anwalt leisten. Muss ich den Prozess deshalb aufgeben?", right:"Richtig. Die Verfahrenshilfe kann den Zugang zum Gericht ermöglichen.", wrong:"So einfach ist es nicht. Prüfen Sie Anwaltspflicht und Verfahrenshilfe gemeinsam."},
      {phase:"BEWEISPRÜFUNG", voice:"Glück", line:"Hier sind meine Überweisungen. Die Bank hat manche Raten offenbar nicht berücksichtigt.", right:"Die Unterlagen gehören in die Beweisaufnahme. Sehr gut.", wrong:"Weder der Bank noch Glück wird automatisch geglaubt. Belege sind entscheidend."},
      {phase:"VERGLEICHSANGEBOT", voice:"Mikail", line:"Die Bank akzeptiert 20.000 Euro in Raten, wenn die Sache damit erledigt ist.", right:"Ein Vergleich kann den Streit ohne Urteil beenden. Die Folgen müssen klar sein.", wrong:"Ein Vergleich ist kein Urteil – seine Wirkung ist trotzdem verbindlich und vollstreckbar."}
    ]
  ],

  reactions: {
    right: [
      "Überzeugend. Das Gericht folgt der Kanzlei 5BHEL.",
      "Korrekt – so sieht es das Verfahrensrecht vor.",
      "Präzise argumentiert. Das hält.",
      "Sehr gut. Ihre Mandantschaft kann zufrieden sein.",
      "Richtig. Das Gericht nimmt das zu Protokoll."
    ],
    wrong: [
      "Das überzeugt das Gericht nicht.",
      "Hier muss ich die Kanzlei korrigieren.",
      "Leider nein – das wäre für Ihre Mandantschaft teuer geworden.",
      "Das Gericht sieht das anders.",
      "Abgelehnt – das stimmt so nicht."
    ],
    skipped: "Diese Frage wird übersprungen. Die richtige Lösung lautet:",
    liveRight: "Die 5BHEL hat korrekt entschieden.",
    liveWrong: "Die Mehrheit hat sich geirrt. Sehen wir uns die Rechtslage genauer an."
  },

  finalTiers: [
    { min: 1200, title: "Prozessführung mit Auszeichnung",
      text: "Die Kanzlei 5BHEL hat alle zwölf Entscheidungen richtig getroffen. Zuständigkeit, Mahnverfahren, Anwaltspflicht und Vergleich – die Mandanten sind in besten Händen." },
    { min: 1000, title: "Ausgezeichnete Kanzlei",
      text: "Die 5BHEL hat fast fehlerfrei prozessiert. Kleine Unsicherheiten ändern nichts am Gesamtbild: Diese Kanzlei kennt das Zivilverfahren." },
    { min: 700, title: "Solide Prozessführung",
      text: "Die 5BHEL hat die Mehrzahl der Entscheidungen richtig getroffen. In einzelnen Punkten hätte die Mandantschaft aber Geld verloren." },
    { min: 400, title: "Bedingt prozessreif",
      text: "Einige Mandanten hätten heute verloren. Das Gericht empfiehlt, die Grundlagen des Zivilverfahrens noch einmal zu wiederholen." },
    { min: 0, title: "Kanzlei unter Beobachtung",
      text: "Die Mandanten sollten sich eine zweite Meinung einholen. Das Gericht empfiehlt dringend eine Nachschulung im Zivilverfahrensrecht." }
  ],

  takeaways: [
    "Zivilgericht: Streit zwischen Privaten um Geld oder Rechte. Strafgericht: Bestrafung von Straftaten.",
    "Bezirksgericht bis 15.000 € Streitwert, darüber das Landesgericht.",
    "Bedingter Zahlungsbefehl: Einspruch binnen 4 Wochen – sonst wird er rechtskräftig und vollstreckbar.",
    "Berufung richtet sich gegen ein Urteil. Ein gerichtlicher Vergleich beendet den Prozess.",
    "Am Landesgericht gilt Anwaltspflicht; wer bedürftig ist, kann Verfahrenshilfe beantragen."
  ]
};
