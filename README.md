# 🎫 Ouvidoria Qualital

Sistema completo de gestão de atendimentos e tickets desenvolvido para a **Qualital**. O sistema oferece controle centralizado de tickets, gestão de usuários e contratos, integração com WhatsApp e ferramentas administrativas para otimizar o atendimento.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-Propriet%C3%A1rio-blue)

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## 🎯 Sobre o Projeto

O **Sistema Ouvidoria Qualital** foi desenvolvido para centralizar e otimizar o atendimento. O sistema permite o gerenciamento completo de tickets de atendimento, cadastro de clientes e contratos, organização por departamentos e integração com WhatsApp para atendimento automatizado.

---

## ✨ Funcionalidades

### Módulos Implementados

#### 🎫 Sistema de Tickets
O sistema de tickets está **totalmente operacional** e integrado ao fluxo de trabalho. Inclui:
- **Chat em Tempo Real**
- **Dashboard Analítico Premium**
- **Triagem Automatizada** via WhatsApp
- **Exportação Global** (CSV/XLS)

#### 💬 WhatsApp QR (Estabilidade Reforçada)
Integração via `whatsapp-web.js` com melhorias de estabilidade e suporte multimídia.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui**
- **tRPC** para comunicação type-safe

### Backend
- **Node.js 22** + **Express 4**
- **Drizzle ORM** (MySQL)
- **Supabase** (Auth & Storage)

### Infraestrutura
- **Docker** (Banco de Dados QualitalOuvidoria)
- **PM2** para gestão de processos

---

## 📦 Instalação

### Pré-requisitos
- **Node.js** >= 18.x
- **Docker** & **Docker Compose**
- **pnpm**

### Instalação Rápida
1. Configure o `.env` baseado no `.env.example`.
2. Suba o banco com `docker-compose up -d`.
3. Instale as dependências com `pnpm install`.
4. Execute as migrações: `pnpm db:push`.
5. Inicie em dev: `pnpm dev`.

---

## 📄 Licença

Este projeto é **propriedade exclusiva da Qualital**. Todos os direitos reservados.

---

## 📞 Contato

**Qualital**  
**Repositório Oficial:** [OuvidoriaQualital](https://github.com/TecnologiaMktReal/OuvidoriaQualital)

---

**Desenvolvido com ❤️ para Qualital**


