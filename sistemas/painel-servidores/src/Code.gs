/*=====================================================
  PAINEL DE SISTEMAS — SERVIDORES — SERVIÇO DE GRADUAÇÃO (IPUSP)
  (cabeçalho completo — ver histórico do projeto)
=====================================================*/

// --- Diplomas ---
const CHAVE_PLANILHA_DIPLOMAS = "EMISSAO_DIPLOMAS"; // chave do ID_INDEX (1.4: o ID não fica no código)
const ABA_DIPLOMAS = "Diplomas";
const CABECALHO_NOME_DIPLOMAS = "Nome completo";
const CABECALHO_STATUS_DIPLOMAS = "Status — Dados Pessoais";

// --- Abertura de Habilitações ---
const CHAVE_PLANILHA_HABILITACOES = "ABERTURA_HABILITACOES"; // chave do ID_INDEX (1.4: o ID não fica no código)
const ABA_HABILITACOES_ATUAL = "Respostas ao formulário 2";
const ABA_HABILITACOES_HISTORICA = "2021 - 2022";
const COLUNA_SITUACAO_ATUAL = 11;
const VALOR_SITUACAO_PENDENTE = "pendente";

// --- Trancamento Total de Matrícula ---
const CHAVE_PLANILHA_TRANCAMENTO_TOTAL = "TRANCAMENTO_TOTAL_MATRICULA"; // chave do ID_INDEX (1.4: o ID não fica no código)
const COLUNA_SITUACAO_TRANCAMENTO_TOTAL = 1;
const COLUNA_NOME_TRANCAMENTO_TOTAL = 4;
const VALOR_SITUACAO_CONCLUIDO_TRANCAMENTO_TOTAL = "concluído";

// --- Trancamento Parcial de Matrícula ---
const CHAVE_PLANILHA_TRANCAMENTO_PARCIAL = "TRANCAMENTO_PARCIAL_MATRICULA"; // chave do ID_INDEX (1.4: o ID não fica no código)
const COLUNA_SITUACAO_TRANCAMENTO_PARCIAL = 1;
const COLUNA_NOME_TRANCAMENTO_PARCIAL = 6;
const VALOR_SITUACAO_PENDENTE_TRANCAMENTO_PARCIAL = "pendente";

// --- 2ª Via do BUSP ---
const CHAVE_PLANILHA_BUSP = "SEGUNDA_VIA_BUSP"; // chave do ID_INDEX (1.4: o ID não fica no código)
const COLUNA_STATUS_BUSP = 9;
const COLUNA_NOME_BUSP = 4;
const VALOR_STATUS_PENDENTE_ANALISE_BUSP = "pendente de análise";
const VALOR_STATUS_PENDENTE_EMISSAO_BUSP = "pendente de emissão";
const VALOR_STATUS_AGUARDANDO_FINANCEIRO_BUSP = "aguardando serviço técnico de apoio financeiro";

// --- Matrícula de Intercambistas ---
const CHAVE_PLANILHA_INTERCAMBISTAS = "MATRICULA_INTERCAMBISTAS"; // chave do ID_INDEX (1.4: o ID não fica no código)
const COLUNA_SITUACAO_INTERCAMBISTAS = 1;
const COLUNA_TIPO_INTERCAMBISTAS = 4;
const COLUNA_EMAIL_INTERCAMBISTAS = 5;
const VALOR_SITUACAO_PENDENTE_INTERCAMBISTAS = "pendente";
const VALOR_TIPO_INCLUSAO_INTERCAMBISTAS = "inclusao";
const VALOR_TIPO_EXCLUSAO_INTERCAMBISTAS = "exclusao";

// --- Gerenciador de Exclusão de Disciplinas ---
const CHAVE_PLANILHA_EXCLUSAO_DISCIPLINAS = "EXCLUSAO_DISCIPLINAS"; // chave do ID_INDEX (1.4: o ID não fica no código)
const ABA_EXCLUSAO_DISCIPLINAS = "Respostas ao formulário 1";
const COLUNA_EMAIL_EXCLUSAO_DISCIPLINAS = 2;
const COLUNA_DISCIPLINA_EXCLUSAO_DISCIPLINAS = 10;
const COLUNA_SITUACAO_EXCLUSAO_DISCIPLINAS = 20;
const VALOR_SITUACAO_CONCLUIDO_EXCLUSAO_DISCIPLINAS = "concluído";

