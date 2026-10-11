/*=====================================================================
  ACESSO — quem pode consultar e quem pode alterar

  (1.7.0) A lista de quem acessa fica numa planilha, não mais nas
  propriedades do script:

    ID_INDEX › chave PERMISSOES_DE_ACESSO (tipo spreadsheet)
      › aba ESTRUTURA_CURRICULAR, a partir da linha 2:
        A = N. USP · B = Nome · C = e-mail · D = Observação · E = Perfil

  Papéis:
    admin  (Perfil "ADMINISTRADOR") → consulta, importa, prepara e
           envia a grade; executa as funções do editor.
    leitor (Perfil "LEITOR")        → só consulta: a estrutura, em modo
           leitura, e a auditoria da grade.
    Perfil vazio ou desconhecido    → leitor (o menor acesso).

  Regras (validadas aqui, no servidor, em TODA chamada — o painel
  esconder um botão não é proteção):
    1. A conta precisa ser identificada (Session.getActiveUser). Isso
       só acontece para contas do mesmo domínio Google Workspace de
       quem implantou (usp.br). Sem e-mail → SEM_CONTA.
    2. E-mail na coluna C da aba → papel pelo Perfil (coluna E).
    3. Qualquer outra conta → SEM_ACESSO. Não há domínio inteiro, nem
       acesso automático para o dono da planilha, nem as antigas
       propriedades ESTRUTURA_ADMINS/ESTRUTURA_LEITORES.
  A lista fica em cache por ACESSO.CACHE_SEGUNDOS: tirar alguém da aba
  vale em até 1 minuto.
=====================================================================*/

var ACESSO = {
  CHAVE: 'PERMISSOES_DE_ACESSO',
  TIPO: 'spreadsheet',
  ABA: 'ESTRUTURA_CURRICULAR',
  COL_EMAIL: 3,
  COL_PERFIL: 5,
  PERFIL_ADMIN: 'ADMINISTRADOR',
  PERFIL_LEITOR: 'LEITOR',
  CACHE: 'permissoesEstrutura',
  CACHE_SEGUNDOS: 60
};

/**
 * Identifica quem está usando o painel e o seu papel.
 * Lança erro amigável SEM_CONTA (conta não identificada), SEM_ACESSO
 * (fora da lista) ou CONFIGURACAO (planilha de permissões ausente ou
 * fora do formato).
 * @return {{email: string, papel: string}}  papel = 'admin' | 'leitor'
 */
function obterUsuario_() {
  var email = normalizarEmail_(Session.getActiveUser().getEmail());
  if (!email) {
    throw erroAmigavel_('SEM_CONTA', 'Não foi possível identificar sua conta. Entre com a sua conta @usp.br no navegador e abra o painel de novo.');
  }
  var perfil = permissoesDeAcesso_()[email];
  if (perfil === undefined) {
    throw erroAmigavel_('SEM_ACESSO', 'Sua conta não tem acesso a este painel. Se você precisa consultar a estrutura curricular, peça acesso ao Serviço de Graduação.');
  }
  return { email: email, papel: perfil === ACESSO.PERFIL_ADMIN ? 'admin' : 'leitor' };
}

/**
 * Garante que quem chamou é administrador; senão lança SO_ADMIN.
 * Chamada no início de toda função pública que grava na planilha.
 * @return {{email: string, papel: string}}
 */
function exigirAdmin_() {
  var u = obterUsuario_();
  if (u.papel !== 'admin') {
    throw erroAmigavel_('SO_ADMIN', 'Só a equipe responsável pela estrutura curricular pode importar arquivos e alterar a estrutura.');
  }
  return u;
}

/**
 * (1.7.0) Mapa e-mail → perfil ("ADMINISTRADOR", "LEITOR" ou "" para
 * vazio/desconhecido) lido da aba ESTRUTURA_CURRICULAR da planilha de
 * permissões. Em cache por ACESSO.CACHE_SEGUNDOS.
 */
function permissoesDeAcesso_() {
  var cache = CacheService.getScriptCache();
  var emCache = cache.get(ACESSO.CACHE);
  if (emCache) {
    try { return JSON.parse(emCache); } catch (e) { cache.remove(ACESSO.CACHE); }
  }
  var mapa = lerPermissoes_();
  try { cache.put(ACESSO.CACHE, JSON.stringify(mapa), ACESSO.CACHE_SEGUNDOS); } catch (e) { /* lista grande demais para o cache: lê a cada vez */ }
  return mapa;
}

/** Lê a aba de permissões (sem cache). Não registra e-mails em log. */
function lerPermissoes_() {
  var ss;
  try {
    ss = SpreadsheetApp.openById(idDoIndex_(ACESSO.CHAVE, ACESSO.TIPO));
  } catch (e) {
    if (e && e.amigavel) throw e;
    throw erroAmigavel_('CONFIGURACAO', 'Não foi possível abrir a planilha de permissões de acesso (chave ' + ACESSO.CHAVE + ' na planilha ID_INDEX). Confira o ID e se a conta que executa o sistema tem acesso a ela.');
  }
  var aba = ss.getSheetByName(ACESSO.ABA);
  if (!aba) throw erroAmigavel_('CONFIGURACAO', 'A planilha de permissões de acesso não tem a aba "' + ACESSO.ABA + '".');
  var cab = aba.getRange(1, 1, 1, ACESSO.COL_PERFIL).getDisplayValues()[0].map(function (t) { return semAcento_(String(t)).toLowerCase(); });
  if (cab[ACESSO.COL_EMAIL - 1].indexOf('mail') < 0 || cab[ACESSO.COL_PERFIL - 1].indexOf('perfil') < 0) {
    throw erroAmigavel_('CONFIGURACAO', 'Na aba "' + ACESSO.ABA + '" da planilha de permissões, a coluna C deve ser o e-mail e a coluna E o Perfil (linha 1 = títulos).');
  }
  var mapa = {};
  var n = aba.getLastRow() - 1;
  if (n < 1) return mapa;
  aba.getRange(2, 1, n, ACESSO.COL_PERFIL).getDisplayValues().forEach(function (l) {
    var email = normalizarEmail_(String(l[ACESSO.COL_EMAIL - 1]).replace(/\s+/g, ''));
    if (!email || email.indexOf('@') < 1) return;
    var perfil = semAcento_(String(l[ACESSO.COL_PERFIL - 1])).trim().toUpperCase();
    var normal = perfil === ACESSO.PERFIL_ADMIN || perfil === ACESSO.PERFIL_LEITOR ? perfil : '';
    // E-mail repetido: vale o MENOR acesso (uma linha de leitor não vira administrador por engano).
    if (mapa[email] !== undefined && mapa[email] !== ACESSO.PERFIL_ADMIN) return;
    mapa[email] = normal;
  });
  return mapa;
}
