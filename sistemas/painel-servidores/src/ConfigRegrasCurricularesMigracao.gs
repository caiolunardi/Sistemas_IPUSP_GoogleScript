/*=====================================================
  REGRAS CURRICULARES — MIGRAÇÃO ADMINISTRATIVA
  (multi-currículo + revisão interna)

  UMA função administrativa, IDEMPOTENTE, que prepara a planilha
  oficial de Regras Curriculares (mesmo ID de sempre —
  ID_PLANILHA_REGRAS_CURRICULARES, ConfigRegrasCurricularesRepository.gs)
  pra suportar:

    - os novos campos acadêmicos em CURRICULOS (semestres_minimos,
      semestres_maximos, excedente_eletivas_compensa_livres);
    - a revisão interna (revisao, ultima_revisao_em,
      ultima_revisao_por);
    - a coluna ruleset_revisao (schema-only) em ANALISE_HISTORICO;
    - a aba AUDITORIA_REGRAS_CURRICULARES;
    - uma baseline de auditoria (MIGRACAO_BASELINE) pra cada ruleset
      já existente que ainda não tenha uma.

  MUITO IMPORTANTE — ESTA FUNÇÃO NUNCA É CHAMADA AUTOMATICAMENTE.

  Não é chamada em doGet, no carregamento da tela, em
  listarRulesetsCurriculares, em obterRulesetCurricular, nem em
  nenhum outro endpoint normal. Ela deve ser executada MANUALMENTE
  pelo administrador, uma vez, no editor do Apps Script (selecionando
  esta função e clicando em "Executar"), ANTES de publicar a nova
  versão do Dashboard que passa a exigir essas colunas — ver
  README_MULTI_CURRICULO_REVISOES.md.

  IDEMPOTÊNCIA: rodar esta função várias vezes é seguro.
    - Colunas que já existem NUNCA são recriadas, movidas ou apagadas.
    - "revisao" só é preenchida onde estiver vazia — nunca sobrescreve
      um valor já definido por uma correção real.
    - A aba de auditoria só é criada se ainda não existir; se já
      existir mas com cabeçalhos incompletos, só os que faltarem são
      acrescentados ao final (Achado 5, 2ª rodada cirúrgica).
    - Cada ruleset recebe NO MÁXIMO uma linha MIGRACAO_BASELINE —
      repoAuditoriaTemBaseline_ garante isso.
    - Nenhum valor acadêmico existente (créditos, horas, disciplinas,
      grupos, vigência, estrutura, status) é alterado.
    - Nenhum ruleset novo é criado (em especial: NUNCA cria rulesets
      do currículo 47011 — isso é trabalho do operador humano, com
      dados reais).
    - Nenhum ruleset é ativado ou inativado.

  LOCK (2ª rodada cirúrgica, Achado 4): esta função roda sobre a
  planilha oficial de PRODUÇÃO, e outros servidores podem estar usando
  o Dashboard (inclusive o próprio fluxo de correção de ATIVO,
  ConfigRegrasCurricularesAuditoria.gs) ao mesmo tempo em que um
  administrador executa a migração pelo editor do Apps Script. Por
  isso, o corpo inteiro roda sob LockService.getScriptLock(), com
  liberação garantida em "finally" mesmo se qualquer etapa lançar erro.
=====================================================*/

