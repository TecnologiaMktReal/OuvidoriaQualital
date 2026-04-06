import { z } from "zod";
import Papa from "papaparse";
import { eq } from "drizzle-orm";
import { protectedProcedure, router, requireAdminOrManager } from "../_core/trpc";
import * as db from "../db";
import { normalizeText } from "../../shared/textUtils";

export const contractsRouter = router({
  // Listar todos os contratos com filtros
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["ativo", "inativo"]).optional(),
      clienteId: z.number().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getAllContracts(input);
    }),

  // Buscar contrato por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getContractById(input.id);
    }),

  // Buscar contrato especial "NÃO Cliente"
  getSpecial: protectedProcedure
    .query(async () => {
      return await db.getSpecialContract();
    }),

  // Criar novo contrato
  create: protectedProcedure
    .input(z.object({
      clienteId: z.number().optional(),
      coordinatorclienteId: z.number().nullable().optional(),
      name: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      status: z.enum(["ativo", "inativo"]).default("ativo"),
      validityDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      const id = await db.createContract({
        ...input,
        name: normalizeText(input.name),
        city: normalizeText(input.city),
        state: normalizeText(input.state),
        validityDate: input.validityDate || null,
        coordinatorclienteId: input.coordinatorclienteId ?? null,
        isSpecial: false,
      });
      return { id };
    }),

  // Atualizar contrato
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      state: z.string().length(2).optional(),
      status: z.enum(["ativo", "inativo"]).optional(),
      validityDate: z.string().optional(),
      clienteId: z.number().optional(),
      coordinatorclienteId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      const { id, ...data } = input;
      const normalizedData = {
        ...data,
        ...(data.name && { name: normalizeText(data.name) }),
        ...(data.city && { city: normalizeText(data.city) }),
        ...(data.state && { state: normalizeText(data.state) }),
        // Garantir que validityDate seja null se não fornecido
        ...(data.validityDate !== undefined && { validityDate: data.validityDate || null }),
        ...(data.coordinatorclienteId !== undefined && { coordinatorclienteId: data.coordinatorclienteId }),
      };
      await db.updateContract(id, normalizedData);
      return { success: true };
    }),

  // Excluir contrato permanentemente
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      await db.deleteContract(input.id);
      return { success: true };
    }),

  // Gerar Modelo CSV para Importação
  generateImportModel: protectedProcedure
    .query(async () => {
      const headers = [
        "Nome*", 
        "Cidade*", 
        "Estado (UF)*", 
        "Status (ativo | inativo)", 
        "Data Validade (DD/MM/AAAA)",
        "Coordenador (Nome ou Matricula)"
      ];
      
      const exampleRow = [
        "Contrato Exemplo", 
        "São Paulo", 
        "SP", 
        "ativo", 
        "31/12/2025", 
        "Nome do Coordenador"
      ];

      const csv = Papa.unparse({
        fields: headers,
        data: [exampleRow]
      }, {
        delimiter: ";", 
        quotes: true 
      });

      return csv;
    }),

  // Pré-visualizar Importação (Validar CSV)
  previewImport: protectedProcedure
    .input(z.object({
      csvContent: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);

      const { data, errors } = Papa.parse(input.csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
      });

      if (errors.length > 0 && data.length === 0) {
        throw new Error("Erro ao ler CSV: " + errors[0].message);
      }

      const dbClient = await db.getDb();
      if (!dbClient) throw new Error("Database not available");

      // Buscar todos os contratos para verificar duplicidade por Nome
      const allContracts = await dbClient.select({
        id: db.contracts.id,
        name: db.contracts.name
      }).from(db.contracts);

      // Buscar todos os clientes para mapear Coordenador
      const allClientes = await dbClient.select({
        id: db.clientes.id,
        name: db.clientes.name,
        registrationNumber: db.clientes.registrationNumber
      }).from(db.clientes).where(eq(db.clientes.isCliente, true));

      const contractMap = new Map<string, typeof allContracts[0]>();
      allContracts.forEach(c => {
        if (c.name) {
          contractMap.set(normalizeText(c.name).toLowerCase(), c);
        }
      });

      const ClienteMap = new Map<string, number>(); // Nome/Matricula -> ID
      allClientes.forEach(c => {
        if (c.name) ClienteMap.set(normalizeText(c.name).toLowerCase(), c.id);
        if (c.registrationNumber) ClienteMap.set(String(c.registrationNumber), c.id);
      });

      const previewResults: any[] = [];
      let summary = { new: 0, update: 0, error: 0 };

      // Processar cada linha
      for (const row of data as any[]) {
        const nome = row["Nome*"];
        const cidade = row["Cidade*"];
        const uf = row["Estado (UF)*"];
        const coordRaw = row["Coordenador (Nome ou Matricula)"];

        const errors: string[] = [];

        // Validações Obrigatórias
        if (!nome) errors.push("Nome é obrigatório");
        if (!cidade) errors.push("Cidade é obrigatória");
        if (!uf) errors.push("Estado (UF) é obrigatório");

        let operation = "new";
        let existingId = undefined;
        let originalName = undefined;

        if (nome) {
          const existing = contractMap.get(normalizeText(nome).toLowerCase());
          if (existing) {
            operation = "update";
            existingId = existing.id;
            originalName = existing.name;
          }
        }

        let coordinatorId: number | null = null;
        if (coordRaw) {
             const normalizedInput = normalizeText(coordRaw).toLowerCase();
             coordinatorId = ClienteMap.get(normalizedInput) || null;
             
             if (!coordinatorId && /^\d+$/.test(coordRaw)) {
                  coordinatorId = ClienteMap.get(String(parseInt(coordRaw, 10))) || null;
             }

             if (!coordinatorId) {
                 errors.push(`Coordenador "${coordRaw}" não encontrado`);
             }
        }

        if (errors.length > 0) {
          operation = "error";
          summary.error++;
        } else if (operation === "new") {
          summary.new++;
        } else {
          summary.update++;
        }

        previewResults.push({
          status: operation,
          errors: errors,
          originalName: originalName,
          data: {
            name: nome,
            city: cidade,
            state: uf,
            status: row["Status (ativo | inativo)"] || "ativo",
            validityDate: row["Data Validade (DD/MM/AAAA)"],
            coordinatorclienteId: coordinatorId,
            coordinatorName: coordRaw, // Para exibir no preview se quiser
            id: existingId // Se update
          }
        });
      }

      return {
        summary,
        rows: previewResults
      };
    }),

  // Processar Importação Confirmada
  processImport: protectedProcedure
    .input(z.object({
      rows: z.array(z.any())
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      
      const results = {
        success: 0,
        failed: 0,
        details: [] as any[]
      };

      for (const item of input.rows) {
        if (item.status === 'error') {
          results.failed++;
          results.details.push({ ...item, processingError: "Item ignorado devido a erros de validação prévia." });
          continue;
        }

        try {
          const parseDate = (d: string) => {
            if (!d) return null;
            const parts = d.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return null;
          };

          const commonData = {
            name: normalizeText(item.data.name),
            city: normalizeText(item.data.city),
            state: normalizeText(item.data.state),
            status: (item.data.status?.toLowerCase() === 'inativo') ? 'inativo' : 'ativo',
            validityDate: parseDate(item.data.validityDate),
            coordinatorclienteId: item.data.coordinatorclienteId,
          };

          if (item.status === 'new') {
            await db.createContract(commonData as any); 
            results.success++;
            results.details.push({
               ...item,
               processingStatus: 'created'
            });
          } else if (item.status === 'update' && item.data.id) {
             await db.updateContract(item.data.id, commonData);
             results.success++;
             results.details.push({
                ...item,
                processingStatus: 'updated'
             });
          }
        } catch (error) {
          console.error("Erro ao importar contrato:", error);
          results.failed++;
          results.details.push({
            ...item,
            processingStatus: 'failed',
            processingError: (error as Error).message
          });
        }
      }

      return results;
    }),
});



