/*=====================================================================
  PREPARAÇÃO DA GRADE HORÁRIA — ajustes, outros cursos, grade e recomeço

  Etapas do painel (1.3.0; etapa 4 e "Cadastrar nova grade" na 1.4.0):
    1. Estrutura curricular: a base importada do Júpiter. O administrador
       pode CORRIGIR uma disciplina (código, nome, créditos, cargas,
       versão, tipo/período em cada habilitação) ou EXCLUÍ-LA da lista.
    2. Disciplinas para outros cursos: disciplinas do IP ministradas para
       cursos de outras unidades (ex.: PST0391 para a FEA). Vêm do
       relatório "Lista de disciplinas por unidade" do Júpiter (CSV) ou de
       cadastro manual.
    3. Lista para a grade horária: estrutura + outros cursos; as
       escolhidas vão para a grade com "Enviar para a Grade Horária"
       (só as que têm SEMESTRE DE OFERECIMENTO definido).
    4. Prévia da grade horária: as disciplinas adicionadas à grade, por
       departamento (prefixo do código), para conferir e remover.
    "Cadastrar nova grade" apaga a planilha inteira (recomeço do zero).

  ONDE FICA CADA COISA (e por que)
  - As abas de dados do Júpiter (Disciplinas, Disciplinas por habilitação,
    Requisitos, Currículos) são REGRAVADAS a cada importação. Se as
    correções fossem feitas nelas, a importação seguinte as desfaria.
    Por isso as correções ficam na aba "Ajustes manuais", uma linha por
    disciplina corrigida, só com os campos que diferem do Júpiter
    (campo vazio = vale o do Júpiter). O painel mostra sempre
    "Júpiter + ajustes"; a ficha mostra o valor do Júpiter ao lado de
    cada campo ajustado.
  - Excluir = marcar "Sim" em "Excluída" (a linha do Júpiter continua na
    aba Disciplinas; a disciplina some da lista e da grade e pode ser
    restaurada pelo filtro "Situação › Excluídas").
  - As Observações de uma disciplina da estrutura continuam na coluna
    "Observações" da aba Disciplinas (coluna livre, preservada pelas
    importações).
  - As disciplinas para outros cursos ficam inteiras na aba "Disciplinas
    para outros cursos" (dados, exclusão, seleção e observações).
  - "Adicionada à grade horária" (coluna das duas abas; até a 1.3.2
    "Selecionada para a grade") marca o que foi enviado para a grade.

  ESCRITA
  Toda alteração roda sob a trava do script (a mesma das importações) e
  regrava cada aba afetada numa única escrita (setValues do bloco
  inteiro). A trava impede que duas alterações se sobreponham, mas NÃO
  transforma escritas em abas diferentes numa transação: se uma operação
  escreve em duas abas, uma falha entre elas pode deixar só a primeira.
  - Salvar uma disciplina da ESTRUTURA (salvarDisciplina) escreve em duas
    abas ("Ajustes manuais" e a coluna Observações da aba Disciplinas em
    uso). Desde a 1.8.5 esse salvamento é RETOMÁVEL: o pedido validado é
    registrado antes das escritas (metadado estruturaCurricular.salvamento)
    e só sai de lá depois de conferido na planilha; um salvamento
    interrompido é concluído na próxima gravação ou abertura do painel
    (ver "Salvamento retomável", mais abaixo).
  - Salvar uma disciplina para outros cursos escreve uma linha só (uma aba).
  - As ações em lote (excluir/restaurar, adicionar/remover da grade, com
    itens da estrutura e de outros cursos, inclusive com um item só)
    escrevem em até duas abas. Desde a 1.8.7 são RETOMÁVEIS do mesmo jeito:
    o pedido validado é registrado antes das escritas (Propriedades do
    script, chave estruturaCurricular.lote) e só sai de lá depois de cada
    item conferido na planilha (ver "Ações em lote retomáveis").
  As abas são pequenas (centenas de linhas).
=====================================================================*/

var SIM = 'Sim';
var ORIGEM_UNIDADE = 'Lista de disciplinas por unidade (Júpiter)';
var ORIGEM_MANUAL = 'Cadastro manual';
/** Código de disciplina da USP: 3 letras + 4 dígitos, ou 7 dígitos. */
var RE_CODIGO_DISCIPLINA = /^([A-Z]{3}\d{4}|\d{7})$/;
/** Limite de itens numa ação em lote (exclusão/seleção). */
var MAX_ITENS_LOTE = 6000;
/** Limite do texto do CSV da lista por unidade (~2 MB). */
var MAX_TEXTO_UNIDADE = 2000000;

/**
 * Campos que o painel pode ajustar numa disciplina da ESTRUTURA
 * (mesmas chaves da aba Disciplinas). tipo: codigo | texto | inteiro.
 */
var CAMPOS_AJUSTE = [
  { chave: 'codigo', tipo: 'codigo', rotulo: 'Código' },
  { chave: 'nome', tipo: 'texto', max: 300, rotulo: 'Nome' },
  { chave: 'departamento', tipo: 'texto', max: 60, rotulo: 'Departamento' },
  { chave: 'creditosAula', tipo: 'inteiro', rotulo: 'Créditos-aula' },
  { chave: 'creditosTrabalho', tipo: 'inteiro', rotulo: 'Créditos-trabalho' },
  { chave: 'ch', tipo: 'inteiro', rotulo: 'CH total' },
  { chave: 'ce', tipo: 'inteiro', rotulo: 'Estágio (CE)' },
  { chave: 'cp', tipo: 'inteiro', rotulo: 'Práticas (CP)' },
  { chave: 'ext', tipo: 'inteiro', rotulo: 'Extensão (EXT)' },
  { chave: 'atpa', tipo: 'inteiro', rotulo: 'ATPA' },
  { chave: 'versao', tipo: 'inteiro', rotulo: 'Versão' },
  // 1.3.2: semestre do ANO em que é oferecida (vazio = automático, pelo período ideal).
  { chave: 'oferecimento', tipo: 'semestre', rotulo: 'Semestre de oferecimento' }
];

/** Campos editáveis de uma disciplina para OUTROS CURSOS. */
var CAMPOS_OUTROS = [
  { chave: 'codigo', tipo: 'codigo', rotulo: 'Código' },
  { chave: 'nome', tipo: 'texto', max: 300, rotulo: 'Nome', obrigatorio: true },
  { chave: 'departamento', tipo: 'texto', max: 60, rotulo: 'Departamento' },
  { chave: 'creditosAula', tipo: 'inteiro', rotulo: 'Créditos-aula' },
  { chave: 'creditosTrabalho', tipo: 'inteiro', rotulo: 'Créditos-trabalho' },
  { chave: 'ch', tipo: 'inteiro', rotulo: 'CH total' },
  { chave: 'ativacao', tipo: 'data', rotulo: 'Ativação' },
  { chave: 'desativacao', tipo: 'data', rotulo: 'Desativação' },
  { chave: 'unidadeAtendida', tipo: 'texto', max: 120, rotulo: 'Unidade atendida' },
  { chave: 'cursoAtendido', tipo: 'texto', max: 160, rotulo: 'Curso atendido' },
  { chave: 'oferecimento', tipo: 'semestre', rotulo: 'Semestre de oferecimento' }
];

/**
 * SEMESTRE DE OFERECIMENTO ("disciplina de semestre"): em que semestre
 * do ANO a disciplina é oferecida — 1º, 2º ou os dois. Não confundir com
 * o PERÍODO IDEAL (semestre ideal do curso, 1º a 10º). Na estrutura, o
 * automático vem do período ideal (ímpar = 1º, par = 2º) e pode ser
 * ajustado (ex.: disciplina prática oferecida nos dois semestres); nas
 * disciplinas para outros cursos é informado no painel (1.3.1/1.3.2).
 * O painel usa códigos ('1', '2', 'ambos'); a planilha guarda o texto.
 */
var SEMESTRE_TEXTO = { '1': '1º semestre', '2': '2º semestre', ambos: '1º e 2º semestres' };

/** Texto da planilha (ou código) → código do painel ('1', '2', 'ambos' ou ''). */
function semestreDoTexto_(v) {
  var t = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  if (!t) return '';
  if (t === 'ambos' || (/1/.test(t) && /2/.test(t))) return 'ambos';
  if (t === '1' || /^1/.test(t) || /impar|ímpar|primeiro/.test(t)) return '1';
  if (t === '2' || /^2/.test(t) || /\bpar\b|segundo/.test(t)) return '2';
  return '';
}

/*---------------------------------------------------------------------
  Funções públicas (google.script.run) — só administradores
---------------------------------------------------------------------*/

/**
 * PÚBLICA. Salva as alterações de uma disciplina feitas na ficha.
 * @param {Object} dados {
 *   origem: 'estrutura' | 'outros',
 *   chave: identificador (estrutura: código do Júpiter; outros: "Identificador"),
 *   campos: { codigo, nome, departamento, creditosAula, … } (valores da ficha),
 *   oferta: [{ curriculo, tipo, periodo }] | null  (só estrutura; null = não mexer),
 *   ofertaPendentes: 'descartar' (1.8.9, opcional: descarta os vínculos a revisar),
 *   restaurarOferta: true (1.8.10, opcional, com oferta = a do Júpiter): "Voltar aos
 *     dados do Júpiter" — remove o ajuste de oferta mesmo quando a oferta efetiva
 *     já coincide com a do Júpiter (associada ao sucessor); com vínculos a revisar,
 *     exige também ofertaPendentes: 'descartar',
 *   observacoes: texto (até 2000 caracteres),
 *   adicionarAGrade: true  (1.4.3, opcional) — "Adicionar à Grade Horária"
 *     na ficha com alterações por salvar: salva E marca "Adicionada à
 *     grade horária" na MESMA chamada e na mesma escrita da aba (antes
 *     eram duas chamadas: salvarDisciplina e adicionarAGrade)
 * }
 * Estrutura: guarda em "Ajustes manuais" só o que difere do Júpiter
 * (voltar ao valor do Júpiter apaga o ajuste). Outros cursos: regrava a
 * linha. Código novo não pode repetir o de outra disciplina da lista.
 * Com adicionarAGrade, valem as regras de adicionarAGrade (semestre de
 * oferecimento em vigor DEPOIS das alterações; excluída não entra): sem
 * semestre, as alterações são salvas e a disciplina NÃO é adicionada
 * (grade.semOferecimento = true).
 * (1.8.5) ESTRUTURA: ajustes, oferta, marca de grade e observação formam
 * UM salvamento retomável (ver "Salvamento retomável"). Resultados:
 *  - ok: true, resultado 'concluido': tudo gravado e conferido;
 *  - ok: false, codigo NAO_SALVO: nada foi gravado (estado anterior);
 *  - ok: false, codigo SALVAMENTO_PENDENTE: o pedido ficou registrado e
 *    parte pode estar gravada; dados.salvamento diz o que já está na
 *    planilha; o sistema conclui na próxima gravação ou abertura do painel
 *    (ou pelo botão "Concluir salvamento pendente").
 *  - (1.8.6) ok: false, codigo SALVAMENTO_INCERTO: a exceção veio DEPOIS
 *    de o registro ser removido e a conferência não confirmou o alvo (ou
 *    não conseguiu ler); dados.salvamento identifica o pedido. Se a
 *    conferência confirma o alvo, a resposta é 'concluido' normal.
 *  Erros de validação (DADOS_INVALIDOS, CODIGO_REPETIDO…) vêm antes de
 *  qualquer escrita: nada muda.
 * OUTROS CURSOS: uma linha, uma escrita (como antes).
 * (1.8.6) observacao: a lida da planilha sempre que o pedido enviou
 * observacoes (mudando ou não); null só quando não enviou.
 * @return {{ok, dados: {resultado, preparacao, observacao: {chave, texto}|null,
 *           grade?: {adicionada, jaEstava, excluida, semOferecimento}}}}
 */
