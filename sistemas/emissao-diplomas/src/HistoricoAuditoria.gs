/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Auditoria (append-only).

  Responsabilidade ÚNICA deste arquivo: gravar, na aba
  "ANALISE_HISTORICO" (já existente na planilha de Regras
  Curriculares, 21 colunas originais + colunas de rastreabilidade —
  engine_version/ruleset_versao/estrutura_curricular — mais
  ruleset_revisao, criada pela migração do Dashboard dos Servidores
  em RODADA A, ver relatório desta rodada), UMA linha por análise
  executada — sucesso, falha de reconciliação, PDF não localizado/
  ambíguo/com MIME ou tamanho inválido, PDF ilegível, ruleset
  indisponível, ou Licenciatura não implementada. TODA tentativa
  legítima de análise (ou seja, que já passou pela resolução do
  registro, checagem de Versão e confirmação da etapa "historico")
  gera uma linha, nunca só as que deram "certo": é assim que a
  auditoria fica completa (nenhuma tentativa de análise desaparece
  sem rastro). Uma chamada que nem chega a representar uma tentativa
  legítima (Registro ID inexistente, Versão já desatualizada, aluno
  fora da etapa "historico") continua sem gerar linha — ela já é
  barrada antes de qualquer lógica deste módulo.

  NUNCA apaga, edita ou reordena linha existente — só adiciona.
  Colunas são sempre resolvidas por NOME de cabeçalho (linha 1 da
  aba), nunca por posição fixa, do mesmo jeito que
  HistoricoRegrasRepository.gs já faz pras outras abas.

  As colunas "confirmado" / "confirmado_em" / "confirmado_por" /
  "observacao" existem na aba mas são de preenchimento MANUAL pela
  equipe diretamente na planilha (não fazem parte do que foi pedido
  nesta versão) — este módulo nunca escreve nelas, só deixa em
  branco na hora de inserir a linha.

  RODADA B/C: a aba ganha uma 26ª coluna, "sessao_analise_id"
  (HISTORICO_COLUNA_SESSAO_ANALISE, HistoricoConfig.gs), que agrupa
  todas as linhas (uma por habilitação) de UMA MESMA execução de
  análise — nunca reaproveita execucao_id pra esse papel (ver
  HistoricoEndpoints.gs, historicoCriarSessaoAnalise). A coluna é
  criada pela migração idempotente deste próprio arquivo,
  migrarAnaliseHistoricoRelatoriosV1() (fim do arquivo) — não roda
  automaticamente em doGet, é um passo manual único. Linhas gravadas
  ANTES da migração ficam com essa célula vazia pra sempre (nunca
  preenchida retroativamente) — são "legado" só pra quem consulta
  depois (HistoricoConsultas.gs), nunca escrito de volta aqui.

  Toda gravação passa a exigir um sessaoAnaliseId já validado quanto
  ao FORMATO (UUID) pelo chamador — e historicoRegistrarAuditoria_
  ainda faz, sozinha, sob o MESMO lock do appendRow, a checagem
  definitiva de CONSISTÊNCIA (historicoValidarConsistenciaSessao_,
  logo antes da função principal): nenhuma linha já gravada com aquele
  id pode pertencer a um Registro ID diferente do desta gravação. É
  fail-closed — uma inconsistência aborta a gravação inteira em vez de
  gravar uma linha que corromperia o agrupamento da sessão.
=====================================================*/

// Limite de caracteres por célula de JSON — folga proposital abaixo
// do limite real do Google Sheets (50.000 caracteres por célula),
// pra nunca dar erro de gravação por causa de um histórico com
// muitos semestres/disciplinas.
const HISTORICO_AUDITORIA_LIMITE_JSON = 45000;

const HISTORICO_AUDITORIA_COLUNAS_MANUAIS = ["confirmado", "confirmado_em", "confirmado_por", "observacao"];

