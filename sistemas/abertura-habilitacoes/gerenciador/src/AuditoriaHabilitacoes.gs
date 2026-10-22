/*=====================================================
  AUDITORIA DO GERENCIADOR — o que é específico deste sistema
=====================================================*/

// O núcleo (Auditoria.gs, cópia de shared/auditoria/) grava; este
// arquivo diz o quê (docs/auditoria/MODELO.md):
//
//   planilha   chave AUDITORIA_ABERTURA_HABILITACOES do ID_INDEX, no
//              ambiente do projeto (produção ou homologação)
//   quem       e-mail (Session), perfil, nome (B) e observação (D) da
//              aba GERENCIADOR_HABILITACOES (Acesso.gs)
//   eventos    AUDITORIA_EVENTOS_HABILITACOES, abaixo (vira a aba DICIONARIO)
//   antes/depois  as células do pedido que o gerenciador grava
//              (Observações, Situação, Versão, E-mail Enviado, Data de
//              Conclusão, Registro ID), por pedido ou por linha
//
// Toda função pública que grava passa por auditarAlteracao_: se a
// planilha da auditoria não abrir, nada é alterado. As consultas que
// mostram pedidos (listas, detalhe, busca, relatórios) são gravadas
// depois de responder e nunca são bloqueadas pela auditoria.
//
// A página manda os eventos dela em lotes (AuditoriaHabilitacoesUI.html
// → registrarEventosHabilitacoes). O servidor aceita só os códigos de
// origem "navegador" e sempre põe e-mail, nome e perfil por conta própria.

// Getters: a ordem dos arquivos .gs não é garantida, então nada aqui
// lê constantes de outros arquivos na carga.
const AUDITORIA_HABILITACOES = {
  get VERSAO() { return VERSAO_GERENCIADOR; },
  MAX_LOTE: 50,
  CACHE_CONTEXTO: "habilitacoesAuditoriaContexto:",
  CACHE_CONTEXTO_SEGUNDOS: 21600,
  FUNCAO_GATILHO: "consolidarAuditoriaHabilitacoes"
};

// codigo: categoria · criticidade · origem · descrição (vai para a aba DICIONARIO)
const AUDITORIA_EVENTOS_HABILITACOES = {
  "ACESSO.ABRIR":       ["Acesso", "baixa", "navegador", "Abriu o gerenciador. duracao_ms = tempo de carregamento da página."],
  "ACESSO.NEGAR":       ["Acesso", "alta", "servidor", "Conta fora da aba GERENCIADOR_HABILITACOES, não identificada, ou lista de acesso indisponível, ao abrir a página ou chamar uma função. mensagem = motivo."],
  "PERMISSAO.RECUSAR":  ["Acesso", "alta", "servidor", "Perfil LEITOR tentou gravar; o servidor recusou. alvo_id = função chamada."],
  "TELA.ABRIR":         ["Navegação", "baixa", "navegador", "Mudou de área (Pendentes, Concluídos, Relatórios)."],
  "NAVEGACAO.MODO":     ["Navegação", "baixa", "navegador", "Trocou entre menu lateral e abas."],
  "TEMA.TROCAR":        ["Navegação", "baixa", "navegador", "Trocou a aparência (Sistema, Claro, Escuro)."],
  "PEDIDO.FECHAR":      ["Navegação", "baixa", "navegador", "Fechou a janela de um pedido. duracao_ms = tempo com a janela aberta; o pedido é o do PEDIDO.ABRIR anterior da mesma sessão."],
  "BUSCA.PENDENTES":    ["Leitura", "baixa", "navegador", "Filtrou a lista de pendentes já carregada. mensagem = termo; detalhes = quantos apareceram."],
  "PENDENTES.LISTAR":   ["Leitura", "baixa", "servidor", "Carregou a lista de pedidos pendentes (nomes, Nº USP e programa). detalhes = quantos."],
  "CONCLUIDOS.LISTAR":  ["Leitura", "baixa", "servidor", "Carregou os 10 concluídos mais recentes. detalhes = quantos."],
  "PEDIDO.ABRIR":       ["Leitura", "média", "servidor", "Abriu (ou recarregou) os dados de um pedido. alvo_id = Registro ID; detalhes = Versão lida."],
  "HISTORICO.BUSCAR":   ["Leitura", "média", "servidor", "Buscou no histórico (aba atual e 2021–2022). mensagem = termo; detalhes = quantos resultados."],
  "RELATORIO.GERAR":    ["Leitura", "baixa", "servidor", "Abriu os relatórios (só contagens)."],
  "AJUDA.ABRIR":        ["Ajuda", "baixa", "navegador", "Abriu a Central de Ajuda. alvo_id = seção, quando aberta por um ?."],
  "AJUDA.BUSCAR":       ["Ajuda", "baixa", "navegador", "Buscou na Central de Ajuda. mensagem = termo; detalhes = resultado da busca."],
  "AJUDA.FAQ":          ["Ajuda", "baixa", "navegador", "Abriu ou fechou uma pergunta do FAQ."],
  "ERRO.NAVEGADOR":     ["Erro", "média", "navegador", "Erro de JavaScript na página (sem dados de alunos)."],
  "PEDIDO.SALVAR":      ["Alteração", "alta", "servidor", "Salvou um pedido: observações, concluir ou reabrir e o pedido de aviso. alvo_id = Registro ID; ALTERACOES = cada célula antes e depois; detalhes = opções marcadas e o resultado."],
  "ALUNO.AVISAR":       ["Alteração", "alta", "servidor", "E-mail de aviso ao aluno, dentro de um salvamento (evento_pai_id). mensagem = ENVIADO, FALHOU ou ENVIADO_SEM_REGISTRO (o e-mail saiu, mas a data não foi registrada); resultado ERRO quando o envio falhou."],
  "PEDIDO.PREPARAR":    ["Alteração", "alta", "servidor", "Deu Registro ID a um pedido sem identificador (Preparar pedido). alvo_id = linha; detalhes = Registro ID novo."],
  "REGISTRO.MIGRAR":    ["Alteração", "alta", "servidor", "Rodou a migração controlada de Registro ID e Versão (editor do Apps Script). ALTERACOES = cada célula, por linha."],
  "REGISTRO.RECUPERAR": ["Alteração", "alta", "servidor", "Rodou a recuperação de um pedido (editor do Apps Script). ALTERACOES = Registro ID e Versão da linha."],
  "MANUTENCAO.EXECUTAR": ["Manutenção", "média", "servidor", "Rodou uma função de manutenção (diagnósticos, preparar ou conferir a auditoria, consolidar)."]
};

