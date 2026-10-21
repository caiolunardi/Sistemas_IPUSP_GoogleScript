/*=====================================================
  GERENCIADOR DE ABERTURA DE HABILITAÇÕES — V1.0
  Backend Apps Script (projeto autônomo)

  Segue o mesmo padrão de hardening do sistema de
  Emissão de Diplomas (LockService, Registro ID + Versão
  para concorrência otimista, mapeamento de cabeçalhos
  por nome, sanitização central de entrada).

  CONFIGURAÇÃO OBRIGATÓRIA:

  1) ID_PLANILHA — já preenchido com a planilha de
     respostas do formulário de abertura de programas.

  Estrutura da aba "Respostas ao formulário 2" (conforme
  print enviado): colunas A a I vêm do Google Forms e são
  lidas pelo NOME do cabeçalho (linha 1). As colunas J
  (Observações) e K (Situação) são usadas por POSIÇÃO fixa,
  por instrução explícita — não dependem do texto do
  cabeçalho. Colunas novas (Data de Conclusão, Registro ID,
  Versão, E-mail Enviado) são criadas automaticamente no
  final da planilha na primeira execução, se não existirem.

  A aba "2021 - 2022" é só-leitura (consulta/relatório) —
  nunca é escrita por este sistema. O layout dela é
  detectado de forma flexível (por palavras-chave no
  cabeçalho), já que pode não ter exatamente as mesmas
  colunas da aba atual.
=====================================================*/

const ID_PLANILHA = "CONFIGURAR_ID_DA_PLANILHA_DE_RESPOSTAS"; // sanitizado: o ID real foi retirado

const ABA_ATUAL = "Respostas ao formulário 2";
const ABA_ANTIGA = "2021 - 2022";

// Mesmo endereço institucional do sistema de Diplomas.
const EMAIL_REMETENTE = "gradip@usp.br";

const TIMEZONE = "America/Sao_Paulo";

// Posições fixas (1-based) das colunas J e K na aba atual —
// por instrução explícita, independente do texto do cabeçalho.
const COL_OBSERVACOES_FIXA = 10; // J
const COL_SITUACAO_FIXA = 11;    // K

const CABECALHOS = {
  carimbo: "Carimbo de data/hora",
  emailFormulario: "Endereço de e-mail",
  nUsp: "Nº USP",
  nome: "Nome",
  email: "E-mail USP",
  anoIngresso: "Ano de ingresso",
  trancamento: "Realizou trancamento total de matrícula em algum semestre?",
  habilitacao: "Deseja solicitar a abertura de qual programa?",
  dataConclusao: "Data de Conclusão",
  registroId: "Registro ID",
  versao: "Versão",
  emailEnviado: "E-mail Enviado"
};

const HABILITACOES_CONHECIDAS = ["Bacharelado em Psicologia", "Licenciatura em Psicologia"];

/*=====================================================
  SERVE A PÁGINA
=====================================================*/

