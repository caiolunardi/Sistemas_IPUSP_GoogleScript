/*=====================================================
  ACESSO AO PAINEL — quem abre e quem pode alterar
=====================================================*/

// A lista fica na planilha de permissões, não no código:
//
//   Script Property ID_INDEX_SPREADSHEET_ID → planilha ID_INDEX
//     › chave PERMISSOES_DE_ACESSO (coluna "ID de Produção")
//       › aba PAINEL_SERVIDORES, linha 1 = títulos, a partir da linha 2:
//         A = N. USP · B = Nome · C = e-mail · D = Observação · E = Perfil
//
// Papéis:
//   admin  (Perfil "ADMINISTRADOR") → vê e altera tudo.
//   leitor (Perfil "LEITOR", vazio ou desconhecido) → vê tudo, não altera.
//   Fora da aba → não abre o painel.
//
// Validado aqui, no servidor, em toda função que a página chama (o
// aviso "Somente leitura" na tela não é proteção). A conta só é
// identificada (Session.getActiveUser) para contas usp.br, o mesmo
// domínio de quem implantou. A lista fica em cache por 60 s: tirar
// alguém da aba vale em até 1 minuto. E-mails não vão para o log.
const ACESSO_PAINEL = {
  PROPRIEDADE_ID_INDEX: "ID_INDEX_SPREADSHEET_ID",
  CHAVE: "PERMISSOES_DE_ACESSO",
  ABA: "PAINEL_SERVIDORES",
  COL_EMAIL: 3,
  COL_PERFIL: 5,
  PERFIL_ADMIN: "ADMINISTRADOR",
  PERFIL_LEITOR: "LEITOR",
  CACHE: "permissoesPainelServidores",
  CACHE_SEGUNDOS: 60,
  CACHE_INDICE: "indicePainelServidores",
  CACHE_INDICE_SEGUNDOS: 600
};

const MENSAGEM_SO_LEITURA =
  "Você não tem permissão para fazer alterações. Seu acesso a este painel é somente leitura.";

function erroAcessoPainel_(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  return erro;
}

function normalizarEmailPainel_(valor) {
  return String(valor || "").replace(/[\s ​-‍﻿]+/g, "").toLowerCase();
}

/**
 * Quem está usando o painel e o seu papel.
 * Lança erro com codigo SEM_CONTA, SEM_ACESSO ou CONFIGURACAO.
 * @return {{email: string, papel: string}}  papel = "admin" | "leitor"
 */
function usuarioDoPainel_() {
  const email = normalizarEmailPainel_(Session.getActiveUser().getEmail());
  if (!email) {
    throw erroAcessoPainel_("SEM_CONTA",
      "Não foi possível identificar sua conta. Entre com a sua conta @usp.br no navegador e abra o painel de novo.");
  }
  const perfil = permissoesDoPainel_()[email];
  if (perfil === undefined) {
    throw erroAcessoPainel_("SEM_ACESSO",
      "Sua conta não tem acesso ao Painel de Sistemas. Se você precisa usá-lo, peça acesso ao Serviço de Graduação.");
  }
  return { email: email, papel: perfil === ACESSO_PAINEL.PERFIL_ADMIN ? "admin" : "leitor" };
}

/** No início de toda função pública só de leitura. */
function exigirAcessoPainel_() {
  try {
    return usuarioDoPainel_();
  } catch (erro) {
    registrarRecusaNaAuditoria_(erro);
    throw erro;
  }
}

/** No início de toda função pública que grava em planilha. */
function exigirAdminPainel_() {
  const usuario = exigirAcessoPainel_();
  if (usuario.papel !== "admin") {
    const erro = erroAcessoPainel_("SO_LEITURA", MENSAGEM_SO_LEITURA);
    registrarRecusaNaAuditoria_(erro);
    throw erro;
  }
  return usuario;
}

// A recusa vai para a auditoria (AuditoriaPainel.gs) sem nunca mudar a
// resposta: se a auditoria falhar, a recusa continua igual.
function registrarRecusaNaAuditoria_(erro) {
  try { registrarRecusaPainel_(erro); } catch (falha) { /* auditoria indisponível */ }
}

/** Usado pelo doGet: nunca lança erro. */
function verificarAcessoPainel_() {
  try {
    const usuario = usuarioDoPainel_();
    return { ok: true, papel: usuario.papel };
  } catch (erro) {
    if (erro && erro.codigo) return { ok: false, codigo: erro.codigo, mensagem: erro.message };
    console.error("Falha ao conferir o acesso ao painel: " + (erro && erro.message));
    return { ok: false, codigo: "CONFIGURACAO", mensagem: "Não foi possível conferir o seu acesso agora. Tente de novo em alguns minutos." };
  }
}

