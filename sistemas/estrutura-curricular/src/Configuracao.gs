/*=====================================================================
  CONFIGURAÇÃO — onde o sistema encontra a planilha da estrutura

  Nenhum ID fica no código. Em "Configurações do projeto > Propriedades
  do script" cadastre:

    ID_INDEX_SPREADSHEET_ID  (obrigatória)
        ID da planilha mestre ID_INDEX (a mesma usada pelos outros
        sistemas do Serviço de Graduação).

  (1.7.0) Quem acessa e com que perfil: planilha da chave
  PERMISSOES_DE_ACESSO no ID_INDEX, aba ESTRUTURA_CURRICULAR (ver
  Acesso.gs). As antigas propriedades ESTRUTURA_ADMINS e
  ESTRUTURA_LEITORES não são mais lidas e podem ser apagadas.

  Na planilha ID_INDEX (primeira aba): coluna A "Chave", B "Tipo",
  C "ID de Produção". O sistema procura a linha com a chave
  ESTRUTURA_CURRICULAR e tipo "spreadsheet". A coluna D (Homologação)
  nunca é usada.

  Envio da grade (1.5.0), mesmas colunas, chaves:
    GRADE_HORARIA_PREENCHIMENTO            planilha que as secretarias preenchem
    INDEX_GRADE_HORARIA_VERSOES_ANTERIORES planilha-índice das cópias (A = semestre, B = ID)
    BACKUP_GRADES_ANTERIORES               pasta do Drive onde ficam as cópias
  (o tipo da coluna B não é conferido nessas três)
=====================================================================*/

var CONFIG = {
  PROP_ID_INDEX: 'ID_INDEX_SPREADSHEET_ID',
  CHAVE_ESTRUTURA: 'ESTRUTURA_CURRICULAR',
  TIPO_ESTRUTURA: 'spreadsheet',
  // Tempo (s) em que o ID resolvido da planilha fica em cache.
  CACHE_SEGUNDOS: 600
};

/** Valor de uma Propriedade do script. Nunca registra o valor em log. */
function lerPropriedade_(nome, obrigatoria) {
  var valor = PropertiesService.getScriptProperties().getProperty(nome);
  if (obrigatoria && !valor) {
    throw erroAmigavel_('CONFIGURACAO', 'O sistema ainda não foi configurado (falta a propriedade ' + nome + '). Avise quem mantém o sistema.');
  }
  return valor || '';
}

/**
 * Procura uma CHAVE na planilha ID_INDEX (coluna A) e devolve o "ID de
 * Produção" (coluna C). tipo (opcional): exige esse valor na coluna B
 * ("Tipo"). Mesmo padrão do Painel de Solicitações (chave PERIODOS).
 * Chave ausente, repetida ou sem ID = erro de CONFIGURACAO (sem mostrar
 * IDs). Usada pela estrutura e, desde a 1.5.0, pelo envio da grade
 * (GRADE_HORARIA_PREENCHIMENTO, INDEX_GRADE_HORARIA_VERSOES_ANTERIORES,
 * BACKUP_GRADES_ANTERIORES).
 */
