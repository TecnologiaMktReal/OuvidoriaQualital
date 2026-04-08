import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { emailLayouts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const emailLayoutsRouter = router({
  // Listar todos os layouts
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const layouts = await db
      .select()
      .from(emailLayouts)
      .orderBy(desc(emailLayouts.isDefault), desc(emailLayouts.createdAt));
    return layouts;
  }),

  // Buscar layout por ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("Database not available");
      const layout = await db
        .select()
        .from(emailLayouts)
        .where(eq(emailLayouts.id, input.id))
        .limit(1);
      return layout[0] || null;
    }),

  // Buscar layout padrão
  getDefault: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const layout = await db
      .select()
      .from(emailLayouts)
      .where(eq(emailLayouts.isDefault, true))
      .limit(1);
    return layout[0] || null;
  }),

  // Criar novo layout
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        description: z.string().optional(),
        htmlContent: z.string().min(1, "HTML é obrigatório"),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("Database not available");

      // Se este layout for marcado como padrão, remover o padrão dos outros
      if (input.isDefault) {
        await db
          .update(emailLayouts)
          .set({ isDefault: false })
          .where(eq(emailLayouts.isDefault, true));
      }

      const result = await db.insert(emailLayouts).values(input);
      return { id: Number(result[0].insertId), success: true };
    }),

  // Atualizar layout
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Nome é obrigatório").optional(),
        description: z.string().optional(),
        htmlContent: z.string().min(1, "HTML é obrigatório").optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("Database not available");
      const { id, ...data } = input;

      // Se este layout for marcado como padrão, remover o padrão dos outros
      if (data.isDefault) {
        await db
          .update(emailLayouts)
          .set({ isDefault: false })
          .where(eq(emailLayouts.isDefault, true));
      }

      await db.update(emailLayouts).set(data).where(eq(emailLayouts.id, id));
      return { success: true };
    }),

  // Definir como padrão
  setDefault: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("Database not available");

      // Remover padrão de todos
      await db
        .update(emailLayouts)
        .set({ isDefault: false })
        .where(eq(emailLayouts.isDefault, true));

      // Definir o novo padrão
      await db
        .update(emailLayouts)
        .set({ isDefault: true })
        .where(eq(emailLayouts.id, input.id));

      return { success: true };
    }),

  // Excluir layout
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("Database not available");

      // Verificar se não é o layout padrão
      const layout = await db
        .select()
        .from(emailLayouts)
        .where(eq(emailLayouts.id, input.id))
        .limit(1);

      if (layout[0]?.isDefault) {
        throw new Error("Não é possível excluir o layout padrão");
      }

      await db.delete(emailLayouts).where(eq(emailLayouts.id, input.id));
      return { success: true };
    }),
});



