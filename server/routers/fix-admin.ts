/**
 * Rota temporária para corrigir role de admin
 * DELETAR APÓS USO POR SEGURANÇA
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb, getUserByEmail, getSystemUserById, listUserProfileTypes } from "../db";
import { users, profiles, userProfileTypes } from "../../drizzle/schema";

export const fixAdminRouter = router({
  /**
   * Verificar status atual do usuário
   */
  checkUser: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await getUserByEmail(input.email);
      if (!user) {
        return { error: "Usuário não encontrado" };
      }

      const systemUser = await getSystemUserById(user.id);
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userRole: user.role,
          profileRole: systemUser?.profileRole,
          profileTypeName: systemUser?.profileName,
          profileTypeId: systemUser?.profileTypeId,
        },
      };
    }),

  /**
   * Corrigir role do usuário para admin
   */
  fixToAdmin: publicProcedure
    .input(z.object({ 
      email: z.string().email(),
      // Senha de segurança temporária - trocar antes de fazer deploy
      securityKey: z.string(),
      targetRole: z.enum(["admin", "SuperAdmin"]).default("admin")
    }))
    .mutation(async ({ input }) => {
      // Validar senha de segurança
      const TEMP_SECURITY_KEY = process.env.FIX_ADMIN_SECURITY_KEY || "change-me-123";
      if (input.securityKey !== TEMP_SECURITY_KEY) {
        throw new Error("Chave de segurança inválida");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const role = input.targetRole;

      // 1. Atualizar role na tabela users
      await db.update(users)
        .set({ role: role as any })
        .where(eq(users.id, user.id));

      // 2. Verificar se existe profile_type correspondente
      const profileTypes = await listUserProfileTypes();
      let targetProfileType = profileTypes.find(pt => pt.role === role);

      // 3. Se não existir, criar
      if (!targetProfileType) {
        const [result] = await db.insert(userProfileTypes).values({
          name: role === "SuperAdmin" ? "Super Administrador" : "Administrador",
          description: role === "SuperAdmin" ? "Perfil com acesso total e irrestrito ao sistema" : "Perfil com acesso total ao sistema",
          role: role as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        targetProfileType = { id: Number(result.insertId), role: role } as any;
      }

      // 4. Atualizar profile do usuário
      await db.update(profiles)
        .set({ profileTypeId: targetProfileType!.id })
        .where(eq(profiles.userId, user.id));

      // 5. Verificar resultado
      const updatedUser = await getSystemUserById(user.id);

      return {
        success: true,
        message: `Usuário atualizado para ${role} com sucesso!`,
        user: {
          id: user.id,
          email: user.email,
          userRole: role,
          profileRole: updatedUser?.profileRole,
          profileTypeName: updatedUser?.profileName,
        },
      };
    }),

  /**
   * Listar todos os profile types disponíveis
   */
  listProfileTypes: publicProcedure.query(async () => {
    const profileTypes = await listUserProfileTypes();
    return { profileTypes };
  }),
});




