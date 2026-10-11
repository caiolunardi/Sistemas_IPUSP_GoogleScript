/*=====================================================================
  IMPORTAÇÃO — validação, prévia e gravação

  Fluxo (o navegador já leu o arquivo e montou o "pacote"; ver
  LeitorComum.html):

    prepararImportacao(pacote)
      → valida o pacote aqui no servidor (nada vindo do navegador é
        aceito sem conferência)
      → compara com a base atual e monta a PRÉVIA do que vai mudar
      → NÃO grava nada

    confirmarImportacao(pacote, assinatura)
      → refaz tudo (validação + comparação) com trava de execução
      → confere se a base não mudou desde a prévia (assinatura)
      → grava as abas, o registro da importação e as alterações

  REGRAS DE GRAVAÇÃO
  1. CSV: define a estrutura das habilitações que estão no arquivo
     (gravação "completa"). As outras habilitações não são tocadas.
  2. PDF de currículos que a base AINDA NÃO tem: também é "completo".
     Se o PDF foi lido por OCR, todos os números precisam ter sido
     confirmados pelas contas do relatório (senão a gravação é
     bloqueada e o sistema pede o CSV).
  3. PDF dos MESMOS currículos que já estão na base: "complemento".
     Só acrescenta o que o CSV não traz — versão, extensão (EXT),
     requisitos alternativos ("ou") e informações básicas do currículo.
     Onde o PDF disser algo diferente da base, a diferença aparece na
     prévia e a base fica como está.
  4. Estrutura nova de uma habilitação (outro número de currículo, mais
     recente) substitui a anterior; o currículo antigo fica registrado
     como substituído. Estrutura MAIS ANTIGA que a da base é recusada.
  5. Disciplina que estava na base e não aparece em nenhuma habilitação
     depois da importação fica como "Fora da estrutura atual" (não é
     apagada; as Observações ficam).
  6. O nome vindo do PDF nunca substitui um nome já gravado (o PDF corta
     nomes longos).
  7. A prévia vale só para a planilha como estava: edição manual em
     célula mantida pelo sistema invalida a prévia (Observações e
     colunas extras não invalidam e são preservadas).
  8. Informações Básicas do PDF: as contas são refeitas aqui; campo de
     conta que não fecha, ou ausente, não é gravado.
  9. PDF lido por OCR com valores que só o PDF tem: a gravação exige a
     confirmação da revisão humana.
  A escrita na planilha é feita por Gravacao.gs (preparação em cópias
  ocultas, ativação por uma única escrita, recuperação).
=====================================================================*/

