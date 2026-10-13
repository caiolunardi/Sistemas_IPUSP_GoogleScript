# Manual de operação — Busca de Alunos (v1.1)

Referência de uso, instalação e manutenção da Busca de Alunos. A ajuda incorporada ao app está documentada em [AJUDA.md](AJUDA.md). Este manual descreve a fonte do Git, sem presumir que ela já esteja implantada.

## Uso no dia a dia

1. Abra o endereço `/exec` com a conta institucional @usp.br.
2. Espere a mensagem "N alunos carregados — comece a digitar ou escolha um ano de ingresso." Campo e filtros ficam desabilitados até a lista chegar.
3. Digite no campo **Buscar aluno** qualquer combinação de partes do nome, do número USP ou do e-mail (principal ou secundário), e/ou escolha um **Ano de ingresso**.
4. Confira o resultado: nome em negrito com o ingresso ao lado, e-mails embaixo (o secundário marcado "(secundário)") e número USP no selo à direita. Os trechos que combinaram ficam destacados.
5. Clique no aluno para abrir a **ficha**.

### Regras da busca

| Situação | Comportamento |
|---|---|
| Várias palavras | Separadas por espaço; **todas** precisam aparecer no aluno, em qualquer campo e em qualquer ordem. |
| Acentos e maiúsculas | Ignorados ("claudia" encontra "Cláudia"). |
| Pedaços de palavra | Valem ("fern" encontra "Fernanda" e "Fernandes"). |
| Número USP | Qualquer sequência de dígitos é procurada nos números USP e nos e-mails. |
| Muitos resultados | No máximo 60 na tela, com "Mostrando os primeiros 60 de N resultados". A exportação inclui todos. |
| Nenhum resultado | "Nenhum aluno encontrado com esse nome, número USP ou e-mail." (ou "...com esse filtro de ingresso e essa busca.") |
| Cadastro novo de outra pessoa | Só aparece depois de recarregar a página (a lista é lida uma vez, na abertura). |

### Filtrar por ingresso

- **Ano de ingresso** lista todos os anos presentes na coluna `Ingresso`, do mais recente ao mais antigo, com a quantidade de alunos entre parênteses. O ano são os quatro primeiros dígitos (2024/1 → 2024).
- **Semestre** (Ambos, 1º, 2º) fica disponível depois de escolher o ano; usa o dígito depois da barra (2024/1 → 1º semestre).
- Com ano escolhido e campo de busca vazio, aparece a turma inteira em ordem alfabética. Com texto, o filtro restringe a busca.
- "Todos os anos" volta à busca geral. Ingresso vazio ou fora do formato AAAA/S só aparece em "Todos os anos"; corrija pela ficha.

### Exportar

**Exportar CSV** e **Exportar PDF** ficam disponíveis quando há resultado e exportam **todos** os alunos do resultado atual (ano, semestre e texto), não só os 60 da tela.

| Formato | Conteúdo e uso |
|---|---|
| CSV | Colunas Nome do Aluno; Número USP; Ingresso; eMail; eMail Secundario. UTF-8 com BOM e separador `;`, para abrir com acentos no Excel e no Google Planilhas. Para uma lista de e-mails (ex.: pedido do setor de comunicação), use a coluna eMail. Nome do arquivo: `alunos_ingresso-2024.csv`, `alunos_ingresso-2024-1.csv`, `alunos_ingresso-2024_busca.csv` etc. |
| PDF | Mesmas colunas, numeradas, em A4 deitado, com título do filtro, quantidade, data/hora e aviso de dados pessoais. Gerado no servidor, sem salvar no Drive. Até 5.000 alunos. |

Os arquivos contêm dados pessoais: envie só a quem pediu, para a finalidade informada, e apague cópias desnecessárias.

### Ficha do aluno e edição

1. Clique no resultado (ou Tab até ele e Enter). A ficha mostra **todas as colunas com título** da linha do aluno, na ordem da planilha.
2. Quem é **editor da planilha de alunos** pode alterar os campos. O campo alterado fica marcado e o rodapé informa quantos campos mudaram.
3. **Salvar alterações** grava só as células modificadas e mostra "Alterações salvas na planilha." A lista da página já passa a refletir o dado novo (o aluno pode sair do filtro atual, se o ingresso mudou).
4. **Fechar**, × ou Esc fecham. Com alteração não salva, a página pergunta antes de descartar.

