# Manual de operação — Comunidade IPUSP (v1.3)

Referência de uso, instalação e manutenção da Comunidade IPUSP, antiga Busca de Alunos (pasta `busca-alunos` e nomes de arquivo mantidos). A ajuda incorporada ao app está documentada em [AJUDA.md](AJUDA.md). Este manual descreve a fonte do Git, sem presumir que ela já esteja implantada.

## Uso no dia a dia

1. Abra o endereço `/exec` com a conta institucional @usp.br.
2. Espere a mensagem "N alunos, N docentes, N servidores e N setores carregados — comece a digitar ou escolha um ano de ingresso." Campo e filtros ficam desabilitados até a lista chegar.
3. Digite no campo **Buscar pessoa** qualquer combinação de partes do nome, do número USP, do e-mail (principal ou secundário) ou do setor, e/ou escolha um **Ano de ingresso** (só alunos).
4. Confira o resultado: o selo **Aluno**, **Docente**, **Servidor** ou **Setor**, o nome em negrito e, embaixo, os e-mails (e, no servidor, o setor). Alunos mostram também o ingresso. Pessoas (aluno, docente, servidor) mostram o número USP à direita; setores não. Os trechos que combinaram ficam destacados.
5. Clique no **número USP** para copiá-lo: aparece por 3 segundos, embaixo da tela, "Número USP copiado para área de transferência". Se o navegador bloquear a cópia, a mensagem diz "Não consegui copiar..."; nesse caso, copie pela ficha.
6. Clique no nome (ou Tab até o resultado e Enter) para abrir a **ficha**, de qualquer vínculo.

### De onde vem cada vínculo

