import { 
  getDb, 
  tickets, 
  csatSurveys, 
  users, 
  profiles, 
  managerAlertConfigs, 
  contracts 
} from "../db";
import { eq, and, sql, desc, count, isNull, lte, gt, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";
import { sendWhatsAppMessage } from "../whatsapp/bridge";
import { sendEmail, renderEmailTemplate } from "../email/service";

/**
 * Motor de alertas para gestores.
 * Verifica condições críticas e despacha notificações via WhatsApp/Email.
 */

export async function processPeriodicAlerts() {
  const db = await getDb();
  if (!db) return;

  try {
    const configs = await db
      .select()
      .from(managerAlertConfigs)
      .where(eq(managerAlertConfigs.isActive, true));

    for (const config of configs) {
      // Verifica Cooldown (evitar spam)
      if (config.lastNotifiedAt) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        const timePassed = Date.now() - new Date(config.lastNotifiedAt).getTime();
        
        if (timePassed < cooldownMs) {
          continue;
        }
      }

      if (config.type === "queue_volume") {
        await checkQueueVolume(db, config);
      } else if (config.type === "contract_spike") {
        await checkContractSpike(db, config);
      }
    }
  } catch (error) {
    logger.error("[AlertService] Erro ao processar alertas periódicos", error);
  }
}

/**
 * Alerta se o volume de tickets aguardando atendimento exceder o limite.
 */
async function checkQueueVolume(db: any, config: any) {
  const waitingResult = await db
    .select({ total: count() })
    .from(tickets)
    .where(eq(tickets.status, "aguardando_atendimento"));

  const currentVolume = waitingResult[0]?.total || 0;

  if (currentVolume >= config.threshold) {
    await triggerAlert(
      db, 
      config, 
      `🚨 *ALERTA DE FILA CRÍTICA*\nExistem ${currentVolume} tickets aguardando atendimento. Limite configurado: ${config.threshold}.`
    );
  }
}

/**
 * Alerta se houver um pico de tickets para um contrato específico na última hora.
 */
async function checkContractSpike(db: any, config: any) {
  const windowMs = (config.windowMinutes || 60) * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  
  const spikes = await db
    .select({
      contractId: tickets.contractId,
      contractName: contracts.name,
      total: count()
    })
    .from(tickets)
    .leftJoin(contracts, eq(tickets.contractId, contracts.id))
    .where(gt(tickets.createdAt, windowStart))
    .groupBy(tickets.contractId, contracts.name)
    .having(sql`count(*) >= ${config.threshold}`);

  for (const spike of spikes) {
    await triggerAlert(
      db, 
      config, 
      `📈 *PICO DE ATENDIMENTO*\nContrato "${spike.contractName}" recebeu ${spike.total} novos tickets nos últimos ${config.windowMinutes} minutos. Limite de pico: ${config.threshold}.`
    );
  }
}

/**
 * Disparado externamente (ex: db.ts) quando um CSAT ruim é recebido.
 */
