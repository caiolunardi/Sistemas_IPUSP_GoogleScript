# Grade Horária visual — fonte v2.0

Página pública da grade horária dos alunos do IP. O projeto Apps Script continua **vinculado à planilha original da grade** (a do link que todos já têm), mas a v2.0 deixa de ler as abas dela: a página lê a **planilha que as secretarias preenchem** (chave `GRADE_HORARIA_PREENCHIMENTO` no `ID_INDEX`) e, pelo seletor **Consultar Grades Anteriores**, as cópias de semestres anteriores registradas no índice `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`. Também ganhou a Central de Ajuda e perdeu todo o código de validação, preenchimento, backup e registro de edições, que hoje roda no [sistema Estrutura Curricular](../estrutura-curricular/README.md) e no `Validacoes.gs` da [planilha das secretarias](../estrutura-curricular/planilha-grade/README.md).

O GitHub é a referência de código, mas **não sincroniza** com o Apps Script. Consulte a [documentação funcional](../../docs/sistemas/grade-horaria-visual/README.md), o [manual de operação](../../docs/sistemas/grade-horaria-visual/MANUAL_OPERACAO.md), a [homologação](../../docs/sistemas/grade-horaria-visual/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/grade-horaria-visual/DADOS_E_SEGURANCA.md).

## Arquivos (9)

| Arquivo | Papel | Origem |
|---|---|---|
| `Codigo.gs` | `doGet`, `include_`, `ID_INDEX`, `obterConfiguracaoGrade` (lista de grades), `obterGrade` (lê e filtra uma grade), cache e `diagnosticarGradeVisual`. | novo; substitui `doGet.gs`, `Gradehoraria.gs`, `obterConfiguracaoGrade.gs` e o `Codigo.gs` antigo |
| `GradeGrid.html` | Cabeçalho com **Consultar Grades Anteriores**, Aparência e Ajuda; botões de semestre; quadro com os post-its; ficha da disciplina; exportação em PDF. | o `GradeGrid.html` em uso, adaptado |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Tema Sistema/Claro/Escuro e marcas. | mesmo conteúdo dos arquivos em uso; byte-idênticos às cópias da Busca de Alunos |
| `GradeAjuda.html` | Conteúdo da Central de Ajuda/FAQ. | novo |
| `GradeAjudaEstilos.html`, `GradeAjudaUI.html` | Estilos e comportamento da Central. | novos; byte-idênticos a `shared/ajuda/` |

Os testes locais estão em [`testes/`](testes/README.md) e não vão para o Apps Script.

## O que fazer no projeto Apps Script da planilha original

Abra a planilha original da grade → **Extensões → Apps Script**. Antes de tudo, guarde uma cópia do projeto (ou baixe os arquivos) e anote a versão da implantação ativa.

### Manter (sem mexer) — 4 arquivos

`GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`. O conteúdo é o mesmo desta pasta.

### Substituir o conteúdo — 2 arquivos

| No editor | Cole o conteúdo de |
|---|---|
| `Codigo.gs` | [`src/Codigo.gs`](src/Codigo.gs) |
| `GradeGrid.html` | [`src/GradeGrid.html`](src/GradeGrid.html) |

### Criar — 3 arquivos HTML (**+ → HTML**, nomes exatos, sem extensão)

`GradeAjuda`, `GradeAjudaEstilos`, `GradeAjudaUI`, com o conteúdo dos arquivos desta pasta.

### Apagar — 19 arquivos

Apague **antes** de colar o `Codigo.gs` novo (o `doGet.gs` antigo tem funções com o mesmo nome):

- `doGet.gs`, `Gradehoraria.gs`, `obterConfiguracaoGrade.gs`, `limparAba.gs`;
- `Verifica Modalidades.gs`, `Verifica Carga Horaria.gs`, `Verificacao de Conflitos.gs`;
- `preenchimento de abas - PSA.gs`, `preenchimento de abas - PSC.gs`, `preenchimento de abas - PSE.gs`, `preenchimento de abas - PST.gs`, `preenchimento de abas - Interdepartamentais.gs`, `preenchimento de abas - Outras Unidades.gs`;
- `Novo Semestre.gs`, `Backup.gs`, `Menu Grade Horaria.gs`, `Rregistro de Edicoes.gs`, `FormataAba.gs`;
- `GradeHoraria.html` (versão antiga da página, sem uso).

### Acionadores e propriedades

1. **Acionadores** (relógio): apague todos, inclusive `registrarEdicao`. Sem isso, o Google manda e-mails de erro quando o arquivo dele sumir.
2. **Configurações do projeto → Propriedades do script**: apague `BACKUP_FOLDER_ID` e `GRADE_ADMINS` e crie `ID_INDEX_SPREADSHEET_ID` com o ID da planilha `ID_INDEX` (o nome no campo **Propriedade**, o ID no campo **Valor**; o valor nunca vai para o Git).

### Autorizar, testar e publicar mantendo o link

1. Selecione `diagnosticarGradeVisual` e clique em **Executar**; aceite as permissões. Confira em **Registros de execução**: grade atual encontrada, as seis abas, quantas disciplinas entram e as grades anteriores do índice.
2. Teste pela URL `/dev` (**Implantar → Testar implantações**).
3. **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar.** Não crie uma implantação nova: editar a existente mantém o link `/exec` que todos já têm.

A implantação precisa continuar executando **como quem implantou** ("Executar como: Eu"), e essa conta precisa ter acesso de leitura ao `ID_INDEX`, à planilha das secretarias, ao índice das grades anteriores e às cópias guardadas (a pasta das cópias pode ser compartilhada como Leitor). Passo a passo completo e conferência no [manual](../../docs/sistemas/grade-horaria-visual/MANUAL_OPERACAO.md).

Depois disso a planilha original perde o menu "Grade Horária" e as validações ao editar; as abas dela não são mais lidas pela página.
