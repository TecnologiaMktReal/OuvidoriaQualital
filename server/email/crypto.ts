import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const material =
    process.env.EMAIL_CRYPTO_KEY ||
    process.env.WHATSAPP_CRYPTO_KEY ||
    "default-email-key-change-me";
  return crypto.createHash("sha256").update(material).digest();
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptSecret(payload?: string | null): string | null {
  if (!payload) return null;
  try {
    const key = getEncryptionKey();
    const [ivHex, tagHex, dataHex] = payload.split(".");
    if (!ivHex || !tagHex || !dataHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}





