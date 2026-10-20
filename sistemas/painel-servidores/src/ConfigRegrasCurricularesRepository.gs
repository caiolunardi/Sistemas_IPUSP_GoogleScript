/*=====================================================
  REGRAS CURRICULARES — REPOSITORY

  Toda leitura/escrita na planilha oficial de Regras
  Curriculares passa por aqui. Nenhum outro arquivo deve
  chamar SpreadsheetApp.openById/getSheetByName/getRange
  diretamente pra essa planilha — isso mantém a política de
  "colunas só por nome de cabeçalho" (Instruções.txt item 2
  e 23) num lugar só.

  IDENTIDADE: todas as entidades (ruleset, requisito,
  disciplina, grupo) são identificadas por um ID estável em
  coluna própria — NUNCA por número de linha. O número de
  linha só existe dentro da execução de uma função, pro
  Apps Script saber onde escrever; nunca é devolvido nem
  aceito de volta do cliente entre chamadas.

  CONCORRÊNCIA: cada entidade devolvida ao cliente carrega
  um "snapshotToken" — um hash SHA-256 de todos os campos da
  linha, calculado no momento da leitura. Ao salvar, o
  cliente reenvia esse token; se o hash recalculado bater,
  ninguém mexeu na linha nesse meio tempo; se não bater, a
  gravação é recusada. Isso substitui uma coluna de "versão"
  sem precisar criar uma.
=====================================================*/

const ID_PLANILHA_REGRAS_CURRICULARES = "CONFIGURAR_ID_PLANILHA_REGRAS_CURRICULARES"; // valor real omitido do Git — ver docs/sistemas/painel-servidores/DADOS_E_SEGURANCA.md

const ABA_REGRAS_README = "README";
const ABA_REGRAS_CURRICULOS = "CURRICULOS";
const ABA_REGRAS_REQUISITOS_NUMERICOS = "REQUISITOS_NUMERICOS";
const ABA_REGRAS_DISCIPLINAS = "DISCIPLINAS";
const ABA_REGRAS_GRUPOS = "GRUPOS_REGRAS";
const ABA_REGRAS_ANALISE_HISTORICO = "ANALISE_HISTORICO";
const ABA_REGRAS_DICIONARIO = "DICIONARIO";
// Nova aba de auditoria (multi-currículo + revisão interna — ver
// ConfigRegrasCurricularesMigracao.gs/Auditoria.gs). Só é criada pela
// migração administrativa, nunca automaticamente num endpoint normal.
const ABA_REGRAS_AUDITORIA = "AUDITORIA_REGRAS_CURRICULARES";

// Cabeçalhos EXATOS de cada aba (Instruções.txt item 3). Usados por
// mapearCabecalhosObrigatorios_ pra recusar a operação, com erro
// claro, se algum estiver ausente ou duplicado.
//
// Os 6 últimos campos (semestres_minimos em diante) foram acrescentados
// pela evolução multi-currículo/revisão interna — SEMPRE ao final,
// nunca reordenando os campos históricos, pra não invalidar nenhuma
// planilha já em produção (a migração administrativa é quem realmente
// cria essas colunas na planilha, se ainda não existirem — ver
// ConfigRegrasCurricularesMigracao.gs).
const CABECALHOS_CURRICULOS = [
  "ruleset_id", "curso_codigo", "habilitacao_codigo", "habilitacao_nome",
  "estrutura_curricular", "versao", "vigencia_inicio", "vigencia_fim",
  "status", "selecao_automatica", "criterio_selecao", "observacao",
  "semestres_minimos", "semestres_maximos", "excedente_eletivas_compensa_livres",
  "revisao", "ultima_revisao_em", "ultima_revisao_por"
];

const CABECALHOS_REQUISITOS_NUMERICOS = [
  "requisito_id", "ruleset_id", "criterio", "campo_parser", "operador",
  "valor", "unidade", "obrigatorio", "descricao", "ordem", "ativo", "observacao"
];

const CABECALHOS_DISCIPLINAS = [
  "regra_disciplina_id", "ruleset_id", "sigla", "nome", "tipo_regra",
  "grupo_id", "status_aceitos", "ativo", "ordem", "observacao"
];

const CABECALHOS_GRUPOS_REGRAS = [
  "grupo_id", "ruleset_id", "nome_grupo", "tipo_regra", "valor_minimo",
  "unidade", "campo_soma", "ativo", "observacao"
];

// "ruleset_revisao" foi acrescentado ao final pela evolução
// multi-currículo/revisão interna — é SCHEMA-ONLY (Instruções da
// tarefa): a migração administrativa cria a coluna, mas linhas
// antigas ficam com o valor vazio pra sempre (não preenchemos
// retroativamente). O motor de análise do projeto Diplomas é quem,
// no futuro, vai gravar esse campo em linhas novas — este Dashboard
// não grava nada em ANALISE_HISTORICO, só lê (ver
// repoRulesetJaUtilizadoEmAnalise_/repoContarAnalisesRuleset_).
const CABECALHOS_ANALISE_HISTORICO = [
  "execucao_id", "analisado_em", "registro_id", "versao_registro", "nusp",
  "nome", "habilitacao_codigo", "ruleset_id", "parser_version", "arquivo_id",
  "arquivo_nome", "arquivo_modificado_em", "hash_sha256", "status_reconciliacao",
  "resultado", "motivos_json", "dados_extraidos_json", "confirmado",
  "confirmado_em", "confirmado_por", "observacao", "ruleset_revisao"
];