// Chamada só por migrarRegrasCurricularesMultiCurriculoERevisaoV1 (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function migrarRegrasCurricularesMultiCurriculoERevisaoV1SemAuditoria_() {

  const relatorio = {
    colunasCriadasCurriculos: [],
    colunasCriadasAnaliseHistorico: [],
    colunasCriadasAuditoria: [],
    abaAuditoriaCriada: false,
    rulesetsComRevisaoPreenchida: [],
    baselinesCriadas: [],
    baselinesJaExistentes: [],
    erros: []
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {

  // 1) A planilha oficial é sempre a mesma (ID_PLANILHA_REGRAS_CURRICULARES,
  // ConfigRegrasCurricularesRepository.gs) — não há necessidade de abrir
  // nada explicitamente aqui, os helpers do Repository já usam esse ID.

  // 2) CURRICULOS — acrescenta, só se faltarem, os 6 campos novos
  // (SEMPRE ao final, nunca reordenando os já existentes).
  try {
    relatorio.colunasCriadasCurriculos = repoGarantirColunasNoFinal_(ABA_REGRAS_CURRICULOS, [
      "semestres_minimos", "semestres_maximos", "excedente_eletivas_compensa_livres",
      "revisao", "ultima_revisao_em", "ultima_revisao_por"
    ]);
  } catch (err) {
    relatorio.erros.push("Falha ao garantir colunas novas em CURRICULOS: " + err);
    throw new Error("Migração interrompida ao preparar CURRICULOS: " + err + " Nenhuma alteração adicional foi tentada.");
  }

  // 3) ANALISE_HISTORICO — acrescenta "ruleset_revisao" se faltar.
  // Nunca preenche linhas antigas (schema-only, Instruções da tarefa).
  try {
    relatorio.colunasCriadasAnaliseHistorico = repoGarantirColunasNoFinal_(ABA_REGRAS_ANALISE_HISTORICO, [
      "ruleset_revisao"
    ]);
  } catch (err) {
    relatorio.erros.push("Falha ao garantir a coluna ruleset_revisao em ANALISE_HISTORICO: " + err);
    // Não interrompe a migração inteira por causa disso — CURRICULOS
    // já foi preparado com sucesso, e ANALISE_HISTORICO é só leitura
    // pra este painel; melhor deixar isso registrado no relatório e
    // seguir preparando o resto do que abortar tudo.
  }

  // 4) Aba de auditoria — cria só se não existir, e garante cabeçalhos
  // completos mesmo se a aba já existia (Achado 5).
  try {
    const resultadoAba = repoGarantirAbaAuditoriaExiste_();
    relatorio.abaAuditoriaCriada = resultadoAba.criada;
    relatorio.colunasCriadasAuditoria = resultadoAba.colunasAdicionadas || [];
  } catch (err) {
    relatorio.erros.push("Falha ao garantir a aba AUDITORIA_REGRAS_CURRICULARES: " + err);
    throw new Error("Migração interrompida ao preparar AUDITORIA_REGRAS_CURRICULARES: " + err);
  }

  // 5-6) revisao = 1 só onde estiver vazia. Usa os helpers normais do
  // Repository — a essa altura as colunas novas já existem, então
  // repoListarRulesets_ (que exige TODOS os cabeçalhos de
  // CABECALHOS_CURRICULOS) já funciona normalmente.
  let rulesetsAtuais;
  try {
    rulesetsAtuais = repoListarRulesets_();
  } catch (err) {
    relatorio.erros.push("Falha ao listar rulesets existentes após preparar o schema: " + err);
    throw new Error(
      "As colunas novas foram criadas, mas não consegui ler os rulesets existentes para definir a " +
      "revisão baseline: " + err + ". Rode a migração de novo depois de investigar."
    );
  }

  rulesetsAtuais.forEach(ruleset => {

    try {

      const revisaoAtual = String(ruleset.revisao || "").trim();

      if (revisaoAtual === "") {
        const localizado = repoLocalizarRuleset_(ruleset.ruleset_id);
        if (localizado) {
          repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, { revisao: 1 });
          relatorio.rulesetsComRevisaoPreenchida.push(ruleset.ruleset_id);
        }
      }

      // 10) Baseline de auditoria — uma por ruleset, idempotente.
      if (repoAuditoriaTemBaseline_(ruleset.ruleset_id)) {
        relatorio.baselinesJaExistentes.push(ruleset.ruleset_id);
      } else {
        const snapshotAtual = capturarSnapshotRulesetCompleto_(ruleset.ruleset_id);
        repoInserirAuditoria_({
          registrado_em: agoraFormatado_(),
          registrado_por: obterEmailUsuarioAtual_(),
          ruleset_id: ruleset.ruleset_id,
          curso_codigo: ruleset.curso_codigo,
          habilitacao_codigo: ruleset.habilitacao_codigo,
          estrutura_curricular: ruleset.estrutura_curricular,
          versao: ruleset.versao,
          revisao_anterior: "",
          revisao_nova: 1,
          status_ruleset: ruleset.status,
          entidade_tipo: "RULESET",
          entidade_id: ruleset.ruleset_id,
          operacao: "MIGRACAO_BASELINE",
          motivo: "Baseline criada pela migração administrativa (estado atual definido como revisão 1).",
          snapshot_antes_json: "",
          snapshot_depois_json: JSON.stringify(snapshotAtual),
          estado: ESTADO_AUDITORIA_CONFIRMADA
        });
        relatorio.baselinesCriadas.push(ruleset.ruleset_id);
      }

    } catch (err) {
      relatorio.erros.push(`Falha ao processar baseline do ruleset "${ruleset.ruleset_id}": ${err}`);
    }

  });

  Logger.log("migrarRegrasCurricularesMultiCurriculoERevisaoV1() concluída: " + JSON.stringify(relatorio, null, 2));

  return relatorio;

  } finally {
    lock.releaseLock();
  }

}
