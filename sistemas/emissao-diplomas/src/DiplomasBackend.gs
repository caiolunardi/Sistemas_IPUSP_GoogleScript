/*=====================================================
  EMISSÃO DE DIPLOMAS — V3.0 (Hardening Fase 1)
  Backend Apps Script

  Este arquivo passou por uma rodada de endurecimento
  técnico (segurança, concorrência, integridade) mantendo
  o fluxo de trabalho, layout e regras de negócio originais.
  Ver relatório entregue junto com esta versão para o
  detalhamento completo do que mudou e por quê.

  CONFIGURAÇÃO OBRIGATÓRIA (igual a antes):

  1) Script Property ID_INDEX_SPREADSHEET_ID — aponta para o
     índice institucional de recursos.

  2) Chaves do índice: PASTA_RAIZ_ALUNOS, PLANILHA_ALUNOS,
     TEMPLATE_OFICIO_ID, TEMPLATE_CERTIFICADO_ID,
     TEMPLATE_FORMANDOS_ID e REGRAS_CURRICULARES.

  Os CABECALHOS abaixo precisam bater EXATAMENTE com os
  títulos da linha 1 da aba "Diplomas". Colunas novas desta
  rodada (Registro ID, Versão) são criadas automaticamente
  na primeira execução se ainda não existirem.
=====================================================*/

// IDs externos: resolvidos pelo ID_INDEX (nunca fixados no código).




const VERSAO_DIPLOMAS = "4.0.1";

const ABA_DIPLOMAS = "Diplomas";
const ABA_INFOS = "INFOS";

// Endereço que deve aparecer como remetente/reply-to dos e-mails.
// A conta que efetivamente ENVIA é sempre a que executa o Web App
// (deploy "Only myself" / "Execute as: me" = gradip@usp.br) — ver
// enviarEmailInstitucional_.
const EMAIL_REMETENTE = "gradip@usp.br";

// Fuso horário fixo pros carimbos de "enviado em ...". Não usamos
// Session.getScriptTimeZone() porque ele reflete o fuso configurado
// no PROJETO do Apps Script (Configurações do projeto), que pode
// estar diferente do fuso da planilha/São Paulo — foi exatamente
// essa divergência que causava carimbos de e-mail com horário errado.
const TIMEZONE = "America/Sao_Paulo";

// Limite de tamanho de upload (bytes). 15MB é generoso pra PDF/foto
// de documento escaneado sem deixar a porta aberta pra qualquer coisa.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Extensões nunca aceitas em upload, independente do tipo declarado
// pelo navegador (que não é confiável).
const EXTENSOES_PROIBIDAS = [
  ".exe", ".bat", ".cmd", ".sh", ".js", ".html", ".htm", ".vbs",
  ".msi", ".jar", ".com", ".scr", ".ps1", ".apk", ".app", ".dll"
];

// Limite de destinatários em CCO por mensagem. O Apps Script permite
// no máximo 50 destinatários (to+cc+bcc) por e-mail — deixamos 1 vago
// pro "to" (que é sempre o remetente institucional) e usamos 49 pra
// CCO, num número redondo abaixo do limite real por segurança.
const MAX_DESTINATARIOS_BCC_POR_ENVIO = 49;

// ----- Planilha central de Alunos (índice único de pasta por NUSP,
// compartilhado entre Diplomas, BUSP e futuros sistemas) -----

const ABA_ALUNOS_CENTRAL = "Página1";

// Posições fixas de coluna na planilha central (confirmadas com o usuário)
const COL_ALUNOS_CENTRAL_NUSP = 1;      // A
const COL_ALUNOS_CENTRAL_NOME = 2;      // B
const COL_ALUNOS_CENTRAL_EMAIL = 4;     // D
const COL_ALUNOS_CENTRAL_ID_PASTA = 5;  // E

// Linha e colunas (na aba INFOS) onde fica o nome e o gênero do(a)
// Secretário(a) Geral atual da USP — usado pra montar corretamente o
// Ofício de Encaminhamento de Diploma sempre que a pessoa no cargo
// mudar. Coluna C = nome, Coluna D = gênero (M/F), ambos na mesma
// linha da tabela de tipos de arquivo da aba INFOS.
const LINHA_SECRETARIO_GERAL_INFOS = 2;
const COL_SECRETARIO_GERAL_NOME = 3;   // C
const COL_SECRETARIO_GERAL_GENERO = 4; // D

const CABECALHOS = {
  registroId: "Registro ID",
  versao: "Versão",
  nome: "Nome completo",
  nUsp: "Nº USP",
  email: "E-mail",
  habilitacaoTexto: "Habilitação(ões) solicitada(s)",
  genero: "M/F",
  rg: "Nº RG",
  status: "Status — Dados Pessoais",
  colacao: "Colação",
  bachConcluiu: "Bacharelado — concluiu?",
  bachAno: "Bacharelado — ano",
  licConcluiu: "Licenciatura — concluiu?",
  licAno: "Licenciatura — ano",
  psiConcluiu: "Formação de Psicólogo(a) — concluiu?",
  psiAno: "Formação de Psicólogo(a) — ano",
  linkPasta: "Link da pasta no Drive",
  idPasta: "ID da Pasta",
  oficioGerado: "Ofício gerado?",
  certificadoGerado: "Certificado gerado?",
  bachColacao: "Colação Bacharelado Realizada",
  licColacao: "Colação Licenciatura Realizada",
  psiColacao: "Colação Psicólogo Realizada",
  bachDiploma: "Diploma Bacharelado Emitido",
  licDiploma: "Diploma Licenciatura Emitido",
  psiDiploma: "Diploma Psicólogo Emitido",
  emailDiplomaEnviado: "E-mail Diploma Enviado",
  diplomaExpedido: "Diploma Expedido",
  emailColacaoEnviado: "E-mail Colação Enviado",
  statusHistorico: "Status — Histórico Escolar",
  statusColacaoEncerramento: "Status — Colação e Encerramento",
  bachRequisitos: "Bacharelado — Cumpre Requisitos",
  licRequisitos: "Licenciatura — Cumpre Requisitos",
  psiRequisitos: "Formação de Psicólogo(a) — Cumpre Requisitos"
};

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

function doGet(e) {

  // 4.0: o projeto é autônomo e a implantação fica aberta; quem decide
  // se a página abre é a aba EMISSAO_DIPLOMAS (DiplomasAcesso.gs).
  // Sem acesso: página só com o aviso, sem nenhum dado.
  const acesso = verificarAcessoParaPaginaDiplomas_();
  if (!acesso.ok) return paginaSemAcessoDiplomas_(acesso);

  // Correção automática e idempotente de Registro ID/Versão (só grava
  // quando há linha sem ID, com ID repetido ou sem Versão — por
  // exemplo, linha acrescentada à mão na planilha). Desde a 4.0 roda
  // só depois da conferência de acesso e só para ADMINISTRADOR: quem
  // não pode gravar não dispara gravação ao abrir a página. Decisão do
  // responsável em 05/11/2026.
  if (acesso.perfil === ACESSO_DIPLOMAS.ADMINISTRADOR) {
    try {
      migrarParaRegistroId_();
    } catch (err) {
      // Não trava o carregamento da página por causa da migração — se
      // algo daqui pra frente realmente precisar de Registro ID e não
      // encontrar a coluna, o próprio endpoint vai reclamar sozinho.
      Logger.log("Falha na migração automática de Registro ID: " + err);
    }
  }

  const pagina = HtmlService.createTemplateFromFile("DiplomasApp");
  pagina.perfil = acesso.perfil;
  // Topo da página: nome (B) e observação (D) da aba de acesso; sem
  // nome, o e-mail (decisão do responsável em 05/11/2026).
  pagina.usuarioNome = acesso.nome || acesso.email;
  pagina.usuarioDescricao = acesso.observacao;
  pagina.versao = VERSAO_DIPLOMAS;
  pagina.homologacao = ehHomologacaoDiplomas_();
  return pagina.evaluate()
    .setTitle(prefixoAmbienteDiplomas_() + "Gerenciador de Colação de Grau e Diplomas")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  ABA / CABEÇALHOS (privados — nenhum disso é uma
  operação que faz sentido chamar direto do navegador)
=====================================================*/

// Desde a 4.0 o projeto é autônomo: a planilha de diplomas vem da chave
// EMISSAO_DIPLOMAS do ID_INDEX (coluna Homologação quando AMBIENTE =
// homologacao), não mais de getActiveSpreadsheet().
const CHAVE_PLANILHA_DIPLOMAS = "EMISSAO_DIPLOMAS";

// Aberta uma vez por execução: obterAba_ é chamado várias vezes por
// requisição e cada consulta ao ID_INDEX abre outra planilha.
let planilhaDiplomasDaExecucao_ = null;

function abrirPlanilhaDiplomas_() {
  if (!planilhaDiplomasDaExecucao_) {
    planilhaDiplomasDaExecucao_ = SpreadsheetApp.openById(obterIdRecursoDiplomas_(CHAVE_PLANILHA_DIPLOMAS, "spreadsheet"));
  }
  return planilhaDiplomasDaExecucao_;
}

function obterAba_() {
  const aba = abrirPlanilhaDiplomas_().getSheetByName(ABA_DIPLOMAS);
  if (!aba) throw new Error(`Aba "${ABA_DIPLOMAS}" não encontrada.`);
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
      `Não encontrei a coluna "${nomeEsperado}" na aba "${ABA_DIPLOMAS}". ` +
      `Confira se o cabeçalho da linha 1 está exatamente assim.`
    );
  }

  return coluna;

}

// Igual a obterColuna_, mas devolve null em vez de dar erro quando a
// coluna não existe — usado pra colunas opcionais/novas.
function obterColunaOpcional_(mapaCabecalhos, chave) {
  const nomeEsperado = CABECALHOS[chave];
  return mapaCabecalhos[nomeEsperado] || null;
}

// Igual a obterColunaOpcional_, mas se a coluna não existir, CRIA ela
// de verdade na planilha (no final, com o cabeçalho certo).
function obterOuCriarColuna_(aba, mapaCabecalhos, chave) {

  const nomeEsperado = CABECALHOS[chave];
  const colunaExistente = mapaCabecalhos[nomeEsperado];

  if (colunaExistente) return colunaExistente;

  const novaColuna = aba.getLastColumn() + 1;
  aba.getRange(1, novaColuna).setValue(nomeEsperado);
  mapaCabecalhos[nomeEsperado] = novaColuna;

  return novaColuna;

}

function extrairIdDaUrl_(texto) {
  if (!texto) return null;
  const match = String(texto).match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function obterPastaRaizId_() {
  return obterIdRecursoDiplomas_("PASTA_RAIZ_ALUNOS", "folder");
}

// Monta o texto de habilitação a partir do estado ATUAL das
// habilitações — usado na lista de alunos e nos e-mails/PDFs.
function calcularHabilitacaoTextoAtual_(bachConcluiu, licConcluiu, psiConcluiu) {

  const partes = [];
  if (psiConcluiu) partes.push("Formação de Psicólogo(a)");
  if (bachConcluiu) partes.push("Bacharelado");
  if (licConcluiu) partes.push("Licenciatura");

  return partes.length > 0 ? partes.join(" + ") : "Nenhuma habilitação";

}

function formatarRotuloColacao_(valor) {
  if (valor.length === 5) {
    const ano = valor.substring(0, 4);
    const semestre = valor.substring(4, 5);
    return `${ano} — ${semestre}º semestre`;
  }
  return valor;
}

/*=====================================================
  REGISTRO ID (UUID) + VERSÃO — identidade durável do
  registro, independente de onde a linha está HOJE na
  planilha, e proteção contra "lost update" quando duas
  sessões editam o mesmo registro.
=====================================================*/

function garantirColunasBase_(aba, mapa) {
  obterOuCriarColuna_(aba, mapa, "registroId");
  obterOuCriarColuna_(aba, mapa, "versao");
}

// Checagem RÁPIDA e sem lock: varre só as colunas Registro ID/Versão
// e diz se existe algo pendente de corrigir. Roda em todo doGet, por
// isso precisa ser barata no caso comum (nada pra fazer).
function precisaMigrar_(aba, mapa) {

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colNome = obterColunaOpcional_(mapa, "nome");

  if (!colRegistroId || !colVersao) return true; // colunas nem existem ainda

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return false;

  const numColunas = Math.max(colRegistroId, colVersao, colNome);
  const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

  const vistos = new Set();

  for (let i = 0; i < dados.length; i++) {
    if (!dados[i][colNome - 1]) continue; // linha em branco, ignora
    const id = String(dados[i][colRegistroId - 1] || "").trim();
    if (!id || vistos.has(id)) return true;
    vistos.add(id);
    const v = dados[i][colVersao - 1];
    if (!v || isNaN(Number(v))) return true;
  }

  return false;

}

// Migração idempotente: cria as colunas se faltarem, preenche UUID
// pra qualquer linha real sem Registro ID, inicializa Versão=1 onde
// faltar, e corrige duplicatas de Registro ID (a PRIMEIRA ocorrência
// mantém o ID; qualquer ocorrência repetida depois ganha um ID novo
// — nunca perde dado, nunca troca um ID já válido e único). Roda sob
// ScriptLock só quando a checagem rápida acima aponta que há algo a
// fazer, então o caso comum (tudo já migrado) não paga o custo de lock.
function migrarParaRegistroId_() {

  const abaChecagem = obterAba_();
  const mapaChecagem = mapearCabecalhos_(abaChecagem);

  if (!precisaMigrar_(abaChecagem, mapaChecagem)) {
    return { alteradas: 0, duplicatasCorrigidas: 0 };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAba_();
    const mapa = mapearCabecalhos_(aba);
    garantirColunasBase_(aba, mapa);

    const colRegistroId = obterColuna_(mapa, "registroId");
    const colVersao = obterColuna_(mapa, "versao");
    const colNome = obterColuna_(mapa, "nome");

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return { alteradas: 0, duplicatasCorrigidas: 0 };

    const numColunas = Math.max(colRegistroId, colVersao, colNome);
    const dados = aba.getRange(2, 1, ultimaLinha - 1, numColunas).getValues();

    const vistos = new Set();
    let alteradas = 0;
    let duplicatasCorrigidas = 0;
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
        // Sem nome nem ID no registro de execução (DADOS_E_SEGURANCA §6).
        Logger.log(`Registro ID duplicado corrigido na linha ${i + 2}.`);
      } else {
        vistos.add(idAtual);
      }

      const versaoAtual = dados[i][colVersao - 1];
      if (!versaoAtual || isNaN(Number(versaoAtual))) {
        dados[i][colVersao - 1] = 1;
        versoesCorrigidas++;
      }

    }

    // Grava só as colunas Registro ID e Versão: regravar a faixa inteira
    // com setValues trocaria fórmulas das outras colunas pelo valor
    // calculado (revisão independente do PR #42, B2 e C2).
    if (alteradas > 0 || duplicatasCorrigidas > 0) {
      aba.getRange(2, colRegistroId, dados.length, 1).setValues(dados.map(l => [l[colRegistroId - 1]]));
    }
    if (alteradas > 0 || duplicatasCorrigidas > 0 || versoesCorrigidas > 0) {
      aba.getRange(2, colVersao, dados.length, 1).setValues(dados.map(l => [l[colVersao - 1]]));
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

// Localiza a LINHA ATUAL de um Registro ID, dado um aba/mapa já
// carregados (evita reler cabeçalhos em loops de lote). Nunca confia
// em número de linha vindo do cliente — sempre resolve de novo aqui.
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
          "interno. Não prossegui pra evitar mexer no aluno errado — avise o suporte técnico."
        );
      }
      linhaEncontrada = i + 2;
    }
  }

  if (linhaEncontrada === null) {
    throw new Error("Esse registro não existe mais (pode ter sido excluído por outra sessão). Recarregue a lista.");
  }

  return linhaEncontrada;

}

