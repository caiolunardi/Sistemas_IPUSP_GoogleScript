/*=====================================================
  GERENCIADOR DE TRANCAMENTO TOTAL DE MATRÍCULA — V1.1
  Backend Apps Script (projeto autônomo)

  v1.1 (15/10/2026):
    - o ID da planilha saiu do código: agora é procurado no
      índice mestre ID_INDEX pela chave TRANCAMENTO_TOTAL_MATRICULA
      (ver obterPlanilha_). O ID do próprio ID_INDEX fica em
      Script Properties["ID_INDEX_SPREADSHEET_ID"], como nos
      outros sistemas do repositório;
    - a versão do pedido sobe já na primeira gravação (antes do
      envio do e-mail), fechando a janela em que outra sessão
      podia salvar por cima;
    - depois do envio, a linha é localizada de novo pelo Registro
      ID (a planilha pode ter sido reordenada nesse meio-tempo);
    - a reserva "ENVIANDO…" leva data e hora; se ficar presa por
      mais de 10 minutos (execução interrompida), deixa de travar
      o pedido e o sistema pede confirmação de reenvio;
    - voltar um pedido para Pendente limpa a Data de Conclusão;
    - trava ocupada dá mensagem clara em vez de erro genérico;
    - nomes de alunos não vão mais para o registro de execução.

  Segue o mesmo padrão de hardening dos outros sistemas do
  Serviço de Graduação (Diplomas, Abertura de Habilitações):
  LockService, Registro ID + Versão para concorrência
  otimista, mapeamento de cabeçalhos por nome, sanitização
  central de entrada.

  CONFIGURAÇÃO OBRIGATÓRIA:

  1) Configurações do projeto → Propriedades do script:
       ID_INDEX_SPREADSHEET_ID = ID da planilha mestre ID_INDEX
  2) Na planilha ID_INDEX (aba "Página1" ou a primeira aba,
     colunas "Chave" e "ID de Produção" achadas pelo título):
       TRANCAMENTO_TOTAL_MATRICULA = planilha de respostas do
       formulário de trancamento total de matrícula.

  Estrutura da planilha (conforme print enviado, aba única —
  não existe aba histórica separada como no gerenciador de
  habilitações; os pedidos antigos já concluídos ficam na
  mesma aba junto com os novos):

  A - Situação (marcada manualmente como "Concluído")
  B - Carimbo de data/hora (preenchido pelo Forms)
  C - Endereço de e-mail (conta Google usada no formulário —
      é o e-mail institucional usado para avisar o aluno)
  D - Nome Completo
  E - Número USP
  F - Ano de Ingresso
  G - E-mail para contato (campo opcional do formulário do
      aluno — só leitura aqui, este sistema nunca escreve
      nessa coluna)
  H - Justificativa (texto livre, pode ser longo)
  I - Confirmação de ciência / trancamento (SIM)

  Todas as colunas A-I são lidas pelo NOME do cabeçalho da
  linha 1 (não por posição fixa). Colunas novas (Data de
  Conclusão, Registro ID, Versão, E-mail Enviado) são criadas
  automaticamente no final da planilha na primeira execução,
  se não existirem.

  Este sistema usa a PRIMEIRA aba da planilha (getSheets()[0]),
  já que não há divisão em aba atual/antiga aqui.
=====================================================*/

// O ID do ID_INDEX fica em Configurações do projeto → Propriedades do
// script; o da planilha de respostas, no próprio ID_INDEX. Nenhum ID
// de planilha fica no código.
const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";
const CHAVE_PLANILHA = "TRANCAMENTO_TOTAL_MATRICULA";

// Reserva de envio de e-mail mais velha que isso é considerada
// interrompida (a execução do Apps Script morre em 6 minutos).
const MINUTOS_RESERVA_ENVIO = 10;
const PREFIXO_RESERVA = "ENVIANDO…";

// Mesmo endereço institucional dos outros sistemas do Serviço de Graduação.
const EMAIL_REMETENTE = "gradip@usp.br";

const TIMEZONE = "America/Sao_Paulo";

const CABECALHOS = {
  situacao: "Situação",
  carimbo: "Carimbo de data/hora",
  emailFormulario: "Endereço de e-mail",
  nome: "Nome Completo",
  nUsp: "Número USP",
  anoIngresso: "Ano de Ingresso",
  emailContato: "E-mail para contato",
  justificativa: "Justificativa",
  confirmacao: "Está ciente de todas as informações pertinentes e confirma o trancamento total de matrícula a partir do semestre vigente?",
  dataConclusao: "Data de Conclusão",
  registroId: "Registro ID",
  versao: "Versão",
  emailEnviado: "E-mail Enviado"
};

