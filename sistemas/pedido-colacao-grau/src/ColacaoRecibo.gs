/*=====================================================
  RECIBO E "MEUS PEDIDOS"

  Recibo só para o e-mail institucional da sessão, sem
  resposta, com protocolo, data e hora e a situação; sem RG,
  sem anexos, sem dados de cadastro. Fora da produção, o
  assunto começa com [HOMOLOGAÇÃO]. Falha no envio não
  desfaz o protocolo (D9): fica em EVENTOS e o aluno reenvia
  em "Meus pedidos".
=====================================================*/

function textoCadastroColacao_(cadastro, decisao) {
  if (decisao === "APROVADO") return "Cadastro aprovado";
  if (decisao === "REJEITADO") return "Cadastro não aprovado: fale com o Serviço de Graduação";
  if (decisao) return "Cadastro em conferência pela equipe";
  return cadastro === "CONFIRMADO" ? "Cadastro confirmado" : "Cadastro em conferência pela equipe";
}

function textoEncaminhamentoColacao_(resultado) {
  if (resultado === "ENCAMINHADO") return "Em análise pela equipe";
  if (resultado === "CORRECAO RETIDA") return "Correção em conferência pela equipe";
  if (resultado) return "Em conferência pela equipe";
  return "Aguardando encaminhamento à equipe";
}

function enviarReciboColacao_(tabelas, estado, resultado) {
  try {
    const situacao = resultado.cadastro === "CONFIRMADO" ? "recebido" : "recebido; cadastro em conferência pela equipe";
    const linhas = [
      "Olá,",
      "",
      resultado.correcao
        ? "Recebemos a correção do seu pedido de colação de grau."
        : "Recebemos o seu pedido de colação de grau.",
      "",
      "Protocolo: " + resultado.protocolo,
      "Colação: " + resultado.colacao,
      "Recebido em: " + resultado.recebidoEm + " (horário de Brasília)"
    ];
    if (resultado.correcao) linhas.push("Correção (versão " + resultado.versao + ") enviada em: " + resultado.correcaoEnviadaEm);
    linhas.push(
      "Situação: " + situacao,
      "",
      "Recebimento não é deferimento: o Serviço de Graduação ainda vai conferir os seus dados e documentos.",
      "Você acompanha o pedido em \"Meus pedidos\", no próprio formulário.",
      "",
      "Esta é uma mensagem automática; não responda.",
      "Serviço de Graduação — Instituto de Psicologia da USP"
    );
    MailApp.sendEmail({
      to: estado.email,
      subject: prefixoAmbienteColacao_() + "Pedido de colação de grau " + resultado.protocolo + " recebido",
      body: linhas.join("\n"),
      noReply: true
    });
    registrarEventoColacao_(tabelas, estado.protocoloId, estado.versao, "RECIBO_ENVIADO", []);
    return true;
  } catch (erro) {
    console.error("Recibo do pedido de colação não enviado: " + mensagemSeguraColacao_(erro));
    try { registrarEventoColacao_(tabelas, estado.protocoloId, estado.versao, "RECIBO_FALHOU", []); } catch (e) { /* só o registro de execução */ }
    return false;
  }
}

