/*=====================================================
  BUSCA DE ALUNOS — Serviço de Graduação (IPUSP)
  Backend Apps Script

  Ferramenta enxuta pra localizar um aluno rapidamente por nome
  (parcial, em qualquer ordem), número USP ou e-mail. Criada
  pra apoiar a triagem dos grupos de atendimento clínico, que
  chegam da Psicologia Clínica com nomes incompletos e sem
  número USP.

  A planilha de alunos NUNCA é referenciada por ID fixo aqui —
  o ID de verdade é resolvido em tempo de execução a partir da
  planilha ID_INDEX (ver obterIdProducao_), seguindo o mesmo
  padrão adotado pros outros sistemas: se um dia a planilha de
  alunos mudar de lugar, só se atualiza a linha correspondente
  no ID_INDEX — nenhum código muda.

  Toda a filtragem acontece no NAVEGADOR (ver BuscaAlunosApp.html):
  o servidor só devolve a lista completa uma vez, quando a
  página abre. Não tem chamada ao servidor a cada tecla digitada.

  GRADIP UI v1.0 (tema Claro/Escuro/Sistema + Central de Ajuda):
  em relação ao código original, só mudaram neste arquivo:
    1) o ID da planilha ID_INDEX saiu do código e passou a ser
       lido de Script Properties["ID_INDEX_SPREADSHEET_ID"]
       (regra de segurança do repositório central — IDs reais de
       planilha não ficam no Git). Ver obterIdIndice_.
    2) doGet passou de createHtmlOutputFromFile para
       createTemplateFromFile(...).evaluate(), e foi criado o
       helper include_ — necessários pra página incluir os
       arquivos compartilhados do tema (GradipTema,
       GradipTemaControle, marcas) e da Central de Ajuda.
  A leitura da planilha de alunos (listarAlunosParaBusca), os
  cabeçalhos esperados e o contrato com o frontend continuaram
  exatamente os mesmos na v1.0.

  v1.1 (pedido do Serviço de Graduação, 13/10/2026):
    - coluna do e-mail principal corrigida para "eMail" e
      inclusão da coluna "Ingresso" (AAAA/S);
    - cada aluno da lista leva "linha" e "ingresso";
    - FICHA DO ALUNO: obterFichaAluno (todas as colunas de uma
      linha) e salvarFichaAluno (grava só o que mudou, com
      conferência de permissão, de linha e de conflito);
    - EXPORTAÇÃO: gerarPdfListaAlunos (o CSV é feito no navegador).

  ARQUIVOS DO PROJETO (todos na raiz do Apps Script, nomes sem
  extensão no include_):
    Codigo.gs                  — este arquivo
    BuscaAlunosApp.html        — página principal (busca)
    GradipTema.html            — tokens + Sistema/Claro/Escuro
    GradipTemaControle.html    — seletor "Aparência"
    GradipMarcaIPUSP.html      — marca IPUSP (azul/branca)
    GradipMarcaUSP.html        — marca USP (PNG azul/SVG branco)
    BuscaAlunosAjuda.html      — conteúdo da Central de Ajuda
    BuscaAlunosAjudaEstilos.html — estilos da Central
    BuscaAlunosAjudaUI.html    — comportamento da Central
=====================================================*/

// O ID da planilha mestre ID_INDEX fica em Script Properties, fora
// do Git (Configurações do projeto → Propriedades do script). O
// valor nunca é registrado em log nem enviado ao navegador.
const PROPRIEDADE_ID_INDICE = "ID_INDEX_SPREADSHEET_ID";
const ABA_INDICE = "Página1";

const CHAVE_PLANILHA_ALUNOS = "PLANILHA_ALUNOS";

// Nomes EXATOS dos cabeçalhos na planilha de alunos (aba única).
// Lidos por nome, não por posição de coluna — se alguém inserir ou
// reordenar uma coluna lá, isso aqui não quebra.
//
// v1.1: o e-mail principal se chama só "eMail" (o "Tт" que aparece
// antes dele na planilha é o ícone de coluna do tipo texto da
// tabela do Sheets, não faz parte do nome). Foi incluída a coluna
// "Ingresso" (AAAA/S, ex.: 2024/1), usada no filtro por ano.
const CABECALHOS_ALUNOS = {
  numeroUsp: "Número USP",
  nome: "Nome do Aluno",
  ingresso: "Ingresso",
  email: "eMail",
  emailSecundario: "eMail Secundario"
};

