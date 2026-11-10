/*=====================================================
  PEDIDOS — recebimento, protocolo, idempotência, correção

  Ordem de gravação (plano, seção 6):
    1. Conferir tudo sem gravar nada: sessão, campos,
       documentos (conteúdo, tamanho, quantidade).
    2. Sob o ScriptLock: procurar a chave de envio. Se já
       existe (mesma conta), retomar o que faltou, sem conferir
       o prazo de novo e mantendo a hora original.
    3. Envio novo: conferir o prazo UMA vez, com o "Recebido
       em" (relógio do servidor no início do processamento);
       gravar PROTOCOLOS (RECEBENDO, Registro ID já gerado) e
       VERSOES; ou, se a pessoa já tem pedido nesta colação,
       uma versão nova (correção, decisão D3).
    4. Cada documento: sob o lock, se a chave do documento
       ainda não está em DOCUMENTOS, criar o arquivo na
       subpasta do protocolo e registrar.
    5. Sob o lock: conferir que todos os documentos da versão
       estão registrados, marcar RECEBIDO, flush e reler. Só
       então a página recebe o protocolo (requisito 2).
    6. Recibo por e-mail. Falha no e-mail não desfaz nada
       (D9): fica em EVENTOS e o aluno reenvia em "Meus
       pedidos".

  Estados separados (requisito 5): Recebimento (este
  projeto), Cadastro (CONFIRMADO/PENDENTE na entrada; depois
  as decisões do Gerenciador de Pessoas), Encaminhamento (do
  Gerenciador de Diplomas). O formulário nunca diz "deferido".
=====================================================*/

const SIM_NAO_COLACAO = { "SIM": "SIM", "NÃO": "NÃO", "NAO": "NÃO" };
const HABILITACOES_COLACAO = ["Formação de Psicólogo(a)", "Bacharelado", "Licenciatura"];

function simNaoColacao_(valor, rotulo) {
  const v = SIM_NAO_COLACAO[String(valor || "").trim().toUpperCase()];
  if (!v) throw erroColacao_("CAMPO_INVALIDO", `Responda "${rotulo}" com Sim ou Não.`);
  return v;
}

