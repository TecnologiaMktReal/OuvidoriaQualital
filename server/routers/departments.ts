import { z } from "zod";
import { protectedProcedure, router, isAdmin } from "../_core/trpc";
import * as db from "../db";
import { normalizeText } from "../../shared/textUtils";

export const departmentsRouter = router({
  // Listar todos os departamentos
  list: protectedProcedure
    .query(async () => {
      return await db.getAllDepartments();
    }),

  // Buscar departamento por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getDepartmentById(input.id);
    }),

  // Criar novo departamento
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      responsibleUserId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas administradores podem criar departamentos
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem criar departamentos");
      }
      
      const id = await db.createDepartment({
        ...input,
        name: normalizeText(input.name),
        description: input.description ? normalizeText(input.description) : undefined,
        isActive: true,
      });
      return { id };
    }),

  // Atualizar departamento
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      responsibleUserId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas administradores podem atualizar departamentos
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem atualizar departamentos");
      }
      
      const { id, ...data } = input;
      const normalizedData = {
        ...data,
        ...(data.name && { name: normalizeText(data.name) }),
        ...(data.description && { description: normalizeText(data.description) }),
      };
      await db.updateDepartment(id, normalizedData);
      return { success: true };
    }),

  // Excluir departamento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Apenas administradores podem excluir departamentos
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem excluir departamentos");
      }
      
      await db.deleteDepartment(input.id);
      return { success: true };
    }),

  // Ativar/Desativar departamento
  toggleStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Apenas administradores podem alterar status de departamentos
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem alterar status de departamentos");
      }
      
      await db.toggleDepartmentStatus(input.id);
      return { success: true };
    }),
});

export const attendanceReasonsRouter = router({
  // Listar todos os motivos de atendimento
  list: protectedProcedure
    .query(async () => {
      return await db.getAllAttendanceReasons();
    }),

  // Buscar motivo por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getAttendanceReasonById(input.id);
    }),

  // Criar novo motivo de atendimento
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      acronym: z.string().optional(),
      description: z.string().optional(), // manter compat, mas tratado como observação opcional
      parentId: z.number().optional(),
      slaMinutes: z.number().int().nonnegative().default(60),
      color: z.string().optional(),
      departmentId: z.number().optional(),
      defaultStatusSlug: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem criar motivos de atendimento");
      }

      const id = await db.createAttendanceReason({
        name: normalizeText(input.name),
        acronym: input.acronym,
        description: input.description ? normalizeText(input.description) : undefined,
        parentId: input.parentId,
        slaMinutes: input.slaMinutes,
        color: input.color,
        departmentId: input.departmentId,
        defaultStatusSlug: input.defaultStatusSlug,
        isActive: true,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      acronym: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      slaMinutes: z.number().int().nonnegative().optional(),
      color: z.string().optional(),
      departmentId: z.number().optional(),
      isActive: z.boolean().optional(),
      defaultStatusSlug: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem atualizar motivos de atendimento");
      }
      
      const { id, slaMinutes, ...data } = input;
      const normalizedData = {
        ...data,
        ...(data.name && { name: normalizeText(data.name) }),
        ...(data.description && { description: normalizeText(data.description) }),
        ...(slaMinutes !== undefined ? { slaMinutes } : {}),
      };
      await db.updateAttendanceReason(id, normalizedData);
      return { success: true };
    }),

  // Excluir motivo de atendimento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem excluir motivos de atendimento");
      }
      // Note: db.deleteAttendanceReason needs to be implemented or we use a generic delete
      await db.deleteAttendanceReason(input.id);
      return { success: true };
    }),

  // Alternar status do motivo
  toggleStatus: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx)) {
        throw new Error("Acesso negado: apenas administradores podem alterar status de motivos");
      }
      await db.updateAttendanceReason(input.id, { isActive: input.isActive });
      return { success: true };
    }),
});