// Versão "completa": resolve aba+mapa+linha a partir só do
// Registro ID. É o ponto de entrada padrão de quase todo endpoint.
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

// Optimistic concurrency: se quem chamou informou a versão que tinha
// em mãos e ela não bate com a atual, alguém mais mexeu nesse
// registro nesse meio tempo — recusa a operação em vez de sobrescrever.
function exigirVersaoAtual_(aba, mapa, linha, versaoEsperada) {
  const versaoAtual = lerVersao_(aba, mapa, linha);
  if (versaoEsperada !== undefined && versaoEsperada !== null && versaoEsperada !== "" &&
      Number(versaoEsperada) !== versaoAtual) {
    throw new Error(
      "Este registro foi alterado por outra sessão desde que você o abriu. " +
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

// Wrapper genérico pra mutações simples: lock -> resolve ID -> checa
// versão -> executa -> incrementa versão -> devolve. A maioria dos
// endpoints de "salvar/avançar/devolver" usa isso; os fluxos mais
// complexos (e-mail com idempotência, exclusão, upload) têm sua
// própria orquestração porque precisam de coisas que esse wrapper
// genérico não cobre (reserva, validação de Drive, etc.).
function executarMutacao_(registroId, versaoEsperada, funcaoMutacao) {

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const aba = obterAba_();
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
  MÁQUINA DE ESTADOS — etapa real do registro, calculada
  sempre a partir da planilha (nunca confiada do cliente)
=====================================================*/

function obterEtapaAtual_(aba, mapa, linha) {

  const status = aba.getRange(linha, obterColuna_(mapa, "status")).getValue() || "";

  const colHist = obterColunaOpcional_(mapa, "statusHistorico");
  const statusHistorico = colHist ? (aba.getRange(linha, colHist).getValue() || "") : "";

  const colColEnc = obterColunaOpcional_(mapa, "statusColacaoEncerramento");
  const statusColacaoEnc = colColEnc ? (aba.getRange(linha, colColEnc).getValue() || "") : "";

  if (status !== "OK") return "dados_pessoais";
  if (statusHistorico !== "OK") return "historico";
  if (statusColacaoEnc !== "OK") return "colacao";
  return "diploma";

}

function exigirEtapa_(aba, mapa, linha, etapaEsperada) {
  const atual = obterEtapaAtual_(aba, mapa, linha);
  if (atual !== etapaEsperada) {
    throw new Error(
      `Essa ação só é válida na etapa "${etapaEsperada}", mas esse registro está em ` +
      `"${atual}" agora (provavelmente outra sessão já avançou/devolveu esse aluno). Recarregue a lista.`
    );
  }
  return atual;
}

function exigirEtapaEm_(aba, mapa, linha, etapasPermitidas) {
  const atual = obterEtapaAtual_(aba, mapa, linha);
  if (etapasPermitidas.indexOf(atual) === -1) {
    throw new Error(`Essa ação não é válida na etapa atual ("${atual}"). Recarregue a lista.`);
  }
  return atual;
}

/*=====================================================
  VALIDAÇÃO / NORMALIZAÇÃO CENTRAL — toda entrada vinda
  do cliente é tratada como não confiável.
=====================================================*/

// Texto simples: remove caracteres de controle, força prefixo de
// texto no Sheets se começar com caractere de fórmula (=, +, -, @) —
// evita formula injection sem estragar nomes/e-mails legítimos que
// não começam com esses caracteres.
function sanitizarTextoPlano_(valor) {
  let texto = (valor === null || valor === undefined) ? "" : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  texto = texto.trim();
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto.slice(0, 500);
}

function normalizarNUsp_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const apenasDigitos = texto.replace(/\D/g, "");
  if (!apenasDigitos) throw new Error("Nº USP inválido — use só números.");
  if (apenasDigitos.length > 15) throw new Error("Nº USP muito longo.");
  return apenasDigitos;
}

function validarGenero_(valor) {
  const texto = String(valor || "").trim().toUpperCase();
  return (texto === "F" || texto === "M") ? texto : "";
}

function validarCodigoColacao_(valor) {
  const texto = String(valor || "").trim();
  if (!/^\d{4}[12]$/.test(texto)) {
    throw new Error("Código de colação inválido. Use o formato AAAAS (ano + 1 ou 2 do semestre), ex: 20261.");
  }
  return texto;
}

// dd/mm/aaaa -> valida se a data existe de verdade no calendário
// (rejeita 31/02 etc) e devolve no formato canônico dd/mm/aaaa.
function validarDataBr_(valor) {

  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error("Data inválida. Use o formato dd/mm/aaaa.");

  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);

  const data = new Date(ano, mes - 1, dia);
  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;

  if (!valida) throw new Error(`Data inválida: ${texto} não existe no calendário.`);

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;

}

function validarHorario_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) throw new Error("Informe um horário.");
  if (texto.length > 20) throw new Error("Horário inválido.");
  if (!/^[0-9hH:\s]+$/.test(texto)) {
    throw new Error("Horário inválido. Use um formato como 10h ou 10h30.");
  }
  return texto;
}

function validarTipoDocumento_(valor) {
  if (valor !== "certificado" && valor !== "oficio") {
    throw new Error("Tipo de documento inválido.");
  }
  return valor;
}

function validarArrayDeIds_(valor) {
  if (!Array.isArray(valor)) throw new Error("Lista de registros inválida.");
  const unicos = Array.from(new Set(valor.filter(v => typeof v === "string" && v)));
  if (unicos.length === 0) throw new Error("Nenhum registro selecionado.");
  if (unicos.length > 500) throw new Error("Seleção grande demais para processar de uma vez. Divida em lotes menores.");
  unicos.forEach(validarFormatoRegistroId_);
  return unicos;
}

function sanitizarNomeArquivo_(nome) {
  let texto = String(nome || "arquivo").trim();
  texto = texto.replace(/[\u0000-\u001F\u007F]/g, "");
  texto = texto.replace(/[\/\\]/g, "-");
  if (texto.length > 150) texto = texto.slice(0, 150);
  return texto || "arquivo";
}

/*=====================================================
  COLAÇÕES
=====================================================*/

function obterColacoes() {
  exigirLeitorDiplomas_(); // DiplomasAcesso.gs

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);
  const colColacao = obterColuna_(mapa, "colacao");

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(2, colColacao, ultimaLinha - 1, 1).getValues();

  const vistos = new Set();
  valores.forEach(linha => {
    const v = String(linha[0]).trim();
    if (v) vistos.add(v);
  });

  return Array.from(vistos).sort().reverse().map(valor => ({
    valor: valor,
    rotulo: formatarRotuloColacao_(valor)
  }));

}

/*=====================================================
  LISTA DE ALUNOS / DETALHE
=====================================================*/

function obterAlunos(colacao, statusDesejado) {
  exigirLeitorDiplomas_(); // DiplomasAcesso.gs

  const aba = obterAba_();
  const mapa = mapearCabecalhos_(aba);

  const colRegistroId = obterColunaOpcional_(mapa, "registroId");
  const colVersao = obterColunaOpcional_(mapa, "versao");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colBach = obterColuna_(mapa, "bachConcluiu");
  const colLic = obterColuna_(mapa, "licConcluiu");
  const colPsi = obterColuna_(mapa, "psiConcluiu");
  const colStatus = obterColuna_(mapa, "status");
  const colColacao = obterColuna_(mapa, "colacao");
  const colStatusHistorico = obterColunaOpcional_(mapa, "statusHistorico");
  const colStatusColacaoEnc = obterColunaOpcional_(mapa, "statusColacaoEncerramento");
  const colEmailColacaoEnviado = obterColunaOpcional_(mapa, "emailColacaoEnviado");
  const colEmailDiplomaEnviado = obterColunaOpcional_(mapa, "emailDiplomaEnviado");

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();

  const alunos = [];

  dados.forEach((linhaDados, indice) => {

    const nome = linhaDados[colNome - 1];
    if (!nome) return;

    const colacaoLinha = String(linhaDados[colColacao - 1] || "").trim();
    if (colacaoLinha !== String(colacao).trim()) return;

    const registroId = colRegistroId ? String(linhaDados[colRegistroId - 1] || "").trim() : "";
    if (!registroId) {
      // Linha real sem Registro ID ainda (raríssimo — só se alguém
      // adicionou manualmente na planilha entre a migração e esta
      // leitura). Fica de fora da lista até a próxima migração
      // resolver, em vez de quebrar a tela toda.
      Logger.log(`Linha ${indice + 2} sem Registro ID — ignorada em obterAlunos até a próxima migração.`);
      return;
    }

    const statusDadosPessoais = linhaDados[colStatus - 1] || "";
    const statusHistorico = colStatusHistorico ? (linhaDados[colStatusHistorico - 1] || "") : "";
    const statusColacaoEnc = colStatusColacaoEnc ? (linhaDados[colStatusColacaoEnc - 1] || "") : "";

    let etapaAtual;
    if (statusDadosPessoais !== "OK") etapaAtual = "dados_pessoais";
    else if (statusHistorico !== "OK") etapaAtual = "historico";
    else if (statusColacaoEnc !== "OK") etapaAtual = "colacao";
    else etapaAtual = "diploma";

    if (etapaAtual !== statusDesejado) return;

    const rotulos = {
      dados_pessoais: "Pendente",
      historico: "Em análise",
      colacao: "Colação de Grau",
      diploma: "Emissão de Diploma"
    };

    let emailEnviado = "";
    if (etapaAtual === "colacao" && colEmailColacaoEnviado) {
      const v = linhaDados[colEmailColacaoEnviado - 1] || "";
      emailEnviado = v === "ENVIANDO…" ? "" : v;
    } else if (etapaAtual === "diploma" && colEmailDiplomaEnviado) {
      const v = linhaDados[colEmailDiplomaEnviado - 1] || "";
      emailEnviado = v === "ENVIANDO…" ? "" : v;
    }

    alunos.push({
      registroId: registroId,
      versao: colVersao ? (Number(linhaDados[colVersao - 1]) || 1) : 1,
      nome: nome,
      nUsp: linhaDados[colNUsp - 1],
      habilitacao: calcularHabilitacaoTextoAtual_(
        linhaDados[colBach - 1] === "SIM",
        linhaDados[colLic - 1] === "SIM",
        linhaDados[colPsi - 1] === "SIM"
      ),
      status: rotulos[etapaAtual],
      emailEnviado: emailEnviado
    });

  });

  alunos.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  return alunos;

}

