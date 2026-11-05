/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Consultas (RODADA B/C, FASE B2).

  Responsabilidade ÚNICA deste arquivo: LER (nunca escrever) a aba
  ANALISE_HISTORICO já gravada por HistoricoAuditoria.gs, agrupar suas
  linhas em "sessões de análise" (por sessao_analise_id — ver
  HISTORICO_COLUNA_SESSAO_ANALISE em HistoricoConfig.gs e
  historicoCriarSessaoAnalise em HistoricoEndpoints.gs) e RECONSTRUIR,
  a partir delas, um objeto que bate EXATAMENTE com o formato que
  avaliarHistoricoExtraido (HistoricoEndpoints.gs) já devolve ao vivo —
  pra permitir que a tela (HistoricoAnaliseUI.html) reaproveite, SEM
  NENHUMA MODIFICAÇÃO, as mesmas funções de renderização já usadas pra
  mostrar um resultado recém-calculado
  (historicoRenderizarCorpoResultado_ / historicoCriarBlocoHabilitacao_ /
  historicoRenderizarDetalhes_).

  NUNCA reexecuta PDF.js, o motor de regras (HistoricoMotor.gs) ou a
  seleção de ruleset (HistoricoRegrasRepository.gs) — isso é o ponto
  central desta fase: reabrir uma sessão já analisada é uma operação
  100% de LEITURA da planilha, nunca uma reanálise. NUNCA grava
  nenhuma linha nova em ANALISE_HISTORICO (contraste com
  HistoricoEndpoints.gs/HistoricoAuditoria.gs, que são os únicos
  responsáveis por gravar) e NUNCA altera Diplomas/etapa/Versão/
  ruleset/status de nada.

  SEM exigência de Versão/etapa (diferente de historicoCriarSessaoAnalise
  e avaliarHistoricoExtraido, em HistoricoEndpoints.gs): os 3 endpoints
  deste arquivo só confirmam, via resolverRegistroPorId_, que o
  Registro ID existe de verdade — histórico de auditoria é permanente e
  PRECISA continuar acessível mesmo depois do aluno avançar da etapa
  "historico" pra frente (ex.: já em "documentacao" ou além). Nome/NUSP
  exibidos vêm das próprias linhas de auditoria (já gravadas no
  momento de cada análise), nunca de uma releitura da aba Diplomas.

  SESSÕES "LEGADO": linhas gravadas ANTES de migrarAnaliseHistoricoRelatoriosV1
  (HistoricoAuditoria.gs) têm sessao_analise_id vazio. Elas NUNCA são
  agrupadas por proximidade de horário (mesmo que, na prática, uma
  análise Psicólogo+Bacharelado pré-migração tenha gerado duas linhas
  em sequência) — cada linha legado vira sua PRÓPRIA pseudo-sessão,
  isolada, usando o próprio execucao_id como identificador público de
  sessão (nunca inventa/infere retroativamente um agrupamento que a
  gravação original não fez). Ver historicoAgruparLinhasEmSessoes_.

  GRAU DE CONFIANÇA / DEGRADAÇÃO GRACIOSA: os campos de auditoria "de
  negócio" que vivem em colunas próprias (resultado, status_reconciliacao,
  ruleset_id/ruleset_versao/ruleset_revisao/estrutura_curricular,
  parser_version, engine_version, execucao_id, analisado_em,
  habilitacao_codigo, e — RODADA B/C.1, §12 — arquivo_id/arquivo_nome/
  arquivo_modificado_em/hash_sha256) são sempre lidos como gravados —
  nenhuma dessas colunas passa por serialização, então não há o que
  "corromper" nelas além de edição manual direta na planilha. Quem
  carrega motivos[]/detalhes/parecerTexto/avisosParser/
  camposNaoReconhecidosParser é a coluna motivos_json, e quem carrega
  cursoCodigoDocumento (RODADA B/C.1, §12) é a coluna
  dados_extraidos_json (ver HistoricoAuditoria.gs) — as DUAS colunas
  JSON sujeitas a truncamento (célula que excedeu
  HISTORICO_AUDITORIA_LIMITE_JSON no momento da gravação, o MESMO
  limite pras duas) ou, em teoria, corrupção manual. Por isso
  historicoParsearMotivosJsonSeguro_/historicoParsearDadosExtraidosJsonSeguro_
  tratam essas duas colunas com cuidado extra — e NUNCA lançam erro: a
  primeira degrada pra um motivo sintético explicando o problema; a
  segunda degrada pra cursoCodigoDocumento=null (nunca inventa um
  currículo) — preservando, nos dois casos, resultado/
  statusReconciliacao/ruleset* exatamente como gravados nas colunas
  próprias (o resultado já decidido e auditado no passado não muda por
  causa de uma coluna de apoio corrompida).
