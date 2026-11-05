/*=====================================================
  PEDIDO DE ABERTURA DE HABILITAÇÃO — V2.0
  (Bacharelado e Licenciatura em Psicologia — IPUSP)
  Backend Apps Script do formulário dos alunos

  Histórico do sistema:
    - origem: um Google Forms, cujas respostas formaram a aba
      "Respostas ao formulário 2" (e a aba antiga "2021 - 2022");
    - v1.0: este Web App próprio substituiu o Forms e passou a
      gravar na mesma aba, com os mesmos títulos. Os registros
      antigos continuam onde estavam, sem migração;
    - v2.0 (este arquivo): padrão GRADIP. IDs pelo ID_INDEX,
      ambiente de homologação, esquema da aba conferido antes de
      cada gravação, recibo por e-mail e pedido repetido com
      confirmação. A planilha não muda: nenhuma coluna é criada,
      renomeada ou movida por este formulário.

  Este Web App só CRIA pedidos. O atendimento (observações da
  equipe, concluir, avisar o aluno, relatórios) é do Gerenciador
  de Abertura de Habilitações, que lê a mesma aba. O Painel dos
  servidores conta as linhas com Situação (K) = "pendente".

  Contrato da aba atual (o mesmo que o Gerenciador lê):
    A Carimbo de data/hora        F E-mail USP
    B Endereço de e-mail          G Ano de ingresso
    C Declaro ter lido…           H Realizou trancamento…?
    D Nº USP                      I Deseja solicitar… programa?
    E Nome                        J Comentários, sugestões… (Observações)
                                  K Situação
    L em diante: colunas do Gerenciador (Registro ID, Versão,
    E-mail Enviado, Data de Conclusão), achadas pelo título.

  CONFIGURAÇÃO DE DEPLOY (Implantar > Nova implantação > Web app):
    - "Executar como": EU (a conta do Serviço de Graduação dona
      das planilhas). O aluno não precisa ter acesso à planilha
      de respostas, à de alunos, à de períodos nem ao ID_INDEX.
    - "Quem pode acessar": qualquer pessoa da USP.
  Ver docs/sistemas/abertura-habilitacoes/formulario/INSTALACAO.md.

  CONFIGURAÇÃO DO PROJETO (nenhum ID no código):
    - Propriedades do script: ID_INDEX_SPREADSHEET_ID = ID da
      planilha mestre ID_INDEX; AMBIENTE = homologacao só no
      projeto de homologação.
    - No ID_INDEX: PLANILHA_ALUNOS, ABERTURA_HABILITACOES e
      PERIODOS.
=====================================================*/

const VERSAO_FORMULARIO = "2.0";

const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const PROPRIEDADE_AMBIENTE = "AMBIENTE"; // "producao" (padrão) ou "homologacao"
const ABA_INDICE = "Página1";
const CHAVE_ALUNOS = "PLANILHA_ALUNOS";
const CHAVE_RESPOSTAS = "ABERTURA_HABILITACOES";
const CHAVE_PERIODOS = "PERIODOS";

const ABA_RESPOSTAS_ATUAL = "Respostas ao formulário 2";
const ABA_RESPOSTAS_HISTORICO = "2021 - 2022"; // somente leitura

// Nome EXATO deste formulário na coluna A da planilha de Períodos
// (o mesmo da v1.0). É o nome, não o link, que identifica a linha.
const NOME_FORMULARIO_PERIODOS = "Pedido de Abertura de Habilitação";

const DOMINIO_PERMITIDO = "usp.br";
const TIMEZONE = "America/Sao_Paulo";

const TAMANHO_MAXIMO_NOME = 200;
// O Gerenciador recusa salvar observações acima de 2.000 caracteres
// na coluna J, então o formulário usa o mesmo limite (a v1.0 também).
const TAMANHO_MAXIMO_OBSERVACOES = 2000;

