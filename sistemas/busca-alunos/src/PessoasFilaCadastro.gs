/*=====================================================
  FILA DE CADASTRO DOS PEDIDOS DE COLAÇÃO (v1.5, PR 5 do
  plano do Formulário de Pedido de Colação de Grau)

  O Formulário 2.x protocola o pedido mesmo quando não consegue
  confirmar quem é o aluno pela planilha central (Cadastro
  PENDENTE em PEDIDOS_COLACAO › PROTOCOLOS). Aqui a equipe decide:

    VINCULAR  a um cadastro existente da planilha central
              (opcionalmente trocando o e-mail principal para o
              e-mail do pedido, nunca de forma automática, D7);
    CRIAR     um cadastro novo (recusado se o nº USP ou o e-mail
              já estiverem em outra linha: aí só vincular);
    REJEITAR  com motivo.

  Cada decisão é uma linha nova em DECISOES_CADASTRO (só
  acréscimo; escritor único: este projeto). APROVADO libera o
  pedido para o encaminhador do Gerenciador de Diplomas, que leva
  à aba Diplomas; este projeto não grava na aba Diplomas nem mexe
  nos documentos. Depois de criar a linha na central, o nº USP é
  relido: se aparecer mais de uma vez, a decisão é DUPLICIDADE e
  o encaminhador não segue (o pedido volta à fila depois que a
  central for corrigida).

  Quem pode: só ADMINISTRADOR da aba PESSOAS_IPUSP que também é
  editor da planilha central (as mesmas duas condições da ficha).
  Para o LEITOR a fila não existe, nem como contador.

  Contrato de leitura (escrito pelo formulário): PROTOCOLOS,
  VERSOES, DOCUMENTOS. Contrato de escrita: DECISOES_CADASTRO,
  lida por título pelo formulário e pelo encaminhador (Protocolo
  ID, Versão, Decisão, Nº USP).

  Registros de execução: nunca nome, nº USP, e-mail, RG nem IDs.
=====================================================*/

const FILA_CADASTRO = {
  CHAVE_PEDIDOS: "PEDIDOS_COLACAO",
  ABA_DECISOES: "DECISOES_CADASTRO",
  COLUNAS_DECISOES: ["Quando", "Protocolo ID", "Versão", "Decisão", "Nº USP", "Ação", "E-mail anterior", "E-mail novo", "Motivo", "Quem"],
  ESPERA_TRAVA_MS: 15000,
  MAX_MOTIVO: 300
};

// Por que o formulário não confirmou (PROTOCOLOS › Motivo do cadastro).
const MOTIVOS_CADASTRO_PENDENTE = {
  SEM_CADASTRO: "Nenhuma linha da planilha central tem o e-mail do pedido.",
  EMAIL_REPETIDO: "O e-mail do pedido aparece em mais de uma linha da planilha central.",
  NUSP_VAZIO: "A linha do e-mail do pedido está sem nº USP.",
  NUSP_REPETIDO: "O nº USP da linha do e-mail do pedido aparece em mais de uma linha.",
  NOME_VAZIO: "A linha do e-mail do pedido está sem nome.",
  CONFLITO_NUSP: "O nº USP informado já pertence a outro e-mail na planilha central.",
  DIVERGENCIA_APONTADA: "O aluno apontou divergência nos dados do cadastro.",
  CADASTRO_INDISPONIVEL: "A planilha central não pôde ser lida no momento do envio."
};

/*----------------------------------------------------
  Pontos de entrada
----------------------------------------------------*/

/** Página: ADMINISTRADOR recebe a fila; LEITOR, só { visivel: false }. */
function obterFilaCadastro() {
  const usuario = exigirLeitorPessoas_();
  if (usuario.perfil !== ACESSO_PESSOAS.ADMINISTRADOR) return { visivel: false };
  const fontes = abrirFontesFila_();
  const abaCentral = obterAbaAlunos_();
  return { visivel: true, podeDecidir: usuarioPodeEditar_(abaCentral), itens: itensDaFila_(fontes, lerCentralFila_(abaCentral)) };
}

