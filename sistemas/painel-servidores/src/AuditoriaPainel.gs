/*=====================================================
  AUDITORIA DO PAINEL — o que é específico deste sistema
=====================================================*/

// O núcleo (Auditoria.gs) grava; este arquivo diz o quê:
//
//   planilha   chave AUDITORIA_PAINEL_SERVIDORES do ID_INDEX
//   quem       e-mail (Session), perfil (aba PAINEL_SERVIDORES),
//              nome e tipo de conta (cadastros da SaudacaoPainel.gs)
//   eventos    AUDITORIA_EVENTOS_PAINEL, abaixo (vira a aba DICIONARIO)
//   antes/depois  linha da planilha de Períodos (Formulários) e o
//              ruleset inteiro, por id (Regras Curriculares)
//
// Toda função pública que grava passa por auditarAlteracao_: se a
// planilha da auditoria não abrir, a alteração é recusada. Navegação,
// leitura e ajuda nunca são bloqueadas pela auditoria (decisão 1 da
// proposta, docs/auditoria/README.md).
//
// A página manda os eventos dela em lotes (AuditoriaPainelUI.html →
// registrarEventosPainel). O servidor aceita só os códigos de origem
// "navegador" e sempre põe e-mail, nome e perfil por conta própria.

const AUDITORIA_PAINEL = {
  CHAVE: "AUDITORIA_PAINEL_SERVIDORES",
  VERSAO: "1.4",
  MAX_LOTE: 50,
  CACHE_CONTEXTO: "auditoriaContexto:",
  CACHE_CONTEXTO_SEGUNDOS: 21600,
  CACHE_PENDENCIAS: "auditoriaPendencias",
  CACHE_PENDENCIAS_SEGUNDOS: 3600,
  FUNCAO_GATILHO: "consolidarAuditoriaPainel"
};

const PENDENCIAS_AUDITORIA_PAINEL = [
  "diplomas", "habilitacoes", "trancamentoTotal", "trancamentoParcial", "busp",
  "buspAguardando", "intercambistasInclusao", "intercambistasExclusao", "exclusaoDisciplinas"
];

