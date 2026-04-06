import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const reportScheduleSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  reportType: z.enum(["resumo_diario", "resumo_semanal", "resumo_mensal", "resumo_anual"]),
  period: z.enum(["ontem", "hoje", "semana_atual", "mes_atual", "ano_atual"]),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido (HH:mm)"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  daysOfWeek: z.array(z.number()).optional(),
  message: z.string().optional().nullable(),
  channels: z.array(z.enum(["email", "whatsapp"])),
  recipients: z.array(z.number()), // User IDs
  isActive: z.boolean().default(true),
});

export const reportSchedulesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.listReportSchedules();
  }),

  create: protectedProcedure
    .input(reportScheduleSchema)
    .mutation(async ({ input }) => {
      return await db.createReportSchedule(input);
    }),

  update: protectedProcedure
    .input(reportScheduleSchema.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateReportSchedule(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteReportSchedule(input.id);
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return await db.updateReportSchedule(input.id, { isActive: input.isActive });
    }),

  getLogs: protectedProcedure
    .input(z.object({ scheduleId: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.listReportDeliveryLogs(input.scheduleId);
    }),
});