| Selo | Cadastro (chave no `ID_INDEX`) | Campos |
|---|---|---|
| Aluno | `PLANILHA_ALUNOS` | colunas pelo título (ver [Configuração](#configuração)) |
| Docente | `PLANILHA_DOCENTES` | colunas pelo título: `N. USP`, `NOME`, `M / F`, `E-mail`, `eMail Secundario` (`TRATAMENTO` é ignorada) |
| Servidor | `SERVIDORES` | colunas pelo título: `E-MAIL`, `NOME`, `Setor`, `N.USP`, `TIPO` = `SERVIDOR`, `eMail Secundario` |
| Setor | `SERVIDORES` | mesma planilha, `TIPO` = `SETOR` (sem número USP). Com `TIPO` vazio vale a regra antiga: NOME vazio, igual ao Setor ou começando com uma palavra de `INICIOS_NOME_SETOR` (Setor, Serviço, Seção, Secretaria...). |

A mesma pessoa aparece uma vez por cadastro em que estiver. Se um cadastro não abrir, os outros aparecem e um aviso amarelo abaixo da busca diz qual faltou e por quê.

### Regras da busca

| Situação | Comportamento |
|---|---|
| Várias palavras | Separadas por espaço; **todas** precisam aparecer na mesma pessoa (nome, número USP, e-mails ou setor), em qualquer ordem. |
| Acentos e maiúsculas | Ignorados ("claudia" encontra "Cláudia"). |
| Pedaços de palavra | Valem ("fern" encontra "Fernanda" e "Fernandes"). |
| Número USP | Qualquer sequência de dígitos é procurada nos números USP e nos e-mails. |
| Muitos resultados | No máximo 60 na tela, com "Mostrando os primeiros 60 de N resultados". A exportação inclui todos. |
| Nenhum resultado | "Nenhuma pessoa encontrada com esse nome, número USP, e-mail ou setor." (com ano escolhido: "Nenhum aluno encontrado com esse filtro de ingresso e essa busca.") |
| Cadastro novo de outra pessoa | Só aparece depois de recarregar a página (a lista é lida uma vez, na abertura). |

### Filtrar por ingresso

- O filtro vale **só para alunos**: com um ano escolhido, docentes, servidores e setores saem da lista.
- **Ano de ingresso** lista todos os anos presentes na coluna `Ingresso`, do mais recente ao mais antigo, com a quantidade de alunos entre parênteses. O ano são os quatro primeiros dígitos (2024/1 → 2024).
- **Semestre** (Ambos, 1º, 2º) fica disponível depois de escolher o ano; usa o dígito depois da barra (2024/1 → 1º semestre).
- Com ano escolhido e campo de busca vazio, aparece a turma inteira em ordem alfabética. Com texto, o filtro restringe a busca.
- "Todos os anos" volta à busca geral. Ingresso vazio ou fora do formato AAAA/S só aparece em "Todos os anos"; corrija pela ficha.

### Exportar

**Exportar CSV** e **Exportar PDF** ficam disponíveis quando há resultado e exportam **todas** as pessoas do resultado atual (ano, semestre e texto), não só as 60 da tela.

| Formato | Conteúdo e uso |
|---|---|
| CSV | Colunas Vínculo; Nome; Setor; Número USP; Ingresso; E-mail; E-mail secundário (vazias quando não se aplicam). UTF-8 com BOM e separador `;`, para abrir com acentos no Excel e no Google Planilhas. Para uma lista de e-mails de turma (ex.: pedido do setor de comunicação), escolha o ano e use a coluna E-mail. Nome do arquivo: `alunos_ingresso-2024.csv`, `alunos_ingresso-2024-1.csv`, `alunos_ingresso-2024_busca.csv`; sem ano, `comunidade_busca.csv`. |
| PDF | Mesmas colunas, numeradas, em A4 deitado, com título do filtro ("Alunos — ingresso 2024" ou "Comunidade IPUSP"), quantidade, data/hora e aviso de dados pessoais. Gerado no servidor, sem salvar no Drive. Até 5.000 pessoas. |

Os arquivos contêm dados pessoais: envie só a quem pediu, para a finalidade informada, e apague cópias desnecessárias.

### Ficha e edição

Vale para alunos, docentes, servidores e setores; cada um é gravado na sua própria planilha.

1. Clique no nome no resultado (ou Tab até ele e Enter). A ficha mostra **todas as colunas com título** da linha, na ordem da planilha. O rótulo diz "Ficha do aluno", "do docente", "do servidor" ou "do setor". Na de docente, o título vem com **Prof.** ou **Profª.**, calculado pelo campo `M / F`; a coluna `TRATAMENTO` não aparece.
2. Quem é **editor da planilha daquele cadastro** pode alterar os campos. O campo alterado fica marcado e o rodapé informa quantos campos mudaram.
3. **Salvar alterações** grava só as células modificadas e mostra "Alterações salvas na planilha." A lista da página já passa a refletir o dado novo (o aluno pode sair do filtro atual, se o ingresso mudou; mudar o `TIPO` troca o selo entre Servidor e Setor).
4. **Fechar**, × ou Esc fecham. Com alteração não salva, a página pergunta antes de descartar.

| Regra | Detalhe |
|---|---|
| Quem pode salvar | Conta identificada que esteja entre os editores (ou seja a dona) da planilha daquele cadastro, individualmente. Compartilhamento só por grupo não é reconhecido. Os demais veem a ficha só para consulta, com aviso no topo. |
| Somente leitura | `ID da Pasta` (usado por outro sistema) e qualquer célula com fórmula. Aparecem com borda tracejada e "(somente leitura)". |
| Formatos | Número USP (`Número USP`, `N. USP`, `N.USP`): só dígitos. Ingresso: `AAAA/1` ou `AAAA/2`. E-mails (principal e secundário): formato de e-mail ou vazio. Nome: não vazio. `M / F`: `M`, `F` ou vazio (gravado em maiúscula). `TIPO`: `SERVIDOR`, `SETOR` ou vazio (gravado em maiúscula). Demais colunas: texto livre, até 500 caracteres. |
| Linha conferida por | Alunos: número USP + nome. Docentes e servidores: nome + e-mail. |
| Conflito | Se o campo foi alterado por outra pessoa depois que a ficha abriu, a gravação é recusada. |
| Linha mudou | Se a planilha foi ordenada ou teve linhas inseridas/apagadas depois que a página abriu, a ficha não abre ou não salva; recarregue a página. |
| Tipo da célula | Número USP guardado como número continua número; o resto é gravado como texto, como digitado. |

### Aparência e ajuda

**Aparência** oferece Sistema, Claro e Escuro. Sistema acompanha o sistema operacional, inclusive com a página aberta; Claro/Escuro ficam guardados só no navegador (`localStorage["gradip-theme"]`). O botão **Ajuda** abre a Central; "Como buscar?", "Filtrar e exportar por ingresso" e "Não encontrou a pessoa?" abrem direto na seção correspondente.

### Mensagens e o que fazer

| Mensagem | Significado | O que fazer |
|---|---|---|
| "Carregando a lista de pessoas..." persistente | A chamada ao servidor não terminou. | Recarregar; conferir a conexão. |
| "...Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID." | Falta a propriedade do script. | Cadastrar a propriedade ([Configuração](#configuração)). |
| "...Configuração obrigatória ausente: 1AbC..." (um ID no lugar do nome) | O ID foi colado em `PROPRIEDADE_ID_INDICE` no código. | Voltar a constante para `"ID_INDEX_SPREADSHEET_ID"` e pôr o ID só no **Valor** da propriedade. |
| "...Não encontrei a chave "PLANILHA_ALUNOS" na planilha ID_INDEX." | A chave não está no índice. | Incluir a linha no `ID_INDEX`. |
| "...a coluna "ID de Produção" está vazia." | Linha da chave sem ID. | Preencher a coluna no `ID_INDEX`. |
| "...precisa ter as colunas "Chave" e "ID de Produção"." | Títulos do índice diferentes. | Corrigir a linha 1 do `ID_INDEX`. |
| "...A planilha de alunos precisa ter uma coluna "<título>"." (ou de docentes, servidores) | Título obrigatório renomeado. Em alunos, os cinco títulos são obrigatórios; em docentes e servidores, só NOME e o e-mail principal. | Restaurar o título (acento, espaço e maiúscula não importam) ou ajustar `CABECALHOS_ALUNOS`/`CABECALHOS_DOCENTES`/`CABECALHOS_SERVIDORES`. |
| Aviso "Atenção: não consegui ler o cadastro de docentes (…)" (ou servidores, alunos) | Aquele cadastro não abriu; os outros aparecem. O motivo vem entre parênteses, sem IDs. | Conferir a chave (`PLANILHA_DOCENTES`, `SERVIDORES`, `PLANILHA_ALUNOS`) no `ID_INDEX` e o acesso de leitura da conta que executa o Web App; rodar o diagnóstico. |
| Card com selo Servidor que deveria ser Setor (ou o contrário) | `TIPO` errado ou vazio. | Corrigir `TIPO` pela ficha (`SERVIDOR` ou `SETOR`). |
| "O campo "M / F" aceita só M ou F" / "O campo "TIPO" aceita só SERVIDOR ou SETOR." | Valor fora do esperado. | Corrigir e salvar de novo. |
| "Não consegui copiar. Selecione o número e use Ctrl+C." | O navegador bloqueou a cópia automática. | Copiar o número pela ficha. |
| "Sua conta não tem permissão para alterar a planilha de alunos..." (ou docentes, servidores) | Quem usa não é editor individual da planilha. | Dar acesso de editor à conta, ou seguir só consultando. |
| "O campo "X" foi alterado por outra pessoa..." | Conflito de edição. | Fechar, reabrir a ficha e refazer. |
| "A planilha de ... mudou desde que esta página foi aberta..." | Linhas ordenadas/inseridas/apagadas. | Recarregar a página. |
| "O ingresso deve estar no formato AAAA/S..." e similares | Valor fora do formato. | Corrigir o campo e salvar de novo. |
| "Outra gravação está em andamento..." | Duas gravações ao mesmo tempo. | Esperar alguns segundos e salvar de novo. |
| "Não consegui gerar o PDF: ...mais de 5000 pessoas..." | Lista grande demais para o PDF. | Refinar a busca, filtrar por ano/semestre ou usar CSV. |
| "Não consegui carregar a lista de pessoas: ..." | Nenhum dos três cadastros abriu; a mensagem é a do cadastro de alunos. | Ver as linhas acima conforme a mensagem; rodar o diagnóstico. |
| Outra mensagem de acesso | A conta que executa o Web App não abre o índice ou um dos cadastros. | Conferir `executeAs` e o compartilhamento das quatro planilhas. |

## Instalar ou atualizar

A fonte está em [`sistemas/busca-alunos/src/`](../../../sistemas/busca-alunos/src/). Esta entrega não altera nenhum projeto Apps Script nem planilha automaticamente.

### Atualizar o Web App em uso

1. Guarde a versão atual do projeto e anote a versão da implantação ativa.
2. Substitua **`Codigo.gs`**, **`BuscaAlunosApp.html`** e **`BuscaAlunosAjuda.html`** (os nomes de arquivo continuam os mesmos desde a v1.0).
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
5. Rode o [diagnóstico](#diagnóstico) e **aceite a autorização** se o Google pedir (desde a v1.1 o app lê o e-mail de quem usa, para conferir se é editor, e grava na planilha de alunos; a v1.2 não acrescenta serviços).
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

No `ID_INDEX`, aba `Página1` (ou a primeira aba), linha 1 com os títulos `Chave` e `ID de Produção` em qualquer coluna, e as linhas `PLANILHA_ALUNOS`, `SERVIDORES` e `PLANILHA_DOCENTES` (as mesmas usadas pela auditoria da Estrutura Curricular). Se a chave estiver repetida, vale a primeira. A coluna de homologação não é lida.

Na planilha de alunos, a primeira aba precisa ter na linha 1 os títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail` e `eMail Secundario`, em qualquer posição (espaços nas pontas são ignorados). Linhas sem número USP e sem nome são ignoradas na busca. Na ficha aparecem todas as colunas com título; só as cinco acima vão para a lista e para as exportações.

Nas planilhas de servidores e de docentes (v1.3), também se lê a primeira aba **pelo título** das colunas, sem diferença de acento, espaço ou maiúscula:

| Planilha | Obrigatórias | Opcionais (vazias se faltarem) | Só na ficha |
|---|---|---|---|
| Servidores (`SERVIDORES`) | `NOME`, `E-MAIL` | `Setor`, `N.USP`, `TIPO`, `eMail Secundario` | `ID da Pasta` (somente leitura) e demais colunas com título |
| Docentes (`PLANILHA_DOCENTES`) | `NOME`, `E-mail` | `N. USP`, `M / F`, `eMail Secundario` | `ID da Pasta` (somente leitura) e demais colunas com título; `TRATAMENTO` é ignorada |

`TRATAMENTO` deixou de ser usada: o app calcula Prof./Profª. a partir de `M / F`. A coluna pode ser apagada da planilha quando for conveniente (nenhum outro sistema do repositório a lê). A auditoria da Estrutura Curricular lê esses dois cadastros **pela posição** (servidores A e-mail, B nome, C setor; docentes B nome, D e-mail); o esquema atual é compatível, mas mover essas colunas exige ajustar `PESSOAS_AUDITORIA` lá.

A conta que executa o Web App precisa **editar** as três planilhas (para gravar) e ler o `ID_INDEX`. Quem vai editar pela página precisa ser editor individual da planilha daquele cadastro.

## Diagnóstico

No editor, selecione `diagnosticarComunidadeIPUSP` (até a v1.1, `diagnosticarBuscaAlunos`) e clique em **Executar**. Em **Registros de execução** aparecem: se a propriedade existe, qual aba do índice foi lida, para cada chave (`PLANILHA_ALUNOS`, `PLANILHA_DOCENTES`, `SERVIDORES`) se foi encontrada, a aba lida e cada coluna esperada ("ok", "NÃO ENCONTRADA (obrigatória)" ou "não encontrada (opcional)"), se `TRATAMENTO` ainda existe, ou o motivo de não abrir; por fim, quantos alunos, docentes, servidores e setores seriam enviados. Nenhum ID, nome, número USP ou e-mail é registrado.

## Conferência no `/dev` e no `/exec`

- [ ] Contagens de alunos, docentes, servidores e setores coerentes com as planilhas; sem aviso amarelo.
- [ ] Busca por parte do nome, por número USP e por e-mail secundário.
- [ ] Um docente conhecido aparece com selo **Docente**; um servidor com **Servidor** e o setor; um e-mail de setor com **Setor**.
- [ ] Combobox de anos com todos os anos da coluna Ingresso; semestre filtra; turma em ordem alfabética.
- [ ] CSV e PDF de um ano abrem corretamente, com acentos, e com a quantidade mostrada na tela.
- [ ] Ficha abre com todas as colunas para aluno, docente, servidor e setor; `ID da Pasta` somente leitura; docente com Prof./Profª. certo e sem `TRATAMENTO`.
- [ ] Clique no número USP copia (colar num editor de texto) e mostra a mensagem por 3 segundos, sem abrir a ficha; setor sem número USP.
- [ ] Com conta editora: alterar um campo de teste em cada cadastro (ex.: `eMail Secundario`), salvar, conferir na planilha e desfazer.
- [ ] Com conta não editora: ficha só consulta e gravação recusada.
- [ ] **Aparência**: Sistema, Claro e Escuro; recarregar mantém a escolha manual.
- [ ] Marcas IPUSP e USP corretas nos dois temas.
- [ ] **Ajuda** e gatilhos abrem a seção certa; ESC fecha.
- [ ] Celular (≈360–390 px): sem rolagem horizontal; ficha em tela cheia.

## Manutenção

- **Coluna renomeada:** ajuste `CABECALHOS_ALUNOS`, `CABECALHOS_DOCENTES` ou `CABECALHOS_SERVIDORES` em `Codigo.gs` (só o texto do título).
- **Outra coluna que não pode ser editada:** inclua o título em `COLUNAS_SOMENTE_LEITURA`.
- **Planilha de alunos, servidores ou docentes trocada:** atualize a linha da chave no `ID_INDEX`; nenhum código muda.
- **Coluna de servidores/docentes mudou de posição:** este app não muda (lê pelo título), mas a auditoria da Estrutura Curricular (`PESSOAS_AUDITORIA`) lê pela posição e precisa ser ajustada.
- **Linha classificada errada como Setor/Servidor:** corrija `TIPO` na ficha.
- **Texto da ajuda:** altere em `BuscaAlunosAjuda.html` e em [AJUDA.md](AJUDA.md) na mesma rodada; não renomeie IDs `ajuda-...` sem ajustar os gatilhos de `BuscaAlunosApp.html`.
- **Tema, marcas e mecanismo da ajuda:** são cópias de arquivos comuns. Atualize a partir de `shared/` ou dos outros sistemas, sem editar só aqui.
- **Limites:** `MAX_RESULTADOS` (60, em `BuscaAlunosApp.html`), `TAMANHO_MAXIMO_CAMPO` (500) e `MAXIMO_LINHAS_EXPORTACAO` (5.000, em `Codigo.gs`). A ajuda e este manual citam esses números e precisam ser revisados junto.
- Rode os [testes locais](../../../sistemas/busca-alunos/testes/README.md) depois de qualquer alteração.