/** Campos do pedido, conferidos no servidor. Não olha os documentos. */
function validarCamposColacao_(dados) {
  if (!dados || typeof dados !== "object") throw erroColacao_("CAMPO_INVALIDO", "Pedido vazio. Recarregue a página.");
  const invalido = msg => erroColacao_("CAMPO_INVALIDO", msg);
  const c = {
    nome: textoSeguroColacao_(dados.nome, 200).replace(/\s+/g, " "),
    nUsp: apenasDigitosNUsp_(dados.nUsp).slice(0, 15),
    anoIngresso: String(dados.anoIngresso || "").trim(),
    rg: textoSeguroColacao_(dados.rg, 30),
    telefone: textoSeguroColacao_(dados.telefone, 20),
    emailAlternativo: textoSeguroColacao_(normalizarEmailColacao_(dados.emailAlternativo), 200),
    bachConcluiu: dados.bachConcluiu === true,
    licConcluiu: dados.licConcluiu === true,
    psiConcluiu: dados.psiConcluiu === true,
    divergenciaApontada: textoSeguroColacao_(dados.divergenciaApontada, 1000),
    observacoesAluno: textoSeguroColacao_(dados.observacoesAluno, 2000)
  };
  if (c.anoIngresso && !/^\d{4}$/.test(c.anoIngresso)) throw invalido("Ano de ingresso inválido: use 4 dígitos (ex.: 2022).");
  if (c.anoIngresso) {
    const ano = Number(c.anoIngresso);
    if (ano < 1950 || ano > new Date().getFullYear() + 1) throw invalido("Ano de ingresso fora do intervalo esperado.");
  }
  if (!c.rg) throw invalido("Informe o número do RG/CIN.");
  const digitosTelefone = c.telefone.replace(/\D/g, "");
  if (digitosTelefone.length < 10 || digitosTelefone.length > 13) throw invalido("Informe o telefone celular com DDD (ex.: 11999999999).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.emailAlternativo)) throw invalido("Informe um e-mail alternativo válido.");
  if (!c.bachConcluiu && !c.licConcluiu && !c.psiConcluiu) throw invalido('Selecione ao menos uma habilitação em "Curso concluído".');
  c.permaneceMatriculado = simNaoColacao_(dados.permaneceMatriculado, "permanecerá matriculado");
  const pendentes = Array.isArray(dados.habilitacaoPendente) ? dados.habilitacaoPendente.map(String) : [];
  const concluida = { "Formação de Psicólogo(a)": c.psiConcluiu, "Bacharelado": c.bachConcluiu, "Licenciatura": c.licConcluiu };
  pendentes.forEach(h => {
    if (HABILITACOES_COLACAO.indexOf(h) === -1) throw invalido("Habilitação pendente não reconhecida.");
    if (concluida[h]) throw invalido(`"${h}" não pode aparecer como pendente e como concluída ao mesmo tempo.`);
  });
  c.habilitacaoPendente = HABILITACOES_COLACAO.filter(h => pendentes.indexOf(h) !== -1);
  c.procuracao = simNaoColacao_(dados.procuracao, "colação por procuração");
  c.procuradorNome = "";
  c.procuradorRg = "";
  if (c.procuracao === "SIM") {
    c.procuradorNome = textoSeguroColacao_(dados.procuradorNome, 200);
    c.procuradorRg = textoSeguroColacao_(dados.procuradorRg, 30);
    if (!c.procuradorNome || !c.procuradorRg) throw invalido("Informe o nome e o RG/CIN do(a) procurador(a).");
  }
  c.colacaoAntecipada = simNaoColacao_(dados.colacaoAntecipada, "colação antecipada");
  return c;
}

function chaveEnvioValidaColacao_(chave) {
  const texto = String(chave || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(texto)) {
    throw erroColacao_("CHAVE_INVALIDA", "Envio não reconhecido. Recarregue a página e tente de novo.");
  }
  return texto;
}

/*----------------------------------------------------
  Pedidos da pessoa: pelo e-mail da sessão ou, para
  identidade CONFIRMADA, pelo nº USP de protocolos que
  também entraram como CONFIRMADO. Um protocolo PENDENTE
  com o nº USP de outra pessoa nunca aparece para ela.
----------------------------------------------------*/

function pedidosDaPessoaColacao_(tabelas, email, identidade) {
  return lerLinhasColacao_(tabelas.PROTOCOLOS).filter(p =>
    normalizarEmailColacao_(valorColacao_(p, "E-mail da sessão")) === email ||
    (identidade.situacao === "CONFIRMADO" && textoColacao_(p, "Cadastro") === "CONFIRMADO" &&
      apenasDigitosNUsp_(valorColacao_(p, "Nº USP informado")) === identidade.nUsp));
}

function versoesDoProtocoloColacao_(tabelas, protocoloId) {
  return lerLinhasColacao_(tabelas.VERSOES)
    .filter(v => textoColacao_(v, "Protocolo ID") === protocoloId)
    .sort((a, b) => Number(valorColacao_(a, "Versão")) - Number(valorColacao_(b, "Versão")));
}

function protocoloAtivoColacao_(tabelas, pedidos, codigoColacao) {
  const decisoes = ultimoPorProtocoloColacao_(tabelas.DECISOES_CADASTRO, "Decisão");
  return pedidos.filter(p => textoColacao_(p, "Colação") === codigoColacao &&
    decisoes[textoColacao_(p, "Protocolo ID")] !== "REJEITADO")[0] || null;
}

function proximoProtocoloColacao_(tabelas, codigoColacao) {
  let maior = 0;
  const padrao = new RegExp("^PCG-" + codigoColacao + "-(\\d{5})$");
  lerLinhasColacao_(tabelas.PROTOCOLOS).forEach(p => {
    const m = textoColacao_(p, "Protocolo").match(padrao);
    if (m) maior = Math.max(maior, Number(m[1]));
  });
  return "PCG-" + codigoColacao + "-" + String(maior + 1).padStart(5, "0");
}

/**
 * Regra D3: a correção pelo aluno vale enquanto "Status — Dados
 * Pessoais" estiver vazio na aba Diplomas (linha do Registro ID do
 * protocolo). Sem linha ainda (pedido não encaminhado), vale. Mais de
 * uma linha com o mesmo Registro ID: não vale (a equipe resolve).
 */
function correcaoPermitidaPelaEquipeColacao_(registroId) {
  const aba = SpreadsheetApp.openById(obterIdColacao_(COLACAO.CHAVES.DIPLOMAS, "spreadsheet")).getSheetByName(COLACAO.ABA_DIPLOMAS);
  if (!aba) throw new Error("Aba Diplomas não encontrada.");
  const tabela = mapearTabelaColacao_(aba, ["Registro ID", "Status — Dados Pessoais"], COLACAO.ABA_DIPLOMAS);
  const linhas = lerLinhasColacao_(tabela).filter(l => textoColacao_(l, "Registro ID") === registroId);
  if (linhas.length === 0) return true;
  if (linhas.length > 1) return false;
  return textoColacao_(linhas[0], "Status — Dados Pessoais") === "";
}

function comTravaColacao_(funcao) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(COLACAO.ESPERA_TRAVA_MS)) throw erroColacao_("OCUPADO", MENSAGENS_COLACAO.OCUPADO);
  try {
    return funcao();
  } finally {
    trava.releaseLock();
  }
}

