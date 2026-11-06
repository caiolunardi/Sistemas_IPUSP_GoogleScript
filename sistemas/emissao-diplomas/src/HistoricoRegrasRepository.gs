/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Leitura da planilha de
  Regras Curriculares (CURRICULOS / REQUISITOS_NUMERICOS /
  DISCIPLINAS / GRUPOS_REGRAS).

  Regra central deste arquivo: TUDO é lido por NOME de
  cabeçalho (nunca posição fixa de coluna), do mesmo jeito
  que o resto do sistema de Diplomas já faz. Nenhum valor de
  negócio (crédito mínimo, hora mínima, sigla de disciplina,
  semestre mínimo/máximo) é hardcoded aqui — tudo vem da
  planilha, sempre lido de novo a cada análise.
=====================================================*/

function historicoAbrirPlanilhaRegras_() {
  try {
    return SpreadsheetApp.openById(obterIdRecursoDiplomas_("REGRAS_CURRICULARES", "spreadsheet"));
  } catch (err) {
    throw new Error(
      "Não consegui abrir REGRAS_CURRICULARES pelo ID_INDEX. Confira a configuração e o acesso da conta institucional."
    );
  }
}

function historicoObterAba_(planilha, nomeAba) {
  const aba = planilha.getSheetByName(nomeAba);
  if (!aba) {
    throw new Error(
      `Não encontrei a aba "${nomeAba}" na planilha de Regras Curriculares. ` +
      `Confira se o nome da aba não foi alterado.`
    );
  }
  return aba;
}

// Lê uma aba inteira como lista de objetos {cabecalho: valor}, usando
// a LINHA 1 como cabeçalho (por nome, nunca por posição). Ignora
// linhas totalmente vazias. Não lança erro se uma coluna esperada
// não existir — quem chama decide o que fazer (ver
// historicoExigirCampo_), porque colunas como semestres_minimos só
// existem depois de rodar a migração.
function historicoLerTabela_(aba) {

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaColuna < 1) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const cabecalhos = valores[0].map(v => String(v || "").trim());

  const linhas = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const vazia = linha.every(c => c === "" || c === null || c === undefined);
    if (vazia) continue;

    const obj = {};
    cabecalhos.forEach((nome, indice) => {
      if (nome) obj[nome] = linha[indice];
    });
    linhas.push(obj);
  }

  return linhas;

}

// Devolve o valor de uma coluna esperada, lançando erro claro se a
// coluna nem existir na planilha (diferente de "existe mas está
// vazia nessa linha", que é aceitável e vira null/"").
function historicoExigirCampo_(objLinha, nomeCampo, nomeAba, todasAsChaves) {
  if (todasAsChaves.indexOf(nomeCampo) === -1) {
    throw new Error(
      `A aba "${nomeAba}" da planilha de Regras Curriculares não tem a coluna ` +
      `"${nomeCampo}". Confira o cabeçalho da linha 1.`
    );
  }
  return objLinha[nomeCampo];
}

function historicoTextoOuNulo_(valor) {
  const texto = (valor === null || valor === undefined) ? "" : String(valor).trim();
  return texto === "" ? null : texto;
}

function historicoNumeroOuNulo_(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return isNaN(n) ? null : n;
}

function historicoBooleanoSheet_(valor) {
  return String(valor || "").trim().toUpperCase() === "SIM";
}

// Parser ESTRITO pra campos booleanos de CONFIGURAÇÃO — diferente de
// historicoBooleanoSheet_ (que colapsa tudo que não é "SIM" em
// false, correto só pra filtros simples como "ativo"). Aqui,
// vazio/malformado tem que continuar DISTINGUÍVEL de um "NÃO"
// explícito, porque em campos de configuração (ver
// excedente_eletivas_compensa_livres e obrigatorio abaixo) um valor
// ausente não pode silenciosamente virar uma decisão — precisa forçar
// CONFERIR em vez disso (auditoria, rodada 3). Semântica:
//   "SIM"          -> true
//   "NÃO" / "NAO"  -> false
//   vazio           -> null
//   qualquer outro  -> null (configuração inválida, tratada como ausente)
function historicoBooleanoConfiguracaoOuNulo_(valor) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim().toUpperCase();
  if (texto === "") return null;
  if (texto === "SIM") return true;
  if (texto === "NÃO" || texto === "NAO") return false;
  return null;
}

