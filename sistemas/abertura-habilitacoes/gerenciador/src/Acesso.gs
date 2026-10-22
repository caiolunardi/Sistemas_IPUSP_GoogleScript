/*=====================================================
  ACESSO — quem pode usar o gerenciador e o que pode fazer

  A lista fica numa planilha, não no código:

    ID_INDEX › PERMISSOES_DE_ACESSO (mesma planilha do Painel dos
    servidores e da Estrutura Curricular)
      › aba GERENCIADOR_HABILITACOES, linha 1 = títulos; da linha 2 em
        diante: A = N. USP · B = Nome · C = e-mail · D = Observação ·
        E = Perfil (mesmo formato da aba PAINEL_SERVIDORES). Nome (B) e
        Observação (D) aparecem no cabeçalho da página e na auditoria.

  Perfis (proposta técnica; quem decide a lista é o responsável):
    LEITOR         → listas, histórico, detalhes e relatórios;
    ADMINISTRADOR  → além disso, salvar observações, concluir,
                     reabrir, avisar o aluno por e-mail, preparar
                     pedido sem identificador e manutenção.

  Falha fechada, conferida no servidor em toda função pública,
  antes de abrir a planilha de respostas:
    - e-mail da sessão vazio            → SEM_IDENTIFICACAO (negado);
    - e-mail fora da aba ou perfil
      vazio/desconhecido                → SEM_ACESSO;
    - lista que não abre, sem a aba ou
      com títulos errados               → ACESSO_INDISPONIVEL (negado);
    - LEITOR numa função que grava      → SO_LEITURA.

  A identidade vem só de Session.getActiveUser() (nunca da página).
  Com "Executar como: eu", ela só vem preenchida para contas do mesmo
  domínio de quem implantou; Session.getEffectiveUser() é sempre quem
  implantou e nunca é usado para autorizar. Linhas com coringa,
  grupo ou texto que não é um e-mail completo são ignoradas. E-mail
  repetido: vale o menor perfil (nome e observação da primeira linha
  que os tiver). A lista fica em cache por 60 s. E-mails não vão para
  o registro de execução. Toda recusa é gravada na auditoria
  (AuditoriaHabilitacoes.gs), sem mudar a recusa.
=====================================================*/

const ACESSO = {
  ABA: "GERENCIADOR_HABILITACOES",
  COL_NOME: 2,
  COL_EMAIL: 3,
  COL_OBSERVACAO: 4,
  COL_PERFIL: 5,
  LEITOR: "LEITOR",
  ADMINISTRADOR: "ADMINISTRADOR",
  CACHE_SEGUNDOS: 60
};

const MENSAGENS_ACESSO = {
  SEM_IDENTIFICACAO: "Não foi possível identificar a sua conta. Entre com a sua conta institucional @usp.br no navegador e abra o gerenciador de novo.",
  SEM_ACESSO: "A sua conta não tem acesso ao Gerenciador de Abertura de Habilitações. Se você precisa usá-lo, peça acesso ao responsável pelo Serviço de Graduação.",
  ACESSO_INDISPONIVEL: "Não foi possível conferir o seu acesso agora. Tente de novo em alguns minutos; se continuar, avise o responsável pelo sistema.",
  SO_LEITURA: "O seu acesso a este gerenciador é somente de consulta. Para alterar pedidos ou avisar alunos, peça o perfil de administrador ao responsável."
};

// "v2": desde a 2.1 o cache guarda também nome e observação.
function chaveCachePermissoes_(ambiente) {
  return "habilitacoesPermissoes:v2:" + ambiente;
}

function normalizarEmail_(valor) {
  return String(valor || "").replace(/[\s ​-‍﻿]+/g, "").toLowerCase();
}

function emailValido_(email) {
  return /^[^\s@*,;]+@[^\s@*,;]+\.[^\s@*,;]+$/.test(email);
}

function emailDaSessao_() {
  try {
    return normalizarEmail_(Session.getActiveUser().getEmail());
  } catch (erro) {
    return "";
  }
}

