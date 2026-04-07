# 📋 Product Requirements Document (PRD)

# Sistema Helpdesk Coopedu - TestSprite Testing Guide

## 1. Visão Geral do Projeto

O **Sistema Helpdesk Coopedu** é um sistema completo de gestão de atendimentos e tickets desenvolvido para uma cooperativa educacional. O sistema oferece controle centralizado de tickets, gestão de ClienteS e contratos, integração com WhatsApp (QR Code e Cloud API) e ferramentas administrativas.

### Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js (Express) + tRPC 11
- **Database:** MySQL 8.0 (porta 3307 via Docker local, 3306 em produção)
- **ORM:** Drizzle ORM
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **WhatsApp:** whatsapp-web.js (QR) + Meta Cloud API

---

## 2. Estrutura da Aplicação

### 2.1 Backend (Express + tRPC)

**URL Base Local:** `http://localhost:3000`
**Endpoint tRPC:** `/api/trpc`

#### Routers Principais:

| Router          | Descrição                | Arquivo                           |
| --------------- | ------------------------ | --------------------------------- |
| `ClienteS`    | CRUD de ClienteS       | `server/routers/ClienteS.ts`    |
| `contracts`     | CRUD de contratos        | `server/routers/contracts.ts`     |
| `departments`   | CRUD de departamentos    | `server/routers/departments.ts`   |
| `tickets`       | CRUD e gestão de tickets | `server/routers/tickets.ts`       |
| `whatsapp`      | Integração WhatsApp      | `server/routers/whatsapp.ts`      |
| `users`         | Gestão de usuários       | `server/routers/users.ts`         |
| `quickMessages` | Mensagens automáticas    | `server/routers/quickMessages.ts` |
| `reports`       | Relatórios e rankings    | `server/routers/reports.ts`       |
| `dashboard`     | Métricas do dashboard    | `server/routers/dashboard.ts`     |

### 2.2 Frontend (React + Wouter)

**Páginas Principais:**
| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | `Home.tsx` | Dashboard principal |
| `/tickets` | `Tickets.tsx` | Gestão de tickets |
| `/ClienteS` | `ClienteS.tsx` | Cadastro de ClienteS |
| `/contratos` | `Contratos.tsx` | Gestão de contratos |
| `/departamentos` | `Departamentos.tsx` | Departamentos |
| `/whatsapp` | `WhatsApp.tsx` | Painel WhatsApp |
| `/usuarios` | `Usuarios.tsx` | Gestão de usuários |
| `/empresa` | `Empresa.tsx` | Configurações da empresa |

---

## 3. Cenários de Teste Prioritários

### 3.1 Autenticação (Crítico)

**Descrição:** Sistema usa Supabase Auth com proteção de rotas
**Fluxos:**

1. Login com credenciais válidas
2. Redirecionamento para /login quando não autenticado
3. Logout e limpeza de sessão
4. Refresh token automático

### 3.2 Tickets (Core Business)

**Descrição:** Módulo central do sistema
**Fluxos:**

1. Criar novo ticket com CLIENTE vinculado
2. Alterar status do ticket (aberto → em atendimento → fechado)
3. Enviar mensagem no chat do ticket
4. Filtrar tickets por status, departamento, período
5. Exportar tickets para CSV/XLS
6. Visualização Kanban por status

**Regras de Negócio:**

- Ticket deve ter contrato vinculado
- Ticket fechado não aceita novas mensagens
- Tempo de SLA calculado automaticamente

### 3.3 ClienteS (CRUD)

**Descrição:** Cadastro de ClienteS (clientes)
**Fluxos:**

1. Criar CLIENTE com dados obrigatórios (nome, CPF, telefone)
2. Validação de CPF único
3. Vincular CLIENTE a contrato
4. Editar dados bancários
5. Buscar CLIENTE por nome/CPF/matrícula
6. Importar ClienteS via CSV

**Validações:**

- CPF formato válido e único
- Telefone formato brasileiro
- Email formato válido

### 3.4 Contratos (CRUD)

**Descrição:** Contratos de serviço
**Fluxos:**

1. Criar contrato com dados da instituição
2. Vincular contrato a coordenador
3. Listar contratos ativos/inativos
4. Editar contrato existente

### 3.5 WhatsApp Integration

**Descrição:** Integração com WhatsApp (QR e Cloud API)
**Fluxos:**

1. Conectar via QR Code
2. Receber mensagem e criar ticket automaticamente
3. Enviar mensagem de texto simples
4. Enviar mídia (imagem, documento, áudio)
5. Verificar status da conexão

### 3.6 Relatórios e Dashboard

**Descrição:** Visualização de métricas
**Fluxos:**

1. Visualizar métricas do dashboard (tickets por status)
2. Gerar relatório diário/semanal/mensal
3. Exportar relatório em PDF
4. Visualizar rankings de atendimento

---

## 4. Entidades do Banco de Dados

### Schema Principal (Drizzle)

```
ClienteS: id, name, cpf, phone, email, registrationNumber, contractId, ...
contracts: id, name, city, state, coordinatorId, active, ...
tickets: id, externalNumber, ClienteId, contractId, departmentId, status, channel, ...
messages: id, ticketId, content, sender, type, ...
users: id, name, email, role, departmentId, ...
departments: id, name, description, ...
```

---

## 5. Variáveis de Ambiente Necessárias

```env
DATABASE_URL=mysql://root:root@localhost:3307/app_db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
APP_BASE_URL=http://localhost:3000
```

---

## 6. Comandos de Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar banco de dados (Docker)
docker compose up -d db

# Aplicar schema do banco
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev

# Rodar testes existentes (Vitest)
pnpm test

# Build de produção
pnpm build
```

---

## 7. Casos de Borda e Edge Cases

### Tickets

- Criar ticket sem CLIENTE vinculado (deve usar fallback)
- Reabrir ticket fechado
- Ticket com canal de email vs WhatsApp (comportamentos diferentes)

### ClienteS

- CPF duplicado (deve rejeitar)
- Telefone duplicado (alerta, não bloqueia)
- CLIENTE sem contrato (validação obrigatória)

### WhatsApp

- Enviar mensagem sem conexão (deve enfileirar ou falhar graciosamente)
- Receber mensagem de número desconhecido (criar ticket órfão)
- Timeout de resposta da API

---

## 8. Endpoints de Teste Recomendados

### Health Checks

- `GET /api/health` - Status do servidor
- `GET /api/trpc/whatsapp.getStatus` - Status WhatsApp

### Core Operations (tRPC)

- `tickets.getAll` - Listar tickets
- `tickets.create` - Criar ticket
- `ClienteS.search` - Buscar ClienteS
- `contracts.getAll` - Listar contratos

---

## 9. Notas para TestSprite

1. **Ambiente Local:** O projeto requer Docker para o MySQL (porta 3307)
2. **Autenticação:** Algumas rotas requerem token JWT
3. **WhatsApp:** Testes de WhatsApp podem ser skippados se não houver conexão
4. **Rate Limiting:** Não há rate limiting no ambiente de desenvolvimento
5. **Timezone:** Sistema usa timezone America/Sao_Paulo (UTC-3)


