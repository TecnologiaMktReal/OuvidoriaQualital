
import axios from "axios";
import crypto from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { eq } from "drizzle-orm";
import * as db from "../db";
import { createTicketHistory } from "../db";
import { replaceMessagePlaceholders } from "./placeholders";
import { logger } from "../_core/logger";
import { storagePut } from "../storage";

type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "not_configured"
  | "disabled"
  | "error";

type StoredWhatsAppConfig = {
  phoneNumberId?: string;
  businessAccountId?: string;
  phoneNumber?: string;
  appId?: string;
  webhookUrl?: string;
  verifyTokenHash?: string;
  verifyTokenHint?: string;
  accessTokenEncrypted?: string;
  accessTokenHint?: string;
  appSecretEncrypted?: string;
  appSecretHint?: string;
  lastTestAt?: string | null;
  lastWebhookAt?: string | null;
  lastError?: string | null;
  status?: ConnectionStatus;
  integrationType?: "cloud_api" | "qr";
};

type ConfigSummary = {
  phoneNumberId: string | null;
  businessAccountId: string | null;
  phoneNumber: string | null;
  appId: string | null;
  webhookUrl: string | null;
  hasAccessToken: boolean;
  hasVerifyToken: boolean;
  hasAppSecret: boolean;
  accessTokenHint: string | null;
  verifyTokenHint: string | null;
  appSecretHint: string | null;
  status: ConnectionStatus;
  enabled: boolean;
  lastError: string | null;
  lastTestAt: string | null;
  lastWebhookAt: string | null;
  source: {
    accessToken: "env" | "db" | "missing";
    verifyToken: "env" | "db" | "missing";
    appSecret: "env" | "db" | "missing";
  };
};

const SESSION_NAME = "whatsapp-cloud-api";
const DEFAULT_COUNTRY_CODE = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "55").replace(
  /\D/g,
  ""
);
const REQUEST_TIMEOUT_MS = Number(process.env.WHATSAPP_TIMEOUT_MS ?? "15000");
const GRAPH_API_BASE = process.env.WHATSAPP_GRAPH_API_URL ?? "https://graph.facebook.com";
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v20.0";
const whatsappEnabled =
  (process.env.WHATSAPP_ENABLED ?? "true").toLowerCase() !== "false";

let cachedConfig: StoredWhatsAppConfig | null = null;


function nowIso() {
  return new Date().toISOString();
}

function maskToken(token?: string | null) {
  if (!token) return null;
  const clean = token.trim();
  if (clean.length <= 4) return "*".repeat(clean.length);
  return `${"*".repeat(Math.max(clean.length - 4, 4))}${clean.slice(-4)}`;
}

function getEncryptionKey(): Buffer {
  const keyMaterial = process.env.WHATSAPP_CRYPTO_KEY;
  if (!keyMaterial || keyMaterial.trim().length < 32) {
    throw new Error(
      "WHATSAPP_CRYPTO_KEY ausente ou curto demais. Defina uma chave forte (>=32 chars) no arquivo .env ou variáveis de ambiente."
    );
  }
  const key = crypto.createHash("sha256").update(keyMaterial).digest();
  return key;
}

function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

function decryptSecret(payload?: string | null): string | null {
  if (!payload) return null;
  try {
    const key = getEncryptionKey();
    const [ivHex, tagHex, dataHex] = payload.split(".");
    if (!ivHex || !tagHex || !dataHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    logger.warn("[WhatsApp] Falha ao descriptografar segredo", {
      error: (error as Error)?.message,
    });
    return null;
  }
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Número de telefone inválido");
  }
  // Meta Cloud API documentation recommends E.164 without the '+' sign.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return digits;
  }
  return `${DEFAULT_COUNTRY_CODE}${digits}`;
}

function normalizeForLookup(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits;
}

async function getSessionRow() {
  const client = await db.getDb();
  if (!client) return null;
  const result = await client
    .select()
    .from(db.whatsappSessions)
    .where(eq(db.whatsappSessions.sessionName, SESSION_NAME))
    .limit(1);
  return result[0] ?? null;
}

