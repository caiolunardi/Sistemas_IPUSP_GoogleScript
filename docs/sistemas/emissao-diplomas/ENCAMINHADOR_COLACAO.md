# Encaminhador dos pedidos de colação (4.1.0)

PR 4 do [plano do Formulário de Colação de Grau](../pedido-colacao-grau/README.md). Código: [`DiplomasEncaminhador.gs`](../../../sistemas/emissao-diplomas/src/DiplomasEncaminhador.gs). Nenhum ID, URL nem dado real aqui.

## 1. Por que existe

Na 2.x, o Formulário de Pedido de Colação de Grau **não grava** na aba `Diplomas` nem na planilha central de alunos: grava o pedido na planilha própria `PEDIDOS_COLACAO` e os documentos numa subpasta por protocolo em `PASTA_PROVISORIOS_COLACAO`. Cada recurso tem um escritor só (decisão D4 do plano):

| Recurso | Quem grava |
|---|---|
| `PEDIDOS_COLACAO`: `PROTOCOLOS`, `VERSOES`, `DOCUMENTOS`, `EVENTOS` | Formulário |
| `PEDIDOS_COLACAO`: `DECISOES_CADASTRO` | Gerenciador de Pessoas (PR 5) |
| `PEDIDOS_COLACAO`: `ENCAMINHAMENTOS` | **Gerenciador de Diplomas** (este encaminhador) |
| `EMISSAO_DIPLOMAS`, aba `Diplomas` | **Gerenciador de Diplomas** (equipe e encaminhador, sob o mesmo `ScriptLock`) |
| `PLANILHA_ALUNOS` | Gerenciador de Pessoas (e a coluna "ID da Pasta", pelo Gerenciador de Diplomas, quando cria a pasta) |

Como o encaminhador roda dentro do projeto do Gerenciador de Diplomas, ele usa a mesma trava das ações da equipe: um pedido do formulário nunca entra ao mesmo tempo que uma exclusão, confirmação ou edição feita na tela.

## 2. Quando roda (D15)

- **Ao abrir a página**, para quem é ADMINISTRADOR (`executarEncaminhadorColacao`). Os pendentes aparecem numa faixa no topo, só para administradores. LEITOR não dispara nada.
- **Gatilho de tempo** (`encaminharPedidosColacaoPorGatilho`): não instalado. Decisão do responsável (D15, 10/11/2026): **só ao abrir a página**, sem gatilho de tempo: a equipe abre o Gerenciador para trabalhar, os pedidos esperam em segurança na planilha intermediária e o gatilho gastaria cota diária da conta que executa (cada ciclo levou cerca de 20 s na homologação). O código do gatilho fica, testado, para o caso de a decisão mudar (por exemplo, de hora em hora).

Cada execução trata até 25 pedidos e para depois de 4 minutos; o resto fica para a próxima. Se a trava estiver ocupada (outra execução, ou uma ação da equipe), a execução termina sem tocar em nada. Se faltar uma aba ou uma coluna da `PEDIDOS_COLACAO`, nada é gravado (falha fechada).

## 3. O que é encaminhado

Um pedido entra quando:

1. `PROTOCOLOS.Recebimento = RECEBIDO`;
2. o cadastro está confirmado: `PROTOCOLOS.Cadastro = CONFIRMADO`, ou a **última** linha do protocolo em `DECISOES_CADASTRO` tem `Decisão = APROVADO` (vale o Nº USP dessa linha, se preenchido). `REJEITADO` e `DUPLICIDADE` não entram; `PENDENTE` sem decisão espera;
3. a versão aplicada é a maior de `VERSOES` com `Situação = RECEBIDO`, e essa versão ainda não tem `ENCAMINHADO` nem `CORRECAO RETIDA` em `ENCAMINHAMENTOS`.

Para cada pedido, **tudo é conferido antes de gravar**:

- dados da versão (JSON com as chaves do legado) legíveis e colação no formato `AAAAS`;
- o Nº USP tem **exatamente uma** linha na planilha central (sem autocadastro, D6);
- a aba `Diplomas` tem todas as colunas necessárias (o encaminhador nunca cria coluna);
- o `Registro ID` do pedido aparece no máximo uma vez e, se já existe, com o mesmo Nº USP e a mesma colação;
- nenhum **outro** registro do mesmo Nº USP na mesma colação;
- todos os documentos da versão estão na subpasta do protocolo, dentro de `PASTA_PROVISORIOS_COLACAO`.

Depois:

1. pasta do aluno pela planilha central (a mesma função das ações da equipe, sem criar cadastro);
2. documentos movidos para a pasta do aluno com `moveTo` (o ID do arquivo não muda; um documento que já está lá não é movido de novo);
3. sem linha do `Registro ID`: a linha inteira é acrescentada de uma vez, com "Status — Dados Pessoais" vazio;
4. com linha (correção do aluno, D3): só se "Status — Dados Pessoais" estiver vazio, e só nas colunas que o aluno pode corrigir (nunca `Registro ID`, Nº USP, colação, status, etapas, pasta ou colunas da equipe); a `Versão` sobe. Com o status preenchido, nada muda e o resultado é `CORRECAO RETIDA`;
5. o **nome** gravado (linha nova ou correção) é sempre o da linha da planilha central, conferida pela equipe; o que o aluno digitou fica só no pedido (decisão do responsável de 11/11/2026, a partir da revisão independente). Só se a central estiver sem nome vale o do pedido;
6. conferência depois de gravar: uma linha só com aquele `Registro ID`, com o Nº USP e a colação esperados.

## 4. Aba `ENCAMINHAMENTOS` (contrato)

