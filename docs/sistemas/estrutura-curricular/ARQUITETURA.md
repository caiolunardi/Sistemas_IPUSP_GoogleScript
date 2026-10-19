# Arquitetura — Estrutura Curricular

> Fonte atual 1.10.0 sobre baseline 1.9.3. Regras e algoritmos preservados; extensão visual documentada em [NAVEGACAO_E_VISUAL_1_10_0.md](NAVEGACAO_E_VISUAL_1_10_0.md). Registros de versões anteriores abaixo conservam seu alcance.

Referência técnica para manutenção. Para as regras de negócio, veja [REGRAS.md](REGRAS.md). Para o que a pessoa vê na tela, veja [AJUDA.md](AJUDA.md).

## 1. Componentes

```text
┌──────────────────────────── navegador (quem usa o painel) ────────────────────────────┐
│ Painel.html  ─ estrutura da página, inclui os demais arquivos                          │
│ PainelApp.html ─ lista, busca, filtros, ficha, currículos, importações (histórico)     │
│ PainelImportacao.html ─ janela de importação em 5 passos                               │
│ PainelPreparacao.html ─ ficha editável, cadastro, lista por unidade (1.3.0)            │
│ EstruturaAjuda* ─ (1.9.0) Central de Ajuda: conteúdo estático, estilos e comportamento │
│        └─ sem google.script.run, sem rede e sem armazenamento (§10.1)                  │
│ LeitorComum / LeitorCsv / LeitorPdf ─ arquivo do Júpiter → "pacote de importação"     │
│ LeitorPdfFontes ─ palavras do PDF: camada de texto (PDF.js) ou OCR (Tesseract.js)     │
│        └─ só ao escolher um PDF: cdn.jsdelivr.net (bibliotecas, SRI) e modelo de       │
│           português do Tesseract (jsDelivr ou GitHub, conferido por SHA-256)          │
└───────────────┬───────────────────────────────────────────────────────────────────────┘
                │ google.script.run: obterDadosPainel · prepararImportacao · confirmarImportacao
                │   · salvarDisciplina · excluirDisciplinas · adicionarAGrade · removerDaGrade · … (§3)
┌───────────────▼──────────── Apps Script (Web App, executa como quem implantou) ────────┐
│ Codigo.gs (doGet) · Acesso.gs (papéis) · Configuracao.gs (Propriedades + ID_INDEX)     │
│ Consulta.gs (dados do painel) · Importacao.gs (validação, plano, prévia, gravação)     │
│ Esquema.gs (abas/colunas) · Planilha.gs (leitura/escrita por título) · Utilidades.gs   │
│ Preparacao.gs (ajustes, exclusão, outros cursos, grade horária, nova grade — 1.3/1.4) │
│ EnvioGrade.gs (1.5.0: "Enviar Grade para Preenchimento" → planilha das secretarias)    │
│ AuditoriaGrade.gs (1.6.0: quem editou o quê → planilha de auditoria do semestre)       │
└───────────────┬───────────────────────────────────────────────────────────────────────┘
                │ Script Properties["ID_INDEX_SPREADSHEET_ID"]
                ▼
        planilha ID_INDEX ── linha "ESTRUTURA_CURRICULAR | spreadsheet | <ID>" ──► planilha ESTRUTURA_CURRICULAR
                         ├─ (1.5.0) GRADE_HORARIA_PREENCHIMENTO ──────────────► planilha das secretarias
                         ├─ (1.5.0) INDEX_GRADE_HORARIA_VERSOES_ANTERIORES ───► planilha-índice das cópias
                         └─ (1.5.0) BACKUP_GRADES_ANTERIORES ─────────────────► pasta do Drive das cópias (DriveApp)
```

Por que a leitura acontece no navegador:

- o Apps Script não tem OCR, e o PDF do Júpiter pode não ter texto;
- o arquivo não precisa ser enviado ao Drive nem a terceiros;
- a pessoa confere a leitura antes de o servidor receber qualquer dado.

O servidor não confia no navegador. Ele revalida o pacote inteiro (`validarPacote_`) e refaz todo o cálculo na gravação.

## 2. Arquivos

Todos ficam na **raiz** do projeto Apps Script. `include_()` usa o nome sem extensão.

| Arquivo | Camada | Responsabilidade |
|---|---|---|
| `Codigo.gs` | servidor | `doGet` (página), `include_`, `VERSAO_SISTEMA` |
| `Configuracao.gs` | servidor | `CONFIG`; leitura das Propriedades; resolução do ID pelo `ID_INDEX` (cache de 10 min); `diagnosticarConfiguracao()` |
| `Acesso.gs` | servidor | `obterUsuario_()` (papel admin/leitor), `exigirAdmin_()`; (1.7.0) `permissoesDeAcesso_()`/`lerPermissoes_()`: aba `ESTRUTURA_CURRICULAR` da planilha `PERMISSOES_DE_ACESSO` (C = e-mail, E = Perfil), cache de 60 s |
| `Esquema.gs` | servidor | nomes das abas, colunas (título, tipo, largura, nota), criação/reparo das abas, proteção "só aviso", aba Sobre, metadados |
| `Planilha.gs` | servidor | ler/escrever abas **pelo título** das colunas; preserva colunas extras; formata valores para célula |
| `Importacao.gs` | servidor | `prepararImportacao`, `confirmarImportacao`; validação do pacote; plano (estado final + mudanças + bloqueios); conferência das Informações Básicas; lista de revisão paginada (`obterPaginaRevisao`, cache); prévia; montagem das linhas e do histórico |
| `Gravacao.gs` | servidor | manifesto (versão ativa), diário, impressão digital das abas, preparação em cópias, ativação, arrumação passo a passo, conferência das abas pelo ID (`divergenciasDasAbas_`), recuperação, leitura consistente (`lerVersaoConsistente_`), `verificarImportacao` |
| `Consulta.gs` | servidor | `obterDadosPainel`: recuperação (admin), base inteira + últimas importações/alterações + situação da gravação, numa leitura consistente |
| `Preparacao.gs` | servidor | (1.3.0) `salvarDisciplina`, `excluirDisciplinas`, `adicionarAGrade`, `removerDaGrade`, `cadastrarNovaGrade` (1.4.0), `cadastrarDisciplinaOutros`, `previaDisciplinasUnidade`, `incluirDisciplinasUnidade`; `preparacaoParaCliente_` (o que o painel recebe); validação dos campos e da oferta; leitura do CSV da lista por unidade |
| `EnvioGrade.gs` | servidor | (1.5.0) `enviarGradeParaPreenchimento`, `diagnosticarEnvioGrade`; `linhasDaGrade_` (mesma seleção da prévia), `ofertaPrincipal_` (Psicólogo → Bacharelado → Licenciatura), `conferirPlanilhaDaGrade_`, `semestreDoNomeDaGrade_`, cópia de segurança e índice (§11); (1.6.0) `formulaDoFim_` (1.6.2: resultado em texto "HH:mm"); (1.6.2) `celulasDoFimComErro_`; (1.6.3) `separadorDaPlanilha_`, `gravarFormulasDoFim_` |
| `AuditoriaGrade.gs` | servidor | (1.6.0) auditoria da grade: índice das grades anteriores (`registrarBackupNoIndice_`, `auditoriaDoSemestre_`), planilha de auditoria por semestre, acionador `registrarEdicaoGrade`, `ativarAuditoriaGrade` / `desativarAuditoriaGrade` (editor) (§12) |
| `AuditoriaPainel.gs` | servidor | (1.7.0) `obterAuditoriaGrade` (só leitura): semestres com auditoria, edições (`edicoesDaAuditoria_`), situação das 6 abas (`andamentoDaGrade_`) |
| `Utilidades.gs` | servidor | respostas `{ok,…}`, erros amigáveis, texto seguro para célula, e-mails/listas, datas, departamento, hash |
| `Painel.html` | página | estrutura (cabeçalho GRADIP, abas, busca/filtros, tabela, janelas, carregando, aviso, versão) |
| `PainelEstilos.html` | página | CSS só com tokens GRADIP; responsivo (tabela vira cartões ≤ 768 px) |
| `PainelApp.html` | página | módulo `Painel`: dados, índices, filtros, lista, ficha, currículos, importações, janela modal acessível |
| `PainelPreparacao.html` | página | (1.3.0) módulo `Preparacao`: ficha editável (campos, "Onde aparece", Observações, Salvar/Excluir), cadastro de disciplina para outros cursos, janela da lista por unidade. (1.8.4) Operações da ficha ligadas à instância que as enviou (`ficha.instancia`), uma por vez (`operacaoPendente`), campos travados durante a gravação; ver REGRAS §8.1, item 8a |
| `PainelAuditoria.html` | página | (1.7.0) módulo `Auditoria`: seções Estrutura/Auditoria, (1.11.2) seções da auditoria uma por vez (barra `#abasAuditoria`, painéis `#audSecao-*`; no menu lateral, grupo `estruturaGrupoAuditoria`), cartões por aba, tabela da aba, quem editou, linha do tempo com filtros, histórico da disciplina |
| `PainelImportacao.html` | página | módulo `Importacao`: arquivo → leitura → conferência → prévia → gravação. Com CSV + PDF juntos (1.4.2, `lerArquivos`), o PDF é lido em segundo plano (`iniciarSegundo`, estado `segundo`) enquanto o CSV passa pelos passos; depois da gravação do CSV, `continuarComPdf` segue com o PDF (já lido → conferência; ainda lendo → tela de leitura com a mesma promessa e o mesmo sinal de cancelamento) |
| `LeitorComum.html` | página | formato do pacote (`versaoPacote = 1`) e utilidades comuns |
| `LeitorCsv.html` | página | `LeitorCsvJupiter.lerBytes(bytes, nome)` |
| `LeitorPdf.html` | página | `LeitorPdfJupiter.analisar(paginas, opcoes)` — reconstrói a estrutura a partir das palavras e confere os números |
| `LeitorPdfFontes.html` | página | `LeitorPdfFontes.ler(bytes, opcoes)` — palavras por página (texto ou OCR), com progresso e cancelamento |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | página | tema e marcas GRADIP — **cópias byte-idênticas** das do Painel de Solicitações v1.2 (ver §10) |
| `EstruturaAjuda.html` | página | (1.9.0) conteúdo da Central de Ajuda, estático: janela `#centralAjuda`, início com atalhos, índice, 26 seções (`ajuda-…`), unidades de busca, FAQ e estado "nenhum resultado" (contrato `data-gradip-help-*`) |
| `EstruturaAjudaEstilos.html` | página | (1.9.0) aparência da Central, do botão "Ajuda" do cabeçalho (`.ajudaCabecalho`) e dos gatilhos "?" (`.ajudaGatilho`), só com tokens GRADIP |
| `EstruturaAjudaUI.html` | página | (1.9.0) módulo `EstruturaAjuda` (`abrir(destino, gatilho)`, `fechar`, `aberta`, `limparBusca`): vistas, busca local, FAQ, delegação dos gatilhos; janela da pilha `Painel.Modal` (§10.1) |

## 3. Funções públicas (`google.script.run`)

No Apps Script, qualquer função cujo nome **não** termina em `_` pode ser chamada pelo navegador. Por isso todas as auxiliares terminam em `_`, e as seis públicas verificam o papel de quem chama antes de fazer qualquer coisa.