| Regra | Detalhe |
|---|---|
| Quem pode salvar | Conta identificada que esteja entre os editores (ou seja a dona) da planilha de alunos, individualmente. Compartilhamento só por grupo não é reconhecido. Os demais veem a ficha só para consulta, com aviso no topo. |
| Somente leitura | `ID da Pasta` (usado por outro sistema) e qualquer célula com fórmula. Aparecem com borda tracejada e "(somente leitura)". |
| Formatos | Número USP: só dígitos. Ingresso: `AAAA/1` ou `AAAA/2`. eMail e eMail Secundario: formato de e-mail (o secundário pode ficar vazio). Nome do Aluno: não vazio. Demais colunas: texto livre, até 500 caracteres. |
| Conflito | Se o campo foi alterado por outra pessoa depois que a ficha abriu, a gravação é recusada. |
| Linha mudou | Se a planilha foi ordenada ou teve linhas inseridas/apagadas depois que a página abriu, a ficha não abre ou não salva; recarregue a página. |
| Tipo da célula | Número USP guardado como número continua número; o resto é gravado como texto, como digitado. |

### Aparência e ajuda

**Aparência** oferece Sistema, Claro e Escuro. Sistema acompanha o sistema operacional, inclusive com a página aberta; Claro/Escuro ficam guardados só no navegador (`localStorage["gradip-theme"]`). O botão **Ajuda** abre a Central; "Como buscar?", "Filtrar e exportar por ingresso" e "Não encontrou o aluno?" abrem direto na seção correspondente.

### Mensagens e o que fazer

