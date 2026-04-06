import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { processes, tickets, clientes, contracts } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const processesRouter = router({
  // Lista todos os processos ativos para o Kanban
  listBoard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const list = await db
      .select({
        id: processes.id,
        stage: processes.stage,
        isAnonymous: processes.isAnonymous,
        clienteName: processes.clienteName,
        ClienteCpf: processes.ClienteCpf,
        reason: processes.reason,
        createdAt: processes.createdAt,
        sourceTicketId: processes.sourceTicketId,
        sourceTicketProtocol: tickets.protocol,
      })
      .from(processes)
      .leftJoin(tickets, eq(processes.sourceTicketId, tickets.id))
      .orderBy(desc(processes.updatedAt));

    return list;
  }),

  // Pega detalhes de um único processo
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [process] = await db
        .select()
        .from(processes)
        .where(eq(processes.id, input.id))
        .limit(1);
      
      if (!process) throw new Error("Processo não encontrado");
      
      return process;
    }),

  // Atualiza uma etapa do Kanban (Drag and Drop)
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        stage: z.enum([
          "Analise da Ouvidoria",
          "Solicitação de Informações",
          "Conselho Administrativo",
          "Resultado do Processo",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(processes)
        .set({ stage: input.stage, updatedAt: new Date() })
        .where(eq(processes.id, input.id));
        
      return { success: true };
    }),

  // Cria processo do zero
  createManual: protectedProcedure
    .input(z.object({
      isAnonymous: z.boolean().default(false),
      clienteName: z.string().optional(),
      ClienteCpf: z.string().optional(),
      contractId: z.number().optional(),
      clientePhone: z.string().optional(),
      clienteEmail: z.string().email().optional().or(z.literal("")),
      reason: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(processes).values({
        isAnonymous: input.isAnonymous,
        clienteName: input.clienteName || "Anônimo",
        ClienteCpf: input.ClienteCpf,
        contractId: input.contractId,
        clientePhone: input.clientePhone,
        clienteEmail: input.clienteEmail || undefined,
        reason: input.reason,
        description: input.description,
        stage: "Analise da Ouvidoria",
      });
      return { id: result.insertId };
    }),

  // Atualiza análises
  updateFields: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ouvidorAnalysis: z.string().optional(),
        councilAnalysis: z.string().optional(),
        finalAnalysis: z.string().optional(),
        appliedSolution: z.string().optional(),
        closedAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(processes)
        .set({
          ouvidorAnalysis: input.ouvidorAnalysis,
          councilAnalysis: input.councilAnalysis,
          finalAnalysis: input.finalAnalysis,
          appliedSolution: input.appliedSolution,
          closedAt: input.closedAt ? new Date(input.closedAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(processes.id, input.id));
      
      return { success: true };
    }),

  // Cria processo a partir de um ticket
  createFromTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, input.ticketId)).limit(1);
      if (!ticket) throw new Error("Ticket não encontrado");

      let ClienteInfo: any = null;
      if (ticket.clienteId) {
         const [coop] = await db.select().from(clientes).where(eq(clientes.id, ticket.clienteId)).limit(1);
         ClienteInfo = coop;
      }

      const [result] = await db.insert(processes).values({
        sourceTicketId: ticket.id,
        clienteName: ClienteInfo?.fullName || ticket.externalName || "Não Informado",
        ClienteCpf: ClienteInfo?.document || undefined,
        contractId: undefined, // Would need to fetch contract 
        clienteEmail: ClienteInfo?.email || undefined,
        reason: "Originado de Ticket",
        description: `Processo aberto a partir do ticket #${ticket.protocol}`,
        stage: "Analise da Ouvidoria",
      });

      return { id: result.insertId };
    }),
});



