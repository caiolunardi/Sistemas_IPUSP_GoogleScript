/*=====================================================================
  GRAVAÇÃO SEGURA — preparação, ativação e recuperação

  O PROBLEMA
  O Google Sheets não tem transação entre abas: regravar Disciplinas,
  Disciplinas por habilitação, Requisitos e Currículos são várias
  operações independentes, e qualquer uma pode falhar no meio (cota,
  tempo, erro do serviço). LockService só impede DUAS execuções do
  script ao mesmo tempo; não desfaz nada e não impede pessoas de
  editarem a planilha.

  A ESTRATÉGIA: preparar em cópias, ativar com UMA escrita
  1. MANIFESTO (metadado "estruturaCurricular.ativa"): um único texto
     JSON diz quais abas estão em uso (pelo ID interno da aba, que não
     muda com o nome), a versão da base e a lista das importações
     concluídas. Todos os leitores (painel, prévia, próxima importação)
     leem os dados PELO MANIFESTO. Trocar o manifesto é uma única
     escrita: é o "ponto de ativação".
  2. PREPARAÇÃO: cada aba de dados em uso é copiada para uma aba oculta
     "_nova_…"; os dados novos são escritos só na cópia. As linhas de
     histórico (Importações/Alterações) são acrescentadas com o
     identificador da importação, mas só são mostradas pelo painel
     quando esse identificador está no manifesto.
  3. CONFERÊNCIA: as cópias são relidas (quantidade e chave de cada
     linha) e as abas em uso são conferidas de novo contra edições
     manuais feitas durante a preparação.
  4. ATIVAÇÃO: grava o manifesto novo (abas novas, versão + 1,
     importação na lista de concluídas).
  5. ARRUMAÇÃO (cosmética): as abas novas recebem os nomes normais e as
     anteriores viram cópias de segurança ocultas "_anterior_…".

  GARANTIAS
  - Falha ANTES da ativação: o manifesto não mudou, então painel, prévia
    e próxima importação continuam vendo exatamente a versão anterior
    (dados, versão e histórico). A preparação é descartada na hora ou,
    se o próprio descarte falhar, pelo diário (metadado
    "estruturaCurricular.gravacao") na próxima importação.
  - Falha DEPOIS da ativação: a importação está concluída; o que faltou
    (nomes das abas, aba Sobre) fica registrado no diário, que só é
    removido quando tudo foi feito. A pendência é refeita quando um
    administrador abre o painel ou inicia outra importação. A resposta
    diz "concluída, com ajustes pendentes", não "não gravada"; se as abas
    visíveis ainda mostram a versão anterior, a resposta e o painel (de
    todos os usuários) trazem um alerta explícito até a correção.
  - Falha NA ativação sem como saber se o manifesto foi escrito:
    resposta RESULTADO_INCERTO; verificarImportacao() consulta o
    manifesto e responde se a importação foi ou não concluída.
  - Nova tentativa: a mesma operação (identificador da prévia) nunca é
    gravada duas vezes; histórico de tentativas que não chegaram à
    ativação é apagado na recuperação.
  - Observações e colunas extras vêm da aba em uso, lida no início da
    confirmação; se mudarem até a ativação, a gravação é cancelada.
=====================================================================*/

var META_ATIVA = 'estruturaCurricular.ativa';
var META_GRAVACAO = 'estruturaCurricular.gravacao';
var PREFIXO_NOVA = '_nova_';
var PREFIXO_ANTERIOR = '_anterior_';
/** Formato do identificador das importações desta versão (linhas de histórico sujeitas à limpeza). */
var RE_ID_IMPORTACAO = /^IMP-\d{8}-\d{6}-[0-9a-f]{8}(-\d+)?$/;

/** Abas de dados controladas pelo manifesto (função: evita depender da ordem de carga dos arquivos). */
function abasDados_() {
  return [ABAS.DISCIPLINAS, ABAS.OFERTA, ABAS.REQUISITOS, ABAS.CURRICULOS];
}

/*---------------------------------------------------------------------
  Manifesto e diário
---------------------------------------------------------------------*/

/** JSON guardado num metadado (null se não existir). */
function lerJsonMetadado_(ss, chave) {
  return jsonDeMetadado_(lerMetadado_(ss, chave));
}

/** Converte o texto de um metadado em JSON (null se vazio; BASE_INCONSISTENTE se ilegível). */
function jsonDeMetadado_(v) {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch (e) {
    throw erroAmigavel_('BASE_INCONSISTENTE', 'Os controles internos da planilha da estrutura estão ilegíveis. Nada foi alterado. Avise quem mantém o sistema.');
  }
}

