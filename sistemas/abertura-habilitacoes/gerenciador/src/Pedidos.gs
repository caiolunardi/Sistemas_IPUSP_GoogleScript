/*=====================================================
  PEDIDOS — listas, detalhe, busca no histórico e relatórios

  Só leitura. Cada função pública confere o acesso antes de abrir a
  planilha de respostas e devolve só texto, número e booleano.
  Consultar nunca altera a planilha (na 1.0, abrir a página atribuía
  Registro ID e Versão sozinho; na 2.0 isso é operação expressa, ver
  Migracao.gs).
=====================================================*/

const LIMITE_CONCLUIDOS = 10;
const LIMITE_TERMO_BUSCA = 100;
const ROTULO_HISTORICO = "Histórico (2021-2022)";
const HABILITACOES_CONHECIDAS = ["Bacharelado em Psicologia", "Licenciatura em Psicologia"];
const ROTULO_OUTRA_HABILITACAO = "Outro / não identificado";

/*-----------------------------------------------------
  RESERVA DE ENVIO ("ENVIANDO…")
------------------------------------------------------*/

const PREFIXO_RESERVA = "ENVIANDO…";
// Reserva mais velha que isso conta como interrompida (uma execução
// do Apps Script não passa de 6 minutos).
const MINUTOS_RESERVA_ENVIO = 10;

function ehReserva_(valor) {
  return typeof valor === "string" && valor.indexOf(PREFIXO_RESERVA) === 0;
}

// Reserva = "ENVIANDO… aaaa-mm-dd hh:mm:ss" (Brasília). A da 1.0, sem
// data, conta como interrompida.
function reservaInterrompida_(valor) {
  const quando = String(valor || "").slice(PREFIXO_RESERVA.length).trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(quando)) return true;
  const limite = Utilities.formatDate(new Date(Date.now() - MINUTOS_RESERVA_ENVIO * 60 * 1000), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  return quando < limite;
}