const TIMEZONE = "America/Sao_Paulo";

/*=====================================================
  SERVE A PÁGINA + HELPER DE INCLUDE (HtmlService)
=====================================================*/

function doGet(e) {
  // Só abre para quem está na aba PAINEL_SERVIDORES (AcessoPainel.gs).
  const acesso = verificarAcessoPainel_();
  if (!acesso.ok) return paginaSemAcessoPainel_(acesso);
  return HtmlService.createTemplateFromFile("Painel")
    .evaluate()
    .setTitle("Painel de Sistemas — Serviço de Graduação")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Helper padrão de composição de templates HtmlService — usado pelo
// Painel.html pra puxar os partials modulares (ConfigHomeUI,
// ConfigFormulariosUI, ConfigRegrasCurricularesUI etc). Nenhum dos
// partials de hoje precisa de scriptlets próprios, então
// getContent() (sem template evaluation) já basta; se algum partial
// futuro precisar interpolar <?= ?> própria, troque esse partial
// específico para createTemplateFromFile(...).evaluate().getContent().
function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  CONTADORES DE PENDÊNCIA (domínio "dashboard/badges" —
  não faz parte da modularização de Configurações)
=====================================================*/

function obterContadoresPendencias() {
  exigirAcessoPainel_();
  const intercambistas = contarPendentesIntercambistas_();
  const contadores = {
    diplomas: contarPendentesDiplomas_(),
    habilitacoes: contarPendentesHabilitacoes_(),
    trancamentoTotal: contarPendentesTrancamentoTotal_(),
    trancamentoParcial: contarPendentesTrancamentoParcial_(),
    busp: contarPendentesBusp_(),
    buspAguardando: contarAguardandoFinanceiroBusp_(),
    intercambistasInclusao: intercambistas.inclusao,
    intercambistasExclusao: intercambistas.exclusao,
    exclusaoDisciplinas: contarPendentesExclusaoDisciplinas_()
  };
  registrarPendenciasPainel_(contadores); // aba PENDENCIAS da auditoria, no máximo 1x por hora
  return contadores;
}

// Utilitário genérico de mapeamento de cabeçalhos — TOLERANTE (não
// lança erro se faltar cabeçalho, só devolve undefined pra essa
// chave). Usado pelo domínio de badges. Regras Curriculares usa uma
// versão mais rigorosa própria: mapearCabecalhosObrigatorios_, em
// ConfigCore.gs, que EXIGE a presença de cada cabeçalho.
function mapearCabecalhos_(aba) {

  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return {};

  const linhaCabecalho = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];
  const mapa = {};

  linhaCabecalho.forEach((titulo, indice) => {
    if (titulo) mapa[String(titulo).trim()] = indice + 1;
  });

  return mapa;

}

function contarPendentesDiplomas_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_DIPLOMAS));
    const aba = ss.getSheetByName(ABA_DIPLOMAS);
    if (!aba) return 0;

    const mapa = mapearCabecalhos_(aba);
    const colNome = mapa[CABECALHO_NOME_DIPLOMAS];
    const colStatus = mapa[CABECALHO_STATUS_DIPLOMAS];
    if (!colNome || !colStatus) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(colNome, colStatus);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let contador = 0;

    dados.forEach(linha => {
      const nome = linha[colNome - 1];
      if (!nome) return;
      const status = linha[colStatus - 1];
      if (status !== "OK") contador++;
    });

    return contador;

  } catch (err) {
    Logger.log("Falha ao contar pendências de Diplomas: " + err);
    return 0;
  }

}

