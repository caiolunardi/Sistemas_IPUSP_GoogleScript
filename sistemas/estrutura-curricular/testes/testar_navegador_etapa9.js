// (1.8.14) Etapa 9 / A9 na interface real (Chromium) com o servidor real no
// simulador: o RESULTADO do envio mostra a auditoria só como TEXTO (nome e
// situação), sem link nem endereço da planilha de auditoria; a cópia de segurança
// continua com o link https. O handler real (confirmarEnvioGrade) monta o
// resultado: com a resposta REAL do servidor (20a, 20b) ou com uma resposta
// FORJADA pelo portão do transporte (20c resposta antiga com auditoria.url; 20d
// nome com HTML; 20e endereço de cópia não https) — contrato do callback, sem
// trocar a implementação. Estrutura curricular SINTÉTICA (curso 47012).
// Uso: node testar_navegador_etapa9.js      (DIR_SRC=… para outra fonte, ex.: 1.8.13)
'use strict';
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ADMIN = 'dono@unidade.example';
const P262 = '470120000262';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PST1003: 'Eletiva teste', PSA1005: 'Obrigatória PSA' };
function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: '0', habilitacaoNome: 'Psicólogo', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: NOMES[d], versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  const por = {};
  curs.forEach((c) => { const vs = p.vinculos.filter((v) => v.curriculo === c); por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.filter((v) => v.tipo === OB).length, OPTATIVA_ELETIVA: vs.filter((v) => v.tipo === EL).length, OPTATIVA_LIVRE: 0, requisitos: 0 }; });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  return p;
}
const E = (k) => ({ origem: 'estrutura', chave: k });