const AUDITORIA_CONFIG = {
  get versao() { return AUDITORIA_HABILITACOES.VERSAO; },
  get fuso() { return TIMEZONE; },
  idPlanilha: () => idDaChave_(CONFIG.CHAVE_AUDITORIA),
  colunasPendencias: null,
  get dicionario() {
    const d = {};
    Object.keys(AUDITORIA_EVENTOS_HABILITACOES).forEach(codigo => {
      const e = AUDITORIA_EVENTOS_HABILITACOES[codigo];
      d[codigo] = { categoria: e[0], criticidade: e[1], origem: e[2], descricao: e[3], desde: "2.1" };
    });
    return d;
  },
  // Nunca lança erro: sem acesso, o código da recusa vai no lugar do perfil.
  usuario: () => {
    const email = emailDaSessao_();
    try {
      const u = usuarioAtual_();
      return { email: email, nome: u.nome, tipo: "", perfil: u.perfil };
    } catch (erro) {
      return { email: email, nome: "", tipo: "", perfil: codigoDoErro_(erro) };
    }
  },
  leiaMe: () => [
    ["O que é", "Auditoria do Gerenciador de Abertura de Habilitações (versão " + AUDITORIA_HABILITACOES.VERSAO + "). Cada ação vira uma linha em EVENTOS_<ano>; cada célula alterada de um pedido vira uma linha em ALTERACOES_<ano>, ligada pelo evento_id."],
    ["Quem", "email vem da sessão do Google; nome e perfil, da aba GERENCIADOR_HABILITACOES da planilha de permissões, no momento da ação. A página não consegue informar outra pessoa."],
    ["Quem grava", "Só o próprio gerenciador, com a conta que o implantou. As abas são protegidas. Não edite, não ordene, não apague linhas: a conferência de integridade aponta qualquer mudança."],
    ["Quem pode abrir", "Só a conta institucional do Serviço de Graduação. Não compartilhe esta planilha: ela tem nomes da equipe, termos de busca e o texto das observações dos pedidos."],
    ["Integridade", "Cada evento tem seq (sequencial) e hash (SHA-256 da linha + hash do evento anterior). Para conferir, rode verificarIntegridadeAuditoria no editor do Apps Script do gerenciador."],
    ["Se a auditoria falhar", "Salvar, avisar aluno, preparar pedido, migração e recuperação são recusados e nada muda. Consultas, navegação e ajuda continuam funcionando, sem registro."],
    ["Pedido", "alvo_id = Registro ID do pedido (coluna da planilha de respostas). Nome, Nº USP e e-mail do aluno não são copiados para cá; o Registro ID leva à linha."],
    ["Abas", "EVENTOS_<ano> · ALTERACOES_<ano> · SESSOES e RESUMO_DIARIO (consolidadas toda madrugada) · DICIONARIO (o que cada código significa) · LEIA-ME."],
    ["Sessão", "sessao_id identifica uma aba do navegador aberta no gerenciador. A duração da sessão é estimada pelo último evento (não há sinal de \"saiu\")."],
    ["Não grava", "IP (o Apps Script não informa), e-mail do aluno, conteúdo do e-mail de aviso, URLs e IDs de planilhas."],
    ["Retenção", "Nada é apagado automaticamente. Prazo de guarda: A VALIDAR INSTITUCIONALMENTE."],
    ["Documentação", "docs/auditoria/ e docs/sistemas/abertura-habilitacoes/ no repositório dos sistemas."]
  ]
};

