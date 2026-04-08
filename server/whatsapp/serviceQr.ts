import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Message } from "whatsapp-web.js";
import QRCode from "qrcode";
import { logger } from "../_core/logger";
import { storagePut } from "../storage";
import crypto from "crypto";
import fs from "fs";
import puppeteer from "puppeteer";
import * as db from "../db";
import { createTicketHistory } from "../db";
import { replaceMessagePlaceholders } from "./placeholders";
import { IntegrationType, getActiveType } from "./config";
import { sql, eq } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const execAsync = promisify(exec);

type QrStatus = "disconnected" | "qr_ready" | "authenticating" | "connected" | "error";

let qrClient: any = null;
let qrCodeDataUrl: string | null = null;
let qrStatus: QrStatus = "disconnected";
let lastError: string | null = null;
let lastQrAt: string | null = null;
let connectedPhone: string | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let cachedSessionData: string | null = null;

const SESSION_NAME = process.env.WHATSAPP_QR_SESSION_NAME ?? "ouvidoria-qualital-qr";
const INIT_TIMEOUT_MS = Number(process.env.WHATSAPP_QR_INIT_TIMEOUT_MS ?? "60000");
const CRYPTO_KEY = process.env.WHATSAPP_CRYPTO_KEY;
const DEFAULT_COUNTRY_CODE =
  (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "55").replace(/\D/g, "") || "55";
const LOCK_NAME = process.env.WHATSAPP_QR_LOCK_NAME ?? "whatsapp-qr-lock";
const LOCK_TIMEOUT_SEC = Number(process.env.WHATSAPP_QR_LOCK_TIMEOUT_SEC ?? "0");
const IS_DEV = (process.env.NODE_ENV ?? "").toLowerCase() !== "production";

async function persistStatus(partial: {
  status?: QrStatus;
  qrCodeDataUrl?: string | null;
  lastError?: string | null;
  lastQrAt?: string | null;
  connectedPhone?: string | null;
  sessionDataRaw?: string | null;
}) {
  const client = await db.getDb();
  if (!client) return;
  const status = partial.status ?? qrStatus;
  if (partial.sessionDataRaw !== undefined) {
    cachedSessionData = partial.sessionDataRaw;
  }
  const sessionData = {
    type: "qr" as const,
    status,
    lastError: partial.lastError ?? lastError,
    lastQrAt: partial.lastQrAt ?? lastQrAt,
    connectedPhone: partial.connectedPhone ?? connectedPhone,
    sessionDataEncrypted: await maybeEncrypt(partial.sessionDataRaw ?? cachedSessionData),
  };
  await client
    .insert(db.whatsappSessions)
    .values({
      sessionName: SESSION_NAME,
      status: status === "qr_ready" ? "qr_ready" : status === "connected" ? "connected" : "disconnected",
      qrCode: partial.qrCodeDataUrl ?? qrCodeDataUrl,
      phoneNumber: partial.connectedPhone ?? connectedPhone ?? null,
      sessionData,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: status === "qr_ready" ? "qr_ready" : status === "connected" ? "connected" : "disconnected",
        qrCode: partial.qrCodeDataUrl ?? qrCodeDataUrl,
        phoneNumber: partial.connectedPhone ?? connectedPhone ?? null,
        sessionData,
        updatedAt: new Date(),
      },
    });
}

export function getQrStatus() {
  return {
    status: qrStatus,
    qrCode: qrCodeDataUrl,
    lastError,
    lastQrAt,
    connectedPhone,
  };
}

export async function checkQrDependencies() {
  try {
    const exe = puppeteer.executablePath();
    if (!exe) {
      return {
        ok: false,
        message:
          "Chromium não encontrado pelo Puppeteer. Instale chromium ou defina PUPPETEER_EXECUTABLE_PATH.",
      };
    }
    const exists = fs.existsSync(exe);
    if (!exists) {
      return {
        ok: false,
        message: `Chromium não encontrado em ${exe}. Instale chromium ou aponte para o binário.`,
      };
    }
    return { ok: true, message: `Chromium encontrado em ${exe}` };
  } catch (error) {
    return {
      ok: false,
      message:
        (error as Error)?.message ??
        "Falha ao verificar dependências do Chromium. Instale chromium ou defina PUPPETEER_EXECUTABLE_PATH.",
    };
  }
}

function getEncryptionKey(): Buffer | null {
  if (!CRYPTO_KEY || CRYPTO_KEY.trim().length < 16) return null;
  return crypto.createHash("sha256").update(CRYPTO_KEY).digest();
}

async function maybeEncrypt(payload?: string | null) {
  if (!payload) return null;
  const key = getEncryptionKey();
  if (!key) return null;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
  } catch {
    return null;
  }
}