/*----------------------------------------------------
  Envio (público)
----------------------------------------------------*/

/**
 * @param {Object} dados campos do formulário + chaveEnvio +
 *   documentos [{tipo, ordem, base64}]
 * @return {{protocolo, recebidoEm, versao, correcao, cadastro, reciboEnviado}}
 */
function enviarPedidoColacao(dados) {
  const email = exigirSessaoColacao_();
  const instante = new Date();
  const recebidoEm = agoraIsoColacao_(instante);
  const chave = chaveEnvioValidaColacao_(dados && dados.chaveEnvio);
  const campos = validarCamposColacao_(dados);
  const documentos = validarDocumentosColacao_(dados.documentos);

  let estado;
  try {
    estado = comTravaColacao_(() => iniciarOuRetomarColacao_(email, chave, campos, documentos, instante, recebidoEm));
  } catch (erro) {
    throw tratarErroPublicoColacao_(erro);
  }
  if (estado.concluido) return estado.resultado;

  let resultado;
  try {
    documentos.concat(estado.mantidos).forEach(doc => comTravaColacao_(() => registrarDocumentoColacao_(estado, doc)));
    resultado = comTravaColacao_(() => concluirRecebimentoColacao_(estado));
  } catch (erro) {
    throw tratarErroPublicoColacao_(erro, true);
  }
  // Daqui em diante o pedido está recebido: nenhuma falha volta como erro.
  try {
    resultado.reciboEnviado = comTravaColacao_(() => enviarReciboColacao_(estado.tabelas, estado, resultado));
  } catch (erro) {
    resultado.reciboEnviado = false;
  }
  return resultado;
}

function tratarErroPublicoColacao_(erro, jaProtocolado) {
  if (erro && erro.codigoColacao) return erro;
  console.error("Envio do pedido de colação: " + mensagemSeguraColacao_(erro));
  return erroColacao_("INDISPONIVEL", jaProtocolado
    ? "O envio não terminou. Envie de novo pelo mesmo botão: o pedido continua de onde parou, com a data e a hora em que começou."
    : MENSAGENS_COLACAO.INDISPONIVEL);
}

