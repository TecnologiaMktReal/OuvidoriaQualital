import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const periodSchema = z.enum(["diario", "ontem", "semanal", "mensal", "anual"]);

export const dashboardRouter = router({
  metrics: protectedProcedure
    .input(z.object({ period: periodSchema }).optional())
    .query(async ({ input, ctx }) => {
      const period = input?.period ?? "diario";
      const role = ctx.profileRole || ctx.user.role;
      const profile = await db.getProfileByUserId(ctx.user.id);

      const filters: {
        period: typeof period;
        assignedTo?: number;
        departmentId?: number;
      } = { period };

      if (role === "atendente") {
        filters.assignedTo = ctx.user.id;
      }
      if (role === "gerente" && profile?.departmentId) {
        filters.departmentId = profile.departmentId;
      }

      return db.getDashboardMetrics(filters);
    }),
});



