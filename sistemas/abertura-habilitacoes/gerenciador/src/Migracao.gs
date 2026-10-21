/*=====================================================
  MIGRAÇÃO CONTROLADA DE REGISTRO ID E VERSÃO

  Na versão 1.0, todo doGet() atribuía Registro ID e Versão às linhas
  que não tinham (e trocava IDs repetidos) sem ninguém pedir. Na 2.0,
  abrir a página não altera nada. A preparação em lote é feita só por
  quem administra, no editor do Apps Script, em três passos:

    1. diagnosticarMigracaoRegistroId()  — só leitura: quantas linhas
       precisam de ID, quantas têm ID repetido, quantas têm Versão
       inválida, se faltam colunas, e um CÓDIGO DE CONFIRMAÇÃO
       (ex.: MIGRAR-3-1-3-0-120). Nenhuma célula é escrita.
    2. o responsável cria a propriedade do script
       MIGRACAO_REGISTRO_ID_CONFIRMACAO com esse código, depois da
       cópia de segurança (docs: MANUAL_OPERACAO, seção Migração).
    3. executarMigracaoRegistroId()      — confere de novo, dentro da
       trava, que o plano é o MESMO do código (a planilha não mudou
       no meio) e grava só as colunas Registro ID e Versão (criando os
       títulos no fim da linha 1, se faltarem). Apaga a propriedade
       ao terminar. Rodar de novo não muda nada (idempotente).

  Mesmas regras da 1.0: só linhas com Nome; ID vazio recebe UUID;
  ID repetido mantém a PRIMEIRA ocorrência e as seguintes recebem
  UUID novo; Versão vazia ou não numérica vira 1. A aba "2021 - 2022"
  nunca é lida nem escrita aqui. Os registros de execução mostram
  números de linha e contagens, nunca nomes.
=====================================================*/

const PROP_CONFIRMACAO_MIGRACAO = "MIGRACAO_REGISTRO_ID_CONFIRMACAO";

function planejarMigracao_(tabela) {
  const colNome = colunaOpcional_(tabela, "nome");
  const colId = colunaOpcional_(tabela, "registroId");
  const colVersao = colunaOpcional_(tabela, "versao");
  const plano = {
    colunasFaltando: [colId ? null : CABECALHOS.registroId, colVersao ? null : CABECALHOS.versao].filter(Boolean),
    semId: [], repetidos: [], idInvalido: [], versaoInvalida: [],
    linhasComNome: 0, ultimaLinha: tabela.ultimaLinha
  };
  if (!colNome) throw erroGerenciador_("ESTRUTURA", `Não encontrei a coluna "${CABECALHOS.nome}"; a migração não pode decidir quais linhas são pedidos.`);
  const vistos = {};
  tabela.linhas.forEach((l, i) => {
    if (!celula_(l, colNome)) return;
    plano.linhasComNome++;
    const n = i + 2;
    const id = colId ? String(celula_(l, colId) || "").trim() : "";
    if (!id) plano.semId.push(n);
    else if (vistos[id]) plano.repetidos.push(n);
    else {
      vistos[id] = true;
      if (!FORMATO_REGISTRO_ID.test(id)) plano.idInvalido.push(n);
    }
    const v = colVersao ? celula_(l, colVersao) : "";
    if (!v || isNaN(Number(v))) plano.versaoInvalida.push(n);
  });
  const nada = !plano.colunasFaltando.length && !plano.semId.length && !plano.repetidos.length && !plano.versaoInvalida.length;
  plano.codigo = nada ? "" : ["MIGRAR", plano.semId.length, plano.repetidos.length, plano.versaoInvalida.length,
    plano.colunasFaltando.length, plano.ultimaLinha].join("-");
  return plano;
}

