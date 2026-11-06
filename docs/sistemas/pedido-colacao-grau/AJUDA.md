# Ajuda e experiência do aluno — estado do formulário recebido

**Estado:** inventário editorial e de interface do arquivo `ColacaoApp.html`. O legado **não possui uma Central de Ajuda GRADIP** própria no material entregue; este documento não significa que ela foi implantada.

## Informações mostradas atualmente

1. **Nome completo:** solicitar grafia conforme a certidão de nascimento.
2. **Nº USP, ano de ingresso e e-mail USP:** campos de identidade; o e-mail USP é somente leitura no navegador e vem da sessão.
3. **RG/CIN:** pedir um documento recente, aberto e visível por inteiro; o arquivo é obrigatório.
4. **Certidão de nascimento:** upload obrigatório, com explicação sobre conferência da grafia e orientações de diploma digital, normas e 2ª via que devem passar por revisão editorial/jurídica antes da atualização.
5. **Curso concluído:** marcar Bacharelado, Licenciatura e/ou Formação de Psicólogo(a); aviso relacionado ao Código de Ética.
6. **Vínculo futuro:** responder se permanecerá matriculado; se houver habilitação pendente, selecionar as que continuarão.
7. **Telefone e e-mail alternativo:** ambos exigidos pela interface, com instruções de contato.
8. **Procuração:** marcar SIM/NÃO; com SIM, identificar procurador e ler aviso sobre entrega do documento ao Serviço.
9. **Colação antecipada:** marcar SIM/NÃO e ler os critérios exibidos na tela; o formulário **não decide** o deferimento da antecipação.
10. **Observações livres:** campo opcional.
11. **Correção:** a página avisa que um pedido da mesma colação existe; usuário escolhe corrigir ou voltar ao Painel de Solicitações. A mensagem informa substituição dos anexos reenviados.
12. **Confirmação:** tela de pedido enviado/atualizado; não há recibo por e-mail no código entregue.

## UX existente vs padrão futuro

- **Existente:** cartões brancos, barras azuis e estilos CSS fixos; layout central, uploads por clique/arrastar, grupos SIM/NÃO, feedback com `alert`, `confirm`, overlay de carregamento e tela de erro.
- **Não encontrado:** tema `system/light/dark`, seletor de aparência, Central de Ajuda com busca/FAQ, ajuda contextual `?`, tratamento de foco e teclas no padrão GRADIP, validações por campo acessíveis a leitores de tela.
- **Não verificado:** contraste e navegação por teclado, responsividade em 360/390/480/768 px, comportamento em iframe do Apps Script e browsers móveis.

## Requisitos editoriais da reformulação

Apresentar o aluno suas escolhas sem ambiguidade: `Este documento já foi utilizado na colação anterior`; `Reutilizar`, `Enviar versão atualizada` e `Adicionar documento`. Não anunciar que um documento foi validado só porque existe no Drive. Oferecer confirmação compreensível antes de substituir e indicar quando haverá análise humana da equipe.

Ao implementar a nova interface, seguir [sistema de design](../../UX_DESIGN_SYSTEM.md), [arquitetura da ajuda](../../ajuda/HELP_ARCHITECTURE.md) e [segurança e privacidade da ajuda](../../ajuda/HELP_SECURITY_PRIVACY.md); preservar as regras acadêmicas efetivamente aprovadas, sem copiar textos normativos não verificados como fatos atualizados.
