/*=====================================================
  FORMULÁRIO DE EXCLUSÃO DE DISCIPLINAS — V1.1 (IPUSP)
  Backend Apps Script

  v1.1 (16/10/2026, pedido do Serviço de Graduação), sobre a
  v1.0 em uso:
    - IDs de planilha fora do código: as planilhas são procuradas
      no índice mestre ID_INDEX pelas chaves PLANILHA_ALUNOS,
      EXCLUSAO_DISCIPLINAS, PERIODOS e DISCIPLINAS. O ID do próprio
      ID_INDEX fica em Script Properties ["ID_INDEX_SPREADSHEET_ID"];
    - a identidade é sempre a do login @usp.br (antes o e-mail era
      digitável, e o pedido e o recibo iam para qualquer endereço);
      a busca do aluno deixou de ser pública e só procura o próprio
      login;
    - período conferido também no envio e fechado em caso de erro
      ou configuração incompleta; datas aceitas como texto ou Data;
    - disciplinas pelo CÓDIGO com o cadastro DISCIPLINAS (como no
      Trancamento Parcial); a coluna J recebe "CÓDIGO - Nome";
      código fora do cadastro aceita o nome digitado; disciplina
      repetida no mesmo pedido é recusada; turma em texto livre;
    - pedidos anteriores do próprio e-mail na carga;
    - saiu o cadastro automático na planilha de alunos;
    - texto que começa com = + - @ é neutralizado (não vira fórmula);
    - recibo por e-mail ao aluno como "não responder"; nenhum e-mail
      vai para a caixa do Serviço de Graduação;
    - diagnosticarConfiguracao() para rodar no editor.

  Nenhuma entrada do cliente é confiada sem validação, a escrita
  na planilha é sempre sob trava, e a identidade do solicitante é
  sempre a da sessão autenticada do Google, nunca a que o cliente
  manda.

  PLANILHA DE RESPOSTAS (aba "Respostas ao formulário 1"): 1 linha
  = 1 disciplina de um pedido. As colunas são POSIÇÕES FIXAS, as
  mesmas da v1.0, porque o Painel dos servidores (B, J e T) e o
  Gerenciador de Exclusão (L e T) leem por posição:
    A=Carimbo de data/hora | B=Endereço de e-mail | C=Nº USP |
    D=Nome completo | E=(não usada) | F=Ano de ingresso |
    G=Curso/Habilitação | H=Concluirá o curso neste semestre? |
    I=Declaração de ciência | J=Disciplina ("CÓDIGO - Nome") |
    K=Turma | L=Pedido ID (o mesmo em todas as linhas de um envio) |
    M,N,O=(não usadas) | P=Observações | Q,R,S=fluxo antigo |
    T=Situação (gravada pelo Gerenciador; "concluído" = resolvido).
  Este formulário escreve só A–P e nunca toca em Q–T.

  IMPLANTAÇÃO (Implantar > Gerenciar implantações):
    - "Executar como": EU (a conta do Serviço de Graduação dona
      das planilhas). O aluno não precisa — e não deve — ter
      acesso às planilhas nem ao ID_INDEX.
    - "Quem pode acessar": qualquer pessoa da USP.
=====================================================*/

const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";
const CHAVE_ALUNOS = "PLANILHA_ALUNOS";
const CHAVE_RESPOSTAS = "EXCLUSAO_DISCIPLINAS";
const CHAVE_PERIODOS = "PERIODOS";
const CHAVE_DISCIPLINAS = "DISCIPLINAS";

// Texto exato que identifica este formulário na coluna A da planilha
// de Períodos (o Painel dos servidores tem uma tela própria para ele).
const IDENTIFICACAO_PERIODOS = "Formulário de Exclusão de Disciplinas";

