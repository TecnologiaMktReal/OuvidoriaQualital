@echo off
REM Script para aplicar schema no banco de producao (Zeabur)
REM Uso: apply-schema-production.bat

echo.
echo ========================================
echo  Aplicar Schema em Producao (Zeabur)
echo ========================================
echo.

REM Verificar se a variavel de ambiente esta configurada
if "%PRODUCTION_DATABASE_URL%"=="" (
    echo [ERRO] Variavel PRODUCTION_DATABASE_URL nao configurada!
    echo.
    echo Configure primeiro a connection string do MySQL do Zeabur:
    echo   set PRODUCTION_DATABASE_URL=mysql://user:password@host:port/database
    echo.
    echo Ou edite este arquivo .bat e adicione a linha acima no inicio.
    echo.
    pause
    exit /b 1
)

echo [INFO] Executando script de migracao...
echo.

node scripts\apply-schema-production.mjs

echo.
pause

