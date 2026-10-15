# Painel de Solicitações — alunos

**v1.3 (14/10/2026, implantada em 15/10/2026 junto com a v1.4):** menu lateral de categorias (padrão) com opção de abas, busca em todas as categorias e [Contagem de créditos](CONTAGEM_DE_CREDITOS.md) em Formação e conclusão. Requer a chave `REGRAS_CURRICULARES` no `ID_INDEX`.

**v1.4 (15/10/2026, implantada no Apps Script em 15/10/2026, segundo o responsável):** link para a [Grade horária](../grade-horaria-visual/README.md) visual, como card de consulta no fim de "Matrícula e disciplinas" (selo "Consulta") e como atalho fixo no rodapé do menu lateral, acima da Ajuda. Os dois abrem em nova aba e sem AccountChooser, porque a grade é pública. O link fica em `FERRAMENTAS_PAINEL` (`Codigo.gs`).

**Versão da interface:** GRADIP UI v1.2, aceita pelo responsável funcional em 25/09/2026 após conferência visual no Web App `/exec`. O [código Apps Script](../../../sistemas/painel-solicitacoes/README.md) está versionado. A fonte Git agora resolve a planilha de períodos pela chave `PERIODOS` no índice mestre `ID_INDEX`; essa integração ainda não foi homologada no `/exec`. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

Página de entrada para estudantes do Serviço de Graduação do IPUSP. Reúne sete formulários em quatro categorias: Matrícula e disciplinas; Formação e conclusão; Benefícios e serviços; Intercambistas / Exchange Students. Não contém os sistemas internos da equipe nem processa diretamente as solicitações dos formulários vinculados.

Os sete cards são: abertura de habilitação, trancamento total, trancamento parcial, segunda via do BUSP, inclusão/exclusão de disciplinas para intercambistas, exclusão de disciplinas e colação de grau. `Codigo.gs` declara os itens e categorias; `Painel.html` renderiza seções, busca e estados. O card para intercambistas combina dois períodos independentes, de inclusão e exclusão.

## Funcionamento

- A primeira aba da planilha de períodos define disponibilidade contínua ou sazonal. A correspondência usa `identificacaoPeriodos`, não a URL de implantação.
- O carregamento inicial usa `google.script.run.obterSistemas()`; o frontend apresenta loading, cards, selos, busca e categorias expansíveis.
- Central de Ajuda e FAQ estão nos arquivos `PainelAjuda*.html`. AccountChooser e links dos formulários fazem parte do fluxo aceito.
- O tema oferece Sistema, Claro e Escuro; a preferência é local ao navegador (`gradip-theme`). Sistema acompanha `prefers-color-scheme`, inclusive com a página aberta.
- A marca IPUSP aparece no cabeçalho e no loading. A USP usa PNG azul no Claro e SVG branco incorporado no Escuro. `display:none` retira da árvore de acessibilidade a variante oculta.

## Arquivos e dependências

Os arquivos em [`src/`](../../../sistemas/painel-solicitacoes/src) são `Codigo.gs`, `Painel.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `GradipTema.html`, `GradipTemaControle.html`, `PainelAjuda.html`, `PainelAjudaEstilos.html` e `PainelAjudaUI.html`; a v1.3 acrescenta `ContagemCreditos.gs`, `PainelNavegacaoEstilos.html`, `PainelNavegacaoUI.html`, `PainelIcones.html`, `PainelContagemEstilos.html`, `PainelContagemMotor.html` e `PainelContagemUI.html`. Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

| Versão | Alterações |
|---|---|
| v1.1 | Tema GRADIP, ajuda e fluxos do painel; smoke funcional no `/exec`. Restaram miolos dos “p” preenchidos e USP azul sobre tarja branca no Escuro. |
| v1.2 | `fill-rule:evenodd` nas duas variantes IPUSP; USP branca vetorial no Escuro e tarja removida; nome acessível da IPUSP escura corrigido. Aceita visualmente pelo responsável funcional. |
| v1.3 (fonte, 14/10/2026) | Menu lateral e abas no padrão do Painel dos servidores (abre no menu lateral; recolhe em ≤ 900 px); categorias no menu e formulários no quadro principal; busca em todas as categorias com resultados agrupados; cards fechados acessíveis por teclado; [Contagem de créditos](CONTAGEM_DE_CREDITOS.md) por habilitação e currículo; seção nova na Central de Ajuda. Testes locais: 36 da contagem e 184 de navegador. |
| v1.4 (fonte, 15/10/2026) | Grade horária: card de consulta em Matrícula e disciplinas e atalho no menu lateral, ambos em nova aba; encontrada pela busca ("horário", "sala", "grade"). Ícone Lucide `calendar-days`. Testes locais: 36 da contagem e 194 de navegador. |
| Fonte no Git (antes da v1.3) | Oito HTMLs idênticos à v1.2; `Codigo.gs` consulta `ID_INDEX` pela chave `PERIODOS`. Exige `ID_INDEX_SPREADSHEET_ID` nas Propriedades do script. Não representa nova implantação homologada. |

No pacote original v1.2, `Codigo.gs`, os três arquivos da Ajuda e os dois do tema eram byte-idênticos à v1.1; o bloco JavaScript funcional de `Painel.html` também era idêntico. Consulte [HOMOLOGACAO.md](HOMOLOGACAO.md) para os hashes e [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) para limites da revisão de segurança.
