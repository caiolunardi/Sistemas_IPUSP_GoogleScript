/*=====================================================
  ENCAMINHADOR DOS PEDIDOS DE COLAÇÃO (4.1.0, PR 4 do plano)

  O Formulário de Pedido de Colação de Grau 2.x grava cada
  pedido na planilha própria PEDIDOS_COLACAO (abas PROTOCOLOS,
  VERSOES, DOCUMENTOS, EVENTOS) e os documentos numa subpasta
  por protocolo em PASTA_PROVISORIOS_COLACAO. Ele não grava na
  aba Diplomas nem na planilha central de alunos.

  Este arquivo é o único caminho de um pedido do formulário até
  a aba Diplomas (escritor único, decisão D4). Roda sob o mesmo
  ScriptLock das ações da equipe, então não corre com exclusões,
  confirmações ou edições feitas no Gerenciador.

  Quem dispara (D15):
    - gatilho de tempo, criado pelo responsável pelo editor com
      instalarGatilhoEncaminhadorColacao() (a cada 5 minutos);
    - um ADMINISTRADOR, ao abrir a página (executarEncaminhadorColacao).

  Para cada pedido recebido e com a identidade confirmada (pelo
  formulário ou por decisão APROVADO do Gerenciador de Pessoas em
  DECISOES_CADASTRO), na última versão concluída:
    1. já registrado em ENCAMINHAMENTOS (ENCAMINHADO ou CORRECAO
       RETIDA) → pula;
    2. confere tudo antes de gravar: nº USP com exatamente uma linha
       na planilha central (sem autocadastro, D6), títulos da aba
       Diplomas, Registro ID sem repetição, nenhuma outra linha do
       mesmo nº USP na mesma colação;
    3. pasta do aluno (pela planilha central) e documentos movidos
       da subpasta do protocolo para ela (moveTo mantém o ID);
    4. sem linha do Registro ID → acrescenta a linha inteira de uma
       vez; com linha → correção (D3): só com "Status — Dados
       Pessoais" vazio; senão CORRECAO RETIDA, sem tocar em nada;
    5. registra em ENCAMINHAMENTOS e confere que há uma linha só
       com aquele Registro ID e o nº USP esperado.
  Qualquer problema vira BLOQUEADO com um motivo, para a equipe
  resolver; o protocolo do aluno nunca se perde e nada é apagado.

  Registros: nunca nome, nº USP, e-mail, RG nem IDs no Logger.
=====================================================*/

const ENCAMINHADOR_COLACAO = {
  CHAVE_PEDIDOS: "PEDIDOS_COLACAO",
  CHAVE_ENTRADA: "PASTA_PROVISORIOS_COLACAO",
  ABA: "ENCAMINHAMENTOS",
  COLUNAS: ["Quando", "Protocolo ID", "Versão", "Resultado", "Motivo", "Registro ID", "Origem"],
  FUNCAO_GATILHO: "encaminharPedidosColacaoPorGatilho",
  MINUTOS_GATILHO: 5,
  MAX_POR_EXECUCAO: 25,
  TEMPO_MAX_MS: 4 * 60 * 1000,
  ESPERA_TRAVA_MS: 20000
};

// Títulos da aba Diplomas que o formulário preenchia (seção C do
// modelo de dados). Os de baixo existem só por causa do formulário.
const CABECALHOS_FORMULARIO_COLACAO = {
  telefone: "Telefone Celular",
  emailAlternativo: "E-mail Alternativo",
  procuracao: "Colação por Procuração?",
  procuradorNome: "Procurador(a) — Nome",
  procuradorRg: "Procurador(a) — RG/CIN",
  colacaoAntecipada: "Colação Antecipada?",
  observacoesAluno: "Observações do Aluno",
  permaneceMatriculado: "Permanecerá Matriculado?",
  habilitacaoPendente: "Habilitação(ões) Pendente(s)"
};

// Chaves de CABECALHOS que o encaminhador grava (além das de cima).
const CHAVES_BASE_COLACAO = ["registroId", "versao", "nome", "nUsp", "email", "habilitacaoTexto", "rg", "status", "colacao",
  "bachConcluiu", "bachAno", "licConcluiu", "licAno", "psiConcluiu", "psiAno", "linkPasta", "idPasta"];