/**
 * Manifesto da versão ativa:
 * { formato: 1, versaoBase, importacao (id da última concluída),
 *   abas: { "Disciplinas": idDaAba, … }, anteriores: { … },
 *   confirmadas: [{ id, op, em }], ultimaTexto }
 */
function lerManifesto_(ss) { return lerJsonMetadado_(ss, META_ATIVA); }

/** Escreve o manifesto inteiro (uma única escrita = ponto de ativação). */
function gravarManifesto_(ss, m) { gravarMetadado_(ss, META_ATIVA, JSON.stringify(m)); }

/** Quantas vezes uma leitura é repetida quando o manifesto muda no meio dela. */
var MAX_TENTATIVAS_LEITURA = 3;

/**
 * Leitura CONSISTENTE de uma versão (painel e prévia não seguram a trava).
 * Lê o texto do manifesto, executa ler(m) e relê o manifesto:
 *  - manifesto igual → devolve o resultado (dados, versão e histórico da
 *    MESMA versão);
 *  - manifesto mudou (outra importação terminou no meio da leitura) →
 *    descarta o resultado e repete com o manifesto novo;
 *  - ler(m) acusou BASE_INCONSISTENTE (aba em uso não existe): se o
 *    manifesto mudou, é concorrência normal (a importação seguinte apagou
 *    a cópia antiga) → repete; se NÃO mudou, a aba foi apagada de verdade
 *    → o erro segue para a tela.
 * No máximo MAX_TENTATIVAS_LEITURA tentativas, sem espera; esgotadas,
 * BASE_EM_ATUALIZACAO ("tente de novo em instantes"). Nunca devolve uma
 * mistura de versões.
 * @param {Spreadsheet} ss
 * @param {function(Object): Object} ler  recebe o manifesto; devolve um objeto.
 * @return {Object} o objeto de ler(m), com .manifesto e .tentativas.
 */
function lerVersaoConsistente_(ss, ler) {
  for (var t = 1; t <= MAX_TENTATIVAS_LEITURA; t++) {
    var bruto = lerMetadado_(ss, META_ATIVA);
    var m = jsonDeMetadado_(bruto);
    var r;
    try {
      r = ler(m);
    } catch (e) {
      if (!(e && e.codigo === 'BASE_INCONSISTENTE')) throw e;
      if (lerMetadado_(ss, META_ATIVA) === bruto) throw e;
      console.log('lerVersaoConsistente_: manifesto mudou durante a leitura (tentativa ' + t + '); repetindo.');
      continue;
    }
    if (lerMetadado_(ss, META_ATIVA) === bruto) {
      r.manifesto = m;
      r.tentativas = t;
      return r;
    }
    console.log('lerVersaoConsistente_: manifesto mudou durante a leitura (tentativa ' + t + '); repetindo.');
  }
  throw erroAmigavel_('BASE_EM_ATUALIZACAO', 'A base foi atualizada por outras importações enquanto era lida. Nada foi alterado. Tente de novo em instantes.');
}

/** Diário da gravação em andamento: { op, id, inicio, fase } ou null. */
function lerDiario_(ss) { return lerJsonMetadado_(ss, META_GRAVACAO); }

/** { id: true } das importações concluídas. */
function idsConfirmados_(m) {
  var r = {};
  ((m && m.confirmadas) || []).forEach(function (c) { r[c.id] = true; });
  return r;
}

/** Entrada do manifesto da importação feita pela operação "op" (ou null). */
function confirmadaPorOperacao_(m, op) {
  if (!m || !op) return null;
  return (m.confirmadas || []).filter(function (c) { return c.op === op; })[0] || null;
}

/** Aba pelo ID interno (getSheetId), ou null. */
function abaPorId_(ss, id) {
  return ss.getSheets().filter(function (s) { return s.getSheetId() === id; })[0] || null;
}

/**
 * (1.11.0) Posição (0 = primeira) de uma aba na planilha, pelo ID; -1 se não
 * existe. getSheets().indexOf(aba) não serve no Apps Script: cada chamada
 * devolve objetos novos para as mesmas abas.
 */
function posicaoDaAba_(ss, aba) {
  var id = aba.getSheetId();
  var ids = ss.getSheets().map(function (s) { return s.getSheetId(); });
  return ids.indexOf(id);
}

