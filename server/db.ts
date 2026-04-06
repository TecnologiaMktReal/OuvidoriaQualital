import { eq, and, like, desc, asc, sql, or, ne, inArray, isNull, isNotNull, not, getTableColumns, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";
import { 
  InsertUser, users, profiles, departments, clientes, clientePhones, clienteEmails,
  clienteBankData, contracts, attendanceReasons, tickets, ticketMessages,
  ticketHistory, ticketTimeTracking, csatSurveys, whatsappSessions as whatsappSessionsTable,
  quickMessages, userProfileTypes, cooperativas, ticketStatuses, ticketServiceTypes, ticketTypes, ticketCriticities,
  cooperativaBusinessHours, cooperativaHolidays, emailAccounts, emailCredentials, emailTestLogs, emailEvents, emailAttachments,
  internalConversations, conversationParticipants, internalMessages, stickers, managerAlertConfigs,
  type InsertProfile, type InsertDepartment, type InsertCliente,
  type InsertclientePhone, type InsertclienteEmail, type InsertclienteBankData, type InsertContract,
  type InsertAttendanceReason, type InsertTicket, type InsertTicketMessage,
  type InsertTicketHistory, type InsertTicketTimeTracking, type InsertCsatSurvey,
  type InsertWhatsappSession, type InsertQuickMessage, type UserProfileType,
  type InsertCooperativa, type InsertTicketStatus, type InsertTicketServiceType, type InsertTicketType, type InsertTicketCriticity,
  type InsertEmailAccount, type InsertEmailCredential, type InsertEmailTestLog, type InsertEmailEvent, type InsertEmailAttachment,
  type EmailAccount, type EmailCredential,
  type InsertInternalConversation, type InsertConversationParticipant, type InsertInternalMessage,
  type Cliente, type ManagerAlertConfig,
  type InsertBlacklist, blacklist,
  type InsertWhatsappCommunicationLog, whatsappCommunicationLogs,
  type InsertAuditLog, auditLogs
} from "../drizzle/schema";

export { 
  whatsappSessionsTable as whatsappSessions, 
  internalConversations, 
  conversationParticipants, 
  internalMessages,
  tickets,
  ticketMessages,
  quickMessages,
  users,
  profiles,
  clientes,
  csatSurveys,
  contracts,
  departments,
  attendanceReasons as reasons,
  managerAlertConfigs,
  blacklist,
  whatsappCommunicationLogs,
  auditLogs
};
export * from "./db/reportSchedules";
const reasons = attendanceReasons;
import { ENV } from './_core/env';
import { normalizeText } from '../shared/textUtils';
import { randomUUID } from "crypto";
import { storagePut } from "./storage";
import { uploadAvatarToSupabase } from "./_core/supabaseStorage";
import { disableSupabaseAdmin } from "./_core/supabaseAdmin";
import { getSupabaseAdminClient } from "./_core/supabaseAdmin";
import { logger } from "./_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;
type DatabaseInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;
let migrationsApplied = false;
let supabaseSyncApplied = false;

// Tipos inferidos direto das tabelas (não existem exports dedicados no schema)
type InsertCooperativaBusinessHour = typeof cooperativaBusinessHours.$inferInsert;
type InsertCooperativaHoliday = typeof cooperativaHolidays.$inferInsert;

const DEFAULT_COUNTRY_CODE =
  (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "55").replace(/\D/g, "") || "55";

export type DashboardPeriod = "diario" | "ontem" | "semanal" | "mensal" | "anual";

function resolvePeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const dateFrom = new Date(now);
  let dateTo = new Date(now);

  switch (period) {
    case "ontem":
      dateFrom.setDate(dateFrom.getDate() - 1);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(dateFrom);
      dateTo.setHours(23, 59, 59, 999);
      break;
    case "semanal": {
      // Usar fuso horário de Brasília (-03:00) para calcular o início da semana
      const nowUTC = new Date();
      const brTime = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      const day = brTime.getUTCDay(); // 0 is Sunday, 1 is Monday...
      
      // Segunda-feira 12:00 da semana atual em Brasília (usamos meio-dia para robustez no DATE_FORMAT)
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(brTime);
      monday.setUTCDate(brTime.getUTCDate() + diff);
      monday.setUTCHours(12, 0, 0, 0);

      // dateFrom será o início real do dia (00:00) para o SQL
      dateFrom.setTime(monday.getTime());
      dateFrom.setUTCHours(0, 0, 0, 0);
      
      // dateTo será o fim do domingo (23:59:59)
      dateTo.setTime(monday.getTime());
      dateTo.setUTCDate(monday.getUTCDate() + 6);
      dateTo.setUTCHours(23, 59, 59, 999);
      break;
    }
    case "mensal": {
      // Janeiro a Dezembro do ano atual (Brasília)
      const nowUTC = new Date();
      const brTime = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      
      dateFrom.setTime(brTime.getTime());
      dateFrom.setUTCMonth(0, 1);
      dateFrom.setUTCHours(0, 0, 0, 0);

      dateTo.setTime(dateFrom.getTime());
      dateTo.setUTCMonth(11, 31);
      dateTo.setUTCHours(23, 59, 59, 999);
      break;
    }
    case "anual":
      // Todo o histórico (sem limite inferior definido de forma estrita ou 5 anos atrás)
      dateFrom.setFullYear(dateFrom.getFullYear() - 5);
      dateFrom.setMonth(0, 1);
      dateFrom.setHours(0, 0, 0, 0);
      break;
    default: // diario (hoje)
      dateFrom.setHours(0, 0, 0, 0);
      break;
  }

  return { dateFrom, dateTo };
}

async function ensureMigrations(connectionString: string) {
  if (migrationsApplied) return;

  // Evita executar migrations automaticamente em produção,
  // a menos que seja explicitamente habilitado.
  if (
    ENV.isProduction &&
    process.env.RUN_MIGRATIONS_ON_START !== "true"
  ) {
    logger.info(
      "[Database] Skipping migrations in production (set RUN_MIGRATIONS_ON_START=true to enable)."
    );
    migrationsApplied = true;
    return;
  }

  // --- ALTERAÇÃO AQUI: Migrações automáticas desativadas para uso com drizzle-kit push ---
  /*
  try {
    const connection = await mysql.createConnection(connectionString);
    const migratorDb = drizzle(connection);
    await migrate(migratorDb, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    await connection.end();
    migrationsApplied = true;
    logger.info("[Database] Migrations executed successfully");
  } catch (error) {
    logger.error("[Database] Failed to run migrations", { error: (error as Error)?.message });
  }
  */
  
  // Apenas marcamos como true para não travar a lógica
  migrationsApplied = true; 
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      await ensureMigrations(process.env.DATABASE_URL);
      _db = drizzle(process.env.DATABASE_URL);
      await syncSupabaseUsersToDatabase();
      await ensureTicketStatusesSeeded();
      await ensureSuperAdminProfileType();
      await promoteSuperAdminUser();
    } catch (error) {
      logger.warn("[Database] Failed to connect", { error: (error as Error)?.message });
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ? normalizeText(value) : null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    logger.error("[Database] Failed to upsert user", { error: (error as Error)?.message });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PERFIS
// ============================================================================

export async function createProfile(profile: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedProfile = {
    ...profile,
    fullName: normalizeText(profile.fullName),
  };
  
  const result = await db.insert(profiles).values(normalizedProfile);
  return result[0].insertId;
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProfile(id: number, data: Partial<InsertProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedData = {
    ...data,
    ...(data.fullName && { fullName: normalizeText(data.fullName) }),
  };
  
  await db.update(profiles).set(normalizedData).where(eq(profiles.id, id));
}

async function ensureProfileRecord(
  userId: number,
  data: {
    fullName: string;
    nickname?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    departmentId?: number | null;
    profileTypeId?: number | null;
  }
) {
  const db = await getDb();
  if (!db) return;

  const existing = await getProfileByUserId(userId);
  const nickname = resolveNickname(data.fullName, data.nickname ?? undefined);

  const payload = {
    fullName: normalizeText(data.fullName),
    nickname: nickname ? normalizeText(nickname) : null,
    phone: data.phone ?? null,
    avatarUrl: data.avatarUrl ?? null,
    departmentId: data.departmentId ?? null,
    profileTypeId: data.profileTypeId ?? existing?.profileTypeId ?? null,
  };

  if (!existing) {
    await db.insert(profiles).values({
      userId,
      ...payload,
      isActive: true,
      isOnLeave: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.update(profiles).set({
      ...payload,
      updatedAt: new Date(),
    }).where(eq(profiles.id, existing.id));
  }
}

async function syncSupabaseUsersToDatabase() {
  if (supabaseSyncApplied) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const db = await getDb();
  if (!db) return;

  try {
    // Carrega FKs válidas uma vez (evita estourar FK se o banco ainda não está seedado
    // ou se o Supabase tiver IDs que não existem localmente).
    const coerceMetaId = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const departmentRows = await db.select({ id: departments.id }).from(departments);
    const validDepartmentIds = new Set<number>(departmentRows.map((r) => r.id));
    const profileTypeRows = await db.select({ id: userProfileTypes.id }).from(userProfileTypes);
    const validProfileTypeIds = new Set<number>(profileTypeRows.map((r) => r.id));

    const warnedMissingDepartmentIds = new Set<number>();
    const warnedMissingProfileTypeIds = new Set<number>();

    const perPage = 100;
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        perPage,
        page,
      });

      if (error) {
        console.error("[Users Sync] Failed to list Supabase users:", error);
        break;
      }

      const usersFromSupabase = data?.users ?? [];

      for (const supabaseUser of usersFromSupabase) {
        if (!supabaseUser.email) continue;

        await upsertUser({
          openId: supabaseUser.id,
          name: supabaseUser.user_metadata?.fullName ?? supabaseUser.email,
          email: supabaseUser.email,
          role: coerceRole(
            (supabaseUser.app_metadata?.role as string | undefined) ??
              (supabaseUser.user_metadata?.role as string | undefined)
          ),
          lastSignedIn: supabaseUser.last_sign_in_at
            ? new Date(supabaseUser.last_sign_in_at)
            : new Date(),
        });

        const dbUser = await getUserByOpenId(supabaseUser.id);
        if (!dbUser) continue;

        const rawDepartmentId = coerceMetaId(supabaseUser.user_metadata?.departmentId);
        const rawProfileTypeId = coerceMetaId(supabaseUser.user_metadata?.profileTypeId);

        const departmentId =
          rawDepartmentId && validDepartmentIds.has(rawDepartmentId)
            ? rawDepartmentId
            : null;
        const profileTypeId =
          rawProfileTypeId && validProfileTypeIds.has(rawProfileTypeId)
            ? rawProfileTypeId
            : null;

        if (rawDepartmentId && !validDepartmentIds.has(rawDepartmentId) && !warnedMissingDepartmentIds.has(rawDepartmentId)) {
          warnedMissingDepartmentIds.add(rawDepartmentId);
          logger.warn("[Users Sync] departmentId do Supabase não existe em departments (ignorando FK)", {
            userOpenId: supabaseUser.id,
            departmentId: rawDepartmentId,
          });
        }

        if (rawProfileTypeId && !validProfileTypeIds.has(rawProfileTypeId) && !warnedMissingProfileTypeIds.has(rawProfileTypeId)) {
          warnedMissingProfileTypeIds.add(rawProfileTypeId);
          logger.warn("[Users Sync] profileTypeId do Supabase não existe em user_profile_types (ignorando FK)", {
            userOpenId: supabaseUser.id,
            profileTypeId: rawProfileTypeId,
          });
        }

        await ensureProfileRecord(dbUser.id, {
          fullName:
            supabaseUser.user_metadata?.fullName ??
            supabaseUser.email ??
            "Usuário",
          nickname: supabaseUser.user_metadata?.nickname,
          phone: supabaseUser.user_metadata?.phone,
          avatarUrl: supabaseUser.user_metadata?.avatarUrl,
          departmentId,
          profileTypeId,
        });
      }

      if (usersFromSupabase.length < perPage) {
        break;
      }
      page += 1;
    }
  } catch (error: any) {
    if (error?.status === 401) {
      console.warn(
        "[Users Sync] Não foi possível acessar o Supabase Admin. Verifique se a Service Role Key foi configurada."
      );
      disableSupabaseAdmin("Credenciais inválidas para Supabase Admin API.");
    } else {
      console.error("[Users Sync] Unexpected error:", error);
    }
  } finally {
    supabaseSyncApplied = true;
  }
}

// ============================================================================
// GESTÃO DE USUÁRIOS INTERNOS
// ============================================================================

type UserFilters = {
  page: number;
  pageSize: number;
  search?: string;
  email?: string;
  departmentId?: number;
  profileTypeId?: number;
};

type UserInput = {
  fullName: string;
  nickname?: string | null;
  email: string;
  phone?: string | null;
  departmentId?: number | null;
  profileTypeId: number;
  avatar?: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_ROLES: InsertUser["role"][] = ["admin", "SuperAdmin", "gerente", "atendente", "user"];
const DEFAULT_LIST_PAGE_SIZE = 50;
const MAX_LIST_PAGE_SIZE = 10000; // Aumentado para suportar os novos limites da UI (500+)
const IMPORT_FAILURE_THRESHOLD = 0.05; // 5% de falhas aborta e faz rollback
const TICKET_PROTOCOL_MAX_RETRIES = 5;

const resolveNickname = (fullName: string, nickname?: string | null) => {
  if (nickname && nickname.trim().length > 0) {
    return nickname.trim();
  }
  const first = fullName.trim().split(/\s+/)[0];
  return first || fullName;
};

const coerceRole = (role?: string | null): InsertUser["role"] => {
  if (role && ALLOWED_ROLES.includes(role as InsertUser["role"])) {
    return role as InsertUser["role"];
  }
  return "user";
};

function hasSupabaseAdmin(): boolean {
  const client = getSupabaseAdminClient();
  return Boolean(client && ENV.supabaseUrl && ENV.supabaseServiceKey);
}

function buildUserConditions(filters: Partial<UserFilters>) {
  const clauses = [];

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    clauses.push(
      or(
        like(users.name, term),
        like(profiles.fullName, term),
        like(users.email, term)
      )
    );
  }

  if (filters.email) {
    clauses.push(like(users.email, `%${filters.email.trim()}%`));
  }

  if (filters.departmentId) {
    clauses.push(eq(profiles.departmentId, filters.departmentId));
  }

  if (filters.profileTypeId) {
    clauses.push(eq(profiles.profileTypeId, filters.profileTypeId));
  }

  return clauses.length ? and(...clauses) : undefined;
}

function normalizePhoneNumber(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("55") ? digits.slice(2) : digits;
  return `+55${normalized}`;
}

async function maybeUploadAvatar(avatar?: string | null) {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  const base64Match = avatar.match(/^data:(.+);base64,(.+)$/);
  if (!base64Match) {
    return avatar;
  }
  const [, mime, data] = base64Match;

  // Prioriza Supabase Storage
  const supabaseUrl = await uploadAvatarToSupabase(data, mime);
  if (supabaseUrl) {
    return supabaseUrl;
  }

  // Fallback para o antigo storage proxy, se estiver disponível
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[Users] Nenhum storage configurado. Avatar será ignorado.");
    return null;
  }

  try {
    const buffer = Buffer.from(data, "base64");
    const extension = mime.split("/")[1] ?? "png";
    const key = `avatars/${randomUUID()}.${extension}`;
    const { url } = await storagePut(key, buffer, mime);
    return url;
  } catch (error) {
    console.warn("[Users] Falha ao enviar avatar ao storage proxy. Ignorando imagem.", error);
    return null;
  }
}

function mapUserRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    openId: row.openId,
    fullName: row.fullName,
    nickname: row.nickname ?? row.name,
    email: row.email,
    phone: row.phone,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    profileTypeId: row.profileTypeId,
    profileName: row.profileName,
    profileRole: row.profileRole,
    avatarUrl: row.avatarUrl,
    isEmailVerified: row.isEmailVerified ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function fetchProfileType(db: DatabaseInstance, profileTypeId: number) {
  const result = await db
    .select()
    .from(userProfileTypes)
    .where(eq(userProfileTypes.id, profileTypeId))
    .limit(1);
  return result[0];
}

export async function listUserProfileTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(userProfileTypes).orderBy(userProfileTypes.name);
}

export async function upsertUserProfileType(data: {
  id?: number;
  name: string;
  description?: string;
  role: "user" | "admin" | "SuperAdmin" | "gerente" | "atendente";
  permissions: any;
}) {
  const db = await getDb();
  if (!db) return null;

  const { id, ...values } = data;

  if (id) {
    await db
      .update(userProfileTypes)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(userProfileTypes.id, id));
    return { id, ...values };
  } else {
    const [result] = await db.insert(userProfileTypes).values(values);
    return { id: result.insertId, ...values };
  }
}

export async function deleteUserProfileType(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userProfileTypes).where(eq(userProfileTypes.id, id));
}

export async function listSystemUsers(filters: Partial<UserFilters>) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0 };
  }

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(filters.pageSize ?? DEFAULT_PAGE_SIZE, 100);
  const where = buildUserConditions(filters);

  const baseQueryBuilder = db
    .select({
      id: users.id,
      openId: users.openId,
      fullName: profiles.fullName,
      nickname: profiles.nickname,
      name: users.name,
      email: users.email,
      phone: profiles.phone,
      departmentId: profiles.departmentId,
      departmentName: departments.name,
      profileTypeId: profiles.profileTypeId,
      profileName: userProfileTypes.name,
      profileRole: userProfileTypes.role,
      avatarUrl: profiles.avatarUrl,
      isEmailVerified: users.isEmailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(departments, eq(profiles.departmentId, departments.id))
    .leftJoin(userProfileTypes, eq(profiles.profileTypeId, userProfileTypes.id));

  const totalQueryBuilder = db
    .select({ value: sql<number>`count(*)` })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id));

  const paginatedQuery = (where ? baseQueryBuilder.where(where) : baseQueryBuilder)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalQuery = where ? totalQueryBuilder.where(where) : totalQueryBuilder;

  const [items, totalResult] = await Promise.all([paginatedQuery, totalQuery]);
  const total = totalResult[0]?.value ?? 0;
  const mappedItems = items
    .map(mapUserRow)
    .filter((item): item is NonNullable<ReturnType<typeof mapUserRow>> => Boolean(item));

  return {
    items: mappedItems,
    total,
    page,
    pageSize,
  };
}