function novaReserva_() {
  return PREFIXO_RESERVA + " " + Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

// Texto de "E-mail Enviado" para a página: a reserva nunca aparece
// como confirmação de envio.
function emailEnviadoParaPagina_(valor) {
  return ehReserva_(valor) ? "" : formatarDataParaExibicao_(valor);
}

/*-----------------------------------------------------
  LINHA → RESUMO DA LISTA
------------------------------------------------------*/

function resumoDaLinha_(tabela, linhaDados, numeroLinha, contagemIds) {
  const registroId = registroIdDaLinha_(tabela, linhaDados);
  const carimboBruto = celula_(linhaDados, colunaOpcional_(tabela, "carimbo"));
  const resumo = {
    registroId: "",
    versao: versaoDaLinha_(tabela, linhaDados),
    nome: textoSeguro_(celula_(linhaDados, colunaOpcional_(tabela, "nome"))),
    nUsp: textoSeguro_(celula_(linhaDados, colunaOpcional_(tabela, "nUsp"))),
    email: textoSeguro_(celula_(linhaDados, colunaOpcional_(tabela, "email"))),
    habilitacao: textoSeguro_(celula_(linhaDados, colunaOpcional_(tabela, "habilitacao"))),
    carimbo: formatarDataParaExibicao_(carimboBruto),
    observacoes: textoSeguro_(celula_(linhaDados, COL_OBSERVACOES_FIXA)),
    inconsistencia: ""
  };
  if (!registroId) {
    // Sem identificador: continua na lista (nunca some), sem ação até
    // ser preparado. A referência permite prepará-lo de forma expressa.
    resumo.inconsistencia = "SEM_IDENTIFICADOR";
    resumo.referencia = { linha: numeroLinha, carimbo: timestampSeguro_(carimboBruto), nUsp: resumo.nUsp };
  } else if (!FORMATO_REGISTRO_ID.test(registroId)) {
    resumo.inconsistencia = "IDENTIFICADOR_INVALIDO";
  } else if (contagemIds[registroId] > 1) {
    resumo.inconsistencia = "IDENTIFICADOR_REPETIDO";
  } else {
    resumo.registroId = registroId;
  }
  return resumo;
}

/*-----------------------------------------------------
  PENDENTES (aba atual)
------------------------------------------------------*/

function obterPendentes() {
  exigirLeitor_();
  const tabela = lerTabelaAtual_();
  exigirColunasDeLista_(tabela);
  const colNome = colunaOpcional_(tabela, "nome");
  const contagemIds = contarRegistroIds_(tabela);
  const pendentes = [];
  tabela.linhas.forEach((linhaDados, i) => {
    if (!celula_(linhaDados, colNome)) return;
    if (estaConcluido_(celula_(linhaDados, COL_SITUACAO_FIXA))) return;
    pendentes.push(resumoDaLinha_(tabela, linhaDados, i + 2, contagemIds));
  });
  pendentes.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  const semId = pendentes.filter(p => p.inconsistencia).length;
  if (semId) console.log(`obterPendentes: ${pendentes.length} pendentes, ${semId} sem identificador utilizável.`);
  return paraPagina_(pendentes, "pendentes");
}

/*-----------------------------------------------------
  DEZ CONCLUÍDOS MAIS RECENTES (aba atual)
  Ordem: Data de Conclusão; sem ela, o carimbo do pedido.
------------------------------------------------------*/

function obterConcluidosRecentes() {
  exigirLeitor_();
  const tabela = lerTabelaAtual_();
  exigirColunasDeLista_(tabela);
  const colNome = colunaOpcional_(tabela, "nome");
  const colCarimbo = colunaOpcional_(tabela, "carimbo");
  const colConclusao = colunaOpcional_(tabela, "dataConclusao");
  const colEmailEnviado = colunaOpcional_(tabela, "emailEnviado");
  const contagemIds = contarRegistroIds_(tabela);
  const concluidos = [];
  tabela.linhas.forEach((linhaDados, i) => {
    if (!celula_(linhaDados, colNome)) return;
    if (!estaConcluido_(celula_(linhaDados, COL_SITUACAO_FIXA))) return;
    const resumo = resumoDaLinha_(tabela, linhaDados, i + 2, contagemIds);
    delete resumo.referencia;
    const conclusaoBruta = celula_(linhaDados, colConclusao);
    const carimboBruto = celula_(linhaDados, colCarimbo);
    const emailBruto = celula_(linhaDados, colEmailEnviado);
    resumo.dataConclusao = formatarDataParaExibicao_(conclusaoBruta) || formatarDataParaExibicao_(carimboBruto);
    resumo.emailEnviado = emailEnviadoParaPagina_(emailBruto);
    resumo.envioReservado = ehReserva_(emailBruto);
    resumo.ordem_ = timestampSeguro_(conclusaoBruta) || timestampSeguro_(carimboBruto);
    concluidos.push(resumo);
  });
  concluidos.sort((a, b) => b.ordem_ - a.ordem_);
  const resultado = concluidos.slice(0, LIMITE_CONCLUIDOS);
  resultado.forEach(c => { delete c.ordem_; });
  console.log(`obterConcluidosRecentes: ${concluidos.length} concluídos, ${resultado.length} devolvidos.`);
  return paraPagina_(resultado, "concluídos");
}

/*-----------------------------------------------------
  DETALHE DE UM PEDIDO (aba atual, pelo Registro ID)
------------------------------------------------------*/

function detalheDaLinha_(tabela, linha) {
  const l = tabela.linhas[linha - 2];
  const situacao = celula_(l, COL_SITUACAO_FIXA);
  const emailBruto = celula_(l, colunaOpcional_(tabela, "emailEnviado"));
  return {
    registroId: registroIdDaLinha_(tabela, l),
    versao: versaoDaLinha_(tabela, l),
    nome: textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "nome"))),
    nUsp: textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "nUsp"))),
    email: textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "email"))),
    emailFormulario: textoSeguro_(celula_(l, colunaOpcional_(tabela, "emailFormulario"))),
    anoIngresso: textoSeguro_(celula_(l, colunaOpcional_(tabela, "anoIngresso"))),
    trancamento: textoSeguro_(celula_(l, colunaOpcional_(tabela, "trancamento"))),
    habilitacao: textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "habilitacao"))),
    carimbo: formatarDataParaExibicao_(celula_(l, colunaObrigatoria_(tabela, "carimbo"))),
    situacao: textoSeguro_(situacao),
    concluido: estaConcluido_(situacao),
    observacoes: textoSeguro_(celula_(l, COL_OBSERVACOES_FIXA)),
    dataConclusao: formatarDataParaExibicao_(celula_(l, colunaOpcional_(tabela, "dataConclusao"))),
    emailEnviado: emailEnviadoParaPagina_(emailBruto),
    envioReservado: ehReserva_(emailBruto),
    envioInterrompido: ehReserva_(emailBruto) && reservaInterrompida_(emailBruto)
  };
}