/**
 * Aba de dados EM USO. Com manifesto, é a do ID registrado (o nome pode
 * estar diferente durante a arrumação); sem manifesto (planilha ainda
 * não preparada), é a do nome.
 */
function abaDados_(ss, nome, m) {
  if (m === undefined) m = lerManifesto_(ss);
  if (!m || m.abas[nome] == null) return ss.getSheetByName(nome);
  var aba = abaPorId_(ss, m.abas[nome]);
  if (!aba) {
    throw erroAmigavel_('BASE_INCONSISTENTE', 'A aba "' + nome + '" da base foi apagada. Nada foi alterado. Restaure a planilha pelo histórico de versões (Arquivo › Histórico de versões) ou avise quem mantém o sistema.');
  }
  return aba;
}

/**
 * Cria o manifesto de uma planilha que ainda não tem (planilha nova ou
 * base do esquema 1). As importações já registradas contam como
 * concluídas.
 */
function criarManifestoInicial_(ss) {
  var abas = {};
  abasDados_().forEach(function (nome) { abas[nome] = ss.getSheetByName(nome).getSheetId(); });
  var ids = linhasDoRegistro_(ss, ABAS.IMPORTACOES).map(function (l) { return l.id; }).filter(Boolean);
  var legado = lerMetadado_(ss, META_VERSAO_BASE);
  var m = {
    formato: 1,
    versaoBase: legado ? (parseInt(legado, 10) || 0) : 0,
    importacao: ids.length ? ids[ids.length - 1] : null,
    abas: abas,
    anteriores: {},
    confirmadas: ids.map(function (id) { return { id: id, op: null, em: null }; }),
    ultimaTexto: null
  };
  gravarManifesto_(ss, m);
  return m;
}

/**
 * Identificadores (coluna "Importação") das linhas de uma aba de
 * registro: [{ linha, id }] (linha = número da linha na planilha).
 */
function linhasDoRegistro_(ss, nomeAba) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) return [];
  var titulos = titulosDaAba_(aba).map(chaveTitulo_);
  var col = titulos.indexOf(chaveTitulo_('Importação')) + 1;
  if (!col) return [];
  return aba.getRange(2, col, aba.getLastRow() - 1, 1).getValues().map(function (l, i) {
    return { linha: i + 2, id: textoDaCelula_(l[0]) };
  });
}

/**
 * Apaga das abas Importações e Alterações as linhas das importações que
 * NÃO chegaram à ativação (id no formato desta versão e fora do
 * manifesto). Linhas de baixo para cima, em blocos. Devolve quantas.
 */
function limparHistoricoNaoConfirmado_(ss, m) {
  var conf = idsConfirmados_(m);
  var total = 0;
  [ABAS.IMPORTACOES, ABAS.ALTERACOES].forEach(function (nomeAba) {
    var aba = ss.getSheetByName(nomeAba);
    var alvo = linhasDoRegistro_(ss, nomeAba).filter(function (l) { return RE_ID_IMPORTACAO.test(l.id) && !conf[l.id]; }).map(function (l) { return l.linha; });
    for (var i = alvo.length - 1; i >= 0;) {
      var fim = alvo[i], ini = fim;
      while (i - 1 >= 0 && alvo[i - 1] === ini - 1) { i--; ini--; }
      aba.deleteRows(ini, fim - ini + 1);
      total += fim - ini + 1;
      i--;
    }
  });
  return total;
}

/*---------------------------------------------------------------------
  Impressão digital (detecta edições manuais)
---------------------------------------------------------------------*/

/** Chave de uma linha de dados (identifica a linha em cada aba). */
function chaveDaLinha_(nome, o) {
  if (nome === ABAS.DISCIPLINAS) return String(o.codigo || '');
  if (nome === ABAS.OFERTA) return o.curriculo + '|' + o.codigo;
  if (nome === ABAS.REQUISITOS) return o.curriculo + '|' + o.codigo + '|' + o.requisito;
  return String(o.curriculo || '');
}