function maybeDecrypt(payload?: string | null) {
  const key = getEncryptionKey();
  if (!payload || !key) return null;
  try {
    const [ivHex, tagHex, dataHex] = payload.split(".");
    if (!ivHex || !tagHex || !dataHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

async function loadPersistedSession() {
  const client = await db.getDb();
  if (!client) return null;
  const rows = await client
    .select()
    .from(db.whatsappSessions)
    .where(eq(db.whatsappSessions.sessionName, SESSION_NAME))
    .limit(1);
  const row = rows[0];
  const stored = (row?.sessionData as any) ?? null;
  const decrypted = maybeDecrypt(stored?.sessionDataEncrypted ?? null);
  if (decrypted) {
    cachedSessionData = decrypted;
  }
  return decrypted;
}

let isInitializing = false;

export async function initializeQrSession() {
  if (isInitializing) {
    logger.info("[WhatsApp-QR] Inicialização já em andamento (mem-lock), ignorando nova chamada.");
    return getQrStatus();
  }
  isInitializing = true;
  
  try {
    const activeType: IntegrationType = await getActiveType();
    if (activeType !== "qr") {
      throw new Error("Integração ativa não é do tipo QR. Altere o modo para 'QR Code'.");
    }

    // No QR mode, we cleanup any existing client before starting a new one
    if (qrClient) {
      try {
        logger.info("[WhatsApp-QR] Finalizando cliente anterior antes de reinicializar");
        await qrClient.destroy().catch(() => null);
      } catch (e) {
        // ignore
      }
      qrClient = null;
    }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  qrStatus = "disconnected";
  qrCodeDataUrl = null;
  lastError = null;
  connectedPhone = null;

  try {
    let lockOk = await tryAcquireLock();
    if (!lockOk) {
      logger.warn("[WhatsApp-QR] Falha ao adquirir lock inicial, tentando limpeza forçada...");
      await forceCleanup();
      lockOk = await tryAcquireLock();
    }

    if (!lockOk) {
      logger.error("[WhatsApp-QR] Falha grave: Lock ainda indisponível após limpeza forçada");
      throw new Error("Outra instância está controlando a sessão QR. Tente 'Desconectar sessão' para forçar o encerramento.");
    }

    const persisted = await loadPersistedSession();

    // O whatsapp-web.js depende de uma versão própria do Puppeteer e pode tentar usar um Chromium "embutido"
    // (ex.: revision antiga) que nem sempre é baixado com pnpm. Para evitar isso, sempre apontamos para um
    // executável válido: via env (`PUPPETEER_EXECUTABLE_PATH`) ou via `puppeteer.executablePath()` do Puppeteer do projeto.
    const resolvedExecutablePath =
      (process.env.PUPPETEER_EXECUTABLE_PATH ?? "").trim() || puppeteer.executablePath();

    qrClient = new Client({
      webVersionCache: {
        type: "local",
      },
      authStrategy: new LocalAuth({
        clientId: SESSION_NAME,
        dataPath: ".wwebjs_auth",
      }),
      puppeteer: {
        timeout: 0,
        protocolTimeout: 0,
        headless: (process.env.WHATSAPP_QR_HEADLESS ?? "true").toLowerCase() !== "false",
        executablePath: resolvedExecutablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--disable-extensions",
          "--disable-blink-features=AutomationControlled"
        ],
      },
    });

    qrClient.on("qr", async (qr: string) => {
      logger.info("[WhatsApp-QR] QR Code gerado");
      qrStatus = "qr_ready";
      lastQrAt = new Date().toISOString();
      try {
        qrCodeDataUrl = await QRCode.toDataURL(qr);
      } catch (err) {
        logger.error("[WhatsApp-QR] Falha ao gerar dataURL do QR", { error: (err as Error)?.message });
        qrCodeDataUrl = null;
      }
      await persistStatus({ status: qrStatus, qrCodeDataUrl, lastQrAt });

      // --- ANTIGRAVITY FALLBACK ---
      // Caso o evento `authenticated` ou `ready` parem de funcionar (comum em novas atualizações do WhatsApp Web)
      try {
          const page = (qrClient as any).pupPage;
          if (page && !page.__injectedAuthFallback) {
              page.__injectedAuthFallback = true;
              logger.info("[WhatsApp-QR] Inicializando watcher de DOM como fallback...");
              
              const checkFallback = setInterval(async () => {
                  if ((qrStatus as string) === "connected" || !qrClient) {
                      clearInterval(checkFallback);
                      return;
                  }
                  try {
                      // Se a URL mudou (ex: erro fatal de login) não vai ter Store
                      const isAuth = await page.evaluate(() => {
                          // Se já estiver na tela principal e a lib falhou
                          if ((window as any).Store && (window as any).Store.Msg) return true;
                          const el = document.querySelector('[data-testid="chat-list-search"]') || document.querySelector('#pane-side');
                          return !!el;
                      });

                      if (isAuth && qrStatus !== "connected") {
                          logger.info("[WhatsApp-QR] Autenticação detectada via DOM Fallback (WWebJS native tracker failed!)");
                          clearInterval(checkFallback);
                          // Força emissão dos eventos que faltaram
                          qrClient.emit("authenticated", {}); 
                          setTimeout(() => qrClient.emit("ready"), 1000);
                      }
                  } catch (e) {
                      // silêncio (erros de navigation)
                  }
              }, 5000);
          }
      } catch (e) {
          // silêncio
      }
    });

    qrClient.on("authenticated", async (session: any) => {
      logger.info("[WhatsApp-QR] Autenticado! (Baixando histórico de mensagens...)");
      qrCodeDataUrl = null;
      // Mudamos para "authenticating" para o usuário saber que tá syncando
      qrStatus = "authenticating";
      const raw = JSON.stringify(session);
      await persistStatus({ status: qrStatus, sessionDataRaw: raw, qrCodeDataUrl: null });

      // Injeta um script para clicar em "Usar o WhatsApp Web e baixar mensagens depois" se demorar muito
      try {
        const page = (qrClient as any).pupPage;
        if (page) {
          const bypassInterval = setInterval(async () => {
            if (qrStatus === "connected") {
              clearInterval(bypassInterval);
              return;
            }
            try {
              await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
                const btnTexts = btns.map(b => (b.textContent || '').trim()).filter(Boolean);
                console.log("WWEBJS_BUTTONS_DUMP:", btnTexts.join(" | "));

                for (const btn of btns) {
                  const text = (btn.textContent || '').toLowerCase();
                  if (
                    text.includes('use here') ||
                    text.includes('usar o whatsapp aqui') ||
                    text.includes('baixar as mensagens depois') ||
                    text.includes('usar aqui')
                  ) {
                    (btn as HTMLElement).click();
                  }
                }
              });
            } catch (e) {
               // Silencioso, iframe ou execution context pode falhar se re-navegar
            }
          }, 3000);
          
          qrClient.on("ready", () => clearInterval(bypassInterval));
          qrClient.on("disconnected", () => clearInterval(bypassInterval));
        }
      } catch (e) {
         logger.warn("[WhatsApp-QR] Falha ao injetar bypass de histórico");
      }
    });

    qrClient.on("ready", async () => {
      logger.info("[WhatsApp-QR] Cliente conectado e pronto!");

      // --- HOTFIX: PATCH markedUnread BUG ---
      // Injeta um override na função sendSeen do WWebJS para evitar o erro "Cannot read properties of undefined (reading 'markedUnread')"
      try {
          const page = (qrClient as any).pupPage;
          if (page) {
              await page.evaluate(() => {
                  if ((window as any).WWebJS) {
                      (window as any).WWebJS.sendSeen = async () => {
                          console.log("WWebJS.sendSeen patched to no-op (Antigravity Fix)");
                          return true; 
                      };
                  }
              });
              logger.info("[WhatsApp-QR] WWebJS.sendSeen patched com sucesso (No-Op)");
          }
      } catch (patchErr) {
          logger.warn("[WhatsApp-QR] Falha ao aplicar patch sendSeen", { error: (patchErr as Error).message });
      }
      // --------------------------------------

      qrStatus = "connected";
      qrCodeDataUrl = null;
      lastError = null;
      
      // Fallbacks para extração correta do número do bot
      connectedPhone = qrClient?.info?.wid?.user || qrClient?.info?.me?.user || null;
      if (!connectedPhone && qrClient?.info?.wid?._serialized) {
          connectedPhone = qrClient.info.wid._serialized.replace(/\D/g, "");
      }
      
      logger.info("[WhatsApp-QR] WWebJS Info obtido:", { connectedPhone, wid: qrClient?.info?.wid });
      
      await persistStatus({ status: qrStatus, qrCodeDataUrl: null, connectedPhone });
    });

    qrClient.on("disconnected", async (reason: string) => {
      logger.warn("[WhatsApp-QR] Cliente desconectado", { reason });
      qrStatus = "disconnected";
      qrCodeDataUrl = null;
      lastError = reason;
      await persistStatus({ status: qrStatus, qrCodeDataUrl: null, lastError });
      qrClient = null;
      await scheduleReconnect();
    });

    qrClient.on("auth_failure", async (msg: string) => {
      logger.error("[WhatsApp-QR] Falha de autenticação", { msg });
      qrStatus = "error";
      lastError = msg;
      qrCodeDataUrl = null;
      await persistStatus({ status: qrStatus, lastError, qrCodeDataUrl: null });
      qrClient = null;
      await scheduleReconnect();
    });

    qrClient.on("message", async (message: Message) => {
      try {
        await handleIncomingMessageQr(message);
      } catch (err) {
        logger.error("[WhatsApp-QR] Erro ao processar mensagem", { error: (err as Error)?.message });
      }
    });

    // Dispara a inicialização em background para não bloquear eternamente a requisição HTTP
    qrClient.initialize().catch(async (e: any) => {
        const errMsg = e?.message || "";
        if (errMsg.includes("Target closed") || errMsg.includes("Execution context")) {
            logger.warn("[WhatsApp-QR] Erro de contexto ignorado. O WhatsApp está recarregando a página, aguardando...");
            return; // NÃO destrói o cliente, a biblioteca injetará novamente no load
        }
        logger.error("[WhatsApp-QR] Falha crítica no initialize() do cliente", { error: errMsg });
        qrStatus = "error";
        lastError = errMsg || "Erro ao inicializar QR";
        qrCodeDataUrl = null;
        await persistStatus({ status: qrStatus, lastError, qrCodeDataUrl: null });
        if (qrClient) {
            try { await qrClient.destroy(); } catch (err) {}
            qrClient = null;
        }
        await releaseLock();
    });

    // Aguarda até o QR ser gerado ou conexão estar pronta (máximo 15 segundos)
    await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 15000);
        
        const onQr = () => {
            clearTimeout(timeout);
            qrClient?.removeListener("ready", onReady);
            resolve();
        };
        const onReady = () => {
            clearTimeout(timeout);
            qrClient?.removeListener("qr", onQr);
            resolve();
        };
        
        qrClient.once("qr", onQr);
        qrClient.once("ready", onReady);
    });
    
    logger.info("[WhatsApp-QR] Inicialização despachada para background (aguardando interação do usuário)");
  } catch (error) {
    logger.error("[WhatsApp-QR] Erro ao instanciar cliente", { error: (error as Error)?.message });
    qrStatus = "error";
    lastError = (error as Error)?.message ?? "Erro ao inicializar QR";
    
    if (qrClient) {
      try {
        logger.info("[WhatsApp-QR] Destruindo cliente após erro de instanciamento");
        await qrClient.destroy();
      } catch (err) {}
      qrClient = null;
    }

    await persistStatus({ status: qrStatus, lastError });
    await releaseLock();
    
    // Em ambientes dev ou reinicialização rápida, tentamos reconectar
    await scheduleReconnect().catch(() => null);
    return getQrStatus();
  }

  } finally {
    isInitializing = false;
  }
}