/** Tamanho máximo aceito para cada lista do pacote (proteção contra envio abusivo). */
var LIMITES_PACOTE = { curriculos: 30, disciplinas: 3000, vinculos: 30000, requisitos: 60000 };
/** Campos que o CSV e o PDF trazem (comparados entre arquivo e base). */
var CAMPOS_COMPARTILHADOS = ['nome', 'creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'atpa'];
/** Os mesmos, sem o nome: são os números que o OCR precisa ter confirmado. */
var CAMPOS_NUMERICOS_COMPARTILHADOS = ['creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'atpa'];
/** Campos que só o PDF traz (o CSV não tem): versão da disciplina e extensão. */
var CAMPOS_SO_PDF = ['versao', 'ext'];
/** Nome de cada campo como aparece na prévia e na aba Alterações. */
var ROTULO_CAMPO = {
  nome: 'Nome', creditosAula: 'Créditos-aula', creditosTrabalho: 'Créditos-trabalho', ch: 'CH total (h)',
  ce: 'Estágio – CE (h)', cp: 'Práticas – CP (h)', atpa: 'ATPA (h)', versao: 'Versão', ext: 'Extensão – EXT (h)'
};
/** Situação de uma disciplina na base (coluna "Situação" da aba Disciplinas). */
var SITUACAO = { NA: 'Na estrutura atual', FORA: 'Fora da estrutura atual' };
/** Máximo de itens por lista na prévia enviada ao navegador (os totais vêm completos). */
var MAX_ITENS_PREVIA = 400;

/*---------------------------------------------------------------------
  Funções públicas (google.script.run)
---------------------------------------------------------------------*/

/**
 * PÚBLICA. Primeira etapa da importação: valida o pacote e devolve a
 * prévia do que vai mudar, SEM gravar dados. Só administradores.
 * Na primeira vez, também cria as abas que faltarem na planilha; se a
 * trava estiver livre, faz antes a recuperação de uma gravação
 * interrompida (Gravacao.gs).
 * @param {Object} pacote  montado no navegador pelo LeitorCsv/LeitorPdf
 *   (formato em LeitorComum.html).
 * @return {{ok: boolean, dados: Object}}  dados = prévia (ver montarPrevia_),
 *   com a "assinatura" e o identificador "operacao" que
 *   confirmarImportacao exige.
 */
function prepararImportacao(pacote) {
  return executarComSeguranca_('prepararImportacao', function () {
    var usuario = exigirAdmin_();
    var ss = abrirPlanilhaEstrutura_();
    var recuperacao = null;
    var trava = LockService.getScriptLock();
    if (trava.tryLock(10000)) {
      try {
        garantirEstrutura_(ss);
        recuperacao = recuperarGravacao_(ss);
      } finally {
        trava.releaseLock();
      }
    } else {
      garantirEstrutura_(ss);
    }
    var p = validarPacote_(pacote);
    // Sem a trava, outra importação pode terminar no meio da leitura:
    // lerVersaoConsistente_ repete a leitura com o manifesto novo.
    var base = lerVersaoConsistente_(ss, function (m) { return { base: lerBase_(ss, m) }; }).base;
    var plano = planejarImportacao_(p, base, new Date());
    var previa = montarPrevia_(plano, p);
    previa.operacao = Utilities.getUuid();
    previa.revisao = prepararRevisaoPaginada_(plano, previa.operacao, usuario.email);
    if (previa.revisao.necessaria && !previa.revisao.disponivel) {
      previa.podeGravar = false;
      previa.bloqueios = previa.bloqueios.concat(['Não foi possível preparar a lista de valores a revisar. Nada foi gravado. Gere a prévia de novo.']);
    }
    previa.impressao = impressaoParaCliente_(base);
    previa.recuperacao = recuperacao && (recuperacao.descartada || recuperacao.arrumada || recuperacao.pendencias.length) ? recuperacao : null;
    return previa;
  });
}

/**
 * PÚBLICA. Segunda etapa: grava a importação mostrada na prévia.
 * Refaz validação e plano do zero (o navegador não é confiável), sob
 * trava de 30 s. A gravação segue Gravacao.gs (preparação em cópias,
 * ativação por uma única escrita, recuperação).
 *
 * Recusas (nada é gravado):
 *   BLOQUEADA             a prévia tinha bloqueios;
 *   PREVIA_DESATUALIZADA  o pacote, a base ou as células mantidas pelo
 *                         sistema mudaram desde a prévia (inclusive por
 *                         edição manual);
 *   REVISAO_PENDENTE      PDF lido por OCR com valores exclusivos do PDF
 *                         a gravar, sem a confirmação da revisão humana;
 *   EDICAO_DURANTE_GRAVACAO / NAO_GRAVADA   falha antes da ativação;
 *   OCUPADO               outra gravação em curso.
 * Resultado incerto: RESULTADO_INCERTO (usar verificarImportacao).
 *
 * @param {Object} pacote      o mesmo pacote enviado à prévia.
 * @param {string} assinatura  a assinatura devolvida pela prévia.
 * @param {Object} [opcoes]    { operacao (da prévia), revisaoPdf: true,
 *   previa: { versaoBase, abas } (só para explicar a recusa) }.
 * @return {{ok: boolean, dados: Object}}  dados = resultado (ver
 *   gravarImportacao_), ou { jaGravada: true, … } se esta operação já
 *   tinha sido concluída.
 */
function confirmarImportacao(pacote, assinatura, opcoes) {
  return executarComSeguranca_('confirmarImportacao', function () {
    var usuario = exigirAdmin_();
    opcoes = opcoes && typeof opcoes === 'object' ? opcoes : {};
    var op = String(opcoes.operacao || '');
    if (op && !/^[0-9a-fA-F-]{8,64}$/.test(op)) throw erroAmigavel_('PACOTE_INVALIDO', 'Identificador de importação inválido. Gere a prévia de novo.');
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(30000)) {
      throw erroAmigavel_('OCUPADO', 'Outra importação está sendo gravada agora. Aguarde um minuto e tente de novo.');
    }
    try {
      var ss = abrirPlanilhaEstrutura_();
      garantirEstrutura_(ss);
      recuperarGravacao_(ss);
      // (1.8.5) Um salvamento de disciplina pendente (1.8.7: e uma ação em
      // lote pendente) é concluído antes de trocar a aba Disciplinas em uso
      // (senão a importação é recusada).
      // (1.8.6) Se concluiu um, o que ficou gravado vai na recusa (dados.recuperado);
      // depois de uma importação gravada o painel é recarregado inteiro.
      // (1.8.7) O mesmo para uma ação em lote pendente (dados.recuperadoLote).
      var rec = { recuperado: null, recuperadoLote: null };
      try {
        exigirSemPendencias_(ss, rec);
        return confirmarImportacaoTravada_(ss, pacote, assinatura, opcoes, op, usuario);
      } catch (e) {
        if (rec.recuperado || rec.recuperadoLote) throw comRecuperado_(ss, 'confirmarImportacao', e, rec);
        throw e;
      }
    } finally {
      trava.releaseLock();
    }
  });
}

/** Parte de confirmarImportacao feita com a trava e sem salvamento pendente (1.8.6: separada, sem mudança de regra). */
function confirmarImportacaoTravada_(ss, pacote, assinatura, opcoes, op, usuario) {
  var m = lerManifesto_(ss);
  var ja = confirmadaPorOperacao_(m, op);
  if (ja) {
    var sit = situacaoGravacao_(ss, m);
    return { jaGravada: true, id: ja.id, dataHora: ja.em, concluida: true, pendencias: sit.arrumacaoPendente ? ['nomes e ordem das abas'] : [], avisos: [], planilhaDesatualizada: sit.planilhaDesatualizada, abasDivergentes: sit.abasDivergentes, resumo: 'Esta importação já tinha sido gravada (' + ja.em + '). Nada foi repetido.' };
  }
  if (!op) op = Utilities.getUuid();
  var p = validarPacote_(pacote);
  var base = lerBase_(ss, m);
  var plano = planejarImportacao_(p, base, new Date());
  if (plano.bloqueios.length) {
    throw erroAmigavel_('BLOQUEADA', 'A importação não pode ser gravada: ' + plano.bloqueios[0]);
  }
  if (String(assinatura || '') !== plano.assinatura) {
    throw erroAmigavel_('PREVIA_DESATUALIZADA', motivoPreviaDesatualizada_(opcoes.previa, base));
  }
  if (plano.revisao.necessaria) {
    if (opcoes.revisaoPdf !== true) {
      throw erroAmigavel_('REVISAO_PENDENTE', 'Esta importação grava valores que só existem no PDF lido por OCR (extensão, versões ou informações dos currículos). Confira-os na prévia e marque a confirmação da revisão antes de gravar.');
    }
    // A caixa marcada só vale se TODAS as páginas da lista foram
    // entregues a esta pessoa, nesta operação (REVISAO_INCOMPLETA).
    conferirRevisaoCompleta_(op, usuario.email, plano);
  }
  return gravarImportacao_(ss, plano, p, usuario, base, m, op);
}

/** Impressão da base que vai ao navegador (só hashes e versão: usada para explicar uma recusa). */
function impressaoParaCliente_(base) {
  var abas = {};
  abasDados_().forEach(function (n) { abas[n] = base.impressao.abas[n].sistema; });
  return { versaoBase: base.versao, abas: abas };
}

/** Texto da recusa PREVIA_DESATUALIZADA, dizendo o que mudou quando possível. */
function motivoPreviaDesatualizada_(previa, base) {
  var inicio = 'A prévia não vale mais: ';
  var fim = ' Nada foi gravado. Gere a prévia de novo e confira antes de gravar.';
  if (previa && typeof previa === 'object') {
    if (typeof previa.versaoBase === 'number' && previa.versaoBase !== base.versao) {
      return inicio + 'outra importação foi concluída depois dela.' + fim;
    }
    var abas = previa.abas && typeof previa.abas === 'object' ? previa.abas : null;
    if (abas) {
      var mudaram = abasDados_().filter(function (n) { return abas[n] !== base.impressao.abas[n].sistema; });
      if (mudaram.length) return inicio + 'a planilha foi editada à mão depois dela (células mantidas pelo sistema na aba ' + mudaram.join(', ') + ').' + fim;
    }
  }
  return inicio + 'o arquivo, a base ou a planilha mudaram depois dela.' + fim;
}

/*---------------------------------------------------------------------
  1. Validação do pacote
---------------------------------------------------------------------*/

/**
 * Confere tipo, formato e limites de cada campo e devolve um pacote
 * "limpo". Erros de estrutura interrompem com mensagem amigável.
 *
 * O que é conferido (nada do navegador é aceito sem conferência):
 *   - versaoPacote = 1 e formato csv/pdf;
 *   - curso com 5 dígitos; currículos com 12 dígitos do mesmo curso;
 *   - códigos de disciplina no padrão do Júpiter (AAA9999 ou 9999999);
 *   - números inteiros dentro de faixas plausíveis (créditos 0–99, CH 0–9999…);
 *   - toda oferta aponta para currículo e disciplina do próprio pacote;
 *   - todo requisito pertence a uma disciplina ofertada no currículo;
 *   - textos sem caracteres de controle e com tamanho limitado.
 * Avisos de nível "erro" produzidos pelo leitor viram bloqueios.
 * Campos desconhecidos são descartados.
 *
 * @param {Object} bruto  pacote como chegou do navegador.
 * @return {Object}  pacote limpo: { origem, curso, curriculos, disciplinas,
 *   vinculos, requisitos, errosDoArquivo, avisosDoArquivo, conferencia }.
 */
function validarPacote_(bruto) {
  if (!bruto || typeof bruto !== 'object') {
    throw erroAmigavel_('PACOTE_INVALIDO', 'Os dados do arquivo não chegaram ao servidor. Tente importar de novo.');
  }
  if (bruto.versaoPacote !== 1) {
    throw erroAmigavel_('PACOTE_VERSAO', 'O painel aberto está desatualizado. Recarregue a página e importe o arquivo de novo.');
  }
  // Auxiliares locais: acumulam até 12 erros (as 5 primeiras mensagens
  // vão para a tela) em vez de parar no primeiro problema.
  var erros = [];
  function erro(msg) { if (erros.length < 12) erros.push(msg); }
  // Lista obrigatória e com tamanho máximo; inválida → [] (e erro).
  function lista(v, nome, limite) {
    if (!Array.isArray(v)) { erro('Lista "' + nome + '" ausente.'); return []; }
    if (v.length > limite) { erro('Lista "' + nome + '" grande demais.'); return []; }
    return v;
  }
  // Inteiro entre min e max; null/undefined só se aceitaNulo. Inválido → null (e erro).
  function inteiro(v, min, max, rotulo, aceitaNulo) {
    if (v === null || v === undefined) { if (!aceitaNulo) erro(rotulo + ': valor ausente.'); return null; }
    if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < min || v > max) { erro(rotulo + ': valor inválido.'); return null; }
    return v;
  }
  // Decimal ≥ 0 (percentuais), arredondado a 2 casas; ausente → null.
  function decimal(v, rotulo) {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100000) { erro(rotulo + ': valor inválido.'); return null; }
    return Math.round(v * 100) / 100;
  }
  // Código de disciplina do Júpiter: 3 letras + 4 dígitos (PSA1302) ou 7 dígitos (4702893).
  var RE_CODIGO = /^(?:[A-Z]{3}\d{4}|\d{7})$/;

  var o = bruto.origem || {};
  var formato = o.formato === 'csv' || o.formato === 'pdf' ? o.formato : null;
  if (!formato) throw erroAmigavel_('PACOTE_INVALIDO', 'Formato de arquivo não reconhecido.');
  var p = {
    origem: {
      formato: formato,
      leitura: formato === 'csv' ? 'csv' : (o.leitura === 'ocr' ? 'ocr' : 'texto'),
      arquivo: limparTexto_(o.arquivo, 200) || '(sem nome)',
      tamanhoBytes: typeof o.tamanhoBytes === 'number' ? o.tamanhoBytes : null,
      geradoEm: typeof o.geradoEm === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(o.geradoEm) ? o.geradoEm : null
    },
    curso: null,
    curriculos: [],
    disciplinas: [],
    vinculos: [],
    requisitos: [],
    errosDoArquivo: [],
    avisosDoArquivo: [],
    resumoLeitura: null,
    conferencia: null
  };

  // Curso
  var cu = bruto.curso || {};
  var codCurso = String(cu.codigo || '');
  if (!/^\d{5}$/.test(codCurso)) erro('Código do curso inválido.');
  p.curso = { codigo: codCurso, nome: limparTexto_(cu.nome, 120) || '' };

  // Currículos
  var curriculos = {};
  lista(bruto.curriculos, 'curriculos', LIMITES_PACOTE.curriculos).forEach(function (c, i) {
    c = c || {};
    var codigo = String(c.codigo || '');
    if (!/^\d{12}$/.test(codigo)) { erro('Currículo ' + (i + 1) + ': número inválido.'); return; }
    if (codigo.slice(0, 5) !== codCurso) erro('Currículo ' + codigo + ' não pertence ao curso ' + codCurso + '.');
    if (curriculos[codigo]) { erro('Currículo ' + codigo + ' repetido.'); return; }
    var hab = String(parseInt(codigo.slice(5, 9), 10));
    var limpo = {
      codigo: codigo,
      habilitacao: hab,
      habilitacaoNome: limparTexto_(c.habilitacaoNome, 120) || null,
      ano: 2000 + parseInt(codigo.slice(9, 11), 10),
      semestre: parseInt(codigo.slice(11, 12), 10),
      situacao: limparTexto_(c.situacao, 40) || null,
      aacHoras: c.aacHoras == null ? null : inteiro(c.aacHoras, 0, 100000, 'AAC do currículo ' + codigo, true),
      aacPercentual: decimal(c.aacPercentual, 'AAC (%) do currículo ' + codigo),
      info: null
    };
    if (c.info && typeof c.info === 'object') limpo.info = validarInfoCurriculo_(c.info, codigo, erro);
    curriculos[codigo] = limpo;
    p.curriculos.push(limpo);
  });
  if (!p.curriculos.length) erro('O arquivo não tem nenhum currículo.');

  // Disciplinas
  var disciplinas = {};
  var CHAVES_NAO_CONFIRMADAS = ['creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'ext', 'atpa', 'versao', 'codigo'];
  lista(bruto.disciplinas, 'disciplinas', LIMITES_PACOTE.disciplinas).forEach(function (d, i) {
    d = d || {};
    var codigo = String(d.codigo || '').toUpperCase();
    if (!RE_CODIGO.test(codigo)) { erro('Disciplina ' + (i + 1) + ': código inválido.'); return; }
    if (disciplinas[codigo]) { erro('Disciplina ' + codigo + ' repetida.'); return; }
    var naoConf = Array.isArray(d.naoConfirmados) ? d.naoConfirmados.filter(function (k) { return CHAVES_NAO_CONFIRMADAS.indexOf(k) >= 0; }) : [];
    var nome = limparTexto_(d.nome, 300);
    var limpo = {
      codigo: codigo,
      nome: nome || null,
      nomePodeEstarCortado: d.nomePodeEstarCortado === true,
      versao: inteiro(d.versao, 1, 999, codigo + ' (versão)', true),
      versaoOrigem: d.versaoOrigem === 'pdf' || d.versaoOrigem === 'csv-requisito' ? d.versaoOrigem : null,
      creditosAula: inteiro(d.creditosAula, 0, 99, codigo + ' (créditos-aula)', true),
      creditosTrabalho: inteiro(d.creditosTrabalho, 0, 99, codigo + ' (créditos-trabalho)', true),
      ch: inteiro(d.ch, 0, 9999, codigo + ' (CH)', true),
      ce: inteiro(d.ce, 0, 9999, codigo + ' (CE)', true),
      cp: inteiro(d.cp, 0, 9999, codigo + ' (CP)', true),
      ext: inteiro(d.ext, 0, 9999, codigo + ' (EXT)', true),
      atpa: inteiro(d.atpa, 0, 9999, codigo + ' (ATPA)', true),
      naoConfirmados: naoConf,
      // Páginas do PDF em que a disciplina foi lida (referência para a revisão humana).
      paginas: Array.isArray(d.paginas) ? d.paginas.filter(function (n) { return typeof n === 'number' && n >= 1 && n <= 5000 && Math.floor(n) === n; }).slice(0, 20) : []
    };
    if (limpo.versao == null) limpo.versaoOrigem = null;
    disciplinas[codigo] = limpo;
    p.disciplinas.push(limpo);
  });

  // Vínculos (disciplina × currículo)
  var vinculos = {};
  lista(bruto.vinculos, 'vinculos', LIMITES_PACOTE.vinculos).forEach(function (v) {
    v = v || {};
    var cur = String(v.curriculo || ''), cod = String(v.disciplina || '').toUpperCase();
    if (!curriculos[cur]) { erro('Oferta com currículo desconhecido (' + cur + ').'); return; }
    if (!disciplinas[cod]) { erro('Oferta com disciplina desconhecida (' + cod + ').'); return; }
    if (!ROTULO_TIPO[v.tipo]) { erro(cod + ': tipo inválido.'); return; }
    var chave = cur + '|' + cod;
    if (vinculos[chave]) { erro(cod + ' repetida no currículo ' + cur + '.'); return; }
    var periodo = v.periodoIdeal == null ? null : inteiro(v.periodoIdeal, 1, 20, cod + ' (período ideal)', true);
    vinculos[chave] = true;
    p.vinculos.push({ curriculo: cur, disciplina: cod, tipo: v.tipo, periodoIdeal: periodo, periodoConfirmado: v.periodoConfirmado !== false && periodo != null });
  });

  // Requisitos
  var requisitos = {};
  lista(bruto.requisitos, 'requisitos', LIMITES_PACOTE.requisitos).forEach(function (r) {
    r = r || {};
    var cur = String(r.curriculo || ''), cod = String(r.disciplina || '').toUpperCase(), req = String(r.requisito || '').toUpperCase();
    if (!vinculos[cur + '|' + cod]) { erro('Requisito de uma disciplina que não está no currículo (' + cod + ').'); return; }
    if (!RE_CODIGO.test(req)) { erro(cod + ': código de requisito inválido.'); return; }
    var chave = cur + '|' + cod + '|' + req;
    if (requisitos[chave]) return; // repetido: ignora
    requisitos[chave] = true;
    p.requisitos.push({
      curriculo: cur, disciplina: cod, requisito: req,
      versaoRequisito: inteiro(r.versaoRequisito, 1, 999, cod + ' → ' + req + ' (versão)', true),
      nomeRequisito: limparTexto_(r.nomeRequisito, 300) || null,
      tipoRequisito: limparTexto_(r.tipoRequisito, 60) || 'Requisito',
      grupo: r.grupo == null ? null : inteiro(r.grupo, 1, 99, cod + ' (grupo de requisito)', true)
    });
  });

  // Avisos produzidos pelo leitor do arquivo (erros bloqueiam).
  (Array.isArray(bruto.avisos) ? bruto.avisos : []).slice(0, 100).forEach(function (a) {
    if (!a) return;
    var msg = limparTexto_(a.mensagem, 500);
    if (!msg) return;
    if (a.nivel === 'erro') p.errosDoArquivo.push(msg);
    else p.avisosDoArquivo.push({ nivel: a.nivel === 'info' ? 'info' : 'aviso', mensagem: msg, detalhe: limparTexto_(a.detalhe, 1500) || '' });
  });

  // Contagens da leitura (só números) — vão para o registro.
  var c = bruto.conferencia;
  if (c && typeof c === 'object') {
    p.conferencia = {};
    ['paginas', 'linhasDisciplina', 'numerosLidos', 'numerosCorrigidos', 'numerosAConferir', 'subtotais', 'subtotaisConferem', 'totaisSecao', 'totaisSecaoConferem'].forEach(function (k) {
      if (typeof c[k] === 'number' && isFinite(c[k])) p.conferencia[k] = c[k];
    });
  }

  if (erros.length) {
    throw erroAmigavel_('PACOTE_INVALIDO', 'O conteúdo lido do arquivo tem problemas e não pode ser importado: ' + erros.slice(0, 5).join(' '));
  }
  return p;
}