// codigo: categoria · criticidade · origem · descrição (vai para a aba DICIONARIO)
const AUDITORIA_EVENTOS_PAINEL = {
  "ACESSO.ABRIR":        ["Acesso", "baixa", "navegador", "Abriu o painel. duracao_ms = tempo de carregamento da página."],
  "ACESSO.NEGAR":        ["Acesso", "alta", "servidor", "Conta fora da aba PAINEL_SERVIDORES (ou não identificada) tentou abrir o painel ou chamar uma função dele."],
  "PERMISSAO.RECUSAR":   ["Acesso", "alta", "servidor", "Perfil LEITOR tentou gravar; o servidor recusou. alvo_id = função chamada."],
  "TELA.ABRIR":          ["Navegação", "baixa", "navegador", "Mudou de tela (Sistemas, Configurações, Formulários, Regras Curriculares, editor de ruleset)."],
  "NAVEGACAO.MODO":      ["Navegação", "baixa", "navegador", "Trocou entre menu lateral e abas."],
  "TEMA.TROCAR":         ["Navegação", "baixa", "navegador", "Trocou a aparência (Sistema, Claro, Escuro)."],
  "JANELA.ABRIR":        ["Navegação", "baixa", "navegador", "Abriu uma janela (modal) de edição das Regras Curriculares."],
  "FORMULARIO.ABRIR":    ["Navegação", "baixa", "navegador", "Abriu a configuração de um formulário."],
  "FORMULARIO.FECHAR":   ["Navegação", "baixa", "navegador", "Fechou a configuração de um formulário (salvando ou não). duracao_ms = tempo com a janela aberta."],
  "RULESET.ABRIR":       ["Navegação", "baixa", "navegador", "Abriu um ruleset no editor das Regras Curriculares."],
  "RULESET.ABA":         ["Navegação", "baixa", "navegador", "Trocou de aba no editor de ruleset."],
  "RULESET.HISTORICO":   ["Navegação", "baixa", "navegador", "Abriu o histórico de revisões de um ruleset."],
  "RULESET.VALIDAR":     ["Leitura", "média", "servidor", "Pediu a validação de um ruleset. detalhes = válido ou não e quantos erros."],
  "CARD.ABRIR":          ["Sistemas", "média", "navegador", "Clicou num card e abriu um sistema. alvo_id = nome do sistema (a URL não é gravada)."],
  "BUSCA.SISTEMAS":      ["Sistemas", "baixa", "navegador", "Buscou na lista de sistemas. mensagem = termo; detalhes = quantos apareceram."],
  "AJUDA.ABRIR":         ["Ajuda", "baixa", "navegador", "Abriu a Central de Ajuda. alvo_id = seção, quando aberta por um ?."],
  "AJUDA.BUSCAR":        ["Ajuda", "baixa", "navegador", "Buscou na Central de Ajuda. mensagem = termo; detalhes = resultado da busca."],
  "AJUDA.FAQ":           ["Ajuda", "baixa", "navegador", "Abriu ou fechou uma pergunta do FAQ."],
  "ERRO.NAVEGADOR":      ["Erro", "média", "navegador", "Erro de JavaScript na página (sem dados do usuário)."],
  "FORMULARIO.SALVAR":   ["Alteração", "alta", "servidor", "Salvou abertura e encerramento de um formulário (Sazonal ou Contínuo)."],
  "FORMULARIO.COLACAO.SALVAR":  ["Alteração", "alta", "servidor", "Salvou o período do Pedido de Colação de Grau."],
  "FORMULARIO.EXCLUSAO.SALVAR": ["Alteração", "alta", "servidor", "Salvou o período do Formulário de Exclusão de Disciplinas."],
  "FORMULARIO.DESATIVAR":       ["Alteração", "alta", "servidor", "Desativou um formulário (apagou datas e horários)."],
  "RULESET.DADOS.SALVAR":  ["Alteração", "alta", "servidor", "Salvou os dados gerais de um ruleset."],
  "REQUISITO.SALVAR":      ["Alteração", "alta", "servidor", "Criou ou editou um requisito numérico."],
  "REQUISITO.EXCLUIR":     ["Alteração", "alta", "servidor", "Excluiu um requisito numérico."],
  "DISCIPLINA.SALVAR":     ["Alteração", "alta", "servidor", "Criou ou editou uma disciplina do ruleset."],
  "DISCIPLINA.EXCLUIR":    ["Alteração", "alta", "servidor", "Excluiu uma disciplina do ruleset."],
  "GRUPO.SALVAR":          ["Alteração", "alta", "servidor", "Criou ou editou um grupo de regras."],
  "GRUPO.EXCLUIR":         ["Alteração", "alta", "servidor", "Excluiu um grupo de regras."],
  "RULESET.ATIVAR":        ["Alteração", "alta", "servidor", "Ativou um ruleset."],
  "RULESET.INATIVAR":      ["Alteração", "alta", "servidor", "Inativou um ruleset."],
  "RULESET.INATIVAR_AUTOMATICO": ["Alteração", "alta", "servidor", "Ruleset inativado sozinho porque outro da mesma estrutura foi ativado. evento_pai_id = a ativação."],
  "RULESET.NOVA_VERSAO":   ["Alteração", "alta", "servidor", "Criou uma nova versão de um ruleset (cópia em RASCUNHO)."],
  "RULESET.OUTRO_CURRICULO": ["Alteração", "alta", "servidor", "Criou regras para outro currículo a partir de um ruleset."],
  "REGRAS.MIGRAR":         ["Alteração", "alta", "servidor", "Rodou a migração administrativa das Regras Curriculares (editor do Apps Script)."],
  "MANUTENCAO.EXECUTAR":   ["Manutenção", "média", "servidor", "Rodou uma função de manutenção (preparar ou conferir a auditoria, consolidar, diagnósticos)."]
};