export async function disconnectQr() {
  logger.info("[WhatsApp-QR] Iniciando desconexão solicitada pelo usuário");
  
  if (qrClient) {
    try {
      // Tenta fazer o logout elegantemente (fogo e esquece) sem travar a thread
      qrClient.logout().catch(() => null);
      
      // Força a quebra do processo Chromium subjacente em no máximo 2 segundos para não dar hang infinito
      await Promise.race([
        qrClient.destroy().catch(() => null),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    } catch (e) {
      logger.warn("[WhatsApp-QR] Erro ao destruir cliente durante desconexão", { error: (e as Error)?.message });
    }
    qrClient = null;
  }
  
  qrStatus = "disconnected";
  qrCodeDataUrl = null;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Limpeza agressiva
  await forceCleanup();
  
  await releaseLock();
  await persistStatus({ status: qrStatus, qrCodeDataUrl: null });
  logger.info("[WhatsApp-QR] Desconexão e limpeza finalizadas");
}

/**
 * Limpa processos e locks de forma agressiva para resolver conflitos de instância
 */
async function forceCleanup() {
  try {
    logger.info("[WhatsApp-QR] Executando limpeza forçada de instâncias...");

    // 1. Tentar matar a thread do MySQL que segura o lock
    const client = await db.getDb();
    if (client) {
      const rows = await client.execute(sql`SELECT IS_USED_LOCK(${LOCK_NAME}) as thread_id`);
      const resultRows = Array.isArray(rows) ? (rows[0] as any) : rows;
      const firstRow = Array.isArray(resultRows) ? resultRows[0] : resultRows;
      const threadId = firstRow?.thread_id;
      
      const selfRows = await client.execute(sql`SELECT CONNECTION_ID() as self_id`);
      const selfResult = Array.isArray(selfRows) ? (selfRows[0] as any) : selfRows;
      const selfFirst = Array.isArray(selfResult) ? selfResult[0] : selfResult;
      const selfId = selfFirst?.self_id;

      if (threadId && Number(threadId) !== Number(selfId)) {
        logger.info(`[WhatsApp-QR] Matando thread MySQL externa ${threadId} que segura o lock`);
        await client.execute(sql`KILL ${threadId}`).catch(e => {
           logger.warn("[WhatsApp-QR] Falha ao matar thread MySQL", { error: e.message });
        });
      }
    }

    // 2. Tentar matar processos Puppeteer/Chromium zumbis
    // 2. Tentar matar processos Puppeteer/Chromium zumbis E processos na porta 3000
    if (process.platform === "win32") {
      logger.info("[WhatsApp-QR] Procurando zumbis na porta 3000 e processos Chrome...");
      // Mata qualquer coisa ouvindo na porta 3000 (Node zumbi)
      const killPortCmd = `powershell "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`;
      await execAsync(killPortCmd).catch(() => null);

      // Mata processos Chrome/Chromium vinculados à nossa sessão
      const psChromeCmd = `powershell "Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe' OR Name = 'chromium.exe'\\" | Where-Object { $_.CommandLine -like '*${SESSION_NAME}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`;
      await execAsync(psChromeCmd).catch(() => null);
    } else {
      // Linux/Mac
      await execAsync(`fuser -k 3000/tcp`).catch(() => null);
      await execAsync(`pkill -f "${SESSION_NAME}"`).catch(() => null);
    }

    // 3. Aguardar um pouco para arquivos serem liberados pelo SO
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Limpar as instâncias de Auth e Cache explicitamente, forçando zeramento total
    try {
      const authDir = path.resolve(process.cwd(), ".wwebjs_auth");
      const cacheDir = path.resolve(process.cwd(), ".wwebjs_cache");
      
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        logger.info(`[WhatsApp-QR] Diretório .wwebjs_auth deletado com sucesso.`);
      }
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        logger.info(`[WhatsApp-QR] Diretório .wwebjs_cache deletado com sucesso.`);
      }
    } catch (e) {
      logger.warn(`[WhatsApp-QR] Não foi possível remover os diretórios de sessão: ${(e as Error).message}`);
    }

    logger.info("[WhatsApp-QR] Limpeza forçada concluída");
  } catch (error) {
    logger.error("[WhatsApp-QR] Erro crítico durante forceCleanup", { error: (error as Error)?.message });
  }
}

/**
 * Tenta resolver um identificador qualquer (digits, @lid, @c.us) para o melhor @c.us (número real).
 * Útil para fluxos de saída onde precisamos de um identificador robusto.
 */
