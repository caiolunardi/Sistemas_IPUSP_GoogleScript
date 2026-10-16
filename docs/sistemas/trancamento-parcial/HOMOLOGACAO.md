# Homologação — Trancamento Parcial de Matrícula (formulário dos alunos)

**Estado:** v1.1 verificada localmente em 16/10/2026; **homologação no `/exec` pendente**. A chave `TRANCAMENTO_PARCIAL_MATRICULA` foi criada no `ID_INDEX` pelo responsável funcional, que também confirmou a implantação ("Executar como: Eu", qualquer pessoa da USP) e que a migração da planilha DISCIPLINAS já rodou.

## Base recebida

Arquivos do projeto Apps Script em uso, recebidos em 16/10/2026. Os originais **não** foram versionados porque tinham os IDs das planilhas literais.

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `34a065446a82f6bb4cd29e556f00dcd96a493583b48bc44e683bf22f38332929` |
| `TrancamentoParcialApp.html` | `87c68d085fd14820c192393148ff449e6530ce5a3420816a7c53047264623948` |

## Arquivos da fonte v1.1

| Arquivo | SHA-256 v1.1 |
|---|---|
| `Codigo.gs` | `9961f5c40fee58a11568b28fb4cb08d0006640860e8fd18bc09dad4851d9cd8d` |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` |
| `TrancamentoParcialAjuda.html` | `ca8d1e879081be7ea9dfd8339e1607b28396ecee6fed53f978f31cc889703bd0` |
| `TrancamentoParcialAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` |
| `TrancamentoParcialAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` |
| `TrancamentoParcialApp.html` | `5e7a75df60115274d65ad7a50cd79c8d6b1e1157c1614503829698f29d31a7d7` |

`GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html` e `GradipMarcaUSP.html` são byte-idênticos às cópias do Trancamento Total e dos outros sistemas. `TrancamentoParcialAjudaEstilos.html` e `TrancamentoParcialAjudaUI.html` são byte-idênticos a `shared/ajuda/`.

## Decisões do responsável funcional (16/10/2026)

- Tirar o cadastro automático do aluno na planilha de alunos.
- Implantação já em "Executar como: Eu", qualquer pessoa da USP.
- Chave `TRANCAMENTO_PARCIAL_MATRICULA` criada.
- Código fora do cadastro (ou cadastro vazio): o aluno digita o nome.
- A pergunta "menos de 12 créditos-aula" continua respondida pelo aluno: o app não tem a matrícula dele, e a equipe confere no Júpiter.
- Justificativa opcional.
- Nenhum e-mail para a caixa do Serviço de Graduação; o gerenciador fica parado.

## v1.1 — o que mudou

**`Codigo.gs`**

- Saíram `ID_PLANILHA_ALUNOS`, `ID_PLANILHA_RESPOSTAS`, `ID_PLANILHA_PERIODOS`, as constantes `COL_*` e `cadastrarAlunoSeNecessario_`. Entraram `obterIdIndice_`, `obterIdProducao_` (cache de 10 min), `abrirPlanilhaPorChave_`/`abrirAbaPorChave_` e `erroParaAluno_`.
- Período: mesma lógica da v1.0 (datas em texto, fuso de Brasília), lendo pela chave `PERIODOS`; falha ou linha ausente fecham o formulário com mensagem sem detalhe técnico. Ano pelo fuso de Brasília (`getFullYear` saiu).
- `buscarAlunoPorEmail_` pelo título, com e-mail secundário; falha não bloqueia.
- `montarCatalogo_`/`obterCatalogo_` (cache de 1 h em pedaços de 90 KB) e `obterCatalogoDisciplinas` (com login).
- `pedidosDoEmail_`: histórico pelo título, com `pendente` e disciplinas.
- `registrarSolicitacao`: período conferido de novo; `ciencia` precisa ser `true`; créditos de 1 a 99; `validarDisciplinas_` (código obrigatório, nome do cadastro, código antigo trocado pelo atual, repetida recusada, nome digitado só fora do cadastro); justificativa opcional e recusada acima de 4.000; `tryLock` com mensagem; colunas pelo título e ciência pelo começo do texto; `appendRow`; recibo `noReply` fora da trava; devolve `reciboEnviado` e as disciplinas gravadas.

**`TrancamentoParcialApp.html`**

- Tema GRADIP com tokens (nenhuma cor literal nova), cabeçalho padrão com **Aparência** e **Ajuda**, telas com tokens.
- Disciplinas: linhas com código e nome, **+ Adicionar disciplina** (até 6) e **Remover** com renumeração; nome e créditos pelo cadastro; aviso de código antigo; nome liberado para código fora do cadastro (ao completar 7 caracteres ou ao sair do campo); aviso quando o cadastro não carrega.
- Validação no campo (`aria-invalid`, `aria-describedby`), resumo `role="alert"`, foco no primeiro problema; erros do servidor no resumo (antes: `alert`).
- Saíram o ano de ingresso e o aviso de que o cadastro seria criado; e-mail do login em campo só leitura.
- Histórico com selo **Pendente**/**Concluído** e as disciplinas de cada pedido.
- Tela de sucesso com as disciplinas gravadas e o aviso do recibo; os dois botões da v1.0 continuam ("Enviar nova solicitação" pega o `/exec` do servidor).
- Texto das regras igual ao da v1.0, salvo o item sobre informar "sigla e nome", que agora fala do código.

**Central de Ajuda**: `TrancamentoParcialAjuda.html` (conteúdo, ver [AJUDA.md](AJUDA.md)) + cópias de `shared/ajuda/`. Sem chamada ao servidor.

## Verificação local (16/10/2026)

```bash
node sistemas/trancamento-parcial/formulario/testes/testar_backend.js    # 34 ok
node sistemas/trancamento-parcial/formulario/testes/testar_navegador.js  # 173 ok (Chromium real)
```

- **Backend:** login com domínio exato; período (1º e 2º semestre, antes/depois da janela, Contínuo, linha ausente, planilha sem acesso); pré-preenchimento pelo título; histórico do próprio e-mail com disciplinas; cadastro (aba `DISCIPLINAS` mesmo não sendo a primeira, só código/nome/créditos saem, substituída perde, códigos anteriores, cache em pedaços com 3.000 disciplinas, sem chave ou aba); gravação pelo título com colunas embaralhadas e ciência com outras datas; nome do cadastro sobrepõe o da página; validações; fórmula neutralizada; trava; coluna ausente bloqueia; planilha de alunos nunca é escrita; recibo; logs sem dados pessoais; ausência de ID literal.
- **Navegador:** carga e datas; nome pelo código; código antigo; fora do cadastro; código curto liberado ao sair; validação (6 itens, foco, resumo, repetida); remover renumera; créditos só dígitos; contador; envio com o payload esperado; tela de sucesso; limite de 6; histórico; cadastro fora do ar e com erro; erro do servidor; fora do período; sem login; erro de carga sem detalhe técnico; Central de Ajuda (busca sem acento, FAQ, ESC, gatilho contextual, todos os gatilhos com seção); sem erros de JavaScript.
- **Tema:** Sistema nos dois esquemas; Escuro manual persiste e ignora o sistema; Sistema acompanha mudança com a página aberta; marca por tema.
- **Contraste medido** (texto ≥ 4,5:1; bordas ≥ 3:1):

| Par | Claro | Escuro |
|---|---|---|
| texto das regras / cartão | 14,76 | 15,36 |
| texto secundário / cartão | 5,45 | 7,88 |
| link e títulos de seção | 6,92 | 7,64 |
| "Encontrada no cadastro" / linha | 4,79 | 8,89 |
| "não está no cadastro" / linha | 4,80 | 9,27 |
| nome (só leitura) | 14,76 | 15,36 |
| + Adicionar disciplina | 6,92 | 7,64 |
| mensagem de erro | 6,47 | 6,13 |
| botão Enviar | 7,97 | 5,10 |
| borda dos campos | 3,41 | 3,49 |
| borda das opções | 3,41 | 3,82 |

- **Larguras:** 360, 390, 480, 768 e 1280 px, nos dois temas: sem rolagem horizontal, cabeçalho e linhas de disciplina dentro da tela, alvos ≥ 44 px (inclusive código, nome, Adicionar e Remover), Central de Ajuda sem rolagem horizontal.

**Limites:** o backend simulado não reproduz o Apps Script real. Falta conferir no `/exec`: nova autorização, recibo chegando, a aba e os títulos reais da DISCIPLINAS, um pedido aparecendo no gerenciador (que lê as disciplinas como texto e passa a receber `CÓDIGO - Nome` padronizado) e o PNG da marca USP.

## Capturas

Telas da v1.1 com dados fictícios, nos temas claro e escuro e em 360/768 px: [evidencias/1.1](evidencias/1.1/README.md).

## v1.2 — ambiente de homologação (16/10/2026)

Pedido do responsável funcional: testar no `/exec` sem tocar nas planilhas de produção. Numa cópia do projeto, a propriedade `AMBIENTE` = `homologacao` faz as chaves serem lidas na coluna `Homologação` do `ID_INDEX`; a página mostra uma faixa de aviso e o título e o assunto do recibo começam por `[HOMOLOGAÇÃO]`. Sem a propriedade, a produção funciona como na v1.1. Montagem e roteiro: [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md).

Só dois arquivos mudaram; os demais continuam com os hashes da v1.1.

| Arquivo | SHA-256 v1.2 |
|---|---|
| `Codigo.gs` | `3194f2dae451b7c3e25908a4c904ba5ddb11adb7facc7f50f9c417b8273f6dbb` |
| `TrancamentoParcialApp.html` | `1424443dbf081b70c8c5397fee99c37c41eabceb0dd290e6835b94f1881585c8` |

```bash
node sistemas/trancamento-parcial/formulario/testes/testar_backend.js    # 40 ok (eram 36)
node sistemas/trancamento-parcial/formulario/testes/testar_navegador.js  # 183 ok (eram 173)
```

- **Servidor:** com `AMBIENTE` = `homologacao` (com espaços e maiúsculas), só o `ID_INDEX` e as planilhas da coluna `Homologação` são abertos, o pedido é gravado e o assunto e o título levam `[HOMOLOGAÇÃO]`; célula `Homologação` vazia é erro sem cair na produção; valor desconhecido não abre nenhuma planilha de dados e marca a página; sem a propriedade, título e assunto não mudam.
- **Navegador:** a faixa não existe em produção; na homologação aparece com texto (não só cor), contraste medido 13,84 e 4,71 no claro e 14,26 e 9,43 no escuro (texto e destaque sobre o fundo de aviso), sem rolagem lateral em 360 px e sem erro de JavaScript. [Capturas](evidencias/1.2/README.md).
- **Ainda não testado no Google:** a cópia do projeto com `AMBIENTE`, a leitura da coluna real do `ID_INDEX` e o recibo com o prefixo.