function doGet(e) {

  try {
    migrarParaRegistroId_();
  } catch (err) {
    Logger.log("Falha na migração automática de Registro ID: " + err);
  }

  return HtmlService.createTemplateFromFile("GerenciadorApp")
    .evaluate()
    .setTitle("Gerenciador de Abertura de Habilitações")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  PLANILHA / ABAS / CABEÇALHOS
=====================================================*/

function obterPlanilha_() {
  return SpreadsheetApp.openById(ID_PLANILHA);
}

function obterAbaAtual_() {
  const aba = obterPlanilha_().getSheetByName(ABA_ATUAL);
  if (!aba) throw new Error(`Aba "${ABA_ATUAL}" não encontrada na planilha.`);
  return aba;
}

// A aba antiga é só-leitura e opcional — se não existir (ou for
// renomeada), o sistema continua funcionando só com a aba atual.
function obterAbaAntiga_() {
  return obterPlanilha_().getSheetByName(ABA_ANTIGA);
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
      `Não encontrei a coluna "${nomeEsperado}" na aba "${ABA_ATUAL}". ` +
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

// Busca flexível de coluna por palavra-chave no cabeçalho — usada
// só para a aba ANTIGA, cujo layout exato não é garantido.
function localizarColunaPorPalavraChave_(mapaCabecalhos, palavrasChave) {

  const chaves = Object.keys(mapaCabecalhos);

  for (let i = 0; i < chaves.length; i++) {
    const tituloLower = chaves[i].toLowerCase();
    if (palavrasChave.some(p => tituloLower.indexOf(p) !== -1)) {
      return mapaCabecalhos[chaves[i]];
    }
  }

  return null;

}

/*=====================================================
  REGISTRO ID (UUID) + VERSÃO — mesmo padrão do sistema
  de Diplomas, aplicado só à aba ATUAL (a aba antiga não
  é editável por este sistema, então não precisa disso).
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

  const abaChecagem = obterAbaAtual_();
  const mapaChecagem = mapearCabecalhos_(abaChecagem);

  if (!precisaMigrar_(abaChecagem, mapaChecagem)) {
    return { alteradas: 0, duplicatasCorrigidas: 0 };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAbaAtual_();
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
    // Terceiro contador (BUG #3, ver sistema de Trancamento Parcial):
    // rastreia quando SÓ a Versão precisou de conserto (Registro ID
    // já estava OK). Sem isso, esse caso não incrementava
    // `alteradas` nem `duplicatasCorrigidas`, e a condição de
    // gravação abaixo nunca era satisfeita — a correção da Versão
    // ficava só em memória e se perdia ao fim da execução, repetindo-
    // se (sem nunca gravar) em toda chamada futura de doGet().
    let versoesCorrigidas = 0;

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
        Logger.log(`Registro ID duplicado corrigido na linha ${i + 2} (nome: ${nome}). Novo ID: ${novoId}`);
      } else {
        vistos.add(idAtual);
      }

      const versaoAtual = dados[i][colVersao - 1];
      if (!versaoAtual || isNaN(Number(versaoAtual))) {
        dados[i][colVersao - 1] = 1;
        versoesCorrigidas++;
      }

    }

    if (alteradas > 0 || duplicatasCorrigidas > 0 || versoesCorrigidas > 0) {
      // Escreve só as colunas Registro ID e Versão (cada uma numa
      // chamada setValues() estreita), em vez de reescrever o
      // retângulo inteiro — protege contra apagar fórmulas que
      // porventura existam entre as colunas Nome e Registro ID.
      const colunaRegistroIdValores = dados.map(linhaDado => [linhaDado[colRegistroId - 1]]);
      const colunaVersaoValores = dados.map(linhaDado => [linhaDado[colVersao - 1]]);
      aba.getRange(2, colRegistroId, dados.length, 1).setValues(colunaRegistroIdValores);
      aba.getRange(2, colVersao, dados.length, 1).setValues(colunaVersaoValores);
    }

    return { alteradas: alteradas, duplicatasCorrigidas: duplicatasCorrigidas, versoesCorrigidas: versoesCorrigidas };

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
  const aba = obterAbaAtual_();
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

function executarMutacao_(registroId, versaoEsperada, funcaoMutacao) {

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const aba = obterAbaAtual_();
    const mapa = mapearCabecalhos_(aba);
    const linha = localizarLinhaPorId_(aba, mapa, registroId);

    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);

    const resultadoParcial = funcaoMutacao(aba, mapa, linha) || {};
    const novaVersao = incrementarVersao_(aba, mapa, linha);

    return Object.assign({ sucesso: true, registroId: registroId, versao: novaVersao }, resultadoParcial);

  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  VALIDAÇÃO / NORMALIZAÇÃO
=====================================================*/

function sanitizarTextoPlano_(valor) {
  let texto = (valor === null || valor === undefined) ? "" : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  texto = texto.trim();
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto.slice(0, 2000);
}

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

// Converte qualquer valor lido de getValues()/getValue() num texto
// simples e seguro pra devolver ao cliente — nunca null, nunca
// undefined, nunca um tipo especial que o Sheets eventualmente
// devolva pra uma célula. Usar sempre que um campo de TEXTO (não
// data — pra data, usar formatarDataParaExibicao_) for incluído num
// objeto de retorno pro front-end.
function textoSeguro_(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

// Converte um valor de data/hora (Date real OU texto no formato
// "dd/mm/aaaa" ou "dd/mm/aaaa hh:mm[:ss]") num timestamp numérico,
// pra uso em ORDENAÇÃO ("mais recente primeiro"). Reconhece também
// carimbo/data gravados como texto (comum em linhas antigas), em vez
// de cair em 0 e bagunçar a ordem de "mais recentes primeiro".
// Devolve 0 se não conseguir interpretar de jeito nenhum, sem lançar
// erro — a linha cai pro fim da ordenação nesse caso.
function timestampSeguro_(valor) {

  if (valor instanceof Date) {
    return valor.getTime();
  }

  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

  if (!m) return 0;

  return new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4] || 0),
    Number(m[5] || 0),
    Number(m[6] || 0)
  ).getTime();

}

/*=====================================================
  LISTAS: PENDENTES / CONCLUÍDOS (aba atual)
=====================================================*/

