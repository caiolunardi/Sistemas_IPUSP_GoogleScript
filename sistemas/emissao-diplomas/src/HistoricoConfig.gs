/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Configuração central
  (arquivo novo, não mexe em nada do Diplomas já existente)

  Este módulo só declara constantes e pequenos utilitários
  puros (sem ler planilha nenhuma). Quem lê a planilha de
  Regras Curriculares é o HistoricoRegrasRepository.gs.

  Vive no MESMO projeto Apps Script do Diplomas — por isso
  pode (e deve) usar direto, sem reimportar nada, funções
  já existentes em DiplomasBackend.gs como obterAba_,
  mapearCabecalhos_, obterColuna_, resolverRegistroPorId_,
  exigirVersaoAtual_, exigirEtapa_, garantirPastaInterno_,
  validarPastaGerenciada_, LockService etc.
=====================================================*/

// Planilha de regras curriculares definida pela chave REGRAS_CURRICULARES
// no ID_INDEX. Nunca consultar a célula spreadsheet_id da aba README.
// Planilha de regras: chave REGRAS_CURRICULARES no ID_INDEX.

const ABA_REGRAS_README = "README";
const ABA_REGRAS_CURRICULOS = "CURRICULOS";
const ABA_REGRAS_REQUISITOS_NUMERICOS = "REQUISITOS_NUMERICOS";
const ABA_REGRAS_DISCIPLINAS = "DISCIPLINAS";
const ABA_REGRAS_GRUPOS = "GRUPOS_REGRAS";
const ABA_REGRAS_AUDITORIA = "ANALISE_HISTORICO";
const ABA_REGRAS_DICIONARIO = "DICIONARIO";

// RODADA A.1 (guarda de estabilidade do ruleset): aba de auditoria
// DIFERENTE de ABA_REGRAS_AUDITORIA acima — aquela é a auditoria das
// ANÁLISES DE ALUNO (ANALISE_HISTORICO), lida E escrita pelo Diplomas.
// Esta aqui é a auditoria das CORREÇÕES DE REGRA CURRICULAR, mantida
// pelo projeto separado Dashboard dos Servidores — o Diplomas só LÊ
// esta aba (nunca escreve, nunca "conserta" uma linha, nunca marca
// nada como FALHOU) e a usa só como relógio/testemunha de estabilidade
// (ver historicoLerGuardaAuditoriaRuleset_ em
// HistoricoRegrasRepository.gs). Nomeada com um sufixo bem diferente
// de propósito, pra nunca ser confundida com a constante acima.
const ABA_REGRAS_AUDITORIA_CURRICULAR = "AUDITORIA_REGRAS_CURRICULARES";

// RODADA B/C — nome da coluna nova em ANALISE_HISTORICO (criada pela
// migração idempotente migrarAnaliseHistoricoRelatoriosV1_, em
// HistoricoRegrasRepository.gs) que agrupa, sob um mesmo identificador
// de SESSÃO, todas as linhas (uma por habilitação) geradas por UMA
// execução de análise de um aluno — nunca reaproveita execucao_id
// (que continua identificando uma linha/habilitação individual) pra
// esse papel. Centralizado aqui como constante só pra nunca haver um
// literal "sessao_analise_id" espalhado e digitado de formas
// diferentes entre HistoricoAuditoria.gs/HistoricoEndpoints.gs/
// HistoricoConsultas.gs.
const HISTORICO_COLUNA_SESSAO_ANALISE = "sessao_analise_id";

// RODADA A (multi-currículo + revisão): até aqui existia uma
// constante HISTORICO_CURSO_CODIGO = "47012", e o motor sempre
// exigia esse currículo. Isso foi removido de propósito.
//
// A partir desta rodada, o curso/currículo NÃO é mais uma constante
// fixa do módulo: ele vem do próprio Histórico Escolar analisado
// (documento.cursoCodigoDocumento, extraído pelo HistoricoParser.html
// — ver HistoricoMotor.gs). A habilitação continua vindo de qual
// análise está em execução (Psicólogo/Bacharelado/Licenciatura,
// abaixo). A seleção de ruleset em HistoricoRegrasRepository.gs
// combina os dois: curso extraído do PDF + habilitação alvo da
// análise. Currículos diferentes de 47012 (ex.: 47011) não são mais
// tratados como erro — só são resolvidos contra o que existir
// cadastrado em CURRICULOS para aquele curso.
//
// Se algum teste precisar de um código de curso de exemplo, use um
// literal ("47012", "47011" etc.) direto na fixture do próprio
// teste — não recrie uma constante global de runtime só para isso.

