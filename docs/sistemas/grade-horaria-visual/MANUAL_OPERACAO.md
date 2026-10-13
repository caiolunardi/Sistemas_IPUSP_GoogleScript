# Manual de operação — Grade Horária visual (v2.0)

A fonte está em [`sistemas/grade-horaria-visual/src/`](../../../sistemas/grade-horaria-visual/src/). Esta entrega não altera nenhum projeto Apps Script nem planilha automaticamente.

## Uso no dia a dia

Nada a fazer: a página lê sozinha a planilha que as secretarias preenchem. Quando o Estrutura Curricular envia uma grade nova para preenchimento, ele renomeia a planilha das secretarias ("Grade Horária - Xº semestre de AAAA") e registra a cópia do semestre que terminou no índice das grades anteriores; a página passa a mostrar a grade nova como atual e a anterior no seletor, sem mudança de código.

- Mudanças das secretarias aparecem em até ~2 minutos (cache da grade atual).
- Para forçar a releitura (ex.: logo depois de um envio), execute `diagnosticarGradeVisual` no editor; ele limpa o cache da grade atual e da lista de anteriores.
- Uma grade anterior que não aparece no seletor: confira, no índice das grades anteriores, se a linha tem o semestre no formato `AAAA/S` na coluna `Semestre` e o ID na coluna `ID`. Linhas acrescentadas à mão (por exemplo, para uma grade antiga guardada fora do sistema) funcionam do mesmo jeito, desde que a planilha tenha as seis abas no layout da grade.

## Instalar ou atualizar

O projeto a atualizar é o **vinculado à planilha original da grade** (Extensões → Apps Script). É ele que serve o link público.

1. Guarde uma cópia do projeto e **anote a versão da implantação ativa** (Implantar → Gerenciar implantações).
2. **Apague os 19 arquivos sem uso** (antes de colar o `Codigo.gs` novo, porque `doGet.gs` tem funções com o mesmo nome):

| Apagar | Motivo |
|---|---|
| `doGet.gs`, `Gradehoraria.gs`, `obterConfiguracaoGrade.gs` | substituídos pelo `Codigo.gs` novo |
| `limparAba.gs`, `Novo Semestre.gs`, `Backup.gs`, `Menu Grade Horaria.gs`, `Rregistro de Edicoes.gs`, `FormataAba.gs` | menu, limpeza, backup, novo semestre e registro de edições: hoje no Estrutura Curricular |
| `Verifica Modalidades.gs`, `Verifica Carga Horaria.gs`, `Verificacao de Conflitos.gs` | validações: hoje no `Validacoes.gs` da planilha das secretarias |
| `preenchimento de abas - PSA.gs`, `- PSC.gs`, `- PSE.gs`, `- PST.gs`, `- Interdepartamentais.gs`, `- Outras Unidades.gs` | carga das abas: hoje no envio da grade do Estrutura Curricular |
| `GradeHoraria.html` | versão antiga da página, que nenhum código abria |