/*=====================================================
  SERVE A PÁGINA
=====================================================*/

function doGet(e) {

  try {
    migrarParaRegistroId_();
  } catch (err) {
    Logger.log("Falha na migração automática de Registro ID: " + err);
  }

  return HtmlService.createTemplateFromFile("TrancamentoApp")
    .evaluate()
    .setTitle("Gerenciador de Trancamento Total de Matrícula")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  PLANILHA / ABA / CABEÇALHOS
=====================================================*/

function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error(`Configuração obrigatória ausente: ${PROPRIEDADE_ID_INDICE}.`);
  return String(id).trim();
}

// ID de Produção de uma chave do ID_INDEX (colunas achadas pelo
// título). Mesmo formato dos outros sistemas do repositório. Fica em
// cache por 10 minutos pra não abrir o índice a cada clique.
function obterIdProducao_(chave) {

  const cache = CacheService.getScriptCache();
  const chaveCache = "idIndex:" + chave;
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache;

  let planilha;
  try {
    planilha = SpreadsheetApp.openById(obterIdIndice_());
  } catch (err) {
    if (String(err && err.message || err).indexOf(PROPRIEDADE_ID_INDICE) !== -1) throw err;
    throw new Error("Não consegui abrir a planilha ID_INDEX. Confira a propriedade " +
      PROPRIEDADE_ID_INDICE + " e se a conta que executa o sistema tem acesso a ela.");
  }

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

function obterPlanilha_() {
  const id = obterIdProducao_(CHAVE_PLANILHA);
  try {
    return SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error(`Não consegui abrir a planilha da chave ${CHAVE_PLANILHA} (ID_INDEX). ` +
      "Confira o ID de Produção e se a conta que executa o sistema tem acesso a ela.");
  }
}

// LockService com mensagem clara quando outra gravação está em curso
// (waitLock lançava um erro genérico em inglês).
function travar_(milissegundos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(milissegundos)) {
    throw new Error("Outra gravação está em andamento. Aguarde alguns segundos e tente de novo.");
  }
  return lock;
}

// Aba única — sem divisão atual/antiga. Sempre a primeira aba da
// planilha, então não depende do nome exato da aba (que pode mudar
// se a planilha for renomeada na interface do Forms).
function obterAba_() {
  const aba = obterPlanilha_().getSheets()[0];
  if (!aba) throw new Error("Não encontrei nenhuma aba na planilha.");
  return aba;
}

function mapearCabecalhos_(aba) {

  const ultimaColuna = aba.getLastColumn();
  const linhaCabecalho = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];

  const mapa = {};
  linhaCabecalho.forEach((titulo, indice) => {
    if (titulo) mapa[String(titulo).trim()] = indice + 1;
  });

  return mapa;

}

function obterColuna_(mapaCabecalhos, chave) {

  const nomeEsperado = CABECALHOS[chave];
  const coluna = mapaCabecalhos[nomeEsperado];

  if (!coluna) {
    throw new Error(
      `Não encontrei a coluna "${nomeEsperado}" na planilha. ` +
      `Confira se o cabeçalho da linha 1 está exatamente assim.`
    );
  }

  return coluna;

}

function obterColunaOpcional_(mapaCabecalhos, chave) {
  const nomeEsperado = CABECALHOS[chave];
  return mapaCabecalhos[nomeEsperado] || null;
}

function obterOuCriarColuna_(aba, mapaCabecalhos, chave) {

  const nomeEsperado = CABECALHOS[chave];
  const colunaExistente = mapaCabecalhos[nomeEsperado];

  if (colunaExistente) return colunaExistente;

  const novaColuna = aba.getLastColumn() + 1;
  aba.getRange(1, novaColuna).setValue(nomeEsperado);
  mapaCabecalhos[nomeEsperado] = novaColuna;

  return novaColuna;

}

/*=====================================================
  REGISTRO ID (UUID) + VERSÃO — mesmo padrão dos outros
  sistemas do Serviço de Graduação.
=====================================================*/

function garantirColunasBase_(aba, mapa) {
  obterOuCriarColuna_(aba, mapa, "registroId");
  obterOuCriarColuna_(aba, mapa, "versao");
}

