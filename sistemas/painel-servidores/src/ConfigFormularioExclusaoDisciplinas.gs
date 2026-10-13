/*=====================================================
  FORMULÁRIO DE EXCLUSÃO DE DISCIPLINAS — configuração própria

  Usa a mesma estrutura de 1º/2º semestre dos formulários
  Sazonal comuns (abertura/encerramento, data+hora) — por
  isso reaproveita semestreVazio_/semestreCompleto_/
  validarHoraHhMm_ (ConfigCore.gs) e as colunas D-K genéricas
  (ConfigFormulariosCore.gs). A diferença é que cada semestre
  completo também PRECISA das datas de início/fim da
  retificação de matrícula (N/O para o 1º semestre, P/Q para
  o 2º) — sem elas, o texto do requerimento fica incompleto
  no formulário do aluno.

  Não existe toggle Sazonal/Contínuo aqui: esse formulário
  nunca faz sentido como Contínuo (sempre existe uma janela e
  uma retificação associada a ela), então o tipo gravado é
  sempre "sazonal", como na Colação de Grau.

  Também não existe campo de "Semestre atual" (a coluna de
  Semestre da Colação não é usada por este formulário): o
  script do próprio Formulário de Exclusão de Disciplinas
  calcula o número do semestre pela janela que bateu (1º ou
  2º) e o ano pela própria data de abertura daquele semestre.

  TEXTO PURO NAS CÉLULAS DE DATA/HORA: diferente do motor
  genérico (que grava abertura/encerramento como Date de
  verdade), aqui TODAS as células de data e hora são gravadas
  como texto puro via gravarCelulaTexto_ (ConfigCore.gs).
  Motivo: o script do próprio Formulário de Exclusão de
  Disciplinas lê essas colunas fazendo "dd/mm/aaaa".split("/")
  pra decidir se está aberto e pra montar o texto do
  requerimento; se o Sheets converter a célula sozinho pra um
  valor de Data/Hora, esse split para de funcionar.

  Nenhuma regra mudou durante a modularização — só organização.
=====================================================*/

// N/O/P/Q — início/fim da retificação de matrícula do Calendário
// Escolar da USP pro 1º e 2º semestre, respectivamente.
const COL_PERIODOS_SEM1_RETIF_INICIO = 14; // N
const COL_PERIODOS_SEM1_RETIF_FIM = 15;    // O
const COL_PERIODOS_SEM2_RETIF_INICIO = 16; // P
const COL_PERIODOS_SEM2_RETIF_FIM = 17;    // Q

function salvarConfigExclusaoDisciplinas(dados) {

  if (!dados || !dados.linha || !dados.indicador) {
    throw new Error("Dados do formulário incompletos.");
  }

  if (String(dados.indicador).trim() !== INDICADOR_EXCLUSAO_DISCIPLINAS) {
    throw new Error("Esse endpoint é exclusivo do Formulário de Exclusão de Disciplinas.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAbaPeriodos_();
    const linha = dados.linha;

    const indicadorAtual = String(aba.getRange(linha, COL_PERIODOS_INDICADOR).getValue() || "").trim();
    if (indicadorAtual !== INDICADOR_EXCLUSAO_DISCIPLINAS) {
      throw new Error(
        "Esse formulário mudou de posição na planilha de Períodos desde que você abriu essa tela. " +
        "Recarregue a lista e tente de novo."
      );
    }

    const sem1 = dados.sem1 || {};
    const sem2 = dados.sem2 || {};

    if (!semestreVazio_(sem1) && !semestreCompleto_(sem1)) {
      throw new Error("Preencha data e horário de abertura e de encerramento do 1º semestre, ou deixe os quatro campos em branco.");
    }
    if (!semestreVazio_(sem2) && !semestreCompleto_(sem2)) {
      throw new Error("Preencha data e horário de abertura e de encerramento do 2º semestre, ou deixe os quatro campos em branco.");
    }
    if (!semestreCompleto_(sem1) && !semestreCompleto_(sem2)) {
      throw new Error("Precisa ter pelo menos um semestre (1º ou 2º) com abertura e encerramento preenchidos.");
    }
    if (semestreCompleto_(sem1) && (!String(sem1.retifInicio || "").trim() || !String(sem1.retifFim || "").trim())) {
      throw new Error("Informe também o início e o fim da retificação do 1º semestre.");
    }
    if (semestreCompleto_(sem2) && (!String(sem2.retifInicio || "").trim() || !String(sem2.retifFim || "").trim())) {
      throw new Error("Informe também o início e o fim da retificação do 2º semestre.");
    }

    // Sempre Sazonal — ver comentário no topo desta seção.
    aba.getRange(linha, COL_PERIODOS_TIPO).setValue(VALOR_TIPO_SAZONAL);

    if (semestreCompleto_(sem1)) {
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA), validarDataBrTexto_(sem1.aberturaData, "1º semestre — abertura"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_HORA), validarHoraHhMm_(sem1.aberturaHora, "1º semestre — abertura"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_DATA), validarDataBrTexto_(sem1.fechamentoData, "1º semestre — encerramento"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_HORA), validarHoraHhMm_(sem1.fechamentoHora, "1º semestre — encerramento"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_RETIF_INICIO), validarDataBrTexto_(sem1.retifInicio, "1º semestre — início da retificação"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM1_RETIF_FIM), validarDataBrTexto_(sem1.retifFim, "1º semestre — fim da retificação"));
    } else {
      aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA, 1, 4).clearContent();
      aba.getRange(linha, COL_PERIODOS_SEM1_RETIF_INICIO, 1, 2).clearContent();
    }

    if (semestreCompleto_(sem2)) {
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_DATA), validarDataBrTexto_(sem2.aberturaData, "2º semestre — abertura"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_HORA), validarHoraHhMm_(sem2.aberturaHora, "2º semestre — abertura"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_FECHAMENTO_DATA), validarDataBrTexto_(sem2.fechamentoData, "2º semestre — encerramento"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_FECHAMENTO_HORA), validarHoraHhMm_(sem2.fechamentoHora, "2º semestre — encerramento"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_RETIF_INICIO), validarDataBrTexto_(sem2.retifInicio, "2º semestre — início da retificação"));
      gravarCelulaTexto_(aba.getRange(linha, COL_PERIODOS_SEM2_RETIF_FIM), validarDataBrTexto_(sem2.retifFim, "2º semestre — fim da retificação"));
    } else {
      aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_DATA, 1, 4).clearContent();
      aba.getRange(linha, COL_PERIODOS_SEM2_RETIF_INICIO, 1, 2).clearContent();
    }

    return { sucesso: true };

  } finally {
    lock.releaseLock();
  }

}
