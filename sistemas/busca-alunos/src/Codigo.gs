/*=====================================================
  COMUNIDADE IPUSP — Serviço de Graduação (IPUSP)
  (antiga "Busca de Alunos"; nomes de arquivos e funções da
  ficha/exportação mantidos para facilitar a atualização)
  Backend Apps Script

  Ferramenta enxuta pra localizar rapidamente uma pessoa do
  IPUSP — aluno, docente, servidor ou setor — por nome (parcial,
  em qualquer ordem), número USP, e-mail ou setor. Nasceu pra
  apoiar a triagem dos grupos de atendimento clínico, que chegam
  da Psicologia Clínica com nomes incompletos e sem número USP.

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
  cabeçalhos esperados e o contrato com o frontend continuaram
  exatamente os mesmos na v1.0.

  v1.1 (pedido do Serviço de Graduação, 13/10/2026):
    - coluna do e-mail principal corrigida para "eMail" e
      inclusão da coluna "Ingresso" (AAAA/S);
    - cada aluno da lista leva "linha" e "ingresso";
    - FICHA DO ALUNO: obterFichaAluno (todas as colunas de uma
      linha) e salvarFichaAluno (grava só o que mudou, com
      conferência de permissão, de linha e de conflito);
    - EXPORTAÇÃO: gerarPdfListaAlunos (o CSV é feito no navegador).

  v1.2 — COMUNIDADE IPUSP (pedido do Serviço de Graduação,
  14/10/2026): a mesma caixa de busca passa a procurar também nos
  cadastros de SERVIDORES e de DOCENTES (chaves SERVIDORES e
  PLANILHA_DOCENTES no ID_INDEX):
    - listarComunidadeParaBusca junta os três cadastros, cada
      pessoa com "tipo" = aluno | docente | servidor | setor;
      um cadastro que não abre não derruba os outros
      (vai em "indisponiveis");
    - "setor" = linha da planilha de servidores que é de um setor
      (conta institucional), não de uma pessoa — ver ehSetor_;
    - o PDF passa a ter as colunas Vínculo e Setor;
    - diagnóstico renomeado para diagnosticarComunidadeIPUSP.

  v1.3 (14/10/2026, novo esquema das planilhas de servidores e
  docentes):
    - servidores e docentes lidos pelo TÍTULO das colunas, como os
      alunos (CABECALHOS_SERVIDORES, CABECALHOS_DOCENTES); servidor
      ou setor pela coluna TIPO (regra antiga só se TIPO vazio);
    - FICHA para os três cadastros: obterFicha / salvarFicha, com as
      mesmas regras dos alunos (obterFichaAluno e salvarFichaAluno
      continuam, só para alunos);
    - número USP de docentes e servidores na lista (setor não tem);
    - Prof./Profª. calculado pela coluna "M / F" (tratamentoDocente_);
      a coluna TRATAMENTO, com fórmula, não é mais lida nem exibida.

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

// v1.2: cadastros de servidores (e setores) e de docentes, também
// resolvidos pelo ID_INDEX. Primeira aba, títulos na linha 1, dados
// da linha 2 em diante.
const CHAVE_PLANILHA_SERVIDORES = "SERVIDORES";
const CHAVE_PLANILHA_DOCENTES = "PLANILHA_DOCENTES";

// Nomes dos cabeçalhos na planilha de alunos (aba única).
// Lidos por nome, não por posição de coluna — se alguém inserir ou
// reordenar uma coluna lá, isso aqui não quebra.
//
// v1.1: o e-mail principal se chama só "eMail" (o "Tт" que aparece
// antes dele na planilha é o ícone de coluna do tipo texto da
// tabela do Sheets, não faz parte do nome). Foi incluída a coluna
// "Ingresso" (AAAA/S, ex.: 2024/1), usada no filtro por ano.
const CABECALHOS_ALUNOS = {
  numeroUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

// v1.3: servidores e docentes passam a ser lidos pelo TÍTULO, como os
// alunos (esquema informado pelo Serviço de Graduação em 14/10/2026):
//   SERVIDORES         A E-MAIL · B NOME · C Setor · D N.USP · E TIPO
//                      (SERVIDOR ou SETOR) · F ID da Pasta · G eMail Secundario
//   PLANILHA_DOCENTES  A N. USP · B NOME · C M / F · D E-mail ·
//                      E TRATAMENTO (fórmula antiga, ignorada) ·
//                      F ID da Pasta · G eMail Secundario
// Títulos comparados sem acento, espaço nem maiúscula ("N. USP" =
// "N.USP"). NOME e e-mail são obrigatórios; as demais colunas, se
// faltarem, ficam vazias.
const CABECALHOS_SERVIDORES = {
  email: "E-MAIL",
  nome: "NOME",
  setor: "Setor",
  numeroUsp: "N.USP",
  tipo: "TIPO",
  emailSecundario: "eMail Secundario"
};
const CABECALHOS_DOCENTES = {
  numeroUsp: "N. USP",
  nome: "NOME",
  genero: "M / F",
  email: "E-mail",
  emailSecundario: "eMail Secundario"
};

// v1.3: os três cadastros que a busca e a ficha conhecem. "cadastro"
// é o nome usado entre a página e o servidor (alunos, docentes,
// servidores). "identidade" = campos conferidos pra ter certeza de que
// a linha ainda é da mesma pessoa antes de abrir/salvar a ficha.
// "ocultas" = colunas que nem aparecem na ficha.
const CADASTROS = {
  alunos: {
    chave: CHAVE_PLANILHA_ALUNOS, nome: "alunos", singular: "aluno", cabecalhos: CABECALHOS_ALUNOS,
    obrigatorios: Object.keys(CABECALHOS_ALUNOS), identidade: ["numeroUsp", "nome"], ocultas: []
  },
  docentes: {
    chave: CHAVE_PLANILHA_DOCENTES, nome: "docentes", singular: "docente", cabecalhos: CABECALHOS_DOCENTES,
    obrigatorios: ["nome", "email"], identidade: ["nome", "email"],
    // O tratamento (Prof./Profª.) passa a ser feito pelo sistema a
    // partir de "M / F" (ver tratamentoDocente_); a coluna antiga, com
    // fórmula, deixa de ser usada e pode ser apagada da planilha.
    ocultas: ["TRATAMENTO"]
  },
  servidores: {
    chave: CHAVE_PLANILHA_SERVIDORES, nome: "servidores", singular: "servidor ou setor", cabecalhos: CABECALHOS_SERVIDORES,
    obrigatorios: ["nome", "email"], identidade: ["nome", "email"], ocultas: []
  }
};

// Planilhas antigas de servidores sem a coluna TIPO (ou com TIPO
// vazio): a linha é tratada como SETOR quando NOME está vazio, é igual
// ao Setor (sem diferença de acento/caixa) ou começa com uma das
// palavras abaixo (ver ehSetor_). Com TIPO preenchido, vale o TIPO.
const INICIOS_NOME_SETOR = [
  "Setor", "Serviço", "Seção", "Secretaria", "Assistência", "Comissão",
  "Departamento", "Diretoria", "Biblioteca", "Laboratório", "Coordenação", "Atendimento"
];

// Colunas exibidas na ficha, mas que NÃO podem ser alteradas por este
// app (ex.: ID da Pasta é usado por outro sistema pra achar a pasta no
// Drive — um erro de digitação aqui quebraria esse vínculo). Vale para
// os três cadastros. Células com fórmula também ficam bloqueadas.
const COLUNAS_SOMENTE_LEITURA = ["ID da Pasta"];

// Limites de tamanho dos valores aceitos ao salvar e da exportação.
const TAMANHO_MAXIMO_CAMPO = 500;
const MAXIMO_LINHAS_EXPORTACAO = 5000;

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

// Template (e não HtmlOutput direto) porque BuscaAlunosApp.html usa
// scriptlets <?!= include_('...') ?> pra trazer o tema e a ajuda.
// Nenhum dado pessoal passa por aqui: a lista continua chegando só
// pela chamada google.script.run.listarComunidadeParaBusca().
function doGet() {
  return HtmlService.createTemplateFromFile("BuscaAlunosApp")
      .evaluate()
      .setTitle("Comunidade IPUSP — Serviço de Graduação")
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
  LEITURA DOS CADASTROS — devolve a lista inteira já pronta pra
  busca no cliente. Só os campos usados na busca, no filtro e no
  card — nada de colunas internas (ex.: ID da Pasta) nem do gênero
  dos docentes. A ficha completa de UMA pessoa só é lida quando ela
  é aberta (ver obterFicha).

  v1.1: cada aluno passa a levar também "linha" (número da linha
  na planilha, usado pra abrir/salvar a ficha) e "ingresso".
  v1.3: a mesma leitura serve aos três cadastros (lerCadastro_).
------------------------------------------------------*/

