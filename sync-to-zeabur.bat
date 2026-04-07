@echo off
REM ============================================================
REM Script para sincronizar schema local -> Zeabur (Producao)
REM ============================================================

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║   SYNC SCHEMA: Local para Zeabur (Producao)       ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM Configurar connection string do banco de producao
set PRODUCTION_DATABASE_URL=mysql://root:yu1TPfqXtW8iUc305FM46DlC7EB9Qd2s@sjc1.clusters.zeabur.com:20354/zeabur

echo [INFO] Conectando ao banco de producao...
echo [INFO] Host: sjc1.clusters.zeabur.com:20354
echo.

REM Executar script de sincronizacao
node scripts/sync-schema-to-production.mjs

echo.
echo ============================================================
echo Script finalizado!
echo ============================================================
pause

