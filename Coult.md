# 🧠 COULT PROJECT - SYSTEM ARCHITECTURE & BRAIN LIFT
# Ouvidoria Coopedu - Sistema de Gestão de Atendimentos

> **CONTEXTO CRÍTICO PARA O AGENTE:**
> Você agora atua como o **Engenheiro Líder** do projeto Ouvidoria Coopedu. Sua prioridade é manter a consistência, segurança e escalabilidade. Antes de escrever qualquer linha de código, você **DEVE** consultar as regras imutáveis em `AI_RULES.md` e `GoodPractice.md`.

---

## 📋 Índice

1. [Visão Geral e Mapa Mental](#1-visão-geral-e-mapa-mental)
2. [Protocolos e Regras (LEITURA OBRIGATÓRIA)](#2-protocolos-e-regras-leitura-obrigatória)
3. [Arquitetura Detalhada](#3-arquitetura-detalhada)
4. [Model Context Protocols (MCPs)](#4-model-context-protocols-mcps)
5. [Camada de Dados (Database Schema)](#5-camada-de-dados-database-schema)
6. [Setup e Execução](#6-setup-e-execução)
7. [Memória de Contexto (Estado Atual)](#7-memória-de-contexto-estado-atual)
8. [Workflow de Desenvolvimento](#8-workflow-de-desenvolvimento)
9. [Integrações Externas](#9-integrações-externas)
10. [Deploy e Produção](#10-deploy-e-produção)

---

## 1. 🗺️ Visão Geral e Mapa Mental

### Resumo Executivo
O **Sistema Ouvidoria Coopedu** é uma plataforma completa de gestão de atendimentos desenvolvida para a Coopedu - Excelência em Educação. O sistema centraliza tickets de atendimento, gestão de ClienteS e contratos, organização por departamentos e integração com WhatsApp Business API e Email (SMTP/IMAP/POP3).

### Stack Principal

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| **Frontend** | React + TypeScript | 18.3.1 | UI/UX Interface |
| **Styling** | Tailwind CSS | 4.1.14 | Design System |
| **Components** | shadcn/ui + Radix UI | Latest | Component Library |
| **Routing** | Wouter | 3.7.1 | Client-side routing |
| **State** | tRPC + React Query | 11.6.0 | Server State |
| **Backend** | Node.js + Express | 22.x + 4.21.2 | HTTP Server |
| **API Layer** | tRPC | 11.6.0 | Type-safe API |
| **ORM** | Drizzle ORM | 0.44.5 | Database Layer |
| **DB Primary** | MySQL | 8.0 | Relational Database (Port 3307) |
| **DB Auth** | Supabase | Latest | Authentication + Storage |
| **Automation** | Puppeteer + Python | 24.31.0 + 3.10+ | Browser/Data Automation |
| **Email** | Nodemailer + ImapFlow | Latest | Email Integration |
| **WhatsApp** | whatsapp-web.js + Cloud API | Latest | WhatsApp Integration |
| **Infrastructure** | Docker + Zeabur | - | Local + Production |

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │   Hooks  │  │  tRPC    │   │
│  │ (Tickets)│  │ (shadcn) │  │(useAuth) │  │  Client  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │ HTTP/tRPC
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (Express + tRPC)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Routers │  │   Auth   │  │WhatsApp  │  │  Email   │   │
│  │(tickets) │  │(Supabase)│  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                           │                                  │
│                    ┌──────────┐                             │
│                    │   db.ts  │ (Drizzle ORM)               │
│                    └──────────┘                             │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   DATABASES & STORAGE                        │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │    MySQL     │         │   Supabase   │                 │
│  │  (Port 3307) │         │  Auth+Storage│                 │
│  │   - tickets  │         │  - users     │                 │
│  │   - ClienteS│         │  - avatars   │                 │
│  │   - contracts│         │  - imagens   │                 │
│  └──────────────┘         └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 🛡️ Protocolos e Regras (LEITURA OBRIGATÓRIA)

### Regras Imutáveis

⚠️ **A violação destas regras resulta em código rejeitado.**

1. **Referência Cruzada Obrigatória:**
   - TODO código gerado DEVE ser validado contra `AI_RULES.md` e `GoodPractice.md`
   - Sempre consulte `drizzle/schema.ts` antes de escrever queries ou criar novas tabelas

2. **Estilo de Código (TypeScript):**
   - ✅ **OBRIGATÓRIO:** TypeScript Strict Mode ativo
   - 🛑 **PROIBIDO:** Uso de `any` (use `unknown` ou tipos específicos)
   - ✅ **OBRIGATÓRIO:** Interfaces para Props de componentes React
   - ✅ **OBRIGATÓRIO:** Inferência de tipos do Drizzle (`typeof table.$inferSelect`)

3. **Estilo de Código (Python):**
   - ✅ **OBRIGATÓRIO:** Type Hints em todas as funções
   - ✅ **OBRIGATÓRIO:** PEP8 compliance (use `black` ou `ruff`)
   - ✅ **OBRIGATÓRIO:** Virtual Environment (`.venv`)
   - 🛑 **PROIBIDO:** `time.sleep()` (use `WebDriverWait` com `expected_conditions`)

4. **Segurança:**
   - 🛑 **NUNCA** expor chaves de API no código ou logs
   - ✅ **SEMPRE** validar inputs no Backend (Zod validation)
   - ✅ **SEMPRE** usar prepared statements (Drizzle ORM faz isso automaticamente)
   - ✅ **SEMPRE** sanitizar dados antes de exibição (React faz isso automaticamente)

5. **Database (MySQL):**
   - 🛑 **PROIBIDO:** Criar arquivos `.sql` manualmente
   - ✅ **WORKFLOW CORRETO:**
     1. Editar `drizzle/schema.ts`
     2. Executar `pnpm db:push` (NÃO usar migrations automáticas)
     3. Verificar logs de aplicação do schema
   - ✅ **OBRIGATÓRIO:** Foreign Keys em TODAS as relações
   - ✅ **OBRIGATÓRIO:** Índices em colunas de FK e busca
   - ✅ **OBRIGATÓRIO:** Usar transações para operações multi-step

6. **Logs e Debugging:**
   - ✅ **SEMPRE** usar `logger.info/error/warn` (não `console.log`)
   - ✅ **SEMPRE** incluir contexto estruturado nos logs: `logger.error("msg", { context })`

7. **Clean Code (DRY, SOLID):**
   - 🛑 **EVITAR:** Duplicação de código (extrair para funções utilitárias)
   - 🛑 **EVITAR:** Componentes React > 250 linhas (quebrar em subcomponentes)
   - ✅ **PREFERIR:** Custom hooks para lógica reutilizável
   - ✅ **PREFERIR:** Composition over Inheritance

### Arquivos de Referência

| Arquivo | Propósito | Quando Consultar |
|---------|-----------|------------------|
| `AI_RULES.md` | Regras de engenharia sênior | Antes de qualquer implementação |
| `GoodPractice.md` | Best practices React/TS | Durante code review |
| `drizzle/schema.ts` | Schema MySQL completo | Antes de queries/alterações DB |
| `VARIAVEIS_AMBIENTE.md` | Variáveis de ambiente | Setup ou debugging de config |

---

## 3. 🏗️ Arquitetura Detalhada

### 3.1 Frontend (UI/UX & Layouts)

#### Estrutura de Pastas
```
client/src/
├── _core/                # Código core (não modificar sem análise)
│   └── hooks/
│       ├── useAuth.ts    # Hook de autenticação (legado)
│       └── useSupabaseAuth.ts  # Hook de autenticação Supabase (ATIVO)
├── App.tsx               # Roteamento principal (wouter)
├── main.tsx              # Entry point (renderiza <App />)
├── components/
│   ├── Layout.tsx        # Wrapper principal com Sidebar
│   ├── DashboardLayout.tsx  # Layout específico para dashboards
│   ├── Sidebar.tsx       # Menu lateral (navegação)
│   ├── AIChatBox.tsx     # Chat AI (futuro)
│   ├── ErrorBoundary.tsx # Tratamento de erros React
│   └── ui/               # shadcn/ui components (54 arquivos)
├── pages/
│   ├── Home.tsx          # Dashboard principal
│   ├── Tickets.tsx       # Gestão de tickets (972 linhas - complexo)
│   ├── ClienteS.tsx    # Gestão de ClienteS
│   ├── Contratos.tsx     # Gestão de contratos
│   ├── Departamentos.tsx # Gestão de departamentos
│   ├── WhatsAppChat.tsx  # Chat WhatsApp
│   └── settings/         # Submenu de configurações
│       ├── Usuarios.tsx
│       ├── SetupWhatsApp.tsx
│       ├── SetupEmails.tsx
│       ├── SetupTickets.tsx
│       ├── Importacoes.tsx
│       └── MensagensAutomaticas.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts     # Cliente Supabase (Auth)
│       └── types.ts      # Tipos Supabase
└── lib/
    ├── trpc.ts           # Cliente tRPC configurado
    └── utils.ts          # Utilitários (cn, formatters)
```

#### Design System & Componentes

**shadcn/ui (Radix UI):**
- **Componentes Principais:** Button, Input, Select, Dialog, Dropdown, Tabs, Table, Card, Badge, Toast (Sonner)
- **Tema:** Suporta Dark/Light Mode via `ThemeContext.tsx`
- **Estilização:** Tailwind CSS 4 com utilitários customizados
- **Ícones:** lucide-react (consistente em todo o projeto)

**Layout Padrão:**
```tsx
<Layout>  {/* Wrapper com Sidebar */}
  <div className="p-6">
    <h1>Título da Página</h1>
    {/* Conteúdo */}
  </div>
</Layout>
```

#### Estado Global & Data Fetching

**Autenticação:**
- **Hook Principal:** `useSupabaseAuth()` (retorna `{ user, loading, signOut }`)
- **Proteção de Rotas:** `ProtectedRoute` wrapper em `App.tsx`
- **Persistência:** LocalStorage via Supabase SDK

**Server State (tRPC + React Query):**
```tsx
// Query
const { data, isLoading } = trpc.tickets.getAll.useQuery({
  status: "aberto",
});

// Mutation
const createMutation = trpc.tickets.create.useMutation({
  onSuccess: () => {
    utils.tickets.getAll.invalidate(); // Revalidate cache
    toast.success("Ticket criado!");
  },
});
```

**Client State:**
- **Formulários:** `react-hook-form` + `zod` resolver
- **UI State:** `useState` + `useEffect` (preferir hooks customizados)
- **Theme:** `ThemeContext` (Provider em `main.tsx`)

#### Roteamento (Wouter)

**Rotas Públicas:**
- `/auth` → Login (Supabase Auth UI)
- `/login` → Alias para `/auth`
- `/validar-acesso` → Validação de email

**Rotas Protegidas (requerem autenticação):**
- `/` → Dashboard
- `/tickets` → Gestão de Tickets
- `/ClienteS` → Gestão de ClienteS
- `/contratos` → Gestão de Contratos
- `/departamentos` → Gestão de Departamentos
- `/whatsapp-chat` → Interface de Chat WhatsApp
- `/settings/*` → Submenu de Configurações

### 3.2 Backend & Lógica de Negócio

#### Entry Point (server/_core/index.ts)

**Inicialização:**
1. Carrega variáveis de ambiente (`dotenv/config`)
2. Cria servidor Express
3. Configura middlewares (JSON parser 50MB limit)
4. Registra Webhooks WhatsApp (`/api/webhooks/whatsapp`)
5. Registra tRPC middleware (`/api/trpc`)
6. Configura Vite (dev) ou static files (prod)
7. Inicia Email Polling (IMAP background job)
8. Inicializa WhatsApp QR session (se ativo)

**Porta:**
- Busca porta disponível a partir de `PORT` env (default: 3000)
- Auto-incrementa se ocupada (até +20 tentativas)

#### Autenticação (Supabase Integration)

**Fluxo:**
1. Frontend autentica via `supabase.auth.signInWithPassword()`
2. Supabase retorna JWT + session
3. Backend valida JWT via `@supabase/supabase-js` (client-side validation)
4. Sincroniza usuário Supabase → MySQL (`syncSupabaseUsersToDatabase()`)
5. Cria profile em `profiles` table

**Tabelas:**
- `users` (MySQL) ← sincronizado de Supabase Auth
- `profiles` (MySQL) ← dados estendidos (fullName, phone, avatarUrl, department)

**Context tRPC:**
```typescript
export async function createContext({ req, res }: CreateExpressContextOptions) {
  const user = await getUserFromRequest(req); // Valida JWT/Cookie
  return { req, res, user };
}
```

#### Routers tRPC (server/routers/)

**Estrutura de Router:**
```typescript
export const ticketsRouter = router({
  getAll: publicProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      return await db.getAllTickets(input);
    }),
    
  create: publicProcedure
    .input(insertTicketSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await db.createTicket(input);
    }),
});
```

**Routers Principais:**

| Router | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `tickets` | `tickets.ts` | CRUD tickets, messages, history |
| `ClienteS` | `ClienteS.ts` | CRUD ClienteS + phones + bank data |
| `contracts` | `contracts.ts` | CRUD contratos |
| `departments` | `departments.ts` | CRUD departamentos |
| `attendanceReasons` | `departments.ts` | CRUD motivos de atendimento (hierárquico) |
| `whatsapp` | `whatsapp.ts` | Config, status, send message, QR code |
| `emailSetup` | `emailSetup.ts` | Contas email, credenciais, testes |
| `email` | `email.ts` | Enviar/receber emails vinculados a tickets |
| `import` | `import.ts` | Importação CSV (ClienteS/contratos) |
| `quickMessages` | `quickMessages.ts` | Mensagens rápidas para atendentes |
| `users` | `users.ts` | Gestão de usuários e profiles |
| `cooperativa` | `cooperativa.ts` | Config da cooperativa (horários, feriados) |
| `ticketSetup` | `ticketSetup.ts` | Setup de statuses, types, criticities |

#### WhatsApp Integration

**Tipos de Integração:**
1. **Cloud API** (Oficial - Ativo em Produção)
   - Provider: Meta/Facebook WhatsApp Business API
   - Webhooks: `POST /api/webhooks/whatsapp`
   - Verificação: `GET /api/webhooks/whatsapp` (hub.verify_token)
   - Envio: Graph API (`/v20.0/{phone_number_id}/messages`)
   - Arquivo: `server/whatsapp/service.ts`

2. **QR Session** (WhatsApp Web - Desenvolvimento)
   - Provider: `whatsapp-web.js` (Puppeteer-based)
   - Session: Persistida em `whatsapp_sessions` table
   - QR Code: Gerado na primeira conexão
   - Arquivo: `server/whatsapp/serviceQr.ts`

**Fluxo de Mensagem Recebida (Cloud API):**
1. Webhook recebe payload do Meta
2. Valida assinatura HMAC SHA-256 (APP_SECRET)
3. Extrai mensagem + contato (wa_id, profile_name)
4. Normaliza telefone para E.164 (+55XXXXXXXXXXX)
5. Busca CLIENTE por telefone (`getClienteByPhone()`)
6. Verifica ticket aberto do CLIENTE
7. Se não existe ticket:
   - Cria ticket automaticamente
   - Vincula ao contrato do CLIENTE (ou contrato especial)
   - Atribui ao departamento "Atendimento"
   - Envia mensagem automática com protocolo
8. Salva mensagem em `ticket_messages`
9. Atualiza `lastInteractionAt` do ticket

**Fluxo de Envio de Mensagem:**
```typescript
await sendWhatsAppMessage(
  phone: "+5511999999999",
  message: "Seu ticket foi atualizado!"
);
```

#### Email Integration

**Protocolos Suportados:**
- **SMTP:** Envio de emails (Nodemailer)
- **IMAP:** Recebimento (polling via ImapFlow)
- **POP3:** Recebimento (implementação custom)

**Arquivos:**
- `server/email/service.ts` → Testes de conexão
- `server/email/sender.ts` → Envio de emails
- `server/email/receiver.ts` → Polling IMAP (background job)
- `server/email/pop3.ts` → Cliente POP3
- `server/email/crypto.ts` → Criptografia de credenciais

**Fluxo de Email Recebido (IMAP Polling):**
1. Job roda a cada X segundos (configurável)
2. Conecta em conta IMAP configurada
3. Lista emails não lidos em INBOX
4. Para cada email:
   - Extrai remetente, assunto, corpo HTML/texto
   - Procura ticket por `In-Reply-To` header (resposta)
   - Se não encontra, cria novo ticket
   - Salva mensagem em `ticket_messages`
   - Salva attachments em Supabase Storage
   - Marca email como lido
5. Fecha conexão IMAP

**Tabelas:**
- `email_accounts` → Contas de email configuradas
- `email_credentials` → Credenciais SMTP/IMAP/POP3 (criptografadas)
- `email_events` → Log de emails enviados/recebidos
- `email_attachments` → Anexos (referência Supabase Storage)
- `email_test_logs` → Logs de testes de conexão

### 3.3 Database Layer (Drizzle ORM)

**Arquivo Principal:** `server/db.ts` (2737 linhas)

**Singleton Pattern:**
```typescript
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
    await syncSupabaseUsersToDatabase();
    await ensureTicketStatusesSeeded();
  }
  return _db;
}
```

**Principais Funções:**

| Função | Propósito | Exemplo de Uso |
|--------|-----------|----------------|
| `upsertUser()` | Sincroniza user Supabase → MySQL | Auth callback |
| `getSystemUserById()` | Busca user completo (com profile) | Carrega dados do usuário logado |
| `getAllTickets()` | Lista tickets com filtros | Dashboard, página de tickets |
| `createTicket()` | Cria ticket + gera protocolo | Webhook WhatsApp, formulário |
| `updateTicket()` | Atualiza status/campos | Alteração de status |
| `createTicketMessage()` | Adiciona mensagem ao ticket | Chat interno, WhatsApp |
| `createTicketHistory()` | Registra ação no histórico | Auditoria de alterações |
| `getClienteByPhone()` | Busca CLIENTE por telefone | Integração WhatsApp |
| `uploadAvatarToSupabase()` | Upload de avatar para Supabase Storage | Perfil de usuário |

**Normalização de Dados:**
- **Telefones:** Remove formatação, normaliza para dígitos (`normalizeText()`)
- **CPF/CNPJ:** Remove pontuação antes de salvar
- **Textos:** `normalizeText()` para busca case-insensitive

---

## 4. 🔧 Model Context Protocols (MCPs)

### Servidores MCP Ativos

O projeto utiliza MCPs para estender as capacidades da IA durante o desenvolvimento. Todos os wrappers estão em `scripts/`:

| MCP Server | Wrapper | Função Principal |
|------------|---------|------------------|
| **Context7** | `mcp-context7-wrapper.mjs` | Busca documentação atualizada de bibliotecas (React, Node, etc.) |
| **Filesystem** | `mcp-filesystem-wrapper.mjs` | Leitura/escrita de arquivos locais |
| **GitHub** | `mcp-github-wrapper.mjs` | Integração com repositório oficial (`https://github.com/ricardopalacio-Coop/OuvidoriaCoopedu`) |
| **Shadcn** | `mcp-shadcn-wrapper.mjs` | Acesso a componentes shadcn/ui v4 |
| **Supabase Postgres** | `mcp-supabase-postgres-wrapper.mjs` | Queries diretas no Supabase (não usado em produção) |

### Tools Disponíveis (Exemplos)

**Context7:**
```typescript
// Busca documentação de uma biblioteca
mcp_context7_resolve_library_id({ libraryName: "react-hook-form" })
mcp_context7_get_library_docs({ 
  context7CompatibleLibraryID: "/react-hook-form/react-hook-form",
  topic: "useForm validation"
})
```

**Filesystem:**
```typescript
// Lê múltiplos arquivos em paralelo
mcp_filesystem_read_multiple_files({ 
  paths: ["server/db.ts", "drizzle/schema.ts"] 
})

// Edita arquivo com substituição de linhas
mcp_filesystem_edit_file({
  path: "server/routers/tickets.ts",
  edits: [{ oldText: "...", newText: "..." }]
})
```

**Shadcn:**
```typescript
// Lista componentes disponíveis
mcp_shadcn_list_components()

// Obtém código de um componente
mcp_shadcn_get_component({ componentName: "dialog" })
```

### Fluxo de Dados MCP

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (Cursor)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Tool Call: mcp_context7_get_library_docs()       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Server (scripts/mcp-*.mjs)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Wrapper intercepta chamada                       │ │
│  │  Valida parâmetros                                │ │
│  │  Faz request para API externa (Context7, etc.)   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              External API (Context7, GitHub, etc.)       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Retorna documentação/dados                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 🗄️ Camada de Dados (Database Schema)

### MySQL (Core) - Port 3307

**Conexão:** Drizzle ORM (mysql2 driver)

**DATABASE_URL:** `mysql://root:root@localhost:3307/app_db`

#### Tabelas Principais

##### 1. Users & Authentication

```typescript
// users - Sincronizado de Supabase Auth
{
  id: int (PK, autoincrement),
  openId: varchar(64) UNIQUE NOT NULL, // Supabase user.id
  name: text,
  email: varchar(320) UNIQUE,
  loginMethod: varchar(64),
  role: enum("user", "admin", "gerente", "atendente"),
  isEmailVerified: boolean DEFAULT false,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastSignedIn: timestamp
}

// profiles - Dados estendidos do usuário
{
  id: int (PK),
  userId: int FK(users.id) CASCADE,
  fullName: varchar(255) NOT NULL,
  nickname: varchar(120),
  phone: varchar(32),
  avatarUrl: text, // Supabase Storage URL
  profileTypeId: int FK(user_profile_types.id),
  departmentId: int FK(departments.id),
  isActive: boolean DEFAULT true,
  isOnLeave: boolean DEFAULT false,
  leaveStartDate: date,
  leaveEndDate: date,
  passwordExpiresAt: timestamp
}

// user_profile_types - Tipos de perfil
{
  id: int (PK),
  name: varchar(100),
  description: text,
  role: enum("user", "admin", "gerente", "atendente")
}
```

##### 2. Departments

```typescript
{
  id: int (PK),
  name: varchar(100) NOT NULL,
  description: text,
  responsibleUserId: int FK(users.id),
  isActive: boolean DEFAULT true,
  createdAt: timestamp
}
```

##### 3. Cooperativa

```typescript
{
  id: int (PK),
  name: varchar(255) NOT NULL,
  cnpj: varchar(20) UNIQUE NOT NULL,
  email: varchar(255),
  phone: varchar(32),
  whatsapp: varchar(32),
  // Endereço completo
  street, addressNumber, neighborhood, complement,
  city, state, zipCode,
  logoUrl: text, // Supabase Storage
  createdAt, updatedAt
}

// cooperativa_business_hours - Horários de funcionamento
{
  id: int (PK),
  cooperativaId: int FK(cooperativas.id) CASCADE,
  weekday: int, // 0=Domingo, 6=Sábado
  openTime: varchar(5), // "08:00"
  closeTime: varchar(5), // "18:00"
  isClosed: boolean DEFAULT false
}

// cooperativa_holidays - Feriados
{
  id: int (PK),
  cooperativaId: int FK(cooperativas.id) CASCADE,
  date: date,
  name: varchar(255),
  isNational: boolean,
  isRecurring: boolean // Ex: Natal todos os anos
}
```

##### 4. ClienteS

```typescript
{
  id: int (PK),
  registrationNumber: bigint UNIQUE NOT NULL,
  name: varchar(255) NOT NULL,
  document: varchar(20) NOT NULL, // CPF
  birthDate: date,
  admissionDate: date,
  associationDate: date,
  terminationDate: date,
  position: varchar(255),
  status: enum("ativo", "inativo", "desligado"),
  contractId: int FK(contracts.id),
  email: varchar(255),
  whatsappNumber: varchar(20),
  secondaryPhone: varchar(20),
  // Endereço completo
  street, addressNumber, neighborhood, complement,
  city, state, zipCode,
  createdAt, updatedAt
}

// cliente_phones - Múltiplos telefones
{
  id: int (PK),
  ClienteId: int FK(ClienteS.id) CASCADE,
  phone: varchar(20) NOT NULL,
  phoneType: enum("principal", "secundario", "whatsapp"),
  isActive: boolean
}

// cliente_bank_data - Dados bancários
{
  id: int (PK),
  ClienteId: int FK(ClienteS.id) CASCADE,
  bankCode: varchar(10),
  bankName: varchar(255),
  accountType: enum("salario", "corrente", "poupanca"),
  agency: varchar(10),
  accountNumber: varchar(20),
  accountDigit: varchar(2),
  pixKey: varchar(255),
  isActive: boolean
}
```

##### 5. Contracts

```typescript
{
  id: int (PK),
  ClienteId: int FK(ClienteS.id),
  coordinatorClienteId: int FK(ClienteS.id) SET NULL,
  name: varchar(255) NOT NULL,
  city: varchar(100),
  state: varchar(2),
  status: enum("ativo", "inativo"),
  validityDate: date,
  isSpecial: boolean DEFAULT false, // Contrato padrão para tickets sem CLIENTE
  createdAt, updatedAt
}
```

##### 6. Tickets & Attendance

```typescript
// attendance_reasons - Motivos de atendimento (hierárquico)
{
  id: int (PK),
  parentId: int FK(attendance_reasons.id) NULLABLE, // Hierarquia
  name: varchar(255) NOT NULL,
  description: text,
  acronym: varchar(50),
  slaHours: int DEFAULT 48,
  color: varchar(32),
  departmentId: int FK(departments.id),
  isActive: boolean
}

// tickets - Chamados
{
  id: int (PK),
  protocol: varchar(20) UNIQUE NOT NULL, // "2025.001234"
  ClienteId: int FK(ClienteS.id),
  contractId: int FK(contracts.id) NOT NULL,
  reasonId: int FK(attendance_reasons.id) NOT NULL,
  status: enum(
    "aberto", "em_andamento", "aguardando_cliente",
    "aguardando_departamento", "resolvido", "fechado",
    "fechado_sem_interacao"
  ),
  priority: enum("baixa", "media", "alta", "urgente"),
  description: text NOT NULL,
  assignedTo: int FK(users.id),
  currentDepartmentId: int FK(departments.id) NOT NULL,
  slaDeadline: timestamp,
  lastInteractionAt: timestamp,
  openedAt: timestamp,
  closedAt: timestamp,
  createdAt, updatedAt
}

// ticket_messages - Mensagens do ticket
{
  id: int (PK),
  ticketId: int FK(tickets.id) CASCADE,
  senderType: enum("CLIENTE", "atendente", "sistema"),
  senderId: int FK(users.id) NULLABLE,
  message: text NOT NULL,
  mediaUrl: text, // Supabase Storage
  whatsappMessageId: varchar(255),
  isFromWhatsapp: boolean DEFAULT false,
  createdAt: timestamp
}

// ticket_history - Auditoria de alterações
{
  id: int (PK),
  ticketId: int FK(tickets.id) CASCADE,
  userId: int FK(users.id) NOT NULL,
  action: varchar(100) NOT NULL, // "status_changed", "assigned", etc.
  oldValue: text,
  newValue: text,
  comment: text,
  createdAt: timestamp
}

// ticket_time_tracking - Rastreamento de tempo
{
  id: int (PK),
  ticketId: int FK(tickets.id) CASCADE,
  departmentId: int FK(departments.id) NOT NULL,
  userId: int FK(users.id) NOT NULL,
  startedAt: timestamp,
  pausedAt: timestamp,
  resumedAt: timestamp,
  finishedAt: timestamp,
  totalSeconds: int DEFAULT 0
}
```

##### 7. Ticket Setup

```typescript
// ticket_statuses - Status customizáveis
{
  id: int (PK),
  name: varchar(255) UNIQUE NOT NULL,
  slaMinutes: int,
  color: varchar(32),
  isActive: boolean
}

// ticket_service_types - Tipos de serviço
{
  id: int (PK),
  name: varchar(255) UNIQUE NOT NULL,
  acronym: varchar(20),
  department: varchar(255),
  slaMinutes: int,
  color: varchar(32),
  isActive: boolean
}

// ticket_types - Tipos de ticket
{
  id: int (PK),
  name: varchar(255) UNIQUE NOT NULL,
  color: varchar(32),
  isDefault: boolean,
  isActive: boolean
}

// ticket_criticities - Criticidades
{
  id: int (PK),
  name: varchar(255) UNIQUE NOT NULL,
  slaMinutes: int,
  color: varchar(32),
  isDefault: boolean,
  isActive: boolean
}
```

##### 8. CSAT (Pesquisa de Satisfação)

```typescript
{
  id: int (PK),
  ticketId: int FK(tickets.id) CASCADE,
  ClienteId: int FK(ClienteS.id) NOT NULL,
  rating: int, // 1-5
  comment: text,
  sentAt: timestamp,
  expiresAt: timestamp,
  answeredAt: timestamp,
  status: enum("pending", "answered", "expired")
}
```

##### 9. WhatsApp

```typescript
{
  id: int (PK),
  sessionName: varchar(100) NOT NULL,
  phoneNumber: varchar(20),
  qrCode: text, // QR Code Base64 (modo QR)
  status: enum("disconnected", "qr_ready", "connected"),
  connectedAt: timestamp,
  disconnectedAt: timestamp,
  sessionData: json, // Config Cloud API ou QR session
  createdAt, updatedAt
}
```

##### 10. Email Setup

```typescript
// email_accounts - Contas de email
{
  id: int (PK),
  name: varchar(255) NOT NULL,
  email: varchar(320) UNIQUE NOT NULL,
  fromAddress: varchar(320),
  replyTo: varchar(320),
  signature: text,
  isDefault: boolean,
  status: enum("inactive", "testing", "active", "error"),
  departmentId: int FK(departments.id),
  reasonId: int FK(attendance_reasons.id),
  ticketTypeId: int FK(ticket_types.id),
  criticityId: int FK(ticket_criticities.id),
  defaultContractId: int FK(contracts.id),
  maxAttachmentMb: int DEFAULT 10,
  reopenClosedPolicy: enum("reopen", "bounce"),
  createdAt, updatedAt
}

// email_credentials - Credenciais (criptografadas)
{
  id: int (PK),
  accountId: int FK(email_accounts.id) CASCADE,
  protocol: enum("smtp", "imap", "pop3"),
  host: varchar(255),
  port: int,
  secure: enum("none", "starttls", "ssl"),
  authType: enum("password", "oauth"),
  username: varchar(255),
  passwordEncrypted: text, // AES-256-GCM
  oauthRefreshTokenEncrypted: text,
  oauthAccessTokenEncrypted: text,
  lastValidatedAt: timestamp,
  UNIQUE(accountId, protocol)
}

// email_events - Log de emails
{
  id: int (PK),
  accountId: int FK(email_accounts.id) CASCADE,
  direction: enum("inbound", "outbound"),
  status: enum("received", "sent", "failed", "skipped"),
  messageId: varchar(255),
  inReplyTo: varchar(255), // Para threading
  subject: varchar(500),
  ticketId: int FK(tickets.id) SET NULL,
  error: text
}

// email_attachments - Anexos
{
  id: int (PK),
  eventId: int FK(email_events.id) CASCADE,
  fileName: varchar(255),
  mimeType: varchar(255),
  sizeBytes: int,
  storageUrl: text // Supabase Storage URL
}
```

##### 11. Quick Messages

```typescript
{
  id: int (PK),
  title: varchar(100) NOT NULL,
  content: text NOT NULL,
  category: varchar(50),
  active: boolean DEFAULT true,
  createdAt, updatedAt
}
```

#### Relacionamentos Críticos

```
users ─1:N─→ profiles (userId)
users ─1:N─→ tickets (assignedTo)
departments ─1:N─→ tickets (currentDepartmentId)
departments ─1:N─→ profiles (departmentId)
ClienteS ─1:N─→ tickets (ClienteId)
ClienteS ─1:1─→ contracts (contractId)
ClienteS ─1:N─→ cliente_phones (ClienteId)
ClienteS ─1:N─→ cliente_bank_data (ClienteId)
contracts ─1:N─→ tickets (contractId)
attendance_reasons ─1:N─→ tickets (reasonId)
attendance_reasons ─1:N─→ attendance_reasons (parentId) // Self-reference
tickets ─1:N─→ ticket_messages (ticketId)
tickets ─1:N─→ ticket_history (ticketId)
tickets ─1:N─→ ticket_time_tracking (ticketId)
email_accounts ─1:N─→ email_credentials (accountId)
email_accounts ─1:N─→ email_events (accountId)
email_events ─1:N─→ email_attachments (eventId)
```

### Supabase (Auxiliar/Realtime)

**Função:** Autenticação + Storage + Realtime (futuro)

**URL:** `https://aedirlkgmglxotajdnqt.supabase.co`

#### Auth
- **Provider:** Email + Password (padrão)
- **Row Level Security (RLS):** Habilitado (gerenciado pelo Supabase)
- **Session:** Persistida no LocalStorage via SDK

#### Storage Buckets

| Bucket | Propósito | Acesso |
|--------|-----------|--------|
| `avatars` | Avatares de usuários | Public Read |
| `imagens` | Imagens da cooperativa (logos, etc.) | Public Read |
| `email_attachments` | Anexos de emails recebidos | Private (autenticado) |

#### Edge Functions
- **Status:** Não utilizado atualmente
- **Potencial:** Webhooks assíncronos, processamento de imagens

---

## 6. ⚙️ Setup e Execução

### Variáveis de Ambiente (.env)

**Arquivo de referência:** `VARIAVEIS_AMBIENTE.md`

**Variáveis Críticas:**

```bash
# ===== BANCO DE DADOS =====
DATABASE_URL="mysql://root:root@localhost:3307/app_db"

# ===== SUPABASE (AUTH + STORAGE) =====
VITE_SUPABASE_URL="https://aedirlkgmglxotajdnqt.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
SUPABASE_SERVICE_KEY="eyJhbGc..." # Backend only

# ===== SERVIDOR =====
PORT=3000
NODE_ENV=development # ou production

# ===== SEGURANÇA =====
JWT_SECRET="[gerar com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"]"

# ===== WHATSAPP CLOUD API =====
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_BUSINESS_ACCOUNT_ID="123456789"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxx"
WHATSAPP_VERIFY_TOKEN="[string aleatória segura]"
WHATSAPP_APP_SECRET="[app secret do Facebook]"
WHATSAPP_CRYPTO_KEY="[32+ caracteres para criptografia]"
WHATSAPP_GRAPH_API_VERSION="v20.0"
WHATSAPP_GRAPH_API_URL="https://graph.facebook.com"
WHATSAPP_WEBHOOK_URL="https://helpdeskcoopedu.zeabur.app/api/webhooks/whatsapp"
WHATSAPP_DEFAULT_COUNTRY_CODE="55"

# ===== WHATSAPP QR (ALTERNATIVA - DEV) =====
WHATSAPP_QR_ENABLED=false
WHATSAPP_QR_SESSION_NAME="helpdesk-coopedu-qr"
WHATSAPP_QR_HEADLESS=true

# ===== STORAGE =====
SUPABASE_STORAGE_BUCKET="avatars"
SUPABASE_STORAGE_BUCKET_COOPERATIVA="imagens"

# ===== DEPLOY =====
APP_BASE_URL="https://helpdeskcoopedu.zeabur.app"
```

### Comandos de Start (Windows)

**Instalação Inicial:**
```batch
REM install.bat ou install2.bat
pnpm install
docker compose up -d db
pnpm db:push
```

**Desenvolvimento Local:**
```batch
REM executar-local.bat
@echo off
echo ========================================
echo   HELP DESK COOPEDU - Execução Local
echo ========================================

REM 1. Subir MySQL no Docker
echo [1/4] Iniciando MySQL no Docker (Port 3307)...
docker compose up -d db

REM 2. Aguardar MySQL estar pronto
echo [2/4] Aguardando MySQL estar pronto...
timeout /t 5 /nobreak

REM 3. Aplicar schema (drizzle-kit push)
echo [3/4] Aplicando schema do banco de dados...
call pnpm db:push

REM 4. Iniciar servidor de desenvolvimento
echo [4/4] Iniciando servidor de desenvolvimento...
call pnpm dev

pause
```

**Produção (Build):**
```batch
pnpm build
set NODE_ENV=production
pnpm start
```

### Comandos de Start (Linux/macOS)

**Desenvolvimento:**
```bash
#!/bin/bash
# iniciar.sh
docker compose up -d db
sleep 5
pnpm db:push
pnpm dev
```

**Produção:**
```bash
pnpm build
NODE_ENV=production pnpm start
```

### Docker Compose

**Arquivo:** `docker-compose.yml`

```yaml
services:
  db:
    image: mysql:8.0
    container_name: mysql_local
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: app_db
    ports:
      - "3307:3306" # Expõe na porta 3307 local
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  app:
    build: .
    container_name: app_local
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=mysql://root:root@db:3306/app_db
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  mysql_data:
```

**Comandos Docker:**
```bash
# Subir apenas DB
docker compose up -d db

# Verificar status
docker ps

# Ver logs
docker logs mysql_local

# Parar serviços
docker compose down

# Rebuild app
docker compose build app
```

### Drizzle Kit (Schema Management)

**Workflow Correto:**
1. Editar `drizzle/schema.ts`
2. Executar `pnpm db:push` (aplica mudanças diretamente no DB)
3. **NÃO** usar migrations automáticas (desabilitado no código)

**Comandos:**
```bash
# Aplicar schema (⚠️ SOBRESCREVE estrutura existente)
pnpm db:push

# Verificar o que mudaria (dry-run)
pnpm db:push --dry-run

# Gerar migrations (NÃO usado, mas disponível)
pnpm drizzle-kit generate:mysql
```

**⚠️ ATENÇÃO:**
- `db:push` é destrutivo se não houver cuidado
- Sempre fazer backup antes de alterar schema em produção
- Em produção, preferir migrations manuais SQL validadas

---

## 7. 🧠 Memória de Contexto (Estado Atual)

### O que está Pronto ✅

1. **Autenticação Supabase:**
   - Login/Logout funcional
   - Sincronização Supabase Auth → MySQL
   - Proteção de rotas
   - Upload de avatares para Supabase Storage

2. **Dashboard:**
   - Métricas em tempo real (tickets, ClienteS, contratos)
   - Cards com estatísticas
   - Gráficos de performance
   - Lista de tickets recentes

3. **Gestão de ClienteS:**
   - CRUD completo
   - Validação de CPF
   - Busca de CEP (ViaCEP)
   - Importação/Exportação CSV
   - Múltiplos telefones
   - Dados bancários

4. **Gestão de Contratos:**
   - CRUD completo
   - Vínculo com ClienteS
   - Importação/Exportação CSV
   - Filtros avançados

5. **Gestão de Departamentos:**
   - CRUD completo
   - Atribuição de responsáveis
   - Vínculo com tickets

6. **Motivos de Atendimento:**
   - Estrutura hierárquica (parent/child)
   - SLA configurável por motivo
   - Vínculo com departamentos

7. **Sistema de Tickets:**
   - Criação/Edição/Visualização
   - Status e prioridades
   - Histórico de alterações
   - Mensagens internas
   - Atribuição a atendentes
   - Remanejamento entre departamentos
   - Geração automática de protocolo (formato: 2025.001234)

8. **Integração WhatsApp Cloud API:**
   - Webhook configurado e funcional
   - Recebimento de mensagens
   - Criação automática de tickets
   - Envio de mensagens
   - Validação de assinatura HMAC
   - Persistência de configuração no DB

9. **Integração WhatsApp QR (Alternativa):**
   - Sessão via whatsapp-web.js
   - QR Code gerado automaticamente
   - Persistência de sessão

10. **Integração Email:**
    - SMTP configurado (envio)
    - IMAP configurado (recebimento via polling)
    - POP3 suportado
    - Criptografia de credenciais (AES-256-GCM)
    - Testes de conexão automatizados
    - Attachments salvos em Supabase Storage
    - Criação automática de tickets por email

11. **Mensagens Rápidas:**
    - CRUD completo
    - Categorias
    - Ativas/Inativas

12. **Configurações:**
    - Setup de Tickets (statuses, types, criticities)
    - Setup de WhatsApp
    - Setup de Emails
    - Importações CSV
    - Usuários e Perfis

### O que está em Desenvolvimento 🚧

1. **Sistema de Notificações:**
   - Push notifications (browser)
   - Email notifications
   - WhatsApp notifications

2. **Relatórios e Dashboards:**
   - Gráficos avançados (performance por atendente)
   - Exportação de relatórios em PDF
   - Análise de SLA

3. **CSAT (Pesquisa de Satisfação):**
   - Envio automático após fechamento de ticket
   - Coleta de feedback
   - Dashboard de satisfação

4. **Inteligência Artificial:**
   - Chatbot para atendimento inicial
   - Classificação automática de tickets
   - Sugestão de respostas rápidas

5. **Otimizações de Performance:**
   - Caching com Redis
   - Background jobs com Bull Queue
   - Indexação full-text search (MySQL)

### Dívida Técnica ⚠️

1. **Tickets.tsx (972 linhas):**
   - Componente muito grande
   - Precisa ser quebrado em subcomponentes
   - Lógica de negócio misturada com UI

2. **server/db.ts (2737 linhas):**
   - Arquivo muito grande
   - Considerar quebrar em módulos (db/users.ts, db/tickets.ts, etc.)

3. **Testes:**
   - Cobertura de testes muito baixa
   - Apenas 2 testes existentes (`auth.logout.test.ts`, `normalization.test.ts`)
   - Precisa adicionar testes unitários e de integração

4. **Error Handling:**
   - Alguns endpoints não tratam erros adequadamente
   - Falta error boundaries em alguns componentes React

5. **Documentação:**
   - JSDoc incompleto em funções complexas
   - Falta documentação de APIs (Swagger/OpenAPI)

6. **Migrations:**
   - Sistema de migrations automáticas desabilitado
   - Dependência total de `drizzle-kit push` (perigoso em produção)

---

## 8. 🚀 Workflow de Desenvolvimento (Como Agir)

### Regras de Ouro

1. **SEMPRE leia antes de escrever:**
   - Consulte `AI_RULES.md` e `GoodPractice.md`
   - Leia `drizzle/schema.ts` para entender estrutura de dados
   - Leia arquivo relevante antes de editar

2. **NUNCA confie em memória:**
   - Use `read_file` para arquivos grandes
   - Use `codebase_search` para encontrar código por contexto
   - Use `grep` para buscar strings exatas

3. **SEMPRE valide:**
   - Verifique linter após edições (`read_lints`)
   - Teste localmente antes de commit
   - Use TypeScript para validação em tempo de compilação

### Fluxo Padrão de Feature

```
┌─────────────────────────────────────────────────────────┐
│ 1. ANÁLISE                                              │
│  • Leia AI_RULES.md e GoodPractice.md                   │
│  • Leia schema.ts se envolve DB                         │
│  • Busque código similar no projeto                     │
│  • Identifique dependências e impactos                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 2. PLANEJAMENTO                                         │
│  • Descreva o passo a passo da solução                  │
│  • Identifique arquivos que precisam ser editados      │
│  • Liste variáveis de ambiente necessárias             │
│  • Defina testes que precisam ser criados              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 3. EXECUÇÃO                                             │
│  • Edite schema.ts (se necessário)                      │
│  • Execute pnpm db:push                                 │
│  • Crie/edite funções em server/db.ts                   │
│  • Crie/edite router em server/routers/                │
│  • Crie/edite página em client/src/pages/              │
│  • Crie/edite componentes em client/src/components/    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 4. REVISÃO                                              │
│  • Execute read_lints nos arquivos editados             │
│  • Corrija erros de lint/TypeScript                     │
│  • Verifique se quebrou algo existente                  │
│  • Teste manualmente no navegador                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 5. DOCUMENTAÇÃO                                         │
│  • Adicione JSDoc em funções complexas                  │
│  • Atualize README se necessário                        │
│  • Adicione comentários explicativos                    │
└─────────────────────────────────────────────────────────┘
```

### Exemplos de Tarefas Comuns

#### Adicionar Campo em Tabela

```typescript
// 1. Editar drizzle/schema.ts
export const ClienteS = mysqlTable("ClienteS", {
  // ... campos existentes ...
  novoCampo: varchar("novoCampo", { length: 255 }), // ← ADICIONAR
});

// 2. Executar
pnpm db:push

// 3. Atualizar funções em server/db.ts (se necessário)
export async function updateCliente(id: number, data: Partial<InsertCliente>) {
  const client = await getDb();
  if (!client) throw new Error("Database not connected");
  
  await client
    .update(ClienteS)
    .set(data) // Já inclui novoCampo automaticamente (type-safe)
    .where(eq(ClienteS.id, id));
}

// 4. Atualizar frontend (se necessário)
// client/src/pages/ClienteS.tsx
<Input 
  label="Novo Campo" 
  value={formData.novoC ampo} 
  onChange={(e) => setFormData({ ...formData, novoCampo: e.target.value })}
/>
```

#### Criar Novo Endpoint tRPC

```typescript
// 1. Editar server/routers/ClienteS.ts
export const ClienteSRouter = router({
  // ... procedures existentes ...
  
  // ← ADICIONAR
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      return await getClienteByEmail(input.email);
    }),
});

// 2. Adicionar função em server/db.ts
export async function getClienteByEmail(email: string) {
  const client = await getDb();
  if (!client) return null;
  
  const result = await client
    .select()
    .from(ClienteS)
    .where(eq(ClienteS.email, email))
    .limit(1);
    
  return result[0] ?? null;
}

// 3. Usar no frontend
// client/src/pages/SomePage.tsx
const { data: CLIENTE, isLoading } = trpc.ClienteS.getByEmail.useQuery({
  email: "exemplo@email.com",
});
```

#### Adicionar Validação de Negócio

```typescript
// server/routers/tickets.ts
create: publicProcedure
  .input(z.object({
    ClienteId: z.number().nullable(),
    contractId: z.number(),
    reasonId: z.number(),
    description: z.string().min(10),
    priority: z.enum(["baixa", "media", "alta", "urgente"]),
  }))
  .mutation(async ({ input, ctx }) => {
    // ← ADICIONAR VALIDAÇÕES
    
    // 1. Verificar se usuário está autenticado
    if (!ctx.user) {
      throw new Error("Não autorizado");
    }
    
    // 2. Verificar se contrato existe e está ativo
    const contract = await getContractById(input.contractId);
    if (!contract || contract.status !== "ativo") {
      throw new Error("Contrato inválido ou inativo");
    }
    
    // 3. Verificar se motivo existe e está ativo
    const reason = await getAttendanceReasonById(input.reasonId);
    if (!reason || !reason.isActive) {
      throw new Error("Motivo de atendimento inválido");
    }
    
    // 4. Criar ticket
    return await createTicket({
      ...input,
      assignedTo: ctx.user.id,
      currentDepartmentId: reason.departmentId!,
      status: "aberto",
    });
  }),
```

### Debugging

**Backend (Node.js):**
```bash
# Logs estruturados (usar logger.info/error)
[2025-01-18 10:30:45] INFO [WhatsApp] Mensagem recebida { from: "+5511999999999", waId: "5511999999999" }
[2025-01-18 10:30:46] ERROR [Database] Failed to create ticket { error: "ER_NO_REFERENCED_ROW" }
```

**Frontend (React):**
```typescript
// React Query DevTools (habilitado em dev)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Database (MySQL):**
```bash
# Conectar no container
docker exec -it mysql_local mysql -u root -p
# Senha: root

# Queries úteis
USE app_db;
SHOW TABLES;
DESCRIBE tickets;
SELECT * FROM tickets WHERE status='aberto' LIMIT 10;
```

---

## 9. 🔗 Integrações Externas

### WhatsApp Cloud API (Meta)

**Documentação:** https://developers.facebook.com/docs/whatsapp/cloud-api

**Setup:**
1. Criar app no Facebook Developers
2. Ativar WhatsApp Business API
3. Obter Phone Number ID, Access Token, App Secret
4. Configurar Webhook URL (deve ser HTTPS)
5. Definir Verify Token (string aleatória)
6. Subscrever eventos: `messages`

**Fluxo de Webhook:**
```
Meta Servers → POST /api/webhooks/whatsapp
                      │
                      ├─ Validação de Assinatura HMAC
                      ├─ Extração de mensagem + contato
                      ├─ Busca CLIENTE por telefone
                      ├─ Cria/Atualiza ticket
                      └─ Responde com status 200
```

**Rate Limits:**
- 80 mensagens/segundo (tier padrão)
- 1000 mensagens/dia (tier gratuito)

### Supabase

**Documentação:** https://supabase.com/docs

**Serviços Utilizados:**

1. **Auth:**
   - Email + Password (padrão)
   - Magic Link (opcional)
   - OAuth (Google, GitHub) - configurável

2. **Storage:**
   - Buckets: `avatars`, `imagens`, `email_attachments`
   - Upload: Via SDK ou API REST
   - Download: URLs públicas (signed URLs para private)

3. **Database (Postgres):**
   - **NÃO USADO** como DB principal
   - Usado apenas para Auth tables (gerenciado pelo Supabase)

**Credenciais:**
- URL: `VITE_SUPABASE_URL`
- Publishable Key: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Service Role Key: `SUPABASE_SERVICE_KEY` (backend only)

### ViaCEP (Busca de Endereço)

**API:** https://viacep.com.br/

**Uso:**
```typescript
// client/src/pages/ClienteS.tsx
const fetchAddress = async (zipCode: string) => {
  const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
  const data = await response.json();
  
  if (data.erro) {
    throw new Error("CEP não encontrado");
  }
  
  setFormData({
    ...formData,
    street: data.logradouro,
    neighborhood: data.bairro,
    city: data.localidade,
    state: data.uf,
  });
};
```

**Rate Limit:** Não documentado oficialmente, mas recomendado não exceder 300 requisições/minuto

### Email Providers (SMTP/IMAP)

**Testados:**
- Gmail (requer App Password se 2FA ativo)
- Outlook/Hotmail
- Office 365
- Zoho Mail
- Provedores SMTP genéricos

**Configuração SMTP:**
```
Host: smtp.gmail.com
Port: 587 (STARTTLS) ou 465 (SSL)
Secure: starttls ou ssl
Username: seu-email@gmail.com
Password: [app password]
```

**Configuração IMAP:**
```
Host: imap.gmail.com
Port: 993
Secure: ssl
```

---

## 10. 🚀 Deploy e Produção

### Zeabur (Produção Atual)

**URL:** https://helpdeskcoopedu.zeabur.app

**Serviços:**
- **App (Node.js):** Servidor Express + Frontend estático
- **MySQL:** Banco de dados gerenciado

**Configuração:**
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente (todas de `.env`)
3. Definir comando de build: `pnpm build`
4. Definir comando de start: `pnpm start`
5. Expor porta: `8080`

**Dockerfile:**
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar package files
COPY package.json pnpm-lock.yaml ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código
COPY . .

# Build frontend + backend
RUN pnpm build

# Expor porta
EXPOSE 8080

# Variável de ambiente para produção
ENV NODE_ENV=production

# Start
CMD ["pnpm", "start"]
```

**⚠️ ATENÇÃO Produção:**
- Nunca commitar `.env` com credenciais reais
- Usar `SUPABASE_SERVICE_KEY` apenas no backend
- Validar certificado SSL do MySQL
- Habilitar logs estruturados (JSON)
- Configurar healthchecks
- Habilitar auto-restart em caso de crash

### Docker Local (Desenvolvimento)

**Uso:**
```bash
# Build imagem
docker compose build app

# Subir serviços (DB + App)
docker compose up -d

# Ver logs
docker logs -f app_local

# Parar serviços
docker compose down
```

### CI/CD (Futuro)

**Pipeline Sugerido (GitHub Actions):**
1. Lint & TypeCheck (`pnpm check`)
2. Run Tests (`pnpm test`)
3. Build (`pnpm build`)
4. Deploy to Zeabur (auto-deploy on push to `main`)

---

## 🎓 Conclusão

Este documento é o **cérebro** do projeto Ouvidoria Coopedu. Toda vez que uma nova instância de IA assumir o desenvolvimento, este arquivo deve ser a **primeira leitura**.

### Checklist para Novo Agente

- [ ] Li `AI_RULES.md` e `GoodPractice.md`
- [ ] Entendi a estrutura de `drizzle/schema.ts`
- [ ] Conheço os routers tRPC disponíveis
- [ ] Sei como funciona a autenticação Supabase → MySQL
- [ ] Entendo o fluxo de WhatsApp Cloud API
- [ ] Entendo o fluxo de Email (SMTP/IMAP)
- [ ] Sei executar `pnpm db:push` para aplicar schema
- [ ] Sei usar `logger` ao invés de `console.log`
- [ ] Sei que **NUNCA** devo usar `any` em TypeScript
- [ ] Sei que **NUNCA** devo criar arquivos `.sql` manualmente

### Comando de Emergência

Se algo quebrar e você não souber o motivo:

```bash
# 1. Verificar logs do servidor
docker logs mysql_local

# 2. Verificar schema do banco
pnpm db:push --dry-run

# 3. Verificar erros de lint
pnpm check

# 4. Resetar banco de dados (⚠️ APAGA TUDO)
docker compose down -v
docker compose up -d db
pnpm db:push
```

---

**Desenvolvido com ❤️ para Coopedu**  
**Última atualização:** 2025-01-18  
**Versão do Documento:** 1.0.0