const CABECALHOS_DICIONARIO = ["dominio", "codigo", "rotulo", "descricao", "ativo"];

// Cabeçalhos da nova aba de auditoria (Instruções da tarefa — schema
// sugerido, preservado semanticamente). Criada e populada somente
// pela migração administrativa / pelo fluxo de correção de ATIVO —
// ver ConfigRegrasCurricularesAuditoria.gs.
const CABECALHOS_AUDITORIA = [
  "auditoria_id", "registrado_em", "registrado_por", "ruleset_id",
  "curso_codigo", "habilitacao_codigo", "estrutura_curricular", "versao",
  "revisao_anterior", "revisao_nova", "status_ruleset", "entidade_tipo",
  "entidade_id", "operacao", "motivo", "snapshot_antes_json",
  "snapshot_depois_json", "estado"
];

const ESTADO_AUDITORIA_PREPARADA = "PREPARADA";
const ESTADO_AUDITORIA_CONFIRMADA = "CONFIRMADA";
const ESTADO_AUDITORIA_FALHOU = "FALHOU";

// Valores canônicos que o NOSSO código escreve (sempre sem acento,
// pra nunca mais cair na mesma armadilha de comparação que já
// mordeu esse projeto — ver Situação/Colação de Grau no histórico).
// Na LEITURA, comparamos de forma tolerante via normalizarSemAcento_
// (Code.gs), então um "SIM"/"Sim"/"sim" já cadastrado continua
// funcionando mesmo que a escrita canonize diferente.
const VALOR_BOOLEANO_SIM = "SIM";
const VALOR_BOOLEANO_NAO = "NAO";

const STATUS_RULESET_RASCUNHO = "RASCUNHO";
const STATUS_RULESET_ATIVO = "ATIVO";
const STATUS_RULESET_INATIVO = "INATIVO";

/*-----------------------------------------------------
  ABERTURA DA PLANILHA / ABAS
------------------------------------------------------*/

function obterPlanilhaRegras_() {
  return SpreadsheetApp.openById(ID_PLANILHA_REGRAS_CURRICULARES);
}

function obterAbaRegras_(nomeAba) {
  const aba = obterPlanilhaRegras_().getSheetByName(nomeAba);
  if (!aba) {
    throw new Error(
      `A planilha de Regras Curriculares não tem uma aba chamada "${nomeAba}". ` +
      `Confira se ela não foi renomeada ou removida.`
    );
  }
  return aba;
}

/*-----------------------------------------------------
  LEITURA GENÉRICA — lista todas as linhas de uma aba como
  objetos {cabecalho: valor}, ignorando linhas totalmente
  em branco. "linha" no retorno é só pra uso IMEDIATO dentro
  da mesma execução (nunca exposto fora do Repository).
------------------------------------------------------*/

function listarLinhasComoObjetos_(nomeAba, cabecalhosObrigatorios) {

  const aba = obterAbaRegras_(nomeAba);
  const mapa = mapearCabecalhosObrigatorios_(aba, cabecalhosObrigatorios);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2) return { aba: aba, mapa: mapa, linhas: [] };

  const valores = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const linhas = [];

  valores.forEach((linhaValores, indice) => {

    const objeto = {};
    let temConteudo = false;

    cabecalhosObrigatorios.forEach(cabecalho => {
      const valor = linhaValores[mapa[cabecalho] - 1];
      objeto[cabecalho] = valor;
      if (valor !== "" && valor !== null && valor !== undefined) temConteudo = true;
    });

    if (!temConteudo) return; // linha em branco

    linhas.push({ linha: indice + 2, dados: objeto });

  });

  return { aba: aba, mapa: mapa, linhas: linhas };

}

// Leitura REALMENTE leve, por COLUNA: lê só as colunas pedidas
// ("colunasDesejadas"), NUNCA a largura inteira da linha — uma
// getRange (de uma coluna só, todas as linhas de dados) por coluna
// desejada, em vez de uma getRange (linha inteira) por bloco de
// linhas. Usada por repoListarAuditoriasRulesetResumo_ (3ª rodada
// cirúrgica, Achado 2) pra nunca buscar do Sheets os campos
// snapshot_antes_json/snapshot_depois_json quando eles não estão em
// "colunasDesejadas" — diferente de listarLinhasComoObjetos_ (acima),
// que sempre lê a linha inteira e só filtra os campos DEPOIS de lidos.
function listarLinhasPorColunas_(nomeAba, colunasDesejadas) {

  const aba = obterAbaRegras_(nomeAba);
  const mapa = mapearCabecalhosObrigatorios_(aba, colunasDesejadas);

  const ultimaLinha = aba.getLastRow();
  const numLinhasDados = ultimaLinha - 1;
  if (numLinhasDados < 1) return { aba: aba, mapa: mapa, linhas: [] };

  const valoresPorColuna = {};
  colunasDesejadas.forEach(coluna => {
    valoresPorColuna[coluna] = aba.getRange(2, mapa[coluna], numLinhasDados, 1).getValues();
  });

  const linhas = [];
  for (let i = 0; i < numLinhasDados; i++) {

    const objeto = {};
    let temConteudo = false;

    colunasDesejadas.forEach(coluna => {
      const valor = valoresPorColuna[coluna][i][0];
      objeto[coluna] = valor;
      if (valor !== "" && valor !== null && valor !== undefined) temConteudo = true;
    });

    if (!temConteudo) continue; // linha em branco

    linhas.push({ linha: i + 2, dados: objeto });

  }

  return { aba: aba, mapa: mapa, linhas: linhas };

}

