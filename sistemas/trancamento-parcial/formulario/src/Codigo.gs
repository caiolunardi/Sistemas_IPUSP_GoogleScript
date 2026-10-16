/*=====================================================
  PEDIDO DE TRANCAMENTO PARCIAL DE MATRÍCULA — V1.1.1
  (IPUSP)
  Backend Apps Script

  v1.1.1 (16/10/2026): diagnosticarConfiguracao(), para rodar no
  editor e ver qual passo da configuração falha.

  v1.1 (16/10/2026, pedido do Serviço de Graduação), sobre a
  v1.0 em uso:
    - IDs de planilha fora do código: as planilhas são procuradas
      no índice mestre ID_INDEX pelas chaves PLANILHA_ALUNOS,
      TRANCAMENTO_PARCIAL_MATRICULA, PERIODOS e DISCIPLINAS. O ID
      do próprio ID_INDEX fica em Script Properties
      ["ID_INDEX_SPREADSHEET_ID"];
    - disciplinas pelo CÓDIGO: a página recebe o cadastro da
      planilha DISCIPLINAS (só código, nome e créditos-aula) e
      preenche o nome sozinha. Código que não está no cadastro
      aceita o nome digitado pelo aluno. No servidor, o nome de um
      código cadastrado vem sempre do cadastro, e a planilha de
      respostas recebe "CÓDIGO - Nome";
    - planilha de respostas lida pelo TÍTULO das colunas (antes,
      posição fixa A–S); a coluna da declaração de ciência, cujo
      título traz as datas do período, é achada pelo começo do
      texto ("Declaro estar ciente"), com a 4ª coluna como reserva;
    - planilha de alunos só para leitura, pelo título, procurando o
      login também no "eMail Secundario". Saiu o cadastro
      automático de aluno não encontrado (gravava pelas colunas
      A–D fixas da planilha compartilhada);
    - saiu o ano de ingresso, que só servia para esse cadastro (a
      planilha de respostas não tem essa coluna);
    - justificativa opcional, até 4.000 caracteres (acima disso é
      recusada com mensagem, não cortada);
    - recibo por e-mail ao aluno, como "não responder"; nenhum
      e-mail vai para a caixa do Serviço de Graduação;
    - gravação com appendRow, trava com mensagem clara e erros de
      configuração sem detalhe técnico para o aluno.
    ATENÇÃO: o envio de e-mail pede uma nova autorização do
    script (permissão de enviar e-mail como a conta que implanta).

  Nenhuma entrada do cliente é confiada sem validação, a escrita
  na planilha é sempre sob trava, e a identidade do solicitante é
  sempre a da sessão autenticada do Google, nunca a que o cliente
  manda.

  Este Web App só CRIA pedidos (grava "pendente" na planilha de
  respostas). O processamento (avisar o aluno, concluir,
  relatórios) é do "Gerenciador de Trancamento Parcial", que lê a
  mesma planilha.

  IMPLANTAÇÃO (Implantar > Gerenciar implantações):
    - "Executar como": EU (a conta do Serviço de Graduação dona
      das planilhas). O aluno não precisa — e não deve — ter
      acesso às planilhas nem ao ID_INDEX.
    - "Quem pode acessar": qualquer pessoa da USP.

  CONFIGURAÇÃO DO PROJETO:
    - Propriedades do script: ID_INDEX_SPREADSHEET_ID = ID da
      planilha mestre ID_INDEX.
    - No ID_INDEX (aba "Página1" ou a primeira; colunas "Chave" e
      "ID de Produção"): PLANILHA_ALUNOS,
      TRANCAMENTO_PARCIAL_MATRICULA, PERIODOS e DISCIPLINAS.
=====================================================*/

const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";
const CHAVE_ALUNOS = "PLANILHA_ALUNOS";
const CHAVE_RESPOSTAS = "TRANCAMENTO_PARCIAL_MATRICULA";
const CHAVE_PERIODOS = "PERIODOS";
const CHAVE_DISCIPLINAS = "DISCIPLINAS";

// Texto exato que identifica este formulário na coluna A da planilha
// de Períodos (compartilhada com os outros formulários e editada pelo
// Painel dos servidores). Nunca usar o link (coluna B) para
// identificar: ele muda a cada implantação nova.
const IDENTIFICACAO_PERIODOS = "Pedido de Trancamento Parcial de Matrícula";

