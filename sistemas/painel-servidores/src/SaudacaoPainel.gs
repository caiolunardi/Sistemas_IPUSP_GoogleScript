/*=====================================================
  SAUDAÇÃO — "Bom dia, {nome}" no cabeçalho
=====================================================*/

// O nome sai do e-mail que AcessoPainel.gs já identificou, procurado nos
// cadastros de pessoas do ID_INDEX (primeira aba, títulos na linha 1,
// comparados sem acento, espaço nem pontuação):
//
//   SERVIDORES         E-MAIL · NOME · Setor · TIPO (SERVIDOR/SETOR) · eMail Secundario
//   PLANILHA_DOCENTES  E-mail · NOME · M / F · eMail Secundario
//
// Servidor: primeiro nome. Setor (TIPO = SETOR ou NOME vazio): nome do
// setor inteiro. Docente: Prof./Profª. (pela coluna M / F) + primeiro
// nome. Nome em maiúsculas vira "Maria". Vale primeiro o e-mail
// principal, depois o secundário; servidores antes de docentes.
//
// Não achou, ou um cadastro não abriu: a saudação fica sem nome e o
// painel abre normalmente. O período do dia (bom dia/boa tarde/boa
// noite) é calculado no navegador. Os nomes ficam em cache por 10 min
// e não vão para o log; a página recebe só o nome de quem a abriu.
const SAUDACAO_PAINEL = {
  CADASTROS: [
    { chave: "SERVIDORES", email: "email", nome: "nome", setor: "setor", tipo: "tipo", secundario: "emailsecundario" },
    { chave: "PLANILHA_DOCENTES", email: "email", nome: "nome", genero: "mf", secundario: "emailsecundario" }
  ],
  CACHE: "nomesPainelServidores",
  CACHE_SEGUNDOS: 600,
  PALAVRAS_MINUSCULAS: ["de", "da", "do", "das", "dos", "e"]
};

/** Nome para o scriptlet do Painel.html, como JSON ("" se não achar). */
function saudacaoParaPagina_() {
  let nome = "";
  try {
    const email = normalizarEmailPainel_(Session.getActiveUser().getEmail());
    if (email) nome = nomesDoPainel_()[email] || "";
  } catch (erro) {
    console.warn("Saudação sem nome: " + (erro && erro.message));
  }
  return JSON.stringify(nome).replace(/</g, "\\u003c");
}

function nomesDoPainel_() {
  const cache = CacheService.getScriptCache();
  const emCache = cache.get(SAUDACAO_PAINEL.CACHE);
  if (emCache) {
    try { return JSON.parse(emCache); } catch (erro) { cache.remove(SAUDACAO_PAINEL.CACHE); }
  }
  const principais = {}, secundarios = {};
  SAUDACAO_PAINEL.CADASTROS.forEach(cadastro => {
    try {
      lerNomesDoCadastro_(cadastro, principais, secundarios);
    } catch (erro) {
      console.warn("Saudação: cadastro " + cadastro.chave + " não lido: " + (erro && erro.message));
    }
  });
  const mapa = {};
  Object.keys(secundarios).forEach(email => { mapa[email] = secundarios[email]; });
  Object.keys(principais).forEach(email => { mapa[email] = principais[email]; });
  try { cache.put(SAUDACAO_PAINEL.CACHE, JSON.stringify(mapa), SAUDACAO_PAINEL.CACHE_SEGUNDOS); } catch (erro) { /* grande demais: lê a cada vez */ }
  return mapa;
}

function tituloSaudacao_(texto) {
  return normalizarSemAcento_(texto).replace(/[^a-z0-9]/g, "");
}

function lerNomesDoCadastro_(cadastro, principais, secundarios) {
  const valores = SpreadsheetApp.openById(idNoIndicePainel_(cadastro.chave)).getSheets()[0].getDataRange().getDisplayValues();
  const titulos = (valores[0] || []).map(tituloSaudacao_);
  const col = {};
  ["email", "nome", "setor", "tipo", "genero", "secundario"].forEach(campo => {
    if (cadastro[campo]) col[campo] = titulos.indexOf(cadastro[campo]);
  });
  if (col.email < 0 || col.nome < 0) throw new Error("faltam as colunas de e-mail ou NOME");
  const celula = (linha, campo) => (col[campo] >= 0 ? String(linha[col[campo]] || "").trim() : "");
  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const nome = nomeParaSaudacao_(cadastro, celula(linha, "nome"), celula(linha, "setor"), celula(linha, "tipo"), celula(linha, "genero"));
    if (!nome) continue;
    const email = normalizarEmailPainel_(celula(linha, "email"));
    if (email && principais[email] === undefined) principais[email] = nome;
    const outro = normalizarEmailPainel_(celula(linha, "secundario"));
    if (outro && secundarios[outro] === undefined) secundarios[outro] = nome;
  }
}

function nomeParaSaudacao_(cadastro, nome, setor, tipo, genero) {
  if (cadastro.tipo !== undefined && (normalizarSemAcento_(tipo) === "setor" || !nome)) {
    return capitalizarSaudacao_(nome || setor);
  }
  const primeiro = capitalizarSaudacao_(nome.split(/\s+/)[0] || "");
  if (!primeiro || cadastro.genero === undefined) return primeiro;
  const g = normalizarSemAcento_(genero);
  const tratamento = g === "f" ? "Profª." : g === "m" ? "Prof." : "";
  return tratamento ? tratamento + " " + primeiro : primeiro;
}

// "MARIA" → "Maria"; "SERVIÇO DE GRADUAÇÃO" → "Serviço de Graduação".
// Texto que já tem minúsculas fica como está.
function capitalizarSaudacao_(texto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().split(" ").map((palavra, i) =>
    i > 0 && SAUDACAO_PAINEL.PALAVRAS_MINUSCULAS.indexOf(palavra) > -1
      ? palavra
      : palavra.charAt(0).toUpperCase() + palavra.slice(1)
  ).join(" ");
}
