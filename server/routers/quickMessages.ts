import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const quickMessagesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getQuickMessages();
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1),
        category: z.string().max(50).optional(),
        timeoutMinutes: z.number().int().min(1).optional(),
        timeoutSeconds: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.createQuickMessage({
        ...input,
        active: true,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(100).optional(),
        content: z.string().min(1).optional(),
        category: z.string().max(50).optional(),
        active: z.boolean().optional(),
        timeoutMinutes: z.number().int().min(1).optional().nullable(),
        timeoutSeconds: z.number().int().min(0).optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateQuickMessage(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteQuickMessage(input.id);
      return { success: true };
    }),
});