function obterDetalheAluno(registroId) {
  exigirLeitorDiplomas_(); // DiplomasAcesso.gs

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const ultimaColuna = aba.getLastColumn();
  const dados = aba.getRange(linha, 1, 1, ultimaColuna).getValues()[0];

  const pegar = (chave) => dados[obterColuna_(mapa, chave) - 1];
  const pegarOpcional = (chave) => {
    const col = obterColunaOpcional_(mapa, chave);
    return col ? dados[col - 1] : "";
  };

  const colIdPasta = obterColunaOpcional_(mapa, "idPasta");
  const linkPastaBruto = pegar("linkPasta") || "";
  const idPastaColuna = colIdPasta ? dados[colIdPasta - 1] : null;
  let idPasta = idPastaColuna || extrairIdDaUrl_(linkPastaBruto);

  // Cache local vazio? Consulta a planilha central antes de desistir —
  // pode já existir pasta criada por outro sistema (ex: BUSP) pra
  // esse mesmo NUSP, mesmo que o Diplomas ainda não tenha sincronizado
  // seu cache local (isso só acontece na próxima ação que mexa em
  // arquivo/pasta desse aluno — ver garantirPastaInterno_).
  if (!idPasta) {
    try {
      const abaCentral = obterAbaAlunosCentral_();
      const linhaCentral = localizarLinhaAlunoCentral_(abaCentral, pegar("nUsp"));
      if (linhaCentral) {
        const idCentral = String(abaCentral.getRange(linhaCentral, COL_ALUNOS_CENTRAL_ID_PASTA).getValue() || "").trim();
        if (idCentral) idPasta = idCentral;
      }
    } catch (err) {
      // Falha ao consultar a central não deve quebrar a tela de
      // detalhe — só significa que o link de pasta não aparece até a
      // próxima ação que crie/sincronize a pasta.
    }
  }

  // Link de pasta NUNCA é confiado direto da planilha — só é exposto
  // se a pasta existir e estiver de fato dentro da raiz gerenciada.
  let linkPasta = "";
  if (idPasta) {
    try {
      linkPasta = gerarUrlCanonicaPasta_(validarPastaGerenciada_(idPasta));
    } catch (err) {
      linkPasta = "";
    }
  }

  const etapaAtual = obterEtapaAtual_(aba, mapa, linha);

  const detalhe = {
    registroId: registroId,
    versao: lerVersao_(aba, mapa, linha),
    nome: pegar("nome") || "",
    nUsp: pegar("nUsp") || "",
    email: pegar("email") || "",
    genero: pegar("genero") || "",
    rg: pegar("rg") || "",
    status: (pegar("status") || "") || "Pendente",
    statusHistorico: pegarOpcional("statusHistorico") || "",
    statusColacaoEncerramento: pegarOpcional("statusColacaoEncerramento") || "",
    etapaAtual: etapaAtual,
    linkPasta: linkPasta,
    bachConcluiu: pegar("bachConcluiu") === "SIM",
    licConcluiu: pegar("licConcluiu") === "SIM",
    psiConcluiu: pegar("psiConcluiu") === "SIM",
    bachAno: pegar("bachAno") || "",
    licAno: pegar("licAno") || "",
    psiAno: pegar("psiAno") || "",
    requisitos: {
      bach: pegarOpcional("bachRequisitos") === "SIM",
      lic: pegarOpcional("licRequisitos") === "SIM",
      psi: pegarOpcional("psiRequisitos") === "SIM"
    },
    oficioGerado: pegar("oficioGerado") === "SIM",
    certificadoGerado: pegar("certificadoGerado") === "SIM",
    statusColacaoEDiploma: obterStatusColacaoEDiploma_(aba, mapa, linha),
    emailDiplomaEnviado: (() => {
      const v = pegarOpcional("emailDiplomaEnviado");
      return v === "ENVIANDO…" ? "" : (v || "");
    })(),
    emailColacaoEnviado: (() => {
      const v = pegarOpcional("emailColacaoEnviado");
      return v === "ENVIANDO…" ? "" : (v || "");
    })(),
    arquivos: []
  };

  if (idPasta) {
    try {
      const pastaValidada = validarPastaGerenciada_(idPasta);
      detalhe.arquivos = listarArquivosPasta_(pastaValidada.getId());
    } catch (err) {
      detalhe.arquivos = [];
    }
  }

  return detalhe;

}

/*=====================================================
  DRIVE — proteções centrais. Nenhuma operação de Drive
  confia cegamente em ID/link vindo da planilha ou do
  cliente sem antes validar que é uma pasta/arquivo
  realmente dentro do escopo gerenciado pelo sistema.
=====================================================*/

function validarPastaGerenciada_(idPasta) {

  if (!idPasta) throw new Error("Registro sem pasta associada.");

  let pasta;
  try {
    pasta = DriveApp.getFolderById(idPasta);
  } catch (err) {
    throw new Error("Erro de integridade: a pasta configurada para esse registro não existe mais no Drive.");
  }

  const raizId = obterPastaRaizId_();
  const pais = pasta.getParents();
  let dentroDaRaiz = false;

  while (pais.hasNext()) {
    if (pais.next().getId() === raizId) { dentroDaRaiz = true; break; }
  }

  if (!dentroDaRaiz) {
    throw new Error(
      "Erro de integridade: a pasta associada a esse registro não está dentro da " +
      "pasta raiz gerenciada. Operação cancelada por segurança — nada foi tocado."
    );
  }

  return pasta;

}

function validarArquivoPertenceAPasta_(idArquivo, pastaValidada) {

  let arquivo;
  try {
    arquivo = DriveApp.getFileById(idArquivo);
  } catch (err) {
    throw new Error("Arquivo não encontrado.");
  }

  const pais = arquivo.getParents();
  let pertence = false;

  while (pais.hasNext()) {
    if (pais.next().getId() === pastaValidada.getId()) { pertence = true; break; }
  }

  if (!pertence) {
    throw new Error("Erro de segurança: esse arquivo não pertence à pasta desse aluno. Nada foi apagado.");
  }

  return arquivo;

}

function gerarUrlCanonicaPasta_(pastaValidada) {
  return pastaValidada.getUrl();
}

// Cria o arquivo NOVO primeiro e só remove os antigos com o mesmo
// nome DEPOIS que o novo já existe de verdade — nunca existe uma
// janela em que o aluno fica sem nenhum arquivo daquele tipo, mesmo
// se algo falhar no meio do caminho.
function substituirArquivoComSeguranca_(pasta, nomeArquivo, criarNovoArquivo) {

  const novoArquivo = criarNovoArquivo();

  const antigos = pasta.getFilesByName(nomeArquivo);
  while (antigos.hasNext()) {
    const antigo = antigos.next();
    if (antigo.getId() !== novoArquivo.getId()) {
      antigo.setTrashed(true);
    }
  }

  return novoArquivo;

}

function listarArquivosPasta_(idPasta) {

  const pasta = DriveApp.getFolderById(idPasta);
  const iterador = pasta.getFiles();
  const arquivos = [];

  while (iterador.hasNext()) {

    const arquivo = iterador.next();
    const nome = arquivo.getName();

    // "Observações - ..." é recado interno da equipe, não documento
    // do aluno — não aparece na lista geral de anexos.
    if (nome.startsWith("Observações - ")) continue;

    arquivos.push({ id: arquivo.getId(), nome: nome, link: arquivo.getUrl() });

  }

  arquivos.sort((a, b) => a.nome.localeCompare(b.nome));

  return arquivos;

}

// 4.0.1: outrosRegistrosUsamPasta_ saiu. Ela só olhava o cache de
// pasta (Link/ID da Pasta) das outras linhas, que fica vazio em linhas
// criadas pelo formulário ou à mão, e com isso a exclusão de um
// registro podia mandar para a lixeira a pasta de outra colação da
// mesma pessoa. Agora a exclusão nunca mexe na pasta (decisão D5 do
// responsável, 06/11/2026) e a função não tem mais uso.

/*=====================================================
  PLANILHA CENTRAL DE ALUNOS — fonte de verdade única
  pra "qual pasta pertence a qual NUSP", compartilhada
  entre Diplomas, BUSP e futuros sistemas. As colunas
  locais (Link da pasta no Drive / ID da Pasta) na aba
  Diplomas continuam existindo, mas viram só um CACHE de
  leitura rápida — nunca são a fonte de verdade a partir
  de agora.
=====================================================*/

function obterAbaAlunosCentral_() {
  const aba = SpreadsheetApp.openById(obterIdRecursoDiplomas_("PLANILHA_ALUNOS", "spreadsheet")).getSheetByName(ABA_ALUNOS_CENTRAL);
  if (!aba) {
    throw new Error(`Não encontrei a aba "${ABA_ALUNOS_CENTRAL}" na planilha central de Alunos.`);
  }
  return aba;
}

// Varre a coluna de NUSP da planilha central e devolve o número da
// linha (ou null se o aluno ainda não tem cadastro lá).
function localizarLinhaAlunoCentral_(abaCentral, nUsp) {

  const nUspAlvo = String(nUsp || "").trim();
  if (!nUspAlvo) return null;

  const ultimaLinha = abaCentral.getLastRow();
  if (ultimaLinha < 2) return null;

  const valores = abaCentral.getRange(2, COL_ALUNOS_CENTRAL_NUSP, ultimaLinha - 1, 1).getValues();

  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0] || "").trim() === nUspAlvo) return i + 2;
  }

  return null;

}

// Todas as linhas da planilha central com este NUSP (normalmente uma).
// Usado por quem GRAVA: com mais de uma, não há como saber qual é a
// certa, e a gravação para (falha fechada). A leitura continua usando
// localizarLinhaAlunoCentral_ (primeira ocorrência), como antes.
function localizarLinhasAlunoCentral_(abaCentral, nUsp) {

  const nUspAlvo = String(nUsp || "").trim();
  if (!nUspAlvo) return [];

  const ultimaLinha = abaCentral.getLastRow();
  if (ultimaLinha < 2) return [];

  const valores = abaCentral.getRange(2, COL_ALUNOS_CENTRAL_NUSP, ultimaLinha - 1, 1).getValues();
  const linhas = [];
  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0] || "").trim() === nUspAlvo) linhas.push(i + 2);
  }
  return linhas;

}

const MENSAGEM_NUSP_REPETIDO_CENTRAL_ =
  "Este Nº USP aparece em mais de uma linha da planilha central de alunos. " +
  "Nada foi criado nem alterado. Corrija o cadastro pelo Gerenciador de Pessoas e tente de novo.";

// Linha única do NUSP na central, ou null quando não há nenhuma.
// Repetição → erro (nada é gravado).
function linhaUnicaAlunoCentral_(abaCentral, nUsp) {
  const linhas = localizarLinhasAlunoCentral_(abaCentral, nUsp);
  if (linhas.length > 1) throw new Error(MENSAGEM_NUSP_REPETIDO_CENTRAL_);
  return linhas.length ? linhas[0] : null;
}

function lerIdPastaCentral_(abaCentral, linhaCentral) {
  return String(abaCentral.getRange(linhaCentral, COL_ALUNOS_CENTRAL_ID_PASTA).getValue() || "").trim();
}

// Pasta que ESTA execução acabou de criar e não chegou a ser usada:
// só vai para a lixeira se estiver vazia (nenhum arquivo, nenhuma
// subpasta). Qualquer outra pasta nunca é descartada aqui.
function descartarPastaNovaVazia_(pasta) {
  try {
    if (!pasta.getFiles().hasNext() && !pasta.getFolders().hasNext()) pasta.setTrashed(true);
  } catch (err) {
    Logger.log("Pasta nova não usada ficou no Drive: " + String(err && err.message || err).slice(0, 200));
  }
}