function iniciarOuRetomarColacao_(email, chave, campos, documentos, instante, recebidoEm) {
  const { tabelas } = abrirPedidosColacao_();

  // Passo 2: a chave já existe? (VERSOES; ou só PROTOCOLOS, se a
  // execução anterior parou entre as duas gravações.)
  const versaoDaChave = lerLinhasColacao_(tabelas.VERSOES).filter(v => textoColacao_(v, "Chave de envio") === chave)[0];
  const protocoloDaChave = lerLinhasColacao_(tabelas.PROTOCOLOS).filter(p => textoColacao_(p, "Chave de envio") === chave)[0];
  const donoDaChave = versaoDaChave ? valorColacao_(versaoDaChave, "E-mail da sessão") : protocoloDaChave ? valorColacao_(protocoloDaChave, "E-mail da sessão") : "";
  if ((versaoDaChave || protocoloDaChave) && normalizarEmailColacao_(donoDaChave) !== email) {
    throw erroColacao_("CHAVE_INVALIDA", "Envio não reconhecido. Recarregue a página e tente de novo.");
  }
  if (versaoDaChave || protocoloDaChave) return retomarColacao_(tabelas, email, chave, campos, documentos, versaoDaChave, protocoloDaChave);

  // Passo 3: envio novo. O prazo é conferido aqui, uma vez.
  const periodo = situacaoPeriodoColacao_(instante);
  if (periodo.erro) throw erroColacao_("PERIODO_INDISPONIVEL", periodo.erro);
  if (!periodo.aberto) throw erroColacao_("FECHADO", "O prazo do pedido de colação de grau está encerrado. Para qualquer pedido fora do prazo, fale com o Serviço de Graduação.");

  const identidade = identificarCadastroColacao_(email, campos.nUsp);
  if (identidade.situacao === "CONFIRMADO" && campos.divergenciaApontada) {
    identidade.situacao = "PENDENTE";
    identidade.motivo = "DIVERGENCIA_APONTADA";
  }
  const vemDoCadastro = identidade.nUsp !== "";
  const informado = {
    nome: vemDoCadastro ? identidade.nome : campos.nome,
    nUsp: vemDoCadastro ? identidade.nUsp : campos.nUsp,
    anoIngresso: (vemDoCadastro && identidade.anoIngresso) || campos.anoIngresso
  };
  if (!informado.nome) throw erroColacao_("CAMPO_INVALIDO", "Informe o nome completo.");
  if (!informado.nUsp) throw erroColacao_("CAMPO_INVALIDO", "Informe o nº USP (só números).");
  if (!informado.anoIngresso) throw erroColacao_("CAMPO_INVALIDO", "Informe o ano de ingresso (4 dígitos).");

  const dadosPedido = Object.assign({}, campos, informado, {
    cadastro: identidade.situacao, colacao: periodo.codigoColacao, ano: periodo.ano
  });

  const pedidos = pedidosDaPessoaColacao_(tabelas, email, identidade);
  const ativo = protocoloAtivoColacao_(tabelas, pedidos, periodo.codigoColacao);
  if (ativo) return iniciarCorrecaoColacao_(tabelas, email, chave, documentos, recebidoEm, ativo, dadosPedido);

  // Protocolo novo: os dois documentos obrigatórios precisam vir agora.
  exigirObrigatoriosColacao_(documentos, []);
  const protocolo = proximoProtocoloColacao_(tabelas, periodo.codigoColacao);
  const protocoloId = Utilities.getUuid();
  const registroId = Utilities.getUuid();
  const pasta = pastaDoProtocoloColacao_(protocolo);
  acrescentarLinhaColacao_(tabelas.PROTOCOLOS, {
    "Protocolo": protocolo,
    "Protocolo ID": protocoloId,
    "Chave de envio": chave,
    "E-mail da sessão": email,
    "Recebimento": "RECEBENDO",
    "Cadastro": identidade.situacao,
    "Motivo do cadastro": identidade.motivo,
    "Recebido em": recebidoEm,
    "Recebimento concluído em": "",
    "Colação": periodo.codigoColacao,
    "Janela do período": periodo.janela,
    "Semestre do período": periodo.semestreBruto,
    "Nº USP informado": informado.nUsp,
    "Nome informado": textoSeguroColacao_(informado.nome, 200),
    "Registro ID": registroId,
    "Pasta do protocolo": pasta.getId()
  });
  acrescentarLinhaColacao_(tabelas.VERSOES, {
    "Protocolo ID": protocoloId, "Versão": 1, "Chave de envio": chave, "E-mail da sessão": email,
    "Situação": "RECEBENDO", "Enviada em": recebidoEm, "Concluída em": "", "Dados do pedido": JSON.stringify(dadosPedido)
  });
  registrarEventoColacao_(tabelas, protocoloId, 1, "PROTOCOLO_CRIADO", []);
  return {
    tabelas: tabelas, email: email, chave: chave, protocolo: protocolo, protocoloId: protocoloId, versao: 1,
    recebidoEm: recebidoEm, nome: informado.nome, colacao: periodo.codigoColacao, cadastro: identidade.situacao,
    enviadaEm: recebidoEm, pastaId: pasta.getId(), correcao: false, esperados: documentos.map(d => d.tipo + ":" + d.ordem), mantidos: []
  };
}

