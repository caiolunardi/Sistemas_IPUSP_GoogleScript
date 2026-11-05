/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Testes automáticos (execução
  MANUAL, pelo editor do Apps Script).

  O QUE ESTE ARQUIVO COBRE:
  Testes de unidade/integração puramente server-side, contra a
  lógica de decisão do módulo (HistoricoMotor.gs), a seleção de
  regras (HistoricoRegrasRepository.gs) e, desde a RODADA A, também
  a montagem PURA da linha de auditoria (historicoMontarValoresAuditoria_
  em HistoricoAuditoria.gs — só a montagem do objeto em memória, nunca
  o appendRow). Não depende de nenhum aluno real nem altera nenhuma
  linha da planilha de Diplomas — só LÊ a planilha de Regras
  Curriculares (pros testes de seleção de ruleset e o teste de
  integração) e roda funções puras com dados inventados (fixtures)
  pra todo o resto. Desde a RODADA B/C.1.1, também roda algumas
  funções de produção IMPURAS de verdade (não reimplementadas aqui)
  contra fixtures que fingem só o ambiente ao redor delas — nunca
  contra Drive/Document reais (ver GRUPOs 24/25, abaixo) — e faz UMA
  única leitura real (nunca escrita) da aba INFOS, a única exceção
  deste arquivo que toca a planilha de verdade (ver §1/GRUPO 27,
  abaixo).

  O QUE ESTE ARQUIVO **NÃO** COBRE (fica pro roteiro manual em
  README_TESTES.md, ou pro harness Node privado de validação — nunca
  entregue junto com o projeto):
  - Extração de PDF de verdade (HistoricoParser.html + PDF.js só
    rodam no navegador — não têm como rodar aqui dentro do
    Apps Script).
  - A regra de excluir semestres de trancamento total do cálculo
    de "semestresValidos" — essa lógica vive inteira dentro do
    HistoricoParser.html (client-side) e não é reexposta pro
    servidor de nenhuma forma testável aqui.
  - O fluxo completo na tela (abrir modal, escolher aluno, ver
    resultado, lote, cancelar lote, etc.) — HistoricoAnaliseUI.html.
  - A verificação de SHA-256 (arquivo trocado no meio da análise) e a
    lógica de historicoFinalizarComAuditoria_ (execucaoId/analisadoEm)
    em HistoricoEndpoints.gs — dependem de Drive/gravação de verdade;
    validadas só no harness Node privado (mock de Drive/Sheets), nunca
    aqui.
  - A gravação em si em ANALISE_HISTORICO (o appendRow dentro de
    historicoRegistrarAuditoria_) — testar isso aqui geraria linhas de
    auditoria falsas na planilha real, o que é exatamente o tipo de
    "efeito colateral em produção" que um arquivo de teste não deve
    causar. Só a montagem PURA dos valores (sem appendRow) é testada
    aqui — ver acima.
  - RODADA B/C: a gravação real da migração de schema
    (migrarAnaliseHistoricoRelatoriosV1, que ALTERA o cabeçalho de
    verdade da aba ANALISE_HISTORICO na primeira vez que roda) — mesmo
    raciocínio do item acima, geraria uma mutação real na planilha.
    Só a parte PURA e só-leitura (historicoColunaSessaoAnaliseExiste_,
    que a migração usa pra decidir se há algo a fazer) é testada aqui.
    Da mesma forma, os 3 ENDPOINTS de HistoricoConsultas.gs
    (historicoListarSessoesAnalise/historicoObterSessaoAnalise/
    historicoObterUltimaSessaoAnalise) dependem de
    resolverRegistroPorId_ + ANALISE_HISTORICO de verdade — validados
    só no harness Node privado / roteiro manual. Toda a lógica PURA de
    agrupamento/reconstrução que esses endpoints usam por baixo
    (historicoAgruparLinhasEmSessoes_, historicoReconstruirResultadoDeLinha_,
    historicoMontarDetalheSessao_, historicoParsearMotivosJsonSeguro_ etc.)
    já é testada aqui mesmo, com fixtures sintéticas.
  - RODADA B/C, FASES B3/C2: a geração de fato do PDF do relatório
    individual (FASE B3) e do relatório consolidado efêmero (FASE C2)
    — ambos em HistoricoRelatorios.gs (DocumentApp.create/Body.append*,
    conversão pra PDF; substituirArquivoComSeguranca_ só no individual,
    já que o consolidado nunca é salvo) — e a varredura de versões
    existentes na pasta do(a) aluno(a) (getFilesByType) — todas
    dependem de Drive/DocumentApp reais; validadas só no harness Node
    privado (com mocks) / roteiro manual. Toda a lógica PURA por trás
    (nome de arquivo, extração/decisão de versão, achatamento de
    "detalhes" em linhas de exibição e, FASE C2, validação da lista de
    itens do consolidado) é testada aqui mesmo. RODADA B/C.1.1 (§2/§3,
    GRUPO 24): o TEXTO que entra no corpo do documento (cabeçalho
    institucional + disclaimer do relatório individual) passou a ser
    testado de verdade, com historicoRelatorioEscreverConteudoSessao_
    chamada de verdade contra um Document fake — mas a renderização
    visual em si (fonte, margem, paginação, conversão pra PDF) continua
    fora daqui. O disclaimer do consolidado tem só uma checagem
    ESTÁTICA (toString) — ver GRUPO 24.
  - RODADA B/C, FASE C1: a orquestração de lote (estado
    historicoUltimoLote, regra do 1, pergunta coletiva de
    versionamento) é inteiramente client-side, em
    HistoricoAnaliseUI.html — sem nenhuma lógica server-side própria
    pra testar aqui além dos endpoints de FASE B3/C2 já cobertos acima.
  - RODADA B/C.1 (§5/§27): o PRÉ-FLIGHT real de versionamento em lote
    (historicoRelatorioPreflightItem_/historicoRelatorioPreflightLote_/
    historicoPreflightRelatoriosLote) — resolverRegistroPorId_,
    historicoObterSessaoAnalise, garantirPastaInterno_ e
    historicoRelatorioDetectarUltimaVersao_ de verdade — dependem de
    Sheets/Drive reais; validado só no harness Node privado (mocks) /
    roteiro manual. O validador puro que ele usa por baixo
    (historicoRelatorioValidarItensConsolidado_) já é testado aqui, na
    FASE C2, acima.
  - RODADA B/C.1 (§8/§28): a substituição de arquivo(s) por
    NUSP+VERSÃO-ALVO (historicoRelatorioSubstituirPorNuspEVersao_) —
    getFilesByType/setTrashed de verdade num Drive real; validada só
    no harness Node privado (mocks) / roteiro manual. O helper puro
    que ela usa por baixo pra reconhecer a versão a partir do nome do
    arquivo (historicoRelatorioExtrairVersaoDeNomeArquivo_) já é
    testado aqui, na FASE B3, acima. RODADA B/C.1.1 (§4, GRUPO 25): a
    PRÓPRIA historicoRelatorioSubstituirPorNuspEVersao_ (função de
    produção, não reimplementada) passou a ser chamada de verdade
    aqui também, com fixtures de pasta/arquivo fake (nunca Drive
    real) — cobrindo o comportamento crash-safe completo (falha ao
    criar, falha ao remover vira aviso sem derrubar a função,
    isolamento por NUSP/versão, nunca remove o próprio arquivo novo).
    Só a implementação REAL de getFilesByType/setTrashed contra o
    Drive de verdade continua fora daqui.
  - RODADA B/C.1 (§9/§29): a seção crítica sob LockService.getScriptLock()
    dentro de historicoRelatorioGerarPdfSessao_ (redetectar+decidir+
    gravar+liberar) — só existe pra proteger justamente as operações
    de Drive/Sheets acima, então testar o COMPORTAMENTO de verdade
    (duas gerações concorrentes de verdade) exige as MESMAS
    dependências reais; sem teste comportamental automático aqui nem
    no harness — só roteiro manual (ver README_TESTES.md, cenário de
    concorrência). RODADA B/C.1.1 (§5, GRUPO 26): a ESTRUTURA do
    código (Document/PDF inteiramente fora do lock; só decisão+commit
    dentro dele) passou a ter um guarda de regressão ESTÁTICO aqui
    (inspeção de historicoRelatorioGerarPdfSessao_.toString()) — não
    substitui o teste comportamental acima, só impede que a
    reestruturação desta rodada seja desfeita por engano.
  - RODADA B/C.1 (§10/§31): arquivoId/urlArquivo devolvidos por
    historicoGerarRelatorioIndividual — vêm direto do objeto File real
    criado por historicoRelatorioGerarPdfSessao_ (mesma fronteira de
    Drive real do item de FASE B3/C2 acima); o botão "📄 Abrir PDF" em
    si é client-side (HistoricoAnaliseUI.html), mesma fronteira do
    item de FASE C1 acima.
  - RODADA B/C.1 (§11/§30): o botão de gerar relatório aparecendo
    imediatamente após uma análise nova (historicoAbrirAnaliseIndividual)
    é só reorganização de client-side puro em HistoricoAnaliseUI.html —
    mesma fronteira do item de FASE C1 acima, sem lógica server-side
    nova.
  - RODADA B/C.1 (§24): historicoObterChaveAssinaturaSessao_ (PropertiesService+
    LockService reais) e, por causa dela, historicoAssinarSessao_/
    historicoVerificarAssinaturaSessao_ (que também dependem de
    Utilities.computeHmacSha256Signature) NUNCA são testadas aqui —
    mesmo com mocks, rodar isso dentro do próprio projeto Apps Script
    provisionaria/leria a chave secreta REAL de Script Properties da
    produção. O round-trip completo (assinar então verificar, incluindo
    detecção de adulteração) é validado só no harness Node privado, com
    mocks leves em memória (nunca Drive/Sheets). A única parte 100%
    pura e sem nenhuma dependência de serviço — historicoBytesParaHex_
    — é testada aqui mesmo (GRUPO 23, acima).

  COMO RODAR:
  No editor do Apps Script, selecione a função "rodarTestesHistorico"
  no seletor de função (barra de cima) e clique em "Executar". Veja
  o resultado em Ver > Registros de execução (ou na aba "Execuções").
  Detalhes completos em README_TESTES.md.

  FILOSOFIA DOS TESTES (a mesma do resto do módulo): sempre que o
  resultado de um teste dependeria do estado ATUAL da planilha de
  Regras Curriculares ao vivo (ex.: "o ruleset do Psicólogo está
  ATIVO agora?"), o teste é INFORMATIVO (historicoInfo_), não uma
  falha rígida — porque isso pode legitimamente mudar (ex.: antes/
  depois de rodar a migração) sem que o CÓDIGO tenha ficado errado.
  Já testes com dados 100% inventados/sintéticos (fixtures fixas,
  ou dados sintéticos construídos pra folgadamente passar em
  QUALQUER configuração real da planilha) são verificações rígidas
  (historicoAssert_) — essas sim devem sempre passar.
=====================================================*/

/*=====================================================
  Infraestrutura mínima de teste — sem biblioteca externa (Apps
  Script não tem um test runner embutido). "resultados" é um objeto
  simples acumulado por todos os grupos de teste:
  { total, passou, falhou, detalhes: [...textos de falha...], info: [...textos informativos...] }
=====================================================*/

function historicoAssert_(resultados, rotulo, esperado, obtido) {
  resultados.total++;
  const passou = esperado === obtido;
  if (passou) {
    resultados.passou++;
  } else {
    resultados.falhou++;
    resultados.detalhes.push(
      `[FALHOU] ${rotulo} — esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`
    );
  }
  return passou;
}

function historicoInfo_(resultados, rotulo, mensagem) {
  resultados.info.push(`[INFO] ${rotulo} — ${mensagem}`);
}

/*=====================================================
  GRUPO 1 — "NULL ≠ ZERO"

  O princípio mais importante do módulo inteiro: um campo ausente
  (null/undefined) NUNCA pode ser tratado como zero, e NUNCA pode
  virar "cumprido" por acidente de coerção do JavaScript (ex.:
  `null >= 0` é `true` em JS puro — exatamente o tipo de armadilha
  que este grupo confirma que o sistema NÃO cai).
=====================================================*/
function historicoTestesNullDiferenteDeZero_(resultados) {

  // --- resolverCampoParser_: caminho ausente nunca "inventa" valor ---
  const obj1 = { totais: { creditosObtidos: { aula: 120 } } };
  historicoAssert_(resultados,
    "resolverCampoParser_: caminho existente devolve o valor real",
    120,
    historicoResolverCampoParser_(obj1, "totais.creditosObtidos.aula")
  );
  historicoAssert_(resultados,
    "resolverCampoParser_: caminho inexistente devolve undefined (nunca 0)",
    undefined,
    historicoResolverCampoParser_(obj1, "totais.creditosObtidos.trabalho")
  );
  historicoAssert_(resultados,
    "resolverCampoParser_: raiz null não lança erro, devolve undefined",
    undefined,
    historicoResolverCampoParser_(null, "qualquer.coisa")
  );

  // --- compararOperador_: registro do comportamento CRU do JS puro ---
  // É por isso que ninguém no sistema chama compararOperador_ direto
  // com um valor que pode ser null sem checar antes — a proteção de
  // verdade é uma camada acima (ver os dois testes seguintes).
  historicoInfo_(resultados,
    "compararOperador_(null, '>=', 0)",
    `Devolve ${historicoCompararOperador_(null, ">=", 0)} por coerção nativa do JavaScript ` +
    `(null vira 0 numa comparação numérica) — confirma por que a checagem de null precisa acontecer ` +
    `ANTES de chamar este comparador, nunca depois.`
  );

  // --- avaliarRequisitoNumericoSimples_: a proteção real ---
  const totaisComCampoAusente = { totais: {} };
  const requisitoExigeZero = {
    criterio: "TESTE_NULL_ZERO", descricao: "Teste null≠zero", operador: ">=",
    valor: 0, campoParser: "totais.inexistente", unidade: "créditos", ordem: 1
  };
  const avaliacaoNullZero = historicoAvaliarRequisitoNumericoSimples_(requisitoExigeZero, totaisComCampoAusente);
  historicoAssert_(resultados,
    "avaliarRequisitoNumericoSimples_: campo ausente + exigido=0 NUNCA diz CUMPRIDO (mesmo 'null>=0' sendo true em JS puro)",
    "NAO_VERIFICADO",
    avaliacaoNullZero.situacao
  );
  historicoAssert_(resultados,
    "avaliarRequisitoNumericoSimples_: campo ausente marca indisponivel=true",
    true,
    avaliacaoNullZero.indisponivel
  );

  // --- mesma proteção, mas com um ZERO DE VERDADE (extraído do PDF) — não pode virar "indisponível" por engano ---
  const totaisComZeroReal = { totais: { x: 0 } };
  const requisitoZeroReal = {
    criterio: "TESTE_ZERO_REAL", descricao: "Zero real ≠ ausente", operador: ">=",
    valor: 0, campoParser: "totais.x", unidade: "créditos", ordem: 1
  };
  const avaliacaoZeroReal = historicoAvaliarRequisitoNumericoSimples_(requisitoZeroReal, totaisComZeroReal);
  historicoAssert_(resultados,
    "avaliarRequisitoNumericoSimples_: 0 (número real, extraído do PDF) satisfaz >=0 normalmente — não é tratado como ausência",
    "CUMPRIDO",
    avaliacaoZeroReal.situacao
  );

  // --- avaliarTempoCurso_: semestresValidos ausente nunca vira "cumpriu o mínimo" ---
  const tempoCursoAusente = historicoAvaliarTempoCurso_(null, 8, 12);
  historicoAssert_(resultados,
    "avaliarTempoCurso_: semestresValidos null nunca é tratado como CUMPRIDO",
    "NAO_VERIFICADO",
    tempoCursoAusente.situacao
  );
  historicoAssert_(resultados,
    "avaliarTempoCurso_: semestresValidos null marca indisponivel=true",
    true,
    tempoCursoAusente.indisponivel
  );
  const tempoCursoNaN = historicoAvaliarTempoCurso_(NaN, 8, 12);
  historicoAssert_(resultados,
    "avaliarTempoCurso_: semestresValidos NaN também nunca é tratado como CUMPRIDO",
    "NAO_VERIFICADO",
    tempoCursoNaN.situacao
  );

}

/*=====================================================
  GRUPO 2 — Compensação "excedente de eletivas vira créditos livres"

  Reproduz literalmente o exemplo numérico enviado pelo usuário
  (Ana Clara Machado Tomelin, Psicólogo) e confirma os limites do
  mecanismo: nunca aplica com operadores incompatíveis, nunca aplica
  com dado incompleto, excedente nunca fica negativo.
=====================================================*/
function historicoTestesCompensacao_(resultados) {

  const reqEletivas = {
    criterio: "ELETIVAS_AULA", descricao: "Créditos-aula em disciplinas eletivas",
    operador: ">=", valor: 15, campoParser: "creditosPorTipo.eletivas.aula", unidade: "créditos-aula", ordem: 2
  };
  const reqLivres = {
    criterio: "LIVRES_AULA", descricao: "Créditos-aula em disciplinas livres",
    operador: ">=", valor: 47, campoParser: "creditosPorTipo.livres.aula", unidade: "créditos-aula", ordem: 3
  };

  // --- exemplo real: eletivas exigidas=15, obtidas=41 -> excedente=26;
  // livres obtidas=26 -> consideradas=26+26=52; livres exigidas=47 -> cumpre ---
  const totaisAnaClara = { creditosPorTipo: { eletivas: { aula: 41 }, livres: { aula: 26 } } };
  const parAnaClara = historicoAvaliarCompensacaoEletivasLivres_(reqEletivas, reqLivres, totaisAnaClara);
  historicoAssert_(resultados, "compensação (exemplo real): eletivas 41>=15 cumpre", "CUMPRIDO", parAnaClara.eletivas.situacao);
  historicoAssert_(resultados, "compensação (exemplo real): excedente = 41-15 = 26", 26, parAnaClara.livres.compensacao.excedenteEletivas);
  historicoAssert_(resultados, "compensação (exemplo real): livres consideradas = 26+26 = 52", 52, parAnaClara.livres.compensacao.livresConsideradas);
  historicoAssert_(resultados, "compensação (exemplo real): livres 52>=47 cumpre (sem a compensação seria 26<47, não cumpriria)", "CUMPRIDO", parAnaClara.livres.situacao);

  // --- excedente nunca fica negativo quando eletivas obtidas < exigidas ---
  const totaisSemExcedente = { creditosPorTipo: { eletivas: { aula: 10 }, livres: { aula: 5 } } };
  const parSemExcedente = historicoAvaliarCompensacaoEletivasLivres_(reqEletivas, reqLivres, totaisSemExcedente);
  historicoAssert_(resultados, "compensação sem excedente: eletivas 10<15 não cumpre", "NAO_CUMPRIDO", parSemExcedente.eletivas.situacao);
  historicoAssert_(resultados, "compensação sem excedente: excedente nunca negativo (max(0, 10-15) = 0)", 0, parSemExcedente.livres.compensacao.excedenteEletivas);
  historicoAssert_(resultados, "compensação sem excedente: livres consideradas = 5+0 = 5", 5, parSemExcedente.livres.compensacao.livresConsideradas);
  historicoAssert_(resultados, "compensação sem excedente: livres 5<47 não cumpre", "NAO_CUMPRIDO", parSemExcedente.livres.situacao);

  // --- operadores incompatíveis (livres com "=" em vez de ">=") -> NUNCA aplica a fórmula, cai pra avaliação isolada ---
  const reqLivresComIgual = Object.assign({}, reqLivres, { operador: "=" });
  const parOperadorIncompativel = historicoAvaliarCompensacaoEletivasLivres_(reqEletivas, reqLivresComIgual, totaisAnaClara);
  historicoAssert_(resultados,
    "compensação com operador '=' em livres: NÃO aplica compensação (sem .compensacao)",
    undefined,
    parOperadorIncompativel.livres.compensacao
  );
  historicoAssert_(resultados,
    "compensação com operador '=' em livres: avaliação isolada, 26 !== 47 não cumpre",
    "NAO_CUMPRIDO",
    parOperadorIncompativel.livres.situacao
  );

  // --- dado incompleto (eletivas obtidas ausente) -> cai pra avaliação isolada, que corretamente vira NAO_VERIFICADO ---
  const totaisIncompletos = { creditosPorTipo: { livres: { aula: 26 } } };
  const parIncompleto = historicoAvaliarCompensacaoEletivasLivres_(reqEletivas, reqLivres, totaisIncompletos);
  historicoAssert_(resultados,
    "compensação com eletivas ausente: cai pra avaliação isolada, vira NAO_VERIFICADO (nunca finge saber)",
    "NAO_VERIFICADO",
    parIncompleto.eletivas.situacao
  );
  historicoAssert_(resultados,
    "compensação com eletivas ausente: eletivas isolada fica indisponível",
    true,
    parIncompleto.eletivas.indisponivel
  );

  // --- via o agregador: a flag compensaEletivasParaLivres liga/desliga a compensação de fato ---
  const requisitosComOutros = [
    reqEletivas, reqLivres,
    { criterio: "ESTAGIO", descricao: "Estágio", operador: ">=", valor: 200, campoParser: "cargaHorariaEstagio", unidade: "horas", ordem: 5 }
  ];
  const totaisComEstagio = Object.assign({}, totaisAnaClara, { cargaHorariaEstagio: 300 });

  const comCompensacaoLigada = historicoAvaliarRequisitosNumericos_(requisitosComOutros, totaisComEstagio, true);
  const livresComCompensacao = comCompensacaoLigada.find(r => r.criterio === "LIVRES_AULA");
  historicoAssert_(resultados,
    "agregador com compensaEletivasParaLivres=true: linha LIVRES_AULA tem .compensacao preenchida",
    true,
    !!(livresComCompensacao && livresComCompensacao.compensacao)
  );

  const comCompensacaoDesligada = historicoAvaliarRequisitosNumericos_(requisitosComOutros, totaisComEstagio, false);
  const livresSemCompensacao = comCompensacaoDesligada.find(r => r.criterio === "LIVRES_AULA");
  historicoAssert_(resultados,
    "agregador com compensaEletivasParaLivres=false: linha LIVRES_AULA NÃO tem .compensacao (avaliação isolada)",
    undefined,
    livresSemCompensacao && livresSemCompensacao.compensacao
  );
  historicoAssert_(resultados,
    "agregador com compensaEletivasParaLivres=false: ESTAGIO continua avaliado normalmente junto",
    "CUMPRIDO",
    comCompensacaoDesligada.find(r => r.criterio === "ESTAGIO").situacao
  );
  historicoAssert_(resultados,
    "agregador: devolve as 3 linhas de requisito (nenhuma é descartada)",
    3,
    comCompensacaoDesligada.length
  );

}

/*=====================================================
  GRUPO 3 — Disciplinas obrigatórias individuais

  Cobre a decisão de risco deliberada: sigla NÃO encontrada vira
  NAO_CUMPRIDA (falha franca, não ambiguidade) — só um status
  ENCONTRADO mas ilegível vira indisponível/CONFERIR de verdade.
=====================================================*/
function historicoTestesDisciplinas_(resultados) {

  const nadaEncontrado = historicoDisciplinaCumprida_([], ["A", "MA"]);
  historicoAssert_(resultados, "disciplina não encontrada no histórico: NAO_CUMPRIDA (não CONFERIR)", "NAO_CUMPRIDA", nadaEncontrado.situacao);
  historicoAssert_(resultados, "disciplina não encontrada: indisponivel=false (é uma constatação, não uma ambiguidade)", false, nadaEncontrado.indisponivel);
  historicoAssert_(resultados, "disciplina não encontrada: naoEncontrada=true", true, nadaEncontrado.naoEncontrada);

  const statusAceito = historicoDisciplinaCumprida_(["A"], ["A", "MA"]);
  historicoAssert_(resultados, "disciplina com status aceito (A): CUMPRIDA", "CUMPRIDA", statusAceito.situacao);

  const statusReprovado = historicoDisciplinaCumprida_(["RN"], ["A", "MA"]);
  historicoAssert_(resultados, "disciplina encontrada mas com status não aceito (RN): NAO_CUMPRIDA, não ambígua", "NAO_CUMPRIDA", statusReprovado.situacao);
  historicoAssert_(resultados, "disciplina com status não aceito: indisponivel=false (status foi lido com clareza, só não está entre os aceitos)", false, statusReprovado.indisponivel);

  const statusIlegivel = historicoDisciplinaCumprida_([null], ["A", "MA"]);
  historicoAssert_(resultados, "disciplina encontrada mas com status ilegível (null): indisponivel=true (aí sim é ambiguidade de verdade)", true, statusIlegivel.indisponivel);

  const multiplasOcorrencias = historicoDisciplinaCumprida_(["RN", "A"], ["A", "MA"]);
  historicoAssert_(resultados, "disciplina cursada mais de uma vez (reprovou e depois passou): basta UMA ocorrência aceita -> CUMPRIDA", "CUMPRIDA", multiplasOcorrencias.situacao);

  // --- localizarSituacoesDisciplina_: comparação sempre normalizada (maiúsculas/espaços) ---
  const cursadas = [
    { sigla: " psa5001 ", nome: "Disciplina Teste", au: 4, tr: 0, status: "A" },
    { sigla: "PSA5002", nome: "Outra", au: 4, tr: 0, status: "RN" }
  ];
  const situacoesPsa5001 = historicoLocalizarSituacoesDisciplina_(cursadas, historicoNormalizarSigla_("PSA5001"));
  historicoAssert_(resultados, "localizarSituacoesDisciplina_: casa sigla ignorando espaços/maiúsculas", 1, situacoesPsa5001.length);
  historicoAssert_(resultados, "localizarSituacoesDisciplina_: devolve o status certo", "A", situacoesPsa5001[0]);

  const situacoesInexistente = historicoLocalizarSituacoesDisciplina_(cursadas, "PSA9999");
  historicoAssert_(resultados, "localizarSituacoesDisciplina_: sigla nunca cursada devolve lista vazia (nunca erro)", 0, situacoesInexistente.length);

  // --- avaliarDisciplinasIndividuais_: só considera tipoRegra=OBRIGATORIA, ordena por 'ordem' ---
  const disciplinasDoRuleset = [
    { tipoRegra: "OBRIGATORIA", sigla: historicoNormalizarSigla_("PSA5002"), nome: "Segunda", statusAceitos: ["A", "MA"], ordem: 2 },
    { tipoRegra: "OBRIGATORIA", sigla: historicoNormalizarSigla_("PSA5001"), nome: "Primeira", statusAceitos: ["A", "MA"], ordem: 1 },
    { tipoRegra: "GRUPO", sigla: historicoNormalizarSigla_("PSA5003"), nome: "De grupo (não entra aqui)", statusAceitos: ["A"], grupoId: "G1", ordem: 3 }
  ];
  const avaliacaoObrigatorias = historicoAvaliarDisciplinasIndividuais_(disciplinasDoRuleset, cursadas);
  historicoAssert_(resultados, "avaliarDisciplinasIndividuais_: ignora linhas tipoRegra=GRUPO", 2, avaliacaoObrigatorias.length);
  historicoAssert_(resultados, "avaliarDisciplinasIndividuais_: ordena por 'ordem' (PSA5001 primeiro)", "PSA5001", avaliacaoObrigatorias[0].sigla);
  historicoAssert_(resultados, "avaliarDisciplinasIndividuais_: PSA5001 cursada com status A -> CUMPRIDA", "CUMPRIDA", avaliacaoObrigatorias[0].situacao);
  historicoAssert_(resultados, "avaliarDisciplinasIndividuais_: PSA5002 cursada com status RN (não aceito) -> NAO_CUMPRIDA", "NAO_CUMPRIDA", avaliacaoObrigatorias[1].situacao);

}

/*=====================================================
  GRUPO 4 — Grupos de disciplinas (ONE_OF / MIN_COUNT / MIN_CREDITS)
=====================================================*/
function historicoTestesGrupos_(resultados) {

  const cursadasBase = [
    { sigla: "A1", status: "A", au: 1000, tr: 0 },
    { sigla: "B1", status: null, au: null, tr: null }, // status ilegível -> indisponível
    { sigla: "C1", status: "RN", au: 4, tr: 0 } // encontrada mas reprovada (franca, não ambígua)
  ];

  // ONE_OF sem valor_minimo na planilha: por convenção do próprio tipo
  // ("pelo menos UMA"), é tratado como mínimo=1 — o único tipo de grupo
  // com esse default, porque só ele tem a quantidade embutida no nome.
  const grupoOneOfSemMinimo = { grupoId: "G1", nomeGrupo: "Optativa X ou Y", tipoRegra: "ONE_OF", valorMinimo: null, unidade: null, campoSoma: null };
  const membrosG1 = [
    { sigla: "A1", nome: "X", statusAceitos: ["A"] },
    { sigla: "Z1", nome: "Y (não cursada)", statusAceitos: ["A"] }
  ];
  const resultadoOneOfDefault = historicoAvaliarGrupos_([grupoOneOfSemMinimo], { G1: membrosG1 }, cursadasBase);
  historicoAssert_(resultados, "ONE_OF sem valor_minimo: assume mínimo=1 (convenção do próprio tipo)", "CUMPRIDO", resultadoOneOfDefault[0].situacao);

  // MIN_COUNT sem valor_minimo: SEM default (diferença deliberada do ONE_OF) -> NAO_VERIFICADO
  const grupoMinCountSemMinimo = { grupoId: "G2", nomeGrupo: "Ao menos N optativas", tipoRegra: "MIN_COUNT", valorMinimo: null, unidade: null, campoSoma: null };
  const resultadoMinCountSemMinimo = historicoAvaliarGrupos_([grupoMinCountSemMinimo], { G2: membrosG1 }, cursadasBase);
  historicoAssert_(resultados, "MIN_COUNT sem valor_minimo: NAO_VERIFICADO (não tem default, precisa vir preenchido na planilha)", "NAO_VERIFICADO", resultadoMinCountSemMinimo[0].situacao);
  historicoAssert_(resultados, "MIN_COUNT sem valor_minimo: indisponivel=true", true, resultadoMinCountSemMinimo[0].indisponivel);

  // ONE_OF valor_minimo=2, só 1 cumprida, o outro membro é uma falha FRANCA (não ambígua): NAO_CUMPRIDO com segurança
  const grupoOneOf2 = { grupoId: "G3", nomeGrupo: "Duas entre X/Y/Z", tipoRegra: "ONE_OF", valorMinimo: 2, unidade: null, campoSoma: null };
  const membrosG3SemAmbiguidade = [
    { sigla: "A1", nome: "X", statusAceitos: ["A"] },
    { sigla: "C1", nome: "Y", statusAceitos: ["A"] } // encontrada, status RN não aceito -> NAO_CUMPRIDA franca
  ];
  const resultadoOneOf2SemAmbiguidade = historicoAvaliarGrupos_([grupoOneOf2], { G3: membrosG3SemAmbiguidade }, cursadasBase);
  historicoAssert_(resultados, "ONE_OF valor_minimo=2, 1 cumprida + 1 falha franca (não ambígua): NAO_CUMPRIDO com segurança", "NAO_CUMPRIDO", resultadoOneOf2SemAmbiguidade[0].situacao);

  // mesmo grupo, trocando o 2º membro por um AMBÍGUO: não dá mais pra garantir NAO_CUMPRIDO
  const membrosG3ComAmbiguidade = [
    { sigla: "A1", nome: "X", statusAceitos: ["A"] },
    { sigla: "B1", nome: "Y", statusAceitos: ["A"] } // status ilegível -> indisponível
  ];
  const resultadoOneOf2ComAmbiguidade = historicoAvaliarGrupos_([grupoOneOf2], { G3: membrosG3ComAmbiguidade }, cursadasBase);
  historicoAssert_(resultados, "ONE_OF valor_minimo=2, 1 cumprida + 1 AMBÍGUA: NAO_VERIFICADO (o ambíguo poderia resolver o grupo, não dá pra descartar)", "NAO_VERIFICADO", resultadoOneOf2ComAmbiguidade[0].situacao);

  // já bateu o mínimo com confirmação real: CUMPRIDO mesmo com outro membro ambíguo (não precisa mais dele)
  const grupoOneOf1 = { grupoId: "G4", nomeGrupo: "Uma entre X/Y", tipoRegra: "ONE_OF", valorMinimo: 1, unidade: null, campoSoma: null };
  const resultadoJaConfirmado = historicoAvaliarGrupos_([grupoOneOf1], { G4: membrosG3ComAmbiguidade }, cursadasBase);
  historicoAssert_(resultados, "ONE_OF valor_minimo=1, 1 já confirmada + 1 ambígua: CUMPRIDO (confirmação já basta)", "CUMPRIDO", resultadoJaConfirmado[0].situacao);

  // MIN_CREDITS: soma créditos das disciplinas cumpridas do grupo
  const grupoMinCredits = { grupoId: "G5", nomeGrupo: "Créditos livres em X", tipoRegra: "MIN_CREDITS", valorMinimo: 900, unidade: "créditos-aula", campoSoma: "au" };
  const resultadoMinCredits = historicoAvaliarGrupos_([grupoMinCredits], { G5: [{ sigla: "A1", nome: "X", statusAceitos: ["A"] }] }, cursadasBase);
  historicoAssert_(resultados, "MIN_CREDITS: soma au=1000 da disciplina cumprida >= 900 exigido -> CUMPRIDO", "CUMPRIDO", resultadoMinCredits[0].situacao);
  historicoAssert_(resultados, "MIN_CREDITS: creditosSomados reporta o valor certo (1000)", 1000, resultadoMinCredits[0].creditosSomados);

  const grupoMinCreditsAlto = Object.assign({}, grupoMinCredits, { grupoId: "G6", valorMinimo: 5000 });
  const resultadoMinCreditsInsuficiente = historicoAvaliarGrupos_([grupoMinCreditsAlto], { G6: [{ sigla: "A1", nome: "X", statusAceitos: ["A"] }] }, cursadasBase);
  historicoAssert_(resultados, "MIN_CREDITS: 1000 < 5000 exigido -> NAO_CUMPRIDO", "NAO_CUMPRIDO", resultadoMinCreditsInsuficiente[0].situacao);

  // tipo de regra desconhecido (ex.: erro de digitação na planilha): nunca quebra, nunca decide sozinho
  const grupoTipoDesconhecido = { grupoId: "G7", nomeGrupo: "Grupo mal configurado", tipoRegra: "XPTO_INEXISTENTE", valorMinimo: 1, unidade: null, campoSoma: null };
  const resultadoTipoDesconhecido = historicoAvaliarGrupos_([grupoTipoDesconhecido], { G7: [] }, cursadasBase);
  historicoAssert_(resultados, "tipo_regra desconhecido na planilha: NAO_VERIFICADO, nunca quebra a análise inteira", "NAO_VERIFICADO", resultadoTipoDesconhecido[0].situacao);
  historicoAssert_(resultados, "tipo_regra desconhecido: indisponivel=true", true, resultadoTipoDesconhecido[0].indisponivel);
  historicoAssert_(resultados, "tipo_regra desconhecido: motivoTipoDesconhecido explica o problema (texto não vazio)", true,
    typeof resultadoTipoDesconhecido[0].motivoTipoDesconhecido === "string" && resultadoTipoDesconhecido[0].motivoTipoDesconhecido.length > 0);

}

/*=====================================================
  GRUPO 5 — Reconciliação de identidade/documento

  Roda ANTES de qualquer regra acadêmica ser avaliada. Cobre NUSP
  ausente/divergente, curso ausente no cabeçalho, habilitação ausente/
  divergente, e o bypass específico do combo Psicólogo+Bacharelado
  (documentoDeOutraHabilitacao).

  RODADA A: curso DIFERENTE do vigente (ex. o PDF dizer 47011) deixou
  de ser divergência de reconciliação — só curso AUSENTE continua
  sendo (ver teste "curso ausente" abaixo, e o teste que substituiu o
  antigo "cursoDivergente"). Currículo diferente agora é resolvido na
  seleção de ruleset (ver historicoTestesResolverRulesetEmLista_),
  nunca aqui.
=====================================================*/
function historicoTestesReconciliacao_(resultados) {

  const chaveHabilitacao = "bach"; // habilitacaoCodigo "100"
  const nuspRegistro = "1234567";

  const documentoBase = {
    nusp: nuspRegistro,
    nome: "Aluno(a) Teste",
    // Literal de exemplo — qualquer curso serviria aqui, já que a
    // reconciliação (RODADA A) não exige mais nenhum currículo
    // específico. "47012" só por familiaridade com o caso real.
    cursoCodigoDocumento: "47012",
    habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.bach.habilitacaoCodigo,
    habilitacaoNomeDocumento: HISTORICO_HABILITACOES.bach.nome
  };

  const reconciliacaoOk = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: documentoBase }
  );
  historicoAssert_(resultados, "reconciliação: tudo batendo (curso 47012) -> OK", HISTORICO_STATUS_RECONCILIACAO.OK, reconciliacaoOk.statusReconciliacao);

  const semNuspRegistro = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: null, documentoDeOutraHabilitacao: false },
    { documento: documentoBase }
  );
  historicoAssert_(resultados, "reconciliação: registro do aluno sem NUSP cadastrado -> EXTRACAO_INCOMPLETA", HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA, semNuspRegistro.statusReconciliacao);

  const semNuspDocumento = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: Object.assign({}, documentoBase, { nusp: null }) }
  );
  historicoAssert_(resultados, "reconciliação: PDF sem NUSP legível no cabeçalho -> EXTRACAO_INCOMPLETA", HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA, semNuspDocumento.statusReconciliacao);

  const nuspDivergente = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: Object.assign({}, documentoBase, { nusp: "9999999" }) }
  );
  historicoAssert_(resultados, "reconciliação: NUSP do PDF diferente do registro (arquivo errado na pasta) -> ERRO_ASSOCIACAO_DOCUMENTO", HISTORICO_STATUS_RECONCILIACAO.ERRO_ASSOCIACAO_DOCUMENTO, nuspDivergente.statusReconciliacao);

  // RODADA A, item 30.3 do escopo: curso AUSENTE no cabeçalho do PDF
  // continua EXTRACAO_INCOMPLETA (esse caminho já existia no código,
  // só não tinha assert dedicado até esta rodada).
  const cursoAusente = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: Object.assign({}, documentoBase, { cursoCodigoDocumento: null }) }
  );
  historicoAssert_(resultados, "reconciliação: código do curso ausente no cabeçalho do PDF -> EXTRACAO_INCOMPLETA", HISTORICO_STATUS_RECONCILIACAO.EXTRACAO_INCOMPLETA, cursoAusente.statusReconciliacao);

  // RODADA A, item 30.2 do escopo — MUDANÇA DELIBERADA DE EXPECTATIVA:
  // até a rodada anterior, este teste se chamava "cursoDivergente" e
  // esperava HABILITACAO_FALTANDO (currículo do PDF diferente do
  // "vigente" 47012 era tratado como erro de reconciliação). Essa
  // regra deixou de existir nesta rodada: um histórico de OUTRO
  // currículo (aqui, 47011) não é mais divergência nenhuma — é só
  // informação que vai ser usada depois pra escolher o ruleset. Por
  // isso o nome mudou e a expectativa agora é OK.
  const cursoDiferenteDoVigenteNaoEhDivergencia = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: Object.assign({}, documentoBase, { cursoCodigoDocumento: "47011" }) }
  );
  historicoAssert_(resultados, "reconciliação: currículo do PDF diferente do mais comum (ex. 47011) NÃO é mais divergência -> OK (mudança deliberada desta rodada — era HABILITACAO_FALTANDO)", HISTORICO_STATUS_RECONCILIACAO.OK, cursoDiferenteDoVigenteNaoEhDivergencia.statusReconciliacao);

  const habilitacaoDivergenteSemCombo = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: false },
    { documento: Object.assign({}, documentoBase, {
      habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.psi.habilitacaoCodigo,
      habilitacaoNomeDocumento: HISTORICO_HABILITACOES.psi.nome
    }) }
  );
  historicoAssert_(resultados, "reconciliação: cabeçalho diz Psicólogo mas pedido é Bacharelado, SEM flag de combo -> HABILITACAO_FALTANDO", HISTORICO_STATUS_RECONCILIACAO.HABILITACAO_FALTANDO, habilitacaoDivergenteSemCombo.statusReconciliacao);

  const habilitacaoDivergenteComCombo = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: true },
    { documento: Object.assign({}, documentoBase, {
      habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.psi.habilitacaoCodigo,
      habilitacaoNomeDocumento: HISTORICO_HABILITACOES.psi.nome
    }) }
  );
  historicoAssert_(resultados, "reconciliação: mesmo caso acima, mas COM documentoDeOutraHabilitacao=true (combo Psi+Bach reaproveitando o PDF do Psicólogo) -> OK", HISTORICO_STATUS_RECONCILIACAO.OK, habilitacaoDivergenteComCombo.statusReconciliacao);

  const comboNaoPerdoaNuspErrado = historicoReconciliarDocumento_(
    { chaveHabilitacao: chaveHabilitacao, nuspRegistro: nuspRegistro, documentoDeOutraHabilitacao: true },
    { documento: Object.assign({}, documentoBase, { nusp: "9999999" }) }
  );
  historicoAssert_(resultados, "reconciliação: documentoDeOutraHabilitacao=true NÃO perdoa NUSP divergente (o bypass é só da habilitação)", HISTORICO_STATUS_RECONCILIACAO.ERRO_ASSOCIACAO_DOCUMENTO, comboNaoPerdoaNuspErrado.statusReconciliacao);

}