const AUDITORIA_CONFIG = {
  versao: AUDITORIA_PAINEL.VERSAO,
  get fuso() { return TIMEZONE; },
  idPlanilha: () => idNoIndicePainel_(AUDITORIA_PAINEL.CHAVE),
  colunasPendencias: PENDENCIAS_AUDITORIA_PAINEL,
  get dicionario() {
    const d = {};
    Object.keys(AUDITORIA_EVENTOS_PAINEL).forEach(codigo => {
      const e = AUDITORIA_EVENTOS_PAINEL[codigo];
      d[codigo] = { categoria: e[0], criticidade: e[1], origem: e[2], descricao: e[3], desde: "1.3" };
    });
    return d;
  },
  usuario: () => {
    const email = normalizarEmailPainel_(Session.getActiveUser().getEmail());
    let perfil = "";
    try {
      perfil = usuarioDoPainel_().papel === "admin" ? ACESSO_PAINEL.PERFIL_ADMIN : ACESSO_PAINEL.PERFIL_LEITOR;
    } catch (erro) {
      perfil = erro && erro.codigo ? erro.codigo : "";
    }
    let pessoa = {};
    try { if (email) pessoa = pessoaDoPainel_(email); } catch (erro) { /* sem nome */ }
    return { email: email, nome: pessoa.nome || "", tipo: pessoa.tipo || "", perfil: perfil };
  },
  leiaMe: () => [
    ["O que é", "Auditoria do Painel de Sistemas dos servidores (versão " + AUDITORIA_PAINEL.VERSAO + "). Cada ação no painel vira uma linha em EVENTOS_<ano>; cada campo alterado vira uma linha em ALTERACOES_<ano>, ligada pelo evento_id."],
    ["Quem grava", "Só o próprio painel, com a conta que o implantou. As abas são protegidas. Não edite, não ordene, não apague linhas: a conferência de integridade aponta qualquer mudança."],
    ["Quem pode abrir", "Só a conta institucional do Serviço de Graduação. Não compartilhe esta planilha."],
    ["Integridade", "Cada evento tem seq (sequencial) e hash (SHA-256 da linha + hash do evento anterior). Para conferir, rode verificarIntegridadeAuditoria no editor do Apps Script do painel."],
    ["Se a auditoria falhar", "Alterações (Formulários e Regras) são recusadas e nada muda. Navegação, ajuda e leitura continuam funcionando, sem registro."],
    ["Abas", "EVENTOS_<ano> · ALTERACOES_<ano> · SESSOES e RESUMO_DIARIO (consolidadas toda madrugada, para o painel de auditoria) · PENDENCIAS (contagem dos cards, no máximo uma vez por hora) · DICIONARIO (o que cada código significa) · LEIA-ME."],
    ["Sessão", "sessao_id identifica uma aba do navegador aberta no painel. A duração da sessão é estimada pelo último evento (não há sinal de \"saiu\")."],
    ["Não grava", "IP (o Apps Script não informa), URLs dos sistemas, conteúdo de solicitações de alunos."],
    ["Retenção", "Nada é apagado automaticamente. Prazo de guarda: A VALIDAR INSTITUCIONALMENTE."],
    ["Documentação", "docs/auditoria/ e docs/sistemas/painel-servidores/ no repositório dos sistemas."]
  ]
};

/*-----------------------------------------------------
  CONTEXTO DA PÁGINA (sessão, tela, navegador)
------------------------------------------------------*/

// O último lote de cada pessoa deixa aqui a sessão e a tela; as
// alterações (que vêm por outras funções) usam isso para ligar o
// evento à mesma sessão. Com duas abas abertas, vale a última ativa.
function chaveContextoAuditoria_() {
  const email = normalizarEmailPainel_(Session.getActiveUser().getEmail());
  return email ? AUDITORIA_PAINEL.CACHE_CONTEXTO + email : "";
}

function contextoAuditoriaPainel_() {
  try {
    const chave = chaveContextoAuditoria_();
    const salvo = chave && CacheService.getScriptCache().get(chave);
    return salvo ? JSON.parse(salvo) : {};
  } catch (erro) {
    return {};
  }
}

/** Sessão nova para o scriptlet do Painel.html, como JSON. */
function sessaoAuditoriaParaPagina_() {
  return JSON.stringify(Utilities.getUuid());
}

