@echo off
title Depto Rentas Temporarias (Airbnb & Particulares)
echo ========================================================
echo   Iniciando Administrador de Alquiler Temporario...
echo ========================================================
echo.

cd /d "%~dp0"

echo Verificando dependencias...
if not exist "node_modules" (
    echo Instalando paquetes por primera vez...
    call npm install
)

if not exist "dist" (
    echo Compilando interfaz...
    call npm run build
)

echo.
echo ========================================================
echo  Servidor activo en: http://localhost:3001
echo  Presiona Ctrl+C para detener el servidor cuando desees.
echo ========================================================
echo.

start http://localhost:3001
node server/index.js
pause
