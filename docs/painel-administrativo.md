# Painel Administrativo

O Painel Administrativo é o centro de comando para os regentes e diretores do coral.

## Funcionalidades Principais
- **Resumo de Ensaios:** Exibição de contadores por status (Agendado, Ativo, Encerrado).
- **Drill-down de Status:** Filtros interativos que revelam a lista de sessões para cada status selecionado.
- **Lista de Chamada em Tempo Real:** Ao selecionar um ensaio, o sistema exibe o contador de presentes e a lista nominal de coristas confirmados (com naipe e horário).
- **Aprovação de Coristas:** Seção para gerenciar novas solicitações de registro pendentes.
- **Gestão de Sistema:** Atalhos claros para configuração de ensaios e gestão de membros.

## Detalhes Técnicos
- **Componente:** `PainelComponent`
- **Signals Utilizados:**
  - `counts`: Armazena o total de ensaios por status.
  - `selectedStatus`: Define qual lista de ensaios exibir.
  - `selectedSession`: Define qual lista de chamada detalhar.
  - `attendees`: Lista reativa de coristas presentes na sessão selecionada.
- **Navegação:**
  - Botão "Voltar ao Dashboard" para o admin retornar à visão de corista.
  - Card de "Gerenciar Ensaios" que leva à tela de CRUD.

## Segurança
- Protegido por `AuthGuard` e `AdminGuard`.
- Verificação de role `admin` tanto na rota quanto na inicialização do componente.
