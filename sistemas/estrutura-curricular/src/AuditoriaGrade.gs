/*=====================================================================
  AUDITORIA DA GRADE HORÁRIA (1.6.0)

  Registra QUEM editou O QUÊ na planilha das secretarias
  (GRADE_HORARIA_PREENCHIMENTO), numa planilha de auditoria POR SEMESTRE,
  fora do alcance delas. Pensada para alimentar um futuro painel de
  auditoria: uma linha por célula editada, com o valor anterior e o novo.

  Onde ficam as coisas (planilha ID_INDEX, coluna C; nenhum ID no código):
    AUDITORIA_GRADES_ANTERIORES             pasta das planilhas de auditoria
    INDEX_GRADE_HORARIA_VERSOES_ANTERIORES  índice: A = Semestre, B = ID
                                            (cópia de segurança), C =
                                            Auditoria_ID

  Ciclo (ver EnvioGrade.gs): ao enviar a grade do semestre X, a planilha
  "Auditoria - Grade Horária - 1º semestre de 2027" é criada na pasta (ou
  reaproveitada, se X já tem auditoria) e o ID vai para a coluna C da linha
  de X no índice. A cópia de segurança da grade anterior (Y) vai para a
  coluna B da linha de Y. Os dois IDs entram em momentos diferentes.

  Como as edições chegam aqui: um acionador INSTALÁVEL de edição na
  planilha das secretarias, criado por ativarAuditoriaGrade() (editor do
  Apps Script, uma vez). Ele roda neste projeto, no servidor do Google,
  com a autorização de quem o ativou — por isso grava na auditoria, que as
  secretarias não acessam — e não deixa a planilha delas mais lenta. O
  semestre de cada edição vem do NOME da planilha das secretarias.

  Limites do Google: o e-mail de quem editou só vem para contas do mesmo
  domínio (@usp.br); em colagens de várias células não vem o valor
  anterior; alterações feitas por scripts (o envio, as validações) não
  disparam o acionador — o envio registra o próprio evento.

  (1.8.0) Aberturas: um segundo acionador instalável, de ABERTURA da
  planilha das secretarias (registrarAberturaGrade), anota cada vez que
  alguém com permissão de edição abre o arquivo — aba "Aberturas" da
  auditoria do semestre (data e hora, semestre, e-mail). O Google só
  dispara esse acionador no navegador (não no aplicativo do celular) e
  só informa o e-mail de contas do mesmo domínio.
=====================================================================*/

var AUDITORIA = {
  CHAVE_PASTA: 'AUDITORIA_GRADES_ANTERIORES',
  HANDLER: 'registrarEdicaoGrade',
  HANDLER_ABERTURA: 'registrarAberturaGrade',
  ABA: 'Edições',
  ABA_ABERTURAS: 'Aberturas',
  CABECALHO_ABERTURAS: ['Data e hora', 'Semestre', 'E-mail'],
  ABA_SOBRE: 'Sobre',
  // Colagens maiores que isto viram uma linha-resumo (o Google entrega a faixa inteira).
  MAX_CELULAS: 300,
  CABECALHO: ['Data e hora', 'Semestre', 'Origem', 'E-mail', 'Aba', 'Célula', 'Linha', 'Coluna', 'Campo',
    'Código da disciplina', 'Disciplina (como está na planilha)', 'Valor anterior', 'Valor novo',
    'Tipo de edição', 'Células no evento', 'Observação', 'ID do evento'],
  CACHE_SEGUNDOS: 21600
};

// Colunas do índice das grades anteriores (linha 1).
var INDICE_GRADES = { SEMESTRE: 1, BACKUP: 2, AUDITORIA: 3, TITULOS: ['Semestre', 'ID', 'Auditoria_ID'] };

/*---------------------------------------------------------------------
  Índice das grades anteriores
---------------------------------------------------------------------*/

