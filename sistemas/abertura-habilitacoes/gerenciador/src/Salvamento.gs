/*=====================================================
  SALVAMENTO — observações, concluir/reabrir e aviso por e-mail

  Opções independentes, como na versão 1.0:
    - Observações (coluna J): gravadas a cada salvamento;
    - "Concluir solicitação" marcado   → K = "Concluído" e Data de
      Conclusão = agora (2.0: se o pedido JÁ estava concluído, a data
      existente é mantida);
    - "Concluir solicitação" desmarcado → K = "pendente" (é assim que
      um pedido concluído é reaberto; a Data de Conclusão antiga fica,
      como na 1.0). "pendente" em minúsculas é o valor que o Painel
      dos servidores conta como pendência;
    - "Avisar aluno por e-mail" envia o aviso, concluindo ou não.

  Concorrência (mesmo desenho da 1.0, sem a janela de corrida):
    1. dentro da trava: confere a Versão, valida tudo e, só então,
       grava Versão + 1, observações, situação e a reserva
       "ENVIANDO… data" (se for avisar). Nada é gravado quando o
       pedido é recusado (na 1.0, as observações eram gravadas antes
       de recusas como "já avisado");
    2. fora da trava: o envio do e-mail (rede, lento);
    3. nova trava: a linha é achada de novo pelo Registro ID, a
       reserva vira a data do envio e a Versão sobe de novo.

  Resultados (sempre um objeto):
    { resultado: "SALVO", email: "NAO_SOLICITADO" | "ENVIADO" |
      "FALHOU" | "ENVIADO_SEM_REGISTRO", versao, ... }
    { resultado: "REENVIO_NECESSARIO", motivo: "JA_AVISADO" |
      "ENVIO_INTERROMPIDO", mensagem } — nada foi gravado; a página
      pede confirmação expressa e chama de novo com reenviar = true.
  Recusas (versão antiga, trava ocupada, sem e-mail, sem perfil)
  são erros com código; nada é gravado.

  Um e-mail nunca é dado como enviado só porque houve tentativa:
  "E-mail Enviado" só recebe a data depois que o MailApp aceitou o
  envio. A trava do script não protege contra edição manual da
  planilha nem contra o Google Forms, que grava por fora dela.
=====================================================*/

const ASSUNTO_EMAIL_ABERTURA = "Abertura de Habilitação";

function montarCorpoEmailAbertura_(primeiroNome, habilitacaoTexto) {
  return `${saudacaoAtual_()}, ${primeiroNome}.

Informo que sua habilitação de ${habilitacaoTexto} foi aberta conforme solicitado.

Atenciosamente,
Equipe do Serviço de Graduação`;
}

function enviarEmailInstitucional_(destinatario, assunto, corpo) {
  MailApp.sendEmail(destinatario, assunto, corpo, {
    name: NOME_REMETENTE,
    replyTo: EMAIL_REMETENTE
  });
}

function validarDadosDoSalvamento_(registroId, versaoEsperada, dados) {
  validarFormatoRegistroId_(registroId);
  const versao = Number(versaoEsperada);
  if (!Number.isInteger(versao) || versao < 1) {
    throw erroGerenciador_("ENTRADA", "Versão do pedido ausente ou inválida. Recarregue o pedido e tente de novo.");
  }
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw erroGerenciador_("ENTRADA", "Dados do salvamento inválidos.");
  }
  const observacoes = dados.observacoes === undefined || dados.observacoes === null ? "" : dados.observacoes;
  if (typeof observacoes !== "string") throw erroGerenciador_("ENTRADA", "As observações precisam ser texto.");
  if (observacoes.trim().length > TAMANHO_MAXIMO_OBSERVACOES) {
    throw erroGerenciador_("ENTRADA", `As observações passaram de ${TAMANHO_MAXIMO_OBSERVACOES} caracteres. Resuma o texto e salve de novo.`);
  }
  return {
    versao: versao,
    observacoes: observacoes,
    avisarAluno: dados.avisarAluno === true,
    concluirSolicitacao: dados.concluirSolicitacao === true,
    reenviar: dados.reenviar === true
  };
}

