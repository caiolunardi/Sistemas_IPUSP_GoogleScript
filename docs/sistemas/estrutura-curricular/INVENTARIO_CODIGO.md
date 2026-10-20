# Inventário do código — 1.10.0

35 arquivos na raiz do projeto Apps Script do Web App: 14 scripts e 21 HTML. (1.12.0) `BaseDisciplinas.gs` é novo. Os arquivos novos são de apresentação. A comparação com a baseline é registrada em [Verificação](VERIFICACAO_1_10_0.md).

| Arquivo | Camada | Responsabilidade | Relação com 1.9.3 |
|---|---|---|---|
| [`Acesso.gs`](../../../sistemas/estrutura-curricular/src/Acesso.gs) | servidor | identificação e papéis no servidor | byte idêntico |
| [`AuditoriaGrade.gs`](../../../sistemas/estrutura-curricular/src/AuditoriaGrade.gs) | servidor | auditoria, índices e acionadores | byte idêntico |
| [`AuditoriaPainel.gs`](../../../sistemas/estrutura-curricular/src/AuditoriaPainel.gs) | servidor | agregação de consulta/auditoria; (1.11.0) nome de quem aparece e `diagnosticarNomesAuditoria` | alterado na 1.11.0 |
| [`BaseDisciplinas.gs`](../../../sistemas/estrutura-curricular/src/BaseDisciplinas.gs) | servidor | (1.12.0) migração para a planilha DISCIPLINAS: `simularMigracaoDisciplinas`, `migrarDisciplinasParaBaseUnica` (editor, só administradores) | novo na 1.12.0 |
| [`Codigo.gs`](../../../sistemas/estrutura-curricular/src/Codigo.gs) | servidor | doGet, include_ e versão | somente versão (1.11.0) |
| [`Configuracao.gs`](../../../sistemas/estrutura-curricular/src/Configuracao.gs) | servidor | propriedades, ID_INDEX e diagnóstico | byte idêntico |
| [`Consulta.gs`](../../../sistemas/estrutura-curricular/src/Consulta.gs) | servidor | payload consistente do painel | byte idêntico |
| [`EnvioGrade.gs`](../../../sistemas/estrutura-curricular/src/EnvioGrade.gs) | servidor | assinatura de conteúdo, backup e envio | byte idêntico |
| [`Esquema.gs`](../../../sistemas/estrutura-curricular/src/Esquema.gs) | servidor | abas, colunas, formatos e preparação | (1.11.0) posição de aba nova pelo ID |
| [`EstruturaAjuda.html`](../../../sistemas/estrutura-curricular/src/EstruturaAjuda.html) | página | conteúdo estático da Central | (1.11.0) item "Nome de quem aparece" |
| [`EstruturaAjudaEstilos.html`](../../../sistemas/estrutura-curricular/src/EstruturaAjudaEstilos.html) | página | aparência da Central | byte idêntico |
| [`EstruturaAjudaUI.html`](../../../sistemas/estrutura-curricular/src/EstruturaAjudaUI.html) | página | busca, FAQ, foco e fechamento da Central | byte idêntico |
| [`EstruturaIcones.html`](../../../sistemas/estrutura-curricular/src/EstruturaIcones.html) | página | 12 ícones Lucide e licença | novo, apresentação |
| [`EstruturaNavegacao.html`](../../../sistemas/estrutura-curricular/src/EstruturaNavegacao.html) | página | seletor de modo | novo, apresentação |
| [`EstruturaNavegacaoEstilos.html`](../../../sistemas/estrutura-curricular/src/EstruturaNavegacaoEstilos.html) | página | sidebar/abas, hover e responsividade | novo, apresentação |
| [`EstruturaNavegacaoUI.html`](../../../sistemas/estrutura-curricular/src/EstruturaNavegacaoUI.html) | página | adaptador de posicionamento, visibilidade e teclado | novo, apresentação |
| [`GradipMarcaIPUSP.html`](../../../sistemas/estrutura-curricular/src/GradipMarcaIPUSP.html) | página | marca IPUSP por tema | byte idêntico |
| [`GradipMarcaUSP.html`](../../../sistemas/estrutura-curricular/src/GradipMarcaUSP.html) | página | marca USP por tema | byte idêntico |
| [`GradipTema.html`](../../../sistemas/estrutura-curricular/src/GradipTema.html) | página | tokens, preferência Sistema/Claro/Escuro | byte idêntico |
| [`GradipTemaControle.html`](../../../sistemas/estrutura-curricular/src/GradipTemaControle.html) | página | controle de preferência | byte idêntico |
| [`Gravacao.gs`](../../../sistemas/estrutura-curricular/src/Gravacao.gs) | servidor | manifesto, diário, ativação e recuperação | (1.11.0) `posicaoDaAba_`; abas comparadas pelo ID |
| [`Importacao.gs`](../../../sistemas/estrutura-curricular/src/Importacao.gs) | servidor | validação, prévia, revisão e confirmação | byte idêntico |
| [`LeitorComum.html`](../../../sistemas/estrutura-curricular/src/LeitorComum.html) | página | formato do pacote e utilidades | byte idêntico |
| [`LeitorCsv.html`](../../../sistemas/estrutura-curricular/src/LeitorCsv.html) | página | leitura CSV Júpiter | byte idêntico |
| [`LeitorPdf.html`](../../../sistemas/estrutura-curricular/src/LeitorPdf.html) | página | reconstrução da grade pelas palavras | byte idêntico |
| [`LeitorPdfFontes.html`](../../../sistemas/estrutura-curricular/src/LeitorPdfFontes.html) | página | PDF.js/OCR, modelo, integridade e progresso | byte idêntico |
| [`Painel.html`](../../../sistemas/estrutura-curricular/src/Painel.html) | página | composição da página e includes | composição visual |
| [`PainelApp.html`](../../../sistemas/estrutura-curricular/src/PainelApp.html) | página | dados, filtros, listas, fichas e pilha de modais | byte idêntico |
| [`PainelAuditoria.html`](../../../sistemas/estrutura-curricular/src/PainelAuditoria.html) | página | consultas e vistas de auditoria | (1.11.0) nome, vínculo e e-mail das pessoas |
| [`PainelEstilos.html`](../../../sistemas/estrutura-curricular/src/PainelEstilos.html) | página | CSS funcional existente | (1.11.0) estilos da pessoa na auditoria |
| [`PainelImportacao.html`](../../../sistemas/estrutura-curricular/src/PainelImportacao.html) | página | leitura/conferência/prévia/gravação no cliente | byte idêntico |
| [`PainelPreparacao.html`](../../../sistemas/estrutura-curricular/src/PainelPreparacao.html) | página | etapas, edição, lotes, Outros e envio | byte idêntico |
| [`Planilha.gs`](../../../sistemas/estrutura-curricular/src/Planilha.gs) | servidor | leitura/escrita por título de coluna | byte idêntico |
| [`Preparacao.gs`](../../../sistemas/estrutura-curricular/src/Preparacao.gs) | servidor | ajustes, Outros, seleção e pendências | (1.11.0) recomeço apaga abas pelo ID |
| [`Utilidades.gs`](../../../sistemas/estrutura-curricular/src/Utilidades.gs) | servidor | respostas, texto seguro, datas e hash | byte idêntico |