| Função | Quem pode | Entrada | Saída (`dados`) | Efeito |
|---|---|---|---|---|
| `obterDadosPainel()` | leitor, admin | — | `usuario`, `versaoSistema`, `planilhaPreparadaAgora`, `gravacao` (§7; leitor recebe só `planilhaDesatualizada` e `abasDivergentes`), `base` (currículos, disciplinas, vínculos, requisitos), `importacoes` (30 últimas), `alteracoes` (600 últimas) | Só lê (leitura consistente, §7). Se a planilha ainda não tem as abas, **admin** as cria; leitor recebe `BASE_NAO_PREPARADA`. **Admin**: se houver diário ou abas visíveis divergentes do manifesto, faz a recuperação (trava livre) antes de ler. O e-mail de quem importou só vai para admin. |
| `prepararImportacao(pacote)` | admin | pacote (§5) | prévia: `assinatura`, `operacao`, `impressao`, `podeGravar`, `bloqueios`, `avisos`, `curriculos`, `totais`, `mudancas`, `complementos`, `conferenciaPdf`, `infoConferencia`, `revisao` (`total`, `paginas`, `tamanhoPagina`, página 1 em `itens`, `resumo`, `impressao`), `recuperacao` | Não grava dados. Pode criar abas que faltem e, com a trava livre, recuperar uma gravação interrompida. Guarda a lista de revisão paginada no cache (§7.1). |
| `confirmarImportacao(pacote, assinatura, opcoes)` | admin | o mesmo pacote + assinatura da prévia + `{ operacao, revisaoPdf, previa }` | `id`, `operacao`, `concluida`, `pendencias`, `avisos`, `planilhaDesatualizada`, `abasDivergentes`, `dataHora`, `totais`, `complementos`, `resumo` (ou `jaGravada: true`) | Prepara, confere e ativa (§7), sob trava de 30 s. A mesma `operacao` nunca é gravada duas vezes. |
| `obterPaginaRevisao(operacao, pagina)` | admin (quem gerou a prévia) | identificador da prévia + nº da página | `pagina`, `paginas`, `itens` | Só lê o cache e registra a página como entregue (§7.1). `REVISAO_EXPIRADA` se a lista não existe mais ou é de outra pessoa. |
| `verificarImportacao(operacao)` | admin | identificador da prévia | `situacao`: `gravada` ou `nao_gravada` (+ `id`, `dataHora`, `limpezaPendente`) | Só lê o manifesto. Usada depois de `RESULTADO_INCERTO` ou falha de rede. |
| `salvarDisciplina({origem, chave, campos, oferta, observacoes, adicionarAGrade, ofertaPendentes, restaurarOferta})` | admin | `origem` = `estrutura` ou `outros`; `chave` = código no Júpiter (estrutura) ou identificador (outros); `campos` = valores do formulário; `oferta` = `[{curriculo, tipo, periodo}]` (só estrutura); `adicionarAGrade` = `true` (1.4.3, opcional); `ofertaPendentes` = `'descartar'` (1.8.9, opcional: descarta os vínculos de oferta a revisar); `restaurarOferta` = `true` (1.8.10, opcional: "Voltar aos dados do Júpiter"; `oferta` precisa ser a do Júpiter da base ativa) | `resultado` (1.8.5: `concluido`), `preparacao` (lida da planilha), `observacao` (lida); com `adicionarAGrade`, também `grade` = `{adicionada, jaEstava, excluida, semOferecimento}`. (1.8.5) Estrutura, recusas com `dados`: `NAO_SALVO` (nada gravado) e `SALVAMENTO_PENDENTE` (`dados.salvamento` = `{estado, id, chave, codigo, ajusteGravado, observacaoGravada, podeDescartar}` e `dados.preparacao` lida); (1.8.6) `SALVAMENTO_INCERTO` (`dados.resultado` = `incerto`, `dados.salvamento.estado` = `incerto`, com `id`, `chave`, `codigo` e `mensagem`). (1.8.6) `observacao` lida vem sempre que o pedido enviou `observacoes` | (1.8.5) Estrutura: salvamento retomável (registro `estruturaCurricular.salvamento` → escritas → conferência → remoção do registro; REGRAS §8.1, item 8b). Estrutura: grava em "Ajustes manuais" só o que difere do Júpiter (tudo igual = remove a linha) e a observação na coluna Observações da aba Disciplinas. Outros: regrava a linha. Código novo não pode repetir um código em uso (`CODIGO_REPETIDO`). (1.8.9) Oferta: igual à oferta **efetiva** e com vínculos associados ou a revisar → a lista guardada não muda; diferente com vínculos a revisar → só com `ofertaPendentes: 'descartar'`, senão `OFERTA_A_REVISAR` (nada gravado); REGRAS §8.1, item 8d. (1.8.10) Com `restaurarOferta: true`: oferta diferente da do Júpiter da base ativa → `DADOS_INVALIDOS` (nada gravado); vínculos a revisar sem `ofertaPendentes: 'descartar'` → `OFERTA_A_REVISAR`, mesmo com a parte efetiva igual ao Júpiter; senão o ajuste de oferta é removido dentro do mesmo salvamento retomável (sem escrita separada). Sem o campo (ou com outro valor), como na 1.8.9. Com `adicionarAGrade` (1.4.3; "Adicionar à Grade Horária" na ficha com alterações por salvar), marca também "Adicionada à grade horária" na mesma linha e na mesma escrita, com as regras de `adicionarAGrade` (semestre de oferecimento em vigor já com as alterações; excluída não entra): sem semestre, salva e não adiciona |
| `resolverSalvamentoPendente({acao, id})` | admin | `acao` = `concluir` ou `descartar` (só quando a base mudou; `id` do registro) | `resultado` (`nenhum`/`concluido`/`descartado`), `codigo`, `preparacao`, `observacao` | (1.8.5) conclui o salvamento de disciplina pendente; se não conseguir, `SALVAMENTO_PENDENTE`; (1.8.6) exceção depois de encerrar o registro: conferido → `concluido`; senão `SALVAMENTO_INCERTO` |
| (1.8.6) `recuperado` em respostas e recusas | — | — | `{id, chave, codigo, observacao: {chave, texto} \| null, preparacao?, leituraFalhou?}` | Vem em qualquer gravação da preparação (e na recusa de `confirmarImportacao`) que concluiu antes um salvamento pendente: o que ficou conferido dessa disciplina. `observacao` = null quando o salvamento não mudava a observação; `preparacao` só quando a resposta não a traz. O painel (`chamarServidor`) aplica antes dos dados da própria resposta. Erro não previsto depois da conclusão vira `INESPERADO` com `dados.recuperado` |
| `excluirDisciplinas(itens, excluir)` | admin | `[{origem, chave}]`, `true` exclui / `false` restaura | (1.8.7) `resultado` (`concluido`), `alteradas`, `preparacao` | marca/desmarca "Excluída"; excluir também tira a seleção para a grade; restaurar não devolve à grade. (1.8.7) Ação em lote retomável (ver abaixo) |
| `adicionarAGrade(itens)` | admin | `[{origem, chave}]` | `adicionadas`, `jaEstavam`, `ignoradas` (excluídas), `semOferecimento` (`[{origem, chave, codigo}]`), `preparacao` | (1.4.0) "Enviar para a Grade Horária" / "Adicionar à Grade Horária": marca "Adicionada à grade horária". Só entram as que têm **semestre de oferecimento** em vigor (estrutura: ajustado ou pelo período ideal; outros cursos: o informado); as demais voltam em `semOferecimento` e não são gravadas. Um item inexistente recusa o lote inteiro sem gravar. (1.8.7) `resultado` (`concluido`); ação em lote retomável |
| `removerDaGrade(itens)` | admin | `[{origem, chave}]` | (1.8.7) `resultado` (`concluido`), `removidas`, `preparacao` | (1.4.0) "Remover da grade" (Prévia e ficha na etapa 4): tira a marca; a disciplina continua na lista. (1.8.7) Ação em lote retomável |
| (1.8.7) ações em lote — recusas | — | — | `NAO_SALVO` (registro recusado: nada alterado; `dados.resultado` = `nao_concluido`, `dados.preparacao`); `LOTE_PENDENTE` / `LOTE_INCERTO` (`dados.resultado` = `pendente`/`incerto`, `dados.lote` = `{tipo: 'lote', estado, id, acao, nome, em, total, resumo, confirmados, grupos: [{origem, total, confirmados, faltam: [chaves]}], podeDescartar, mensagem}`; `confirmados`/`faltam` = `null` quando não foi possível conferir; `dados.preparacao` lida, ou `null` + `leituraFalhou`) | Registro do pedido validado nas Propriedades do script (cabeçalho `estruturaCurricular.lote` + partes de até 8.000 caracteres) → escritas (Ajustes manuais, depois outros cursos, só onde falta) → conferência item por item → remoção do cabeçalho. REGRAS §8.1, item 8c |
| `resolverLotePendente({acao, id})` | admin | `acao` = `concluir` ou `descartar` (só quando a base mudou; `id` do registro) | `resultado` (`nenhum`/`concluido`/`descartado`), `acao`, `nome`, `total`, `preparacao` | (1.8.7) conclui a ação em lote pendente; se não conseguir, `LOTE_PENDENTE`; exceção depois de encerrar o registro: conferido → `concluido`, senão `LOTE_INCERTO`. Descartar encerra a pendência SEM desfazer o já gravado |
| (1.8.9) `preparacao.ajustes[]` (em `obterDadosPainel` e em toda resposta com `preparacao`) | — | — | `{chave, excluida, naGrade, campos, oferta, ofertaEfetiva, ofertaPendencias, ofertaAssociada, alteradoEm, alteradoPor}` | `oferta` = a lista guardada, como antes (`null` = sem ajuste; `[]` = retirada intencional). Novos: `ofertaEfetiva` = `[{curriculo, tipo, periodo, origem?}]` só com currículos em uso (`origem` = currículo guardado quando o vínculo foi associado ao sucessor) ou `null` sem ajuste; `ofertaPendencias` = `[{curriculo, tipo, periodo, motivo}]` (vínculos a revisar); `ofertaAssociada` = quantos vínculos foram associados. Calculados a cada leitura por `ofertaEfetiva_`/`resolverOferta_` (Preparacao.gs) sobre a aba Currículos da base ativa; nada é gravado. O painel usa `ofertaEfetiva` (com resposta antiga, sem o campo, usa `oferta`) |
| (1.8.7) `recuperadoLote` em respostas e recusas | — | — | `{id, acao, nome, total, resumo, em, preparacao?, leituraFalhou?}` | Vem em qualquer gravação (e na recusa de `confirmarImportacao`) que concluiu antes uma ação em lote pendente. `resumo` = contagens do pedido antigo; as contagens da resposta são só do pedido atual. O painel aplica antes dos dados da resposta. `obterDadosPainel` traz também `lotePendente` (como `salvamentoPendente`) |
| `cadastrarNovaGrade(confirmacao)` | admin | a palavra `APAGAR` | `recomecada` | (1.4.0) **apaga a planilha inteira** (todas as abas, inclusive as ocultas, e os metadados do sistema) e a prepara como nova, sem cópia de segurança. Retomável: grava `estruturaCurricular.recomeco` antes e só o remove no fim; se falhar no meio, o próximo `obterDadosPainel` de um administrador termina o recomeço (leitores recebem `BASE_NAO_PREPARADA`; gravações da preparação também) |
| `cadastrarDisciplinaOutros({campos, observacoes})` | admin | código (obrigatório), nome (obrigatório), demais campos | `chave`, `preparacao` | acrescenta uma linha em "Disciplinas para outros cursos" (origem "Cadastro manual"); CH vazia = 15 × aula + 30 × trabalho |
| `previaDisciplinasUnidade(texto, arquivo)` | admin | texto do CSV "Lista de disciplinas por unidade" (decodificado no navegador) | `assinatura`, `total`, `novas` (códigos ainda não usados), `conhecidas`, `repetidas`, `invalidas` (até 50, `{linha, motivo}`; (1.8.3) `{linha, ate, motivo}` para um registro de várias linhas descartado), `totalInvalidas` (1.8.2) | Só lê. (1.8.2) Linha com crédito negativo/fracionário/não numérico, aspas malformadas ou colunas a mais vai para `invalidas`; (1.8.3) campo entre aspas com quebra de linha: o registro inteiro é descartado, ou tudo a partir dele quando as aspas não fecham ou o fim é ambíguo com o motivo (regras em REGRAS §8.3, item 2a); cabeçalho malformado → `PACOTE_INVALIDO` |
| `incluirDisciplinasUnidade(texto, arquivo, assinatura, codigos)` | admin | o mesmo texto + assinatura da prévia + códigos escolhidos | `incluidas`, `preparacao` | acrescenta as escolhidas (origem "Lista de disciplinas por unidade (Júpiter)"); `PREVIA_DESATUALIZADA` se a lista mudou desde a prévia |
| (1.8.12) `previaEnvioGrade({semestre, ano})` | admin | `semestre` = `'1'` ou `'2'`; `ano` | `semestre`, `ano`, `grade` ("2027/1"), `nomeNovo`, `grupos` (`{PSA: [{codigo, nome, tipo, semestreIdeal, creditosAula}], …}`, na ordem de gravação), `contagens`, `total`, `assinatura` (64 hex) | Só lê (sob a trava; conclui antes um salvamento ou lote pendente, com `recuperado`/`recuperadoLote`). As linhas e a `assinatura` saem dos MESMOS valores que o envio gravaria (`valoresDoEnvio_`, `conteudoCanonicoDoEnvio_`, `assinaturaDoEnvio_`; §11) |
| `enviarGradeParaPreenchimento({semestre, ano, assinatura, esperado})` | admin | `semestre` = `'1'` ou `'2'`; `ano`; (1.8.12) `assinatura` **obrigatória** = a de `previaEnvioGrade` que a pessoa conferiu; `esperado` (opcional desde a 1.8.12) = contagens por aba (`{PSA, PSC, PSE, PST, INTER, OUTRAS}`), conferidas além da assinatura | `grade` ("2027/1"), `nomeNovo`, `nomeAnterior`, `contagens`, `total`, `backup` (`nome`, `url`, `semestre`), `auditoria` (`nome`, `criada`, `registroAtivo` — (1.8.14) sem `url` nem ID: a auditoria é consultada pelo painel), `avisos` | (1.5.0) §11. Monta as linhas no servidor; (1.8.12) sem `assinatura` válida → `PREVIA_INVALIDA`; assinatura (ou contagens) diferente da do conteúdo atual → `PREVIA_DESATUALIZADA` — antes de qualquer efeito; confere a planilha das secretarias, o índice, a pasta e o semestre no nome atual **antes** de mudar algo; cópia do arquivo para a pasta + linha no índice; apaga o conteúdo de B4:S999 das 6 abas; grava C/D/E/I/J; renomeia. Sob a trava do sistema |
| `registrarEdicaoGrade(e)` | acionador | evento de edição da planilha das secretarias | — | (1.6.0) acionador instalável (não é chamado pela página; chamado com dados inventados não faz nada). Grava na auditoria do semestre do nome da planilha (§12) |
| `registrarAberturaGrade(e)` | acionador | evento de abertura da planilha das secretarias | — | (1.8.0) acionador instalável de abertura: anota data e hora, semestre e e-mail na aba "Aberturas" da auditoria do semestre; chamado com dados inventados não faz nada |
| `ativarAuditoriaGrade()` / `desativarAuditoriaGrade()` | admin | — | resumo sem IDs | (1.6.0) editor: cria/reaproveita a auditoria do semestre atual e instala (ou remove) o acionador de edição |
| `obterAuditoriaGrade({semestre})` | leitor, admin | `semestre` = `AAAA/S` (opcional) | `semestres`, `semestre`, `atual`, `nomeGrade`, `edicoes` (mais recentes primeiro; no máximo 5.000), `totalEdicoes`, `limitadas`, `andamento` (6 abas; `null` em grade encerrada), (1.8.0) `pessoas` (edições por e-mail), `aberturas` (por e-mail; `null` sem a aba) e `totalAberturas`, (1.11.0) `identificacao` (`pessoas`: e-mail minúsculo → `{nome, vinculo, setor}`, `vinculo` = `servidor`/`docente`/`aluno`/`nao_cadastrado`; `indisponiveis`: cadastros que não abriram), `geradoEm` | (1.7.0) só lê o índice, a auditoria do semestre e a planilha das secretarias; sem IDs nem links (1.8.0) |
| `diagnosticarEnvioGrade()` | admin | — | nome da planilha, semestre no nome, abas conferidas, índice (nº de cópias), nome da pasta | (1.5.0) Só lê; para rodar no editor (pede a autorização do Drive). Não mostra IDs |
| `diagnosticarConfiguracao()` | admin | — | configuração presente?, (1.7.0) nº de pessoas por perfil na aba de permissões (sem e-mails) e aviso das propriedades antigas, nomes das abas, versão do esquema | Só lê. Feita para rodar no editor (menu Executar); **não mostra IDs**. |