function salvarPedido(registroId, versaoEsperada, dados) {

  exigirAdministrador_();
  const pedido = validarDadosDoSalvamento_(registroId, versaoEsperada, dados);

  let reserva = "", valorAnterior = "", enderecoEmail = "", primeiroNome = "", habilitacaoTexto = "";
  let novaVersao, situacaoFinal, dataConclusaoFinal, emailEnviadoAntes;

  const lock = travar_(15000);
  try {

    const tabela = lerTabelaAtual_();
    const linha = localizarLinhaPorId_(tabela, registroId);
    const l = tabela.linhas[linha - 2];
    const versaoAtual = versaoDaLinha_(tabela, l);
    if (versaoAtual !== pedido.versao) {
      throw erroGerenciador_("CONFLITO_VERSAO",
        "Este pedido foi alterado em outra sessão depois que você o abriu. Recarregue o pedido antes de continuar; o texto que você digitou continua na tela.");
    }

    const colEmailEnviado = colunaOpcional_(tabela, "emailEnviado");
    emailEnviadoAntes = celula_(l, colEmailEnviado);

    // 1) Conferências: nada é gravado se alguma recusar.
    if (pedido.avisarAluno) {
      valorAnterior = emailEnviadoAntes;
      if (ehReserva_(valorAnterior)) {
        if (!reservaInterrompida_(valorAnterior)) {
          throw erroGerenciador_("ENVIO_EM_ANDAMENTO",
            "Já existe um envio em andamento para esse aluno (outra sessão pode estar enviando agora). Tente de novo em alguns minutos.");
        }
        if (!pedido.reenviar) {
          return paraPagina_({ resultado: "REENVIO_NECESSARIO", motivo: "ENVIO_INTERROMPIDO", versao: versaoAtual,
            mensagem: "Um envio anterior para esse aluno foi interrompido e não dá para saber se o e-mail chegou a sair." }, "salvamento");
        }
        valorAnterior = "";
      } else if (valorAnterior && !pedido.reenviar) {
        return paraPagina_({ resultado: "REENVIO_NECESSARIO", motivo: "JA_AVISADO", versao: versaoAtual,
          mensagem: `Esse aluno já foi avisado sobre esse pedido (${formatarDataParaExibicao_(valorAnterior)}).` }, "salvamento");
      }
      enderecoEmail = textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "email"))).trim();
      if (!enderecoEmail) {
        throw erroGerenciador_("SEM_EMAIL", "Esse pedido não tem e-mail cadastrado. Desmarque \"Avisar aluno por e-mail\" para salvar mesmo assim.");
      }
      if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(enderecoEmail)) {
        throw erroGerenciador_("SEM_EMAIL", "O e-mail desse pedido não parece válido. Confira a planilha ou desmarque \"Avisar aluno por e-mail\".");
      }
      // Capturados ainda dentro da trava, como texto: não dependem da
      // linha continuar no mesmo lugar depois do envio.
      primeiroNome = textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "nome"))).trim().split(" ")[0];
      habilitacaoTexto = textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "habilitacao")));
    }

    const jaConcluido = estaConcluido_(celula_(l, COL_SITUACAO_FIXA));
    const colConclusao = colunaOpcional_(tabela, "dataConclusao");
    const conclusaoExistente = celula_(l, colConclusao);

    // 2) Gravações. A Versão sobe primeiro: se uma gravação seguinte
    // falhar, quem tinha o pedido aberto recebe conflito em vez de
    // gravar por cima de um estado parcial.
    let gravou = false;
    try {
      novaVersao = versaoAtual + 1;
      gravarCelula_(tabela, linha, obterOuCriarColuna_(tabela, "versao"), novaVersao);
      gravou = true;
      gravarCelula_(tabela, linha, COL_OBSERVACOES_FIXA, sanitizarTextoPlano_(pedido.observacoes));
      if (pedido.avisarAluno) {
        reserva = novaReserva_();
        gravarCelula_(tabela, linha, obterOuCriarColuna_(tabela, "emailEnviado"), reserva);
      }
      if (pedido.concluirSolicitacao) {
        gravarCelula_(tabela, linha, COL_SITUACAO_FIXA, "Concluído");
        if (!(jaConcluido && conclusaoExistente)) {
          gravarCelula_(tabela, linha, obterOuCriarColuna_(tabela, "dataConclusao"), new Date());
        }
      } else {
        gravarCelula_(tabela, linha, COL_SITUACAO_FIXA, "pendente");
      }
      SpreadsheetApp.flush();
    } catch (erro) {
      if (!gravou) throw erro;
      if (reserva) {
        try { gravarCelula_(tabela, linha, colunaObrigatoria_(tabela, "emailEnviado"), valorAnterior || ""); } catch (e) { /* fica a reserva com data */ }
      }
      console.error("Gravação parcial em salvarPedido: " + textoParaLog_(erro && erro.message));
      throw erroGerenciador_("GRAVACAO_PARCIAL",
        "Parte das alterações pode ter sido gravada antes de um erro. Recarregue o pedido e confira antes de tentar de novo. Nenhum e-mail foi enviado.");
    }

    const lAtual = tabela.linhas[linha - 2];
    situacaoFinal = textoSeguro_(celula_(lAtual, COL_SITUACAO_FIXA));
    dataConclusaoFinal = formatarDataParaExibicao_(celula_(lAtual, colunaOpcional_(tabela, "dataConclusao")));

  } finally {
    lock.releaseLock();
  }

  const base = {
    resultado: "SALVO",
    registroId: registroId,
    versao: novaVersao,
    situacao: situacaoFinal,
    concluido: estaConcluido_(situacaoFinal),
    dataConclusao: dataConclusaoFinal,
    emailEnviado: emailEnviadoParaPagina_(emailEnviadoAntes)
  };

  if (!pedido.avisarAluno) {
    return paraPagina_(Object.assign(base, { email: "NAO_SOLICITADO" }), "salvamento");
  }

  // 3) Envio, fora da trava.
  try {
    enviarEmailInstitucional_(enderecoEmail, prefixoAmbiente_() + ASSUNTO_EMAIL_ABERTURA,
      montarCorpoEmailAbertura_(primeiroNome, habilitacaoTexto));
  } catch (erroEnvio) {
    console.error("Falha no envio do aviso: " + textoParaLog_(erroEnvio && erroEnvio.message));
    desfazerReserva_(registroId, reserva, valorAnterior);
    return paraPagina_(Object.assign(base, {
      email: "FALHOU",
      emailEnviado: emailEnviadoParaPagina_(valorAnterior),
      mensagem: "O pedido foi salvo, mas o e-mail não pôde ser enviado. Você pode tentar avisar o aluno de novo mais tarde."
    }), "salvamento");
  }

  // 4) Confirmação do envio, numa nova trava.
  const carimbo = new Date();
  try {
    const lockFinal = travar_(10000);
    try {
      const tabela = lerTabelaAtual_();
      const linha = localizarLinhaPorId_(tabela, registroId);
      gravarCelula_(tabela, linha, obterOuCriarColuna_(tabela, "emailEnviado"), carimbo);
      const versaoFinal = versaoDaLinha_(tabela, tabela.linhas[linha - 2]) + 1;
      gravarCelula_(tabela, linha, obterOuCriarColuna_(tabela, "versao"), versaoFinal);
      SpreadsheetApp.flush();
      return paraPagina_(Object.assign(base, {
        email: "ENVIADO", versao: versaoFinal, emailEnviado: formatarDataParaExibicao_(carimbo)
      }), "salvamento");
    } finally {
      lockFinal.releaseLock();
    }
  } catch (erroRegistro) {
    console.error("E-mail enviado, mas a data do envio não foi registrada: " + textoParaLog_(erroRegistro && erroRegistro.message));
    return paraPagina_(Object.assign(base, {
      email: "ENVIADO_SEM_REGISTRO",
      mensagem: "O e-mail foi enviado, mas não foi possível registrar a data do envio na planilha. Não reenvie agora: recarregue o pedido e, se precisar, avise o responsável."
    }), "salvamento");
  }

}

