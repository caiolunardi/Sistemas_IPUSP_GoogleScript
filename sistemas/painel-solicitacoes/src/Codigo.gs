/*=====================================================
  PAINEL DE FORMULÁRIOS — Serviço de Graduação (IPUSP)
  Backend Apps Script

  Dashboard EXCLUSIVA PARA ALUNOS — fica linkada no site
  do Serviço de Graduação para reunir os formulários que
  os próprios alunos preenchem. NÃO liste aqui sistemas
  de uso interno da equipe (ex: Emissão de Diplomas,
  qualquer painel de conferência/gestão) — só o que o
  aluno de fato deve acessar e preencher.

  COMO ADICIONAR UM NOVO FORMULÁRIO À LISTA:
  1) Inclua um objeto no array SISTEMAS abaixo, na posição
     em que ele deve aparecer. Não é necessário mexer no
     HTML — a lista inteira é renderizada a partir daqui.
  2) Se o formulário tiver período de abertura (não for
     contínuo o ano todo), adicione também uma linha na
     planilha de Períodos (ver PERIODOS_SPREADSHEET_ID)
     com o MESMO texto em "identificacaoPeriodos" na
     coluna A dessa linha.
  3) Se o formulário tiver MAIS DE UM período independente
     (ex: inclusão e exclusão abrem em janelas diferentes),
     use "subPeriodos" em vez de "identificacaoPeriodos" —
     ver exemplo em "Matrícula dos Intercambistas" abaixo e
     a explicação no bloco de comentário logo depois do
     array.

  Campos de cada item de SISTEMAS:
    nome                — título do card
    descricao           — subtítulo/explicação curta
    icone               — um emoji (mantém o mesmo estilo
                          visual dos ícones usados no app
                          de Diplomas)
    link                — URL de implantação (/exec) do
                          Web App (só usado pra abrir o
                          formulário ao clicar no card —
                          NÃO é usado pra identificar a
                          linha na planilha de Períodos,
                          porque o link muda quando se cria
                          uma implantação nova e um texto
                          de identificação não)
    identificacaoPeriodos — (caso simples, um período só)
                          texto EXATO da coluna A
                          ("Formulário") na linha
                          correspondente da planilha de
                          Períodos. Mesma estratégia usada
                          pelo script do próprio formulário
                          de Abertura de Habilitação
                          (NOME_FORMULARIO_PERIODOS) — os
                          dois lados precisam concordar
                          nesse texto.
    subPeriodos         — (caso composto, vários períodos
                          independentes) array de objetos
                          { rotulo, identificacaoPeriodos }.
                          Cada "rotulo" é uma palavra/expressão
                          curta usada para montar o texto do
                          selo do card (ex: "inclusão",
                          "exclusão"). Ver
                          calcularStatusComposto_ pra entender
                          como o texto final é montado.
    sufixoStatusComposto — (só usado junto com subPeriodos)
                          texto extra anexado ao final da
                          frase do selo, ex: " de disciplinas"
                          — gera "Aberto para inclusão e
                          exclusão de disciplinas".
    categoria            — ID (string) de uma das chaves de
                          CATEGORIAS_SISTEMAS, logo abaixo.
                          Decide em qual grupo/accordion o
                          card aparece na tela do aluno. É
                          sempre um ID estável, nunca inferido
                          do nome — adicionar um formulário a
                          uma categoria já existente é só
                          declarar esse campo, sem precisar
                          mexer no Painel.html.
=====================================================*/