// Lista só de alunos, no formato da v1.1 (sem "tipo"). Usada por
// listarComunidadeParaBusca e mantida pública por compatibilidade.
function listarAlunosParaBusca() {
  return lerCadastro_("alunos").map(item => {
    const semTipo = Object.assign({}, item);
    delete semTipo.tipo;
    return semTipo;
  });
}

/*-----------------------------------------------------
  v1.2 — COMUNIDADE: os três cadastros numa lista só, pra mesma
  busca no navegador. Cada pessoa leva "tipo":
    aluno    — planilha de alunos
    docente  — planilha de docentes
    servidor — planilha de servidores, TIPO = SERVIDOR
    setor    — planilha de servidores, TIPO = SETOR
  (campos de cada um em itemDaLinha_).

  Cada cadastro é lido separadamente: se um não abrir (chave
  ausente no ID_INDEX, sem permissão, coluna obrigatória
  faltando...), os outros aparecem e o motivo vai em
  "indisponiveis" (sem IDs nem e-mails). Se NENHUM abrir, o erro do
  primeiro (alunos) sobe como antes — é o caso típico de
  configuração (propriedade ausente, ID_INDEX errado).
------------------------------------------------------*/
function listarComunidadeParaBusca() {

  const pessoas = [];
  const indisponiveis = [];
  let primeiroErro = null;

  Object.keys(CADASTROS).forEach(nome => {
    try {
      lerCadastro_(nome).forEach(p => pessoas.push(p));
    } catch (err) {
      if (!primeiroErro) primeiroErro = err;
      indisponiveis.push({ descricao: CADASTROS[nome].nome, motivo: mensagemSegura_(err) });
    }
  });

  if (indisponiveis.length === Object.keys(CADASTROS).length) throw primeiroErro;
  return { pessoas: pessoas, indisponiveis: indisponiveis };

}