// Ponto único de verdade pra pasta de um aluno: consulta a planilha
// central por NUSP, cria o cadastro lá se ainda não existir (auto-
// cadastro TEMPORÁRIO, mantido por compatibilidade até a integração com
// o Formulário de Pedido de Colação; decisão D6 de 06/11/2026), cria a
// pasta no Drive se a linha existir mas ainda não tiver "ID da Pasta",
// e devolve a pasta (já validada dentro da raiz gerenciada).
//
// 4.0.1 — integridade entre projetos. O ScriptLock só coordena este
// projeto; a planilha central também é gravada pelo Gerenciador de
// Pessoas e por pessoas direto na planilha. Por isso:
//   - NUSP repetido na central → para sem gravar nada;
//   - o auto-cadastro grava a linha numa chamada só (appendRow) e
//     depois relê a coluna A: se outra linha com o mesmo NUSP surgiu ao
//     mesmo tempo, para com erro em vez de escolher uma;
//   - a pasta nova só é gravada depois de reler a coluna E: se outra
//     pasta foi gravada nesse meio-tempo, usa a outra e descarta a nova
//     (vazia); depois de gravar, relê para confirmar.
function garantirPastaAlunoCentral_(nUsp, nome, email) {

  const nUspAlvo = String(nUsp || "").trim();
  if (!nUspAlvo) {
    throw new Error("Esse registro não tem Nº USP preenchido — não é possível localizar/criar a pasta sem ele.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const abaCentral = obterAbaAlunosCentral_();
    let linhaCentral = linhaUnicaAlunoCentral_(abaCentral, nUspAlvo);

    if (!linhaCentral) {
      const largura = Math.max(abaCentral.getLastColumn(), COL_ALUNOS_CENTRAL_ID_PASTA);
      const novaLinha = [];
      for (let c = 0; c < largura; c++) novaLinha.push("");
      novaLinha[COL_ALUNOS_CENTRAL_NUSP - 1] = nUspAlvo;
      novaLinha[COL_ALUNOS_CENTRAL_NOME - 1] = nome || "";
      if (email) novaLinha[COL_ALUNOS_CENTRAL_EMAIL - 1] = email;
      abaCentral.appendRow(novaLinha);
      linhaCentral = linhaUnicaAlunoCentral_(abaCentral, nUspAlvo);
      if (!linhaCentral) {
        throw new Error("Erro de integridade: o cadastro na planilha central não foi encontrado depois de gravado. Nada mais foi alterado.");
      }
      Logger.log(`Aluno cadastrado automaticamente na planilha central de Alunos (linha ${linhaCentral}).`);
    }

    const idPastaAtual = lerIdPastaCentral_(abaCentral, linhaCentral);
    if (idPastaAtual) {
      return validarPastaGerenciada_(idPastaAtual);
    }

    let pastaRaiz;
    try {
      pastaRaiz = DriveApp.getFolderById(obterPastaRaizId_());
    } catch (err) {
      throw new Error(
        "Não consegui abrir a pasta raiz configurada pela chave PASTA_RAIZ_ALUNOS no ID_INDEX."
      );
    }

    const novaPasta = pastaRaiz.createFolder(`${nome} ${nUspAlvo}`);

    // Releitura antes de gravar: a linha pode ter mudado de posição e
    // outra pasta pode ter sido gravada por outro sistema.
    linhaCentral = linhaUnicaAlunoCentral_(abaCentral, nUspAlvo);
    if (!linhaCentral) {
      descartarPastaNovaVazia_(novaPasta);
      throw new Error("Erro de integridade: o cadastro deste Nº USP sumiu da planilha central durante a operação. Nada foi gravado.");
    }
    const idAntesDeGravar = lerIdPastaCentral_(abaCentral, linhaCentral);
    if (idAntesDeGravar) {
      descartarPastaNovaVazia_(novaPasta);
      return validarPastaGerenciada_(idAntesDeGravar);
    }

    abaCentral.getRange(linhaCentral, COL_ALUNOS_CENTRAL_ID_PASTA).setValue(novaPasta.getId());

    // Conferência depois de gravar.
    const linhaConferida = linhaUnicaAlunoCentral_(abaCentral, nUspAlvo);
    const idGravado = linhaConferida ? lerIdPastaCentral_(abaCentral, linhaConferida) : "";
    if (idGravado !== novaPasta.getId()) {
      if (idGravado) {
        descartarPastaNovaVazia_(novaPasta);
        return validarPastaGerenciada_(idGravado);
      }
      throw new Error("Erro de integridade: o ID da pasta não ficou gravado na planilha central. Tente de novo.");
    }

    return novaPasta;

  } finally {
    lock.releaseLock();
  }

}

// Lógica de sempre (buscar/criar pasta), SEM lock adicional daqui —
// a coordenação de criação acontece dentro de garantirPastaAlunoCentral_,
// que já é a fonte de verdade. Esta função só delega pra lá e mantém
// as colunas locais (Link da pasta no Drive / ID da Pasta) como um
// CACHE de leitura rápida — nunca como fonte de verdade — pra não
// precisar reescrever obterDetalheAluno e o resto do arquivo que já
// lê essas colunas locais.
function garantirPastaInterno_(aba, mapa, linha) {

  const colLinkPasta = obterColuna_(mapa, "linkPasta");
  const colIdPasta = obterOuCriarColuna_(aba, mapa, "idPasta");
  const colNome = obterColuna_(mapa, "nome");
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colEmail = obterColunaOpcional_(mapa, "email");

  const nome = aba.getRange(linha, colNome).getValue();
  const nUsp = aba.getRange(linha, colNUsp).getValue();
  const email = colEmail ? aba.getRange(linha, colEmail).getValue() : "";

  if (!nUsp) {
    throw new Error("Esse registro não tem Nº USP preenchido — não é possível localizar/criar a pasta sem ele.");
  }

  const pastaValidada = garantirPastaAlunoCentral_(nUsp, nome, email);

  // Cache local (não é fonte de verdade, só evita reconsultar a
  // planilha central em toda leitura de detalhe do aluno).
  const idCacheAtual = String(aba.getRange(linha, colIdPasta).getValue() || "").trim();
  if (idCacheAtual !== pastaValidada.getId()) {
    aba.getRange(linha, colLinkPasta).setValue(pastaValidada.getUrl());
    aba.getRange(linha, colIdPasta).setValue(pastaValidada.getId());
  }

  return pastaValidada;

}

// Versão só de leitura de garantirPastaInterno_, para o perfil LEITOR:
// procura a pasta pela planilha central (fonte de verdade) e, na falta,
// pelo cache local; nunca cria pasta, linha, coluna nem grava cache.
// Devolve null quando o aluno ainda não tem pasta.
function localizarPastaSemGravar_(aba, mapa, linha) {

  const nUsp = String(aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim();
  if (!nUsp) return null;

  const abaCentral = obterAbaAlunosCentral_();
  const linhaCentral = localizarLinhaAlunoCentral_(abaCentral, nUsp);
  let idPasta = linhaCentral
    ? String(abaCentral.getRange(linhaCentral, COL_ALUNOS_CENTRAL_ID_PASTA).getValue() || "").trim()
    : "";

  if (!idPasta) {
    const colIdPasta = obterColunaOpcional_(mapa, "idPasta");
    if (colIdPasta) idPasta = String(aba.getRange(linha, colIdPasta).getValue() || "").trim();
  }

  return idPasta ? validarPastaGerenciada_(idPasta) : null;

}

// PÚBLICO — usado pelo botão "Abrir/criar pasta no Drive". Criação
// de pasta é check-then-write (existe? não? cria), por isso vai sob
// lock: duas sessões clicando nesse botão pro mesmo aluno ao mesmo
// tempo não podem criar duas pastas.
function garantirPasta(registroId) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
    const pastaValidada = garantirPastaInterno_(aba, mapa, linha);
    return { linkPasta: gerarUrlCanonicaPasta_(pastaValidada), idPasta: pastaValidada.getId() };
  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  TIPOS DE ARQUIVO (aba INFOS)
=====================================================*/

function obterTiposDeArquivo() {
  exigirLeitorDiplomas_(); // DiplomasAcesso.gs

  const ss = abrirPlanilhaDiplomas_();
  const aba = ss.getSheetByName(ABA_INFOS);
  if (!aba) return [];

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();

  return valores
    .map(linha => linha[0])
    .filter(v => v && String(v).trim() !== "")
    .map(v => String(v).trim());

}

function obterExtensao_(nomeArquivo) {
  const partes = String(nomeArquivo).split(".");
  return partes.length > 1 ? "." + partes.pop() : "";
}

/*=====================================================
  UPLOAD / EXCLUSÃO DE ARQUIVO
=====================================================*/

function uploadArquivo(registroId, tipoArquivo, nomeArquivoOriginal, mimeType, base64) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);

  const tiposValidos = obterTiposDeArquivo();
  if (tiposValidos.indexOf(tipoArquivo) === -1) {
    throw new Error("Tipo de arquivo não reconhecido pelo servidor. Recarregue a página e tente de novo.");
  }

  const nomeOriginalSeguro = sanitizarNomeArquivo_(nomeArquivoOriginal);
  const extensao = obterExtensao_(nomeOriginalSeguro);

  if (EXTENSOES_PROIBIDAS.indexOf(extensao.toLowerCase()) !== -1) {
    throw new Error(`Arquivos do tipo "${extensao}" não são permitidos.`);
  }

  if (!base64 || typeof base64 !== "string") {
    throw new Error("Arquivo inválido ou vazio.");
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (err) {
    throw new Error("Não consegui ler o conteúdo do arquivo enviado.");
  }

  if (bytes.length === 0) throw new Error("Arquivo vazio.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error(`Arquivo muito grande (máximo ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB).`);
  }

  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);
  const nome = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const colacao = aba.getRange(linha, obterColuna_(mapa, "colacao")).getValue();

  const nomeFinal = `${tipoArquivo} - ${nome} - ${colacao}${extensao}`;
  const mimeSeguro = (mimeType && typeof mimeType === "string") ? mimeType : "application/octet-stream";
  const blob = Utilities.newBlob(bytes, mimeSeguro, nomeFinal);

  substituirArquivoComSeguranca_(pastaValidada, nomeFinal, () => pastaValidada.createFile(blob));

  return {
    arquivos: listarArquivosPasta_(pastaValidada.getId()),
    linkPasta: gerarUrlCanonicaPasta_(pastaValidada)
  };

}

function excluirArquivo(registroId, idArquivo) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);

  const arquivo = validarArquivoPertenceAPasta_(idArquivo, pastaValidada);
  arquivo.setTrashed(true);

  return listarArquivosPasta_(pastaValidada.getId());

}

/*=====================================================
  EDIÇÃO DE DADOS DO ALUNO — só permitida na etapa
  "dados_pessoais"; em qualquer etapa posterior, o
  caminho é "Devolver para Dados Pessoais" primeiro.
=====================================================*/

// Aplica as edições de Dados Pessoais na linha (checagem de etapa +
// validação/normalização + gravação + ajuste de pasta se nome/NUSP
// mudou). Extraída como função própria porque agora tem DOIS pontos
// de entrada que precisam do mesmo comportamento: salvarEdicaoAluno
// (só salva, mantém o aluno na mesma etapa) e
// salvarDadosPessoaisEConfirmar (salva e JÁ avança pra Histórico
// Escolar, tudo numa única mutação atômica — ver comentário lá).
function aplicarEdicaoDadosPessoais_(aba, mapa, linha, dados) {

  const etapa = obterEtapaAtual_(aba, mapa, linha);
  if (etapa !== "dados_pessoais") {
    throw new Error(
      "Esse aluno já passou da etapa de Dados Pessoais — nome, Nº USP, RG, gênero, " +
      "habilitações e anos não podem mais ser editados diretamente. Use 'Devolver " +
      "para Dados Pessoais' se precisar corrigir algo."
    );
  }

  const ultimaColuna = aba.getLastColumn();
  const range = aba.getRange(linha, 1, 1, ultimaColuna);
  const valores = range.getValues()[0];

  const nomeAntigo = valores[obterColuna_(mapa, "nome") - 1];
  const nUspAntigo = String(valores[obterColuna_(mapa, "nUsp") - 1] || "").trim();

  const nomeNovo = sanitizarTextoPlano_(dados.nome);
  const nUspNovo = normalizarNUsp_(dados.nUsp);

  if (!nomeNovo) throw new Error("O nome não pode ficar vazio.");

  valores[obterColuna_(mapa, "nome") - 1] = nomeNovo;
  valores[obterColuna_(mapa, "nUsp") - 1] = nUspNovo;
  valores[obterColuna_(mapa, "email") - 1] = sanitizarTextoPlano_(dados.email);
  valores[obterColuna_(mapa, "genero") - 1] = validarGenero_(dados.genero);
  valores[obterColuna_(mapa, "rg") - 1] = sanitizarTextoPlano_(dados.rg);
  valores[obterColuna_(mapa, "bachConcluiu") - 1] = dados.bachConcluiu ? "SIM" : "NÃO";
  valores[obterColuna_(mapa, "licConcluiu") - 1] = dados.licConcluiu ? "SIM" : "NÃO";
  valores[obterColuna_(mapa, "psiConcluiu") - 1] = dados.psiConcluiu ? "SIM" : "NÃO";
  valores[obterColuna_(mapa, "bachAno") - 1] = sanitizarTextoPlano_(dados.bachAno || "");
  valores[obterColuna_(mapa, "licAno") - 1] = sanitizarTextoPlano_(dados.licAno || "");
  valores[obterColuna_(mapa, "psiAno") - 1] = sanitizarTextoPlano_(dados.psiAno || "");

  range.setValues([valores]);

  const uspMudou = nUspNovo !== nUspAntigo;
  const nomeMudou = nomeNovo !== nomeAntigo;

  if (uspMudou || nomeMudou) {
    try {
      rebindPastaAposEdicao_(aba, mapa, linha, { nomeAntigo, nUspAntigo, nomeNovo, nUspNovo, uspMudou });
    } catch (err) {
      // Erro de pasta não deve travar o salvamento dos dados —
      // esses já foram gravados acima. Só o ajuste de pasta fica
      // pendente; registra pra investigar depois.
      Logger.log(`Falha ao ajustar pasta após edição (linha ${linha}): ${err}`);
    }
  }

  return {
    bachConcluiu: dados.bachConcluiu,
    licConcluiu: dados.licConcluiu,
    psiConcluiu: dados.psiConcluiu
  };

}

function salvarEdicaoAluno(registroId, versaoEsperada, dados) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) =>
    aplicarEdicaoDadosPessoais_(aba, mapa, linha, dados)
  );
}

// Salva as edições de Dados Pessoais e JÁ CONFIRMA a etapa (avança
// pra Histórico Escolar) numa ÚNICA mutação atômica — um lock só, uma
// checagem de versão só, um incremento de versão só. Resolve o
// problema de "Confirmar Dados Pessoais" avançar o aluno sem persistir
// as alterações feitas na tela: antes, o botão de confirmar só
// chamava confirmarDadosPessoais() direto, então quem editava um
// campo e clicava em "Confirmar" sem antes clicar em "Salvar
// Alterações" perdia a edição.
function salvarDadosPessoaisEConfirmar(registroId, versaoEsperada, dados) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    const resultadoEdicao = aplicarEdicaoDadosPessoais_(aba, mapa, linha, dados);
    aba.getRange(linha, obterColuna_(mapa, "status")).setValue("OK");
    return resultadoEdicao;
  });
}