// Normaliza sigla de disciplina pra comparação: a planilha às vezes
// guarda sigla puramente numérica (ex.: 4701784) como número — em
// Apps Script isso já vem como string "4701784" via String(), sem
// ".0" (diferente de uma leitura em Python/Excel), mas o replace
// abaixo é uma segurança barata contra esse artefato mesmo assim.
function historicoNormalizarSigla_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .trim()
    .toUpperCase()
    .replace(/\.0$/, "");
}

/*=====================================================
  CURRICULOS — seleção do ruleset ATIVO de uma habilitação
=====================================================*/

function historicoLerCurriculos_() {

  const planilha = historicoAbrirPlanilhaRegras_();
  const aba = historicoObterAba_(planilha, ABA_REGRAS_CURRICULOS);
  const linhas = historicoLerTabela_(aba);
  if (linhas.length === 0) {
    throw new Error(`A aba "${ABA_REGRAS_CURRICULOS}" está vazia (nem o cabeçalho foi encontrado).`);
  }

  const todasAsChaves = Object.keys(linhas[0]);
  const pegar = (linha, campo) => historicoExigirCampo_(linha, campo, ABA_REGRAS_CURRICULOS, todasAsChaves);

  return linhas
    .filter(linha => historicoTextoOuNulo_(pegar(linha, "ruleset_id")) !== null)
    .map(linha => ({
      rulesetId: historicoTextoOuNulo_(pegar(linha, "ruleset_id")),
      cursoCodigo: historicoTextoOuNulo_(pegar(linha, "curso_codigo")),
      habilitacaoCodigo: historicoTextoOuNulo_(pegar(linha, "habilitacao_codigo")),
      habilitacaoNome: historicoTextoOuNulo_(pegar(linha, "habilitacao_nome")),
      estruturaCurricular: historicoTextoOuNulo_(pegar(linha, "estrutura_curricular")),
      versao: historicoNumeroOuNulo_(pegar(linha, "versao")),
      vigenciaInicio: historicoTextoOuNulo_(pegar(linha, "vigencia_inicio")),
      vigenciaFim: historicoTextoOuNulo_(pegar(linha, "vigencia_fim")),
      status: historicoTextoOuNulo_(pegar(linha, "status")),
      // As 3 colunas abaixo só existem depois de rodar
      // migrarRegrasCurricularesParaAnaliseHistoricoV1() — por isso
      // usam historicoTextoOuNulo_/historicoNumeroOuNulo_ direto no
      // acesso cru ao objeto (sem historicoExigirCampo_), tolerando
      // a coluna nem existir ainda: nesse caso o motor vai reportar
      // CONFERIR por falta de configuração, nunca vai inventar um
      // valor.
      semestresMinimos: historicoNumeroOuNulo_(linha["semestres_minimos"]),
      semestresMaximos: historicoNumeroOuNulo_(linha["semestres_maximos"]),
      // Booleano de CONFIGURAÇÃO (não um filtro como "ativo") — usa o
      // parser estrito, que devolve null tanto pra coluna ausente
      // quanto pra célula vazia/malformada, nos dois casos sem
      // assumir "NÃO" silenciosamente (auditoria, rodada 3). É esse
      // null que faz historicoResolverRulesetAtivoEmLista_, logo
      // abaixo, tratar o ruleset como configuração incompleta →
      // CONFERIR.
      excedenteEletivasCompensaLivres: historicoBooleanoConfiguracaoOuNulo_(linha["excedente_eletivas_compensa_livres"]),
      // "revisao" (RODADA A): número de correções auditadas dentro do
      // MESMO ruleset (nunca confundir com "versao", que é a versão
      // institucional do ruleset — ver historicoResolverRulesetAtivoEmLista_
      // logo abaixo pra validação). Gravada pelo Dashboard dos
      // Servidores junto com ultima_revisao_em/ultima_revisao_por
      // (essas 2 últimas não são usadas pela análise — só a própria
      // "revisao" precisa chegar até o resultado/auditoria).
      revisao: historicoNumeroOuNulo_(linha["revisao"]),
      observacao: historicoTextoOuNulo_(pegar(linha, "observacao"))
    }));

}