// Lê a primeira aba de um cadastro inteiro. Linha em que todas as
// colunas conhecidas estão vazias é ignorada.
function lerCadastro_(nomeCadastro) {
  const cadastro = obterCadastro_(nomeCadastro);
  const aba = abrirCadastro_(cadastro);
  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const mapa = mapearColunas_(valores[0], nomeCadastro);
  const itens = [];
  for (let i = 1; i < valores.length; i++) {
    const vazia = Object.keys(mapa).every(campo => !valorCampo_(valores[i], mapa, campo));
    if (vazia) continue;
    itens.push(itemDaLinha_(nomeCadastro, mapa, valores[i], i + 1));
  }
  return itens;
}

// O que vai pro navegador de cada linha — e só isso.
function itemDaLinha_(nomeCadastro, mapa, linhaValores, numeroLinha) {
  const v = campo => valorCampo_(linhaValores, mapa, campo);
  if (nomeCadastro === "alunos") {
    return { tipo: "aluno", linha: numeroLinha, numeroUsp: v("numeroUsp"), nome: v("nome"),
      ingresso: v("ingresso"), email: v("email"), emailSecundario: v("emailSecundario") };
  }
  if (nomeCadastro === "docentes") {
    return { tipo: "docente", linha: numeroLinha, numeroUsp: v("numeroUsp"), nome: v("nome"),
      email: v("email"), emailSecundario: v("emailSecundario") };
  }
  const tipo = tipoServidor_(v("tipo"), v("nome"), v("setor"));
  return { tipo: tipo, linha: numeroLinha, numeroUsp: tipo === "setor" ? "" : v("numeroUsp"), nome: v("nome"),
    email: v("email"), emailSecundario: v("emailSecundario"), setor: v("setor") };
}

// Valor de um campo numa linha (texto, sem espaços nas pontas). Coluna
// opcional ausente (índice -1) = vazio.
function valorCampo_(linhaValores, mapa, campo) {
  const i = mapa[campo];
  if (i === undefined || i < 0) return "";
  const valor = linhaValores[i];
  return String(valor == null ? "" : valor).trim();
}

// TIPO da planilha de servidores: SETOR ou SERVIDOR. Vazio ou outro
// valor → regra antiga pelo nome (ehSetor_).
function tipoServidor_(tipo, nome, setor) {
  const t = comparavel_(tipo);
  if (t === "setor") return "setor";
  if (t === "servidor") return "servidor";
  return ehSetor_(nome, setor) ? "setor" : "servidor";
}