export async function triggerBadCsatAlert(ticketId: number, rating: number, comment?: string) {
  // Apenas avaliações RUIM (rating 1)
  if (rating > 1) return;

  const db = await getDb();
  if (!db) return;

  try {
    const config = await db
      .select()
      .from(managerAlertConfigs)
      .where(and(
        eq(managerAlertConfigs.type, "bad_csat"), 
        eq(managerAlertConfigs.isActive, true)
      ))
      .limit(1);

    if (config.length > 0) {
      const alertConfig = config[0];

      // Verificar Cooldown
      if (alertConfig.lastNotifiedAt) {
        const cooldownMs = (alertConfig.cooldownMinutes || 0) * 60 * 1000;
        const timePassed = Date.now() - new Date(alertConfig.lastNotifiedAt).getTime();
        if (timePassed < cooldownMs) return;
      }

      // Contar avaliações RUIM na janela
      const windowMs = (alertConfig.windowMinutes || 1) * 60 * 1000;
      const windowStart = new Date(Date.now() - windowMs);

      const countResult = await db
        .select({ total: count() })
        .from(csatSurveys)
        .where(and(
            eq(csatSurveys.rating, 1),
            gt(csatSurveys.answeredAt, windowStart)
        ));

      const ruimCount = countResult[0]?.total || 0;

      if (ruimCount >= alertConfig.threshold) {
        const ticketData = await db
          .select({
            protocol: tickets.protocol,
            clienteName: profiles.fullName
          })
          .from(tickets)
          .leftJoin(profiles, eq(tickets.assignedTo, profiles.userId))
          .where(eq(tickets.id, ticketId))
          .limit(1);

        const protocol = ticketData[0]?.protocol || ticketId;
        const msg = `👎 *AVALIAÇÕES RUIM (CSAT)*\nRecebemos ${ruimCount} avaliações RUIM nos últimos ${alertConfig.windowMinutes} minutos.\n\nTicket mais recente: #${protocol}\nNota: Ruim\nComentário: ${comment || "Vazio"}`;
        
        await triggerAlert(db, alertConfig, msg);
      }
    }
  } catch (error) {
    logger.error("[AlertService] Erro no alerta de CSAT ruim", error);
  }
}

/**
 * Despacha a mensagem para todos os gerentes ativos.
 */
async function triggerAlert(db: any, config: any, message: string) {
  logger.info(`[AlertService] Disparando alerta: ${config.name}`);

  // Sanitização de canais
  let channels = [];
  try {
    channels = typeof config.channels === 'string' ? JSON.parse(config.channels) : config.channels;
  } catch (e) {
    channels = Array.isArray(config.channels) ? config.channels : [];
  }

  const waIds = config.whatsappRecipients || [];
  const emailIds = config.emailRecipients || [];
  const hasSpecificWa = waIds.length > 0;
  const hasSpecificEmail = emailIds.length > 0;

  // Buscar todos os usuários necessários
  const allTargetUserIds = Array.from(new Set([...waIds, ...emailIds]));
  
  let recipients: any[] = [];

  if (allTargetUserIds.length > 0) {
    recipients = await db
      .select({
        id: users.id,
        email: users.email,
        phone: profiles.phone,
        name: profiles.fullName
      })
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(and(
        inArray(users.id, allTargetUserIds),
        eq(profiles.isActive, true)
      ));
  } else {
    // Fallback: todos os gerentes ativos
    recipients = await db
      .select({
        id: users.id,
        email: users.email,
        phone: profiles.phone,
        name: profiles.fullName
      })
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(and(
        eq(users.role, "gerente"), 
        eq(profiles.isActive, true)
      ));
  }

  if (recipients.length === 0) {
    logger.warn("[AlertService] Nenhum destinatário encontrado para o alerta.");
    return;
  }

  const fullMessage = config.customMessage 
    ? `${message}\n\n*Nota:* ${config.customMessage}`
    : message;

  for (const recipient of recipients) {
    const isWaTarget = channels.includes("whatsapp") && (waIds.includes(recipient.id) || !hasSpecificWa);
    const isEmailTarget = channels.includes("email") && (emailIds.includes(recipient.id) || !hasSpecificEmail);

    // WhatsApp
    if (isWaTarget && recipient.phone) {
      await sendWhatsAppMessage(recipient.phone, fullMessage).catch(err => 
        logger.error(`[AlertService] Falha WA para ${recipient.name}`, err)
      );
    }

    // Email
    if (isEmailTarget && recipient.email) {
      const html = renderEmailTemplate(fullMessage.replace(/\*/g, '').replace(/🚨|📈|👎/g, ''));
      await sendEmail({
        to: recipient.email,
        subject: `[ALERTA HDC] ${config.name}`,
        html: html
      }).catch(err => 
        logger.error(`[AlertService] Falha Email para ${recipient.name}`, err)
      );
    }
  }

  // Atualiza timestamp da última notificação para cooldown
  await db.update(managerAlertConfigs)
    .set({ lastNotifiedAt: new Date() })
    .where(eq(managerAlertConfigs.id, config.id));
}



