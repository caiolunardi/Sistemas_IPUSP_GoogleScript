/*=====================================================
  PLANILHA PEDIDOS_COLACAO — leitura e gravação pelo título

  As colunas são localizadas pelo título da linha 1 (ordem
  física livre). Falta de aba ou de título nas abas deste
  projeto é falha fechada: nada é gravado e o diagnóstico
  aponta o que falta. Este projeto não cria colunas sozinho;
  a preparação (abas vazias com títulos) é uma função que
  só o responsável roda pelo editor.

  Gravação: só appendRow (uma chamada por linha, atômica) e,
  na conclusão do recebimento, a troca de RECEBENDO por
  RECEBIDO na própria linha. Nenhuma linha é apagada.
  Toda gravação acontece sob o ScriptLock deste projeto, que é
  o único que escreve nestas quatro abas.
=====================================================*/

let planilhaPedidosDaExecucao_ = null;

function abrirPedidosColacao_() {
  if (planilhaPedidosDaExecucao_) return planilhaPedidosDaExecucao_;
  const planilha = SpreadsheetApp.openById(obterIdColacao_(COLACAO.CHAVES.PEDIDOS, "spreadsheet"));
  const tabelas = {};
  Object.keys(ABAS_PEDIDOS).forEach(chave => {
    const def = ABAS_PEDIDOS[chave];
    const aba = planilha.getSheetByName(def.nome);
    if (!aba) throw new Error("PEDIDOS_COLACAO sem a aba " + def.nome + ".");
    tabelas[chave] = mapearTabelaColacao_(aba, def.colunas, def.nome);
  });
  Object.keys(ABAS_SO_LEITURA).forEach(chave => {
    const aba = planilha.getSheetByName(ABAS_SO_LEITURA[chave]);
    tabelas[chave] = aba ? mapearTabelaColacao_(aba, [], ABAS_SO_LEITURA[chave]) : null;
  });
  planilhaPedidosDaExecucao_ = { planilha: planilha, tabelas: tabelas };
  return planilhaPedidosDaExecucao_;
}

function mapearTabelaColacao_(aba, obrigatorias, nomeAba) {
  const largura = Math.max(aba.getLastColumn(), 1);
  const titulos = aba.getRange(1, 1, 1, largura).getValues()[0];
  const col = {};
  titulos.forEach((t, i) => {
    const n = normalizarTituloColacao_(t);
    if (n && !col[n]) col[n] = i + 1;
  });
  const faltando = obrigatorias.filter(t => !col[normalizarTituloColacao_(t)]);
  if (faltando.length) throw new Error("Na aba " + nomeAba + " faltam as colunas: " + faltando.join(", ") + ".");
  return { aba: aba, col: col, largura: largura };
}

function colunaColacao_(tabela, titulo) {
  const c = tabela.col[normalizarTituloColacao_(titulo)];
  if (!c) throw new Error("Coluna ausente: " + titulo);
  return c;
}

/** Linhas como objetos {__linha, <título>: valor}. */
function lerLinhasColacao_(tabela) {
  if (!tabela) return [];
  const ultima = tabela.aba.getLastRow();
  if (ultima < 2) return [];
  const largura = Math.max(tabela.aba.getLastColumn(), tabela.largura);
  const valores = tabela.aba.getRange(2, 1, ultima - 1, largura).getValues();
  const titulos = Object.keys(tabela.col);
  return valores.map((linha, i) => {
    const obj = { __linha: i + 2 };
    titulos.forEach(t => { obj[t] = linha[tabela.col[t] - 1]; });
    return obj;
  });
}

function valorColacao_(linha, titulo) {
  const v = linha[normalizarTituloColacao_(titulo)];
  return v == null ? "" : v;
}

function textoColacao_(linha, titulo) {
  return String(valorColacao_(linha, titulo)).trim();
}

// Todo texto é gravado com o apóstrofo inicial do Sheets ("é texto"):
// assim data/hora ISO, "2026/2", nº USP e colação não viram data ou
// número, e nada vira fórmula. O apóstrofo não fica no valor lido.
function literalColacao_(valor) {
  return typeof valor === "string" && valor !== "" ? "'" + valor : valor;
}

function acrescentarLinhaColacao_(tabela, valores) {
  const linha = new Array(tabela.largura).fill("");
  Object.keys(valores).forEach(titulo => { linha[colunaColacao_(tabela, titulo) - 1] = literalColacao_(valores[titulo]); });
  tabela.aba.appendRow(linha);
}

function gravarCelulaColacao_(tabela, numeroLinha, titulo, valor) {
  tabela.aba.getRange(numeroLinha, colunaColacao_(tabela, titulo)).setValue(literalColacao_(valor));
}

function registrarEventoColacao_(tabelas, protocoloId, versao, evento, campos) {
  acrescentarLinhaColacao_(tabelas.EVENTOS, {
    "Quando": agoraIsoColacao_(),
    "Protocolo ID": protocoloId || "",
    "Versão": versao || "",
    "Evento": evento,
    "Campos alterados": (campos || []).join(", ")
  });
}

