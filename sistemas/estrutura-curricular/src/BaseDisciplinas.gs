/*=====================================================================
  BASE ÚNICA DE DISCIPLINAS (planilha DISCIPLINAS) — etapa 1: migração

  A planilha da chave DISCIPLINAS no ID_INDEX passa a ser o cadastro de
  disciplinas do Serviço de Graduação, lido por todos os apps (grade
  horária, formulários de exclusão e trancamento, consultas). Ela cobre
  o "universo IPUSP" e também disciplinas sem relação com o IP:

    universo        o que é                                   entra na grade?
    IP              do IP, no currículo do IP                 sim
    IP_PARA_OUTRAS  do IP, ministrada para outras unidades    sim
    OUTRA_PARA_IP   de outra unidade, no currículo do IP      sim
    EXTERNA         de outra unidade, sem relação com o IP    não

  Nesta etapa só existe a MIGRAÇÃO: copia para a planilha nova tudo o
  que a ESTRUTURA_CURRICULAR sabe de cada disciplina (abas Disciplinas,
  Ajustes manuais, Disciplinas para outros cursos e Disciplinas por
  habilitação), com os ajustes do painel já aplicados. Nada muda na
  ESTRUTURA_CURRICULAR nem no painel: o app continua lendo a estrutura
  até a etapa seguinte.

  Rodar no editor do Apps Script (menu Executar), com a conta que
  implantou o Web App:
    simularMigracaoDisciplinas()      só lê e mostra no registro o que
                                      seria feito (nada é gravado);
    migrarDisciplinasParaBaseUnica()  grava.
  As duas exigem perfil de administrador (como qualquer função do painel
  que grava) e usam a trava do sistema.

  Rodar de novo NÃO duplica: cada linha guarda de onde veio (coluna
  chave_estrutura) e mantém o seu disciplina_id. Numa nova rodada, os
  campos que vêm da estrutura são atualizados (e cada mudança vai para a
  aba HISTORICO); os campos que só existem na base (modalidade,
  observação interna, códigos anteriores, substituída por) e as colunas
  extras que alguém criar nunca são apagados. Linhas que não vieram da
  estrutura (ex.: disciplina externa cadastrada à mão) ficam intactas.

  Chave primária: disciplina_id = "disc_" + UUID, a mesma convenção das
  Regras Curriculares (Painel dos servidores). Nunca é reaproveitado nem
  editado. O código continua sendo a chave de negócio: não pode haver
  duas linhas não substituídas com o mesmo código (a migração recusa e
  não grava nada).

  Abas (títulos em snake_case, lidos PELO TÍTULO — dá para reordenar):
    LEIA-ME              o que é cada aba e coluna
    DISCIPLINAS          uma linha por disciplina
    OFERTA_HABILITACAO   uma linha por disciplina × currículo em uso
    HISTORICO            uma linha por criação ou campo alterado
    DICIONARIO           valores aceitos nas colunas de lista

  Escrita: cada aba numa única escrita, nesta ordem: DISCIPLINAS,
  OFERTA_HABILITACAO, HISTORICO. Não é uma transação: se a execução cair
  no meio, rode de novo (DISCIPLINAS já tem os IDs; a oferta é regerada).
=====================================================================*/

var BASE_DISC = {
  CHAVE: 'DISCIPLINAS',
  META_ESQUEMA: 'baseDisciplinas.esquema',
  ESQUEMA: 1,
  ABAS: { LEIA: 'LEIA-ME', DISC: 'DISCIPLINAS', OFERTA: 'OFERTA_HABILITACAO', HIST: 'HISTORICO', DIC: 'DICIONARIO' },
  PREFIXO_ID: 'disc_',
  ORIGEM_HISTORICO: 'Migração da estrutura curricular',
  LINK_JUPITER: 'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis='
};

var UNIVERSO = { IP: 'IP', IP_PARA_OUTRAS: 'IP_PARA_OUTRAS', OUTRA_PARA_IP: 'OUTRA_PARA_IP', EXTERNA: 'EXTERNA' };
var SITUACAO_DISC = { ATIVA: 'Ativa', FORA: 'Fora da estrutura atual', EXCLUIDA: 'Excluída', SUBSTITUIDA: 'Substituída' };
var ORIGEM_ESTRUTURA = 'Estrutura curricular (Júpiter)';

/*
 * Colunas da aba DISCIPLINAS. fonte:
 *   'estrutura'  vem da estrutura: atualizado a cada migração;
 *   'preencher'  calculado na criação; depois só se estiver vazio
 *                (pode ser corrigido à mão sem ser desfeito);
 *   'base'       só existe na base: a migração nunca escreve;
 *   'sistema'    controle (ID, datas, revisão).
 */