=====================================================*/

/*=====================================================
  Leitura bruta + agrupamento em sessões
=====================================================*/

// Lê a aba ANALISE_HISTORICO INTEIRA (historicoLerTabela_, já existente
// em HistoricoRegrasRepository.gs — largura total, por nome de
// cabeçalho) e filtra só as linhas do registroId pedido. Leitura de
// largura total, DE PROPÓSITO — ao contrário de
// historicoValidarConsistenciaSessao_ (HistoricoAuditoria.gs, só 2
// colunas, roda em TODA gravação — um hot path em potencial durante um
// lote grande), esta função roda só quando alguém da equipe clica pra
// ver histórico/última análise de UM aluno — um clique isolado, nunca
// um hot path — então não compensa a complexidade de uma leitura
// estreita aqui (mesmo raciocínio de custo/frequência já usado pra
// justificar a escolha oposta em HistoricoAuditoria.gs).
function historicoLerLinhasAuditoriaPorRegistro_(registroId) {
  const planilha = historicoAbrirPlanilhaRegras_();
  const aba = historicoObterAba_(planilha, ABA_REGRAS_AUDITORIA);
  const todasLinhas = historicoLerTabela_(aba);
  const idPedido = String(registroId || "").trim();
  return todasLinhas.filter(linha => String(linha.registro_id || "").trim() === idPedido);
}

// Agrupa linhas (já filtradas por um único registroId) em sessões.
// Sessões REAIS (sessao_analise_id preenchido) mantêm a ORDEM DE
// PRIMEIRA APARIÇÃO física na planilha; cada linha "legado"
// (sessao_analise_id vazio) sempre vira sua PRÓPRIA pseudo-sessão —
// nunca agrupada com nenhuma outra linha, legado ou real, mesmo com
// horários idênticos ou vizinhos (ver cabeçalho do arquivo). Devolve
// um array de { sessaoAnaliseId, legado, linhas:[...] } — "linhas"
// preserva a ordem física original dentro da sessão.
function historicoAgruparLinhasEmSessoes_(linhas) {

  const sessoesPorId = {};
  const ordemSessoesReais = [];
  const pseudoSessoes = [];

  linhas.forEach(linha => {

    const sessaoId = historicoTextoOuNulo_(linha[HISTORICO_COLUNA_SESSAO_ANALISE]);

    if (sessaoId === null) {
      // Defesa extra (não esperada em uso normal): mesmo um execucao_id
      // vazio nunca impede a linha de aparecer como sua própria
      // pseudo-sessão — um identificador sintético garante isso.
      const idPseudoSessao = historicoTextoOuNulo_(linha.execucao_id) || `legado-sem-execucao-id-${pseudoSessoes.length}`;
      pseudoSessoes.push({ sessaoAnaliseId: idPseudoSessao, legado: true, linhas: [linha] });
      return;
    }

    if (!sessoesPorId[sessaoId]) {
      sessoesPorId[sessaoId] = { sessaoAnaliseId: sessaoId, legado: false, linhas: [] };
      ordemSessoesReais.push(sessaoId);
    }
    sessoesPorId[sessaoId].linhas.push(linha);

  });

  return ordemSessoesReais.map(id => sessoesPorId[id]).concat(pseudoSessoes);

}

/*=====================================================
  Reconstrução por linha (o "espelho" de avaliarHistoricoExtraido)
=====================================================*/

