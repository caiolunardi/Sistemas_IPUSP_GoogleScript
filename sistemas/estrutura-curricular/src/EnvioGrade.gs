/*=====================================================================
  ENVIO DA GRADE PARA PREENCHIMENTO (1.5.0)

  Botão "Enviar Grade para Preenchimento" (etapa 4, Prévia da grade
  horária). Leva a prévia do semestre escolhido para a planilha que as
  secretarias dos departamentos preenchem.

  Onde ficam as coisas (planilha ID_INDEX: A = Chave, C = ID de Produção;
  nenhum ID no código):
    GRADE_HORARIA_PREENCHIMENTO             planilha das secretarias
    INDEX_GRADE_HORARIA_VERSOES_ANTERIORES  planilha-índice: 1ª aba, A = Semestre
                                            (2027/1), B = ID da cópia de
                                            segurança, C = Auditoria_ID (1.6.0)
    BACKUP_GRADES_ANTERIORES                pasta do Drive das cópias
    AUDITORIA_GRADES_ANTERIORES             pasta das auditorias (1.6.0)

  O que o envio faz, nesta ordem (tudo sob a trava do sistema):
    1. monta, no servidor, as linhas de cada aba a partir dos mesmos dados
       da prévia e confere com o que a pessoa viu (contagens por aba);
    2. confere a planilha das secretarias (6 abas e cabeçalho da linha 3)
       e o semestre no nome atual do arquivo — tudo ANTES de mudar algo;
    3. CÓPIA DE SEGURANÇA: copia o arquivo inteiro para a pasta de backup,
       com o nome atual + "(cópia de dd/mm/aaaa hh:mm)", e registra no
       índice (coluna B da linha do semestre do nome atual; 1.6.0);
       AUDITORIA (1.6.0): cria — ou reaproveita — a planilha de auditoria
       do semestre novo e registra o ID na coluna C (AuditoriaGrade.gs);
    4. apaga o CONTEÚDO de B4:S999 nas 6 abas (formatação, caixas de
       seleção e listas suspensas ficam; colunas T em diante — práticas —
       não são tocadas);
    5. grava a partir da linha 4: C = código, D = nome (+ " – " +
       observações), E = tipo, I = semestre ideal (só o número),
       J = créditos-aula, M = fórmula do horário de fim (L + J horas; 1.6.0);
       apaga as notas da coluna K (avisos de conflito) e a lista suspensa da
       coluna M, que recusaria a fórmula (1.6.1);
    6. renomeia o arquivo: "Grade Horária - 1º semestre de 2027";
    7. anota o envio na auditoria do semestre novo (e "Grade encerrada" na
       do anterior).

  Uma linha por disciplina. Tipo e semestre ideal: os do Psicólogo; se a
  disciplina não está no Psicólogo, os do Bacharelado; depois os da
  Licenciatura (ordem do código da habilitação: 0, 100, 200). Disciplinas
  para outros cursos: E e I em branco. Ordem das linhas: Obrigatórias,
  Eletivas, Livres, sem tipo; dentro de cada uma, semestre ideal e código.
=====================================================================*/

var ENVIO_GRADE = {
  CHAVE_PLANILHA: 'GRADE_HORARIA_PREENCHIMENTO',
  CHAVE_INDICE: 'INDEX_GRADE_HORARIA_VERSOES_ANTERIORES',
  CHAVE_PASTA: 'BACKUP_GRADES_ANTERIORES',
  // Grupo da prévia → aba da planilha das secretarias (mesma ordem da prévia).
  ABAS: [
    { grupo: 'PSA', aba: 'PSA' }, { grupo: 'PSC', aba: 'PSC' }, { grupo: 'PSE', aba: 'PSE' }, { grupo: 'PST', aba: 'PST' },
    { grupo: 'INTER', aba: 'Interdepartamentais' }, { grupo: 'OUTRAS', aba: 'Outras Unidades' }
  ],
  LINHA_CABECALHO: 3,
  LINHA_INICIAL: 4,
  LINHA_FINAL: 999,
  COLUNA_INICIAL: 2,   // B
  COLUNA_FINAL: 19,    // S
  // Colunas gravadas (e conferidas no cabeçalho da linha 3).
  COLUNAS: { codigo: 3, nome: 4, tipo: 5, semestreIdeal: 9, creditosAula: 10, dia: 11, inicio: 12, fim: 13 },
  CABECALHO: { 3: 'Código', 4: 'Nome', 5: 'Tipo', 9: 'Semestre Ideal', 10: 'Créditos Aula' }
};

var ROTULO_TIPO_GRADE = { OBRIGATORIA: 'Obrigatória', OPTATIVA_ELETIVA: 'Eletiva', OPTATIVA_LIVRE: 'Livre' };
var ORDEM_TIPO_GRADE = { 'Obrigatória': 0, 'Eletiva': 1, 'Livre': 2, '': 3 };