let nav;
async function montar(opcoes) {
  opcoes = opcoes || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  pedir(amb.ctx.obterDadosPainel());
  const pk = pacoteCurso([[P262, 'PST1001', OB, 1], [P262, 'PST1003', EL, 1], [P262, 'PSA1005', OB, 1]]);
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  pedir(amb.ctx.adicionarAGrade([E('PST1001'), E('PST1003'), E('PSA1005')]));
  amb.criarPlanilhaGrade();
  const fila = [], respostas = [];
  const segurar = new Set(opcoes.segurar || []);
  const portao = (nome, args) => segurar.has(nome) ? new Promise((liberar) => fila.push({ nome, args, liberar })) : null;
  const origEnvio = amb.ctx.enviarGradeParaPreenchimento;
  amb.ctx.enviarGradeParaPreenchimento = function () { const r = origEnvio.apply(this, arguments); respostas.push(JSON.parse(JSON.stringify(r))); return r; };
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const c = { amb, pagina, errosPagina, fila, respostas };
  await esperarCarregado(pagina);
  c.contar = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.esperarFila = async (n) => { const t0 = Date.now(); while (c.fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou'); await new Promise((r) => setTimeout(r, 20)); } };
  c.abrirEConfirmar = async () => {
    await pagina.click('#etapa-4');
    await pagina.selectOption('#gradeSemestre', '1');
    await pagina.selectOption('#gradeAno', '2027');
    await pagina.click('#enviarGradePreenchimento');
    await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    await pagina.click('[data-confirmar-envio]');
  };
  c.esperarResultado = () => pagina.waitForFunction(() => !document.getElementById('modalEnvioGrade').hidden && /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
  /** O que a pessoa vê no resultado e o que há no DOM (links, atributos, endereços). */
  c.resultado = () => pagina.evaluate(() => {
    const corpo = document.getElementById('envioGradeCorpo');
    const p = Array.from(corpo.querySelectorAll('p')).map((x) => x.textContent.trim());
    return {
      texto: corpo.textContent.replace(/\s+/g, ' ').trim(),
      linhaAuditoria: p.find((x) => /^Auditoria:/.test(x)) || null,
      linhaCopia: p.find((x) => /^Cópia de segurança/.test(x)) || null,
      links: Array.from(corpo.querySelectorAll('a')).map((a) => ({ href: a.getAttribute('href'), texto: a.textContent })),
      htmlCorpo: corpo.innerHTML,
      paginaInteira: document.documentElement.outerHTML,
      imgs: corpo.querySelectorAll('img').length,
      xss: window.__xss === undefined ? null : window.__xss,
      avisos: Array.from(corpo.querySelectorAll('.alerta--aviso li')).map((x) => x.textContent)
    };
  });
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }
const respostaForjada = (aud, backup, avisos) => ({ ok: true, dados: {
  grade: '2027/1', nomeNovo: 'Grade Horária - 1º semestre de 2027', nomeAnterior: 'Grade Horária - 1º Semestre de 2026',
  contagens: { PSA: 1, PSC: 0, PSE: 0, PST: 2, INTER: 0, OUTRAS: 0 }, total: 3,
  backup: backup || { nome: 'Grade Horária - 1º Semestre de 2026 (cópia de 07/10/2026 09:00)', url: 'https://docs.google.com/spreadsheets/d/ID_COPIA_FORJADA/edit', semestre: '2026/1' },
  auditoria: aud, avisos: avisos || [] } });
const semAuditoriaNoDom = (res, endereco) => !res.links.some((l) => /auditoria/i.test(l.texto) || (endereco && l.href === endereco)) && (!endereco || !res.paginaInteira.includes(endereco));

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('Ambiente: Chromium real; servidor real no simulador de Apps Script (mockGoogle.js); transporte google.script.run simulado.');
  console.log('\n== 20. Resultado do envio sem o link da auditoria (A9)');

  await teste('20a. [L4, L7] envio REAL de 2027/1 (cria a auditoria): o resultado mostra "Auditoria: <nome> (criada agora)" como TEXTO, sem link e sem o endereço da auditoria em nenhum lugar da página; contagens, nome novo e aviso de ativação corretos; a cópia de segurança mantém o link https', async () => {
    const c = await montar();
    await c.abrirEConfirmar();
    await c.esperarResultado();
    const res = await c.resultado();
    const id = (c.amb.indiceGrades().getSheets()[0].getRange(1, 1, 10, 3).getValues().filter((l) => String(l[0]).replace(/^'/, '') === '2027/1' && l[2])[0] || [])[2];
    const endereco = id ? c.amb.planilhas.get(id).getUrl() : '(sem auditoria)';
    const resp = c.respostas[c.respostas.length - 1];
    console.log('     fatos [20a]: ' + JSON.stringify({ auditoriaNaResposta: resp.dados.auditoria, linhaAuditoria: res.linhaAuditoria, links: res.links, enderecoDaAuditoria: endereco, enderecoNaPagina: res.paginaInteira.includes(endereco), linhaCopia: res.linhaCopia, avisos: res.avisos }));
    verdade(res.linhaAuditoria && res.linhaAuditoria.startsWith('Auditoria: Auditoria - Grade Horária - 1º semestre de 2027 (criada agora)'), 'nome e situação: ' + res.linhaAuditoria);
    verdade(semAuditoriaNoDom(res, endereco), 'sem link nem endereço da auditoria');
    verdade(!/ID_NOVA/.test(res.htmlCorpo), 'sem ID da auditoria no resultado');
    verdade(/Grade 2027\/1 enviada para preenchimento/.test(res.texto) && /3 disciplinas gravadas: PSA 1 · PSC 0 · PSE 0 · PST 2/.test(res.texto) && /"Grade Horária - 1º semestre de 2027"/.test(res.texto), 'contagens e nome: ' + res.texto.slice(0, 200));
    verdade(res.avisos.some((a) => /ativarAuditoriaGrade/.test(a)), 'aviso de ativação');
    const copia = res.links.find((l) => /cópia de/.test(l.texto));
    verdade(copia && copia.href === resp.dados.backup.url && /^https:\/\//.test(copia.href), 'link da cópia: ' + JSON.stringify(res.links));
    await fim(c);
  });

  await teste('20b. [L4] segundo envio de 2027/1 (reaproveita a auditoria): "(já existia)", sem link da auditoria; link da cópia mantido', async () => {
    const c = await montar();
    await c.abrirEConfirmar();
    await c.esperarResultado();
    await c.pagina.click('#envioGradeRodape [data-fechar-envio]');
    await c.pagina.waitForSelector('#modalEnvioGrade', { state: 'hidden' });
    await c.abrirEConfirmar();
    await c.pagina.waitForFunction(() => /já existia/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
    const res = await c.resultado();
    console.log('     fatos [20b]: ' + JSON.stringify({ auditoriaNaResposta: c.respostas[c.respostas.length - 1].dados.auditoria, linhaAuditoria: res.linhaAuditoria, links: res.links }));
    verdade(res.linhaAuditoria && /\(já existia\)/.test(res.linhaAuditoria), res.linhaAuditoria);
    verdade(semAuditoriaNoDom(res, c.amb.planilhas.get('ID_NOVA_2') ? c.amb.planilhas.get('ID_NOVA_2').getUrl() : null), 'sem link da auditoria');
    verdade(res.links.some((l) => /cópia de/.test(l.texto) && /^https:\/\//.test(l.href)), 'link da cópia');
    await fim(c);
  });

  await teste('20c. [L5] resposta ANTIGA (formato 1.8.13, com auditoria.url) no callback real: o endereço é ignorado — não vira href, atributo nem texto; nome e situação continuam', async () => {
    const c = await montar({ segurar: ['enviarGradeParaPreenchimento'] });
    await c.abrirEConfirmar();
    await c.esperarFila(1);
    const URL_ANTIGA = 'https://docs.google.com/spreadsheets/d/ID_AUDITORIA_ANTIGA/edit';
    c.fila[0].liberar({ resposta: respostaForjada({ nome: 'Auditoria - Grade Horária - 1º semestre de 2027', url: URL_ANTIGA, criada: false, registroAtivo: true }) });
    await c.esperarResultado();
    const res = await c.resultado();
    console.log('     fatos [20c] (resposta forjada pelo portão): ' + JSON.stringify({ linhaAuditoria: res.linhaAuditoria, links: res.links, enderecoNaPagina: res.paginaInteira.includes('ID_AUDITORIA_ANTIGA') }));
    verdade(!res.paginaInteira.includes('ID_AUDITORIA_ANTIGA'), 'endereço antigo ausente do DOM');
    verdade(semAuditoriaNoDom(res, URL_ANTIGA), 'sem link da auditoria');
    verdade(res.linhaAuditoria && /\(já existia\)/.test(res.linhaAuditoria), res.linhaAuditoria);
    verdade(res.links.some((l) => l.href === 'https://docs.google.com/spreadsheets/d/ID_COPIA_FORJADA/edit'), 'link da cópia');
    await fim(c);
  });

  await teste('20d. [L6] nome da auditoria com HTML e caracteres especiais (resposta forjada): aparece como TEXTO, sem elemento criado nem script executado', async () => {
    const c = await montar({ segurar: ['enviarGradeParaPreenchimento'] });
    await c.abrirEConfirmar();
    await c.esperarFila(1);
    const NOME = 'Auditoria <img src=x onerror="window.__xss=1"> & "aspas" <b>negrito</b>';
    c.fila[0].liberar({ resposta: respostaForjada({ nome: NOME, criada: true, registroAtivo: true }) });
    await c.esperarResultado();
    await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    const res = await c.resultado();
    console.log('     fatos [20d] (resposta forjada pelo portão): ' + JSON.stringify({ linhaAuditoria: res.linhaAuditoria, imgs: res.imgs, xss: res.xss, links: res.links }));
    verdade(res.linhaAuditoria && res.linhaAuditoria.includes(NOME), 'texto literal: ' + res.linhaAuditoria);
    igual([res.imgs, res.xss], [0, null], 'nenhum elemento nem script');
    verdade(!/<b>negrito/.test(res.htmlCorpo), 'marcação escapada');
    verdade(!res.links.some((l) => /Auditoria/.test(l.texto)), 'sem link da auditoria');
    await fim(c);
  });

  await teste('20e. [L7, controle nas duas versões] link da cópia: https vira link com o nome e o semestre; endereço que não é https (forjado) fica só como texto', async () => {
    const c = await montar({ segurar: ['enviarGradeParaPreenchimento'] });
    await c.abrirEConfirmar();
    await c.esperarFila(1);
    c.fila[0].liberar({ resposta: respostaForjada({ nome: 'Auditoria - Grade Horária - 1º semestre de 2027', criada: true, registroAtivo: true }, { nome: 'Cópia <forjada>', url: 'javascript:window.__xss=2', semestre: '2026/1' }) });
    await c.esperarResultado();
    const res = await c.resultado();
    console.log('     fatos [20e] (resposta forjada pelo portão): ' + JSON.stringify({ linhaCopia: res.linhaCopia, links: res.links, xss: res.xss }));
    verdade(res.linhaCopia && res.linhaCopia.includes('(2026/1)') && res.linhaCopia.includes('Cópia <forjada>'), res.linhaCopia);
    igual([res.links.length, res.xss], [0, null], 'endereço não https não vira link');
    await fim(c);
  });

  await nav.close();
  console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