Na planilha `PEDIDOS_COLACAO`, criada pelo editor com `prepararEncaminhamentosColacao` (só cria se faltar; nunca apaga). Só inserção, uma linha por resultado.

| Coluna | Conteúdo |
|---|---|
| Quando | data e hora ISO 8601, com fuso |
| Protocolo ID | o da aba `PROTOCOLOS` |
| Versão | versão do pedido tratada |
| Resultado | `ENCAMINHADO`, `CORRECAO RETIDA` ou `BLOQUEADO` |
| Motivo | código (seção 5), às vezes seguido de `: detalhe` (por exemplo, o nome da coluna que falta); `CORRECAO_APLICADA` numa correção encaminhada |
| Registro ID | o do pedido |
| Origem | `ADMINISTRADOR` (página) ou `GATILHO` |

Um `BLOQUEADO` com o mesmo motivo do anterior não gera linha nova a cada ciclo. Resolvida a causa, a próxima execução tenta de novo e grava o novo resultado.

O formulário lê esta aba para a situação mostrada ao aluno, pela última linha de cada protocolo: `ENCAMINHADO` → "Em análise pela equipe"; `CORRECAO RETIDA` → "Correção em conferência"; outro valor → "Em conferência".

### Leitura de `DECISOES_CADASTRO` (contrato com o PR 5)

O encaminhador lê, por título: `Protocolo ID`, `Decisão` (`APROVADO`, `REJEITADO` ou `DUPLICIDADE`) e, opcionalmente, `Nº USP` e `Versão`. Vale a última linha de cada protocolo. A aba ausente conta como vazia.

## 5. Motivos de bloqueio

| Código | O que a equipe vê | Como resolver |
|---|---|---|
| `SEM_CADASTRO_CENTRAL` | Nº USP sem cadastro na planilha central | cadastrar pelo Gerenciador de Pessoas |
| `NUSP_REPETIDO_CENTRAL` | Nº USP em mais de uma linha da central | corrigir pelo Gerenciador de Pessoas |
| `REGISTRO_REPETIDO` | `Registro ID` em mais de uma linha da aba `Diplomas` | deixar uma linha só |
| `REGISTRO_DIVERGENTE` | a linha do `Registro ID` tem outro Nº USP ou outra colação | conferir a linha |
| `DUPLICIDADE_DIPLOMAS` | outro registro do mesmo Nº USP nesta colação | decidir qual fica (por exemplo, um incluído à mão) |
| `CABECALHO_AUSENTE` | falta uma coluna na aba `Diplomas` (o nome vem no detalhe) | restaurar o título |
| `PASTA_INDISPONIVEL` | pasta do aluno fora da raiz ou inexistente | conferir o "ID da Pasta" da central |
| `ARQUIVO_FORA_DA_ENTRADA` | documento fora da subpasta do protocolo | conferir na pasta de entrada |
| `DADOS_ILEGIVEIS` | dados da versão ilegíveis ou colação inválida | conferir a versão em `VERSOES` |
| `FALHA_CONFERENCIA` | a linha gravada não confere com o pedido | conferir a aba `Diplomas` |
| `FALHA` | erro inesperado | ver o registro de execução (sem dados pessoais) |

`CORRECAO RETIDA` vem com um de dois motivos: `STATUS_PREENCHIDO` (a equipe já começou a conferência) ou `DIVERGENCIA_APONTADA` (decisão do responsável de 10/11/2026: uma correção que traz divergência nova nos dados do cadastro, diferente da última versão encaminhada, não é aplicada). No segundo caso o aviso da equipe mostra o texto do aluno, lido da versão em `VERSOES` (até 300 caracteres, como texto); o texto não é copiado para `ENCAMINHAMENTOS`. A equipe confere e, se for o caso, corrige o cadastro pelo Gerenciador de Pessoas e o registro pela própria tela.

## 6. Mudança de comportamento junto (D6)

"Abrir/criar pasta" e o envio de anexo **não criam mais** a linha do aluno na planilha central. Sem cadastro, a mensagem é: "Este Nº USP não tem cadastro na planilha central de alunos. Nada foi criado. Cadastre o aluno pelo Gerenciador de Pessoas e tente de novo."

## 7. Funções pelo editor

Só rodam no contexto do dono do projeto (editor ou gatilho); quem abre a página recebe recusa.

| Função | O que faz |
|---|---|
| `prepararEncaminhamentosColacao` | cria a aba `ENCAMINHAMENTOS` se faltar; se existir, diz quais colunas faltam |
| `diagnosticarEncaminhamentosColacao` | contagens (recebidos, encaminhamentos, pendências por motivo), sem nomes nem IDs |
| `instalarGatilhoEncaminhadorColacao` | cria o gatilho de 5 minutos, sem duplicar (**não usar**: D15 = só ao abrir; mudar exige nova decisão do responsável) |
| `removerGatilhoEncaminhadorColacao` | remove o gatilho; a página continua encaminhando ao abrir |
| `encaminharPedidosColacaoPorGatilho` | a função do gatilho; pode ser rodada à mão para um ciclo |

## 8. Limites

- O `ScriptLock` não coordena o formulário nem o Gerenciador de Pessoas, mas eles não gravam nos recursos deste encaminhador. A planilha central pode ser editada à mão: a conferência de linha única é feita a cada pedido.
- Um pedido movido de pasta e bloqueado depois (por exemplo, falha na gravação da linha) fica com os documentos na pasta do aluno; a próxima execução reconhece que já estão lá.
- Nada é apagado: nem pedido, nem documento, nem linha.