// Títulos da planilha de alunos (os mesmos que a Comunidade IPUSP lê).
const CABECALHOS_ALUNOS = {
  nUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

// Planilha de respostas: posições (1 = A).
const ABA_RESPOSTAS = "Respostas ao formulário 1";
const COL = {
  carimbo: 1, email: 2, nUsp: 3, nome: 4, emailUsp: 5, ano: 6, curso: 7,
  concluira: 8, ciencia: 9, disciplina: 10, turma: 11, pedidoId: 12, observacoes: 16,
  situacao: 20
};
const COLUNAS_GRAVADAS = 16; // A–P
// Conferência mínima de que a aba é a certa antes de gravar por posição.
const INICIO_TITULO_CARIMBO = "carimbo";
const TRECHO_TITULO_EMAIL = "mail";
const VALOR_CIENCIA = "Ciente";

const CURSOS_PERMITIDOS = ["Formação de Psicólogo(a)", "Bacharelado", "Licenciatura"];
const SEPARADOR_CURSOS = " + ";

const MAX_DISCIPLINAS = 6;

// Colunas da planilha DISCIPLINAS (aba "DISCIPLINAS", títulos em
// snake_case na linha 1). Só estas são lidas; nada mais vai à página.
const ABA_DISCIPLINAS = "DISCIPLINAS";
const SITUACAO_SUBSTITUIDA = "substituida";
const CACHE_CATALOGO = "catalogoDisciplinas:v1";
const CACHE_CATALOGO_SEGUNDOS = 3600;
const CACHE_PEDACO = 90000; // CacheService aceita até 100 KB por chave

const TAMANHO_MAXIMO_OBSERVACOES = 4000;
const TAMANHO_MAXIMO_NOME_DISCIPLINA = 150;
const TAMANHO_MAXIMO_TURMA = 20;
const DOMINIO_PERMITIDO = "usp.br";
const TIMEZONE = "America/Sao_Paulo";

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

function doGet(e) {
  return HtmlService.createTemplateFromFile("ExclusaoApp")
    .evaluate()
    .setTitle("Exclusão de Disciplinas — IPUSP")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  ÍNDICE DE PLANILHAS (ID_INDEX) — mesmo formato dos outros
  sistemas do repositório. As mensagens citam só nomes de
  chave/propriedade, nunca IDs.
=====================================================*/

function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error(`Configuração obrigatória ausente: ${PROPRIEDADE_ID_INDICE}.`);
  return String(id).trim();
}

// ID de Produção de uma chave (colunas achadas pelo título). Em cache
// por 10 minutos: o formulário é aberto por muitos alunos.
function obterIdProducao_(chave) {

  const cache = CacheService.getScriptCache();
  const chaveCache = "idIndex:" + chave;
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache;

  const planilha = SpreadsheetApp.openById(obterIdIndice_());
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];
  const valores = aba.getDataRange().getDisplayValues();
  if (valores.length < 2) throw new Error("A planilha ID_INDEX não tem nenhuma linha de dados.");

  const titulos = valores[0].map(t => String(t).trim());
  const colChave = titulos.indexOf("Chave");
  const colId = titulos.indexOf("ID de Produção");
  if (colChave === -1 || colId === -1) {
    throw new Error('A planilha ID_INDEX precisa ter as colunas "Chave" e "ID de Produção".');
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colChave]).trim() === chave) {
      const id = String(valores[i][colId] || "").trim();
      if (!id) throw new Error(`A chave "${chave}" está cadastrada no ID_INDEX, mas a coluna "ID de Produção" está vazia.`);
      cache.put(chaveCache, id, 600);
      return id;
    }
  }

  throw new Error(`Não encontrei a chave "${chave}" na planilha ID_INDEX.`);

}

function abrirPlanilhaPorChave_(chave) {
  return SpreadsheetApp.openById(obterIdProducao_(chave));
}

function abrirAbaPorChave_(chave) {
  return abrirPlanilhaPorChave_(chave).getSheets()[0];
}

// A aba de respostas é a "Respostas ao formulário 1" (nome da v1.0);
// se tiver sido renomeada, vale a primeira.
function abrirAbaRespostas_() {
  const planilha = abrirPlanilhaPorChave_(CHAVE_RESPOSTAS);
  return planilha.getSheetByName(ABA_RESPOSTAS) || planilha.getSheets()[0];
}

function semAcento_(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizarTitulo_(texto) {
  return semAcento_(texto).replace(/\s+/g, " ").trim().toLowerCase();
}

function mensagemDe_(err) {
  return err && err.message ? err.message : String(err);
}

// Erro mostrado ao aluno: a mensagem técnica fica só no registro de
// execução (sem dados pessoais), e o aluno recebe um texto genérico.
function erroParaAluno_(contexto, err) {
  Logger.log(`${contexto}: ${mensagemDe_(err)}`);
  return new Error("Não foi possível concluir agora por um problema de configuração do formulário. " +
    "Tente de novo mais tarde ou avise o Serviço de Graduação.");
}

/*=====================================================
  AUTENTICAÇÃO — a identidade de quem preenche é SEMPRE a
  da sessão do Google. Todo endpoint chama isto de novo.
=====================================================*/

function exigirUsuarioAutenticado_() {

  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();

  if (!email || email.split("@").length !== 2 || email.split("@")[1] !== DOMINIO_PERMITIDO) {
    throw new Error(
      `NAO_AUTENTICADO: Não consegui identificar um login válido do domínio @${DOMINIO_PERMITIDO}. ` +
      `Verifique se você está logado no navegador com seu e-mail USP e recarregue a página.`
    );
  }

  return email;

}

/*=====================================================
  PLANILHA DE PERÍODOS — abre e fecha o formulário e dá as
  datas do texto do requerimento. Primeira aba; colunas
  fixas, as mesmas que o Painel dos servidores grava:
  A=Formulário, C=tipo, D/E=abertura 1º sem. (data, hora),
  F/G=fechamento 1º sem., H/I=abertura 2º sem., J/K=
  fechamento 2º sem., N/O=início/fim da retificação do 1º
  sem., P/Q=início/fim da retificação do 2º sem.

  O Painel grava tudo como TEXTO "dd/mm/aaaa" e "hh:mm"; se
  uma célula virar Data do Sheets (edição à mão), ela é
  reformatada no fuso certo. Nunca new Date(texto).

  Este formulário é sempre Sazonal (o Painel não oferece
  Contínuo para ele): qualquer outro tipo, ou uma janela sem
  as datas de retificação, deixa o formulário fechado, para
  não mostrar o requerimento com datas em branco.
=====================================================*/

function paraTextoDataBR_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    if (isNaN(valor.getTime())) return "";
    return Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy");
  }
  const m = String(valor).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
}

