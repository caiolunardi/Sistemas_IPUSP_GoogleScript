# Homologação — planilha das secretarias (`Validacoes.gs` 1.1)

**Estado:** verificada localmente em 14/10/2026; **teste no Google pendente**. Esta página não atesta o que está colado no projeto da planilha.

## Base

- Código em uso recebido em 14/10/2026: igual ao `Validacoes.gs` do repositório (1.0), a menos das quebras de linha (CRLF) e da quebra final. SHA-256 da 1.0 no repositório: `fce96586f8c75f7152607bfe4ead1600c7defdd083ff423fd9eb40d230e07ff9`.
- Exportação `.xlsx` da planilha de 1º/2027, usada só para descrever a estrutura ([README](README.md#estrutura-do-arquivo)); não versionada (tem nomes de docentes e a referência a outra planilha).

## Fonte 1.1

| Arquivo | SHA-256 | Situação |
|---|---|---|
| `sistemas/estrutura-curricular/planilha-grade/Validacoes.gs` | `615a7d69ed20899d2278e0e8bdae0d3387eef6588cb9232216bc183af28c3331` | alterado |
| `sistemas/estrutura-curricular/testes/testar_validacoes_planilha.js` | `4c2633b918486d82e6fe3b5418b71d173d9d475311b1e313a414040ca642fa03` | novo |

O que mudou no código: `verificarConflito_` devolve o texto do conflito (a nota continua idêntica); `onEdit` junta os conflitos da edição e, no fim, chama `avisarConflitos_`, que abre a caixa "Conflito de horário". Nenhuma outra regra mudou.

## Verificação local

`node testar_validacoes_planilha.js` (pasta `sistemas/estrutura-curricular/testes`): **7 de 7** na 1.1. Na 1.0 o mesmo arquivo dá 2 de 7 (os 5 testes da caixa falham, como esperado).

| Teste | Confere |
|---|---|
| conflito | dia e início apagados, nota igual à 1.0, **uma** caixa com o mesmo texto, ordem nota → limpeza → caixa |
| sem conflito | sem caixa; a nota sai; encostar (08:00–10:00 × 10:00) não é conflito; outro semestre e a própria obrigatória sem caixa |
| colagem com dois conflitos | as duas linhas limpas e com nota; uma caixa com as duas |
| muitos conflitos | 10 por extenso e "e mais 2" |
| caixa indisponível | nota e limpeza valem; um aviso no log, sem dados da grade |
| Prática e outras abas | sem caixa |
| só `onEdit` | sem menu, acionadores ou serviços que pedem autorização |

`testar_auditoria_grade.js` (testes antigos da planilha, com o simulador e CSVs do Júpiter) não foi rodado nesta rodada por falta dos CSVs; o contexto dele não tem `SpreadsheetApp`, e a 1.1 trata isso como "caixa indisponível", sem erro. `testar_executor.js` continua 20 ok com a suíte nova no `rodar_suites.sh`.

## Roteiro no Google

Numa linha de teste (ou numa cópia da planilha), com conta de secretaria e com a sua:

1. Obrigatória do 3º semestre na terça às 10:00 (2 créditos). Numa Eletiva do 3º semestre, escolha terça e depois 11:00 → caixa "Conflito de horário"; ao clicar OK, Dia e Início vazios e a nota no Dia.
2. Repita deixando a caixa aberta por mais de 30 s → ao fechar, Dia e Início já estão vazios e a nota está lá.
3. Cole Dia/Início em duas optativas em conflito de uma vez → uma caixa só, com as duas.
4. Escolha um horário sem conflito → sem caixa, a nota antiga some.
5. Pelo app de celular, provoque um conflito → sem caixa; nota e limpeza acontecem.
6. **Execuções** do Apps Script sem erros.
7. Desfaça as linhas de teste.

Proteção por e-mail (`Protecao.gs`), depois de seguir o [manual](MANUAL_OPERACAO.md#proteção-por-e-mail):

1. Com uma conta de secretaria listada na aba Acesso para PSA, edite uma célula de PSA → grava; tente editar PSC → o Google recusa.
2. Com uma conta editora do arquivo que não está na aba Acesso, tente editar qualquer aba da grade → recusa.
3. Inclua essa conta direto na proteção de uma aba (Dados › Proteger páginas) e espere a verificação de hora em hora, ou execute `aplicarAcessoGrade` → a conta sai, e "Última aplicação" registra a remoção.
4. Rode um envio de teste da grade pelo Estrutura Curricular → grava normalmente (a conta do envio é a dona ou está autorizada em todas as abas).
5. **Execuções** sem erros.
