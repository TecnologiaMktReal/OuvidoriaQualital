---
status: unfilled
generated: 2026-01-16
---

# Data Flow & Integrations

Explain how data enters, moves through, and exits the system, including interactions with external services.

## Module Dependencies
- **update_csat_msgs.ts/** → `server\db.ts`
- **list_csat_msgs.ts/** → `server\db.ts`
- **shared\bancos.ts/** → `shared\bancosBrasil.json`
- **scripts\verify_rules.ts/** → `drizzle\schema.ts`, `server\db.ts`
- **scripts\test_phone_linking.ts/** → `drizzle\schema.ts`, `server\db.ts`
- **scripts\test_linking.ts/** → `drizzle\schema.ts`, `server\db.ts`
- **scripts\seed-attendance-reasons.ts/** → `server\db.ts`
- **scripts\list_statuses.ts/** → `drizzle\schema.ts`
- **scripts\list_first_tickets.ts/** → `drizzle\schema.ts`
- **scripts\list_contracts.ts/** → `server\db.ts`
- **scripts\list_all_tickets.ts/** → `drizzle\schema.ts`
- **scripts\import_contracts.ts/** → `server\db.ts`, `shared\ufCodes.ts`
- **scripts\fix_csat_timeout.ts/** → `server\db.ts`
- **scripts\count_by_status.ts/** → `drizzle\schema.ts`
- **scripts\cleanup_test_data.ts/** → `drizzle\schema.ts`, `server\db.ts`
- **scripts\check_ticket_statuses.ts/** → `drizzle\schema.ts`
- **scripts\check_ticket_10.ts/** → `drizzle\schema.ts`
- **scripts\check_orphans.ts/** → `drizzle\schema.ts`, `server\db.ts`
- **server\storage.ts/** → `server\_core\env.ts`
- **server\routers.ts/** → `server\_core\cookies.ts`, `server\_core\systemRouter.ts`, `server\_core\trpc.ts`, `server\db.ts`, `server\routers\contracts.ts`, `server\routers\ClienteS.ts`, `server\routers\cooperativa.ts`, `server\routers\dashboard.ts`, `server\routers\departments.ts`, `server\routers\email.ts`, `server\routers\emailSetup.ts`, `server\routers\fix-admin.ts`, `server\routers\import.ts`, `server\routers\internalChat.ts`, `server\routers\quickMessages.ts`, `server\routers\reports.ts`, `server\routers\stickers.ts`, `server\routers\ticketSetup.ts`, `server\routers\tickets.ts`, `server\routers\users.ts`, `server\routers\whatsapp.ts`
- **server\normalization.test.ts/** → `shared\textUtils.ts`
- **server\auth.logout.test.ts/** → `server\_core\context.ts`, `server\routers.ts`, `shared\const.ts`
- **drizzle\relations.ts/** → `drizzle\schema.ts`
- **server\_core\voiceTranscription.ts/** → `server\_core\env.ts`
- **server\_core\vite.ts/** → `vite.config.ts`
- **server\_core\trpc.ts/** → `server\_core\audit.ts`, `server\_core\context.ts`
- **server\_core\systemRouter.ts/** → `server\_core\notification.ts`, `server\_core\trpc.ts`
- **server\_core\supabaseStorage.ts/** → `server\_core\env.ts`
- **server\_core\supabaseAdmin.ts/** → `server\_core\env.ts`
- **server\_core\notification.ts/** → `server\_core\env.ts`
- **server\_core\map.ts/** → `server\_core\env.ts`
- **server\_core\llm.ts/** → `server\_core\env.ts`
- **server\_core\index.ts/** → `server\_core\context.ts`, `server\_core\vite.ts`, `server\email\receiver.ts`, `server\routers.ts`, `server\whatsapp\config.ts`, `server\whatsapp\service.ts`, `server\whatsapp\serviceQr.ts`
- **server\_core\imageGeneration.ts/** → `server\_core\env.ts`
- **server\_core\dataApi.ts/** → `server\_core\env.ts`
- **server\_core\context.ts/** → `drizzle\schema.ts`, `server\_core\supabaseAdmin.ts`, `server\db.ts`
- **server\_core\audit.ts/** → `server\_core\context.ts`
- **server\whatsapp\service.ts/** → `server\_core\logger.ts`, `server\db.ts`, `server\storage.ts`, `server\whatsapp\placeholders.ts`
- **server\whatsapp\config.ts/** → `server\db.ts`
- **server\whatsapp\bridge.ts/** → `server\_core\logger.ts`, `server\whatsapp\config.ts`, `server\whatsapp\service.ts`, `server\whatsapp\serviceQr.ts`
- **server\routers\whatsapp.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `server\whatsapp\config.ts`, `server\whatsapp\service.ts`, `server\whatsapp\serviceQr.ts`
- **server\routers\users.ts/** → `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\ticketSetup.ts/** → `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\stickers.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `server\storage.ts`
- **server\routers\reports.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `server\reports\dailyReport.ts`, `server\reports\periodicReport.ts`, `server\services\aiAnalysis.ts`
- **server\routers\quickMessages.ts/** → `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\internalChat.ts/** → `drizzle\schema.ts`, `server\_core\supabaseStorage.ts`, `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\import.ts/** → `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\fix-admin.ts/** → `drizzle\schema.ts`, `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\emailSetup.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `server\email\crypto.ts`, `server\email\service.ts`
- **server\routers\email.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `server\email\sender.ts`
- **server\routers\departments.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `shared\textUtils.ts`
- **server\routers\dashboard.ts/** → `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\cooperativa.ts/** → `server\_core\env.ts`, `server\_core\supabaseStorage.ts`, `server\_core\trpc.ts`, `server\db.ts`
- **server\routers\ClienteS.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `shared\textUtils.ts`
- **server\routers\contracts.ts/** → `server\_core\trpc.ts`, `server\db.ts`, `shared\textUtils.ts`
- **server\reports\periodicReport.ts/** → `server\services\aiAnalysis.ts`
- **server\email\service.ts/** → `server\_core\env.ts`, `server\_core\logger.ts`, `server\db.ts`, `server\email\crypto.ts`, `server\email\pop3.ts`
- **server\email\sender.ts/** → `server\_core\logger.ts`, `server\db.ts`, `server\email\crypto.ts`
- **server\email\receiver.ts/** → `server\_core\logger.ts`, `server\db.ts`, `server\email\crypto.ts`, `server\storage.ts`
- **server\services\aiAnalysis.ts/** → `server\_core\llm.ts`, `server\_core\logger.ts`
- **server\automation\botScheduler.ts/** → `server\_core\logger.ts`, `server\db.ts`, `server\whatsapp\bridge.ts`, `server\whatsapp\placeholders.ts`
- **client\src\lib\trpc.ts/** → `server\routers.ts`
- **client\src\hooks\useComposition.ts/** → `client\src\hooks\usePersistFn.ts`
- **client\src\_core\hooks\useAuth.ts/** → `client\src\_core\hooks\useSupabaseAuth.ts`
- **client\src\main.tsx/** → `client\src\App.tsx`, `client\src\const.ts`, `client\src\index.css`
- **client\src\pages\WhatsApp.tsx/** → `client\src\pages\InternalChat.tsx`
- **client\src\pages\FixAdmin.tsx/** → `client\src\components\ui\alert.tsx`, `client\src\components\ui\button.tsx`, `client\src\components\ui\card.tsx`, `client\src\components\ui\input.tsx`, `client\src\lib\trpc.ts`
- **client\src\components\WhatsAppPanel.tsx/** → `client\src\components\ClienteInfoSection.tsx`, `client\src\components\HistoricoSection.tsx`, `client\src\components\WhatsAppChatSection.tsx`
- **client\src\components\TicketReportModal.tsx/** → `client\src\components\TicketCriticitySelector.tsx`, `client\src\components\TicketReasonSelector.tsx`, `client\src\components\TicketTypeSelector.tsx`, `client\src\lib\trpc.ts`
- **client\src\components\Sidebar.tsx/** → `client\src\components\mode-toggle.tsx`
- **client\src\components\Layout.tsx/** → `client\src\components\Sidebar.tsx`
- **client\src\components\DeclarationPreviewModal.tsx/** → `client\src\lib\trpc.ts`
- **client\src\components\DashboardLayoutSkeleton.tsx/** → `client\src\components\ui\skeleton.tsx`
- **client\src\components\DashboardLayout.tsx/** → `client\src\components\DashboardLayoutSkeleton.tsx`, `client\src\components\ui\button.tsx`

## Service Layer
- *No service classes detected.*

## High-level Flow

Summarize the primary pipeline from input to output. Reference diagrams or embed Mermaid definitions when available.

## Internal Movement

Describe how modules within `AI_RULES.md`, `aplicar-schema-producao.md`, `AssPC.png`, `Atue como Engenheiro Sênior conform.txt`, `Backup`, `backup_estrutura.sql`, `check_ffmpeg.js`, `check_ffmpeg.ts`, `check-db.cjs`, `check-db.js`, `clean_logo.txt`, `client`, `close_ticket.ts`, `components.json`, `CONTRATOS_IMP.csv`, `Coult.md`, `criar-tabelas-zeabur.sql`, `csat_dump.txt`, `DECLARAÇÃO DESLIGADO.docx`, `DECLARAÇÃO.docx`, `DEPLOY_SCHEMA.md`, `docker-compose.yml`, `Dockerfile`, `DOCS`, `drizzle`, `drizzle.config.ts`, `executar-local.bat`, `extract_text.js`, `full_logo_base64.txt`, `get-my-uuid.md`, `git_full_log.txt`, `git_log.txt`, `GoodPratice.md`, `HPC_Local.bat`, `IMG_Cabecalho_timbrado.png`, `IMG_Rodape_timbrado.png`, `INICIAR_LOCAL.bat`, `INICIAR.bat`, `iniciar.sh`, `install.bat`, `install.sh`, `INSTALL2.BAT`, `list_csat_msgs.ts`, `logo_base64.txt`, `logo_white_base64.txt`, `logo_white.png`, `migrate-v2.ts`, `modelcontextprotocol-server-filesystem-2025.11.25.tgz`, `Motivo de Atendimento.csv`, `new_logo_base64.txt`, `old`, `package.json`, `papel-timbrado-Qualital.docx`, `patches`, `pnpm-lock.yaml`, `README_INSTALACAO_LOCAL.md`, `README_INSTALACAO.md`, `README.md`, `Relatorio_Diario_Qualital.pdf`, `scripts`, `server`, `setup-database.sql`, `shared`, `SpecUI.MD`, `start-email-server.bat`, `start.bat`, `start.sh`, `SYNC_SCHEMA.md`, `sync-to-zeabur.bat`, `tailwind.config.ts`, `temp_docx`, `tmp_report_template_pages`, `todo.md`, `tsconfig.json`, `update_csat_msgs.ts`, `update-csv-export.ps1`, `update-exports.ps1`, `uploads`, `VARIAVEIS_AMBIENTE.md`, `vite.config.ts`, `vitest.config.ts`, `word` collaborate (queues, events, RPC calls, shared databases).

## External Integrations

Document each integration with purpose, authentication, payload shapes, and retry strategy.

## Observability & Failure Modes

Describe metrics, traces, or logs that monitor the flow. Note backoff, dead-letter, or compensating actions when downstream systems fail.


