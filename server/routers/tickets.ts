import { z } from "zod";
import { protectedProcedure, router, isAdminOrManager } from "../_core/trpc";
import { logUserAction } from "../_core/audit";
import * as db from "../db";
import * as whatsappConfig from "../whatsapp/config";
import * as whatsappQr from "../whatsapp/serviceQr";
import * as whatsappService from "../whatsapp/service";
import * as emailService from "../email/service";
import { replaceMessagePlaceholders } from "../whatsapp/placeholders";
import puppeteer from 'puppeteer';
import { generateReportHtml, getReportHeader, getReportFooter } from "../reports/ticketReport";
import { generateDeclarationHtml, DeclarationData } from "../reports/declarationReport";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export interface ReportData {
  ticket: any;
  Cliente: any;
  history: {
    main: any[];
    internal: any[];
    coordinator: any[];
  };
  metrics: {
    totalTime: string;
    departmentTimes: Record<string, string>;
  };
  departmentName?: string;
  coordinatorPhone?: string | null;
  csat?: any;
}

export const ticketsRouter = router({
  // Listar tickets com filtros e RBAC
  list: protectedProcedure
    .input(z.object({
      status: z.union([z.string(), z.array(z.string())]).optional(),
      departmentId: z.number().optional(),
      clienteId: z.number().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(200).optional(),
      onlyOpen: z.boolean().optional(),
      search: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      reasonId: z.number().optional(),
      orderByField: z.enum(['createdAt', 'closedAt', 'clienteName', 'status', 'id', 'sla']).optional(),
      orderDirection: z.enum(['asc', 'desc']).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const filters: any = { ...input };
      
      // RBAC: Atendentes veem apenas seus tickets
      if ((ctx.profileRole || ctx.user.role) === "atendente") {
        filters.assignedTo = ctx.user.id;
      }
      
      // RBAC: Gerentes veem tickets de seu departamento
      if ((ctx.profileRole || ctx.user.role) === "gerente") {
        const profile = await db.getProfileByUserId(ctx.user.id);
        if (profile?.departmentId) {
          filters.departmentId = profile.departmentId;
        }
      }
      
      return await db.getAllTickets(filters);
    }),

  listByContact: protectedProcedure
    .input(z.object({
      clienteId: z.number().optional().nullable(),
      externalIdentifier: z.string().optional().nullable(),
      externalNumber: z.string().optional().nullable(),
    }))
    .query(async ({ input }) => {
      return await db.getTicketsByContact(input);
    }),

  getAttendanceStats: protectedProcedure
    .input(z.object({
      clienteId: z.number().optional().nullable(),
      externalIdentifier: z.string().optional().nullable(),
      externalNumber: z.string().optional().nullable(),
    }))
    .query(async ({ input }) => {
      return await db.getAttendanceStatsByContact(input);
    }),

  getCsatStats: protectedProcedure
    .input(z.object({
      clienteId: z.number().optional().nullable(),
      externalIdentifier: z.string().optional().nullable(),
      externalNumber: z.string().optional().nullable(),
    }))
    .query(async ({ input }) => {
      return await db.getCsatStatsByContact(input);
    }),

  getOpenCount: protectedProcedure
    .query(async ({ ctx }) => {
      const filters: { assignedTo?: number; departmentId?: number } = {};
      const role = ctx.profileRole || ctx.user.role;
      
      // RBAC: Atendentes veem contagem de seus próprios tickets
      if (role === "atendente") {
        filters.assignedTo = ctx.user.id;
      }
      
      // RBAC: Gerentes veem contagem de seu departamento
      if (role === "gerente") {
        const profile = await db.getProfileByUserId(ctx.user.id);
        if (profile?.departmentId) {
          filters.departmentId = profile.departmentId;
        }
      }
      
      return await db.getOpenTicketsCount(filters);
    }),

  closeChat: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateTicket(input.ticketId, { status: "aguardando_resposta" });
      await db.createTicketHistory({
        ticketId: input.ticketId,
        userId: ctx.user.id,
        action: "chat_closed",
        oldValue: null,
        newValue: "aguardando_resposta",
        comment: "Chat encerrado pelo atendente",
      });
      return { success: true };
    }),

  closeTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateTicket(input.ticketId, { status: "atendimento_fechado" });
      await db.createTicketHistory({
        ticketId: input.ticketId,
        userId: ctx.user.id,
        action: "ticket_closed",
        oldValue: null,
        newValue: "atendimento_fechado",
        comment: "Ticket fechado pelo atendente",
      });

      // CSAT Trigger
      try {
        const csatRequest = await db.generateCsatRequest(input.ticketId);
        if (csatRequest?.shouldSend) {
           // Resolve Placeholders
            const { message, ticket } = csatRequest;
            const Cliente = ticket.clienteId ? await db.getClienteById(ticket.clienteId) : null;
            
            const finalMessage = replaceMessagePlaceholders(message, {
                ticket: {
                    id: ticket.id,
                    protocol: ticket.protocol,
                    externalName: ticket.externalName
                },
                Cliente
            });

            // Criar mensagem no banco
             await db.createTicketMessage({
                ticketId: input.ticketId,
                senderType: "sistema",
                senderId: null, // System ID
                message: finalMessage,
                isFromWhatsapp: false,
             });

            // Enviar WhatsApp
            let targetPhone = ticket.externalIdentifier;
            if (!targetPhone && Cliente?.whatsappNumber) {
                targetPhone = Cliente.whatsappNumber;
            }

            if (targetPhone && ticket.channel === "whatsapp") {
                 const { sendWhatsAppMessage } = await import("../whatsapp/bridge");
                 await sendWhatsAppMessage(targetPhone, finalMessage);
            }

            // --- EMAIL CSAT TRIGGER ---
            if (ticket.channel === "email" && ticket.externalIdentifier) {
                const { renderCsatEmailTemplate, sendOutboundEmail } = await import("../email/service");
                const { getClienteById, getContractById } = await import("../db");
                
                const Cliente = await getClienteById(ticket.clienteId || 0);
                const contract = await getContractById(ticket.contractId || 0);
                
                const clienteName = Cliente?.name || "Cliente";
                const contractName = contract?.name || "Geral";
                
                const html = renderCsatEmailTemplate(ticket.protocol, ticket.id, clienteName, contractName);
                
                await sendOutboundEmail({
                    ticketId: input.ticketId,
                    message: "Pesquisa de Satisfação Qualital",
                    html
                });
            }
        }
      } catch (err) {
        console.error("[CSAT] Failed to trigger survey:", err);
      }

      return { success: true };
    }),

  // Buscar ticket por ID com RBAC
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const ticket = await db.getTicketById(input.id);
      
      if (!ticket) return null;
      
      // RBAC: Verificar permissão
      if ((ctx.profileRole || ctx.user.role) === "atendente" && ticket.assignedTo !== ctx.user.id) {
        throw new Error("Acesso negado: você não tem permissão para ver este ticket");
      }
      
      if ((ctx.profileRole || ctx.user.role) === "gerente") {
        const profile = await db.getProfileByUserId(ctx.user.id);
        if (profile?.departmentId !== ticket.currentDepartmentId) {
          throw new Error("Acesso negado: este ticket não pertence ao seu departamento");
        }
      }
      
      return ticket;
    }),

  // Buscar ticket por protocolo
  getByProtocol: protectedProcedure
    .input(z.object({ protocol: z.string() }))
    .query(async ({ input }) => {
      return await db.getTicketByProtocol(input.protocol);
    }),

  // Criar novo ticket
  create: protectedProcedure
    .input(z.object({
      clienteId: z.number().optional(),
      contractId: z.number(),
      reasonId: z.number(),
      description: z.string().min(1),
      priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
      currentDepartmentId: z.number(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createTicket({
        ...input,
        openedAt: new Date(),
      });
      
      // Criar histórico de criação
      await db.createTicketHistory({
        ticketId: Number(result.id),
        userId: ctx.user.id,
        action: "ticket_created",
        newValue: "Ticket criado",
      });
      
      return result;
    }),

  // Atualizar status do ticket
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, status, comment } = input;
      
      const ticket = await db.getTicketById(id);
      if (!ticket) throw new Error("Ticket não encontrado");
      
      const oldStatus = ticket.status;
      
      const updates: any = { status };
      
      await db.updateTicket(id, updates);
      
      await db.createTicketHistory({
        ticketId: id,
        userId: ctx.user.id,
        action: "status_change",
        oldValue: oldStatus,
        newValue: status,
        comment: comment || null,
      });
      
      return { success: true };
    }),

  claimTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const ticket = await db.getTicketById(input.id);
      if (!ticket) throw new Error("Ticket não encontrado");

      await db.updateTicket(input.id, { 
        status: "em_atendimento",
        assignedTo: ctx.user.id
      });

      await db.createTicketHistory({
        ticketId: input.id,
        userId: ctx.user.id,
        action: "ticket_claimed",
        oldValue: ticket.status,
        newValue: "em_atendimento",
        comment: "Atendente puxou o ticket para si",
      });

      return { success: true };
    }),

  // Atualizar detalhes do ticket (Motivo, Prioridade)
  updateDetails: protectedProcedure
    .input(z.object({
        id: z.number(),
        reasonId: z.number().optional(),
        priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
        ticketTypeId: z.number().int().optional().nullable(),
        criticityId: z.number().int().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
        const { id, reasonId, priority, ticketTypeId, criticityId } = input;
        
        const ticket = await db.getTicketById(id);
        if (!ticket) throw new Error("Ticket não encontrado");

        const updates: any = {};
        
        if (reasonId) {
          updates.reasonId = reasonId;
          
          // Se mudou o motivo, verifica se precisa mudar o departamento
          const allReasons = await db.getAllAttendanceReasons();
          const reason = allReasons.find((r: any) => r.id === reasonId);
          if (reason) {
            if (reason.departmentId && reason.departmentId !== ticket.currentDepartmentId) {
              updates.currentDepartmentId = reason.departmentId;
            }

            // Status "Espera" (em_espera) só pode ser aplicado quando o motivo
            // pertence a um departamento diferente do departamento "Atendimento".
            //
            // Importante: não usar reason.defaultStatusSlug aqui para não quebrar
            // a máquina de estados definida para o chat.
            try {
              const depts = await db.getAllDepartments();
              const atendimentoDeptId = depts.find((d: any) => d.name?.toLowerCase?.() === "atendimento")?.id;
              const newDeptId = (updates.currentDepartmentId ?? ticket.currentDepartmentId) as number | null | undefined;

              if (atendimentoDeptId && newDeptId && newDeptId !== atendimentoDeptId) {
                updates.status = "em_espera";
              }

              // Se estava em espera mas voltou para o departamento Atendimento,
              // garantir que o status não permaneça em "em_espera".
              if (atendimentoDeptId && newDeptId === atendimentoDeptId && ticket.status === "em_espera") {
                updates.status = ticket.assignedTo ? "em_atendimento" : "aguardando_atendimento";
              }
            } catch {
              // Em caso de falha ao carregar departamentos, não arriscar uma mudança de status.
            }
          }
        }
        if (priority) updates.priority = priority;
        if (ticketTypeId !== undefined) updates.ticketTypeId = ticketTypeId;
        if (criticityId !== undefined) updates.criticityId = criticityId;

        if (Object.keys(updates).length === 0) return { success: true };

        await db.updateTicket(id, updates);

        // Histórico
        if (priority && priority !== ticket.priority) {
            await db.createTicketHistory({
                ticketId: id,
                userId: ctx.user.id,
                action: "priority_change",
                oldValue: ticket.priority,
                newValue: priority,
                comment: "Alteração de prioridade via interface",
            });
        }
        
        if (updates.status && updates.status !== ticket.status) {
          await db.createTicketHistory({
            ticketId: id,
            userId: ctx.user.id,
            action: "status_change",
            oldValue: ticket.status,
            newValue: updates.status,
            comment: "Alteração automática por mudança de motivo/departamento",
          });
        }

        return { success: true };
    }),

  updateclienteId: protectedProcedure
    .input(z.object({
        ticketId: z.number(),
        clienteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
        const { ticketId, clienteId } = input;
        
        const ticket = await db.getTicketById(ticketId);
        if (!ticket) throw new Error("Ticket não encontrado");

        const Cliente = await db.getClienteById(clienteId);
        if (!Cliente) throw new Error("Cliente não encontrado");

        // Atualizar ticket com Cliente e também o contrato se o Cliente tiver um
        const updates: any = { clienteId };
        
        if (Cliente.contractId) {
            updates.contractId = Cliente.contractId;
        }

        await db.updateTicket(ticketId, updates);

        // Vincular contato de forma persistente
        if (ticket.externalIdentifier) {
            try {
                if (ticket.channel === 'email') {
                    // Verificar se já é o e-mail principal
                    if (Cliente.email?.trim().toLowerCase() !== ticket.externalIdentifier.trim().toLowerCase()) {
                        await db.addclienteEmail({
                            clienteId,
                            email: ticket.externalIdentifier,
                            isActive: true
                        });
                    }
                } else if (ticket.channel === 'whatsapp') {
                    const normalizedTicketNumber = ticket.externalIdentifier.replace(/\D/g, "");
                    const normalizedPrimary = Cliente.whatsappNumber?.replace(/\D/g, "");
                    const normalizedSecondary = Cliente.secondaryPhone?.replace(/\D/g, "");

                    // Verificar se já é um dos números principais
                    if (normalizedTicketNumber !== normalizedPrimary && normalizedTicketNumber !== normalizedSecondary) {
                        await db.addclientePhone({
                            clienteId,
                            phone: ticket.externalIdentifier,
                            phoneType: 'whatsapp',
                            isActive: true
                        });
                    }
                }
            } catch ( संपर्कError ) {
                console.warn("[Tickets] Falha ao vincular contato persistente (ignorando):", संपर्कError);
            }
        }

        // Histórico
        await db.createTicketHistory({
            ticketId,
            userId: ctx.user.id,
            action: "Cliente_linked",
            oldValue: ticket.clienteId?.toString() || "null",
            newValue: clienteId.toString(),
            comment: `Ticket vinculado ao Cliente: ${Cliente.name}. Contato persistido.`,
        });

        return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      justification: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      for (const id of input.ids) {
        await db.updateTicket(id, {
          status: "atendimento_fechado",
          closedReason: "exclusao_em_massa"
        });
        await db.createTicketHistory({
          ticketId: id,
          userId: ctx.user.id,
          action: "ticket_deleted",
          oldValue: null,
          newValue: "atendimento_fechado",
          comment: input.justification,
        });
      }
      await logUserAction({
        ctx,
        page: "/tickets",
        action: `deleteMany count=${input.ids.length} ids=${input.ids.join(",")}`,
      }).catch(() => undefined);
      return { success: true };
    }),

  hardDeleteMany: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas Admins podem excluir definitivamente
      if (!isAdminOrManager(ctx)) {
        throw new Error("Acesso negado: Apenas administradores e gerentes podem excluir tickets definitivamente.");
      }

      for (const id of input.ids) {
        await db.deleteTicket(id);
        
        await logUserAction({
          ctx,
          page: "/tickets",
          action: `hardDelete ticketId=${id}`,
        }).catch(() => undefined);
      }
      return { success: true };
    }),

  // Atribuir ticket a um atendente
  assign: protectedProcedure
    .input(z.object({
      id: z.number(),
      assignedTo: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, assignedTo, comment } = input;
      
      // Apenas gerentes e admins podem atribuir
      if ((ctx.profileRole || ctx.user.role) === "atendente") {
        throw new Error("Acesso negado: apenas gerentes e administradores podem atribuir tickets");
      }
      
      const ticket = await db.getTicketById(id);
      if (!ticket) throw new Error("Ticket não encontrado");
      
      await db.updateTicket(id, { assignedTo });
      
      await db.createTicketHistory({
        ticketId: id,
        userId: ctx.user.id,
        action: "reassign",
        oldValue: ticket.assignedTo?.toString() || "não atribuído",
        newValue: assignedTo.toString(),
        comment: comment || null,
      });
      
      return { success: true };
    }),

  // Remanejar ticket para outro departamento
  transfer: protectedProcedure
    .input(z.object({
      id: z.number(),
      departmentId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, departmentId, comment } = input;
      
      // Apenas gerentes e admins podem remanejar
      if ((ctx.profileRole || ctx.user.role) === "atendente") {
        throw new Error("Acesso negado: apenas gerentes e administradores podem remanejar tickets");
      }
      
      const ticket = await db.getTicketById(id);
      if (!ticket) throw new Error("Ticket não encontrado");
      
      await db.updateTicket(id, { 
        currentDepartmentId: departmentId,
        assignedTo: null, // Remove atribuição ao remanejar
      });
      
      await db.createTicketHistory({
        ticketId: id,
        userId: ctx.user.id,
        action: "department_change",
        oldValue: ticket.currentDepartmentId.toString(),
        newValue: departmentId.toString(),
        comment: comment || null,
      });
      
    return { success: true };
    }),

  reopenTicket: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      justification: z.string().min(5, "A justificativa deve ter pelo menos 5 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validation: Only SuperAdmin can reopen
      if ((ctx.profileRole || ctx.user.role) !== "SuperAdmin") {
         throw new Error("Acesso negado: Apenas SuperAdmin pode reabrir tickets.");
      }

      const ticket = await db.getTicketById(input.ticketId);
      if (!ticket) throw new Error("Ticket não encontrado");

      // Action: Update status to 'aguardando_atendimento'
      await db.updateTicket(input.ticketId, {
        status: "aguardando_atendimento",
        closedAt: null,
        closedReason: null
      });

      // History: Log the action
      await db.createTicketHistory({
        ticketId: input.ticketId,
        userId: ctx.user.id,
        action: "status_change",
        oldValue: "atendimento_fechado",
        newValue: "aguardando_atendimento",
        comment: `Ticket reaberto por SuperAdmin. Justificativa: ${input.justification}`
      });

      // System Message
      await db.createTicketMessage({
        ticketId: input.ticketId,
        senderType: "sistema",
        senderId: null,
        message: `🔄 Ticket REABERTO pelo SuperAdmin.\nJustificativa: ${input.justification}`,
        isFromWhatsapp: false,
      });

      return { success: true };
    }),

  // Mensagens do ticket
  messages: router({
    list: protectedProcedure
      .input(z.object({ 
        ticketId: z.number(),
        recipientclienteId: z.number().nullable().optional()
      }))
      .query(async ({ input }) => {
        return await db.getTicketMessages(input.ticketId, input.recipientclienteId);
      }),

    create: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        message: z.string().min(1),
        mediaUrl: z.string().optional(),
        recipientclienteId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ticket = await db.getTicketById(input.ticketId);
        if (!ticket) throw new Error("Ticket não encontrado");

        // Prevent sending messages if ticket is closed
        if (ticket.status === "atendimento_fechado") {
            const msg = `[Tickets] Bloqueando envio para ticket fechado #${ticket.id} (${ticket.protocol})`;
            console.warn(msg);
            throw new Error("Ticket fechado. Não é possível enviar mensagens.");
        }


        let mediaUrlForDb = input.mediaUrl;
        
        // Se for base64, fazer upload para o storage antes de salvar no banco
        if (input.mediaUrl && input.mediaUrl.startsWith("data:")) {
           try {
             // Extrair metadados básico
             const matches = input.mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
             if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
                const filename = `whatsapp_sent/${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
                
                const uploaded = await storagePut(filename, buffer, mimeType);
                mediaUrlForDb = uploaded.url;
             }
           } catch (err) {
             console.error("[Tickets-DEBUG] Erro ao fazer upload de media base64 no envio", err);
           }
        }



        // Process placeholders
        const department = await db.getDepartmentById(ticket.currentDepartmentId);
        const contract = await db.getContractById(ticket.contractId);
        const Cliente = ticket.clienteId ? await db.getClienteById(ticket.clienteId) : null;
        
        const finalMessage = replaceMessagePlaceholders(input.message, {
          ticket: {
             id: ticket.id,
             protocol: ticket.protocol,
             externalName: ticket.externalName
          },
          Cliente: Cliente,
          attendantName: ctx.user.name || "Atendente",
          departmentName: department?.name,
          contractName: contract?.name
        });

        const id = await db.createTicketMessage({
          ticketId: input.ticketId,
          senderType: "atendente",
          senderId: ctx.user.id,
          recipientclienteId: input.recipientclienteId || null,
          message: finalMessage,
          mediaUrl: mediaUrlForDb || null,
          isFromWhatsapp: false,
        });

        // Enviar a mesma mensagem para o WhatsApp
        let targetPhone: string | null = null;

        // Se tiver um destinatário específico (Coordenador), buscar o telefone dele
        if (input.recipientclienteId) {
          try {
            const Cliente = await db.getClienteById(input.recipientclienteId);
            if (Cliente?.whatsappNumber) {
              targetPhone = Cliente.whatsappNumber;
            } else {
              const phones = await db.getclientePhones(input.recipientclienteId);
              const activePhones = phones.filter((p) => p.isActive !== false);
              const primaryPhone =
                activePhones.find((p) => p.phoneType === "whatsapp") ||
                activePhones.find((p) => p.phoneType === "principal") ||
                activePhones[0];
              targetPhone = primaryPhone?.phone || null;
            }
          } catch (err) {
            console.warn("[Tickets] Erro ao buscar telefone do destinatário específico", err);
          }
        } else {
          // Caso contrário, usa o contato principal do ticket
          targetPhone = ticket.externalIdentifier || null;

          if (!targetPhone && ticket.clienteId) {
            try {
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
            } catch (err) {
              console.warn("[Tickets] Erro ao buscar telefone do Cliente", err);
            }
          }
        }

        if (targetPhone) {
          try {
            const activeMode = await whatsappConfig.getActiveType();
            
            let result;
            if (input.mediaUrl) {
              const whatsappBridge = await import("../whatsapp/bridge");
              // Se for data URI, extrair base64 e mimetype
              let mimeType = "audio/ogg"; 
              let base64Data = "";
              let fileName = "audio.ogg";

              if (input.mediaUrl.startsWith("data:")) {
                const parts = input.mediaUrl.split(",");
                mimeType = parts[0].split(":")[1].split(";")[0];
                base64Data = parts[1];
                fileName = `audio_${Date.now()}.${mimeType.split("/")[1] || "ogg"}`;
                
                result = await whatsappBridge.sendWhatsAppMedia(
                  targetPhone,
                  mimeType,
                  base64Data,
                  fileName,
                  finalMessage === "[Áudio]" ? undefined : finalMessage
                );
              } else {
                result = activeMode === "qr"
                  ? await whatsappQr.sendQrMessage(targetPhone, finalMessage)
                  : await whatsappService.sendWhatsAppMessage(targetPhone, finalMessage);
              }
            } else {
              result = activeMode === "qr"
                ? await whatsappQr.sendQrMessage(targetPhone, finalMessage)
                : await whatsappService.sendWhatsAppMessage(targetPhone, finalMessage);
            }

            if (!result.success) {
              console.warn("[Tickets] Falha ao refletir mensagem no WhatsApp", result.error);
            }
          } catch (err) {
            console.warn("[Tickets] Erro ao enviar mensagem para WhatsApp", err);
          }
        }

        // Se o canal for e-mail, enviar também via e-mail
        if (ticket.channel === "email") {
          try {
            const emailAttachments: any[] = [];
            
            if (mediaUrlForDb) {
               const filename = mediaUrlForDb.split('/').pop() || 'anexo';
               
               // Verificar se é path local (/uploads/...)
               if (mediaUrlForDb.startsWith('/uploads')) {
                  const path = await import('path');
                  const fs = await import('fs');
                  const absolutePath = path.join(process.cwd(), mediaUrlForDb);
                  
                  if (fs.existsSync(absolutePath)) {
                      emailAttachments.push({
                          filename,
                          path: absolutePath
                      });
                  } else {
                     emailAttachments.push({
                         filename,
                         path: mediaUrlForDb
                     });
                  }
               } else {
                   // URL remota
                   emailAttachments.push({
                       filename,
                       path: mediaUrlForDb
                   });
               }
            }

            const result = await emailService.sendOutboundEmail({
              ticketId: input.ticketId,
              message: finalMessage,
              attachments: emailAttachments
            });
            if (!result.success) {
              console.warn("[Tickets] Falha ao enviar resposta via E-mail", result.error);
            }
          } catch (err) {
            console.warn("[Tickets] Erro ao enviar resposta via E-mail", err);
          }
        }
        
        return { id };
      }),

  }),

  // Histórico do ticket
  history: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTicketHistory(input.ticketId);
      }),
  }),

  // Controle de tempo
  timeTracking: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTicketTimeTracking(input.ticketId);
      }),

    start: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        departmentId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.startTimeTracking({
          ticketId: input.ticketId,
          departmentId: input.departmentId,
          userId: ctx.user.id,
        });
        
        return { id };
      }),

    pause: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.pauseTimeTracking(input.id);
        return { success: true };
      }),

    resume: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.resumeTimeTracking(input.id);
        return { success: true };
      }),

    finish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.finishTimeTracking(input.id);
        return { success: true };
      }),
  }),

  // Endpoint para dados do relatório
  getReportData: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      const ticket = await db.getTicketById(input.ticketId);
      if (!ticket) throw new Error("Ticket não encontrado");

      const Cliente = ticket.clienteId ? await db.getClienteById(ticket.clienteId) : null;
      
      const contract = await db.getContractById(ticket.contractId);
      const coordinatorId = contract?.coordinatorclienteId;

      const [mainMessages, internalConversations, coordinatorMessages] = await Promise.all([
        db.getTicketMessages(input.ticketId, null),
        db.getInternalConversationsByTicketId(input.ticketId), 
        coordinatorId ? db.getTicketMessages(input.ticketId, coordinatorId) : []
      ]);

      // Buscar mensagens internas
      let internalMessages: any[] = [];
      if (internalConversations.length > 0) {
        for (const conv of internalConversations) {
           const msgs = await db.getInternalMessagesByConversationId(conv.id);
           internalMessages = [...internalMessages, ...msgs];
        }
        internalMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }

      // Coletar IDs de atendentes participantes
      const participantIds = new Set<number>();
      if (ticket.assignedTo) participantIds.add(ticket.assignedTo);
      
      const processMessages = (msgs: any[]) => {
         msgs.forEach(m => {
            if ((m.senderType === 'atendente' || m.senderType === 'user') && m.senderId) {
               participantIds.add(m.senderId);
            }
         });
      };
      
      processMessages(mainMessages);
      processMessages(coordinatorMessages);
      // internalMessages já tem senderId dos atendentes
      internalMessages.forEach(m => { if (m.senderId) participantIds.add(m.senderId); });

       // Buscar nomes dos usuários
       const usersMap = new Map<number, string>();
       for (const id of Array.from(participantIds)) {
          const u = await db.getUserById(id);
          if (u) usersMap.set(id, u.name || "");
       }

      // Enriquecer mensagens com nomes
      const formatMessages = (msgs: any[], isCoordinatorChat = false) => msgs.map((m: any) => {
         let senderName = "Sistema";
         if (m.senderType === 'Cliente') {
            senderName = isCoordinatorChat 
               ? (contract?.coordinatorName || "Coordenador") 
               : (Cliente?.name || ticket.externalName || "Cliente");
         } else if (m.senderType === 'atendente' || m.senderType === 'user') {
            senderName = usersMap.get(m.senderId) || "Atendente";
         }
         return { ...m, senderName };
      });

      const participatingAttendants = Array.from(usersMap.values()).join(", ");

      // Cálculo SLA simples
      const opened = new Date(ticket.openedAt);
      const closed = ticket.closedAt ? new Date(ticket.closedAt) : new Date();
      const diffMs = closed.getTime() - opened.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const totalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      

      
      const department = ticket.currentDepartmentId ? await db.getDepartmentById(ticket.currentDepartmentId) : null;
      
      let coordinator = null;
      if (contract?.coordinatorclienteId) {
        coordinator = await db.getClienteById(contract.coordinatorclienteId);
      }

      return {
        ticket: {
          ...ticket,
          channel: ticket.channel || 'interno',
          assignedToName: ticket.assignedTo ? (usersMap.get(ticket.assignedTo) || (await db.getUserById(ticket.assignedTo))?.name) : null,
          reasonName: ticket.reasonId ? (await db.getAttendanceReasonById(ticket.reasonId))?.name : null,
          participatingAttendants: participatingAttendants || "Nenhum"
        },
        Cliente: Cliente ? {
           ...Cliente,
           contractName: contract?.name,
           coordinatorName: contract?.coordinatorName
        } : null,
        history: {
          main: formatMessages(mainMessages, false),
          internal: internalMessages,
          coordinator: formatMessages(coordinatorMessages, true)
        },
        metrics: {
          totalTime,
          departmentTimes: { "Geral": totalTime } // Placeholder
        },
        departmentName: department?.name,
        coordinatorPhone: coordinator?.whatsappNumber || coordinator?.secondaryPhone || null,
        csat: await db.getCsatByTicketId(input.ticketId)
      };
    }),

  // Endpoint para PDF
  generateReportPdf: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input, ctx }) => {
       const routerCaller = ticketsRouter.createCaller(ctx);
       const data = await routerCaller.getReportData({ ticketId: input.ticketId });
       
        const html = generateReportHtml(data);
        const header = getReportHeader(data);
        const footer = getReportFooter();
        
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ 
          format: 'A4', 
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: header,
          footerTemplate: footer,
          margin: { top: '180px', bottom: '60px' }
        });
        await browser.close();

       return { pdfBase64: Buffer.from(pdfBuffer).toString('base64') };
    }),

  // Endpoint para Email
  emailReport: protectedProcedure
    .input(z.object({ ticketId: z.number(), email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
       const routerCaller = ticketsRouter.createCaller(ctx);
       const data = await routerCaller.getReportData({ ticketId: input.ticketId });
       
        const html = generateReportHtml(data);
        const header = getReportHeader(data);
        const footer = getReportFooter();
        
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ 
          format: 'A4', 
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: header,
          footerTemplate: footer,
          margin: { top: '180px', bottom: '60px' }
        });
        await browser.close();

       const ticketDate = new Date(data.ticket.openedAt);
       const dateStr = ticketDate.toLocaleDateString('pt-BR');
       const timeStr = ticketDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

       const emailBody = `
         Olá,<br><br>
         Estamos encaminhando o histórico do <strong>TICKET #${data.ticket.protocol}</strong> referente ao atendimento iniciado em <strong>${dateStr}</strong> às <strong>${timeStr}</strong>.<br><br>
         O relatório completo segue em anexo em formato PDF.
       `;

       const htmlContent = emailService.renderEmailTemplate(emailBody);

       await emailService.sendEmail({
         to: input.email,
         subject: `Relatório de Atendimento - Ticket #${data.ticket.protocol}`,
         html: htmlContent,
         attachments: [
           {
             filename: `Relatorio_Ticket_${data.ticket.protocol}.pdf`,
             content: Buffer.from(pdfBuffer)
           }
         ]
       });

       return { success: true };
    }),

  whatsappReport: protectedProcedure
    .input(z.object({ ticketId: z.number(), phone: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const routerCaller = ticketsRouter.createCaller(ctx);
      const data = await routerCaller.getReportData({ ticketId: input.ticketId });
      const html = generateReportHtml(data);
      const header = getReportHeader(data);
      const footer = getReportFooter();

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: header,
        footerTemplate: footer,
        margin: { top: '180px', bottom: '60px' }
      });
      await browser.close();

      const openedAtDate = new Date(data.ticket.openedAt);
      const dateStr = openedAtDate.toLocaleDateString('pt-BR');
      const timeStr = openedAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const whatsappMessage = `Olá, o atendimento da Qualital está encaminhando o histórico do TICKET #${data.ticket.protocol} referente ao atendimento iniciado em ${dateStr} às ${timeStr}.`;

      const whatsappBridge = await import("../whatsapp/bridge");
      const result = await whatsappBridge.sendWhatsAppMedia(
        input.phone,
        "application/pdf",
        Buffer.from(pdfBuffer).toString('base64'),
        `Relatorio_Ticket_${data.ticket.protocol}.pdf`,
        whatsappMessage
      );

      if (!result.success) {
        throw new Error(result.error || "Falha ao enviar relatório via WhatsApp");
      }

      return { success: true };
    }),

  generateDeclarationPdf: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input }) => {
      const ticket = await db.getTicketById(input.ticketId);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket não encontrado" });

      if (!ticket.clienteId) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED", 
          message: "Declaração não pode ser feita para pessoas que não são cooperadas" 
        });
      }

      const Cliente = await db.getClienteById(ticket.clienteId);
      if (!Cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

      // Buscar o contrato associado ao ticket para obter o município
      let municipio = "Monte Alegre";
      let uf = "RN";

      if (ticket.contractId) {
        const contract = await db.getContractById(ticket.contractId);
        if (contract && contract.city) {
          municipio = contract.city;
          uf = contract.state || "RN";
        }
      } else if (Cliente.contractId) {
        // Fallback para o contrato do Cliente se o ticket não tiver um contrato específico
        const contract = await db.getContractById(Cliente.contractId);
        if (contract && contract.city) {
          municipio = contract.city;
          uf = contract.state || "RN";
        }
      }

      const declData: DeclarationData = {
        nome: Cliente.name,
        cpf: Cliente.document, // O CPF é document no banco
        cargo: Cliente.position || "Cliente",
        dataAdmissao: Cliente.admissionDate,
        dataAssociacao: Cliente.associationDate,
        dataDesligamento: Cliente.terminationDate || null,
        status: Cliente.status,
        municipio,
        uf
      };

      const html = generateDeclarationHtml(declData);

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      });
      await browser.close();

      return { pdfBase64: Buffer.from(pdfBuffer).toString('base64') };
    }),

  sendDeclaration: protectedProcedure
    .input(z.object({ 
      ticketId: z.number(), 
      pdfBase64: z.string(),
      channel: z.enum(["whatsapp", "email"])
    }))
    .mutation(async ({ input, ctx }) => {
      const ticket = await db.getTicketById(input.ticketId);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket não encontrado" });

      const fileName = `Declaracao_Qualital_${input.ticketId}.pdf`;

      if (input.channel === "whatsapp") {
        const targetPhone = ticket.externalNumber;
        if (!targetPhone) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telefone não encontrado no ticket" });

        const whatsappBridge = await import("../whatsapp/bridge");
        const msgText = "Olá, segue anexo sua Declaração da Qualital.";
        const result = await whatsappBridge.sendWhatsAppMedia(
          targetPhone,
          "application/pdf",
          input.pdfBase64,
          fileName,
          msgText
        );

        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Falha ao enviar via WhatsApp" });
        }

        // Registrar mensagem no chat
        await db.createTicketMessage({
          ticketId: input.ticketId,
          senderType: 'atendente',
          senderId: ctx.user.id,
          message: msgText,
          whatsappMessageId: result.messageId,
          isFromWhatsapp: false
        });
      } else {
        const targetEmail = ticket.externalIdentifier; // Geralmente o email se o canal é email
        if (!targetEmail || !targetEmail.includes("@")) {
           throw new TRPCError({ code: "PRECONDITION_FAILED", message: "E-mail não encontrado no ticket" });
        }

        const emailBody = `Olá,<br><br>Conforme solicitado, estamos enviando sua <strong>Declaração da Qualital</strong> em anexo no formato PDF.`;
        const htmlContent = emailService.renderEmailTemplate(emailBody);

        await emailService.sendEmail({
          to: targetEmail,
          subject: `Declaração Qualital`,
          html: htmlContent,
          attachments: [
            {
              filename: fileName,
              content: Buffer.from(input.pdfBase64, 'base64')
            }
          ]
        });

        // Registrar mensagem no chat
        await db.createTicketMessage({
          ticketId: input.ticketId,
          senderType: 'atendente',
          senderId: ctx.user.id,
          message: emailBody.replace(/<[^>]*>/g, ''), // Remove HTML tags for plain text history
        });
      }

      await db.createTicketHistory({
        ticketId: input.ticketId,
        userId: ctx.user.id,
        action: "message_sent",
        comment: `Declaração enviada via ${input.channel.toUpperCase()}`,
      });

      return { success: true };
    }),

});