var COLUNAS_BASE_DISC = [
  { t: 'disciplina_id', tipo: 'texto', fonte: 'sistema', largura: 300, nota: 'Chave primária: "disc_" + UUID. Gerada uma vez, nunca muda nem é reaproveitada. Os outros apps guardam este ID, não o código.' },
  { t: 'codigo', tipo: 'texto', fonte: 'estrutura', largura: 90, nota: 'Código em uso (com o ajuste do painel, se houver). Único entre as disciplinas não substituídas.' },
  { t: 'codigos_anteriores', tipo: 'texto', fonte: 'base', largura: 140, nota: 'Códigos que esta mesma disciplina já teve, separados por vírgula.' },
  { t: 'versao', tipo: 'inteiro', fonte: 'estrutura', largura: 70, nota: 'Versão da disciplina no Júpiter (número entre parênteses no PDF).' },
  { t: 'nome', tipo: 'texto', fonte: 'estrutura', largura: 330 },
  { t: 'universo', tipo: 'texto', fonte: 'preencher', largura: 140, nota: 'IP, IP_PARA_OUTRAS, OUTRA_PARA_IP ou EXTERNA (ver DICIONARIO). Só EXTERNA fica fora da grade horária.' },
  { t: 'uso_grade', tipo: 'texto', fonte: 'sistema', largura: 85, nota: 'Calculado pelo universo: Sim = IP, IP_PARA_OUTRAS ou OUTRA_PARA_IP; Não = EXTERNA. O app da grade horária só trabalha com as linhas "Sim".' },
  { t: 'unidade_sigla', tipo: 'texto', fonte: 'preencher', largura: 100, nota: 'Unidade da USP que oferece a disciplina (IP, FFLCH, FEA…). Vazio = não informada.' },
  { t: 'departamento', tipo: 'texto', fonte: 'estrutura', largura: 120, nota: 'PSA, PSC, PSE, PST, Interdepartamental ou Outra unidade.' },
  { t: 'prefixo', tipo: 'texto', fonte: 'estrutura', largura: 70 },
  { t: 'creditos_aula', tipo: 'inteiro', fonte: 'estrutura', largura: 95 },
  { t: 'creditos_trabalho', tipo: 'inteiro', fonte: 'estrutura', largura: 115 },
  { t: 'creditos_total', tipo: 'inteiro', fonte: 'estrutura', largura: 100 },
  { t: 'ch_total', tipo: 'inteiro', fonte: 'estrutura', largura: 80, nota: 'Horas no semestre: 15 h por crédito-aula + 30 h por crédito-trabalho.' },
  { t: 'ce_estagio', tipo: 'inteiro', fonte: 'estrutura', largura: 90 },
  { t: 'cp_praticas', tipo: 'inteiro', fonte: 'estrutura', largura: 95 },
  { t: 'ext_extensao', tipo: 'inteiro', fonte: 'estrutura', largura: 95 },
  { t: 'atpa', tipo: 'inteiro', fonte: 'estrutura', largura: 70 },
  { t: 'habilitacoes', tipo: 'texto', fonte: 'estrutura', largura: 220, nota: 'Habilitações em uso em que a disciplina aparece.' },
  { t: 'oferta_resumo', tipo: 'texto', fonte: 'estrutura', largura: 360, nota: 'Tipo e período ideal em cada habilitação (detalhe na aba OFERTA_HABILITACAO).' },
  { t: 'tipo_principal', tipo: 'texto', fonte: 'estrutura', largura: 110, nota: 'Obrigatória, Eletiva ou Livre: o da habilitação Psicólogo; se não estiver nela, Bacharelado; depois Licenciatura (a mesma regra do envio da grade).' },
  { t: 'semestre_ideal_principal', tipo: 'inteiro', fonte: 'estrutura', largura: 130, nota: 'Período ideal (1 a 10) pela mesma regra do tipo principal. Vai para a coluna "Semestre Ideal" da grade.' },
  { t: 'semestre_oferecimento', tipo: 'texto', fonte: 'estrutura', largura: 150, nota: 'Semestre do ANO: 1º semestre, 2º semestre ou 1º e 2º semestres (com o ajuste do painel, se houver).' },
  { t: 'na_estrutura_atual', tipo: 'texto', fonte: 'estrutura', largura: 110, nota: 'Sim = veio na última importação do Júpiter.' },
  { t: 'unidade_atendida', tipo: 'texto', fonte: 'estrutura', largura: 150, nota: 'Só IP_PARA_OUTRAS: unidade para a qual é ministrada.' },
  { t: 'curso_atendido', tipo: 'texto', fonte: 'estrutura', largura: 180 },
  { t: 'na_grade', tipo: 'texto', fonte: 'estrutura', largura: 80, nota: 'Sim = adicionada à grade horária no painel.' },
  { t: 'modalidade', tipo: 'texto', fonte: 'base', largura: 95, nota: 'Teórica ou Prática (coluna Modalidade da grade). Vazio = não informada.' },
  { t: 'observacao_grade', tipo: 'texto', fonte: 'estrutura', largura: 300, nota: 'Vai para a grade das secretarias junto do nome (hoje, a coluna Observações da estrutura).' },
  { t: 'observacao_interna', tipo: 'texto', fonte: 'base', largura: 300, nota: 'Só para a equipe do Serviço de Graduação. Nunca vai para secretarias nem alunos.' },
  { t: 'situacao', tipo: 'texto', fonte: 'estrutura', largura: 150, nota: 'Ativa, Fora da estrutura atual, Excluída ou Substituída (ver DICIONARIO).' },
  { t: 'ativacao_jupiter', tipo: 'texto', fonte: 'estrutura', largura: 100 },
  { t: 'desativacao_jupiter', tipo: 'texto', fonte: 'estrutura', largura: 110 },
  { t: 'substituida_por', tipo: 'texto', fonte: 'base', largura: 300, nota: 'disciplina_id da disciplina que substituiu esta (troca de código tratada como disciplina nova).' },
  { t: 'link_jupiter', tipo: 'texto', fonte: 'estrutura', largura: 200, nota: 'Página pública da disciplina no Júpiter.' },
  { t: 'origem_registro', tipo: 'texto', fonte: 'preencher', largura: 220 },
  { t: 'chave_estrutura', tipo: 'texto', fonte: 'sistema', largura: 160, nota: 'De onde a linha veio na ESTRUTURA_CURRICULAR ("estrutura:CÓDIGO" ou "outros:IDENTIFICADOR"). Usada para não duplicar ao migrar de novo: não altere.' },
  { t: 'criada_em', tipo: 'dataHora', fonte: 'sistema', largura: 125 },
  { t: 'criada_por', tipo: 'texto', fonte: 'sistema', largura: 200 },
  { t: 'atualizada_em', tipo: 'dataHora', fonte: 'sistema', largura: 125 },
  { t: 'atualizada_por', tipo: 'texto', fonte: 'sistema', largura: 200 },
  { t: 'revisao', tipo: 'inteiro', fonte: 'sistema', largura: 70, nota: 'Sobe a cada gravação. Um app que vai gravar confere se ainda é a mesma que leu.' }
];