/**
 * Valida as "Informações Básicas do Currículo" (só o PDF traz): cargas
 * horárias e durações como inteiros ≥ 0, percentual de extensão entre
 * 0 e 100, datas dd/mm/aaaa e o texto descritivo (até 30 mil caracteres).
 * @param {Object} info     bloco info do currículo, vindo do navegador.
 * @param {string} codigo   número do currículo (só para as mensagens).
 * @param {function(string)} erro  acumulador de erros de validarPacote_.
 * @return {Object}  cópia limpa (valor inválido vira null).
 */
function validarInfoCurriculo_(info, codigo, erro) {
  var numeros = ['duracaoIdeal', 'duracaoMinima', 'duracaoMaxima', 'chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria',
    'chAulaEletiva', 'chTrabalhoEletiva', 'chEletiva', 'chAulaLivre', 'chTrabalhoLivre', 'chLivre', 'chDisciplinas',
    'estagio', 'aac', 'aexApolo', 'extensaoOptativas', 'chDisciplinasMaisAac', 'extensaoTotal', 'totalGeral'];
  var limpo = {};
  numeros.forEach(function (k) {
    var v = info[k];
    if (v === null || v === undefined) { limpo[k] = null; return; }
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100000 || Math.floor(v) !== v) { erro('Informações do currículo ' + codigo + ': "' + k + '" inválido.'); limpo[k] = null; return; }
    limpo[k] = v;
  });
  var pct = info.extensaoPercentual;
  limpo.extensaoPercentual = typeof pct === 'number' && isFinite(pct) && pct >= 0 && pct <= 100 ? Math.round(pct * 100) / 100 : null;
  ['dataAtivacao', 'dataDesativacao'].forEach(function (k) {
    var v = info[k];
    limpo[k] = typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v : null;
  });
  limpo.informacoesEspecificas = limparTextoLongo_(info.informacoesEspecificas, 30000) || null;
  limpo.pagina = typeof info.pagina === 'number' && info.pagina >= 1 && info.pagina <= 5000 && Math.floor(info.pagina) === info.pagina ? info.pagina : null;
  // "conferido"/"avisosConferencia" do navegador são descartados: o
  // servidor refaz as contas (conferirInfoCurriculo_).
  return limpo;
}

/*---------------------------------------------------------------------
  2. Leitura da base atual
---------------------------------------------------------------------*/

/**
 * Lê a base gravada na planilha (abas Disciplinas, Disciplinas por
 * habilitação, Requisitos e Currículos).
 * Lê as abas EM USO segundo o manifesto m (lido aqui se não for dado).
 * Colunas extras de todas as abas vêm em "_extras" (preservadas na
 * gravação); "impressao" = hashes das colunas do sistema e das manuais.
 * @return {{versao: number, impressao: Object,
 *   disciplinas: Object<string, Object>,   // por código (maiúsculo)
 *   vinculos: {curriculo, codigo, tipo, periodoIdeal}[],
 *   requisitos: {curriculo, codigo, requisito, versaoRequisito, nomeRequisito, tipoRequisito, grupo}[],
 *   curriculos: Object<string, Object>}}   // por número do currículo
 */
function lerBase_(ss, m) {
  if (m === undefined) m = lerManifesto_(ss);
  var base = {
    versao: m ? (m.versaoBase || 0) : versaoDaBase_(ss),
    disciplinas: {},
    vinculos: [],
    requisitos: [],
    curriculos: {},
    impressao: null
  };
  var lidas = {};
  abasDados_().forEach(function (nome) { lidas[nome] = lerAba_(ss, nome, m).linhas; });
  lidas[ABAS.DISCIPLINAS].forEach(function (d) {
    if (d.codigo) base.disciplinas[String(d.codigo).toUpperCase()] = d;
  });
  lidas[ABAS.OFERTA].forEach(function (v) {
    if (!v.curriculo || !v.codigo) return;
    base.vinculos.push({ curriculo: v.curriculo, codigo: String(v.codigo).toUpperCase(), tipo: tipoDoRotulo_(v.tipo), periodoIdeal: v.periodoIdeal, _extras: v._extras });
  });
  lidas[ABAS.REQUISITOS].forEach(function (r) {
    if (!r.curriculo || !r.codigo || !r.requisito) return;
    base.requisitos.push({
      curriculo: r.curriculo, codigo: String(r.codigo).toUpperCase(), requisito: String(r.requisito).toUpperCase(),
      versaoRequisito: r.versaoRequisito, nomeRequisito: r.nomeRequisito, tipoRequisito: r.tipoRequisito, grupo: r.grupo, _extras: r._extras
    });
  });
  lidas[ABAS.CURRICULOS].forEach(function (c) {
    if (c.curriculo) base.curriculos[c.curriculo] = c;
  });
  // Impressão digital do que foi lido: entra na assinatura da prévia e
  // é conferida de novo antes da ativação (Gravacao.gs).
  var porAba = {};
  abasDados_().forEach(function (nome) { porAba[nome] = impressaoDeLinhas_(nome, lidas[nome]); });
  base.impressao = juntarImpressoes_(porAba);
  return base;
}

/*---------------------------------------------------------------------
  3. Plano: estado final + mudanças + bloqueios
---------------------------------------------------------------------*/

/**
 * Coração da importação: calcula, sem gravar nada, como a base ficará
 * depois de aplicar o pacote, o que mudou e se algo impede a gravação.
 * A prévia e a gravação usam exatamente este mesmo cálculo.
 *
 * Etapas (numeradas no código): 3.1 um curso por base; 3.2 currículo
 * em uso por habilitação; 3.3 modo de cada currículo (completo ou
 * complemento; estrutura mais antiga é bloqueada); 3.4 OCR em gravação
 * completa exige números confirmados; 3.5 cópia da base; 3.6 oferta e
 * requisitos (troca as habilitações gravadas por completo; no
 * complemento só marca grupos "ou" e registra divergências); 3.7
 * disciplinas (campos, versão, EXT, divergências); 3.8 currículos;
 * 3.9 situação (na/fora da estrutura); 3.10 mudanças de oferta e
 * requisitos; 3.11 campos derivados; 3.12 avisos e assinatura.
 *
 * @param {Object} p     pacote limpo (validarPacote_).
 * @param {Object} base  base atual (lerBase_).
 * @param {Date} agora   data/hora da operação (gravada nas linhas).
 * @return {Object} plano: { agora, bloqueios[], avisos[], curriculos[]
 *   (codigo, habilitacao, nome, cadastradoEm, modo, substitui),
 *   primeiraCarga, mudancas {novas, alteradas, sairam, voltaram, ofertas,
 *   requisitos, divergencias}, complementos {versoes, ext, gruposOu,
 *   infoCurriculos}, final {disciplinas, vinculos, requisitos,
 *   curriculos}, assinatura }.
 *   A assinatura é o SHA-256 do pacote limpo + versão da base: muda se
 *   qualquer um dos dois mudar.
 */
