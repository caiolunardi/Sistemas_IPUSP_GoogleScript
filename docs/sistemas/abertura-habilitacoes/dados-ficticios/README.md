# Dados fictícios — Gerenciador de Abertura de Habilitações

Casos **inventados** para montar a planilha de homologação, no padrão de [dados fictícios para a homologação](../../AMBIENTE_DE_HOMOLOGACAO.md#dados-fictícios-para-a-homologação). Nenhuma linha veio da planilha real. Os testes "CSV de dados fictícios" de [`testar_backend.js`](../../../../sistemas/abertura-habilitacoes/gerenciador/testes/testar_backend.js) conferem, a cada push, que estes arquivos produzem o resultado esperado abaixo.

## Arquivos

| Arquivo | Aba da cópia |
|---|---|
| [`respostas-ao-formulario-2.csv`](respostas-ao-formulario-2.csv) | `Respostas ao formulário 2` |
| [`gerenciador-habilitacoes.csv`](gerenciador-habilitacoes.csv) | `GERENCIADOR_HABILITACOES` da planilha de permissões de homologação (desde a 2.1), se ela for uma cópia; ver [a lista de acesso](#lista-de-acesso-gerenciador-habilitacoescsv) |

A aba `2021 - 2022` não tem CSV porque os títulos reais dela não foram conferidos. Na cópia, digite à mão 2 ou 3 linhas inventadas seguindo os títulos dela, e use em uma delas o nome `Aluno Teste 07`, para o teste B4 (o mesmo nome nas duas abas).

## Colunas

A ordem é a da planilha real, conferida pelo `diagnosticarPlanilha` na homologação de 21/10/2026: A carimbo, B e-mail do formulário, C (título não conferido; sem uso pelo gerenciador, fica vazia), D Nº USP, E Nome, F E-mail USP, G ano, H trancamento, I programa, **J** comentários do formulário (usada como Observações, como na 1.0), **K** Situação, L Registro ID, M Versão, N E-mail Enviado, O Data de Conclusão.

## Casos

| Linha | Pessoa | O que testa |
|---|---|---|
| 2 | Aluno Teste 01 | pendente comum (K vazia), Bacharelado |
| 3 | Aluno Teste 02 | pendente com K = `pendente`, observação e Versão 3 |
| 4 | Aluno Teste 03 | concluído com aviso registrado, as duas habilitações |
| 5 | Aluno Teste 04 | concluído sem aviso |
| 6 | Aluno Teste 05 | sem Registro ID e sem Versão |
| 7 | Aluno Teste 06 | situação antiga (`Em análise`) e primeiro de um ID repetido |
| 8 | Aluno Teste 07 | mesmo Registro ID da linha 7 |
| 9 | Aluno Teste 08 | sem e-mail; programa fora da lista |
| 10 | Aluno Teste 09 | Versão `0` (malformada) |
| 11 | Aluno Teste 10 | Versão `abc` (malformada) |
| 12 | Aluno Teste 11 | carimbo em texto que não vira data |
| 13 | Álvaro Fictício Teste | nome com acento, para a busca com e sem acento |

## Como importar

1. Na cópia de homologação da planilha de respostas, abra a aba `Respostas ao formulário 2` (só com a linha de títulos) e selecione A1.
2. **Arquivo → Importar → Fazer upload**, escolha o CSV, marque "Substituir dados a partir da célula selecionada", separador "Vírgula" e "Converter texto em números, datas e fórmulas".
3. Confira que o nome ficou na coluna E e que a coluna C ficou vazia. Se o título da coluna C da sua cópia sumiu, digite-o de novo (ele não é usado pelo gerenciador).
4. Para os testes de aviso (C3, C4), troque **na cópia** o e-mail da linha usada pelo da sua caixa de teste. Os demais continuam em `@exemplo.invalid` e não recebem nada.

## Resultado esperado

`diagnosticarPlanilha`:

- `linhasComNome` 12, `pendentes` 10, `concluidos` 2, `reservasDeEnvio` 0;
- nenhuma coluna obrigatória `ausente`; `tituloJ` = `Comentários, sugestões, elogios ou críticas.`; `tituloK` = `Situação`;
- `migracao`: `precisaMigrar` true, `semIdentificador` [6], `identificadoresRepetidos` [8], `versaoAusente` [6], `versaoMalformada` [10, 11], código no formato `MIGRAR-1-1-1-0-…`.

`diagnosticarMigracaoRegistroId`, rodado duas vezes: o mesmo código nas duas. Os 16 caracteres finais dependem do conteúdo da cópia depois da importação; não precisam ser iguais aos do teste automático.

Telas: Pendentes com 10 pedidos em ordem alfabética (linha 6 sinalizada sem identificador; linhas 7 e 8 com ID repetido; linhas 10 e 11 com "Versão inválida", sem edição); Concluídos com 2.

## Lista de acesso (`gerenciador-habilitacoes.csv`)

Colunas na ordem da aba real: A N. USP, B Nome, C e-mail, D Observação, E Perfil. Nº USP na faixa 99000NN e e-mails `@exemplo.invalid`, inventados.

| Linha | Conta | O que testa | Cabeçalho esperado |
|---|---|---|---|
| 2 | `admin.teste@` | ADMINISTRADOR com nome e observação | "Pessoa Administradora Teste" / "Equipe Fictícia do Serviço de Graduação" |
| 3 | `leitor.teste@` | LEITOR | "Pessoa Leitora Teste" / "Comissão Fictícia de Graduação" |
| 4 | `semnome.teste@` | sem nome nem observação | o e-mail, sem segunda linha |
| 5 | `semperfil.teste@` | sem perfil | página "Sem acesso" e evento `ACESSO.NEGAR` na auditoria |
| 6–7 | `dup.teste@` | mesmo e-mail duas vezes (caixa diferente) | vale o menor perfil (LEITOR); nome e observação da primeira linha preenchida |

Na homologação real, as contas `@exemplo.invalid` não entram. Para testar, troque **na cópia** o e-mail das linhas 2 e 3 pelos das suas contas de teste, ou acrescente linhas com elas e o nome e observação que quiser ver. Se a homologação lê a planilha de permissões real (escolha de 21/10/2026), não importe este arquivo nela: só acrescente as contas de teste.