/** Página de acesso negado (tema GRADIP, sem nada do painel). */
function paginaSemAcessoPainel_(acesso) {
  try { registrarPaginaNegadaPainel_(acesso); } catch (falha) { /* auditoria indisponível */ }
  const pagina = HtmlService.createTemplateFromFile("PainelSemAcesso");
  pagina.titulo = acesso.codigo === "SEM_CONTA" ? "Conta não identificada"
    : acesso.codigo === "SEM_ACESSO" ? "Sem acesso a este painel"
    : "Não foi possível abrir o painel";
  pagina.mensagem = acesso.mensagem;
  return pagina.evaluate()
    .setTitle("Painel de Sistemas — Serviço de Graduação")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Papel para o scriptlet do Painel.html ("admin" ou "leitor"), como JSON. */
function papelParaPagina_() {
  return JSON.stringify(usuarioDoPainel_().papel);
}

function permissoesDoPainel_() {
  const cache = CacheService.getScriptCache();
  const emCache = cache.get(ACESSO_PAINEL.CACHE);
  if (emCache) {
    try { return JSON.parse(emCache); } catch (erro) { cache.remove(ACESSO_PAINEL.CACHE); }
  }
  const mapa = lerPermissoesDoPainel_();
  try { cache.put(ACESSO_PAINEL.CACHE, JSON.stringify(mapa), ACESSO_PAINEL.CACHE_SEGUNDOS); } catch (erro) { /* lista grande demais: lê a cada vez */ }
  return mapa;
}

function idPlanilhaPermissoes_() {
  return idNoIndicePainel_(ACESSO_PAINEL.CHAVE);
}

// Mapa chave → ID de Produção do ID_INDEX. Desde a 1.4 o painel acha todas
// as planilhas por ele (nenhum ID no código), então o índice é lido uma vez
// por execução e guardado no cache do script por alguns minutos. Chave que
// não está no mapa guardado força uma leitura nova (chave recém-criada).
let indicePainelLido_ = null;

function lerIndicePainel_() {
  const idIndice = String(PropertiesService.getScriptProperties().getProperty(ACESSO_PAINEL.PROPRIEDADE_ID_INDEX) || "").trim();
  if (!idIndice) {
    throw new Error("Falta a Script Property " + ACESSO_PAINEL.PROPRIEDADE_ID_INDEX + ".");
  }
  const aba = SpreadsheetApp.openById(idIndice).getSheets()[0];
  const valores = aba.getDataRange().getDisplayValues();
  const titulos = (valores[0] || []).map(t => normalizarSemAcento_(t));
  const colChave = titulos.indexOf("chave");
  const colId = titulos.indexOf("id de producao");
  if (colChave === -1 || colId === -1) {
    throw new Error('A planilha ID_INDEX precisa das colunas "Chave" e "ID de Produção".');
  }
  const mapa = {};
  for (let i = 1; i < valores.length; i++) {
    const chave = String(valores[i][colChave]).trim();
    const id = String(valores[i][colId] || "").trim();
    if (chave && id && !mapa[chave]) mapa[chave] = id;
  }
  indicePainelLido_ = mapa;
  try { CacheService.getScriptCache().put(ACESSO_PAINEL.CACHE_INDICE, JSON.stringify(mapa), ACESSO_PAINEL.CACHE_INDICE_SEGUNDOS); } catch (erro) { /* sem cache: lê a cada execução */ }
  return mapa;
}

/** ID de produção de uma chave da planilha ID_INDEX (primeira aba). */
function idNoIndicePainel_(chave) {
  let mapa = indicePainelLido_;
  if (!mapa) {
    try { mapa = JSON.parse(CacheService.getScriptCache().get(ACESSO_PAINEL.CACHE_INDICE) || "null"); } catch (erro) { mapa = null; }
  }
  if (!mapa || !mapa[chave]) mapa = lerIndicePainel_();
  if (mapa[chave]) return mapa[chave];
  throw new Error("Chave " + chave + " ausente ou sem ID de Produção no ID_INDEX.");
}

function lerPermissoesDoPainel_() {
  const aba = SpreadsheetApp.openById(idPlanilhaPermissoes_()).getSheetByName(ACESSO_PAINEL.ABA);
  if (!aba) throw new Error('A planilha de permissões não tem a aba "' + ACESSO_PAINEL.ABA + '".');
  const titulos = aba.getRange(1, 1, 1, ACESSO_PAINEL.COL_PERFIL).getDisplayValues()[0].map(t => normalizarSemAcento_(t));
  if (titulos[ACESSO_PAINEL.COL_EMAIL - 1].indexOf("mail") < 0 || titulos[ACESSO_PAINEL.COL_PERFIL - 1].indexOf("perfil") < 0) {
    throw new Error('Na aba "' + ACESSO_PAINEL.ABA + '", a coluna C deve ser o e-mail e a coluna E o Perfil (linha 1 = títulos).');
  }
  const mapa = {};
  const linhas = aba.getLastRow() - 1;
  if (linhas < 1) return mapa;
  aba.getRange(2, 1, linhas, ACESSO_PAINEL.COL_PERFIL).getDisplayValues().forEach(linha => {
    const email = normalizarEmailPainel_(linha[ACESSO_PAINEL.COL_EMAIL - 1]);
    if (email.indexOf("@") < 1) return;
    const perfil = normalizarSemAcento_(linha[ACESSO_PAINEL.COL_PERFIL - 1]).toUpperCase();
    const normal = perfil === ACESSO_PAINEL.PERFIL_ADMIN || perfil === ACESSO_PAINEL.PERFIL_LEITOR ? perfil : "";
    // E-mail repetido: vale o menor acesso.
    if (mapa[email] !== undefined && mapa[email] !== ACESSO_PAINEL.PERFIL_ADMIN) return;
    mapa[email] = normal;
  });
  return mapa;
}

// Rode no editor depois de configurar: mostra se a aba foi lida e
// quantas pessoas há por perfil (sem listar e-mails).
function diagnosticarAcessoPainel() {
  exigirAdminPainel_();
  CacheService.getScriptCache().remove(ACESSO_PAINEL.CACHE);
  const mapa = lerPermissoesDoPainel_();
  const contagem = { ADMINISTRADOR: 0, LEITOR: 0, "vazio ou desconhecido (= LEITOR)": 0 };
  Object.keys(mapa).forEach(email => {
    const perfil = mapa[email];
    if (perfil === ACESSO_PAINEL.PERFIL_ADMIN) contagem.ADMINISTRADOR++;
    else if (perfil === ACESSO_PAINEL.PERFIL_LEITOR) contagem.LEITOR++;
    else contagem["vazio ou desconhecido (= LEITOR)"]++;
  });
  try { registrarManutencaoPainel_("diagnosticarAcessoPainel", contagem); } catch (falha) { /* auditoria indisponível */ }
  console.log("Aba " + ACESSO_PAINEL.ABA + " lida: " + JSON.stringify(contagem));
  return contagem;
}

/**
 * Confere, no editor, se todas as planilhas que o painel usa são achadas
 * pelo ID_INDEX (1.4). Mostra o nome de cada planilha, nunca o ID.
 */
function diagnosticarPlanilhasPainel() {
  exigirAdminPainel_();
  CacheService.getScriptCache().remove(ACESSO_PAINEL.CACHE_INDICE);
  indicePainelLido_ = null;
  const chaves = [
    CHAVE_PLANILHA_DIPLOMAS, CHAVE_PLANILHA_HABILITACOES, CHAVE_PLANILHA_TRANCAMENTO_TOTAL,
    CHAVE_PLANILHA_TRANCAMENTO_PARCIAL, CHAVE_PLANILHA_BUSP, CHAVE_PLANILHA_INTERCAMBISTAS,
    CHAVE_PLANILHA_EXCLUSAO_DISCIPLINAS, CHAVE_PLANILHA_PERIODOS, CHAVE_PLANILHA_REGRAS_CURRICULARES,
    ACESSO_PAINEL.CHAVE, AUDITORIA_PAINEL.CHAVE, "SERVIDORES", "PLANILHA_DOCENTES"
  ];
  const resultado = {};
  chaves.forEach(chave => {
    try {
      resultado[chave] = "ok: " + SpreadsheetApp.openById(idNoIndicePainel_(chave)).getName();
    } catch (erro) {
      resultado[chave] = "FALHA: " + (erro && erro.message ? erro.message : erro);
    }
  });
  const falhas = Object.keys(resultado).filter(c => resultado[c].indexOf("FALHA") === 0);
  try { registrarManutencaoPainel_("diagnosticarPlanilhasPainel", { chaves: chaves.length, falhas: falhas }); } catch (falha) { /* auditoria indisponível */ }
  Object.keys(resultado).forEach(c => console.log(c + " → " + resultado[c]));
  return resultado;
}