// Localiza UMA linha pelo valor de uma coluna-ID. Devolve null se
// não encontrar. Sempre re-varre a planilha do zero — nunca reaproveita
// um "linha" de uma chamada anterior.
function localizarLinhaPorId_(nomeAba, colunaId, valorId, cabecalhosObrigatorios) {

  const aba = obterAbaRegras_(nomeAba);
  const mapa = mapearCabecalhosObrigatorios_(aba, cabecalhosObrigatorios);
  const colId = mapa[colunaId];

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return null;

  const valoresId = aba.getRange(2, colId, ultimaLinha - 1, 1).getValues();

  for (let i = 0; i < valoresId.length; i++) {
    if (String(valoresId[i][0] || "").trim() === String(valorId).trim()) {
      return { aba: aba, mapa: mapa, linha: i + 2 };
    }
  }

  return null;

}

// Lê o objeto completo de UMA linha já localizada (aba+mapa+linha).
function lerObjetoDaLinha_(aba, mapa, linha, cabecalhos) {
  const ultimaColuna = aba.getLastColumn();
  const valoresLinha = aba.getRange(linha, 1, 1, ultimaColuna).getValues()[0];
  const objeto = {};
  cabecalhos.forEach(c => { objeto[c] = valoresLinha[mapa[c] - 1]; });
  return objeto;
}

/*-----------------------------------------------------
  SNAPSHOT TOKEN — concorrência otimista sem coluna nova.
  Hash de TODOS os campos da linha (não só os "editáveis"),
  pra detectar até mudanças feitas por uma ação (Ativar,
  Inativar) enquanto alguém tinha a tela de edição aberta.
------------------------------------------------------*/

function calcularSnapshotToken_(objetoDados) {

  const chavesOrdenadas = Object.keys(objetoDados).sort();
  const partes = chavesOrdenadas.map(chave => {
    const valor = objetoDados[chave];
    const valorSerializado = (valor === null || valor === undefined) ? "" : String(valor);
    return `${chave}=${valorSerializado}`;
  });

  const textoCanonico = partes.join("|");
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, textoCanonico, Utilities.Charset.UTF_8);

  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");

}

// "rotuloEntidadeComArtigo" já vem com o artigo certo do chamador
// ("o ruleset", "o requisito", "a disciplina", "o grupo") — assim a
// frase concorda em gênero sem a função precisar saber a gramática
// de cada substantivo.
function exigirSnapshotValido_(objetoAtual, tokenEsperado, rotuloEntidadeComArtigo) {
  const tokenAtual = calcularSnapshotToken_(objetoAtual);
  if (!tokenEsperado || tokenAtual !== tokenEsperado) {
    throw new Error(
      `Alguém alterou ${rotuloEntidadeComArtigo} desde que esta tela foi aberta. ` +
      `Recarregue e tente novamente.`
    );
  }
}

/*-----------------------------------------------------
  GERAÇÃO DE ID
------------------------------------------------------*/

function gerarIdEntidade_(prefixo) {
  return `${prefixo}_${Utilities.getUuid()}`;
}

/*-----------------------------------------------------
  DICIONARIO — fonte de verdade dos domínios (dropdowns).
  Só entradas com ativo=SIM contam. Lido por nome de
  cabeçalho, nunca por posição.
------------------------------------------------------*/

