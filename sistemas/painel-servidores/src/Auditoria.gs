/*=====================================================
  AUDITORIA — núcleo comum (modelo para os outros sistemas)
=====================================================*/

// Grava cada ação numa planilha dedicada, só acrescentando linhas.
// Este arquivo não conhece o painel: o que é específico (qual
// planilha, quem é o usuário, o dicionário de eventos, como ler o
// estado de cada alteração) vem de AUDITORIA_CONFIG, definido em
// AuditoriaPainel.gs. Para levar a outro sistema, copie este arquivo
// sem mudar e escreva o arquivo de configuração dele
// (docs/auditoria/MODELO.md).
//
// Abas (criadas por prepararAuditoria_ ou na primeira gravação):
//   EVENTOS_<ano>     uma linha por ação
//   ALTERACOES_<ano>  uma linha por campo alterado (antes → depois)
//   SESSOES, RESUMO_DIARIO  consolidadas de madrugada (consolidarAuditoria_)
//   PENDENCIAS, DICIONARIO, LEIA-ME
//
// Integridade: cada evento leva seq (sequencial) e hash = SHA-256 da
// linha + hash do evento anterior; hash_alteracoes resume as linhas de
// ALTERACOES do evento. verificarIntegridadeAuditoria_ refaz a conta e
// aponta a primeira linha editada, apagada ou inserida à mão.
// Tudo é gravado como texto (formato "@"), para a leitura devolver
// exatamente o que entrou no hash.

const AUDITORIA_COLUNAS_EVENTOS = [
  "evento_id", "seq", "data_hora", "data_hora_navegador", "duracao_ms",
  "sessao_id", "evento_pai_id", "email", "nome", "tipo_conta", "perfil",
  "categoria", "evento", "criticidade", "tela", "alvo_tipo", "alvo_id",
  "resultado", "mensagem", "motivo", "origem", "detalhes", "n_alteracoes",
  "versao", "navegador", "largura_tela", "tema", "modo_navegacao",
  "hash_alteracoes", "hash_anterior", "hash"
];
const AUDITORIA_COLUNAS_ALTERACOES = [
  "evento_id", "data_hora", "email", "evento", "alvo_tipo", "alvo_id",
  "planilha", "campo", "valor_antes", "valor_depois"
];
const AUDITORIA_RESULTADOS = ["OK", "RECUSADO", "CONFLITO", "ERRO", "NEGADO"];
const AUDITORIA_PROPRIEDADE_ULTIMO = "AUDITORIA_ULTIMO_EVENTO";
const AUDITORIA_LIMITE_TEXTO = 500;
const AUDITORIA_LIMITE_DETALHES = 2000;

// Execução atual: planilha aberta e evento de alteração em andamento
// (eventoAuditoriaAtual_ deixa outro código ligar suas linhas a ele).
let auditoriaPlanilhaCache_ = null;
let auditoriaEventoAtual_ = "";

function eventoAuditoriaAtual_() {
  return auditoriaEventoAtual_;
}

function erroAuditoriaIndisponivel_(causa) {
  console.error("Auditoria indisponível: " + (causa && causa.message ? causa.message : causa));
  const erro = new Error("A auditoria está indisponível no momento, então nada foi alterado. Tente de novo em alguns minutos ou avise o Serviço de Graduação.");
  erro.codigo = "AUDITORIA_INDISPONIVEL";
  return erro;
}

function abrirPlanilhaAuditoria_() {
  if (!auditoriaPlanilhaCache_) auditoriaPlanilhaCache_ = SpreadsheetApp.openById(AUDITORIA_CONFIG.idPlanilha());
  return auditoriaPlanilhaCache_;
}

function anoAuditoria_(data) {
  return Utilities.formatDate(data || new Date(), AUDITORIA_CONFIG.fuso, "yyyy");
}

function agoraAuditoria_(data) {
  return Utilities.formatDate(data || new Date(), AUDITORIA_CONFIG.fuso, "yyyy-MM-dd HH:mm:ss.SSS");
}