`doGet(e)` devolve a página vazia. Os dados vêm depois, por `obterDadosPainel()`, que é onde o acesso é verificado.

### Resposta padrão e códigos de erro

Toda função pública devolve `{ ok: true, dados }` ou `{ ok: false, erro, codigo }` (`executarComSeguranca_`). Erros inesperados são registrados só com o nome da função e a pilha, sem dados e sem IDs, e voltam com mensagem genérica.

| `codigo` | Quando | Mensagem (resumo) |
|---|---|---|
| `SEM_CONTA` | `Session.getActiveUser()` sem e-mail (conta fora do domínio ou não conectada) | entrar com a conta USP e abrir de novo |
| `SEM_ACESSO` | conta identificada, mas fora da aba de permissões (1.7.0) | pedir acesso ao Serviço de Graduação |
| `SEMESTRE_INVALIDO` | (1.7.0) auditoria pedida para um semestre sem auditoria no índice | escolher na lista |
| `SEM_AUDITORIA` | (1.7.0) nenhuma grade enviada ainda | enviar a grade |
| `AUDITORIA_INACESSIVEL` | (1.7.0) a planilha de auditoria do índice não abre | conferir o índice e o acesso da conta que implanta |
| `SO_ADMIN` | leitor tentou importar ou alterar a estrutura | só a equipe responsável importa e altera |
| `DADOS_INVALIDOS` | (1.3.0) campo da ficha inválido (código fora do padrão, número negativo ou acima de 9999, nome vazio, oferta com habilitação desconhecida, período fora de 1–20), lote vazio ou grande demais | a mensagem diz qual campo |
| `DISCIPLINA_NAO_ENCONTRADA` | (1.3.0) a disciplina não está mais na base (outra pessoa excluiu ou a base foi reimportada) | recarregar o painel |
| `DISCIPLINA_EXISTENTE` | (1.3.0) cadastro com identificador já usado em "Disciplinas para outros cursos" | abrir a existente |
| `CODIGO_REPETIDO` | (1.3.0) código novo/ajustado já é usado por outra disciplina (estrutura ou outros cursos, inclusive excluídas) | escolher outro código |
| `CONFIGURACAO` | (1.5.0: também as 3 chaves do envio da grade) falta `ID_INDEX_SPREADSHEET_ID`; `ID_INDEX` ilegível, vazio, com cabeçalho diferente; chave ausente, repetida, de outro tipo ou sem ID; planilha inacessível | orientação para quem mantém o sistema (sem IDs) |
| `BASE_NAO_PREPARADA` | leitor abriu antes de um admin preparar a planilha | pedir para um admin abrir o painel uma vez |
| `PACOTE_INVALIDO` | pacote ausente, formato desconhecido ou com erros de validação (até 5 exemplos) | tentar de novo / conferir o arquivo |
| `PACOTE_VERSAO` | `versaoPacote` ≠ 1 (página antiga aberta) | recarregar a página |
| `BLOQUEADA` | a prévia tinha bloqueios (§ regras) | motivo do primeiro bloqueio |
| `PREVIA_INVALIDA` | (1.8.12) envio da grade sem a identificação da prévia conferida, ou com formato inválido (inclusive a chamada antiga, só com contagens); a grade não foi enviada | abrir "Enviar Grade para Preenchimento" de novo e conferir |
| `PREVIA_DESATUALIZADA` | (1.8.12: no envio da grade, o conteúdo — linhas, nomes com observações, tipos, semestres ideais, créditos, grupos, ano/semestre — mudou depois da prévia conferida; a grade não foi enviada) (também na lista por unidade: a lista mudou entre a prévia e a inclusão) assinatura diferente: outra importação concluída, edição manual em célula mantida pelo sistema, ou pacote diferente (a mensagem diz qual e em que aba, quando possível) | gerar a prévia de novo |
| `REVISAO_PENDENTE` | PDF por OCR com valores só do PDF a gravar, sem `revisaoPdf: true` | marcar a revisão na prévia |
| `REVISAO_INCOMPLETA` | caixa marcada, mas alguma página da lista não foi entregue a quem confirma, a lista é de outra pessoa/expirou, ou não é a lista que seria gravada (§7.1) | abrir as páginas que faltam (a mensagem diz quais) ou gerar a prévia de novo |
| `REVISAO_EXPIRADA` | `obterPaginaRevisao` sem a lista no cache (expirou, ~6 h, ou foi descartada) ou de outra pessoa | gerar a prévia de novo |
| `EDICAO_DURANTE_GRAVACAO` | a planilha (sistema, Observações ou extras) mudou entre o início da confirmação e a ativação; nada foi ativado | gerar a prévia de novo |
| `NAO_GRAVADA` | falha antes da ativação (preparação, histórico, flush, escrita do manifesto comprovadamente não feita); a base continua como estava | tentar de novo |
| `RESULTADO_INCERTO` | falha na ativação sem conseguir reler o manifesto | "Verificar" (`verificarImportacao`) antes de repetir |
| `BASE_INCONSISTENTE` | manifesto ilegível ou aba em uso apagada à mão **sem mudança do manifesto durante a leitura**; nada é alterado | restaurar pelo histórico de versões / avisar quem mantém |
| `BASE_EM_ATUALIZACAO` | o manifesto mudou em 3 leituras seguidas (importações concluídas sem parar durante a leitura) | tentar de novo em instantes |
| `OCUPADO` | trava ocupada por outra gravação por mais de 30 s (preparação/envio: 10 s; 1.8.11: também `ativarAuditoriaGrade`, 10 s) | aguardar e tentar de novo |
| `NAO_SALVO` | (1.8.5) salvar disciplina da estrutura: a planilha recusou o registro do pedido; nada foi gravado | tentar de novo |
| `SALVAMENTO_PENDENTE` | (1.8.5) salvamento de disciplina da estrutura não terminou (parte pode estar gravada); também recusa outras gravações, importação e recomeço até ser concluído | "Concluir salvamento pendente" ou repetir a ação depois; se a base mudou, "Descartar" |
| `LOTE_PENDENTE` | (1.8.7) ação em lote (excluir, restaurar, adicionar/remover da grade) não terminou; o pedido continua registrado; também recusa outras gravações, importação, recomeço e envio da grade até ser concluída | "Concluir ação pendente" ou repetir mais tarde; se a base mudou, "Descartar ação pendente" (não desfaz o já gravado) |
| `OFERTA_A_REVISAR` | (1.8.9) `salvarDisciplina` com uma oferta diferente da efetiva numa disciplina cuja oferta ajustada tem vínculos a revisar (currículo substituído sem correspondência segura), sem `ofertaPendentes: 'descartar'`; nada foi gravado | marcar "Descartar os vínculos a revisar" na ficha (com confirmação) ou salvar sem mudar a oferta |
| `LOTE_INCERTO` | (1.8.7) o registro da ação em lote já foi encerrado, mas a conferência não confirmou todos os itens (ou não conseguiu ler a planilha) | recarregar o painel, conferir e repetir a ação se faltar algo |
| `SALVAMENTO_INCERTO` | (1.8.6) o registro do salvamento já foi encerrado, mas a conferência não confirmou o pedido (ou não conseguiu ler a planilha) | recarregar o painel, conferir a disciplina e salvar de novo se faltar algo |
| `NOME_SEM_SEMESTRE` | (1.5.0) o nome atual da planilha das secretarias não diz o semestre (a cópia de segurança precisa dele) | renomear para "Grade Horária - 1º semestre de AAAA"; nada foi alterado |
| `PLANILHA_GRADE_FORA_DO_PADRAO` | (1.5.0) falta uma das 6 abas ou o cabeçalho da linha 3 (C, D, E, I, J) é outro | a mensagem diz o que falta; nada foi alterado |
| `GRADE_VAZIA` / `GRADE_GRANDE_DEMAIS` | (1.5.0) nenhuma disciplina no semestre / mais de 996 numa aba | nada foi alterado |
| `AUTORIZACAO_DRIVE` | (1.5.1) o projeto ainda não tem a autorização do Google Drive (atualizado sem executar uma função no editor) | executar `diagnosticarEnvioGrade` no editor e aceitar; nada foi alterado |
| `BACKUP_FALHOU` | (1.5.0) a cópia não pôde ser feita, ou foi feita mas não registrada no índice | nada foi apagado nem gravado; tentar de novo |
| `AUDITORIA_FALHOU` | (1.6.0) a cópia foi feita e registrada, mas a planilha de auditoria do semestre novo não pôde ser criada | nada apagado na grade; tentar de novo |
| `ENVIO_INCOMPLETO` | (1.5.0) falha depois da cópia, ao apagar/gravar/renomear | a mensagem cita a cópia de antes do envio; enviar de novo |
| `INESPERADO` | qualquer outra exceção | mensagem genérica |
| `FALHA_REDE` | (só no navegador) a chamada não chegou ao servidor | verificar a conexão |

## 4. Configuração e localização da planilha

- **Propriedades do script**:
  - `ID_INDEX_SPREADSHEET_ID` (obrigatória);
  - (1.8.7) `estruturaCurricular.lote` e `estruturaCurricular.lote.<id>.<n>`: só enquanto uma ação em lote não termina (criadas e apagadas pelo sistema; não editar). Ficam aqui, e não nos metadados da planilha, porque estes têm 30.000 caracteres no total e o lote pode ter 6.000 itens; as Propriedades aceitam 9 KB por valor e 500 KB no total;
  - (até a 1.6.x `ESTRUTURA_ADMINS` e `ESTRUTURA_LEITORES`; desde a 1.7.0 não são lidas.)
