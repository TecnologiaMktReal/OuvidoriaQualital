# Sistema Helpdesk Coopedu - TODO

## Banco de Dados e Schema
- [x] Adaptar schema do banco de dados para Drizzle ORM (MySQL)
- [x] Criar tabela profiles com campos de férias e expiração de senha
- [x] Criar tabela departments com responsável
- [x] Criar tabela ClienteS com matrícula, dados trabalhistas e status
- [x] Criar tabela cliente_phones para múltiplos telefones
- [x] Criar tabela cliente_bank_data para dados bancários
- [x] Criar tabela contracts com data de validade
- [x] Criar tabela attendance_reasons com hierarquia e SLA
- [x] Criar tabela tickets com todos os status incluindo aguardando_departamento
- [x] Criar tabela ticket_messages para mensagens e WhatsApp
- [x] Criar tabela ticket_history para auditoria
- [x] Criar tabela ticket_time_tracking para controle de tempo
- [x] Criar tabela csat_surveys para pesquisas de satisfação
- [x] Criar tabela whatsapp_sessions para gerenciar conexão WhatsApp
- [x] Executar migrations e popular dados iniciais

## API Backend (tRPC)
- [ ] Implementar rotas de gestão de perfis de usuários
- [x] Implementar rotas de gestão de departamentos
- [x] Implementar rotas CRUD de ClienteS
- [x] Implementar rotas de gestão de telefones de ClienteS
- [x] Implementar rotas de gestão de dados bancários
- [x] Implementar rotas CRUD de contratos
- [x] Implementar rotas de motivos de atendimento hierárquicos
- [x] Implementar rotas de criação e gestão de tickets
- [x] Implementar rotas de mensagens de tickets
- [x] Implementar rotas de histórico de tickets
- [x] Implementar rotas de controle de tempo e SLA
- [x] Implementar rotas de remanejamento por departamento
- [ ] Implementar rotas de pesquisas CSAT
- [ ] Implementar dashboard com métricas agregadas

## Integração WhatsApp
- [x] Instalar e configurar whatsapp-web.js
- [x] Implementar geração e exibição de QR Code
- [x] Implementar recebimento de mensagens via WhatsApp
- [x] Implementar envio de mensagens via WhatsApp
- [x] Implementar criação automática de tickets a partir de mensagens
- [x] Implementar vinculação de número ao CLIENTE existente
- [ ] Implementar envio automático de pesquisa CSAT via WhatsApp
- [x] Implementar persistência de sessão WhatsApp

## Frontend (React + TailwindCSS)
- [x] Configurar tema e cores do sistema
- [x] Implementar DashboardLayout com sidebar
- [x] Criar página de login e autenticação (via Manus OAuth)
- [x] Criar página inicial com visão geral
- [x] Criar página de gestão de ClienteS
- [x] Criar página de gestão de contratos
- [ ] Criar página de gestão de departamentos
- [ ] Criar página de gestão de usuários
- [x] Criar página de listagem de tickets
- [ ] Criar página de detalhes do ticket com mensagens
- [ ] Criar componente de chat integrado com WhatsApp
- [ ] Criar página de motivos de atendimento
- [ ] Criar dashboard com gráficos e métricas
- [x] Criar página de configuração do WhatsApp com QR Code
- [ ] Implementar alertas visuais de SLA próximo ao vencimento
- [ ] Criar página de relatórios e histórico

## Funcionalidades de Negócio
- [ ] Implementar RBAC com perfis Administrador, Gerente e Atendente
- [ ] Implementar Row Level Security nas queries
- [ ] Implementar geração automática de protocolo de ticket
- [ ] Implementar cálculo automático de SLA por motivo
- [ ] Implementar cronômetro de tempo trabalhado com pausas
- [ ] Implementar fechamento automático por inatividade (3h)
- [ ] Implementar expiração de pesquisa CSAT (3h)
- [ ] Implementar triggers de atualização de tempo
- [ ] Implementar notificações de SLA próximo ao vencimento
- [ ] Implementar histórico completo de ações nos tickets

## Testes e Documentação
- [ ] Escrever testes vitest para rotas de ClienteS
- [ ] Escrever testes vitest para rotas de tickets
- [ ] Escrever testes vitest para integração WhatsApp
- [ ] Escrever testes vitest para CSAT
- [ ] Documentar APIs tRPC
- [ ] Documentar fluxo de integração WhatsApp
- [ ] Documentar regras de negócio e SLA
- [ ] Criar guia de uso do sistema

