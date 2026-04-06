import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, managerAlertConfigs } from "../db";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const alertsRouter = router({
  getConfigs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    // Garantir que as configurações padrão existam
    const defaults = [
      {
        type: "queue_volume",
        name: "Volume da Fila de Espera",
        description: "Alerta quando a fila de espera ultrapassa X tickets.",
        threshold: 20,
        channels: ["whatsapp"],
        windowMinutes: 1,
        cooldownMinutes: 60
      },
      {
        type: "bad_csat",
        name: "Avaliação CSAT Negativa",
        description: "Alerta imediato ao receber nota Ruim (1) no CSAT.",
        threshold: 1,
        channels: ["whatsapp", "email"],
        windowMinutes: 1,
        cooldownMinutes: 0
      },
      {
        type: "contract_spike",
        name: "Pico de Tickets por Contrato",
        description: "Alerta quando um contrato abre mais de X tickets em 1 hora.",
        threshold: 10,
        channels: ["email"],
        windowMinutes: 60,
        cooldownMinutes: 60
      }
    ];

    for (const def of defaults) {
      const exists = await db.select().from(managerAlertConfigs).where(eq(managerAlertConfigs.type, def.type as any));
      if (exists.length === 0) {
        await db.insert(managerAlertConfigs).values({
            ...def,
            channels: def.channels // Drizzle handles JSON
        } as any);
      }
    }

    return await db.select().from(managerAlertConfigs);
  }),

  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      threshold: z.number().optional(),
      channels: z.union([z.array(z.string()), z.string()]).optional(), // Aceita array ou string JSON
      isActive: z.boolean().optional(),
      cooldownMinutes: z.number().optional(),
      windowMinutes: z.number().optional(),
      whatsappRecipients: z.array(z.number()).nullable().optional(),
      emailRecipients: z.array(z.number()).nullable().optional(),
      customMessage: z.string().nullable().optional()
    }))
    .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const updateData: any = {
            updatedAt: new Date()
        };

        if (input.threshold !== undefined) updateData.threshold = input.threshold;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.cooldownMinutes !== undefined) updateData.cooldownMinutes = input.cooldownMinutes;
        if (input.windowMinutes !== undefined) updateData.windowMinutes = input.windowMinutes;
        if (input.whatsappRecipients !== undefined) updateData.whatsappRecipients = input.whatsappRecipients;
        if (input.emailRecipients !== undefined) updateData.emailRecipients = input.emailRecipients;
        if (input.customMessage !== undefined) updateData.customMessage = input.customMessage;
        
        if (input.channels !== undefined) {
            updateData.channels = Array.isArray(input.channels) ? input.channels : JSON.parse(input.channels);
        }

        await db.update(managerAlertConfigs)
            .set(updateData)
            .where(eq(managerAlertConfigs.id, input.id));
        
        return { success: true };
    })
});