- **(1.7.0) Permissões:** chave `PERMISSOES_DE_ACESSO` (tipo `spreadsheet`) no `ID_INDEX`; aba `ESTRUTURA_CURRICULAR`; linha 1 = títulos (C deve conter "mail", E deve conter "Perfil"); linhas 2+ = pessoas. Mapa e-mail → perfil em cache (`permissoesEstrutura`, 60 s).
- **`ID_INDEX`**, primeira aba: A = `Chave`, B = `Tipo`, C = `ID de Produção`. Exatamente uma linha com A = `ESTRUTURA_CURRICULAR` e B = `spreadsheet`; C = ID. A coluna D (`Homologação`) nunca é lida. É o mesmo padrão do Painel de Solicitações (`PERIODOS`). Busca genérica: `idDoIndex_(chave, tipo)`.
- **(1.6.0)** `AUDITORIA_GRADES_ANTERIORES` (pasta das planilhas de auditoria); o índice ganha a coluna C `Auditoria_ID`.
- **(1.5.0) Envio da grade**, mesma aba, uma linha para cada chave (o tipo da coluna B não é conferido): `GRADE_HORARIA_PREENCHIMENTO` (planilha das secretarias), `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` (planilha-índice: 1ª aba, A = semestre, B = ID da cópia) e `BACKUP_GRADES_ANTERIORES` (pasta). Não ficam em cache: são lidas a cada envio.
- **Cache** (`CacheService`, 600 s): o ID resolvido (`idEstrutura`). Se a planilha não abrir, o cache do ID é descartado. (Até a 1.6.x também o dono da planilha, que era administrador automático.)
- **Cache da revisão** (`CacheService`, 6 h): páginas da lista de valores só do PDF de cada prévia (códigos, nomes de disciplina, valores, páginas), o registro das páginas entregues e o hash do e-mail de quem gerou a prévia (§7.1).

## 5. Pacote de importação

O formato completo está comentado no topo de `LeitorComum.html`. Em resumo:

```text
{ versaoPacote: 1,
  origem:      { formato: csv|pdf, leitura: csv|texto|ocr, arquivo, tamanhoBytes, geradoEm },
  curso:       { codigo: "47012", nome },
  curriculos:  [{ codigo (12 dígitos, texto), habilitacao, habilitacaoNome, ano, semestre,
                  situacao, aacHoras, aacPercentual, info (só PDF) }],
  disciplinas: [{ codigo, nome, nomePodeEstarCortado, versao, versaoOrigem, creditosAula,
                  creditosTrabalho, ch, ce, cp, ext, atpa, naoConfirmados[] }],
  vinculos:    [{ curriculo, disciplina, tipo, periodoIdeal, periodoConfirmado }],
  requisitos:  [{ curriculo, disciplina, requisito, versaoRequisito, nomeRequisito,
                  tipoRequisito, grupo }],
  avisos:      [{ nivel: erro|aviso|info, codigo, mensagem, detalhe }],
  resumoLeitura, conferencia }
```

- `grupo`: requisitos com o mesmo número são **alternativos** ("ou"); grupos diferentes valem **juntos** ("e"). `null` = o arquivo não informa (CSV).
- `naoConfirmados`: campos sem coerência verificada pelas contas do relatório. No servidor, esses campos nunca sobrescrevem a base.
- `paginas` (disciplinas) e `info.pagina` (currículos): páginas do PDF, mostradas na revisão humana.
- `info.conferido` vindo do navegador é descartado: o servidor refaz as contas das Informações Básicas (REGRAS.md §5.6).
- Antes do envio, o navegador remove as listas de conferência (`conferencia.itens`, `linhasNaoReconhecidas`), que só servem para a tela.
- Um aviso de nível `erro` impede a gravação; no servidor ele vira bloqueio.

## 6. Planilha ESTRUTURA_CURRICULAR

A planilha começa vazia (uma aba "Página1"). Na primeira abertura por um administrador, `garantirEstrutura_()`:

- renomeia a aba vazia para **Sobre**;
- cria as demais abas;
- escreve os cabeçalhos em azul GRADIP (`#00509D`), com uma **nota explicativa** em cada coluna;
- aplica formatos, larguras e congelamento (linha 1; na aba Disciplinas, também as colunas A–B);
- aplica proteção "**só aviso**".

Nas aberturas seguintes, só acrescenta colunas que faltem; **nunca apaga dados**.

Regras de convivência com quem mexe na planilha à mão:

- as colunas são lidas e escritas **pelo título** (sem acento e sem diferença de maiúsculas), não pela posição. Dá para reordenar colunas;
- se um título do esquema for apagado ou renomeado, a coluna é recriada no fim, na próxima abertura por um admin;
- colunas **extras** criadas por alguém são preservadas. Na aba Disciplinas, elas são preservadas **por código**: acompanham a disciplina na regravação;
- a coluna **Observações** (aba Disciplinas) fica fora da proteção e nunca é apagada pelo sistema;
- textos que a planilha poderia reinterpretar (códigos com zero à esquerda, currículo de 12 dígitos, `2026/2`, textos iniciados por `=`, `+`, `-`, `@`) são gravados com apóstrofo inicial, que não aparece na célula.

**Metadados** (Developer Metadata, invisíveis): `estruturaCurricular.salvamento` (1.8.5; só enquanto um salvamento de disciplina da estrutura não termina: chave, ajuste e observação pretendidos, aba Disciplinas em uso, importação ativa, data e e-mail; 1.8.6: sem as colunas extras da linha de ajuste), `estruturaCurricular.recomeco` (1.4.0; só durante "Cadastrar nova grade"), `estruturaCurricular.esquema` (versão do esquema; hoje 3 — a 1.3.0 acrescentou as abas "Ajustes manuais" e "Disciplinas para outros cursos"; ao abrir uma planilha do esquema 2, um administrador as cria no fim, sem tocar nas demais, e regrava a aba Sobre), `estruturaCurricular.ativa` (manifesto, §7) e `estruturaCurricular.gravacao` (diário, só durante uma gravação). `estruturaCurricular.versaoBase` (esquema 1) só é lido na migração.

**Abas ocultas**: `_anterior_<aba>` (cópia da versão anterior de cada aba de dados, substituída a cada importação) e, só durante uma gravação ou depois de uma falha, `_nova_<aba>_<op>`. Colunas extras em qualquer das 4 abas de dados acompanham a linha pela chave (código; currículo|código; currículo|código|requisito; currículo).

### Abas e colunas

As tabelas abaixo foram geradas a partir de `COLUNAS` em `Esquema.gs`. A coluna "O que é" é a nota que aparece no cabeçalho da planilha.

**Sobre**: texto fixo que explica cada aba, a última importação e a versão do esquema. É regravada a cada importação.

#### Disciplinas (22 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Código | texto | Código da disciplina no Júpiter. Identifica a linha: não altere. |
| 2 | Nome | texto | Nome completo, como no CSV do Júpiter. O PDF corta nomes longos; por isso o nome do CSV tem preferência. |
| 3 | Departamento | texto | PSA, PSC, PSE ou PST pelo prefixo do código; "Interdepartamental" para códigos que começam com 470; "Outra unidade" para as demais. |
| 4 | Prefixo | texto | Três primeiros caracteres do código (ex.: PSA, EDF, 470). Ajuda a identificar a unidade de origem. |
| 5 | Créditos-aula | inteiro | Cada crédito-aula é 1 hora de aula por semana (15 horas no semestre). |
| 6 | Créditos-trabalho | inteiro | Cada crédito-trabalho equivale a 30 horas de atividades no semestre. |
| 7 | Créditos (total) | inteiro | Créditos-aula + créditos-trabalho. |
| 8 | CH total (h) | inteiro | Carga horária total no semestre: 15 h por crédito-aula + 30 h por crédito-trabalho. |
| 9 | Estágio – CE (h) | inteiro | Carga horária de Estágio (legenda do relatório do Júpiter). |
| 10 | Práticas – CP (h) | inteiro | Carga horária de Práticas como Componentes Curriculares (legenda do relatório do Júpiter). |
| 11 | Extensão – EXT (h) | inteiro | Carga horária de atividade extensionista. Só o PDF traz esta informação; vazio = ainda não informado. |
| 12 | ATPA (h) | inteiro | Atividades Teórico-Práticas de Aprofundamento (legenda do PDF do Júpiter). O CSV traz a coluna na mesma posição com o nome AACC; a equivalência ainda precisa ser confirmada. |
| 13 | Versão | inteiro | Versão da disciplina no Júpiter (número entre parênteses no PDF). |
| 14 | Origem da versão | texto | "PDF": lida na linha da própria disciplina. "CSV (requisito)": tirada de outra disciplina que a tem como requisito. |
| 15 | Habilitações | texto | Habilitações em que a disciplina aparece na estrutura atual. |
| 16 | Tipo e período por habilitação | texto | Resumo da aba "Disciplinas por habilitação". |
| 17 | Semestre de oferecimento | texto | Semestre do ANO em que a disciplina é oferecida, calculado pelo período ideal do Júpiter: período ímpar (1º, 3º… 9º) = 1º semestre; par (2º… 10º) = 2º semestre; "1º e 2º semestres" quando varia entre habilitações. Uma correção feita no painel fica na aba "Ajustes manuais" (não aqui). Até a 1.3.1 esta coluna se chamava "Semestre ideal". |
| 18 | Situação | texto | "Na estrutura atual" ou "Fora da estrutura atual" (estava em importação anterior e não veio na última). |
| 19 | Incluída em | data e hora | Primeira importação em que a disciplina apareceu. |
| 20 | Última alteração | data e hora | Última importação que mudou algum dado da disciplina. |
| 21 | Dados do PDF em | data e hora | Quando a extensão (EXT) e a versão foram lidas do PDF. |
| 22 | Observações | texto | Coluna livre do Serviço de Graduação. O sistema nunca apaga o que for escrito aqui. |

#### Disciplinas por habilitação (10 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Currículo | texto | Número do currículo no Júpiter (curso + habilitação + ano/semestre de cadastro). |
| 2 | Habilitação | texto | — |
| 3 | Código | texto | — |
| 4 | Nome | texto | — |
| 5 | Departamento | texto | — |
| 6 | Tipo | texto | Obrigatória, Optativa eletiva ou Optativa livre — nesta habilitação. |
| 7 | Período ideal | inteiro | Semestre do curso em que a disciplina deve ser cursada nesta habilitação. |
| 8 | Semestre de oferecimento | texto | Semestre do ANO em que é oferecida nesta habilitação, pelo período ideal: ímpar = 1º semestre; par = 2º semestre. Até a 1.3.1 esta coluna se chamava "Semestre ideal". |
| 9 | Créditos-aula | inteiro | — |
| 10 | Requisitos | texto | Resumo dos requisitos nesta habilitação ("ou" = alternativas; "e" = todos). |

#### Requisitos (11 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Currículo | texto | — |
| 2 | Habilitação | texto | — |
| 3 | Disciplina | texto | — |
| 4 | Nome da disciplina | texto | — |
| 5 | Tipo de requisito | texto | Como o Júpiter chama o vínculo (ex.: Requisito, Requisito fraco). |
| 6 | Requisito (código) | texto | — |
| 7 | Versão do requisito | inteiro | — |
| 8 | Nome do requisito | texto | — |
| 9 | Grupo | inteiro | Requisitos com o mesmo número de grupo são alternativos ("ou"). Vem do PDF; vazio = o arquivo não informou. |
| 10 | Relação | texto | Único; "ou" (basta um do grupo); "e" (todos os grupos); ou "não informado" quando só o CSV foi importado. |
| 11 | Requisito na estrutura? | texto | Não = a disciplina requisito não faz parte da estrutura curricular importada. |

#### Currículos (39 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Currículo | texto | 12 dígitos: curso (5) + habilitação (4) + ano e semestre de cadastro (3). Ex.: 47012 0100 262. |
| 2 | Curso | texto | — |
| 3 | Cód. habilitação | texto | — |
| 4 | Habilitação | texto | — |
| 5 | Cadastrado em | texto | Ano/semestre em que esta estrutura foi cadastrada (últimos 3 dígitos do currículo). |
| 6 | Situação no Júpiter | texto | — |
| 7 | Na base atual | texto | "Sim" para o currículo em uso; "Não" quando foi substituído por uma estrutura mais nova da mesma habilitação. |
| 8 | Disciplinas | inteiro | — |
| 9 | Obrigatórias | inteiro | — |
| 10 | Optativas eletivas | inteiro | — |
| 11 | Optativas livres | inteiro | — |
| 12 | Requisitos | inteiro | — |
| 13 | AAC exigida (h) | inteiro | Atividades Acadêmicas Complementares exigidas pelo currículo (coluna AAC do CSV; também no PDF). |
| 14 | AAC (%) | decimal | Percentual informado no CSV ao lado da AAC. |
| 15 | Ativação | texto | — |
| 16 | Desativação | texto | — |
| 17 | Duração ideal (sem.) | inteiro | — |
| 18 | Duração mínima (sem.) | inteiro | — |
| 19 | Duração máxima (sem.) | inteiro | — |
| 20 | Obrigatórias – aula (h) | inteiro | — |
| 21 | Obrigatórias – trabalho (h) | inteiro | — |
| 22 | Obrigatórias – total (h) | inteiro | — |
| 23 | Eletivas – aula (h) | inteiro | — |
| 24 | Eletivas – trabalho (h) | inteiro | — |
| 25 | Eletivas – total (h) | inteiro | — |
| 26 | Livres – aula (h) | inteiro | — |
| 27 | Livres – trabalho (h) | inteiro | — |
| 28 | Livres – total (h) | inteiro | — |
| 29 | CH em disciplinas (h) | inteiro | — |
| 30 | Estágio (h) | inteiro | — |
| 31 | AEX Apolo (h) | inteiro | Atividades extensionistas registradas no sistema Apolo, exigidas pelo currículo. |
| 32 | Extensão em optativas (h) | inteiro | — |
| 33 | CH disciplinas + AAC (h) | inteiro | — |
| 34 | Extensão exigida (h) | inteiro | — |
| 35 | Extensão exigida (%) | decimal | — |
| 36 | Total geral (h) | inteiro | — |
| 37 | Informações específicas | texto | Texto descritivo da habilitação, do relatório em PDF. |
| 38 | Atualizado em | data e hora | — |
| 39 | Informações do PDF em | data e hora | — |