function planejarImportacao_(p, base, agora) {
  var plano = {
    agora: agora,
    bloqueios: p.errosDoArquivo.slice(),
    avisos: [],
    curriculos: [],
    primeiraCarga: Object.keys(base.disciplinas).length === 0,
    mudancas: { novas: [], alteradas: [], sairam: [], voltaram: [], ofertas: [], requisitos: [], divergencias: [] },
    complementos: { versoes: 0, ext: 0, gruposOu: 0, infoCurriculos: 0 },
    // Informações Básicas do PDF conferidas no servidor (uma por currículo).
    infoConferencia: [],
    // Valores exclusivos do PDF que serão gravados (revisão humana).
    revisao: { necessaria: false, itens: [] },
    // Concordância do PDF com a base (CSV) nos campos que os dois têm.
    concordancia: { campos: 0, camposIguais: 0, ofertas: 0, ofertasIguais: 0 },
    final: { disciplinas: {}, vinculos: [], requisitos: [], curriculos: {} }
  };
  var final = plano.final;
  var nomeCurso = p.curso.nome;

  // 3.1 Um curso por base.
  var cursosBase = {};
  Object.keys(base.curriculos).forEach(function (k) { cursosBase[k.slice(0, 5)] = true; });
  var outros = Object.keys(cursosBase).filter(function (k) { return k !== p.curso.codigo; });
  if (outros.length) plano.bloqueios.push('A base guarda o curso ' + outros.join(', ') + ' e o arquivo é do curso ' + p.curso.codigo + '. Use uma planilha por curso.');

  // 3.2 Currículo atual de cada habilitação na base.
  var atualPorHab = {};
  Object.keys(base.curriculos).forEach(function (k) {
    var c = base.curriculos[k];
    if (/^sim/i.test(String(c.vigente || ''))) atualPorHab[String(parseInt(k.slice(5, 9), 10))] = k;
  });
  var curriculosComOferta = {};
  base.vinculos.forEach(function (v) { curriculosComOferta[v.curriculo] = true; });

  // 3.3 Modo de gravação de cada currículo do arquivo.
  var modo = {};
  p.curriculos.forEach(function (c) {
    var atual = atualPorHab[c.habilitacao] || null;
    var info = {
      codigo: c.codigo, habilitacao: c.habilitacao,
      nome: nomeCurtoHabilitacao_(c.habilitacaoNome || (base.curriculos[c.codigo] && base.curriculos[c.codigo].habilitacao) || (atual && base.curriculos[atual].habilitacao), nomeCurso, c.habilitacao),
      cadastradoEm: c.ano + '/' + c.semestre,
      modo: 'completo', substitui: null
    };
    if (atual && atual !== c.codigo) {
      if (parseInt(c.codigo.slice(9), 10) < parseInt(atual.slice(9), 10)) {
        plano.bloqueios.push('O arquivo traz a estrutura de ' + info.cadastradoEm + ' da habilitação ' + info.nome + ', mais antiga que a da base (' + (2000 + parseInt(atual.slice(9, 11), 10)) + '/' + atual.slice(11) + '). Importar uma estrutura mais antiga não é permitido.');
      } else {
        info.substitui = atual;
      }
    }
    if (p.origem.formato === 'pdf' && atual === c.codigo && curriculosComOferta[c.codigo]) info.modo = 'complemento';
    modo[c.codigo] = info.modo;
    plano.curriculos.push(info);
  });
  var habCompleta = {};
  plano.curriculos.forEach(function (c) { if (c.modo === 'completo') habCompleta[c.habilitacao] = c.codigo; });
  // Código da habilitação contido no currículo: dígitos 6–9 sem zeros à esquerda ("0100" → "100").
  function habDe(curriculo) { return String(parseInt(String(curriculo).slice(5, 9), 10)); }

  // 3.4 OCR em gravação completa: exige números confirmados.
  var discPacote = {};
  p.disciplinas.forEach(function (d) { discPacote[d.codigo] = d; });
  if (p.origem.leitura === 'ocr') {
    var faltas = {};
    p.vinculos.forEach(function (v) {
      if (modo[v.curriculo] !== 'completo') return;
      var d = discPacote[v.disciplina];
      var campos = d.naoConfirmados.filter(function (k) { return CAMPOS_NUMERICOS_COMPARTILHADOS.indexOf(k) >= 0; });
      if (!v.periodoConfirmado) campos.push('período ideal');
      if (campos.length) faltas[v.disciplina] = true;
    });
    var lista = Object.keys(faltas);
    if (lista.length) {
      plano.bloqueios.push('A leitura por OCR não confirmou todos os números de ' + lista.length + ' disciplina(s) que ainda não estão na base (' + lista.slice(0, 8).join(', ') + (lista.length > 8 ? '…' : '') + '). Importe primeiro o CSV da estrutura; depois o PDF completa a base.');
    }
  }

  // 3.5 Ponto de partida: cópia da base.
  Object.keys(base.disciplinas).forEach(function (k) { final.disciplinas[k] = copiar_(base.disciplinas[k]); });
  Object.keys(base.curriculos).forEach(function (k) { final.curriculos[k] = copiar_(base.curriculos[k]); });

  // 3.6 Oferta e requisitos: troca as habilitações gravadas por completo.
  // Colunas extras (criadas por alguém) acompanham a linha pela chave.
  var extrasOferta = {}, extrasReq = {};
  base.vinculos.forEach(function (v) { if (v._extras) extrasOferta[v.curriculo + '|' + v.codigo] = v._extras; });
  base.requisitos.forEach(function (r) { if (r._extras) extrasReq[r.curriculo + '|' + r.codigo + '|' + r.requisito] = r._extras; });
  final.vinculos = base.vinculos.filter(function (v) { return !habCompleta[habDe(v.curriculo)]; }).map(copiar_);
  p.vinculos.forEach(function (v) {
    if (modo[v.curriculo] === 'completo') final.vinculos.push({ curriculo: v.curriculo, codigo: v.disciplina, tipo: v.tipo, periodoIdeal: v.periodoIdeal, _extras: extrasOferta[v.curriculo + '|' + v.disciplina] || {} });
  });

  var grupoAnterior = {};
  base.requisitos.forEach(function (r) { if (r.grupo != null) grupoAnterior[r.curriculo + '|' + r.codigo + '|' + r.requisito] = r.grupo; });
  final.requisitos = base.requisitos.filter(function (r) { return !habCompleta[habDe(r.curriculo)]; }).map(copiar_);
  p.requisitos.forEach(function (r) {
    if (modo[r.curriculo] !== 'completo') return;
    var chave = r.curriculo + '|' + r.disciplina + '|' + r.requisito;
    // CSV depois do PDF: mantém o grupo ("ou") que o PDF informou.
    var grupo = r.grupo != null ? r.grupo : (grupoAnterior[chave] != null ? grupoAnterior[chave] : null);
    final.requisitos.push({
      curriculo: r.curriculo, codigo: r.disciplina, requisito: r.requisito, versaoRequisito: r.versaoRequisito,
      nomeRequisito: r.nomeRequisito, tipoRequisito: r.tipoRequisito, grupo: grupo, _extras: extrasReq[chave] || {}
    });
  });

  // Complemento: grupos "ou" e tipo do requisito nos requisitos já gravados.
  var reqFinalPorChave = {};
  final.requisitos.forEach(function (r) { reqFinalPorChave[r.curriculo + '|' + r.codigo + '|' + r.requisito] = r; });
  var gruposMarcados = {};
  p.requisitos.forEach(function (r) {
    if (modo[r.curriculo] !== 'complemento') return;
    var alvo = reqFinalPorChave[r.curriculo + '|' + r.disciplina + '|' + r.requisito];
    if (!alvo) {
      plano.mudancas.divergencias.push({ codigo: r.disciplina, nome: nomeDe_(final, discPacote, r.disciplina), campo: 'Requisito ' + r.requisito, base: 'não consta', arquivo: 'consta no PDF', habilitacao: nomeHab_(plano, r.curriculo) });
      return;
    }
    if (r.grupo != null && alvo.grupo !== r.grupo) { alvo.grupo = r.grupo; gruposMarcados[r.curriculo + '|' + r.disciplina] = true; }
    if (/fraco/i.test(r.tipoRequisito) && !/fraco/i.test(alvo.tipoRequisito || '')) alvo.tipoRequisito = r.tipoRequisito;
  });
  // requisitos da base que o PDF não mostra (complemento)
  var reqPacote = {};
  p.requisitos.forEach(function (r) { reqPacote[r.curriculo + '|' + r.disciplina + '|' + r.requisito] = true; });
  final.requisitos.forEach(function (r) {
    if (modo[r.curriculo] === 'complemento' && !reqPacote[r.curriculo + '|' + r.codigo + '|' + r.requisito]) {
      plano.mudancas.divergencias.push({ codigo: r.codigo, nome: nomeDe_(final, discPacote, r.codigo), campo: 'Requisito ' + r.requisito, base: 'consta', arquivo: 'não consta no PDF', habilitacao: nomeHab_(plano, r.curriculo) });
    }
  });
  plano.complementos.gruposOu = Object.keys(gruposMarcados).length;

  // Complemento: oferta (tipo/período) só é conferida.
  var ofertaFinal = {};
  final.vinculos.forEach(function (v) { ofertaFinal[v.curriculo + '|' + v.codigo] = v; });
  p.vinculos.forEach(function (v) {
    if (modo[v.curriculo] !== 'complemento') return;
    var b = ofertaFinal[v.curriculo + '|' + v.disciplina];
    if (!b) {
      plano.mudancas.divergencias.push({ codigo: v.disciplina, nome: nomeDe_(final, discPacote, v.disciplina), campo: 'Oferta', base: 'não consta', arquivo: ROTULO_TIPO[v.tipo] + (v.periodoIdeal ? ', ' + v.periodoIdeal + 'º período' : ''), habilitacao: nomeHab_(plano, v.curriculo) });
      return;
    }
    plano.concordancia.ofertas++;
    if (b.tipo === v.tipo && (!v.periodoConfirmado || b.periodoIdeal === v.periodoIdeal)) plano.concordancia.ofertasIguais++;
    if (b.tipo !== v.tipo || (v.periodoConfirmado && b.periodoIdeal !== v.periodoIdeal)) {
      plano.mudancas.divergencias.push({ codigo: v.disciplina, nome: nomeDe_(final, discPacote, v.disciplina), campo: 'Tipo e período', base: descreverOferta_(b), arquivo: descreverOferta_({ tipo: v.tipo, periodoIdeal: v.periodoIdeal }), habilitacao: nomeHab_(plano, v.curriculo) });
    }
  });

  // 3.7 Disciplinas.
  var emCompleto = {}, emComplemento = {};
  p.vinculos.forEach(function (v) { (modo[v.curriculo] === 'completo' ? emCompleto : emComplemento)[v.disciplina] = true; });
  var alteradasPorCodigo = {};

  p.disciplinas.forEach(function (d) {
    var atual = final.disciplinas[d.codigo];
    var nova = !atual;
    if (nova && !emCompleto[d.codigo]) {
      if (emComplemento[d.codigo]) plano.mudancas.divergencias.push({ codigo: d.codigo, nome: d.nome || '', campo: 'Disciplina', base: 'não consta', arquivo: 'consta no PDF' });
      return;
    }
    if (nova) {
      atual = final.disciplinas[d.codigo] = { codigo: d.codigo, _extras: {}, incluidaEm: agora, alteradaEm: agora };
      plano.mudancas.novas.push({ codigo: d.codigo, nome: d.nome || '' });
    }
    var mudou = [];
    CAMPOS_COMPARTILHADOS.forEach(function (campo) {
      var v = d[campo];
      if (v === null || v === undefined || d.naoConfirmados.indexOf(campo) >= 0) return;
      var antes = atual[campo] === undefined ? null : atual[campo];
      if (campo === 'nome' && p.origem.formato === 'pdf' && antes) {
        // Nome do PDF por OCR não é comparado: pequenos erros de leitura
        // (I/l, acentos) virariam "divergências" sem significado.
        if (p.origem.leitura !== 'ocr' && !ehPrefixoDe_(v, antes)) plano.mudancas.divergencias.push({ codigo: d.codigo, nome: antes, campo: 'Nome', base: antes, arquivo: v });
        return;
      }
      if (emCompleto[d.codigo] || nova) {
        if (!nova && antes !== null && antes !== v) mudou.push({ campo: campo, antes: antes, depois: v });
        atual[campo] = v;
      } else if (antes !== null && antes !== v) {
        plano.concordancia.campos++;
        plano.mudancas.divergencias.push({ codigo: d.codigo, nome: atual.nome || d.nome || '', campo: ROTULO_CAMPO[campo], base: antes, arquivo: v });
      } else if (antes === null) {
        atual[campo] = v;
      } else {
        // PDF (complemento) igual ao que o CSV gravou: concordância com a 2ª fonte.
        plano.concordancia.campos++;
        plano.concordancia.camposIguais++;
      }
    });
    // Versão e extensão (EXT): o que o PDF confirma conta como
    // "complemento", mesmo quando o valor já era o mesmo.
    CAMPOS_SO_PDF.forEach(function (campo) {
      var v = d[campo];
      if (v === null || v === undefined || d.naoConfirmados.indexOf(campo) >= 0) return;
      var antes = atual[campo] === undefined ? null : atual[campo];
      if (p.origem.formato === 'pdf') plano.complementos[campo === 'versao' ? 'versoes' : 'ext']++;
      if (campo === 'versao' && (d.versaoOrigem === 'pdf' || antes !== v)) {
        atual.versaoOrigem = d.versaoOrigem === 'pdf' ? 'PDF' : 'CSV (requisito)';
      }
      if (antes === v) return;
      if (!nova && antes !== null) mudou.push({ campo: campo, antes: antes, depois: v });
      atual[campo] = v;
      // Valor que só o PDF traz e vai ser gravado: entra na revisão humana.
      if (p.origem.formato === 'pdf') {
        plano.revisao.itens.push({ tipo: campo === 'ext' ? 'EXT' : 'Versão', codigo: d.codigo, nome: atual.nome || d.nome || '', campo: ROTULO_CAMPO[campo], valor: v, anterior: antes, paginas: d.paginas || [] });
      }
    });
    if (p.origem.formato === 'pdf' && (d.ext != null || d.versao != null)) atual.complementoPdfEm = agora;
    if (mudou.length) {
      atual.alteradaEm = agora;
      alteradasPorCodigo[d.codigo] = true;
      plano.mudancas.alteradas.push({ codigo: d.codigo, nome: atual.nome || '', campos: mudou.map(function (m) { return { campo: ROTULO_CAMPO[m.campo], antes: m.antes, depois: m.depois }; }) });
    }
  });

  // 3.8 Currículos.
  p.curriculos.forEach(function (c) {
    var info = plano.curriculos.filter(function (x) { return x.codigo === c.codigo; })[0];
    var linha = final.curriculos[c.codigo] || { curriculo: c.codigo, _extras: {} };
    final.curriculos[c.codigo] = linha;
    linha.curso = p.curso.codigo + ' - ' + nomeCurso;
    linha.habilitacaoCodigo = c.habilitacao;
    linha.habilitacao = info.nome;
    linha.cadastradoEm = info.cadastradoEm;
    if (c.situacao) linha.situacaoJupiter = c.situacao;
    linha.vigente = 'Sim';
    // AAC: o CSV traz a AAC na coluna H; o PDF só no quadro de
    // informações (validado abaixo, junto com o resto do quadro).
    if (p.origem.formato === 'csv') {
      if (c.aacHoras != null) linha.aacHoras = c.aacHoras;
      if (c.aacPercentual != null) linha.aacPercentual = c.aacPercentual;
    }
    if (c.info) aplicarInfoCurriculo_(plano, final, c, info, linha, agora, p);
    linha.atualizadoEm = agora;
    if (info.substitui && final.curriculos[info.substitui]) {
      final.curriculos[info.substitui].vigente = 'Não — substituído por ' + c.codigo + ' em ' + formatarData_(agora);
    }
  });

  // 3.9 Situação de cada disciplina (tem oferta em alguma habilitação?).
  var comOferta = {};
  final.vinculos.forEach(function (v) { comOferta[v.codigo] = true; });
  Object.keys(final.disciplinas).forEach(function (k) {
    var d = final.disciplinas[k];
    var nova = !base.disciplinas[k];
    var agoraSit = comOferta[k] ? SITUACAO.NA : SITUACAO.FORA;
    if (!nova && d.situacao && d.situacao !== agoraSit) {
      (agoraSit === SITUACAO.FORA ? plano.mudancas.sairam : plano.mudancas.voltaram).push({ codigo: k, nome: d.nome || '' });
      d.alteradaEm = agora;
    }
    d.situacao = agoraSit;
  });

  // 3.10 Mudanças de oferta e de requisitos nas habilitações regravadas.
  if (!plano.primeiraCarga) compararOfertaERequisitos_(plano, base, habCompleta, habDe);

  // 3.11 Campos derivados (departamento, resumo por habilitação...).
  completarDerivados_(plano, nomeCurso);

  // 3.12 Avisos do arquivo + assinatura da prévia.
  plano.avisos = p.avisosDoArquivo.slice();
  // Revisão humana obrigatória quando o PDF foi lido por OCR e há valores
  // sem segunda fonte a gravar (EXT, versão, informações dos currículos).
  plano.revisao.necessaria = p.origem.leitura === 'ocr' && plano.revisao.itens.length > 0;
  // Ordem fixa da lista (define as páginas): primeiro os valores que
  // pedem atenção, no fim os EXT = 0 que não mudam nada.
  plano.revisao.itens = ordenarRevisao_(plano.revisao.itens);
  if (plano.revisao.itens.length > MAX_ITENS_REVISAO) {
    plano.bloqueios.push('A lista de valores só do PDF a revisar tem ' + plano.revisao.itens.length + ' itens, acima da capacidade da revisão (' + MAX_ITENS_REVISAO + '). Nada foi gravado. Divida o relatório por habilitação no Júpiter e importe um PDF de cada vez.');
  }
  // A assinatura amarra a prévia ao pacote, à versão da base, às
  // células mantidas pelo sistema (edição manual invalida) e ao
  // resultado calculado (mudanças e decisões sobre o PDF).
  plano.assinatura = hashTexto_(JSON.stringify({
    p: p, versaoBase: base.versao, sistema: base.impressao ? base.impressao.sistema : null,
    mudancas: plano.mudancas, info: plano.infoConferencia, revisao: plano.revisao
  }));
  return plano;
}

