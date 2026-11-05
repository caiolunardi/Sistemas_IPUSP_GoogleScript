/*=====================================================
  ACESSO — quem pode usar o gerenciador e o que pode fazer

  O projeto é autônomo (não vinculado à planilha), roda como a conta
  institucional que implantou e fica aberto a "qualquer pessoa" na
  implantação. Por isso a autorização é toda feita aqui, no servidor.

  A lista fica numa planilha, não no código:

    ID_INDEX › PERMISSOES_DE_ACESSO
      › aba EMISSAO_DIPLOMAS, linha 1 = títulos; da linha 2 em diante:
        A = N. USP (vazio para conta de setor) · B = Nome ·
        C = e-mail · D = Observação · E = Perfil.
    Nome (B) e Observação (D) aparecem centralizados no topo da página.

  Perfis (decisão do responsável, 05/11/2026):
    LEITOR         → vê colações, alunos, detalhes, anexos e análises
                     de histórico já registradas;
    ADMINISTRADOR  → além disso, tudo que grava na planilha, cria
                     arquivo ou pasta no Drive (certificado, ofício,
                     lista de formandos, ZIP, relatórios), registra
                     análise de histórico, envia e-mail, muda etapa ou
                     exclui.

  Falha fechada, conferida no servidor em toda função pública, antes
  de abrir a planilha de diplomas:
    - e-mail da sessão vazio            → SEM_IDENTIFICACAO (negado);
    - e-mail fora da aba ou perfil
      vazio/desconhecido                → SEM_ACESSO;
    - lista que não abre, sem a aba ou
      com títulos errados               → ACESSO_INDISPONIVEL (negado);
    - LEITOR numa função que grava      → SO_LEITURA.

  A identidade vem só de Session.getActiveUser() (nunca da página).
  Com "Executar como: eu", ela só vem preenchida para contas do mesmo
  domínio de quem implantou; Session.getEffectiveUser() é sempre quem
  implantou e nunca é usado para autorizar. Linhas com coringa, grupo
  ou texto que não é um e-mail completo são ignoradas. E-mail repetido:
  vale o menor perfil (nome e observação da primeira linha que os
  tiver). A lista fica em cache por 60 s. E-mails não vão para o
  registro de execução.

  Mesmo padrão do Gerenciador de Abertura de Habilitações
  (sistemas/abertura-habilitacoes/gerenciador/src/Acesso.gs).
=====================================================*/

const ACESSO_DIPLOMAS = {
  CHAVE_PERMISSOES: "PERMISSOES_DE_ACESSO",
  ABA: "EMISSAO_DIPLOMAS",
  COL_NOME: 2,
  COL_EMAIL: 3,
  COL_OBSERVACAO: 4,
  COL_PERFIL: 5,
  LEITOR: "LEITOR",
  ADMINISTRADOR: "ADMINISTRADOR",
  CACHE_SEGUNDOS: 60
};

const MENSAGENS_ACESSO_DIPLOMAS = {
  SEM_IDENTIFICACAO: "Não foi possível identificar a sua conta. Entre com a sua conta institucional @usp.br no navegador e abra o gerenciador de novo.",
  SEM_ACESSO: "A sua conta não tem acesso ao Gerenciador de Colação de Grau e Diplomas. Se você precisa usá-lo, peça acesso ao responsável pelo Serviço de Graduação.",
  ACESSO_INDISPONIVEL: "Não foi possível conferir o seu acesso agora. Tente de novo em alguns minutos; se continuar, avise o responsável pelo sistema.",
  SO_LEITURA: "O seu acesso a este gerenciador é somente de consulta. Para alterar dados, gerar documentos, enviar e-mails ou excluir, peça o perfil de administrador ao responsável."
};

// Erro com código, para a página distinguir recusa de acesso de
// qualquer outro erro. A mensagem é a que a pessoa vê.
function erroAcessoDiplomas_(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigoAcesso = codigo;
  return erro;
}

function ambienteAcessoDiplomas_() {
  const valor = String(PropertiesService.getScriptProperties().getProperty("AMBIENTE") || "producao").trim().toLowerCase();
  return (valor === "homologacao" || valor === "homologação") ? "homologacao" : "producao";
}

