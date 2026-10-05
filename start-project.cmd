@echo off
setlocal
cd /d "%~dp0"
set "PROJECT_NODE_RUNTIME="
set "PROJECT_NODE_EXE="
if not exist ".tools\node-runtime.txt" goto system_node
set /p PROJECT_NODE_RUNTIME=<".tools\node-runtime.txt"
set "PROJECT_NODE_EXE=%~dp0.tools\%PROJECT_NODE_RUNTIME%\node.exe"
if exist "%PROJECT_NODE_EXE%" goto node_ready
:system_node
set "PROJECT_NODE_EXE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined PROJECT_NODE_EXE set "PROJECT_NODE_EXE=%%N"
if defined PROJECT_NODE_EXE goto node_ready
echo Install Node.js LTS from https://nodejs.org/en/download, then reopen the terminal.
pause
exit /b 1
:node_ready
set "HOST=127.0.0.1"
set "PORT=4000"
powershell.exe -NoLogo -NoProfile -NonInteractive -Command "$ProgressPreference = 'SilentlyContinue'; try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 2 -ErrorAction Stop } catch { exit 1 }; if ($health.status -ne 'ok') { exit 1 }; Write-Host 'Project is already running at http://localhost:4000'; Start-Process 'http://localhost:4000'; exit 0"
if not errorlevel 1 exit /b 0
echo Starting project at http://localhost:4000. The browser will open automatically.
echo Keep this window open while using the project. Press Ctrl+C to stop.
start "" /b powershell.exe -NoLogo -NoProfile -NonInteractive -Command "$ProgressPreference = 'SilentlyContinue'; $deadline = [DateTime]::UtcNow.AddSeconds(30); while ([DateTime]::UtcNow -lt $deadline) { try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 1 -ErrorAction Stop } catch { $health = $null }; if ($health.status -eq 'ok') { Start-Process 'http://localhost:4000'; exit 0 }; Start-Sleep -Milliseconds 500 }; Write-Host 'Could not open the browser automatically. Check the server output, then open http://localhost:4000 manually.'"
"%PROJECT_NODE_EXE%" "backend\src\server.js"
set "PROJECT_EXIT_CODE=%ERRORLEVEL%"
if not "%PROJECT_EXIT_CODE%"=="0" pause
exit /b %PROJECT_EXIT_CODE%