// Colunas que uma correção do aluno pode mudar (nunca Registro ID,
// Nº USP, Colação, status, etapas, pasta ou colunas da equipe).
const CHAVES_CORRIGIVEIS_COLACAO = ["nome", "email", "rg", "habilitacaoTexto", "bachConcluiu", "bachAno", "licConcluiu", "licAno",
  "psiConcluiu", "psiAno"].concat(Object.keys(CABECALHOS_FORMULARIO_COLACAO));

const MOTIVOS_ENCAMINHAMENTO_COLACAO = {
  SEM_CADASTRO_CENTRAL: "O Nº USP não tem cadastro na planilha central de alunos. Cadastre pelo Gerenciador de Pessoas.",
  NUSP_REPETIDO_CENTRAL: "O Nº USP aparece em mais de uma linha da planilha central de alunos. Corrija pelo Gerenciador de Pessoas.",
  REGISTRO_REPETIDO: "O Registro ID do pedido aparece em mais de uma linha da aba Diplomas.",
  REGISTRO_DIVERGENTE: "A linha da aba Diplomas com o Registro ID do pedido tem outro Nº USP ou outra colação.",
  DUPLICIDADE_DIPLOMAS: "Já existe outro registro deste Nº USP nesta colação na aba Diplomas.",
  CABECALHO_AUSENTE: "Falta uma coluna na aba Diplomas",
  PASTA_INDISPONIVEL: "A pasta do aluno não pôde ser usada (fora da pasta raiz ou inexistente).",
  ARQUIVO_FORA_DA_ENTRADA: "Um documento do pedido não está na subpasta do protocolo.",
  DADOS_ILEGIVEIS: "Os dados da versão do pedido não puderam ser lidos.",
  FALHA_CONFERENCIA: "A linha gravada não confere com o pedido.",
  STATUS_PREENCHIDO: "A equipe já começou a conferência (\"Status — Dados Pessoais\" preenchido).",
  FALHA: "Erro inesperado ao encaminhar."
};

/*----------------------------------------------------
  Pontos de entrada
----------------------------------------------------*/

/** Página: só ADMINISTRADOR. Encaminha e devolve o resumo para a faixa. */
function executarEncaminhadorColacao() {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  const resumo = encaminharPedidosColacao_("ADMINISTRADOR");
  return Object.assign(resumo, { pendencias: listarPendenciasEncaminhamento_() });
}

/** Gatilho de tempo (D15). Roda só no contexto do dono do projeto. */
function encaminharPedidosColacaoPorGatilho() {
  exigirContextoDoDonoDiplomas_();
  const resumo = encaminharPedidosColacao_("GATILHO");
  console.log("Encaminhador: " + JSON.stringify({ encaminhados: resumo.encaminhados, retidos: resumo.retidos,
    bloqueados: resumo.bloqueados, ocupado: !!resumo.ocupado, indisponivel: !!resumo.indisponivel }));
  return resumo;
}

/** Só pelo editor: cria a aba ENCAMINHAMENTOS, se faltar (nunca apaga nada). */
function prepararEncaminhamentosColacao() {
  exigirContextoDoDonoDiplomas_();
  const planilha = SpreadsheetApp.openById(obterIdRecursoDiplomas_(ENCAMINHADOR_COLACAO.CHAVE_PEDIDOS, "spreadsheet"));
  let aba = planilha.getSheetByName(ENCAMINHADOR_COLACAO.ABA);
  if (aba) {
    const faltam = titulosFaltandoColacao_(aba, ENCAMINHADOR_COLACAO.COLUNAS);
    console.log(faltam.length ? "ENCAMINHAMENTOS existe, mas faltam colunas: " + faltam.join(", ") : "ENCAMINHAMENTOS já existe e está completa.");
    return { criada: false, faltam: faltam };
  }
  aba = planilha.insertSheet(ENCAMINHADOR_COLACAO.ABA);
  aba.getRange(1, 1, 1, ENCAMINHADOR_COLACAO.COLUNAS.length).setValues([ENCAMINHADOR_COLACAO.COLUNAS]);
  console.log("Aba ENCAMINHAMENTOS criada.");
  return { criada: true, faltam: [] };
}

