# 🔐 Variáveis de Ambiente Necessárias

Este documento lista todas as variáveis de ambiente que você precisa configurar no arquivo `.env` para executar o sistema localmente.

## 📝 Como Criar o Arquivo .env

1. Crie um arquivo chamado `.env` na raiz do projeto
2. Copie e cole as variáveis abaixo
3. Substitua os valores de exemplo pelos seus valores reais

## ⚙️ Variáveis Obrigatórias

### Banco de Dados MySQL

```env
DATABASE_URL="mysql://helpdesk_user:sua_senha_mysql@localhost:3306/helpdesk_coopedu"
```

**Formato:** `mysql://usuario:senha@host:porta/nome_banco`

- **usuario**: Nome do usuário MySQL que você criou
- **senha**: Senha do usuário MySQL
- **host**: `localhost` (para instalação local)
- **porta**: `3306` (porta padrão do MySQL)
- **nome_banco**: `helpdesk_coopedu` (nome do banco de dados)

### Segurança JWT

```env
JWT_SECRET="cole_aqui_uma_chave_aleatoria_de_32_caracteres_ou_mais"
```

**Como gerar uma chave segura:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Este comando irá gerar uma chave aleatória segura. Copie o resultado e cole no JWT_SECRET.

### Configuração do Servidor

```env
PORT=3000
NODE_ENV=development
```

- **PORT**: Porta onde o servidor irá rodar (padrão: 3000)
- **NODE_ENV**: Ambiente de execução (`development` ou `production`)

## 🔧 Variáveis Opcionais (para funcionalidades básicas)

### Informações do Administrador

```env
OWNER_OPEN_ID="admin"
OWNER_NAME="Administrador"
```

### Configurações da Aplicação

```env
VITE_APP_TITLE="Sistema Helpdesk Coopedu"
VITE_APP_LOGO="/logo.png"
```

## 🚀 Variáveis Avançadas (Opcional - para integração com Manus)

Se você quiser usar funcionalidades avançadas como OAuth Manus, LLM, Storage, etc.:

```env
# OAuth Manus
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="seu_app_id_manus"

# APIs Manus
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="sua_chave_api_backend"
VITE_FRONTEND_FORGE_API_KEY="sua_chave_api_frontend"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"

# Analytics
VITE_ANALYTICS_ENDPOINT=""
VITE_ANALYTICS_WEBSITE_ID=""
```

## 📋 Exemplo Completo de Arquivo .env

```env
# Banco de Dados
DATABASE_URL="mysql://helpdesk_user:minhasenha123@localhost:3306/helpdesk_coopedu"

# Servidor
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API (oficial)
# Habilite a integração e configure as credenciais oficiais
WHATSAPP_ENABLED=true
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_GRAPH_API_URL=https://graph.facebook.com
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_URL=http://localhost:3000/api/webhooks/whatsapp
WHATSAPP_DEFAULT_COUNTRY_CODE=55
WHATSAPP_TIMEOUT_MS=15000
# Chave usada para criptografar tokens quando salvos via painel
WHATSAPP_CRYPTO_KEY="defina_uma_chave_forte_de_32_caracteres"

# WhatsApp QR (Tipo 2 - sessão estilo WhatsApp Web)
# Ativar QR: selecione no painel ou defina o modo; requer Chromium/Chrome disponível
WHATSAPP_QR_ENABLED=true
WHATSAPP_QR_SESSION_NAME=helpdesk-coopedu-qr
WHATSAPP_QR_HEADLESS=true
WHATSAPP_QR_INIT_TIMEOUT_MS=30000

# Segurança
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"

# Administrador
OWNER_OPEN_ID="admin"
OWNER_NAME="Ricardo Palacio"

# Aplicação
VITE_APP_TITLE="Sistema Helpdesk Coopedu"
VITE_APP_LOGO="/logo.png"

# OAuth Manus (opcional)
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID=""

# APIs Manus (opcional)
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=""
VITE_ANALYTICS_WEBSITE_ID=""
```

## ⚠️ Importante

1. **NUNCA** compartilhe seu arquivo `.env` com outras pessoas
2. **NUNCA** faça commit do arquivo `.env` no Git
3. Use senhas fortes e diferentes para cada ambiente (desenvolvimento/produção)
4. O JWT_SECRET deve ter no mínimo 32 caracteres
5. Mantenha backups das suas configurações em local seguro
6. Para WhatsApp Cloud API, prefira manter tokens sensíveis nas variáveis de ambiente. Se usar o painel para salvar tokens, defina `WHATSAPP_CRYPTO_KEY` para criptografia.

## 🔍 Verificação

Após criar o arquivo `.env`, verifique se ele está correto:

```bash
# O arquivo .env deve existir na raiz do projeto
ls -la .env

# Verifique se as variáveis estão carregadas (não mostra valores por segurança)
pnpm dev
```

Se tudo estiver correto, o servidor iniciará sem erros de configuração.