function contarPendentesHabilitacoes_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_HABILITACOES));
    let total = 0;

    const abaAtual = ss.getSheetByName(ABA_HABILITACOES_ATUAL);
    if (abaAtual) {
      total += contarSituacaoPendenteColunaFixa_(abaAtual, COLUNA_SITUACAO_ATUAL);
    }

    const abaHistorica = ss.getSheetByName(ABA_HABILITACOES_HISTORICA);
    if (abaHistorica) {
      total += contarSituacaoPendentePorCabecalho_(abaHistorica);
    }

    return total;

  } catch (err) {
    Logger.log("Falha ao contar pendências de Abertura de Habilitações: " + err);
    return 0;
  }

}

function contarSituacaoPendenteColunaFixa_(aba, colunaSituacao) {

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return 0;
  if (aba.getLastColumn() < colunaSituacao) return 0;

  const valores = aba.getRange(2, colunaSituacao, ultimaLinha - 1, 1).getValues();

  let contador = 0;
  valores.forEach(linha => {
    const situacao = String(linha[0] || "").trim().toLowerCase();
    if (situacao === VALOR_SITUACAO_PENDENTE) contador++;
  });

  return contador;

}

function contarSituacaoPendentePorCabecalho_(aba) {

  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return 0;

  const cabecalhos = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];
  let colSituacao = null;

  for (let i = 0; i < cabecalhos.length; i++) {
    const titulo = String(cabecalhos[i] || "").toLowerCase();
    if (titulo.indexOf("situa") !== -1) {
      colSituacao = i + 1;
      break;
    }
  }

  if (!colSituacao) return 0;

  return contarSituacaoPendenteColunaFixa_(aba, colSituacao);

}

function contarPendentesTrancamentoTotal_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_TRANCAMENTO_TOTAL));
    const aba = ss.getSheets()[0];
    if (!aba) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(COLUNA_SITUACAO_TRANCAMENTO_TOTAL, COLUNA_NOME_TRANCAMENTO_TOTAL);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let contador = 0;

    dados.forEach(linha => {
      const nome = linha[COLUNA_NOME_TRANCAMENTO_TOTAL - 1];
      if (!nome) return;

      const situacao = String(linha[COLUNA_SITUACAO_TRANCAMENTO_TOTAL - 1] || "").trim().toLowerCase();
      if (situacao !== VALOR_SITUACAO_CONCLUIDO_TRANCAMENTO_TOTAL) contador++;
    });

    return contador;

  } catch (err) {
    Logger.log("Falha ao contar pendências de Trancamento Total de Matrícula: " + err);
    return 0;
  }

}

function contarPendentesTrancamentoParcial_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_TRANCAMENTO_PARCIAL));
    const aba = ss.getSheets()[0];
    if (!aba) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(COLUNA_SITUACAO_TRANCAMENTO_PARCIAL, COLUNA_NOME_TRANCAMENTO_PARCIAL);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let contador = 0;

    dados.forEach(linha => {
      const nome = linha[COLUNA_NOME_TRANCAMENTO_PARCIAL - 1];
      if (!nome) return;

      const situacao = String(linha[COLUNA_SITUACAO_TRANCAMENTO_PARCIAL - 1] || "").trim().toLowerCase();
      if (situacao === VALOR_SITUACAO_PENDENTE_TRANCAMENTO_PARCIAL) contador++;
    });

    return contador;

  } catch (err) {
    Logger.log("Falha ao contar pendências de Trancamento Parcial de Matrícula: " + err);
    return 0;
  }

}

function contarPendentesBusp_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_BUSP));
    const aba = ss.getSheets()[0];
    if (!aba) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(COLUNA_STATUS_BUSP, COLUNA_NOME_BUSP);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let contador = 0;

    dados.forEach(linha => {
      const nome = linha[COLUNA_NOME_BUSP - 1];
      if (!nome) return;

      const status = String(linha[COLUNA_STATUS_BUSP - 1] || "").trim().toLowerCase();
      if (status === VALOR_STATUS_PENDENTE_ANALISE_BUSP || status === VALOR_STATUS_PENDENTE_EMISSAO_BUSP) contador++;
    });

    return contador;

  } catch (err) {
    Logger.log("Falha ao contar pendências de 2ª Via do BUSP: " + err);
    return 0;
  }

}