/** Só pelo editor, com a autorização do responsável (D15): gatilho de 5 min, sem duplicar. */
function instalarGatilhoEncaminhadorColacao() {
  exigirContextoDoDonoDiplomas_();
  const existentes = ScriptApp.getProjectTriggers().filter(g => g.getHandlerFunction() === ENCAMINHADOR_COLACAO.FUNCAO_GATILHO);
  if (existentes.length) {
    existentes.slice(1).forEach(g => ScriptApp.deleteTrigger(g));
    console.log("Gatilho do encaminhador já existia" + (existentes.length > 1 ? "; repetidos removidos." : "."));
    return { criado: false };
  }
  ScriptApp.newTrigger(ENCAMINHADOR_COLACAO.FUNCAO_GATILHO).timeBased().everyMinutes(ENCAMINHADOR_COLACAO.MINUTOS_GATILHO).create();
  console.log("Gatilho do encaminhador criado (a cada " + ENCAMINHADOR_COLACAO.MINUTOS_GATILHO + " minutos).");
  return { criado: true };
}

/** Só pelo editor: remove o gatilho (o encaminhador continua ao abrir a página). */
function removerGatilhoEncaminhadorColacao() {
  exigirContextoDoDonoDiplomas_();
  const existentes = ScriptApp.getProjectTriggers().filter(g => g.getHandlerFunction() === ENCAMINHADOR_COLACAO.FUNCAO_GATILHO);
  existentes.forEach(g => ScriptApp.deleteTrigger(g));
  console.log("Gatilhos do encaminhador removidos: " + existentes.length + ".");
  return { removidos: existentes.length };
}

/** Só pelo editor: contagens, sem nomes nem IDs. */
function diagnosticarEncaminhamentosColacao() {
  exigirContextoDoDonoDiplomas_();
  const fontes = abrirFontesColacao_();
  const pendencias = listarPendenciasEncaminhamento_(fontes);
  const contagem = {};
  pendencias.forEach(p => { contagem[p.resultado + " " + p.motivoCodigo] = (contagem[p.resultado + " " + p.motivoCodigo] || 0) + 1; });
  const resumo = {
    protocolosRecebidos: fontes.protocolos.filter(p => textoCelulaColacao_(p, "Recebimento") === "RECEBIDO").length,
    encaminhamentos: fontes.encaminhamentos.length,
    pendencias: contagem
  };
  console.log("Diagnóstico do encaminhador: " + JSON.stringify(resumo));
  return resumo;
}

/*----------------------------------------------------
  Guarda do contexto do dono (editor ou gatilho)

  A página roda como o dono ("Executar como: eu"): quem a abre
  tem o e-mail da sessão diferente do usuário efetivo. No editor e
  no gatilho, os dois são o dono. Assim, quem usa a página não
  chama estas funções.
----------------------------------------------------*/

function exigirContextoDoDonoDiplomas_() {
  let ativo = "", efetivo = "";
  try { ativo = normalizarEmailDiplomas_(Session.getActiveUser().getEmail()); } catch (e) { ativo = ""; }
  try { efetivo = normalizarEmailDiplomas_(Session.getEffectiveUser().getEmail()); } catch (e) { efetivo = ""; }
  if (!ativo || ativo !== efetivo) throw new Error("Função disponível só pelo editor do projeto ou pelo gatilho.");
}

/*----------------------------------------------------
  Leitura das fontes
----------------------------------------------------*/

function normalizarTituloColacao_(t) {
  return String(t == null ? "" : t).replace(/\s+/g, " ").trim();
}

function titulosFaltandoColacao_(aba, titulos) {
  const largura = Math.max(aba.getLastColumn(), 1);
  const existentes = aba.getRange(1, 1, 1, largura).getValues()[0].map(normalizarTituloColacao_);
  return titulos.filter(t => existentes.indexOf(t) === -1);
}