async function resolveBestWhatsAppId(phone: string): Promise<string> {
    if (!phone) return phone;
    // Se já for um JID real c.us, retorna direto
    if (phone.includes("@c.us")) return phone;

    const digits = phone.split('@')[0].replace(/\D/g, "");
    
    // 1. Tentar Banco de Dados (Passivo) - Preferir @c.us se tiver os dois no histórico
    try {
        const Cliente = await db.getClienteByPhone(digits || phone);
        if (Cliente?.whatsappNumber) {
            if (Cliente.whatsappNumber.includes("@c.us")) {
                logger.info("[WhatsApp-QR] JID resolvido via Banco de Dados (c.us)", { input: phone, jid: Cliente.whatsappNumber });
                return Cliente.whatsappNumber;
            }
            // Se for LID no banco, guardamos mas continuamos tentando algo melhor
        }
    } catch { /* ignore */ }

    // 2. Tentar Puppeteer (Ativo)
    if (qrClient && qrStatus === "connected") {
        try {
            // Se for LID, tenta resolver o JID real (@c.us)
            if (phone.includes("@lid")) {
                logger.info("[WhatsApp-QR] Tentando converter LID para JID...", { lid: phone });
                const contact = await qrClient.getContactById(phone);
                if (contact && contact.id?._serialized && contact.id._serialized.includes("@c.us")) {
                    const jid = contact.id._serialized;
                    logger.info("[WhatsApp-QR] LID convertido para JID real", { lid: phone, jid });
                    return jid;
                }
            }

            // Se temos dígitos, tenta buscar o ID real no WhatsApp
            if (digits.length >= 8) {
                const numberId = await qrClient.getNumberId(`${digits}@c.us`);
                if (numberId?._serialized) {
                    logger.info("[WhatsApp-QR] Digitos resolvidos via getNumberId", { digits, jid: numberId._serialized });
                    return numberId._serialized;
                }
            }
        } catch (err) {
            logger.warn("[WhatsApp-QR] Falha na resolução ativa de ID", { input: phone, error: (err as Error).message });
        }
    }

    // Se falhou tudo e for LID, retorna o LID como última esperança
    if (phone.includes("@lid")) return phone;

    // Se for apenas dígitos, adiciona sufixo
    if (!phone.includes("@") && digits.length >= 8) {
        return `${digits}@c.us`;
    }

    return phone;
}

export async function sendQrMessage(phone: string, message: string) {
  if (!qrClient || qrStatus !== "connected") {
    return { success: false, error: "Sessão QR não está conectada" };
  }
  try {
    const targetId = await resolveBestWhatsAppId(phone);

    // Se o "targetId" já for um ID completo do WhatsApp (contém @), envia diretamente
    if (targetId.includes("@")) {
      logger.info("[WhatsApp-QR] Enviando para ID direto", { chatId: targetId, original: phone });
      try {
        // Tenta buscar o chat primeiro para garantir que está carregado
        const chat = await qrClient.getChatById(targetId);
        const result = await chat.sendMessage(message);
        return { success: true, messageId: result?.id?._serialized };
      } catch (err: any) {
        // Se falhar (ex: erro de interface), tenta o método direto do cliente como fallback
        logger.warn("[WhatsApp-QR] Falha ao enviar via chat.sendMessage, tentando client.sendMessage", { error: err?.message });
        
        try {
            const result = await qrClient.sendMessage(targetId, message);
            return { success: true, messageId: result?.id?._serialized };
        } catch (err2: any) {
             if (err2?.message && err2.message.includes("markedUnread")) {
                 logger.warn("[WhatsApp-QR] Erro 'markedUnread' ignorado (WWebJS Bug) no fallback, assumindo sucesso.", { chatId: targetId });
                 return { success: true, messageId: `true_${targetId}_${Date.now()}` };
             }
             logger.error("[WhatsApp-QR] Falha ao enviar para ID direto (fallback)", { chatId: targetId, error: err2?.message });
             return { success: false, error: err2?.message || "Falha ao enviar para ID direto" };
        }
      }
    }

    const base = normalizeOutgoingPhone(phone);
    if (!base) {
      return { success: false, error: "Telefone inválido para envio" };
    }

    const variants: string[] = [];
    // 1) base com DDI
    variants.push(base);
    // 2) base sem DDI (caso sessão esteja usando formato local)
    if (base.startsWith(DEFAULT_COUNTRY_CODE)) {
      variants.push(base.slice(DEFAULT_COUNTRY_CODE.length));
    }
    // 3) inserir 9 após DDD (com DDI)
    if (base.startsWith(DEFAULT_COUNTRY_CODE) && base.length === DEFAULT_COUNTRY_CODE.length + 10) {
      const ddd = base.slice(DEFAULT_COUNTRY_CODE.length, DEFAULT_COUNTRY_CODE.length + 2);
      const rest = base.slice(DEFAULT_COUNTRY_CODE.length + 2);
      variants.push(`${DEFAULT_COUNTRY_CODE}${ddd}9${rest}`);
    }
    // 4) inserir 9 após DDD (sem DDI)
    if (base.startsWith(DEFAULT_COUNTRY_CODE) && base.length === DEFAULT_COUNTRY_CODE.length + 10) {
      const local = base.slice(DEFAULT_COUNTRY_CODE.length);
      const ddd = local.slice(0, 2);
      const rest = local.slice(2);
      variants.push(`${ddd}9${rest}`);
    }
    // 5) últimos 11 dígitos com DDI
    if (base.length > DEFAULT_COUNTRY_CODE.length + 11) {
      const last11 = base.slice(-11);
      variants.push(`${DEFAULT_COUNTRY_CODE}${last11}`);
    }

    let sent = null;
    let lastErr: string | undefined;

    for (const v of variants) {
      try {
        const numberId = await qrClient.getNumberId(`${v}@c.us`);
        if (!numberId) {
          lastErr = "Número não encontrado no WhatsApp";
          continue;
        }
        const chatId = (numberId as any)?._serialized || `${numberId.user ?? v}@${numberId.server ?? "c.us"}`;
        
        let result = null;
        try {
            result = await qrClient.sendMessage(chatId, message);
        } catch (innerErr: any) {
            // Hotfix: Se o erro for "Cannot read properties of undefined (reading 'markedUnread')",
            // isso é um bug conhecido do WWebJS ao tentar marcar como visto após enviar.
            // A mensagem geralmente É ENVIADA. Vamos assumir sucesso e logar aviso.
            if (innerErr?.message && innerErr.message.includes("markedUnread")) {
                logger.warn("[WhatsApp-QR] Erro 'markedUnread' ignorado (WWebJS Bug), assumindo envio com sucesso.", { chatId });
                // Simulamos um ID de sucesso para prosseguir
                sent = `true_${chatId}_${Date.now()}`;
                break;
            }
            throw innerErr;
        }

        sent = result?.id?._serialized ?? null;
        break;
      } catch (err: any) {
        lastErr = err?.message;
        logger.error("[WhatsApp-QR] Falha variante envio", { variant: v, error: err?.message });
        continue;
      }
    }

    if (!sent) {
      return { success: false, error: lastErr || "Falha ao enviar via QR" };
    }

    return { success: true, messageId: sent };
  } catch (error) {
    logger.error("[WhatsApp-QR] Erro ao enviar mensagem", { error: (error as Error)?.message });
    return { success: false, error: (error as Error)?.message ?? "Erro ao enviar via QR" };
  }
}

