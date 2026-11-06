/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Relatórios em PDF (RODADA B/C,
  FASES B3/C1/C2: relatório INDIVIDUAL (B3) e relatório CONSOLIDADO
  EFÊMERO de lote (C2) — os dois definidos NESTE arquivo. A
  orquestração de LOTE da FASE C1 (estado historicoUltimoLote, regra
  do 1, pergunta coletiva de versionamento) é inteiramente
  client-side, em HistoricoAnaliseUI.html — este arquivo só expõe os
  endpoints que ela chama (um por sessão, ou o consolidado no final
  deste arquivo) e reaproveita, para o consolidado, as MESMAS funções
  puras e o MESMO construtor de conteúdo usados no relatório
  individual, logo abaixo).

  Responsabilidade deste arquivo: a partir de uma sessão de análise JÁ
  PERSISTIDA em ANALISE_HISTORICO (lida via historicoObterSessaoAnalise,
  de HistoricoConsultas.gs — nunca por leitura própria/duplicada),
  montar e salvar UM PDF de conferência por sessão, na pasta já
  validada do(a) próprio(a) aluno(a) (a mesma usada por
  Anexos/Certificado/Ofício — garantirPastaInterno_, DiplomasBackend.gs).

  NUNCA reexecuta PDF.js, o motor de regras ou a seleção de ruleset —
  só COMPÕE, em texto, um resultado já decidido e já auditado. NUNCA
  grava nada em ANALISE_HISTORICO (permanece estritamente append-only,
  escrito só por HistoricoAuditoria.gs) e NUNCA altera nenhuma coluna
  de Diplomas/etapa/versão/ruleset/status — a única escrita que este
  módulo pode provocar é a mesma que QUALQUER operação de
  pasta/arquivo já provoca (garantirPastaInterno_ pode popular o cache
  local de link/ID de pasta se ainda estivesse vazio, e
  garantirPastaAlunoCentral_ pode criar a pasta física se ainda não
  existisse) — infraestrutura de localização de pasta, não "estado de
  fluxo" do aluno, exatamente a mesma distinção que HistoricoConsultas.gs
  já documenta para suas próprias leituras sem gate de versão/etapa.

  SÓ DocumentApp + DriveApp: o conteúdo do relatório é inerentemente
  dinâmico (quantas habilitações, quantos motivos, qual detalhamento
  cada uma tem) — não existe um "modelo" de Google Docs com
  placeholders fixos que sirva pra isso (diferente de Ofício/
  Certificado/Lista de Formandos, que TÊM um ID_MODELO_* configurado à
  mão). Por isso o documento é construído do zero, via
  DocumentApp.create + Body.append*, exatamente como gerarListaFormandos
  já faz em DiplomasBackend.gs — nenhum ID de modelo novo pra alguém
  configurar.

  VERSIONAMENTO POR NOME DE ARQUIVO: o nome
  "Relatório de Conferência de Histórico Escolar - NUSP <NUSP> -
  <NOME> - v<N>.pdf" já contém a versão — não existe uma coluna/registro
  separado de "qual a última versão". A detecção varre os arquivos já
  existentes na pasta do(a) aluno(a) (por NUSP — nunca por nome, que
  pode ter sido corrigido entre duas gerações) e usa o maior N
  encontrado. "Substituir a última versão" grava com o MESMO N (reaproveita
  substituirArquivoComSeguranca_, DiplomasBackend.gs — cria o PDF novo
  ANTES de mandar o antigo de mesmo nome pra lixeira: nunca existe uma
  janela sem nenhum arquivo daquele nome, mesmo se algo falhar no meio
  do caminho); "Criar nova versão atualizada" grava com N+1 (nome
  novo, nada é substituído). Quando NENHUM relatório anterior existe
  pra aquele NUSP, os dois modos convergem pra v1 — ver
  historicoRelatorioDecidirVersaoAlvo_ (é o que permite o lote, FASE C1,
  aplicar cegamente a MESMA escolha coletiva a todo mundo, mesmo a
  quem nunca teve relatório antes).

  NOME/NUSP usados no arquivo: preferem os da PRÓPRIA sessão auditada
  (detalheSessao.nome/nusp, gravados no momento daquela análise —
  mesmo princípio de fidelidade histórica já adotado por
  HistoricoConsultas.gs), com fallback pro nome/NUSP ATUAIS da aba
  Diplomas só quando a sessão não tiver essa informação (linha muito
  antiga/degradada) — nunca deixa o nome de arquivo comportar um campo
  vazio.
=====================================================*/

/*=====================================================
  Vocabulário/rótulos PRÓPRIOS do relatório em PDF — texto puro
  (documento oficial, sem emoji; diferente dos rótulos com emoji já
  usados na tela, em HistoricoAnaliseUI.html, que não fazem sentido
  num PDF impresso em preto-e-branco).
=====================================================*/

const HISTORICO_RELATORIO_PREFIXO_ARQUIVO = "Relatório de Conferência de Histórico Escolar";

const HISTORICO_RELATORIO_LABEL_RESULTADO = {
  APTO: "Apto",
  NAO_APTO: "Não apto",
  CONFERIR: "Conferir manualmente"
};

function historicoRelatorioRotuloResultado_(resultado) {
  return HISTORICO_RELATORIO_LABEL_RESULTADO[resultado] || `(resultado desconhecido: "${resultado}")`;
}

// Mesma classificação 3 vias de historicoIconeSituacao_
// (HistoricoAnaliseUI.html), mas devolvendo um RÓTULO DE TEXTO — um
// PDF impresso não pode depender só de cor/ícone pra transmitir
// "cumprido/não cumprido/conferir".
function historicoRelatorioRotuloSituacao_(situacao) {
  if (situacao === "CUMPRIDO" || situacao === "CUMPRIDA") return "Cumprido";
  if (situacao === "NAO_CUMPRIDO" || situacao === "NAO_CUMPRIDA") return "Não cumprido";
  return "Conferir manualmente";
}

// Espelha historicoTextoValorRequisito_ (HistoricoAnaliseUI.html) —
// mesma regra de negócio, cópia server-side porque aquela vive no
// client (não pode ser chamada daqui) e o texto é curto o bastante
// pra não valer a pena tentar compartilhar entre os dois lados.
function historicoRelatorioTextoValorRequisito_(r) {
  if (r.valorObtido === null || r.valorObtido === undefined) {
    return r.obrigatorio === false
      ? "não encontrado no PDF (requisito não obrigatório — não impede o parecer)"
      : "não encontrado no PDF";
  }
  return `obtido ${r.valorObtido} / exigido ${r.operador} ${r.valorExigido}${r.unidade ? " " + r.unidade : ""}`;
}

/*=====================================================
  RODADA B/C.1.2 (pedido de correção, item 3) — NOVO LAYOUT dos
  relatórios INDIVIDUAL e CONSOLIDADO, no padrão pedido pelo Serviço de
  Graduação (arquivo "modelo de relatório geral.docx"): timbre da
  Universidade (brasão + "UNIVERSIDADE DE SÃO PAULO" / "INSTITUTO DE
  PSICOLOGIA"), título único "Relatório de Conferência de Requisitos
  para Formação", cada habilitação como UMA linha "Nome: Resultado."
  (com "Motivo:" só quando NÃO Apto, sempre por extenso) e o
  disclaimer curto no RODAPÉ do conteúdo (não mais no topo). Aplicado
  aos dois relatórios (pedido explícito: "aplique este layout tanto no
  relatório individual como no consolidado") — o individual continua
  podendo trazer MAIS detalhe abaixo de cada linha (também pedido
  explícito: "No relatório individual você pode colocar mais
  detalhes"); o consolidado fica só no resumo compacto do modelo.

  Constantes/funções DELIBERADAMENTE locais a este novo layout — nunca
  reaproveitam nem alteram HISTORICO_RELATORIO_LABEL_RESULTADO/
  historicoRelatorioRotuloResultado_ (acima — continuam servindo o
  rodapé técnico e qualquer outro uso que preserve a grafia antiga
  "Não apto"/"Conferir manualmente"): o modelo pede grafia própria, com
  maiúscula e ponto final ("Não Apto.", "A conferir.").
=====================================================*/

// Grafia EXATA pedida pelo modelo (maiúscula/pontuação próprias —
// note a diferença de HISTORICO_RELATORIO_LABEL_RESULTADO, acima).
const HISTORICO_RELATORIO_LABEL_RESULTADO_NOVO_LAYOUT = {
  APTO: "Apto",
  NAO_APTO: "Não Apto.",
  CONFERIR: "A conferir."
};

function historicoRelatorioRotuloResultadoNovoLayout_(resultado) {
  return HISTORICO_RELATORIO_LABEL_RESULTADO_NOVO_LAYOUT[resultado] || `(resultado desconhecido: "${resultado}")`;
}

// Cor do timbre (nome da Universidade/Instituto e rodapé de página) —
// obtida por amostragem de pixel do próprio arquivo-modelo enviado
// pelo usuário ("modelo de relatório geral.docx", convertido em
// imagem só pra esta amostragem) — não é uma cor "oficial" copiada de
// um manual de marca (nenhum foi anexado): é o azul escuro
// efetivamente usado no timbre do modelo, próximo do azul padrão já
// usado noutros documentos do Serviço de Graduação.
const HISTORICO_RELATORIO_COR_TIMBRE = "#000060";

// Base64 do brasão do IPUSP pro timbre — recebido do usuário nesta
// rodada (PNG 170×175px, o símbolo "Ψ" em branco sobre listras azuis;
// mandado como anexo direto no chat, com um link do Google Drive como
// alternativa caso o anexo não tivesse funcionado). Todo o código de
// timbre já estava pronto pra usar (historicoRelatorioEscreverTimbre_,
// abaixo) antes mesmo da imagem chegar; o try/catch dentro dela
// continua de pé, então um base64 corrompido (agora, ou numa troca
// futura de imagem) nunca derruba a geração do relatório — só degrada
// graciosamente pra só texto.
const HISTORICO_RELATORIO_LOGO_BASE64 = "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";

// Escreve o timbre (brasão + nome da Universidade/Instituto) no topo
// do documento — função COMPARTILHADA pelos dois relatórios
// (individual e consolidado, chamada por cada orquestrador). Usa uma
// tabela de 1 linha e 2 colunas SEM borda quando há logo (truque
// padrão do DocumentApp pra pôr imagem e texto lado a lado — não
// existe "container flex" nesta API); sem logo, cai pra só o texto
// centralizado. A imagem é redimensionada MANTENDO a proporção
// original: lê a largura/altura natural via getWidth()/getHeight()
// logo depois do appendImage (antes de qualquer setWidth/setHeight) e
// calcula a altura proporcional pra uma largura-alvo fixa de 70pt —
// nunca força um quadrado 70×70, que distorceria (levemente) a imagem
// recebida, 170×175px, ~3% mais alta que larga. Uma falha ao
// decodificar o base64 (imagem corrompida) nunca derruba a geração do
// relatório — a célula fica só com o parágrafo vazio padrão.
function historicoRelatorioEscreverTimbre_(corpo) {

  if (HISTORICO_RELATORIO_LOGO_BASE64) {
    const tabela = corpo.appendTable();
    tabela.setBorderWidth(0);
    const linha = tabela.appendTableRow();

    const celulaLogo = linha.appendTableCell();
    try {
      const blob = Utilities.newBlob(Utilities.base64Decode(HISTORICO_RELATORIO_LOGO_BASE64), "image/png", "brasao.png");
      const imagem = celulaLogo.appendImage(blob);
      const larguraAlvo = 70;
      const larguraNatural = imagem.getWidth();
      const alturaNatural = imagem.getHeight();
      imagem.setWidth(larguraAlvo);
      imagem.setHeight(larguraNatural ? Math.round(larguraAlvo * (alturaNatural / larguraNatural)) : larguraAlvo);
    } catch (e) {
      // Base64 inválido/corrompido — célula fica vazia, sem derrubar o relatório.
    }
    celulaLogo.setWidth(80);

    const celulaTexto = linha.appendTableCell();
    ["UNIVERSIDADE DE SÃO PAULO", "INSTITUTO DE PSICOLOGIA"].forEach(texto => {
      const p = celulaTexto.appendParagraph(texto);
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      p.editAsText().setBold(true).setForegroundColor(HISTORICO_RELATORIO_COR_TIMBRE).setFontSize(13);
    });
  } else {
    ["UNIVERSIDADE DE SÃO PAULO", "INSTITUTO DE PSICOLOGIA"].forEach(texto => {
      const p = corpo.appendParagraph(texto);
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      p.editAsText().setBold(true).setForegroundColor(HISTORICO_RELATORIO_COR_TIMBRE).setFontSize(13);
    });
  }

  corpo.appendParagraph("");

}

