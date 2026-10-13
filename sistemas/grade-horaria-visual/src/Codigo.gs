/*=====================================================
  GRADE HORÁRIA VISUAL — Serviço de Graduação (IPUSP)
  Backend Apps Script (v2.0)

  Página pública da grade horária dos alunos do IP. O projeto continua
  vinculado à planilha ORIGINAL da grade (a do link que todos já têm),
  mas deixou de ler as abas dela: lê a planilha que as secretarias
  preenchem e as cópias de semestres anteriores, todas localizadas pelo
  índice mestre ID_INDEX.

    ID_INDEX (Script Properties["ID_INDEX_SPREADSHEET_ID"])
      ├─ GRADE_HORARIA_PREENCHIMENTO            → grade atual (padrão)
      └─ INDEX_GRADE_HORARIA_VERSOES_ANTERIORES → índice das cópias:
           Semestre (AAAA/S) · ID da cópia · (Auditoria_ID, não usado)

  Nenhum ID de planilha fica no código nem vai ao navegador: a página
  pede uma grade pelo semestre ("2026/1") e o servidor procura o ID no
  índice. Validação, preenchimento, cópia de segurança e auditoria NÃO
  ficam aqui (sistema Estrutura Curricular e Validacoes.gs da planilha
  das secretarias).

  Planilha lida (abas PSA, PSC, PSE, PST, Interdepartamentais e Outras
  Unidades; títulos na linha 3, dados da linha 4 em diante):
    C Código · D Nome · E Tipo · F Modalidade · G Será oferecida ·
    H Docente(s) · I Semestre Ideal · J Créditos Aula · K Dia da semana ·
    L Horário de Início · M Horário de Fim · "Sala" (procurada pelo
    título na linha 3; nem toda aba tem).

  Entra na grade a linha com: Será oferecida = SIM, modalidade diferente
  de Prática, semestre ideal de 1 a 10 (sem semestre ideal = disciplina
  do IP para outros cursos, que não entra), dia de segunda a sexta e
  início/fim em HH:mm com fim depois do início.

  ARQUIVOS DO PROJETO (raiz do Apps Script, nomes sem extensão):
    Codigo.gs              — este arquivo
    GradeGrid.html         — página da grade
    GradipTema.html, GradipTemaControle.html,
    GradipMarcaIPUSP.html, GradipMarcaUSP.html — tema e marcas
    GradeAjuda.html, GradeAjudaEstilos.html, GradeAjudaUI.html — ajuda
=====================================================*/

// O ID do ID_INDEX fica em Configurações do projeto → Propriedades do
// script. Nunca é registrado em log nem enviado ao navegador.
const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";

const CHAVE_GRADE_ATUAL = "GRADE_HORARIA_PREENCHIMENTO";
const CHAVE_INDICE_ANTERIORES = "INDEX_GRADE_HORARIA_VERSOES_ANTERIORES";

const ABAS_GRADE = ["PSA", "PSC", "PSE", "PST", "Interdepartamentais", "Outras Unidades"];
const LINHA_TITULOS = 3;
const LINHA_INICIAL = 4;
// Colunas fixas (1 = A), as mesmas que o envio da grade grava e confere.
const COL = { codigo: 3, nome: 4, tipo: 5, modalidade: 6, oferecida: 7, docentes: 8,
  semestre: 9, creditos: 10, dia: 11, inicio: 12, fim: 13 };

const DIAS_SEMANA = ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira"];

// Cache (segundos): a grade atual muda enquanto as secretarias preenchem;
// as cópias anteriores não mudam.
const CACHE_GRADE_ATUAL = 120;
const CACHE_GRADE_ANTERIOR = 21600;
const CACHE_LISTA_ANTERIORES = 600;
const VERSAO_CACHE = "v2";

/*=====================================================
  PÁGINA
=====================================================*/

