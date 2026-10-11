/*=====================================================================
  PLANILHA DAS SECRETARIAS — VALIDAÇÕES (único arquivo do projeto)

  Este é o ÚNICO código que fica na planilha "Grade Horária" que as
  secretarias preenchem (chave GRADE_HORARIA_PREENCHIMENTO). Tudo o mais
  — envio da grade, cópia de segurança, auditoria de quem editou o quê,
  grade visual — roda fora dela, no sistema Estrutura Curricular.

  É um gatilho SIMPLES (onEdit): roda sozinho a cada edição, com as
  permissões de quem está editando, sem instalar nada. Por isso só mexe
  em células que a secretaria pode editar (K = Dia da semana,
  L = Horário de Início) e lê o resto.

  O que faz, nas abas PSA, PSC, PSE, PST, Interdepartamentais e Outras
  Unidades (linha 4 em diante):
   1. Modalidade "Prática" (coluna F) → Dia = "Horário Variável" e
      Início = "-- : --" (o Horário de Fim acompanha pela fórmula).
   2. Conflito de horário: ao escolher o dia (K) ou o início (L) de uma
      disciplina ELETIVA ou LIVRE, procura nas 6 abas uma OBRIGATÓRIA do
      mesmo semestre ideal (I), no mesmo dia, com horário sobreposto. Se
      achar, apaga o dia e o início da linha editada e explica numa nota
      na célula do dia. Sem conflito, a nota antiga sai.

  Horário de Fim (M): é uma FÓRMULA gravada pelo envio da grade —
  início + créditos-aula (1 crédito = 1 hora). Não é calculado aqui; a
  coluna M deve ficar protegida. Por isso a antiga "verificação de carga
  horária" deixou de existir: o fim sempre bate com os créditos.

  Tipos usados (coluna E, como a lista suspensa e o envio gravam):
  "Obrigatória", "Eletiva", "Livre".
=====================================================================*/

var VALIDACAO = {
  ABAS: ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'],
  LINHA_INICIAL: 4,
  COL: { codigo: 3, nome: 4, tipo: 5, modalidade: 6, semestre: 9, creditos: 10, dia: 11, inicio: 12, fim: 13 },
  OBRIGATORIA: 'Obrigatória',
  OPTATIVAS: ['Eletiva', 'Livre'],
  // Uma colagem grande não é verificada linha a linha (evita estourar o tempo do gatilho).
  MAX_LINHAS: 50
};

function onEdit(e) {
  if (!e || !e.range) return;
  var aba = e.range.getSheet();
  if (VALIDACAO.ABAS.indexOf(aba.getName()) === -1) return;
  var r = e.range;
  var primeira = Math.max(r.getRow(), VALIDACAO.LINHA_INICIAL);
  var ultima = r.getRow() + r.getNumRows() - 1;
  if (ultima < primeira) return;
  var colIni = r.getColumn(), colFim = colIni + r.getNumColumns() - 1;
  var toca = function (c) { return colIni <= c && c <= colFim; };
  try {
    if (toca(VALIDACAO.COL.modalidade)) aplicarModalidade_(aba, primeira, ultima);
    if ((toca(VALIDACAO.COL.dia) || toca(VALIDACAO.COL.inicio) || toca(VALIDACAO.COL.modalidade)) && ultima - primeira < VALIDACAO.MAX_LINHAS) {
      var obrigatorias = obrigatoriasDaGrade_(aba.getParent());
      for (var linha = primeira; linha <= ultima; linha++) verificarConflito_(aba, linha, obrigatorias);
    }
  } catch (erro) {
    console.error('Validação da grade falhou: ' + (erro && erro.message));
  }
}

/** Modalidade "Prática": dia "Horário Variável" e início "-- : --". */
function aplicarModalidade_(aba, primeira, ultima) {
  var mods = aba.getRange(primeira, VALIDACAO.COL.modalidade, ultima - primeira + 1, 1).getValues();
  for (var i = 0; i < mods.length; i++) {
    if (String(mods[i][0]).trim() !== 'Prática') continue;
    aba.getRange(primeira + i, VALIDACAO.COL.dia, 1, 2).setValues([['Horário Variável', '-- : --']]);
  }
}

/** Minutos desde 00:00 de um horário (data/hora do Sheets, fração do dia ou "HH:mm"); null se não for horário. */
function minutosDe_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getHours() * 60 + v.getMinutes();
  if (typeof v === 'number' && v >= 0 && v < 1) return Math.round(v * 1440);
  var m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function horaTexto_(min) {
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

/** Obrigatórias das 6 abas com dia e início: [{aba, linha, codigo, nome, semestre, dia, ini, fim}]. */
function obrigatoriasDaGrade_(ss) {
  var C = VALIDACAO.COL, lista = [];
  VALIDACAO.ABAS.forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba || aba.getLastRow() < VALIDACAO.LINHA_INICIAL) return;
    var dados = aba.getRange(VALIDACAO.LINHA_INICIAL, C.codigo, aba.getLastRow() - VALIDACAO.LINHA_INICIAL + 1, C.inicio - C.codigo + 1).getValues();
    dados.forEach(function (l, i) {
      if (String(l[C.tipo - C.codigo]).trim() !== VALIDACAO.OBRIGATORIA) return;
      var ini = minutosDe_(l[C.inicio - C.codigo]);
      var cred = Number(l[C.creditos - C.codigo]);
      var dia = String(l[C.dia - C.codigo]).trim();
      if (ini === null || !cred || !dia) return;
      lista.push({ aba: nome, linha: VALIDACAO.LINHA_INICIAL + i, codigo: l[0], nome: l[1], semestre: String(l[C.semestre - C.codigo]).trim(), dia: dia, ini: ini, fim: ini + cred * 60 });
    });
  });
  return lista;
}

/** Confere uma linha: optativa × obrigatória do mesmo semestre ideal, mesmo dia, horário sobreposto. */
function verificarConflito_(aba, linha, obrigatorias) {
  var C = VALIDACAO.COL;
  var v = aba.getRange(linha, C.codigo, 1, C.inicio - C.codigo + 1).getValues()[0];
  var tipo = String(v[C.tipo - C.codigo]).trim();
  if (VALIDACAO.OPTATIVAS.indexOf(tipo) === -1) return;
  var semestre = String(v[C.semestre - C.codigo]).trim();
  var dia = String(v[C.dia - C.codigo]).trim();
  var ini = minutosDe_(v[C.inicio - C.codigo]);
  var cred = Number(v[C.creditos - C.codigo]);
  var celulaDia = aba.getRange(linha, C.dia);
  if (!semestre || !dia || ini === null || !cred) return;
  var fim = ini + cred * 60;
  var choque = obrigatorias.filter(function (o) {
    return !(o.aba === aba.getName() && o.linha === linha) && o.semestre === semestre && o.dia === dia && ini < o.fim && fim > o.ini;
  })[0];
  if (!choque) { celulaDia.clearNote(); return; }
  celulaDia.setNote('Conflito de horário.\n\n' + v[0] + ' (' + tipo + ', ' + semestre + 'º semestre ideal), ' + dia + ' ' + horaTexto_(ini) + '–' + horaTexto_(fim) +
    ', coincide com a obrigatória ' + choque.codigo + ' - ' + choque.nome + ' (aba ' + choque.aba + '), ' + horaTexto_(choque.ini) + '–' + horaTexto_(choque.fim) + '.\n\nEscolha outro dia ou horário.');
  aba.getRange(linha, C.dia, 1, 2).clearContent();
}