async function persistSessionData(
  patch: Partial<StoredWhatsAppConfig>,
  overrideStatus?: ConnectionStatus
) {
  const client = await db.getDb();
  if (!client) {
    logger.warn("[WhatsApp] Banco indisponível para persistir configuração");
    return;
  }

  const existing = await getSessionRow();
  const mergedData: StoredWhatsAppConfig = {
    ...(existing?.sessionData as StoredWhatsAppConfig | undefined),
    ...patch,
    status: overrideStatus ?? patch.status ?? (existing?.sessionData as StoredWhatsAppConfig | undefined)?.status,
    integrationType: "cloud_api",
    lastTestAt: patch.lastTestAt ?? (existing?.sessionData as StoredWhatsAppConfig | undefined)?.lastTestAt ?? null,
    lastWebhookAt:
      patch.lastWebhookAt ?? (existing?.sessionData as StoredWhatsAppConfig | undefined)?.lastWebhookAt ?? null,
    lastError: patch.lastError ?? (existing?.sessionData as StoredWhatsAppConfig | undefined)?.lastError ?? null,
  };

  const statusToPersist: "connected" | "disconnected" | "qr_ready" =
    mergedData.status === "connected" ? "connected" : "disconnected";

  await client
    .insert(db.whatsappSessions)
    .values({
      sessionName: SESSION_NAME,
      phoneNumber: mergedData.phoneNumber ?? existing?.phoneNumber ?? null,
      status: statusToPersist,
      sessionData: mergedData,
      connectedAt:
        statusToPersist === "connected" ? new Date() : existing?.connectedAt ?? null,
      disconnectedAt: statusToPersist === "disconnected" ? new Date() : existing?.disconnectedAt ?? null,
      qrCode: null,
    })
    .onDuplicateKeyUpdate({
      set: {
        phoneNumber: mergedData.phoneNumber ?? existing?.phoneNumber ?? null,
        status: statusToPersist,
        sessionData: mergedData,
        updatedAt: new Date(),
        connectedAt:
          statusToPersist === "connected" ? new Date() : existing?.connectedAt ?? null,
        disconnectedAt: statusToPersist === "disconnected" ? new Date() : existing?.disconnectedAt ?? null,
        qrCode: null,
      },
    });

  cachedConfig = mergedData;
}

async function getStoredConfig(): Promise<StoredWhatsAppConfig> {
  if (cachedConfig) return cachedConfig;
  const row = await getSessionRow();
  cachedConfig = (row?.sessionData as StoredWhatsAppConfig | undefined) ?? {};
  return cachedConfig;
}

function getEnvOrStored<T extends keyof StoredWhatsAppConfig>(
  key: T,
  stored: StoredWhatsAppConfig
): string | null {
  switch (key) {
    case "phoneNumberId":
      return process.env.WHATSAPP_PHONE_NUMBER_ID ?? stored.phoneNumberId ?? null;
    case "businessAccountId":
      return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? stored.businessAccountId ?? null;
    case "phoneNumber":
      return process.env.WHATSAPP_PHONE_NUMBER ?? stored.phoneNumber ?? null;
    case "appId":
      return process.env.WHATSAPP_APP_ID ?? stored.appId ?? null;
    case "webhookUrl":
      return process.env.WHATSAPP_WEBHOOK_URL ?? stored.webhookUrl ?? null;
    default:
      return stored[key] ? String(stored[key]) : null;
  }
}

function resolveAccessToken(stored: StoredWhatsAppConfig): { token: string; source: "env" | "db" } | null {
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (envToken?.trim()) {
    return { token: envToken.trim(), source: "env" };
  }
  const decrypted = decryptSecret(stored.accessTokenEncrypted);
  if (decrypted) {
    return { token: decrypted, source: "db" };
  }
  return null;
}

function resolveVerifyToken(stored: StoredWhatsAppConfig): { hash: string; source: "env" | "db" } | null {
  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (envToken?.trim()) {
    return { hash: hashToken(envToken.trim()), source: "env" };
  }
  if (stored.verifyTokenHash) {
    return { hash: stored.verifyTokenHash, source: "db" };
  }
  return null;
}

function resolveAppSecret(stored: StoredWhatsAppConfig): { secret: string; source: "env" | "db" } | null {
  const envSecret = process.env.WHATSAPP_APP_SECRET;
  if (envSecret?.trim()) {
    return { secret: envSecret.trim(), source: "env" };
  }
  const decrypted = decryptSecret(stored.appSecretEncrypted);
  if (decrypted) {
    return { secret: decrypted, source: "db" };
  }
  return null;
}

async function ensureConfigured() {
  const config = await getStoredConfig();
  const tokenInfo = resolveAccessToken(config);
  const phoneNumberId = getEnvOrStored("phoneNumberId", config);

  if (!whatsappEnabled) {
    throw new Error("Integração do WhatsApp está desabilitada (WHATSAPP_ENABLED=false)");
  }

  if (!phoneNumberId) {
    throw new Error("ID do número do WhatsApp (phone_number_id) não configurado.");
  }

  if (!tokenInfo?.token) {
    throw new Error("Token de acesso do WhatsApp Cloud API não configurado.");
  }

  return { config, token: tokenInfo.token, tokenSource: tokenInfo.source, phoneNumberId };
}

