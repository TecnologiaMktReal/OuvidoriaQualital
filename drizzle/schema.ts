import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, date, json, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Schema do Sistema Ouvidoria Coopedu
 * Adaptado da arquitetura PostgreSQL/Supabase para MySQL/Drizzle ORM
 */

// ============================================================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "SuperAdmin", "gerente", "atendente"]).default("user").notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_unique").on(table.email),
}));

export const userProfileTypes = mysqlTable("user_profile_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  role: mysqlEnum("role", ["user", "admin", "SuperAdmin", "gerente", "atendente"]).notNull().default("user"),
  permissions: json("permissions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 120 }),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  profileTypeId: int("profileTypeId").references(() => userProfileTypes.id),
  departmentId: int("departmentId").references(() => departments.id),
  isActive: boolean("isActive").default(true).notNull(),
  isOnLeave: boolean("isOnLeave").default(false).notNull(),
  leaveStartDate: date("leaveStartDate"),
  leaveEndDate: date("leaveEndDate"),
  passwordExpiresAt: timestamp("passwordExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// DEPARTAMENTOS
// ============================================================================

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  responsibleUserId: int("responsibleUserId").references(() => users.id),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// COOPERATIVA
// ============================================================================

export const cooperativas = mysqlTable("cooperativas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  whatsapp: varchar("whatsapp", { length: 32 }),
  street: varchar("street", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  complement: varchar("complement", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cnpjIdx: uniqueIndex("cooperativas_cnpj_unique").on(table.cnpj),
}));

export const cooperativaBusinessHours = mysqlTable("cooperativa_business_hours", {
  id: int("id").autoincrement().primaryKey(),
  cooperativaId: int("cooperativaId").references(() => cooperativas.id, { onDelete: "cascade" }),
  weekday: int("weekday").notNull(), // 0=Domingo ... 6=Sábado
  openTime: varchar("openTime", { length: 5 }),
  closeTime: varchar("closeTime", { length: 5 }),
  isClosed: boolean("isClosed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueDay: uniqueIndex("cooperativa_hours_unique_day").on(table.cooperativaId, table.weekday),
}));

export const cooperativaHolidays = mysqlTable("cooperativa_holidays", {
  id: int("id").autoincrement().primaryKey(),
  cooperativaId: int("cooperativaId").references(() => cooperativas.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isNational: boolean("isNational").default(false).notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueDate: uniqueIndex("cooperativa_holidays_unique_date").on(table.cooperativaId, table.date, table.name),
}));

// ============================================================================
// SETUP DE TICKETS
// ============================================================================

export const ticketStatuses = mysqlTable("ticket_statuses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  slaMinutes: int("slaMinutes"),
  timeoutMinutes: int("timeoutMinutes"),
  nextStatusSlug: varchar("nextStatusSlug", { length: 64 }),
  color: varchar("color", { length: 32 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("ticket_statuses_name_unique").on(table.name),
  slugIdx: uniqueIndex("ticket_statuses_slug_unique").on(table.slug),
}));

export const ticketServiceTypes = mysqlTable("ticket_service_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  acronym: varchar("acronym", { length: 20 }).notNull().default(""),
  department: varchar("department", { length: 255 }).notNull().default("Atendimento"),
  slaMinutes: int("slaMinutes"),
  color: varchar("color", { length: 32 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("ticket_service_types_name_unique").on(table.name),
}));

export const ticketTypes = mysqlTable("ticket_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("ticket_types_name_unique").on(table.name),
}));

export const ticketCriticities = mysqlTable("ticket_criticities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slaMinutes: int("slaMinutes"),
  color: varchar("color", { length: 32 }),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("ticket_criticities_name_unique").on(table.name),
}));

// ============================================================================
// Clientes
// ============================================================================