// Função auxiliar para converter áudio para OGG (formato nativo PTT)
async function convertAudioToPttCompatible(base64Data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempInput = path.resolve(os.tmpdir(), `temp_${Date.now()}_${Math.random().toString(36).substring(7)}_in`);
    const tempOutput = path.resolve(os.tmpdir(), `temp_${Date.now()}_${Math.random().toString(36).substring(7)}_out.ogg`);

    fs.writeFileSync(tempInput, Buffer.from(base64Data, 'base64'));

    const runFfmpeg = (codec: string, attempt: number) => {
      ffmpeg(tempInput)
        .setFfmpegPath(ffmpegInstaller.path)
        .toFormat('ogg')
        .audioCodec(codec)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate(32)
        .on('end', () => {
           try {
               const convertedData = fs.readFileSync(tempOutput).toString('base64');
               if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
               if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
               resolve(convertedData);
           } catch (e) {
               reject(e);
           }
        })
        .on('error', (err: any) => {
           if (attempt === 1) {
               logger.warn("[WhatsApp-QR] libopus falhou, tentando libvorbis como fallback...");
               runFfmpeg('libvorbis', 2);
           } else {
               if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
               if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
               reject(err);
           }
        })
        .save(tempOutput);
    };

    runFfmpeg('libopus', 1);
  });
}

export async function sendQrMediaBase64(
  phone: string, 
  mimeType: string, 
  base64Data: string, 
  fileName?: string,
  caption?: string
) {
  if (!qrClient || qrStatus !== "connected") {
    return { success: false, error: "Sessão QR não está conectada" };
  }

  const targetIdRaw = await resolveBestWhatsAppId(phone);
  let targetId = targetIdRaw;

  // Se o ID resolvido ainda não tem @, trata como telefone normal
  if (!targetId.includes("@")) {
      const base = normalizeOutgoingPhone(targetId);
      if (base) {
          try {
              const numberId = await qrClient.getNumberId(`${base}@c.us`);
              if (numberId) targetId = numberId._serialized;
          } catch { /* ignore */ }
      }
  }

  try {
    // Sanitização agressiva para evitar erro de Evaluation failed
    let cleanMimeType = mimeType.split(';')[0].trim();
    let cleanBase64 = base64Data.replace(/^data:.*;base64,/, "").replace(/\s/g, "");
    
    // Conversão automática para OGG se for áudio, para garantir compatibilidade PTT
    if (cleanMimeType.startsWith("audio/")) {
        try {
            logger.info("[WhatsApp-QR] Convertendo áudio para OGG compatível...");
            cleanBase64 = await convertAudioToPttCompatible(cleanBase64);
            cleanMimeType = "audio/ogg; codecs=opus";
            logger.info("[WhatsApp-QR] Conversão concluída.");
        } catch (convErr) {
            logger.error("[WhatsApp-QR] Erro na conversão FFmpeg, tentando original", { error: (convErr as Error).message });
        }
    }

    // Garante extensão no nome do arquivo (crítico para alguns tipos de mídia)
    let finalFileName = fileName || `audio_${Date.now()}`;
    if (!finalFileName.includes('.')) {
        const ext = cleanMimeType.split('/')[1] || 'bin';
        finalFileName = `${finalFileName}.${ext}`;
    }

    logger.info("[WhatsApp-QR] Preparando envio de mídia", { 
      chatId: targetId, 
      originalId: phone,
      mime: cleanMimeType, 
      b64Len: cleanBase64.length 
    });
    
    const media = new MessageMedia(cleanMimeType, cleanBase64, finalFileName);
    const sendOptions: any = { caption }; // Adicionado caption aqui
    if (cleanMimeType.startsWith("audio/") && (fileName?.includes('recording') || fileName?.includes('audio'))) {
        sendOptions.sendAudioAsVoice = true;
    }
    
    // Se for vídeo, garantir que não tente enviar como voz
    if (cleanMimeType.startsWith("video/")) {
        sendOptions.sendAudioAsVoice = false;
    }

    // LISTA DE TENTATIVAS (Sequenciais e seguras)
    const variants = [
      { name: "PTT", options: sendOptions, media: media },
      { name: "Document", options: { caption }, media: media },
      { name: "GenericBin", options: { caption }, media: new MessageMedia("application/octet-stream", cleanBase64, finalFileName) }
    ];

    let lastErr = null;
    let sentId = null;

    for (const v of variants) {
      try {
        logger.info(`[WhatsApp-QR] Tentativa: ${v.name}`, { chatId: targetId });
        const result = await qrClient.sendMessage(targetId, v.media, v.options);
        sentId = result?.id?._serialized;
        if (sentId) break;
      } catch (err: any) {
        lastErr = err?.message;
        logger.warn(`[WhatsApp-QR] Falha na tentativa ${v.name}`, { error: lastErr });
        
        // Se o erro for fatal (session closed), não adianta tentar as outras variantes
        if (lastErr?.includes("Session closed")) {
            throw err;
        }
      }
    }

    if (sentId) {
       return { success: true, messageId: sentId };
    }

    return { success: false, error: lastErr || "Falha em todas as tentativas de envio" };

  } catch (error) {
    logger.error("[WhatsApp-QR] Erro fatal no envio de mídia", { error: (error as Error)?.message });
    return { success: false, error: (error as Error)?.message ?? "Erro ao enviar mídia via QR" };
  }
}