function paraTextoHoraBR_(valor) {
  if (!valor) return "00:00";
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    if (isNaN(valor.getTime())) return "00:00";
    return Utilities.formatDate(valor, TIMEZONE, "HH:mm");
  }
  const m = String(valor).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function combinarDataHora_(data, hora) {
  const dataTexto = paraTextoDataBR_(data);
  if (!dataTexto) return null;
  try {
    const combinado = Utilities.parseDate(`${dataTexto} ${paraTextoHoraBR_(hora)}`, TIMEZONE, "dd/MM/yyyy HH:mm");
    return isNaN(combinado.getTime()) ? null : combinado;
  } catch (err) {
    return null;
  }
}

function formatarData_(data, formato) {
  if (!data) return "";
  try {
    return Utilities.formatDate(data, TIMEZONE, formato);
  } catch (err) {
    return "";
  }
}

function buscarLinhaPeriodo_() {
  const aba = abrirAbaPorChave_(CHAVE_PERIODOS);
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return null;
  const dados = aba.getRange(2, 1, ultimaLinha - 1, 17).getValues(); // A–Q
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0] || "").trim() === IDENTIFICACAO_PERIODOS) return dados[i];
  }
  return null;
}

const MOTIVO_NAO_CONFIGURADO = "Este formulário ainda não foi configurado para o período atual. Entre em contato com o Serviço de Graduação (gradip@usp.br).";
const MOTIVO_FORA_DO_PERIODO = "Fora do período de exclusão de disciplinas. Consulte o Serviço de Graduação para mais informações.";

/*
  { aberto: false, motivo: "..." }
  ou
  { aberto: true, semestre: 1|2, ano: "2026", dataAbertura, horaAbertura,
    dataFechamento, horaFechamento, retifInicio, retifFim }  (texto)
*/
function verificarPeriodo_() {

  let linha;
  try {
    linha = buscarLinhaPeriodo_();
  } catch (err) {
    Logger.log(`Falha ao ler a planilha de períodos: ${mensagemDe_(err)}`);
    return {
      aberto: false,
      motivo: "Não foi possível conferir o período do formulário agora. Tente de novo mais tarde ou avise o Serviço de Graduação."
    };
  }

  if (!linha) {
    Logger.log(`Linha "${IDENTIFICACAO_PERIODOS}" ausente na planilha de períodos.`);
    return { aberto: false, motivo: MOTIVO_NAO_CONFIGURADO };
  }

  const tipo = semAcento_(linha[2]).trim().toLowerCase();
  if (tipo !== "sazonal") {
    Logger.log(`Tipo de período "${tipo}" não serve para este formulário (só Sazonal).`);
    return { aberto: false, motivo: MOTIVO_NAO_CONFIGURADO };
  }

  const agora = new Date();
  const janelas = [
    { semestre: 1, a: 3, retif: 13 },  // D–G, N/O
    { semestre: 2, a: 7, retif: 15 }   // H–K, P/Q
  ];

  for (let i = 0; i < janelas.length; i++) {
    const j = janelas[i];
    const inicio = combinarDataHora_(linha[j.a], linha[j.a + 1]);
    const fim = combinarDataHora_(linha[j.a + 2], linha[j.a + 3]);
    if (!inicio || !fim) continue;
    if (agora < inicio || agora > fim) continue;

    const retifInicio = paraTextoDataBR_(linha[j.retif]);
    const retifFim = paraTextoDataBR_(linha[j.retif + 1]);
    if (!retifInicio || !retifFim) {
      Logger.log(`Janela do ${j.semestre}º semestre aberta sem as datas de retificação.`);
      return { aberto: false, motivo: MOTIVO_NAO_CONFIGURADO };
    }

    return {
      aberto: true,
      semestre: j.semestre,
      ano: formatarData_(inicio, "yyyy"),
      dataAbertura: formatarData_(inicio, "dd/MM/yyyy"),
      horaAbertura: formatarData_(inicio, "HH:mm"),
      dataFechamento: formatarData_(fim, "dd/MM/yyyy"),
      horaFechamento: formatarData_(fim, "HH:mm"),
      retifInicio: retifInicio,
      retifFim: retifFim
    };
  }

  return { aberto: false, motivo: MOTIVO_FORA_DO_PERIODO };

}

/*=====================================================
  PLANILHA DE ALUNOS — só leitura, primeira aba, colunas
  pelo TÍTULO. O login é procurado no "eMail" e, se a coluna
  existir, no "eMail Secundario". Não é chamável pela página:
  só obterDadosIniciais usa, com o e-mail da sessão.
=====================================================*/