function precisaMigrar_(aba, mapa) {

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colNome = obterColunaOpcional_(mapa, "nome");

  if (!colRegistroId || !colVersao) return true;
  if (!colNome) return false; // sem coluna Nome, não dá pra saber quais linhas são "reais"

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return false;

  const numColunas = Math.max(colRegistroId, colVersao, colNome);
  const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

  const vistos = new Set();

  for (let i = 0; i < dados.length; i++) {
    if (!dados[i][colNome - 1]) continue;
    const id = String(dados[i][colRegistroId - 1] || "").trim();
    if (!id || vistos.has(id)) return true;
    vistos.add(id);
    const v = dados[i][colVersao - 1];
    if (!v || isNaN(Number(v))) return true;
  }

  return false;

}

function migrarParaRegistroId_() {

  const abaChecagem = obterAba_();
  const mapaChecagem = mapearCabecalhos_(abaChecagem);

  if (!precisaMigrar_(abaChecagem, mapaChecagem)) {
    return { alteradas: 0, duplicatasCorrigidas: 0 };
  }

  const lock = travar_(15000);

  try {

    const aba = obterAba_();
    const mapa = mapearCabecalhos_(aba);
    garantirColunasBase_(aba, mapa);

    const colRegistroId = obterColuna_(mapa, "registroId");
    const colVersao = obterColuna_(mapa, "versao");
    const colNome = obterColunaOpcional_(mapa, "nome");

    if (!colNome) return { alteradas: 0, duplicatasCorrigidas: 0 };

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return { alteradas: 0, duplicatasCorrigidas: 0 };

    const numColunas = Math.max(colRegistroId, colVersao, colNome);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    const vistos = new Set();
    let alteradas = 0;
    let duplicatasCorrigidas = 0;

    for (let i = 0; i < dados.length; i++) {

      const nome = dados[i][colNome - 1];
      if (!nome) continue;

      const idAtual = String(dados[i][colRegistroId - 1] || "").trim();

      if (!idAtual) {
        const novoId = Utilities.getUuid();
        dados[i][colRegistroId - 1] = novoId;
        vistos.add(novoId);
        alteradas++;
      } else if (vistos.has(idAtual)) {
        const novoId = Utilities.getUuid();
        dados[i][colRegistroId - 1] = novoId;
        vistos.add(novoId);
        duplicatasCorrigidas++;
        Logger.log(`Registro ID duplicado corrigido na linha ${i + 2}.`);
      } else {
        vistos.add(idAtual);
      }

      const versaoAtual = dados[i][colVersao - 1];
      if (!versaoAtual || isNaN(Number(versaoAtual))) {
        dados[i][colVersao - 1] = 1;
      }

    }

    if (alteradas > 0 || duplicatasCorrigidas > 0) {
      aba.getRange(2, 1, dados.length, numColunas).setValues(dados);
    }

    return { alteradas: alteradas, duplicatasCorrigidas: duplicatasCorrigidas };

  } finally {
    lock.releaseLock();
  }

}

function validarFormatoRegistroId_(registroId) {
  if (!registroId || typeof registroId !== "string" ||
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(registroId)) {
    throw new Error("Identificador de registro inválido.");
  }
}

function localizarLinhaPorId_(aba, mapa, registroId) {

  validarFormatoRegistroId_(registroId);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  if (!colRegistroId) {
    throw new Error(
      "A planilha ainda não tem a coluna 'Registro ID'. Recarregue a página " +
      "(isso dispara a migração automática) antes de continuar."
    );
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) throw new Error("Registro não encontrado.");

  const valores = aba.getRange(2, colRegistroId, ultimaLinha - 1, 1).getValues();
  let linhaEncontrada = null;

  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0] || "").trim() === registroId) {
      if (linhaEncontrada !== null) {
        throw new Error(
          "Erro de integridade: existe mais de um registro com o mesmo identificador " +
          "interno. Não prossegui pra evitar mexer no pedido errado — avise o suporte técnico."
        );
      }
      linhaEncontrada = i + 2;
    }
  }

  if (linhaEncontrada === null) {
    throw new Error("Esse registro não existe mais (pode ter sido excluído ou editado por outra sessão). Recarregue a lista.");
  }

  return linhaEncontrada;

}

function resolverRegistroPorId_(registroId) {
  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);
  const linha = localizarLinhaPorId_(aba, mapa, registroId);
  return { aba: aba, mapa: mapa, linha: linha };
}