// Títulos da planilha de alunos (os mesmos dos outros formulários).
const CABECALHOS_ALUNOS = {
  nUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

// Esquema da aba atual: título exato e posição (1 = A). São os
// títulos que o Google Forms gravou e que a v1.0 e o Gerenciador
// procuram. Qualquer diferença bloqueia a gravação.
const ESQUEMA_RESPOSTAS = [
  { chave: "carimbo",     coluna: 1,  titulo: "Carimbo de data/hora" },
  { chave: "email",       coluna: 2,  titulo: "Endereço de e-mail" },
  { chave: "declaracao",  coluna: 3,  titulo: "Declaro ter lido as informações da página inicial do formulário, e estar ciente das normas e prazos para fazer a solicitação e atendimento do pedido." },
  { chave: "nUsp",        coluna: 4,  titulo: "Nº USP" },
  { chave: "nome",        coluna: 5,  titulo: "Nome" },
  { chave: "emailUsp",    coluna: 6,  titulo: "E-mail USP" },
  { chave: "anoIngresso", coluna: 7,  titulo: "Ano de ingresso" },
  { chave: "trancamento", coluna: 8,  titulo: "Realizou trancamento total de matrícula em algum semestre?" },
  { chave: "programa",    coluna: 9,  titulo: "Deseja solicitar a abertura de qual programa?" },
  { chave: "observacoes", coluna: 10, titulo: "Comentários, sugestões, elogios ou críticas." },
  { chave: "situacao",    coluna: 11, titulo: "Situação" }
];
const COLUNAS_DO_ESQUEMA = ESQUEMA_RESPOSTAS.length; // A–K

// Colunas do Gerenciador (L em diante, pelo título). O formulário
// nunca cria nenhuma delas.
const TITULO_REGISTRO_ID = "Registro ID";
const TITULO_VERSAO = "Versão";
const TITULOS_DO_GERENCIADOR = [TITULO_REGISTRO_ID, TITULO_VERSAO, "E-mail Enviado", "Data de Conclusão"];

const VALOR_DECLARACAO = "Sim";
const SITUACAO_INICIAL = "pendente"; // minúsculas: é o que o Painel conta

const NOMES_PROGRAMA = {
  bach: "Bacharelado em Psicologia",
  lic: "Licenciatura em Psicologia"
};
const SEPARADOR_PROGRAMAS = ", "; // o mesmo do Forms e da v1.0

/*=====================================================
  SERVE A PÁGINA
=====================================================*/

function doGet(e) {
  const pagina = HtmlService.createTemplateFromFile("HabilitacaoFormApp");
  pagina.homologacao = prefixoAmbiente_() !== "";
  return pagina
    .evaluate()
    .setTitle(prefixoAmbiente_() + "Pedido de Abertura de Habilitação — IPUSP")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  ÍNDICE DE PLANILHAS (ID_INDEX) E AMBIENTE — mesmo formato
  dos outros sistemas. Mensagens citam só nomes de chave e
  de propriedade, nunca IDs.
=====================================================*/

function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error(`Configuração obrigatória ausente: ${PROPRIEDADE_ID_INDICE}.`);
  return String(id).trim();
}

// Sem AMBIENTE (ou "producao"): coluna "ID de Produção". Com
// "homologacao": coluna que começa por "Homologação", sem volta para
// a produção. Valor desconhecido é erro.
function ambiente_() {
  const valor = String(PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_AMBIENTE) || "").trim().toLowerCase();
  if (!valor || valor === "producao") return "producao";
  if (valor === "homologacao") return "homologacao";
  throw new Error(`Propriedade ${PROPRIEDADE_AMBIENTE} com valor desconhecido; use "producao" ou "homologacao".`);
}

function ehHomologacao_() {
  return ambiente_() === "homologacao";
}

function chaveCacheId_(chave, homologacao) {
  return (homologacao ? "idIndexHomologacao:" : "idIndex:") + chave;
}

function obterIdPlanilha_(chave) {

  const homologacao = ehHomologacao_();
  const cache = CacheService.getScriptCache();
  const chaveCache = chaveCacheId_(chave, homologacao);
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache;

  const planilha = SpreadsheetApp.openById(obterIdIndice_());
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];
  const valores = aba.getDataRange().getDisplayValues();
  if (valores.length < 2) throw new Error("A planilha ID_INDEX não tem nenhuma linha de dados.");

  const titulos = valores[0].map(t => String(t).trim());
  const colChave = titulos.indexOf("Chave");
  const nomeColuna = homologacao ? "Homologação" : "ID de Produção";
  const colId = homologacao
    ? titulos.findIndex(t => semAcento_(t).toLowerCase().startsWith("homologacao"))
    : titulos.indexOf("ID de Produção");
  if (colChave === -1 || colId === -1) {
    throw new Error(`A planilha ID_INDEX precisa ter as colunas "Chave" e "${nomeColuna}".`);
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colChave]).trim() === chave) {
      const id = String(valores[i][colId] || "").trim();
      if (!id) throw new Error(`A chave "${chave}" está cadastrada no ID_INDEX, mas a coluna "${nomeColuna}" está vazia.`);
      cache.put(chaveCache, id, 600);
      return id;
    }
  }

  throw new Error(`Não encontrei a chave "${chave}" na planilha ID_INDEX.`);

}

function prefixoAmbiente_() {
  try { return ehHomologacao_() ? "[HOMOLOGAÇÃO] " : ""; } catch (err) { return "[CONFIGURAÇÃO INVÁLIDA] "; }
}