// Núcleo PURO da seleção — recebe a lista já lida de CURRICULOS (nunca
// lê planilha aqui dentro), pra poder ser testado com fixtures
// determinísticas (47011 e 47012 coexistindo, 0/1/2 candidatos,
// revisão válida/inválida etc.) sem depender do estado real da
// planilha. historicoSelecionarRulesetAtivo_, logo abaixo, é só quem
// lê a planilha e delega pra cá.
//
// Semântica (RODADA A — deliberada, sem heurística de desempate):
//   0 candidatos com curso+habilitação+ATIVO batendo -> indisponível;
//   exatamente 1                                      -> usa esse;
//   2 ou mais                                          -> ambíguo, indisponível.
// NUNCA escolhe "o primeiro", "o mais recente", "a versão mais alta"
// nem qualquer outro critério de desempate — isso é proibido nesta
// rodada (fica pra uma decisão futura e explícita, se algum dia for
// necessária).
function historicoResolverRulesetAtivoEmLista_(curriculos, cursoCodigo, habilitacaoCodigo) {

  const candidatos = curriculos.filter(r =>
    String(r.cursoCodigo).trim() === String(cursoCodigo).trim() &&
    String(r.habilitacaoCodigo).trim() === String(habilitacaoCodigo).trim() &&
    r.status === "ATIVO"
  );

  if (candidatos.length === 0) {
    return {
      ruleset: null,
      motivoIndisponivel:
        `Nenhum ruleset ATIVO encontrado em "${ABA_REGRAS_CURRICULOS}" para curso ` +
        `${cursoCodigo} / habilitação ${habilitacaoCodigo}.`
    };
  }

  if (candidatos.length > 1) {
    return {
      ruleset: null,
      motivoIndisponivel:
        `Ruleset aplicável ambíguo: ${candidatos.length} rulesets ATIVOS encontrados para ` +
        `curso ${cursoCodigo} / habilitação ${habilitacaoCodigo} (${candidatos.map(c => c.rulesetId).join(", ")}). ` +
        `Corrija o status em "${ABA_REGRAS_CURRICULOS}" antes de repetir a análise.`
    };
  }

  const ruleset = candidatos[0];

  // As 3 colunas (semestres_minimos/semestres_maximos/
  // excedente_eletivas_compensa_livres) são preenchidas JUNTAS pela
  // migração — exigir as 3 aqui (não só semestres_minimos) evita que
  // um ruleset com migração parcial/manual incompleta passe pro motor
  // com excedenteEletivasCompensaLivres=null, que historicoAvaliarHabilitacao_
  // trataria silenciosamente como "false" (compensação eletivas→livres
  // desligada) — o que mudaria o resultado de casos reais como o do
  // exemplo da Ana Clara. Na dúvida sobre a própria configuração, não
  // decide: CONFERIR.
  if (ruleset.semestresMinimos === null || ruleset.semestresMaximos === null || ruleset.excedenteEletivasCompensaLivres === null) {
    return {
      ruleset: null,
      motivoIndisponivel:
        `O ruleset ${ruleset.rulesetId} ainda não tem a configuração completa de migração ` +
        `(semestres_minimos/semestres_maximos/excedente_eletivas_compensa_livres) em ` +
        `"${ABA_REGRAS_CURRICULOS}" (confira os 3 valores no Dashboard dos Servidores).`
    };
  }

  // "revisao" (RODADA A) precisa ser um inteiro positivo válido pra
  // um ruleset ATIVO poder ser usado numa análise nova. Vazio, 0,
  // negativo ou não numérico NUNCA vira "revisão 1" por fallback —
  // isso esconderia justamente o tipo de configuração incompleta que
  // esta checagem existe pra pegar. Mensagem própria (em vez de somar
  // à checagem acima) pra deixar claro ao servidor qual dado exato
  // falta corrigir no Dashboard.
  if (!Number.isInteger(ruleset.revisao) || ruleset.revisao <= 0) {
    return {
      ruleset: null,
      motivoIndisponivel:
        `O ruleset ${ruleset.rulesetId} está com "revisao" ausente ou inválida em ` +
        `"${ABA_REGRAS_CURRICULOS}" (precisa ser um número inteiro positivo — 1, 2, 3...). ` +
        `Confira a revisão no Dashboard dos Servidores antes de repetir a análise.`
    };
  }

  return { ruleset: ruleset, motivoIndisponivel: null };

}

// Seleciona o ruleset aplicável pra uma habilitação: lê CURRICULOS ao
// vivo e delega toda a decisão pra historicoResolverRulesetAtivoEmLista_
// (função pura, testável com fixtures — ver HistoricoTestes.gs).
function historicoSelecionarRulesetAtivo_(cursoCodigo, habilitacaoCodigo) {
  const todos = historicoLerCurriculos_();
  return historicoResolverRulesetAtivoEmLista_(todos, cursoCodigo, habilitacaoCodigo);
}