// Converte um valor de célula (Date normal, string, ou vazio) pra ISO
// 8601 — nunca lança erro; devolve null pra qualquer valor ausente ou
// que não vire uma data válida. Diferente dos toISOString() já usados
// em outros pontos do módulo (sempre sobre um "new Date()" recém-criado,
// portanto sempre válido) — aqui o valor vem de uma célula já gravada
// no passado, possivelmente vazia (linha malformada) ou editada à mão.
function historicoDataAuditoriaParaIso_(valor) {
  if (!valor) return null;
  const data = (valor instanceof Date) ? valor : new Date(valor);
  return isNaN(data.getTime()) ? null : data.toISOString();
}

// RODADA B/C.1 (§12) — interpreta com segurança a coluna
// dados_extraidos_json (gravada por historicoMontarValoresAuditoria_,
// HistoricoAuditoria.gs, com o objeto bruto devolvido por
// HistoricoParser.extrairDeBase64 no navegador, sucesso OU erro) — só
// pra recuperar documento.cursoCodigoDocumento (RODADA A/B/C:
// dadosExtraidos.documento.cursoCodigoDocumento, ver HistoricoMotor.gs
// e HistoricoParser.html) quando estiver SEGURAMENTE interpretável.
// NUNCA lança erro (mesma disciplina de degradação graciosa de
// historicoParsearMotivosJsonSeguro_, acima — inclusive o MESMO
// marcador de truncamento "[TRUNCADO", porque as duas colunas passam
// pelo MESMO historicoJsonSeguro_/HISTORICO_AUDITORIA_LIMITE_JSON,
// HistoricoAuditoria.gs).
//
// NUNCA inventa um currículo: célula vazia, truncada, JSON inválido,
// formato inesperado no topo, "documento" ausente/não-objeto ou
// cursoCodigoDocumento ausente/vazio — em QUALQUER um desses casos
// devolve null, nunca um valor sintético/adivinhado. "documento"
// ausente NÃO é tratado como corrupção: é o formato NORMAL de várias
// linhas legítimas (ex.: Licenciatura não implementada, ou qualquer
// CONFERIR por falha técnica ANTES da extração — avaliarHistoricoExtraido/
// HistoricoEndpoints.gs grava, nesses casos, um dadosExtraidos
// sintético {erro, mensagem, parserVersion} sem "documento" nenhum,
// ou nem chega a ter dadosExtraidos — nada disso é uma célula
// corrompida, só a ausência esperada do dado).
function historicoParsearDadosExtraidosJsonSeguro_(dadosExtraidosJsonTexto) {

  const texto = historicoTextoOuNulo_(dadosExtraidosJsonTexto);
  if (texto === null) return { cursoCodigoDocumento: null };

  if (texto.indexOf("[TRUNCADO") === 0) {
    // Mesmo caso de historicoParsearMotivosJsonSeguro_: célula
    // truncada no momento da gravação — o arquivo original no Drive
    // (hash_sha256, na mesma linha) continua sendo a fonte da
    // verdade, mas não há como recuperar o curso do documento aqui.
    return { cursoCodigoDocumento: null };
  }

  let interpretado;
  try {
    interpretado = JSON.parse(texto);
  } catch (err) {
    return { cursoCodigoDocumento: null };
  }

  if (!interpretado || typeof interpretado !== "object" || Array.isArray(interpretado)) {
    return { cursoCodigoDocumento: null };
  }

  const documento = interpretado.documento;
  if (!documento || typeof documento !== "object" || Array.isArray(documento)) {
    return { cursoCodigoDocumento: null };
  }

  return { cursoCodigoDocumento: historicoTextoOuNulo_(documento.cursoCodigoDocumento) };

}

