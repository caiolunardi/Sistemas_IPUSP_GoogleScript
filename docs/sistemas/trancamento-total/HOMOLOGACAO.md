# Homologação — Trancamento Total de Matrícula (formulário dos alunos)

**Estado:** v1.2 verificada localmente em 15/10/2026; **homologação no `/exec` pendente**. A v1.1 foi publicada no repositório no mesmo dia e o responsável funcional configurou as chaves do `ID_INDEX`. Esta página registra as diferenças, os hashes e os testes; não atesta a configuração da implantação.

## Base recebida

Arquivos do projeto Apps Script em uso, recebidos em 15/10/2026. Os originais **não** foram versionados porque tinham os IDs das planilhas literais.

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `11e38af7c53d8ffb26124ec2ccdba02dbb1a6afc011d7c45fd3a0006919731c6` |
| `TrancamentoFormApp.html` | `a8e19acd88a2fdd6328424078e463720b67465ce90993df5b02bc0d1734db0d0` |

## Arquivos da fonte v1.2

| Arquivo | SHA-256 v1.2 |
|---|---|
| `Codigo.gs` | `c0192a1adfbc74ba29d175b6b4a0a7f5cbe094da3f21093feeeeb6c8c22f8abd` |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` |
| `TrancamentoFormAjuda.html` | `05381857a6a749316951af5065864677f1e16850e4bb6ce108858f1a0e62d193` |
| `TrancamentoFormAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` |
| `TrancamentoFormAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` |
| `TrancamentoFormApp.html` | `6137ea3139c621b25de7415fa6b41dbe056fa3ade8bff18c7cd40a508e711a9c` |

`GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html` e `GradipMarcaUSP.html` são byte-idênticos às cópias da Comunidade IPUSP e dos outros sistemas (o `GradipTema.html` dos sistemas tem `--gradip-border-strong` corrigido para ≥ 3:1; o de `shared/` ainda não). `TrancamentoFormAjudaEstilos.html` e `TrancamentoFormAjudaUI.html` são byte-idênticos a `shared/ajuda/`.

## v1.1 — IDs pelo ID_INDEX (backend)

`Codigo.gs`: `ID_PLANILHA_ALUNOS`/`ID_PLANILHA_RESPOSTAS` saíram; entraram `obterIdIndice_`, `obterIdProducao_` (cache de 10 min) e `abrirAbaPorChave_`. `buscarAlunoPorEmail_` lê pelo título (`CABECALHOS_ALUNOS`) e aceita o e-mail secundário. `obterDadosIniciais` tolera falha da planilha de alunos. `registrarSolicitacao`: `tryLock` com mensagem, `colunaConfirmacao_` pelo título, `appendRow`, justificativa acima do limite recusada, erro de configuração genérico para o aluno (`erroParaAluno_`). Página: só `maxlength="4000"` na justificativa.

## v1.2 — pedidos do Serviço de Graduação

Decisões do responsável funcional em 15/10/2026: aceitas as sugestões 1 a 5 (recibo, aviso de pendente, justificativa opcional, texto das regras, UX); recusada a 6 (e-mail à equipe a cada pedido), porque o painel do Serviço de Graduação já mostra os pendentes e a caixa não deve receber mais e-mails.

**`Codigo.gs`** (backend alterado porque a rodada incluía funcionalidades, não só visual)

- `estaConcluido_`, `pedidosDoEmail_` (histórico com `pendente`); `buscarHistoricoCompleto_` passa a usá-lo.
- `registrarSolicitacao`: justificativa opcional; `confirmarNovoPedido`; dentro da trava, recusa com `PEDIDO_PENDENTE:` se houver pedido não concluído do mesmo e-mail e não houver confirmação; depois de gravar, `enviarRecibo_` (texto simples, `noReply`, cópia para o contato quando diferente) fora da trava; devolve `reciboEnviado`.
- `include_` e `doGet` com template já existiam.

**`TrancamentoFormApp.html`**

- Tema GRADIP: tokens em todas as cores (nenhuma cor literal nova), cabeçalho padrão com marcas por tema, **Aparência** e **Ajuda**; telas de bloqueio, sucesso e carregamento com tokens.
- Validação na página com erro no próprio campo (`aria-invalid`, `aria-describedby`), resumo `role="alert"` e foco no primeiro problema; erros do servidor no mesmo resumo (antes: `alert`). Erro de carga não mostra mais a mensagem técnica.
- Rótulos associados (`for`/`id`); confirmação em `fieldset`/`legend`; botão `submit` de formulário real.
- Contador da justificativa; "(opcional)" e explicação da regra dos dois anos.
- Histórico com selo **Pendente**/**Concluído** (texto + cor); bloco de pedido pendente com a caixa de confirmação; tratamento de `PEDIDO_PENDENTE` vindo do servidor.
- Tela de sucesso diz se o recibo foi enviado; foco vai para a tela.
- Texto das regras: removido o parágrafo repetido sobre cancelamento (ficou a versão com a referência ao Regimento Geral); "concedido ao(à) aluno(a)"; "ressalvados os casos".
- Aviso "Preenchido automaticamente" some quando o aluno edita o campo.

**Central de Ajuda**: `TrancamentoFormAjuda.html` (conteúdo, ver [AJUDA.md](AJUDA.md)) + cópias de `shared/ajuda/`. Sem chamada ao servidor.

## Verificação local (15/10/2026)

```bash
node sistemas/trancamento-total/formulario/testes/testar_backend.js    # 23 ok
node sistemas/trancamento-total/formulario/testes/testar_navegador.js  # 139 ok (Chromium real)
```

- **Backend:** login e domínio exato, pré-preenchimento pelo título e e-mail secundário, falhas de planilha, gravação com identidade da sessão, confirmação pelo título, neutralização de fórmula, validações, justificativa opcional, recibo (destino, cópia, `noReply`, falha não perde o pedido), pedido pendente, trava ocupada, logs sem dados pessoais, ausência de ID literal.
- **Navegador:** carga, pré-preenchimento, validação (4 campos, foco, resumo), faixa do ano, NÃO, contador, envio com justificativa vazia, tela de sucesso e recibo, histórico com selos, pedido pendente (da carga e do servidor), não encontrado, sem login, erro de carga sem detalhe técnico, Central de Ajuda (abrir, busca sem acento, FAQ, ESC com retorno de foco e scroll lock, gatilho contextual, todos os gatilhos com seção), sem erros de JavaScript.
- **Tema:** Sistema resolvido pelo sistema operacional nos dois esquemas; seletor mostra **Sistema**; Escuro manual persiste após recarregar e ignora mudança do sistema; voltando a Sistema, acompanha a mudança com a página aberta; marca azul no Claro e branca no Escuro.
- **Contraste medido** (texto ≥ 4,5:1; bordas de campo ≥ 3:1):

| Par | Claro | Escuro |
|---|---|---|
| texto das regras / cartão | 14,76 | 15,36 |
| texto secundário / cartão | 5,45 | 7,88 |
| link e títulos de seção / cartão | 6,92 | 7,64 |
| "Preenchido automaticamente" / cartão | 5,02 | 9,73 |
| mensagem de erro / cartão | 6,47 | 6,13 |
| botão Enviar | 7,97 | 5,10 |
| subtítulo do cabeçalho | 5,45 | 8,35 |
| botão Ajuda | 6,36 | 7,25 |
| borda do campo / fundo do campo | 3,41 | 3,49 |
| borda das opções SIM/NÃO / cartão | 3,41 | 3,82 |

- **Larguras:** 360, 390, 480, 768 e 1280 px, nos dois temas: sem rolagem horizontal, cabeçalho dentro da tela, alvos (Enviar, Ajuda, Aparência, opções, campos) ≥ 44 px, Central de Ajuda com fechar visível e sem rolagem horizontal.

**Limites:** o backend simulado não reproduz o Apps Script real (autorização de e-mail, cota, `Session` no domínio). Falta conferir no `/exec`: nova autorização, recibo chegando (e não em spam), pedido aparecendo no gerenciador e no painel, e o PNG da marca USP (substituído por um retângulo nos testes).

## Capturas

Telas da v1.2 com dados fictícios, nos temas claro e escuro e em 360/768 px: [evidencias/1.2](evidencias/1.2/README.md).

## v1.3 — ambiente de homologação (16/10/2026)

Pedido do responsável funcional: testar no `/exec` sem tocar nas planilhas de produção. Numa cópia do projeto, a propriedade `AMBIENTE` = `homologacao` faz as chaves serem lidas na coluna `Homologação` do `ID_INDEX`; a página mostra uma faixa de aviso e o título e o assunto do recibo começam por `[HOMOLOGAÇÃO]`. Sem a propriedade, a produção funciona como na v1.2. Montagem e roteiro: [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md).

Só dois arquivos mudaram; os demais continuam com os hashes da v1.2.

| Arquivo | SHA-256 v1.3 |
|---|---|
| `Codigo.gs` | `3a4f10a8283f0e5d83e011da66c511d11fab88c14249b80c44da3b50d96edfed` |
| `TrancamentoFormApp.html` | `7d6455eacbd766bb955dcefb944aa399acd1afc2d6ef2e0f356ca6a94e92dc34` |

```bash
node sistemas/trancamento-total/formulario/testes/testar_backend.js    # 27 ok (eram 23)
node sistemas/trancamento-total/formulario/testes/testar_navegador.js  # 149 ok (eram 139)
```

- **Servidor:** com `AMBIENTE` = `homologacao` (com espaços e maiúsculas), só o `ID_INDEX` e as planilhas da coluna `Homologação` são abertos, o pedido é gravado e o assunto e o título levam `[HOMOLOGAÇÃO]`; célula `Homologação` vazia é erro sem cair na produção; valor desconhecido não abre nenhuma planilha de dados e marca a página; sem a propriedade, título e assunto não mudam.
- **Navegador:** a faixa não existe em produção; na homologação aparece com texto (não só cor), contraste medido 13,84 e 4,71 no claro e 14,26 e 9,43 no escuro (texto e destaque sobre o fundo de aviso), sem rolagem lateral em 360 px e sem erro de JavaScript. [Capturas](evidencias/1.3/README.md).
- **Ainda não testado no Google:** a cópia do projeto com `AMBIENTE`, a leitura da coluna real do `ID_INDEX` e o recibo com o prefixo.
