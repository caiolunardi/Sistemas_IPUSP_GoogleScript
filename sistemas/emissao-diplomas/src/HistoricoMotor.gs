/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Motor de regras.

  Responsabilidade ÚNICA deste arquivo: dado UM objeto de dados já
  EXTRAÍDOS pelo HistoricoParser.html (client-side) para UMA
  habilitação, decidir APTO / NAO_APTO / CONFERIR — sempre lendo os
  critérios da planilha de Regras Curriculares (nunca hardcoded
  aqui) e nunca decidindo na dúvida.

  O QUE ESTE ARQUIVO NÃO FAZ (de propósito):
  - Não busca nem decide QUAL PDF usar (isso é do
    HistoricoEndpoints.gs, que também decide a lógica de combo
    Psicólogo+Bacharelado: parseia o PDF do Psicólogo uma vez só e
    chama historicoAvaliarHabilitacao_ duas vezes, uma por ruleset,
    passando documentoDeOutraHabilitacao=true na segunda).
  - Não grava nada em planilha nenhuma (isso é do
    HistoricoAuditoria.gs).
  - Não mexe em statusHistorico/Versão/checkboxes do aluno — é
    puramente consultivo. Quem decide se avança o aluno de etapa
    continua sendo o servidor humano, clicando nos checkboxes que já
    existem em DiplomasApp.html.

  PRINCÍPIO CENTRAL (igual em todo o módulo de histórico): na
  dúvida, NÃO decide — CONFERIR. Um campo null NUNCA é tratado como
  zero, e NUNCA é tratado como "cumprido". Ver a função
  historicoAvaliarHabilitacao_ no fim do arquivo para o resumo de
  como os três resultados (APTO/NAO_APTO/CONFERIR) se combinam.

  Assume-se (garantido por historicoSelecionarRulesetAtivo_ /
  historicoResolverRulesetAtivoEmLista_ em
  HistoricoRegrasRepository.gs) que todo objeto "ruleset" que chega
  aqui já tem semestresMinimos, semestresMaximos,
  excedenteEletivasCompensaLivres e revisao preenchidos (não-null,
  e revisao um inteiro positivo) — nunca um ruleset com migração
  incompleta ou revisão inválida chega até este arquivo.

  RODADA A (multi-currículo + revisão): o CURSO/CURRÍCULO usado na
  seleção do ruleset vem do próprio documento analisado
  (dadosExtraidos.documento.cursoCodigoDocumento — extraído pelo
  HistoricoParser.html), nunca de uma constante fixa. A HABILITAÇÃO
  usada na seleção continua vindo de qual análise está em execução
  (cfgHabilitacao, derivada de chaveHabilitacao — "psi"/"bach"/"lic"),
  nunca do cabeçalho do documento. Ver historicoResolverCursoHabilitacaoAlvo_
  logo abaixo — é essa função pura que junta os dois na chave usada
  pra buscar o ruleset.
=====================================================*/

/*=====================================================
  Vocabulário de exibição — mapeia o "criterio" cadastrado em
  REQUISITOS_NUMERICOS pra uma chave fixa dentro de "detalhes", na
  MESMA ordem do roteiro original do usuário (tempo de curso,
  obrigatórias, eletivas, livres, estágio, AAC, EXT). Qualquer
  criterio cadastrado fora dessa lista (ex.: um novo requisito
  numérico que alguém adicione na planilha no futuro) não é
  descartado — só cai em detalhes.outrosRequisitosNumericos, pra
  nunca "sumir" um requisito ativo silenciosamente.
=====================================================*/
const HISTORICO_MAPA_CRITERIO_PARA_CHAVE_DETALHE = {
  OBRIGATORIAS_AULA: "creditosObrigatorios",
  ELETIVAS_AULA: "creditosEletivas",
  LIVRES_AULA: "creditosLivres",
  ESTAGIO: "estagio",
  AAC: "aac",
  EXT: "ext"
};

// Mesmo texto de parecer nos 3 resultados possíveis — usado tanto
// no caminho normal de avaliação quanto nos retornos antecipados
// (reconciliação falhou, extração falhou, Licenciatura não
// implementada), pra UI e auditoria nunca precisarem inventar texto
// próprio.
const HISTORICO_PARECER_TEXTO = {
  APTO: "Cumpre requisitos.",
  NAO_APTO: "Não cumpre requisitos — necessita análise humana mais aprofundada.",
  CONFERIR: "Análise inconclusiva — necessita conferência manual antes de qualquer decisão."
};

/*=====================================================
  Utilitários genéricos: caminho pontilhado + operador
=====================================================*/

// Resolve um campo_parser tipo "creditosPorTipo.eletivas.aula" contra
// o objeto "totais" devolvido pelo parser. Devolve undefined (nunca
// lança erro) se qualquer trecho do caminho não existir — quem chama
// trata undefined exatamente como null (campo indisponível).
function historicoResolverCampoParser_(objetoRaiz, caminhoPontilhado) {
  if (!caminhoPontilhado) return undefined;
  const partes = String(caminhoPontilhado).split(".");
  let atual = objetoRaiz;
  for (let i = 0; i < partes.length; i++) {
    if (atual === null || atual === undefined || typeof atual !== "object") return undefined;
    atual = atual[partes[i]];
  }
  return atual;
}

// Compara dois números segundo o operador cadastrado na planilha.
// Devolve null (nunca lança erro) se o operador não for um dos 5
// reconhecidos — quem chama trata null como "não verificável".
function historicoCompararOperador_(valorObtido, operador, valorExigido) {
  switch (operador) {
    case ">=": return valorObtido >= valorExigido;
    case ">": return valorObtido > valorExigido;
    case "=": return valorObtido === valorExigido;
    case "<=": return valorObtido <= valorExigido;
    case "<": return valorObtido < valorExigido;
    default: return null;
  }
}

/*=====================================================
  Reconciliação de identidade/documento — SEMPRE roda antes de
  qualquer avaliação de regra. Qualquer falha aqui interrompe a
  análise imediatamente com CONFERIR; nenhuma regra é avaliada.
=====================================================*/

