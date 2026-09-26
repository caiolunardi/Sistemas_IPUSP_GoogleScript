# Painel de Solicitações — alunos

**Versão de referência:** GRADIP UI v1.2, aceita pelo responsável funcional em 25/09/2026 após conferência visual no Web App `/exec`. O pacote Apps Script correspondente contém nove arquivos. Esta pasta registra a versão aceita e suas decisões, mas não substitui a implantação do Google Apps Script.

## Finalidade e escopo

Página de entrada para estudantes do Serviço de Graduação do IPUSP. Reúne sete formulários de solicitação em quatro categorias: Matrícula e disciplinas; Formação e conclusão; Benefícios e serviços; Intercambistas / Exchange Students. O painel não contém sistemas internos da equipe nem processa diretamente as solicitações dos formulários vinculados.

Os sete cards da versão aceita são: abertura de habilitação, trancamento total, trancamento parcial, segunda via do BUSP, inclusão/exclusão de disciplinas para intercambistas, exclusão de disciplinas e colação de grau. O backend `Codigo.gs` declara os itens e as categorias; `Painel.html` renderiza as seções, busca e estados. O formulário para intercambistas usa dois períodos independentes, de inclusão e exclusão.

## Funcionamento

- A primeira aba da planilha de períodos define disponibilidade contínua ou sazonal. A correspondência com cada item usa `identificacaoPeriodos`, e não a URL de implantação; o painel consulta esses dados pelo backend.
- O carregamento inicial usa `google.script.run.obterSistemas()`. O frontend apresenta estado de carregamento, cards, selos de disponibilidade, busca e categorias expansíveis.
- Central de Ajuda e FAQ são incluídos nos arquivos `PainelAjuda*.html`; a seleção de conta (AccountChooser) e os links dos formulários pertencem aos fluxos da versão aceita.
- O tema GRADIP oferece Sistema, Claro e Escuro. A preferência é local ao navegador (`gradip-theme`); a escolha Sistema reage à mudança de `prefers-color-scheme` com a página aberta.
- `GradipMarcaIPUSP.html` é incluído no cabeçalho e no loading. `GradipMarcaUSP.html` contém a imagem azul para Claro e o SVG branco incorporado ao projeto para Escuro. A variante oculta por `display:none` sai da árvore de acessibilidade.

## Arquivos do pacote v1.2

`Codigo.gs`, `Painel.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `GradipTema.html`, `GradipTemaControle.html`, `PainelAjuda.html`, `PainelAjudaEstilos.html` e `PainelAjudaUI.html`.

Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões comuns: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

## Histórico da interface

| Versão | Estado documentado |
|---|---|
| v1.1 | Tema GRADIP e componentes do painel; smoke funcional no `/exec`. Restaram dois defeitos visuais nas marcas: miolos dos “p” preenchidos e USP azul sobre tarja branca no Escuro. |
| v1.2 | Regra `fill-rule:evenodd` restaurada nos dois SVGs inline do IPUSP; USP branca vetorial incorporada no Escuro; tarja removida; nome acessível da marca IPUSP escura corrigido. Aceita visualmente pelo responsável funcional. |

A v1.2 preservou `Codigo.gs`, os três arquivos da Ajuda e os dois arquivos do tema byte a byte em relação à v1.1. O bloco JavaScript funcional de `Painel.html` também permaneceu idêntico; somente a apresentação e inclusão das marcas mudaram.

Leia [HOMOLOGACAO.md](HOMOLOGACAO.md) para evidências, limites e hashes e [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) para o estado da incorporação do código ao Git.
