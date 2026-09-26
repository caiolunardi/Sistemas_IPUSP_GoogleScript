# Painel de Solicitações — alunos

**Versão da interface:** GRADIP UI v1.2, aceita pelo responsável funcional em 25/09/2026 após conferência visual no Web App `/exec`. O [código Apps Script](../../../sistemas/painel-solicitacoes/README.md) agora está versionado, com a única adaptação de configuração descrita abaixo. O GitHub não informa qual versão está implantada no Apps Script.

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

Os nove arquivos em [`src/`](../../../sistemas/painel-solicitacoes/src) são `Codigo.gs`, `Painel.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `GradipTema.html`, `GradipTemaControle.html`, `PainelAjuda.html`, `PainelAjudaEstilos.html` e `PainelAjudaUI.html`. Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

| Versão | Alterações |
|---|---|
| v1.1 | Tema GRADIP, ajuda e fluxos do painel; smoke funcional no `/exec`. Restaram miolos dos “p” preenchidos e USP azul sobre tarja branca no Escuro. |
| v1.2 | `fill-rule:evenodd` nas duas variantes IPUSP; USP branca vetorial no Escuro e tarja removida; nome acessível da IPUSP escura corrigido. Aceita visualmente pelo responsável funcional. |
| Fonte no Git | Mesmo pacote v1.2, exceto leitura de `PERIODOS_SPREADSHEET_ID` de Script Properties e guarda de ausência. Não representa nova implantação homologada. |

No pacote original v1.2, `Codigo.gs`, os três arquivos da Ajuda e os dois do tema eram byte-idênticos à v1.1; o bloco JavaScript funcional de `Painel.html` também era idêntico. Consulte [HOMOLOGACAO.md](HOMOLOGACAO.md) para os hashes e [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) para limites da revisão de segurança.
