# Homologação da interface — Painel de Solicitações v1.2

**Data da aceitação:** 25/09/2026 (America/Sao_Paulo). **Responsável funcional:** confirmação do usuário de que a interface ficou “perfeita” após a revisão independente do pacote e a conferência no ambiente real. **Escopo:** interface do painel do aluno e correção das marcas; não é auditoria de segurança dos formulários vinculados nem comprovação de uma versão específica da implantação do Apps Script.

## Alterações aceitas desde a v1.1

1. Os dois “p” da palavra “ipusp” passaram a ter miolos vazados em Claro e Escuro, no cabeçalho e no loading. O estilo dos SVGs inline voltou a declarar `fill-rule:evenodd` e `clip-rule:evenodd`, como os ativos centrais. Geometria, preenchimentos e proporções foram preservados.
2. A marca USP usa o PNG azul já existente no Claro e o vetor branco de `assets/usp/logo-usp-branco.svg` no Escuro, incorporado em `GradipMarcaUSP.html` para não depender do GitHub em tempo de execução. A tarja branca do cabeçalho foi removida. O ativo vetorial tem a [procedência registrada](../../../assets/usp/README.md).
3. A marca IPUSP escura deixou de ter `aria-hidden="true"` ao lado de `role="img"` e `aria-label`. Cada variante visível tem o nome acessível “Instituto de Psicologia da USP”; a USP tem “Universidade de São Paulo”. A variante oculta usa `display:none`, evitando duplicação do anúncio.
4. O cabeçalho de duas faixas, a troca manual de tema, a preferência Sistema, a busca, categorias, cards, disponibilidade, Ajuda, FAQ e AccountChooser permanecem no escopo funcional validado.

## Evidências da entrega e revisão

O relatório da entrega informa 80/80 verificações funcionais, 23/23 cenários de tema, 98/98 verificações dedicadas de acessibilidade/layout/mobile e, após o ajuste do atributo da marca IPUSP, 10/10 verificações pontuais. São resultados do ambiente de testes do autor do pacote, não uma execução independente registrada neste repositório. A revisão independente comparou o ZIP final com a v1.1 e confirmou a mudança restrita aos arquivos de marca e ao HTML/CSS do cabeçalho, com o backend e o JavaScript funcional preservados.

O PNG azul externo não carregou no ambiente de capturas do autor. A conferência no `/exec` real era necessária para observar carregamento do PNG e alinhamento durante a troca de tema; a aceitação visual posterior foi comunicada pelo responsável funcional. Não foram registrados aqui identificador da implantação, horário do smoke, navegador exato nem capturas finais do `/exec`.

### Identificação do pacote final

SHA-256 dos arquivos modificados/novo da v1.2 final:

| Arquivo | SHA-256 |
|---|---|
| `Painel.html` | `fc897aaa9ad9dd5851e79abaf6ca9fd50e658b95d5f24978c5de0b8d14533c61` |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` |

Arquivos byte-idênticos à v1.1: `Codigo.gs`, `GradipTema.html`, `GradipTemaControle.html`, `PainelAjuda.html`, `PainelAjudaEstilos.html` e `PainelAjudaUI.html`. O pacote final possui nove arquivos. Os hashes acima foram recalculados sobre o ZIP final recebido e coincidem com o relatório da entrega.

## Limite da homologação no Git

A aceitação visual/funcional do pacote implantado não equivale a aprovar a publicação integral de seu código neste repositório. A cópia recebida de `Codigo.gs` ainda contém um ID real de planilha de períodos e URLs de implantação. Antes de versionar código executável, aplicar o [preflight de segurança](DADOS_E_SEGURANCA.md), decidir explicitamente quais URLs são destinadas aos alunos, abstrair o ID operacional e validar configuração e comportamento após a alteração. Não substituir o código da produção por uma versão sanitizada sem esse procedimento.
