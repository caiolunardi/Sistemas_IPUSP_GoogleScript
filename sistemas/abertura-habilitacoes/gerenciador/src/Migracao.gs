/*=====================================================
  MIGRAÇÃO CONTROLADA E RECUPERAÇÃO DE REGISTRO ID / VERSÃO

  Na versão 1.0, todo doGet() atribuía Registro ID e Versão às linhas
  que não tinham (e trocava IDs repetidos) sem ninguém pedir. Na 2.0,
  abrir a página não altera nada. A preparação em lote é feita só por
  quem administra, no editor do Apps Script, em três passos:

    1. diagnosticarMigracaoRegistroId()  — só leitura: quantas linhas
       precisam de ID, quantas têm ID repetido, quantas não têm Versão,
       quantas têm Versão malformada, se faltam colunas, e um CÓDIGO DE
       CONFIRMAÇÃO (ex.: MIGRAR-3-1-3-0-9f2c4a7e01b85d36). Nenhuma
       célula é escrita.
    2. o responsável cria a propriedade do script
       MIGRACAO_REGISTRO_ID_CONFIRMACAO com esse código, depois da
       cópia de segurança (docs: MANUAL_OPERACAO, seção Migração).
    3. executarMigracaoRegistroId()      — refaz o plano dentro da
       trava e só grava se o código for o MESMO. Grava só as células
       do plano (ID novo ou Versão 1), em blocos de linhas seguidas,
       e os títulos que faltarem no fim da linha 1; as demais células
       não são tocadas. Apaga a propriedade ao terminar. Rodar de novo
       não muda nada (idempotente). Falha no meio = GRAVACAO_PARCIAL,
       nunca sucesso.

  O código identifica o PLANO, não só as quantidades: o sufixo é uma
  impressão digital (SHA-256, 16 primeiros dígitos hexadecimais) da
  aba, das posições das colunas, da última linha e, para cada linha
  com Nome, da posição, das células de identificação (Nome, Nº USP,
  carimbo), do Registro ID e da Versão como estão e das operações
  previstas. Trocar linhas de lugar, substituir uma linha por outra,
  editar um ID ou uma Versão, ou chegar um pedido novo muda o código,
  mesmo com as mesmas contagens. Só a impressão digital sai daqui;
  os valores das células nunca vão para o registro de execução.

  Regras da 1.0 mantidas: só linhas com Nome; ID vazio recebe UUID;
  ID repetido mantém a PRIMEIRA ocorrência e as seguintes recebem
  UUID novo. Diferença da 2.0 (contrato único de Versão, Planilha.gs):
  só Versão VAZIA recebe 1; Versão malformada (0, negativa, fração,
  texto…) é informada e fica como está, assim como ID fora do formato.
  Esses casos são resolvidos um a um pela recuperação abaixo.

  RECUPERAÇÃO DE UM PEDIDO (ID fora do formato, ID repetido, Versão
  vazia ou malformada), também só no editor, em três passos:

    1. o responsável cria a propriedade RECUPERACAO_REGISTRO com o
       número da linha (ex.: 12) e roda diagnosticarRecuperacaoRegistro()
       — só leitura: problemas da linha, linhas com o mesmo ID, ações
       previstas e um código RECUPERAR-<linha>-<impressão digital>;
    2. depois de conferir a linha na planilha e anotar a decisão
       (MANUAL_OPERACAO), troca o valor da propriedade por esse código;
    3. executarRecuperacaoRegistro() refaz o plano dentro da trava, só
       grava se o código for o mesmo e altera só aquela linha: ID novo
       (quando o atual está fora do formato ou repetido) e/ou Versão 1
       (quando a atual está vazia ou malformada). As outras linhas do
       mesmo ID mantêm o ID. Apaga a propriedade ao terminar.

  A aba "2021 - 2022" nunca é lida nem escrita aqui. Os registros de
  execução mostram números de linha, contagens, ações e códigos, nunca
  nomes, Nº USP, e-mails ou o conteúdo das células.
=====================================================*/

const PROP_CONFIRMACAO_MIGRACAO = "MIGRACAO_REGISTRO_ID_CONFIRMACAO";
const PROP_RECUPERACAO_REGISTRO = "RECUPERACAO_REGISTRO";

/*-----------------------------------------------------
  IMPRESSÃO DIGITAL DO PLANO
------------------------------------------------------*/

// Texto estável de uma célula: tipo + valor (o número 3 e o texto "3"
// são diferentes; datas pelo instante).
function valorCanonico_(valor) {
  if (valor instanceof Date) return "D" + (isNaN(valor.getTime()) ? "invalida" : valor.getTime());
  if (valor === null || valor === undefined) return "";
  return (typeof valor).charAt(0) + String(valor);
}