// input: { chaveHabilitacao, nuspRegistro, documentoDeOutraHabilitacao }
// dadosExtraidos: objeto de sucesso do HistoricoParser (já garantido
// sem .erro por quem chama historicoAvaliarHabilitacao_).
function historicoReconciliarDocumento_(input, dadosExtraidos) {

  const documento = dadosExtraidos.documento || {};
  const cfgHabilitacao = historicoConfigHabilitacao_(input.chaveHabilitacao);

  if (!input.nuspRegistro) {
    return {
      statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA,
      motivo: "O registro do aluno não tem Nº USP cadastrado — não é possível conferir a identidade do " +
        "documento. Preencha o NUSP no cadastro do aluno antes de repetir a análise."
    };
  }

  if (!documento.nusp) {
    return {
      statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA,
      motivo: "Não consegui identificar o Nº USP no cabeçalho do PDF — confira se é realmente o Histórico " +
        "Escolar oficial da Júpiter, exportado em PDF (não uma digitalização/imagem)."
    };
  }

  if (String(documento.nusp).trim() !== String(input.nuspRegistro).trim()) {
    return {
      statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.ERRO_ASSOCIACAO_DOCUMENTO,
      motivo: `Nº USP do PDF (${documento.nusp}) não corresponde ao Nº USP do registro do aluno ` +
        `(${input.nuspRegistro}). Confira se o arquivo certo foi enviado para a pasta deste aluno.`
    };
  }

  if (!documento.cursoCodigoDocumento) {
    return {
      statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA,
      motivo: "Não consegui identificar o código do curso no cabeçalho do PDF."
    };
  }

  // RODADA A: até aqui existia uma checagem "curso do PDF !== 47012 ->
  // HABILITACAO_FALTANDO" — removida de propósito. O curso extraído
  // (qualquer que seja: 47011, 47012, outro) deixa de ser motivo de
  // divergência de reconciliação — é justamente a informação usada
  // depois pra selecionar o ruleset (ver historicoAvaliarHabilitacao_).
  // Um currículo sem ruleset ATIVO cadastrado não é erro de
  // reconciliação: é RULESET_INDISPONIVEL, resolvido mais adiante.

  // Na combinação Psicólogo+Bacharelado, o MESMO PDF do Psicólogo é
  // reaproveitado pra avaliar também o ruleset do Bacharelado — então
  // o cabeçalho do documento vai legitimamente dizer "Psicólogo" mesmo
  // quando o ruleset avaliado é o do Bacharelado. Nesse caso (marcado
  // explicitamente pelo chamador via documentoDeOutraHabilitacao), não
  // faz sentido cobrar que o cabeçalho bata com a habilitação do
  // ruleset — só NUSP e curso (já checados acima) continuam valendo.
  if (!input.documentoDeOutraHabilitacao) {

    if (!documento.habilitacaoCodigoDocumento) {
      return {
        statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA,
        motivo: "Não consegui identificar a habilitação (Psicólogo/Bacharelado/Licenciatura) no cabeçalho do PDF."
      };
    }

    if (String(documento.habilitacaoCodigoDocumento).trim() !== String(cfgHabilitacao.habilitacaoCodigo).trim()) {
      return {
        statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.HABILITACAO_FALTANDO,
        motivo: `O cabeçalho do PDF indica a habilitação "${documento.habilitacaoNomeDocumento || documento.habilitacaoCodigoDocumento}", ` +
          `mas esta análise foi pedida para "${cfgHabilitacao.nome}". Confira se o arquivo certo foi enviado.`
      };
    }

  }

  return { statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.OK, motivo: null };

}

/*=====================================================
  Tempo de curso (semestres válidos, excluindo trancamento total)
=====================================================*/

function historicoAvaliarTempoCurso_(semestresValidos, semestresMinimos, semestresMaximos) {

  if (typeof semestresValidos !== "number" || isNaN(semestresValidos)) {
    return {
      criterio: "TEMPO_CURSO",
      situacao: "NAO_VERIFICADO",
      indisponivel: true,
      semestresValidos: null,
      semestresMinimos: semestresMinimos,
      semestresMaximos: semestresMaximos,
      excedeMaximo: null
    };
  }

  // Abaixo do mínimo: falha objetiva e franca (não é ambiguidade) —
  // NAO_CUMPRIDO, nunca bloqueia por indisponibilidade.
  if (semestresValidos < semestresMinimos) {
    return {
      criterio: "TEMPO_CURSO",
      situacao: "NAO_CUMPRIDO",
      indisponivel: false,
      semestresValidos: semestresValidos,
      semestresMinimos: semestresMinimos,
      semestresMaximos: semestresMaximos,
      excedeMaximo: false
    };
  }

  // Acima do máximo configurado: os valores de semestres_maximos
  // (10/15 Psicólogo, 8/12 Bacharelado) foram informados
  // EXPLICITAMENTE pelo usuário — não são um teto meramente
  // ilustrativo, e exceder o máximo não vira "cumprido" automático.
  // Mas também não vira "não cumprido" objetivo (pode haver situação
  // excepcional/institucional que só uma pessoa da equipe consegue
  // avaliar) — por isso é tratado como indisponibilidade, que força
  // CONFERIR pela mesma agregação já usada em todo o resto do motor
  // (ver historicoAvaliarHabilitacao_: qualquer indisponivel=true em
  // qualquer critério trava o resultado final em CONFERIR).
  const excedeMaximo = (semestresMaximos !== null && semestresMaximos !== undefined) && semestresValidos > semestresMaximos;

  if (excedeMaximo) {
    return {
      criterio: "TEMPO_CURSO",
      situacao: "NAO_VERIFICADO",
      indisponivel: true,
      semestresValidos: semestresValidos,
      semestresMinimos: semestresMinimos,
      semestresMaximos: semestresMaximos,
      excedeMaximo: true
    };
  }

  // Entre o mínimo e o máximo (inclusive nos dois limites): cumprido.
  return {
    criterio: "TEMPO_CURSO",
    situacao: "CUMPRIDO",
    indisponivel: false,
    semestresValidos: semestresValidos,
    semestresMinimos: semestresMinimos,
    semestresMaximos: semestresMaximos,
    excedeMaximo: false
  };

}

/*=====================================================
  Confiabilidade estrutural da extração (blocos de semestre
  ambíguos) — HistoricoParser.html só marca um bloco como
  trancamentoTotal=true quando encontra o texto EXPLÍCITO
  "Trancamento Total" (nunca por inferência). Um bloco com cabeçalho
  de semestre mas sem disciplinas/créditos reconhecidos E sem esse
  texto explícito chega aqui com estruturaInconsistente=true — o
  motor trata isso como indisponibilidade (força CONFERIR pela mesma
  agregação de sempre), nunca como um aviso que fica só decorativo.
=====================================================*/
function historicoAvaliarEstruturaExtracao_(semestres) {

  const semestresInconsistentes = (semestres || [])
    .filter(function (s) { return s && s.estruturaInconsistente === true; })
    .map(function (s) { return s.ano + "/" + s.semestre; });

  if (semestresInconsistentes.length === 0) {
    return { criterio: "ESTRUTURA_EXTRACAO", situacao: "CUMPRIDO", indisponivel: false, semestresInconsistentes: [] };
  }

  return {
    criterio: "ESTRUTURA_EXTRACAO",
    situacao: "NAO_VERIFICADO",
    indisponivel: true,
    semestresInconsistentes: semestresInconsistentes
  };

}

/*=====================================================
  Requisitos numéricos (créditos, horas) — genérico, guiado 100%
  pelas linhas de REQUISITOS_NUMERICOS do ruleset selecionado.
=====================================================*/