/** Aba da auditoria; cria com cabeçalho, texto puro e proteção se faltar. */
function abaAuditoria_(nome, colunas) {
  const planilha = abrirPlanilhaAuditoria_();
  let aba = planilha.getSheetByName(nome);
  if (aba) return aba;
  try {
    aba = planilha.insertSheet(nome);
  } catch (erro) {
    // Outra execução criou a aba no mesmo instante.
    aba = planilha.getSheetByName(nome);
    if (aba) return aba;
    throw erro;
  }
  aba.getRange(1, 1, 1, colunas.length).setNumberFormat("@").setValues([colunas]).setFontWeight("bold");
  aba.setFrozenRows(1);
  protegerAbaAuditoria_(aba);
  return aba;
}

// Só a conta que executa o sistema (a dona) edita. Quem só vê a
// planilha continua vendo; ninguém altera à mão sem quebrar o hash.
function protegerAbaAuditoria_(aba) {
  try {
    const protecao = aba.protect().setDescription("Auditoria: só o sistema grava. Não edite.");
    const eu = Session.getEffectiveUser();
    protecao.addEditor(eu);
    protecao.removeEditors(protecao.getEditors().filter(e => e.getEmail() !== eu.getEmail()));
    if (protecao.canDomainEdit()) protecao.setDomainEdit(false);
  } catch (erro) {
    console.warn("Auditoria: proteção da aba " + aba.getName() + " não aplicada: " + erro.message);
  }
}

// Texto seguro para a célula: corta o tamanho e impede que um texto
// vindo da página ("=IMPORTXML(...)") vire fórmula.
function textoAuditoria_(valor, limite) {
  if (valor === null || valor === undefined) return "";
  let texto = valor instanceof Date ? agoraAuditoria_(valor) : (typeof valor === "object" ? JSON.stringify(valor) : String(valor));
  texto = texto.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const max = limite || AUDITORIA_LIMITE_TEXTO;
  if (texto.length > max) texto = texto.slice(0, max - 1) + "…";
  if (/^[=+\-@]/.test(texto)) texto = " " + texto;
  return texto;
}

function hashAuditoria_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(b => ("0" + (b & 0xff).toString(16)).slice(-2)).join("");
}

function hashLinhaEvento_(linha) {
  return hashAuditoria_(JSON.stringify(linha.slice(0, AUDITORIA_COLUNAS_EVENTOS.length - 1)));
}

function hashAlteracoes_(linhas) {
  return linhas.length ? hashAuditoria_(JSON.stringify(linhas)) : "";
}

// Último seq/hash: a última linha da aba do ano; numa aba nova (virada
// do ano), a propriedade guardada a cada gravação.
function ultimoEventoAuditoria_(aba) {
  const ultima = aba.getLastRow();
  if (ultima >= 2) {
    const v = aba.getRange(ultima, 1, 1, AUDITORIA_COLUNAS_EVENTOS.length).getDisplayValues()[0];
    return { seq: Number(v[1]) || 0, hash: v[AUDITORIA_COLUNAS_EVENTOS.length - 1] };
  }
  try {
    const salvo = JSON.parse(PropertiesService.getScriptProperties().getProperty(AUDITORIA_PROPRIEDADE_ULTIMO) || "null");
    if (salvo) return salvo;
  } catch (erro) { /* começa do zero */ }
  return { seq: 0, hash: "" };
}

function acrescentarLinhas_(aba, linhas, colunas) {
  if (!linhas.length) return;
  const inicio = aba.getLastRow() + 1;
  const falta = inicio + linhas.length - 1 - aba.getMaxRows();
  if (falta > 0) aba.insertRowsAfter(aba.getMaxRows(), Math.max(falta, 500));
  aba.getRange(inicio, 1, linhas.length, colunas).setNumberFormat("@").setValues(linhas);
}