/*=====================================================
  GRUPO 6 — Seleção do ruleset ATIVO

  Parte rígida (códigos sintéticos, garantidamente inexistentes) +
  parte informativa (códigos reais PSI/BACH/LIC, contra a planilha
  ao vivo — o resultado depende do estado atual dela, então não é
  tratado como falha, só relatado).
=====================================================*/
function historicoTestesSelecaoRuleset_(resultados) {

  try {
    const selecaoInexistente = historicoSelecionarRulesetAtivo_("00000-CURSO-TESTE-INEXISTENTE", "00000-HABILITACAO-TESTE-INEXISTENTE");
    historicoAssert_(resultados, "seleção de ruleset: curso/habilitação sintéticos e inexistentes -> ruleset null", true, selecaoInexistente.ruleset === null);
    historicoAssert_(resultados, "seleção de ruleset: curso/habilitação inexistentes -> motivo explicado (nunca string vazia)", true,
      typeof selecaoInexistente.motivoIndisponivel === "string" && selecaoInexistente.motivoIndisponivel.length > 0);
  } catch (err) {
    resultados.total++; resultados.falhou++;
    resultados.detalhes.push(
      `[FALHOU] seleção de ruleset (códigos inexistentes) — não consegui nem consultar a planilha de Regras ` +
      `Curriculares: ${err.message}. Confira a chave REGRAS_CURRICULARES no ID_INDEX e o acesso ` +
      `da conta gradip@usp.br a essa planilha.`
    );
  }

  // RODADA A, item 35 do escopo (rulesetRevisao=null quando nenhum
  // ruleset é usado) — caso "RULESET_INDISPONIVEL", via
  // historicoAvaliarHabilitacao_ ponta-a-ponta. Curso sintético
  // garantidamente inexistente -> continua rígido mesmo tocando a
  // planilha real (mesmo raciocínio do bloco acima).
  try {
    const documentoCursoInexistente = {
      nusp: "0000000",
      nome: "Teste — curso sintético inexistente",
      cursoCodigoDocumento: "00000-CURSO-TESTE-INEXISTENTE",
      habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.bach.habilitacaoCodigo,
      habilitacaoNomeDocumento: HISTORICO_HABILITACOES.bach.nome
    };
    const resultadoRulesetIndisponivel = historicoAvaliarHabilitacao_({
      chaveHabilitacao: "bach",
      nuspRegistro: "0000000",
      dadosExtraidos: { documento: documentoCursoInexistente, totais: {}, semestres: [], semestresValidos: null, parserVersion: "TESTE" },
      documentoDeOutraHabilitacao: false
    });
    historicoAssert_(resultados, "avaliarHabilitacao_: curso sintético sem ruleset -> resultado CONFERIR", HISTORICO_RESULTADO.CONFERIR, resultadoRulesetIndisponivel.resultado);
    historicoAssert_(resultados, "avaliarHabilitacao_: curso sintético sem ruleset -> motivo RULESET_INDISPONIVEL", true,
      resultadoRulesetIndisponivel.motivos.some(m => m.tipo === "RULESET_INDISPONIVEL"));
    historicoAssert_(resultados, "avaliarHabilitacao_: curso sintético sem ruleset -> rulesetRevisao null (nenhum ruleset foi usado)", null, resultadoRulesetIndisponivel.rulesetRevisao);
  } catch (err) {
    resultados.total++; resultados.falhou++;
    resultados.detalhes.push(
      `[FALHOU] avaliarHabilitacao_ (curso sintético inexistente) — não consegui nem consultar a planilha de ` +
      `Regras Curriculares: ${err.message}.`
    );
  }

  ["psi", "bach", "lic"].forEach(chave => {
    const cfg = historicoConfigHabilitacao_(chave);
    try {
      // RODADA A: "47012" aqui é só o curso real conhecido hoje pra
      // estas 3 habilitações — não existe mais uma constante de
      // runtime pra isso (ver HistoricoConfig.gs).
      const selecao = historicoSelecionarRulesetAtivo_("47012", cfg.habilitacaoCodigo);
      if (selecao.ruleset) {
        historicoInfo_(resultados, `seleção de ruleset — ${cfg.nome}`,
          `Ruleset ATIVO selecionável agora: ${selecao.ruleset.rulesetId} (versão ${selecao.ruleset.versao}, ` +
          `revisão ${selecao.ruleset.revisao}), curso=${selecao.ruleset.cursoCodigo}, ` +
          `habilitação=${selecao.ruleset.habilitacaoCodigo}, ` +
          `semestresMinimos=${selecao.ruleset.semestresMinimos}, semestresMaximos=${selecao.ruleset.semestresMaximos}, ` +
          `excedenteEletivasCompensaLivres=${selecao.ruleset.excedenteEletivasCompensaLivres}.`
        );
      } else {
        historicoInfo_(resultados, `seleção de ruleset — ${cfg.nome}`,
          `Nenhum ruleset selecionável agora. Motivo reportado pelo sistema: "${selecao.motivoIndisponivel}"`
        );
      }
    } catch (err) {
      historicoInfo_(resultados, `seleção de ruleset — ${cfg.nome}`,
        `Não consegui consultar a planilha de Regras Curriculares agora: ${err.message}`
      );
    }
  });

}

/*=====================================================
  GRUPO — Tempo de curso: mínimo/máximo (revisão pós-auditoria,
  item 1)

  historicoAvaliarTempoCurso_ tem 4 faixas de decisão — os 5 casos
  abaixo cobrem exatamente os limites entre elas (abaixo do mínimo,
  no mínimo exato, no meio, no máximo exato, acima do máximo), mais
  um caso de regressão pra confirmar que uma habilitação SEM máximo
  configurado (semestresMaximos null — ex.: linha da planilha ainda
  não migrada) continua funcionando como antes desta correção.
=====================================================*/
function historicoTestesTempoCursoLimites_(resultados) {

  // Faixa de referência pros 5 primeiros casos: mínimo 8, máximo 12
  // (mesma faixa do Bacharelado) — só pra ter números redondos e
  // fáceis de auditar; a lógica testada não depende de habilitação
  // nenhuma específica.

  // 1) Abaixo do mínimo -> NAO_CUMPRIDO, nunca por indisponibilidade.
  const abaixoDoMinimo = historicoAvaliarTempoCurso_(7, 8, 12);
  historicoAssert_(resultados, "tempoCurso: 7/8/12 (abaixo do mínimo) -> situacao NAO_CUMPRIDO", "NAO_CUMPRIDO", abaixoDoMinimo.situacao);
  historicoAssert_(resultados, "tempoCurso: 7/8/12 (abaixo do mínimo) -> indisponivel=false (falha objetiva, não ambiguidade)", false, abaixoDoMinimo.indisponivel);
  historicoAssert_(resultados, "tempoCurso: 7/8/12 (abaixo do mínimo) -> excedeMaximo=false", false, abaixoDoMinimo.excedeMaximo);

  // 2) Exatamente no mínimo -> CUMPRIDO (o mínimo é inclusivo).
  const noMinimoExato = historicoAvaliarTempoCurso_(8, 8, 12);
  historicoAssert_(resultados, "tempoCurso: 8/8/12 (exatamente no mínimo) -> situacao CUMPRIDO", "CUMPRIDO", noMinimoExato.situacao);
  historicoAssert_(resultados, "tempoCurso: 8/8/12 (exatamente no mínimo) -> indisponivel=false", false, noMinimoExato.indisponivel);

  // 3) Entre mínimo e máximo -> CUMPRIDO.
  const entreMinimoEMaximo = historicoAvaliarTempoCurso_(10, 8, 12);
  historicoAssert_(resultados, "tempoCurso: 10/8/12 (entre mínimo e máximo) -> situacao CUMPRIDO", "CUMPRIDO", entreMinimoEMaximo.situacao);
  historicoAssert_(resultados, "tempoCurso: 10/8/12 (entre mínimo e máximo) -> indisponivel=false", false, entreMinimoEMaximo.indisponivel);

  // 4) Exatamente no máximo -> CUMPRIDO (o máximo também é inclusivo
  //    — só o que passa DO máximo cai pra CONFERIR, não quem chega nele).
  const noMaximoExato = historicoAvaliarTempoCurso_(12, 8, 12);
  historicoAssert_(resultados, "tempoCurso: 12/8/12 (exatamente no máximo) -> situacao CUMPRIDO", "CUMPRIDO", noMaximoExato.situacao);
  historicoAssert_(resultados, "tempoCurso: 12/8/12 (exatamente no máximo) -> indisponivel=false", false, noMaximoExato.indisponivel);
  historicoAssert_(resultados, "tempoCurso: 12/8/12 (exatamente no máximo) -> excedeMaximo=false", false, noMaximoExato.excedeMaximo);

  // 5) Acima do máximo -> NUNCA cumprido nem não-cumprido automático:
  //    NAO_VERIFICADO + indisponivel=true, força CONFERIR (auditoria
  //    item 1 — o ponto central desta correção).
  const acimaDoMaximo = historicoAvaliarTempoCurso_(13, 8, 12);
  historicoAssert_(resultados, "tempoCurso: 13/8/12 (acima do máximo) -> situacao NAO_VERIFICADO (nunca CUMPRIDO nem NAO_CUMPRIDO)", "NAO_VERIFICADO", acimaDoMaximo.situacao);
  historicoAssert_(resultados, "tempoCurso: 13/8/12 (acima do máximo) -> indisponivel=true (força CONFERIR)", true, acimaDoMaximo.indisponivel);
  historicoAssert_(resultados, "tempoCurso: 13/8/12 (acima do máximo) -> excedeMaximo=true", true, acimaDoMaximo.excedeMaximo);

  // 6) Regressão: habilitação sem máximo configurado (célula
  //    semestres_maximos ainda vazia na planilha -> chega aqui como
  //    null) nunca deve travar em CONFERIR só por não ter teto.
  const semMaximoConfigurado = historicoAvaliarTempoCurso_(999, 8, null);
  historicoAssert_(resultados, "tempoCurso: 999/8/null (sem máximo configurado) -> situacao CUMPRIDO (nenhum teto pra exceder)", "CUMPRIDO", semMaximoConfigurado.situacao);
  historicoAssert_(resultados, "tempoCurso: 999/8/null (sem máximo configurado) -> indisponivel=false", false, semMaximoConfigurado.indisponivel);
  historicoAssert_(resultados, "tempoCurso: 999/8/null (sem máximo configurado) -> excedeMaximo=false", false, semMaximoConfigurado.excedeMaximo);

}

/*=====================================================
  GRUPO — Campo "obrigatorio" de REQUISITOS_NUMERICOS (revisão
  pós-auditoria, item 4)

  Os 4 casos abaixo são exatamente os pedidos na auditoria: valor
  ausente com obrigatorio=SIM precisa travar a decisão (indisponivel
  =true); valor ausente com obrigatorio=NÃO não pode travar sozinho;
  e um valor PRESENTE participa normalmente da decisão (cumprindo ou
  não) nos dois casos de obrigatorio, já que o campo só muda o que
  acontece quando FALTA dado — nunca o que acontece quando o dado
  está disponível.
=====================================================*/
function historicoTestesObrigatorioRequisitoNumerico_(resultados) {

  const totaisSemCampo = { totais: {} };
  const totaisComCampo5 = { totais: { x: 5 } };
  const totaisComCampo10 = { totais: { x: 10 } };

  // 1) obrigatório SIM + valor ausente -> bloqueia (CONFERIR).
  const requisitoObrigatorioAusente = {
    criterio: "TESTE_OBRIG_SIM", descricao: "Obrigatório, ausente", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: true
  };
  const avaliacaoObrigatorioAusente = historicoAvaliarRequisitoNumericoSimples_(requisitoObrigatorioAusente, totaisSemCampo);
  historicoAssert_(resultados, "obrigatorio=SIM + valor ausente -> situacao NAO_VERIFICADO", "NAO_VERIFICADO", avaliacaoObrigatorioAusente.situacao);
  historicoAssert_(resultados, "obrigatorio=SIM + valor ausente -> indisponivel=true (bloqueia/CONFERIR)", true, avaliacaoObrigatorioAusente.indisponivel);

  // 2) obrigatório NÃO + valor ausente -> registrado, mas NÃO bloqueia sozinho.
  const requisitoNaoObrigatorioAusente = {
    criterio: "TESTE_OBRIG_NAO_AUSENTE", descricao: "Não obrigatório, ausente", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: false
  };
  const avaliacaoNaoObrigatorioAusente = historicoAvaliarRequisitoNumericoSimples_(requisitoNaoObrigatorioAusente, totaisSemCampo);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor ausente -> situacao NAO_VERIFICADO (registrado no relatório)", "NAO_VERIFICADO", avaliacaoNaoObrigatorioAusente.situacao);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor ausente -> indisponivel=false (não contamina a decisão final sozinho)", false, avaliacaoNaoObrigatorioAusente.indisponivel);

  // 3) obrigatório NÃO + valor presente que FALHA -> participa normalmente (NAO_CUMPRIDO).
  const requisitoNaoObrigatorioFalha = {
    criterio: "TESTE_OBRIG_NAO_FALHA", descricao: "Não obrigatório, valor presente, falha", operador: ">=",
    valor: 100, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: false
  };
  const avaliacaoNaoObrigatorioFalha = historicoAvaliarRequisitoNumericoSimples_(requisitoNaoObrigatorioFalha, totaisComCampo5);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor presente que falha (5 >= 100? não) -> situacao NAO_CUMPRIDO", "NAO_CUMPRIDO", avaliacaoNaoObrigatorioFalha.situacao);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor presente que falha -> indisponivel=false", false, avaliacaoNaoObrigatorioFalha.indisponivel);

  // 4) obrigatório NÃO + valor presente que CUMPRE -> participa normalmente (CUMPRIDO).
  const requisitoNaoObrigatorioCumpre = {
    criterio: "TESTE_OBRIG_NAO_CUMPRE", descricao: "Não obrigatório, valor presente, cumpre", operador: ">=",
    valor: 5, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: false
  };
  const avaliacaoNaoObrigatorioCumpre = historicoAvaliarRequisitoNumericoSimples_(requisitoNaoObrigatorioCumpre, totaisComCampo10);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor presente que cumpre (10 >= 5? sim) -> situacao CUMPRIDO", "CUMPRIDO", avaliacaoNaoObrigatorioCumpre.situacao);
  historicoAssert_(resultados, "obrigatorio=NÃO + valor presente que cumpre -> indisponivel=false", false, avaliacaoNaoObrigatorioCumpre.indisponivel);

  // 5) Regressão defensiva: campo "obrigatorio" ausente/undefined no
  //    objeto de entrada — diferente de null (que, a partir da
  //    rodada 3 da auditoria, é o valor real que vem de uma célula
  //    vazia/inválida na planilha via historicoBooleanoConfiguracaoOuNulo_,
  //    e tem tratamento PRÓPRIO — ver grupo "Booleanos de configuração
  //    tri-state" logo abaixo). undefined é só o tipo de entrada que
  //    um caminho futuro/alternativo que não passe pela Repository
  //    poderia montar -> tratado como obrigatório, por segurança
  //    (fail-safe), igual ao comportamento de todo o resto do motor.
  const requisitoSemCampoObrigatorio = {
    criterio: "TESTE_OBRIG_INDEFINIDO", descricao: "Campo obrigatorio ausente no objeto", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1
    // "obrigatorio" de propósito NÃO definido aqui.
  };
  const avaliacaoSemCampoObrigatorio = historicoAvaliarRequisitoNumericoSimples_(requisitoSemCampoObrigatorio, totaisSemCampo);
  historicoAssert_(resultados, "obrigatorio ausente no objeto + valor ausente -> indisponivel=true (padrão seguro, fail-safe)", true, avaliacaoSemCampoObrigatorio.indisponivel);

}