function obterPendentes() {

  const aba = obterAbaAtual_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colEmail = obterColuna_(mapa, "email");
  const colHabilitacao = obterColuna_(mapa, "habilitacao");
  const colCarimbo = obterColuna_(mapa, "carimbo");

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const pendentes = [];

  dados.forEach((linhaDados, indice) => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;

    const situacao = linhaDados[COL_SITUACAO_FIXA - 1];
    if (estaConcluido_(situacao)) return;

    // BUG #2 (ver Trancamento Parcial): antes, uma linha pendente
    // sem Registro ID era descartada aqui com `return` — sumia da
    // lista sem deixar rastro. Agora ela continua sendo incluída (só
    // sem ação disponível no front-end, até a próxima migração
    // automática atribuir um ID). O log ajuda a perceber quando isso
    // acontece, sem esconder o pedido da equipe.
    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (!registroId) {
      Logger.log(`Linha ${indice + 2} (${nome}) sem Registro ID — listada, mas sem ação disponível até a próxima migração.`);
    }

    pendentes.push({
      registroId: registroId,
      versao: colVersao ? (Number(linhaDados[colVersao - 1]) || 1) : 1,
      nome: textoSeguro_(nome),
      nUsp: textoSeguro_(linhaDados[colNUsp - 1]),
      email: textoSeguro_(linhaDados[colEmail - 1]),
      habilitacao: textoSeguro_(linhaDados[colHabilitacao - 1]),
      carimbo: formatarDataParaExibicao_(linhaDados[colCarimbo - 1]),
      observacoes: textoSeguro_(linhaDados[COL_OBSERVACOES_FIXA - 1])
    });

  });

  pendentes.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  return pendentes;

}

// Últimos 10 concluídos da aba ATUAL, mais recentes primeiro
// (por Data de Conclusão; se ausente, usa o carimbo original).
function obterConcluidosRecentes() {

  const aba = obterAbaAtual_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colEmail = obterColuna_(mapa, "email");
  const colHabilitacao = obterColuna_(mapa, "habilitacao");
  const colCarimbo = obterColuna_(mapa, "carimbo");
  const colDataConclusao = obterColunaOpcional_(mapa, "dataConclusao");
  const colEmailEnviado = obterColunaOpcional_(mapa, "emailEnviado");

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const concluidos = [];

  // Contadores de diagnóstico — aparecem no Registro de execução
  // (Extensões > Apps Script > Execuções). Primeiro lugar a olhar se
  // "Concluídos" voltar a aparecer vazio/errado num sistema irmão:
  // ajuda a saber se o problema é no FILTRO (poucas linhas passam)
  // ou na SERIALIZAÇÃO (linhas passam, mas o cliente recebe null).
  let totalComNome = 0;
  let totalConcluidoPelaSituacao = 0;
  let totalSemRegistroId = 0;

  dados.forEach(linhaDados => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;
    totalComNome++;

    const situacao = linhaDados[COL_SITUACAO_FIXA - 1];
    if (!estaConcluido_(situacao)) return;
    totalConcluidoPelaSituacao++;

    // BUG #2 corrigido: antes havia um `if (!registroId) return;`
    // aqui, que descartava silenciosamente qualquer concluído sem
    // Registro ID. Agora a linha continua sendo incluída (só sem
    // Registro ID = sem link pro modal de detalhe no front-end).
    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (!registroId) totalSemRegistroId++;

    const dataConclusaoBruta = colDataConclusao ? linhaDados[colDataConclusao - 1] : "";
    const carimboBruto = linhaDados[colCarimbo - 1];

    concluidos.push({
      registroId: registroId,
      versao: colVersao ? (Number(linhaDados[colVersao - 1]) || 1) : 1,
      nome: textoSeguro_(nome),
      nUsp: textoSeguro_(linhaDados[colNUsp - 1]),
      email: textoSeguro_(linhaDados[colEmail - 1]),
      habilitacao: textoSeguro_(linhaDados[colHabilitacao - 1]),
      carimbo: formatarDataParaExibicao_(carimboBruto),
      dataConclusao: formatarDataParaExibicao_(dataConclusaoBruta) || formatarDataParaExibicao_(carimboBruto),
      // BUG #1 (causa raiz): este campo pode ter sido gravado como
      // TEXTO (versões antigas de salvarPedido()) e, mais tarde,
      // convertido AUTOMATICAMENTE pelo Google Sheets pra um objeto
      // Date real (o Sheets "adivinha" que um texto parece uma data
      // e converte sozinho). Um Date cru dentro do array devolvido
      // por uma função chamada via google.script.run quebra a
      // serialização INTEIRA da resposta pro navegador — de forma
      // totalmente silenciosa (o servidor termina normal, mas o
      // withSuccessHandler recebe `null`). formatarDataParaExibicao_
      // trata os dois casos (Date real OU texto) e sempre devolve
      // string — nunca mais devolver este campo cru.
      emailEnviado: colEmailEnviado ? formatarDataParaExibicao_(linhaDados[colEmailEnviado - 1]) : "",
      observacoes: textoSeguro_(linhaDados[COL_OBSERVACOES_FIXA - 1]),
      // Campo auxiliar só pra ordenação — removido antes do return.
      // timestampSeguro_ reconhece Date real E texto (comum em
      // linhas antigas), em vez de cair em 0 e bagunçar a ordem.
      ordenacao: timestampSeguro_(dataConclusaoBruta) || timestampSeguro_(carimboBruto)
    });

  });

  Logger.log(
    `obterConcluidosRecentes: linhas com nome=${totalComNome}, com situação concluída=${totalConcluidoPelaSituacao}, ` +
    `dessas sem Registro ID=${totalSemRegistroId}, retornados (após limite de 10)=${Math.min(concluidos.length, 10)}`
  );

  concluidos.sort((a, b) => b.ordenacao - a.ordenacao);

  const resultadoFinal = concluidos.slice(0, 10).map(c => {
    delete c.ordenacao;
    return c;
  });

  // Blindagem final: força tudo a passar por um ciclo JSON puro antes
  // de sair do servidor — segunda camada de defesa (a principal
  // continua sendo tratar cada campo explicitamente acima) contra
  // qualquer outro valor "não primitivo" que ainda escape.
  try {
    return JSON.parse(JSON.stringify(resultadoFinal));
  } catch (errNormalizacao) {
    Logger.log("FALHA ao normalizar resultadoFinal via JSON: " + errNormalizacao);
    throw new Error("Erro ao preparar a lista de concluídos — avise o suporte técnico (falha de serialização).");
  }

}

