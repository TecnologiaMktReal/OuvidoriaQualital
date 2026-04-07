#!/bin/bash

# ============================================================================
# Sistema Ouvidoria Qualital - Script de Inicialização
# ============================================================================

echo "========================================"
echo " Sistema Ouvidoria Qualital"
echo " Script de Inicialização"
echo "========================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Por favor, instale Node.js antes de continuar."
    echo "Download: https://nodejs.org/"
    exit 1
fi

# Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo "[AVISO] pnpm não encontrado. Instalando..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar pnpm"
        exit 1
    fi
fi

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "[ERRO] Arquivo .env não encontrado!"
    echo ""
    echo "Por favor, crie o arquivo .env seguindo as instruções em:"
    echo "- README_INSTALACAO_LOCAL.md"
    echo "- VARIAVEIS_AMBIENTE.md"
    echo ""
    exit 1
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependências pela primeira vez..."
    echo "Isso pode levar alguns minutos..."
    echo ""
    pnpm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências"
        exit 1
    fi
fi

echo ""
echo "[INFO] Iniciando servidor de desenvolvimento..."
echo ""
echo "O sistema estará disponível em: http://localhost:3000"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""
echo "========================================"
echo ""

pnpm dev