/*=====================================================
  REQUISITOS_NUMERICOS
=====================================================*/

function historicoLerRequisitosNumericos_(rulesetId) {

  const planilha = historicoAbrirPlanilhaRegras_();
  const aba = historicoObterAba_(planilha, ABA_REGRAS_REQUISITOS_NUMERICOS);
  const linhas = historicoLerTabela_(aba);
  if (linhas.length === 0) return [];

  const todasAsChaves = Object.keys(linhas[0]);
  const pegar = (linha, campo) => historicoExigirCampo_(linha, campo, ABA_REGRAS_REQUISITOS_NUMERICOS, todasAsChaves);

  return linhas
    .filter(linha => historicoTextoOuNulo_(pegar(linha, "ruleset_id")) === rulesetId)
    .filter(linha => historicoBooleanoSheet_(pegar(linha, "ativo")))
    .map(linha => ({
      requisitoId: historicoTextoOuNulo_(pegar(linha, "requisito_id")),
      rulesetId: historicoTextoOuNulo_(pegar(linha, "ruleset_id")),
      criterio: historicoTextoOuNulo_(pegar(linha, "criterio")),
      campoParser: historicoTextoOuNulo_(pegar(linha, "campo_parser")),
      operador: historicoTextoOuNulo_(pegar(linha, "operador")),
      valor: historicoNumeroOuNulo_(pegar(linha, "valor")),
      unidade: historicoTextoOuNulo_(pegar(linha, "unidade")),
      // Booleano de CONFIGURAÇÃO — parser estrito: SIM->true,
      // NÃO/NAO->false, vazio/inválido->null. O null chega assim até
      // o motor (HistoricoMotor.gs), que trata a ausência de
      // configuração como insegura e força CONFERIR pro requisito —
      // nunca "opcional" por omissão (auditoria, rodada 3).
      obrigatorio: historicoBooleanoConfiguracaoOuNulo_(pegar(linha, "obrigatorio")),
      descricao: historicoTextoOuNulo_(pegar(linha, "descricao")),
      ordem: historicoNumeroOuNulo_(pegar(linha, "ordem")) || 0
    }))
    .sort((a, b) => a.ordem - b.ordem);

}

/*=====================================================
  DISCIPLINAS
=====================================================*/

function historicoLerDisciplinas_(rulesetId) {

  const planilha = historicoAbrirPlanilhaRegras_();
  const aba = historicoObterAba_(planilha, ABA_REGRAS_DISCIPLINAS);
  const linhas = historicoLerTabela_(aba);
  if (linhas.length === 0) return [];

  const todasAsChaves = Object.keys(linhas[0]);
  const pegar = (linha, campo) => historicoExigirCampo_(linha, campo, ABA_REGRAS_DISCIPLINAS, todasAsChaves);

  return linhas
    .filter(linha => historicoTextoOuNulo_(pegar(linha, "ruleset_id")) === rulesetId)
    .filter(linha => historicoBooleanoSheet_(pegar(linha, "ativo")))
    .map(linha => ({
      regraDisciplinaId: historicoTextoOuNulo_(pegar(linha, "regra_disciplina_id")),
      rulesetId: historicoTextoOuNulo_(pegar(linha, "ruleset_id")),
      sigla: historicoNormalizarSigla_(pegar(linha, "sigla")),
      nome: historicoTextoOuNulo_(pegar(linha, "nome")),
      tipoRegra: historicoTextoOuNulo_(pegar(linha, "tipo_regra")), // "OBRIGATORIA" | "GRUPO"
      grupoId: historicoTextoOuNulo_(pegar(linha, "grupo_id")),
      statusAceitos: String(pegar(linha, "status_aceitos") || "")
        .split(/[,\/;]/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s !== ""),
      ordem: historicoNumeroOuNulo_(pegar(linha, "ordem")) || 0
    }))
    .sort((a, b) => a.ordem - b.ordem);

}

/*=====================================================
  GRUPOS_REGRAS
=====================================================*/