#### Importações (17 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Importação | texto | — |
| 2 | Data e hora | data e hora | — |
| 3 | Quem importou | texto | — |
| 4 | Arquivo | texto | — |
| 5 | Formato | texto | — |
| 6 | Leitura | texto | — |
| 7 | Gravação | texto | "Completa": o arquivo definiu a estrutura das habilitações. "Complemento": o PDF só acrescentou o que o CSV não tem. |
| 8 | Currículos | texto | — |
| 9 | Disciplinas | inteiro | — |
| 10 | Novas | inteiro | — |
| 11 | Alteradas | inteiro | — |
| 12 | Saíram | inteiro | — |
| 13 | Voltaram | inteiro | — |
| 14 | Ofertas alteradas | inteiro | — |
| 15 | Requisitos | inteiro | — |
| 16 | Avisos | inteiro | — |
| 17 | Resumo | texto | — |

#### Alterações (9 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Importação | texto | — |
| 2 | Data e hora | data e hora | — |
| 3 | Código | texto | — |
| 4 | Nome | texto | — |
| 5 | O que mudou | texto | — |
| 6 | Habilitação | texto | — |
| 7 | Campo | texto | — |
| 8 | Antes | texto | — |
| 9 | Depois | texto | — |

#### Abas da preparação da grade (1.3.0)

Não fazem parte do manifesto nem das importações: a importação não as lê nem as regrava. Cada alteração feita no painel roda sob a mesma trava das importações e regrava a aba afetada **numa única escrita** (`setValues` do bloco inteiro), então vale inteira ou não vale. "Alterado por" guarda o e-mail de quem alterou (só administradores o recebem no painel).

**Semestre de oferecimento (1.3.1; nome e ajuste na estrutura em 1.3.2).** Semestre do **ano** em que a disciplina é oferecida — 1º, 2º ou os dois ("disciplina de semestre" na ficha). Não confundir com o **período ideal** (o semestre ideal do curso, 1º a 10º). Na estrutura, o valor automático vem do período ideal (ímpar = 1º, par = 2º, os dois quando varia entre habilitações) e pode ser ajustado no painel (coluna "Semestre de oferecimento ajustado" de "Ajustes manuais"; vazio = automático) — ex.: disciplina prática oferecida nos dois semestres. Nas disciplinas para outros cursos, que não têm período, é informado na ficha (coluna "Semestre de oferecimento"). O painel recebe o código (`'1'`, `'2'`, `'ambos'`, `''`); texto digitado à mão na planilha é interpretado (`semestreDoTexto_`). **Renomeação na 1.3.2:** a coluna que até a 1.3.1 se chamava "Semestre ideal" (abas Disciplinas, Disciplinas por habilitação e Disciplinas para outros cursos) passa a "Semestre de oferecimento". O esquema guarda o nome antigo (`antigos`): as leituras e escritas reconhecem os dois nomes (`mapaDeTitulos_`), e na primeira abertura por um administrador `renomearTitulosAntigos_` troca só o texto do cabeçalho (os dados ficam na mesma coluna, sem coluna a mais); até lá, leitores recebem `BASE_NAO_PREPARADA`.

**Grade horária (1.4.0).** A marca "Adicionada à grade horária" (coluna das abas "Ajustes manuais" e "Disciplinas para outros cursos"; até a 1.3.2 "Selecionada para a grade", renomeada só no cabeçalho pelo mesmo mecanismo `antigos`) diz o que vai para a grade. Na etapa 3, as caixas só escolhem (estado da página, `LISTAS.grade.marcados`); as já adicionadas ficam marcadas e travadas; "Enviar para a Grade Horária" chama `adicionarAGrade` uma vez. As que não têm semestre de oferecimento ficam escolhidas e listadas na barra. Na ficha, "Adicionar à Grade Horária" fica ativo com o semestre de oferecimento definido (o gravado ou o escolhido no formulário); com alterações por salvar, uma só chamada: `salvarDisciplina` com `adicionarAGrade: true` (1.4.3; na 1.4.1–1.4.2 eram duas: `salvarDisciplina` e depois `adicionarAGrade`); o andamento aparece no próprio botão ("Salvando e adicionando…"), sem a camada "carregando" do painel; numa disciplina já adicionada o botão só informa (etapas 1–3) ou vira "Remover da grade" (etapa 4). A **Prévia** (etapa 4) é montada no navegador a partir dos mesmos dados, filtrada pelo **semestre da grade** escolhido no topo (1.4.1: semestre de oferecimento igual ao escolhido ou "os dois"; o ano só aparece no resumo "Grade horária 2027/1" e ainda não é gravado): grupo pelo prefixo do código em uso (PSA, PSC, PSE, PST; `470` = Interdepartamentais; o resto = Outras Unidades), colunas Código, Nome, Semestre ideal (período ideal por habilitação, "Psicólogo 7º · Bacharelado 8º"; "—" nas disciplinas para outros cursos) e Observações. **Semestre de oferecimento na ficha da estrutura (1.4.0):** vem pré-preenchido com o valor em vigor; o servidor grava ajuste só quando difere do calculado pelo período (`oferecimentoCalculado_`).

**Oferta efetiva (1.8.9).** A oferta ajustada guardada em "Ajustes manuais" pode citar um currículo que uma importação depois substituiu. `contextoPreparacao_` passa a guardar em `ctx.curriculos` a aba Currículos inteira da base ativa (`tabelaCurriculos_`: vigente, sucessor lido de "Não — substituído por <12 dígitos>", curso e habilitação), e `ofertaEfetiva_(ctx, chave, aj)` devolve `{ajustada, vinculos, pendentes, associados}`: sem ajuste, a oferta do Júpiter nos currículos em uso; com ajuste, `resolverOferta_` segue a cadeia de sucessão de cada vínculo só dentro do mesmo curso e da mesma habilitação (`mesmaHabilitacao_`, `destinoDoCurriculo_`) e separa o que fica a revisar (com motivo). É uma **projeção de leitura** — a lista guardada nunca é reescrita por ela, e a importação não ganhou escritas. Usam a mesma função: `oferecimentoCalculado_` (semestre pelo período, e daí `oferecimentoEfetivo_`, `adicionarAGrade`, `salvarDisciplina` com `adicionarAGrade`, `linhasDaGrade_`), `ofertaPrincipal_` (tipo e semestre ideal da linha da grade), `preparacaoParaCliente_` (`ofertaEfetiva`, `ofertaPendencias`, `ofertaAssociada`) e a proteção de `salvarDisciplina`. O painel (`indexar`) usa `ofertaEfetiva` em vez de recalcular; filtros, ficha, Prévia e semestre do painel vêm daí. Em `obterDadosPainel`, a tabela de currículos é a da mesma leitura consistente da base (`base.curriculos`). (1.8.10) Na ficha (`PainelPreparacao`), "Voltar aos dados do Júpiter" numa disciplina com oferta ajustada põe `restaurarOferta = true` no estado da instância (`ficha`, recriado a cada desenho), que entra em `coletar()`/`serializar()` (habilita "Salvar") e no pedido; um `input`/`change` em `[data-oferta]` zera a intenção; salvamento concluído sem leitura também a zera. O servidor só remove o ajuste com essa indicação explícita — a proteção da 1.8.9 para salvamentos comuns continua.

**Sobreposição ("overlay").** O painel mostra, para cada disciplina da estrutura, os valores do Júpiter (aba Disciplinas e Disciplinas por habilitação) com os campos preenchidos em "Ajustes manuais" por cima; campo vazio = vale o do Júpiter. A chave do ajuste é o **código no Júpiter**, então um ajuste de código continua ligado à disciplina original. Uma disciplina que sai da estrutura numa importação futura mantém o ajuste (e continua marcada "Fora da estrutura atual"). Na lista por unidade, "código já conhecido" = códigos efetivos da estrutura (com os ajustados, inclusive excluídas e fora da estrutura) + códigos das disciplinas para outros cursos (inclusive excluídas). Se o código de uma disciplina da estrutura foi ajustado, o código original do Júpiter volta a aparecer como "novo" na lista por unidade: basta desmarcá-lo.

#### Ajustes manuais (18 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Disciplina (código no Júpiter) | texto | Código da disciplina como veio do Júpiter (aba Disciplinas). Identifica a qual disciplina o ajuste se aplica: não altere. |
| 2 | Excluída | texto | "Sim" = excluída pelo painel: não aparece na lista nem na grade (pode ser restaurada no painel, filtro Situação › Excluídas). |
| 3 | Adicionada à grade horária | texto | "Sim" = enviada para a grade horária (etapa 3 › "Enviar para a Grade Horária", ou "Adicionar à Grade Horária" na ficha). Sai com "Remover da grade" na Prévia da grade horária. Até a 1.3.2 esta coluna se chamava "Selecionada para a grade". |
| 4 | Código ajustado | texto | Vazio = usa o do Júpiter. |
| 5 | Nome ajustado | texto | Vazio = usa o do Júpiter. |
| 6 | Departamento ajustado | texto | — |
| 7 | Créditos-aula ajustados | inteiro | — |
| 8 | Créditos-trabalho ajustados | inteiro | — |
| 9 | CH total ajustada (h) | inteiro | — |
| 10 | Estágio – CE ajustado (h) | inteiro | — |
| 11 | Práticas – CP ajustadas (h) | inteiro | — |
| 12 | Extensão – EXT ajustada (h) | inteiro | — |
| 13 | ATPA ajustada (h) | inteiro | — |
| 14 | Versão ajustada | inteiro | — |
| 15 | Semestre de oferecimento ajustado | texto | (1.3.2) "1º semestre", "2º semestre" ou "1º e 2º semestres" escolhido no painel (ex.: disciplina prática oferecida nos dois semestres). Vazio = automático, pelo período ideal. |
| 16 | Oferta ajustada | texto | Tipo e período em cada habilitação, quando foram corrigidos no painel (formato interno; edite pelo painel). Vazio = usa a oferta do Júpiter. |
| 17 | Alterado em | data e hora | — |
| 18 | Alterado por | texto | — |

#### Disciplinas para outros cursos (19 colunas)

| # | Coluna | Tipo | O que é |
|---|---|---|---|
| 1 | Identificador | texto | Código com que a disciplina foi incluída; (1.8.1) se esse identificador já era de outra linha (código alterado no painel), recebe o sufixo -2, -3… Identifica a linha: não altere. |
| 2 | Código | texto | — |
| 3 | Nome | texto | — |
| 4 | Departamento | texto | — |
| 5 | Créditos-aula | inteiro | — |
| 6 | Créditos-trabalho | inteiro | — |
| 7 | CH total (h) | inteiro | 15 h por crédito-aula + 30 h por crédito-trabalho (calculada na inclusão; pode ser corrigida no painel). |
| 8 | Ativação | texto | — |
| 9 | Desativação | texto | — |
| 10 | Unidade atendida | texto | Unidade da USP para a qual a disciplina é ministrada (ex.: FEA). Preenchido no painel. |
| 11 | Curso atendido | texto | Curso da outra unidade. Preenchido no painel. |
| 12 | Semestre de oferecimento | texto | Semestre do ANO em que a disciplina é oferecida ("disciplina de semestre"): "1º semestre", "2º semestre" ou "1º e 2º semestres". Vazio = não informado. Preenchido no painel. Até a 1.3.1 esta coluna se chamava "Semestre ideal". |
| 13 | Origem | texto | "Lista de disciplinas por unidade (Júpiter)" ou "Cadastro manual". |
| 14 | Incluída em | data e hora | — |
| 15 | Excluída | texto | "Sim" = excluída pelo painel (pode ser restaurada). |
| 16 | Adicionada à grade horária | texto | "Sim" = enviada para a grade horária. Até a 1.3.2 esta coluna se chamava "Selecionada para a grade". |
| 17 | Observações | texto | — |
| 18 | Alterado em | data e hora | — |
| 19 | Alterado por | texto | — |