function exigirObrigatoriosColacao_(documentos, mantidos) {
  Object.keys(TIPOS_DOCUMENTO_COLACAO).forEach(tipo => {
    if (!TIPOS_DOCUMENTO_COLACAO[tipo].obrigatorio) return;
    if (!documentos.some(d => d.tipo === tipo) && !mantidos.some(d => d.tipo === tipo)) {
      throw erroColacao_("DOCUMENTO_FALTANDO", `Anexe o documento: ${TIPOS_DOCUMENTO_COLACAO[tipo].rotulo}.`);
    }
  });
}

/** Documentos da última versão concluída, por tipo (para "manter"). */
function documentosVigentesColacao_(tabelas, protocoloId, versoes) {
  const concluidas = versoes.filter(v => textoColacao_(v, "Situação") === "RECEBIDO");
  if (!concluidas.length) return [];
  const ultima = Number(valorColacao_(concluidas[concluidas.length - 1], "Versão"));
  return lerLinhasColacao_(tabelas.DOCUMENTOS).filter(d =>
    textoColacao_(d, "Protocolo ID") === protocoloId && Number(valorColacao_(d, "Versão")) === ultima);
}

function iniciarCorrecaoColacao_(tabelas, email, chave, documentos, recebidoEm, ativo, dadosPedido) {
  const protocoloId = textoColacao_(ativo, "Protocolo ID");
  let permitida;
  try {
    permitida = correcaoPermitidaPelaEquipeColacao_(textoColacao_(ativo, "Registro ID"));
  } catch (erro) {
    console.error("Regra D3 indisponível: " + mensagemSeguraColacao_(erro));
    throw erroColacao_("INDISPONIVEL", MENSAGENS_COLACAO.INDISPONIVEL);
  }
  if (!permitida) {
    throw erroColacao_("CORRECAO_ENCERRADA", "A equipe já começou a conferir o seu pedido " + textoColacao_(ativo, "Protocolo") +
      ". Para corrigir alguma informação, fale com o Serviço de Graduação.");
  }
  // O pedido mantém o nº USP, o nome e a situação de cadastro da entrada.
  dadosPedido.cadastro = textoColacao_(ativo, "Cadastro");
  const versoes = versoesDoProtocoloColacao_(tabelas, protocoloId);
  const anterior = versoes.length ? versoes[versoes.length - 1] : null;
  const versao = (anterior ? Number(valorColacao_(anterior, "Versão")) : 0) + 1;

  // Tipo que não veio arquivo novo: mantém o da última versão concluída.
  const vigentes = documentosVigentesColacao_(tabelas, protocoloId, versoes);
  const mantidos = [];
  Object.keys(TIPOS_DOCUMENTO_COLACAO).forEach(tipo => {
    if (documentos.some(d => d.tipo === tipo)) return;
    vigentes.filter(d => textoColacao_(d, "Tipo") === tipo).forEach((d, i) => {
      mantidos.push({ tipo: tipo, ordem: i + 1, mantido: true, origem: d });
    });
  });
  exigirObrigatoriosColacao_(documentos, mantidos);

  let alterados = [];
  try {
    const antes = JSON.parse(String(valorColacao_(anterior || {}, "Dados do pedido")) || "{}");
    alterados = Object.keys(dadosPedido).filter(k => JSON.stringify(antes[k]) !== JSON.stringify(dadosPedido[k]));
  } catch (erro) { alterados = ["(versão anterior ilegível)"]; }
  documentos.forEach(d => alterados.push("documento " + TIPOS_DOCUMENTO_COLACAO[d.tipo].rotulo));
  // Correção sem nenhuma mudança não vira versão nova (visto no H4 de 10/11/2026).
  if (!alterados.length) {
    throw erroColacao_("SEM_ALTERACAO", "Nada mudou em relação ao pedido " + textoColacao_(ativo, "Protocolo") +
      " já enviado. Altere o que precisa corrigir e envie de novo.");
  }

  acrescentarLinhaColacao_(tabelas.VERSOES, {
    "Protocolo ID": protocoloId, "Versão": versao, "Chave de envio": chave, "E-mail da sessão": email,
    "Situação": "RECEBENDO", "Enviada em": recebidoEm, "Concluída em": "", "Dados do pedido": JSON.stringify(dadosPedido)
  });
  registrarEventoColacao_(tabelas, protocoloId, versao, "CORRECAO_INICIADA", alterados);
  return {
    tabelas: tabelas, email: email, chave: chave, protocolo: textoColacao_(ativo, "Protocolo"), protocoloId: protocoloId,
    versao: versao, recebidoEm: textoColacao_(ativo, "Recebido em"), nome: dadosPedido.nome, colacao: textoColacao_(ativo, "Colação"),
    cadastro: textoColacao_(ativo, "Cadastro"), pastaId: textoColacao_(ativo, "Pasta do protocolo"), correcao: true, enviadaEm: recebidoEm,
    esperados: documentos.map(d => d.tipo + ":" + d.ordem).concat(mantidos.map(d => d.tipo + ":" + d.ordem)), mantidos: mantidos
  };
}

