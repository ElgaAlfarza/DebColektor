@echo off
title DebColektor CRM - Local Mode
color 0B

echo ========================================================
echo       DEBCOLEKTOR CRM - MODE LOKAL
echo ========================================================
echo.
echo Menyalakan Server WhatsApp Backend...
cd /d "%~dp0backend"
start "" http://localhost:3001
node server.js
pause