// Colunas exibidas na ficha do aluno, mas que NÃO podem ser
// alteradas por este app (ex.: ID da Pasta é usado por outro
// sistema pra achar a pasta do aluno no Drive — um erro de
// digitação aqui quebraria esse vínculo). Comparação pelo título
// exato da linha 1. Células com fórmula também ficam bloqueadas.
const COLUNAS_SOMENTE_LEITURA = ["ID da Pasta"];

// Limites de tamanho dos valores aceitos ao salvar e da exportação.
const TAMANHO_MAXIMO_CAMPO = 500;
const MAXIMO_LINHAS_EXPORTACAO = 5000;

/*=====================================================
  SERVE A PÁGINA (ponto de entrada do Web App)
=====================================================*/

// Template (e não HtmlOutput direto) porque BuscaAlunosApp.html usa
// scriptlets <?!= include_('...') ?> pra trazer o tema e a ajuda.
// Nenhum dado de aluno passa por aqui: a lista continua chegando só
// pela chamada google.script.run.listarAlunosParaBusca().
function doGet() {
  return HtmlService.createTemplateFromFile("BuscaAlunosApp")
      .evaluate()
      .setTitle("Busca de Alunos — Serviço de Graduação")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Mesmo helper dos outros sistemas do repositório (Painel de
// Solicitações, Estrutura Curricular): devolve o conteúdo bruto de
// um arquivo HTML do projeto pra ser incluído no template.
function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*-----------------------------------------------------
  ÍNDICE DE PLANILHAS — resolve o ID de produção de
  qualquer "chave" cadastrada na planilha ID_INDEX. Genérica de
  propósito: qualquer sistema novo pode reaproveitar essa mesma
  função (só muda a chave procurada), sem duplicar IDs de
  planilha espalhados pelo código de cada um.
------------------------------------------------------*/

// Lê o ID da própria planilha ID_INDEX das Propriedades do script.
// Antes, esse ID era uma constante literal no código; foi movido
// pra cá pra não ficar versionado no Git. A mensagem de erro cita só
// o NOME da propriedade, nunca um valor.
function obterIdIndice_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  if (!id) throw new Error(`Configuração obrigatória ausente: ${PROPRIEDADE_ID_INDICE}.`);
  return String(id).trim();
}

function obterIdProducao_(chave) {

  const planilha = SpreadsheetApp.openById(obterIdIndice_());
  const aba = planilha.getSheetByName(ABA_INDICE) || planilha.getSheets()[0];

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) {
    throw new Error("A planilha ID_INDEX não tem nenhuma linha de dados.");
  }

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const cabecalho = valores[0];

  const colChave = cabecalho.indexOf("Chave");
  const colId = cabecalho.indexOf("ID de Produção");
  if (colChave === -1 || colId === -1) {
    throw new Error('A planilha ID_INDEX precisa ter as colunas "Chave" e "ID de Produção".');
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colChave]).trim() === chave) {
      const id = String(valores[i][colId] || "").trim();
      if (!id) {
        throw new Error(`A chave "${chave}" está cadastrada no ID_INDEX, mas a coluna "ID de Produção" está vazia.`);
      }
      return id;
    }
  }

  throw new Error(`Não encontrei a chave "${chave}" na planilha ID_INDEX.`);

}

/*-----------------------------------------------------
  LEITURA DA PLANILHA DE ALUNOS — devolve a lista inteira já
  pronta pra busca no cliente. Só os campos usados na busca, no
  filtro por ingresso e no resultado (número USP, nome, ingresso,
  e-mail e e-mail secundário) — nada de expor colunas internas
  (ex.: ID da Pasta) que não têm uso aqui. A ficha completa de UM
  aluno só é lida quando ele é aberto (ver obterFichaAluno).

  v1.1: cada aluno passa a levar também "linha" (número da linha
  na planilha, usado pra abrir/salvar a ficha) e "ingresso".
------------------------------------------------------*/
function listarAlunosParaBusca() {

  const aba = obterAbaAlunos_();

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  const mapa = mapearColunas_(valores[0]);

  const alunos = [];
  for (let i = 1; i < valores.length; i++) {

    const linha = valores[i];
    const numeroUsp = String(linha[mapa.numeroUsp] || "").trim();
    const nome = String(linha[mapa.nome] || "").trim();

    if (!numeroUsp && !nome) continue; // linha em branco

    alunos.push({
      linha: i + 1,
      numeroUsp: numeroUsp,
      nome: nome,
      ingresso: String(linha[mapa.ingresso] || "").trim(),
      email: String(linha[mapa.email] || "").trim(),
      emailSecundario: String(linha[mapa.emailSecundario] || "").trim()
    });

  }

  return alunos;

}