// Serializa com segurança: nunca lança erro (um problema de
// serialização não pode derrubar a gravação da auditoria) e nunca
// estoura o limite de caracteres da célula — trunca com um marcador
// bem explícito em vez de tentar "consertar" o JSON cortado (o
// arquivo original em Drive, referenciado por hash_sha256, continua
// sendo a fonte da verdade).
function historicoJsonSeguro_(valor, limiteCaracteres) {

  let texto;
  try {
    texto = JSON.stringify(valor === undefined ? null : valor);
  } catch (erro) {
    return JSON.stringify({ erroSerializacao: String(erro && erro.message ? erro.message : erro) });
  }

  if (texto === undefined) texto = "null"; // JSON.stringify(function(){}) etc. devolve undefined

  if (texto.length > limiteCaracteres) {
    return `[TRUNCADO — excedeu ${limiteCaracteres} caracteres; ver arquivo original no Drive pelo hash_sha256] ` +
      texto.slice(0, limiteCaracteres - 120);
  }

  return texto;

}

function historicoObterCabecalhosAuditoria_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) {
    throw new Error(`A aba "${ABA_REGRAS_AUDITORIA}" está sem cabeçalho (linha 1 vazia).`);
  }
  return aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim());
}

// Monta a linha a gravar na ORDEM EXATA dos cabeçalhos reais da aba
// (não uma ordem fixa no código) — qualquer coluna do cabeçalho que
// não estiver em valoresPorNome (as 4 manuais, ou uma coluna nova
// que venha a ser criada na planilha no futuro) simplesmente fica
// "" na linha nova, nunca quebra a gravação.
function historicoMontarLinhaAuditoria_(cabecalhos, valoresPorNome) {
  return cabecalhos.map(nomeColuna => {
    if (!nomeColuna) return "";
    const valor = valoresPorNome[nomeColuna];
    return (valor === undefined || valor === null) ? "" : valor;
  });
}

// Função PURA (RODADA A, extração pra testabilidade — ver
// HistoricoTestes.gs): monta o objeto {nomeColuna: valor} da linha de
// auditoria a partir de valores já calculados, sem tocar em
// planilha/Lock/UUID/relógio nenhum. historicoRegistrarAuditoria_,
// logo abaixo, é quem calcula esses valores (execucaoId, agora, JSONs
// serializados) e faz o appendRow de verdade.
function historicoMontarValoresAuditoria_(execucaoId, sessaoAnaliseId, agora, registro, resultadoMotor, cfgHabilitacao, arquivoInfo, motivosParaAuditoria, dadosExtraidosParaAuditoria) {
  return {
    execucao_id: execucaoId,
    // RODADA B/C — identificador da SESSÃO (agrupa Psi+Bach da mesma
    // execução); "" quando não informado, mesmo padrão já usado nos
    // demais campos opcionais desta função (nunca grava null/undefined
    // cru na planilha). Uma linha gravada sem sessaoAnaliseId (o que só
    // pode acontecer se algum chamador futuro pular a criação da
    // sessão) fica indistinguível de uma linha "legado" pré-migração —
    // aceitável, porque o CONTRATO a partir desta rodada é que toda
    // gravação passa por uma sessão já criada (ver
    // historicoCriarSessaoAnalise em HistoricoEndpoints.gs).
    [HISTORICO_COLUNA_SESSAO_ANALISE]: sessaoAnaliseId || "",
    analisado_em: agora,
    registro_id: registro.registroId || "",
    versao_registro: (registro.versao === undefined || registro.versao === null) ? "" : registro.versao,
    nusp: registro.nusp || "",
    nome: registro.nome || "",
    habilitacao_codigo: cfgHabilitacao.habilitacaoCodigo,
    ruleset_id: resultadoMotor.rulesetId || "",
    ruleset_versao: (resultadoMotor.rulesetVersao === undefined || resultadoMotor.rulesetVersao === null) ? "" : resultadoMotor.rulesetVersao,
    // "ruleset_revisao" (RODADA A): coluna criada pela migração do
    // Dashboard dos Servidores. Mesmo padrão null/undefined -> "" já
    // usado em ruleset_versao — nunca grava 0 quando o valor real é
    // "não se aplica" (ruleset não usado nesta análise).
    ruleset_revisao: (resultadoMotor.rulesetRevisao === undefined || resultadoMotor.rulesetRevisao === null) ? "" : resultadoMotor.rulesetRevisao,
    estrutura_curricular: resultadoMotor.rulesetEstruturaCurricular || "",
    parser_version: resultadoMotor.parserVersion || "",
    engine_version: HISTORICO_ENGINE_VERSION,
    arquivo_id: (arquivoInfo && arquivoInfo.id) || "",
    arquivo_nome: (arquivoInfo && arquivoInfo.nome) || "",
    arquivo_modificado_em: (arquivoInfo && arquivoInfo.modificadoEm) ? new Date(arquivoInfo.modificadoEm) : "",
    hash_sha256: (arquivoInfo && arquivoInfo.hashSha256) || "",
    status_reconciliacao: resultadoMotor.statusReconciliacao || "",
    resultado: resultadoMotor.resultado || "",
    motivos_json: motivosParaAuditoria,
    dados_extraidos_json: dadosExtraidosParaAuditoria
    // confirmado / confirmado_em / confirmado_por / observacao:
    // deixados de fora de propósito — ver cabeçalho do arquivo.
  };
}