function lerVersao_(aba, mapa, linha) {
  const col = obterColunaOpcional_(mapa, "versao");
  if (!col) return 1;
  const v = aba.getRange(linha, col).getValue();
  return v && !isNaN(Number(v)) ? Number(v) : 1;
}

function exigirVersaoAtual_(aba, mapa, linha, versaoEsperada) {
  const versaoAtual = lerVersao_(aba, mapa, linha);
  if (versaoEsperada !== undefined && versaoEsperada !== null && versaoEsperada !== "" &&
      Number(versaoEsperada) !== versaoAtual) {
    throw new Error(
      "Este pedido foi alterado por outra sessão desde que você o abriu. " +
      "Recarregue os dados antes de continuar."
    );
  }
  return versaoAtual;
}

function incrementarVersao_(aba, mapa, linha) {
  const col = obterOuCriarColuna_(aba, mapa, "versao");
  const nova = lerVersao_(aba, mapa, linha) + 1;
  aba.getRange(linha, col).setValue(nova);
  return nova;
}

/*=====================================================
  VALIDAÇÃO / NORMALIZAÇÃO
=====================================================*/

function estaConcluido_(valorSituacao) {
  const v = String(valorSituacao || "").trim().toLowerCase();
  return v.indexOf("conclu") !== -1;
}

/*=====================================================
  SAUDAÇÃO / DATA — sempre calculadas no fuso de Brasília
  de forma explícita (nunca via getHours() do relógio do
  projeto, que pode estar configurado num fuso diferente).
=====================================================*/

function saudacaoAtual_() {
  const horaSp = Number(Utilities.formatDate(new Date(), TIMEZONE, "H"));
  if (horaSp >= 0 && horaSp < 12) return "Bom dia";
  if (horaSp >= 12 && horaSp < 18) return "Boa tarde";
  return "Boa noite";
}

function carimboAgora_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm");
}

function formatarDataParaExibicao_(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy HH:mm");
  }
  return String(valor);
}

/*=====================================================
  LISTAS: PENDENTES / CONCLUÍDOS
=====================================================*/

function obterPendentes() {

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colSituacao = obterColuna_(mapa, "situacao");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colAnoIngresso = obterColuna_(mapa, "anoIngresso");
  const colCarimbo = obterColuna_(mapa, "carimbo");
  const colJustificativa = obterColunaOpcional_(mapa, "justificativa");

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const pendentes = [];

  dados.forEach((linhaDados, indice) => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;

    const situacao = linhaDados[colSituacao - 1];
    if (estaConcluido_(situacao)) return;

    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (!registroId) {
      Logger.log(`Linha ${indice + 2} sem Registro ID — ignorada em obterPendentes até a próxima migração.`);
      return;
    }

    const justificativaBruta = colJustificativa ? String(linhaDados[colJustificativa - 1] || "") : "";

    pendentes.push({
      registroId: registroId,
      versao: colVersao ? (Number(linhaDados[colVersao - 1]) || 1) : 1,
      nome: nome,
      nUsp: linhaDados[colNUsp - 1],
      anoIngresso: linhaDados[colAnoIngresso - 1],
      carimbo: formatarDataParaExibicao_(linhaDados[colCarimbo - 1]),
      justificativaResumo: justificativaBruta.length > 90 ? justificativaBruta.slice(0, 90) + "…" : justificativaBruta
    });

  });

  pendentes.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  return pendentes;

}

