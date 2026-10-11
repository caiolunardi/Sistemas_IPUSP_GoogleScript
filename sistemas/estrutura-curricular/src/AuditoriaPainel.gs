/*=====================================================================
  AUDITORIA DA GRADE — dados do painel (1.7.0)

  Leitura apenas: administradores e leitores (Comissão de Graduação)
  acompanham, no Web App, o preenchimento da grade pelas secretarias.

  Fontes (todas pelo ID_INDEX, nenhum ID no código):
    - índice das grades anteriores (INDEX_GRADE_HORARIA_VERSOES_ANTERIORES):
      semestres que têm auditoria (coluna C);
    - planilha de auditoria do semestre, aba "Edições";
    - planilha das secretarias (GRADE_HORARIA_PREENCHIMENTO): situação
      atual das disciplinas, só para o semestre que está no nome dela.

  Nada é gravado. Nenhum ID nem link de planilha vai ao navegador
  (1.8.0: o painel substitui a consulta aos dados crus).

  (1.8.0) Também: edições por pessoa (todas as linhas, não só as 5.000
  mais recentes) e aberturas da planilha das secretarias por pessoa
  (aba "Aberturas" da auditoria) para os gráficos.
=====================================================================*/

var PAINEL_AUDITORIA = {
  MAX_EDICOES: 5000,
  // Colunas lidas da planilha das secretarias (C a M), linha 4 em diante.
  COL_INICIAL: 3,
  N_COLUNAS: 11   // C código · D nome · E tipo · F modalidade · G será oferecida · H docente · I semestre ideal · J créditos · K dia · L início · M fim
};

/**
 * PÚBLICA. Dados do painel da auditoria.
 * @param {Object} pedido { semestre: 'AAAA/S' } (opcional; padrão = semestre atual)
 * @return {{ok, dados:{ semestres:[{semestre, atual}], semestre, atual, nomeGrade,
 *   edicoes:[[data, origem, email, aba, celula, campo, codigo, disciplina, antes, depois, tipo, celulas, obs, evento]],
 *   totalEdicoes, limitadas, andamento:null|[{aba, disciplinas:[[codigo, nome, tipo, modalidade, oferecida, docente, semestreIdeal, creditos, dia, inicio, fim]]}],
 *   pessoas:[{email, edicoes, ultima}], aberturas:null|[{email, aberturas, ultima}], totalAberturas,
 *   geradoEm}}}
 */