function historicoLerGrupos_(rulesetId) {

  const planilha = historicoAbrirPlanilhaRegras_();
  const aba = historicoObterAba_(planilha, ABA_REGRAS_GRUPOS);
  const linhas = historicoLerTabela_(aba);
  if (linhas.length === 0) return [];

  const todasAsChaves = Object.keys(linhas[0]);
  const pegar = (linha, campo) => historicoExigirCampo_(linha, campo, ABA_REGRAS_GRUPOS, todasAsChaves);

  return linhas
    .filter(linha => historicoTextoOuNulo_(pegar(linha, "ruleset_id")) === rulesetId)
    .filter(linha => historicoBooleanoSheet_(pegar(linha, "ativo")))
    .map(linha => ({
      grupoId: historicoTextoOuNulo_(pegar(linha, "grupo_id")),
      rulesetId: historicoTextoOuNulo_(pegar(linha, "ruleset_id")),
      nomeGrupo: historicoTextoOuNulo_(pegar(linha, "nome_grupo")),
      tipoRegra: historicoTextoOuNulo_(pegar(linha, "tipo_regra")), // ONE_OF | MIN_COUNT | MIN_CREDITS
      valorMinimo: historicoNumeroOuNulo_(pegar(linha, "valor_minimo")),
      unidade: historicoTextoOuNulo_(pegar(linha, "unidade")),
      campoSoma: historicoTextoOuNulo_(pegar(linha, "campo_soma"))
    }));

}

/*=====================================================
  Pacote completo de regras de um ruleset — usado pelo
  motor pra avaliar uma habilitação de uma vez só.
=====================================================*/

function historicoMontarPacoteRegras_(rulesetId) {
  return {
    requisitosNumericos: historicoLerRequisitosNumericos_(rulesetId),
    disciplinas: historicoLerDisciplinas_(rulesetId),
    grupos: historicoLerGrupos_(rulesetId)
  };
}

/*=====================================================
  RODADA A.1 — Guarda de estabilidade do ruleset.

  A revalidação de rulesetId+revisao (RODADA A, ver
  historicoAvaliarHabilitacao_ em HistoricoMotor.gs) não detecta uma
  correção que É iniciada no Dashboard dos Servidores, muta dados, e
  depois é ABORTADA (estado FALHOU) sem chegar a mudar "revisao" — as
  duas leituras de revisao ficam idênticas mesmo que o pacote de
  regras tenha sido lido num estado transitório no meio do caminho.

  Por isso o motor também lê (SÓ LEITURA — nunca escreve, nunca
  "conserta" uma linha) a aba AUDITORIA_REGRAS_CURRICULARES, mantida
  pelo projeto separado Dashboard dos Servidores, como um relógio/
  testemunha adicional: um "watermark" da última auditoria daquele
  ruleset (identidade, nunca timestamp — auditoria_id é quem manda) +
  se existe alguma correção em aberto (estado PREPARADA) para aquele
  ruleset. Capturado ANTES e DEPOIS de montar o pacote de regras; se
  mudar qualquer coisa, ou se existir uma PREPARADA em qualquer uma
  das duas capturas, a análise não pode confiar no pacote lido.

  Leitura deliberadamente ESTREITA: nunca lê a largura inteira da aba
  (que inclui snapshot_antes_json/snapshot_depois_json, potencialmente
  grandes) — só as 3 colunas de HISTORICO_GUARDA_AUDITORIA_COLUNAS,
  cada uma isolada, nunca via historicoLerTabela_ (que leria a aba
  inteira de uma vez e materializaria os snapshots na memória mesmo
  sem usá-los depois).

  Sem LockService nenhum aqui: um lock neste projeto não teria como
  coordenar com o Dashboard dos Servidores (projeto Apps Script
  separado) — a estratégia é detecção + CONFERIR, nunca bloqueio.
=====================================================*/

// As 3 únicas colunas que esta guarda lê — nunca registrado_em (a
// "última auditoria" é determinada por ORDEM FÍSICA da linha, nunca
// por data — a aba é append-only pra operações novas) e nunca
// qualquer coluna de snapshot.
const HISTORICO_GUARDA_AUDITORIA_COLUNAS = ["auditoria_id", "ruleset_id", "estado"];

// Domínio de "estado" na aba AUDITORIA_REGRAS_CURRICULARES — contrato
// do Dashboard dos Servidores, nunca inventado aqui.
const HISTORICO_GUARDA_AUDITORIA_ESTADOS_VALIDOS = ["PREPARADA", "CONFIRMADA", "FALHOU"];