/*-----------------------------------------------------
  EVENTOS VINDOS DA PÁGINA
------------------------------------------------------*/

const CAMPOS_EVENTO_NAVEGADOR = ["evento", "tela", "alvo_tipo", "alvo_id", "mensagem", "detalhes", "duracao_ms", "data_hora_navegador"];

/**
 * Lote da AuditoriaPainelUI.html: { sessao_id, contexto, eventos: [...] }.
 * @return {{gravados: number}}
 */
function registrarEventosPainel(lote) {
  exigirAcessoPainel_();
  if (!lote || !Array.isArray(lote.eventos)) throw new Error("Lote de auditoria inválido.");
  if (lote.eventos.length > AUDITORIA_PAINEL.MAX_LOTE) throw new Error("Lote de auditoria grande demais.");
  const sessao = /^[0-9a-f-]{36}$/i.test(String(lote.sessao_id || "")) ? String(lote.sessao_id) : "";
  const c = lote.contexto || {};
  const contexto = {
    versao: AUDITORIA_PAINEL.VERSAO,
    navegador: textoAuditoria_(c.navegador, 80),
    largura_tela: textoAuditoria_(parseInt(c.largura_tela, 10) || "", 10),
    tema: ["light", "dark"].indexOf(c.tema) > -1 ? c.tema : "",
    modo_navegacao: ["sidebar", "abas"].indexOf(c.modo_navegacao) > -1 ? c.modo_navegacao : ""
  };
  const eventos = lote.eventos.map(bruto => {
    const def = AUDITORIA_EVENTOS_PAINEL[bruto && bruto.evento];
    if (!def || def[2] !== "navegador") throw new Error("Evento de auditoria não aceito da página: " + (bruto && bruto.evento));
    const ev = { origem: "navegador", sessao_id: sessao, contexto: contexto };
    CAMPOS_EVENTO_NAVEGADOR.forEach(campo => { if (bruto[campo] !== undefined) ev[campo] = bruto[campo]; });
    if (ev.duracao_ms !== undefined) ev.duracao_ms = Math.max(0, Math.round(Number(ev.duracao_ms) || 0));
    return ev;
  });
  registrarEventosAuditoria_(eventos);
  const ultimo = eventos.length ? eventos[eventos.length - 1] : {};
  try {
    const chave = chaveContextoAuditoria_();
    if (chave) {
      CacheService.getScriptCache().put(chave, JSON.stringify({ sessao_id: sessao, tela: ultimo.tela || "", contexto: contexto }),
        AUDITORIA_PAINEL.CACHE_CONTEXTO_SEGUNDOS);
    }
  } catch (erro) { /* só perde a ligação com a sessão */ }
  return { gravados: eventos.length };
}

/*-----------------------------------------------------
  RECUSAS (chamadas por AcessoPainel.gs; nunca falham)
------------------------------------------------------*/

// Nome da função pública que estava sendo chamada: a primeira da
// pilha sem "_" no fim (as internas terminam com "_").
function funcaoPublicaChamada_() {
  const linhas = String(new Error().stack || "").split("\n");
  for (let i = 1; i < linhas.length; i++) {
    const m = linhas[i].match(/at (?:Object\.)?([A-Za-z0-9]+) /);
    if (m && !/_$/.test(m[1])) return m[1];
  }
  return "";
}

function registrarRecusaPainel_(erro) {
  const codigo = erro && erro.codigo;
  const leitura = codigo === "SO_LEITURA";
  if (!leitura && codigo !== "SEM_ACESSO" && codigo !== "SEM_CONTA") return;
  const ctx = contextoAuditoriaPainel_();
  registrarEventoSemFalhar_({
    evento: leitura ? "PERMISSAO.RECUSAR" : "ACESSO.NEGAR", resultado: "NEGADO",
    alvo_tipo: "funcao", alvo_id: funcaoPublicaChamada_(), mensagem: codigo,
    sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto
  });
}

/** doGet recusou a página (PainelSemAcesso). */
function registrarPaginaNegadaPainel_(acesso) {
  registrarEventoSemFalhar_({ evento: "ACESSO.NEGAR", resultado: "NEGADO", alvo_tipo: "pagina", alvo_id: "Painel", mensagem: acesso && acesso.codigo });
}

