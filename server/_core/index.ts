import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleWebhookEvent, handleWebhookVerification } from "../whatsapp/service";
import { startEmailPolling } from "../email/receiver";
import { getActiveType } from "../whatsapp/config";
import { initializeQrSession } from "../whatsapp/serviceQr";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 15000): Promise<number> {
  const available = await isPortAvailable(startPort);
  if (available) return startPort;

  console.warn(`[CRITICAL] Port ${startPort} is already in use.`);
  console.warn(`[TIPS] This usually means a ghost/zombie server is running.`);
  console.warn(`[TIPS] Kill existing processes or use 'Desconectar Sessão' if QR is stuck.`);
  
  // No ambiente dev, retornamos o porto original e deixamos o listen falhar
  // para evitar múltiplas instâncias em conflito.
  return startPort;
}

async function startServer() {
  // Pré-limpeza da porta 3000 no Windows para evitar zumbis que impedem o boot
  if (process.platform === "win32" && process.env.NODE_ENV === "development") {
    try {
      const preferredPort = 15000;
      const isBusy = !(await isPortAvailable(preferredPort));
      if (isBusy) {
        console.log(`[Boot] Porta ${preferredPort} ocupada. Tentando limpeza pré-vôo...`);
        const killCmd = `powershell "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${preferredPort} -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"`;
        await execAsync(killCmd);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // Ignora erro se não houver processo para matar
    }
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        // Guardar o corpo bruto para validar assinatura do webhook do WhatsApp
        (req as any).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Serve uploaded files
  const path = await import("path");
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Webhook oficial do WhatsApp Cloud API
  app.get("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const result = await handleWebhookVerification(req.query);
      if (result.verified) {
        res.status(200).send(result.challenge ?? "OK");
      } else {
        res.status(403).send("Webhook verification failed");
      }
    } catch (error) {
      console.error("[WhatsApp] Erro na verificação do webhook", error);
      res.status(500).send("internal_error");
    }
  });

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const signature =
        (req.headers["x-hub-signature-256"] as string | undefined) ||
        (req.headers["X-Hub-Signature-256"] as string | undefined);
      await handleWebhookEvent(req.body, signature, (req as any).rawBody);
      res.status(200).send("received");
    } catch (error) {
      console.error("[WhatsApp] Erro ao processar webhook", error);
      res.status(500).send("internal_error");
    }
  });

  // Captura de feedback CSAT via E-mail
  app.get("/csat-feedback", async (req, res) => {
    const { t, r } = req.query;
    const ticketId = parseInt(t as string);
    const rating = parseInt(r as string);

    if (isNaN(ticketId) || isNaN(rating)) {
      return res.status(400).send("Parâmetros inválidos.");
    }

    try {
      const db = await import("../db");
      const result = await db.processCsatResponse(ticketId, rating);
      
      if (!result) {
        return res.status(404).send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Pesquisa Expirada</h1>
              <p>Desculpe, esta pesquisa já foi respondida ou o link expirou.</p>
            </body>
          </html>
        `);
      }

      // Enviar e-mail de agradecimento no padrão oficial ( Requirement 2 )
      const { sendOutboundEmail } = await import("../email/service");
      await sendOutboundEmail({
        ticketId,
        message: result, // result contém o conteúdo configurado no BOT-CSAT_EXCELENTE/BOM/RUIM
      }).catch(err => console.error("[CSAT] Failed to send thank you email:", err));

      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feedback Recebido - Qualital</title>
            <style>
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #f5f5f5; font-family: 'Segoe UI', system-ui, sans-serif; }
              .card { background: white; padding: 50px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; width: 90%; border-top: 5px solid #10b981; }
              .icon { font-size: 50px; margin-bottom: 20px; }
              h1 { color: #111827; margin-bottom: 10px; font-size: 24px; }
              p { color: #4b5563; line-height: 1.6; font-size: 16px; margin-bottom: 20px; }
              .footer-text { font-size: 13px; color: #9ca3af; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="margin-bottom: 25px;">
                <img src="/logo-qualital-branco.png" alt="Qualital" width="225" style="display: block; margin: 0 auto;">
              </div>
              <div class="icon">✅</div>
              <h1>Obrigado!</h1>
              <p>Sua avaliação foi registrada com sucesso.</p>
              <p>Você receberá um e-mail de confirmação em instantes.</p>
              <div class="footer-text">Você já pode fechar esta aba.</div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("[CSAT] Feedback Error:", error);
      res.status(500).send("Erro interno ao processar feedback.");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "15000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Inicia polling de e-mails (IMAP) em background
  startEmailPolling();

  // Inicializa WhatsApp QR se estiver ativo de forma isolada
  const activeType = await getActiveType();
  if (activeType === "qr") {
    console.log("[WhatsApp] Tentando inicializar sessão QR em background...");
    setTimeout(() => {
        initializeQrSession().catch((err) => {
            console.error("[WhatsApp] Erro isolado no init do QR. O servidor web continua ativo:", err);
        });
    }, 5000); // Aguarda o Express firmar antes de disparar o Puppeteer
  }

  // Ativa o vigilante de automação de status (roda a cada 5 min)
  import("../db").then(db => {
    setInterval(() => {
      db.processStatusTimeouts().catch(err => console.error("[Automation] Error in status worker:", err));
    }, 5 * 60 * 1000);
  });

  // Ativa o vigilante de automação de mensagens do BOT (roda a cada 1 min)
  import("../automation/botScheduler").then(scheduler => {
    setInterval(() => {
      scheduler.processBotAutomations().catch(err => console.error("[Automation] Error in bot worker:", err));
    }, 60 * 1000); // 1 minuto
  });

  // Ativa o agendador de relatórios (roda a cada 1 min)
  import("../services/reportSchedulerWorker").then(worker => {
    setInterval(() => {
      worker.processReportSchedules().catch(err => console.error("[ReportScheduler] Error:", err));
    }, 60 * 1000); // 1 minuto
  });
}

startServer().catch(console.error);