function obterDetalhe(registroId) {
  exigirLeitor_();
  validarFormatoRegistroId_(registroId);
  const tabela = lerTabelaAtual_();
  const linha = localizarLinhaPorId_(tabela, registroId);
  return paraPagina_(detalheDaLinha_(tabela, linha), "detalhe");
}

/*-----------------------------------------------------
  BUSCA NO HISTÓRICO — nome, Nº USP ou e-mail, nas duas
  abas (atual + 2021-2022). Sob demanda, a partir da área
  Concluídos.
------------------------------------------------------*/

// Colunas da aba antiga: primeiro o título exato da aba atual; se não
// houver, a busca por palavra-chave da versão 1.0.
function localizarColunaPorPalavraChave_(mapa, palavrasChave) {
  const titulos = Object.keys(mapa);
  for (let i = 0; i < titulos.length; i++) {
    const t = titulos[i].toLowerCase();
    if (palavrasChave.some(p => t.indexOf(p) !== -1)) return mapa[titulos[i]];
  }
  return null;
}

function colunasDaAbaAntiga_(tabela) {
  const exata = chave => tabela.mapa[CABECALHOS[chave]] || null;
  return {
    nome: exata("nome") || localizarColunaPorPalavraChave_(tabela.mapa, ["nome"]),
    nUsp: exata("nUsp") || localizarColunaPorPalavraChave_(tabela.mapa, ["usp"]),
    email: exata("email") || localizarColunaPorPalavraChave_(tabela.mapa, ["e-mail usp", "email usp"]) ||
           localizarColunaPorPalavraChave_(tabela.mapa, ["e-mail", "email"]),
    habilitacao: exata("habilitacao") || localizarColunaPorPalavraChave_(tabela.mapa, ["programa", "habilita"]),
    carimbo: exata("carimbo") || localizarColunaPorPalavraChave_(tabela.mapa, ["carimbo", "data"])
  };
}

function corresponde_(termo, valores) {
  return valores.some(v => normalizarBusca_(v).indexOf(termo) !== -1);
}

function buscarHistorico(termo) {
  exigirLeitor_();
  const termoLimpo = normalizarBusca_(String(termo || "").trim()).slice(0, LIMITE_TERMO_BUSCA);
  if (!termoLimpo) return [];
  if (termoLimpo.length < 2) throw erroGerenciador_("ENTRADA", "Digite ao menos 2 caracteres para buscar.");

  const resultados = [];

  const atual = lerTabelaAtual_();
  const colNome = colunaOpcional_(atual, "nome");
  if (colNome) {
    const contagemIds = contarRegistroIds_(atual);
    atual.linhas.forEach(l => {
      const nome = textoSeguro_(celula_(l, colNome));
      if (!nome) return;
      const nUsp = textoSeguro_(celula_(l, colunaOpcional_(atual, "nUsp")));
      const email = textoSeguro_(celula_(l, colunaOpcional_(atual, "email")));
      if (!corresponde_(termoLimpo, [nome, nUsp, email])) return;
      const situacao = celula_(l, COL_SITUACAO_FIXA);
      const carimboBruto = celula_(l, colunaOpcional_(atual, "carimbo"));
      const id = registroIdDaLinha_(atual, l);
      resultados.push({
        origem: "Atual",
        registroId: FORMATO_REGISTRO_ID.test(id) && contagemIds[id] === 1 ? id : "",
        nome: nome,
        nUsp: nUsp,
        email: email,
        habilitacao: textoSeguro_(celula_(l, colunaOpcional_(atual, "habilitacao"))),
        carimbo: formatarDataParaExibicao_(carimboBruto),
        situacao: estaConcluido_(situacao) ? "Concluído" : (String(situacao || "").trim() || "Pendente"),
        ordem_: timestampSeguro_(carimboBruto)
      });
    });
  }

  const abaAntiga = abaAntiga_();
  if (abaAntiga) {
    const antiga = lerTabela_(abaAntiga);
    const cols = colunasDaAbaAntiga_(antiga);
    if (cols.nome) {
      antiga.linhas.forEach(l => {
        const nome = textoSeguro_(celula_(l, cols.nome));
        if (!nome) return;
        const nUsp = textoSeguro_(celula_(l, cols.nUsp));
        const email = textoSeguro_(celula_(l, cols.email));
        if (!corresponde_(termoLimpo, [nome, nUsp, email])) return;
        const carimboBruto = celula_(l, cols.carimbo);
        resultados.push({
          origem: ROTULO_HISTORICO,
          registroId: "",
          nome: nome,
          nUsp: nUsp,
          email: email,
          habilitacao: textoSeguro_(celula_(l, cols.habilitacao)),
          carimbo: formatarDataParaExibicao_(carimboBruto),
          situacao: "Concluído",
          ordem_: timestampSeguro_(carimboBruto)
        });
      });
    }
  }

  resultados.sort((a, b) => b.ordem_ - a.ordem_);
  resultados.forEach(r => { delete r.ordem_; });
  console.log(`buscarHistorico: ${resultados.length} resultado(s).`);
  return paraPagina_(resultados, "busca no histórico");
}

