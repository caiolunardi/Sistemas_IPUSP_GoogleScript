/*=====================================================================
  CONSULTA — dados que o painel mostra

  obterDadosPainel() é chamada quando o painel abre e depois de cada
  importação. Devolve a base inteira (a estrutura curricular é pequena:
  algumas centenas de disciplinas), para que busca, filtros e ficha da
  disciplina funcionem no navegador sem novas chamadas ao servidor.

  Na primeira vez que um administrador abre o painel, as abas da
  planilha são criadas aqui (ver Esquema.gs).
=====================================================================*/

/** Quantas importações recentes o painel recebe (aba Importações). */
var MAX_IMPORTACOES_PAINEL = 30;
/** Quantas alterações recentes o painel recebe (histórico da ficha). */
var MAX_ALTERACOES_PAINEL = 600;

/**
 * PÚBLICA (google.script.run). Dados completos do painel.
 * Leitores e administradores podem chamar; o e-mail de quem importou
 * só vai para administradores.
 * @return {{ok: boolean, dados: {
 *   usuario: {email: string, papel: string},
 *   versaoSistema: string,
 *   planilhaPreparadaAgora: string[]|null,  // abas criadas nesta chamada
 *   base: {versao: number, curriculos: Object[], disciplinas: Object[],
 *          vinculos: Object[], requisitos: Object[]},
 *   gravacao: {planilhaDesatualizada, abasDivergentes, …},  // ver abaixo
 *   preparacao: {ajustes, outros},  // Preparacao.gs
 *   importacoes: Object[],   // mais recente primeiro
 *   alteracoes: Object[]     // mais recente primeiro
 * }}}  (ou {ok:false, erro, codigo} — ver executarComSeguranca_)
 */