// Interpreta com segurança a coluna motivos_json (ver cabeçalho do
// arquivo) — NUNCA lança erro. Três formas de degradar graciosamente:
// (1) célula vazia (não esperado numa linha real, mas defensivo);
// (2) marcador de truncamento gravado por historicoJsonSeguro_
//     (HistoricoAuditoria.gs) quando o conteúdo excedeu
//     HISTORICO_AUDITORIA_LIMITE_JSON no momento da gravação — o texto
//     começa literalmente com "[TRUNCADO" e não é JSON válido;
// (3) qualquer outro JSON inválido ou com formato inesperado (edição
//     manual, corrupção, versão futura incompatível).
// Em QUALQUER um desses 3 casos, corrompido=true e motivoCorrompido
// traz uma explicação pronta pra virar um motivo sintético (ver
// historicoReconstruirResultadoDeLinha_) — nunca esconde o problema,
// nunca finge que a análise não teve motivo nenhum.
function historicoParsearMotivosJsonSeguro_(motivosJsonTexto) {

  const vazio = { motivos: [], detalhes: null, parecerTexto: null, avisosParser: null, camposNaoReconhecidosParser: null, corrompido: false, motivoCorrompido: null };
  const texto = historicoTextoOuNulo_(motivosJsonTexto);

  if (texto === null) return vazio;

  if (texto.indexOf("[TRUNCADO") === 0) {
    return Object.assign({}, vazio, {
      corrompido: true,
      motivoCorrompido: "O registro de motivos desta análise foi truncado no momento da gravação (excedeu o " +
        "limite de tamanho de célula) — não é possível reconstruir os detalhes completos aqui. O arquivo " +
        "original no Drive (ver hash_sha256 na planilha) continua sendo a fonte da verdade."
    });
  }

  let interpretado;
  try {
    interpretado = JSON.parse(texto);
  } catch (err) {
    return Object.assign({}, vazio, {
      corrompido: true,
      motivoCorrompido: `O registro de motivos desta análise não pôde ser interpretado (JSON inválido: ` +
        `${err.message}) — provavelmente um dado antigo ou corrompido na planilha.`
    });
  }

  if (!interpretado || typeof interpretado !== "object" || Array.isArray(interpretado)) {
    return Object.assign({}, vazio, {
      corrompido: true,
      motivoCorrompido: "O registro de motivos desta análise não estava no formato esperado (não é um objeto)."
    });
  }

  return {
    motivos: Array.isArray(interpretado.motivos) ? interpretado.motivos : [],
    detalhes: interpretado.detalhes !== undefined ? interpretado.detalhes : null,
    parecerTexto: interpretado.parecerTexto !== undefined ? interpretado.parecerTexto : null,
    avisosParser: interpretado.avisosParser !== undefined ? interpretado.avisosParser : null,
    camposNaoReconhecidosParser: interpretado.camposNaoReconhecidosParser !== undefined ? interpretado.camposNaoReconhecidosParser : null,
    corrompido: false,
    motivoCorrompido: null
  };

}