function repoObterDominioDicionario_(dominio) {

  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_DICIONARIO, CABECALHOS_DICIONARIO);

  return linhas
    .filter(l => String(l.dados.dominio || "").trim() === dominio)
    .filter(l => normalizarSemAcento_(l.dados.ativo) === "sim")
    .map(l => ({
      codigo: String(l.dados.codigo || "").trim(),
      rotulo: String(l.dados.rotulo || "").trim(),
      descricao: String(l.dados.descricao || "").trim()
    }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

}

// Devolve TODAS as entradas ativas de CRITERIO_NUMERICO (não só
// código/rótulo — também a descrição crua, de onde extraímos
// campo_parser) — usado por ConfigRegrasCurricularesValidacao.gs.
function repoObterCriteriosNumericos_() {
  return repoObterDominioDicionario_("CRITERIO_NUMERICO");
}

// Extrai "campo_parser=xxx" do texto de descrição do DICIONARIO
// (Instruções.txt item 12). Devolve null se o padrão não aparecer —
// quem chama decide se isso é um erro bloqueante.
function extrairCampoParserDeDescricao_(descricao) {
  const m = String(descricao || "").match(/campo_parser\s*=\s*([^\s;]+)/i);
  return m ? m[1].trim() : null;
}

// Monta um mapa { CRITERIO: campo_parser } a partir do DICIONARIO —
// usado tanto pra preencher campo_parser automaticamente ao salvar
// um requisito quanto pra validar na ativação.
function repoMapaCriterioParaCampoParser_() {
  const mapa = {};
  repoObterCriteriosNumericos_().forEach(c => {
    const campoParser = extrairCampoParserDeDescricao_(c.descricao);
    if (campoParser) mapa[c.codigo] = campoParser;
  });
  return mapa;
}

// Deriva as opções de "campo_soma" (usado por grupos MIN_CREDITS) a
// partir dos critérios de CRITERIO_NUMERICO cujo código contém
// "CREDITO" — são os únicos, hoje, com semântica de "soma de
// créditos" clara o bastante pra oferecer como opção sem inventar
// nada que não esteja no próprio DICIONARIO (Instruções.txt item 16).
function repoObterOpcoesCampoSoma_() {
  return repoObterCriteriosNumericos_()
    .filter(c => c.codigo.indexOf("CREDITO") !== -1)
    .map(c => ({
      valor: extrairCampoParserDeDescricao_(c.descricao),
      rotulo: c.rotulo
    }))
    .filter(o => !!o.valor);
}

/*-----------------------------------------------------
  ANALISE_HISTORICO — SOMENTE LEITURA a partir deste painel.
  Usado só pra checar "esse ruleset_id já foi usado alguma
  vez?" (Instruções.txt item 9: um ruleset já utilizado
  jamais pode ser sobrescrito, mesmo que alguém tente
  reabrir edição nele por fora do fluxo normal). Nunca
  devolve a aba inteira pro cliente — só um booleano.
------------------------------------------------------*/

function repoRulesetJaUtilizadoEmAnalise_(rulesetId) {

  try {
    const aba = obterAbaRegras_(ABA_REGRAS_ANALISE_HISTORICO);
    const mapa = mapearCabecalhosObrigatorios_(aba, ["ruleset_id"]);
    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return false;

    const valores = aba.getRange(2, mapa["ruleset_id"], ultimaLinha - 1, 1).getValues();
    return valores.some(linha => String(linha[0] || "").trim() === String(rulesetId).trim());

  } catch (err) {
    // Se a aba de auditoria não puder ser lida por qualquer motivo,
    // é mais seguro tratar como "já utilizado" (bloqueia edição) do
    // que arriscar sobrescrever um ruleset que na verdade já foi
    // usado — mas registramos o problema real no log.
    Logger.log("Falha ao consultar ANALISE_HISTORICO (tratando como já utilizado por segurança): " + err);
    return true;
  }

}

// Conta quantas linhas de ANALISE_HISTORICO referenciam este
// ruleset_id — usado pelo fluxo de correção de ruleset ATIVO pra
// mostrar "já foi utilizado em N análises" sem precisar carregar os
// JSONs de cada linha (Instruções da tarefa: "não precisa carregar
// JSONs, somente contar linhas por ruleset_id"). Ao contrário de
// repoRulesetJaUtilizadoEmAnalise_, uma falha de leitura aqui devolve
// 0 (é só informativo, nunca bloqueia nada) — quem decide bloquear ou
// não é sempre repoRulesetJaUtilizadoEmAnalise_/exigirRulesetRascunhoEditavel_.
function repoContarAnalisesRuleset_(rulesetId) {

  try {
    const aba = obterAbaRegras_(ABA_REGRAS_ANALISE_HISTORICO);
    const mapa = mapearCabecalhosObrigatorios_(aba, ["ruleset_id"]);
    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return 0;

    const valores = aba.getRange(2, mapa["ruleset_id"], ultimaLinha - 1, 1).getValues();
    let contador = 0;
    valores.forEach(linha => {
      if (String(linha[0] || "").trim() === String(rulesetId).trim()) contador++;
    });
    return contador;

  } catch (err) {
    Logger.log("Falha ao contar análises de ANALISE_HISTORICO para \"" + rulesetId + "\": " + err);
    return 0;
  }

}

/*=====================================================
  CURRICULOS (rulesets)
=====================================================*/

// O token é calculado sobre "dados" original (cru), ANTES de qualquer
// conversão abaixo — o hash tem que continuar batendo com o que
// exigirSnapshotValido_ recalcula depois, na hora de salvar.
//
// Incidente de 21/09/2026: depois de confirmar uma correção, a célula
// de ultima_revisao_em passou a guardar uma Data de verdade (o Sheets
// reinterpreta sozinho um texto "parecido com data" — o mesmo motivo
// pelo qual ConfigCore.gs já tem gravarCelulaTexto_ pra outros campos).
// Uma Data crua nesse ponto quebra a serialização do google.script.run
// pro cliente (a chamada "funciona", mas o valor que chega é lixo, tipo
// "[Ljava.lang.Object;@..."), derrubando a lista inteira de rulesets —
// não só o campo problemático. Por segurança, qualquer campo que hoje
// (ou no futuro) vier como Date de verdade é convertido pra texto só na
// cópia que vai pro cliente, sem alterar a planilha nem o hash.
function anexarSnapshotToken_(dados) {
  const token = calcularSnapshotToken_(dados);
  const dadosParaCliente = Object.assign({}, dados, { snapshotToken: token });
  Object.keys(dadosParaCliente).forEach(chave => {
    const valor = dadosParaCliente[chave];
    if (Object.prototype.toString.call(valor) === "[object Date]") {
      dadosParaCliente[chave] = Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
    }
  });
  return dadosParaCliente;
}

function repoListarRulesets_() {
  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_CURRICULOS, CABECALHOS_CURRICULOS);
  return linhas.map(l => anexarSnapshotToken_(l.dados));
}

