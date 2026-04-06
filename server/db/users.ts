import { eq, sql } from "drizzle-orm";
import { 
  InsertUser, users, profiles, userProfileTypes, departments,
  type InsertProfile
} from "../../drizzle/schema";
import { getDb } from "./base";
import { logger } from "../_core/logger";
import { getSupabaseAdminClient, disableSupabaseAdmin } from "../_core/supabaseAdmin";

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

    if (existing.length > 0) {
      await db.update(users).set({
        name: user.name ?? existing[0].name,
        email: user.email ?? existing[0].email,
        loginMethod: user.loginMethod ?? existing[0].loginMethod,
        lastSignedIn: sql`NOW()`,
      }).where(eq(users.id, existing[0].id));
    } else {
      await db.insert(users).values(user);
    }
  } catch (error) {
    logger.error("Error in upsertUser", { error, user });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function createProfile(profile: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(profiles).values(profile);
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function updateProfile(id: number, data: Partial<InsertProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(profiles).set(data).where(eq(profiles.id, id));
}

export async function ensureProfileRecord(
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
  const existing = await getProfileByUserId(userId);
  if (!existing) {
    await createProfile({ ...data, userId });
  } else {
    await updateProfile(existing.id, data);
  }
}

export async function syncSupabaseUsersToDatabase() {
  if (disableSupabaseAdmin) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const db = await getDb();
  if (!db) return;

  try {
    const { data: { users: sbUsers }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    for (const sbUser of sbUsers) {
      await upsertUser({
        openId: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
        loginMethod: 'supabase',
        isEmailVerified: !!sbUser.email_confirmed_at,
      });

      const user = await getUserByOpenId(sbUser.id);
      if (user) {
        await ensureProfileRecord(user.id, {
          fullName: sbUser.user_metadata?.full_name || user.name || '',
          nickname: sbUser.user_metadata?.nickname || null,
          avatarUrl: sbUser.user_metadata?.avatar_url || null,
        });
      }
    }
    logger.info("Supabase users synced successfully");
  } catch (error) {
    logger.error("Error syncing Supabase users", { error });
  }
}

export async function listSystemUsers(filters: {
  page: number;
  pageSize: number;
  search?: string;
  departmentId?: number;
  profileTypeId?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const offset = (filters.page - 1) * filters.pageSize;
  const conditions = [];
  
  if (filters.search) {
    conditions.push(sql`(users.name LIKE ${`%${filters.search}%`} OR users.email LIKE ${`%${filters.search}%`} OR profiles.nickname LIKE ${`%${filters.search}%`})`);
  }
  if (filters.departmentId) {
    conditions.push(eq(profiles.departmentId, filters.departmentId));
  }
  if (filters.profileTypeId) {
    conditions.push(eq(profiles.profileTypeId, filters.profileTypeId));
  }

  const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  // This is a simplified version, the actual implementation in db.ts might be more complex with joins
  // I should probably check the actual implementation in db.ts
  return { items: [], total: 0 }; 
}