/** Lista dos pedidos da pessoa da sessão, sem IDs internos. */
function listarMeusPedidos() {
  const email = exigirSessaoColacao_();
  try {
    const { tabelas } = abrirPedidosColacao_();
    const identidade = identificarCadastroColacao_(email, "");
    const decisoes = ultimoPorProtocoloColacao_(tabelas.DECISOES_CADASTRO, "Decisão");
    const encaminhamentos = ultimoPorProtocoloColacao_(tabelas.ENCAMINHAMENTOS, "Resultado");
    return pedidosDaPessoaColacao_(tabelas, email, identidade).map(p => {
      const id = textoColacao_(p, "Protocolo ID");
      const versoes = versoesDoProtocoloColacao_(tabelas, id);
      const concluidas = versoes.filter(v => textoColacao_(v, "Situação") === "RECEBIDO");
      const ultima = versoes[versoes.length - 1];
      const recebido = textoColacao_(p, "Recebimento") === "RECEBIDO";
      return {
        protocolo: textoColacao_(p, "Protocolo"),
        colacao: colacaoLegivel_(textoColacao_(p, "Colação")),
        recebidoEm: dataHoraLegivelColacao_(textoColacao_(p, "Recebido em")),
        versao: concluidas.length ? Number(valorColacao_(concluidas[concluidas.length - 1], "Versão")) : 0,
        recebimento: recebido ? "Recebido" : "Envio incompleto: abra o formulário e envie de novo",
        correcaoIncompleta: !!(recebido && ultima && textoColacao_(ultima, "Situação") !== "RECEBIDO"),
        cadastro: textoCadastroColacao_(textoColacao_(p, "Cadastro"), decisoes[id]),
        andamento: textoEncaminhamentoColacao_(encaminhamentos[id]),
        podeReenviarRecibo: recebido
      };
    }).sort((a, b) => (a.protocolo < b.protocolo ? 1 : -1));
  } catch (erro) {
    if (erro && erro.codigoColacao) throw erro;
    console.error("Meus pedidos: " + mensagemSeguraColacao_(erro));
    throw erroColacao_("INDISPONIVEL", MENSAGENS_COLACAO.INDISPONIVEL);
  }
}

/** Reenvia o recibo de um pedido da própria pessoa (no máximo a cada 2 min). */
function reenviarComprovanteColacao(protocolo) {
  const email = exigirSessaoColacao_();
  const numero = String(protocolo || "").trim().toUpperCase();
  if (!/^PCG-\d{5}-\d{5}$/.test(numero)) throw erroColacao_("NAO_ENCONTRADO", MENSAGENS_COLACAO.NAO_ENCONTRADO);
  let tabelas, pedido, identidade;
  try {
    tabelas = abrirPedidosColacao_().tabelas;
    identidade = identificarCadastroColacao_(email, "");
    pedido = pedidosDaPessoaColacao_(tabelas, email, identidade).filter(p => textoColacao_(p, "Protocolo") === numero)[0];
  } catch (erro) {
    console.error("Reenvio de recibo: " + mensagemSeguraColacao_(erro));
    throw erroColacao_("INDISPONIVEL", MENSAGENS_COLACAO.INDISPONIVEL);
  }
  if (!pedido || textoColacao_(pedido, "Recebimento") !== "RECEBIDO") throw erroColacao_("NAO_ENCONTRADO", MENSAGENS_COLACAO.NAO_ENCONTRADO);
  const protocoloId = textoColacao_(pedido, "Protocolo ID");
  const cache = CacheService.getScriptCache();
  const chaveCache = "pcgRecibo:" + protocoloId;
  if (cache.get(chaveCache)) {
    throw erroColacao_("AGUARDE", "O comprovante acabou de ser enviado. Confira a sua caixa de entrada (e o spam) e tente de novo em alguns minutos.");
  }
  const versoes = versoesDoProtocoloColacao_(tabelas, protocoloId).filter(v => textoColacao_(v, "Situação") === "RECEBIDO");
  const ultima = versoes[versoes.length - 1];
  const versao = Number(valorColacao_(ultima, "Versão"));
  const estado = {
    email: email, protocoloId: protocoloId, versao: versao, protocolo: numero,
    recebidoEm: textoColacao_(pedido, "Recebido em"), enviadaEm: textoColacao_(ultima, "Enviada em"),
    colacao: textoColacao_(pedido, "Colação"), cadastro: textoColacao_(pedido, "Cadastro"), correcao: versao > 1
  };
  // O recibo vai sempre para o e-mail da sessão, nunca para outro.
  const enviado = comTravaColacao_(() => enviarReciboColacao_(tabelas, estado, resultadoPublicoColacao_(estado, null)));
  if (!enviado) throw erroColacao_("INDISPONIVEL", "Não foi possível enviar o comprovante agora. Tente de novo mais tarde; o seu pedido continua registrado.");
  cache.put(chaveCache, "1", COLACAO.INTERVALO_REENVIO_RECIBO_S);
  return { enviado: true };
}
