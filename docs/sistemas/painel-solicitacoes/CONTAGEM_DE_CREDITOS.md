# Contagem de créditos — Painel de Solicitações (v1.3)

Ferramenta em **Formação e conclusão** que mostra ao aluno o que falta para se formar, conforme as regras do seu currículo. Substitui a planilha Excel publicada no site, que só conhecia obrigatórias, eletivas e livres de um currículo genérico.

## Origem das regras

As regras vêm da planilha de **Regras Curriculares**, mantida pela equipe no [Painel dos servidores](../painel-servidores/README.md). O painel dos alunos só **lê** essa planilha, localizada pela chave `REGRAS_CURRICULARES` do índice mestre `ID_INDEX`.

| Aba | O que é usado |
|---|---|
| `CURRICULOS` | Apenas rulesets com `status` = `ATIVO`: curso, habilitação, estrutura curricular, versão, semestres mínimo/máximo e `excedente_eletivas_compensa_livres`. |
| `REQUISITOS_NUMERICOS` | Requisitos ativos: critério, operador, valor e unidade. |
| `DISCIPLINAS` | Disciplinas ativas com `tipo_regra` `OBRIGATORIA` (lista para marcar) ou `GRUPO`. |
| `GRUPOS_REGRAS` | Grupos ativos `ONE_OF`, `MIN_COUNT` e `MIN_CREDITS`. |
| `DICIONARIO` | Rótulos dos critérios e dos operadores. |

As colunas são localizadas pelo nome do cabeçalho. Coluna ausente ou duplicada gera erro claro em vez de conta errada. Observações internas não são enviadas ao navegador.

## Fluxo do aluno

1. Marca as habilitações que tem abertas (por exemplo Psicólogo, Bacharelado, Licenciatura).
2. Para cada habilitação marcada aparece uma seção. Se houver mais de uma estrutura curricular ativa para ela, o aluno escolhe a sua.
3. Preenche os números (créditos obrigatórios, eletivos, livres, horas etc.) e marca as disciplinas obrigatórias e de grupos já cursadas. Uma disciplina comum a duas habilitações é marcada uma vez só.
4. Clica em **Ver o que falta para me formar**. O resultado traz um resumo por habilitação e, em cada uma, os itens cumpridos e o que falta.

A conta é feita **no navegador**. Nada do que o aluno digita vai ao servidor ou é gravado; o que foi digitado fica guardado só enquanto a página está aberta.

## Regras da conta (decididas pelo responsável funcional em 14/10/2026)

- **Campo em branco vale zero.**
- **Obrigatórias são exatas:** não doam sobra nem recebem compensação.
- **Eletivas a mais contam como livres** quando o currículo tem `excedente_eletivas_compensa_livres` = `SIM`. Com `NAO`, não há compensação. Com o campo vazio, não há compensação e o resultado avisa para confirmar com o Serviço de Graduação.
- **Uma contagem por habilitação:** cada habilitação marcada é conferida pelo seu próprio currículo.
- Grupos: `MIN_CREDITS` usa o número digitado; `ONE_OF` e `MIN_COUNT` contam as disciplinas marcadas.
- Requisito com operador que o sistema não reconhece aparece "sem conta automática", sem bloquear o resto.

A planilha antiga também deixava sobra de obrigatórias e de livres cobrir eletivas. Esse modo (`compensacao: "PLANILHA"`) existe no motor só para os testes reproduzirem as fórmulas do Excel; o painel usa o modo do currículo.

## Interpretação dos critérios

O tipo de crédito (obrigatório, eletivo, livre) é deduzido do código do critério, do `campo_parser=` da descrição no `DICIONARIO` ou do rótulo: precisa mencionar crédito e exatamente um dos tipos. Critérios como horas de estágio ou créditos totais ficam como "outros" e são conferidos sem compensação. Os operadores aceitam símbolos (`>=`), códigos (`GTE`, `MAIOR_IGUAL`) ou o rótulo do dicionário. Como os códigos reais podem variar, execute `diagnosticarContagemCreditos()` no editor depois de instalar e confira o registro.

## Limites

O resultado é uma estimativa a partir do que o aluno digitou e não substitui a análise do Serviço de Graduação, como a própria tela informa. Rulesets em `RASCUNHO` ou `INATIVO` não aparecem. Alterações nas Regras Curriculares chegam ao painel em até 5 minutos (cache).