function obterAuditoriaGrade(pedido) {
  return executarComSeguranca_('obterAuditoriaGrade', function () {
    var usuario = obterUsuario_();
    pedido = pedido && typeof pedido === 'object' ? pedido : {};

    var grade = abrirPorChave_(ENVIO_GRADE.CHAVE_PLANILHA, 'planilha', 'a planilha da grade horária');
    var nomeGrade = grade.getName();
    var atual = semestreDoNomeDaGrade_(nomeGrade);
    var abaIndice = abrirPorChave_(ENVIO_GRADE.CHAVE_INDICE, 'planilha', 'a planilha-índice das grades anteriores').getSheets()[0];
    if (!abaIndice) throw erroAmigavel_('CONFIGURACAO', 'A planilha-índice das grades anteriores não tem nenhuma aba.');
    conferirIndiceDasGrades_(abaIndice);

    var linhas = linhasDoIndice_(abaIndice);
    var comAuditoria = {};
    linhas.forEach(function (l) { if (/^\d{4}\/[12]$/.test(l.semestre) && l.auditoria && !comAuditoria[l.semestre]) comAuditoria[l.semestre] = l.auditoria; });
    var lista = Object.keys(comAuditoria);
    if (atual && lista.indexOf(atual) < 0) lista.push(atual);
    lista.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });

    var semestre = String(pedido.semestre || atual || lista[0] || '');
    if (!semestre) throw erroAmigavel_('SEM_AUDITORIA', 'Ainda não há grade enviada para preenchimento: não há auditoria para mostrar.');
    if (lista.indexOf(semestre) < 0) throw erroAmigavel_('SEMESTRE_INVALIDO', 'Não há auditoria da grade ' + semestre + '.');

    var edicoes = [], total = 0, pessoas = [], aberturas = null, totalAberturas = 0;
    if (comAuditoria[semestre]) {
      var aud;
      try { aud = SpreadsheetApp.openById(comAuditoria[semestre]); }
      catch (e) { throw erroAmigavel_('AUDITORIA_INACESSIVEL', 'Não foi possível abrir a planilha de auditoria de ' + semestre + '. Avise o Serviço de Graduação.'); }
      var lidas = edicoesDaAuditoria_(aud);
      edicoes = lidas.edicoes; total = lidas.total;
      pessoas = edicoesPorPessoa_(aud);
      var ab = aberturasPorPessoa_(aud);
      if (ab) { aberturas = ab.pessoas; totalAberturas = ab.total; }
    }

    return {
      semestres: lista.map(function (s) { return { semestre: s, atual: s === atual }; }),
      semestre: semestre,
      atual: semestre === atual,
      nomeGrade: semestre === atual ? nomeGrade : nomeDaGradeDoSemestre_(semestre),
      edicoes: edicoes,
      totalEdicoes: total,
      limitadas: total > edicoes.length,
      andamento: semestre === atual ? andamentoDaGrade_(grade) : null,
      pessoas: pessoas,
      aberturas: aberturas,
      totalAberturas: totalAberturas,
      geradoEm: Utilities.formatDate(new Date(), FUSO_HORARIO, 'dd/MM/yyyy HH:mm')
    };
  });
}

/** "2027/1" → "Grade Horária - 1º semestre de 2027". */
function nomeDaGradeDoSemestre_(semestre) {
  var p = String(semestre).split('/');
  return 'Grade Horária - ' + p[1] + 'º semestre de ' + p[0];
}

/**
 * Linhas da aba "Edições", da mais recente para a mais antiga (no
 * máximo PAINEL_AUDITORIA.MAX_EDICOES). Valores como aparecem na
 * planilha (texto), sem Semestre, Linha e Coluna.
 */
function edicoesDaAuditoria_(aud) {
  var aba = aud.getSheetByName(AUDITORIA.ABA);
  if (!aba) return { edicoes: [], total: 0 };
  var n = aba.getLastRow() - 1;
  if (n < 1) return { edicoes: [], total: 0 };
  var ler = Math.min(n, PAINEL_AUDITORIA.MAX_EDICOES);
  var faixa = aba.getRange(2 + n - ler, 1, ler, AUDITORIA.CABECALHO.length);
  var valores = faixa.getDisplayValues();
  // Data e hora: formatada aqui (as linhas acrescentadas além do fim da aba podem vir sem o formato da coluna).
  aba.getRange(2 + n - ler, 1, ler, 1).getValues().forEach(function (l, i) {
    if (Object.prototype.toString.call(l[0]) === '[object Date]') valores[i][0] = Utilities.formatDate(l[0], FUSO_HORARIO, 'dd/MM/yyyy HH:mm:ss');
  });
  // 0 Data · 1 Semestre · 2 Origem · 3 E-mail · 4 Aba · 5 Célula · 6 Linha · 7 Coluna · 8 Campo · 9 Código · 10 Disciplina
  // 11 Anterior · 12 Novo · 13 Tipo · 14 Células · 15 Observação · 16 ID do evento
  var edicoes = valores.filter(function (l) { return String(l[0]).trim() || String(l[13]).trim(); }).map(function (l) {
    return [l[0], l[2], l[3], l[4], l[5], l[8], l[9], l[10], l[11], l[12], l[13], l[14], l[15], l[16]].map(function (v) { return String(v); });
  });
  edicoes.reverse();
  return { edicoes: edicoes, total: n };
}