// Últimos 10 concluídos, mais recentes primeiro (por Data de
// Conclusão; se ausente, usa o carimbo original).
function obterConcluidosRecentes() {

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colSituacao = obterColuna_(mapa, "situacao");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colAnoIngresso = obterColuna_(mapa, "anoIngresso");
  const colCarimbo = obterColuna_(mapa, "carimbo");
  const colDataConclusao = obterColunaOpcional_(mapa, "dataConclusao");
  const colEmailEnviado = obterColunaOpcional_(mapa, "emailEnviado");

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const concluidos = [];

  // Contadores de diagnóstico — aparecem no Registro de execução
  // (Extensões > Apps Script > Execuções, ou Ctrl+Enter no editor)
  // pra mostrar exatamente em qual filtro as linhas estão caindo.
  let totalComNome = 0;
  let totalConcluidoPelaSituacao = 0;
  let totalComRegistroId = 0;

  dados.forEach(linhaDados => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;
    totalComNome++;

    const situacao = linhaDados[colSituacao - 1];
    if (!estaConcluido_(situacao)) return;
    totalConcluidoPelaSituacao++;

    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (!registroId) return;
    totalComRegistroId++;

    const dataConclusaoBruta = colDataConclusao ? linhaDados[colDataConclusao - 1] : "";
    const carimboBruto = linhaDados[colCarimbo - 1];

    concluidos.push({
      registroId: registroId,
      versao: colVersao ? (Number(linhaDados[colVersao - 1]) || 1) : 1,
      nome: nome,
      nUsp: linhaDados[colNUsp - 1],
      anoIngresso: linhaDados[colAnoIngresso - 1],
      carimbo: formatarDataParaExibicao_(carimboBruto),
      dataConclusao: formatarDataParaExibicao_(dataConclusaoBruta) || formatarDataParaExibicao_(carimboBruto),
      emailEnviado: colEmailEnviado && !ehReserva_(linhaDados[colEmailEnviado - 1]) ? (linhaDados[colEmailEnviado - 1] || "") : "",
      ordenacao: (dataConclusaoBruta instanceof Date ? dataConclusaoBruta.getTime() :
                 (carimboBruto instanceof Date ? carimboBruto.getTime() : 0))
    });

  });

  Logger.log(
    `obterConcluidosRecentes: colSituacao=${colSituacao} colNome=${colNome} colRegistroId=${colRegistroId} | ` +
    `linhas com nome=${totalComNome}, com situação concluída=${totalConcluidoPelaSituacao}, ` +
    `com Registro ID=${totalComRegistroId}, retornados (após limite de 10)=${Math.min(concluidos.length, 10)}`
  );

  concluidos.sort((a, b) => b.ordenacao - a.ordenacao);

  return concluidos.slice(0, 10).map(c => {
    delete c.ordenacao;
    return c;
  });

}

/*=====================================================
  DETALHE DE UM PEDIDO (pra abrir o card)
=====================================================*/

function obterDetalhe(registroId) {

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const ultimaColuna = aba.getLastColumn();
  const dados = aba.getRange(linha, 1, 1, ultimaColuna).getValues()[0];

  const pegar = (chave) => dados[obterColuna_(mapa, chave) - 1];
  const pegarOpcional = (chave) => {
    const col = obterColunaOpcional_(mapa, chave);
    return col ? dados[col - 1] : "";
  };

  const situacaoValor = pegar("situacao");

  return {
    registroId: registroId,
    versao: lerVersao_(aba, mapa, linha),
    nome: pegar("nome") || "",
    nUsp: pegar("nUsp") || "",
    emailFormulario: pegar("emailFormulario") || "",
    emailContato: pegarOpcional("emailContato") || "",
    anoIngresso: pegar("anoIngresso") || "",
    justificativa: pegar("justificativa") || "",
    confirmacao: pegarOpcional("confirmacao") || "",
    carimbo: formatarDataParaExibicao_(pegar("carimbo")),
    situacao: situacaoValor || "",
    concluido: estaConcluido_(situacaoValor),
    dataConclusao: formatarDataParaExibicao_(pegarOpcional("dataConclusao")),
    emailEnviado: (() => {
      const v = pegarOpcional("emailEnviado");
      return ehReserva_(v) ? "" : (v || "");
    })()
  };

}

/*=====================================================
  SALVAR PEDIDO — ação única do modal: conforme os dois
  checkboxes marcados na tela, conclui a solicitação
  (coluna Situação + Data de Conclusão) e/ou avisa o aluno
  por e-mail. As duas coisas são independentes — dá pra
  concluir um pedido antigo sem mandar e-mail (ex: pedidos
  de antes deste sistema existir), ou marcar como concluído
  e avisar juntos, como no fluxo normal.

  O envio de e-mail preserva o mesmo padrão de segurança dos
  outros sistemas: reserva ("ENVIANDO…") pra evitar
  duplo-envio por duplo clique ou duas sessões, e pede
  confirmação explícita de reenvio se esse aluno já tinha
  sido avisado antes.
=====================================================*/

function montarCorpoEmailTrancamento_(primeiroNome) {

  return `${saudacaoAtual_()}, ${primeiroNome}.

Informo que sua matrícula foi trancada conforme solicitado.

Atenciosamente,
Equipe do Serviço de Graduação`;

}

function enviarEmailInstitucional_(destinatario, assunto, corpo) {
  MailApp.sendEmail(destinatario, assunto, corpo, {
    name: "Serviço de Graduação — IPUSP",
    replyTo: EMAIL_REMETENTE
  });
}

