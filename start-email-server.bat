@echo off
chcp 65001 >nul
echo ========================================
echo   HelpDesk Coopedu - SERVIDOR LOCAL
echo ========================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    pause
    exit /b 1
)

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call pnpm install
)

echo [INFO] Configurando variaveis de ambiente...
REM Padrao do projeto: MySQL Docker em localhost:3307 usando o DB app_db
set DATABASE_URL=mysql://root:root@localhost:3307/app_db
set NODE_ENV=development
set RUN_MIGRATIONS_ON_START=true

echo.
echo [INFO] Iniciando servidor LOCAL...
echo.
echo ========================================
echo   Acesse: http://localhost:3000
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

npx tsx watch server/_core/index.ts

pause



