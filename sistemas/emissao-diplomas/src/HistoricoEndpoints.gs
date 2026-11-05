/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Endpoints públicos
  (chamados via google.script.run pelo HistoricoAnaliseUI.html).

  Este é o ÚNICO arquivo novo deste módulo que fala diretamente com
  o cliente. Responsabilidades exclusivas dele:

  1) Reaproveitar a infraestrutura já existente em
     DiplomasBackend.gs (resolverRegistroPorId_, exigirVersaoAtual_,
     exigirEtapa_, garantirPastaInterno_) — nunca reimplementada aqui.
  2) Decidir a regra de combinação Psicólogo+Bacharelado: quando as
     duas habilitações estão ativas pro aluno, o PDF do Psicólogo é
     localizado/lido UMA vez só, e usado pras DUAS avaliações — o
     PDF do Bacharelado nunca é procurado nesse caso.
  3) Nunca confiar em nada vindo do cliente pra decidir QUAL arquivo
     usar (id de arquivo, nome, hash "declarado") — quem decide isso
     é sempre reconstruído aqui a partir do registro e da pasta já
     validados. O hash que o cliente devolve (arquivoEsperado) é
     usado só como CONFERÊNCIA (comparado com um hash recalculado
     aqui, nunca como critério de busca).
  4) NUNCA incrementa Versão nem grava nada na aba "Diplomas" —
     todos os 4 endpoints abaixo são somente-leitura em relação ao
     registro do aluno (por isso nenhum usa executarMutacao_/lock de
     escrita na planilha de Diplomas). A única escrita que este
     módulo faz é a linha de auditoria em
     "Regras Curriculares" → "ANALISE_HISTORICO", via
     HistoricoAuditoria.gs.

  Limite de confiança explícito (documentado aqui de propósito):
  como a extração do PDF roda no NAVEGADOR (client-side PDF.js, por
  exigência do projeto — nunca AI/OCR/parse server-side), o servidor
  não tem como reconstruir "dadosExtraidos" de forma independente.
  O que o servidor GARANTE é que o PDF usado pra gerar aquele
  "dadosExtraidos" é, byte a byte (SHA-256), o mesmo arquivo que
  está HOJE na pasta validada do aluno — não garante (nem poderia)
  que o navegador leu o conteúdo desse PDF corretamente.

  RODADA B/C: ganhou um 4º endpoint, historicoCriarSessaoAnalise
  (ENDPOINT 2 abaixo, logo depois de prepararAnaliseHistorico) — gera
  um novo identificador de SESSÃO de análise (sessaoAnaliseId, UUID
  gerado no servidor) toda vez que o usuário decide efetivamente rodar
  uma análise. Sozinho, este endpoint NÃO grava nenhuma linha em
  ANALISE_HISTORICO (continua 100% somente-leitura, como os demais) —
  só depois, quando o cliente chama avaliarHistoricoExtraido (ENDPOINT
  4, era ENDPOINT 3) uma vez pra cada habilitação ativa, é que uma
  linha por habilitação é gravada, todas com esse MESMO
  sessaoAnaliseId. É esse id que agrupa, pra sempre, "todas as linhas
  de UMA MESMA execução" (Psi+Bach incluso) sem depender de
  proximidade de horário — ver HistoricoAuditoria.gs e
  HistoricoConsultas.gs. avaliarHistoricoExtraido passou a EXIGIR esse
  id como parâmetro (nunca aceita null/vazio, nunca gera um sozinho —
  só quem decide isso é historicoCriarSessaoAnalise).
=====================================================*/

/*=====================================================
  RODADA B/C.1 (§24) — HARDENING DA ORIGEM DA SESSÃO: assinatura
  HMAC-SHA256, stateless, que liga um sessaoAnaliseId a UM
  registroId+versaoEsperada específicos. Ver o docstring completo de
  historicoCriarSessaoAnalise, mais abaixo, pra o raciocínio de por que
  isso é necessário (a validação de formato + consistência, sozinhas,
  não provam a ORIGEM do UUID).

  Design deliberadamente STATELESS (nenhum PropertiesService/CacheService
  escrito POR SESSÃO — só a chave secreta, fixa, é lida/gravada UMA
  vez no projeto inteiro): o servidor não precisa "lembrar" de
  nenhuma sessão entre historicoCriarSessaoAnalise e
  avaliarHistoricoExtraido — a MESMA chave secreta permite assinar
  aqui e verificar lá, sem guardar estado nenhum no meio. Isso, por
  construção, evita depender de CacheService como fonte de verdade
  (CacheService é evictable — perderia sessões em andamento sob
  qualquer pressão de memória do runtime) sem precisar de nenhuma
  gravação extra por análise.
=====================================================*/

