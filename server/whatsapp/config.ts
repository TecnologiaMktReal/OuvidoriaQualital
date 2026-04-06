import { eq } from "drizzle-orm";
import * as db from "../db";

const CONFIG_SESSION = "whatsapp-config";

export type IntegrationType = "cloud_api" | "qr";

type ConfigSessionData = {
  activeType: IntegrationType;
  updatedAt: string;
};

async function getConfigRow() {
  const client = await db.getDb();
  if (!client) return null;
  const rows = await client
    .select()
    .from(db.whatsappSessions)
    .where(eq(db.whatsappSessions.sessionName, CONFIG_SESSION))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveType(): Promise<IntegrationType> {
  const row = await getConfigRow();
  const sessionData = (row?.sessionData as ConfigSessionData | undefined) ?? null;
  return sessionData?.activeType ?? "cloud_api";
}

export async function setActiveType(type: IntegrationType) {
  const client = await db.getDb();
  if (!client) return;

  const sessionData: ConfigSessionData = {
    activeType: type,
    updatedAt: new Date().toISOString(),
  };

  await client
    .insert(db.whatsappSessions)
    .values({
      sessionName: CONFIG_SESSION,
      status: type === "cloud_api" ? "connected" : "disconnected",
      sessionData,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: type === "cloud_api" ? "connected" : "disconnected",
        sessionData,
        updatedAt: new Date(),
      },
    });
}