// Tabela por título, como objetos. Aba ausente → null (conta como vazia).
function lerTabelaColacao_(planilha, nome) {
  const aba = planilha.getSheetByName(nome);
  if (!aba) return null;
  const ultimaLinha = aba.getLastRow(), ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return { aba: aba, titulos: [], linhas: [] };
  const valores = aba.getRange(1, 1, Math.max(ultimaLinha, 1), ultimaColuna).getValues();
  const titulos = valores[0].map(normalizarTituloColacao_);
  const linhas = valores.slice(1).map(l => {
    const o = {};
    titulos.forEach((t, i) => { if (t) o[t] = l[i]; });
    return o;
  });
  return { aba: aba, titulos: titulos, linhas: linhas };
}

function textoCelulaColacao_(linha, titulo) {
  const v = linha ? linha[titulo] : "";
  return String(v == null ? "" : v).trim();
}

function abrirFontesColacao_() {
  const planilha = SpreadsheetApp.openById(obterIdRecursoDiplomas_(ENCAMINHADOR_COLACAO.CHAVE_PEDIDOS, "spreadsheet"));
  const exigir = nome => {
    const t = lerTabelaColacao_(planilha, nome);
    if (!t) throw new Error("PEDIDOS_COLACAO sem a aba " + nome + ".");
    return t;
  };
  const protocolos = exigir("PROTOCOLOS");
  const versoes = exigir("VERSOES");
  const documentos = exigir("DOCUMENTOS");
  const encaminhamentos = exigir(ENCAMINHADOR_COLACAO.ABA);
  const faltam = titulosFaltandoColacao_(encaminhamentos.aba, ENCAMINHADOR_COLACAO.COLUNAS);
  if (faltam.length) throw new Error("ENCAMINHAMENTOS sem as colunas: " + faltam.join(", ") + ".");
  const decisoes = lerTabelaColacao_(planilha, "DECISOES_CADASTRO");
  return {
    planilha: planilha,
    protocolos: protocolos.linhas,
    versoes: versoes.linhas,
    documentos: documentos.linhas,
    decisoes: decisoes ? decisoes.linhas : [],
    abaEncaminhamentos: encaminhamentos.aba,
    encaminhamentos: encaminhamentos.linhas
  };
}

// Última decisão do Gerenciador de Pessoas por protocolo (ordem das linhas).
function ultimaDecisaoColacao_(fontes, protocoloId) {
  let ultima = null;
  fontes.decisoes.forEach(d => { if (textoCelulaColacao_(d, "Protocolo ID") === protocoloId) ultima = d; });
  return ultima;
}

function registrosDoProtocoloColacao_(fontes, protocoloId, versao) {
  return fontes.encaminhamentos.filter(e => textoCelulaColacao_(e, "Protocolo ID") === protocoloId &&
    (versao === undefined || Number(e["Versão"]) === versao));
}

/*----------------------------------------------------
  Laço principal
----------------------------------------------------*/

function encaminharPedidosColacao_(origem) {
  const inicio = Date.now();
  const resumo = { encaminhados: 0, retidos: 0, bloqueados: 0, aguardando: 0, ocupado: false, indisponivel: false };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ENCAMINHADOR_COLACAO.ESPERA_TRAVA_MS)) { resumo.ocupado = true; return resumo; }
  try {
    let fontes;
    try {
      fontes = abrirFontesColacao_();
    } catch (erro) {
      console.error("Encaminhador indisponível: " + String(erro && erro.message || erro).slice(0, 200));
      resumo.indisponivel = true;
      return resumo;
    }
    const candidatos = pedidosParaEncaminharColacao_(fontes, resumo);
    for (let i = 0; i < candidatos.length && i < ENCAMINHADOR_COLACAO.MAX_POR_EXECUCAO; i++) {
      if (Date.now() - inicio > ENCAMINHADOR_COLACAO.TEMPO_MAX_MS) break;
      const c = candidatos[i];
      let resultado;
      try {
        resultado = encaminharUmColacao_(fontes, c);
      } catch (erro) {
        console.error("Encaminhador: falha num pedido: " + String(erro && erro.message || erro).replace(/[\w.+-]+@[\w.-]+/g, "[e-mail]").slice(0, 200));
        resultado = { resultado: "BLOQUEADO", motivo: "FALHA" };
      }
      registrarEncaminhamentoColacao_(fontes, c, resultado, origem);
      if (resultado.resultado === "ENCAMINHADO") resumo.encaminhados++;
      else if (resultado.resultado === "CORRECAO RETIDA") resumo.retidos++;
      else resumo.bloqueados++;
    }
    return resumo;
  } finally {
    lock.releaseLock();
  }
}