function salvarDisciplina(dados) {
  return executarPreparacao_('salvarDisciplina', function (ss, usuario) {
    dados = dados && typeof dados === 'object' ? dados : {};
    var origem = dados.origem === 'outros' ? 'outros' : dados.origem === 'estrutura' ? 'estrutura' : null;
    if (!origem) throw erroAmigavel_('DADOS_INVALIDOS', 'Origem da disciplina inválida.');
    var chave = limparTexto_(dados.chave, 20) || '';
    var campos = dados.campos && typeof dados.campos === 'object' ? dados.campos : {};
    var ctx = contextoPreparacao_(ss);
    var observacao = null;
    var grade = null;
    if (origem === 'estrutura') {
      var base = ctx.base[chave];
      if (!base) throw erroAmigavel_('DISCIPLINA_NAO_ENCONTRADA', 'A disciplina ' + chave + ' não está na estrutura importada. Recarregue o painel.');
      var aj = ctx.ajustes[chave] || { chave: chave };
      var novo = validarCampos_(CAMPOS_AJUSTE, campos);
      CAMPOS_AJUSTE.forEach(function (c) {
        if (!Object.prototype.hasOwnProperty.call(novo, c.chave) || c.chave === 'oferecimento') return;
        var v = novo[c.chave];
        var jup = base[c.chave] === undefined ? null : base[c.chave];
        if (c.chave === 'codigo' && !v) v = null;
        if (c.chave === 'nome' && !v) v = null;
        aj[c.chave] = iguais_(v, jup) || v === null ? null : v;
      });
      if (dados.oferta !== null && dados.oferta !== undefined) {
        var oferta = validarOferta_(dados.oferta, ctx);
        var ofJup = ctx.ofertaJupiter[chave] || [];
        // (1.8.9) A ficha manda a oferta visível (a EFETIVA) mesmo quando só outro campo mudou.
        // Igual à efetiva e com vínculos associados ao sucessor ou a revisar: a lista guardada
        // fica como está (nada é descartado nem convertido). Diferente da efetiva com vínculos
        // a revisar: só com descarte explícito (ofertaPendentes: 'descartar'); senão, recusa.
        var atual = ofertaEfetiva_(ctx, chave, aj);
        var mesmaEfetiva = JSON.stringify(ordenarOferta_(oferta)) === JSON.stringify(ordenarOferta_(atual.vinculos));
        var descartar = dados.ofertaPendentes === 'descartar';
        // (1.8.10) Restauração EXPLÍCITA ("Voltar aos dados do Júpiter" na ficha): é uma intenção,
        // não uma coincidência de valores. A oferta enviada precisa ser a do Júpiter da base ativa
        // (senão a ficha está desatualizada: recusa, nada salvo); o ajuste de oferta é removido
        // mesmo que a oferta efetiva já seja igual à do Júpiter. Vínculos a revisar continuam
        // exigindo o descarte explícito.
        var restaurar = dados.restaurarOferta === true;
        var igualJupiter = JSON.stringify(ordenarOferta_(oferta)) === JSON.stringify(ordenarOferta_(ofJup));
        if (restaurar && !igualJupiter) {
          throw erroAmigavel_('DADOS_INVALIDOS', 'A oferta do Júpiter de ' + chave + ' mudou desde que a ficha foi aberta. Recarregue o painel e use "Voltar aos dados do Júpiter" de novo. Nada foi salvo.');
        }
        if (atual.pendentes.length && !descartar && (restaurar || !mesmaEfetiva)) {
          throw erroAmigavel_('OFERTA_A_REVISAR', 'A oferta de ' + chave + ' tem ' + (atual.pendentes.length === 1 ? 'um vínculo' : atual.pendentes.length + ' vínculos') + ' a revisar (currículo substituído sem correspondência segura). Para ' + (restaurar ? 'voltar à oferta do Júpiter' : 'gravar outra oferta') + ', marque "Descartar os vínculos a revisar" na ficha; ou deixe a oferta como está. Nada foi salvo.');
        }
        if (restaurar) aj.oferta = null;
        else if (!(mesmaEfetiva && !descartar && atual.ajustada && (atual.pendentes.length || atual.associados))) {
          aj.oferta = JSON.stringify(ordenarOferta_(oferta)) === JSON.stringify(ordenarOferta_(ofJup)) ? null : JSON.stringify(ordenarOferta_(oferta));
        }
      }
      // Semestre de oferecimento (1.4.0): a ficha mostra o valor em vigor
      // (pré-preenchido pelo período ideal). Igual ao do período = sem
      // ajuste; diferente = ajuste. Recalculado depois de mudar a oferta.
      if (Object.prototype.hasOwnProperty.call(novo, 'oferecimento')) aj.oferecimento = novo.oferecimento;
      var calc = oferecimentoCalculado_(ctx, chave, aj);
      var escolhido = semestreDoTexto_(aj.oferecimento);
      aj.oferecimento = !escolhido || escolhido === calc ? null : SEMESTRE_TEXTO[escolhido];
      var codigoEfetivo = aj.codigo || chave;
      exigirCodigoLivre_(ctx, codigoEfetivo, { origem: 'estrutura', chave: chave });
      aj.alteradoEm = new Date();
      aj.alteradoPor = usuario.email;
      if (!ctx.ajustes[chave]) ctx.ordemAjustes.push(chave);
      ctx.ajustes[chave] = aj;
      if (dados.adicionarAGrade === true) grade = marcarNaGradeAoSalvar_(ctx, { origem: 'estrutura', chave: chave }, aj);
      // (1.8.5) Observação validada ANTES de qualquer escrita; ausente = não mexe.
      var obsAlvo = null;
      if (dados.observacoes !== undefined) {
        var obs = limparTextoLongo_(dados.observacoes, 2000) || '';
        if (obs !== textoDaCelula_(base.observacoes || '')) obsAlvo = obs;
      }
      var m = lerManifesto_(ss);
      return salvarEstruturaRetomavel_(ss, {
        formato: 1, id: Utilities.getUuid(), em: new Date().toISOString(), por: usuario.email,
        chave: chave, rotulo: codigoEfetivo,
        abaDisciplinas: m ? m.abas[ABAS.DISCIPLINAS] : null, importacao: m ? (m.importacao || null) : null,
        ajuste: ajusteParaJson_(aj), observacao: obsAlvo
      }, grade, dados.observacoes !== undefined);
    } else {
      var linha = ctx.outros[chave];
      if (!linha) throw erroAmigavel_('DISCIPLINA_NAO_ENCONTRADA', 'Disciplina não encontrada na lista de outros cursos. Recarregue o painel.');
      var val = validarCampos_(CAMPOS_OUTROS, campos);
      CAMPOS_OUTROS.forEach(function (c) { if (Object.prototype.hasOwnProperty.call(val, c.chave)) linha[c.chave] = val[c.chave]; });
      if (!linha.codigo) throw erroAmigavel_('DADOS_INVALIDOS', 'Informe o código da disciplina.');
      if (!linha.nome) throw erroAmigavel_('DADOS_INVALIDOS', 'Informe o nome da disciplina.');
      exigirCodigoLivre_(ctx, linha.codigo, { origem: 'outros', chave: chave });
      if (dados.observacoes !== undefined) linha.observacoes = limparTextoLongo_(dados.observacoes, 2000) || null;
      linha.alteradoEm = new Date();
      linha.alteradoPor = usuario.email;
      if (dados.adicionarAGrade === true) grade = marcarNaGradeAoSalvar_(ctx, { origem: 'outros', chave: chave }, linha);
      gravarOutros_(ss, ctx);
      SpreadsheetApp.flush();
    }
    var r = { resultado: 'concluido', preparacao: preparacaoParaCliente_(ss, true), observacao: observacao };
    if (grade) r.grade = grade;
    return r;
  }, { flushProprio: true });
}

/*---------------------------------------------------------------------
  (1.8.5) Salvamento retomável de uma disciplina da ESTRUTURA
  -------------------------------------------------------------------
  Unidade de trabalho: o pedido de salvarDisciplina já validado, para UMA
  disciplina (chave = código no Júpiter), com o estado-alvo:
    ajuste      a linha inteira de "Ajustes manuais" depois do pedido
                (campos, oferta, semestre, marca de grade; vazia = sem linha)
    observacao  o texto da coluna Observações da aba Disciplinas em uso
                (null = o pedido não muda a observação)
  Registro: metadado estruturaCurricular.salvamento da planilha (o mesmo
  mecanismo do diário da importação e do recomeço), gravado ANTES das
  escritas, com a aba Disciplinas em uso (ID interno) e a importação ativa.
  Concluído = as duas abas conferidas na planilha iguais ao alvo E o
  registro removido. Enquanto o registro existe, o salvamento está
  PENDENTE: a próxima gravação da preparação, a importação ou a abertura
  do painel por um administrador o concluem (aplicam só o que falta, para
  esta disciplina, e conferem) antes de qualquer outra mudança; se não
  conseguem, a outra mudança é recusada (SALVAMENTO_PENDENTE) e o registro
  continua. Reaplicar é seguro: escreve o mesmo alvo da mesma disciplina,
  sem restaurar cópias antigas de abas inteiras. Se a base mudou (outra aba
  Disciplinas em uso ou outra importação), o alvo NÃO é aplicado; o
  administrador confere a disciplina e descarta o registro.
---------------------------------------------------------------------*/
var META_SALVAMENTO = 'estruturaCurricular.salvamento';
/** Campos da linha de ajuste comparados na conferência. */
var CAMPOS_CONFERENCIA_AJUSTE = CAMPOS_AJUSTE.map(function (c) { return c.chave; }).concat(['oferta', 'excluida', 'naGrade']);

/**
 * Linha de ajuste → objeto serializável (datas em ISO). (1.8.6) Sem as
 * colunas extras (_extras): elas não vêm do formulário e, ao aplicar, são
 * sempre as da linha ATUAL da planilha (aplicarSalvamento_), com o tipo
 * original (data continua data). Registros da 1.8.5 que ainda trazem
 * _extras (datas já viradas texto pelo JSON) são lidos normalmente: o
 * _extras deles é ignorado.
 */
function ajusteParaJson_(aj) {
  var o = {};
  Object.keys(aj).forEach(function (k) {
    if (k === '_extras') return;
    var v = aj[k]; o[k] = Object.prototype.toString.call(v) === '[object Date]' ? { data: v.toISOString() } : v;
  });
  return o;
}
function ajusteDoJson_(o) {
  var aj = {};
  Object.keys(o || {}).forEach(function (k) {
    if (k === '_extras') return;
    var v = o[k]; aj[k] = v && typeof v === 'object' && v.data && !Array.isArray(v) ? new Date(v.data) : v;
  });
  return aj;
}
/** Salvamento pendente registrado na planilha (ou null). */
function lerSalvamentoPendente_(ss) {
  var v = lerMetadado_(ss, META_SALVAMENTO);
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { throw erroAmigavel_('BASE_INCONSISTENTE', 'O registro de um salvamento pendente está ilegível. Nada foi alterado. Avise quem mantém o sistema.'); }
}
/** O registro ainda corresponde à base em uso (mesma aba Disciplinas e importação, disciplina presente)? */
function salvamentoNaMesmaBase_(ss, j) {
  var m = lerManifesto_(ss);
  if (!m || m.abas[ABAS.DISCIPLINAS] !== j.abaDisciplinas || (m.importacao || null) !== (j.importacao || null)) return false;
  return !!contextoPreparacao_(ss).base[j.chave];
}
function valorConferido_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return String(v.getTime());
  return textoDaCelula_(String(v));
}
/**
 * Lê a planilha e diz o que do alvo já está gravado:
 * { ajuste: bool, observacao: bool, textoObservacao } (observacao = true
 * quando o pedido não muda a observação).
 */
function conferirSalvamento_(ss, j) {
  var ctx = contextoPreparacao_(ss);
  var lido = ctx.ajustes[j.chave];
  var alvo = ajusteDoJson_(j.ajuste);
  var okAjuste;
  if (ajusteVazio_(alvo)) okAjuste = !lido || ajusteVazio_(lido);
  else okAjuste = !!lido && CAMPOS_CONFERENCIA_AJUSTE.every(function (k) { return valorConferido_(lido[k]) === valorConferido_(alvo[k]); });
  var base = ctx.base[j.chave];
  var texto = base ? textoDaCelula_(base.observacoes || '') : null;
  var okObs = j.observacao === null || j.observacao === undefined ? true : (base ? texto === j.observacao : false);
  return { ajuste: okAjuste, observacao: okObs, textoObservacao: texto };
}
/**
 * Aplica o que falta do registro (só esta disciplina), confere e remove o
 * registro. Lança erro se algo falhar (o registro continua). Idempotente.
 */
function aplicarSalvamento_(ss, j) {
  if (!salvamentoNaMesmaBase_(ss, j)) throw erroAmigavel_('SALVAMENTO_BASE_MUDOU', 'A base mudou depois do salvamento pendente.');
  var antes = conferirSalvamento_(ss, j);
  if (!antes.ajuste) {
    var ctx = contextoPreparacao_(ss);
    var atual = ctx.ajustes[j.chave];
    var alvo = ajusteDoJson_(j.ajuste);
    // (1.8.6) Colunas extras: as da linha atual, como estão (tipo e valor).
    if (atual && atual._extras) alvo._extras = atual._extras;
    if (!atual) ctx.ordemAjustes.push(j.chave);
    ctx.ajustes[j.chave] = alvo;
    gravarAjustes_(ss, ctx);
  }
  if (!antes.observacao) gravarObservacaoEstrutura_(ss, j.chave, j.observacao);
  SpreadsheetApp.flush();
  var depois = conferirSalvamento_(ss, j);
  if (!depois.ajuste || !depois.observacao) throw new Error('conferência do salvamento de ' + j.chave + ' não bateu');
  removerMetadado_(ss, META_SALVAMENTO);
  SpreadsheetApp.flush();
  return depois;
}
/** Conferência que não lança erro (null = não foi possível ler a planilha). */
function conferirSemErro_(ss, j) { try { return conferirSalvamento_(ss, j); } catch (e) { return null; } }
/**
 * Tenta concluir o salvamento pendente, se houver. Nunca lança erro por
 * falha de escrita: devolve { estado: 'nenhum' | 'concluido' | 'pendente'
 * | 'base_mudou' | 'desconhecido', salvamento, conferencia }.
 */
function resolverSalvamentoPendente_(ss) {
  var j;
  try { j = lerSalvamentoPendente_(ss); }
  catch (e) { console.error('salvamento pendente: leitura falhou: ' + (e && e.message)); return { estado: 'desconhecido', salvamento: null, conferencia: null }; }
  if (!j) return { estado: 'nenhum' };
  try {
    return { estado: 'concluido', salvamento: j, conferencia: aplicarSalvamento_(ss, j) };
  } catch (e) {
    if (e && e.codigo === 'SALVAMENTO_BASE_MUDOU') return { estado: 'base_mudou', salvamento: j, conferencia: null };
    console.error('salvamento pendente de ' + j.chave + ': ' + (e && e.message));
    return situacaoDepoisDaFalha_(ss, j);
  }
}
/**
 * (1.8.6) Depois de uma exceção ao aplicar o registro j: a planilha decide.
 * Registro ainda lá → 'pendente' (nada é reescrito agora); leitura do
 * registro falhou → 'desconhecido'; registro JÁ REMOVIDO (a remoção foi
 * feita e a exceção veio depois, ou no flush seguinte) → reconcilia com o
 * alvo de j (reconciliarSemRegistro_). Sempre com a identificação de j.
 */
function situacaoDepoisDaFalha_(ss, j) {
  var lido;
  try { lido = lerSalvamentoPendente_(ss); } catch (e) { lido = undefined; }
  if (lido === null) return reconciliarSemRegistro_(ss, j);
  return { estado: lido === undefined ? 'desconhecido' : 'pendente', salvamento: j, conferencia: conferirSemErro_(ss, j) };
}
/**
 * (1.8.6) O registro de j não está mais na planilha: o alvo de j está
 * gravado? Conferido → 'concluido' (com o que foi lido). Não conferido ou
 * leitura falhou → 'incerto': não se declara sucesso nem ausência de
 * efeito, não se recria o registro e nada é reaplicado.
 */