function ehHomologacaoDiplomas_() {
  return ambienteAcessoDiplomas_() === "homologacao";
}

function chaveCachePermissoesDiplomas_() {
  return "diplomasPermissoes:v1:" + ambienteAcessoDiplomas_();
}

function normalizarTituloAcessoDiplomas_(valor) {
  return String(valor == null ? "" : valor).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function normalizarEmailDiplomas_(valor) {
  return String(valor || "").replace(/[\s ​-‍﻿]+/g, "").toLowerCase();
}

function emailValidoDiplomas_(email) {
  return /^[^\s@*,;]+@[^\s@*,;]+\.[^\s@*,;]+$/.test(email);
}

function emailDaSessaoDiplomas_() {
  try {
    return normalizarEmailDiplomas_(Session.getActiveUser().getEmail());
  } catch (erro) {
    return "";
  }
}

function lerPermissoesDiplomas_() {
  const planilha = SpreadsheetApp.openById(obterIdRecursoDiplomas_(ACESSO_DIPLOMAS.CHAVE_PERMISSOES, "spreadsheet"));
  const aba = planilha.getSheetByName(ACESSO_DIPLOMAS.ABA);
  if (!aba) throw new Error("A planilha de permissões não tem a aba " + ACESSO_DIPLOMAS.ABA + ".");
  if (aba.getLastColumn() < ACESSO_DIPLOMAS.COL_PERFIL) throw new Error("A aba " + ACESSO_DIPLOMAS.ABA + " precisa das colunas A a E.");
  const titulos = aba.getRange(1, 1, 1, ACESSO_DIPLOMAS.COL_PERFIL).getDisplayValues()[0].map(normalizarTituloAcessoDiplomas_);
  if (titulos[ACESSO_DIPLOMAS.COL_EMAIL - 1].indexOf("mail") === -1 || titulos[ACESSO_DIPLOMAS.COL_PERFIL - 1].indexOf("perfil") === -1) {
    throw new Error("Na aba " + ACESSO_DIPLOMAS.ABA + ", a coluna C deve ser o e-mail e a coluna E o Perfil (linha 1 = títulos).");
  }
  const mapa = {};
  const linhas = aba.getLastRow() - 1;
  if (linhas < 1) return mapa;
  aba.getRange(2, 1, linhas, ACESSO_DIPLOMAS.COL_PERFIL).getDisplayValues().forEach(linha => {
    const email = normalizarEmailDiplomas_(linha[ACESSO_DIPLOMAS.COL_EMAIL - 1]);
    if (!emailValidoDiplomas_(email)) return;
    const perfil = normalizarTituloAcessoDiplomas_(linha[ACESSO_DIPLOMAS.COL_PERFIL - 1]).toUpperCase();
    if (perfil !== ACESSO_DIPLOMAS.LEITOR && perfil !== ACESSO_DIPLOMAS.ADMINISTRADOR) return;
    const nome = String(linha[ACESSO_DIPLOMAS.COL_NOME - 1] || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const observacao = String(linha[ACESSO_DIPLOMAS.COL_OBSERVACAO - 1] || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const atual = mapa[email];
    if (!atual) { mapa[email] = { perfil: perfil, nome: nome, observacao: observacao }; return; }
    if (perfil === ACESSO_DIPLOMAS.LEITOR) atual.perfil = ACESSO_DIPLOMAS.LEITOR;
    if (!atual.nome) atual.nome = nome;
    if (!atual.observacao) atual.observacao = observacao;
  });
  return mapa;
}

function permissoesDiplomas_() {
  const cache = CacheService.getScriptCache();
  const chave = chaveCachePermissoesDiplomas_();
  try {
    const emCache = cache.get(chave);
    if (emCache) return JSON.parse(emCache);
  } catch (erro) { /* cache ilegível: lê de novo */ }
  const mapa = lerPermissoesDiplomas_();
  try { cache.put(chave, JSON.stringify(mapa), ACESSO_DIPLOMAS.CACHE_SEGUNDOS); } catch (erro) { /* lista grande demais para o cache */ }
  return mapa;
}

/**
 * Quem está usando, o perfil e, da mesma linha da aba, nome e observação.
 * @return {{email: string, perfil: string, nome: string, observacao: string}}
 */
let usuarioDaExecucaoDiplomas_ = null;

function usuarioAtualDiplomas_() {
  // Uma conferência por execução: funções públicas que chamam outras
  // não releem a lista.
  if (usuarioDaExecucaoDiplomas_) return usuarioDaExecucaoDiplomas_;
  const email = emailDaSessaoDiplomas_();
  if (!email) throw erroAcessoDiplomas_("SEM_IDENTIFICACAO", MENSAGENS_ACESSO_DIPLOMAS.SEM_IDENTIFICACAO);
  let mapa;
  try {
    mapa = permissoesDiplomas_();
  } catch (erro) {
    // Sem e-mails nem IDs no registro de execução.
    console.error("Lista de acesso do Gerenciador de Diplomas indisponível: " + String(erro && erro.message || erro).slice(0, 300));
    throw erroAcessoDiplomas_("ACESSO_INDISPONIVEL", MENSAGENS_ACESSO_DIPLOMAS.ACESSO_INDISPONIVEL);
  }
  const pessoa = mapa[email];
  const perfil = pessoa && pessoa.perfil;
  if (perfil !== ACESSO_DIPLOMAS.LEITOR && perfil !== ACESSO_DIPLOMAS.ADMINISTRADOR) {
    throw erroAcessoDiplomas_("SEM_ACESSO", MENSAGENS_ACESSO_DIPLOMAS.SEM_ACESSO);
  }
  usuarioDaExecucaoDiplomas_ = { email: email, perfil: perfil, nome: pessoa.nome || "", observacao: pessoa.observacao || "" };
  return usuarioDaExecucaoDiplomas_;
}

/** Primeira linha de toda função pública de consulta. */
function exigirLeitorDiplomas_() {
  return usuarioAtualDiplomas_();
}

/** Primeira linha de toda função pública que grava, cria arquivo, envia e-mail ou exclui. */
function exigirAdministradorDiplomas_() {
  const usuario = usuarioAtualDiplomas_();
  if (usuario.perfil !== ACESSO_DIPLOMAS.ADMINISTRADOR) {
    throw erroAcessoDiplomas_("SO_LEITURA", MENSAGENS_ACESSO_DIPLOMAS.SO_LEITURA);
  }
  return usuario;
}

/** Usado pelo doGet: nunca lança erro. */
function verificarAcessoParaPaginaDiplomas_() {
  try {
    const usuario = usuarioAtualDiplomas_();
    return { ok: true, perfil: usuario.perfil, email: usuario.email, nome: usuario.nome, observacao: usuario.observacao };
  } catch (erro) {
    const codigo = erro && erro.codigoAcesso;
    const mensagem = MENSAGENS_ACESSO_DIPLOMAS[codigo] || MENSAGENS_ACESSO_DIPLOMAS.ACESSO_INDISPONIVEL;
    return { ok: false, codigo: MENSAGENS_ACESSO_DIPLOMAS[codigo] ? codigo : "ACESSO_INDISPONIVEL", mensagem: mensagem };
  }
}

function prefixoAmbienteDiplomas_() {
  return ehHomologacaoDiplomas_() ? "[HOMOLOGAÇÃO] " : "";
}

/** Página de quem não pode abrir o gerenciador: tema GRADIP e o aviso, nenhum dado. */
function paginaSemAcessoDiplomas_(acesso) {
  const pagina = HtmlService.createTemplateFromFile("DiplomasSemAcesso");
  pagina.titulo = acesso.codigo === "SEM_IDENTIFICACAO" ? "Conta não identificada"
    : acesso.codigo === "SEM_ACESSO" ? "Sem acesso a este gerenciador"
    : "Não foi possível abrir o gerenciador";
  pagina.mensagem = acesso.mensagem;
  return pagina.evaluate()
    .setTitle(prefixoAmbienteDiplomas_() + "Gerenciador de Colação de Grau e Diplomas")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