// RODADA B/C — checagem de CONSISTÊNCIA de sessão (o FORMATO de UUID
// já foi checado por historicoValidarFormatoUuid_, fora do lock, antes
// de chamar esta função — ver historicoRegistrarAuditoria_). Lê SÓ as
// colunas "registro_id" e HISTORICO_COLUNA_SESSAO_ANALISE — nunca a
// largura inteira da aba, nunca as colunas de JSON — mesma disciplina
// de leitura estreita de historicoLerLinhasGuardaAuditoria_
// (HistoricoRegrasRepository.gs). Recebe "cabecalhos" já lidos pelo
// chamador (historicoObterCabecalhosAuditoria_) em vez de reler a
// linha 1 de novo.
//
// Garante que TODA linha já gravada com este mesmo sessaoAnaliseId
// pertence ao MESMO registroId desta gravação — zero linhas com esse
// id é sempre OK (é a primeira gravação da sessão; o caso normal pra
// toda primeira habilitação de uma execução nova). Uma linha "legado"
// (sessao_analise_id vazio, gravada antes da migração) nunca conflita
// com sessão nenhuma — é ignorada aqui, nunca tratada como pertencendo
// a esta sessão.
//
// Lança erro FAIL-CLOSED se encontrar uma linha da mesma sessão
// pertencente a outro registro — nunca deveria acontecer com um
// servidor que só gera sessaoAnaliseId novo a cada chamada de
// historicoCriarSessaoAnalise (HistoricoEndpoints.gs), mas esta função
// existe justamente pra nunca CONFIAR nisso: protege contra um bug em
// outra camada, ou uma chamada direto da API do Apps Script fora do
// fluxo normal, que tentasse reaproveitar/forjar um sessaoAnaliseId pra
// um registro diferente.
function historicoValidarConsistenciaSessao_(aba, cabecalhos, sessaoAnaliseId, registroId) {

  const colunasNecessarias = ["registro_id", HISTORICO_COLUNA_SESSAO_ANALISE];
  const indice = {};
  colunasNecessarias.forEach(nome => { indice[nome] = cabecalhos.indexOf(nome); });

  const faltando = colunasNecessarias.filter(nome => indice[nome] === -1);
  if (faltando.length > 0) {
    throw new Error(
      `A aba "${ABA_REGRAS_AUDITORIA}" não tem a(s) coluna(s) ${faltando.map(n => `"${n}"`).join(", ")} ` +
      `no cabeçalho (linha 1) — não é possível checar a consistência da sessão de análise antes de gravar ` +
      `(a migração migrarAnaliseHistoricoRelatoriosV1 já foi executada?).`
    );
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return; // aba sem nenhuma linha de dado ainda — nada a checar.

  const numLinhasDado = ultimaLinha - 1;
  const colRegistroId = aba.getRange(2, indice.registro_id + 1, numLinhasDado, 1).getValues();
  const colSessaoId = aba.getRange(2, indice[HISTORICO_COLUNA_SESSAO_ANALISE] + 1, numLinhasDado, 1).getValues();

  const sessaoAnaliseIdNormalizado = historicoTextoOuNulo_(sessaoAnaliseId);
  const registroIdNormalizado = historicoTextoOuNulo_(registroId);

  for (let i = 0; i < numLinhasDado; i++) {
    const sessaoDaLinha = historicoTextoOuNulo_(colSessaoId[i][0]);
    if (sessaoDaLinha !== sessaoAnaliseIdNormalizado) continue; // linha legado (vazia) ou de outra sessão — irrelevante aqui.
    const registroDaLinha = historicoTextoOuNulo_(colRegistroId[i][0]);
    if (registroDaLinha !== registroIdNormalizado) {
      throw new Error(
        `Inconsistência de sessão de análise: o identificador de sessão "${sessaoAnaliseIdNormalizado}" já tem ` +
        `linha(s) gravada(s) para outro Registro ID ("${registroDaLinha}") — esta gravação é para o Registro ` +
        `ID "${registroIdNormalizado}". Gravação BLOQUEADA por segurança (nunca deveria acontecer em uso normal).`
      );
    }
  }

}

/*=====================================================
  Gravação principal.

  registro:            { registroId, versao, nusp, nome } — já
                        re-resolvidos e validados no servidor pelo
                        chamador (HistoricoEndpoints.gs), nunca
                        aceitos crus do cliente aqui.
  resultadoMotor:       objeto devolvido por historicoAvaliarHabilitacao_
                        (SEMPRE tem esse formato, mesmo nos retornos
                        antecipados de erro/CONFERIR).
  dadosExtraidosOriginais: o objeto devolvido por
                        HistoricoParser.extrairDeBase64 no navegador —
                        tanto o formato de sucesso quanto o de erro
                        ({erro, mensagem,...}) — ou null se a análise
                        nem chegou a rodar o parser (ex.: arquivo não
                        localizado na pasta).
  arquivoInfo:          { id, nome, modificadoEm, hashSha256 } ou
                        null quando não havia arquivo pra referenciar.
  sessaoAnaliseId:      (RODADA B/C) o identificador de sessão — já
                        validado quanto ao FORMATO pelo chamador
                        (HistoricoEndpoints.gs, avaliarHistoricoExtraido),
                        mas esta função é quem faz a checagem
                        definitiva de CONSISTÊNCIA (nenhuma linha já
                        gravada com esse mesmo id pertence a outro
                        registro) — de propósito AQUI DENTRO, sob o
                        mesmo lock que protege o appendRow logo abaixo,
                        pra fechar a janela de corrida entre "checar" e
                        "gravar" que existiria se a checagem morasse só
                        no chamador (ver historicoValidarConsistenciaSessao_).
                        Também exige, sozinha, que o formato já seja um
                        UUID válido — defesa em profundidade, mesmo já
                        validado a montante.

  Devolve { execucaoId, gravadoEm } em caso de sucesso. LANÇA ERRO
  se não conseguir gravar (lock não obtido, aba/coluna sumiu, sessão
  malformada/inconsistente etc.) — de propósito: quem chama PRECISA
  saber que o registro de auditoria falhou, pra nunca apresentar um
  resultado de análise como "auditado" quando na verdade não foi. Se a
  coluna "sessao_analise_id" ainda não existir na aba (migração não
  rodada), historicoValidarConsistenciaSessao_ já barra a gravação com
  uma mensagem clara, antes mesmo de calcular execucaoId/JSONs — a
  checagem de colunas essenciais mais abaixo (bloco "faltando") continua
  ali como segunda rede de segurança, cobrindo qualquer outra coluna
  que venha a faltar.
=====================================================*/
function historicoRegistrarAuditoria_(registro, resultadoMotor, dadosExtraidosOriginais, arquivoInfo, sessaoAnaliseId) {

  // Formato, fora do lock (pura, barata, não precisa serializar com
  // mais ninguém) — falha cedo e com mensagem clara antes de gastar
  // qualquer tempo de lock com uma sessão obviamente inválida.
  historicoValidarFormatoUuid_(sessaoAnaliseId, "Identificador de sessão de análise");

  const trava = LockService.getScriptLock();
  const obteveTrava = trava.tryLock(10000);
  if (!obteveTrava) {
    throw new Error(
      "Não consegui gravar a auditoria da análise de histórico (planilha de Regras Curriculares ocupada — " +
      "tente novamente em alguns segundos)."
    );
  }

  try {

    const planilha = historicoAbrirPlanilhaRegras_();
    const aba = historicoObterAba_(planilha, ABA_REGRAS_AUDITORIA);
    const cabecalhos = historicoObterCabecalhosAuditoria_(aba);

    // Checagem definitiva de CONSISTÊNCIA da sessão — ver docstring do
    // parâmetro sessaoAnaliseId acima e a função abaixo. Roda AQUI,
    // sob o MESMO lock que protege o appendRow mais abaixo, de
    // propósito: fecha a janela de corrida entre "checar" e "gravar"
    // que existiria se essa checagem morasse no chamador
    // (HistoricoEndpoints.gs) em vez de aqui dentro.
    historicoValidarConsistenciaSessao_(aba, cabecalhos, sessaoAnaliseId, registro.registroId);

    const cfgHabilitacao = historicoConfigHabilitacao_(resultadoMotor.habilitacao);
    const execucaoId = Utilities.getUuid();
    const agora = new Date();

    const dadosExtraidosParaAuditoria = historicoJsonSeguro_(
      dadosExtraidosOriginais || null,
      HISTORICO_AUDITORIA_LIMITE_JSON
    );

    // A coluna "motivos_json" guarda, de propósito, mais do que só a
    // lista de motivos: também leva "detalhes" (o relatório completo
    // campo a campo) e o texto de parecer — não existe coluna própria
    // pra isso no layout fixo de 21 colunas já criado, e duplicar
    // tudo isso num JSON só evita inventar coluna nova numa aba que o
    // usuário já criou com um contrato fechado. Documentado também em
    // README_IMPLEMENTACAO.md.
    const motivosParaAuditoria = historicoJsonSeguro_({
      motivos: resultadoMotor.motivos || [],
      detalhes: resultadoMotor.detalhes || null,
      parecerTexto: resultadoMotor.parecerTexto || null,
      avisosParser: resultadoMotor.avisosParser || null,
      camposNaoReconhecidosParser: resultadoMotor.camposNaoReconhecidosParser || null
    }, HISTORICO_AUDITORIA_LIMITE_JSON);

    const valoresPorNome = historicoMontarValoresAuditoria_(
      execucaoId, sessaoAnaliseId, agora, registro, resultadoMotor, cfgHabilitacao, arquivoInfo,
      motivosParaAuditoria, dadosExtraidosParaAuditoria
    );

    const linha = historicoMontarLinhaAuditoria_(cabecalhos, valoresPorNome);

    // Confere que nenhuma coluna ESSENCIAL (tudo, exceto as 4
    // manuais) ficou de fora do cabeçalho real da aba — se a aba foi
    // reformatada e perdeu uma coluna que o código espera, é melhor
    // falhar alto (erro claro) do que gravar uma linha capenga
    // silenciosamente.
    const nomesEssenciais = Object.keys(valoresPorNome);
    const faltando = nomesEssenciais.filter(nome => cabecalhos.indexOf(nome) === -1);
    if (faltando.length > 0) {
      throw new Error(
        `A aba "${ABA_REGRAS_AUDITORIA}" não tem a(s) coluna(s) ${faltando.map(n => `"${n}"`).join(", ")} ` +
        `no cabeçalho (linha 1). Confira se o cabeçalho foi alterado.`
      );
    }

    aba.appendRow(linha);
    SpreadsheetApp.flush();

    return { execucaoId: execucaoId, gravadoEm: agora.toISOString() };

  } finally {
    trava.releaseLock();
  }

}

/*=====================================================
  RODADA B/C — Migração de SCHEMA (só ANALISE_HISTORICO).

  migrarAnaliseHistoricoRelatoriosV1(): função PÚBLICA, sem parâmetro,
  pra ser selecionada manualmente no seletor de função do editor do
  Apps Script e executada uma única vez (ver README_IMPLEMENTACAO.md).
  Idempotente: rodar de novo depois de já ter rodado não faz nada além
  de confirmar que não há nada a fazer. Protegida por ScriptLock, do
  mesmo jeito que migrarParaRegistroId_ (DiplomasBackend.gs) — checagem
  rápida sem lock primeiro, e só entra na seção travada se realmente
  houver trabalho a fazer, pra não pagar o custo de lock toda vez que
  alguém confirma (sem necessidade) que a migração já rodou.

  Faz UMA coisa só: garante que a aba ANALISE_HISTORICO tem a coluna de
  cabeçalho "sessao_analise_id" (HISTORICO_COLUNA_SESSAO_ANALISE). NÃO
  faz nada além disso:
  - NÃO roda automaticamente em doGet (diferente de migrarParaRegistroId_,
    que é chamada ali) — precisa ser disparada manualmente, uma vez,
    por alguém da equipe técnica.
  - NÃO toca em CURRICULOS/REQUISITOS_NUMERICOS/DISCIPLINAS/
    GRUPOS_REGRAS/AUDITORIA_REGRAS_CURRICULARES — este módulo continua
    estritamente só-leitura nessas abas, tanto antes quanto depois
    desta migração.
  - NÃO faz backfill de "sessao_analise_id" pras linhas já existentes
    (fica vazio pra sempre nessas linhas) — nunca inventa/infere
    retroativamente quais linhas antigas pertenciam à mesma execução;
    ver HistoricoConsultas.gs pra como isso é tratado na leitura
    ("legado", só em memória).
  - Se a coluna já existir (execução repetida, ou instalação que já
    rodou isto antes), devolve {alterou:false} sem escrever nada.
=====================================================*/

// Confere só se o CABEÇALHO (linha 1) da aba já tem a coluna —
// função pura o bastante pra ser testada com uma fixture mínima de
// aba (mesmo padrão de historicoFixtureAbaGuardaAuditoria_ em
// HistoricoTestes.gs), sem precisar de SpreadsheetApp real.
function historicoColunaSessaoAnaliseExiste_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return false;
  const cabecalhos = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim());
  return cabecalhos.indexOf(HISTORICO_COLUNA_SESSAO_ANALISE) !== -1;
}