function formatarDataParaExibicao_(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy HH:mm");
  }
  return String(valor);
}

/*=====================================================
  DETALHE DE UM PEDIDO (aba atual — pra abrir o card)
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

  const situacaoValor = dados[COL_SITUACAO_FIXA - 1];

  const detalhe = {
    registroId: registroId,
    versao: lerVersao_(aba, mapa, linha),
    nome: textoSeguro_(pegar("nome")),
    nUsp: textoSeguro_(pegar("nUsp")),
    email: textoSeguro_(pegar("email")),
    emailFormulario: textoSeguro_(pegarOpcional("emailFormulario")),
    anoIngresso: textoSeguro_(pegarOpcional("anoIngresso")),
    trancamento: textoSeguro_(pegarOpcional("trancamento")),
    habilitacao: textoSeguro_(pegar("habilitacao")),
    carimbo: formatarDataParaExibicao_(pegar("carimbo")),
    situacao: textoSeguro_(situacaoValor),
    concluido: estaConcluido_(situacaoValor),
    observacoes: textoSeguro_(dados[COL_OBSERVACOES_FIXA - 1]),
    dataConclusao: formatarDataParaExibicao_(pegarOpcional("dataConclusao")),
    emailEnviado: (() => {
      const v = pegarOpcional("emailEnviado");
      // "ENVIANDO…" é um marcador interno usado enquanto um e-mail
      // está sendo despachado — não deve ser mostrado como
      // confirmação de envio.
      if (v === "ENVIANDO…") return "";
      // Mesma correção do BUG #1 aplicada aqui: esta é justamente a
      // função onde o bug se manifestava como "o modal simplesmente
      // não abre" (sem erro visível), porque um Date cru neste campo
      // quebra a resposta inteira do google.script.run.
      return formatarDataParaExibicao_(v);
    })()
  };

  // Blindagem final (mesma defesa de obterConcluidosRecentes).
  try {
    return JSON.parse(JSON.stringify(detalhe));
  } catch (errNormalizacao) {
    Logger.log("FALHA ao normalizar detalhe via JSON: " + errNormalizacao);
    throw new Error("Erro ao preparar o detalhe do pedido — avise o suporte técnico (falha de serialização).");
  }

}

/*=====================================================
  SALVAR PEDIDO — ação única do modal: grava Observações
  (coluna J) e, conforme os dois checkboxes marcados na
  tela, conclui a solicitação (coluna K + Data de
  Conclusão) e/ou avisa o aluno por e-mail. As duas coisas
  são independentes — dá pra concluir um pedido antigo sem
  mandar e-mail (ex: pedidos de antes deste sistema
  existir), ou marcar como concluído e avisar juntos, como
  no fluxo normal.

  O envio de e-mail preserva o mesmo padrão de segurança
  do sistema de Diplomas: reserva ("ENVIANDO…") pra evitar
  duplo-envio por duplo clique ou duas sessões, e pede
  confirmação explícita de reenvio se esse aluno já tinha
  sido avisado antes.
=====================================================*/

function montarCorpoEmailAbertura_(primeiroNome, habilitacaoTexto) {

  return `${saudacaoAtual_()}, ${primeiroNome}.

Informo que sua habilitação de ${habilitacaoTexto} foi aberta conforme solicitado.

Atenciosamente,
Equipe do Serviço de Graduação`;

}

function enviarEmailInstitucional_(destinatario, assunto, corpo) {
  MailApp.sendEmail(destinatario, assunto, corpo, {
    name: "Serviço de Graduação — IPUSP",
    replyTo: EMAIL_REMETENTE
  });
}