// Depois de editar nome/NUSP na etapa de Dados Pessoais: se só o nome
// mudou, apenas renomeia a pasta física existente pra refletir isso.
// Se o NUSP mudou, a ASSOCIAÇÃO "qual pasta pertence a qual NUSP" É a
// planilha central — não faz sentido tentar realocar nada aqui: só
// limpamos o cache local (fica vazio de propósito) pra que a PRÓXIMA
// chamada a garantirPastaInterno_ resolva do zero, consultando a
// central pelo NUSP NOVO (reaproveita pasta existente desse NUSP se
// houver, ou cria uma nova — sem risco de mexer na pasta de outra
// pessoa por engano).
function rebindPastaAposEdicao_(aba, mapa, linha, ctx) {

  const colIdPasta = obterColunaOpcional_(mapa, "idPasta");
  const idPastaCache = colIdPasta ? String(aba.getRange(linha, colIdPasta).getValue() || "").trim() : "";

  if (!idPastaCache) return; // ainda não tinha pasta — nada a fazer aqui

  if (!ctx.uspMudou) {
    try {
      validarPastaGerenciada_(idPastaCache).setName(`${ctx.nomeNovo} ${ctx.nUspNovo}`);
    } catch (err) { /* pasta pode ter sido movida/excluída manualmente — ignora */ }
    return;
  }

  const colLinkPasta = obterColuna_(mapa, "linkPasta");
  aba.getRange(linha, colLinkPasta).setValue("");
  if (colIdPasta) aba.getRange(linha, colIdPasta).setValue("");

}

/*=====================================================
  CONFIRMAR / DEVOLVER — ETAPA 1
=====================================================*/

function confirmarDadosPessoais(registroId, versaoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapa_(aba, mapa, linha, "dados_pessoais");
    aba.getRange(linha, obterColuna_(mapa, "status")).setValue("OK");
    return {};
  });
}

// Devolver invalida os "portões" de TODAS as etapas posteriores
// (não só a etapa alvo) — sem isso, se o aluno já tinha Histórico e
// Colação/Encerramento marcados como OK antes de ser devolvido pra
// Dados Pessoais, ao reconfirmar ele pularia direto de volta pra
// Diploma sem ninguém rever Histórico/Colação de novo.
function devolverParaConferencia(registroId, versaoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapaEm_(aba, mapa, linha, ["historico", "colacao", "diploma"]);

    aba.getRange(linha, obterColuna_(mapa, "status")).setValue("");

    const colHist = obterColunaOpcional_(mapa, "statusHistorico");
    if (colHist) aba.getRange(linha, colHist).setValue("");

    const colColEnc = obterColunaOpcional_(mapa, "statusColacaoEncerramento");
    if (colColEnc) aba.getRange(linha, colColEnc).setValue("");

    return {};
  });
}

/*=====================================================
  ETAPA 2: Histórico Escolar e Contagem de Créditos
=====================================================*/

const CHAVES_REQUISITOS = { bach: "bachRequisitos", lic: "licRequisitos", psi: "psiRequisitos" };

function salvarRequisitos_(aba, mapa, linha, requisitos) {
  ["bach", "lic", "psi"].forEach(hab => {
    const col = obterOuCriarColuna_(aba, mapa, CHAVES_REQUISITOS[hab]);
    aba.getRange(linha, col).setValue(requisitos[hab] ? "SIM" : "NÃO");
  });
}

// Só avança se: (1) o aluno tem pelo menos uma habilitação ativa —
// zero habilitações nunca pode ser lido como "zero pendências"; e
// (2) todas as habilitações ativas têm "cumpre requisitos" = SIM.
function avancarParaEncerramento_(aba, mapa, linha) {

  const pegar = (chave) => aba.getRange(linha, obterColuna_(mapa, chave)).getValue();
  const pegarOpcional = (chave) => {
    const col = obterColunaOpcional_(mapa, chave);
    return col ? aba.getRange(linha, col).getValue() : "";
  };

  const NOMES = { bach: "Bacharelado", lic: "Licenciatura", psi: "Formação de Psicólogo(a)" };

  const ativas = {
    bach: pegar("bachConcluiu") === "SIM",
    lic: pegar("licConcluiu") === "SIM",
    psi: pegar("psiConcluiu") === "SIM"
  };

  if (!ativas.bach && !ativas.lic && !ativas.psi) {
    throw new Error("Esse aluno não tem nenhuma habilitação marcada. Marque ao menos uma em 'Dados do Aluno' (via Devolver para Dados Pessoais) antes de avançar.");
  }

  const pendentes = ["bach", "lic", "psi"].filter(hab =>
    ativas[hab] && pegarOpcional(CHAVES_REQUISITOS[hab]) !== "SIM"
  );

  if (pendentes.length > 0) {
    throw new Error(
      "Ainda falta marcar 'Cumpre requisitos' para: " + pendentes.map(h => NOMES[h]).join(", ") +
      ". Ou remova essa(s) habilitação(ões) do pedido do aluno se ela(s) não for(em) seguir nessa colação."
    );
  }

  const colStatusHistorico = obterOuCriarColuna_(aba, mapa, "statusHistorico");
  aba.getRange(linha, colStatusHistorico).setValue("OK");

}

function salvarRequisitosEAvancar(registroId, versaoEsperada, requisitos) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapa_(aba, mapa, linha, "historico");
    salvarRequisitos_(aba, mapa, linha, requisitos);
    avancarParaEncerramento_(aba, mapa, linha); // lança erro se faltar requisito/habilitação
    return {};
  });
}

function devolverParaHistorico(registroId, versaoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapaEm_(aba, mapa, linha, ["colacao", "diploma"]);

    const colHist = obterOuCriarColuna_(aba, mapa, "statusHistorico");
    aba.getRange(linha, colHist).setValue("");

    const colColEnc = obterColunaOpcional_(mapa, "statusColacaoEncerramento");
    if (colColEnc) aba.getRange(linha, colColEnc).setValue("");

    return {};
  });
}

/*=====================================================
  ETAPA 3: Colação de Grau / Encerramento
=====================================================*/

const CHAVES_COLACAO = { bach: "bachColacao", lic: "licColacao", psi: "psiColacao" };
const CHAVES_DIPLOMA = { bach: "bachDiploma", lic: "licDiploma", psi: "psiDiploma" };

function salvarColacaoRealizada_(aba, mapa, linha, colacao) {
  ["bach", "lic", "psi"].forEach(hab => {
    const col = obterOuCriarColuna_(aba, mapa, CHAVES_COLACAO[hab]);
    aba.getRange(linha, col).setValue(colacao[hab] ? "SIM" : "NÃO");
  });
}

function avancarParaDiploma_(aba, mapa, linha) {

  const pegar = (chave) => aba.getRange(linha, obterColuna_(mapa, chave)).getValue();
  const pegarOpcional = (chave) => {
    const col = obterColunaOpcional_(mapa, chave);
    return col ? aba.getRange(linha, col).getValue() : "";
  };

  const NOMES = { bach: "Bacharelado", lic: "Licenciatura", psi: "Formação de Psicólogo(a)" };

  const ativas = {
    bach: pegar("bachConcluiu") === "SIM",
    lic: pegar("licConcluiu") === "SIM",
    psi: pegar("psiConcluiu") === "SIM"
  };

  if (!ativas.bach && !ativas.lic && !ativas.psi) {
    throw new Error("Esse aluno não tem nenhuma habilitação marcada — não é possível avançar para Diploma.");
  }

  const pendentes = ["bach", "lic", "psi"].filter(hab =>
    ativas[hab] && pegarOpcional(CHAVES_COLACAO[hab]) !== "SIM"
  );

  if (pendentes.length > 0) {
    throw new Error("Ainda falta marcar 'Colação de Grau Realizada' para: " + pendentes.map(h => NOMES[h]).join(", ") + ".");
  }

  const col = obterOuCriarColuna_(aba, mapa, "statusColacaoEncerramento");
  aba.getRange(linha, col).setValue("OK");

}

function salvarColacaoEAvancar(registroId, versaoEsperada, colacao) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapa_(aba, mapa, linha, "colacao");
    salvarColacaoRealizada_(aba, mapa, linha, colacao);
    avancarParaDiploma_(aba, mapa, linha);
    return {};
  });
}

function devolverParaColacao(registroId, versaoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {
    exigirEtapaEm_(aba, mapa, linha, ["diploma"]);
    const col = obterOuCriarColuna_(aba, mapa, "statusColacaoEncerramento");
    aba.getRange(linha, col).setValue("");
    return {};
  });
}

function salvarDiplomaEmitido_(aba, mapa, linha, diploma) {
  ["bach", "lic", "psi"].forEach(hab => {
    const col = obterOuCriarColuna_(aba, mapa, CHAVES_DIPLOMA[hab]);
    aba.getRange(linha, col).setValue(diploma[hab] ? "SIM" : "NÃO");
  });
}

function obterStatusColacaoEDiploma_(aba, mapa, linha) {

  const ler = (chaveDict, hab) => {
    const col = obterColunaOpcional_(mapa, chaveDict[hab]);
    return col ? aba.getRange(linha, col).getValue() === "SIM" : false;
  };

  return {
    colacao: { bach: ler(CHAVES_COLACAO, "bach"), lic: ler(CHAVES_COLACAO, "lic"), psi: ler(CHAVES_COLACAO, "psi") },
    diploma: { bach: ler(CHAVES_DIPLOMA, "bach"), lic: ler(CHAVES_DIPLOMA, "lic"), psi: ler(CHAVES_DIPLOMA, "psi") }
  };

}

/*=====================================================
  E-MAIL — camada institucional única (P1.13): só
  MailApp, sem fallback silencioso pra outro remetente.
  A conta que efetivamente envia é sempre a que executa
  o Web App (gradip@usp.br, via deploy "Only myself" +
  "Execute as: me" — ver checklist de deployment no
  relatório). Como o sistema só ENVIA e nunca lê a caixa
  de entrada, MailApp evita a fragilidade de escopo do
  GmailApp sem perder nenhuma funcionalidade necessária.
=====================================================*/

function enviarEmailInstitucional_(opcoes) {

  const params = {
    name: "Serviço de Graduação — IPUSP",
    replyTo: EMAIL_REMETENTE
  };

  if (opcoes.cc) params.cc = Array.isArray(opcoes.cc) ? opcoes.cc.join(",") : opcoes.cc;
  if (opcoes.bcc) params.bcc = Array.isArray(opcoes.bcc) ? opcoes.bcc.join(",") : opcoes.bcc;
  if (opcoes.anexos) params.attachments = opcoes.anexos;

  const destinatarioPrincipal = opcoes.to || EMAIL_REMETENTE;

  // Erro de envio propaga pro chamador — nunca marcamos "enviado"
  // sem essa chamada ter dado certo de verdade.
  MailApp.sendEmail(destinatarioPrincipal, opcoes.assunto, opcoes.corpo, params);

}

function dividirEmChunks_(lista, tamanho) {
  const chunks = [];
  for (let i = 0; i < lista.length; i += tamanho) chunks.push(lista.slice(i, i + tamanho));
  return chunks;
}

// Monta o corpo + manda o e-mail de diploma; NÃO mexe na coluna de
// status — isso é responsabilidade de quem chama (salvarDiplomaEEnviarEmail),
// que já está com o registro reservado sob lock.
function enviarEmailDiploma_(aba, mapa, linha, diplomasSelecionados) {

  const nomeCompleto = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const email = aba.getRange(linha, obterColuna_(mapa, "email")).getValue();
  const primeiroNome = String(nomeCompleto).trim().split(" ")[0];

  if (!email) throw new Error("Esse aluno não tem e-mail cadastrado.");

  const NOMES_HABILITACAO = { bach: "Bacharelado", lic: "Licenciatura", psi: "Psicólogo(a)" };

  const diplomasTexto = ["bach", "lic", "psi"]
    .filter(hab => diplomasSelecionados[hab])
    .map(hab => NOMES_HABILITACAO[hab]);

  if (diplomasTexto.length === 0) {
    throw new Error("Selecione ao menos um diploma antes de enviar o e-mail.");
  }

  const singular = diplomasTexto.length === 1;

  const hora = new Date().getHours();
  let saudacao;
  if (hora >= 0 && hora < 12) saudacao = "Bom dia";
  else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
  else saudacao = "Boa noite";

  const introducao = singular ? "Informo que seu diploma de:" : "Informo que seus diplomas de:";
  const listaDiplomas = diplomasTexto.map(d => `• ${d}`).join("\n");

  const corpo = `${saudacao}, ${primeiroNome}.

${introducao}

${listaDiplomas}

${singular ? "Foi despachado" : "Foram despachados"} para expedição e, em até 3 dias úteis, estar${singular ? "á" : "ão"} disponíve${singular ? "l" : "is"} na plataforma Alumni.

Atenciosamente,
Equipe do Serviço de Graduação`;

  enviarEmailInstitucional_({ to: email, assunto: "Diploma despachado para expedição", corpo: corpo });

  return `Enviado em ${Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm")}`;

}