/**
 * Decide um pedido da fila.
 * pedido = { protocoloId, versao, acao: "VINCULAR"|"CRIAR"|"REJEITAR",
 *            linha, numeroUsp, nome  (VINCULAR: linha da central conferida),
 *            trocarEmail             (VINCULAR, opcional),
 *            novo: { numeroUsp, nome, ingresso }  (CRIAR),
 *            motivo                  (REJEITAR) }
 */
function decidirCadastro(pedido) {
  const usuario = exigirAdministradorPessoas_();
  const p = pedido || {};
  const acao = String(p.acao || "").toUpperCase();
  if (["VINCULAR", "CRIAR", "REJEITAR"].indexOf(acao) === -1) throw new Error("Ação desconhecida. Recarregue a página e tente de novo.");

  const trava = LockService.getScriptLock();
  if (!trava.tryLock(FILA_CADASTRO.ESPERA_TRAVA_MS)) {
    throw new Error("Outra gravação está em andamento. Aguarde alguns segundos e tente de novo.");
  }
  try {
    const abaCentral = obterAbaAlunos_();
    if (!usuarioPodeEditar_(abaCentral)) {
      throw new Error("Sua conta não tem permissão para alterar a planilha de alunos. Peça acesso de editor ao responsável pelo cadastro.");
    }
    const fontes = abrirFontesFila_();
    const central = lerCentralFila_(abaCentral);
    const item = itensDaFila_(fontes, central).filter(i => i.protocoloId === String(p.protocoloId || ""))[0];
    if (!item || item.versao !== Number(p.versao)) {
      throw new Error("Este pedido mudou ou já foi decidido por outra sessão. Recarregue a lista e confira de novo.");
    }

    let decisao;
    if (acao === "REJEITAR") decisao = rejeitarFila_(p);
    else if (acao === "VINCULAR") decisao = vincularFila_(abaCentral, central, item, p);
    else decisao = criarFila_(abaCentral, central, item, p);

    registrarDecisaoFila_(fontes, item, decisao, usuario.email);
    const centralDepois = lerCentralFila_(abaCentral);
    return { decisao: decisao.decisao, acao: decisao.acao, itens: itensDaFila_(abrirFontesFila_(), centralDepois) };
  } finally {
    trava.releaseLock();
  }
}

/** Só pelo editor: cria a aba DECISOES_CADASTRO, se faltar (nunca apaga nada). */
function prepararDecisoesCadastro() {
  exigirContextoDoDonoPessoas_();
  const planilha = SpreadsheetApp.openById(obterIdProducao_(FILA_CADASTRO.CHAVE_PEDIDOS));
  let aba = planilha.getSheetByName(FILA_CADASTRO.ABA_DECISOES);
  if (aba) {
    const faltam = titulosFaltandoFila_(aba, FILA_CADASTRO.COLUNAS_DECISOES);
    Logger.log(faltam.length ? "DECISOES_CADASTRO existe, mas faltam colunas: " + faltam.join(", ") : "DECISOES_CADASTRO já existe e está completa.");
    return { criada: false, faltam: faltam };
  }
  aba = planilha.insertSheet(FILA_CADASTRO.ABA_DECISOES);
  aba.getRange(1, 1, 1, FILA_CADASTRO.COLUNAS_DECISOES.length).setValues([FILA_CADASTRO.COLUNAS_DECISOES]);
  Logger.log("Aba DECISOES_CADASTRO criada.");
  return { criada: true, faltam: [] };
}

/*----------------------------------------------------
  Guarda do contexto do dono (editor). A página roda como quem
  implantou: quem a abre tem e-mail da sessão diferente do usuário
  efetivo. No editor, os dois são a mesma conta.
----------------------------------------------------*/

function exigirContextoDoDonoPessoas_() {
  let ativo = "", efetivo = "";
  try { ativo = normalizarEmailPessoas_(Session.getActiveUser().getEmail()); } catch (e) { ativo = ""; }
  try { efetivo = normalizarEmailPessoas_(Session.getEffectiveUser().getEmail()); } catch (e) { efetivo = ""; }
  if (!ativo || ativo !== efetivo) throw new Error("Função disponível só pelo editor do projeto.");
}