// ---------------------------------------------------------------
// CONCORRÊNCIA — corrigido pra fechar a mesma janela de corrida já
// encontrada e corrigida no sistema de Trancamento Parcial:
//
// ANTES: a Versão era conferida e os dados eram gravados sob o lock
// principal, mas o INCREMENTO da Versão só acontecia depois, num
// lock separado (às vezes só depois de enviar um e-mail, que é
// lento). Isso abria uma janela: entre a Sessão A liberar o primeiro
// lock e conseguir incrementar a Versão, uma Sessão B podia pegar o
// lock, ler a MESMA Versão antiga e passar pela checagem também — as
// duas gravações eram aceitas, uma sobrescrevendo a outra sem erro
// de conflito nenhum.
//
// DEPOIS: checagem de versão + todas as gravações (observações,
// situação, reserva de e-mail) + o INCREMENTO da versão acontecem
// dentro do MESMO lock, sem nenhuma etapa lenta (rede) no meio. O
// envio de e-mail em si continua fora deste lock — mas como a versão
// já sobe antes de liberar o lock, não existe mais janela de corrida.
//
// CONSEQUÊNCIA: como a versão sobe ANTES da tentativa de e-mail, uma
// falha de e-mail DEPOIS desse ponto precisa avisar o cliente sobre
// a versão nova — ver o marcador PEDIDO_SALVO_EMAIL_FALHOU abaixo.
// ---------------------------------------------------------------
function salvarPedido(registroId, versaoEsperada, dados) {

  const avisarAluno = !!(dados && dados.avisarAluno);
  const concluirSolicitacao = !!(dados && dados.concluirSolicitacao);
  const reenviar = !!(dados && dados.reenviar);
  const observacoes = (dados && dados.observacoes) || "";

  let colEmailEnviado, valorAnterior, novaVersaoPrincipal;
  // primeiroNome/enderecoEmail são capturados AINDA dentro do lock
  // principal, como texto simples — não dependem do número de linha
  // continuar estável depois do envio do e-mail (uma chamada de rede
  // lenta, durante a qual a planilha poderia, em tese, ser
  // reorganizada manualmente).
  let primeiroNome, enderecoEmail;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const resolvido = resolverRegistroPorId_(registroId);
    const aba = resolvido.aba, mapa = resolvido.mapa, linha = resolvido.linha;

    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);

    aba.getRange(linha, COL_OBSERVACOES_FIXA).setValue(sanitizarTextoPlano_(observacoes));

    if (avisarAluno) {

      colEmailEnviado = obterOuCriarColuna_(aba, mapa, "emailEnviado");
      valorAnterior = aba.getRange(linha, colEmailEnviado).getValue();

      if (valorAnterior === "ENVIANDO…") {
        throw new Error("Já existe um envio em andamento para esse aluno (outra sessão pode estar processando agora). Tente de novo em instantes.");
      }
      if (valorAnterior && !reenviar) {
        // formatarDataParaExibicao_ em vez de interpolar valorAnterior
        // cru — "E-mail Enviado" pode ser um Date de verdade, e um
        // Date interpolado direto num template string vira o texto
        // bruto do toString() do JavaScript.
        throw new Error(`REENVIO_NECESSARIO: Esse aluno já foi avisado sobre esse pedido (${formatarDataParaExibicao_(valorAnterior)}).`);
      }

      enderecoEmail = textoSeguro_(aba.getRange(linha, obterColuna_(mapa, "email")).getValue());
      if (!enderecoEmail) throw new Error("Esse pedido não tem e-mail cadastrado — desmarque 'Avisar aluno' pra salvar mesmo assim.");

      const nomeCompletoBruto = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
      primeiroNome = textoSeguro_(nomeCompletoBruto).trim().split(" ")[0];

      aba.getRange(linha, colEmailEnviado).setValue("ENVIANDO…");

    }

    if (concluirSolicitacao) {
      aba.getRange(linha, COL_SITUACAO_FIXA).setValue("Concluído");
      const colDataConclusao = obterOuCriarColuna_(aba, mapa, "dataConclusao");
      aba.getRange(linha, colDataConclusao).setValue(new Date());
    } else {
      aba.getRange(linha, COL_SITUACAO_FIXA).setValue("pendente");
    }

    // Corrigido: o incremento da versão acontece AQUI, ainda dentro
    // do mesmo lock que conferiu a versão e gravou os dados — não
    // depois, num lock separado. Isso é o que fecha a janela de
    // corrida descrita acima.
    novaVersaoPrincipal = incrementarVersao_(aba, mapa, linha);

  } finally {
    lock.releaseLock();
  }

  // Sem e-mail pra mandar: já terminou — a versão já foi incrementada
  // atomicamente acima, junto com os outros dados.
  if (!avisarAluno) {
    return { sucesso: true, emailEnviado: "", versao: novaVersaoPrincipal, registroId: registroId };
  }

  // A partir daqui, FORA do lock principal — a rede (MailApp) pode
  // demorar, e não queremos segurar outras operações da equipe
  // esperando por isso. A reserva "ENVIANDO…" já protege contra um
  // segundo envio concorrente pro mesmo aluno.
  const habilitacaoTexto = textoSeguro_(aba_habilitacaoTexto_(registroId));

  let carimbo;
  try {
    enviarEmailInstitucional_(enderecoEmail, "Abertura de Habilitação", montarCorpoEmailAbertura_(primeiroNome, habilitacaoTexto));
    // Grava um Date DE VERDADE em vez de texto pré-formatado — essa
    // era a raiz do BUG #1 (ver comentário completo em
    // obterConcluidosRecentes). Gravando sempre um Date de verdade
    // aqui, a coluna passa a ter sempre o MESMO tipo, e
    // formatarDataParaExibicao_() (chamada em toda leitura desta
    // coluna) sempre formata corretamente na saída.
    carimbo = new Date();
  } catch (err) {

    // Resolve a linha DE NOVO pelo Registro ID (nunca reutiliza o
    // número de linha capturado antes do envio do e-mail) — protege
    // contra o caso raro de a planilha ter sido reorganizada
    // manualmente durante a espera pela rede.
    try {
      const lockErro = LockService.getScriptLock();
      lockErro.waitLock(10000);
      try {
        const reResolvido = resolverRegistroPorId_(registroId);
        const colEmailErro = obterColunaOpcional_(reResolvido.mapa, "emailEnviado") || colEmailEnviado;
        reResolvido.aba.getRange(reResolvido.linha, colEmailErro).setValue(valorAnterior || "");
      } finally {
        lockErro.releaseLock();
      }
    } catch (errRestauracao) {
      Logger.log("Falha ao desfazer a reserva 'ENVIANDO…' após erro de e-mail: " + errRestauracao);
    }

    // O pedido (situação, observações, versão) JÁ foi salvo com
    // sucesso no bloco atômico acima — só o e-mail falhou. Se
    // simplesmente relançássemos o erro original, o navegador
    // continuaria com a Versão ANTIGA em memória; uma tentativa
    // seguinte de salvar esse MESMO pedido enviaria essa versão
    // desatualizada e receberia um falso "outra sessão alterou este
    // pedido". O marcador abaixo carrega a versão nova pro front-end
    // atualizar seu estado antes de deixar tentar de novo.
    throw new Error(
      `PEDIDO_SALVO_EMAIL_FALHOU:${novaVersaoPrincipal}:O pedido foi salvo normalmente, mas o e-mail não pôde ser enviado (${err && err.message ? err.message : err}).`
    );

  }

  // Segunda gravação, independente da primeira: confirma o envio
  // (substituindo "ENVIANDO…") e incrementa a versão de novo — assim
  // qualquer sessão que tenha lido esse pedido nesse meio-tempo
  // percebe que algo mudou se tentar salvar depois. Não precisa
  // reconferir versaoEsperada aqui: esta escrita é protegida pela
  // reserva "ENVIANDO…", não pelo número de versão.
  const lockFinal = LockService.getScriptLock();
  lockFinal.waitLock(10000);
  let novaVersaoFinal;
  try {
    const reResolvido = resolverRegistroPorId_(registroId);
    const colEmailFinalColuna = obterOuCriarColuna_(reResolvido.aba, reResolvido.mapa, "emailEnviado");
    reResolvido.aba.getRange(reResolvido.linha, colEmailFinalColuna).setValue(carimbo);
    novaVersaoFinal = incrementarVersao_(reResolvido.aba, reResolvido.mapa, reResolvido.linha);
  } finally {
    lockFinal.releaseLock();
  }

  return { sucesso: true, emailEnviado: formatarDataParaExibicao_(carimbo), versao: novaVersaoFinal, registroId: registroId };

}