/*-----------------------------------------------------
  PENDÊNCIAS (contagem dos cards), no máximo uma vez por hora
------------------------------------------------------*/

function registrarPendenciasPainel_(contadores) {
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get(AUDITORIA_PAINEL.CACHE_PENDENCIAS)) return;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return;
    try {
      const linha = [agoraAuditoria_(), textoAuditoria_(AUDITORIA_CONFIG.usuario().email, 120)]
        .concat(PENDENCIAS_AUDITORIA_PAINEL.map(k => String(Number(contadores && contadores[k]) || 0)));
      const colunas = ["data_hora", "email"].concat(PENDENCIAS_AUDITORIA_PAINEL);
      acrescentarLinhas_(abaAuditoria_("PENDENCIAS", colunas), [linha], colunas.length);
      cache.put(AUDITORIA_PAINEL.CACHE_PENDENCIAS, "1", AUDITORIA_PAINEL.CACHE_PENDENCIAS_SEGUNDOS);
    } finally {
      lock.releaseLock();
    }
  } catch (erro) {
    console.error("Auditoria: pendências não gravadas: " + erro.message);
  }
}

/*-----------------------------------------------------
  ANTES E DEPOIS
------------------------------------------------------*/

// Formulários: a linha inteira da planilha de Períodos (A até Q), com o
// título de cada coluna, como aparece na planilha.
function estadoFormularioAuditoria_(linha) {
  const n = Number(linha);
  if (!(n >= 2)) return {};
  const aba = obterAbaPeriodos_();
  const ultima = obterUltimaColunaLeituraPeriodos_();
  const titulos = aba.getRange(1, 1, 1, ultima).getDisplayValues()[0];
  const valores = aba.getRange(n, 1, 1, ultima).getDisplayValues()[0];
  const estado = {};
  valores.forEach((v, i) => {
    estado[String.fromCharCode(65 + i) + (titulos[i] ? " " + String(titulos[i]).trim() : "")] = v;
  });
  return estado;
}

function porIdAuditoria_(lista, campoId) {
  const mapa = {};
  lista.forEach(item => { mapa[String(item[campoId])] = despojarSnapshotToken_(item); });
  return mapa;
}

// Regras: o ruleset inteiro (dados gerais + requisitos, disciplinas e
// grupos por id), para que o antes/depois pegue também a revisão que
// a correção de um ATIVO avança.
function estadoRulesetAuditoria_(rulesetId) {
  if (!rulesetId) return {};
  const r = repoLocalizarRuleset_(rulesetId);
  return {
    ruleset: r ? despojarSnapshotToken_(r.dados) : null,
    requisitos: porIdAuditoria_(repoListarRequisitos_(rulesetId), "requisito_id"),
    disciplinas: porIdAuditoria_(repoListarDisciplinas_(rulesetId), "regra_disciplina_id"),
    grupos: porIdAuditoria_(repoListarGrupos_(rulesetId), "grupo_id")
  };
}

// Ativar/inativar: a linha do ruleset e o status de todos (a ativação
// pode inativar outro da mesma estrutura).
function estadoStatusRulesetsAuditoria_(rulesetId) {
  const r = repoLocalizarRuleset_(rulesetId);
  const status = {};
  repoListarRulesets_().forEach(x => { status[String(x.ruleset_id)] = String(x.status || ""); });
  return { ruleset: r ? despojarSnapshotToken_(r.dados) : null, status_rulesets: status };
}

// Ruleset recém-criado: a linha dele e quantos itens foram copiados.
function estadoRulesetCriadoAuditoria_(rulesetId) {
  if (!rulesetId) return {};
  const r = repoLocalizarRuleset_(rulesetId);
  return {
    ruleset: r ? despojarSnapshotToken_(r.dados) : null,
    copiados: {
      requisitos: repoListarRequisitos_(rulesetId).length,
      disciplinas: repoListarDisciplinas_(rulesetId).length,
      grupos: repoListarGrupos_(rulesetId).length
    }
  };
}

