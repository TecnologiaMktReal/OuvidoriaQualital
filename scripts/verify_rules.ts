import "dotenv/config";
import { createCliente, upsertClienteBankData, getDb, deleteCliente } from "../server/db";
import { InsertCliente, ClienteBankData } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function test() {
  console.log("Starting verification...");
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  const testCpf = "123.456.789-00";
  const testMatricula = 999999;
  const testPhone = "(85) 99999-9999";

  try {
    // 1. Testar Transformação de Banco
    console.log("Testing Bank Transformation (Bank 450)...");
    const coopId = await createCliente({
      name: "TEST CLIENTE",
      document: testCpf,
      registrationNumber: testMatricula,
      whatsappNumber: testPhone,
      status: "ativo",
    } as any);

    await upsertClienteBankData({
      ClienteId: coopId,
      bankCode: "450",
      bankName: "Qualquer Banco",
      accountType: "corrente",
      agency: "0001",
      accountNumber: "12345",
    } as any);

    const bankDataRows = await db.select().from(ClienteBankData).where(eq(ClienteBankData.ClienteId, coopId)).limit(1);
    const bankData = bankDataRows[0];

    if (bankData?.bankName === "OwlBank") {
      console.log("✅ Bank transformation successful!");
    } else {
      console.log("❌ Bank transformation failed:", bankData?.bankName);
    }

    // 2. Testar Unicidade de CPF
    console.log("Testing CPF Uniqueness...");
    try {
      await createCliente({
        name: "DUPLICATE CPF",
        document: testCpf,
        registrationNumber: 888888,
      } as any);
      console.log("❌ CPF Uniqueness failed: allowed duplicate");
    } catch (e: any) {
      console.log("✅ CPF Uniqueness successful:", e.message);
    }

    // 3. Testar Unicidade de Matrícula
    console.log("Testing Registration Number Uniqueness...");
    try {
      await createCliente({
        name: "DUPLICATE MATRICULA",
        document: "000.000.000-00",
        registrationNumber: testMatricula,
      } as any);
      console.log("❌ Registration Number Uniqueness failed: allowed duplicate");
    } catch (e: any) {
      console.log("✅ Registration Number Uniqueness successful:", e.message);
    }

    // 4. Testar Unicidade de Telefone
    console.log("Testing Phone Uniqueness...");
    try {
      await createCliente({
        name: "DUPLICATE PHONE",
        document: "111.111.111-11",
        registrationNumber: 777777,
        secondaryPhone: testPhone,
      } as any);
      console.log("❌ Phone Uniqueness failed: allowed duplicate");
    } catch (e: any) {
      console.log("✅ Phone Uniqueness successful:", e.message);
    }

    // Limpeza
    console.log("Cleaning up...");
    await deleteCliente(coopId);
    console.log("Done!");

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.exit(0);
  }
}

test();


