/*=====================================================
  GERENCIADOR DE ABERTURA DE HABILITAÇÕES — V2.0
  Backend Apps Script (projeto autônomo) — Serviço de Graduação, IPUSP

  Origem: versão 1.0 em uso (fora do repositório), recebida em
  21/10/2026. A 2.0 preserva as funções da equipe (pendentes, dez
  concluídos mais recentes, busca no histórico, detalhe, observações,
  concluir, reabrir, aviso por e-mail com reserva, relatórios) e muda:
    - nenhum ID no código: planilhas pelo ID_INDEX (Configuracao.gs),
      com ambiente de homologação;
    - autorização no servidor em toda função pública (Acesso.gs);
    - abrir a página não altera a planilha: a atribuição de Registro
      ID/Versão virou operação expressa (Migracao.gs e
      atribuirIdentificador em Salvamento.gs);
    - recusas antes de gravar, reserva de envio com data, distinção
      entre "salvo mas e-mail falhou" e "e-mail enviado mas não
      registrado" (Salvamento.gs);
    - registros de execução sem nomes, e-mails ou Nº USP;
    - interface GRADIP (tema, menu lateral/abas, Central de Ajuda).
  Diferenças e decisões: docs/sistemas/abertura-habilitacoes/.

  Arquivos:
    Codigo.gs        página (doGet), include_ e diagnósticos
    Configuracao.gs  ID_INDEX, ambiente, erros com código
    Acesso.gs        lista de acesso e perfis
    Planilha.gs      leitura em lote, escrita, Registro ID
    Pedidos.gs       listas, detalhe, busca e relatórios (só leitura)
    Salvamento.gs    salvar, e-mail e preparar pedido sem ID
    Migracao.gs      diagnóstico e migração controlada de IDs
    Utilidades.gs    texto, datas, trava e resposta para a página
    Auditoria.gs     núcleo da auditoria (cópia de shared/auditoria/)
    AuditoriaHabilitacoes.gs  o que é auditado aqui e as funções
                     públicas que gravam ou leem pedidos (envolvidas)

  Funções que a página chama (google.script.run): obterPendentes,
  obterConcluidosRecentes, obterDetalhe, buscarHistorico,
  obterRelatorio (LEITOR); salvarPedido, atribuirIdentificador
  (ADMINISTRADOR); registrarEventosHabilitacoes (auditoria da
  página, LEITOR). Funções de manutenção, para rodar no editor
  (ADMINISTRADOR): diagnosticarConfiguracao, diagnosticarPlanilha,
  diagnosticarMigracaoRegistroId, executarMigracaoRegistroId,
  diagnosticarRecuperacaoRegistro, executarRecuperacaoRegistro,
  prepararAuditoriaHabilitacoes, verificarIntegridadeAuditoria,
  consolidarAuditoriaHabilitacoes (também o gatilho diário).
=====================================================*/