const SISTEMAS = [
  {
    nome: "Pedido de Abertura de Habilitação",
    descricao: "Solicite a abertura de Bacharelado e(ou) Licenciatura.",
    icone: "📝",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbw5m0jlOTzpOm8X1qiCaFFGKZlzmKiKLofJI970GF07hQcSJhegB_0ObQ-PxZDZECQEjw/exec",
    identificacaoPeriodos: "Pedido de Abertura de Habilitação",
    categoria: "formacao-conclusao"
  },
  {
    nome: "Pedido de Trancamento Total de Matrícula",
    descricao: "Solicite o trancamento total de matrícula a partir do semestre vigente.",
    icone: "🔒",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbwMCqkjfj7zNj-KDUwnevY7ufRPco5gkt-5wpZyRJ5zzOfvfCnDXZNh-GHqoie3kO7RKg/exec",
    identificacaoPeriodos: "Pedido de Trancamento Total de Matrícula",
    categoria: "matricula-disciplinas"
  },
  {
    nome: "Pedido de Trancamento Parcial de Matrícula",
    descricao: "Solicite o trancamento parcial de disciplinas específicas.",
    icone: "🔓",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbwnom-UvotbcC-he2QrXBPMgy_U78-NAhcXgsgyan9VXETDlYW2zORQliGi-lBUK5a8SA/exec",
    identificacaoPeriodos: "Pedido de Trancamento Parcial de Matrícula",
    categoria: "matricula-disciplinas"
  },
  {
    nome: "2ª via do BUSP",
    descricao: "Solicite a 2ª via do Bilhete Único USP em caso de defeito, roubo/furto ou perda/extravio.",
    icone: "🎫",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbyWwG1K0W-Q5s2lRBeZ90DIbrghJf1r5W9YhuI7JrZepnzB2Vr-vIcu2sLTfPAzRaE3/exec",
    identificacaoPeriodos: "2ª via do BUSP",
    categoria: "beneficios-servicos"
  },
  {
    nome: "Inclusão e exclusão de disciplinas / Course Add & Drop",
    descricao: "Para estudantes intercambistas.\nFor exchange students.",
    icone: "🌎",
    link: "https://script.google.com/macros/s/AKfycbzXVgyn1He8Z5ymUvOwA24j9OwCbCK9KbPGQotvBK16RGNUTnZH-3MoITnxeChqyD4S/exec",
    subPeriodos: [
      { rotulo: "inclusão", identificacaoPeriodos: "Matrícula dos Intercambistas - Inclusão" },
      { rotulo: "exclusão", identificacaoPeriodos: "Matrícula dos Intercambistas - Exclusão" }
    ],
    sufixoStatusComposto: " de disciplinas",
    categoria: "intercambistas"
  },
  {
    nome: "Pedido de Exclusão de Disciplinas",
    descricao: "Solicite a exclusão de disciplinas da sua matrícula.",
    icone: "✂️",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbzZRRbduzNLsqPKKvok13YFINGWVQoCCQv1fhVQE09myBWzCHBSqcxkjccd1zAviJ1r/exec",
    identificacaoPeriodos: "Formulário de Exclusão de Disciplinas",
    categoria: "matricula-disciplinas"
  },
  {
    nome: "Pedido de Colação de Grau",
    descricao: "Solicite a sua colação de grau ao concluir o curso.",
    icone: "🎓",
    link: "https://script.google.com/a/macros/usp.br/s/AKfycbzewawdHrLiADc9sc2igr2TSc9mM2ET2XOz_s749FmJjQikEasFRVCNjaUuTMsxINhT/exec",
    identificacaoPeriodos: "Pedido de Colação de Grau",
    categoria: "formacao-conclusao"
  }
];