function historicoAvaliarRequisitoNumericoSimples_(requisito, totais) {

  const valorObtido = historicoResolverCampoParser_(totais, requisito.campoParser);

  const base = {
    criterio: requisito.criterio,
    descricao: requisito.descricao || requisito.criterio,
    operador: requisito.operador,
    valorExigido: requisito.valor,
    valorObtido: (valorObtido === undefined) ? null : valorObtido,
    unidade: requisito.unidade,
    ordem: requisito.ordem,
    // requisito.obrigatorio chega aqui como true, false OU null
    // (HistoricoRegrasRepository.gs/historicoBooleanoConfiguracaoOuNulo_
    // — auditoria, rodada 3: célula vazia/malformada vira null, nunca
    // false). "!== false" preserva o comportamento de sempre pra SIM
    // (true) e NÃO (false) explícitos, e trata tanto null quanto um
    // ausente/undefined (ex.: requisito montado por outro caminho que
    // não passou pela Repository) como obrigatório aqui em base — mas
    // isso é só o valor "cru" de conveniência; null tem um tratamento
    // PRÓPRIO e mais forte logo abaixo, antes de qualquer decisão
    // automática.
    obrigatorio: requisito.obrigatorio !== false
  };

  // NOVO (auditoria, rodada 3): obrigatorio===null é um sinal
  // EXPLÍCITO vindo da planilha (célula vazia ou valor inválido em
  // REQUISITOS_NUMERICOS) de que ninguém configurou este campo —
  // configuração insegura. Isso nunca pode virar silenciosamente nem
  // "opcional" (deixaria de bloquear por falta de dado) nem
  // "obrigatório avaliado normalmente" (deixaria um CUMPRIDO/
  // NAO_CUMPRIDO passar batido mesmo com a configuração incompleta):
  // o requisito INTEIRO é forçado a CONFERIR aqui, incondicionalmente
  // — mesmo se o dado do histórico estiver disponível e a comparação
  // teria dado certo. A incerteza está na regra, não no aluno.
  if (requisito.obrigatorio === null) {
    return Object.assign({}, base, {
      situacao: "NAO_VERIFICADO",
      indisponivel: true,
      configuracaoInsegura: true
    });
  }

  const semDadoSuficiente = base.valorObtido === null || requisito.valor === null ||
    requisito.valor === undefined || !requisito.operador;

  // Campo "obrigatorio" de REQUISITOS_NUMERICOS (lido em
  // HistoricoRegrasRepository.gs): decide se a FALTA de dado bloqueia
  // a decisão automática ou não.
  // obrigatorio=SIM (ou ausente/mal configurado — mesmo comportamento
  // de sempre, mantido por segurança): sem dado -> indisponivel=true,
  // força CONFERIR via a agregação em historicoAvaliarHabilitacao_.
  // obrigatorio=NÃO: sem dado -> fica registrado como "não
  // verificado" no relatório (ver historicoMontarMotivos_), mas
  // indisponivel=false — sozinho NUNCA contamina o resultado final
  // pra CONFERIR. Um valor null continua NUNCA virando zero nem
  // "cumprido" em nenhum dos dois casos.
  if (semDadoSuficiente) {
    return Object.assign({}, base, { situacao: "NAO_VERIFICADO", indisponivel: base.obrigatorio === true });
  }

  const cumpre = historicoCompararOperador_(base.valorObtido, requisito.operador, requisito.valor);
  if (cumpre === null) {
    return Object.assign({}, base, { situacao: "NAO_VERIFICADO", indisponivel: base.obrigatorio === true });
  }

  // Valor disponível: avaliado normalmente e participa da decisão da
  // mesma forma, seja o requisito obrigatório ou não (obrigatorio só
  // muda o que acontece quando falta dado — nunca o que acontece
  // quando o dado está presente).
  return Object.assign({}, base, { situacao: cumpre ? "CUMPRIDO" : "NAO_CUMPRIDO", indisponivel: false });

}

// Implementa literalmente o exemplo de cálculo do usuário: créditos
// excedentes em optativas eletivas (além do mínimo exigido) "viram"
// créditos livres. Ex. Ana Clara: eletivas exigidas=15, obtidas=41 →
// excedente=26; livres obtidas=26 → livres consideradas=26+26=52;
// livres exigidas=47 → 52>=47, cumpre.
//
// Só aplica a compensação quando os dois requisitos (eletivas e
// livres) usam operador ">=" — é o único caso coberto pelo exemplo
// enviado; qualquer outra combinação foge do que foi especificado, e
// em vez de inventar uma fórmula os dois voltam a ser avaliados
// isoladamente (historicoAvaliarRequisitoNumericoSimples_).
function historicoAvaliarCompensacaoEletivasLivres_(reqEletivas, reqLivres, totais) {

  const eletivasObtidas = historicoResolverCampoParser_(totais, reqEletivas.campoParser);
  const livresObtidas = historicoResolverCampoParser_(totais, reqLivres.campoParser);
  const eletivasExigidas = reqEletivas.valor;
  const livresExigidas = reqLivres.valor;

  const operadoresCompativeis = reqEletivas.operador === ">=" && reqLivres.operador === ">=";
  const dadosCompletos = [eletivasObtidas, livresObtidas, eletivasExigidas, livresExigidas]
    .every(v => v !== null && v !== undefined && typeof v === "number" && !isNaN(v));
  // NOVO (auditoria, rodada 3): obrigatorio===null (configuração
  // insegura) em QUALQUER um dos 2 requisitos não pode ser ignorado
  // só porque o cálculo de compensação "daria pra fazer" com os
  // dados disponíveis — precisa cair no caminho simples abaixo, que
  // já força CONFERIR pra cada requisito com obrigatorio===null
  // (historicoAvaliarRequisitoNumericoSimples_), em vez do atalho de
  // compensação, que nem olha pra obrigatorio.
  const configuracaoObrigatorioSegura = reqEletivas.obrigatorio !== null && reqLivres.obrigatorio !== null;

  if (!operadoresCompativeis || !dadosCompletos || !configuracaoObrigatorioSegura) {
    return {
      eletivas: historicoAvaliarRequisitoNumericoSimples_(reqEletivas, totais),
      livres: historicoAvaliarRequisitoNumericoSimples_(reqLivres, totais)
    };
  }

  const baseEletivas = {
    criterio: reqEletivas.criterio,
    descricao: reqEletivas.descricao || reqEletivas.criterio,
    operador: reqEletivas.operador,
    valorExigido: eletivasExigidas,
    valorObtido: eletivasObtidas,
    unidade: reqEletivas.unidade,
    ordem: reqEletivas.ordem
  };
  const baseLivres = {
    criterio: reqLivres.criterio,
    descricao: reqLivres.descricao || reqLivres.criterio,
    operador: reqLivres.operador,
    valorExigido: livresExigidas,
    valorObtido: livresObtidas,
    unidade: reqLivres.unidade,
    ordem: reqLivres.ordem
  };

  const eletivasCumprida = eletivasObtidas >= eletivasExigidas;
  const excedenteEletivas = Math.max(0, eletivasObtidas - eletivasExigidas);
  const livresConsideradas = livresObtidas + excedenteEletivas;
  const livresCumprida = livresConsideradas >= livresExigidas;

  return {
    eletivas: Object.assign({}, baseEletivas, { situacao: eletivasCumprida ? "CUMPRIDO" : "NAO_CUMPRIDO", indisponivel: false }),
    livres: Object.assign({}, baseLivres, {
      situacao: livresCumprida ? "CUMPRIDO" : "NAO_CUMPRIDO",
      indisponivel: false,
      compensacao: {
        eletivasObtidas: eletivasObtidas,
        eletivasExigidas: eletivasExigidas,
        excedenteEletivas: excedenteEletivas,
        livresObtidasBruto: livresObtidas,
        livresConsideradas: livresConsideradas,
        livresExigidas: livresExigidas
      }
    })
  };

}

