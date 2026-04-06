import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { logger } from "../_core/logger";
import {
  listEmailAccounts,
  getEmailCredential,
  addEmailTestLog,
  recordEmailEvent,
  getEmailEventByMessageId,
  setEmailEventTicket,
  updateEmailAccountStatus,
  getTicketByProtocol,
  createTicketMessage,
  createTicket,
  getEmailAccountById,
  findOpenTicketByExternalIdentifier,
  findClienteByEmail,
  updateEmailAccount,
  ensureDefaultTicketConfig,
  checkBlacklist,
} from "../db";
import { decryptSecret } from "./crypto";
import { storagePut } from "../storage";

const POLLING_MS = 60_000;

async function resolveTicketId(parsed: any) {
  // 1) In-Reply-To -> email_events.messageId
  const inReplyTo = Array.isArray(parsed.inReplyTo) ? parsed.inReplyTo[0] : parsed.inReplyTo;
  if (inReplyTo) {
    const event = await getEmailEventByMessageId(inReplyTo);
    if (event?.ticketId) return event.ticketId;
  }

  // 2) Assunto com [#TICKET-<protocol>]
  const subject: string = parsed.subject || "";
  const match = subject.match(/\[#TICKET-([A-Za-z0-9_-]+)\]/);
  if (match) {
    const protocol = match[1];
    const ticket = await getTicketByProtocol(protocol);
    if (ticket) return ticket.id;
  }

  // 3) Buscar ticket aberto pelo e-mail do remetente (agrupamento solicitado)
  const senderEmail = (parsed.from as any)?.value?.[0]?.address;
  if (senderEmail) {
    const ticketEmail = await findOpenTicketByExternalIdentifier(senderEmail, 'email');
    if (ticketEmail) return ticketEmail.id;
  }

  return null;
}

function truncate(str: string, max = 4000) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

/**
 * Limpa o corpo do e-mail de ruídos técnicos e threads anteriores.
 */
function cleanEmailContent(text: string): string {
  if (!text) return "";

  // 1. Remover citações [cid:...] de imagens inline
  let cleaned = text.replace(/\[cid:[^\]]+\]/g, "");

  // 2. Tentar remover threads anteriores (De:, Enviado:, From:, Subject:)
  // Padrão comum do Outlook/Gmail em português e inglês
  const threadMarkers = [
    /\n\s*De: .+\n\s*Enviado: .+\n/i,
    /\n\s*From: .+\n\s*Sent: .+\n/i,
    /\n\s*-+ Mensagem original -+/i,
    /\n\s*-+ Original Message -+/i,
    /\n\s*Em [^,]+, \d+ de [^ ]+ de \d+ .+, escreve:\n/i, // Em seg., 29 de dez. de 2025...
    /\n\s*On .+, escreve:\n/i,
  ];

  for (const marker of threadMarkers) {
    const parts = cleaned.split(marker);
    if (parts.length > 1) {
      cleaned = parts[0]; // Pega apenas a primeira parte (mensagem nova)
      break;
    }
  }

  return cleaned.trim();
}

async function uploadAttachments(accountId: number, attachments: any[], maxBytes: number) {
  const uploaded: Array<{ url: string; fileName: string }> = [];
  for (const att of attachments) {
    if (!att || !att.content) continue;
    const buf: Buffer = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
    const size = buf.byteLength;
    if (size > maxBytes) {
      continue;
    }
    const fileName = att.filename || `attachment-${Date.now()}`;
    const key = `emails/${accountId}/${Date.now()}-${fileName}`;
    try {
      const stored = await storagePut(key, buf, att.contentType || "application/octet-stream");
      uploaded.push({ url: stored.url, fileName });
    } catch (err) {
      logger.warn("[Email] Falha ao salvar anexo", { error: (err as Error)?.message });
    }
  }
  return uploaded;
}

async function processMessage(accountId: number, parsed: any, accountDefaults: any) {
  const messageId: string | null = parsed.messageId || null;
  const subject: string | null = parsed.subject || null;
  const text = parsed.text || parsed.html || "(sem corpo)";
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  
  // --- BLACKLIST CHECK ---
  const rawFrom = (parsed.from as any)?.value?.[0]?.address;
  if (rawFrom) {
      const isBlacklisted = await checkBlacklist('email', rawFrom.toLowerCase());
      if (isBlacklisted) {
          logger.warn(`[Email] Remetente ${rawFrom} está na BLACKLIST. E-mail ignorado.`);
          return;
      }
  }
  // -----------------------

  const ticketId = await resolveTicketId(parsed);

  const eventId = await recordEmailEvent({
    accountId,
    direction: "inbound",
    status: ticketId ? "received" : "skipped",
    messageId,
    inReplyTo: Array.isArray(parsed.inReplyTo) ? parsed.inReplyTo[0] : parsed.inReplyTo || null,
    subject,
    ticketId: ticketId ?? null,
    error: ticketId ? null : "Ticket não encontrado para este e-mail",
  });

  const maxBytes = (accountDefaults.maxAttachmentMb ?? 10) * 1024 * 1024;

  if (ticketId) {
    await createTicketMessage({
      ticketId,
      senderType: "Cliente",
      senderId: null,
      message: truncate(cleanEmailContent(text)),
      mediaUrl: null,
      isFromWhatsapp: false,
    });
    const uploaded = await uploadAttachments(accountId, attachments, maxBytes);
    for (const att of uploaded) {
      await createTicketMessage({
        ticketId,
        senderType: "Cliente",
        senderId: null,
        message: `Anexo: ${att.fileName}`,
        mediaUrl: att.url,
        isFromWhatsapp: false,
      });
    }
    if (messageId) {
      await setEmailEventTicket(eventId, ticketId);
    }
    return;
  }

  const senderEmail = (parsed.from as any)?.value?.[0]?.address || "";
  const emailDescription = `[E-mail: ${senderEmail}] - ${subject || ""}`;

  // Buscar Cliente pelo e-mail
  const Cliente = await findClienteByEmail(senderEmail);

  // Resolver configurações mínimas (resiliência contra falta de setup na conta de e-mail)
  const config = await ensureDefaultTicketConfig({
    contractId: Cliente?.contractId ?? accountDefaults.defaultContractId,
    departmentId: accountDefaults.departmentId,
    reasonId: accountDefaults.reasonId
  });

  const createdTicket = await createTicket({
    clienteId: Cliente?.id ?? null,
    contractId: config.contractId,
    reasonId: config.reasonId,
    description: truncate(emailDescription),
    priority: "media",
    currentDepartmentId: config.departmentId,
    assignedTo: null,
    openedAt: new Date(),
    status: "aguardando_atendimento",
    channel: 'email',
    externalIdentifier: senderEmail,
    externalName: subject,
  });

  const createdTicketId = createdTicket.id;

  await createTicketMessage({
    ticketId: createdTicketId,
    senderType: "Cliente",
    senderId: null,
    message: truncate(cleanEmailContent(text)),
    mediaUrl: null,
    isFromWhatsapp: false,
  });

  const uploaded = await uploadAttachments(accountId, attachments, maxBytes);
  for (const att of uploaded) {
    await createTicketMessage({
      ticketId: createdTicketId,
      senderType: "Cliente",
      senderId: null,
      message: `Anexo: ${att.fileName}`,
      mediaUrl: att.url,
      isFromWhatsapp: false,
    });
  }

  await setEmailEventTicket(eventId, createdTicketId);
}

async function processAccount(accountId: number) {
  const cred = await getEmailCredential(accountId, "imap");
  const account = await getEmailAccountById(accountId);
  if (!cred || !account) return;

  const pass = decryptSecret(cred.passwordEncrypted) || cred.passwordEncrypted || "";

  const client = new ImapFlow({
    host: cred.host,
    port: cred.port,
    secure: cred.secure !== "none",
    auth: { user: cred.username, pass },
    logger: false,
  });

  // Prevenir crash por erro assíncrono (ex: Socket timeout)
  client.on('error', (err) => {
    logger.error("[Email] Erro assíncrono no cliente IMAP", { 
      accountId, 
      error: err.message,
      code: (err as any).code 
    });
  });

  try {
    logger.debug(`[Email] Iniciando conexão IMAP para conta ${accountId}...`);
    await client.connect();
    
    logger.debug(`[Email] Abrindo INBOX para conta ${accountId}...`);
    await client.mailboxOpen("INBOX");
    
    logger.debug(`[Email] Buscando mensagens não lidas para conta ${accountId}...`);
    const messages = await client.search({ seen: false });

    if (Array.isArray(messages) && messages.length > 0) {
      logger.info(`[Email] Processando ${messages.length} novas mensagens para conta ${accountId}`);
      for (const uid of messages) {
        const { content } = await client.download(uid.toString());
        const parsed = await simpleParser(content);
        await processMessage(accountId, parsed, account);
        await client.messageFlagsAdd(uid.toString(), ["\\Seen"]);
      }
    }

    await client.logout();
    await addEmailTestLog({
      accountId,
      type: "imap",
      success: true,
      message: "Leitura IMAP OK",
      details: { processed: Array.isArray(messages) ? messages.length : 0 },
    });
    await updateEmailAccountStatus(accountId, "active");
  } catch (error) {
    const err = error as any;
    const msg = err?.message || "Falha IMAP polling";
    const stage = !client.authenticated ? "Conexão/Auth" : "Comando";
    
    logger.error(`[Email] Falha no polling IMAP (${stage}) para conta ${accountId}`, { 
      error: msg,
      code: err?.code,
      response: err?.response,
      stack: err?.stack 
    });

    await addEmailTestLog({
      accountId,
      type: "imap",
      success: false,
      message: `${stage}: ${msg}`,
      details: { 
        code: err?.code,
        response: err?.response,
        stack: err?.stack 
      },
    });
    await updateEmailAccountStatus(accountId, "error");
  }
}

export function startEmailPolling() {
  const tick = async () => {
    try {
      const accounts = await listEmailAccounts();
      const active = accounts.filter((a) => a.status !== "inactive");
      for (const account of active) {
        await processAccount(account.id);
      }
    } catch (error) {
      logger.error("[Email] Loop polling falhou", { error: (error as Error)?.message });
    }
  };

  // dispara imediatamente e agenda
  tick();
  setInterval(tick, POLLING_MS);
}