function reconciliarSemRegistro_(ss, j) {
  var c = conferirSemErro_(ss, j);
  return { estado: c && c.ajuste && c.observacao ? 'concluido' : 'incerto', salvamento: j, conferencia: c };
}
/** Resumo do salvamento pendente para o painel (sem dados internos). */
function resumoSalvamento_(r) {
  var j = r.salvamento || {};
  var c = r.conferencia;
  return {
    estado: r.estado, id: j.id || null, chave: j.chave || null, codigo: j.rotulo || j.chave || null,
    em: j.em ? formatarDataHora_(new Date(j.em)) : '',
    ajusteGravado: c ? c.ajuste : null, observacaoGravada: c ? c.observacao : null,
    podeDescartar: r.estado === 'base_mudou'
  };
}
/** (1.8.6) Recusa por salvamento: 'incerto' (registro já removido, alvo não confirmado) tem código próprio. */
function codigoSalvamento_(r) { return r.estado === 'incerto' ? 'SALVAMENTO_INCERTO' : 'SALVAMENTO_PENDENTE'; }
/** Frase para a pessoa: o que já está gravado e o que fazer. */
function mensagemSalvamento_(r) {
  var s = resumoSalvamento_(r);
  var nome = s.codigo ? 'de ' + s.codigo : '';
  if (r.estado === 'base_mudou') return 'O salvamento ' + nome + ' não pôde ser concluído porque a base da estrutura mudou depois dele. Confira a disciplina e use "Descartar salvamento pendente". Nada mais pode ser gravado até lá.';
  var parte = s.ajusteGravado === null ? 'não foi possível conferir o que já está gravado'
    : s.ajusteGravado && s.observacaoGravada ? 'as alterações já estão gravadas, falta só confirmar o salvamento'
    : s.ajusteGravado ? 'os dados da ficha já estão gravados; a observação ainda não'
    : s.observacaoGravada ? 'a observação já está gravada; os dados da ficha ainda não'
    : 'nada do pedido está gravado ainda';
  if (r.estado === 'incerto') {
    var conf = s.ajusteGravado === null ? 'não foi possível ler a planilha para conferir o que foi gravado'
      : 'a conferência mostra que ' + (s.ajusteGravado ? 'a observação não está gravada' : s.observacaoGravada ? 'os dados da ficha não estão gravados' : 'o pedido não está gravado') + ' como foi enviado';
    return 'Não foi possível confirmar o salvamento ' + nome + ': o registro do salvamento já foi encerrado na planilha, mas ' + conf + '. Recarregue o painel e confira a disciplina; se faltar algo, salve de novo (o que você digitou continua na ficha).';
  }
  return 'O salvamento ' + nome + ' não terminou: ' + parte + '. O painel vai concluí-lo na próxima gravação ou quando for aberto de novo; você também pode clicar em "Concluir salvamento pendente". Até lá, outras gravações ficam bloqueadas.';
}
/** Erro SALVAMENTO_PENDENTE com o que o painel precisa (lido da planilha). */
function erroSalvamentoPendente_(ss, r) {
  var codigo = codigoSalvamento_(r);
  var e = erroAmigavel_(codigo, mensagemSalvamento_(r));
  var resumo = resumoSalvamento_(r);
  if (codigo === 'SALVAMENTO_INCERTO') resumo.mensagem = e.message;   // aviso fixo sem botão (não há registro a concluir)
  e.dados = dadosLidosParaPainel_(ss, r.salvamento, { resultado: codigo === 'SALVAMENTO_INCERTO' ? 'incerto' : 'pendente', salvamento: resumo });
  return e;
}
/**
 * Acrescenta a preparação e a observação LIDAS da planilha (se a leitura
 * funcionar). A observação vem quando o pedido a muda ou (1.8.6, lerObs)
 * quando o pedido a enviou, mesmo sem mudança: o painel fica com o valor
 * confirmado mesmo que o seu estivesse desatualizado.
 */
function dadosLidosParaPainel_(ss, j, dados, lerObs) {
  try {
    dados.preparacao = preparacaoParaCliente_(ss, true);
    if (j && (lerObs || (j.observacao !== null && j.observacao !== undefined))) {
      var base = contextoPreparacao_(ss).base[j.chave];
      if (base) dados.observacao = { chave: j.chave, texto: textoDaCelula_(base.observacoes || '') };
    }
  } catch (e) { dados.preparacao = null; dados.leituraFalhou = true; }
  return dados;
}
/**
 * Garante que não há salvamento pendente antes de outra mudança: conclui
 * o que houver; se não der, recusa a mudança (SALVAMENTO_PENDENTE).
 * Chamada já com a trava do script.
 */
function exigirSemSalvamentoPendente_(ss) {
  var r = resolverSalvamentoPendente_(ss);
  if (r.estado === 'nenhum' || r.estado === 'concluido') return r;
  throw erroSalvamentoPendente_(ss, r);
}
/** Registra o pedido, grava, confere e responde (ver o bloco acima). obsEnviada: o pedido trouxe observacoes (1.8.6). */
function salvarEstruturaRetomavel_(ss, j, grade, obsEnviada) {
  try {
    gravarMetadado_(ss, META_SALVAMENTO, JSON.stringify(j));
  } catch (e) {
    // O registro pode ter sido gravado apesar do erro: a planilha decide.
    var lido;
    try { lido = lerSalvamentoPendente_(ss); } catch (e2) { lido = undefined; }
    if (lido === null) {
      console.error('salvarDisciplina: registro não gravado (' + (e && e.message) + ')');
      var nada = erroAmigavel_('NAO_SALVO', 'Nada foi salvo em ' + j.rotulo + ': a planilha não aceitou a gravação. As alterações continuam na ficha; tente de novo em alguns instantes.');
      nada.dados = dadosLidosParaPainel_(ss, null, { resultado: 'nao_concluido' });
      throw nada;
    }
    if (lido === undefined) throw erroSalvamentoPendente_(ss, { estado: 'desconhecido', salvamento: j, conferencia: null });
  }
  try {
    aplicarSalvamento_(ss, j);
  } catch (e) {
    console.error('salvarDisciplina ' + j.chave + ': ' + (e && e.message) + ' — nova tentativa');
    var r = resolverSalvamentoPendente_(ss);   // relê o registro da planilha e tenta de novo
    // (1.8.6) Registro já removido (exceção depois da remoção): reconcilia
    // com ESTE pedido em vez de responder um "pendente" inexistente.
    if (r.estado === 'nenhum') r = reconciliarSemRegistro_(ss, j);
    else if (!r.salvamento) r = { estado: r.estado, salvamento: j, conferencia: conferirSemErro_(ss, j) };
    if (r.estado !== 'concluido') throw erroSalvamentoPendente_(ss, r);
  }
  var resposta = dadosLidosParaPainel_(ss, j, { resultado: 'concluido' }, obsEnviada);
  if (!obsEnviada && (j.observacao === null || j.observacao === undefined)) resposta.observacao = null;
  if (grade) resposta.grade = grade;
  return resposta;
}

/**
 * PÚBLICA (1.8.5). "Concluir salvamento pendente" (acao: 'concluir') ou,
 * quando a base mudou e ele não pode mais ser aplicado, "Descartar"
 * (acao: 'descartar', id do registro). Só administradores.
 * @return {{ok, dados: {resultado: 'nenhum'|'concluido'|'descartado', codigo, preparacao, observacao}}}
 */
function resolverSalvamentoPendente(pedido) {
  return executarPreparacao_('resolverSalvamentoPendente', function (ss) {
    pedido = pedido && typeof pedido === 'object' ? pedido : {};
    var j = lerSalvamentoPendente_(ss);
    if (!j) return { resultado: 'nenhum', preparacao: preparacaoParaCliente_(ss, true) };
    if (pedido.acao === 'descartar') {
      if (String(pedido.id || '') !== j.id) throw erroAmigavel_('DADOS_INVALIDOS', 'O salvamento pendente mudou. Recarregue o painel.');
      if (salvamentoNaMesmaBase_(ss, j)) throw erroAmigavel_('DADOS_INVALIDOS', 'Este salvamento ainda pode ser concluído: use "Concluir salvamento pendente".');
      removerMetadado_(ss, META_SALVAMENTO);
      SpreadsheetApp.flush();
      return { resultado: 'descartado', codigo: j.rotulo || j.chave, preparacao: preparacaoParaCliente_(ss, true) };
    }
    var r = resolverSalvamentoPendente_(ss);
    if (r.estado === 'nenhum') return { resultado: 'nenhum', preparacao: preparacaoParaCliente_(ss, true) };
    if (r.estado !== 'concluido') throw erroSalvamentoPendente_(ss, r);
    return dadosLidosParaPainel_(ss, j, { resultado: 'concluido', codigo: j.rotulo || j.chave, chave: j.chave });
  }, { semPendencia: true });
}

/**
 * Marca "Adicionada à grade horária" na linha que salvarDisciplina vai
 * gravar (1.4.3), com as mesmas regras de adicionarAGrade: excluída não
 * entra; sem semestre de oferecimento em vigor (já com as alterações), não
 * entra. Só muda o objeto em memória — a escrita é a do próprio salvar.
 */
function marcarNaGradeAoSalvar_(ctx, it, alvo) {
  if (alvo.excluida === SIM) return { adicionada: false, jaEstava: false, excluida: true, semOferecimento: false };
  if (!oferecimentoEfetivo_(ctx, it)) return { adicionada: false, jaEstava: false, excluida: false, semOferecimento: true };
  if (alvo.naGrade === SIM) return { adicionada: false, jaEstava: true, excluida: false, semOferecimento: false };
  alvo.naGrade = SIM;
  return { adicionada: true, jaEstava: false, excluida: false, semOferecimento: false };
}

/**
 * PÚBLICA. Exclui (excluir = true) ou restaura (false) disciplinas.
 * @param {Array} itens [{ origem: 'estrutura'|'outros', chave }]
 * Exclusão é uma marca ("Sim" na coluna Excluída), nunca apaga dados; a
 * disciplina excluída também sai da grade horária. Restaurar não devolve
 * à grade. (1.8.7) Ação em lote retomável (ver "Ações em lote retomáveis").
 * @return {{ok, dados: {resultado: 'concluido', alteradas, preparacao}}}
 */
function excluirDisciplinas(itens, excluir) {
  return executarPreparacao_('excluirDisciplinas', function (ss, usuario) {
    return executarAcaoLote_(ss, usuario, excluir === false ? 'restaurar' : 'excluir', itens);
  }, { flushProprio: true });
}

/**
 * PÚBLICA (1.4.0). "Enviar para a Grade Horária": marca "Adicionada à
 * grade horária" nas disciplinas escolhidas. Só entra na grade a
 * disciplina com SEMESTRE DE OFERECIMENTO definido (estrutura: o ajustado
 * ou o do período ideal; outros cursos: o informado na ficha) — as que
 * não têm voltam em "semOferecimento" e NÃO são adicionadas. Excluídas
 * são ignoradas. (1.8.7) Ação em lote retomável.
 * @param {Array} itens [{ origem, chave }]
 * @return {{ok, dados: {resultado: 'concluido', adicionadas, jaEstavam, ignoradas, semOferecimento: [{origem, chave, codigo}], preparacao}}}
 */
function adicionarAGrade(itens) {
  return executarPreparacao_('adicionarAGrade', function (ss, usuario) {
    return executarAcaoLote_(ss, usuario, 'adicionar', itens);
  }, { flushProprio: true });
}

/**
 * PÚBLICA (1.4.0). "Remover da grade" (Prévia da grade horária e ficha):
 * tira a marca "Adicionada à grade horária". A disciplina continua na
 * lista (etapa 3) e pode ser enviada de novo. (1.8.7) Ação em lote retomável.
 * @param {Array} itens [{ origem, chave }]
 * @return {{ok, dados: {resultado: 'concluido', removidas, preparacao}}}
 */
function removerDaGrade(itens) {
  return executarPreparacao_('removerDaGrade', function (ss, usuario) {
    return executarAcaoLote_(ss, usuario, 'remover', itens);
  }, { flushProprio: true });
}

/*---------------------------------------------------------------------
  (1.8.7) Ações em lote retomáveis
  -------------------------------------------------------------------
  Unidade de trabalho: um pedido de excluir, restaurar, adicionar à grade
  ou remover da grade, JÁ VALIDADO (itens, origens, alvos existentes,
  regras da ação), com a lista dos itens que ele muda — por origem e chave
  interna (código no Júpiter / identificador de outros cursos), nunca pelo
  código efetivo ou pela linha — e o valor-alvo das marcas da ação:
    excluir    Excluída = Sim e Adicionada à grade = vazio
    restaurar  Excluída = vazio (não devolve à grade)
    adicionar  Adicionada à grade = Sim (só os elegíveis: as excluídas, as
               sem semestre de oferecimento e as que já estavam ficam fora)
    remover    Adicionada à grade = vazio (só as que estavam na grade)
  Registro: Propriedades do script — cabeçalho em estruturaCurricular.lote
  (id, ação, data, quem, base: planilha + aba Disciplinas em uso +
  importação ativa, contagens) e a lista de itens em partes de até 8.000
  caracteres (estruturaCurricular.lote.<id>.<n>), gravadas ANTES do
  cabeçalho. Os metadados da planilha (30.000 caracteres no total) não
  comportam o limite de 6.000 itens; as Propriedades comportam (9 KB por
  valor, 500 KB no total). O cabeçalho é o que vale: sem ele, partes
  soltas são ignoradas e limpas.
  Aplicar: lê as duas abas AGORA, muda só as marcas da ação (e "alterado
  em/por" em excluir/restaurar) dos itens que ainda não estão no alvo e
  regrava só a aba que precisa (a partir da leitura atual: outros campos,
  outras linhas, colunas extras e seus tipos ficam como estão); depois
  confere item por item e remove o cabeçalho. Reaplicar é seguro: o que
  já está no alvo não é reescrito.
  Pendente = cabeçalho presente. A próxima gravação da preparação, a
  importação e a abertura do painel por um administrador o concluem antes
  de qualquer outra mudança; se não conseguem, recusam (LOTE_PENDENTE) e o
  registro continua — assim uma ação posterior nunca é desfeita pelo
  pedido antigo. Base mudou (outra planilha, aba Disciplinas, importação
  ou item que não existe mais): não aplica; "Descartar" encerra a
  pendência SEM desfazer o que já foi gravado.
  Exceção depois de remover o cabeçalho: confere este pedido na planilha
  (concluído ou LOTE_INCERTO); nunca recria o registro.
---------------------------------------------------------------------*/
var PROP_LOTE = 'estruturaCurricular.lote';
var TAMANHO_PARTE_LOTE = 8000;
var NOMES_ACAO_LOTE = { excluir: 'Excluir', restaurar: 'Restaurar', adicionar: 'Adicionar à grade horária', remover: 'Remover da grade horária' };
var ORIGENS_LOTE = ['estrutura', 'outros'];

/** Valores-alvo das marcas de cada ação. */
function alvoDaAcaoLote_(acao) {
  if (acao === 'excluir') return { excluida: SIM, naGrade: null };
  if (acao === 'restaurar') return { excluida: null };
  if (acao === 'adicionar') return { naGrade: SIM };
  return { naGrade: null };
}
function marca_(v) { return String(v === null || v === undefined ? '' : textoDaCelula_(String(v))).trim() === SIM ? SIM : ''; }
/** A linha (ou a falta dela: linha de ajuste vazia) já está no alvo? */
function itemNoAlvo_(linha, alvo) {
  return Object.keys(alvo).every(function (k) { return marca_(linha ? linha[k] : null) === marca_(alvo[k]); });
}

/**
 * Valida o pedido inteiro e decide o que muda, SEM escrever: itens
 * inválidos, repetidos ou inexistentes recusam o pedido antes de qualquer
 * escrita. Regras funcionais (excluída, sem semestre, já na grade) não
 * recusam: entram nas contagens.
 */