function buscarAlunoPorEmail_(email) {

  const aba = abrirAbaPorChave_(CHAVE_ALUNOS);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return null;

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(t => String(t).trim());
  const col = chave => titulos.indexOf(CABECALHOS_ALUNOS[chave]);

  const colNUsp = col("nUsp"), colNome = col("nome"), colEmail = col("email");
  const colEmail2 = col("emailSecundario"), colIngresso = col("ingresso");
  if (colNUsp === -1 || colNome === -1 || colEmail === -1) {
    throw new Error("A planilha de alunos não tem os títulos esperados (Número USP, Nome do Aluno, eMail).");
  }

  const alvo = email.trim().toLowerCase();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const emails = [linha[colEmail], colEmail2 !== -1 ? linha[colEmail2] : ""]
      .map(v => String(v || "").trim().toLowerCase());
    if (emails.indexOf(alvo) === -1) continue;
    const ingresso = colIngresso !== -1 ? String(linha[colIngresso] || "").match(/\d{4}/) : null;
    return {
      nUsp: String(linha[colNUsp] || "").trim(),
      nome: String(linha[colNome] || "").trim(),
      anoIngresso: ingresso ? ingresso[0] : ""
    };
  }

  return null;

}

/*=====================================================
  CADASTRO DE DISCIPLINAS (planilha DISCIPLINAS) — só
  leitura, igual ao Trancamento Parcial. Vão à página só
  código, nome e créditos-aula.

  Catálogo: { disciplinas: [[codigo, nome, creditosAula]],
              apelidos: { CODIGO_ANTIGO: CODIGO_ATUAL } }
=====================================================*/

function normalizarCodigo_(valor) {
  return semAcento_(valor).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function codigoValido_(codigo) {
  return /^[A-Z0-9]{3,12}$/.test(codigo);
}

function montarCatalogo_() {

  const planilha = abrirPlanilhaPorChave_(CHAVE_DISCIPLINAS);
  const aba = planilha.getSheetByName(ABA_DISCIPLINAS);
  if (!aba) throw new Error(`A planilha DISCIPLINAS não tem a aba "${ABA_DISCIPLINAS}".`);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaColuna < 1) return { disciplinas: [], apelidos: {} };

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(t => normalizarTitulo_(t));
  const col = t => titulos.indexOf(t);
  const cCodigo = col("codigo"), cNome = col("nome"), cCreditos = col("creditos_aula");
  const cSituacao = col("situacao"), cAnteriores = col("codigos_anteriores");
  if (cCodigo === -1 || cNome === -1) {
    throw new Error('A aba DISCIPLINAS precisa das colunas "codigo" e "nome".');
  }

  const porCodigo = {};
  const anteriores = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const codigo = normalizarCodigo_(linha[cCodigo]);
    const nome = String(linha[cNome] || "").replace(/\s+/g, " ").trim();
    if (!codigoValido_(codigo) || !nome) continue;

    const substituida = cSituacao !== -1 && normalizarTitulo_(linha[cSituacao]) === SITUACAO_SUBSTITUIDA;
    const creditos = cCreditos !== -1 ? parseInt(linha[cCreditos], 10) : NaN;
    const item = { codigo, nome: nome.slice(0, TAMANHO_MAXIMO_NOME_DISCIPLINA), creditos: isNaN(creditos) ? null : creditos, substituida };

    const existente = porCodigo[codigo];
    if (!existente || (existente.substituida && !substituida)) porCodigo[codigo] = item;

    if (!substituida && cAnteriores !== -1) {
      String(linha[cAnteriores] || "").split(/[,;\n]/).forEach(antigo => {
        const a = normalizarCodigo_(antigo);
        if (codigoValido_(a) && a !== codigo) anteriores.push([a, codigo]);
      });
    }
  }

  const apelidos = {};
  anteriores.forEach(([antigo, atual]) => {
    if (!porCodigo[antigo] && !apelidos[antigo]) apelidos[antigo] = atual;
  });

  const disciplinas = Object.keys(porCodigo).sort().map(c => [c, porCodigo[c].nome, porCodigo[c].creditos]);
  return { disciplinas, apelidos };

}

// Catálogo em cache por 1 hora, em pedaços (limite de 100 KB por chave).
function obterCatalogo_() {

  const cache = CacheService.getScriptCache();
  const partes = cache.get(CACHE_CATALOGO + ":n");
  if (partes) {
    const chaves = [];
    for (let i = 0; i < Number(partes); i++) chaves.push(`${CACHE_CATALOGO}:${i}`);
    const pedacos = cache.getAll(chaves);
    if (chaves.every(k => typeof pedacos[k] === "string")) {
      try {
        return JSON.parse(chaves.map(k => pedacos[k]).join(""));
      } catch (err) {
        // cache corrompido: lê de novo
      }
    }
  }

  const catalogo = montarCatalogo_();
  const json = JSON.stringify(catalogo);
  const valores = {};
  let n = 0;
  for (let i = 0; i < json.length; i += CACHE_PEDACO) valores[`${CACHE_CATALOGO}:${n++}`] = json.slice(i, i + CACHE_PEDACO);
  try {
    cache.putAll(valores, CACHE_CATALOGO_SEGUNDOS);
    cache.put(CACHE_CATALOGO + ":n", String(n), CACHE_CATALOGO_SEGUNDOS);
  } catch (err) {
    Logger.log(`Catálogo de disciplinas não coube no cache: ${mensagemDe_(err)}`);
  }
  return catalogo;

}