const HISTORICO_PROPRIEDADE_CHAVE_ASSINATURA_SESSAO = "HISTORICO_CHAVE_ASSINATURA_SESSAO";

// Lê a chave secreta de Script Properties (NUNCA enviada ao cliente,
// NUNCA gravada em ANALISE_HISTORICO ou em qualquer aba) — auto-
// provisiona na primeira vez que este projeto roda esta rodada,
// gerando e gravando uma chave nova sob lock. Checagem dupla (rápida
// sem lock primeiro, só entra na seção travada se realmente precisar
// escrever) — mesmo padrão já usado por migrarAnaliseHistoricoRelatoriosV1
// (HistoricoAuditoria.gs) — pra nunca existirem duas chaves diferentes
// geradas por duas execuções concorrentes na primeira vez de todas.
function historicoObterChaveAssinaturaSessao_() {

  const propriedades = PropertiesService.getScriptProperties();
  const existente = propriedades.getProperty(HISTORICO_PROPRIEDADE_CHAVE_ASSINATURA_SESSAO);
  if (existente) return existente;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const existenteSobLock = propriedades.getProperty(HISTORICO_PROPRIEDADE_CHAVE_ASSINATURA_SESSAO);
    if (existenteSobLock) return existenteSobLock;
    // Duas UUIDs concatenadas: 72 caracteres, entropia de sobra pra
    // uma chave HMAC simétrica — nunca precisa ser "legível", só
    // imprevisível.
    const novaChave = Utilities.getUuid() + Utilities.getUuid();
    propriedades.setProperty(HISTORICO_PROPRIEDADE_CHAVE_ASSINATURA_SESSAO, novaChave);
    return novaChave;
  } finally {
    lock.releaseLock();
  }

}