function planejarLote_(ctx, acao, lista) {
  var plano = { mudam: [], resumo: {}, semOferecimento: [] };
  var linhas = lista.map(function (it) {
    if (it.origem === 'estrutura') {
      if (!ctx.base[it.chave]) throw erroAmigavel_('DISCIPLINA_NAO_ENCONTRADA', 'A disciplina ' + it.chave + ' não está na estrutura importada. Recarregue o painel.');
      return { it: it, linha: ctx.ajustes[it.chave] || null };
    }
    if (!ctx.outros[it.chave]) throw erroAmigavel_('DISCIPLINA_NAO_ENCONTRADA', 'Disciplina ' + it.chave + ' não encontrada na lista de outros cursos. Recarregue o painel.');
    return { it: it, linha: ctx.outros[it.chave] };
  });
  if (acao === 'excluir' || acao === 'restaurar') {
    linhas.forEach(function (x) { plano.mudam.push(x.it); });
    plano.resumo.alteradas = linhas.length;
  } else if (acao === 'adicionar') {
    var r = { adicionadas: 0, jaEstavam: 0, ignoradas: 0, semOferecimento: 0 };
    linhas.forEach(function (x) {
      if (marca_(x.linha && x.linha.excluida) === SIM) { r.ignoradas++; return; }
      if (!oferecimentoEfetivo_(ctx, x.it)) {
        r.semOferecimento++;
        plano.semOferecimento.push({ origem: x.it.origem, chave: x.it.chave, codigo: codigoEfetivoDoItem_(ctx, x.it) });
        return;
      }
      if (marca_(x.linha && x.linha.naGrade) === SIM) { r.jaEstavam++; return; }
      r.adicionadas++;
      plano.mudam.push(x.it);
    });
    plano.resumo = r;
  } else {
    linhas.forEach(function (x) { if (marca_(x.linha && x.linha.naGrade) === SIM) plano.mudam.push(x.it); });
    plano.resumo.removidas = plano.mudam.length;
  }
  return plano;
}

/** As quatro ações: valida, registra, aplica, confere, responde. */
function executarAcaoLote_(ss, usuario, acao, itens) {
  var lista = validarItens_(itens);
  var ctx = contextoPreparacao_(ss);
  var plano = planejarLote_(ctx, acao, lista);
  var resposta;
  if (plano.mudam.length) {
    var m = lerManifesto_(ss);
    var porOrigem = { estrutura: [], outros: [] };
    plano.mudam.forEach(function (it) { porOrigem[it.origem].push(it.chave); });
    resposta = executarLoteRetomavel_(ss, {
      formato: 1, id: Utilities.getUuid(), acao: acao, em: new Date().toISOString(), por: usuario.email,
      base: { planilha: ss.getId(), abaDisciplinas: m ? m.abas[ABAS.DISCIPLINAS] : null, importacao: m ? (m.importacao || null) : null },
      resumo: plano.resumo, itens: porOrigem
    });
  } else {
    resposta = lerPreparacaoParaResposta_(ss, { resultado: 'concluido' });   // nada a mudar: nada é escrito
  }
  Object.keys(plano.resumo).forEach(function (k) { resposta[k] = plano.resumo[k]; });
  if (acao === 'adicionar') resposta.semOferecimento = plano.semOferecimento;
  return resposta;
}

/** Preparação lida para a resposta; sem leitura, preparacao null + leituraFalhou. */
function lerPreparacaoParaResposta_(ss, dados) {
  try { dados.preparacao = preparacaoParaCliente_(ss, true); }
  catch (e) { dados.preparacao = null; dados.leituraFalhou = true; }
  return dados;
}

/* ---- registro (Propriedades do script) ---- */
function propriedadesLote_() { return PropertiesService.getScriptProperties(); }
/** JSON só com ASCII (cada caractere = 1 byte: as partes cabem nos 9 KB). */
function jsonAscii_(o) {
  return JSON.stringify(o).replace(/[\u007f-\uffff]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); });
}
/** Grava as partes e, por último, o cabeçalho (é ele que torna o pedido pendente). */
function gravarLote_(j) {
  var props = propriedadesLote_();
  limparPartesLote_(null);
  var corpo = jsonAscii_({ itens: j.itens });
  var partes = {}, n = Math.max(1, Math.ceil(corpo.length / TAMANHO_PARTE_LOTE));
  for (var i = 0; i < n; i++) partes[PROP_LOTE + '.' + j.id + '.' + i] = corpo.slice(i * TAMANHO_PARTE_LOTE, (i + 1) * TAMANHO_PARTE_LOTE);
  props.setProperties(partes);
  var cab = {};
  Object.keys(j).forEach(function (k) { if (k !== 'itens') cab[k] = j[k]; });
  cab.partes = n;
  cab.tamanho = corpo.length;
  props.setProperty(PROP_LOTE, jsonAscii_(cab));
}
/** Pedido em lote pendente (ou null). Registro incompleto ou ilegível: erro (BASE_INCONSISTENTE). */
function lerLotePendente_() {
  var todas = propriedadesLote_().getProperties();
  var cab = todas[PROP_LOTE];
  if (!cab) return null;
  var ilegivel = function () { return erroAmigavel_('BASE_INCONSISTENTE', 'O registro de uma ação em lote pendente está ilegível. Nada foi alterado. Avise quem mantém o sistema.'); };
  var j, corpo = '';
  try { j = JSON.parse(cab); } catch (e) { throw ilegivel(); }
  for (var i = 0; i < j.partes; i++) {
    var parte = todas[PROP_LOTE + '.' + j.id + '.' + i];
    if (typeof parte !== 'string') throw ilegivel();
    corpo += parte;
  }
  if (corpo.length !== j.tamanho) throw ilegivel();
  try { j.itens = JSON.parse(corpo).itens; } catch (e) { throw ilegivel(); }
  delete j.partes; delete j.tamanho;
  return j;
}
/** Remove o cabeçalho (fim do pedido) e, sem lançar erro, as partes. */
function removerLote_(j) {
  propriedadesLote_().deleteProperty(PROP_LOTE);
  limparPartesLote_(j.id);
}
/** Apaga partes soltas (de id, ou todas se id = null) sem lançar erro. */
function limparPartesLote_(id) {
  try {
    var props = propriedadesLote_();
    var prefixo = PROP_LOTE + '.' + (id ? id + '.' : '');
    props.getKeys().forEach(function (k) { if (k.indexOf(prefixo) === 0) props.deleteProperty(k); });
  } catch (e) { console.error('limpeza das partes de um lote: ' + (e && e.message)); }
}
function totalDoLote_(j) { return ORIGENS_LOTE.reduce(function (n, o) { return n + ((j.itens && j.itens[o]) || []).length; }, 0); }

/* ---- aplicar, conferir ---- */
/** O registro ainda vale para a base em uso (mesma planilha, aba Disciplinas, importação; itens existentes)? */
function loteNaMesmaBase_(ss, j) {
  var m = lerManifesto_(ss);
  if (!j.base || ss.getId() !== j.base.planilha) return false;
  if (!m || m.abas[ABAS.DISCIPLINAS] !== j.base.abaDisciplinas || (m.importacao || null) !== (j.base.importacao || null)) return false;
  var ctx = contextoPreparacao_(ss);
  return (j.itens.estrutura || []).every(function (k) { return !!ctx.base[k]; }) && (j.itens.outros || []).every(function (k) { return !!ctx.outros[k]; });
}
/**
 * Lê a planilha e diz, item por item, o que está no alvo:
 * { completo, total, confirmados, grupos: {estrutura: {total, faltam: []}, outros: {...}} }.
 */
function conferirLote_(ss, j) {
  var ctx = contextoPreparacao_(ss);
  var alvo = alvoDaAcaoLote_(j.acao);
  var c = { completo: true, total: 0, confirmados: 0, grupos: {} };
  ORIGENS_LOTE.forEach(function (origem) {
    var chaves = (j.itens && j.itens[origem]) || [];
    var g = { total: chaves.length, faltam: [] };
    chaves.forEach(function (k) {
      var linha = origem === 'estrutura' ? (ctx.ajustes[k] || null) : ctx.outros[k];
      var ok = origem === 'estrutura' ? itemNoAlvo_(linha, alvo) : !!linha && itemNoAlvo_(linha, alvo);
      if (ok) c.confirmados++; else g.faltam.push(k);
    });
    c.total += g.total;
    if (g.faltam.length) c.completo = false;
    c.grupos[origem] = g;
  });
  return c;
}
function conferirLoteSemErro_(ss, j) { try { return conferirLote_(ss, j); } catch (e) { return null; } }
/**
 * Aplica o que falta do pedido, confere e remove o registro. primeira =
 * a execução que acabou de validar o pedido: excluir/restaurar carimbam
 * "alterado em/por" em todos os itens (como antes da 1.8.7). Na retomada,
 * só os itens fora do alvo são tocados. Lança erro se algo falhar (o
 * registro continua).
 */
function aplicarLote_(ss, j, primeira) {
  if (!loteNaMesmaBase_(ss, j)) throw erroAmigavel_('LOTE_BASE_MUDOU', 'A base mudou depois da ação em lote pendente.');
  var ctx = contextoPreparacao_(ss);
  var alvo = alvoDaAcaoLote_(j.acao);
  var carimbar = j.acao === 'excluir' || j.acao === 'restaurar';
  var sujas = {};
  ORIGENS_LOTE.forEach(function (origem) {
    ((j.itens && j.itens[origem]) || []).forEach(function (k) {
      var linha = origem === 'estrutura' ? ctx.ajustes[k] : ctx.outros[k];
      if (!(primeira && carimbar) && itemNoAlvo_(linha, alvo)) return;
      if (!linha) { linha = ctx.ajustes[k] = { chave: k }; ctx.ordemAjustes.push(k); }
      Object.keys(alvo).forEach(function (campo) { linha[campo] = alvo[campo]; });
      if (carimbar) { linha.alteradoEm = new Date(j.em); linha.alteradoPor = j.por; }
      sujas[origem] = true;
    });
  });
  if (sujas.estrutura) gravarAjustes_(ss, ctx);
  if (sujas.outros) gravarOutros_(ss, ctx);
  SpreadsheetApp.flush();
  var depois = conferirLote_(ss, j);
  if (!depois.completo) throw new Error('conferência da ação em lote ' + j.id + ' não bateu');
  removerLote_(j);
  SpreadsheetApp.flush();
  return depois;
}

/* ---- situação, mensagens, respostas ---- */
/**
 * Tenta concluir a ação em lote pendente, se houver. Nunca lança erro por
 * falha de escrita: { estado: 'nenhum' | 'concluido' | 'pendente' |
 * 'base_mudou' | 'desconhecido' | 'incerto', lote, conferencia }.
 */
function resolverLotePendente_(ss) {
  var j;
  try { j = lerLotePendente_(); }
  catch (e) { console.error('lote pendente: leitura falhou: ' + (e && e.message)); return { estado: 'desconhecido', lote: null, conferencia: null }; }
  if (!j) return { estado: 'nenhum' };
  try {
    return { estado: 'concluido', lote: j, conferencia: aplicarLote_(ss, j, false) };
  } catch (e) {
    if (e && e.codigo === 'LOTE_BASE_MUDOU') return { estado: 'base_mudou', lote: j, conferencia: conferirLoteSemErro_(ss, j) };
    console.error('lote pendente ' + j.id + ': ' + (e && e.message));
    return situacaoLoteDepoisDaFalha_(ss, j);
  }
}
/** Depois de uma exceção ao aplicar j: registro presente → pendente; ilegível → desconhecido; removido → reconcilia. */
function situacaoLoteDepoisDaFalha_(ss, j) {
  var lido;
  try { lido = lerLotePendente_(); } catch (e) { lido = undefined; }
  if (lido === null) return reconciliarLoteSemRegistro_(ss, j);
  return { estado: lido === undefined ? 'desconhecido' : 'pendente', lote: j, conferencia: conferirLoteSemErro_(ss, j) };
}
/** Registro de j já removido: conferido → concluído; senão (ou sem leitura) → incerto. Nada é recriado nem reaplicado. */
function reconciliarLoteSemRegistro_(ss, j) {
  limparPartesLote_(j.id);   // partes que a remoção interrompida deixou (sem cabeçalho não valem)
  var c = conferirLoteSemErro_(ss, j);
  return { estado: c && c.completo ? 'concluido' : 'incerto', lote: j, conferencia: c };
}
/** Resumo para o painel: cada item é determinável (confirmado = do grupo e fora de "faltam"; grupo com faltam null = não conferido). */
function resumoLote_(r) {
  var j = r.lote || {}, c = r.conferencia;
  var grupos = ORIGENS_LOTE.filter(function (o) { return j.itens && (j.itens[o] || []).length; }).map(function (o) {
    var g = c && c.grupos[o];
    return { origem: o, total: j.itens[o].length, confirmados: g ? g.total - g.faltam.length : null, faltam: g ? g.faltam.slice() : null };
  });
  return {
    tipo: 'lote', estado: r.estado, id: j.id || null, acao: j.acao || null, nome: NOMES_ACAO_LOTE[j.acao] || 'Ação em lote',
    em: j.em ? formatarDataHora_(new Date(j.em)) : '', total: j.itens ? totalDoLote_(j) : null, resumo: j.resumo || null,
    confirmados: c ? c.confirmados : null, grupos: grupos, podeDescartar: r.estado === 'base_mudou'
  };
}
function mensagemLote_(r) {
  var s = resumoLote_(r);
  var qual = 'A ação "' + s.nome + '"' + (s.total !== null ? ' em ' + s.total + (s.total === 1 ? ' disciplina' : ' disciplinas') : '');
  var detalhe = s.grupos.map(function (g) { return (g.origem === 'estrutura' ? 'estrutura' : 'outros cursos') + ': ' + g.confirmados + ' de ' + g.total; }).join('; ');
  var parte = s.confirmados === null ? 'não foi possível conferir o que já está gravado'
    : s.confirmados === s.total ? 'todas já estão como pedido, falta só confirmar'
    : s.confirmados === 0 ? 'nenhuma está gravada ainda'
    : s.confirmados + ' de ' + s.total + ' já estão gravadas (' + detalhe + ')';
  if (r.estado === 'base_mudou') return qual + ' não pôde ser concluída porque a base mudou depois dela (' + parte + '). Confira as disciplinas e use "Descartar ação pendente": descartar encerra a pendência, mas NÃO desfaz o que já foi gravado. Nada mais pode ser gravado até lá.';
  if (r.estado === 'incerto') return 'Não foi possível confirmar ' + qual.charAt(0).toLowerCase() + qual.slice(1) + ': o registro da ação já foi encerrado na planilha, mas ' + (s.confirmados === null ? 'não foi possível ler a planilha para conferir' : 'a conferência mostra ' + s.confirmados + ' de ' + s.total + ' como pedido') + '. Recarregue o painel e confira; se faltar algo, repita a ação.';
  return qual + ' não terminou: ' + parte + '. O pedido continua registrado: o painel vai concluí-lo na próxima gravação ou quando for aberto de novo; você também pode clicar em "Concluir ação pendente". Até lá, outras gravações ficam bloqueadas.';
}
/** Recusa por ação em lote (LOTE_PENDENTE ou, se incerta, LOTE_INCERTO) com o que foi lido da planilha. */
function erroLotePendente_(ss, r) {
  var codigo = r.estado === 'incerto' ? 'LOTE_INCERTO' : 'LOTE_PENDENTE';
  var e = erroAmigavel_(codigo, mensagemLote_(r));
  var resumo = resumoLote_(r);
  resumo.mensagem = e.message;
  e.dados = lerPreparacaoParaResposta_(ss, { resultado: codigo === 'LOTE_INCERTO' ? 'incerto' : 'pendente', lote: resumo });
  return e;
}
/** Garante que não há ação em lote pendente: conclui ou recusa (LOTE_PENDENTE). */
function exigirSemLotePendente_(ss) {
  var r = resolverLotePendente_(ss);
  if (r.estado === 'nenhum' || r.estado === 'concluido') return r;
  throw erroLotePendente_(ss, r);
}
/** Registra o pedido, aplica, confere e responde (ver o bloco acima). */
function executarLoteRetomavel_(ss, j) {
  try {
    gravarLote_(j);
  } catch (e) {
    var lido;
    try { lido = lerLotePendente_(); } catch (e2) { lido = undefined; }
    if (lido === null) {
      console.error('ação em lote: registro não gravado (' + (e && e.message) + ')');
      limparPartesLote_(j.id);
      var nada = erroAmigavel_('NAO_SALVO', 'Nada foi alterado: a planilha não aceitou registrar a ação "' + NOMES_ACAO_LOTE[j.acao] + '". As disciplinas continuam selecionadas; tente de novo em alguns instantes.');
      nada.dados = lerPreparacaoParaResposta_(ss, { resultado: 'nao_concluido' });
      throw nada;
    }
    if (lido === undefined) throw erroLotePendente_(ss, { estado: 'desconhecido', lote: j, conferencia: conferirLoteSemErro_(ss, j) });
  }
  try {
    aplicarLote_(ss, j, true);
  } catch (e) {
    console.error('ação em lote ' + j.id + ': ' + (e && e.message) + ' — nova tentativa');
    var r = resolverLotePendente_(ss);   // relê o registro e tenta de novo (só o que falta)
    if (r.estado === 'nenhum') r = reconciliarLoteSemRegistro_(ss, j);
    else if (!r.lote) r = { estado: r.estado, lote: j, conferencia: conferirLoteSemErro_(ss, j) };
    if (r.estado !== 'concluido') throw erroLotePendente_(ss, r);
  }
  return lerPreparacaoParaResposta_(ss, { resultado: 'concluido' });
}