function impressaoDigital_(estrutura) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(estrutura), Utilities.Charset.UTF_8);
  let hex = "";
  for (let i = 0; i < 8; i++) hex += ("0" + ((bytes[i] + 256) % 256).toString(16)).slice(-2);
  return hex;
}

function identificacaoDaLinha_(tabela, linhaDados) {
  return ["nome", "nUsp", "carimbo"].map(chave => valorCanonico_(celula_(linhaDados, colunaOpcional_(tabela, chave))));
}

/*-----------------------------------------------------
  MIGRAÇÃO EM LOTE
------------------------------------------------------*/

function planejarMigracao_(tabela) {
  const colNome = colunaOpcional_(tabela, "nome");
  const colId = colunaOpcional_(tabela, "registroId");
  const colVersao = colunaOpcional_(tabela, "versao");
  const plano = {
    colunasFaltando: [colId ? null : CABECALHOS.registroId, colVersao ? null : CABECALHOS.versao].filter(Boolean),
    semId: [], repetidos: [], idInvalido: [], versaoAusente: [], versaoMalformada: [],
    operacoes: [], linhasComNome: 0, ultimaLinha: tabela.ultimaLinha
  };
  if (!colNome) throw erroGerenciador_("ESTRUTURA", `Não encontrei a coluna "${CABECALHOS.nome}"; a migração não pode decidir quais linhas são pedidos.`);
  const vistos = Object.create(null);
  const linhas = [];
  tabela.linhas.forEach((l, i) => {
    if (!celula_(l, colNome)) return;
    plano.linhasComNome++;
    const n = i + 2;
    const ops = [];
    const idBruto = colId ? celula_(l, colId) : "";
    const id = String(idBruto || "").trim();
    if (!id) { plano.semId.push(n); ops.push("NOVO_ID"); }
    else if (vistos[id]) { plano.repetidos.push(n); ops.push("NOVO_ID"); }
    else {
      vistos[id] = true;
      if (!FORMATO_REGISTRO_ID.test(id)) plano.idInvalido.push(n);
    }
    const versaoBruta = colVersao ? celula_(l, colVersao) : "";
    const estado = estadoDaVersao_(versaoBruta);
    if (estado === "AUSENTE") { plano.versaoAusente.push(n); ops.push("VERSAO_1"); }
    else if (estado === "MALFORMADA") plano.versaoMalformada.push(n);
    if (ops.length) plano.operacoes.push({ linha: n, ops: ops });
    linhas.push([n].concat(identificacaoDaLinha_(tabela, l), [valorCanonico_(idBruto), valorCanonico_(versaoBruta), ops.join("+")]));
  });
  const nada = !plano.colunasFaltando.length && !plano.operacoes.length;
  plano.codigo = nada ? "" : ["MIGRAR", plano.semId.length, plano.repetidos.length, plano.versaoAusente.length,
    plano.colunasFaltando.length, impressaoDigital_({
      tipo: "migracao", aba: tabela.nome, ultimaLinha: tabela.ultimaLinha, ultimaColuna: tabela.ultimaColuna,
      colunas: ["nome", "nUsp", "carimbo", "registroId", "versao"].map(c => colunaOpcional_(tabela, c)),
      colunasFaltando: plano.colunasFaltando, linhas: linhas
    })].join("-");
  return plano;
}

function resumoDoPlano_(plano) {
  return {
    precisaMigrar: !!plano.codigo,
    codigoConfirmacao: plano.codigo,
    linhasComNome: plano.linhasComNome,
    linhasQueSeraoAlteradas: plano.operacoes.length,
    colunasFaltando: plano.colunasFaltando,
    semIdentificador: plano.semId.length,
    identificadoresRepetidos: plano.repetidos.length,
    versaoAusente: plano.versaoAusente.length,
    // Não são alterados pela migração: só informados, para a
    // recuperação um a um (a 1.0 não trocava ID fora do formato e
    // punha 1 em Versão 0 ou de texto sem avisar).
    versaoMalformada: plano.versaoMalformada.length,
    identificadoresForaDoFormato: plano.idInvalido.length,
    linhas: {
      semIdentificador: plano.semId.slice(0, 50),
      identificadoresRepetidos: plano.repetidos.slice(0, 50),
      versaoAusente: plano.versaoAusente.slice(0, 50),
      versaoMalformada: plano.versaoMalformada.slice(0, 50),
      identificadoresForaDoFormato: plano.idInvalido.slice(0, 50)
    }
  };
}

