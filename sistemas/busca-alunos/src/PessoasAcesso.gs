/*=====================================================
  ACESSO (v1.4) — quem pode usar o Gerenciador de Pessoas
  (Comunidade IPUSP) e o que cada perfil pode fazer

  Até a v1.3 a página entregava o cadastro inteiro (alunos,
  docentes, servidores e setores) a quem conseguisse abri-la; só a
  gravação da ficha conferia alguma coisa (ser editor da planilha).
  Por isso o projeto ficou em "Somente eu". A partir da v1.4 a
  autorização é feita aqui, no servidor, antes de abrir qualquer
  cadastro, e não depende da configuração "Quem pode acessar" nem de
  a URL ser desconhecida.

  A lista fica numa planilha, não no código:

    ID_INDEX › PERMISSOES_DE_ACESSO
      › aba PESSOAS_IPUSP (nome já registrado na planilha SISTEMAS),
        linha 1 = títulos; da linha 2 em diante:
        A = N. USP (vazio para conta de setor) · B = Nome ·
        C = e-mail · D = Observação · E = Perfil.

  Perfis:
    LEITOR         → busca, abre a ficha (sem editar) e exporta a
                     lista que está na tela (CSV e PDF);
    ADMINISTRADOR  → além disso, salva a ficha. Para salvar continua
                     valendo a regra da v1.1: a conta também precisa
                     ser editora da planilha daquele cadastro. As duas
                     condições são exigidas; nenhuma substitui a outra.
  Pedidos de cadastro pendentes (fila do formulário de colação, PR 5
  do plano) NÃO existem nesta versão; quando existirem, o LEITOR não
  os verá (requisito 3 do responsável, 06/11/2026).

  Falha fechada, conferida no servidor em toda função pública, antes
  de abrir qualquer cadastro:
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

  Mesmo padrão do Gerenciador de Colação de Grau e Diplomas
  (sistemas/emissao-diplomas/src/DiplomasAcesso.gs).
=====================================================*/

const ACESSO_PESSOAS = {
  CHAVE_PERMISSOES: "PERMISSOES_DE_ACESSO",
  ABA: "PESSOAS_IPUSP",
  COL_NOME: 2,
  COL_EMAIL: 3,
  COL_OBSERVACAO: 4,
  COL_PERFIL: 5,
  LEITOR: "LEITOR",
  ADMINISTRADOR: "ADMINISTRADOR",
  CACHE_SEGUNDOS: 60
};

const MENSAGENS_ACESSO_PESSOAS = {
  SEM_IDENTIFICACAO: "Não foi possível identificar a sua conta. Entre com a sua conta institucional @usp.br no navegador e abra a página de novo.",
  SEM_ACESSO: "A sua conta não tem acesso à Comunidade IPUSP. Se você precisa usá-la, peça acesso ao responsável pelo Serviço de Graduação.",
  ACESSO_INDISPONIVEL: "Não foi possível conferir o seu acesso agora. Tente de novo em alguns minutos; se continuar, avise o responsável pelo sistema.",
  SO_LEITURA: "O seu acesso é somente de consulta. Para alterar fichas, peça o perfil de administrador ao responsável."
};

// Erro com código, para distinguir recusa de acesso de qualquer outro
// erro. A mensagem é a que a pessoa vê.
function erroAcessoPessoas_(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigoAcesso = codigo;
  return erro;
}

function chaveCachePermissoesPessoas_() {
  return "pessoasPermissoes:v1:" + ambientePessoas_();
}

