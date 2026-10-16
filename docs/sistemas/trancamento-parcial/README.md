# Trancamento Parcial de Matrícula

**Versões:** formulário dos alunos **v1.1** (16/10/2026), sobre a v1.0 recebida no mesmo dia. O código está em [`sistemas/trancamento-parcial/`](../../../sistemas/trancamento-parcial/README.md) e foi verificado localmente; **a v1.1 ainda não foi homologada no `/exec`**. O gerenciador da equipe não está no repositório e fica parado por decisão do responsável funcional. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

O aluno, logado com a conta `@usp.br`, pede o trancamento de matrícula em uma ou mais disciplinas do semestre, dentro do período de trancamento parcial. O pedido vai para a planilha de respostas, que o gerenciador da equipe lê para cadastrar o trancamento e avisar o aluno.

## Funcionamento do formulário

- **Período:** a linha "Pedido de Trancamento Parcial de Matrícula" da planilha de Períodos (`PERIODOS`, a mesma que o Painel dos servidores edita) diz quando o formulário abre e fecha no 1º e no 2º semestre, ou se é Contínuo. Fora do período aparece **Formulário fechado no momento**. As datas aparecem no título, nas regras e na declaração de ciência. O período é conferido de novo no envio.
- **Carga** (`obterDadosIniciais`): o e-mail vem sempre de `Session.getActiveUser()` e precisa ser `@usp.br`. O servidor procura o e-mail na planilha de alunos (`PLANILHA_ALUNOS`, pelo título; e-mail principal ou secundário) para pré-preencher nº USP e nome, e lista os pedidos anteriores **do próprio e-mail**, com situação e disciplinas. A planilha de alunos é só lida: a v1.0 cadastrava ali o aluno não encontrado, e isso saiu.
- **Disciplinas pelo código** (`obterCatalogoDisciplinas`): logo depois da carga, a página recebe do cadastro DISCIPLINAS (aba `DISCIPLINAS`, títulos em `snake_case`) só `codigo`, `nome` e `creditos_aula`. Ao digitar o código, o nome e os créditos aparecem. Um código de `codigos_anteriores` é trocado pelo atual, com aviso. Linha `Substituída` só vale se nenhuma outra tiver o mesmo código. Código fora do cadastro (por exemplo, optativa de outra unidade) libera o campo do nome. Se o cadastro não carregar, o aluno digita código e nome de todas. Catálogo em cache por 1 hora.
- **Campos:** declaração de ciência (**Ciente**), e-mail do login (só leitura), nº USP, nome, créditos-aula matriculados (1 a 99), as perguntas "menos de 12 créditos-aula" e "concluirá o curso" (Sim/Não, respondidas pelo aluno: o app não tem a matrícula dele), de 1 a 6 disciplinas na ordem de preferência e justificativa **opcional** (até 4.000 caracteres, com contador). O ano de ingresso saiu: só servia para o cadastro automático e não há coluna para ele nas respostas.
- **Validação:** na página (erro no campo, resumo e foco no primeiro problema) e de novo no servidor, que decide. No servidor, o nome de um código cadastrado vem do cadastro, não da página; disciplina repetida (inclusive pelo código antigo) é recusada.
- **Gravação** (`registrarSolicitacao`): `appendRow` na primeira aba da planilha de respostas (`TRANCAMENTO_PARCIAL_MATRICULA`), sob `LockService`, com Situação `pendente`, ciência `Ciente` e cada disciplina como `CÓDIGO - Nome`. Colunas achadas pelo título; a da ciência pelo começo ("Declaro estar ciente"), já que o título traz as datas. O formulário não cria colunas e não escreve nas colunas do gerenciador.
- **Mais de um pedido:** permitido até o fim do prazo, como diz a regra exibida. Os pedidos anteriores aparecem no topo, sem bloqueio.
- **Recibo:** e-mail em texto simples ao e-mail do login, com as disciplinas, os dados enviados, o prazo de atendimento e as datas para conferir o histórico. Vai como **não responder** (`noReply`); nenhum e-mail vai para a caixa do Serviço de Graduação. Se falhar, o pedido continua gravado e a tela de sucesso avisa.
- **Tela de sucesso:** lista as disciplinas gravadas e mantém os botões **Voltar para a página de formulários** (Painel de Solicitações) e **Enviar nova solicitação** (o próprio `/exec`, obtido no servidor).
- **Tema e ajuda:** tema GRADIP Sistema/Claro/Escuro (`gradip-theme`), cabeçalho com marcas IPUSP/USP e Central de Ajuda estática com gatilhos contextuais. Texto-fonte em [AJUDA.md](AJUDA.md).

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
| v1.0 (em uso até 16/10/2026) | IDs de três planilhas literais; colunas por posição fixa (A–S); cadastro automático do aluno não encontrado; disciplina em texto livre ("sigla e nome"); ano de ingresso pedido; justificativa obrigatória e cortada em 4.000 caracteres sem aviso; erros em `alert`, mensagem técnica visível; sem tema nem ajuda. |
| v1.1 | IDs pelo `ID_INDEX` (`PLANILHA_ALUNOS`, `TRANCAMENTO_PARCIAL_MATRICULA`, `PERIODOS`, `DISCIPLINAS`); disciplinas pelo código com o cadastro DISCIPLINAS; colunas pelo título; sem cadastro automático e sem ano de ingresso; justificativa opcional; recibo ao aluno; tema GRADIP e Central de Ajuda; validação no campo; tela de sucesso com as disciplinas. **Exige nova autorização do script** (envio de e-mail). |
