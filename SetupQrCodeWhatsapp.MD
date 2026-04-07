# SetupQrCodeWhatsapp: Guia Completo de Implementação e Arquitetura

Este documento serve como a documentação definitiva ("Master Guide") para novos agentes e desenvolvedores entenderem como a integração do WhatsApp via QR Code (`whatsapp-web.js`) foi arquitetada, implementada e estabilizada no projeto Help Desk Coopedu. 

O objetivo não é apenas mostrar o código, mas a **razão** de cada escolha, focando em Resiliência, Segurança e Execução em Ambientes Cloud (Linux/Servidor).

---

## 🏗️ 1. Princípios Arquiteturais e Dependências

Para construir uma integração robusta que não trava em produção, adotamos o seguinte padrão:

- **Singleton Client**: A instância do `Client` do WhatsApp é criada apenas uma vez (`server/whatsapp/serviceQr.ts`), evitando processos Zumbis do Chrome.
- **State Management Híbrido**: O estado da conexão (`qr_ready`, `connected`, `disconnected`) e o base64 do QR Code atual são armazenados na memória do Node **E** persistidos no banco de dados (`whatsappSessions`).
- **Resolução de IDs (LID vs JID)**: O sistema lida ativamente com a migração do WhatsApp para Link IDs (`@lid`) tentando sempre converter de volta para o número original (`@c.us`) para garantir o disparo de mensagens ativas.

**Stack Principal Utilizada:**
- `whatsapp-web.js` (Biblioteca central baseada no Puppeteer).
- `puppeteer` (Controla o Chromium em background).
- `qrcode` (Transforma a string do evento `qr` em uma imagem base64 exibível no Frontend).
- `fluent-ffmpeg` / `@ffmpeg-installer/ffmpeg` (Conversor assíncrono para garantir envio nativo de áudios PTT).

---

## 🤖 2. Configurando o Puppeteer para Servidores (Sandboxing)

A maior causa de falhas do `whatsapp-web.js` em VPS (Linux/Nuvem/AWS/Zeabur) é a restrição de privilégios de kernel para o Chromium. A rotina de inicialização em `serviceQr.ts` garante que o navegador opere em modo de segurança configurado para servidores:

```typescript
qrClient = new Client({
  authStrategy: new LocalAuth({
    clientId: SESSION_NAME,
    dataPath: AUTH_PATH // Ex: .wwebjs_auth
  }),
  puppeteer: {
    headless: true, // Ou false em dev iterativo
    executablePath: resolvedExecutablePath, // Path do binário detectado
    args: [
      "--no-sandbox", // CRÍTICO: Permite rodar como root em Linux
      "--disable-setuid-sandbox", // Desativa sandbox secundário
      "--disable-dev-shm-usage", // Impede estouro de memória com containers pequenos (Docker)
      "--disable-gpu", // Aceleração de vídeo não serve pra servidor headless
      "--no-first-run",
      "--no-zygote", // Evita processos orfãos que travam RAM
      "--disable-extensions"
    ],
  }
});
```

---

## 🔒 3. Estratégia de Autenticação e Sincronização Frontend <-> Backend

O sistema não empurra via WebSocket o QR Code, e sim utiliza um sistema reativo passivo para maior estabilidade:

### No Backend (Eventos do `Client`):
1. **`qr`**: Quando o WWebJS gera um texto de emparelhamento, usamos a lib `qrcode` para gerar um Base64. Salva-se em RAM e faz `UPDATE` na tabela `whatsappSessions`.
2. **`authenticated`**: Sinaliza que o auth local está salvo mas as conversas ainda estão baixando.
3. **`ready`**: O cliente terminou de carregar histórico e sincronizar contatos. A sessão local em `AUTH_PATH` está consolidada. Limpa-se a string de QR code do DB.

### No Frontend (`React` + `Shadcn`):
Através de Long Polling (ex: chamadas a cada 3 a 5 segundos via TRPC ou Fetch GET), o frontend apenas lê a tabela do banco. Se houver `qrCodeDataUrl`, o componente de modal exibe `<img src={qrCodeDataUrl} />`. Ao mudar para `connected`, o modal fecha.

---

## 🏥 4. Monitoramento e Auto-Cura (Self-Healing) e Limpeza Severa

Para evitar o temido Bug da "Sessão Fantasma" (onde o script acha que está conectado, mas o Puppeteer por baixo travou):