## Deploy e Finalização
- [ ] Validar todas as funcionalidades
- [ ] Criar checkpoint final
- [ ] Preparar documentação de entrega

## Importação de Dados
- [x] Criar página de Configurações com importadores CSV
- [x] Implementar importador de ClienteS via CSV
- [x] Implementar importador de Contratos via CSV
- [x] Criar modelos CSV de exemplo para download
- [x] Adicionar validação de dados importados
- [x] Exibir relatório de importação (sucessos e erros)

## Identidade Visual
- [x] Atualizar paleta de cores conforme padrão fornecido
- [x] Adicionar logo da Coopedu no sistema
- [x] Ajustar tema do sistema com novas cores

## Modernização Visual
- [x] Ajustar logo para azul padrão Coopedu
- [x] Melhorar design da sidebar com gradientes e sombras
- [x] Adicionar animações e transições suaves
- [x] Modernizar cards do dashboard com efeitos visuais
- [x] Melhorar tipografia e espaçamentos

## Melhorias no Menu Lateral
- [x] Corrigir texto quebrado "Helpdesk" na logo
- [x] Adicionar botão para encolher/expandir sidebar
- [x] Implementar estado colapsado do menu (apenas ícones)
- [x] Adicionar animação suave de transição

## Ajuste de Layout
- [x] Reorganizar header da sidebar com logo acima e texto "Helpdesk" abaixo

## Reorganização Menu WhatsApp
- [x] Mover item WhatsApp atual para dentro de Configurações como "Integrar WhatsApp"
- [x] Criar novo menu "WhatsApp" abaixo de "Tickets"
- [x] Desenvolver tela estilo WhatsApp Web para comunicação
- [x] Implementar lista de conversas/contatos
- [x] Implementar área de chat com mensagens
- [ ] Integrar com backend WhatsApp existente

## Melhorias WhatsApp Chat
- [x] Tornar interface WhatsApp responsiva até o menu
- [x] Adicionar botão de gravar áudio (UI pronto, backend pendente)
- [ ] Implementar gravação e envio de áudio real
- [ ] Adicionar função de reproduzir áudio recebido
- [x] Criar seção de mensagens rápidas nas Configurações
- [x] Adicionar botão de mensagens rápidas no chat WhatsApp
- [x] Implementar seleção e envio de mensagens rápidas

## Atualização de Logo e Favicon
- [x] Baixar favicon da Coopedu
- [x] Trocar logo para favicon quando menu estiver recolhido
- [x] Atualizar favicon da página no HTML

## Pacote para Execução Local
- [x] Criar arquivo .env.local com configurações
- [x] Criar script de instalação (install.bat/install.sh)
- [x] Criar script de execução (start.bat/start.sh)
- [x] Criar README com instruções
- [x] Gerar arquivo ZIP com todos os arquivos

## Melhorias no Cadastro de Contratos
- [x] Adicionar campos cidade e UF ao schema de contratos
- [x] Criar constante com lista de UFs do Brasil
- [x] Atualizar API de contratos para incluir cidade e UF
- [x] Atualizar interface com combobox de UF
- [x] Implementar auto-preenchimento do nome do contrato com nome da cidade
- [x] Tornar campos obrigatórios (nome, cidade, UF)
- [x] Executar migrations do banco de dados

## Ajuste no Cadastro de Contratos
- [x] Adicionar campo nome do contrato separado no formulário
- [x] Permitir edição independente de nome, cidade e UF

## Normalização de Texto
- [x] Criar função utilitária de normalização de texto (maiúsculas, sem acentos, ç→C)
- [x] Aplicar normalização nas APIs de contratos
- [x] Aplicar normalização nas APIs de ClienteS
- [x] Aplicar normalização nas APIs de departamentos
- [x] Aplicar normalização na API de usuários/profiles
- [x] Testar normalização em todos os cadastros

## Melhorias na Página de Contratos
- [x] Implementar modal de edição de contratos
- [x] Adicionar toggle Ativar/Desativar no modal de edição
- [x] Implementar ação de exclusão de contratos com confirmação
- [x] Adicionar filtro por nome do contrato
- [x] Adicionar filtro por status (ativo/inativo)
- [x] Padronizar coluna Especial (Não com mesmo estilo do Sim)
- [x] Testar todas as funcionalidades