export const clientes: any = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  registrationNumber: bigint("registrationNumber", { mode: "number" }).unique(), // Removido notNull para suportar Não-Clientes
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }), // Removido notNull para suportar Não-Clientes sem documento
  isCliente: boolean("isCliente").default(true).notNull(), // Flag para distinguir Clientes de parceiros/externos
  birthDate: date("birthDate"),
  motherName: varchar("motherName", { length: 255 }),
  fatherName: varchar("fatherName", { length: 255 }),
  birthCity: varchar("birthCity", { length: 100 }),
  birthState: varchar("birthState", { length: 2 }),
  admissionDate: date("admissionDate"),
  associationDate: date("associationDate"),
  terminationDate: date("terminationDate"),
  position: varchar("position", { length: 255 }),
  status: mysqlEnum("status", ["ativo", "inativo", "desligado"]).notNull().default("ativo"),
  contractId: int("contractId").references(() => contracts.id),
  email: varchar("email", { length: 255 }),
  // Telefones
  whatsappNumber: varchar("whatsappNumber", { length: 20 }),
  secondaryPhone: varchar("secondaryPhone", { length: 20 }),
  // Endereço completo
  street: varchar("street", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  complement: varchar("complement", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  documentIdx: index("clientes_document_idx").on(table.document),
  nameIdx: index("clientes_name_idx").on(table.name),
  statusIdx: index("clientes_status_idx").on(table.status),
}));

