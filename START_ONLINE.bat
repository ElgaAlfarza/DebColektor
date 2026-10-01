@echo off
title DebColektor CRM - Online Mode (Cloudflare Tunnel)
color 0A

echo ========================================================
echo       DEBCOLEKTOR CRM - MODE ONLINE CLOUDFLARE
echo ========================================================
echo.
echo [1/2] Menyalakan Server WhatsApp Backend...
cd /d "%~dp0backend"
start /b node server.js

timeout /t 3 /nobreak >nul

echo.
echo [2/2] Membuka Akses Online via Cloudflare Tunnel...
echo.
echo ********************************************************
echo  PENTING: Salin link https://...trycloudflare.com di bawah
echo  Link tersebut bisa dibuka di HP / Laptop tim Anda!
echo ********************************************************
echo.

cd /d "%~dp0"
cloudflared.exe tunnel --url http://localhost:3001
pause
