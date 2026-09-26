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

O ZIP v1.2 aceito contém um ID literal da planilha de períodos em `Codigo.gs`. A [fonte versionada](../../../sistemas/painel-solicitacoes/src/Codigo.gs) consulta agora a planilha mestre `ID_INDEX`: lê seu ID de `Script Properties["ID_INDEX_SPREADSHEET_ID"]`, valida as colunas A–C da primeira aba, exige chave única `PERIODOS` do tipo `spreadsheet` e usa o ID da coluna C (`ID de Produção`). A coluna D (`Homologação`) não é lida. O ID da planilha mestre nem o da planilha de períodos está no Git.

A consulta ao índice ocorre **fora** do `try/catch` do leitor de períodos. Falta de configuração, chave duplicada/ausente, tipo incorreto, cabeçalho divergente ou valor de produção vazio causa erro em vez de acionar o comportamento `fail-open` original. Fora da resolução do recurso, as regras de períodos e os links dos formulários são os mesmos. O backend original tinha SHA-256 `c2d6b5cfd7bce572e058ba5e6611a3dafe6cc2a2191a7cebad1b916f9bfa092f`; a fonte Git com o índice tem SHA-256 `e2a165975161fd844f0f680c03ecdfa96dda249c4a70b0cd5c2cfe30c2e7b85e`. Os outros oito arquivos continuam byte-idênticos ao ZIP aceito.

A verificação local cobriu sintaxe JavaScript e cenários simulados de resolução válida, chave ausente/duplicada, tipo ou cabeçalho errado, coluna C vazia, propriedade ausente, uso exclusivo da coluna de produção e propagação de erro do índice. **A integração ao ID_INDEX não foi executada no Apps Script real.** Para adotá-la, configurar `ID_INDEX_SPREADSHEET_ID` no projeto, verificar `executeAs` e permissões, e repetir o smoke no `/exec`. A homologação visual da v1.2 original não se transfere automaticamente a esta mudança de backend.