// Avalia TODAS as linhas de REQUISITOS_NUMERICOS de um ruleset.
// Quando compensaEletivasParaLivres é true E existem linhas
// ELETIVAS_AULA e LIVRES_AULA cadastradas, as duas são avaliadas
// juntas (com a compensação); qualquer outra linha (ESTAGIO, AAC,
// EXT, OBRIGATORIAS_AULA, ou qualquer criterio novo cadastrado no
// futuro) é avaliada de forma simples e genérica, sem nenhum
// conhecimento hardcoded sobre o que ela significa.
function historicoAvaliarRequisitosNumericos_(requisitos, totais, compensaEletivasParaLivres) {

  const porCriterio = {};
  requisitos.forEach(r => { porCriterio[r.criterio] = r; });

  const resultados = [];
  const tratados = {};

  if (compensaEletivasParaLivres && porCriterio.ELETIVAS_AULA && porCriterio.LIVRES_AULA) {
    const par = historicoAvaliarCompensacaoEletivasLivres_(porCriterio.ELETIVAS_AULA, porCriterio.LIVRES_AULA, totais);
    resultados.push(par.eletivas);
    resultados.push(par.livres);
    tratados.ELETIVAS_AULA = true;
    tratados.LIVRES_AULA = true;
  }

  requisitos.forEach(r => {
    if (tratados[r.criterio]) return;
    resultados.push(historicoAvaliarRequisitoNumericoSimples_(r, totais));
  });

  return resultados.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

}

/*=====================================================
  Disciplinas individuais (OBRIGATORIA) e grupos (GRUPO)
=====================================================*/

function historicoLocalizarSituacoesDisciplina_(todasDisciplinasCursadas, siglaNormalizada) {
  return todasDisciplinasCursadas
    .filter(d => historicoNormalizarSigla_(d.sigla) === siglaNormalizada)
    .map(d => d.status);
}

// Decide se uma disciplina está cumprida a partir das situações
// (status) encontradas no histórico pra aquela sigla.
//
// Decisão de risco deliberada: sigla NÃO encontrada em nenhum
// semestre é tratada como NAO_CUMPRIDA (não como indisponível/
// CONFERIR) — reflete literalmente o que os dados mostram ("o aluno
// não tem essa disciplina no histórico"), e um falso NAO_APTO aqui
// só custa uma conferência humana a mais (o risco assimétrico que o
// próprio usuário definiu como aceitável), nunca um diploma emitido
// indevidamente. Só uma disciplina ENCONTRADA mas com status
// ilegível/desconhecido gera indisponivel=true (aí sim é ambiguidade
// de verdade, não ausência).
function historicoDisciplinaCumprida_(situacoesEncontradas, statusAceitos) {

  if (situacoesEncontradas.length === 0) {
    return { situacao: "NAO_CUMPRIDA", indisponivel: false, naoEncontrada: true };
  }

  const cumprida = situacoesEncontradas.some(s => s && statusAceitos.indexOf(String(s).toUpperCase()) !== -1);
  if (cumprida) {
    return { situacao: "CUMPRIDA", indisponivel: false, naoEncontrada: false };
  }

  const comStatusNulo = situacoesEncontradas.some(s => s === null || s === undefined);
  if (comStatusNulo) {
    return { situacao: "NAO_CUMPRIDA", indisponivel: true, naoEncontrada: false };
  }

  return { situacao: "NAO_CUMPRIDA", indisponivel: false, naoEncontrada: false };

}