export async function getUsersByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const client = await getDb();
  if (!client) return [];
  
  return await client
    .select({
      id: users.id,
      email: users.email,
      phone: profiles.phone,
      fullName: profiles.fullName,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(inArray(users.id, ids));
}

export async function getSystemUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: users.id,
      openId: users.openId,
      fullName: profiles.fullName,
      nickname: profiles.nickname,
      name: users.name,
      email: users.email,
      phone: profiles.phone,
      departmentId: profiles.departmentId,
      departmentName: departments.name,
      profileTypeId: profiles.profileTypeId,
      profileName: userProfileTypes.name,
      profileRole: userProfileTypes.role,
      avatarUrl: profiles.avatarUrl,
      isEmailVerified: users.isEmailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(departments, eq(profiles.departmentId, departments.id))
    .leftJoin(userProfileTypes, eq(profiles.profileTypeId, userProfileTypes.id))
    .where(eq(users.id, id))
    .limit(1);

  return mapUserRow(result[0]);
}

export async function createSystemUser(input: UserInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length) {
    throw new Error("EMAIL_IN_USE");
  }

  const profileType = await fetchProfileType(db, input.profileTypeId);
  if (!profileType) {
    throw new Error("PROFILE_TYPE_NOT_FOUND");
  }

  const now = new Date();
  const normalizedPhone = normalizePhoneNumber(input.phone);
  const avatarUrl = await maybeUploadAvatar(input.avatar);
  const nickname = resolveNickname(input.fullName, input.nickname);
  const redirectBase = ENV.appBaseUrl?.replace(/\/$/, "") || "http://localhost:3001";
  const redirectTo = `${redirectBase}/validar-acesso?email=${encodeURIComponent(
    normalizedEmail
  )}&name=${encodeURIComponent(input.fullName)}&profile=${encodeURIComponent(profileType.name)}`;

  let supabaseUserId: string | null = null;
  let inviteLink: string | null = null;
  const hasSupabase = hasSupabaseAdmin();

  if (hasSupabase) {
    const supabase = getSupabaseAdminClient();
    try {
      const metadata = {
        fullName: input.fullName,
        nickname,
        phone: normalizedPhone ?? null,
        departmentId: input.departmentId ?? null,
        profileTypeId: input.profileTypeId,
        profileName: profileType.name,
        avatarUrl,
      };

      // 1. Envia o convite por e-mail (comportamento padrão)
      const { data: inviteData, error: inviteError } = await supabase!.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: metadata,
          redirectTo,
        }
      );

      if (inviteError) {
        if (inviteError.message?.includes("already registered")) {
          throw new Error("EMAIL_IN_USE");
        }
        throw inviteError;
      }

      supabaseUserId = inviteData?.user?.id ?? null;

      // 2. Gera o link de ação para permitir redirecionamento imediato pelo admin se desejado
      const { data: linkData, error: linkError } = await supabase!.auth.admin.generateLink({
        type: 'invite',
        email: normalizedEmail,
        options: {
          data: metadata,
          redirectTo,
        }
      });

      if (!linkError && linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
      }

      if (!supabaseUserId) {
        throw new Error("SUPABASE_USER_NOT_CREATED");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_IN_USE") {
        throw error;
      }
      console.warn("[Users] Failed to create Supabase user, falling back to local user:", error);
    }
  } else {
    console.warn("[Users] Supabase admin credentials missing, creating local user only.");
  }

  if (!supabaseUserId) {
    supabaseUserId = `local-${randomUUID()}`;
  }

  let insertId: number | null = null;
  try {
    const [{ insertId: newId }] = await db.insert(users).values({
      openId: supabaseUserId,
      name: normalizeText(nickname),
      email: normalizedEmail,
      role: profileType.role as InsertUser["role"],
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    });

    insertId = Number(newId);

    await db.insert(profiles).values({
      userId: insertId,
      fullName: normalizeText(input.fullName),
      nickname: normalizeText(nickname),
      phone: normalizedPhone,
      departmentId: input.departmentId ?? null,
      avatarUrl,
      profileTypeId: input.profileTypeId,
      isActive: true,
      isOnLeave: false,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (hasSupabase && supabaseUserId && !supabaseUserId.startsWith("local-")) {
      const supabase = getSupabaseAdminClient();
      await supabase!.auth.admin.deleteUser(supabaseUserId).catch(() => null);
    }
    throw error;
  }

  const user = await getSystemUserById(insertId!);
  return {
    ...user,
    inviteLink,
  };
}

export async function updateSystemUser(id: number, input: UserInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const current = await getSystemUserById(id);
  if (!current) {
    throw new Error("USER_NOT_FOUND");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail !== (current.email ?? "")) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), sql`${users.id} <> ${id}`))
      .limit(1);
    if (existing.length) {
      throw new Error("EMAIL_IN_USE");
    }
  }

  const profileType = await fetchProfileType(db, input.profileTypeId);
  if (!profileType) {
    throw new Error("PROFILE_TYPE_NOT_FOUND");
  }

  const avatarUrl = input.avatar === undefined
    ? current.avatarUrl
    : await maybeUploadAvatar(input.avatar);
  const nickname = resolveNickname(input.fullName, input.nickname);
  const normalizedPhone = normalizePhoneNumber(input.phone);

  let openIdToClear = false;
  if (hasSupabaseAdmin() && current.openId && !current.openId.startsWith("local-")) {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase!.auth.admin.updateUserById(current.openId, {
      email: normalizedEmail,
      phone: normalizedPhone ?? undefined,
      user_metadata: {
        fullName: input.fullName,
        nickname,
        phone: normalizedPhone ?? null,
        departmentId: input.departmentId ?? null,
        profileTypeId: input.profileTypeId,
        avatarUrl,
      },
    });
    if (error) {
      const authError = error as any;
      if (authError?.status === 401) {
        disableSupabaseAdmin("Credenciais inválidas ao atualizar usuário no Supabase.");
        console.warn(
          "[Users] Supabase rejeitou a credencial ao atualizar o usuário. Alterações foram aplicadas somente no banco local."
        );
      } else if (authError?.status === 404 || authError?.message?.includes("User not found")) {
        console.warn(
          `[Users] Usuário ${current.openId} não encontrado no Supabase para o email ${normalizedEmail}. O openId local será removido.`
        );
        openIdToClear = true;
      } else {
        console.error("[Users] Failed to update Supabase user:", error);
        throw new Error("SUPABASE_SYNC_FAILED");
      }
    }
  }

  await db.update(users).set({
    name: normalizeText(nickname),
    email: normalizedEmail,
    role: profileType.role as InsertUser["role"],
    openId: openIdToClear ? `local-${randomUUID()}` : undefined,
    updatedAt: new Date(),
  }).where(eq(users.id, id));

  await db.update(profiles).set({
    fullName: normalizeText(input.fullName),
    nickname: normalizeText(nickname),
    phone: normalizedPhone,
    departmentId: input.departmentId ?? null,
    avatarUrl,
    profileTypeId: input.profileTypeId,
    updatedAt: new Date(),
  }).where(eq(profiles.userId, id));

  return await getSystemUserById(id);
}

export async function deleteSystemUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const target = await getSystemUserById(id);

  await db.delete(users).where(eq(users.id, id));

  if (hasSupabaseAdmin() && target?.openId && !target.openId.startsWith("local-")) {
    const supabase = getSupabaseAdminClient();
    await supabase!.auth.admin.deleteUser(target.openId).catch((err: any) => {
      if (err?.status === 401) {
        disableSupabaseAdmin("Credenciais inválidas ao remover usuário do Supabase.");
      } else {
        console.warn("[Users] Falha ao remover usuário no Supabase:", err);
      }
    });
  }
}

export async function markEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ isEmailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ============================================================================
// DEPARTAMENTOS
// ============================================================================

export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      responsibleUserId: departments.responsibleUserId,
      responsibleUserName: users.name,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
    })
    .from(departments)
    .leftJoin(users, eq(departments.responsibleUserId, users.id))
    .orderBy(departments.name);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDepartment(department: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(departments).values(department);
  return result[0].insertId;
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(departments).where(eq(departments.id, id));
}

export async function toggleDepartmentStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const department = await getDepartmentById(id);
  if (!department) throw new Error("Department not found");
  
  await db
    .update(departments)
    .set({ isActive: !department.isActive })
    .where(eq(departments.id, id));
}

// ============================================================================
// COOPERATIVA
// ============================================================================

function asNull(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function digitsOrTrim(value: string | null | undefined) {
  const v = asNull(value);
  if (!v) return null;
  const digits = v.replace(/\D+/g, "");
  return digits.length > 0 ? digits : v;
}

function normalizeCooperativa(input: Partial<InsertCooperativa>): Partial<InsertCooperativa> {
  const normalizedCnpj = input.cnpj === undefined ? undefined : (digitsOrTrim(input.cnpj) ?? undefined);
  return {
    ...input,
    ...(input.name && { name: normalizeText(input.name) }),
    ...(input.cnpj !== undefined && { cnpj: normalizedCnpj }),
    ...(input.email !== undefined && { email: asNull(input.email)?.toLowerCase() ?? null }),
    ...(input.phone !== undefined && { phone: digitsOrTrim(input.phone) }),
    ...(input.whatsapp !== undefined && { whatsapp: digitsOrTrim(input.whatsapp) }),
    ...(input.street !== undefined && { street: asNull(input.street) }),
    ...(input.addressNumber !== undefined && { addressNumber: asNull(input.addressNumber) }),
    ...(input.neighborhood !== undefined && { neighborhood: asNull(input.neighborhood) }),
    ...(input.complement !== undefined && { complement: asNull(input.complement) }),
    ...(input.city !== undefined && { city: asNull(input.city) }),
    ...(input.state !== undefined && { state: asNull(input.state) }),
    ...(input.zipCode !== undefined && { zipCode: digitsOrTrim(input.zipCode) }),
    ...(input.logoUrl !== undefined && { logoUrl: asNull(input.logoUrl) }),
  };
}

export async function listCooperativas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cooperativas).orderBy(desc(cooperativas.createdAt));
}

export async function getCooperativaByCnpj(cnpj: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(cooperativas)
    .where(eq(cooperativas.cnpj, digitsOrTrim(cnpj) ?? cnpj))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCooperativaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(cooperativas).where(eq(cooperativas.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCooperativa(data: InsertCooperativa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = normalizeCooperativa(data) as InsertCooperativa;
  if (!normalized.cnpj) {
    throw new Error("CNPJ é obrigatório");
  }
  const result = await db
    .insert(cooperativas)
    .values(normalized)
    .onDuplicateKeyUpdate({ set: { ...normalized, updatedAt: new Date() } });

  // Quando há upsert, lastInsertId pode ser 0; recuperar por CNPJ
  const insertedId = result[0]?.insertId;
  if (insertedId && insertedId > 0) return insertedId;
  const existing = await getCooperativaByCnpj(normalized.cnpj ?? data.cnpj);
  return existing?.id ?? null;
}

export async function updateCooperativa(id: number, data: Partial<InsertCooperativa>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = normalizeCooperativa(data);
  await db
    .update(cooperativas)
    .set({ ...normalized, updatedAt: new Date() })
    .where(eq(cooperativas.id, id));
}

export async function deleteCooperativa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cooperativas).where(eq(cooperativas.id, id));
}

export async function getCooperativaStats() {
  const db = await getDb();
  if (!db) {
    return {
      totals: { clientes: 0, ClientesAtivos: 0, contratos: 0 },
      contracts: [] as Array<{ contractId: number; name: string; totalClientes: number; totalAtivos: number }>,
    };
  }

  const [totalClientesRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(clientes);

  const [totalAtivosRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(clientes)
    .where(eq(clientes.status, "ativo"));

  const [totalContractsRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(contracts);

  const contractRows = await db
    .select({
      contractId: contracts.id,
      name: contracts.name,
      totalClientes: sql<number>`COUNT(${clientes.id})`,
      totalAtivos: sql<number>`SUM(CASE WHEN ${clientes.status} = 'ativo' THEN 1 ELSE 0 END)`,
    })
    .from(contracts)
    .leftJoin(clientes, eq(contracts.id, clientes.contractId))
    .groupBy(contracts.id)
    .orderBy(contracts.name);

  return {
    totals: {
      clientes: Number(totalClientesRow?.total ?? 0),
      ClientesAtivos: Number(totalAtivosRow?.total ?? 0),
      contracts: Number(totalContractsRow?.total ?? 0),
    },
    contracts: contractRows.map((row) => ({
      contractId: row.contractId,
      name: row.name,
      totalClientes: Number(row.totalClientes ?? 0),
      totalAtivos: Number(row.totalAtivos ?? 0),
    })),
  };
}

async function getDefaultCooperativaId(dbClient: DatabaseInstance) {
  const row = await dbClient
    .select({ id: cooperativas.id })
    .from(cooperativas)
    .orderBy(cooperativas.id)
    .limit(1);
  return row[0]?.id ?? null;
}

// ============================================================================
// COOPERATIVA - HORÁRIO DE FUNCIONAMENTO
// ============================================================================

const DEFAULT_HOURS: Array<Omit<InsertCooperativaBusinessHour, "cooperativaId">> = [
  { weekday: 0, openTime: "09:00", closeTime: "13:00", isClosed: true },
  { weekday: 1, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 2, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 4, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 5, openTime: "08:00", closeTime: "17:00", isClosed: false },
  { weekday: 6, openTime: "09:00", closeTime: "13:00", isClosed: true },
];

async function ensureBusinessHours(cooperativaId: number, dbClient: DatabaseInstance) {
  const existing = await dbClient
    .select()
    .from(cooperativaBusinessHours)
    .where(eq(cooperativaBusinessHours.cooperativaId, cooperativaId));
  if (existing.length >= 7) return;

  const values = DEFAULT_HOURS.map((h) => ({
    ...h,
    cooperativaId,
  }));

  await dbClient.insert(cooperativaBusinessHours).values(values).onDuplicateKeyUpdate({
    set: {
      openTime: sql`VALUES(openTime)`,
      closeTime: sql`VALUES(closeTime)`,
      isClosed: sql`VALUES(isClosed)`,
      updatedAt: new Date(),
    },
  });
}

export async function listBusinessHours(cooperativaId?: number) {
  const db = await getDb();
  if (!db) return [];
  const coopId = cooperativaId ?? (await getDefaultCooperativaId(db));
  if (!coopId) return [];
  await ensureBusinessHours(coopId, db);
  return await db
    .select()
    .from(cooperativaBusinessHours)
    .where(eq(cooperativaBusinessHours.cooperativaId, coopId))
    .orderBy(cooperativaBusinessHours.weekday);
}

export async function saveBusinessHours(cooperativaId: number, items: Array<InsertCooperativaBusinessHour>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .insert(cooperativaBusinessHours)
        .values({
          cooperativaId,
          weekday: item.weekday,
          openTime: item.openTime ?? null,
          closeTime: item.closeTime ?? null,
          isClosed: item.isClosed ?? false,
        })
        .onDuplicateKeyUpdate({
          set: {
            openTime: item.openTime ?? null,
            closeTime: item.closeTime ?? null,
            isClosed: item.isClosed ?? false,
            updatedAt: new Date(),
          },
        });
    }
  });
}

// ============================================================================
// COOPERATIVA - FERIADOS
// ============================================================================

function computeEaster(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUTC(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseISODateUTC(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function generateNationalHolidays(year: number) {
  const easter = computeEaster(year);
  const fixed = (iso: string) => ({ key: iso, date: parseISODateUTC(iso) });
  const movable = (d: Date) => ({ key: formatDateUTC(d), date: d });

  return [
    { name: "Confraternização Universal", ...fixed(`${year}-01-01`) },
    { name: "Carnaval", ...movable(addDaysUTC(easter, -47)) },
    { name: "Sexta-feira Santa", ...movable(addDaysUTC(easter, -2)) },
    { name: "Tiradentes", ...fixed(`${year}-04-21`) },
    { name: "Dia do Trabalho", ...fixed(`${year}-05-01`) },
    { name: "Corpus Christi", ...movable(addDaysUTC(easter, 60)) },
    { name: "Independência do Brasil", ...fixed(`${year}-09-07`) },
    { name: "Nossa Senhora Aparecida", ...fixed(`${year}-10-12`) },
    { name: "Finados", ...fixed(`${year}-11-02`) },
    { name: "Proclamação da República", ...fixed(`${year}-11-15`) },
    { name: "Natal", ...fixed(`${year}-12-25`) },
  ];
}

async function ensureNationalHolidays(cooperativaId: number, year: number, dbClient: DatabaseInstance) {
  const existing = await dbClient
    .select()
    .from(cooperativaHolidays)
    .where(eq(cooperativaHolidays.cooperativaId, cooperativaId));

  const existingDates = new Set(
    existing.map((h: any) => formatDateUTC(h.date instanceof Date ? h.date : new Date(h.date)))
  );

  const toInsert = generateNationalHolidays(year).filter(
    (h) => !existingDates.has(h.key)
  );

  if (toInsert.length === 0) return;

  await dbClient.insert(cooperativaHolidays).values(
    toInsert.map((h) => ({
      cooperativaId,
      date: h.date,
      name: h.name,
      isNational: true,
      isRecurring: true,
    }))
  );
}

export async function listCooperativaHolidays(cooperativaId?: number, year?: number) {
  const db = await getDb();
  if (!db) return [];
  const coopId = cooperativaId ?? (await getDefaultCooperativaId(db));
  if (!coopId) return [];
  const targetYear = year ?? new Date().getUTCFullYear();
  await ensureNationalHolidays(coopId, targetYear, db);
  return await db
    .select()
    .from(cooperativaHolidays)
    .where(eq(cooperativaHolidays.cooperativaId, coopId))
    .orderBy(cooperativaHolidays.date);
}

export async function createCooperativaHoliday(data: InsertCooperativaHoliday) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cooperativaHolidays).values(data);
  return result[0].insertId;
}

export async function updateCooperativaHoliday(id: number, data: Partial<InsertCooperativaHoliday>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cooperativaHolidays).set({ ...data, updatedAt: new Date() }).where(eq(cooperativaHolidays.id, id));
}

export async function deleteCooperativaHoliday(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cooperativaHolidays).where(eq(cooperativaHolidays.id, id));
}

// ============================================================================
// SETUP TICKETS
// ============================================================================

const COLOR_PALETTE = ["#0ea5e9", "#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#d946ef", "#475569"];

async function pickColor<TTable extends { color: any }>(
  db: Awaited<ReturnType<typeof getDb>>,
  table: { color: any },
  fallback?: string
) {
  if (!db) return fallback ?? "#2563eb";
  const rows = await db.select({ color: (table as any).color }).from(table as any);
  const used = new Set((rows || []).map((r: any) => (r.color ?? "").toLowerCase()).filter(Boolean));
  const available = COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
  if (available) return available;
  // Se todas usadas, gera aleatória (ainda dentro da paleta)
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export async function listTicketStatuses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketStatuses).orderBy(ticketStatuses.name);
}