function doGet() {
  return HtmlService.createTemplateFromFile("GradeGrid")
    .evaluate()
    .setTitle("Grade Horária — Serviço de Graduação")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Inclui outro arquivo HTML do projeto no template (tema, marcas, ajuda). */
function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  FUNÇÕES CHAMADAS PELA PÁGINA (google.script.run)
=====================================================*/

/**
 * Lista das grades para o cabeçalho.
 * → { atual: {semestre, rotulo}, anteriores: [{semestre, rotulo}], avisoAnteriores }
 * semestre = "AAAA/S" (ou null se o nome da planilha atual não disser).
 * Anteriores: mais recentes primeiro, sem repetir o semestre atual.
 */
function obterConfiguracaoGrade() {
  const atual = semestreDaGradeAtual_();
  let anteriores = [];
  let avisoAnteriores = "";
  try {
    anteriores = Object.keys(lerIndiceAnteriores_())
      .filter(s => s !== atual)
      .sort(compararSemestresDesc_)
      .map(s => ({ semestre: s, rotulo: rotuloSemestre_(s) }));
  } catch (erro) {
    registrarErro_("obterConfiguracaoGrade/anteriores", erro);
    avisoAnteriores = "Não foi possível carregar a lista de grades anteriores agora.";
  }
  return {
    atual: { semestre: atual, rotulo: atual ? rotuloSemestre_(atual) : "" },
    anteriores: anteriores,
    avisoAnteriores: avisoAnteriores
  };
}

/**
 * Grade completa de um semestre, já filtrada para exibição.
 * semestre vazio/null = grade atual; "AAAA/S" = cópia registrada no índice.
 * → { semestre, rotulo, atual, semestresIdeais: [1,3,...], disciplinas: [...], lidaEm }
 */
function obterGrade(semestre) {
  const pedido = String(semestre || "").trim();
  const ehAtual = pedido === "" || pedido === "atual";
  if (!ehAtual && !/^\d{4}\/[12]$/.test(pedido)) {
    throw new Error("Semestre inválido. Escolha uma grade da lista.");
  }

  const chaveCache = "grade:" + VERSAO_CACHE + ":" + (ehAtual ? "atual" : pedido);
  const emCache = lerCache_(chaveCache);
  if (emCache) return emCache;

  let planilha;
  let semestreGrade;
  if (ehAtual) {
    planilha = abrirPlanilha_(obterIdProducao_(CHAVE_GRADE_ATUAL), "a grade atual");
    semestreGrade = semestreDoNome_(planilha.getName());
  } else {
    const id = lerIndiceAnteriores_()[pedido];
    if (!id) throw new Error("Não encontrei a grade de " + rotuloSemestre_(pedido) + " entre as grades anteriores.");
    planilha = abrirPlanilha_(id, "a grade de " + rotuloSemestre_(pedido));
    semestreGrade = pedido;
  }

  const disciplinas = lerDisciplinas_(planilha);
  const resultado = {
    semestre: semestreGrade,
    rotulo: semestreGrade ? rotuloSemestre_(semestreGrade) : "",
    atual: ehAtual,
    semestresIdeais: semestresIdeaisDaGrade_(semestreGrade, disciplinas),
    disciplinas: disciplinas,
    lidaEm: Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm")
  };

  gravarCache_(chaveCache, resultado, ehAtual ? CACHE_GRADE_ATUAL : CACHE_GRADE_ANTERIOR);
  return resultado;
}

/*=====================================================
  LEITURA DA PLANILHA DA GRADE
=====================================================*/

function lerDisciplinas_(planilha) {
  const disciplinas = [];
  ABAS_GRADE.forEach(nomeAba => {
    const aba = planilha.getSheetByName(nomeAba);
    if (!aba) return;
    const ultimaLinha = aba.getLastRow();
    const ultimaColuna = aba.getLastColumn();
    if (ultimaLinha < LINHA_INICIAL || ultimaColuna < COL.fim) return;

    const titulos = aba.getRange(LINHA_TITULOS, 1, 1, ultimaColuna).getDisplayValues()[0];
    const colSala = titulos.findIndex(t => normalizar_(t) === "sala") + 1; // 0 = aba sem Sala
    const largura = Math.max(COL.fim, colSala);
    const dados = aba.getRange(LINHA_INICIAL, 1, ultimaLinha - LINHA_INICIAL + 1, largura).getDisplayValues();

    dados.forEach(l => {
      const d = disciplinaDaLinha_(l, colSala, nomeAba);
      if (d) disciplinas.push(d);
    });
  });
  return disciplinas;
}

/** Uma linha da planilha → disciplina para a grade, ou null se não entra. */
function disciplinaDaLinha_(l, colSala, nomeAba) {
  const v = col => String(l[col - 1] == null ? "" : l[col - 1]).trim();

  const codigo = v(COL.codigo);
  if (!codigo) return null;
  if (normalizar_(v(COL.oferecida)) !== "sim") return null;
  if (normalizar_(v(COL.modalidade)) === "pratica") return null;

  const semestre = Number(v(COL.semestre).replace(",", "."));
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 10) return null;

  const dia = diaDaSemana_(v(COL.dia));
  const inicio = horario_(v(COL.inicio));
  const fim = horario_(v(COL.fim));
  if (!dia || !inicio || !fim || minutos_(fim) <= minutos_(inicio)) return null;

  return {
    codigo: codigo,
    nome: v(COL.nome),
    tipo: tipoCanonico_(v(COL.tipo)),
    docentes: v(COL.docentes),
    semestre: semestre,
    creditos: v(COL.creditos),
    dia: dia,
    inicio: inicio,
    fim: fim,
    sala: colSala ? v(colSala) : "",
    aba: nomeAba
  };
}