// Lê SÓ as 3 colunas de HISTORICO_GUARDA_AUDITORIA_COLUNAS da aba já
// localizada, cada uma com sua própria chamada de getRange (largura
// 1) — em nenhum momento pede a largura inteira da aba. Devolve as
// linhas de dado (a partir da linha 2) já combinadas em objetos
// {auditoriaId, rulesetId, estado}, na MESMA ordem física da aba.
//
// RODADA A.1.1 (Achado 1 — auditoria independente da Rodada A.1):
// nesta ordem, a validação do CABEÇALHO acontece SEMPRE, mesmo quando
// a aba não tem nenhuma linha de dado ainda — nunca o contrário. Até a
// Rodada A.1, um early-return por "getLastRow() < 2" acontecia ANTES
// de olhar o cabeçalho, então uma aba com 0 linhas de dado virava
// silenciosamente "guarda vazia válida" mesmo que o cabeçalho da linha
// 1 estivesse errado ou ausente (ex.: colunas "foo"/"bar", ou a aba
// completamente em branco) — violando o fail-closed que este módulo
// promete ("aba ausente OU schema inválido -> RULESET_AUDITORIA_INDISPONIVEL").
// A partir desta correção:
//   ABA VÁLIDA (as 3 colunas existem) + ZERO linhas de dado -> [] (situação
//     válida — nenhuma auditoria ainda para aquele ruleset).
//   ABA INVÁLIDA (getLastColumn() < 1, sem cabeçalho utilizável, ou
//     faltando alguma das 3 colunas exigidas) -> sempre lança erro,
//     mesmo com zero linhas de dado — nunca "assume" auditoria vazia.
function historicoLerLinhasGuardaAuditoria_(aba) {

  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) {
    throw new Error(
      `A aba "${ABA_REGRAS_AUDITORIA_CURRICULAR}" não tem nenhum cabeçalho (linha 1 vazia ou aba sem nenhuma ` +
      `coluna) — não é possível confirmar as colunas obrigatórias antes de ler qualquer linha de dado.`
    );
  }

  const cabecalhos = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim());

  const indice = {};
  HISTORICO_GUARDA_AUDITORIA_COLUNAS.forEach(nome => { indice[nome] = cabecalhos.indexOf(nome); });

  const faltando = HISTORICO_GUARDA_AUDITORIA_COLUNAS.filter(nome => indice[nome] === -1);
  if (faltando.length > 0) {
    throw new Error(
      `A aba "${ABA_REGRAS_AUDITORIA_CURRICULAR}" não tem a(s) coluna(s) ${faltando.map(n => `"${n}"`).join(", ")} ` +
      `no cabeçalho (linha 1).`
    );
  }

  // SOMENTE DEPOIS de confirmar que o cabeçalho é válido é que a
  // ausência de linhas de dado pode ser tratada como situação normal
  // (nenhuma correção registrada ainda para nenhum ruleset).
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const numLinhasDado = ultimaLinha - 1;
  const colAuditoriaId = aba.getRange(2, indice.auditoria_id + 1, numLinhasDado, 1).getValues();
  const colRulesetId = aba.getRange(2, indice.ruleset_id + 1, numLinhasDado, 1).getValues();
  const colEstado = aba.getRange(2, indice.estado + 1, numLinhasDado, 1).getValues();

  const linhas = [];
  for (let i = 0; i < numLinhasDado; i++) {
    linhas.push({
      auditoriaId: historicoTextoOuNulo_(colAuditoriaId[i][0]),
      rulesetId: historicoTextoOuNulo_(colRulesetId[i][0]),
      estado: historicoTextoOuNulo_(colEstado[i][0])
    });
  }
  return linhas;

}

