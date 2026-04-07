# SpecUI.MD - Especificação Técnica de UI/UX (Pixel-Perfect)

## Projeto: Help Desk Coopedu (HDC v2)

Este guia destina-se a fornecer instruções técnicas rigorosas para a replicação idêntica da interface do projeto Help Desk Coopedu.

---

## 1. Fundamentos e Tokens

### 1.1 Sistema de Cores (OKLCH - High Precision)

_Nota: O projeto utiliza Tailwind CSS v4 com definições OKLCH no `index.css`._

| Token               | Valor OKLCH                               | Fallback HEX | Uso                  |
| :------------------ | :---------------------------------------- | :----------- | :------------------- |
| `--background`      | `oklch(1 0 0)`                            | `#FFFFFF`    | Fundo Light          |
| `--background-dark` | `oklch(0.141 0.005 285.823)`              | `#020617`    | Fundo Dark Principal |
| `--primary`         | `oklch(0.35 0.08 240)`                    | `#005487`    | Azul Institucional   |
| `--accent`          | `oklch(0.65 0.15 220)`                    | `#00b7ff`    | Ciano Interativo     |
| `--item-active`     | `gradient(from-yellow-600 to-yellow-700)` | -            | Itens de Menu Ativos |
| `--success`         | `oklch(0.65 0.12 145)`                    | `#3ab54a`    | Verde Coop           |

### 1.2 Animações Globais (Keyframes)

- **`shimmer`**: Gradiente linear animado horizontalmente para botões.
- **`spin-slow`**: Rotação `360deg` em **25s** linear (Triângulos Sidebar).
- **`spin-slower`**: Rotação inversa em **40s** linear (Triângulos Sidebar).
- **`ping`**: Pulsação de status ativo (Indicador "Sistema Operacional").

---

## 2. Tela de Autenticação (Auth / Login)

### 2.1 Atmosfera e Fundo

- **Fundo Base**: `#020617`.
- **Efeito Radial**: `radial-gradient(ellipse at center, blue-900/20, #020617, #020617)`.
- **Grid Pattern**: Background linear-gradient (linhas 1px) cor `#1e293b` opacidade 0.1, tamanho `50px 50px`.
- **Triângulos Dinâmicos**: 8 Formas SVG (`Triangle`) com `blur-sm` e `opacity-60`.
  - **Motion**: Variantes de `y: [-30, 0]`, `rotate: [0, 10, 0]` e `scale: [1, 1.1, 1]`.
- **Partículas**: 20 círculos brancos (`1-3px`) subindo com `y: [0, -100]` e opacidade `0 -> 0.8 -> 0`.

### 2.2 Componentes Premium

- **Selo SomosCoop**: `bottom-10 left-10`, `w-48`. Efeito hover com `bg-green-500 blur-2xl opacity-20`.
- **Hero Text**: H1 com `bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent`.
- **Auth Card**:
  - Borda: `-inset-0.5 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 rounded-[2rem] blur opacity-30`.
  - Corpo: `bg-[#0b1121]/90 backdrop-blur-xl border border-white/10 p-8`.
- **Inputs Modernos**: Fundo `#141b2d`, borda `slate-700/50`, classe `focus:ring-blue-500/50`. Labels em `blue-400` uppercase.
- **Action Button**: Gradiente `from-blue-600 to-blue-800`. Inclui sub-div com `animate-[shimmer_1.5s_infinite]`.

---

## 3. Sidebar (HDC SlideBar)

### 3.1 Estética Dark/Glass

- **Aside**: `bg-[#0f172a] border-r border-slate-800`.
- **Efeitos Visuais**: 3 Triângulos SVGs com `blur-xl` a `blur-2xl` fixos no fundo com animações `spin-slow` e `spin-slower`.
- **Toggle Button**: Centralizado à direita (`-right-3`), circular, `bg-[#0b2f63]`.

### 3.2 Itens de Navegação

- **Active State**: Fundo `bg-gradient-to-r from-yellow-600 to-yellow-700`.
- **Icon Hover**: Transição para cor `#facc15` (yellow-400).
- **Submenus**: Linha vertical de conexão `border-l-2 border-slate-800` com recuo de `pl-4`.
- **Badges de Notificação**: `bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10`.

---

## 4. Padrões de CRUD e Listagens

### 4.1 Cabeçalho de Página

- **Header**: Container com `py-8`. Título `text-3xl font-bold text-gray-900`.
- **Ícone**: Caixa `p-2 bg-blue-50 rounded-lg` à esquerda do título.

### 4.2 Action Bar (Toolbar)

- **Container**: `bg-white rounded-lg shadow-sm p-6 border border-gray-100`.
- **Filtros**: Selects e Inputs com `h-11`. Labels em `text-gray-500 font-semibold uppercase`.
- **Exportação**: Botões `variant="outline"` com ícones Lucide coloridos (XLS em verde, CSV em cinza).

### 4.3 Modais de Formulário

- **Design de Seções**: Títulos de seção com marcador vertical azul (`h-8 w-1 bg-blue-600`).
- **Input Grouping**: Agrupamento em containers com `bg-gradient-to-r from-blue-50 to-transparent`.
- **Feedback de Validação**: Banner azul no topo do modal (`bg-blue-50 border-blue-200`) mostrando progresso de preenchimento.

---

## 5. Dashboards e Gráficos

### 5.1 Cartões KPI

- **KPI Card**: `shadow-lg bg-white ring-1 ring-slate-200/50 rounded-3xl`.
- **Ícones KPI**: Caixas quadradas arredondadas com gradientes (`bg-blue-600`, `bg-emerald-600`).

### 5.2 Estilo Recharts

- **Áreas e Linhas**: Uso de `defs` para gradientes de preenchimento (`#2563eb` opacity 0.25 -> 0).
- **Scatter Matrix**: Bolhas com `fillOpacity={0.8}` e cores baseadas em métricas (`#ef4444`, `#f59e0b`, `#22c55e`).

---

## 6. Geração de PDF (Backend Analysis)

### 6.1 Layout CSS para PDF

- **Body**: Font `'Inter'`, `size: 10px`, `color: #1e293b`.
- **Header**: Fundo sólido `#0f172a`, altura da logo `45px`.
- **Seção IA**: Box com fundo azul claro e borda esquerda grossa (`4px solid #2563eb`).
- **Gráficos**: Feitos com `div` e larguras percentuais (`background: #f1f5f9` para o trilho e cores sólidas para a barra).