/**
 * Grava eventos (e as alterações de cada um) numa escrita por aba.
 * Cada evento: { evento, resultado?, alvo_tipo?, alvo_id?, tela?, mensagem?,
 *   motivo?, detalhes?, duracao_ms?, sessao_id?, evento_pai_id?, evento_id?,
 *   origem?, data_hora_navegador?, contexto?: {versao?, navegador?, largura_tela?,
 *   tema?, modo_navegacao?}, alteracoes?: [{campo, antes, depois, alvo_tipo?,
 *   alvo_id?, planilha?}] }
 * Quem fez (e-mail, nome, perfil) vem sempre de AUDITORIA_CONFIG.usuario().
 * @return {string[]} evento_id de cada um
 */
function registrarEventosAuditoria_(eventos) {
  if (!eventos || !eventos.length) return [];
  const usuario = AUDITORIA_CONFIG.usuario();
  const dicionario = AUDITORIA_CONFIG.dicionario;
  const agora = new Date();
  const ano = anoAuditoria_(agora);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const abaEventos = abaAuditoria_("EVENTOS_" + ano, AUDITORIA_COLUNAS_EVENTOS);
    let anterior = ultimoEventoAuditoria_(abaEventos);
    const linhasEventos = [], linhasAlteracoes = [], ids = [];
    eventos.forEach(ev => {
      const def = dicionario[ev.evento];
      if (!def) throw new Error("Evento de auditoria desconhecido: " + ev.evento);
      const id = ev.evento_id || Utilities.getUuid();
      const dataHora = agoraAuditoria_(agora);
      const resultado = AUDITORIA_RESULTADOS.indexOf(ev.resultado) > -1 ? ev.resultado : "OK";
      const ctx = ev.contexto || {};
      const alteracoes = (ev.alteracoes || []).map(a => [
        id, dataHora, usuario.email, ev.evento,
        textoAuditoria_(a.alvo_tipo || ev.alvo_tipo, 60), textoAuditoria_(a.alvo_id || ev.alvo_id, 120),
        textoAuditoria_(a.planilha || def.planilha || "", 60), textoAuditoria_(a.campo, 200),
        textoAuditoria_(a.antes), textoAuditoria_(a.depois)
      ]);
      const linha = [
        id, String(anterior.seq + 1), dataHora, textoAuditoria_(ev.data_hora_navegador, 40), textoAuditoria_(ev.duracao_ms, 20),
        textoAuditoria_(ev.sessao_id, 60), textoAuditoria_(ev.evento_pai_id, 60),
        textoAuditoria_(usuario.email, 120), textoAuditoria_(usuario.nome, 120), textoAuditoria_(usuario.tipo, 20), textoAuditoria_(usuario.perfil, 20),
        def.categoria, ev.evento, def.criticidade, textoAuditoria_(ev.tela, 200),
        textoAuditoria_(ev.alvo_tipo, 60), textoAuditoria_(ev.alvo_id, 120), resultado,
        textoAuditoria_(ev.mensagem), textoAuditoria_(ev.motivo), ev.origem === "navegador" ? "navegador" : "servidor",
        textoAuditoria_(ev.detalhes, AUDITORIA_LIMITE_DETALHES), String(alteracoes.length),
        textoAuditoria_(ctx.versao || AUDITORIA_CONFIG.versao, 20), textoAuditoria_(ctx.navegador, 80), textoAuditoria_(ctx.largura_tela, 10),
        textoAuditoria_(ctx.tema, 10), textoAuditoria_(ctx.modo_navegacao, 10),
        hashAlteracoes_(alteracoes), anterior.hash
      ];
      linha.push(hashLinhaEvento_(linha));
      linhasEventos.push(linha);
      Array.prototype.push.apply(linhasAlteracoes, alteracoes);
      anterior = { seq: anterior.seq + 1, hash: linha[linha.length - 1] };
      ids.push(id);
    });
    if (linhasAlteracoes.length) {
      acrescentarLinhas_(abaAuditoria_("ALTERACOES_" + ano, AUDITORIA_COLUNAS_ALTERACOES), linhasAlteracoes, AUDITORIA_COLUNAS_ALTERACOES.length);
    }
    acrescentarLinhas_(abaEventos, linhasEventos, AUDITORIA_COLUNAS_EVENTOS.length);
    PropertiesService.getScriptProperties().setProperty(AUDITORIA_PROPRIEDADE_ULTIMO, JSON.stringify(anterior));
    return ids;
  } finally {
    lock.releaseLock();
  }
}