var COLUNAS_BASE_OFERTA = [
  { t: 'disciplina_id', tipo: 'texto', largura: 300 },
  { t: 'codigo', tipo: 'texto', largura: 90 },
  { t: 'curriculo', tipo: 'texto', largura: 115 },
  { t: 'curso', tipo: 'texto', largura: 140 },
  { t: 'habilitacao_codigo', tipo: 'texto', largura: 120 },
  { t: 'habilitacao', tipo: 'texto', largura: 150 },
  { t: 'tipo', tipo: 'texto', largura: 100, nota: 'Obrigatória, Eletiva ou Livre nesta habilitação.' },
  { t: 'periodo_ideal', tipo: 'inteiro', largura: 95 },
  { t: 'semestre_oferecimento', tipo: 'texto', largura: 140, nota: 'Pelo período ideal: ímpar = 1º semestre; par = 2º semestre.' },
  { t: 'oferta_ajustada', tipo: 'texto', largura: 110, nota: 'Sim = tipo/período corrigidos no painel (não são os do Júpiter).' },
  { t: 'requisitos_resumo', tipo: 'texto', largura: 260 }
];

var COLUNAS_BASE_HIST = [
  { t: 'registrado_em', tipo: 'dataHora', largura: 125 },
  { t: 'registrado_por', tipo: 'texto', largura: 200 },
  { t: 'disciplina_id', tipo: 'texto', largura: 300 },
  { t: 'codigo', tipo: 'texto', largura: 90 },
  { t: 'operacao', tipo: 'texto', largura: 100, nota: 'CRIADA ou ALTERADA.' },
  { t: 'campo', tipo: 'texto', largura: 160 },
  { t: 'antes', tipo: 'texto', largura: 220 },
  { t: 'depois', tipo: 'texto', largura: 220 },
  { t: 'origem', tipo: 'texto', largura: 220 }
];

var COLUNAS_BASE_DIC = [
  { t: 'dominio', tipo: 'texto', largura: 120 },
  { t: 'codigo', tipo: 'texto', largura: 160 },
  { t: 'rotulo', tipo: 'texto', largura: 200 },
  { t: 'descricao', tipo: 'texto', largura: 480 }
];

/** Valores da aba DICIONARIO (função: usa constantes de outros arquivos, carregados depois deste). */
function dicionarioBase_() {
  return [
  ['universo', UNIVERSO.IP, 'Do IP', 'Disciplina do IP no currículo do IP. Entra na grade horária.'],
  ['universo', UNIVERSO.IP_PARA_OUTRAS, 'Do IP para outras unidades', 'Disciplina do IP ministrada para cursos de outras unidades. Entra na grade horária.'],
  ['universo', UNIVERSO.OUTRA_PARA_IP, 'De outra unidade para o IP', 'Disciplina de outra unidade que faz parte do currículo do IP. Entra na grade horária.'],
  ['universo', UNIVERSO.EXTERNA, 'Externa', 'Disciplina de outra unidade sem relação com o currículo do IP (ex.: optativa cursada fora). Não entra na grade horária.'],
  ['situacao', SITUACAO_DISC.ATIVA, SITUACAO_DISC.ATIVA, 'Em uso.'],
  ['situacao', SITUACAO_DISC.FORA, SITUACAO_DISC.FORA, 'Estava numa importação anterior do Júpiter e não veio na última.'],
  ['situacao', SITUACAO_DISC.EXCLUIDA, SITUACAO_DISC.EXCLUIDA, 'Excluída no painel: não aparece na lista nem na grade (pode ser restaurada).'],
  ['situacao', SITUACAO_DISC.SUBSTITUIDA, SITUACAO_DISC.SUBSTITUIDA, 'Trocou de código e foi tratada como disciplina nova (ver substituida_por).'],
  ['modalidade', 'Teórica', 'Teórica', 'Tem dia e horário na grade.'],
  ['modalidade', 'Prática', 'Prática', 'Horário variável na grade.'],
  ['tipo', 'Obrigatória', 'Obrigatória', ''],
  ['tipo', 'Eletiva', 'Optativa eletiva', ''],
  ['tipo', 'Livre', 'Optativa livre', ''],
  ['origem_registro', ORIGEM_ESTRUTURA, ORIGEM_ESTRUTURA, 'Importada do relatório "Grade Curricular" do Júpiter (CSV/PDF).'],
  ['origem_registro', ORIGEM_UNIDADE, ORIGEM_UNIDADE, 'Importada da "Lista de disciplinas por unidade" do Júpiter.'],
  ['origem_registro', ORIGEM_MANUAL, ORIGEM_MANUAL, 'Cadastrada à mão no painel.']
  ];
}