/** Mesma chave: devolve o resultado ou continua de onde parou. */
function retomarColacao_(tabelas, email, chave, campos, documentos, versaoDaChave, protocoloDaChave) {
  const protocoloId = textoColacao_(versaoDaChave || protocoloDaChave, "Protocolo ID");
  const protocolo = protocoloDaChave || lerLinhasColacao_(tabelas.PROTOCOLOS).filter(p => textoColacao_(p, "Protocolo ID") === protocoloId)[0];
  if (!protocolo) throw new Error("Versão sem protocolo correspondente.");
  let versaoLinha = versaoDaChave;
  if (!versaoLinha) {
    // A execução anterior parou depois de PROTOCOLOS e antes de VERSOES.
    let dadosPedido = {};
    try {
      dadosPedido = Object.assign({}, campos, {
        nome: textoColacao_(protocolo, "Nome informado"), nUsp: textoColacao_(protocolo, "Nº USP informado"),
        cadastro: textoColacao_(protocolo, "Cadastro"), colacao: textoColacao_(protocolo, "Colação")
      });
    } catch (erro) { /* mantém vazio */ }
    acrescentarLinhaColacao_(tabelas.VERSOES, {
      "Protocolo ID": protocoloId, "Versão": 1, "Chave de envio": chave, "E-mail da sessão": email,
      "Situação": "RECEBENDO", "Enviada em": textoColacao_(protocolo, "Recebido em"), "Concluída em": "",
      "Dados do pedido": JSON.stringify(dadosPedido)
    });
    versaoLinha = versoesDoProtocoloColacao_(tabelas, protocoloId).filter(v => textoColacao_(v, "Chave de envio") === chave)[0];
  }
  const versao = Number(valorColacao_(versaoLinha, "Versão"));
  const base = {
    tabelas: tabelas, email: email, chave: chave, protocolo: textoColacao_(protocolo, "Protocolo"), protocoloId: protocoloId,
    versao: versao, recebidoEm: textoColacao_(protocolo, "Recebido em"), nome: textoColacao_(protocolo, "Nome informado"),
    colacao: textoColacao_(protocolo, "Colação"), cadastro: textoColacao_(protocolo, "Cadastro"),
    pastaId: textoColacao_(protocolo, "Pasta do protocolo"), correcao: versao > 1,
    enviadaEm: textoColacao_(versaoLinha, "Enviada em")
  };
  // Concluído de fato só com a versão e o protocolo em RECEBIDO; se a
  // execução anterior parou entre as duas marcações, conclui agora.
  if (textoColacao_(versaoLinha, "Situação") === "RECEBIDO" && textoColacao_(protocolo, "Recebimento") === "RECEBIDO") {
    return { concluido: true, resultado: resultadoPublicoColacao_(base, null) };
  }
  registrarEventoColacao_(tabelas, protocoloId, versao, "RETOMADA", []);
  const registrados = lerLinhasColacao_(tabelas.DOCUMENTOS).filter(d =>
    textoColacao_(d, "Protocolo ID") === protocoloId && Number(valorColacao_(d, "Versão")) === versao);
  // Na retomada, os documentos esperados são os já registrados nesta
  // versão mais os que vieram agora; para os obrigatórios que faltarem,
  // mantém o da última versão concluída (só em correção).
  const versoes = versoesDoProtocoloColacao_(tabelas, protocoloId).filter(v => Number(valorColacao_(v, "Versão")) < versao);
  const vigentes = versao > 1 ? documentosVigentesColacao_(tabelas, protocoloId, versoes) : [];
  const mantidos = [];
  Object.keys(TIPOS_DOCUMENTO_COLACAO).forEach(tipo => {
    if (documentos.some(d => d.tipo === tipo) || registrados.some(d => textoColacao_(d, "Tipo") === tipo)) return;
    vigentes.filter(d => textoColacao_(d, "Tipo") === tipo).forEach((d, i) => mantidos.push({ tipo: tipo, ordem: i + 1, mantido: true, origem: d }));
  });
  const jaRegistrados = registrados.map(d => ({ tipo: textoColacao_(d, "Tipo") }));
  exigirObrigatoriosColacao_(documentos, mantidos.concat(jaRegistrados));
  const esperados = {};
  registrados.forEach(d => { esperados[textoColacao_(d, "Chave do documento")] = true; });
  documentos.concat(mantidos).forEach(d => { esperados[chaveDocumentoColacao_(chave, d.tipo, d.ordem)] = true; });
  return Object.assign(base, { esperadosChaves: Object.keys(esperados), mantidos: mantidos });
}