const ENTIDADES_REGRAS_AUDITORIA = { requisitos: "requisito", disciplinas: "disciplina", grupos: "grupo", ruleset: "ruleset" };

// "requisitos.REQ-1.minimo" vira alvo requisito REQ-1, campo "minimo".
function alteracaoRegrasAuditoria_(rulesetId) {
  return a => {
    const partes = a.campo.split(".");
    const tipo = ENTIDADES_REGRAS_AUDITORIA[partes[0]];
    if (tipo === "ruleset") return Object.assign({}, a, { alvo_tipo: "ruleset", alvo_id: rulesetId, campo: partes.slice(1).join(".") });
    if (tipo && partes.length >= 3) return Object.assign({}, a, { alvo_tipo: tipo, alvo_id: partes[1], campo: partes.slice(2).join(".") });
    if (partes[0] === "status_rulesets") return Object.assign({}, a, { alvo_tipo: "ruleset", alvo_id: partes.slice(1).join("."), campo: "status" });
    return a;
  };
}

/*-----------------------------------------------------
  ALTERAÇÕES AUDITADAS (as funções que a página chama)
------------------------------------------------------*/

function alteracaoPainel_(def, executar) {
  const ctx = contextoAuditoriaPainel_();
  return auditarAlteracao_(Object.assign({ sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto }, def), executar);
}

function defFormularioAuditoria_(evento, dados) {
  return {
    evento: evento, alvo_tipo: "formulario", alvo_id: dados && dados.indicador,
    planilha: "PERIODOS", estado: () => estadoFormularioAuditoria_(dados && dados.linha),
    detalhes: () => ({ linha: dados && dados.linha })
  };
}

function salvarConfigFormulario(dados) {
  exigirAdminPainel_();
  return alteracaoPainel_(defFormularioAuditoria_("FORMULARIO.SALVAR", dados), () => salvarConfigFormularioSemAuditoria_(dados));
}

function salvarConfigColacao(dados) {
  exigirAdminPainel_();
  return alteracaoPainel_(defFormularioAuditoria_("FORMULARIO.COLACAO.SALVAR", dados), () => salvarConfigColacaoSemAuditoria_(dados));
}

function salvarConfigExclusaoDisciplinas(dados) {
  exigirAdminPainel_();
  return alteracaoPainel_(defFormularioAuditoria_("FORMULARIO.EXCLUSAO.SALVAR", dados), () => salvarConfigExclusaoDisciplinasSemAuditoria_(dados));
}

function desativarFormulario(dados) {
  exigirAdminPainel_();
  return alteracaoPainel_(defFormularioAuditoria_("FORMULARIO.DESATIVAR", dados), () => desativarFormularioSemAuditoria_(dados));
}

function defRegrasAuditoria_(evento, rulesetId, motivo, detalhes) {
  return {
    evento: evento, alvo_tipo: "ruleset", alvo_id: rulesetId, motivo: motivo,
    planilha: "REGRAS_CURRICULARES", estado: () => estadoRulesetAuditoria_(rulesetId),
    mapearAlteracao: alteracaoRegrasAuditoria_(rulesetId),
    detalhes: () => detalhes || ""
  };
}

// Exclusão: o ruleset vem da própria entidade, lida antes de excluir.
function rulesetDaEntidadeAuditoria_(localizar, id) {
  try {
    const e = id ? localizar(id) : null;
    return e ? String(e.dados.ruleset_id || "") : "";
  } catch (erro) {
    return "";
  }
}

function salvarDadosGeraisRuleset(dados) {
  exigirAdminPainel_();
  const d = dados || {};
  return alteracaoPainel_(defRegrasAuditoria_("RULESET.DADOS.SALVAR", d.rulesetId, d.motivoCorrecaoAtiva),
    () => salvarDadosGeraisRulesetSemAuditoria_(dados));
}

function salvarRequisitoCurricular(dados) {
  exigirAdminPainel_();
  const d = dados || {};
  return alteracaoPainel_(defRegrasAuditoria_("REQUISITO.SALVAR", d.rulesetId, d.motivoCorrecaoAtiva, { requisito_id: d.requisitoId || "(novo)" }),
    () => salvarRequisitoCurricularSemAuditoria_(dados));
}

