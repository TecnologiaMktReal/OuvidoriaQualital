#!/bin/bash
set -e

echo "🚀 Iniciando Configuração Qualital Ouvidoria na AWS VPS..."

# 1. Update system
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# 3. Install Node.js v22
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js v22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 4. Install PM2 and Yarn/Pnpm
echo "📊 Instalando PM2 e PNPM..."
sudo npm install -g pm2 pnpm

# 5. Setup Project Folder
echo "📁 Preparando diretórios..."
mkdir -p ~/app
cd ~/app

# 6. Clone Repository
if [ ! -d "OuvidoriaQualital" ]; then
    echo "🌀 Clonando repositório..."
    git clone https://github.com/TecnologiaMktReal/OuvidoriaQualital.git
fi

cd OuvidoriaQualital

# 7. Install Dependencies
echo "🛠️ Instalando dependências do projeto..."
pnpm install

# 8. Setup Docker Compose for MySQL
echo "🐬 Subindo container MySQL (Porta 3333)..."
sudo docker compose up -d

# 9. Install Nginx
echo "🌐 Instalando e configurando Nginx..."
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/ouvidoria > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Body limit for large uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:15000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ouvidoria /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Configuração Básica Concluída!"
echo "⚠️  PRÓXIMO PASSO: Você deve configurar o arquivo .env no servidor manualmente com as chaves reais."
