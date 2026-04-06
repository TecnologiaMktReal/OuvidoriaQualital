import { z } from "zod";
import { router, protectedProcedure, isAdmin } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const importRouter = router({
  /**
   * Importar clientes em massa
   */
  importClientes: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            registrationNumber: z.string(),
            name: z.string(),
            document: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            birthDate: z.string().optional(),
            admissionDate: z.string().optional(),
            position: z.string().optional(),
            status: z.enum(["ativo", "inativo", "sem_producao"]).optional(),
            contractId: z.number().optional(),
            accountDigit: z.string().optional(), // Novo campo
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Apenas admin pode importar
      if (!isAdmin(ctx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem importar dados",
        });
      }

      // Validar telefone (WhatsApp/Phone) - Regra: Codigo (DDD) + numero (min 10 digitos)
      const filteredData = input.data.filter(row => {
        if (row.phone) {
          const digits = row.phone.replace(/\D/g, "");
          return digits.length >= 10;
        }
        return true;
      });

      // Converter datas de string para Date
      const processedData = filteredData.map((row) => ({
        ...row,
        birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
        admissionDate: row.admissionDate ? new Date(row.admissionDate) : undefined,
        status: (row.status || "ativo") as "ativo" | "inativo" | "sem_producao",
      }));

      const result = await db.bulkImportClientes(processedData);
      return result;
    }),

  /**
   * Importar contratos em massa
   */
  importContracts: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            name: z.string(),
            city: z.string(),
            state: z.string(),
            status: z.enum(["ativo", "inativo"]).optional(),
            validityDate: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Apenas admin pode importar
      if (!isAdmin(ctx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem importar dados",
        });
      }

      // Converter datas de string para Date
      const processedData = input.data.map((row) => ({
        ...row,
        validityDate: row.validityDate ? new Date(row.validityDate) : undefined,
        status: (row.status || "ativo") as "ativo" | "inativo",
      }));

      const result = await db.bulkImportContracts(processedData);
      return result;
    }),
});