/**
 * PÚBLICA (1.8.7). "Concluir ação pendente" (acao: 'concluir') ou, quando
 * a base mudou e ela não pode mais ser aplicada, "Descartar" (acao:
 * 'descartar', id do registro: encerra a pendência SEM desfazer o que já
 * foi gravado). Só administradores.
 * @return {{ok, dados: {resultado: 'nenhum'|'concluido'|'descartado', acao, nome, total, preparacao}}}
 */
function resolverLotePendente(pedido) {
  return executarPreparacao_('resolverLotePendente', function (ss) {
    pedido = pedido && typeof pedido === 'object' ? pedido : {};
    var j = lerLotePendente_();
    if (!j) return lerPreparacaoParaResposta_(ss, { resultado: 'nenhum' });
    var info = { acao: j.acao, nome: NOMES_ACAO_LOTE[j.acao], total: totalDoLote_(j) };
    if (pedido.acao === 'descartar') {
      if (String(pedido.id || '') !== j.id) throw erroAmigavel_('DADOS_INVALIDOS', 'A ação pendente mudou. Recarregue o painel.');
      if (loteNaMesmaBase_(ss, j)) throw erroAmigavel_('DADOS_INVALIDOS', 'Esta ação ainda pode ser concluída: use "Concluir ação pendente".');
      removerLote_(j);
      info.resultado = 'descartado';
      return lerPreparacaoParaResposta_(ss, info);
    }
    var r = resolverLotePendente_(ss);
    if (r.estado === 'nenhum') return lerPreparacaoParaResposta_(ss, { resultado: 'nenhum' });
    if (r.estado !== 'concluido') throw erroLotePendente_(ss, r);
    info.resultado = 'concluido';
    return lerPreparacaoParaResposta_(ss, info);
  }, { semPendencia: true, flushProprio: true });
}

/** Palavra que a pessoa digita para confirmar "Cadastrar nova grade". */
var PALAVRA_RECOMECO = 'APAGAR';
var META_RECOMECO = 'estruturaCurricular.recomeco';

/**
 * PÚBLICA (1.4.0). "Cadastrar nova grade": APAGA A PLANILHA INTEIRA —
 * estrutura importada, histórico de importações e alterações, ajustes,
 * disciplinas para outros cursos e grade — e a deixa como nova (abas
 * vazias). Não há cópia de segurança (decisão do Serviço de Graduação;
 * o histórico de versões do Google Sheets continua existindo).
 * confirmacao: a palavra APAGAR, digitada pela pessoa.
 * Retomável: uma marca (metadado) é gravada antes de começar e só é
 * removida no fim; se algo falhar no meio, a próxima abertura do painel
 * por um administrador termina o recomeço (leitores veem "base não
 * preparada" até lá).
 */
function cadastrarNovaGrade(confirmacao) {
  return executarPreparacao_('cadastrarNovaGrade', function (ss, usuario) {
    if (String(confirmacao || '').trim().toUpperCase() !== PALAVRA_RECOMECO) {
      throw erroAmigavel_('DADOS_INVALIDOS', 'Para confirmar, digite ' + PALAVRA_RECOMECO + '.');
    }
    gravarMetadado_(ss, META_RECOMECO, JSON.stringify({ inicio: new Date().getTime() }));
    SpreadsheetApp.flush();
    recomecarPlanilha_(ss);
    return { recomecada: true };
  }, { semGarantir: true });
}

/** Há um recomeço ("Cadastrar nova grade") interrompido? */
function recomecoPendente_(ss) { return !!lerMetadado_(ss, META_RECOMECO); }

/**
 * Faz (ou termina) o recomeço: apaga os metadados do sistema, cria uma
 * aba vazia, apaga todas as outras (inclusive as ocultas "_anterior_…" e
 * "_nova_…"), prepara a planilha como nova (garantirEstrutura_) e só
 * então remove a marca do recomeço. Idempotente. Chamar com a trava.
 */
function recomecarPlanilha_(ss) {
  ss.getDeveloperMetadata().forEach(function (m) {
    var k = m.getKey();
    if (k.indexOf('estruturaCurricular.') === 0 && k !== META_RECOMECO) m.remove();
  });
  var vazia = ss.getSheets().filter(function (a) { return a.getName().indexOf('_recomeco_') === 0; })[0];
  if (!vazia) vazia = ss.insertSheet('_recomeco_' + new Date().getTime(), 0);
  ss.getSheets().forEach(function (a) { if (a !== vazia) ss.deleteSheet(a); });
  garantirEstrutura_(ss);
  SpreadsheetApp.flush();
  removerMetadado_(ss, META_RECOMECO);
}

/**
 * PÚBLICA. Cadastra manualmente uma disciplina para outros cursos.
 * @param {Object} dados { campos: {codigo, nome, …}, observacoes }
 */
function cadastrarDisciplinaOutros(dados) {
  return executarPreparacao_('cadastrarDisciplinaOutros', function (ss, usuario) {
    dados = dados && typeof dados === 'object' ? dados : {};
    var val = validarCampos_(CAMPOS_OUTROS, dados.campos || {});
    if (!val.codigo) throw erroAmigavel_('DADOS_INVALIDOS', 'Informe o código da disciplina (ex.: PST0391).');
    if (!val.nome) throw erroAmigavel_('DADOS_INVALIDOS', 'Informe o nome da disciplina.');
    var ctx = contextoPreparacao_(ss);
    exigirCodigoLivre_(ctx, val.codigo, null);
    if (ctx.outros[val.codigo]) throw erroAmigavel_('DISCIPLINA_EXISTENTE', 'Já existe uma disciplina para outros cursos com o identificador ' + val.codigo + '.');
    var linha = {
      chave: val.codigo, codigo: val.codigo, nome: val.nome,
      departamento: val.departamento || departamentoDe_(val.codigo),
      creditosAula: val.creditosAula, creditosTrabalho: val.creditosTrabalho,
      ch: val.ch != null ? val.ch : chCalculada_(val.creditosAula, val.creditosTrabalho),
      ativacao: val.ativacao, desativacao: val.desativacao,
      unidadeAtendida: val.unidadeAtendida, cursoAtendido: val.cursoAtendido, oferecimento: val.oferecimento || null,
      origem: ORIGEM_MANUAL, incluidaEm: new Date(), excluida: null, naGrade: null,
      observacoes: limparTextoLongo_(dados.observacoes, 2000) || null,
      alteradoEm: new Date(), alteradoPor: usuario.email
    };
    ctx.outros[linha.chave] = linha;
    ctx.ordemOutros.push(linha.chave);
    gravarOutros_(ss, ctx);
    return { chave: linha.chave, preparacao: preparacaoParaCliente_(ss, true) };
  });
}

/**
 * PÚBLICA. Prévia da importação da "Lista de disciplinas por unidade" do
 * Júpiter (CSV): mostra SÓ as disciplinas cujo código ainda não está na
 * lista (estrutura, com os códigos já ajustados, e outros cursos, inclusive
 * excluídas). Nada é gravado.
 * @param {string} texto   conteúdo do CSV já decodificado no navegador.
 * @param {string} arquivo nome do arquivo (só para exibição).
 * @return {{ok, dados: {assinatura, arquivo, total, novas: [...],
 *   conhecidas, repetidas, invalidas: [{linha, motivo}] (até 50),
 *   totalInvalidas (1.8.2: quantas linhas foram recusadas, mesmo além das 50)}}}
 * (1.8.2) Linha com crédito negativo, fracionário ou não numérico, aspas
 * malformadas ou colunas a mais é recusada com o motivo e nunca entra nas
 * "novas" (nem na inclusão, que refaz esta mesma leitura no servidor).
 */
function previaDisciplinasUnidade(texto, arquivo) {
  return executarPreparacao_('previaDisciplinasUnidade', function (ss) {
    return planoUnidade_(contextoPreparacao_(ss), texto, arquivo);
  }, { semTrava: true });
}

/**
 * PÚBLICA. Inclui as disciplinas escolhidas na prévia da lista por
 * unidade. Refaz a prévia no servidor; se a lista mudou desde a prévia
 * (assinatura diferente), recusa com PREVIA_DESATUALIZADA.
 * @param {string[]} codigos  códigos escolhidos (subconjunto das "novas").
 */
function incluirDisciplinasUnidade(texto, arquivo, assinatura, codigos) {
  return executarPreparacao_('incluirDisciplinasUnidade', function (ss, usuario) {
    var ctx = contextoPreparacao_(ss);
    var plano = planoUnidade_(ctx, texto, arquivo);
    if (String(assinatura || '') !== plano.assinatura) {
      throw erroAmigavel_('PREVIA_DESATUALIZADA', 'A lista mudou desde a prévia (outra inclusão ou edição foi feita). Nada foi incluído. Gere a prévia de novo.');
    }
    var escolhidos = {};
    (Array.isArray(codigos) ? codigos : []).forEach(function (c) { escolhidos[String(c)] = true; });
    var agora = new Date();
    var incluidas = [];
    plano.novas.forEach(function (d) {
      if (!escolhidos[d.codigo]) return;
      // 1.8.1: a chave pode estar ocupada por um registro cujo código foi
      // editado (ex.: chave PST0391, código PST0392) — nunca sobrescrever.
      var chave = chaveLivreOutros_(ctx, d.codigo);
      ctx.outros[chave] = {
        chave: chave, codigo: d.codigo, nome: d.nome, departamento: d.departamento,
        creditosAula: d.creditosAula, creditosTrabalho: d.creditosTrabalho, ch: d.ch,
        ativacao: d.ativacao, desativacao: d.desativacao, unidadeAtendida: null, cursoAtendido: null,
        origem: ORIGEM_UNIDADE, incluidaEm: agora, excluida: null, naGrade: null, observacoes: null,
        alteradoEm: agora, alteradoPor: usuario.email
      };
      ctx.ordemOutros.push(chave);
      incluidas.push(d.codigo);
    });
    if (!incluidas.length) throw erroAmigavel_('DADOS_INVALIDOS', 'Nenhuma disciplina escolhida para incluir.');
    gravarOutros_(ss, ctx);
    return { incluidas: incluidas.length, preparacao: preparacaoParaCliente_(ss, true) };
  });
}

/*---------------------------------------------------------------------
  Execução comum
---------------------------------------------------------------------*/

/**
 * Envolve as funções públicas da preparação: resposta padrão, só
 * administradores, planilha no esquema atual e trava do script (a mesma
 * das importações; 10 s de espera, depois OCUPADO).
 */
function executarPreparacao_(nome, fn, opcoes) {
  return executarComSeguranca_(nome, function () {
    var usuario = exigirAdmin_();
    var ss = abrirPlanilhaEstrutura_();
    if (opcoes && opcoes.semTrava) {
      if (!estruturaPronta_(ss)) throw erroAmigavel_('BASE_NAO_PREPARADA', 'Abra o painel de novo para preparar a planilha.');
      return fn(ss, usuario);
    }
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(10000)) throw erroAmigavel_('OCUPADO', 'Outra gravação está em andamento. Aguarde alguns segundos e tente de novo.');
    try {
      if (recomecoPendente_(ss) && !(opcoes && opcoes.semGarantir)) throw erroAmigavel_('BASE_NAO_PREPARADA', 'A planilha está sendo recomeçada ("Cadastrar nova grade"). Recarregue o painel.');
      if (!(opcoes && opcoes.semGarantir)) garantirEstrutura_(ss);
      // (1.8.5) Salvamento de disciplina interrompido: conclui antes de mudar outra coisa (ou recusa).
      // (1.8.6) O que essa conclusão gravou vai junto da resposta (ou da recusa) deste pedido.
      // (1.8.7) Idem para uma ação em lote pendente (recuperadoLote).
      var rec = { recuperado: null, recuperadoLote: null };
      var r;
      try {
        if (!(opcoes && opcoes.semPendencia)) exigirSemPendencias_(ss, rec);
        r = fn(ss, usuario, trava);   // (1.8.11) a trava vai junto, para rotinas internas que escrevem sob ela (envio → auditoria); só este executor a libera
        if (!(opcoes && opcoes.flushProprio)) SpreadsheetApp.flush();
      } catch (e) {
        if (rec.recuperado || rec.recuperadoLote) throw comRecuperado_(ss, nome, e, rec);
        throw e;
      }
      if ((rec.recuperado || rec.recuperadoLote) && r && typeof r === 'object') anexarRecuperados_(ss, r, rec);
      return r;
    } finally {
      trava.releaseLock();
    }
  });
}

