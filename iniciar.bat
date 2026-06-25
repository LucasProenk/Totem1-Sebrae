@echo off
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%~dp0index.html"
timeout /t 2 /nobreak >nul
powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate('Chrome'); Start-Sleep -Milliseconds 500; $wshell.SendKeys('{F11}')"
