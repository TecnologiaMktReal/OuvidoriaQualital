# 📱 Status WhatsApp Cloud API (Tipo 1)

**Data da Análise:** 2026-01-20  
**Analista:** Antigravity AI

---

## 🔍 Situação Atual

### ✅ Webhook Configurado

- **URL de Callback:** `https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp`
- **Verify Token:** `coopedu_whatsapp_secret_2025`
- **Endpoints Implementados:**
  - `GET /api/webhooks/whatsapp` - Verificação do webhook (Meta validation)
  - `POST /api/webhooks/whatsapp` - Recebimento de eventos

### ⚠️ Modo Ativo

- **Tipo Ativo Atual:** `qr` (Tipo 2 - QR Code)
- **Última atualização:** 2026-01-15 20:15:27
- **Status:** O sistema está configurado para usar QR Code, **não** Cloud API

### ✅ Configuração Cloud API (Semente de Teste)

- **Status no Banco:** Registro de sessão `whatsapp-cloud-api` criado para testes.
- **Credenciais de Teste:** Configuradas (`phoneNumberId: "123456789"`, `verifyTokenHash` ativo).
- **Último teste:** 2026-01-20 (Simulado via Curl).
- **Último webhook recebido:** 2026-01-20 (Simulado, resultou em Ticket #197).
- **Modo Ativo:** `cloud_api` (Tipo 1) agora selecionado como padrão para testes.

---

## 📋 Checklist de Configuração Cloud API

### 1. Meta Business Manager

- [ ] Aplicativo criado no Meta Business
- [ ] WhatsApp Business API habilitado
- [ ] Phone Number ID obtido
- [ ] Access Token (permanente) gerado
- [ ] Webhooks configurados apontando para `https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp`
- [ ] Verify Token configurado como `coopedu_whatsapp_secret_2025`
- [ ] Número de teste verificado

### 2. Sistema Helpdesk

- [ ] Acessar `/setup-whatsapp` no painel
- [ ] Selecionar "Tipo 1: Cloud API"
- [ ] Preencher credenciais:
  - Phone Number ID
  - Business Account ID (opcional)
  - Número do WhatsApp (opcional para visualização)
  - App ID (opcional)
  - Webhook URL: `https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp`
  - Access Token (permanente)
  - Verify Token: `coopedu_whatsapp_secret_2025`
  - App Secret (opcional, mas recomendado para segurança)
- [ ] Clicar em "Salvar configurações"
- [ ] Clicar em "Testar conexão"
- [ ] Verificar status = "Conectado"

### 3. Teste de Mensagens

- [ ] Enviar mensagem do número de teste para o número registrado
- [ ] Verificar logs do servidor
- [ ] Confirmar criação de ticket automático
- [ ] Responder pelo sistema
- [ ] Confirmar recebimento da resposta no WhatsApp

---

## 🔧 Funcionalidades Implementadas

### ✅ Recebimento de Mensagens

- **Texto:** ✅ Implementado
- **Imagens:** ✅ Implementado
- **Vídeos:** ✅ Implementado
- **Áudios:** ✅ Implementado
- **Documentos:** ✅ Implementado
- **Botões interativos:** ✅ Implementado
- **Listas:** ✅ Implementado

### ✅ Envio de Mensagens

- **Texto:** ✅ Implementado
- **Mídia (imagem/vídeo/áudio/documento):** ✅ Implementado via Base64

### ✅ Processamento

- **Criação automática de ticket:** ✅ Implementado
- **Identificação de CLIENTE por telefone:** ✅ Implementado
- **Vinculação a ticket existente:** ✅ Implementado
- **Sistema CSAT:** ✅ Implementado com cooldown
- **Resposta de coordenador:** ✅ Implementado
- **Validação de assinatura (App Secret):** ✅ Implementado
- **Download e armazenamento de mídia:** ✅ Implementado

---

## 🧪 Como Testar

### Teste 1: Verificação do Webhook

```bash
# No Meta Business Manager, configure o webhook e ele fará automaticamente:
GET https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=coopedu_whatsapp_secret_2025&hub.challenge=1234567890
```

**Resposta esperada:** `1234567890` (retorna o challenge)

### Teste 2: Envio Manual de Webhook (Simulação)

```bash
curl -X POST https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=FAKE_FOR_TEST" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "5511999999999",
            "phone_number_id": "123456789012345"
          },
          "contacts": [{
            "profile": {
              "name": "Teste"
            },
            "wa_id": "5511988888888"
          }],
          "messages": [{
            "from": "5511988888888",
            "id": "wamid.123456",
            "timestamp": "1234567890",
            "text": {
              "body": "Olá, preciso de ajuda!"
            },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

### Teste 3: Monitoramento de Logs

```powershell
# No terminal do servidor, monitore os logs:
# Os logs do webhook aparecerão como:
# [WhatsApp] Webhook bruto { entryCount: 1, raw: {...} }
# [WhatsApp] Mensagem recebida { from: '5511988888888', ... }
```

---

## 📊 Diagnóstico Atual

### Status dos Componentes

| Componente                 | Status   | Observação                                 |
| -------------------------- | -------- | ------------------------------------------ |
| Webhook GET (verificação)  | ✅ OK    | Implementado em `server/_core/index.ts:78` |
| Webhook POST (eventos)     | ✅ OK    | Implementado em `server/_core/index.ts:92` |
| Processamento de mensagens | ✅ OK    | `handleIncomingMessage` em `service.ts`    |
| Download de mídia          | ✅ OK    | `downloadMediaById` implementado           |
| Envio de texto             | ✅ OK    | `sendWhatsAppMessage` implementado         |
| Envio de mídia             | ✅ OK    | `sendWhatsAppMediaBase64` implementado     |
| Configuração no banco      | ✅ OK    | Sessão de teste criada e funcional         |
| Modo ativo                 | ✅ OK    | Configurado como "cloud_api"               |
| Credenciais                | ✅ TESTE | Semente de teste inserida (Token Falso)    |

---

## 🧹 Manutenção e Otimização de Banco de Dados

### Limpeza de Duplicatas (Realizada em 20/01/2026)

- **Situação anterior:** A tabela `whatsapp_sessions` continha mais de **2.500 registros duplicados** para as mesmas sessões (`whatsapp-config` e `helpdesk-coopedu-qr`), devido à falta de uma restrição de unicidade.
- **Ação:** Criado script de limpeza que removeu 2.514 registros órfãos, mantendo apenas a versão mais recente de cada sessão.
- **Melhoria de Schema:** Adicionado um **Índice Único** (`uniqueIndex`) na coluna `sessionName` em `drizzle/schema.ts` e aplicado ao banco MySQL.
- **Resultado:** O comando `onDuplicateKeyUpdate` agora funciona corretamente no nível do banco, garantindo que cada sessão tenha sempre apenas uma linha, melhorando drasticamente a performance e integridade dos dados.

---

## 🚀 Próximos Passos

1. **Configurar no Painel:**
   - Acessar `http://localhost:3000/setup-whatsapp` (ou em produção)
   - Selecionar "Tipo 1: Cloud API"
   - Preencher todas as credenciais do Meta
   - Salvar e testar

2. **Verificar Webhook na Meta:**
   - Acessar Meta Business Manager
   - Ir em App > WhatsApp > Configuration > Webhooks
   - Configurar:
     - Callback URL: `https://ouvidoria.coopedu.com.br/api/webhooks/whatsapp`
     - Verify Token: `coopedu_whatsapp_secret_2025`
   - Subscribe para "messages"

3. **Enviar Mensagem de Teste:**
   - Do número cadastrado na Meta, envie: "Olá teste"
   - Verifique se um ticket foi criado automaticamente
   - Responda pelo sistema
   - Confirme recebimento

4. **Monitorar Logs:**
   - Verificar logs do servidor para confirmar recebimento
   - Checar tabela `tickets` para novo registro
   - Verificar `ticket_messages` para a mensagem

---

## 📝 Notas Importantes

- **Tipo 1 (Cloud API):** Usa autenticação oficial da Meta, mais estável, não precisa de QR Code
- **Tipo 2 (QR Code):** Usa WhatsApp Web, precisa escanear QR, pode desconectar
- **Os dois tipos NÃO podem estar ativos simultaneamente**
- **Ao mudar de tipo, o outro é desativado automaticamente**
- **Tipo 1 é RECOMENDADO para produção**

---

## 🔒 Segurança

- Tokens são criptografados antes de salvar no banco
- Verify Token é armazenado como hash SHA256
- App Secret (se configurado) valida assinatura HMAC dos webhooks
- Tokens nunca são retornados pela API após salvos

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs do servidor
2. Testar conexão no painel
3. Confirmar credenciais no Meta Business Manager
4. Verificar se o servidor está acessível publicamente em `https://ouvidoria.coopedu.com.br`


