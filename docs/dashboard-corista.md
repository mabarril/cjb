# Dashboard do Corista (Real-time)

Este componente é a tela principal para o corista realizar o check-in nos ensaios e acompanhar sua frequência.

## Funcionalidades
- **Scan de QR Code:** Acesso à câmera para leitura do token dinâmico gerado pelo administrador.
- **Resumo de Presenças:** Exibição em tempo real da porcentagem de frequência e total de faltas no ano.
- **Histórico Recente:** Lista dos últimos ensaios com status (Presente/Falta) e data/hora.
- **Sincronização Real-time:** Utiliza Supabase Realtime para atualizar os dados assim que uma presença é registrada, sem necessidade de recarregar a página.

## Detalhes Técnicos
- **Service:** `PresencaService`
  - `getUserAttendances(userId)`: Recupera o histórico completo com join na tabela de sessões.
  - `subscribeToUserAttendances(userId, callback)`: Canal de escuta para mudanças na tabela `attendances`.
- **Componente:** `DashboardComponent`
  - Usa `Signals` e `computed()` para cálculo automático de estatísticas.
  - **Cleanup:** Unsubscribe automático do canal Realtime no `ngOnDestroy`.

## UI/UX
- **Skeleton Loaders:** Exibidos durante o carregamento inicial dos dados.
- **Feedback Visual:** Toasts e mensagens de sucesso/erro após o scan do QR Code.
- **Acessibilidade Inteligente:** O acesso ao scanner é feito exclusivamente pelo **Botão Flutuante (FAB)**.
- **Visibilidade Condicional:** Por questões de limpeza visual e lógica de processo, o botão de scanner só aparece no dashboard se:
  1. Houver um ensaio com status **'Ativo'** no sistema.
  2. O corista logado **ainda não tiver registrado presença** para este ensaio específico.
- **Real-time:** A visibilidade do botão é controlada em tempo real via Supabase Realtime (tabelas `sessions` e `attendances`).