// Diploma emitido / e-mail enviado / processo concluído continuam
// sendo UM clique só na UX (preservado), mas por dentro cada estado
// tem seu próprio significado: os flags de diploma são gravados
// primeiro; SÓ DEPOIS tentamos enviar o e-mail, com reserva
// ("ENVIANDO…") pra evitar duplo-envio por duplo-clique ou duas
// sessões. Se o e-mail falhar, os flags de diploma continuam
// gravados (são eventos diferentes, de propósito — não fazemos
// rollback automático) mas o e-mail NÃO fica marcado como enviado.
function salvarDiplomaEEnviarEmail(registroId, versaoEsperada, diplomas, reenviar) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let aba, mapa, linha, colEmailEnviado, valorAnterior;

  try {
    const resolvido = resolverRegistroPorId_(registroId);
    aba = resolvido.aba; mapa = resolvido.mapa; linha = resolvido.linha;

    exigirEtapa_(aba, mapa, linha, "diploma");
    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);

    colEmailEnviado = obterOuCriarColuna_(aba, mapa, "emailDiplomaEnviado");
    valorAnterior = aba.getRange(linha, colEmailEnviado).getValue();

    if (valorAnterior === "ENVIANDO…") {
      throw new Error("Já existe um envio em andamento para esse aluno (outra sessão pode estar processando agora). Tente de novo em instantes.");
    }
    if (valorAnterior && !reenviar) {
      throw new Error(`REENVIO_NECESSARIO: Esse aluno já recebeu o e-mail de diploma (${valorAnterior}).`);
    }

    salvarDiplomaEmitido_(aba, mapa, linha, diplomas);
    aba.getRange(linha, colEmailEnviado).setValue("ENVIANDO…");

  } finally {
    lock.releaseLock();
  }

  let carimbo;
  try {
    carimbo = enviarEmailDiploma_(aba, mapa, linha, diplomas);
  } catch (err) {
    const lockErro = LockService.getScriptLock();
    lockErro.waitLock(10000);
    try { aba.getRange(linha, colEmailEnviado).setValue(valorAnterior || ""); } finally { lockErro.releaseLock(); }
    throw err;
  }

  const lockFinal = LockService.getScriptLock();
  lockFinal.waitLock(10000);
  let novaVersao;
  try {
    aba.getRange(linha, colEmailEnviado).setValue(carimbo);
    const colExpedido = obterOuCriarColuna_(aba, mapa, "diplomaExpedido");
    aba.getRange(linha, colExpedido).setValue("SIM");
    novaVersao = incrementarVersao_(aba, mapa, linha);
  } finally {
    lockFinal.releaseLock();
  }

  return { sucesso: true, emailDiplomaEnviado: carimbo, versao: novaVersao, registroId: registroId };

}

/*=====================================================
  E-MAIL DE CONVOCAÇÃO — COLAÇÃO DE GRAU (individual e
  em lote/CCO). Mesma política de decisão institucional
  preservada: o PDF em lote traz nome+habilitação de
  TODOS os selecionados e vai igual pra cada um via CCO
  (comportamento intencional — ver relatório).
=====================================================*/

function gerarBlobConviteColacao_(alunosOrdenados, dataColacao) {

  const copia = DriveApp.getFileById(obterIdRecursoDiplomas_("TEMPLATE_FORMANDOS_ID", "file")).makeCopy("Convite Colação de Grau (temp)");

  try {

    const doc = DocumentApp.openById(copia.getId());
    const corpo = doc.getBody();

    corpo.setMarginLeft(45).setMarginRight(45);

    const titulo = corpo.appendParagraph(`Colação de Grau – ${dataColacao}`);
    titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    const subtitulo = corpo.appendParagraph("Assistência Acadêmica - Bloco G - IPUSP");
    subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitulo.setBold(true);

    corpo.appendParagraph("");

    const linhasTabela = [["NOME", "HABILITAÇÃO(ÕES)"]];
    alunosOrdenados.forEach(a => linhasTabela.push([a.nome, a.habilitacaoTexto]));

    const tabela = corpo.appendTable(linhasTabela);

    const linhaCabecalho = tabela.getRow(0);
    for (let c = 0; c < 2; c++) {
      const texto = linhaCabecalho.getCell(c).editAsText();
      texto.setBold(true);
      texto.setFontSize(11);
    }

    for (let r = 1; r < tabela.getNumRows(); r++) {
      for (let c = 0; c < 2; c++) {
        tabela.getRow(r).getCell(c).editAsText().setFontSize(10);
      }
    }

    const larguraUtil = corpo.getPageWidth() - corpo.getMarginLeft() - corpo.getMarginRight();
    const largNome = Math.round(larguraUtil * 0.55);
    tabela.setColumnWidth(0, largNome);
    tabela.setColumnWidth(1, larguraUtil - largNome);

    doc.saveAndClose();

    const pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
    pdfBlob.setName(`Convite_Colacao_de_Grau_${dataColacao.replace(/\//g, "-")}.pdf`);

    return pdfBlob;

  } finally {
    // Temp SEMPRE limpo, mesmo se algo acima lançar erro.
    try { DriveApp.getFileById(copia.getId()).setTrashed(true); } catch (e) { /* já pode ter sumido */ }
  }

}

// Envio em lote com reserva: sob lock (curto), resolve cada ID,
// filtra quem já recebeu esse aviso e RESERVA os pendentes
// ("ENVIANDO…") antes de soltar o lock — impede que duas sessões
// escolham os mesmos alunos enquanto o envio de verdade (lento,
// via rede) roda sem segurar lock. Respeita o limite de
// destinatários por mensagem dividindo em blocos, e confere a cota
// diária ANTES de começar a mandar qualquer coisa.
function enviarEmailColacaoLote(registroIds, dataColacao, horaColacao) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const ids = validarArrayDeIds_(registroIds);
  const dataValidada = validarDataBr_(dataColacao);
  const horaValidada = validarHorario_(horaColacao);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  let aba, mapa, colEmailColacao;
  const pendentes = [];
  let ignoradosJaEnviados = 0;

  try {

    aba = obterAba_();
    mapa = mapearCabecalhos_(aba);
    colEmailColacao = obterOuCriarColuna_(aba, mapa, "emailColacaoEnviado");

    const colNome = obterColuna_(mapa, "nome");
    const colEmail = obterColuna_(mapa, "email");
    const colBach = obterColuna_(mapa, "bachConcluiu");
    const colLic = obterColuna_(mapa, "licConcluiu");
    const colPsi = obterColuna_(mapa, "psiConcluiu");

    ids.forEach(id => {

      let linha;
      try {
        linha = localizarLinhaPorId_(aba, mapa, id);
      } catch (err) {
        return; // registro sumiu/duplicado — pula sem travar os demais
      }

      const jaEnviado = aba.getRange(linha, colEmailColacao).getValue();
      if (jaEnviado) { ignoradosJaEnviados++; return; }

      pendentes.push({
        linha: linha,
        nome: aba.getRange(linha, colNome).getValue(),
        email: aba.getRange(linha, colEmail).getValue(),
        habilitacaoTexto: calcularHabilitacaoTextoAtual_(
          aba.getRange(linha, colBach).getValue() === "SIM",
          aba.getRange(linha, colLic).getValue() === "SIM",
          aba.getRange(linha, colPsi).getValue() === "SIM"
        )
      });

    });

    pendentes.forEach(p => aba.getRange(p.linha, colEmailColacao).setValue("ENVIANDO…"));

  } finally {
    lock.releaseLock();
  }

  if (pendentes.length === 0) {
    throw new Error("Todos os alunos selecionados já haviam recebido esse e-mail antes.");
  }

  pendentes.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  const comEmail = pendentes.filter(p => p.email);
  const semEmail = pendentes.filter(p => !p.email);

  if (semEmail.length > 0) {
    liberarReserva_(aba, colEmailColacao, semEmail);
  }

  if (comEmail.length === 0) {
    throw new Error("Nenhum dos alunos pendentes tem e-mail cadastrado.");
  }

  const chunks = dividirEmChunks_(comEmail, MAX_DESTINATARIOS_BCC_POR_ENVIO);
  const restante = MailApp.getRemainingDailyQuota();

  if (restante < chunks.length) {
    liberarReserva_(aba, colEmailColacao, comEmail);
    throw new Error(
      `Cota diária de e-mail insuficiente: restam ${restante} envio(s) hoje na conta ${EMAIL_REMETENTE}, ` +
      `mas esse lote precisaria de ${chunks.length} mensagem(ns) (blocos de até ${MAX_DESTINATARIOS_BCC_POR_ENVIO} ` +
      `destinatários cada). Nada foi enviado — tente novamente amanhã ou reduza a seleção.`
    );
  }

  const pdfBlob = gerarBlobConviteColacao_(pendentes, dataValidada);

  const corpo = `Prezadas(os) formandas(os).

Segue a lista com o nome das(os) formandas(os) e o(s) respectivo(s) grau(s) concluído(s), para fins de participação na próxima colação de grau, que será realizada no dia ${dataValidada}, às ${horaValidada}, no Auditório Carolina Bori - Instituto de Psicologia (Bloco G).

Por favor, verifique se a grafia do seu nome está correta, de acordo com a certidão de nascimento, assim como o(s) grau(s) concluído(s).

Favor chegar com 15 minutos de antecedência.
Convidadas(os) são bem-vindas(os).

Atenciosamente,
Assistência Acadêmica e Serviço de Graduação do IPUSP`;

  let totalEnviados = 0;
  const falhas = [];

  chunks.forEach(chunk => {
    try {

      enviarEmailInstitucional_({
        bcc: chunk.map(p => p.email),
        assunto: "Convocação — Colação de Grau",
        corpo: corpo,
        anexos: [pdfBlob]
      });

      const carimbo = `Enviado em ${Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm")}`;
      marcarEnviado_(aba, colEmailColacao, chunk, carimbo);
      totalEnviados += chunk.length;

    } catch (err) {
      liberarReserva_(aba, colEmailColacao, chunk);
      falhas.push({ quantidade: chunk.length, erro: err.message });
    }
  });

  return {
    sucesso: true,
    enviados: totalEnviados,
    semEmailCadastrado: semEmail.length,
    ignoradosJaEnviados: ignoradosJaEnviados,
    falhas: falhas
  };

}

function liberarReserva_(aba, coluna, itens) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    itens.forEach(p => aba.getRange(p.linha, coluna).setValue(""));
  } finally {
    lock.releaseLock();
  }
}

function marcarEnviado_(aba, coluna, itens, carimbo) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    itens.forEach(p => aba.getRange(p.linha, coluna).setValue(carimbo));
  } finally {
    lock.releaseLock();
  }
}

// Individual, com a mesma reserva + idempotência do lote, e com
// pedido explícito de confirmação de reenvio (REENVIO_NECESSARIO)
// em vez de recusar silenciosamente ou reenviar sem avisar.
function enviarEmailColacaoIndividual(registroId, versaoEsperada, dataColacao, horaColacao, reenviar) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const dataValidada = validarDataBr_(dataColacao);
  const horaValidada = validarHorario_(horaColacao);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let aba, mapa, linha, colEmailColacao, valorAnterior;

  try {

    const resolvido = resolverRegistroPorId_(registroId);
    aba = resolvido.aba; mapa = resolvido.mapa; linha = resolvido.linha;

    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);

    colEmailColacao = obterOuCriarColuna_(aba, mapa, "emailColacaoEnviado");
    valorAnterior = aba.getRange(linha, colEmailColacao).getValue();

    if (valorAnterior === "ENVIANDO…") {
      throw new Error("Já existe um envio em andamento para esse aluno. Tente de novo em instantes.");
    }
    if (valorAnterior && !reenviar) {
      throw new Error(`REENVIO_NECESSARIO: Esse aluno já recebeu esse e-mail (${valorAnterior}).`);
    }

    aba.getRange(linha, colEmailColacao).setValue("ENVIANDO…");

  } finally {
    lock.releaseLock();
  }

  const nomeCompleto = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const email = aba.getRange(linha, obterColuna_(mapa, "email")).getValue();
  const primeiroNome = String(nomeCompleto).trim().split(" ")[0];

  const finalizarComErro = (err) => {
    const lockErro = LockService.getScriptLock();
    lockErro.waitLock(10000);
    try { aba.getRange(linha, colEmailColacao).setValue(valorAnterior || ""); } finally { lockErro.releaseLock(); }
    throw err;
  };

  if (!email) return finalizarComErro(new Error("Esse aluno não tem e-mail cadastrado."));

  const bachConcluiu = aba.getRange(linha, obterColuna_(mapa, "bachConcluiu")).getValue() === "SIM";
  const licConcluiu = aba.getRange(linha, obterColuna_(mapa, "licConcluiu")).getValue() === "SIM";
  const psiConcluiu = aba.getRange(linha, obterColuna_(mapa, "psiConcluiu")).getValue() === "SIM";

  const NOMES_HABILITACAO = { psi: "Formação de Psicólogo(a)", bach: "Bacharelado", lic: "Licenciatura" };
  const ativas = [];
  if (psiConcluiu) ativas.push(NOMES_HABILITACAO.psi);
  if (bachConcluiu) ativas.push(NOMES_HABILITACAO.bach);
  if (licConcluiu) ativas.push(NOMES_HABILITACAO.lic);

  if (ativas.length === 0) return finalizarComErro(new Error("Esse aluno não tem nenhuma habilitação concluída marcada."));

  const singular = ativas.length === 1;
  const textoHabilitacoes = juntarComE_(ativas);
  const referencia = singular ? `à habilitação de ${textoHabilitacoes}` : `às habilitações de ${textoHabilitacoes}`;

  const hora = new Date().getHours();
  let saudacao;
  if (hora >= 0 && hora < 12) saudacao = "Bom dia";
  else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
  else saudacao = "Boa noite";

  const corpo = `${saudacao}, ${primeiroNome}.

Informamos que a sua colação de grau referente ${referencia} foi agendada para o dia ${dataValidada}, às ${horaValidada}.

Favor chegar com 15 minutos de antecedência.
Convidadas(os) são bem-vindas(os).

Atenciosamente,
Assistência Acadêmica e Serviço de Graduação do IPUSP`;

  try {
    enviarEmailInstitucional_({ to: email, assunto: "Convocação — Colação de Grau", corpo: corpo });
  } catch (err) {
    return finalizarComErro(err);
  }

  const carimbo = `Enviado em ${Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm")}`;

  const lockFinal = LockService.getScriptLock();
  lockFinal.waitLock(10000);
  let novaVersao;
  try {
    aba.getRange(linha, colEmailColacao).setValue(carimbo);
    novaVersao = incrementarVersao_(aba, mapa, linha);
  } finally {
    lockFinal.releaseLock();
  }

  return { sucesso: true, emailColacaoEnviado: carimbo, versao: novaVersao, registroId: registroId };

}