/**
 * Etapa 3.10: nas habilitações regravadas por completo, compara oferta
 * (tipo e período) e requisitos antes × depois e preenche
 * plano.mudancas.ofertas e plano.mudancas.requisitos. A comparação é
 * por habilitação (não por currículo), para que uma estrutura nova da
 * mesma habilitação mostre só o que de fato mudou. Disciplinas novas
 * não entram (já aparecem em "novas").
 * @param {Object} plano         plano em construção.
 * @param {Object} base          base atual.
 * @param {Object} habCompleta   { códigoHabilitação: currículo } gravadas por completo.
 * @param {function(string): string} habDe  currículo → código da habilitação.
 */
function compararOfertaERequisitos_(plano, base, habCompleta, habDe) {
  var final = plano.final;
  // Ofertas das habilitações regravadas, por "habilitação|código".
  function porChave(lista) {
    var m = {};
    lista.forEach(function (v) { if (habCompleta[habDe(v.curriculo)]) m[habDe(v.curriculo) + '|' + v.codigo] = v; });
    return m;
  }
  var antes = porChave(base.vinculos), depois = porChave(final.vinculos);
  var novas = {};
  plano.mudancas.novas.forEach(function (n) { novas[n.codigo] = true; });
  var chaves = {};
  Object.keys(antes).concat(Object.keys(depois)).forEach(function (k) { chaves[k] = true; });
  Object.keys(chaves).sort().forEach(function (k) {
    var a = antes[k], d = depois[k];
    var codigo = k.split('|')[1];
    if (novas[codigo]) return; // disciplina nova: já listada
    var hab = nomeHabPorCodigo_(plano, k.split('|')[0]);
    var nome = (final.disciplinas[codigo] && final.disciplinas[codigo].nome) || '';
    if (a && !d) plano.mudancas.ofertas.push({ codigo: codigo, nome: nome, habilitacao: hab, tipo: 'Removida da habilitação', antes: descreverOferta_(a), depois: '—' });
    else if (!a && d) plano.mudancas.ofertas.push({ codigo: codigo, nome: nome, habilitacao: hab, tipo: 'Incluída na habilitação', antes: '—', depois: descreverOferta_(d) });
    else if (a.tipo !== d.tipo || a.periodoIdeal !== d.periodoIdeal) plano.mudancas.ofertas.push({ codigo: codigo, nome: nome, habilitacao: hab, tipo: 'Oferta alterada', antes: descreverOferta_(a), depois: descreverOferta_(d) });
  });

  // Requisitos das habilitações regravadas: "habilitação|código" → "A, B, C" (ordenados).
  function reqPorChave(lista) {
    var m = {};
    lista.forEach(function (r) {
      if (!habCompleta[habDe(r.curriculo)]) return;
      var k = habDe(r.curriculo) + '|' + r.codigo;
      (m[k] = m[k] || []).push(r.requisito);
    });
    Object.keys(m).forEach(function (k) { m[k] = m[k].sort().join(', '); });
    return m;
  }
  var ra = reqPorChave(base.requisitos), rd = reqPorChave(final.requisitos);
  var todas = {};
  Object.keys(ra).concat(Object.keys(rd)).forEach(function (k) { todas[k] = true; });
  Object.keys(todas).sort().forEach(function (k) {
    var codigo = k.split('|')[1];
    if (novas[codigo] || (ra[k] || '') === (rd[k] || '')) return;
    if (!depois[k] && !antes[k]) return;
    if (!depois[k]) return; // saiu da habilitação: já está em "ofertas"
    plano.mudancas.requisitos.push({ codigo: codigo, nome: (final.disciplinas[codigo] && final.disciplinas[codigo].nome) || '', habilitacao: nomeHabPorCodigo_(plano, k.split('|')[0]), antes: ra[k] || 'nenhum', depois: rd[k] || 'nenhum' });
  });
}

/**
 * Etapa 3.11. Preenche campos calculados das disciplinas (departamento,
 * prefixo, créditos totais, habilitações, resumo da oferta, semestre
 * ideal) e as contagens dos currículos em uso. Disciplina fora da
 * estrutura mantém o último resumo de habilitações/oferta que teve.
 */
function completarDerivados_(plano, nomeCurso) {
  var final = plano.final;
  var habPorCurriculo = {}, ordemHab = {};
  Object.keys(final.curriculos).forEach(function (k) {
    var c = final.curriculos[k];
    habPorCurriculo[k] = c.habilitacao || nomeCurtoHabilitacao_(null, nomeCurso, String(parseInt(k.slice(5, 9), 10)));
    ordemHab[k] = parseInt(k.slice(5, 9), 10);
  });

  var ofertasPorCodigo = {};
  final.vinculos.forEach(function (v) { (ofertasPorCodigo[v.codigo] = ofertasPorCodigo[v.codigo] || []).push(v); });

  Object.keys(final.disciplinas).forEach(function (k) {
    var d = final.disciplinas[k];
    d.departamento = departamentoDe_(k);
    d.prefixo = k.slice(0, 3);
    d.creditosTotal = d.creditosAula != null && d.creditosTrabalho != null ? d.creditosAula + d.creditosTrabalho : null;
    var ofertas = (ofertasPorCodigo[k] || []).slice().sort(function (a, b) { return ordemHab[a.curriculo] - ordemHab[b.curriculo]; });
    if (!ofertas.length) return; // fora da estrutura: mantém o último resumo
    d.habilitacoes = ofertas.map(function (v) { return habPorCurriculo[v.curriculo]; }).join(' · ');
    d.oferta = ofertas.map(function (v) { return habPorCurriculo[v.curriculo] + ': ' + descreverOferta_(v); }).join(' · ');
    var paridades = {};
    ofertas.forEach(function (v) { if (v.periodoIdeal) paridades[v.periodoIdeal % 2] = true; });
    d.semestreIdeal = paridades[1] && paridades[0] ? '1º e 2º semestres' : paridades[1] ? '1º semestre' : paridades[0] ? '2º semestre' : '';
  });

  // Contagens dos currículos em uso.
  Object.keys(final.curriculos).forEach(function (k) {
    var c = final.curriculos[k];
    if (!/^sim/i.test(String(c.vigente || ''))) return;
    var vs = final.vinculos.filter(function (v) { return v.curriculo === k; });
    c.disciplinas = vs.length;
    c.obrigatorias = vs.filter(function (v) { return v.tipo === 'OBRIGATORIA'; }).length;
    c.eletivas = vs.filter(function (v) { return v.tipo === 'OPTATIVA_ELETIVA'; }).length;
    c.livres = vs.filter(function (v) { return v.tipo === 'OPTATIVA_LIVRE'; }).length;
    c.requisitos = final.requisitos.filter(function (r) { return r.curriculo === k; }).length;
  });
}

/*---------------------------------------------------------------------
  3b. Informações Básicas do Currículo (só PDF): conferência no servidor
---------------------------------------------------------------------*/

/** Campos numéricos do quadro de informações (nomes do pacote). */
var CAMPOS_INFO_NUMERICOS = ['duracaoIdeal', 'duracaoMinima', 'duracaoMaxima', 'chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria',
  'chAulaEletiva', 'chTrabalhoEletiva', 'chEletiva', 'chAulaLivre', 'chTrabalhoLivre', 'chLivre', 'chDisciplinas',
  'estagio', 'aac', 'aexApolo', 'extensaoOptativas', 'chDisciplinasMaisAac', 'extensaoTotal', 'extensaoPercentual', 'totalGeral'];
/** Campos de texto do quadro (sem conta possível). */
var CAMPOS_INFO_TEXTO = ['dataAtivacao', 'dataDesativacao', 'informacoesEspecificas'];

/**
 * Refaz no servidor as contas verificáveis do quadro "Informações
 * Básicas do Currículo" (o "conferido" que o navegador calcula é
 * ignorado). Situação de cada campo:
 *   coerente         passou em ao menos uma conta e não falhou em nenhuma
 *                    (coerência aritmética — NÃO é prova da leitura);
 *   sem_conferencia  nenhuma conta possível (ex.: estágio, datas, texto);
 *   inconsistente    participa de uma conta que falhou → NÃO é gravado;
 *   ausente          não lido → NÃO é gravado.
 * Contas: aula + trabalho = subtotal (por tipo); subtotais = total em
 * disciplinas; total + AAC = subtotal com AAC; subtotal com AAC + AEX
 * Apolo + extensão em optativas = total geral; percentual de extensão
 * = extensão ÷ subtotal com AAC; duração mínima ≤ ideal ≤ máxima; e,
 * quando a grade tem todos os números, aula/trabalho obrigatórios =
 * 15 h/30 h × créditos das obrigatórias; AAC = AAC já gravada (CSV).
 * @param {Object} info        bloco validado (validarInfoCurriculo_).
 * @param {{aula: ?number, trab: ?number}} grade  horas calculadas da grade.
 * @param {?number} aacAnterior AAC já gravada no currículo (do CSV), ou null.
 */