function registrarDocumentoColacao_(estado, doc) {
  const tabelas = estado.tabelas;
  const chaveDoc = chaveDocumentoColacao_(estado.chave, doc.tipo, doc.ordem);
  const jaExiste = lerLinhasColacao_(tabelas.DOCUMENTOS).some(d => textoColacao_(d, "Chave do documento") === chaveDoc);
  if (jaExiste) return;
  if (doc.mantido) {
    acrescentarLinhaColacao_(tabelas.DOCUMENTOS, {
      "Documento ID": Utilities.getUuid(), "Protocolo ID": estado.protocoloId, "Versão": estado.versao,
      "Chave do documento": chaveDoc, "Tipo": doc.tipo, "ID do arquivo": textoColacao_(doc.origem, "ID do arquivo"),
      "Origem": "REUTILIZADO", "Documento de origem": textoColacao_(doc.origem, "Documento ID"),
      "SHA-256": textoColacao_(doc.origem, "SHA-256"), "Tamanho (bytes)": valorColacao_(doc.origem, "Tamanho (bytes)"),
      "Formato": textoColacao_(doc.origem, "Formato"), "Situação": "APRESENTADO", "Registrado em": agoraIsoColacao_()
    });
    return;
  }
  const pasta = DriveApp.getFolderById(estado.pastaId);
  const nome = nomeArquivoColacao_(doc, estado.nome, estado.colacao, estado.protocolo, estado.versao);
  const arquivo = pasta.createFile(Utilities.newBlob(doc.bytes, doc.mime, nome));
  acrescentarLinhaColacao_(tabelas.DOCUMENTOS, {
    "Documento ID": Utilities.getUuid(), "Protocolo ID": estado.protocoloId, "Versão": estado.versao,
    "Chave do documento": chaveDoc, "Tipo": doc.tipo, "ID do arquivo": arquivo.getId(), "Origem": "ENVIADO",
    "Documento de origem": "", "SHA-256": doc.sha256, "Tamanho (bytes)": doc.tamanho, "Formato": doc.formato,
    "Situação": "APRESENTADO", "Registrado em": agoraIsoColacao_()
  });
}

