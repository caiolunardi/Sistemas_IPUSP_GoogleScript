# Dados fictícios — Gerenciador de Colação de Grau e Diplomas 4.0

Casos inventados, escritos à mão, para a aba `EMISSAO_DIPLOMAS` da planilha de permissões **de homologação** ([padrão](../../AMBIENTE_DE_HOMOLOGACAO.md#dados-fictícios-para-a-homologação)). Troque os e-mails `exemplo.invalid` pelas contas de teste reais **só na planilha de homologação**, nunca no Git.

| Arquivo | Aba |
|---|---|
| [`EMISSAO_DIPLOMAS.csv`](EMISSAO_DIPLOMAS.csv) | `EMISSAO_DIPLOMAS` em `PERMISSOES_DE_ACESSO` (homologação) |

| Linha | Caso | Resultado esperado |
|---|---|---|
| 2 | pessoa ADMINISTRADOR com observação | abre; topo com nome e observação; todos os botões |
| 3 | pessoa LEITOR sem observação | abre; topo só com o nome; faixa "Somente consulta"; nenhum botão que grava |
| 4 | setor sem N. USP e sem nome | abre como ADMINISTRADOR; topo com o e-mail e a observação |
| 5 | coringa `*@` | ignorada: quem não está em outra linha vê "Sem acesso" |
| 6 | perfil desconhecido | ignorada: "Sem acesso" |
| 7–8 | mesmo e-mail duas vezes (ADMINISTRADOR e LEITOR) | vale LEITOR |

## 4.0.1 — integridade (roteiro I1–I6 do [HOMOLOGACAO.md](../HOMOLOGACAO.md))

Linhas para as **cópias de homologação** da aba `Diplomas` ([`INTEGRIDADE_4.0.1_Diplomas.csv`](INTEGRIDADE_4.0.1_Diplomas.csv)) e da planilha central de alunos ([`INTEGRIDADE_4.0.1_Central.csv`](INTEGRIDADE_4.0.1_Central.csv)). Registro ID e Versão ficam vazios: a página do ADMINISTRADOR preenche ao abrir. Troque "(ID da pasta de teste)" e o link por uma pasta de teste criada dentro da raiz de homologação, só na planilha.

| Caso | Linhas | Resultado esperado |
|---|---|---|
| Mesma pessoa em duas colações; só a de 2026/2 tem o cache de pasta | Diplomas 2–3, Central 2 | excluir o registro de 2026/2: a pasta continua no Drive, com os arquivos; o "ID da Pasta" da central não muda; o registro de 2025/2 continua |
| Nº USP repetido na central | Diplomas 4, Central 3–4 | "Abrir/criar pasta" e envio de anexo param com a mensagem de Nº USP repetido; nenhuma pasta nova; nada gravado na central |
| Inclusão repetida | Diplomas 2–3 | "+ Adicionar Aluno" com 9000101 na colação 20262: recusado, nenhuma linha nova |
| Autocadastro temporário (só 4.0.1; **saiu na 4.1.0**, D6) | Diplomas 5 (sem linha na central) | 4.0.1: uma linha nova na central e uma pasta nova. 4.1.0: mensagem pedindo o cadastro pelo Gerenciador de Pessoas, nada criado |

## 4.1.0 — encaminhador (roteiro E1–E11 do [HOMOLOGACAO.md](../HOMOLOGACAO.md))

Os pedidos são criados **pelo formulário 2.x de homologação** com as contas de teste; as linhas abaixo mostram o que se espera em `PEDIDOS_COLACAO` e o que preparar nas outras planilhas. Valores entre parênteses são gerados pelo sistema e não se digitam. A aba `DECISOES_CADASTRO` é do Gerenciador de Pessoas (PR 5); até ele existir, a linha de decisão é digitada à mão **só na cópia de homologação**.

| Arquivo | Onde | Caso |
|---|---|---|
| [`ENCAMINHADOR_4.1.0_PROTOCOLOS.csv`](ENCAMINHADOR_4.1.0_PROTOCOLOS.csv) | `PEDIDOS_COLACAO` → `PROTOCOLOS` (gravado pelo formulário) | 0001 confirmado (E1–E4); 0002 sem cadastro (E5–E7); 0003 com registro manual na mesma colação (E8) |
| [`ENCAMINHADOR_4.1.0_Central.csv`](ENCAMINHADOR_4.1.0_Central.csv) | planilha central de homologação | 9000200 e 9000202 cadastrados; 9000201 **sem** linha até o passo E7 |
| [`ENCAMINHADOR_4.1.0_Diplomas.csv`](ENCAMINHADOR_4.1.0_Diplomas.csv) | aba `Diplomas` de homologação | registro manual de 9000202 em 20262 (E8) |
| [`ENCAMINHADOR_4.1.0_DECISOES_CADASTRO.csv`](ENCAMINHADOR_4.1.0_DECISOES_CADASTRO.csv) | `PEDIDOS_COLACAO` → `DECISOES_CADASTRO` | `APROVADO` para 0002, no passo E6, antes do cadastro na central |