// Núcleo PURO da guarda (RODADA A.1) — nunca toca em planilha. Recebe
// as linhas já lidas (formato {auditoriaId, rulesetId, estado}) e o
// rulesetId sendo analisado nesta execução; filtra SÓ as linhas
// daquele ruleset, valida a integridade mínima dessas linhas, e
// resume num retrato comparável antes/depois.
//
// Fail-closed (auditoria, RODADA A.1, ajuste 2): entre as linhas JÁ
// FILTRADAS pelo ruleset analisado, qualquer auditoria_id vazio,
// estado vazio/fora do domínio conhecido, ou auditoria_id duplicado,
// faz a guarda inteira devolver {ok:false} — uma trilha malformada
// NUNCA é tratada como prova de estabilidade. Uma linha malformada de
// OUTRO ruleset, com ruleset_id EXPLÍCITO e diferente, nunca entra
// nessa checagem — não bloqueia a análise de um ruleset diferente do
// dela (ver ACHADO 2 logo abaixo pro caso em que o ruleset_id da linha
// não é explícito/diferente, e sim vazio).
//
// RODADA A.1.1 (Achado 2 — auditoria independente da Rodada A.1): até
// aqui, a linha era primeiro FILTRADA por comparação direta de
// rulesetId (String(l.rulesetId).trim() === String(rulesetId).trim())
// e só DEPOIS validada — mas uma linha REAL com ruleset_id vazio/nulo/
// só espaços nunca bate com essa comparação (inclusive porque
// String(null) vira o texto "null"), então ela era descartada em
// silêncio, exatamente como se fosse de outro ruleset identificado.
// Isso é diferente de "pertence claramente a outro ruleset": um
// ruleset_id vazio é INDETERMINADO — não dá pra provar que a linha não
// é do ruleset sendo analisado — e por isso precisa invalidar a
// leitura inteira (fail-closed GLOBAL, independente de qual ruleset
// está sendo analisado), nunca ser ignorado. A partir desta correção,
// cada linha real é examinada nesta ordem:
//   1. normaliza o ruleset_id da linha (historicoTextoOuNulo_);
//   2. vazio/nulo/só espaços -> {ok:false} imediato, pra QUALQUER
//      ruleset que esteja sendo analisado;
//   3. ruleset_id explícito e DIFERENTE do analisado -> ignora a linha
//      com segurança (comportamento já existente, preservado);
//   4. ruleset_id igual ao analisado -> roda as mesmas checagens de
//      integridade de sempre (auditoria_id/estado/duplicidade).
// Uma linha completamente vazia (auditoria_id/ruleset_id/estado todos
// vazios) que ainda assim é uma linha REAL dentro do intervalo lido
// (linha 2..getLastRow(), garantido por quem lê) cai no passo 2 (por
// ter ruleset_id vazio) e é tratada como a mesma inconsistência — sem
// nenhuma heurística nova pra "distinguir" esse caso.
//
// "Última auditoria" = último elemento das linhas do ruleset alvo
// aceitas até aqui, na MESMA ordem física em que vieram da planilha
// (nunca por data — a aba é append-only pra operações novas, com
// atualização de estado em linhas já existentes só para
// PREPARADA->CONFIRMADA/FALHOU).
function historicoResumirAuditoriaRulesetEmLista_(linhas, rulesetId) {

  const alvo = String(rulesetId).trim();
  const doRuleset = [];
  const idsVistos = {};
  const todasAsLinhas = linhas || [];

  for (let i = 0; i < todasAsLinhas.length; i++) {
    const linha = todasAsLinhas[i];
    if (!linha) continue;

    const rulesetIdLinha = historicoTextoOuNulo_(linha.rulesetId);

    // ACHADO 2: ruleset_id vazio/nulo/só espaços numa linha real é
    // indeterminado — nunca sabemos com segurança se ela pertence (ou
    // não) ao ruleset sendo analisado agora. Invalida a leitura
    // inteira, incondicionalmente, ANTES de qualquer filtro por
    // ruleset alvo.
    if (rulesetIdLinha === null) {
      return {
        ok: false,
        motivo: `Encontrei uma linha de "${ABA_REGRAS_AUDITORIA_CURRICULAR}" sem ruleset_id (vazio, nulo ou só ` +
          `espaços) — não é possível determinar com segurança se ela pertence ao ruleset ${alvo} ou a outro; ` +
          `trilha de auditoria indeterminada, não é seguro confiar nela.`
      };
    }

    // ruleset_id explícito e DIFERENTE do analisado: seguramente
    // ignorável, mesmo que os outros campos dessa linha estejam
    // malformados (auditoria_id vazio, estado inválido etc.) — quem
    // cuida da integridade daquele OUTRO ruleset é a análise daquele
    // outro ruleset, não esta.
    if (rulesetIdLinha !== alvo) continue;

    doRuleset.push(linha);

    if (!linha.auditoriaId) {
      return {
        ok: false,
        motivo: `Encontrei uma linha de "${ABA_REGRAS_AUDITORIA_CURRICULAR}" do ruleset ${alvo} sem ` +
          `auditoria_id — trilha de auditoria malformada, não é seguro confiar nela.`
      };
    }

    if (!linha.estado || HISTORICO_GUARDA_AUDITORIA_ESTADOS_VALIDOS.indexOf(linha.estado) === -1) {
      return {
        ok: false,
        motivo: `A linha de auditoria "${linha.auditoriaId}" (ruleset ${alvo}) tem estado ` +
          (linha.estado ? `desconhecido ("${linha.estado}")` : "vazio") +
          ` — esperado um de: ${HISTORICO_GUARDA_AUDITORIA_ESTADOS_VALIDOS.join(", ")}.`
      };
    }

    if (idsVistos[linha.auditoriaId]) {
      return {
        ok: false,
        motivo: `auditoria_id "${linha.auditoriaId}" aparece mais de uma vez para o ruleset ${alvo} em ` +
          `"${ABA_REGRAS_AUDITORIA_CURRICULAR}" — trilha de auditoria inconsistente, não é seguro confiar nela.`
      };
    }
    idsVistos[linha.auditoriaId] = true;

  }

  const temPreparada = doRuleset.some(l => l.estado === "PREPARADA");
  const ultima = doRuleset.length > 0 ? doRuleset[doRuleset.length - 1] : null;

  return {
    ok: true,
    rulesetId: rulesetId,
    temPreparada: temPreparada,
    quantidadeAuditorias: doRuleset.length,
    ultimaAuditoriaId: ultima ? ultima.auditoriaId : null,
    ultimoEstado: ultima ? ultima.estado : null
  };

}

