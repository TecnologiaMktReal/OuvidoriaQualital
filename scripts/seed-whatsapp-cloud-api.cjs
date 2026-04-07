const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3307/app_db";
  try {
    const conn = await mysql.createConnection(url);
    
    const verifyToken = "coopedu_whatsapp_secret_2025";
    const verifyTokenHash = require('crypto').createHash('sha256').update(verifyToken).digest('hex');
    
    const encryptionKey = require('crypto').createHash('sha256').update('coopedu_super_secret_crypto_key_2025_safe').digest();
    
    function encrypt(text) {
      const iv = require('crypto').randomBytes(12);
      const cipher = require('crypto').createCipheriv('aes-256-gcm', encryptionKey, iv);
      const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      return `${iv.toString('hex')}.${cipher.getAuthTag().toString('hex')}.${enc.toString('hex')}`;
    }

    const sessionData = {
      phoneNumberId: "123456789",
      verifyTokenHash: verifyTokenHash,
      verifyTokenHint: "****2025",
      accessTokenEncrypted: encrypt("fake_access_token"),
      accessTokenHint: "fake...oken",
      appSecretEncrypted: encrypt("fake_app_secret"),
      appSecretHint: "fake...cret",
      status: "connected",
      integrationType: "cloud_api"
    };

    console.log("Seeding whatsapp-cloud-api session...");
    await conn.query(`
      INSERT INTO whatsapp_sessions (sessionName, status, sessionData)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      sessionData = VALUES(sessionData),
      status = VALUES(status)
    `, ["whatsapp-cloud-api", "disconnected", JSON.stringify(sessionData)]);
    
    await conn.end();
    console.log("Seed concluído.");
  } catch (err) {
    console.error("Erro:", err.message);
  }
})();