function abrirPlanilhaPorChave_(chave) {
  return SpreadsheetApp.openById(obterIdPlanilha_(chave));
}

function abrirAbaPorChave_(chave) {
  return abrirPlanilhaPorChave_(chave).getSheets()[0];
}

function semAcento_(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mensagemDe_(err) {
  return err && err.message ? err.message : String(err);
}

// Erro mostrado ao aluno: o detalhe técnico fica só no registro de
// execução (sem dados pessoais) e o aluno recebe um texto genérico.
function erroParaAluno_(contexto, err) {
  Logger.log(`${contexto}: ${mensagemDe_(err)}`);
  return new Error("Não foi possível concluir agora por um problema de configuração do formulário. " +
    "Tente de novo mais tarde ou avise o Serviço de Graduação.");
}

/*=====================================================
  AUTENTICAÇÃO — o e-mail é SEMPRE o da sessão do Google,
  nunca um valor vindo da página. Toda gravação confere de novo.
=====================================================*/

function exigirUsuarioAutenticado_() {

  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();

  if (!email || email.indexOf("@" + DOMINIO_PERMITIDO) === -1 ||
      email.split("@")[1] !== DOMINIO_PERMITIDO) {
    throw new Error(
      `NAO_AUTENTICADO: Não consegui identificar um login válido do domínio @${DOMINIO_PERMITIDO}. ` +
      `Verifique se você está logado no navegador com seu e-mail USP e recarregue a página.`
    );
  }

  return email;

}

/*=====================================================
  PERÍODO DE ABERTURA — planilha PERIODOS (primeira aba),
  linha cujo nome na coluna A é NOME_FORMULARIO_PERIODOS.
  Mesma regra da v1.0: C = "Contínuo" abre sempre; "Sazonal"
  abre dentro de D–G (1º semestre) ou H–K (2º semestre).
  Linha ausente ou planilha inacessível BLOQUEIA o formulário.
=====================================================*/

// Data (Date ou texto dd/mm/aa[aa]) + horário (Date ou texto HH:mm)
// -> número AAAAMMDDHHmm, para comparar sem aritmética de fuso.
// null se algum dos dois estiver vazio ou não for reconhecido.
function paraNumeroDataHora_(dataBruta, horaBruta) {

  let dataTexto;

  if (Object.prototype.toString.call(dataBruta) === "[object Date]") {
    dataTexto = Utilities.formatDate(dataBruta, TIMEZONE, "yyyyMMdd");
  } else {
    const texto = String(dataBruta || "").trim();
    const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    const ano = m[3].length === 2 ? "20" + m[3] : m[3];
    dataTexto = `${ano}${mes}${dia}`;
  }

  let horaTexto;

  if (Object.prototype.toString.call(horaBruta) === "[object Date]") {
    horaTexto = Utilities.formatDate(horaBruta, TIMEZONE, "HHmm");
  } else {
    const texto = String(horaBruta || "").trim();
    const m = texto.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    horaTexto = m[1].padStart(2, "0") + m[2];
  }

  return parseInt(dataTexto + horaTexto, 10);

}

function formatarJanelaExibicao_(dataBruta, horaBruta) {

  let dataTexto;
  if (Object.prototype.toString.call(dataBruta) === "[object Date]") {
    dataTexto = Utilities.formatDate(dataBruta, TIMEZONE, "dd/MM/yyyy");
  } else {
    dataTexto = String(dataBruta || "").trim();
  }

  let horaTexto;
  if (Object.prototype.toString.call(horaBruta) === "[object Date]") {
    horaTexto = Utilities.formatDate(horaBruta, TIMEZONE, "HH:mm");
  } else {
    horaTexto = String(horaBruta || "").trim();
  }

  return `${dataTexto} às ${horaTexto}`;

}

function buscarLinhaPeriodo_() {
  const aba = abrirAbaPorChave_(CHAVE_PERIODOS);
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return null;
  const dados = aba.getRange(2, 1, ultimaLinha - 1, 11).getValues(); // A–K
  const alvo = NOME_FORMULARIO_PERIODOS.trim().toLowerCase();
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0] || "").trim().toLowerCase() === alvo) return dados[i];
  }
  return null;
}

/**
 * { aberto: true|false, janelas: [{inicioTexto, fimTexto}] }
 * Lança erro (PERIODO_INDISPONIVEL) se a planilha não abrir ou a
 * linha não existir: o formulário fica bloqueado.
 */