// Lê a habilitação solicitada pra montar o corpo do e-mail — chamada
// FORA do lock principal (só depois dele ser liberado), então
// resolve a linha de novo pelo Registro ID em vez de depender de um
// número de linha capturado antes de qualquer espera.
function aba_habilitacaoTexto_(registroId) {
  const resolvido = resolverRegistroPorId_(registroId);
  return resolvido.aba.getRange(resolvido.linha, obterColuna_(resolvido.mapa, "habilitacao")).getValue();
}

/*=====================================================
  BUSCA HISTÓRICO — nome, Nº USP ou e-mail, nas DUAS abas
  (atual + antiga). Usada no topo da aba Concluídos.
=====================================================*/

function buscarHistorico(termo) {

  const termoLimpo = String(termo || "").trim().toLowerCase();
  if (!termoLimpo) return [];
  if (termoLimpo.length < 2) throw new Error("Digite ao menos 2 caracteres pra buscar.");

  const resultados = [];

  resultados.push(...buscarNaAba_(obterAbaAtual_(), termoLimpo, "Atual"));

  const abaAntiga = obterAbaAntiga_();
  if (abaAntiga) {
    resultados.push(...buscarNaAbaAntiga_(abaAntiga, termoLimpo));
  }

  resultados.sort((a, b) => b.ordenacao - a.ordenacao);

  return resultados.map(r => {
    delete r.ordenacao;
    return r;
  });

}

