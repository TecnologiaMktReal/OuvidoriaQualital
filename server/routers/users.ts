import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  email: z.string().optional(),
  departmentId: z.number().optional(),
  profileTypeId: z.number().optional(),
});

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?55\d{10,11}$/, {
    message: "Informe o telefone com DDI +55 e apenas números",
  })
  .optional()
  .nullable();

const avatarSchema = z
  .string()
  .url()
  .or(z.string().startsWith("data:", { message: "Avatar em formato inválido" }))
  .optional()
  .nullable();

const userFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  nickname: z.string().min(2).optional().nullable(),
  email: z.string().email("E-mail inválido"),
  phone: phoneSchema,
  departmentId: z.number().optional().nullable(),
  profileTypeId: z.number(),
  avatar: avatarSchema,
});

const ensureAdmin = (profileRole: string | null | undefined, userRole: string | null | undefined) => {
  const effectiveRole = profileRole || userRole;
  if (effectiveRole !== "admin" && effectiveRole !== "SuperAdmin") {
    throw new Error("Apenas administradores podem executar esta ação");
  }
};

export const usersRouter = router({
  list: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      return await db.listSystemUsers(input);
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  profileTypes: protectedProcedure.query(async () => {
    return await db.listUserProfileTypes();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getSystemUserById(input.id);
    }),

  create: protectedProcedure
    .input(userFormSchema)
    .mutation(async ({ input, ctx }) => {
      ensureAdmin(ctx.profileRole, ctx.user?.role);
      return await db.createSystemUser(input);
    }),

  update: protectedProcedure
    .input(userFormSchema.extend({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      ensureAdmin(ctx.profileRole, ctx.user?.role);
      const { id, ...data } = input;
      return await db.updateSystemUser(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      ensureAdmin(ctx.profileRole, ctx.user?.role);
      await db.deleteSystemUser(input.id);
      return { success: true };
    }),

  upsertProfileType: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(2, "Nome é obrigatório"),
        description: z.string().optional(),
        role: z.enum(["user", "admin", "SuperAdmin", "gerente", "atendente"]),
        permissions: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      ensureAdmin(ctx.profileRole, ctx.user?.role);
      return await db.upsertUserProfileType(input);
    }),

  deleteProfileType: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      ensureAdmin(ctx.profileRole, ctx.user?.role);
      await db.deleteUserProfileType(input.id);
      return { success: true };
    }),
});



