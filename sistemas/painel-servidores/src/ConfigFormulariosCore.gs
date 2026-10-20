/*=====================================================
  CONFIG FORMULÁRIOS — CORE

  Motor genérico da tela "⚙️ Configurações → Formulários":
  leitura/gravação da planilha de Períodos, e o comportamento
  Sazonal/Contínuo padrão que a maioria dos formulários usa.

  Formulários com regra própria (Pedido de Colação de Grau,
  Formulário de Exclusão de Disciplinas) têm seus próprios
  arquivos — ConfigFormularioColacaoGrau.gs e
  ConfigFormularioExclusaoDisciplinas.gs — e são desviados
  para lá logo no início de salvarConfigFormulario/
  desativarFormulario, por causa dos identificadores
  INDICADOR_COLACAO_GRAU/INDICADOR_EXCLUSAO_DISCIPLINAS
  definidos abaixo.

  Nada aqui muda o comportamento que já existia — é código
  movido de Code.gs durante a modularização.
=====================================================*/

const ID_PLANILHA_PERIODOS = "CONFIGURAR_ID_PLANILHA_PERIODOS"; // valor real omitido do Git — ver docs/sistemas/painel-servidores/DADOS_E_SEGURANCA.md
const NOME_ABA_PERIODOS = "Página1";

// Colunas fixas por posição (A a K) — decisão já tomada nesse
// projeto pra essa planilha específica (ver Instruções.txt item 32:
// "preserve integralmente o comportamento atual").
const COL_PERIODOS_INDICADOR = 1;  // A — nome do formulário
const COL_PERIODOS_LINK = 2;       // B — link do Forms
const COL_PERIODOS_TIPO = 3;       // C — "sazonal" ou "continuo"
const COL_PERIODOS_SEM1_ABERTURA_DATA = 4;   // D
const COL_PERIODOS_SEM1_ABERTURA_HORA = 5;   // E
const COL_PERIODOS_SEM1_FECHAMENTO_DATA = 6; // F
const COL_PERIODOS_SEM1_FECHAMENTO_HORA = 7; // G
const COL_PERIODOS_SEM2_ABERTURA_DATA = 8;   // H
const COL_PERIODOS_SEM2_ABERTURA_HORA = 9;   // I
const COL_PERIODOS_SEM2_FECHAMENTO_DATA = 10; // J
const COL_PERIODOS_SEM2_FECHAMENTO_HORA = 11; // K

const VALOR_TIPO_CONTINUO = "continuo";
const VALOR_TIPO_SAZONAL = "sazonal";

// Identificadores dos formulários com tela própria — usados aqui só
// como GUARD (pra desviar/recusar), não pra implementar a lógica
// deles (que mora nos respectivos arquivos).
const INDICADOR_COLACAO_GRAU = "Pedido de Colação de Grau";
const INDICADOR_EXCLUSAO_DISCIPLINAS = "Formulário de Exclusão de Disciplinas";

function obterAbaPeriodos_() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA_PERIODOS);
  // Busca pelo nome real da aba primeiro; se ela for renomeada algum
  // dia, cai pra primeira aba em vez de quebrar a tela inteira.
  const aba = ss.getSheetByName(NOME_ABA_PERIODOS) || ss.getSheets()[0];
  if (!aba) throw new Error("Não encontrei nenhuma aba na planilha de Períodos.");
  return aba;
}

// Até onde a leitura/limpeza da planilha de Períodos precisa
// alcançar. Cresce automaticamente conforme os módulos de formulário
// específico forem definindo suas próprias colunas extras — em vez
// de um número mágico fixo aqui, pegamos o maior valor entre o fim
// do bloco genérico (K) e o que cada módulo específico expõe.
//
// Isso é resolvido dentro de uma FUNÇÃO (não um `const` de topo)
// de propósito: arquivos .gs do mesmo projeto compartilham escopo,
// mas a ORDEM em que o Apps Script avalia os `const` de nível
// superior de cada arquivo não é algo em que valha a pena confiar.
// Dentro de uma função, isso não importa — na hora em que qualquer
// endpoint é chamado, todos os arquivos do projeto já foram
// carregados por completo.
function obterUltimaColunaLeituraPeriodos_() {
  return Math.max(
    COL_PERIODOS_SEM2_FECHAMENTO_HORA,
    COL_PERIODOS_SEMESTRE_COLACAO,
    COL_PERIODOS_SEM2_RETIF_FIM
  );
}

// Desativa QUALQUER formulário (genérico, Colação de Grau ou
// Exclusão de Disciplinas) numa função só: limpa de D até a última
// coluna de leitura inteira. Não mexe em B (link) nem em C (tipo) —
// só limpa datas/horários/semestre, o que já é suficiente pra nenhum
// formulário achar uma janela válida.
function desativarFormulario(dados) {
  exigirAdminPainel_();

  if (!dados || !dados.linha || !dados.indicador) {
    throw new Error("Dados do formulário incompletos.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAbaPeriodos_();
    const linha = dados.linha;

    const indicadorAtual = String(aba.getRange(linha, COL_PERIODOS_INDICADOR).getValue() || "").trim();
    if (indicadorAtual !== String(dados.indicador).trim()) {
      throw new Error(
        "Esse formulário mudou de posição na planilha de Períodos desde que você abriu essa tela. " +
        "Recarregue a lista e tente de novo."
      );
    }

    const ultimaColuna = obterUltimaColunaLeituraPeriodos_();
    aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA, 1, ultimaColuna - COL_PERIODOS_SEM1_ABERTURA_DATA + 1)
      .clearContent();

    return { sucesso: true };

  } finally {
    lock.releaseLock();
  }

}