// Títulos da planilha de alunos (os mesmos que a Comunidade IPUSP lê).
const CABECALHOS_ALUNOS = {
  nUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

// Títulos da planilha de respostas (os mesmos que o Gerenciador lê).
// Este formulário NUNCA cria coluna: título ausente bloqueia o envio,
// porque a planilha é lida por outro sistema e um título diferente é
// sinal de algo errado nela.
const CABECALHOS_RESPOSTAS = {
  situacao: "Situação do Pedido",
  carimbo: "Carimbo de data/hora",
  email: "Endereço de e-mail",
  nUsp: "Número USP",
  nome: "Nome",
  creditos: "Número de créditos-aula em que está matriculado(a)",
  menos12: "Após o trancamento, você ficará com menos de 12 créditos-aula?",
  concluiCurso: "Você concluirá o curso neste semestre?",
  justificativa: "Justificativa"
};

// "Disciplina 1" a "Disciplina 6".
const MAX_DISCIPLINAS = 6;
const PREFIXO_TITULO_DISCIPLINA = "Disciplina ";

// O título da declaração de ciência traz as datas do período e muda de
// semestre para semestre: a coluna é achada pelo começo do texto (sem
// diferença de acento, caixa ou espaços); se nenhum título começar
// assim, vale a 4ª coluna, onde ela sempre esteve.
const INICIO_TITULO_CIENCIA = "declaro estar ciente";
const COLUNA_CIENCIA = 4;
const VALOR_CIENCIA = "Ciente";

// Colunas da planilha DISCIPLINAS (aba "DISCIPLINAS", títulos em
// snake_case na linha 1). Só estas são lidas; nada mais vai à página.
const ABA_DISCIPLINAS = "DISCIPLINAS";
const SITUACAO_SUBSTITUIDA = "substituida";
const CACHE_CATALOGO = "catalogoDisciplinas:v1";
const CACHE_CATALOGO_SEGUNDOS = 3600;
const CACHE_PEDACO = 90000; // CacheService aceita até 100 KB por chave

const TAMANHO_MAXIMO_JUSTIFICATIVA = 4000;
const TAMANHO_MAXIMO_NOME_DISCIPLINA = 150;
const DOMINIO_PERMITIDO = "usp.br";
const TIMEZONE = "America/Sao_Paulo";

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

function doGet(e) {
  return HtmlService.createTemplateFromFile("TrancamentoParcialApp")
    .evaluate()
    .setTitle("Pedido de Trancamento Parcial de Matrícula — IPUSP")
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
  datas dos textos. Primeira aba; colunas fixas, as mesmas
  que o Painel dos servidores grava: A=Formulário, B=Link,
  C=tipo (Sazonal/Contínuo), D/E=abertura 1º sem. (data,
  hora), F/G=fechamento 1º sem., H/I=abertura 2º sem.,
  J/K=fechamento 2º sem.

  As datas e horas são TEXTO "dd/mm/aaaa" e "hh:mm". Nunca
  usar new Date(texto) (ambíguo e no fuso do servidor):
  Utilities.parseDate com o fuso de Brasília. Se a célula
  virar Data do Sheets, ela é reformatada no fuso certo.
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
  const dados = aba.getRange(2, 1, ultimaLinha - 1, 11).getValues();
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0] || "").trim() === IDENTIFICACAO_PERIODOS) return dados[i];
  }
  return null;
}

/*
  { aberto: false, motivo: "..." }
  ou
  { aberto: true, semestre: 1|2|null, ano: 2026, horaFimTexto: "23h59",
    diaFimTexto, dataInicioTexto, dataFimTexto }
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
    return {
      aberto: false,
      motivo: "O período deste formulário não está configurado. Avise o Serviço de Graduação."
    };
  }

  const tipo = semAcento_(linha[2]).trim().toLowerCase();
  const agora = new Date();

  if (tipo === "continuo") {
    return { aberto: true, semestre: null, ano: parseInt(formatarData_(agora, "yyyy"), 10),
             horaFimTexto: "", diaFimTexto: "", dataInicioTexto: "", dataFimTexto: "" };
  }

  const janelas = [
    { semestre: 1, inicio: combinarDataHora_(linha[3], linha[4]), fim: combinarDataHora_(linha[5], linha[6]) },
    { semestre: 2, inicio: combinarDataHora_(linha[7], linha[8]), fim: combinarDataHora_(linha[9], linha[10]) }
  ];

  for (let i = 0; i < janelas.length; i++) {
    const j = janelas[i];
    if (!j.inicio || !j.fim) continue;
    if (agora < j.inicio || agora > j.fim) continue;
    return {
      aberto: true,
      semestre: j.semestre,
      ano: parseInt(formatarData_(j.inicio, "yyyy"), 10),
      horaFimTexto: formatarData_(j.fim, "HH'h'mm"),
      diaFimTexto: formatarData_(j.fim, "dd/MM/yyyy"),
      dataInicioTexto: formatarData_(j.inicio, "dd/MM/yyyy"),
      dataFimTexto: formatarData_(j.fim, "dd/MM/yyyy")
    };
  }

  return {
    aberto: false,
    motivo: "O formulário de Trancamento Parcial de Matrícula não está disponível no momento. Consulte o Serviço de Graduação para saber o próximo período de abertura."
  };

}

/*=====================================================
  PLANILHA DE ALUNOS — só leitura, primeira aba, colunas
  pelo TÍTULO. O login é procurado no "eMail" e, se a coluna
  existir, no "eMail Secundario".
=====================================================*/