function obterDadosPainel() {
  return executarComSeguranca_('obterDadosPainel', function () {
    var usuario = obterUsuario_();
    var ss = abrirPlanilhaEstrutura_();
    var preparadaAgora = null;
    // "Cadastrar nova grade" interrompido no meio: um administrador termina
    // o recomeço agora (com a trava); leitores esperam.
    if (recomecoPendente_(ss)) {
      if (usuario.papel !== 'admin') throw erroAmigavel_('BASE_NAO_PREPARADA', 'A base da estrutura curricular está sendo recomeçada. Tente de novo em alguns minutos.');
      var travaR = LockService.getScriptLock();
      if (!travaR.tryLock(10000)) throw erroAmigavel_('OCUPADO', 'Outra gravação está em andamento. Aguarde alguns segundos e tente de novo.');
      try { if (recomecoPendente_(ss)) recomecarPlanilha_(ss); } finally { travaR.releaseLock(); }
    }
    if (!estruturaPronta_(ss) || abasComColunasFaltando_(ss).length) {
      if (usuario.papel !== 'admin') {
        throw erroAmigavel_('BASE_NAO_PREPARADA', 'A base da estrutura curricular ainda não foi preparada. Peça à equipe responsável para abrir este painel uma vez.');
      }
      preparadaAgora = garantirEstrutura_(ss);
    }
    var ehAdmin = usuario.papel === 'admin';
    // Administrador: se uma gravação ficou interrompida OU se as abas
    // visíveis não conferem com o manifesto (arrumação pendente depois de
    // uma importação concluída), faz a recuperação agora — só se a trava
    // estiver livre; senão, o painel avisa e ela fica para a próxima vez.
    // Uma falha na recuperação não impede o painel de abrir: vira aviso.
    var recuperacao = null, recuperacaoAdiada = false, recuperacaoFalhou = false;
    if (ehAdmin && precisaRecuperar_(ss)) {
      var trava = LockService.getScriptLock();
      if (trava.tryLock(5000)) {
        try { recuperacao = recuperarGravacao_(ss); }
        catch (e) {
          recuperacaoFalhou = true;
          console.error('obterDadosPainel: recuperação falhou: ' + (e && e.message ? e.message : e));
        } finally { trava.releaseLock(); }
      } else {
        recuperacaoAdiada = true;
      }
    }
    // (1.8.5) Salvamento de disciplina interrompido: um administrador o
    // conclui agora (com a trava livre); senão, o painel mostra a pendência.
    // Leitores só ficam sabendo que há um salvamento em andamento.
    var salvamento = null;
    if (lerMetadado_(ss, META_SALVAMENTO)) {
      if (ehAdmin) {
        var travaS = LockService.getScriptLock();
        if (travaS.tryLock(5000)) {
          var rs;
          try { rs = resolverSalvamentoPendente_(ss); } finally { travaS.releaseLock(); }
          if (rs.estado !== 'nenhum') { salvamento = resumoSalvamento_(rs); salvamento.mensagem = rs.estado === 'concluido' ? '' : mensagemSalvamento_(rs); }
        } else {
          salvamento = { estado: 'adiado', mensagem: 'Há um salvamento de disciplina pendente e outra gravação está em andamento agora. Recarregue o painel em alguns instantes.' };
        }
      } else {
        salvamento = { estado: 'pendente' };
      }
    }
    // (1.8.7) Ação em lote interrompida: mesma regra (registro nas Propriedades do script).
    var lote = null;
    var temLote;
    try { temLote = !!PropertiesService.getScriptProperties().getProperty(PROP_LOTE); } catch (e) { temLote = true; }
    if (temLote) {
      if (ehAdmin) {
        var travaL = LockService.getScriptLock();
        if (travaL.tryLock(5000)) {
          var rl;
          try { rl = resolverLotePendente_(ss); } finally { travaL.releaseLock(); }
          if (rl.estado !== 'nenhum') { lote = resumoLote_(rl); lote.mensagem = rl.estado === 'concluido' ? '' : mensagemLote_(rl); }
        } else {
          lote = { tipo: 'lote', estado: 'adiado', mensagem: 'Há uma ação em lote pendente e outra gravação está em andamento agora. Recarregue o painel em alguns instantes.' };
        }
      } else {
        lote = { tipo: 'lote', estado: 'pendente' };
      }
    }
    // Tudo o que o painel mostra sai do MESMO manifesto: dados, versão e
    // histórico correspondem sempre à mesma importação concluída. Se outra
    // importação terminar no meio desta leitura, ela é repetida com o
    // manifesto novo (lerVersaoConsistente_, Gravacao.gs).
    var leitura = lerVersaoConsistente_(ss, function (m) {
      var confirmadas = idsConfirmados_(m);
      var base = lerBase_(ss, m);
      // Linhas de histórico de tentativas não concluídas são ignoradas.
      var soConfirmadas = function (l) { return l.id ? confirmadas[l.id] : confirmadas[l.importacao]; };
      return {
        base: base,
        gravacao: situacaoGravacao_(ss, m),
        importacoes: lerUltimasLinhas_(ss, ABAS.IMPORTACOES, MAX_IMPORTACOES_PAINEL + 20).filter(soConfirmadas).slice(-MAX_IMPORTACOES_PAINEL).reverse(),
        alteracoes: lerUltimasLinhas_(ss, ABAS.ALTERACOES, MAX_ALTERACOES_PAINEL + 3000).filter(soConfirmadas).slice(-MAX_ALTERACOES_PAINEL).reverse()
      };
    });
    var m = leitura.manifesto;
    var base = leitura.base;
    var gravacao = leitura.gravacao;

    var curriculos = Object.keys(base.curriculos).map(function (k) {
      var c = base.curriculos[k];
      return {
        curriculo: k,
        habilitacaoCodigo: c.habilitacaoCodigo || String(parseInt(k.slice(5, 9), 10)),
        habilitacao: c.habilitacao || '',
        curso: c.curso || '',
        cadastradoEm: c.cadastradoEm || '',
        situacaoJupiter: c.situacaoJupiter || '',
        vigente: /^sim/i.test(String(c.vigente || '')),
        vigenteTexto: c.vigente || '',
        disciplinas: c.disciplinas, obrigatorias: c.obrigatorias, eletivas: c.eletivas, livres: c.livres, requisitos: c.requisitos,
        aacHoras: c.aacHoras, aacPercentual: c.aacPercentual,
        info: {
          dataAtivacao: c.dataAtivacao, dataDesativacao: c.dataDesativacao,
          duracaoIdeal: c.duracaoIdeal, duracaoMinima: c.duracaoMinima, duracaoMaxima: c.duracaoMaxima,
          chAulaObrigatoria: c.chAulaObrigatoria, chTrabalhoObrigatoria: c.chTrabalhoObrigatoria, chObrigatoria: c.chObrigatoria,
          chAulaEletiva: c.chAulaEletiva, chTrabalhoEletiva: c.chTrabalhoEletiva, chEletiva: c.chEletiva,
          chAulaLivre: c.chAulaLivre, chTrabalhoLivre: c.chTrabalhoLivre, chLivre: c.chLivre,
          chDisciplinas: c.chDisciplinas, estagio: c.estagio, aexApolo: c.aexApolo, extensaoOptativas: c.extensaoOptativas,
          chDisciplinasMaisAac: c.chDisciplinasMaisAac, extensaoTotal: c.extensaoTotal, extensaoPercentual: c.extensaoPercentual,
          totalGeral: c.totalGeral, informacoesEspecificas: c.informacoesEspecificas || ''
        },
        atualizadoEm: c.atualizadoEm ? formatarDataHora_(c.atualizadoEm) : '',
        infoPdfEm: c.infoPdfEm ? formatarDataHora_(c.infoPdfEm) : ''
      };
    });

    var disciplinas = Object.keys(base.disciplinas).sort().map(function (k) {
      var d = base.disciplinas[k];
      return {
        codigo: k, nome: d.nome || '', departamento: d.departamento || departamentoDe_(k), prefixo: d.prefixo || k.slice(0, 3),
        creditosAula: d.creditosAula, creditosTrabalho: d.creditosTrabalho, creditosTotal: d.creditosTotal,
        ch: d.ch, ce: d.ce, cp: d.cp, ext: d.ext, atpa: d.atpa,
        versao: d.versao, versaoOrigem: d.versaoOrigem || '',
        situacao: d.situacao || '', habilitacoesTexto: d.habilitacoes || '', ofertaTexto: d.oferta || '',
        incluidaEm: d.incluidaEm ? formatarDataHora_(d.incluidaEm) : '',
        alteradaEm: d.alteradaEm ? formatarDataHora_(d.alteradaEm) : '',
        complementoPdfEm: d.complementoPdfEm ? formatarDataHora_(d.complementoPdfEm) : '',
        observacoes: d.observacoes || ''
      };
    });

    var vinculos = base.vinculos.map(function (v) {
      return { curriculo: v.curriculo, codigo: v.codigo, tipo: v.tipo, periodoIdeal: v.periodoIdeal };
    });
    var requisitos = base.requisitos.map(function (r) {
      return { curriculo: r.curriculo, codigo: r.codigo, requisito: r.requisito, versaoRequisito: r.versaoRequisito, nomeRequisito: r.nomeRequisito || '', tipoRequisito: r.tipoRequisito || 'Requisito', grupo: r.grupo };
    });

    var importacoes = leitura.importacoes.map(function (i) {
      return {
        id: i.id, dataHora: i.dataHora ? formatarDataHora_(i.dataHora) : '', usuario: ehAdmin ? (i.usuario || '') : '',
        arquivo: i.arquivo || '', formato: i.formato || '', leitura: i.leitura || '', modo: i.modo || '',
        curriculos: i.curriculos || '', disciplinas: i.disciplinas, novas: i.novas, alteradas: i.alteradas,
        sairam: i.sairam, voltaram: i.voltaram, ofertasAlteradas: i.ofertasAlteradas, resumo: i.resumo || ''
      };
    });
    var alteracoes = leitura.alteracoes.map(function (a) {
      return {
        importacao: a.importacao || '', dataHora: a.dataHora ? formatarDataHora_(a.dataHora) : '', codigo: a.codigo || '',
        nome: a.nome || '', tipo: a.tipo || '', habilitacao: a.habilitacao || '', campo: a.campo || '', antes: a.antes || '', depois: a.depois || ''
      };
    });

    return {
      usuario: { email: usuario.email, papel: usuario.papel },
      versaoSistema: VERSAO_SISTEMA,
      planilhaPreparadaAgora: preparadaAgora ? preparadaAgora.criadas : null,
      // Situação da gravação. planilhaDesatualizada vai para TODOS: enquanto
      // as abas visíveis não forem as da versão em uso, o painel avisa.
      gravacao: ehAdmin ? {
        interrompida: gravacao.interrompida,
        arrumacaoPendente: gravacao.arrumacaoPendente,
        planilhaDesatualizada: gravacao.planilhaDesatualizada,
        abasDivergentes: gravacao.abasDivergentes,
        recuperada: !!(recuperacao && recuperacao.descartada),
        arrumadaAgora: !!(recuperacao && recuperacao.arrumada),
        recuperacaoAdiada: recuperacaoAdiada,
        recuperacaoFalhou: recuperacaoFalhou || !!(recuperacao && recuperacao.pendencias.length)
      } : { planilhaDesatualizada: gravacao.planilhaDesatualizada, abasDivergentes: gravacao.abasDivergentes },
      base: { versao: base.versao, importacao: m ? m.importacao : null, curriculos: curriculos, disciplinas: disciplinas, vinculos: vinculos, requisitos: requisitos },
      importacoes: importacoes,
      alteracoes: alteracoes,
      // Preparação da grade (Preparacao.gs): ajustes manuais sobre a
      // estrutura (todos, para mostrar "Júpiter + ajustes") e, só para
      // administradores, as disciplinas para outros cursos.
      preparacao: preparacaoParaCliente_(ss, ehAdmin, base.curriculos),   // (1.8.9) oferta efetiva com os currículos desta mesma leitura
      // (1.8.5) null = nenhum; { estado: 'concluido' } = concluído agora; senão, pendente.
      salvamentoPendente: salvamento,
      // (1.8.7) idem para uma ação em lote (excluir/restaurar, adicionar/remover da grade).
      lotePendente: lote
    };
  });
}
