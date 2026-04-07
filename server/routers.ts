import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { clientesRouter } from "./routers/clientes";
import { contractsRouter } from "./routers/contracts";
import { departmentsRouter, attendanceReasonsRouter } from "./routers/departments";
import { ticketsRouter } from "./routers/tickets";
import { whatsappRouter } from "./routers/whatsapp";
import { importRouter } from "./routers/import";
import { quickMessagesRouter } from "./routers/quickMessages";
import { usersRouter } from "./routers/users";
import { cooperativaRouter } from "./routers/cooperativa";
import { ticketSetupRouter } from "./routers/ticketSetup";
import { emailSetupRouter } from "./routers/emailSetup";
import { emailRouter } from "./routers/email";
import { fixAdminRouter } from "./routers/fix-admin";
import { internalChatRouter } from "./routers/internalChat";
import { dashboardRouter } from "./routers/dashboard";
import { reportsRouter } from "./routers/reports";
import { stickersRouter } from "./routers/stickers";
import { alertsRouter } from "./routers/alerts";
import { reportSchedulesRouter } from "./routers/reportSchedules";
import { blacklistRouter } from "./routers/blacklist";
import { auditRouter } from "./routers/audit";
import { emailLayoutsRouter } from "./routers/emailLayouts";
import { setupRouter } from "./routers/setup";
import { publicRouter } from "./routers/public";
import { processesRouter } from "./routers/processes";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  public: publicRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      return await db.getSystemUserById(ctx.user.id);
    }),
    verifyEmail: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) throw new Error(UNAUTHED_ERR_MSG);
      await db.markEmailVerified(ctx.user.id);
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Routers do sistema Ouvidoria
  clientes: clientesRouter,
  contracts: contractsRouter,
  departments: departmentsRouter,
  tickets: ticketsRouter,
  whatsapp: whatsappRouter,
  import: importRouter,
  quickMessages: quickMessagesRouter,
  users: usersRouter,
  cooperativa: cooperativaRouter,
  ticketSetup: ticketSetupRouter,
  emailSetup: emailSetupRouter,
  emailLayouts: emailLayoutsRouter,
  email: emailRouter,
  attendanceReasons: attendanceReasonsRouter,
  internalChat: internalChatRouter,
  dashboard: dashboardRouter,
  reports: reportsRouter,
  stickers: stickersRouter,
  alerts: alertsRouter,
  reportSchedules: reportSchedulesRouter,
  blacklist: blacklistRouter,
  audit: auditRouter,
  setup: setupRouter,
  processes: processesRouter,
  
  // 🔧 ROTA TEMPORÁRIA - DELETAR APÓS CORRIGIR ADMIN
  fixAdmin: fixAdminRouter,
});

export type AppRouter = typeof appRouter;



