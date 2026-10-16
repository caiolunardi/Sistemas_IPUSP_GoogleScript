/*=====================================================
  PEDIDO DE TRANCAMENTO TOTAL DE MATRÍCULA — V1.3
  (IPUSP)
  Backend Apps Script

  v1.3 (16/10/2026): ambiente de homologação. Numa cópia do
  projeto, a propriedade AMBIENTE = homologacao faz as chaves
  serem lidas na coluna "Homologação" do ID_INDEX, com faixa de
  aviso na página e "[HOMOLOGAÇÃO]" no título e no assunto do
  recibo. Sem a propriedade, nada muda.

  v1.2 (15/10/2026, pedido do Serviço de Graduação):
    - recibo por e-mail ao aluno logo depois do envio (para o
      e-mail do login, com cópia para o e-mail de contato quando
      for outro), enviado como "não responder";
    - pedido pendente do mesmo e-mail exige confirmação
      (confirmarNovoPedido) para enviar outro;
    - justificativa opcional (até dois anos de trancamento não
      precisa de justificativa, pela Resolução CoG 3761/1990);
    - histórico devolve "pendente" em cada pedido e a página
      passa a incluir tema GRADIP e Central de Ajuda (include_).
    ATENÇÃO: o envio de e-mail pede uma nova autorização do
    script (permissão de enviar e-mail como a conta que implanta).

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
      planilha mestre ID_INDEX; AMBIENTE = homologacao só na
      cópia de testes.
    - No ID_INDEX (aba "Página1" ou a primeira; colunas
      "Chave" e "ID de Produção"): PLANILHA_ALUNOS e
      TRANCAMENTO_TOTAL_MATRICULA.
=====================================================*/

const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const PROPRIEDADE_AMBIENTE = "AMBIENTE"; // "producao" (padrão) ou "homologacao"
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
  const pagina = HtmlService.createTemplateFromFile("TrancamentoFormApp");
  pagina.homologacao = prefixoAmbiente_() !== "";
  return pagina
    .evaluate()
    .setTitle(prefixoAmbiente_() + "Pedido de Trancamento Total de Matrícula — IPUSP")
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

// Ambiente do projeto. Sem a propriedade AMBIENTE (ou com "producao"),
// as chaves são lidas na coluna "ID de Produção" do ID_INDEX. Com
// "homologacao" (cópia do projeto só para testes), na coluna cujo
// título começa por "Homologação". Valor desconhecido é erro: um erro
// de digitação não pode mandar teste para a planilha de produção.
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

// ID da planilha de uma chave no ambiente do projeto (colunas achadas
// pelo título). Em cache por 10 minutos: o formulário é aberto por
// muitos alunos. Na homologação não há volta para a produção: coluna
// ou célula vazia é erro.
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

// Prefixo do título da página e do assunto do recibo na homologação.
function prefixoAmbiente_() {
  try { return ehHomologacao_() ? "[HOMOLOGAÇÃO] " : ""; } catch (err) { return "[CONFIGURAÇÃO INVÁLIDA] "; }
}

