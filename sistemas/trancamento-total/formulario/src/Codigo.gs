/*=====================================================
  PEDIDO DE TRANCAMENTO TOTAL DE MATRÍCULA — V1.1
  (IPUSP)
  Backend Apps Script

  v1.1 (15/10/2026):
    - IDs de planilha fora do código: as duas planilhas são
      procuradas no índice mestre ID_INDEX pelas chaves
      PLANILHA_ALUNOS e TRANCAMENTO_TOTAL_MATRICULA. O ID do
      próprio ID_INDEX fica em Script Properties
      ["ID_INDEX_SPREADSHEET_ID"];
    - planilha de alunos lida pelo TÍTULO das colunas (mesmo
      esquema da Comunidade IPUSP), procurando o login também no
      "eMail Secundario";
    - se a planilha de alunos não abrir, o formulário abre mesmo
      assim, para preenchimento manual (antes ficava bloqueado);
    - coluna da confirmação achada pelo título ("Está ciente…"),
      com a 9ª coluna como reserva;
    - gravação com appendRow (não sobrescreve uma linha que outro
      processo tenha acabado de criar);
    - justificativa acima do limite é recusada com mensagem, em
      vez de cortada em silêncio;
    - trava ocupada dá mensagem clara; erros técnicos não
      aparecem para o aluno.

  Mesmo padrão de hardening dos demais sistemas do Serviço
  de Graduação (Diplomas, Abertura de Habilitação): nenhuma
  entrada do cliente é confiada sem validação, escrita na
  planilha sempre sob lock, e a identidade do solicitante
  nunca é aquela que o cliente manda — é sempre a da sessão
  autenticada do Google.

  Este Web App só CRIA pedidos (grava "pendente" na planilha
  de respostas). O processamento dos pedidos (avisar aluno,
  concluir, relatórios) é feito pelo sistema separado
  "Gerenciador de Trancamento Total", que já existe e lê a
  mesma planilha.

  CONFIGURAÇÃO OBRIGATÓRIA DE DEPLOY (Implantar > Nova
  implantação > Web app):
    - "Executar como": EU (a conta do Serviço de Graduação
      dona das planilhas). Assim o aluno não precisa — e não
      deve — ter acesso direto à planilha de respostas, à de
      alunos nem ao ID_INDEX.
    - "Quem pode acessar": qualquer pessoa da USP (domínio
      usp.br). O login é obrigatório e Session.getActiveUser()
      devolve o e-mail de quem abriu, porque a conta que
      implantou é do mesmo domínio.

  CONFIGURAÇÃO DO PROJETO:
    - Propriedades do script: ID_INDEX_SPREADSHEET_ID = ID da
      planilha mestre ID_INDEX.
    - No ID_INDEX (aba "Página1" ou a primeira; colunas
      "Chave" e "ID de Produção"): PLANILHA_ALUNOS e
      TRANCAMENTO_TOTAL_MATRICULA.
=====================================================*/

const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";
const CHAVE_ALUNOS = "PLANILHA_ALUNOS";
const CHAVE_RESPOSTAS = "TRANCAMENTO_TOTAL_MATRICULA";