/** Última decisão/resultado por Protocolo ID numa aba de outro projeto. */
function ultimoPorProtocoloColacao_(tabela, tituloValor) {
  const mapa = {};
  if (!tabela || !tabela.col[normalizarTituloColacao_("Protocolo ID")] || !tabela.col[normalizarTituloColacao_(tituloValor)]) return mapa;
  lerLinhasColacao_(tabela).forEach(l => {
    const id = textoColacao_(l, "Protocolo ID");
    if (id) mapa[id] = normalizarTituloColacao_(valorColacao_(l, tituloValor)).toUpperCase();
  });
  return mapa;
}

/*----------------------------------------------------
  Funções do responsável (só pelo editor).

  Em "Executar como: eu", quem abre a página tem a sessão
  diferente do usuário efetivo; quem roda pelo editor, não.
  Assim um aluno não consegue chamá-las pela página.
----------------------------------------------------*/

function exigirResponsavelColacao_() {
  let ativo = "";
  let efetivo = "";
  try {
    ativo = normalizarEmailColacao_(Session.getActiveUser().getEmail());
    efetivo = normalizarEmailColacao_(Session.getEffectiveUser().getEmail());
  } catch (erro) { /* abaixo */ }
  if (!ativo || ativo !== efetivo) throw erroColacao_("SO_RESPONSAVEL", "Função disponível só pelo editor do projeto.");
}

/**
 * Cria em PEDIDOS_COLACAO as abas deste projeto que ainda não existem,
 * só com a linha de títulos. Nunca altera aba existente: se faltar
 * título numa aba que já existe, só informa. Rodar pelo editor, com
 * ordem do responsável.
 */
function prepararPlanilhaPedidosColacao() {
  exigirResponsavelColacao_();
  const planilha = SpreadsheetApp.openById(obterIdColacao_(COLACAO.CHAVES.PEDIDOS, "spreadsheet"));
  const relatorio = [];
  Object.keys(ABAS_PEDIDOS).forEach(chave => {
    const def = ABAS_PEDIDOS[chave];
    const aba = planilha.getSheetByName(def.nome);
    if (!aba) {
      const nova = planilha.insertSheet(def.nome);
      nova.getRange(1, 1, 1, def.colunas.length).setValues([def.colunas]);
      nova.setFrozenRows(1);
      relatorio.push(def.nome + ": criada");
      return;
    }
    try {
      mapearTabelaColacao_(aba, def.colunas, def.nome);
      relatorio.push(def.nome + ": ok");
    } catch (erro) {
      relatorio.push(def.nome + ": " + erro.message + " (nada foi alterado)");
    }
  });
  relatorio.forEach(l => console.log(l));
  return relatorio;
}

/**
 * Confere a configuração sem imprimir IDs nem dados pessoais: chaves do
 * ID_INDEX, AMBIENTE, títulos das abas, período e pedidos parados em
 * RECEBENDO há mais de 15 minutos (só o número do protocolo).
 */
function diagnosticarConfiguracao() {
  exigirResponsavelColacao_();
  const r = { versao: COLACAO.VERSAO, ambiente: "", chaves: {}, abas: "", periodo: "", protocolos: 0, parados: [] };
  try { r.ambiente = ambienteColacao_(); } catch (erro) { r.ambiente = "ERRO: " + erro.message; }
  [[COLACAO.CHAVES.PEDIDOS, "spreadsheet"], [COLACAO.CHAVES.PASTA_PROVISORIOS, "folder"], [COLACAO.CHAVES.ALUNOS, "spreadsheet"],
    [COLACAO.CHAVES.PERIODOS, "spreadsheet"], [COLACAO.CHAVES.DIPLOMAS, "spreadsheet"]].forEach(([chave, tipo]) => {
    try { obterIdColacao_(chave, tipo); r.chaves[chave] = "ok"; } catch (erro) { r.chaves[chave] = "ERRO: " + mensagemSeguraColacao_(erro); }
  });
  try {
    const p = situacaoPeriodoColacao_(new Date());
    r.periodo = p.erro ? "ERRO: " + p.erro : (p.aberto ? "aberto" : "fechado") + ", colação " + p.codigoColacao;
  } catch (erro) { r.periodo = "ERRO: " + mensagemSeguraColacao_(erro); }
  try {
    const { tabelas } = abrirPedidosColacao_();
    r.abas = "ok" + (tabelas.DECISOES_CADASTRO ? "" : " (DECISOES_CADASTRO ainda não existe)") +
      (tabelas.ENCAMINHAMENTOS ? "" : " (ENCAMINHAMENTOS ainda não existe)");
    const protocolos = lerLinhasColacao_(tabelas.PROTOCOLOS);
    r.protocolos = protocolos.length;
    const numeroPorId = {};
    protocolos.forEach(p => { numeroPorId[textoColacao_(p, "Protocolo ID")] = textoColacao_(p, "Protocolo"); });
    const limite = Date.now() - COLACAO.MINUTOS_PEDIDO_PARADO * 60000;
    lerLinhasColacao_(tabelas.VERSOES).forEach(v => {
      const quando = Date.parse(textoColacao_(v, "Enviada em"));
      if (textoColacao_(v, "Situação") === "RECEBENDO" && quando && quando < limite) {
        r.parados.push((numeroPorId[textoColacao_(v, "Protocolo ID")] || "?") + " v" + textoColacao_(v, "Versão"));
      }
    });
  } catch (erro) { r.abas = "ERRO: " + mensagemSeguraColacao_(erro); }
  console.log(JSON.stringify(r));
  return r;
}