function normalizarTituloAcessoPessoas_(valor) {
  return String(valor == null ? "" : valor).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function normalizarEmailPessoas_(valor) {
  return String(valor || "").replace(/[\s ​-‍﻿]+/g, "").toLowerCase();
}

function emailValidoPessoas_(email) {
  return /^[^\s@*,;]+@[^\s@*,;]+\.[^\s@*,;]+$/.test(email);
}

function emailDaSessaoPessoas_() {
  try {
    return normalizarEmailPessoas_(Session.getActiveUser().getEmail());
  } catch (erro) {
    return "";
  }
}

function lerPermissoesPessoas_() {
  const planilha = SpreadsheetApp.openById(obterIdProducao_(ACESSO_PESSOAS.CHAVE_PERMISSOES));
  const aba = planilha.getSheetByName(ACESSO_PESSOAS.ABA);
  if (!aba) throw new Error("A planilha de permissões não tem a aba " + ACESSO_PESSOAS.ABA + ".");
  if (aba.getLastColumn() < ACESSO_PESSOAS.COL_PERFIL) throw new Error("A aba " + ACESSO_PESSOAS.ABA + " precisa das colunas A a E.");
  const titulos = aba.getRange(1, 1, 1, ACESSO_PESSOAS.COL_PERFIL).getDisplayValues()[0].map(normalizarTituloAcessoPessoas_);
  if (titulos[ACESSO_PESSOAS.COL_EMAIL - 1].indexOf("mail") === -1 || titulos[ACESSO_PESSOAS.COL_PERFIL - 1].indexOf("perfil") === -1) {
    throw new Error("Na aba " + ACESSO_PESSOAS.ABA + ", a coluna C deve ser o e-mail e a coluna E o Perfil (linha 1 = títulos).");
  }
  const mapa = {};
  const linhas = aba.getLastRow() - 1;
  if (linhas < 1) return mapa;
  aba.getRange(2, 1, linhas, ACESSO_PESSOAS.COL_PERFIL).getDisplayValues().forEach(linha => {
    const email = normalizarEmailPessoas_(linha[ACESSO_PESSOAS.COL_EMAIL - 1]);
    if (!emailValidoPessoas_(email)) return;
    const perfil = normalizarTituloAcessoPessoas_(linha[ACESSO_PESSOAS.COL_PERFIL - 1]).toUpperCase();
    if (perfil !== ACESSO_PESSOAS.LEITOR && perfil !== ACESSO_PESSOAS.ADMINISTRADOR) return;
    const nome = String(linha[ACESSO_PESSOAS.COL_NOME - 1] || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const observacao = String(linha[ACESSO_PESSOAS.COL_OBSERVACAO - 1] || "").replace(/\s+/g, " ").trim().slice(0, 160);
    // hasOwnProperty: um e-mail nunca casa com propriedade herdada.
    const atual = Object.prototype.hasOwnProperty.call(mapa, email) ? mapa[email] : null;
    if (!atual) { mapa[email] = { perfil: perfil, nome: nome, observacao: observacao }; return; }
    if (perfil === ACESSO_PESSOAS.LEITOR) atual.perfil = ACESSO_PESSOAS.LEITOR;
    if (!atual.nome) atual.nome = nome;
    if (!atual.observacao) atual.observacao = observacao;
  });
  return mapa;
}

function permissoesPessoas_() {
  const cache = CacheService.getScriptCache();
  const chave = chaveCachePermissoesPessoas_();
  try {
    const emCache = cache.get(chave);
    if (emCache) return JSON.parse(emCache);
  } catch (erro) { /* cache ilegível: lê de novo */ }
  const mapa = lerPermissoesPessoas_();
  try { cache.put(chave, JSON.stringify(mapa), ACESSO_PESSOAS.CACHE_SEGUNDOS); } catch (erro) { /* lista grande demais para o cache */ }
  return mapa;
}

// Uma conferência por execução: funções públicas que chamam outras não
// releem a lista.
let usuarioDaExecucaoPessoas_ = null;

/**
 * Quem está usando, o perfil e, da mesma linha da aba, nome e observação.
 * @return {{email: string, perfil: string, nome: string, observacao: string}}
 */
function usuarioAtualPessoas_() {
  if (usuarioDaExecucaoPessoas_) return usuarioDaExecucaoPessoas_;
  const email = emailDaSessaoPessoas_();
  if (!email) throw erroAcessoPessoas_("SEM_IDENTIFICACAO", MENSAGENS_ACESSO_PESSOAS.SEM_IDENTIFICACAO);
  let mapa;
  try {
    mapa = permissoesPessoas_();
  } catch (erro) {
    // Sem e-mails nem IDs no registro de execução.
    console.error("Lista de acesso do Gerenciador de Pessoas indisponível: " + mensagemSegura_(erro));
    throw erroAcessoPessoas_("ACESSO_INDISPONIVEL", MENSAGENS_ACESSO_PESSOAS.ACESSO_INDISPONIVEL);
  }
  const pessoa = Object.prototype.hasOwnProperty.call(mapa, email) ? mapa[email] : null;
  const perfil = pessoa && pessoa.perfil;
  if (perfil !== ACESSO_PESSOAS.LEITOR && perfil !== ACESSO_PESSOAS.ADMINISTRADOR) {
    throw erroAcessoPessoas_("SEM_ACESSO", MENSAGENS_ACESSO_PESSOAS.SEM_ACESSO);
  }
  usuarioDaExecucaoPessoas_ = { email: email, perfil: perfil, nome: pessoa.nome || "", observacao: pessoa.observacao || "" };
  return usuarioDaExecucaoPessoas_;
}

/** Primeira linha de toda função pública de consulta. */
function exigirLeitorPessoas_() {
  return usuarioAtualPessoas_();
}

/** Primeira linha de toda função pública que grava. */
function exigirAdministradorPessoas_() {
  const usuario = usuarioAtualPessoas_();
  if (usuario.perfil !== ACESSO_PESSOAS.ADMINISTRADOR) {
    throw erroAcessoPessoas_("SO_LEITURA", MENSAGENS_ACESSO_PESSOAS.SO_LEITURA);
  }
  return usuario;
}

/** Usado pelo doGet e pelo diagnóstico: nunca lança erro. */
function verificarAcessoParaPaginaPessoas_() {
  try {
    const usuario = usuarioAtualPessoas_();
    return { ok: true, perfil: usuario.perfil };
  } catch (erro) {
    const codigo = erro && erro.codigoAcesso;
    const conhecido = !!MENSAGENS_ACESSO_PESSOAS[codigo] && codigo !== "SO_LEITURA";
    return {
      ok: false,
      codigo: conhecido ? codigo : "ACESSO_INDISPONIVEL",
      mensagem: conhecido ? MENSAGENS_ACESSO_PESSOAS[codigo] : MENSAGENS_ACESSO_PESSOAS.ACESSO_INDISPONIVEL
    };
  }
}

/** Página de quem não pode abrir: tema GRADIP e o aviso, nenhum dado. */
function paginaSemAcessoPessoas_(acesso) {
  const pagina = HtmlService.createTemplateFromFile("PessoasSemAcesso");
  pagina.titulo = acesso.codigo === "SEM_IDENTIFICACAO" ? "Conta não identificada"
    : acesso.codigo === "SEM_ACESSO" ? "Sem acesso a esta página"
    : "Não foi possível abrir a página";
  pagina.mensagem = acesso.mensagem;
  return pagina.evaluate()
    .setTitle(prefixoAmbientePessoas_() + "Comunidade IPUSP — Serviço de Graduação")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
