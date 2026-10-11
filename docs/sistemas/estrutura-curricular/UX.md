# UX e interface — Estrutura Curricular e Grade Horária 1.10.0

Referência atual: [pacote visual](NAVEGACAO_E_VISUAL_1_10_0.md), [manual de operação](MANUAL_OPERACAO.md) e [verificação local](VERIFICACAO_1_10_0.md). As regras de dados e controladores foram preservadas da baseline 1.9.3.

## Identidade

A interface segue o GRADIP Design System, com Sistema / Claro / Escuro e marcas IPUSP/USP próprias para o tema.

O material registra uma pendência: a cópia local de `GradipTema.html` usa uma correção de contraste de `--gradip-border-strong` ainda não propagada ao `shared/` central.

## Áreas principais

`Estrutura curricular` e `Auditoria da grade` são seções do sistema. A 1.10.0 abre com sidebar e permite alternar para abas; os mesmos botões mudam de posição. Etapas e consultas seguem suas condições de perfil e painel ativo. O modo não é persistido; recarga volta à sidebar. Ícones de catálogo, brilho e elevação usam o tema existente.

## Consulta

Busca por código/nome sem acento/caixa, filtros combináveis, ordenação, download CSV, ficha detalhada, currículos e histórico.

Estados são comunicados por texto e cor. Obrigatória/Eletiva/Livre usam a mesma convenção visual da grade.

## Preparação em etapas

A interface diferencia dados oficiais, ajustes locais, seleção não persistida, item efetivamente adicionado e prévia antes de escrita destrutiva.

## Modais

Janelas operacionais não fecham por ESC nem clique fora; usam controles explícitos para evitar perda de arquivo/dados. A Central de Ajuda, acrescentada na 1.9.0, fecha por Fechar/ESC/fundo e conserva o estado da janela operacional por trás, com retorno de foco.

## Revisão do PDF

Valores exclusivos do PDF são paginados com página de origem. No OCR, a confirmação depende de percorrer as páginas exigidas e de validação server-side.

## Auditoria como painel

A 1.8.0 remove o link da planilha crua de auditoria e privilegia cartões, listas, gráficos, timeline e histórico por disciplina.

## Responsividade e acessibilidade

O material entregue declara testes em 360, 390, 480, 768 e 1280 px, nos dois temas, sem overflow horizontal; tabelas viram cartões rotulados em mobile.

Também declara texto ≥ 4,5:1, elementos gráficos/bordas ≥ 3:1, foco/retorno de foco, scroll lock, navegação por teclado, alvos ~44 px e redução de movimento.

Essas declarações históricas não são todas uma nova medição desta rodada. A matriz atual de sidebar/abas, temas, larguras e contraste dos novos controles está em [VERIFICACAO_1_10_0.md](VERIFICACAO_1_10_0.md). Homologação no Google permanece pendente.
