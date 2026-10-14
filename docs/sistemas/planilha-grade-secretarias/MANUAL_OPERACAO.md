# Manual de operação — planilha das secretarias

Para o Serviço de Graduação. O que as secretarias veem está no [README](README.md#validações-validacoesgs-gatilho-simples-onedit).

## Atualizar o código (ex.: 1.0 → 1.1)

1. Abra a planilha das secretarias › **Extensões › Apps Script**.
2. Abra o arquivo **`Validacoes`**, apague todo o conteúdo e cole o de [`Validacoes.gs`](../../../sistemas/estrutura-curricular/planilha-grade/Validacoes.gs). Salve.
3. Não há nada para executar nem autorizar: o `onEdit` é automático e a caixa de aviso não pede permissão nova.
4. Faça o [teste rápido](HOMOLOGACAO.md#roteiro-no-google) numa linha de teste e desfaça depois.

O projeto deve ter **só** esse arquivo. A primeira instalação (limpeza dos 25 arquivos antigos, acionadores e propriedades) está no [passo a passo da migração](../../../sistemas/estrutura-curricular/planilha-grade/README.md#passo-a-passo-na-planilha-extensões--apps-script-da-planilha-das-secretarias).

## Proteções

Em **Dados › Proteger páginas e intervalos**, nas 6 abas da grade:

| Intervalo | Quem edita | Por quê |
|---|---|---|
| M4:M999 (Horário de Fim) | só o Serviço de Graduação | é fórmula gravada pelo envio |
| C, D, E, I, J (linhas 4–999) | recomendado: só o Serviço de Graduação | vêm do Júpiter pelo envio; a validação de conflito depende de E, I e J |
| linhas 1–3 | só o Serviço de Graduação | cabeçalho conferido pelo envio |

O envio da grade roda com a conta do Estrutura Curricular, que precisa continuar podendo editar esses intervalos.

## Novo semestre

Não se faz na planilha. Pelo Estrutura Curricular: **Enviar Grade para Preenchimento** copia a planilha atual para a pasta de cópias, registra no índice das grades anteriores, apaga B4:S999, grava as disciplinas e a fórmula do fim e renomeia o arquivo ([manual do Estrutura Curricular](../estrutura-curricular/MANUAL_OPERACAO.md)). O código da planilha não muda entre semestres.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| A secretaria diz que "o horário sumiu" | conflito com uma obrigatória do mesmo semestre ideal | ver a nota na célula do Dia da semana; escolher outro dia ou horário |
| Sumiu sem caixa de aviso | edição pelo app de celular, ou colagem com mais de 50 linhas (não verificada) | no celular, a nota explica; colagens grandes: colar em partes |
| Nenhuma validação acontece | arquivo `Validacoes` ausente, com erro de sintaxe ou com outro `onEdit` no projeto | abrir o Apps Script, conferir que há só esse arquivo; ver **Execuções** |
| Conflito não detectado | tipo diferente de "Obrigatória/Eletiva/Livre" em E, semestre ideal vazio, créditos vazios ou horário digitado fora do formato HH:mm | corrigir a linha (E, I e J vêm do envio) |
| Horário de Fim com erro | fórmula de M apagada ou coluna com tipo/lista | reenviar a grade pelo Estrutura Curricular (grava a fórmula de novo) |
| Lista suspensa não aparece nas linhas de baixo | as listas do modelo vão só até a linha 91–92 | estender as regras de validação de dados até a linha 999 |

## Conferir execuções

**Apps Script › Execuções** mostra cada `onEdit`. Erros aparecem como "Validação da grade falhou: …" ou "Aviso de conflito não exibido: …" (só a mensagem técnica, sem dados da grade).