function ehReserva_(valor) {
  return String(valor || "").indexOf(PREFIXO_RESERVA) === 0;
}

// Reserva = "ENVIANDO… aaaa-mm-dd hh:mm:ss" (horário de Brasília). A
// reserva antiga, sem data (v1.0), conta como interrompida.
function reservaInterrompida_(valor) {
  const quando = String(valor || "").slice(PREFIXO_RESERVA.length).trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(quando)) return true;
  const limite = Utilities.formatDate(
    new Date(Date.now() - MINUTOS_RESERVA_ENVIO * 60 * 1000), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  return quando < limite;
}

function novaReserva_() {
  return PREFIXO_RESERVA + " " + Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function salvarPedido(registroId, versaoEsperada, dados) {

  const avisarAluno = !!(dados && dados.avisarAluno);
  const concluirSolicitacao = !!(dados && dados.concluirSolicitacao);
  const reenviar = !!(dados && dados.reenviar);

  const lock = travar_(15000);

  let valorAnterior, email, nomeCompleto, novaVersao;

  try {

    const { aba, mapa, linha } = resolverRegistroPorId_(registroId);

    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);

    if (avisarAluno) {

      const colEmailEnviado = obterOuCriarColuna_(aba, mapa, "emailEnviado");
      valorAnterior = aba.getRange(linha, colEmailEnviado).getValue();

      if (ehReserva_(valorAnterior)) {
        if (!reservaInterrompida_(valorAnterior)) {
          throw new Error("Já existe um envio em andamento para esse aluno (outra sessão pode estar processando agora). Tente de novo em instantes.");
        }
        // Execução anterior morreu no meio: não dá pra saber se o
        // e-mail chegou a sair, então pede confirmação.
        if (!reenviar) {
          throw new Error("REENVIO_NECESSARIO: Um envio anterior para esse aluno foi interrompido e não dá pra saber se o e-mail chegou a sair.");
        }
        valorAnterior = "";
      } else if (valorAnterior && !reenviar) {
        throw new Error(`REENVIO_NECESSARIO: Esse aluno já foi avisado sobre esse pedido (${valorAnterior}).`);
      }

      email = String(aba.getRange(linha, obterColuna_(mapa, "emailFormulario")).getValue() || "").trim();
      if (!email) throw new Error("Esse pedido não tem e-mail cadastrado — desmarque 'Avisar aluno' pra salvar mesmo assim.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("O e-mail desse pedido não parece válido — confira a planilha ou desmarque 'Avisar aluno'.");
      }
      nomeCompleto = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();

      aba.getRange(linha, colEmailEnviado).setValue(novaReserva_());

    }

    const colSituacao = obterColuna_(mapa, "situacao");

    if (concluirSolicitacao) {
      aba.getRange(linha, colSituacao).setValue("Concluído");
      const colDataConclusao = obterOuCriarColuna_(aba, mapa, "dataConclusao");
      aba.getRange(linha, colDataConclusao).setValue(new Date());
    } else {
      aba.getRange(linha, colSituacao).setValue("Pendente");
      // Pedido reaberto não fica com data de conclusão antiga.
      const colDataConclusao = obterColunaOpcional_(mapa, "dataConclusao");
      if (colDataConclusao) aba.getRange(linha, colDataConclusao).setValue("");
    }

    // A versão sobe já aqui: quem abriu o pedido antes desta gravação
    // não consegue salvar por cima enquanto o e-mail é enviado.
    novaVersao = incrementarVersao_(aba, mapa, linha);

  } finally {
    lock.releaseLock();
  }

  if (!avisarAluno) {
    return { sucesso: true, emailEnviado: "", versao: novaVersao, registroId: registroId };
  }

  const primeiroNome = String(nomeCompleto).trim().split(" ")[0];

  // Envio fora da trava (etapa lenta, de rede). Depois, a linha é
  // procurada de novo pelo Registro ID: a planilha pode ter sido
  // reordenada ou ganhado linhas nesse meio-tempo.
  let carimbo;
  try {
    enviarEmailInstitucional_(email, "Trancamento Total de Matrícula", montarCorpoEmailTrancamento_(primeiroNome));
    carimbo = carimboAgora_();
  } catch (err) {
    const lockErro = travar_(10000);
    try {
      const r = resolverRegistroPorId_(registroId);
      r.aba.getRange(r.linha, obterColuna_(r.mapa, "emailEnviado")).setValue(valorAnterior || "");
    } finally {
      lockErro.releaseLock();
    }
    throw err;
  }

  const lockFinal = travar_(10000);
  try {
    const r = resolverRegistroPorId_(registroId);
    r.aba.getRange(r.linha, obterColuna_(r.mapa, "emailEnviado")).setValue(carimbo);
    novaVersao = incrementarVersao_(r.aba, r.mapa, r.linha);
  } finally {
    lockFinal.releaseLock();
  }

  return { sucesso: true, emailEnviado: carimbo, versao: novaVersao, registroId: registroId };

}