// Versão FIXA do parser client-side (PDF.js + regras de extração).
// Nunca "latest" — mudanças no parser exigem subir esse número à
// mão, porque ele é gravado em toda linha de auditoria e usado pra
// saber com qual lógica de extração aquele resultado foi gerado.
// (A aba README da planilha de regras tem uma célula "parser_base:
// HistoricoParser v3" — isso é só um rótulo de planejamento antigo;
// nenhum parser foi implementado antes deste, então a numeração
// real começa em v1.0.0 aqui.)
const HISTORICO_PARSER_VERSION = "HistoricoParser-v1.0.0";

// Versão FIXA do motor de regras server-side (HistoricoMotor.gs) —
// sobe junto com qualquer mudança na LÓGICA de decisão (não com uma
// mudança de configuração lida da planilha, que não precisa de nova
// versão). Gravada em toda linha de auditoria junto com
// parser_version/ruleset_id/ruleset_versao/ruleset_revisao/
// estrutura_curricular, pra permitir reconstruir exatamente qual
// combinação de código+regras gerou uma decisão já tomada no passado.
//
// v2.0.0 (RODADA A): o motor deixa de exigir o currículo fixo 47012
// e passa a selecionar o ruleset dinamicamente pelo currículo do
// próprio documento analisado (curso do PDF + habilitação alvo da
// análise). HISTORICO_PARSER_VERSION NÃO muda junto — a extração do
// PDF em si não tem nenhuma mudança de lógica nesta rodada.
//
// v2.0.1 (RODADA A.1 — guarda de estabilidade do ruleset): a
// revalidação de rulesetId+revisao já existente (RODADA A) não
// detectava uma correção que É iniciada (PREPARADA), muta dados, e
// depois é abortada (FALHOU) SEM chegar a mudar "revisao" — nesse
// caso as duas leituras de revisao ficavam idênticas mesmo que o
// pacote de regras tivesse sido lido num estado transitório. A partir
// desta versão, o motor também lê (só leitura) a aba
// AUDITORIA_REGRAS_CURRICULARES como um relógio/testemunha adicional
// (watermark: última auditoria_id + quantidade + qualquer PREPARADA
// em aberto daquele ruleset), capturado antes E depois de montar o
// pacote de regras — mudança na LÓGICA DE DECISÃO sob concorrência,
// por isso o número sobe (patch, não versão maior: o contrato de
// entrada/saída de historicoAvaliarHabilitacao_ não muda).
// HISTORICO_PARSER_VERSION continua sem mudar.
const HISTORICO_ENGINE_VERSION = "HistoricoEngine-v2.0.1";

// Versão FIXA do GERADOR/LAYOUT dos relatórios em PDF (RODADA B/C —
// HistoricoRelatorios.gs). É um conceito DISTINTO de
// HISTORICO_ENGINE_VERSION: o motor decide APTO/NAO_APTO/CONFERIR; o
// gerador de relatório só COMPÕE, num PDF, o resultado já decidido e
// já persistido em ANALISE_HISTORICO — mudar o layout/texto do
// relatório nunca precisa (nem deve) subir HISTORICO_ENGINE_VERSION,
// e vice-versa. Pode aparecer no rodapé técnico do PDF, junto com
// engine_version/parser_version daquela execução específica.
// RODADA B/C.1.2 (item 3) — v1→v2 (versão MAIOR, não patch): redesenho
// estrutural do layout dos dois relatórios (timbre/título únicos,
// habilitação como linha-resumo + Motivo por extenso, disclaimer
// curto reposicionado pro rodapé, consolidado sem métricas agregadas)
// — não é só ajuste de texto.
const HISTORICO_RELATORIO_VERSION = "HistoricoRelatorio-v2.0.0";

