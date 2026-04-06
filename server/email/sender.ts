import nodemailer from "nodemailer";
import { decryptSecret } from "./crypto";
import {
  getDefaultEmailAccount,
  getEmailAccountById,
  getEmailCredential,
  recordEmailEvent,
  updateEmailAccountStatus,
  addEmailTestLog,
  markEmailCredentialValidated,
} from "../db";
import { logger } from "../_core/logger";

type SendInput = {
  ticketId: number;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  accountId?: number;
  maxAttachmentMb?: number;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    size?: number;
  }>;
};

const DEFAULT_MAX_ATTACHMENT_MB = 10;

export async function sendTicketEmail(input: SendInput) {
  const account = input.accountId
    ? await getEmailAccountById(input.accountId)
    : await getDefaultEmailAccount();

  if (!account) throw new Error("Nenhuma conta de e-mail configurada");

  const credential = await getEmailCredential(account.id, "smtp");
  if (!credential) throw new Error("Credencial SMTP não encontrada");

  const pass =
    decryptSecret(credential.passwordEncrypted) ||
    credential.passwordEncrypted ||
    "";

  const transporter = nodemailer.createTransport({
    host: credential.host,
    port: credential.port,
    secure: credential.secure === "ssl",
    auth: {
      user: credential.username,
      pass,
    },
  });

  const maxMb = input.maxAttachmentMb ?? account.maxAttachmentMb ?? DEFAULT_MAX_ATTACHMENT_MB;
  const maxBytes = maxMb * 1024 * 1024;
  const totalSize = (input.attachments || []).reduce((acc, att) => acc + (att.size ?? 0), 0);
  if (totalSize > maxBytes) {
    throw new Error(`Anexos excedem o limite de ${maxMb}MB`);
  }

  const from = account.fromAddress || account.email;
  const replyTo = account.replyTo || account.email;

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    const messageId = info.messageId || (info as any).envelope?.messageId || undefined;

    if (credential.id) {
      await markEmailCredentialValidated(credential.id);
    }
    await updateEmailAccountStatus(account.id, "active");
    await recordEmailEvent({
      accountId: account.id,
      direction: "outbound",
      status: "sent",
      ticketId: input.ticketId,
      messageId: messageId ?? null,
      subject: input.subject,
      error: null,
      inReplyTo: null,
    });

    return { success: true, messageId };
  } catch (error) {
    const msg = (error as Error)?.message || "Falha ao enviar e-mail";
    logger.error("[Email] Falha ao enviar", { error: msg });
    await recordEmailEvent({
      accountId: account.id,
      direction: "outbound",
      status: "failed",
      ticketId: input.ticketId,
      messageId: null,
      subject: input.subject,
      error: msg,
      inReplyTo: null,
    });
    await addEmailTestLog({
      accountId: account.id,
      type: "smtp",
      success: false,
      message: msg,
      details: { stack: (error as Error)?.stack },
    });
    await updateEmailAccountStatus(account.id, "error");
    throw error;
  }
}