/*=====================================================
  GRUPO — Booleanos de configuração tri-state (auditoria, rodada 3,
  item 2)

  historicoBooleanoConfiguracaoOuNulo_ (HistoricoRegrasRepository.gs)
  é o parser estrito usado em excedente_eletivas_compensa_livres e em
  obrigatorio — diferente de historicoBooleanoSheet_ (usado em
  filtros como "ativo"), ele NUNCA colapsa vazio/inválido em false.
  Bloco 1 testa o parser isoladamente (os 4 casos pedidos pela
  auditoria: SIM/NÃO/vazio/inválido); blocos 2 e 3 confirmam que um
  obrigatorio=null realmente força CONFERIR no motor — inclusive
  quando o dado do aluno está disponível e a comparação teria dado
  certo (nunca vira "opcional" nem decide sozinho por omissão), e
  inclusive no atalho de cálculo da compensação eletivas->livres (que
  não passava por historicoAvaliarRequisitoNumericoSimples_ antes
  desta correção, e por isso não olhava pra obrigatorio de jeito
  nenhum).
=====================================================*/
function historicoTestesBooleanoConfiguracaoTriState_(resultados) {

  // --- 1) parser isolado: os 4 casos exatos pedidos pela auditoria ---
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: \"SIM\" -> true", true, historicoBooleanoConfiguracaoOuNulo_("SIM"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: \"sim\" (minúsculo) -> true", true, historicoBooleanoConfiguracaoOuNulo_("sim"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: \"NÃO\" -> false", false, historicoBooleanoConfiguracaoOuNulo_("NÃO"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: \"NAO\" (sem acento) -> false", false, historicoBooleanoConfiguracaoOuNulo_("NAO"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: \"não\" (minúsculo, acentuado) -> false", false, historicoBooleanoConfiguracaoOuNulo_("não"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: célula vazia (\"\") -> null", null, historicoBooleanoConfiguracaoOuNulo_(""));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: null -> null", null, historicoBooleanoConfiguracaoOuNulo_(null));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: undefined (coluna ausente) -> null", null, historicoBooleanoConfiguracaoOuNulo_(undefined));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: texto inválido (\"talvez\") -> null, nunca false", null, historicoBooleanoConfiguracaoOuNulo_("talvez"));
  historicoAssert_(resultados, "booleanoConfiguracaoOuNulo: espaços em branco (\"   \") -> null", null, historicoBooleanoConfiguracaoOuNulo_("   "));

  // --- 2) obrigatorio=null chegando na avaliação de um requisito simples: CONFERIR incondicional ---
  const requisitoObrigatorioNuloSemDado = {
    criterio: "TESTE_OBRIG_NULO_SEM_DADO", descricao: "Config. insegura, sem dado", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: null
  };
  const avalObrigatorioNuloSemDado = historicoAvaliarRequisitoNumericoSimples_(requisitoObrigatorioNuloSemDado, { totais: {} });
  historicoAssert_(resultados, "obrigatorio=null + valor ausente -> situacao NAO_VERIFICADO", "NAO_VERIFICADO", avalObrigatorioNuloSemDado.situacao);
  historicoAssert_(resultados, "obrigatorio=null + valor ausente -> indisponivel=true (CONFERIR)", true, avalObrigatorioNuloSemDado.indisponivel);
  historicoAssert_(resultados, "obrigatorio=null + valor ausente -> configuracaoInsegura=true", true, avalObrigatorioNuloSemDado.configuracaoInsegura);

  // O caso mais importante: dado PRESENTE e a comparação DARIA CERTO
  // (999 >= 10) — mesmo assim tem que virar CONFERIR, nunca "CUMPRIDO"
  // silencioso, porque a insegurança está na configuração da regra,
  // não no histórico do aluno.
  const requisitoObrigatorioNuloComDadoQueCumpre = {
    criterio: "TESTE_OBRIG_NULO_CUMPRIRIA", descricao: "Config. insegura, dado cumpriria", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: null
  };
  const avalObrigatorioNuloComDadoQueCumpre = historicoAvaliarRequisitoNumericoSimples_(requisitoObrigatorioNuloComDadoQueCumpre, { totais: { x: 999 } });
  historicoAssert_(resultados, "obrigatorio=null + dado presente que CUMPRIRIA (999>=10) -> AINDA NAO_VERIFICADO, nunca CUMPRIDO", "NAO_VERIFICADO", avalObrigatorioNuloComDadoQueCumpre.situacao);
  historicoAssert_(resultados, "obrigatorio=null + dado presente que cumpriria -> indisponivel=true (nunca decide sozinho)", true, avalObrigatorioNuloComDadoQueCumpre.indisponivel);
  historicoAssert_(resultados, "obrigatorio=null + dado presente que cumpriria -> configuracaoInsegura=true", true, avalObrigatorioNuloComDadoQueCumpre.configuracaoInsegura);

  // E o mesmo do outro lado: dado presente que FALHARIA (1>=10? não)
  // também não pode virar "NAO_CUMPRIDO" definitivo — mesma CONFERIR.
  const requisitoObrigatorioNuloComDadoQueFalha = {
    criterio: "TESTE_OBRIG_NULO_FALHARIA", descricao: "Config. insegura, dado falharia", operador: ">=",
    valor: 10, campoParser: "totais.x", unidade: "créditos", ordem: 1, obrigatorio: null
  };
  const avalObrigatorioNuloComDadoQueFalha = historicoAvaliarRequisitoNumericoSimples_(requisitoObrigatorioNuloComDadoQueFalha, { totais: { x: 1 } });
  historicoAssert_(resultados, "obrigatorio=null + dado presente que falharia (1>=10? não) -> AINDA NAO_VERIFICADO, nunca NAO_CUMPRIDO", "NAO_VERIFICADO", avalObrigatorioNuloComDadoQueFalha.situacao);
  historicoAssert_(resultados, "obrigatorio=null + dado presente que falharia -> indisponivel=true", true, avalObrigatorioNuloComDadoQueFalha.indisponivel);

  // --- 3) obrigatorio=null NÃO pode ser ignorado pelo atalho de cálculo da compensação eletivas->livres ---
  const reqEletivasComObrigatorioNulo = {
    criterio: "ELETIVAS_AULA", descricao: "Eletivas (config. insegura)", operador: ">=",
    valor: 15, campoParser: "creditosPorTipo.eletivas.aula", unidade: "créditos-aula", ordem: 2, obrigatorio: null
  };
  const reqLivresNormal = {
    criterio: "LIVRES_AULA", descricao: "Livres", operador: ">=",
    valor: 47, campoParser: "creditosPorTipo.livres.aula", unidade: "créditos-aula", ordem: 3, obrigatorio: true
  };
  // Dados completos e operadores compatíveis — sem a correção desta
  // rodada, isso tomaria o atalho de cálculo direto (que nunca olha
  // pra obrigatorio) e ignoraria a configuração insegura por completo.
  const totaisCompensacaoComObrigatorioNulo = { creditosPorTipo: { eletivas: { aula: 41 }, livres: { aula: 26 } } };
  const parComObrigatorioNulo = historicoAvaliarCompensacaoEletivasLivres_(reqEletivasComObrigatorioNulo, reqLivresNormal, totaisCompensacaoComObrigatorioNulo);
  historicoAssert_(resultados,
    "compensação eletivas->livres: obrigatorio=null em ELETIVAS_AULA -> NÃO toma o atalho (sem .compensacao em livres)",
    undefined,
    parComObrigatorioNulo.livres.compensacao
  );
  historicoAssert_(resultados,
    "compensação eletivas->livres: obrigatorio=null em ELETIVAS_AULA -> eletivas cai pra avaliação isolada, CONFERIR (nunca CUMPRIDO silencioso apesar de 41>=15)",
    "NAO_VERIFICADO",
    parComObrigatorioNulo.eletivas.situacao
  );
  historicoAssert_(resultados,
    "compensação eletivas->livres: obrigatorio=null em ELETIVAS_AULA -> eletivas fica indisponivel=true (força CONFERIR)",
    true,
    parComObrigatorioNulo.eletivas.indisponivel
  );

}

/*=====================================================
  GRUPO — Validação de MIME/tamanho do PDF (revisão pós-auditoria,
  item 5)

  historicoValidarMimeETamanho_ (HistoricoArquivos.gs) é uma função
  pura — não fala com Drive, só recebe a metadata já lida por fora —
  então dá pra testar aqui dentro do Apps Script com o MimeType.PDF
  REAL (sem precisar simular/mockar nada, diferente do que seria
  necessário fora do runtime do Apps Script).
=====================================================*/
function historicoTestesValidacaoMimeTamanho_(resultados) {

  // 1) MIME real diferente de PDF (extensão .pdf, mas arquivo trocado/corrompido) -> inválido.
  const mimeErrado = historicoValidarMimeETamanho_("historico.pdf", "text/plain", 1000);
  historicoAssert_(resultados, "validarMimeETamanho: MIME real != application/pdf -> valido=false", false, mimeErrado.valido);
  historicoAssert_(resultados, "validarMimeETamanho: MIME real != application/pdf -> motivoIndisponivel explicado", true,
    typeof mimeErrado.motivoIndisponivel === "string" && mimeErrado.motivoIndisponivel.length > 0);

  // 2) Tamanho 0 (arquivo vazio) -> inválido.
  const tamanhoZero = historicoValidarMimeETamanho_("historico.pdf", MimeType.PDF, 0);
  historicoAssert_(resultados, "validarMimeETamanho: tamanho 0 bytes -> valido=false", false, tamanhoZero.valido);

  // 3) Tamanho acima do limite adotado (MAX_UPLOAD_BYTES, reaproveitado de DiplomasBackend.gs) -> inválido.
  const tamanhoExcedente = historicoValidarMimeETamanho_("historico.pdf", MimeType.PDF, MAX_UPLOAD_BYTES + 1);
  historicoAssert_(resultados, "validarMimeETamanho: tamanho acima de MAX_UPLOAD_BYTES -> valido=false", false, tamanhoExcedente.valido);

  // 4) MIME correto + tamanho dentro do limite -> válido, sem motivo.
  const arquivoValido = historicoValidarMimeETamanho_("historico.pdf", MimeType.PDF, 100000);
  historicoAssert_(resultados, "validarMimeETamanho: MIME PDF real + tamanho normal -> valido=true", true, arquivoValido.valido);
  historicoAssert_(resultados, "validarMimeETamanho: caso válido -> motivoIndisponivel=null", null, arquivoValido.motivoIndisponivel);

  // 5) Tamanho exatamente no limite (MAX_UPLOAD_BYTES) -> ainda válido (limite é inclusivo).
  const tamanhoNoLimite = historicoValidarMimeETamanho_("historico.pdf", MimeType.PDF, MAX_UPLOAD_BYTES);
  historicoAssert_(resultados, "validarMimeETamanho: tamanho exatamente no limite -> valido=true (limite inclusivo)", true, tamanhoNoLimite.valido);

}

/*=====================================================
  GRUPO 7 — Integração ponta-a-ponta com o ruleset REAL do Psicólogo

  Lê as regras REAIS cadastradas agora na planilha (REQUISITOS_
  NUMERICOS/DISCIPLINAS/GRUPOS_REGRAS do ruleset ATIVO de Psicólogo)
  e sintetiza um histórico fictício construído pra folgadamente
  cumprir QUALQUER limiar cadastrado — sem nunca hardcoded os
  números reais aqui, então o teste continua válido mesmo se algum
  valor mudar na planilha amanhã. Se o resultado final não for APTO
  com esse dado "perfeito demais pra falhar", algo está errado (no
  motor, ou numa inconsistência da própria planilha) — nesse caso o
  teste reporta os motivos completos devolvidos pelo motor, pra dar
  pista de qual critério travou.

  historicoDefinirCampoParser_ é o espelho, "de escrita", do
  historicoResolverCampoParser_ do HistoricoMotor.gs — existe só
  aqui neste arquivo de testes (o motor nunca precisa escrever em
  campo_parser, só ler).
=====================================================*/

function historicoDefinirCampoParser_(objetoRaiz, caminhoPontilhado, valor) {
  const partes = String(caminhoPontilhado).split(".");
  let atual = objetoRaiz;
  for (let i = 0; i < partes.length - 1; i++) {
    const parte = partes[i];
    if (typeof atual[parte] !== "object" || atual[parte] === null) {
      atual[parte] = {};
    }
    atual = atual[parte];
  }
  atual[partes[partes.length - 1]] = valor;
  return objetoRaiz;
}

// Devolve um valor que satisfaz FOLGADAMENTE o operador cadastrado,
// sem nenhum conhecimento do domínio (créditos, horas, etc.) — só
// aritmética genérica em cima do "valor" exigido pela própria linha.
function historicoValorQueSatisfazOperador_(operador, exigido) {
  switch (operador) {
    case ">=": return exigido + 1000;
    case ">": return exigido + 1000;
    case "=": return exigido;
    case "<=": return exigido;
    case "<": return exigido - 1;
    default: return exigido;
  }
}

function historicoTestesIntegracaoComRulesetReal_(resultados) {

  const cfgPsi = HISTORICO_HABILITACOES.psi;
  let selecao;

  // RODADA A: "47012" aqui é só o curso real conhecido hoje pra
  // Psicólogo — não existe mais uma constante de runtime pra isso.
  try {
    selecao = historicoSelecionarRulesetAtivo_("47012", cfgPsi.habilitacaoCodigo);
  } catch (err) {
    historicoInfo_(resultados, "integração ponta-a-ponta (ruleset real)",
      `Não consegui consultar a planilha de Regras Curriculares agora: ${err.message}. Teste pulado.`
    );
    return;
  }

  if (!selecao.ruleset) {
    historicoInfo_(resultados, "integração ponta-a-ponta (ruleset real)",
      `Pulado — nenhum ruleset ATIVO selecionável agora para Psicólogo/47012 ` +
      `("${selecao.motivoIndisponivel}"). Confira o status ATIVO e a configuração completa (incluindo ` +
      `"revisao") na aba "${ABA_REGRAS_CURRICULOS}", pelo Dashboard dos Servidores, pra este teste rodar de verdade.`
    );
    return;
  }

  const ruleset = selecao.ruleset;

  try {

    const pacote = historicoMontarPacoteRegras_(ruleset.rulesetId);

    // "totais" sintético: satisfaz folgadamente CADA requisito numérico
    // cadastrado agora, sem hardcoded nenhum número real aqui.
    const totaisSinteticos = {};
    const requisitosIgnorados = [];
    pacote.requisitosNumericos.forEach(r => {
      if (!r.campoParser || r.valor === null || r.valor === undefined || !r.operador) {
        requisitosIgnorados.push(r.criterio || r.requisitoId || "(sem identificação)");
        return;
      }
      historicoDefinirCampoParser_(totaisSinteticos, r.campoParser, historicoValorQueSatisfazOperador_(r.operador, r.valor));
    });

    if (requisitosIgnorados.length > 0) {
      historicoInfo_(resultados, "integração ponta-a-ponta (ruleset real)",
        `${requisitosIgnorados.length} linha(s) de REQUISITOS_NUMERICOS ignorada(s) por estarem incompletas ` +
        `(sem campo_parser/valor/operador preenchido): ${requisitosIgnorados.join(", ")}.`
      );
    }

    // Disciplinas cursadas sintéticas: uma ocorrência "campeã" (status
    // aceito, créditos folgados) pra cada sigla cadastrada em DISCIPLINAS
    // do ruleset — tanto OBRIGATORIA quanto GRUPO, porque o motor procura
    // no histórico pela sigla sem se importar de onde ela veio.
    const disciplinasSinteticas = [];
    const disciplinasSemStatusAceito = [];
    pacote.disciplinas.forEach(d => {
      if (!d.statusAceitos || d.statusAceitos.length === 0) {
        disciplinasSemStatusAceito.push(d.sigla);
        return;
      }
      disciplinasSinteticas.push({ sigla: d.sigla, nome: d.nome, au: 1000, tr: 1000, status: d.statusAceitos[0] });
    });

    if (disciplinasSemStatusAceito.length > 0) {
      historicoInfo_(resultados, "integração ponta-a-ponta (ruleset real)",
        `${disciplinasSemStatusAceito.length} disciplina(s) sem status_aceitos preenchido na planilha — não dá ` +
        `pra sintetizar aprovação pra elas: ${disciplinasSemStatusAceito.join(", ")}.`
      );
    }

    const nuspSintetico = "0000000";
    // Usa exatamente o MÍNIMO configurado (nunca mínimo+folga) — desde
    // a correção da auditoria (item 1), semestresValidos acima do
    // MÁXIMO configurado deixou de ser inofensivo (passa a forçar
    // CONFERIR em vez de continuar "cumprido"), então somar uma folga
    // fixa aqui poderia estourar o máximo real da planilha e fazer
    // este teste falhar por causa do PRÓPRIO gerador de dados
    // sintéticos, não por um bug de verdade. O mínimo em si já é
    // CUMPRIDO (limite inclusivo — ver GRUPO "Tempo de curso:
    // mínimo/máximo" acima), e nunca pode ultrapassar o máximo
    // configurado, já que máximo >= mínimo por construção.
    const semestresValidosSinteticos = ruleset.semestresMinimos || 0;

    const dadosExtraidosSinteticos = {
      documento: {
        nusp: nuspSintetico,
        nome: "Teste de Integração (sintético — não corresponde a nenhum(a) aluno(a) real)",
        // Usa o MESMO curso do ruleset selecionado acima (nunca um
        // literal solto) — é exatamente o que garante que a seleção
        // dentro de historicoAvaliarHabilitacao_ vai bater com
        // "ruleset" capturado aqui, qualquer que seja o curso real
        // cadastrado hoje pra Psicólogo.
        cursoCodigoDocumento: ruleset.cursoCodigo,
        habilitacaoCodigoDocumento: cfgPsi.habilitacaoCodigo,
        habilitacaoNomeDocumento: cfgPsi.nome
      },
      semestres: [{
        ano: 2020, semestre: 1, trancamentoTotal: false,
        disciplinas: disciplinasSinteticas, creditosNoSemestre: 0
      }],
      semestresValidos: semestresValidosSinteticos,
      totais: totaisSinteticos,
      camposNaoReconhecidos: [],
      avisos: [],
      parserVersion: "TESTE-INTEGRACAO",
      nomeArquivo: "teste-integracao.pdf"
    };

    const resultado = historicoAvaliarHabilitacao_({
      chaveHabilitacao: "psi",
      nuspRegistro: nuspSintetico,
      dadosExtraidos: dadosExtraidosSinteticos,
      documentoDeOutraHabilitacao: false
    });

    historicoAssert_(resultados,
      "integração ponta-a-ponta: reconciliação passa com documento sintético consistente",
      HISTORICO_STATUS_RECONCILIACAO.OK,
      resultado.statusReconciliacao
    );
    historicoAssert_(resultados,
      "integração ponta-a-ponta: o ruleset usado na avaliação é o mesmo selecionado antes de montar o teste",
      ruleset.rulesetId,
      resultado.rulesetId
    );
    // Rastreabilidade (pós-auditoria, item 3): rulesetVersao/
    // rulesetEstruturaCurricular precisam vir preenchidos com o MESMO
    // ruleset selecionado — não testado antes desta correção, porque
    // esses 2 campos não existiam no objeto de retorno.
    historicoAssert_(resultados,
      "integração ponta-a-ponta: rulesetVersao do resultado bate com o ruleset selecionado (rastreabilidade, item 3)",
      ruleset.versao,
      resultado.rulesetVersao
    );
    // RODADA A, item 35 do escopo — mesma lógica de rastreabilidade
    // de rulesetVersao/rulesetEstruturaCurricular, agora também pra
    // rulesetRevisao.
    historicoAssert_(resultados,
      "integração ponta-a-ponta: rulesetRevisao do resultado bate com o ruleset selecionado (RODADA A)",
      ruleset.revisao,
      resultado.rulesetRevisao
    );
    historicoAssert_(resultados,
      "integração ponta-a-ponta: rulesetEstruturaCurricular do resultado bate com o ruleset selecionado (rastreabilidade, item 3)",
      ruleset.estruturaCurricular,
      resultado.rulesetEstruturaCurricular
    );
    historicoAssert_(resultados,
      "integração ponta-a-ponta: parserVersion do resultado é o mesmo enviado pelo parser sintético",
      "TESTE-INTEGRACAO",
      resultado.parserVersion
    );
    historicoAssert_(resultados,
      "integração ponta-a-ponta: dado sintético folgadamente acima de todo requisito real -> APTO",
      HISTORICO_RESULTADO.APTO,
      resultado.resultado
    );

    if (resultado.resultado !== HISTORICO_RESULTADO.APTO) {
      historicoInfo_(resultados, "integração ponta-a-ponta — detalhe da falha acima",
        `motivos devolvidos pelo motor: ${JSON.stringify(resultado.motivos)}`
      );
    }

  } catch (err) {
    resultados.total++;
    resultados.falhou++;
    resultados.detalhes.push(
      `[FALHOU] integração ponta-a-ponta (ruleset real) — erro inesperado, não deveria acontecer com dado ` +
      `sintético bem formado: ${err.message}`
    );
  }

}

/*=====================================================
  GRUPO 8 — RODADA A: resolução de ruleset em lista (multi-currículo +
  0/1/2 candidatos + revisão)

  Testa historicoResolverRulesetAtivoEmLista_ (HistoricoRegrasRepository.gs)
  — a função PURA extraída nesta rodada — com listas 100% sintéticas,
  nunca contra a planilha real: cobre 47011 e 47012 coexistindo sem
  ambiguidade cruzada, os 3 casos de candidatos (0/1/2), e a validação
  de "revisao" (RODADA A, itens 31/32/34/58/59 do escopo).
=====================================================*/

// Fixture de uma linha de CURRICULOS já "lida" (mesmo formato que
// historicoLerCurriculos_ devolve) — completa e válida por padrão;
// cada teste sobrescreve só o que precisa.
function historicoFixtureCurriculo_(overrides) {
  return Object.assign({
    rulesetId: "FIX-00000-000-V1",
    cursoCodigo: "47012",
    habilitacaoCodigo: "0",
    habilitacaoNome: "Fixture",
    estruturaCurricular: "Estrutura Fixture",
    versao: 1,
    vigenciaInicio: null,
    vigenciaFim: null,
    status: "ATIVO",
    semestresMinimos: 8,
    semestresMaximos: 12,
    excedenteEletivasCompensaLivres: true,
    revisao: 1,
    observacao: null
  }, overrides || {});
}

function historicoTestesResolverRulesetEmLista_(resultados) {

  // --- 47011 e 47012 coexistindo (mesma habilitação "100") — cada um
  // deve ser resolvido EXCLUSIVAMENTE pelo seu próprio curso, nunca
  // ambíguo entre si (itens 31/32: "Um ATIVO 47011 e um ATIVO 47012
  // NÃO são ambíguos entre si"). ---
  const listaMultiCurriculo = [
    historicoFixtureCurriculo_({ rulesetId: "FIX-47011-100-V1", cursoCodigo: "47011", habilitacaoCodigo: "100" }),
    historicoFixtureCurriculo_({ rulesetId: "FIX-47012-100-V1", cursoCodigo: "47012", habilitacaoCodigo: "100" })
  ];

  const selecao47011 = historicoResolverRulesetAtivoEmLista_(listaMultiCurriculo, "47011", "100");
  historicoAssert_(resultados, "resolverRulesetEmLista: 47011+100 com 47011 e 47012 na lista -> seleciona EXCLUSIVAMENTE o 47011", "FIX-47011-100-V1",
    selecao47011.ruleset && selecao47011.ruleset.rulesetId);
  historicoAssert_(resultados, "resolverRulesetEmLista: 47011+100 -> motivoIndisponivel null (selecionado com sucesso)", null, selecao47011.motivoIndisponivel);

  const selecao47012 = historicoResolverRulesetAtivoEmLista_(listaMultiCurriculo, "47012", "100");
  historicoAssert_(resultados, "resolverRulesetEmLista: 47012+100 com 47011 e 47012 na lista -> seleciona EXCLUSIVAMENTE o 47012 (nenhuma ambiguidade cruzada)", "FIX-47012-100-V1",
    selecao47012.ruleset && selecao47012.ruleset.rulesetId);

  // curso sem NENHUM candidato (nem 47011 nem 47012 são 47010) -> 0
  // candidatos -> indisponível. NUNCA fallback pro 47012 nem pro 47011.
  const selecao47010 = historicoResolverRulesetAtivoEmLista_(listaMultiCurriculo, "47010", "100");
  historicoAssert_(resultados, "resolverRulesetEmLista: 47010+100 (curso sem nenhum candidato) -> ruleset null, SEM fallback", true, selecao47010.ruleset === null);
  historicoAssert_(resultados, "resolverRulesetEmLista: 47010+100 -> motivo menciona o curso e a habilitação pedidos", true,
    selecao47010.motivoIndisponivel.indexOf("47010") !== -1 && selecao47010.motivoIndisponivel.indexOf("100") !== -1);

  // --- 2 candidatos ATIVOS pro MESMO curso+habilitação -> ambíguo de
  // verdade (item 32) — diferente do caso 47011/47012 acima. ---
  const listaDoisAtivosMesmaChave = [
    historicoFixtureCurriculo_({ rulesetId: "FIX-DUP-A-V1", cursoCodigo: "47012", habilitacaoCodigo: "200" }),
    historicoFixtureCurriculo_({ rulesetId: "FIX-DUP-B-V1", cursoCodigo: "47012", habilitacaoCodigo: "200" })
  ];
  const selecaoAmbigua = historicoResolverRulesetAtivoEmLista_(listaDoisAtivosMesmaChave, "47012", "200");
  historicoAssert_(resultados, "resolverRulesetEmLista: 2 ATIVOS pro MESMO curso+habilitação -> ruleset null (ambíguo)", true, selecaoAmbigua.ruleset === null);
  historicoAssert_(resultados, "resolverRulesetEmLista: 2 ATIVOS ambíguos -> motivo diz 'ambíguo'", true, selecaoAmbigua.motivoIndisponivel.toLowerCase().indexOf("ambíguo") !== -1);

  // --- Revisão (item 34): válida é preservada; inválida nunca vira
  // "revisão 1" por default — sempre indisponível/CONFERIR. ---
  const listaRevisaoValida = [historicoFixtureCurriculo_({ rulesetId: "FIX-REV-VALIDA-V1", cursoCodigo: "47012", habilitacaoCodigo: "999", revisao: 3 })];
  const selecaoRevisaoValida = historicoResolverRulesetAtivoEmLista_(listaRevisaoValida, "47012", "999");
  historicoAssert_(resultados, "resolverRulesetEmLista: revisao=3 (inteiro positivo válido) -> selecionado, revisao preservada", 3,
    selecaoRevisaoValida.ruleset && selecaoRevisaoValida.ruleset.revisao);

  [
    ["vazia (null)", null],
    ["zero", 0],
    ["negativa", -1],
    ["não inteira", 1.5]
  ].forEach(par => {
    const rotulo = par[0];
    const valorRevisao = par[1];
    const listaRevisaoInvalida = [historicoFixtureCurriculo_({ rulesetId: "FIX-REV-INVALIDA-V1", cursoCodigo: "47012", habilitacaoCodigo: "998", revisao: valorRevisao })];
    const selecaoRevisaoInvalida = historicoResolverRulesetAtivoEmLista_(listaRevisaoInvalida, "47012", "998");
    historicoAssert_(resultados, `resolverRulesetEmLista: revisão ${rotulo} -> NUNCA default 1, ruleset fica indisponível`, true, selecaoRevisaoInvalida.ruleset === null);
    historicoAssert_(resultados, `resolverRulesetEmLista: revisão ${rotulo} -> motivo menciona "revisao"`, true,
      selecaoRevisaoInvalida.motivoIndisponivel.toLowerCase().indexOf("revisao") !== -1);
  });

  // Config incompleta (semestresMinimos ausente) E revisão válida ao
  // mesmo tempo -> continua indisponível pela config incompleta,
  // confirmando que as duas checagens (config e revisão) coexistem
  // sem se atropelar.
  const listaConfigIncompletaComRevisaoValida = [historicoFixtureCurriculo_({ rulesetId: "FIX-CONFIG-INCOMPLETA-V1", cursoCodigo: "47012", habilitacaoCodigo: "997", semestresMinimos: null, revisao: 5 })];
  const selecaoConfigIncompleta = historicoResolverRulesetAtivoEmLista_(listaConfigIncompletaComRevisaoValida, "47012", "997");
  historicoAssert_(resultados, "resolverRulesetEmLista: config incompleta (semestresMinimos null) mesmo com revisão válida -> indisponível", true, selecaoConfigIncompleta.ruleset === null);

  // --- Item 58: 47011 SEM nenhum ruleset cadastrado -> CONFERIR por
  // RULESET_INDISPONIVEL, nunca "currículo diferente de 47012". ---
  const listaSem47011 = [historicoFixtureCurriculo_({ rulesetId: "FIX-47012-100-V1", cursoCodigo: "47012", habilitacaoCodigo: "100" })];
  const selecao47011SemRuleset = historicoResolverRulesetAtivoEmLista_(listaSem47011, "47011", "100");
  historicoAssert_(resultados, "resolverRulesetEmLista (item 58): 47011 sem ruleset cadastrado -> ruleset null", true, selecao47011SemRuleset.ruleset === null);
  historicoAssert_(resultados, "resolverRulesetEmLista (item 58): motivo é 'nenhum ruleset ATIVO', não 'currículo diferente'", true,
    selecao47011SemRuleset.motivoIndisponivel.indexOf("47011") !== -1 && selecao47011SemRuleset.motivoIndisponivel.toLowerCase().indexOf("nenhum ruleset ativo") !== -1);

  // --- Item 59: 47011 COM ruleset ATIVO + revisão válida + config
  // completa -> motor consegue avançar (ruleset selecionado). A
  // avaliação de requisitos/disciplinas/grupos em si já está coberta,
  // pra qualquer curso, pelos GRUPOS 1-4 (são agnósticas de
  // curso/currículo — só recebem ruleset/pacote já resolvidos). ---
  const listaCom47011 = [historicoFixtureCurriculo_({ rulesetId: "FIX-47011-100-V1", cursoCodigo: "47011", habilitacaoCodigo: "100" })];
  const selecao47011ComRuleset = historicoResolverRulesetAtivoEmLista_(listaCom47011, "47011", "100");
  historicoAssert_(resultados, "resolverRulesetEmLista (item 59): 47011 com ruleset ATIVO válido -> selecionado com sucesso", "FIX-47011-100-V1",
    selecao47011ComRuleset.ruleset && selecao47011ComRuleset.ruleset.rulesetId);
  historicoAssert_(resultados, "resolverRulesetEmLista (item 59): 47011 selecionado -> motivoIndisponivel null", null, selecao47011ComRuleset.motivoIndisponivel);

}

/*=====================================================
  GRUPO 9 — RODADA A: curso do PDF + habilitação alvo (nunca do
  cabeçalho quando avaliando OUTRA habilitação)

  Testa historicoResolverCursoHabilitacaoAlvo_ (HistoricoMotor.gs) —
  itens 33/57 do escopo. Cobre o caso Psi+Bach com DOIS cursos
  diferentes (47012 e 47011), provando que a chave de seleção nunca
  usa a habilitação do cabeçalho do PDF quando a análise em execução é
  de OUTRA habilitação.
=====================================================*/
function historicoTestesResolverCursoHabilitacaoAlvo_(resultados) {

  function dadosComCurso(cursoCodigo) {
    return {
      documento: {
        cursoCodigoDocumento: cursoCodigo,
        // Cabeçalho sempre do Psicólogo (habilitacaoCodigo "0") —
        // simula o combo Psi+Bach reaproveitando o mesmo PDF.
        habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.psi.habilitacaoCodigo,
        habilitacaoNomeDocumento: HISTORICO_HABILITACOES.psi.nome
      }
    };
  }

  ["47012", "47011"].forEach(cursoCodigo => {
    const dados = dadosComCurso(cursoCodigo);

    const chavePsi = historicoResolverCursoHabilitacaoAlvo_(dados, HISTORICO_HABILITACOES.psi);
    historicoAssert_(resultados, `resolverCursoHabilitacaoAlvo (curso ${cursoCodigo}, alvo Psicólogo): curso = ${cursoCodigo}`, cursoCodigo, chavePsi.cursoCodigo);
    historicoAssert_(resultados, `resolverCursoHabilitacaoAlvo (curso ${cursoCodigo}, alvo Psicólogo): habilitação = 0 (do próprio alvo)`, "0", chavePsi.habilitacaoCodigo);

    const chaveBach = historicoResolverCursoHabilitacaoAlvo_(dados, HISTORICO_HABILITACOES.bach);
    historicoAssert_(resultados, `resolverCursoHabilitacaoAlvo (curso ${cursoCodigo}, alvo Bacharelado via combo): curso = ${cursoCodigo} (mesmo PDF)`, cursoCodigo, chaveBach.cursoCodigo);
    historicoAssert_(resultados, `resolverCursoHabilitacaoAlvo (curso ${cursoCodigo}, alvo Bacharelado via combo): habilitação = 100 (do ALVO, nunca do cabeçalho "0")`, "100", chaveBach.habilitacaoCodigo);
    historicoAssert_(resultados, `resolverCursoHabilitacaoAlvo (curso ${cursoCodigo}, alvo Bacharelado via combo): NUNCA usa habilitação "0" do cabeçalho pro Bacharelado`, true, chaveBach.habilitacaoCodigo !== HISTORICO_HABILITACOES.psi.habilitacaoCodigo);
  });

}

/*=====================================================
  GRUPO 10 — RODADA A: resultado do motor carrega rulesetRevisao

  Casos em que NENHUM ruleset chega a ser usado (rulesetRevisao deve
  ser sempre null) — item 35 do escopo. O caso em que um ruleset É
  usado (rulesetRevisao precisa bater com o ruleset selecionado) já é
  coberto no GRUPO 7 (Integração ponta-a-ponta com ruleset real), que
  roda contra o ruleset ATIVO de verdade; o caso "ruleset indisponível"
  (também sem uso de ruleset) é coberto no GRUPO 6, com curso
  sintético inexistente.
=====================================================*/
function historicoTestesResultadoMotorComRevisao_(resultados) {

  const resultadoLic = historicoAvaliarHabilitacao_({
    chaveHabilitacao: "lic",
    nuspRegistro: "1234567",
    dadosExtraidos: null,
    documentoDeOutraHabilitacao: false
  });
  historicoAssert_(resultados, "avaliarHabilitacao_ (Licenciatura, não implementado) -> rulesetRevisao null", null, resultadoLic.rulesetRevisao);

  const resultadoExtracaoFalhou = historicoAvaliarHabilitacao_({
    chaveHabilitacao: "bach",
    nuspRegistro: "1234567",
    dadosExtraidos: { erro: "PDF_ILEGIVEL", mensagem: "teste" },
    documentoDeOutraHabilitacao: false
  });
  historicoAssert_(resultados, "avaliarHabilitacao_ (extração falhou) -> rulesetRevisao null", null, resultadoExtracaoFalhou.rulesetRevisao);

  const resultadoReconciliacaoFalhou = historicoAvaliarHabilitacao_({
    chaveHabilitacao: "bach",
    nuspRegistro: "1234567",
    dadosExtraidos: {
      documento: {
        nusp: "9999999", // divergente de "1234567" -> ERRO_ASSOCIACAO_DOCUMENTO, antes de qualquer seleção de ruleset
        cursoCodigoDocumento: "47012",
        habilitacaoCodigoDocumento: HISTORICO_HABILITACOES.bach.habilitacaoCodigo,
        habilitacaoNomeDocumento: HISTORICO_HABILITACOES.bach.nome
      },
      totais: {}, semestres: [], semestresValidos: null, parserVersion: "TESTE"
    },
    documentoDeOutraHabilitacao: false
  });
  historicoAssert_(resultados, "avaliarHabilitacao_ (reconciliação falhou) -> statusReconciliacao ERRO_ASSOCIACAO_DOCUMENTO", HISTORICO_STATUS_RECONCILIACAO.ERRO_ASSOCIACAO_DOCUMENTO, resultadoReconciliacaoFalhou.statusReconciliacao);
  historicoAssert_(resultados, "avaliarHabilitacao_ (reconciliação falhou) -> rulesetRevisao null", null, resultadoReconciliacaoFalhou.rulesetRevisao);

}

/*=====================================================
  GRUPO 11 — RODADA A: montagem pura dos valores de auditoria
  (ruleset_revisao, sem appendRow)

  Testa historicoMontarValoresAuditoria_ (HistoricoAuditoria.gs) —
  função PURA extraída nesta rodada — item 36 do escopo. Não abre
  planilha, não grava nada: só confere o objeto {coluna: valor}.

  RODADA B/C: a função ganhou um novo 2º parâmetro, sessaoAnaliseId
  (ver assinatura abaixo) — os testes já existentes foram atualizados
  pra passar esse argumento, e dois novos asserts cobrem o
  comportamento novo (valor presente -> gravado na coluna
  HISTORICO_COLUNA_SESSAO_ANALISE; ausente/null -> "" pelo MESMO
  padrão já usado em ruleset_revisao/ruleset_versao/ruleset_id acima).
=====================================================*/
function historicoTestesMontarValoresAuditoria_(resultados) {

  const registroFixture = { registroId: "REG-TESTE", versao: 5, nusp: "1234567", nome: "Fulano de Tal" };
  const arquivoInfoFixture = { id: "FILE-ID", nome: "historico.pdf", modificadoEm: "2026-01-01T00:00:00.000Z", hashSha256: "abc123" };
  const agoraFixture = new Date("2026-01-01T12:00:00.000Z");

  const resultadoMotorComRevisao4 = {
    habilitacao: "bach", rulesetId: "BAC-47012-100-V1", rulesetVersao: 1, rulesetRevisao: 4,
    rulesetEstruturaCurricular: "Estrutura X", parserVersion: "HistoricoParser-v1.0.0",
    statusReconciliacao: "OK", resultado: "APTO", motivos: [], detalhes: null,
    avisosParser: null, camposNaoReconhecidosParser: null
  };

  const valoresComRevisao = historicoMontarValoresAuditoria_(
    "uuid-teste", "sessao-uuid-teste", agoraFixture, registroFixture, resultadoMotorComRevisao4, HISTORICO_HABILITACOES.bach,
    arquivoInfoFixture, "{}", "{}"
  );
  historicoAssert_(resultados, "montarValoresAuditoria_: resultadoMotor.rulesetRevisao=4 produz ruleset_revisao=4 (item 36)", 4, valoresComRevisao.ruleset_revisao);
  historicoAssert_(resultados, "montarValoresAuditoria_: ruleset_id gravado corretamente", "BAC-47012-100-V1", valoresComRevisao.ruleset_id);
  historicoAssert_(resultados, "montarValoresAuditoria_: execucao_id gravado corretamente", "uuid-teste", valoresComRevisao.execucao_id);
  historicoAssert_(resultados, "montarValoresAuditoria_ (RODADA B/C): sessaoAnaliseId informado é gravado na coluna sessao_analise_id", "sessao-uuid-teste", valoresComRevisao[HISTORICO_COLUNA_SESSAO_ANALISE]);

  const resultadoMotorSemRuleset = Object.assign({}, resultadoMotorComRevisao4, { rulesetId: null, rulesetVersao: null, rulesetRevisao: null, rulesetEstruturaCurricular: null });
  const valoresSemRuleset = historicoMontarValoresAuditoria_(
    "uuid-teste-2", "sessao-uuid-teste-2", agoraFixture, registroFixture, resultadoMotorSemRuleset, HISTORICO_HABILITACOES.bach,
    arquivoInfoFixture, "{}", "{}"
  );
  historicoAssert_(resultados, "montarValoresAuditoria_: rulesetRevisao null (nenhum ruleset usado) -> ruleset_revisao='' (mesmo padrão de ruleset_versao/ruleset_id)", "", valoresSemRuleset.ruleset_revisao);

  const valoresSemSessao = historicoMontarValoresAuditoria_(
    "uuid-teste-3", null, agoraFixture, registroFixture, resultadoMotorComRevisao4, HISTORICO_HABILITACOES.bach,
    arquivoInfoFixture, "{}", "{}"
  );
  historicoAssert_(resultados, "montarValoresAuditoria_ (RODADA B/C): sessaoAnaliseId null -> sessao_analise_id='' (nunca grava null/undefined cru na planilha)", "", valoresSemSessao[HISTORICO_COLUNA_SESSAO_ANALISE]);

}

/*=====================================================
  GRUPO 12 — tipos de arquivo "Completo" (RODADA B/C.1, §2/§26: nunca
  mais fallback pra "Final" nem "Sujo")

  Histórico da string (ver comentário completo em HistoricoConfig.gs):
  RODADA A trocou "Final" -> "Sujo"; RODADA B/C reverteu "Sujo" ->
  "Final"; RODADA B/C.1 (esta correção de conformidade) troca de novo,
  "Final" -> "Completo" — por um motivo DIFERENTE do que motivou a
  troca da RODADA A: "Histórico Escolar Final USP" é OUTRO documento
  da Jupiter, também incompleto pra análise automática. O documento
  correto é "HISTÓRICO ESCOLAR COMPLETO". Este grupo foi RENOMEADO
  (era historicoTestesTiposArquivoFinal_) e seus asserts INVERTIDOS
  mais uma vez (nunca duplicados) — continua provando exatamente a
  mesma garantia de sempre ("nenhum fallback entre rótulos"), agora
  com "Completo" como único rótulo válido e "Final"/"Sujo" como os
  DOIS rótulos que nunca mais podem aparecer em runtime.
=====================================================*/
function historicoTestesTiposArquivoCompleto_(resultados) {

  historicoAssert_(resultados, "tipoArquivoInfos Psicólogo (RODADA B/C.1, §2)", "Histórico Escolar Completo USP (Psicólogo)", HISTORICO_HABILITACOES.psi.tipoArquivoInfos);
  historicoAssert_(resultados, "tipoArquivoInfos Bacharelado (RODADA B/C.1, §2)", "Histórico Escolar Completo USP (Bacharelado)", HISTORICO_HABILITACOES.bach.tipoArquivoInfos);
  historicoAssert_(resultados, "tipoArquivoInfos Licenciatura (RODADA B/C.1, §2)", "Histórico Escolar Completo USP (Licenciatura)", HISTORICO_HABILITACOES.lic.tipoArquivoInfos);

  // Confirma que nenhuma das 3 strings menciona mais "Final" nem
  // "Sujo" — e, por leitura direta de HistoricoArquivos.gs
  // (historicoLocalizarArquivo_), não existe ali NENHUM mecanismo de
  // fallback: o prefixo esperado é montado sempre a partir de
  // cfg.tipoArquivoInfos, sem tentar um segundo nome se o primeiro
  // não for encontrado.
  ["psi", "bach", "lic"].forEach(chave => {
    const valor = HISTORICO_HABILITACOES[chave].tipoArquivoInfos;
    historicoAssert_(resultados, `tipoArquivoInfos ${chave} não menciona mais "Final" (RODADA B/C.1, §2/§26)`, false, valor.indexOf("Final") !== -1);
    historicoAssert_(resultados, `tipoArquivoInfos ${chave} não menciona mais "Sujo" (RODADA B/C.1, §2/§26)`, false, valor.indexOf("Sujo") !== -1);
    historicoAssert_(resultados, `tipoArquivoInfos ${chave} menciona "Completo" (RODADA B/C.1, §2/§26)`, true, valor.indexOf("Completo") !== -1);
  });

}

/*=====================================================
  GRUPO 13 — versão do motor (RODADA A.1: v2.0.1)
=====================================================*/
function historicoTestesEngineVersion_(resultados) {

  // RODADA A.1: valor esperado atualizado de "HistoricoEngine-v2.0.0"
  // (RODADA A) para "HistoricoEngine-v2.0.1" — mudança de LÓGICA DE
  // DECISÃO sob concorrência (guarda de estabilidade do ruleset), não
  // de contrato de entrada/saída, por isso é um patch (x.x.1), não uma
  // versão maior. Nenhum outro assert deste grupo mudou.
  historicoAssert_(resultados, "HISTORICO_ENGINE_VERSION é HistoricoEngine-v2.0.1 (RODADA A.1 — guarda de estabilidade do ruleset)", "HistoricoEngine-v2.0.1", HISTORICO_ENGINE_VERSION);
  historicoAssert_(resultados, "HISTORICO_PARSER_VERSION não muda (parser sem alteração de lógica de extração)", "HistoricoParser-v1.0.0", HISTORICO_PARSER_VERSION);

}

/*=====================================================
  GRUPO 14 — RODADA A.1: núcleo puro da guarda de estabilidade do
  ruleset (AUDITORIA_REGRAS_CURRICULARES)

  Testa historicoResumirAuditoriaRulesetEmLista_ e
  historicoCompararGuardasRuleset_ (HistoricoRegrasRepository.gs) com
  fixtures 100% sintéticas — nunca contra a planilha real. A prova
  comportamental de que a LEITURA de verdade
  (historicoLerGuardaAuditoriaRuleset_) nunca pede a largura inteira
  da aba nem toca nas colunas de snapshot está no harness Node
  privado (espiando getRange), não aqui — ver README_TESTES.md. Os
  dois testes de defesa complementar por toString(), no fim deste
  grupo, não substituem aquela prova.

  RODADA A.1.1 (dois resíduos de fail-closed fechados nesta rodada,
  achados em auditoria independente do ZIP final da Rodada A.1):
  - ACHADO 1: além dos testes de sempre (que só chamam a função pura
    historicoResumirAuditoriaRulesetEmLista_ com arrays já "lidos"),
    este grupo passa a chamar historicoLerLinhasGuardaAuditoria_
    DIRETAMENTE também, com um fake mínimo de "aba" (só os 4 métodos
    que ela usa — getLastRow/getLastColumn/getRange/getValues, sem
    nenhuma dependência de SpreadsheetApp) — prova, dentro da própria
    suíte embarcada, que a validação do cabeçalho acontece MESMO
    quando getLastRow()==1 (zero linhas de dado), nunca só no harness
    Node privado. Ver historicoFixtureAbaGuardaAuditoria_ abaixo.
  - ACHADO 2: novos casos com ruleset_id vazio/nulo numa linha real —
    que antes desta rodada eram descartados em silêncio pelo filtro
    (String(null) nunca bate com um rulesetId de verdade) — agora
    invalidam a leitura inteira, fail-closed, independente de qual
    ruleset está sendo analisado. Uma linha de OUTRO ruleset com
    ruleset_id EXPLÍCITO continua seguramente ignorável mesmo
    malformada (comportamento já existente, preservado).
=====================================================*/

// Fixture de uma linha já "lida" da aba AUDITORIA_REGRAS_CURRICULARES
// (mesmo formato que historicoLerLinhasGuardaAuditoria_ devolve).
function historicoFixtureLinhaGuardaAuditoria_(overrides) {
  return Object.assign({
    auditoriaId: "AUD-0001",
    rulesetId: "BAC-47012-100-V1",
    estado: "CONFIRMADA"
  }, overrides || {});
}

// RODADA A.1.1 (Achado 1) — fake MÍNIMO de "aba" (Sheet), só com os 4
// métodos que historicoLerLinhasGuardaAuditoria_ realmente chama
// (getLastRow/getLastColumn/getRange(...).getValues()), pra poder
// testar a função de LEITURA de verdade aqui dentro da suíte
// embarcada, sem precisar de SpreadsheetApp nem tocar a planilha real.
// "grid": array 2D, linha 0 = cabeçalho (mesma convenção do harness
// Node privado). Uma aba totalmente vazia é grid=[] (getLastRow()=0,
// getLastColumn()=0).
function historicoFixtureAbaGuardaAuditoria_(grid) {
  return {
    getLastRow: function () { return grid.length; },
    getLastColumn: function () { return grid.length > 0 ? grid[0].length : 0; },
    getRange: function (row, col, numRows, numCols) {
      const valores = [];
      for (let r = 0; r < numRows; r++) {
        const linhaGrid = grid[row - 1 + r] || [];
        const linhaSaida = [];
        for (let c = 0; c < numCols; c++) {
          const v = linhaGrid[col - 1 + c];
          linhaSaida.push(v === undefined ? "" : v);
        }
        valores.push(linhaSaida);
      }
      return { getValues: function () { return valores; } };
    }
  };
}

function historicoTestesGuardaAuditoriaRuleset_(resultados) {

  // --- estado "sem nenhuma auditoria pra este ruleset" ---
  const resumoVazio = historicoResumirAuditoriaRulesetEmLista_([], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: lista vazia -> ok=true, temPreparada=false", true, resumoVazio.ok === true && resumoVazio.temPreparada === false);
  historicoAssert_(resultados, "guardaAuditoria: lista vazia -> quantidade=0, ultimaAuditoriaId=null, ultimoEstado=null", true,
    resumoVazio.quantidadeAuditorias === 0 && resumoVazio.ultimaAuditoriaId === null && resumoVazio.ultimoEstado === null);

  // --- uma CONFIRMADA isolada ---
  const resumoUmaConfirmada = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001", estado: "CONFIRMADA" })], "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "guardaAuditoria: 1 CONFIRMADA -> ok=true, temPreparada=false", true, resumoUmaConfirmada.ok === true && resumoUmaConfirmada.temPreparada === false);
  historicoAssert_(resultados, "guardaAuditoria: 1 CONFIRMADA -> quantidade=1, ultimaAuditoriaId/ultimoEstado corretos", true,
    resumoUmaConfirmada.quantidadeAuditorias === 1 && resumoUmaConfirmada.ultimaAuditoriaId === "AUD-0001" && resumoUmaConfirmada.ultimoEstado === "CONFIRMADA");

  // --- várias CONFIRMADAs -> pega a ÚLTIMA por ORDEM FÍSICA, nunca a primeira nem por data ---
  const resumoVarias = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0002" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0003" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: 3 CONFIRMADAs -> quantidade=3", 3, resumoVarias.quantidadeAuditorias);
  historicoAssert_(resultados, "guardaAuditoria: 3 CONFIRMADAs -> ultimaAuditoriaId é a ÚLTIMA da lista (AUD-0003)", "AUD-0003", resumoVarias.ultimaAuditoriaId);

  // --- linhas de OUTRO ruleset excluídas do resumo (filtro por ruleset_id, mandatório) ---
  const resumoFiltrado = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-X1", rulesetId: "PSI-47012-0-V1" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001", rulesetId: "BAC-47012-100-V1" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-X2", rulesetId: "PSI-47012-0-V1" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: linhas de OUTRO ruleset (PSI) não contam pro resumo do BAC", true,
    resumoFiltrado.quantidadeAuditorias === 1 && resumoFiltrado.ultimaAuditoriaId === "AUD-0001");

  // --- PREPARADA do MESMO ruleset -> temPreparada=true ---
  const resumoComPreparada = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001", estado: "CONFIRMADA" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0002", estado: "PREPARADA" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: existe PREPARADA do mesmo ruleset -> temPreparada=true", true, resumoComPreparada.temPreparada);

  // --- PREPARADA ÓRFÃ: mesmo com uma CONFIRMADA posterior (de outro
  // auditoria_id), a PREPARADA continua contando -> nunca ignorada silenciosamente. ---
  const resumoPreparadaOrfa = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001", estado: "PREPARADA" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0002", estado: "CONFIRMADA" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: PREPARADA órfã (com CONFIRMADA posterior de outro auditoria_id) -> temPreparada AINDA true", true, resumoPreparadaOrfa.temPreparada);

  // --- Integridade (RODADA A.1, ajuste 2): linha do ruleset ANALISADO com auditoria_id vazio -> fail-closed ---
  const resumoAuditoriaIdVazio = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: null })], "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "guardaAuditoria: linha do ruleset analisado com auditoria_id vazio -> ok=false (fail-closed)", false, resumoAuditoriaIdVazio.ok);
  historicoAssert_(resultados, "guardaAuditoria: auditoria_id vazio -> motivo explicado (nunca string vazia)", true,
    typeof resumoAuditoriaIdVazio.motivo === "string" && resumoAuditoriaIdVazio.motivo.length > 0);

  // --- estado vazio -> fail-closed ---
  const resumoEstadoVazio = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ estado: null })], "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "guardaAuditoria: linha do ruleset analisado com estado vazio -> ok=false (fail-closed)", false, resumoEstadoVazio.ok);

  // --- estado desconhecido/malformado (fora de PREPARADA/CONFIRMADA/FALHOU) -> fail-closed ---
  const resumoEstadoDesconhecido = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ estado: "XPTO_INEXISTENTE" })], "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "guardaAuditoria: linha do ruleset analisado com estado desconhecido -> ok=false (fail-closed)", false, resumoEstadoDesconhecido.ok);

  // --- linha malformada de OUTRO ruleset NÃO bloqueia o ruleset analisado
  // (desde que dê pra saber com segurança que ela pertence ao outro ruleset — o filtro por ruleset_id garante isso) ---
  const resumoMalformadaDeOutro = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: null, rulesetId: "PSI-47012-0-V1" }), // malformada, mas é do PSI
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-0001", rulesetId: "BAC-47012-100-V1" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: linha malformada de OUTRO ruleset não bloqueia o ruleset analisado", true,
    resumoMalformadaDeOutro.ok === true && resumoMalformadaDeOutro.quantidadeAuditorias === 1);

  // --- auditoria_id duplicado no MESMO ruleset -> inconsistência, fail-closed (ajuste 2, desejável) ---
  const resumoIdDuplicado = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-DUP", estado: "CONFIRMADA" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-DUP", estado: "FALHOU" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "guardaAuditoria: auditoria_id duplicado no mesmo ruleset -> ok=false (inconsistência)", false, resumoIdDuplicado.ok);

  // --- comparador: nada mudou entre antes/depois -> estável ---
  const guardaBase = { ok: true, rulesetId: "BAC-47012-100-V1", temPreparada: false, quantidadeAuditorias: 2, ultimaAuditoriaId: "AUD-0002", ultimoEstado: "CONFIRMADA" };
  const comparacaoEstavel = historicoCompararGuardasRuleset_(guardaBase, Object.assign({}, guardaBase));
  historicoAssert_(resultados, "compararGuardas: nada mudou entre antes/depois -> estavel=true", true, comparacaoEstavel.estavel);

  // --- comparador: ultimaAuditoriaId mudou — O CENÁRIO CRÍTICO desta rodada:
  // uma correção PREPARADA -> FALHOU que nunca chega a mudar "revisao" ainda
  // assim muda o watermark (nova linha FALHOU apareceu) -> instável. ---
  const guardaDepoisComFalhou = Object.assign({}, guardaBase, { quantidadeAuditorias: 3, ultimaAuditoriaId: "AUD-0003", ultimoEstado: "FALHOU" });
  const comparacaoFalhou = historicoCompararGuardasRuleset_(guardaBase, guardaDepoisComFalhou);
  historicoAssert_(resultados, "compararGuardas: ultimaAuditoriaId mudou (cenário crítico: PREPARADA->FALHOU sem mudar revisao) -> estavel=false", false, comparacaoFalhou.estavel);
  historicoAssert_(resultados, "compararGuardas: motivo explicado quando instável (nunca string vazia)", true,
    typeof comparacaoFalhou.motivo === "string" && comparacaoFalhou.motivo.length > 0);

  // --- comparador: quantidade mudou mesmo com ultimaAuditoriaId igual (defesa secundária, hipotético) -> instável ---
  const comparacaoQuantidade = historicoCompararGuardasRuleset_(guardaBase, Object.assign({}, guardaBase, { quantidadeAuditorias: 3 }));
  historicoAssert_(resultados, "compararGuardas: quantidadeAuditorias mudou (defesa secundária) -> estavel=false mesmo com ultimaAuditoriaId igual", false, comparacaoQuantidade.estavel);

  // --- defesa COMPLEMENTAR (ajuste 3 — não é prova suficiente sozinha,
  // a prova comportamental de verdade é o spy de getRange no harness
  // Node privado): o código-fonte de historicoLerGuardaAuditoriaRuleset_
  // nunca menciona as colunas de snapshot nem chama historicoLerTabela_
  // (que leria a largura inteira da aba). ---
  const fonteLeituraGuarda = historicoLerGuardaAuditoriaRuleset_.toString();
  historicoAssert_(resultados, "guardaAuditoria (defesa complementar via toString): código-fonte não menciona snapshot_antes_json/snapshot_depois_json", false,
    fonteLeituraGuarda.indexOf("snapshot_antes_json") !== -1 || fonteLeituraGuarda.indexOf("snapshot_depois_json") !== -1);
  historicoAssert_(resultados, "guardaAuditoria (defesa complementar via toString): código-fonte não chama historicoLerTabela_ (leria a aba inteira)", false,
    fonteLeituraGuarda.indexOf("historicoLerTabela_") !== -1);

  /*=====================================================
    RODADA A.1.1 — ACHADO 1: validação de cabeçalho SEMPRE acontece em
    historicoLerLinhasGuardaAuditoria_, mesmo com getLastRow()==1 (zero
    linhas de dado) — via o fake mínimo de aba acima, chamando a função
    de leitura DIRETAMENTE (não só a pura historicoResumirAuditoriaRulesetEmLista_).
  =====================================================*/

  // --- caso A: aba com cabeçalho CORRETO e zero linhas de dado -> continua situação válida ---
  const achado1AbaValidaZeroLinhas = historicoFixtureAbaGuardaAuditoria_([
    ["auditoria_id", "ruleset_id", "estado"]
  ]);
  const achado1LinhasCasoA = historicoLerLinhasGuardaAuditoria_(achado1AbaValidaZeroLinhas);
  historicoAssert_(resultados, "ACHADO 1 (caso A): aba com cabeçalho correto e zero linhas de dado -> historicoLerLinhasGuardaAuditoria_ devolve lista vazia (situação válida)", 0, achado1LinhasCasoA.length);
  const achado1ResumoCasoA = historicoResumirAuditoriaRulesetEmLista_(achado1LinhasCasoA, "BAC-47012-100-V1");
  historicoAssert_(resultados, "ACHADO 1 (caso A): resumo dessa leitura -> ok=true, quantidade=0, temPreparada=false, ultimaAuditoriaId=null", true,
    achado1ResumoCasoA.ok === true && achado1ResumoCasoA.quantidadeAuditorias === 0 && achado1ResumoCasoA.temPreparada === false && achado1ResumoCasoA.ultimaAuditoriaId === null);

  // --- regressão: cabeçalho correto e 2 linhas de dado reais -> a reordenação não quebrou o caminho normal ---
  const achado1AbaComLinhas = historicoFixtureAbaGuardaAuditoria_([
    ["auditoria_id", "ruleset_id", "estado"],
    ["AUD-1000", "BAC-47012-100-V1", "CONFIRMADA"],
    ["AUD-1001", "PSI-47012-0-V1", "PREPARADA"]
  ]);
  const achado1LinhasRegressao = historicoLerLinhasGuardaAuditoria_(achado1AbaComLinhas);
  historicoAssert_(resultados, "ACHADO 1 (regressão): aba com cabeçalho correto e 2 linhas de dado reais -> lê as 2 linhas corretamente, sem trocar coluna", true,
    achado1LinhasRegressao.length === 2 &&
    achado1LinhasRegressao[0].auditoriaId === "AUD-1000" && achado1LinhasRegressao[0].rulesetId === "BAC-47012-100-V1" && achado1LinhasRegressao[0].estado === "CONFIRMADA" &&
    achado1LinhasRegressao[1].auditoriaId === "AUD-1001" && achado1LinhasRegressao[1].rulesetId === "PSI-47012-0-V1" && achado1LinhasRegressao[1].estado === "PREPARADA");

  // --- caso B: aba SEM a coluna "estado" e ZERO linhas de dado -> antes desta rodada isso passava
  // silenciosamente como guarda vazia (o bug do Achado 1); agora tem que falhar fechado mesmo assim ---
  const achado1AbaSemEstadoZeroLinhas = historicoFixtureAbaGuardaAuditoria_([
    ["auditoria_id", "ruleset_id"]
  ]);
  let achado1ErroCasoB = null;
  try { historicoLerLinhasGuardaAuditoria_(achado1AbaSemEstadoZeroLinhas); } catch (err) { achado1ErroCasoB = err; }
  historicoAssert_(resultados, "ACHADO 1 (caso B): aba sem a coluna \"estado\" e zero linhas de dado -> lança erro (fail-closed), nunca [] silencioso", true, achado1ErroCasoB !== null);

  // --- caso C: aba com cabeçalho totalmente errado ("foo"/"bar") e zero linhas de dado -> fail-closed ---
  const achado1AbaHeaderErrado = historicoFixtureAbaGuardaAuditoria_([["foo", "bar"]]);
  let achado1ErroCasoC = null;
  try { historicoLerLinhasGuardaAuditoria_(achado1AbaHeaderErrado); } catch (err) { achado1ErroCasoC = err; }
  historicoAssert_(resultados, "ACHADO 1 (caso C): aba com cabeçalho totalmente errado (\"foo\"/\"bar\") e zero linhas de dado -> lança erro (fail-closed)", true, achado1ErroCasoC !== null);

  // --- caso D: aba sem nenhum cabeçalho (lastColumn=0, aba completamente em branco) -> fail-closed ---
  const achado1AbaSemCabecalho = historicoFixtureAbaGuardaAuditoria_([]);
  let achado1ErroCasoD = null;
  try { historicoLerLinhasGuardaAuditoria_(achado1AbaSemCabecalho); } catch (err) { achado1ErroCasoD = err; }
  historicoAssert_(resultados, "ACHADO 1 (caso D): aba sem nenhum cabeçalho (getLastColumn()=0) -> lança erro (fail-closed), nunca assume \"auditoria vazia válida\"", true, achado1ErroCasoD !== null);

  /*=====================================================
    RODADA A.1.1 — ACHADO 2: ruleset_id vazio/nulo numa linha REAL
    invalida a leitura inteira (fail-closed global), diferente de uma
    linha com ruleset_id EXPLÍCITO e diferente (essa continua
    seguramente ignorável). Todos os 8 casos pedidos, testados contra
    a função pura historicoResumirAuditoriaRulesetEmLista_.
  =====================================================*/

  // --- caso A: linha válida do ruleset alvo -> ok, entra na contagem ---
  const achado2CasoA = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-A", rulesetId: "BAC-47012-100-V1", estado: "CONFIRMADA" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso A): linha válida do ruleset alvo -> ok=true, quantidade=1", true, achado2CasoA.ok === true && achado2CasoA.quantidadeAuditorias === 1);

  // --- caso B: linha válida de OUTRO ruleset (explícito) -> ignorada ---
  const achado2CasoB = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-B", rulesetId: "PSI-47012-0-V1", estado: "CONFIRMADA" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso B): linha válida de OUTRO ruleset (ruleset_id explícito) -> ignorada, ok=true, quantidade=0", true, achado2CasoB.ok === true && achado2CasoB.quantidadeAuditorias === 0);

  // --- caso C: linha de OUTRO ruleset com auditoria_id vazio -> ainda ignorada com segurança ---
  const achado2CasoC = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: null, rulesetId: "PSI-47012-0-V1", estado: "CONFIRMADA" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso C): linha de OUTRO ruleset com auditoria_id vazio -> ainda ignorada (ruleset_id explícito identifica o dono)", true, achado2CasoC.ok === true && achado2CasoC.quantidadeAuditorias === 0);

  // --- caso D: linha de OUTRO ruleset com estado inválido -> ainda ignorada com segurança ---
  const achado2CasoD = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-D", rulesetId: "PSI-47012-0-V1", estado: "XPTO_INVALIDO" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso D): linha de OUTRO ruleset com estado inválido -> ainda ignorada (mesmo motivo do caso C)", true, achado2CasoD.ok === true && achado2CasoD.quantidadeAuditorias === 0);

  // --- caso E: ruleset_id vazio ("") + auditoria_id preenchido -> ok=false ---
  const achado2CasoE = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-E", rulesetId: "", estado: "CONFIRMADA" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso E): linha com ruleset_id vazio (\"\") + auditoria_id preenchido -> ok=false (fail-closed)", false, achado2CasoE.ok);

  // --- caso F: ruleset_id null + estado PREPARADA -> ok=false (mesmo sendo PREPARADA) ---
  const achado2CasoF = historicoResumirAuditoriaRulesetEmLista_(
    [historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-F", rulesetId: null, estado: "PREPARADA" })],
    "BAC-47012-100-V1"
  );
  historicoAssert_(resultados, "ACHADO 2 (caso F): linha com ruleset_id null + estado PREPARADA -> ok=false (fail-closed)", false, achado2CasoF.ok);

  // --- caso G: linha completamente vazia entre linhas reais do ruleset alvo -> ok=false, sem heurística especial ---
  const achado2CasoG = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-G1", rulesetId: "BAC-47012-100-V1", estado: "CONFIRMADA" }),
    { auditoriaId: null, rulesetId: null, estado: null },
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-G2", rulesetId: "BAC-47012-100-V1", estado: "CONFIRMADA" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "ACHADO 2 (caso G): linha completamente vazia entre linhas reais -> ok=false (tratada como inconsistência real)", false, achado2CasoG.ok);

  // --- caso H: mistura de 1 linha válida do alvo + 1 linha com ruleset_id vazio -> resultado GLOBAL ok=false ---
  const achado2CasoH = historicoResumirAuditoriaRulesetEmLista_([
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-H1", rulesetId: "BAC-47012-100-V1", estado: "CONFIRMADA" }),
    historicoFixtureLinhaGuardaAuditoria_({ auditoriaId: "AUD-H2", rulesetId: "", estado: "CONFIRMADA" })
  ], "BAC-47012-100-V1");
  historicoAssert_(resultados, "ACHADO 2 (caso H): mistura de 1 linha válida do alvo + 1 linha com ruleset_id vazio -> resultado GLOBAL ok=false (a linha boa não \"salva\" a leitura)", false, achado2CasoH.ok);

}

