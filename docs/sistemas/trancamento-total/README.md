# Trancamento Total de Matrícula

**Versões:** formulário dos alunos **v1.3** (16/10/2026), sobre a v1.2 (recibo e confirmação), a v1.1 (IDs pelo `ID_INDEX`) e a v1.0 recebida em 15/10/2026; gerenciador da equipe **v1.1** no repositório, **não implantada** (o responsável funcional pediu para deixá-lo parado por enquanto). O código está em [`sistemas/trancamento-total/`](../../../sistemas/trancamento-total/README.md) e foi verificado localmente; **a v1.3 do formulário ainda não foi homologada no `/exec`**. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

São dois Web Apps sobre a mesma planilha de respostas:

- **Formulário (alunos):** o aluno, logado com a conta `@usp.br`, pede o trancamento total de matrícula. Substitui o antigo Google Forms e grava na mesma planilha, com a mesma estrutura de colunas.
- **Gerenciador (equipe):** o Serviço de Graduação lista os pendentes, conclui os pedidos e avisa o aluno por e-mail. Esta documentação trata principalmente do formulário; o gerenciador tem o resumo em [`gerenciador/README.md`](../../../sistemas/trancamento-total/gerenciador/README.md) e os dados e a segurança em [`DADOS_E_SEGURANCA_GERENCIADOR.md`](DADOS_E_SEGURANCA_GERENCIADOR.md) (sem autorização no servidor; implantação em uso com acesso "Somente eu").

## Funcionamento do formulário

- **Carga** (`obterDadosIniciais`): o e-mail vem sempre de `Session.getActiveUser()` e precisa terminar em `@usp.br`; sem isso, a página mostra **Login necessário** e não abre o formulário. Com login, o servidor procura o e-mail na planilha de alunos (`PLANILHA_ALUNOS`, colunas pelo título; e-mail principal ou secundário) para pré-preencher nome, nº USP e ano de ingresso, e lista os pedidos anteriores **do próprio e-mail** com a situação (**Pendente** ou **Concluído**). Se a planilha de alunos falhar, o formulário abre para preenchimento manual.
- **Campos:** nome, nº USP, ano de ingresso (4 dígitos, de 2000 ao ano atual), e-mail para contato (pré-preenchido com o e-mail USP), justificativa (**opcional** desde a v1.2, até 4.000 caracteres, com contador) e a confirmação SIM/NÃO (só SIM permite enviar).
- **Validação:** feita na página (erros no próprio campo, resumo acima do botão e foco no primeiro problema) e repetida no servidor, que é quem decide. O e-mail do pedido é o da sessão, nunca o que a página manda. Textos começando com `=`, `+`, `-` ou `@` recebem `'` na planilha para não virarem fórmula.
- **Pedido pendente (v1.2):** se o e-mail já tem um pedido que não está concluído, a página mostra o aviso e exige marcar **Sei que já tenho um pedido pendente e quero enviar um novo mesmo assim**. O servidor confere de novo, dentro da trava, e recusa sem a confirmação (`PEDIDO_PENDENTE`).
- **Gravação** (`registrarSolicitacao`): uma linha nova com `appendRow` na primeira aba da planilha de respostas (`TRANCAMENTO_TOTAL_MATRICULA`), Situação `pendente`, sob `LockService`. Colunas achadas pelo título; a da confirmação pelo começo do título ("Está ciente…"), com a 9ª coluna como reserva. O formulário não cria colunas; `Registro ID` e `Versão` ficam para o gerenciador.
- **Recibo (v1.2):** depois de gravar, o aluno recebe um e-mail em texto simples com os dados enviados, no e-mail do login, com cópia para o e-mail de contato quando for outro. Vai como **não responder** (`noReply`), então respostas não chegam à caixa do Serviço de Graduação, e nenhum e-mail é enviado à equipe. Se o recibo falhar, o pedido continua gravado e a tela de sucesso avisa.
- **Tema e ajuda (v1.2):** tema GRADIP Sistema/Claro/Escuro (`gradip-theme`), cabeçalho com marcas IPUSP/USP e Central de Ajuda estática, com gatilhos contextuais. Texto-fonte em [AJUDA.md](AJUDA.md).
- **Regras exibidas:** a seção **1. Sobre a solicitação** reproduz a Resolução CoG 3761/1990 e alterações. Na v1.2 saiu um parágrafo repetido (o período afastado não conta para cancelamento) e foram corrigidos "concedido ao(à) aluno(a)" e "ressalvados os casos".

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Instalação, atualização, configuração e diagnóstico. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda do formulário. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, implantação, e-mails e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Diferenças por versão, hashes e testes locais. |

## Versões do formulário

| Versão | Alterações |
|---|---|
| v1.0 (em uso até 15/10/2026) | IDs das duas planilhas literais no código; alunos pelas colunas A–D; cores fixas, sem tema nem ajuda; erros em `alert`; justificativa obrigatória e cortada em 4.000 caracteres sem aviso. |
| v1.1 | IDs pelo `ID_INDEX` (`PLANILHA_ALUNOS`, `TRANCAMENTO_TOTAL_MATRICULA`); alunos pelo título, com e-mail secundário; planilha de alunos fora do ar não bloqueia; confirmação pelo título; `appendRow`; justificativa longa recusada com mensagem; trava ocupada e erro de configuração com mensagens claras. |
| v1.2 | Recibo por e-mail ao aluno; confirmação para enviar com pedido pendente; justificativa opcional; texto das regras revisado; tema GRADIP e Central de Ajuda; validação no próprio campo e contador da justificativa. **Exige nova autorização do script** (envio de e-mail). |
| v1.3 (16/10/2026) | [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md): numa cópia do projeto, a propriedade `AMBIENTE` = `homologacao` faz as chaves serem lidas na coluna `Homologação` do `ID_INDEX`, com faixa de aviso na página e `[HOMOLOGAÇÃO]` no título e no assunto do recibo. Sem a propriedade, nada muda. |