/*=====================================================
  BUSCA HISTÓRICO — nome, Nº USP ou e-mail (formulário ou
  contato), na aba única (que já contém pedidos antigos e
  novos, concluídos e pendentes). Usada no topo da aba
  Concluídos. Diferente do sistema de habilitações (que tem
  uma aba antiga sem Registro ID), aqui todo registro tem
  Registro ID — então os resultados da busca são clicáveis
  e abrem o mesmo modal de detalhe/ação.
=====================================================*/

function buscarHistorico(termo) {

  const termoLimpo = String(termo || "").trim().toLowerCase().slice(0, 100);
  if (!termoLimpo) return [];
  if (termoLimpo.length < 2) throw new Error("Digite ao menos 2 caracteres pra buscar.");

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colSituacao = obterColunaOpcional_(mapa, "situacao");
  const colNome = obterColunaOpcional_(mapa, "nome");
  const colNUsp = obterColunaOpcional_(mapa, "nUsp");
  const colEmailFormulario = obterColunaOpcional_(mapa, "emailFormulario");
  const colEmailContato = obterColunaOpcional_(mapa, "emailContato");
  const colAnoIngresso = obterColunaOpcional_(mapa, "anoIngresso");
  const colCarimbo = obterColunaOpcional_(mapa, "carimbo");

  if (!colNome) return [];

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const encontrados = [];

  dados.forEach(linhaDados => {

    const nome = String(linhaDados[colNome - 1] || "");
    if (!nome) return;

    const nUsp = colNUsp ? String(linhaDados[colNUsp - 1] || "") : "";
    const emailFormulario = colEmailFormulario ? String(linhaDados[colEmailFormulario - 1] || "") : "";
    const emailContato = colEmailContato ? String(linhaDados[colEmailContato - 1] || "") : "";

    const bate = nome.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 nUsp.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 emailFormulario.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 emailContato.toLowerCase().indexOf(termoLimpo) !== -1;

    if (!bate) return;

    const situacao = colSituacao ? linhaDados[colSituacao - 1] : "";
    const carimboBruto = colCarimbo ? linhaDados[colCarimbo - 1] : "";
    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";

    encontrados.push({
      registroId: registroId,
      nome: nome,
      nUsp: nUsp,
      email: emailFormulario || emailContato,
      anoIngresso: colAnoIngresso ? linhaDados[colAnoIngresso - 1] : "",
      carimbo: formatarDataParaExibicao_(carimboBruto),
      situacao: estaConcluido_(situacao) ? "Concluído" : (String(situacao || "").trim() || "Pendente"),
      ordenacao: (carimboBruto instanceof Date ? carimboBruto.getTime() : 0)
    });

  });

  encontrados.sort((a, b) => b.ordenacao - a.ordenacao);

  return encontrados.map(r => {
    delete r.ordenacao;
    return r;
  });

}

/*=====================================================
  RELATÓRIOS — contagem total, por Ano de Ingresso do
  aluno, por ano da solicitação e por mês da solicitação.
=====================================================*/

function extrairAnoMes_(valorData) {

  let data = null;

  if (valorData instanceof Date) {
    data = valorData;
  } else if (valorData) {
    // Formatos comuns exportados pelo Forms/planilha: dd/mm/aaaa hh:mm:ss
    const texto = String(valorData).trim();
    const m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) data = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  if (!data || isNaN(data.getTime())) return null;

  return {
    ano: Utilities.formatDate(data, TIMEZONE, "yyyy"),
    anoMes: Utilities.formatDate(data, TIMEZONE, "yyyy-MM")
  };

}

