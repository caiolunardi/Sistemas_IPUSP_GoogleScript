/*=====================================================
  IDENTIDADE E PERÍODO

  Identidade: só Session.getActiveUser().getEmail(), conferida
  em TODA função pública antes de abrir qualquer planilha. Nada
  que venha da página (nº USP, protocolo, Registro ID, ID de
  arquivo) prova titularidade.

  Vínculo com o cadastro (plano, seção 2, decisão D2):
    CONFIRMADO  exatamente uma linha da planilha central com o
                e-mail da sessão na coluna D, nº USP preenchido
                na coluna A e esse nº USP sem repetição na
                coluna A. Nome e nº USP vêm do cadastro.
    PENDENTE    qualquer outra situação (sem linha, e-mail
                repetido, nº USP vazio ou repetido, nº USP
                digitado que já pertence a outro e-mail,
                divergência apontada pelo aluno, planilha
                indisponível). O pedido é protocolado do mesmo
                jeito (requisito 4) e aguarda a conferência da
                equipe. A página nunca sabe o motivo: a resposta
                é a mesma para todos os casos, e nenhum dado de
                outra pessoa é devolvido.

  Colunas da planilha central por posição (contrato do
  Gerenciador de Diplomas): A nº USP, B nome, C ingresso,
  D e-mail USP, E ID da pasta, F e-mail secundário. Este
  projeto só lê; o e-mail secundário (F) não serve para
  identidade.
=====================================================*/

/** Primeira linha de toda função pública. Não abre nada. */
function exigirSessaoColacao_() {
  let email = "";
  try {
    email = normalizarEmailColacao_(Session.getActiveUser().getEmail());
  } catch (erro) {
    email = "";
  }
  const dominio = "@" + COLACAO.DOMINIO;
  const local = email.slice(0, -dominio.length);
  if (!email || email.slice(-dominio.length) !== dominio || !/^[^\s@*,;]+$/.test(local)) {
    throw erroColacao_("SEM_IDENTIFICACAO", MENSAGENS_COLACAO.SEM_IDENTIFICACAO);
  }
  return email;
}

function apenasDigitosNUsp_(valor) {
  return String(valor == null ? "" : valor).replace(/\D/g, "");
}

/**
 * Situação do cadastro para o e-mail da sessão.
 * nUspDigitado (opcional) só serve para marcar conflito; nunca
 * para escolher a linha.
 * @return {{situacao:string, motivo:string, nUsp:string, nome:string,
 *           anoIngresso:string, emailSecundario:string}}
 */
function identificarCadastroColacao_(email, nUspDigitado) {
  const pendente = motivo => ({ situacao: "PENDENTE", motivo: motivo, nUsp: "", nome: "", anoIngresso: "", emailSecundario: "" });
  let valores;
  try {
    const aba = SpreadsheetApp.openById(obterIdColacao_(COLACAO.CHAVES.ALUNOS, "spreadsheet"))
      .getSheetByName(COLACAO.ABA_ALUNOS);
    if (!aba) throw new Error("Aba da planilha central não encontrada.");
    const ultima = aba.getLastRow();
    valores = ultima < 2 ? [] : aba.getRange(2, 1, ultima - 1, 6).getValues();
  } catch (erro) {
    console.error("Planilha central indisponível: " + mensagemSeguraColacao_(erro));
    return pendente("CADASTRO_INDISPONIVEL");
  }

  const doEmail = [];
  const contagemNUsp = {};
  valores.forEach(linha => {
    const nUsp = apenasDigitosNUsp_(linha[0]);
    if (nUsp) contagemNUsp[nUsp] = (contagemNUsp[nUsp] || 0) + 1;
    if (normalizarEmailColacao_(linha[3]) === email) doEmail.push(linha);
  });

  if (doEmail.length === 1) {
    const linha = doEmail[0];
    const nUsp = apenasDigitosNUsp_(linha[0]);
    if (!nUsp) return pendente("NUSP_VAZIO");
    if (contagemNUsp[nUsp] !== 1) return pendente("NUSP_REPETIDO");
    const nome = String(linha[1] || "").replace(/\s+/g, " ").trim();
    if (!nome) return pendente("NOME_VAZIO");
    return {
      situacao: "CONFIRMADO",
      motivo: "",
      nUsp: nUsp,
      nome: nome,
      anoIngresso: (String(linha[2] || "").match(/^\d{4}/) || [""])[0],
      emailSecundario: String(linha[5] || "").trim()
    };
  }
  if (doEmail.length > 1) return pendente("EMAIL_REPETIDO");

  const digitado = apenasDigitosNUsp_(nUspDigitado);
  if (digitado && contagemNUsp[digitado]) return pendente("CONFLITO_NUSP");
  return pendente("SEM_CADASTRO");
}

