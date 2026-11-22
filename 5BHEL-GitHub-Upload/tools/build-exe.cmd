@echo off
rem Baut 5BHEL-vor-Gericht.exe mit dem in Windows enthaltenen .NET-Framework-Compiler (keine Installation noetig).
setlocal
cd /d "%~dp0.."
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
if not exist "%CSC%" ( echo csc.exe nicht gefunden & exit /b 2 )
set ICONARG=
if exist "tools\launcher\icon.ico" set ICONARG=/win32icon:"tools\launcher\icon.ico"
"%CSC%" /nologo /target:winexe /optimize+ /platform:anycpu /out:"5BHEL-vor-Gericht.exe" %ICONARG% ^
  /reference:System.Windows.Forms.dll ^
  /resource:"index.html,game/index.html" ^
  /resource:"css\style.css,game/css/style.css" ^
  /resource:"js\cases.js,game/js/cases.js" ^
  /resource:"js\game.js,game/js/game.js" ^
  /resource:"js\autotest.js,game/js/autotest.js" ^
  "tools\launcher\Launcher.cs"
exit /b %ERRORLEVEL%