1. **Monitor de Saúde por Heartbeat**: 
   A cada 1 minuto (usando `setInterval`), verificamos a função interna do puppeteer consumada em `(qrClient as any).pupBrowser.isConnected()`. 
   Se o navegador não responder, o sistema **força o status para error, chama um `destroy()` seguro e tenta reconectar**.

2. **Forced Cleanup**:
   Criou-se a função `forceCleanup()` ativada essencialmente no ato de Desconect (Logout Manual).
   Muitas vezes, apenas o `logout()` não apaga as pastas corrompidas, tampouco limpa o Chromium da RAM. A função interage inclusive com o SO (`psChromeCmd` / `pkill -9 -f chromium`) e faz `fs.rmSync(sessionPath)` removendo agressivamente arquivos de Lock de Cache e IndexedDB do Chromium.

---

## ✉️ 5. Resolução Otimizada dos Identificadores (JID vs LID)

WhatsApp migrou usuários para IDs Ocultos (`@lid`) mascarando os contatos. Isso previne responder contatos não salvos.
Implementamos um "Pattern Resolver" passivo/ativo em `resolveBestWhatsAppId(phone)`:

1. **Passo 1 (Local DB):** Consulta a base local se já interagiu com ele antes.
2. **Passo 2 (Contato):** Se a `string` de ID possuir `@lid`, tenta usar `qrClient.getContactById()` para cavar as propriedades e resgatar a chave `contact.id._serialized` que frequentemente contém o `@c.us` real.
3. **Passo 3 (GetNumberId):** Tenta chamar `qrClient.getNumberId()` com apenas os dígitos numéricos apurados para varrer os servidores da META e encontrar a verdadeira conta vinculada à linha.

---

## 📝 6. Recebimento de Mensagem e Race-Conditions (Fila de Lock)

Ao rodar sem interface (Linux Headless), o evento padrão de recebimento `message` sofre perdas de sincronização. A resposta arquitetural para isso foi:

1. **Utilizar `message_create`**: Passamos a escutar todos os eventos do WhatsApp (inclusive nossos envios) porém descartamos ativamente os nossos fazendo `if (msg.fromMe) return;`. Isso garantiu estabilidade gigante em recebimentos no servidor virtual.
2. **Locks Temporais `new Map<string, Promise>`:** Como usuários mandam 4 a 5 mensagens em rajadas rápidas (uma foto + 3 textos picados), o Help Desk corria risco de duplicar a abertura de um atendimento. Criou-se um enfileiramento `messageProcessingLocks` empilhando e resolvendo (Promises sequenciais) baseadas no `from` para processar perfeitamente ticket atráz de ticket.

---

## 🎙️ 7. Conversão Automática de Áudio (Format PTT OPUS) e "Safe Send"

### Áudios (Voice Notes Native)
Para o atendente mandar ou o usuário receber um áudio que apareça como o reprodutor nativo do WhatsApp (Ptt) - em vez de um anexo de arquivo mp3 -, usa-se a biblioteca **FFmpeg**. O interceptador pega o Base64, e transcodifica forçadamente para `.ogg` com codec estrutural `libopus`. Sem isso, o `sendAudioAsVoice: true` fornecido via WWebJS quebra o arquivo no celular destino.

### WWebJS `markedUnread` Bug (Safe Send)
O envio de mídia as vezes envia o blob com sucesso, mas no momento de dar timeout falha na lib acusando `markedUnread`. Nós agrupamos a chamada com um forte `try-catch` que detecta se a palavra `markedUnread` aparece e, se sim, suprime a falha considerando como *success* falso positivo, para não causar interface vermelha no HelpDesk enquanto a foto já chegou de fato.

---

## 🚀 Conclusão e Regras de Segurança

Para os novos Agentes mantendo ou inserindo novas features baseadas no WhatsApp desta aplicação:
1. **Nunca estancie um Client sem testar os locks já em uso**.
2. Sempre garanta que todo fluxo finalize chamando logs formatados via `logger.info('[WhatsApp-QR]...')`.
3. Tenha o hábito de limpar manualmente as tabelas se encontrar IDs corrompidos pelo Supabase Auth.
4. Lembre que **as edições precisam estar prontas para falhar** da API gráfica do chromium; use lógicas de retentativa sempre.

Este é o padrão ouro testado em Produção e é obrigatório segui-lo.