/*-----------------------------------------------------
  CONTEXTO DA PÁGINA (sessão, tela, navegador)
------------------------------------------------------*/

// O último lote de cada pessoa deixa aqui a sessão e a área; as
// chamadas do servidor (listas, salvar) usam isso para ligar o evento
// à mesma sessão. Com duas abas abertas, vale a última ativa.
function chaveContextoAuditoriaHabilitacoes_() {
  const email = emailDaSessao_();
  return email ? AUDITORIA_HABILITACOES.CACHE_CONTEXTO + ambiente_() + ":" + email : "";
}

function contextoAuditoriaHabilitacoes_() {
  try {
    const chave = chaveContextoAuditoriaHabilitacoes_();
    const salvo = chave && CacheService.getScriptCache().get(chave);
    return salvo ? JSON.parse(salvo) : {};
  } catch (erro) {
    return {};
  }
}

/*-----------------------------------------------------
  EVENTOS VINDOS DA PÁGINA
------------------------------------------------------*/

const CAMPOS_EVENTO_NAVEGADOR = ["evento", "tela", "alvo_tipo", "alvo_id", "mensagem", "detalhes", "duracao_ms", "data_hora_navegador"];

/**
 * Lote da AuditoriaHabilitacoesUI.html: { sessao_id, contexto, eventos: [...] }.
 * @return {{gravados: number}}
 */
function registrarEventosHabilitacoes(lote) {
  exigirLeitor_();
  if (!lote || !Array.isArray(lote.eventos)) throw erroGerenciador_("ENTRADA", "Lote de auditoria inválido.");
  if (lote.eventos.length > AUDITORIA_HABILITACOES.MAX_LOTE) throw erroGerenciador_("ENTRADA", "Lote de auditoria grande demais.");
  const sessao = /^[0-9a-f-]{36}$/i.test(String(lote.sessao_id || "")) ? String(lote.sessao_id) : "";
  const c = lote.contexto || {};
  const contexto = {
    versao: AUDITORIA_HABILITACOES.VERSAO,
    navegador: textoAuditoria_(c.navegador, 80),
    largura_tela: textoAuditoria_(parseInt(c.largura_tela, 10) || "", 10),
    tema: ["light", "dark"].indexOf(c.tema) > -1 ? c.tema : "",
    modo_navegacao: ["sidebar", "abas"].indexOf(c.modo_navegacao) > -1 ? c.modo_navegacao : ""
  };
  const eventos = lote.eventos.map(bruto => {
    const def = AUDITORIA_EVENTOS_HABILITACOES[bruto && bruto.evento];
    if (!def || def[2] !== "navegador") throw erroGerenciador_("ENTRADA", "Evento de auditoria não aceito da página: " + textoAuditoria_(bruto && bruto.evento, 40));
    const ev = { origem: "navegador", sessao_id: sessao, contexto: contexto };
    CAMPOS_EVENTO_NAVEGADOR.forEach(campo => { if (bruto[campo] !== undefined) ev[campo] = bruto[campo]; });
    if (ev.duracao_ms !== undefined) ev.duracao_ms = Math.max(0, Math.round(Number(ev.duracao_ms) || 0));
    return ev;
  });
  registrarEventosAuditoria_(eventos);
  const ultimo = eventos.length ? eventos[eventos.length - 1] : {};
  try {
    const chave = chaveContextoAuditoriaHabilitacoes_();
    if (chave) {
      CacheService.getScriptCache().put(chave, JSON.stringify({ sessao_id: sessao, tela: ultimo.tela || "", contexto: contexto }),
        AUDITORIA_HABILITACOES.CACHE_CONTEXTO_SEGUNDOS);
    }
  } catch (erro) { /* só perde a ligação com a sessão */ }
  return { gravados: eventos.length };
}