function verificarPeriodoAbertura_() {

  let linha;
  try {
    linha = buscarLinhaPeriodo_();
  } catch (err) {
    Logger.log(`Falha ao ler a planilha de períodos: ${mensagemDe_(err)}`);
    throw new Error("PERIODO_INDISPONIVEL: Não foi possível conferir o período de abertura agora.");
  }

  if (!linha) {
    Logger.log(`Linha "${NOME_FORMULARIO_PERIODOS}" ausente na planilha de períodos.`);
    throw new Error("PERIODO_INDISPONIVEL: O período deste formulário não está configurado.");
  }

  const tipo = String(linha[2] || "").trim().toLowerCase();
  if (tipo === "continuo" || tipo === "contínuo") {
    return { aberto: true, janelas: [] };
  }

  const janelasBrutas = [
    { inicioData: linha[3], inicioHora: linha[4], fimData: linha[5], fimHora: linha[6] },
    { inicioData: linha[7], inicioHora: linha[8], fimData: linha[9], fimHora: linha[10] }
  ];

  const agoraNum = parseInt(Utilities.formatDate(new Date(), TIMEZONE, "yyyyMMddHHmm"), 10);
  const janelas = [];
  let aberto = false;

  janelasBrutas.forEach(j => {
    const inicioNum = paraNumeroDataHora_(j.inicioData, j.inicioHora);
    const fimNum = paraNumeroDataHora_(j.fimData, j.fimHora);
    if (inicioNum === null || fimNum === null) return; // semestre sem período
    janelas.push({
      inicioTexto: formatarJanelaExibicao_(j.inicioData, j.inicioHora),
      fimTexto: formatarJanelaExibicao_(j.fimData, j.fimHora)
    });
    if (agoraNum >= inicioNum && agoraNum <= fimNum) aberto = true;
  });

  return { aberto: aberto, janelas: janelas };

}

/*=====================================================
  PLANILHA DE ALUNOS — só leitura, primeira aba, colunas pelo
  TÍTULO. O login é procurado no "eMail" e no "eMail
  Secundario". Só para pré-preencher: falha aqui não bloqueia.
=====================================================*/

function extrairAnoDeIngresso_(valorBruto) {
  const texto = String(valorBruto || "").trim();
  if (texto.length >= 4) return texto.substring(0, 4);
  return texto;
}

function buscarAlunoPorEmail_(email) {

  const aba = abrirAbaPorChave_(CHAVE_ALUNOS);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return null;

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(t => String(t).trim());
  const col = chave => titulos.indexOf(CABECALHOS_ALUNOS[chave]);

  const colNUsp = col("nUsp"), colNome = col("nome"), colIngresso = col("ingresso");
  const colEmail = col("email"), colEmail2 = col("emailSecundario");
  if (colNUsp === -1 || colNome === -1 || colIngresso === -1 || colEmail === -1) {
    throw new Error("A planilha de alunos não tem os títulos esperados (Número USP, Nome do Aluno, Ingresso, eMail).");
  }

  const alvo = email.trim().toLowerCase();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const emails = [linha[colEmail], colEmail2 !== -1 ? linha[colEmail2] : ""]
      .map(v => String(v || "").trim().toLowerCase());
    if (emails.indexOf(alvo) === -1) continue;
    return {
      nUsp: String(linha[colNUsp] || "").trim(),
      nome: String(linha[colNome] || "").trim(),
      anoIngresso: extrairAnoDeIngresso_(linha[colIngresso])
    };
  }

  return null;

}

/*=====================================================
  ESQUEMA DA ABA ATUAL — conferido antes de cada gravação.
  Nada é corrigido: qualquer diferença recusa o envio.
=====================================================*/

function titulosDaAba_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return [];
  return aba.getRange(1, 1, 1, ultimaColuna).getValues()[0]
    .map(t => String(t === null || t === undefined ? "" : t).trim());
}

/**
 * Lista de problemas do esquema (vazia = compatível):
 *  - cada título de A–K no lugar e com o texto exato;
 *  - nenhum título de A–K ou do Gerenciador repetido na linha 1.
 */
function problemasDoEsquema_(titulos) {
  const problemas = [];
  const letra = c => String.fromCharCode(64 + c);
  ESQUEMA_RESPOSTAS.forEach(campo => {
    const atual = titulos[campo.coluna - 1] || "";
    if (atual !== campo.titulo) {
      problemas.push(`coluna ${letra(campo.coluna)} deveria ser "${campo.titulo}" e é ${atual ? `"${atual}"` : "vazia"}`);
    }
  });
  ESQUEMA_RESPOSTAS.map(c => c.titulo).concat(TITULOS_DO_GERENCIADOR).forEach(titulo => {
    const vezes = titulos.filter(t => t === titulo).length;
    if (vezes > 1) problemas.push(`título "${titulo}" aparece ${vezes} vezes`);
  });
  return problemas;
}