/** Passo 1 (editor): simulação, sem escrever nada. */
function diagnosticarMigracaoRegistroId() {
  exigirAdministrador_();
  const resumo = resumoDoPlano_(planejarMigracao_(lerTabelaAtual_()));
  console.log("Simulação da migração (nada foi gravado): " + JSON.stringify(resumo));
  if (resumo.precisaMigrar) {
    console.log("Para executar: crie a propriedade " + PROP_CONFIRMACAO_MIGRACAO + " = " + resumo.codigoConfirmacao +
      " e rode executarMigracaoRegistroId. Faça antes a cópia de segurança da planilha.");
  }
  if (resumo.versaoMalformada || resumo.identificadoresForaDoFormato) {
    console.log("Há linhas que a migração não altera (versão malformada ou ID fora do formato): use a recuperação um a um " +
      "(diagnosticarRecuperacaoRegistro), conforme o manual.");
  }
  registrarManutencaoHabilitacoes_("diagnosticarMigracaoRegistroId", resumo);
  return paraPagina_(resumo, "simulação da migração");
}

/** Passo 3 (editor): execução, só com a confirmação igual ao plano atual. */
// Pública em AuditoriaHabilitacoes.gs (executarMigracaoRegistroId).
function executarMigracaoRegistroIdSemAuditoria_() {
  const props = PropertiesService.getScriptProperties();
  const confirmacao = String(props.getProperty(PROP_CONFIRMACAO_MIGRACAO) || "").trim();

  const lock = travar_(30000);
  try {
    const tabela = lerTabelaAtual_();
    const plano = planejarMigracao_(tabela);
    if (!plano.codigo) {
      if (confirmacao) props.deleteProperty(PROP_CONFIRMACAO_MIGRACAO);
      console.log("Migração: nada a fazer.");
      return paraPagina_({ executada: false, motivo: "NADA_A_FAZER", resumo: resumoDoPlano_(plano) }, "migração");
    }
    if (confirmacao !== plano.codigo) {
      throw erroGerenciador_("CONFIRMACAO_MIGRACAO",
        `A confirmação não corresponde ao plano atual (${plano.codigo}): a planilha mudou depois do diagnóstico ou o código foi copiado errado. ` +
        `Rode diagnosticarMigracaoRegistroId de novo, confira o resultado e ponha o novo código na propriedade ${PROP_CONFIRMACAO_MIGRACAO}. Nada foi gravado.`);
    }

    if (tabela.nome !== ABA_ATUAL) throw erroGerenciador_("ESTRUTURA", "Gravação recusada: só a aba atual pode ser alterada por este sistema.");
    const gravacao = { titulos: 0, blocos: 0, celulas: 0 };
    try {
      const faltavam = plano.colunasFaltando.length;
      const colId = obterOuCriarColuna_(tabela, "registroId");
      const colVersao = obterOuCriarColuna_(tabela, "versao");
      gravacao.titulos = faltavam;
      const existentes = idsDaColuna_(tabela, colId);
      const novosIds = {}, versoes1 = [];
      plano.operacoes.forEach(o => {
        if (o.ops.indexOf("NOVO_ID") !== -1) {
          let id;
          do { id = Utilities.getUuid(); } while (existentes[id]);
          existentes[id] = true;
          novosIds[o.linha] = id;
        }
        if (o.ops.indexOf("VERSAO_1") !== -1) versoes1.push(o.linha);
      });
      // Só as células do plano: linhas seguidas viram um bloco (um
      // setValues por bloco e por coluna); nenhuma célula fora do plano
      // é regravada, então fórmulas, tipos e valores das outras linhas
      // ficam como estão.
      const gravarBlocos = (coluna, linhas, valorDe) => {
        blocosDeLinhas_(linhas).forEach(bloco => {
          tabela.aba.getRange(bloco[0], coluna, bloco.length, 1).setValues(bloco.map(n => [valorDe(n)]));
          gravacao.blocos++;
          gravacao.celulas += bloco.length;
        });
      };
      gravarBlocos(colId, Object.keys(novosIds).map(Number), n => novosIds[n]);
      gravarBlocos(colVersao, versoes1, () => 1);
      SpreadsheetApp.flush();
    } catch (erro) {
      // Parte pode ter sido gravada: nunca relatar sucesso. A confirmação
      // fica (já não confere com a planilha) e o diagnóstico mostra o
      // que falta; rodar de novo completa só o que ficou para trás.
      console.error("Migração interrompida depois de " + gravacao.titulos + " título(s), " + gravacao.blocos + " bloco(s) e " +
        gravacao.celulas + " célula(s): " + textoParaLog_(erro && erro.message));
      throw erroGerenciador_("GRAVACAO_PARCIAL",
        "A migração parou no meio e parte das células pode ter sido gravada. Nada foi dado como concluído. " +
        "Confira pelo histórico de versões, rode diagnosticarMigracaoRegistroId de novo e repita a confirmação com o novo código.");
    }
    props.deleteProperty(PROP_CONFIRMACAO_MIGRACAO);
    const resumo = resumoDoPlano_(plano);
    resumo.gravacao = gravacao;
    console.log("Migração executada: " + JSON.stringify(resumo));
    return paraPagina_({ executada: true, resumo: resumo }, "migração");
  } finally {
    lock.releaseLock();
  }
}

