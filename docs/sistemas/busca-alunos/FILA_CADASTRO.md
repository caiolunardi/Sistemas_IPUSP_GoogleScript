# Fila de cadastro dos pedidos de colação (v1.5)

PR 5 do plano do Formulário de Pedido de Colação de Grau. Código: [`PessoasFilaCadastro.gs`](../../../sistemas/busca-alunos/src/PessoasFilaCadastro.gs). Nenhum ID, URL nem dado real aqui.

## 1. Por que existe

O Formulário 2.x protocola o pedido mesmo quando não consegue confirmar quem é o aluno pela planilha de alunos (requisito 4 do plano): sem linha com o e-mail da sessão, e-mail ou nº USP repetido, nº USP digitado de outra pessoa, divergência apontada pelo aluno. Esses pedidos ficam com `Cadastro = PENDENTE` em `PEDIDOS_COLACAO › PROTOCOLOS`, e o Gerenciador de Diplomas não os leva à lista da colação até haver uma decisão `APROVADO`.

Um escritor por recurso: o Gerenciador de Pessoas é o único que grava `DECISOES_CADASTRO` e a planilha de alunos (além do "ID da Pasta", que o Gerenciador de Diplomas preenche). Ele **não** grava na aba `Diplomas` nem mexe nos documentos.

## 2. Quem vê e quem decide

- **LEITOR:** a fila não existe, nem como contador. `obterFilaCadastro` devolve só `{ visivel: false }`, sem abrir a planilha de pedidos.
- **ADMINISTRADOR:** vê a fila com os dados do pedido, os documentos (link do Drive: abre só para quem tem permissão na pasta de entrada) e os cadastros parecidos (mesmo nº USP ou mesmo e-mail).
- **Decidir:** ADMINISTRADOR que também é editor da planilha de alunos (a mesma regra da ficha). Sem isso, a fila aparece só para consulta.

## 3. O que entra na fila

`PROTOCOLOS.Recebimento = RECEBIDO`, `Cadastro = PENDENTE`, e nenhuma decisão do protocolo em `DECISOES_CADASTRO` (ou a última é `DUPLICIDADE`, marcação do sistema que pede correção da planilha de alunos). Os dados vêm da maior versão de `VERSOES` com `Situação = RECEBIDO`. O RG e os outros campos do pedido não vão para a página; só nome, nº USP, ano de ingresso, e-mail, divergência apontada e o motivo do formulário.

## 4. Decisões

Tudo é conferido no servidor, sob o `ScriptLock` do projeto, antes de gravar. O pedido precisa estar na fila na mesma versão que a página mostrou; senão: "Este pedido mudou ou já foi decidido por outra sessão" (o aluno corrigiu ou outra pessoa decidiu).

| Ação | Conferências | Grava |
|---|---|---|
| Vincular | linha da planilha de alunos conferida pelo nº USP e nome mostrados; nº USP preenchido e sem repetição | `APROVADO`, ação `VINCULADO`, com o nº USP do cadastro |
| Vincular + trocar e-mail (D7) | o e-mail do pedido não está em outra linha; a célula não mudou desde a leitura | também a coluna `eMail` da linha; `E-mail anterior` e `E-mail novo` na decisão |
| Criar | nº USP só dígitos e sem cadastro; nome não vazio; ingresso `AAAA/S` ou vazio; e-mail do pedido em nenhuma linha | linha nova na planilha de alunos (nº USP, nome, ingresso, e-mail), relida depois: nº USP repetido → `DUPLICIDADE` (o pedido volta à fila); senão `APROVADO`, ação `CRIADO` |
| Rejeitar | motivo obrigatório (até 300 caracteres) | `REJEITADO`, com o motivo; e-mail ao aluno com o motivo (abaixo) |

O formulário só pergunta o **ano** de ingresso; o semestre é conferido pela equipe ao criar o cadastro (a página não preenche um semestre).

## 5. Aba `DECISOES_CADASTRO` (contrato)

Na planilha `PEDIDOS_COLACAO`, criada pelo editor com `prepararDecisoesCadastro` (só cria se faltar; nunca apaga). Só inserção, uma linha por decisão.

| Coluna | Conteúdo |
|---|---|
| Quando | data e hora ISO 8601, com fuso |
| Protocolo ID | o da aba `PROTOCOLOS` |
| Versão | versão do pedido decidida |
| Decisão | `APROVADO`, `REJEITADO` ou `DUPLICIDADE` |
| Nº USP | o confirmado (vazio na rejeição) |
| Ação | `VINCULADO`, `CRIADO` ou `REJEITADO` |
| E-mail anterior, E-mail novo | só quando o e-mail principal foi trocado |
| Motivo | da rejeição ou da duplicidade |
| Quem | e-mail de quem decidiu |

Leitores: o formulário lê `Protocolo ID` e `Decisão` (situação mostrada ao aluno; `REJEITADO` libera um pedido novo na mesma colação); o encaminhador do Gerenciador de Diplomas lê `Protocolo ID`, `Decisão` e `Nº USP` (vale a última linha de cada protocolo).

## 6. Limites

- A página do Gerenciador de Pessoas está com **Quem pode acessar: somente eu** (manifesto da v1.4). Enquanto não for aberta a outras contas (decisão separada, depois da homologação), só a conta que implanta usa a fila.
- A conta que executa o projeto precisa de edição na planilha `PEDIDOS_COLACAO` (para gravar `DECISOES_CADASTRO`) e na planilha de alunos.
- "Corrigir os dados informados" pelo pedido não existe nesta versão: a equipe escolhe o cadastro certo (ou digita os dados ao criar), e o aluno corrige o pedido pelo formulário.
- Rejeição: o aluno recebe um e-mail (decisão do responsável de 11/11/2026), enviado pela conta que executa o projeto, só para o e-mail da sessão do pedido, sem resposta, com protocolo, colação e o motivo escrito pela equipe; sem nº USP, nome, RG nem anexos; assunto com `[HOMOLOGAÇÃO]` fora da produção. A tela avisa a equipe, junto do campo, que o motivo vai para o aluno. Enviado depois de gravar a decisão e fora da trava: se falhar, a rejeição fica, a tela avisa a equipe e o aluno ainda vê a situação em "Meus pedidos". O registro de execução diz só que o envio falhou.
- Aprovação não gera e-mail; o aluno vê a situação em "Meus pedidos".
