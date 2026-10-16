/*=====================================================================
  PLANILHA DAS SECRETARIAS — PROTEÇÃO DE ACESSO

  Só os e-mails autorizados preenchem a grade, mesmo que a planilha
  tenha outros editores (por exemplo, um docente que recebeu acesso).
  Usa a proteção de abas do próprio Google: quem não está na lista
  abre e vê a planilha, mas não consegue digitar na aba.

  A lista fica na aba "Acesso" desta planilha (não no código, porque o
  repositório é público): uma linha por aba da grade, com os e-mails
  autorizados separados por vírgula, ponto e vírgula ou quebra de
  linha. Aba sem e-mail = só o dono da planilha edita.

  Todas as outras abas (Informações, DataBase, Acesso…) ficam só com o
  dono. Proteções que já existem (como a da coluna M, Horário de Fim)
  continuam valendo: numa célula com duas proteções, a pessoa precisa
  estar autorizada nas duas.

  Executar no editor, SEMPRE com a conta dona da planilha:
    prepararAbaAcesso()            cria a aba Acesso (uma vez)
    aplicarAcessoGrade()           aplica a lista agora
    ativarVerificacaoDeAcesso()    reaplica a lista a cada hora, desfazendo
                                   qualquer mudança feita na proteção
    desativarVerificacaoDeAcesso() desliga a verificação de hora em hora
=====================================================================*/

var PROTECAO = {
  ABAS_GRADE: ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'],
  ABA_ACESSO: 'Acesso',
  MARCA: '[Acesso à grade]',
  FUNCAO_VERIFICACAO: 'aplicarAcessoGrade',
  CABECALHO: ['Aba', 'E-mails autorizados', 'Última aplicação']
};

/** Cria a aba Acesso com uma linha por aba da grade. Não apaga o que já existe. */
function prepararAbaAcesso() {
  var ss = SpreadsheetApp.getActive();
  exigirDono_(ss);
  var aba = ss.getSheetByName(PROTECAO.ABA_ACESSO) || ss.insertSheet(PROTECAO.ABA_ACESSO);
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, 3).setValues([PROTECAO.CABECALHO]).setFontWeight('bold');
    aba.getRange(2, 1, PROTECAO.ABAS_GRADE.length, 1)
      .setValues(PROTECAO.ABAS_GRADE.map(function (n) { return [n]; }));
    aba.setColumnWidth(2, 420);
    aba.setColumnWidth(3, 260);
    aba.getRange('B:B').setWrap(true);
    aba.setFrozenRows(1);
    aba.getRange(PROTECAO.ABAS_GRADE.length + 3, 1)
      .setValue('Separe os e-mails por vírgula. Aba sem e-mail: só o dono da planilha edita. Depois de mudar, execute aplicarAcessoGrade.');
  }
  protegerSoDono_(aba, ss);
  return 'Aba "' + PROTECAO.ABA_ACESSO + '" pronta. Preencha os e-mails e execute aplicarAcessoGrade.';
}

/** Aplica a lista da aba Acesso às proteções. Também roda pela verificação de hora em hora. */
function aplicarAcessoGrade() {
  var ss = SpreadsheetApp.getActive();
  exigirDono_(ss);
  var config = ss.getSheetByName(PROTECAO.ABA_ACESSO);
  if (!config) throw new Error('Aba "' + PROTECAO.ABA_ACESSO + '" não encontrada. Execute prepararAbaAcesso primeiro.');

  var lista = lerListaDeAcesso_(config);
  var agora = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm');
  var resumo = [];

  PROTECAO.ABAS_GRADE.forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    var item = lista.porAba[nome] || { emails: [], invalidos: [], linha: 0 };
    var situacao;
    if (!aba) {
      situacao = 'aba não encontrada na planilha';
    } else {
      var mudou = aplicarEditores_(aba, item.emails, ss);
      situacao = agora + ' · ' + (item.emails.length ? item.emails.length + ' e-mail(s)' : 'só o dono') +
        (mudou.removidos.length ? ' · removido(s): ' + mudou.removidos.join(', ') : '');
    }
    if (item.invalidos.length) situacao += ' · ignorado(s), e-mail inválido: ' + item.invalidos.join(', ');
    if (item.linha) config.getRange(item.linha, 3).setValue(situacao);
    resumo.push(nome + ': ' + situacao);
  });

  ss.getSheets().forEach(function (aba) {
    if (PROTECAO.ABAS_GRADE.indexOf(aba.getName()) === -1) protegerSoDono_(aba, ss);
  });

  lista.desconhecidas.forEach(function (n) { resumo.push('Linha ignorada, aba desconhecida: ' + n); });
  console.log(resumo.join('\n'));
  return resumo.join('\n');
}