/*---------------------------------------------------------------------
  Funções para rodar no editor
---------------------------------------------------------------------*/

/** Só lê e mostra no registro o que a migração faria. Não grava nada. */
function simularMigracaoDisciplinas() {
  return executarMigracaoDisciplinas_('simularMigracaoDisciplinas', false);
}

/** Copia as disciplinas da ESTRUTURA_CURRICULAR para a planilha DISCIPLINAS. */
function migrarDisciplinasParaBaseUnica() {
  return executarMigracaoDisciplinas_('migrarDisciplinasParaBaseUnica', true);
}

function executarMigracaoDisciplinas_(nome, gravar) {
  var r = executarPreparacao_(nome, function (ss, usuario) {
    var destino = abrirPorChave_(BASE_DISC.CHAVE, 'planilha', 'a planilha de disciplinas');
    if (destino.getId() === ss.getId()) throw erroAmigavel_('CONFIGURACAO', 'A chave DISCIPLINAS do ID_INDEX aponta para a própria planilha da estrutura curricular. Ela deve apontar para a planilha nova de disciplinas. Nada foi gravado.');
    var agora = new Date();
    var plano = planoMigracaoDisciplinas_(ss, destino, usuario.email, agora);
    if (gravar) gravarMigracaoDisciplinas_(destino, plano);
    return resumoMigracaoDisciplinas_(plano, gravar);
  });
  console.log(JSON.stringify(r));
  return r;
}

/*---------------------------------------------------------------------
  Plano (tudo calculado antes de qualquer escrita)
---------------------------------------------------------------------*/

/**
 * { linhas: [obj por título] (aba DISCIPLINAS completa), extras: [títulos],
 *   oferta: [obj], historico: [obj], contagens, avisos }.
 */
function planoMigracaoDisciplinas_(ss, destino, email, agora) {
  var ctx = contextoPreparacao_(ss);
  var m = lerManifesto_(ss);
  var curriculos = {};
  lerAba_(ss, ABAS.CURRICULOS, m).linhas.forEach(function (c) { if (c.curriculo) curriculos[c.curriculo] = c; });
  var requisitos = {};
  lerAba_(ss, ABAS.OFERTA, m).linhas.forEach(function (v) { if (v.requisitos) requisitos[v.codigo + '|' + v.curriculo] = v.requisitos; });

  var fonte = linhasDaEstruturaParaBase_(ctx, curriculos, requisitos);
  var atual = lerAbaBase_(destino.getSheetByName(BASE_DISC.ABAS.DISC), COLUNAS_BASE_DISC);
  var avisos = fonte.avisos.slice();

  var porChave = {}, porCodigoSemChave = {};
  atual.linhas.forEach(function (l, i) {
    if (l.chave_estrutura) {
      if (porChave[l.chave_estrutura] !== undefined) throw erroAmigavel_('BASE_INCONSISTENTE', 'A planilha DISCIPLINAS tem duas linhas com chave_estrutura "' + l.chave_estrutura + '". Corrija antes de migrar. Nada foi gravado.');
      porChave[l.chave_estrutura] = i;
    } else if (l.codigo && !porCodigoSemChave[l.codigo]) porCodigoSemChave[l.codigo] = i;
  });

  var historico = [], oferta = [], cont = { criadas: 0, alteradas: 0, semMudanca: 0, preservadas: 0, ofertas: 0 };
  var usadas = {};
  var hist = function (l, operacao, campo, antes, depois) {
    historico.push({ registrado_em: agora, registrado_por: email, disciplina_id: l.disciplina_id, codigo: l.codigo, operacao: operacao, campo: campo || '', antes: antes, depois: depois, origem: BASE_DISC.ORIGEM_HISTORICO });
  };

  fonte.itens.forEach(function (f) {
    var i = porChave[f.dados.chave_estrutura];
    if (i === undefined && porCodigoSemChave[f.dados.codigo] !== undefined && !usadas[porCodigoSemChave[f.dados.codigo]]) i = porCodigoSemChave[f.dados.codigo];
    var l;
    if (i === undefined) {
      l = { _extras: {} };
      COLUNAS_BASE_DISC.forEach(function (c) { l[c.t] = null; });
      COLUNAS_BASE_DISC.forEach(function (c) { if (c.fonte === 'estrutura' || c.fonte === 'preencher') l[c.t] = f.dados[c.t]; });
      l.disciplina_id = BASE_DISC.PREFIXO_ID + Utilities.getUuid();
      l.chave_estrutura = f.dados.chave_estrutura;
      l.uso_grade = usoGradeDoUniverso_(l.universo);
      l.criada_em = agora; l.criada_por = email; l.atualizada_em = agora; l.atualizada_por = email; l.revisao = 1;
      atual.linhas.push(l);
      usadas[atual.linhas.length - 1] = true;
      hist(l, 'CRIADA', '', '', '');
      cont.criadas++;
    } else {
      usadas[i] = true;
      l = atual.linhas[i];
      var mudou = false;
      if (!l.chave_estrutura) { l.chave_estrutura = f.dados.chave_estrutura; hist(l, 'ALTERADA', 'chave_estrutura', '', l.chave_estrutura); mudou = true; }
      COLUNAS_BASE_DISC.forEach(function (c) {
        if (c.fonte !== 'estrutura' && c.fonte !== 'preencher') return;
        var novo = f.dados[c.t];
        if (c.fonte === 'preencher' && !vazioBase_(l[c.t])) return;
        // "Substituída" é decisão de quem mantém a base: a estrutura não a desfaz.
        if (c.t === 'situacao' && l.situacao === SITUACAO_DISC.SUBSTITUIDA) return;
        if (mesmoValorBase_(l[c.t], novo, c.tipo)) return;
        hist(l, 'ALTERADA', c.t, textoHistorico_(l[c.t]), textoHistorico_(novo));
        l[c.t] = novo;
        mudou = true;
      });
      var uso = usoGradeDoUniverso_(l.universo);
      if (!mesmoValorBase_(l.uso_grade, uso, 'texto')) { hist(l, 'ALTERADA', 'uso_grade', textoHistorico_(l.uso_grade), uso); l.uso_grade = uso; mudou = true; }
      if (mudou) {
        l.atualizada_em = agora; l.atualizada_por = email; l.revisao = (Number(l.revisao) || 0) + 1;
        cont.alteradas++;
      } else cont.semMudanca++;
    }
    f.oferta.forEach(function (o) { o.disciplina_id = l.disciplina_id; oferta.push(o); });
  });
  cont.preservadas = atual.linhas.length - Object.keys(usadas).length;
  cont.ofertas = oferta.length;

  // Código único entre as não substituídas (a base inteira, inclusive as linhas preservadas).
  var porCodigo = {};
  atual.linhas.forEach(function (l) {
    if (!l.codigo || l.situacao === SITUACAO_DISC.SUBSTITUIDA) return;
    (porCodigo[l.codigo] = porCodigo[l.codigo] || []).push(l);
  });
  var repetidos = Object.keys(porCodigo).filter(function (k) { return porCodigo[k].length > 1; });
  if (repetidos.length) throw erroAmigavel_('CODIGO_REPETIDO', 'Estes códigos ficariam em mais de uma disciplina não substituída na planilha DISCIPLINAS: ' + repetidos.slice(0, 20).join(', ') + (repetidos.length > 20 ? '…' : '') + '. Nada foi gravado.');

  // Oferta das linhas que não vieram desta migração fica como está.
  var migradas = {};
  atual.linhas.forEach(function (l) { if (l.chave_estrutura) migradas[l.disciplina_id] = true; });
  var ofertaAtual = lerAbaBase_(destino.getSheetByName(BASE_DISC.ABAS.OFERTA), COLUNAS_BASE_OFERTA).linhas;
  var ofertaFinal = ofertaAtual.filter(function (o) { return !migradas[o.disciplina_id]; }).concat(oferta);

  return { linhas: atual.linhas, extras: atual.extrasTitulos, oferta: ofertaFinal, historico: historico, contagens: cont, avisos: avisos };
}

