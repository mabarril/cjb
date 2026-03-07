# Sistema de Controle de Presença — Coral Jovem de Brasília

Sistema web para agilizar o registro de presença em ensaios e eventos do Coral Jovem de Brasília (CJB), utilizando QR Codes dinâmicos projetados em telão.

## 🚀 Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 20 (Signals, Control Flow, Standalone Components) |
| Estilização | Tailwind CSS (Mobile-First, Dark/Light Mode) |
| Banco de Dados | Supabase — PostgreSQL + RLS |
| Autenticação | Supabase Auth |
| Realtime | Supabase Realtime (WebSocket) |

## ✨ Funcionalidades

- **Registro e Aprovação de Coristas:** novos membros solicitam acesso pelo celular e aguardam aprovação da diretoria.
- **Painel Administrativo:** gestão de membros, aprovação de cadastros e criação de sessões de ensaio.
- **Geração de QR Code Dinâmico:** a diretoria gera um token único por ensaio, exibido em telão via tela de projeção.
- **Leitura de Presença Mobile:** coristas aprovados escaneiam o QR Code e registram a presença direto pelo smartphone.
- **Monitoramento em Tempo Real:** o painel administrativo é atualizado instantaneamente via WebSocket a cada nova presença registrada.

## 📁 Estrutura de Documentação

```
docs/
├── planejamento.md          # Arquitetura, modelagem de dados e padrões de projeto
├── tasks.md                 # Controle de status das atividades
├── supabase_schema.sql      # Script de criação das tabelas no Supabase
├── supabase_trigger.sql     # Trigger para criação automática de perfis
└── hu-001-admin-access.md   # HU: Acesso ao Painel Administrativo (BDD)
```

## 📐 Estrutura do Projeto Angular

```
src/
└── app/
    ├── core/           # Serviços singleton, Guards de autenticação e roles
    ├── shared/         # Componentes reutilizáveis (UI, layouts, utils)
    └── features/
        ├── auth/       # Login e Registro
        ├── corista/    # Dashboard e Scanner de QR Code
        ├── admin/      # Painel do Regente / Aprovação de Coristas
        └── projecao/   # Tela de telão com QR Code dinâmico
```

## 🧑‍💻 Como Rodar o Projeto

### Pré-requisitos

- Node.js 20+
- Angular CLI (opcional, mas recomendado)
- Projeto configurado no [Supabase](https://supabase.com/)

### Instalação

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd cjb

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente do Supabase
# Edite o arquivo src/environments/environment.ts com suas chaves
```

### Executar em modo desenvolvimento

```bash
ng serve
```

Acesse em `http://localhost:4200`. A aplicação recarrega automaticamente ao salvar arquivos.

### Build para produção

```bash
ng build
```

Os artefatos serão gerados na pasta `dist/`.

### Testes

```bash
# Testes unitários (Vitest)
ng test

# Testes end-to-end
ng e2e
```

## 🔒 Configuração do Banco de Dados (Supabase)

Execute os scripts SQL na ordem indicada no painel SQL do seu projeto Supabase:

1. `docs/supabase_schema.sql` — cria as tabelas `profiles`, `sessions` e `attendances` com RLS configurado.
2. `docs/supabase_trigger.sql` — cria o trigger para popular a tabela `profiles` automaticamente ao cadastrar um novo usuário.

## 📝 Licença

Este projeto é de uso exclusivo do Coral Jovem de Brasília.