/*---------------------------------------------------------------------
  (1.8.6) Salvamento pendente concluído no início de outro pedido
  -------------------------------------------------------------------
  Contrato: a resposta (ou a recusa, em dados) do pedido traz
    recuperado: { id, chave, codigo, observacao: {chave, texto} | null,
                  preparacao?, leituraFalhou? }
  com o que a conclusão deixou CONFERIDO na planilha. observacao = null
  quando o salvamento concluído não mudava a observação (o painel não
  mexe nela). preparacao só vem quando a própria resposta não a traz. O
  painel aplica recuperado ANTES dos dados do próprio pedido, que são
  mais recentes (ex.: novo salvamento da mesma disciplina).
---------------------------------------------------------------------*/
function recuperadoParaPainel_(r) {
  if (!r || r.estado !== 'concluido' || !r.salvamento) return null;
  var j = r.salvamento, c = r.conferencia || {};
  var mudouObs = j.observacao !== null && j.observacao !== undefined;
  return {
    id: j.id || null, chave: j.chave, codigo: j.rotulo || j.chave,
    observacao: mudouObs && typeof c.textoObservacao === 'string' ? { chave: j.chave, texto: c.textoObservacao } : null
  };
}
/**
 * (1.8.7) Ação em lote pendente concluída no início de outro pedido:
 * recuperadoLote = { id, acao, nome, total, resumo (contagens do pedido
 * antigo, de quando foi validado), em, preparacao?, leituraFalhou? }
 * (as contagens do pedido atual NÃO incluem o que a conclusão fez).
 */
function recuperadoLoteParaPainel_(r) {
  if (!r || r.estado !== 'concluido' || !r.lote) return null;
  var j = r.lote;
  return { id: j.id || null, acao: j.acao, nome: NOMES_ACAO_LOTE[j.acao], total: totalDoLote_(j), resumo: j.resumo || null, em: j.em ? formatarDataHora_(new Date(j.em)) : '' };
}
/**
 * Conclui as pendências (salvamento individual, depois ação em lote) antes
 * de outra mudança; o que cada conclusão gravou fica em rec. Se uma não
 * conclui, recusa (SALVAMENTO_PENDENTE / LOTE_PENDENTE…) — quem chama
 * anexa à recusa o que já tiver sido concluído.
 */
function exigirSemPendencias_(ss, rec) {
  rec.recuperado = recuperadoParaPainel_(exigirSemSalvamentoPendente_(ss));
  rec.recuperadoLote = recuperadoLoteParaPainel_(exigirSemLotePendente_(ss));
  return rec;
}
/** Põe recuperado/recuperadoLote em dados; a preparação lida vai junto quando dados não a traz. */
function anexarRecuperados_(ss, dados, rec) {
  if (rec.recuperado) dados.recuperado = rec.recuperado;
  if (rec.recuperadoLote) dados.recuperadoLote = rec.recuperadoLote;
  if (dados.preparacao) return dados;
  var alvo = rec.recuperado || rec.recuperadoLote;
  try { alvo.preparacao = preparacaoParaCliente_(ss, true); }
  catch (e) {
    if (rec.recuperado) rec.recuperado.leituraFalhou = true;
    if (rec.recuperadoLote) rec.recuperadoLote.leituraFalhou = true;
  }
  return dados;
}
/** Recusa ou erro depois de uma conclusão: leva o recuperado em dados (erro inesperado vira INESPERADO com dados). */
function comRecuperado_(ss, nome, e, rec) {
  var err = e;
  if (!(e && e.amigavel)) {
    console.error(nome + ' falhou: ' + (e && e.stack ? e.stack : e));
    err = erroAmigavel_('INESPERADO', 'Ocorreu um erro inesperado. Tente de novo em alguns instantes; se continuar, avise quem mantém o sistema.');
  }
  err.dados = anexarRecuperados_(ss, err.dados && typeof err.dados === 'object' ? err.dados : {}, rec);
  return err;
}

/*---------------------------------------------------------------------
  Leitura: contexto e resposta ao painel
---------------------------------------------------------------------*/

/**
 * Tudo o que as alterações precisam, lido de uma vez:
 *   base          código do Júpiter → disciplina (aba Disciplinas em uso)
 *   ofertaJupiter código → [{curriculo, tipo, periodo}] (currículos em uso)
 *   vigentes      currículo → true (currículos em uso)
 *   habCodigo     currículo em uso → código da habilitação (0, 100, 200…)
 *   curriculos    (1.8.9) todos os currículos da base, para o resolvedor da
 *                 oferta ajustada (tabelaCurriculos_)
 *   ajustes       código do Júpiter → linha de "Ajustes manuais"
 *   outros        identificador → linha de "Disciplinas para outros cursos"
 *   ordemAjustes, ordemOutros  ordem das linhas (mantida ao regravar)
 */
function contextoPreparacao_(ss) {
  var m = lerManifesto_(ss);
  var ctx = { base: {}, ofertaJupiter: {}, vigentes: {}, habCodigo: {}, ajustes: {}, outros: {}, ordemAjustes: [], ordemOutros: [], extras: {} };
  var linhasCurriculos = lerAba_(ss, ABAS.CURRICULOS, m).linhas;
  ctx.curriculos = tabelaCurriculos_(linhasCurriculos);   // (1.8.9) todos, inclusive os substituídos
  linhasCurriculos.forEach(function (c) {
    if (!/^sim/i.test(String(c.vigente || ''))) return;
    ctx.vigentes[c.curriculo] = true;
    ctx.habCodigo[c.curriculo] = c.habilitacaoCodigo || String(parseInt(String(c.curriculo).slice(5, 9), 10));   // 1.5.0: ordem das habilitações no envio da grade
  });
  lerAba_(ss, ABAS.DISCIPLINAS, m).linhas.forEach(function (d) { if (d.codigo) ctx.base[d.codigo] = d; });
  lerAba_(ss, ABAS.OFERTA, m).linhas.forEach(function (v) {
    if (!ctx.vigentes[v.curriculo]) return;
    (ctx.ofertaJupiter[v.codigo] = ctx.ofertaJupiter[v.codigo] || []).push({ curriculo: v.curriculo, tipo: tipoDoRotulo_(v.tipo), periodo: v.periodoIdeal == null ? null : v.periodoIdeal });
  });
  lerAbaObj_(ss.getSheetByName(ABAS.AJUSTES), ABAS.AJUSTES).linhas.forEach(function (a) {
    if (!a.chave || ctx.ajustes[a.chave]) return;
    ctx.ajustes[a.chave] = a;
    ctx.ordemAjustes.push(a.chave);
  });
  lerAbaObj_(ss.getSheetByName(ABAS.OUTROS), ABAS.OUTROS).linhas.forEach(function (o) {
    if (!o.chave || ctx.outros[o.chave]) return;
    ctx.outros[o.chave] = o;
    ctx.ordemOutros.push(o.chave);
  });
  return ctx;
}

/**
 * Ajustes e outros cursos no formato do painel. ehAdmin = false (leitor):
 * sem "alterado por" e sem a lista de outros cursos (etapas 2 e 3 são
 * só da equipe).
 */
function preparacaoParaCliente_(ss, ehAdmin, curriculos) {
  // (1.8.9) Currículos da base para a oferta efetiva (os da mesma leitura, quando quem chama já os tem).
  var tabela = tabelaCurriculos_(curriculos || lerAba_(ss, ABAS.CURRICULOS, lerManifesto_(ss)).linhas);
  var ajustes = lerAbaObj_(ss.getSheetByName(ABAS.AJUSTES), ABAS.AJUSTES).linhas.filter(function (a) { return a.chave; }).map(function (a) {
    var campos = {};
    CAMPOS_AJUSTE.forEach(function (c) { if (a[c.chave] !== null && a[c.chave] !== '') campos[c.chave] = a[c.chave]; });
    if (campos.oferecimento !== undefined) campos.oferecimento = semestreDoTexto_(campos.oferecimento) || undefined;
    if (campos.oferecimento === undefined) delete campos.oferecimento;
    var oferta = null;
    if (a.oferta) { try { oferta = JSON.parse(a.oferta); } catch (e) { oferta = null; } }
    // (1.8.9) oferta = a guardada (original); ofertaEfetiva = a que vale (resolvida);
    // ofertaPendencias = vínculos a revisar (com motivo); ofertaAssociada = vínculos associados ao sucessor.
    var efetiva = Array.isArray(oferta) ? resolverOferta_(oferta, tabela) : null;
    return {
      chave: a.chave, excluida: a.excluida === SIM, naGrade: a.naGrade === SIM, campos: campos, oferta: oferta,
      ofertaEfetiva: efetiva ? efetiva.vinculos : null, ofertaPendencias: efetiva ? efetiva.pendentes : [], ofertaAssociada: efetiva ? efetiva.associados : 0,
      alteradoEm: a.alteradoEm ? formatarDataHora_(a.alteradoEm) : '', alteradoPor: ehAdmin ? (a.alteradoPor || '') : ''
    };
  });
  var outros = !ehAdmin ? [] : lerAbaObj_(ss.getSheetByName(ABAS.OUTROS), ABAS.OUTROS).linhas.filter(function (o) { return o.chave; }).map(function (o) {
    return {
      chave: o.chave, codigo: o.codigo || o.chave, nome: o.nome || '', departamento: o.departamento || departamentoDe_(o.codigo || o.chave),
      creditosAula: o.creditosAula, creditosTrabalho: o.creditosTrabalho, ch: o.ch,
      ativacao: o.ativacao || '', desativacao: o.desativacao || '', unidadeAtendida: o.unidadeAtendida || '', cursoAtendido: o.cursoAtendido || '',
      oferecimento: semestreDoTexto_(o.oferecimento),
      origem: o.origem || '', incluidaEm: o.incluidaEm ? formatarDataHora_(o.incluidaEm) : '',
      excluida: o.excluida === SIM, naGrade: o.naGrade === SIM, observacoes: o.observacoes || '',
      alteradoEm: o.alteradoEm ? formatarDataHora_(o.alteradoEm) : '', alteradoPor: o.alteradoPor || ''
    };
  });
  return { ajustes: ajustes, outros: outros };
}

/*---------------------------------------------------------------------
  Validação
---------------------------------------------------------------------*/

/** Os dois valores são iguais para efeito de ajuste (null/'' iguais; números por valor). */
function iguais_(a, b) {
  var va = a === '' || a === undefined ? null : a;
  var vb = b === '' || b === undefined ? null : b;
  if (va === null || vb === null) return va === vb;
  return String(va) === String(vb);
}

/**
 * Valida os campos enviados pela ficha. Só os campos PRESENTES em
 * "campos" são devolvidos (os ausentes não mudam). Erro DADOS_INVALIDOS
 * com o nome do campo.
 */
function validarCampos_(definicoes, campos) {
  var r = {};
  definicoes.forEach(function (c) {
    if (!Object.prototype.hasOwnProperty.call(campos, c.chave)) return;
    var v = campos[c.chave];
    if (v === undefined || v === null || String(v).trim() === '') {
      if (c.obrigatorio) throw erroAmigavel_('DADOS_INVALIDOS', 'Preencha o campo "' + c.rotulo + '".');
      r[c.chave] = null;
      return;
    }
    if (c.tipo === 'codigo') {
      var cod = String(v).trim().toUpperCase().replace(/\s+/g, '');
      if (!RE_CODIGO_DISCIPLINA.test(cod)) throw erroAmigavel_('DADOS_INVALIDOS', 'Código "' + limparTexto_(v, 20) + '" inválido: use 3 letras e 4 números (ex.: PST0391) ou 7 números (ex.: 4701381).');
      r[c.chave] = cod;
    } else if (c.tipo === 'inteiro') {
      var n = Number(String(v).replace(',', '.'));
      if (!(isFinite(n) && Math.floor(n) === n && n >= 0 && n <= 9999)) throw erroAmigavel_('DADOS_INVALIDOS', 'O campo "' + c.rotulo + '" precisa ser um número inteiro de 0 a 9999.');
      r[c.chave] = n;
    } else if (c.tipo === 'semestre') {
      var cod = String(v).trim();
      if (!SEMESTRE_TEXTO[cod]) throw erroAmigavel_('DADOS_INVALIDOS', 'Semestre de oferecimento inválido: use 1º, 2º ou 1º e 2º semestres.');
      r[c.chave] = SEMESTRE_TEXTO[cod];
    } else if (c.tipo === 'data') {
      var t = String(v).trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(t)) throw erroAmigavel_('DADOS_INVALIDOS', 'O campo "' + c.rotulo + '" precisa estar no formato dd/mm/aaaa.');
      r[c.chave] = t;
    } else {
      r[c.chave] = limparTexto_(v, c.max || 200) || null;
    }
  });
  return r;
}

/** Oferta vinda da ficha: [{curriculo (em uso), tipo, periodo 1–20 ou vazio}], sem currículo repetido. */
function validarOferta_(oferta, ctx) {
  if (!Array.isArray(oferta) || oferta.length > 30) throw erroAmigavel_('DADOS_INVALIDOS', 'Oferta inválida.');
  var vistos = {};
  return oferta.map(function (o) {
    o = o || {};
    var curriculo = String(o.curriculo || '');
    if (!ctx.vigentes[curriculo]) throw erroAmigavel_('DADOS_INVALIDOS', 'Habilitação inválida na oferta. Recarregue o painel.');
    if (vistos[curriculo]) throw erroAmigavel_('DADOS_INVALIDOS', 'A mesma habilitação aparece duas vezes na oferta.');
    vistos[curriculo] = true;
    if (!ROTULO_TIPO[o.tipo]) throw erroAmigavel_('DADOS_INVALIDOS', 'Tipo inválido na oferta (obrigatória, eletiva ou livre).');
    var periodo = o.periodo === null || o.periodo === undefined || o.periodo === '' ? null : Number(o.periodo);
    if (periodo !== null && !(Math.floor(periodo) === periodo && periodo >= 1 && periodo <= 20)) throw erroAmigavel_('DADOS_INVALIDOS', 'Período ideal inválido na oferta (1 a 20).');
    return { curriculo: curriculo, tipo: o.tipo, periodo: periodo };
  });
}

/** Oferta em ordem estável (para comparar e guardar). */
function ordenarOferta_(oferta) {
  return oferta.map(function (o) { return { curriculo: o.curriculo, tipo: o.tipo, periodo: o.periodo == null ? null : o.periodo }; })
    .sort(function (a, b) { return a.curriculo < b.curriculo ? -1 : a.curriculo > b.curriculo ? 1 : 0; });
}