/**
 * Uma entrada por disciplina da estrutura e de outros cursos:
 * { dados: {título: valor} (colunas 'estrutura' e 'preencher'), oferta: [obj] }.
 */
function linhasDaEstruturaParaBase_(ctx, curriculos, requisitos) {
  var itens = [], avisos = [];
  var habInfo = function (cod) {
    var c = curriculos[cod] || {};
    var habCod = c.habilitacaoCodigo || String(parseInt(String(cod).slice(5, 9), 10));
    return { curso: c.curso || '', codigo: habCod, nome: nomeCurtoHabilitacao_(c.habilitacao, c.curso, habCod) };
  };
  var pendentes = 0;

  Object.keys(ctx.base).sort().forEach(function (chave) {
    var b = ctx.base[chave], aj = ctx.ajustes[chave] || {};
    var v = function (k) { var a = aj[k]; return a !== null && a !== undefined && a !== '' ? a : b[k]; };
    var codigo = String(aj.codigo || chave);
    var efetiva = ofertaEfetiva_(ctx, chave, ctx.ajustes[chave]);
    pendentes += efetiva.pendentes.length;
    var vinculos = efetiva.vinculos.filter(function (o) { return ctx.vigentes[o.curriculo]; }).slice();
    vinculos.sort(function (x, y) { return codigoHabilitacao_(ctx, x.curriculo) - codigoHabilitacao_(ctx, y.curriculo); });
    var principal = ofertaPrincipal_(ctx, chave, ctx.ajustes[chave]);
    var ca = numeroOuNulo_(v('creditosAula')), ct = numeroOuNulo_(v('creditosTrabalho'));
    var na = /^na estrutura/i.test(semAcento_(String(b.situacao || '')));
    var dados = dadosComunsBase_(codigo);
    Object.assign(dados, {
      versao: numeroOuNulo_(v('versao')),
      nome: String(v('nome') || ''),
      universo: departamentoDe_(codigo) === DEPARTAMENTOS.OUTRA ? UNIVERSO.OUTRA_PARA_IP : UNIVERSO.IP,
      departamento: String(aj.departamento || b.departamento || departamentoDe_(codigo)),
      creditos_aula: ca, creditos_trabalho: ct,
      creditos_total: ca === null && ct === null ? null : (ca || 0) + (ct || 0),
      ch_total: numeroOuNulo_(v('ch')), ce_estagio: numeroOuNulo_(v('ce')), cp_praticas: numeroOuNulo_(v('cp')),
      ext_extensao: numeroOuNulo_(v('ext')), atpa: numeroOuNulo_(v('atpa')),
      habilitacoes: unicos_(vinculos.map(function (o) { return habInfo(o.curriculo).nome; })).join(', '),
      oferta_resumo: vinculos.map(function (o) {
        return habInfo(o.curriculo).nome + ': ' + (ROTULO_TIPO_GRADE[o.tipo] || 'sem tipo') + (Number(o.periodo) ? ', ' + Number(o.periodo) + 'º período' : '');
      }).join('; '),
      tipo_principal: principal ? (ROTULO_TIPO_GRADE[principal.tipo] || '') : '',
      semestre_ideal_principal: principal && Number(principal.periodo) ? Number(principal.periodo) : null,
      semestre_oferecimento: SEMESTRE_TEXTO[oferecimentoEfetivo_(ctx, { origem: 'estrutura', chave: chave })] || '',
      na_estrutura_atual: na ? 'Sim' : 'Não',
      na_grade: aj.naGrade === SIM ? 'Sim' : 'Não',
      observacao_grade: b.observacoes || '',
      situacao: aj.excluida === SIM ? SITUACAO_DISC.EXCLUIDA : na ? SITUACAO_DISC.ATIVA : SITUACAO_DISC.FORA,
      origem_registro: ORIGEM_ESTRUTURA,
      chave_estrutura: 'estrutura:' + chave
    });
    var oferta = vinculos.map(function (o) {
      var h = habInfo(o.curriculo);
      var per = Number(o.periodo) || null;
      return {
        disciplina_id: null, codigo: codigo, curriculo: o.curriculo, curso: h.curso, habilitacao_codigo: h.codigo, habilitacao: h.nome,
        tipo: ROTULO_TIPO_GRADE[o.tipo] || '', periodo_ideal: per, semestre_oferecimento: semestreDoPeriodo_(per),
        oferta_ajustada: efetiva.ajustada ? 'Sim' : 'Não',
        requisitos_resumo: efetiva.ajustada ? '' : (requisitos[chave + '|' + o.curriculo] || '')
      };
    });
    itens.push({ dados: dados, oferta: oferta });
  });

  ctx.ordemOutros.slice().sort().forEach(function (chave) {
    var o = ctx.outros[chave];
    var codigo = String(o.codigo || chave);
    var doIp = departamentoDe_(codigo) !== DEPARTAMENTOS.OUTRA;
    if (!doIp) avisos.push('Disciplina para outros cursos com código de outra unidade (migrada como IP_PARA_OUTRAS; confira): ' + codigo);
    var ca = numeroOuNulo_(o.creditosAula), ct = numeroOuNulo_(o.creditosTrabalho);
    var dados = dadosComunsBase_(codigo);
    Object.assign(dados, {
      versao: null,
      nome: String(o.nome || ''),
      universo: UNIVERSO.IP_PARA_OUTRAS,
      unidade_sigla: doIp ? 'IP' : '',
      departamento: String(o.departamento || departamentoDe_(codigo)),
      creditos_aula: ca, creditos_trabalho: ct,
      creditos_total: ca === null && ct === null ? null : (ca || 0) + (ct || 0),
      ch_total: numeroOuNulo_(o.ch),
      semestre_oferecimento: SEMESTRE_TEXTO[semestreDoTexto_(o.oferecimento)] || '',
      na_estrutura_atual: 'Não',
      unidade_atendida: o.unidadeAtendida || '', curso_atendido: o.cursoAtendido || '',
      na_grade: o.naGrade === SIM ? 'Sim' : 'Não',
      observacao_grade: o.observacoes || '',
      situacao: o.excluida === SIM ? SITUACAO_DISC.EXCLUIDA : SITUACAO_DISC.ATIVA,
      ativacao_jupiter: o.ativacao || '', desativacao_jupiter: o.desativacao || '',
      origem_registro: o.origem || ORIGEM_MANUAL,
      chave_estrutura: 'outros:' + chave
    });
    itens.push({ dados: dados, oferta: [] });
  });

  if (pendentes) avisos.push(pendentes + ' vínculo(s) de oferta ajustada estão "a revisar" no painel (currículo substituído) e não foram copiados para OFERTA_HABILITACAO.');
  return { itens: itens, avisos: avisos };
}