function resumoDoPlano_(plano) {
  return {
    precisaMigrar: !!plano.codigo,
    codigoConfirmacao: plano.codigo,
    linhasComNome: plano.linhasComNome,
    colunasFaltando: plano.colunasFaltando,
    semIdentificador: plano.semId.length,
    identificadoresRepetidos: plano.repetidos.length,
    versaoInvalida: plano.versaoInvalida.length,
    // ID fora do formato UUID não é trocado (a 1.0 também não trocava):
    // só é informado, para conferência humana.
    identificadoresForaDoFormato: plano.idInvalido.length,
    linhas: {
      semIdentificador: plano.semId.slice(0, 50),
      identificadoresRepetidos: plano.repetidos.slice(0, 50),
      versaoInvalida: plano.versaoInvalida.slice(0, 50),
      identificadoresForaDoFormato: plano.idInvalido.slice(0, 50)
    }
  };
}

/** Passo 1 (editor): simulação, sem escrever nada. */
function diagnosticarMigracaoRegistroId() {
  exigirAdministrador_();
  const resumo = resumoDoPlano_(planejarMigracao_(lerTabelaAtual_()));
  console.log("Simulação da migração (nada foi gravado): " + JSON.stringify(resumo));
  if (resumo.precisaMigrar) {
    console.log("Para executar: crie a propriedade " + PROP_CONFIRMACAO_MIGRACAO + " = " + resumo.codigoConfirmacao +
      " e rode executarMigracaoRegistroId. Faça antes a cópia de segurança da planilha.");
  }
  return paraPagina_(resumo, "simulação da migração");
}

/** Passo 3 (editor): execução, só com a confirmação igual ao plano atual. */
function executarMigracaoRegistroId() {
  exigirAdministrador_();
  const props = PropertiesService.getScriptProperties();
  const confirmacao = String(props.getProperty(PROP_CONFIRMACAO_MIGRACAO) || "").trim();

  const lock = travar_(30000);
  try {
    const tabela = lerTabelaAtual_();
    const plano = planejarMigracao_(tabela);
    if (!plano.codigo) {
      if (confirmacao) props.deleteProperty(PROP_CONFIRMACAO_MIGRACAO);
      console.log("Migração: nada a fazer.");
      return paraPagina_({ executada: false, motivo: "NADA_A_FAZER", resumo: resumoDoPlano_(plano) }, "migração");
    }
    if (confirmacao !== plano.codigo) {
      throw erroGerenciador_("CONFIRMACAO_MIGRACAO",
        `A confirmação não corresponde ao plano atual (${plano.codigo}). Rode diagnosticarMigracaoRegistroId, confira o resultado e ` +
        `ponha esse código na propriedade ${PROP_CONFIRMACAO_MIGRACAO}. Nada foi gravado.`);
    }

    const colId = obterOuCriarColuna_(tabela, "registroId");
    const colVersao = obterOuCriarColuna_(tabela, "versao");
    const colNome = colunaObrigatoria_(tabela, "nome");
    if (tabela.nome !== ABA_ATUAL) throw erroGerenciador_("ESTRUTURA", "Gravação recusada: só a aba atual pode ser alterada por este sistema.");
    const vistos = {};
    const ids = [], versoes = [];
    tabela.linhas.forEach(l => {
      let id = String(celula_(l, colId) || "").trim();
      let v = celula_(l, colVersao);
      if (celula_(l, colNome)) {
        if (!id || vistos[id]) {
          do { id = Utilities.getUuid(); } while (vistos[id]);
        }
        vistos[id] = true;
        if (!v || isNaN(Number(v))) v = 1;
      }
      ids.push([celula_(l, colNome) ? id : celula_(l, colId)]);
      versoes.push([v === undefined ? "" : v]);
    });
    // Duas gravações estreitas (só as duas colunas), como na 1.0: nada
    // entre elas é reescrito.
    if (tabela.linhas.length) {
      tabela.aba.getRange(2, colId, tabela.linhas.length, 1).setValues(ids);
      tabela.aba.getRange(2, colVersao, tabela.linhas.length, 1).setValues(versoes);
    }
    SpreadsheetApp.flush();
    props.deleteProperty(PROP_CONFIRMACAO_MIGRACAO);
    const resumo = resumoDoPlano_(plano);
    console.log("Migração executada: " + JSON.stringify(resumo));
    return paraPagina_({ executada: true, resumo: resumo }, "migração");
  } finally {
    lock.releaseLock();
  }
}