function conferirEsquema_(aba) {
  if (aba.getName() !== ABA_RESPOSTAS_ATUAL) {
    throw new Error(`ESQUEMA: gravação recusada fora da aba "${ABA_RESPOSTAS_ATUAL}".`);
  }
  const titulos = titulosDaAba_(aba);
  const problemas = problemasDoEsquema_(titulos);
  if (problemas.length) {
    throw new Error(`ESQUEMA: a aba "${ABA_RESPOSTAS_ATUAL}" não está no formato esperado (${problemas.join("; ")}).`);
  }
  return titulos;
}

function abaAtualDeRespostas_() {
  const aba = abrirPlanilhaPorChave_(CHAVE_RESPOSTAS).getSheetByName(ABA_RESPOSTAS_ATUAL);
  if (!aba) throw new Error(`ESQUEMA: a aba "${ABA_RESPOSTAS_ATUAL}" não foi encontrada.`);
  return aba;
}

/*=====================================================
  PEDIDOS ANTERIORES DO PRÓPRIO E-MAIL — só leitura, nas duas
  abas. Informativo; cada aba falha isolada. Critério de
  situação igual ao do Gerenciador: contém "conclu" = concluído;
  qualquer outra coisa, inclusive vazio, é pendente. Na aba
  antiga, todos contam como concluídos (como no Gerenciador).
=====================================================*/

function estaConcluido_(valorSituacao) {
  return semAcento_(valorSituacao).toLowerCase().indexOf("conclu") !== -1;
}

function formatarCarimboExibicao_(valor) {
  if (!valor) return "";
  try {
    if (Object.prototype.toString.call(valor) === "[object Date]") {
      return Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy HH:mm");
    }
    return String(valor);
  } catch (err) {
    return String(valor);
  }
}

function programasDoTexto_(texto) {
  const t = String(texto || "");
  return Object.keys(NOMES_PROGRAMA).filter(chave => t.indexOf(NOMES_PROGRAMA[chave]) !== -1);
}

function pedidosNaAba_(aba, email, historica) {

  const resultados = [];
  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return resultados;

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(t => String(t || "").trim());
  const col = titulo => titulos.indexOf(titulo);

  const colEmailUsp = col("E-mail USP");
  const colEmailLogin = col("Endereço de e-mail");
  const colCarimbo = col("Carimbo de data/hora");
  const colPrograma = col("Deseja solicitar a abertura de qual programa?");
  const colNome = col("Nome");
  // Aba atual: Situação na K (posição fixa do Gerenciador). Aba antiga:
  // primeira coluna cujo título contém "situa", como no Painel.
  const colSituacao = historica
    ? titulos.findIndex(t => semAcento_(t).toLowerCase().indexOf("situa") !== -1)
    : 10;

  if (colEmailUsp === -1 && colEmailLogin === -1) return resultados;
  const alvo = email.trim().toLowerCase();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    if (colNome !== -1 && !String(linha[colNome] || "").trim()) continue; // linha sem Nome não é pedido
    const emails = [colEmailUsp, colEmailLogin].filter(c => c !== -1)
      .map(c => String(linha[c] || "").trim().toLowerCase());
    if (emails.indexOf(alvo) === -1) continue;

    const situacao = colSituacao !== -1 ? String(linha[colSituacao] || "").trim() : "";
    const programa = colPrograma !== -1 ? String(linha[colPrograma] || "").trim() : "";
    resultados.push({
      carimbo: colCarimbo !== -1 ? formatarCarimboExibicao_(linha[colCarimbo]) : "",
      programa: programa,
      programas: programasDoTexto_(programa),
      situacao: situacao,
      pendente: historica ? false : !estaConcluido_(situacao)
    });
  }

  return resultados;

}

function buscarHistoricoCompleto_(email) {
  let planilha;
  try {
    planilha = abrirPlanilhaPorChave_(CHAVE_RESPOSTAS);
  } catch (err) {
    Logger.log(`Falha ao abrir a planilha de respostas para o histórico: ${mensagemDe_(err)}`);
    return [];
  }
  const ler = (nomeAba, historica) => {
    try {
      const aba = planilha.getSheetByName(nomeAba);
      return aba ? pedidosNaAba_(aba, email, historica) : [];
    } catch (err) {
      Logger.log(`Falha ao ler o histórico na aba "${nomeAba}": ${mensagemDe_(err)}`);
      return [];
    }
  };
  return ler(ABA_RESPOSTAS_ATUAL, false).concat(ler(ABA_RESPOSTAS_HISTORICO, true));
}

/*=====================================================
  CARGA INICIAL — nada vem da página; tudo parte da sessão.
=====================================================*/

