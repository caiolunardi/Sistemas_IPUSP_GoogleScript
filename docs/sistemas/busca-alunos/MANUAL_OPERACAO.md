# Manual de operação — Busca de Alunos (GRADIP UI v1.0)

Referência de uso, instalação e manutenção da Busca de Alunos. A ajuda incorporada ao app está documentada em [AJUDA.md](AJUDA.md). Este manual descreve a fonte do Git, sem presumir que ela já esteja implantada.

## Uso no dia a dia

1. Abra o endereço `/exec` com a conta institucional @usp.br.
2. Espere a mensagem "N alunos carregados — comece a digitar pra buscar." O campo fica desabilitado até a lista chegar.
3. Digite no campo **Buscar aluno** qualquer combinação de partes do nome, do número USP ou do e-mail (principal ou secundário).
4. Confira o resultado: nome em negrito, e-mails embaixo (o secundário marcado "(secundário)") e número USP no selo à direita. Os trechos que combinaram ficam destacados.

### Regras da busca

| Situação | Comportamento |
|---|---|
| Várias palavras | Separadas por espaço; **todas** precisam aparecer no aluno, em qualquer campo e em qualquer ordem. |
| Acentos e maiúsculas | Ignorados ("claudia" encontra "Cláudia"). |
| Pedaços de palavra | Valem ("fern" encontra "Fernanda" e "Fernandes"). |
| Número USP | Qualquer sequência de dígitos é procurada nos números USP e nos e-mails. |
| Muitos resultados | No máximo 60 na tela, com "Mostrando os primeiros 60 de N resultados". |
| Nenhum resultado | "Nenhum aluno encontrado com esse nome, número USP ou e-mail." |
| Cadastro novo | Só aparece depois de recarregar a página (a lista é lida uma vez, na abertura). |

### Dicas para triagem

- Comece por um sobrenome pouco comum e acrescente o prenome se vierem muitos resultados.
- Evite partículas e nomes muito comuns ("de", "da", "silva") como único termo.
- Sem resultado, tire uma palavra, remova abreviações e teste grafias alternativas ("Luiz"/"Luis", "Teresa"/"Tereza").

### Aparência e ajuda

**Aparência** oferece Sistema, Claro e Escuro. Sistema acompanha o sistema operacional, inclusive com a página aberta; Claro/Escuro ficam guardados só no navegador (`localStorage["gradip-theme"]`). O botão **Ajuda** abre a Central na página inicial; "Como buscar?" e "Não encontrou o aluno?" abrem direto na seção correspondente. A Central tem busca sem acento, FAQ, ESC para fechar e funciona sem chamar o servidor.

### Mensagens e o que fazer

