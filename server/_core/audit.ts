import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { TrpcContext } from "./context";
import * as db from "../db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.resolve(__dirname, "../../ações.log");

function sanitize(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace(/[;\r\n]+/g, " ").trim() || "-";
}

function formatDate(now: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(now);
}

function formatTime(now: Date) {
  return now.toLocaleTimeString("pt-BR", { hour12: false, timeZone: "America/Sao_Paulo" });
}

export async function logUserAction(params: { 
  ctx: TrpcContext; 
  action: string; 
  page?: string;
  entity?: string;
  entityId?: string;
  details?: any;
}) {
  const { ctx, action, page, entity, entityId, details } = params;
  const now = new Date();

  const userName = sanitize(
    ctx.backendUser?.fullName ||
      ctx.user?.email ||
      (ctx.user ? `user#${ctx.user.id}` : "anon")
  );

  const rawPage =
    page ??
    ctx.req?.headers["x-page"] ??
    ctx.req?.headers["referer"] ??
    ctx.req?.headers["referer".toLowerCase()];

  const pageValue = sanitize(Array.isArray(rawPage) ? rawPage.join(",") : (rawPage as string | undefined));
  
  // 1. Log em arquivo (Legado/Redundância)
  const line = `${formatDate(now)};${formatTime(now)};${userName};${pageValue};${sanitize(action)};\n`;
  try {
    await fs.promises.appendFile(LOG_PATH, line, { encoding: "utf8" });
  } catch (error) {
    console.error("Falha ao gravar ações.log", error);
  }

  // 2. Log no Banco de Dados (Novo)
  if (ctx.user?.id) {
    try {
      await db.logAudit({
        userId: ctx.user.id,
        action: action.toUpperCase(),
        page: pageValue !== "-" ? pageValue : undefined,
        entity,
        entityId: entityId ? String(entityId) : undefined,
        details,
        ipAddress: ctx.req?.ip || (ctx.req?.headers['x-forwarded-for'] as string) || undefined,
        userAgent: ctx.req?.headers['user-agent'] || undefined,
      });
    } catch (error) {
      console.error("Falha ao gravar auditoria no banco", error);
    }
  }
}