function obterDadosIniciais() {

  let email;
  try {
    email = exigirUsuarioAutenticado_();
  } catch (err) {
    return { autenticado: false };
  }

  let periodo;
  try {
    periodo = verificarPeriodoAbertura_();
  } catch (err) {
    return { autenticado: true, periodoOk: false, periodoErro: true };
  }
  if (!periodo.aberto) {
    return { autenticado: true, periodoOk: false, janelas: periodo.janelas };
  }

  let aluno = null;
  try {
    aluno = buscarAlunoPorEmail_(email);
  } catch (err) {
    Logger.log(`Falha ao ler a planilha de alunos: ${mensagemDe_(err)}`);
  }

  return {
    autenticado: true,
    periodoOk: true,
    encontrado: !!aluno,
    email: email,
    nUsp: aluno ? aluno.nUsp : "",
    nome: aluno ? aluno.nome : "",
    anoIngresso: aluno ? aluno.anoIngresso : "",
    historico: buscarHistoricoCompleto_(email)
  };

}

/*=====================================================
  VALIDAÇÃO — toda entrada da página é não confiável.
=====================================================*/

function sanitizarTextoPlano_(valor, tamanhoMaximo) {
  let texto = (valor === null || valor === undefined) ? "" : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  texto = texto.trim();
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto.slice(0, tamanhoMaximo || 500);
}

function normalizarNUsp_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) throw new Error("Informe o seu número USP.");
  const apenasDigitos = texto.replace(/\D/g, "");
  if (!apenasDigitos) throw new Error("Número USP inválido — use só números.");
  if (apenasDigitos.length > 15) throw new Error("Número USP muito longo.");
  return apenasDigitos;
}

function validarAnoIngresso_(valor) {
  const texto = String(valor || "").trim();
  if (!/^\d{4}$/.test(texto)) {
    throw new Error("Ano de ingresso inválido — use um ano com 4 dígitos, ex: 2022.");
  }
  const ano = parseInt(texto, 10);
  const anoAtual = new Date().getFullYear();
  if (ano < 2000 || ano > anoAtual) {
    throw new Error(`Ano de ingresso inválido — use um valor entre 2000 e ${anoAtual}.`);
  }
  return texto;
}

function validarSimNao_(valor, rotuloCampo) {
  const texto = String(valor || "").trim();
  if (texto !== "Sim" && texto !== "Não") {
    throw new Error(`Responda ${rotuloCampo}.`);
  }
  return texto;
}

/** Chaves válidas, sem repetição, na ordem fixa bach → lic. */
function validarProgramas_(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new Error("Selecione ao menos um programa (Bacharelado e/ou Licenciatura).");
  }
  const chavesValidas = Object.keys(NOMES_PROGRAMA);
  valor.forEach(chave => {
    if (chavesValidas.indexOf(chave) === -1) throw new Error("Programa selecionado é inválido.");
  });
  return chavesValidas.filter(chave => valor.indexOf(chave) !== -1);
}

/*=====================================================
  RECIBO POR E-MAIL — texto simples, "não responder", para o
  e-mail do login. Se falhar, o pedido continua gravado.
=====================================================*/

function textoSemApostrofoInicial_(texto) {
  return String(texto || "").replace(/^'(?=[=+\-@])/, "");
}

function montarRecibo_(dados, quando) {
  return [
    `Olá, ${textoSemApostrofoInicial_(dados.nome).split(" ")[0]}.`,
    "",
    `Recebemos o seu pedido de abertura de habilitação em ${quando}.`,
    "",
    "Dados enviados:",
    `- Nome: ${textoSemApostrofoInicial_(dados.nome)}`,
    `- Nº USP: ${dados.nUsp}`,
    `- Ano de ingresso: ${dados.anoIngresso}`,
    `- Realizou trancamento total de matrícula: ${dados.trancamento}`,
    `- Programa(s): ${dados.programasTexto}`,
    `- Observações: ${dados.observacoes ? textoSemApostrofoInicial_(dados.observacoes) : "(nenhuma)"}`,
    "",
    "Este e-mail é só o recibo do envio. O Serviço de Graduação atenderá o seu pedido no prazo de até 10 dias úteis e enviará outra mensagem para o seu e-mail USP quando a habilitação for aberta.",
    "",
    "Mensagem automática, não responda.",
    "Serviço de Graduação — Instituto de Psicologia da USP"
  ].join("\n");
}

function enviarRecibo_(email, dados) {
  const quando = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy 'às' HH:mm");
  MailApp.sendEmail(email, prefixoAmbiente_() + "Recibo — Pedido de Abertura de Habilitação",
    montarRecibo_(dados, quando), { name: "Serviço de Graduação — IPUSP", noReply: true });
}

/*=====================================================
  GRAVAÇÃO DO PEDIDO
=====================================================*/

/** Registro ID novo, diferente de todos os que já estão na coluna. */
function novoRegistroId_(aba, colId) {
  const existentes = {};
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    aba.getRange(2, colId, ultimaLinha - 1, 1).getValues()
      .forEach(l => { const v = String(l[0] || "").trim(); if (v) existentes[v] = true; });
  }
  for (let i = 0; i < 5; i++) {
    const id = Utilities.getUuid();
    if (!existentes[id]) return id;
  }
  throw new Error("Não foi possível gerar um identificador único para o pedido.");
}

