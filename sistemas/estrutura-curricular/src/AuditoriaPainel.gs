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

  (1.11.0) Nome de quem editou/abriu: a auditoria grava só o e-mail; o
  painel recebe também o nome, procurado nesta ordem (primeira aba de
  cada planilha, títulos na linha 1, chaves no ID_INDEX):
    SERVIDORES         A e-mail · B nome · C setor
    PLANILHA_DOCENTES  D e-mail · B nome
    PLANILHA_ALUNOS    D e-mail (ou a coluna de título "eMail Secundario") · B nome
  Fora das três: "Pessoa não cadastrada com acesso". Só vão ao navegador
  nome, vínculo e setor dos e-mails que aparecem na auditoria.
=====================================================================*/

var PAINEL_AUDITORIA = {
  MAX_EDICOES: 5000,
  // Colunas lidas da planilha das secretarias (C a M), linha 4 em diante.
  COL_INICIAL: 3,
  N_COLUNAS: 11   // C código · D nome · E tipo · F modalidade · G será oferecida · H docente · I semestre ideal · J créditos · K dia · L início · M fim
};

/**
 * (1.11.0) Cadastros onde o nome de quem aparece na auditoria é procurado,
 * na ordem. Colunas pela posição (A = 1), dados da linha 2 em diante.
 */
var PESSOAS_AUDITORIA = {
  FONTES: [
    { chave: 'SERVIDORES', vinculo: 'servidor', descricao: 'servidores', colsEmail: [1], colNome: 2, colSetor: 3 },
    { chave: 'PLANILHA_DOCENTES', vinculo: 'docente', descricao: 'docentes', colsEmail: [4], colNome: 2 },
    // E-mail secundário pelo título (na planilha real, E é "ID da Pasta").
    { chave: 'PLANILHA_ALUNOS', vinculo: 'aluno', descricao: 'alunos', colsEmail: [4], colNome: 2, titulosEmail: ['eMail Secundario'] }
  ],
  // Nome achado (ou "não cadastrado", com as três planilhas lidas) fica em cache por e-mail.
  CACHE_SEGUNDOS: 600,
  CACHE_PREFIXO: 'pessoaAud:'
};

/**
 * PÚBLICA. Dados do painel da auditoria.
 * @param {Object} pedido { semestre: 'AAAA/S' } (opcional; padrão = semestre atual)
 * @return {{ok, dados:{ semestres:[{semestre, atual}], semestre, atual, nomeGrade,
 *   edicoes:[[data, origem, email, aba, celula, campo, codigo, disciplina, antes, depois, tipo, celulas, obs, evento]],
 *   totalEdicoes, limitadas, andamento:null|[{aba, disciplinas:[[codigo, nome, tipo, modalidade, oferecida, docente, semestreIdeal, creditos, dia, inicio, fim]]}],
 *   pessoas:[{email, edicoes, ultima}], aberturas:null|[{email, aberturas, ultima}], totalAberturas,
 *   identificacao:{pessoas:{emailMinusculo:{nome, vinculo, setor}}, indisponiveis:[descricao]},
 *   geradoEm}}}
 * (1.11.0) identificacao.pessoas: vinculo 'servidor' | 'docente' | 'aluno' |
 * 'nao_cadastrado' (lido nas três planilhas, não achado); e-mail ausente do
 * mapa = não foi possível confirmar (algum cadastro não abriu: indisponiveis).
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

    var edicoes = [], total = 0, pessoas = [], aberturas = null, totalAberturas = 0, identificacao = { pessoas: {}, indisponiveis: [] };
    if (comAuditoria[semestre]) {
      var aud;
      try { aud = SpreadsheetApp.openById(comAuditoria[semestre]); }
      catch (e) { throw erroAmigavel_('AUDITORIA_INACESSIVEL', 'Não foi possível abrir a planilha de auditoria de ' + semestre + '. Avise o Serviço de Graduação.'); }
      var lidas = edicoesDaAuditoria_(aud);
      edicoes = lidas.edicoes; total = lidas.total;
      pessoas = edicoesPorPessoa_(aud);
      var ab = aberturasPorPessoa_(aud);
      if (ab) { aberturas = ab.pessoas; totalAberturas = ab.total; }
      // Eventos do sistema aparecem como "Sistema": só pessoas das edições das secretarias e das aberturas.
      identificacao = identificarPessoas_(edicoes.filter(function (l) { return l[1] !== 'Sistema'; }).map(function (l) { return l[2]; })
        .concat(pessoas.map(function (p) { return p.email; }), (aberturas || []).map(function (p) { return p.email; })));
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
      identificacao: identificacao,
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

/*---------------------------------------------------------------------
  (1.11.0) Nome de quem aparece na auditoria
---------------------------------------------------------------------*/