/**
 * Botões de semestre ideal: os da paridade do semestre da grade (1º do
 * ano → 1,3,5,7,9; 2º → 2,4,6,8,10) + qualquer outro que tenha aula
 * nesta grade. Sem semestre identificável: só os que têm aula.
 */
function semestresIdeaisDaGrade_(semestreGrade, disciplinas) {
  const conjunto = {};
  const m = String(semestreGrade || "").match(/\/([12])$/);
  if (m) {
    for (let s = Number(m[1]); s <= 10; s += 2) conjunto[s] = true;
  }
  disciplinas.forEach(d => { conjunto[d.semestre] = true; });
  return Object.keys(conjunto).map(Number).sort((a, b) => a - b);
}

/*=====================================================
  ÍNDICES
=====================================================*/

function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error("A grade horária ainda não foi configurada (falta a propriedade " + PROPRIEDADE_ID_INDICE + ").");
  return String(id).trim();
}

/** ID de Produção de uma chave do ID_INDEX (colunas achadas pelo título). */
function obterIdProducao_(chave) {
  const planilha = abrirPlanilha_(obterIdIndice_(), "o índice de planilhas");
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];
  const valores = aba.getDataRange().getDisplayValues();
  if (valores.length < 2) throw new Error("O índice de planilhas está vazio.");

  const titulos = valores[0].map(t => String(t).trim());
  const colChave = titulos.indexOf("Chave");
  const colId = titulos.indexOf("ID de Produção");
  if (colChave === -1 || colId === -1) {
    throw new Error('O índice de planilhas precisa ter as colunas "Chave" e "ID de Produção".');
  }
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colChave]).trim() === chave) {
      const id = String(valores[i][colId] || "").trim();
      if (!id) throw new Error('A chave "' + chave + '" está no índice de planilhas, mas sem ID de Produção.');
      return id;
    }
  }
  throw new Error('Não encontrei a chave "' + chave + '" no índice de planilhas.');
}

/**
 * Índice das grades anteriores → { "AAAA/S": id }. Coluna "Semestre" e
 * "ID" achadas pelo título (senão A e B). Linhas sem ID ou com semestre
 * fora do formato são ignoradas; semestre repetido: vale a última linha.
 */
function lerIndiceAnteriores_() {
  const chaveCache = "anteriores:" + VERSAO_CACHE;
  const emCache = lerCache_(chaveCache);
  if (emCache) return emCache;

  const planilha = abrirPlanilha_(obterIdProducao_(CHAVE_INDICE_ANTERIORES), "o índice das grades anteriores");
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];
  const valores = aba.getDataRange().getDisplayValues();
  const mapa = {};
  if (valores.length >= 2) {
    const titulos = valores[0].map(t => normalizar_(t));
    let colSemestre = titulos.indexOf("semestre");
    let colId = titulos.indexOf("id");
    if (colSemestre === -1) colSemestre = 0;
    if (colId === -1) colId = 1;
    for (let i = 1; i < valores.length; i++) {
      const semestre = String(valores[i][colSemestre] || "").trim().replace(/\s+/g, "");
      const id = String(valores[i][colId] || "").trim();
      if (/^\d{4}\/[12]$/.test(semestre) && id) mapa[semestre] = id;
    }
  }
  gravarCache_(chaveCache, mapa, CACHE_LISTA_ANTERIORES);
  return mapa;
}

/** Semestre da grade atual pelo nome do arquivo ("… 1º Semestre de 2027" → "2027/1"). */
function semestreDaGradeAtual_() {
  const chaveCache = "semestreAtual:" + VERSAO_CACHE;
  const emCache = lerCache_(chaveCache);
  if (emCache) return emCache.semestre;
  const planilha = abrirPlanilha_(obterIdProducao_(CHAVE_GRADE_ATUAL), "a grade atual");
  const semestre = semestreDoNome_(planilha.getName());
  gravarCache_(chaveCache, { semestre: semestre }, CACHE_GRADE_ATUAL);
  return semestre;
}