// Devolve {aba, mapa, linha, dados} ou null. Uso interno (mutações).
function repoLocalizarRuleset_(rulesetId) {
  const resultado = localizarLinhaPorId_(ABA_REGRAS_CURRICULOS, "ruleset_id", rulesetId, CABECALHOS_CURRICULOS);
  if (!resultado) return null;
  const dados = lerObjetoDaLinha_(resultado.aba, resultado.mapa, resultado.linha, CABECALHOS_CURRICULOS);
  return { aba: resultado.aba, mapa: resultado.mapa, linha: resultado.linha, dados: dados };
}

// Devolve o ruleset pronto pro cliente (com token) ou null.
function repoObterRuleset_(rulesetId) {
  const resultado = repoLocalizarRuleset_(rulesetId);
  if (!resultado) return null;
  return anexarSnapshotToken_(resultado.dados);
}

function repoEscreverCamposRuleset_(aba, mapa, linha, campos) {
  Object.keys(campos).forEach(chave => {
    const col = mapa[chave];
    if (!col) return;
    aba.getRange(linha, col).setValue(campos[chave]);
  });
}

function repoInserirRuleset_(dados) {
  const aba = obterAbaRegras_(ABA_REGRAS_CURRICULOS);
  const mapa = mapearCabecalhosObrigatorios_(aba, CABECALHOS_CURRICULOS);
  const novaLinha = aba.getLastRow() + 1;
  const ultimaColuna = aba.getLastColumn();
  aba.getRange(novaLinha, 1, 1, ultimaColuna).clearContent();
  repoEscreverCamposRuleset_(aba, mapa, novaLinha, dados);
  return novaLinha;
}

/*=====================================================
  REQUISITOS_NUMERICOS
=====================================================*/

function repoListarRequisitos_(rulesetId) {
  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_REQUISITOS_NUMERICOS, CABECALHOS_REQUISITOS_NUMERICOS);
  return linhas
    .filter(l => String(l.dados.ruleset_id || "").trim() === String(rulesetId).trim())
    .map(l => anexarSnapshotToken_(l.dados))
    .sort((a, b) => {
      const ordemA = Number(a.ordem) || 0;
      const ordemB = Number(b.ordem) || 0;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return String(a.requisito_id).localeCompare(String(b.requisito_id));
    });
}

function repoLocalizarRequisito_(requisitoId) {
  const resultado = localizarLinhaPorId_(ABA_REGRAS_REQUISITOS_NUMERICOS, "requisito_id", requisitoId, CABECALHOS_REQUISITOS_NUMERICOS);
  if (!resultado) return null;
  const dados = lerObjetoDaLinha_(resultado.aba, resultado.mapa, resultado.linha, CABECALHOS_REQUISITOS_NUMERICOS);
  return { aba: resultado.aba, mapa: resultado.mapa, linha: resultado.linha, dados: dados };
}

function repoProximaOrdem_(linhasExistentes) {
  if (linhasExistentes.length === 0) return 10;
  const maiorOrdem = Math.max(...linhasExistentes.map(l => Number(l.ordem) || 0));
  return maiorOrdem + 10;
}

function repoInserirRequisito_(dados) {
  const aba = obterAbaRegras_(ABA_REGRAS_REQUISITOS_NUMERICOS);
  const mapa = mapearCabecalhosObrigatorios_(aba, CABECALHOS_REQUISITOS_NUMERICOS);
  const novaLinha = aba.getLastRow() + 1;
  const ultimaColuna = aba.getLastColumn();
  aba.getRange(novaLinha, 1, 1, ultimaColuna).clearContent();
  Object.keys(dados).forEach(chave => {
    const col = mapa[chave];
    if (col) aba.getRange(novaLinha, col).setValue(dados[chave]);
  });
  return novaLinha;
}

function repoAtualizarLinhaCampos_(aba, mapa, linha, campos) {
  Object.keys(campos).forEach(chave => {
    const col = mapa[chave];
    if (col) aba.getRange(linha, col).setValue(campos[chave]);
  });
}

function repoExcluirLinha_(aba, linha) {
  aba.deleteRow(linha);
}