// Reconstrói, a partir de UMA linha já lida de ANALISE_HISTORICO
// (objeto {cabecalho: valor} devolvido por historicoLerTabela_), um
// objeto QUE BATE EXATAMENTE com o formato devolvido ao vivo por
// avaliarHistoricoExtraido (ver contrato completo no cabeçalho de
// HistoricoMotor.gs, função historicoAvaliarHabilitacao_, e o
// Object.assign final de historicoFinalizarComAuditoria_ em
// HistoricoEndpoints.gs). Isso é o que permite reaproveitar as MESMAS
// funções de renderização client-side sem nenhuma modificação.
//
// auditoriaGravada é SEMPRE true aqui (só existe pra reconstruir uma
// linha que, por definição, já foi gravada com sucesso) e
// avisoAuditoria é SEMPRE null (o cenário que geraria esse aviso — a
// PRÓPRIA gravação falhando — nunca produziria uma linha pra ler de
// volta). Isso é uma diferença estrutural inevitável, não um bug: uma
// linha reconstruída não pode "ter falhado ao gravar", ela já existe.
//
// engineVersion (RODADA B/C, FASE B3) é o ÚNICO campo aqui que NÃO faz
// parte do contrato ao vivo de historicoAvaliarHabilitacao_/
// avaliarHistoricoExtraido (a tela nunca precisa dele: uma análise
// recém-calculada É, por definição, feita com o HISTORICO_ENGINE_VERSION
// atual). Numa linha JÁ GRAVADA, porém, é exatamente essa informação
// que falta pra provar tecnicamente com qual versão do motor aquele
// resultado foi produzido — por isso é incluído aqui como um campo
// ADICIONAL (o renderer client-side de FASE B2 simplesmente ignora
// chaves que não conhece; nada quebra). Consumido só por
// HistoricoRelatorios.gs (FASE B3), no rodapé técnico do PDF.
//
// RODADA B/C.1 (§12) — mesmo raciocínio de "campo ADICIONAL, fora do
// contrato ao vivo" vale pra mais 5 campos, todos consumidos só pela
// seção de identificação/rastreabilidade do relatório em PDF
// (HistoricoRelatorios.gs, §13): arquivoId/arquivoNome/
// arquivoModificadoEm/hashSha256 vêm DIRETO das colunas próprias já
// gravadas por historicoMontarValoresAuditoria_ (HistoricoAuditoria.gs
// — arquivo_id/arquivo_nome/arquivo_modificado_em/hash_sha256, que já
// existiam antes desta rodada só não eram projetadas aqui);
// cursoCodigoDocumento é recuperado, quando seguramente interpretável,
// de dentro da coluna dados_extraidos_json (ver
// historicoParsearDadosExtraidosJsonSeguro_, acima) — nunca inventado.
// Uma linha "erro técnico antes da extração" (ex.: FALHA_INFRAESTRUTURA_*,
// ARQUIVO_INDISPONIVEL) tem essas 5 colunas normalmente vazias/sem
// documento — os 5 campos ficam null nesse caso, nunca um valor
// inventado.
function historicoReconstruirResultadoDeLinha_(linha) {

  const motivosInterpretados = historicoParsearMotivosJsonSeguro_(linha.motivos_json);
  const dadosExtraidosInterpretados = historicoParsearDadosExtraidosJsonSeguro_(linha.dados_extraidos_json);

  const motivos = motivosInterpretados.corrompido
    ? [{
        tipo: "REGISTRO_AUDITORIA_CORROMPIDO",
        criterio: null,
        mensagem: motivosInterpretados.motivoCorrompido,
        severidade: "BLOQUEIO"
      }]
    : motivosInterpretados.motivos;

  return {
    habilitacao: historicoChavePorHabilitacaoCodigo_(linha.habilitacao_codigo),
    resultado: historicoTextoOuNulo_(linha.resultado),
    parecerTexto: motivosInterpretados.parecerTexto,
    statusReconciliacao: historicoTextoOuNulo_(linha.status_reconciliacao),
    rulesetId: historicoTextoOuNulo_(linha.ruleset_id),
    rulesetVersao: historicoNumeroOuNulo_(linha.ruleset_versao),
    rulesetRevisao: historicoNumeroOuNulo_(linha.ruleset_revisao),
    rulesetEstruturaCurricular: historicoTextoOuNulo_(linha.estrutura_curricular),
    motivos: motivos,
    detalhes: motivosInterpretados.detalhes,
    avisosParser: motivosInterpretados.avisosParser,
    camposNaoReconhecidosParser: motivosInterpretados.camposNaoReconhecidosParser,
    parserVersion: historicoTextoOuNulo_(linha.parser_version),
    engineVersion: historicoTextoOuNulo_(linha.engine_version),
    auditoriaGravada: true,
    avisoAuditoria: null,
    execucaoId: historicoTextoOuNulo_(linha.execucao_id),
    analisadoEm: historicoDataAuditoriaParaIso_(linha.analisado_em),
    sessaoAnaliseId: historicoTextoOuNulo_(linha[HISTORICO_COLUNA_SESSAO_ANALISE]),
    // RODADA B/C.1 (§12) — identificação/rastreabilidade do arquivo
    // analisado (consumidos por HistoricoRelatorios.gs, §13).
    arquivoId: historicoTextoOuNulo_(linha.arquivo_id),
    arquivoNome: historicoTextoOuNulo_(linha.arquivo_nome),
    arquivoModificadoEm: historicoDataAuditoriaParaIso_(linha.arquivo_modificado_em),
    hashSha256: historicoTextoOuNulo_(linha.hash_sha256),
    cursoCodigoDocumento: dadosExtraidosInterpretados.cursoCodigoDocumento
  };

}