// Chamado pela página logo depois da carga. Falha não impede o pedido:
// a página passa a pedir o nome de todas as disciplinas.
function obterCatalogoDisciplinas() {
  exigirUsuarioAutenticado_();
  try {
    const catalogo = obterCatalogo_();
    return { disponivel: catalogo.disciplinas.length > 0, disciplinas: catalogo.disciplinas, apelidos: catalogo.apelidos };
  } catch (err) {
    Logger.log(`Falha ao ler o cadastro de disciplinas: ${mensagemDe_(err)}`);
    return { disponivel: false, disciplinas: [], apelidos: {} };
  }
}

/*=====================================================
  HISTÓRICO — pedidos anteriores do próprio e-mail, só
  informativo. As linhas com o mesmo Pedido ID (L) formam um
  pedido; linhas antigas, sem Pedido ID, valem cada uma como
  um pedido. Um pedido fica "pendente" enquanto alguma das
  suas disciplinas não tiver "conclu" na Situação (T), o
  mesmo critério do Painel dos servidores.
=====================================================*/

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

function estaConcluido_(valorSituacao) {
  return semAcento_(valorSituacao).toLowerCase().indexOf("conclu") !== -1;
}

// Código no começo do texto da coluna J ("PSA0101 - Nome" ou, nas linhas
// antigas, "PSA0101 Nome"); vazio se não houver.
function codigoDoTexto_(texto) {
  const m = semAcento_(texto).toUpperCase().match(/^\s*([A-Z]{3}\s?-?\s?\d{4})(?![0-9])/);
  return m ? normalizarCodigo_(m[1]) : "";
}

function pedidosDoEmail_(aba, email) {

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, COL.situacao).getValues();
  const alvo = email.trim().toLowerCase();
  const pedidos = [];
  const porId = {};

  dados.forEach((linha, i) => {
    if (String(linha[COL.email - 1] || "").trim().toLowerCase() !== alvo) return;
    const texto = String(linha[COL.disciplina - 1] || "").trim();
    if (!texto) return;

    const id = String(linha[COL.pedidoId - 1] || "").trim() || `linha-${i}`;
    let pedido = porId[id];
    if (!pedido) {
      pedido = { carimbo: formatarCarimboExibicao_(linha[COL.carimbo - 1]), pendente: false, disciplinas: [], codigosPendentes: [] };
      porId[id] = pedido;
      pedidos.push(pedido);
    }

    const turma = String(linha[COL.turma - 1] || "").trim();
    const concluida = estaConcluido_(linha[COL.situacao - 1]);
    pedido.disciplinas.push({ texto: turma ? `${texto} — turma ${turma}` : texto, concluida: concluida });
    if (!concluida) {
      pedido.pendente = true;
      const codigo = codigoDoTexto_(texto);
      if (codigo && pedido.codigosPendentes.indexOf(codigo) === -1) pedido.codigosPendentes.push(codigo);
    }
  });

  return pedidos;

}

function buscarHistorico_(email) {
  try {
    return pedidosDoEmail_(abrirAbaRespostas_(), email);
  } catch (err) {
    Logger.log(`Falha ao buscar histórico de exclusão: ${mensagemDe_(err)}`);
    return [];
  }
}

/*=====================================================
  CARGA INICIAL — nunca recebe nada do cliente.
=====================================================*/

function periodoParaCliente_(p) {
  // Só texto: nada de Date pela ponte do google.script.run.
  return {
    semestre: p.semestre, ano: p.ano,
    dataAbertura: p.dataAbertura, horaAbertura: p.horaAbertura,
    dataFechamento: p.dataFechamento, horaFechamento: p.horaFechamento,
    retifInicio: p.retifInicio, retifFim: p.retifFim
  };
}

function obterDadosIniciais() {

  let email;
  try {
    email = exigirUsuarioAutenticado_();
  } catch (err) {
    return { autenticado: false };
  }

  let periodo;
  try {
    periodo = verificarPeriodo_();
  } catch (err) {
    periodo = { aberto: false, motivo: "Não foi possível conferir o período do formulário agora. Tente de novo mais tarde." };
  }
  if (!periodo.aberto) {
    return { autenticado: true, periodoAberto: false, motivoFechado: periodo.motivo };
  }

  // Planilha de alunos fora do ar não impede o pedido.
  let aluno = null;
  try {
    aluno = buscarAlunoPorEmail_(email);
  } catch (err) {
    Logger.log(`Falha ao ler a planilha de alunos: ${mensagemDe_(err)}`);
  }

  let urlFormulario = "";
  try {
    urlFormulario = ScriptApp.getService().getUrl() || "";
  } catch (err) {
    urlFormulario = "";
  }

  return {
    autenticado: true,
    periodoAberto: true,
    periodo: periodoParaCliente_(periodo),
    encontrado: !!aluno,
    email: email,
    nUsp: aluno ? aluno.nUsp : "",
    nome: aluno ? aluno.nome : "",
    anoIngresso: aluno ? aluno.anoIngresso : "",
    historico: buscarHistorico_(email),
    urlFormulario: urlFormulario,
    maxDisciplinas: MAX_DISCIPLINAS
  };

}