/*=====================================================
  DISCIPLINAS
=====================================================*/

function repoListarDisciplinas_(rulesetId) {
  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_DISCIPLINAS, CABECALHOS_DISCIPLINAS);
  return linhas
    .filter(l => String(l.dados.ruleset_id || "").trim() === String(rulesetId).trim())
    .map(l => anexarSnapshotToken_(l.dados))
    .sort((a, b) => {
      const ordemA = Number(a.ordem) || 0;
      const ordemB = Number(b.ordem) || 0;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return String(a.sigla).localeCompare(String(b.sigla), "pt-BR");
    });
}

function repoLocalizarDisciplina_(regraDisciplinaId) {
  const resultado = localizarLinhaPorId_(ABA_REGRAS_DISCIPLINAS, "regra_disciplina_id", regraDisciplinaId, CABECALHOS_DISCIPLINAS);
  if (!resultado) return null;
  const dados = lerObjetoDaLinha_(resultado.aba, resultado.mapa, resultado.linha, CABECALHOS_DISCIPLINAS);
  return { aba: resultado.aba, mapa: resultado.mapa, linha: resultado.linha, dados: dados };
}

function repoInserirDisciplina_(dados) {
  const aba = obterAbaRegras_(ABA_REGRAS_DISCIPLINAS);
  const mapa = mapearCabecalhosObrigatorios_(aba, CABECALHOS_DISCIPLINAS);
  const novaLinha = aba.getLastRow() + 1;
  const ultimaColuna = aba.getLastColumn();
  aba.getRange(novaLinha, 1, 1, ultimaColuna).clearContent();
  Object.keys(dados).forEach(chave => {
    const col = mapa[chave];
    if (col) aba.getRange(novaLinha, col).setValue(dados[chave]);
  });
  return novaLinha;
}

/*=====================================================
  GRUPOS_REGRAS
=====================================================*/

function repoListarGrupos_(rulesetId) {
  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_GRUPOS, CABECALHOS_GRUPOS_REGRAS);
  return linhas
    .filter(l => String(l.dados.ruleset_id || "").trim() === String(rulesetId).trim())
    .map(l => anexarSnapshotToken_(l.dados))
    .sort((a, b) => String(a.nome_grupo).localeCompare(String(b.nome_grupo), "pt-BR"));
}

function repoLocalizarGrupo_(grupoId) {
  const resultado = localizarLinhaPorId_(ABA_REGRAS_GRUPOS, "grupo_id", grupoId, CABECALHOS_GRUPOS_REGRAS);
  if (!resultado) return null;
  const dados = lerObjetoDaLinha_(resultado.aba, resultado.mapa, resultado.linha, CABECALHOS_GRUPOS_REGRAS);
  return { aba: resultado.aba, mapa: resultado.mapa, linha: resultado.linha, dados: dados };
}

function repoInserirGrupo_(dados) {
  const aba = obterAbaRegras_(ABA_REGRAS_GRUPOS);
  const mapa = mapearCabecalhosObrigatorios_(aba, CABECALHOS_GRUPOS_REGRAS);
  const novaLinha = aba.getLastRow() + 1;
  const ultimaColuna = aba.getLastColumn();
  aba.getRange(novaLinha, 1, 1, ultimaColuna).clearContent();
  Object.keys(dados).forEach(chave => {
    const col = mapa[chave];
    if (col) aba.getRange(novaLinha, col).setValue(dados[chave]);
  });
  return novaLinha;
}

/*=====================================================
  AUDITORIA_REGRAS_CURRICULARES

  Trilha de auditoria da correção de ruleset ATIVO (revisão interna) e
  da baseline de migração. Só é gravada pelo fluxo de correção
  (ConfigRegrasCurricularesAuditoria.gs) e pela migração administrativa
  (ConfigRegrasCurricularesMigracao.gs) — nenhum outro lugar escreve
  aqui. Leitura é usada pelo "📜 Histórico de revisões" da UI.
=====================================================*/

// Verdadeiro só se a aba já existir (não cria — quem cria é
// repoGarantirAbaAuditoriaExiste_, chamada explicitamente pela
// migração administrativa).
function repoAbaAuditoriaExiste_() {
  return !!obterPlanilhaRegras_().getSheetByName(ABA_REGRAS_AUDITORIA);
}