/** Itens de uma ação em lote: [{origem, chave}] válidos e sem repetição. */
function validarItens_(itens) {
  if (!Array.isArray(itens) || !itens.length) throw erroAmigavel_('DADOS_INVALIDOS', 'Nenhuma disciplina selecionada.');
  if (itens.length > MAX_ITENS_LOTE) throw erroAmigavel_('DADOS_INVALIDOS', 'Seleção grande demais.');
  var vistos = {};
  return itens.map(function (it) {
    it = it || {};
    var origem = it.origem === 'outros' ? 'outros' : it.origem === 'estrutura' ? 'estrutura' : null;
    var chave = limparTexto_(it.chave, 20) || '';
    if (!origem || !chave) throw erroAmigavel_('DADOS_INVALIDOS', 'Item inválido na seleção.');
    return { origem: origem, chave: chave };
  }).filter(function (it) { var k = it.origem + ':' + it.chave; if (vistos[k]) return false; vistos[k] = true; return true; });
}

/*---------------------------------------------------------------------
  (1.8.9) Oferta ajustada depois de uma troca de currículo
  -------------------------------------------------------------------
  A oferta ajustada (coluna "Oferta ajustada" de "Ajustes manuais") é uma
  lista [{curriculo, tipo, periodo}] que SUBSTITUI a do Júpiter inteira
  ([] = retirada intencional de todas as habilitações). Quando uma
  importação substitui o currículo de uma habilitação, a lista guardada
  pode continuar apontando para o currículo antigo. O resolvedor abaixo é
  uma PROJEÇÃO DE LEITURA: não regrava nada; a lista guardada fica como
  está e a interpretação efetiva é calculada a cada leitura, sobre a aba
  Currículos da base ativa (manifesto), e é a mesma no servidor (semestre
  de oferecimento, ações em lote, salvar com "adicionar à grade", linhas
  da grade) e no painel (preparacaoParaCliente_ manda a oferta efetiva
  pronta; o painel não recalcula).
  Associação automática (só quando inequívoca), por vínculo:
    - currículo em uso → vale como está;
    - currículo fora de uso → segue a cadeia "Não — substituído por X" da
      aba Currículos (gravada pela importação) até um currículo em uso;
      cada passo exige código de 12 dígitos presente na base, mesmo curso
      (5 primeiros dígitos e coluna Curso) e mesma habilitação (coluna e
      dígitos 6–9). Tipo e período AJUSTADOS são mantidos.
  Fica A REVISAR (preservado, com motivo, sem influir em semestre, filtros
  ou grade): currículo desconhecido ou fora do padrão, fora de uso sem
  sucessor registrado, sucessor ausente/de outra habilitação/de outro
  curso, cadeia circular, vínculo ilegível, ou dois vínculos que chegariam
  ao mesmo currículo com tipo/período diferentes (conflito: se um deles já
  aponta para o currículo em uso, esse vale e os outros ficam a revisar;
  senão, todos ficam a revisar). Vínculos que chegariam ao mesmo destino
  com tipo e período IGUAIS são equivalentes: vale um só.
---------------------------------------------------------------------*/
/** Aba Currículos (linhas ou mapa código → linha) → código → { vigente, hab, curso, sucessor }. */
function tabelaCurriculos_(linhas) {
  var t = {};
  var lista = Array.isArray(linhas) ? linhas : Object.keys(linhas || {}).map(function (k) { return linhas[k]; });
  lista.forEach(function (c) {
    var cod = String(c && c.curriculo || '');
    if (!/^\d{12}$/.test(cod)) return;
    var texto = String(c.vigente || '');
    var m = /substitu[íi]d[oa] por (\d{12})/i.exec(texto);
    var habCol = String(c.habilitacaoCodigo === null || c.habilitacaoCodigo === undefined ? '' : c.habilitacaoCodigo).trim();
    t[cod] = {
      vigente: /^sim/i.test(texto), sucessor: m ? m[1] : null,
      hab: habCol, habDigitos: String(parseInt(cod.slice(5, 9), 10)),
      curso: cod.slice(0, 5), cursoNome: String(c.curso || '').trim()
    };
  });
  return t;
}
/** Mesmo curso e mesma habilitação, conferidos pelos dígitos e pelas colunas da base. */
function mesmaHabilitacao_(a, b) {
  if (a.curso !== b.curso || a.habDigitos !== b.habDigitos) return false;
  if (a.hab && b.hab && a.hab !== b.hab) return false;
  if (a.hab && a.hab !== a.habDigitos) return false;
  if (b.hab && b.hab !== b.habDigitos) return false;
  if (a.cursoNome && b.cursoNome && a.cursoNome !== b.cursoNome) return false;
  return true;
}
/** Destino em uso de um currículo: { destino } ou { motivo } (nunca escolhe entre vários). */
function destinoDoCurriculo_(tabela, cod) {
  if (!/^\d{12}$/.test(cod)) return { motivo: 'referência de currículo fora do padrão (12 dígitos)' };
  var origem = tabela[cod];
  if (!origem) return { motivo: 'currículo ' + cod + ' desconhecido nesta base' };
  if (origem.vigente) return { destino: cod };
  var atual = cod, vistos = {};
  for (var passos = 0; passos < 50; passos++) {
    vistos[atual] = true;
    var t = tabela[atual];
    if (!t.sucessor) return { motivo: 'currículo ' + atual + ' fora de uso sem sucessor registrado' };
    var s = tabela[t.sucessor];
    if (!s) return { motivo: 'sucessor ' + t.sucessor + ' do currículo ' + atual + ' não está na base' };
    if (vistos[t.sucessor]) return { motivo: 'sucessão circular a partir do currículo ' + cod };
    if (!mesmaHabilitacao_(origem, s)) return { motivo: 'sucessor ' + t.sucessor + ' é de outra habilitação ou de outro curso' };
    if (s.vigente) return { destino: t.sucessor };
    atual = t.sucessor;
  }
  return { motivo: 'sucessão longa demais a partir do currículo ' + cod };
}
/**
 * Lista guardada → { vinculos: [{curriculo, tipo, periodo, origem?}] em uso,
 * pendentes: [{curriculo, tipo, periodo, motivo}], associados: n }.
 * origem = currículo guardado quando o vínculo foi associado ao sucessor.
 */
function resolverOferta_(lista, tabela) {
  var r = { vinculos: [], pendentes: [], associados: 0 };
  var porDestino = {}, ordem = [];
  (Array.isArray(lista) ? lista : []).forEach(function (o) {
    if (!o || typeof o !== 'object') { r.pendentes.push({ curriculo: '', tipo: '', periodo: null, motivo: 'vínculo ilegível' }); return; }
    var cod = String(o.curriculo === null || o.curriculo === undefined ? '' : o.curriculo);
    var per = o.periodo === null || o.periodo === undefined || o.periodo === '' ? null : isFinite(Number(o.periodo)) ? Number(o.periodo) : o.periodo;
    var v = { curriculo: cod, tipo: o.tipo || '', periodo: per };
    var d = destinoDoCurriculo_(tabela, cod);
    if (d.motivo) { v.motivo = d.motivo; r.pendentes.push(v); return; }
    if (!porDestino[d.destino]) { porDestino[d.destino] = []; ordem.push(d.destino); }
    porDestino[d.destino].push({ guardado: v, direto: d.destino === cod });
  });
  ordem.forEach(function (dest) {
    var g = porDestino[dest];
    var chaveValor = function (x) { return String(x.guardado.tipo) + '|' + String(x.guardado.periodo === null ? '' : Number(x.guardado.periodo)); };
    var iguais = g.every(function (x) { return chaveValor(x) === chaveValor(g[0]); });
    var escolhido = null;
    if (g.length === 1 || iguais) escolhido = g.filter(function (x) { return x.direto; })[0] || g[0];
    else {
      var diretos = g.filter(function (x) { return x.direto; });
      if (diretos.length === 1) escolhido = diretos[0];
    }
    g.forEach(function (x) {
      if (x === escolhido) return;
      if (escolhido && chaveValor(x) === chaveValor(escolhido)) return;   // equivalente: vale um só
      var p = { curriculo: x.guardado.curriculo, tipo: x.guardado.tipo, periodo: x.guardado.periodo };
      p.motivo = escolhido ? 'conflito com o vínculo do currículo em uso ' + dest + ' (tipo/período diferentes)' : 'conflito: mais de um vínculo chegaria ao currículo ' + dest + ' com tipo/período diferentes';
      r.pendentes.push(p);
    });
    if (escolhido) {
      var v = { curriculo: dest, tipo: escolhido.guardado.tipo, periodo: escolhido.guardado.periodo };
      if (!escolhido.direto) { v.origem = escolhido.guardado.curriculo; r.associados++; }
      r.vinculos.push(v);
    }
  });
  return r;
}
/**
 * Oferta EFETIVA de uma disciplina da estrutura: { ajustada, vinculos,
 * pendentes, associados }. Sem ajuste de oferta (ou ajuste ilegível, como
 * antes): a do Júpiter nos currículos em uso. Ajuste [] = retirada
 * intencional (sem pendência). Ajuste com vínculos: resolverOferta_.
 */
function ofertaEfetiva_(ctx, chave, aj) {
  var lista = null;
  if (aj && aj.oferta) { try { lista = JSON.parse(aj.oferta); } catch (e) { lista = null; } }
  if (!Array.isArray(lista)) return { ajustada: false, vinculos: ctx.ofertaJupiter[chave] || [], pendentes: [], associados: 0 };
  var r = resolverOferta_(lista, ctx.curriculos || {});
  r.ajustada = true;
  return r;
}

/**
 * Semestre de oferecimento pelo PERÍODO IDEAL de uma disciplina da
 * estrutura (oferta EFETIVA: a ajustada, se houver, já resolvida para os
 * currículos em uso — vínculos a revisar não contam —; senão a do
 * Júpiter nos currículos em uso): ímpar → '1', par → '2', os dois →
 * 'ambos', sem período → ''.
 */
function oferecimentoCalculado_(ctx, chave, aj) {
  var oferta = ofertaEfetiva_(ctx, chave, aj).vinculos;   // (1.8.9) a mesma oferta da ficha, dos filtros e da grade
  var par = {};
  oferta.forEach(function (o) { var p = Number(o.periodo); if (p) par[p % 2] = true; });
  return par[1] && par[0] ? 'ambos' : par[1] ? '1' : par[0] ? '2' : '';
}

/** Semestre de oferecimento EM VIGOR de um item ('' = não definido). */
function oferecimentoEfetivo_(ctx, it) {
  if (it.origem === 'outros') return semestreDoTexto_((ctx.outros[it.chave] || {}).oferecimento);
  var aj = ctx.ajustes[it.chave];
  return semestreDoTexto_(aj && aj.oferecimento) || oferecimentoCalculado_(ctx, it.chave, aj);
}

/** Código em uso de um item (o ajustado, se houver). */
function codigoEfetivoDoItem_(ctx, it) {
  if (it.origem === 'outros') return (ctx.outros[it.chave] || {}).codigo || it.chave;
  var aj = ctx.ajustes[it.chave];
  return (aj && aj.codigo) || it.chave;
}

/**
 * Códigos EFETIVOS de toda a lista (estrutura com os códigos ajustados,
 * inclusive excluídas e fora da estrutura; outros cursos, inclusive
 * excluídas): código → [{origem, chave}].
 */
function codigosEfetivos_(ctx) {
  var r = {};
  function por(cod, origem, chave) { if (cod) (r[cod] = r[cod] || []).push({ origem: origem, chave: chave }); }
  Object.keys(ctx.base).forEach(function (k) { var aj = ctx.ajustes[k]; por(aj && aj.codigo ? aj.codigo : k, 'estrutura', k); });
  Object.keys(ctx.outros).forEach(function (k) { por(ctx.outros[k].codigo || k, 'outros', k); });
  return r;
}

/**
 * (1.8.1) Chave (coluna "Identificador") para um registro NOVO de
 * "Disciplinas para outros cursos": o próprio código, se livre; senão
 * código-2, código-3… Considera todos os registros, inclusive excluídos,
 * e nunca reaproveita nem altera chave existente. Códigos de disciplina
 * não têm hífen, então a chave com sufixo não colide com um código; o
 * resultado cabe nos 20 caracteres aceitos para chaves.
 */
function chaveLivreOutros_(ctx, codigo) {
  var tem = function (k) { return Object.prototype.hasOwnProperty.call(ctx.outros, k); };
  if (!tem(codigo)) return codigo;
  for (var n = 2; ; n++) { if (!tem(codigo + '-' + n)) return codigo + '-' + n; }
}

/** Recusa (CODIGO_REPETIDO) se "codigo" já é o código de outra disciplina da lista. */
function exigirCodigoLivre_(ctx, codigo, proprio) {
  var usos = (codigosEfetivos_(ctx)[codigo] || []).filter(function (u) { return !proprio || u.origem !== proprio.origem || u.chave !== proprio.chave; });
  if (usos.length) {
    var onde = usos[0].origem === 'estrutura' ? 'na estrutura curricular' : 'nas disciplinas para outros cursos';
    throw erroAmigavel_('CODIGO_REPETIDO', 'O código ' + codigo + ' já é usado por outra disciplina ' + onde + '. Nada foi salvo.');
  }
}

/** CH = 15 h por crédito-aula + 30 h por crédito-trabalho (null se faltar algum). */
function chCalculada_(aula, trabalho) {
  if (aula == null && trabalho == null) return null;
  return 15 * (aula || 0) + 30 * (trabalho || 0);
}

/*---------------------------------------------------------------------
  Lista de disciplinas por unidade (CSV do Júpiter)
---------------------------------------------------------------------*/

/** Colunas reconhecidas no CSV (título sem acento/maiúsculas → campo). */
var COLUNAS_UNIDADE = {
  'disciplina': 'codigo', 'codigo': 'codigo', 'nome': 'nome', 'ativacao': 'ativacao', 'desativacao': 'desativacao',
  'tipo': 'tipo', 'creditos aula': 'creditosAula', 'creditos trabalho': 'creditosTrabalho'
};