export async function createTicketStatus(data: InsertTicketStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ticketStatuses).values(data);
  return result[0].insertId;
}

export async function updateTicketStatus(id: number, data: Partial<InsertTicketStatus>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ticketStatuses).set({ ...data, updatedAt: new Date() }).where(eq(ticketStatuses.id, id));
}

export async function deleteTicketStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ticketStatuses).where(eq(ticketStatuses.id, id));
}

export async function listTicketServiceTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketServiceTypes).orderBy(ticketServiceTypes.name);
}

export async function createTicketServiceType(data: InsertTicketServiceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const color = data.color && data.color.trim().length > 0 ? data.color : await pickColor(db, ticketServiceTypes);
  const payload = { ...data, color };
  const result = await db.insert(ticketServiceTypes).values(payload);
  return result[0].insertId;
}

export async function updateTicketServiceType(id: number, data: Partial<InsertTicketServiceType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ticketServiceTypes).set({ ...data, updatedAt: new Date() }).where(eq(ticketServiceTypes.id, id));
}

export async function deleteTicketServiceType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ticketServiceTypes).where(eq(ticketServiceTypes.id, id));
}

export async function listTicketTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketTypes).orderBy(ticketTypes.name);
}

export async function createTicketType(data: InsertTicketType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const color = data.color && data.color.trim().length > 0 ? data.color : await pickColor(db, ticketTypes);
  const isDefault = !!data.isDefault;
  const [result] = await db.insert(ticketTypes).values({ ...data, color, isDefault }).onDuplicateKeyUpdate({ set: { ...data, color, isDefault } });
  const insertedId = result.insertId;
  if (isDefault && insertedId) {
    await db.update(ticketTypes).set({ isDefault: false }).where(ne(ticketTypes.id, insertedId));
    await db.update(ticketTypes).set({ isDefault: true }).where(eq(ticketTypes.id, insertedId));
  }
  return insertedId;
}

export async function updateTicketType(id: number, data: Partial<InsertTicketType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const color = data.color && data.color.trim().length > 0 ? data.color : undefined;
  const isDefault = data.isDefault;
  await db.update(ticketTypes).set({ ...data, ...(color ? { color } : {}), updatedAt: new Date() }).where(eq(ticketTypes.id, id));
  if (isDefault) {
    await db.update(ticketTypes).set({ isDefault: false }).where(ne(ticketTypes.id, id));
    await db.update(ticketTypes).set({ isDefault: true }).where(eq(ticketTypes.id, id));
  }
}

export async function deleteTicketType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ticketTypes).where(eq(ticketTypes.id, id));
}

export async function listTicketCriticities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketCriticities).orderBy(ticketCriticities.name);
}

export async function createTicketCriticity(data: InsertTicketCriticity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const color = data.color && data.color.trim().length > 0 ? data.color : await pickColor(db, ticketCriticities);
  const isDefault = !!data.isDefault;
  const [result] = await db.insert(ticketCriticities).values({ ...data, color, isDefault }).onDuplicateKeyUpdate({ set: { ...data, color, isDefault } });
  const insertedId = result.insertId;
  if (isDefault && insertedId) {
    await db.update(ticketCriticities).set({ isDefault: false }).where(ne(ticketCriticities.id, insertedId));
    await db.update(ticketCriticities).set({ isDefault: true }).where(eq(ticketCriticities.id, insertedId));
  }
  return insertedId;
}

export async function updateTicketCriticity(id: number, data: Partial<InsertTicketCriticity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const color = data.color && data.color.trim().length > 0 ? data.color : undefined;
  const isDefault = data.isDefault;
  await db.update(ticketCriticities).set({ ...data, ...(color ? { color } : {}), updatedAt: new Date() }).where(eq(ticketCriticities.id, id));
  if (isDefault) {
    await db.update(ticketCriticities).set({ isDefault: false }).where(ne(ticketCriticities.id, id));
    await db.update(ticketCriticities).set({ isDefault: true }).where(eq(ticketCriticities.id, id));
  }
}

export async function deleteTicketCriticity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ticketCriticities).where(eq(ticketCriticities.id, id));
}

// ============================================================================
// clientes
// ============================================================================

export async function getAllClientes(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  contractId?: number;
  isCliente?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters?.pageSize ?? DEFAULT_LIST_PAGE_SIZE, 1), MAX_LIST_PAGE_SIZE);

  let query = db
    .select({
      id: clientes.id,
      registrationNumber: clientes.registrationNumber,
      name: clientes.name,
      document: clientes.document,
      isCliente: clientes.isCliente,
      birthDate: clientes.birthDate,
      motherName: clientes.motherName,
      fatherName: clientes.fatherName,
      birthCity: clientes.birthCity,
      birthState: clientes.birthState,
      admissionDate: clientes.admissionDate,
      associationDate: clientes.associationDate,
      terminationDate: clientes.terminationDate,
      position: clientes.position,
      status: clientes.status,
      contractId: clientes.contractId,
      contractName: contracts.name,
      email: clientes.email,
      whatsappNumber: clientes.whatsappNumber,
      secondaryPhone: clientes.secondaryPhone,
      street: clientes.street,
      addressNumber: clientes.addressNumber,
      neighborhood: clientes.neighborhood,
      complement: clientes.complement,
      city: clientes.city,
      state: clientes.state,
      zipCode: clientes.zipCode,
      createdAt: clientes.createdAt,
      updatedAt: clientes.updatedAt,
    })
    .from(clientes)
    .leftJoin(contracts, eq(clientes.contractId, contracts.id));
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(clientes.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      sql`(${clientes.name} LIKE ${`%${filters.search}%`} OR ${clientes.document} LIKE ${`%${filters.search}%`} OR CAST(${clientes.registrationNumber} AS CHAR) LIKE ${`%${filters.search}%`})`
    );
  }
  
  if (filters?.contractId) {
    conditions.push(eq(clientes.contractId, filters.contractId));
  }
  if (filters?.isCliente !== undefined) {
    conditions.push(eq(clientes.isCliente, filters.isCliente));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  if (filters?.pageSize === -1) {
    // Modo "Todos": Retorna tudo sem limit/offset (ordenado por criação descendente)
    return await query.orderBy(desc(clientes.createdAt)).limit(50000); // Limite de segurança razoável
  }

  return await query
    .orderBy(desc(clientes.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClienteByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const digits = phone.replace(/\D/g, "");
  const variants = new Set<string>();
  if (digits) variants.add(digits);
  // sem DDI
  if (DEFAULT_COUNTRY_CODE && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    variants.add(digits.slice(DEFAULT_COUNTRY_CODE.length));
  }
  // últimos 11 dígitos (ex: DDD + número)
  if (digits.length > 11) {
    variants.add(digits.slice(-11));
  }

  // Regra Brasil: se vier sem o '9' depois do DDD, gerar variante com o 9.
  // Ex.: 55 85 96297500 -> gerar 55 85 9 6297500
  // Mantemos o original para match direto (não forçar troca).
  const addNineAfterDdd = (full: string, hasDdi: boolean) => {
    const ddi = hasDdi ? DEFAULT_COUNTRY_CODE : "";
    const body = hasDdi ? full.slice(DEFAULT_COUNTRY_CODE.length) : full;
    if (body.length === 10) {
      const ddd = body.slice(0, 2);
      const rest = body.slice(2);
      variants.add(`${ddi}${ddd}9${rest}`);
    }
  };
  if (DEFAULT_COUNTRY_CODE && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    addNineAfterDdd(digits, true);
  } else {
    addNineAfterDdd(digits, false);
  }

  const variantList = Array.from(variants);
  if (variantList.length === 0) return undefined;

  // Compara por número normalizado no banco (remove +, -, espaço, parênteses).
  const phoneNormalizedExpr = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientePhones.phone}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '')`;
  const coopWhatsExpr = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientes.whatsappNumber}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '')`;
  const variantConditionsPhones =
    variantList.length === 1
      ? [sql`${phoneNormalizedExpr} = ${variantList[0]}`]
      : variantList.map((v) => sql`${phoneNormalizedExpr} = ${v}`);
  const variantConditionsCoop =
    variantList.map((v) => sql`(${coopWhatsExpr} = ${v} OR ${coopWhatsExpr} LIKE ${v + '@%'})`);

  const result = await db
    .select({ Cliente: clientes })
    .from(clientePhones)
    .innerJoin(clientes, eq(clientePhones.clienteId, clientes.id))
    .where(
      and(
        variantConditionsPhones.length === 1 ? variantConditionsPhones[0] : or(...variantConditionsPhones),
        or(eq(clientePhones.isActive, true), isNull(clientePhones.isActive))
      )
    )
    .limit(1);

  if (result.length > 0) return result[0].Cliente;

  // Fallback: procurar direto no whatsappNumber do Cliente (sem depender de cliente_phones)
  const resultCoop = await db
    .select()
    .from(clientes)
    .where(variantConditionsCoop.length === 1 ? variantConditionsCoop[0] : or(...variantConditionsCoop))
    .limit(1);

  return resultCoop.length > 0 ? resultCoop[0] : undefined;
}

export async function findClienteByEmail(email: string): Promise<Cliente | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Tentar busca na tabela cliente_emails (contatos secundários)
  const secondaryResult = await db
    .select({ Cliente: clientes })
    .from(clienteEmails)
    .innerJoin(clientes, eq(clienteEmails.clienteId, clientes.id))
    .where(
      and(
        eq(clienteEmails.email, normalizedEmail),
        eq(clienteEmails.isActive, true)
      )
    )
    .limit(1);

  if (secondaryResult.length > 0) return secondaryResult[0].Cliente as Cliente;

  // 2. Fallback para busca direta na tabela clientes (contato principal)
  const result = await db
    .select()
    .from(clientes)
    .where(eq(clientes.email, normalizedEmail))
    .limit(1);

  return result.length > 0 ? (result[0] as Cliente) : undefined;
}

export async function findOpenTicketByExternalIdentifier(identifier: string, channel: 'whatsapp' | 'email' | 'interno') {
  const db = await getDb();
  if (!db) return null;

  const statusOpen = [
    "aguardando_atendimento",
    "em_atendimento",
    "em_espera",
    "aguardando_resposta",
  ] as const;

  // Primeiro tenta buscar pelo campo externalIdentifier
  const res = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.channel, channel),
        eq(tickets.externalIdentifier, identifier),
        inArray(tickets.status, statusOpen as any)
      )
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(1);

  if (res.length > 0) return res[0];

  // Fallback para WhatsApp: Se for telefone, tentar a lógica antiga de buscar na descrição se não achar no externalIdentifier
  // Isso ajuda na transição de tickets antigos
  if (channel === 'whatsapp') {
    const digits = identifier.replace(/\D/g, "");
    if (digits) {
      const resOld = await db
        .select()
        .from(tickets)
        .where(
          and(
            inArray(tickets.status, statusOpen as any),
            or(
              like(tickets.description, `%tel:${digits}%`),
              like(tickets.description, `%wa_id:${digits}%`),
              like(tickets.description, `%display:${digits}%`)
            )
          )
        )
        .orderBy(desc(tickets.updatedAt))
        .limit(1);
      
      if (resOld.length > 0) return resOld[0];
    }
  }

  return null;
}

export async function findOpenTicketByCoordinator(clienteId: number) {
  const dbClient = await getDb();
  if (!dbClient) return null;

  const statusOpen = [
    "aguardando_atendimento",
    "em_atendimento",
    "em_espera",
    "aguardando_resposta",
  ] as const;

  // Prioridade 1: Ticket onde o coordenador foi RECIPIENTE de uma mensagem recente
  // Isso ajuda a manter a conversa na janela correta se o atendente iniciou o papo
  const recentInteraction = await dbClient
    .select({ ticketId: ticketMessages.ticketId })
    .from(ticketMessages)
    .innerJoin(tickets, eq(ticketMessages.ticketId, tickets.id))
    .where(
      and(
        eq(ticketMessages.recipientclienteId, clienteId),
        inArray(tickets.status, statusOpen as any)
      )
    )
    .orderBy(desc(ticketMessages.createdAt))
    .limit(1);

  if (recentInteraction.length > 0) {
    const t = await getTicketById(recentInteraction[0].ticketId);
    if (t) return t;
  }

  // Prioridade 2: Busca tickets abertos vinculados a contratos onde o clienteId é o coordenador (Legado)
  const res = await dbClient
    .select({ ticket: tickets })
    .from(tickets)
    .innerJoin(contracts, eq(tickets.contractId, (contracts as any).id))
    .where(
      and(
        eq((contracts as any).coordinatorclienteId, clienteId),
        inArray(tickets.status, statusOpen as any)
      )
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(1);

  return res.length > 0 ? res[0].ticket : null;
}


/**
 * Verifica se já existe um Cliente com o mesmo CPF, matrícula ou telefone
 */
async function validateClienteUniqueness(data: {
  id?: number;
  document?: string;
  registrationNumber?: number;
  whatsappNumber?: string;
  secondaryPhone?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const conditions = [];
  
  // CPF
  if (data.document) {
    const doc = normalizeText(data.document);
    conditions.push({
      field: clientes.document,
      value: doc,
      error: "CPF já cadastrado para outro Cliente",
    });
  }

  // Matrícula
  if (data.registrationNumber) {
    conditions.push({
      field: clientes.registrationNumber,
      value: data.registrationNumber,
      error: "Matrícula já cadastrada para outro Cliente",
    });
  }

  // Telefones no cadastro principal
  const phonesToCheck = [data.whatsappNumber, data.secondaryPhone].filter(Boolean);
  
  for (const cond of conditions) {
    const query = db.select({ id: clientes.id }).from(clientes).where(
      and(
        eq(cond.field, cond.value),
        data.id ? ne(clientes.id, data.id) : undefined
      )
    ).limit(1);
    
    const existing = await query;
    if (existing.length > 0) {
      throw new Error(cond.error);
    }
  }

  // Verificação de telefones cruzada (campo principal vs outros clientes e vs cliente_phones)
  for (const phone of phonesToCheck) {
    if (!phone) continue;
    const digits = phone.replace(/\D/g, "");
    if (!digits) continue;

    // Busca no cadastro principal de outros clientes
    const existingMain = await db.select({ id: clientes.id }).from(clientes).where(
      and(
        or(
          sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientes.whatsappNumber}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') = ${digits}`,
          sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientes.secondaryPhone}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') = ${digits}`
        ),
        data.id ? ne(clientes.id, data.id) : undefined
      )
    ).limit(1);

    if (existingMain.length > 0) {
      throw new Error(`O telefone ${phone} já está cadastrado para outro Cliente`);
    }

    // Busca na tabela secundária de telefones
    const existingSecondary = await db.select({ id: clientePhones.clienteId }).from(clientePhones).where(
      and(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientePhones.phone}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') = ${digits}`,
        data.id ? ne(clientePhones.clienteId, data.id) : undefined
      )
    ).limit(1);

    if (existingSecondary.length > 0) {
      throw new Error(`O telefone ${phone} já está cadastrado para outro Cliente`);
    }
  }
}

export async function findOpenTicketByPhone(phone: string) {
  return findOpenTicketByExternalIdentifier(phone, 'whatsapp');
}

export async function createCliente(Cliente: InsertCliente & { additionalPhones?: string[], additionalEmails?: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { additionalPhones, additionalEmails, ...data } = Cliente;

  // Regra de Negócio: Contrato obrigatório para clientes
  if (data.isCliente && !data.contractId) {
    throw new Error("Contrato é obrigatório para clientes");
  }

  // Validar unicidade
  await validateClienteUniqueness({
    document: data.document,
    registrationNumber: data.registrationNumber || undefined,
    whatsappNumber: data.whatsappNumber ?? undefined,
    secondaryPhone: data.secondaryPhone ?? undefined,
  });

  const result = await db.insert(clientes).values(data);
  const id = result[0].insertId;

  if (id) {
    // Sincronizar contatos adicionais
    if (additionalPhones) await syncclientePhones(id, additionalPhones);
    if (additionalEmails) await syncclienteEmails(id, additionalEmails);
  }

  return id;
}

export async function updateCliente(id: number, data: Partial<InsertCliente> & { additionalPhones?: string[], additionalEmails?: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { additionalPhones, additionalEmails, ...updateData } = data;

  // Regra de Negócio: Contrato obrigatório para clientes
  if (updateData.isCliente === true && !updateData.contractId) {
    // Se estiver tentando transformar em Cliente sem contrato, ou atualizar dados de Cliente removendo contrato
    throw new Error("Contrato é obrigatório para clientes");
  }
  
  if (updateData.isCliente === undefined && updateData.contractId === null) {
     // Caso especial: se já for Cliente e tentar remover o contrato
     const existing = await getClienteById(id);
     if (existing?.isCliente && !updateData.contractId) {
        throw new Error("Contrato é obrigatório para clientes");
     }
  }

  // Validar unicidade se campos relevantes forem fornecidos
  await validateClienteUniqueness({
    id,
    document: updateData.document,
    registrationNumber: updateData.registrationNumber || undefined,
    whatsappNumber: updateData.whatsappNumber ?? undefined,
    secondaryPhone: updateData.secondaryPhone ?? undefined,
  });

  if (Object.keys(updateData).length > 0) {
    await db.update(clientes).set(updateData).where(eq(clientes.id, id));
  }

  // Sincronizar contatos adicionais
  if (additionalPhones !== undefined) await syncclientePhones(id, additionalPhones);
  if (additionalEmails !== undefined) await syncclienteEmails(id, additionalEmails);
}

export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clientes).where(eq(clientes.id, id));
}

export async function deleteClienteWithHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    // 1. Limpar referências em contratos (onde ele é coordenador)
    await tx.update(contracts)
      .set({ coordinatorclienteId: null })
      .where(eq(contracts.coordinatorclienteId, id));

    // 2. Limpar referências em contratos (vínculo direto)
    await tx.update(contracts)
      .set({ clienteId: null })
      .where(eq(contracts.clienteId, id));

    // 3. Excluir mensagens onde ele é o destinatário (recipientclienteId)
    // Mensagens normais de tickets são deletadas em cascata ao deletar o ticket
    await tx.delete(ticketMessages).where(eq(ticketMessages.recipientclienteId, id));

    // 4. Pesquisas CSAT (também tem cascade com tickets, mas vamos garantir o que for direto)
    await tx.delete(csatSurveys).where(eq(csatSurveys.clienteId, id));

    // 5. Excluir Tickets associados
    // Ao deletar o ticket, mensagens, histórico, time tracking e csat (referenciando o ticket) caem em cascata (se configurado)
    // No schema, ticketMessages, ticketHistory, ticketTimeTracking e csatSurveys tem cascade para ticketId.
    await tx.delete(tickets).where(eq(tickets.clienteId, id));
    
    // 6. Finalmente excluir o Cliente
    // Telefones, e-mails e dados bancários já tem cascade no schema para clienteId
    await tx.delete(clientes).where(eq(clientes.id, id));
  });
}

