/*=====================================================
  PEDIDO DE COLAÇÃO DE GRAU 2.0 — entrada do Web App

  Funções que a página chama (google.script.run), todas com a
  sessão conferida na primeira linha:
    obterDadosIniciais()            período, identidade e pedido
                                    desta colação, se houver;
    enviarPedidoColacao(dados)      recebimento (ColacaoPedidos.gs);
    listarMeusPedidos()             "Meus pedidos" (ColacaoRecibo.gs);
    reenviarComprovanteColacao(p)   recibo de novo.
  Pelo editor, só o responsável: diagnosticarConfiguracao() e
  prepararPlanilhaPedidosColacao() (ColacaoPlanilha.gs).

  Fonte reescrita a partir do formulário legado recebido em
  06/11/2026 (Codigo(1).gs, ColacaoApp.html), sem os IDs
  literais: tudo pelo ID_INDEX. Ver
  docs/sistemas/pedido-colacao-grau/.
=====================================================*/

function doGet() {
  let titulo = "Pedido de Colação de Grau";
  try {
    titulo = prefixoAmbienteColacao_() + titulo;
    exigirSessaoColacao_();
  } catch (erro) {
    const mensagem = erro && erro.codigoColacao === "SEM_IDENTIFICACAO" ? MENSAGENS_COLACAO.SEM_IDENTIFICACAO : MENSAGENS_COLACAO.INDISPONIVEL;
    if (!(erro && erro.codigoColacao)) console.error("doGet: " + mensagemSeguraColacao_(erro));
    return HtmlService.createHtmlOutput(
      "<div style='font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:80px auto;text-align:center;color:#333;padding:0 20px;'>" +
      "<h1 style='font-size:22px'>Pedido de Colação de Grau</h1><p>" + escaparHtmlColacao_(mensagem) + "</p></div>"
    ).setTitle(titulo).addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
  return HtmlService.createTemplateFromFile("ColacaoApp")
    .evaluate()
    .setTitle(titulo)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function escaparHtmlColacao_(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function linkPainelAlunosColacao_() {
  const link = String(PropertiesService.getScriptProperties().getProperty("LINK_PAINEL_ALUNOS") || "").trim();
  return /^https:\/\/script\.google\.com\/[^\s"'<>]+$/.test(link) ? link : "";
}

// Campos que voltam para a página na correção (nunca cadastro, motivo,
// Registro ID, IDs de arquivo ou pasta).
const CAMPOS_PREENCHIMENTO_COLACAO = ["nome", "nUsp", "anoIngresso", "rg", "telefone", "emailAlternativo",
  "bachConcluiu", "licConcluiu", "psiConcluiu", "permaneceMatriculado", "habilitacaoPendente", "procuracao",
  "procuradorNome", "procuradorRg", "colacaoAntecipada", "observacoesAluno", "divergenciaApontada"];

function obterDadosIniciais() {
  const email = exigirSessaoColacao_();
  try {
    const periodo = situacaoPeriodoColacao_(new Date());
    const homologacao = ambienteColacao_() === "homologacao";
    if (periodo.erro) return { periodoErro: periodo.erro, homologacao: homologacao };

    const { tabelas } = abrirPedidosColacao_();
    const identidade = identificarCadastroColacao_(email, "");
    const pedidos = pedidosDaPessoaColacao_(tabelas, email, identidade);
    const base = {
      tituloSemestre: periodo.tituloSemestre,
      emailUsp: email,
      homologacao: homologacao,
      linkPainel: linkPainelAlunosColacao_(),
      temPedidos: pedidos.length > 0
    };
    if (!periodo.aberto) return Object.assign(base, { periodoFechado: true });

    base.identidade = identidade.situacao === "CONFIRMADO"
      ? { situacao: "CONFIRMADO", nome: identidade.nome, nUsp: identidade.nUsp, anoIngresso: identidade.anoIngresso, emailSecundario: identidade.emailSecundario }
      : { situacao: "PROVISORIO" };

    const ativo = protocoloAtivoColacao_(tabelas, pedidos, periodo.codigoColacao);
    if (ativo) base.pedidoAtual = resumoPedidoAtualColacao_(tabelas, email, ativo);
    else {
      // Sem pedido ativo: se o último desta colação foi rejeitado, a página
      // avisa no topo do formulário (decisão do responsável, 11/11/2026).
      const motivos = motivosRejeicaoColacao_(tabelas.DECISOES_CADASTRO);
      const rejeitado = pedidos
        .filter(p => textoColacao_(p, "Colação") === periodo.codigoColacao && textoColacao_(p, "Protocolo ID") in motivos)
        .sort((a, b) => (textoColacao_(a, "Protocolo") < textoColacao_(b, "Protocolo") ? 1 : -1))[0];
      if (rejeitado) base.ultimoRejeitado = { protocolo: textoColacao_(rejeitado, "Protocolo"), motivo: motivos[textoColacao_(rejeitado, "Protocolo ID")] };
    }
    return base;
  } catch (erro) {
    if (erro && erro.codigoColacao) throw erro;
    console.error("Dados iniciais: " + mensagemSeguraColacao_(erro));
    throw erroColacao_("INDISPONIVEL", MENSAGENS_COLACAO.INDISPONIVEL);
  }
}

function resumoPedidoAtualColacao_(tabelas, email, ativo) {
  const protocoloId = textoColacao_(ativo, "Protocolo ID");
  const versoes = versoesDoProtocoloColacao_(tabelas, protocoloId);
  const concluidas = versoes.filter(v => textoColacao_(v, "Situação") === "RECEBIDO");
  const ultima = versoes[versoes.length - 1];
  const incompletaDaConta = !!(ultima && textoColacao_(ultima, "Situação") !== "RECEBIDO" &&
    normalizarEmailColacao_(valorColacao_(ultima, "E-mail da sessão")) === email);
  const referencia = incompletaDaConta || !concluidas.length ? ultima : concluidas[concluidas.length - 1];
  const resumo = {
    protocolo: textoColacao_(ativo, "Protocolo"),
    recebidoEm: dataHoraLegivelColacao_(textoColacao_(ativo, "Recebido em")),
    recebido: textoColacao_(ativo, "Recebimento") === "RECEBIDO",
    dados: {},
    documentosMantidos: [],
    podeCorrigir: false,
    chaveIncompleta: ""
  };
  if (referencia) {
    try {
      const dados = JSON.parse(String(valorColacao_(referencia, "Dados do pedido")) || "{}");
      CAMPOS_PREENCHIMENTO_COLACAO.forEach(c => { if (c in dados) resumo.dados[c] = dados[c]; });
    } catch (erro) { /* sem pré-preenchimento */ }
  }
  documentosVigentesColacao_(tabelas, protocoloId, versoes).forEach(d => {
    const tipo = textoColacao_(d, "Tipo");
    if (resumo.documentosMantidos.indexOf(tipo) === -1) resumo.documentosMantidos.push(tipo);
  });
  // Envio desta conta que não terminou: a página retoma com a mesma chave.
  if (incompletaDaConta) {
    resumo.chaveIncompleta = textoColacao_(ultima, "Chave de envio");
  }
  try {
    resumo.podeCorrigir = correcaoPermitidaPelaEquipeColacao_(textoColacao_(ativo, "Registro ID"));
  } catch (erro) {
    console.error("Regra D3 indisponível: " + mensagemSeguraColacao_(erro));
    resumo.podeCorrigir = false;
  }
  return resumo;
}