// Converte um array de bytes (assinados, como Utilities.* sempre
// devolve no Apps Script) em hexadecimal minúsculo — mesmo padrão já
// usado por historicoCalcularSha256Hex_ (HistoricoArquivos.gs), cópia
// local pra não acoplar este arquivo a um helper nomeado
// especificamente pra SHA-256 de arquivo (conceito diferente, mesma
// operação mecânica de baixo nível).
function historicoBytesParaHex_(bytes) {
  return bytes.map(b => {
    const valor = b < 0 ? b + 256 : b;
    const hex = valor.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

// Assina sessaoAnaliseId+registroId+versaoEsperada — payload
// delimitado por \u0001 (caractere de controle, nunca esperado em
// nenhum dos 3 campos) pra nunca haver ambiguidade de concatenação
// entre eles (sem o delimitador, sessaoAnaliseId="AB"+registroId="C"
// assinaria igual a sessaoAnaliseId="A"+registroId="BC").
// chaveHabilitacao NUNCA entra no payload — de propósito: o MESMO
// token vale pra todas as chamadas de avaliarHistoricoExtraido de uma
// mesma execução (Psi+Bach incluso), exatamente como o próprio
// sessaoAnaliseId já é reaproveitado entre elas.
function historicoAssinarSessao_(sessaoAnaliseId, registroId, versaoEsperada) {
  const payload = `${sessaoAnaliseId}\u0001${registroId}\u0001${versaoEsperada}`;
  const chave = historicoObterChaveAssinaturaSessao_();
  const assinatura = Utilities.computeHmacSha256Signature(payload, chave);
  return historicoBytesParaHex_(assinatura);
}

// Verifica um token emitido por historicoAssinarSessao_ — fail-closed:
// lança erro claro se ausente, malformado ou se não bater com a
// assinatura recalculada aqui (nunca aceita "quase igual"). Chamado
// SEMPRE antes de qualquer outro trabalho de avaliarHistoricoExtraido
// (ver ali) — falha cedo, mesmo raciocínio de
// historicoValidarFormatoUuid_, chamada logo antes desta.
function historicoVerificarAssinaturaSessao_(sessaoAnaliseId, registroId, versaoEsperada, tokenSessao) {
  const tokenRecebido = String(tokenSessao || "");
  const tokenEsperado = historicoAssinarSessao_(sessaoAnaliseId, registroId, versaoEsperada);
  if (!tokenRecebido || tokenRecebido !== tokenEsperado) {
    throw new Error(
      "Sessão de análise não autenticada (token de sessão ausente ou inválido para este registro/versão) — " +
      "a análise precisa ser reiniciada do início."
    );
  }
}

/*=====================================================
  Helpers privados deste arquivo
=====================================================*/

// Quais habilitações estão ativas pro aluno (mesmo critério que
// avancarParaEncerramento_ já usa em DiplomasBackend.gs: "*Concluiu"
// = "SIM"). Nunca lido do cliente — sempre relido da linha atual.
function historicoObterHabilitacoesAtivas_(aba, mapa, linha) {
  const ativas = {};
  historicoTodasChaves_().forEach(chave => {
    const cfg = historicoConfigHabilitacao_(chave);
    const col = obterColunaOpcional_(mapa, cfg.chaveConcluiu);
    ativas[chave] = col ? (aba.getRange(linha, col).getValue() === "SIM") : false;
  });
  return ativas;
}

// Regra de combinação Psicólogo+Bacharelado: decide, pra uma
// habilitação pedida, QUAL habilitação de fato fornece o arquivo a
// usar. Único caso especial: Bacharelado ativo JUNTO com Psicólogo
// ativo → usa o arquivo do Psicólogo (nunca procura um arquivo de
// Bacharelado nesse caso). Em qualquer outra combinação (só
// Bacharelado, só Psicólogo, ou com Licenciatura junto), cada
// habilitação usa o próprio arquivo.
function historicoResolverHabilitacaoParaArquivo_(chaveHabilitacao, ativas) {
  if (chaveHabilitacao === "bach" && ativas.psi) {
    return { chaveParaArquivo: "psi", documentoDeOutraHabilitacao: true };
  }
  return { chaveParaArquivo: chaveHabilitacao, documentoDeOutraHabilitacao: false };
}

function historicoLerDadosBasicosAluno_(aba, mapa, linha) {
  return {
    nome: aba.getRange(linha, obterColuna_(mapa, "nome")).getValue() || "",
    nUsp: String(aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim(),
    colacao: aba.getRange(linha, obterColuna_(mapa, "colacao")).getValue() || ""
  };
}

// Localiza (server-side, nunca por id vindo do cliente) o arquivo
// que corresponde à habilitação EFETIVA (já considerando a regra de
// combinação acima) e devolve junto o resultado de
// historicoResolverHabilitacaoParaArquivo_, pra quem chama saber se
// está reaproveitando o documento de outra habilitação.
function historicoLocalizarArquivoParaHabilitacao_(pastaValidada, dadosAluno, chaveHabilitacao, ativas) {

  const resolucao = historicoResolverHabilitacaoParaArquivo_(chaveHabilitacao, ativas);
  const localizacao = historicoLocalizarArquivo_(
    pastaValidada, dadosAluno.nome, dadosAluno.colacao, resolucao.chaveParaArquivo
  );

  return {
    arquivo: localizacao.arquivo,
    motivoIndisponivel: localizacao.motivoIndisponivel,
    documentoDeOutraHabilitacao: resolucao.documentoDeOutraHabilitacao,
    chaveParaArquivo: resolucao.chaveParaArquivo
  };

}

// Centraliza a conversão de uma exceção de operação de Drive — listar
// arquivos da pasta, ler nome/MIME/tamanho, ler blob/bytes — num
// resultado técnico padronizado, em vez de deixar a exceção subir
// crua (auditoria, rodada 4). "fn" roda dentro de um try/catch só
// aqui, restrito à operação que efetivamente toca Drive — nunca um
// try/catch cobrindo o endpoint inteiro. Uso: só depois que Registro
// ID/Versão/Etapa/habilitação ativa já foram validados (essas 4
// continuam lançando normalmente, sem passar por aqui — ver
// avaliarHistoricoExtraido logo abaixo).
function historicoCapturarFalhaDrive_(fn) {
  try {
    return { falhouDrive: false, valor: fn() };
  } catch (err) {
    return {
      falhouDrive: true,
      motivo: "Falha técnica ao acessar o Drive (" +
        (err && err.message ? err.message : String(err)) +
        "). Necessita conferência manual."
    };
  }
}

/*=====================================================
  ENDPOINT 1 — pré-checagem: quais habilitações têm análise
  automática disponível pra este aluno agora, sem baixar nenhum
  arquivo ainda (só metadados). Chamado ao abrir a tela de análise
  (individual ou pra cada aluno de um lote).
=====================================================*/
function prepararAnaliseHistorico(registroId, versaoEsperada) {

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const versaoAtual = exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);
  exigirEtapa_(aba, mapa, linha, "historico");

  const dadosAluno = historicoLerDadosBasicosAluno_(aba, mapa, linha);
  const ativas = historicoObterHabilitacoesAtivas_(aba, mapa, linha);

  let pastaValidada = null;
  let motivoSemPasta = null;
  try {
    pastaValidada = garantirPastaInterno_(aba, mapa, linha);
  } catch (err) {
    motivoSemPasta = err && err.message ? err.message : String(err);
  }

  const habilitacoes = {};

  historicoTodasChaves_().forEach(chave => {

    const cfg = historicoConfigHabilitacao_(chave);

    if (!ativas[chave]) {
      habilitacoes[chave] = { ativa: false, implementado: cfg.implementado, arquivo: null, motivoIndisponivel: null, documentoDeOutraHabilitacao: false };
      return;
    }

    if (!cfg.implementado) {
      habilitacoes[chave] = {
        ativa: true, implementado: false, arquivo: null,
        motivoIndisponivel: "Análise automática de Licenciatura ainda não implementada nesta versão.",
        documentoDeOutraHabilitacao: false
      };
      return;
    }

    if (!pastaValidada) {
      habilitacoes[chave] = {
        ativa: true, implementado: true, arquivo: null,
        motivoIndisponivel: motivoSemPasta || "Não foi possível localizar a pasta do aluno no Drive.",
        documentoDeOutraHabilitacao: false
      };
      return;
    }

    const localizacao = historicoLocalizarArquivoParaHabilitacao_(pastaValidada, dadosAluno, chave, ativas);

    habilitacoes[chave] = {
      ativa: true,
      implementado: true,
      arquivo: localizacao.arquivo ? historicoMontarMetadadosArquivo_(localizacao.arquivo) : null,
      motivoIndisponivel: localizacao.motivoIndisponivel,
      documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao
    };

  });

  return {
    registroId: registroId,
    versao: versaoAtual,
    nome: dadosAluno.nome,
    nUsp: dadosAluno.nUsp,
    combo: { psiEBach: ativas.psi && ativas.bach },
    habilitacoes: habilitacoes
  };

}

/*=====================================================
  ENDPOINT 2 (RODADA B/C) — gera um novo identificador de SESSÃO de
  análise (sessaoAnaliseId). Chamado UMA vez por execução, quando o
  usuário efetivamente decide rodar a análise (nunca ao só abrir a
  tela — isso é o ENDPOINT 1 acima) — HistoricoAnaliseUI.html chama
  isto antes do primeiro obterDocumentoHistoricoParaAnalise/
  avaliarHistoricoExtraido de cada execução, e reaproveita o MESMO id
  devolvido aqui pra todas as habilitações ativas dessa execução
  (Psi+Bach incluso — nunca chama isto duas vezes pra uma execução só
  por causa da combinação).

  Continua gated por Versão + etapa "historico", como os outros 3
  endpoints deste arquivo: é o "ponto de compromisso" de uma tentativa
  real de análise, então precisa da mesma proteção contra o aluno já
  ter avançado de etapa ou a Versão já estar desatualizada. Diferente
  disso, os futuros endpoints de LEITURA de sessões já persistidas
  (HistoricoConsultas.gs — histórico/última análise) não terão essa
  mesma exigência, de propósito: são consulta de um registro de
  auditoria permanente, que precisa continuar acessível mesmo depois
  do aluno sair da etapa "historico".

  NÃO grava NENHUMA linha em ANALISE_HISTORICO — só gera e devolve o
  id (Utilities.getUuid(), a mesma função já usada em toda geração de
  UUID deste projeto). A linha só é gravada mais tarde, em
  avaliarHistoricoExtraido (ENDPOINT 4 abaixo), que exige receber este
  id de volta.

  RODADA B/C.1 (§24) — também devolve tokenSessao: um token assinado
  (HMAC-SHA256, ver historicoAssinarSessao_ logo abaixo) que liga este
  sessaoAnaliseId especificamente a ESTE registroId+versaoEsperada.
  Existe porque a validação anterior (só formato de UUID +
  consistência contra linhas JÁ gravadas, ver
  historicoValidarConsistenciaSessao_/HistoricoAuditoria.gs) prova que
  um sessaoAnaliseId TEM formato de UUID e não colide com outro
  registro JÁ AUDITADO — mas nunca prova que aquele UUID específico
  foi REALMENTE emitido por ESTA função: nada impedia, até esta
  rodada, um chamador (bug numa camada futura, ou uma chamada direta à
  API do Apps Script fora do fluxo normal) de simplesmente inventar um
  UUID novo e mandar direto pra avaliarHistoricoExtraido, que aceitaria
  de bom grado por ser a PRIMEIRA linha daquela "sessão" (nenhuma
  linha anterior pra conflitar). tokenSessao fecha essa lacuna: só
  quem chamou ESTA função, pra ESTE registroId+versaoEsperada, consegue
  produzir um token que bata. Guardado só em memória do navegador
  (mesmo tratamento já dado a sessaoAnaliseId — ver
  historicoAnalisarAluno_, HistoricoAnaliseUI.html) e repassado, sem
  alteração, em TODA chamada de avaliarHistoricoExtraido desta mesma
  execução (Psi+Bach incluso — um token só por execução, não um por
  habilitação). NUNCA persistido em ANALISE_HISTORICO — só
  sessaoAnaliseId, puro UUID, continua indo pra lá, exatamente como
  antes (ver HistoricoAuditoria.gs).
=====================================================*/
function historicoCriarSessaoAnalise(registroId, versaoEsperada) {

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);
  exigirEtapa_(aba, mapa, linha, "historico");

  const sessaoAnaliseId = Utilities.getUuid();

  return {
    sessaoAnaliseId: sessaoAnaliseId,
    tokenSessao: historicoAssinarSessao_(sessaoAnaliseId, registroId, versaoEsperada)
  };

}

/*=====================================================
  ENDPOINT 3 — busca o conteúdo (base64) do PDF a usar pra UMA
  habilitação, pro navegador rodar HistoricoParser.extrairDeBase64.
  Nunca recebe id de arquivo do cliente: reconstrói tudo de novo a
  partir do registro.
=====================================================*/
function obterDocumentoHistoricoParaAnalise(registroId, versaoEsperada, chaveHabilitacao) {

  const cfgHabilitacao = historicoConfigHabilitacao_(chaveHabilitacao); // lança erro se chave inválida

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);
  exigirEtapa_(aba, mapa, linha, "historico");

  if (!cfgHabilitacao.implementado) {
    throw new Error("Análise automática de Licenciatura ainda não implementada nesta versão.");
  }

  const dadosAluno = historicoLerDadosBasicosAluno_(aba, mapa, linha);
  const ativas = historicoObterHabilitacoesAtivas_(aba, mapa, linha);

  if (!ativas[chaveHabilitacao]) {
    throw new Error(`Este aluno não tem a habilitação "${cfgHabilitacao.nome}" marcada como ativa.`);
  }

  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);
  const localizacao = historicoLocalizarArquivoParaHabilitacao_(pastaValidada, dadosAluno, chaveHabilitacao, ativas);

  if (!localizacao.arquivo) {
    throw new Error(localizacao.motivoIndisponivel || "Arquivo do histórico não encontrado.");
  }

  const bytes = localizacao.arquivo.getBlob().getBytes();
  const base64 = Utilities.base64Encode(bytes);
  const hashSha256 = historicoCalcularSha256Hex_(bytes);
  const metadados = historicoMontarMetadadosArquivo_(localizacao.arquivo);

  return {
    chaveHabilitacao: chaveHabilitacao,
    documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao,
    base64: base64,
    arquivoInfo: Object.assign({}, metadados, { hashSha256: hashSha256 })
  };

}