/** Para eventos que não podem atrapalhar o uso (acesso, leitura, recusa). */
function registrarEventoSemFalhar_(evento) {
  try {
    return registrarEventosAuditoria_([evento])[0];
  } catch (erro) {
    console.error("Auditoria: evento " + (evento && evento.evento) + " não gravado: " + erro.message);
    return "";
  }
}

// Mapa plano {caminho: texto} de um estado qualquer, para comparar.
function achatarEstado_(valor, prefixo, saida) {
  saida = saida || {};
  if (valor === null || valor === undefined) return saida;
  if (valor instanceof Date) { saida[prefixo] = agoraAuditoria_(valor); return saida; }
  if (typeof valor !== "object") { if (prefixo) saida[prefixo] = String(valor); return saida; }
  Object.keys(valor).forEach(chave => achatarEstado_(valor[chave], prefixo ? prefixo + "." + chave : chave, saida));
  return saida;
}

/** Campos que mudaram entre dois estados: [{campo, antes, depois}]. */
function diferencasAuditoria_(antes, depois) {
  const a = achatarEstado_(antes), d = achatarEstado_(depois);
  const campos = Object.keys(a).concat(Object.keys(d).filter(k => !(k in a)));
  return campos
    .filter(c => (a[c] === undefined ? "" : a[c]) !== (d[c] === undefined ? "" : d[c]))
    .map(c => ({ campo: c, antes: a[c] === undefined ? "" : a[c], depois: d[c] === undefined ? "" : d[c] }));
}

function resultadoDoErro_(erro) {
  if (erro && (erro.codigo === "SO_LEITURA" || erro.codigo === "SEM_ACESSO")) return "NEGADO";
  const msg = String(erro && erro.message || "");
  if (/mudou de posi|desde que voc|foi alterad[oa] por|recarregue/i.test(msg)) return "CONFLITO";
  if (erro && erro.codigo === "AUDITORIA_INDISPONIVEL") return "ERRO";
  return "RECUSADO";
}

/**
 * Executa uma alteração já autorizada e grava antes/depois.
 * def: { evento, alvo_tipo, alvo_id, alvoDoResultado?, planilha?, motivo?, sessao_id?, tela?, contexto?,
 *        estado?: (resultado?) => objeto,   // lido antes e depois
 *        detalhes?: (resultado) => objeto,
 *        mapearAlteracao?: ({campo, antes, depois}) => linha de ALTERACOES,
 *        efeitos?: (alteracoes, eventoId) => [eventos filhos] }
 * Se a planilha da auditoria não abrir, nada é alterado.
 */