function conferirInfoCurriculo_(info, grade, aacAnterior) {
  var v = info;
  var rel = [
    { rotulo: 'Obrigatórias: aula + trabalho = subtotal', campos: ['chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria'], ok: function () { return v.chAulaObrigatoria + v.chTrabalhoObrigatoria === v.chObrigatoria; }, conta: function () { return v.chAulaObrigatoria + ' + ' + v.chTrabalhoObrigatoria + ' = ' + v.chObrigatoria; } },
    { rotulo: 'Eletivas: aula + trabalho = subtotal', campos: ['chAulaEletiva', 'chTrabalhoEletiva', 'chEletiva'], ok: function () { return v.chAulaEletiva + v.chTrabalhoEletiva === v.chEletiva; }, conta: function () { return v.chAulaEletiva + ' + ' + v.chTrabalhoEletiva + ' = ' + v.chEletiva; } },
    { rotulo: 'Livres: aula + trabalho = subtotal', campos: ['chAulaLivre', 'chTrabalhoLivre', 'chLivre'], ok: function () { return v.chAulaLivre + v.chTrabalhoLivre === v.chLivre; }, conta: function () { return v.chAulaLivre + ' + ' + v.chTrabalhoLivre + ' = ' + v.chLivre; } },
    { rotulo: 'Subtotais = total em disciplinas', campos: ['chObrigatoria', 'chEletiva', 'chLivre', 'chDisciplinas'], ok: function () { return v.chObrigatoria + v.chEletiva + v.chLivre === v.chDisciplinas; }, conta: function () { return v.chObrigatoria + ' + ' + v.chEletiva + ' + ' + v.chLivre + ' = ' + v.chDisciplinas; } },
    { rotulo: 'Total em disciplinas + AAC = subtotal com AAC', campos: ['chDisciplinas', 'aac', 'chDisciplinasMaisAac'], ok: function () { return v.chDisciplinas + v.aac === v.chDisciplinasMaisAac; }, conta: function () { return v.chDisciplinas + ' + ' + v.aac + ' = ' + v.chDisciplinasMaisAac; } },
    { rotulo: 'Subtotal com AAC + AEX Apolo + extensão em optativas = total geral', campos: ['chDisciplinasMaisAac', 'aexApolo', 'extensaoOptativas', 'totalGeral'], ok: function () { return v.chDisciplinasMaisAac + v.aexApolo + v.extensaoOptativas === v.totalGeral; }, conta: function () { return v.chDisciplinasMaisAac + ' + ' + v.aexApolo + ' + ' + v.extensaoOptativas + ' = ' + v.totalGeral; } },
    { rotulo: 'Percentual de extensão = extensão exigida ÷ subtotal com AAC', campos: ['extensaoTotal', 'chDisciplinasMaisAac', 'extensaoPercentual'], ok: function () { return v.chDisciplinasMaisAac > 0 && Math.abs(Math.round(v.extensaoTotal / v.chDisciplinasMaisAac * 10000) / 100 - v.extensaoPercentual) <= 0.011; }, conta: function () { return v.extensaoTotal + ' ÷ ' + v.chDisciplinasMaisAac + ' = ' + (v.chDisciplinasMaisAac ? (Math.round(v.extensaoTotal / v.chDisciplinasMaisAac * 10000) / 100) : '—') + '% (lido ' + v.extensaoPercentual + '%)'; } },
    { rotulo: 'Duração mínima ≤ ideal ≤ máxima', campos: ['duracaoMinima', 'duracaoIdeal', 'duracaoMaxima'], ok: function () { return v.duracaoMinima <= v.duracaoIdeal && v.duracaoIdeal <= v.duracaoMaxima && v.duracaoMinima > 0; }, conta: function () { return v.duracaoMinima + ' ≤ ' + v.duracaoIdeal + ' ≤ ' + v.duracaoMaxima; } },
    { rotulo: 'Aula obrigatória = 15 h × créditos-aula das obrigatórias da grade', campos: ['chAulaObrigatoria'], externo: grade.aula, ok: function () { return v.chAulaObrigatoria === grade.aula; }, conta: function () { return v.chAulaObrigatoria + ' = ' + grade.aula + ' (grade)'; } },
    { rotulo: 'Trabalho obrigatório = 30 h × créditos-trabalho das obrigatórias da grade', campos: ['chTrabalhoObrigatoria'], externo: grade.trab, ok: function () { return v.chTrabalhoObrigatoria === grade.trab; }, conta: function () { return v.chTrabalhoObrigatoria + ' = ' + grade.trab + ' (grade)'; } },
    { rotulo: 'AAC igual à já gravada (CSV)', campos: ['aac'], externo: aacAnterior, ok: function () { return v.aac === aacAnterior; }, conta: function () { return v.aac + ' = ' + aacAnterior + ' (base)'; } }
  ];
  var campos = {};
  CAMPOS_INFO_NUMERICOS.concat(CAMPOS_INFO_TEXTO).forEach(function (k) {
    var valor = v[k] === undefined ? null : v[k];
    campos[k] = { valor: valor, situacao: valor === null || valor === '' ? 'ausente' : 'sem_conferencia', relacoes: [] };
  });
  var relacoes = rel.map(function (r) {
    var faltam = r.campos.some(function (k) { return v[k] === null || v[k] === undefined; }) || ('externo' in r && (r.externo === null || r.externo === undefined));
    if (faltam) return { rotulo: r.rotulo, situacao: 'nao_verificavel', conta: '' };
    var ok = r.ok();
    r.campos.forEach(function (k) {
      campos[k].relacoes.push(r.rotulo);
      if (!ok) campos[k].situacao = 'inconsistente';
      else if (campos[k].situacao !== 'inconsistente') campos[k].situacao = 'coerente';
    });
    return { rotulo: r.rotulo, situacao: ok ? 'ok' : 'falha', conta: r.conta() };
  });
  var aceitos = {};
  Object.keys(campos).forEach(function (k) {
    if (campos[k].situacao === 'coerente' || campos[k].situacao === 'sem_conferencia') aceitos[k] = campos[k].valor;
  });
  return { campos: campos, relacoes: relacoes, aceitos: aceitos };
}

/**
 * Aplica ao currículo (linha da aba Currículos) só os campos do quadro
 * aceitos por conferirInfoCurriculo_; os demais ficam como estavam.
 * Registra a conferência (prévia) e os valores gravados (revisão).
 */
function aplicarInfoCurriculo_(plano, final, c, infoCur, linha, agora, p) {
  var grade = { aula: null, trab: null };
  var obrig = final.vinculos.filter(function (x) { return x.curriculo === c.codigo && x.tipo === 'OBRIGATORIA'; });
  if (obrig.length) {
    var completo = true, aula = 0, trab = 0;
    obrig.forEach(function (x) {
      var d = final.disciplinas[x.codigo];
      if (!d || d.creditosAula == null || d.creditosTrabalho == null) { completo = false; return; }
      aula += d.creditosAula; trab += d.creditosTrabalho;
    });
    if (completo) grade = { aula: aula * 15, trab: trab * 30 };
  }
  var aacAnterior = linha.aacHoras == null ? null : linha.aacHoras;
  var r = conferirInfoCurriculo_(c.info, grade, aacAnterior);
  var titulo = {};
  COLUNAS[ABAS.CURRICULOS].forEach(function (col) { titulo[col.chave] = col.titulo; });
  titulo.aac = titulo.aacHoras;
  var gravados = 0;
  var lista = Object.keys(r.campos).map(function (k) {
    var info = r.campos[k];
    var campoLinha = k === 'aac' ? 'aacHoras' : k;
    var antes = linha[campoLinha] == null ? null : linha[campoLinha];
    var gravado = false;
    if (Object.prototype.hasOwnProperty.call(r.aceitos, k) && !(k === 'aac' && antes !== null) && antes !== info.valor) {
      linha[campoLinha] = info.valor;
      gravado = true;
      gravados++;
      plano.revisao.itens.push({
        tipo: 'Informações do currículo', codigo: c.codigo, nome: infoCur.nome, campo: titulo[campoLinha] || k,
        valor: k === 'informacoesEspecificas' ? String(info.valor).slice(0, 120) + (String(info.valor).length > 120 ? '…' : '') : info.valor,
        anterior: antes, paginas: c.info.pagina ? [c.info.pagina] : [], situacao: info.situacao
      });
    }
    return { campo: k, rotulo: titulo[campoLinha] || k, valor: k === 'informacoesEspecificas' && info.valor ? '(texto, ' + String(info.valor).length + ' caracteres)' : info.valor, situacao: info.situacao, gravado: gravado, anterior: antes };
  });
  if (gravados) { linha.infoPdfEm = agora; plano.complementos.infoCurriculos++; }
  plano.infoConferencia.push({
    curriculo: c.codigo, habilitacao: infoCur.nome, pagina: c.info.pagina || null,
    relacoes: r.relacoes, campos: lista,
    inconsistentes: lista.filter(function (x) { return x.situacao === 'inconsistente'; }).length,
    gravados: gravados
  });
}

/*---------------------------------------------------------------------
  4. Prévia (o que o painel mostra antes de gravar)
---------------------------------------------------------------------*/

/**
 * Resume o plano para o navegador (etapa "O que vai mudar" do painel).
 * @return {{assinatura: string, podeGravar: boolean, bloqueios: string[],
 *   avisos: Object[], primeiraCarga: boolean, arquivo: Object,
 *   curriculos: Object[], totais: Object, mudancas: Object,
 *   complementos: Object, conferenciaPdf: Object|null,
 *   infoConferencia: Object[], revisao: {necessaria, total, itens}}}  as listas de mudanças vêm cortadas em
 *   MAX_ITENS_PREVIA itens; os totais são sempre completos.
 */
function montarPrevia_(plano, p) {
  var m = plano.mudancas;
  function corta(lista) { return lista.slice(0, MAX_ITENS_PREVIA); }
  return {
    assinatura: plano.assinatura,
    podeGravar: plano.bloqueios.length === 0,
    bloqueios: plano.bloqueios,
    avisos: plano.avisos,
    primeiraCarga: plano.primeiraCarga,
    arquivo: { nome: p.origem.arquivo, formato: p.origem.formato, leitura: p.origem.leitura, geradoEm: p.origem.geradoEm },
    curriculos: plano.curriculos.map(function (c) {
      var f = plano.final.curriculos[c.codigo] || {};
      return {
        codigo: c.codigo, habilitacao: c.nome, cadastradoEm: c.cadastradoEm, modo: c.modo, substitui: c.substitui,
        disciplinas: f.disciplinas || 0, obrigatorias: f.obrigatorias || 0, eletivas: f.eletivas || 0, livres: f.livres || 0, requisitos: f.requisitos || 0
      };
    }),
    totais: {
      disciplinasNoArquivo: p.disciplinas.length,
      novas: m.novas.length, alteradas: m.alteradas.length, sairam: m.sairam.length, voltaram: m.voltaram.length,
      ofertas: m.ofertas.length, requisitos: m.requisitos.length, divergencias: m.divergencias.length
    },
    mudancas: {
      novas: corta(m.novas), alteradas: corta(m.alteradas), sairam: corta(m.sairam), voltaram: corta(m.voltaram),
      ofertas: corta(m.ofertas), requisitos: corta(m.requisitos), divergencias: corta(m.divergencias)
    },
    complementos: plano.complementos,
    // Conferência do PDF, separada por tipo de evidência (ver REGRAS.md):
    // leitura, coerência aritmética, concordância com a base (CSV),
    // valores sem segunda fonte e o que exige conferência humana.
    conferenciaPdf: p.origem.formato !== 'pdf' ? null : {
      leitura: p.origem.leitura,
      contas: p.conferencia || null,
      naoConfirmados: p.disciplinas.filter(function (d) { return d.naoConfirmados.length; }).map(function (d) { return { codigo: d.codigo, campos: d.naoConfirmados, paginas: d.paginas }; }).slice(0, MAX_ITENS_PREVIA),
      concordancia: plano.concordancia
    },
    infoConferencia: plano.infoConferencia,
    // A lista COMPLETA de revisão não vai aqui: é paginada e servida por
    // obterPaginaRevisao, com vínculo à operação (ver prepararRevisaoPaginada_).
    revisao: { necessaria: plano.revisao.necessaria, total: plano.revisao.itens.length }
  };
}

/*---------------------------------------------------------------------
  4.1 Revisão humana paginada (valores só do PDF)

  A lista inteira pode ter milhares de valores (até 3.000 disciplinas ×
  EXT e versão, mais as informações dos currículos). Ela é dividida em
  páginas de TAM_PAGINA_REVISAO itens, guardadas no CacheService com o
  identificador da operação da prévia. A prévia traz a página 1; as demais
  vêm de obterPaginaRevisao(operacao, pagina), que registra cada página
  entregue. confirmarImportacao só aceita a revisão se TODAS as páginas
  foram entregues à mesma pessoa, para a mesma operação e a mesma lista
  (impressão digital + assinatura da prévia). Nada é cortado: acima de
  MAX_ITENS_REVISAO a importação é bloqueada com mensagem clara.
  Limite do que se prova: o servidor sabe que a página chegou ao
  navegador de quem vai gravar; não sabe se a pessoa leu.
---------------------------------------------------------------------*/