// Regra de "setor" sem a coluna TIPO — ver INICIOS_NOME_SETOR no topo.
function ehSetor_(nome, setor) {
  const n = comparavel_(nome);
  if (!n) return true;
  if (setor && n === comparavel_(setor)) return true;
  return INICIOS_NOME_SETOR.some(p => {
    const inicio = comparavel_(p);
    return n === inicio || n.indexOf(inicio + " ") === 0;
  });
}

// v1.3: Prof. / Profª. pela coluna "M / F" — substitui a fórmula da
// coluna TRATAMENTO da planilha de docentes.
function tratamentoDocente_(genero) {
  const g = comparavel_(genero);
  if (g === "f") return "Profª.";
  if (g === "m") return "Prof.";
  return "";
}

// Minúsculas, sem acento e com espaços simples — só para comparar.
function comparavel_(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

// Título de coluna comparável: sem acento, sem NENHUM espaço e sem
// maiúscula ("N. USP" = "N.USP"; "M / F" = "M/F").
function tituloComparavel_(titulo) {
  return comparavel_(titulo).replace(/ /g, "");
}

// Mensagem de erro sem IDs (sequências longas) nem e-mails, pra poder
// ir ao navegador e ao log de diagnóstico.
function mensagemSegura_(err) {
  return limitar_(String(err && err.message || err)
    .replace(/[A-Za-z0-9_-]{25,}/g, "[…]")
    .replace(/\S+@\S+/g, "[e-mail]"), 300);
}

function obterCadastro_(nomeCadastro) {
  if (!Object.prototype.hasOwnProperty.call(CADASTROS, nomeCadastro)) {
    throw new Error("Cadastro desconhecido. Recarregue a página e tente de novo.");
  }
  return CADASTROS[nomeCadastro];
}

// Abre a planilha do cadastro (via ID_INDEX) e devolve a primeira aba.
function abrirCadastro_(cadastro) {
  const planilha = SpreadsheetApp.openById(obterIdProducao_(cadastro.chave));
  return planilha.getSheets()[0];
}

// Mantida da v1.1.
function obterAbaAlunos_() {
  return abrirCadastro_(CADASTROS.alunos);
}

// Localiza cada coluna do cadastro pelo título (linha 1), sem
// diferença de acento, espaço ou maiúscula. Coluna obrigatória
// ausente → erro amigável; opcional ausente → -1.
function mapearColunas_(cabecalho, nomeCadastro) {
  const cadastro = obterCadastro_(nomeCadastro || "alunos");
  const titulos = cabecalho.map(tituloComparavel_);
  const mapa = {};
  Object.keys(cadastro.cabecalhos).forEach(campo => {
    const nomeColuna = cadastro.cabecalhos[campo];
    const indice = titulos.indexOf(tituloComparavel_(nomeColuna));
    if (indice === -1 && cadastro.obrigatorios.indexOf(campo) !== -1) {
      throw new Error(`A planilha de ${cadastro.nome} precisa ter uma coluna "${nomeColuna}".`);
    }
    mapa[campo] = indice;
  });
  return mapa;
}

/*-----------------------------------------------------
  FICHA — leitura completa de UMA linha de qualquer cadastro, pra
  montar o modal de edição. Devolve todas as colunas com título
  na linha 1, na ordem da planilha (menos as "ocultas" do
  cadastro), cada uma com:
    titulo   — texto da linha 1
    valor    — valor como aparece na planilha (getDisplayValues)
    editavel — false para COLUNAS_SOMENTE_LEITURA e células com
               fórmula
  Docentes levam também "tratamento" (Prof./Profª.).

  referencia = { cadastro: "alunos" | "docentes" | "servidores",
                 linha, + campos de identidade do cadastro }
  A linha é conferida pelos campos de "identidade" (alunos: número
  USP e nome; docentes e servidores: nome e e-mail) que o navegador
  recebeu na lista: se alguém ordenou, inseriu ou apagou linhas
  desde que a página abriu, a linha pode ser de outra pessoa — aí
  recusamos em vez de mostrar/editar o errado.
------------------------------------------------------*/
function obterFicha(referencia) {
  const ref = referencia || {};
  const cadastro = obterCadastro_(ref.cadastro);
  const aba = abrirCadastro_(cadastro);
  const linha = conferirLinha_(ref.cadastro, aba, ref);
  return montarFicha_(ref.cadastro, aba, linha);
}

// Mantida da v1.1 (só alunos).
function obterFichaAluno(referencia) {
  return obterFicha(Object.assign({}, referencia, { cadastro: "alunos" }));
}

function conferirLinha_(nomeCadastro, aba, referencia) {

  const cadastro = obterCadastro_(nomeCadastro);
  const ref = referencia || {};
  const linha = Number(ref.linha);
  if (!Number.isInteger(linha) || linha < 2 || linha > aba.getLastRow()) {
    throw new Error(`Não encontrei esse ${cadastro.singular} na planilha. Recarregue a página e tente de novo.`);
  }

  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const mapa = mapearColunas_(cabecalho, nomeCadastro);
  const atual = aba.getRange(linha, 1, 1, cabecalho.length).getValues()[0];

  const mudou = cadastro.identidade.some(campo =>
    valorCampo_(atual, mapa, campo) !== String(ref[campo] == null ? "" : ref[campo]).trim());
  if (mudou) {
    throw new Error(`A planilha de ${cadastro.nome} mudou desde que esta página foi aberta (linhas ordenadas, inseridas ou editadas). Recarregue a página e abra a ficha de novo.`);
  }

  return linha;

}

// Coluna oculta do cadastro (comparação sem acento/espaço/maiúscula).
function colunaOculta_(cadastro, titulo) {
  const t = tituloComparavel_(titulo);
  return cadastro.ocultas.some(o => tituloComparavel_(o) === t);
}

function montarFicha_(nomeCadastro, aba, linha) {

  const cadastro = obterCadastro_(nomeCadastro);
  const ultimaColuna = aba.getLastColumn();
  const cabecalho = aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0];
  const intervalo = aba.getRange(linha, 1, 1, ultimaColuna);
  const exibidos = intervalo.getDisplayValues()[0];
  const formulas = intervalo.getFormulas()[0];

  const campos = [];
  cabecalho.forEach((tituloBruto, i) => {
    const titulo = String(tituloBruto).trim();
    if (!titulo || colunaOculta_(cadastro, titulo)) return; // sem título ou oculta — ignorada
    campos.push({
      titulo: titulo,
      valor: exibidos[i],
      editavel: COLUNAS_SOMENTE_LEITURA.indexOf(titulo) === -1 && !formulas[i]
    });
  });

  const ficha = { cadastro: nomeCadastro, linha: linha, campos: campos, podeEditar: usuarioPodeEditar_(aba) };
  if (nomeCadastro === "docentes") {
    const mapa = mapearColunas_(cabecalho, nomeCadastro);
    ficha.tratamento = tratamentoDocente_(valorCampo_(exibidos, mapa, "genero"));
  }
  return ficha;

}