/**
 * Procura os e-mails nos cadastros de PESSOAS_AUDITORIA.FONTES, na ordem:
 * cada fonte só é aberta se ainda falta alguém. Um cadastro que não abre
 * (chave ausente, sem acesso, vazio) não derruba o painel: vai para
 * indisponiveis e quem não foi achado nas outras fica sem confirmação
 * (fora do mapa), em vez de aparecer como "não cadastrado".
 * @param {string[]} emails como estão na auditoria (repetidos e vazios são ignorados)
 * @return {{pessoas: Object, indisponiveis: string[]}}
 */
function identificarPessoas_(emails) {
  var pedidos = {};
  (emails || []).forEach(function (e) {
    var k = normalizarEmail_(e);
    if (k && k.indexOf('@') > 0) pedidos[k] = true;
  });
  var lista = Object.keys(pedidos);
  var res = { pessoas: {}, indisponiveis: [] };
  if (!lista.length) return res;

  var cache = CacheService.getScriptCache();
  var emCache = cache.getAll(lista.map(function (k) { return PESSOAS_AUDITORIA.CACHE_PREFIXO + k; })) || {};
  var faltam = lista.filter(function (k) {
    var v = emCache[PESSOAS_AUDITORIA.CACHE_PREFIXO + k];
    if (!v) return true;
    try { res.pessoas[k] = JSON.parse(v); return false; } catch (e) { return true; }
  });
  if (!faltam.length) return res;

  var achados = {};
  PESSOAS_AUDITORIA.FONTES.forEach(function (fonte) {
    var restantes = faltam.filter(function (k) { return !achados[k]; });
    if (!restantes.length) return;
    var mapa;
    try { mapa = lerCadastroDePessoas_(fonte); }
    catch (e) {
      console.error('identificarPessoas_ ' + fonte.chave + ': ' + String(e && e.message || e).replace(/[A-Za-z0-9_-]{25,}/g, '[…]').replace(/\S+@\S+/g, '[e-mail]'));
      res.indisponiveis.push(fonte.descricao);
      return;
    }
    restantes.forEach(function (k) { if (mapa[k]) achados[k] = mapa[k]; });
  });

  var gravar = {};
  faltam.forEach(function (k) {
    var p = achados[k];
    if (!p && res.indisponiveis.length) return;   // sem confirmação: não diz "não cadastrado" nem guarda em cache
    p = p || { nome: '', vinculo: 'nao_cadastrado', setor: '' };
    res.pessoas[k] = p;
    gravar[PESSOAS_AUDITORIA.CACHE_PREFIXO + k] = JSON.stringify(p);
  });
  if (Object.keys(gravar).length) {
    try { cache.putAll(gravar, PESSOAS_AUDITORIA.CACHE_SEGUNDOS); } catch (e) { /* cache é só atalho */ }
  }
  return res;
}

/** Título de coluna comparável: sem acentos, espaços e maiúsculas ("eMail Secundario" → "emailsecundario"). */
function tituloComparavel_(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
}

