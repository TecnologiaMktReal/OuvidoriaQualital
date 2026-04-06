import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { contracts, clientes, tickets, ticketMessages, reasons as attendanceReasons, departments } from "../db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";

// Definição do contrato padrão para tickets públicos
const DEFAULT_CONTRACT_NAME = "Geral";

export const publicRouter = router({
  createTicket: publicProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().email("E-mail inválido").optional().or(z.literal("")),
      cpf: z.string().optional(),
      phone: z.string().optional(),
      isAnonymous: z.boolean().default(false),
      reasonId: z.number(),
      description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
      attachments: z.array(z.string()).optional(), // Base64 strings
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verificar/Criar Contrato Geral
      let contract = await db.getDb().then(async (client) => {
        if (!client) throw new Error("Database unavailable");
        const existing = await client.select().from(contracts).where(eq(contracts.name, DEFAULT_CONTRACT_NAME)).limit(1);
        if (existing.length > 0) return existing[0];
        
        // Se não existir, criar
        const result = await client.insert(contracts).values({
            name: DEFAULT_CONTRACT_NAME,
            city: "Sede",
            state: "PB",
            status: "ativo",
            validityDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
            isSpecial: true,
        });
        return { id: result[0].insertId };
      });

      if (!contract) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao vincular contrato." });

      // 2. Identificação do Cliente/Usuário
      let clienteId: number | null = null;
      let externalName = "Anônimo";
      let externalIdentifier = "";

      if (!input.isAnonymous) {
        externalName = input.name || "Sem Nome";
        externalIdentifier = input.email || input.phone || "";

        if (input.cpf) {
            // Tentar encontrar Cliente pelo CPF (document)
            const dbClient = await db.getDb();
            if (dbClient) {
                const existingCliente = await dbClient.select().from(clientes).where(eq(clientes.document, input.cpf)).limit(1);
                
                if (existingCliente.length > 0) {
                    clienteId = existingCliente[0].id;
                } else {
                    // Criar registro de Não-Cliente
                    const result = await dbClient.insert(clientes).values({
                        name: input.name || "Não Informado",
                        document: input.cpf,
                        email: input.email || null,
                        whatsappNumber: input.phone || null,
                        isCliente: false, // Importante: flag para indicar que não é Cliente
                        status: "ativo",
                    });
                    clienteId = result[0].insertId;
                }
            }
        }
      }

      // 3. Criar Ticket
      
      const dbClient = await db.getDb();
      if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar motivo para saber departamento
      const reasonsList = await dbClient.select().from(attendanceReasons).where(eq(attendanceReasons.id, input.reasonId)).limit(1);
      const reason = reasonsList[0];

      if (!reason) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "Motivo inválido" });
      }

      let targetDepartmentId = reason.departmentId;
      if (!targetDepartmentId) {
          // Tentar encontrar departamento "Ouvidoria"
          const ouvidoriaDept = await dbClient.select().from(departments).where(eq(departments.name, "Ouvidoria")).limit(1);
          targetDepartmentId = ouvidoriaDept[0]?.id;
      }
      
      if (!targetDepartmentId) {
          // Fallback final: pega qualquer departamento que exista
          const fallbackDept = await dbClient.select({ id: departments.id }).from(departments).limit(1);
          if (fallbackDept.length > 0) {
              targetDepartmentId = fallbackDept[0].id;
          } else {
              // Se nem isso existir, temos que preencher ou estourar erro
              // Mas idealmente o dbClient tem que ter ao menos o `Atendimento` que já foi auto-criado.
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Nenhum departamento cadastrado para acolher o ticket." });
          }
      }
      
      const payload = {
          clienteId: clienteId || undefined, // undefined faz o banco usar null ou o que? O campo é optional no drizzle insert helper se for null?
          // O tipo InsertTicket diz clienteId?: number | null.
          contractId: contract.id,
          reasonId: input.reasonId,
          description: input.description,
          priority: "media" as "media",
          currentDepartmentId: targetDepartmentId,
          status: "aguardando_atendimento" as const,
          channel: "interno" as const, // ou "web_form"? schema supports 'interno'
          externalName: externalName,
          externalIdentifier: externalIdentifier,
          openedAt: new Date(),
      };
      
      const newTicket = await db.createTicket(payload);

      // Adicionar a descrição como primeira mensagem do ticket
      await db.createTicketMessage({
          ticketId: Number(newTicket.id),
          senderType: input.isAnonymous ? "sistema" : "Cliente",
          senderId: clienteId || null,
          message: input.description,
          isFromWhatsapp: false
      });

      // 4. Salvar anexos
      if (input.attachments && input.attachments.length > 0) {
        for (const attachment of input.attachments) {
             // Processar base64 e salvar
             // Reutilizar lógica de upload do tickets.ts ou criar helper
             // Por simplificação, vamos salvar como mensagem do sistema/usuário
             
             let mediaUrl = attachment;
             if (attachment.startsWith("data:")) {
                 try {
                     const matches = attachment.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                     if (matches && matches.length === 3) {
                         const mimeType = matches[1];
                         const base64Data = matches[2];
                         const buffer = Buffer.from(base64Data, 'base64');
                         const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
                         const filename = `public_uploads/${newTicket.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
                         
                         const uploaded = await storagePut(filename, buffer, mimeType);
                         mediaUrl = uploaded.url;
                     }
                 } catch (e) {
                     console.error("Erro upload anexo", e);
                     continue;
                 }
             }

             await db.createTicketMessage({
                 ticketId: Number(newTicket.id),
                 senderType: input.isAnonymous ? "sistema" : "Cliente", // Se identificado, põe como Cliente? Ou sistema dizendo que foi anexo?
                 // Se isCliente=false (criado agora), ele é um Cliente no banco.
                 // Mas se anonimo, senderType sistema.
                 senderId: clienteId || null,
                 message: "Anexo enviado via formulário público",
                 mediaUrl: mediaUrl,
                 isFromWhatsapp: false
             });
        }
      }

      return { success: true, protocol: newTicket.protocol, id: newTicket.id };
    }),
    
    getReasons: publicProcedure.query(async () => {
        const dbClient = await db.getDb();
        if (!dbClient) return [];
        // Retornar apenas motivos ativos e "públicos" (se houver flag, senão todos ativos)
        return await dbClient.select().from(db.reasons).where(eq(db.reasons.isActive, true));
    })
});