/*-----------------------------------------------------
  QUEM PODE SALVAR — só quem é EDITOR da planilha daquele
  cadastro (alunos, docentes ou servidores).

  O Web App pode estar implantado para executar como quem
  implantou; nesse caso o Sheets aceitaria a gravação de
  qualquer pessoa que abrisse a página. Por isso a permissão é
  conferida aqui, no servidor, a cada gravação: o e-mail de quem
  está usando (Session.getActiveUser) precisa estar entre os
  editores da planilha (dono incluído). Sem e-mail identificado
  (conta de outro domínio, por exemplo) → não pode salvar.
  Compartilhamento só via GRUPO não aparece em getEditors(): nesse
  caso, a pessoa precisa ser adicionada individualmente.
------------------------------------------------------*/
function usuarioPodeEditar_(aba) {
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email) return false;
  try {
    const planilha = aba.getParent();
    const editores = planilha.getEditors().map(u => String(u.getEmail() || "").trim().toLowerCase());
    const dono = planilha.getOwner(); // null em Drive compartilhado
    if (dono && dono.getEmail()) editores.push(String(dono.getEmail()).trim().toLowerCase());
    return editores.indexOf(email) !== -1;
  } catch (err) {
    // Sem permissão nem pra listar os editores (ex.: Web App executando
    // como o usuário e ele só tem leitura) = não é editor.
    return false;
  }
}