/**
 * Colunas de e-mail de um cadastro: as fixas (colsEmail) e as achadas pelo
 * título na linha 1 (titulosEmail). @return {{cols: number[], semTitulo: string[]}}
 */
function colunasDeEmail_(aba, fonte) {
  var cols = fonte.colsEmail.slice(), semTitulo = [];
  if (fonte.titulosEmail && fonte.titulosEmail.length) {
    var largura = Math.max(1, aba.getLastColumn());
    var cab = aba.getRange(1, 1, 1, largura).getDisplayValues()[0].map(tituloComparavel_);
    fonte.titulosEmail.forEach(function (t) {
      var i = cab.indexOf(tituloComparavel_(t));
      if (i < 0) semTitulo.push(t);
      else if (cols.indexOf(i + 1) < 0) cols.push(i + 1);
    });
  }
  return { cols: cols, semTitulo: semTitulo };
}

/**
 * Mapa e-mail (minúsculo) → {nome, vinculo, setor} de um cadastro: primeira
 * aba, linha 2 em diante. E-mail repetido: vale a primeira linha com nome.
 */
function lerCadastroDePessoas_(fonte) {
  var aba = SpreadsheetApp.openById(idDoIndex_(fonte.chave)).getSheets()[0];
  if (!aba) throw new Error('planilha sem abas');
  var mapa = {};
  var n = aba.getLastRow() - 1;
  if (n < 1) return mapa;
  var colsEmail = colunasDeEmail_(aba, fonte).cols;
  var ultimaCol = Math.max.apply(null, colsEmail.concat([fonte.colNome, fonte.colSetor || 1]));
  aba.getRange(2, 1, n, ultimaCol).getDisplayValues().forEach(function (l) {
    var nome = String(l[fonte.colNome - 1] || '').replace(/\s+/g, ' ').trim();
    if (!nome) return;
    var p = { nome: nome, vinculo: fonte.vinculo, setor: fonte.colSetor ? String(l[fonte.colSetor - 1] || '').replace(/\s+/g, ' ').trim() : '' };
    colsEmail.forEach(function (c) {
      var k = normalizarEmail_(l[c - 1]);
      if (k && !mapa[k]) mapa[k] = p;
    });
  });
  return mapa;
}

/**
 * (1.11.0) Para rodar no editor: confere se os três cadastros abrem e
 * mostra os títulos das colunas usadas e o número de linhas. Não registra
 * nomes, e-mails nem IDs.
 */
/** 1 → "A", 27 → "AA". */
function letraDaColuna_(c) {
  var s = '';
  for (; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s;
  return s;
}

function diagnosticarNomesAuditoria() {
  var r = executarComSeguranca_('diagnosticarNomesAuditoria', function () {
    exigirAdmin_();
    return PESSOAS_AUDITORIA.FONTES.map(function (fonte) {
      try {
        var aba = SpreadsheetApp.openById(idDoIndex_(fonte.chave)).getSheets()[0];
        var emails = colunasDeEmail_(aba, fonte);
        var cols = emails.cols.concat([fonte.colNome], fonte.colSetor ? [fonte.colSetor] : []);
        var cab = aba.getRange(1, 1, 1, Math.max.apply(null, cols)).getDisplayValues()[0];
        var titulos = {};
        cols.forEach(function (c) { titulos[letraDaColuna_(c)] = String(cab[c - 1] || '').trim(); });
        var r = { chave: fonte.chave, aberta: true, aba: aba.getName(), linhas: Math.max(0, aba.getLastRow() - 1), titulos: titulos };
        if (emails.semTitulo.length) r.colunaNaoEncontrada = emails.semTitulo;
        return r;
      } catch (e) {
        return { chave: fonte.chave, aberta: false, motivo: String(e && e.message || e).replace(/[A-Za-z0-9_-]{25,}/g, '[…]') };
      }
    });
  });
  console.log(JSON.stringify(r));
  return r;
}
