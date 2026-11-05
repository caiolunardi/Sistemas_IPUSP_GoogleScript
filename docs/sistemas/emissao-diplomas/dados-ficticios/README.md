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