/** Itens por página da lista de revisão. */
var TAM_PAGINA_REVISAO = 100;
/**
 * Capacidade da revisão. Um pacote válido tem no máximo 3.000 disciplinas
 * (2 valores cada: EXT e versão) e 30 currículos (22 campos de
 * informação cada) = 6.660 valores; 7.000 cobre todos. Acima disso a
 * importação é bloqueada (nunca cortada).
 */
var MAX_ITENS_REVISAO = 7000;
/** Validade da lista de revisão no cache (máximo do CacheService: 6 h). */
var VALIDADE_REVISAO_SEGUNDOS = 21600;

/** EXT = 0 que não muda um valor já gravado (vai para o fim da lista, resumido). */
function ehExtZero_(i) {
  return i.tipo === 'EXT' && i.valor === 0 && (i.anterior == null || i.anterior === 0 || i.anterior === '');
}

/** Ordem da lista: primeiro o que pede atenção, no fim os EXT = 0 (ordem estável). */
function ordenarRevisao_(itens) {
  return itens.filter(function (i) { return !ehExtZero_(i); }).concat(itens.filter(ehExtZero_));
}

/** Impressão digital da lista de revisão (itens na ordem das páginas). */
function impressaoRevisao_(itens) {
  return hashTexto_(JSON.stringify(itens));
}

/** Chaves do cache da revisão de uma operação. */
function chaveRevisao_(op, sufixo) { return 'rev:' + op + ':' + sufixo; }

/**
 * Guarda a lista de revisão paginada no cache e devolve o que vai na
 * prévia: { necessaria, total, tamanhoPagina, paginas, pagina: 1,
 * itens (página 1), impressao, resumo, disponivel }. A página 1 conta
 * como entregue (vai na própria prévia).
 */
function prepararRevisaoPaginada_(plano, op, email) {
  var itens = plano.revisao.itens;
  var total = itens.length;
  var paginas = Math.max(1, Math.ceil(total / TAM_PAGINA_REVISAO));
  var porTipo = {};
  itens.forEach(function (i) { porTipo[i.tipo] = (porTipo[i.tipo] || 0) + 1; });
  var primeiroZero = -1;
  itens.forEach(function (i, k) { if (primeiroZero < 0 && ehExtZero_(i)) primeiroZero = k; });
  var extZero = primeiroZero < 0 ? 0 : total - primeiroZero;
  var r = {
    necessaria: plano.revisao.necessaria,
    total: total,
    tamanhoPagina: TAM_PAGINA_REVISAO,
    paginas: total ? paginas : 0,
    pagina: 1,
    itens: itens.slice(0, TAM_PAGINA_REVISAO),
    impressao: impressaoRevisao_(itens),
    resumo: {
      porTipo: porTipo,
      extZero: extZero,
      extZeroPaginas: extZero ? [Math.floor(primeiroZero / TAM_PAGINA_REVISAO) + 1, paginas] : null
    },
    disponivel: true
  };
  if (!total || total > MAX_ITENS_REVISAO) return r;
  try {
    var cache = CacheService.getScriptCache();
    for (var p = 1; p <= paginas; p++) {
      cache.put(chaveRevisao_(op, 'p' + p), JSON.stringify(itens.slice((p - 1) * TAM_PAGINA_REVISAO, p * TAM_PAGINA_REVISAO)), VALIDADE_REVISAO_SEGUNDOS);
    }
    cache.put(chaveRevisao_(op, 'v1'), '1', VALIDADE_REVISAO_SEGUNDOS);
    // O resumo da lista é gravado por último: sem ele, nada vale.
    cache.put(chaveRevisao_(op, 'm'), JSON.stringify({ total: total, paginas: paginas, impressao: r.impressao, assinatura: plano.assinatura, usuario: hashTexto_(email) }), VALIDADE_REVISAO_SEGUNDOS);
  } catch (e) {
    console.error('prepararRevisaoPaginada_ falhou: ' + (e && e.message ? e.message : e));
    r.disponivel = false;
  }
  return r;
}

/**
 * PÚBLICA. Uma página da lista de valores só do PDF da prévia "operacao".
 * Só administradores; só quem gerou a prévia. Registra a página como
 * entregue (conferido por confirmarImportacao).
 * @return {{ok, dados: {pagina, paginas, itens}}}  ou REVISAO_EXPIRADA.
 */
function obterPaginaRevisao(operacao, pagina) {
  return executarComSeguranca_('obterPaginaRevisao', function () {
    var usuario = exigirAdmin_();
    var op = String(operacao || '');
    if (!/^[0-9a-fA-F-]{8,64}$/.test(op)) throw erroAmigavel_('PACOTE_INVALIDO', 'Identificador de importação inválido.');
    var n = Number(pagina);
    if (!(n >= 1 && Math.floor(n) === n)) throw erroAmigavel_('PACOTE_INVALIDO', 'Página inválida.');
    var cache = CacheService.getScriptCache();
    var meta = cache.get(chaveRevisao_(op, 'm'));
    meta = meta ? JSON.parse(meta) : null;
    if (!meta || meta.usuario !== hashTexto_(usuario.email)) {
      throw erroAmigavel_('REVISAO_EXPIRADA', 'A lista de valores desta prévia não está mais disponível (ela vale por algumas horas). Nada foi gravado. Gere a prévia de novo.');
    }
    if (n > meta.paginas) throw erroAmigavel_('PACOTE_INVALIDO', 'Página inválida.');
    var itens = cache.get(chaveRevisao_(op, 'p' + n));
    if (!itens) throw erroAmigavel_('REVISAO_EXPIRADA', 'A lista de valores desta prévia não está mais disponível. Nada foi gravado. Gere a prévia de novo.');
    cache.put(chaveRevisao_(op, 'v' + n), '1', VALIDADE_REVISAO_SEGUNDOS);
    return { pagina: n, paginas: meta.paginas, itens: JSON.parse(itens) };
  });
}

/**
 * Recusa (REVISAO_INCOMPLETA) a confirmação da revisão se a lista não é a
 * que será gravada ou se alguma página não foi entregue a quem confirma.
 */
function conferirRevisaoCompleta_(op, email, plano) {
  var cache = CacheService.getScriptCache();
  var meta = op ? cache.get(chaveRevisao_(op, 'm')) : null;
  meta = meta ? JSON.parse(meta) : null;
  var itens = plano.revisao.itens;
  if (!meta || meta.usuario !== hashTexto_(email)) {
    throw erroAmigavel_('REVISAO_INCOMPLETA', 'Não foi possível confirmar que a lista de valores a revisar foi aberta nesta prévia (ela expirou ou foi gerada por outra pessoa). Nada foi gravado. Gere a prévia de novo e confira a lista.');
  }
  if (meta.total !== itens.length || meta.impressao !== impressaoRevisao_(itens) || meta.assinatura !== plano.assinatura) {
    throw erroAmigavel_('REVISAO_INCOMPLETA', 'A lista revisada não é a mesma que seria gravada. Nada foi gravado. Gere a prévia de novo.');
  }
  var faltam = [];
  for (var p = 1; p <= meta.paginas; p++) {
    if (!cache.get(chaveRevisao_(op, 'v' + p))) faltam.push(p);
  }
  if (faltam.length) {
    throw erroAmigavel_('REVISAO_INCOMPLETA', 'A revisão não foi concluída: ' + faltam.length + ' de ' + meta.paginas + ' páginas da lista de valores só do PDF não foram abertas (' + resumirPaginas_(faltam) + '). Todos os ' + meta.total + ' valores a gravar precisam passar pela revisão. Nada foi gravado.');
  }
}

/** [3,4,5,9] → "páginas 3–5, 9". */
function resumirPaginas_(lista) {
  var partes = [];
  for (var i = 0; i < lista.length;) {
    var j = i;
    while (j + 1 < lista.length && lista[j + 1] === lista[j] + 1) j++;
    partes.push(i === j ? String(lista[i]) : lista[i] + '–' + lista[j]);
    i = j + 1;
  }
  return (lista.length > 1 ? 'páginas ' : 'página ') + partes.join(', ');
}

/*---------------------------------------------------------------------
  5. Gravação
---------------------------------------------------------------------*/

/**
 * Grava o estado final do plano: regrava as abas Disciplinas,
 * Disciplinas por habilitação, Requisitos e Currículos (preservando
 * Observações e colunas extras), acrescenta uma linha em Importações e
 * as linhas de Alterações, soma 1 à versão da base e atualiza a aba
 * Sobre. Só é chamada por confirmarImportacao, dentro da trava.
 * @param {Spreadsheet} ss
 * @param {Object} plano    resultado de planejarImportacao_ (sem bloqueios).
 * @param {Object} p        pacote limpo.
 * @param {{email: string}} usuario  quem confirmou (vai para o registro).
 * @param {Object} base     base lida antes do plano (para a versão).
 * @return {{id: string, dataHora: string, totais: Object,
 *   complementos: Object, resumo: string}}
 */