// Pedidos elegíveis, na ordem em que foram recebidos.
function pedidosParaEncaminharColacao_(fontes, resumo) {
  const candidatos = [];
  fontes.protocolos.forEach(p => {
    if (textoCelulaColacao_(p, "Recebimento") !== "RECEBIDO") return;
    const protocoloId = textoCelulaColacao_(p, "Protocolo ID");
    const registroId = textoCelulaColacao_(p, "Registro ID");
    if (!protocoloId || !registroId) return;

    // Identidade: confirmada no formulário ou APROVADO no Pessoas.
    const decisao = ultimaDecisaoColacao_(fontes, protocoloId);
    const textoDecisao = textoCelulaColacao_(decisao, "Decisão").toUpperCase();
    let nUsp = String(textoCelulaColacao_(p, "Nº USP informado")).replace(/\D/g, "");
    if (textoDecisao) {
      if (textoDecisao !== "APROVADO") return; // REJEITADO, DUPLICIDADE ou outra: não segue
      const nUspDecidido = textoCelulaColacao_(decisao, "Nº USP").replace(/\D/g, "");
      if (nUspDecidido) nUsp = nUspDecidido;
    } else if (textoCelulaColacao_(p, "Cadastro") !== "CONFIRMADO") {
      resumo.aguardando++;
      return;
    }

    // Última versão concluída.
    const concluidas = fontes.versoes
      .filter(v => textoCelulaColacao_(v, "Protocolo ID") === protocoloId && textoCelulaColacao_(v, "Situação") === "RECEBIDO")
      .sort((a, b) => Number(a["Versão"]) - Number(b["Versão"]));
    if (!concluidas.length) return;
    const ultima = concluidas[concluidas.length - 1];
    const versao = Number(ultima["Versão"]);

    // Já tratada: ENCAMINHADO ou CORRECAO RETIDA nesta versão.
    const registros = registrosDoProtocoloColacao_(fontes, protocoloId, versao);
    if (registros.some(r => ["ENCAMINHADO", "CORRECAO RETIDA"].indexOf(textoCelulaColacao_(r, "Resultado").toUpperCase()) !== -1)) return;

    candidatos.push({ protocolo: p, protocoloId: protocoloId, registroId: registroId, versao: versao, linhaVersao: ultima, nUsp: nUsp,
      ultimoRegistro: registros.length ? registros[registros.length - 1] : null });
  });
  return candidatos;
}

/*----------------------------------------------------
  Um pedido: confere tudo, pasta e documentos, linha
----------------------------------------------------*/

function bloqueioColacao_(motivo, detalhe) {
  return { resultado: "BLOQUEADO", motivo: motivo, detalhe: detalhe || "" };
}