/** Campos que dependem só do código (e os vazios por padrão). */
function dadosComunsBase_(codigo) {
  var d = {};
  COLUNAS_BASE_DISC.forEach(function (c) { if (c.fonte === 'estrutura' || c.fonte === 'preencher') d[c.t] = null; });
  var doIp = departamentoDe_(codigo) !== DEPARTAMENTOS.OUTRA;
  d.codigo = codigo;
  d.prefixo = codigo.slice(0, 3);
  d.unidade_sigla = doIp ? 'IP' : '';
  d.link_jupiter = BASE_DISC.LINK_JUPITER + encodeURIComponent(codigo);
  ['habilitacoes', 'oferta_resumo', 'tipo_principal', 'semestre_oferecimento', 'unidade_atendida', 'curso_atendido', 'observacao_grade', 'ativacao_jupiter', 'desativacao_jupiter'].forEach(function (k) { d[k] = ''; });
  return d;
}

/** Sim/Não pelo universo (vazio = vazio). */
function usoGradeDoUniverso_(universo) {
  if (!universo) return '';
  return universo === UNIVERSO.EXTERNA ? 'Não' : 'Sim';
}

function unicos_(lista) {
  var vistos = {};
  return lista.filter(function (x) { if (!x || vistos[x]) return false; vistos[x] = true; return true; });
}
function vazioBase_(v) { return v === null || v === undefined || v === ''; }
function mesmoValorBase_(a, b, tipo) {
  if (vazioBase_(a) && vazioBase_(b)) return true;
  if (vazioBase_(a) || vazioBase_(b)) return false;
  if (tipo === 'inteiro' || tipo === 'decimal') return Number(a) === Number(b);
  return String(a) === String(b);
}
function textoHistorico_(v) {
  if (vazioBase_(v)) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return formatarDataHora_(v);
  return String(v);
}