/*=====================================================
  GRUPO 15 — RODADA A.1: invariante de rastreabilidade
  (rulesetRevisao !== null  <=>  pacote estável efetivamente utilizado)

  Testa os helpers puros historicoMontarResultadoGuardaInstavel_ e
  historicoDescreverRulesetCandidato_ (HistoricoMotor.gs) isoladamente,
  sem rodar o motor inteiro nem tocar em planilha. O lado "positivo" do
  invariante (execução estável preserva rulesetId/rulesetVersao/
  rulesetRevisao/rulesetEstruturaCurricular) já está coberto pelo
  GRUPO 7 (Integração ponta-a-ponta com ruleset real). A prova de que
  historicoAvaliarHabilitacao_ de fato CHAMA estes helpers na ordem
  certa (guarda antes -> pacote -> revalidação -> guarda depois) está
  no harness Node privado (ver README_TESTES.md).
=====================================================*/
function historicoTestesInvarianteRastreabilidadeGuarda_(resultados) {

  const rulesetFixture = { rulesetId: "BAC-47012-100-V1", versao: 1, revisao: 4, estruturaCurricular: "Estrutura X" };

  ["RULESET_EM_CORRECAO", "RULESET_AUDITORIA_INDISPONIVEL", "RULESET_MUDOU_DURANTE_ANALISE"].forEach(tipoMotivo => {

    const mensagem = "Motivo de teste. " + historicoDescreverRulesetCandidato_(rulesetFixture);
    const resultado = historicoMontarResultadoGuardaInstavel_(
      "bach", HISTORICO_STATUS_RECONCILIACAO.OK, tipoMotivo, mensagem,
      { avisos: [], camposNaoReconhecidos: [], parserVersion: "TESTE" }
    );

    historicoAssert_(resultados, `montarResultadoGuardaInstavel_ (${tipoMotivo}): resultado=CONFERIR`, HISTORICO_RESULTADO.CONFERIR, resultado.resultado);
    historicoAssert_(resultados,
      `montarResultadoGuardaInstavel_ (${tipoMotivo}): rulesetId/rulesetVersao/rulesetRevisao/rulesetEstruturaCurricular TODOS null (invariante — candidato identificado não é "uso confirmado")`,
      true,
      resultado.rulesetId === null && resultado.rulesetVersao === null && resultado.rulesetRevisao === null && resultado.rulesetEstruturaCurricular === null
    );
    historicoAssert_(resultados, `montarResultadoGuardaInstavel_ (${tipoMotivo}): motivos[0].tipo bate com o pedido`, tipoMotivo, resultado.motivos[0].tipo);
    historicoAssert_(resultados,
      `montarResultadoGuardaInstavel_ (${tipoMotivo}): identificação do candidato preservada na MENSAGEM (nunca perdida, mesmo com os campos formais null)`,
      true,
      resultado.motivos[0].mensagem.indexOf("BAC-47012-100-V1") !== -1 && resultado.motivos[0].mensagem.indexOf("revisão observada inicialmente: 4") !== -1
    );

  });

  historicoAssert_(resultados, "descreverRulesetCandidato_: ruleset null -> string vazia (nunca lança erro)", "", historicoDescreverRulesetCandidato_(null));

}