// Cria a aba AUDITORIA_REGRAS_CURRICULARES com o cabeçalho correto se
// ela ainda não existir. Idempotente: se já existir, NUNCA a recria
// nem sobrescreve um cabeçalho já presente. Só deve ser chamada pela
// migração administrativa (Instruções da tarefa: "criar aba somente
// se ainda não existir; não recriar se já existir").
//
// 2ª rodada cirúrgica (Achado 5): antes, uma aba que já existisse mas
// estivesse com cabeçalhos incompletos (ex: criada manualmente, ou por
// uma versão anterior desta migração) nunca era reparada. Agora, depois
// de localizar/criar a aba, SEMPRE garantimos por nome de cabeçalho
// todas as colunas esperadas, acrescentando ao final só as que
// faltarem — nunca move, duplica, apaga ou sobrescreve uma coluna já
// existente (mesmo helper genérico já usado para CURRICULOS e
// ANALISE_HISTORICO). Numa aba recém-criada acima, isso não adiciona
// nada (o cabeçalho já sai completo), então é seguro chamar sempre.
function repoGarantirAbaAuditoriaExiste_() {

  const planilha = obterPlanilhaRegras_();
  let aba = planilha.getSheetByName(ABA_REGRAS_AUDITORIA);
  let criada = false;

  if (!aba) {
    aba = planilha.insertSheet(ABA_REGRAS_AUDITORIA);
    aba.getRange(1, 1, 1, CABECALHOS_AUDITORIA.length).setValues([CABECALHOS_AUDITORIA]);
    criada = true;
  }

  const colunasAdicionadas = repoGarantirColunasNoFinal_(ABA_REGRAS_AUDITORIA, CABECALHOS_AUDITORIA);

  return { criada: criada, colunasAdicionadas: colunasAdicionadas };

}

// Insere uma linha de auditoria em estado PREPARADA (ou o estado que
// vier em "dados.estado", pra permitir a baseline de migração gravar
// direto como CONFIRMADA). Devolve o auditoria_id gerado.
//
// 3ª rodada cirúrgica (Achado 4): a linha inteira é montada em
// memória primeiro (respeitando o MAPA de cabeçalhos atual — nunca
// posição fixa) e gravada numa ÚNICA operação (setValues de uma
// linha só). Antes, cada campo era gravado com uma chamada
// .setValue() separada (uma volta na API do Sheets por célula), o
// que deixava uma janela onde uma falha no meio da gravação podia
// deixar a linha de auditoria parcialmente escrita.
function repoInserirAuditoria_(dados) {

  // 1.3: liga a linha ao evento da auditoria do painel (Auditoria.gs),
  // pela coluna evento_id no fim da aba (criada aqui se faltar; fica
  // fora de CABECALHOS_AUDITORIA para não ser exigida das abas antigas).
  const eventoId = eventoAuditoriaAtual_();
  if (eventoId) repoGarantirColunasNoFinal_(ABA_REGRAS_AUDITORIA, ["evento_id"]);

  const aba = obterAbaRegras_(ABA_REGRAS_AUDITORIA);
  const mapa = mapearCabecalhosObrigatorios_(aba, CABECALHOS_AUDITORIA);
  const novaLinha = aba.getLastRow() + 1;
  const ultimaColuna = aba.getLastColumn();

  const auditoriaId = dados.auditoria_id || gerarIdEntidade_("aud");
  const linhaCompleta = Object.assign({ auditoria_id: auditoriaId }, dados);

  const valoresLinha = new Array(ultimaColuna).fill("");
  Object.keys(linhaCompleta).forEach(chave => {
    const col = mapa[chave];
    if (col) valoresLinha[col - 1] = linhaCompleta[chave];
  });
  if (eventoId) {
    const colEvento = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim()).indexOf("evento_id");
    if (colEvento > -1) valoresLinha[colEvento] = eventoId;
  }

  aba.getRange(novaLinha, 1, 1, ultimaColuna).setValues([valoresLinha]);

  return auditoriaId;

}

// Localiza {aba, mapa, linha, dados} de uma auditoria pelo ID — uso
// interno (pra finalizar/marcar como falhou) e base de
// repoObterAuditoriaPorId_ (Achado 6, 2ª rodada cirúrgica).
function repoLocalizarAuditoria_(auditoriaId) {
  const resultado = localizarLinhaPorId_(ABA_REGRAS_AUDITORIA, "auditoria_id", auditoriaId, CABECALHOS_AUDITORIA);
  if (!resultado) return null;
  const dados = lerObjetoDaLinha_(resultado.aba, resultado.mapa, resultado.linha, CABECALHOS_AUDITORIA);
  return { aba: resultado.aba, mapa: resultado.mapa, linha: resultado.linha, dados: dados };
}

// Atualiza campos de UMA linha de auditoria já existente (ex: fechar
// PREPARADA -> CONFIRMADA/FALHOU, gravando o snapshot_depois_json).
// Silenciosamente ignora se a linha não existir mais (defensivo —
// nunca deve travar o fluxo de correção por causa de um problema na
// própria trilha de auditoria além do já previsto).
function repoAtualizarAuditoria_(auditoriaId, campos) {
  const localizado = repoLocalizarAuditoria_(auditoriaId);
  if (!localizado) {
    Logger.log("Não encontrei a linha de auditoria \"" + auditoriaId + "\" para atualizar.");
    return false;
  }
  repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, campos);
  return true;
}

// Filtro+ordenação compartilhados por repoListarAuditoriasRuleset_ e
// repoListarAuditoriasRulesetResumo_ (3ª rodada cirúrgica, Achado 2) —
// recebe uma lista já lida de objetos "dados" de auditoria (de
// qualquer uma das duas leituras abaixo) e devolve só as do ruleset
// pedido, mais recente primeiro. Nunca duas definições diferentes do
// mesmo critério de ordenação.
function filtrarEOrdenarAuditoriasPorRuleset_(auditorias, rulesetId) {
  return auditorias
    .filter(a => String(a.ruleset_id || "").trim() === String(rulesetId).trim())
    .sort((a, b) => {
      const linhaA = Number(a.revisao_nova) || 0;
      const linhaB = Number(b.revisao_nova) || 0;
      if (linhaA !== linhaB) return linhaB - linhaA;
      return String(b.registrado_em).localeCompare(String(a.registrado_em));
    });
}