/*=====================================================
  CATEGORIAS — metadados dos grupos/accordions exibidos
  na tela do aluno. Cada SISTEMAS[i].categoria referencia
  uma chave daqui. Isso é a única fonte de verdade sobre
  título/ícone/descrição/ordem de cada categoria — o
  Painel.html NUNCA declara esse conteúdo, só o recebe
  (ver obterCategoriasParaFrontend_ logo abaixo).

  COMO ADICIONAR UMA CATEGORIA NOVA:
  1) Adicione uma chave aqui, com "ordem" maior que as
     existentes (decide a posição na tela).
  2) Use essa mesma chave no campo "categoria" de cada
     item de SISTEMAS que deva pertencer a ela.
  Nenhuma outra alteração é necessária.

  Campo "descricaoEn" é opcional — só usado quando a
  categoria também tem conteúdo em inglês (hoje, só
  Intercambistas). Quando ausente, a categoria é exibida
  só em português.
=====================================================*/
const CATEGORIAS_SISTEMAS = {
  "matricula-disciplinas": {
    ordem: 1,
    icone: "📚",
    titulo: "Matrícula e disciplinas",
    descricao: "Trancamentos e alterações nas disciplinas da sua matrícula."
  },
  "formacao-conclusao": {
    ordem: 2,
    icone: "🎓",
    titulo: "Formação e conclusão",
    descricao: "Habilitações do curso e solicitação de colação de grau."
  },
  "beneficios-servicos": {
    ordem: 3,
    icone: "🎫",
    titulo: "Benefícios e serviços",
    descricao: "Solicitações relacionadas a serviços e benefícios estudantis."
  },
  "intercambistas": {
    ordem: 4,
    icone: "🌎",
    titulo: "Intercambistas / Exchange Students",
    descricao: "Solicitações de matrícula para estudantes intercambistas.",
    descricaoEn: "Enrollment requests for exchange students."
  }
};

// Devolve os metadados de categoria já ordenados, com o "id" embutido em
// cada item (a chave do objeto acima não viaja sozinha pro frontend).
// Chamada só de dentro de um scriptlet do template (Painel.html), na
// hora em que a página é montada — NÃO é um endpoint de google.script.run,
// então não adiciona nenhuma chamada assíncrona nova: o contrato de
// obterSistemas() continua exatamente o mesmo de antes.
function obterCategoriasParaFrontend_() {
  return Object.keys(CATEGORIAS_SISTEMAS)
    .map(id => Object.assign({ id: id }, CATEGORIAS_SISTEMAS[id]))
    .sort((a, b) => a.ordem - b.ordem);
}

/*=====================================================
  PLANILHA DE PERÍODOS — controla em qual época do ano
  cada formulário fica disponível pro aluno. Sempre a
  PRIMEIRA aba da planilha (não depende do nome dela —
  ver obterAbaPeriodos_), colunas (a partir da linha 2):

    A: identificação (Formulário) — é ESTE campo, não o
       link da coluna B, que casa a linha com o item
       correspondente em SISTEMAS (via
       identificacaoPeriodos, ou com cada entrada de
       subPeriodos, no caso de formulário composto). Mesma
       estratégia do script do formulário de Abertura de
       Habilitação — o link de implantação pode mudar, o
       nome não.
    B: Link do Formulário (só uso informativo/de
       conferência aqui — o painel não usa esse valor pra
       casar as linhas)
    C: tipo — "Continuo" (fica sempre aberto, colunas
       seguintes podem ficar em branco) ou "Sazonal"
       (só abre dentro das janelas definidas abaixo)
    D: Data de abertura no 1º semestre (dd/mm/aa ou dd/mm/aaaa)
    E: Horário de abertura no 1º semestre (HH:mm)
    F: Data de fechamento no 1º semestre
    G: Horário de fechamento no 1º semestre
    H: Data de abertura no 2º semestre
    I: Horário de abertura no 2º semestre
    J: Data de fechamento no 2º semestre
    K: Horário de fechamento no 2º semestre
=====================================================*/

const PERIODOS_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("PERIODOS_SPREADSHEET_ID");
if (!PERIODOS_SPREADSHEET_ID) throw new Error("Configuração obrigatória ausente: PERIODOS_SPREADSHEET_ID");
// Em vez de depender do nome exato de uma aba (que já causou
// problema — a aba se chama diferente do que o código esperava),
// usamos sempre a PRIMEIRA aba da planilha, igual ao script do
// formulário individual (verificarPeriodoAbertura_ usa
// planilha.getSheets()[0]). Uma planilha dedicada só a isso
// raramente tem motivo pra ter mais de uma aba relevante, e essa
// abordagem sobrevive a qualquer rename futuro da aba.
function obterAbaPeriodos_(planilha) {
  return planilha.getSheets()[0];
}

