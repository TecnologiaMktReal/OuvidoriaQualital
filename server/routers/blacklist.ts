import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const blacklistRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["email", "whatsapp"]).optional(),
    }))
    .query(async ({ input }) => {
      const { type } = input;
      return await db.getBlacklist(type);
    }),

  add: protectedProcedure
    .input(z.object({
      type: z.enum(["email", "whatsapp"]),
      value: z.string().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Normalização
      let normalizedValue = input.value.trim();
      if (input.type === 'email') {
          normalizedValue = normalizedValue.toLowerCase();
      }
      
      const exists = await db.checkBlacklist(input.type, normalizedValue);
      if (exists) {
        throw new Error("Este contato já está na blacklist.");
      }
      await db.addToBlacklist({
        type: input.type,
        value: normalizedValue,
        reason: input.reason,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        value: z.string().optional(),
        reason: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      let data = { ...input.data };
      if (data.value) {
          data.value = data.value.trim();
          // Type is tricky here if we allow changing type, but we usually don't.
          // Assuming type consistency or fetch before update if strict.
          // For now just trim value.
      }
      
      await db.updateBlacklist(input.id, data);
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db.removeFromBlacklist(input.id);
      return { success: true };
    }),

  getLastMessage: protectedProcedure
    .input(z.object({
      value: z.string(),
    }))
    .query(async ({ input }) => {
       const msg = await db.getLastMessageFromContact(input.value);
       return msg; 
    }),
});