function historicoAvaliarDisciplinasIndividuais_(disciplinas, todasDisciplinasCursadas) {
  return disciplinas
    .filter(d => d.tipoRegra === "OBRIGATORIA")
    .map(d => {
      const situacoes = historicoLocalizarSituacoesDisciplina_(todasDisciplinasCursadas, d.sigla);
      const avaliacao = historicoDisciplinaCumprida_(situacoes, d.statusAceitos);
      return {
        sigla: d.sigla,
        nome: d.nome,
        situacao: avaliacao.situacao,
        indisponivel: avaliacao.indisponivel,
        naoEncontrada: avaliacao.naoEncontrada,
        ordem: d.ordem
      };
    })
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

// grupos: linhas de GRUPOS_REGRAS do ruleset.
// disciplinasDoGrupoPorId: { grupoId: [linhas de DISCIPLINAS com tipoRegra="GRUPO"] }.
function historicoAvaliarGrupos_(grupos, disciplinasDoGrupoPorId, todasDisciplinasCursadas) {

  return grupos.map(g => {

    const membrosDaRegra = disciplinasDoGrupoPorId[g.grupoId] || [];

    const avaliacoesMembros = membrosDaRegra.map(d => {
      const situacoes = historicoLocalizarSituacoesDisciplina_(todasDisciplinasCursadas, d.sigla);
      const avaliacao = historicoDisciplinaCumprida_(situacoes, d.statusAceitos);
      return { sigla: d.sigla, nome: d.nome, situacao: avaliacao.situacao, indisponivel: avaliacao.indisponivel };
    });

    const indisponivelAlgumMembro = avaliacoesMembros.some(m => m.indisponivel);
    const cumpridos = avaliacoesMembros.filter(m => m.situacao === "CUMPRIDA");

    const resultadoGrupo = {
      grupoId: g.grupoId,
      nomeGrupo: g.nomeGrupo,
      tipoRegra: g.tipoRegra,
      membros: avaliacoesMembros
    };

    if (g.tipoRegra === "ONE_OF" || g.tipoRegra === "MIN_COUNT") {

      const minimo = g.tipoRegra === "ONE_OF" ? (g.valorMinimo === null ? 1 : g.valorMinimo) : g.valorMinimo;

      if (minimo === null) {
        resultadoGrupo.situacao = "NAO_VERIFICADO";
        resultadoGrupo.indisponivel = true;
      } else if (cumpridos.length >= minimo) {
        // Já tem confirmação suficiente de disciplinas cumpridas —
        // basta pra decidir CUMPRIDO mesmo que outro membro do grupo
        // esteja com status ambíguo (não precisa dele).
        resultadoGrupo.situacao = "CUMPRIDO";
        resultadoGrupo.indisponivel = false;
      } else if (indisponivelAlgumMembro) {
        // Não bateu o mínimo ainda, mas algum membro está ambíguo —
        // pode ser que ele resolva o grupo, então não é seguro dizer
        // NAO_CUMPRIDO.
        resultadoGrupo.situacao = "NAO_VERIFICADO";
        resultadoGrupo.indisponivel = true;
      } else {
        resultadoGrupo.situacao = "NAO_CUMPRIDO";
        resultadoGrupo.indisponivel = false;
      }

    } else if (g.tipoRegra === "MIN_CREDITS") {

      // Não exercitado pelos dados reais atuais (GRUPOS_REGRAS só tem
      // linhas ONE_OF hoje) — implementado de forma genérica mesmo
      // assim, porque o tipo faz parte do contrato da planilha
      // (DICIONARIO → TIPO_REGRA_GRUPO). campo_soma decide se soma
      // créditos-aula ("au", padrão) ou créditos-trabalho ("tr") de
      // cada disciplina cumprida do grupo.
      const campo = (g.campoSoma === "tr" || g.campoSoma === "trabalho") ? "tr" : "au";
      let somaCumpridos = 0;
      let algumaIndisponivelCredito = false;

      cumpridos.forEach(m => {
        const ocorrencias = todasDisciplinasCursadas.filter(dc => historicoNormalizarSigla_(dc.sigla) === m.sigla);
        const comCredito = ocorrencias.filter(dc => dc[campo] !== null && dc[campo] !== undefined);
        if (comCredito.length === 0) {
          algumaIndisponivelCredito = true;
        } else {
          somaCumpridos += Math.max.apply(null, comCredito.map(dc => dc[campo]));
        }
      });

      if (g.valorMinimo === null || algumaIndisponivelCredito) {
        resultadoGrupo.situacao = "NAO_VERIFICADO";
        resultadoGrupo.indisponivel = true;
      } else {
        resultadoGrupo.situacao = somaCumpridos >= g.valorMinimo ? "CUMPRIDO" : "NAO_CUMPRIDO";
        resultadoGrupo.indisponivel = false;
      }
      resultadoGrupo.creditosSomados = somaCumpridos;

    } else {
      resultadoGrupo.situacao = "NAO_VERIFICADO";
      resultadoGrupo.indisponivel = true;
      resultadoGrupo.motivoTipoDesconhecido = `Tipo de regra de grupo desconhecido: "${g.tipoRegra}".`;
    }

    return resultadoGrupo;

  });

}

/*=====================================================
  Montagem de "detalhes" (relatório completo) e "motivos" (lista
  curta do que precisa de atenção, pro parecer e pra auditoria)
=====================================================*/

function historicoMontarDetalhes_(temposCursoResultado, estruturaExtracaoResultado, requisitosAvaliados, disciplinasObrigatorias, gruposAvaliados) {

  const detalhes = {
    tempoCurso: temposCursoResultado,
    estruturaExtracao: estruturaExtracaoResultado,
    creditosObrigatorios: null,
    creditosEletivas: null,
    creditosLivres: null,
    estagio: null,
    aac: null,
    ext: null,
    outrosRequisitosNumericos: [],
    disciplinasObrigatoriasEspecificas: disciplinasObrigatorias,
    gruposDisciplinas: gruposAvaliados
  };

  requisitosAvaliados.forEach(r => {
    const chave = HISTORICO_MAPA_CRITERIO_PARA_CHAVE_DETALHE[r.criterio];
    if (chave) {
      detalhes[chave] = r;
    } else {
      detalhes.outrosRequisitosNumericos.push(r);
    }
  });

  return detalhes;

}

function historicoMontarMotivos_(temposCursoResultado, estruturaExtracaoResultado, requisitosAvaliados, disciplinasObrigatorias, gruposAvaliados) {

  const motivos = [];
  const naoResolvidoOuFalho = a => a.situacao !== "CUMPRIDO" && a.situacao !== "CUMPRIDA";

  if (naoResolvidoOuFalho(temposCursoResultado)) {
    const a = temposCursoResultado;
    let mensagemTempoCurso;
    if (a.excedeMaximo) {
      mensagemTempoCurso = `Tempo de curso acima do máximo configurado — necessita análise humana. ` +
        `(${a.semestresValidos} semestre(s) válido(s) registrados; máximo configurado: ${a.semestresMaximos}.)`;
    } else if (a.indisponivel) {
      mensagemTempoCurso = "Não foi possível determinar quantos semestres válidos o histórico tem.";
    } else {
      mensagemTempoCurso = `Tempo de curso insuficiente: ${a.semestresValidos} semestre(s) válido(s) registrados (mínimo exigido: ${a.semestresMinimos}).`;
    }
    motivos.push({
      tipo: "TEMPO_CURSO",
      criterio: "TEMPO_CURSO",
      mensagem: mensagemTempoCurso,
      severidade: a.indisponivel ? "BLOQUEIO" : "FALHA"
    });
  }

  if (naoResolvidoOuFalho(estruturaExtracaoResultado)) {
    const a = estruturaExtracaoResultado;
    motivos.push({
      tipo: "ESTRUTURA_EXTRACAO",
      criterio: "ESTRUTURA_EXTRACAO",
      mensagem: `Encontrei ${a.semestresInconsistentes.length} bloco(s) de semestre sem disciplinas/créditos ` +
        `reconhecidos e sem indicação explícita de Trancamento Total (${a.semestresInconsistentes.join(", ")}) — ` +
        `não é possível confirmar automaticamente o que esse(s) período(s) representa(m). Necessita análise humana.`,
      severidade: "BLOQUEIO"
    });
  }

  requisitosAvaliados.filter(naoResolvidoOuFalho).forEach(a => {
    let mensagemRequisito, severidadeRequisito;
    if (a.configuracaoInsegura) {
      // NOVO (auditoria, rodada 3): campo "obrigatorio" vazio ou
      // inválido em REQUISITOS_NUMERICOS — a incerteza está na
      // CONFIGURAÇÃO da regra, não no histórico do aluno (o valor
      // pode até ter sido encontrado), então a mensagem não pode
      // dizer "não encontrei no histórico". Sempre BLOQUEIO: uma
      // configuração insegura nunca decide sozinha.
      mensagemRequisito = `O campo "obrigatorio" de "${a.descricao}" não está configurado (célula vazia ou valor ` +
        `inválido) em REQUISITOS_NUMERICOS — configuração insegura, necessita revisão manual antes de decidir ` +
        `este requisito automaticamente.`;
      severidadeRequisito = "BLOQUEIO";
    } else if (a.indisponivel) {
      mensagemRequisito = `Não encontrei no histórico extraído o valor de "${a.descricao}" (requisito obrigatório para a decisão automática).`;
      severidadeRequisito = "BLOQUEIO";
    } else if (a.situacao === "NAO_VERIFICADO") {
      // obrigatorio=NÃO e o valor não foi encontrado: registrado pra
      // conferência, mas isso sozinho não bloqueia a decisão — por
      // isso a severidade é "INFO", não "BLOQUEIO" nem "FALHA".
      mensagemRequisito = `Não encontrei no histórico extraído o valor de "${a.descricao}" — como este requisito ` +
        `não é obrigatório para a decisão automática, isso sozinho não impede um parecer, mas fica registrado ` +
        `aqui para conferência.`;
      severidadeRequisito = "INFO";
    } else {
      mensagemRequisito = `${a.descricao}: obtido ${a.valorObtido} ${a.unidade || ""}, exigido ${a.operador} ${a.valorExigido} ${a.unidade || ""}.`.replace(/\s+/g, " ").trim();
      severidadeRequisito = "FALHA";
    }
    motivos.push({ tipo: "REQUISITO_NUMERICO", criterio: a.criterio, mensagem: mensagemRequisito, severidade: severidadeRequisito });
  });

  disciplinasObrigatorias.filter(naoResolvidoOuFalho).forEach(a => {
    const rotulo = `${a.sigla}${a.nome ? " (" + a.nome + ")" : ""}`;
    let mensagem;
    if (a.indisponivel) {
      mensagem = `Disciplina ${rotulo}: aparece no histórico com situação não reconhecida — confira manualmente.`;
    } else if (a.naoEncontrada) {
      mensagem = `Disciplina obrigatória ${rotulo} não aparece no histórico extraído. Se o(a) aluno(a) ` +
        `efetivamente cursou essa disciplina, confira manualmente — a extração automática ocasionalmente não reconhece alguma linha.`;
    } else {
      mensagem = `Disciplina obrigatória ${rotulo} consta no histórico sem situação de aprovação.`;
    }
    motivos.push({ tipo: "DISCIPLINA_OBRIGATORIA", criterio: a.sigla, mensagem: mensagem, severidade: a.indisponivel ? "BLOQUEIO" : "FALHA" });
  });

  gruposAvaliados.filter(naoResolvidoOuFalho).forEach(a => {
    const mensagem = a.indisponivel
      ? `Grupo "${a.nomeGrupo}": não foi possível confirmar a situação de todas as disciplinas do grupo — confira manualmente.`
      : `Grupo "${a.nomeGrupo}" não cumprido (regra: ${a.tipoRegra}).`;
    motivos.push({ tipo: "GRUPO_DISCIPLINAS", criterio: a.nomeGrupo, mensagem: mensagem, severidade: a.indisponivel ? "BLOQUEIO" : "FALHA" });
  });

  return motivos;

}

/*=====================================================
  Retornos antecipados (Licenciatura não implementada / extração
  falhou) — mesmo formato de objeto que o caminho normal, pra
  HistoricoAuditoria.gs e a UI nunca precisarem tratar "formatos
  diferentes de resultado".
=====================================================*/

function historicoMontarResultadoNaoImplementado_(chaveHabilitacao) {
  return {
    habilitacao: chaveHabilitacao,
    resultado: HISTORICO_RESULTADO.CONFERIR,
    parecerTexto: HISTORICO_PARECER_TEXTO.CONFERIR,
    statusReconciliacao: null,
    rulesetId: null,
    rulesetVersao: null,
    rulesetRevisao: null,
    rulesetEstruturaCurricular: null,
    motivos: [{
      tipo: "NAO_IMPLEMENTADO",
      criterio: null,
      mensagem: "A análise automática de histórico para Licenciatura ainda não foi implementada nesta " +
        "versão do sistema — a checagem de requisitos precisa ser feita manualmente.",
      severidade: "BLOQUEIO"
    }],
    detalhes: null,
    avisosParser: null,
    camposNaoReconhecidosParser: null,
    parserVersion: null
  };
}

// RODADA A.1 — Descreve o ruleset CANDIDATO (o que tinha sido
// selecionado antes de a guarda de estabilidade detectar um problema)
// só pra diagnóstico dentro do TEXTO do motivo — nunca nos campos
// formais rulesetId/rulesetVersao/rulesetRevisao/
// rulesetEstruturaCurricular do resultado (ver
// historicoMontarResultadoGuardaInstavel_ logo abaixo). Perder essa
// informação tornaria mais difícil entender o que aconteceu numa
// conferência manual — mas ela só pode aparecer como "identificação
// do candidato no momento da leitura", nunca como "isto foi
// efetivamente usado".
function historicoDescreverRulesetCandidato_(ruleset) {
  if (!ruleset) return "";
  return `Ruleset candidato: ${ruleset.rulesetId}, revisão observada inicialmente: ${ruleset.revisao}.`;
}

// RODADA A.1 — Constrói o resultado comum às situações em que a
// guarda de estabilidade do ruleset não permite confiar no pacote de
// regras já lido: RULESET_EM_CORRECAO, RULESET_AUDITORIA_INDISPONIVEL,
// e a variante de RULESET_MUDOU_DURANTE_ANALISE disparada por
// rulesetId/revisao terem mudado de verdade (RODADA A) OU pelo
// watermark da auditoria curricular ter mudado (RODADA A.1) — as duas
// variantes de RULESET_MUDOU_DURANTE_ANALISE passam a usar esta mesma
// função, unificando o comportamento.
//
// INVARIANTE DE RASTREABILIDADE (auditoria desta rodada, ajuste 1):
// rulesetId/rulesetVersao/rulesetRevisao/rulesetEstruturaCurricular
// SEMPRE null aqui — mesmo quando o ruleset já tinha sido identificado
// com sucesso antes da guarda falhar — porque nesses casos não dá pra
// afirmar que um pacote ESTÁVEL daquela revisão chegou a ser
// efetivamente usado pelo motor. Só quando esses 4 campos vêm
// preenchidos (caminho normal, fim de historicoAvaliarHabilitacao_) é
// que "ruleset_revisao = X" pode ser lido depois como "esta análise
// usou com segurança um pacote estável da revisão X" — nunca o
// contrário. A identificação do candidato não se perde: fica só no
// texto do motivo (historicoDescreverRulesetCandidato_ acima), nunca
// nos campos formais.
function historicoMontarResultadoGuardaInstavel_(chaveHabilitacao, statusReconciliacao, tipoMotivo, mensagem, dadosExtraidos) {
  return {
    habilitacao: chaveHabilitacao,
    resultado: HISTORICO_RESULTADO.CONFERIR,
    parecerTexto: HISTORICO_PARECER_TEXTO.CONFERIR,
    statusReconciliacao: statusReconciliacao,
    rulesetId: null,
    rulesetVersao: null,
    rulesetRevisao: null,
    rulesetEstruturaCurricular: null,
    motivos: [{ tipo: tipoMotivo, criterio: null, mensagem: mensagem, severidade: "BLOQUEIO" }],
    detalhes: null,
    avisosParser: (dadosExtraidos && dadosExtraidos.avisos) || null,
    camposNaoReconhecidosParser: (dadosExtraidos && dadosExtraidos.camposNaoReconhecidos) || null,
    parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
  };
}

function historicoMontarResultadoExtracaoFalhou_(chaveHabilitacao, dadosExtraidos) {
  const mensagem = (dadosExtraidos && dadosExtraidos.mensagem)
    ? dadosExtraidos.mensagem
    : "Não foi possível extrair dados deste PDF.";
  return {
    habilitacao: chaveHabilitacao,
    resultado: HISTORICO_RESULTADO.CONFERIR,
    parecerTexto: HISTORICO_PARECER_TEXTO.CONFERIR,
    statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA,
    rulesetId: null,
    rulesetVersao: null,
    rulesetRevisao: null,
    rulesetEstruturaCurricular: null,
    motivos: [{
      tipo: (dadosExtraidos && dadosExtraidos.erro) || "EXTRACAO_FALHOU",
      criterio: null,
      mensagem: mensagem,
      severidade: "BLOQUEIO"
    }],
    detalhes: null,
    avisosParser: null,
    camposNaoReconhecidosParser: null,
    parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
  };
}

// Função PURA e pequena (RODADA A): junta curso + habilitação alvo na
// mesma chave usada pra buscar o ruleset — existe só pra deixar essa
// regra testável isoladamente, sem precisar rodar o motor inteiro.
//
//   curso  = SEMPRE o do documento extraído (dadosExtraidos.documento.
//            cursoCodigoDocumento — já garantido presente pela
//            reconciliação, que roda antes disso).
//   habilitação alvo = SEMPRE a da análise em execução (cfgHabilitacao
//            .habilitacaoCodigo — nunca dadosExtraidos.documento.
//            habilitacaoCodigoDocumento, que é só o cabeçalho do PDF e
//            pode legitimamente ser de OUTRA habilitação no combo
//            Psicólogo+Bacharelado — ver documentoDeOutraHabilitacao
//            em historicoReconciliarDocumento_).
//
// Isso é o que permite reaproveitar o MESMO PDF do Psicólogo pra
// avaliar Psicólogo (curso+0) e, na sequência, Bacharelado (mesmo
// curso+100) — cada avaliação resolve seu próprio ruleset, mas as duas
// usam o curso extraído desse único documento.
function historicoResolverCursoHabilitacaoAlvo_(dadosExtraidos, cfgHabilitacao) {
  return {
    cursoCodigo: dadosExtraidos.documento.cursoCodigoDocumento,
    habilitacaoCodigo: cfgHabilitacao.habilitacaoCodigo
  };
}

/*=====================================================
  ORQUESTRADOR PRINCIPAL

  input = {
    chaveHabilitacao: "psi" | "bach" | "lic",
    nuspRegistro: string|null,        // NUSP do registro do aluno no Diplomas (nunca do cliente sem validação prévia)
    dadosExtraidos: objeto devolvido por HistoricoParser.extrairDeBase64 no navegador,
    documentoDeOutraHabilitacao: boolean  // true só na perna "Bacharelado" de uma combinação Psicólogo+Bacharelado, quando o PDF usado foi o do Psicólogo
  }

  devolve sempre o mesmo formato:
  {
    habilitacao, resultado, parecerTexto, statusReconciliacao,
    rulesetId, rulesetVersao, rulesetRevisao, rulesetEstruturaCurricular,
    motivos[], detalhes|null,
    avisosParser|null, camposNaoReconhecidosParser|null, parserVersion
  }

  NUNCA lança erro por causa de dado de aluno malformado/incompleto —
  qualquer situação assim vira resultado=CONFERIR com um motivo
  explicando o quê. Só lança erro por problema de CONFIGURAÇÃO do
  sistema (aba/coluna renomeada na planilha de regras, chaveHabilitacao
  inválida) — esses sim são bugs, não ambiguidade de dado de aluno.
=====================================================*/
function historicoAvaliarHabilitacao_(input) {

  const chaveHabilitacao = input.chaveHabilitacao;
  const cfgHabilitacao = historicoConfigHabilitacao_(chaveHabilitacao); // lança erro se chave for inválida — isso é bug, não ambiguidade

  if (!cfgHabilitacao.implementado) {
    return historicoMontarResultadoNaoImplementado_(chaveHabilitacao);
  }

  const dadosExtraidos = input.dadosExtraidos;
  if (!dadosExtraidos || dadosExtraidos.erro) {
    return historicoMontarResultadoExtracaoFalhou_(chaveHabilitacao, dadosExtraidos);
  }

  // 1) Reconciliação de identidade/documento.
  const reconciliacao = historicoReconciliarDocumento_(input, dadosExtraidos);
  if (reconciliacao.statusReconciliacao !== HISTORICO_STATUS_RECONCILIACAO.OK) {
    return {
      habilitacao: chaveHabilitacao,
      resultado: HISTORICO_RESULTADO.CONFERIR,
      parecerTexto: HISTORICO_PARECER_TEXTO.CONFERIR,
      statusReconciliacao: reconciliacao.statusReconciliacao,
      rulesetId: null,
      rulesetVersao: null,
      rulesetRevisao: null,
      rulesetEstruturaCurricular: null,
      motivos: [{ tipo: "RECONCILIACAO", criterio: null, mensagem: reconciliacao.motivo, severidade: "BLOQUEIO" }],
      detalhes: null,
      avisosParser: dadosExtraidos.avisos || null,
      camposNaoReconhecidosParser: dadosExtraidos.camposNaoReconhecidos || null,
      parserVersion: dadosExtraidos.parserVersion || null
    };
  }

  // 2) Seleção do ruleset ATIVO — curso vem do documento analisado,
  // habilitação alvo vem da análise em execução (nunca do cabeçalho
  // do PDF — ver historicoResolverCursoHabilitacaoAlvo_ acima).
  const chaveSelecao = historicoResolverCursoHabilitacaoAlvo_(dadosExtraidos, cfgHabilitacao);
  const selecao = historicoSelecionarRulesetAtivo_(chaveSelecao.cursoCodigo, chaveSelecao.habilitacaoCodigo);
  if (!selecao.ruleset) {
    return {
      habilitacao: chaveHabilitacao,
      resultado: HISTORICO_RESULTADO.CONFERIR,
      parecerTexto: HISTORICO_PARECER_TEXTO.CONFERIR,
      statusReconciliacao: reconciliacao.statusReconciliacao,
      rulesetId: null,
      rulesetVersao: null,
      rulesetRevisao: null,
      rulesetEstruturaCurricular: null,
      motivos: [{ tipo: "RULESET_INDISPONIVEL", criterio: null, mensagem: selecao.motivoIndisponivel, severidade: "BLOQUEIO" }],
      detalhes: null,
      avisosParser: dadosExtraidos.avisos || null,
      camposNaoReconhecidosParser: dadosExtraidos.camposNaoReconhecidos || null,
      parserVersion: dadosExtraidos.parserVersion || null
    };
  }

  const ruleset = selecao.ruleset;

  // 2.1) RODADA A.1 — Guarda de estabilidade, captura ANTES de montar
  // o pacote de regras (ver HistoricoRegrasRepository.gs). Qualquer
  // problema pra confirmar essa leitura (aba/coluna ausente, exceção
  // técnica, trilha malformada) falha fechado: CONFERIR, nunca
  // prossegue "assumindo que deve estar tudo bem". Uma correção em
  // aberto (PREPARADA) do MESMO ruleset também bloqueia aqui — ANTES
  // de gastar as 3 leituras de historicoMontarPacoteRegras_ — mesmo
  // que exista uma CONFIRMADA/FALHOU posterior pra essa mesma
  // correção (uma PREPARADA órfã nunca é ignorada silenciosamente).
  const guardaAntes = historicoLerGuardaAuditoriaRuleset_(ruleset.rulesetId);

  if (!guardaAntes.ok) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_AUDITORIA_INDISPONIVEL",
      `Não foi possível confirmar a estabilidade do ruleset antes de usá-lo: ${guardaAntes.motivo} ` +
        historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  if (guardaAntes.temPreparada) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_EM_CORRECAO",
      `Há uma correção em andamento (PREPARADA) para o ruleset ${ruleset.rulesetId} no Dashboard dos ` +
        `Servidores — não é seguro usar este ruleset agora. Repita a análise depois que a correção terminar. ` +
        historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  const pacote = historicoMontarPacoteRegras_(ruleset.rulesetId);

  // 2.2) Revalidação de concorrência (RODADA A, item 62 do escopo —
  // parecer técnico dado no relatório pré-código da Rodada A).
  // PRESERVADA exatamente como já era: entre a leitura de CURRICULOS
  // acima (que capturou ruleset.revisao) e as 3 leituras separadas de
  // REQUISITOS_NUMERICOS/DISCIPLINAS/GRUPOS_REGRAS feitas por
  // historicoMontarPacoteRegras_, existe uma janela — estreita, mas
  // real — em que uma correção no Dashboard dos Servidores poderia
  // mudar a revisão do MESMO ruleset_id no meio da leitura, misturando
  // identidade antiga com números já corrigidos. Na dúvida, não
  // decide: revalida e, se mudou algo, CONFERIR — sem retry
  // automático.
  const revalidacao = historicoSelecionarRulesetAtivo_(chaveSelecao.cursoCodigo, chaveSelecao.habilitacaoCodigo);
  const rulesetMudouDuranteAnalise = !revalidacao.ruleset ||
    revalidacao.ruleset.rulesetId !== ruleset.rulesetId ||
    revalidacao.ruleset.revisao !== ruleset.revisao;
  if (rulesetMudouDuranteAnalise) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_MUDOU_DURANTE_ANALISE",
      `A configuração do ruleset ${ruleset.rulesetId} mudou durante esta análise (possível correção ` +
        `concorrente no Dashboard dos Servidores). Repita a análise deste aluno. ` +
        historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  // 2.3) RODADA A.1 — Guarda de estabilidade, captura DEPOIS de montar
  // o pacote de regras, e comparação com a captura ANTES (item 2.1).
  // Detecta especificamente o cenário que a revalidação acima (2.2)
  // NÃO alcança: uma correção que É iniciada (PREPARADA), muta dados,
  // e é ABORTADA (estado FALHOU) sem chegar a mudar "revisao" — as
  // duas leituras de revisao ficam idênticas mesmo que o pacote lido
  // em "pacote" acima tenha capturado um estado transitório no meio
  // do caminho. Sem lock e sem retry automático — só detecção +
  // CONFERIR; a pessoa reroda manualmente depois.
  const guardaDepois = historicoLerGuardaAuditoriaRuleset_(ruleset.rulesetId);

  if (!guardaDepois.ok) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_AUDITORIA_INDISPONIVEL",
      `Não foi possível confirmar a estabilidade do ruleset depois de montar o pacote de regras: ` +
        `${guardaDepois.motivo} ` + historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  if (guardaDepois.temPreparada) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_EM_CORRECAO",
      `Uma correção (PREPARADA) para o ruleset ${ruleset.rulesetId} apareceu no Dashboard dos Servidores ` +
        `durante esta análise — não é seguro usar o pacote de regras já lido. Repita a análise deste aluno. ` +
        historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  const comparacaoGuarda = historicoCompararGuardasRuleset_(guardaAntes, guardaDepois);
  if (!comparacaoGuarda.estavel) {
    return historicoMontarResultadoGuardaInstavel_(
      chaveHabilitacao, reconciliacao.statusReconciliacao, "RULESET_MUDOU_DURANTE_ANALISE",
      `${comparacaoGuarda.motivo} Isso pode acontecer mesmo sem a revisão do ruleset ter mudado (ex.: uma ` +
        `correção iniciada e depois abortada) — repita a análise deste aluno. ` +
        historicoDescreverRulesetCandidato_(ruleset),
      dadosExtraidos
    );
  }

  const totais = dadosExtraidos.totais || {};
  const semestresValidos = (typeof dadosExtraidos.semestresValidos === "number") ? dadosExtraidos.semestresValidos : null;

  // 3) Avaliação de regras.
  const temposCursoResultado = historicoAvaliarTempoCurso_(semestresValidos, ruleset.semestresMinimos, ruleset.semestresMaximos);
  const estruturaExtracaoResultado = historicoAvaliarEstruturaExtracao_(dadosExtraidos.semestres);

  const requisitosAvaliados = historicoAvaliarRequisitosNumericos_(
    pacote.requisitosNumericos, totais, ruleset.excedenteEletivasCompensaLivres === true
  );

  const todasDisciplinasCursadas = [];
  (dadosExtraidos.semestres || []).forEach(s => {
    (s.disciplinas || []).forEach(d => todasDisciplinasCursadas.push(d));
  });

  const disciplinasObrigatorias = historicoAvaliarDisciplinasIndividuais_(pacote.disciplinas, todasDisciplinasCursadas);

  const disciplinasDoGrupoPorId = {};
  pacote.disciplinas.filter(d => d.tipoRegra === "GRUPO").forEach(d => {
    if (!disciplinasDoGrupoPorId[d.grupoId]) disciplinasDoGrupoPorId[d.grupoId] = [];
    disciplinasDoGrupoPorId[d.grupoId].push(d);
  });
  const gruposAvaliados = historicoAvaliarGrupos_(pacote.grupos, disciplinasDoGrupoPorId, todasDisciplinasCursadas);

  // 4) Agregação final — CONFERIR tem precedência sobre NAO_APTO, que
  // tem precedência sobre APTO. Basta UM item indisponível em
  // qualquer lugar pra travar em CONFERIR, mesmo que tudo o resto
  // esteja cumprido.
  const todasAvaliacoes = [temposCursoResultado, estruturaExtracaoResultado]
    .concat(requisitosAvaliados)
    .concat(disciplinasObrigatorias)
    .concat(gruposAvaliados);

  const algumCampoIndisponivel = todasAvaliacoes.some(a => a.indisponivel === true);
  const algumaFalhaObjetiva = todasAvaliacoes.some(a => a.situacao === "NAO_CUMPRIDO" || a.situacao === "NAO_CUMPRIDA");

  const resultadoFinal = algumCampoIndisponivel
    ? HISTORICO_RESULTADO.CONFERIR
    : (algumaFalhaObjetiva ? HISTORICO_RESULTADO.NAO_APTO : HISTORICO_RESULTADO.APTO);

  const detalhes = historicoMontarDetalhes_(temposCursoResultado, estruturaExtracaoResultado, requisitosAvaliados, disciplinasObrigatorias, gruposAvaliados);
  const motivos = historicoMontarMotivos_(temposCursoResultado, estruturaExtracaoResultado, requisitosAvaliados, disciplinasObrigatorias, gruposAvaliados);

  return {
    habilitacao: chaveHabilitacao,
    resultado: resultadoFinal,
    parecerTexto: HISTORICO_PARECER_TEXTO[resultadoFinal],
    statusReconciliacao: HISTORICO_STATUS_RECONCILIACAO.OK,
    rulesetId: ruleset.rulesetId,
    rulesetVersao: ruleset.versao,
    rulesetRevisao: ruleset.revisao,
    rulesetEstruturaCurricular: ruleset.estruturaCurricular,
    motivos: motivos,
    detalhes: detalhes,
    avisosParser: dadosExtraidos.avisos || [],
    camposNaoReconhecidosParser: dadosExtraidos.camposNaoReconhecidos || [],
    parserVersion: dadosExtraidos.parserVersion || null
  };

}