// Títulos da planilha de alunos (os mesmos que a Comunidade IPUSP lê).
const CABECALHOS_ALUNOS = {
  nUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

const TAMANHO_MAXIMO_JUSTIFICATIVA = 4000;

// Domínio obrigatório pro login. Comparação é sempre em
// minúsculas — ver exigirUsuarioAutenticado_.
const DOMINIO_PERMITIDO = "usp.br";

const TIMEZONE = "America/Sao_Paulo";

// Cabeçalhos da aba de respostas (planilha gerada originalmente
// pelo Google Forms + colunas J/K usadas internamente pelo
// Gerenciador de Trancamento Total). Este formulário NUNCA cria
// cabeçalho nenhum — se um cabeçalho esperado não existir, o
// pedido é bloqueado com erro, porque essa planilha já é lida por
// outro sistema e um cabeçalho ausente é sinal de algo errado na
// planilha, não algo pra corrigir sozinho.
const CABECALHOS_RESPOSTAS = {
  situacao: "Situação",
  carimbo: "Carimbo de data/hora",
  email: "Endereço de e-mail",
  nome: "Nome Completo",
  nUsp: "Número USP",
  anoIngresso: "Ano de Ingresso",
  emailContato: "E-mail para contato",
  justificativa: "Justificativa"
};

// A pergunta de ciência/confirmação do Forms original tem um texto
// longo (e com espaçamento que pode variar entre edições do
// formulário). v1.1: a coluna é achada pelo começo do título
// ("Está ciente", sem diferença de acento/caixa/espaços); só se
// nenhum título começar assim vale a POSIÇÃO fixa (9ª coluna, logo
// após "Justificativa"), que é onde ela sempre esteve.
const INICIO_TITULO_CONFIRMACAO = "esta ciente";
// As colunas 10 (Registro ID) e 11 (Versão) são de uso exclusivo do
// Gerenciador de Trancamento Total — este formulário nunca escreve
// nelas.
const COLUNA_CONFIRMACAO = 9;

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

function doGet(e) {
  return HtmlService.createTemplateFromFile("TrancamentoFormApp")
    .evaluate()
    .setTitle("Pedido de Trancamento Total de Matrícula — IPUSP")
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
// por 10 minutos: o formulário é aberto por muitos alunos e o índice
// não precisa ser lido a cada acesso.
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

function abrirAbaPorChave_(chave) {
  return SpreadsheetApp.openById(obterIdProducao_(chave)).getSheets()[0];
}

function semAcento_(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizarTitulo_(texto) {
  return semAcento_(texto).replace(/\s+/g, " ").trim().toLowerCase();
}

// Erro mostrado ao aluno: a mensagem técnica fica só no registro de
// execução (sem dados pessoais), e o aluno recebe um texto genérico.
function erroParaAluno_(contexto, err) {
  Logger.log(`${contexto}: ${err && err.message ? err.message : err}`);
  return new Error("Não foi possível concluir agora por um problema de configuração do formulário. " +
    "Tente de novo mais tarde ou avise o Serviço de Graduação.");
}

/*=====================================================
  AUTENTICAÇÃO — a identidade de quem está preenchendo
  o formulário é SEMPRE a da sessão do Google, nunca um
  valor vindo do cliente. Todo endpoint que grava dados
  chama isto de novo antes de gravar (nunca reaproveita
  um e-mail que já tinha sido devolvido pra tela antes).
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
  PLANILHA DE ALUNOS — só leitura, primeira aba, colunas
  achadas pelo TÍTULO (CABECALHOS_ALUNOS). Ingresso no
  formato "AAAA/S" (ou "AAAAS"): usamos só os 4 primeiros
  dígitos. O login é procurado no "eMail" e, se a coluna
  existir, no "eMail Secundario".
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
  HISTÓRICO — busca (não bloqueante, só informativa) por
  pedidos anteriores do mesmo e-mail na planilha de
  respostas (aba única, diferente do sistema de Abertura
  de Habilitação que tem aba atual + histórico separadas).
=====================================================*/

function mapearCabecalhosRespostas_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return {};
  const linhaCabecalho = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];
  const mapa = {};
  linhaCabecalho.forEach((titulo, indice) => {
    if (titulo) mapa[String(titulo).trim()] = indice + 1;
  });
  return mapa;
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

function buscarHistoricoCompleto_(email) {

  const resultados = [];

  try {

    const aba = abrirAbaPorChave_(CHAVE_RESPOSTAS);

    const mapa = mapearCabecalhosRespostas_(aba);

    const colEmail = mapa[CABECALHOS_RESPOSTAS.email];
    const colCarimbo = mapa[CABECALHOS_RESPOSTAS.carimbo];
    const colSituacao = mapa[CABECALHOS_RESPOSTAS.situacao];

    if (!colEmail) return resultados;

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return resultados;

    const ultimaColuna = aba.getLastColumn();
    const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
    const alvo = email.trim().toLowerCase();

    dados.forEach(linha => {

      const emailLinha = String(linha[colEmail - 1] || "").trim().toLowerCase();
      if (emailLinha !== alvo) return;

      resultados.push({
        carimbo: colCarimbo ? formatarCarimboExibicao_(linha[colCarimbo - 1]) : "",
        situacao: colSituacao ? String(linha[colSituacao - 1] || "") : "(sem status registrado)"
      });

    });

  } catch (err) {
    Logger.log(`Falha ao buscar histórico de trancamento: ${err && err.message ? err.message : err}`);
  }

  return resultados;

}

/*=====================================================
  CARGA INICIAL — chamada pelo cliente assim que a
  página abre. Nunca recebe nada do cliente: tudo parte
  da sessão autenticada.
=====================================================*/

function obterDadosIniciais() {

  let email;
  try {
    email = exigirUsuarioAutenticado_();
  } catch (err) {
    return { autenticado: false, mensagem: err.message };
  }

  // Planilha de alunos fora do ar não impede o pedido: o formulário
  // abre vazio para preenchimento manual.
  let aluno = null;
  try {
    aluno = buscarAlunoPorEmail_(email);
  } catch (err) {
    Logger.log(`Falha ao ler a planilha de alunos: ${err && err.message ? err.message : err}`);
  }
  const historico = buscarHistoricoCompleto_(email);

  return {
    autenticado: true,
    encontrado: !!aluno,
    email: email,
    nUsp: aluno ? aluno.nUsp : "",
    nome: aluno ? aluno.nome : "",
    anoIngresso: aluno ? aluno.anoIngresso : "",
    historico: historico
  };

}

/*=====================================================
  VALIDAÇÃO / NORMALIZAÇÃO — toda entrada do cliente é
  tratada como não confiável, igual aos demais sistemas.
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

function validarEmailContato_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) throw new Error("Informe um e-mail para contato.");
  if (texto.length > 200) throw new Error("E-mail para contato muito longo.");
  // Validação simples de formato — não tenta ser um validador RFC
  // completo, só barrar erros de digitação óbvios.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
    throw new Error("E-mail para contato inválido.");
  }
  return sanitizarTextoPlano_(texto, 200);
}

function validarSimNao_(valor, rotuloCampo) {
  const texto = String(valor || "").trim();
  if (texto !== "Sim" && texto !== "Não") {
    throw new Error(`Responda "${rotuloCampo}".`);
  }
  return texto;
}

/*=====================================================
  GRAVAÇÃO DO PEDIDO
=====================================================*/

function colunaConfirmacao_(aba) {
  const titulos = aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), 1)).getValues()[0];
  for (let i = 0; i < titulos.length; i++) {
    if (normalizarTitulo_(titulos[i]).indexOf(INICIO_TITULO_CONFIRMACAO) === 0) return i + 1;
  }
  return COLUNA_CONFIRMACAO;
}

