/*=====================================================
  PLANILHA — leitura, escrita e conversão de linhas

  Contrato da aba atual "Respostas ao formulário 2" (preservado da
  versão 1.0):
    - colunas A–I vêm do Google Forms e são achadas pelo TÍTULO da
      linha 1 (CABECALHOS abaixo), não pela posição;
    - J = Observações e K = Situação são usadas pela POSIÇÃO fixa,
      seja qual for o título (instrução original);
    - Data de Conclusão, Registro ID, Versão e E-mail Enviado são
      achadas pelo título e, quando faltam, criadas no fim da linha 1
      só por uma operação expressa de quem administra (salvar um
      pedido ou a migração controlada).

  A aba "2021 - 2022" é SOMENTE CONSULTA: é lida (busca e
  relatórios) e nunca escrita. As colunas dela são achadas por
  palavra-chave, porque os títulos antigos não são garantidos.
  gravarCelula_ recusa qualquer escrita fora da aba atual.

  Leitura em lote: cada operação lê a aba inteira com um único
  getValues() e trabalha sobre esse retrato; nenhuma consulta célula
  a célula. Nenhum Date sai daqui para a página: datas viram texto
  (formatarDataParaExibicao_).
=====================================================*/

const ABA_ATUAL = "Respostas ao formulário 2";
const ABA_ANTIGA = "2021 - 2022";

const COL_OBSERVACOES_FIXA = 10; // J
const COL_SITUACAO_FIXA = 11;    // K

const CABECALHOS = {
  carimbo: "Carimbo de data/hora",
  emailFormulario: "Endereço de e-mail",
  nUsp: "Nº USP",
  nome: "Nome",
  email: "E-mail USP",
  anoIngresso: "Ano de ingresso",
  trancamento: "Realizou trancamento total de matrícula em algum semestre?",
  habilitacao: "Deseja solicitar a abertura de qual programa?",
  dataConclusao: "Data de Conclusão",
  registroId: "Registro ID",
  versao: "Versão",
  emailEnviado: "E-mail Enviado"
};

// Colunas obrigatórias para listar pedidos (a versão 1.0 também parava
// com erro quando uma delas faltava).
const COLUNAS_OBRIGATORIAS = ["nome", "nUsp", "email", "habilitacao", "carimbo"];

const FORMATO_REGISTRO_ID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/*-----------------------------------------------------
  ABAS
------------------------------------------------------*/

function planilhaDeRespostas_() {
  return abrirPlanilhaPorChave_(CONFIG.CHAVE_RESPOSTAS);
}

function abaAtual_() {
  const aba = planilhaDeRespostas_().getSheetByName(ABA_ATUAL);
  if (!aba) throw erroGerenciador_("ESTRUTURA", `A aba "${ABA_ATUAL}" não foi encontrada na planilha de respostas.`);
  return aba;
}

// Opcional: sem ela (ou renomeada), o sistema segue só com a aba atual.
function abaAntiga_() {
  return planilhaDeRespostas_().getSheetByName(ABA_ANTIGA);
}

/*-----------------------------------------------------
  RETRATO DA ABA (uma leitura em lote)
------------------------------------------------------*/

/**
 * @return {{aba, nome, mapa: Object<string, number>, titulos: string[],
 *           linhas: Array<Array>, ultimaLinha: number, ultimaColuna: number}}
 * linhas[i] corresponde à linha física i + 2. Colunas em base 1 no mapa.
 */
function lerTabela_(aba) {
  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  const valores = ultimaLinha >= 1 && ultimaColuna >= 1
    ? aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues()
    : [[]];
  const titulos = (valores[0] || []).map(t => String(t === null || t === undefined ? "" : t).trim());
  const mapa = {};
  titulos.forEach((titulo, i) => { if (titulo && !mapa[titulo]) mapa[titulo] = i + 1; });
  return {
    aba: aba,
    nome: aba.getName(),
    mapa: mapa,
    titulos: titulos,
    linhas: valores.slice(1),
    ultimaLinha: ultimaLinha,
    ultimaColuna: ultimaColuna
  };
}

/**
 * Retrato da aba atual, conferido: título repetido numa coluna que o
 * sistema usa, ou J/K ocupadas por outra coluna conhecida (planilha
 * deslocada), param tudo antes de qualquer leitura ou gravação.
 */
function lerTabelaAtual_() {
  const tabela = lerTabela_(abaAtual_());
  const conhecidos = Object.keys(CABECALHOS).map(k => CABECALHOS[k]);
  const repetidos = conhecidos.filter(t => tabela.titulos.filter(x => x === t).length > 1);
  if (repetidos.length) {
    throw erroGerenciador_("ESTRUTURA",
      `A aba "${ABA_ATUAL}" tem título repetido: ${repetidos.join(", ")}. Corrija a planilha antes de continuar.`);
  }
  [COL_OBSERVACOES_FIXA, COL_SITUACAO_FIXA].forEach(col => {
    const titulo = tabela.titulos[col - 1];
    if (titulo && conhecidos.indexOf(titulo) !== -1) {
      throw erroGerenciador_("ESTRUTURA",
        `A coluna ${col === COL_OBSERVACOES_FIXA ? "J (Observações)" : "K (Situação)"} está ocupada por "${titulo}". ` +
        "A planilha parece ter colunas deslocadas; nada foi lido nem gravado.");
    }
  });
  return tabela;
}

