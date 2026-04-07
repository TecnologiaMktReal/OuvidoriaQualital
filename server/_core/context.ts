import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import {
  upsertUser,
  getUserByOpenId,
  getUserByEmail,
  createProfile,
  getProfileByUserId,
  getSystemUserById,
} from "../db";
import { getSupabaseAdminClient } from "./supabaseAdmin";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Role do perfil do usuário (admin, gerente, atendente) - usar para verificações de permissão */
  profileRole: string | null;
  /** Dados completos do usuário incluindo perfil */
  backendUser: Awaited<ReturnType<typeof getSystemUserById>> | null;
};

// Extrair token do Supabase dos cookies
function getSupabaseTokenFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [fullname, value] = cookie.split('=');
    if (!value) continue;

    // O Supabase armazena o token em cookies sb-<project>-auth-token
    // IMPORTANTE: deve terminar exatamente com -auth-token para não pegar -code-verifier
    if (fullname.startsWith('sb-') && fullname.endsWith('-auth-token')) {
      try {
        const decoded = JSON.parse(decodeURIComponent(value));
        const token = decoded?.access_token || decoded?.[0]?.access_token || null;
        if (token) return token;
      } catch {
        // Se não for JSON, pode ser o token direto em algumas versões/configurações
        if (value.length > 50) return value;
      }
    }
  }
  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const supabase = getSupabaseAdminClient();

  const authHeader = opts.req.headers.authorization;
  const cookieHeader = opts.req.headers.cookie;
  
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let source = "header";

  if (!token) {
    token = getSupabaseTokenFromCookies(cookieHeader);
    source = "cookie";
  }

  if (!supabase || !token) {
    return {
      req: opts.req,
      res: opts.res,
      user: null,
      profileRole: null,
      backendUser: null,
    };
  }

  try {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      console.warn(`[Auth] Failed to verify token from ${source}:`, error?.message || "User not found in Supabase");
      return {
        req: opts.req,
        res: opts.res,
        user: null,
        profileRole: null,
        backendUser: null,
      };
    }

    const email = supabaseUser.email;
    const supabaseId = supabaseUser.id;

    // Buscar usuário no banco local por email ou openId
    let localUser = email ? await getUserByEmail(email) : null;
    if (!localUser) {
      localUser = await getUserByOpenId(supabaseId);
    }

    // Se não existir, criar registro básico (auto-provisioning)
    if (!localUser) {
      console.info("[Auth] Auto-provisioning local user for:", email || supabaseId);
      try {
        await upsertUser({
          openId: supabaseId,
          name: supabaseUser.user_metadata?.name || email?.split("@")[0] || "Usuário",
          email: email || null,
          loginMethod: "supabase",
          role: "user",
        });
        localUser = await getUserByOpenId(supabaseId);

        if (localUser) {
          const existingProfile = await getProfileByUserId(localUser.id);
          if (!existingProfile) {
            await createProfile({
              userId: localUser.id,
              fullName: supabaseUser.user_metadata?.name || email?.split("@")[0] || "Usuário",
              nickname: null,
              profileTypeId: null,
              departmentId: null,
              isActive: true,
              isOnLeave: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      } catch (upsertError) {
        console.error("[Auth] Failed to upsert user:", upsertError);
      }
    }

    if (!localUser) {
      console.error("[Auth] User identified in Supabase but local DB sync failed for:", email);
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Atualizar timestamp de acesso silenciosamente
    upsertUser({
      openId: localUser.openId,
      lastSignedIn: new Date(),
    }).catch(e => console.warn("[Auth] lastSignedIn update failed:", e.message));

    const backendUser = await getSystemUserById(localUser.id);
    
    // Log de sucesso (apenas na primeira vez ou periodicamente seria melhor, mas para debug agora ajuda)
    // console.info(`[Auth] User ${email} authenticated via ${source}`);

    return {
      req: opts.req,
      res: opts.res,
      user: localUser,
      profileRole: backendUser?.profileRole || null,
      backendUser,
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Auth] Fatal context error:", error);
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG, cause: error });
  }
}



