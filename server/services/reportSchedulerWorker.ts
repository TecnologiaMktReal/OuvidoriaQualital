import puppeteer from "puppeteer";
import * as db from "../db";
import { reportDeliveryLogs } from "../../drizzle/schema";
import { generateReportDataAndHtml } from "./reportGenerator";
import { sendWhatsAppMediaBase64 } from "../whatsapp/service";
import { sendEmail } from "../email/service";
import { logger } from "../_core/logger";

let isRunning = false;

export async function processReportSchedules() {
  if (isRunning) return;
  isRunning = true;

  try {
    const schedules = await db.listReportSchedules();
    const activeSchedules = schedules.filter(s => s.isActive);
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

    for (const schedule of activeSchedules) {
      // Check if current time matches schedule time
      if (schedule.scheduleTime !== currentTime) continue;

      // Check frequency/days (simplified for now: if daily run every day, if weekly check daysOfWeek)
      if (schedule.frequency === "weekly") {
        const days = schedule.daysOfWeek as number[];
        if (days && !days.includes(currentDay)) continue;
      }

      // Check if already run recently (within 5 minutes)
      if (schedule.lastRunAt) {
        const lastRun = new Date(schedule.lastRunAt);
        const diffMs = now.getTime() - lastRun.getTime();
        if (diffMs < 5 * 60 * 1000) continue; 
      }

      logger.info(`[ReportScheduler] Executando agendamento: ${schedule.name} (#${schedule.id})`);

      try {
        // 1. Generate HTML
        const html = await generateReportDataAndHtml(schedule.reportType, schedule.period);

        // 2. HTML to PDF
        const pdfBuffer = await htmlToPdf(html, schedule.name);

        // 3. Send to recipients
        const recipients = await db.getUsersByIds(schedule.recipients as number[]);
        const channels = schedule.channels as string[];
        const fileName = `Relatorio_${schedule.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
        const base64 = pdfBuffer.toString("base64");

        const dbClient = await db.getDb();
        for (const recipient of recipients) {
          if (channels.includes("whatsapp") && recipient.phone) {
            const res = await sendWhatsAppMediaBase64(
              recipient.phone,
              "application/pdf",
              base64,
              fileName,
              schedule.message || `Segue em anexo o ${schedule.name}.`
            );
            
            if (dbClient) {
              await dbClient.insert(reportDeliveryLogs).values({
                scheduleId: schedule.id,
                reportType: schedule.reportType,
                channel: "whatsapp",
                recipientId: recipient.id,
                recipientValue: recipient.phone,
                status: res.success ? "success" : "error",
                errorMessage: res.error || null,
                sentAt: new Date()
              });
            }
          }

          if (channels.includes("email") && recipient.email) {
            try {
              await sendEmail({
                to: recipient.email,
                subject: `Relatório Agendado: ${schedule.name}`,
                html: `<p>${schedule.message || `Segue em anexo o ${schedule.name}.`}</p>`,
                attachments: [{
                  filename: fileName,
                  content: pdfBuffer,
                  contentType: "application/pdf"
                }]
              });

              if (dbClient) {
                await dbClient.insert(reportDeliveryLogs).values({
                  scheduleId: schedule.id,
                  reportType: schedule.reportType,
                  channel: "email",
                  recipientId: recipient.id,
                  recipientValue: recipient.email,
                  status: "success",
                  sentAt: new Date()
                });
              }
            } catch (err: any) {
              if (dbClient) {
                await dbClient.insert(reportDeliveryLogs).values({
                  scheduleId: schedule.id,
                  reportType: schedule.reportType,
                  channel: "email",
                  recipientId: recipient.id,
                  recipientValue: recipient.email,
                  status: "error",
                  errorMessage: err.message,
                  sentAt: new Date()
                });
              }
            }
          }
        }

        // 4. Update last run
        await db.updateReportSchedule(schedule.id, { lastRunAt: new Date() });

      } catch (err: any) {
        logger.error(`[ReportScheduler] Falha ao processar agendamento ${schedule.id}:`, err);
      }
    }
  } catch (err) {
    logger.error("[ReportScheduler] Erro no worker:", err);
  } finally {
    isRunning = false;
  }
}

async function htmlToPdf(html: string, title: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const headerTemplate = `
      <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 9px; padding: 10px 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px solid #e2e8f0; margin: 0 20px;">
        <div style="display: flex; align-items: center; gap: 8px;">
           <span style="font-weight: 700; color: #1e293b; text-transform: uppercase;">${title}</span>
        </div>
        <div style="font-weight: 500;">Coopedu \u2022 Atendimento</div>
      </div>
    `;

    const footerTemplate = `
      <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 8px; padding: 5px 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; margin: 0 20px;">
        <div style="font-weight: 500;">Confidencial \u2022 Gerado automaticamente</div>
        <div style="font-weight: 700;">P\u00E1gina <span class="pageNumber"></span> de <span class="totalPages"></span></div>
      </div>
    `;

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: "1.8cm", bottom: "1.2cm", left: "0cm", right: "0cm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}