/*-----------------------------------------------------
  RECUSAS (chamadas por Acesso.gs e doGet; nunca falham)
------------------------------------------------------*/

// Nome da função pública que estava sendo chamada: a primeira da
// pilha sem "_" no fim (as internas terminam com "_").
function funcaoPublicaChamada_() {
  const linhas = String(new Error().stack || "").split("\n");
  for (let i = 1; i < linhas.length; i++) {
    const m = linhas[i].match(/at (?:Object\.)?([A-Za-z0-9]+) /);
    if (m && !/_$/.test(m[1])) return m[1];
  }
  return "";
}

function registrarRecusaHabilitacoes_(erro) {
  const codigo = codigoDoErro_(erro);
  const leitura = codigo === "SO_LEITURA";
  if (!leitura && ["SEM_ACESSO", "SEM_IDENTIFICACAO", "ACESSO_INDISPONIVEL"].indexOf(codigo) === -1) return;
  const ctx = contextoAuditoriaHabilitacoes_();
  registrarEventoSemFalhar_({
    evento: leitura ? "PERMISSAO.RECUSAR" : "ACESSO.NEGAR", resultado: "NEGADO",
    alvo_tipo: "funcao", alvo_id: funcaoPublicaChamada_(), mensagem: codigo,
    sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto
  });
}

/** doGet recusou a página (GerenciadorSemAcesso). */
function registrarPaginaNegadaHabilitacoes_(acesso) {
  registrarEventoSemFalhar_({ evento: "ACESSO.NEGAR", resultado: "NEGADO", alvo_tipo: "pagina", alvo_id: "Gerenciador", mensagem: acesso && acesso.codigo });
}

/*-----------------------------------------------------
  CONSULTAS (gravadas depois de responder; nunca bloqueiam)
------------------------------------------------------*/

function registrarLeituraHabilitacoes_(evento, campos) {
  const ctx = contextoAuditoriaHabilitacoes_();
  registrarEventoSemFalhar_(Object.assign({ evento: evento, sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto }, campos));
}

function obterPendentes() {
  exigirLeitor_();
  const lista = obterPendentesSemAuditoria_();
  registrarLeituraHabilitacoes_("PENDENTES.LISTAR", { alvo_tipo: "lista", alvo_id: "pendentes", detalhes: { pedidos: lista.length } });
  return lista;
}

function obterConcluidosRecentes() {
  exigirLeitor_();
  const lista = obterConcluidosRecentesSemAuditoria_();
  registrarLeituraHabilitacoes_("CONCLUIDOS.LISTAR", { alvo_tipo: "lista", alvo_id: "concluidos", detalhes: { pedidos: lista.length } });
  return lista;
}

function obterDetalhe(registroId) {
  exigirLeitor_();
  const detalhe = obterDetalheSemAuditoria_(registroId);
  registrarLeituraHabilitacoes_("PEDIDO.ABRIR", { alvo_tipo: "pedido", alvo_id: registroId, detalhes: { versao: detalhe && detalhe.versao } });
  return detalhe;
}

function buscarHistorico(termo) {
  exigirLeitor_();
  const lista = buscarHistoricoSemAuditoria_(termo);
  if (String(termo || "").trim()) {
    registrarLeituraHabilitacoes_("HISTORICO.BUSCAR", { alvo_tipo: "busca", mensagem: String(termo).trim().slice(0, LIMITE_TERMO_BUSCA), detalhes: { resultados: lista.length } });
  }
  return lista;
}

function obterRelatorio() {
  exigirLeitor_();
  const relatorio = obterRelatorioSemAuditoria_();
  registrarLeituraHabilitacoes_("RELATORIO.GERAR", { alvo_tipo: "relatorio", detalhes: { total: relatorio.total } });
  return relatorio;
}

/*-----------------------------------------------------
  ANTES E DEPOIS
------------------------------------------------------*/