function doGet(e) {
  const acesso = verificarAcessoParaPagina_();
  if (!acesso.ok) {
    try { registrarPaginaNegadaHabilitacoes_(acesso); } catch (falha) { /* auditoria indisponível */ }
    return paginaSemAcesso_(acesso);
  }
  const pagina = HtmlService.createTemplateFromFile("GerenciadorApp");
  pagina.perfil = acesso.perfil;
  // Cabeçalho: nome (B) e observação (D) da aba de acesso; sem nome, o e-mail.
  pagina.usuarioNome = acesso.nome || acesso.email;
  pagina.usuarioDescricao = acesso.observacao;
  pagina.sessao = Utilities.getUuid();
  pagina.versao = VERSAO_GERENCIADOR;
  pagina.homologacao = prefixoAmbiente_() !== "";
  return pagina.evaluate()
    .setTitle(prefixoAmbiente_() + "Gerenciador de Abertura de Habilitações")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/*=====================================================
  DIAGNÓSTICOS (rodar no editor; só leitura)
=====================================================*/

/**
 * Ambiente, chaves do ID_INDEX e lista de acesso, sem mostrar IDs nem
 * e-mails. Além de ADMINISTRADOR, aceita a própria conta dona do
 * projeto (a que roda o editor), porque é justamente quando a lista
 * de acesso está quebrada que este diagnóstico é necessário. Ele não
 * lê nenhum pedido.
 */
function diagnosticarConfiguracao() {
  const ativo = emailDaSessao_();
  let dono = "";
  try { dono = normalizarEmail_(Session.getEffectiveUser().getEmail()); } catch (erro) { dono = ""; }
  if (!ativo || ativo !== dono) exigirAdministrador_();
  limparCachesDeConfiguracao_();
  const resultado = { versao: VERSAO_GERENCIADOR, ambiente: "", chaves: {}, acesso: "" };
  try { resultado.ambiente = ambiente_(); } catch (erro) { resultado.ambiente = "FALHA: " + erro.message; }
  [CONFIG.CHAVE_RESPOSTAS, CONFIG.CHAVE_PERMISSOES, CONFIG.CHAVE_AUDITORIA].forEach(chave => {
    try {
      resultado.chaves[chave] = "ok: " + abrirPlanilhaPorChave_(chave).getName();
    } catch (erro) {
      resultado.chaves[chave] = "FALHA: " + semIds_(erro && erro.message);
    }
  });
  try {
    const mapa = lerPermissoes_();
    const contagem = { ADMINISTRADOR: 0, LEITOR: 0 };
    Object.keys(mapa).forEach(email => { contagem[mapa[email].perfil]++; });
    resultado.acesso = `aba ${ACESSO.ABA}: ${contagem.ADMINISTRADOR} administrador(es), ${contagem.LEITOR} leitor(es)`;
  } catch (erro) {
    resultado.acesso = "FALHA: " + semIds_(erro && erro.message);
  }
  console.log(JSON.stringify(resultado));
  registrarManutencaoHabilitacoes_("diagnosticarConfiguracao", { ambiente: resultado.ambiente, acesso: resultado.acesso });
  return resultado;
}

/** Contagens da aba atual para conferência (sem nomes). */
function diagnosticarPlanilha() {
  exigirAdministrador_();
  const tabela = lerTabelaAtual_();
  const colNome = colunaOpcional_(tabela, "nome");
  const colEmailEnviado = colunaOpcional_(tabela, "emailEnviado");
  const resultado = {
    aba: tabela.nome,
    ultimaLinha: tabela.ultimaLinha,
    ultimaColuna: tabela.ultimaColuna,
    titulosDasColunasUsadas: Object.keys(CABECALHOS).reduce((o, k) => { o[k] = colunaOpcional_(tabela, k) || "ausente"; return o; }, {}),
    tituloJ: tabela.titulos[COL_OBSERVACOES_FIXA - 1] || "",
    tituloK: tabela.titulos[COL_SITUACAO_FIXA - 1] || "",
    linhasComNome: 0, pendentes: 0, concluidos: 0, situacoes: {}, reservasDeEnvio: 0,
    migracao: null
  };
  if (colNome) {
    tabela.linhas.forEach(l => {
      if (!celula_(l, colNome)) return;
      resultado.linhasComNome++;
      const situacao = celula_(l, COL_SITUACAO_FIXA);
      if (estaConcluido_(situacao)) resultado.concluidos++; else resultado.pendentes++;
      const rotulo = String(situacao === "" ? "(vazio)" : situacao).slice(0, 30);
      resultado.situacoes[rotulo] = (resultado.situacoes[rotulo] || 0) + 1;
      if (ehReserva_(celula_(l, colEmailEnviado))) resultado.reservasDeEnvio++;
    });
    resultado.migracao = resumoDoPlano_(planejarMigracao_(tabela));
  }
  console.log(JSON.stringify(resultado));
  registrarManutencaoHabilitacoes_("diagnosticarPlanilha", { linhasComNome: resultado.linhasComNome, pendentes: resultado.pendentes, concluidos: resultado.concluidos });
  return paraPagina_(resultado, "diagnóstico");
}