// Abre a planilha de alunos (via ID_INDEX) e devolve a aba única.
function obterAbaAlunos_() {
  const planilha = SpreadsheetApp.openById(obterIdProducao_(CHAVE_PLANILHA_ALUNOS));
  return planilha.getSheets()[0]; // planilha de alunos tem uma aba única
}

// Localiza cada coluna de CABECALHOS_ALUNOS pelo título (linha 1),
// ignorando espaços nas pontas. Lança erro amigável se faltar alguma.
function mapearColunas_(cabecalho) {
  const titulos = cabecalho.map(t => String(t).trim());
  const mapa = {};
  Object.keys(CABECALHOS_ALUNOS).forEach(chave => {
    const nomeColuna = CABECALHOS_ALUNOS[chave];
    const indice = titulos.indexOf(nomeColuna);
    if (indice === -1) {
      throw new Error(`A planilha de alunos precisa ter uma coluna "${nomeColuna}".`);
    }
    mapa[chave] = indice;
  });
  return mapa;
}

/*-----------------------------------------------------
  FICHA DO ALUNO — leitura completa de UMA linha, pra montar o
  modal de edição. Devolve todas as colunas com título na linha
  1, na ordem da planilha, cada uma com:
    titulo   — texto da linha 1
    valor    — valor como aparece na planilha (getDisplayValues)
    editavel — false para COLUNAS_SOMENTE_LEITURA e células com
               fórmula
  A linha é conferida pelo número USP e pelo nome que o
  navegador recebeu na lista: se alguém ordenou, inseriu ou
  apagou linhas desde que a página abriu, a linha pode ser de
  outro aluno — aí recusamos em vez de mostrar/editar o errado.
------------------------------------------------------*/
function obterFichaAluno(referencia) {
  const aba = obterAbaAlunos_();
  const linha = conferirLinhaAluno_(aba, referencia);
  return montarFicha_(aba, linha);
}

function conferirLinhaAluno_(aba, referencia) {

  const ref = referencia || {};
  const linha = Number(ref.linha);
  if (!Number.isInteger(linha) || linha < 2 || linha > aba.getLastRow()) {
    throw new Error("Não encontrei esse aluno na planilha. Recarregue a página e tente de novo.");
  }

  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const mapa = mapearColunas_(cabecalho);
  const atual = aba.getRange(linha, 1, 1, cabecalho.length).getValues()[0];

  const numeroUspAtual = String(atual[mapa.numeroUsp] || "").trim();
  const nomeAtual = String(atual[mapa.nome] || "").trim();
  if (numeroUspAtual !== String(ref.numeroUsp || "").trim() || nomeAtual !== String(ref.nome || "").trim()) {
    throw new Error("A planilha de alunos mudou desde que esta página foi aberta (linhas ordenadas, inseridas ou editadas). Recarregue a página e abra o aluno de novo.");
  }

  return linha;

}

function montarFicha_(aba, linha) {

  const ultimaColuna = aba.getLastColumn();
  const cabecalho = aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0];
  const intervalo = aba.getRange(linha, 1, 1, ultimaColuna);
  const exibidos = intervalo.getDisplayValues()[0];
  const formulas = intervalo.getFormulas()[0];

  const campos = [];
  cabecalho.forEach((tituloBruto, i) => {
    const titulo = String(tituloBruto).trim();
    if (!titulo) return; // coluna sem título — ignorada
    campos.push({
      titulo: titulo,
      valor: exibidos[i],
      editavel: COLUNAS_SOMENTE_LEITURA.indexOf(titulo) === -1 && !formulas[i]
    });
  });

  return { linha: linha, campos: campos, podeEditar: usuarioPodeEditar_(aba) };

}