/*----------------------------------------------------
  PERÍODO — primeira aba de PERIODOS, linha "Pedido de
  Colação de Grau". C = tipo ("cont…" nunca fecha); D–G e
  H–K = janelas (data e hora, inclusivas, comparadas por
  minuto no fuso de São Paulo); M = semestre AAAA/S.
  Mesmo comportamento do legado.
----------------------------------------------------*/

function extrairDataCelulaColacao_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    const [ano, mes, dia] = Utilities.formatDate(valor, COLACAO.FUSO, "yyyy-MM-dd").split("-").map(Number);
    return { ano: ano, mes: mes, dia: dia };
  }
  const m = String(valor || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? { dia: Number(m[1]), mes: Number(m[2]), ano: Number(m[3]) } : null;
}

function extrairHoraCelulaColacao_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    const [h, min] = Utilities.formatDate(valor, COLACAO.FUSO, "HH:mm").split(":").map(Number);
    return { h: h, min: min };
  }
  const hm = String(valor || "00:00").trim().match(/^(\d{1,2}):(\d{2})/);
  return { h: hm ? Number(hm[1]) : 0, min: hm ? Number(hm[2]) : 0 };
}

function chaveDataHoraColacao_(valorData, valorHora) {
  const data = extrairDataCelulaColacao_(valorData);
  if (!data) return null;
  const hora = extrairHoraCelulaColacao_(valorHora);
  const p = n => String(n).padStart(2, "0");
  return `${data.ano}-${p(data.mes)}-${p(data.dia)} ${p(hora.h)}:${p(hora.min)}`;
}

/**
 * Situação do período no instante informado (o "Recebido em").
 * @return {{erro:string}|{aberto:boolean, ano:string, semestre:string,
 *   tituloSemestre:string, codigoColacao:string, semestreBruto:string, janela:string}}
 */
function situacaoPeriodoColacao_(instante) {
  let valores;
  try {
    const aba = SpreadsheetApp.openById(obterIdColacao_(COLACAO.CHAVES.PERIODOS, "spreadsheet")).getSheets()[0];
    const ultima = aba ? aba.getLastRow() : 0;
    valores = ultima < 2 ? [] : aba.getRange(2, 1, ultima - 1, 13).getValues();
  } catch (erro) {
    console.error("PERIODOS indisponível: " + mensagemSeguraColacao_(erro));
    return { erro: MENSAGENS_COLACAO.INDISPONIVEL };
  }
  const alvo = normalizarTituloColacao_(COLACAO.IDENTIFICADOR_PERIODO);
  const linha = valores.find(l => normalizarTituloColacao_(l[0]) === alvo);
  if (!linha) {
    return { erro: "O período do Pedido de Colação de Grau não está configurado. Avise o Serviço de Graduação." };
  }
  const semestreBruto = String(linha[12] || "").trim();
  const partes = semestreBruto.match(/^(\d{4})\/([12])$/);
  if (!partes) {
    return { erro: "O semestre do Pedido de Colação de Grau está em formato inesperado. Avise o Serviço de Graduação." };
  }
  const tipo = normalizarTituloColacao_(linha[2]);
  const agora = Utilities.formatDate(instante, COLACAO.FUSO, "yyyy-MM-dd HH:mm");
  let aberto = true;
  let janela = "contínuo";
  if (tipo.indexOf("cont") !== 0) {
    aberto = false;
    janela = "";
    [[3, 4, 5, 6], [7, 8, 9, 10]].forEach(([d1, h1, d2, h2]) => {
      const abre = chaveDataHoraColacao_(linha[d1], linha[h1]);
      const fecha = chaveDataHoraColacao_(linha[d2], linha[h2]);
      if (abre && fecha && !janela) janela = abre + " a " + fecha;
      if (abre && fecha && agora >= abre && agora <= fecha) {
        aberto = true;
        janela = abre + " a " + fecha;
      }
    });
  }
  const semestrePorExtenso = partes[2] === "1" ? "Primeiro Semestre" : "Segundo Semestre";
  return {
    aberto: aberto,
    ano: partes[1],
    semestre: partes[2],
    tituloSemestre: `${semestrePorExtenso} de ${partes[1]}`,
    codigoColacao: partes[1] + partes[2],
    semestreBruto: semestreBruto,
    janela: janela
  };
}