/*=====================================================
  ENDPOINT 4 — recebe de volta os dados JÁ EXTRAÍDOS no navegador
  (client-side, via HistoricoParser.extrairDeBase64), confere que o
  arquivo não mudou desde o endpoint 3, roda o motor de regras e
  grava a auditoria. NUNCA mexe em statusHistorico, checkboxes de
  requisito, nem Versão do aluno — é só consulta + registro de
  auditoria.

  sessaoAnaliseId:  (RODADA B/C) o id devolvido por
                    historicoCriarSessaoAnalise (ENDPOINT 2) pra esta
                    execução — o MESMO id em todas as chamadas desta
                    função dentro de uma mesma execução (Psi+Bach
                    incluso). Obrigatório: nunca aceita null/vazio (ver
                    historicoValidarFormatoUuid_ logo abaixo — falha
                    cedo, antes de qualquer outro trabalho) e é
                    repassado, sem alteração, até
                    historicoRegistrarAuditoria_
                    (HistoricoAuditoria.gs), que faz a checagem
                    definitiva de consistência sob lock.
  dadosExtraidos:  objeto devolvido por HistoricoParser.extrairDeBase64
                    (sucesso OU erro — o motor sabe tratar os dois).
  arquivoEsperado:  { hashSha256, id, nome } — exatamente o que o
                    endpoint 3 devolveu em "arquivoInfo" pro mesmo
                    arquivo; usado só pra CONFERIR (nunca pra
                    localizar) que o arquivo não mudou nesse meio
                    tempo.
  tokenSessao:      (RODADA B/C.1, §24) o token devolvido junto com
                    sessaoAnaliseId por historicoCriarSessaoAnalise —
                    o MESMO token em todas as chamadas desta função
                    dentro de uma mesma execução, igual sessaoAnaliseId.
                    Verificado ANTES de qualquer outro trabalho (ver
                    historicoVerificarAssinaturaSessao_, acima) — prova
                    que sessaoAnaliseId foi realmente emitido por
                    historicoCriarSessaoAnalise pra ESTE
                    registroId+versaoEsperada, o que a validação de
                    formato sozinha nunca provou.
=====================================================*/
function avaliarHistoricoExtraido(registroId, versaoEsperada, chaveHabilitacao, sessaoAnaliseId, dadosExtraidos, arquivoEsperado, tokenSessao) {

  // RODADA B/C — formato, cedo e barato (sem tocar planilha nenhuma),
  // antes de qualquer outra validação deste endpoint — mesmo raciocínio
  // de "falha cedo, mensagem clara" já usado nas checagens abaixo.
  // historicoRegistrarAuditoria_ valida de novo, mais abaixo na cadeia
  // de chamadas, como defesa em profundidade — nunca confia só nesta
  // checagem daqui.
  historicoValidarFormatoUuid_(sessaoAnaliseId, "Identificador de sessão de análise");

  // RODADA B/C.1 (§24) — verificação de ORIGEM da sessão, logo em
  // seguida (mesmo raciocínio de "falha cedo, barato, antes de tocar
  // planilha nenhuma"): historicoValidarFormatoUuid_, acima, só prova
  // que sessaoAnaliseId TEM formato de UUID — nunca que veio de
  // verdade de historicoCriarSessaoAnalise pra este
  // registroId+versaoEsperada. historicoValidarConsistenciaSessao_
  // (HistoricoAuditoria.gs, mais abaixo na cadeia) continua existindo
  // e continua útil — protege contra reaproveitar/forjar um
  // sessaoAnaliseId JÁ USADO por outro registro — mas só age quando já
  // existe alguma linha gravada com aquele id; esta verificação aqui
  // fecha a lacuna anterior a isso, na PRIMEIRA gravação de uma sessão.
  historicoVerificarAssinaturaSessao_(sessaoAnaliseId, registroId, versaoEsperada, tokenSessao);

  const cfgHabilitacao = historicoConfigHabilitacao_(chaveHabilitacao); // lança erro se chave inválida

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  exigirVersaoAtual_(aba, mapa, linha, versaoEsperada);
  exigirEtapa_(aba, mapa, linha, "historico");

  const dadosAluno = historicoLerDadosBasicosAluno_(aba, mapa, linha);

  const registroParaAuditoria = {
    registroId: registroId,
    versao: lerVersao_(aba, mapa, linha),
    nusp: dadosAluno.nUsp,
    nome: dadosAluno.nome
  };

  // Licenciatura: nem tenta reconciliar arquivo — o motor já devolve
  // o resultado fixo de "não implementado" só de saber a chave.
  if (!cfgHabilitacao.implementado) {
    const resultadoMotor = historicoAvaliarHabilitacao_({ chaveHabilitacao: chaveHabilitacao });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, null, null, sessaoAnaliseId);
  }

  const ativas = historicoObterHabilitacoesAtivas_(aba, mapa, linha);

  if (!ativas[chaveHabilitacao]) {
    throw new Error(`Este aluno não tem a habilitação "${cfgHabilitacao.nome}" marcada como ativa.`);
  }

  // NOVO (auditoria, rodada 3, item 3): garantirPastaInterno_ pode
  // falhar de novo aqui, mesmo já tendo sido tentada (e talvez já
  // falhado) lá em prepararAnaliseHistorico() — que protege essa
  // mesma chamada com try/catch (motivoSemPasta). Antes desta
  // correção, uma falha AQUI lançava exceção antes de chegar em
  // historicoFinalizarComAuditoria_, e nenhuma linha de auditoria
  // era gravada — mesmo já tendo passado pelas checagens que
  // justificam auditar (Registro ID, Versão, etapa "historico",
  // habilitação ativa — todas acima, sem catch de propósito: falha
  // nelas nunca deve ser auditada). Agora, uma falha aqui vira
  // CONFERIR com motivo técnico explícito e arquivoInfo=null (não há
  // arquivo confiável pra registrar), passando por
  // historicoFinalizarComAuditoria_ como qualquer outra tentativa
  // legítima — sem mudar em nada o caminho de sucesso (pasta
  // acessível continua seguindo o fluxo normal logo abaixo). Não
  // engole erro da PRÓPRIA gravação de auditoria — isso continua
  // tratado só dentro de historicoFinalizarComAuditoria_
  // (auditoriaGravada=false + avisoAuditoria), inalterado.
  let pastaValidada;
  try {
    pastaValidada = garantirPastaInterno_(aba, mapa, linha);
  } catch (err) {
    const resultadoMotor = historicoAvaliarHabilitacao_({
      chaveHabilitacao: chaveHabilitacao,
      nuspRegistro: dadosAluno.nUsp,
      dadosExtraidos: {
        erro: "FALHA_INFRAESTRUTURA_PASTA",
        mensagem: "Não foi possível acessar a pasta do aluno no Drive para localizar o histórico (" +
          (err && err.message ? err.message : String(err)) + "). Necessita conferência manual.",
        parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
      },
      documentoDeOutraHabilitacao: historicoResolverHabilitacaoParaArquivo_(chaveHabilitacao, ativas).documentoDeOutraHabilitacao
    });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, null, null, sessaoAnaliseId);
  }
  // NOVO (auditoria, rodada 4): historicoLocalizarArquivoParaHabilitacao_
  // pode lançar uma exceção de Drive de verdade — pasta.getFiles(),
  // arquivo.getName()/getMimeType()/getSize(), dentro de
  // HistoricoArquivos.gs — distinto do caso "arquivo não encontrado"
  // (que é um retorno normal, sem exceção, tratado no bloco
  // "if (!localizacao.arquivo)" logo abaixo, inalterado). Antes desta
  // correção essa exceção lançava crua, sem passar por
  // historicoFinalizarComAuditoria_, mesmo já tendo passado pelas
  // checagens que justificam auditar (Registro ID, Versão, etapa
  // "historico", habilitação ativa — todas acima, continuam sem catch
  // de propósito). Agora vira CONFERIR com motivo técnico explícito,
  // auditado como qualquer outra tentativa legítima.
  const tentativaLocalizacao = historicoCapturarFalhaDrive_(() =>
    historicoLocalizarArquivoParaHabilitacao_(pastaValidada, dadosAluno, chaveHabilitacao, ativas)
  );

  if (tentativaLocalizacao.falhouDrive) {
    const resultadoMotor = historicoAvaliarHabilitacao_({
      chaveHabilitacao: chaveHabilitacao,
      nuspRegistro: dadosAluno.nUsp,
      dadosExtraidos: {
        erro: "FALHA_INFRAESTRUTURA_DRIVE",
        mensagem: tentativaLocalizacao.motivo,
        parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
      },
      documentoDeOutraHabilitacao: historicoResolverHabilitacaoParaArquivo_(chaveHabilitacao, ativas).documentoDeOutraHabilitacao
    });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, null, null, sessaoAnaliseId);
  }

  const localizacao = tentativaLocalizacao.valor;

  // Arquivo indisponível — nunca foi localizável (não encontrado,
  // ambíguo, MIME/tamanho inválido — ver HistoricoArquivos.gs) OU
  // sumiu/ficou ambíguo entre o endpoint 3 e agora: nos dois casos,
  // motivo de sobra pra CONFERIR (nunca decide com o dadosExtraidos
  // que o cliente mandou, porque não dá pra confirmar que ele
  // corresponde ao arquivo atual da pasta). Este bloco é alcançado
  // tanto pelo fluxo normal (depois do endpoint 3) quanto DIRETO,
  // com dadosExtraidos=null, quando prepararAnaliseHistorico já
  // sabia que o arquivo estava indisponível — ver
  // HistoricoAnaliseUI.html, que chama este endpoint mesmo nesse
  // caso pra garantir que toda tentativa legítima fica auditada.
  if (!localizacao.arquivo) {
    const resultadoMotor = historicoAvaliarHabilitacao_({
      chaveHabilitacao: chaveHabilitacao,
      nuspRegistro: dadosAluno.nUsp,
      dadosExtraidos: {
        erro: "ARQUIVO_INDISPONIVEL",
        // Sem parênteses assumindo "estava disponível há pouco": este
        // caminho agora também é alcançado direto de
        // prepararAnaliseHistorico (arquivo nunca esteve disponível),
        // não só quando o arquivo some entre a extração e a avaliação
        // — motivoIndisponivel já é uma mensagem completa por si só.
        mensagem: localizacao.motivoIndisponivel || "Arquivo do histórico não encontrado.",
        parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
      },
      documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao
    });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, null, null, sessaoAnaliseId);
  }

  // NOVO (auditoria, rodada 4): ler blob/bytes e metadata do arquivo
  // também pode lançar uma exceção de Drive de verdade (falha
  // transitória, permissão, etc. — ver HistoricoArquivos.gs). Mesmo
  // raciocínio do bloco acima: vira CONFERIR auditado em vez de
  // exceção crua, sem introduzir um segundo try/catch solto por aqui.
  const tentativaLeitura = historicoCapturarFalhaDrive_(() => {
    const bytes = localizacao.arquivo.getBlob().getBytes();
    return {
      hashAtual: historicoCalcularSha256Hex_(bytes),
      metadados: historicoMontarMetadadosArquivo_(localizacao.arquivo)
    };
  });

  if (tentativaLeitura.falhouDrive) {
    const resultadoMotor = historicoAvaliarHabilitacao_({
      chaveHabilitacao: chaveHabilitacao,
      nuspRegistro: dadosAluno.nUsp,
      dadosExtraidos: {
        erro: "FALHA_INFRAESTRUTURA_DRIVE",
        mensagem: tentativaLeitura.motivo,
        parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
      },
      documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao
    });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, null, null, sessaoAnaliseId);
  }

  const hashAtual = tentativaLeitura.valor.hashAtual;
  const arquivoInfoAuditoria = Object.assign({}, tentativaLeitura.valor.metadados, { hashSha256: hashAtual });

  const hashDeclarado = arquivoEsperado && arquivoEsperado.hashSha256;

  if (!hashDeclarado || hashDeclarado !== hashAtual) {
    const resultadoMotor = historicoAvaliarHabilitacao_({
      chaveHabilitacao: chaveHabilitacao,
      nuspRegistro: dadosAluno.nUsp,
      dadosExtraidos: {
        erro: "ARQUIVO_ALTERADO",
        mensagem: !hashDeclarado
          ? "Não recebi a referência do arquivo usado na extração — não prossigo sem confirmar que é o mesmo arquivo atual da pasta."
          : "O arquivo do histórico foi alterado (ou substituído por outro com o mesmo nome) depois que os dados foram extraídos no navegador e antes desta análise ser concluída. Repita a análise do início.",
        parserVersion: (dadosExtraidos && dadosExtraidos.parserVersion) || null
      },
      documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao
    });
    return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, dadosExtraidos, arquivoInfoAuditoria, sessaoAnaliseId);
  }

  const resultadoMotor = historicoAvaliarHabilitacao_({
    chaveHabilitacao: chaveHabilitacao,
    nuspRegistro: dadosAluno.nUsp,
    dadosExtraidos: dadosExtraidos,
    documentoDeOutraHabilitacao: localizacao.documentoDeOutraHabilitacao
  });

  return historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, dadosExtraidos, arquivoInfoAuditoria, sessaoAnaliseId);

}