// Desmarca manualmente o carimbo de "e-mail enviado" (colação ou
// diploma) — usado quando a pessoa da equipe precisa liberar o
// reenvio de propósito (ex: e-mail voltou como não entregue).
// Continua contando como reenvio EXPLÍCITO: alguém teve que entrar
// no card do aluno e apertar esse botão de novo, não é um clique
// acidental. Ao desmarcar, esse aluno volta a ser elegível pra um
// próximo envio em LOTE também (a lista de pendentes do lote se
// baseia exatamente nessa coluna estar vazia).
function desmarcarEmailEnviado(registroId, versaoEsperada, tipo) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  if (tipo !== "colacao" && tipo !== "diploma") {
    throw new Error("Tipo de e-mail inválido.");
  }

  return executarMutacao_(registroId, versaoEsperada, (aba, mapa, linha) => {

    const chave = tipo === "colacao" ? "emailColacaoEnviado" : "emailDiplomaEnviado";
    const col = obterOuCriarColuna_(aba, mapa, chave);
    const valorAtual = aba.getRange(linha, col).getValue();

    if (valorAtual === "ENVIANDO…") {
      throw new Error("Esse e-mail está sendo enviado agora por outra sessão — espere terminar antes de desmarcar.");
    }

    aba.getRange(linha, col).setValue("");

    return {};

  });

}

/*=====================================================
  OBSERVAÇÕES — .txt na pasta do aluno, com controle de
  versão (timestamp do próprio arquivo no Drive) pra
  evitar que duas sessões editando ao mesmo tempo percam
  a escrita uma da outra silenciosamente.
=====================================================*/

function obterObservacoes(registroId) {
  exigirLeitorDiplomas_(); // DiplomasAcesso.gs

  const usuario = usuarioAtualDiplomas_(); // já conferido acima, sem nova leitura
  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  // LEITOR só consulta: localizar a pasta sem criar pasta, cadastro na
  // planilha central nem colunas (revisão independente do PR #42, B1).
  // O ADMINISTRADOR mantém o comportamento da 3.x.
  const pastaValidada = usuario.perfil === ACESSO_DIPLOMAS.ADMINISTRADOR
    ? garantirPastaInterno_(aba, mapa, linha)
    : localizarPastaSemGravar_(aba, mapa, linha);
  if (!pastaValidada) return { texto: "", versaoArquivo: 0 };

  const nome = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const colacao = aba.getRange(linha, obterColuna_(mapa, "colacao")).getValue();
  const nomeArquivo = `Observações - ${nome} - ${colacao}.txt`;

  const iterador = pastaValidada.getFilesByName(nomeArquivo);
  if (iterador.hasNext()) {
    const arquivo = iterador.next();
    return { texto: arquivo.getBlob().getDataAsString("UTF-8"), versaoArquivo: arquivo.getLastUpdated().getTime() };
  }

  // Compatibilidade: nome antigo (sem colação no nome), de antes
  // desta rodada de hardening — só leitura, nunca migra sozinho.
  const nomeAntigo = `Observações - ${nome}.txt`;
  const iteradorAntigo = pastaValidada.getFilesByName(nomeAntigo);
  if (iteradorAntigo.hasNext()) {
    const arquivo = iteradorAntigo.next();
    return { texto: arquivo.getBlob().getDataAsString("UTF-8"), versaoArquivo: arquivo.getLastUpdated().getTime() };
  }

  return { texto: "", versaoArquivo: 0 };

}

function salvarObservacoes(registroId, texto, versaoArquivoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);

  const nome = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const colacao = aba.getRange(linha, obterColuna_(mapa, "colacao")).getValue();
  const nomeArquivo = `Observações - ${nome} - ${colacao}.txt`;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const iterador = pastaValidada.getFilesByName(nomeArquivo);
    if (iterador.hasNext()) {
      const existente = iterador.next();
      const versaoAtual = existente.getLastUpdated().getTime();
      if (versaoArquivoEsperada && versaoAtual !== versaoArquivoEsperada) {
        throw new Error(
          "As observações foram alteradas por outra sessão desde que você abriu esse painel. " +
          "Recarregue antes de salvar, pra não sobrescrever o que a outra pessoa escreveu."
        );
      }
    }

    const novoArquivo = substituirArquivoComSeguranca_(pastaValidada, nomeArquivo, () =>
      pastaValidada.createFile(nomeArquivo, texto, MimeType.PLAIN_TEXT)
    );

    return { sucesso: true, versaoArquivo: novoArquivo.getLastUpdated().getTime() };

  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  GERAÇÃO DE OFÍCIO / CERTIFICADO
=====================================================*/

const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro"];