// As células que o gerenciador grava num pedido, com o nome da coluna.
function estadoDaLinhaAuditoria_(tabela, linha) {
  const l = tabela.linhas[linha - 2];
  if (!l) return {};
  const coluna = chave => colunaOpcional_(tabela, chave);
  return {
    "J Observações": celula_(l, COL_OBSERVACOES_FIXA),
    "K Situação": celula_(l, COL_SITUACAO_FIXA),
    "Data de Conclusão": celula_(l, coluna("dataConclusao")),
    "E-mail Enviado": celula_(l, coluna("emailEnviado")),
    "Registro ID": celula_(l, coluna("registroId")),
    "Versão": celula_(l, coluna("versao"))
  };
}

// Salvar: o pedido é achado pelo Registro ID, antes e depois.
function estadoPedidoAuditoria_(registroId) {
  const tabela = lerTabelaAtual_();
  const linha = localizarLinhaPorId_(tabela, registroId);
  return Object.assign({ linha: linha }, estadoDaLinhaAuditoria_(tabela, linha));
}

// Preparar, migrar e recuperar: pela linha (o Registro ID é o que muda).
function estadoLinhasAuditoria_(linhas) {
  const tabela = lerTabelaAtual_();
  const estado = {};
  linhas.forEach(n => {
    if (n >= 2 && tabela.linhas[n - 2]) estado["linha " + n] = estadoDaLinhaAuditoria_(tabela, n);
  });
  return estado;
}

// Todas as linhas com Nome: Registro ID e Versão (o que a migração grava).
function estadoMigracaoAuditoria_() {
  const tabela = lerTabelaAtual_();
  const colNome = colunaOpcional_(tabela, "nome");
  const colId = colunaOpcional_(tabela, "registroId");
  const colVersao = colunaOpcional_(tabela, "versao");
  const estado = { colunas: { "Registro ID": colId || "", "Versão": colVersao || "" } };
  tabela.linhas.forEach((l, i) => {
    if (!celula_(l, colNome)) return;
    estado["linha " + (i + 2)] = { "Registro ID": celula_(l, colId), "Versão": celula_(l, colVersao) };
  });
  return estado;
}

// "linha 12.Versão" vira alvo pedido "linha 12", campo "Versão".
function alteracaoPorLinhaAuditoria_(a) {
  const m = String(a.campo).match(/^(linha \d+)\.(.*)$/);
  return m ? Object.assign({}, a, { alvo_tipo: "pedido", alvo_id: m[1], campo: m[2] }) : a;
}

/*-----------------------------------------------------
  ALTERAÇÕES AUDITADAS (as funções que a página e o editor chamam)
------------------------------------------------------*/

// A planilha da auditoria não abriu: a página só entende erros com
// código no começo da mensagem.
function alteracaoHabilitacoes_(def, executar) {
  const ctx = contextoAuditoriaHabilitacoes_();
  try {
    return auditarAlteracao_(Object.assign({ sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto, planilha: CONFIG.CHAVE_RESPOSTAS }, def), executar);
  } catch (erro) {
    if (erro && erro.codigo === "AUDITORIA_INDISPONIVEL" && !/^AUDITORIA_INDISPONIVEL:/.test(erro.message)) {
      throw erroGerenciador_("AUDITORIA_INDISPONIVEL", erro.message);
    }
    throw erro;
  }
}

const RESULTADO_DO_AVISO = { ENVIADO: "OK", ENVIADO_SEM_REGISTRO: "OK", FALHOU: "ERRO" };

function salvarPedido(registroId, versaoEsperada, dados) {
  exigirAdministrador_();
  const d = dados && typeof dados === "object" ? dados : {};
  let resultado = null;
  return alteracaoHabilitacoes_({
    evento: "PEDIDO.SALVAR", alvo_tipo: "pedido", alvo_id: registroId,
    estado: () => estadoPedidoAuditoria_(registroId),
    detalhes: r => ({
      concluir: d.concluirSolicitacao === true, avisar: d.avisarAluno === true, reenviar: d.reenviar === true,
      versao_esperada: versaoEsperada, resultado: r && r.resultado, email: r && r.email, motivo: r && r.motivo
    }),
    efeitos: (alteracoes, eventoId) => resultado && RESULTADO_DO_AVISO[resultado.email] ? [{
      evento: "ALUNO.AVISAR", evento_pai_id: eventoId, alvo_tipo: "pedido", alvo_id: registroId,
      resultado: RESULTADO_DO_AVISO[resultado.email], mensagem: resultado.email, motivo: resultado.motivo || ""
    }] : []
  }, () => (resultado = salvarPedidoSemAuditoria_(registroId, versaoEsperada, dados)));
}