// Versão fixa e pinada do PDF.js usado no HistoricoParser.html —
// nunca aponte pra "latest": isso tornaria a extração imprevisível
// entre uma análise e outra sem nenhuma mudança de código visível.
const HISTORICO_PDFJS_VERSION = "3.11.174";
const HISTORICO_PDFJS_BASE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + HISTORICO_PDFJS_VERSION + "/";

// Mapa único psi/bach/lic -> tudo que o módulo precisa saber sobre
// cada habilitação. "chaveConcluiu"/"chaveRequisitos" são as MESMAS
// chaves já usadas em CABECALHOS (DiplomasBackend.gs) — não duplicam
// nome de coluna, só apontam pra ele.
const HISTORICO_HABILITACOES = {
  psi: {
    chave: "psi",
    habilitacaoCodigo: "0",
    nome: "Formação de Psicólogo(a)",
    chaveConcluiu: "psiConcluiu",
    chaveRequisitos: "psiRequisitos",
    // String EXATA usada na aba INFOS da planilha Diplomas pra
    // localizar o arquivo do aluno (ver HistoricoArquivos.gs).
    //
    // RODADA A: trocado de "Histórico Escolar Final USP (...)" para
    // "Histórico Escolar Sujo USP (...)" — na época, entendeu-se
    // empiricamente que o documento "Final" não continha toda a
    // estrutura necessária pra análise automática. Valor puramente
    // histórico — nunca mais um valor de runtime a partir da RODADA
    // B/C, abaixo.
    //
    // RODADA B/C: revertido de "Sujo" para "Final" — essa premissa foi
    // considerada equivocada NAQUELE momento. Também um valor
    // puramente histórico agora: a RODADA B/C.1 (a mais recente,
    // abaixo) corrige de novo.
    //
    // RODADA B/C.1 (correção de conformidade — item 2 da especificação
    // desta rodada): "Final" também estava errado, por um motivo
    // DIFERENTE do que motivou a troca pra "Sujo" na RODADA A —
    // "Histórico Escolar Final USP" é OUTRO documento da Jupiter,
    // igualmente incompleto pra análise automática. O documento correto,
    // que de fato contém toda a estrutura necessária (disciplinas,
    // totais de crédito, estágio, AAC, EXT, tabela final por
    // obrigatoriedade e demais dados que o parser já extrai), é o
    // "HISTÓRICO ESCOLAR COMPLETO" — por isso o TIPO DE ARQUIVO
    // operacional (o rótulo usado na aba INFOS/upload pra localizar o
    // PDF dentro da pasta do aluno) passa a ser "Completo". "Final" e
    // "Sujo" NUNCA MAIS existem como valor de runtime em lugar nenhum
    // deste módulo a partir desta rodada — só nestes comentários,
    // como histórico. Isso continua sendo só o RÓTULO do arquivo: o
    // CONTEÚDO/extração/regras não mudam por causa dele. Continua SEM
    // fallback nenhum: se "Completo" não for encontrado na pasta, o
    // arquivo é tratado como indisponível (CONFERIR auditado) — em
    // nenhuma hipótese o sistema procura por "Final" ou "Sujo" no
    // lugar dele.
    tipoArquivoInfos: "Histórico Escolar Completo USP (Psicólogo)",
    implementado: true
  },
  bach: {
    chave: "bach",
    habilitacaoCodigo: "100",
    nome: "Bacharelado",
    chaveConcluiu: "bachConcluiu",
    chaveRequisitos: "bachRequisitos",
    tipoArquivoInfos: "Histórico Escolar Completo USP (Bacharelado)",
    implementado: true
  },
  lic: {
    chave: "lic",
    habilitacaoCodigo: "200",
    nome: "Licenciatura",
    chaveConcluiu: "licConcluiu",
    chaveRequisitos: "licRequisitos",
    tipoArquivoInfos: "Histórico Escolar Completo USP (Licenciatura)",
    // Licenciatura fica de fora da lógica automática nesta versão —
    // ver historicoMontarResultadoNaoImplementado_ em HistoricoMotor.gs.
    implementado: false
  }
};