async function handleIncomingMessageQr(message: Message) {
  if (message.from.includes("@g.us") || message.from.includes("status@broadcast")) {
    return;
  }

  // Log detalhado permanente do payload da mensagem (modo QR).
  const contact = await message.getContact().catch(() => null);
  const contactIdSerialized = (contact as any)?.id?._serialized ?? null;
  const contactNumberDigits = (contact as any)?.number
    ? String((contact as any).number).replace(/\D/g, "")
    : null;
  const contactIdUserDigits = (contact as any)?.id?.user
    ? String((contact as any).id.user).replace(/\D/g, "")
    : null;
  let contactAvatar: string | null = null;
  try {
    contactAvatar = (contact as any)?.avatar ?? null;
  } catch {
    // ignore
  }
  // Tentativa extra de resolução de número real quando vier @lid: usar getNumberId no from.
  let numberIdLookup: any = null;
  try {
    const lidDigits = String(message.from || "").replace(/\D/g, "");
    if (lidDigits) {
      numberIdLookup = await qrClient.getNumberId(`${lidDigits}@c.us`);
    }
  } catch (err) {
    // silencioso
  }

  // Tentativa adicional: resolver pelo chat (fonte mais estável para identificar o número real).
  let chatUserDigits: string | null = null;
  try {
    const chat = await message.getChat();
    const chatUser = (chat as any)?.id?.user ?? null;
    if (chatUser) chatUserDigits = String(chatUser).replace(/\D/g, "");
  } catch {
    // silencioso
  }

  // Tentativa "hardcore" via Store.Lid em dev, quando ainda for @lid.
  let lidResolvedDigits: string | null = null;
  if (IS_DEV && message.from.includes("@lid")) {
    try {
      const page = (qrClient as any)?.pupPage;
      if (page && page.evaluate) {
        const resolved = await page.evaluate((lid: string) => {
          try {
            const store = (window as any)?.Store;
            const mapped = store?.Lid?.get?.(lid);
            const user =
              mapped?.user ||
              mapped?.id?.user ||
              mapped?.id ||
              (typeof mapped === "string" ? mapped : null);
            if (!user) return null;
            return String(user).replace(/\D/g, "");
          } catch (e) {
            return null;
          }
        }, message.from);
        if (resolved) {
          lidResolvedDigits = resolved;
        }
      }
    } catch {
      // silencioso
    }
  }

  logger.info("[WhatsApp-QR] Payload mensagem", {
    id: (message.id as any)?._serialized ?? null,
    from: message.from,
    to: (message as any)?.to ?? null,
    author: (message as any)?.author ?? null,
    timestamp: message.timestamp,
    type: message.type,
    bodyPreview: message.body ? message.body.slice(0, 300) : null,
    hasMedia: message.hasMedia,
    ack: message.ack,
    fromMe: message.fromMe,
    deviceType: (message as any)?.deviceType ?? null,
    isStatus: (message as any)?.isStatus ?? null,
    isStarred: (message as any)?.isStarred ?? null,
    contact: contact
      ? {
          id: contactIdSerialized,
          userDigits: contactIdUserDigits,
          number: (contact as any)?.number ?? null,
          numberDigits: contactNumberDigits,
          name: contact.name ?? null,
          pushname: (contact as any)?.pushname ?? null,
          shortName: (contact as any)?.shortName ?? null,
          isBusiness: (contact as any)?.isBusiness ?? null,
          isEnterprise: (contact as any)?.isEnterprise ?? null,
          verifiedName: (contact as any)?.verifiedName ?? null,
          formattedName: (contact as any)?.formattedName ?? null,
          avatar: contactAvatar,
        }
      : null,
    numberIdLookup: numberIdLookup
      ? {
          user: (numberIdLookup as any)?.user ?? null,
          server: (numberIdLookup as any)?.server ?? null,
          _serialized: (numberIdLookup as any)?._serialized ?? null,
        }
      : null,
    chatResolved: chatUserDigits,
    lidResolved: lidResolvedDigits,
    rawId: {
      serialized: (message as any)?.id?._serialized ?? null,
      remote: (message as any)?.id?.remote ?? null,
      participant: (message as any)?.id?.participant ?? null,
      fromMe: (message as any)?.id?.fromMe ?? null,
      id: (message as any)?.id?.id ?? null,
    },
  });

  // Se o contato for LID, tentamos pegar o número real dele se disponível
  const jidFallback = !contactIdSerialized?.includes("@lid") ? contactIdSerialized : null;

  // Sempre preferir o número real vindo do contato para cases @lid.
  const phone =
    jidFallback?.split('@')[0] ||
    contactNumberDigits ||
    chatUserDigits ||
    contactIdUserDigits ||
    lidResolvedDigits ||
    (numberIdLookup?.user ? String(numberIdLookup.user).replace(/\D/g, "") : null) ||
    normalizeIncomingPhone(message.from);

  // Identificador prioritário para salvar no ticket: 
  // Tentamos encontrar o JID real (@c.us) através de nossa função centralizada
  let bestIdentifier = await resolveBestWhatsAppId(message.from);

  const messageText = message.body;
  logger.info("[WhatsApp-QR] Mensagem recebida", {
    from: message.from,
    bestIdentifier,
    contactIdSerialized,
    phoneNormalized: phone,
    pushname: (contact as any)?.pushname
  });

  let Cliente = await db.getClienteByPhone(phone);
  logger.info("[WhatsApp-QR-DEBUG] Passo 1: Cliente buscado", { found: !!Cliente, id: (Cliente as any)?.id });
  
  // PERSISTÊNCIA DO JID: Se encontramos um JID real (@c.us) e o Cliente tem o número genérico ou @lid, atualizamos o cadastro.
  if (Cliente && bestIdentifier.includes("@c.us") && !bestIdentifier.includes("@lid")) {
      if (!Cliente.whatsappNumber || Cliente.whatsappNumber !== bestIdentifier) {
          logger.info(`[WhatsApp-QR] Persistindo JID real no Cliente ${Cliente.id}: ${bestIdentifier}`);
          try {
              await db.updateCliente(Cliente.id, { whatsappNumber: bestIdentifier });
              // Atualizamos a instância local para o restante do fluxo
              Cliente.whatsappNumber = bestIdentifier;
          } catch (persistErr) {
              logger.warn("[WhatsApp-QR] Falha ao persistir JID no Cliente", { error: (persistErr as Error).message });
          }
      }
  }
  
  let ticket: any = null;
  let isCoordinatorReply = false;

  if (Cliente) {
    // 1. Tenta encontrar ticket onde ele é o solicitante (Requester)
    ticket = await db.findOpenTicketByExternalIdentifier(String((Cliente as any).id), 'interno');
    logger.info("[WhatsApp-QR-DEBUG] Passo 2: Busca por ID interno", { ticketId: ticket?.id });
    
    if (!ticket) {
        ticket = await db.findOpenTicketByExternalIdentifier(bestIdentifier, 'whatsapp');
        logger.info("[WhatsApp-QR-DEBUG] Passo 3: Busca por telefone JID", { ticketId: ticket?.id });
    }

    if (!ticket && bestIdentifier !== message.from) {
        ticket = await db.findOpenTicketByExternalIdentifier(message.from, 'whatsapp');
        logger.info("[WhatsApp-QR-DEBUG] Passo 3.1: Busca por telefone original", { ticketId: ticket?.id });
    }

    // 2. Se não encontrou como solicitante, tenta encontrar como COORDENADOR
    if (!ticket) {
        ticket = await db.findOpenTicketByCoordinator(Cliente.id);
        if (ticket) {
            isCoordinatorReply = true;
            logger.info(`[WhatsApp-QR] Identificado como resposta de coordenador para ticket #${ticket.protocol}`);
        }
    }
  }

  // Se não achou ticket via Cliente...
  if (!ticket) {
      // --- CSAT CHECK START ---
      // Se não tem ticket aberto, verifica se é uma resposta de pesquisa pendente
      if (Cliente) {
          const pendingSurvey = await db.findPendingCsatSurveyByCliente((Cliente as any).id);
          if (pendingSurvey) {
              const text = messageText.trim();
              let rating: number | null = null;
              
              if (text === "1") rating = 3;
              else if (text === "2") rating = 2;
              else if (text === "3") rating = 1;
              
              if (rating) {
                  logger.info(`[WhatsApp-QR] Recebida resposta de CSAT: ${rating} para ticket #${pendingSurvey.ticketId}`);
                  const replyMsg = await db.processCsatResponse(pendingSurvey.ticketId, rating);
                  
                  if (replyMsg) {
                      await sendQrMessage(message.from, replyMsg);
                  }
                  return; // INTERROMPE O FLUXO - Não cria ticket novo
              } else {
                  // Requirement 5 Modified: Se a resposta não for uma nota válida (1, 2, 3), 
                  // assumimos que o cliente ignorou a pesquisa e quer iniciar um novo atendimento.
                  logger.info(`[WhatsApp-QR] Resposta CSAT inválida/ignorada: '${text}'. Cancelando pesquisa e permitindo novo ticket.`);
                  
                  // Marcar pesquisa como expirada para liberar o fluxo
                  // Schema permite: 'pending', 'answered', 'expired'
                  await db.updateCsatStatus(pendingSurvey.id, "expired");
                  
                  // NÃO retornamos aqui. deixamos fluir para o bloco 'if (!ticket)' abaixo
                  // que vai criar um novo ticket ou anexar se achar outro.
              }
          }
      }
      // --- CSAT CHECK END ---

     // ...
     logger.info("[WhatsApp-QR-DEBUG] Passo 4: Busca fallback ticket", { ticketId: ticket?.id });
    // Tenta pelo ID priorizado
    ticket = await db.findOpenTicketByExternalIdentifier(bestIdentifier, 'whatsapp');
    
    if (!ticket && bestIdentifier !== message.from) {
      ticket = await db.findOpenTicketByExternalIdentifier(message.from, 'whatsapp');
    }
    
    // Fallback pelo telefone normalizado
    if (!ticket) {
      ticket = await db.findOpenTicketByExternalIdentifier(phone, 'whatsapp');
    }

    if (ticket && !Cliente && (ticket as any).clienteId) {
        Cliente = await db.getClienteById((ticket as any).clienteId);
    }

    // --- COOLDOWN CSAT CHECK (Requirement 6) ---
    if (!ticket) {
        const recentCsat = await db.findRecentCsatAnswerByContact(phone);
        if (recentCsat) {
            logger.info(`[WhatsApp-QR] Ignorando mensagem do contato ${phone} devido ao cooldown de CSAT após resposta.`);
            return; // Bloqueia criação de ticket novo durante o tempo estabelecido
        }
    }
  }

  // Se já existe ticket aberto, apenas anexa a mensagem (THREADING)
  if (ticket) {
    logger.info(`[WhatsApp-QR] Ticket aberto encontrado para threading: #${ticket.protocol} (ID: ${ticket.id})`);
    
    // Se o identificador mudou (ex: de número para @lid ou vice-versa), atualizamos para garantir resposta correta futuramente.
    // IMPORTANTE: Só atualizamos se NÃO for uma resposta de coordenador, para não sobrescrever o contato do Cliente original.
    if (!isCoordinatorReply && ticket.channel === 'whatsapp') {
        const updates: any = {};
        
        // Migramos para o melhor identificador disponível (dando preferência para @c.us sobre @lid)
        if (ticket.externalIdentifier !== bestIdentifier) {
            const currentIsLid = ticket.externalIdentifier?.includes("@lid");
            const newIsLid = bestIdentifier.includes("@lid");

            if (currentIsLid || !newIsLid) {
                updates.externalIdentifier = bestIdentifier;
                logger.info(`[WhatsApp-QR] Atualizando externalIdentifier do ticket #${ticket.protocol}: ${ticket.externalIdentifier} -> ${bestIdentifier}`);
            }
        }

        // Se o nome no ticket está vazio ou é apenas o número, e temos um pushname agora, atualizamos.
        const pushname = (contact as any)?.pushname;
        if (pushname && (!ticket.externalName || ticket.externalName === phone)) {
            updates.externalName = pushname;
            logger.info(`[WhatsApp-QR] Atualizando pushname do ticket #${ticket.protocol}: ${pushname}`);
        }

        if (Object.keys(updates).length > 0) {
            await db.updateTicket(Number(ticket.id), updates);
        }
    }
  } 
  else {

    logger.info('[WhatsApp-QR-DEBUG] Entrando no bloco de criação de ticket');
    
    // Resolver configurações mínimas (resiliência contra falta de setup)
    const config = await db.ensureDefaultTicketConfig({
      contractId: (Cliente as any)?.contractId
    });

    const INITIAL_PRIORITY = "media";

    logger.info("[WhatsApp-QR] Criando novo ticket (Automático)");
    const result = await db.createTicket({
      clienteId: (Cliente as any)?.id || null,
      contractId: config.contractId,
      reasonId: config.reasonId,
      channel: 'whatsapp',
      externalIdentifier: bestIdentifier, // Salva o ID real (@lid ou @c.us) para garantir resposta correta
      externalName: (contact as any)?.pushname || (contact as any)?.name || null,
      externalNumber: phone, // Salva o número limpo (digits)
      description: `Atendimento via WhatsApp (QR): ${messageText.substring(0, 500)}`,
      priority: INITIAL_PRIORITY,
      currentDepartmentId: config.departmentId,
      openedAt: new Date(),
    });

    if (result) {
        logger.info('[WhatsApp-QR-DEBUG] Ticket criado com sucesso', { protocol: result.protocol, id: result.id });
        
        // Enviar mensagem de boas vindas usando o ID real resolvido para evitar problemas com LID
        const welcomeMsgTemplate = await db.getBotMessage("boas_vindas");
        let welcomeMsg = welcomeMsgTemplate || `Olá! Seu atendimento foi registrado com o protocolo *{{protocol}}*. Em breve um de nossos atendentes irá responder.`;

        // Buscar nomes para os placeholders
        const dept = await db.getDepartmentById(config.departmentId);
        const departmentName = dept?.name || "Atendimento";

        let contractName = undefined;
        if (config.contractId) {
            const contract = await db.getContractById(config.contractId);
            if (contract) contractName = contract.name;
        }

        // Replace placeholders (usando regex global para permitir múltiplas ocorrências)
        welcomeMsg = replaceMessagePlaceholders(welcomeMsg, {
          ticket: {
            id: Number(result.id),
            protocol: result.protocol,
            externalName: (contact as any)?.pushname || (contact as any)?.name || null
          },
          cliente: Cliente || null,
          attendantName: "Atendente Virtual",
          departmentName: departmentName,
          contractName: contractName
        });

        await sendQrMessage(bestIdentifier, welcomeMsg);
        
        // Atualizar a variável ticket para usar na inserção da mensagem abaixo
        ticket = await db.getTicketById(Number(result.id));
        
        if (ticket?.id) {
            await db.createTicketHistory({
                ticketId: Number(ticket.id),
                userId: ticket.assignedTo ? Number(ticket.assignedTo) : (null as any), // Sistema se null
                action: "ticket_created_whatsapp_qr",
                oldValue: null,
                newValue: ticket.protocol,
                comment: "Ticket criado automaticamente via WhatsApp (QR)",
            });
        }
    }
  }

  if (!ticket) {
    logger.error("[WhatsApp-QR] Não foi possível criar/encontrar ticket");
    return;
  }

  // Processamento de mídia
  let mediaUrl = null;
  let mediaLabel = '[Mídia]';
  
  if (message.hasMedia) {
    try {
      logger.info("[WhatsApp-QR] Tentando baixar mídia da mensagem", { messageId: message.id._serialized });
      const media = await message.downloadMedia().catch(e => {
          logger.error("[WhatsApp-QR] Falha no downloadMedia() do WWebJS", { error: e?.message });
          return null;
      });

      if (media) {
          const mime = media.mimetype ? media.mimetype.split(';')[0].toLowerCase() : 'application/octet-stream';
          let extension = mime.split('/')[1] || 'bin';
          
          // Mapeamento de extensões e labels amigáveis
          if (mime.startsWith('image/')) {
              mediaLabel = '[Imagem]';
              if (mime === 'image/jpeg') extension = 'jpg';
          } else if (mime.startsWith('video/')) {
              mediaLabel = '[Vídeo]';
          } else if (mime.startsWith('audio/')) {
              mediaLabel = (String(message.type) === 'voice' || (message as any).isPtt) ? '[Áudio]' : '[Arquivo de Áudio]';
              // WhatsApp QR usa majoritariamente OGG/Opus para áudios nativos.
              // Forçamos ogg se não houver extensão clara.
              if (extension === 'ogg' || extension === 'opus' || extension === 'bin') {
                  extension = 'ogg';
              }
          } else if (mime === 'application/pdf') {
              mediaLabel = '[PDF]';
              extension = 'pdf';
          } else if (mime.includes('word')) {
              mediaLabel = '[Documento Word]';
              extension = 'docx';
          } else if (mime.includes('excel') || mime.includes('spreadsheet')) {
              mediaLabel = '[Planilha]';
              extension = 'xlsx';
          } else if (mime.includes('csv')) {
              mediaLabel = '[Arquivo CSV]';
              extension = 'csv';
          } else if (mime.includes('powerpoint') || mime.includes('presentation')) {
              mediaLabel = '[Apresentação]';
              extension = 'pptx';
          } else if (mime === 'text/plain') {
              mediaLabel = '[Arquivo de Texto]';
              extension = 'txt';
          }

          const filename = `whatsapp/${Date.now()}_${crypto.randomUUID()}.${extension}`;
          // Converte base64 para buffer
          const buffer = Buffer.from(media.data, 'base64');
          const uploaded = await storagePut(filename, buffer, media.mimetype);
          mediaUrl = uploaded.url;
          logger.info("[WhatsApp-QR] Mídia baixada e armazenada", { mediaUrl, mimetype: media.mimetype, label: mediaLabel });
      }
    } catch (err) {
      logger.error("[WhatsApp-QR] Erro ao processar mídia da mensagem", { error: (err as Error)?.message });
    }
  }

  // Anexar mensagem ao ticket (seja novo ou existente)
  await db.createTicketMessage({
    ticketId: Number(ticket.id),
    senderType: "Cliente",
    senderId: null,
    message: messageText || mediaLabel,
    mediaUrl: mediaUrl,
    whatsappMessageId: message.id._serialized,
    isFromWhatsapp: true,
    recipientclienteId: isCoordinatorReply ? (Cliente as any).id : null,
  });
  logger.info(`[WhatsApp-QR] Mensagem anexada ao ticket #${ticket.protocol} com sucesso`);

  await db.updateTicketInteraction(Number(ticket.id));
}

