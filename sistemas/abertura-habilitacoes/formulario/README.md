# Pedido de Abertura de Habilitação (formulário dos alunos) — fonte v2.0

Web App em que o aluno, logado com a conta `@usp.br`, pede a abertura do Bacharelado e/ou da Licenciatura em Psicologia. O pedido é gravado como `pendente` na aba `Respostas ao formulário 2` da planilha `ABERTURA_HABILITACOES`, que o [Gerenciador](../gerenciador/README.md) lê.

**Estado:** v2.0 **implantada em 05/11/2026**. Ela substituiu a v1.0, um Web App próprio fora do repositório, que por sua vez substituiu o Google Forms original (origem histórica dos títulos e dos registros antigos). Documentação: [docs/sistemas/abertura-habilitacoes/formulario](../../../docs/sistemas/abertura-habilitacoes/formulario/README.md).

## Arquivos de `src/` (vão para o Apps Script)

| Arquivo | Papel |
|---|---|
| `Codigo.gs` | `doGet`, `include_`, `ID_INDEX` e `AMBIENTE`, período, alunos, histórico, conferência do esquema A–K, `obterDadosIniciais`, `registrarSolicitacao` (validação, pedido repetido, `appendRow`, recibo) e `diagnosticarConfiguracao`. |
| `HabilitacaoFormApp.html` | Página (tema GRADIP, validação no campo, contador, histórico, confirmação de pedido repetido). |
| `HabilitacaoFormAjuda.html` | Conteúdo da Central de Ajuda. |
| `HabilitacaoFormAjudaEstilos.html`, `HabilitacaoFormAjudaUI.html` | Estilos e comportamento da Central (byte-idênticos a `shared/ajuda/`). |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Tema e marcas (byte-idênticos às cópias dos outros sistemas). |
| `appsscript.json` | Manifesto: executa como quem implanta, acesso do domínio. |
| `testes/` | Testes locais com dados fictícios. Não vão para o Apps Script. |

## Configuração

- Propriedades do script: `ID_INDEX_SPREADSHEET_ID`; `AMBIENTE = homologacao` só no projeto de homologação.
- `ID_INDEX`: `PLANILHA_ALUNOS`, `ABERTURA_HABILITACOES`, `PERIODOS`.
- Passo a passo: [INSTALACAO.md](../../../docs/sistemas/abertura-habilitacoes/formulario/INSTALACAO.md).

## Versões

| Versão | Alterações |
|---|---|
| origem | Google Forms; as respostas formaram a aba atual e a `2021 - 2022`. |
| v1.0 (em uso até 05/11/2026) | Web App próprio no lugar do Forms, gravando na mesma aba; IDs de planilha no código; fora do repositório. |
| v2.0 (implantada em 05/11/2026) | `ID_INDEX`, homologação, esquema A–K conferido antes de gravar (nada é criado), `appendRow`, Registro ID e Versão na linha nova, alunos pelo título, recibo, confirmação de pedido repetido, tema GRADIP e Central de Ajuda. Ver [notas](../../../notas-de-versao/abertura-habilitacoes-v2.0.md). |