/** Valor comparável (datas viram número). */
function valorImpressao_(v) {
  if (v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return 'D' + v.getTime();
  return v;
}

/**
 * Impressão de uma aba lida (lerAbaObj_): hash das colunas MANTIDAS PELO
 * SISTEMA e hash das colunas MANUAIS (Observações e colunas extras),
 * independentes da ordem das linhas.
 */
function impressaoDeLinhas_(nome, linhas) {
  var sistema = COLUNAS[nome].filter(function (c) { return c.chave !== 'observacoes'; });
  var s = linhas.map(function (o) {
    return JSON.stringify(sistema.map(function (c) { return valorImpressao_(o[c.chave]); }));
  }).sort();
  var man = [];
  linhas.forEach(function (o) {
    var extras = o._extras || {};
    var titulos = Object.keys(extras).filter(function (k) { return extras[k] !== '' && extras[k] !== null; }).sort();
    var obs = o.observacoes || null;
    if (!obs && !titulos.length) return;
    man.push(JSON.stringify([chaveDaLinha_(nome, o), obs, titulos.map(function (k) { return [k, valorImpressao_(extras[k])]; })]));
  });
  man.sort();
  return { sistema: hashTexto_(s.join('\n')), manual: hashTexto_(man.join('\n')) };
}

/** Junta as impressões das abas em { abas, sistema, manual }. */
function juntarImpressoes_(porAba) {
  var nomes = abasDados_();
  return {
    abas: porAba,
    sistema: hashTexto_(nomes.map(function (n) { return porAba[n].sistema; }).join('|')),
    manual: hashTexto_(nomes.map(function (n) { return porAba[n].manual; }).join('|'))
  };
}

/** Impressão atual das abas em uso (relê a planilha). */
function impressaoAtual_(ss, m) {
  var porAba = {};
  abasDados_().forEach(function (nome) { porAba[nome] = impressaoDeLinhas_(nome, lerAbaObj_(abaDados_(ss, nome, m), nome).linhas); });
  return juntarImpressoes_(porAba);
}

/** Impressão de abas indicadas por ID (ex.: as anteriores, depois da ativação). */
function impressaoPorIds_(ss, ids) {
  var porAba = {};
  var faltou = false;
  abasDados_().forEach(function (nome) {
    var aba = abaPorId_(ss, ids[nome]);
    if (!aba) { faltou = true; return; }
    porAba[nome] = impressaoDeLinhas_(nome, lerAbaObj_(aba, nome).linhas);
  });
  return faltou ? null : juntarImpressoes_(porAba);
}

/** Abas cuja parte "sistema" (ou "manual") difere entre duas impressões. */
function abasDiferentes_(a, b, parte) {
  return abasDados_().filter(function (n) { return !a.abas[n] || !b.abas[n] || a.abas[n][parte] !== b.abas[n][parte]; });
}

/*---------------------------------------------------------------------
  Gravação
---------------------------------------------------------------------*/

/** Nome curto para as abas de preparação. */
function chaveCurtaAba_(nome) {
  return { 'Disciplinas': 'disciplinas', 'Disciplinas por habilitação': 'oferta', 'Requisitos': 'requisitos', 'Currículos': 'curriculos' }[nome] || 'aba';
}

/**
 * Executa preparação, conferência, ativação e arrumação.
 * @param {Spreadsheet} ss
 * @param {Object} m        manifesto lido no início da confirmação.
 * @param {Object} base     base lida no início da confirmação (com .impressao).
 * @param {Object} dados    { nomeDaAba: [objetos de linha] } (estado final completo).
 * @param {Object} registros { importacao: {…}, alteracoes: [{…}] } (já com o id).
 * @param {Object} info     { op, id, agora (Date), texto (resumo p/ aba Sobre) }.
 * @return {{ pendencias: string[], avisos: string[] }}
 * Lança NAO_GRAVADA / EDICAO_DURANTE_GRAVACAO (nada mudou) ou
 * RESULTADO_INCERTO (não é possível saber se ativou).
 */
function gravarComAtivacao_(ss, m, base, dados, registros, info) {
  var op8 = String(info.op).replace(/-/g, '').slice(0, 8);
  var novas = {};

  // 1–3. Diário, preparação nas cópias e histórico (ainda invisível).
  try {
    gravarMetadado_(ss, META_GRAVACAO, JSON.stringify({ op: info.op, id: info.id, inicio: info.agora.getTime(), fase: 'preparando' }));
    abasDados_().forEach(function (nome) {
      var nova = abaDados_(ss, nome, m).copyTo(ss);
      novas[nome] = nova;
      nova.setName(PREFIXO_NOVA + chaveCurtaAba_(nome) + '_' + op8);
      nova.hideSheet();
      escreverAbaObj_(nova, nome, dados[nome]);
    });
    acrescentarLinhas_(ss, ABAS.IMPORTACOES, [registros.importacao]);
    acrescentarLinhas_(ss, ABAS.ALTERACOES, registros.alteracoes);
    SpreadsheetApp.flush();

    // Conferência das cópias: quantidade e chave de cada linha.
    abasDados_().forEach(function (nome) {
      var lidas = lerAbaObj_(novas[nome], nome).linhas.map(function (o) { return chaveDaLinha_(nome, o); });
      var esperadas = dados[nome].map(function (o) { return chaveDaLinha_(nome, o); });
      if (lidas.join('\n') !== esperadas.join('\n')) throw new Error('conferência da cópia falhou: ' + nome);
    });

    // Conferência final: ninguém editou as abas em uso desde o início.
    var agoraImp = impressaoAtual_(ss, m);
    var mudouSistema = abasDiferentes_(base.impressao, agoraImp, 'sistema');
    var mudouManual = abasDiferentes_(base.impressao, agoraImp, 'manual');
    if (mudouSistema.length || mudouManual.length) {
      throw erroAmigavel_('EDICAO_DURANTE_GRAVACAO', 'A planilha foi editada durante a gravação (aba ' + mudouSistema.concat(mudouManual).filter(function (x, i, l) { return l.indexOf(x) === i; }).join(', ') + '). Nada foi alterado. Gere a prévia de novo e confirme.');
    }
  } catch (e) {
    descartarPreparacao_(ss, m, novas);
    if (e && e.amigavel) throw e;
    console.error('gravarComAtivacao_ (preparação) falhou: ' + (e && e.message ? e.message : e));
    throw erroAmigavel_('NAO_GRAVADA', 'A importação não foi gravada: houve uma falha ao preparar os dados. A base continua exatamente como estava (nada do que aparece no painel mudou). Tente de novo.');
  }

  // 4. Ativação: uma escrita.
  var m2 = JSON.parse(JSON.stringify(m));
  m2.formato = 1;
  m2.versaoBase = (m.versaoBase || 0) + 1;
  m2.importacao = info.id;
  m2.anteriores = m.abas;
  m2.abas = {};
  abasDados_().forEach(function (nome) { m2.abas[nome] = novas[nome].getSheetId(); });
  m2.confirmadas = (m.confirmadas || []).concat([{ id: info.id, op: info.op, em: formatarDataHora_(info.agora) }]);
  m2.ultimaTexto = info.texto;

  var pendencias = [];
  try {
    gravarManifesto_(ss, m2);
    SpreadsheetApp.flush();
  } catch (e) {
    var lido;
    try { lido = lerManifesto_(ss); } catch (e2) { lido = undefined; }
    if (lido === undefined) {
      console.error('gravarComAtivacao_ (ativação) incerta: ' + (e && e.message ? e.message : e));
      throw erroAmigavel_('RESULTADO_INCERTO', 'Não foi possível confirmar se a importação foi concluída (falha de comunicação com a planilha no momento da ativação). Use "Verificar" antes de importar de novo: a verificação diz se ela foi ou não gravada.');
    }
    if (!lido || !idsConfirmados_(lido)[info.id]) {
      descartarPreparacao_(ss, m, novas);
      throw erroAmigavel_('NAO_GRAVADA', 'A importação não foi gravada: a ativação falhou. A base continua exatamente como estava. Tente de novo.');
    }
    pendencias.push('confirmação da escrita (flush)');
  }

  // 5. Depois da ativação: tudo aqui é recuperável e não muda o resultado.
  //    O DIÁRIO SÓ É REMOVIDO quando a arrumação e a aba Sobre deram certo
  //    e as abas visíveis conferem com o manifesto (pelo ID interno). Se
  //    algo faltar, o diário fica (com o id já confirmado) e a pendência é
  //    detectada e refeita quando um administrador abre o painel ou inicia
  //    outra importação (recuperarGravacao_). Mesmo sem diário, a
  //    divergência entre as abas visíveis e o manifesto é detectada
  //    (divergenciasDasAbas_), e o painel avisa enquanto ela existir.
  var avisos = [];
  try {
    var anterior = impressaoPorIds_(ss, m.abas);
    var antesDaAtivacao = base.impressao;
    if (anterior && (abasDiferentes_(antesDaAtivacao, anterior, 'sistema').length || abasDiferentes_(antesDaAtivacao, anterior, 'manual').length)) {
      avisos.push('Alguém editou a planilha no instante da ativação; essa edição ficou só na cópia de segurança oculta "' + PREFIXO_ANTERIOR + '…". Confira e, se necessário, copie-a para a aba em uso.');
    }
  } catch (e) { pendencias.push('conferência da cópia de segurança'); }
  var arrumacaoOk = true, sobreOk = true;
  try { arrumarAbas_(ss, m2); } catch (e) {
    arrumacaoOk = false;
    console.error('gravarComAtivacao_ (arrumação) falhou: ' + (e && e.message ? e.message : e));
  }
  try { escreverSobre_(ss, { texto: info.texto }); } catch (e) { sobreOk = false; pendencias.push('aba Sobre'); }
  var divergencias;
  try { divergencias = divergenciasDasAbas_(ss, m2); } catch (e) { divergencias = [{ aba: '?', grave: true, motivo: 'não foi possível conferir as abas' }]; }
  if (!arrumacaoOk || divergencias.length) pendencias.push('nomes e ordem das abas');
  if (arrumacaoOk && sobreOk && !divergencias.length) {
    try { removerMetadado_(ss, META_GRAVACAO); } catch (e) { pendencias.push('diário da gravação'); }
  } else {
    // Mantém o diário e registra o que falta (se esta escrita falhar, o
    // diário anterior, com o mesmo id confirmado, continua valendo).
    try {
      gravarMetadado_(ss, META_GRAVACAO, JSON.stringify({ op: info.op, id: info.id, inicio: info.agora.getTime(), fase: 'arrumacao_pendente', pendencias: pendencias.slice() }));
    } catch (e) { /* diário anterior continua */ }
  }
  try { SpreadsheetApp.flush(); } catch (e) { pendencias.push('confirmação final da escrita'); }
  var graves = divergencias.filter(function (d) { return d.grave; });
  return { pendencias: pendencias, avisos: avisos, planilhaDesatualizada: graves.length > 0, abasDivergentes: graves.map(function (d) { return d.aba; }) };
}

/**
 * Confere as abas visíveis contra o manifesto, pelo ID interno da aba
 * (o nome sozinho não basta: depois de uma arrumação que falhou, a aba
 * chamada "Disciplinas" pode ser a da versão ANTERIOR).
 * Devolve [{ aba, grave, motivo }]:
 *   grave = quem abre a planilha pelo nome normal NÃO vê a versão em uso
 *           (aba em uso com outro nome ou oculta);
 *   não grave = proteção "só aviso" ausente ou cópia auxiliar
 *           ("_nova_…"/"_anterior_…") visível.
 * Uma aba em uso APAGADA não entra aqui (a leitura acusa BASE_INCONSISTENTE).
 * Não escreve nada.
 */
function divergenciasDasAbas_(ss, m) {
  var r = [];
  if (!m || !m.abas) return r;
  var folhas = ss.getSheets();
  var emUso = {};
  abasDados_().forEach(function (nome) {
    var id = m.abas[nome];
    emUso[id] = true;
    var ativa = folhas.filter(function (s) { return s.getSheetId() === id; })[0];
    if (!ativa) return;
    if (ativa.getName() !== nome) {
      var ocupante = ss.getSheetByName(nome);
      r.push({ aba: nome, grave: true, motivo: ocupante ? 'a aba "' + nome + '" visível na planilha é de uma versão anterior' : 'a aba em uso ainda não tem o nome "' + nome + '"' });
    } else if (ativa.isSheetHidden()) {
      r.push({ aba: nome, grave: true, motivo: 'a aba em uso está oculta' });
    } else if (!ativa.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
      r.push({ aba: nome, grave: false, motivo: 'sem a proteção "só aviso"' });
    }
  });
  folhas.forEach(function (s) {
    var n = s.getName();
    if (emUso[s.getSheetId()]) return;
    if ((n.indexOf(PREFIXO_NOVA) === 0 || n.indexOf(PREFIXO_ANTERIOR) === 0) && !s.isSheetHidden()) {
      r.push({ aba: n, grave: false, motivo: 'cópia auxiliar visível' });
    }
  });
  return r;
}

/**
 * Descarta uma preparação que não foi ativada: apaga as cópias e as
 * linhas de histórico não confirmadas e o diário. Cada passo é
 * independente; se algo falhar, o diário fica e a próxima recuperação
 * termina o serviço. Nunca lança erro.
 */
function descartarPreparacao_(ss, m, novas) {
  var ok = true;
  Object.keys(novas || {}).forEach(function (nome) {
    try { ss.deleteSheet(novas[nome]); } catch (e) { ok = false; }
  });
  try { apagarAbasDePreparacao_(ss, m); } catch (e) { ok = false; }
  try { limparHistoricoNaoConfirmado_(ss, m); } catch (e) { ok = false; }
  if (ok) { try { removerMetadado_(ss, META_GRAVACAO); } catch (e) { /* recuperação posterior */ } }
}

/** Apaga abas "_nova_…" que não estão em uso pelo manifesto. */
function apagarAbasDePreparacao_(ss, m) {
  var emUso = {};
  abasDados_().forEach(function (n) { emUso[m.abas[n]] = true; });
  ss.getSheets().forEach(function (s) {
    if (s.getName().indexOf(PREFIXO_NOVA) === 0 && !emUso[s.getSheetId()]) ss.deleteSheet(s);
  });
}

/**
 * Arrumação: a aba em uso recebe o nome normal, fica visível, na posição
 * certa e protegida "só com aviso"; a que tinha o nome vira
 * "_anterior_…" (oculta). Uma cópia anterior mais velha é apagada.
 * Cópias auxiliares ("_nova_…"/"_anterior_…") que não estão em uso são
 * ocultadas. Idempotente: pode rodar quantas vezes for preciso.
 * Cada passo é independente (falha num passo não impede os outros, nem
 * as outras abas); no fim, se algum falhou, lança o primeiro erro — quem
 * chama registra a pendência e confere com divergenciasDasAbas_.
 * Ordem: nomes e visibilidade primeiro (o que a pessoa vê), depois
 * ocultação das cópias, posição e proteção.
 */
function arrumarAbas_(ss, m) {
  var erros = [];
  function passo(fn) { try { fn(); } catch (e) { erros.push(e); } }
  var emUso = {};
  abasDados_().forEach(function (nome) { emUso[m.abas[nome]] = true; });
  // 1. Nomes e visibilidade das abas em uso.
  abasDados_().forEach(function (nome) {
    passo(function () {
      var ativa = abaPorId_(ss, m.abas[nome]);
      if (!ativa) return;
      if (ativa.getName() !== nome) {
        var ocupante = ss.getSheetByName(nome);
        // (1.11.0) Abas comparadas pelo ID (cada chamada do Apps Script devolve um objeto novo).
        if (ocupante && ocupante.getSheetId() !== ativa.getSheetId()) {
          var velha = ss.getSheetByName(PREFIXO_ANTERIOR + nome);
          if (velha && velha.getSheetId() !== ativa.getSheetId() && !emUso[velha.getSheetId()]) ss.deleteSheet(velha);
          ocupante.setName(PREFIXO_ANTERIOR + nome);
        }
        ativa.setName(nome);
      }
      if (ativa.isSheetHidden()) ativa.showSheet();
    });
  });
  // 2. Cópias auxiliares fora de uso: ocultas (a anterior guarda a versão
  //    passada; ninguém deve confundi-la com a aba em uso).
  ss.getSheets().forEach(function (s) {
    var n = s.getName();
    if (emUso[s.getSheetId()] || s.isSheetHidden()) return;
    if (n.indexOf(PREFIXO_NOVA) === 0 || n.indexOf(PREFIXO_ANTERIOR) === 0) passo(function () { s.hideSheet(); });
  });
  // 3. Posição.
  abasDados_().forEach(function (nome) {
    passo(function () {
      var ativa = abaPorId_(ss, m.abas[nome]);
      if (!ativa) return;
      var pos = ORDEM_ABAS.indexOf(nome) + 1;
      if (posicaoDaAba_(ss, ativa) + 1 !== pos) {
        ss.setActiveSheet(ativa);
        ss.moveActiveSheet(pos);
      }
    });
  });
  // 4. Proteção "só com aviso".
  abasDados_().forEach(function (nome) {
    passo(function () {
      var ativa = abaPorId_(ss, m.abas[nome]);
      if (!ativa) return;
      if (!ativa.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
        prepararCabecalhoDeCopia_(ativa, nome);
        protegerAba_(ativa, nome);
      }
    });
  });
  if (erros.length) throw erros[0];
}

/** Congelamento e altura do cabeçalho (a cópia pode não herdar tudo). */
function prepararCabecalhoDeCopia_(aba, nome) {
  aba.setFrozenRows(1);
  if (nome === ABAS.DISCIPLINAS) aba.setFrozenColumns(2);
}

/*---------------------------------------------------------------------
  Recuperação
---------------------------------------------------------------------*/

/**
 * Deixa a planilha num estado limpo antes de uma nova operação (chamar
 * SEMPRE sob a trava). Usa o manifesto como verdade:
 *  - diário de importação NÃO confirmada → descarta a preparação;
 *  - diário de importação confirmada → termina a arrumação e a aba Sobre;
 *  - apaga cópias "_nova_…" soltas e histórico não confirmado;
 *  - acerta nomes, ordem, visibilidade e proteção das abas (também quando
 *    não há diário, mas as abas visíveis divergem do manifesto).
 * O diário só é removido quando tudo isso deu certo; se a arrumação falhar
 * de novo, ela NÃO lança erro: volta em r.pendencias e o diário fica para
 * a próxima vez. Falhas no descarte (apagar cópias/histórico) lançam erro.
 * Devolve { descartada: id|null, concluida: id|null, linhasApagadas,
 *   arrumada: bool (havia divergência e ela acabou), pendencias: [],
 *   divergencias: [...] (as que restaram) }.
 */
function recuperarGravacao_(ss) {
  var r = { descartada: null, concluida: null, linhasApagadas: 0, arrumada: false, pendencias: [], divergencias: [] };
  var m = lerManifesto_(ss);
  if (!m) return r;
  var j = lerDiario_(ss);
  var conf = idsConfirmados_(m);
  if (j) { if (conf[j.id]) r.concluida = j.id; else r.descartada = j.id; }
  var antes = divergenciasDasAbas_(ss, m);
  apagarAbasDePreparacao_(ss, m);
  r.linhasApagadas = limparHistoricoNaoConfirmado_(ss, m);
  try { arrumarAbas_(ss, m); } catch (e) {
    r.pendencias.push('nomes e ordem das abas');
    console.error('recuperarGravacao_ (arrumação) falhou: ' + (e && e.message ? e.message : e));
  }
  if (r.concluida && m.ultimaTexto) {
    try { escreverSobre_(ss, { texto: m.ultimaTexto }); } catch (e) { r.pendencias.push('aba Sobre'); }
  }
  r.divergencias = divergenciasDasAbas_(ss, m);
  if (r.divergencias.length && r.pendencias.indexOf('nomes e ordem das abas') < 0) r.pendencias.push('nomes e ordem das abas');
  r.arrumada = (antes.length > 0 || !!r.concluida) && r.divergencias.length === 0 && !r.pendencias.length;
  if (j && !r.pendencias.length) removerMetadado_(ss, META_GRAVACAO);
  return r;
}

/** Há algo a recuperar? (diário presente ou abas visíveis divergentes do manifesto). Não escreve. */
function precisaRecuperar_(ss) {
  var m = lerManifesto_(ss);
  if (!m) return false;
  return !!lerDiario_(ss) || divergenciasDasAbas_(ss, m).length > 0;
}

/**
 * Situação de gravação para o painel (sem escrever nada):
 * { interrompida, idInterrompida, arrumacaoPendente, planilhaDesatualizada,
 *   abasDivergentes: [nomes] }.
 */
function situacaoGravacao_(ss, m) {
  var j = lerDiario_(ss);
  var conf = idsConfirmados_(m);
  var div = divergenciasDasAbas_(ss, m);
  var graves = div.filter(function (d) { return d.grave; });
  return {
    interrompida: !!(j && !conf[j.id]),
    idInterrompida: j && !conf[j.id] ? j.id : null,
    arrumacaoPendente: !!(j && conf[j.id]) || div.length > 0,
    planilhaDesatualizada: graves.length > 0,
    abasDivergentes: graves.map(function (d) { return d.aba; })
  };
}

/**
 * PÚBLICA. Diz se a importação da operação "operacao" (identificador
 * devolvido pela prévia) foi concluída. Usada quando a confirmação
 * terminou com RESULTADO_INCERTO ou sem resposta (falha de rede).
 * @return {{ok, dados: {situacao: 'gravada'|'nao_gravada', id, dataHora, limpezaPendente}}}
 */
function verificarImportacao(operacao) {
  return executarComSeguranca_('verificarImportacao', function () {
    exigirAdmin_();
    var op = String(operacao || '');
    if (!/^[0-9a-fA-F-]{8,64}$/.test(op)) throw erroAmigavel_('PACOTE_INVALIDO', 'Identificador de importação inválido.');
    var ss = abrirPlanilhaEstrutura_();
    var m = lerManifesto_(ss);
    var c = confirmadaPorOperacao_(m, op);
    if (c) return { situacao: 'gravada', id: c.id, dataHora: c.em };
    // Fora do manifesto = não concluída (a leitura do manifesto é a verdade).
    // Se sobrou preparação dessa tentativa, ela é limpa na próxima importação.
    var j = lerDiario_(ss);
    return { situacao: 'nao_gravada', id: null, dataHora: null, limpezaPendente: !!(j && j.op === op) };
  });
}