/*---------------------------------------------------------------------
  (1.8.12) Conteúdo do envio e sua identificação
  -------------------------------------------------------------------
  O que vai para a planilha das secretarias é montado UMA vez por
  valoresDoEnvio_ (a partir de linhasDaGrade_: seleção, agrupamento pelo
  código em uso, uma linha por disciplina, oferta principal Psicólogo →
  Bacharelado → Licenciatura, oferecimento efetivo, ordem tipo/semestre
  ideal/código) — exatamente os valores que serão gravados: C/D/E =
  código, nome com observações (" – "), tipo; I/J = semestre ideal,
  créditos-aula ('' = célula vazia; 0 continua 0). textoSeguro_ é aplicado
  aqui, antes da assinatura, e os mesmos valores são escritos.
  conteudoCanonicoDoEnvio_ serializa esses valores numa lista JSON (só
  listas: ordem fixa, aspas e quebras de linha escapadas, sem ambiguidade
  de concatenação) com a versão do formato, o ano e o semestre de destino
  e os 6 grupos na ordem de ENVIO_GRADE.ABAS (grupos vazios incluídos).
  assinaturaDoEnvio_ = SHA-256 (hashTexto_) desse texto.
  Fluxo: previaEnvioGrade devolve linhas + contagens + assinatura (a
  pessoa confere ESSAS linhas); enviarGradeParaPreenchimento exige a
  assinatura, recalcula sob a trava e só prossegue se for igual — com os
  MESMOS valores calculados para a comparação.
  Não entram: filtros, seleção de caixas, e-mails, datas, campos não
  enviados, disciplinas fora da grade deste semestre.
---------------------------------------------------------------------*/
var FORMATO_CONTEUDO_ENVIO = 'grade-horaria-envio/1';

/** Semestre e ano do pedido, validados (DADOS_INVALIDOS amigável). */
function alvoDoEnvio_(pedido) {
  var semestre = pedido.semestre === '1' || pedido.semestre === '2' ? pedido.semestre : null;
  var ano = Number(pedido.ano);
  if (!semestre || !(ano >= 2000 && ano <= 2100 && Math.floor(ano) === ano)) throw erroAmigavel_('DADOS_INVALIDOS', 'Escolha o semestre e o ano da grade.');
  return { semestre: semestre, ano: ano };
}
/** grupo → [{ cde: [código, nome com observações, tipo], ij: [semestre ideal, créditos-aula] }] — os valores gravados. */
function valoresDoEnvio_(grupos) {
  var v = {};
  ENVIO_GRADE.ABAS.forEach(function (a) {
    v[a.grupo] = grupos[a.grupo].map(function (l) {
      return {
        cde: [textoSeguro_(l.codigo), textoSeguro_(l.nomeCompleto), l.tipo],
        ij: [l.semestreIdeal === null ? '' : l.semestreIdeal, l.creditosAula === null ? '' : l.creditosAula]
      };
    });
  });
  return v;
}
function conteudoCanonicoDoEnvio_(semestre, ano, valores) {
  return JSON.stringify([FORMATO_CONTEUDO_ENVIO, ano, semestre, ENVIO_GRADE.ABAS.map(function (a) {
    return [a.grupo, valores[a.grupo].map(function (x) { return x.cde.concat(x.ij); })];
  })]);
}
function assinaturaDoEnvio_(semestre, ano, valores) { return hashTexto_(conteudoCanonicoDoEnvio_(semestre, ano, valores)); }

/**
 * PÚBLICA (1.8.12). Prévia do envio para conferência: as linhas que SERIAM
 * gravadas agora (mesma montagem do envio), as contagens e a assinatura
 * desse conteúdo para o ano/semestre pedidos. Só lê (sob a trava, depois
 * de concluir um salvamento ou ação em lote pendente, como qualquer
 * pedido da preparação — recuperado/recuperadoLote vêm junto).
 * @param {Object} pedido { semestre: '1' | '2', ano: número }
 * @return {{ok, dados: {semestre, ano, grade, nomeNovo, grupos: {PSA: [{codigo, nome, tipo, semestreIdeal, creditosAula}], …}, contagens, total, assinatura}}}
 */
function previaEnvioGrade(pedido) {
  return executarPreparacao_('previaEnvioGrade', function (ss) {
    var alvo = alvoDoEnvio_(pedido && typeof pedido === 'object' ? pedido : {});
    var grupos = linhasDaGrade_(contextoPreparacao_(ss), alvo.semestre);
    var valores = valoresDoEnvio_(grupos);
    var saida = {}, contagens = {}, total = 0;
    ENVIO_GRADE.ABAS.forEach(function (a) {
      saida[a.grupo] = grupos[a.grupo].map(function (l) {
        return { codigo: l.codigo, nome: l.nomeCompleto, tipo: l.tipo, semestreIdeal: l.semestreIdeal, creditosAula: l.creditosAula };
      });
      contagens[a.grupo] = grupos[a.grupo].length;
      total += grupos[a.grupo].length;
    });
    return {
      semestre: alvo.semestre, ano: alvo.ano, grade: alvo.ano + '/' + alvo.semestre,
      nomeNovo: 'Grade Horária - ' + alvo.semestre + 'º semestre de ' + alvo.ano,
      grupos: saida, contagens: contagens, total: total,
      assinatura: assinaturaDoEnvio_(alvo.semestre, alvo.ano, valores)
    };
  });
}