// ============================================================================
// TELEFONES DE clientes
// ============================================================================

export async function getclientePhones(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clientePhones)
    .where(eq(clientePhones.clienteId, clienteId))
    .orderBy(desc(clientePhones.createdAt));
}

export async function addclientePhone(phone: InsertclientePhone) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedPhone = phone.phone?.replace(/\D/g, "");

  // Verifica se já existe para este Cliente
  const existing = await db
    .select()
    .from(clientePhones)
    .where(and(
      eq(clientePhones.clienteId, phone.clienteId),
      // Comparação normalizada para evitar duplicatas por formatação
      sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${clientePhones.phone}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') = ${normalizedPhone}`
    ))
    .limit(1);

  if (existing.length > 0) {
    if (!existing[0].isActive) {
      await db.update(clientePhones).set({ isActive: true }).where(eq(clientePhones.id, existing[0].id));
    }
    return existing[0].id;
  }

  // Validar unicidade (se pertence a outro Cliente)
  if (phone.phone) {
    await validateClienteUniqueness({
      id: phone.clienteId,
      whatsappNumber: phone.phone,
    });
  }

  const result = await db.insert(clientePhones).values(phone);
  
  // Vinculação retroativa para o novo telefone
  if (phone.phone && phone.clienteId) {
    await linkTicketsToCliente(phone.clienteId, [phone.phone]);
  }
  
  return result[0].insertId;
}

export async function updateclientePhone(id: number, data: Partial<InsertclientePhone>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Se o número mudou, validar unicidade
  if (data.phone) {
    const existing = await db.select().from(clientePhones).where(eq(clientePhones.id, id)).limit(1);
    if (existing.length > 0) {
      await validateClienteUniqueness({
        id: existing[0].clienteId,
        whatsappNumber: data.phone,
      });
    }
  }
  
  await db.update(clientePhones).set(data).where(eq(clientePhones.id, id));

  // Se o número mudou ou foi ativado, tenta vincular
  if (data.phone) {
    const existing = await db.select().from(clientePhones).where(eq(clientePhones.id, id)).limit(1);
    if (existing.length > 0) {
      await linkTicketsToCliente(existing[0].clienteId, [data.phone]);
    }
  }
}

// ============================================================================
// EMAILS DE clientes
// ============================================================================

export async function getclienteEmails(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clienteEmails).where(eq(clienteEmails.clienteId, clienteId));
}

export async function addclienteEmail(email: InsertclienteEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedEmail = email.email.trim().toLowerCase();
  
  // Verifica se já existe para este Cliente
  const existing = await db
    .select()
    .from(clienteEmails)
    .where(and(eq(clienteEmails.clienteId, email.clienteId), eq(clienteEmails.email, normalizedEmail)))
    .limit(1);

  if (existing.length > 0) {
    if (!existing[0].isActive) {
      await db.update(clienteEmails).set({ isActive: true }).where(eq(clienteEmails.id, existing[0].id));
    }
    return existing[0].id;
  }

  const result = await db.insert(clienteEmails).values({
    ...email,
    email: normalizedEmail
  });
  return result[0].insertId;
}

// ============================================================================
// SINCRONIZAÇÃO DE CONTATOS (BATCH)
// ============================================================================

export async function syncclientePhones(clienteId: number, phones: string[]) {
  const db = await getDb();
  if (!db) return;

  const currentPhones = await getclientePhones(clienteId);
  const normalizedNewPhones = phones.map(p => p.replace(/\D/g, "")).filter(Boolean);
  const currentNormalized = currentPhones.map(p => p.phone.replace(/\D/g, ""));

  // 1. Desativar telefones que não estão na nova lista
  for (const cp of currentPhones) {
    if (!normalizedNewPhones.includes(cp.phone.replace(/\D/g, ""))) {
      await db.update(clientePhones).set({ isActive: false }).where(eq(clientePhones.id, cp.id));
    }
  }

  // 2. Adicionar novos telefones
  for (const phone of normalizedNewPhones) {
    if (!currentNormalized.includes(phone)) {
      await addclientePhone({
        clienteId,
        phone,
        phoneType: "secundario",
        isActive: true
      });
    } else {
      // Reativar se existir
      const existing = currentPhones.find(p => p.phone.replace(/\D/g, "") === phone);
      if (existing && !existing.isActive) {
        await db.update(clientePhones).set({ isActive: true }).where(eq(clientePhones.id, existing.id));
      }
    }
  }
}

export async function syncclienteEmails(clienteId: number, emails: string[]) {
  const db = await getDb();
  if (!db) return;

  const currentEmails = await getclienteEmails(clienteId);
  const normalizedNewEmails = emails.map(e => e.trim().toLowerCase()).filter(Boolean);
  const currentNormalized = currentEmails.map(e => e.email.trim().toLowerCase());

  // 1. Desativar e-mails que não estão na nova lista
  for (const ce of currentEmails) {
    if (!normalizedNewEmails.includes(ce.email.trim().toLowerCase())) {
      await db.update(clienteEmails).set({ isActive: false }).where(eq(clienteEmails.id, ce.id));
    }
  }

  // 2. Adicionar novos e-mails
  for (const email of normalizedNewEmails) {
    if (!currentNormalized.includes(email)) {
      await addclienteEmail({
        clienteId,
        email,
        isActive: true
      });
    } else {
      // Reativar se existir
      const existing = currentEmails.find(e => e.email.trim().toLowerCase() === email);
      if (existing && !existing.isActive) {
        await db.update(clienteEmails).set({ isActive: true }).where(eq(clienteEmails.id, existing.id));
      }
    }
  }
}

// ============================================================================
// DADOS BANCÁRIOS
// ============================================================================

export async function getClienteBankData(clienteId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(ClienteBankData)
    .where(eq(ClienteBankData.clienteId, clienteId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertClienteBankData(data: InsertClienteBankData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Regra de negócio: Banco 450 -> OwlBank
  const bankData = {
    ...data,
    bankName: data.bankCode === "450" ? "OwlBank" : data.bankName,
  };
  
  const existing = await getClienteBankData(bankData.clienteId);
  
  if (existing) {
    await db.update(ClienteBankData).set(bankData).where(eq(ClienteBankData.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(ClienteBankData).values(bankData);
    return result[0].insertId;
  }
}

// ============================================================================
// CONTRATOS
// ============================================================================

export async function getAllContracts(filters?: {
  status?: string;
  clienteId?: number;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters?.pageSize ?? DEFAULT_LIST_PAGE_SIZE, 1), MAX_LIST_PAGE_SIZE);

  let query = db
    .select({
      id: (contracts as any).id,
      name: (contracts as any).name,
      city: (contracts as any).city,
      state: (contracts as any).state,
      status: (contracts as any).status,
      isSpecial: (contracts as any).isSpecial,
      coordinatorName: clientes.name,
    })
    .from(contracts)
    .leftJoin(clientes, eq(contracts.coordinatorclienteId, clientes.id));
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(contracts.status, filters.status as any));
  }
  if (filters?.clienteId) {
    conditions.push(eq(contracts.clienteId, filters.clienteId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query
    .orderBy(desc(contracts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      id: (contracts as any).id,
      name: (contracts as any).name,
      city: (contracts as any).city,
      state: (contracts as any).state,
      status: (contracts as any).status,
      isSpecial: (contracts as any).isSpecial,
      coordinatorclienteId: (contracts as any).coordinatorclienteId,
      coordinatorName: (clientes as any).name,
    })
    .from(contracts)
    .leftJoin(clientes, eq((contracts as any).coordinatorclienteId, clientes.id))
    .where(eq((contracts as any).id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
export async function getSpecialContract() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      id: (contracts as any).id,
      name: (contracts as any).name,
      isSpecial: (contracts as any).isSpecial,
      coordinatorclienteId: (contracts as any).coordinatorclienteId,
      coordinatorName: (clientes as any).name,
    })
    .from(contracts)
    .leftJoin(clientes, eq((contracts as any).coordinatorclienteId, clientes.id))
    .where(eq((contracts as any).isSpecial, true))
    .limit(1);
    
  return result.length > 0 ? (result[0] as any) : undefined;
}

/**
 * Garante que existam configurações válidas (Contrato, Departamento e Motivo) 
 * para a criação de um ticket automático, prevenindo perda de mensagens.
 */
export async function ensureDefaultTicketConfig(overrides?: { 
  contractId?: number, 
  departmentId?: number, 
  reasonId?: number 
}) {
  const dbClient = await getDb();
  if (!dbClient) throw new Error("Database not available");

  // 1. RESOLVER CONTRATO
  let contractId = overrides?.contractId;
  if (!contractId) {
    const special = await getSpecialContract();
    if (special) {
      contractId = (special as any).id;
    } else {
      const all = await dbClient.select({ id: contracts.id }).from(contracts).where(eq(contracts.status, "ativo")).limit(1);
      contractId = all[0]?.id;
    }
  }
  // Fallback absoluto se nenhum contrato ativo existir
  if (!contractId) {
    const fallback = await dbClient.select({ id: contracts.id }).from(contracts).limit(1);
    contractId = fallback[0]?.id;
    
    if (!contractId) {
      // Criar contrato padrão se o banco estiver vazio
      try {
        contractId = await createContract({
          name: "Contrato Padrão (Auto)",
          city: "Natal",
          state: "RN",
          status: "ativo",
          isSpecial: false
        } as any);
      } catch (e) {
        console.error("[Database] Erro ao auto-criar contrato padrão", e);
      }
    }
  }

  // 2. RESOLVER DEPARTAMENTO
  let departmentId = overrides?.departmentId;
  if (!departmentId) {
    const depts = await getAllDepartments();
    const atendimento = depts.find(d => d.name?.toLowerCase() === "atendimento");
    if (atendimento) {
      departmentId = atendimento.id;
    } else if (depts.length > 0) {
      departmentId = depts[0].id;
    } else {
      // Criar departamento de Atendimento se o banco estiver vazio
      departmentId = await createDepartment({
        name: "Atendimento",
        description: "Departamento padrão criado automaticamente",
        isActive: true
      } as any);
    }
  }

  // 3. RESOLVER MOTIVO
  let reasonId = overrides?.reasonId;
  if (!reasonId) {
    const reasons = await getAllAttendanceReasons();
    const defaultReason = reasons.find(r => 
      r.name === "Atendimento WhatsApp" || 
      r.name === "Atendimento Automático" || 
      r.name === "Geral"
    );
    
    if (defaultReason) {
      reasonId = defaultReason.id;
    } else if (reasons.length > 0) {
      reasonId = reasons[0].id;
    } else {
      // Criar motivo padrão se não houver nenhum
      reasonId = await createAttendanceReason({
        name: "Atendimento Automático",
        description: "Motivo padrão para integração",
        slaMinutes: 2880,
        isActive: true
      } as any);
    }
  }

  if (!contractId || !departmentId || !reasonId) {
    logger.error("[Database] Falha crítica ao resolver defaults para ticket", { contractId, departmentId, reasonId });
    throw new Error("Não foi possível determinar configurações mínimas para criar o ticket.");
  }

  return { contractId, departmentId, reasonId };
}

export async function createContract(contract: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Importar funções de geração de ID
  const { generateContractId, extractSequentialFromContractId } = await import('../shared/ufCodes');
  
  // Buscar o último contrato da mesma UF para gerar o próximo sequencial
  const existingContractsFromState = await db.select()
    .from(contracts)
    .where(eq(contracts.state, contract.state))
    .orderBy(desc(contracts.id));
  
  let nextSequential = 1;
  if (existingContractsFromState.length > 0) {
    try {
      const lastSequential = extractSequentialFromContractId(existingContractsFromState[0].id);
      nextSequential = lastSequential + 1;
    } catch {
      // Se não conseguir extrair, começa do 1
      nextSequential = 1;
    }
  }
  
  // Gerar ID personalizado e verificar se já existe (loop até encontrar ID disponível)
  let customId: number;
  let attempts = 0;
  const maxAttempts = 999; // Máximo de contratos por UF
  
  while (attempts < maxAttempts) {
    customId = generateContractId(contract.state, nextSequential);
    
    // Verificar se o ID já existe
    const existing = await db.select()
      .from(contracts)
      .where(eq(contracts.id, customId))
      .limit(1);
    
    if (existing.length === 0) {
      // ID disponível, pode inserir
      break;
    }
    
    // ID já existe, incrementar e tentar novamente
    nextSequential++;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error(`Não foi possível gerar um ID único para o estado ${contract.state}. Limite de contratos atingido.`);
  }
  
  // Inserir com ID personalizado
  await db.insert(contracts).values({
    ...contract,
    id: customId!,
  });
  
  return customId!;
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contracts).set(data).where(eq(contracts.id, id));
}

export async function deleteContract(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se é contrato especial
  const contract = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (contract.length > 0 && contract[0].isSpecial) {
    throw new Error("Não é possível excluir contrato especial");
  }
  
  await db.delete(contracts).where(eq(contracts.id, id));
}

// ============================================================================
// MOTIVOS DE ATENDIMENTO
// ============================================================================

function generateAcronym(name?: string | null) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const word = parts[0];
    return word.slice(0, 4).toUpperCase();
  }
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("");
  return initials.slice(0, 6);
}

export async function getAllAttendanceReasons() {
  const db = await getDb();
  if (!db) return [];
  
  const rows = await db
    .select({
      reason: attendanceReasons,
      slaMinutes: attendanceReasons.slaMinutes,
      departmentName: departments.name,
    })
    .from(attendanceReasons)
    .leftJoin(departments, eq(departments.id, attendanceReasons.departmentId))
    .orderBy(attendanceReasons.name);

  return rows.map((r) => ({
    ...(r.reason || {}),
    slaMinutes: r.slaMinutes,
    departmentName: r.departmentName,
  }));
}

export async function getAttendanceReasonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      reason: attendanceReasons,
      slaMinutes: attendanceReasons.slaMinutes,
      departmentName: departments.name,
    })
    .from(attendanceReasons)
    .leftJoin(departments, eq(departments.id, attendanceReasons.departmentId))
    .where(eq(attendanceReasons.id, id))
    .limit(1);

  const row = result[0];
  if (!row) return undefined;
  return {
    ...(row.reason || {}),
    slaMinutes: row.slaMinutes,
    departmentName: row.departmentName,
  };
}

export async function createAttendanceReason(reason: InsertAttendanceReason) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const color =
    reason.color && reason.color.trim().length > 0
      ? reason.color
      : await pickColor(db, attendanceReasons, "#2563eb");

  const acronym = reason.acronym && reason.acronym.trim().length > 0
    ? reason.acronym.trim().toUpperCase()
    : generateAcronym(reason.name);

  const payload: InsertAttendanceReason = {
    ...reason,
    acronym,
    color,
    // slaHours armazena minutos (por compatibilidade). Se vier slaHours, usar; senão slaMinutes? handled na camada de rota.
  };
  
  const result = await db.insert(attendanceReasons).values(payload);
  return result[0].insertId;
}

export async function updateAttendanceReason(id: number, data: Partial<InsertAttendanceReason>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAttendanceReasonById(id);
  if (!existing) throw new Error("Motivo não encontrado");

  const color =
    data.color === undefined
      ? existing.color
      : data.color && data.color.trim().length > 0
        ? data.color
        : await pickColor(db, attendanceReasons, "#2563eb");

  const acronym =
    data.acronym === undefined
      ? existing.acronym
      : data.acronym && data.acronym.trim().length > 0
        ? data.acronym.trim().toUpperCase()
        : generateAcronym(data.name ?? existing.name);

  const payload: Partial<InsertAttendanceReason> = {
    ...data,
    acronym,
    color,
  };
  
  await db.update(attendanceReasons).set(payload).where(eq(attendanceReasons.id, id));
}

export async function deleteAttendanceReason(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(attendanceReasons).set({ isActive: false }).where(eq(attendanceReasons.id, id));
}

// ============================================================================
// TICKETS
// ============================================================================