function contarAguardandoFinanceiroBusp_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_BUSP));
    const aba = ss.getSheets()[0];
    if (!aba) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(COLUNA_STATUS_BUSP, COLUNA_NOME_BUSP);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let contador = 0;

    dados.forEach(linha => {
      const nome = linha[COLUNA_NOME_BUSP - 1];
      if (!nome) return;

      const status = String(linha[COLUNA_STATUS_BUSP - 1] || "").trim().toLowerCase();
      if (status === VALOR_STATUS_AGUARDANDO_FINANCEIRO_BUSP) contador++;
    });

    return contador;

  } catch (err) {
    Logger.log("Falha ao contar pedidos de BUSP aguardando financeiro: " + err);
    return 0;
  }

}

// Utilitário genérico de string, reaproveitado por outros módulos
// (ex: ConfigRegrasCurricularesRepository.gs usa pra comparar
// SIM/NAO e status ignorando acento/caixa).
function normalizarSemAcento_(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function contarPendentesIntercambistas_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_INTERCAMBISTAS));
    const aba = ss.getSheets()[0];
    if (!aba) return { inclusao: 0, exclusao: 0 };

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return { inclusao: 0, exclusao: 0 };

    const numColunas = Math.max(
      COLUNA_SITUACAO_INTERCAMBISTAS,
      COLUNA_TIPO_INTERCAMBISTAS,
      COLUNA_EMAIL_INTERCAMBISTAS
    );
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    let inclusao = 0;
    let exclusao = 0;

    dados.forEach(linha => {

      const email = linha[COLUNA_EMAIL_INTERCAMBISTAS - 1];
      if (!email) return;

      const situacao = normalizarSemAcento_(linha[COLUNA_SITUACAO_INTERCAMBISTAS - 1]);
      if (situacao !== VALOR_SITUACAO_PENDENTE_INTERCAMBISTAS) return;

      const tipo = normalizarSemAcento_(linha[COLUNA_TIPO_INTERCAMBISTAS - 1]);
      if (tipo === VALOR_TIPO_INCLUSAO_INTERCAMBISTAS) inclusao++;
      else if (tipo === VALOR_TIPO_EXCLUSAO_INTERCAMBISTAS) exclusao++;

    });

    return { inclusao: inclusao, exclusao: exclusao };

  } catch (err) {
    Logger.log("Falha ao contar pendências de Matrícula de Intercambistas: " + err);
    return { inclusao: 0, exclusao: 0 };
  }

}

function contarPendentesExclusaoDisciplinas_() {

  try {

    const ss = SpreadsheetApp.openById(idNoIndicePainel_(CHAVE_PLANILHA_EXCLUSAO_DISCIPLINAS));
    const aba = ss.getSheetByName(ABA_EXCLUSAO_DISCIPLINAS);
    if (!aba) return 0;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const numColunas = Math.max(
      COLUNA_EMAIL_EXCLUSAO_DISCIPLINAS,
      COLUNA_DISCIPLINA_EXCLUSAO_DISCIPLINAS,
      COLUNA_SITUACAO_EXCLUSAO_DISCIPLINAS
    );
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    const emailsPendentes = new Set();

    dados.forEach(linha => {

      const disciplina = String(linha[COLUNA_DISCIPLINA_EXCLUSAO_DISCIPLINAS - 1] || "").trim();
      if (!disciplina) return;

      const situacao = String(linha[COLUNA_SITUACAO_EXCLUSAO_DISCIPLINAS - 1] || "").trim().toLowerCase();
      if (situacao === VALOR_SITUACAO_CONCLUIDO_EXCLUSAO_DISCIPLINAS) return;

      const email = String(linha[COLUNA_EMAIL_EXCLUSAO_DISCIPLINAS - 1] || "").trim().toLowerCase();
      if (!email) return;

      emailsPendentes.add(email);

    });

    return emailsPendentes.size;

  } catch (err) {
    Logger.log("Falha ao contar pendências de Exclusão de Disciplinas: " + err);
    return 0;
  }

}
