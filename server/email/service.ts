import {
  addEmailTestLog,
  getEmailAccountById,
  getEmailCredential,
  markEmailCredentialValidated,
  updateEmailAccountStatus,
  getEmailEventsByTicketId,
  getTicketById,
  recordEmailEvent
} from "../db";
import { logger } from "../_core/logger";
import { decryptSecret } from "./crypto";
import { testPop3Connection } from "./pop3";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

type TestType = "smtp" | "imap" | "pop3";

type TestInput = {
  accountId: number;
  type: TestType;
};

type ConnectionResult = { ok: true; message?: string } | { ok: false; error: string };

async function getCreds(accountId: number, protocol: "smtp" | "imap" | "pop3") {
  const account = await getEmailAccountById(accountId);
  const credential = await getEmailCredential(accountId, protocol);
  if (!account || !credential) {
    throw new Error("Conta ou credencial não encontrada");
  }
  const password =
    decryptSecret(credential.passwordEncrypted) ||
    credential.passwordEncrypted ||
    "";
  return { account, credential, password };
}

async function testSmtp(accountId: number): Promise<ConnectionResult> {
  try {
    const { account, credential, password } = await getCreds(accountId, "smtp");
    const transporter = nodemailer.createTransport({
      host: credential.host,
      port: credential.port,
      secure: credential.secure === "ssl",
      auth: {
        user: credential.username,
        pass: password,
      },
    });
    await transporter.verify();
    await addEmailTestLog({
      accountId,
      type: "smtp",
      success: true,
      message: "Conexão SMTP verificada",
      details: { host: credential.host, port: credential.port, secure: credential.secure },
    });
    await markEmailCredentialValidated(credential.id);
    await updateEmailAccountStatus(accountId, "active");
    return { ok: true, message: "SMTP OK" };
  } catch (error) {
    const msg = (error as Error)?.message || "Falha SMTP";
    logger.error("[Email] SMTP test failed", { error: msg });
    await addEmailTestLog({
      accountId,
      type: "smtp",
      success: false,
      message: msg,
      details: { stack: (error as Error)?.stack },
    });
    await updateEmailAccountStatus(accountId, "error");
    return { ok: false, error: msg };
  }
}

async function testImap(accountId: number): Promise<ConnectionResult> {
  try {
    const { credential, password } = await getCreds(accountId, "imap");
    const client = new ImapFlow({
      host: credential.host,
      port: credential.port,
      secure: credential.secure !== "none",
      auth: {
        user: credential.username,
        pass: password,
      },
      logger: false,
    });
    await client.connect();
    await client.logout();
    await addEmailTestLog({
      accountId,
      type: "imap",
      success: true,
      message: "Conexão IMAP verificada",
      details: { host: credential.host, port: credential.port, secure: credential.secure },
    });
    await markEmailCredentialValidated(credential.id);
    return { ok: true, message: "IMAP OK" };
  } catch (error) {
    const msg = (error as Error)?.message || "Falha IMAP";
    logger.error("[Email] IMAP test failed", { error: msg });
    await addEmailTestLog({
      accountId,
      type: "imap",
      success: false,
      message: msg,
      details: { stack: (error as Error)?.stack },
    });
    return { ok: false, error: msg };
  }
}

async function testPop3(accountId: number): Promise<ConnectionResult> {
  try {
    const { credential, password } = await getCreds(accountId, "pop3");
    await testPop3Connection({
      host: credential.host,
      port: credential.port,
      secure: credential.secure !== "none",
      username: credential.username,
      password,
    });
    await addEmailTestLog({
      accountId,
      type: "pop3",
      success: true,
      message: "Conexão POP3 verificada",
      details: { host: credential.host, port: credential.port, secure: credential.secure },
    });
    await markEmailCredentialValidated(credential.id);
    return { ok: true, message: "POP3 OK" };
  } catch (error) {
    const msg = (error as Error)?.message || "Falha POP3";
    logger.error("[Email] POP3 test failed", { error: msg });
    await addEmailTestLog({
      accountId,
      type: "pop3",
      success: false,
      message: msg,
      details: { stack: (error as Error)?.stack },
    });
    return { ok: false, error: msg };
  }
}