export async function getDashboardMetrics(filters: {
  period: DashboardPeriod;
  assignedTo?: number;
  departmentId?: number;
}) {
  const db = await getDb();
  if (!db) return {
    period: filters.period,
    dateFrom: null,
    dateTo: null,
    statusCounts: {},
    flowSeries: [],
    byContract: [],
    byReason: [],
    workingDays: [1, 2, 3, 4, 5],
    totals: { tickets: 0, clientes: 0, contracts: 0 },
  };

  const { dateFrom, dateTo } = resolvePeriodRange(filters.period ?? "diario");

  const tzOffset = "-03:00";
  const adjustedCreatedAt = sql<string>`CONVERT_TZ(${tickets.createdAt}, '+00:00', ${tzOffset})`;

  const conditions = [];
  if (dateFrom) conditions.push(gte(adjustedCreatedAt, dateFrom.toISOString().replace('T', ' ').replace('Z', '')));
  if (dateTo) conditions.push(lte(adjustedCreatedAt, dateTo.toISOString().replace('T', ' ').replace('Z', '')));
  if (filters.assignedTo) conditions.push(eq(tickets.assignedTo, filters.assignedTo));
  if (filters.departmentId) conditions.push(eq(tickets.currentDepartmentId, filters.departmentId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const csatConditions = [];
  if (dateFrom) csatConditions.push(gte(sql`CONVERT_TZ(${tickets.createdAt}, '+00:00', ${tzOffset})`, dateFrom.toISOString().replace('T', ' ').replace('Z', '')));
  if (dateTo) csatConditions.push(lte(sql`CONVERT_TZ(${tickets.createdAt}, '+00:00', ${tzOffset})`, dateTo.toISOString().replace('T', ' ').replace('Z', '')));
  if (filters.assignedTo) csatConditions.push(eq(tickets.assignedTo, filters.assignedTo));
  if (filters.departmentId) csatConditions.push(eq(tickets.currentDepartmentId, filters.departmentId));
  const csatWhere = csatConditions.length > 0 ? and(...csatConditions) : undefined;

  try {
    const tzOffset = "-03:00";
    const adjustedCreatedAt = sql`CONVERT_TZ(${tickets.createdAt}, '+00:00', ${tzOffset})`;

    const flowBucket =
      filters.period === "diario" || filters.period === "ontem"
        ? sql<string>`LPAD(HOUR(${adjustedCreatedAt}), 2, '0')`
        : filters.period === "mensal"
          ? sql<string>`DATE_FORMAT(${adjustedCreatedAt}, '%Y-%m-01')`
          : filters.period === "anual"
            ? sql<string>`YEAR(${adjustedCreatedAt})`
            : sql<string>`DATE_FORMAT(${adjustedCreatedAt}, '%Y-%m-%d')`;

    const statusQuery = db
      .select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.status);

    const flowQuery = db
      .select({
        bucket: flowBucket,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(flowBucket)
      .orderBy(flowBucket);

    const effectiveCity = sql<string>`COALESCE(NULLIF(${contracts.city}, 'N/A'), ${clientes.city}, 'Sem Cidade')`;
    const effectiveState = sql<string>`COALESCE(NULLIF(${contracts.state}, 'NA'), ${clientes.state}, 'NA')`;

    const contractQuery = db
      .select({
        contractId: contracts.id,
        contractName: contracts.name,
        city: effectiveCity,
        state: effectiveState,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(contracts, eq(contracts.id, tickets.contractId))
      .leftJoin(clientes, eq(clientes.id, tickets.clienteId))
      .where(whereClause)
      .groupBy(contracts.id, effectiveCity, effectiveState);

    const reasonQuery = db
      .select({
        reasonId: attendanceReasons.id,
        reasonName: attendanceReasons.name,
        reasonAcronym: attendanceReasons.acronym,
        reasonColor: attendanceReasons.color,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
      .where(whereClause)
      .groupBy(attendanceReasons.id);

    const totalTicketsQuery = db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(whereClause);

    const avgTmaQuery = db
      .select({
        avgMinutes: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${tickets.openedAt}, COALESCE(${tickets.closedAt}, ${tickets.updatedAt}, NOW())))`,
      })
      .from(tickets)
      .where(whereClause);

    const csatQuery = db
      .select({
        rating: csatSurveys.rating,
        count: sql<number>`COUNT(*)`,
      })
      .from(csatSurveys)
      .leftJoin(tickets, eq(tickets.id, csatSurveys.ticketId))
      .where(csatWhere)
      .groupBy(csatSurveys.rating);

    const matrixQuery = db
      .select({
        contractId: contracts.id,
        contractName: contracts.name,
        reasonId: attendanceReasons.id,
        reasonAcronym: attendanceReasons.acronym,
        reasonName: attendanceReasons.name,
        reasonColor: attendanceReasons.color,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(contracts, eq(contracts.id, tickets.contractId))
      .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
      .where(whereClause)
      .groupBy(contracts.id, attendanceReasons.id);

    const [statusCounts, flowSeries, byContract, byReason, totalTicketsRow, ClientesRow, contractsRow, tmaRow, csatRows, matrixRows] =
      await Promise.all([
        statusQuery,
        flowQuery,
        contractQuery,
        reasonQuery,
        totalTicketsQuery,
        db.select({ count: sql<number>`COUNT(*)` }).from(clientes),
        db.select({ count: sql<number>`COUNT(*)` }).from(contracts),
        avgTmaQuery,
        csatQuery,
        matrixQuery,
      ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = row.count ?? 0;
    }

    const csatStats: Record<string, number> = {};
    let csatTotal = 0;
    for (const row of csatRows) {
      const key = row.rating === null || row.rating === undefined ? "na" : String(row.rating);
      csatStats[key] = row.count ?? 0;
      csatTotal += row.count ?? 0;
    }

    // Buscar dias úteis da cooperativa
    const businessHours = await db.select().from(cooperativaBusinessHours).where(eq(cooperativaBusinessHours.cooperativaId, 1));
    const workingDays = businessHours.filter(bh => !bh.isClosed).map(bh => bh.weekday);

    return {
      period: filters.period,
      dateFrom,
      dateTo,
      workingDays: workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5],
      statusCounts: statusMap,
      flowSeries: flowSeries.map((row) => ({
        bucket: row.bucket,
        count: row.count ?? 0,
      })),
      byContract: byContract.map((row) => ({
        contractId: row.contractId,
        contractName: row.contractName,
        city: row.city,
        state: row.state,
        count: row.count ?? 0,
      })),
      byReason: byReason.map((row) => ({
        reasonId: row.reasonId,
        reasonName: row.reasonName,
        reasonAcronym: row.reasonAcronym,
        reasonColor: row.reasonColor,
        count: row.count ?? 0,
      })),
      totals: {
        tickets: totalTicketsRow?.[0]?.count ?? 0,
        clientes: ClientesRow?.[0]?.count ?? 0,
        contracts: contractsRow?.[0]?.count ?? 0,
      },
      metrics: {
        tmaMinutes: tmaRow?.[0]?.avgMinutes ?? null,
        csat: {
          total: csatTotal,
          ratings: csatStats,
        },
      },
      matrix: matrixRows,
    };
  } catch (error) {
    logger.error("[Dashboard] Falha ao obter métricas", { error: (error as Error)?.message });
    return {
      period: filters.period,
      dateFrom,
      dateTo,
      statusCounts: {},
      flowSeries: [],
      byContract: [],
      byReason: [],
      totals: { tickets: 0, clientes: 0, contracts: 0 },
      metrics: { tmaMinutes: null, csat: { total: 0, ratings: {} } },
      matrix: [],
    };
  }
}

export async function getPeriodicReportMetrics(filters: {
  period: DashboardPeriod;
  dateFrom: Date;
  dateTo: Date;
}) {
  const dbClient = await getDb();
  if (!dbClient) return null;

  const { dateFrom, dateTo, period } = filters;

  const tzOffset = "-03:00";
  const adjustedOpenedAt = sql<string>`CONVERT_TZ(${tickets.openedAt}, '+00:00', ${tzOffset})`;

  const whereClause = and(
    gte(adjustedOpenedAt, dateFrom.toISOString().replace("T", " ").replace("Z", "")),
    lte(adjustedOpenedAt, dateTo.toISOString().replace("T", " ").replace("Z", ""))
  );

  const csatWhere = and(
    gte(sql`CONVERT_TZ(${tickets.openedAt}, '+00:00', ${tzOffset})`, dateFrom.toISOString().replace("T", " ").replace("Z", "")),
    lte(sql`CONVERT_TZ(${tickets.openedAt}, '+00:00', ${tzOffset})`, dateTo.toISOString().replace("T", " ").replace("Z", ""))
  );

  try {
    const flowBucket =
      period === "diario" || period === "ontem"
        ? sql<string>`LPAD(HOUR(${adjustedOpenedAt}), 2, '0')`
        : sql<string>`DATE_FORMAT(${adjustedOpenedAt}, '%Y-%m-%d')`;

    const statusQuery = dbClient
      .select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.status);

    const flowQuery = dbClient
      .select({
        bucket: flowBucket,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(flowBucket)
      .orderBy(flowBucket);

    const effectiveCity = sql<string>`COALESCE(NULLIF(${contracts.city}, 'N/A'), ${clientes.city}, 'Sem Cidade')`;
    const effectiveState = sql<string>`COALESCE(NULLIF(${contracts.state}, 'NA'), ${clientes.state}, 'NA')`;

    const contractQuery = dbClient
      .select({
        contractId: contracts.id,
        contractName: contracts.name,
        city: effectiveCity,
        state: effectiveState,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(contracts, eq(contracts.id, tickets.contractId))
      .leftJoin(clientes, eq(clientes.id, tickets.clienteId))
      .where(whereClause)
      .groupBy(contracts.id, effectiveCity, effectiveState)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const reasonQuery = dbClient
      .select({
        reasonId: attendanceReasons.id,
        reasonName: attendanceReasons.name,
        reasonAcronym: attendanceReasons.acronym,
        reasonColor: attendanceReasons.color,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
      .where(whereClause)
      .groupBy(attendanceReasons.id)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const avgTmaQuery = dbClient
      .select({
        avgMinutes: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${tickets.openedAt}, COALESCE(${tickets.closedAt}, ${tickets.updatedAt}, NOW())))`,
      })
      .from(tickets)
      .where(whereClause);

    const csatQuery = dbClient
      .select({
        rating: csatSurveys.rating,
        count: sql<number>`COUNT(*)`,
      })
      .from(csatSurveys)
      .leftJoin(tickets, eq(tickets.id, csatSurveys.ticketId))
      .where(csatWhere)
      .groupBy(csatSurveys.rating);

    const matrixQuery = dbClient
      .select({
        contractId: contracts.id,
        contractName: contracts.name,
        reasonId: attendanceReasons.id,
        reasonAcronym: attendanceReasons.acronym,
        reasonName: attendanceReasons.name,
        reasonColor: attendanceReasons.color,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .leftJoin(contracts, eq(contracts.id, tickets.contractId))
      .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
      .where(whereClause)
      .groupBy(contracts.id, attendanceReasons.id);

    const totalsQuery = dbClient
      .select({
        tickets: sql<number>`COUNT(DISTINCT ${tickets.id})`,
        clientes: sql<number>`COUNT(DISTINCT ${tickets.clienteId})`,
        contracts: sql<number>`COUNT(DISTINCT ${tickets.contractId})`,
      })
      .from(tickets)
      .where(whereClause);

    const [statusCounts, flowSeries, byContract, byReason, tmaRow, csatRows, matrixRows, totalsResult] =
      await Promise.all([
        statusQuery,
        flowQuery,
        contractQuery,
        reasonQuery,
        avgTmaQuery,
        csatQuery,
        matrixQuery,
        totalsQuery,
      ]);

    const statusMap: Record<string, number> = {};
    let totalTickets = 0;
    for (const row of statusCounts) {
      statusMap[row.status] = row.count ?? 0;
      totalTickets += row.count ?? 0;
    }

    const csatStats: Record<string, number> = {};
    let csatTotal = 0;
    for (const row of csatRows) {
      const key = row.rating === null || row.rating === undefined ? "na" : String(row.rating);
      csatStats[key] = row.count ?? 0;
      csatTotal += row.count ?? 0;
    }

    return {
      period,
      dateFrom,
      dateTo,
      totalTickets,
      statusCounts: statusMap,
      flowSeries: (period === "diario" || period === "ontem")
        ? Array.from({ length: 24 }, (_, i) => {
            const bucket = String(i).padStart(2, "0");
            const found = flowSeries.find((s) => s.bucket === bucket);
            return { bucket, count: found?.count ?? 0 };
          })
        : flowSeries.map((row) => ({
            bucket: row.bucket,
            count: row.count ?? 0,
          })),
      byContract: byContract.map((row) => ({
        contractId: row.contractId,
        contractName: row.contractName,
        city: row.city,
        state: row.state,
        count: row.count ?? 0,
      })),
      byReason: byReason.map((row) => ({
        reasonId: row.reasonId,
        reasonName: row.reasonName,
        reasonAcronym: row.reasonAcronym,
        reasonColor: row.reasonColor,
        count: row.count ?? 0,
      })),
      metrics: {
        tmaMinutes: tmaRow?.[0]?.avgMinutes ?? null,
        csat: {
          total: csatTotal,
          ratings: csatStats,
        },
      },
      matrix: matrixRows,
      totals: totalsResult[0] || { tickets: 0, clientes: 0, contracts: 0 },
    };
  } catch (error) {
    logger.error("[Reports] Falha ao obter métricas periódicas", { error: (error as Error)?.message });
    return null;
  }
}

export async function getAllTickets(filters: {
  status?: string | string[];
  departmentId?: number;
  assignedTo?: number;
  clienteId?: number;
  page?: number;
  pageSize?: number;
  onlyOpen?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  reasonId?: number;
  orderByField?: 'createdAt' | 'closedAt' | 'clienteName' | 'status' | 'id' | 'sla';
  orderDirection?: 'asc' | 'desc';
} = {}) {
  const db = await getDb();
  if (!db) return [];
  
  const { 
    page = 1, 
    pageSize: rawPageSize = DEFAULT_LIST_PAGE_SIZE, 
    onlyOpen, 
    search, 
    assignedTo, 
    departmentId, 
    clienteId, 
    dateFrom, 
    dateTo, 
    status,
    reasonId,
    orderByField = 'createdAt',
    orderDirection = 'desc'
  } = filters;

  const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_LIST_PAGE_SIZE);

  const coordinators = alias(clientes, "coordinators");

  // Subqueries para deduplicação dos joins (evita produto cartesiano de clientePhones e ClienteBankData)
  const phonesSubquery = db
    .select({
      clienteId: clientePhones.clienteId,
      subPhone: sql<string | null>`MAX(${clientePhones.phone})`.as("subPhone"),
    })
    .from(clientePhones)
    .where(eq(clientePhones.isActive, true))
    .groupBy(clientePhones.clienteId)
    .as("phonesSub");

  const bankSubquery = db
    .select({
      clienteId: ClienteBankData.clienteId,
      subBankCode: sql<string | null>`MAX(${ClienteBankData.bankCode})`.as("subBankCode"),
      subBankName: sql<string | null>`MAX(${ClienteBankData.bankName})`.as("subBankName"),
      subAccountType: sql<string | null>`MAX(${ClienteBankData.accountType})`.as("subAccountType"),
      subAgency: sql<string | null>`MAX(${ClienteBankData.agency})`.as("subAgency"),
      subAccountNumber: sql<string | null>`MAX(${ClienteBankData.accountNumber})`.as("subAccountNumber"),
      subAccountDigit: sql<string | null>`MAX(${ClienteBankData.accountDigit})`.as("subAccountDigit"),
      subPixKey: sql<string | null>`MAX(${ClienteBankData.pixKey})`.as("subPixKey"),
    })
    .from(ClienteBankData)
    .where(eq(ClienteBankData.isActive, true))
    .groupBy(ClienteBankData.clienteId)
    .as("bankSub");

  const csatSubquery = db
    .select({
      ticketId: csatSurveys.ticketId,
      subRating: sql<number | null>`MAX(${csatSurveys.rating})`.as("subRating"),
      subStatus: sql<string | null>`MAX(${csatSurveys.status})`.as("subStatus"),
    })
    .from(csatSurveys)
    .groupBy(csatSurveys.ticketId)
    .as("csatSub");

  let query = db
    .select({
      ticket: tickets,
      closedAt: tickets.closedAt,
      clienteName: clientes.name,
      clienteWhatsApp: clientes.whatsappNumber,
      clientePhonePreferred: sql<string | null>`COALESCE(${phonesSubquery.subPhone}, ${clientes.whatsappNumber})`,
      contractName: contracts.name,
      contractCity: contracts.city,
      contractState: contracts.state,
      coordinatorName: coordinators.name,
      coordinatorId: coordinators.id,
      reasonName: attendanceReasons.name,
      statusName: ticketStatuses.name,
      statusColor: ticketStatuses.color,
      slaMinutes: ticketStatuses.slaMinutes,
      departmentName: departments.name,
      ticketTypeId: tickets.ticketTypeId,
      ticketTypeName: ticketTypes.name,
      ticketTypeColor: ticketTypes.color,
      criticityId: tickets.criticityId,
      criticityName: ticketCriticities.name,
      criticityColor: ticketCriticities.color,
      clientePosition: clientes.position,
      clienteStatus: clientes.status,
      clienteBirthDate: clientes.birthDate,
      clienteRegistration: clientes.registrationNumber,
      clienteMother: clientes.motherName,
      clienteFather: clientes.fatherName,
      clienteDocument: clientes.document,
      clienteEmail: clientes.email,
      ClientesecondaryPhone: clientes.secondaryPhone,
      clienteBirthCity: clientes.birthCity,
      clienteBirthState: clientes.birthState,
      Clientestreet: clientes.street,
      ClienteAddressNumber: clientes.addressNumber,
      ClienteNeighborhood: clientes.neighborhood,
      ClienteComplement: clientes.complement,
      ClienteCity: clientes.city,
      Clientestate: clientes.state,
      ClienteZipCode: clientes.zipCode,
      ClienteAssociationDate: clientes.associationDate,
      ClienteAdmissionDate: clientes.admissionDate,
      ClienteTerminationDate: clientes.terminationDate,
      ClienteBankCode: bankSubquery.subBankCode,
      ClienteBankName: bankSubquery.subBankName,
      ClienteAccountType: bankSubquery.subAccountType,
      ClienteAgency: bankSubquery.subAgency,
      ClienteAccountNumber: bankSubquery.subAccountNumber,
      ClienteAccountDigit: bankSubquery.subAccountDigit,
      ClientePixKey: bankSubquery.subPixKey,
      csatRating: csatSubquery.subRating,
      csatStatus: csatSubquery.subStatus,
      lastMessageSenderType: sql<string | null>`(
        SELECT ${ticketMessages.senderType}
        FROM ${ticketMessages}
        WHERE ${ticketMessages.ticketId} = ${tickets.id}
        ORDER BY ${ticketMessages.createdAt} DESC
        LIMIT 1
      )`,
      attendantName: users.name,
      attendantNames: sql<string | null>`(
        SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ')
        FROM ${ticketMessages} tm
        JOIN ${users} u ON u.id = tm.senderId
        WHERE tm.ticketId = ${tickets.id}
          AND tm.senderType = 'user'
          AND tm.senderId IS NOT NULL
      )`,
    })
    .from(tickets)
    .leftJoin(contracts, eq(contracts.id, tickets.contractId))
    .leftJoin(coordinators as any, eq(coordinators.id, contracts.coordinatorclienteId))
    .leftJoin(clientes, eq(clientes.id, tickets.clienteId))
    .leftJoin(ticketStatuses, eq(ticketStatuses.slug, tickets.status))
    .leftJoin(departments, eq(departments.id, tickets.currentDepartmentId))
    .leftJoin(users, eq(users.id, tickets.assignedTo))
    .leftJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .leftJoin(ticketCriticities, eq(ticketCriticities.id, tickets.criticityId))
    .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
    .leftJoin(csatSubquery, eq(csatSubquery.ticketId, tickets.id))
    .leftJoin(phonesSubquery, eq(phonesSubquery.clienteId, tickets.clienteId))
    .leftJoin(bankSubquery, eq(bankSubquery.clienteId, tickets.clienteId));
  
  const conditions = [];
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 0) {
        conditions.push(inArray(tickets.status, filters.status as any));
      }
    } else if (filters.status) {
      conditions.push(eq(tickets.status, filters.status as any));
    }
  }
  if (filters?.dateFrom) {
    conditions.push(gte(tickets.openedAt, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(tickets.openedAt, filters.dateTo));
  }
  if (filters?.onlyOpen) {
    const openStatuses = [
      "aguardando_atendimento",
      "em_atendimento",
      "em_espera",
      "aguardando_resposta",
      "aguardando_Cliente", // Adicionado para consistência
      "espera_rh",            // Adicionado para consistência
    ] as const;
    conditions.push(inArray(tickets.status, openStatuses as any));
  }
  if (filters?.departmentId) {
    conditions.push(eq(tickets.currentDepartmentId, filters.departmentId));
  }
  if (filters?.assignedTo) {
    conditions.push(eq(tickets.assignedTo, filters.assignedTo));
  }
  if (filters?.clienteId) {
    conditions.push(eq(tickets.clienteId, filters.clienteId));
  }
  if (filters?.reasonId) {
    conditions.push(eq(tickets.reasonId, filters.reasonId));
  }
  if (filters?.search) {
    const search = `%${filters.search}%`;
    conditions.push(
      or(
        like(tickets.protocol, search),
        like(tickets.description, search),
        like(clientes.name, search)
      )
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  // Dynamic sorting
  let sortColumn: any = tickets.createdAt;
  if (orderByField === 'closedAt') sortColumn = tickets.closedAt;
  if (orderByField === 'clienteName') sortColumn = clientes.name;
  if (orderByField === 'status') sortColumn = ticketStatuses.name;
  if (orderByField === 'id') sortColumn = tickets.protocol;
  if (orderByField === 'sla') sortColumn = ticketStatuses.slaMinutes;

  const orderFn = orderDirection === 'asc' ? asc : desc;

  const rows = await query
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return rows.map((r: any) => ({
    ...r.ticket,
    clienteName: r.clienteName,
    clienteWhatsApp: r.clienteWhatsApp,
    clientePhonePreferred: r.clientePhonePreferred,
    contractName: r.contractName,
    reasonName: r.reasonName,
    closedAt: r.closedAt,
    statusName: r.statusName,
    statusColor: r.statusColor,
    statusSla: (() => {
      if (!r.slaMinutes) return null;
      const createdAt = new Date(r.ticket.createdAt);
      const deadline = new Date(createdAt.getTime() + r.slaMinutes * 60000);
      const now = new Date();
      const refDate = r.ticket.closedAt ? new Date(r.ticket.closedAt) : now;
      
      if (refDate > deadline) return 'violated';
      // Warning logic: < 20% time remaining or < 2 hours? Let's say < 20%
      const totalDuration = r.slaMinutes * 60000;
      const elapsed = refDate.getTime() - createdAt.getTime();
      const remaining = totalDuration - elapsed;
      if (remaining > 0 && remaining < (totalDuration * 0.2)) return 'warning';
      
      return 'ok';
    })(),
    slaMinutes: r.slaMinutes,
    departmentName: r.departmentName,
    clientePosition: r.clientePosition,
    lastMessageSenderType: r.lastMessageSenderType,
    ticketTypeId: r.ticketTypeId,
    ticketTypeName: r.ticketTypeName,
    ticketTypeColor: r.ticketTypeColor,
    criticityId: r.criticityId,
    criticityName: r.criticityName,
    criticityColor: r.criticityColor,
    attendantName: r.attendantName,
    clienteStatus: r.clienteStatus,
    clienteBirthDate: r.clienteBirthDate,
    clienteRegistration: r.clienteRegistration,
    clienteMother: r.clienteMother,
    clienteFather: r.clienteFather,
    clienteDocument: r.clienteDocument,
    clienteEmail: r.clienteEmail,
    ClientesecondaryPhone: r.ClientesecondaryPhone,
    clienteBirthCity: r.clienteBirthCity,
    clienteBirthState: r.clienteBirthState,
    Clientestreet: r.Clientestreet,
    ClienteAddressNumber: r.ClienteAddressNumber,
    ClienteNeighborhood: r.ClienteNeighborhood,
    ClienteComplement: r.ClienteComplement,
    ClienteCity: r.ClienteCity,
    Clientestate: r.Clientestate,
    ClienteZipCode: r.ClienteZipCode,
    ClienteAssociationDate: r.ClienteAssociationDate,
    ClienteAdmissionDate: r.ClienteAdmissionDate,
    ClienteTerminationDate: r.ClienteTerminationDate,
    ClienteBankCode: r.ClienteBankCode,
    ClienteBankName: r.ClienteBankName,
    csatRating: r.csatRating,
    csatStatus: r.csatStatus,
    ClienteAccountType: r.ClienteAccountType,
    ClienteAgency: r.ClienteAgency,
    ClienteAccountNumber: r.ClienteAccountNumber,
    ClienteAccountDigit: r.ClienteAccountDigit,
    ClientePixKey: r.ClientePixKey,
    coordinatorName: r.coordinatorName,
    coordinatorId: r.coordinatorId,
  }));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      ...getTableColumns(tickets),
      ticketTypeName: ticketTypes.name,
      ticketTypeColor: ticketTypes.color,
      criticityName: ticketCriticities.name,
      criticityColor: ticketCriticities.color,
      reasonName: attendanceReasons.name,
      reasonColor: attendanceReasons.color,
    })
    .from(tickets)
    .leftJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .leftJoin(ticketCriticities, eq(ticketCriticities.id, tickets.criticityId))
    .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
    .where(eq(tickets.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Retorna a contagem de tickets que não estão em status terminais (fechado ou inválido)
 */
export async function getOpenTicketsCount(filters: { assignedTo?: number; departmentId?: number } = {}) {
  const db = await getDb();
  if (!db) return 0;

  const terminalStatuses = ["atendimento_fechado", "ticket_invalido"];
  const openStatuses = [
    "aguardando_atendimento",
    "em_atendimento",
    "em_espera",
    "aguardando_resposta",
    "aguardando_Cliente",
    "espera_rh",
  ];
  
  let query = db
    .select({ count: sql<number>`count(*)` })
    .from(tickets);

  const conditions = [inArray(tickets.status, openStatuses as any)];

  if (filters.assignedTo) {
    conditions.push(eq(tickets.assignedTo, filters.assignedTo));
  }

  if (filters.departmentId) {
    conditions.push(eq(tickets.currentDepartmentId, filters.departmentId));
  }

  const result = await query.where(and(...conditions));

  return Number(result[0]?.count || 0);
}

export async function getTicketsByContact(params: {
  clienteId?: number | null;
  externalIdentifier?: string | null;
  externalNumber?: string | null;
}) {
  const dbClient = await getDb();
  if (!dbClient) return [];

  const { clienteId, externalIdentifier, externalNumber } = params;
  
  const conditions = [];
  if (clienteId) {
    conditions.push(eq(tickets.clienteId, clienteId));
  }
  if (externalIdentifier) {
    conditions.push(eq(tickets.externalIdentifier, externalIdentifier));
  }
  if (externalNumber) {
    conditions.push(eq(tickets.externalNumber, externalNumber));
  }

  if (conditions.length === 0) return [];

  return await dbClient
    .select({
      id: tickets.id,
      protocol: tickets.protocol,
      status: tickets.status,
      openedAt: tickets.openedAt,
      closedAt: tickets.closedAt,
      reasonName: attendanceReasons.name,
      attendantName: sql<string>`COALESCE(${profiles.fullName}, ${users.name}, 'Não atribuído')`,
    })
    .from(tickets)
    .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
    .leftJoin(users, eq(users.id, tickets.assignedTo))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(or(...conditions))
    .orderBy(desc(tickets.openedAt));
}

/**
 * Retorna estatísticas de motivos de atendimento para um determinado contato
 */
export async function getAttendanceStatsByContact(params: {
  clienteId?: number | null;
  externalIdentifier?: string | null;
  externalNumber?: string | null;
}) {
  const dbClient = await getDb();
  if (!dbClient) return [];

  const { clienteId, externalIdentifier, externalNumber } = params;
  
  const conditions = [];
  if (clienteId) {
    conditions.push(eq(tickets.clienteId, clienteId));
  }
  if (externalIdentifier) {
    conditions.push(eq(tickets.externalIdentifier, externalIdentifier));
  }
  if (externalNumber) {
    conditions.push(eq(tickets.externalNumber, externalNumber));
  }

  if (conditions.length === 0) return [];

  return await dbClient
    .select({
      reasonName: sql<string>`COALESCE(${attendanceReasons.name}, 'Não informado')`,
      count: sql<number>`CAST(count(*) AS UNSIGNED)`
    })
    .from(tickets)
    .leftJoin(attendanceReasons, eq(attendanceReasons.id, tickets.reasonId))
    .where(or(...conditions))
    .groupBy(attendanceReasons.name)
    .orderBy(desc(sql`count(*)`));
}

/**
 * Retorna estatísticas de CSAT para um determinado contato
 */
export async function getCsatStatsByContact(params: {
  clienteId?: number | null;
  externalIdentifier?: string | null;
  externalNumber?: string | null;
}) {
  const dbClient = await getDb();
  if (!dbClient) return [];

  const { clienteId, externalIdentifier, externalNumber } = params;
  
  const conditions = [];
  if (clienteId) {
    conditions.push(eq(csatSurveys.clienteId, clienteId));
  }
  
  // Se não tiver clienteId, tentamos buscar via tickets associados a esse identificador externo
  if (conditions.length === 0 && (externalIdentifier || externalNumber)) {
    const ticketConditions = [];
    if (externalIdentifier) ticketConditions.push(eq(tickets.externalIdentifier, externalIdentifier));
    if (externalNumber) ticketConditions.push(eq(tickets.externalNumber, externalNumber));
    
    const subquery = dbClient
      .select({ id: tickets.id })
      .from(tickets)
      .where(or(...ticketConditions));
      
    conditions.push(inArray(csatSurveys.ticketId, subquery));
  }

  if (conditions.length === 0) return [];

  return await dbClient
    .select({
      rating: csatSurveys.rating,
      status: csatSurveys.status,
      count: sql<number>`CAST(count(*) AS UNSIGNED)`
    })
    .from(csatSurveys)
    .where(or(...conditions))
    .groupBy(csatSurveys.rating, csatSurveys.status)
    .orderBy(desc(csatSurveys.rating));
}

/**
 * Calcula a data de prazo (SLA) considerando apenas o horário comercial e feriados da cooperativa.
 */
export async function calculateBusinessDeadline(minutes: number, cooperativaId: number = 1): Promise<Date> {
  const db = await getDb();
  if (!db) return new Date(Date.now() + minutes * 60000);

  try {
    const hours = await db.select().from(cooperativaBusinessHours).where(eq(cooperativaBusinessHours.cooperativaId, cooperativaId));
    const holidays = await db.select().from(cooperativaHolidays).where(eq(cooperativaHolidays.cooperativaId, cooperativaId));

    let current = new Date();
    let remainingMinutes = minutes;

    // Proteção contra loop infinito se não houver horários configurados
    if (hours.length === 0) {
      logger.warn("[Database] Sem horários de funcionamento configurados para cooperativa", { cooperativaId });
      return new Date(Date.now() + minutes * 60000);
    }

    let safetyCounter = 0;
    const MAX_DAYS = 365;

    while (remainingMinutes > 0 && safetyCounter < MAX_DAYS) {
      safetyCounter++;
      const dayOfWeek = current.getDay(); // 0-6 (Dom-Sab)
      
      // Formata data local YYYY-MM-DD (Fuso Brasil/Local)
      const dateStr = current.getFullYear() + '-' + 
                      String(current.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(current.getDate()).padStart(2, '0');

      const isHoliday = holidays.some(h => {
        const hDate = h.date;
        if (hDate instanceof Date) {
          const hStr = hDate.getFullYear() + '-' + 
                       String(hDate.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(hDate.getDate()).padStart(2, '0');
          return hStr === dateStr;
        }
        return String(hDate).startsWith(dateStr);
      });

      const daySetting = hours.find(h => h.weekday === dayOfWeek);

      if (isHoliday || !daySetting || daySetting.isClosed || !daySetting.openTime || !daySetting.closeTime) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0); // Início do próximo dia
        continue;
      }

      const [openH, openM] = daySetting.openTime.split(':').map(Number);
      const [closeH, closeM] = daySetting.closeTime.split(':').map(Number);

      const openDate = new Date(current);
      openDate.setHours(openH, openM, 0, 0);
      const closeDate = new Date(current);
      closeDate.setHours(closeH, closeM, 0, 0);

      // Se ainda não abriu hoje, pula para a abertura
      if (current < openDate) current = openDate;
      
      // Se já passou do horário de fecho hoje, pula para amanhã
      if (current >= closeDate) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const mmsLeftToday = closeDate.getTime() - current.getTime();
      const minutesLeftToday = Math.max(0, mmsLeftToday / 60000);
      const minutesToAdd = Math.min(remainingMinutes, minutesLeftToday);

      current.setTime(current.getTime() + (minutesToAdd * 60000));
      remainingMinutes -= minutesToAdd;

      // Se ainda sobra tempo, pula para amanhã após somar o tempo de hoje
      if (remainingMinutes > 0) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    }

    if (safetyCounter >= MAX_DAYS) {
      logger.error("[Database] SLA calculation reached safety limit (365 iterations)", { minutes, cooperativaId });
    }

    return current;
  } catch (error) {
    logger.error("[Database] Error calculating business deadline", { error });
    return new Date(Date.now() + minutes * 60000);
  }
}

export async function getTicketByProtocol(protocol: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(tickets).where(eq(tickets.protocol, protocol)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTicket(ticket: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();

  // Calcular SLA deadline e status inicial se reasonId fornecido
  let slaDeadline = null;
  if (ticket.reasonId) {
    const reason = await getAttendanceReasonById(ticket.reasonId);
    if (reason) {
      slaDeadline = await calculateBusinessDeadline(reason.slaMinutes);
    }
  }

  // Se ainda não tem status, usa o padrão do sistema
  if (!ticket.status) {
    (ticket as any).status = "aguardando_atendimento";
  }

  // Tentar gerar protocolo único com algumas tentativas para evitar colisão
  let lastError: unknown = null;
  for (let attempt = 0; attempt < TICKET_PROTOCOL_MAX_RETRIES; attempt++) {
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const protocol = `${dateStr}-${randomSuffix}`;

    try {
      const result = await db.insert(tickets).values({
        ...ticket,
        protocol,
        slaDeadline,
        statusStartedAt: now,
        lastInteractionAt: now,
        openedAt: now,
      });
      return { id: result[0].insertId, protocol };
    } catch (error: any) {
      lastError = error;
      // Se for colisão de unique, tentar novamente; caso contrário, lançar
      const isDuplicate =
        typeof error?.message === "string" &&
        (error.message.includes("Duplicate") || error.message.includes("unique"));
      if (!isDuplicate || attempt === TICKET_PROTOCOL_MAX_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Falha ao gerar protocolo de ticket");
}

export async function updateTicket(id: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  
  // Se o status mudou, resetar o cronômetro do status (SLA por status)
  if (data.status) {
    updateData.statusStartedAt = new Date();
  }

  if (["atendimento_fechado", "ticket_invalido"].includes(data.status as string)) {
    updateData.closedAt = new Date();
  }
  
  await db.update(tickets).set(updateData).where(eq(tickets.id, id));
}

export async function updateTicketInteraction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tickets).set({ lastInteractionAt: new Date() }).where(eq(tickets.id, id));
}

/**
 * Vincula tickets sem clienteId (órfãos) a um Cliente recém-cadastrado ou atualizado
 * com base no e-mail ou telefone.
 */
export async function linkTicketsToCliente(clienteId: number, identifiers: string[]) {
  const dbClient = await getDb();
  if (!dbClient || identifiers.length === 0) return 0;

  // Filtrar identificadores vazios e remover duplicatas
  const validIdentifiers = Array.from(new Set(identifiers.filter(Boolean)));
  if (validIdentifiers.length === 0) return 0;

  // 1. Preparar identificadores técnicos e de e-mail (Fast Path)
  const fastPathConditions = validIdentifiers.map((id: string) => {
    const isTechnicalId = id.includes('.us') || id.includes('.lid');
    const isEmail = id.includes('@') && !isTechnicalId;
    
    if (isEmail || isTechnicalId) {
      return eq(tickets.externalIdentifier, id);
    }
    
    const digits = id.replace(/\D/g, "");
    if (!digits) return null;

    // Gerar variantes de telefone (com e sem 9º dígito se for BR)
    const variants = new Set<string>([digits]);
    if (DEFAULT_COUNTRY_CODE && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      const body = digits.slice(DEFAULT_COUNTRY_CODE.length);
      if (body.length === 10) { // Adicionar 9
         variants.add(`${DEFAULT_COUNTRY_CODE}${body.slice(0, 2)}9${body.slice(2)}`);
      } else if (body.length === 11 && body[2] === '9') { // Remover 9
         variants.add(`${DEFAULT_COUNTRY_CODE}${body.slice(0, 2)}${body.slice(3)}`);
      }
    }

    return or(...Array.from(variants).map(v => eq(tickets.externalNumber, v)));
  }).filter(Boolean);

  // 2. Preparar busca na descrição (Slow Path)
  const slowPathConditions = validIdentifiers.map((id: string) => {
    const isTechnicalId = id.includes('.us') || id.includes('.lid');
    const isEmail = id.includes('@') && !isTechnicalId;
    
    if (isEmail) return like(tickets.description, `%[E-mail: ${id}]%`);
    
    const digits = id.replace(/\D/g, "");
    if (!digits || digits.length < 8) return null;

    return or(
      like(tickets.description, `%tel:${digits}%`),
      like(tickets.description, `%wa_id:${digits}%`)
    );
  }).filter(Boolean);

  let totalAffected = 0;

  try {
    // EXECUÇÃO 1: Fast Path (Indexado)
    if (fastPathConditions.length > 0) {
      const fastResult = await dbClient.update(tickets)
        .set({ clienteId })
        .where(
          and(
            isNull(tickets.clienteId),
            or(...(fastPathConditions as any))
          )
        );
      totalAffected += (fastResult as any).affectedRows || 0;
    }

    // EXECUÇÃO 2: Slow Path (Busca de Texto)
    if (slowPathConditions.length > 0) {
      const slowResult = await dbClient.update(tickets)
        .set({ clienteId })
        .where(
          and(
            isNull(tickets.clienteId),
            or(...(slowPathConditions as any))
          )
        );
      totalAffected += (slowResult as any).affectedRows || 0;
    }

    if (totalAffected > 0) {
      logger.info(`[Database] Retroactive linking: linked ${totalAffected} tickets to Cliente ${clienteId}`, { 
        identifiers: validIdentifiers
      });
    }
    return totalAffected;
  } catch (error) {
    logger.error("[Database] Error in retroactive linking", { error, clienteId });
    throw error;
  }
}

/**
 * Conta tickets órfãos que poderiam ser vinculados a um Cliente pelos seus identificadores
 */
export async function countUnlinkedTicketsToCliente(identifiers: string[]) {
  const dbClient = await getDb();
  if (!dbClient || identifiers.length === 0) return 0;

  const validIdentifiers = Array.from(new Set(identifiers.filter(Boolean)));
  if (validIdentifiers.length === 0) return 0;

  // 1. Fast Path (Indexado)
  const fastPathConditions = validIdentifiers.map((id: string) => {
    const isTechnicalId = id.includes('.us') || id.includes('.lid');
    const isEmail = id.includes('@') && !isTechnicalId;
    
    if (isEmail || isTechnicalId) return eq(tickets.externalIdentifier, id);
    
    const digits = id.replace(/\D/g, "");
    if (!digits) return null;

    const variants = new Set<string>([digits]);
    if (DEFAULT_COUNTRY_CODE && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      const body = digits.slice(DEFAULT_COUNTRY_CODE.length);
      if (body.length === 10) {
        variants.add(`${DEFAULT_COUNTRY_CODE}${body.slice(0, 2)}9${body.slice(2)}`);
      } else if (body.length === 11 && body[2] === '9') {
        variants.add(`${DEFAULT_COUNTRY_CODE}${body.slice(0, 2)}${body.slice(3)}`);
      }
    }

    return or(...Array.from(variants).map(v => eq(tickets.externalNumber, v)));
  }).filter(Boolean);

  // 2. Slow Path (Texto)
  const slowPathConditions = validIdentifiers.map((id: string) => {
    const isTechnicalId = id.includes('.us') || id.includes('.lid');
    const isEmail = id.includes('@') && !isTechnicalId;
    
    if (isEmail) return like(tickets.description, `%[E-mail: ${id}]%`);
    
    const digits = id.replace(/\D/g, "");
    if (!digits || digits.length < 8) return null;

    return or(
      like(tickets.description, `%tel:${digits}%`),
      like(tickets.description, `%wa_id:${digits}%`)
    );
  }).filter(Boolean);

  if (fastPathConditions.length === 0 && slowPathConditions.length === 0) return 0;

  try {
    const finalConditions = [];
    if (fastPathConditions.length > 0) finalConditions.push(or(...(fastPathConditions as any)));
    if (slowPathConditions.length > 0) finalConditions.push(or(...(slowPathConditions as any)));

    const result = await dbClient.select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(
        and(
          isNull(tickets.clienteId),
          or(...finalConditions)
        )
      );
    
    return Number(result[0]?.count || 0);
  } catch (error) {
    logger.error("[Database] Error counting unlinked tickets", { error });
    return 0;
  }
}


// ============================================================================
// MENSAGENS DE TICKETS
// ============================================================================

export async function getTicketMessages(ticketId: number, recipientclienteId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(ticketMessages.ticketId, ticketId)];
  
  if (recipientclienteId !== undefined) {
    if (recipientclienteId === null) {
      conditions.push(isNull(ticketMessages.recipientclienteId));
    } else {
      conditions.push(eq(ticketMessages.recipientclienteId, recipientclienteId));
    }
  }

  return await db.select({
    ...getTableColumns(ticketMessages),
    senderName: sql<string | null>`COALESCE(${profiles.nickname}, ${profiles.fullName}, ${users.name}, 'Sistema')`
  })
  .from(ticketMessages)
  .leftJoin(users, eq(users.id, ticketMessages.senderId))
  .leftJoin(profiles, eq(profiles.userId, users.id))
  .where(and(...conditions))
  .orderBy(ticketMessages.createdAt)
  .limit(MAX_LIST_PAGE_SIZE);
}

export async function createTicketMessage(message: InsertTicketMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ticketMessages).values(message);
  
  // Lógica de transição automática
  const ticket = await getTicketById(message.ticketId);
  if (ticket) {
    // Regras de status (tickets):
    // - Status inicial: aguardando_atendimento (definido na criação)
    // - Quando um usuário do sistema responde o remetente: aguardando_resposta
    // - Quando o remetente responde (apenas se estava aguardando_resposta): em_atendimento
    //
    // Observação: mensagens automáticas (senderType === "sistema") NÃO devem alterar status.
    const isClosed = ["atendimento_fechado", "ticket_invalido"].includes(ticket.status as string);

    if (!isClosed && message.senderType === "atendente") {
      // Qualquer resposta do atendente/usuário para o remetente -> aguardando_resposta
      if (ticket.status !== "aguardando_resposta") {
        await updateTicket(message.ticketId, { status: "aguardando_resposta" });
      }
      await updateTicketInteraction(message.ticketId);
    } else if (!isClosed && message.senderType === "Cliente") {
      // Resposta do remetente só volta para "em_atendimento" se estava aguardando resposta
      if (ticket.status === "aguardando_resposta") {
        await updateTicket(message.ticketId, { status: "em_atendimento" });
      }
      await updateTicketInteraction(message.ticketId);
    }
  }
  
  return result[0].insertId;
}

// ============================================================================
// HISTÓRICO DE TICKETS
// ============================================================================

export async function getTicketHistory(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(ticketHistory)
    .where(eq(ticketHistory.ticketId, ticketId))
    .orderBy(desc(ticketHistory.createdAt));
}

export async function createTicketHistory(history: InsertTicketHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ticketHistory).values(history);
  return result[0].insertId;
}

// ============================================================================
// CONTROLE DE TEMPO
// ============================================================================

export async function getTicketTimeTracking(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(ticketTimeTracking)
    .where(eq(ticketTimeTracking.ticketId, ticketId))
    .orderBy(ticketTimeTracking.startedAt);
}

export async function startTimeTracking(tracking: InsertTicketTimeTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ticketTimeTracking).values({
    ...tracking,
    startedAt: new Date(),
    totalSeconds: 0,
  });
  
  return result[0].insertId;
}

export async function pauseTimeTracking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const tracking = await db.select().from(ticketTimeTracking)
    .where(eq(ticketTimeTracking.id, id))
    .limit(1);
  
  if (tracking.length === 0) return;
  
  const record = tracking[0];
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - new Date(record.startedAt).getTime()) / 1000);
  
  await db.update(ticketTimeTracking).set({
    pausedAt: now,
    totalSeconds: record.totalSeconds + elapsed,
  }).where(eq(ticketTimeTracking.id, id));
}

export async function resumeTimeTracking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(ticketTimeTracking).set({
    resumedAt: new Date(),
    pausedAt: null,
  }).where(eq(ticketTimeTracking.id, id));
}

export async function finishTimeTracking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const tracking = await db.select().from(ticketTimeTracking)
    .where(eq(ticketTimeTracking.id, id))
    .limit(1);
  
  if (tracking.length === 0) return;
  
  const record = tracking[0];
  const now = new Date();
  const startTime = record.resumedAt || record.startedAt;
  const elapsed = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
  
  await db.update(ticketTimeTracking).set({
    finishedAt: now,
    totalSeconds: record.totalSeconds + elapsed,
  }).where(eq(ticketTimeTracking.id, id));
}


// ==================== IMPORTAÇÃO EM MASSA ====================

/**
 * Importar clientes em massa
 */
export async function bulkImportClientes(
  data: Array<{
    registrationNumber: string;
    name: string;
    document: string;
    email?: string;
    phone?: string;
    birthDate?: Date;
    admissionDate?: Date;
    position?: string;
    status: "ativo" | "inativo" | "sem_producao";
    contractId?: number;
    accountDigit?: string;
  }>
) {
  const dbClient = await getDb();
  if (!dbClient) throw new Error("Database not available");

  const results = {
    success: 0,
    errors: [] as Array<{ row: number; error: string; data: any }>,
    aborted: false,
    message: "",
  };

  await dbClient.transaction(async tx => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      try {
        // Validar campos obrigatórios
        if (!row.registrationNumber || !row.name || !row.document) {
          results.errors.push({
            row: i + 1,
            error: "Campos obrigatórios faltando (matrícula, nome ou documento)",
            data: row,
          });
          continue;
        }

        // Deduplicar por matrícula ou documento
        const duplicate = await tx
          .select({ id: clientes.id })
          .from(clientes)
          .where(
            or(
              eq(clientes.registrationNumber, Number(row.registrationNumber)),
              eq(clientes.document, row.document)
            )
          )
          .limit(1);

        if (duplicate.length > 0) {
          results.errors.push({
            row: i + 1,
            error: "Registro duplicado (matrícula ou documento já existente)",
            data: row,
          });
          continue;
        }

        const [result] = await tx.insert(clientes).values({
          registrationNumber: row.registrationNumber,
          name: row.name,
          document: row.document,
          email: row.email || null,
          birthDate: row.birthDate || null,
          admissionDate: row.admissionDate || null,
          position: row.position || null,
          status: row.status || "ativo",
          contractId: row.contractId || null,
        });

        // Se tem telefone, inserir também
        if (row.phone && result?.insertId) {
          const clienteId = Number(result.insertId);
          await tx.insert(clientePhones).values({
            clienteId,
            phone: row.phone,
            phoneType: "principal",
            isActive: true,
          });
        }

        // Se tem dígito da conta, inserir em cliente_bank_data (versão mínima)
        if (row.accountDigit && result?.insertId) {
          const clienteId = Number(result.insertId);
          await tx.insert(ClienteBankData).values({
            clienteId,
            bankCode: "000", // Placeholder se não fornecido
            bankName: "Não especificado",
            accountType: "corrente",
            agency: "0000",
            accountNumber: "00000",
            accountDigit: row.accountDigit,
            isActive: true,
          });
        }

        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error?.message || "Erro desconhecido",
          data: row,
        });
      }

      // Abort threshold: rollback se mais de 5% falharem
      const failureRate = results.errors.length / (i + 1);
      if (failureRate > IMPORT_FAILURE_THRESHOLD) {
        results.aborted = true;
        results.message =
          "Importação abortada: mais de 5% das linhas falharam. Nenhum registro foi persistido.";
        throw new Error("IMPORT_ABORTED_THRESHOLD");
      }
    }
  }).catch(err => {
    if (err?.message !== "IMPORT_ABORTED_THRESHOLD") {
      results.aborted = true;
      results.message =
        "Importação abortada por erro inesperado. Nenhum registro foi persistido.";
    }
  });

  return results;
}