/*-----------------------------------------------------
  SALVAR FICHA — grava as alterações feitas no modal.

  pedido = {
    cadastro, linha + identidade — mesma referência de obterFicha
    originais: { "<título>": "<valor exibido quando a ficha abriu>" }
    novos:     { "<título>": "<valor digitado>" }
  }

  Regras (todas validadas aqui, nunca só no navegador):
    1. quem chama precisa ser editor da planilha do cadastro;
    2. a linha ainda precisa ser da mesma pessoa/setor;
    3. só colunas existentes, editáveis, não ocultas e sem fórmula;
    4. cada coluna alterada precisa estar IGUAL ao "original" no
       momento da gravação — se outra pessoa mudou o mesmo campo
       nesse meio-tempo, recusamos em vez de sobrescrever;
    5. formatos (validarCampo_): número USP só dígitos; Ingresso
       AAAA/1 ou AAAA/2; e-mails com formato de e-mail (ou vazio);
       nome não pode ficar vazio; M / F só M ou F; TIPO só
       SERVIDOR ou SETOR.
  Só as células que mudaram são escritas. LockService evita
  duas gravações simultâneas. Nada do conteúdo é registrado em log.
  Devolve a ficha atualizada + o resumo pra lista de busca.
------------------------------------------------------*/
function salvarFicha(pedido) {

  const p = pedido || {};
  const nomeCadastro = p.cadastro;
  const cadastro = obterCadastro_(nomeCadastro);
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(15000)) {
    throw new Error("Outra gravação está em andamento. Aguarde alguns segundos e tente salvar de novo.");
  }

  try {

    const aba = abrirCadastro_(cadastro);
    if (!usuarioPodeEditar_(aba)) {
      throw new Error(`Sua conta não tem permissão para alterar a planilha de ${cadastro.nome}. Peça acesso de editor ao responsável pelo cadastro.`);
    }

    const linha = conferirLinha_(nomeCadastro, aba, p);
    const ultimaColuna = aba.getLastColumn();
    const titulos = aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].map(t => String(t).trim());
    const mapa = mapearColunas_(titulos, nomeCadastro);
    const campoDaColuna = {};
    Object.keys(mapa).forEach(campo => { if (mapa[campo] >= 0) campoDaColuna[mapa[campo]] = campo; });

    const intervalo = aba.getRange(linha, 1, 1, ultimaColuna);
    const exibidos = intervalo.getDisplayValues()[0];
    const brutos = intervalo.getValues()[0];
    const formulas = intervalo.getFormulas()[0];

    const originais = p.originais || {};
    const novos = p.novos || {};
    const alteracoes = [];

    Object.keys(novos).forEach(titulo => {
      const i = titulos.indexOf(titulo);
      if (i === -1 || !titulo) throw new Error(`A coluna "${limitar_(titulo, 60)}" não existe na planilha de ${cadastro.nome}.`);
      let novo = limparValor_(novos[titulo]);
      if (novo === limparValor_(originais[titulo])) return; // não mudou
      if (COLUNAS_SOMENTE_LEITURA.indexOf(titulo) !== -1 || colunaOculta_(cadastro, titulo) || formulas[i]) {
        throw new Error(`A coluna "${titulo}" não pode ser alterada por aqui.`);
      }
      if (String(exibidos[i]) !== String(originais[titulo] == null ? "" : originais[titulo])) {
        throw new Error(`O campo "${titulo}" foi alterado por outra pessoa enquanto a ficha estava aberta. Feche, abra a ficha de novo e refaça a alteração.`);
      }
      novo = validarCampo_(nomeCadastro, campoDaColuna[i], titulo, novo);
      alteracoes.push({ coluna: i + 1, valor: converterParaCelula_(novo, brutos[i]) });
    });

    alteracoes.forEach(a => aba.getRange(linha, a.coluna).setValue(a.valor));
    if (alteracoes.length) SpreadsheetApp.flush();

    const ficha = montarFicha_(nomeCadastro, aba, linha);
    const valoresLinha = aba.getRange(linha, 1, 1, ultimaColuna).getValues()[0];
    ficha.alterados = alteracoes.length;
    ficha.resumo = itemDaLinha_(nomeCadastro, mapa, valoresLinha, linha);
    return ficha;

  } finally {
    trava.releaseLock();
  }

}

// Mantida da v1.1 (só alunos).
function salvarFichaAluno(pedido) {
  return salvarFicha(Object.assign({}, pedido, { cadastro: "alunos" }));
}

// Remove caracteres de controle, espaços nas pontas e limita o tamanho.
function limparValor_(valor) {
  return limitar_(String(valor == null ? "" : valor)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim(), TAMANHO_MAXIMO_CAMPO);
}

function limitar_(texto, maximo) {
  const t = String(texto == null ? "" : texto);
  return t.length > maximo ? t.slice(0, maximo) : t;
}