/*----------------------------------------------------
  Leitura
----------------------------------------------------*/

function tituloFila_(t) {
  return String(t == null ? "" : t).replace(/\s+/g, " ").trim();
}

function titulosFaltandoFila_(aba, titulos) {
  const largura = Math.max(aba.getLastColumn(), 1);
  const existentes = aba.getRange(1, 1, 1, largura).getValues()[0].map(tituloFila_);
  return titulos.filter(t => existentes.indexOf(t) === -1);
}

function lerTabelaFila_(planilha, nome) {
  const aba = planilha.getSheetByName(nome);
  if (!aba) return null;
  const ultimaLinha = aba.getLastRow(), ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1 || ultimaLinha < 1) return { aba: aba, linhas: [] };
  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const titulos = valores[0].map(tituloFila_);
  return {
    aba: aba,
    linhas: valores.slice(1).map(l => {
      const o = {};
      titulos.forEach((t, i) => { if (t) o[t] = l[i]; });
      return o;
    })
  };
}

function textoFila_(linha, titulo) {
  const v = linha ? linha[titulo] : "";
  return String(v == null ? "" : v).trim();
}

function digitosFila_(v) {
  return String(v == null ? "" : v).replace(/\D/g, "");
}

function abrirFontesFila_() {
  const planilha = SpreadsheetApp.openById(obterIdProducao_(FILA_CADASTRO.CHAVE_PEDIDOS));
  const exigir = nome => {
    const t = lerTabelaFila_(planilha, nome);
    if (!t) throw new Error("A planilha de pedidos de colação não tem a aba " + nome + ".");
    return t;
  };
  const protocolos = exigir("PROTOCOLOS");
  const versoes = exigir("VERSOES");
  const documentos = exigir("DOCUMENTOS");
  const decisoes = exigir(FILA_CADASTRO.ABA_DECISOES);
  const faltam = titulosFaltandoFila_(decisoes.aba, FILA_CADASTRO.COLUNAS_DECISOES);
  if (faltam.length) throw new Error("A aba DECISOES_CADASTRO está sem as colunas: " + faltam.join(", ") + ".");
  return { protocolos: protocolos.linhas, versoes: versoes.linhas, documentos: documentos.linhas, decisoes: decisoes.linhas, abaDecisoes: decisoes.aba };
}

// Planilha central: linhas pelo título, como a busca.
function lerCentralFila_(aba) {
  const ultimaLinha = aba.getLastRow(), ultimaColuna = aba.getLastColumn();
  const valores = ultimaLinha >= 1 && ultimaColuna >= 1 ? aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues() : [[]];
  const mapa = mapearColunas_(valores[0], "alunos");
  const linhas = [];
  const contagem = {};
  for (let i = 1; i < valores.length; i++) {
    const nUsp = digitosFila_(valorCampo_(valores[i], mapa, "numeroUsp"));
    const email = normalizarEmailPessoas_(valorCampo_(valores[i], mapa, "email"));
    if (nUsp) contagem[nUsp] = (contagem[nUsp] || 0) + 1;
    linhas.push({ linha: i + 1, numeroUsp: nUsp, nome: valorCampo_(valores[i], mapa, "nome"),
      ingresso: valorCampo_(valores[i], mapa, "ingresso"), email: email, bruto: valores[i] });
  }
  return { mapa: mapa, cabecalho: valores[0], linhas: linhas, contagem: contagem };
}

