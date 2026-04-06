import * as db from "../db";
import { logger } from "../_core/logger";
import { eq, and, isNotNull, sql, desc, lte } from "drizzle-orm";
import { tickets, quickMessages, ticketMessages, clientes, contracts, departments } from "../db";
import { replaceMessagePlaceholders } from "../whatsapp/placeholders";
import { sendWhatsAppMessage } from "../whatsapp/bridge"; 

/**
 * Checks for tickets that match automation criteria and sends configured messages.
 */
export async function processBotAutomations() {
  const database = await db.getDb();
  if (!database) return;

  try {
    // 1. Get all active timer-based bot configurations
    const automations = await database
      .select()
      .from(quickMessages)
      .where(
        and(
          eq(quickMessages.active, true),
          isNotNull(quickMessages.timeoutMinutes)
        )
      );

    if (automations.length === 0) return;

    for (const automation of automations) {
      if (!automation.category || !automation.timeoutMinutes) continue;
      
      const categoryType = automation.category.replace("BOT-", "");
      let targetStatus = "";

      // Map category to ticket status
      if (categoryType === "aguardando_atendimento") {
        targetStatus = "aguardando_atendimento";
      } else if (categoryType === "aguardando_resposta") {
        targetStatus = "aguardando_resposta";
      } else {
        continue;
      }

      
      // 2. Find candidates
      // We fetch ALL tickets in the target status and filter in JS to avoid Timezone/SQL mismatches
      const candidateTickets = await database
        .select({
          tickets: tickets,
          clientes: clientes,
          contractName: contracts.name,
          departmentName: departments.name
        })
        .from(tickets)
        .leftJoin(clientes, eq(tickets.clienteId, clientes.id))
        .leftJoin(contracts, eq(tickets.contractId, contracts.id))
        .leftJoin(departments, eq(tickets.currentDepartmentId, departments.id))
        .where(eq(tickets.status, targetStatus));

      for (const row of candidateTickets) {
        const ticket = row.tickets;
        const Cliente = row.clientes;
        const { contractName, departmentName } = row;

        // Date check in JS
        const now = new Date();
        const timeoutMs = automation.timeoutMinutes * 60 * 1000;
        const thresholdDate = new Date(now.getTime() - timeoutMs);

        const lastInteraction = ticket.lastInteractionAt || ticket.statusStartedAt || ticket.updatedAt || ticket.createdAt;
        const lastInteractionDate = lastInteraction ? new Date(lastInteraction) : null;
        
        // If it's newer than the threshold, it hasn't timed out yet. Skip.
        if (lastInteractionDate && lastInteractionDate >= thresholdDate) {
            // logger.info(`[Bot Debug] Ticket ${ticket.protocol} is too new. Last: ${lastInteractionDate.toISOString()}, Threshold: ${thresholdDate.toISOString()}`);
            continue;
        }

        // If we reach here, the ticket IS old enough.
        // Double check: Get last message of this ticket to ensure we don't spam

        // Double check: Get last message of this ticket to ensure we don't spam
        const lastMessages = await database
             .select()
             .from(ticketMessages)
             .where(eq(ticketMessages.ticketId, ticket.id))
             .orderBy(desc(ticketMessages.createdAt))
             .limit(1);

        const lastMessage = lastMessages[0];

        // If the last message was from 'sistema', we skip to avoid infinite loop
        if (lastMessage && lastMessage.senderType === "sistema") {
            continue;
        }

        logger.info(`[Bot Automation] Triggering '${automation.category}' for Ticket ${ticket.protocol}`);
        
        // 1. Process placeholders
        let processedContent = automation.content;
        try {
            processedContent = replaceMessagePlaceholders(
                automation.content,
                {
                    ticket: {
                        id: ticket.id,
                        protocol: ticket.protocol,
                        externalName: ticket.externalName
                    },
                    Cliente: Cliente ? { name: Cliente.name } : null,
                    contractName: contractName || undefined,
                    departmentName: departmentName || undefined,
                }
            );
        } catch (err) {
            logger.warn(`[Bot Automation] Placeholder error: ${err}`);
        }

        // 2. Insert message into DB
        try {
            await database.insert(ticketMessages).values({
                ticketId: ticket.id,
                senderType: "sistema",
                message: processedContent,
                isFromWhatsapp: false,
                createdAt: new Date(),
            });

            // 3. Update ticket last interaction to prevent immediate re-trigger
            await database.update(tickets)
                .set({ lastInteractionAt: new Date() })
                .where(eq(tickets.id, ticket.id));

            // 4. Send via WhatsApp if applicable
            // Determine target phone
            let targetPhone = ticket.externalIdentifier;
            if (!targetPhone && Cliente?.whatsappNumber) {
                targetPhone = Cliente.whatsappNumber;
            }

            // Only send if the channel is explicitly 'whatsapp'
            if (ticket.channel === "whatsapp" && targetPhone) {
                 const result = await sendWhatsAppMessage(targetPhone, processedContent);
                 if (!result.success) {
                     logger.warn(`[Bot Automation] WhatsApp send failed for Ticket ${ticket.protocol}: ${result.error}`);
                 }
            }
            
        } catch (error: any) {
            logger.error(`[Bot Automation] Failed to process Ticket ${ticket.id}`, {
                message: error.message,
                stack: error.stack
            });
        }
      }
    }
  } catch (error) {
    logger.error("[Bot Automation] Error processing automations", { error });
  }

  await processCsatTimeouts();

  // 3. Process Manager Alerts (Requirement)
  try {
    const { processPeriodicAlerts } = await import("../services/alertService");
    await processPeriodicAlerts();
  } catch (err) {
    logger.error("[Bot Automation] Error triggering Manager Alerts", err);
  }
}

