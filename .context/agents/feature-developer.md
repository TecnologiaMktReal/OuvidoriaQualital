---
name: Feature Developer
description: Implement new features according to specifications
status: unfilled
generated: 2026-01-16
---

# Feature Developer Agent Playbook

## Mission
Describe how the feature developer agent supports the team and when to engage it.

## Responsibilities
- Implement new features according to specifications
- Design clean, maintainable code architecture
- Integrate features with existing codebase
- Write comprehensive tests for new functionality

## Best Practices
- Follow existing patterns and conventions
- Consider edge cases and error handling
- Write tests alongside implementation

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points
- `Backup/` — TODO: Describe the purpose of this directory.
- `DOCS/` — TODO: Describe the purpose of this directory.
- `client/` — TODO: Describe the purpose of this directory.
- `drizzle/` — TODO: Describe the purpose of this directory.
- `old/` — TODO: Describe the purpose of this directory.
- `patches/` — TODO: Describe the purpose of this directory.
- `scripts/` — TODO: Describe the purpose of this directory.
- `server/` — TODO: Describe the purpose of this directory.
- `shared/` — TODO: Describe the purpose of this directory.
- `temp_docx/` — TODO: Describe the purpose of this directory.
- `tmp_report_template_pages/` — TODO: Describe the purpose of this directory.
- `uploads/` — TODO: Describe the purpose of this directory.
- `word/` — TODO: Describe the purpose of this directory.

## Key Files
**Entry Points:**
- [`server\_core\index.ts`](server\_core\index.ts)
- [`client\src\main.tsx`](client\src\main.tsx)

## Architecture Context