export const clientePhones = mysqlTable("cliente_phones", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }).notNull(),
  phoneType: mysqlEnum("phoneType", ["principal", "secundario", "whatsapp"]).default("principal").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clienteEmails = mysqlTable("cliente_emails", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clienteBankData = mysqlTable("cliente_bank_data", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  bankCode: varchar("bankCode", { length: 10 }).notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", ["salario", "corrente", "poupanca"]).notNull(),
  agency: varchar("agency", { length: 10 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull(),
  accountDigit: varchar("accountDigit", { length: 2 }),
  pixKey: varchar("pixKey", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// CONTRATOS
// ============================================================================

export const contracts: any = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").references(() => Clientes.id),
  coordinatorclienteId: int("coordinatorclienteId").references(() => Clientes.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  validityDate: date("validityDate"),
  isSpecial: boolean("isSpecial").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  coordinatorclienteIdIdx: index("contracts_coordinator_Cliente_id_idx").on(table.coordinatorclienteId),
}));

// ============================================================================
// MOTIVOS DE ATENDIMENTO
// ============================================================================

export const attendanceReasons = mysqlTable("attendance_reasons", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").references((): any => attendanceReasons.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  acronym: varchar("acronym", { length: 50 }),
  slaMinutes: int("slaMinutes").default(2880).notNull(), // 48h padrão
  defaultStatusSlug: varchar("defaultStatusSlug", { length: 64 }),
  color: varchar("color", { length: 32 }),
  departmentId: int("departmentId").references(() => departments.id),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// TICKETS
// ============================================================================

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  protocol: varchar("protocol", { length: 20 }).notNull().unique(),
  clienteId: int("clienteId").references(() => Clientes.id),
  contractId: int("contractId").notNull().references(() => contracts.id),
  reasonId: int("reasonId").notNull().references(() => attendanceReasons.id),
  status: varchar("status", { length: 64 }).default("aguardando_atendimento").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  description: text("description").notNull(),
  assignedTo: int("assignedTo").references(() => users.id),
  currentDepartmentId: int("currentDepartmentId").notNull().references(() => departments.id),
  ticketTypeId: int("ticketTypeId").references(() => ticketTypes.id),
  criticityId: int("criticityId").references(() => ticketCriticities.id),
  // Novos campos para identificação externa e agrupamento
  channel: mysqlEnum("channel", ["whatsapp", "email", "interno"]).default("interno").notNull(),
  externalIdentifier: varchar("externalIdentifier", { length: 320 }), // telefone ou email
  externalName: varchar("externalName", { length: 500 }), // pushname ou assunto
  externalNumber: varchar("externalNumber", { length: 50 }), // número real sem o sufixo LID
  
  slaDeadline: timestamp("slaDeadline"),
  statusStartedAt: timestamp("statusStartedAt").defaultNow(),
  closedReason: varchar("closedReason", { length: 100 }),
  lastInteractionAt: timestamp("lastInteractionAt").defaultNow(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  externalIdx: index("tickets_external_identifier_idx").on(table.externalIdentifier),
  externalNumberIdx: index("tickets_external_number_idx").on(table.externalNumber),
  clienteIdIdx: index("tickets_Cliente_id_idx").on(table.clienteId),
  contractIdIdx: index("tickets_contract_id_idx").on(table.contractId),
  statusIdx: index("tickets_status_idx").on(table.status),
  openedAtIdx: index("tickets_opened_at_idx").on(table.openedAt),
  currentDepartmentIdIdx: index("tickets_dept_id_idx").on(table.currentDepartmentId),
}));

export const ticketMessages = mysqlTable("ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  senderType: mysqlEnum("senderType", ["Cliente", "atendente", "sistema"]).notNull(),
  senderId: int("senderId"),
  recipientclienteId: int("recipientclienteId").references(() => Clientes.id),
  message: text("message").notNull(),
  mediaUrl: text("mediaUrl"),
  whatsappMessageId: varchar("whatsappMessageId", { length: 255 }),
  isFromWhatsapp: boolean("isFromWhatsapp").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ticketHistory = mysqlTable("ticket_history", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ticketTimeTracking = mysqlTable("ticket_time_tracking", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  departmentId: int("departmentId").notNull().references(() => departments.id),
  userId: int("userId").notNull().references(() => users.id),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  pausedAt: timestamp("pausedAt"),
  resumedAt: timestamp("resumedAt"),
  finishedAt: timestamp("finishedAt"),
  totalSeconds: int("totalSeconds").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// CSAT (PESQUISA DE SATISFAÇÃO)
// ============================================================================

export const csatSurveys = mysqlTable("csat_surveys", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  clienteId: int("clienteId").notNull().references(() => Clientes.id),
  rating: int("rating"),
  comment: text("comment"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  answeredAt: timestamp("answeredAt"),
  status: mysqlEnum("status", ["pending", "answered", "expired"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// WHATSAPP
// ============================================================================

export const whatsappSessions = mysqlTable("whatsapp_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionName: varchar("sessionName", { length: 100 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  qrCode: text("qrCode"),
  status: mysqlEnum("status", ["disconnected", "qr_ready", "connected"]).default("disconnected").notNull(),
  connectedAt: timestamp("connectedAt"),
  disconnectedAt: timestamp("disconnectedAt"),
  sessionData: json("sessionData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sessionNameIdx: uniqueIndex("whatsapp_sessions_session_name_unique").on(table.sessionName),
}));

// ============================================================================
// MENSAGENS RÁPIDAS
// ============================================================================

export const quickMessages = mysqlTable("quick_messages", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  timeoutMinutes: int("timeoutMinutes"), // Tempo em minutos para automações
  timeoutSeconds: int("timeoutSeconds"), // Tempo em segundos (ex: CSAT cooldown)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// EMAIL SETUP
// ============================================================================

export const emailAccounts = mysqlTable("email_accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  fromAddress: varchar("fromAddress", { length: 320 }),
  replyTo: varchar("replyTo", { length: 320 }),
  signature: text("signature"),
  isDefault: boolean("isDefault").default(false).notNull(),
  status: mysqlEnum("status", ["inactive", "testing", "active", "error"]).default("inactive").notNull(),
  departmentId: int("departmentId").references(() => departments.id),
  reasonId: int("reasonId").references(() => attendanceReasons.id),
  ticketTypeId: int("ticketTypeId").references(() => ticketTypes.id),
  criticityId: int("criticityId").references(() => ticketCriticities.id),
  defaultContractId: int("defaultContractId").references(() => contracts.id),
  maxAttachmentMb: int("maxAttachmentMb").default(10).notNull(),
  reopenClosedPolicy: mysqlEnum("reopenClosedPolicy", ["reopen", "bounce"]).default("reopen").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("email_accounts_email_unique").on(table.email),
}));

export const emailCredentials = mysqlTable("email_credentials", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  protocol: mysqlEnum("protocol", ["smtp", "imap", "pop3"]).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull(),
  secure: mysqlEnum("secure", ["none", "starttls", "ssl"]).default("ssl").notNull(),
  authType: mysqlEnum("authType", ["password", "oauth"]).default("password").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEncrypted: text("passwordEncrypted"),
  oauthRefreshTokenEncrypted: text("oauthRefreshTokenEncrypted"),
  oauthAccessTokenEncrypted: text("oauthAccessTokenEncrypted"),
  lastValidatedAt: timestamp("lastValidatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueAccountProtocol: uniqueIndex("email_credentials_account_protocol_unique").on(table.accountId, table.protocol),
}));

export const emailTestLogs = mysqlTable("email_test_logs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["smtp", "imap", "pop3"]).notNull(),
  success: boolean("success").default(false).notNull(),
  message: text("message"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailEvents = mysqlTable("email_events", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  status: mysqlEnum("status", ["received", "sent", "failed", "skipped"]).notNull(),
  messageId: varchar("messageId", { length: 255 }),
  inReplyTo: varchar("inReplyTo", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  ticketId: int("ticketId").references(() => tickets.id, { onDelete: "set null" }),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailAttachments = mysqlTable("email_attachments", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => emailEvents.id, { onDelete: "cascade" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 255 }).notNull(),
  sizeBytes: int("sizeBytes").default(0).notNull(),
  storageUrl: text("storageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// CHAT INTERNO
// ============================================================================

export const internalConversations = mysqlTable("internal_conversations", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").references(() => tickets.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  isGroup: boolean("isGroup").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversationParticipants = mysqlTable("conversation_participants", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  lastReadAt: timestamp("lastReadAt"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("cp_uniq").on(table.conversationId, table.userId),
  convIdx: index("cp_conv").on(table.conversationId),
  userIdx: index("cp_user").on(table.userId),
}));

export const internalMessages = mysqlTable("internal_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  message: text("message"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileType: mysqlEnum("fileType", ["image", "audio", "document", "video"]),
  sentToWhatsApp: boolean("sentToWhatsApp").default(false).notNull(),
  whatsappMessageId: varchar("whatsappMessageId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  convIdx: index("im_conv").on(table.conversationId),
  senderIdx: index("im_sender").on(table.senderId),
  createdIdx: index("im_created").on(table.createdAt),
}));

// ============================================================================
// FIGURINHAS (STICKERS)
// ============================================================================

export const stickers = mysqlTable("stickers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(), // URL pública da figurinha (Supabase ou Local)
  storageKey: varchar("storageKey", { length: 500 }).notNull(), // Chave para exclusão no storage
  createdBy: int("createdBy").references(() => users.id),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================================================
// CONFIGURAÇÕES DE ALERTAS PARA GESTORES
// ============================================================================

export const managerAlertConfigs = mysqlTable("manager_alert_configs", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["queue_volume", "bad_csat", "contract_spike"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  threshold: int("threshold").notNull(),
  channels: json("channels").notNull(), // Array: ["email", "whatsapp"]
  whatsappRecipients: json("whatsappRecipients"), // Array of user IDs
  emailRecipients: json("emailRecipients"), // Array of user IDs
  customMessage: text("customMessage"),
  windowMinutes: int("windowMinutes").default(1), // Janela de monitoramento em minutos
  cooldownMinutes: int("cooldownMinutes").default(60).notNull(),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// AGENDAMENTO DE RELATÓRIOS
// ============================================================================

export const reportSchedules = mysqlTable("report_schedules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  reportType: mysqlEnum("reportType", ["resumo_diario", "resumo_semanal", "resumo_mensal", "resumo_anual"]).notNull(),
  period: mysqlEnum("period", ["ontem", "hoje", "semana_atual", "mes_atual", "ano_atual"]).notNull(),
  scheduleTime: varchar("scheduleTime", { length: 5 }).notNull(), // HH:mm
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).default("daily").notNull(),
  daysOfWeek: json("daysOfWeek"), // [0,1,2,3,4,5,6]
  message: text("message"),
  channels: json("channels").notNull(), // ["email", "whatsapp"]
  recipients: json("recipients").notNull(), // Array of user IDs or emails/phones? User IDs are safer.
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reportDeliveryLogs = mysqlTable("report_delivery_logs", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").references(() => reportSchedules.id, { onDelete: "set null" }),
  reportType: varchar("reportType", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(), // "email" | "whatsapp"
  recipientId: int("recipientId").references(() => users.id),
  recipientValue: varchar("recipientValue", { length: 320 }), // email ou telefone
  status: mysqlEnum("status", ["success", "error"]).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

// ============================================================================
// TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export type UserProfileType = typeof userProfileTypes.$inferSelect;
export type InsertUserProfileType = typeof userProfileTypes.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export type Cooperativa = typeof cooperativas.$inferSelect;
export type InsertCooperativa = typeof cooperativas.$inferInsert;

export type TicketStatus = typeof ticketStatuses.$inferSelect;
export type InsertTicketStatus = typeof ticketStatuses.$inferInsert;

export type TicketServiceType = typeof ticketServiceTypes.$inferSelect;
export type InsertTicketServiceType = typeof ticketServiceTypes.$inferInsert;

export type TicketType = typeof ticketTypes.$inferSelect;
export type InsertTicketType = typeof ticketTypes.$inferInsert;

export type TicketCriticity = typeof ticketCriticities.$inferSelect;
export type InsertTicketCriticity = typeof ticketCriticities.$inferInsert;

export type Cliente = typeof Clientes.$inferSelect;
export type InsertCliente = typeof Clientes.$inferInsert;

export type clientePhone = typeof clientePhones.$inferSelect;
export type InsertclientePhone = typeof clientePhones.$inferInsert;

export type clienteEmail = typeof clienteEmails.$inferSelect;
export type InsertclienteEmail = typeof clienteEmails.$inferInsert;

export type ClienteBankData = typeof ClienteBankData.$inferSelect;
export type InsertClienteBankData = typeof ClienteBankData.$inferInsert;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

export type AttendanceReason = typeof attendanceReasons.$inferSelect;
export type InsertAttendanceReason = typeof attendanceReasons.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = Omit<typeof tickets.$inferInsert, 'protocol'> & { protocol?: string };

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;

export type TicketHistory = typeof ticketHistory.$inferSelect;
export type InsertTicketHistory = typeof ticketHistory.$inferInsert;

export type TicketTimeTracking = typeof ticketTimeTracking.$inferSelect;
export type InsertTicketTimeTracking = typeof ticketTimeTracking.$inferInsert;

export type CsatSurvey = typeof csatSurveys.$inferSelect;
export type InsertCsatSurvey = typeof csatSurveys.$inferInsert;

export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsappSession = typeof whatsappSessions.$inferInsert;

export type QuickMessage = typeof quickMessages.$inferSelect;
export type InsertQuickMessage = typeof quickMessages.$inferInsert;

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

export type EmailCredential = typeof emailCredentials.$inferSelect;
export type InsertEmailCredential = typeof emailCredentials.$inferInsert;

export type EmailTestLog = typeof emailTestLogs.$inferSelect;
export type InsertEmailTestLog = typeof emailTestLogs.$inferInsert;

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = typeof emailAttachments.$inferInsert;

export type InternalConversation = typeof internalConversations.$inferSelect;
export type InsertInternalConversation = typeof internalConversations.$inferInsert;

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = typeof conversationParticipants.$inferInsert;

export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = typeof internalMessages.$inferInsert;

export type Sticker = typeof stickers.$inferSelect;
export type InsertSticker = typeof stickers.$inferInsert;

export type ManagerAlertConfig = typeof managerAlertConfigs.$inferSelect;
export type InsertManagerAlertConfig = typeof managerAlertConfigs.$inferInsert;

export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;

export type ReportDeliveryLog = typeof reportDeliveryLogs.$inferSelect;
export type InsertReportDeliveryLog = typeof reportDeliveryLogs.$inferInsert;

// ============================================================================
// BLACKLIST
// ============================================================================

export const blacklist = mysqlTable("blacklist", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["email", "whatsapp"]).notNull(),
  value: varchar("value", { length: 320 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueValue: uniqueIndex("blacklist_value_unique").on(table.type, table.value),
}));

export type Blacklist = typeof blacklist.$inferSelect;
export type InsertBlacklist = typeof blacklist.$inferInsert;

// ============================================================================
// WHATSAPP COMMUNICATION LOGS
// ============================================================================

export const whatsappCommunicationLogs = mysqlTable("whatsapp_communication_logs", {
  id: int("id").autoincrement().primaryKey(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  type: varchar("type", { length: 50 }), // 'message', 'status', 'event', 'error'
  phoneNumber: varchar("phoneNumber", { length: 32 }),
  payload: json("payload"),
  status: varchar("status", { length: 50 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsappCommunicationLog = typeof whatsappCommunicationLogs.$inferSelect;
export type InsertWhatsappCommunicationLog = typeof whatsappCommunicationLogs.$inferInsert;
// ============================================================================
// AUDITORIA
// ============================================================================

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  entity: varchar("entity", { length: 100 }), // 'Clientes', 'Tickets', etc.
  entityId: varchar("entityId", { length: 100 }),
  page: varchar("page", { length: 255 }),
  details: json("details"), // Informações extras (valores alterados, etc.)
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  entityIdx: index("audit_logs_entity_idx").on(table.entity),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// LAYOUTS DE E-MAIL
// ============================================================================

export const emailLayouts = mysqlTable("email_layouts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  htmlContent: text("htmlContent").notNull(), // HTML completo do template
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("email_layouts_name_idx").on(table.name),
}));

export type EmailLayout = typeof emailLayouts.$inferSelect;
export type InsertEmailLayout = typeof emailLayouts.$inferInsert;

// ============================================================================
// PROCESSOS (KANBAN)
// ============================================================================

export const processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  sourceTicketId: int("sourceTicketId").references(() => tickets.id, { onDelete: "set null" }),
  stage: mysqlEnum("stage", [
    "Analise da Ouvidoria",
    "Solicitação de Informações",
    "Conselho Administrativo",
    "Resultado do Processo"
  ]).notNull().default("Analise da Ouvidoria"),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  
  // Dados de contato
  clienteName: varchar("clienteName", { length: 255 }),
  ClienteCpf: varchar("ClienteCpf", { length: 20 }),
  clientePhone: varchar("clientePhone", { length: 32 }),
  clienteEmail: varchar("clienteEmail", { length: 320 }),
  contractId: int("contractId").references(() => contracts.id, { onDelete: "set null" }),
  
  reason: varchar("reason", { length: 255 }),
  description: text("description"),
  
  // Anexos
  ticketPdfUrl: text("ticketPdfUrl"), // PDF histórico da manifestação
  documentsUrl: json("documentsUrl"), // Array of string URLs
  
  // Análises (Preenchíveis pelo kanban)
  ouvidorAnalysis: text("ouvidorAnalysis"),
  councilAnalysis: text("councilAnalysis"),
  finalAnalysis: text("finalAnalysis"),
  appliedSolution: text("appliedSolution"),
  
  // Datas
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stageIdx: index("processes_stage_idx").on(table.stage),
  sourceTicketIdIdx: index("processes_source_ticket_id_idx").on(table.sourceTicketId),
}));

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;