function gravarImportacao_(ss, plano, p, usuario, base, manifesto, op) {
  var agora = plano.agora;
  var id = idImportacao_(agora, op, manifesto);
  var final = plano.final;

  // Nomes curtos das habilitações e currículos em uso.
  var habPorCurriculo = {};
  Object.keys(final.curriculos).forEach(function (k) { habPorCurriculo[k] = final.curriculos[k].habilitacao || ''; });
  // Ordenação por habilitação: código numérico contido no currículo.
  function ordemHab(k) { return parseInt(String(k).slice(5, 9), 10); }

  // Requisitos agrupados por disciplina/currículo (resumo e relação).
  var reqPorVinculo = {};
  final.requisitos.forEach(function (r) { (reqPorVinculo[r.curriculo + '|' + r.codigo] = reqPorVinculo[r.curriculo + '|' + r.codigo] || []).push(r); });
  var naEstrutura = {};
  final.vinculos.forEach(function (v) { naEstrutura[v.codigo] = true; });

  // Disciplinas
  var disciplinas = Object.keys(final.disciplinas).sort().map(function (k) { return final.disciplinas[k]; });

  // Oferta por habilitação
  var ordemTipo = { OBRIGATORIA: 1, OPTATIVA_ELETIVA: 2, OPTATIVA_LIVRE: 3 };
  var oferta = final.vinculos.slice().sort(function (a, b) {
    return ordemHab(a.curriculo) - ordemHab(b.curriculo) || ordemTipo[a.tipo] - ordemTipo[b.tipo] || (a.periodoIdeal || 0) - (b.periodoIdeal || 0) || (a.codigo < b.codigo ? -1 : 1);
  }).map(function (v) {
    var d = final.disciplinas[v.codigo] || {};
    return {
      curriculo: v.curriculo, habilitacao: habPorCurriculo[v.curriculo], codigo: v.codigo, nome: d.nome,
      departamento: departamentoDe_(v.codigo), tipo: ROTULO_TIPO[v.tipo], periodoIdeal: v.periodoIdeal,
      semestreIdeal: semestreDoPeriodo_(v.periodoIdeal), creditosAula: d.creditosAula,
      requisitos: resumirRequisitos_(reqPorVinculo[v.curriculo + '|' + v.codigo] || []),
      _extras: v._extras || {}
    };
  });

  // Requisitos
  var requisitos = final.requisitos.slice().sort(function (a, b) {
    return ordemHab(a.curriculo) - ordemHab(b.curriculo) || (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0) || (a.grupo || 0) - (b.grupo || 0) || (a.requisito < b.requisito ? -1 : 1);
  }).map(function (r) {
    var irmaos = reqPorVinculo[r.curriculo + '|' + r.codigo] || [];
    return {
      curriculo: r.curriculo, habilitacao: habPorCurriculo[r.curriculo], codigo: r.codigo,
      nome: (final.disciplinas[r.codigo] || {}).nome, tipoRequisito: r.tipoRequisito, requisito: r.requisito,
      versaoRequisito: r.versaoRequisito, nomeRequisito: r.nomeRequisito, grupo: r.grupo,
      relacao: relacaoDoRequisito_(r, irmaos), naEstrutura: naEstrutura[r.requisito] ? 'Sim' : 'Não',
      _extras: r._extras || {}
    };
  });

  // Currículos (em uso primeiro, por habilitação)
  var curriculos = Object.keys(final.curriculos).sort(function (a, b) {
    var va = /^sim/i.test(final.curriculos[a].vigente) ? 0 : 1, vb = /^sim/i.test(final.curriculos[b].vigente) ? 0 : 1;
    return va - vb || ordemHab(a) - ordemHab(b) || (a < b ? 1 : -1);
  }).map(function (k) { return final.curriculos[k]; });
  var dados = {};
  dados[ABAS.DISCIPLINAS] = disciplinas;
  dados[ABAS.OFERTA] = oferta;
  dados[ABAS.REQUISITOS] = requisitos;
  dados[ABAS.CURRICULOS] = curriculos;

  // Registro da importação
  var m = plano.mudancas;
  var modos = {};
  plano.curriculos.forEach(function (c) { modos[c.modo] = true; });
  var descricaoModo = modos.completo && modos.complemento ? 'Completa e complemento do PDF' : modos.complemento ? 'Complemento do PDF (só dados que o CSV não tem)' : 'Completa';
  var leitura = p.origem.formato === 'csv' ? 'CSV' : p.origem.leitura === 'ocr' ? 'PDF (OCR)' : 'PDF (texto)';
  var resumoCurriculos = plano.curriculos.map(function (c) { return c.nome + ' ' + c.cadastradoEm + ' (' + c.codigo + ')'; }).join('; ');
  var resumo = [
    p.disciplinas.length + ' disciplinas no arquivo',
    m.novas.length + ' novas', m.alteradas.length + ' alteradas', m.sairam.length + ' saíram', m.voltaram.length + ' voltaram',
    m.ofertas.length + ' mudanças de oferta', m.requisitos.length + ' mudanças de requisitos'
  ];
  if (p.origem.formato === 'pdf') resumo.push('complemento: ' + plano.complementos.versoes + ' versões, ' + plano.complementos.ext + ' EXT, ' + plano.complementos.gruposOu + ' disciplinas com relação "e"/"ou" dos requisitos, ' + plano.complementos.infoCurriculos + ' currículos');
  if (m.divergencias.length) resumo.push(m.divergencias.length + ' divergências não aplicadas');
  if (p.conferencia && p.conferencia.numerosLidos != null) resumo.push('conferência do PDF: ' + (p.conferencia.numerosLidos + (p.conferencia.numerosCorrigidos || 0)) + ' números coerentes com as contas do relatório (' + (p.conferencia.numerosCorrigidos || 0) + ' corrigidos pelas contas), ' + (p.conferencia.numerosAConferir || 0) + ' sem coerência verificada (não gravados)');
  if (plano.concordancia.campos) resumo.push('concordância com a base (CSV): ' + plano.concordancia.camposIguais + ' de ' + plano.concordancia.campos + ' números compartilhados iguais');
  plano.infoConferencia.forEach(function (ic) { if (ic.inconsistentes) resumo.push(ic.habilitacao + ': ' + ic.inconsistentes + ' campo(s) das informações básicas não gravado(s) por somas que não conferem'); });
  if (plano.revisao.necessaria) resumo.push(plano.revisao.itens.length + ' valores exclusivos do PDF gravados após revisão humana confirmada por quem importou');

  var registroImportacao = {
    id: id, dataHora: agora, usuario: usuario.email, arquivo: p.origem.arquivo, formato: p.origem.formato.toUpperCase(),
    leitura: leitura, modo: descricaoModo, curriculos: resumoCurriculos, disciplinas: p.disciplinas.length,
    novas: m.novas.length, alteradas: m.alteradas.length, sairam: m.sairam.length, voltaram: m.voltaram.length,
    ofertasAlteradas: m.ofertas.length, requisitos: p.requisitos.length, avisos: plano.avisos.length,
    resumo: resumo.join('; ') + '.'
  };

  // Alterações
  var alteracoes = [];
  // Uma linha da aba Alterações (todas com o id e a data desta importação).
  function linha(codigo, nome, tipo, habilitacao, campo, antes, depois) {
    alteracoes.push({ importacao: id, dataHora: agora, codigo: codigo, nome: nome, tipo: tipo, habilitacao: habilitacao || '', campo: campo || '', antes: formatarValor_(antes), depois: formatarValor_(depois) });
  }
  if (plano.primeiraCarga) {
    linha('', '', 'Carga inicial', '', '', '', m.novas.length + ' disciplinas; ' + resumoCurriculos);
  } else {
    m.novas.forEach(function (n) { linha(n.codigo, n.nome, 'Nova disciplina', (final.disciplinas[n.codigo] || {}).habilitacoes, '', '', ''); });
  }
  m.alteradas.forEach(function (a) { a.campos.forEach(function (c) { linha(a.codigo, a.nome, 'Dado alterado', '', c.campo, c.antes, c.depois); }); });
  m.sairam.forEach(function (s) { linha(s.codigo, s.nome, 'Saiu da estrutura', '', '', '', ''); });
  m.voltaram.forEach(function (s) { linha(s.codigo, s.nome, 'Voltou à estrutura', '', '', '', ''); });
  m.ofertas.forEach(function (o) { linha(o.codigo, o.nome, o.tipo, o.habilitacao, 'Tipo e período', o.antes, o.depois); });
  m.requisitos.forEach(function (r) { linha(r.codigo, r.nome, 'Requisitos alterados', r.habilitacao, 'Requisitos', r.antes, r.depois); });
  plano.curriculos.forEach(function (c) { if (c.substitui) linha('', '', 'Currículo substituído', c.nome, 'Currículo', c.substitui, c.codigo); });
  if (p.origem.formato === 'pdf' && plano.primeiraCarga === false) {
    var cp = plano.complementos;
    if (cp.versoes || cp.ext || cp.gruposOu || cp.infoCurriculos) linha('', '', 'Complemento do PDF', '', '', '', cp.versoes + ' versões, ' + cp.ext + ' extensões (EXT), ' + cp.gruposOu + ' disciplinas com relação "e"/"ou" dos requisitos, ' + cp.infoCurriculos + ' currículos');
  }
  var texto = formatarDataHora_(agora) + ' — ' + p.origem.arquivo + ' (' + leitura + ') por ' + usuario.email + '. ' + resumo.join('; ') + '.';
  var r = gravarComAtivacao_(ss, manifesto, base, dados, { importacao: registroImportacao, alteracoes: alteracoes }, { op: op, id: id, agora: agora, texto: texto });

  return {
    id: id,
    operacao: op,
    concluida: true,
    pendencias: r.pendencias,
    avisos: r.avisos,
    // true = as abas visíveis ainda NÃO são as da versão gravada (a
    // arrumação falhou); o painel mostra um alerta até a correção.
    planilhaDesatualizada: r.planilhaDesatualizada,
    abasDivergentes: r.abasDivergentes,
    dataHora: formatarDataHora_(agora),
    totais: { disciplinas: disciplinas.length, novas: m.novas.length, alteradas: m.alteradas.length, sairam: m.sairam.length, voltaram: m.voltaram.length, ofertas: m.ofertas.length, requisitos: m.requisitos.length, divergencias: m.divergencias.length },
    complementos: plano.complementos,
    resumo: resumo.join('; ') + '.'
  };
}

/*---------------------------------------------------------------------
  Auxiliares da importação
---------------------------------------------------------------------*/

/**
 * Identificador único da importação: "IMP-aaaammdd-hhmmss-xxxxxxxx",
 * em que xxxxxxxx vem do identificador aleatório da operação (UUID
 * criado na prévia). A data fica também na coluna "Data e hora". Se,
 * por acaso, o identificador já existir entre as concluídas, recebe um
 * sufixo "-2", "-3"…
 */
function idImportacao_(agora, op, manifesto) {
  var base = 'IMP-' + Utilities.formatDate(agora, FUSO_HORARIO, 'yyyyMMdd-HHmmss') + '-' + String(op).replace(/-/g, '').slice(0, 8).toLowerCase();
  var conf = idsConfirmados_(manifesto);
  var id = base, n = 2;
  while (conf[id]) id = base + '-' + (n++);
  return id;
}
/** Cópia rasa de uma linha (e das colunas extras, se houver). */
function copiar_(obj) {
  var c = {};
  Object.keys(obj).forEach(function (k) { c[k] = obj[k]; });
  if (obj._extras) {
    c._extras = {};
    Object.keys(obj._extras).forEach(function (k) { c._extras[k] = obj._extras[k]; });
  }
  return c;
}

/**
 * O nome "curto" (do PDF) é igual ao "longo" (da base) ou é o começo
 * dele? O PDF corta nomes longos; um corte não é divergência.
 * Exige ao menos 8 caracteres para aceitar como começo.
 */
function ehPrefixoDe_(curto, longo) {
  var a = chaveTitulo_(curto), b = chaveTitulo_(longo);
  return a === b || (a.length >= 8 && b.indexOf(a) === 0);
}

/** Oferta legível: "Obrigatória, 3º período". */
function descreverOferta_(v) {
  return ROTULO_TIPO[v.tipo] + (v.periodoIdeal ? ', ' + v.periodoIdeal + 'º período' : '');
}

/** Nome da disciplina: o da base (estado final) ou, se não houver, o do arquivo. */
function nomeDe_(final, discPacote, codigo) {
  return (final.disciplinas[codigo] && final.disciplinas[codigo].nome) || (discPacote[codigo] && discPacote[codigo].nome) || '';
}

/** Nome curto da habilitação de um currículo do arquivo (ou o próprio número). */
function nomeHab_(plano, curriculo) {
  var c = plano.curriculos.filter(function (x) { return x.codigo === curriculo; })[0];
  return c ? c.nome : curriculo;
}

/** Nome curto da habilitação pelo código da habilitação (ex.: "100"). */
function nomeHabPorCodigo_(plano, hab) {
  var c = plano.curriculos.filter(function (x) { return x.habilitacao === hab; })[0];
  return c ? c.nome : 'Habilitação ' + hab;
}

/**
 * Resumo legível dos requisitos de uma disciplina numa habilitação,
 * por exemplo "(PSE2252 ou PSE2254) e PSA1301". Sem a informação de
 * grupos (só o CSV foi importado): "A, B (relação não informada)".
 */
function resumirRequisitos_(lista) {
  if (!lista.length) return '';
  var semGrupo = lista.some(function (r) { return r.grupo == null; });
  if (semGrupo) {
    var codigos = lista.map(function (r) { return r.requisito; }).sort();
    return codigos.length > 1 ? codigos.join(', ') + ' (relação não informada)' : codigos[0];
  }
  var grupos = {};
  lista.forEach(function (r) { (grupos[r.grupo] = grupos[r.grupo] || []).push(r.requisito); });
  return Object.keys(grupos).sort(function (a, b) { return a - b; }).map(function (g) {
    var itens = grupos[g];
    return itens.length > 1 ? '(' + itens.join(' ou ') + ')' : itens[0];
  }).join(' e ');
}

/**
 * Texto da coluna "Relação" da aba Requisitos para o requisito r, dado
 * o conjunto de requisitos da mesma disciplina na mesma habilitação.
 * Mesmo número de grupo = alternativas ("ou"); grupos diferentes = "e".
 */
function relacaoDoRequisito_(r, irmaos) {
  if (irmaos.length <= 1) return 'Único';
  if (r.grupo == null) return 'Não informado (só CSV)';
  var mesmoGrupo = irmaos.filter(function (x) { return x.grupo === r.grupo; }).length;
  if (mesmoGrupo > 1) return 'Ou — basta um do grupo ' + r.grupo;
  return 'E — exigido junto com os demais';
}

/** Valor para as colunas Antes/Depois da aba Alterações (data → dd/MM/yyyy HH:mm). */
function formatarValor_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return formatarDataHora_(v);
  return String(v);
}
