#!/bin/bash

echo "========================================"
echo " Instalação - Helpdesk Coopedu"
echo "========================================"
echo ""

echo "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado!"
    echo "Por favor, instale o Node.js 18+ antes de continuar."
    echo "Download: https://nodejs.org/"
    exit 1
fi

echo "Node.js encontrado!"
node --version
echo ""

echo "Verificando pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm não encontrado. Instalando globalmente..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "ERRO: Falha ao instalar pnpm"
        exit 1
    fi
fi

echo "pnpm encontrado!"
pnpm --version
echo ""

echo "Instalando dependências do projeto..."
echo "(Isso pode levar alguns minutos)"
npx pnpm install
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências"
    exit 1
fi

echo ""
echo "========================================"
echo " Configuração do Banco de Dados"
echo "========================================"
echo ""
echo "IMPORTANTE: Configure o arquivo .env.local com suas credenciais MySQL"
echo "Exemplo: DATABASE_URL=mysql://usuario:senha@localhost:3309/BD_Ouvidoria"
echo ""
echo "Após configurar o .env.local, execute: ./start.sh"
echo ""