export async function saveConfig(input: {
  phoneNumberId: string;
  businessAccountId?: string | null;
  phoneNumber?: string | null;
  appId?: string | null;
  webhookUrl?: string | null;
  accessToken?: string | null;
  verifyToken?: string | null;
  appSecret?: string | null;
}) {
  const current = await getStoredConfig();
  const patch: StoredWhatsAppConfig = {
    phoneNumberId: input.phoneNumberId?.trim(),
    businessAccountId: input.businessAccountId?.trim() || undefined,
    phoneNumber: input.phoneNumber?.trim() || undefined,
    appId: input.appId?.trim() || undefined,
    webhookUrl: input.webhookUrl?.trim() || undefined,
    status: current.status ?? "disconnected",
  };

  if (input.accessToken) {
    patch.accessTokenEncrypted = encryptSecret(input.accessToken.trim());
    patch.accessTokenHint = maskToken(input.accessToken.trim()) || undefined;
  }

  if (input.verifyToken) {
    patch.verifyTokenHash = hashToken(input.verifyToken.trim());
    patch.verifyTokenHint = maskToken(input.verifyToken.trim()) || undefined;
  }

  if (input.appSecret) {
    patch.appSecretEncrypted = encryptSecret(input.appSecret.trim());
    patch.appSecretHint = maskToken(input.appSecret.trim()) || undefined;
  }

  patch.lastError = null;

  await persistSessionData(patch);
  return getConfigSummary();
}

export async function getConfigSummary(): Promise<ConfigSummary> {
  const stored = await getStoredConfig();
  const accessToken = resolveAccessToken(stored);
  const verifyToken = resolveVerifyToken(stored);
  const appSecret = resolveAppSecret(stored);

  const status: ConnectionStatus =
    !whatsappEnabled
      ? "disabled"
      : !getEnvOrStored("phoneNumberId", stored) || !accessToken
      ? "not_configured"
      : (stored.status as ConnectionStatus) ?? "disconnected";

  return {
    phoneNumberId: getEnvOrStored("phoneNumberId", stored),
    businessAccountId: getEnvOrStored("businessAccountId", stored),
    phoneNumber: getEnvOrStored("phoneNumber", stored),
    appId: getEnvOrStored("appId", stored),
    webhookUrl: getEnvOrStored("webhookUrl", stored),
    hasAccessToken: Boolean(accessToken?.token),
    hasVerifyToken: Boolean(verifyToken?.hash),
    hasAppSecret: Boolean(appSecret?.secret),
    accessTokenHint: accessToken?.source === "db" ? stored.accessTokenHint ?? null : null,
    verifyTokenHint: verifyToken?.source === "db" ? stored.verifyTokenHint ?? null : null,
    appSecretHint: appSecret?.source === "db" ? stored.appSecretHint ?? null : null,
    status,
    enabled: whatsappEnabled,
    lastError: stored.lastError ?? null,
    lastTestAt: stored.lastTestAt ?? null,
    lastWebhookAt: stored.lastWebhookAt ?? null,
    source: {
      accessToken: accessToken ? accessToken.source : "missing",
      verifyToken: verifyToken ? verifyToken.source : "missing",
      appSecret: appSecret ? appSecret.source : "missing",
    },
  };
}

export function getCurrentQRCode(): null {
  // Cloud API não utiliza QR Code
  return null;
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const summary = await getConfigSummary();
  return summary.status;
}

export async function getWhatsappHealth() {
  const summary = await getConfigSummary();
  return {
    enabled: summary.enabled,
    status: summary.status,
    lastError: summary.lastError,
    lastTestAt: summary.lastTestAt,
    lastWebhookAt: summary.lastWebhookAt,
    configured: summary.status !== "not_configured",
  };
}

