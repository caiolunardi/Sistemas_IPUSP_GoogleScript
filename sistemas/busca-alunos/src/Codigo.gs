/*=====================================================
  BUSCA DE ALUNOS — Serviço de Graduação (IPUSP)
  Backend Apps Script

  Ferramenta enxuta pra localizar um aluno rapidamente por nome
  (parcial, em qualquer ordem), número USP ou e-mail. Criada
  pra apoiar a triagem dos grupos de atendimento clínico, que
  chegam da Psicologia Clínica com nomes incompletos e sem
  número USP.

  A planilha de alunos NUNCA é referenciada por ID fixo aqui —
  o ID de verdade é resolvido em tempo de execução a partir da
  planilha ID_INDEX (ver obterIdProducao_), seguindo o mesmo
  padrão adotado pros outros sistemas: se um dia a planilha de
  alunos mudar de lugar, só se atualiza a linha correspondente
  no ID_INDEX — nenhum código muda.

  Toda a filtragem acontece no NAVEGADOR (ver BuscaAlunosApp.html):
  o servidor só devolve a lista completa uma vez, quando a
  página abre. Não tem chamada ao servidor a cada tecla digitada.

  GRADIP UI v1.0 (tema Claro/Escuro/Sistema + Central de Ajuda):
  em relação ao código original, só mudaram neste arquivo:
    1) o ID da planilha ID_INDEX saiu do código e passou a ser
       lido de Script Properties["ID_INDEX_SPREADSHEET_ID"]
       (regra de segurança do repositório central — IDs reais de
       planilha não ficam no Git). Ver obterIdIndice_.
    2) doGet passou de createHtmlOutputFromFile para
       createTemplateFromFile(...).evaluate(), e foi criado o
       helper include_ — necessários pra página incluir os
       arquivos compartilhados do tema (GradipTema,
       GradipTemaControle, marcas) e da Central de Ajuda.
  A leitura da planilha de alunos (listarAlunosParaBusca), os
  cabeçalhos esperados e o contrato com o frontend continuam
  exatamente os mesmos.

  ARQUIVOS DO PROJETO (todos na raiz do Apps Script, nomes sem
  extensão no include_):
    Codigo.gs                  — este arquivo
    BuscaAlunosApp.html        — página principal (busca)
    GradipTema.html            — tokens + Sistema/Claro/Escuro
    GradipTemaControle.html    — seletor "Aparência"
    GradipMarcaIPUSP.html      — marca IPUSP (azul/branca)
    GradipMarcaUSP.html        — marca USP (PNG azul/SVG branco)
    BuscaAlunosAjuda.html      — conteúdo da Central de Ajuda
    BuscaAlunosAjudaEstilos.html — estilos da Central
    BuscaAlunosAjudaUI.html    — comportamento da Central
=====================================================*/

// O ID da planilha mestre ID_INDEX fica em Script Properties, fora
// do Git (Configurações do projeto → Propriedades do script). O
// valor nunca é registrado em log nem enviado ao navegador.
const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";

const CHAVE_PLANILHA_ALUNOS = "PLANILHA_ALUNOS";

// Nomes EXATOS dos cabeçalhos na planilha de alunos (aba única).
// Lidos por nome, não por posição de coluna — se alguém inserir ou
// reordenar uma coluna lá, isso aqui não quebra.
const CABECALHOS_ALUNOS = {
  numeroUsp: "Número USP",
  nome: "Nome do Aluno",
  email: "Tr eMail",
  emailSecundario: "eMail Secundario"
};

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

// Template (e não HtmlOutput direto) porque BuscaAlunosApp.html usa
// scriptlets <?!= include_('...') ?> pra trazer o tema e a ajuda.
// Nenhum dado de aluno passa por aqui: a lista continua chegando só
// pela chamada google.script.run.listarAlunosParaBusca().
function doGet() {
  return HtmlService.createTemplateFromFile("BuscaAlunosApp")
      .evaluate()
      .setTitle("Busca de Alunos — Serviço de Graduação")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Mesmo helper dos outros sistemas do repositório (Painel de
// Solicitações, Estrutura Curricular): devolve o conteúdo bruto de
// um arquivo HTML do projeto pra ser incluído no template.
function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*-----------------------------------------------------
  ÍNDICE DE PLANILHAS — resolve o ID de produção de
  qualquer "chave" cadastrada na planilha ID_INDEX. Genérica de
  propósito: qualquer sistema novo pode reaproveitar essa mesma
  função (só muda a chave procurada), sem duplicar IDs de
  planilha espalhados pelo código de cada um.
------------------------------------------------------*/

// Lê o ID da própria planilha ID_INDEX das Propriedades do script.
// Antes, esse ID era uma constante literal no código; foi movido
// pra cá pra não ficar versionado no Git. A mensagem de erro cita só
// o NOME da propriedade, nunca um valor.
function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error(`Configuração obrigatória ausente: ${PROPRIEDADE_ID_INDICE}.`);
  return String(id).trim();
}

function obterIdProducao_(chave) {

  const planilha = SpreadsheetApp.openById(obterIdIndice_());
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) {
    throw new Error("A planilha ID_INDEX não tem nenhuma linha de dados.");
  }

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const cabecalho = valores[0];

  const colChave = cabecalho.indexOf("Chave");
  const colId = cabecalho.indexOf("ID de Produção");
  if (colChave === -1 || colId === -1) {
    throw new Error('A planilha ID_INDEX precisa ter as colunas "Chave" e "ID de Produção".');
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colChave]).trim() === chave) {
      const id = String(valores[i][colId] || "").trim();
      if (!id) {
        throw new Error(`A chave "${chave}" está cadastrada no ID_INDEX, mas a coluna "ID de Produção" está vazia.`);
      }
      return id;
    }
  }

  throw new Error(`Não encontrei a chave "${chave}" na planilha ID_INDEX.`);

}

