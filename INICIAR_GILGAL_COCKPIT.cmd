@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\" (
  echo Instalando dependencias do GILGAL Cockpit...
  call npm.cmd install
  if errorlevel 1 goto :error
)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5173"
call npm.cmd run dev -- --host 127.0.0.1
exit /b %errorlevel%
:error
echo.
echo Nao foi possivel iniciar o GILGAL Cockpit.
pause
exit /b 1