function buscarNaAba_(aba, termoLimpo, origem) {

  const mapa = mapearCabecalhos_(aba);

  const colNome = obterColunaOpcional_(mapa, "nome");
  const colNUsp = obterColunaOpcional_(mapa, "nUsp");
  const colEmail = obterColunaOpcional_(mapa, "email");
  const colHabilitacao = obterColunaOpcional_(mapa, "habilitacao");
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
    const email = colEmail ? String(linhaDados[colEmail - 1] || "") : "";

    const bate = nome.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 nUsp.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 email.toLowerCase().indexOf(termoLimpo) !== -1;

    if (!bate) return;

    const situacao = linhaDados[COL_SITUACAO_FIXA - 1];
    const carimboBruto = colCarimbo ? linhaDados[colCarimbo - 1] : "";

    encontrados.push({
      origem: origem,
      nome: nome,
      nUsp: nUsp,
      email: email,
      habilitacao: colHabilitacao ? linhaDados[colHabilitacao - 1] : "",
      carimbo: formatarDataParaExibicao_(carimboBruto),
      situacao: estaConcluido_(situacao) ? "Concluído" : (String(situacao || "").trim() || "Pendente"),
      ordenacao: (carimboBruto instanceof Date ? carimboBruto.getTime() : 0)
    });

  });

  return encontrados;

}

// Igual a buscarNaAba_, mas com localização de coluna por
// palavra-chave (layout da aba antiga não é garantido).
function buscarNaAbaAntiga_(aba, termoLimpo) {

  const mapa = mapearCabecalhos_(aba);

  const colNome = localizarColunaPorPalavraChave_(mapa, ["nome"]);
  const colNUsp = localizarColunaPorPalavraChave_(mapa, ["usp"]);
  const colEmail = localizarColunaPorPalavraChave_(mapa, ["e-mail usp", "email usp"]) ||
                    localizarColunaPorPalavraChave_(mapa, ["e-mail", "email"]);
  const colHabilitacao = localizarColunaPorPalavraChave_(mapa, ["programa", "habilita"]);
  const colCarimbo = localizarColunaPorPalavraChave_(mapa, ["carimbo", "data"]);

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
    const email = colEmail ? String(linhaDados[colEmail - 1] || "") : "";

    const bate = nome.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 nUsp.toLowerCase().indexOf(termoLimpo) !== -1 ||
                 email.toLowerCase().indexOf(termoLimpo) !== -1;

    if (!bate) return;

    const carimboBruto = colCarimbo ? linhaDados[colCarimbo - 1] : "";

    encontrados.push({
      origem: "Histórico (2021-2022)",
      nome: nome,
      nUsp: nUsp,
      email: email,
      habilitacao: colHabilitacao ? linhaDados[colHabilitacao - 1] : "",
      carimbo: formatarDataParaExibicao_(carimboBruto),
      situacao: "Concluído",
      ordenacao: (carimboBruto instanceof Date ? carimboBruto.getTime() : 0)
    });

  });

  return encontrados;

}

