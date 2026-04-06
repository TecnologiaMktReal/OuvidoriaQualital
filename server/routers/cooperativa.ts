import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { uploadToSupabaseStorage } from "../_core/supabaseStorage";
import { ENV } from "../_core/env";

const baseCooperativaSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  street: z.string().optional(),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const businessHourSchema = z.object({
  cooperativaId: z.number().optional(),
  items: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      openTime: z.string().optional().nullable(),
      closeTime: z.string().optional().nullable(),
      isClosed: z.boolean().optional(),
    })
  ),
});

const holidaySchema = z.object({
  cooperativaId: z.number().optional(),
  date: z.string().min(1),
  name: z.string().min(1),
  isNational: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
});

async function resolveCooperativaId(cooperativaId?: number) {
  if (cooperativaId) return cooperativaId;
  const list = await db.listCooperativas();
  const id = list?.[0]?.id;
  if (!id) throw new Error("Cadastre a cooperativa antes de configurar horários e feriados");
  return id;
}

export const cooperativaRouter = router({
  list: protectedProcedure.query(async () => {
    return db.listCooperativas();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCooperativaById(input.id);
    }),

  create: adminProcedure
    .input(baseCooperativaSchema)
    .mutation(async ({ input }) => {
      const id = await db.createCooperativa({
        ...input,
        logoUrl: input.logoUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id };
    }),

  update: adminProcedure
    .input(
      baseCooperativaSchema
        .partial()
        .extend({ id: z.number() })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCooperativa(id, {
        ...data,
        updatedAt: new Date(),
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCooperativa(input.id);
      return { success: true };
    }),

  uploadLogo: adminProcedure
    .input(
      z.object({
        cooperativaId: z.number(),
        fileBase64: z.string().min(1),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const contentType = input.mimeType || "image/png";
      const bucket = ENV.supabaseStorageBucketCooperativa || ENV.supabaseStorageBucket || "imagens";
      const url = await uploadToSupabaseStorage({
        bucket,
        base64Data: input.fileBase64,
        mimeType: contentType,
        pathHint: `cooperativas/${input.cooperativaId}/${input.fileName || "logo"}`,
        upsert: true,
      });

      if (!url) {
        throw new Error("Falha ao enviar logomarca para o storage");
      }

      await db.updateCooperativa(input.cooperativaId, { logoUrl: url, updatedAt: new Date() });
      return { url };
    }),

  stats: protectedProcedure.query(async () => {
    return db.getCooperativaStats();
  }),

  businessHours: router({
    list: protectedProcedure.query(async () => {
      const list = await db.listCooperativas();
      const coopId = list?.[0]?.id;
      if (!coopId) return [];
      return db.listBusinessHours(coopId);
    }),
    save: adminProcedure
      .input(businessHourSchema)
      .mutation(async ({ input }) => {
        const coopId = await resolveCooperativaId(input.cooperativaId);
        await db.saveBusinessHours(coopId, input.items);
        return { success: true };
      }),
  }),

  holidays: router({
    list: protectedProcedure.query(async () => {
      const coopId = await resolveCooperativaId();
      return db.listCooperativaHolidays(coopId);
    }),
    create: adminProcedure
      .input(holidaySchema)
      .mutation(async ({ input }) => {
        const coopId = await resolveCooperativaId(input.cooperativaId);
        const id = await db.createCooperativaHoliday({
          cooperativaId: coopId,
          date: input.date as any, // Mantém como string YYYY-MM-DD
          name: input.name,
          isNational: input.isNational ?? false,
          isRecurring: input.isRecurring ?? false,
        });
        return { id };
      }),
    update: adminProcedure
      .input(holidaySchema.extend({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { id, cooperativaId, ...data } = input;
        const coopId = await resolveCooperativaId(cooperativaId);
        await db.updateCooperativaHoliday(id, { 
          ...data, 
          date: data.date as any, // Mantém como string YYYY-MM-DD
          cooperativaId: coopId 
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCooperativaHoliday(input.id);
        return { success: true };
      }),
  }),
});