function auditarAlteracao_(def, executar) {
  try {
    abaAuditoria_("EVENTOS_" + anoAuditoria_(), AUDITORIA_COLUNAS_EVENTOS);
  } catch (erro) {
    throw erroAuditoriaIndisponivel_(erro);
  }
  const eventoId = Utilities.getUuid();
  const inicio = Date.now();
  const lerEstado = r => { try { return def.estado ? def.estado(r) : null; } catch (erro) { return { erro_ao_ler_estado: erro.message }; } };
  const antes = lerEstado();
  let resultado;
  auditoriaEventoAtual_ = eventoId;
  try {
    resultado = executar();
  } catch (erro) {
    auditoriaEventoAtual_ = "";
    registrarEventoSemFalhar_({
      evento_id: eventoId, evento: def.evento, alvo_tipo: def.alvo_tipo, alvo_id: def.alvo_id,
      resultado: resultadoDoErro_(erro), mensagem: erro && erro.message, motivo: def.motivo,
      duracao_ms: Date.now() - inicio, sessao_id: def.sessao_id, tela: def.tela, contexto: def.contexto
    });
    throw erro;
  }
  auditoriaEventoAtual_ = "";
  try {
    const depois = lerEstado(resultado);
    const alteracoes = def.estado ? diferencasAuditoria_(antes, depois)
      .map(def.mapearAlteracao || (a => a)).map(a => Object.assign({ planilha: def.planilha }, a)) : [];
    const principal = {
      evento_id: eventoId, evento: def.evento, alvo_tipo: def.alvo_tipo,
      alvo_id: def.alvo_id || (def.alvoDoResultado ? def.alvoDoResultado(resultado) : ""),
      resultado: "OK", motivo: def.motivo, duracao_ms: Date.now() - inicio, sessao_id: def.sessao_id,
      tela: def.tela, contexto: def.contexto,
      detalhes: def.detalhes ? def.detalhes(resultado) : "", alteracoes: alteracoes
    };
    const filhos = def.efeitos ? def.efeitos(alteracoes, eventoId) : [];
    registrarEventosAuditoria_([principal].concat(filhos));
  } catch (erro) {
    // A alteração já foi feita: não a desfazemos, mas o erro fica no
    // log de execuções para conferência (MANUAL_OPERACAO).
    console.error("Auditoria: alteração " + def.evento + " feita, mas o evento não foi gravado: " + erro.message);
  }
  return resultado;
}

/*-----------------------------------------------------
  CONFERÊNCIA DE INTEGRIDADE
------------------------------------------------------*/

function abasAuditoriaPorAno_(prefixo) {
  return abrirPlanilhaAuditoria_().getSheets()
    .filter(a => new RegExp("^" + prefixo + "_\\d{4}$").test(a.getName()))
    .sort((x, y) => x.getName().localeCompare(y.getName()));
}

/** Refaz a corrente de hashes. Não muda nada. */
function verificarIntegridadeAuditoria_() {
  const n = AUDITORIA_COLUNAS_EVENTOS.length;
  const porEvento = {};
  abasAuditoriaPorAno_("ALTERACOES").forEach(aba => {
    if (aba.getLastRow() < 2) return;
    aba.getRange(2, 1, aba.getLastRow() - 1, AUDITORIA_COLUNAS_ALTERACOES.length).getDisplayValues().forEach(l => {
      (porEvento[l[0]] = porEvento[l[0]] || []).push(l);
    });
  });
  const problemas = [];
  let anterior = { seq: 0, hash: "" }, total = 0, primeiraAba = true;
  abasAuditoriaPorAno_("EVENTOS").forEach(aba => {
    if (aba.getLastRow() < 2) return;
    aba.getRange(2, 1, aba.getLastRow() - 1, n).getDisplayValues().forEach((l, i) => {
      const onde = { aba: aba.getName(), linha: i + 2, seq: l[1] };
      total++;
      if (hashLinhaEvento_(l) !== l[n - 1]) problemas.push(Object.assign({ problema: "linha alterada" }, onde));
      if (!(primeiraAba && i === 0) && (Number(l[1]) !== anterior.seq + 1 || l[n - 2] !== anterior.hash)) {
        problemas.push(Object.assign({ problema: "corrente quebrada (linha apagada, inserida ou fora de ordem)" }, onde));
      }
      if (hashAlteracoes_(porEvento[l[0]] || []) !== l[n - 3]) problemas.push(Object.assign({ problema: "alterações do evento mudaram" }, onde));
      anterior = { seq: Number(l[1]), hash: l[n - 1] };
    });
    primeiraAba = false;
  });
  return { eventos: total, ok: problemas.length === 0, problemas: problemas.slice(0, 50) };
}

/*-----------------------------------------------------
  CONSOLIDAÇÃO (SESSOES e RESUMO_DIARIO), de madrugada
------------------------------------------------------*/