## Ordem de composição

Tema → estilos existentes → ajuda/estilos de navegação → header → controles de modo e layout → painéis/janelas → ajuda estática → leitores → PainelApp → Importação → Preparação → Auditoria → AjudaUI → catálogo de ícones → NavegaçãoUI. `include_()` inclui conteúdo por nome, sem extensão; novos includes não contêm templates aninhados.

## Projeto vinculado

`planilha-grade/Validacoes.gs`: script separado de onEdit simples na planilha das secretarias. Mantido idêntico à baseline. Não pertence à raiz do Web App. O README associado registra migração histórica e exige leitura cuidadosa antes de alterações operacionais.

## Testes e dependências

`mockGoogle.js` simula serviços; `ambiente_navegador.js` abre página real e conecta ao simulador; `pacotes_sinteticos.js` produz casos fictícios. `testar_navegacao_visual.js` verifica a atualização visual; `testar_ajuda.js` a Central e suas integrações. Suites etapa1–9 cobrem identidade, importação por unidade, assincronia, salvamento/lotes, oferta, trava, confirmação e auditoria. Demais suites cobrem CSV/PDF/OCR e regressões com arquivos privados fornecidos somente na execução.

Dependências fixadas no package/lock: PDF.js 3.11.174, Tesseract.js/core 7.0.0, Playwright 1.56.0. Modelo português tessdata_fast 4.1.0 baixado para testes e ignorado no Git. Icones são inline de catálogo Lucide Static 1.55.0, sem dependência runtime/npm no app. Veja [README dos testes](../../../sistemas/estrutura-curricular/testes/README.md).
