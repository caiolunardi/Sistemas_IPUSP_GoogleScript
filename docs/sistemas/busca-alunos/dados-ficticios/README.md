# Dados fictícios — Gerenciador de Pessoas (Comunidade IPUSP) 1.4

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