/**
 * Importar contratos em massa
 */
export async function bulkImportContracts(
  data: Array<{
    name: string;
    city: string;
    state: string;
    status: "ativo" | "inativo";
    validityDate?: Date;
  }>
) {
  const dbClient = await getDb();
  if (!dbClient) throw new Error("Database not available");

  const results = {
    success: 0,
    errors: [] as Array<{ row: number; error: string; data: any }>,
    aborted: false,
    message: "",
  };

  await dbClient.transaction(async tx => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      try {
        if (!row.name) {
          results.errors.push({
            row: i + 1,
            error: "Nome do contrato é obrigatório",
            data: row,
          });
          continue;
        }

        await tx.insert(contracts).values({
          id: (row as any).id,
          name: row.name,
          city: row.city,
          state: row.state,
          status: row.status || "ativo",
          validityDate: row.validityDate || null,
          isSpecial: false,
        });

        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error?.message || "Erro desconhecido",
          data: row,
        });
      }

      const failureRate = results.errors.length / (i + 1);
      if (failureRate > IMPORT_FAILURE_THRESHOLD) {
        results.aborted = true;
        results.message =
          "Importação abortada: mais de 5% das linhas falharam. Nenhum registro foi persistido.";
        throw new Error("IMPORT_ABORTED_THRESHOLD");
      }
    }
  }).catch(err => {
    if (err?.message !== "IMPORT_ABORTED_THRESHOLD") {
      results.aborted = true;
      results.message =
        "Importação abortada por erro inesperado. Nenhum registro foi persistido.";
    }
  });

  return results;
}