function encaminharUmColacao_(fontes, c) {
  let dados;
  try {
    dados = JSON.parse(textoCelulaColacao_(c.linhaVersao, "Dados do pedido") || "{}");
  } catch (erro) {
    return bloqueioColacao_("DADOS_ILEGIVEIS");
  }
  if (!dados || typeof dados !== "object") return bloqueioColacao_("DADOS_ILEGIVEIS");
  const colacao = textoCelulaColacao_(c.protocolo, "Colação");
  if (!/^\d{5}$/.test(colacao) || !c.nUsp) return bloqueioColacao_("DADOS_ILEGIVEIS");

  // Planilha central: exatamente uma linha (sem autocadastro, D6).
  const abaCentral = obterAbaAlunosCentral_();
  const linhasCentral = localizarLinhasAlunoCentral_(abaCentral, c.nUsp);
  if (!linhasCentral.length) return bloqueioColacao_("SEM_CADASTRO_CENTRAL");
  if (linhasCentral.length > 1) return bloqueioColacao_("NUSP_REPETIDO_CENTRAL");
  const nomeCentral = String(abaCentral.getRange(linhasCentral[0], COL_ALUNOS_CENTRAL_NOME).getValue() || "").trim();

  // Aba Diplomas: todos os títulos antes de gravar (nunca cria coluna).
  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);
  const titulosNecessarios = CHAVES_BASE_COLACAO.map(k => CABECALHOS[k])
    .concat(Object.keys(CABECALHOS_FORMULARIO_COLACAO).map(k => CABECALHOS_FORMULARIO_COLACAO[k]));
  const faltando = titulosNecessarios.filter(t => !mapa[t]);
  if (faltando.length) return bloqueioColacao_("CABECALHO_AUSENTE", faltando[0]);
  const coluna = chave => mapa[CABECALHOS[chave] || CABECALHOS_FORMULARIO_COLACAO[chave]];

  // Linhas do Registro ID e do mesmo nº USP nesta colação.
  const ultimaLinha = aba.getLastRow();
  const valores = ultimaLinha >= 2 ? aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues() : [];
  const ler = (l, chave) => String(l[coluna(chave) - 1] == null ? "" : l[coluna(chave) - 1]).trim();
  const doRegistro = [], mesmaPessoa = [];
  valores.forEach((l, i) => {
    if (ler(l, "registroId") === c.registroId) doRegistro.push(i + 2);
    else if (ler(l, "nUsp") === c.nUsp && ler(l, "colacao") === colacao) mesmaPessoa.push(i + 2);
  });
  if (doRegistro.length > 1) return bloqueioColacao_("REGISTRO_REPETIDO");
  if (mesmaPessoa.length) return bloqueioColacao_("DUPLICIDADE_DIPLOMAS");
  const linhaExistente = doRegistro.length ? doRegistro[0] : null;
  if (linhaExistente) {
    const l = valores[linhaExistente - 2];
    if (ler(l, "nUsp") !== c.nUsp || ler(l, "colacao") !== colacao) return bloqueioColacao_("REGISTRO_DIVERGENTE");
    // D3: com a conferência começada, a correção fica retida (nada muda).
    if (ler(l, "status") !== "") return { resultado: "CORRECAO RETIDA", motivo: "STATUS_PREENCHIDO" };
  }

  // Pasta do aluno (pela planilha central) e documentos desta versão.
  let pastaAluno;
  try {
    pastaAluno = garantirPastaAlunoCentralSemTrava_(c.nUsp, nomeCentral || dados.nome, textoCelulaColacao_(c.protocolo, "E-mail da sessão"));
  } catch (erro) {
    if (/mais de uma linha/.test(String(erro && erro.message))) return bloqueioColacao_("NUSP_REPETIDO_CENTRAL");
    if (/sem cadastro|não tem cadastro/i.test(String(erro && erro.message))) return bloqueioColacao_("SEM_CADASTRO_CENTRAL");
    return bloqueioColacao_("PASTA_INDISPONIVEL");
  }
  const movidos = moverDocumentosColacao_(fontes, c, pastaAluno);
  if (movidos.erro) return bloqueioColacao_(movidos.erro);

  // Valores da linha, como o formulário legado gravava.
  const simNao = v => (v === true ? "SIM" : "NÃO");
  const ano = String(dados.ano || "").trim();
  const v = {
    nome: dados.nome || nomeCentral,
    email: textoCelulaColacao_(c.protocolo, "E-mail da sessão"),
    rg: dados.rg || "",
    habilitacaoTexto: calcularHabilitacaoTextoAtual_(dados.bachConcluiu === true, dados.licConcluiu === true, dados.psiConcluiu === true),
    bachConcluiu: simNao(dados.bachConcluiu), bachAno: dados.bachConcluiu === true ? ano : "",
    licConcluiu: simNao(dados.licConcluiu), licAno: dados.licConcluiu === true ? ano : "",
    psiConcluiu: simNao(dados.psiConcluiu), psiAno: dados.psiConcluiu === true ? ano : "",
    telefone: dados.telefone || "",
    emailAlternativo: dados.emailAlternativo || "",
    procuracao: dados.procuracao || "",
    procuradorNome: dados.procuradorNome || "",
    procuradorRg: dados.procuradorRg || "",
    colacaoAntecipada: dados.colacaoAntecipada || "",
    observacoesAluno: dados.observacoesAluno || "",
    permaneceMatriculado: dados.permaneceMatriculado || "",
    habilitacaoPendente: Array.isArray(dados.habilitacaoPendente) ? dados.habilitacaoPendente.join(", ") : String(dados.habilitacaoPendente || "")
  };

  let linhaFinal;
  if (!linhaExistente) {
    const largura = aba.getLastColumn();
    const nova = [];
    for (let i = 0; i < largura; i++) nova.push("");
    Object.assign(v, { registroId: c.registroId, versao: 1, nUsp: c.nUsp, colacao: colacao, status: "",
      linkPasta: pastaAluno.getUrl(), idPasta: pastaAluno.getId() });
    Object.keys(v).forEach(chave => { nova[coluna(chave) - 1] = v[chave]; });
    aba.appendRow(nova);
  } else {
    // Correção: só as colunas do aluno, célula a célula (não regrava a
    // linha inteira, para não trocar fórmulas de outras colunas).
    CHAVES_CORRIGIVEIS_COLACAO.forEach(chave => {
      const atual = aba.getRange(linhaExistente, coluna(chave)).getValue();
      if (String(atual == null ? "" : atual) !== String(v[chave])) aba.getRange(linhaExistente, coluna(chave)).setValue(v[chave]);
    });
    if (!String(aba.getRange(linhaExistente, coluna("idPasta")).getValue() || "").trim()) {
      aba.getRange(linhaExistente, coluna("linkPasta")).setValue(pastaAluno.getUrl());
      aba.getRange(linhaExistente, coluna("idPasta")).setValue(pastaAluno.getId());
    }
    incrementarVersao_(aba, mapa, linhaExistente);
  }

  // Conferência depois de gravar: uma linha, nº USP e colação esperados.
  try {
    linhaFinal = localizarLinhaPorId_(aba, mapearCabecalhos_(aba), c.registroId);
  } catch (erro) {
    return bloqueioColacao_("FALHA_CONFERENCIA");
  }
  const conferir = chave => String(aba.getRange(linhaFinal, coluna(chave)).getValue() || "").trim();
  if (conferir("nUsp") !== c.nUsp || conferir("colacao") !== colacao) return bloqueioColacao_("FALHA_CONFERENCIA");
  return { resultado: "ENCAMINHADO", motivo: linhaExistente ? "CORRECAO_APLICADA" : "", linha: linhaFinal };
}