## 7. Gravação: preparação, ativação e recuperação

O Sheets não oferece transação entre abas, e `LockService` só impede duas execuções do script ao mesmo tempo (não desfaz escritas nem impede edições humanas). A gravação (`Gravacao.gs`) usa por isso um **ponto único de ativação**:

1. **Manifesto** — metadado `estruturaCurricular.ativa` (um texto JSON): IDs internos das 4 abas de dados em uso, `versaoBase`, id da última importação, lista das importações **concluídas** (`{ id, op, em }`) e texto da aba Sobre. Painel, prévia e confirmação leem as abas **pelo ID do manifesto** e o histórico **filtrado pela lista de concluídas**. Dados, versão e histórico mostrados correspondem sempre à mesma importação.
2. **Diário** — metadado `estruturaCurricular.gravacao` `{ op, id, inicio, fase }`, escrito antes de qualquer preparação. Só é removido quando tudo terminou (inclusive a arrumação); com pendência, fica com `fase: "arrumacao_pendente"` e `pendencias`.
3. **Preparação** — cada aba em uso é copiada (`copyTo`) para uma aba oculta `_nova_<aba>_<op>`; os dados novos são escritos só na cópia. As linhas de histórico são acrescentadas com o id da importação (invisíveis ao painel enquanto o id não estiver no manifesto). `flush`.
4. **Conferência** — as cópias são relidas (quantidade e chave de cada linha); as abas em uso são relidas e comparadas com a impressão digital lida no início da confirmação (sistema **e** Observações/extras). Diferença → cancela (`EDICAO_DURANTE_GRAVACAO`).
5. **Ativação** — **uma** escrita do manifesto novo (abas novas, versão + 1, id na lista de concluídas) e `flush`.
6. **Arrumação** (idempotente, passo a passo: uma falha num passo não impede os outros) — aba nova recebe o nome normal e fica visível; a anterior vira `_anterior_<aba>` (cópia de segurança da versão anterior; a mais velha é apagada); cópias auxiliares fora de uso são ocultadas; posição; proteção "só aviso". Depois, aba Sobre. **O diário só é removido se arrumação e Sobre deram certo e as abas visíveis conferem com o manifesto**; senão ele é regravado com `fase: "arrumacao_pendente"` e a lista de pendências.

**Conferência das abas pelo ID** (`divergenciasDasAbas_`). Para cada aba de dados, compara a aba **em uso pelo manifesto** (ID interno) com o que a pessoa vê: *grave* = a aba em uso tem outro nome ou está oculta (quem abre "Disciplinas" na planilha vê uma versão anterior, ou não vê a aba); *não grave* = aba em uso sem proteção, ou cópia `_nova_…`/`_anterior_…` visível. O nome sozinho não basta: depois de uma arrumação que falhou, a aba chamada "Disciplinas" pode ser a da versão anterior.

**Garantias e respostas**

| Onde falhou | Estado resultante | Resposta |
|---|---|---|
| diário, cópia, escrita das cópias, histórico, `flush`, conferência | manifesto antigo → versão anterior intacta para todos; restos descartados na hora (ou pela recuperação, se o descarte falhar) | `NAO_GRAVADA` ("a base continua exatamente como estava") |
| escrita do manifesto, e a releitura mostra o antigo | idem | `NAO_GRAVADA` |
| escrita/`flush` do manifesto, e a releitura também falha | não dá para saber | `RESULTADO_INCERTO`; `verificarImportacao(op)` responde pelo manifesto |
| `flush` depois do manifesto, releitura mostra o novo | concluída | ok, `pendencias: ["confirmação da escrita (flush)"]` |
| arrumação, Sobre, remoção do diário | concluída; painel de todos já usa as abas novas pelo ID; diário mantido | ok, `concluida: true`, `pendencias`; `planilhaDesatualizada: true` quando a divergência é grave (a tela e o painel alertam) |
| edição humana no instante entre a última conferência e a ativação | concluída; a edição ficou na cópia `_anterior_…` | ok, com `avisos` |

**Matriz da arrumação** (falha injetada em cada passo depois da ativação; `testar_gravacao.js` §3b):

| Falha | Manifesto | Abas visíveis logo depois | Resposta ao usuário | Recuperação |
|---|---|---|---|---|
| renomear a anterior (`setName` → `_anterior_`) | versão nova | "Disciplinas"… = versão **anterior**; novas ocultas `_nova_…` | gravada, pendência + alerta "a planilha ainda mostra a versão anterior"; painel (todos) com alerta | admin abre o painel ou nova prévia → nomes, visibilidade, proteção; diário removido |
| renomear a nova (`setName` → nome normal) | versão nova | nenhuma aba "Disciplinas"… (anteriores já renomeadas e ocultas) | idem | idem |
| apagar a cópia anterior mais velha | versão nova | versão **anterior** com os nomes normais | idem | idem |
| mostrar a nova (`showSheet`) | versão nova | abas certas, mas **ocultas** | idem | idem |
| ocultar a anterior (`hideSheet`) | versão nova | abas certas; `_anterior_…` visíveis | gravada, pendência (sem alerta grave) | idem |
| mover (`moveActiveSheet`) | versão nova | abas certas, fora de ordem | gravada, pendência | idem |
| proteger (`protect`) | versão nova | abas certas, sem proteção | gravada, pendência | idem |
| aba Sobre | versão nova | abas certas; Sobre antiga | gravada, pendência "aba Sobre" | admin abre → Sobre reescrita |
| remover o diário | versão nova | abas certas | gravada, pendência "diário da gravação" | admin abre → diário removido |
| recuperação falha de novo | versão nova | como antes | painel abre com alerta; admin vê "a correção não conseguiu terminar" | próxima abertura/prévia |
| trava ocupada ao abrir | versão nova | como antes | painel com alerta; admin vê "outra operação em andamento" | próxima abertura/prévia |

**Recuperação** (`recuperarGravacao_`, sempre sob a trava): no início de toda prévia/confirmação e quando um administrador abre o painel **se houver diário ou divergência pelo ID** (`precisaRecuperar_`). Usa o manifesto como verdade: diário de importação não concluída → descarta cópias `_nova_…` e histórico dela; diário de importação concluída → termina a arrumação e reescreve a aba Sobre; apaga linhas de histórico com id no formato novo que não estão entre as concluídas; acerta nomes/visibilidade/ordem/proteção. Uma falha na arrumação **não** lança erro: volta como pendência, o diário fica e o painel abre com o alerta. Leitores não fazem recuperação, sempre veem a última versão concluída e recebem o alerta enquanto a divergência grave existir.

**Leitura consistente** (`lerVersaoConsistente_`). Painel e prévia leem sem segurar a trava. A leitura guarda o texto do manifesto, lê dados (e, no painel, histórico e situação) **pelos IDs desse manifesto** e relê o manifesto: igual → devolve; mudou → descarta e repete (outra importação terminou no meio); `BASE_INCONSISTENTE` com manifesto mudado → repete (a importação seguinte apagou a cópia antiga); com manifesto **igual** → aba apagada de verdade, o erro segue. No máximo 3 tentativas, sem espera; depois `BASE_EM_ATUALIZACAO`. Nunca devolve dados, versão e histórico de versões diferentes. A conferência de colunas (`abasComColunasFaltando_`) também não trata "aba em uso não encontrada" como "coluna faltando" (antes, um leitor recebia `BASE_NAO_PREPARADA` nesse caso).

### 7.1 Revisão humana paginada

A lista de valores só do PDF (EXT, versões sem 2ª fonte, Informações Básicas) é ordenada (primeiro o que pede atenção; os EXT = 0 que não mudam nada no fim) e dividida em páginas de **100**. `prepararImportacao` guarda as páginas no `CacheService` (chaves `rev:<operacao>:p<n>`, validade 6 h) com um resumo (`total`, `paginas`, impressão digital da lista, assinatura da prévia, **hash SHA-256** do e-mail de quem a gerou — o e-mail em si não vai para o cache); a página 1 vai na própria prévia. `obterPaginaRevisao(operacao, n)` devolve a página e registra `rev:<operacao>:v<n>`. Na confirmação de um PDF por OCR, além de `revisaoPdf: true`, o servidor exige: resumo presente e da mesma pessoa; `total`, impressão digital e assinatura iguais às recalculadas; **todas** as páginas registradas — senão `REVISAO_INCOMPLETA`, dizendo quais faltam. A interface só libera a caixa depois de abrir todas as páginas e mostra, no topo, o resumo por tipo (com o total de EXT = 0 e em que páginas estão).

Capacidade: um pacote válido tem no máximo 3.000 disciplinas × 2 valores + 30 currículos × 22 campos = 6.660 valores; o limite `MAX_ITENS_REVISAO` é 7.000. Acima dele a prévia é **bloqueada** com mensagem (nunca cortada). No simulador, 6.000 valores ocupam 60 páginas; a maior página tem 14.401 bytes (limite de um valor no CacheService: 100 KB) e a resposta da prévia, 14.993 bytes (só a página 1 vai nela). Limite do que se prova: o servidor sabe que cada página foi entregue ao navegador de quem confirma; não sabe se a pessoa leu. Se o cache for descartado antes da confirmação, ela é recusada (nunca aceita sem prova).

**Idempotência.** A prévia devolve `operacao` (UUID). A confirmação com uma `operacao` já concluída devolve `jaGravada` sem regravar. O id da importação é `IMP-aaaammdd-hhmmss-<8 hex da operação>` (data legível também na coluna "Data e hora"); se já existir, recebe `-2`, `-3`…

**Prévia fiel.** `assinatura = SHA-256(pacote limpo + versaoBase + impressão das células mantidas pelo sistema + mudanças + decisões sobre as Informações Básicas + lista de revisão)`. Observações e colunas extras não entram: podem ser editadas depois da prévia, são lidas no início da confirmação e preservadas; a conferência final (passo 4) cancela se mudarem durante a preparação.

**Limites.** Pacote: 30 currículos, 3.000 disciplinas, 30.000 vínculos, 60.000 requisitos; prévia até 400 itens por lista de mudanças (os totais vêm completos); revisão: todos os valores, em páginas de 100, até 7.000 (acima disso, bloqueio); arquivo até 40 MB. O manifesto cresce ~90 caracteres por importação (limite de um metadado: ~30 mil caracteres, centenas de importações). Um curso por planilha.

## 8. Dependências externas (só no navegador, só para PDF)

Declaradas em `LeitorPdfFontes.html`, em `LIBS`. São baixadas **apenas quando alguém escolhe um PDF**; o painel abre sem elas.

| Recurso | Origem | Verificação |
|---|---|---|
| PDF.js 3.11.174 (`pdf.min.js` + worker) | `cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174` | SRI `sha384` no `<script>` |
| Tesseract.js 7.0.0 (+ worker e `tesseract.js-core@7.0.0`) | `cdn.jsdelivr.net/npm/…` | SRI `sha384` no `<script>` principal |
| Modelo `por.traineddata` (tessdata_fast 4.1.0) | `cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@4.1.0` ou `raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0` | SHA-256 `c4932b93…ed58b7deb`, conferido antes do uso |
| Marca USP (tema claro) | PNG em `datagrad.sistemas.ip.usp.br` | mesmo comportamento do Painel de Solicitações |

**Por que tessdata_fast.** O modelo padrão do Tesseract.js (`best_int`) lê o "0" das tabelas do Júpiter como a letra "o" e perde linhas inteiras. Com o `fast` 4.1.0, as 398 linhas de disciplina foram lidas e todos os números ficaram coerentes com as contas do relatório; nos campos que o CSV também tem, os valores coincidiram com o CSV. Isso não prova as leituras dos campos que só o PDF tem (EXT, versões, Informações Básicas), que passam por revisão humana.

**OCR.** Cada página é desenhada a 300 dpi e lida duas vezes: página inteira (segmentação 6, saída TSV) e só a faixa dos números, aceitando apenas dígitos. O PDF é tratado como "com texto" quando pelo menos metade das páginas tem 40 ou mais caracteres na camada de texto.

## 9. Segurança no código

- Autorização no servidor em toda função pública.
- Nenhum ID no código nem no HTML. O painel não recebe IDs.
- Todo texto da base é escapado (`esc`) antes de ir ao HTML.
- O CSV baixado protege contra fórmula: apóstrofo antes de `=`, `+`, `-` e `@`.
- Logs sem e-mail, sem conteúdo e sem IDs.