/*=====================================================
  GRUPO 16 — RODADA B/C: novos helpers puros de
  HistoricoConfig.gs (validação de formato de UUID de sessão +
  tradução habilitacao_codigo -> chave)

  historicoValidarFormatoUuid_ e historicoChavePorHabilitacaoCodigo_
  não leem planilha nenhuma — testados aqui com fixtures 100%
  sintéticas, igual ao resto deste arquivo.
=====================================================*/
function historicoTestesConfigRodadaBC_(resultados) {

  // --- historicoValidarFormatoUuid_ ---

  let erroUuidValido = null;
  try { historicoValidarFormatoUuid_("550e8400-e29b-41d4-a716-446655440000", "Teste"); } catch (err) { erroUuidValido = err; }
  historicoAssert_(resultados, "validarFormatoUuid_: UUID bem formado não lança erro", null, erroUuidValido);

  [
    ["string vazia", ""],
    ["null", null],
    ["undefined", undefined],
    ["texto qualquer, sem formato de UUID", "abc"],
    ["quase-UUID com um dígito faltando no último grupo", "550e8400-e29b-41d4-a716-44665544000"],
    ["quase-UUID com um traço faltando", "550e8400e29b-41d4-a716-446655440000"],
    ["número, não string (nunca faz coerção pra string antes de validar)", 12345]
  ].forEach(par => {
    const descricao = par[0];
    const valor = par[1];
    let erro = null;
    try { historicoValidarFormatoUuid_(valor, "Identificador de teste"); } catch (err) { erro = err; }
    historicoAssert_(resultados, `validarFormatoUuid_: ${descricao} -> lança erro (fail-closed)`, true, erro !== null);
  });

  let erroComRotulo = null;
  try { historicoValidarFormatoUuid_("invalido", "Identificador de sessão de análise"); } catch (err) { erroComRotulo = err; }
  historicoAssert_(resultados,
    "validarFormatoUuid_: mensagem de erro usa o RÓTULO recebido (nunca uma mensagem genérica fixa, pra não confundir sessão com Registro ID)",
    true,
    erroComRotulo !== null && erroComRotulo.message.indexOf("Identificador de sessão de análise") !== -1
  );

  // --- historicoChavePorHabilitacaoCodigo_ ---

  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: \"0\" -> \"psi\"", "psi", historicoChavePorHabilitacaoCodigo_("0"));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: \"100\" -> \"bach\"", "bach", historicoChavePorHabilitacaoCodigo_("100"));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: \"200\" -> \"lic\"", "lic", historicoChavePorHabilitacaoCodigo_("200"));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: código desconhecido -> null (nunca lança erro — uma linha antiga/corrompida não pode derrubar a reconstrução)", null, historicoChavePorHabilitacaoCodigo_("999-nao-existe"));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: null -> null", null, historicoChavePorHabilitacaoCodigo_(null));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: undefined -> null", null, historicoChavePorHabilitacaoCodigo_(undefined));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: string vazia -> null", null, historicoChavePorHabilitacaoCodigo_(""));
  historicoAssert_(resultados, "chavePorHabilitacaoCodigo_: espaços ao redor são removidos antes de comparar (\" 100 \" -> \"bach\")", "bach", historicoChavePorHabilitacaoCodigo_(" 100 "));

}

/*=====================================================
  GRUPO 17 — RODADA B/C: coluna de sessão (leitura pura de cabeçalho)
  + checagem de CONSISTÊNCIA de sessão (HistoricoAuditoria.gs)

  historicoColunaSessaoAnaliseExiste_ é a parte PURA e só-leitura da
  migração migrarAnaliseHistoricoRelatoriosV1 (a escrita de verdade
  fica fora desta suíte — ver cabeçalho do arquivo). Reaproveita o
  MESMO fake mínimo de "aba" já usado no GRUPO 14
  (historicoFixtureAbaGuardaAuditoria_) — nenhuma fixture nova
  precisou ser criada, já que os dois só chamam getLastColumn/
  getRange(...).getValues().

  historicoValidarConsistenciaSessao_ recebe "cabecalhos" já como
  parâmetro (nunca lê a linha 1 sozinha — quem já leu é o chamador,
  historicoRegistrarAuditoria_) — por isso os testes abaixo passam um
  array de cabecalhos INVENTADO e um "grid" de dados coerente com ele,
  sem precisar simular a aba inteira de 26 colunas reais.
=====================================================*/
function historicoTestesSessaoAnaliseConsistencia_(resultados) {

  // --- historicoColunaSessaoAnaliseExiste_ ---

  historicoAssert_(resultados, "colunaSessaoAnaliseExiste_: coluna presente no cabeçalho -> true", true,
    historicoColunaSessaoAnaliseExiste_(historicoFixtureAbaGuardaAuditoria_([["execucao_id", HISTORICO_COLUNA_SESSAO_ANALISE, "resultado"]])));
  historicoAssert_(resultados, "colunaSessaoAnaliseExiste_: coluna ausente do cabeçalho -> false", false,
    historicoColunaSessaoAnaliseExiste_(historicoFixtureAbaGuardaAuditoria_([["execucao_id", "resultado"]])));
  historicoAssert_(resultados, "colunaSessaoAnaliseExiste_: aba completamente vazia (getLastColumn()=0) -> false (nunca lança erro)", false,
    historicoColunaSessaoAnaliseExiste_(historicoFixtureAbaGuardaAuditoria_([])));

  // --- historicoValidarConsistenciaSessao_ ---

  const CABECALHOS_TESTE_SESSAO = ["execucao_id", "registro_id", HISTORICO_COLUNA_SESSAO_ANALISE, "resultado"];

  const abaZeroLinhas = historicoFixtureAbaGuardaAuditoria_([CABECALHOS_TESTE_SESSAO]);
  let erroZeroLinhas = null;
  try { historicoValidarConsistenciaSessao_(abaZeroLinhas, CABECALHOS_TESTE_SESSAO, "SESSAO-A", "REG-A"); } catch (err) { erroZeroLinhas = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: aba sem nenhuma linha de dado -> não lança erro (primeira gravação da sessão)", null, erroZeroLinhas);

  const abaOutraSessao = historicoFixtureAbaGuardaAuditoria_([
    CABECALHOS_TESTE_SESSAO,
    ["EXEC-1", "REG-X", "SESSAO-OUTRA", "APTO"]
  ]);
  let erroOutraSessao = null;
  try { historicoValidarConsistenciaSessao_(abaOutraSessao, CABECALHOS_TESTE_SESSAO, "SESSAO-A", "REG-A"); } catch (err) { erroOutraSessao = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: linha existente de OUTRA sessão (de outro registro) -> irrelevante aqui, não lança erro", null, erroOutraSessao);

  const abaLegado = historicoFixtureAbaGuardaAuditoria_([
    CABECALHOS_TESTE_SESSAO,
    ["EXEC-LEGADO", "REG-A", "", "APTO"]
  ]);
  let erroLegado = null;
  try { historicoValidarConsistenciaSessao_(abaLegado, CABECALHOS_TESTE_SESSAO, "SESSAO-A", "REG-A"); } catch (err) { erroLegado = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: linha \"legado\" (sessao_analise_id vazio, pré-migração) nunca conflita com sessão nenhuma", null, erroLegado);

  const abaMesmaSessaoMesmoRegistro = historicoFixtureAbaGuardaAuditoria_([
    CABECALHOS_TESTE_SESSAO,
    ["EXEC-PSI", "REG-A", "SESSAO-A", "APTO"]
  ]);
  let erroMesmoRegistro = null;
  try { historicoValidarConsistenciaSessao_(abaMesmaSessaoMesmoRegistro, CABECALHOS_TESTE_SESSAO, "SESSAO-A", "REG-A"); } catch (err) { erroMesmoRegistro = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: 2ª linha da MESMA sessão + MESMO registro (ex.: Psi já gravado, gravando Bach agora) -> não lança erro", null, erroMesmoRegistro);

  const abaMesmaSessaoOutroRegistro = historicoFixtureAbaGuardaAuditoria_([
    CABECALHOS_TESTE_SESSAO,
    ["EXEC-OUTRO-ALUNO", "REG-B", "SESSAO-A", "APTO"]
  ]);
  let erroOutroRegistro = null;
  try { historicoValidarConsistenciaSessao_(abaMesmaSessaoOutroRegistro, CABECALHOS_TESTE_SESSAO, "SESSAO-A", "REG-A"); } catch (err) { erroOutroRegistro = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: MESMO sessaoAnaliseId já gravado para OUTRO registro -> lança erro (fail-closed, nunca corrompe o agrupamento)", true, erroOutroRegistro !== null);
  historicoAssert_(resultados, "validarConsistenciaSessao_: mensagem de erro menciona os dois Registro IDs envolvidos (o já gravado e o desta gravação)", true,
    erroOutroRegistro !== null && erroOutroRegistro.message.indexOf("REG-B") !== -1 && erroOutroRegistro.message.indexOf("REG-A") !== -1);

  const cabecalhosSemColunaSessao = ["execucao_id", "registro_id", "resultado"];
  const abaSemColunaSessao = historicoFixtureAbaGuardaAuditoria_([cabecalhosSemColunaSessao]);
  let erroSemColuna = null;
  try { historicoValidarConsistenciaSessao_(abaSemColunaSessao, cabecalhosSemColunaSessao, "SESSAO-A", "REG-A"); } catch (err) { erroSemColuna = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: cabeçalho sem a coluna \"sessao_analise_id\" (migração não rodada) -> lança erro claro (fail-closed)", true,
    erroSemColuna !== null && erroSemColuna.message.indexOf(HISTORICO_COLUNA_SESSAO_ANALISE) !== -1);

  const cabecalhosSemColunasNenhuma = ["execucao_id", "resultado"];
  const abaSemColunasNenhuma = historicoFixtureAbaGuardaAuditoria_([cabecalhosSemColunasNenhuma]);
  let erroSemColunasNenhuma = null;
  try { historicoValidarConsistenciaSessao_(abaSemColunasNenhuma, cabecalhosSemColunasNenhuma, "SESSAO-A", "REG-A"); } catch (err) { erroSemColunasNenhuma = err; }
  historicoAssert_(resultados, "validarConsistenciaSessao_: cabeçalho sem \"registro_id\" NEM \"sessao_analise_id\" -> mensagem de erro lista as DUAS colunas faltando", true,
    erroSemColunasNenhuma !== null && erroSemColunasNenhuma.message.indexOf("registro_id") !== -1 && erroSemColunasNenhuma.message.indexOf(HISTORICO_COLUNA_SESSAO_ANALISE) !== -1);

}

/*=====================================================
  GRUPO 18 — RODADA B/C, FASE B2: HistoricoConsultas.gs — leitura
  persistida (agrupamento em sessões + reconstrução do formato ao
  vivo + degradação graciosa de motivos_json corrompido/truncado)

  Tudo neste grupo é PURO — nenhuma função aqui toca planilha (as
  únicas 3 que tocam, os 3 endpoints públicos no fim de
  HistoricoConsultas.gs, ficam de fora desta suíte pelo mesmo motivo
  de sempre: dependem de ANALISE_HISTORICO de verdade — ver cabeçalho
  deste arquivo e o de HistoricoConsultas.gs).
=====================================================*/

// Fixture de uma linha já "lida" de ANALISE_HISTORICO (mesmo formato
// {cabecalho: valor} que historicoLerTabela_ devolve) — as 26 colunas
// reais, com valores sintéticos plausíveis pro caminho "tudo certo".
function historicoFixtureLinhaAuditoria_(overrides) {
  return Object.assign({
    execucao_id: "EXEC-0001",
    sessao_analise_id: "SESSAO-0001",
    analisado_em: new Date("2026-01-01T12:00:00.000Z"),
    registro_id: "REG-TESTE",
    versao_registro: 5,
    nusp: "1234567",
    nome: "Fulano de Tal",
    habilitacao_codigo: "0",
    ruleset_id: "PSI-47012-0-V1",
    ruleset_versao: 1,
    ruleset_revisao: 2,
    estrutura_curricular: "Estrutura X",
    parser_version: "HistoricoParser-v1.0.0",
    engine_version: "HistoricoEngine-v2.0.1",
    arquivo_id: "FILE-ID",
    arquivo_nome: "historico.pdf",
    arquivo_modificado_em: new Date("2026-01-01T00:00:00.000Z"),
    hash_sha256: "abc123",
    status_reconciliacao: "OK",
    resultado: "APTO",
    motivos_json: JSON.stringify({
      motivos: [{ tipo: "OK", criterio: null, mensagem: "Tudo certo.", severidade: "INFO" }],
      detalhes: { algumCampo: 1 },
      parecerTexto: "Parecer de teste.",
      avisosParser: null,
      camposNaoReconhecidosParser: null
    }),
    dados_extraidos_json: "{}"
  }, overrides || {});
}

function historicoTestesConsultasSessao_(resultados) {

  // --- historicoDataAuditoriaParaIso_ ---

  historicoAssert_(resultados, "dataAuditoriaParaIso_: objeto Date válido -> ISO 8601", "2026-01-01T12:00:00.000Z",
    historicoDataAuditoriaParaIso_(new Date("2026-01-01T12:00:00.000Z")));
  historicoAssert_(resultados, "dataAuditoriaParaIso_: string de data válida -> ISO 8601", "2026-01-01T12:00:00.000Z",
    historicoDataAuditoriaParaIso_("2026-01-01T12:00:00.000Z"));
  historicoAssert_(resultados, "dataAuditoriaParaIso_: célula vazia (\"\") -> null (nunca lança erro)", null, historicoDataAuditoriaParaIso_(""));
  historicoAssert_(resultados, "dataAuditoriaParaIso_: null -> null", null, historicoDataAuditoriaParaIso_(null));
  historicoAssert_(resultados, "dataAuditoriaParaIso_: texto que não é data nenhuma -> null (nunca lança erro)", null, historicoDataAuditoriaParaIso_("não é uma data"));

  // --- historicoParsearMotivosJsonSeguro_ ---

  const jsonValido = JSON.stringify({ motivos: [{ tipo: "X" }], detalhes: { a: 1 }, parecerTexto: "Ok.", avisosParser: ["a"], camposNaoReconhecidosParser: ["b"] });
  const parseadoValido = historicoParsearMotivosJsonSeguro_(jsonValido);
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: JSON válido -> corrompido=false", false, parseadoValido.corrompido);
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: JSON válido -> parecerTexto preservado", "Ok.", parseadoValido.parecerTexto);
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: JSON válido -> motivos[0].tipo preservado", "X", parseadoValido.motivos[0].tipo);

  const parseadoVazio = historicoParsearMotivosJsonSeguro_("");
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: célula vazia -> corrompido=false, motivos=[] (nunca lança erro)", true,
    parseadoVazio.corrompido === false && Array.isArray(parseadoVazio.motivos) && parseadoVazio.motivos.length === 0);

  const parseadoTruncado = historicoParsearMotivosJsonSeguro_("[TRUNCADO — excedeu 45000 caracteres...] {\"motivos\":[{\"tipo\":");
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: marcador de truncamento -> corrompido=true", true, parseadoTruncado.corrompido);
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: marcador de truncamento -> motivoCorrompido menciona \"truncad\"", true,
    parseadoTruncado.motivoCorrompido.toLowerCase().indexOf("truncad") !== -1);

  const parseadoJsonInvalido = historicoParsearMotivosJsonSeguro_("{isto nao e json valido");
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: JSON malformado -> corrompido=true (nunca lança erro pro chamador)", true, parseadoJsonInvalido.corrompido);

  const parseadoFormatoErrado = historicoParsearMotivosJsonSeguro_("[1,2,3]");
  historicoAssert_(resultados, "parsearMotivosJsonSeguro_: JSON válido mas é um array, não objeto -> corrompido=true", true, parseadoFormatoErrado.corrompido);

  // --- historicoReconstruirResultadoDeLinha_ ---

  const linhaOk = historicoFixtureLinhaAuditoria_({});
  const reconstruidoOk = historicoReconstruirResultadoDeLinha_(linhaOk);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: habilitacao_codigo \"0\" -> habilitacao=\"psi\"", "psi", reconstruidoOk.habilitacao);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: resultado preservado", "APTO", reconstruidoOk.resultado);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: parecerTexto vindo de motivos_json", "Parecer de teste.", reconstruidoOk.parecerTexto);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: rulesetVersao numérico preservado (nunca string)", 1, reconstruidoOk.rulesetVersao);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: rulesetRevisao numérico preservado (nunca string)", 2, reconstruidoOk.rulesetRevisao);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: auditoriaGravada sempre true (a linha já existe)", true, reconstruidoOk.auditoriaGravada);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: avisoAuditoria sempre null (nunca 'falhou ao gravar' pra uma linha que já existe)", null, reconstruidoOk.avisoAuditoria);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: analisadoEm convertido pra ISO 8601", "2026-01-01T12:00:00.000Z", reconstruidoOk.analisadoEm);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: sessaoAnaliseId preservado", "SESSAO-0001", reconstruidoOk.sessaoAnaliseId);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: engineVersion preservado (RODADA B/C FASE B3 — rodapé técnico do relatório PDF)", "HistoricoEngine-v2.0.1", reconstruidoOk.engineVersion);

  const linhaSemEngineVersion = historicoFixtureLinhaAuditoria_({ engine_version: "" });
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: engine_version vazio na planilha -> engineVersion=null (nunca \"\")", null,
    historicoReconstruirResultadoDeLinha_(linhaSemEngineVersion).engineVersion);

  const linhaSemRuleset = historicoFixtureLinhaAuditoria_({ ruleset_id: "", ruleset_versao: "", ruleset_revisao: "", estrutura_curricular: "" });
  const reconstruidoSemRuleset = historicoReconstruirResultadoDeLinha_(linhaSemRuleset);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: ruleset_versao vazio na planilha -> rulesetVersao=null (nunca 0 nem \"\")", null, reconstruidoSemRuleset.rulesetVersao);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: ruleset_revisao vazio na planilha -> rulesetRevisao=null (nunca 0 nem \"\")", null, reconstruidoSemRuleset.rulesetRevisao);

  const linhaMotivosCorrompidos = historicoFixtureLinhaAuditoria_({ resultado: "APTO", motivos_json: "{json quebrado" });
  const reconstruidoCorrompido = historicoReconstruirResultadoDeLinha_(linhaMotivosCorrompidos);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: motivos_json corrompido -> resultado da COLUNA própria continua íntegro (APTO)", "APTO", reconstruidoCorrompido.resultado);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: motivos_json corrompido -> motivos vira um motivo SINTÉTICO explicando o problema (nunca lista vazia silenciosa)", true,
    reconstruidoCorrompido.motivos.length === 1 && reconstruidoCorrompido.motivos[0].tipo === "REGISTRO_AUDITORIA_CORROMPIDO");
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: motivos_json corrompido -> detalhes=null (renderizador já sabe lidar com isso — mesmo caminho de 'não implementado'/erros ao vivo)", null, reconstruidoCorrompido.detalhes);

  const linhaHabilitacaoDesconhecida = historicoFixtureLinhaAuditoria_({ habilitacao_codigo: "999-nao-existe" });
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_: habilitacao_codigo desconhecido -> habilitacao=null (nunca lança erro; quem agrupa decide o que fazer)", null,
    historicoReconstruirResultadoDeLinha_(linhaHabilitacaoDesconhecida).habilitacao);

  // --- historicoAgruparLinhasEmSessoes_ ---

  const linhasParaAgrupar = [
    historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-PSI", sessao_analise_id: "SESSAO-A", habilitacao_codigo: "0" }),
    historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-BACH", sessao_analise_id: "SESSAO-A", habilitacao_codigo: "100" }),
    historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-LEGADO-1", sessao_analise_id: "", habilitacao_codigo: "0" }),
    historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-LEGADO-2", sessao_analise_id: "", habilitacao_codigo: "100" }),
    historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-PSI-2", sessao_analise_id: "SESSAO-B", habilitacao_codigo: "0" })
  ];
  const sessoesAgrupadas = historicoAgruparLinhasEmSessoes_(linhasParaAgrupar);

  historicoAssert_(resultados, "agruparLinhasEmSessoes_: 5 linhas (2+2 legado+1) viram 4 sessões (2 reais + 2 pseudo-sessões legado)", 4, sessoesAgrupadas.length);
  historicoAssert_(resultados, "agruparLinhasEmSessoes_: SESSAO-A agrupa suas 2 linhas (Psi+Bach) numa sessão só", true,
    sessoesAgrupadas.some(s => s.sessaoAnaliseId === "SESSAO-A" && s.legado === false && s.linhas.length === 2));
  historicoAssert_(resultados, "agruparLinhasEmSessoes_: SESSAO-B fica em sessão própria (nunca misturada com SESSAO-A)", true,
    sessoesAgrupadas.some(s => s.sessaoAnaliseId === "SESSAO-B" && s.legado === false && s.linhas.length === 1));
  historicoAssert_(resultados, "agruparLinhasEmSessoes_: as 2 linhas legado NUNCA se agrupam entre si (viram 2 pseudo-sessões distintas, cada uma com 1 linha)", true,
    sessoesAgrupadas.filter(s => s.legado === true).length === 2 && sessoesAgrupadas.filter(s => s.legado === true).every(s => s.linhas.length === 1));
  historicoAssert_(resultados, "agruparLinhasEmSessoes_: pseudo-sessão legado usa o PRÓPRIO execucao_id como identificador (nunca inventa um novo)", true,
    sessoesAgrupadas.some(s => s.sessaoAnaliseId === "EXEC-LEGADO-1") && sessoesAgrupadas.some(s => s.sessaoAnaliseId === "EXEC-LEGADO-2"));

  // --- historicoMontarDetalheSessao_ ---

  const sessaoAReal = sessoesAgrupadas.find(s => s.sessaoAnaliseId === "SESSAO-A");
  const detalheSessaoA = historicoMontarDetalheSessao_(sessaoAReal);
  historicoAssert_(resultados, "montarDetalheSessao_: sessão com Psi+Bach -> resultados tem as DUAS chaves", true,
    !!detalheSessaoA.resultados.psi && !!detalheSessaoA.resultados.bach && !detalheSessaoA.resultados.lic);
  historicoAssert_(resultados, "montarDetalheSessao_: nome/nusp vêm das linhas da sessão", true,
    detalheSessaoA.nome === "Fulano de Tal" && detalheSessaoA.nusp === "1234567");
  historicoAssert_(resultados, "montarDetalheSessao_: nenhum aviso quando todas as linhas foram reconstruídas com sucesso", 0, detalheSessaoA.avisos.length);

  const sessaoComHabilitacaoDesconhecida = {
    sessaoAnaliseId: "SESSAO-C", legado: false,
    linhas: [
      historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-C1", sessao_analise_id: "SESSAO-C", habilitacao_codigo: "0", analisado_em: new Date("2026-02-01T10:00:00.000Z") }),
      historicoFixtureLinhaAuditoria_({ execucao_id: "EXEC-C2", sessao_analise_id: "SESSAO-C", habilitacao_codigo: "999-nao-existe", analisado_em: new Date("2026-02-01T10:05:00.000Z") })
    ]
  };
  const detalheSessaoC = historicoMontarDetalheSessao_(sessaoComHabilitacaoDesconhecida);
  historicoAssert_(resultados, "montarDetalheSessao_: linha com habilitacao_codigo desconhecido -> 1 aviso, nunca lança erro", 1, detalheSessaoC.avisos.length);
  historicoAssert_(resultados, "montarDetalheSessao_: linha com habilitacao_codigo desconhecido -> não aparece em resultados (só a psi válida)", true,
    !!detalheSessaoC.resultados.psi && Object.keys(detalheSessaoC.resultados).length === 1);
  historicoAssert_(resultados, "montarDetalheSessao_: analisadoEm da sessão é o MAIOR entre as linhas (10:05, não 10:00)", "2026-02-01T10:05:00.000Z", detalheSessaoC.analisadoEm);

  // --- historicoResumirSessaoParaLista_ ---

  const resumoSessaoA = historicoResumirSessaoParaLista_(detalheSessaoA);
  historicoAssert_(resultados, "resumirSessaoParaLista_: habilitacoesAnalisadas na ordem psi/bach/lic", true,
    resumoSessaoA.habilitacoesAnalisadas.length === 2 && resumoSessaoA.habilitacoesAnalisadas[0] === "psi" && resumoSessaoA.habilitacoesAnalisadas[1] === "bach");
  historicoAssert_(resultados, "resumirSessaoParaLista_: resumoResultados traz o resultado (APTO) de cada habilitação analisada", true,
    resumoSessaoA.resumoResultados.psi === "APTO" && resumoSessaoA.resumoResultados.bach === "APTO");

}