export async function testConnection() {
  try {
    const { config, token, phoneNumberId } = await ensureConfigured();
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}`;
    const response = await axios.get(url, {
      params: { fields: "id,display_phone_number,verified_name" },
      headers: { Authorization: `Bearer ${token}` },
      timeout: REQUEST_TIMEOUT_MS,
    });

    await persistSessionData(
      {
        phoneNumber: config.phoneNumber ?? response.data?.display_phone_number ?? null,
        lastTestAt: nowIso(),
        lastError: null,
        status: "connected",
      },
      "connected"
    );

    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "test_connection",
      payload: { phoneNumber: response.data?.display_phone_number, verifiedName: response.data?.verified_name },
      status: "success",
    });

    return {
      ok: true,
      phoneNumber: response.data?.display_phone_number ?? config.phoneNumber ?? null,
      verifiedName: response.data?.verified_name ?? null,
    };
  } catch (error) {
    const message =
      (error as any)?.response?.data?.error?.message ??
      (error as Error)?.message ??
      "Falha ao testar conexão com WhatsApp Cloud API.";
    logger.error("[WhatsApp] Teste de conexão falhou", { message });

    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "test_connection",
      payload: { error: (error as any)?.response?.data || message },
      status: "error",
      errorMessage: message,
    });    await persistSessionData(
      { lastError: message, lastTestAt: nowIso(), status: "disconnected" },
      "disconnected"
    );
    return { ok: false, error: message };
  }
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  const { token, phoneNumberId } = await ensureConfigured();
  let to = "";

  try {
    to = normalizeToE164(phone);
    const response = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    const messageId = response.data?.messages?.[0]?.id;
    logger.info("[WhatsApp] Mensagem enviada com sucesso", { to });

    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "message",
      phoneNumber: to,
      payload: { to, message, response: response.data },
      status: "sent",
    });

    return { success: true, messageId };
  } catch (error) {
    const status = (error as any)?.response?.status;
    const apiError = (error as any)?.response?.data?.error?.message;
    const msg =
      apiError ??
      (error as Error)?.message ??
      "Erro desconhecido ao enviar mensagem via WhatsApp Cloud API";
    
    const finalTarget = to || phone;
    logger.error("[WhatsApp] Falha ao enviar mensagem", { to: finalTarget, status, error: msg });

    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "message",
      phoneNumber: finalTarget,
      payload: { to: finalTarget, message, error: (error as any)?.response?.data || msg },
      status: "error",
      errorMessage: msg,
    });

    await persistSessionData({ lastError: msg, status: "disconnected" }, "disconnected");
    return { success: false, error: msg };
  }
}

export async function sendWhatsAppMediaBase64(
  phone: string,
  mimeType: string,
  base64Data: string,
  fileName: string,
  caption?: string
) {
  const { token, phoneNumberId } = await ensureConfigured();
  const to = normalizeToE164(phone);

  try {
    // 1. Upload media
    // Limpeza profunda do Base64 para garantir binário puro e sem corrupção
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, "").replace(/\s/g, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    
    // Verificação de Magic Number (OGG deve começar com 'OggS' - 4f 67 67 53)
    const magicNumber = buffer.slice(0, 4).toString("hex");
    const first16Bytes = buffer.slice(0, 16).toString("hex");
    const isOgg = magicNumber === "4f676753";
    
    // Sanitização rigorosa de MimeType - Para áudio, a Meta prefere 'audio/ogg' puro
    let cleanMimeType = mimeType.split(";")[0].trim().toLowerCase();
    const extension = cleanMimeType.split("/")[1] || "bin";
    const cleanFileName = fileName.split(";")[0].split(" ")[0].trim();
    const finalFileName = cleanFileName.includes(".") ? cleanFileName : `${cleanFileName}.${extension}`;

    // Determinar a categoria correta para o parâmetro 'type' da API de Media
    let mediaKey: "image" | "video" | "audio" | "document" = "document";
    if (cleanMimeType.startsWith("image/")) mediaKey = "image";
    else if (cleanMimeType.startsWith("video/")) mediaKey = "video";
    else if (cleanMimeType.startsWith("audio/")) mediaKey = "audio";

    logger.info("[WhatsApp] Diagnóstico de Upload de Áudio", { 
      size: buffer.length,
      magicNumber,
      first16Bytes,
      isOgg,
      cleanMimeType,
      mediaCategory: mediaKey,
      finalFileName
    });

    // --- CORREÇÃO DE CONTAINER: WEB RECURSO (WEBM) & MP4 (IOS) PARA COMPATIBILIDADE META ---
    let finalBuffer = buffer;
    let uploadFileName = finalFileName;
    
    const isWebM = magicNumber === "1a45dfa3";
    const isMp4  = magicNumber.startsWith("000000"); 
    const isMp3  = magicNumber.startsWith("494433");

    if ((isWebM || isMp4 || isMp3) && mediaKey === "audio") {
      logger.info(`[WhatsApp] Detectado formato não-nativo OGG (${magicNumber}). Convertendo para OGG/Opus (iOS Friendly) via ffmpeg.`);
      
      const tmpInput = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).substring(7)}.${isWebM ? 'webm' : (isMp3 ? 'mp3' : 'm4a')}`);
      const tmpOutput = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).substring(7)}.ogg`);
      
      try {
        fs.writeFileSync(tmpInput, buffer);

        // Caminho dinâmico para FFmpeg (Suporte Windows Local e Linux Produção)
        const ffmpegPath = process.platform === "win32" ? "ffmpeg" : "/usr/bin/ffmpeg";

        // COMANDO FFMPEG OTIMIZADO V5 (iOS GOLD STANDARD)
        // -frame_size 20: Define o tamanho do quadro Opus em 20ms (Vital para playback no iOS)
        // -page_duration 20000: Duração da página Ogg em 20ms
        // -ac 1 / -ar 16000: Padrão Mono/Wideband do WhatsApp
        execSync(`${ffmpegPath} -i ${tmpInput} -vn -map_metadata -1 -c:a libopus -b:a 32k -ac 1 -ar 16000 -frame_size 20 -page_duration 20000 -application voip ${tmpOutput} -y`, { stdio: 'pipe' });
        
        if (fs.existsSync(tmpOutput)) {
          finalBuffer = fs.readFileSync(tmpOutput);
          logger.info("[WhatsApp] Conversão para OGG/Opus (iOS) concluída com sucesso", { 
            oldSize: buffer.length, 
            newSize: finalBuffer.length,
            magic: finalBuffer.slice(0, 4).toString("hex")
          });
          
          cleanMimeType = "audio/ogg";
          uploadFileName = uploadFileName.split('.')[0] + ".ogg";
        }
      } catch (err: any) {
        const stderr = err.stderr ? err.stderr.toString() : "No stderr";
        logger.error("[WhatsApp] Falha crítica ao converter áudio via ffmpeg", { 
          error: err.message,
          stderr: stderr.slice(0, 300)
        });
      } finally {
        if (fs.existsSync(tmpInput)) try { fs.unlinkSync(tmpInput); } catch(e) {}
        if (fs.existsSync(tmpOutput)) try { fs.unlinkSync(tmpOutput); } catch(e) {}
      }
    }
    // --------------------------------------------------------------------------

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    
    // CRÍTICO PARA iOS: A Meta prefere o Mimetype real no campo 'type' para processar corretamente o container
    formData.append("type", mediaKey === "audio" ? cleanMimeType : mediaKey); 
    
    const blob = new Blob([new Uint8Array(finalBuffer)], { type: cleanMimeType });
    formData.append("file", blob, uploadFileName);

    const uploadResult = await fetch(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!uploadResult.ok) {
      const errorText = await uploadResult.text();
      throw new Error(`Falha no upload de mídia: ${uploadResult.status} - ${errorText}`);
    }

    const uploadData: any = await uploadResult.json();
    const mediaId = uploadData?.id;
    if (!mediaId) throw new Error("Falha ao obter media_id no upload");

    // 2. Send media message
    const mediaData: any = { id: mediaId };
    
    if (mediaKey === "document") {
      mediaData.filename = finalFileName;
      if (caption) mediaData.caption = caption;
    } else if (mediaKey === "image" || mediaKey === "video") {
      if (caption) mediaData.caption = caption;
    } else if (mediaKey === "audio") {
      // voice: true faz o áudio aparecer como mensagem de voz waveform
      mediaData.voice = true;
    }

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: mediaKey,
      [mediaKey]: mediaData,
    };

    logger.info("[WhatsApp] DEBUG_MEDIA_PAYLOAD_FINAL", { 
      to, 
      mediaKey, 
      payload: JSON.stringify(payload)
    });

    const sendResponse = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const messageId = sendResponse.data?.messages?.[0]?.id;
    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "message",
      phoneNumber: to,
      payload: { to, type: mediaKey, fileName: finalFileName, caption, response: sendResponse.data },
      status: "sent",
    });

    return { success: true, messageId };
  } catch (error) {
    const apiError = (error as any)?.response?.data?.error?.message;
    const apiErrorDetails = (error as any)?.response?.data?.error;
    const msg = apiError ?? (error as Error)?.message ?? "Erro ao enviar mídia via WhatsApp Cloud API";
    const finalTarget = to || phone;
    
    logger.error("[WhatsApp] Falha ao enviar mídia", { 
      to: finalTarget, 
      error: msg, 
      details: apiErrorDetails,
      mimeType,
      mediaKey: (error as any)?.config?.data ? JSON.parse((error as any).config.data).type : "unknown",
      fullError: JSON.stringify((error as any)?.response?.data || {})
    });

    await db.logWhatsappCommunication({
      direction: "outbound",
      type: "message",
      phoneNumber: finalTarget,
      payload: { 
        to: finalTarget, 
        type: "media", 
        fileName, 
        mimeType,
        error: (error as any)?.response?.data || msg 
      },
      status: "error",
      errorMessage: msg,
    });

    return { success: false, error: msg };
  }
}

type IncomingMessagePayload = {
  from: string;
  text: string;
  messageId: string;
  waId?: string;
  profileName?: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  mediaUrl?: string | null;
};

async function handleIncomingMessage(payload: IncomingMessagePayload) {
  const phoneDigits = normalizeForLookup(payload.waId || payload.from);
  if (!phoneDigits) {
    logger.warn("[WhatsApp] Telefone inválido recebido no webhook", { from: payload.from });
    return;
  }

  // --- BLACKLIST CHECK ---
  const isBlacklisted = await db.checkBlacklist('whatsapp', phoneDigits);
  if (isBlacklisted) {
      logger.warn(`[WhatsApp] Contato ${phoneDigits} está na BLACKLIST. Mensagem ignorada.`);
      return;
  }
  // -----------------------

  logger.info("[WhatsApp] Mensagem recebida", {
    from: payload.from,
    waId: payload.waId,
    profileName: payload.profileName,
    displayPhoneNumber: payload.displayPhoneNumber,
    verifiedName: payload.verifiedName,
    phoneNormalized: phoneDigits,
  });

  let Cliente = await db.getClienteByPhone(phoneDigits);
  if (!Cliente && phoneDigits.startsWith(DEFAULT_COUNTRY_CODE)) {
    Cliente = await db.getClienteByPhone(phoneDigits.slice(DEFAULT_COUNTRY_CODE.length));
  }

  let ticket = null;
  let isCoordinatorReply = false;

  if (Cliente) {
    // 1. Tenta como solicitante
    const ticketsRes = await db.getAllTickets({
      clienteId: (Cliente as any).id,
      onlyOpen: true,
    });

    ticket = ticketsRes[0] || null;

    // 2. Se não encontrou como solicitante, tenta como COORDENADOR
    if (!ticket) {
        ticket = await db.findOpenTicketByCoordinator((Cliente as any).id);
        if (ticket) {
            isCoordinatorReply = true;
            logger.info(`[WhatsApp-Cloud] Identificado como resposta de coordenador para ticket #${ticket.protocol}`);
        }
    }
  }

  if (!ticket) {
    // --- CSAT CHECK START ---
    if (Cliente) {
        const pendingSurvey = await db.findPendingCsatSurveyByCliente((Cliente as any).id);
        if (pendingSurvey) {
            const text = payload.text.trim();
            let rating: number | null = null;
            
            if (text === "1") rating = 3;
            else if (text === "2") rating = 2;
            else if (text === "3") rating = 1;
            
            if (rating) {
                logger.info(`[WhatsApp-Cloud] Recebida resposta de CSAT: ${rating} para ticket #${pendingSurvey.ticketId}`);
                const replyMsg = await db.processCsatResponse(pendingSurvey.ticketId, rating);
                
                if (replyMsg) {
                    await sendWhatsAppMessage(payload.from, replyMsg);
                }
                return; // INTERROMPE O FLUXO - Não cria ticket novo
            } else {
                // Requirement 5: Qualquer outra resposta envia o BOT novamente e descarta a mensagem
                logger.info(`[WhatsApp-Cloud] Resposta de CSAT inválida: '${text}'. Reenviando pergunta.`);
                const csatQuestion = await db.getBotMessage("CSAT_PERGUNTA");
                if (csatQuestion) {
                    const finalMsg = replaceMessagePlaceholders(csatQuestion, {
                        ticket: { id: pendingSurvey.ticketId, protocol: pendingSurvey.ticketId.toString() },
                        cliente: Cliente
                    });
                    await sendWhatsAppMessage(payload.from, finalMsg);
                }
                return; // Descarta a mensagem
            }
        }
    }
    // --- CSAT CHECK END ---

    ticket = await db.findOpenTicketByExternalIdentifier(phoneDigits, 'whatsapp');
  }

  if (!ticket) {
    // --- COOLDOWN CSAT CHECK (Requirement 6) ---
    const recentCsat = await db.findRecentCsatAnswerByContact(phoneDigits);
    if (recentCsat) {
        logger.info(`[WhatsApp-Cloud] Ignorando mensagem do contato ${phoneDigits} devido ao cooldown de CSAT após resposta.`);
        return;
    }

    const config = await db.ensureDefaultTicketConfig({
      contractId: Cliente?.contractId ?? undefined
    });

    const result = await db.createTicket({
      clienteId: Cliente?.id || null,
      contractId: config.contractId,
      reasonId: config.reasonId,
      description: `Atendimento via WhatsApp - wa_id:${payload.waId ?? phoneDigits} - nome:${payload.profileName ?? "n/d"} - tel:${phoneDigits} - display:${payload.displayPhoneNumber ?? "n/d"} - verified:${payload.verifiedName ?? "n/d"} - ${payload.text.substring(0, 80)}`,
      priority: "media",
      currentDepartmentId: config.departmentId,
      channel: 'whatsapp',
      externalIdentifier: phoneDigits,
      externalName: payload.profileName || payload.verifiedName || null,
    });

    ticket = await db.getTicketById(Number(result.id));

    if (ticket?.id && ticket.assignedTo) {
      await createTicketHistory({
        ticketId: ticket.id,
        userId: ticket.assignedTo,
        action: "ticket_created_whatsapp",
        oldValue: null,
        newValue: ticket.protocol,
        comment: "Ticket criado automaticamente via WhatsApp (Cloud API)",
      });
    }

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

    // Replace placeholders usando a função centralizada
    welcomeMsg = replaceMessagePlaceholders(welcomeMsg, {
      ticket: {
        id: Number(result.id),
        protocol: result.protocol,
        externalName: payload.profileName || payload.verifiedName || null
      },
      cliente: Cliente || null,
      attendantName: "Atendente Virtual",
      departmentName: departmentName,
      contractName: contractName
    });

    await sendWhatsAppMessage(
      phoneDigits,
      welcomeMsg
    );
  }

  if (!ticket) {
    logger.error("[WhatsApp] Não foi possível criar/encontrar ticket após processamento");
    return;
  }

  await db.createTicketMessage({
    ticketId: Number(ticket.id),
    senderType: "Cliente",
    senderId: null,
    message: payload.text || (payload.mediaUrl ? '[Mídia]' : ''),
    mediaUrl: payload.mediaUrl,
    whatsappMessageId: payload.messageId,
    isFromWhatsapp: true,
    recipientclienteId: isCoordinatorReply ? (Cliente as any).id : null,
  });

  // Se o ticket já existia, podemos querer sinalizar que há nova mensagem
  // mas não forçamos 'aberto' para não quebrar o workflow 'em_atendimento'
  //await db.updateTicket(Number(ticket.id), { status: "aguardando_atendimento" });

    if (!isCoordinatorReply && ticket.channel === 'whatsapp') {
        const updates: any = {};
        const freshIdentifier = payload.waId || payload.from;
        if (ticket.externalIdentifier !== freshIdentifier) {
            updates.externalIdentifier = freshIdentifier;
        }
        
        // Atualizar profileName se disponível e o atual estiver genérico
        if (payload.profileName && (!ticket.externalName || ticket.externalName === phoneDigits)) {
            updates.externalName = payload.profileName;
        }

        if (Object.keys(updates).length > 0) {
            await db.updateTicket(Number(ticket.id), updates);
        }
    }

  if (ticket.assignedTo) {
    await createTicketHistory({
      ticketId: Number(ticket.id),
      userId: Number(ticket.assignedTo),
      action: "message_received_whatsapp",
      oldValue: null,
      newValue: null,
      comment: payload.text.substring(0, 200),
    });
  }

  await db.updateTicketInteraction(Number(ticket.id));
}