function obterFormulariosConfig() {
  exigirAcessoPainel_();

  const aba = obterAbaPeriodos_();
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const ultimaColuna = obterUltimaColunaLeituraPeriodos_();
  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const formularios = [];

  dados.forEach((linhaDados, indice) => {

    const indicador = linhaDados[COL_PERIODOS_INDICADOR - 1];
    if (!indicador) return; // linha em branco

    const tipoBruto = String(linhaDados[COL_PERIODOS_TIPO - 1] || "").trim().toLowerCase();

    formularios.push({
      linha: indice + 2,
      indicador: String(indicador).trim(),
      linkForms: linhaDados[COL_PERIODOS_LINK - 1] || "",
      tipo: tipoBruto === VALOR_TIPO_CONTINUO ? VALOR_TIPO_CONTINUO : VALOR_TIPO_SAZONAL,
      sem1AberturaData: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM1_ABERTURA_DATA - 1]),
      sem1AberturaHora: formatarCelulaHora_(linhaDados[COL_PERIODOS_SEM1_ABERTURA_HORA - 1]),
      sem1FechamentoData: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM1_FECHAMENTO_DATA - 1]),
      sem1FechamentoHora: formatarCelulaHora_(linhaDados[COL_PERIODOS_SEM1_FECHAMENTO_HORA - 1]),
      sem2AberturaData: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM2_ABERTURA_DATA - 1]),
      sem2AberturaHora: formatarCelulaHora_(linhaDados[COL_PERIODOS_SEM2_ABERTURA_HORA - 1]),
      sem2FechamentoData: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM2_FECHAMENTO_DATA - 1]),
      sem2FechamentoHora: formatarCelulaHora_(linhaDados[COL_PERIODOS_SEM2_FECHAMENTO_HORA - 1]),
      semestreColacao: formatarSemestreAaaaS_(linhaDados[COL_PERIODOS_SEMESTRE_COLACAO - 1]),
      sem1RetifInicio: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM1_RETIF_INICIO - 1]),
      sem1RetifFim: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM1_RETIF_FIM - 1]),
      sem2RetifInicio: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM2_RETIF_INICIO - 1]),
      sem2RetifFim: formatarCelulaData_(linhaDados[COL_PERIODOS_SEM2_RETIF_FIM - 1])
    });

  });

  return formularios;

}

function salvarConfigFormulario(dados) {
  exigirAdminPainel_();

  if (!dados || !dados.linha || !dados.indicador) {
    throw new Error("Dados do formulário incompletos.");
  }

  if (String(dados.indicador).trim() === INDICADOR_COLACAO_GRAU) {
    throw new Error("Pedido de Colação de Grau usa uma tela de configuração própria — use salvarConfigColacao.");
  }

  if (String(dados.indicador).trim() === INDICADOR_EXCLUSAO_DISCIPLINAS) {
    throw new Error("Formulário de Exclusão de Disciplinas usa uma tela de configuração própria — use salvarConfigExclusaoDisciplinas.");
  }

  const tipo = dados.tipo === VALOR_TIPO_CONTINUO ? VALOR_TIPO_CONTINUO : VALOR_TIPO_SAZONAL;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAbaPeriodos_();
    const linha = dados.linha;

    const indicadorAtual = String(aba.getRange(linha, COL_PERIODOS_INDICADOR).getValue() || "").trim();
    if (indicadorAtual !== String(dados.indicador).trim()) {
      throw new Error(
        "Esse formulário mudou de posição na planilha de Períodos desde que você abriu essa tela. " +
        "Recarregue a lista e tente de novo."
      );
    }

    aba.getRange(linha, COL_PERIODOS_TIPO).setValue(tipo);

    if (tipo === VALOR_TIPO_CONTINUO) {
      aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA, 1, COL_PERIODOS_SEM2_FECHAMENTO_HORA - COL_PERIODOS_SEM1_ABERTURA_DATA + 1)
        .clearContent();
      return { sucesso: true };
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
      throw new Error("Formulário Sazonal precisa ter pelo menos um semestre completo (abertura e encerramento). Ou selecione \"Contínuo\".");
    }

    if (semestreCompleto_(sem1)) {
      aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA).setValue(validarDataBrParaDate_(sem1.aberturaData, "1º semestre — abertura"));
      aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_HORA).setValue(validarHoraHhMm_(sem1.aberturaHora, "1º semestre — abertura"));
      aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_DATA).setValue(validarDataBrParaDate_(sem1.fechamentoData, "1º semestre — encerramento"));
      aba.getRange(linha, COL_PERIODOS_SEM1_FECHAMENTO_HORA).setValue(validarHoraHhMm_(sem1.fechamentoHora, "1º semestre — encerramento"));
    } else {
      aba.getRange(linha, COL_PERIODOS_SEM1_ABERTURA_DATA, 1, 4).clearContent();
    }

    if (semestreCompleto_(sem2)) {
      aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_DATA).setValue(validarDataBrParaDate_(sem2.aberturaData, "2º semestre — abertura"));
      aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_HORA).setValue(validarHoraHhMm_(sem2.aberturaHora, "2º semestre — abertura"));
      aba.getRange(linha, COL_PERIODOS_SEM2_FECHAMENTO_DATA).setValue(validarDataBrParaDate_(sem2.fechamentoData, "2º semestre — encerramento"));
      aba.getRange(linha, COL_PERIODOS_SEM2_FECHAMENTO_HORA).setValue(validarHoraHhMm_(sem2.fechamentoHora, "2º semestre — encerramento"));
    } else {
      aba.getRange(linha, COL_PERIODOS_SEM2_ABERTURA_DATA, 1, 4).clearContent();
    }

    return { sucesso: true };

  } finally {
    lock.releaseLock();
  }

}