/*-----------------------------------------------------
  RELATÓRIOS — mesmos critérios da versão 1.0
  - conta toda linha com nome, das duas abas;
  - cada habilitação conhecida marcada conta separadamente
    (um pedido com as duas soma 1 em cada);
  - texto que não contém nenhuma conhecida vai para
    "Outro / não identificado"; vazio não conta;
  - ano e mês pelo carimbo (Date ou texto dd/mm/aaaa).
------------------------------------------------------*/

function contarLinhasParaRelatorio_(tabela, colCarimbo, colHabilitacao, colNome, acc) {
  if (!colNome) return 0;
  let contadas = 0;
  tabela.linhas.forEach(l => {
    if (!celula_(l, colNome)) return;
    acc.total++;
    contadas++;
    const habilitacaoTexto = colHabilitacao ? String(celula_(l, colHabilitacao) || "") : "";
    HABILITACOES_CONHECIDAS.forEach(hab => {
      if (habilitacaoTexto.indexOf(hab) !== -1) acc.porHabilitacao[hab] = (acc.porHabilitacao[hab] || 0) + 1;
    });
    if (habilitacaoTexto && !HABILITACOES_CONHECIDAS.some(hab => habilitacaoTexto.indexOf(hab) !== -1)) {
      acc.porHabilitacao[ROTULO_OUTRA_HABILITACAO] = (acc.porHabilitacao[ROTULO_OUTRA_HABILITACAO] || 0) + 1;
    }
    const anoMes = extrairAnoMes_(colCarimbo ? celula_(l, colCarimbo) : null);
    if (anoMes) {
      acc.porAno[anoMes.ano] = (acc.porAno[anoMes.ano] || 0) + 1;
      acc.porMes[anoMes.anoMes] = (acc.porMes[anoMes.anoMes] || 0) + 1;
    } else {
      acc.semData++;
    }
  });
  return contadas;
}

function obterRelatorio() {
  exigirLeitor_();
  const acc = { total: 0, porHabilitacao: {}, porAno: {}, porMes: {}, semData: 0 };

  const atual = lerTabelaAtual_();
  const totalAtual = contarLinhasParaRelatorio_(atual,
    colunaOpcional_(atual, "carimbo"), colunaOpcional_(atual, "habilitacao"), colunaOpcional_(atual, "nome"), acc);

  let totalHistorico = null;
  const abaAntiga = abaAntiga_();
  if (abaAntiga) {
    const antiga = lerTabela_(abaAntiga);
    // Mesma localização por palavra-chave da versão 1.0 (os relatórios
    // não usam o título exato, para não mudar as contagens).
    totalHistorico = contarLinhasParaRelatorio_(antiga,
      localizarColunaPorPalavraChave_(antiga.mapa, ["carimbo", "data"]),
      localizarColunaPorPalavraChave_(antiga.mapa, ["programa", "habilita"]),
      localizarColunaPorPalavraChave_(antiga.mapa, ["nome"]), acc);
  }

  const lista = (obj, ordenar) => ordenar(Object.keys(obj)).map(chave => ({ chave: chave, quantidade: obj[chave] }));
  return paraPagina_({
    total: acc.total,
    porHabilitacao: lista(acc.porHabilitacao, k => k.sort((a, b) => acc.porHabilitacao[b] - acc.porHabilitacao[a])),
    porAno: lista(acc.porAno, k => k.sort().reverse()),
    porMes: lista(acc.porMes, k => k.sort().reverse()),
    semData: acc.semData,
    fontes: { atual: totalAtual, historico: totalHistorico }
  }, "relatório");
}