/*=====================================================
  VALIDAÇÃO — toda entrada do cliente é não confiável.
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
  if (!texto) throw new Error("Informe o ano de ingresso.");
  const anoAtual = Number(formatarData_(new Date(), "yyyy")) || 2100;
  if (!/^\d{4}$/.test(texto) || Number(texto) < 1950 || Number(texto) > anoAtual) {
    throw new Error("Ano de ingresso inválido — use 4 números, como 2024.");
  }
  return texto;
}

function validarCursos_(lista) {
  if (!Array.isArray(lista)) throw new Error("Selecione ao menos uma opção em Curso/Habilitação.");
  const escolhidos = CURSOS_PERMITIDOS.filter(c => lista.indexOf(c) !== -1);
  if (escolhidos.length === 0 || escolhidos.length !== lista.length) {
    throw new Error("Selecione ao menos uma opção em Curso/Habilitação.");
  }
  return escolhidos.join(SEPARADOR_CURSOS);
}

function validarSimNao_(valor, mensagem) {
  const texto = String(valor || "").trim();
  if (texto !== "Sim" && texto !== "Não") throw new Error(mensagem);
  return texto;
}

// Devolve [{ codigo, nome, turma, doCadastro }]. O nome de um código que
// está no cadastro vem do cadastro (o que a página mandou é ignorado); um
// código antigo vira o atual. Sem cadastro disponível, vale o nome digitado.
// A turma é texto livre (o aluno pode escrever só "01").
function validarDisciplinas_(lista, catalogo) {

  if (!Array.isArray(lista)) throw new Error("Informe ao menos uma disciplina para exclusão.");

  const porCodigo = {};
  (catalogo ? catalogo.disciplinas : []).forEach(d => { porCodigo[d[0]] = d; });
  const apelidos = catalogo ? catalogo.apelidos : {};

  const resultado = [];
  const vistos = {};

  lista.forEach(item => {
    const bruto = item && typeof item === "object" ? item : {};
    let codigo = normalizarCodigo_(bruto.codigo);
    const nomeDigitado = String(bruto.nome || "").replace(/\s+/g, " ").trim();
    const turmaBruta = String(bruto.turma || "").replace(/\s+/g, " ").trim();
    if (!codigo && !nomeDigitado && !turmaBruta) return;

    const rotulo = `Disciplina ${resultado.length + 1}`;
    if (!codigo) throw new Error(`${rotulo}: informe o código (sigla) da disciplina.`);
    if (!codigoValido_(codigo)) throw new Error(`${rotulo}: código "${String(bruto.codigo).slice(0, 20)}" inválido — use só letras e números, como no Júpiter.`);

    if (!porCodigo[codigo] && apelidos[codigo]) codigo = apelidos[codigo];
    const doCadastro = porCodigo[codigo];

    let nome;
    if (doCadastro) {
      nome = doCadastro[1];
    } else {
      if (!nomeDigitado) throw new Error(`${rotulo}: o código ${codigo} não está no cadastro de disciplinas. Confira o código ou digite o nome da disciplina.`);
      if (nomeDigitado.length > TAMANHO_MAXIMO_NOME_DISCIPLINA) throw new Error(`${rotulo}: nome da disciplina muito longo.`);
      nome = nomeDigitado;
    }

    if (!turmaBruta) throw new Error(`${rotulo} (${codigo}): informe a turma.`);
    if (turmaBruta.length > TAMANHO_MAXIMO_TURMA) throw new Error(`${rotulo} (${codigo}): turma muito longa.`);

    if (vistos[codigo]) throw new Error(`A disciplina ${codigo} foi informada mais de uma vez. Informe cada disciplina só uma vez.`);
    vistos[codigo] = true;

    resultado.push({ codigo, nome, turma: turmaBruta, doCadastro: !!doCadastro });
  });

  if (resultado.length === 0) throw new Error("Informe ao menos uma disciplina para exclusão.");
  if (resultado.length > MAX_DISCIPLINAS) throw new Error(`Só é possível informar até ${MAX_DISCIPLINAS} disciplinas por pedido.`);

  return resultado;

}

/*=====================================================
  RECIBO POR E-MAIL — texto simples, só para o e-mail do
  login, como "não responder".
=====================================================*/

