@echo off
echo ========================================
echo  Instalacao - Helpdesk Coopedu
echo ========================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js 18+ antes de continuar.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado!
node --version
echo.

echo Verificando pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo pnpm nao encontrado. Instalando globalmente...
    npm install -g pnpm
    if errorlevel 1 (
        echo ERRO: Falha ao instalar pnpm
        pause
        exit /b 1
    )
)

echo pnpm encontrado!
pnpm --version
echo.

echo Instalando dependencias do projeto...
echo (Isso pode levar alguns minutos)
call npx pnpm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Configuracao do Banco de Dados
echo ========================================
echo.
echo IMPORTANTE: Configure o arquivo .env.local com suas credenciais MySQL
echo Exemplo: DATABASE_URL=mysql://usuario:senha@localhost:3309/BD_Ouvidoria
echo.
echo Apos configurar o .env.local, execute: start.bat
echo.
pause

