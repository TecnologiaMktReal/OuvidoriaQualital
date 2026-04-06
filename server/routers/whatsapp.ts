import { z } from "zod";
import { adminProcedure, protectedProcedure, router, superAdminProcedure } from "../_core/trpc";
import * as whatsappService from "../whatsapp/service";
import * as whatsappConfig from "../whatsapp/config";
import * as whatsappQr from "../whatsapp/serviceQr";
import * as db from "../db";

export const whatsappRouter = router({
  // Obter status/health da integração (ambos os tipos)
  getStatus: adminProcedure.query(async () => {
    const mode = await whatsappConfig.getActiveType();
    const cloud = await whatsappService.getWhatsappHealth();
    const qr = whatsappQr.getQrStatus();
    const qrHealth = await whatsappQr.checkQrDependencies();
    return { mode, cloud, qr, qrHealth };
  }),

  getMode: adminProcedure.query(async () => {
    return { mode: await whatsappConfig.getActiveType() };
  }),

  setMode: adminProcedure
    .input(z.object({ mode: z.enum(["cloud_api", "qr"]) }))
    .mutation(async ({ input }) => {
      await whatsappConfig.setActiveType(input.mode);
      return { success: true };
    }),

  getQrStatus: adminProcedure.query(async () => {
    return whatsappQr.getQrStatus();
  }),

  initializeQr: adminProcedure.mutation(async () => {
    await whatsappConfig.setActiveType("qr");
    return whatsappQr.initializeQrSession();
  }),

  disconnectQr: adminProcedure.mutation(async () => {
    await whatsappConfig.setActiveType("qr");
    await whatsappQr.disconnectQr();
    return { success: true };
  }),

  // Obter configuração atual (mascarada)
  getConfig: adminProcedure.query(async () => {
    return whatsappService.getConfigSummary();
  }),

  // Salvar configuração
  saveConfig: adminProcedure
    .input(
      z.object({
        phoneNumberId: z.string().min(3, "Informe o phone_number_id"),
        businessAccountId: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        appId: z.string().optional().nullable(),
        webhookUrl: z.string().url().optional().nullable(),
        accessToken: z.string().optional().nullable(),
        verifyToken: z.string().optional().nullable(),
        appSecret: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return whatsappService.saveConfig(input);
    }),

  // Testar conexão com Cloud API
  testConnection: adminProcedure.mutation(async () => {
    return whatsappService.testConnection();
  }),

  // Inicializar conexão WhatsApp (Cloud API: apenas valida config)
  initialize: adminProcedure.mutation(async () => {
    await whatsappConfig.setActiveType("cloud_api");
    await whatsappService.initializeWhatsApp();
    return { success: true };
  }),

  // Desconectar WhatsApp (marca como desconectado)
  disconnect: adminProcedure.mutation(async () => {
    await whatsappConfig.setActiveType("cloud_api");
    await whatsappService.disconnectWhatsApp();
    return { success: true };
  }),

  // Enviar mensagem via WhatsApp
  sendMessage: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      message: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { ticketId, message } = input;
      
      // Buscar ticket
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) {
        throw new Error("Ticket não encontrado");
      }

      const closedStatuses = ["atendimento_fechado", "ticket_invalido"];
      if (closedStatuses.includes(ticket.status as string)) {
        throw new Error("Ticket fechado. A conversa já está encerrada.");
      }
      
      // Verificar permissão RBAC
      if ((ctx.profileRole || ctx.user.role) === "atendente" && ticket.assignedTo !== ctx.user.id) {
        throw new Error("Acesso negado: você não tem permissão para este ticket");
      }
      
      // Buscar telefone: priorizar externalIdentifier se disponível (especialmente para IDs @lid ou números não cadastrados)
      let targetPhone: string | null = ticket.externalIdentifier || null;
      
      if (!targetPhone && ticket.clienteId) {
        const phones = await db.getclientePhones(ticket.clienteId);
        const Cliente = await db.getClienteById(ticket.clienteId);

        // priorizar: whatsapp > principal > primeiro ativo > whatsappNumber do Cliente
        const activePhones = phones.filter((p) => p.isActive !== false);
        const primaryPhone =
          activePhones.find((p) => p.phoneType === "whatsapp") ||
          activePhones.find((p) => p.phoneType === "principal") ||
          activePhones[0] ||
          (Cliente?.whatsappNumber
            ? { phone: Cliente.whatsappNumber, phoneType: "whatsapp", isActive: true }
            : null);
        
        targetPhone = primaryPhone?.phone || null;
      }

      if (!targetPhone) {
        throw new Error("Não foi possível identificar um destino (telefone/ID) para este ticket");
      }
      
      // Enviar mensagem
      const active = await whatsappConfig.getActiveType();
      const result =
        active === "qr"
          ? await whatsappQr.sendQrMessage(targetPhone, message)
          : await whatsappService.sendWhatsAppMessage(targetPhone, message);
      
      if (!result.success) {
        throw new Error(result.error || "Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.");
      }
      
      // Salvar mensagem no histórico
      await db.createTicketMessage({
        ticketId,
        senderType: "atendente",
        senderId: ctx.user.id,
        message,
        isFromWhatsapp: true,
      });
      
      return { success: true };
    }),

  // Enviar mídia (por enquanto, apenas QR)
  sendMedia: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      mimeType: z.string().min(3),
      base64: z.string().min(10),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { ticketId, mimeType, base64, fileName } = input;

      const ticket = await db.getTicketById(ticketId);
      if (!ticket) throw new Error("Ticket não encontrado");

      const closedStatuses = ["atendimento_fechado", "ticket_invalido"];
      if (closedStatuses.includes(ticket.status as string)) {
        throw new Error("Ticket fechado. A conversa já está encerrada.");
      }

      if ((ctx.profileRole || ctx.user.role) === "atendente" && ticket.assignedTo !== ctx.user.id) {
        throw new Error("Acesso negado: você não tem permissão para este ticket");
      }

      // Buscar telefone: priorizar externalIdentifier
      let targetPhone: string | null = ticket.externalIdentifier || null;
      
      if (!targetPhone && ticket.clienteId) {
        const phones = await db.getclientePhones(ticket.clienteId);
        const Cliente = await db.getClienteById(ticket.clienteId);
        const activePhones = phones.filter((p) => p.isActive !== false);
        const primaryPhone =
          activePhones.find((p) => p.phoneType === "whatsapp") ||
          activePhones.find((p) => p.phoneType === "principal") ||
          activePhones[0] ||
          (Cliente?.whatsappNumber
            ? { phone: Cliente.whatsappNumber, phoneType: "whatsapp", isActive: true }
            : null);
        
        targetPhone = primaryPhone?.phone || null;
      }

      if (!targetPhone) {
        throw new Error("Não foi possível identificar um destino (telefone/ID) para este ticket");
      }

      const activeMode = await whatsappConfig.getActiveType();

      if (activeMode !== "qr" && activeMode !== "cloud_api") {
        throw new Error("Modo de integração inválido");
      }

      const result =
        activeMode === "qr"
          ? await whatsappQr.sendQrMediaBase64(targetPhone, mimeType, base64, fileName)
          : await whatsappService.sendWhatsAppMediaBase64(targetPhone, mimeType, base64, fileName || "file", fileName);

      if (!result.success) {
        throw new Error(result.error || "Falha ao enviar mídia");
      }

      await db.createTicketMessage({
        ticketId,
        senderType: "atendente",
        senderId: ctx.user.id,
        message: fileName ? `Arquivo enviado: ${fileName}` : "Arquivo enviado",
        isFromWhatsapp: true,
      });

      return { success: true };
    }),

  getCommunicationLogs: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      direction: z.enum(["inbound", "outbound"]).optional(),
    }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      
      const { whatsappCommunicationLogs } = db;
      const { eq, desc } = await import("drizzle-orm");
      
      let query = dbInstance.select().from(whatsappCommunicationLogs);
      
      if (input.direction) {
          query = query.where(eq(whatsappCommunicationLogs.direction, input.direction)) as any;
      }
      
      return await query
        .orderBy(desc(whatsappCommunicationLogs.createdAt))
        .limit(input.limit);
    }),

  clearCommunicationLogs: superAdminProcedure
    .input(z.object({
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .mutation(async ({ input }) => {
      await db.deleteWhatsappCommunicationLogsByPeriod(input.dateFrom, input.dateTo);
      return { success: true };
    }),
});