// Pedidos na fila: recebidos, cadastro PENDENTE, sem decisão (ou com a
// última = DUPLICIDADE, que é marcação do sistema e não do servidor).
function itensDaFila_(fontes, central) {
  const ultimaDecisao = {};
  fontes.decisoes.forEach(d => { const id = textoFila_(d, "Protocolo ID"); if (id) ultimaDecisao[id] = d; });
  const itens = [];
  fontes.protocolos.forEach(p => {
    if (textoFila_(p, "Recebimento") !== "RECEBIDO" || textoFila_(p, "Cadastro") !== "PENDENTE") return;
    const protocoloId = textoFila_(p, "Protocolo ID");
    if (!protocoloId) return;
    const decisao = ultimaDecisao[protocoloId];
    const textoDecisao = textoFila_(decisao, "Decisão").toUpperCase();
    if (textoDecisao && textoDecisao !== "DUPLICIDADE") return;

    const concluidas = fontes.versoes
      .filter(v => textoFila_(v, "Protocolo ID") === protocoloId && textoFila_(v, "Situação") === "RECEBIDO")
      .sort((a, b) => Number(a["Versão"]) - Number(b["Versão"]));
    if (!concluidas.length) return;
    const ultima = concluidas[concluidas.length - 1];
    const versao = Number(ultima["Versão"]);
    let dados = {};
    try { dados = JSON.parse(textoFila_(ultima, "Dados do pedido") || "{}") || {}; } catch (e) { dados = {}; }

    const email = normalizarEmailPessoas_(textoFila_(p, "E-mail da sessão"));
    const nUsp = digitosFila_(dados.nUsp || textoFila_(p, "Nº USP informado"));
    const motivo = textoFila_(p, "Motivo do cadastro");
    const candidatos = central.linhas
      .filter(l => (nUsp && l.numeroUsp === nUsp) || (email && l.email === email))
      .map(l => ({ linha: l.linha, numeroUsp: l.numeroUsp, nome: l.nome, ingresso: l.ingresso, email: l.email,
        mesmoNumeroUsp: !!nUsp && l.numeroUsp === nUsp, mesmoEmail: !!email && l.email === email,
        numeroUspRepetido: !!l.numeroUsp && central.contagem[l.numeroUsp] > 1 }));

    itens.push({
      protocoloId: protocoloId,
      protocolo: textoFila_(p, "Protocolo"),
      versao: versao,
      recebidoEm: textoFila_(p, "Recebido em"),
      colacao: textoFila_(p, "Colação"),
      email: email,
      nome: String(dados.nome || textoFila_(p, "Nome informado")).replace(/\s+/g, " ").trim(),
      numeroUsp: nUsp,
      ingresso: String(dados.anoIngresso || "").trim(),
      divergencia: String(dados.divergenciaApontada || "").slice(0, 500),
      motivo: MOTIVOS_CADASTRO_PENDENTE[motivo] || (motivo ? "Cadastro não confirmado pelo formulário." : ""),
      duplicidadeAnterior: textoDecisao === "DUPLICIDADE",
      documentos: fontes.documentos
        .filter(d => textoFila_(d, "Protocolo ID") === protocoloId && Number(d["Versão"]) === versao)
        .map(d => ({ tipo: textoFila_(d, "Tipo"), url: urlArquivoFila_(textoFila_(d, "ID do arquivo")) })),
      candidatos: candidatos
    });
  });
  return itens;
}

// Link do documento (o Drive confere a permissão de quem clica).
function urlArquivoFila_(id) {
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? "https://drive.google.com/file/d/" + id + "/view" : "";
}

/*----------------------------------------------------
  Decisões (sempre conferidas aqui; a página só sugere)
----------------------------------------------------*/

function rejeitarFila_(p) {
  const motivo = limparValor_(p.motivo).slice(0, FILA_CADASTRO.MAX_MOTIVO);
  if (!motivo) throw new Error("Escreva o motivo da rejeição.");
  return { decisao: "REJEITADO", acao: "REJEITADO", numeroUsp: "", motivo: motivo };
}

