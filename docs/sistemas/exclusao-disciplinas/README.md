# Exclusão de Disciplinas

**Versões:** formulário dos alunos **v1.1** (16/10/2026), sobre a v1.0 recebida no mesmo dia. O código está em [`sistemas/exclusao-disciplinas/`](../../../sistemas/exclusao-disciplinas/README.md) e foi verificado localmente; **a v1.1 ainda não foi homologada no `/exec`**. O gerenciador da equipe não está no repositório e fica parado por decisão do responsável funcional. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

O aluno, logado com a conta `@usp.br`, pede a exclusão de matrícula em uma ou mais disciplinas do semestre, dentro do período de exclusão. Os pedidos são processados pelo Serviço de Graduação por ordem de chegada. A exclusão é irreversível depois de processada.

## Quem lê a planilha de respostas

| Sistema | O que lê | Como |
|---|---|---|
| Este formulário | e-mail (B), disciplina (J), turma (K), Pedido ID (L), Situação (T) | por posição, para mostrar ao aluno os próprios pedidos |
| Painel dos servidores | e-mail (B), disciplina (J), Situação (T) | por posição, para contar alunos com pedido pendente |
| Gerenciador da equipe (fora do repositório) | Pedido ID (L), Situação (T) e o resto do pedido | por posição |

Por isso a ordem das colunas é a mesma da v1.0 e não pode mudar sem mudar os três.

## Funcionamento do formulário