function buscarAlunoPorEmail_(email) {

  const aba = abrirAbaPorChave_(CHAVE_ALUNOS);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return null;

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(t => String(t).trim());
  const col = chave => titulos.indexOf(CABECALHOS_ALUNOS[chave]);

  const colNUsp = col("nUsp"), colNome = col("nome"), colEmail = col("email"), colEmail2 = col("emailSecundario");
  if (colNUsp === -1 || colNome === -1 || colEmail === -1) {
    throw new Error("A planilha de alunos não tem os títulos esperados (Número USP, Nome do Aluno, eMail).");
  }

  const alvo = email.trim().toLowerCase();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const emails = [linha[colEmail], colEmail2 !== -1 ? linha[colEmail2] : ""]
      .map(v => String(v || "").trim().toLowerCase());
    if (emails.indexOf(alvo) === -1) continue;
    return {
      nUsp: String(linha[colNUsp] || "").trim(),
      nome: String(linha[colNome] || "").trim()
    };
  }

  return null;

}

/*=====================================================
  CADASTRO DE DISCIPLINAS (planilha DISCIPLINAS) — só
  leitura. Vão à página só código, nome e créditos-aula
  (informação pública do Júpiter); observações internas e o
  resto das colunas nunca saem do servidor.

  Catálogo: { disciplinas: [[codigo, nome, creditosAula]],
              apelidos: { CODIGO_ANTIGO: CODIGO_ATUAL } }
  Uma linha "Substituída" só entra se nenhuma outra linha tiver
  o mesmo código. Os códigos de codigos_anteriores (separados
  por vírgula) viram apelidos do código atual, a menos que
  sejam também código de outra linha.
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
  informativo (o aluno pode enviar quantas vezes precisar
  dentro do prazo).
=====================================================*/

function mapearCabecalhosRespostas_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return { titulos: [], mapa: {} };
  const titulos = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(t => String(t).trim());
  const mapa = {};
  titulos.forEach((titulo, indice) => {
    if (titulo && !mapa[titulo]) mapa[titulo] = indice + 1;
  });
  return { titulos, mapa };
}

function colunasDisciplinas_(mapa) {
  const colunas = [];
  for (let i = 1; i <= MAX_DISCIPLINAS; i++) colunas.push(mapa[PREFIXO_TITULO_DISCIPLINA + i] || 0);
  return colunas;
}

