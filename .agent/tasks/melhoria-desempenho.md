# Task: Otimização de Desempenho e Segurança do Help Desk Qualital

**Status:** 🏗️ Em Planejamento
**Prioridade:** Alta
**Agente Responsável:** `@backend-specialist`
**Data:** 2026-01-29

## 📋 Descrição do Problema

O sistema apresenta gargalos potenciais de desempenho devido ao crescimento do volume de dados e arquivos de lógica centralizados e extensos. A geração de relatórios PDF é síncrona e consome memória excessiva, e o banco de dados carece de índices otimizados para consultas complexas no dashboard.

## 🎯 Objetivos

1. Melhorar o tempo de resposta do dashboard e listagens em 50%.
2. Aumentar a resiliência do servidor durante a geração de relatórios.
3. Modularizar o código do backend para facilitar a manutenção.
4. Reforçar a segurança contra ataques de negação de serviço e força bruta.

## 🛠️ Plano de Implementação

### Fase 1: Otimização de Banco de Dados

- [ ] Adicionar índices compostos e de busca à tabela `tickets` (Drizzle Schema).
- [ ] Adicionar índices de busca à tabela `ClienteS`.
- [ ] Criar e aplicar migrações Drizzle.

### Fase 2: Segurança (API)

- [ ] Implementar `express-rate-limit` no servidor Express.
- [ ] Configurar limites específicos para rotas sensíveis (Auth, Reports).

### Fase 3: Refatoração de Arquitetura

- [ ] Dividir `server/db.ts` em módulos menores:
  - `server/db/tickets.ts`
  - `server/db/users.ts`
  - `server/db/ClienteS.ts`
  - `server/db/management.ts` (Contracts, Departments, etc.)
- [ ] Atualizar todos os imports no projeto.

### Fase 4: Otimização de Processamento (Relatórios)

- [ ] Implementar processamento assíncrono para PDFs.
- [ ] Otimizar queries de métricas do dashboard removendo redundâncias.

## 🧪 Plano de Testes

- [ ] **Load Testing:** Comparar tempos de resposta do Dashboard antes e depois dos índices.
- [ ] **Security Test:** Validar que o Rate Limiting bloqueia excesso de requisições.
- [ ] **Unit Tests:** Garantir que todas as funções refatoradas de `db.ts` continuam funcionando (via `npm test`).

## 🔗 Referências

- `melhorias_desempenho.md` (Plano detalhado)
- `server/db.ts` (Fonte principal de lógica)
- `drizzle/schema.ts` (Estrutura do banco)