// Regras de formato dos campos conhecidos do cadastro (campo = chave
// de CABECALHOS_*; colunas fora deles só passam pela limpeza/limite).
// Devolve o valor a gravar (M/F e TIPO em maiúsculas).
function validarCampo_(nomeCadastro, campo, titulo, valor) {
  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (campo === "nome" && !valor) {
    throw new Error(nomeCadastro === "alunos" ? "O nome do aluno não pode ficar vazio." : `O campo "${titulo}" não pode ficar vazio.`);
  }
  if (campo === "numeroUsp" && valor && !/^\d{1,12}$/.test(valor)) {
    throw new Error("O número USP deve ter só dígitos.");
  }
  if (campo === "ingresso" && valor && !/^\d{4}\/[12]$/.test(valor)) {
    throw new Error("O ingresso deve estar no formato AAAA/S, por exemplo 2024/1 ou 2024/2.");
  }
  if ((campo === "email" || campo === "emailSecundario") && valor && !formatoEmail.test(valor)) {
    throw new Error(`O valor de "${titulo}" não parece um e-mail válido.`);
  }
  if (campo === "genero") {
    const g = valor.toUpperCase();
    if (g && g !== "M" && g !== "F") throw new Error(`O campo "${titulo}" aceita só M ou F (ou vazio).`);
    return g;
  }
  if (campo === "tipo") {
    const t = valor.toUpperCase();
    if (t && t !== "SERVIDOR" && t !== "SETOR") throw new Error(`O campo "${titulo}" aceita só SERVIDOR ou SETOR.`);
    return t;
  }
  return valor;
}

// Mantém o tipo da célula: se ela guardava um NÚMERO (ex.: Número USP
// numa coluna numérica) e o novo valor é só dígitos, grava número —
// senão o Sheets passaria a ter uma mistura de texto e número na mesma
// coluna. Todo o resto é gravado como texto, exatamente como digitado.
function converterParaCelula_(novo, valorAnterior) {
  if (typeof valorAnterior === "number" && /^\d+$/.test(novo)) return Number(novo);
  return novo;
}

