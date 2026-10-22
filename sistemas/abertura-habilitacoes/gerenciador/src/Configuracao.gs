/*=====================================================
  GERENCIADOR DE ABERTURA DE HABILITAÇÕES — CONFIGURAÇÃO

  Onde ficam as coisas (nenhum ID no código):

    Script Property ID_INDEX_SPREADSHEET_ID → planilha ID_INDEX
      (primeira aba ou "Página1"; colunas achadas pelo título:
       "Chave", "ID de Produção", "Homologação…" e, se houver, "Tipo")
      › ABERTURA_HABILITACOES  planilha de respostas do formulário
                               (abas "Respostas ao formulário 2" e
                               "2021 - 2022")
      › PERMISSOES_DE_ACESSO   lista de quem usa o gerenciador
                               (aba GERENCIADOR_HABILITACOES, ver Acesso.gs)
      › AUDITORIA_ABERTURA_HABILITACOES  planilha da auditoria
                               (AuditoriaHabilitacoes.gs); sem ela,
                               nenhuma alteração é feita

    Script Property AMBIENTE (opcional):
      ausente ou "producao" → coluna "ID de Produção";
      "homologacao"         → coluna "Homologação" (cópia de testes);
      outro valor           → erro de configuração. Nunca volta para a
                              produção por engano.

  Chave ausente, repetida, sem ID ou com Tipo diferente de
  "spreadsheet" é erro de configuração (falha fechada). As mensagens
  citam só nomes de chave e de propriedade, nunca IDs.
=====================================================*/

const VERSAO_GERENCIADOR = "2.1";

const CONFIG = {
  PROP_ID_INDEX: "ID_INDEX_SPREADSHEET_ID",
  PROP_AMBIENTE: "AMBIENTE",
  ABA_INDICE: "Página1",
  CHAVE_RESPOSTAS: "ABERTURA_HABILITACOES",
  CHAVE_PERMISSOES: "PERMISSOES_DE_ACESSO",
  CHAVE_AUDITORIA: "AUDITORIA_ABERTURA_HABILITACOES",
  TIPO_PLANILHA: "spreadsheet",
  CACHE_INDICE_SEGUNDOS: 600
};

const TIMEZONE = "America/Sao_Paulo";

// Mesmo endereço institucional de resposta da versão 1.0.
const EMAIL_REMETENTE = "gradip@usp.br";
const NOME_REMETENTE = "Serviço de Graduação — IPUSP";

/*-----------------------------------------------------
  ERROS COM CÓDIGO
  A página recebe só a mensagem (google.script.run não
  leva outras propriedades do Error), então o código vai
  no começo do texto: "CODIGO: mensagem para a equipe".
------------------------------------------------------*/

function erroGerenciador_(codigo, mensagem) {
  const erro = new Error(codigo + ": " + mensagem);
  erro.codigo = codigo;
  return erro;
}

function codigoDoErro_(erro) {
  if (erro && erro.codigo) return erro.codigo;
  const m = String(erro && erro.message || erro || "").match(/^(?:Error:\s*)?([A-Z_]{4,}):/);
  return m ? m[1] : "";
}

/*-----------------------------------------------------
  AMBIENTE
------------------------------------------------------*/

function ambiente_() {
  const valor = String(PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_AMBIENTE) || "").trim().toLowerCase();
  if (!valor || valor === "producao") return "producao";
  if (valor === "homologacao") return "homologacao";
  throw erroGerenciador_("CONFIGURACAO",
    `A propriedade ${CONFIG.PROP_AMBIENTE} tem um valor desconhecido; use "producao" ou "homologacao".`);
}

// Prefixo do título da página e do assunto do e-mail fora da produção.
function prefixoAmbiente_() {
  try { return ambiente_() === "homologacao" ? "[HOMOLOGAÇÃO] " : ""; } catch (erro) { return "[CONFIGURAÇÃO INVÁLIDA] "; }
}

/*-----------------------------------------------------
  ID_INDEX
------------------------------------------------------*/

// Lido no máximo uma vez por execução; entre execuções, cache do
// script por 10 minutos (separado por ambiente).
let indiceLido_ = null;
let planilhasAbertas_ = {};

function chaveCacheIndice_(ambiente) {
  return "habilitacoesIndice:" + ambiente;
}