function colunaCiencia_(titulos) {
  for (let i = 0; i < titulos.length; i++) {
    if (normalizarTitulo_(titulos[i]).indexOf(INICIO_TITULO_CIENCIA) === 0) return i + 1;
  }
  return COLUNA_CIENCIA;
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

// Mesmo critério do Gerenciador: concluído quando a Situação contém
// "conclu"; qualquer outra coisa conta como pendente.
function estaConcluido_(valorSituacao) {
  return semAcento_(valorSituacao).toLowerCase().indexOf("conclu") !== -1;
}

function pedidosDoEmail_(aba, email) {

  const resultados = [];
  const { mapa } = mapearCabecalhosRespostas_(aba);

  const colEmail = mapa[CABECALHOS_RESPOSTAS.email];
  const colCarimbo = mapa[CABECALHOS_RESPOSTAS.carimbo];
  const colSituacao = mapa[CABECALHOS_RESPOSTAS.situacao];
  const colDisc = colunasDisciplinas_(mapa);
  if (!colEmail) return resultados;

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return resultados;

  const dados = aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues();
  const alvo = email.trim().toLowerCase();

  dados.forEach(linha => {
    if (String(linha[colEmail - 1] || "").trim().toLowerCase() !== alvo) return;
    const situacao = colSituacao ? String(linha[colSituacao - 1] || "") : "";
    resultados.push({
      carimbo: colCarimbo ? formatarCarimboExibicao_(linha[colCarimbo - 1]) : "",
      situacao: situacao || "(sem status registrado)",
      pendente: !estaConcluido_(situacao),
      disciplinas: colDisc.filter(c => c).map(c => String(linha[c - 1] || "").trim()).filter(Boolean)
    });
  });

  return resultados;

}

function buscarHistoricoCompleto_(email) {
  try {
    return pedidosDoEmail_(abrirAbaPorChave_(CHAVE_RESPOSTAS), email);
  } catch (err) {
    Logger.log(`Falha ao buscar histórico de trancamento parcial: ${mensagemDe_(err)}`);
    return [];
  }
}

/*=====================================================
  CARGA INICIAL — nunca recebe nada do cliente.
=====================================================*/

function periodoParaCliente_(periodo) {
  // Só tipos simples: nada de Date pela ponte do google.script.run.
  return {
    semestre: periodo.semestre,
    ano: periodo.ano,
    horaFimTexto: periodo.horaFimTexto,
    diaFimTexto: periodo.diaFimTexto,
    dataInicioTexto: periodo.dataInicioTexto,
    dataFimTexto: periodo.dataFimTexto
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
    historico: buscarHistoricoCompleto_(email),
    urlFormulario: urlFormulario
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

function validarCreditos_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) throw new Error("Informe o número de créditos-aula em que está matriculado(a).");
  if (!/^\d{1,2}$/.test(texto) || Number(texto) < 1) {
    throw new Error("Número de créditos-aula inválido — use um número inteiro entre 1 e 99.");
  }
  return String(Number(texto));
}

function validarSimNao_(valor, rotuloCampo) {
  const texto = String(valor || "").trim();
  if (texto !== "Sim" && texto !== "Não") {
    throw new Error(`Responda "${rotuloCampo}".`);
  }
  return texto;
}

// Devolve [{ codigo, nome, doCadastro }]. O nome de um código que está
// no cadastro vem do cadastro (o que a página mandou é ignorado); um
// código antigo vira o código atual. Sem cadastro disponível, vale o
// nome digitado.
function validarDisciplinas_(lista, catalogo) {

  if (!Array.isArray(lista)) throw new Error("Informe ao menos uma disciplina para trancamento.");

  const porCodigo = {};
  (catalogo ? catalogo.disciplinas : []).forEach(d => { porCodigo[d[0]] = d; });
  const apelidos = catalogo ? catalogo.apelidos : {};

  const resultado = [];
  const vistos = {};

  lista.forEach((item, i) => {
    const bruto = item && typeof item === "object" ? item : {};
    let codigo = normalizarCodigo_(bruto.codigo);
    const nomeDigitado = String(bruto.nome || "").replace(/\s+/g, " ").trim();
    if (!codigo && !nomeDigitado) return;

    const rotulo = `Disciplina ${resultado.length + 1}`;
    if (!codigo) throw new Error(`${rotulo}: informe o código (sigla) da disciplina.`);
    if (!codigoValido_(codigo)) throw new Error(`${rotulo}: código "${String(bruto.codigo).slice(0, 20)}" inválido — use só letras e números, como no histórico escolar.`);

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

    if (vistos[codigo]) throw new Error(`A disciplina ${codigo} foi informada mais de uma vez. Informe cada disciplina só uma vez.`);
    vistos[codigo] = true;

    resultado.push({ codigo, nome, doCadastro: !!doCadastro });
  });

  if (resultado.length === 0) throw new Error("Informe ao menos uma disciplina para trancamento.");
  if (resultado.length > MAX_DISCIPLINAS) throw new Error(`Só é possível informar até ${MAX_DISCIPLINAS} disciplinas por pedido.`);

  return resultado;

}

function textoDisciplina_(d) {
  return sanitizarTextoPlano_(`${d.codigo} - ${d.nome}`, 200);
}

/*=====================================================
  RECIBO POR E-MAIL — texto simples, só para o e-mail do
  login, como "não responder".
=====================================================*/

function textoSemApostrofoInicial_(texto) {
  return String(texto || "").replace(/^'(?=[=+\-@])/, "");
}

function montarRecibo_(dados, quando, periodo) {
  const linhas = [
    `Olá, ${textoSemApostrofoInicial_(dados.nome).split(" ")[0]}.`,
    "",
    `Recebemos o seu pedido de trancamento parcial de matrícula em ${quando}.`,
    "",
    "Disciplinas, na ordem de preferência:"
  ];
  dados.disciplinas.forEach((d, i) => linhas.push(`${i + 1}. ${d.codigo} - ${d.nome}`));
  linhas.push(
    "",
    "Dados enviados:",
    `- Nome: ${textoSemApostrofoInicial_(dados.nome)}`,
    `- Número USP: ${dados.nUsp}`,
    `- Créditos-aula em que está matriculado(a): ${dados.creditos}`,
    `- Ficará com menos de 12 créditos-aula após o trancamento: ${dados.menos12}`,
    `- Concluirá o curso neste semestre: ${dados.concluiCurso}`,
    `- Justificativa: ${dados.justificativa ? textoSemApostrofoInicial_(dados.justificativa) : "(não informada)"}`,
    "",
    "Este e-mail é só o recibo do envio. O Serviço de Graduação atenderá o pedido em até 10 (dez) dias úteis e enviará outra mensagem para o seu e-mail USP."
  );
  if (periodo && periodo.dataInicioTexto && periodo.dataFimTexto) {
    linhas.push(`Entre ${periodo.dataInicioTexto} e ${periodo.dataFimTexto}, confira no seu histórico escolar se o trancamento foi cadastrado.`);
  }
  linhas.push("", "Mensagem automática, não responda.", "Serviço de Graduação — Instituto de Psicologia da USP");
  return linhas.join("\n");
}

function enviarRecibo_(email, dados, periodo) {
  const quando = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy 'às' HH:mm");
  MailApp.sendEmail(email, "Recibo — Pedido de Trancamento Parcial de Matrícula",
    montarRecibo_(dados, quando, periodo), { name: "Serviço de Graduação — IPUSP", noReply: true });
}

/*=====================================================
  GRAVAÇÃO DO PEDIDO
=====================================================*/

function registrarSolicitacao(dados) {

  const email = exigirUsuarioAutenticado_();
  dados = dados || {};

  // Período conferido de novo no envio: a página pode ter ficado aberta.
  const periodo = verificarPeriodo_();
  if (!periodo.aberto) throw new Error(periodo.motivo || "O formulário não está disponível no momento.");

  if (dados.ciencia !== true) {
    throw new Error('É preciso marcar "Ciente" na declaração de ciência para enviar o pedido.');
  }

  const nome = sanitizarTextoPlano_(dados.nome, 200);
  if (!nome) throw new Error("O nome não pode ficar vazio.");

  const nUsp = normalizarNUsp_(dados.nUsp);
  const creditos = validarCreditos_(dados.creditos);
  const menos12 = validarSimNao_(dados.menos12, "se ficará com menos de 12 créditos-aula após o trancamento");
  const concluiCurso = validarSimNao_(dados.concluiCurso, "se concluirá o curso neste semestre");

  let catalogo = null;
  try {
    catalogo = obterCatalogo_();
  } catch (err) {
    Logger.log(`Falha ao ler o cadastro de disciplinas no envio: ${mensagemDe_(err)}`);
  }
  const disciplinas = validarDisciplinas_(dados.disciplinas, catalogo);

  const justificativaBruta = String(dados.justificativa || "").trim();
  if (justificativaBruta.length > TAMANHO_MAXIMO_JUSTIFICATIVA) {
    throw new Error(`A justificativa passou de ${TAMANHO_MAXIMO_JUSTIFICATIVA} caracteres. Resuma o texto e envie de novo.`);
  }
  const justificativa = sanitizarTextoPlano_(justificativaBruta, TAMANHO_MAXIMO_JUSTIFICATIVA + 1);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error("Muitos pedidos sendo gravados ao mesmo tempo. Aguarde alguns segundos e clique em Enviar de novo.");
  }

  try {

    let aba;
    try {
      aba = abrirAbaPorChave_(CHAVE_RESPOSTAS);
    } catch (err) {
      throw erroParaAluno_("Falha ao abrir a planilha de respostas", err);
    }

    const { titulos, mapa } = mapearCabecalhosRespostas_(aba);

    const coluna = (titulo) => {
      const c = mapa[titulo];
      if (!c) {
        Logger.log(`Coluna ausente na planilha de respostas: "${titulo}"`);
        throw new Error(`Não encontrei a coluna "${titulo}" na planilha de respostas. ` +
          `Avise o Serviço de Graduação — o formulário ficará bloqueado até isso ser corrigido.`);
      }
      return c;
    };

    const colDisc = [];
    for (let i = 1; i <= MAX_DISCIPLINAS; i++) colDisc.push(coluna(PREFIXO_TITULO_DISCIPLINA + i));
    const colCiencia = colunaCiencia_(titulos);

    const valores = new Array(Math.max(titulos.length, colCiencia)).fill("");
    valores[coluna(CABECALHOS_RESPOSTAS.situacao) - 1] = "pendente";
    valores[coluna(CABECALHOS_RESPOSTAS.carimbo) - 1] = new Date();
    valores[coluna(CABECALHOS_RESPOSTAS.email) - 1] = email;
    valores[colCiencia - 1] = VALOR_CIENCIA;
    valores[coluna(CABECALHOS_RESPOSTAS.nUsp) - 1] = nUsp;
    valores[coluna(CABECALHOS_RESPOSTAS.nome) - 1] = nome;
    valores[coluna(CABECALHOS_RESPOSTAS.creditos) - 1] = creditos;
    valores[coluna(CABECALHOS_RESPOSTAS.menos12) - 1] = menos12;
    valores[coluna(CABECALHOS_RESPOSTAS.concluiCurso) - 1] = concluiCurso;
    disciplinas.forEach((d, i) => { valores[colDisc[i] - 1] = textoDisciplina_(d); });
    valores[coluna(CABECALHOS_RESPOSTAS.justificativa) - 1] = justificativa;
    // Observações e as colunas do Gerenciador (Detalhe das Disciplinas,
    // Data de Conclusão, Registro ID, Versão, E-mail Enviado) ficam em branco.

    aba.appendRow(valores);

  } finally {
    lock.releaseLock();
  }

  // Recibo fora da trava. Se falhar, o pedido continua gravado.
  let reciboEnviado = false;
  try {
    enviarRecibo_(email, { nome, nUsp, creditos, menos12, concluiCurso, disciplinas, justificativa }, periodo);
    reciboEnviado = true;
  } catch (err) {
    Logger.log(`Falha ao enviar recibo de trancamento parcial: ${mensagemDe_(err)}`);
  }

  return {
    sucesso: true,
    reciboEnviado: reciboEnviado,
    disciplinas: disciplinas.map(d => `${d.codigo} - ${d.nome}`)
  };

}

/*=====================================================
  DIAGNÓSTICO (v1.1.1) — rodar no editor: selecione
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
      return `tipo ${mostra(linha[2])}; 1º sem. ${mostra(linha[3])} ${mostra(linha[4])} a ${mostra(linha[5])} ${mostra(linha[6])}; ` +
        `2º sem. ${mostra(linha[7])} ${mostra(linha[8])} a ${mostra(linha[9])} ${mostra(linha[10])}`;
    });

    passo("Período agora", () => {
      const p = verificarPeriodo_();
      return p.aberto ? `ABERTO (${p.semestre || "contínuo"}º semestre, até ${p.diaFimTexto} ${p.horaFimTexto})` : `FECHADO — ${p.motivo}`;
    });

    passo("Títulos da planilha de respostas", () => {
      const { titulos, mapa } = mapearCabecalhosRespostas_(abrirAbaPorChave_(CHAVE_RESPOSTAS));
      const esperados = Object.keys(CABECALHOS_RESPOSTAS).map(k => CABECALHOS_RESPOSTAS[k]);
      for (let i = 1; i <= MAX_DISCIPLINAS; i++) esperados.push(PREFIXO_TITULO_DISCIPLINA + i);
      const faltando = esperados.filter(t => !mapa[t]);
      if (faltando.length) throw new Error(`faltam: ${faltando.join(" | ")}`);
      return `ciência na coluna ${colunaCiencia_(titulos)}`;
    });

    passo("Cadastro de disciplinas", () => `${montarCatalogo_().disciplinas.length} disciplinas`);
  }

  Logger.log("Diagnóstico do Trancamento Parcial:\n" + linhas.join("\n"));
  return linhas.join("\n");

}