// Rodapé de PÁGINA (não confundir com o rodapé TÉCNICO "Layout do
// relatório: vX", que é conteúdo do corpo, no fim do documento) —
// endereço/telefone/e-mail do Serviço de Graduação, transcritos do
// próprio modelo enviado pelo usuário. Reaproveita EMAIL_REMETENTE
// (DiplomasBackend.gs — a mesma conta usada por todo o resto do
// sistema pra e-mail institucional) pro e-mail, nunca um segundo
// literal desalinhado dele; endereço/telefone não têm constante
// própria em nenhum outro lugar do projeto (Ofício/Certificado usam
// um modelo de Google Docs pronto, com timbre/rodapé já embutidos no
// arquivo — nada a reaproveitar em código), então ficam literais,
// só usados por este layout. Documento sempre novo
// (DocumentApp.create, nunca reaproveitado) — nunca duplica rodapé em
// chamadas sucessivas.
function historicoRelatorioEscreverRodapePagina_(doc) {
  const rodape = doc.addFooter();
  const linha1 = rodape.appendParagraph("Av. Prof. Mello Moraes, 1721 – Cidade Universitária – 05508-030 – São Paulo – SP – Brasil");
  const linha2 = rodape.appendParagraph(`Fone:3091-4177 – e-mail: ${EMAIL_REMETENTE}`);
  [linha1, linha2].forEach(p => {
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    p.editAsText().setFontSize(8).setForegroundColor(HISTORICO_RELATORIO_COR_TIMBRE);
  });
}

// Título único do novo layout — mesmo texto nos dois relatórios, igual
// ao modelo. DELIBERADAMENTE diferente de
// HISTORICO_RELATORIO_PREFIXO_ARQUIVO ("Relatório de Conferência de
// Histórico Escolar", acima) — aquele texto segue reservado pro NOME
// DO ARQUIVO/detecção de versão; mudar o título EXIBIDO dentro do PDF
// não pode, de propósito, mudar o nome de arquivo já em uso (mesmo
// princípio já registrado por historicoRelatorioEscreverConteudoSessao_,
// mais abaixo, desde a RODADA B/C.1.1).
const HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT = "Relatório de Conferência de Requisitos para Formação";

// Disclaimer curto do novo layout — texto EXATO do modelo enviado
// pelo usuário (resposta à pergunta de esclarecimento: "Usar o texto
// curto do modelo"), incluindo a vírgula final — substitui, nos dois
// relatórios, o disclaimer mais longo da RODADA B/C.1.1 ("...e às
// deliberações dos órgãos competentes."). Também MUDOU DE LUGAR: no
// modelo, este texto fica no RODAPÉ do documento (depois de
// "Relatório gerado em:"), não mais no topo.
const HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT = "Relatório de apoio à conferência acadêmica, sujeito à validação administrativa,";

// Traduz os ÚNICOS símbolos técnicos que ainda podem sobrar num texto
// "por extenso" (pedido explícito do item 3: "sempre coloque por
// extenso, exceto os números" — ex. "360h" vira "360 horas"). As
// UNIDADES já são sempre por extenso em todo o código-fonte
// (conferido: só "créditos"/"créditos-aula"/"horas", nunca abreviado —
// historicoRelatorioTextoValorRequisito_, acima, e o motor de regras,
// HistoricoMotor.gs) — o único símbolo que sobra na prática é o
// OPERADOR de comparação (conferido: só ">=" existe hoje no motor de
// regras — as traduções de "<="/"==" abaixo são só defensivas, pro dia
// em que uma regra nova use outro operador, nunca observadas até
// agora). PURO — string para string, nunca lança erro.
function historicoRelatorioLimparSimbolosPorExtenso_(texto) {
  return String(texto || "")
    .replace(/>=/g, "no mínimo")
    .replace(/<=/g, "no máximo")
    .replace(/==/g, "exatamente");
}

// PURO — "Motivo" por extenso, uma frase só, pro resultado NÃO
// Apto/Conferir de uma habilitação — nunca reimplementa nenhuma regra
// do motor (HistoricoMotor.gs, intocado): só ESCOLHE e LIMPA (ver
// historicoRelatorioLimparSimbolosPorExtenso_, acima) texto que já
// existe, decidido e persistido no momento da análise.
//
// Dois níveis, nesta ordem de preferência:
//  1) linhas de Detalhamento (historicoRelatorioMontarLinhasDetalhes_,
//     acima — MESMOS rótulos já corretos/testados usados na tela e no
//     relatório individual "de detalhe") que NÃO estão CUMPRIDA: uma
//     frase por linha, unidas em ponto-e-vírgula.
//  2) só quando (1) não encontra nenhuma linha aplicável (ex.: falha
//     de GRUPO_DISCIPLINAS — depois da correção do item 2, um grupo
//     não cumprido não deixa mais linha nenhuma em Detalhamento; ou
//     ESTRUTURA_EXTRACAO, que nunca aparece em Detalhamento) — cai
//     pro motivo já derivado por historicoRelatorioDerivarPendenciaPrincipal_
//     (abaixo, REAPROVEITADA sem nenhuma alteração), a mesma escolha
//     já usada no consolidado desde a RODADA B/C.1.
// Nunca lança erro; nunca devolve string vazia pra um resultado NÃO
// Apto/Conferir (sempre tem, no mínimo, o fallback genérico do nível 2).
function historicoRelatorioMontarMotivoPorExtenso_(resultado) {

  if (!resultado) return "(sem resultado)";
  if (resultado.resultado === "APTO") return "";

  const linhasDetalhes = historicoRelatorioMontarLinhasDetalhes_(resultado.detalhes);
  const linhasPendentes = linhasDetalhes.filter(l => l.situacao !== "CUMPRIDO" && l.situacao !== "CUMPRIDA");

  if (linhasPendentes.length > 0) {
    return linhasPendentes
      .map(l => `${l.rotulo}: ${historicoRelatorioRotuloSituacao_(l.situacao)} (${historicoRelatorioLimparSimbolosPorExtenso_(l.valorTexto)})`)
      .join("; ");
  }

  return historicoRelatorioLimparSimbolosPorExtenso_(historicoRelatorioDerivarPendenciaPrincipal_(resultado));

}

/*=====================================================
  PURO — nome de arquivo (montagem + extração da versão) e decisão de
  versionamento. Zero chamada a Sheets/Drive/DocumentApp aqui — testável
  no harness Node (ver HistoricoTestes.gs).
=====================================================*/

function historicoRelatorioValidarModoVersionamento_(valor) {
  if (valor !== "substituir" && valor !== "nova") {
    throw new Error(`Modo de versionamento de relatório inválido: "${valor}" (esperado "substituir" ou "nova").`);
  }
  return valor;
}

