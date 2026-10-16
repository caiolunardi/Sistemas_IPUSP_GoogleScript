# Homologação — Exclusão de Disciplinas (formulário dos alunos)

**Estado:** v1.1 verificada localmente em 16/10/2026; **homologação no `/exec` pendente**. O responsável funcional informou que a propriedade `ID_INDEX_SPREADSHEET_ID` já está no projeto e que criou a chave `EXCLUSAO_DISCIPLINAS` no `ID_INDEX`.

## Base recebida

Arquivos do projeto Apps Script em uso, recebidos em 16/10/2026. Os originais **não** foram versionados porque tinham os IDs das planilhas literais. A revisão completa da v1.0 está na pasta de arquivos do projeto (fora do Git).

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `2bc46609ee0939e9d83aa3a9e35dde594af253716ce7f9c1ba3d54e08c0ce010` |
| `ExclusaoApp.html` | `deefbd4c2c244d73d26c0189f06209068bd5f34a8637b9408f92df25ea6afd1f` |

## Arquivos da fonte v1.1

| Arquivo | SHA-256 v1.1 |
|---|---|
| `Codigo.gs` | `3efae3bccd87bb600252686f1f3c2001f93fa872ee1a93158a24f46a9289f7f2` |
| `ExclusaoAjuda.html` | `91c7505992f1609a78a7956ac807cb14167e434004676fce298a84b68bf4bcc9` |
| `ExclusaoAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` |
| `ExclusaoAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` |
| `ExclusaoApp.html` | `5931b7c482eff5c4499a03c62e71a2d301f37af31d11ca5eda56e66046d1fab9` |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` |

`GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html` e `GradipMarcaUSP.html` são byte-idênticos às cópias do Trancamento Parcial e dos outros sistemas. `ExclusaoAjudaEstilos.html` e `ExclusaoAjudaUI.html` são byte-idênticos a `shared/ajuda/`.

## Decisões do responsável funcional (16/10/2026)

- Chave `EXCLUSAO_DISCIPLINAS` criada no `ID_INDEX`.
- Gerenciador fica parado e fora do repositório até todos os formulários dos alunos serem reformulados; por isso as colunas da planilha não mudam.
- Tirar o cadastro automático do aluno na planilha de alunos.
- Manter o ano de ingresso (coluna F), pré-preenchido da planilha de alunos.
- Disciplina pelo código com a planilha DISCIPLINAS, gravando `CÓDIGO - Nome` na coluna J.
- Turma sem contar caracteres: o aluno pode escrever só "01".
- Recibo como "não responder".
- Mostrar os pedidos anteriores do aluno e recusar disciplina repetida no mesmo pedido.

## v1.1 — o que mudou

**`Codigo.gs`**

- Saíram `SHEET_ALUNOS_ID`, `SHEET_PERIODOS_ID`, `SHEET_RESPOSTAS_ID`, `buscarAlunoPorEmail` (pública), `cadastrarAlunoSeNaoExistir`, `construirTextoIntroducao`, `paginaFechada` e `autorizarEnvioDeEmail`. Entraram `obterIdIndice_`, `obterIdProducao_` (cache de 10 min), `abrirPlanilhaPorChave_`, `abrirAbaRespostas_`, `exigirUsuarioAutenticado_` e `erroParaAluno_`.
- Período (`verificarPeriodo_`): só Sazonal; janela com datas em texto ou Data, no fuso de Brasília; retificação de N–Q obrigatória na janela aberta; erro, linha ausente ou configuração incompleta fecham. Antes, erro e linha ausente davam "aberto" e caíam em "não configurado".
- `obterDadosIniciais`: identidade pela sessão, período, pré-preenchimento (com ano de ingresso), histórico agrupado pelo Pedido ID e URL do `/exec`.
- Catálogo DISCIPLINAS igual ao do Trancamento Parcial (`montarCatalogo_`, `obterCatalogo_`, `obterCatalogoDisciplinas`).
- `registrarSolicitacao` (antes `enviarExclusao`): período de novo; ciência `true`; nome, nº USP, ano (1950 até o ano atual), curso (só as três opções), conclusão; `validarDisciplinas_` (código obrigatório, nome do cadastro, código antigo trocado, turma obrigatória e livre até 20 caracteres, repetida recusada, mais de 6 recusado em vez de cortado); observações até 4.000; fórmula neutralizada; `tryLock` com mensagem; conferência de A1/B1; uma escrita `setValues` em A–P com carimbo Data e Pedido ID; recibo `noReply` fora da trava.
- `diagnosticarConfiguracao()`.

**`ExclusaoApp.html`**

- O texto do requerimento passou do servidor para a página (preenchido por `textContent`, sem HTML vindo da planilha); o texto é o da v1.0.
- Tema GRADIP com tokens, cabeçalho com **Aparência** e **Ajuda**, marcas do repositório (antes, logos de outro site).
- E-mail do login só leitura; disciplinas com código, nome e turma, como no Trancamento Parcial; aviso de disciplina já pendente; validação no campo com resumo e foco; erros do servidor no resumo.
- Pedidos anteriores no topo; tela de sucesso com as disciplinas e o aviso do recibo; "Fazer nova solicitação" abre o `/exec` (antes, limpava a tela).

**Central de Ajuda**: `ExclusaoAjuda.html` (conteúdo, ver [AJUDA.md](AJUDA.md)) + cópias de `shared/ajuda/`. Sem chamada ao servidor.

## Verificação local (16/10/2026)

```bash
node sistemas/exclusao-disciplinas/formulario/testes/testar_backend.js    # 33 ok
node sistemas/exclusao-disciplinas/formulario/testes/testar_navegador.js  # 187 ok (Chromium real)
```

- **Backend:** login com domínio exato; busca de aluno e cadastro automático não existem mais como funções públicas; período (1º e 2º semestre, antes/depois, Contínuo, linha ausente, sem retificação, datas como Data, planilha sem acesso, sem a propriedade); pré-preenchimento com ano; histórico agrupado pelo Pedido ID com disciplinas concluídas e códigos pendentes; catálogo; gravação de uma linha por disciplina em A–P numa escrita, mesmo carimbo e Pedido ID; Q–T e linhas existentes intocadas; código antigo, fora do cadastro e turma livre; validações; disciplina já pendente aceita; fórmula neutralizada; trava; aba de respostas errada bloqueia; planilha de alunos nunca escrita; recibo só ao login e `noReply`; logs sem dados pessoais; ausência de ID literal; diagnóstico.
- **Navegador:** texto do requerimento com as datas; pré-preenchimento; nome pelo código; código antigo; fora do cadastro; turma obrigatória; validação (6 itens, foco, resumo, repetida); remover renumera; ano só dígitos; contador; envio com o payload esperado (sem e-mail); tela de sucesso; limite de 6; histórico; aviso de disciplina já pendente e envio mesmo assim; cadastro fora do ar e com erro; erro do servidor; fora do período; sem login; erro de carga sem detalhe técnico; Central de Ajuda (busca sem acento, FAQ, ESC, gatilho contextual, todos os gatilhos com seção); sem erros de JavaScript.
- **Tema:** Sistema nos dois esquemas; Escuro manual persiste e ignora o sistema; Sistema acompanha mudança com a página aberta; marca por tema.
- **Contraste medido** (texto ≥ 4,5:1; bordas ≥ 3:1):

| Par | Claro | Escuro |
|---|---|---|
| texto do requerimento / cartão | 14,76 | 15,36 |
| texto secundário / cartão | 5,45 | 7,88 |
| link e títulos de seção | 6,92 | 7,64 |
| "Encontrada no cadastro" / linha | 4,79 | 8,89 |
| "não está no cadastro" / linha | 4,80 | 9,27 |
| aviso de disciplina já pendente / linha | 4,80 | 9,27 |
| campo de turma | 14,76 | 14,02 |
| mensagem de erro | 6,47 | 6,13 |
| botão Enviar | 7,97 | 5,10 |
| borda dos campos | 3,41 | 3,49 |
| borda das opções | 3,41 | 3,82 |

- **Larguras:** 360, 390, 480, 768 e 1280 px, nos dois temas: sem rolagem horizontal, cabeçalho e linhas de disciplina dentro da tela, alvos ≥ 44 px (inclusive código, nome, turma, Adicionar e Remover), Central de Ajuda sem rolagem horizontal.

**Limites:** o backend simulado não reproduz o Apps Script real. Falta conferir no `/exec`: os títulos reais de A–T (o diagnóstico mostra), o recibo chegando, as linhas novas aparecendo no Painel dos servidores e no gerenciador (que passam a receber o carimbo como Data, como as respostas antigas do Google Forms, e `CÓDIGO - Nome` na coluna J), e o PNG da marca USP.
