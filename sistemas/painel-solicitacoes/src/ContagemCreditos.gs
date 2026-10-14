/*=====================================================
  CONTAGEM DE CRÉDITOS — leitura das Regras Curriculares
  (somente leitura)

  A ferramenta "Contagem de créditos" do painel dos alunos
  usa as MESMAS regras que a equipe cadastra no Painel dos
  servidores (Configurações › Regras Curriculares). A
  planilha é localizada pela chave REGRAS_CURRICULARES na
  planilha mestre ID_INDEX (mesmo mecanismo de PERIODOS,
  ver obterIdDoIndice_ em Codigo.gs).

  Este arquivo:
    - NUNCA grava nada na planilha de regras;
    - só devolve currículos (rulesets) com status ATIVO;
    - só devolve o que o aluno precisa ver (nome da
      habilitação, estrutura, requisitos, disciplinas e
      grupos ativos). Observações internas, auditoria,
      ANALISE_HISTORICO e IDs de planilha nunca saem daqui;
    - não recebe nada do aluno: a conta é feita no
      navegador (PainelContagemMotor.html), então os números
      que o aluno digita não chegam ao servidor.

  As colunas são lidas pelo NOME do cabeçalho (mesma
  política do Painel dos servidores), então a ordem das
  colunas na planilha não importa.

  Como cada requisito é interpretado (classificarCriterio_
  e interpretarOperador_) depende dos códigos e rótulos do
  DICIONARIO da própria planilha. Para conferir como a
  planilha real está sendo lida, rode
  diagnosticarContagemCreditos no editor (▶ Executar) e
  veja o resultado em Registros de execução.
=====================================================*/

const CHAVE_INDICE_REGRAS_CURRICULARES = "REGRAS_CURRICULARES";

// Cache curto: a lista é igual para todos os alunos e muda
// pouco. Uma correção feita pela equipe aparece aqui em até
// 5 minutos.
const CACHE_CONTAGEM_SEGUNDOS = 300;
const CACHE_CONTAGEM_CHAVE = "contagem-creditos-v1";

const ABAS_CONTAGEM = {
  curriculos: "CURRICULOS",
  requisitos: "REQUISITOS_NUMERICOS",
  disciplinas: "DISCIPLINAS",
  grupos: "GRUPOS_REGRAS",
  dicionario: "DICIONARIO"
};

const COLUNAS_CONTAGEM = {
  curriculos: ["ruleset_id", "curso_codigo", "habilitacao_codigo", "habilitacao_nome",
    "estrutura_curricular", "versao", "status", "semestres_minimos", "semestres_maximos",
    "excedente_eletivas_compensa_livres"],
  requisitos: ["requisito_id", "ruleset_id", "criterio", "campo_parser", "operador",
    "valor", "unidade", "descricao", "ordem", "ativo"],
  disciplinas: ["regra_disciplina_id", "ruleset_id", "sigla", "nome", "tipo_regra",
    "grupo_id", "ativo", "ordem"],
  grupos: ["grupo_id", "ruleset_id", "nome_grupo", "tipo_regra", "valor_minimo",
    "unidade", "campo_soma", "ativo"],
  dicionario: ["dominio", "codigo", "rotulo", "descricao", "ativo"]
};

/*-----------------------------------------------------
  ENDPOINT (google.script.run)
------------------------------------------------------*/

// Chamado só quando o aluno abre a Contagem de créditos — não
// pesa na abertura do painel. Devolve { curriculos: [...] }.
function obterCurriculosContagem() {

  const cache = CacheService.getScriptCache();
  const emCache = cache.get(CACHE_CONTAGEM_CHAVE);
  if (emCache) return JSON.parse(emCache);

  const resultado = { curriculos: montarCurriculosContagem_(lerRegrasCurriculares_()) };

  const texto = JSON.stringify(resultado);
  // O CacheService aceita até 100 KB por chave; acima disso só
  // deixa de usar o cache.
  if (texto.length < 95000) cache.put(CACHE_CONTAGEM_CHAVE, texto, CACHE_CONTAGEM_SEGUNDOS);
  return resultado;

}

