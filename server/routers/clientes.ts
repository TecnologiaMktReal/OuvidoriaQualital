import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import { publicProcedure, protectedProcedure, router, requireAdminOrManager, isAdmin, isAdminOrManager } from "../_core/trpc";
import * as db from "../db";
import { normalizeText } from "../../shared/textUtils";

export const clientesRouter = router({
  // Listar todos os clientes com filtros
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["ativo", "inativo", "", "desligado"]).optional(),
      search: z.string().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(-1).max(10000).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getAllClientes(input);
    }),

  // Buscar Cliente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getClienteById(input.id);
    }),

  // Buscar Cliente por telefone (para integração WhatsApp)
  getByPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      return await db.getClienteByPhone(input.phone);
    }),

  // Criar novo Cliente
  create: protectedProcedure
    .input(z.object({
      registrationNumber: z.number(),
      name: z.string().min(1),
      document: z.string().min(1),
      birthDate: z.string().optional(),
      motherName: z.string().optional(),
      fatherName: z.string().optional(),
      birthCity: z.string().optional(),
      birthState: z.string().length(2).optional(),
      admissionDate: z.string().optional(),
      associationDate: z.string().optional(),
      terminationDate: z.string().optional(),
      position: z.string().optional(),
      status: z.enum(["ativo", "inativo", "", "desligado"]).default("ativo"),
      contractId: z.number().optional(),
      email: z.string().email().optional(),
      // Telefones
      whatsappNumber: z.string().optional(),
      secondaryPhone: z.string().optional(),
      // Endereço
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      neighborhood: z.string().optional(),
      complement: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      isCliente: z.boolean().default(true),
      additionalPhones: z.array(z.string()).optional(),
      additionalEmails: z.array(z.string()).optional(),
      // Dados Bancários
      bankCode: z.string().optional(),
      bankName: z.string().optional(),
      accountType: z.enum(["salario", "corrente", "poupanca"]).optional(),
      agency: z.string().optional(),
      accountNumber: z.string().optional(),
      accountDigit: z.string().optional(),
      pixKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);

      // Separar dados bancários do input
      const { 
        bankCode, bankName, accountType, agency, accountNumber, accountDigit, pixKey, 
        additionalPhones, additionalEmails,
        ...ClienteData 
      } = input;
      
      const id = await db.createCliente({
        ...ClienteData,
        additionalPhones,
        additionalEmails,
        name: normalizeText(input.name),
        document: normalizeText(input.document),
        position: input.position ? normalizeText(input.position) : undefined,
        street: input.street ? normalizeText(input.street) : undefined,
        neighborhood: input.neighborhood ? normalizeText(input.neighborhood) : undefined,
        city: input.city ? normalizeText(input.city) : undefined,
        birthDate: input.birthDate || null,
        admissionDate: input.admissionDate || null,
        associationDate: input.associationDate || null,
        terminationDate: null,
      });
      
      // Salvar dados bancários se fornecidos
      if (bankCode) {
        await db.upsertClienteBankData({
          clienteId: id,
          bankCode: normalizeText(bankCode),
          bankName: bankName ? normalizeText(bankName) : "",
          accountType: accountType || "corrente",
          agency: agency ? normalizeText(agency) : "",
          accountNumber: accountNumber ? normalizeText(accountNumber) : "",
          accountDigit: accountDigit ? normalizeText(accountDigit) : undefined,
          pixKey: pixKey || undefined,
          isActive: true,
        });
      }
      
      return { id };
    }),

  // Atualizar Cliente
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      registrationNumber: z.number().optional(),
      name: z.string().min(1).optional(),
      document: z.string().min(1).optional(),
      birthDate: z.string().optional(),
      motherName: z.string().optional(),
      fatherName: z.string().optional(),
      birthCity: z.string().optional(),
      birthState: z.string().length(2).optional(),
      admissionDate: z.string().optional(),
      associationDate: z.string().optional(),
      terminationDate: z.string().optional(),
      position: z.string().optional(),
      status: z.enum(["ativo", "inativo", "", "desligado"]).optional(),
      contractId: z.number().optional(),
      email: z.string().email().optional(),
      // Telefones
      whatsappNumber: z.string().optional(),
      secondaryPhone: z.string().optional(),
      // Endereço
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      neighborhood: z.string().optional(),
      complement: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      isCliente: z.boolean().optional(),
      additionalPhones: z.array(z.string()).optional(),
      additionalEmails: z.array(z.string()).optional(),
      // Dados Bancários
      bankCode: z.string().optional(),
      bankName: z.string().optional(),
      accountType: z.enum(["salario", "corrente", "poupanca"]).optional(),
      agency: z.string().optional(),
      accountNumber: z.string().optional(),
      accountDigit: z.string().optional(),
      pixKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      const { 
        id, bankCode, bankName, accountType, agency, accountNumber, accountDigit, pixKey, 
        additionalPhones, additionalEmails,
        ...data 
      } = input;

      // Normalizar additionalEmails caso venha como array de arrays
      const flatAdditionalEmails = Array.isArray(additionalEmails) 
        ? (additionalEmails as any).flat().filter((e: any) => typeof e === 'string' && e.includes('@'))
        : undefined;

      const normalizedData = {
        ...data,
        additionalPhones,
        additionalEmails: flatAdditionalEmails,
        ...(data.name && { name: normalizeText(data.name) }),
        ...(data.document && { document: normalizeText(data.document) }),
        ...(data.position && { position: normalizeText(data.position) }),
        ...(data.street && { street: normalizeText(data.street) }),
        ...(data.neighborhood && { neighborhood: normalizeText(data.neighborhood) }),
        ...(data.city && { city: normalizeText(data.city) }),
      };

      await db.updateCliente(id, normalizedData);

      // Salvar dados bancários se fornecidos (mesma lógica do create)
      if (bankCode) {
        await db.upsertClienteBankData({
          clienteId: id,
          bankCode: normalizeText(bankCode),
          bankName: bankName ? normalizeText(bankName) : "",
          accountType: accountType || "corrente",
          agency: agency ? normalizeText(agency) : "",
          accountNumber: accountNumber ? normalizeText(accountNumber) : "",
          accountDigit: accountDigit ? normalizeText(accountDigit) : undefined,
          pixKey: pixKey || undefined,
          isActive: true,
        });
      }

      return { success: true };
    }),

  // Verificar se existem tickets órfãos para um conjunto de identificadores
  checkUnlinkedTickets: protectedProcedure
    .input(z.object({ identifiers: z.array(z.string()) }))
    .query(async ({ input }) => {
      console.log("[DEBUG] checkUnlinkedTickets Input:", input.identifiers);
      const count = await db.countUnlinkedTicketsToCliente(input.identifiers);
      console.log("[DEBUG] checkUnlinkedTickets Result:", count);
      return count;
    }),

  // Vincular tickets órfãos a um Cliente
  linkTickets: protectedProcedure
    .input(z.object({ 
      clienteId: z.number(),
      identifiers: z.array(z.string()) 
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      const affectedRows = await db.linkTicketsToCliente(input.clienteId, input.identifiers);
      return { success: true, affectedRows };
    }),

  // Excluir Cliente (Normal)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx);
      try {
        await db.deleteCliente(input.id);
        return { success: true };
      } catch (error: any) {
        // Se for erro de restrição de chave estrangeira (comumente erro 1451 no MySQL)
        if (error.message?.includes("foreign key constraint fails") || error.code === 'ER_ROW_IS_REFERENCED_2') {
           throw new TRPCError({
             code: "BAD_REQUEST",
             message: "Não é possível excluir este Cliente pois ele possui atendimentos (tickets), contratos ou pesquisas vinculadas. Recomendamos alterar o status para 'Inativo' ou 'Desligado' em vez de excluir."
           });
        }
        throw error;
      }
    }),

  // Excluir Cliente e histórico (SuperAdmin apenas)
  deleteWithHistory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Usar a mesma lógica de verificação de permissão centralizada
      const effectiveRole = ctx.profileRole || ctx.user?.role;
      if (effectiveRole !== "SuperAdmin") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Ação permitida apenas para Super Admin." 
        });
      }
      await db.deleteClienteWithHistory(input.id);
      return { success: true };
    }),

  // Gerenciar telefones do Cliente
  phones: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getclientePhones(input.clienteId);
      }),

    add: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        phone: z.string().min(1),
        phoneType: z.enum(["principal", "secundario", "whatsapp"]).default("principal"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addclientePhone({
          ...input,
          phone: normalizeText(input.phone),
          isActive: true,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        phone: z.string().min(1).optional(),
        phoneType: z.enum(["principal", "secundario", "whatsapp"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const normalizedData = {
          ...data,
          ...(data.phone && { phone: normalizeText(data.phone) }),
        };
        await db.updateclientePhone(id, normalizedData);
        return { success: true };
      }),
  }),

  // Gerenciar e-mails do Cliente
  emails: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getclienteEmails(input.clienteId);
      }),

    add: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addclienteEmail({
          ...input,
          isActive: true,
        });
        return { id };
      }),
  }),

  // Gerenciar dados bancários do Cliente
  bankData: router({
    get: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Administradores e Gerentes podem ver dados bancários
        if (!isAdminOrManager(ctx)) {
          throw new Error("Acesso negado: apenas administradores e gerentes podem visualizar dados bancários");
        }
        return await db.getClienteBankData(input.clienteId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        bankCode: z.string().min(1),
        bankName: z.string().min(1),
        accountType: z.enum(["salario", "corrente", "poupanca"]),
        agency: z.string().min(1),
        accountNumber: z.string().min(1),
        accountDigit: z.string().optional(),
        pixKey: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Administradores e Gerentes podem gerenciar dados bancários
        if (!isAdminOrManager(ctx)) {
          throw new Error("Acesso negado: apenas administradores e gerentes podem gerenciar dados bancários");
        }
        
        const id = await db.upsertClienteBankData({
          ...input,
          bankName: normalizeText(input.bankName),
          agency: normalizeText(input.agency),
          accountNumber: normalizeText(input.accountNumber),
          accountDigit: input.accountDigit ? normalizeText(input.accountDigit) : undefined,
          pixKey: input.pixKey ? normalizeText(input.pixKey) : undefined,
          isActive: true,
        });
        return { id };
      }),
  }),
  
  // Buscar usuário do sistema associado ao coordenador
  getCoordinatorUser: protectedProcedure
    .input(z.object({ clienteId: z.number().nullable() }))
    .query(async ({ input }) => {
      if (!input.clienteId) return null;
      
      const dbClient = await db.getDb();
      if (!dbClient) return null;

      // Buscar o Cliente para pegar o e-mail e whatsapp
      const Cliente = await db.getClienteById(input.clienteId);
      if (!Cliente) return null;

      // 1. Tentar buscar usuário do sistema pelo e-mail
      if (Cliente.email) {
        const user = await db.getUserByEmail(Cliente.email);
        if (user) {
          return {
            id: user.id,
            name: user.name,
            type: "system_user" as const
          };
        }
      }

      // 2. Fallback: Retornar o WhatsApp do coordenador
      if (Cliente.whatsappNumber) {
        return {
          id: null,
          name: Cliente.name,
          whatsapp: Cliente.whatsappNumber,
          type: "whatsapp" as const
        };
      }

      return null;
    }),

  // Gerar Modelo CSV para Importação
  generateImportModel: protectedProcedure
    .query(async () => {
      const headers = [
        "Contrato (Nome ou ID)",
        "Matricula*", 
        "Nome*", 
        "CPF*", 
        "Email", 
        "WhatsApp", 
        "Status (ativo | inativo | desligado)", 
        "Data Nascimento (DD/MM/AAAA)",
        "Nome da Mae",
        "Nome do Pai",
        "Naturalidade",
        "UF Naturalidade",
        "Data Admissao",
        "Data Associacao",
        "Data Desligamento",
        "Cargo",
        "Rua",
        "Numero",
        "Bairro",
        "Complemento",
        "Cidade",
        "Estado (UF)",
        "CEP",
        "Banco (Codigo)",
        "Nome Banco",
        "Agencia",
        "Conta",
        "Digito da Conta",
        "Tipo Conta (corrente | poupanca | salario)",
        "Chave Pix"
      ];
      
      const exampleRow = [
        "Nome do Contrato Exemplo",
        "123456", 
        "Fulano de Tal", 
        "000.000.000-00", 
        "fulano@email.com", 
        "11999999999", 
        "ativo",
        "01/01/1980",
        "Maria de Tal",
        "Joao de Tal",
        "São Paulo",
        "SP",
        "01/01/2020",
        "01/02/2020",
        "",
        "Gerente",
        "Rua das Flores",
        "123",
        "Centro",
        "Apto 101",
        "São Paulo",
        "SP",
        "01001-000",
        "001",
        "Banco do Brasil",
        "1234-5",
        "12345-6",
        "0",
        "corrente",
        "12345678900"
      ];

      const csv = Papa.unparse({
        fields: headers,
        data: [exampleRow]
      }, {
        delimiter: ";", // Excel friendly
        quotes: true // Force quotes to avoid issues
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

      // Buscar todos os clientes para verificar duplicidade por CPF
      const allClientes = await dbClient.select({
        id: db.clientes.id,
        document: db.clientes.document,
        name: db.clientes.name,
        registrationNumber: db.clientes.registrationNumber
      }).from(db.clientes);

      // Buscar todos os contratos para mapeamento
      const allContracts = await dbClient.select({
        id: db.contracts.id,
        name: db.contracts.name
      }).from(db.contracts);
      
      const contractMap = new Map<string, number>();
      allContracts.forEach(c => {
         contractMap.set(String(c.id), c.id);
         if (c.name) {
             contractMap.set(normalizeText(c.name).toLowerCase(), c.id);
         }
      });

      // Mapa para busca rápida
      const ClienteMap = new Map<string, typeof allClientes[0]>(); // CPF -> Cliente
      allClientes.forEach(c => {
        if (c.document) {
          ClienteMap.set(normalizeText(c.document).replace(/\D/g, ""), c);
        }
      });

      const previewResults: any[] = [];
      let summary = { new: 0, update: 0, error: 0 };

      // Processar cada linha
      for (const row of data as any[]) {
        const matricula = row["Matricula*"];
        const nome = row["Nome*"];
        const cpfRaw = row["CPF*"];
        const contratoRaw = row["Contrato (Nome ou ID)"];
        
        const cpf = cpfRaw ? normalizeText(cpfRaw).replace(/\D/g, "") : "";
        const errors: string[] = [];

        // Validações Obrigatórias
        if (!matricula) errors.push("Matrícula é obrigatória");
        if (!nome) errors.push("Nome é obrigatório");
        if (!cpf) errors.push("CPF é obrigatório");

        // Validação de Telefone (WhatsApp) - Deve ter DDD + Número (mínimo 10 dígitos)
        const whatsapp = row["WhatsApp"];
        if (whatsapp) {
          const digits = whatsapp.replace(/\D/g, "");
          // Exemplos: 85996297500 (11) ou 8532221111 (10). Menos que 10 falta o DDD.
          if (digits.length < 10) {
            errors.push(`WhatsApp "${whatsapp}" inválido. Deve incluir o DDD (Ex: 85996297500)`);
          }
        }

        let resolvedContractId: number | undefined = undefined;
        if (contratoRaw) {
             const normalizedInput = normalizeText(contratoRaw).toLowerCase();
             // Tenta buscar por ID exato (se for numérico e estiver no map) ou pelo nome normalizado
             resolvedContractId = contractMap.get(contratoRaw) || contractMap.get(normalizedInput);
             
             if (!resolvedContractId && /^\d+$/.test(contratoRaw)) {
                  // Se parece um ID mas não foi encontrado como string exata, tenta converter para number
                  resolvedContractId = contractMap.get(String(parseInt(contratoRaw, 10)));
             }

             if (!resolvedContractId) {
                 errors.push(`Contrato "${contratoRaw}" não encontrado`);
             }
        }

        let operation = "new";
        let existingId = undefined;
        let originalName = undefined;

        if (cpf) {
          const existing = ClienteMap.get(cpf);
          if (existing) {
            operation = "update";
            existingId = existing.id;
            originalName = existing.name;
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
            registrationNumber: matricula,
            name: nome,
            document: cpfRaw,
            email: row["Email"],
            whatsappNumber: row["WhatsApp"],
            status: row["Status (ativo | inativo | desligado)"] || row["Statuts (ativo/inativo)"] || "ativo", // Fallback para manter compatibilidade com modelo antigo se necessario
            contractId: resolvedContractId,
            birthDate: row["Data Nascimento (DD/MM/AAAA)"],
            motherName: row["Nome da Mae"],
            fatherName: row["Nome do Pai"],
            birthCity: row["Naturalidade"],
            birthState: row["UF Naturalidade"],
            admissionDate: row["Data Admissao"],
            associationDate: row["Data Associacao"],
            terminationDate: row["Data Desligamento"],
            position: row["Cargo"],
            street: row["Rua"],
            addressNumber: row["Numero"],
            neighborhood: row["Bairro"],
            complement: row["Complemento"],
            city: row["Cidade"],
            state: row["Estado (UF)"],
            zipCode: row["CEP"],
            bankCode: row["Banco (Codigo)"],
            bankName: row["Nome Banco"],
            agency: row["Agencia"],
            accountNumber: row["Conta"],
            accountDigit: row["Digito da Conta"] || row["Digito Conta"],
            accountType: row["Tipo Conta (corrente | poupanca | salario)"] || row["Tipo Conta (corrente/poupanca/salario)"],
            pixKey: row["Chave Pix"],
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
      rows: z.array(z.any()) // Recebe as linhas já processadas/validadas pelo front (ou repassadas do preview)
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
          // Parse datas formato DD/MM/AAAA para YYYY-MM-DD
          const parseDate = (d: string) => {
            if (!d) return null;
            const parts = d.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return null; // ou tentar data direta se já vier formatada
          };

          const commonData = {
            registrationNumber: Number(item.data.registrationNumber),
            name: normalizeText(item.data.name),
            document: normalizeText(item.data.document),
            email: item.data.email,
            whatsappNumber: item.data.whatsappNumber,
            status: (item.data.status?.toLowerCase() === 'inativo' || item.data.status?.toLowerCase() === 'desligado') ? item.data.status.toLowerCase() : 'ativo',
            birthDate: parseDate(item.data.birthDate),
            motherName: item.data.motherName,
            fatherName: item.data.fatherName,
            birthCity: item.data.birthCity,
            birthState: item.data.birthState,
            admissionDate: parseDate(item.data.admissionDate),
            associationDate: parseDate(item.data.associationDate),
            terminationDate: parseDate(item.data.terminationDate),
            position: item.data.position,
            street: item.data.street,
            addressNumber: item.data.addressNumber,
            neighborhood: item.data.neighborhood,
            complement: item.data.complement,
            city: item.data.city,
            state: item.data.state,
            zipCode: item.data.zipCode,
            contractId: item.data.contractId,
          };

          const bankData = item.data.bankCode ? {
            bankCode: item.data.bankCode,
            bankName: item.data.bankName,
            agency: item.data.agency,
            accountNumber: item.data.accountNumber,
            accountDigit: item.data.accountDigit,
            accountType: item.data.accountType || "corrente",
            pixKey: item.data.pixKey
          } : null;

          if (item.status === 'new') {
            const newId = await db.createCliente({
              ...commonData,
              isCliente: true,
            });

            if (bankData) {
               await db.upsertClienteBankData({
                 clienteId: newId,
                 ...bankData,
                 isActive: true
               });
            }
            results.success++;
            results.details.push({ ...item, processingStatus: "created", id: newId });

          } else if (item.status === 'update' && item.data.id) {
            await db.updateCliente(item.data.id, commonData);
            
            if (bankData) {
               await db.upsertClienteBankData({
                 clienteId: item.data.id,
                 ...bankData,
                 isActive: true
               });
            }
            results.success++;
            results.details.push({ ...item, processingStatus: "updated" });
          }

        } catch (err: any) {
          console.error("Erro ao importar item:", item.data.name, err);
          results.failed++;
          results.details.push({ ...item, status: 'error', processingError: err.message });
        }
      }

      return results;
    }),

});



