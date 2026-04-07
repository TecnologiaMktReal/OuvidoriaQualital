@echo off
echo ========================================
echo  Iniciando Helpdesk Coopedu
echo ========================================
echo.

REM Verificar se .env.local existe
if not exist ".env.local" (
    echo ERRO: Arquivo .env.local nao encontrado!
    echo Por favor, configure o arquivo .env.local antes de iniciar.
    pause
    exit /b 1
)

REM Copiar .env.local para .env
copy /Y .env.local .env >nul

echo Executando migrations do banco de dados...
call npx pnpm db:push
if errorlevel 1 (
    echo ERRO: Falha ao executar migrations
    echo Verifique se o MySQL esta rodando e as credenciais no .env.local estao corretas
    pause
    exit /b 1
)

echo.
echo Populando dados iniciais...
call npx pnpm exec tsx drizzle/seed.mjs
if errorlevel 1 (
    echo AVISO: Falha ao popular dados iniciais (pode ja existir)
)

echo.
echo ========================================
echo  Servidor iniciado com sucesso!
echo ========================================
echo.
echo  Acesse: http://localhost:15000
echo.
echo  Pressione Ctrl+C para parar o servidor
echo ========================================
echo.

REM Iniciar servidor
call npx pnpm dev

pause