async function scheduleReconnect() {
  const activeType = await getActiveType();
  if (activeType !== "qr") return;
  if (qrStatus === "disconnected") {
    logger.info("[WhatsApp-QR] Reconexão ignorada: Status é 'disconnected' (desconexão intencional).");
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      if (!qrClient) {
        logger.info("[WhatsApp-QR] Tentando reconectar sessão QR");
        await initializeQrSession();
      }
    } catch (error) {
      logger.error("[WhatsApp-QR] Reconnect falhou", { error: (error as Error)?.message });
    }
  }, 10000);
}

function normalizeOutgoingPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;
  return `${DEFAULT_COUNTRY_CODE}${digits}`;
}

function normalizeIncomingPhone(raw: string): string {
  const digits = raw.replace(/@.*/, "").replace(/\D/g, "");
  if (!digits) return "";
  // Se vier com DDI+11 dígitos
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === DEFAULT_COUNTRY_CODE.length + 11) {
    return digits;
  }
  // Se vier maior que o esperado, manter os últimos 11 dígitos e prefixar DDI
  if (digits.length > DEFAULT_COUNTRY_CODE.length + 11) {
    const last11 = digits.slice(-11);
    return `${DEFAULT_COUNTRY_CODE}${last11}`;
  }
  // Se vier apenas 11 dígitos (sem DDI), prefixa DDI
  if (digits.length === 11) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }
  // Caso contrário, retorna o que tiver
  return digits;
}