function vincularFila_(abaCentral, central, item, p) {
  const linha = conferirLinha_("alunos", abaCentral, { linha: p.linha, numeroUsp: p.numeroUsp, nome: p.nome });
  const alvo = central.linhas.filter(l => l.linha === linha)[0];
  if (!alvo || !alvo.numeroUsp) throw new Error("Este cadastro está sem nº USP. Complete a ficha antes de vincular.");
  if (central.contagem[alvo.numeroUsp] > 1) {
    throw new Error("Este nº USP aparece em mais de uma linha da planilha de alunos. Corrija o cadastro antes de vincular.");
  }
  const r = { decisao: "APROVADO", acao: "VINCULADO", numeroUsp: alvo.numeroUsp, motivo: "", emailAnterior: "", emailNovo: "" };
  if (p.trocarEmail && item.email && alvo.email !== item.email) {
    const outro = central.linhas.some(l => l.linha !== linha && l.email === item.email);
    if (outro) throw new Error("O e-mail do pedido já está em outra linha da planilha de alunos. Corrija o cadastro antes de trocar o e-mail.");
    const coluna = central.mapa.email + 1;
    const atual = abaCentral.getRange(linha, coluna).getValue();
    if (normalizarEmailPessoas_(atual) !== alvo.email) throw new Error("A planilha de alunos mudou desde que a lista abriu. Recarregue e tente de novo.");
    abaCentral.getRange(linha, coluna).setValue(item.email);
    SpreadsheetApp.flush();
    r.emailAnterior = alvo.email;
    r.emailNovo = item.email;
  }
  return r;
}

function criarFila_(abaCentral, central, item, p) {
  const novo = p.novo || {};
  const nUsp = limparValor_(novo.numeroUsp);
  const nome = limparValor_(novo.nome).replace(/\s+/g, " ");
  const ingresso = limparValor_(novo.ingresso);
  validarCampo_("alunos", "numeroUsp", "Número USP", nUsp);
  if (!nUsp) throw new Error("Informe o número USP.");
  validarCampo_("alunos", "nome", "Nome do Aluno", nome);
  validarCampo_("alunos", "ingresso", "Ingresso", ingresso);
  if (central.contagem[nUsp]) throw new Error("Este nº USP já tem cadastro. Use Vincular ao cadastro existente.");
  if (item.email && central.linhas.some(l => l.email === item.email)) {
    throw new Error("O e-mail do pedido já está numa linha da planilha de alunos. Use Vincular ao cadastro existente.");
  }

  const largura = central.cabecalho.length;
  const linha = [];
  for (let i = 0; i < largura; i++) linha.push("");
  // Mesmo tipo das células da coluna (número, se a coluna guarda número).
  const exemplo = central.linhas.map(l => l.bruto[central.mapa.numeroUsp]).filter(v => v !== "" && v != null)[0];
  linha[central.mapa.numeroUsp] = converterParaCelula_(nUsp, exemplo);
  linha[central.mapa.nome] = nome;
  if (central.mapa.ingresso >= 0) linha[central.mapa.ingresso] = ingresso;
  linha[central.mapa.email] = item.email;
  abaCentral.appendRow(linha);
  SpreadsheetApp.flush();

  // Releitura: outro escritor (ou edição manual) pode ter criado o mesmo nº USP.
  const depois = lerCentralFila_(abaCentral);
  if ((depois.contagem[nUsp] || 0) !== 1) {
    return { decisao: "DUPLICIDADE", acao: "CRIADO", numeroUsp: nUsp, motivo: "Nº USP repetido na planilha de alunos depois de criar o cadastro." };
  }
  return { decisao: "APROVADO", acao: "CRIADO", numeroUsp: nUsp, motivo: "" };
}

function registrarDecisaoFila_(fontes, item, d, emailQuem) {
  const aba = fontes.abaDecisoes;
  const titulos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(tituloFila_);
  const valores = {
    "Quando": "'" + Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
    "Protocolo ID": "'" + item.protocoloId,
    "Versão": item.versao,
    "Decisão": d.decisao,
    "Nº USP": d.numeroUsp ? "'" + d.numeroUsp : "",
    "Ação": d.acao,
    "E-mail anterior": d.emailAnterior || "",
    "E-mail novo": d.emailNovo || "",
    "Motivo": d.motivo || "",
    "Quem": emailQuem
  };
  aba.appendRow(titulos.map(t => (t in valores ? valores[t] : "")));
  SpreadsheetApp.flush();
}