/** Confere o cabeçalho (A1 Semestre, B1 ID, C1 Auditoria_ID). */
function conferirIndiceDasGrades_(aba) {
  if (aba.getMaxColumns() < 3) throw erroAmigavel_('CONFIGURACAO', 'A planilha-índice das grades anteriores precisa das colunas A (Semestre), B (ID) e C (Auditoria_ID). Nada foi alterado.');
  var cab = aba.getRange(1, 1, 1, 3).getDisplayValues()[0].map(function (t) { return semAcento_(String(t)).replace(/[\s_]+/g, '').toLowerCase(); });
  var esperado = INDICE_GRADES.TITULOS.map(function (t) { return semAcento_(t).replace(/[\s_]+/g, '').toLowerCase(); });
  if (cab.join('|') !== esperado.join('|')) {
    throw erroAmigavel_('CONFIGURACAO', 'A planilha-índice das grades anteriores deve ter, na linha 1, "Semestre" (A), "ID" (B) e "Auditoria_ID" (C). Nada foi alterado.');
  }
}

/** Linhas do índice: [{ linha, semestre, backup, auditoria }]. */
function linhasDoIndice_(aba) {
  var n = aba.getLastRow() - 1;
  if (n < 1) return [];
  return aba.getRange(2, 1, n, 3).getDisplayValues().map(function (l, i) {
    return { linha: i + 2, semestre: String(l[0]).trim(), backup: String(l[1]).trim(), auditoria: String(l[2]).trim() };
  });
}

/** Escreve numa linha nova do índice (acrescenta linhas se preciso). */
function acrescentarAoIndice_(aba, valores) {
  var linha = Math.max(aba.getLastRow(), 1) + 1;
  if (linha > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), linha - aba.getMaxRows());
  aba.getRange(linha, 1, 1, 3).setValues([valores]);
  return linha;
}

/**
 * Cópia de segurança do semestre: vai para a coluna B da primeira linha
 * desse semestre com B vazia (a linha criada com a auditoria); se não
 * houver, numa linha nova (ex.: reenvio do mesmo semestre).
 */
function registrarBackupNoIndice_(aba, semestre, idCopia) {
  var livre = linhasDoIndice_(aba).filter(function (l) { return l.semestre === semestre && !l.backup; })[0];
  if (livre) { aba.getRange(livre.linha, INDICE_GRADES.BACKUP).setValue(idCopia); return livre.linha; }
  return acrescentarAoIndice_(aba, [textoSeguro_(semestre), idCopia, '']);
}

/** ID da auditoria do semestre no índice ('' se não há). */
function idDaAuditoriaNoIndice_(aba, semestre) {
  var l = linhasDoIndice_(aba).filter(function (x) { return x.semestre === semestre && x.auditoria; })[0];
  return l ? l.auditoria : '';
}

/*---------------------------------------------------------------------
  Planilha de auditoria do semestre
---------------------------------------------------------------------*/

/** "2027/1" → "Auditoria - Grade Horária - 1º semestre de 2027". */
function nomeDaAuditoria_(semestre) {
  var p = String(semestre).split('/');
  return 'Auditoria - Grade Horária - ' + p[1] + 'º semestre de ' + p[0];
}

/**
 * Auditoria do semestre: a do índice (coluna C) ou, com criar, uma nova
 * na pasta AUDITORIA_GRADES_ANTERIORES, registrada na coluna C da linha
 * do semestre (a primeira com C vazia; senão, linha nova).
 * @return {{ss, criada: boolean}}
 */
function auditoriaDoSemestre_(abaIndice, semestre, pasta, criar) {
  var id = idDaAuditoriaNoIndice_(abaIndice, semestre);
  if (id) {
    try { return { ss: SpreadsheetApp.openById(id), criada: false }; }
    catch (e) { throw erroAmigavel_('CONFIGURACAO', 'O índice das grades anteriores aponta uma planilha de auditoria para ' + semestre + ' que não abre (apagada ou sem acesso para a conta do sistema). Corrija a coluna C (Auditoria_ID) dessa linha. Nada foi alterado.'); }
  }
  if (!criar) return { ss: null, criada: false };
  var ss = SpreadsheetApp.create(nomeDaAuditoria_(semestre));
  DriveApp.getFileById(ss.getId()).moveTo(pasta);
  prepararPlanilhaDeAuditoria_(ss, semestre);
  var livre = linhasDoIndice_(abaIndice).filter(function (l) { return l.semestre === semestre && !l.auditoria; })[0];
  if (livre) abaIndice.getRange(livre.linha, INDICE_GRADES.AUDITORIA).setValue(ss.getId());
  else acrescentarAoIndice_(abaIndice, [textoSeguro_(semestre), '', ss.getId()]);
  CacheService.getScriptCache().remove('auditoriaGrade:' + semestre);
  return { ss: ss, criada: true };
}