## Melhorias Avançadas em Contratos
- [x] Alterar exclusão para permanente (deletar do banco) com msgbox de confirmação
- [x] Implementar IDs personalizados: primeiro dígito = código UF + 3 dígitos sequenciais
- [x] Adicionar botão de exportação para XLS
- [x] Adicionar botão de exportação para CSV
- [x] Modernizar design dos filtros
- [x] Testar todas as novas funcionalidades

## Correções em Contratos
- [x] Padronizar IDs dos contratos existentes (Monte Alegre e Jucurutu) para formato UF+sequencial
- [x] Remover acentos da palavra "Não" em todos os lugares
- [x] Adicionar ordenação crescente/decrescente nas colunas da tabela
- [x] Testar todas as correções

## Página de ClienteS
- [x] Criar página de listagem de ClienteS com tabela
- [x] Implementar filtros modernos (nome, status, contrato)
- [x] Adicionar modal de cadastro com todos os campos
- [x] Implementar campos de matrícula, CPF, nome, cargo
- [x] Adicionar seleção de contrato vinculado
- [ ] Implementar cadastro de múltiplos telefones (pendente)
- [ ] Adicionar campos de dados bancários (pendente)
- [x] Implementar ações de editar e excluir
- [x] Adicionar confirmação de exclusão
- [x] Implementar ordenação clicável nas colunas
- [x] Adicionar exportação XLS e CSV
- [x] Aplicar normalização automática de texto
- [x] Testar todas as funcionalidades