// [2,3,4,7,9,10] → [[2,3,4],[7],[9,10]]
function blocosDeLinhas_(linhas) {
  const blocos = [];
  linhas.slice().sort((x, y) => x - y).forEach(n => {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo[ultimo.length - 1] === n - 1) ultimo.push(n);
    else blocos.push([n]);
  });
  return blocos;
}

/*-----------------------------------------------------
  RECUPERAÇÃO DE UM PEDIDO (decisão humana, uma linha)
------------------------------------------------------*/

function planejarRecuperacao_(tabela, linha) {
  const colNome = colunaObrigatoria_(tabela, "nome");
  const colId = colunaOpcional_(tabela, "registroId");
  const colVersao = colunaOpcional_(tabela, "versao");
  if (!colId || !colVersao) {
    throw erroGerenciador_("MIGRACAO_NECESSARIA",
      "A planilha ainda não tem as colunas \"Registro ID\" e \"Versão\". Rode antes a migração controlada.");
  }
  if (!Number.isInteger(linha) || linha < 2 || linha > tabela.ultimaLinha) {
    throw erroGerenciador_("ENTRADA", `Linha inválida para a recuperação. Use o número de uma linha da aba "${ABA_ATUAL}" (2 a ${tabela.ultimaLinha}).`);
  }
  const l = tabela.linhas[linha - 2];
  if (!celula_(l, colNome)) throw erroGerenciador_("ENTRADA", `A linha ${linha} não tem Nome: não é um pedido. Nada foi alterado.`);

  const id = String(celula_(l, colId) || "").trim();
  const mesmoId = [];
  if (id) {
    tabela.linhas.forEach((x, i) => {
      if (i + 2 !== linha && celula_(x, colNome) && String(celula_(x, colId) || "").trim() === id) mesmoId.push(i + 2);
    });
  }
  const estadoVersao = estadoDaVersao_(celula_(l, colVersao));
  const problemas = [];
  if (!id) problemas.push("SEM_IDENTIFICADOR");
  else if (!FORMATO_REGISTRO_ID.test(id)) problemas.push("IDENTIFICADOR_FORA_DO_FORMATO");
  if (mesmoId.length) problemas.push("IDENTIFICADOR_REPETIDO");
  if (estadoVersao === "AUSENTE") problemas.push("VERSAO_AUSENTE");
  if (estadoVersao === "MALFORMADA") problemas.push("VERSAO_MALFORMADA");

  const acoes = [];
  if (!id || !FORMATO_REGISTRO_ID.test(id) || mesmoId.length) acoes.push("NOVO_ID");
  if (estadoVersao !== "VALIDA") acoes.push("VERSAO_1");

  // A linha inteira e as outras linhas do mesmo ID entram na impressão
  // digital: se qualquer uma mudar, o código deixa de valer.
  const codigo = acoes.length ? ["RECUPERAR", linha, impressaoDigital_({
    tipo: "recuperacao", aba: tabela.nome, linha: linha,
    colunas: ["nome", "nUsp", "carimbo", "registroId", "versao"].map(c => colunaOpcional_(tabela, c)),
    celulas: l.map(valorCanonico_),
    mesmoId: mesmoId.map(n => [n].concat(identificacaoDaLinha_(tabela, tabela.linhas[n - 2]),
      [valorCanonico_(celula_(tabela.linhas[n - 2], colId)), valorCanonico_(celula_(tabela.linhas[n - 2], colVersao))])),
    acoes: acoes
  })].join("-") : "";

  return { linha: linha, problemas: problemas, acoes: acoes, linhasComOMesmoIdentificador: mesmoId.slice(0, 50), codigo: codigo,
    colId: colId, colVersao: colVersao };
}