// Lista as auditorias de um ruleset, mais recente primeiro, COM os
// dois snapshots completos em JSON — usada por repoAuditoriaTemBaseline_
// (migração administrativa) e por obterDetalheAuditoriaRuleset (acesso
// individual sob demanda). Nunca chamada pelo caminho "resumo" abaixo.
function repoListarAuditoriasRuleset_(rulesetId) {
  if (!repoAbaAuditoriaExiste_()) return [];
  const { linhas } = listarLinhasComoObjetos_(ABA_REGRAS_AUDITORIA, CABECALHOS_AUDITORIA);
  return filtrarEOrdenarAuditoriasPorRuleset_(linhas.map(l => l.dados), rulesetId);
}

// CABECALHOS_AUDITORIA sem os dois campos de snapshot completo —
// usado pela leitura leve abaixo, que nunca busca essas duas colunas
// do Sheets (3ª rodada cirúrgica, Achado 2).
const CABECALHOS_AUDITORIA_RESUMO = CABECALHOS_AUDITORIA.filter(
  c => c !== "snapshot_antes_json" && c !== "snapshot_depois_json"
);

// Mesma listagem de repoListarAuditoriasRuleset_ (mesmo filtro, mesma
// ordenação — via filtrarEOrdenarAuditoriasPorRuleset_, nunca uma
// segunda definição do critério), mas SEM os dois campos de snapshot
// completo em JSON — usada pelo endpoint que alimenta a tela
// "📜 Histórico de revisões".
//
// 3ª rodada cirúrgica (Achado 2): a versão anterior chamava
// repoListarAuditoriasRuleset_ (que lê a LINHA INTEIRA, inclusive os
// dois snapshots JSON, potencialmente grandes) e só descartava os
// campos de snapshot DEPOIS de lidos — resolvia o tráfego pro
// cliente, mas não a memória/I/O do servidor. Agora a leitura em si
// (listarLinhasPorColunas_) nunca busca essas duas colunas do Sheets:
// não materializa os snapshots em nenhum momento, nem pra descartar
// depois. repoListarAuditoriasRuleset_ continua existindo tal como
// estava (com os JSONs completos) para quem realmente precisa deles.
function repoListarAuditoriasRulesetResumo_(rulesetId) {
  if (!repoAbaAuditoriaExiste_()) return [];
  const { linhas } = listarLinhasPorColunas_(ABA_REGRAS_AUDITORIA, CABECALHOS_AUDITORIA_RESUMO);
  return filtrarEOrdenarAuditoriasPorRuleset_(linhas.map(l => l.dados), rulesetId);
}

// Devolve UMA linha de auditoria completa (com os dois snapshots JSON),
// pelo auditoria_id — acesso técnico sob demanda (Achado 6), nunca
// usado pela listagem padrão da tela.
function repoObterAuditoriaPorId_(auditoriaId) {
  const localizado = repoLocalizarAuditoria_(auditoriaId);
  return localizado ? localizado.dados : null;
}

// Verdadeiro se já existe alguma linha MIGRACAO_BASELINE para este
// ruleset_id — usado pela migração administrativa pra ser idempotente
// (Instruções: "rodar duas vezes não pode criar duas baselines").
function repoAuditoriaTemBaseline_(rulesetId) {
  if (!repoAbaAuditoriaExiste_()) return false;
  return repoListarAuditoriasRuleset_(rulesetId).some(a => String(a.operacao) === "MIGRACAO_BASELINE");
}

/*=====================================================
  MIGRAÇÃO — utilitários genéricos de schema (usados só por
  ConfigRegrasCurricularesMigracao.gs). Mantidos aqui porque
  são operações de persistência sobre a planilha oficial, e o
  Repository é quem centraliza esse acesso.
=====================================================*/

// Acrescenta, ao final da linha de cabeçalho de uma aba já existente,
// qualquer coluna de "cabecalhosDesejados" que ainda não exista —
// NUNCA move, apaga ou reordena colunas já presentes. Devolve a lista
// de cabeçalhos efetivamente criados (vazia se nada precisou ser
// criado — é assim que a migração fica idempotente nesse ponto).
function repoGarantirColunasNoFinal_(nomeAba, cabecalhosDesejados) {

  const aba = obterAbaRegras_(nomeAba);
  const ultimaColuna = aba.getLastColumn();
  const cabecalhoAtual = ultimaColuna > 0
    ? aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim())
    : [];

  const faltando = cabecalhosDesejados.filter(c => cabecalhoAtual.indexOf(c) === -1);
  if (faltando.length === 0) return [];

  aba.getRange(1, ultimaColuna + 1, 1, faltando.length).setValues([faltando]);
  return faltando;

}

