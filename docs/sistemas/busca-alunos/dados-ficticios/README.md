# Dados fictícios — Gerenciador de Pessoas (Comunidade IPUSP) 1.4 e 1.5

Casos inventados, escritos à mão, para a homologação da autorização no servidor ([padrão](../../AMBIENTE_DE_HOMOLOGACAO.md#dados-fictícios-para-a-homologação)). Nenhuma linha vem de cadastro real. Troque os e-mails `exemplo.invalid` pelas contas de teste reais **só nas planilhas de homologação**, nunca no Git. Com `AMBIENTE=homologacao`, o app lê a coluna `Homologação` do `ID_INDEX` para as quatro chaves abaixo; coluna vazia é erro, nunca cai para a produção.

| Arquivo | Onde vai (homologação) |
|---|---|
| [`PESSOAS_IPUSP.csv`](PESSOAS_IPUSP.csv) | aba `PESSOAS_IPUSP` na planilha de `PERMISSOES_DE_ACESSO` |
| [`ALUNOS.csv`](ALUNOS.csv) | primeira aba da planilha de `PLANILHA_ALUNOS` |
| [`SERVIDORES.csv`](SERVIDORES.csv) | primeira aba da planilha de `SERVIDORES` |
| [`DOCENTES.csv`](DOCENTES.csv) | primeira aba da planilha de `PLANILHA_DOCENTES` |

## `PESSOAS_IPUSP.csv`

| Linha | Caso | Resultado esperado |
|---|---|---|
| 2 | ADMINISTRADOR | abre; a ficha é editável **só se** a conta também for editora da planilha do cadastro |
| 3 | LEITOR | abre; busca e exporta; a ficha abre só para consulta |
| 4 | conta de setor, perfil em minúsculas | abre como LEITOR (o perfil não diferencia maiúsculas) |
| 5 | coringa `*@` | ignorada: quem não está em outra linha vê "Sem acesso a esta página" |
| 6 | grupo ou texto que não é e-mail completo | ignorada |
| 7 | perfil desconhecido (`EDITOR`) | ignorada: "Sem acesso a esta página" |
| 8 | perfil vazio | ignorada: "Sem acesso a esta página" |
| 9–10 | mesmo e-mail duas vezes (ADMINISTRADOR e LEITOR, com caixa diferente) | vale LEITOR |

Os roteiros que usam estes casos estão em [HOMOLOGACAO.md](../HOMOLOGACAO.md#v14--autorização-no-servidor).

## v1.5 — fila de cadastro (roteiro F1–F8)

Os pedidos são criados **pelo formulário 2.x de homologação**, com contas de teste; o CSV de protocolos mostra o que se espera ver em `PEDIDOS_COLACAO › PROTOCOLOS` (valores entre parênteses são gerados pelo sistema). Troque os e-mails `exemplo.invalid` pelas contas de teste **só nas planilhas de homologação**.

| Arquivo | Onde | Caso |
|---|---|---|
| [`FILA_CADASTRO_ALUNOS.csv`](FILA_CADASTRO_ALUNOS.csv) | planilha de alunos de homologação | 9000302 cadastrado com outro e-mail (F5); 9000303 para a recusa de F3 |
| [`FILA_CADASTRO_PROTOCOLOS.csv`](FILA_CADASTRO_PROTOCOLOS.csv) | `PEDIDOS_COLACAO › PROTOCOLOS` (gravado pelo formulário) | 9000301 sem cadastro (F1, F3 com 9000303, F4); 9000302 com outro e-mail (F5); 9000304 a rejeitar (F6) |