function historicoTodasChaves_() {
  return ["psi", "bach", "lic"];
}

function historicoConfigHabilitacao_(chave) {
  const cfg = HISTORICO_HABILITACOES[chave];
  if (!cfg) throw new Error(`Habilitação desconhecida para análise de histórico: "${chave}".`);
  return cfg;
}

// RODADA B/C — sentido inverso de historicoConfigHabilitacao_: dado um
// "habilitacao_codigo" já persistido numa linha de ANALISE_HISTORICO
// (ex.: "0", "100", "200"), devolve a chave psi/bach/lic
// correspondente. Usado só na RECONSTRUÇÃO de sessões já persistidas
// (HistoricoConsultas.gs) — o fluxo de análise ao vivo nunca precisa
// disso, porque já sabe a chave de antemão. Devolve null (nunca lança
// erro) pra um código desconhecido — uma linha antiga/corrompida com
// um código que não bate com nenhuma habilitação atual não pode
// derrubar a reconstrução da sessão inteira; quem chama decide como
// mostrar isso (ver historicoReconstruirResultadoDeLinha_).
function historicoChavePorHabilitacaoCodigo_(habilitacaoCodigo) {
  const codigo = String(habilitacaoCodigo === null || habilitacaoCodigo === undefined ? "" : habilitacaoCodigo).trim();
  const encontrada = historicoTodasChaves_().find(chave => HISTORICO_HABILITACOES[chave].habilitacaoCodigo === codigo);
  return encontrada || null;
}

// RODADA B/C — validador genérico de formato UUID (v1-v5, o mesmo
// padrão 8-4-4-4-12 hexadecimal já usado por validarFormatoRegistroId_
// em DiplomasBackend.gs para Registro ID). Existe uma cópia própria
// aqui — em vez de reaproveitar validarFormatoRegistroId_ direto —
// porque aquela função lança sempre a mesma mensagem fixa ("Identificador
// de registro inválido"), específica de Registro ID; um erro de
// sessaoAnaliseId malformado precisa de uma mensagem que fale de
// SESSÃO, não de registro, pra não confundir quem for investigar um
// erro no futuro. A REGEX em si é a mesma (não é lógica de negócio
// nova, só uma forma), então não há duplicação de decisão, só de
// validação sintática pura.
function historicoValidarFormatoUuid_(valor, rotulo) {
  if (!valor || typeof valor !== "string" ||
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(valor)) {
    throw new Error(`${rotulo || "Identificador"} inválido (esperado um UUID).`);
  }
}

// Vocabulário de resultado — adota literalmente o mesmo vocabulário
// já definido na aba DICIONARIO da planilha de Regras Curriculares
// (domínio RESULTADO_ANALISE), em vez de inventar um segundo nome
// pro mesmo conceito. Mantém a auditoria e o motor sempre alinhados
// com o que a planilha já documenta como contrato.
const HISTORICO_RESULTADO = {
  APTO: "APTO",
  NAO_APTO: "NAO_APTO",
  CONFERIR: "CONFERIR"
};

// Domínio STATUS_RECONCILIACAO da mesma aba DICIONARIO — usado pra
// checagem de identidade (NUSP do registro x NUSP do PDF) e de
// completude da extração, ANTES de qualquer avaliação de regra.
const HISTORICO_STATUS_RECONCILIACAO = {
  OK: "OK",
  ERRO_ASSOCIACAO_DOCUMENTO: "ERRO_ASSOCIACAO_DOCUMENTO",
  HABILITACAO_FALTANDO: "HABILITACAO_FALTANDO",
  EXTRACAO_INCOMPLETA: "EXTRACAO_INCOMPLETA"
};

// Letras de situação de disciplina reconhecidas no histórico da
// Jupiter (aba "Legenda" do próprio histórico) — usado só pra gerar
// avisos quando aparece uma letra fora dessa lista (nunca pra
// rejeitar; o status é sempre preservado literalmente).
const HISTORICO_STATUS_DISCIPLINA_CONHECIDOS = [
  "A", "T", "MA", "RN", "RA", "DI", "RF", "DS", "AE",
  "I", "IR", "IT", "IP", "P", "IL"
];