/*=====================================================
  Reconstrução por sessão inteira
=====================================================*/

// Monta o detalhe COMPLETO de uma sessão já agrupada (uma entrada do
// array devolvido por historicoAgruparLinhasEmSessoes_): resultados
// (objeto {chave: resultadoReconstruido}, no MESMO formato que
// historicoAnalisarAluno_ já devolve ao vivo — HistoricoAnaliseUI.html),
// nome/nusp (de qualquer linha da sessão — todas pertencem ao MESMO
// registroId, garantido em gravação por
// historicoValidarConsistenciaSessao_) e analisadoEm no nível da
// SESSÃO (o MAIOR analisado_em entre as linhas — a sessão "aconteceu"
// no momento da sua última linha gravada).
//
// Se, por algum motivo, uma linha tiver habilitacao_codigo que não
// corresponde a nenhuma habilitação atual (historicoChavePorHabilitacaoCodigo_
// devolve null), ela NUNCA é descartada silenciosamente — vira uma
// entrada em "avisos" (nunca lança erro, nunca esconde a linha da
// equipe). Duas linhas da MESMA sessão pra MESMA habilitação (não
// esperado em uso normal) seguem "ordem física decide, sem lançar
// erro" — mesma disciplina já usada noutras ambiguidades deste módulo.
function historicoMontarDetalheSessao_(sessaoAgrupada) {

  const resultados = {};
  const avisos = [];
  let maxAnalisadoEmMs = null;
  let nome = "";
  let nusp = "";

  sessaoAgrupada.linhas.forEach(linha => {

    const isoLinha = historicoDataAuditoriaParaIso_(linha.analisado_em);
    if (isoLinha) {
      const ms = new Date(isoLinha).getTime();
      if (maxAnalisadoEmMs === null || ms > maxAnalisadoEmMs) maxAnalisadoEmMs = ms;
    }

    if (linha.nome) nome = linha.nome;
    if (linha.nusp) nusp = String(linha.nusp);

    const chave = historicoChavePorHabilitacaoCodigo_(linha.habilitacao_codigo);
    if (!chave) {
      avisos.push(
        `Uma linha desta sessão tem habilitacao_codigo desconhecido ("${linha.habilitacao_codigo}") e não pôde ` +
        `ser exibida aqui — execucao_id: ${historicoTextoOuNulo_(linha.execucao_id) || "(vazio)"}. Confira ` +
        `diretamente na aba ANALISE_HISTORICO se necessário.`
      );
      return;
    }

    resultados[chave] = historicoReconstruirResultadoDeLinha_(linha);

  });

  return {
    sessaoAnaliseId: sessaoAgrupada.sessaoAnaliseId,
    legado: sessaoAgrupada.legado,
    analisadoEm: maxAnalisadoEmMs === null ? null : new Date(maxAnalisadoEmMs).toISOString(),
    nome: nome,
    nusp: nusp,
    resultados: resultados,
    avisos: avisos
  };

}

// Resumo LEVE de uma sessão pra lista (histórico de análises) — nunca
// duplica a lógica de reconstrução: parte sempre do detalhe COMPLETO
// já montado por historicoMontarDetalheSessao_, só extrai o que a
// lista precisa pra mostrar badges sem exigir abrir cada sessão.
function historicoResumirSessaoParaLista_(detalheSessao) {
  const habilitacoesAnalisadas = historicoTodasChaves_().filter(chave => !!detalheSessao.resultados[chave]);
  const resumoResultados = {};
  habilitacoesAnalisadas.forEach(chave => { resumoResultados[chave] = detalheSessao.resultados[chave].resultado; });
  return {
    sessaoAnaliseId: detalheSessao.sessaoAnaliseId,
    legado: detalheSessao.legado,
    analisadoEm: detalheSessao.analisadoEm,
    nome: detalheSessao.nome,
    nusp: detalheSessao.nusp,
    habilitacoesAnalisadas: habilitacoesAnalisadas,
    resumoResultados: resumoResultados,
    avisos: detalheSessao.avisos
  };
}