function concluirRecebimentoColacao_(estado) {
  const tabelas = estado.tabelas;
  const esperados = estado.esperadosChaves || estado.esperados.map(e => estado.chave + ":" + e);
  const doVersao = () => lerLinhasColacao_(tabelas.DOCUMENTOS).filter(d =>
    textoColacao_(d, "Protocolo ID") === estado.protocoloId && Number(valorColacao_(d, "Versão")) === estado.versao);
  const registrados = doVersao().map(d => textoColacao_(d, "Chave do documento"));
  const faltando = esperados.filter(k => registrados.indexOf(k) === -1);
  if (faltando.length) throw new Error("Documentos da versão não registrados: " + faltando.length);

  const versaoLinha = versoesDoProtocoloColacao_(tabelas, estado.protocoloId).filter(v => Number(valorColacao_(v, "Versão")) === estado.versao)[0];
  const protocoloLinha = lerLinhasColacao_(tabelas.PROTOCOLOS).filter(p => textoColacao_(p, "Protocolo ID") === estado.protocoloId)[0];
  const concluidoEm = agoraIsoColacao_();
  if (textoColacao_(versaoLinha, "Situação") !== "RECEBIDO") {
    gravarCelulaColacao_(tabelas.VERSOES, versaoLinha.__linha, "Concluída em", concluidoEm);
    gravarCelulaColacao_(tabelas.VERSOES, versaoLinha.__linha, "Situação", "RECEBIDO");
  }
  if (textoColacao_(protocoloLinha, "Recebimento") !== "RECEBIDO") {
    gravarCelulaColacao_(tabelas.PROTOCOLOS, protocoloLinha.__linha, "Recebimento concluído em", concluidoEm);
    gravarCelulaColacao_(tabelas.PROTOCOLOS, protocoloLinha.__linha, "Recebimento", "RECEBIDO");
  }
  registrarEventoColacao_(tabelas, estado.protocoloId, estado.versao, estado.correcao ? "CORRECAO_RECEBIDA" : "RECEBIDO", []);
  SpreadsheetApp.flush();

  // Releitura: o protocolo só vai para a página se estiver gravado.
  const relidaVersao = versoesDoProtocoloColacao_(tabelas, estado.protocoloId).filter(v => Number(valorColacao_(v, "Versão")) === estado.versao);
  const relidoProtocolo = lerLinhasColacao_(tabelas.PROTOCOLOS).filter(p => textoColacao_(p, "Protocolo ID") === estado.protocoloId);
  if (relidaVersao.length !== 1 || textoColacao_(relidaVersao[0], "Situação") !== "RECEBIDO" ||
      relidoProtocolo.length !== 1 || textoColacao_(relidoProtocolo[0], "Recebimento") !== "RECEBIDO" ||
      textoColacao_(relidoProtocolo[0], "Protocolo") !== estado.protocolo ||
      textoColacao_(relidoProtocolo[0], "Recebido em") !== estado.recebidoEm) {
    throw new Error("Conferência depois da gravação falhou.");
  }
  return resultadoPublicoColacao_(estado, null);
}

function resultadoPublicoColacao_(estado, reciboEnviado) {
  return {
    protocolo: estado.protocolo,
    recebidoEm: dataHoraLegivelColacao_(estado.recebidoEm),
    correcaoEnviadaEm: estado.correcao ? dataHoraLegivelColacao_(estado.enviadaEm) : "",
    versao: estado.versao,
    correcao: !!estado.correcao,
    colacao: colacaoLegivel_(estado.colacao),
    cadastro: estado.cadastro === "CONFIRMADO" ? "CONFIRMADO" : "PENDENTE",
    reciboEnviado: reciboEnviado
  };
}
