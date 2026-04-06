import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../db";
import { reportSchedules, reportDeliveryLogs, users, profiles } from "../../drizzle/schema";

export async function listReportSchedules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reportSchedules).orderBy(desc(reportSchedules.createdAt));
}

export async function createReportSchedule(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reportSchedules).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertId;
}

export async function updateReportSchedule(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(reportSchedules)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(reportSchedules.id, id));
}

export async function deleteReportSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reportSchedules).where(eq(reportSchedules.id, id));
}

export async function listReportDeliveryLogs(scheduleId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const query = db
    .select({
      id: reportDeliveryLogs.id,
      scheduleId: reportDeliveryLogs.scheduleId,
      reportType: reportDeliveryLogs.reportType,
      channel: reportDeliveryLogs.channel,
      status: reportDeliveryLogs.status,
      errorMessage: reportDeliveryLogs.errorMessage,
      sentAt: reportDeliveryLogs.sentAt,
      recipientName: profiles.fullName,
      recipientValue: reportDeliveryLogs.recipientValue,
    })
    .from(reportDeliveryLogs)
    .leftJoin(users, eq(reportDeliveryLogs.recipientId, users.id))
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .orderBy(desc(reportDeliveryLogs.sentAt));

  if (scheduleId) {
    return await query.where(eq(reportDeliveryLogs.scheduleId, scheduleId)).limit(100);
  }

  return await query.limit(100);
}