/*=====================================================
  ENDPOINTS PÚBLICOS (google.script.run, chamados por
  HistoricoAnaliseUI.html) — só LEITURA, nunca exigem Versão/etapa
  (ver cabeçalho do arquivo). Confirmam só que o Registro ID existe de
  verdade, via resolverRegistroPorId_ (mesma função já usada em todo o
  resto do sistema — DiplomasBackend.gs) — lança erro claro se não
  existir, e o valor devolvido é descartado (nome/NUSP vêm das
  próprias linhas de auditoria, nunca de uma releitura da aba Diplomas).
=====================================================*/

// Lista TODAS as sessões (reais + pseudo-sessões legado) de um aluno,
// mais recente primeiro. Nunca lança erro por não haver nenhuma
// análise ainda — devolve { sessoes: [] } normalmente.
function historicoListarSessoesAnalise(registroId) {

  resolverRegistroPorId_(registroId);

  const linhas = historicoLerLinhasAuditoriaPorRegistro_(registroId);
  const sessoes = historicoAgruparLinhasEmSessoes_(linhas)
    .map(historicoMontarDetalheSessao_)
    .map(historicoResumirSessaoParaLista_);

  sessoes.sort((a, b) => {
    const msA = a.analisadoEm ? new Date(a.analisadoEm).getTime() : -Infinity;
    const msB = b.analisadoEm ? new Date(b.analisadoEm).getTime() : -Infinity;
    return msB - msA; // mais recente primeiro
  });

  return { sessoes: sessoes };

}

// Detalhe completo de UMA sessão específica — sessaoAnaliseId é
// exatamente o valor devolvido em "sessaoAnaliseId" por
// historicoListarSessoesAnalise (uma sessão real OU o
// identificador-legado de uma pseudo-sessão; o chamador nunca precisa
// saber a diferença, os dois são resolvidos aqui da mesma forma).
function historicoObterSessaoAnalise(registroId, sessaoAnaliseId) {

  resolverRegistroPorId_(registroId);

  const idPedido = historicoTextoOuNulo_(sessaoAnaliseId);
  if (!idPedido) {
    throw new Error("Identificador de sessão de análise não informado.");
  }

  const linhas = historicoLerLinhasAuditoriaPorRegistro_(registroId);
  const sessaoEncontrada = historicoAgruparLinhasEmSessoes_(linhas)
    .find(sessao => sessao.sessaoAnaliseId === idPedido);

  if (!sessaoEncontrada) {
    throw new Error(
      "Sessão de análise não encontrada para este aluno (pode pertencer a outro Registro ID, ou o " +
      "identificador está incorreto)."
    );
  }

  return historicoMontarDetalheSessao_(sessaoEncontrada);

}

// Conveniência: detalhe completo da sessão MAIS RECENTE (real ou
// pseudo-sessão legado) — evita o cliente ter que listar e escolher o
// primeiro item só pra mostrar "última análise". Nunca lança erro
// quando não existe nenhuma análise ainda — devolve existeAnalise:false
// com resultados:{} (o chamador decide como tratar isso na tela, ex.:
// esconder o botão "Ver última análise").
function historicoObterUltimaSessaoAnalise(registroId) {

  resolverRegistroPorId_(registroId);

  const linhas = historicoLerLinhasAuditoriaPorRegistro_(registroId);
  const sessoesDetalhadas = historicoAgruparLinhasEmSessoes_(linhas).map(historicoMontarDetalheSessao_);

  if (sessoesDetalhadas.length === 0) {
    return { existeAnalise: false, sessaoAnaliseId: null, legado: false, analisadoEm: null, nome: "", nusp: "", resultados: {}, avisos: [] };
  }

  let maisRecente = sessoesDetalhadas[0];
  sessoesDetalhadas.forEach(sessao => {
    const msAtual = sessao.analisadoEm ? new Date(sessao.analisadoEm).getTime() : -Infinity;
    const msMelhor = maisRecente.analisadoEm ? new Date(maisRecente.analisadoEm).getTime() : -Infinity;
    if (msAtual > msMelhor) maisRecente = sessao;
  });

  return Object.assign({ existeAnalise: true }, maisRecente);

}