function idDoIndex_(chave, tipo) {
  var indexId = lerPropriedade_(CONFIG.PROP_ID_INDEX, true);
  var index;
  try {
    index = SpreadsheetApp.openById(indexId);
  } catch (e) {
    throw erroAmigavel_('CONFIGURACAO', 'Não foi possível abrir a planilha ID_INDEX. Confira a propriedade ' + CONFIG.PROP_ID_INDEX + ' e se a conta que executa o sistema tem acesso a ela.');
  }
  var aba = index.getSheets()[0];
  if (!aba || aba.getLastRow() < 2) throw erroAmigavel_('CONFIGURACAO', 'A planilha ID_INDEX está vazia.');

  var cab = aba.getRange(1, 1, 1, 3).getDisplayValues()[0].map(function (v) { return String(v).trim(); });
  if (cab[0] !== 'Chave' || cab[1] !== 'Tipo' || cab[2] !== 'ID de Produção') {
    throw erroAmigavel_('CONFIGURACAO', 'As colunas A–C da planilha ID_INDEX não estão no formato esperado (Chave, Tipo, ID de Produção).');
  }

  var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, 3).getDisplayValues();
  var id = null;
  linhas.forEach(function (l) {
    if (String(l[0]).trim() !== chave) return;
    if (id !== null) throw erroAmigavel_('CONFIGURACAO', 'A chave ' + chave + ' aparece duas vezes na planilha ID_INDEX.');
    if (tipo && String(l[1]).trim() !== tipo) throw erroAmigavel_('CONFIGURACAO', 'A chave ' + chave + ' precisa ter o tipo "' + tipo + '" na planilha ID_INDEX.');
    id = String(l[2]).trim();
    if (!id) throw erroAmigavel_('CONFIGURACAO', 'A chave ' + chave + ' está sem "ID de Produção" na planilha ID_INDEX.');
  });
  if (id === null) throw erroAmigavel_('CONFIGURACAO', 'A chave ' + chave + ' não foi encontrada na planilha ID_INDEX.');
  return id;
}

/**
 * ID da planilha ESTRUTURA_CURRICULAR (chave de mesmo nome, tipo
 * "spreadsheet"). Fica em cache por alguns minutos para não abrir o
 * índice a cada consulta.
 */
function obterIdPlanilhaEstrutura_() {
  var cache = CacheService.getScriptCache();
  var emCache = cache.get('idEstrutura');
  if (emCache) return emCache;
  var id = idDoIndex_(CONFIG.CHAVE_ESTRUTURA, CONFIG.TIPO_ESTRUTURA);
  cache.put('idEstrutura', id, CONFIG.CACHE_SEGUNDOS);
  return id;
}

/** Abre a planilha ESTRUTURA_CURRICULAR. */
function abrirPlanilhaEstrutura_() {
  try {
    return SpreadsheetApp.openById(obterIdPlanilhaEstrutura_());
  } catch (e) {
    if (e && e.amigavel) throw e;
    CacheService.getScriptCache().remove('idEstrutura');
    throw erroAmigavel_('CONFIGURACAO', 'Não foi possível abrir a planilha da estrutura curricular. Confira o ID na planilha ID_INDEX e se a conta que executa o sistema tem acesso a ela.');
  }
}

/**
 * Diagnóstico para rodar no editor do Apps Script (menu Executar).
 * Mostra no registro se a configuração está completa, SEM exibir IDs.
 */
function diagnosticarConfiguracao() {
  var r = executarComSeguranca_('diagnosticarConfiguracao', function () {
    exigirAdmin_();
    var props = PropertiesService.getScriptProperties();
    var ss = abrirPlanilhaEstrutura_();
    return {
      idIndexConfigurado: !!props.getProperty(CONFIG.PROP_ID_INDEX),
      // 1.7.0: só as contagens, sem e-mails
      permissoes: (function () {
        var m = lerPermissoes_(), c = { administradores: 0, leitores: 0, perfilVazioOuDesconhecido: 0 };
        Object.keys(m).forEach(function (k) { if (m[k] === ACESSO.PERFIL_ADMIN) c.administradores++; else if (m[k] === ACESSO.PERFIL_LEITOR) c.leitores++; else c.perfilVazioOuDesconhecido++; });
        return c;
      })(),
      propriedadesAntigas: ['ESTRUTURA_ADMINS', 'ESTRUTURA_LEITORES'].filter(function (k) { return props.getProperty(k); }).map(function (k) { return k + ' (não é mais usada: pode apagar)'; }),
      planilhaAberta: true,
      abas: ss.getSheets().map(function (a) { return a.getName(); }),
      esquema: versaoEsquemaDaPlanilha_(ss)
    };
  });
  console.log(JSON.stringify(r));
  return r;
}