- **Período:** a linha "Formulário de Exclusão de Disciplinas" da planilha de Períodos (`PERIODOS`) diz quando o formulário abre e fecha no 1º e no 2º semestre (D–K) e as datas de retificação do Calendário Escolar (N/O para o 1º semestre, P/Q para o 2º). O Painel dos servidores tem uma tela própria para essa linha e grava sempre Sazonal. O formulário fica fechado fora da janela, com outro tipo, sem a linha, sem as datas de retificação da janela aberta ou quando a planilha não abre. As datas valem como texto ou como Data do Sheets. O período é conferido de novo no envio.
- **Texto do requerimento:** o mesmo da v1.0, com o semestre, o ano (da data de abertura), as datas de retificação, a abertura e o horário/data de encerramento. O parágrafo "Atenção" usa o horário de encerramento com a data de **fim da retificação** (regra confirmada com o Serviço de Graduação na v1.0).
- **Carga** (`obterDadosIniciais`): o e-mail vem sempre de `Session.getActiveUser()` e precisa ser `@usp.br`. O servidor procura esse e-mail na planilha de alunos (`PLANILHA_ALUNOS`, pelo título; e-mail principal ou secundário) para pré-preencher nome, nº USP e ano de ingresso (os 4 dígitos de "Ingresso"), e lista os pedidos anteriores **do próprio e-mail**. A busca de aluno não é chamável pela página. A planilha de alunos é só lida: o cadastro automático da v1.0 saiu.
- **Campos:** e-mail do login (só leitura), nome, nº USP, ano de ingresso, curso/habilitação (uma ou mais das três opções), "concluirá o curso neste semestre?", declaração de ciência (**Ciente**), de 1 a 6 disciplinas com código e turma, e observações **opcionais** (até 4.000 caracteres, com contador).
- **Disciplinas pelo código:** igual ao Trancamento Parcial. A página recebe do cadastro DISCIPLINAS só `codigo`, `nome` e `creditos_aula`; o nome aparece ao digitar o código; um código de `codigos_anteriores` vira o atual, com aviso; código fora do cadastro (ou cadastro fora do ar) aceita o nome digitado. Disciplina repetida no mesmo pedido é recusada. A **turma** é texto livre (até 20 caracteres): o aluno pode escrever só "01".
- **Pedidos anteriores:** no topo, agrupados pelo Pedido ID (linhas antigas sem Pedido ID valem uma por pedido), com selo **Pendente**/**Concluído**, data e disciplinas com turma. Um pedido fica pendente enquanto alguma disciplina não tiver "conclu" na Situação (T), o mesmo critério do Painel. Se o aluno digita uma disciplina que já está num pedido pendente, aparece um aviso que não impede o envio.
- **Validação:** na página (erro no campo, resumo e foco no primeiro problema) e de novo no servidor, que decide. No servidor, o nome de um código cadastrado vem do cadastro; curso só aceita as três opções; ano de ingresso de 1950 até o ano atual; texto que começa com `=`, `+`, `-` ou `@` recebe apóstrofo para não virar fórmula.
- **Gravação** (`registrarSolicitacao`): sob `LockService`, numa só escrita, uma linha por disciplina em A–P da aba "Respostas ao formulário 1" (ou da primeira, se renomeada), depois de conferir que A e B são "Carimbo de data/hora" e "Endereço de e-mail". Todas as linhas do envio têm o mesmo carimbo e o mesmo Pedido ID. Q–T nunca são escritas.
- **Recibo:** e-mail em texto simples ao e-mail do login, com as disciplinas e turmas, os dados enviados, a ordem de chegada, o lembrete de que a exclusão é irreversível e o contato gradip@usp.br. Vai como **não responder** (`noReply`); nenhum e-mail vai para a caixa do Serviço de Graduação. Se falhar, o pedido continua gravado e a tela de sucesso avisa.
- **Tela de sucesso:** lista as disciplinas gravadas e tem os botões **Voltar para a página de formulários** (Painel de Solicitações) e **Fazer nova solicitação** (o próprio `/exec`).
- **Tema e ajuda:** tema GRADIP Sistema/Claro/Escuro (`gradip-theme`), cabeçalho com marcas IPUSP/USP e Central de Ajuda estática com gatilhos contextuais. Texto-fonte em [AJUDA.md](AJUDA.md).

## Planilha de respostas (posições)

| Col. | Conteúdo | Quem grava |
|---|---|---|
| A | Carimbo de data/hora (Data) | formulário |
| B | Endereço de e-mail (do login) | formulário |
| C | Nº USP (só dígitos) | formulário |
| D | Nome completo | formulário |
| E | E-mail USP (vazia, mantida pelo histórico) | — |
| F | Ano de ingresso | formulário |
| G | Curso/Habilitação, separados por " + " | formulário |
| H | Concluirá o curso neste semestre? (Sim/Não) | formulário |
| I | Declaração de ciência (`Ciente`) | formulário |
| J | Disciplina, `CÓDIGO - Nome` | formulário |
| K | Turma | formulário |
| L | Pedido ID (UUID por envio) | formulário |
| M–O | vazias (histórico) | — |
| P | Observações | formulário |
| Q–S | fluxo antigo | — |
| T | Situação (`concluído` = resolvido) | gerenciador |

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
| v1.0 (em uso até 16/10/2026) | IDs de três planilhas literais; e-mail digitável e gravado como veio da página; busca de aluno pública por qualquer e-mail; período só conferido na abertura, aberto em caso de erro; cadastro automático do aluno; disciplina em texto livre ("sigla e/ou nome"); mais de 6 disciplinas cortadas em silêncio; recibo com resposta para gradip@usp.br; erro só no fim da página; sem tema nem ajuda. |
| v1.1 | IDs pelo `ID_INDEX` (`PLANILHA_ALUNOS`, `EXCLUSAO_DISCIPLINAS`, `PERIODOS`, `DISCIPLINAS`); identidade só pela sessão `@usp.br`; período fechado em caso de erro e conferido no envio; disciplinas pelo código e turma livre; pedidos anteriores e aviso de disciplina já pendente; sem cadastro automático; fórmula neutralizada; recibo "não responder"; tema GRADIP, Central de Ajuda e validação no campo; `diagnosticarConfiguracao()`. Mesmas colunas da v1.0. |