| Mensagem | Significado | O que fazer |
|---|---|---|
| "Carregando lista de alunos..." persistente | A chamada ao servidor não terminou. | Recarregar; conferir a conexão. |
| "Não consegui carregar a lista de alunos: Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID." | Falta a propriedade do script. | Cadastrar a propriedade ([Configuração](#configuração)). |
| "...Não encontrei a chave "PLANILHA_ALUNOS" na planilha ID_INDEX." | A chave não está no índice. | Incluir a linha no `ID_INDEX`. |
| "...a coluna "ID de Produção" está vazia." | Linha da chave sem ID. | Preencher a coluna no `ID_INDEX`. |
| "...precisa ter as colunas "Chave" e "ID de Produção"." | Títulos do índice diferentes. | Corrigir a linha 1 do `ID_INDEX`. |
| "...A planilha de alunos precisa ter uma coluna "<título>"." | Título de coluna renomeado na planilha de alunos. | Restaurar o título exato ou ajustar `CABECALHOS_ALUNOS`. |
| Outra mensagem de acesso | A conta que executa o Web App não abre o índice ou a planilha de alunos. | Conferir `executeAs` e o compartilhamento das duas planilhas. |

## Instalar ou atualizar

A fonte está em [`sistemas/busca-alunos/src/`](../../../sistemas/busca-alunos/src/). Esta entrega não altera nenhum projeto Apps Script nem planilha automaticamente.

### Atualizar o Web App em uso

1. Guarde a versão atual do projeto (cópia dos dois arquivos ou **Arquivo → Fazer uma cópia**) e anote a versão da implantação ativa.
2. Substitua **`Codigo.gs`** e **`BuscaAlunosApp.html`**.
3. Crie sete arquivos HTML na raiz do mesmo projeto:

| Nome no editor (sem extensão) | Conteúdo |
|---|---|
| `GradipTema` | tokens e alternância de tema |
| `GradipTemaControle` | seletor **Aparência** |
| `GradipMarcaIPUSP` | marca IPUSP azul/branca |
| `GradipMarcaUSP` | marca USP azul/branca |
| `BuscaAlunosAjuda` | conteúdo da Central de Ajuda |
| `BuscaAlunosAjudaEstilos` | estilos da Central |
| `BuscaAlunosAjudaUI` | comportamento da Central |

4. Faça a [configuração](#configuração) e rode o [diagnóstico](#diagnóstico).
5. Abra a URL de teste (`/dev`) e faça a [conferência](#conferência-no-dev-e-no-exec).
6. Promova: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. A URL `/exec` não muda. Alterar arquivos não atualiza sozinho um `/exec` fixado numa versão anterior.

Para voltar atrás, edite a implantação e selecione a versão anterior anotada no passo 1.

### Instalar em projeto novo

Crie um projeto Apps Script independente, copie os nove arquivos para a raiz (`.gs` como Script, `.html` como HTML), confirme o runtime V8 e siga os passos 4 a 6 acima, criando uma implantação **App da Web**. O pacote não traz `appsscript.json`; identidade de execução e acesso dependem da implantação real e devem ser registrados em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md), sem IDs.

## Configuração

Em **Configurações do projeto → Propriedades do script**:

| Propriedade | Valor |
|---|---|
| `ID_INDEX_SPREADSHEET_ID` | ID da planilha mestre `ID_INDEX` (não registrar no Git) |

No `ID_INDEX`, aba `Página1` (ou a primeira aba), linha 1 com os títulos `Chave` e `ID de Produção` em qualquer coluna, e uma linha com `Chave` = `PLANILHA_ALUNOS`. Se a chave estiver repetida, vale a primeira. A coluna de homologação não é lida.

Na planilha de alunos, a primeira aba precisa ter na linha 1 os títulos exatos `Número USP`, `Nome do Aluno`, `Tr eMail` e `eMail Secundario`, em qualquer posição. Linhas sem número USP e sem nome são ignoradas. Outras colunas não são enviadas ao navegador.

A conta que executa o Web App precisa ler as duas planilhas.

## Diagnóstico

No editor, selecione `diagnosticarBuscaAlunos` e clique em **Executar**. Em **Registros de execução** aparecem: se a propriedade existe, qual aba do índice foi lida, se `PLANILHA_ALUNOS` foi encontrada, se cada coluna esperada existe e quantos alunos seriam enviados. Nenhum ID, nome, número USP ou e-mail é registrado.

## Conferência no `/dev` e no `/exec`

- [ ] Contagem de alunos carregados coerente com a planilha.
- [ ] Busca por parte do nome, por número USP e por e-mail secundário.
- [ ] Mais de 60 resultados mostra o aviso; termo inexistente mostra a mensagem de vazio.
- [ ] **Aparência**: Sistema, Claro e Escuro; recarregar mantém a escolha manual.
- [ ] Marcas IPUSP e USP corretas nos dois temas (USP azul no Claro, branca no Escuro).
- [ ] **Ajuda**, "Como buscar?" e "Não encontrou o aluno?" abrem a seção certa; ESC fecha.
- [ ] Celular (≈360–390 px): sem rolagem horizontal.
- [ ] Conta sem acesso: comportamento registrado em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md).

## Manutenção

- **Coluna renomeada na planilha de alunos:** ajuste `CABECALHOS_ALUNOS` em `Codigo.gs` (só o texto do título).
- **Planilha de alunos trocada:** atualize a linha `PLANILHA_ALUNOS` no `ID_INDEX`; nenhum código muda.
- **Texto da ajuda:** altere em `BuscaAlunosAjuda.html` e em [AJUDA.md](AJUDA.md) na mesma rodada; não renomeie IDs `ajuda-...` sem ajustar os gatilhos de `BuscaAlunosApp.html`.
- **Tema, marcas e mecanismo da ajuda:** são cópias de arquivos comuns. Atualize a partir de `shared/` ou dos outros sistemas, sem editar só aqui.
- **Limite de resultados:** `MAX_RESULTADOS` no script de `BuscaAlunosApp.html`; a ajuda e este manual citam 60 e precisam ser revisados junto.
- Rode os [testes locais](../../../sistemas/busca-alunos/testes/README.md) depois de qualquer alteração.
