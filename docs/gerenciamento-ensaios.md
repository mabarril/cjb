# Gerenciamento de Ensaios

Este componente permite o controle completo do ciclo de vida das sessões de ensaio e geração de QR Codes.

## Ciclo de Vida do Ensaio
1. **Agendado:** Sessão criada com data e hora futuras.
2. **Ativo:** Somente uma sessão pode estar ativa por vez. Ativar uma sessão gera o QR Code atualizado para os coristas.
3. **Encerrado:** Sessão finalizada após o ensaio, impedindo novos registros de presença.

## Funcionalidades
- **CRUD Completo:** Criação, edição e exclusão de ensaios.
- **Gerador de QR Code Full HD:**
  - Gera um arquivo PNG em resolução **1920x1080 (16:9)**.
  - Inclui branding (Logo CJB), data, local e instruções de uso.
  - Pronto para exibição em telões e projetores.
- **Tokens Únicos:** Cada ensaio possui um `qr_token` (UUID) exclusivo para segurança.

## Detalhes Técnicos
- **Componente:** `EnsaiosComponent`
- **Biblioteca de QR Code:** Utiliza `qrcode` (import dinâmico).
- **Proporção:** O canvas é desenhado respeitando o aspect ratio 16:9 para projetores profissionais.

## Localização
- Acesso restrito via `/admin/ensaios`.
- Link direto disponível no Painel Administrativo.