function lerPermissoes_() {
  const aba = abrirPlanilhaPorChave_(CONFIG.CHAVE_PERMISSOES).getSheetByName(ACESSO.ABA);
  if (!aba) throw new Error("A planilha de permissões não tem a aba " + ACESSO.ABA + ".");
  if (aba.getLastColumn() < ACESSO.COL_PERFIL) throw new Error("A aba " + ACESSO.ABA + " precisa das colunas A a E.");
  const titulos = aba.getRange(1, 1, 1, ACESSO.COL_PERFIL).getDisplayValues()[0].map(normalizarTitulo_);
  if (titulos[ACESSO.COL_EMAIL - 1].indexOf("mail") === -1 || titulos[ACESSO.COL_PERFIL - 1].indexOf("perfil") === -1) {
    throw new Error("Na aba " + ACESSO.ABA + ", a coluna C deve ser o e-mail e a coluna E o Perfil (linha 1 = títulos).");
  }
  const mapa = {};
  const linhas = aba.getLastRow() - 1;
  if (linhas < 1) return mapa;
  aba.getRange(2, 1, linhas, ACESSO.COL_PERFIL).getDisplayValues().forEach(linha => {
    const email = normalizarEmail_(linha[ACESSO.COL_EMAIL - 1]);
    if (!emailValido_(email)) return;
    const perfil = normalizarTitulo_(linha[ACESSO.COL_PERFIL - 1]).toUpperCase();
    if (perfil !== ACESSO.LEITOR && perfil !== ACESSO.ADMINISTRADOR) return;
    const nome = String(linha[ACESSO.COL_NOME - 1] || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const observacao = String(linha[ACESSO.COL_OBSERVACAO - 1] || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const atual = mapa[email];
    if (!atual) { mapa[email] = { perfil: perfil, nome: nome, observacao: observacao }; return; }
    if (perfil === ACESSO.LEITOR) atual.perfil = ACESSO.LEITOR;
    if (!atual.nome) atual.nome = nome;
    if (!atual.observacao) atual.observacao = observacao;
  });
  return mapa;
}

function permissoes_() {
  const ambiente = ambiente_();
  const cache = CacheService.getScriptCache();
  try {
    const emCache = cache.get(chaveCachePermissoes_(ambiente));
    if (emCache) return JSON.parse(emCache);
  } catch (erro) { /* cache ilegível: lê de novo */ }
  const mapa = lerPermissoes_();
  try { cache.put(chaveCachePermissoes_(ambiente), JSON.stringify(mapa), ACESSO.CACHE_SEGUNDOS); } catch (erro) { /* lista grande demais */ }
  return mapa;
}

/**
 * Quem está usando, o perfil e, da mesma linha da aba, nome e observação.
 * Não grava recusa: quem grava é exigirLeitor_/exigirAdministrador_.
 * @return {{email: string, perfil: string, nome: string, observacao: string}}
 */
function usuarioAtual_() {
  const email = emailDaSessao_();
  if (!email) throw erroGerenciador_("SEM_IDENTIFICACAO", MENSAGENS_ACESSO.SEM_IDENTIFICACAO);
  let mapa;
  try {
    mapa = permissoes_();
  } catch (erro) {
    console.error("Lista de acesso indisponível: " + textoParaLog_(erro && erro.message));
    throw erroGerenciador_("ACESSO_INDISPONIVEL", MENSAGENS_ACESSO.ACESSO_INDISPONIVEL);
  }
  const pessoa = mapa[email];
  const perfil = pessoa && pessoa.perfil;
  if (perfil !== ACESSO.LEITOR && perfil !== ACESSO.ADMINISTRADOR) {
    throw erroGerenciador_("SEM_ACESSO", MENSAGENS_ACESSO.SEM_ACESSO);
  }
  return { email: email, perfil: perfil, nome: pessoa.nome || "", observacao: pessoa.observacao || "" };
}

// A recusa vai para a auditoria antes de subir; se a auditoria falhar,
// a recusa continua igual.
function recusarComAuditoria_(erro) {
  try { registrarRecusaHabilitacoes_(erro); } catch (falha) { /* auditoria indisponível */ }
  return erro;
}

/** Primeira linha de toda função pública de consulta. */
function exigirLeitor_() {
  try {
    return usuarioAtual_();
  } catch (erro) {
    throw recusarComAuditoria_(erro);
  }
}

/** Primeira linha de toda função pública que grava, envia e-mail ou faz manutenção. */
function exigirAdministrador_() {
  const usuario = exigirLeitor_();
  if (usuario.perfil !== ACESSO.ADMINISTRADOR) throw recusarComAuditoria_(erroGerenciador_("SO_LEITURA", MENSAGENS_ACESSO.SO_LEITURA));
  return usuario;
}

/** Usado pelo doGet: nunca lança erro. */
function verificarAcessoParaPagina_() {
  try {
    const usuario = usuarioAtual_();
    return { ok: true, perfil: usuario.perfil, email: usuario.email, nome: usuario.nome, observacao: usuario.observacao };
  } catch (erro) {
    const codigo = codigoDoErro_(erro);
    const mensagem = MENSAGENS_ACESSO[codigo] || MENSAGENS_ACESSO.ACESSO_INDISPONIVEL;
    return { ok: false, codigo: MENSAGENS_ACESSO[codigo] ? codigo : "ACESSO_INDISPONIVEL", mensagem: mensagem };
  }
}

/** Página de quem não pode abrir o gerenciador: tema GRADIP e o aviso, nenhum dado. */
function paginaSemAcesso_(acesso) {
  const pagina = HtmlService.createTemplateFromFile("GerenciadorSemAcesso");
  pagina.titulo = acesso.codigo === "SEM_IDENTIFICACAO" ? "Conta não identificada"
    : acesso.codigo === "SEM_ACESSO" ? "Sem acesso a este gerenciador"
    : "Não foi possível abrir o gerenciador";
  pagina.mensagem = acesso.mensagem;
  return pagina.evaluate()
    .setTitle(prefixoAmbiente_() + "Gerenciador de Abertura de Habilitações")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