/*-----------------------------------------------------
  LEITURA DA PLANILHA
------------------------------------------------------*/

function lerRegrasCurriculares_() {
  const planilha = SpreadsheetApp.openById(obterIdDoIndice_(CHAVE_INDICE_REGRAS_CURRICULARES));
  const dados = {};
  Object.keys(ABAS_CONTAGEM).forEach(chave => {
    dados[chave] = lerAbaComoObjetosContagem_(planilha, ABAS_CONTAGEM[chave], COLUNAS_CONTAGEM[chave]);
  });
  return dados;
}

// Lê uma aba inteira como objetos { cabecalho: valor }, procurando
// cada coluna pelo título da linha 1. Coluna ausente ou duplicada é
// erro: melhor não mostrar nada ao aluno do que mostrar uma regra
// lida da coluna errada.
function lerAbaComoObjetosContagem_(planilha, nomeAba, colunas) {

  const aba = planilha.getSheetByName(nomeAba);
  if (!aba) throw new Error(`A planilha de Regras Curriculares não tem a aba "${nomeAba}".`);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) throw new Error(`A aba "${nomeAba}" está sem cabeçalho.`);

  const cabecalho = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(v => String(v || "").trim());
  const posicao = {};
  colunas.forEach(coluna => {
    const indices = [];
    cabecalho.forEach((titulo, i) => { if (titulo === coluna) indices.push(i); });
    if (indices.length === 0) throw new Error(`A aba "${nomeAba}" não tem a coluna "${coluna}".`);
    if (indices.length > 1) throw new Error(`A coluna "${coluna}" aparece mais de uma vez na aba "${nomeAba}".`);
    posicao[coluna] = indices[0];
  });

  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  const linhas = [];
  valores.forEach(linha => {
    const objeto = {};
    let temConteudo = false;
    colunas.forEach(coluna => {
      const valor = linha[posicao[coluna]];
      objeto[coluna] = valor;
      if (valor !== "" && valor !== null && valor !== undefined) temConteudo = true;
    });
    if (temConteudo) linhas.push(objeto);
  });
  return linhas;

}

/*-----------------------------------------------------
  MONTAGEM DO QUE VAI PARA O NAVEGADOR
  (função pura: recebe as linhas já lidas — testável sem
  planilha)
------------------------------------------------------*/