function excluirRequisitoCurricular(requisitoId, snapshotToken, motivoCorrecaoAtiva) {
  exigirAdminPainel_();
  const rulesetId = rulesetDaEntidadeAuditoria_(repoLocalizarRequisito_, requisitoId);
  return alteracaoPainel_(defRegrasAuditoria_("REQUISITO.EXCLUIR", rulesetId, motivoCorrecaoAtiva, { requisito_id: requisitoId }),
    () => excluirRequisitoCurricularSemAuditoria_(requisitoId, snapshotToken, motivoCorrecaoAtiva));
}

function salvarDisciplinaCurricular(dados) {
  exigirAdminPainel_();
  const d = dados || {};
  return alteracaoPainel_(defRegrasAuditoria_("DISCIPLINA.SALVAR", d.rulesetId, d.motivoCorrecaoAtiva, { regra_disciplina_id: d.regraDisciplinaId || "(nova)" }),
    () => salvarDisciplinaCurricularSemAuditoria_(dados));
}

function excluirDisciplinaCurricular(regraDisciplinaId, snapshotToken, motivoCorrecaoAtiva) {
  exigirAdminPainel_();
  const rulesetId = rulesetDaEntidadeAuditoria_(repoLocalizarDisciplina_, regraDisciplinaId);
  return alteracaoPainel_(defRegrasAuditoria_("DISCIPLINA.EXCLUIR", rulesetId, motivoCorrecaoAtiva, { regra_disciplina_id: regraDisciplinaId }),
    () => excluirDisciplinaCurricularSemAuditoria_(regraDisciplinaId, snapshotToken, motivoCorrecaoAtiva));
}

function salvarGrupoCurricular(dados) {
  exigirAdminPainel_();
  const d = dados || {};
  return alteracaoPainel_(defRegrasAuditoria_("GRUPO.SALVAR", d.rulesetId, d.motivoCorrecaoAtiva, { grupo_id: d.grupoId || "(novo)" }),
    () => salvarGrupoCurricularSemAuditoria_(dados));
}

function excluirGrupoCurricular(grupoId, snapshotToken, motivoCorrecaoAtiva) {
  exigirAdminPainel_();
  const rulesetId = rulesetDaEntidadeAuditoria_(repoLocalizarGrupo_, grupoId);
  return alteracaoPainel_(defRegrasAuditoria_("GRUPO.EXCLUIR", rulesetId, motivoCorrecaoAtiva, { grupo_id: grupoId }),
    () => excluirGrupoCurricularSemAuditoria_(grupoId, snapshotToken, motivoCorrecaoAtiva));
}

function ativarRulesetCurricular(rulesetId, snapshotToken) {
  exigirAdminPainel_();
  return alteracaoPainel_({
    evento: "RULESET.ATIVAR", alvo_tipo: "ruleset", alvo_id: rulesetId, planilha: "REGRAS_CURRICULARES",
    estado: () => estadoStatusRulesetsAuditoria_(rulesetId),
    mapearAlteracao: alteracaoRegrasAuditoria_(rulesetId),
    efeitos: (alteracoes, eventoId) => alteracoes
      .filter(a => a.campo === "status" && a.alvo_id !== rulesetId && a.depois === STATUS_RULESET_INATIVO)
      .map(a => ({ evento: "RULESET.INATIVAR_AUTOMATICO", evento_pai_id: eventoId, alvo_tipo: "ruleset", alvo_id: a.alvo_id }))
  }, () => ativarRulesetCurricularSemAuditoria_(rulesetId, snapshotToken));
}

function inativarRulesetCurricular(rulesetId, snapshotToken) {
  exigirAdminPainel_();
  return alteracaoPainel_({
    evento: "RULESET.INATIVAR", alvo_tipo: "ruleset", alvo_id: rulesetId, planilha: "REGRAS_CURRICULARES",
    estado: () => estadoStatusRulesetsAuditoria_(rulesetId),
    mapearAlteracao: alteracaoRegrasAuditoria_(rulesetId)
  }, () => inativarRulesetCurricularSemAuditoria_(rulesetId, snapshotToken));
}

