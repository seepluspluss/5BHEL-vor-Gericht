// 5BHEL vor Gericht – portabler Starter.
// Enthält alle Spieldateien als eingebettete Ressourcen, entpackt sie nach %LOCALAPPDATA%\5BHEL-vor-Gericht\game
// und öffnet index.html in Microsoft Edge im App-Modus (Vollbild). Keine Administratorrechte, kein Internet nötig.
// Fallback ohne Edge: Standardbrowser.  Selbsttest:  5BHEL-vor-Gericht.exe --selftest  (Ergebnis in selftest.txt)
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("5BHEL vor Gericht")]
[assembly: AssemblyProduct("5BHEL vor Gericht")]
[assembly: AssemblyDescription("Interaktive Gerichtsverhandlung zum österreichischen Zivilverfahrensrecht")]
[assembly: AssemblyVersion("1.0.0.0")]

static class Program
{
    static readonly string[] GameFiles = { "index.html", "css/style.css", "js/cases.js", "js/game.js", "js/autotest.js" };

    [STAThread]
    static int Main(string[] args)
    {
        bool selftest = Array.IndexOf(args, "--selftest") >= 0;
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "5BHEL-vor-Gericht");
        try
        {
            string gameDir = Path.Combine(root, "game");
            Extract(gameDir);
            string index = Path.Combine(gameDir, "index.html");
            string url = new Uri(index).AbsoluteUri;
            string edge = FindEdge();

            if (selftest) return SelfTest(root, edge, url);

            if (edge != null)
            {
                string profile = Path.Combine(root, "edge-profil");
                var psi = new ProcessStartInfo(edge,
                    "--app=\"" + url + "\" --start-fullscreen --user-data-dir=\"" + profile + "\"" +
                    " --no-first-run --no-default-browser-check --disable-features=Translate --disable-sync");
                psi.UseShellExecute = false;
                Process.Start(psi);
            }
            else
            {
                var psi = new ProcessStartInfo(index);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            return 0;
        }
        catch (Exception ex)
        {
            if (selftest) { TryWrite(Path.Combine(root, "selftest.txt"), "FAIL Ausnahme: " + ex); return 1; }
            MessageBox.Show("Das Spiel konnte nicht gestartet werden:\n\n" + ex.Message +
                "\n\nAlternative: Im Spielordner die Datei index.html per Doppelklick öffnen.",
                "5BHEL vor Gericht", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    static void Extract(string gameDir)
    {
        Assembly asm = Assembly.GetExecutingAssembly();
        foreach (string rel in GameFiles)
        {
            string target = Path.Combine(gameDir, rel.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(target));
            using (Stream s = asm.GetManifestResourceStream("game/" + rel))
            {
                if (s == null) throw new InvalidOperationException("Ressource fehlt: " + rel);
                using (FileStream f = File.Create(target)) s.CopyTo(f);
            }
        }
    }

    static string FindEdge()
    {
        string[] keys = {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
        };
        foreach (RegistryKey hive in new[] { Registry.CurrentUser, Registry.LocalMachine })
            foreach (string k in keys)
            {
                try
                {
                    using (RegistryKey rk = hive.OpenSubKey(k))
                    {
                        string p = rk == null ? null : rk.GetValue("") as string;
                        if (!string.IsNullOrEmpty(p) && File.Exists(p.Trim('"'))) return p.Trim('"');
                    }
                }
                catch { }
            }
        string[] candidates = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
        };
        foreach (string c in candidates) if (File.Exists(c)) return c;
        return null;
    }

    // Startet Edge unsichtbar (headless) mit dem eingebauten Spiel-Selbsttest.
    static int SelfTest(string root, string edge, string url)
    {
        string report = Path.Combine(root, "selftest.txt");
        if (edge == null) { TryWrite(report, "FAIL Edge nicht gefunden"); return 2; }
        var psi = new ProcessStartInfo(edge,
            "--headless=new --disable-gpu --no-first-run --window-size=1390,860 --virtual-time-budget=120000 --dump-dom" +
            " --user-data-dir=\"" + Path.Combine(root, "selftest-profil") + "\" \"" + url + "?autotest=1\"");
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;
        using (Process p = Process.Start(psi))
        {
            p.ErrorDataReceived += delegate { };
            p.BeginErrorReadLine();
            string dom = p.StandardOutput.ReadToEnd();
            p.WaitForExit(180000);
            bool pass = dom.Contains("<title>AUTOTEST:PASS</title>");
            int i = dom.IndexOf("<pre id=\"autotest-out\">");
            string json = i >= 0 ? dom.Substring(i, Math.Min(4000, dom.Length - i)) : "(kein Ergebnis)";
            TryWrite(report, (pass ? "PASS" : "FAIL") + "\r\nEdge: " + edge + "\r\nURL: " + url + "\r\n" + json);
            return pass ? 0 : 1;
        }
    }

    static void TryWrite(string path, string text)
    {
        try { Directory.CreateDirectory(Path.GetDirectoryName(path)); File.WriteAllText(path, text); } catch { }
    }
}
