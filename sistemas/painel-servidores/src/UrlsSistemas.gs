/*=====================================================
  ENDEREÇOS DOS SISTEMAS DA EQUIPE (fora do Git)
=====================================================*/

// As URLs /exec dos sistemas internos não ficam no repositório (ele é
// público). Ficam na Script Property URLS_SISTEMAS_EQUIPE, um JSON com
// uma chave por card do Painel.html, por exemplo:
//   {"PESSOAS_IPUSP":"https://script.google.com/a/macros/usp.br/s/.../exec", ...}
// Chave ausente ou URL fora de script.google.com → o card aparece como
// "Em breve". O Painel.html chama urlsSistemasParaPagina_() num
// scriptlet. Ver docs/sistemas/painel-servidores/DADOS_E_SEGURANCA.md.
const PROPRIEDADE_URLS_SISTEMAS = "URLS_SISTEMAS_EQUIPE";
const CHAVES_URLS_SISTEMAS = [
  "PESSOAS_IPUSP",
  "EMISSAO_DIPLOMAS",
  "GERENCIADOR_HABILITACOES",
  "GERENCIADOR_TRANCAMENTO_TOTAL",
  "GERENCIADOR_TRANCAMENTO_PARCIAL",
  "GERENCIADOR_BUSP",
  "GERENCIADOR_INTERCAMBISTAS",
  "GERENCIADOR_EXCLUSAO_DISCIPLINAS",
  "CONFIGURACOES_GRADE_HORARIA"
];

function lerUrlsSistemas_() {
  const bruto = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_URLS_SISTEMAS);
  if (!bruto) return {};
  let lido;
  try {
    lido = JSON.parse(bruto);
  } catch (erro) {
    console.log("URLS_SISTEMAS_EQUIPE não é um JSON válido.");
    return {};
  }
  const urls = {};
  CHAVES_URLS_SISTEMAS.forEach(chave => {
    const url = lido && typeof lido[chave] === "string" ? lido[chave].trim() : "";
    if (/^https:\/\/script\.google\.com\/[A-Za-z0-9_\-\/.]+$/.test(url)) urls[chave] = url;
  });
  return urls;
}

// JSON seguro para entrar num <script> do template (sem "<" literal).
function urlsSistemasParaPagina_() {
  return JSON.stringify(lerUrlsSistemas_()).replace(/</g, "\\u003c");
}

// Rode no editor do Apps Script depois de cadastrar a propriedade:
// mostra quais chaves estão faltando, sem imprimir as URLs.
function diagnosticarUrlsSistemas() {
  exigirAdminPainel_();
  const urls = lerUrlsSistemas_();
  const faltando = CHAVES_URLS_SISTEMAS.filter(chave => !urls[chave]);
  try { registrarManutencaoPainel_("diagnosticarUrlsSistemas", { faltando: faltando }); } catch (falha) { /* auditoria indisponível */ }
  console.log(faltando.length
    ? "Faltam (ou são inválidas) as chaves: " + faltando.join(", ")
    : "As " + CHAVES_URLS_SISTEMAS.length + " URLs estão configuradas.");
  return faltando;
}