function montarCurriculosContagem_(dados) {

  const texto = v => String(v === null || v === undefined ? "" : v).trim();
  const ativo = v => v === true || textoSemAcentoContagem_(v) === "sim";
  const numeroOuNulo = v => {
    const t = texto(v).replace(",", ".");
    if (t === "" || isNaN(Number(t))) return null;
    return Number(t);
  };

  // DICIONARIO: rótulos e campo_parser dos critérios, rótulos dos operadores.
  const dicionarioAtivo = (dados.dicionario || []).filter(d => ativo(d.ativo));
  const criterios = {};
  const operadores = {};
  dicionarioAtivo.forEach(d => {
    const dominio = texto(d.dominio);
    const codigo = texto(d.codigo);
    if (dominio === "CRITERIO_NUMERICO") {
      const m = texto(d.descricao).match(/campo_parser\s*=\s*([^\s;]+)/i);
      criterios[codigo] = { rotulo: texto(d.rotulo) || codigo, campoParser: m ? m[1].trim() : "" };
    } else if (dominio === "OPERADOR") {
      operadores[codigo] = texto(d.rotulo);
    }
  });

  const porOrdem = (a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0);

  return (dados.curriculos || [])
    .filter(c => texto(c.status).toUpperCase() === "ATIVO")
    .map(c => {

      const rulesetId = texto(c.ruleset_id);
      const doRuleset = linha => texto(linha.ruleset_id) === rulesetId;

      const requisitos = (dados.requisitos || [])
        .filter(r => doRuleset(r) && ativo(r.ativo))
        .sort(porOrdem)
        .map(r => {
          const codigoCriterio = texto(r.criterio);
          const criterio = criterios[codigoCriterio] || { rotulo: codigoCriterio, campoParser: "" };
          const campo = texto(r.campo_parser) || criterio.campoParser;
          const operador = interpretarOperador_(texto(r.operador), operadores[texto(r.operador)] || "");
          return {
            id: texto(r.requisito_id),
            criterio: codigoCriterio,
            rotulo: criterio.rotulo,
            campo: campo,
            tipoCredito: classificarCriterio_(codigoCriterio, campo, criterio.rotulo),
            operador: operador,
            valor: numeroOuNulo(r.valor),
            unidade: texto(r.unidade),
            descricao: texto(r.descricao)
          };
        });

      const gruposAtivos = (dados.grupos || []).filter(g => doRuleset(g) && ativo(g.ativo));
      const idsGrupos = {};
      gruposAtivos.forEach(g => { idsGrupos[texto(g.grupo_id)] = true; });

      const disciplinasAtivas = (dados.disciplinas || [])
        .filter(d => doRuleset(d) && ativo(d.ativo))
        .sort((a, b) => porOrdem(a, b) || texto(a.sigla).localeCompare(texto(b.sigla), "pt-BR"));
      const resumoDisciplina = d => ({ sigla: texto(d.sigla).toUpperCase(), nome: texto(d.nome) });

      const disciplinas = disciplinasAtivas
        .filter(d => texto(d.tipo_regra).toUpperCase() === "OBRIGATORIA")
        .map(resumoDisciplina);

      const grupos = gruposAtivos
        .map(g => ({
          id: texto(g.grupo_id),
          nome: texto(g.nome_grupo),
          tipo: texto(g.tipo_regra).toUpperCase(),
          valorMinimo: numeroOuNulo(g.valor_minimo),
          unidade: texto(g.unidade),
          disciplinas: disciplinasAtivas
            .filter(d => texto(d.tipo_regra).toUpperCase() === "GRUPO" && texto(d.grupo_id) === texto(g.grupo_id))
            .map(resumoDisciplina)
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      const compensa = texto(c.excedente_eletivas_compensa_livres).toUpperCase();

      return {
        id: rulesetId,
        cursoCodigo: texto(c.curso_codigo),
        habilitacaoCodigo: texto(c.habilitacao_codigo),
        habilitacaoNome: texto(c.habilitacao_nome),
        estruturaCurricular: texto(c.estrutura_curricular),
        versao: texto(c.versao),
        semestresMinimos: numeroOuNulo(c.semestres_minimos),
        semestresMaximos: numeroOuNulo(c.semestres_maximos),
        // "SIM", "NAO" ou "" (não respondido no cadastro).
        excedenteEletivasCompensaLivres: (compensa === "SIM" || compensa === "NAO") ? compensa : "",
        requisitos: requisitos,
        disciplinas: disciplinas,
        grupos: grupos
      };
    })
    .sort((a, b) =>
      a.habilitacaoNome.localeCompare(b.habilitacaoNome, "pt-BR") ||
      a.cursoCodigo.localeCompare(b.cursoCodigo) ||
      a.estruturaCurricular.localeCompare(b.estruturaCurricular, "pt-BR"));

}

function textoSemAcentoContagem_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase();
}

// Diz se um requisito é de créditos obrigatórios, eletivos ou livres
// (os três que podem compensar uns aos outros). Olha o código do
// critério, o campo_parser e o rótulo do DICIONARIO; precisa falar de
// crédito E de um dos três tipos. Qualquer outro requisito (horas de
// estágio, AAC, total de créditos...) fica "OUTRO" e é conferido
// sozinho, sem compensação.
function classificarCriterio_(codigo, campo, rotulo) {
  const alvo = textoSemAcentoContagem_([codigo, campo, rotulo].join(" ")).replace(/[_\-]/g, " ");
  if (!/credit/.test(alvo)) return "OUTRO";
  const tipos = [];
  if (/obrigat/.test(alvo)) tipos.push("OBRIGATORIA");
  if (/eletiv/.test(alvo)) tipos.push("ELETIVA");
  if (/livre/.test(alvo)) tipos.push("LIVRE");
  return tipos.length === 1 ? tipos[0] : "OUTRO";
}

// Converte o operador do cadastro (código e rótulo do DICIONARIO) em
// um dos símbolos ">=", ">", "=", "<=", "<". Devolve "" quando não dá
// para ter certeza: o requisito aparece para o aluno, mas sem conta.
function interpretarOperador_(codigo, rotulo) {
  const simbolos = { ">=": ">=", "=>": ">=", "≥": ">=", ">": ">", "=": "=", "==": "=", "<=": "<=", "=<": "<=", "≤": "<=", "<": "<" };
  const c = String(codigo || "").trim();
  if (simbolos[c]) return simbolos[c];
  const r = String(rotulo || "").trim();
  if (simbolos[r]) return simbolos[r];

  const t = textoSemAcentoContagem_(c + " " + r).replace(/[_\-]/g, " ");
  if (/\bgte\b|\bge\b|maior (ou )?igual|minimo|pelo menos|no minimo/.test(t)) return ">=";
  if (/\blte\b|\ble\b|menor (ou )?igual|maximo|no maximo/.test(t)) return "<=";
  if (/\bgt\b|maior que|\bmaior\b/.test(t)) return ">";
  if (/\blt\b|menor que|\bmenor\b/.test(t)) return "<";
  if (/\beq\b|igual/.test(t)) return "=";
  return "";
}

/*-----------------------------------------------------
  DIAGNÓSTICO — rode manualmente pelo editor (▶ Executar,
  com "diagnosticarContagemCreditos" selecionado) para ver,
  em Registros de execução, quais currículos o aluno verá e
  como cada requisito foi entendido. Não mostra dados de
  alunos (a planilha de regras não tem nenhum).
------------------------------------------------------*/
function diagnosticarContagemCreditos() {
  const curriculos = montarCurriculosContagem_(lerRegrasCurriculares_());
  Logger.log(`Currículos ATIVOS que aparecem para os alunos: ${curriculos.length}`);
  curriculos.forEach(c => {
    Logger.log(`— ${c.habilitacaoNome} | curso ${c.cursoCodigo} | estrutura ${c.estruturaCurricular || "(vazia)"} | v${c.versao} | ` +
      `semestres ${c.semestresMinimos || "?"}–${c.semestresMaximos || "?"} | eletivas compensam livres: ${c.excedenteEletivasCompensaLivres || "(não respondido)"}`);
    c.requisitos.forEach(r => {
      Logger.log(`    requisito "${r.rotulo}" (${r.criterio}) ${r.operador || "OPERADOR NÃO RECONHECIDO"} ${r.valor === null ? "SEM VALOR" : r.valor} ${r.unidade} → tipo ${r.tipoCredito}`);
    });
    if (c.disciplinas.length) Logger.log(`    disciplinas obrigatórias: ${c.disciplinas.map(d => d.sigla).join(", ")}`);
    c.grupos.forEach(g => {
      Logger.log(`    grupo "${g.nome}" ${g.tipo} mínimo ${g.valorMinimo === null ? "?" : g.valorMinimo} ${g.unidade}: ${g.disciplinas.map(d => d.sigla).join(", ") || "(sem disciplinas)"}`);
    });
  });
  CacheService.getScriptCache().remove(CACHE_CONTAGEM_CHAVE);
  Logger.log("Cache da contagem limpo: os alunos verão a planilha atual na próxima abertura.");
}