// Move os documentos desta versão da subpasta do protocolo para a pasta
// do aluno. Idempotente: arquivo já na pasta do aluno fica como está.
// Arquivo fora da subpasta do protocolo não é tocado (bloqueia).
function moverDocumentosColacao_(fontes, c, pastaAluno) {
  const idSubpasta = textoCelulaColacao_(c.protocolo, "Pasta do protocolo");
  const idEntrada = obterIdRecursoDiplomas_(ENCAMINHADOR_COLACAO.CHAVE_ENTRADA, "folder");
  let subpasta;
  try {
    subpasta = DriveApp.getFolderById(idSubpasta);
  } catch (erro) {
    return { erro: "ARQUIVO_FORA_DA_ENTRADA" };
  }
  if (!temPaiColacao_(subpasta, idEntrada)) return { erro: "ARQUIVO_FORA_DA_ENTRADA" };

  const ids = [];
  fontes.documentos.forEach(d => {
    if (textoCelulaColacao_(d, "Protocolo ID") !== c.protocoloId || Number(d["Versão"]) !== c.versao) return;
    const id = textoCelulaColacao_(d, "ID do arquivo");
    if (id && ids.indexOf(id) === -1) ids.push(id);
  });
  // Primeiro confere todos; só depois move (nada pela metade por arquivo estranho).
  const arquivos = [];
  for (let i = 0; i < ids.length; i++) {
    let arquivo;
    try { arquivo = DriveApp.getFileById(ids[i]); } catch (erro) { return { erro: "ARQUIVO_FORA_DA_ENTRADA" }; }
    if (temPaiColacao_(arquivo, pastaAluno.getId())) continue;
    if (!temPaiColacao_(arquivo, subpasta.getId())) return { erro: "ARQUIVO_FORA_DA_ENTRADA" };
    arquivos.push(arquivo);
  }
  arquivos.forEach(a => a.moveTo(pastaAluno));
  return { movidos: arquivos.length };
}

