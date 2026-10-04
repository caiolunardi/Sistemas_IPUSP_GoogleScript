# UX e interface — Estrutura Curricular e Grade Horária

## Identidade

A interface segue o GRADIP Design System, com Sistema / Claro / Escuro e marcas IPUSP/USP próprias para o tema.

O material registra uma pendência: a cópia local de `GradipTema.html` usa uma correção de contraste de `--gradip-border-strong` ainda não propagada ao `shared/` central.

## Áreas principais

A partir da 1.7.0: `Estrutura curricular` e `Auditoria da grade` no topo.

## Consulta

Busca por código/nome sem acento/caixa, filtros combináveis, ordenação, download CSV, ficha detalhada, currículos e histórico.

Estados são comunicados por texto e cor. Obrigatória/Eletiva/Livre usam a mesma convenção visual da grade.

## Preparação em etapas

A interface diferencia dados oficiais, ajustes locais, seleção não persistida, item efetivamente adicionado e prévia antes de escrita destrutiva.

## Modais

Decisão particular do app: janelas não fecham por ESC nem clique fora; apenas controles explícitos. A justificativa registrada é evitar perda acidental de arquivo/dados em edição.

## Revisão do PDF

Valores exclusivos do PDF são paginados com página de origem. No OCR, a confirmação depende de percorrer as páginas exigidas e de validação server-side.

## Auditoria como painel

A 1.8.0 remove o link da planilha crua de auditoria e privilegia cartões, listas, gráficos, timeline e histórico por disciplina.

## Responsividade e acessibilidade

O material entregue declara testes em 360, 390, 480, 768 e 1280 px, nos dois temas, sem overflow horizontal; tabelas viram cartões rotulados em mobile.

Também declara texto ≥ 4,5:1, elementos gráficos/bordas ≥ 3:1, foco/retorno de foco, scroll lock, navegação por teclado, alvos ~44 px e redução de movimento.

Essas são **evidências fornecidas pelo pacote** e serão rechecadas na auditoria independente.