/*---------------------------------------------------------------------
  Leitura e escrita das abas da base (pelo título)
---------------------------------------------------------------------*/

/** { linhas: [{título: valor, _extras}], extrasTitulos } — aba ausente = vazia. */
function lerAbaBase_(aba, colunas) {
  if (!aba || aba.getLastRow() < 1 || aba.getLastColumn() < 1) return { linhas: [], extrasTitulos: [] };
  var valores = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  var titulos = valores[0].map(function (t) { return String(t).trim(); });
  var porTitulo = {};
  colunas.forEach(function (c) { porTitulo[chaveTitulo_(c.t)] = c; });
  var mapa = titulos.map(function (t) { return t ? porTitulo[chaveTitulo_(t)] || null : null; });
  var linhas = [];
  for (var r = 1; r < valores.length; r++) {
    var linha = valores[r];
    if (linha.every(function (v) { return v === '' || v === null; })) continue;
    var o = { _extras: {} };
    colunas.forEach(function (c) { o[c.t] = null; });
    linha.forEach(function (v, i) {
      if (mapa[i]) o[mapa[i].t] = valorLido_(v, mapa[i].tipo);
      else if (titulos[i]) o._extras[titulos[i]] = v;
    });
    linhas.push(o);
  }
  return { linhas: linhas, extrasTitulos: titulos.filter(function (t, i) { return t && !mapa[i]; }) };
}

/** Cria a aba (se faltar) e as colunas que faltarem, no fim. Devolve a aba. */
function prepararAbaBase_(ss, nome, colunas, protegida) {
  var aba = ss.getSheetByName(nome);
  var nova = !aba;
  if (nova) aba = ss.insertSheet(nome, ss.getSheets().length);
  var titulos = nova ? [] : titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var chaves = titulos.map(chaveTitulo_);
  var faltando = colunas.filter(function (c) { return chaves.indexOf(chaveTitulo_(c.t)) < 0; });
  if (faltando.length) {
    var inicio = titulos.length + 1;
    var total = titulos.length + faltando.length;
    if (aba.getMaxColumns() < total) aba.insertColumnsAfter(aba.getMaxColumns(), total - aba.getMaxColumns());
    faltando.forEach(function (c, i) {
      var col = inicio + i;
      var cel = aba.getRange(1, col);
      cel.setValue(c.t);
      if (c.nota) cel.setNote(c.nota);
      aba.setColumnWidth(col, c.largura || 120);
      var formato = c.tipo === 'inteiro' ? '0' : c.tipo === 'dataHora' ? 'dd/MM/yyyy HH:mm' : null;
      if (formato) aba.getRange(2, col, Math.max(1, aba.getMaxRows() - 1), 1).setNumberFormat(formato);
    });
    aba.getRange(1, 1, 1, total).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor(COR_TEXTO_CABECALHO).setVerticalAlignment('middle').setWrap(true);
    aba.setFrozenRows(1);
  }
  if (nova && protegida) aba.protect().setDescription('Mantida pelo sistema (planilha DISCIPLINAS). Edite pelo painel.').setWarningOnly(true);
  return aba;
}

/** Regrava todas as linhas de dados (linha 1 = cabeçalho), numa única escrita. */
function escreverAbaBase_(aba, colunas, objetos) {
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var porTitulo = {};
  colunas.forEach(function (c) { porTitulo[chaveTitulo_(c.t)] = c; });
  var linhas = objetos.map(function (o) {
    return titulos.map(function (t) {
      var c = t ? porTitulo[chaveTitulo_(t)] : null;
      if (c) return valorParaCelula_(o[c.t], c.tipo);
      var extra = o._extras && Object.prototype.hasOwnProperty.call(o._extras, t) ? o._extras[t] : '';
      return extra === null || extra === undefined ? '' : (typeof extra === 'string' ? textoSeguro_(extra) : extra);
    });
  });
  var necessarias = linhas.length + 1;
  if (aba.getMaxRows() < necessarias) aba.insertRowsAfter(aba.getMaxRows(), necessarias - aba.getMaxRows());
  var ultima = aba.getLastRow();
  if (ultima > 1) aba.getRange(2, 1, ultima - 1, Math.max(titulos.length, aba.getLastColumn())).clearContent();
  if (linhas.length) aba.getRange(2, 1, linhas.length, titulos.length).setValues(linhas);
}

/** Acrescenta linhas no fim (HISTORICO). */
function acrescentarAbaBase_(aba, colunas, objetos) {
  if (!objetos.length) return;
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var porTitulo = {};
  colunas.forEach(function (c) { porTitulo[chaveTitulo_(c.t)] = c; });
  var linhas = objetos.map(function (o) {
    return titulos.map(function (t) { var c = t ? porTitulo[chaveTitulo_(t)] : null; return c ? valorParaCelula_(o[c.t], c.tipo) : ''; });
  });
  var inicio = aba.getLastRow() + 1;
  var necessarias = inicio + linhas.length - 1;
  if (aba.getMaxRows() < necessarias) aba.insertRowsAfter(aba.getMaxRows(), necessarias - aba.getMaxRows());
  aba.getRange(inicio, 1, linhas.length, titulos.length).setValues(linhas);
}