/** Reaplica a lista a cada hora. Desfaz, por exemplo, um editor incluído direto na proteção. */
function ativarVerificacaoDeAcesso() {
  exigirDono_(SpreadsheetApp.getActive());
  desativarVerificacaoDeAcesso();
  ScriptApp.newTrigger(PROTECAO.FUNCAO_VERIFICACAO).timeBased().everyHours(1).create();
  aplicarAcessoGrade();
  return 'Verificação de hora em hora ligada.';
}

function desativarVerificacaoDeAcesso() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === PROTECAO.FUNCAO_VERIFICACAO) ScriptApp.deleteTrigger(t);
  });
  return 'Verificação de hora em hora desligada.';
}

/* ---------- internos ---------- */

/** Lê a aba Acesso: { porAba: {nome: {emails, invalidos, linha}}, desconhecidas: [] }. */
function lerListaDeAcesso_(config) {
  var ultima = config.getLastRow();
  var porAba = {}, desconhecidas = [];
  if (ultima < 2) return { porAba: porAba, desconhecidas: desconhecidas };
  var valores = config.getRange(2, 1, ultima - 1, 2).getValues();
  valores.forEach(function (l, i) {
    var nome = String(l[0] || '').trim();
    if (!nome) return;
    if (PROTECAO.ABAS_GRADE.indexOf(nome) === -1) {
      // A linha de instrução abaixo da tabela não é uma aba.
      if (String(l[1] || '').trim()) desconhecidas.push(nome);
      return;
    }
    var separados = separarEmails_(l[1]);
    porAba[nome] = { emails: separados.validos, invalidos: separados.invalidos, linha: i + 2 };
  });
  return { porAba: porAba, desconhecidas: desconhecidas };
}

function separarEmails_(texto) {
  var validos = [], invalidos = [];
  String(texto || '').split(/[\s,;]+/).forEach(function (p) {
    var email = p.trim().toLowerCase();
    if (!email) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { invalidos.push(p.trim()); return; }
    if (validos.indexOf(email) === -1) validos.push(email);
  });
  return { validos: validos, invalidos: invalidos };
}

/** Deixa como editores da aba só os autorizados (mais o dono). */
function aplicarEditores_(aba, autorizados, ss) {
  var p = protecaoDaMarca_(aba);
  var dono = emailDoDono_(ss);
  var atuais = p.getEditors().map(function (u) { return String(u.getEmail() || '').toLowerCase(); });
  var removidos = atuais.filter(function (e) { return e && e !== dono && autorizados.indexOf(e) === -1; });
  if (removidos.length) p.removeEditors(removidos);
  var faltam = autorizados.filter(function (e) { return atuais.indexOf(e) === -1; });
  if (faltam.length) p.addEditors(faltam);
  if (p.canDomainEdit()) p.setDomainEdit(false);
  return { removidos: removidos, incluidos: faltam };
}

function protegerSoDono_(aba, ss) {
  aplicarEditores_(aba, [], ss);
}

/** A proteção de aba criada por este script (achada pela descrição). Cria se não existir. */
function protecaoDaMarca_(aba) {
  var existentes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET).filter(function (p) {
    return String(p.getDescription() || '').indexOf(PROTECAO.MARCA) === 0;
  });
  var p = existentes.length ? existentes[0] : aba.protect();
  p.setDescription(PROTECAO.MARCA + ' editores definidos na aba ' + PROTECAO.ABA_ACESSO);
  if (p.isWarningOnly()) p.setWarningOnly(false);
  return p;
}

function emailDoDono_(ss) {
  var dono = ss.getOwner();
  return dono ? String(dono.getEmail() || '').toLowerCase() : '';
}

/** Só o dono da planilha remove editores da proteção; outra conta falharia no meio do caminho. */
function exigirDono_(ss) {
  var dono = emailDoDono_(ss);
  var eu = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (dono && eu && dono !== eu) {
    throw new Error('Execute com a conta dona da planilha. Esta execução está usando outra conta.');
  }
}