/**
 * Renderiza o template HTML profissional para as respostas.
 */
export function renderEmailTemplate(message: string, signature?: string | null): string {
  const formattedMessage = message.replace(/\n/g, "<br>");
  const formattedSignature = signature ? `<div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">${signature.replace(/\n/g, "<br>")}</div>` : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .container { max-width: 720px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .content { padding: 50px; color: #374151; line-height: 1.6; }
      .logo { margin-bottom: 35px; }
      .footer { padding: 25px 50px; border-top: 1px solid #e5e7eb; background-color: #ffffff; font-size: 12px; color: #9ca3af; }
      .side-bar { width: 42px; min-width: 42px; background-repeat: repeat-y; background-position: top center; background-size: 100% auto; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div style="background-color: #f5f5f5; padding: 40px 10px;">
      <div class="container">
        <!-- Barra superior simulada do template Supabase -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
            <td class="content">
              <div class="logo">
                <img src="https://bit.ly/48zfoNw" alt="Logo Qualital" width="170" style="display:block;">
              </div>
              <div style="font-size: 16px; color: #374151;">
                ${formattedMessage}
              </div>
              ${formattedSignature}
            </td>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
          </tr>
        </table>
        <div class="footer">
          <table width="100%">
            <tr>
              <td>© Qualital - Todos os direitos reservados</td>
              <td align="right">
                <img src="https://bit.ly/48zfoNw" alt="Qualital" width="70" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle; margin-right: 10px;">
                <img src="https://bit.ly/4oKEE89" alt="SomosCoop" width="50" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle;">
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        Mensagem automática - Help Desk Qualital
      </div>
    </div>
  </body>
</html>
  `;
}

/**
 * Renderiza o template HTML profissional para Pesquisa CSAT.
 */
import { ENV } from "../_core/env";

export function renderCsatEmailTemplate(protocol: string, ticketId: number, clienteName: string, contractName: string): string {
  const baseUrl = ENV.appBaseUrl;
  
  // Opções de avaliação: 3 (Excelente), 2 (Bom), 1 (Ruim)
  const ratings = [
    { value: 3, label: "1️⃣ Excelente 🌟", color: "#10b981" },
    { value: 2, label: "2️⃣ Bom 👍", color: "#f59e0b" },
    { value: 1, label: "3️⃣ Ruim 👎", color: "#ef4444" }
  ];

  const buttons = ratings.map(r => `
    <div style="margin-bottom: 20px; text-align: center;">
      <a href="${baseUrl}/csat-feedback?t=${ticketId}&r=${r.value}" 
         style="display: inline-block; width: 280px; padding: 14px 0; background-color: ${r.color}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ${r.label}
      </a>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .container { max-width: 720px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .content { padding: 50px; color: #374151; line-height: 1.6; }
      .logo { margin-bottom: 35px; }
      .footer { padding: 25px 50px; border-top: 1px solid #e5e7eb; background-color: #ffffff; font-size: 12px; color: #9ca3af; }
      .side-bar { width: 42px; min-width: 42px; background-repeat: repeat-y; background-position: top center; background-size: 100% auto; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div style="background-color: #f5f5f5; padding: 40px 10px;">
      <div class="container">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
            <td class="content">
              <div class="logo">
                <img src="https://bit.ly/48zfoNw" alt="Logo Qualital" width="170" style="display:block;">
              </div>
              
              <div style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Olá, <strong>${clienteName}</strong> (Contrato: ${contractName})! 👋<br><br>
                Poderia avaliar o nosso atendimento? Sua opinião é fundamental para evoluirmos sempre. 🚀<br><br>
                Como foi sua experiência hoje?<br>
              </div>

              <div style="margin: 30px 0;">
                ${buttons}
              </div>

              <div style="margin-top: 35px; text-align: center; font-size: 14px; color: #6b7280;">
                Muito obrigado pela sua colaboração! 🙏
              </div>
            </td>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
          </tr>
        </table>
        <div class="footer">
          <table width="100%">
            <tr>
              <td>© Qualital - Todos os direitos reservados<br><span style="font-size: 10px;">Esta pesquisa expira em 1 hora.</span></td>
              <td align="right">
                <img src="https://bit.ly/48zfoNw" alt="Qualital" width="70" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle; margin-right: 10px;">
                <img src="https://bit.ly/4oKEE89" alt="SomosCoop" width="50" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle;">
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        Mensagem automática - Help Desk Qualital
      </div>
    </div>
  </body>
</html>
  `;
}

export async function testEmailConnection(input: TestInput) {
  switch (input.type) {
    case "smtp":
      return testSmtp(input.accountId);
    case "imap":
      return testImap(input.accountId);
    case "pop3":
      return testPop3(input.accountId);
    default:
      return { ok: false, error: "Tipo de teste inválido" };
  }
}

export async function sendOutboundEmail({ ticketId, message, html: customHtml, attachments }: { ticketId: number, message: string, html?: string, attachments?: any[] }) {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket || ticket.channel !== 'email' || !ticket.externalIdentifier) {
      return { success: false, error: "Ticket não é do canal e-mail ou falta identificador" };
    }

    const events = await getEmailEventsByTicketId(ticketId);
    const lastInbound = events.find(e => e.direction === 'inbound');
    
    if (!lastInbound) {
      return { success: false, error: "Nenhum evento de entrada encontrado para este ticket" };
    }

    const { account, credential, password } = await getCreds(lastInbound.accountId, "smtp");

    const transporter = nodemailer.createTransport({
      host: credential.host,
      port: credential.port,
      secure: credential.secure === "ssl",
      auth: {
        user: credential.username,
        pass: password,
      },
    });

    let subject = lastInbound.subject || `Ticket #${ticket.protocol}`;
    if (!subject.includes(`[#TICKET-${ticket.protocol}]`)) {
      subject = `${subject} [#TICKET-${ticket.protocol}]`;
    }
    if (!subject.toLowerCase().startsWith("re:")) {
      subject = `Re: ${subject}`;
    }

    const html = customHtml || renderEmailTemplate(message, account.signature);

    const info = await transporter.sendMail({
      from: account.fromAddress || account.email,
      to: ticket.externalIdentifier,
      subject: subject,
      text: message,
      html: html,
      inReplyTo: lastInbound.messageId || undefined,
      references: lastInbound.messageId ? [lastInbound.messageId] : undefined,
      attachments: attachments,
    });

    await recordEmailEvent({
      accountId: lastInbound.accountId,
      direction: "outbound",
      status: "sent",
      ticketId,
      subject: subject,
      messageId: info.messageId,
    });
    
    return { success: true };
  } catch (error) {
    logger.error("[Email] Failed to send outbound email", { error: (error as Error).message, ticketId });
    return { success: false, error: (error as Error).message };
  }
}

export async function sendEmail(options: { to: string; subject: string; html: string; attachments?: any[] }) {
  try {
    // Buscar uma conta SMTP ativa (prioriza contas de sistema ou a primeira ativa)
    const db = await import("../db").then(m => m.getDb());
    if (!db) throw new Error("Database unavailable");
    
    // Tentar achar conta padrão
    const accounts = await import("../db").then(m => m.listEmailAccounts());
    const activeAccount = accounts.find((a: any) => a.status === 'active');

    if (!activeAccount) {
      throw new Error("Nenhuma conta de e-mail ativa encontrada no sistema");
    }

    const { credential, password } = await getCreds(activeAccount.id, "smtp");

    const transporter = nodemailer.createTransport({
      host: credential.host,
      port: credential.port,
      secure: credential.secure === "ssl",
      auth: {
        user: credential.username,
        pass: password,
      },
      tls: {
       rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: activeAccount.fromAddress || activeAccount.email,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    return { success: true };
  } catch (error) {
    logger.error("[Email] Generic sendEmail failed", { error: (error as Error).message });
    throw error;
  }
}