/*-----------------------------------------------------
  QUEM PODE SALVAR — só quem é EDITOR da planilha de alunos.

  O Web App pode estar implantado para executar como quem
  implantou; nesse caso o Sheets aceitaria a gravação de
  qualquer pessoa que abrisse a página. Por isso a permissão é
  conferida aqui, no servidor, a cada gravação: o e-mail de quem
  está usando (Session.getActiveUser) precisa estar entre os
  editores da planilha (dono incluído). Sem e-mail identificado
  (conta de outro domínio, por exemplo) → não pode salvar.
  Compartilhamento só via GRUPO não aparece em getEditors(): nesse
  caso, a pessoa precisa ser adicionada individualmente.
------------------------------------------------------*/
function usuarioPodeEditar_(aba) {
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email) return false;
  try {
    const planilha = aba.getParent();
    const editores = planilha.getEditors().map(u => String(u.getEmail() || "").trim().toLowerCase());
    const dono = planilha.getOwner(); // null em Drive compartilhado
    if (dono && dono.getEmail()) editores.push(String(dono.getEmail()).trim().toLowerCase());
    return editores.indexOf(email) !== -1;
  } catch (err) {
    // Sem permissão nem pra listar os editores (ex.: Web App executando
    // como o usuário e ele só tem leitura) = não é editor.
    return false;
  }
}

/*-----------------------------------------------------
  SALVAR FICHA — grava as alterações feitas no modal.

  pedido = {
    linha, numeroUsp, nome — mesma referência de obterFichaAluno
    originais: { "<título>": "<valor exibido quando a ficha abriu>" }
    novos:     { "<título>": "<valor digitado>" }
  }

  Regras (todas validadas aqui, nunca só no navegador):
    1. quem chama precisa ser editor da planilha;
    2. a linha ainda precisa ser do mesmo aluno;
    3. só colunas existentes, editáveis e sem fórmula;
    4. cada coluna alterada precisa estar IGUAL ao "original" no
       momento da gravação — se outra pessoa mudou o mesmo campo
       nesse meio-tempo, recusamos em vez de sobrescrever;
    5. formatos: Número USP só dígitos; Ingresso AAAA/1 ou
       AAAA/2; e-mails com formato de e-mail (ou vazio no
       secundário); nome não pode ficar vazio.
  Só as células que mudaram são escritas. LockService evita
  duas gravações simultâneas na mesma planilha. Nada do conteúdo
  é registrado em log.
  Devolve a ficha atualizada + o resumo pra lista de busca.
------------------------------------------------------*/
function salvarFichaAluno(pedido) {

  const p = pedido || {};
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(15000)) {
    throw new Error("Outra gravação está em andamento. Aguarde alguns segundos e tente salvar de novo.");
  }

  try {

    const aba = obterAbaAlunos_();
    if (!usuarioPodeEditar_(aba)) {
      throw new Error("Sua conta não tem permissão para alterar a planilha de alunos. Peça acesso de editor ao responsável pelo cadastro.");
    }

    const linha = conferirLinhaAluno_(aba, p);
    const ultimaColuna = aba.getLastColumn();
    const titulos = aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].map(t => String(t).trim());
    const intervalo = aba.getRange(linha, 1, 1, ultimaColuna);
    const exibidos = intervalo.getDisplayValues()[0];
    const brutos = intervalo.getValues()[0];
    const formulas = intervalo.getFormulas()[0];

    const originais = p.originais || {};
    const novos = p.novos || {};
    const alteracoes = [];

    Object.keys(novos).forEach(titulo => {
      const i = titulos.indexOf(titulo);
      if (i === -1 || !titulo) throw new Error(`A coluna "${limitar_(titulo, 60)}" não existe na planilha de alunos.`);
      const novo = limparValor_(novos[titulo]);
      if (novo === limparValor_(originais[titulo])) return; // não mudou
      if (COLUNAS_SOMENTE_LEITURA.indexOf(titulo) !== -1 || formulas[i]) {
        throw new Error(`A coluna "${titulo}" não pode ser alterada por aqui.`);
      }
      if (String(exibidos[i]) !== String(originais[titulo] == null ? "" : originais[titulo])) {
        throw new Error(`O campo "${titulo}" foi alterado por outra pessoa enquanto a ficha estava aberta. Feche, abra o aluno de novo e refaça a alteração.`);
      }
      validarCampo_(titulo, novo);
      alteracoes.push({ coluna: i + 1, valor: converterParaCelula_(novo, brutos[i]) });
    });

    alteracoes.forEach(a => aba.getRange(linha, a.coluna).setValue(a.valor));
    if (alteracoes.length) SpreadsheetApp.flush();

    const ficha = montarFicha_(aba, linha);
    const mapa = mapearColunas_(titulos);
    const valoresLinha = aba.getRange(linha, 1, 1, ultimaColuna).getValues()[0];
    ficha.alterados = alteracoes.length;
    ficha.resumo = {
      linha: linha,
      numeroUsp: String(valoresLinha[mapa.numeroUsp] || "").trim(),
      nome: String(valoresLinha[mapa.nome] || "").trim(),
      ingresso: String(valoresLinha[mapa.ingresso] || "").trim(),
      email: String(valoresLinha[mapa.email] || "").trim(),
      emailSecundario: String(valoresLinha[mapa.emailSecundario] || "").trim()
    };
    return ficha;

  } finally {
    trava.releaseLock();
  }

}

