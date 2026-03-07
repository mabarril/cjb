# Implementação: Sistema de Controle de Presença - Coral Jovem de Brasília

Este documento descreve as decisões arquiteturais, de engenharia de software e de interface baseadas nas diretrizes de Clean Code, boa UX e na stack tecnológica definida (Angular 20, Tailwind CSS e Supabase).

## 1. Visão Geral

O sistema tem como objetivo principal agilizar o registro de presença em ensaios e eventos do Coral. O fluxo principal consiste em:
1. O corista solicita cadastro no sistema pelo celular (Sign Up) e seu perfil fica pendente.
2. Um administrador acessa o painel, avalia a solicitação e aprova o corista.
3. A diretoria/regência gera um QR code da sessão (ensaio) ativa.
4. O QR code é projetado em uma tela.
5. Os coristas, através de seus smartphones e corretamente logados (e previamente aprovados), escaneiam o QR code.
6. O sistema registra a presença e o painel administrativo recebe a atualização em tempo real.

## 2. Tecnologias (Stack)

*   **Frontend**: Angular 20 utilizando as mais recentes features (*Signals* para reatividade, *Standalone Components* para modularidade sem NgModules, e *Control Flow* nativo).
*   **Estilização**: Tailwind CSS, aproveitando o design system sugerido nos templates (Mobile-First, Dark/Light Mode, tipografia Inter).
*   **Backend as a Service (BaaS)**: Supabase, cobrindo:
    *   **PostgreSQL**: Banco de dados relacional e forte.
    *   **Auth**: Gestão de usuários e permissões de acesso.
    *   **Realtime**: Para atualizar o painel do Regente simultaneamente cada vez que um corista registra presença (efeito uau de UI/UX).

## 3. Práticas de Engenharia e Clean Code

### 3.1 Padrões de Projeto no Angular
Implementaremos uma estrutura de **Feature-Sliced Design** ou baseada em domínio. A lógica pesada será delegada para serviços focados (Single-Responsibility Principle), enquanto os componentes lidarão somente com dados providos por observáveis/signals e delegação de eventos.

*   **Componentes Smart/Dumb**: Componentes "Smart" (containers) injetam serviços e conversam com o Supabase. Componentes "Dumb" (apresentação) apenas recebem `@Input()` (ou inputs baseados em Signal) e emitem `@Output()`.
*   **Gestão de Estado**: Uso intenso de **Angular Signals** para reatividade fina e redução de checagens do ciclo do Angular.

### 3.2 Estrutura de Diretórios Proposta

```text
src/
 ├── app/
 │    ├── core/                  # Serviços Singleton e Guards
 │    │    ├── auth/             # Supabase Auth Service, Guards
 │    │    └── guards/           # Role guards (Admin vs Corista)
 │    ├── shared/                # UI reutilizável partindo do Tailwind fornecido
 │    │    ├── ui/               # Botões, Cards, Skeleton Loaders
 │    │    ├── layouts/          # Header, Bottom Navigation, Shell
 │    │    └── utils/            # Formatadores de data, helpers
 │    ├── features/              # Domínios da Aplicação
 │    │    ├── auth/             # (Página de Login, Registro e Fluxo de Pendência)
 │    │    ├── corista/          # (Dashboard, Histórico, Scanner/Câmera)
 │    │    ├── admin/            # (Painel do Regente, Aprovação de Novos Coristas, Tracking ao Vivo)
 │    │    └── projecao/         # (Página exibida no telão com QR Code dinâmico)
 │    ├── app.routes.ts          # Roteamento lazy-loaded
 │    └── app.component.ts       # Entry point
```

## 4. Modelagem do Banco de Dados (Supabase - PostgreSQL)

A integridade dos dados é crucial. Utilizaremos o RLS (Row Level Security) do Supabase para garantir que um corista só visualize e altere a própria presença, e a diretoria veja todos.

### Tabelas Principais:

*   **`profiles`**: Estende os dados do `auth.users` do Supabase.
    *   Sincronizado via **Trigger SQL (handle_new_user)** atrelado à tabela nativa do Supabase `auth.users`. Quando um corista se cadastra no frontend, o trigger popula esta tabela de forma atômica e segura.
    *   *Nota: A confirmação de e-mail base do Supabase (Email Confirmations) deve estar desativada para simplificar a adoção e prevenir limites de envio, transferindo a responsabilidade da "aprovação de conta" para a Diretoria através da coluna `status`.*
    *   `id` (uuid, primary key) - Relacionado com Autenticação
    *   `username` (text, unique) - Alias / Apelido escolhido pelo corista
    *   `full_name` (text)
    *   `voice_part` (text) - Enum (Soprano, Contralto, Tenor, Baixo, Regência)
    *   `role` (text) - Enum (corista, admin)
    *   `status` (text) - Enum ('pending', 'approved', 'rejected') - Um corista 'pending' não consegue registrar presença.
    *   `avatar_url` (text)

*   **`sessions` (Ensaios / Eventos)**:
    *   `id` (uuid, primary key)
    *   `title` (text) - ex: "Ensaio Geral", "Ensaio de Naipe"
    *   `scheduled_at` (timestamptz)
    *   `location` (text)
    *   `status` (text) - Enum (agendado, ativo, finalizado)
    *   `qr_token` (text, unique) - Token randômico e dinâmico, atualizado a cada instante para segurança ou gerado por ensaio.

*   **`attendances` (Presenças)**:
    *   `id` (uuid, primary key)
    *   `session_id` (uuid) - FK referenciando `sessions`
    *   `user_id` (uuid) - FK referenciando `profiles`
    *   `scanned_at` (timestamptz)
    *   `status` (text) - Enum (presente, ausente, atrasado)

## 5. User Experience (UX) Atrelada aos Templates

As telas em HTML enviadas mostram um apreço por interfaces de alta qualidade visual. Manteremos esse padrão em Angular:
1.  **Skeleton Loaders**: Já sugeridos no layout, usados em todas transições assíncronas aguardando dados do Supabase. Evita pular de telas e diminui a impaciência.
2.  **Mobile First**: Todos os recursos do _Dashboard do Corista_ serão projetados sob o paradigma mobile-first, por ser um aplicativo predominantemente para smartphones. O painel do Regente será adaptável.
3.  **Animações Suaves (@defer e CSS Transitions)**: As transições do Tailwind (ex: `transition-all`) estarão nos botões e cards. Recursos complexos (leitor de QR Code usando SDK de câmera browser) se beneficiarão da sintaxe `@defer` do Angular para baixar as libs somente quando ativadas pelo clique.
4.  **Feedback Realtime**: No momento que o corista der ok na leitura, um Toast na tela dele confirmará seu registro, e as estatísticas do painel Admin subirão imediatamente graças às assinaturas Websocket do Supabase.