/*-----------------------------------------------------
  LEITURA DA PLANILHA DE ALUNOS — devolve a lista inteira já
  pronta pra busca no cliente. Só os campos usados na busca e
  no resultado (número USP, nome, e-mail e e-mail secundário) —
  nada de expor colunas internas (ex.: ID da Pasta) que não têm
  uso aqui.
------------------------------------------------------*/
function listarAlunosParaBusca() {

  const idPlanilha = obterIdProducao_(CHAVE_PLANILHA_ALUNOS);
  const planilha = SpreadsheetApp.openById(idPlanilha);
  const aba = planilha.getSheets()[0]; // planilha de alunos tem uma aba única

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const cabecalho = valores[0];

  const mapa = {};
  Object.keys(CABECALHOS_ALUNOS).forEach(chave => {
    const nomeColuna = CABECALHOS_ALUNOS[chave];
    const indice = cabecalho.indexOf(nomeColuna);
    if (indice === -1) {
      throw new Error(`A planilha de alunos precisa ter uma coluna "${nomeColuna}".`);
    }
    mapa[chave] = indice;
  });

  const alunos = [];
  for (let i = 1; i < valores.length; i++) {

    const linha = valores[i];
    const numeroUsp = String(linha[mapa.numeroUsp] || "").trim();
    const nome = String(linha[mapa.nome] || "").trim();

    if (!numeroUsp && !nome) continue; // linha em branco

    alunos.push({
      numeroUsp: numeroUsp,
      nome: nome,
      email: String(linha[mapa.email] || "").trim(),
      emailSecundario: String(linha[mapa.emailSecundario] || "").trim()
    });

  }

  return alunos;

}

/*=====================================================
  DIAGNÓSTICO — rode esta função manualmente pelo editor
  do Apps Script (▶ Executar, com "diagnosticarBuscaAlunos"
  selecionado no menu de funções) depois de instalar ou
  mudar a configuração. Depois veja o resultado em
  Ver > Registros de execução.

  Registra SÓ informação de configuração (se a propriedade
  existe, nome da aba do índice, se a chave foi resolvida,
  cabeçalhos encontrados e QUANTOS alunos foram lidos) —
  nunca IDs, nomes, números USP ou e-mails.
=====================================================*/
function diagnosticarBuscaAlunos() {

  const temPropriedade = !!PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  Logger.log(`Propriedade ${PROPRIEDADE_ID_INDICE}: ${temPropriedade ? "configurada" : "AUSENTE — cadastre em Configurações do projeto → Propriedades do script"}`);
  if (!temPropriedade) return;

  const indice = SpreadsheetApp.openById(obterIdIndice_());
  const abaIndice = indice.getSheetByName(ABA_INDICE) || indice.getSheets()[0];
  Logger.log(`Aba lida no ID_INDEX: "${abaIndice.getName()}"${abaIndice.getName() === ABA_INDICE ? "" : ` (não existe "${ABA_INDICE}"; usada a primeira aba)`}`);

  obterIdProducao_(CHAVE_PLANILHA_ALUNOS);
  Logger.log(`Chave ${CHAVE_PLANILHA_ALUNOS}: encontrada no ID_INDEX`);

  const abaAlunos = SpreadsheetApp.openById(obterIdProducao_(CHAVE_PLANILHA_ALUNOS)).getSheets()[0];
  const cabecalho = abaAlunos.getLastColumn() > 0
    ? abaAlunos.getRange(1, 1, 1, abaAlunos.getLastColumn()).getValues()[0]
    : [];
  Object.keys(CABECALHOS_ALUNOS).forEach(chave => {
    const nomeColuna = CABECALHOS_ALUNOS[chave];
    Logger.log(`Coluna "${nomeColuna}": ${cabecalho.indexOf(nomeColuna) === -1 ? "NÃO ENCONTRADA" : "ok"}`);
  });

  Logger.log(`Alunos que seriam enviados à busca: ${listarAlunosParaBusca().length}`);

}