// Remove caracteres de controle, espaços nas pontas e limita o tamanho.
function limparValor_(valor) {
  return limitar_(String(valor == null ? "" : valor)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim(), TAMANHO_MAXIMO_CAMPO);
}

function limitar_(texto, maximo) {
  const t = String(texto == null ? "" : texto);
  return t.length > maximo ? t.slice(0, maximo) : t;
}

// Regras de formato das colunas conhecidas. Colunas não listadas
// em CABECALHOS_ALUNOS só passam pela limpeza/limite de tamanho.
function validarCampo_(titulo, valor) {
  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (titulo === CABECALHOS_ALUNOS.nome && !valor) {
    throw new Error("O nome do aluno não pode ficar vazio.");
  }
  if (titulo === CABECALHOS_ALUNOS.numeroUsp && valor && !/^\d{1,12}$/.test(valor)) {
    throw new Error("O número USP deve ter só dígitos.");
  }
  if (titulo === CABECALHOS_ALUNOS.ingresso && valor && !/^\d{4}\/[12]$/.test(valor)) {
    throw new Error("O ingresso deve estar no formato AAAA/S, por exemplo 2024/1 ou 2024/2.");
  }
  if ((titulo === CABECALHOS_ALUNOS.email || titulo === CABECALHOS_ALUNOS.emailSecundario) && valor && !formatoEmail.test(valor)) {
    throw new Error(`O valor de "${titulo}" não parece um e-mail válido.`);
  }
}

// Mantém o tipo da célula: se ela guardava um NÚMERO (ex.: Número USP
// numa coluna numérica) e o novo valor é só dígitos, grava número —
// senão o Sheets passaria a ter uma mistura de texto e número na mesma
// coluna. Todo o resto é gravado como texto, exatamente como digitado.
function converterParaCelula_(novo, valorAnterior) {
  if (typeof valorAnterior === "number" && /^\d+$/.test(novo)) return Number(novo);
  return novo;
}