function temPaiColacao_(item, idPai) {
  const pais = item.getParents();
  while (pais.hasNext()) if (pais.next().getId() === idPai) return true;
  return false;
}

/*----------------------------------------------------
  ENCAMINHAMENTOS (só acréscimos)
----------------------------------------------------*/

function registrarEncaminhamentoColacao_(fontes, c, r, origem) {
  // BLOQUEADO repetido pelo mesmo motivo não gera linha nova a cada ciclo.
  const ultimo = c.ultimoRegistro;
  if (r.resultado === "BLOQUEADO" && ultimo && textoCelulaColacao_(ultimo, "Resultado").toUpperCase() === "BLOQUEADO" &&
      textoCelulaColacao_(ultimo, "Motivo") === motivoGravadoColacao_(r)) return;
  const aba = fontes.abaEncaminhamentos;
  const titulos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(normalizarTituloColacao_);
  const valores = {
    "Quando": "'" + Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
    "Protocolo ID": "'" + c.protocoloId,
    "Versão": c.versao,
    "Resultado": r.resultado,
    "Motivo": motivoGravadoColacao_(r),
    "Registro ID": "'" + c.registroId,
    "Origem": origem
  };
  const linha = titulos.map(t => (t in valores ? valores[t] : ""));
  aba.appendRow(linha);
  const registro = {};
  titulos.forEach((t, i) => { if (t) registro[t] = String(linha[i]).replace(/^'/, ""); });
  fontes.encaminhamentos.push(registro);
}

function motivoGravadoColacao_(r) {
  return r.detalhe ? r.motivo + ": " + r.detalhe : (r.motivo || "");
}

/*----------------------------------------------------
  Pendências para a equipe (BLOQUEADO e CORRECAO RETIDA)
----------------------------------------------------*/

function listarPendenciasEncaminhamento_(fontesJaAbertas) {
  let fontes = fontesJaAbertas;
  if (!fontes) {
    try { fontes = abrirFontesColacao_(); } catch (erro) { return []; }
  }
  const ultimoPorProtocolo = {};
  fontes.encaminhamentos.forEach(e => {
    const id = textoCelulaColacao_(e, "Protocolo ID");
    if (id) ultimoPorProtocolo[id] = e;
  });
  const pendencias = [];
  fontes.protocolos.forEach(p => {
    const id = textoCelulaColacao_(p, "Protocolo ID");
    const e = ultimoPorProtocolo[id];
    if (!e) return;
    const resultado = textoCelulaColacao_(e, "Resultado").toUpperCase();
    if (resultado !== "BLOQUEADO" && resultado !== "CORRECAO RETIDA") return;
    const motivoBruto = textoCelulaColacao_(e, "Motivo");
    const codigo = motivoBruto.split(":")[0].trim();
    const detalhe = motivoBruto.indexOf(":") !== -1 ? motivoBruto.slice(motivoBruto.indexOf(":") + 1).trim() : "";
    const texto = (MOTIVOS_ENCAMINHAMENTO_COLACAO[codigo] || MOTIVOS_ENCAMINHAMENTO_COLACAO.FALHA) + (detalhe ? ": " + detalhe : "");
    pendencias.push({
      protocolo: textoCelulaColacao_(p, "Protocolo"),
      nome: textoCelulaColacao_(p, "Nome informado"),
      colacao: textoCelulaColacao_(p, "Colação"),
      versao: Number(e["Versão"]) || 1,
      resultado: resultado,
      motivoCodigo: codigo,
      motivo: texto
    });
  });
  return pendencias;
}