export async function handleWebhookVerification(params: any) {
  const mode = params?.["hub.mode"];
  const token = params?.["hub.verify_token"];
  const challenge = params?.["hub.challenge"];

  const stored = await getStoredConfig();
  const verifyToken = resolveVerifyToken(stored);

  if (mode === "subscribe" && token && challenge && verifyToken?.hash) {
    const incomingHash = hashToken(Array.isArray(token) ? token[0] : String(token));
    if (crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(verifyToken.hash))) {
      await persistSessionData({ lastError: null, status: "connected" }, "connected");
      return { verified: true, challenge: String(challenge) };
    }
  }

  logger.warn("[WhatsApp] Falha na verificação do webhook", { mode, hasToken: Boolean(token) });
  return { verified: false };
}

export async function handleWebhookEvent(body: any, signature: string | undefined, rawBody?: Buffer) {
  // Ignorar eventos que não sejam do WhatsApp (prevenindo poluição por outros webhooks do Meta)
  if (body?.object !== "whatsapp_business_account") {
    return;
  }

  // Log detalhado do payload recebido (somente para depuração em ambiente de dev).
  logger.info("[WhatsApp] Webhook bruto", {
    entryCount: body?.entry?.length,
    raw: body,
  });

  const stored = await getStoredConfig();
  const appSecret = resolveAppSecret(stored);

  if (!whatsappEnabled) {
    logger.warn("[WhatsApp] Webhook recebido porém integração está desabilitada");
    return;
  }

  const tokenInfo = resolveAccessToken(stored);
  const phoneNumberId = getEnvOrStored("phoneNumberId", stored);

  if (!tokenInfo?.token || !phoneNumberId) {
    logger.warn("[WhatsApp] Webhook recebido mas integração não está configurada", {
        hasToken: !!tokenInfo?.token,
        hasPhoneNumberId: !!phoneNumberId
    });
    return;
  }

  if (appSecret?.secret) {
      const expected = `sha256=${crypto
        .createHmac("sha256", appSecret.secret)
        .update(rawBody ?? Buffer.from(JSON.stringify(body)))
        .digest("hex")}`;
      if (!signature || signature !== expected) {
      logger.warn("[WhatsApp] Assinatura do webhook inválida", { signature });
      return;
    }
  }

  const changes = body?.entry?.flatMap((entry: any) => entry?.changes ?? []) ?? [];

  for (const change of changes) {
    const value = change?.value;
    const messages = value?.messages ?? [];
    const contacts = value?.contacts ?? [];
    const displayPhoneNumber = value?.metadata?.display_phone_number ?? null;
    const verifiedNameMeta = value?.metadata?.verified_name ?? null;

    // Log de Status (sent, delivered, read, failed)
    const statuses = value?.statuses ?? [];
    for (const statusObj of statuses) {
      await db.logWhatsappCommunication({
        direction: "inbound",
        type: "status",
        phoneNumber: statusObj.recipient_id,
        payload: statusObj,
        status: statusObj.status,
      });
    }

    for (const msg of messages) {
      const from = msg.from ?? contacts[0]?.wa_id;
      const waId = contacts[0]?.wa_id ?? msg.from ?? null;
      const profileName = contacts[0]?.profile?.name || verifiedNameMeta;
      
      let text =
        msg.text?.body ??
        msg.button?.text ??
        msg.interactive?.button_reply?.title ??
        msg.interactive?.list_reply?.description ??
        "";

      let mediaUrl = null;

      // Suporte a mídias
      const mediaType = msg.type;
      const mediaObj = msg[mediaType];

      if (mediaObj && mediaObj.id && ['image', 'video', 'audio', 'voice', 'document'].includes(mediaType)) {
        try {
          logger.info(`[WhatsApp] Baixando mídia do tipo: ${mediaType}`, { mediaId: mediaObj.id });
          mediaUrl = await downloadMediaById(mediaObj.id);
          if (!text && (mediaType === 'audio' || mediaType === 'voice')) {
            text = '[Áudio]';
          } else if (!text) {
            text = '[Mídia]';
          }
        } catch (err) {
          logger.error("[WhatsApp] Erro ao processar mídia da Cloud API", { error: (err as Error)?.message });
        }
      }

      if (!from || (!text && !mediaUrl)) continue;

      // Log de comunicação específico por mensagem (Inbound)
      await db.logWhatsappCommunication({
        direction: "inbound",
        type: "message",
        phoneNumber: from,
        payload: { from, text, waId, profileName, mediaUrl, msg },
        status: "received",
      });

      try {
        await handleIncomingMessage({
          from,
          waId: waId ?? undefined,
          profileName: profileName ?? undefined,
          displayPhoneNumber: displayPhoneNumber ?? undefined,
          verifiedName: verifiedNameMeta ?? profileName ?? undefined,
          text,
          messageId: msg.id,
          mediaUrl,
        });
      } catch (error) {
        logger.error("[WhatsApp] Erro ao processar mensagem recebida", {
          error: (error as Error)?.message,
        });
      }
    }
  }

  await persistSessionData({ lastWebhookAt: nowIso(), lastError: null, status: "connected" }, "connected");
}