function textoSemApostrofoInicial_(texto) {
  return String(texto || "").replace(/^'(?=[=+\-@])/, "");
}

function saudacao_(data) {
  const hora = Number(formatarData_(data, "HH"));
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function montarRecibo_(dados, quando, periodo) {
  const primeiroNome = textoSemApostrofoInicial_(dados.nome).split(" ")[0];
  const semestre = periodo && periodo.semestre ? ` (${periodo.semestre}º semestre de ${periodo.ano})` : "";
  const linhas = [
    `${saudacao_(quando)}, ${primeiroNome}.`,
    "",
    `Recebemos o seu pedido de exclusão de disciplina${dados.disciplinas.length === 1 ? "" : "s"}${semestre} em ${formatarData_(quando, "dd/MM/yyyy 'às' HH:mm")}.`,
    "",
    dados.disciplinas.length === 1 ? "Disciplina:" : "Disciplinas:"
  ];
  dados.disciplinas.forEach((d, i) => linhas.push(`${i + 1}. ${d.codigo} - ${d.nome} — turma ${textoSemApostrofoInicial_(d.turma)}`));
  linhas.push(
    "",
    "Dados enviados:",
    `- Nome: ${textoSemApostrofoInicial_(dados.nome)}`,
    `- Número USP: ${dados.nUsp}`,
    `- Ano de ingresso: ${dados.anoIngresso}`,
    `- Curso/Habilitação: ${dados.curso}`,
    `- Concluirá o curso neste semestre: ${dados.concluira}`,
    `- Observações: ${dados.observacoes ? textoSemApostrofoInicial_(dados.observacoes) : "(não informadas)"}`,
    "",
    "Este e-mail é só o recibo do envio. Os pedidos são processados por ordem de chegada, e avisaremos pelo seu e-mail USP assim que o seu for finalizado.",
    "Lembre-se: depois de processada pelo Serviço de Graduação, a exclusão não pode ser revertida. Acompanhe a sua matrícula no Sistema Júpiter até o final do processo.",
    "",
    "Dúvidas: escreva para gradip@usp.br a partir do seu e-mail USP, informando o nome completo e o número USP.",
    "",
    "Mensagem automática, não responda.",
    "Serviço de Graduação — Instituto de Psicologia da USP"
  );
  return linhas.join("\n");
}

function enviarRecibo_(email, dados, periodo) {
  MailApp.sendEmail(email, "Recibo — Pedido de Exclusão de Disciplinas",
    montarRecibo_(dados, new Date(), periodo), { name: "Serviço de Graduação — IPUSP", noReply: true });
}

/*=====================================================
  GRAVAÇÃO DO PEDIDO — uma linha por disciplina, todas com
  o mesmo Pedido ID, numa única escrita.
=====================================================*/

function conferirAbaRespostas_(aba) {
  const titulos = aba.getRange(1, 1, 1, 2).getValues()[0].map(normalizarTitulo_);
  if (titulos[0].indexOf(INICIO_TITULO_CARIMBO) !== 0 || titulos[1].indexOf(TRECHO_TITULO_EMAIL) === -1) {
    throw new Error('A aba de respostas não começa com "Carimbo de data/hora" e "Endereço de e-mail".');
  }
}

function registrarSolicitacao(dados) {

  const email = exigirUsuarioAutenticado_();
  dados = dados || {};

  // Período conferido de novo no envio: a página pode ter ficado aberta.
  const periodo = verificarPeriodo_();
  if (!periodo.aberto) throw new Error(periodo.motivo || "O formulário não está disponível no momento.");

  if (dados.ciencia !== true) {
    throw new Error("É necessário declarar ciência de que a exclusão é irreversível.");
  }

  const nome = sanitizarTextoPlano_(dados.nome, 200);
  if (!nome) throw new Error("O nome não pode ficar vazio.");

  const nUsp = normalizarNUsp_(dados.nUsp);
  const anoIngresso = validarAnoIngresso_(dados.anoIngresso);
  const curso = validarCursos_(dados.cursos);
  const concluira = validarSimNao_(dados.concluira, "Informe se você concluirá o curso neste semestre.");

  let catalogo = null;
  try {
    catalogo = obterCatalogo_();
  } catch (err) {
    Logger.log(`Falha ao ler o cadastro de disciplinas no envio: ${mensagemDe_(err)}`);
  }
  const disciplinas = validarDisciplinas_(dados.disciplinas, catalogo);

  const observacoesBrutas = String(dados.observacoes || "").trim();
  if (observacoesBrutas.length > TAMANHO_MAXIMO_OBSERVACOES) {
    throw new Error(`As observações passaram de ${TAMANHO_MAXIMO_OBSERVACOES} caracteres. Resuma o texto e envie de novo.`);
  }
  const observacoes = sanitizarTextoPlano_(observacoesBrutas, TAMANHO_MAXIMO_OBSERVACOES + 1);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error("Muitos pedidos sendo gravados ao mesmo tempo. Aguarde alguns segundos e clique em Enviar de novo.");
  }

  try {

    let aba;
    try {
      aba = abrirAbaRespostas_();
      conferirAbaRespostas_(aba);
    } catch (err) {
      throw erroParaAluno_("Falha ao abrir a planilha de respostas", err);
    }

    const carimbo = new Date();
    const pedidoId = Utilities.getUuid();

    const linhas = disciplinas.map(d => {
      const l = new Array(COLUNAS_GRAVADAS).fill("");
      l[COL.carimbo - 1] = carimbo;
      l[COL.email - 1] = email;
      l[COL.nUsp - 1] = nUsp;
      l[COL.nome - 1] = nome;
      l[COL.ano - 1] = anoIngresso;
      l[COL.curso - 1] = curso;
      l[COL.concluira - 1] = concluira;
      l[COL.ciencia - 1] = VALOR_CIENCIA;
      l[COL.disciplina - 1] = sanitizarTextoPlano_(`${d.codigo} - ${d.nome}`, 200);
      l[COL.turma - 1] = sanitizarTextoPlano_(d.turma, TAMANHO_MAXIMO_TURMA + 1);
      l[COL.pedidoId - 1] = pedidoId;
      l[COL.observacoes - 1] = observacoes;
      return l;
    });

    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, COLUNAS_GRAVADAS).setValues(linhas);

  } finally {
    lock.releaseLock();
  }

  // Recibo fora da trava. Se falhar, o pedido continua gravado.
  let reciboEnviado = false;
  try {
    enviarRecibo_(email, { nome, nUsp, anoIngresso, curso, concluira, disciplinas, observacoes }, periodo);
    reciboEnviado = true;
  } catch (err) {
    Logger.log(`Falha ao enviar recibo de exclusão: ${mensagemDe_(err)}`);
  }

  return {
    sucesso: true,
    reciboEnviado: reciboEnviado,
    disciplinas: disciplinas.map(d => `${d.codigo} - ${d.nome} — turma ${d.turma}`)
  };

}