/*=====================================================
  GRUPO 19 — RODADA B/C, FASE B3: HistoricoRelatorios.gs — lógica
  PURA (nome de arquivo, versionamento, achatamento de "detalhes").

  NÃO COBERTO aqui (precisa de DocumentApp/DriveApp reais — fica pro
  roteiro manual, mesma fronteira já usada no resto do módulo):
  historicoRelatorioListarVersoesExistentes_/DetectarUltimaVersao_
  (iteram pastaValidada.getFilesByType), toda a escrita de conteúdo
  (as funções historicoRelatorioEscreverConteudoSessao_ e afins) e o
  orquestrador historicoRelatorioGerarPdfSessao_ + os 2 endpoints públicos.
=====================================================*/
function historicoTestesRelatoriosPuro_(resultados) {

  // --- historicoRelatorioValidarModoVersionamento_ ---

  historicoAssert_(resultados, "validarModoVersionamento_: \"substituir\" é aceito", "substituir", historicoRelatorioValidarModoVersionamento_("substituir"));
  historicoAssert_(resultados, "validarModoVersionamento_: \"nova\" é aceito", "nova", historicoRelatorioValidarModoVersionamento_("nova"));
  ["", null, undefined, "SUBSTITUIR", "cancelar", "outra-coisa"].forEach(valor => {
    let lancou = false;
    try { historicoRelatorioValidarModoVersionamento_(valor); } catch (err) { lancou = true; }
    historicoAssert_(resultados, `validarModoVersionamento_: valor inválido (${JSON.stringify(valor)}) sempre lança erro`, true, lancou);
  });

  // --- historicoRelatorioMontarNomeArquivo_ / historicoRelatorioExtrairVersaoDeNomeArquivo_ ---

  const nomeMontado = historicoRelatorioMontarNomeArquivo_("1234567", "Fulano de Tal", 1);
  historicoAssert_(resultados, "montarNomeArquivo_: bate EXATAMENTE com o padrão da especificação",
    "Relatório de Conferência de Histórico Escolar - NUSP 1234567 - Fulano de Tal - v1.pdf", nomeMontado);

  historicoAssert_(resultados, "montarNomeArquivo_ -> extrairVersaoDeNomeArquivo_: ida e volta preserva a versão (round-trip)", 1,
    historicoRelatorioExtrairVersaoDeNomeArquivo_(nomeMontado, "1234567"));

  const nomeMontadoV7 = historicoRelatorioMontarNomeArquivo_("9999999", "Ciclana da Silva", 7);
  historicoAssert_(resultados, "montarNomeArquivo_ -> extrairVersaoDeNomeArquivo_: round-trip com v7 (duplo dígito futuro: v10+ também funciona por causa do \\d+)", 7,
    historicoRelatorioExtrairVersaoDeNomeArquivo_(nomeMontadoV7, "9999999"));

  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: NUSP diferente do nome do arquivo -> null (nunca confunde relatório de outro aluno)", null,
    historicoRelatorioExtrairVersaoDeNomeArquivo_(nomeMontado, "0000000"));
  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: arquivo de outro tipo (Ofício) -> null", null,
    historicoRelatorioExtrairVersaoDeNomeArquivo_("Ofício de Encaminhamento de Diploma - Fulano de Tal - 20261.pdf", "1234567"));
  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: mesmo prefixo mas sem \".pdf\" -> null", null,
    historicoRelatorioExtrairVersaoDeNomeArquivo_("Relatório de Conferência de Histórico Escolar - NUSP 1234567 - Fulano de Tal - v1.docx", "1234567"));
  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: sem sufixo \"- vN\" -> null", null,
    historicoRelatorioExtrairVersaoDeNomeArquivo_("Relatório de Conferência de Histórico Escolar - NUSP 1234567 - Fulano de Tal.pdf", "1234567"));
  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: nome vazio/null nunca lança erro -> null", null,
    historicoRelatorioExtrairVersaoDeNomeArquivo_(null, "1234567"));
  historicoAssert_(resultados, "extrairVersaoDeNomeArquivo_: reconhece a versão mesmo com o NOME diferente do que está gravado hoje (nome pode ter sido corrigido entre 2 gerações — casa só por NUSP)", 3,
    historicoRelatorioExtrairVersaoDeNomeArquivo_("Relatório de Conferência de Histórico Escolar - NUSP 1234567 - Nome Bem Diferente Agora - v3.pdf", "1234567"));

  // --- historicoRelatorioSanitizarNomeParaArquivo_ ---

  historicoAssert_(resultados, "sanitizarNomeParaArquivo_: nome comum passa direto", "Fulano de Tal", historicoRelatorioSanitizarNomeParaArquivo_("Fulano de Tal"));
  historicoAssert_(resultados, "sanitizarNomeParaArquivo_: barra vira hífen (nunca quebra o nome do arquivo)", "Fulano-Tal", historicoRelatorioSanitizarNomeParaArquivo_("Fulano/Tal"));
  historicoAssert_(resultados, "sanitizarNomeParaArquivo_: vazio/null -> \"Aluno\" (nunca deixa o nome de arquivo com um buraco)", "Aluno", historicoRelatorioSanitizarNomeParaArquivo_(""));
  historicoAssert_(resultados, "sanitizarNomeParaArquivo_: nome absurdamente longo é truncado em 80 (protege o sufixo \"- vN.pdf\" de ser cortado)", true,
    historicoRelatorioSanitizarNomeParaArquivo_("A".repeat(300)).length <= 80);

  // --- historicoRelatorioDecidirVersaoAlvo_ (tabela de decisão completa) ---

  historicoAssert_(resultados, "decidirVersaoAlvo_: nunca existiu antes + \"nova\" -> v1", 1, historicoRelatorioDecidirVersaoAlvo_(false, 0, "nova"));
  historicoAssert_(resultados, "decidirVersaoAlvo_: nunca existiu antes + \"substituir\" -> também cai pra v1 (nada pra substituir; permite o lote aplicar a mesma escolha coletiva sem detecção prévia por aluno)", 1,
    historicoRelatorioDecidirVersaoAlvo_(false, 0, "substituir"));
  historicoAssert_(resultados, "decidirVersaoAlvo_: já existe v3 + \"nova\" -> v4", 4, historicoRelatorioDecidirVersaoAlvo_(true, 3, "nova"));
  historicoAssert_(resultados, "decidirVersaoAlvo_: já existe v3 + \"substituir\" -> continua v3 (mesmo nome, substituição segura)", 3, historicoRelatorioDecidirVersaoAlvo_(true, 3, "substituir"));

  // --- historicoRelatorioRotuloResultado_ / historicoRelatorioRotuloSituacao_ ---

  historicoAssert_(resultados, "rotuloResultado_: APTO -> \"Apto\"", "Apto", historicoRelatorioRotuloResultado_("APTO"));
  historicoAssert_(resultados, "rotuloResultado_: NAO_APTO -> \"Não apto\"", "Não apto", historicoRelatorioRotuloResultado_("NAO_APTO"));
  historicoAssert_(resultados, "rotuloResultado_: CONFERIR -> \"Conferir manualmente\"", "Conferir manualmente", historicoRelatorioRotuloResultado_("CONFERIR"));
  historicoAssert_(resultados, "rotuloResultado_: valor desconhecido nunca lança erro — devolve um texto explicativo", true,
    historicoRelatorioRotuloResultado_("ALGO_ESTRANHO").indexOf("desconhecido") !== -1);

  historicoAssert_(resultados, "rotuloSituacao_: CUMPRIDO -> \"Cumprido\"", "Cumprido", historicoRelatorioRotuloSituacao_("CUMPRIDO"));
  historicoAssert_(resultados, "rotuloSituacao_: CUMPRIDA -> \"Cumprido\" (feminino também reconhecido)", "Cumprido", historicoRelatorioRotuloSituacao_("CUMPRIDA"));
  historicoAssert_(resultados, "rotuloSituacao_: NAO_CUMPRIDO -> \"Não cumprido\"", "Não cumprido", historicoRelatorioRotuloSituacao_("NAO_CUMPRIDO"));
  historicoAssert_(resultados, "rotuloSituacao_: qualquer outra coisa (inclusive null) -> \"Conferir manualmente\" (nunca lança erro, nunca finge certeza)", "Conferir manualmente", historicoRelatorioRotuloSituacao_(null));

  // --- historicoRelatorioTextoValorRequisito_ ---

  historicoAssert_(resultados, "textoValorRequisito_: sem valor + obrigatório -> \"não encontrado no PDF\" (sem qualificador)", "não encontrado no PDF",
    historicoRelatorioTextoValorRequisito_({ valorObtido: null, obrigatorio: true }));
  historicoAssert_(resultados, "textoValorRequisito_: sem valor + NÃO obrigatório -> explica que não impede o parecer", true,
    historicoRelatorioTextoValorRequisito_({ valorObtido: null, obrigatorio: false }).indexOf("não impede o parecer") !== -1);
  historicoAssert_(resultados, "textoValorRequisito_: com valor -> formato \"obtido X / exigido OP Y UNIDADE\"", "obtido 10 / exigido >= 8 créditos",
    historicoRelatorioTextoValorRequisito_({ valorObtido: 10, operador: ">=", valorExigido: 8, unidade: "créditos" }));

  // --- historicoRelatorioMontarLinhasDetalhes_ ---

  historicoAssert_(resultados, "montarLinhasDetalhes_: detalhes null/undefined -> [] (nunca lança erro)", 0, historicoRelatorioMontarLinhasDetalhes_(null).length);

  const linhasCompletas = historicoRelatorioMontarLinhasDetalhes_({
    tempoCurso: { situacao: "CUMPRIDO", semestresValidos: 8, semestresMinimos: 6, semestresMaximos: 12 },
    creditosObrigatorios: { situacao: "CUMPRIDO", valorObtido: 200, operador: ">=", valorExigido: 180, unidade: "créditos" },
    creditosEletivas: { situacao: "NAO_CUMPRIDO", valorObtido: 10, operador: ">=", valorExigido: 20, unidade: "créditos" },
    outrosRequisitosNumericos: [{ criterio: "extra_x", descricao: "Requisito Extra X", situacao: "CUMPRIDO", valorObtido: 5, operador: ">=", valorExigido: 5, unidade: "" }],
    disciplinasObrigatoriasEspecificas: [{ sigla: "PSA0000", nome: "Disciplina Teste", situacao: "CUMPRIDA" }],
    gruposDisciplinas: [{
      nomeGrupo: "Grupo de Pesquisa",
      membros: [
        { sigla: "PSA1111", nome: "Eletiva A", situacao: "CUMPRIDA" },
        { sigla: "PSA2222", nome: "Eletiva B", situacao: "NAO_CUMPRIDA" }
      ]
    }]
  });

  historicoAssert_(resultados, "montarLinhasDetalhes_: mesma ORDEM de historicoRenderizarDetalhes_ (tempo de curso primeiro)", "Tempo de curso", linhasCompletas[0].rotulo);
  historicoAssert_(resultados, "montarLinhasDetalhes_: créditos obrigatórios em seguida, com valorTexto formatado", true,
    linhasCompletas[1].rotulo === "Créditos Obrigatórios" && linhasCompletas[1].valorTexto === "obtido 200 / exigido >= 180 créditos");
  historicoAssert_(resultados, "montarLinhasDetalhes_: requisito numérico extra aparece com o rótulo de \"descricao\"", true,
    linhasCompletas.some(l => l.rotulo === "Requisito Extra X"));
  historicoAssert_(resultados, "montarLinhasDetalhes_: disciplina obrigatória específica cursada -> valorTexto \"cursada\"", true,
    linhasCompletas.some(l => l.rotulo.indexOf("PSA0000") === 0 && l.valorTexto === "cursada"));
  // RODADA B/C.1.2 (pedido de correção, item 2) — só o membro CURSADO
  // do grupo (PSA1111) entra na lista; o NÃO cursado (PSA2222) some
  // por completo, em vez de aparecer com "não cursada / sem situação
  // de aprovação" (comportamento antigo, removido a pedido).
  historicoAssert_(resultados, "montarLinhasDetalhes_: só o membro CURSADO do grupo de disciplinas carrega o nome do grupo (pra abrir sub-seção no PDF)", true,
    linhasCompletas.filter(l => l.grupo === "Grupo de Pesquisa").length === 1 &&
    linhasCompletas.find(l => l.grupo === "Grupo de Pesquisa").rotulo.indexOf("PSA1111") === 0);
  historicoAssert_(resultados, "montarLinhasDetalhes_: membro NÃO cursado de grupo NUNCA aparece (nem no rótulo, nem em nenhuma linha)", false,
    linhasCompletas.some(l => l.rotulo.indexOf("PSA2222") === 0));
  historicoAssert_(resultados, "montarLinhasDetalhes_: membro cursado do grupo carrega valorTexto \"cursada\"", "cursada",
    linhasCompletas.find(l => l.grupo === "Grupo de Pesquisa").valorTexto);
  historicoAssert_(resultados, "montarLinhasDetalhes_: total de linhas bate (1 tempoCurso + 2 créditos + 1 extra + 1 disciplina + 1 grupo [só cursado] = 6)", 6, linhasCompletas.length);

  const linhasGrupoTodoNaoCursado = historicoRelatorioMontarLinhasDetalhes_({
    gruposDisciplinas: [{
      nomeGrupo: "Grupo Sem Nenhuma Cursada",
      membros: [
        { sigla: "PSB1111", nome: "Eletiva C", situacao: "NAO_CUMPRIDA" },
        { sigla: "PSB2222", nome: "Eletiva D", situacao: "NAO_CUMPRIDA" }
      ]
    }]
  });
  historicoAssert_(resultados, "montarLinhasDetalhes_: grupo em que NENHUM membro foi cursado -> nenhuma linha (nunca lança erro)", 0,
    linhasGrupoTodoNaoCursado.length);

  const linhasTempoCursoExcedeMaximo = historicoRelatorioMontarLinhasDetalhes_({
    tempoCurso: { situacao: "CONFERIR", semestresValidos: 20, semestresMaximos: 12, semestresMinimos: 6, excedeMaximo: true }
  });
  historicoAssert_(resultados, "montarLinhasDetalhes_: tempo de curso acima do máximo -> nota explica o máximo configurado", true,
    linhasTempoCursoExcedeMaximo[0].nota && linhasTempoCursoExcedeMaximo[0].nota.indexOf("análise humana") !== -1);

  const linhasComCompensacao = historicoRelatorioMontarLinhasDetalhes_({
    creditosLivres: {
      situacao: "CUMPRIDO", valorObtido: 15, operador: ">=", valorExigido: 10, unidade: "créditos",
      compensacao: { excedenteEletivas: 5, livresObtidasBruto: 10, livresConsideradas: 15 }
    }
  });
  historicoAssert_(resultados, "montarLinhasDetalhes_: compensação eletivas->livres gera uma nota explicativa com os 3 números", true,
    linhasComCompensacao[0].nota && linhasComCompensacao[0].nota.indexOf("10 + 5 = 15") !== -1);

}

/*=====================================================
  GRUPO 20 — RODADA B/C (FASE C2): HistoricoRelatorios.gs, validação
  da lista de itens do relatório CONSOLIDADO + nome de exibição.
  Mesma filosofia do GRUPO 19: só a lógica PURA (zero Sheets/Drive/
  DocumentApp) — a geração de fato do PDF consolidado fica pro harness
  Node privado / roteiro manual (ver "O QUE ESTE ARQUIVO NÃO COBRE",
  no topo do arquivo).
=====================================================*/
function historicoTestesRelatorioConsolidadoPuro_(resultados) {

  // --- historicoRelatorioValidarItensConsolidado_: aceite básico ---

  const doisItens = [
    { registroId: "R1", sessaoAnaliseId: "S1" },
    { registroId: "R2", sessaoAnaliseId: "S2" }
  ];
  const validados = historicoRelatorioValidarItensConsolidado_(doisItens);
  historicoAssert_(resultados, "validarItensConsolidado_: 2 itens válidos passam e devolvem os mesmos 2, na mesma ordem recebida", true,
    validados.length === 2 && validados[0].registroId === "R1" && validados[1].registroId === "R2");

  historicoAssert_(resultados, "validarItensConsolidado_: espaço em volta de registroId/sessaoAnaliseId é removido (trim)", "R1",
    historicoRelatorioValidarItensConsolidado_([
      { registroId: "  R1  ", sessaoAnaliseId: "S1" },
      { registroId: "R2", sessaoAnaliseId: "S2" }
    ])[0].registroId);

  // --- não é uma lista de verdade ---

  [null, undefined, "não é lista", {}, 42].forEach(valor => {
    let lancou = false;
    try { historicoRelatorioValidarItensConsolidado_(valor); } catch (err) { lancou = true; }
    historicoAssert_(resultados, `validarItensConsolidado_: valor que não é array (${JSON.stringify(valor)}) sempre lança erro`, true, lancou);
  });

  // --- limite mínimo (1 aluno é o relatório INDIVIDUAL — "regra do 1" vive só no client, mas o servidor nunca confia cegamente nisso) ---

  [[], [{ registroId: "R1", sessaoAnaliseId: "S1" }]].forEach(lista => {
    let lancou = false;
    let mensagem = "";
    try { historicoRelatorioValidarItensConsolidado_(lista); } catch (err) { lancou = true; mensagem = err.message; }
    historicoAssert_(resultados, `validarItensConsolidado_: menos de 2 itens (${lista.length}) sempre lança erro`, true, lancou);
    historicoAssert_(resultados, `validarItensConsolidado_: erro de poucos itens (${lista.length}) indica o relatório individual como alternativa`, true,
      mensagem.indexOf("individual") !== -1);
  });

  // --- limite máximo ---

  const listaGrande = [];
  for (let i = 0; i < HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS; i++) {
    listaGrande.push({ registroId: "R" + i, sessaoAnaliseId: "S" + i });
  }
  historicoAssert_(resultados, `validarItensConsolidado_: exatamente o máximo (${HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS}) ainda passa`, HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS,
    historicoRelatorioValidarItensConsolidado_(listaGrande).length);

  listaGrande.push({ registroId: "R-extra", sessaoAnaliseId: "S-extra" });
  let lancouMaximo = false;
  try { historicoRelatorioValidarItensConsolidado_(listaGrande); } catch (err) { lancouMaximo = true; }
  historicoAssert_(resultados, `validarItensConsolidado_: 1 item acima do máximo (${listaGrande.length}) lança erro`, true, lancouMaximo);

  // --- item malformado (cada lista abaixo tem o item ruim em [0] e um item válido em [1], pra confirmar que a validação olha TODOS os itens, não só o primeiro que falha) ---

  [
    [null, { registroId: "R2", sessaoAnaliseId: "S2" }],
    ["não é objeto", { registroId: "R2", sessaoAnaliseId: "S2" }],
    [{ registroId: "", sessaoAnaliseId: "S1" }, { registroId: "R2", sessaoAnaliseId: "S2" }],
    [{ registroId: "R1", sessaoAnaliseId: "" }, { registroId: "R2", sessaoAnaliseId: "S2" }],
    [{ registroId: "R1" }, { registroId: "R2", sessaoAnaliseId: "S2" }]
  ].forEach(lista => {
    let lancou = false;
    try { historicoRelatorioValidarItensConsolidado_(lista); } catch (err) { lancou = true; }
    historicoAssert_(resultados, `validarItensConsolidado_: item malformado (${JSON.stringify(lista[0])}) sempre lança erro`, true, lancou);
  });

  // --- duplicata: mesmo PAR registroId+sessaoAnaliseId repetido ---

  let lancouDuplicata = false;
  try {
    historicoRelatorioValidarItensConsolidado_([
      { registroId: "R1", sessaoAnaliseId: "S1" },
      { registroId: "R1", sessaoAnaliseId: "S1" }
    ]);
  } catch (err) { lancouDuplicata = true; }
  historicoAssert_(resultados, "validarItensConsolidado_: mesmo par registroId+sessaoAnaliseId repetido sempre lança erro", true, lancouDuplicata);

  historicoAssert_(resultados, "validarItensConsolidado_: o MESMO aluno com sessões DIFERENTES não é bloqueado (não é duplicata de verdade)", 2,
    historicoRelatorioValidarItensConsolidado_([
      { registroId: "R1", sessaoAnaliseId: "S1" },
      { registroId: "R1", sessaoAnaliseId: "S2" }
    ]).length);

  // --- historicoRelatorioMontarNomeArquivoConsolidado_ (puro — recebe a data JÁ formatada, nunca chama Utilities aqui) ---

  historicoAssert_(resultados, "montarNomeArquivoConsolidado_: bate com o padrão esperado (prefixo - data - N aluno(a)s.pdf)",
    "Relatório Consolidado de Conferência de Histórico Escolar - 2026-03-10 1530 - 5 aluno(a)s.pdf",
    historicoRelatorioMontarNomeArquivoConsolidado_("2026-03-10 1530", 5));

}

/*=====================================================
  GRUPO 21 — RODADA B/C.1 (§14-23/§32): HistoricoRelatorios.gs —
  relatório CONSOLIDADO redesenhado (resumo administrativo). Mesma
  filosofia do GRUPO 20: só a lógica PURA (zero Sheets/Drive/
  DocumentApp) — historicoRelatorioResolverAlunoConsolidado_ (impuro,
  precisa de resolverRegistroPorId_/historicoObterSessaoAnalise reais)
  e o orquestrador historicoRelatorioGerarPdfConsolidado_ ficam de fora
  daqui, mesma fronteira de sempre (ver "O QUE ESTE ARQUIVO NÃO
  COBRE", no topo do arquivo).

  historicoRelatorioValidarItensConsolidado_ (validador do PREFLIGHT,
  §5) continua coberto no GRUPO 20 — este grupo cobre o validador
  PRÓPRIO e mais permissivo do CONSOLIDADO em si,
  historicoRelatorioValidarAlunosConsolidado_, que precisa aceitar
  também aluno(a)s sem sessão nenhuma (erro técnico ou sem habilitação
  ativa) — ver §20.
=====================================================*/
function historicoTestesRelatorioConsolidadoRedesenhado_(resultados) {

  // --- historicoRelatorioValidarAlunosConsolidado_: os 3 formatos válidos de item ---

  const tresFormatos = historicoRelatorioValidarAlunosConsolidado_([
    { registroId: "R1", sessaoAnaliseId: "S1" },                          // análise persistida
    { registroId: "R2", erroTecnico: "Falhou antes da sessão existir" },  // erro técnico, sem sessão
    { registroId: "R3" }                                                 // sem sessão E sem erro (sem habilitação ativa)
  ]);
  historicoAssert_(resultados, "validarAlunosConsolidado_: aceita os 3 formatos (com sessão / com erroTecnico / nenhum dos dois) sem lançar erro", 3, tresFormatos.length);
  historicoAssert_(resultados, "validarAlunosConsolidado_: item com sessão -> sessaoAnaliseId preservado, erroTecnico=null", true,
    tresFormatos[0].sessaoAnaliseId === "S1" && tresFormatos[0].erroTecnico === null);
  historicoAssert_(resultados, "validarAlunosConsolidado_: item com erroTecnico -> preservado, sessaoAnaliseId=null", true,
    tresFormatos[1].erroTecnico === "Falhou antes da sessão existir" && tresFormatos[1].sessaoAnaliseId === null);
  historicoAssert_(resultados, "validarAlunosConsolidado_: item sem nenhum dos dois -> os dois ficam null (não é erro, só 'sem resultado a mostrar')", true,
    tresFormatos[2].sessaoAnaliseId === null && tresFormatos[2].erroTecnico === null);

  // --- registroId vazio ou repetido: os 2 únicos erros FATAIS deste validador ---

  let lancouSemRegistroId = false;
  try { historicoRelatorioValidarAlunosConsolidado_([{ sessaoAnaliseId: "S1" }, { registroId: "R2", sessaoAnaliseId: "S2" }]); }
  catch (err) { lancouSemRegistroId = true; }
  historicoAssert_(resultados, "validarAlunosConsolidado_: item sem registroId sempre lança erro (é o único identificador)", true, lancouSemRegistroId);

  let lancouRegistroRepetido = false;
  try {
    historicoRelatorioValidarAlunosConsolidado_([
      { registroId: "R1", sessaoAnaliseId: "S1" },
      { registroId: "R1", erroTecnico: "outra tentativa, mesmo registro" }
    ]);
  } catch (err) { lancouRegistroRepetido = true; }
  historicoAssert_(resultados, "validarAlunosConsolidado_: MESMO registroId repetido sempre lança erro (sinal de bug no chamador, nunca estado legítimo de lote)", true, lancouRegistroRepetido);

  // --- limites de tamanho: mesma faixa [2,100] do preflight/validador antigo ---

  let lancouPoucos = false;
  try { historicoRelatorioValidarAlunosConsolidado_([{ registroId: "R1" }]); } catch (err) { lancouPoucos = true; }
  historicoAssert_(resultados, "validarAlunosConsolidado_: 1 item só lança erro (mesmo mínimo de 2 do preflight)", true, lancouPoucos);

  // --- errosHabilitacao: normaliza (só chaves conhecidas, trim, descarta mensagem vazia) ---

  const comErrosHabilitacao = historicoRelatorioValidarAlunosConsolidado_([
    { registroId: "R1", sessaoAnaliseId: "S1", errosHabilitacao: { psi: "  Falha ao ler o PDF.  ", bach: "", xpto: "chave desconhecida" } },
    { registroId: "R2", sessaoAnaliseId: "S2" }
  ]);
  historicoAssert_(resultados, "validarAlunosConsolidado_: errosHabilitacao com espaço em volta é aparado (trim)", "Falha ao ler o PDF.", comErrosHabilitacao[0].errosHabilitacao.psi);
  historicoAssert_(resultados, "validarAlunosConsolidado_: errosHabilitacao com mensagem vazia é descartado (não vira uma chave 'bach':'')", false,
    Object.prototype.hasOwnProperty.call(comErrosHabilitacao[0].errosHabilitacao, "bach"));
  historicoAssert_(resultados, "validarAlunosConsolidado_: chave desconhecida (\"xpto\") é ignorada (nunca repassada adiante)", false,
    Object.prototype.hasOwnProperty.call(comErrosHabilitacao[0].errosHabilitacao, "xpto"));
  historicoAssert_(resultados, "validarAlunosConsolidado_: item sem errosHabilitacao -> objeto vazio (nunca undefined/null)", true,
    typeof comErrosHabilitacao[1].errosHabilitacao === "object" && comErrosHabilitacao[1].errosHabilitacao !== null);

  // --- historicoRelatorioValidarLoteInfoConsolidado_: clamping das regras descritas no cabeçalho da função ---

  historicoAssert_(resultados, "validarLoteInfoConsolidado_: valores plausíveis passam intactos", true, (() => {
    const info = historicoRelatorioValidarLoteInfoConsolidado_({ totalSelecionados: 10, totalProcessados: 8, cancelado: true }, 8);
    return info.totalSelecionados === 10 && info.totalProcessados === 8 && info.cancelado === true;
  })());
  historicoAssert_(resultados, "validarLoteInfoConsolidado_: totalProcessados maior que a quantidade recebida de verdade -> cai pra essa quantidade (nunca confia cegamente no cliente)", 5,
    historicoRelatorioValidarLoteInfoConsolidado_({ totalSelecionados: 5, totalProcessados: 999 }, 5).totalProcessados);
  historicoAssert_(resultados, "validarLoteInfoConsolidado_: totalSelecionados menor que totalProcessados -> sobe pra igualar (nunca 'selecionou menos do que processou')", 5,
    historicoRelatorioValidarLoteInfoConsolidado_({ totalSelecionados: 1, totalProcessados: 5 }, 5).totalSelecionados);
  historicoAssert_(resultados, "validarLoteInfoConsolidado_: loteInfo ausente/vazio -> usa a quantidade recebida pros dois totais, cancelado=false", true, (() => {
    const info = historicoRelatorioValidarLoteInfoConsolidado_(null, 7);
    return info.totalSelecionados === 7 && info.totalProcessados === 7 && info.cancelado === false;
  })());
  historicoAssert_(resultados, "validarLoteInfoConsolidado_: cancelado só é true com === true exato (nunca truthy genérico como \"sim\")", false,
    historicoRelatorioValidarLoteInfoConsolidado_({ cancelado: "sim" }, 3).cancelado);

  // --- historicoRelatorioDerivarPendenciaPrincipal_: ordem de preferência ---

  historicoAssert_(resultados, "derivarPendenciaPrincipal_: resultado null -> texto fixo (nunca lança erro)", "(sem resultado)", historicoRelatorioDerivarPendenciaPrincipal_(null));

  const comBloqueioEOutros = { resultado: "NAO_APTO", motivos: [
    { severidade: "INFO", mensagem: "Um aviso qualquer." },
    { severidade: "BLOQUEIO", mensagem: "Faltam 20 créditos obrigatórios." },
    { severidade: "BLOQUEIO", mensagem: "Segundo bloqueio (nunca usado — o PRIMEIRO manda)." }
  ], parecerTexto: "Parecer genérico." };
  historicoAssert_(resultados, "derivarPendenciaPrincipal_: prioridade 1 = PRIMEIRO motivo com severidade BLOQUEIO", "Faltam 20 créditos obrigatórios.",
    historicoRelatorioDerivarPendenciaPrincipal_(comBloqueioEOutros));

  const semBloqueioComMotivo = { resultado: "CONFERIR", motivos: [{ severidade: "INFO", mensagem: "Verificar tempo de curso manualmente." }], parecerTexto: "Parecer genérico." };
  historicoAssert_(resultados, "derivarPendenciaPrincipal_: prioridade 2 = primeiro motivo qualquer com mensagem (sem nenhum BLOQUEIO)", "Verificar tempo de curso manualmente.",
    historicoRelatorioDerivarPendenciaPrincipal_(semBloqueioComMotivo));

  const soParecerTexto = { resultado: "CONFERIR", motivos: [], parecerTexto: "Só o parecer geral mesmo." };
  historicoAssert_(resultados, "derivarPendenciaPrincipal_: prioridade 3 = parecerTexto (sem motivos nenhum)", "Só o parecer geral mesmo.",
    historicoRelatorioDerivarPendenciaPrincipal_(soParecerTexto));

  const aptoSemNada = { resultado: "APTO", motivos: [], parecerTexto: null };
  historicoAssert_(resultados, "derivarPendenciaPrincipal_: APTO sem motivo/parecer -> \"—\" (não é uma pendência de verdade)", "—",
    historicoRelatorioDerivarPendenciaPrincipal_(aptoSemNada));

  const conferirSemNada = { resultado: "CONFERIR", motivos: [], parecerTexto: null };
  historicoAssert_(resultados, "derivarPendenciaPrincipal_: prioridade 4 = texto genérico só quando não há NADA registrado (nunca finge um motivo que não existe)", true,
    historicoRelatorioDerivarPendenciaPrincipal_(conferirSemNada).indexOf("sem motivo detalhado registrado") !== -1);

  // --- historicoRelatorioMontarResumoConsolidado_: conta POR HABILITAÇÃO, nunca por aluno(a) ---

  const alunosParaResumo = [
    { registroId: "R1", erroTecnico: "Falhou antes da sessão.", resultadosPorHabilitacao: null, errosHabilitacao: null },
    { registroId: "R2", erroTecnico: null, resultadosPorHabilitacao: { psi: { resultado: "APTO" }, bach: { resultado: "APTO" } }, errosHabilitacao: null }, // Psi+Bach: conta 2x
    { registroId: "R3", erroTecnico: null, resultadosPorHabilitacao: { bach: { resultado: "NAO_APTO" } }, errosHabilitacao: null },
    { registroId: "R4", erroTecnico: null, resultadosPorHabilitacao: null, errosHabilitacao: null }, // processado(a), sem nenhuma habilitação ativa
    // RODADA B/C.1.1 (§6) — erro técnico LOCAL de uma habilitação
    // (Bacharelado) numa execução onde a OUTRA habilitação (Psicólogo)
    // foi analisada e gravada normalmente: é exatamente o caso que
    // ficava invisível no resumo antes desta correção ("Erros
    // técnicos: 0" mesmo havendo isto nas pendências).
    { registroId: "R5", erroTecnico: null, resultadosPorHabilitacao: { psi: { resultado: "APTO" } }, errosHabilitacao: { bach: "Erro técnico local durante a análise." } }
  ];
  const resumoTeste = historicoRelatorioMontarResumoConsolidado_(alunosParaResumo);
  historicoAssert_(resultados, "montarResumoConsolidado_: totalProcessados = TODOS os aluno(a)s resolvidos (inclui erro técnico e sem habilitação ativa)", 5, resumoTeste.totalProcessados);
  historicoAssert_(resultados, "montarResumoConsolidado_: APTO conta 3 (Psi+Bach do R2 + Psi do R5)", 3, resumoTeste.porHabilitacao.APTO);
  historicoAssert_(resultados, "montarResumoConsolidado_: NAO_APTO conta 1", 1, resumoTeste.porHabilitacao.NAO_APTO);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§6) — montarResumoConsolidado_: errosTecnicosAluno conta só erro de NÍVEL DE ALUNO(A) (1 — R1)", 1, resumoTeste.errosTecnicosAluno);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§6) — montarResumoConsolidado_: errosTecnicosHabilitacao conta erro LOCAL por habilitação, nunca mais invisível (1 — R5/bach)", 1, resumoTeste.errosTecnicosHabilitacao);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§6) — montarResumoConsolidado_: errosTecnicos = soma das 2 dimensões, sem contar a mesma ocorrência 2x (1+1=2)", 2, resumoTeste.errosTecnicos);

  // --- historicoRelatorioMontarLinhasTabelaConsolidado_: 1 linha por aluno(a)+habilitação, erro técnico vira 1 linha própria, sem habilitação ativa não gera linha ---

  const linhasTeste = historicoRelatorioMontarLinhasTabelaConsolidado_(alunosParaResumo);
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: 5 aluno(a)s (R1-R5) -> 1(erro)+2(Psi+Bach)+1(NaoApto)+0(sem habilitação)+1(R5/Psi) = 5 linhas — RODADA B/C.1.1 (§6): R5 foi adicionado à mesma fixture pra cobrir erro técnico por habilitação, e também soma 1 linha própria aqui (Psi/APTO)", 5, linhasTeste.length);
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: aluno(a) com erro técnico -> resultado=\"ERRO_TECNICO\", habilitacao=null, pendenciaPrincipal=a própria mensagem", true, (() => {
    const linha = linhasTeste.find(l => l.registroId === "R1");
    return linha.resultado === "ERRO_TECNICO" && linha.habilitacao === null && linha.pendenciaPrincipal === "Falhou antes da sessão.";
  })());
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: aluno(a) Psi+Bach -> 2 linhas, uma por habilitação, com o nome COMPLETO da habilitação (não a chave curta)", true,
    linhasTeste.filter(l => l.registroId === "R2").length === 2 &&
    linhasTeste.filter(l => l.registroId === "R2").some(l => l.habilitacao === "Formação de Psicólogo(a)") &&
    linhasTeste.filter(l => l.registroId === "R2").some(l => l.habilitacao === "Bacharelado"));
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: aluno(a) sem NENHUMA habilitação com resultado -> nenhuma linha (nada a mostrar, mas já contou em totalProcessados acima)", false,
    linhasTeste.some(l => l.registroId === "R4"));

  const alunoComCurriculo = [{ registroId: "R5", nome: "Ciclana", nusp: "7654321", erroTecnico: null,
    resultadosPorHabilitacao: { bach: { resultado: "CONFERIR", cursoCodigoDocumento: "47012", motivos: [], parecerTexto: "Verificar X." } } }];
  const linhaComCurriculo = historicoRelatorioMontarLinhasTabelaConsolidado_(alunoComCurriculo)[0];
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: currículo vem do cursoCodigoDocumento DA PRÓPRIA habilitação (§12/§13 — nunca um valor genérico do aluno)", "47012", linhaComCurriculo.curriculo);
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: pendenciaPrincipal reaproveita historicoRelatorioDerivarPendenciaPrincipal_ (\"Verificar X.\" veio do parecerTexto)", "Verificar X.", linhaComCurriculo.pendenciaPrincipal);
  historicoAssert_(resultados, "montarLinhasTabelaConsolidado_: nome/NUSP ausentes -> texto de fallback (nunca undefined/branco silencioso)", true, (() => {
    const linha = historicoRelatorioMontarLinhasTabelaConsolidado_([{ registroId: "R6", erroTecnico: "erro qualquer" }])[0];
    return linha.nome === "(nome não registrado)" && linha.nusp === "(não registrado)";
  })());

  // --- historicoRelatorioMontarPendenciasConsolidado_: só NAO_APTO/CONFERIR/ERRO_TECNICO, preserva a ordem da tabela ---

  const linhasMistas = [
    { resultado: "APTO", registroId: "A" },
    { resultado: "NAO_APTO", registroId: "B" },
    { resultado: "ERRO_TECNICO", registroId: "C" },
    { resultado: "CONFERIR", registroId: "D" },
    { resultado: "APTO", registroId: "E" }
  ];
  const pendenciasTeste = historicoRelatorioMontarPendenciasConsolidado_(linhasMistas);
  historicoAssert_(resultados, "montarPendenciasConsolidado_: filtra só NAO_APTO/CONFERIR/ERRO_TECNICO (nunca APTO)", 3, pendenciasTeste.length);
  historicoAssert_(resultados, "montarPendenciasConsolidado_: preserva a ordem original da tabela (B, C, D)", true,
    pendenciasTeste[0].registroId === "B" && pendenciasTeste[1].registroId === "C" && pendenciasTeste[2].registroId === "D");

  // --- historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_: achata errosHabilitacao de TODOS os aluno(a)s ---

  const alunosComAvisos = [
    { registroId: "R1", nome: "Fulano", nusp: "1111111", errosHabilitacao: { psi: "Falha ao extrair o PDF do Psicólogo." } },
    { registroId: "R2", nome: "Ciclana", nusp: "2222222", errosHabilitacao: { bach: "Falha X.", lic: "Falha Y." } },
    { registroId: "R3", nome: "Beltrano", nusp: "3333333", errosHabilitacao: {} },
    { registroId: "R4", nome: "Sicrano", nusp: "4444444" } // sem errosHabilitacao nenhum (nem a chave existe)
  ];
  const avisosTeste = historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_(alunosComAvisos);
  historicoAssert_(resultados, "montarAvisosTecnicosHabilitacaoConsolidado_: achata 1+2+0+0 = 3 avisos no total", 3, avisosTeste.length);
  historicoAssert_(resultados, "montarAvisosTecnicosHabilitacaoConsolidado_: cada aviso carrega nome/NUSP do aluno(a) + nome COMPLETO da habilitação + a mensagem", true,
    avisosTeste.some(a => a.registroId === "R1" && a.nome === "Fulano" && a.nusp === "1111111" && a.habilitacao === "Formação de Psicólogo(a)" && a.mensagem === "Falha ao extrair o PDF do Psicólogo."));
  historicoAssert_(resultados, "montarAvisosTecnicosHabilitacaoConsolidado_: aluno(a) com 2 erros de habilitação diferentes -> 2 avisos separados", 2,
    avisosTeste.filter(a => a.registroId === "R2").length);
  historicoAssert_(resultados, "montarAvisosTecnicosHabilitacaoConsolidado_: aluno(a) sem errosHabilitacao (ausente ou {}) nunca gera aviso nenhum", 0,
    avisosTeste.filter(a => a.registroId === "R3" || a.registroId === "R4").length);

}