function registrarSolicitacao(dados) {

  const email = exigirUsuarioAutenticado_();
  dados = dados || {};

  // Período conferido de novo: a página pode ter ficado aberta além do
  // prazo, e a função pode ser chamada direto.
  let periodo;
  try {
    periodo = verificarPeriodoAbertura_();
  } catch (err) {
    throw new Error("Não foi possível confirmar se o formulário está no período de abertura. Recarregue a página.");
  }
  if (!periodo.aberto) {
    throw new Error("FORA_DO_PERIODO: Este formulário não está mais dentro do período de abertura. Recarregue a página para ver os detalhes.");
  }

  if (dados.declaracao !== true) {
    throw new Error("É preciso declarar ciência das normas e prazos antes de enviar o pedido.");
  }

  const nome = sanitizarTextoPlano_(dados.nome, TAMANHO_MAXIMO_NOME);
  if (!nome) throw new Error("O nome não pode ficar vazio.");
  const nUsp = normalizarNUsp_(dados.nUsp);
  const anoIngresso = validarAnoIngresso_(dados.anoIngresso);
  const trancamento = validarSimNao_(dados.trancamento, "se realizou trancamento total de matrícula em algum semestre");
  const programas = validarProgramas_(dados.programas);
  const programasTexto = programas.map(c => NOMES_PROGRAMA[c]).join(SEPARADOR_PROGRAMAS);

  const observacoesBrutas = String(dados.observacoes || "").trim();
  if (observacoesBrutas.length > TAMANHO_MAXIMO_OBSERVACOES) {
    throw new Error(`As observações passaram de ${TAMANHO_MAXIMO_OBSERVACOES} caracteres. Resuma o texto e envie de novo.`);
  }
  const observacoes = sanitizarTextoPlano_(observacoesBrutas, TAMANHO_MAXIMO_OBSERVACOES + 1);
  const confirmarNovoPedido = dados.confirmarNovoPedido === true;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error("Muitos pedidos sendo gravados ao mesmo tempo. Aguarde alguns segundos e clique em Enviar de novo.");
  }

  try {

    let aba, titulos;
    try {
      aba = abaAtualDeRespostas_();
      titulos = conferirEsquema_(aba);
    } catch (err) {
      throw erroParaAluno_("Gravação recusada", err);
    }

    // Pedido pendente do mesmo e-mail para algum dos programas
    // escolhidos: só com confirmação (conferido dentro da trava).
    const repetidos = pedidosNaAba_(aba, email, false)
      .filter(p => p.pendente && p.programas.some(c => programas.indexOf(c) !== -1));
    if (repetidos.length && !confirmarNovoPedido) {
      const ultimo = repetidos[repetidos.length - 1];
      throw new Error("PEDIDO_PENDENTE: Você já tem um pedido pendente para " +
        (ultimo.programa || "este programa") + (ultimo.carimbo ? `, enviado em ${ultimo.carimbo}` : "") + ".");
    }

    const valores = new Array(Math.max(titulos.length, COLUNAS_DO_ESQUEMA)).fill("");
    const por = chave => ESQUEMA_RESPOSTAS.find(c => c.chave === chave).coluna - 1;
    valores[por("carimbo")] = new Date();
    valores[por("email")] = email;
    valores[por("declaracao")] = VALOR_DECLARACAO;
    valores[por("nUsp")] = nUsp;
    valores[por("nome")] = nome;
    valores[por("emailUsp")] = email;
    valores[por("anoIngresso")] = anoIngresso;
    valores[por("trancamento")] = trancamento;
    valores[por("programa")] = programasTexto;
    valores[por("observacoes")] = observacoes;
    valores[por("situacao")] = SITUACAO_INICIAL;

    // Registro ID e Versão só quando as colunas já existem (o
    // Gerenciador as cria); o formulário nunca as cria.
    const colId = titulos.indexOf(TITULO_REGISTRO_ID) + 1;
    const colVersao = titulos.indexOf(TITULO_VERSAO) + 1;
    if (colId > COLUNAS_DO_ESQUEMA && colVersao > COLUNAS_DO_ESQUEMA) {
      valores[colId - 1] = novoRegistroId_(aba, colId);
      valores[colVersao - 1] = 1;
    }

    // appendRow grava na primeira linha livre de uma vez, sem
    // sobrescrever uma linha criada por outro processo.
    aba.appendRow(valores);

  } finally {
    lock.releaseLock();
  }

  let reciboEnviado = false;
  try {
    enviarRecibo_(email, { nome, nUsp, anoIngresso, trancamento, programasTexto, observacoes });
    reciboEnviado = true;
  } catch (err) {
    Logger.log(`Falha ao enviar o recibo de abertura de habilitação: ${mensagemDe_(err)}`);
  }

  return { sucesso: true, reciboEnviado: reciboEnviado, programas: programasTexto };

}