function formatarDataPorExtenso_(dataColacao) {

  if (!dataColacao) {
    const hoje = new Date();
    return `${hoje.getDate()} de ${MESES_PT[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  }

  const partes = String(dataColacao).trim().split("/");
  if (partes.length !== 3) return dataColacao;

  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const ano = partes[2];

  if (!dia || !mes || mes < 1 || mes > 12) return dataColacao;

  return `${dia} de ${MESES_PT[mes - 1]} de ${ano}`;

}

// Escapa caracteres especiais de regex — necessário porque
// Body.replaceText() do Google Docs trata o primeiro argumento como
// uma expressão regular, e alguns dos textos fixos do modelo do
// ofício (ex: "Exmª. Srª.") têm pontos, que em regex significam
// "qualquer caractere" se não forem escapados.
function escapeRegExpDoc_(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lê, na aba INFOS, o nome e o gênero do(a) Secretário(a) Geral atual
// (Coluna C = nome, Coluna D = gênero, na linha LINHA_SECRETARIO_GERAL_INFOS)
// e devolve já prontos os textos de tratamento formal usados no ofício,
// com a concordância de gênero certa.
function obterSecretarioGeral_() {

  const ss = abrirPlanilhaDiplomas_();
  const aba = ss.getSheetByName(ABA_INFOS);
  if (!aba) {
    throw new Error(`Não encontrei a aba "${ABA_INFOS}" pra descobrir quem é o(a) Secretário(a) Geral atual.`);
  }

  const nome = String(aba.getRange(LINHA_SECRETARIO_GERAL_INFOS, COL_SECRETARIO_GERAL_NOME).getValue() || "").trim();
  const genero = validarGenero_(aba.getRange(LINHA_SECRETARIO_GERAL_INFOS, COL_SECRETARIO_GERAL_GENERO).getValue());

  if (!nome) {
    throw new Error(
      `O nome do(a) Secretário(a) Geral não está preenchido na aba "${ABA_INFOS}" ` +
      `(coluna C, linha ${LINHA_SECRETARIO_GERAL_INFOS}). Preencha antes de gerar o ofício.`
    );
  }
  if (!genero) {
    throw new Error(
      `O gênero (M/F) do(a) Secretário(a) Geral não está preenchido corretamente na aba "${ABA_INFOS}" ` +
      `(coluna D, linha ${LINHA_SECRETARIO_GERAL_INFOS}). Use "M" ou "F".`
    );
  }

  const ehFeminino = genero === "F";

  return {
    nome: nome,
    prezado: ehFeminino ? "Prezada" : "Prezado",
    cargo: ehFeminino ? "Secretária Geral" : "Secretário Geral",
    tratamento: ehFeminino ? "Exmª. Srª." : "Exmº. Sr.",
    profDr: ehFeminino ? "Prof.ª Dr.ª" : "Prof. Dr."
  };

}

// Substitui, no corpo do Ofício já copiado (ANTES de doc.saveAndClose()),
// os quatro trechos fixos do modelo que mencionam quem é o(a)
// Secretário(a) Geral, pelo texto certo pro nome/gênero cadastrados
// agora na aba INFOS. Funciona em cima do texto literal atual do
// modelo (não são {{CAMPOS}}) — se um dia alguém reescrever à mão
// esses trechos no Google Docs do modelo (ID_MODELO_OFICIO), ajuste
// os literais abaixo (ou troque o modelo por {{SECRETARIO_...}} e
// simplifique esta função pra usar o mesmo loop de replaceText do
// resto do documento).
function aplicarCamposSecretarioGeral_(corpo) {

  const secretario = obterSecretarioGeral_();

  corpo.replaceText(
    escapeRegExpDoc_("Prezada Secretária Geral."),
    `${secretario.prezado} ${secretario.cargo}.`
  );

  corpo.replaceText(
    escapeRegExpDoc_("Exmª. Srª."),
    secretario.tratamento
  );

  corpo.replaceText(
    escapeRegExpDoc_("Prof.ª Dr.ª Marina Gallottini"),
    `${secretario.profDr} ${secretario.nome}`
  );

  corpo.replaceText(
    escapeRegExpDoc_("Secretária Geral da Universidade de São Paulo"),
    `${secretario.cargo} da Universidade de São Paulo`
  );

}

function calcularCamposDocumento_(aba, mapa, linha, dataColacao) {

  const dados = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
  const pegar = (chave) => dados[obterColuna_(mapa, chave) - 1];

  const genero = validarGenero_(pegar("genero"));
  if (!genero) {
    throw new Error(
      "Esse aluno não tem gênero (M/F) definido — é obrigatório pra gerar o documento oficial " +
      "com a concordância gramatical correta. Preencha em 'Dados do Aluno' antes de gerar."
    );
  }

  const ehFeminino = genero === "F";

  const bachTexto = ehFeminino ? "Bacharela em Psicologia" : "Bacharel em Psicologia";
  const psiTexto = ehFeminino ? "Psicóloga" : "Psicólogo";
  const licTexto = ehFeminino ? "Licenciada em Psicologia" : "Licenciado em Psicologia";

  const habilitacoesConcluidas = [];

  if (pegar("bachConcluiu") === "SIM") {
    const ano = String(pegar("bachAno") || "").trim();
    if (!/^\d{4}$/.test(ano)) throw new Error("Ano do Bacharelado ausente ou inválido — preencha antes de gerar o documento.");
    habilitacoesConcluidas.push({ texto: bachTexto, ano: ano });
  }
  if (pegar("psiConcluiu") === "SIM") {
    const ano = String(pegar("psiAno") || "").trim();
    if (!/^\d{4}$/.test(ano)) throw new Error("Ano da Formação de Psicólogo(a) ausente ou inválido — preencha antes de gerar o documento.");
    habilitacoesConcluidas.push({ texto: psiTexto, ano: ano });
  }
  if (pegar("licConcluiu") === "SIM") {
    const ano = String(pegar("licAno") || "").trim();
    if (!/^\d{4}$/.test(ano)) throw new Error("Ano da Licenciatura ausente ou inválido — preencha antes de gerar o documento.");
    habilitacoesConcluidas.push({ texto: licTexto, ano: ano });
  }

  if (habilitacoesConcluidas.length === 0) {
    throw new Error("Esse aluno não tem nenhuma habilitação concluída marcada — não há o que gerar.");
  }

  // Se TODAS as habilitações concluídas foram no mesmo ano, o ano
  // aparece uma vez só, no final ("Bacharela em Psicologia e
  // Psicóloga no ano letivo de 2025") em vez de repetido em cada uma
  // ("... no ano de 2025 e Psicóloga no ano de 2025"). Só quando os
  // anos são DIFERENTES é que cada habilitação leva o próprio ano
  // junto, pra não perder essa informação.
  const anosUnicos = Array.from(new Set(habilitacoesConcluidas.map(h => h.ano)));

  let graus;
  if (anosUnicos.length === 1) {
    const textos = habilitacoesConcluidas.map(h => h.texto);
    graus = `${juntarComE_(textos)} no ano letivo de ${anosUnicos[0]}`;
  } else {
    const textosComAno = habilitacoesConcluidas.map(h => `${h.texto} no ano de ${h.ano}`);
    graus = juntarComE_(textosComAno);
  }

  const concordancia = habilitacoesConcluidas.length > 1 ? "os graus" : "o grau";

  return {
    NOME: pegar("nome"),
    RG: pegar("rg"),
    GRAUS: graus,
    CONCORDANCIA: concordancia,
    DATA_POR_EXTENSO: formatarDataPorExtenso_(dataColacao)
  };

}

function juntarComE_(lista) {
  const itens = lista.filter(v => v !== "" && v !== null && v !== undefined);
  if (itens.length === 0) return "";
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

// Gera o PDF (ofício ou certificado) de UM aluno: salva na pasta dele
// (com substituição segura — cria o novo antes de remover o antigo)
// e devolve o blob pronto. O Doc temporário é sempre limpo em
// finally, mesmo se algo no meio do caminho der erro.
function gerarPdfDocumento_(aba, mapa, linha, tipoDocumento, dataColacao) {

  const idModelo = tipoDocumento === "oficio"
    ? obterIdRecursoDiplomas_("TEMPLATE_OFICIO_ID", "file")
    : obterIdRecursoDiplomas_("TEMPLATE_CERTIFICADO_ID", "file");

  if (!idModelo || idModelo.indexOf("COLOQUE_AQUI") === 0) {
    throw new Error("Modelo de documento não configurado no ID_INDEX.");
  }

  const nome = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const colacao = aba.getRange(linha, obterColuna_(mapa, "colacao")).getValue();

  const campos = calcularCamposDocumento_(aba, mapa, linha, dataColacao);
  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);

  const nomeBase = tipoDocumento === "oficio"
    ? `Ofício de Encaminhamento de Diploma - ${nome} - ${colacao}`
    : `Certificado de Conclusão de Curso - ${nome} - ${colacao}`;

  const copia = DriveApp.getFileById(idModelo).makeCopy(nomeBase + " (temp)");

  try {

    const doc = DocumentApp.openById(copia.getId());
    const corpo = doc.getBody();

    Object.keys(campos).forEach(chave => {
      corpo.replaceText(`{{${chave}}}`, String(campos[chave] || ""));
    });

    // Só o ofício menciona o(a) Secretário(a) Geral — o certificado
    // não tem esses trechos, então aqui não faz nada nele.
    if (tipoDocumento === "oficio") {
      aplicarCamposSecretarioGeral_(corpo);
    }

    doc.saveAndClose();

    const pdfBlob = DriveApp.getFileById(copia.getId()).getAs("application/pdf");
    pdfBlob.setName(nomeBase + ".pdf");

    substituirArquivoComSeguranca_(pastaValidada, nomeBase + ".pdf", () => pastaValidada.createFile(pdfBlob));

    const colStatusDoc = tipoDocumento === "oficio"
      ? obterColuna_(mapa, "oficioGerado")
      : obterColuna_(mapa, "certificadoGerado");

    aba.getRange(linha, colStatusDoc).setValue("SIM");

    return { blob: pdfBlob, nomeArquivo: nomeBase + ".pdf", idPasta: pastaValidada.getId() };

  } finally {
    try { DriveApp.getFileById(copia.getId()).setTrashed(true); } catch (e) { /* já pode ter sumido */ }
  }

}

function gerarDocumento(registroId, tipoDocumento, dataColacao) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  tipoDocumento = validarTipoDocumento_(tipoDocumento);
  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);

  const etapaNecessaria = tipoDocumento === "oficio" ? "diploma" : "colacao";
  exigirEtapa_(aba, mapa, linha, etapaNecessaria);

  const dataValidada = dataColacao ? validarDataBr_(dataColacao) : null;

  const resultado = gerarPdfDocumento_(aba, mapa, linha, tipoDocumento, dataValidada);
  return listarArquivosPasta_(resultado.idPasta);

}

function gerarZipDocumentos(registroIds, tipoDocumento, dataColacao) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const ids = validarArrayDeIds_(registroIds);
  tipoDocumento = validarTipoDocumento_(tipoDocumento);
  const dataValidada = dataColacao ? validarDataBr_(dataColacao) : null;
  const etapaNecessaria = tipoDocumento === "oficio" ? "diploma" : "colacao";

  const blobs = [];
  const erros = [];

  ids.forEach(id => {
    try {
      const { aba, mapa, linha } = resolverRegistroPorId_(id);
      exigirEtapa_(aba, mapa, linha, etapaNecessaria);
      blobs.push(gerarPdfDocumento_(aba, mapa, linha, tipoDocumento, dataValidada).blob);
    } catch (err) {
      erros.push({ registroId: id, erro: err.message });
    }
  });

  if (blobs.length === 0) {
    throw new Error("Nenhum documento pôde ser gerado. " + (erros[0] ? erros[0].erro : ""));
  }

  const nomeZip = tipoDocumento === "oficio" ? "oficios_emissao_diploma.zip" : "certificados_de_conclusao_de_curso.zip";
  const zipBlob = Utilities.zip(blobs, nomeZip);

  return { nomeArquivo: nomeZip, base64: Utilities.base64Encode(zipBlob.getBytes()), erros: erros };

}

/*=====================================================
  ADICIONAR / EXCLUIR ALUNO
=====================================================*/

// Já existe linha deste NUSP nesta colação? (lida sob o lock de quem chama)
function existeRegistroMesmaColacao_(aba, mapa, nUsp, colacao) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return false;
  const colNUsp = obterColuna_(mapa, "nUsp");
  const colColacao = obterColuna_(mapa, "colacao");
  const largura = Math.max(colNUsp, colColacao);
  const valores = aba.getRange(2, 1, ultimaLinha - 1, largura).getValues();
  const nUspAlvo = String(nUsp).trim();
  const colacaoAlvo = String(colacao).trim();
  return valores.some(l =>
    String(l[colNUsp - 1] || "").trim() === nUspAlvo &&
    String(l[colColacao - 1] || "").trim() === colacaoAlvo
  );
}

// 4.0.1 — inclusão manual com integridade:
//   - recusa um segundo registro do mesmo NUSP na mesma colação;
//   - grava a linha inteira numa chamada só (appendRow), em vez de
//     reservar getLastRow()+1 e gravar célula por célula (outra
//     gravação no mesmo instante, fora deste projeto, podia cair na
//     mesma linha e misturar dois registros);
//   - depois de gravar, localiza a linha pelo Registro ID e confere
//     NUSP, nome e colação; qualquer diferença é erro de integridade.
function adicionarAluno(colacao, dados) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const colacaoValidada = validarCodigoColacao_(colacao);
  dados = dados || {};
  const nome = sanitizarTextoPlano_(dados.nome);
  const nUsp = normalizarNUsp_(dados.nUsp);

  if (!nome || !nUsp) throw new Error("Preencha ao menos o nome e o Nº USP.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const aba = obterAba_();
    const mapa = mapearCabecalhos_(aba);
    garantirColunasBase_(aba, mapa);

    if (existeRegistroMesmaColacao_(aba, mapa, nUsp, colacaoValidada)) {
      throw new Error(
        "Já existe um registro deste Nº USP nesta colação. Nada foi criado; " +
        "abra o registro existente para corrigir os dados."
      );
    }

    const registroId = Utilities.getUuid();
    const valores = {
      registroId: registroId,
      versao: 1,
      nome: nome,
      nUsp: nUsp,
      email: sanitizarTextoPlano_(dados.email),
      genero: validarGenero_(dados.genero),
      rg: sanitizarTextoPlano_(dados.rg),
      colacao: colacaoValidada,
      bachConcluiu: dados.bachConcluiu ? "SIM" : "NÃO",
      licConcluiu: dados.licConcluiu ? "SIM" : "NÃO",
      psiConcluiu: dados.psiConcluiu ? "SIM" : "NÃO",
      bachAno: sanitizarTextoPlano_(dados.bachAno || ""),
      licAno: sanitizarTextoPlano_(dados.licAno || ""),
      psiAno: sanitizarTextoPlano_(dados.psiAno || "")
    };

    // Todas as colunas são conferidas ANTES de gravar qualquer coisa.
    const colunas = {};
    Object.keys(valores).forEach(chave => { colunas[chave] = obterColuna_(mapa, chave); });

    const largura = aba.getLastColumn();
    const linhaNova = [];
    for (let c = 0; c < largura; c++) linhaNova.push("");
    Object.keys(valores).forEach(chave => { linhaNova[colunas[chave] - 1] = valores[chave]; });

    aba.appendRow(linhaNova);

    conferirInclusao_(aba, mapa, registroId, { nUsp: nUsp, nome: nome, colacao: colacaoValidada });

    return { sucesso: true, registroId: registroId, versao: 1 };

  } finally {
    lock.releaseLock();
  }

}

// Confere, depois de gravar, que existe UMA linha com o Registro ID
// novo e que ela tem o NUSP, o nome e a colação esperados.
function conferirInclusao_(aba, mapa, registroId, esperado) {
  let linha;
  try {
    linha = localizarLinhaPorId_(aba, mapa, registroId);
  } catch (err) {
    throw new Error("Erro de integridade: o registro novo não foi encontrado de forma única depois de gravado. Confira a planilha antes de tentar de novo.");
  }
  const ler = chave => String(aba.getRange(linha, obterColuna_(mapa, chave)).getValue() || "").trim();
  if (ler("nUsp") !== String(esperado.nUsp).trim() ||
      ler("nome") !== String(esperado.nome).trim() ||
      ler("colacao") !== String(esperado.colacao).trim()) {
    Logger.log(`Inclusão divergente na linha ${linha}.`);
    throw new Error("Erro de integridade: a linha gravada não corresponde aos dados enviados. Confira a planilha antes de tentar de novo.");
  }
  return linha;
}

// Lógica de exclusão de UM registro (sem lock — chamadores cuidam
// disso). 4.0.1: remove só a linha desta colação. A pasta do aluno no
// Drive e o "ID da Pasta" da planilha central NUNCA são tocados: a
// pasta é do Nº USP e é usada por outras colações da mesma pessoa e
// por outros sistemas (decisão D5 do responsável, 06/11/2026). Antes,
// a pasta ia para a lixeira quando nenhuma outra linha tinha o cache
// de pasta preenchido, o que não provava que ninguém mais a usava.
function excluirAlunoInterno_(aba, mapa, linha) {

  aba.deleteRow(linha);

}

function excluirAluno(registroId, versaoEsperada) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const aba = obterAba_();
    const mapa = mapearCabecalhos_(aba);
    const linha = localizarLinhaPorId_(aba, mapa, registroId);
    exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);
    excluirAlunoInterno_(aba, mapa, linha);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }

}

// Exclusão em lote sob UM lock (operação deliberada, staff-initiated,
// sempre poucos alunos por vez) — cada ID é resolvido pra sua linha
// ATUAL dentro do próprio loop, então funciona corretamente mesmo com
// deleteRow indo deslocando as posições dos IDs ainda não processados.
function excluirAlunosEmLote(registroIds) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const ids = validarArrayDeIds_(registroIds);

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {

    const aba = obterAba_();
    const mapa = mapearCabecalhos_(aba);
    let excluidos = 0;
    const erros = [];

    ids.forEach(id => {
      try {
        const linha = localizarLinhaPorId_(aba, mapa, id);
        excluirAlunoInterno_(aba, mapa, linha);
        excluidos++;
      } catch (err) {
        erros.push({ registroId: id, erro: err.message });
      }
    });

    return { sucesso: true, excluidos: excluidos, erros: erros };

  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  LISTA DE FORMANDOS — PDF com logo/timbrado, ordem
  alfabética, sigla das habilitações e período.
=====================================================*/

function calcularSiglaHabilitacoes_(bachConcluiu, licConcluiu, psiConcluiu) {
  let sigla = "";
  if (bachConcluiu) sigla += "B";
  if (psiConcluiu) sigla += "P";
  if (licConcluiu) sigla += "L";
  return sigla;
}

function formatarPeriodo_(valor) {
  const texto = String(valor || "").trim();
  if (texto.length === 5) return `${texto.substring(0, 4)}/${texto.substring(4, 5)}`;
  return texto;
}

function gerarListaFormandos(registroIds, dataColacao) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const ids = validarArrayDeIds_(registroIds);
  const dataValidada = validarDataBr_(dataColacao);

  const alunos = [];

  ids.forEach(id => {
    try {
      const { aba, mapa, linha } = resolverRegistroPorId_(id);
      const pegar = (chave) => aba.getRange(linha, obterColuna_(mapa, chave)).getValue();
      alunos.push({
        nome: String(pegar("nome") || ""),
        sigla: calcularSiglaHabilitacoes_(pegar("bachConcluiu") === "SIM", pegar("licConcluiu") === "SIM", pegar("psiConcluiu") === "SIM"),
        periodo: formatarPeriodo_(pegar("colacao"))
      });
    } catch (err) {
      // registro sumiu — segue com os demais
    }
  });

  if (alunos.length === 0) throw new Error("Nenhum dos alunos selecionados foi encontrado.");

  alunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const copia = DriveApp.getFileById(obterIdRecursoDiplomas_("TEMPLATE_FORMANDOS_ID", "file")).makeCopy("Lista de Formandos (temp)");

  try {

    const doc = DocumentApp.openById(copia.getId());
    const corpo = doc.getBody();

    corpo.setMarginLeft(45).setMarginRight(45);

    const titulo = corpo.appendParagraph(`Colação de Grau – ${dataValidada}`);
    titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    const subtitulo = corpo.appendParagraph("Assistência Acadêmica - Bloco G - IPUSP");
    subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitulo.setBold(true);

    corpo.appendParagraph("");

    const linhasTabela = [["", "NOME", "GRAU(S)", "PERÍODO"]];
    alunos.forEach((a, i) => linhasTabela.push([`${i + 1}.`, a.nome, a.sigla, a.periodo]));

    const tabela = corpo.appendTable(linhasTabela);

    const linhaCabecalho = tabela.getRow(0);
    for (let c = 0; c < 4; c++) {
      linhaCabecalho.getCell(c).editAsText().setBold(true).setFontSize(11);
    }

    for (let r = 1; r < tabela.getNumRows(); r++) {
      for (let c = 0; c < 4; c++) {
        tabela.getRow(r).getCell(c).editAsText().setFontSize(10);
      }
    }

    const larguraUtil = corpo.getPageWidth() - corpo.getMarginLeft() - corpo.getMarginRight();
    const largNum = 22;
    const largGrau = 60;
    const largPeriodo = 78;
    const largNome = larguraUtil - largNum - largGrau - largPeriodo;

    tabela.setColumnWidth(0, largNum);
    tabela.setColumnWidth(1, largNome);
    tabela.setColumnWidth(2, largGrau);
    tabela.setColumnWidth(3, largPeriodo);

    doc.saveAndClose();

    const pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
    const nomeArquivo = `Lista_de_Formandos_${dataValidada.replace(/\//g, "-")}.pdf`;
    pdfBlob.setName(nomeArquivo);

    return { nomeArquivo: nomeArquivo, base64: Utilities.base64Encode(pdfBlob.getBytes()) };

  } finally {
    try { DriveApp.getFileById(copia.getId()).setTrashed(true); } catch (e) { /* já pode ter sumido */ }
  }

}