// Impura: abre a planilha de Regras Curriculares (mesma de sempre),
// localiza a aba de auditoria curricular e devolve o resumo já
// filtrado pro rulesetId pedido. NUNCA lança exceção pro chamador
// (HistoricoMotor.gs) — qualquer problema (aba ausente, coluna
// ausente, exceção técnica do Sheets) vira {ok:false, motivo},
// fail-closed: o motor trata isso como CONFERIR, nunca como "deve
// estar tudo bem".
function historicoLerGuardaAuditoriaRuleset_(rulesetId) {
  try {
    const planilha = historicoAbrirPlanilhaRegras_();
    const aba = planilha.getSheetByName(ABA_REGRAS_AUDITORIA_CURRICULAR);
    if (!aba) {
      return {
        ok: false,
        motivo: `Não encontrei a aba "${ABA_REGRAS_AUDITORIA_CURRICULAR}" na planilha de Regras Curriculares — ` +
          `não é possível confirmar a estabilidade do ruleset sem ela.`
      };
    }
    const linhas = historicoLerLinhasGuardaAuditoria_(aba);
    return historicoResumirAuditoriaRulesetEmLista_(linhas, rulesetId);
  } catch (err) {
    return {
      ok: false,
      motivo: `Falha técnica ao ler "${ABA_REGRAS_AUDITORIA_CURRICULAR}" (${err && err.message ? err.message : err}) ` +
        `— não é possível confirmar a estabilidade do ruleset.`
    };
  }
}

// Compara dois retratos {ok:true,...} da guarda (um capturado ANTES e
// outro DEPOIS de montar o pacote de regras) e diz se a trilha de
// auditoria curricular daquele ruleset mudou nesse intervalo.
// Complementa (nunca substitui) a revalidação já existente de
// rulesetId+revisao (RODADA A) — ver historicoAvaliarHabilitacao_. Só
// compara o watermark (ultimaAuditoriaId + quantidadeAuditorias);
// quem chama já cuida separadamente de checar temPreparada em cada
// retrato individualmente (uma PREPARADA sozinha já basta pra
// bloquear, não precisa de "antes" e "depois" pra isso).
function historicoCompararGuardasRuleset_(antes, depois) {

  if (antes.ultimaAuditoriaId !== depois.ultimaAuditoriaId) {
    return {
      estavel: false,
      motivo: `A última auditoria curricular registrada para o ruleset ${antes.rulesetId} mudou durante a ` +
        `análise (era "${antes.ultimaAuditoriaId}", passou a ser "${depois.ultimaAuditoriaId}").`
    };
  }

  if (antes.quantidadeAuditorias !== depois.quantidadeAuditorias) {
    return {
      estavel: false,
      motivo: `A quantidade de auditorias curriculares registradas para o ruleset ${antes.rulesetId} mudou ` +
        `durante a análise (era ${antes.quantidadeAuditorias}, passou a ser ${depois.quantidadeAuditorias}).`
    };
  }

  return { estavel: true, motivo: null };

}
