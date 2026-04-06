import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const statusSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  slaMinutes: z.number().int().nonnegative().optional().nullable(),
  color: z.string().optional().nullable(),
  timeoutMinutes: z.number().int().nonnegative().optional().nullable(),
  nextStatusSlug: z.string().optional().nullable(),
});

const serviceTypeSchema = z.object({
  name: z.string().min(1),
  acronym: z.string().min(1).max(20),
  department: z.string().min(1).default("Atendimento"),
  slaMinutes: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
});

const ticketTypeSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const criticitySchema = z.object({
  name: z.string().min(1),
  slaMinutes: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const ticketSetupRouter = router({
  statuses: router({
    list: protectedProcedure.query(async () => db.listTicketStatuses()),
    create: adminProcedure.input(statusSchema).mutation(async ({ input }) => {
      const id = await db.createTicketStatus({ ...input, isActive: true });
      return { id };
    }),
    update: adminProcedure
      .input(statusSchema.partial().extend({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTicketStatus(id, data);
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateTicketStatus(input.id, { isActive: input.isActive });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await db.deleteTicketStatus(input.id);
      return { success: true };
    }),
  }),

  serviceTypes: router({
    list: protectedProcedure.query(async () => db.listTicketServiceTypes()),
    create: adminProcedure.input(serviceTypeSchema).mutation(async ({ input }) => {
      const id = await db.createTicketServiceType({ ...input, department: input.department || "Atendimento", isActive: true });
      return { id };
    }),
    update: adminProcedure
      .input(serviceTypeSchema.partial().extend({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTicketServiceType(id, { ...data, department: data.department || "Atendimento" });
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateTicketServiceType(input.id, { isActive: input.isActive });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await db.deleteTicketServiceType(input.id);
      return { success: true };
    }),
  }),

  ticketTypes: router({
    list: protectedProcedure.query(async () => db.listTicketTypes()),
    create: adminProcedure.input(ticketTypeSchema).mutation(async ({ input }) => {
      const id = await db.createTicketType({ ...input, isActive: true });
      return { id };
    }),
    update: adminProcedure
      .input(ticketTypeSchema.partial().extend({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTicketType(id, data);
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateTicketType(input.id, { isActive: input.isActive });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await db.deleteTicketType(input.id);
      return { success: true };
    }),
  }),

  criticities: router({
    list: protectedProcedure.query(async () => db.listTicketCriticities()),
    create: adminProcedure.input(criticitySchema).mutation(async ({ input }) => {
      const id = await db.createTicketCriticity({ ...input, isActive: true });
      return { id };
    }),
    update: adminProcedure
      .input(criticitySchema.partial().extend({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTicketCriticity(id, data);
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateTicketCriticity(input.id, { isActive: input.isActive });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await db.deleteTicketCriticity(input.id);
      return { success: true };
    }),
  }),
});