// Grava a auditoria e devolve o resultado do motor + um aviso claro
// se a própria gravação de auditoria falhar — nunca deixa a falha de
// auditoria derrubar a resposta (o servidor já tem o resultado
// calculado; o usuário precisa vê-lo mesmo que o registro em
// planilha tenha falhado), mas também nunca finge que foi auditado
// quando não foi.
//
// RODADA A (rastreabilidade direta): a resposta ganha execucaoId e
// analisadoEm quando auditoriaGravada=true (mesmos valores já
// gravados na linha de ANALISE_HISTORICO — permite, em rodadas
// futuras, reabrir/consultar exatamente essa execução sem precisar
// procurar a linha na planilha); ambos vêm null quando
// auditoriaGravada=false. Contrato de auditoriaGravada/avisoAuditoria
// não muda.
//
// RODADA B/C: recebe sessaoAnaliseId (já validado quanto ao formato
// pelo chamador — avaliarHistoricoExtraido) e só repassa adiante, sem
// alteração nenhuma, até historicoRegistrarAuditoria_ — nunca decide
// nada sobre ele aqui. A resposta também ecoa sessaoAnaliseId de
// volta, sempre o mesmo valor recebido, MESMO quando
// auditoriaGravada=false (diferente de execucaoId/analisadoEm, que só
// existem se a gravação deu certo, sessaoAnaliseId já existia ANTES
// desta chamada, criado por historicoCriarSessaoAnalise) — deixa cada
// resultado de habilitação, sozinho, já carregando o id da sessão a
// que pertence, sem o chamador precisar guardar isso à parte.
function historicoFinalizarComAuditoria_(registroParaAuditoria, resultadoMotor, dadosExtraidosOriginais, arquivoInfo, sessaoAnaliseId) {

  let auditoriaGravada = false;
  let avisoAuditoria = null;
  // RODADA A (rastreabilidade direta): execucaoId/analisadoEm vêm do
  // retorno de historicoRegistrarAuditoria_, que já os calculava mas
  // até aqui eram descartados. Ficam null quando a auditoria falha —
  // nunca inventa um valor pra uma gravação que não aconteceu.
  let execucaoId = null;
  let analisadoEm = null;

  try {
    const gravacao = historicoRegistrarAuditoria_(registroParaAuditoria, resultadoMotor, dadosExtraidosOriginais, arquivoInfo, sessaoAnaliseId);
    auditoriaGravada = true;
    execucaoId = gravacao.execucaoId;
    analisadoEm = gravacao.gravadoEm;
  } catch (err) {
    avisoAuditoria = "O resultado da análise foi calculado, mas NÃO foi possível gravar na auditoria da planilha " +
      "de Regras Curriculares (" + (err && err.message ? err.message : err) + "). Avise o suporte técnico se isso persistir.";
  }

  return Object.assign({}, resultadoMotor, {
    auditoriaGravada: auditoriaGravada,
    avisoAuditoria: avisoAuditoria,
    execucaoId: execucaoId,
    analisadoEm: analisadoEm,
    sessaoAnaliseId: sessaoAnaliseId
  });

}