/*=====================================================
  DIAGNÓSTICO — rodar no editor (diagnosticarConfiguracao >
  Executar). Mostra cada passo com OK ou o erro, só nomes de
  chave, aba e coluna. Não grava nada na planilha.
=====================================================*/

function diagnosticarConfiguracao() {

  const linhas = [];
  const passo = (nome, fn) => {
    try {
      const r = fn();
      linhas.push(`OK    ${nome}${r ? " — " + r : ""}`);
      return true;
    } catch (err) {
      linhas.push(`ERRO  ${nome} — ${mensagemDe_(err)}`);
      return false;
    }
  };

  CacheService.getScriptCache().removeAll([CHAVE_ALUNOS, CHAVE_RESPOSTAS, CHAVE_PERIODOS]
    .reduce((lista, chave) => lista.concat([chaveCacheId_(chave, false), chaveCacheId_(chave, true)]), []));

  passo("Versão do formulário", () => VERSAO_FORMULARIO);
  passo(`Propriedade ${PROPRIEDADE_AMBIENTE}`, () => ambiente_() === "homologacao" ? "homologacao (lê a coluna Homologação do ID_INDEX)" : "producao");
  const temIndice = passo(`Propriedade ${PROPRIEDADE_ID_INDICE}`, () => { obterIdIndice_(); return "definida"; });

  if (temIndice) {
    [CHAVE_PERIODOS, CHAVE_ALUNOS, CHAVE_RESPOSTAS].forEach(chave => {
      passo(`Chave ${chave} no ID_INDEX e acesso à planilha`, () =>
        `abas: ${abrirPlanilhaPorChave_(chave).getSheets().map(a => a.getName()).join(", ")}`);
    });

    passo(`Linha "${NOME_FORMULARIO_PERIODOS}" em Períodos`, () => {
      const p = verificarPeriodoAbertura_();
      return p.aberto ? "período ABERTO agora" : `FECHADO agora; janelas: ${p.janelas.map(j => `${j.inicioTexto} a ${j.fimTexto}`).join("; ") || "nenhuma"}`;
    });

    passo("Títulos da planilha de alunos", () => {
      const titulos = titulosDaAba_(abrirAbaPorChave_(CHAVE_ALUNOS));
      const faltam = ["nUsp", "nome", "ingresso", "email"].map(k => CABECALHOS_ALUNOS[k]).filter(t => titulos.indexOf(t) === -1);
      if (faltam.length) throw new Error(`faltam: ${faltam.join(", ")}`);
      return titulos.indexOf(CABECALHOS_ALUNOS.emailSecundario) === -1 ? "ok (sem eMail Secundario)" : "ok";
    });

    passo(`Esquema da aba "${ABA_RESPOSTAS_ATUAL}"`, () => {
      const titulos = conferirEsquema_(abaAtualDeRespostas_());
      const extras = TITULOS_DO_GERENCIADOR.map(t => `${t}=${titulos.indexOf(t) === -1 ? "ausente" : String.fromCharCode(65 + titulos.indexOf(t))}`);
      const registro = titulos.indexOf(TITULO_REGISTRO_ID) > 10 && titulos.indexOf(TITULO_VERSAO) > 10
        ? "pedidos novos recebem Registro ID e Versão 1"
        : "pedidos novos ficam sem Registro ID (o Gerenciador pede \"Preparar pedido\")";
      return `A–K conferidas; ${extras.join(", ")}; ${registro}`;
    });

    passo(`Aba "${ABA_RESPOSTAS_HISTORICO}" (só leitura)`, () =>
      abrirPlanilhaPorChave_(CHAVE_RESPOSTAS).getSheetByName(ABA_RESPOSTAS_HISTORICO) ? "encontrada" : "ausente (o histórico fica só na aba atual)");
  }

  Logger.log("Diagnóstico do Pedido de Abertura de Habilitação:\n" + linhas.join("\n"));
  return linhas.join("\n");

}