| Mensagem | Significado | O que fazer |
|---|---|---|
| "Carregando lista de alunos..." persistente | A chamada ao servidor não terminou. | Recarregar; conferir a conexão. |
| "...Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID." | Falta a propriedade do script. | Cadastrar a propriedade ([Configuração](#configuração)). |
| "...Configuração obrigatória ausente: 1AbC..." (um ID no lugar do nome) | O ID foi colado em `PROPRIEDADE_ID_INDICE` no código. | Voltar a constante para `"ID_INDEX_SPREADSHEET_ID"` e pôr o ID só no **Valor** da propriedade. |
| "...Não encontrei a chave "PLANILHA_ALUNOS" na planilha ID_INDEX." | A chave não está no índice. | Incluir a linha no `ID_INDEX`. |
| "...a coluna "ID de Produção" está vazia." | Linha da chave sem ID. | Preencher a coluna no `ID_INDEX`. |
| "...precisa ter as colunas "Chave" e "ID de Produção"." | Títulos do índice diferentes. | Corrigir a linha 1 do `ID_INDEX`. |
| "...A planilha de alunos precisa ter uma coluna "<título>"." | Título renomeado na planilha de alunos. | Restaurar o título exato ou ajustar `CABECALHOS_ALUNOS`. |
| "Sua conta não tem permissão para alterar a planilha de alunos..." | Quem usa não é editor individual da planilha. | Dar acesso de editor à conta, ou seguir só consultando. |
| "O campo "X" foi alterado por outra pessoa..." | Conflito de edição. | Fechar, reabrir o aluno e refazer. |
| "A planilha de alunos mudou desde que esta página foi aberta..." | Linhas ordenadas/inseridas/apagadas. | Recarregar a página. |
| "O ingresso deve estar no formato AAAA/S..." e similares | Valor fora do formato. | Corrigir o campo e salvar de novo. |
| "Outra gravação está em andamento..." | Duas gravações ao mesmo tempo. | Esperar alguns segundos e salvar de novo. |
| "Não consegui gerar o PDF: ...mais de 5000 alunos..." | Lista grande demais para o PDF. | Filtrar por ano/semestre ou usar CSV. |
| Outra mensagem de acesso | A conta que executa o Web App não abre o índice ou a planilha de alunos. | Conferir `executeAs` e o compartilhamento das duas planilhas. |

## Instalar ou atualizar

A fonte está em [`sistemas/busca-alunos/src/`](../../../sistemas/busca-alunos/src/). Esta entrega não altera nenhum projeto Apps Script nem planilha automaticamente.

### Atualizar o Web App em uso

1. Guarde a versão atual do projeto e anote a versão da implantação ativa.
2. Substitua **`Codigo.gs`**, **`BuscaAlunosApp.html`** e, se já estiver na v1.0, **`BuscaAlunosAjuda.html`**.
3. Vindo do código original, crie também os sete arquivos HTML na raiz do projeto:

| Nome no editor (sem extensão) | Conteúdo |
|---|---|
| `GradipTema` | tokens e alternância de tema |
| `GradipTemaControle` | seletor **Aparência** |
| `GradipMarcaIPUSP` | marca IPUSP azul/branca |
| `GradipMarcaUSP` | marca USP azul/branca |
| `BuscaAlunosAjuda` | conteúdo da Central de Ajuda |
| `BuscaAlunosAjudaEstilos` | estilos da Central |
| `BuscaAlunosAjudaUI` | comportamento da Central |

4. Faça a [configuração](#configuração).
5. Rode o [diagnóstico](#diagnóstico) e **aceite a nova autorização** pedida pelo Google: a v1.1 lê o e-mail de quem usa (para conferir se é editor) e grava na planilha.
6. Abra a URL de teste (`/dev`) e faça a [conferência](#conferência-no-dev-e-no-exec).
7. Promova: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. A URL `/exec` não muda.

Para voltar atrás, edite a implantação e selecione a versão anterior anotada no passo 1.

### Instalar em projeto novo

Crie um projeto Apps Script independente, copie os nove arquivos para a raiz (`.gs` como Script, `.html` como HTML), confirme o runtime V8 e siga os passos 4 a 7 acima, criando uma implantação **App da Web**. O pacote não traz `appsscript.json`; identidade de execução e acesso dependem da implantação real e devem ser registrados em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md), sem IDs.

## Configuração

Em **Configurações do projeto → Propriedades do script → Adicionar propriedade do script**:

| Campo **Propriedade** | Campo **Valor** |
|---|---|
| `ID_INDEX_SPREADSHEET_ID` | ID da planilha mestre `ID_INDEX` (não registrar no Git) |

No `ID_INDEX`, aba `Página1` (ou a primeira aba), linha 1 com os títulos `Chave` e `ID de Produção` em qualquer coluna, e uma linha com `Chave` = `PLANILHA_ALUNOS`. Se a chave estiver repetida, vale a primeira. A coluna de homologação não é lida.

Na planilha de alunos, a primeira aba precisa ter na linha 1 os títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail` e `eMail Secundario`, em qualquer posição (espaços nas pontas são ignorados). Linhas sem número USP e sem nome são ignoradas na busca. Na ficha aparecem todas as colunas com título; só as cinco acima vão para a lista e para as exportações.

A conta que executa o Web App precisa **editar** a planilha de alunos (para gravar) e ler o `ID_INDEX`. Quem vai editar pela página precisa ser editor individual da planilha de alunos.

## Diagnóstico

No editor, selecione `diagnosticarBuscaAlunos` e clique em **Executar**. Em **Registros de execução** aparecem: se a propriedade existe, qual aba do índice foi lida, se `PLANILHA_ALUNOS` foi encontrada, se cada coluna esperada existe e quantos alunos seriam enviados. Nenhum ID, nome, número USP ou e-mail é registrado.

## Conferência no `/dev` e no `/exec`

- [ ] Contagem de alunos carregados coerente com a planilha.
- [ ] Busca por parte do nome, por número USP e por e-mail secundário.
- [ ] Combobox de anos com todos os anos da coluna Ingresso; semestre filtra; turma em ordem alfabética.
- [ ] CSV e PDF de um ano abrem corretamente, com acentos, e com a quantidade mostrada na tela.
- [ ] Ficha abre com todas as colunas; `ID da Pasta` somente leitura.
- [ ] Com conta editora: alterar um campo de teste, salvar, conferir na planilha e desfazer.
- [ ] Com conta não editora: ficha só consulta e gravação recusada.
- [ ] **Aparência**: Sistema, Claro e Escuro; recarregar mantém a escolha manual.
- [ ] Marcas IPUSP e USP corretas nos dois temas.
- [ ] **Ajuda** e gatilhos abrem a seção certa; ESC fecha.
- [ ] Celular (≈360–390 px): sem rolagem horizontal; ficha em tela cheia.

## Manutenção

- **Coluna renomeada na planilha de alunos:** ajuste `CABECALHOS_ALUNOS` em `Codigo.gs` (só o texto do título).
- **Outra coluna que não pode ser editada:** inclua o título em `COLUNAS_SOMENTE_LEITURA`.
- **Planilha de alunos trocada:** atualize a linha `PLANILHA_ALUNOS` no `ID_INDEX`; nenhum código muda.
- **Texto da ajuda:** altere em `BuscaAlunosAjuda.html` e em [AJUDA.md](AJUDA.md) na mesma rodada; não renomeie IDs `ajuda-...` sem ajustar os gatilhos de `BuscaAlunosApp.html`.
- **Tema, marcas e mecanismo da ajuda:** são cópias de arquivos comuns. Atualize a partir de `shared/` ou dos outros sistemas, sem editar só aqui.
- **Limites:** `MAX_RESULTADOS` (60, em `BuscaAlunosApp.html`), `TAMANHO_MAXIMO_CAMPO` (500) e `MAXIMO_LINHAS_EXPORTACAO` (5.000, em `Codigo.gs`). A ajuda e este manual citam esses números e precisam ser revisados junto.
- Rode os [testes locais](../../../sistemas/busca-alunos/testes/README.md) depois de qualquer alteração.