// Escapa caracteres especiais de regex — nusp já é só dígitos
// (normalizarNUsp_ garante isso na entrada de dados), mas escapa
// mesmo assim por defesa em profundidade (nunca confia que um valor
// vindo de uma célula/objeto já reconstruído está no formato esperado).
function historicoRelatorioEscaparRegex_(texto) {
  return String(texto || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function historicoRelatorioMontarRegexNomeArquivo_(nusp) {
  const prefixoEscapado = historicoRelatorioEscaparRegex_(HISTORICO_RELATORIO_PREFIXO_ARQUIVO);
  const nuspEscapado = historicoRelatorioEscaparRegex_(nusp);
  return new RegExp(`^${prefixoEscapado} - NUSP ${nuspEscapado} - .+ - v(\\d+)\\.pdf$`);
}

// Devolve o número de versão (inteiro) se nomeArquivo bate com o
// padrão EXATO do relatório PARA ESTE nusp, ou null caso contrário
// (prefixo diferente, NUSP diferente, sem ".pdf", sem "- vN" etc.) —
// NUNCA lança erro (um arquivo qualquer solto na pasta, de outro tipo
// de documento, é só ignorado pela varredura que chama esta função).
// Casa por NUSP, nunca por nome — o nome no meio do arquivo pode ter
// sido corrigido entre duas gerações de relatório da MESMA pessoa (ver
// cabeçalho do arquivo); ainda assim reconhece a versão anterior.
function historicoRelatorioExtrairVersaoDeNomeArquivo_(nomeArquivo, nusp) {
  const m = historicoRelatorioMontarRegexNomeArquivo_(nusp).exec(String(nomeArquivo || ""));
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isNaN(n) ? null : n;
}

// Sanitiza o NOME especificamente para entrar no MEIO do nome do
// arquivo do relatório — DIFERENTE de sanitizarNomeArquivo_
// (DiplomasBackend.gs), que trunca a STRING JÁ MONTADA em 150
// caracteres: aplicado à string inteira (incluindo o sufixo
// "- v<N>.pdf"), um nome longo o bastante truncaria justamente o
// sufixo de versão — corrompendo tanto a leitura visual quanto a
// PRÓPRIA detecção de versão na próxima vez que este arquivo for
// listado. Por isso trunca SÓ o nome (orçamento generoso, mas
// limitado) ANTES de montar a string final, que nunca mais é
// re-truncada depois de pronta.
function historicoRelatorioSanitizarNomeParaArquivo_(nome) {
  let texto = String(nome === null || nome === undefined ? "" : nome).trim();
  texto = texto.replace(/[\u0000-\u001F\u007F]/g, "");
  texto = texto.replace(/[\/\\]/g, "-");
  if (texto.length > 80) texto = texto.slice(0, 80).trim();
  return texto || "Aluno";
}

function historicoRelatorioMontarNomeArquivo_(nusp, nome, versao) {
  const nuspTexto = String(nusp || "").trim() || "(sem-nusp)";
  const nomeTexto = historicoRelatorioSanitizarNomeParaArquivo_(nome);
  const versaoTexto = String(parseInt(versao, 10));
  return `${HISTORICO_RELATORIO_PREFIXO_ARQUIVO} - NUSP ${nuspTexto} - ${nomeTexto} - v${versaoTexto}.pdf`;
}

// Tabela de decisão central do versionamento (ver cabeçalho do
// arquivo): "substituir" sem nada anterior pra substituir CAI PARA
// v1 (nunca erro) — é o que deixa o lote (FASE C1) aplicar a mesma
// escolha coletiva "substituir" a alunos que nunca tiveram relatório
// nenhum antes, sem precisar de uma detecção prévia por aluno.
function historicoRelatorioDecidirVersaoAlvo_(existeAnterior, ultimaVersao, modoVersionamento) {
  historicoRelatorioValidarModoVersionamento_(modoVersionamento);
  if (!existeAnterior) return 1;
  return modoVersionamento === "substituir" ? ultimaVersao : ultimaVersao + 1;
}

/*=====================================================
  PURO — achatamento de "detalhes" em linhas de exibição. Mesma
  travessia/ORDEM de historicoRenderizarDetalhes_ (HistoricoAnaliseUI.html:
  tempo de curso, obrigatórias, eletivas, livres, estágio, AAC, EXT,
  requisitos numéricos extras, disciplinas específicas, grupos de
  disciplinas) — mas devolve DADOS (array de linhas), nunca nós de
  DOM/DocumentApp, exatamente pra poder ser testado no harness Node e
  reaproveitado tanto no PDF individual quanto no consolidado (FASE C2).
  "grupo" (só presente nas linhas vindas de gruposDisciplinas) marca
  quando uma nova sub-seção de grupo deve ser aberta antes da linha.
=====================================================*/
function historicoRelatorioMontarLinhasDetalhes_(detalhes) {

  const linhas = [];
  if (!detalhes) return linhas;

  const tc = detalhes.tempoCurso;
  if (tc) {
    let valor, nota;
    if (tc.semestresValidos === null || tc.semestresValidos === undefined) {
      valor = "não verificado";
      nota = null;
    } else if (tc.excedeMaximo) {
      valor = `${tc.semestresValidos} semestre(s) válido(s) — acima do máximo`;
      nota = `Máximo configurado: ${tc.semestresMaximos} semestre(s). Necessita análise humana.`;
    } else {
      valor = `${tc.semestresValidos} semestre(s) válido(s)`;
      nota = (tc.semestresMaximos === null || tc.semestresMaximos === undefined)
        ? `Mínimo exigido: ${tc.semestresMinimos} semestre(s).`
        : `Faixa configurada: mínimo ${tc.semestresMinimos} / máximo ${tc.semestresMaximos} semestre(s).`;
    }
    linhas.push({ rotulo: "Tempo de curso", situacao: tc.situacao, valorTexto: valor, nota: nota, grupo: undefined });
  }

  const REQUISITOS_ORDEM = [
    ["creditosObrigatorios", "Créditos Obrigatórios"],
    ["creditosEletivas", "Créditos em Eletivas"],
    ["creditosLivres", "Créditos em Livres"],
    ["estagio", "Horas de Estágio"],
    ["aac", "Horas de AAC"],
    ["ext", "Horas de EXT"]
  ];

  REQUISITOS_ORDEM.forEach(par => {
    const chave = par[0], rotulo = par[1];
    const r = detalhes[chave];
    if (!r) return;
    let nota = null;
    if (r.compensacao) {
      nota = `Compensação aplicada: excedente de ${r.compensacao.excedenteEletivas} crédito(s) em eletivas somado ` +
        `às livres (${r.compensacao.livresObtidasBruto} + ${r.compensacao.excedenteEletivas} = ${r.compensacao.livresConsideradas}).`;
    }
    linhas.push({ rotulo: rotulo, situacao: r.situacao, valorTexto: historicoRelatorioTextoValorRequisito_(r), nota: nota, grupo: undefined });
  });

  (detalhes.outrosRequisitosNumericos || []).forEach(r => {
    linhas.push({ rotulo: r.descricao || r.criterio, situacao: r.situacao, valorTexto: historicoRelatorioTextoValorRequisito_(r), nota: null, grupo: undefined });
  });

  (detalhes.disciplinasObrigatoriasEspecificas || []).forEach(d => {
    const rotulo = d.sigla + (d.nome ? " — " + d.nome : "");
    const valor = d.situacao === "CUMPRIDA" ? "cursada" : (d.naoEncontrada ? "não encontrada no histórico" : "sem situação de aprovação");
    linhas.push({ rotulo: rotulo, situacao: d.situacao, valorTexto: valor, nota: null, grupo: undefined });
  });

  // RODADA B/C.1.2 (pedido de correção, item 2) — só os membros
  // CURSADOS do grupo entram na lista (mesma mudança espelhada em
  // HistoricoAnaliseUI.html/historicoRenderizarDetalhes_, acima). Se
  // nenhum membro foi cursado, nenhuma linha é gerada pra esse grupo —
  // o cabeçalho da sub-seção (abaixo, no laço que escreve o PDF) só é
  // aberto quando existe ao menos uma linha com aquele `grupo`.
  (detalhes.gruposDisciplinas || []).forEach(g => {
    (g.membros || [])
      .filter(m => m.situacao === "CUMPRIDA")
      .forEach(m => {
        const rotulo = m.sigla + (m.nome ? " — " + m.nome : "");
        linhas.push({ rotulo: rotulo, situacao: m.situacao, valorTexto: "cursada", nota: null, grupo: g.nomeGrupo || "" });
      });
  });

  return linhas;

}

// PURO — RODADA B/C.1 (§13): primeiro cursoCodigoDocumento não-nulo
// entre as habilitações com resultado desta sessão, na ORDEM de
// chavesComResultado — NUNCA recalcula/adivinha, só projeta o que já
// veio de historicoReconstruirResultadoDeLinha_ (HistoricoConsultas.gs,
// §12) ou do contrato ao vivo equivalente. null quando nenhuma
// habilitação tiver esse dado disponível — nunca inventa um
// currículo.
function historicoRelatorioIdentificarCursoSessao_(detalheSessao, chavesComResultado) {
  for (let i = 0; i < chavesComResultado.length; i++) {
    const resultado = detalheSessao.resultados[chavesComResultado[i]];
    if (resultado && resultado.cursoCodigoDocumento) return resultado.cursoCodigoDocumento;
  }
  return null;
}

// PURO — RODADA B/C.1 (§13): monta a lista DEDUPLICADA de
// documento(s) efetivamente analisado(s) nesta sessão — quando
// Psi+Bach reaproveitaram o MESMO arquivo (documentoDeOutraHabilitacao,
// ver HistoricoEndpoints.gs), aparece UMA vez só, com as DUAS
// habilitações listadas junto; arquivos diferentes aparecem
// separados. Deduplicação por arquivoId quando presente; cai pra
// "arquivoNome::arquivoModificadoEm" quando arquivoId não está
// disponível (linha muito antiga/degradada) — nunca deduplica só por
// nome sozinho. Uma habilitação sem arquivoNome nenhum (erro técnico
// antes da extração, Licenciatura não implementada) simplesmente não
// entra na lista — não é um "documento analisado" de verdade.
function historicoRelatorioMontarListaDocumentosAnalisados_(detalheSessao, chavesComResultado) {

  const porChaveDeduplicacao = {};
  const ordem = [];

  chavesComResultado.forEach(chave => {
    const resultado = detalheSessao.resultados[chave];
    if (!resultado || !resultado.arquivoNome) return;

    const chaveDedup = resultado.arquivoId || `${resultado.arquivoNome}::${resultado.arquivoModificadoEm || ""}`;

    if (!porChaveDeduplicacao[chaveDedup]) {
      porChaveDeduplicacao[chaveDedup] = {
        arquivoNome: resultado.arquivoNome,
        arquivoModificadoEm: resultado.arquivoModificadoEm,
        habilitacoes: []
      };
      ordem.push(chaveDedup);
    }
    porChaveDeduplicacao[chaveDedup].habilitacoes.push(chave);
  });

  return ordem.map(chaveDedup => porChaveDeduplicacao[chaveDedup]);

}

/*=====================================================
  IMPURO — Drive (detecção de versão existente). Não coberto pelo
  harness Node (precisa de DriveApp real) — mesma fronteira já adotada
  em todo o módulo (ex.: historicoLerLinhasAuditoriaPorRegistro_ em
  HistoricoConsultas.gs).
=====================================================*/

function historicoRelatorioListarVersoesExistentes_(pastaValidada, nusp) {
  const versoes = [];
  const iterador = pastaValidada.getFilesByType(MimeType.PDF);
  while (iterador.hasNext()) {
    const v = historicoRelatorioExtrairVersaoDeNomeArquivo_(iterador.next().getName(), nusp);
    if (v !== null) versoes.push(v);
  }
  return versoes;
}

function historicoRelatorioDetectarUltimaVersao_(pastaValidada, nusp) {
  const versoes = historicoRelatorioListarVersoesExistentes_(pastaValidada, nusp);
  if (versoes.length === 0) return { existeAnterior: false, ultimaVersao: 0 };
  return { existeAnterior: true, ultimaVersao: Math.max.apply(null, versoes) };
}

// RODADA B/C.1 (§8) — substitui o(s) relatório(s) de UM NUSP+VERSÃO-
// ALVO específico, NUNCA por nome exato de arquivo (diferente de
// substituirArquivoComSeguranca_, DiplomasBackend.gs — reaproveitada
// por Anexos/Certificado/Ofício, e que continua INTOCADA: este é um
// helper NOVO e PRÓPRIO deste módulo, não uma alteração daquela
// função). O helper original localiza o(s) arquivo(s) a trocar pelo
// NOME EXATO do arquivo novo — quebra exatamente no caso descrito na
// especificação desta rodada: o nome do(a) aluno(a) é corrigido entre
// duas gerações do MESMO relatório (mesmo NUSP, mesma versão-alvo),
// o novo nome de arquivo fica diferente do antigo, e o arquivo antigo
// (com o nome anterior) nunca é encontrado pra ir pra lixeira —
// sobrevivem dois arquivos da MESMA versão lado a lado.
//
// Mesma disciplina crash-safe do helper original: cria o PDF novo
// PRIMEIRO, confirma que existe de verdade, e SÓ DEPOIS tenta remover
// os antigos — nunca existe uma janela sem nenhum arquivo daquele
// NUSP+versão, mesmo se algo falhar no meio do caminho. Diferente do
// helper original, o critério de remoção aqui é: (a) mesma pasta já
// validada, (b) casa o padrão de nome do relatório PARA ESTE NUSP
// (historicoRelatorioExtrairVersaoDeNomeArquivo_ — que já ignora
// qualquer arquivo de outro tipo/NUSP, devolvendo null), (c) a versão
// extraída é EXATAMENTE igual à versão-alvo desta chamada (nunca uma
// versão menor, nunca maior) e (d) não é o arquivo novo recém-criado.
// Chamado por historicoRelatorioGerarPdfSessao_ dentro da MESMA seção
// travada por LockService que decide a versão-alvo (ver §9,
// historicoRelatorioGerarPdfSessao_, abaixo) — este helper em si não
// trava nada sozinho, é responsabilidade de quem chama.
//
// RODADA B/C.1.1 (§4) — CORRIGIDO: falha ao CRIAR o novo PDF continua
// lançando erro, e nada é removido (comportamento já correto, mantido
// abaixo sem mudança). Mas falha ao REMOVER um antigo da MESMA
// NUSP+versão (ex: candidato.setTrashed(true) lançando por qualquer
// motivo — permissão, arquivo já em uso, erro transiente do Drive)
// NUNCA MAIS derruba a função inteira: o novo PDF já existe e é
// válido, então ele nunca é descartado só porque a faxina de um
// arquivo velho falhou. Cada falha de remoção vira um AVISO coletado
// (nunca uma exceção), e a função sempre devolve sucesso — quem chama
// decide o que fazer com os avisos (ver historicoRelatorioGerarPdfSessao_
// e a UI, HistoricoAnaliseUI.html, que mostra ✅ + ⚠️ quando há aviso).
// Retorno mudou de "o File novo" pra "{arquivo, avisos}" — todo
// call site foi atualizado.
function historicoRelatorioSubstituirPorNuspEVersao_(pastaValidada, nusp, versaoAlvo, criarNovoArquivo) {

  const novoArquivo = criarNovoArquivo();

  if (!novoArquivo || !novoArquivo.getId()) {
    throw new Error("Falha ao criar o novo PDF do relatório — nada foi removido da pasta.");
  }

  const avisos = [];
  const iterador = pastaValidada.getFilesByType(MimeType.PDF);
  while (iterador.hasNext()) {
    const candidato = iterador.next();
    if (candidato.getId() === novoArquivo.getId()) continue;
    const versaoCandidato = historicoRelatorioExtrairVersaoDeNomeArquivo_(candidato.getName(), nusp);
    if (versaoCandidato !== versaoAlvo) continue;
    try {
      candidato.setTrashed(true);
    } catch (err) {
      avisos.push(
        `O novo relatório foi criado, mas uma cópia anterior da mesma versão ("${candidato.getName()}") não pôde ` +
        `ser removida (${(err && err.message) || err}). Confira a pasta do(a) aluno(a).`
      );
    }
  }

  return { arquivo: novoArquivo, avisos: avisos };

}

/*=====================================================
  IMPURO — construção do conteúdo (DocumentApp). Não coberto pelo
  harness Node — a checagem visual do PDF fica pro roteiro manual
  (mesmo limite de escopo já assumido pelas telas de
  HistoricoAnaliseUI.html: DOM/Doc-rendering em si não é testado por
  asserts automáticos, só a lógica pura que decide O QUE mostrar).

  Escrito para ser chamado tanto para um relatório INDIVIDUAL (um
  Document só para esta sessão) quanto, seção por seção, dentro de um
  Document MAIOR compartilhado por vários alunos (relatório
  consolidado, FASE C2) — por isso nunca mexe em configuração do
  Document inteiro (margens, etc.), só em Body.append*.
=====================================================*/

function historicoRelatorioEscreverCabecalhoSessao_(corpo, detalheSessao, contexto, chavesComResultado) {

  // RODADA B/C.1.2 (item 3) — linha de identificação no padrão do
  // novo layout ("Nome, N. USP NUSP", uma linha só — mesmo padrão do
  // modelo enviado pelo usuário e do bloco por aluno(a) do
  // consolidado, historicoRelatorioEscreverBlocoAluno_, abaixo).
  // Substitui as duas linhas separadas "Aluno(a): ..."/"Nº USP: ..."
  // usadas até a rodada anterior.
  const nomeTexto = detalheSessao.nome || "(nome não registrado na auditoria)";
  const nuspTexto = detalheSessao.nusp || "(não registrado)";
  const nomeEl = corpo.appendParagraph(`${nomeTexto}, N. USP ${nuspTexto}`);
  nomeEl.editAsText().setBold(true);

  // RODADA B/C.1.2 (item 3) — "Currículo" reposicionado pra logo
  // abaixo do nome (mesma posição do modelo). Cálculo e texto
  // continuam EXATAMENTE os mesmos de antes
  // (historicoRelatorioIdentificarCursoSessao_, nunca recalculado), só
  // mudou de lugar dentro do cabeçalho — o resto da rastreabilidade
  // (RODADA B/C.1 §13, abaixo) continua, sem mudança nenhuma, como
  // "mais detalhes" do relatório individual (pedido explícito do item
  // 3).
  const cursoIdentificado = historicoRelatorioIdentificarCursoSessao_(detalheSessao, chavesComResultado || []);
  corpo.appendParagraph(`Currículo: ${cursoIdentificado || "(não identificado)"}`);

  corpo.appendParagraph(`Sessão analisada em: ${contexto.analisadoEmTexto}`);

  const linhaGeracao = contexto.versao
    ? `Documento gerado em: ${contexto.geradoEmTexto}  (v${contexto.versao} deste relatório para este(a) aluno(a))`
    : `Documento gerado em: ${contexto.geradoEmTexto}`;
  corpo.appendParagraph(linhaGeracao);

  // RODADA B/C.1 (§13) — identificação/rastreabilidade adicional no
  // cabeçalho: o identificador da PRÓPRIA sessão de análise (liga
  // este PDF de volta à(s) linha(s) de ANALISE_HISTORICO que o
  // auditam) — nunca recalculado aqui, só projetado do que já foi
  // decidido/persistido no momento da análise (ver
  // historicoRelatorioMontarListaDocumentosAnalisados_, abaixo).
  corpo.appendParagraph(`Identificador da sessão de análise: ${detalheSessao.sessaoAnaliseId || "(não registrado)"}`);

  const documentosAnalisados = historicoRelatorioMontarListaDocumentosAnalisados_(detalheSessao, chavesComResultado || []);
  if (documentosAnalisados.length > 0) {
    corpo.appendParagraph("Documento(s) analisado(s):").editAsText().setBold(true);
    documentosAnalisados.forEach(doc => {
      const modificadoTexto = doc.arquivoModificadoEm
        ? Utilities.formatDate(new Date(doc.arquivoModificadoEm), TIMEZONE, "dd/MM/yyyy HH:mm")
        : "(data não registrada)";
      const habilitacoesTexto = doc.habilitacoes.map(chave => historicoConfigHabilitacao_(chave).nome).join(" + ");
      const item = corpo.appendListItem(`${doc.arquivoNome} (modificado em ${modificadoTexto}) — usado para: ${habilitacoesTexto}`);
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
    });
  }

  if (detalheSessao.legado) {
    const avisoLegado = corpo.appendParagraph(
      "Esta análise é anterior à introdução do agrupamento por sessão — cada habilitação foi originalmente " +
      "registrada de forma isolada."
    );
    avisoLegado.editAsText().setItalic(true);
  }

  (detalheSessao.avisos || []).forEach(aviso => {
    corpo.appendParagraph("⚠ " + aviso).editAsText().setBold(true);
  });

  corpo.appendParagraph("");

}

function historicoRelatorioEscreverSecaoHabilitacao_(corpo, chave, resultado) {

  const cfg = historicoConfigHabilitacao_(chave);

  // RODADA B/C.1.2 (item 3) — linha-resumo no padrão do novo layout:
  // "Nome da habilitação: Status." como item de lista (nunca mais uma
  // seção HEADING3 separada) — mesmo padrão do modelo e do bloco por
  // aluno(a) do consolidado (historicoRelatorioEscreverBlocoAluno_,
  // abaixo), com "Motivo:" como sub-item só quando NÃO Apto, sempre
  // por extenso (historicoRelatorioMontarMotivoPorExtenso_, acima).
  const rotulo = historicoRelatorioRotuloResultadoNovoLayout_(resultado.resultado);
  const itemHabilitacao = corpo.appendListItem(`${cfg.nome}: ${rotulo}`);
  itemHabilitacao.setGlyphType(DocumentApp.GlyphType.BULLET);
  itemHabilitacao.editAsText().setBold(true);

  if (resultado.resultado !== "APTO") {
    const motivoTexto = historicoRelatorioMontarMotivoPorExtenso_(resultado);
    const itemMotivo = corpo.appendListItem(`Motivo: ${motivoTexto}`);
    itemMotivo.setGlyphType(DocumentApp.GlyphType.BULLET);
    itemMotivo.setNestingLevel(1);
  }

  // A PARTIR DAQUI: "mais detalhes" — só no relatório individual
  // (pedido explícito do item 3), nunca no consolidado (que usa só o
  // bloco compacto acima — historicoRelatorioEscreverBlocoAluno_ NUNCA
  // chama esta função). Mesmo conteúdo técnico já existente
  // (parecer/motivos crus do motor/Detalhamento/avisos técnicos/
  // rodapé técnico), agora reindentado como elaboração subordinada à
  // linha-resumo acima, e com o texto de "valor" do Detalhamento
  // passando pela mesma limpeza de símbolos "por extenso"
  // (historicoRelatorioLimparSimbolosPorExtenso_) usada no Motivo —
  // item 3: "sempre coloque por extenso, exceto os números".
  if (resultado.parecerTexto) {
    const p = corpo.appendParagraph(resultado.parecerTexto);
    p.setIndentStart(36);
    p.editAsText().setItalic(true).setFontSize(9);
  }

  if (resultado.motivos && resultado.motivos.length > 0) {
    const rotuloMotivos = corpo.appendParagraph("Motivos (detalhamento técnico):");
    rotuloMotivos.setIndentStart(36);
    rotuloMotivos.editAsText().setBold(true).setFontSize(9);
    resultado.motivos.forEach(m => {
      const prefixo = m.severidade === "BLOQUEIO" ? "[BLOQUEIO] " : (m.severidade === "AVISO" ? "[AVISO] " : "");
      const item = corpo.appendListItem(prefixo + (m.mensagem || ""));
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
      item.setNestingLevel(1);
      item.editAsText().setFontSize(9);
      if (m.severidade === "BLOQUEIO") item.editAsText().setBold(true);
    });
  }

  const linhasDetalhes = historicoRelatorioMontarLinhasDetalhes_(resultado.detalhes);
  if (linhasDetalhes.length > 0) {
    const rotuloDet = corpo.appendParagraph("Detalhamento:");
    rotuloDet.setIndentStart(36);
    rotuloDet.editAsText().setBold(true).setFontSize(9);
    let grupoAberto = null;
    linhasDetalhes.forEach(l => {
      if (l.grupo !== undefined && l.grupo !== grupoAberto) {
        grupoAberto = l.grupo;
        if (grupoAberto) {
          const g = corpo.appendParagraph(grupoAberto);
          g.setIndentStart(36);
          g.editAsText().setBold(true).setItalic(true).setFontSize(9);
        }
      }
      const textoValor = historicoRelatorioLimparSimbolosPorExtenso_(l.valorTexto);
      const item = corpo.appendListItem(`${l.rotulo}: ${historicoRelatorioRotuloSituacao_(l.situacao)} — ${textoValor}`);
      item.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
      item.setNestingLevel(2);
      item.editAsText().setFontSize(9);
      if (l.nota) {
        const notaEl = corpo.appendParagraph(l.nota);
        notaEl.setIndentStart(54);
        notaEl.editAsText().setItalic(true).setFontSize(8);
      }
    });
  }

  const avisosTecnicos = (resultado.avisosParser || [])
    .concat((resultado.camposNaoReconhecidosParser || []).map(c => `Campo não reconhecido no PDF: ${c}`));
  if (avisosTecnicos.length > 0) {
    const rotuloAvisos = corpo.appendParagraph(`Avisos técnicos da extração (${avisosTecnicos.length}):`);
    rotuloAvisos.setIndentStart(36);
    rotuloAvisos.editAsText().setItalic(true).setFontSize(9);
    avisosTecnicos.forEach(a => {
      const p = corpo.appendParagraph(a);
      p.editAsText().setItalic(true).setFontSize(9);
      p.setIndentStart(54);
    });
  }

  const rodapeTecnico = [
    resultado.rulesetId ? `Ruleset: ${resultado.rulesetId}` +
      (resultado.rulesetVersao !== null && resultado.rulesetVersao !== undefined ? ` v${resultado.rulesetVersao}` : "") +
      (resultado.rulesetRevisao !== null && resultado.rulesetRevisao !== undefined ? ` rev. ${resultado.rulesetRevisao}` : "") : null,
    resultado.rulesetEstruturaCurricular ? `Estrutura curricular: ${resultado.rulesetEstruturaCurricular}` : null,
    resultado.parserVersion ? `Parser: ${resultado.parserVersion}` : null,
    resultado.engineVersion ? `Motor de regras: ${resultado.engineVersion}` : null,
    resultado.execucaoId ? `Execução: ${resultado.execucaoId}` : null,
    // RODADA B/C.1 (§13) — hash SHA-256 do arquivo efetivamente usado
    // NESTA habilitação (pode ser diferente do de outra habilitação da
    // mesma sessão só quando NÃO reaproveitaram o mesmo documento —
    // ver "Documento(s) analisado(s)" no cabeçalho, acima, pra a visão
    // já deduplicada).
    resultado.hashSha256 ? `Hash SHA-256: ${resultado.hashSha256}` : null
  ].filter(v => !!v).join("   •   ");

  if (rodapeTecnico) {
    const p = corpo.appendParagraph(rodapeTecnico);
    p.setIndentStart(36);
    p.editAsText().setFontSize(8).setForegroundColor("#666666");
  }

  corpo.appendParagraph("");

}

// Conteúdo COMPLETO de UM aluno/sessão: cabeçalho institucional (só
// quando incluirCabecalhoInstitucional=true — um relatório individual
// tem um só; um consolidado, FASE C2, tem UM só no topo do documento
// inteiro, não repetido por aluno) + dados do aluno + disclaimer +
// uma seção por habilitação com resultado.
function historicoRelatorioEscreverConteudoSessao_(corpo, detalheSessao, contexto, incluirCabecalhoInstitucional) {

  if (incluirCabecalhoInstitucional) {
    // RODADA B/C.1.2 (item 3) — timbre + título únicos do novo layout
    // (historicoRelatorioEscreverTimbre_, acima) — substitui o
    // cabeçalho institucional ALL-CAPS em 4 linhas usado até a rodada
    // anterior. Deliberadamente NÃO reaproveita
    // HISTORICO_RELATORIO_PREFIXO_ARQUIVO aqui: aquela constante
    // continua servindo só pra nome de arquivo/detecção de versão
    // (historicoRelatorioMontarNomeArquivo_/
    // historicoRelatorioExtrairVersaoDeNomeArquivo_, acima) — mudar o
    // título exibido DENTRO do PDF não pode, de propósito, mudar o
    // padrão de nome de arquivo já em uso.
    historicoRelatorioEscreverTimbre_(corpo);

    const titulo = corpo.appendParagraph(HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titulo.editAsText().setBold(true).setFontSize(15);
    corpo.appendParagraph("");

    // RODADA B/C.1.2 (item 3) — o disclaimer institucional MUDOU DE
    // LUGAR (agora no rodapé do conteúdo, depois de todas as
    // habilitações — ver o final desta função) e de TEXTO (versão
    // curta do modelo, HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT,
    // acima) — nunca mais escrito aqui no topo.
  }

  // RODADA B/C.1 (§13): chavesComResultado precisa existir ANTES do
  // cabeçalho agora, porque o próprio cabeçalho passou a mostrar o
  // currículo identificado e a lista de documento(s) analisado(s)
  // (histórico da sessão inteira, não só de uma habilitação) — ver
  // historicoRelatorioEscreverCabecalhoSessao_, acima.
  const chavesComResultado = historicoTodasChaves_().filter(chave => !!detalheSessao.resultados[chave]);

  historicoRelatorioEscreverCabecalhoSessao_(corpo, detalheSessao, contexto, chavesComResultado);

  if (chavesComResultado.length === 0) {
    corpo.appendParagraph("Esta sessão não tem nenhum resultado que possa ser incluído no relatório.");
    return;
  }

  // RODADA B/C.1.2 (item 3) — rótulo introdutório do bloco de
  // habilitações, no padrão do modelo ("Habilitações Solicitadas:",
  // logo antes da primeira linha-resumo de habilitação — ver
  // historicoRelatorioEscreverSecaoHabilitacao_, acima).
  corpo.appendParagraph("Habilitações Solicitadas:").editAsText().setBold(true);

  chavesComResultado.forEach(chave => {
    historicoRelatorioEscreverSecaoHabilitacao_(corpo, chave, detalheSessao.resultados[chave]);
  });

  if (incluirCabecalhoInstitucional) {
    // RODADA B/C.1.2 (item 3) — "Relatório gerado em" + disclaimer
    // curto no RODAPÉ do conteúdo, NESTA ORDEM e NESTA POSIÇÃO (fim do
    // documento), exatamente como o modelo.
    corpo.appendParagraph("");
    const linhaGerado = corpo.appendParagraph(`Relatório gerado em: ${contexto.geradoEmTexto}`);
    linhaGerado.editAsText().setBold(true).setItalic(true);
    corpo.appendParagraph("");

    const obs = corpo.appendParagraph("OBS: " + HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT);
    const obsTexto = obs.editAsText();
    obsTexto.setItalic(true);
    obsTexto.setItalic(0, 3, false); // "OBS:" (índices 0-3) fica reto — só a frase depois é itálico, igual ao modelo.
  }

}

/*=====================================================
  Orquestrador (impuro) — RELATÓRIO INDIVIDUAL
=====================================================*/

function historicoRelatorioGerarPdfSessao_(registroId, sessaoAnaliseId, modoVersionamento) {

  historicoRelatorioValidarModoVersionamento_(modoVersionamento);

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);

  // Só LEITURA da sessão já persistida — nunca reexecuta PDF.js/motor/
  // seleção de ruleset (ver cabeçalho do arquivo). historicoObterSessaoAnalise
  // já lança erro claro se a sessão não existir/pertencer a outro registro.
  const detalheSessao = historicoObterSessaoAnalise(registroId, sessaoAnaliseId);

  const chavesComResultado = historicoTodasChaves_().filter(chave => !!detalheSessao.resultados[chave]);
  if (chavesComResultado.length === 0) {
    throw new Error("Esta sessão não tem nenhum resultado que possa ser incluído no relatório — nada foi gerado.");
  }

  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);

  const nomeParaArquivo = detalheSessao.nome || aba.getRange(linha, obterColuna_(mapa, "nome")).getValue();
  const nuspParaArquivo = String(detalheSessao.nusp || aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim();

  if (!nuspParaArquivo) {
    throw new Error("Não foi possível determinar o Nº USP deste(a) aluno(a) — não é possível nomear/versionar o relatório sem ele.");
  }

  /*=====================================================
    RODADA B/C.1.1 (§5) — REESTRUTURADO: a parte LENTA (montar o
    Document inteiro + saveAndClose + converter pra PDF) agora roda
    INTEIRAMENTE FORA do ScriptLock — só a DECISÃO/COMMIT da versão
    (redetecção + decidir versão-alvo + nomear + criar o arquivo
    final + substituir o antigo) roda dentro dele, mais abaixo. Antes,
    a seção travada incluía DocumentApp.create/saveAndClose/getAs(pdf)
    inteiros — perigoso porque historicoRegistrarAuditoria_
    (HistoricoAuditoria.gs) usa o MESMO ScriptLock global, com um
    timeout curto: uma pessoa gerando um PDF (potencialmente lento)
    não pode fazer a ANÁLISE de outra pessoa falhar por contenção do
    lock. O conteúdo é montado de forma independente de vN (a versão
    ainda não foi decidida nesta altura) — por isso
    historicoRelatorioEscreverCabecalhoSessao_ nunca imprime "(vN deste
    relatório...)" no corpo do documento; o número da versão continua
    aparecendo OBRIGATORIAMENTE no NOME DO ARQUIVO (decidido sob lock,
    abaixo) — só sumiu do CONTEÚDO. HISTORICO_RELATORIO_VERSION (rodapé
    técnico de layout) é independente de vN e continua sendo escrito
    aqui, fora do lock, sem problema nenhum.
  =====================================================*/
  const agora = new Date();
  const contextoConteudo = {
    versao: null,
    analisadoEmTexto: detalheSessao.analisadoEm
      ? Utilities.formatDate(new Date(detalheSessao.analisadoEm), TIMEZONE, "dd/MM/yyyy HH:mm")
      : "(não registrado)",
    geradoEmTexto: Utilities.formatDate(agora, TIMEZONE, "dd/MM/yyyy HH:mm")
  };

  const docTemp = DocumentApp.create("Relatório temporário - NUSP " + nuspParaArquivo);
  let pdfBlob;

  try {

    const corpo = docTemp.getBody();
    // RODADA B/C.1.2 (item 3) — rodapé de página (endereço/telefone/
    // e-mail), compartilhado com o consolidado — ver
    // historicoRelatorioEscreverRodapePagina_, acima.
    historicoRelatorioEscreverRodapePagina_(docTemp);
    historicoRelatorioEscreverConteudoSessao_(corpo, detalheSessao, contextoConteudo, true);

    const rodapeVersaoLayout = corpo.appendParagraph(`Layout do relatório: ${HISTORICO_RELATORIO_VERSION}`);
    rodapeVersaoLayout.editAsText().setFontSize(8).setForegroundColor("#999999");

    docTemp.saveAndClose();

    pdfBlob = DriveApp.getFileById(docTemp.getId()).getAs("application/pdf");

  } finally {
    try { DriveApp.getFileById(docTemp.getId()).setTrashed(true); } catch (e) { /* já pode ter sumido */ }
  }

  /*=====================================================
    RODADA B/C.1 (§9) / B/C.1.1 (§5) — A PARTIR DAQUI, toda a decisão
    de versionamento roda dentro de UMA ÚNICA aquisição de
    LockService.getScriptLock(): redetecção da última versão, decisão
    da versão-alvo, nomeação e substituição segura do arquivo antigo
    (quando houver) — nunca mais a geração do PDF em si (§5, acima).
    Qualquer preflight anterior — o coletivo
    (historicoPreflightRelatoriosLote, abaixo) ou o individual
    (historicoVerificarVersaoRelatorioIndividual, abaixo) — é
    ESTRITAMENTE informativo, só pra decidir SE pergunta
    substituir/nova pro usuário: o valor de versão observado ali NUNCA
    é usado como versão final — a versão final é SEMPRE redetectada
    aqui dentro, sob lock, fechando a janela de corrida que existiria
    se dois relatórios do MESMO NUSP fossem gerados ao mesmo tempo
    (duas abas do navegador, ou duas pessoas da equipe gerando o
    mesmo/dois relatórios pro mesmo aluno). O mesmo lock (GLOBAL ao
    script, igual a todo LockService já usado no projeto — nunca por
    NUSP) também serializa gerações de relatórios de ALUNOS
    DIFERENTES entre si — um custo de concorrência aceito de propósito
    (mesma disciplina já usada em historicoRegistrarAuditoria_,
    HistoricoAuditoria.gs, e nos locks de DiplomasBackend.gs: nunca
    lock por recurso, sempre lock global + seção crítica curta). Agora
    uma seção MUITO mais curta que antes: só chamadas de Drive
    rápidas (listar/renomear/criar-a-partir-de-blob-já-pronto/trashar),
    nunca DocumentApp.
  =====================================================*/
  const lock = LockService.getScriptLock();
  const obteveLock = lock.tryLock(30000);
  if (!obteveLock) {
    throw new Error(
      "Não consegui gerar o relatório agora (geração de outro relatório em andamento — tente novamente em " +
      "alguns segundos)."
    );
  }

  try {

    // Redetecção sob lock — nunca reaproveita nenhuma detecção feita
    // antes de obter o lock (não existe nenhuma, aliás: esta função
    // nunca detectou nada antes deste ponto).
    const deteccao = historicoRelatorioDetectarUltimaVersao_(pastaValidada, nuspParaArquivo);
    const versaoAlvo = historicoRelatorioDecidirVersaoAlvo_(deteccao.existeAnterior, deteccao.ultimaVersao, modoVersionamento);
    const nomeArquivoFinal = historicoRelatorioMontarNomeArquivo_(nuspParaArquivo, nomeParaArquivo, versaoAlvo);

    // §5 — o vN só entra no NOME do arquivo aqui, nunca no conteúdo
    // (já montado, acima, fora do lock).
    pdfBlob.setName(nomeArquivoFinal);

    // RODADA B/C.1 (§8) / B/C.1.1 (§4) — substitui por NUSP+versão-alvo
    // (nunca por nome exato) — cria o PDF novo ANTES de tentar remover
    // qualquer arquivo antigo (ver historicoRelatorioSubstituirPorNuspEVersao_,
    // acima): no modo "nova" isto é um no-op de segurança (nenhum
    // arquivo antigo tem essa versão-alvo ainda, redetectada sob este
    // MESMO lock); no modo "substituir" é o mecanismo crash-safe
    // exigido pela especificação. Desde B/C.1.1 (§4), uma falha ao
    // REMOVER um antigo nunca mais derruba esta função — vira aviso
    // coletado em resultadoSubstituicao.avisos, propagado no retorno
    // abaixo pra UI mostrar ⚠️ junto do ✅ de sucesso.
    const resultadoSubstituicao = historicoRelatorioSubstituirPorNuspEVersao_(
      pastaValidada, nuspParaArquivo, versaoAlvo, () => pastaValidada.createFile(pdfBlob)
    );

    // RODADA B/C.1 (§10) — arquivoId/urlArquivo vêm do File REAL
    // devolvido pelo próprio helper de criação segura (nunca
    // reconstruídos por fora) — é o que permite a tela oferecer
    // "Abrir PDF" sem precisar reabrir a sessão depois.
    return {
      nomeArquivo: nomeArquivoFinal,
      versao: versaoAlvo,
      nome: nomeParaArquivo,
      nusp: nuspParaArquivo,
      substituiu: modoVersionamento === "substituir" && deteccao.existeAnterior,
      linkPasta: gerarUrlCanonicaPasta_(pastaValidada),
      arquivoId: resultadoSubstituicao.arquivo.getId(),
      urlArquivo: resultadoSubstituicao.arquivo.getUrl(),
      // RODADA B/C.1.1 (§4) — nunca undefined: sempre um array, vazio
      // quando não há nada a avisar (UI só mostra ⚠️ quando length>0).
      avisos: resultadoSubstituicao.avisos
    };

  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  ENDPOINTS PÚBLICOS (google.script.run, chamados por
  HistoricoAnaliseUI.html)
=====================================================*/

// Detecção de versão anterior — chamado ANTES de gerar, só pra decidir
// se mostra o prompt de versionamento (só existe pergunta quando já
// existe pelo menos um relatório anterior pra este NUSP nesta pasta).
// Só LEITURA de Drive — nunca cria/grava nada. Sem gate de versão/
// etapa, mesmo raciocínio de HistoricoConsultas.gs: só confirma que o
// registro existe.
function historicoVerificarVersaoRelatorioIndividual(registroId, sessaoAnaliseId) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs

  const { aba, mapa, linha } = resolverRegistroPorId_(registroId);
  const detalheSessao = historicoObterSessaoAnalise(registroId, sessaoAnaliseId);
  const pastaValidada = garantirPastaInterno_(aba, mapa, linha);

  const nuspParaArquivo = String(detalheSessao.nusp || aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim();

  if (!nuspParaArquivo) {
    return { existeAnterior: false, ultimaVersao: 0, nome: detalheSessao.nome || "", nusp: "" };
  }

  const deteccao = historicoRelatorioDetectarUltimaVersao_(pastaValidada, nuspParaArquivo);

  return {
    existeAnterior: deteccao.existeAnterior,
    ultimaVersao: deteccao.ultimaVersao,
    nome: detalheSessao.nome || "",
    nusp: nuspParaArquivo
  };

}

/*=====================================================
  RODADA B/C.1 (§5) — PRÉ-FLIGHT REAL do versionamento em LOTE (2+
  aluno(a)s). Existe porque a versão anterior desta rodada perguntava
  "substituir ou nova versão" de forma GENÉRICA pro lote inteiro, sem
  nunca checar de verdade quais aluno(a)s já tinham relatório — este
  endpoint faz essa checagem de verdade, ANTES da pergunta, pra
  HistoricoAnaliseUI.html poder listar por nome só quem realmente já
  tem uma versão anterior (§6). É o análogo, em LOTE, de
  historicoVerificarVersaoRelatorioIndividual, acima — mesma
  filosofia "só leitura, nunca decide versão final" (a versão final
  continua sendo redetectada sob lock em
  historicoRelatorioGerarPdfSessao_, §9, exatamente como já acontece
  no fluxo individual: este preflight é estritamente informativo).

  NUNCA gera PDF, NUNCA roda o motor de regras, NUNCA grava nada —
  100% leitura (resolverRegistroPorId_ + historicoObterSessaoAnalise +
  garantirPastaInterno_ + historicoRelatorioDetectarUltimaVersao_,
  todas já usadas alhures neste módulo só pra leitura).

  Uma falha em UM item (registro não encontrado, sessão não
  encontrada/de outro registro, sem resultado nenhum, sem Nº USP) NUNCA
  derruba o preflight inteiro — mesma disciplina de resiliência
  por-item já usada no relatório consolidado: o item volta com
  erro:<mensagem> e existeAnterior:false, os demais itens continuam
  normalmente.
=====================================================*/

// IMPURO — preflight de UM item já validado (registroId+sessaoAnaliseId
// não vazios, já normalizados por historicoRelatorioValidarItensConsolidado_,
// abaixo). Nunca lança erro sozinho.
function historicoRelatorioPreflightItem_(item) {

  let aba, mapa, linha;
  try {
    const resolvido = resolverRegistroPorId_(item.registroId);
    aba = resolvido.aba; mapa = resolvido.mapa; linha = resolvido.linha;
  } catch (err) {
    return {
      registroId: item.registroId, sessaoAnaliseId: item.sessaoAnaliseId,
      nome: null, nusp: null, existeAnterior: false, ultimaVersao: 0,
      erro: `Não foi possível localizar este registro: ${(err && err.message) || err}`
    };
  }

  let detalheSessao;
  try {
    detalheSessao = historicoObterSessaoAnalise(item.registroId, item.sessaoAnaliseId);
  } catch (err) {
    return {
      registroId: item.registroId, sessaoAnaliseId: item.sessaoAnaliseId,
      nome: null, nusp: null, existeAnterior: false, ultimaVersao: 0,
      erro: `Não foi possível ler a sessão de análise: ${(err && err.message) || err}`
    };
  }

  const chavesComResultado = historicoTodasChaves_().filter(chave => !!detalheSessao.resultados[chave]);
  if (chavesComResultado.length === 0) {
    return {
      registroId: item.registroId, sessaoAnaliseId: item.sessaoAnaliseId,
      nome: detalheSessao.nome || null, nusp: detalheSessao.nusp || null, existeAnterior: false, ultimaVersao: 0,
      erro: "Esta sessão não tem nenhum resultado que possa ser incluído no relatório."
    };
  }

  let pastaValidada;
  try {
    pastaValidada = garantirPastaInterno_(aba, mapa, linha);
  } catch (err) {
    return {
      registroId: item.registroId, sessaoAnaliseId: item.sessaoAnaliseId,
      nome: detalheSessao.nome || null, nusp: detalheSessao.nusp || null, existeAnterior: false, ultimaVersao: 0,
      erro: `Não foi possível acessar a pasta deste(a) aluno(a) no Drive: ${(err && err.message) || err}`
    };
  }

  const nuspParaArquivo = String(detalheSessao.nusp || aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim();
  if (!nuspParaArquivo) {
    return {
      registroId: item.registroId, sessaoAnaliseId: item.sessaoAnaliseId,
      nome: detalheSessao.nome || null, nusp: null, existeAnterior: false, ultimaVersao: 0,
      erro: "Não foi possível determinar o Nº USP deste(a) aluno(a)."
    };
  }

  const deteccao = historicoRelatorioDetectarUltimaVersao_(pastaValidada, nuspParaArquivo);

  return {
    registroId: item.registroId,
    sessaoAnaliseId: item.sessaoAnaliseId,
    nome: detalheSessao.nome || "",
    nusp: nuspParaArquivo,
    existeAnterior: deteccao.existeAnterior,
    ultimaVersao: deteccao.ultimaVersao,
    erro: null
  };

}

// Orquestrador (impuro) — sequencial, de propósito, mesma disciplina
// já adotada em historicoRelatorioGerarPdfConsolidado_ (nunca em
// paralelo). comRelatorioAnterior traz só os itens com
// existeAnterior=true — exatamente a lista que HistoricoAnaliseUI.html
// (§6) precisa pra montar a pergunta coletiva nomeando só quem já tem
// relatório.
function historicoRelatorioPreflightLote_(itens) {

  const itensValidados = historicoRelatorioValidarItensConsolidado_(itens);
  const resultadosItens = itensValidados.map(historicoRelatorioPreflightItem_);
  const comRelatorioAnterior = resultadosItens
    .filter(r => r.existeAnterior)
    .map(r => ({ registroId: r.registroId, sessaoAnaliseId: r.sessaoAnaliseId, nome: r.nome, nusp: r.nusp, ultimaVersao: r.ultimaVersao }));

  return { itens: resultadosItens, comRelatorioAnterior: comRelatorioAnterior };

}

// Endpoint público — SÓ LEITURA (ver cabeçalho da seção): nunca gera
// PDF, nunca roda o motor, nunca grava nada. Chamado pelo painel de
// lote (HistoricoAnaliseUI.html, §6) UMA vez antes de perguntar
// substituir/nova, só quando há 2+ aluno(a)s no lote (1 aluno usa
// historicoVerificarVersaoRelatorioIndividual, acima — "regra do 1",
// §7).
function historicoPreflightRelatoriosLote(itens) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return historicoRelatorioPreflightLote_(itens);
}

// Gera e salva (com substituição segura) o PDF do relatório individual
// de UMA sessão já persistida. NUNCA altera Diplomas/etapa/versão/
// ruleset/status (ver cabeçalho do arquivo).
function historicoGerarRelatorioIndividual(registroId, sessaoAnaliseId, modoVersionamento) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return historicoRelatorioGerarPdfSessao_(registroId, sessaoAnaliseId, modoVersionamento);
}

/*=====================================================
  RELATÓRIO CONSOLIDADO (efêmero, NUNCA persistido — nem no Drive, nem
  em nenhuma pasta de aluno(a), nem em ANALISE_HISTORICO).

  RODADA B/C.1 (§14-23) — REDESENHO COMPLETO da composição deste
  relatório (o relatório INDIVIDUAL, acima, NÃO foi alterado por esta
  seção — só ganhou a rastreabilidade adicional do §13). A versão
  anterior deste módulo reaproveitava
  historicoRelatorioEscreverConteudoSessao_ pra escrever, por
  aluno(a), PRATICAMENTE O RELATÓRIO INDIVIDUAL INTEIRO dentro do
  consolidado — errado por definição (achado confirmado no §1 desta
  rodada): um relatório consolidado NÃO é "um conjunto de relatórios
  individuais colados", é um RESUMO ADMINISTRATIVO. A partir desta
  rodada, historicoRelatorioEscreverConteudoSessao_ NUNCA MAIS é
  chamada por este caminho — o consolidado tem cabeçalho, metadados,
  resumo, tabela e seção de pendências PRÓPRIOS, escritos pelas
  funções desta seção, e não compartilha NENHUMA função de escrita
  (DocumentApp) com o relatório individual (só reaproveita PROJEÇÕES
  DE DADOS já existentes — historicoObterSessaoAnalise, e os campos de
  §12/§13 nela — e alguns rótulos puros como
  historicoRelatorioRotuloResultado_).

  ESTRUTURA (§15-19): cabeçalho institucional FIXO e PRÓPRIO
  ("UNIVERSIDADE DE SÃO PAULO" / "INSTITUTO DE PSICOLOGIA" /
  "SERVIÇO DE GRADUAÇÃO" / título do relatório) — nunca o cabeçalho do
  relatório individual; metadados (gerado em, selecionados,
  processados, interrompido sim/não, erros técnicos); resumo CONTADO
  POR HABILITAÇÃO (nunca por aluno — Psi+Bach de um(a) mesmo(a)
  aluno(a) conta duas vezes); tabela com UMA LINHA POR ALUNO(A) +
  HABILITAÇÃO (Aluno/Nº USP/Currículo/Habilitação/Resultado/Pendência
  principal); seção "Pendências / Casos para conferência" só com
  NÃO APTO/CONFERIR/erro técnico, em formato conciso (o relatório
  individual continua sendo a fonte do detalhe completo — nunca
  duplicado aqui).

  ENTRADA (§20-21): historicoGerarRelatorioConsolidado(alunos,
  loteInfo) — "alunos" é a lista de TODOS os aluno(a)s do lote
  EXECUTADO (não só quem teve sucesso): cada item traz registroId
  sempre, e sessaoAnaliseId (análise persistida) OU erroTecnico
  (falhou antes da sessão) OU nenhum dos dois (processado(a), mas sem
  nenhuma habilitação ativa — não é falha, só não gera linha nenhuma
  na tabela); errosHabilitacao (opcional) carrega erros técnicos
  LOCAIS por habilitação que não impediram a sessão de ser criada
  (outra habilitação da MESMA execução pode ter persistido
  normalmente) — nunca substitui resultado persistido, só complementa
  como aviso técnico separado. "loteInfo" carrega só os totais/estado
  do lote (totalSelecionados/totalProcessados/cancelado) — nunca
  timestamps de início/fim (o relatório não precisa deles). NUNCA
  confia em nome/NUSP vindos do cliente pra identidade: todo item é
  RE-RESOLVIDO no servidor (historicoRelatorioResolverAlunoConsolidado_,
  abaixo) exatamente como o resto do back-end já faz.

  Continua devolvendo {nomeArquivo, base64, totalIncluidos, totalFalhas,
  falhas} — mesmo contrato de sempre com a tela (§22-23) — e continua
  NUNCA chamando createFile/substituirArquivoComSeguranca_/qualquer
  helper de versionamento: o base64 devolvido é o ÚNICO lugar onde
  este PDF passa a existir, decodificado num Blob local pela própria
  tela (historicoAbrirRelatorioConsolidado_, HistoricoAnaliseUI.html)
  — nunca salvo, nunca versionado (diferente do Doc temporário usado
  internamente aqui, que é criado só pra poder virar PDF via getAs() e
  é sempre mandado pra lixeira no finally, sucesso ou erro).
=====================================================*/

const HISTORICO_RELATORIO_CONSOLIDADO_PREFIXO_ARQUIVO = "Relatório Consolidado de Conferência de Histórico Escolar";
const HISTORICO_RELATORIO_CONSOLIDADO_MIN_ITENS = 2;
const HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS = 100;

/*=====================================================
  PURO — validação de listas e montagem do nome de arquivo (exibição
  apenas — sem versionamento, o consolidado não tem "vN", ver
  cabeçalho da seção). Testável no harness Node (ver HistoricoTestes.gs).
=====================================================*/

// RODADA B/C.1 — a partir desta rodada, este validador serve
// EXCLUSIVAMENTE o PRÉ-FLIGHT em lote (historicoPreflightRelatoriosLote,
// acima): continua exigindo registroId E sessaoAnaliseId sempre
// presentes, porque só faz sentido perguntar "já existe relatório
// anterior?" de uma sessão que existe de verdade. O RELATÓRIO
// CONSOLIDADO em si passou a usar um validador PRÓPRIO, mais
// permissivo — historicoRelatorioValidarAlunosConsolidado_, abaixo —
// porque precisa aceitar também aluno(a)s que falharam ANTES de
// qualquer sessão existir (§20). Nunca confia na lista recebida do
// client mesmo sendo ela mesma quem a montou: array de verdade, entre
// 2 e 100 itens (abaixo de 2 é o relatório/preflight individual —
// "regra do 1", HistoricoAnaliseUI.html; acima de 100 arrisca
// estourar o tempo de execução do Apps Script), cada item com
// registroId E sessaoAnaliseId não vazios, sem repetição do PAR (a
// mesma sessão do mesmo registro duas vezes não faria sentido — mas o
// MESMO aluno com sessões DIFERENTES, embora incomum, não é
// bloqueado). Devolve a lista normalizada (strings aparadas); NUNCA
// modifica/ordena — preserva a ordem recebida.
function historicoRelatorioValidarItensConsolidado_(itens) {

  if (!Array.isArray(itens)) {
    throw new Error("Lista de alunos do relatório consolidado inválida (esperada uma lista).");
  }

  if (itens.length < HISTORICO_RELATORIO_CONSOLIDADO_MIN_ITENS) {
    throw new Error(
      `O relatório consolidado exige pelo menos ${HISTORICO_RELATORIO_CONSOLIDADO_MIN_ITENS} aluno(a)s ` +
      `(recebido: ${itens.length}). Para um só aluno, use o relatório individual.`
    );
  }

  if (itens.length > HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS) {
    throw new Error(
      `O relatório consolidado aceita no máximo ${HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS} aluno(a)s por vez ` +
      `(recebido: ${itens.length}).`
    );
  }

  const chavesVistas = new Set();

  itens.forEach((item, indice) => {

    if (!item || typeof item !== "object") {
      throw new Error(`Item ${indice + 1} da lista do relatório consolidado inválido (esperado um objeto).`);
    }

    const registroId = String(item.registroId || "").trim();
    const sessaoAnaliseId = String(item.sessaoAnaliseId || "").trim();

    if (!registroId || !sessaoAnaliseId) {
      throw new Error(`Item ${indice + 1} da lista do relatório consolidado está sem registroId/sessaoAnaliseId.`);
    }

    const chave = registroId + "::" + sessaoAnaliseId;
    if (chavesVistas.has(chave)) {
      throw new Error(`Item repetido na lista do relatório consolidado (registro "${registroId}").`);
    }
    chavesVistas.add(chave);

  });

  return itens.map(item => ({
    registroId: String(item.registroId).trim(),
    sessaoAnaliseId: String(item.sessaoAnaliseId).trim()
  }));

}

// dataTexto já vem FORMATADA (Utilities.formatDate roda só no
// orquestrador, nunca aqui — ver historicoRelatorioMontarNomeArquivo_,
// acima, mesmo princípio) — por isso é puro e testável no harness
// Node. Nome só de EXIBIÇÃO (aba do navegador / nome sugerido ao
// salvar o PDF manualmente) — nunca é usado pra detectar versão
// nenhuma (o consolidado não tem versão, ver cabeçalho da seção).
function historicoRelatorioMontarNomeArquivoConsolidado_(dataTexto, totalAlunos) {
  const totalTexto = String(parseInt(totalAlunos, 10));
  return `${HISTORICO_RELATORIO_CONSOLIDADO_PREFIXO_ARQUIVO} - ${dataTexto} - ${totalTexto} aluno(a)s.pdf`;
}

// RODADA B/C.1 (§20-21) — validador PRÓPRIO do RELATÓRIO CONSOLIDADO
// (o preflight, acima, continua usando historicoRelatorioValidarItensConsolidado_,
// mais estrito). Cada item representa UM aluno(a) do lote EXECUTADO,
// sempre identificado por registroId, e traz OU um sessaoAnaliseId
// (análise persistida) OU um erroTecnico (falhou antes da sessão ser
// criada) OU nenhum dos dois (processado(a) mas sem nenhuma
// habilitação ativa — não é falha: historicoRelatorioResolverAlunoConsolidado_/
// historicoRelatorioMontarLinhasTabelaConsolidado_, abaixo, tratam
// esse caso naturalmente, sem gerar nenhuma linha na tabela, mas
// CONTAM pra totalProcessados). errosHabilitacao (opcional) carrega
// erros técnicos LOCAIS por habilitação, sem impedir a sessão de ter
// sido criada por outra habilitação da MESMA execução — nunca
// substitui resultado persistido (§20). Nome/NUSP vindos do cliente
// NUNCA são usados (nem aceitos aqui) — sempre re-resolvidos no
// servidor (ver historicoRelatorioResolverAlunoConsolidado_, abaixo).
// Único caso de erro FATAL (derruba o relatório inteiro): registroId
// vazio, ou o MESMO registroId repetido — os dois são sinal de bug no
// chamador, nunca um estado legítimo de lote.
function historicoRelatorioValidarAlunosConsolidado_(alunos) {

  if (!Array.isArray(alunos)) {
    throw new Error("Lista de alunos do relatório consolidado inválida (esperada uma lista).");
  }

  if (alunos.length < HISTORICO_RELATORIO_CONSOLIDADO_MIN_ITENS) {
    throw new Error(
      `O relatório consolidado exige pelo menos ${HISTORICO_RELATORIO_CONSOLIDADO_MIN_ITENS} aluno(a)s ` +
      `(recebido: ${alunos.length}). Para um só aluno, use o relatório individual.`
    );
  }

  if (alunos.length > HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS) {
    throw new Error(
      `O relatório consolidado aceita no máximo ${HISTORICO_RELATORIO_CONSOLIDADO_MAX_ITENS} aluno(a)s por vez ` +
      `(recebido: ${alunos.length}).`
    );
  }

  const registrosVistos = new Set();

  return alunos.map((item, indice) => {

    if (!item || typeof item !== "object") {
      throw new Error(`Item ${indice + 1} da lista do relatório consolidado inválido (esperado um objeto).`);
    }

    const registroId = String(item.registroId || "").trim();
    if (!registroId) {
      throw new Error(`Item ${indice + 1} da lista do relatório consolidado está sem registroId.`);
    }

    if (registrosVistos.has(registroId)) {
      throw new Error(`Registro repetido na lista do relatório consolidado ("${registroId}").`);
    }
    registrosVistos.add(registroId);

    const errosHabilitacaoBrutos = (item.errosHabilitacao && typeof item.errosHabilitacao === "object" && !Array.isArray(item.errosHabilitacao))
      ? item.errosHabilitacao : {};
    const errosHabilitacao = {};
    historicoTodasChaves_().forEach(chave => {
      const mensagem = String(errosHabilitacaoBrutos[chave] || "").trim();
      if (mensagem) errosHabilitacao[chave] = mensagem;
    });

    return {
      registroId: registroId,
      sessaoAnaliseId: String(item.sessaoAnaliseId || "").trim() || null,
      erroTecnico: String(item.erroTecnico || "").trim() || null,
      errosHabilitacao: errosHabilitacao
    };

  });

}

// RODADA B/C.1 (§21) — valida/normaliza os metadados do lote: NUNCA
// confia cegamente no cliente. totalProcessados nunca pode superar a
// quantidade de itens realmente recebida (cai pra essa quantidade se
// vier maior/ausente/inválido); totalSelecionados nunca fica menor
// que totalProcessados (um lote NÃO cancelado sempre selecionou pelo
// menos quem processou; um lote cancelado tem totalProcessados <
// totalSelecionados DE PROPÓSITO — isso é o que "cancelado" expressa).
function historicoRelatorioValidarLoteInfoConsolidado_(loteInfo, totalAlunosRecebidos) {
  const info = (loteInfo && typeof loteInfo === "object") ? loteInfo : {};
  const totalProcessadosBruto = parseInt(info.totalProcessados, 10);
  const totalSelecionadosBruto = parseInt(info.totalSelecionados, 10);
  const totalProcessados = (!isNaN(totalProcessadosBruto) && totalProcessadosBruto >= 0 && totalProcessadosBruto <= totalAlunosRecebidos)
    ? totalProcessadosBruto : totalAlunosRecebidos;
  const totalSelecionados = (!isNaN(totalSelecionadosBruto) && totalSelecionadosBruto >= totalProcessados)
    ? totalSelecionadosBruto : totalProcessados;
  return {
    totalProcessados: totalProcessados,
    totalSelecionados: totalSelecionados,
    cancelado: info.cancelado === true
  };
}

// PURO — RODADA B/C.1 (§18): deriva a "pendência principal" de UM
// resultado JÁ decidido (mesmo formato devolvido por
// historicoObterSessaoAnalise/historicoReconstruirResultadoDeLinha_,
// §12) — NUNCA recalcula crédito, NUNCA reinterpreta ruleset, só
// escolhe QUAL motivo/observação já persistido mostrar na
// tabela/pendências do consolidado. Preferência: 1) primeiro motivo
// com severidade BLOQUEIO; 2) senão, primeiro motivo qualquer com
// mensagem; 3) senão, o próprio parecerTexto já persistido; 4) senão,
// um texto curto derivado só do resultado. Nunca lança erro.
function historicoRelatorioDerivarPendenciaPrincipal_(resultado) {

  if (!resultado) return "(sem resultado)";

  const motivos = Array.isArray(resultado.motivos) ? resultado.motivos : [];

  const bloqueio = motivos.find(m => m && m.severidade === "BLOQUEIO" && m.mensagem);
  if (bloqueio) return bloqueio.mensagem;

  const primeiro = motivos.find(m => m && m.mensagem);
  if (primeiro) return primeiro.mensagem;

  if (resultado.parecerTexto) return resultado.parecerTexto;

  if (resultado.resultado === "APTO") return "—";

  return `(${historicoRelatorioRotuloResultado_(resultado.resultado)}, sem motivo detalhado registrado)`;

}

// PURO — RODADA B/C.1 (§16): resumo do lote CONTADO POR HABILITAÇÃO
// (nunca por aluno(a) — um(a) aluno(a) Psi+Bach conta possivelmente 2
// vezes aqui, uma pra cada habilitação com resultado — nunca
// conflemado com contagem de aluno(a)). totalProcessados é a
// contagem de ALUNO(A)S resolvidos (com ou sem resultado/erro — ver
// alunosResolvidos, historicoRelatorioResolverAlunoConsolidado_,
// abaixo). errosTecnicos conta ALUNO(A)S com erroTecnico de nível de
// aluno(a) (sessão inteira não persistida) — os erros técnicos POR
// HABILITAÇÃO (errosHabilitacao) entram só na seção de pendências
// (§19/historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_,
// abaixo), nunca neste resumo numérico, pra não contar a mesma
// ocorrência duas vezes de formas diferentes.
// RODADA B/C.1.1 (§6): conta erro técnico em DUAS dimensões
// independentes, nunca uma escondendo a outra — o bug relatado era
// "Erros técnicos: 0" no resumo mesmo havendo, por exemplo, "Bacharelado
// — erro técnico local durante a análise" nas pendências, porque só
// aluno.erroTecnico (nível de aluno(a): a sessão inteira não pôde ser
// lida/resolvida) era contado, nunca aluno.errosHabilitacao[chave]
// (nível de habilitação: aquela habilitação específica falhou durante
// a execução, mas OUTRA habilitação da MESMA execução pode ter sido
// analisada e gravada normalmente — ver
// historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_,
// abaixo, que já listava isso nas pendências sem que o resumo contasse
// junto). Cada dimensão vem de um campo diferente do mesmo objeto
// aluno — nunca a MESMA ocorrência é contada duas vezes, mesmo quando
// um(a) aluno(a) tem as duas coisas ao mesmo tempo (erroTecnico de
// nível de aluno(a) E, sobrando de antes desse erro, um
// errosHabilitacao já registrado pelo cliente).
function historicoRelatorioMontarResumoConsolidado_(alunosResolvidos) {

  const porHabilitacao = { APTO: 0, NAO_APTO: 0, CONFERIR: 0 };
  let errosTecnicosAluno = 0;
  let errosTecnicosHabilitacao = 0;

  alunosResolvidos.forEach(aluno => {
    if (aluno.erroTecnico) {
      errosTecnicosAluno++;
    } else if (aluno.resultadosPorHabilitacao) {
      historicoTodasChaves_().forEach(chave => {
        const resultado = aluno.resultadosPorHabilitacao[chave];
        if (!resultado || !resultado.resultado) return;
        if (porHabilitacao[resultado.resultado] !== undefined) {
          porHabilitacao[resultado.resultado]++;
        }
      });
    }
    const errosHabilitacao = aluno.errosHabilitacao || {};
    historicoTodasChaves_().forEach(chave => {
      if (errosHabilitacao[chave]) errosTecnicosHabilitacao++;
    });
  });

  return {
    totalProcessados: alunosResolvidos.length,
    porHabilitacao: porHabilitacao,
    errosTecnicosAluno: errosTecnicosAluno,
    errosTecnicosHabilitacao: errosTecnicosHabilitacao,
    // Mantido pro rodapé/metadados que só querem "quantos NO TOTAL" —
    // sempre a SOMA das duas dimensões acima, nunca recontado.
    errosTecnicos: errosTecnicosAluno + errosTecnicosHabilitacao
  };

}

// PURO — RODADA B/C.1 (§17): achata os aluno(a)s resolvidos numa
// lista de LINHAS, UMA por aluno(a)+habilitação com resultado —
// NUNCA uma linha "resumo" por aluno(a). Um(a) aluno(a) com
// erroTecnico (sem sessão) vira UMA linha própria, sem habilitação
// (null) e resultado "ERRO_TECNICO". Um(a) aluno(a) sem erro e sem
// nenhuma habilitação com resultado (nem ativa) não gera linha
// nenhuma — nada a mostrar. Currículo é o cursoCodigoDocumento do
// PRÓPRIO resultado daquela habilitação (§12/§13 — nunca um valor
// "do(a) aluno(a)" genérico: habilitações diferentes podem, em tese,
// ter documentos diferentes).
function historicoRelatorioMontarLinhasTabelaConsolidado_(alunosResolvidos) {

  const linhas = [];

  alunosResolvidos.forEach(aluno => {

    if (aluno.erroTecnico) {
      linhas.push({
        registroId: aluno.registroId,
        nome: aluno.nome || "(nome não registrado)",
        nusp: aluno.nusp || "(não registrado)",
        curriculo: null,
        habilitacao: null,
        resultado: "ERRO_TECNICO",
        pendenciaPrincipal: aluno.erroTecnico
      });
      return;
    }

    if (!aluno.resultadosPorHabilitacao) return;

    historicoTodasChaves_()
      .filter(chave => !!aluno.resultadosPorHabilitacao[chave])
      .forEach(chave => {
        const resultado = aluno.resultadosPorHabilitacao[chave];
        linhas.push({
          registroId: aluno.registroId,
          nome: aluno.nome || "(nome não registrado)",
          nusp: aluno.nusp || "(não registrado)",
          curriculo: resultado.cursoCodigoDocumento || null,
          habilitacao: historicoConfigHabilitacao_(chave).nome,
          resultado: resultado.resultado,
          pendenciaPrincipal: historicoRelatorioDerivarPendenciaPrincipal_(resultado)
        });
      });

  });

  return linhas;

}

// PURO — RODADA B/C.1 (§19): filtra as linhas da tabela (§17) pras
// que precisam de conferência humana — NÃO_APTO, CONFERIR e
// ERRO_TECNICO, na MESMA ordem em que aparecem na tabela. APTO nunca
// aparece aqui (fica só na tabela/resumo). Formato conciso: reaproveita
// a MESMA "pendência principal" já derivada pra tabela — nunca repete
// tempo de curso/créditos/disciplinas/grupos inteiros aqui (ver
// cabeçalho da seção do arquivo — o relatório individual continua
// sendo a fonte do detalhe completo).
function historicoRelatorioMontarPendenciasConsolidado_(linhasTabela) {
  return linhasTabela.filter(l => l.resultado === "NAO_APTO" || l.resultado === "CONFERIR" || l.resultado === "ERRO_TECNICO");
}

// PURO — RODADA B/C.1 (§20, último parágrafo): achata os erros
// técnicos LOCAIS por habilitação (aluno.errosHabilitacao — não
// impediram a sessão de ser criada por OUTRA habilitação da mesma
// execução) numa lista própria de avisos — NUNCA substitui/mistura
// com as linhas da tabela (§17), só complementa a seção de
// pendências.
function historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_(alunosResolvidos) {
  const avisos = [];
  alunosResolvidos.forEach(aluno => {
    const errosHabilitacao = aluno.errosHabilitacao || {};
    historicoTodasChaves_().forEach(chave => {
      const mensagem = errosHabilitacao[chave];
      if (!mensagem) return;
      avisos.push({
        registroId: aluno.registroId,
        nome: aluno.nome || "(nome não registrado)",
        nusp: aluno.nusp || "(não registrado)",
        habilitacao: historicoConfigHabilitacao_(chave).nome,
        mensagem: mensagem
      });
    });
  });
  return avisos;
}

/*=====================================================
  IMPURO — resolução de UM aluno(a) já validado (Drive/Sheets). Não
  coberto pelo harness Node (ver cabeçalho do arquivo).
=====================================================*/

// Re-resolve SEMPRE nome/NUSP no servidor (nunca aceita os do
// cliente — §20/§21) e ou lê a sessão persistida (sessaoAnaliseId
// presente) ou monta uma entrada de erro técnico puro (sem sessão).
// Nunca lança erro sozinho: qualquer falha de resolução (registro não
// encontrado, sessão não encontrada/de outro registro) vira, ela
// mesma, uma entrada de erro técnico — um(a) aluno(a) com problema
// NUNCA derruba o relatório inteiro (mesma filosofia já usada no
// preflight, historicoRelatorioPreflightItem_, acima).
function historicoRelatorioResolverAlunoConsolidado_(item) {

  let nome = null, nusp = null;
  try {
    const { aba, mapa, linha } = resolverRegistroPorId_(item.registroId);
    nome = aba.getRange(linha, obterColuna_(mapa, "nome")).getValue() || null;
    nusp = String(aba.getRange(linha, obterColuna_(mapa, "nUsp")).getValue() || "").trim() || null;
  } catch (err) {
    return {
      registroId: item.registroId,
      nome: null,
      nusp: null,
      erroTecnico: item.erroTecnico || `Não foi possível localizar este registro: ${(err && err.message) || err}`,
      errosHabilitacao: item.errosHabilitacao,
      resultadosPorHabilitacao: null
    };
  }

  if (!item.sessaoAnaliseId) {
    // Sem sessão: OU falhou antes dela existir (erroTecnico presente,
    // §20) OU não tinha nenhuma habilitação ativa (nem erro nem
    // sessão — §3/§16, conta só pra totalProcessados).
    return {
      registroId: item.registroId,
      nome: nome,
      nusp: nusp,
      erroTecnico: item.erroTecnico,
      errosHabilitacao: item.errosHabilitacao,
      resultadosPorHabilitacao: null
    };
  }

  try {
    const detalheSessao = historicoObterSessaoAnalise(item.registroId, item.sessaoAnaliseId);
    // Nome/NUSP da PRÓPRIA sessão auditada têm prioridade (mesmo
    // princípio de fidelidade histórica já usado no relatório
    // individual — ver cabeçalho do arquivo) — só cai pro nome/NUSP
    // ATUAIS (já lidos acima) quando a sessão não tiver essa
    // informação.
    return {
      registroId: item.registroId,
      nome: detalheSessao.nome || nome,
      nusp: detalheSessao.nusp || nusp,
      erroTecnico: item.erroTecnico,
      errosHabilitacao: item.errosHabilitacao,
      resultadosPorHabilitacao: detalheSessao.resultados
    };
  } catch (err) {
    return {
      registroId: item.registroId,
      nome: nome,
      nusp: nusp,
      erroTecnico: item.erroTecnico || `Não foi possível ler a sessão de análise: ${(err && err.message) || err}`,
      errosHabilitacao: item.errosHabilitacao,
      resultadosPorHabilitacao: null
    };
  }

}

/*=====================================================
  RODADA B/C.1.2 (item 3) — bloco compacto de UM aluno(a) no
  relatório CONSOLIDADO, no padrão exato do modelo: nome + N. USP,
  currículo, "Habilitações Solicitadas:" e uma linha por habilitação
  (com "Motivo:" só quando NÃO Apto). PROPOSITALMENTE não compartilha
  nenhuma função de escrita com o relatório individual
  (historicoRelatorioEscreverSecaoHabilitacao_, acima — os dois
  writers continuam inteiramente independentes, mesmo princípio já
  registrado no cabeçalho da seção do consolidado, abaixo) — mesmo
  assim reaproveita as MESMAS funções puras de rótulo/motivo usadas lá
  (historicoRelatorioRotuloResultadoNovoLayout_/
  historicoRelatorioMontarMotivoPorExtenso_), pra nunca divergir no
  TEXTO mostrado, só na quantidade de detalhe.

  Cobre também os dois casos que o modelo do usuário não mostra
  (nenhum dos 3 alunos de exemplo tinha erro técnico ou zero
  habilitação ativa): erro técnico de aluno(a) (sessão inteira não
  pôde ser lida) e aluno(a) processado(a) sem nenhuma habilitação com
  resultado — ambos SEMPRE aparecem, nunca somem silenciosamente
  (resposta à pergunta de esclarecimento sobre informação técnica no
  consolidado — "remover de vez" foi entendida como as MÉTRICAS
  AGREGADAS/avisos técnicos do formato anterior, nunca como licença
  pra esconder uma falha real de um(a) aluno(a) específico(a) do
  registro). Erros técnicos LOCAIS por habilitação (errosHabilitacao)
  também continuam aparecendo, agora dentro do PRÓPRIO bloco do(a)
  aluno(a) (antes ficavam numa seção agregada à parte, removida por
  este pedido).
=====================================================*/
function historicoRelatorioEscreverBlocoAluno_(corpo, aluno) {

  const nomeTexto = aluno.nome || "(nome não registrado)";
  const nuspTexto = aluno.nusp || "(não registrado)";
  corpo.appendParagraph(`${nomeTexto}, N. USP ${nuspTexto}`).editAsText().setBold(true);

  const chavesComResultado = aluno.resultadosPorHabilitacao
    ? historicoTodasChaves_().filter(chave => !!aluno.resultadosPorHabilitacao[chave])
    : [];

  if (aluno.erroTecnico) {
    corpo.appendParagraph(`Erro técnico: ${aluno.erroTecnico}`).editAsText().setItalic(true);
  } else if (chavesComResultado.length === 0) {
    corpo.appendParagraph("Nenhuma habilitação ativa nesta execução.").editAsText().setItalic(true);
  } else {
    // Currículo: o primeiro cursoCodigoDocumento não-nulo entre as
    // habilitações com resultado, mesma ORDEM/critério já usado pela
    // tabela do formato anterior (historicoRelatorioMontarLinhasTabelaConsolidado_,
    // acima) — só que agora UMA linha por aluno(a), não por
    // aluno(a)+habilitação (o modelo mostra "Currículo:" uma vez só,
    // por aluno(a)).
    const curriculo = chavesComResultado
      .map(chave => aluno.resultadosPorHabilitacao[chave].cursoCodigoDocumento)
      .find(v => !!v);
    corpo.appendParagraph(`Currículo: ${curriculo || "(não identificado)"}`);

    corpo.appendParagraph("Habilitações Solicitadas:").editAsText().setBold(true);

    chavesComResultado.forEach(chave => {
      const resultado = aluno.resultadosPorHabilitacao[chave];
      const cfg = historicoConfigHabilitacao_(chave);
      const item = corpo.appendListItem(`${cfg.nome}: ${historicoRelatorioRotuloResultadoNovoLayout_(resultado.resultado)}`);
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
      if (resultado.resultado !== "APTO") {
        const itemMotivo = corpo.appendListItem(`Motivo: ${historicoRelatorioMontarMotivoPorExtenso_(resultado)}`);
        itemMotivo.setGlyphType(DocumentApp.GlyphType.BULLET);
        itemMotivo.setNestingLevel(1);
      }
    });
  }

  const errosHabilitacao = aluno.errosHabilitacao || {};
  historicoTodasChaves_()
    .filter(chave => !!errosHabilitacao[chave])
    .forEach(chave => {
      const cfg = historicoConfigHabilitacao_(chave);
      const item = corpo.appendListItem(
        `${cfg.nome}: erro técnico local durante a análise (não persistido) — ${errosHabilitacao[chave]}`
      );
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
      item.editAsText().setItalic(true);
    });

  corpo.appendParagraph("");

}

/*=====================================================
  Orquestrador (impuro) — RELATÓRIO CONSOLIDADO
=====================================================*/

function historicoRelatorioGerarPdfConsolidado_(alunos, loteInfo) {

  const alunosValidados = historicoRelatorioValidarAlunosConsolidado_(alunos);
  const infoLote = historicoRelatorioValidarLoteInfoConsolidado_(loteInfo, alunosValidados.length);

  // Sequencial, de propósito (mesma disciplina já adotada em
  // historicoIniciarAnaliseLote/historicoIniciarRelatoriosLote_,
  // HistoricoAnaliseUI.html): nunca em paralelo. Uma falha na
  // resolução de UM item vira erroTecnico PARA AQUELE item (ver
  // historicoRelatorioResolverAlunoConsolidado_, acima) — nunca
  // derruba o relatório inteiro.
  const alunosResolvidos = alunosValidados.map(historicoRelatorioResolverAlunoConsolidado_);

  // RODADA B/C.1.2 (item 3) — a partir desta rodada, o consolidado NÃO
  // monta mais resumo/tabela/pendências agregados (resposta à pergunta
  // de esclarecimento sobre informação técnica no consolidado:
  // "Remover de vez" — "só a estrutura do modelo: por aluno(a), sem
  // nenhuma métrica agregada ou aviso técnico"). As 4 funções puras
  // que montavam isso (historicoRelatorioMontarResumoConsolidado_/
  // historicoRelatorioMontarLinhasTabelaConsolidado_/
  // historicoRelatorioMontarPendenciasConsolidado_/
  // historicoRelatorioMontarAvisosTecnicosHabilitacaoConsolidado_,
  // acima) continuam no arquivo, corretas e testadas, só não são mais
  // chamadas por este orquestrador — nunca removidas, caso um layout
  // futuro volte a precisar de uma visão agregada.

  const agora = new Date();
  const geradoEmTexto = Utilities.formatDate(agora, TIMEZONE, "dd/MM/yyyy HH:mm");
  const nomeArquivoFinal = historicoRelatorioMontarNomeArquivoConsolidado_(
    Utilities.formatDate(agora, TIMEZONE, "yyyy-MM-dd HHmm"),
    alunosValidados.length
  );

  const docTemp = DocumentApp.create(nomeArquivoFinal + " (temp)");

  try {

    const corpo = docTemp.getBody();
    // RODADA B/C.1.2 (item 3) — rodapé de página, compartilhado com o
    // relatório individual — ver historicoRelatorioEscreverRodapePagina_,
    // acima.
    historicoRelatorioEscreverRodapePagina_(docTemp);

    // RODADA B/C.1.2 (item 3) — timbre + título únicos do novo layout,
    // COMPARTILHADOS com o relatório individual (mesma função —
    // historicoRelatorioEscreverTimbre_, acima) — nunca mais o
    // cabeçalho institucional ALL-CAPS em 4 linhas usado até a rodada
    // anterior.
    historicoRelatorioEscreverTimbre_(corpo);

    const titulo = corpo.appendParagraph(HISTORICO_RELATORIO_TITULO_NOVO_LAYOUT);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titulo.editAsText().setBold(true).setFontSize(15);
    corpo.appendParagraph("");

    // RODADA B/C.1.2 (item 3) — metadados do lote: só os dois campos
    // que o modelo mostra (aluno(a)s selecionado(a)s/processados(as)).
    // "Lote interrompido"/"Erros técnicos" agregados saíram daqui pelo
    // mesmo motivo do comentário acima — um erro técnico de UM(A)
    // aluno(a) específico(a) continua visível, só que dentro do
    // PRÓPRIO bloco daquele(a) aluno(a)
    // (historicoRelatorioEscreverBlocoAluno_, acima), nunca escondido,
    // só não é mais CONTADO aqui em cima.
    const linhaSelecionados = corpo.appendParagraph(`Aluno(a)s selecionado(a)s: ${infoLote.totalSelecionados}`);
    linhaSelecionados.editAsText().setBold(true).setItalic(true);
    const linhaProcessados = corpo.appendParagraph(`Aluno(a)s processados(as): ${infoLote.totalProcessados}`);
    linhaProcessados.editAsText().setBold(true).setItalic(true);
    corpo.appendParagraph("");

    // Um bloco compacto por aluno(a) — nome/currículo/habilitações
    // solicitadas com resultado e motivo por extenso
    // (historicoRelatorioEscreverBlocoAluno_, acima) — nunca a mesma
    // função de escrita do relatório individual (os dois writers
    // continuam inteiramente independentes, ver cabeçalho da seção).
    alunosResolvidos.forEach(aluno => {
      historicoRelatorioEscreverBlocoAluno_(corpo, aluno);
    });

    // RODADA B/C.1.2 (item 3) — "Relatório gerado em" + disclaimer
    // curto no RODAPÉ do conteúdo, NESTA ORDEM e NESTA POSIÇÃO (fim do
    // documento), exatamente como o modelo — inverte a posição do
    // disclaimer institucional, que até a rodada anterior ficava no
    // TOPO dos dois relatórios. A nota de EFEMERIDADE (o consolidado
    // nunca é salvo no Drive) saiu do corpo do documento — continua
    // válida e é comunicada à pessoa da equipe pela PRÓPRIA tela que
    // abre este PDF (historicoAbrirRelatorioConsolidado_,
    // HistoricoAnaliseUI.html), não precisa estar duplicada dentro do
    // PDF pra caber no texto "mais simples" pedido pelo item 3.
    const linhaGerado = corpo.appendParagraph(`Relatório gerado em: ${geradoEmTexto}`);
    linhaGerado.editAsText().setBold(true).setItalic(true);
    corpo.appendParagraph("");

    const obs = corpo.appendParagraph("OBS: " + HISTORICO_RELATORIO_DISCLAIMER_NOVO_LAYOUT);
    const obsTexto = obs.editAsText();
    obsTexto.setItalic(true);
    obsTexto.setItalic(0, 3, false); // "OBS:" (índices 0-3) fica reto — só a frase depois é itálico, igual ao modelo.

    const rodapeVersaoLayout = corpo.appendParagraph(`Layout do relatório: ${HISTORICO_RELATORIO_VERSION}`);
    rodapeVersaoLayout.editAsText().setFontSize(8).setForegroundColor("#999999");

    docTemp.saveAndClose();

    const pdfBlob = DriveApp.getFileById(docTemp.getId()).getAs("application/pdf");

    const alunosComErro = alunosResolvidos.filter(a => !!a.erroTecnico);

    // NUNCA createFile/substituirArquivoComSeguranca_ aqui (ver
    // cabeçalho da seção) — o base64 devolvido é o ÚNICO lugar onde
    // este PDF passa a existir; quem decide se ele "fica" em algum
    // lugar é a pessoa da equipe, salvando manualmente a partir da
    // aba que a tela abre (nome sugerido: nomeArquivo, §23).
    return {
      nomeArquivo: nomeArquivoFinal,
      base64: Utilities.base64Encode(pdfBlob.getBytes()),
      totalIncluidos: alunosResolvidos.length - alunosComErro.length,
      totalFalhas: alunosComErro.length,
      falhas: alunosComErro.map(a => ({ registroId: a.registroId, mensagem: a.erroTecnico }))
    };

  } finally {
    try { DriveApp.getFileById(docTemp.getId()).setTrashed(true); } catch (e) { /* já pode ter sumido */ }
  }

}

// Gera o PDF consolidado efêmero de vários aluno(a)s de uma vez.
// NUNCA salva nada (nem no Drive, nem em ANALISE_HISTORICO, nem altera
// Diplomas/etapa/versão/ruleset/status — só LEITURA de sessões já
// persistidas, ver cabeçalho da seção). O base64 devolvido é
// convertido em Blob e aberto pela própria tela
// (historicoAbrirRelatorioConsolidado_, HistoricoAnaliseUI.html).
//
// alunos: [{registroId, sessaoAnaliseId, erroTecnico, errosHabilitacao}, ...]
//         (§20-21 — ver historicoRelatorioValidarAlunosConsolidado_).
// loteInfo: {totalSelecionados, totalProcessados, cancelado} (§21).
function historicoGerarRelatorioConsolidado(alunos, loteInfo) {
  exigirAdministradorDiplomas_(); // DiplomasAcesso.gs
  return historicoRelatorioGerarPdfConsolidado_(alunos, loteInfo);
}
