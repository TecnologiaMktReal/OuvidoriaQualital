import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateDailyReportHtml, DailyReportData } from "../reports/dailyReport";
import puppeteer from "puppeteer";
import * as db from "../db";
import { count, eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { generatePeriodicReportAnalysis } from "../services/aiAnalysis";
import { generatePeriodicReportHtml } from "../reports/periodicReport";

export const reportsRouter = router({
  generateDailyPdf: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        generatedAt: z.string(),
        totalTickets: z.number(),
        closedTickets: z.number(),
        waitingTickets: z.number(),
        validTickets: z.number(),
        avgTmaMs: z.number(),
        peakHour: z.string(),
        statusCounts: z.array(z.object({ name: z.string(), value: z.number(), color: z.string() })),
        hourSeries: z.array(z.object({ hour: z.string(), total: z.number(), closed: z.number() })),
        byContract: z.array(z.object({ name: z.string(), value: z.number() })),
        tmaByReason: z.array(z.object({ name: z.string(), value: z.number() })),
        attendedByContract: z.array(z.object({ name: z.string(), value: z.number() })),
        attendedByReason: z.array(z.object({ name: z.string(), value: z.number() })),
        matrixTipoContrato: z.array(z.object({ reason: z.string(), contract: z.string(), value: z.number() })),
        csat: z.object({
          dist: z.object({ excelente: z.number(), bom: z.number(), ruim: z.number(), na: z.number() }),
          total: z.number(),
        }),
        analyses: z.object({
          volume: z.string(),
          timeline: z.string(),
          matrix: z.string(),
          csat: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const html = generateDailyReportHtml(input);
      console.log("[DAILY REPORT] HTML gerado, tamanho:", html.length);
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const headerTemplate = `
          <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 9px; padding: 10px 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px solid #e2e8f0; margin: 0 20px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="https://aedirlkgmglxotajdnqt.supabase.co/storage/v1/object/public/imagens/logo-coopedu%20branco.png" style="height: 18px; filter: brightness(0) invert(0.5);" />
              <span style="font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Performance Operacional HDC</span>
            </div>
            <div style="font-weight: 500;">Coopedu • Atendimento</div>
          </div>
        `;

        const footerTemplate = `
          <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 8px; padding: 5px 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; margin: 0 20px;">
            <div style="font-weight: 500;">Confidencial • Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
            <div style="font-weight: 700;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
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
        console.log("[DAILY REPORT] PDF gerado, tamanho:", pdfBuffer.length);
        const base64 = Buffer.from(pdfBuffer).toString("base64");
        console.log("[DAILY REPORT] Base64 gerado, primeiros chars:", base64.substring(0, 50));
        return {
          success: true,
          pdfBase64: base64,
        };
      } catch (err: any) {
        console.error("[DAILY REPORT PDF ERROR]", err);
        throw new Error(`Falha ao gerar PDF do relatório: ${err.message}`);
      } finally {
        if (browser) await browser.close();
      }
    }),
  getRanking: protectedProcedure
    .input(
      z.object({
        type: z.enum(["Cliente", "coordenador", "contrato", "tipo"]),
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      const { type, startDate, endDate, limit } = input;
      const database = await db.getDb();
      if (!database) return [];

      const dateFilter = and(
        gte(db.tickets.openedAt, startDate),
        lte(db.tickets.openedAt, endDate)
      );

      if (type === "Cliente") {
        return await database
          .select({
            id: db.clientes.id,
            name: db.clientes.name,
            count: count(db.tickets.id),
          })
          .from(db.tickets)
          .innerJoin(db.clientes, eq(db.tickets.clienteId, db.clientes.id))
          .where(dateFilter)
          .groupBy(db.clientes.id, db.clientes.name)
          .orderBy(desc(count(db.tickets.id)))
          .limit(limit);
      }

      if (type === "contrato") {
        return await database
          .select({
            id: db.contracts.id,
            name: db.contracts.name,
            count: count(db.tickets.id),
          })
          .from(db.tickets)
          .innerJoin(db.contracts, eq(db.tickets.contractId, db.contracts.id))
          .where(dateFilter)
          .groupBy(db.contracts.id, db.contracts.name)
          .orderBy(desc(count(db.tickets.id)))
          .limit(limit);
      }

      if (type === "tipo") {
        return await database
          .select({
            id: db.reasons.id,
            name: db.reasons.name,
            count: count(db.tickets.id),
          })
          .from(db.tickets)
          .innerJoin(db.reasons, eq(db.tickets.reasonId, db.reasons.id))
          .where(dateFilter)
          .groupBy(db.reasons.id, db.reasons.name)
          .orderBy(desc(count(db.tickets.id)))
          .limit(limit);
      }

      if (type === "coordenador") {
        // Alias para clientes (coordenadores)
        const coordinators = sql`coordinators`;
        
        // Usando SQL bruto para facilitar o join triplo e agrupamento se necessário, 
        // mas tentaremos Drizzle primeiro.
        // O coordenador é clientes.id referenciado por contracts.coordinatorclienteId
        return await database
          .select({
            id: db.clientes.id,
            name: db.clientes.name,
            count: count(db.tickets.id),
          })
          .from(db.tickets)
          .innerJoin(db.contracts, eq(db.tickets.contractId, db.contracts.id))
          .innerJoin(db.clientes, eq(db.contracts.coordinatorclienteId, db.clientes.id))
          .where(dateFilter)
          .groupBy(db.clientes.id, db.clientes.name)
          .orderBy(desc(count(db.tickets.id)))
          .limit(limit);
      }

      return [];
    }),
  getPeriodicMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["diario", "ontem", "semanal", "mensal", "anual"]),
        date: z.date(),
        withAiAnalysis: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      const { period, date, withAiAnalysis } = input;

      let dateFrom: Date;
      let dateTo: Date;

      // Calcular range baseado no período e data de referência
      if (period === "diario" || period === "ontem") {
        dateFrom = new Date(date);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(date);
        dateTo.setHours(23, 59, 59, 999);
      } else if (period === "semanal") {
        // Início da semana (Segunda)
        dateFrom = new Date(date);
        const day = dateFrom.getDay();
        const diff = dateFrom.getDate() - day + (day === 0 ? -6 : 1);
        dateFrom.setDate(diff);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(dateFrom);
        dateTo.setDate(dateFrom.getDate() + 6);
        dateTo.setHours(23, 59, 59, 999);
      } else if (period === "mensal") {
        dateFrom = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        dateTo = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      } else { // anual
        dateFrom = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
        dateTo = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      const metrics = await db.getPeriodicReportMetrics({
        period,
        dateFrom,
        dateTo,
      });

      if (!metrics) return null;

      let aiAnalysis = null;
      if (withAiAnalysis && metrics.totalTickets > 0) {
        aiAnalysis = await generatePeriodicReportAnalysis(metrics);
      }

      return {
        ...metrics,
        aiAnalysis,
      };
    }),
  generatePeriodicPdf: protectedProcedure
    .input(
      z.object({
        period: z.enum(["diario", "ontem", "semanal", "mensal", "anual"]),
        date: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const { period, date } = input;

      // Reutilizar lógica de range (poderia ser refatorada para uma helper)
      let dateFrom: Date;
      let dateTo: Date;

      if (period === "diario" || period === "ontem") {
        dateFrom = new Date(date);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(date);
        dateTo.setHours(23, 59, 59, 999);
      } else if (period === "semanal") {
        dateFrom = new Date(date);
        const day = dateFrom.getDay();
        const diff = dateFrom.getDate() - day + (day === 0 ? -6 : 1);
        dateFrom.setDate(diff);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(dateFrom);
        dateTo.setDate(dateFrom.getDate() + 6);
        dateTo.setHours(23, 59, 59, 999);
      } else if (period === "mensal") {
        dateFrom = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        dateTo = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        dateFrom = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
        dateTo = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      const metrics = await db.getPeriodicReportMetrics({
        period,
        dateFrom,
        dateTo,
      });

      if (!metrics) throw new Error("Métricas não encontradas");

      const aiAnalysis = await generatePeriodicReportAnalysis(metrics);
      
      const html = generatePeriodicReportHtml({
        ...metrics,
        aiAnalysis,
      });

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const headerTemplate = `
        <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 9px; padding: 10px 40px; color: white; background-color: #0f172a; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://aedirlkgmglxotajdnqt.supabase.co/storage/v1/object/public/imagens/logo-coopedu%20branco.png" style="height: 18px;" />
            <span style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Relatório de Gestão HDC v2</span>
          </div>
          <div style="font-weight: 500; opacity: 0.7;">Coopedu • Help Desk</div>
        </div>
      `;

      const footerTemplate = `
        <div style="font-family: 'Inter', sans-serif; width: 100%; font-size: 8px; padding: 5px 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 500;">Confidencial • Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
          <div style="font-weight: 700;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
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

      await browser.close();
      return Buffer.from(pdfBuffer).toString("base64");
    }),
});