// ============================================================================
// EMAIL SETUP
// ============================================================================

const DEFAULT_EMAIL_TEST_LOG_LIMIT = 20;

export async function listEmailAccounts() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailAccounts)
    .orderBy(desc(emailAccounts.isDefault), desc(emailAccounts.updatedAt));
}

export async function getEmailAccountById(id: number): Promise<EmailAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(emailAccounts).where(eq(emailAccounts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

async function clearDefaultEmailAccounts(db: DatabaseInstance, exceptId?: number) {
  const query = db.update(emailAccounts).set({ isDefault: false });
  if (exceptId) {
    await query.where(ne(emailAccounts.id, exceptId));
  } else {
    await query;
  }
}

export async function createEmailAccount(data: InsertEmailAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const payload: InsertEmailAccount = {
    ...data,
    name: normalizeText(data.name),
    email: normalizeText(data.email),
    fromAddress: data.fromAddress ? normalizeText(data.fromAddress) : data.email,
    replyTo: data.replyTo ? normalizeText(data.replyTo) : null,
    signature: data.signature ?? null,
    status: data.status ?? "inactive",
    isDefault: data.isDefault ?? false,
    defaultContractId: data.defaultContractId ?? null,
    departmentId: data.departmentId ?? null,
    reasonId: data.reasonId ?? null,
    ticketTypeId: data.ticketTypeId ?? null,
    criticityId: data.criticityId ?? null,
  };

  const [result] = await db.insert(emailAccounts).values(payload);
  const id = Number(result.insertId);

  if (payload.isDefault) {
    await clearDefaultEmailAccounts(db, id);
    await db.update(emailAccounts).set({ isDefault: true }).where(eq(emailAccounts.id, id));
  }

  return id;
}

export async function updateEmailAccount(id: number, data: Partial<InsertEmailAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalized: Partial<InsertEmailAccount> = {
    ...data,
    ...(data.name && { name: normalizeText(data.name) }),
    ...(data.email && { email: normalizeText(data.email) }),
    ...(data.fromAddress && { fromAddress: normalizeText(data.fromAddress) }),
    ...(data.replyTo !== undefined && {
      replyTo: data.replyTo ? normalizeText(data.replyTo) : null,
    }),
    ...(data.defaultContractId !== undefined && { defaultContractId: data.defaultContractId ?? null }),
    ...(data.departmentId !== undefined && { departmentId: data.departmentId ?? null }),
    ...(data.reasonId !== undefined && { reasonId: data.reasonId ?? null }),
    ...(data.ticketTypeId !== undefined && { ticketTypeId: data.ticketTypeId ?? null }),
    ...(data.criticityId !== undefined && { criticityId: data.criticityId ?? null }),
  };

  await db.update(emailAccounts).set(normalized).where(eq(emailAccounts.id, id));

  if (data.isDefault) {
    await clearDefaultEmailAccounts(db, id);
    await db.update(emailAccounts).set({ isDefault: true }).where(eq(emailAccounts.id, id));
  }
}

export async function setDefaultEmailAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await clearDefaultEmailAccounts(db, id);
  await db.update(emailAccounts).set({ isDefault: true }).where(eq(emailAccounts.id, id));
}

export async function upsertEmailCredential(data: InsertEmailCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(emailCredentials)
    .where(and(eq(emailCredentials.accountId, data.accountId), eq(emailCredentials.protocol, data.protocol)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(emailCredentials)
      .set({
        host: data.host,
        port: data.port,
        secure: data.secure,
        authType: data.authType,
        username: data.username,
        passwordEncrypted: data.passwordEncrypted ?? null,
        oauthRefreshTokenEncrypted: data.oauthRefreshTokenEncrypted ?? null,
        oauthAccessTokenEncrypted: data.oauthAccessTokenEncrypted ?? null,
        lastValidatedAt: data.lastValidatedAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(emailCredentials.id, existing[0].id));
    return existing[0].id;
  }

  const [result] = await db.insert(emailCredentials).values(data);
  return Number(result.insertId);
}

export async function addEmailTestLog(data: InsertEmailTestLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(emailTestLogs).values({
    ...data,
    message: data.message ?? null,
    details: data.details ?? null,
  });
  return Number(result.insertId);
}

export async function getRecentEmailTestLogs(accountId: number, limit = DEFAULT_EMAIL_TEST_LOG_LIMIT) {
  const db = await getDb();
  if (!db) return [];

  const safeLimit = Math.max(1, Math.min(limit, 100));
  return await db
    .select()
    .from(emailTestLogs)
    .where(eq(emailTestLogs.accountId, accountId))
    .orderBy(desc(emailTestLogs.createdAt))
    .limit(safeLimit);
}

export async function recordEmailEvent(data: InsertEmailEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(emailEvents).values(data);
  return Number(result.insertId);
}

export async function addEmailAttachment(data: InsertEmailAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(emailAttachments).values(data);
  return Number(result.insertId);
}

export async function getEmailCredential(accountId: number, protocol: "smtp" | "imap" | "pop3"): Promise<EmailCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(emailCredentials)
    .where(and(eq(emailCredentials.accountId, accountId), eq(emailCredentials.protocol, protocol)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function markEmailCredentialValidated(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailCredentials).set({ lastValidatedAt: new Date() }).where(eq(emailCredentials.id, id));
}

export async function updateEmailAccountStatus(id: number, status: "inactive" | "testing" | "active" | "error") {
  const db = await getDb();
  if (!db) return;
  await db.update(emailAccounts).set({ status, updatedAt: new Date() }).where(eq(emailAccounts.id, id));
}

export async function getDefaultEmailAccount(): Promise<EmailAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(emailAccounts)
    .where(eq(emailAccounts.isDefault, true))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getEmailEventByMessageId(messageId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(emailEvents)
    .where(eq(emailEvents.messageId, messageId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getEmailEventsByTicketId(ticketId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailEvents)
    .where(eq(emailEvents.ticketId, ticketId))
    .orderBy(desc(emailEvents.createdAt));
}

export async function setEmailEventTicket(eventId: number, ticketId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(emailEvents)
    .set({ ticketId, status: "received" as any, updatedAt: new Date() } as any)
    .where(eq(emailEvents.id, eventId));
}

// Nota: Importação de usuários não é suportada via CSV
// Os usuários são criados automaticamente no primeiro login via Manus OAuth
// Apenas clientes e contratos podem ser importados em massa

// ==================== Quick Messages ====================

export async function getQuickMessages() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(quickMessages).where(eq(quickMessages.active, true));
}

export async function createQuickMessage(data: InsertQuickMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(quickMessages).values(data);
}

export async function updateQuickMessage(id: number, data: Partial<InsertQuickMessage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(quickMessages).set(data).where(eq(quickMessages.id, id));
}

export async function deleteQuickMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(quickMessages).where(eq(quickMessages.id, id));
}

export async function getBotMessage(category: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(quickMessages)
    .where(
      and(
        eq(quickMessages.category, `BOT-${category}`),
        eq(quickMessages.active, true)
      )
    )
    .limit(1);
    
  return results.length > 0 ? results[0].content : null;
}

export async function deleteTicket(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tickets).where(eq(tickets.id, id));
}

// ==================== SEEDING AUTOMÁTICO ====================

const INITIAL_STATUSES = [
  { slug: "aguardando_atendimento", name: "Aguardando Atendimento", slaMinutes: 30, color: "#f59e0b" }, 
  { slug: "em_atendimento", name: "Em Atendimento", slaMinutes: 600, color: "#3b82f6" }, 
  { slug: "em_espera", name: "Em Espera", slaMinutes: 1440, color: "#f97316" }, 
  { slug: "aguardando_resposta", name: "Aguardando Resposta", slaMinutes: 1440, color: "#64748b", timeoutMinutes: 2880, nextStatusSlug: "atendimento_fechado" },
  { slug: "atendimento_fechado", name: "Atendimento Fechado", slaMinutes: 0, color: "#22c55e" },
  { slug: "ticket_invalido", name: "Ticket Inválido", slaMinutes: 0, color: "#94a3b8" }
];

/**
 * Worker de automação que processa timeouts de status
 */
export async function processStatusTimeouts() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  
  try {
    // Buscar todos os tickets que têm status com timeout configurado
    const statusWithTimeout = await db.select().from(ticketStatuses).where(and(
      isNotNull(ticketStatuses.timeoutMinutes),
      isNotNull(ticketStatuses.nextStatusSlug)
    ));

    if (statusWithTimeout.length === 0) return;

    const timeoutSlugs = statusWithTimeout.map(s => s.slug);

    // Buscar tickets nestes status
    const ticketsToProcess = await db.select().from(tickets).where(and(
      inArray(tickets.status, timeoutSlugs)
    ));

    for (const ticket of ticketsToProcess) {
      const statusConfig = statusWithTimeout.find(s => s.slug === ticket.status);
      if (!statusConfig || !statusConfig.timeoutMinutes || !statusConfig.nextStatusSlug) continue;

      const startTime = ticket.statusStartedAt || ticket.lastInteractionAt || ticket.openedAt || ticket.createdAt;
      const timeoutThreshold = new Date(startTime.getTime() + (statusConfig.timeoutMinutes * 60000));
      
      if (now > timeoutThreshold) {
        logger.info(`[Automation] Ticket ${ticket.protocol} timed out. Moving from ${ticket.status} to ${statusConfig.nextStatusSlug}`);
        
        const updates: any = { 
          status: statusConfig.nextStatusSlug,
          updatedAt: now
        };

        if (statusConfig.nextStatusSlug === "atendimento_fechado") {
          updates.closedReason = "automatico_sem_interacao";
        }
        
        await updateTicket(ticket.id, updates);
        
        await createTicketHistory({
          ticketId: ticket.id,
          userId: 1, // ID do sistema/admin padrão
          action: "status_updated",
          oldValue: ticket.status,
          newValue: statusConfig.nextStatusSlug,
          comment: `Transição automática por inatividade (${statusConfig.timeoutMinutes} min)`
        });
      }
    }
  } catch (error) {
    logger.error("[Automation] Failed to process status timeouts", { error });
  }
}

export async function ensureTicketStatusesSeeded() {
  const db = await getDb();
  if (!db) return;

  try {
    logger.info("[Database] Synchronizing ticket statuses...");
    for (const status of INITIAL_STATUSES) {
      const [existing] = await db
        .select()
        .from(ticketStatuses)
        .where(eq(ticketStatuses.slug, status.slug))
        .limit(1);

      if (existing) {
        // Atualiza se já existe para garantir consistência
        await db.update(ticketStatuses)
          .set({
            name: status.name,
            slaMinutes: status.slaMinutes,
            timeoutMinutes: (status as any).timeoutMinutes || null,
            nextStatusSlug: (status as any).nextStatusSlug || null,
            color: status.color,
            isActive: true
          })
          .where(eq(ticketStatuses.id, existing.id));
      } else {
        // Insere se não existe
        await db.insert(ticketStatuses).values({
          name: status.name,
          slug: status.slug,
          slaMinutes: status.slaMinutes,
          timeoutMinutes: (status as any).timeoutMinutes || null,
          nextStatusSlug: (status as any).nextStatusSlug || null,
          color: status.color,
          isActive: true
        });
      }
    }
    logger.info("[Database] Ticket statuses synchronized.");
  } catch (error) {
    logger.error("[Database] Failed to seed ticket statuses", { error });
  }
}

/**
 * Garante que o profile type SuperAdmin existe
 */
async function ensureSuperAdminProfileType(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db
      .select()
      .from(userProfileTypes)
      .where(eq(userProfileTypes.role, "SuperAdmin"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userProfileTypes).values({
        name: "Super Administrador",
        description: "Perfil com acesso total e irrestrito ao sistema",
        role: "SuperAdmin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      logger.info("✅ Profile type SuperAdmin criado com sucesso");
    }
  } catch (error) {
    logger.warn("⚠️ Erro ao criar profile type SuperAdmin:", error);
  }
}

/**
 * Promove usuário para SuperAdmin automaticamente
 */
async function promoteSuperAdminUser(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const SUPERADMIN_EMAIL = "ricardopalacio33@gmail.com";

  try {
    // 1. Buscar usuário
    const user = await getUserByEmail(SUPERADMIN_EMAIL) || await getUserByEmail(SUPERADMIN_EMAIL.toUpperCase());
    if (!user) {
      logger.warn(`⚠️ Usuário ${SUPERADMIN_EMAIL} não encontrado para promoção`);
      return;
    }

    // 2. Buscar profile type SuperAdmin
    const [superAdminProfileType] = await db
      .select()
      .from(userProfileTypes)
      .where(eq(userProfileTypes.role, "SuperAdmin"))
      .limit(1);

    if (!superAdminProfileType) {
      logger.warn("⚠️ Profile type SuperAdmin não encontrado");
      return;
    }

    // 3. Atualizar role do usuário
    await db
      .update(users)
      .set({ role: "SuperAdmin", updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // 4. Atualizar profile do usuário
    await db
      .update(profiles)
      .set({ 
        profileTypeId: superAdminProfileType.id,
        updatedAt: new Date() 
      })
      .where(eq(profiles.userId, user.id));

    logger.info(`✅ Usuário ${SUPERADMIN_EMAIL} promovido para SuperAdmin com sucesso`);
  } catch (error) {
    logger.warn(`⚠️ Erro ao promover usuário para SuperAdmin:`, error);
  }
}

// ============================================================================
// CHAT INTERNO
// ============================================================================

export async function getInternalConversationsByTicketId(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(internalConversations).where(eq(internalConversations.ticketId, ticketId));
}

export async function createInternalConversation(data: InsertInternalConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(internalConversations).values(data);
  return result[0].insertId;
}

export async function addConversationParticipant(data: InsertConversationParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversationParticipants).values(data);
}

export async function getInternalMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(internalMessages)
    .where(eq(internalMessages.conversationId, conversationId))
    .orderBy(internalMessages.createdAt);
}

export async function createInternalMessage(data: InsertInternalMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(internalMessages).values(data);
  return result[0].insertId;
}

export async function getConversationParticipants(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    userId: conversationParticipants.userId,
    name: users.name,
    email: users.email,
  })
  .from(conversationParticipants)
  .leftJoin(users, eq(users.id, conversationParticipants.userId))
  .where(eq(conversationParticipants.conversationId, conversationId));
}

export async function getInternalMessagesByTicketId(ticketId: number) {
  const dbClient = await getDb();
  if (!dbClient) return [];
  
  return await dbClient.select({
    id: internalMessages.id,
    conversationId: internalMessages.conversationId,
    senderId: internalMessages.senderId,
    message: internalMessages.message,
    fileUrl: internalMessages.fileUrl,
    fileName: internalMessages.fileName,
    fileType: internalMessages.fileType,
    createdAt: internalMessages.createdAt,
    senderName: sql<string>`COALESCE(${profiles.fullName}, ${users.name}, 'Sistema')`
  })
  .from(internalMessages)
  .innerJoin(internalConversations, eq(internalConversations.id, internalMessages.conversationId))
  .leftJoin(users, eq(users.id, internalMessages.senderId))
  .leftJoin(profiles, eq(profiles.userId, users.id))
  .where(eq(internalConversations.ticketId, ticketId))
  .orderBy(internalMessages.createdAt);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CSAT (Pesquisa de Satisfação)
// ============================================================================

export async function generateCsatRequest(ticketId: number) {
  const db = await getDb();
  if (!db) return null;

  const ticket = await getTicketById(ticketId);
  if (!ticket || !ticket.clienteId) return null;

  // 1. Buscar configurações do BOT
  const configs = await db
    .select()
    .from(quickMessages)
    .where(
        and(
            eq(quickMessages.active, true),
            inArray(quickMessages.category, ["BOT-CSAT_PERGUNTA", "BOT-CSAT_TIMEOUT"])
        )
    );

  const perguntaConfig = configs.find(c => c.category === "BOT-CSAT_PERGUNTA");
  const timeoutConfig = configs.find(c => c.category === "BOT-CSAT_TIMEOUT");

  // Se não tiver mensagem de pergunta configurada, não envia pesquisa
  if (!perguntaConfig) return null;
  
  // 1. Configurações de timeout (Requirement 3: timeout de 1 hora)
  // Se for 1 minuto, provavelmente é erro de config legado, forçamos 60.
  let timeoutMinutes = perguntaConfig?.timeoutMinutes || timeoutConfig?.timeoutMinutes || 60;
  if (timeoutMinutes === 1) timeoutMinutes = 60;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (timeoutMinutes * 60000));

  logger.info(`[CSAT] Generating request for Ticket ${ticketId}. BaseURL: ${ENV.appBaseUrl}, Timeout: ${timeoutMinutes}min`);

  // 2. Criar registro de pesquisa
  await db.insert(csatSurveys).values({
    ticketId,
    clienteId: ticket.clienteId,
    status: "pending",
    expiresAt,
    createdAt: now,
    sentAt: now,
  });

  return {
    message: perguntaConfig.content,
    ticket,
    shouldSend: true
  };
}



export async function updateCsatStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(csatSurveys).set({ status: status as any }).where(eq(csatSurveys.id, id));
}