// Fuso fixo pro cálculo de "agora" — mesmo cuidado do app de
// Diplomas: não usar Session.getScriptTimeZone(), que reflete o
// fuso do PROJETO do Apps Script e pode não ser o de São Paulo.
const TIMEZONE = "America/Sao_Paulo";

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

function doGet(e) {
  return HtmlService.createTemplateFromFile("Painel")
    .evaluate()
    .setTitle("Painel de Solicitações — Serviço de Graduação")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  DADOS PARA O FRONTEND
=====================================================*/

// Devolve a lista de formulários pro cliente, já com o status de
// abertura calculado NA HORA (é chamada toda vez que a dashboard é
// aberta — nunca fica um status "congelado" de uma carga antiga).
function obterSistemas() {

  const statusPorNome = obterStatusPorNome_();

  return SISTEMAS.map(sistema => {

    // Formulário composto (vários períodos independentes, ex:
    // inclusão e exclusão de disciplinas) — a lógica de combinação
    // fica isolada em calcularStatusComposto_, então esse branch só
    // delega pra lá e devolve o resultado já pronto pro frontend.
    if (sistema.subPeriodos) {
      const composto = calcularStatusComposto_(sistema.subPeriodos, statusPorNome, sistema.sufixoStatusComposto || "");
      return Object.assign({}, sistema, {
        aberto: composto.aberto,
        tipo: "",
        proximaAbertura: composto.proximaAbertura,
        statusTexto: composto.statusTexto
      });
    }

    const nomeChave = normalizarNome_(sistema.identificacaoPeriodos || sistema.nome);
    const status = statusPorNome[nomeChave];

    // Fail-open: se o formulário ainda não tem linha correspondente
    // na planilha de Períodos, não bloqueamos o aluno por causa de
    // uma planilha desatualizada — assumimos aberto e só registramos
    // um aviso pro time perceber e cadastrar a linha que falta.
    if (!status) {
      Logger.log(`Formulário sem linha correspondente na planilha de Períodos: "${sistema.nome}" (identificacaoPeriodos: "${sistema.identificacaoPeriodos || sistema.nome}")`);
      return Object.assign({}, sistema, { aberto: true, tipo: "", proximaAbertura: null });
    }

    return Object.assign({}, sistema, status);

  });

}

// Combina o status de vários sub-períodos independentes (ex:
// inclusão e exclusão de disciplinas, cada um com sua própria janela
// na planilha de Períodos) num único resultado pro card: se ao menos
// um está aberto, o card fica clicável; o texto do selo muda
// conforme quais sub-períodos estão abertos.
//
// Regras (generalizam os 4 casos pedidos pro formulário de
// Intercambistas, mas funcionam pra qualquer quantidade de
// sub-períodos, não só dois):
//   - TODOS abertos    -> "Aberto para <lista completa><sufixo>"
//   - TODOS fechados   -> "Fechado para <lista completa><sufixo>"
//   - Só ALGUNS abertos -> "Aberto somente para <lista dos abertos><sufixo>"
//
// "Reabre em ..." só é calculado/exibido quando TODOS estão
// fechados (mesmo critério dos formulários simples: só mostra
// previsão de reabertura quando o card está de fato fechado) —
// usa a data de reabertura MAIS PRÓXIMA entre os sub-períodos
// fechados.
function calcularStatusComposto_(subPeriodos, statusPorNome, sufixo) {

  const subsComStatus = subPeriodos.map(sub => {

    const chave = normalizarNome_(sub.identificacaoPeriodos);
    const status = statusPorNome[chave];

    if (!status) {
      // Mesmo critério fail-open dos formulários simples: sub-período
      // sem linha na planilha conta como aberto, só registra aviso.
      Logger.log(`Sub-período sem linha correspondente na planilha de Períodos: "${sub.identificacaoPeriodos}"`);
      return Object.assign({}, sub, { aberto: true, proximaAberturaOrdenavel: null });
    }

    return Object.assign({}, sub, status);

  });

  const rotulosTodos = subsComStatus.map(s => s.rotulo);
  const rotulosAbertos = subsComStatus.filter(s => s.aberto).map(s => s.rotulo);
  const todosFechados = rotulosAbertos.length === 0;
  const todosAbertos = rotulosAbertos.length === subsComStatus.length;

  let statusTexto;
  if (todosAbertos) {
    statusTexto = `Aberto para ${juntarComE_(rotulosTodos)}${sufixo}`;
  } else if (todosFechados) {
    statusTexto = `Fechado para ${juntarComE_(rotulosTodos)}${sufixo}`;
  } else {
    statusTexto = `Aberto somente para ${juntarComE_(rotulosAbertos)}${sufixo}`;
  }

  let proximaAbertura = null;
  if (todosFechados) {
    const futurasOrdenaveis = subsComStatus
      .map(s => s.proximaAberturaOrdenavel)
      .filter(Boolean)
      .sort();
    if (futurasOrdenaveis.length > 0) {
      proximaAbertura = formatarOrdenavelParaExibicao_(futurasOrdenaveis[0]);
    }
  }

  return {
    aberto: !todosFechados,
    statusTexto: statusTexto,
    proximaAbertura: proximaAbertura
  };

}

// Junta uma lista de textos com "e" antes do último item — usado
// pra montar "inclusão e exclusão", "A, B e C", etc. Mesma lógica
// (e mesmo nome) da função já usada no app de Diplomas.
function juntarComE_(lista) {
  const itens = (lista || []).filter(v => v !== "" && v !== null && v !== undefined);
  if (itens.length === 0) return "";
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

// Normaliza um texto pra comparação de identificação: minúsculas,
// sem espaços nas pontas, espaços internos duplicados colapsados em
// um só, e sem acentuação — pra sobreviver a diferenças invisíveis
// de digitação/cópia entre a planilha e o código (espaço duplo,
// acento composto de forma diferente, etc.), que são o tipo de coisa
// que faz esse casamento falhar silenciosamente sem nenhum erro
// visível na tela.
function normalizarNome_(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " "); // colapsa espaços internos repetidos
}

/*=====================================================
  LEITURA DA PLANILHA DE PERÍODOS
=====================================================*/

// Lê a primeira aba da planilha de Períodos inteira e devolve um
// mapa "nome (coluna A, normalizado) -> status", já calculado pra
// AGORA. Qualquer problema de acesso à planilha (permissão, etc.)
// não derruba a dashboard inteira — só faz obterSistemas() cair no
// fail-open acima pra todo mundo.
function obterStatusPorNome_() {

  const mapa = {};

  try {

    const planilha = SpreadsheetApp.openById(PERIODOS_SPREADSHEET_ID);
    const aba = obterAbaPeriodos_(planilha);

    if (!aba) {
      Logger.log("Não encontrei nenhuma aba na planilha de Períodos.");
      return mapa;
    }

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return mapa;

    const dados = aba.getRange(2, 1, ultimaLinha - 1, 11).getValues();
    const agoraOrdenavel = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm");

    dados.forEach(linhaDados => {

      const nomeChave = normalizarNome_(linhaDados[0]);
      if (!nomeChave) return; // linha em branco ou sem identificação — ignora

      const linha = {
        tipo: linhaDados[2],
        sem1Abertura: linhaDados[3],
        sem1AberturaHora: linhaDados[4],
        sem1Fechamento: linhaDados[5],
        sem1FechamentoHora: linhaDados[6],
        sem2Abertura: linhaDados[7],
        sem2AberturaHora: linhaDados[8],
        sem2Fechamento: linhaDados[9],
        sem2FechamentoHora: linhaDados[10]
      };

      const resultado = avaliarPeriodo_(linha, agoraOrdenavel);

      mapa[nomeChave] = {
        aberto: resultado.aberto,
        tipo: String(linha.tipo || "").trim(),
        proximaAbertura: resultado.proximaAberturaOrdenavel
          ? formatarOrdenavelParaExibicao_(resultado.proximaAberturaOrdenavel)
          : null,
        // Mantido em formato bruto (ordenável) além do formatado
        // acima — necessário pra calcularStatusComposto_ conseguir
        // comparar/escolher a data mais próxima entre vários
        // sub-períodos. Formulários simples ignoram esse campo.
        proximaAberturaOrdenavel: resultado.proximaAberturaOrdenavel || null
      };

    });

  } catch (err) {
    Logger.log("Falha ao ler a planilha de Períodos: " + err);
  }

  return mapa;

}

// "Continuo" nunca precisa de checagem de data — fica sempre aberto.
// "Sazonal" só fica aberto se AGORA cair dentro da janela do 1º ou
// do 2º semestre (uma janela com data/hora incompleta é ignorada,
// nunca tratada como "sempre aberta" por omissão).
function avaliarPeriodo_(linha, agoraOrdenavel) {

  const tipo = String(linha.tipo || "").trim().toLowerCase();

  if (tipo.indexOf("cont") === 0) {
    return { aberto: true, proximaAberturaOrdenavel: null };
  }

  const janelas = [];

  const j1Abertura = paraOrdenavel_(linha.sem1Abertura, linha.sem1AberturaHora);
  const j1Fechamento = paraOrdenavel_(linha.sem1Fechamento, linha.sem1FechamentoHora);
  if (j1Abertura && j1Fechamento) janelas.push({ abertura: j1Abertura, fechamento: j1Fechamento });

  const j2Abertura = paraOrdenavel_(linha.sem2Abertura, linha.sem2AberturaHora);
  const j2Fechamento = paraOrdenavel_(linha.sem2Fechamento, linha.sem2FechamentoHora);
  if (j2Abertura && j2Fechamento) janelas.push({ abertura: j2Abertura, fechamento: j2Fechamento });

  const aberto = janelas.some(j => agoraOrdenavel >= j.abertura && agoraOrdenavel <= j.fechamento);

  let proximaAberturaOrdenavel = null;
  if (!aberto) {
    const futuras = janelas.map(j => j.abertura).filter(a => a > agoraOrdenavel).sort();
    if (futuras.length > 0) proximaAberturaOrdenavel = futuras[0];
  }

  return { aberto: aberto, proximaAberturaOrdenavel: proximaAberturaOrdenavel };

}

// Converte data (texto dd/mm/aa OU dd/mm/aaaa, OU um objeto Date —
// é isso que o Sheets devolve quando a coluna está formatada como
// data) + horário (texto HH:mm, OU um objeto Date de hora pura) num
// carimbo "yyyy-MM-dd HH:mm" zero-padded. Comparar essas strings
// diretamente (>=, <=, >) já dá a ordem cronológica certa, sem
// precisar comparar objetos Date entre si — e sem o risco de
// ambiguidade de fuso horário que isso traria (mesmo problema que o
// app de Diplomas já documentou pro fuso de e-mail: formatamos
// sempre no fuso fixo TIMEZONE, nunca no fuso padrão do projeto).
// Devolve null se a data estiver ausente ou em formato não
// reconhecido — uma janela incompleta nunca é tratada como válida.
function paraOrdenavel_(dataValor, horaValor) {

  if (!dataValor) return null;

  let dia, mes, ano;

  if (dataValor instanceof Date) {
    dia = Utilities.formatDate(dataValor, TIMEZONE, "dd");
    mes = Utilities.formatDate(dataValor, TIMEZONE, "MM");
    ano = Utilities.formatDate(dataValor, TIMEZONE, "yyyy");
  } else {

    const partesData = String(dataValor).trim().split("/");
    if (partesData.length !== 3) return null;

    dia = partesData[0].trim().padStart(2, "0");
    mes = partesData[1].trim().padStart(2, "0");
    ano = partesData[2].trim();

    if (ano.length === 2) ano = "20" + ano;
    else if (ano.length !== 4) return null;

  }

  if (!/^\d{2}$/.test(dia) || !/^\d{2}$/.test(mes) || !/^\d{4}$/.test(ano)) return null;

  let hora = "00:00";

  if (horaValor instanceof Date) {
    hora = Utilities.formatDate(horaValor, TIMEZONE, "HH:mm");
  } else if (horaValor) {
    const partesHora = String(horaValor).trim().split(":");
    if (partesHora.length !== 2) return null;
    const h = partesHora[0].trim().padStart(2, "0");
    const m = partesHora[1].trim().padStart(2, "0");
    if (!/^\d{2}$/.test(h) || !/^\d{2}$/.test(m)) return null;
    hora = `${h}:${m}`;
  }

  return `${ano}-${mes}-${dia} ${hora}`;

}

// Caminho inverso de paraOrdenavel_, só pra exibir "reabre em ..."
// de um jeito amigável na dashboard.
function formatarOrdenavelParaExibicao_(carimboOrdenavel) {
  const [dataParte, horaParte] = carimboOrdenavel.split(" ");
  const [ano, mes, dia] = dataParte.split("-");
  return `${dia}/${mes}/${ano} às ${horaParte}`;
}

/*=====================================================
  DIAGNÓSTICO — rode esta função manualmente pelo editor
  do Apps Script (▶ Executar, com "diagnosticarPeriodos"
  selecionado no menu de funções) sempre que quiser
  confirmar se a planilha de Períodos está sendo lida e
  casada corretamente com os formulários de SISTEMAS.
  Depois veja o resultado em Ver > Registros de execução.
=====================================================*/
function diagnosticarPeriodos() {

  const planilha = SpreadsheetApp.openById(PERIODOS_SPREADSHEET_ID);
  const aba = obterAbaPeriodos_(planilha);

  Logger.log("=== Linhas cruas da planilha de Períodos (coluna A) ===");
  if (!aba) {
    Logger.log("Não encontrei nenhuma aba na planilha de Períodos.");
  } else {
    Logger.log(`Lendo a primeira aba da planilha: "${aba.getName()}"`);
    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) {
      Logger.log("(planilha sem dados a partir da linha 2)");
    } else {
      const colunaA = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();
      colunaA.forEach((linha, i) => {
        const bruto = linha[0];
        if (!String(bruto || "").trim()) return;
        Logger.log(`Linha ${i + 2}: bruto="${bruto}" | normalizado="${normalizarNome_(bruto)}"`);
      });
    }
  }

  const statusPorNome = obterStatusPorNome_();

  Logger.log("=== Casamento com cada formulário/sub-período de SISTEMAS ===");
  SISTEMAS.forEach(sistema => {

    if (sistema.subPeriodos) {
      Logger.log(`"${sistema.nome}" — formulário COMPOSTO (${sistema.subPeriodos.length} sub-períodos):`);
      sistema.subPeriodos.forEach(sub => {
        const nomeChave = normalizarNome_(sub.identificacaoPeriodos);
        const encontrado = statusPorNome[nomeChave];
        Logger.log(
          `   [${sub.rotulo}] identificacaoPeriodos bruto="${sub.identificacaoPeriodos}" | normalizado="${nomeChave}" — ` +
          (encontrado
            ? `ENCONTRADO na planilha → aberto=${encontrado.aberto}, tipo=${encontrado.tipo}`
            : `NÃO ENCONTRADO — compare com as linhas listadas acima`)
        );
      });
      const composto = calcularStatusComposto_(sistema.subPeriodos, statusPorNome, sistema.sufixoStatusComposto || "");
      Logger.log(`   -> Resultado combinado: aberto=${composto.aberto}, texto="${composto.statusTexto}"`);
      return;
    }

    const identificacao = sistema.identificacaoPeriodos || sistema.nome;
    const nomeChave = normalizarNome_(identificacao);
    const encontrado = statusPorNome[nomeChave];
    Logger.log(
      `"${sistema.nome}" — identificacaoPeriodos bruto="${identificacao}" | normalizado="${nomeChave}" — ` +
      (encontrado
        ? `ENCONTRADO na planilha → aberto=${encontrado.aberto}, tipo=${encontrado.tipo}`
        : `NÃO ENCONTRADO — compare o "normalizado" desta linha com o "normalizado" de cada linha da planilha acima; se forem diferentes, é aí que está a diferença`)
    );
  });

}