/**
 * Baixa uma mídia da Cloud API do WhatsApp e armazena em nosso storage
 */
async function downloadMediaById(mediaId: string): Promise<string | null> {
  const stored = await getStoredConfig();
  const tokenInfo = resolveAccessToken(stored);
  if (!tokenInfo?.token) throw new Error("Token não configurado");

  // 1. Obter URL da mídia
  const metaResponse = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${tokenInfo.token}` }
  });

  const downloadUrl = metaResponse.data?.url;
  const mimeType = metaResponse.data?.mime_type;

  if (!downloadUrl) throw new Error("URL de download não encontrada");

  // 2. Baixar o arquivo real
  const fileResponse = await axios.get(downloadUrl, {
    headers: { Authorization: `Bearer ${tokenInfo.token}` },
    responseType: 'arraybuffer'
  });

  // 3. Salvar no storage
  const extension = mimeType?.split('/')[1]?.split(';')[0] || 'bin';
  const filename = `whatsapp/${Date.now()}_${crypto.randomUUID()}.${extension}`;
  
  const uploaded = await storagePut(filename, Buffer.from(fileResponse.data), mimeType || 'application/octet-stream');
  return uploaded.url;
}

export async function initializeWhatsApp() {
  logger.info("=== WHATSAPP SERVICE RELOADED WITH FFMPEG SUPPORT ===");
  // Para a Cloud API, a "inicialização" é apenas validar a configuração.
  return testConnection();
}

export async function disconnectWhatsApp() {
  await persistSessionData({ status: "disconnected" }, "disconnected");
}