/*=====================================================
  DIAGNÓSTICO — rodar no editor: selecione
  diagnosticarConfiguracao e clique em Executar. O resultado
  sai em "Registro de execução": cada passo da configuração
  com OK ou o erro. Só nomes de chave e coluna, sem dados
  pessoais nem IDs. Não grava nada e não usa o cache.
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

  CacheService.getScriptCache().removeAll([
    "idIndex:" + CHAVE_ALUNOS, "idIndex:" + CHAVE_RESPOSTAS, "idIndex:" + CHAVE_PERIODOS,
    "idIndex:" + CHAVE_DISCIPLINAS, CACHE_CATALOGO + ":n"
  ]);

  const temIndice = passo(`Propriedade ${PROPRIEDADE_ID_INDICE}`, () => { obterIdIndice_(); return "definida"; });

  if (temIndice) {
    [CHAVE_PERIODOS, CHAVE_ALUNOS, CHAVE_RESPOSTAS, CHAVE_DISCIPLINAS].forEach(chave => {
      passo(`Chave ${chave} no ID_INDEX e acesso à planilha`, () => {
        const planilha = abrirPlanilhaPorChave_(chave);
        return `abas: ${planilha.getSheets().map(a => a.getName()).join(", ")}`;
      });
    });

    passo(`Linha "${IDENTIFICACAO_PERIODOS}" em Períodos`, () => {
      const linha = buscarLinhaPeriodo_();
      if (!linha) throw new Error("não encontrada na coluna A da primeira aba");
      const mostra = v => Object.prototype.toString.call(v) === "[object Date]" ? `Data(${formatarData_(v, "dd/MM/yyyy HH:mm")})` : JSON.stringify(v);
      return `tipo ${mostra(linha[2])}; 1º sem. ${mostra(linha[3])} ${mostra(linha[4])} a ${mostra(linha[5])} ${mostra(linha[6])}, retificação ${mostra(linha[13])} a ${mostra(linha[14])}; ` +
        `2º sem. ${mostra(linha[7])} ${mostra(linha[8])} a ${mostra(linha[9])} ${mostra(linha[10])}, retificação ${mostra(linha[15])} a ${mostra(linha[16])}`;
    });

    passo("Período agora", () => {
      const p = verificarPeriodo_();
      return p.aberto ? `ABERTO (${p.semestre}º semestre de ${p.ano}, até ${p.dataFechamento} ${p.horaFechamento})` : `FECHADO — ${p.motivo}`;
    });

    passo("Aba e títulos da planilha de respostas", () => {
      const aba = abrirAbaRespostas_();
      conferirAbaRespostas_(aba);
      const titulos = aba.getRange(1, 1, 1, COL.situacao).getValues()[0];
      const letra = i => String.fromCharCode(65 + i);
      return `aba "${aba.getName()}"; ` + titulos.map((t, i) => `${letra(i)}=${JSON.stringify(String(t).trim())}`).join(" ");
    });

    passo("Cadastro de disciplinas", () => `${montarCatalogo_().disciplinas.length} disciplinas`);
  }

  Logger.log("Diagnóstico da Exclusão de Disciplinas:\n" + linhas.join("\n"));
  return linhas.join("\n");

}