/** Abas "Edições" (registro) e "Sobre" (o que é cada coluna). */
function prepararPlanilhaDeAuditoria_(ss, semestre) {
  var aba = ss.getSheets()[0];
  aba.setName(AUDITORIA.ABA);
  aba.getRange(1, 1, 1, AUDITORIA.CABECALHO.length).setValues([AUDITORIA.CABECALHO]).setFontWeight('bold');
  aba.setFrozenRows(1);
  aba.getRange(2, 1, aba.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  abaDeAberturas_(ss);
  var sobre = ss.insertSheet(AUDITORIA.ABA_SOBRE);
  var linhas = [
    ['Auditoria da Grade Horária — ' + semestre, ''],
    ['Gerada pelo sistema Estrutura Curricular (Serviço de Graduação). Não edite a aba "Edições": ela é a fonte do painel de auditoria.', ''],
    ['', ''],
    ['Coluna', 'O que é'],
    ['Data e hora', 'Quando a edição foi salva (horário de São Paulo).'],
    ['Semestre', 'Semestre da grade (do nome da planilha das secretarias no momento da edição).'],
    ['Origem', '"Secretaria" (edição na planilha) ou "Sistema" (envio da grade, ativação da auditoria).'],
    ['E-mail', 'Quem editou. O Google só informa contas do mesmo domínio (@usp.br); as demais aparecem como "(não identificado)".'],
    ['Aba / Célula / Linha / Coluna', 'Onde foi a edição (ex.: PSA, K12, 12, K).'],
    ['Campo', 'Título da coluna na linha 3 (ex.: Dia da semana, Horário de Início).'],
    ['Código da disciplina / Disciplina', 'Colunas C e D da mesma linha no momento da edição.'],
    ['Valor anterior / Valor novo', 'Conteúdo antes e depois. Em colagens de várias células o Google não informa o valor anterior.'],
    ['Tipo de edição', 'Preencheu, Alterou, Apagou (uma célula); Colagem ou preenchimento (várias); Resumo (colagem grande demais); eventos do sistema.'],
    ['Células no evento', 'Quantas células a mesma ação alterou (uma colagem gera uma linha por célula, com o mesmo ID do evento).'],
    ['Observação', 'Detalhes de eventos do sistema.'],
    ['ID do evento', 'Agrupa as linhas de uma mesma ação.'],
    ['', ''],
    ['Aba "Aberturas" (1.8.0)', 'Cada vez que alguém com permissão de edição abre a planilha das secretarias no navegador: data e hora, semestre e e-mail. Não edite: é a fonte do gráfico "Quem mais abre a planilha".']
  ];
  sobre.getRange(1, 1, linhas.length, 2).setValues(linhas);
  sobre.getRange(1, 1, 1, 1).setFontWeight('bold');
  sobre.getRange(4, 1, 1, 2).setFontWeight('bold');
}

/**
 * (1.8.0) Aba "Aberturas" da auditoria; cria se não existir (as
 * auditorias criadas antes da 1.8.0 não a têm).
 */
function abaDeAberturas_(ss) {
  var aba = ss.getSheetByName(AUDITORIA.ABA_ABERTURAS);
  if (aba) return aba;
  aba = ss.insertSheet(AUDITORIA.ABA_ABERTURAS);
  aba.getRange(1, 1, 1, AUDITORIA.CABECALHO_ABERTURAS.length).setValues([AUDITORIA.CABECALHO_ABERTURAS]).setFontWeight('bold');
  aba.setFrozenRows(1);
  aba.getRange(2, 1, Math.max(aba.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return aba;
}

/*---------------------------------------------------------------------
  (1.8.11) Escrita na aba "Edições" e a trava do script
  -------------------------------------------------------------------
  Todas as escritas por POSIÇÃO na auditoria (última linha → ampliar a
  aba → gravar o bloco) acontecem sob a trava do script
  (LockService.getScriptLock: a mesma do envio, da preparação e das
  importações; contas diferentes disputam a mesma trava). Contrato:
   - gravarNaAuditoriaSobTrava_(ss, linhas, trava): rotina INTERNA para
     quem JÁ tem a trava — recebe o próprio objeto Lock que o chamador
     adquiriu nesta execução (nunca vem do cliente). Não adquire de novo,
     não libera e não faz flush: a trava continua do chamador até a saída
     dele (o envio a mantém até o fim: eventos, conferência das fórmulas e
     o flush do executor). Sem trava adquirida nesse objeto, recusa sem
     escrever.
   - gravarNaAuditoria_(ss, linhas): ENTRADA independente (acionador de
     edição). Adquire a trava (até 45 s); se não conseguir, NÃO grava
     nada (nem appendRow de reserva) e não toca na trava da outra
     execução: lança erro, que o acionador registra no log. Com a trava:
     grava, flush e libera no finally (também com exceção).
  A trava só exclui execuções DESTE projeto: não impede ninguém de editar
  a planilha de auditoria à mão no Google Sheets.
---------------------------------------------------------------------*/
function gravarNaAuditoriaSobTrava_(ssAuditoria, linhas, trava) {
  if (!trava || !trava.hasLock()) throw new Error('gravarNaAuditoriaSobTrava_: a trava do chamador não está adquirida; nada foi gravado na auditoria');
  if (!linhas.length) return;
  var aba = ssAuditoria.getSheetByName(AUDITORIA.ABA) || ssAuditoria.getSheets()[0];
  var inicio = aba.getLastRow() + 1;
  var faltam = inicio + linhas.length - 1 - aba.getMaxRows();
  if (faltam > 0) aba.insertRowsAfter(aba.getMaxRows(), faltam + 500);
  aba.getRange(inicio, 1, linhas.length, AUDITORIA.CABECALHO.length).setValues(linhas);
}

/** Entrada independente: adquire a trava, grava, flush e libera (ver contrato acima). */
function gravarNaAuditoria_(ssAuditoria, linhas) {
  if (!linhas.length) return;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(45000)) throw new Error('trava do sistema ocupada por outra execução por mais de 45 s; nada foi gravado na auditoria');
  try {
    gravarNaAuditoriaSobTrava_(ssAuditoria, linhas, trava);
    SpreadsheetApp.flush();
  } finally {
    trava.releaseLock();
  }
}

/** Linha de evento do sistema (envio da grade, ativação, etc.). */
function linhaDeEventoDoSistema_(semestre, email, tipo, observacao) {
  return [new Date(), textoSeguro_(semestre), 'Sistema', textoSeguro_(email || ''), '', '', '', '', '', '', '', '', '',
    textoSeguro_(tipo), '', textoSeguro_(observacao || ''), Utilities.getUuid()];
}

/*---------------------------------------------------------------------
  Acionador de edição (roda neste projeto, no servidor)
---------------------------------------------------------------------*/

/**
 * Acionador instalável de edição da planilha das secretarias. Não
 * renomear: o acionador aponta para este nome. Chamado pela página com
 * dados inventados, não faz nada (o evento precisa de um Range de
 * verdade, da planilha das secretarias).
 */
function registrarEdicaoGrade(e) {
  if (!e || !e.range || typeof e.range.getSheet !== 'function') return;
  try {
    var aba = e.range.getSheet();
    var ss = aba.getParent();
    if (ss.getId() !== idDaGradeEmCache_()) return;
    var semestre = semestreDoNomeDaGrade_(ss.getName());
    if (!semestre) { console.warn('registrarEdicaoGrade: o nome da planilha da grade não indica o semestre; edição não registrada'); return; }
    var auditoria = auditoriaEmCache_(semestre);
    if (!auditoria) { console.warn('registrarEdicaoGrade: não há auditoria para ' + semestre + '; edição não registrada'); return; }
    gravarNaAuditoria_(auditoria, linhasDaEdicao_(e, aba, semestre, emailDoEditor_(e), new Date()));
  } catch (erro) {
    console.error('registrarEdicaoGrade falhou: ' + String(erro && erro.message || erro).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
  }
}

/**
 * (1.8.0) Acionador instalável de ABERTURA da planilha das secretarias.
 * Não renomear. Anota data e hora, semestre e e-mail na aba "Aberturas"
 * da auditoria do semestre. Chamado pela página com dados inventados,
 * não faz nada (precisa de uma planilha de verdade em e.source).
 */
function registrarAberturaGrade(e) {
  if (!e || !e.source || typeof e.source.getId !== 'function') return;
  try {
    var ss = e.source;
    if (ss.getId() !== idDaGradeEmCache_()) return;
    var semestre = semestreDoNomeDaGrade_(ss.getName());
    if (!semestre) return;
    var auditoria = auditoriaEmCache_(semestre);
    if (!auditoria) { console.warn('registrarAberturaGrade: não há auditoria para ' + semestre + '; abertura não registrada'); return; }
    // (1.8.11) Sob a trava do script, como as demais escritas da auditoria: a aba "Aberturas"
    // pode ser CRIADA aqui (auditorias anteriores à 1.8.0) e também pela ativação e pelo envio.
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(45000)) { console.error('registrarAberturaGrade: trava do sistema ocupada por outra execução por mais de 45 s; abertura não registrada'); return; }
    try {
      abaDeAberturas_(auditoria).appendRow([new Date(), textoSeguro_(semestre), textoSeguro_(emailDoEditor_(e))]);
      SpreadsheetApp.flush();
    } finally {
      trava.releaseLock();
    }
  } catch (erro) {
    console.error('registrarAberturaGrade falhou: ' + String(erro && erro.message || erro).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
  }
}

function idDaGradeEmCache_() {
  var cache = CacheService.getScriptCache();
  var id = cache.get('idGradePreenchimento');
  if (!id) { id = idDoIndex_(ENVIO_GRADE.CHAVE_PLANILHA); cache.put('idGradePreenchimento', id, AUDITORIA.CACHE_SEGUNDOS); }
  return id;
}

/** Planilha de auditoria do semestre (null se o índice não tem). Guarda o ID em cache. */
function auditoriaEmCache_(semestre) {
  var cache = CacheService.getScriptCache();
  var chave = 'auditoriaGrade:' + semestre;
  var id = cache.get(chave);
  if (!id) {
    var indice = SpreadsheetApp.openById(idDoIndex_(ENVIO_GRADE.CHAVE_INDICE)).getSheets()[0];
    id = idDaAuditoriaNoIndice_(indice, semestre);
    if (!id) return null;
    cache.put(chave, id, AUDITORIA.CACHE_SEGUNDOS);
  }
  try { return SpreadsheetApp.openById(id); }
  catch (e) { cache.remove(chave); throw e; }
}

/**
 * E-mail de quem editou, só pelo evento (e.user). Não usa
 * Session.getActiveUser como reserva: num acionador instalável isso
 * poderia atribuir a edição à conta errada.
 */
function emailDoEditor_(e) {
  var email = '';
  try { if (e.user && typeof e.user.getEmail === 'function') email = e.user.getEmail() || ''; } catch (x) { email = ''; }
  return email || '(não identificado)';
}

/** Letra(s) da coluna: 13 → "M". */
function letraDaColuna_(n) {
  var s = '';
  while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Valor do evento em texto; horário que chega como fração do dia vira HH:mm. */
function valorDoEvento_(valor, ehHorario) {
  if (valor === undefined || valor === null) return '';
  var t = String(valor);
  // 1.6.4: numa planilha em português o Google manda a fração com vírgula ("0,3333333333" = 08:00)
  if (ehHorario && /^\d*[.,]?\d+$/.test(t)) {
    var f = Number(t.replace(',', '.'));
    if (f >= 0 && f < 1) { var m = Math.round(f * 1440); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  }
  return t;
}

/**
 * Linhas da auditoria para um evento de edição. Nas 6 abas de
 * disciplinas, linha ≥ 4: campo = título da linha 3, disciplina = C e D
 * da linha. Uma célula: Preencheu / Alterou / Apagou, com valor anterior.
 * Várias: uma linha por célula (sem valor anterior); acima de
 * AUDITORIA.MAX_CELULAS, uma linha-resumo.
 */
function linhasDaEdicao_(e, aba, semestre, email, agora) {
  var r = e.range;
  var nomeAba = aba.getName();
  var ehDisciplinas = ENVIO_GRADE.ABAS.some(function (a) { return a.aba === nomeAba; });
  var lin0 = r.getRow(), col0 = r.getColumn(), nLin = r.getNumRows(), nCol = r.getNumColumns();
  var total = nLin * nCol;
  var idEvento = Utilities.getUuid();
  var t = function (v) { return textoSeguro_(v === null || v === undefined ? '' : v); };
  function linha(l, c, campo, codigo, disciplina, antes, depois, tipo, obs) {
    return [agora, t(semestre), 'Secretaria', t(email), t(nomeAba), letraDaColuna_(c) + l, l, letraDaColuna_(c), t(campo),
      t(codigo), t(disciplina), t(antes), t(depois), tipo, total, t(obs || ''), idEvento];
  }
  var titulos = ehDisciplinas ? aba.getRange(ENVIO_GRADE.LINHA_CABECALHO, col0, 1, nCol).getDisplayValues()[0].map(function (x) { return String(x).replace(/\s+/g, ' ').trim(); }) : null;
  var disc = (ehDisciplinas && lin0 + nLin - 1 >= ENVIO_GRADE.LINHA_INICIAL)
    ? aba.getRange(lin0, ENVIO_GRADE.COLUNAS.codigo, nLin, 2).getDisplayValues() : null;
  var discDe = function (i) { return disc && lin0 + i >= ENVIO_GRADE.LINHA_INICIAL ? disc[i] : ['', '']; };

  if (total === 1) {
    var campo = titulos ? titulos[0] : '';
    var ehHorario = /hor[áa]rio/i.test(campo);
    var antes = valorDoEvento_(e.oldValue, ehHorario);
    var depois = e.value !== undefined ? valorDoEvento_(e.value, ehHorario) : r.getDisplayValue();
    var tipo = depois === '' ? 'Apagou' : (antes === '' ? 'Preencheu' : 'Alterou');
    return [linha(lin0, col0, campo, discDe(0)[0], discDe(0)[1], antes, depois, tipo)];
  }
  if (total > AUDITORIA.MAX_CELULAS) {
    return [[agora, t(semestre), 'Secretaria', t(email), t(nomeAba), r.getA1Notation(), lin0, letraDaColuna_(col0) + ':' + letraDaColuna_(col0 + nCol - 1),
      '', '', '', '', '', 'Resumo (colagem grande)', total, 'Faixa com ' + total + ' células: grande demais para uma linha por célula.', idEvento]];
  }
  var valores = r.getDisplayValues();
  var saida = [];
  for (var i = 0; i < nLin; i++) {
    for (var j = 0; j < nCol; j++) {
      saida.push(linha(lin0 + i, col0 + j, titulos ? titulos[j] : '', discDe(i)[0], discDe(i)[1],
        '', valores[i][j], 'Colagem ou preenchimento', 'O Google não informa o valor anterior em edições de várias células.'));
    }
  }
  return saida;
}

/*---------------------------------------------------------------------
  Ativar / desativar (editor do Apps Script, conta que implanta)
---------------------------------------------------------------------*/

function acionadoresDaAuditoria_() {
  return ScriptApp.getProjectTriggers().filter(function (g) { var h = g.getHandlerFunction(); return h === AUDITORIA.HANDLER || h === AUDITORIA.HANDLER_ABERTURA; });
}

/** Há acionador do handler para a planilha das secretarias? */
function acionadorInstalado_(handler, idGrade) {
  return ScriptApp.getProjectTriggers().some(function (g) { return g.getHandlerFunction() === handler && g.getTriggerSourceId && g.getTriggerSourceId() === idGrade; });
}

/** Os DOIS acionadores da auditoria (edição e, desde a 1.8.0, abertura) estão instalados para a planilha das secretarias? */
function auditoriaAtiva_(idGrade) {
  return acionadorInstalado_(AUDITORIA.HANDLER, idGrade) && acionadorInstalado_(AUDITORIA.HANDLER_ABERTURA, idGrade);
}

/**
 * Executar UMA vez no editor (menu Executar), com a conta que implanta:
 * cria (ou reaproveita) a auditoria do semestre que está no nome da
 * planilha das secretarias e instala o acionador de edição. Pode ser
 * repetida sem duplicar nada. Não mostra IDs.
 */
function ativarAuditoriaGrade() {
  var r = executarComSeguranca_('ativarAuditoriaGrade', function () {
    var usuario = exigirAdmin_();
    // (1.8.11) A ativação escreve no índice (coluna C), pode criar a auditoria e a aba "Aberturas"
    // e anota um evento por posição: tudo sob a trava do script, como o envio da grade.
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(10000)) throw erroAmigavel_('OCUPADO', 'Outra gravação está em andamento. Aguarde alguns segundos e execute de novo.');
    try {
      return ativarAuditoriaSobTrava_(usuario, trava);
    } finally {
      trava.releaseLock();
    }
  });
  console.log(JSON.stringify(r));
  return r;
}

/** (1.8.11) Corpo de ativarAuditoriaGrade, com a trava já adquirida pela própria ativação. */
function ativarAuditoriaSobTrava_(usuario, trava) {
  var grade = abrirPorChave_(ENVIO_GRADE.CHAVE_PLANILHA, 'planilha', 'a planilha da grade horária');
  var semestre = semestreDoNomeDaGrade_(grade.getName());
  if (!semestre) throw erroAmigavel_('NOME_SEM_SEMESTRE', 'O nome da planilha da grade ("' + grade.getName() + '") não diz o semestre. Renomeie para "Grade Horária - 1º semestre de AAAA" e execute de novo.');
  var abaIndice = abrirPorChave_(ENVIO_GRADE.CHAVE_INDICE, 'planilha', 'a planilha-índice das grades anteriores').getSheets()[0];
  conferirIndiceDasGrades_(abaIndice);
  var pasta = abrirPorChave_(AUDITORIA.CHAVE_PASTA, 'pasta', 'a pasta das auditorias');
  var aud = auditoriaDoSemestre_(abaIndice, semestre, pasta, true);
  var outros = acionadoresDaAuditoria_().filter(function (g) { return g.getTriggerSourceId() !== grade.getId(); });
  outros.forEach(function (g) { ScriptApp.deleteTrigger(g); });
  var edicaoJa = acionadorInstalado_(AUDITORIA.HANDLER, grade.getId());
  if (!edicaoJa) ScriptApp.newTrigger(AUDITORIA.HANDLER).forSpreadsheet(grade.getId()).onEdit().create();
  // 1.8.0: acionador de abertura (gráfico "Quem mais abre a planilha")
  var aberturaJa = acionadorInstalado_(AUDITORIA.HANDLER_ABERTURA, grade.getId());
  if (!aberturaJa) ScriptApp.newTrigger(AUDITORIA.HANDLER_ABERTURA).forSpreadsheet(grade.getId()).onOpen().create();
  abaDeAberturas_(aud.ss);
  var obs = [edicaoJa ? 'Acionador de edição já estava instalado.' : 'Acionador de edição instalado na planilha das secretarias.',
    aberturaJa ? 'Acionador de abertura já estava instalado.' : 'Acionador de abertura instalado na planilha das secretarias.'].join(' ');
  gravarNaAuditoriaSobTrava_(aud.ss, [linhaDeEventoDoSistema_(semestre, usuario.email, 'Auditoria ativada', obs)], trava);
  SpreadsheetApp.flush();   // (1.8.11) antes de a ativação liberar a trava
  CacheService.getScriptCache().remove('idGradePreenchimento');
  return {
    planilhaDaGrade: grade.getName(), semestre: semestre, auditoria: aud.ss.getName() + (aud.criada ? ' (criada agora)' : ' (já existia)'),
    acionador: edicaoJa ? 'já estava instalado' : 'instalado agora',
    acionadorAbertura: aberturaJa ? 'já estava instalado' : 'instalado agora',
    acionadoresRemovidos: outros.length
  };
}

/** Remove os acionadores da auditoria — edição e abertura (as planilhas de auditoria continuam). */
function desativarAuditoriaGrade() {
  var r = executarComSeguranca_('desativarAuditoriaGrade', function () {
    exigirAdmin_();
    var gs = acionadoresDaAuditoria_();
    gs.forEach(function (g) { ScriptApp.deleteTrigger(g); });
    return { acionadoresRemovidos: gs.length };
  });
  console.log(JSON.stringify(r));
  return r;
}