function registrarSolicitacao(dados) {

  const email = exigirUsuarioAutenticado_();

  const confirmacao = validarSimNao_(
    dados.confirmacao,
    "se está ciente das informações e confirma o trancamento total de matrícula"
  );

  if (confirmacao !== "Sim") {
    throw new Error(
      "Só é possível enviar o pedido se você confirmar estar ciente das informações e confirmar o trancamento total de matrícula."
    );
  }

  const nome = sanitizarTextoPlano_(dados.nome, 200);
  if (!nome) throw new Error("O nome não pode ficar vazio.");

  const nUsp = normalizarNUsp_(dados.nUsp);
  const anoIngresso = validarAnoIngresso_(dados.anoIngresso);
  const emailContato = validarEmailContato_(dados.emailContato);

  const justificativaBruta = String((dados && dados.justificativa) || "").trim();
  if (justificativaBruta.length > TAMANHO_MAXIMO_JUSTIFICATIVA) {
    throw new Error(`A justificativa passou de ${TAMANHO_MAXIMO_JUSTIFICATIVA} caracteres. Resuma o texto e envie de novo.`);
  }
  const justificativa = sanitizarTextoPlano_(justificativaBruta, TAMANHO_MAXIMO_JUSTIFICATIVA + 1);
  if (!justificativa) throw new Error("A justificativa não pode ficar vazia.");

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

    const mapa = mapearCabecalhosRespostas_(aba);

    const obterColunaObrigatoria = (chave) => {
      const nomeEsperado = CABECALHOS_RESPOSTAS[chave];
      const coluna = mapa[nomeEsperado];
      if (!coluna) {
        throw new Error(
          `Não encontrei a coluna "${nomeEsperado}" na planilha de respostas. ` +
          `Avise o Serviço de Graduação — o formulário ficará bloqueado até isso ser corrigido.`
        );
      }
      return coluna;
    };

    const colConfirmacao = colunaConfirmacao_(aba);
    const ultimaColuna = Math.max(aba.getLastColumn(), colConfirmacao);

    const valores = new Array(ultimaColuna).fill("");

    valores[obterColunaObrigatoria("situacao") - 1] = "pendente";
    valores[obterColunaObrigatoria("carimbo") - 1] = new Date();
    valores[obterColunaObrigatoria("email") - 1] = email;
    valores[obterColunaObrigatoria("nome") - 1] = nome;
    valores[obterColunaObrigatoria("nUsp") - 1] = nUsp;
    valores[obterColunaObrigatoria("anoIngresso") - 1] = anoIngresso;
    valores[obterColunaObrigatoria("emailContato") - 1] = emailContato;
    valores[obterColunaObrigatoria("justificativa") - 1] = justificativa;
    valores[colConfirmacao - 1] = confirmacao;
    // Colunas 10 (Registro ID) e 11 (Versão) ficam em branco — são
    // preenchidas/usadas pelo Gerenciador de Trancamento Total, não
    // por este formulário.

    // appendRow grava na primeira linha livre de forma atômica (não
    // sobrescreve uma linha criada por outro processo, como o Forms).
    aba.appendRow(valores);

    return { sucesso: true };

  } finally {
    lock.releaseLock();
  }

}