function abrirAbaPorChave_(chave) {
  return SpreadsheetApp.openById(obterIdPlanilha_(chave)).getSheets()[0];
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

// Mesmo critério do Gerenciador: pedido é concluído quando a
// Situação contém "conclu"; qualquer outra coisa conta como pendente.
function estaConcluido_(valorSituacao) {
  return semAcento_(valorSituacao).toLowerCase().indexOf("conclu") !== -1;
}

function buscarHistoricoCompleto_(email) {
  try {
    return pedidosDoEmail_(abrirAbaPorChave_(CHAVE_RESPOSTAS), email);
  } catch (err) {
    Logger.log(`Falha ao buscar histórico de trancamento: ${err && err.message ? err.message : err}`);
    return [];
  }
}

// Pedidos do e-mail (login) na aba de respostas: carimbo, situação e
// se ainda está pendente. Só do próprio e-mail, nunca de outros.
function pedidosDoEmail_(aba, email) {

  const resultados = [];
  const mapa = mapearCabecalhosRespostas_(aba);

  const colEmail = mapa[CABECALHOS_RESPOSTAS.email];
  const colCarimbo = mapa[CABECALHOS_RESPOSTAS.carimbo];
  const colSituacao = mapa[CABECALHOS_RESPOSTAS.situacao];

  if (!colEmail) return resultados;

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return resultados;

  const dados = aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues();
  const alvo = email.trim().toLowerCase();

  dados.forEach(linha => {

    const emailLinha = String(linha[colEmail - 1] || "").trim().toLowerCase();
    if (emailLinha !== alvo) return;

    const situacao = colSituacao ? String(linha[colSituacao - 1] || "") : "";
    resultados.push({
      carimbo: colCarimbo ? formatarCarimboExibicao_(linha[colCarimbo - 1]) : "",
      situacao: situacao || "(sem status registrado)",
      pendente: !estaConcluido_(situacao)
    });

  });

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
  RECIBO POR E-MAIL (v1.2) — texto simples, sem HTML. Vai
  para o e-mail do login; cópia para o e-mail de contato
  quando for diferente. noReply: o aluno não responde para a
  caixa do Serviço de Graduação.
=====================================================*/

function textoSemApostrofoInicial_(texto) {
  // sanitizarTextoPlano_ põe ' antes de =,+,-,@ por causa da planilha;
  // no e-mail, mostra o texto como o aluno digitou.
  return String(texto || "").replace(/^'(?=[=+\-@])/, "");
}

function montarRecibo_(dados, quando) {
  const linhas = [
    `Olá, ${textoSemApostrofoInicial_(dados.nome).split(" ")[0]}.`,
    "",
    `Recebemos o seu pedido de trancamento total de matrícula em ${quando}.`,
    "",
    "Dados enviados:",
    `- Nome: ${textoSemApostrofoInicial_(dados.nome)}`,
    `- Número USP: ${dados.nUsp}`,
    `- Ano de ingresso: ${dados.anoIngresso}`,
    `- E-mail para contato: ${textoSemApostrofoInicial_(dados.emailContato)}`,
    `- Justificativa: ${dados.justificativa ? textoSemApostrofoInicial_(dados.justificativa) : "(não informada)"}`,
    "",
    "Este e-mail é só o recibo do envio. O Serviço de Graduação vai analisar o pedido e mandar outra mensagem para o seu e-mail USP quando ele for processado.",
    "",
    "Mensagem automática, não responda.",
    "Serviço de Graduação — Instituto de Psicologia da USP"
  ];
  return linhas.join("\n");
}

function enviarRecibo_(email, dados) {
  const quando = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy 'às' HH:mm");
  const opcoes = { name: "Serviço de Graduação — IPUSP", noReply: true };
  const contato = String(textoSemApostrofoInicial_(dados.emailContato) || "").trim().toLowerCase();
  if (contato && contato !== email) opcoes.cc = contato;
  MailApp.sendEmail(email, prefixoAmbiente_() + "Recibo — Pedido de Trancamento Total de Matrícula", montarRecibo_(dados, quando), opcoes);
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
  // v1.2: opcional (pode ficar em branco).
  const justificativa = sanitizarTextoPlano_(justificativaBruta, TAMANHO_MAXIMO_JUSTIFICATIVA + 1);
  const confirmarNovoPedido = !!(dados && dados.confirmarNovoPedido);

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

    // Conferido de novo aqui, dentro da trava: um pedido pode ter sido
    // enviado (em outra aba, por exemplo) depois que a página abriu.
    const pendentes = pedidosDoEmail_(aba, email).filter(p => p.pendente);
    if (pendentes.length && !confirmarNovoPedido) {
      const quando = pendentes[pendentes.length - 1].carimbo;
      throw new Error("PEDIDO_PENDENTE: Você já tem um pedido de trancamento pendente" +
        (quando ? `, enviado em ${quando}` : "") + ".");
    }

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

  } finally {
    lock.releaseLock();
  }

  // Recibo fora da trava. Se falhar, o pedido continua gravado: a
  // página só avisa que o recibo não saiu.
  let reciboEnviado = false;
  try {
    enviarRecibo_(email, { nome, nUsp, anoIngresso, emailContato, justificativa });
    reciboEnviado = true;
  } catch (err) {
    Logger.log(`Falha ao enviar recibo de trancamento: ${err && err.message ? err.message : err}`);
  }

  return { sucesso: true, reciboEnviado: reciboEnviado };

}
