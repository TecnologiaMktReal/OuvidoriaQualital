import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const stickersRouter = router({
  list: protectedProcedure
    .query(async () => {
      return await db.getStickers();
    }),

  upload: protectedProcedure
    .input(z.object({
      name: z.string(),
      fileName: z.string(),
      fileContent: z.string(), // Base64 content
      contentType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, 'base64');
        const storagePath = `stickers/${Date.now()}_${input.fileName}`;
        
        const { key, url } = await storagePut(
          storagePath,
          buffer,
          input.contentType || 'image/png'
        );

        const stickerId = await db.createSticker({
          name: input.name,
          url: url,
          storageKey: key,
          createdBy: ctx.user.id,
        });

        return { id: stickerId, url, key };
      } catch (error) {
        console.error("[Stickers] Upload failed:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Falha ao salvar figurinha.',
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db.deleteSticker(input.id);
      return { success: true };
    }),
});