### Config
Configuration and constants
- **Directories**: `.`, `client`, `server\whatsapp`
- **Symbols**: 5 total
- **Key exports**: [`IntegrationType`](server\whatsapp\config.ts#L6), [`getActiveType`](server\whatsapp\config.ts#L24), [`setActiveType`](server\whatsapp\config.ts#L30)

### Utils
Shared utilities and helpers
- **Directories**: `shared`, `shared\_core`, `client\src\lib`
- **Symbols**: 13 total
- **Key exports**: [`generateContractId`](shared\ufCodes.ts#L40), [`extractUfCodeFromContractId`](shared\ufCodes.ts#L56), [`extractSequentialFromContractId`](shared\ufCodes.ts#L75), [`normalizeText`](shared\textUtils.ts#L10), [`normalizeObjectFields`](shared\textUtils.ts#L35), [`EstadoBrasil`](shared\brasil.ts#L36), [`SiglaUF`](shared\brasil.ts#L37), [`Banco`](shared\bancos.ts#L9), [`getBancoPorCodigo`](shared\bancos.ts#L24), [`buscarBancosPorNome`](shared\bancos.ts#L29), [`HttpError`](shared\_core\errors.ts#L5), [`cn`](client\src\lib\utils.ts#L4), [`RouterOutputs`](client\src\lib\trpc.ts#L6)

### Repositories
Data access and persistence
- **Directories**: `scripts`
- **Symbols**: 1 total

### Controllers
Request handling and routing
- **Directories**: `server`, `server\_core`, `server\routers`, `client\src\pages\settings`
- **Symbols**: 5 total
- **Key exports**: [`AppRouter`](server\routers.ts#L69), [`DataApiCallOptions`](server\_core\dataApi.ts#L9), [`callDataApi`](server\_core\dataApi.ts#L16), [`APIs`](client\src\pages\settings\APIs.tsx#L5)

### Models
Data structures and domain objects
- **Directories**: `drizzle`, `scripts`
- **Symbols**: 72 total
- **Key exports**: [`User`](drizzle\schema.ts#L549), [`InsertUser`](drizzle\schema.ts#L550), [`Profile`](drizzle\schema.ts#L552), [`InsertProfile`](drizzle\schema.ts#L553), [`UserProfileType`](drizzle\schema.ts#L555), [`InsertUserProfileType`](drizzle\schema.ts#L556), [`Department`](drizzle\schema.ts#L558), [`InsertDepartment`](drizzle\schema.ts#L559), [`Cooperativa`](drizzle\schema.ts#L561), [`InsertCooperativa`](drizzle\schema.ts#L562), [`TicketStatus`](drizzle\schema.ts#L564), [`InsertTicketStatus`](drizzle\schema.ts#L565), [`TicketServiceType`](drizzle\schema.ts#L567), [`InsertTicketServiceType`](drizzle\schema.ts#L568), [`TicketType`](drizzle\schema.ts#L570), [`InsertTicketType`](drizzle\schema.ts#L571), [`TicketCriticity`](drizzle\schema.ts#L573), [`InsertTicketCriticity`](drizzle\schema.ts#L574), [`Cliente`](drizzle\schema.ts#L576), [`InsertCliente`](drizzle\schema.ts#L577), [`ClientePhone`](drizzle\schema.ts#L579), [`InsertClientePhone`](drizzle\schema.ts#L580), [`ClienteEmail`](drizzle\schema.ts#L582), [`InsertClienteEmail`](drizzle\schema.ts#L583), [`ClienteBankData`](drizzle\schema.ts#L585), [`InsertClienteBankData`](drizzle\schema.ts#L586), [`Contract`](drizzle\schema.ts#L588), [`InsertContract`](drizzle\schema.ts#L589), [`AttendanceReason`](drizzle\schema.ts#L591), [`InsertAttendanceReason`](drizzle\schema.ts#L592), [`Ticket`](drizzle\schema.ts#L594), [`InsertTicket`](drizzle\schema.ts#L595), [`TicketMessage`](drizzle\schema.ts#L597), [`InsertTicketMessage`](drizzle\schema.ts#L598), [`TicketHistory`](drizzle\schema.ts#L600), [`InsertTicketHistory`](drizzle\schema.ts#L601), [`TicketTimeTracking`](drizzle\schema.ts#L603), [`InsertTicketTimeTracking`](drizzle\schema.ts#L604), [`CsatSurvey`](drizzle\schema.ts#L606), [`InsertCsatSurvey`](drizzle\schema.ts#L607), [`WhatsappSession`](drizzle\schema.ts#L609), [`InsertWhatsappSession`](drizzle\schema.ts#L610), [`QuickMessage`](drizzle\schema.ts#L612), [`InsertQuickMessage`](drizzle\schema.ts#L613), [`EmailAccount`](drizzle\schema.ts#L615), [`InsertEmailAccount`](drizzle\schema.ts#L616), [`EmailCredential`](drizzle\schema.ts#L618), [`InsertEmailCredential`](drizzle\schema.ts#L619), [`EmailTestLog`](drizzle\schema.ts#L621), [`InsertEmailTestLog`](drizzle\schema.ts#L622), [`EmailEvent`](drizzle\schema.ts#L624), [`InsertEmailEvent`](drizzle\schema.ts#L625), [`EmailAttachment`](drizzle\schema.ts#L627), [`InsertEmailAttachment`](drizzle\schema.ts#L628), [`InternalConversation`](drizzle\schema.ts#L630), [`InsertInternalConversation`](drizzle\schema.ts#L631), [`ConversationParticipant`](drizzle\schema.ts#L633), [`InsertConversationParticipant`](drizzle\schema.ts#L634), [`InternalMessage`](drizzle\schema.ts#L636), [`InsertInternalMessage`](drizzle\schema.ts#L637), [`Sticker`](drizzle\schema.ts#L639), [`InsertSticker`](drizzle\schema.ts#L640)

### Services
Business logic and orchestration
- **Directories**: `server\whatsapp`, `server\services`, `server\email`
- **Symbols**: 48 total
- **Key exports**: [`saveConfig`](server\whatsapp\service.ts#L293), [`getConfigSummary`](server\whatsapp\service.ts#L334), [`getCurrentQRCode`](server\whatsapp\service.ts#L372), [`getConnectionStatus`](server\whatsapp\service.ts#L377), [`getWhatsappHealth`](server\whatsapp\service.ts#L382), [`testConnection`](server\whatsapp\service.ts#L394), [`sendWhatsAppMessage`](server\whatsapp\service.ts#L433), [`sendWhatsAppMediaBase64`](server\whatsapp\service.ts#L471), [`handleWebhookVerification`](server\whatsapp\service.ts#L755), [`handleWebhookEvent`](server\whatsapp\service.ts#L775), [`initializeWhatsApp`](server\whatsapp\service.ts#L902), [`disconnectWhatsApp`](server\whatsapp\service.ts#L907), [`PeriodicReportData`](server\services\aiAnalysis.ts#L4), [`generatePeriodicReportAnalysis`](server\services\aiAnalysis.ts#L19), [`renderEmailTemplate`](server\email\service.ts#L151), [`renderCsatEmailTemplate`](server\email\service.ts#L214), [`testEmailConnection`](server\email\service.ts#L296), [`sendOutboundEmail`](server\email\service.ts#L309), [`sendEmail`](server\email\service.ts#L371)

### Components
UI components and views
- **Directories**: `client\src\pages`, `client\src\components`, `client\src\pages\settings`, `client\src\pages\relatorios`, `client\src\components\ui`
- **Symbols**: 154 total
- **Key exports**: [`ValidarAcesso`](client\src\pages\ValidarAcesso.tsx#L11), [`TicketsPlaceholder`](client\src\pages\TicketsPlaceholder.tsx#L5), [`RelatoriosPlaceholder`](client\src\pages\RelatoriosPlaceholder.tsx#L5), [`NotFound`](client\src\pages\NotFound.tsx#L6), [`FixAdmin`](client\src\pages\FixAdmin.tsx#L15), [`TicketListView`](client\src\components\TicketListView.tsx#L53), [`DateRangeType`](client\src\components\TicketFilter.tsx#L35), [`TicketFilters`](client\src\components\TicketFilter.tsx#L37), [`ThemeProvider`](client\src\components\theme-provider.tsx#L23), [`ModeToggle`](client\src\components\mode-toggle.tsx#L5), [`MapView`](client\src\components\Map.tsx#L119), [`Layout`](client\src\components\Layout.tsx#L12), [`DashboardLayoutSkeleton`](client\src\components\DashboardLayoutSkeleton.tsx#L3), [`DashboardLayout`](client\src\components\DashboardLayout.tsx#L40), [`Message`](client\src\components\AIChatBox.tsx#L12), [`AIChatBoxProps`](client\src\components\AIChatBox.tsx#L17), [`TiposAtendimentos`](client\src\pages\settings\TiposAtendimentos.tsx#L5), [`ResumoSemanal`](client\src\pages\relatorios\ResumoSemanal.tsx#L4), [`ResumoMensal`](client\src\pages\relatorios\ResumoMensal.tsx#L4), [`ResumoDiario`](client\src\pages\relatorios\ResumoDiario.tsx#L4), [`ResumoAnual`](client\src\pages\relatorios\ResumoAnual.tsx#L4), [`RankingTipos`](client\src\pages\relatorios\RankingTipos.tsx#L6), [`RankingCoordenadores`](client\src\pages\relatorios\RankingCoordenadores.tsx#L6), [`RankingClienteS`](client\src\pages\relatorios\RankingClienteS.tsx#L6), [`RankingContratos`](client\src\pages\relatorios\RankingContratos.tsx#L6), [`RankingAtendimento`](client\src\pages\relatorios\RankingAtendimento.tsx#L5), [`AgendamentoEnvio`](client\src\pages\relatorios\AgendamentoEnvio.tsx#L5), [`ToastActionElement`](client\src\components\ui\toast.tsx#L3), [`ToastProps`](client\src\components\ui\toast.tsx#L5), [`ChartConfig`](client\src\components\ui\chart.tsx#L9)
## Key Symbols for This Agent
- [`HttpError`](shared\_core\errors.ts#L5) (class)
- [`Banco`](shared\bancos.ts#L9) (interface)
- [`PlaceholderContext`](server\whatsapp\placeholders.ts#L1) (interface)
- [`PeriodicReportData`](server\services\aiAnalysis.ts#L4) (interface)
- [`DeclarationData`](server\reports\declarationReport.ts#L6) (interface)
- [`DailyReportData`](server\reports\dailyReport.ts#L1) (interface)

## Documentation Touchpoints
- [Documentation Index](../docs/README.md)
- [Project Overview](../docs/project-overview.md)
- [Architecture Notes](../docs/architecture.md)
- [Development Workflow](../docs/development-workflow.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [Glossary & Domain Concepts](../docs/glossary.md)
- [Data Flow & Integrations](../docs/data-flow.md)
- [Security & Compliance Notes](../docs/security.md)
- [Tooling & Productivity Guide](../docs/tooling.md)

## Collaboration Checklist

1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above.
4. Capture learnings back in [docs/README.md](../docs/README.md).

## Hand-off Notes

Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.