/** Data e hora (Date ou texto) → 'dd/MM/yyyy HH:mm:ss'. */
function dataHoraDaAuditoria_(v, exibido) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, FUSO_HORARIO, 'dd/MM/yyyy HH:mm:ss');
  return String(exibido || v || '');
}

/** Junta [data, email] por e-mail: [{email, n, ultima}] do maior número para o menor (empate: mais recente primeiro). */
function contarPorEmail_(linhas) {
  var m = {}, ordem = [];
  linhas.forEach(function (l, i) {
    var email = String(l.email || '').trim() || '(não identificado)';
    if (!m[email]) { m[email] = { email: email, n: 0, ultima: '', i: -1 }; ordem.push(email); }
    m[email].n++;
    if (i > m[email].i) { m[email].i = i; m[email].ultima = l.data; }
  });
  return ordem.map(function (k) { return m[k]; })
    .sort(function (a, b) { return b.n - a.n || b.i - a.i; })
    .map(function (x) { return { email: x.email, n: x.n, ultima: x.ultima }; });
}

/** (1.8.0) Edições das secretarias por pessoa, em TODAS as linhas da aba "Edições". */
function edicoesPorPessoa_(aud) {
  var aba = aud.getSheetByName(AUDITORIA.ABA);
  if (!aba || aba.getLastRow() < 2) return [];
  var faixa = aba.getRange(2, 1, aba.getLastRow() - 1, 4);   // Data · Semestre · Origem · E-mail
  var v = faixa.getValues(), d = faixa.getDisplayValues();
  var linhas = [];
  v.forEach(function (l, i) {
    if (String(d[i][2]).trim() !== 'Secretaria') return;
    linhas.push({ data: dataHoraDaAuditoria_(l[0], d[i][0]), email: d[i][3] });
  });
  return contarPorEmail_(linhas).map(function (x) { return { email: x.email, edicoes: x.n, ultima: x.ultima }; });
}

/** (1.8.0) Aberturas por pessoa (aba "Aberturas"); null se a aba ainda não existe. */
function aberturasPorPessoa_(aud) {
  var aba = aud.getSheetByName(AUDITORIA.ABA_ABERTURAS);
  if (!aba) return null;
  if (aba.getLastRow() < 2) return { pessoas: [], total: 0 };
  var faixa = aba.getRange(2, 1, aba.getLastRow() - 1, 3);   // Data · Semestre · E-mail
  var v = faixa.getValues(), d = faixa.getDisplayValues();
  var linhas = [];
  v.forEach(function (l, i) {
    if (!String(d[i][0]).trim() && !String(d[i][2]).trim()) return;
    linhas.push({ data: dataHoraDaAuditoria_(l[0], d[i][0]), email: d[i][2] });
  });
  return { pessoas: contarPorEmail_(linhas).map(function (x) { return { email: x.email, aberturas: x.n, ultima: x.ultima }; }), total: linhas.length };
}

/** Situação atual das disciplinas nas 6 abas da planilha das secretarias (texto como aparece). */
function andamentoDaGrade_(grade) {
  return ENVIO_GRADE.ABAS.map(function (a) {
    var aba = grade.getSheetByName(a.aba);
    var disciplinas = [];
    if (aba) {
      var ultima = Math.min(aba.getLastRow(), ENVIO_GRADE.LINHA_FINAL);
      if (ultima >= ENVIO_GRADE.LINHA_INICIAL) {
        disciplinas = aba.getRange(ENVIO_GRADE.LINHA_INICIAL, PAINEL_AUDITORIA.COL_INICIAL, ultima - ENVIO_GRADE.LINHA_INICIAL + 1, PAINEL_AUDITORIA.N_COLUNAS)
          .getDisplayValues()
          .filter(function (l) { return String(l[0]).trim(); })
          .map(function (l) { return l.map(function (v) { return String(v).replace(/\s+/g, ' ').trim(); }); });
      }
    }
    return { aba: a.aba, disciplinas: disciplinas };
  });
}