function colunaOpcional_(tabela, chave) {
  return tabela.mapa[CABECALHOS[chave]] || null;
}

function colunaObrigatoria_(tabela, chave) {
  const coluna = colunaOpcional_(tabela, chave);
  if (!coluna) {
    throw erroGerenciador_("ESTRUTURA",
      `Não encontrei a coluna "${CABECALHOS[chave]}" na aba "${tabela.nome}". Confira se o título da linha 1 está exatamente assim.`);
  }
  return coluna;
}

function exigirColunasDeLista_(tabela) {
  COLUNAS_OBRIGATORIAS.forEach(chave => colunaObrigatoria_(tabela, chave));
}

function celula_(linhaDados, coluna) {
  if (!coluna) return "";
  const valor = linhaDados[coluna - 1];
  return valor === undefined ? "" : valor;
}

/*-----------------------------------------------------
  ESCRITA (só aba atual)
------------------------------------------------------*/

function gravarCelula_(tabela, linha, coluna, valor) {
  if (tabela.nome !== ABA_ATUAL || tabela.aba.getName() !== ABA_ATUAL) {
    throw erroGerenciador_("ESTRUTURA", "Gravação recusada: só a aba atual pode ser alterada por este sistema.");
  }
  if (linha < 2 || coluna < 1) throw erroGerenciador_("ESTRUTURA", "Gravação recusada: posição inválida.");
  tabela.aba.getRange(linha, coluna).setValue(valor);
  const i = linha - 2;
  if (tabela.linhas[i]) {
    while (tabela.linhas[i].length < coluna) tabela.linhas[i].push("");
    tabela.linhas[i][coluna - 1] = valor;
  }
}

/**
 * Coluna pelo título; se faltar, cria o título no fim da linha 1.
 * Nunca em J nem K (posições fixas de Observações e Situação), mesmo
 * que as duas ainda estejam vazias.
 */
function obterOuCriarColuna_(tabela, chave) {
  const existente = colunaOpcional_(tabela, chave);
  if (existente) return existente;
  if (tabela.nome !== ABA_ATUAL) throw erroGerenciador_("ESTRUTURA", "Gravação recusada: só a aba atual pode ser alterada por este sistema.");
  const nova = Math.max(tabela.aba.getLastColumn(), tabela.ultimaColuna, COL_SITUACAO_FIXA) + 1;
  tabela.aba.getRange(1, nova).setValue(CABECALHOS[chave]);
  tabela.mapa[CABECALHOS[chave]] = nova;
  tabela.titulos[nova - 1] = CABECALHOS[chave];
  tabela.ultimaColuna = nova;
  return nova;
}

/*-----------------------------------------------------
  IDENTIFICAÇÃO DOS PEDIDOS (Registro ID + Versão)
------------------------------------------------------*/

function registroIdDaLinha_(tabela, linhaDados) {
  const col = colunaOpcional_(tabela, "registroId");
  return col ? String(celula_(linhaDados, col) || "").trim() : "";
}

function versaoDaLinha_(tabela, linhaDados) {
  const col = colunaOpcional_(tabela, "versao");
  const v = col ? Number(celula_(linhaDados, col)) : NaN;
  return v && !isNaN(v) ? v : 1;
}

/** Contagem de cada Registro ID entre as linhas com nome (para achar repetidos). */
function contarRegistroIds_(tabela) {
  const colNome = colunaOpcional_(tabela, "nome");
  const contagem = {};
  tabela.linhas.forEach(l => {
    if (colNome && !celula_(l, colNome)) return;
    const id = registroIdDaLinha_(tabela, l);
    if (id) contagem[id] = (contagem[id] || 0) + 1;
  });
  return contagem;
}

function validarFormatoRegistroId_(registroId) {
  if (typeof registroId !== "string" || !FORMATO_REGISTRO_ID.test(registroId)) {
    throw erroGerenciador_("ENTRADA", "Identificador de registro inválido.");
  }
}

/** Número da linha física do pedido. Repetido ou ausente é erro. */
function localizarLinhaPorId_(tabela, registroId) {
  validarFormatoRegistroId_(registroId);
  const col = colunaOpcional_(tabela, "registroId");
  if (!col) {
    throw erroGerenciador_("MIGRACAO_NECESSARIA",
      "A planilha ainda não tem a coluna \"Registro ID\". Os pedidos precisam ser preparados pela migração controlada (veja a Central de Ajuda).");
  }
  let encontrada = null;
  tabela.linhas.forEach((l, i) => {
    if (String(celula_(l, col) || "").trim() !== registroId) return;
    if (encontrada !== null) {
      throw erroGerenciador_("INTEGRIDADE",
        "Existe mais de um pedido com o mesmo identificador. Nada foi alterado, para não mexer no pedido errado. Avise o responsável pelo sistema.");
    }
    encontrada = i + 2;
  });
  if (encontrada === null) {
    throw erroGerenciador_("NAO_ENCONTRADO", "Esse pedido não foi encontrado (pode ter sido excluído ou alterado em outra sessão). Recarregue a lista.");
  }
  return encontrada;
}