// Revert processCsatResponse and remove getQuickMessageContent
export async function processCsatResponse(ticketId: number, rating: number) {
    const db = await getDb();
    if (!db) return null;

    const surveys = await db
        .select()
        .from(csatSurveys)
        .where(
            and(
                eq(csatSurveys.ticketId, ticketId),
                eq(csatSurveys.status, "pending")
            )
        )
        .limit(1);
    
    if (surveys.length === 0) return null;
    const pendingSurvey = surveys[0];

    // Atualizar survey
    await db.update(csatSurveys)
        .set({
            status: "answered",
            rating,
            answeredAt: new Date()
        })
        .where(eq(csatSurveys.id, pendingSurvey.id));

    // Logar no histórico
    const emoticon = rating === 3 ? "🤩" : rating === 2 ? "🙂" : "😡";
    const label = rating === 3 ? "Excelente" : rating === 2 ? "Bom" : "Ruim";

    await createTicketHistory({
        ticketId: pendingSurvey.ticketId,
        userId: null, // Sistema
        action: "csat_response",
        newValue: `Cliente avaliou como: ${label} ${emoticon}`,
        comment: `Nota: ${rating}`
    });

    // Buscar ticket para saber o canal
    const ticket = await getTicketById(pendingSurvey.ticketId);
    const isWhatsapp = ticket?.channel === "whatsapp";

    // Inserir mensagem no chat (Requirement 2)
    // Se for e-mail, isFromWhatsapp deve ser false para não triggar ponte de whatsapp
    await createTicketMessage({
      ticketId: pendingSurvey.ticketId,
      senderType: "Cliente",
      message: `${label} ${emoticon}`,
      isFromWhatsapp: isWhatsapp,
    });

    // Buscar mensagem de agradecimento
    const msgKey = rating === 3 ? "BOT-CSAT_EXCELENTE" : rating === 2 ? "BOT-CSAT_BOM" : "BOT-CSAT_RUIM";
    
    // Alerta Gestor se nota for ruim (Requirement)
    if (rating <= 1) {
        const { triggerBadCsatAlert } = await import("./services/alertService");
        triggerBadCsatAlert(pendingSurvey.ticketId, rating).catch(err => 
            logger.warn("[CSAT] Erro ao disparar alerta de gestor", err)
        );
    }

    const botMsg = await db
        .select()
        .from(quickMessages)
        .where(
            and(
                eq(quickMessages.category, msgKey),
                eq(quickMessages.active, true)
            )
        )
        .limit(1);
    
    const content = botMsg.length > 0 ? botMsg[0].content : null;

    // Registrar resposta de agradecimento do BOT no chat também
    if (content) {
        await createTicketMessage({
            ticketId: pendingSurvey.ticketId,
            senderType: "sistema",
            message: content,
            isFromWhatsapp: false,
        });
    }

    return content;
}

/**
 * Busca uma pesquisa respondida recentemente para um contato
 */
export async function findRecentCsatAnswerByContact(phone: string) {
    const database = await getDb();
    if (!database) return null;

    // 1. Buscar o Cliente
    const Cliente = await getClienteByPhone(phone);
    if (!Cliente) return null;

    // 2. Buscar a última pesquisa respondida
    const result = await database.select()
        .from(csatSurveys)
        .where(
            and(
                eq(csatSurveys.clienteId, Cliente.id),
                eq(csatSurveys.status, "answered")
            )
        )
        .orderBy(desc(csatSurveys.answeredAt))
        .limit(1);
    
    if (result.length === 0) return null;
    const survey = result[0];

    // 3. Buscar config de cooldown (timeoutSeconds no BOT-CSAT_PERGUNTA)
    const configs = await database.select()
        .from(quickMessages)
        .where(and(eq(quickMessages.category, "BOT-CSAT_PERGUNTA"), eq(quickMessages.active, true)))
        .limit(1);
    
    const cooldownSeconds = configs[0]?.timeoutSeconds || 0;
    if (cooldownSeconds === 0) return null;

    const now = new Date();
    const answeredAt = survey.answeredAt ? new Date(survey.answeredAt) : new Date(0);
    const diffSeconds = (now.getTime() - answeredAt.getTime()) / 1000;

    if (diffSeconds <= cooldownSeconds) {
        return survey;
    }

    return null;
}

export async function getPendingCsatSurvey(ticketId: number) {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db.select()
        .from(csatSurveys)
        .where(
            and(
                eq(csatSurveys.ticketId, ticketId),
                eq(csatSurveys.status, "pending")
            )
        )
        .limit(1);
    
    return result.length > 0 ? result[0] : null;
}

export async function findPendingCsatSurveyByCliente(clienteId: number) {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select()
        .from(csatSurveys)
        .where(
            and(
                eq(csatSurveys.clienteId, clienteId),
                eq(csatSurveys.status, "pending")
            )
        )
        .limit(1);
    
    return result.length > 0 ? result[0] : null;
}

export async function getCsatByTicketId(ticketId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(csatSurveys)
    .where(eq(csatSurveys.ticketId, ticketId))
    .orderBy(desc(csatSurveys.createdAt))
    .limit(1);

  return result[0] || null;
}

// ============================================================================
// FIGURINHAS (STICKERS)
// ============================================================================

export async function getStickers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(stickers).where(eq(stickers.isActive, true)).orderBy(desc(stickers.createdAt));
}

export async function createSticker(data: typeof stickers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(stickers).values(data);
  return Number(result.insertId);
}

export async function deleteSticker(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(stickers).set({ isActive: false }).where(eq(stickers.id, id));
}

// ============================================================================
// BLACKLIST
// ============================================================================

export async function checkBlacklist(type: 'email' | 'whatsapp', value: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select({ id: blacklist.id })
    .from(blacklist)
    .where(and(eq(blacklist.type, type), eq(blacklist.value, value)))
    .limit(1);

  return result.length > 0;
}

export async function addToBlacklist(data: InsertBlacklist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blacklist).values(data);
}

export async function removeFromBlacklist(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blacklist).where(eq(blacklist.id, id));
}

export async function getBlacklist(type?: 'email' | 'whatsapp') {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return await db.select().from(blacklist).where(eq(blacklist.type, type)).orderBy(desc(blacklist.createdAt));
  }
  return await db.select().from(blacklist).orderBy(desc(blacklist.createdAt));
}

export async function updateBlacklist(id: number, data: Partial<InsertBlacklist>) {
    const db = await getDb();
    if (!db) return;
    await db.update(blacklist).set(data).where(eq(blacklist.id, id));
}

export async function getLastMessageFromContact(identifier: string) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .select({
            message: ticketMessages.message,
            createdAt: ticketMessages.createdAt,
            ticketId: tickets.id,
            protocol: tickets.protocol
        })
        .from(ticketMessages)
        .innerJoin(tickets, eq(tickets.id, ticketMessages.ticketId))
        .where(
            and(
                eq(tickets.externalIdentifier, identifier),
                ne(ticketMessages.senderType, 'atendente'),
                ne(ticketMessages.senderType, 'sistema')
            )
        )
        .orderBy(desc(ticketMessages.createdAt))
        .limit(1);

    return result[0] || null;
}

export async function logWhatsappCommunication(data: InsertWhatsappCommunicationLog) {
  const db = await getDb();
  if (!db) return;
  
  // Segurança extra: nunca salvar logs que contenham e-mail no campo de telefone
  // (Prevenindo que scripts de suporte ou automações de e-mail poluam o log do WhatsApp Meta)
  if (data.phoneNumber && (data.phoneNumber.includes("@") || data.phoneNumber.includes("."))) {
      return;
  }

  try {
    await db.insert(whatsappCommunicationLogs).values(data);
  } catch (error) {
    logger.error("[Database] Failed to log whatsapp communication", { error: (error as Error)?.message });
  }
}

export async function logAudit(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    logger.error("[Database] Failed to log audit", { error: (error as Error)?.message });
  }
}

export async function getAuditLogs(filters: {
  limit?: number;
  offset?: number;
  action?: string;
  userId?: number;
  entity?: string;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { limit = 50, offset = 0, action, userId, entity } = filters;
  
  const clauses = [];
  if (action) clauses.push(eq(auditLogs.action, action));
  if (userId) clauses.push(eq(auditLogs.userId, userId));
  if (entity) clauses.push(like(auditLogs.entity, `%${entity}%`));

  const where = clauses.length ? and(...clauses) : undefined;

  const [items, totalResult] = await Promise.all([
    db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userPhoto: profiles.avatarUrl,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      page: auditLogs.page,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset),
    db.select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where)
  ]);

  return {
    items,
    total: totalResult[0]?.count ?? 0
  };
}

export async function deleteAuditLogsByPeriod(dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return;
  await db.delete(auditLogs).where(and(gte(auditLogs.createdAt, dateFrom), lte(auditLogs.createdAt, dateTo)));
}

export async function deleteWhatsappCommunicationLogsByPeriod(dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return;
  await db.delete(whatsappCommunicationLogs).where(and(gte(whatsappCommunicationLogs.createdAt, dateFrom), lte(whatsappCommunicationLogs.createdAt, dateTo)));
}






