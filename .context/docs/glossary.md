---
status: unfilled
generated: 2026-01-16
---

# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Type Definitions
- **AIChatBoxProps** (type) — [`AIChatBoxProps`](client\src\components\AIChatBox.tsx#L17)
- **AppRouter** (type) — [`AppRouter`](server\routers.ts#L69)
- **AttendanceReason** (type) — [`AttendanceReason`](drizzle\schema.ts#L591)
- **Banco** (interface) — [`Banco`](shared\bancos.ts#L9)
- **ChartConfig** (type) — [`ChartConfig`](client\src\components\ui\chart.tsx#L9)
- **Contract** (type) — [`Contract`](drizzle\schema.ts#L588)
- **ConversationParticipant** (type) — [`ConversationParticipant`](drizzle\schema.ts#L633)
- **Cliente** (type) — [`Cliente`](drizzle\schema.ts#L576)
- **ClienteBankData** (type) — [`ClienteBankData`](drizzle\schema.ts#L585)
- **ClienteEmail** (type) — [`ClienteEmail`](drizzle\schema.ts#L582)
- **ClientePhone** (type) — [`ClientePhone`](drizzle\schema.ts#L579)
- **Cooperativa** (type) — [`Cooperativa`](drizzle\schema.ts#L561)
- **CsatSurvey** (type) — [`CsatSurvey`](drizzle\schema.ts#L606)
- **DailyReportData** (interface) — [`DailyReportData`](server\reports\dailyReport.ts#L1)
- **DataApiCallOptions** (type) — [`DataApiCallOptions`](server\_core\dataApi.ts#L9)
- **Database** (type) — [`Database`](client\src\integrations\supabase\types.ts#L1)
- **DateRangeType** (type) — [`DateRangeType`](client\src\components\TicketFilter.tsx#L35)
- **DeclarationData** (interface) — [`DeclarationData`](server\reports\declarationReport.ts#L6)
- **Department** (type) — [`Department`](drizzle\schema.ts#L558)
- **DirectionsResult** (type) — [`DirectionsResult`](server\_core\map.ts#L105)
- **DistanceMatrixResult** (type) — [`DistanceMatrixResult`](server\_core\map.ts#L131)
- **ElevationResult** (type) — [`ElevationResult`](server\_core\map.ts#L209)
- **EmailAccount** (type) — [`EmailAccount`](drizzle\schema.ts#L615)
- **EmailAttachment** (type) — [`EmailAttachment`](drizzle\schema.ts#L627)
- **EmailCredential** (type) — [`EmailCredential`](drizzle\schema.ts#L618)
- **EmailEvent** (type) — [`EmailEvent`](drizzle\schema.ts#L624)
- **EmailTestLog** (type) — [`EmailTestLog`](drizzle\schema.ts#L621)
- **EstadoBrasil** (type) — [`EstadoBrasil`](shared\brasil.ts#L36)
- **FileContent** (type) — [`FileContent`](server\_core\llm.ts#L18)
- **GenerateImageOptions** (type) — [`GenerateImageOptions`](server\_core\imageGeneration.ts#L21)
- **GenerateImageResponse** (type) — [`GenerateImageResponse`](server\_core\imageGeneration.ts#L30)
- **GeocodingResult** (type) — [`GeocodingResult`](server\_core\map.ts#L144)
- **ImageContent** (type) — [`ImageContent`](server\_core\llm.ts#L10)
- **InsertAttendanceReason** (type) — [`InsertAttendanceReason`](drizzle\schema.ts#L592)
- **InsertContract** (type) — [`InsertContract`](drizzle\schema.ts#L589)
- **InsertConversationParticipant** (type) — [`InsertConversationParticipant`](drizzle\schema.ts#L634)
- **InsertCliente** (type) — [`InsertCliente`](drizzle\schema.ts#L577)
- **InsertClienteBankData** (type) — [`InsertClienteBankData`](drizzle\schema.ts#L586)
- **InsertClienteEmail** (type) — [`InsertClienteEmail`](drizzle\schema.ts#L583)
- **InsertClientePhone** (type) — [`InsertClientePhone`](drizzle\schema.ts#L580)
- **InsertCooperativa** (type) — [`InsertCooperativa`](drizzle\schema.ts#L562)
- **InsertCsatSurvey** (type) — [`InsertCsatSurvey`](drizzle\schema.ts#L607)
- **InsertDepartment** (type) — [`InsertDepartment`](drizzle\schema.ts#L559)
- **InsertEmailAccount** (type) — [`InsertEmailAccount`](drizzle\schema.ts#L616)
- **InsertEmailAttachment** (type) — [`InsertEmailAttachment`](drizzle\schema.ts#L628)
- **InsertEmailCredential** (type) — [`InsertEmailCredential`](drizzle\schema.ts#L619)
- **InsertEmailEvent** (type) — [`InsertEmailEvent`](drizzle\schema.ts#L625)
- **InsertEmailTestLog** (type) — [`InsertEmailTestLog`](drizzle\schema.ts#L622)
- **InsertInternalConversation** (type) — [`InsertInternalConversation`](drizzle\schema.ts#L631)
- **InsertInternalMessage** (type) — [`InsertInternalMessage`](drizzle\schema.ts#L637)
- **InsertProfile** (type) — [`InsertProfile`](drizzle\schema.ts#L553)
- **InsertQuickMessage** (type) — [`InsertQuickMessage`](drizzle\schema.ts#L613)
- **InsertSticker** (type) — [`InsertSticker`](drizzle\schema.ts#L640)
- **InsertTicket** (type) — [`InsertTicket`](drizzle\schema.ts#L595)
- **InsertTicketCriticity** (type) — [`InsertTicketCriticity`](drizzle\schema.ts#L574)
- **InsertTicketHistory** (type) — [`InsertTicketHistory`](drizzle\schema.ts#L601)
- **InsertTicketMessage** (type) — [`InsertTicketMessage`](drizzle\schema.ts#L598)
- **InsertTicketServiceType** (type) — [`InsertTicketServiceType`](drizzle\schema.ts#L568)
- **InsertTicketStatus** (type) — [`InsertTicketStatus`](drizzle\schema.ts#L565)
- **InsertTicketTimeTracking** (type) — [`InsertTicketTimeTracking`](drizzle\schema.ts#L604)
- **InsertTicketType** (type) — [`InsertTicketType`](drizzle\schema.ts#L571)
- **InsertUser** (type) — [`InsertUser`](drizzle\schema.ts#L550)
- **InsertUserProfileType** (type) — [`InsertUserProfileType`](drizzle\schema.ts#L556)
- **InsertWhatsappSession** (type) — [`InsertWhatsappSession`](drizzle\schema.ts#L610)
- **IntegrationType** (type) — [`IntegrationType`](server\whatsapp\config.ts#L6)
- **InternalConversation** (type) — [`InternalConversation`](drizzle\schema.ts#L630)
- **InternalMessage** (type) — [`InternalMessage`](drizzle\schema.ts#L636)
- **InvokeParams** (type) — [`InvokeParams`](server\_core\llm.ts#L58)
- **InvokeResult** (type) — [`InvokeResult`](server\_core\llm.ts#L80)
- **JsonSchema** (type) — [`JsonSchema`](server\_core\llm.ts#L100)
- **LatLng** (type) — [`LatLng`](server\_core\map.ts#L100)
- **MapType** (type) — [`MapType`](server\_core\map.ts#L97)
- **Message** (type) — [`Message`](server\_core\llm.ts#L28)
- **Message** (type) — [`Message`](client\src\components\AIChatBox.tsx#L12)
- **MessageContent** (type) — [`MessageContent`](server\_core\llm.ts#L26)
- **NotificationPayload** (type) — [`NotificationPayload`](server\_core\notification.ts#L4)
- **OutputSchema** (type) — [`OutputSchema`](server\_core\llm.ts#L106)
- **PeriodicReportData** (interface) — [`PeriodicReportData`](server\services\aiAnalysis.ts#L4)
- **PlaceDetailsResult** (type) — [`PlaceDetailsResult`](server\_core\map.ts#L182)
- **PlaceholderContext** (interface) — [`PlaceholderContext`](server\whatsapp\placeholders.ts#L1)
- **PlacesSearchResult** (type) — [`PlacesSearchResult`](server\_core\map.ts#L166)
- **Profile** (type) — [`Profile`](drizzle\schema.ts#L552)
- **QuickMessage** (type) — [`QuickMessage`](drizzle\schema.ts#L612)
- **ResponseFormat** (type) — [`ResponseFormat`](server\_core\llm.ts#L108)
- **RoadsResult** (type) — [`RoadsResult`](server\_core\map.ts#L226)
- **Role** (type) — [`Role`](server\_core\llm.ts#L3)
- **RouterOutputs** (type) — [`RouterOutputs`](client\src\lib\trpc.ts#L6)
- **SiglaUF** (type) — [`SiglaUF`](shared\brasil.ts#L37)
- **SpeedUnit** (type) — [`SpeedUnit`](server\_core\map.ts#L98)
- **Sticker** (type) — [`Sticker`](drizzle\schema.ts#L639)
- **TextContent** (type) — [`TextContent`](server\_core\llm.ts#L5)
- **Ticket** (type) — [`Ticket`](drizzle\schema.ts#L594)
- **TicketCriticity** (type) — [`TicketCriticity`](drizzle\schema.ts#L573)
- **TicketFilters** (interface) — [`TicketFilters`](client\src\components\TicketFilter.tsx#L37)
- **TicketHistory** (type) — [`TicketHistory`](drizzle\schema.ts#L600)
- **TicketMessage** (type) — [`TicketMessage`](drizzle\schema.ts#L597)
- **TicketServiceType** (type) — [`TicketServiceType`](drizzle\schema.ts#L567)
- **TicketStatus** (type) — [`TicketStatus`](drizzle\schema.ts#L564)
- **TicketTimeTracking** (type) — [`TicketTimeTracking`](drizzle\schema.ts#L603)
- **TicketType** (type) — [`TicketType`](drizzle\schema.ts#L570)
- **TimeZoneResult** (type) — [`TimeZoneResult`](server\_core\map.ts#L218)
- **ToastActionElement** (type) — [`ToastActionElement`](client\src\components\ui\toast.tsx#L3)
- **ToastProps** (interface) — [`ToastProps`](client\src\components\ui\toast.tsx#L5)
- **Tool** (type) — [`Tool`](server\_core\llm.ts#L35)
- **ToolCall** (type) — [`ToolCall`](server\_core\llm.ts#L71)
- **ToolChoice** (type) — [`ToolChoice`](server\_core\llm.ts#L53)
- **ToolChoiceByName** (type) — [`ToolChoiceByName`](server\_core\llm.ts#L45)
- **ToolChoiceExplicit** (type) — [`ToolChoiceExplicit`](server\_core\llm.ts#L46)
- **ToolChoicePrimitive** (type) — [`ToolChoicePrimitive`](server\_core\llm.ts#L44)
- **TranscribeOptions** (type) — [`TranscribeOptions`](server\_core\voiceTranscription.ts#L30)
- **TranscriptionError** (type) — [`TranscriptionError`](server\_core\voiceTranscription.ts#L61)
- **TranscriptionResponse** (type) — [`TranscriptionResponse`](server\_core\voiceTranscription.ts#L59)
- **TravelMode** (type) — [`TravelMode`](server\_core\map.ts#L96)
- **TrpcContext** (type) — [`TrpcContext`](server\_core\context.ts#L15)
- **UseCompositionOptions** (interface) — [`UseCompositionOptions`](client\src\hooks\useComposition.ts#L13)
- **UseCompositionReturn** (interface) — [`UseCompositionReturn`](client\src\hooks\useComposition.ts#L4)
- **User** (type) — [`User`](drizzle\schema.ts#L549)
- **UserProfile** (interface) — [`UserProfile`](client\src\_core\hooks\useAuth.ts#L5)
- **UserProfileType** (type) — [`UserProfileType`](drizzle\schema.ts#L555)
- **WhatsappSession** (type) — [`WhatsappSession`](drizzle\schema.ts#L609)
- **WhisperResponse** (type) — [`WhisperResponse`](server\_core\voiceTranscription.ts#L51)
- **WhisperSegment** (type) — [`WhisperSegment`](server\_core\voiceTranscription.ts#L37)

## Enumerations
- *No enums detected.*

## Core Terms

Define key terms, their relevance, and where they surface in the codebase.

## Acronyms & Abbreviations

Expand abbreviations and note associated services or APIs.

## Personas / Actors

Describe user goals, key workflows, and pain points addressed by the system.

## Domain Rules & Invariants

Capture business rules, validation constraints, or compliance requirements. Note any region, localization, or regulatory nuances.