/*=====================================================
  GRUPO 22 — RODADA B/C.1 (§12/§33): HistoricoConsultas.gs — novos
  campos de identificação/rastreabilidade do arquivo analisado
  (consumidos pela seção de rastreabilidade do relatório PDF
  individual, §13) + o parser seguro de dados_extraidos_json que os
  torna possíveis. historicoReconstruirResultadoDeLinha_ já tinha
  cobertura no GRUPO 18 (agrupamento/degradação graciosa) — este grupo
  cobre SÓ os 5 campos ACRESCENTADOS nesta rodada ao seu retorno,
  reaproveitando a MESMA historicoFixtureLinhaAuditoria_ de lá (que já
  trazia arquivo_id/arquivo_nome/arquivo_modificado_em/hash_sha256
  como colunas — elas já existiam antes desta rodada, só não eram
  projetadas no objeto reconstruído).
=====================================================*/
function historicoTestesMetadadosRastreabilidade_(resultados) {

  // --- historicoParsearDadosExtraidosJsonSeguro_: recupera cursoCodigoDocumento com segurança, nunca inventa ---

  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: célula vazia -> cursoCodigoDocumento=null (nunca lança erro)", null,
    historicoParsearDadosExtraidosJsonSeguro_("").cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: null -> cursoCodigoDocumento=null", null,
    historicoParsearDadosExtraidosJsonSeguro_(null).cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: marcador de truncamento -> cursoCodigoDocumento=null (mesmo marcador de motivos_json)", null,
    historicoParsearDadosExtraidosJsonSeguro_("[TRUNCADO — excedeu 45000 caracteres...] {\"documento\":").cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: JSON malformado -> cursoCodigoDocumento=null (nunca lança erro pro chamador)", null,
    historicoParsearDadosExtraidosJsonSeguro_("{isto nao e json valido").cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: JSON válido mas é array, não objeto -> cursoCodigoDocumento=null", null,
    historicoParsearDadosExtraidosJsonSeguro_("[1,2,3]").cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: objeto sem \"documento\" -> cursoCodigoDocumento=null (formato NORMAL de erro técnico/não implementado, não é corrupção)", null,
    historicoParsearDadosExtraidosJsonSeguro_(JSON.stringify({ erro: "ALGUM_ERRO_TECNICO", mensagem: "x" })).cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: \"documento\" presente mas não é objeto -> cursoCodigoDocumento=null", null,
    historicoParsearDadosExtraidosJsonSeguro_(JSON.stringify({ documento: "não é objeto" })).cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: \"documento\" presente mas sem cursoCodigoDocumento -> null", null,
    historicoParsearDadosExtraidosJsonSeguro_(JSON.stringify({ documento: { nusp: "1234567" } })).cursoCodigoDocumento);
  historicoAssert_(resultados, "parsearDadosExtraidosJsonSeguro_: documento.cursoCodigoDocumento presente -> recuperado com sucesso", "47012",
    historicoParsearDadosExtraidosJsonSeguro_(JSON.stringify({ documento: { cursoCodigoDocumento: "47012", nusp: "1234567" } })).cursoCodigoDocumento);

  // --- historicoReconstruirResultadoDeLinha_: os 5 campos novos (§12), via a MESMA fixture já usada no GRUPO 18 ---

  const linhaComArquivo = historicoFixtureLinhaAuditoria_({});
  const reconstruidoComArquivo = historicoReconstruirResultadoDeLinha_(linhaComArquivo);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): arquivoId vem direto da coluna arquivo_id", "FILE-ID", reconstruidoComArquivo.arquivoId);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): arquivoNome vem direto da coluna arquivo_nome", "historico.pdf", reconstruidoComArquivo.arquivoNome);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): arquivoModificadoEm convertido pra ISO 8601 (mesma conversão de analisadoEm)", "2026-01-01T00:00:00.000Z", reconstruidoComArquivo.arquivoModificadoEm);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): hashSha256 vem direto da coluna hash_sha256", "abc123", reconstruidoComArquivo.hashSha256);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): cursoCodigoDocumento null quando dados_extraidos_json não traz \"documento\" (fixture padrão: \"{}\")", null, reconstruidoComArquivo.cursoCodigoDocumento);

  const linhaComCurriculoNoJson = historicoFixtureLinhaAuditoria_({
    dados_extraidos_json: JSON.stringify({ documento: { cursoCodigoDocumento: "47011", nusp: "1234567" } })
  });
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): cursoCodigoDocumento recuperado de dados_extraidos_json quando presente", "47011",
    historicoReconstruirResultadoDeLinha_(linhaComCurriculoNoJson).cursoCodigoDocumento);

  const linhaSemArquivo = historicoFixtureLinhaAuditoria_({ arquivo_id: "", arquivo_nome: "", arquivo_modificado_em: "", hash_sha256: "" });
  const reconstruidoSemArquivo = historicoReconstruirResultadoDeLinha_(linhaSemArquivo);
  historicoAssert_(resultados, "reconstruirResultadoDeLinha_ (§12): linha SEM identificação de arquivo (ex.: erro técnico antes da extração) -> os 4 campos ficam null (nunca inventa)", true,
    reconstruidoSemArquivo.arquivoId === null && reconstruidoSemArquivo.arquivoNome === null &&
    reconstruidoSemArquivo.arquivoModificadoEm === null && reconstruidoSemArquivo.hashSha256 === null);

}

/*=====================================================
  GRUPO 23 — RODADA B/C.1 (§24): HistoricoEndpoints.gs — parte PURA
  do hardening de origem da sessão (assinatura HMAC-SHA256 do
  sessaoAnaliseId).

  Cobre só historicoBytesParaHex_ (conversão de bytes assinados —
  convenção do Apps Script, intervalo -128..127 — pra hexadecimal
  minúsculo), que não depende de nenhum serviço do Apps Script: é
  aritmética pura sobre um array de números. O resto da seção §24
  (historicoObterChaveAssinaturaSessao_ — PropertiesService+
  LockService —, historicoAssinarSessao_ e
  historicoVerificarAssinaturaSessao_ — que além disso dependem de
  Utilities.computeHmacSha256Signature) fica de fora daqui, mesma
  fronteira de sempre — coberto por um teste de ida-e-volta (assinar
  então verificar) no harness Node privado, com mocks leves de
  PropertiesService/LockService/Utilities (SEM precisar de nenhum
  mock de Drive/Sheets) — ver "O QUE ESTE ARQUIVO NÃO COBRE", no
  topo do arquivo.
=====================================================*/
function historicoTestesAssinaturaSessaoBytesParaHex_(resultados) {

  historicoAssert_(resultados, "bytesParaHex_: byte zero -> \"00\" (preenche com zero à esquerda)", "00",
    historicoBytesParaHex_([0]));
  historicoAssert_(resultados, "bytesParaHex_: byte positivo de um dígito hex (5) -> \"05\" (preenche)", "05",
    historicoBytesParaHex_([5]));
  historicoAssert_(resultados, "bytesParaHex_: byte positivo de dois dígitos hex (16) -> \"10\" (sem padding extra)", "10",
    historicoBytesParaHex_([16]));
  historicoAssert_(resultados, "bytesParaHex_: byte NEGATIVO (-1, convenção assinada do Apps Script) -> \"ff\" (soma 256 antes de converter)", "ff",
    historicoBytesParaHex_([-1]));
  historicoAssert_(resultados, "bytesParaHex_: byte negativo (-16) -> \"f0\"", "f0",
    historicoBytesParaHex_([-16]));
  historicoAssert_(resultados, "bytesParaHex_: vários bytes -> concatenados na MESMA ordem (nunca reordena)", "0001ff",
    historicoBytesParaHex_([0, 1, -1]));
  historicoAssert_(resultados, "bytesParaHex_: array vazio -> string vazia (nunca lança erro)", "",
    historicoBytesParaHex_([]));

}

/*=====================================================
  FIXTURES — RODADA B/C.1.1 (§2/§3/§8): Document (Body) fake mínimo,
  usado só pra capturar EM ORDEM cada texto que
  historicoRelatorioEscreverConteudoSessao_ (e tudo que ela chama por
  baixo: historicoRelatorioEscreverCabecalhoSessao_,
  historicoRelatorioEscreverSecaoHabilitacao_) manda escrever no PDF —
  sem nenhuma dependência de um Document real. Só é seguro porque
  essas três funções só tocam no PARÂMETRO "corpo" (nunca em
  DocumentApp diretamente) — a mesma condição que já permite
  MimeType.PDF ser citada como "constante sempre disponível, sem
  precisar de Drive real" em outros pontos deste arquivo, agora
  estendida às enums DocumentApp.HorizontalAlignment/.ParagraphHeading/
  .GlyphType (usadas pelo código de produção): também são constantes
  sempre disponíveis, nunca exigem nenhum Document real aberto. Os
  métodos encadeáveis (setBold/setItalic/setAlignment/setHeading/etc.)
  são todos no-ops que devolvem o próprio objeto falso — só
  appendParagraph/appendListItem têm efeito observável (empilhar o
  texto em "textos", na ordem exata em que foram chamados).

  RODADA B/C.1.2 (item 3, pós-recebimento do brasão) — estendida com
  appendTable/appendTableRow/appendTableCell/appendImage: desde que
  HISTORICO_RELATORIO_LOGO_BASE64 passou a ter um valor real (não mais
  null), historicoRelatorioEscreverTimbre_ passa PARA SEMPRE pelo
  ramo com tabela+imagem — inclusive nestes testes, que chamam
  historicoRelatorioEscreverConteudoSessao_ de verdade. Sem esta
  extensão, corpo.appendTable() lançaria "is not a function" e
  derrubaria o grupo inteiro (foi exatamente o que aconteceu ao
  popular a constante, antes desta extensão — confirmado rodando o
  harness). A célula de texto empilha em "textos" (mesmo array,
  mantendo a ordem-única já testada abaixo); appendImage empilha um
  marcador "[imagem: <nome>]" em "textos" (pra dar rastreabilidade de
  ONDE a imagem entra na ordem de leitura) e também guarda a imagem
  falsa em "imagens", pra testes que precisem inspecionar
  largura/altura finais (ver GRUPO 24, abaixo — verificação da
  proporção). A imagem falsa simula as dimensões NATURAIS reais do
  arquivo enviado pelo usuário (170×175px) — getWidth()/getHeight()
  refletem o estado ATUAL (mutável via setWidth/setHeight, como no
  InlineImage de verdade do DocumentApp), então um teste consegue
  verificar que a largura/altura finais preservam a proporção
  original em vez de forçar um quadrado. Isto NÃO testa a renderização
  visual do PDF (posição exata, nitidez, cor de fundo — isso continua
  no roteiro manual, README_TESTES.md) — só que o código não quebra e
  que a aritmética de redimensionamento está certa.
=====================================================*/
function historicoFixtureParagrafoFalso_(textos, texto) {
  textos.push(texto);
  const textoFalso = {
    setBold: function () { return textoFalso; },
    setItalic: function () { return textoFalso; },
    setFontSize: function () { return textoFalso; },
    setForegroundColor: function () { return textoFalso; }
  };
  const paragrafoFalso = {
    setAlignment: function () { return paragrafoFalso; },
    setHeading: function () { return paragrafoFalso; },
    setIndentStart: function () { return paragrafoFalso; },
    setGlyphType: function () { return paragrafoFalso; },
    setNestingLevel: function () { return paragrafoFalso; },
    editAsText: function () { return textoFalso; }
  };
  return paragrafoFalso;
}

function historicoFixtureImagemFalsa_(larguraNatural, alturaNatural) {
  const estado = { largura: larguraNatural, altura: alturaNatural };
  const imagemFalsa = {
    getWidth: function () { return estado.largura; },
    getHeight: function () { return estado.altura; },
    setWidth: function (w) { estado.largura = w; return imagemFalsa; },
    setHeight: function (h) { estado.altura = h; return imagemFalsa; }
  };
  return imagemFalsa;
}

function historicoFixtureCelulaTabelaFalsa_(textos, imagens) {
  const celulaFalsa = {
    appendParagraph: function (texto) { return historicoFixtureParagrafoFalso_(textos, texto); },
    appendListItem: function (texto) { return historicoFixtureParagrafoFalso_(textos, texto); },
    appendImage: function (blob) {
      // 170×175 = dimensão NATURAL real do brasão enviado pelo usuário
      // (confirmada por inspeção do PNG recebido) — ver comentário do
      // bloco de fixtures, acima.
      const imagemFalsa = historicoFixtureImagemFalsa_(170, 175);
      imagens.push(imagemFalsa);
      textos.push("[imagem: " + (blob && typeof blob.getName === "function" ? blob.getName() : "?") + "]");
      return imagemFalsa;
    },
    setWidth: function () { return celulaFalsa; }
  };
  return celulaFalsa;
}

function historicoFixtureLinhaTabelaFalsa_(textos, imagens) {
  return {
    appendTableCell: function () { return historicoFixtureCelulaTabelaFalsa_(textos, imagens); }
  };
}

function historicoFixtureTabelaFalsa_(textos, imagens) {
  const tabelaFalsa = {
    setBorderWidth: function () { return tabelaFalsa; },
    appendTableRow: function () { return historicoFixtureLinhaTabelaFalsa_(textos, imagens); }
  };
  return tabelaFalsa;
}

function historicoFixtureCorpoDocumentoFalso_() {
  const textos = [];
  const imagens = [];
  return {
    textos: textos,
    imagens: imagens,
    appendParagraph: function (texto) { return historicoFixtureParagrafoFalso_(textos, texto); },
    appendListItem: function (texto) { return historicoFixtureParagrafoFalso_(textos, texto); },
    appendTable: function () { return historicoFixtureTabelaFalsa_(textos, imagens); }
  };
}

/*=====================================================
  GRUPO 24 — RODADA B/C.1.1 (§2/§3): HistoricoRelatorios.gs —
  cabeçalho institucional e disclaimer do relatório INDIVIDUAL.
  historicoRelatorioEscreverConteudoSessao_ é chamada DE VERDADE (não
  reimplementada aqui), só com um Document fake (fixture acima) —
  diferente do resto da FASE B3 (GRUPO 19), que testava só a lógica
  PURA ao redor da geração de PDF. Isto NÃO cobre o PDF em si (fonte,
  margem, paginação — isso continua no roteiro manual, README_TESTES.md),
  só o TEXTO que entra no corpo do documento, na ORDEM em que entra.

  RODADA B/C.1.2 (item 3, pós-recebimento do brasão) — desde que
  HISTORICO_RELATORIO_LOGO_BASE64 ganhou um valor real, este grupo
  também exercita (via a fixture de corpo, agora estendida com
  appendTable/appendTableRow/appendTableCell/appendImage) o ramo de
  timbre COM logo — que antes só rodava com a constante em null (só
  texto) porque não havia imagem pra testar. Isto pega quebras
  ESTRUTURAIS (a função lançar erro, ou a ordem do texto mudar) e
  confere a ARITMÉTICA de redimensionamento (proporção preservada), mas
  continua SEM cobrir a renderização visual de verdade (a imagem
  aparecer no lugar certo, nítida, do tamanho certo NO PDF gerado) —
  isso só o usuário consegue confirmar, gerando um relatório de
  verdade (README_TESTES.md).

  O relatório CONSOLIDADO (historicoRelatorioGerarPdfConsolidado_)
  continua fora do alcance de um Document fake — é um orquestrador
  muito maior, com Drive/Sheets reais entrelaçados (ver "O QUE ESTE
  ARQUIVO NÃO COBRE", no topo do arquivo) — por isso seu disclaimer
  (§3: "preferencialmente o MESMO disclaimer do individual") é
  conferido só por uma checagem ESTÁTICA do código-fonte (toString),
  mesma técnica já usada no GRUPO 14 pra historicoLerGuardaAuditoriaRuleset_.
=====================================================*/
/*=====================================================
  RODADA B/C.1.2 (pedido de correção, item 3) — HistoricoRelatorios.gs:
  as 3 funções PURAS novas do layout (rótulo com a grafia do modelo,
  limpeza de símbolos "por extenso" e o motivo por extenso de 2
  níveis). Nunca toca DocumentApp — testável isoladamente, sem
  nenhuma fixture de corpo/documento fake.
=====================================================*/
function historicoTestesRelatorioNovoLayoutMotivoESimbolos_(resultados) {

  // --- historicoRelatorioRotuloResultadoNovoLayout_ ---

  historicoAssert_(resultados, "rotuloResultadoNovoLayout_: APTO -> \"Apto\" (igual ao rótulo antigo)", "Apto", historicoRelatorioRotuloResultadoNovoLayout_("APTO"));
  historicoAssert_(resultados, "rotuloResultadoNovoLayout_: NAO_APTO -> \"Não Apto.\" (maiúscula + ponto final, grafia PRÓPRIA do modelo — diferente de \"Não apto\" do rótulo antigo)",
    "Não Apto.", historicoRelatorioRotuloResultadoNovoLayout_("NAO_APTO"));
  historicoAssert_(resultados, "rotuloResultadoNovoLayout_: CONFERIR -> \"A conferir.\" (grafia PRÓPRIA do modelo — diferente de \"Conferir manualmente\" do rótulo antigo)",
    "A conferir.", historicoRelatorioRotuloResultadoNovoLayout_("CONFERIR"));
  historicoAssert_(resultados, "rotuloResultadoNovoLayout_: valor desconhecido -> mensagem de erro explícita (nunca finge um resultado que não existe)",
    true, historicoRelatorioRotuloResultadoNovoLayout_("XYZ").indexOf("resultado desconhecido") !== -1);
  historicoAssert_(resultados, "rotuloResultadoNovoLayout_: nunca reaproveita/altera HISTORICO_RELATORIO_LABEL_RESULTADO (rótulo antigo continua \"Não apto\", minúsculo, sem ponto)",
    "Não apto", HISTORICO_RELATORIO_LABEL_RESULTADO.NAO_APTO);

  // --- historicoRelatorioLimparSimbolosPorExtenso_ ---

  historicoAssert_(resultados, "limparSimbolosPorExtenso_: null/undefined -> \"\" (nunca lança erro)", "", historicoRelatorioLimparSimbolosPorExtenso_(null));
  historicoAssert_(resultados, "limparSimbolosPorExtenso_: texto sem nenhum símbolo -> devolvido sem alteração", "obtido 21 créditos", historicoRelatorioLimparSimbolosPorExtenso_("obtido 21 créditos"));
  historicoAssert_(resultados, "limparSimbolosPorExtenso_: \">=\" -> \"no mínimo\" (único operador realmente usado hoje no motor de regras)",
    "obtido 21 / exigido no mínimo 47 créditos", historicoRelatorioLimparSimbolosPorExtenso_("obtido 21 / exigido >= 47 créditos"));
  historicoAssert_(resultados, "limparSimbolosPorExtenso_: \"<=\" -> \"no máximo\" (defensivo — não observado em produção hoje)",
    "no máximo 12 semestres", historicoRelatorioLimparSimbolosPorExtenso_("<= 12 semestres"));
  historicoAssert_(resultados, "limparSimbolosPorExtenso_: \"==\" -> \"exatamente\" (defensivo — não observado em produção hoje)",
    "exatamente 3", historicoRelatorioLimparSimbolosPorExtenso_("== 3"));

  // --- historicoRelatorioMontarMotivoPorExtenso_ ---

  historicoAssert_(resultados, "montarMotivoPorExtenso_: resultado null -> texto fixo (nunca lança erro)", "(sem resultado)", historicoRelatorioMontarMotivoPorExtenso_(null));
  historicoAssert_(resultados, "montarMotivoPorExtenso_: resultado APTO -> \"\" (nunca mostra \"Motivo:\" pra quem está Apto)",
    "", historicoRelatorioMontarMotivoPorExtenso_({ resultado: "APTO" }));

  // Nível 1 (preferido): linha(s) de Detalhamento NÃO cumprida(s) — mesmos
  // rótulos já corretos/testados de historicoRelatorioMontarLinhasDetalhes_
  // (GRUPO 19, acima), com o operador já traduzido "por extenso".
  const resultadoComDetalhamentoPendente = {
    resultado: "NAO_APTO",
    motivos: [{ severidade: "BLOQUEIO", mensagem: "Não deveria aparecer — Tier 1 tem prioridade." }],
    detalhes: {
      creditosEletivas: { situacao: "NAO_CUMPRIDO", valorObtido: 10, operador: ">=", valorExigido: 20, unidade: "créditos" }
    }
  };
  historicoAssert_(resultados, "montarMotivoPorExtenso_: nível 1 (Detalhamento) tem prioridade sobre motivos[] do motor — usa o rótulo já correto (\"Créditos em Eletivas\") e traduz o operador (\">=\" -> \"no mínimo\")",
    "Créditos em Eletivas: Não cumprido (obtido 10 / exigido no mínimo 20 créditos)",
    historicoRelatorioMontarMotivoPorExtenso_(resultadoComDetalhamentoPendente));

  const resultadoComDuasPendencias = {
    resultado: "NAO_APTO",
    motivos: [],
    detalhes: {
      creditosObrigatorios: { situacao: "CUMPRIDO", valorObtido: 200, operador: ">=", valorExigido: 180, unidade: "créditos" },
      creditosEletivas: { situacao: "NAO_CUMPRIDO", valorObtido: 10, operador: ">=", valorExigido: 20, unidade: "créditos" },
      estagio: { situacao: "NAO_CUMPRIDO", valorObtido: 30, operador: ">=", valorExigido: 100, unidade: "horas" }
    }
  };
  historicoAssert_(resultados, "montarMotivoPorExtenso_: nível 1 com MAIS de uma pendência -> uma frase por pendência, unidas em ponto-e-vírgula; a linha CUMPRIDA (créditos obrigatórios) nunca entra",
    "Créditos em Eletivas: Não cumprido (obtido 10 / exigido no mínimo 20 créditos); Horas de Estágio: Não cumprido (obtido 30 / exigido no mínimo 100 horas)",
    historicoRelatorioMontarMotivoPorExtenso_(resultadoComDuasPendencias));

  // Nível 2 (fallback): Detalhamento não tem NENHUMA linha pendente (ex.:
  // falha só de GRUPO_DISCIPLINAS — depois da correção do item 2, um
  // grupo não cumprido não deixa mais linha nenhuma em Detalhamento) ->
  // cai pro motivo já derivado por historicoRelatorioDerivarPendenciaPrincipal_
  // (GRUPO 21, acima), REAPROVEITADA sem alteração.
  const resultadoSoGrupoFalho = {
    resultado: "NAO_APTO",
    motivos: [{ severidade: "BLOQUEIO", mensagem: "Grupo de optativas: nenhuma disciplina cursada (mín. 1)." }],
    detalhes: {
      gruposDisciplinas: [{
        nomeGrupo: "Optativa eletiva de pesquisa",
        membros: [{ sigla: "PSA9999", nome: "Optativa X", situacao: "NAO_CUMPRIDA" }]
      }]
    }
  };
  historicoAssert_(resultados, "montarMotivoPorExtenso_: nível 2 (fallback) — Detalhamento sem nenhuma linha pendente (só grupo não cumprido, que some do Detalhamento desde o item 2) cai pro motivo do motor (derivarPendenciaPrincipal_)",
    "Grupo de optativas: nenhuma disciplina cursada (mín. 1).",
    historicoRelatorioMontarMotivoPorExtenso_(resultadoSoGrupoFalho));

  const resultadoConferirSemNadaRegistrado = { resultado: "CONFERIR", motivos: [], parecerTexto: null, detalhes: null };
  historicoAssert_(resultados, "montarMotivoPorExtenso_: nível 2 — sem detalhes/motivos/parecer nenhum -> ainda assim devolve um texto (fallback genérico de derivarPendenciaPrincipal_), nunca string vazia",
    true, historicoRelatorioMontarMotivoPorExtenso_(resultadoConferirSemNadaRegistrado).length > 0);

  // O operador ">=" também é traduzido no fallback de nível 2 (mesma
  // limpeza de símbolos aplicada nos dois níveis).
  const resultadoFallbackComSimbolo = {
    resultado: "NAO_APTO",
    motivos: [{ severidade: "BLOQUEIO", mensagem: "LIVRES_AULA: obtido 21 Créditos, exigido >= 47 Créditos" }],
    detalhes: {}
  };
  historicoAssert_(resultados, "montarMotivoPorExtenso_: o operador também é traduzido quando o texto vem do fallback de nível 2 (não só do Detalhamento de nível 1)",
    "LIVRES_AULA: obtido 21 Créditos, exigido no mínimo 47 Créditos",
    historicoRelatorioMontarMotivoPorExtenso_(resultadoFallbackComSimbolo));

}

