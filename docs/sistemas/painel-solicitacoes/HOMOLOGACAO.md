# Homologação da interface — Painel de Solicitações v1.2

**Aceitação visual/funcional:** 25/09/2026, conforme confirmação do responsável funcional após revisão independente e conferência no `/exec`. **Escopo:** painel do aluno e marcas. Não atesta segurança dos formulários vinculados, configuração da implantação, nem que o Git já tenha sido implantado.

## Alterações aceitas desde a v1.1

1. Os miolos dos “p” de “ipusp” ficaram vazados em Claro e Escuro, tanto no cabeçalho quanto no loading. `fill-rule:evenodd` e `clip-rule:evenodd` foram restaurados nos SVGs inline; os caminhos e preenchimentos foram preservados.
2. A marca USP mantém o PNG azul no Claro e usa o vetor de [`assets/usp/logo-usp-branco.svg`](../../../assets/usp/logo-usp-branco.svg) incorporado ao projeto no Escuro. A tarja branca foi retirada.
3. Foi removido `aria-hidden="true"` do SVG IPUSP escuro. As variantes visíveis das duas marcas têm nome acessível único; as ocultas usam `display:none`.
4. Permaneceram os sete formulários, quatro categorias, status, busca, Ajuda, FAQ, AccountChooser e controle Sistema/Claro/Escuro.

## Evidências e limites

O relatório da entrega informa 80/80 verificações funcionais, 23/23 cenários de tema, 98/98 verificações dedicadas de acessibilidade/layout/mobile e, após a remoção do atributo na IPUSP, 10/10 verificações pontuais. São resultados do autor do pacote. A revisão independente comparou o ZIP final com a v1.1, inclusive os hashes e o bloco funcional `<script>` de `Painel.html`. A captura Light do autor não carregou o PNG externo; a aceitação visual posterior no `/exec` foi comunicada pelo responsável funcional. Não constam aqui ID, horário, navegador e capturas finais da implantação.

No ZIP final, `Codigo.gs`, `GradipTema.html`, `GradipTemaControle.html` e os três arquivos `PainelAjuda*.html` eram byte-idênticos à v1.1. Os três arquivos mudados/novo da v1.2 final têm os hashes originais:

| Arquivo | SHA-256 do ZIP aceito |
|---|---|
| `Painel.html` | `fc897aaa9ad9dd5851e79abaf6ca9fd50e658b95d5f24978c5de0b8d14533c61` |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` |

## Diferença entre pacote aceito e fonte no Git

O pacote original continha um ID literal da planilha de períodos em `Codigo.gs`. A [cópia versionada](../../../sistemas/painel-solicitacoes/src/Codigo.gs) o substitui pela leitura de `PropertiesService.getScriptProperties().getProperty("PERIODOS_SPREADSHEET_ID")` e acrescenta uma guarda que impede inicialização quando a propriedade está ausente. **Essas são as únicas diferenças de conteúdo entre o ZIP final e a fonte do Git.** A guarda altera somente o caso de configuração ausente; com a propriedade válida, a lógica acadêmica e as URLs dos formulários permanecem iguais. O SHA-256 de `Codigo.gs` no Git é `abc69140da1f0edeaa6d9766a30efb1e77223bb538740b04857f51a67830a94e`; o hash da versão original era `c2d6b5cfd7bce572e058ba5e6611a3dafe6cc2a2191a7cebad1b916f9bfa092f`. Os outros oito arquivos permanecem byte-idênticos ao ZIP.

Na preparação para Git, foi verificada a sintaxe de `Codigo.gs` e, com ambiente simulado, a leitura da propriedade e a falha quando ausente. Isso **não equivale a um novo teste no Apps Script com a versão sanitizada**. Para usar esta cópia em uma implantação, configure a propriedade no projeto e repita o smoke conforme o [README do código](../../../sistemas/painel-solicitacoes/README.md).

O preflight de identificadores e dados antes do commit é descrito em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md). A identidade de execução e as permissões do Web App permanecem a validar no ambiente real.