function semAcento_(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizarTitulo_(texto) {
  return semAcento_(texto).replace(/\s+/g, " ").trim().toLowerCase();
}

function lerIndice_(ambiente) {

  const idIndice = String(PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_ID_INDEX) || "").trim();
  if (!idIndice) {
    throw erroGerenciador_("CONFIGURACAO", `Falta a propriedade do script ${CONFIG.PROP_ID_INDEX}.`);
  }

  let planilha;
  try {
    planilha = SpreadsheetApp.openById(idIndice);
  } catch (erro) {
    throw erroGerenciador_("CONFIGURACAO",
      `Não foi possível abrir a planilha ID_INDEX. Confira a propriedade ${CONFIG.PROP_ID_INDEX} e se a conta que executa o sistema tem acesso a ela.`);
  }

  const aba = planilha.getSheetByName(CONFIG.ABA_INDICE) || planilha.getSheets()[0];
  const valores = aba ? aba.getDataRange().getDisplayValues() : [];
  if (valores.length < 2) throw erroGerenciador_("CONFIGURACAO", "A planilha ID_INDEX não tem nenhuma linha de dados.");

  const titulos = valores[0].map(normalizarTitulo_);
  const colChave = titulos.indexOf("chave");
  const colTipo = titulos.indexOf("tipo");
  const homologacao = ambiente === "homologacao";
  const colId = homologacao
    ? titulos.findIndex(t => t.indexOf("homologacao") === 0)
    : titulos.indexOf("id de producao");
  const nomeColuna = homologacao ? "Homologação" : "ID de Produção";
  if (colChave === -1 || colId === -1) {
    throw erroGerenciador_("CONFIGURACAO", `A planilha ID_INDEX precisa das colunas "Chave" e "${nomeColuna}".`);
  }

  // Guarda todas as chaves. Repetição e tipo errado ficam marcados e só
  // viram erro quando aquela chave for pedida.
  const mapa = {};
  for (let i = 1; i < valores.length; i++) {
    const chave = String(valores[i][colChave] || "").trim();
    if (!chave) continue;
    if (mapa[chave]) { mapa[chave] = { problema: "REPETIDA" }; continue; }
    const tipo = colTipo === -1 ? "" : String(valores[i][colTipo] || "").trim();
    const id = String(valores[i][colId] || "").trim();
    if (tipo && tipo !== CONFIG.TIPO_PLANILHA) mapa[chave] = { problema: "TIPO" };
    else if (!id) mapa[chave] = { problema: "VAZIA" };
    else mapa[chave] = { id: id };
  }

  indiceLido_ = { ambiente: ambiente, mapa: mapa };
  try {
    CacheService.getScriptCache().put(chaveCacheIndice_(ambiente), JSON.stringify(mapa), CONFIG.CACHE_INDICE_SEGUNDOS);
  } catch (erro) { /* sem cache: lê a cada execução */ }
  return mapa;

}

function indiceDoAmbiente_(ambiente, forcarLeitura) {
  if (!forcarLeitura && indiceLido_ && indiceLido_.ambiente === ambiente) return indiceLido_.mapa;
  if (!forcarLeitura) {
    try {
      const emCache = CacheService.getScriptCache().get(chaveCacheIndice_(ambiente));
      if (emCache) {
        const mapa = JSON.parse(emCache);
        indiceLido_ = { ambiente: ambiente, mapa: mapa };
        return mapa;
      }
    } catch (erro) { /* cache ilegível: lê de novo */ }
  }
  return lerIndice_(ambiente);
}

/** ID da planilha de uma chave do ID_INDEX, no ambiente do projeto. */
function idDaChave_(chave) {
  const ambiente = ambiente_();
  const nomeColuna = ambiente === "homologacao" ? "Homologação" : "ID de Produção";
  let item = indiceDoAmbiente_(ambiente, false)[chave];
  // Chave recém-criada (ou corrigida) que o cache ainda não conhece.
  if (!item || !item.id) item = indiceDoAmbiente_(ambiente, true)[chave];
  if (!item) throw erroGerenciador_("CONFIGURACAO", `A chave ${chave} não foi encontrada na planilha ID_INDEX.`);
  if (item.problema === "REPETIDA") throw erroGerenciador_("CONFIGURACAO", `A chave ${chave} aparece mais de uma vez na planilha ID_INDEX.`);
  if (item.problema === "TIPO") throw erroGerenciador_("CONFIGURACAO", `A chave ${chave} precisa ter o tipo "${CONFIG.TIPO_PLANILHA}" na planilha ID_INDEX.`);
  if (item.problema === "VAZIA") throw erroGerenciador_("CONFIGURACAO", `A chave ${chave} está sem "${nomeColuna}" na planilha ID_INDEX.`);
  return item.id;
}

/** Abre a planilha de uma chave uma única vez por execução. */
function abrirPlanilhaPorChave_(chave) {
  if (planilhasAbertas_[chave]) return planilhasAbertas_[chave];
  const id = idDaChave_(chave);
  try {
    planilhasAbertas_[chave] = SpreadsheetApp.openById(id);
  } catch (erro) {
    throw erroGerenciador_("CONFIGURACAO",
      `Não foi possível abrir a planilha da chave ${chave} (ID_INDEX). Confira o ID e se a conta que executa o sistema tem acesso a ela.`);
  }
  return planilhasAbertas_[chave];
}

function limparCachesDeConfiguracao_() {
  indiceLido_ = null;
  planilhasAbertas_ = {};
  try {
    const cache = CacheService.getScriptCache();
    ["producao", "homologacao"].forEach(a => {
      cache.remove(chaveCacheIndice_(a));
      cache.remove(chaveCachePermissoes_(a));
    });
  } catch (erro) { /* sem cache */ }
}

// Mensagens do Google podem trazer o ID de um documento: esconde.
function semIds_(texto) {
  return String(texto || "").replace(/[A-Za-z0-9_-]{25,}/g, "[ID omitido]");
}

// Log sem dados pessoais: e-mails e números longos também saem.
function textoParaLog_(texto) {
  return semIds_(texto)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[e-mail]")
    .replace(/\d{5,}/g, "[número]");
}
