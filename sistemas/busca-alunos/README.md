# Comunidade IPUSP (antiga Busca de Alunos) — fonte v1.2

Esta pasta contém os **nove arquivos Apps Script** da Comunidade IPUSP, em `src/`. A pasta e os nomes de arquivo continuam os da Busca de Alunos, para a atualização ser só substituir arquivos. A v1.0 aplicou o tema GRADIP (Sistema/Claro/Escuro) e a Central de Ajuda sobre os dois arquivos em uso (`Codigo.gs` e `BuscaAlunosApp.html`, recebidos em 13/10/2026). A **v1.1** corrige o título da coluna de e-mail para `eMail` e acrescenta, a pedido do Serviço de Graduação:

- **ficha do aluno** em modal, com todas as colunas da planilha, editável e salvando para quem é editor da planilha;
- **filtro por ano e semestre de ingresso** (coluna `Ingresso`, formato AAAA/S), com combobox dos anos existentes;
- **exportação** da lista filtrada em **CSV** ou **PDF**.

A **v1.2** (14/10/2026) muda o nome para **Comunidade IPUSP** e faz a mesma caixa de busca procurar também nos cadastros de **docentes** (`PLANILHA_DOCENTES`) e **servidores** (`SERVIDORES`), com um selo em cada resultado: **Aluno**, **Docente**, **Servidor** ou **Setor**. Ficha, edição e filtro de ingresso continuam só para alunos.

A busca por texto continua igual: uma única carga da lista, filtragem no navegador, limite de 60 resultados na tela.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/busca-alunos/README.md), o [manual de operação](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md), a [homologação e a diferença exata](../../docs/sistemas/busca-alunos/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/busca-alunos/DADOS_E_SEGURANCA.md).

## Arquivos

| Arquivo | Papel | Origem |
|---|---|---|
| `Codigo.gs` | `doGet` (template), `include_`, `ID_INDEX`, lista da comunidade (`listarComunidadeParaBusca`: alunos, docentes, servidores e setores), ficha (`obterFichaAluno`/`salvarFichaAluno`), PDF (`gerarPdfListaAlunos`) e diagnóstico (`diagnosticarComunidadeIPUSP`). | original + v1.0 + v1.1 + v1.2 |
| `BuscaAlunosApp.html` | Cabeçalho GRADIP, busca, selos de vínculo, filtros de ingresso, exportação, resultados e ficha do aluno. | original + v1.0 + v1.1 + v1.2 |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle **Aparência**. | byte-idênticos às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas. | byte-idênticos às cópias dos dois sistemas |
| `BuscaAlunosAjuda.html` | Conteúdo da Central de Ajuda/FAQ. | v1.0, ampliado na v1.1 e na v1.2 |
| `BuscaAlunosAjudaEstilos.html`, `BuscaAlunosAjudaUI.html` | Estilos e comportamento da Central. | byte-idênticos a `shared/ajuda/` |

Os testes locais estão em [`testes/`](testes/README.md) e não vão para o Apps Script.

## Configuração antes de usar esta cópia

No projeto Apps Script, em **Configurações do projeto → Propriedades do script**, cadastre:

| Propriedade (nome) | Valor |
|---|---|
| `ID_INDEX_SPREADSHEET_ID` | o ID da planilha mestre `ID_INDEX` |

O nome vai no campo **Propriedade** e o ID no campo **Valor**; no código, a constante `PROPRIEDADE_ID_INDICE` deve continuar com o **nome** `"ID_INDEX_SPREADSHEET_ID"`. O valor fica só no Apps Script: não o envie para esta documentação, código, issues ou logs.

No `ID_INDEX`, o backend lê a aba `Página1` (ou a primeira aba), encontra as colunas `Chave` e `ID de Produção` pelo título e usa as linhas `PLANILHA_ALUNOS`, `SERVIDORES` e `PLANILHA_DOCENTES`. Na planilha de alunos, lê a primeira aba e exige os títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail` e `eMail Secundario` (espaços nas pontas são ignorados; o ícone "Tт" das colunas de texto da tabela do Sheets não faz parte do nome). `ID da Pasta` aparece na ficha, mas é somente leitura.

Nas planilhas de servidores e de docentes, lê a primeira aba pela **posição** das colunas (como a auditoria da Estrutura Curricular): servidores A e-mail, B nome, C setor; docentes B nome, D e-mail. Linha de servidores com nome vazio, igual ao setor ou iniciado por Serviço, Seção, Secretaria etc. (`INICIOS_NOME_SETOR`) aparece como **Setor**. Se um desses cadastros não abrir, os outros aparecem com um aviso.

Para **salvar** alterações, a conta de quem usa precisa ser **editora da planilha de alunos**, individualmente (compartilhamento só por grupo não é reconhecido). As demais contas consultam e exportam.

## Instalação (copiar e colar)

1. Abra o projeto Apps Script da Busca de Alunos e guarde uma cópia da versão atual.
2. Substitua o conteúdo de `Codigo.gs`, `BuscaAlunosApp.html` e `BuscaAlunosAjuda.html` pelos desta pasta; os outros seis arquivos não mudaram.
3. Instalação nova: crie os outros sete arquivos HTML (**+ → HTML**) na raiz do projeto, com os nomes **exatos e sem extensão**: `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `BuscaAlunosAjuda`, `BuscaAlunosAjudaEstilos`, `BuscaAlunosAjudaUI`.
4. Cadastre a propriedade `ID_INDEX_SPREADSHEET_ID` (acima).
5. Execute `diagnosticarComunidadeIPUSP` no editor (até a v1.1 chamava-se `diagnosticarBuscaAlunos`) e **autorize** se o Google pedir. Confira em **Registros de execução** se as três chaves foram encontradas, os títulos das colunas e as quantidades.
6. Teste pela URL de teste (`/dev`). Depois crie uma **nova versão da implantação existente** (**Implantar → Gerenciar implantações → editar → Nova versão**), mantendo a URL `/exec`.

Um commit no Git não atualiza o Apps Script. O passo a passo completo, com o que conferir no `/exec`, está no [manual](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md#instalar-ou-atualizar).