/**
 * PÚBLICA (1.5.0). "Enviar Grade para Preenchimento".
 * @param {Object} pedido {
 *   semestre: '1' | '2',          semestre da grade (prévia)
 *   ano: número (ex.: 2027),
 *   assinatura: texto (1.8.12, OBRIGATÓRIA) — a de previaEnvioGrade para
 *             este ano/semestre, guardada quando a pessoa conferiu as
 *             linhas; ausente/malformada → PREVIA_INVALIDA; diferente da
 *             do conteúdo atual → PREVIA_DESATUALIZADA (antes de qualquer
 *             cópia, índice, auditoria ou escrita na grade)
 *   esperado: { PSA: n, … } (opcional desde a 1.8.12) contagens da prévia,
 *             conferidas além da assinatura; NUNCA a substituem
 * }
 * @return {{ok, dados: {grade, nomeNovo, nomeAnterior, contagens, total,
 *           backup: {nome, url, semestre}}}}
 */
function enviarGradeParaPreenchimento(pedido) {
  // (1.8.11) trava = o Lock que executarPreparacao_ adquiriu; continua dele até o fim do envio.
  return executarPreparacao_('enviarGradeParaPreenchimento', function (ss, usuario, trava) {
    pedido = pedido && typeof pedido === 'object' ? pedido : {};
    var alvo = alvoDoEnvio_(pedido);
    var semestre = alvo.semestre, ano = alvo.ano;
    // (1.8.12) A confirmação precisa identificar o conteúdo conferido (previaEnvioGrade).
    // Pedido sem assinatura (inclusive o antigo, só com contagens) não envia.
    if (typeof pedido.assinatura !== 'string' || !/^[0-9a-f]{64}$/.test(pedido.assinatura)) {
      throw erroAmigavel_('PREVIA_INVALIDA', 'Antes de enviar, confira a prévia do envio: feche esta janela e clique de novo em "Enviar Grade para Preenchimento". A grade não foi enviada.');
    }

    // 1. Linhas de cada aba, montadas aqui (não confiamos na lista da página), e os valores
    // que serão gravados — os mesmos usados na assinatura (1.8.12).
    var grupos = linhasDaGrade_(contextoPreparacao_(ss), semestre);
    var valores = valoresDoEnvio_(grupos);
    var contagens = {}, total = 0;
    ENVIO_GRADE.ABAS.forEach(function (a) { contagens[a.grupo] = grupos[a.grupo].length; total += grupos[a.grupo].length; });
    var esperado = pedido.esperado && typeof pedido.esperado === 'object' ? pedido.esperado : null;
    if (pedido.assinatura !== assinaturaDoEnvio_(semestre, ano, valores) ||
        (esperado && ENVIO_GRADE.ABAS.some(function (a) { return Number(esperado[a.grupo]) !== contagens[a.grupo]; }))) {
      throw erroAmigavel_('PREVIA_DESATUALIZADA', 'A grade mudou depois da prévia que você conferiu (disciplinas, nomes, observações, tipos, semestres ideais ou créditos). Confira a prévia de novo e envie. A grade não foi enviada.');
    }
    if (!total) throw erroAmigavel_('GRADE_VAZIA', 'Não há disciplinas na grade do ' + semestre + 'º semestre. Nada foi alterado.');
    var capacidade = ENVIO_GRADE.LINHA_FINAL - ENVIO_GRADE.LINHA_INICIAL + 1;
    ENVIO_GRADE.ABAS.forEach(function (a) {
      if (grupos[a.grupo].length > capacidade) throw erroAmigavel_('GRADE_GRANDE_DEMAIS', 'A aba ' + a.aba + ' teria ' + grupos[a.grupo].length + ' disciplinas; o limite é ' + capacidade + '. Nada foi alterado.');
    });

    // 2. Planilha das secretarias, índice e pasta — conferidos antes de mudar algo.
    var grade = abrirPorChave_(ENVIO_GRADE.CHAVE_PLANILHA, 'planilha', 'a planilha da grade horária');
    var abas = conferirPlanilhaDaGrade_(grade);
    var indice = abrirPorChave_(ENVIO_GRADE.CHAVE_INDICE, 'planilha', 'a planilha-índice das grades anteriores');
    var abaIndice = indice.getSheets()[0];
    if (!abaIndice) throw erroAmigavel_('CONFIGURACAO', 'A planilha-índice das grades anteriores não tem nenhuma aba. Nada foi alterado.');
    conferirIndiceDasGrades_(abaIndice);
    var pasta = abrirPorChave_(ENVIO_GRADE.CHAVE_PASTA, 'pasta', 'a pasta das cópias de segurança');
    var pastaAuditoria = abrirPorChave_(AUDITORIA.CHAVE_PASTA, 'pasta', 'a pasta das auditorias');
    var semestreNovo = ano + '/' + semestre;
    // Auditoria que já existe para o semestre novo: precisa abrir (senão, recusa aqui, antes da cópia).
    var audExistente = auditoriaDoSemestre_(abaIndice, semestreNovo, pastaAuditoria, false);
    var nomeAnterior = grade.getName();
    var semestreAnterior = semestreDoNomeDaGrade_(nomeAnterior);
    if (!semestreAnterior) {
      throw erroAmigavel_('NOME_SEM_SEMESTRE', 'O nome atual da planilha da grade ("' + nomeAnterior + '") não diz de que semestre ela é, e a cópia de segurança precisa disso. Renomeie no Drive para o formato "Grade Horária - 1º semestre de AAAA" e envie de novo. Nada foi alterado.');
    }

    // 3. Cópia de segurança + linha no índice.
    var agora = new Date();
    var nomeCopia = nomeAnterior + ' (cópia de ' + Utilities.formatDate(agora, FUSO_HORARIO, 'dd/MM/yyyy HH:mm') + ')';
    var copia;
    try {
      copia = DriveApp.getFileById(grade.getId()).makeCopy(nomeCopia, pasta);
    } catch (e) {
      console.error('enviarGradeParaPreenchimento: cópia falhou: ' + (e && e.message));
      throw erroAmigavel_('BACKUP_FALHOU', 'Não foi possível fazer a cópia de segurança da planilha da grade. Nada foi apagado nem gravado. Confira se a conta que executa o sistema pode editar a pasta das cópias e tente de novo.');
    }
    try {
      // 1.6.0: coluna B da linha do semestre (a que a auditoria criou) ou linha nova.
      registrarBackupNoIndice_(abaIndice, semestreAnterior, copia.getId());
    } catch (e) {
      console.error('enviarGradeParaPreenchimento: índice falhou: ' + (e && e.message));
      throw erroAmigavel_('BACKUP_FALHOU', 'A cópia de segurança foi feita ("' + nomeCopia + '", na pasta das cópias), mas não foi possível registrá-la na planilha-índice das grades anteriores. Nada foi apagado nem gravado na planilha da grade. Tente de novo (uma nova cópia será feita).');
    }

    // 3b (1.6.0). Auditoria do semestre novo: reaproveita a do índice ou cria uma na pasta das auditorias.
    var aud = audExistente;
    try {
      if (!aud.ss) aud = auditoriaDoSemestre_(abaIndice, semestreNovo, pastaAuditoria, true);
    } catch (e) {
      if (e && e.amigavel) throw e;
      console.error('enviarGradeParaPreenchimento: auditoria falhou: ' + String(e && e.message).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
      throw erroAmigavel_('AUDITORIA_FALHOU', 'A cópia de segurança foi feita e registrada ("' + nomeCopia + '"), mas não foi possível criar a planilha de auditoria de ' + semestreNovo + ' na pasta das auditorias. Nada foi apagado nem gravado na planilha da grade. Confira o acesso à pasta e tente de novo (uma nova cópia será feita).');
    }

    // 4–6. Apaga, grava e renomeia.
    // 1.6.3: separador dos argumentos das fórmulas conforme a localidade da planilha
    // (pt_BR usa ";"; a fórmula com "," dava "Erro de análise de fórmula").
    var sep = separadorDaPlanilha_(grade);
    var nomeNovo = 'Grade Horária - ' + semestre + 'º semestre de ' + ano;
    try {
      ENVIO_GRADE.ABAS.forEach(function (a) {
        var aba = abas[a.grupo];
        var ultima = Math.min(ENVIO_GRADE.LINHA_FINAL, aba.getMaxRows());
        if (ultima >= ENVIO_GRADE.LINHA_INICIAL) {
          aba.getRange(ENVIO_GRADE.LINHA_INICIAL, ENVIO_GRADE.COLUNA_INICIAL, ultima - ENVIO_GRADE.LINHA_INICIAL + 1, ENVIO_GRADE.COLUNA_FINAL - ENVIO_GRADE.COLUNA_INICIAL + 1).clearContent();
          // 1.6.0: avisos de conflito de horário (notas na coluna K) do semestre anterior
          aba.getRange(ENVIO_GRADE.LINHA_INICIAL, ENVIO_GRADE.COLUNAS.dia, ultima - ENVIO_GRADE.LINHA_INICIAL + 1, 1).clearNote();
          // 1.6.1: a coluna M (Horário de Fim) vira fórmula; a lista suspensa antiga dela
          // recusava a fórmula ("viola as regras de validação") e o envio parava no meio.
          // 1.6.2: numa Tabela com coluna tipada isso pode ser recusado; sem lista, não importa.
          try {
            aba.getRange(ENVIO_GRADE.LINHA_INICIAL, ENVIO_GRADE.COLUNAS.fim, ultima - ENVIO_GRADE.LINHA_INICIAL + 1, 1).clearDataValidations();
          } catch (e) {
            console.warn('enviarGradeParaPreenchimento: validação da coluna M não retirada em ' + a.aba + ': ' + String(e && e.message).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
          }
        }
      });
      ENVIO_GRADE.ABAS.forEach(function (a) {
        var linhas = valores[a.grupo];   // (1.8.12) os mesmos valores conferidos pela assinatura
        if (!linhas.length) return;
        var aba = abas[a.grupo];
        var precisa = ENVIO_GRADE.LINHA_INICIAL + linhas.length - 1;
        if (precisa > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), precisa - aba.getMaxRows());
        var C = ENVIO_GRADE.COLUNAS;
        aba.getRange(ENVIO_GRADE.LINHA_INICIAL, C.codigo, linhas.length, 3).setValues(linhas.map(function (l) { return l.cde; }));
        aba.getRange(ENVIO_GRADE.LINHA_INICIAL, C.semestreIdeal, linhas.length, 2).setValues(linhas.map(function (l) { return l.ij; }));
        // 1.6.0: Horário de Fim (M) calculado = Horário de Início (L) + créditos-aula (J) horas.
        // 1.6.2: sem setNumberFormat — a planilha usa Tabela com colunas tipadas, e o Sheets
        // recusa mudar o formato de uma coluna com tipo. A fórmula já devolve o texto "HH:mm".
      });
      gravarFormulasDoFim_(abas, grupos, sep);
      grade.rename(nomeNovo);
      SpreadsheetApp.flush();
    } catch (e) {
      if (e && e.amigavel) throw e;
      var detalhe = String(e && e.message || e).replace(/[A-Za-z0-9_-]{25,}/g, '[…]').slice(0, 300);
      console.error('enviarGradeParaPreenchimento: gravação falhou: ' + detalhe);
      throw erroAmigavel_('ENVIO_INCOMPLETO', 'O envio parou no meio: a planilha da grade pode ter ficado incompleta. A cópia de segurança de antes do envio está na pasta das cópias ("' + nomeCopia + '"). Clique em "Enviar Grade para Preenchimento" de novo para refazer o envio. Detalhe técnico: ' + detalhe);
    }

    // 7 (1.6.0). Eventos do sistema nas auditorias (não impedem o envio).
    var avisos = [];
    var resumo = ENVIO_GRADE.ABAS.map(function (a) { return a.aba + ' ' + contagens[a.grupo]; }).join(', ');
    try {
      // (1.8.11) Sob a trava do envio (não a libera): a conferência das fórmulas abaixo continua protegida.
      gravarNaAuditoriaSobTrava_(aud.ss, [linhaDeEventoDoSistema_(semestreNovo, usuario.email, 'Envio da grade',
        'B4:S999 das 6 abas apagado e regravado com ' + total + ' disciplinas (' + resumo + '); arquivo renomeado para "' + nomeNovo + '". Cópia de segurança antes do envio: "' + nomeCopia + '".')], trava);
      if (semestreAnterior !== semestreNovo) {
        var audAnterior = auditoriaDoSemestre_(abaIndice, semestreAnterior, pastaAuditoria, false).ss;
        if (audAnterior) gravarNaAuditoriaSobTrava_(audAnterior, [linhaDeEventoDoSistema_(semestreAnterior, usuario.email, 'Grade encerrada', 'Cópia de segurança: "' + nomeCopia + '". A planilha passou a ser a grade de ' + semestreNovo + '.')], trava);
      }
    } catch (e) {
      console.error('enviarGradeParaPreenchimento: evento na auditoria falhou: ' + String(e && e.message).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
      avisos.push('O envio foi concluído, mas a linha do envio não pôde ser anotada na planilha de auditoria.');
    }
    // 1.6.2: confere se a fórmula do Horário de Fim (M) calculou sem erro.
    // 1.6.3: se calculou com erro, tenta uma vez o outro separador (";" ↔ ",") e fica com o que funcionar.
    try {
      var comErro = celulasDoFimComErro_(abas, grupos);
      if (comErro.total) {
        var outro = sep === ';' ? ',' : ';';
        gravarFormulasDoFim_(abas, grupos, outro);
        var comOutro = celulasDoFimComErro_(abas, grupos);
        console.log('enviarGradeParaPreenchimento: Horário de Fim com "' + sep + '": ' + comErro.total + ' erro(s); com "' + outro + '": ' + comOutro.total);
        if (comOutro.total < comErro.total) { sep = outro; comErro = comOutro; }
        else gravarFormulasDoFim_(abas, grupos, sep);
      }
      if (comErro.total) {
        console.warn('enviarGradeParaPreenchimento: Horário de Fim com erro em ' + comErro.total + ' linha(s): ' + comErro.exemplos.join(', '));
        avisos.push('A coluna Horário de Fim (M) mostra erro em ' + comErro.total + ' linha(s) (' + comErro.exemplos.join(', ') + (comErro.total > comErro.exemplos.length ? ', …' : '') + '). O resto do envio foi gravado. Passe o mouse sobre uma dessas células para ver a mensagem do Google.');
      }
    } catch (e) {
      console.warn('enviarGradeParaPreenchimento: conferência da coluna M falhou: ' + String(e && e.message).replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
    }
    var ativa = false;
    try { ativa = auditoriaAtiva_(grade.getId()); } catch (e) { ativa = false; }
    if (!ativa) avisos.push('O registro das edições e das aberturas da planilha das secretarias não está completo: no editor do Apps Script, com a conta que implantou o Web App, execute ativarAuditoriaGrade (menu Executar) e aceite as permissões.');

    console.log('enviarGradeParaPreenchimento: grade ' + semestreNovo + ', ' + total + ' disciplinas; cópia de ' + semestreAnterior + ' registrada' + (aud.criada ? '; auditoria criada' : ''));
    return {
      grade: semestreNovo, nomeNovo: nomeNovo, nomeAnterior: nomeAnterior,
      contagens: contagens, total: total,
      backup: { nome: nomeCopia, url: copia.getUrl(), semestre: semestreAnterior },
      // (1.8.14) Sem o endereço da planilha de auditoria: ela é consultada pelo painel
      // ("Auditoria da grade"), decisão da 1.8.0. O ID continua só no índice (coluna C).
      auditoria: { nome: aud.ss.getName(), criada: aud.criada, registroAtivo: ativa },
      avisos: avisos
    };
  });
}

/**
 * (1.6.0; 1.6.2) Fórmula do Horário de Fim da linha r: início (L) +
 * créditos-aula (J) horas, devolvida como TEXTO "HH:mm" (a coluna M da
 * Tabela é do tipo texto, e a conta não depende do formato da célula).
 * O início pode estar como hora (número) ou como texto "08:00" (lista
 * suspensa da Tabela). Texto que não é hora em L ("-- : --", "Não será
 * oferecida") é repetido; sem início, ou sem créditos, fica vazio.
 * Nomes e separadores em inglês: é assim que o Apps Script grava
 * fórmulas, em qualquer idioma da planilha.
 */
function formulaDoFim_(r, sep) {
  var L = 'L' + r, J = 'J' + r;
  var inicio = 'IF(ISNUMBER(' + L + '),' + L + ',TIMEVALUE(' + L + '))';
  var f = '=IF(' + L + '="","",IF(ISERROR(' + inicio + '),' + L + ',IF(' + J + '="","",TEXT(' + inicio + '+' + J + '/24,"HH:mm"))))';
  // (1.6.3) Nenhum texto entre aspas da fórmula tem vírgula: trocar todas é seguro.
  return sep === ';' ? f.replace(/,/g, ';') : f;
}

/**
 * (1.6.3) Separador dos argumentos nas fórmulas gravadas pelo script.
 * O Sheets lê a fórmula com as regras da localidade da planilha
 * (Arquivo › Configurações › Localidade): onde a vírgula é o separador
 * decimal (Brasil e boa parte da Europa), os argumentos vão com ";".
 * Se a leitura da localidade falhar, ";" (a planilha é do Brasil); o
 * envio confere o resultado e, se der erro, tenta o outro separador.
 */
function separadorDaPlanilha_(ss) {
  var local = '';
  try { local = String(ss.getSpreadsheetLocale() || ''); } catch (e) { return ';'; }
  if (!local) return ';';
  return /^(pt|es|fr|de|it|nl|ru|pl|tr|sv|da|fi|nb|nn|no|cs|sk|hu|ro|bg|el|uk|hr|sl|sr|lt|lv|et|id|vi|ca|gl|eu|is|az|kk|be)(_|-|$)/i.test(local) ? ';' : ',';
}

/** (1.6.3) Grava a fórmula do Horário de Fim (M) nas linhas de cada aba. */
function gravarFormulasDoFim_(abas, grupos, sep) {
  ENVIO_GRADE.ABAS.forEach(function (a) {
    var linhas = grupos[a.grupo];
    if (!linhas.length) return;
    abas[a.grupo].getRange(ENVIO_GRADE.LINHA_INICIAL, ENVIO_GRADE.COLUNAS.fim, linhas.length, 1)
      .setFormulas(linhas.map(function (l, i) { return [formulaDoFim_(ENVIO_GRADE.LINHA_INICIAL + i, sep)]; }));
  });
}

/**
 * (1.6.2) Células da coluna M recém-gravadas que mostram erro do Sheets
 * (#ERROR!, #VALUE!, …). Devolve { total, exemplos: ['PSA linha 4', …] }
 * (até 5 exemplos).
 */
function celulasDoFimComErro_(abas, grupos) {
  var erro = /^#(ERROR!|VALUE!|REF!|NAME\?|N\/A|DIV\/0!|NUM!|NULL!)/;
  var total = 0, exemplos = [];
  SpreadsheetApp.flush();
  ENVIO_GRADE.ABAS.forEach(function (a) {
    var n = grupos[a.grupo].length;
    if (!n) return;
    abas[a.grupo].getRange(ENVIO_GRADE.LINHA_INICIAL, ENVIO_GRADE.COLUNAS.fim, n, 1).getDisplayValues().forEach(function (l, i) {
      if (!erro.test(String(l[0]))) return;
      total++;
      if (exemplos.length < 5) exemplos.push(a.aba + ' linha ' + (ENVIO_GRADE.LINHA_INICIAL + i));
    });
  });
  return { total: total, exemplos: exemplos };
}

/**
 * Linhas da grade do semestre ('1' ou '2'), por grupo da prévia
 * (PSA, PSC, PSE, PST, INTER, OUTRAS). Mesma seleção da prévia: marcada
 * "Adicionada à grade horária", não excluída, semestre de oferecimento
 * em vigor igual ao da grade ou "os dois".
 * Cada linha: { codigo, nome, observacoes, nomeCompleto, tipo, semestreIdeal, creditosAula }.
 */
function linhasDaGrade_(ctx, semestre) {
  var grupos = {};
  ENVIO_GRADE.ABAS.forEach(function (a) { grupos[a.grupo] = []; });
  function entra(it, alvo) {
    if (!alvo || alvo.naGrade !== SIM || alvo.excluida === SIM) return false;
    var of = oferecimentoEfetivo_(ctx, it);
    return of === 'ambos' || of === semestre;
  }
  function incluir(l) {
    var obs = String(l.observacoes || '').trim();
    l.nomeCompleto = obs ? l.nome + ' – ' + obs : l.nome;
    grupos[grupoDaGrade_(l.codigo)].push(l);
  }
  Object.keys(ctx.base).forEach(function (chave) {
    var aj = ctx.ajustes[chave];
    if (!entra({ origem: 'estrutura', chave: chave }, aj)) return;
    var base = ctx.base[chave];
    var principal = ofertaPrincipal_(ctx, chave, aj);
    incluir({
      codigo: String(aj.codigo || chave),
      nome: String(aj.nome || base.nome || ''),
      observacoes: base.observacoes || '',
      tipo: principal ? (ROTULO_TIPO_GRADE[principal.tipo] || '') : '',
      semestreIdeal: principal && Number(principal.periodo) ? Number(principal.periodo) : null,
      creditosAula: numeroOuNulo_(aj.creditosAula !== null && aj.creditosAula !== undefined && aj.creditosAula !== '' ? aj.creditosAula : base.creditosAula)
    });
  });
  Object.keys(ctx.outros).forEach(function (chave) {
    var o = ctx.outros[chave];
    if (!entra({ origem: 'outros', chave: chave }, o)) return;
    incluir({
      codigo: String(o.codigo || chave), nome: String(o.nome || ''), observacoes: o.observacoes || '',
      tipo: '', semestreIdeal: null, creditosAula: numeroOuNulo_(o.creditosAula)
    });
  });
  Object.keys(grupos).forEach(function (g) {
    grupos[g].sort(function (x, y) {
      return (ORDEM_TIPO_GRADE[x.tipo] - ORDEM_TIPO_GRADE[y.tipo]) ||
        ((x.semestreIdeal === null ? 99 : x.semestreIdeal) - (y.semestreIdeal === null ? 99 : y.semestreIdeal)) ||
        (x.codigo < y.codigo ? -1 : x.codigo > y.codigo ? 1 : 0);
    });
  });
  return grupos;
}

/**
 * Oferta que dá o tipo e o semestre ideal da linha: a da habilitação de
 * menor código entre os currículos em uso (0 = Psicólogo, 100 =
 * Bacharelado, 200 = Licenciatura). Oferta ajustada no painel substitui
 * a do Júpiter (1.8.9: já resolvida para os currículos em uso). null = a
 * disciplina não está em nenhum currículo em uso.
 */
function ofertaPrincipal_(ctx, chave, aj) {
  // (1.8.9) A mesma oferta EFETIVA da ficha e dos filtros (ofertaEfetiva_, Preparacao.gs):
  // vínculos associados ao currículo sucessor valem; vínculos a revisar não.
  var oferta = ofertaEfetiva_(ctx, chave, aj).vinculos;
  var emUso = oferta.filter(function (o) { return o && ctx.vigentes[o.curriculo] && o.tipo; });
  emUso.sort(function (x, y) { return codigoHabilitacao_(ctx, x.curriculo) - codigoHabilitacao_(ctx, y.curriculo); });
  return emUso[0] || null;
}
function codigoHabilitacao_(ctx, curriculo) {
  var n = parseInt(ctx.habCodigo[curriculo], 10);
  return isNaN(n) ? 1e9 : n;
}

/** Grupo da prévia pelo código em uso (igual a grupoPrevia, em PainelPreparacao). */
function grupoDaGrade_(codigo) {
  var p = String(codigo || '').slice(0, 3).toUpperCase();
  if (p === 'PSA' || p === 'PSC' || p === 'PSE' || p === 'PST') return p;
  if (p === '470') return 'INTER';
  return 'OUTRAS';
}

function numeroOuNulo_(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * "Grade Horária - 1º Semestre de 2026" → "2026/1" (maiúsculas, "º",
 * "°" ou "o" aceitos). null se o nome não diz o semestre.
 */
function semestreDoNomeDaGrade_(nome) {
  var m = String(nome || '').match(/([12])\s*[º°o]?\s*semestre\s+de\s+(\d{4})/i);
  return m ? m[2] + '/' + m[1] : null;
}

/** Abre pelo ID_INDEX uma planilha (tipo 'planilha') ou pasta do Drive ('pasta'). */
function abrirPorChave_(chave, tipo, descricao) {
  var id = idDoIndex_(chave);
  try {
    return tipo === 'pasta' ? DriveApp.getFolderById(id) : SpreadsheetApp.openById(id);
  } catch (e) {
    // 1.5.1: diz QUAL é o problema. A mensagem técnica vai para o registro
    // de execução sem IDs (sequências longas de letras e números são cortadas).
    var tecnica = String(e && e.message || e);
    console.error('abrirPorChave_ ' + chave + ': ' + tecnica.replace(/[A-Za-z0-9_-]{25,}/g, '[…]'));
    if (/permiss|authoriz|autoriza/i.test(tecnica) && /auth\/drive|DriveApp/i.test(tecnica)) {
      throw erroAmigavel_('AUTORIZACAO_DRIVE', 'O sistema ainda não tem a autorização do Google Drive, que a cópia de segurança exige. Quem implantou o sistema deve abrir o editor do Apps Script, escolher a função diagnosticarEnvioGrade, clicar em Executar e aceitar a permissão do Google Drive. Depois é só enviar de novo. Nada foi alterado.');
    }
    throw erroAmigavel_('CONFIGURACAO', 'Não foi possível abrir ' + descricao + ' (chave ' + chave + ' na planilha ID_INDEX). O ID pode estar certo e a conta que executa o sistema (a que implantou o Web App) não ter acesso: compartilhe com ela, como Editor. Nada foi alterado.');
  }
}

/**
 * Confere a planilha das secretarias: as 6 abas existem e a linha 3 tem
 * os títulos das colunas que o sistema grava. Devolve grupo → aba.
 */
function conferirPlanilhaDaGrade_(grade) {
  var abas = {};
  var faltando = [];
  ENVIO_GRADE.ABAS.forEach(function (a) {
    var aba = grade.getSheetByName(a.aba);
    if (!aba) { faltando.push('aba "' + a.aba + '" não encontrada'); return; }
    abas[a.grupo] = aba;
    if (aba.getMaxColumns() < ENVIO_GRADE.COLUNA_FINAL || aba.getMaxRows() < ENVIO_GRADE.LINHA_CABECALHO) { faltando.push('aba "' + a.aba + '" menor que o esperado'); return; }
    var cab = aba.getRange(ENVIO_GRADE.LINHA_CABECALHO, 1, 1, ENVIO_GRADE.COLUNA_FINAL).getDisplayValues()[0];
    Object.keys(ENVIO_GRADE.CABECALHO).forEach(function (col) {
      var visto = semAcento_(String(cab[col - 1] || '')).replace(/\s+/g, ' ').trim().toLowerCase();
      var esperado = semAcento_(ENVIO_GRADE.CABECALHO[col]).toLowerCase();
      if (visto !== esperado) faltando.push('aba "' + a.aba + '", coluna ' + String.fromCharCode(64 + Number(col)) + '3: esperado "' + ENVIO_GRADE.CABECALHO[col] + '"');
    });
  });
  if (faltando.length) {
    throw erroAmigavel_('PLANILHA_GRADE_FORA_DO_PADRAO', 'A planilha da grade horária não está no formato esperado (' + faltando.slice(0, 3).join('; ') + (faltando.length > 3 ? '; …' : '') + '). Nada foi alterado.');
  }
  return abas;
}

/**
 * Diagnóstico do envio da grade (1.5.0), para rodar no editor do Apps
 * Script (menu Executar) depois de instalar a versão: rodar uma vez
 * também pede a autorização nova do Drive (cópia de segurança). Só LÊ:
 * confere as três chaves do ID_INDEX, abre a planilha das secretarias, o
 * índice e a pasta, confere as 6 abas e o cabeçalho e diz o semestre que
 * o nome atual indica. Não mostra IDs e não muda nada.
 */
function diagnosticarEnvioGrade() {
  var r = executarComSeguranca_('diagnosticarEnvioGrade', function () {
    exigirAdmin_();
    var grade = abrirPorChave_(ENVIO_GRADE.CHAVE_PLANILHA, 'planilha', 'a planilha da grade horária');
    conferirPlanilhaDaGrade_(grade);
    var indice = abrirPorChave_(ENVIO_GRADE.CHAVE_INDICE, 'planilha', 'a planilha-índice das grades anteriores');
    var pasta = abrirPorChave_(ENVIO_GRADE.CHAVE_PASTA, 'pasta', 'a pasta das cópias de segurança');
    return {
      planilhaDaGrade: grade.getName(),
      semestreNoNome: semestreDoNomeDaGrade_(grade.getName()) || '(o nome não indica o semestre: renomeie antes de enviar)',
      abasConferidas: ENVIO_GRADE.ABAS.map(function (a) { return a.aba; }),
      indice: indice.getName() + ' — aba "' + indice.getSheets()[0].getName() + '", ' + Math.max(indice.getSheets()[0].getLastRow() - 1, 0) + ' cópia(s) registrada(s)',
      pastaDasCopias: pasta.getName(),
      pastaDasAuditorias: (function () { try { return abrirPorChave_(AUDITORIA.CHAVE_PASTA, 'pasta', 'a pasta das auditorias').getName(); } catch (e) { return 'NÃO ENCONTRADA: ' + e.message; } })(),
      indiceComAuditoriaId: (function () { try { conferirIndiceDasGrades_(indice.getSheets()[0]); return 'ok'; } catch (e) { return e.message; } })(),
      localidadeDaPlanilha: (function () { try { return grade.getSpreadsheetLocale() + ' (fórmulas com "' + separadorDaPlanilha_(grade) + '")'; } catch (e) { return 'não lida'; } })(),
      registroDeEdicoes: acionadorInstalado_(AUDITORIA.HANDLER, grade.getId()) ? 'ativo' : 'inativo (execute ativarAuditoriaGrade com a conta que implantou o Web App)',
      registroDeAberturas: acionadorInstalado_(AUDITORIA.HANDLER_ABERTURA, grade.getId()) ? 'ativo' : 'inativo (execute ativarAuditoriaGrade com a conta que implantou o Web App)'
    };
  });
  console.log(JSON.stringify(r));
  return r;
}