const AUDITORIA_COLUNAS_SESSOES = [
  "data", "sessao_id", "email", "nome", "perfil", "inicio", "fim", "duracao_min",
  "n_eventos", "n_alteracoes", "n_recusas", "telas", "navegador", "largura_tela"
];
const AUDITORIA_COLUNAS_RESUMO = [
  "data", "acessos", "pessoas", "acessos_negados", "cards_abertos", "alteracoes",
  "recusas", "erros", "tempo_carga_medio_ms", "cards_por_sistema", "eventos_por_codigo"
];
const AUDITORIA_PROPRIEDADE_CONSOLIDADO = "AUDITORIA_CONSOLIDADO_ATE";

/** Acrescenta SESSOES e RESUMO_DIARIO dos dias fechados ainda não consolidados. */
function consolidarAuditoria_() {
  const props = PropertiesService.getScriptProperties();
  const hoje = Utilities.formatDate(new Date(), AUDITORIA_CONFIG.fuso, "yyyy-MM-dd");
  const ate = props.getProperty(AUDITORIA_PROPRIEDADE_CONSOLIDADO) || "";
  const col = {};
  AUDITORIA_COLUNAS_EVENTOS.forEach((c, i) => { col[c] = i; });
  const dias = {};
  abasAuditoriaPorAno_("EVENTOS").forEach(aba => {
    if (aba.getLastRow() < 2) return;
    aba.getRange(2, 1, aba.getLastRow() - 1, AUDITORIA_COLUNAS_EVENTOS.length).getDisplayValues().forEach(l => {
      const dia = l[col.data_hora].slice(0, 10);
      if (dia >= hoje || (ate && dia <= ate)) return;
      (dias[dia] = dias[dia] || []).push(l);
    });
  });
  const linhasSessoes = [], linhasResumo = [];
  Object.keys(dias).sort().forEach(dia => {
    const evs = dias[dia];
    const sessoes = {};
    const contar = (lista, f) => lista.filter(f).length;
    evs.forEach(l => {
      const id = l[col.sessao_id];
      if (!id) return;
      const s = sessoes[id] = sessoes[id] || { linhas: [] };
      s.linhas.push(l);
    });
    Object.keys(sessoes).forEach(id => {
      const ls = sessoes[id].linhas, p = ls[0], u = ls[ls.length - 1];
      const ini = p[col.data_hora], fim = u[col.data_hora];
      const minutos = Math.round((Date.parse(fim.replace(" ", "T")) - Date.parse(ini.replace(" ", "T"))) / 60000);
      const telas = {};
      ls.forEach(l => { if (l[col.tela]) telas[l[col.tela]] = true; });
      linhasSessoes.push([dia, id, p[col.email], p[col.nome], p[col.perfil], ini, fim, String(isNaN(minutos) ? "" : minutos),
        String(ls.length), String(ls.reduce((t, l) => t + (Number(l[col.n_alteracoes]) || 0), 0)),
        String(contar(ls, l => l[col.resultado] === "NEGADO" || l[col.resultado] === "RECUSADO")),
        textoAuditoria_(Object.keys(telas).join(" | ")), p[col.navegador], p[col.largura_tela]]);
    });
    const acessos = evs.filter(l => l[col.evento] === "ACESSO.ABRIR");
    const tempos = acessos.map(l => Number(l[col.duracao_ms])).filter(x => x > 0);
    const porCard = {}, porCodigo = {};
    evs.forEach(l => {
      porCodigo[l[col.evento]] = (porCodigo[l[col.evento]] || 0) + 1;
      if (l[col.evento] === "CARD.ABRIR") porCard[l[col.alvo_id]] = (porCard[l[col.alvo_id]] || 0) + 1;
    });
    const pessoas = {};
    acessos.forEach(l => { pessoas[l[col.email]] = true; });
    linhasResumo.push([dia, String(acessos.length), String(Object.keys(pessoas).length),
      String(contar(evs, l => l[col.evento] === "ACESSO.NEGAR")), String(porCodigo["CARD.ABRIR"] || 0),
      String(contar(evs, l => l[col.categoria] === "Alteração" && l[col.resultado] === "OK")),
      String(contar(evs, l => ["RECUSADO", "NEGADO", "CONFLITO"].indexOf(l[col.resultado]) > -1)),
      String(contar(evs, l => l[col.categoria] === "Erro" || l[col.resultado] === "ERRO")),
      String(tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : ""),
      textoAuditoria_(porCard, AUDITORIA_LIMITE_DETALHES), textoAuditoria_(porCodigo, AUDITORIA_LIMITE_DETALHES)]);
  });
  if (!linhasResumo.length) return { dias: 0 };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    acrescentarLinhas_(abaAuditoria_("SESSOES", AUDITORIA_COLUNAS_SESSOES), linhasSessoes, AUDITORIA_COLUNAS_SESSOES.length);
    acrescentarLinhas_(abaAuditoria_("RESUMO_DIARIO", AUDITORIA_COLUNAS_RESUMO), linhasResumo, AUDITORIA_COLUNAS_RESUMO.length);
    props.setProperty(AUDITORIA_PROPRIEDADE_CONSOLIDADO, linhasResumo[linhasResumo.length - 1][0]);
  } finally {
    lock.releaseLock();
  }
  return { dias: linhasResumo.length, sessoes: linhasSessoes.length };
}

