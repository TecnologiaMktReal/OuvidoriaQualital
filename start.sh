#!/bin/bash

echo "========================================"
echo " Iniciando Helpdesk Coopedu"
echo "========================================"
echo ""

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "ERRO: Arquivo .env.local não encontrado!"
    echo "Por favor, configure o arquivo .env.local antes de iniciar."
    exit 1
fi

# Copiar .env.local para .env
cp -f .env.local .env

echo "Executando migrations do banco de dados..."
pnpm db:push
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao executar migrations"
    echo "Verifique se o MySQL está rodando e as credenciais no .env.local estão corretas"
    exit 1
fi

echo ""
echo "Populando dados iniciais..."
pnpm exec tsx drizzle/seed.mjs
if [ $? -ne 0 ]; then
    echo "AVISO: Falha ao popular dados iniciais (pode já existir)"
fi

echo ""
echo "========================================"
echo " Servidor iniciado com sucesso!"
echo "========================================"
echo ""
echo "  Acesse: http://localhost:15000"
echo ""
echo "  Pressione Ctrl+C para parar o servidor"
echo "========================================"
echo ""

# Iniciar servidor
pnpm dev