function defCriacaoRulesetAuditoria_(evento, origemId, extra) {
  return {
    evento: evento, alvo_tipo: "ruleset", planilha: "REGRAS_CURRICULARES",
    alvoDoResultado: r => (r && r.ruleset_id) || "",
    estado: r => estadoRulesetCriadoAuditoria_(r && r.ruleset_id),
    mapearAlteracao: a => Object.assign({}, a, { alvo_tipo: "ruleset" }),
    detalhes: () => Object.assign({ origem: origemId }, extra || {})
  };
}

function criarNovaVersaoRuleset(rulesetIdOrigem) {
  exigirAdminPainel_();
  return alteracaoPainel_(defCriacaoRulesetAuditoria_("RULESET.NOVA_VERSAO", rulesetIdOrigem),
    () => criarNovaVersaoRulesetSemAuditoria_(rulesetIdOrigem));
}

function criarRulesetParaOutroCurriculo(dados) {
  exigirAdminPainel_();
  const d = dados || {};
  return alteracaoPainel_(defCriacaoRulesetAuditoria_("RULESET.OUTRO_CURRICULO", d.rulesetIdOrigem, { novo_curso_codigo: d.novoCursoCodigo }),
    () => criarRulesetParaOutroCurriculoSemAuditoria_(dados));
}

// Migração administrativa (roda no editor). Sem antes/depois campo a
// campo: o relatório dela vai em detalhes.
function migrarRegrasCurricularesMultiCurriculoERevisaoV1() {
  exigirAdminPainel_();
  return auditarAlteracao_({
    evento: "REGRAS.MIGRAR", alvo_tipo: "planilha", alvo_id: "REGRAS_CURRICULARES",
    detalhes: r => r
  }, () => migrarRegrasCurricularesMultiCurriculoERevisaoV1SemAuditoria_());
}

/*-----------------------------------------------------
  MANUTENÇÃO (editor do Apps Script e gatilho diário)
------------------------------------------------------*/

function registrarManutencaoPainel_(funcao, resultado) {
  registrarEventoSemFalhar_({ evento: "MANUTENCAO.EXECUTAR", alvo_tipo: "funcao", alvo_id: funcao, detalhes: resultado });
}

/**
 * Rode uma vez no editor: cria as abas, o DICIONARIO e o LEIA-ME, apaga a
 * "Página1" vazia e instala o gatilho diário de consolidação (2h).
 * Pode rodar de novo a qualquer momento (reescreve DICIONARIO e LEIA-ME).
 */
function prepararAuditoriaPainel() {
  exigirAdminPainel_();
  const resultado = prepararAuditoria_(AUDITORIA_PAINEL.FUNCAO_GATILHO);
  registrarManutencaoPainel_("prepararAuditoriaPainel", resultado);
  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Refaz a corrente de hashes e mostra a primeira linha mexida, se houver. */
function verificarIntegridadeAuditoria() {
  exigirAdminPainel_();
  const resultado = verificarIntegridadeAuditoria_();
  registrarManutencaoPainel_("verificarIntegridadeAuditoria", { eventos: resultado.eventos, ok: resultado.ok, problemas: resultado.problemas.length });
  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Gatilho diário (ou à mão, por administrador): SESSOES e RESUMO_DIARIO. */
function consolidarAuditoriaPainel(e) {
  exigirGatilhoOuAdminPainel_(e);
  const resultado = consolidarAuditoria_();
  registrarManutencaoPainel_("consolidarAuditoriaPainel", resultado);
  return resultado;
}

// A página também consegue chamar esta função; um objeto de evento
// inventado não passa, porque o triggerUid precisa ser de um gatilho
// deste projeto.
function exigirGatilhoOuAdminPainel_(e) {
  const uid = e && e.triggerUid;
  if (uid && ScriptApp.getProjectTriggers().some(t => t.getUniqueId() === String(uid))) return;
  exigirAdminPainel_();
}
