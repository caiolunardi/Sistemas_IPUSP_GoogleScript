/*=====================================================
  UTILIDADES — texto, datas e respostas para a página
  (mesmas regras da versão 1.0, salvo onde indicado)
=====================================================*/

const TAMANHO_MAXIMO_OBSERVACOES = 2000;

// Nunca null/undefined nem tipo especial do Sheets: sempre texto.
function textoSeguro_(valor) {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return formatarDataParaExibicao_(valor);
  return String(valor);
}

// Texto livre que vai para a planilha: sem caracteres de controle e
// sem começar com = + - @ (não vira fórmula). O limite é conferido
// antes, em quem chama (2.0: texto longo é recusado, não cortado).
function sanitizarTextoPlano_(valor) {
  let texto = (valor === null || valor === undefined) ? "" : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  texto = texto.trim();
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto.slice(0, TAMANHO_MAXIMO_OBSERVACOES + 1);
}

// Critério da versão 1.0, mantido: Situação (coluna K) que contém
// "conclu" (sem diferença de maiúsculas) é concluída; qualquer outro
// valor, inclusive vazio, é pendente.
function estaConcluido_(valorSituacao) {
  return String(valorSituacao || "").trim().toLowerCase().indexOf("conclu") !== -1;
}

// Saudação e datas sempre no fuso de Brasília, nunca pelo relógio do projeto.
function saudacaoAtual_() {
  const hora = Number(Utilities.formatDate(new Date(), TIMEZONE, "H"));
  if (hora >= 0 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

function formatarDataParaExibicao_(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? "" : Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy HH:mm");
  }
  return String(valor);
}

// Date real ou texto "dd/mm/aaaa[ hh:mm[:ss]]" → número para ordenar;
// 0 quando não dá para interpretar (a linha vai para o fim).
function timestampSeguro_(valor) {
  if (valor instanceof Date) return isNaN(valor.getTime()) ? 0 : valor.getTime();
  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
    Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)).getTime();
}

// Ano e ano-mês de uma data (Date ou texto com dd/mm/aaaa em qualquer
// ponto), para os relatórios. null quando não há data reconhecível.
function extrairAnoMes_(valorData) {
  let data = null;
  if (valorData instanceof Date) {
    data = valorData;
  } else if (valorData) {
    const m = String(valorData).trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) data = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  if (!data || isNaN(data.getTime())) return null;
  return {
    ano: Utilities.formatDate(data, TIMEZONE, "yyyy"),
    anoMes: Utilities.formatDate(data, TIMEZONE, "yyyy-MM")
  };
}

// Comparação de busca: sem diferença de maiúsculas nem de acentos (2.0).
function normalizarBusca_(texto) {
  return semAcento_(texto).toLowerCase();
}

/**
 * Última barreira antes de devolver à página: um ciclo JSON puro.
 * Um Date ou outro valor não serializável numa resposta de
 * google.script.run faz a página receber null sem erro nenhum.
 */
function paraPagina_(valor, contexto) {
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch (erro) {
    console.error("Falha ao preparar a resposta (" + contexto + ").");
    throw erroGerenciador_("SERIALIZACAO", "Não foi possível preparar a resposta (" + contexto + "). Avise o responsável pelo sistema.");
  }
}

function travar_(milissegundos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(milissegundos)) {
    throw erroGerenciador_("TRAVA_OCUPADA", "Outra gravação está em andamento. Aguarde alguns segundos e tente de novo.");
  }
  return lock;
}
