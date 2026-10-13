# Busca de Alunos — fonte GRADIP UI v1.0

Esta pasta contém os **nove arquivos Apps Script** da Busca de Alunos com o tema GRADIP (Sistema/Claro/Escuro) e a Central de Ajuda, em `src/`. A fonte partiu dos dois arquivos em uso pelo Serviço de Graduação (`Codigo.gs` e `BuscaAlunosApp.html`, recebidos em 13/10/2026). O bloco `<script>` da busca é **byte-idêntico** ao original: mesmos IDs, mesma chamada `google.script.run.listarAlunosParaBusca()`, mesma filtragem no navegador e mesmo limite de 60 resultados. Em `Codigo.gs`, o ID da planilha mestre `ID_INDEX` saiu do código e passou a ser lido de `Script Properties`.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/busca-alunos/README.md), o [manual de operação](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md), a [homologação e a diferença exata](../../docs/sistemas/busca-alunos/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/busca-alunos/DADOS_E_SEGURANCA.md).

## Arquivos

| Arquivo | Papel | Origem |
|---|---|---|
| `Codigo.gs` | `doGet` (template), `include_`, resolução do `ID_INDEX`, leitura da planilha de alunos e diagnóstico. | original, com ID do índice em Script Properties, `doGet` por template e `diagnosticarBuscaAlunos()` |
| `BuscaAlunosApp.html` | Cabeçalho GRADIP, campo de busca, resultados e gatilhos de ajuda. | original; CSS migrado para tokens, script preservado |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle **Aparência**. | byte-idênticos às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas. | byte-idênticos às cópias do Painel de Solicitações e da Estrutura Curricular |
| `BuscaAlunosAjuda.html` | Conteúdo da Central de Ajuda/FAQ. | novo, sobre `shared/ajuda/GradipAjudaTemplate.html` |
| `BuscaAlunosAjudaEstilos.html`, `BuscaAlunosAjudaUI.html` | Estilos e comportamento da Central. | byte-idênticos a `shared/ajuda/GradipAjudaEstilos.html` e `GradipAjudaUI.html` |

Os testes locais estão em [`testes/`](testes/README.md) e não vão para o Apps Script.

## Configuração antes de usar esta cópia

No projeto Apps Script, em **Configurações do projeto → Propriedades do script**, cadastre `ID_INDEX_SPREADSHEET_ID` com o ID da planilha mestre `ID_INDEX`. O valor fica apenas na configuração do Apps Script; não o envie para esta documentação, código, issues ou logs. Sem essa propriedade, a página abre mas mostra "Não consegui carregar a lista de alunos: Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID."

O backend procura no `ID_INDEX` a aba `Página1` (ou a primeira aba, se ela não existir), localiza as colunas `Chave` e `ID de Produção` pelo título e usa a primeira linha com `Chave` = `PLANILHA_ALUNOS`. Na planilha de alunos, lê a primeira aba e exige os títulos exatos `Número USP`, `Nome do Aluno`, `Tr eMail` e `eMail Secundario`. Essas regras são as mesmas do código original.

## Instalação (copiar e colar)

1. Abra o projeto Apps Script da Busca de Alunos e guarde uma cópia da versão atual.
2. Substitua o conteúdo de `Codigo.gs` e `BuscaAlunosApp.html` pelos desta pasta.
3. Crie os outros sete arquivos HTML (**+ → HTML**) na raiz do projeto, com os nomes **exatos e sem extensão**: `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `BuscaAlunosAjuda`, `BuscaAlunosAjudaEstilos`, `BuscaAlunosAjudaUI`. Cole o conteúdo correspondente. O `include_` usa esses nomes sem o prefixo `src/`.
4. Cadastre a propriedade `ID_INDEX_SPREADSHEET_ID` (acima).
5. Execute `diagnosticarBuscaAlunos` no editor e confira **Registros de execução**. O diagnóstico registra só configuração e contagem, nunca IDs ou dados de alunos.
6. Teste pela URL de teste (`/dev`). Depois crie uma **nova versão da implantação existente** (**Implantar → Gerenciar implantações → editar → Nova versão**), mantendo a URL `/exec`.

Um commit no Git não atualiza o Apps Script. O passo a passo completo, com o que conferir no `/exec`, está no [manual](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md#instalar-ou-atualizar).