/**
 * Checks for pending CSAT surveys that have expired.
 */
async function processCsatTimeouts() {
    const database = await db.getDb();
    if (!database) return;

    try {
        const now = new Date();
        const expiredSurveys = await database.select()
            .from(db.csatSurveys)
            .where(
                and(
                    eq(db.csatSurveys.status, "pending"),
                    lte(db.csatSurveys.expiresAt, now)
                )
            );
        
        // Buscar mensagem de "Sem Resposta" configurada
        const noResponseBot = await database.select()
            .from(db.quickMessages)
            .where(and(eq(db.quickMessages.category, "BOT-SEM_RESPOSTA_CSAT"), eq(db.quickMessages.active, true)))
            .limit(1);
        
        const noResponseMsg = noResponseBot[0]?.content;

        for (const survey of expiredSurveys) {
             logger.info(`[CSAT Automation] Expiring survey for ticket #${survey.ticketId}`);
             
             await database.update(db.csatSurveys)
                .set({ status: "expired" })
                .where(eq(db.csatSurveys.id, survey.id));
             
             await db.createTicketHistory({
                ticketId: survey.ticketId,
                userId: null, // System
                action: "csat_expired",
                newValue: "Sem Resposta 😶",
                comment: "Cliente não respondeu dentro do prazo."
             });

             // Registrar no chat como "Sem Resposta" (Requirement 2)
             await database.insert(db.ticketMessages).values({
                ticketId: survey.ticketId,
                senderType: "Cliente",
                message: "Sem Resposta 😶",
                isFromWhatsapp: false,
             });

             // Enviar bot de "Sem Resposta" se configurado (Requirement 1)
             if (noResponseMsg) {
                const ticket = await db.getTicketById(survey.ticketId);
                const Cliente = await db.getClienteById(survey.clienteId);
                
                const isWhatsapp = ticket?.channel === "whatsapp";
                let targetPhone = ticket?.externalIdentifier;
                if (!targetPhone && Cliente?.whatsappNumber) targetPhone = Cliente.whatsappNumber;

                let finalMsg = noResponseMsg;
                try {
                    const dept = ticket?.currentDepartmentId ? await db.getDepartmentById(ticket.currentDepartmentId) : null;
                    const contract = ticket?.contractId ? await db.getContractById(ticket.contractId) : null;

                    finalMsg = replaceMessagePlaceholders(noResponseMsg, {
                        ticket: { 
                            id: survey.ticketId, 
                            protocol: ticket?.protocol || survey.ticketId.toString(),
                            externalName: ticket?.externalName 
                        },
                        Cliente: Cliente,
                        contractName: contract?.name,
                        departmentName: dept?.name
                    });
                } catch (e) {
                        // ignore placeholder errors
                }

                // Somente via WA se for canal WA
                if (targetPhone && isWhatsapp) {
                    await sendWhatsAppMessage(targetPhone, finalMsg).catch(err => logger.error(`[CSAT] WA fail: ${err}`));
                }
                
                // Registrar mensagem do sistema no chat (sempre)
                await database.insert(db.ticketMessages).values({
                    ticketId: survey.ticketId,
                    senderType: "sistema",
                    message: finalMsg,
                    isFromWhatsapp: false,
                });
             }
        }

    } catch (err) {
        logger.error("[CSAT Automation] Error processing timeouts", err);
    }
}