function historicoTestesRelatorioCabecalhoDisclaimerIndividual_(resultados) {

  // RODADA B/C.1.2 (item 3) — ATUALIZADO: o cabeçalho institucional e
  // o disclaimer mudaram de novo (timbre + título únicos; disclaimer
  // curto reposicionado pro RODAPÉ do conteúdo) — este grupo passou a
  // verificar o layout NOVO. As checagens de regressão contra os DOIS
  // formatos anteriores ("Assistência Acadêmica - Bloco G"/"Conferência
  // automática, apenas consultiva" da época pré-B/C.1.1, e o cabeçalho
  // ALL-CAPS de 4 linhas + disclaimer longo da B/C.1.1) continuam
  // aqui, todas ainda válidas.
  const detalheSessaoFake = {
    nome: "Fulano de Tal", nusp: "1234567", sessaoAnaliseId: "S1", avisos: [],
    resultados: {}
  };
  const detalheSessaoComResultado = {
    nome: "Fulano de Tal", nusp: "1234567", sessaoAnaliseId: "S1", avisos: [],
    resultados: {
      psi: {
        resultado: "NAO_APTO",
        motivos: [{ severidade: "BLOQUEIO", mensagem: "Faltam créditos." }],
        parecerTexto: "Parecer.",
        detalhes: {}
      }
    }
  };
  const contextoFake = { versao: null, analisadoEmTexto: "01/01/2026 10:00", geradoEmTexto: "02/01/2026 11:00" };

  const disclaimerLongoB11 = "Relatório de apoio à conferência acadêmica. Sujeito à validação administrativa e às " +
    "deliberações dos órgãos competentes.";
  const disclaimerCurtoNovo = "OBS: " + HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT;

  // --- com cabeçalho institucional, sessão SEM nenhum resultado (early-return antes das habilitações) ---
  const corpoComCabecalho = historicoFixtureCorpoDocumentoFalso_();
  historicoRelatorioEscreverConteudoSessao_(corpoComCabecalho, detalheSessaoFake, contextoFake, true);

  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3, pós-recebimento do brasão) — EscreverConteudoSessao_: com HISTORICO_RELATORIO_LOGO_BASE64 já preenchido (base64 real), a imagem some ANTES do nome da Universidade/Instituto, e o timbre (imagem + 2 linhas) e o título único aparecem, NA ORDEM, logo no início do corpo",
    "[imagem: brasao.png]|UNIVERSIDADE DE SÃO PAULO|INSTITUTO DE PSICOLOGIA||Relatório de Conferência de Requisitos para Formação",
    corpoComCabecalho.textos.slice(0, 5).join("|"));

  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3, pós-recebimento do brasão) — EscreverTimbre_: a imagem do brasão é redimensionada MANTENDO a proporção original (largura-alvo 70pt; altura proporcional a partir da dimensão NATURAL 170×175px — nunca um quadrado 70×70 forçado, que distorceria a imagem)",
    true,
    corpoComCabecalho.imagens.length === 1 &&
      corpoComCabecalho.imagens[0].getWidth() === 70 &&
      corpoComCabecalho.imagens[0].getHeight() === Math.round(70 * 175 / 170));

  historicoAssert_(resultados, "RODADA B/C.1.1 (§2) — EscreverConteudoSessao_: o cabeçalho ANTIGO (\"Assistência Acadêmica - Bloco G - IPUSP\") nunca mais aparece",
    false, corpoComCabecalho.textos.some(t => t.indexOf("Assistência Acadêmica - Bloco G") !== -1));
  historicoAssert_(resultados, "RODADA B/C.1.1 (§3) — EscreverConteudoSessao_: o disclaimer pré-B/C.1.1 (\"Conferência automática, apenas consultiva...\") nunca mais aparece",
    false, corpoComCabecalho.textos.some(t => t.indexOf("Conferência automática, apenas consultiva") !== -1));
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: o cabeçalho ALL-CAPS de 4 linhas da B/C.1.1 (\"SERVIÇO DE GRADUAÇÃO\"/\"RELATÓRIO DE CONFERÊNCIA DE HISTÓRICO ESCOLAR\") nunca mais aparece",
    false, corpoComCabecalho.textos.some(t => t === "SERVIÇO DE GRADUAÇÃO" || t === "RELATÓRIO DE CONFERÊNCIA DE HISTÓRICO ESCOLAR"));
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: o disclaimer longo da B/C.1.1 nunca mais aparece",
    false, corpoComCabecalho.textos.indexOf(disclaimerLongoB11) !== -1);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: sessão sem nenhum resultado -> nem \"Habilitações Solicitadas:\" nem o rodapé (\"Relatório gerado em\"/OBS) chegam a ser escritos (early-return antes)",
    false, corpoComCabecalho.textos.some(t => t === "Habilitações Solicitadas:" || t.indexOf("OBS:") === 0));

  // --- com cabeçalho institucional, sessão COM UM resultado (percorre habilitação + rodapé novo, fim a fim) ---
  const corpoComResultado = historicoFixtureCorpoDocumentoFalso_();
  historicoRelatorioEscreverConteudoSessao_(corpoComResultado, detalheSessaoComResultado, contextoFake, true);
  const textos2 = corpoComResultado.textos;

  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverCabecalhoSessao_: linha única \"Nome, N. USP NUSP\" (nunca mais duas linhas separadas)",
    true, textos2.indexOf("Fulano de Tal, N. USP 1234567") !== -1);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverCabecalhoSessao_: \"Currículo:\" aparece logo depois do nome (reposicionado)",
    "Currículo: (não identificado)", textos2[textos2.indexOf("Fulano de Tal, N. USP 1234567") + 1]);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: \"Habilitações Solicitadas:\" aparece antes da primeira habilitação",
    true, textos2.indexOf("Habilitações Solicitadas:") !== -1 &&
      textos2.indexOf("Habilitações Solicitadas:") < textos2.indexOf("Formação de Psicólogo(a): Não Apto."));
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverSecaoHabilitacao_: linha-resumo \"Nome: Não Apto.\" (grafia do novo layout) como item de lista",
    true, textos2.indexOf("Formação de Psicólogo(a): Não Apto.") !== -1);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverSecaoHabilitacao_: \"Motivo:\" por extenso aparece logo depois da linha-resumo (aqui, via fallback nível 2 — Tier 1 sem Detalhamento)",
    "Motivo: Faltam créditos.", textos2[textos2.indexOf("Formação de Psicólogo(a): Não Apto.") + 1]);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: \"Relatório gerado em\" e o disclaimer curto aparecem, NESTA ORDEM, DEPOIS de todas as habilitações (rodapé, não mais topo)",
    true, textos2.indexOf("Relatório gerado em: 02/01/2026 11:00") > textos2.indexOf("Formação de Psicólogo(a): Não Apto.") &&
      textos2.indexOf(disclaimerCurtoNovo) > textos2.indexOf("Relatório gerado em: 02/01/2026 11:00"));
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — EscreverConteudoSessao_: disclaimer curto é EXATO o texto confirmado pelo usuário (com a vírgula final, sem \"e às deliberações...\")",
    true, textos2.some(t => t === disclaimerCurtoNovo));

  // --- sem cabeçalho institucional (generalidade preservada — hoje nenhum caminho de produção chama assim) ---
  const corpoSemCabecalho = historicoFixtureCorpoDocumentoFalso_();
  historicoRelatorioEscreverConteudoSessao_(corpoSemCabecalho, detalheSessaoComResultado, contextoFake, false);

  historicoAssert_(resultados, "EscreverConteudoSessao_: com incluirCabecalhoInstitucional=false, nem timbre nem título aparecem",
    false, corpoSemCabecalho.textos.some(t => t.indexOf("UNIVERSIDADE DE SÃO PAULO") !== -1 || t === HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT));
  historicoAssert_(resultados, "EscreverConteudoSessao_: com incluirCabecalhoInstitucional=false, o rodapé (\"Relatório gerado em\"/OBS) também não aparece",
    false, corpoSemCabecalho.textos.some(t => t.indexOf("Relatório gerado em") === 0 || t.indexOf("OBS:") === 0));
  historicoAssert_(resultados, "EscreverConteudoSessao_: com incluirCabecalhoInstitucional=false, o CONTEÚDO (habilitações) continua aparecendo normalmente",
    true, corpoSemCabecalho.textos.indexOf("Habilitações Solicitadas:") !== -1 &&
      corpoSemCabecalho.textos.indexOf("Formação de Psicólogo(a): Não Apto.") !== -1);

  // --- consolidado: checagem ESTÁTICA (via toString) de que usa as MESMAS constantes/funções compartilhadas do novo layout ---
  const fonteConsolidado = historicoRelatorioGerarPdfConsolidado_.toString();
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — GerarPdfConsolidado_ (checagem estática via toString): usa o timbre/título compartilhados (historicoRelatorioEscreverTimbre_/HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT)",
    true, fonteConsolidado.indexOf("historicoRelatorioEscreverTimbre_") !== -1 && fonteConsolidado.indexOf("HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT") !== -1);
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — GerarPdfConsolidado_ (checagem estática via toString): usa o MESMO disclaimer curto (HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT), nunca mais o disclaimer longo da B/C.1.1",
    true, fonteConsolidado.indexOf("HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT") !== -1 && fonteConsolidado.indexOf(disclaimerLongoB11) === -1);
  // Procura pela CHAMADA de verdade ("nome(" — com parêntese de
  // abertura), nunca só o nome sozinho: o próprio comentário desta
  // função MENCIONA os nomes das 4 funções agregadas retiradas (pra
  // explicar que elas continuam no arquivo, só não são mais chamadas
  // daqui) — um indexOf ingênuo do nome sozinho encontraria o
  // comentário e daria falso-negativo.
  historicoAssert_(resultados, "RODADA B/C.1.2 (item 3) — GerarPdfConsolidado_ (checagem estática via toString): CHAMA o bloco por aluno(a) compartilhado (historicoRelatorioEscreverBlocoAluno_), nunca mais CHAMA a tabela/resumo agregados (só os menciona em comentário, explicando por que continuam no arquivo)",
    true, fonteConsolidado.indexOf("historicoRelatorioEscreverBlocoAluno_(") !== -1 &&
      fonteConsolidado.indexOf("historicoRelatorioMontarLinhasTabelaConsolidado_(") === -1 &&
      fonteConsolidado.indexOf("historicoRelatorioMontarResumoConsolidado_(") === -1);

}

/*=====================================================
  FIXTURES — RODADA B/C.1.1 (§4/§8): Drive (pasta + arquivo) fake
  mínimo, usado só pra exercitar
  historicoRelatorioSubstituirPorNuspEVersao_ DE VERDADE (função de
  produção, não reimplementada aqui) sem tocar Drive real. Só é
  seguro porque a função só chama pastaValidada.getFilesByType(...) e,
  em cada candidato, .getId()/.getName()/.setTrashed(...) — nunca
  nenhum outro método de Drive. MimeType.PDF (passado como argumento
  em getFilesByType) é a mesma constante enum sempre disponível já
  usada em outros pontos deste arquivo.
=====================================================*/
function historicoFixtureArquivoFake_(id, nome, deveFalharAoRemover) {
  const arquivo = {
    trashedChamado: false,
    trashedComSucesso: false,
    getId: function () { return id; },
    getName: function () { return nome; },
    getUrl: function () { return "https://drive.google.com/fake/" + id; },
    setTrashed: function (valor) {
      arquivo.trashedChamado = true;
      if (deveFalharAoRemover) {
        throw new Error("Falha simulada do Drive ao mover para a lixeira.");
      }
      arquivo.trashedComSucesso = !!valor;
    }
  };
  return arquivo;
}

function historicoFixtureFolderComArquivos_(arquivosFake) {
  return {
    getFilesByType: function (mimeType) {
      let indice = 0;
      return {
        hasNext: function () { return indice < arquivosFake.length; },
        next: function () { return arquivosFake[indice++]; }
      };
    }
  };
}

/*=====================================================
  GRUPO 25 — RODADA B/C.1.1 (§4): HistoricoRelatorios.gs —
  historicoRelatorioSubstituirPorNuspEVersao_ crash-safe de verdade.
  Reaproveita a própria historicoRelatorioMontarNomeArquivo_ (função
  real, GRUPO 19) pra montar os nomes de arquivo fake — garante que
  cada caso abaixo casa com o padrão de nome DE VERDADE, nunca um
  padrão digitado à mão que poderia ficar desatualizado.
=====================================================*/
function historicoTestesRelatorioSubstituicaoCrashSafe_(resultados) {

  const nomeV1 = historicoRelatorioMontarNomeArquivo_("1234567", "Fulano de Tal", 1);
  const nomeV2 = historicoRelatorioMontarNomeArquivo_("1234567", "Fulano de Tal", 2);
  const nomeOutroNusp = historicoRelatorioMontarNomeArquivo_("9999999", "Outra Pessoa", 1);

  // --- caso A1: criarNovoArquivo() devolve algo sem getId() (ex.: null) -> lança erro; o antigo nunca é sequer tentado ---
  const antigoA1 = historicoFixtureArquivoFake_("antigo-a1", nomeV1, true);
  const pastaA1 = historicoFixtureFolderComArquivos_([antigoA1]);
  let lancouA1 = false;
  try { historicoRelatorioSubstituirPorNuspEVersao_(pastaA1, "1234567", 1, () => null); }
  catch (err) { lancouA1 = true; }
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: falha ao CRIAR (retorno sem getId) sempre lança erro", true, lancouA1);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: falha ao CRIAR nunca chega a tentar remover nenhum antigo", false, antigoA1.trashedChamado);

  // --- caso A2: a própria criarNovoArquivo() lança (ex.: DocumentApp falhou) -> propaga sem engolir; antigo nunca é tentado ---
  const antigoA2 = historicoFixtureArquivoFake_("antigo-a2", nomeV1, true);
  const pastaA2 = historicoFixtureFolderComArquivos_([antigoA2]);
  let lancouA2 = false;
  try { historicoRelatorioSubstituirPorNuspEVersao_(pastaA2, "1234567", 1, () => { throw new Error("Falha simulada."); }); }
  catch (err) { lancouA2 = true; }
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: erro da própria criação propaga sem ser engolido", true, lancouA2);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: erro na criação nunca chega a tentar remover nenhum antigo", false, antigoA2.trashedChamado);

  // --- caso B: pasta sem nenhum antigo, criação com sucesso -> {arquivo, avisos:[]} ---
  const novoB = historicoFixtureArquivoFake_("novo-b", nomeV1, false);
  const resultadoB = historicoRelatorioSubstituirPorNuspEVersao_(historicoFixtureFolderComArquivos_([]), "1234567", 1, () => novoB);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: pasta sem nenhum antigo -> devolve o novo arquivo, sem avisos", true,
    resultadoB.arquivo.getId() === "novo-b" && resultadoB.avisos.length === 0);

  // --- caso C: existe 1 antigo da MESMA NUSP+versão, mas a remoção FALHA -> nunca derruba a função, novo permanece, exatamente 1 aviso ---
  const antigoC = historicoFixtureArquivoFake_("antigo-c", nomeV1, true);
  const novoC = historicoFixtureArquivoFake_("novo-c", nomeV1, false);
  const resultadoC = historicoRelatorioSubstituirPorNuspEVersao_(historicoFixtureFolderComArquivos_([antigoC]), "1234567", 1, () => novoC);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: falha ao REMOVER o antigo nunca derruba a função (não lança, não descarta o novo)", "novo-c",
    resultadoC.arquivo.getId());
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: falha ao remover -> exatamente 1 aviso coletado (nunca 0, nunca engolido em silêncio)", 1,
    resultadoC.avisos.length);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: o aviso identifica, pelo nome, o arquivo que não pôde ser removido", true,
    resultadoC.avisos[0].indexOf(nomeV1) !== -1);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: a remoção FOI tentada de verdade (nunca ficou sem tentar)", true,
    antigoC.trashedChamado === true && antigoC.trashedComSucesso === false);

  // --- caso D: existe 1 antigo da MESMA NUSP+versão, remoção com SUCESSO -> caminho feliz, sem avisos ---
  const antigoD = historicoFixtureArquivoFake_("antigo-d", nomeV1, false);
  const novoD = historicoFixtureArquivoFake_("novo-d", nomeV1, false);
  const resultadoD = historicoRelatorioSubstituirPorNuspEVersao_(historicoFixtureFolderComArquivos_([antigoD]), "1234567", 1, () => novoD);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: remoção com sucesso -> sem avisos (caminho feliz continua funcionando)", 0, resultadoD.avisos.length);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: remoção com sucesso -> o antigo foi de fato mandado pra lixeira", true, antigoD.trashedComSucesso === true);

  // --- caso E: arquivo de OUTRA versão (mesma NUSP) e de OUTRO NUSP nunca são sequer tentados, mesmo configurados pra falhar ---
  const outraVersaoE = historicoFixtureArquivoFake_("outra-versao-e", nomeV2, true);
  const outroNuspE = historicoFixtureArquivoFake_("outro-nusp-e", nomeOutroNusp, true);
  const novoE = historicoFixtureArquivoFake_("novo-e", nomeV1, false);
  const resultadoE = historicoRelatorioSubstituirPorNuspEVersao_(
    historicoFixtureFolderComArquivos_([outraVersaoE, outroNuspE]), "1234567", 1, () => novoE
  );
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: arquivo de OUTRA versão nunca é sequer tentado (mesmo configurado pra falhar)", false, outraVersaoE.trashedChamado);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: arquivo de OUTRO NUSP nunca é sequer tentado (mesmo configurado pra falhar)", false, outroNuspE.trashedChamado);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: nenhum dos dois gera aviso (nunca foram candidatos de verdade)", 0, resultadoE.avisos.length);

  // --- caso F: se o próprio arquivo recém-criado já aparecer na listagem da pasta, ele NUNCA é removido ---
  const novoF = historicoFixtureArquivoFake_("novo-f", nomeV1, true);
  const resultadoF = historicoRelatorioSubstituirPorNuspEVersao_(historicoFixtureFolderComArquivos_([novoF]), "1234567", 1, () => novoF);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: o arquivo RECÉM-CRIADO nunca é tentado a remover, mesmo aparecendo na própria listagem da pasta", false, novoF.trashedChamado);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§4) — substituirPorNuspEVersao_: caso F termina sem avisos", 0, resultadoF.avisos.length);

}

/*=====================================================
  GRUPO 26 — RODADA B/C.1.1 (§5/§8): HistoricoRelatorios.gs —
  historicoRelatorioGerarPdfSessao_: checagem ESTÁTICA (via toString,
  mesma técnica do GRUPO 14) de que a geração do Document/PDF acontece
  INTEIRAMENTE fora do ScriptLock e só a decisão/commit da versão roda
  dentro dele. NÃO é uma prova comportamental (exigiria LockService e
  DocumentApp reais — fora do alcance deste arquivo, ver "O QUE ESTE
  ARQUIVO NÃO COBRE", no topo) — é um guarda de regressão direto pra
  ESTA reestruturação específica.

  IMPORTANTE (achado no harness Node privado ao rodar isto de verdade
  pela primeira vez — exatamente o tipo de erro que só aparece
  executando, nunca só lendo o código): o próprio comentário que
  antecede a aquisição do lock, logo acima dela no código-fonte, MENCIONA
  em prosa o texto "LockService.getScriptLock()" antes da chamada
  real — então procurar só pela substring solta "LockService.
  getScriptLock" encontrava o comentário primeiro, não a chamada real,
  e todo o resto da checagem (o que vem "antes"/"depois" do lock) saía
  errado. Por isso a âncora usada abaixo é a instrução executável
  INTEIRA, "const lock = LockService.getScriptLock(" — não a chamada
  isolada — porque é isso que garante achar a linha de código real,
  nunca uma menção em comentário.
=====================================================*/
function historicoTestesRelatorioLockForaDoDocumento_(resultados) {

  const fonte = historicoRelatorioGerarPdfSessao_.toString();
  const ANCORA_LOCK = "const lock = LockService.getScriptLock(";

  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): adquire o lock (const lock = LockService.getScriptLock) exatamente 1 vez (nunca readquire dentro do próprio fluxo)",
    1, fonte.split(ANCORA_LOCK).length - 1);

  const indiceLock = fonte.indexOf(ANCORA_LOCK);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): a aquisição real do lock existe no código", true, indiceLock !== -1);

  const indiceVersaoNull = fonte.indexOf("versao: null");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): o conteúdo é montado com versao:null, ANTES de obter o lock (a versão-alvo ainda não foi decidida aqui)",
    true, indiceVersaoNull !== -1 && indiceVersaoNull < indiceLock);

  const indiceDocumentCreate = fonte.indexOf("DocumentApp.create");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): DocumentApp.create acontece ANTES de obter o lock", true,
    indiceDocumentCreate !== -1 && indiceDocumentCreate < indiceLock);

  const indiceSaveAndClose = fonte.indexOf(".saveAndClose(");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): saveAndClose() acontece ANTES de obter o lock", true,
    indiceSaveAndClose !== -1 && indiceSaveAndClose < indiceLock);

  const indiceGetAsPdf = fonte.indexOf(".getAs(");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): a conversão pra PDF (getAs) acontece ANTES de obter o lock", true,
    indiceGetAsPdf !== -1 && indiceGetAsPdf < indiceLock);

  const fonteAposLock = fonte.slice(indiceLock);
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): nenhuma chamada a DocumentApp sobrevive depois do ponto em que o lock é obtido", false,
    fonteAposLock.indexOf("DocumentApp") !== -1);

  const indiceRedeteccao = fonte.indexOf("historicoRelatorioDetectarUltimaVersao_(");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): a redetecção da última versão acontece DEPOIS de obter o lock (nunca reaproveita nada de antes)", true,
    indiceRedeteccao !== -1 && indiceRedeteccao > indiceLock);

  const indiceSubstituicao = fonte.indexOf("historicoRelatorioSubstituirPorNuspEVersao_(");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): a substituição/commit do arquivo acontece DEPOIS de obter o lock (é o que o lock protege)", true,
    indiceSubstituicao !== -1 && indiceSubstituicao > indiceLock);

  const indiceReleaseLock = fonte.indexOf("releaseLock(");
  historicoAssert_(resultados, "RODADA B/C.1.1 (§5) — GerarPdfSessao_ (toString): o lock só é liberado depois da decisão/commit inteira (releaseLock aparece por último)", true,
    indiceReleaseLock !== -1 && indiceReleaseLock > indiceSubstituicao);

}

/*=====================================================
  GRUPO 27 — RODADA B/C.1.1 (§1): DiplomasBackend.gs — integração
  REAL (só leitura) com a aba INFOS ao vivo. ÚNICA exceção impura
  deste arquivo: chama obterTiposDeArquivo() de verdade, contra a
  planilha onde este script está de fato anexado — nunca uma fixture.
  obterTiposDeArquivo() só LÊ (aba.getRange(...).getValues()) — nunca
  grava nada — então rodar isto aqui nunca produz nenhum efeito
  colateral na aba INFOS real (ver DiplomasBackend.gs). O código NUNCA
  deve alterar a aba INFOS sozinho (§1) — nem este teste faz isso.

  Diferente de todo o resto deste arquivo, uma falha AQUI não é
  necessariamente um bug de código: é o sinal de que a aba INFOS ainda
  precisa ser atualizada manualmente por alguém da equipe (ver
  README_IMPLEMENTACAO.md e README_TESTES.md). Mesmo assim é reportada
  como FALHA rígida (historicoAssert_) de propósito — é exatamente o
  alerta acionável que a especificação pede (§1/§8): nunca amenizado a
  ponto de passar despercebido. Só uma falha de LEITURA inesperada
  (aba/planilha inacessível) vira nota informativa — isso sim é um
  problema de ambiente diferente, não "faltam os tipos".

  Reaproveita HISTORICO_HABILITACOES.*.tipoArquivoInfos (a MESMA fonte
  de verdade já testada no GRUPO 12) como valor esperado — nunca uma
  segunda cópia das 3 strings digitada à mão, que poderia divergir.
=====================================================*/
function historicoTestesIntegracaoInfos_(resultados) {

  let tipos;
  try {
    tipos = obterTiposDeArquivo();
  } catch (err) {
    historicoInfo_(resultados, "RODADA B/C.1.1 (§1) — integração INFOS",
      `Não foi possível ler a aba "${ABA_INFOS}" agora (${(err && err.message) || err}). Isto NÃO confirma nem ` +
      `descarta se os 3 tipos "Completo" estão cadastrados — confirme manualmente e rode os testes de novo.`);
    return;
  }

  [
    HISTORICO_HABILITACOES.psi.tipoArquivoInfos,
    HISTORICO_HABILITACOES.bach.tipoArquivoInfos,
    HISTORICO_HABILITACOES.lic.tipoArquivoInfos
  ].forEach(tipoEsperado => {
    historicoAssert_(resultados,
      `RODADA B/C.1.1 (§1) — integração REAL com a aba INFOS: "${tipoEsperado}" está cadastrado na coluna A (se isto falhar, adicione manualmente na planilha — o código nunca faz isso sozinho)`,
      true, tipos.indexOf(tipoEsperado) !== -1);
  });

  // Informativo — nunca vira exigência de remoção (§1: "Final" continua um documento legítimo, se a equipe ainda usa).
  const aindaTemFinalOuSujo = tipos.some(t => t.indexOf("Histórico Escolar Final") !== -1 || t.toLowerCase().indexOf("sujo") !== -1);
  historicoInfo_(resultados, "RODADA B/C.1.1 (§1) — integração INFOS", aindaTemFinalOuSujo
    ? "A aba INFOS ainda tem algum tipo \"Final\"/\"Sujo\" cadastrado — OK, pode continuar sendo um documento " +
      "legítimo em uso pela equipe para outros fins; nunca é removido automaticamente por código."
    : "A aba INFOS não tem mais nenhum tipo \"Final\"/\"Sujo\" cadastrado."
  );

}

/*=====================================================
  FUNÇÃO A RODAR MANUALMENTE.
  Sem parâmetros — selecione "rodarTestesHistorico" no seletor de
  função do editor do Apps Script e clique em "Executar". Devolve
  (e também registra em Logger.log, linha a linha) um relatório
  de texto com o resumo de tudo.
=====================================================*/
function rodarTestesHistorico() {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const linhasRelatorio = [];
  const registrar = (linha) => { linhasRelatorio.push(linha); Logger.log(linha); };

  const resultados = { total: 0, passou: 0, falhou: 0, detalhes: [], info: [] };

  registrar("===== TESTES — Análise de Histórico Escolar =====");
  registrar("Início: " + new Date().toISOString());
  registrar("");
  registrar(
    "Lembrete: estes testes cobrem só a lógica PURA do servidor (HistoricoMotor.gs, " +
    "HistoricoRegrasRepository.gs e a montagem pura da linha de auditoria em HistoricoAuditoria.gs). " +
    "Eles NÃO testam a extração de PDF em si (HistoricoParser.html, que só roda no navegador), a " +
    "interface (HistoricoAnaliseUI.html), a checagem de SHA-256, a gravação de fato da auditoria " +
    "(appendRow) nem execucaoId/analisadoEm de HistoricoEndpoints.gs — isso fica pro roteiro manual " +
    "descrito em README_TESTES.md."
  );
  registrar("");

  const grupos = [
    ["NULL ≠ ZERO", historicoTestesNullDiferenteDeZero_],
    ["Compensação eletivas -> livres", historicoTestesCompensacao_],
    ["Disciplinas obrigatórias", historicoTestesDisciplinas_],
    ["Grupos de disciplinas (ONE_OF / MIN_COUNT / MIN_CREDITS)", historicoTestesGrupos_],
    ["Reconciliação de identidade/documento", historicoTestesReconciliacao_],
    ["Seleção de ruleset ativo", historicoTestesSelecaoRuleset_],
    ["Tempo de curso: mínimo/máximo (pós-auditoria, item 1)", historicoTestesTempoCursoLimites_],
    ["Campo \"obrigatorio\" em requisitos numéricos (pós-auditoria, item 4)", historicoTestesObrigatorioRequisitoNumerico_],
    ["Booleanos de configuração tri-state (pós-auditoria, rodada 3, item 2)", historicoTestesBooleanoConfiguracaoTriState_],
    ["Validação de MIME/tamanho do PDF (pós-auditoria, item 5)", historicoTestesValidacaoMimeTamanho_],
    ["Integração ponta-a-ponta com ruleset real", historicoTestesIntegracaoComRulesetReal_],
    ["RODADA A — Resolução de ruleset em lista (multi-currículo + candidatos + revisão)", historicoTestesResolverRulesetEmLista_],
    ["RODADA A — Curso do PDF + habilitação alvo (Psi+Bach)", historicoTestesResolverCursoHabilitacaoAlvo_],
    ["RODADA A — Resultado do motor carrega rulesetRevisao", historicoTestesResultadoMotorComRevisao_],
    ["RODADA A — Montagem pura dos valores de auditoria (ruleset_revisao + RODADA B/C: sessao_analise_id)", historicoTestesMontarValoresAuditoria_],
    ["RODADA B/C.1 (§2/§26) — Tipos de arquivo \"Completo\" (nunca mais \"Final\"/\"Sujo\"; sem fallback)", historicoTestesTiposArquivoCompleto_],
    ["RODADA A.1 — Versão do motor (HistoricoEngine-v2.0.1)", historicoTestesEngineVersion_],
    ["RODADA A.1 — Guarda de estabilidade do ruleset (núcleo puro)", historicoTestesGuardaAuditoriaRuleset_],
    ["RODADA A.1 — Invariante de rastreabilidade (ruleset_revisao ⇔ pacote estável)", historicoTestesInvarianteRastreabilidadeGuarda_],
    ["RODADA B/C — Helpers puros de sessão (validarFormatoUuid_ + chavePorHabilitacaoCodigo_)", historicoTestesConfigRodadaBC_],
    ["RODADA B/C — Coluna de sessão + consistência de sessão (HistoricoAuditoria.gs)", historicoTestesSessaoAnaliseConsistencia_],
    ["RODADA B/C (FASE B2) — HistoricoConsultas.gs: agrupamento em sessões + reconstrução + degradação graciosa", historicoTestesConsultasSessao_],
    ["RODADA B/C (FASE B3) — HistoricoRelatorios.gs: nome de arquivo, versionamento e achatamento de detalhes", historicoTestesRelatoriosPuro_],
    ["RODADA B/C (FASE C2) — HistoricoRelatorios.gs: validação da lista do relatório consolidado + nome de exibição", historicoTestesRelatorioConsolidadoPuro_],
    ["RODADA B/C.1 (§14-23/§32) — HistoricoRelatorios.gs: relatório consolidado redesenhado (assinatura nova, erros técnicos, currículo por habilitação)", historicoTestesRelatorioConsolidadoRedesenhado_],
    ["RODADA B/C.1 (§12/§33) — HistoricoConsultas.gs: metadados de rastreabilidade (arquivoId/arquivoNome/arquivoModificadoEm/hashSha256/cursoCodigoDocumento)", historicoTestesMetadadosRastreabilidade_],
    ["RODADA B/C.1 (§24) — HistoricoEndpoints.gs: assinatura de sessão (parte pura — bytesParaHex_)", historicoTestesAssinaturaSessaoBytesParaHex_],
    ["RODADA B/C.1.2 (item 3) — HistoricoRelatorios.gs: novo layout — rótulo/limpeza de símbolos/motivo por extenso (funções puras)", historicoTestesRelatorioNovoLayoutMotivoESimbolos_],
    ["RODADA B/C.1.1→B/C.1.2 (§2/§3 / item 3) — HistoricoRelatorios.gs: cabeçalho, timbre, título e disclaimer do relatório individual (+ checagem estática do consolidado)", historicoTestesRelatorioCabecalhoDisclaimerIndividual_],
    ["RODADA B/C.1.1 (§4) — HistoricoRelatorios.gs: substituição crash-safe do relatório antigo (fixtures de Drive fake)", historicoTestesRelatorioSubstituicaoCrashSafe_],
    ["RODADA B/C.1.1 (§5) — HistoricoRelatorios.gs: geração de PDF fora do ScriptLock, decisão/commit dentro dele (checagem estática)", historicoTestesRelatorioLockForaDoDocumento_],
    ["RODADA B/C.1.1 (§1) — DiplomasBackend.gs: integração REAL (só leitura) com a aba INFOS ao vivo", historicoTestesIntegracaoInfos_]
  ];

  grupos.forEach(par => {
    const nomeGrupo = par[0];
    const funcaoGrupo = par[1];
    registrar(`--- ${nomeGrupo} ---`);
    const totalAntes = resultados.total;
    const falhouAntes = resultados.falhou;
    const infoAntes = resultados.info.length;
    try {
      funcaoGrupo(resultados);
    } catch (err) {
      resultados.total++;
      resultados.falhou++;
      resultados.detalhes.push(
        `[FALHOU] Grupo "${nomeGrupo}" lançou um erro inesperado (bug no arquivo de testes, ou mudança ` +
        `incompatível em algum dos arquivos que ele testa): ${err.message}`
      );
    }
    const testesDoGrupo = resultados.total - totalAntes;
    const falhasDoGrupo = resultados.falhou - falhouAntes;
    registrar(`${testesDoGrupo} verificação(ões), ${falhasDoGrupo} falha(s).`);
    resultados.info.slice(infoAntes).forEach(linha => registrar("  " + linha));
    registrar("");
  });

  registrar("===== RESUMO =====");
  registrar(`Total de verificações: ${resultados.total}`);
  registrar(`Passou: ${resultados.passou}`);
  registrar(`Falhou: ${resultados.falhou}`);
  registrar(`Notas informativas: ${resultados.info.length}`);
  registrar("");

  if (resultados.falhou > 0) {
    registrar("FALHAS ENCONTRADAS:");
    resultados.detalhes.forEach(linha => registrar("  " + linha));
    registrar("");
  }

  registrar(resultados.falhou === 0
    ? "TODAS AS VERIFICAÇÕES AUTOMÁTICAS PASSARAM. Isso NÃO substitui o roteiro manual de " +
      "README_TESTES.md (upload de PDF real, extração no navegador, fluxo completo na tela) — só " +
      "confirma que a lógica de decisão (motor de regras + seleção de ruleset) está se comportando " +
      "como o especificado nos casos cobertos aqui."
    : "HÁ FALHAS ACIMA — não use o módulo de Análise de Histórico em produção até entender e corrigir " +
      "cada uma. Veja a lista \"FALHAS ENCONTRADAS\" acima pra saber exatamente qual verificação não " +
      "bateu com o esperado."
  );

  registrar("Fim: " + new Date().toISOString());
  registrar("=====================================================");

  return linhasRelatorio.join("\n");

}
