import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { testEmailConnection } from "../email/service";
import { encryptSecret } from "../email/crypto";

const accountBaseSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  fromAddress: z.string().email().nullish().or(z.literal("")),
  replyTo: z.string().email().nullish().or(z.literal("")),
  signature: z.string().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(["inactive", "testing", "active", "error"]).optional(),
  departmentId: z.number().nullish(),
  reasonId: z.number().nullish(),
  ticketTypeId: z.number().nullish(),
  criticityId: z.number().nullish(),
  defaultContractId: z.number().nullish(),
  maxAttachmentMb: z.number().int().positive().optional(),
  reopenClosedPolicy: z.enum(["reopen", "bounce"]).optional(),
});

const credentialSchema = z.object({
  accountId: z.number(),
  protocol: z.enum(["smtp", "imap", "pop3"]),
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.enum(["none", "starttls", "ssl"]).default("ssl"),
  authType: z.enum(["password", "oauth"]).default("password"),
  username: z.string().min(1),
  passwordEncrypted: z.string().optional(),
  oauthRefreshTokenEncrypted: z.string().optional(),
  oauthAccessTokenEncrypted: z.string().optional(),
  lastValidatedAt: z.date().optional(),
});

export const emailSetupRouter = router({
  list: adminProcedure.query(async () => {
    return db.listEmailAccounts();
  }),

  createAccount: adminProcedure
    .input(accountBaseSchema)
    .mutation(async ({ input }) => {
      const id = await db.createEmailAccount(input);
      return { id };
    }),

  updateAccount: adminProcedure
    .input(accountBaseSchema.partial().extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateEmailAccount(id, data);
      return { success: true };
    }),

  setDefault: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.setDefaultEmailAccount(input.id);
      return { success: true };
    }),

  upsertCredential: adminProcedure
    .input(credentialSchema)
    .mutation(async ({ input }) => {
      const id = await db.upsertEmailCredential({
        ...input,
        passwordEncrypted: input.passwordEncrypted ? encryptSecret(input.passwordEncrypted) : undefined,
      });
      return { id };
    }),

  testConnection: adminProcedure
    .input(
      z.object({
        accountId: z.number(),
        type: z.enum(["smtp", "imap", "pop3"]),
      })
    )
    .mutation(async ({ input }) => {
      return await testEmailConnection({ accountId: input.accountId, type: input.type });
    }),

  getTestLogs: adminProcedure
    .input(
      z.object({
        accountId: z.number(),
        limit: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      return db.getRecentEmailTestLogs(input.accountId, input.limit);
    }),
});