/*-----------------------------------------------------
  PREPARAÇÃO DA PLANILHA (uma vez, pelo administrador)
------------------------------------------------------*/

function prepararAuditoria_(nomeFuncaoGatilho) {
  const planilha = abrirPlanilhaAuditoria_();
  const ano = anoAuditoria_();
  abaAuditoria_("EVENTOS_" + ano, AUDITORIA_COLUNAS_EVENTOS);
  abaAuditoria_("ALTERACOES_" + ano, AUDITORIA_COLUNAS_ALTERACOES);
  abaAuditoria_("SESSOES", AUDITORIA_COLUNAS_SESSOES);
  abaAuditoria_("RESUMO_DIARIO", AUDITORIA_COLUNAS_RESUMO);
  if (AUDITORIA_CONFIG.colunasPendencias) abaAuditoria_("PENDENCIAS", ["data_hora", "email"].concat(AUDITORIA_CONFIG.colunasPendencias));

  // DICIONARIO e LEIA-ME são reescritos a cada preparação (documentação).
  const dic = planilha.getSheetByName("DICIONARIO") || abaAuditoria_("DICIONARIO", ["evento", "categoria", "criticidade", "origem", "descricao", "desde"]);
  const linhasDic = Object.keys(AUDITORIA_CONFIG.dicionario).sort().map(k => {
    const d = AUDITORIA_CONFIG.dicionario[k];
    return [k, d.categoria, d.criticidade, d.origem, d.descricao, d.desde];
  });
  dic.getRange(2, 1, Math.max(dic.getMaxRows() - 1, 1), 6).clearContent();
  acrescentarLinhas_(dic, linhasDic, 6);

  const leia = planilha.getSheetByName("LEIA-ME") || abaAuditoria_("LEIA-ME", ["tema", "texto"]);
  leia.getRange(2, 1, Math.max(leia.getMaxRows() - 1, 1), 2).clearContent();
  acrescentarLinhas_(leia, AUDITORIA_CONFIG.leiaMe(), 2);

  // A aba vazia que vem com a planilha nova sai, se estiver vazia.
  ["Página1", "Sheet1"].forEach(nome => {
    const vazia = planilha.getSheetByName(nome);
    if (vazia && vazia.getLastRow() === 0 && planilha.getSheets().length > 1) planilha.deleteSheet(vazia);
  });

  let gatilho = "já existia";
  if (nomeFuncaoGatilho && !ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === nomeFuncaoGatilho)) {
    ScriptApp.newTrigger(nomeFuncaoGatilho).timeBased().everyDays(1).atHour(2).inTimezone(AUDITORIA_CONFIG.fuso).create();
    gatilho = "criado (todo dia, 2h)";
  }
  return { abas: planilha.getSheets().map(a => a.getName()), eventosNoDicionario: linhasDic.length, gatilho: gatilho };
}
