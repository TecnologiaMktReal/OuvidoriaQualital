---
status: unfilled
generated: 2026-01-16
---

# Architecture Notes

Describe how the system is assembled and why the current design exists.

## System Architecture Overview

Summarize the top-level topology (monolith, modular service, microservices) and deployment model. Highlight how requests traverse the system and where control pivots between layers.

## Architectural Layers
### Config
Configuration and constants
- **Directories**: `.`, `client`, `server\whatsapp`
- **Symbols**: 5 total, 3 exported → depends on: Controllers
- **Key exports**:
  - [`IntegrationType`](server\whatsapp\config.ts#L6) (type)
  - [`getActiveType`](server\whatsapp\config.ts#L24) (function)
  - [`setActiveType`](server\whatsapp\config.ts#L30) (function)

### Utils
Shared utilities and helpers
- **Directories**: `shared`, `shared\_core`, `client\src\lib`
- **Symbols**: 13 total, 13 exported → depends on: Controllers
- **Key exports**:
  - [`generateContractId`](shared\ufCodes.ts#L40) (function)
  - [`extractUfCodeFromContractId`](shared\ufCodes.ts#L56) (function)
  - [`extractSequentialFromContractId`](shared\ufCodes.ts#L75) (function)
  - [`normalizeText`](shared\textUtils.ts#L10) (function)
  - [`normalizeObjectFields`](shared\textUtils.ts#L35) (function)
  - [`EstadoBrasil`](shared\brasil.ts#L36) (type)
  - [`SiglaUF`](shared\brasil.ts#L37) (type)
  - [`Banco`](shared\bancos.ts#L9) (interface)
  - [`getBancoPorCodigo`](shared\bancos.ts#L24) (function)
  - [`buscarBancosPorNome`](shared\bancos.ts#L29) (function)
  - [`HttpError`](shared\_core\errors.ts#L5) (class)
  - [`cn`](client\src\lib\utils.ts#L4) (function)
  - [`RouterOutputs`](client\src\lib\trpc.ts#L6) (type)

### Repositories
Data access and persistence
- **Directories**: `scripts`
- **Symbols**: 1 total, 0 exported → depends on: Controllers, Models

### Controllers
Request handling and routing
- **Directories**: `server`, `server\_core`, `server\routers`, `client\src\pages\settings`
- **Symbols**: 5 total, 4 exported
- **Key exports**:
  - [`AppRouter`](server\routers.ts#L69) (type)
  - [`DataApiCallOptions`](server\_core\dataApi.ts#L9) (type)
  - [`callDataApi`](server\_core\dataApi.ts#L16) (function)
  - [`APIs`](client\src\pages\settings\APIs.tsx#L5) (function)

### Models
Data structures and domain objects
- **Directories**: `drizzle`, `scripts`
- **Symbols**: 72 total, 62 exported
- **Key exports**:
  - [`User`](drizzle\schema.ts#L549) (type)
  - [`InsertUser`](drizzle\schema.ts#L550) (type)
  - [`Profile`](drizzle\schema.ts#L552) (type)
  - [`InsertProfile`](drizzle\schema.ts#L553) (type)
  - [`UserProfileType`](drizzle\schema.ts#L555) (type)
  - [`InsertUserProfileType`](drizzle\schema.ts#L556) (type)
  - [`Department`](drizzle\schema.ts#L558) (type)
  - [`InsertDepartment`](drizzle\schema.ts#L559) (type)
  - [`Cooperativa`](drizzle\schema.ts#L561) (type)
  - [`InsertCooperativa`](drizzle\schema.ts#L562) (type)
  - [`TicketStatus`](drizzle\schema.ts#L564) (type)
  - [`InsertTicketStatus`](drizzle\schema.ts#L565) (type)
  - [`TicketServiceType`](drizzle\schema.ts#L567) (type)
  - [`InsertTicketServiceType`](drizzle\schema.ts#L568) (type)
  - [`TicketType`](drizzle\schema.ts#L570) (type)
  - [`InsertTicketType`](drizzle\schema.ts#L571) (type)
  - [`TicketCriticity`](drizzle\schema.ts#L573) (type)
  - [`InsertTicketCriticity`](drizzle\schema.ts#L574) (type)
  - [`Cliente`](drizzle\schema.ts#L576) (type)
  - [`InsertCliente`](drizzle\schema.ts#L577) (type)
  - [`ClientePhone`](drizzle\schema.ts#L579) (type)
  - [`InsertClientePhone`](drizzle\schema.ts#L580) (type)
  - [`ClienteEmail`](drizzle\schema.ts#L582) (type)
  - [`InsertClienteEmail`](drizzle\schema.ts#L583) (type)
  - [`ClienteBankData`](drizzle\schema.ts#L585) (type)
  - [`InsertClienteBankData`](drizzle\schema.ts#L586) (type)
  - [`Contract`](drizzle\schema.ts#L588) (type)
  - [`InsertContract`](drizzle\schema.ts#L589) (type)
  - [`AttendanceReason`](drizzle\schema.ts#L591) (type)
  - [`InsertAttendanceReason`](drizzle\schema.ts#L592) (type)
  - [`Ticket`](drizzle\schema.ts#L594) (type)
  - [`InsertTicket`](drizzle\schema.ts#L595) (type)
  - [`TicketMessage`](drizzle\schema.ts#L597) (type)
  - [`InsertTicketMessage`](drizzle\schema.ts#L598) (type)
  - [`TicketHistory`](drizzle\schema.ts#L600) (type)
  - [`InsertTicketHistory`](drizzle\schema.ts#L601) (type)
  - [`TicketTimeTracking`](drizzle\schema.ts#L603) (type)
  - [`InsertTicketTimeTracking`](drizzle\schema.ts#L604) (type)
  - [`CsatSurvey`](drizzle\schema.ts#L606) (type)
  - [`InsertCsatSurvey`](drizzle\schema.ts#L607) (type)
  - [`WhatsappSession`](drizzle\schema.ts#L609) (type)
  - [`InsertWhatsappSession`](drizzle\schema.ts#L610) (type)
  - [`QuickMessage`](drizzle\schema.ts#L612) (type)
  - [`InsertQuickMessage`](drizzle\schema.ts#L613) (type)
  - [`EmailAccount`](drizzle\schema.ts#L615) (type)
  - [`InsertEmailAccount`](drizzle\schema.ts#L616) (type)
  - [`EmailCredential`](drizzle\schema.ts#L618) (type)
  - [`InsertEmailCredential`](drizzle\schema.ts#L619) (type)
  - [`EmailTestLog`](drizzle\schema.ts#L621) (type)
  - [`InsertEmailTestLog`](drizzle\schema.ts#L622) (type)
  - [`EmailEvent`](drizzle\schema.ts#L624) (type)
  - [`InsertEmailEvent`](drizzle\schema.ts#L625) (type)
  - [`EmailAttachment`](drizzle\schema.ts#L627) (type)
  - [`InsertEmailAttachment`](drizzle\schema.ts#L628) (type)
  - [`InternalConversation`](drizzle\schema.ts#L630) (type)
  - [`InsertInternalConversation`](drizzle\schema.ts#L631) (type)
  - [`ConversationParticipant`](drizzle\schema.ts#L633) (type)
  - [`InsertConversationParticipant`](drizzle\schema.ts#L634) (type)
  - [`InternalMessage`](drizzle\schema.ts#L636) (type)
  - [`InsertInternalMessage`](drizzle\schema.ts#L637) (type)
  - [`Sticker`](drizzle\schema.ts#L639) (type)
  - [`InsertSticker`](drizzle\schema.ts#L640) (type)

### Services
Business logic and orchestration
- **Directories**: `server\whatsapp`, `server\email`, `server\services`
- **Symbols**: 48 total, 19 exported → depends on: Controllers
- **Key exports**:
  - [`saveConfig`](server\whatsapp\service.ts#L293) (function)
  - [`getConfigSummary`](server\whatsapp\service.ts#L334) (function)
  - [`getCurrentQRCode`](server\whatsapp\service.ts#L372) (function)
  - [`getConnectionStatus`](server\whatsapp\service.ts#L377) (function)
  - [`getWhatsappHealth`](server\whatsapp\service.ts#L382) (function)
  - [`testConnection`](server\whatsapp\service.ts#L394) (function)
  - [`sendWhatsAppMessage`](server\whatsapp\service.ts#L433) (function)
  - [`sendWhatsAppMediaBase64`](server\whatsapp\service.ts#L471) (function)
  - [`handleWebhookVerification`](server\whatsapp\service.ts#L755) (function)
  - [`handleWebhookEvent`](server\whatsapp\service.ts#L775) (function)
  - [`initializeWhatsApp`](server\whatsapp\service.ts#L902) (function)
  - [`disconnectWhatsApp`](server\whatsapp\service.ts#L907) (function)
  - [`renderEmailTemplate`](server\email\service.ts#L151) (function)
  - [`renderCsatEmailTemplate`](server\email\service.ts#L214) (function)
  - [`testEmailConnection`](server\email\service.ts#L296) (function)
  - [`sendOutboundEmail`](server\email\service.ts#L309) (function)
  - [`sendEmail`](server\email\service.ts#L371) (function)
  - [`PeriodicReportData`](server\services\aiAnalysis.ts#L4) (interface)
  - [`generatePeriodicReportAnalysis`](server\services\aiAnalysis.ts#L19) (function)

### Components
UI components and views
- **Directories**: `client\src\pages`, `client\src\components`, `client\src\pages\settings`, `client\src\pages\relatorios`, `client\src\components\ui`
- **Symbols**: 154 total, 30 exported → depends on: Utils
- **Key exports**:
  - [`ValidarAcesso`](client\src\pages\ValidarAcesso.tsx#L11) (function)
  - [`TicketsPlaceholder`](client\src\pages\TicketsPlaceholder.tsx#L5) (function)
  - [`RelatoriosPlaceholder`](client\src\pages\RelatoriosPlaceholder.tsx#L5) (function)
  - [`NotFound`](client\src\pages\NotFound.tsx#L6) (function)
  - [`FixAdmin`](client\src\pages\FixAdmin.tsx#L15) (function)
  - [`TicketListView`](client\src\components\TicketListView.tsx#L53) (function)
  - [`DateRangeType`](client\src\components\TicketFilter.tsx#L35) (type)
  - [`TicketFilters`](client\src\components\TicketFilter.tsx#L37) (interface)
  - [`ThemeProvider`](client\src\components\theme-provider.tsx#L23) (function)
  - [`ModeToggle`](client\src\components\mode-toggle.tsx#L5) (function)
  - [`MapView`](client\src\components\Map.tsx#L119) (function)
  - [`Layout`](client\src\components\Layout.tsx#L12) (function)
  - [`DashboardLayoutSkeleton`](client\src\components\DashboardLayoutSkeleton.tsx#L3) (function)
  - [`DashboardLayout`](client\src\components\DashboardLayout.tsx#L40) (function)
  - [`Message`](client\src\components\AIChatBox.tsx#L12) (type)
  - [`AIChatBoxProps`](client\src\components\AIChatBox.tsx#L17) (type)
  - [`TiposAtendimentos`](client\src\pages\settings\TiposAtendimentos.tsx#L5) (function)
  - [`ResumoSemanal`](client\src\pages\relatorios\ResumoSemanal.tsx#L4) (function)
  - [`ResumoMensal`](client\src\pages\relatorios\ResumoMensal.tsx#L4) (function)
  - [`ResumoDiario`](client\src\pages\relatorios\ResumoDiario.tsx#L4) (function)
  - [`ResumoAnual`](client\src\pages\relatorios\ResumoAnual.tsx#L4) (function)
  - [`RankingTipos`](client\src\pages\relatorios\RankingTipos.tsx#L6) (function)
  - [`RankingCoordenadores`](client\src\pages\relatorios\RankingCoordenadores.tsx#L6) (function)
  - [`RankingClienteS`](client\src\pages\relatorios\RankingClienteS.tsx#L6) (function)
  - [`RankingContratos`](client\src\pages\relatorios\RankingContratos.tsx#L6) (function)
  - [`RankingAtendimento`](client\src\pages\relatorios\RankingAtendimento.tsx#L5) (function)
  - [`AgendamentoEnvio`](client\src\pages\relatorios\AgendamentoEnvio.tsx#L5) (function)
  - [`ToastActionElement`](client\src\components\ui\toast.tsx#L3) (type)
  - [`ToastProps`](client\src\components\ui\toast.tsx#L5) (interface)
  - [`ChartConfig`](client\src\components\ui\chart.tsx#L9) (type)


## Detected Design Patterns
- *No design patterns detected yet.*

## Entry Points
- [`server\_core\index.ts`](server\_core\index.ts)
- [`client\src\main.tsx`](client\src\main.tsx)

## Public API
| Symbol | Type | Location |
| --- | --- | --- |
| [`AgendamentoEnvio`](client\src\pages\relatorios\AgendamentoEnvio.tsx#L5) | function | client\src\pages\relatorios\AgendamentoEnvio.tsx:5 |
| [`AIChatBoxProps`](client\src\components\AIChatBox.tsx#L17) | type | client\src\components\AIChatBox.tsx:17 |
| [`APIs`](client\src\pages\settings\APIs.tsx#L5) | function | client\src\pages\settings\APIs.tsx:5 |
| [`AppRouter`](server\routers.ts#L69) | type | server\routers.ts:69 |
| [`AttendanceReason`](drizzle\schema.ts#L591) | type | drizzle\schema.ts:591 |
| [`Banco`](shared\bancos.ts#L9) | interface | shared\bancos.ts:9 |
| [`buscarBancosPorNome`](shared\bancos.ts#L29) | function | shared\bancos.ts:29 |
| [`callDataApi`](server\_core\dataApi.ts#L16) | function | server\_core\dataApi.ts:16 |
| [`ChartConfig`](client\src\components\ui\chart.tsx#L9) | type | client\src\components\ui\chart.tsx:9 |
| [`cn`](client\src\lib\utils.ts#L4) | function | client\src\lib\utils.ts:4 |
| [`connect`](scripts\test_db_connection.py#L9) | function | scripts\test_db_connection.py:9 |
| [`Contract`](drizzle\schema.ts#L588) | type | drizzle\schema.ts:588 |
| [`ConversationParticipant`](drizzle\schema.ts#L633) | type | drizzle\schema.ts:633 |
| [`Cliente`](drizzle\schema.ts#L576) | type | drizzle\schema.ts:576 |
| [`ClienteBankData`](drizzle\schema.ts#L585) | type | drizzle\schema.ts:585 |
| [`ClienteEmail`](drizzle\schema.ts#L582) | type | drizzle\schema.ts:582 |
| [`ClientePhone`](drizzle\schema.ts#L579) | type | drizzle\schema.ts:579 |
| [`Cooperativa`](drizzle\schema.ts#L561) | type | drizzle\schema.ts:561 |
| [`createContext`](server\_core\context.ts#L49) | function | server\_core\context.ts:49 |
| [`CsatSurvey`](drizzle\schema.ts#L606) | type | drizzle\schema.ts:606 |
| [`DailyReportData`](server\reports\dailyReport.ts#L1) | interface | server\reports\dailyReport.ts:1 |
| [`DashboardLayout`](client\src\components\DashboardLayout.tsx#L40) | function | client\src\components\DashboardLayout.tsx:40 |
| [`DashboardLayoutSkeleton`](client\src\components\DashboardLayoutSkeleton.tsx#L3) | function | client\src\components\DashboardLayoutSkeleton.tsx:3 |
| [`DataApiCallOptions`](server\_core\dataApi.ts#L9) | type | server\_core\dataApi.ts:9 |
| [`Database`](client\src\integrations\supabase\types.ts#L1) | type | client\src\integrations\supabase\types.ts:1 |
| [`DateRangeType`](client\src\components\TicketFilter.tsx#L35) | type | client\src\components\TicketFilter.tsx:35 |
| [`DeclarationData`](server\reports\declarationReport.ts#L6) | interface | server\reports\declarationReport.ts:6 |
| [`decryptSecret`](server\email\crypto.ts#L20) | function | server\email\crypto.ts:20 |
| [`Department`](drizzle\schema.ts#L558) | type | drizzle\schema.ts:558 |
| [`DirectionsResult`](server\_core\map.ts#L105) | type | server\_core\map.ts:105 |
| [`disableSupabaseAdmin`](server\_core\supabaseAdmin.ts#L11) | function | server\_core\supabaseAdmin.ts:11 |
| [`disconnectWhatsApp`](server\whatsapp\service.ts#L907) | function | server\whatsapp\service.ts:907 |
| [`DistanceMatrixResult`](server\_core\map.ts#L131) | type | server\_core\map.ts:131 |
| [`ElevationResult`](server\_core\map.ts#L209) | type | server\_core\map.ts:209 |
| [`EmailAccount`](drizzle\schema.ts#L615) | type | drizzle\schema.ts:615 |
| [`EmailAttachment`](drizzle\schema.ts#L627) | type | drizzle\schema.ts:627 |
| [`EmailCredential`](drizzle\schema.ts#L618) | type | drizzle\schema.ts:618 |
| [`EmailEvent`](drizzle\schema.ts#L624) | type | drizzle\schema.ts:624 |
| [`EmailTestLog`](drizzle\schema.ts#L621) | type | drizzle\schema.ts:621 |
| [`encryptSecret`](server\email\crypto.ts#L11) | function | server\email\crypto.ts:11 |
| [`EstadoBrasil`](shared\brasil.ts#L36) | type | shared\brasil.ts:36 |
| [`extractSequentialFromContractId`](shared\ufCodes.ts#L75) | function | shared\ufCodes.ts:75 |
| [`extractUfCodeFromContractId`](shared\ufCodes.ts#L56) | function | shared\ufCodes.ts:56 |
| [`FileContent`](server\_core\llm.ts#L18) | type | server\_core\llm.ts:18 |
| [`FixAdmin`](client\src\pages\FixAdmin.tsx#L15) | function | client\src\pages\FixAdmin.tsx:15 |
| [`generateContractId`](shared\ufCodes.ts#L40) | function | shared\ufCodes.ts:40 |
| [`generateDailyReportHtml`](server\reports\dailyReport.ts#L140) | function | server\reports\dailyReport.ts:140 |
| [`generateDeclarationHtml`](server\reports\declarationReport.ts#L54) | function | server\reports\declarationReport.ts:54 |
| [`generateImage`](server\_core\imageGeneration.ts#L34) | function | server\_core\imageGeneration.ts:34 |
| [`GenerateImageOptions`](server\_core\imageGeneration.ts#L21) | type | server\_core\imageGeneration.ts:21 |
| [`GenerateImageResponse`](server\_core\imageGeneration.ts#L30) | type | server\_core\imageGeneration.ts:30 |
| [`generatePeriodicReportAnalysis`](server\services\aiAnalysis.ts#L19) | function | server\services\aiAnalysis.ts:19 |
| [`generatePeriodicReportHtml`](server\reports\periodicReport.ts#L62) | function | server\reports\periodicReport.ts:62 |
| [`GeocodingResult`](server\_core\map.ts#L144) | type | server\_core\map.ts:144 |
| [`getActiveType`](server\whatsapp\config.ts#L24) | function | server\whatsapp\config.ts:24 |
| [`getBancoPorCodigo`](shared\bancos.ts#L24) | function | shared\bancos.ts:24 |
| [`getConfigSummary`](server\whatsapp\service.ts#L334) | function | server\whatsapp\service.ts:334 |
| [`getConnectionStatus`](server\whatsapp\service.ts#L377) | function | server\whatsapp\service.ts:377 |
| [`getCurrentQRCode`](server\whatsapp\service.ts#L372) | function | server\whatsapp\service.ts:372 |
| [`getSessionCookieOptions`](server\_core\cookies.ts#L24) | function | server\_core\cookies.ts:24 |
| [`getSupabaseAdminClient`](server\_core\supabaseAdmin.ts#L19) | function | server\_core\supabaseAdmin.ts:19 |
| [`getWhatsappHealth`](server\whatsapp\service.ts#L382) | function | server\whatsapp\service.ts:382 |
| [`handleWebhookEvent`](server\whatsapp\service.ts#L775) | function | server\whatsapp\service.ts:775 |
| [`handleWebhookVerification`](server\whatsapp\service.ts#L755) | function | server\whatsapp\service.ts:755 |
| [`hasRole`](server\_core\trpc.ts#L31) | function | server\_core\trpc.ts:31 |
| [`HttpError`](shared\_core\errors.ts#L5) | class | shared\_core\errors.ts:5 |
| [`ImageContent`](server\_core\llm.ts#L10) | type | server\_core\llm.ts:10 |
| [`import_sql_file`](scripts\import_db.py#L9) | function | scripts\import_db.py:9 |
| [`initializeWhatsApp`](server\whatsapp\service.ts#L902) | function | server\whatsapp\service.ts:902 |
| [`InsertAttendanceReason`](drizzle\schema.ts#L592) | type | drizzle\schema.ts:592 |
| [`InsertContract`](drizzle\schema.ts#L589) | type | drizzle\schema.ts:589 |
| [`InsertConversationParticipant`](drizzle\schema.ts#L634) | type | drizzle\schema.ts:634 |
| [`InsertCliente`](drizzle\schema.ts#L577) | type | drizzle\schema.ts:577 |
| [`InsertClienteBankData`](drizzle\schema.ts#L586) | type | drizzle\schema.ts:586 |
| [`InsertClienteEmail`](drizzle\schema.ts#L583) | type | drizzle\schema.ts:583 |
| [`InsertClientePhone`](drizzle\schema.ts#L580) | type | drizzle\schema.ts:580 |
| [`InsertCooperativa`](drizzle\schema.ts#L562) | type | drizzle\schema.ts:562 |
| [`InsertCsatSurvey`](drizzle\schema.ts#L607) | type | drizzle\schema.ts:607 |
| [`InsertDepartment`](drizzle\schema.ts#L559) | type | drizzle\schema.ts:559 |
| [`InsertEmailAccount`](drizzle\schema.ts#L616) | type | drizzle\schema.ts:616 |
| [`InsertEmailAttachment`](drizzle\schema.ts#L628) | type | drizzle\schema.ts:628 |
| [`InsertEmailCredential`](drizzle\schema.ts#L619) | type | drizzle\schema.ts:619 |
| [`InsertEmailEvent`](drizzle\schema.ts#L625) | type | drizzle\schema.ts:625 |
| [`InsertEmailTestLog`](drizzle\schema.ts#L622) | type | drizzle\schema.ts:622 |
| [`InsertInternalConversation`](drizzle\schema.ts#L631) | type | drizzle\schema.ts:631 |
| [`InsertInternalMessage`](drizzle\schema.ts#L637) | type | drizzle\schema.ts:637 |
| [`InsertProfile`](drizzle\schema.ts#L553) | type | drizzle\schema.ts:553 |
| [`InsertQuickMessage`](drizzle\schema.ts#L613) | type | drizzle\schema.ts:613 |
| [`InsertSticker`](drizzle\schema.ts#L640) | type | drizzle\schema.ts:640 |
| [`InsertTicket`](drizzle\schema.ts#L595) | type | drizzle\schema.ts:595 |
| [`InsertTicketCriticity`](drizzle\schema.ts#L574) | type | drizzle\schema.ts:574 |
| [`InsertTicketHistory`](drizzle\schema.ts#L601) | type | drizzle\schema.ts:601 |
| [`InsertTicketMessage`](drizzle\schema.ts#L598) | type | drizzle\schema.ts:598 |
| [`InsertTicketServiceType`](drizzle\schema.ts#L568) | type | drizzle\schema.ts:568 |
| [`InsertTicketStatus`](drizzle\schema.ts#L565) | type | drizzle\schema.ts:565 |
| [`InsertTicketTimeTracking`](drizzle\schema.ts#L604) | type | drizzle\schema.ts:604 |
| [`InsertTicketType`](drizzle\schema.ts#L571) | type | drizzle\schema.ts:571 |
| [`InsertUser`](drizzle\schema.ts#L550) | type | drizzle\schema.ts:550 |
| [`InsertUserProfileType`](drizzle\schema.ts#L556) | type | drizzle\schema.ts:556 |
| [`InsertWhatsappSession`](drizzle\schema.ts#L610) | type | drizzle\schema.ts:610 |
| [`IntegrationType`](server\whatsapp\config.ts#L6) | type | server\whatsapp\config.ts:6 |
| [`InternalConversation`](drizzle\schema.ts#L630) | type | drizzle\schema.ts:630 |
| [`InternalMessage`](drizzle\schema.ts#L636) | type | drizzle\schema.ts:636 |
| [`invokeLLM`](server\_core\llm.ts#L268) | function | server\_core\llm.ts:268 |
| [`InvokeParams`](server\_core\llm.ts#L58) | type | server\_core\llm.ts:58 |
| [`InvokeResult`](server\_core\llm.ts#L80) | type | server\_core\llm.ts:80 |
| [`isAdmin`](server\_core\trpc.ts#L37) | function | server\_core\trpc.ts:37 |
| [`isAdminOrManager`](server\_core\trpc.ts#L42) | function | server\_core\trpc.ts:42 |
| [`JsonSchema`](server\_core\llm.ts#L100) | type | server\_core\llm.ts:100 |
| [`LatLng`](server\_core\map.ts#L100) | type | server\_core\map.ts:100 |
| [`Layout`](client\src\components\Layout.tsx#L12) | function | client\src\components\Layout.tsx:12 |
| [`logUserAction`](server\_core\audit.ts#L22) | function | server\_core\audit.ts:22 |
| [`makeRequest`](server\_core\map.ts#L54) | function | server\_core\map.ts:54 |
| [`MapType`](server\_core\map.ts#L97) | type | server\_core\map.ts:97 |
| [`MapView`](client\src\components\Map.tsx#L119) | function | client\src\components\Map.tsx:119 |
| [`Message`](server\_core\llm.ts#L28) | type | server\_core\llm.ts:28 |
| [`Message`](client\src\components\AIChatBox.tsx#L12) | type | client\src\components\AIChatBox.tsx:12 |
| [`MessageContent`](server\_core\llm.ts#L26) | type | server\_core\llm.ts:26 |
| [`ModeToggle`](client\src\components\mode-toggle.tsx#L5) | function | client\src\components\mode-toggle.tsx:5 |
| [`normalizeObjectFields`](shared\textUtils.ts#L35) | function | shared\textUtils.ts:35 |
| [`normalizeText`](shared\textUtils.ts#L10) | function | shared\textUtils.ts:10 |
| [`NotFound`](client\src\pages\NotFound.tsx#L6) | function | client\src\pages\NotFound.tsx:6 |
| [`NotificationPayload`](server\_core\notification.ts#L4) | type | server\_core\notification.ts:4 |
| [`notifyOwner`](server\_core\notification.ts#L66) | function | server\_core\notification.ts:66 |
| [`OutputSchema`](server\_core\llm.ts#L106) | type | server\_core\llm.ts:106 |
| [`PeriodicReportData`](server\services\aiAnalysis.ts#L4) | interface | server\services\aiAnalysis.ts:4 |
| [`PlaceDetailsResult`](server\_core\map.ts#L182) | type | server\_core\map.ts:182 |
| [`PlaceholderContext`](server\whatsapp\placeholders.ts#L1) | interface | server\whatsapp\placeholders.ts:1 |
| [`PlacesSearchResult`](server\_core\map.ts#L166) | type | server\_core\map.ts:166 |
| [`processBotAutomations`](server\automation\botScheduler.ts#L11) | function | server\automation\botScheduler.ts:11 |
| [`Profile`](drizzle\schema.ts#L552) | type | drizzle\schema.ts:552 |
| [`QuickMessage`](drizzle\schema.ts#L612) | type | drizzle\schema.ts:612 |
| [`RankingAtendimento`](client\src\pages\relatorios\RankingAtendimento.tsx#L5) | function | client\src\pages\relatorios\RankingAtendimento.tsx:5 |
| [`RankingContratos`](client\src\pages\relatorios\RankingContratos.tsx#L6) | function | client\src\pages\relatorios\RankingContratos.tsx:6 |
| [`RankingClienteS`](client\src\pages\relatorios\RankingClienteS.tsx#L6) | function | client\src\pages\relatorios\RankingClienteS.tsx:6 |
| [`RankingCoordenadores`](client\src\pages\relatorios\RankingCoordenadores.tsx#L6) | function | client\src\pages\relatorios\RankingCoordenadores.tsx:6 |
| [`RankingTipos`](client\src\pages\relatorios\RankingTipos.tsx#L6) | function | client\src\pages\relatorios\RankingTipos.tsx:6 |
| [`RelatoriosPlaceholder`](client\src\pages\RelatoriosPlaceholder.tsx#L5) | function | client\src\pages\RelatoriosPlaceholder.tsx:5 |
| [`renderCsatEmailTemplate`](server\email\service.ts#L214) | function | server\email\service.ts:214 |
| [`renderEmailTemplate`](server\email\service.ts#L151) | function | server\email\service.ts:151 |
| [`replaceMessagePlaceholders`](server\whatsapp\placeholders.ts#L28) | function | server\whatsapp\placeholders.ts:28 |
| [`requireAdmin`](server\_core\trpc.ts#L47) | function | server\_core\trpc.ts:47 |
| [`requireAdminOrManager`](server\_core\trpc.ts#L54) | function | server\_core\trpc.ts:54 |
| [`ResponseFormat`](server\_core\llm.ts#L108) | type | server\_core\llm.ts:108 |
| [`ResumoAnual`](client\src\pages\relatorios\ResumoAnual.tsx#L4) | function | client\src\pages\relatorios\ResumoAnual.tsx:4 |
| [`ResumoDiario`](client\src\pages\relatorios\ResumoDiario.tsx#L4) | function | client\src\pages\relatorios\ResumoDiario.tsx:4 |
| [`ResumoMensal`](client\src\pages\relatorios\ResumoMensal.tsx#L4) | function | client\src\pages\relatorios\ResumoMensal.tsx:4 |
| [`ResumoSemanal`](client\src\pages\relatorios\ResumoSemanal.tsx#L4) | function | client\src\pages\relatorios\ResumoSemanal.tsx:4 |
| [`RoadsResult`](server\_core\map.ts#L226) | type | server\_core\map.ts:226 |
| [`Role`](server\_core\llm.ts#L3) | type | server\_core\llm.ts:3 |
| [`RouterOutputs`](client\src\lib\trpc.ts#L6) | type | client\src\lib\trpc.ts:6 |
| [`saveConfig`](server\whatsapp\service.ts#L293) | function | server\whatsapp\service.ts:293 |
| [`sendEmail`](server\email\service.ts#L371) | function | server\email\service.ts:371 |
| [`sendOutboundEmail`](server\email\service.ts#L309) | function | server\email\service.ts:309 |
| [`sendTicketEmail`](server\email\sender.ts#L32) | function | server\email\sender.ts:32 |
| [`sendWhatsAppMedia`](server\whatsapp\bridge.ts#L6) | function | server\whatsapp\bridge.ts:6 |
| [`sendWhatsAppMediaBase64`](server\whatsapp\service.ts#L471) | function | server\whatsapp\service.ts:471 |
| [`sendWhatsAppMessage`](server\whatsapp\service.ts#L433) | function | server\whatsapp\service.ts:433 |
| [`sendWhatsAppMessage`](server\whatsapp\bridge.ts#L26) | function | server\whatsapp\bridge.ts:26 |
| [`serveStatic`](server\_core\vite.ts#L50) | function | server\_core\vite.ts:50 |
| [`setActiveType`](server\whatsapp\config.ts#L30) | function | server\whatsapp\config.ts:30 |
| [`setupVite`](server\_core\vite.ts#L9) | function | server\_core\vite.ts:9 |
| [`SiglaUF`](shared\brasil.ts#L37) | type | shared\brasil.ts:37 |
| [`SpeedUnit`](server\_core\map.ts#L98) | type | server\_core\map.ts:98 |
| [`startEmailPolling`](server\email\receiver.ts#L263) | function | server\email\receiver.ts:263 |
| [`Sticker`](drizzle\schema.ts#L639) | type | drizzle\schema.ts:639 |
| [`storageGet`](server\storage.ts#L127) | function | server\storage.ts:127 |
| [`storagePut`](server\storage.ts#L80) | function | server\storage.ts:80 |
| [`testConnection`](server\whatsapp\service.ts#L394) | function | server\whatsapp\service.ts:394 |
| [`testEmailConnection`](server\email\service.ts#L296) | function | server\email\service.ts:296 |
| [`testPop3Connection`](server\email\pop3.ts#L13) | function | server\email\pop3.ts:13 |
| [`TextContent`](server\_core\llm.ts#L5) | type | server\_core\llm.ts:5 |
| [`ThemeProvider`](client\src\contexts\ThemeContext.tsx#L19) | function | client\src\contexts\ThemeContext.tsx:19 |
| [`ThemeProvider`](client\src\components\theme-provider.tsx#L23) | function | client\src\components\theme-provider.tsx:23 |
| [`Ticket`](drizzle\schema.ts#L594) | type | drizzle\schema.ts:594 |
| [`TicketCriticity`](drizzle\schema.ts#L573) | type | drizzle\schema.ts:573 |
| [`TicketFilters`](client\src\components\TicketFilter.tsx#L37) | interface | client\src\components\TicketFilter.tsx:37 |
| [`TicketHistory`](drizzle\schema.ts#L600) | type | drizzle\schema.ts:600 |
| [`TicketListView`](client\src\components\TicketListView.tsx#L53) | function | client\src\components\TicketListView.tsx:53 |
| [`TicketMessage`](drizzle\schema.ts#L597) | type | drizzle\schema.ts:597 |
| [`TicketServiceType`](drizzle\schema.ts#L567) | type | drizzle\schema.ts:567 |
| [`TicketsPlaceholder`](client\src\pages\TicketsPlaceholder.tsx#L5) | function | client\src\pages\TicketsPlaceholder.tsx:5 |
| [`TicketStatus`](drizzle\schema.ts#L564) | type | drizzle\schema.ts:564 |
| [`TicketTimeTracking`](drizzle\schema.ts#L603) | type | drizzle\schema.ts:603 |
| [`TicketType`](drizzle\schema.ts#L570) | type | drizzle\schema.ts:570 |
| [`TimeZoneResult`](server\_core\map.ts#L218) | type | server\_core\map.ts:218 |
| [`TiposAtendimentos`](client\src\pages\settings\TiposAtendimentos.tsx#L5) | function | client\src\pages\settings\TiposAtendimentos.tsx:5 |
| [`ToastActionElement`](client\src\components\ui\toast.tsx#L3) | type | client\src\components\ui\toast.tsx:3 |
| [`ToastProps`](client\src\components\ui\toast.tsx#L5) | interface | client\src\components\ui\toast.tsx:5 |
| [`Tool`](server\_core\llm.ts#L35) | type | server\_core\llm.ts:35 |
| [`ToolCall`](server\_core\llm.ts#L71) | type | server\_core\llm.ts:71 |
| [`ToolChoice`](server\_core\llm.ts#L53) | type | server\_core\llm.ts:53 |
| [`ToolChoiceByName`](server\_core\llm.ts#L45) | type | server\_core\llm.ts:45 |
| [`ToolChoiceExplicit`](server\_core\llm.ts#L46) | type | server\_core\llm.ts:46 |
| [`ToolChoicePrimitive`](server\_core\llm.ts#L44) | type | server\_core\llm.ts:44 |
| [`transcribeAudio`](server\_core\voiceTranscription.ts#L73) | function | server\_core\voiceTranscription.ts:73 |
| [`TranscribeOptions`](server\_core\voiceTranscription.ts#L30) | type | server\_core\voiceTranscription.ts:30 |
| [`TranscriptionError`](server\_core\voiceTranscription.ts#L61) | type | server\_core\voiceTranscription.ts:61 |
| [`TranscriptionResponse`](server\_core\voiceTranscription.ts#L59) | type | server\_core\voiceTranscription.ts:59 |
| [`TravelMode`](server\_core\map.ts#L96) | type | server\_core\map.ts:96 |
| [`TrpcContext`](server\_core\context.ts#L15) | type | server\_core\context.ts:15 |
| [`uploadAvatarToSupabase`](server\_core\supabaseStorage.ts#L77) | function | server\_core\supabaseStorage.ts:77 |
| [`uploadToSupabaseStorage`](server\_core\supabaseStorage.ts#L45) | function | server\_core\supabaseStorage.ts:45 |
| [`useAuth`](client\src\_core\hooks\useAuth.ts#L23) | function | client\src\_core\hooks\useAuth.ts:23 |
| [`useComposition`](client\src\hooks\useComposition.ts#L23) | function | client\src\hooks\useComposition.ts:23 |
| [`UseCompositionOptions`](client\src\hooks\useComposition.ts#L13) | interface | client\src\hooks\useComposition.ts:13 |
| [`UseCompositionReturn`](client\src\hooks\useComposition.ts#L4) | interface | client\src\hooks\useComposition.ts:4 |
| [`useIsMobile`](client\src\hooks\useMobile.tsx#L5) | function | client\src\hooks\useMobile.tsx:5 |
| [`usePersistFn`](client\src\hooks\usePersistFn.ts#L8) | function | client\src\hooks\usePersistFn.ts:8 |
| [`User`](drizzle\schema.ts#L549) | type | drizzle\schema.ts:549 |
| [`UserProfile`](client\src\_core\hooks\useAuth.ts#L5) | interface | client\src\_core\hooks\useAuth.ts:5 |
| [`UserProfileType`](drizzle\schema.ts#L555) | type | drizzle\schema.ts:555 |
| [`useSupabaseAuth`](client\src\_core\hooks\useSupabaseAuth.ts#L10) | function | client\src\_core\hooks\useSupabaseAuth.ts:10 |
| [`useTheme`](client\src\contexts\ThemeContext.tsx#L58) | function | client\src\contexts\ThemeContext.tsx:58 |
| [`ValidarAcesso`](client\src\pages\ValidarAcesso.tsx#L11) | function | client\src\pages\ValidarAcesso.tsx:11 |
| [`WhatsappSession`](drizzle\schema.ts#L609) | type | drizzle\schema.ts:609 |
| [`WhisperResponse`](server\_core\voiceTranscription.ts#L51) | type | server\_core\voiceTranscription.ts:51 |
| [`WhisperSegment`](server\_core\voiceTranscription.ts#L37) | type | server\_core\voiceTranscription.ts:37 |

## Internal System Boundaries

Document seams between domains, bounded contexts, or service ownership. Note data ownership, synchronization strategies, and shared contract enforcement.

## External Service Dependencies

List SaaS platforms, third-party APIs, or infrastructure services the system relies on. Describe authentication methods, rate limits, and failure considerations for each dependency.

## Key Decisions & Trade-offs

Summarize architectural decisions, experiments, or ADR outcomes that shape the current design. Reference supporting documents and explain why selected approaches won over alternatives.

## Diagrams

Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints

Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
- `AI_RULES.md/` — approximately 1 files
- `aplicar-schema-producao.md/` — approximately 1 files
- `AssPC.png/` — approximately 1 files
- `Atue como Engenheiro Sênior conform.txt/` — approximately 1 files
- `Backup/` — approximately 1 files
- `backup_estrutura.sql/` — approximately 1 files
- `check_ffmpeg.js/` — approximately 1 files
- `check_ffmpeg.ts/` — approximately 1 files
- `check-db.cjs/` — approximately 1 files
- `check-db.js/` — approximately 1 files
- `clean_logo.txt/` — approximately 1 files
- `client/` — approximately 152 files
- `close_ticket.ts/` — approximately 1 files
- `components.json/` — approximately 1 files
- `CONTRATOS_IMP.csv/` — approximately 1 files
- `Coult.md/` — approximately 1 files
- `criar-tabelas-zeabur.sql/` — approximately 1 files
- `csat_dump.txt/` — approximately 1 files
- `DECLARAÇÃO DESLIGADO.docx/` — approximately 1 files
- `DECLARAÇÃO.docx/` — approximately 1 files
- `DEPLOY_SCHEMA.md/` — approximately 1 files
- `docker-compose.yml/` — approximately 1 files
- `Dockerfile/` — approximately 1 files
- `DOCS/` — approximately 7 files
- `drizzle/` — approximately 5 files
- `drizzle.config.ts/` — approximately 1 files
- `executar-local.bat/` — approximately 1 files
- `extract_text.js/` — approximately 1 files
- `full_logo_base64.txt/` — approximately 1 files
- `get-my-uuid.md/` — approximately 1 files
- `git_full_log.txt/` — approximately 1 files
- `git_log.txt/` — approximately 1 files
- `GoodPratice.md/` — approximately 1 files
- `HPC_Local.bat/` — approximately 1 files
- `IMG_Cabecalho_timbrado.png/` — approximately 1 files
- `IMG_Rodape_timbrado.png/` — approximately 1 files
- `INICIAR_LOCAL.bat/` — approximately 1 files
- `INICIAR.bat/` — approximately 1 files
- `iniciar.sh/` — approximately 1 files
- `install.bat/` — approximately 1 files
- `install.sh/` — approximately 1 files
- `INSTALL2.BAT/` — approximately 1 files
- `list_csat_msgs.ts/` — approximately 1 files
- `logo_base64.txt/` — approximately 1 files
- `logo_white_base64.txt/` — approximately 1 files
- `logo_white.png/` — approximately 1 files
- `migrate-v2.ts/` — approximately 1 files
- `modelcontextprotocol-server-filesystem-2025.11.25.tgz/` — approximately 1 files
- `Motivo de Atendimento.csv/` — approximately 1 files
- `new_logo_base64.txt/` — approximately 1 files
- `old/` — approximately 1 files
- `package.json/` — approximately 1 files
- `papel-timbrado-Qualital.docx/` — approximately 1 files
- `patches/` — approximately 1 files
- `pnpm-lock.yaml/` — approximately 1 files
- `README_INSTALACAO_LOCAL.md/` — approximately 1 files
- `README_INSTALACAO.md/` — approximately 1 files
- `README.md/` — approximately 1 files
- `Relatorio_Diario_Qualital.pdf/` — approximately 1 files
- `scripts/` — approximately 44 files
- `server/` — approximately 57 files
- `setup-database.sql/` — approximately 1 files
- `shared/` — approximately 8 files
- `SpecUI.MD/` — approximately 1 files
- `start-email-server.bat/` — approximately 1 files
- `start.bat/` — approximately 1 files
- `start.sh/` — approximately 1 files
- `SYNC_SCHEMA.md/` — approximately 1 files
- `sync-to-zeabur.bat/` — approximately 1 files
- `tailwind.config.ts/` — approximately 1 files
- `temp_docx/` — approximately 0 files
- `tmp_report_template_pages/` — approximately 9 files
- `todo.md/` — approximately 1 files
- `tsconfig.json/` — approximately 1 files
- `update_csat_msgs.ts/` — approximately 1 files
- `update-csv-export.ps1/` — approximately 1 files
- `update-exports.ps1/` — approximately 1 files
- `uploads/` — approximately 112 files
- `VARIAVEIS_AMBIENTE.md/` — approximately 1 files
- `vite.config.ts/` — approximately 1 files
- `vitest.config.ts/` — approximately 1 files
- `word/` — approximately 1 files

## Related Resources

- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.