function migrarAnaliseHistoricoRelatoriosV1() {

  const abaChecagem = historicoObterAba_(historicoAbrirPlanilhaRegras_(), ABA_REGRAS_AUDITORIA);

  if (historicoColunaSessaoAnaliseExiste_(abaChecagem)) {
    const mensagem = `Nada a fazer: a coluna "${HISTORICO_COLUNA_SESSAO_ANALISE}" já existe em "${ABA_REGRAS_AUDITORIA}".`;
    Logger.log(mensagem);
    return { alterou: false, mensagem: mensagem };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    // Relê sob o lock — outra execução concorrente desta mesma função
    // pode ter migrado entre a checagem rápida acima e agora (mesma
    // disciplina de precisaMigrar_/migrarParaRegistroId_ em
    // DiplomasBackend.gs).
    const aba = historicoObterAba_(historicoAbrirPlanilhaRegras_(), ABA_REGRAS_AUDITORIA);

    if (historicoColunaSessaoAnaliseExiste_(aba)) {
      const mensagem = `Nada a fazer (confirmado sob lock): a coluna "${HISTORICO_COLUNA_SESSAO_ANALISE}" já existe em "${ABA_REGRAS_AUDITORIA}".`;
      Logger.log(mensagem);
      return { alterou: false, mensagem: mensagem };
    }

    const novaColuna = aba.getLastColumn() + 1;
    aba.getRange(1, novaColuna).setValue(HISTORICO_COLUNA_SESSAO_ANALISE);

    const mensagem = `Coluna "${HISTORICO_COLUNA_SESSAO_ANALISE}" criada em "${ABA_REGRAS_AUDITORIA}" (coluna ${novaColuna}). ` +
      `Linhas já existentes ficam com essa célula vazia (nunca preenchida retroativamente) — são lidas como ` +
      `"legado" só em memória pela tela de Histórico de análises, nunca escrito de volta na planilha.`;
    Logger.log(mensagem);
    return { alterou: true, mensagem: mensagem, coluna: novaColuna };

  } finally {
    lock.releaseLock();
  }

}