## Expansão do Formulário de ClienteS
- [x] Adicionar campo Nr WhatsApp no schema e formulário
- [x] Adicionar campo Telefone Secundário no schema e formulário
- [x] Expandir campos de endereço (Logradouro, Número, Bairro, Complemento, Cidade, UF, CEP)
- [ ] Adicionar campos de dados bancários (Banco, Tipo de Conta, Agência, Conta, Dígito, PIX) - Nota: Dados bancários já existem em tabela separada
- [x] Aplicar máscara de CPF na tabela (###.###.###-##)
- [x] Remover acento de "Matrícula" em todos os lugares
- [x] Atualizar schema do banco de dados
- [x] Executar migrations
- [x] Testar cadastro completo com todos os campos

## Correção de Erro em ClienteS
- [x] Corrigir tratamento de campos de data (birthDate, admissionDate, terminationDate) na função handleEdit
- [x] Testar edição de ClienteS com datas nulas e preenchidas

## Melhorias UX no Formulário de ClienteS
- [x] Criar seções visuais com títulos (Dados Pessoais, Telefones, Endereço, Dados Bancários)
- [x] Aumentar espaçamento entre label e input (mb-2 ou mb-3)
- [x] Marcar campos obrigatórios com label em vermelho e asterisco
- [x] Adicionar código internacional nos campos de telefone (default +55 Brasil)
- [x] Incluir campos de dados bancários no formulário de cadastro
- [x] Testar cadastro completo com todas as seções

## Novos Campos e Melhorias em ClienteS
- [x] Adicionar campo Data Associação ao schema
- [x] Expandir Status para incluir "Desligado" além de Ativo/Inativo
- [x] Criar lista de bancos do Brasil com código e nome
- [x] Adicionar estados para associationDate e códigos internacionais
- [x] Atualizar router para aceitar associationDate e códigos internacionais
- [x] Adicionar campo Data Associação ao lado de Matrícula no formulário
- [x] Adicionar dropdown de Status com opção "Desligado"
- [x] Adicionar inputs de código internacional editáveis (default +55)
- [x] Implementar autocomplete de bancos com busca por código/nome
- [x] Implementar PIX preenchido automaticamente com CPF
- [x] Testar cadastro completo com todos os novos campos

## Correções no Formulário de ClienteS
- [x] Remover status "Sem produção" do dropdown e schema
- [x] Aumentar largura do modal de cadastro para melhor alinhamento
- [x] Corrigir useEffect do PIX para copiar CPF completo (11 caracteres)
- [x] Testar todas as correções

## Melhorias de UX no Formulário de ClienteS
- [x] Implementar máscaras de entrada (CPF, telefone, CEP) com react-input-mask
- [x] Adicionar busca automática de endereço via API ViaCEP
- [x] Implementar validação visual em tempo real com feedback de erros
- [x] Adicionar indicador de progresso mostrando campos obrigatórios preenchidos
- [x] Implementar tooltips informativos nos campos principais
- [x] Melhorar agrupamento visual das seções com cores e bordas
- [x] Adicionar ícones e estados visuais nos botões de ação
- [x] Implementar loading spinner durante busca de CEP
- [x] Adicionar validação de CPF com 11 dígitos
- [x] Melhorar largura do modal para 6xl (max-w-6xl)

## Correção de Compatibilidade React 19
- [x] Remover react-input-mask (incompatível com React 19)
- [x] Implementar máscaras nativas usando IMask ou input-mask-core
- [x] Testar todas as máscaras (CPF, telefone, CEP)
- [x] Validar funcionamento completo do formulário

## Melhorias de Layout do Modal de Cadastro
- [x] Aumentar largura máxima do modal de 6xl para 7xl ou full
- [x] Melhorar espaçamento interno (padding)
- [x] Ajustar grid de campos para aproveitar melhor o espaço horizontal
- [x] Testar responsividade em diferentes tamanhos de tela

## BUGS CRÍTICOS Reportados pelo Usuário
- [x] Menus não estão visíveis após última atualização (FALSO POSITIVO - menus sempre estiveram visíveis)
- [x] Modal de cadastro ainda não está usando o espaço adequado da tela (RESOLVIDO - removido sm:max-w-lg do Dialog)
- [x] Verificar se alterações de max-w-7xl realmente foram aplicadas (RESOLVIDO - usado w-[95vw] max-w-[1600px])

## Novos Bugs Reportados
- [x] Menu lateral desaparece ao entrar na página ClienteS (RESOLVIDO - adicionado DashboardLayout)
- [x] Remover campo "Data de Admissão" do formulário de ClienteS (CONCLUÍDO - removido de cadastro e edição)

## BUG CRÍTICO - Menu Incorreto
- [x] Página ClienteS mostra menu simplificado (Navigation, Page 1, Page 2) em vez do menu completo (RESOLVIDO - substituído DashboardLayout por Layout)
- [x] Menu deve ser igual ao da página Contratos (Dashboard, Tickets, WhatsApp, ClienteS, Contratos, Departamentos, Relatórios, Configurações) (CONCLUÍDO)

## Nova Funcionalidade - Visualização de Dados Bancários
- [x] Adicionar ícone "Dados Bancários" na coluna Ações (ao lado do editar)
- [x] Criar modal que exibe apenas informações bancárias do CLIENTE
- [x] Modal deve mostrar: Banco, Agência, Conta, Dígito, Tipo de Conta, Chave PIX
- [x] Testar abertura do modal e exibição dos dados

## Refatoração SonarQube - Conceito A (CANCELADA)
- [-] Reduzir complexidade cognitiva (quebrar funções grandes, extrair lógica)
- [-] Melhorar segurança de tipos (eliminar any, adicionar tipos explícitos)
- [-] Remover code smells (duplicação, magic numbers, funções longas)
- [-] Aplicar imutabilidade e pureza (const, evitar mutações, funções puras)
- [-] Gerar arquivo ZIP com código refatorado

OBS: Tarefa cancelada pelo usuário para evitar consumo excessivo de créditos

## Novos Ícones na Lista de ClienteS
- [x] Adicionar ícone "Demonstrativo de Pagamento" após ícone de Dados Bancários
- [x] Adicionar ícone "Declaração de Produtividade" após Demonstrativo de Pagamento
- [x] Ambos devem exibir toast "Em Desenvolvimento" ao clicar
- [x] Testar funcionalidade dos ícones

## Correção de Dados Bancários
- [x] Alterar nome do banco código 450 de "FITBANK IP" para "OWLBANK"
- [x] Validar alteração no modal de dados bancários

## Guia de Instalação Local
- [x] Criar README_INSTALACAO.md com instruções passo a passo
- [x] Criar arquivo .env.example com variáveis de ambiente necessárias (VARIAVEIS_AMBIENTE.md)
- [x] Criar script de setup do banco de dados (setup-database.sql)
- [x] Gerar arquivo ZIP com projeto completo para download

## Implementação - Tela de Departamentos
- [x] Criar schema de departamentos no banco (já existia)
- [x] Criar router tRPC de departamentos (CRUD completo com delete e toggleStatus)
- [x] Criar funções de banco de dados (db.ts) - deleteDepartment e toggleDepartmentStatus
- [x] Criar página Departamentos.tsx com listagem completa
- [x] Implementar filtros e busca (nome, descrição, responsável, status)
- [x] Criar modal de cadastro/edição de departamento
- [x] Adicionar ações (editar, excluir, ativar/desativar)
- [x] Testar todas as funcionalidades

## Refatoração - Unificar Modal de ClienteS
- [x] Adicionar estado `mode` ('create' | 'edit') e `editingId` ao modal
- [x] Modificar handleEdit para abrir modal unificado em modo edição
- [x] Carregar dados do CLIENTE no modal quando em modo edição
- [x] Remover modal de edição duplicado (DialogEdit) - 206 linhas removidas
- [x] Testar fluxo de cadastro (modo create) - funcionando perfeitamente
- [x] Testar fluxo de edição (modo edit) - funcionando perfeitamente
- [x] Validar que todos os campos são preenchidos corretamente

## Submenu de Configurações
- [ ] Criar estrutura de submenu em Configurações
- [ ] Adicionar item "Usuários" (Em Desenvolvimento)
- [ ] Adicionar item "Perfil do Usuário" (Em Desenvolvimento)
- [ ] Adicionar item "Empresa" (Em Desenvolvimento)
- [ ] Mover "Mensagens Automáticas" de Configurações para submenu
- [ ] Adicionar item "Tipos de Atendimentos" (Em Desenvolvimento)
- [ ] Mover "Importações" de Configurações para submenu
- [ ] Adicionar item "APIs" (Em Desenvolvimento)
- [ ] Testar navegação e funcionalidades

## Submenu de Configurações
- [x] Criar submenu expansível em Configurações com 7 itens
- [x] Extrair componente de Mensagens Automáticas para /settings/mensagens-automaticas
- [x] Extrair componente de Importações para /settings/importacoes
- [x] Criar página placeholder Usuários (/settings/usuarios) com badge DEV
- [x] Criar página placeholder Perfil do Usuário (/settings/perfil-usuario) com badge DEV
- [x] Criar página placeholder Empresa (/settings/empresa) com badge DEV
- [x] Criar página placeholder Tipos de Atendimentos (/settings/tipos-atendimentos) com badge DEV
- [x] Criar página placeholder APIs (/settings/apis) com badge DEV
- [x] Implementar chevron animado para indicar estado expandido/colapsado
- [x] Adicionar indentação visual e borda lateral no submenu
- [x] Corrigir HREFs para usar prefixo /settings/
- [x] Testar navegação de todas as páginas do submenu

## Marcar Menus como Desenvolvimento
- [x] Adicionar badge "DEV" no menu Relatórios
- [x] Adicionar badge "DEV" no menu Tickets
- [x] Criar página placeholder para Relatórios
- [x] Criar página placeholder para Tickets
- [x] Atualizar rotas no App.tsx
- [x] Testar navegação dos menus marcados como DEV

## Corrigir Layout das Páginas de Desenvolvimento
- [x] Atualizar TicketsPlaceholder para usar DashboardLayout
- [x] Atualizar RelatoriosPlaceholder para usar DashboardLayout
- [x] Atualizar todas as páginas settings/* para usar DashboardLayout
- [x] Testar navegação e layout de todas as páginas placeholder

## Atualizar Pacote Localhost
- [x] Verificar arquivos de configuração local existentes
- [x] Atualizar scripts de instalação e execução
- [x] Atualizar README com novas funcionalidades
- [x] Gerar novo arquivo ZIP com código atualizado
- [x] Testar integridade do pacote

## Atualizar GitHub
- [x] Verificar configuração Git existente
- [x] Adicionar todas as alterações ao staging
- [x] Criar commit com descrição das mudanças
- [x] Fazer push para o repositório remoto
- [x] Verificar se push foi bem-sucedido

## Criar README.md
- [ ] Escrever documentação completa do sistema
- [ ] Incluir descrição de todas as funcionalidades
- [ ] Documentar tecnologias utilizadas
- [ ] Adicionar instruções de instalação e uso
- [ ] Fazer commit e push para GitHub