/**
 * Lê UM registro do CSV a partir da linha física "i" (aspas duplas;
 * separador ";", "," ou tabulação). Aspas só abrem um campo no início dele
 * (espaços antes delas são ignorados, e também depois das de fechamento);
 * "" dentro de um campo entre aspas = uma aspa.
 * (1.8.2) "erro" = motivo quando o registro está malformado: aspas no meio
 * de um campo sem aspas ou texto depois das aspas de fechamento.
 * (1.8.3) Como no CSV um campo entre aspas pode atravessar a quebra de
 * linha, o estado das aspas é levado para as linhas seguintes até o
 * registro terminar (quebra de linha FORA de aspas). Este leitor não aceita
 * esses campos, mas precisa saber onde o registro termina para que as
 * linhas de dentro do campo nunca sejam lidas como disciplinas. Depois de
 * um erro, a leitura continua só para acompanhar as aspas (aspa fora de
 * lugar conta como abertura).
 * @return {{campos: string[]|null, erro: string|null, fim: number,
 *   multilinha: boolean, aberto: boolean}} fim = última linha física do
 *   registro; aberto = aspas ainda abertas no fim do arquivo.
 */
function lerRegistroCsv_(linhas, i, sep) {
  var campos = [], atual = '', aspas = false, fechou = false, erro = null, j = i;
  for (;;) {
    var linha = linhas[j];
    for (var k = 0; k < linha.length; k++) {
      var ch = linha.charAt(k);
      if (aspas) {
        if (ch === '"') { if (linha.charAt(k + 1) === '"') { atual += '"'; k++; } else { aspas = false; fechou = true; } }
        else atual += ch;
      } else if (ch === sep) { campos.push(atual); atual = ''; fechou = false; }
      else if (ch === '"') {
        if (fechou) erro = erro || 'texto depois das aspas de fechamento de um campo';
        else if (atual.trim()) erro = erro || 'aspas no meio de um campo (o campo inteiro precisa estar entre aspas)';
        else atual = '';
        aspas = true; fechou = false;
      } else if (fechou) {
        if (!/\s/.test(ch)) { erro = erro || 'texto depois das aspas de fechamento de um campo'; atual += ch; fechou = false; }
      } else atual += ch;
    }
    if (!aspas) break;
    if (j + 1 >= linhas.length) return { campos: null, erro: erro, fim: j, multilinha: j > i, aberto: true };
    atual += '\n'; j++;
  }
  campos.push(atual);
  return { campos: erro ? null : campos, erro: erro, fim: j, multilinha: j > i, aberto: false };
}

/**
 * (1.8.2) Créditos (aula ou trabalho) de uma linha do CSV da unidade.
 * Sintaxe aceita: vazio ou só espaços = não informado (null, como antes);
 * inteiro de 0 a 9999 (o mesmo limite dos campos inteiros da ficha),
 * opcionalmente com parte decimal só de zeros ("3,0", "3.00", e desde a
 * 1.8.3 "3.000", "0002.0000" = inteiro, como o leitor anterior já entendia). Qualquer outra coisa — negativo, fração, texto,
 * "2abc", "1/2", "NaN", "Infinity", "+2", "1e1" — é recusada com motivo;
 * nunca é arredondada, truncada ou trocada por vazio/zero.
 * @return {{valor: number|null}|{erro: string}}
 */
function creditoDaUnidade_(texto) {
  var t = normalizarEspacos_(texto);
  if (!t) return { valor: null };
  var mostra = ' (' + limparTexto_(t, 30) + ')';
  // (1.8.3) Parte decimal só de zeros, com quantos zeros vierem ("3.000",
  // "0002.0000"). A decisão é pelo TEXTO (não por Number, que esconderia
  // uma fração muito pequena); "." e "," são separadores decimais, nunca
  // de milhar.
  if (/^\d+([.,]0+)?$/.test(t)) {
    var inteiro = t.replace(/[.,]0+$/, '').replace(/^0+(?=\d)/, '');
    return inteiro.length <= 4 && Number(inteiro) <= 9999 ? { valor: Number(inteiro) } : { erro: 'acima do máximo aceito, 9999' + mostra };
  }
  if (/^-\s*\d+([.,]\d+)?$/.test(t)) return { erro: 'valor negativo' + mostra };
  if (/^\d+[.,]\d+$/.test(t)) return { erro: 'valor fracionário' + mostra };
  return { erro: 'valor inválido' + mostra };
}

/**
 * Lê o CSV da "Lista de disciplinas por unidade" e compara com a lista
 * atual. Devolve a prévia (ver previaDisciplinasUnidade).
 */
function planoUnidade_(ctx, texto, arquivo) {
  texto = String(texto == null ? '' : texto);
  if (!texto.trim()) throw erroAmigavel_('PACOTE_INVALIDO', 'O arquivo está vazio.');
  if (texto.length > MAX_TEXTO_UNIDADE) throw erroAmigavel_('PACOTE_INVALIDO', 'Arquivo grande demais para a lista de disciplinas por unidade.');
  if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
  var linhas = texto.replace(/\r\n?/g, '\n').split('\n');
  var cab = linhas[0] || '';
  var sep = [';', '\t', ','].reduce(function (m, s) { return cab.split(s).length > cab.split(m).length ? s : m; }, ';');
  var cabecalho = lerRegistroCsv_(linhas, 0, sep);
  if (cabecalho.erro || cabecalho.aberto || cabecalho.multilinha) {
    var defeito = cabecalho.erro || (cabecalho.aberto ? 'aspas não encerradas' : 'campo entre aspas com quebra de linha');
    throw erroAmigavel_('PACOTE_INVALIDO', 'O cabeçalho do arquivo (linha 1) está malformado: ' + defeito + '. Nada foi lido. Use o CSV exportado do Júpiter (Lista de disciplinas por unidade) sem edição.');
  }
  var brutos = cabecalho.campos.map(chaveTitulo_);
  var titulos = brutos.map(function (t) { return COLUNAS_UNIDADE[t] || null; });
  // A "Lista de disciplinas por unidade" tem Disciplina, Nome e Ativação e
  // NÃO tem Currículo (o CSV da "Grade curricular" tem Currículo).
  if (titulos.indexOf('codigo') < 0 || titulos.indexOf('nome') < 0 || titulos.indexOf('ativacao') < 0 || brutos.indexOf('curriculo') >= 0) {
    throw erroAmigavel_('PACOTE_INVALIDO', 'Este arquivo não parece ser a "Lista de disciplinas por unidade" do Júpiter: as colunas esperadas são Disciplina, Nome, Ativação, Desativação, Tipo, Créditos aula e Créditos trabalho. Confira o relatório escolhido (Júpiter › Estrutura Curricular › Relatórios › Lista de disciplinas por unidade).');
  }
  var efetivos = codigosEfetivos_(ctx);
  var novas = [], invalidas = [], vistos = {};
  var conhecidas = 0, repetidas = 0, total = 0, totalInvalidas = 0;
  // (1.8.3) "ate" = última linha de um registro descartado que ocupa várias linhas.
  function ignorar(linha, motivo, ate) {
    totalInvalidas++;
    if (invalidas.length < 50) invalidas.push(ate && ate !== linha ? { linha: linha, ate: ate, motivo: motivo } : { linha: linha, motivo: motivo });
  }
  var ultima = linhas.length;
  while (ultima > 1 && !linhas[ultima - 1].trim()) ultima--;   // última linha física com conteúdo (1 = cabeçalho)
  for (var i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    total++;
    if (total > 5000) throw erroAmigavel_('PACOTE_INVALIDO', 'O arquivo tem linhas demais (mais de 5.000).');
    // (1.8.2) Tudo é validado ANTES de classificar como repetida/conhecida:
    // uma linha malformada nunca é contada como "já está na lista".
    var reg = lerRegistroCsv_(linhas, i, sep);
    // (1.8.3) Campo entre aspas que não fecha na mesma linha:
    //  - fecha mais adiante e o registro termina bem → o registro INTEIRO
    //    (todas as suas linhas) é descartado e a leitura continua depois dele;
    //  - não fecha até o fim do arquivo, ou fecha de forma inválida (fim do
    //    registro ambíguo) → nada a partir desta linha é lido.
    // Nunca se procura "a próxima linha que parece disciplina".
    if (reg.aberto) {
      ignorar(i + 1, 'aspas não encerradas: o campo aberto nesta linha não fecha até o fim do arquivo' +
        (ultima > i + 1 ? '; as linhas ' + (i + 1) + ' a ' + ultima + ' ficam dentro dele e nenhuma foi lida' : ''), ultima);
      break;
    }
    if (reg.multilinha && reg.erro) {
      ignorar(i + 1, 'aspas não encerradas na mesma linha e aspas malformadas adiante (' + reg.erro + '): não dá para saber onde o registro termina; nada a partir da linha ' + (i + 1) + ' foi lido', ultima);
      break;
    }
    if (reg.multilinha) {
      ignorar(i + 1, 'aspas não encerradas na mesma linha: campo entre aspas com quebra de linha (linhas ' + (i + 1) + ' a ' + (reg.fim + 1) + ') não é aceito; o registro inteiro foi descartado', reg.fim + 1);
      i = reg.fim;
      continue;
    }
    if (reg.erro) { ignorar(i + 1, reg.erro); continue; }
    var partes = reg;
    var sobra = partes.campos.slice(brutos.length).filter(function (x) { return normalizarEspacos_(x) !== ''; });
    if (sobra.length) { ignorar(i + 1, 'mais colunas preenchidas que o cabeçalho (' + partes.campos.length + ' em vez de ' + brutos.length + '); confira separadores e aspas'); continue; }
    var o = {};
    titulos.forEach(function (campo, k) { if (campo) o[campo] = normalizarEspacos_(partes.campos[k] || ''); });
    var codigo = String(o.codigo || '').toUpperCase().replace(/\s+/g, '');
    if (!RE_CODIGO_DISCIPLINA.test(codigo)) { ignorar(i + 1, 'código "' + (o.codigo || '') + '" não reconhecido'); continue; }
    if (!o.nome) { ignorar(i + 1, codigo + ' sem nome'); continue; }
    var aula = creditoDaUnidade_(o.creditosAula), trab = creditoDaUnidade_(o.creditosTrabalho);
    var problemas = [];
    if (aula.erro) problemas.push('Créditos-aula: ' + aula.erro);
    if (trab.erro) problemas.push('Créditos-trabalho: ' + trab.erro);
    if (problemas.length) { ignorar(i + 1, codigo + ' — ' + problemas.join('; ')); continue; }
    if (vistos[codigo]) { repetidas++; continue; }
    vistos[codigo] = true;
    if (efetivos[codigo]) { conhecidas++; continue; }
    novas.push({
      codigo: codigo, nome: limparTexto_(o.nome, 300), departamento: departamentoDe_(codigo),
      creditosAula: aula.valor, creditosTrabalho: trab.valor, ch: chCalculada_(aula.valor, trab.valor),
      ativacao: /^\d{2}\/\d{2}\/\d{4}$/.test(o.ativacao || '') ? o.ativacao : null,
      desativacao: /^\d{2}\/\d{2}\/\d{4}$/.test(o.desativacao || '') ? o.desativacao : null,
      tipo: o.tipo || ''
    });
  }
  var assinatura = hashTexto_(JSON.stringify({ novas: novas, conhecidos: Object.keys(efetivos).sort() }));
  return {
    assinatura: assinatura, arquivo: limparTexto_(arquivo, 120) || '', total: total,
    novas: novas, conhecidas: conhecidas, repetidas: repetidas, invalidas: invalidas,
    totalInvalidas: totalInvalidas
  };
}

/*---------------------------------------------------------------------
  Escrita
---------------------------------------------------------------------*/

/**
 * Regrava TODAS as linhas de dados de uma aba mantida pelo painel numa
 * única escrita (setValues de um bloco que cobre as linhas antigas e as
 * novas; linhas que sobraram ficam em branco). Colunas extras criadas por
 * alguém são preservadas pela linha (_extras).
 */
function regravarAbaInteira_(aba, nomeAba, objetos) {
  var colunas = COLUNAS[nomeAba];
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var porTitulo = mapaDeTitulos_(colunas);
  var linhas = objetos.map(function (o) {
    return titulos.map(function (t) {
      var col = t ? porTitulo[chaveTitulo_(t)] : null;
      if (col) return valorParaCelula_(o[col.chave], col.tipo);
      var extra = o._extras && Object.prototype.hasOwnProperty.call(o._extras, t) ? o._extras[t] : '';
      return extra === null || extra === undefined ? '' : (typeof extra === 'string' ? textoSeguro_(extra) : extra);
    });
  });
  var antigas = Math.max(0, aba.getLastRow() - 1);
  var total = Math.max(antigas, linhas.length);
  if (!total) return;
  while (linhas.length < total) linhas.push(titulos.map(function () { return ''; }));
  if (aba.getMaxRows() < total + 1) aba.insertRowsAfter(aba.getMaxRows(), total + 1 - aba.getMaxRows());
  aba.getRange(2, 1, total, titulos.length).setValues(linhas);
}

/** Linha de ajuste sem nada a guardar (nenhum campo, oferta, exclusão ou seleção)? */
function ajusteVazio_(a) {
  if (a.excluida === SIM || a.naGrade === SIM || a.oferta) return false;
  return !CAMPOS_AJUSTE.some(function (c) { return a[c.chave] !== null && a[c.chave] !== undefined && a[c.chave] !== ''; });
}

/** Regrava "Ajustes manuais" (linhas vazias são removidas). */
function gravarAjustes_(ss, ctx) {
  var objs = ctx.ordemAjustes.map(function (k) { return ctx.ajustes[k]; }).filter(function (a) { return a && !ajusteVazio_(a); });
  regravarAbaInteira_(ss.getSheetByName(ABAS.AJUSTES), ABAS.AJUSTES, objs);
}

/** Regrava "Disciplinas para outros cursos". */
function gravarOutros_(ss, ctx) {
  var objs = ctx.ordemOutros.map(function (k) { return ctx.outros[k]; }).filter(Boolean);
  regravarAbaInteira_(ss.getSheetByName(ABAS.OUTROS), ABAS.OUTROS, objs);
}

/**
 * Escreve a Observação de uma disciplina da estrutura na coluna livre
 * "Observações" da aba Disciplinas EM USO (uma célula).
 */
function gravarObservacaoEstrutura_(ss, codigo, texto) {
  var aba = abaDados_(ss, ABAS.DISCIPLINAS);
  var titulos = titulosDaAba_(aba).map(chaveTitulo_);
  var colCodigo = titulos.indexOf(chaveTitulo_('Código')) + 1;
  var colObs = titulos.indexOf(chaveTitulo_('Observações')) + 1;
  if (!colCodigo || !colObs || aba.getLastRow() < 2) throw erroAmigavel_('BASE_INCONSISTENTE', 'A aba Disciplinas está sem a coluna Código ou Observações.');
  var codigos = aba.getRange(2, colCodigo, aba.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < codigos.length; i++) {
    if (textoDaCelula_(codigos[i][0]) === codigo) {
      aba.getRange(i + 2, colObs).setValue(textoSeguro_(texto));
      return;
    }
  }
  throw erroAmigavel_('DISCIPLINA_NAO_ENCONTRADA', 'A disciplina ' + codigo + ' não está na aba Disciplinas.');
}
