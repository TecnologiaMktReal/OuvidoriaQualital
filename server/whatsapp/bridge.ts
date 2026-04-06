import { getActiveType } from "./config";
import * as cloudService from "./service";
import * as qrService from "./serviceQr";
import { logger } from "../_core/logger";

export async function sendWhatsAppMedia(
  phone: string,
  mimeType: string,
  base64Data: string,
  fileName: string,
  caption?: string
) {
  const activeType = await getActiveType();
  logger.info(`[WhatsApp-Bridge] Enviando mídia (${mimeType}) via ${activeType}`, { phone });

  if (activeType === "qr") {
    // Envia mídia e legenda em uma única chamada (balão único no WhatsApp)
    return await qrService.sendQrMediaBase64(phone, mimeType, base64Data, fileName, caption);
  } else {
    // Cloud API - Por enquanto suporta apenas mensagem de texto se a mídia falhar ou não estiver implementada
    // Vou implementar o upload de mídia na service.ts e chamar aqui
    return await (cloudService as any).sendWhatsAppMediaBase64(phone, mimeType, base64Data, fileName, caption);
  }
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  const activeType = await getActiveType();
  if (activeType === "qr") {
    return await qrService.sendQrMessage(phone, message);
  } else {
    return await cloudService.sendWhatsAppMessage(phone, message);
  }
}



