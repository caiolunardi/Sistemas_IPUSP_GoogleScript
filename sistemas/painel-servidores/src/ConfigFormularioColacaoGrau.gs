/*=====================================================
  PEDIDO DE COLAÇÃO DE GRAU — configuração própria

  Formulário com regra diferente dos demais: não é preso a
  "1º/2º semestre" (o preenchimento pode atravessar a virada
  do semestre — quem se forma no 2º semestre começa a
  preencher em dezembro e termina em janeiro). Por isso:
    - Não usa o toggle Sazonal/Contínuo: é sempre um período
      único definido, então o tipo gravado é sempre "sazonal".
    - Abertura/Encerramento (data+hora) reaproveitam as
      colunas D/E/F/G, que nos outros formulários representam
      o "1º semestre" (ver ConfigFormulariosCore.gs).
    - As colunas H/I/J/K (2º semestre) ficam sempre limpas
      pra esse formulário — não fazem sentido aqui.
    - Coluna M (nova) guarda o texto do semestre a que aquela
      colação se refere, sempre normalizado como "aaaa/s"
      (ex: "2026/2"), aceitando "aaaas" ou "aaaa/s" na
      digitação — ver normalizarSemestreAaaaS_ (ConfigCore.gs).

  Nenhuma regra mudou durante a modularização — só organização.
=====================================================*/

const COL_PERIODOS_SEMESTRE_COLACAO = 13; // M — coluna "Semestre" da planilha

function normalizarSemestreColacao_(valor) {
  return normalizarSemestreAaaaS_(valor, "Semestre da colação");
}

// Chamada só por salvarConfigColacao (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function salvarConfigColacaoSemAuditoria_(dados) {

  if (!dados || !dados.linha || !dados.indicador) {
    throw new Error("Dados do formulário incompletos.");
  }

  if (String(dados.indicador).trim() !== INDICADOR_COLACAO_GRAU) {
    throw new Error("Esse endpoint é exclusivo do Pedido de Colação de Grau.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAbaPeriodos_();
    const linha = dados.linha;

    const indicadorAtual = String(aba.getRange(linha, COL_PERIODOS_INDICADOR).getValue() || "").trim();
    if (indicadorAtual !== INDICADOR_COLACAO_GRAU) {
      throw new Error(
        "Esse formulário mudou de posição na planilha de Períodos desde que você abriu essa tela. " +
        "Recarregue a lista e tente de novo."
      );
    }

    // Todos os campos são obrigatórios aqui — diferente dos demais
    // formulários sazonais, colação sempre precisa ter um período e
    // um semestre definidos; não existe versão "em branco" válida.
    const aberturaData = validarDataBrParaDate_(dados.aberturaData, "Abertura");
    const aberturaHora = validarHoraHhMm_(dados.aberturaHora, "Abertura");
    const encerramentoData = validarDataBrParaDate_(dados.encerramentoData, "Encerramento");
    const encerramentoHora = validarHoraHhMm_(dados.encerramentoHora, "Encerramento");
    const semestreNormalizado = normalizarSemestreColacao_(dados.semestreColacao);

    aba.getRange(linha, COL_PERIODOS_TIPO).setValue(VALOR_TIPO_SAZONAL);
    aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA).setValue(aberturaData);
    aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_HORA).setValue(aberturaHora);
    aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_DATA).setValue(encerramentoData);
    aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_HORA).setValue(encerramentoHora);

    // Colunas de "2º semestre" não se aplicam a esse formulário.
    aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_DATA, 1, 4).clearContent();

    gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEMESTRE_COLACAO), semestreNormalizado);

    // Limpeza pontual: uma versão anterior desta função gravava por
    // engano na coluna 12 (L) em vez da 13 (M). Remove qualquer
    // resíduo deixado lá por esse bug, pra não ficar um valor velho
    // duplicado/confuso na planilha.
    if (COL_PERIODOS_SEMESTRE_COLACAO !== 12) {
      aba.getRange(linha, 12).clearContent();
    }

    return { sucesso: true, semestreColacao: semestreNormalizado };

  } finally {
    lock.releaseLock();
  }

}