/*=====================================================
  APOIO
=====================================================*/

function abrirPlanilha_(id, descricao) {
  try {
    return SpreadsheetApp.openById(id);
  } catch (erro) {
    registrarErro_("abrirPlanilha_", erro);
    throw new Error("Não foi possível abrir " + descricao + ". Tente de novo em instantes; se continuar, avise o Serviço de Graduação.");
  }
}

/** "Grade Horária - 1º Semestre de 2027" → "2027/1"; null se o nome não diz. */
function semestreDoNome_(nome) {
  const m = String(nome || "").match(/([12])\s*[º°o]?\s*semestre\s+de\s+(\d{4})/i);
  return m ? m[2] + "/" + m[1] : null;
}

/** "2026/1" → "2026 - 1º Semestre". */
function rotuloSemestre_(semestre) {
  const m = String(semestre || "").match(/^(\d{4})\/([12])$/);
  return m ? m[1] + " - " + m[2] + "º Semestre" : String(semestre || "");
}

function compararSemestresDesc_(a, b) {
  const [aa, as] = a.split("/").map(Number);
  const [ba, bs] = b.split("/").map(Number);
  return (ba - aa) || (bs - as);
}

function normalizar_(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Obrigatória / Eletiva / Livre (aceita também os nomes antigos "Obrigatórias", "Optativas Eletivas"…). */
function tipoCanonico_(tipo) {
  const t = normalizar_(tipo);
  if (t.indexOf("obrigat") === 0) return "Obrigatória";
  if (t.indexOf("eletiva") !== -1) return "Eletiva";
  if (t.indexOf("livre") !== -1) return "Livre";
  return String(tipo || "").trim();
}

function diaDaSemana_(texto) {
  const t = normalizar_(texto).replace(/\s+/g, "").replace("-feira", "");
  return DIAS_SEMANA.find(d => normalizar_(d).replace("-feira", "") === t) || null;
}

/** "8:00", "08:00" ou "08:00:00" → "08:00"; null se não for horário. */
function horario_(texto) {
  const m = String(texto || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return String(h).padStart(2, "0") + ":" + m[2];
}

function minutos_(hhmm) {
  const p = hhmm.split(":");
  return Number(p[0]) * 60 + Number(p[1]);
}

function lerCache_(chave) {
  try {
    const texto = CacheService.getScriptCache().get(chave);
    return texto ? JSON.parse(texto) : null;
  } catch (erro) {
    return null;
  }
}

function gravarCache_(chave, valor, segundos) {
  try {
    CacheService.getScriptCache().put(chave, JSON.stringify(valor), segundos);
  } catch (erro) {
    // Valor grande demais para o cache: segue sem cache.
  }
}

/** Log sem IDs (sequências longas de letras e números são cortadas). */
function registrarErro_(onde, erro) {
  const texto = String(erro && erro.message || erro).replace(/[A-Za-z0-9_-]{25,}/g, "[…]");
  console.error(onde + ": " + texto);
}

/*=====================================================
  DIAGNÓSTICO (executar no editor)
=====================================================*/

/**
 * Confere a configuração e pede as autorizações do Google na primeira
 * execução. Mostra só nomes e contagens — nenhum ID.
 */
function diagnosticarGradeVisual() {
  Logger.log("Propriedade " + PROPRIEDADE_ID_INDICE + ": " +
    (PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE) ? "cadastrada" : "AUSENTE"));
  const atual = abrirPlanilha_(obterIdProducao_(CHAVE_GRADE_ATUAL), "a grade atual");
  Logger.log('Grade atual: "' + atual.getName() + '" → semestre ' + (semestreDoNome_(atual.getName()) || "não identificado pelo nome"));
  ABAS_GRADE.forEach(n => Logger.log("  aba " + n + ": " + (atual.getSheetByName(n) ? "ok" : "AUSENTE")));
  const disciplinas = lerDisciplinas_(atual);
  Logger.log("  disciplinas na grade visual: " + disciplinas.length);
  const anteriores = lerIndiceAnteriores_();
  Logger.log("Grades anteriores no índice: " + (Object.keys(anteriores).sort(compararSemestresDesc_).join(", ") || "nenhuma"));
  CacheService.getScriptCache().removeAll([
    "grade:" + VERSAO_CACHE + ":atual", "anteriores:" + VERSAO_CACHE, "semestreAtual:" + VERSAO_CACHE
  ]);
  Logger.log("Cache da grade atual e da lista de anteriores limpo.");
}