3. **Substitua** o conteúdo de `Codigo.gs` e `GradeGrid.html` pelos desta pasta.
4. **Crie** três arquivos HTML (**+ → HTML**, nomes exatos, sem extensão): `GradeAjuda`, `GradeAjudaEstilos`, `GradeAjudaUI`.
5. **Mantenha** `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP` e `GradipMarcaUSP` (mesmo conteúdo).
6. **Acionadores:** apague todos (inclusive `registrarEdicao`).
7. Faça a [configuração](#configuração).
8. Rode o [diagnóstico](#diagnóstico) e aceite as permissões que o Google pedir.
9. Teste no `/dev` (Implantar → Testar implantações) com a [conferência](#conferência-no-dev-e-no-exec).
10. Promova: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. Não crie implantação nova: o link `/exec` continua o mesmo.

Para voltar atrás, edite a implantação e selecione a versão anotada no passo 1 (o código antigo continua nas versões salvas do projeto).

Ao final, o projeto tem 9 arquivos: `Codigo.gs`, `GradeGrid.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `GradeAjuda.html`, `GradeAjudaEstilos.html`, `GradeAjudaUI.html`.

## Configuração

**Propriedades do script** (Configurações do projeto):

| Ação | Campo **Propriedade** | Campo **Valor** |
|---|---|---|
| criar | `ID_INDEX_SPREADSHEET_ID` | ID da planilha mestre `ID_INDEX` (não registrar no Git) |
| apagar | `BACKUP_FOLDER_ID`, `GRADE_ADMINS` | não são mais usadas |

**`ID_INDEX`** (aba `Página1`, ou a primeira): títulos `Chave` e `ID de Produção` na linha 1, em qualquer coluna, e as linhas:

| Chave | Aponta para |
|---|---|
| `GRADE_HORARIA_PREENCHIMENTO` | planilha que as secretarias preenchem (grade atual) |
| `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` | índice das grades anteriores |

**Índice das grades anteriores** (aba `Página1`, ou a primeira): coluna `Semestre` (AAAA/S) e coluna `ID` (achadas pelo título; sem título, A e B). A coluna `Auditoria_ID` não é lida. É o mesmo índice que o envio da grade preenche.

**Planilhas da grade** (atual e cópias): abas `PSA`, `PSC`, `PSE`, `PST`, `Interdepartamentais` e `Outras Unidades`, títulos na linha 3, dados da linha 4 em diante, colunas fixas C Código, D Nome, E Tipo, F Modalidade, G Será oferecida, H Docente(s), I Semestre Ideal, J Créditos Aula, K Dia da semana, L Horário de Início, M Horário de Fim. A Sala é procurada pelo título "Sala" na linha 3 (hoje só a aba PSA tem). Aba ausente é ignorada.

**Implantação:** "Executar como: **Eu**" (quem implantou). Essa conta precisa **ler** o `ID_INDEX`, a planilha das secretarias, o índice das grades anteriores e cada cópia registrada nele (compartilhar a pasta das cópias como Leitor resolve as cópias futuras). "Quem pode acessar": manter o que está em uso.

## Diagnóstico

No editor, selecione `diagnosticarGradeVisual` e clique em **Executar**. Em **Registros de execução**: se a propriedade existe, o nome da planilha atual e o semestre identificado, se cada uma das seis abas existe, quantas disciplinas entram na grade visual e os semestres das grades anteriores no índice. Nenhum ID é registrado. Ele também limpa o cache.

## Mensagens e o que fazer

| Mensagem na página | Causa provável | O que fazer |
|---|---|---|
| "A grade horária ainda não foi configurada…" | falta `ID_INDEX_SPREADSHEET_ID` | criar a propriedade |
| "Não foi possível abrir o índice de planilhas / a grade atual / a grade de …" | ID errado ou a conta que implantou não tem acesso | conferir o `ID_INDEX` e compartilhar a planilha com essa conta |
| "Não encontrei a chave … no índice de planilhas" | linha ausente no `ID_INDEX` | criar a linha |
| "Não encontrei a grade de … entre as grades anteriores" | linha removida do índice depois que a página abriu | recarregar a página |
| Seletor desativado, com dica "Não foi possível carregar a lista…" | índice das anteriores inacessível | como acima; a grade atual continua funcionando |
| Faixa "Semestre não identificado" | nome da planilha atual sem "Xº semestre de AAAA" | renomear a planilha como o envio faz; enquanto isso, só aparecem botões dos semestres com disciplina |

## Conferência no `/dev` e no `/exec`

- [ ] Abre na grade atual, com o semestre certo na faixa e a etiqueta "Grade atual".
- [ ] Botões da paridade certa, mais algum extra se houver disciplina de outro semestre.
- [ ] Uma disciplina conferida na planilha aparece no dia, horário e cor certos; a ficha mostra docentes e sala.
- [ ] Prática, "Será oferecida = NÃO", sem horário e disciplina para outros cursos **não** aparecem; Estatística (MAE) aparece.
- [ ] Seletor lista as grades anteriores como "AAAA - Xº Semestre", mais recentes primeiro; abrir uma mostra "Grade anterior"; voltar para "Grade atual".
- [ ] Exportar PDF baixa `Grade_Horaria_AAAA-S.pdf` com uma página por semestre.
- [ ] Aparência Sistema/Claro/Escuro; recarregar mantém a escolha manual.
- [ ] Ajuda e "Como ler a grade?" abrem; Esc fecha.
- [ ] Celular: quadro rola para o lado dentro da moldura, sem rolar a página.
- [ ] A planilha original não mostra mais o menu "Grade Horária" e não há e-mails de erro de acionador.

## Manutenção

- **Coluna mudou de lugar na planilha das secretarias:** ajuste `COL` em `Codigo.gs` (o envio do Estrutura Curricular usa as mesmas posições).
- **Novo departamento/unidade na ficha:** acrescente o prefixo em `DEPARTAMENTOS` de `GradeGrid.html`.
- **Horários do quadro:** listas `manha` e `tarde` em `criarGrade` (`GradeGrid.html`); atualize também a ajuda.
- **Planilha atual trocada:** atualize a linha `GRADE_HORARIA_PREENCHIMENTO` no `ID_INDEX`; nenhum código muda.
- **Texto da ajuda:** altere em `GradeAjuda.html` e em [AJUDA.md](AJUDA.md) na mesma rodada; não renomeie IDs `ajuda-...` sem ajustar os gatilhos.
