# UX e navegação — Gerenciador de Abertura de Habilitações 2.0

Padrão de referência: [`docs/UX_DESIGN_SYSTEM.md`](../../UX_DESIGN_SYSTEM.md), [`docs/UX_COMPONENT_RECIPES.md`](../../UX_COMPONENT_RECIPES.md) e [`docs/UX_CHECKLIST.md`](../../UX_CHECKLIST.md); referências de tela: Painel dos servidores (menu lateral/abas, marcas) e Estrutura Curricular (Central de Ajuda). Capturas em [`evidencias/2.0/`](evidencias/2.0/README.md).

## 1. Estrutura da tela

- **Cabeçalho**: marca IPUSP, nome do sistema e do setor, seletor de aparência, botão **Ajuda**, marca USP. Faixa "Ambiente de homologação" quando `AMBIENTE=homologacao`; aviso "somente consulta" para LEITOR.
- **Navegação**: botões **Menu lateral** e **Abas** (grupo com `aria-pressed`). Sempre abre no menu lateral; a escolha vale até fechar a página.
- **Três áreas**:
  - **Pendentes**: contador, busca local por nome ou Nº USP, **Atualizar**, lista de cartões;
  - **Concluídos**: os 10 mais recentes e a **busca no histórico** (com **Voltar aos 10 mais recentes**);
  - **Relatórios**: total em destaque, por habilitação, por ano, por mês, sem data e total por aba.
- **Detalhe** (diálogo modal): Dados do pedido, Situação, Observações (com contador de caracteres), Ações (**Concluir solicitação**, **Avisar aluno por e-mail**, cada uma com **?**) e rodapé com **Fechar** e o botão principal ("Salvar", ou "Salvar e avisar aluno" quando o aviso está marcado), e, ao lado da opção de aviso, uma dica do que vai acontecer ("o aluno já foi avisado; será pedida confirmação para reenviar", "este pedido não tem e-mail cadastrado"…).
- **Rodapé**: nome do sistema e versão.

## 2. Cartões

| Caso | Aparência | Ação |
|---|---|---|
| Pedido com ID único | botão com nome, Nº USP, habilitação, data e e-mail; selo da situação | abre o detalhe |
| Sem identificador | cartão tracejado, sem ação; selo "Sem identificador"; **? Por que não abre** | ADMINISTRADOR vê **Preparar pedido** |
| ID repetido ou inválido | igual, selo "Identificador repetido/inválido" | nenhuma (recuperação pelo responsável) |
| Versão vazia ou malformada (ID bom) | igual, selo "Versão inválida" | nenhuma (recuperação pelo responsável) |
| Concluído | selo verde; "Aluno avisado em …", "Aluno não avisado por e-mail" ou "Aviso por e-mail sem confirmação de envio" | abre o detalhe |
| Histórico 2021–2022 | origem indicada, sem ação | só consulta |

## 3. Estados

Cada área tem estado próprio de **carregando** (texto com `aria-live`), **vazio** (mensagem e, quando faz sentido, ação), **erro** (mensagem, link **Saiba mais** para a seção de ajuda e **Tentar de novo**) e **conteúdo**. Não há sobreposição de tela cheia: as outras áreas continuam usáveis. Uma área é lida ao ser aberta e reaproveitada por 60 s; depois de salvar, a área de origem é lida de novo. Respostas atrasadas de uma busca anterior são descartadas.

Depois de salvar: aviso breve no rodapé (`role="status"`), que some ao abrir outro pedido. Mensagens que exigem ação (e-mail que falhou, conflito) aparecem dentro do detalhe e recebem rolagem até ficarem visíveis.

## 4. Confirmações

Diálogos acessíveis (`role="alertdialog"`), no lugar do `confirm()` do navegador:

- antes de enviar e-mail: "Avisar {nome} por e-mail?";
- antes de reabrir um pedido concluído;
- reenvio (já avisado ou envio interrompido), com o motivo dado pelo servidor.

O botão de confirmar fica desativado durante a chamada; **Cancelar** e Esc não gravam nada.

## 5. Mensagens de erro

O servidor manda `CODIGO: texto`. A página mostra:

| Código | Texto mostrado | Ajuda |
|---|---|---|
| `ENTRADA`, `CONFLITO_VERSAO`, `TRAVA_OCUPADA`, `ENVIO_EM_ANDAMENTO`, `SEM_EMAIL`, `GRAVACAO_PARCIAL`, `REFERENCIA_DESATUALIZADA`, `MIGRACAO_NECESSARIA`, `NAO_ENCONTRADO`, `INTEGRIDADE`, `VERSAO_INVALIDA`, `ESTRUTURA`, `SO_LEITURA`, `SEM_ACESSO`, `SEM_IDENTIFICACAO` | o do servidor (escrito para a equipe, sem IDs), até 400 caracteres | conforme o código |
| `ACESSO_INDISPONIVEL`, `CONFIGURACAO` | texto fixo da página | `ajuda-acesso` |
| resposta nula ou fora do formato | "O servidor devolveu uma resposta vazia ou incompleta…" | — |
| sem `google.script.run` | "A página não conseguiu falar com o servidor…" | — |
| qualquer outro, ou sem código | "Algo deu errado no servidor…" | — |

No salvamento, uma resposta inválida é tratada como "não foi possível confirmar o salvamento": a página pede para recarregar e conferir, para não arriscar um segundo e-mail.

## 6. Teclado e leitores de tela

- Menu lateral: botões com `aria-current="page"` na área ativa. Abas: `role="tablist"`/`tab`, `aria-selected`, setas, Home e End movem o foco, Enter ou Espaço abrem.
- Detalhe: foco vai para o diálogo ao abrir, fica preso nele (Tab e Shift+Tab), Esc fecha (exceto durante um salvamento) e o foco volta ao cartão de origem. A rolagem do fundo fica travada enquanto há diálogo aberto.
- A Central de Ajuda abre por cima do detalhe; Esc fecha só a ajuda.
- Ícones são decorativos (`aria-hidden`); todo botão tem texto ou `aria-label`.
- Alvos de toque de pelo menos 44 px.

## 7. Tema e responsividade

- Tokens GRADIP (`GradipTema.html`), claro, escuro ou do sistema, guardado em `localStorage["gradip-theme"]`. Contraste de texto ≥ 4,5:1 conferido nos dois temas pelo teste.
- Até 900 px, o menu lateral vira bloco recolhível (**Mostrar menu**). O detalhe ocupa a largura útil e o rodapé de ações fica fixo no fim do diálogo.
- Conferido sem rolagem horizontal em 360, 390, 480, 768, 1024 e 1280 px.

## 8. Perfil LEITOR

Vê tudo. Faixa "Somente consulta" com o link **Como pedir outro perfil**; no detalhe, observações, opções e botão de salvar desativados, com o aviso "Seu perfil é somente de consulta: as ações estão desativadas." "Preparar pedido" não aparece. Desativar os botões é só conforto: quem barra é o servidor (`SO_LEITURA`).

## 9. Diferenças visuais em relação à 1.0

| 1.0 | 2.0 |
|---|---|
| Abas fixas, sem tema | Menu lateral ou abas; tema claro/escuro; marcas IPUSP e USP |
| Sobreposição "Carregando…" em tela cheia | Carregamento por área |
| `confirm()`/`alert()` do navegador | Diálogos acessíveis |
| Sem ajuda | Central de Ajuda com busca, FAQ e ajuda contextual |
| Pedido sem ID clicável, com erro ao abrir | Cartão marcado, sem ação, com explicação |