function atribuirIdentificador(referencia) {
  exigirAdministrador_();
  const linha = Number(referencia && referencia.linha);
  return alteracaoHabilitacoes_({
    evento: "PEDIDO.PREPARAR", alvo_tipo: "pedido", alvo_id: "linha " + linha,
    estado: () => estadoLinhasAuditoria_([linha]),
    mapearAlteracao: alteracaoPorLinhaAuditoria_,
    detalhes: r => ({ linha: linha, registro_id: r && r.registroId })
  }, () => atribuirIdentificadorSemAuditoria_(referencia));
}

function executarMigracaoRegistroId() {
  exigirAdministrador_();
  return alteracaoHabilitacoes_({
    evento: "REGISTRO.MIGRAR", alvo_tipo: "planilha", alvo_id: CONFIG.CHAVE_RESPOSTAS,
    estado: estadoMigracaoAuditoria_,
    mapearAlteracao: alteracaoPorLinhaAuditoria_,
    detalhes: r => ({ executada: r && r.executada, motivo: r && r.motivo, gravacao: r && r.resumo && r.resumo.gravacao })
  }, () => executarMigracaoRegistroIdSemAuditoria_());
}

function executarRecuperacaoRegistro() {
  exigirAdministrador_();
  const m = String(PropertiesService.getScriptProperties().getProperty(PROP_RECUPERACAO_REGISTRO) || "").trim().match(/^RECUPERAR-(\d{1,7})-/);
  const linha = m ? Number(m[1]) : 0;
  return alteracaoHabilitacoes_({
    evento: "REGISTRO.RECUPERAR", alvo_tipo: "pedido", alvo_id: linha ? "linha " + linha : "",
    estado: () => estadoLinhasAuditoria_(linha ? [linha] : []),
    mapearAlteracao: alteracaoPorLinhaAuditoria_,
    detalhes: r => ({ executada: r && r.executada, motivo: r && r.motivo, problemas: r && r.resumo && r.resumo.problemas,
      acoes: r && r.resumo && r.resumo.acoes, registro_id: r && r.novoRegistroId })
  }, () => executarRecuperacaoRegistroSemAuditoria_());
}

/*-----------------------------------------------------
  MANUTENÇÃO (editor do Apps Script e gatilho diário)
------------------------------------------------------*/

function registrarManutencaoHabilitacoes_(funcao, resultado) {
  registrarEventoSemFalhar_({ evento: "MANUTENCAO.EXECUTAR", alvo_tipo: "funcao", alvo_id: funcao, detalhes: resultado });
}

/**
 * Rode uma vez no editor: cria as abas, o DICIONARIO e o LEIA-ME, apaga a
 * "Página1" vazia e instala o gatilho diário de consolidação (2h).
 * Pode rodar de novo a qualquer momento (reescreve DICIONARIO e LEIA-ME).
 */
function prepararAuditoriaHabilitacoes() {
  exigirAdministrador_();
  const resultado = prepararAuditoria_(AUDITORIA_HABILITACOES.FUNCAO_GATILHO);
  registrarManutencaoHabilitacoes_("prepararAuditoriaHabilitacoes", resultado);
  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Refaz a corrente de hashes e mostra a primeira linha mexida, se houver. */
function verificarIntegridadeAuditoria() {
  exigirAdministrador_();
  const resultado = verificarIntegridadeAuditoria_();
  registrarManutencaoHabilitacoes_("verificarIntegridadeAuditoria", { eventos: resultado.eventos, ok: resultado.ok, problemas: resultado.problemas.length });
  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Gatilho diário (ou à mão, por administrador): SESSOES e RESUMO_DIARIO. */
function consolidarAuditoriaHabilitacoes(e) {
  exigirGatilhoOuAdministrador_(e);
  const resultado = consolidarAuditoria_();
  registrarManutencaoHabilitacoes_("consolidarAuditoriaHabilitacoes", resultado);
  return resultado;
}

// A página também consegue chamar esta função; um objeto de evento
// inventado não passa, porque o triggerUid precisa ser de um gatilho
// deste projeto.
function exigirGatilhoOuAdministrador_(e) {
  const uid = e && e.triggerUid;
  if (uid && ScriptApp.getProjectTriggers().some(t => t.getUniqueId() === String(uid))) return;
  exigirAdministrador_();
}