// Depois de falha no envio: devolve "E-mail Enviado" ao valor de antes,
// só se a célula ainda tiver a NOSSA reserva (nunca apaga o que outra
// sessão gravou). Se não conseguir, a reserva fica e, depois de 10
// minutos, conta como envio interrompido.
function desfazerReserva_(registroId, reserva, valorAnterior) {
  try {
    const lock = travar_(10000);
    try {
      const tabela = lerTabelaAtual_();
      const linha = localizarLinhaPorId_(tabela, registroId);
      const col = colunaOpcional_(tabela, "emailEnviado");
      if (col && celula_(tabela.linhas[linha - 2], col) === reserva) {
        gravarCelula_(tabela, linha, col, valorAnterior || "");
        SpreadsheetApp.flush();
      }
    } finally {
      lock.releaseLock();
    }
  } catch (erro) {
    console.error("Não foi possível desfazer a reserva de envio: " + textoParaLog_(erro && erro.message));
  }
}

/*-----------------------------------------------------
  PREPARAR UM PEDIDO SEM IDENTIFICADOR (operação expressa)
  Atribui Registro ID e Versão 1 a UMA linha, a pedido de
  quem administra, conferindo que a linha ainda é a mesma
  que estava na lista (carimbo e Nº USP). Não cria colunas:
  se Registro ID/Versão não existirem, é preciso a migração
  controlada (Migracao.gs).
------------------------------------------------------*/