/*-----------------------------------------------------
  EXPORTAÇÃO EM PDF — o CSV é gerado no próprio navegador; o PDF
  precisa do servidor (HtmlService → PDF via Utilities, sem
  DriveApp e sem salvar nada no Drive). Recebe as linhas que o
  navegador já está mostrando (já filtradas por ano/semestre/
  busca) — não lê a planilha de novo nem dá acesso a nada além do
  que a página já tem. Todo texto é escapado antes de virar HTML.
  Devolve { nome, base64 } pro navegador baixar.
  v1.2: a lista pode misturar alunos, docentes, servidores e
  setores — colunas Vínculo e Setor incluídas (vazias quando não
  se aplicam); o nome da função foi mantido.
------------------------------------------------------*/
function gerarPdfListaAlunos(pedido) {

  const p = pedido || {};
  const linhas = Array.isArray(p.linhas) ? p.linhas : [];
  if (!linhas.length) throw new Error("Não há pessoas na lista para exportar.");
  if (linhas.length > MAXIMO_LINHAS_EXPORTACAO) {
    throw new Error(`A lista tem mais de ${MAXIMO_LINHAS_EXPORTACAO} pessoas. Refine a busca ou filtre por ano antes de exportar.`);
  }

  const titulo = limitar_(String(p.titulo || "Comunidade IPUSP"), 200);
  const geradoEm = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");
  const colunas = ["Vínculo", "Nome", "Setor", "Número USP", "Ingresso", "E-mail", "E-mail secundário"];
  const chaves = ["vinculo", "nome", "setor", "numeroUsp", "ingresso", "email", "emailSecundario"];

  const corpo = linhas.map((l, i) =>
    `<tr><td class="n">${i + 1}</td>${chaves.map(c => `<td>${escaparHtml_(limitar_(l && l[c], 300))}</td>`).join("")}</tr>`
  ).join("");

  const html =
    `<html><head><meta charset="utf-8"><style>` +
    `@page{size:A4 landscape;margin:14mm}` +
    `body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#1f2933}` +
    `h1{font-size:14pt;margin:0 0 2px}p{margin:0 0 10px;color:#5f6b76;font-size:9pt}` +
    `table{width:100%;border-collapse:collapse}th,td{border:1px solid #b8c2cc;padding:4px 6px;text-align:left;vertical-align:top}` +
    `th{background:#eff6ff;color:#00457f}td.n{color:#5f6b76;width:28px}` +
    `</style></head><body>` +
    `<h1>${escaparHtml_(titulo)}</h1>` +
    `<p>Serviço de Graduação — Instituto de Psicologia da USP · ${linhas.length} pessoa${linhas.length === 1 ? "" : "s"} · gerado em ${geradoEm}. Contém dados pessoais: uso restrito à finalidade da solicitação.</p>` +
    `<table><thead><tr><th>#</th>${colunas.map(c => `<th>${escaparHtml_(c)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table>` +
    `</body></html>`;

  const pdf = Utilities.newBlob(html, "text/html", "lista.html").getAs("application/pdf");
  return {
    nome: limitar_(String(p.nomeArquivo || "comunidade-ipusp"), 120).replace(/[^\w.\-]+/g, "_") + ".pdf",
    base64: Utilities.base64Encode(pdf.getBytes())
  };

}

function escaparHtml_(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/*=====================================================
  DIAGNÓSTICO — rode esta função manualmente pelo editor
  do Apps Script (▶ Executar, com "diagnosticarComunidadeIPUSP"
  selecionado no menu de funções) depois de instalar ou
  mudar a configuração. Depois veja o resultado em
  Ver > Registros de execução.

  Registra SÓ informação de configuração (se a propriedade
  existe, nome da aba do índice, se cada chave foi resolvida,
  títulos das colunas usadas e QUANTAS pessoas de cada tipo
  foram lidas) — nunca IDs, nomes, números USP ou e-mails.
  (Até a v1.1 chamava-se diagnosticarBuscaAlunos.)
=====================================================*/
function diagnosticarComunidadeIPUSP() {

  const temPropriedade = !!PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  Logger.log(`Propriedade ${PROPRIEDADE_ID_INDICE}: ${temPropriedade ? "configurada" : "AUSENTE — cadastre em Configurações do projeto → Propriedades do script"}`);
  if (!temPropriedade) return;

  const indice = SpreadsheetApp.openById(obterIdIndice_());
  const abaIndice = indice.getSheetByName(ABA_INDICE) || indice.getSheets()[0];
  Logger.log(`Aba lida no ID_INDEX: "${abaIndice.getName()}"${abaIndice.getName() === ABA_INDICE ? "" : ` (não existe "${ABA_INDICE}"; usada a primeira aba)`}`);

  // v1.3: os três cadastros pelo título (obrigatórias e opcionais).
  Object.keys(CADASTROS).forEach(nomeCadastro => {
    const cadastro = CADASTROS[nomeCadastro];
    try {
      const aba = abrirCadastro_(cadastro);
      Logger.log(`Chave ${cadastro.chave}: encontrada no ID_INDEX; aba "${aba.getName()}"`);
      const cabecalho = aba.getLastColumn() > 0
        ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(tituloComparavel_)
        : [];
      Object.keys(cadastro.cabecalhos).forEach(campo => {
        const nomeColuna = cadastro.cabecalhos[campo];
        const achou = cabecalho.indexOf(tituloComparavel_(nomeColuna)) !== -1;
        const obrigatoria = cadastro.obrigatorios.indexOf(campo) !== -1;
        Logger.log(`  ${cadastro.nome} — coluna "${nomeColuna}": ${achou ? "ok" : (obrigatoria ? "NÃO ENCONTRADA (obrigatória)" : "não encontrada (opcional; fica vazia)")}`);
      });
      cadastro.ocultas.forEach(o => {
        if (cabecalho.indexOf(tituloComparavel_(o)) !== -1) Logger.log(`  ${cadastro.nome} — coluna "${o}": presente, mas não é mais usada pelo app (pode ser apagada)`);
      });
    } catch (err) {
      Logger.log(`Chave ${cadastro.chave}: NÃO DISPONÍVEL — ${mensagemSegura_(err)}`);
    }
  });

  let resultado;
  try {
    resultado = listarComunidadeParaBusca();
  } catch (err) {
    Logger.log(`Nenhum cadastro pôde ser lido: ${mensagemSegura_(err)}`);
    return;
  }
  const contagem = { aluno: 0, docente: 0, servidor: 0, setor: 0 };
  resultado.pessoas.forEach(p => { contagem[p.tipo]++; });
  Logger.log(`Pessoas que seriam enviadas à busca: ${contagem.aluno} alunos, ${contagem.docente} docentes, ${contagem.servidor} servidores, ${contagem.setor} setores`);
  if (resultado.indisponiveis.length) {
    Logger.log(`Cadastros indisponíveis: ${resultado.indisponiveis.map(i => i.descricao).join(", ")}`);
  }

}
