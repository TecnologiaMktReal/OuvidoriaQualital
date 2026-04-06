import { z } from "zod";
import { adminProcedure, router, superAdminProcedure } from "../_core/trpc";
import * as db from "../db";
import { sql } from "drizzle-orm";

export const auditRouter = router({
  list: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      action: z.string().optional(),
      userId: z.number().optional(),
      entity: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getAuditLogs(input);
    }),

  getFilters: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return { actions: [], entities: [], users: [] };

    const [actions, entities, usersList] = await Promise.all([
      dbInstance.selectDistinct({ action: db.auditLogs.action }).from(db.auditLogs),
      dbInstance.selectDistinct({ entity: db.auditLogs.entity }).from(db.auditLogs).where(sql`${db.auditLogs.entity} IS NOT NULL`),
      dbInstance.select({ id: db.users.id, name: db.users.name }).from(db.users).where(sql`${db.users.name} IS NOT NULL`)
    ]);

    return {
      actions: actions.map(a => a.action),
      entities: entities.map(e => e.entity).filter(Boolean),
      users: usersList
    };
  }),

  clear: superAdminProcedure
    .input(z.object({
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .mutation(async ({ input }) => {
      await db.deleteAuditLogsByPeriod(input.dateFrom, input.dateTo);
      return { success: true };
    }),
});



