# HU-001: Acesso ao Painel Administrativo

**Como um** Administrador (Regente/Diretoria),
**Eu quero** ter acesso direto a um link ou botão para o "Painel Administrativo" logo após efetuar o meu login,
**Para que** eu possa gerenciar os ensaios, gerar QR Codes e acompanhar a presença dos coristas rapidamente, sem precisar navegar por telas desnecessárias.

## ✅ Critérios de Aceitação (Acceptance Criteria)

1. **Validação de Perfil (Role):** Imediatamente após o login bem-sucedido, o sistema deve consultar o perfil do usuário (campo `role` na tabela `profiles` do Supabase).
2. **Visibilidade do Menu/Botão:** Se o `role` do usuário logado for igual a `admin`, o sistema deve exibir de forma clara (seja no *Header*, *Menu Lateral* principal ou na tela de Boas-vindas) uma opção para navegar para o Painel Administrativo.
3. **Ocultação de Elementos Sensíveis:** Se o usuário tiver o `role` igual a `corista` (ou não for `admin`), o botão ou link de acesso ao painel **não deve** existir no DOM (garantindo também que não apareça no HTML final).
4. **Proteção de Rota (Route Guard):** A URL de destino do painel (ex: `/admin/dashboard`) deve estar obrigatoriamente protegida por uma *Guard* no Angular. O acesso só será concedido se a validação do token/sessão confirmar tratar-se de um administrador.
5. **Tratamento de Exceções de Rota:** Se um corista comum ou um usuário não autenticado tentar acessar `/admin/dashboard` digitando a URL diretamente no navegador, o sistema deve bloquear o carregamento da página e redirecioná-lo para a rota padrão apropriada (`/login` para não logados, ou `/dashboard` para coristas logados), preferencialmente exibindo uma mensagem temporária de "Acesso Negado".

## 🧪 Cenários de Teste (BDD)

**Cenário 1: Autenticação de um Administrador**
* **Dado que** sou um usuário com o perfil de Administrador (`role: 'admin'`)
* **Quando** eu realizo o login com sucesso no sistema
* **E** sou redirecionado para a plataforma
* **Então** eu devo ver claramente a opção "Acessar Painel Administrativo" no meu menu de navegação.

**Cenário 2: Autenticação de um Corista Comum**
* **Dado que** sou um usuário com o perfil de Corista (`role: 'corista'`)
* **Quando** eu realizo o login com sucesso no sistema
* **E** sou redirecionado para o meu painel (Dashboard de leitura de QR Code)
* **Então** a opção do Painel Administrativo **não** deve estar visível para mim em nenhum local da interface.

**Cenário 3: Tentativa de invasão ou acesso direto por Corista**
* **Dado que** sou um usuário logado com o perfil de Corista
* **Quando** eu tento acessar a rota `/admin/dashboard` diretamente pela barra de endereços do navegador
* **Então** o sistema deve detectar que não possuo privilégios
* **E** eu devo ser redirecionado imediatamente para o Dashboard do Corista com a tela preservada.

**Cenário 4: Tentativa de acesso direto sem usuário logado**
* **Dado que** eu não possuo uma sessão ativa no sistema
* **Quando** tento acessar a rota `/admin/dashboard` diretamente pela barra de endereços
* **Então** o sistema deve me bloquear
* **E** redirecionar-me obrigatoriamente para a tela de Login.