function atribuirIdentificador(referencia) {
  exigirAdministrador_();
  const ref = referencia && typeof referencia === "object" ? referencia : {};
  const linha = Number(ref.linha);
  if (!Number.isInteger(linha) || linha < 2) throw erroGerenciador_("ENTRADA", "Referência do pedido inválida. Recarregue a lista.");

  const lock = travar_(15000);
  try {
    const tabela = lerTabelaAtual_();
    const colId = colunaOpcional_(tabela, "registroId");
    const colVersao = colunaOpcional_(tabela, "versao");
    if (!colId || !colVersao) {
      throw erroGerenciador_("MIGRACAO_NECESSARIA",
        "A planilha ainda não tem as colunas \"Registro ID\" e \"Versão\". Peça ao responsável a migração controlada (veja a Central de Ajuda).");
    }
    const l = tabela.linhas[linha - 2];
    const confere = l && celula_(l, colunaObrigatoria_(tabela, "nome")) &&
      timestampSeguro_(celula_(l, colunaObrigatoria_(tabela, "carimbo"))) === Number(ref.carimbo) &&
      textoSeguro_(celula_(l, colunaObrigatoria_(tabela, "nUsp"))) === String(ref.nUsp || "");
    if (!confere) {
      throw erroGerenciador_("REFERENCIA_DESATUALIZADA", "A planilha mudou desde que a lista foi carregada. Recarregue a lista e tente de novo.");
    }
    if (registroIdDaLinha_(tabela, l)) {
      throw erroGerenciador_("REFERENCIA_DESATUALIZADA", "Esse pedido já tem identificador. Recarregue a lista.");
    }
    const existentes = contarRegistroIds_(tabela);
    let novoId = Utilities.getUuid();
    while (existentes[novoId]) novoId = Utilities.getUuid();
    gravarCelula_(tabela, linha, colId, novoId);
    gravarCelula_(tabela, linha, colVersao, 1);
    SpreadsheetApp.flush();
    console.log("atribuirIdentificador: 1 pedido preparado.");
    return paraPagina_({ registroId: novoId, versao: 1 }, "identificador");
  } finally {
    lock.releaseLock();
  }
}