function obterRelatorio() {

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  const colNome = obterColunaOpcional_(mapa, "nome");
  const colCarimbo = obterColunaOpcional_(mapa, "carimbo");
  const colAnoIngresso = obterColunaOpcional_(mapa, "anoIngresso");

  const acumuladores = { total: 0, porAnoIngresso: {}, porAno: {}, porMes: {} };

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();

  if (ultimaLinha >= 2 && colNome) {

    const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();

    dados.forEach(linhaDados => {

      const nome = linhaDados[colNome - 1];
      if (!nome) return;

      acumuladores.total++;

      const anoIngresso = colAnoIngresso ? String(linhaDados[colAnoIngresso - 1] || "").trim() : "";
      if (anoIngresso) {
        acumuladores.porAnoIngresso[anoIngresso] = (acumuladores.porAnoIngresso[anoIngresso] || 0) + 1;
      }

      const carimboBruto = colCarimbo ? linhaDados[colCarimbo - 1] : null;
      const anoMes = extrairAnoMes_(carimboBruto);
      if (anoMes) {
        acumuladores.porAno[anoMes.ano] = (acumuladores.porAno[anoMes.ano] || 0) + 1;
        acumuladores.porMes[anoMes.anoMes] = (acumuladores.porMes[anoMes.anoMes] || 0) + 1;
      }

    });

  }

  const porAnoIngressoOrdenado = Object.keys(acumuladores.porAnoIngresso).sort().reverse()
    .map(ano => ({ chave: ano, quantidade: acumuladores.porAnoIngresso[ano] }));

  const porAnoOrdenado = Object.keys(acumuladores.porAno).sort().reverse()
    .map(ano => ({ chave: ano, quantidade: acumuladores.porAno[ano] }));

  const porMesOrdenado = Object.keys(acumuladores.porMes).sort().reverse()
    .map(anoMes => ({ chave: anoMes, quantidade: acumuladores.porMes[anoMes] }));

  return {
    total: acumuladores.total,
    porAnoIngresso: porAnoIngressoOrdenado,
    porAno: porAnoOrdenado,
    porMes: porMesOrdenado
  };

}

/*=====================================================
  DIAGNÓSTICO — rode esta função direto pelo editor
  (selecione "diagnosticarPlanilha" no menu Executar, rode,
  depois abra Ver > Registros de execução, ou Ctrl+Enter)
  pra ver exatamente os cabeçalhos que o sistema está
  enxergando e quantas linhas passam em cada filtro do
  Concluídos. Não altera nada na planilha.
=====================================================*/

function diagnosticarPlanilha() {

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  Logger.log(`Planilha encontrada no ID_INDEX pela chave ${CHAVE_PLANILHA}.`);
  Logger.log("Nome da aba usada (primeira aba da planilha): " + aba.getName());
  Logger.log("Cabeçalhos encontrados na linha 1 (nome -> coluna): " + JSON.stringify(mapa));
  Logger.log("Chaves esperadas pelo sistema (CABECALHOS): " + JSON.stringify(CABECALHOS));

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  Logger.log(`Última linha: ${ultimaLinha} | Última coluna: ${ultimaColuna}`);

  if (ultimaLinha < 2) {
    Logger.log("Planilha sem linhas de dados (só cabeçalho).");
    return;
  }

  const colSituacao = obterColunaOpcional_(mapa, "situacao");
  const colNome = obterColunaOpcional_(mapa, "nome");
  const colRegistroId = obterColunaOpcional_(mapa, "registroId");

  if (!colSituacao || !colNome) {
    Logger.log("ATENÇÃO: não encontrei a coluna 'Situação' e/ou 'Nome Completo' pelo nome do cabeçalho. Confira acima se o texto bate exatamente (acentos, maiúsculas, espaços extras).");
    return;
  }

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();

  let comNome = 0, concluidosPelaSituacao = 0, comRegistroId = 0;
  const amostraSituacoes = new Set();

  dados.forEach((linhaDados, indice) => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;
    comNome++;

    const situacaoBruta = linhaDados[colSituacao - 1];
    amostraSituacoes.add(JSON.stringify(situacaoBruta));

    if (!estaConcluido_(situacaoBruta)) return;
    concluidosPelaSituacao++;

    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (registroId) {
      comRegistroId++;
    } else {
      Logger.log(`Linha ${indice + 2}: situação concluída mas SEM Registro ID.`);
    }

  });

  Logger.log(`Total de linhas com nome: ${comNome}`);
  Logger.log(`Valores distintos encontrados na coluna Situação: ${Array.from(amostraSituacoes).join(" | ")}`);
  Logger.log(`Linhas reconhecidas como concluídas (contém "conclu"): ${concluidosPelaSituacao}`);
  Logger.log(`Dessas, quantas têm Registro ID preenchido: ${comRegistroId}`);

}

