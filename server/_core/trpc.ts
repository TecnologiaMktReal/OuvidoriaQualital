import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '../../shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logUserAction } from "./audit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const auditMiddleware = t.middleware(async (opts) => {
  const { ctx, path, type, rawInput } = opts;
  
  // Registrar ações de escrita (mutations) com detalhes
  if (type === "mutation") {
    const parts = path.split(".");
    const entity = parts[0];
    const method = parts[1] || "action";
    
    // Tenta extrair ID se disponível no input
    const entityId = (rawInput as any)?.id || (rawInput as any)?.userId || (rawInput as any)?.ticketId;

    logUserAction({ 
      ctx, 
      action: method.toUpperCase(),
      entity: entity ? entity.charAt(0).toUpperCase() + entity.slice(1) : "System",
      entityId: entityId ? String(entityId) : undefined,
      details: rawInput,
    }).catch(() => undefined);
  } else {
    // Para queries, apenas log simples (opcional, gera muito volume)
    // logUserAction({ ctx, action: `QUERY:${path}` }).catch(() => undefined);
  }

  return opts.next();
});

const baseProcedure = t.procedure.use(auditMiddleware);

export const router = t.router;
export const publicProcedure = baseProcedure;

// ============================================================================
// HELPERS DE PERMISSÃO - Usar profileRole do tipo de perfil
// ============================================================================

/** Verifica se o usuário tem um dos roles especificados */
export function hasRole(ctx: TrpcContext, roles: string[]): boolean {
  const effectiveRole = ctx.profileRole || ctx.user?.role;
  return effectiveRole ? roles.includes(effectiveRole) : false;
}

/** Verifica se é admin */
export function isAdmin(ctx: TrpcContext): boolean {
  return hasRole(ctx, ['admin', 'SuperAdmin']);
}

/** Verifica se é admin ou gerente */
export function isAdminOrManager(ctx: TrpcContext): boolean {
  return hasRole(ctx, ['admin', 'SuperAdmin', 'gerente']);
}

/** Lança erro se não for admin */
export function requireAdmin(ctx: TrpcContext): void {
  if (!isAdmin(ctx)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
}

/** Lança erro se não for admin ou gerente */
export function requireAdminOrManager(ctx: TrpcContext): void {
  if (!isAdminOrManager(ctx)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores e gerentes" });
  }
}

// ============================================================================
// MIDDLEWARES
// ============================================================================

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Usar profileRole para verificação de permissão
    const effectiveRole = ctx.profileRole || ctx.user?.role;
    if (!ctx.user || (effectiveRole !== 'admin' && effectiveRole !== 'SuperAdmin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const superAdminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const effectiveRole = ctx.profileRole || ctx.user?.role;
    if (!ctx.user || effectiveRole !== 'SuperAdmin') {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao Super Administrador" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);