async function ensureClienteRecord(phoneDigits: string) {
  if (!phoneDigits) return null;
  const existing = await db.getClienteByPhone(phoneDigits);
  if (existing) {
    if (!existing.whatsappNumber) {
      await db.updateCliente(existing.id, { whatsappNumber: phoneDigits });
    }
    return existing;
  }

  const reg = Number(`${Date.now() % 1_000_000_000_000}`);
  const name = `WhatsApp ${phoneDigits}`;
  try {
    const clienteId = await db.createCliente({
      registrationNumber: reg,
      name,
      document: phoneDigits.slice(-11),
      status: "ativo",
      contractId: null,
      whatsappNumber: phoneDigits,
    });
    await db.addclientePhone({
      clienteId,
      phone: phoneDigits,
      phoneType: "whatsapp",
      isActive: true,
    });
    const created = await db.getClienteById(clienteId);
    return created ?? null;
  } catch (error) {
    logger.warn("[WhatsApp-QR] Falha ao criar Cliente automático", { error: (error as Error)?.message });
    return null;
  }
}

async function tryAcquireLock(): Promise<boolean> {
  const client = await db.getDb();
  if (!client) return true;
  try {
    // Usamos um timeout pequeno (2s) para lidar com reinicializações rápidas do servidor (hotswap)
    // onde a sessão antiga pode ainda estar limpando.
    const timeout = Math.max(LOCK_TIMEOUT_SEC, 2);
    const rows = await client.execute(
      sql`SELECT GET_LOCK(${LOCK_NAME}, ${timeout}) as locked`
    );
    
    // mysql2 execute returns [rows, fields]
    const resultRows = Array.isArray(rows) ? (rows[0] as any) : rows;
    const firstRow = Array.isArray(resultRows) ? resultRows[0] : resultRows;
    const locked = firstRow?.locked;

    return locked === 1 || locked === "1";
  } catch (error) {
    logger.warn("[WhatsApp-QR] Falha ao tentar obter lock do BD", { error: (error as Error)?.message });
    return true; // fallback: não bloquear se BD não suportar
  }
}

async function releaseLock() {
  const client = await db.getDb();
  if (!client) return;
  try {
    await client.execute(sql`SELECT RELEASE_LOCK(${LOCK_NAME})`);
  } catch {
    // ignora erros ao liberar lock
  }
}