function resumoDaRecuperacao_(plano) {
  return {
    linha: plano.linha,
    problemas: plano.problemas,
    acoes: plano.acoes,
    linhasComOMesmoIdentificador: plano.linhasComOMesmoIdentificador,
    codigoConfirmacao: plano.codigo
  };
}

// "12" ou "RECUPERAR-12-…" → 12 (para poder diagnosticar de novo sem
// trocar a propriedade).
function linhaDaPropriedadeDeRecuperacao_(valor) {
  const m = String(valor || "").trim().match(/^(?:RECUPERAR-)?(\d{1,7})(?:-[0-9a-f]{16})?$/);
  if (!m) {
    throw erroGerenciador_("ENTRADA",
      `Crie a propriedade ${PROP_RECUPERACAO_REGISTRO} com o número da linha a recuperar (ex.: 12) e rode de novo. Nada foi gravado.`);
  }
  return Number(m[1]);
}

/** Passo 1 (editor): diagnóstico de UMA linha, sem escrever nada. */
function diagnosticarRecuperacaoRegistro() {
  exigirAdministrador_();
  const valor = PropertiesService.getScriptProperties().getProperty(PROP_RECUPERACAO_REGISTRO);
  const linha = linhaDaPropriedadeDeRecuperacao_(valor);
  const resumo = resumoDaRecuperacao_(planejarRecuperacao_(lerTabelaAtual_(), linha));
  console.log("Diagnóstico da recuperação (nada foi gravado): " + JSON.stringify(resumo));
  if (resumo.codigoConfirmacao) {
    console.log("Para executar: confira a linha na planilha, registre a decisão e troque o valor de " + PROP_RECUPERACAO_REGISTRO +
      " por " + resumo.codigoConfirmacao + "; depois rode executarRecuperacaoRegistro.");
  }
  registrarManutencaoHabilitacoes_("diagnosticarRecuperacaoRegistro", resumo);
  return paraPagina_(resumo, "diagnóstico da recuperação");
}

/** Passo 3 (editor): altera só a linha diagnosticada, se nada mudou. */
// Pública em AuditoriaHabilitacoes.gs (executarRecuperacaoRegistro).
function executarRecuperacaoRegistroSemAuditoria_() {
  const props = PropertiesService.getScriptProperties();
  const confirmacao = String(props.getProperty(PROP_RECUPERACAO_REGISTRO) || "").trim();
  const m = confirmacao.match(/^RECUPERAR-(\d{1,7})-[0-9a-f]{16}$/);
  if (!m) {
    throw erroGerenciador_("CONFIRMACAO_RECUPERACAO",
      `A propriedade ${PROP_RECUPERACAO_REGISTRO} precisa ter o código dado por diagnosticarRecuperacaoRegistro (RECUPERAR-…). Nada foi gravado.`);
  }

  const lock = travar_(15000);
  try {
    const tabela = lerTabelaAtual_();
    const plano = planejarRecuperacao_(tabela, Number(m[1]));
    if (!plano.codigo) {
      props.deleteProperty(PROP_RECUPERACAO_REGISTRO);
      console.log(`Recuperação da linha ${plano.linha}: nada a fazer.`);
      return paraPagina_({ executada: false, motivo: "NADA_A_FAZER", resumo: resumoDaRecuperacao_(plano) }, "recuperação");
    }
    if (confirmacao !== plano.codigo) {
      throw erroGerenciador_("CONFIRMACAO_RECUPERACAO",
        `A confirmação não corresponde à linha ${plano.linha} como está agora: a planilha mudou depois do diagnóstico ou o código foi copiado errado. ` +
        "Rode diagnosticarRecuperacaoRegistro de novo e confira. Nada foi gravado.");
    }
    let novoId = "";
    if (plano.acoes.indexOf("NOVO_ID") !== -1) {
      const existentes = idsDaColuna_(tabela, plano.colId);
      do { novoId = Utilities.getUuid(); } while (existentes[novoId]);
      gravarCelula_(tabela, plano.linha, plano.colId, novoId);
    }
    if (plano.acoes.indexOf("VERSAO_1") !== -1) gravarCelula_(tabela, plano.linha, plano.colVersao, 1);
    SpreadsheetApp.flush();
    props.deleteProperty(PROP_RECUPERACAO_REGISTRO);
    const resumo = resumoDaRecuperacao_(plano);
    console.log("Recuperação executada: " + JSON.stringify(resumo));
    return paraPagina_({ executada: true, resumo: resumo, novoRegistroId: novoId }, "recuperação");
  } finally {
    lock.releaseLock();
  }
}