/*---------------------------------------------------------------------
  Gravação
---------------------------------------------------------------------*/

function gravarMigracaoDisciplinas_(destino, plano) {
  // Planilha nova: a aba vazia padrão vira o LEIA-ME.
  var abas = destino.getSheets();
  if (!destino.getSheetByName(BASE_DISC.ABAS.LEIA) && abas.length === 1 && abas[0].getLastRow() === 0 && abas[0].getName() !== BASE_DISC.ABAS.DISC) {
    abas[0].setName(BASE_DISC.ABAS.LEIA);
  }
  if (!destino.getSheetByName(BASE_DISC.ABAS.LEIA)) destino.insertSheet(BASE_DISC.ABAS.LEIA, 0);
  var disc = prepararAbaBase_(destino, BASE_DISC.ABAS.DISC, COLUNAS_BASE_DISC, false);
  var oferta = prepararAbaBase_(destino, BASE_DISC.ABAS.OFERTA, COLUNAS_BASE_OFERTA, true);
  var hist = prepararAbaBase_(destino, BASE_DISC.ABAS.HIST, COLUNAS_BASE_HIST, true);
  var dic = prepararAbaBase_(destino, BASE_DISC.ABAS.DIC, COLUNAS_BASE_DIC, true);
  disc.setFrozenColumns(2);

  escreverAbaBase_(disc, COLUNAS_BASE_DISC, plano.linhas);
  escreverAbaBase_(oferta, COLUNAS_BASE_OFERTA, plano.oferta);
  acrescentarAbaBase_(hist, COLUNAS_BASE_HIST, plano.historico);
  escreverAbaBase_(dic, COLUNAS_BASE_DIC, dicionarioBase_().map(function (d) { return { dominio: d[0], codigo: d[1], rotulo: d[2], descricao: d[3] }; }));
  escreverLeiaMeBase_(destino.getSheetByName(BASE_DISC.ABAS.LEIA));
  gravarMetadado_(destino, BASE_DISC.META_ESQUEMA, BASE_DISC.ESQUEMA);
}

function escreverLeiaMeBase_(aba) {
  var linhas = [
    ['DISCIPLINAS — base única de disciplinas', ''],
    ['Serviço de Graduação — Instituto de Psicologia da USP', ''],
    ['', ''],
    ['Cadastro de disciplinas lido por todos os sistemas do Serviço de Graduação (grade horária, formulários, consultas). Colunas lidas pelo título: dá para reordenar, não renomeie.', ''],
    ['', ''],
    ['Aba', 'O que guarda'],
    [BASE_DISC.ABAS.DISC, 'Uma linha por disciplina, identificada por disciplina_id (nunca muda). Inclui disciplinas do IP, do IP para outras unidades, de outras unidades no currículo do IP e externas (coluna universo).'],
    [BASE_DISC.ABAS.OFERTA, 'Tipo e período ideal de cada disciplina em cada habilitação em uso.'],
    [BASE_DISC.ABAS.HIST, 'Cada criação e cada campo alterado: quando, por quem e de onde.'],
    [BASE_DISC.ABAS.DIC, 'Valores aceitos nas colunas de lista (universo, situação, modalidade, tipo, origem).'],
    ['', ''],
    ['Importante', 'As colunas modalidade, observacao_interna, codigos_anteriores e substituida_por podem ser preenchidas à mão: a migração da estrutura nunca as apaga. As demais vêm da estrutura curricular e são atualizadas a cada migração. Colunas extras que alguém criar são preservadas.'],
    ['Versão do esquema', String(BASE_DISC.ESQUEMA)]
  ];
  aba.clearContents();
  aba.getRange(1, 1, linhas.length, 2).setValues(linhas.map(function (l) { return [textoSeguro_(l[0]), textoSeguro_(l[1])]; }));
  aba.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  aba.getRange(6, 1, 1, 2).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor(COR_TEXTO_CABECALHO);
  aba.getRange(7, 1, linhas.length - 6, 1).setFontWeight('bold');
  aba.setColumnWidth(1, 220);
  aba.setColumnWidth(2, 720);
  aba.getRange(1, 1, linhas.length, 2).setWrap(true).setVerticalAlignment('top');
}

/** Resumo para o registro de execução: só contagens, códigos de disciplina e avisos. */
function resumoMigracaoDisciplinas_(plano, gravou) {
  var porUniverso = {}, porSituacao = {};
  plano.linhas.forEach(function (l) {
    porUniverso[l.universo || '(vazio)'] = (porUniverso[l.universo || '(vazio)'] || 0) + 1;
    porSituacao[l.situacao || '(vazio)'] = (porSituacao[l.situacao || '(vazio)'] || 0) + 1;
  });
  return {
    gravado: !!gravou,
    totalNaBase: plano.linhas.length,
    criadas: plano.contagens.criadas,
    alteradas: plano.contagens.alteradas,
    semMudanca: plano.contagens.semMudanca,
    preservadasSemOrigemNaEstrutura: plano.contagens.preservadas,
    linhasDeOferta: plano.oferta.length,
    linhasNoHistorico: plano.historico.length,
    porUniverso: porUniverso,
    porSituacao: porSituacao,
    avisos: plano.avisos
  };
}