/*=====================================================
  RELATÓRIOS — contagem por habilitação, por ano e por
  mês, combinando as duas abas.
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

function contarLinhasParaRelatorio_(aba, colCarimbo, colHabilitacao, colNome, acumuladores) {

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || !colNome) return;

  const numColunas = Math.max(colCarimbo || 1, colHabilitacao || 1, colNome, ultimaColuna);
  const dados = aba.getRange(2, 1, ultimaLinha - 1, Math.min(numColunas, ultimaColuna)).getValues();

  dados.forEach(linhaDados => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;

    acumuladores.total++;

    const habilitacaoTexto = colHabilitacao ? String(linhaDados[colHabilitacao - 1] || "") : "";
    // O campo pode conter mais de uma habilitação (ex: checkbox
    // múltiplo); cada uma marcada conta separadamente no relatório.
    HABILITACOES_CONHECIDAS.forEach(hab => {
      if (habilitacaoTexto.indexOf(hab) !== -1) {
        acumuladores.porHabilitacao[hab] = (acumuladores.porHabilitacao[hab] || 0) + 1;
      }
    });
    if (habilitacaoTexto && !HABILITACOES_CONHECIDAS.some(hab => habilitacaoTexto.indexOf(hab) !== -1)) {
      acumuladores.porHabilitacao["Outro / não identificado"] =
        (acumuladores.porHabilitacao["Outro / não identificado"] || 0) + 1;
    }

    const carimboBruto = colCarimbo ? linhaDados[colCarimbo - 1] : null;
    const anoMes = extrairAnoMes_(carimboBruto);
    if (anoMes) {
      acumuladores.porAno[anoMes.ano] = (acumuladores.porAno[anoMes.ano] || 0) + 1;
      acumuladores.porMes[anoMes.anoMes] = (acumuladores.porMes[anoMes.anoMes] || 0) + 1;
    }

  });

}

function obterRelatorio() {

  const acumuladores = { total: 0, porHabilitacao: {}, porAno: {}, porMes: {} };

  const abaAtual = obterAbaAtual_();
  const mapaAtual = mapearCabecalhos_(abaAtual);
  contarLinhasParaRelatorio_(
    abaAtual,
    obterColunaOpcional_(mapaAtual, "carimbo"),
    obterColunaOpcional_(mapaAtual, "habilitacao"),
    obterColunaOpcional_(mapaAtual, "nome"),
    acumuladores
  );

  const abaAntiga = obterAbaAntiga_();
  if (abaAntiga) {
    const mapaAntiga = mapearCabecalhos_(abaAntiga);
    contarLinhasParaRelatorio_(
      abaAntiga,
      localizarColunaPorPalavraChave_(mapaAntiga, ["carimbo", "data"]),
      localizarColunaPorPalavraChave_(mapaAntiga, ["programa", "habilita"]),
      localizarColunaPorPalavraChave_(mapaAntiga, ["nome"]),
      acumuladores
    );
  }

  const porAnoOrdenado = Object.keys(acumuladores.porAno).sort().reverse()
    .map(ano => ({ chave: ano, quantidade: acumuladores.porAno[ano] }));

  const porMesOrdenado = Object.keys(acumuladores.porMes).sort().reverse()
    .map(anoMes => ({ chave: anoMes, quantidade: acumuladores.porMes[anoMes] }));

  const porHabilitacaoOrdenado = Object.keys(acumuladores.porHabilitacao)
    .sort((a, b) => acumuladores.porHabilitacao[b] - acumuladores.porHabilitacao[a])
    .map(hab => ({ chave: hab, quantidade: acumuladores.porHabilitacao[hab] }));

  return {
    total: acumuladores.total,
    porHabilitacao: porHabilitacaoOrdenado,
    porAno: porAnoOrdenado,
    porMes: porMesOrdenado
  };

}

/*=====================================================
  DIAGNÓSTICO — rode direto pelo editor (selecione
  "diagnosticarPlanilha" no menu Executar, rode, depois
  Ver > Registros de execução) pra ver os valores distintos
  da coluna Situação e quantas linhas passam em cada filtro
  do Concluídos, sem precisar abrir o navegador. Não altera
  nada na planilha. Só cobre a aba ATUAL (a antiga é só
  consulta/relatório, menos sensível a este tipo de bug).
=====================================================*/

function diagnosticarPlanilha() {

  const aba = obterAbaAtual_();
  const mapa = mapearCabecalhos_(aba);

  Logger.log("Aba usada: " + aba.getName());
  Logger.log("Cabeçalhos encontrados (nome -> coluna): " + JSON.stringify(mapa));

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  Logger.log(`Última linha: ${ultimaLinha} | Última coluna: ${ultimaColuna}`);

  if (ultimaLinha < 2) {
    Logger.log("Planilha sem linhas de dados (só cabeçalho).");
    return;
  }

  const colNome = obterColunaOpcional_(mapa, "nome");
  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colEmailEnviado = obterColunaOpcional_(mapa, "emailEnviado");

  if (!colNome) {
    Logger.log("ATENÇÃO: não encontrei a coluna 'Nome' pelo nome do cabeçalho.");
    return;
  }

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();

  let comNome = 0, concluidosPelaSituacao = 0, comRegistroId = 0;
  const amostraSituacoes = new Set();
  let algumEmailEnviadoEhDate = false;

  dados.forEach((linhaDados, indice) => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;
    comNome++;

    const situacaoBruta = linhaDados[COL_SITUACAO_FIXA - 1];
    amostraSituacoes.add(JSON.stringify(situacaoBruta));

    if (colEmailEnviado && linhaDados[colEmailEnviado - 1] instanceof Date) {
      algumEmailEnviadoEhDate = true;
    }

    if (!estaConcluido_(situacaoBruta)) return;
    concluidosPelaSituacao++;

    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (registroId) {
      comRegistroId++;
    } else {
      Logger.log(`Linha ${indice + 2} (${nome}): situação concluída mas SEM Registro ID.`);
    }

  });

  Logger.log(`Total de linhas com nome: ${comNome}`);
  Logger.log(`Valores distintos na coluna Situação (posição fixa K): ${Array.from(amostraSituacoes).join(" | ")}`);
  Logger.log(`Linhas reconhecidas como concluídas (contém "conclu"): ${concluidosPelaSituacao}`);
  Logger.log(`Dessas, quantas têm Registro ID preenchido: ${comRegistroId}`);
  Logger.log(`Pendentes = ${comNome - concluidosPelaSituacao} | Concluídas = ${concluidosPelaSituacao}`);
  Logger.log(`Coluna "E-mail Enviado" tem algum valor já convertido em Date pelo Sheets: ${algumEmailEnviadoEhDate} (era exatamente essa a causa raiz do bug de serialização, já corrigida na leitura).`);

}