/*-----------------------------------------------------
  EXPORTAÇÃO EM PDF — o CSV é gerado no próprio navegador; o PDF
  precisa do servidor (HtmlService → PDF via Utilities, sem
  DriveApp e sem salvar nada no Drive). Recebe as linhas que o
  navegador já está mostrando (já filtradas por ano/semestre/
  busca) — não lê a planilha de novo nem dá acesso a nada além do
  que a página já tem. Todo texto é escapado antes de virar HTML.
  Devolve { nome, base64 } pro navegador baixar.
------------------------------------------------------*/
function gerarPdfListaAlunos(pedido) {

  const p = pedido || {};
  const linhas = Array.isArray(p.linhas) ? p.linhas : [];
  if (!linhas.length) throw new Error("Não há alunos na lista para exportar.");
  if (linhas.length > MAXIMO_LINHAS_EXPORTACAO) {
    throw new Error(`A lista tem mais de ${MAXIMO_LINHAS_EXPORTACAO} alunos. Filtre por ano ou semestre antes de exportar.`);
  }

  const titulo = limitar_(String(p.titulo || "Lista de alunos"), 200);
  const geradoEm = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");
  const colunas = ["Nome do Aluno", "Número USP", "Ingresso", "eMail", "eMail Secundario"];
  const chaves = ["nome", "numeroUsp", "ingresso", "email", "emailSecundario"];

  const corpo = linhas.map((l, i) =>
    `<tr><td class="n">${i + 1}</td>${chaves.map(c => `<td>${escaparHtml_(limitar_(l && l[c], 300))}</td>`).join("")}</tr>`
  ).join("");

  const html =
    `<html><head><meta charset="utf-8"><style>` +
    `@page{size:A4 landscape;margin:14mm}` +
    `body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#1f2933}` +
    `h1{font-size:14pt;margin:0 0 2px}p{margin:0 0 10px;color:#5f6b76;font-size:9pt}` +
    `table{width:100%;border-collapse:collapse}th,td{border:1px solid #b8c2cc;padding:4px 6px;text-align:left;vertical-align:top}` +
    `th{background:#eff6ff;color:#00457f}td.n{color:#5f6b76;width:28px}` +
    `</style></head><body>` +
    `<h1>${escaparHtml_(titulo)}</h1>` +
    `<p>Serviço de Graduação — Instituto de Psicologia da USP · ${linhas.length} aluno${linhas.length === 1 ? "" : "s"} · gerado em ${geradoEm}. Contém dados pessoais: uso restrito à finalidade da solicitação.</p>` +
    `<table><thead><tr><th>#</th>${colunas.map(c => `<th>${escaparHtml_(c)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table>` +
    `</body></html>`;

  const pdf = Utilities.newBlob(html, "text/html", "lista.html").getAs("application/pdf");
  return {
    nome: limitar_(String(p.nomeArquivo || "lista-alunos"), 120).replace(/[^\w.\-]+/g, "_") + ".pdf",
    base64: Utilities.base64Encode(pdf.getBytes())
  };

}

function escaparHtml_(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/*=====================================================
  DIAGNÓSTICO — rode esta função manualmente pelo editor
  do Apps Script (▶ Executar, com "diagnosticarBuscaAlunos"
  selecionado no menu de funções) depois de instalar ou
  mudar a configuração. Depois veja o resultado em
  Ver > Registros de execução.

  Registra SÓ informação de configuração (se a propriedade
  existe, nome da aba do índice, se a chave foi resolvida,
  cabeçalhos encontrados e QUANTOS alunos foram lidos) —
  nunca IDs, nomes, números USP ou e-mails.
=====================================================*/
function diagnosticarBuscaAlunos() {

  const temPropriedade = !!PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_ID_INDICE);
  Logger.log(`Propriedade ${PROPRIEDADE_ID_INDICE}: ${temPropriedade ? "configurada" : "AUSENTE — cadastre em Configurações do projeto → Propriedades do script"}`);
  if (!temPropriedade) return;

  const indice = SpreadsheetApp.openById(obterIdIndice_());
  const abaIndice = indice.getSheetByName(ABA_INDICE) || indice.getSheets()[0];
  Logger.log(`Aba lida no ID_INDEX: "${abaIndice.getName()}"${abaIndice.getName() === ABA_INDICE ? "" : ` (não existe "${ABA_INDICE}"; usada a primeira aba)`}`);

  obterIdProducao_(CHAVE_PLANILHA_ALUNOS);
  Logger.log(`Chave ${CHAVE_PLANILHA_ALUNOS}: encontrada no ID_INDEX`);

  const abaAlunos = SpreadsheetApp.openById(obterIdProducao_(CHAVE_PLANILHA_ALUNOS)).getSheets()[0];
  const cabecalho = abaAlunos.getLastColumn() > 0
    ? abaAlunos.getRange(1, 1, 1, abaAlunos.getLastColumn()).getValues()[0]
    : [];
  Object.keys(CABECALHOS_ALUNOS).forEach(chave => {
    const nomeColuna = CABECALHOS_ALUNOS[chave];
    Logger.log(`Coluna "${nomeColuna}": ${cabecalho.map(c => String(c).trim()).indexOf(nomeColuna) === -1 ? "NÃO ENCONTRADA" : "ok"}`);
  });

  Logger.log(`Alunos que seriam enviados à busca: ${listarAlunosParaBusca().length}`);

}
