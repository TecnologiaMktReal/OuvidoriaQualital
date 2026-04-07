# Plano de Melhorias de Desempenho e Segurança - Help Desk Coopedu

Este documento detalha as oportunidades identificadas para otimização do sistema, visando escalabilidade, estabilidade e segurança.

---

## 🏗️ 1. Arquitetura e Banco de Dados (Backend)

### 1.1 Otimização de Queries e Índices (MySQL)

- **Problema:** Tabelas como `tickets` e `audit_logs` tendem a crescer exponencialmente. Consultas de Dashboard utilizam `CONVERT_TZ` e filtros complexos que podem causar scans de tabela completa.
- **Melhoria:**
  - Implementar índices compostos: `(ClienteId, status)`, `(contractId, openedAt)`.
  - Evitar funções no lado esquerdo do `WHERE` (como `CONVERT_TZ` em colunas indexadas). Preferível converter o valor de input uma única vez.
- **Impacto:** Redução drástica no tempo de carregamento do dashboard e listagens.

### 1.2 Refatoração do `server/db.ts`

- **Problema:** O arquivo central de banco de dados possui mais de 5.000 linhas, dificultando a manutenção, testes e aumentando o tempo de compilação.
- **Melhoria:** Modularizar o acesso a dados em arquivos específicos dentro de `server/db/` (ex: `tickets.ts`, `users.ts`, `contracts.ts`).
- **Impacto:** Melhor manutenibilidade e isolamento de lógica.

### 1.3 Processamento de Relatórios PDF (Assíncrono)

- **Problema:** O uso do Puppeteer dentro da rota tRPC bloqueia recursos do Node.js e é suscetível a picos de memória (Memory Spikes).
- **Melhoria:** Mover a geração de PDFs para um **Worker Thread** ou fila de processamento (BullMQ).
- **Impacto:** Maior resiliência do servidor sob carga.

---

## 💻 2. Frontend e Experiência do Usuário (React)

### 2.1 Virtualização de Tabelas

- **Problema:** Listagens de Tickets e ClienteS carregam centenas de linhas no DOM, causando lag no scroll e alto consumo de memória no browser.
- **Melhoria:** Implementar `react-window` ou similar para renderizar apenas os elementos visíveis.
- **Impacto:** Experiência fluida independente do volume de dados carregado.

### 2.2 Cache de Estado Global (TanStack Query)

- **Problema:** Algumas métricas do Dashboard são recalculadas com frequência desnecessária.
- **Melhoria:** Ajustar `staleTime` e `cacheTime` para métricas que não mudam em tempo real (ex: rankings mensais).
- **Impacto:** Menos requisições ao servidor.

---

## 🔐 3. Segurança e Compliance

### 3.1 Rate Limiting e Prevenção de DoS

- **Problema:** Não foi identificado um limitador de requisições agressivo nas rotas de API.
- **Melhoria:** Implementar `express-rate-limit` especialmente nas rotas de autenticação e geração de relatórios.
- **Impacto:** Proteção contra ataques de força bruta e exaustão de recursos.

### 3.2 Política de Retenção de Dados (Audit Logs)

- **Problema:** Logs de auditoria crescem sem controle, ocupando espaço em disco e degradando performance.
- **Melhoria:** Implementar script automático de limpeza ou arquivamento de logs com mais de 365 dias (compliance LGPD).
- **Impacto:** Performance sustentável a longo prazo.

---

## 📅 Chronograma de Execução (Sugestão)

1.  **Fase 1 (Estabilidade):** Otimização de Índices e Rate Limiting.
2.  **Fase 2 (Refatoração):** Modularização do `db.ts` e Background Jobs para PDF.
3.  **Fase 3 (UX):** Virtualização de tabelas e Otimização de Cache.