Detalhes em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md).

## 10. Tema, acessibilidade e UX

- `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html` e `GradipMarcaUSP.html` são **byte-idênticos** aos de `sistemas/painel-solicitacoes/src/` (v1.2 aceita).
  - Atenção: `GradipTema.html` do Painel de Solicitações tem a correção de `--gradip-border-strong` (contraste ≥ 3:1 nas bordas de campos).
  - A cópia em `shared/GradipTema.html` **ainda não tem essa correção** (1,81:1 no claro). Por isso foi usada a do painel. Recomenda-se propagar a correção para `shared/`.
- Tema padrão **Sistema**; preferências `system`, `light`, `dark` em `localStorage["gradip-theme"]`. Marca azul no claro e branca no escuro.
- Etapas da preparação (1.3.0; etapa 4 na 1.4.0): `role="tablist"` com setas, só para administradores; o cartão da base aparece só na etapa 1. As abas da Prévia também são `tablist` com setas, Home e End.
- "Cadastrar nova grade": janela que só fecha pelos botões; o botão de confirmação só se ativa com a palavra APAGAR (o servidor confere de novo).
- Caixas de seleção dentro de um `<label>` de 44 × 44 px; a linha marcada ganha fundo informativo, e a barra de ações diz em texto quantas estão marcadas.
- Janelas (ficha, importação e lista por unidade): `role="dialog"`, foco preso, retorno do foco e bloqueio da rolagem do fundo. Só fecham pelos botões ("X", "Fechar", "Cancelar"): ESC e clique no fundo não fecham (1.2.2). Exceção deliberada (1.9.0): a Central de Ajuda, que só explica, fecha também por ESC e clique no fundo (§10.1). A ficha editável com alterações não salvas pergunta antes de fechar.
- Abas com setas, Home e End.
- Alvos de toque de ~44 px.
- Estados comunicados também por texto, nunca só por cor.
- Testado em 360, 390, 480, 768 e 1280 px, nos dois temas, sem rolagem horizontal. Contraste medido: texto ≥ 4,5:1 e bordas ≥ 3:1.

### 10.1 Central de Ajuda (1.9.0) — camada só do navegador

**Inclusão** (`Painel.html`, pelo `include_` existente; nenhum `doGet` novo): `EstruturaAjudaEstilos` logo depois de `PainelEstilos` (que vem depois de `GradipTema`); `EstruturaAjuda` depois das janelas e antes de `#carregando`; `EstruturaAjudaUI` por último, depois de `PainelAuditoria`. O botão "Ajuda" está no cabeçalho, fora de `#conteudo`: não depende de `obterDadosPainel` (com a carga falhando, a Central abre normalmente). Durante uma operação com a camada "Carregando…" (z-index 80), a Central (z-index 70) não abre por cima: a barreira continua.

**Sem servidor.** A Central não chama `google.script.run`, não lê planilha, não baixa nada, não usa `localStorage`/`sessionStorage` e não registra uso. O conteúdo vem pronto no HTML servido; a busca é feita no navegador sobre um corpus calculado uma vez (`data-search` + texto de cada unidade, inclusive a resposta recolhida da FAQ), sem acento e sem diferença de maiúsculas, exigindo todas as palavras. O texto digitado só é usado por `textContent`.

**Gatilhos contextuais.** `data-gradip-help-open="ajuda-…"` (vazio = início). Os estáticos estão em `Painel.html`; os de conteúdo redesenhado são gerados por `Painel.gatilhoAjuda(destino, texto)` (PainelApp, exportado) em `PainelApp`, `PainelImportacao`, `PainelPreparacao` e `PainelAuditoria`. Um único listener de clique no `document` (delegação) os atende, inclusive depois de a ficha, a prévia, a auditoria ou os avisos serem redesenhados. Os gatilhos só existem dentro dos contêineres dos controles a que se referem (por exemplo, etapas e janelas de administrador), por isso acompanham o perfil sem regra nova.

**Integração com `Painel.Modal`** (mudança mínima em `PainelApp.html`). A Central é uma janela da mesma pilha que a ficha, a importação e o envio — não há segundo controle de foco. `abrir(el, opcoes)` ganhou opções que só a Central passa; sem elas, as janelas operacionais se comportam como antes:

| Opção | Efeito | Por quê |
|---|---|---|
| `retorno` | elemento para devolver o foco (o gatilho clicado) | navegadores que não focam o botão no clique |
| `aoEsc` | ESC chama a função se a janela está no topo | ESC é opt-in: as operacionais continuam sem fechar por ESC |
| `guardarFoco` | foco levado para trás da janela do topo volta para dentro dela; o destino fica em `focoAdiado` | respostas atrasadas (salvar, prévia do envio, passos da importação) focam a ficha/janela por trás |
| `guardarFoco` — Tab (1.9.1) | com o foco num elemento da janela que não está na ordem de Tab (título `tabindex="-1"` focado ao abrir um assunto, a própria janela, a área rolável), Tab/Shift+Tab vão ao controle visível seguinte/anterior na ordem do documento; sem nenhum nessa direção, à outra ponta | sem isto, o Chromium procurava o próximo controle **fora** da janela, a guarda devolvia o foco ao mesmo título e o Tab ficava parado (34 dos 49 destinos contextuais da 1.9.0, no Chromium 141). Só a janela com `guardarFoco` (a Central) usa; as demais continuam com a regra anterior (pontas e foco fora da janela) |
| `retornoSeguro` | ao fechar: retorno (se existe, está visível e pertence à janela que ficou no topo) → `focoAdiado` → foco anterior da janela do topo → primeiro focável dela → `#conteudo` | o gatilho pode ter sido removido por um redesenho |

Além disso: `noTopo(el)` (consulta, usada pelos testes); `focusin` registra o último foco dentro da janela do topo; se uma janela for aberta por código enquanto a Central está no topo, ela entra logo abaixo da Central e o foco pedido fica guardado. O bloqueio de rolagem é o de sempre (classe `modalAberto`): a Central não altera `body.style.overflow`; ao fechar sobre outra janela, a classe continua. Clique no fundo da Central (`#centralAjuda`) fecha só ela. Abrir de novo com a Central aberta só navega (a pilha não ganha outra entrada); o script tem guarda de inicialização única. Nada no fundo recebe atributos (`inert`, `aria-hidden`) que precisariam ser restaurados.

**Contrato GRADIP** (`docs/ajuda/` do repositório de referência): `data-gradip-help-open/-overlay/-dialog/-close/-search/-search-status/-section/-search-item/-target/-faq-toggle/-no-results`, `data-search`. Adaptações: sem `<main>` interno (o painel já tem `#conteudo`); sem listener próprio de teclado (Tab/ESC ficam com `Painel.Modal`); vistas início/seção/busca no lugar de rolar o manual inteiro; contagem por unidade de busca.

## 11. Envio da grade para preenchimento (1.5.0, `EnvioGrade.gs`)

**Planilha das secretarias** (chave `GRADE_HORARIA_PREENCHIMENTO`): abas Informações, PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades, DataBase (e uma aba oculta "Disciplinas", de uso antigo). O sistema só mexe nas 6 abas de disciplinas, sempre do mesmo jeito:

| Coluna | Título (linha 3) | O que o sistema faz |
|---|---|---|
| A | — | nada |
| B | Cadastro | apaga (caixa de seleção do Serviço de Graduação) |
| C | Código | grava o código em uso (o ajustado, se houver); só dígitos vai como texto |
| D | Nome | grava o nome em uso; com Observações: `Nome – Observações` |
| E | Tipo | grava `Obrigatória`, `Eletiva` ou `Livre`; vazio nas disciplinas para outros cursos |
| F–H, K, L, N–S | Modalidade … Sala | apaga (as secretarias preenchem); (1.6.0) apaga também as notas da coluna K (avisos de conflito) |
| I | Semestre Ideal | grava só o número (1–10); vazio nas disciplinas para outros cursos |
| J | Créditos Aula | grava os créditos-aula em uso |
| M | Horário de Fim | (1.6.0; 1.6.2; 1.6.3) grava a fórmula `=IF(Ln="";"";IF(ISERROR(IF(ISNUMBER(Ln);Ln;TIMEVALUE(Ln)));Ln;IF(Jn="";"";TEXT(IF(ISNUMBER(Ln);Ln;TIMEVALUE(Ln))+Jn/24;"HH:mm"))))` (em pt_BR; com "," no lugar de ";" em localidades de ponto decimal — `separadorDaPlanilha_` lê `getSpreadsheetLocale()`, porque o Sheets lê a fórmula do script com as regras da localidade): início (hora ou texto "HH:mm") + créditos-aula horas, devolvida como texto "HH:mm"; texto que não é hora em L é repetido; sem início ou sem créditos, vazio. **Sem `setNumberFormat`** (1.6.2: as abas são Tabelas com colunas tipadas, e o Sheets recusa mudar o formato de coluna com tipo). Depois de gravar, `celulasDoFimComErro_` lê M; com erro, a fórmula é regravada uma vez com o outro separador e fica a versão com menos erros; se ainda houver erro, aviso no resultado (#ERROR!, #VALUE!…). A coluna deve ficar protegida; (1.6.1) a lista suspensa de M4:M999 é retirada antes, porque recusaria a fórmula |
| T em diante | práticas | **nunca** mexe |

Limpeza: `clearContent` de B4:S999 (só o conteúdo: formatação condicional, caixas de seleção e listas suspensas ficam). Linhas 1–3 e da 1000 em diante não mudam.

**Linhas.** As mesmas da prévia (`linhasDaGrade_`): marcadas "Adicionada à grade horária", não excluídas, com semestre de oferecimento em vigor igual ao da grade ou "os dois". **Uma linha por disciplina** (as habilitações são simultâneas: o aluno cursa uma vez só). Tipo e semestre ideal vêm da oferta da habilitação de menor código entre os currículos em uso — 0 Psicólogo, 100 Bacharelado, 200 Licenciatura (`ofertaPrincipal_`; oferta ajustada no painel substitui a do Júpiter); se a oferta dessa habilitação não tem período, I fica vazio. Grupo pelo prefixo do código em uso (`grupoDaGrade_`, igual a `grupoPrevia` da página). Ordem: Obrigatórias, Eletivas, Livres, sem tipo; depois semestre ideal; depois código.

**Ordem das operações** (sob a trava do sistema; tudo o que pode recusar vem antes de mudar algo):

1. valida o alvo e a identificação da prévia (`PREVIA_INVALIDA`); monta as linhas e os valores a gravar (`valoresDoEnvio_`), calcula a identificação do conteúdo atual e compara com a da prévia conferida (e as contagens, se vierem) → `PREVIA_DESATUALIZADA`; grade vazia ou grande demais recusa. (1.8.12) Os MESMOS valores calculados para a comparação são os gravados no passo 5; não há liberação da trava entre a comparação e o fim do envio. Se `executarPreparacao_` concluiu antes um salvamento ou lote pendente que mudou o conteúdo, a recusa traz `recuperado`/`recuperadoLote` (a gravação anterior continua; o novo envio não acontece);

**Identificação do conteúdo (1.8.12).** `conteudoCanonicoDoEnvio_` = JSON de uma lista: `["grade-horaria-envio/1", ano, semestre, [[grupo, [[C, D, E, I, J], …]], …]]`, com os 6 grupos na ordem de `ENVIO_GRADE.ABAS` (vazios incluídos) e as linhas na ordem de gravação; C/D/E com `textoSeguro_` aplicado (o que é escrito), I/J número ou `''` (célula vazia; 0 continua 0). Só listas (sem objetos com ordem de chaves variável); o escape do JSON evita ambiguidade de concatenação. `assinaturaDoEnvio_` = SHA-256 (`hashTexto_`). Fora da identificação: filtros, seleção, e-mails, datas de alteração, campos não enviados (CH, departamento…), disciplinas fora da grade do semestre. **Painel:** `abrirEnvioGrade` pede `previaEnvioGrade` para o alvo escolhido e mostra as contagens e as linhas; guarda `{instancia, alvo, previa, idx}` e só habilita "Fazer a cópia e enviar" com essa resposta (resposta de outra abertura/alvo é ignorada; falha não habilita); `confirmarEnvioGrade` envia a `assinatura`, o alvo e as contagens DESSA prévia (sem nova leitura) e só uma vez; dados da página ou alvo alterados depois da conferência invalidam a confirmação ("Conferir de novo"); `PREVIA_DESATUALIZADA`/`PREVIA_INVALIDA` mostram "Conferir de novo" (nova prévia, nova conferência). Nenhum hash aparece na tela. **(1.8.13) Validade pelo conteúdo, não pela referência:** "dados da página alterados" = mudou `conteudoLocalDoEnvio(alvo)` (PainelPreparacao): JSON de `[ano, semestre, [[grupo, [[código, nome com observações, tipo, semestre ideal, créditos-aula], …]], …]]` calculado com `estado.idx` por `projecaoDoEnvio`, que espelha `linhasDaGrade_` (composição pela marca de grade, exclusão e oferecimento efetivo; código/nome em uso com volta aos do Júpiter; oferta principal = menor código de habilitação entre as ofertas efetivas com tipo; créditos ajustados ou do Júpiter, vazio = null e 0 = 0; outros cursos sem tipo nem semestre ideal; ordem tipo → semestre ideal → código). A troca do objeto `estado.idx` por `aplicarPreparacao` (reaplicação dos mesmos dados, CH, e-mail/data de alteração, disciplina fora da grade do semestre) não invalida; filtros, abas e caixas da prévia não entram. A fotografia comparada é a **da página**, tirada quando a prévia do servidor é mostrada (local × local): a página pode estar atrás do servidor na abertura — essa diferença inicial (aviso "A lista mudou desde que a página foi carregada") não impede o envio da prévia conferida, porque quem decide é a identificação conferida no servidor. Durante a leitura, `conferirValidadeDoEnvio` marca `mudouNaLeitura` quando o conteúdo da página muda por algo que não seja a recuperação devolvida pela própria prévia — reconhecida pela identidade da chamada: `chamarServidor` devolve a promessa com `.chamada` e, enquanto aplica `recuperado`/`recuperadoLote` daquela resposta, deixa `estado.respostaEmAplicacao = chamada`. A resposta da prévia invalida a confirmação se houve essa marca (ou, sem recuperação, se o conteúdo da página mudou); depois retoma a fotografia. O clique final confere a fotografia de novo e envia a identificação, o alvo e as contagens da prévia mostrada — nunca busca outra. **Nota da recuperação (1.8.13):** na recusa do envio, `notaRecuperacaoEnvio` escreve uma nota por indicador — `recuperado` e `recuperadoLote` vistos separadamente: "ela continua gravada e os dados do painel foram atualizados" só quando a preparação lida veio para aquele indicador (a do lote pode vir no `recuperado`, que a leitura cobre inteira) e sem `leituraFalhou`; com `leituraFalhou`, "ela continua gravada, mas o painel não conseguiu atualizar todos os dados. Recarregue a página" (o aviso fixo de recarga de `aplicarRecuperado`/`aplicarRecuperadoLote` continua).
2. abre a planilha das secretarias, confere as 6 abas e o cabeçalho (C3, D3, E3, I3, J3); abre o índice e a pasta; lê o semestre do **nome atual** ("Grade Horária - 1º Semestre de 2026" → `2026/1`; sem semestre → `NOME_SEM_SEMESTRE`);
3. `DriveApp.getFileById(…).makeCopy(nome + " (cópia de dd/mm/aaaa hh:mm)", pasta)` — copia o arquivo inteiro (todas as abas, inclusive as colunas de práticas e o script da planilha, se houver; acionadores instaláveis não são copiados);
4. registra a cópia no índice: coluna B da primeira linha do semestre do nome atual com B vazia, ou linha nova (1.6.0); depois cria — ou reaproveita — a auditoria do semestre novo e registra o ID na coluna C (§12);
5. apaga B4:S999 das 6 abas, grava C:E e I:J (duas escritas por aba com disciplinas);
6. renomeia o arquivo: `Grade Horária - {1|2}º semestre de {ano}`.

Falha em 3: nada mudou (`BACKUP_FALHOU`). Falha em 4: a cópia ficou na pasta sem registro; a grade não mudou (`BACKUP_FALHOU`). Falha em 5–6: `ENVIO_INCOMPLETO`, citando a cópia; um novo envio refaz tudo (e faz outra cópia). Cada envio = uma cópia e uma linha no índice.

**Permissões.** A conta que executa o Web App precisa editar a planilha das secretarias e o índice e criar arquivos na pasta. O uso de `DriveApp` acrescenta ao projeto a autorização do Google Drive (`https://www.googleapis.com/auth/drive`), pedida ao executar qualquer função no editor depois da atualização (`diagnosticarEnvioGrade`).

## 12. Auditoria da grade (1.6.0, `AuditoriaGrade.gs`)

**Objetivo:** guardar quem editou o quê na planilha das secretarias, fora do alcance delas, num formato pronto para um painel de auditoria.

**Uma planilha por semestre**, na pasta `AUDITORIA_GRADES_ANTERIORES`: "Auditoria - Grade Horária - 1º semestre de 2027", com as abas **Edições** (o registro) e **Sobre** (o que é cada coluna). O ID vai para a coluna C (`Auditoria_ID`) da linha do semestre no índice `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`. A cópia de segurança vai para a coluna B **quando aquele semestre termina** (no envio seguinte). Reenviar o mesmo semestre reaproveita a auditoria.

**Aba Edições** — uma linha por célula editada:

| Coluna | Conteúdo |
|---|---|
| Data e hora | quando a edição foi salva |
| Semestre | do nome da planilha das secretarias no momento da edição (ex.: 2027/1) |
| Origem | `Secretaria` (edição na planilha) ou `Sistema` (envio, ativação) |
| E-mail | `e.user` do evento; vazio → "(não identificado)" (o Google só informa contas do mesmo domínio). Não usa `Session.getActiveUser` como reserva, para não atribuir à conta errada |
| Aba, Célula, Linha, Coluna | onde |
| Campo | título da linha 3 da coluna (nas 6 abas de disciplinas) |
| Código da disciplina, Disciplina | colunas C e D da mesma linha |
| Valor anterior, Valor novo | `e.oldValue` / `e.value` (horário em fração do dia vira HH:mm — com ponto ou, numa planilha em português, com vírgula: "0,3333333333" → 08:00, 1.6.4); em várias células, sem valor anterior |
| Tipo de edição | Preencheu / Alterou / Apagou (uma célula); Colagem ou preenchimento (várias); Resumo (colagem com mais de 300 células: uma linha só); Envio da grade, Grade encerrada, Auditoria ativada (sistema) |
| Células no evento | tamanho da ação |
| Observação | detalhes (eventos do sistema) |
| ID do evento | agrupa as linhas de uma mesma ação |

Todo texto é gravado como texto (`textoSeguro_`): nada vira fórmula, número ou data.

**Acionador:** instalável, de edição, criado por `ativarAuditoriaGrade()` **neste projeto** (`ScriptApp.newTrigger('registrarEdicaoGrade').forSpreadsheet(<planilha das secretarias>).onEdit()`). Roda no servidor do Google com a autorização de quem ativou (por isso grava na auditoria) e não deixa a planilha delas mais lenta. Ignora edições de outras planilhas; o ID da planilha das secretarias e o da auditoria do semestre ficam em cache (6 h). (1.8.11) Grava sob a trava do sistema (até 45 s); **sem a trava, não grava** (erro no log de execução; até a 1.8.10 usava `appendRow` fora da trava, que podia ser sobrescrito por uma escrita por posição em andamento). Contrato da trava nas escritas da auditoria (`AuditoriaGrade.gs`): `gravarNaAuditoriaSobTrava_(ss, linhas, trava)` é a rotina interna — recebe o objeto `Lock` que o próprio chamador adquiriu nesta execução, confere `trava.hasLock()` nesse objeto, calcula a posição, amplia a aba e grava o bloco, e **não** adquire de novo, não libera e não faz flush; `gravarNaAuditoria_(ss, linhas)` é a entrada independente (acionador de edição): `tryLock(45000)`, rotina interna, `SpreadsheetApp.flush()` e `releaseLock()` no `finally`. `executarPreparacao_` passa a trava que adquiriu como 3º argumento de `fn(ss, usuario, trava)`; o envio a usa nas anotações e só o executor a libera, depois do flush. `ativarAuditoriaGrade` adquire a trava (10 s, senão `OCUPADO`) e faz tudo sob ela (`ativarAuditoriaSobTrava_`). `registrarAberturaGrade` também adquire a trava (45 s) antes de criar a aba Aberturas, se faltar, e do `appendRow`. Não registra alterações feitas por scripts — por isso o envio anota o próprio evento ("Envio da grade" na auditoria nova; "Grade encerrada" na anterior). Se o semestre do nome não tem auditoria no índice, a edição não é registrada e o registro de execução avisa.

**Planilha das secretarias** (`planilha-grade/Validacoes.gs`, único código dela): gatilho simples `onEdit` — modalidade "Prática" e conflito de horário (optativa × obrigatória do mesmo semestre ideal, mesmo dia, horário sobreposto; tipos "Obrigatória"/"Eletiva"/"Livre"). O horário de fim é a fórmula gravada pelo envio. Ver `planilha-grade/README.md`.

## 13. Painel da auditoria (1.7.0, `AuditoriaPainel.gs` + `PainelAuditoria.html`)

**Seções.** Acima da página, `#visoes` (tablist) alterna `#visaoEstrutura` (tudo o que existia) e `#visaoAuditoria`. Aparece para os dois perfis depois que `obterDadosPainel` responde. A auditoria só é pedida ao servidor na primeira vez que a seção é aberta, ao trocar a grade e em "Atualizar".

**Servidor** (`obterAuditoriaGrade`, leitor e admin): abre a planilha das secretarias (nome → semestre atual), o índice (semestres com `Auditoria_ID`), a auditoria do semestre pedido (aba Edições, últimas `PAINEL_AUDITORIA.MAX_EDICOES` = 5.000 linhas, em ordem inversa; Data e hora formatada no servidor em `dd/MM/yyyy HH:mm:ss`, São Paulo) e, só para o semestre atual, as colunas C a M das 6 abas (linha 4 em diante, linhas com código). Tudo como texto exibido. Nada é gravado; nenhum ID nem link de planilha vai ao navegador (1.8.0). (1.8.0) Também lê, em todas as linhas, Origem e E-mail da aba Edições (`edicoesPorPessoa_`) e a aba Aberturas (`aberturasPorPessoa_`), e devolve as contagens por e-mail. (1.11.0) `identificarPessoas_` procura os e-mails das edições das secretarias e das aberturas em `PESSOAS_AUDITORIA.FONTES` (`SERVIDORES`, `PLANILHA_DOCENTES`, `PLANILHA_ALUNOS`, primeira aba, linha 2 em diante, colunas por posição); cada cadastro só é aberto se ainda falta alguém; nome achado no cache por e-mail (1.11.1: `pessoaAud2:<e-mail>`, 600 s); "não cadastrado" nunca vai ao cache (1.11.1), e quem não foi achado com um cadastro em falha fica fora do mapa. E-mails comparados por `emailComparavel_` (sem maiúsculas, espaços, espaço não separável e caracteres invisíveis).

**Formato das edições** (arrays, para reduzir o tráfego): `[data, origem, e-mail, aba, célula, campo, código, disciplina, anterior, novo, tipo, células, observação, id do evento]`. **Disciplinas:** `[código, nome, tipo, modalidade, será oferecida, docente, semestre ideal, créditos, dia, início, fim]`.

**Navegador:** contagens por aba (G preenchida; H preenchida; K e L preenchidas), tabela da aba escolhida (com a última edição de secretaria por código), "Quem editou" (por e-mail; desde a 1.8.0, os gráficos de aberturas e edições), linha do tempo com busca sem acento e filtros (aba, pessoa, origem), 50 por vez, e a janela "Histórico" (todas as edições de um código; fecha só pelo botão, como as demais). No celular, as tabelas viram cartões com rótulos (`data-rotulo`).

**(1.8.0)** Ordem da seção: "Não serão oferecidas" (disciplinas com G = NÃO; selo "Aguardando Justificativa"; quem marcou = edição mais recente de "Será oferecida" com NÃO para o código) → Preenchimento → gráficos → Edições. **Gráficos** em HTML/CSS (sem biblioteca): barras horizontais de uma série na cor primária do tema (contraste ≥ 3:1 com o cartão, conferido no teste), ponta arredondada de 4 px, rótulo e valor em tokens de texto, 10 primeiras pessoas + "e mais N", lista ordenada (lida como texto por leitores de tela), `title` com o detalhe; em `forced-colors`, a barra usa `CanvasText`.

**Aberturas (1.8.0, `AuditoriaGrade.gs`):** segundo acionador instalável, `ScriptApp.newTrigger('registrarAberturaGrade').forSpreadsheet(<planilha das secretarias>).onOpen()`, instalado por `ativarAuditoriaGrade` (junto com o de edição; `auditoriaAtiva_` exige os dois). Aba "Aberturas" (Data e hora, Semestre, E-mail), criada na auditoria nova e, nas antigas, pela ativação ou na primeira abertura. O Google só dispara o acionador de abertura para quem pode editar e abre no navegador; e-mail só do mesmo domínio.

