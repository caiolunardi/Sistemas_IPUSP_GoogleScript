// (1.9.0) Central de Ajuda na interface REAL (Chromium) com o servidor real no
// simulador de Apps Script (mockGoogle.js) e o transporte google.script.run
// simulado (ambiente_navegador.js), com respostas CONTROLADAS quando o teste
// precisa de ordem ou de falha (opção "portao"). Estrutura curricular,
// disciplinas, e-mails e planilhas SINTÉTICOS (domínio .example).
//
// Cobre os itens 1–18 do pedido da Central: abertura global e todos os
// destinos contextuais; nenhuma chamada ao servidor e funcionamento sem
// transporte; busca (acentos, caixa, metadados, resposta recolhida, várias
// palavras, vazio, nenhum resultado, HTML digitado); contagem; FAQ por
// clique e teclado; foco, Tab, ESC, clique no fundo, retorno do foco e
// rolagem; ajuda sobre a ficha, a importação (revisão do PDF) e o envio
// preservando o estado; respostas atrasadas; gatilho removido; abertura e
// inicialização repetidas; janelas antigas sem ESC/fundo; perfis; avisos de
// pendência (inclusive leituraFalhou); resultado do envio; fonte sem dados
// privados; larguras, zoom, temas e troca de tema com a Central aberta.
//
// (1.9.1) G: Tab/Shift+Tab REAIS a partir de títulos focados por programa
// (T01–T07) e com janelas por trás (T08–T10), com as sequências focadas em
// saida/ajuda/sequencias_foco.txt; H: os fatos que as orientações corrigidas
// descrevem (A1–A3), pelas funções reais do servidor no simulador, e o texto.
// (1.9.2) H5: envio interrompido (falha na gravação das fórmulas de Horário de
// Fim) com os dados conferidos já completos nas seis abas; H4 reforçado.
//
// Uso: node testar_ajuda.js        (DIR_SRC=… para outra fonte)
// Saída: resumo "N ok, M falha(s)"; capturas em saida/ajuda/.
// Código final: 0 (tudo aprovado), 1 (alguma asserção reprovada), 3 (erro de
// infraestrutura antes ou fora das asserções: navegador, módulo, ambiente).
'use strict';
const fs = require('fs');
const path = require('path');

let ambiente;
try { ambiente = require('./ambiente_navegador'); }
catch (e) { console.log('ERRO DE INFRAESTRUTURA: ' + (e && e.message)); process.exit(3); }
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = ambiente;
const { parSintetico } = require('./pacotes_sinteticos');

const SAIDA = path.join(__dirname, 'saida', 'ajuda');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const ESTRANHO = 'sem.acesso@unidade.example';
const P262 = '470120000262';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PST1003: 'Eletiva teste', PSA1005: 'Obrigatória PSA', 4701007: 'Interdepartamental teste' };
const FONTE = DIR_SRC;

/** Pacote CSV sintético (formato de LeitorComum), um currículo do Psicólogo. */
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
/** Modelo mínimo para parSintetico (currículo e curso fictícios). */
const MODELO = { versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' }, curriculos: [{ codigo: P262, habilitacao: '0', habilitacaoNome: 'Psicólogo', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null }] };

/** Base: 4 disciplinas da estrutura, 3 na grade (1º sem.), 1 disciplina para outros cursos. */
function prepararBase(amb, op) {
  pedir(amb.ctx.obterDadosPainel());
  const pk = op && op.pacote ? op.pacote : pacoteCurso([[P262, 'PST1001', OB, 1], [P262, 'PST1003', EL, 1], [P262, 'PSA1005', OB, 1], [P262, '4701007', OB, 2]]);
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  if (!(op && op.pacote)) {
    pedir(amb.ctx.adicionarAGrade([E('PST1001'), E('PST1003'), E('PSA1005')]));
    pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1' } }));
  }
}

let nav;
/**
 * Abre a página. opcoes: { perfil: 'admin'|'leitor'|'semAcesso', falharCarga, segurar: [nomes],
 * largura, altura, esquema, grade (planilha das secretarias), preparar(amb), base: false, pacote }.
 */
async function montar(opcoes) {
  opcoes = opcoes || {};
  const amb0 = criarAmbiente({ dirSrc: FONTE, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  if (opcoes.base !== false) prepararBase(amb0, opcoes);
  if (opcoes.grade) amb0.criarPlanilhaGrade();
  if (opcoes.preparar) opcoes.preparar(amb0);
  const usuario = opcoes.perfil === 'leitor' ? LEITOR : opcoes.perfil === 'semAcesso' ? ESTRANHO : ADMIN;
  const amb = usuario === ADMIN ? amb0 : criarAmbiente({ dirSrc: FONTE, reusar: amb0, usuario, dono: ADMIN });
  const fila = [];
  const segurar = new Set(opcoes.segurar || []);
  const portao = (nome) => {
    if (opcoes.falharCarga && nome === 'obterDadosPainel') return Promise.resolve({ falhar: 'transporte indisponível (teste)' });
    return segurar.has(nome) ? new Promise((liberar) => fila.push({ nome, liberar })) : null;
  };
  const { pagina, errosPagina, chamadas, contexto } = await abrirPainel(nav, { amb, largura: opcoes.largura || 1280, altura: opcoes.altura || 900, esquema: opcoes.esquema || 'light', latencia: 0, portao });
  const dialogos = [];
  pagina.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  const pedidosExternos = [];
  pagina.on('request', (r) => { const u = r.url(); if (!/^https:\/\/painel\.teste\//.test(u) && !/^data:/.test(u)) pedidosExternos.push(u); });
  await esperarCarregado(pagina);
  const c = { amb, pagina, errosPagina, chamadas, fila, dialogos, contexto, pedidosExternos };
  c.respostas = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.esperarResposta = async (n) => { await pagina.waitForFunction((k) => (window.__gasRespondidas || 0) >= k, n, { timeout: 15000 }); await pagina.waitForTimeout(30); };
  c.esperarFila = async (n) => { const t0 = Date.now(); while (fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou'); await new Promise((r) => setTimeout(r, 20)); } };
  c.liberar = async (i, decisao) => { const n = await c.respostas(); fila[i].liberar(decisao || null); await c.esperarResposta(n + 1); };
  c.ajuda = () => estadoAjuda(pagina);
  c.abrirFicha = async (id) => { await pagina.click('#corpoTabela tr[data-id="' + id + '"] td:nth-child(2) .tabela__abrir'); await pagina.waitForSelector('#modalDisciplina:not([hidden])'); };
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.contexto.close(); }

/** Fotografia da Central e do foco. */
function estadoAjuda(pagina) {
  return pagina.evaluate(() => {
    const raiz = document.getElementById('centralAjuda');
    const ae = document.activeElement;
    const secoes = Array.from(raiz.querySelectorAll('[data-gradip-help-section]'));
    const vis = secoes.filter((s) => !s.hidden);
    const itens = Array.from(raiz.querySelectorAll('[data-gradip-help-search-item]')).filter((i) => !i.hidden && !i.closest('[data-gradip-help-section]').hidden);
    return {
      aberta: !raiz.hidden, topo: !!(window.Painel && Painel.Modal.noTopo(raiz)),
      ativo: ae ? (ae.id || ae.getAttribute('data-gradip-help-open') || ae.getAttribute('data-gradip-help-target') || ae.tagName) : null,
      ativoTexto: ae ? ae.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '',
      ativoDentro: raiz.contains(ae), secoes: vis.map((s) => s.id), inicio: !document.getElementById('ajuda-inicio').hidden,
      status: document.getElementById('centralAjudaStatus').textContent, itens: itens.length, itensIds: itens.map((i) => i.id),
      semResultado: !document.getElementById('centralAjudaSemResultado').hidden,
      busca: document.getElementById('centralAjudaBusca').value,
      bodyModal: document.body.classList.contains('modalAberto'), bodyOverflow: document.body.style.overflow
    };
  });
}
const esperarAberta = (p) => p.waitForFunction(() => !document.getElementById('centralAjuda').hidden);
const esperarFechada = (p) => p.waitForFunction(() => document.getElementById('centralAjuda').hidden);
async function buscar(p, termo) {
  await p.fill('#centralAjudaBusca', termo);
  await p.waitForTimeout(260);   // espera curta da busca (150 ms) + desenho
}
/** Os destinos usados nos gatilhos, lidos da FONTE (HTML estático e gerado). */
function destinosDaFonte() {
  const mapa = {};
  fs.readdirSync(FONTE).filter((f) => /\.html$/.test(f) && !/^EstruturaAjuda/.test(f)).forEach((f) => {
    const t = fs.readFileSync(path.join(FONTE, f), 'utf8');
    let m;
    const anota = (d) => { if (d !== '' && !/^ajuda-[a-z0-9-]+$/.test(d)) return; (mapa[d || '(início)'] = mapa[d || '(início)'] || []).push(f); };
    const r1 = /data-gradip-help-open="([^"]*)"/g; while ((m = r1.exec(t))) anota(m[1]);
    const r2 = /\bgatilho(?:Ajuda)?\('([^']+)'/g; while ((m = r2.exec(t))) anota(m[1]);
  });
  return mapa;
}

(async () => {
  try { nav = await abrirNavegador(); }
  catch (e) { console.log('ERRO DE INFRAESTRUTURA (navegador): ' + (e && e.message)); process.exit(3); }
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('Ambiente: Chromium real (Playwright); servidor real no simulador de Apps Script; transporte google.script.run simulado; dados sintéticos.');

  /*==================================================================*/
  console.log('\n== A. Abertura, destinos e independência do servidor (itens 1, 2, 17)');

  await teste('A1. [1] botão "Ajuda" do cabeçalho: diálogo modal rotulado, início com busca e os 7 atalhos, foco no título, Central no topo da pilha', async () => {
    const c = await montar();
    const p = c.pagina;
    const cab = await p.evaluate(() => { const b = document.getElementById('botaoAjuda'); const r = b.getBoundingClientRect(); return { texto: b.textContent.trim(), dentroDoCabecalho: !!b.closest('header'), largura: r.width, altura: r.height, popup: b.getAttribute('aria-haspopup') }; });
    verdade(cab.dentroDoCabecalho && /Ajuda/.test(cab.texto) && cab.altura >= 44 && cab.largura >= 44 && cab.popup === 'dialog', JSON.stringify(cab));
    await p.click('#botaoAjuda');
    await esperarAberta(p);
    const s = await c.ajuda();
    const sem = await p.evaluate(() => {
      const j = document.getElementById('centralAjudaJanela');
      const t = document.getElementById(j.getAttribute('aria-labelledby'));
      return { role: j.getAttribute('role'), modal: j.getAttribute('aria-modal'), titulo: t && t.textContent, atalhos: Array.from(document.querySelectorAll('.centralAjuda__atalho')).map((b) => b.querySelector('span:last-child').textContent.trim()), mains: document.querySelectorAll('main').length, fechar: document.querySelector('[data-gradip-help-close]').textContent.replace(/\s+/g, ' ').trim() };
    });
    igual([sem.role, sem.modal, sem.titulo, sem.mains], ['dialog', 'true', 'Central de Ajuda', 1], 'semântica');
    igual(sem.atalhos, ['Quero consultar uma disciplina', 'Quero importar a estrutura do Júpiter', 'Quero corrigir uma disciplina', 'Quero incluir disciplinas para outros cursos', 'Quero preparar e enviar a grade', 'Quero acompanhar o preenchimento', 'Apareceu um aviso ou uma pendência'], 'atalhos');
    verdade(/Fechar/.test(sem.fechar) && await p.evaluate(() => document.querySelector('[data-gradip-help-close]').tagName === 'BUTTON'), 'botão Fechar real: ' + sem.fechar);
    igual([s.aberta, s.topo, s.inicio, s.secoes, s.ativo, s.bodyModal], [true, true, true, [], 'ajuda-inicio-titulo', true], 'estado');
    await p.screenshot({ path: path.join(SAIDA, '01-inicio-1280-claro.png') });
    await fim(c);
  });

  await teste('A2. [1] TODOS os destinos usados nos gatilhos da fonte existem na Central; abrir cada um mostra só a seção dele, rola até o destino e foca o título; IDs únicos na página e aria-controls/alvos internos sem referência quebrada', async () => {
    const mapa = destinosDaFonte();
    const destinos = Object.keys(mapa).filter((d) => d !== '(início)');
    verdade(destinos.length >= 40, 'destinos encontrados na fonte: ' + destinos.length);
    const c = await montar();
    const p = c.pagina;
    const quebrados = await p.evaluate((ds) => ds.filter((d) => { const el = document.getElementById(d); return !el || !document.getElementById('centralAjuda').contains(el); }), destinos);
    igual(quebrados, [], 'destinos sem alvo');
    const resultado = await p.evaluate(async (ds) => {
      const falhas = [];
      for (const d of ds) {
        EstruturaAjuda.abrir(d);
        await new Promise((r) => requestAnimationFrame(r));
        const alvo = document.getElementById(d);
        const secao = alvo.closest('[data-gradip-help-section]');
        const visiveis = Array.from(document.querySelectorAll('[data-gradip-help-section]')).filter((s) => !s.hidden);
        const ae = document.activeElement;
        const focoOk = ae && (alvo.contains(ae) || ae === secao.querySelector('.centralAjuda__secaoTitulo'));
        const j = document.getElementById('centralAjudaConteudo').getBoundingClientRect();
        const r = alvo.getBoundingClientRect();
        const noTopoDaVista = r.top >= j.top - 2 && r.top <= j.top + Math.max(60, j.height - 40);
        if (visiveis.length !== 1 || visiveis[0] !== secao || !focoOk || !noTopoDaVista || document.getElementById('ajuda-inicio').hidden === false) falhas.push({ d, visiveis: visiveis.map((s) => s.id), foco: ae && (ae.id || ae.textContent.slice(0, 30)), noTopoDaVista });
        EstruturaAjuda.fechar();
      }
      return falhas;
    }, destinos);
    igual(resultado, [], 'destinos com problema');
    const refs = await p.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      const raiz = document.getElementById('centralAjuda');
      const quebra = [];
      raiz.querySelectorAll('[aria-controls]').forEach((b) => { if (!document.getElementById(b.getAttribute('aria-controls'))) quebra.push(b.getAttribute('aria-controls')); });
      raiz.querySelectorAll('[data-gradip-help-target]').forEach((b) => { const t = b.getAttribute('data-gradip-help-target'); if (!document.getElementById(t)) quebra.push(t); });
      raiz.querySelectorAll('[aria-labelledby]').forEach((b) => { if (!document.getElementById(b.getAttribute('aria-labelledby'))) quebra.push(b.getAttribute('aria-labelledby')); });
      const aninhados = Array.from(raiz.querySelectorAll('[data-gradip-help-search-item] [data-gradip-help-search-item]')).length;
      return { dup: Array.from(new Set(dup)), quebra, aninhados, secoes: raiz.querySelectorAll('[data-gradip-help-section]').length, itens: raiz.querySelectorAll('[data-gradip-help-search-item]').length, faq: raiz.querySelectorAll('[data-gradip-help-faq-toggle]').length };
    });
    console.log('     fatos [A2]: ' + JSON.stringify({ destinos: destinos.length, secoes: refs.secoes, unidadesDeBusca: refs.itens, perguntasFaq: refs.faq }));
    igual([refs.dup, refs.quebra, refs.aninhados], [[], [], 0], 'referências');
    await fim(c);
  });

  await teste('A3. [1, 8] gatilhos REAIS das telas (cliques): busca, semestre de oferecimento, Currículos, Importações, etapas 2–4, envio, ficha (topo, requisitos, ajustes), importação, lista da unidade, nova grade e auditoria abrem o assunto certo', async () => {
    const c = await montar({ grade: true });
    const p = c.pagina;
    const conferir = async (seletor, destino, preparar) => {
      if (preparar) await preparar();
      await p.click(seletor);
      await esperarAberta(p);
      const s = await c.ajuda();
      const alvoSecao = await p.evaluate((d) => { const el = document.getElementById(d); return el.closest('[data-gradip-help-section]').id; }, destino);
      igual([s.secoes, s.topo], [[alvoSecao], true], seletor + ' → ' + destino);
      await p.keyboard.press('Escape');
      await esperarFechada(p);
    };
    const g = (d) => '[data-gradip-help-open="' + d + '"]';
    await conferir('#painel-disciplinas ' + g('ajuda-consultar'), 'ajuda-consultar');
    await conferir('#filtros ' + g('ajuda-glossario-semestre'), 'ajuda-glossario-semestre');
    await conferir('#painel-curriculos ' + g('ajuda-curriculos'), 'ajuda-curriculos', () => p.click('#aba-curriculos'));
    await conferir('#painel-historico ' + g('ajuda-historico-importacoes'), 'ajuda-historico-importacoes', () => p.click('#aba-historico'));
    await p.click('#aba-disciplinas');
    await conferir('#acoesGrade ' + g('ajuda-nova-grade'), 'ajuda-nova-grade');
    await conferir('#etapaPainel-2 ' + g('ajuda-outros-cursos'), 'ajuda-outros-cursos', () => p.click('#etapa-2'));
    await conferir('#etapaPainel-3 ' + g('ajuda-lista-grade'), 'ajuda-lista-grade', () => p.click('#etapa-3'));
    await conferir('#etapaPainel-4 ' + g('ajuda-previa-grade'), 'ajuda-previa-grade', () => p.click('#etapa-4'));
    await conferir('#gradeAlvo ' + g('ajuda-envio-grade-efeitos'), 'ajuda-envio-grade-efeitos');
    await p.selectOption('#gradeSemestre', '1'); await p.selectOption('#gradeAno', '2027');
    await p.click('#enviarGradePreenchimento');
    await p.waitForSelector('[data-confirmar-envio]:not([disabled])');
    await conferir('#modalEnvioGrade .modal__topo ' + g('ajuda-envio-grade'), 'ajuda-envio-grade');
    await conferir('#envioGradeCorpo ' + g('ajuda-envio-grade-efeitos'), 'ajuda-envio-grade-efeitos');
    await p.click('[data-fechar-envio]');
    await p.click('#etapa-1');
    await c.abrirFicha('PST1001');
    await conferir('#modalDisciplina .modal__topo ' + g('ajuda-ficha'), 'ajuda-ficha');
    await conferir('#modalDisciplinaCorpo ' + g('ajuda-ficha-requisitos'), 'ajuda-ficha-requisitos');
    await conferir('#modalDisciplinaCorpo ' + g('ajuda-ajustes'), 'ajuda-ajustes');
    await p.click('#modalDisciplina .modal__fechar');
    await p.click('[data-abrir-importacao]');
    await p.waitForSelector('#modalImportacao:not([hidden])');
    await conferir('#importacaoCorpo ' + g('ajuda-antes-gerar'), 'ajuda-antes-gerar');
    await conferir('#modalImportacao .modal__topo ' + g('ajuda-importar'), 'ajuda-importar');
    await p.click('#importacaoFechar');
    await p.click('#etapa-2'); await p.click('[data-abrir-unidade]');
    await p.waitForSelector('#modalUnidade:not([hidden])');
    await conferir('#modalUnidade ' + g('ajuda-outros-cursos-lista'), 'ajuda-outros-cursos-lista');
    await p.click('[data-fechar-unidade]');
    await p.click('[data-cadastrar-nova-grade]');
    await p.waitForSelector('#modalRecomeco:not([hidden])');
    await conferir('#modalRecomeco ' + g('ajuda-nova-grade'), 'ajuda-nova-grade');
    await p.click('[data-fechar-recomeco]');
    await p.click('#visao-auditoria');
    await p.waitForFunction(() => !/Carregando/.test(document.getElementById('auditoriaSituacao').textContent));
    await conferir('#visaoAuditoria .auditoriaTopo ' + g('ajuda-auditoria'), 'ajuda-auditoria');
    await conferir('#visaoAuditoria .auditoriaTopo ' + g('ajuda-secretarias'), 'ajuda-secretarias');
    const dinamico = await p.evaluate(() => Array.from(document.querySelectorAll('#visaoAuditoria .secaoAuditoriaPainel:not([hidden]) [data-gradip-help-open]')).map((b) => b.getAttribute('data-gradip-help-open')));
    verdade(dinamico.length >= 1, '(1.11.2) gatilhos dentro da seção aberta da auditoria: ' + JSON.stringify(dinamico));
    await conferir('#visaoAuditoria .secaoAuditoriaPainel:not([hidden]) [data-gradip-help-open="' + dinamico[0] + '"]', dinamico[0]);
    // A auditoria redesenhada (Atualizar) mantém os gatilhos funcionando (delegação).
    await p.click('#auditoriaAtualizar');
    await p.waitForFunction(() => !document.getElementById('auditoriaAtualizar').disabled);
    await conferir('#visaoAuditoria .secaoAuditoriaPainel:not([hidden]) [data-gradip-help-open="' + dinamico[0] + '"]', dinamico[0]);
    await fim(c);
  });

  await teste('A4. [2] abrir, navegar, buscar, abrir FAQ e fechar a Central não chama o servidor nem faz pedidos de rede; não grava nada no armazenamento do navegador', async () => {
    const c = await montar();
    const p = c.pagina;
    const antes = c.chamadas.length;
    const externosAntes = c.pedidosExternos.length;
    const chavesAntes = await p.evaluate(() => { try { return Object.keys(localStorage).concat(Object.keys(sessionStorage)).sort(); } catch (e) { return ['(indisponível)']; } });
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.click('.centralAjuda__atalho >> nth=4');
    await buscar(p, 'cópia de segurança');
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-faq"]');
    await p.click('#ajuda-faq-csv-pdf-p');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const chavesDepois = await p.evaluate(() => { try { return Object.keys(localStorage).concat(Object.keys(sessionStorage)).sort(); } catch (e) { return ['(indisponível)']; } });
    igual([c.chamadas.length - antes, c.pedidosExternos.length - externosAntes, chavesDepois], [0, 0, chavesAntes], 'chamadas, pedidos externos e armazenamento');
    await fim(c);
  });

  await teste('A5. [2, 14] carga dos dados FALHANDO (transporte indisponível): o cartão de erro tem o gatilho "Problemas para abrir o painel" e a Central abre pelo cabeçalho e pelo gatilho (em Conta e permissões)', async () => {
    const c = await montar({ falharCarga: true });
    const p = c.pagina;
    const erro = await p.evaluate(() => document.getElementById('estadoBase').textContent);
    verdade(/Não foi possível abrir o painel/.test(erro), erro);
    await p.click('#botaoAjuda'); await esperarAberta(p);
    igual((await c.ajuda()).inicio, true, 'início');
    await p.click('[data-gradip-help-close]'); await esperarFechada(p);
    await p.click('#estadoBase [data-gradip-help-open="ajuda-acesso"]'); await esperarAberta(p);
    igual((await c.ajuda()).secoes, ['ajuda-acesso'], 'seção de acesso');
    await p.screenshot({ path: path.join(SAIDA, '02-carga-falhou-ajuda.png') });
    await p.keyboard.press('Escape');
    igual(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-gradip-help-open')), 'ajuda-acesso', 'foco devolvido ao gatilho');
    await fim(c);
  });

  await teste('A6. [17] fonte da Central sem dados privados, endereços, IDs, e-mails, placeholders, rede, armazenamento ou google.script.run; sem segundo <main>', async () => {
    const arqs = ['EstruturaAjuda.html', 'EstruturaAjudaEstilos.html', 'EstruturaAjudaUI.html'];
    const achados = [];
    arqs.forEach((f) => {
      const bruto = fs.readFileSync(path.join(FONTE, f), 'utf8');
      // Comentários explicam o que o código NÃO faz (ex.: "nenhuma chamada a google.script.run"): fora da varredura de uso.
      const t = bruto.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const regras = [
        ['endereço', /https?:\/\//], ['e-mail', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
        ['id de arquivo', /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])[A-Za-z0-9_-]{25,}\b/],
        ['placeholder', /A VALIDAR|\bEXEMPLO\b|\bTODO\b|FIXME|lorem ipsum/], ['transporte', /google\.script|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/],
        ['armazenamento', /localStorage|sessionStorage|indexedDB|document\.cookie/], ['main', /<main\b/i], ['href', /\bhref=/],
        ['nomes técnicos', /ID_INDEX|ativarAuditoriaGrade|diagnosticarEnvioGrade|PERMISSOES_DE_ACESSO|GRADE_HORARIA_PREENCHIMENTO|Script Properties|editor do Apps Script/],
        ['equivalência não validada', /AACC\s*=\s*ATPA|equivalente a ATPA/]
      ];
      regras.forEach(([nome, re]) => { const m = t.match(re); if (m) achados.push(f + ': ' + nome + ' → ' + m[0]); });
    });
    igual(achados, [], 'achados');
  });

  /*==================================================================*/
  console.log('\n== B. Busca, contagem, navegação e FAQ (itens 3, 4, 5)');

  await teste('B1. [3, 4] busca sem acento = com acento; maiúsculas indiferentes; contagem = unidades visíveis (cada uma uma vez), com o título da seção como contexto', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await buscar(p, 'pendência');
    const a = await c.ajuda();
    await buscar(p, 'PENDENCIA');
    const b = await c.ajuda();
    igual([a.itensIds, a.status], [b.itensIds, b.status.replace('PENDENCIA', 'pendência')], 'mesmos resultados');
    const n = Number((a.status.match(/^(\d+) resultado/) || [])[1]);
    verdade(n > 0 && n === a.itens, 'contagem ' + a.status + ' × ' + a.itens + ' visíveis');
    const nSec = Number((a.status.match(/em (\d+) se/) || [])[1]);
    igual(nSec, a.secoes.length, 'seções no status');
    const contexto = await p.evaluate(() => Array.from(document.querySelectorAll('[data-gradip-help-section]:not([hidden]) .centralAjuda__secaoTitulo')).every((h) => h.offsetParent !== null));
    verdade(contexto, 'título da seção visível junto dos resultados');
    // Contagem independente: corpus = data-search + texto (pergunta e resposta), todas as palavras.
    const indep = await p.evaluate((q) => {
      const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
      const termos = norm(q).split(' ');
      return Array.from(document.querySelectorAll('#centralAjuda [data-gradip-help-search-item]')).filter((el) => {
        const clone = el.cloneNode(true); const d = clone.querySelector('.centralAjuda__faqDica'); if (d) d.remove();
        const corpus = norm((el.getAttribute('data-search') || '') + ' ' + clone.textContent);
        return termos.every((t) => corpus.indexOf(t) >= 0);
      }).map((el) => el.id);
    }, 'pendencia');
    igual(indep, a.itensIds, 'contagem independente');
    await p.screenshot({ path: path.join(SAIDA, '03-busca-pendencia.png') });
    await fim(c);
  });

  await teste('B2. [3] termo só nos METADADOS (data-search) é encontrado; termo só na RESPOSTA recolhida da FAQ é encontrado, com a indicação de abrir a pergunta; abrir a pergunta mostra a resposta', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const meta = await p.evaluate(() => {
      const el = document.getElementById('ajuda-problema-aviso');
      return { meta: /triagem/.test(el.getAttribute('data-search')), texto: /triagem/i.test(document.getElementById('centralAjuda').textContent) };
    });
    igual(meta, { meta: true, texto: false }, 'termo "triagem" só nos metadados');
    await buscar(p, 'triagem');
    verdade((await c.ajuda()).itensIds.includes('ajuda-problema-aviso'), 'metadado encontrado');
    // "muitas pessoas editando" só aparece na resposta de uma pergunta da FAQ.
    const naResposta = await p.evaluate(() => {
      const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const t = 'muitas pessoas editando';
      const faqs = Array.from(document.querySelectorAll('#centralAjuda .centralAjuda__faq')).filter((f) => norm(f.querySelector('.centralAjuda__faqResposta').textContent).includes(t));
      return faqs.map((f) => ({ id: f.id, naPergunta: norm(f.querySelector('[data-gradip-help-faq-toggle]').textContent).includes(t), meta: norm(f.getAttribute('data-search')).includes(t), oculta: f.querySelector('.centralAjuda__faqResposta').hidden }));
    });
    igual(naResposta, [{ id: 'ajuda-faq-lenta', naPergunta: false, meta: false, oculta: true }], 'resposta recolhida');
    await buscar(p, 'muitas pessoas editando');
    const s = await c.ajuda();
    verdade(s.itensIds.includes('ajuda-faq-lenta'), 'achada: ' + JSON.stringify(s.itensIds));
    const dica = await p.evaluate(() => { const d = document.querySelector('#ajuda-faq-lenta .centralAjuda__faqDica'); return { visivel: !d.hidden && d.offsetParent !== null, texto: d.textContent }; });
    verdade(dica.visivel && /abra a pergunta/.test(dica.texto), 'indicação: ' + JSON.stringify(dica));
    await p.click('#ajuda-faq-lenta-p');
    const aberta = await p.evaluate(() => ({ exp: document.getElementById('ajuda-faq-lenta-p').getAttribute('aria-expanded'), resp: !document.getElementById('ajuda-faq-lenta-r').hidden, dica: document.querySelector('#ajuda-faq-lenta .centralAjuda__faqDica').hidden }));
    igual(aberta, { exp: 'true', resp: true, dica: true }, 'resposta aberta');
    await p.screenshot({ path: path.join(SAIDA, '04-busca-resposta-faq.png') });
    await fim(c);
  });

  await teste('B3. [3, 4] várias palavras = TODAS (não "ou"); vazio restaura a vista anterior; nenhum resultado: orientação + "Limpar busca"; navegar com filtro ativo remove o filtro', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-envio-grade"]');
    await buscar(p, 'copia');
    const um = (await c.ajuda()).itens;
    await buscar(p, 'copia semestre');
    const dois = await c.ajuda();
    const todas = await p.evaluate((ids) => ids.every((id) => { const t = document.getElementById(id).textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ' + document.getElementById(id).getAttribute('data-search'); return t.includes('copia') && t.includes('semestre'); }), dois.itensIds);
    verdade(dois.itens > 0 && dois.itens < um && todas, 'E entre palavras: ' + um + ' → ' + dois.itens);
    await buscar(p, '');
    igual(await c.ajuda().then((s) => [s.secoes, s.inicio, s.status]), [['ajuda-envio-grade'], false, ''], 'vazio volta à seção que estava aberta');
    await buscar(p, 'zzqxwy');
    const nada = await c.ajuda();
    igual([nada.itens, nada.semResultado, nada.status], [0, true, 'Nenhum resultado para “zzqxwy”.'], 'nenhum resultado');
    await p.screenshot({ path: path.join(SAIDA, '05-busca-sem-resultado.png') });
    await p.click('#centralAjudaSemResultado [data-centralajuda-limpar]');
    const limpa = await c.ajuda();
    igual([limpa.busca, limpa.semResultado, limpa.secoes, limpa.ativo], ['', false, ['ajuda-envio-grade'], 'centralAjudaBusca'], 'limpar');
    await buscar(p, 'zzqxwy');
    await p.click('#centralAjudaSemResultado [data-gradip-help-target="ajuda-faq"]');
    const nav2 = await c.ajuda();
    igual([nav2.busca, nav2.secoes, nav2.semResultado, nav2.ativo], ['', ['ajuda-faq'], false, 'ajuda-faq-titulo'], 'navegação limpa o filtro');
    await fim(c);
  });

  await teste('B4. [3] texto com HTML digitado na busca não vira HTML executável (status por textContent)', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const injecao = '<img src=x onerror="window.__xss=1"><b>negrito</b>';
    await buscar(p, injecao);
    const r = await p.evaluate(() => ({ xss: window.__xss, imgs: document.querySelectorAll('#centralAjuda img').length, negrito: document.querySelectorAll('#centralAjudaStatus b').length, status: document.getElementById('centralAjudaStatus').textContent }));
    igual([r.xss, r.imgs, r.negrito], [undefined, 0, 0], 'nada interpretado');
    verdade(r.status.includes('<img src=x'), 'texto literal no status: ' + r.status);
    await fim(c);
  });

  await teste('B5. [5] FAQ por clique, Enter e Espaço: aria-expanded, hidden e o ícone acompanham; resposta oculta fora da ordem de foco; todas as perguntas têm aria-controls para um painel existente', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-faq"]');
    const est = (id) => p.evaluate((i) => { const b = document.getElementById(i + '-p'); const r = document.getElementById(i + '-r'); return [b.getAttribute('aria-expanded'), r.hidden, getComputedStyle(b.querySelector('.centralAjuda__faqChevron')).transform !== 'none']; }, id);
    igual(await est('ajuda-faq-desfazer'), ['false', true, false], 'fechada');
    await p.click('#ajuda-faq-desfazer-p');
    igual(await est('ajuda-faq-desfazer'), ['true', false, true], 'clique abre');
    await p.focus('#ajuda-faq-desfazer-p');
    await p.keyboard.press('Enter');
    igual(await est('ajuda-faq-desfazer'), ['false', true, false], 'Enter fecha');
    await p.keyboard.press('Space');
    igual(await est('ajuda-faq-desfazer'), ['true', false, true], 'Espaço abre');
    const geral = await p.evaluate(() => {
      const bs = Array.from(document.querySelectorAll('#centralAjuda [data-gradip-help-faq-toggle]'));
      return { total: bs.length, ok: bs.every((b) => b.tagName === 'BUTTON' && document.getElementById(b.getAttribute('aria-controls')) && /^(true|false)$/.test(b.getAttribute('aria-expanded'))) };
    });
    verdade(geral.total >= 45 && geral.ok, JSON.stringify(geral));
    // Tab não entra em respostas fechadas.
    await p.click('#ajuda-faq-desfazer-p');   // fecha
    const focos = [];
    await p.focus('#ajuda-faq-importei-errado-p').catch(() => p.focus('#ajuda-faq-desfazer-p'));
    for (let k = 0; k < 6; k++) { await p.keyboard.press('Tab'); focos.push(await p.evaluate(() => { const a = document.activeElement; return !!a.closest('.centralAjuda__faqResposta[hidden]'); })); }
    verdade(focos.every((x) => !x), 'foco em resposta oculta');
    await p.screenshot({ path: path.join(SAIDA, '06-faq.png') });
    await fim(c);
  });

  /*==================================================================*/
  console.log('\n== C. Foco, teclado, fundo e rolagem (itens 6, 12, 13)');

  await teste('C1. [6] Tab e Shift+Tab ficam na Central; ESC fecha e devolve o foco ao botão; clique no fundo fecha; overflow inline do body preservado e classe de bloqueio removida no fim', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.evaluate(() => { document.body.style.overflow = 'scroll'; });
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const dentro = [];
    for (let k = 0; k < 70; k++) { await p.keyboard.press('Tab'); dentro.push(await p.evaluate(() => document.getElementById('centralAjuda').contains(document.activeElement))); }
    for (let k = 0; k < 25; k++) { await p.keyboard.press('Shift+Tab'); dentro.push(await p.evaluate(() => document.getElementById('centralAjuda').contains(document.activeElement))); }
    verdade(dentro.every(Boolean), 'foco saiu da Central em ' + dentro.indexOf(false));
    const s = await c.ajuda();
    igual([s.bodyModal, s.bodyOverflow], [true, 'scroll'], 'bloqueio e overflow');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const f = await c.ajuda();
    igual([f.ativo, f.bodyModal, f.bodyOverflow], ['botaoAjuda', false, 'scroll'], 'depois do ESC');
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.mouse.click(30, 450);   // fundo escurecido, fora da janela da Central (desktop)
    await esperarFechada(p);
    igual((await c.ajuda()).ativo, 'botaoAjuda', 'clique no fundo devolve o foco');
    await fim(c);
  });

  await teste('C2. [12, 13] abrir duas vezes não duplica a pilha (um ESC fecha); reexecutar o script da Central não duplica listeners; janelas operacionais continuam sem fechar por ESC nem por clique no fundo', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.evaluate(() => { EstruturaAjuda.abrir(''); EstruturaAjuda.abrir('ajuda-faq'); EstruturaAjuda.abrir('ajuda-glossario'); });
    igual((await c.ajuda()).secoes, ['ajuda-glossario'], 'navega sem reabrir');
    await p.keyboard.press('Escape');
    igual(await p.evaluate(() => ({ aberta: EstruturaAjuda.aberta(), body: document.body.classList.contains('modalAberto') })), { aberta: false, body: false }, 'um ESC fecha tudo o que a Central abriu');
    // Reexecuta o script da Central (inicialização repetida).
    const reexec = await p.evaluate(() => {
      const s = Array.from(document.scripts).find((x) => /Central de Ajuda \(1\.9\.0\): comportamento/.test(x.textContent));
      const antes = window.EstruturaAjuda;
      (0, eval)(s.textContent.replace(/^\s*<script>|<\/script>\s*$/g, ''));
      return antes === window.EstruturaAjuda;
    });
    verdade(reexec, 'a API não foi recriada');
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-faq"]');
    await p.click('#ajuda-faq-celular-p');
    igual(await p.evaluate(() => document.getElementById('ajuda-faq-celular-p').getAttribute('aria-expanded')), 'true', 'um clique = uma alternância');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    // Janelas operacionais: ficha e importação.
    await c.abrirFicha('PST1001');
    await p.keyboard.press('Escape');
    await p.mouse.click(5, 5);
    igual(await p.evaluate(() => !document.getElementById('modalDisciplina').hidden), true, 'ficha não fecha por ESC/fundo');
    await p.click('#modalDisciplina .modal__fechar');
    await p.click('[data-abrir-importacao]'); await p.waitForSelector('#modalImportacao:not([hidden])');
    await p.keyboard.press('Escape');
    await p.mouse.click(5, 5);
    igual(await p.evaluate(() => !document.getElementById('modalImportacao').hidden), true, 'importação não fecha por ESC/fundo');
    await fim(c);
  });

  /*==================================================================*/
  console.log('\n== D. Ajuda sobre janelas em uso (itens 7, 8, 9, 10, 11, 13)');

  await teste('D1. [7, 13] ajuda sobre a ficha com rascunho: Central no topo, Tab só nela; ESC fecha só a ajuda; rascunho, instância e nós da ficha preservados; foco volta ao gatilho; ESC/fundo seguem sem fechar a ficha; "Salvar" vale para a mesma ficha', async () => {
    const c = await montar();
    const p = c.pagina;
    await c.abrirFicha('PST1001');
    await p.fill('#fichaCampo-nome', 'Rascunho do nome');
    await p.fill('#fichaObservacoes', 'Observação em rascunho');
    await p.evaluate(() => { document.getElementById('fichaObservacoes').__marca = 'mesmo nó'; });
    await p.click('#modalDisciplina .modal__topo [data-gradip-help-open="ajuda-ficha"]');
    await esperarAberta(p);
    const s = await c.ajuda();
    igual([s.topo, s.secoes, s.ativoDentro], [true, ['ajuda-ficha'], true], 'Central no topo da ficha');
    const fichaTopo = await p.evaluate(() => Painel.Modal.noTopo(document.getElementById('modalDisciplina')));
    igual(fichaTopo, false, 'a ficha não está no topo');
    for (let k = 0; k < 30; k++) await p.keyboard.press('Tab');
    igual((await c.ajuda()).ativoDentro, true, 'Tab preso na Central');
    await p.screenshot({ path: path.join(SAIDA, '07-ajuda-sobre-ficha.png') });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const depois = await p.evaluate(() => ({
      ficha: !document.getElementById('modalDisciplina').hidden, fichaTopo: Painel.Modal.noTopo(document.getElementById('modalDisciplina')),
      nome: document.getElementById('fichaCampo-nome').value, obs: document.getElementById('fichaObservacoes').value, marca: document.getElementById('fichaObservacoes').__marca,
      alterada: Preparacao.fichaAlterada(), salvar: !document.getElementById('fichaSalvar').disabled,
      foco: document.activeElement.getAttribute('data-gradip-help-open'), body: document.body.classList.contains('modalAberto'), atual: Painel.estado.fichaAtual
    }));
    igual(depois, { ficha: true, fichaTopo: true, nome: 'Rascunho do nome', obs: 'Observação em rascunho', marca: 'mesmo nó', alterada: true, salvar: true, foco: 'ajuda-ficha', body: true, atual: 'PST1001' }, 'ficha preservada');
    // Ajuda de novo e clique no fundo da ajuda: fecha só a ajuda.
    await p.click('#modalDisciplinaCorpo [data-gradip-help-open="ajuda-ajustes"]'); await esperarAberta(p);
    await p.mouse.click(20, 450); await esperarFechada(p);
    igual(await p.evaluate(() => !document.getElementById('modalDisciplina').hidden), true, 'fundo da ajuda não fecha a ficha');
    await p.keyboard.press('Escape');
    await p.mouse.click(5, 5);
    igual(await p.evaluate(() => !document.getElementById('modalDisciplina').hidden && document.getElementById('fichaCampo-nome').value), 'Rascunho do nome', 'ESC/fundo continuam sem fechar a ficha');
    const n = await c.respostas();
    await p.click('#fichaSalvar');
    await c.esperarResposta(n + 1);
    const aviso = await p.evaluate(() => document.getElementById('aviso').textContent);
    igual(aviso, 'Alterações salvas.', 'resposta aplicada à MESMA instância da ficha (sem prefixo de outra disciplina)');
    igual(c.amb.ctx.obterDadosPainel().dados.preparacao.ajustes.find((a) => a.chave === 'PST1001').campos.nome, 'Rascunho do nome', 'gravado na base');
    await fim(c);
  });

  await teste('D2. [8] ajuda sobre a importação de PDF (OCR) com revisão paginada: arquivo lido, prévia, página atual e páginas abertas preservadas; nenhuma chamada nova; depois, revisão completa e gravação', async () => {
    const par = parSintetico(MODELO, 151);   // 302 valores só do PDF → 4 páginas de revisão
    const c = await montar({ base: false, preparar: (amb) => {
      pedir(amb.ctx.obterDadosPainel());
      const pc = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(par.csv))));
      pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(par.csv)), pc.assinatura, { operacao: pc.operacao }));
    } });
    const p = c.pagina;
    await p.evaluate((pac) => { window.Importacao.abrirComPacote(pac); }, par.pdfOcr);
    await p.waitForSelector('#importacaoCorpo [data-gradip-help-open="ajuda-conferencia-pdf"]');
    await p.click('[data-imp="previa"]');
    await p.waitForSelector('#revisaoLista .paginacaoRevisao');
    await p.click('#revisaoLista nav:first-of-type [data-imp="rev-proxima"]');
    await p.waitForFunction(() => /Página 2 de 4/.test(document.getElementById('revisaoLista').textContent) && !/Carregando/.test(document.getElementById('revisaoLista').textContent));
    const foto = () => p.evaluate(() => ({ lista: document.getElementById('revisaoLista').textContent.slice(0, 120), progresso: document.getElementById('revisaoProgresso').textContent, caixa: document.getElementById('confirmarRevisao').disabled, gravar: document.querySelector('[data-imp="gravar"]').disabled, passo: document.querySelector('.passos [aria-current="step"]').textContent, aberta: !document.getElementById('modalImportacao').hidden, marca: document.getElementById('revisaoLista').__marca }));
    await p.evaluate(() => { document.getElementById('revisaoLista').__marca = 'mesmo nó'; });
    const antes = await foto();
    const chamadasAntes = c.chamadas.length;
    await p.click('#importacaoCorpo [data-gradip-help-open="ajuda-conferencia-pdf-revisao"]');
    await esperarAberta(p);
    igual((await c.ajuda()).secoes, ['ajuda-conferencia-pdf'], 'seção da revisão');
    await buscar(p, 'OCR');
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-importar"]');
    await p.screenshot({ path: path.join(SAIDA, '08-ajuda-sobre-importacao.png') });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const depois = await foto();
    igual(depois, antes, 'estado da importação');
    igual(c.chamadas.length - chamadasAntes, 0, 'nenhuma chamada');
    igual((await c.ajuda()).ativo, 'ajuda-conferencia-pdf-revisao', 'foco devolvido ao gatilho');
    for (let k = 3; k <= 4; k++) {
      await p.click('#revisaoLista nav:first-of-type [data-imp="rev-proxima"]');
      await p.waitForFunction((n) => new RegExp('Página ' + n + ' de 4').test(document.getElementById('revisaoLista').textContent) && !/Carregando/.test(document.getElementById('revisaoLista').textContent), k);
    }
    await p.check('#confirmarRevisao');
    await p.click('[data-imp="gravar"]');
    await p.waitForFunction(() => /Importação gravada/.test(document.getElementById('importacaoCorpo').textContent), null, { timeout: 15000 });
    await fim(c);
  });

  await teste('D3. [9] ajuda sobre a conferência do envio: botão de envio continua habilitado e intocado, sem nova prévia nem envio durante a ajuda; depois, o envio usa a MESMA conferência e é aceito', async () => {
    const c = await montar({ grade: true });
    const p = c.pagina;
    await p.click('#etapa-4');
    await p.selectOption('#gradeSemestre', '1'); await p.selectOption('#gradeAno', '2027');
    await p.click('#enviarGradePreenchimento');
    await p.waitForSelector('[data-confirmar-envio]:not([disabled])');
    const previas = () => c.chamadas.filter((x) => x === 'previaEnvioGrade').length;
    const envios = () => c.chamadas.filter((x) => x === 'enviarGradeParaPreenchimento').length;
    const p0 = previas();
    await p.evaluate(() => { document.getElementById('envioGradeCorpo').__marca = 'mesmo nó'; });
    await p.click('#envioGradeCorpo [data-gradip-help-open="ajuda-envio-grade-efeitos"]');
    await esperarAberta(p);
    for (let k = 0; k < 40; k++) { await p.keyboard.press('Tab'); }
    igual((await c.ajuda()).ativoDentro, true, 'Tab não chega ao botão de envio');
    await p.keyboard.press('Enter');   // aciona o que estiver focado DENTRO da Central
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-envio-grade"]');
    await p.screenshot({ path: path.join(SAIDA, '09-ajuda-sobre-envio.png') });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const s = await p.evaluate(() => ({ habilitado: !document.querySelector('[data-confirmar-envio]').disabled, invalido: !!document.querySelector('[data-envio-invalido]'), marca: document.getElementById('envioGradeCorpo').__marca, foco: document.activeElement.getAttribute('data-gradip-help-open'), janela: !document.getElementById('modalEnvioGrade').hidden }));
    igual(s, { habilitado: true, invalido: false, marca: 'mesmo nó', foco: 'ajuda-envio-grade-efeitos', janela: true }, 'conferência intacta');
    igual([previas() - p0, envios()], [0, 0], 'nenhuma prévia nova nem envio');
    await p.click('[data-confirmar-envio]');
    await p.waitForFunction(() => !document.getElementById('modalEnvioGrade').hidden && /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
    igual(envios(), 1, 'um envio');
    await fim(c);
  });

  await teste('D4. [10, 11] resposta ATRASADA do "Salvar" com a ajuda aberta: a ficha é redesenhada (o gatilho some) e o foco que a ficha pediria não sai da Central; ao fechar, o foco vai ao título da ficha (retorno seguro)', async () => {
    const c = await montar({ segurar: ['salvarDisciplina'] });
    const p = c.pagina;
    await c.abrirFicha('PST1001');
    await p.fill('#fichaObservacoes', 'Gravada com a ajuda aberta');
    await p.click('#fichaSalvar');
    await c.esperarFila(1);
    await p.click('#modalDisciplinaCorpo [data-gradip-help-open="ajuda-ajustes"]');
    await esperarAberta(p);
    await c.liberar(0);
    await p.waitForFunction(() => /Alterações salvas/.test(document.getElementById('aviso').textContent));
    const durante = await c.ajuda();
    const gatilhoExiste = await p.evaluate(() => document.querySelectorAll('#modalDisciplinaCorpo [data-gradip-help-open="ajuda-ajustes"]').length);
    igual([durante.aberta, durante.topo, durante.ativoDentro], [true, true, true], 'foco continua na Central');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const depois = await p.evaluate(() => ({ foco: document.activeElement.id, obs: document.getElementById('fichaObservacoes').value, ficha: !document.getElementById('modalDisciplina').hidden }));
    igual(depois, { foco: 'modalDisciplinaTitulo', obs: 'Gravada com a ajuda aberta', ficha: true }, 'retorno seguro');
    verdade(gatilhoExiste === 1, 'a ficha foi redesenhada com um gatilho novo (o antigo não existe mais): ' + gatilhoExiste);
    await fim(c);
  });

  await teste('D5. [10] prévia do envio ATRASADA com a ajuda aberta: chega, habilita o envio e não puxa o foco; ao fechar, o foco volta ao gatilho do topo da janela', async () => {
    const c = await montar({ grade: true, segurar: ['previaEnvioGrade'] });
    const p = c.pagina;
    await p.click('#etapa-4');
    await p.selectOption('#gradeSemestre', '1'); await p.selectOption('#gradeAno', '2027');
    await p.click('#enviarGradePreenchimento');
    await c.esperarFila(1);
    await p.click('#modalEnvioGrade .modal__topo [data-gradip-help-open="ajuda-envio-grade"]');
    await esperarAberta(p);
    await c.liberar(0);
    await p.waitForSelector('[data-confirmar-envio]:not([disabled])');
    const durante = await c.ajuda();
    igual([durante.ativoDentro, durante.topo], [true, true], 'foco na Central');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual(await p.evaluate(() => [document.activeElement.getAttribute('data-gradip-help-open'), !document.querySelector('[data-confirmar-envio]').disabled]), ['ajuda-envio-grade', true], 'retorno ao gatilho e envio habilitado');
    await fim(c);
  });

  await teste('D6. [11] gatilho removido da página enquanto a ajuda estava aberta (sem janela por trás): ao fechar, o foco vai ao conteúdo principal; com a ficha fechada por uma resposta atrasada, o foco vai ao ponto pedido pela página', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#painel-disciplinas [data-gradip-help-open="ajuda-consultar"]'); await esperarAberta(p);
    await p.evaluate(() => { document.querySelector('#painel-disciplinas [data-gradip-help-open="ajuda-consultar"]').remove(); });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual(await p.evaluate(() => document.activeElement.id), 'conteudo', 'conteúdo principal');
    // Operação em andamento ("Excluindo…"): a camada de carregamento continua bloqueando — a ajuda não fura a barreira.
    const c2 = await montar({ segurar: ['excluirDisciplinas'] });
    const p2 = c2.pagina;
    await c2.abrirFicha('PST1003');
    await p2.click('#fichaExcluir');
    await c2.esperarFila(1);
    const barreira = await p2.evaluate(() => { const g = document.querySelector('#modalDisciplina .modal__topo [data-gradip-help-open="ajuda-ficha"]'); g.scrollIntoView({ block: 'center' }); const b = g.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!(el && el.closest('#carregando')); });
    verdade(barreira, 'a camada "carregando" cobre o gatilho durante a operação');
    await c2.liberar(0);
    await p2.waitForFunction(() => document.getElementById('modalDisciplina').hidden && document.getElementById('carregando').hidden);
    // A janela de origem fechada por um callback enquanto a ajuda está aberta (simulado: fechar a ficha por trás).
    await c2.abrirFicha('PST1001');
    await p2.click('#modalDisciplina .modal__topo [data-gradip-help-open="ajuda-ficha"]'); await esperarAberta(p2);
    await p2.evaluate(() => Painel.Modal.fechar(document.getElementById('modalDisciplina')));
    igual((await c2.ajuda()).ativoDentro, true, 'foco segue na Central');
    await p2.keyboard.press('Escape'); await esperarFechada(p2);
    const f = await p2.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, visivel: a.getClientRects().length > 0, naPagina: !!a.closest('#conteudo') }; });
    verdade(f.visivel && f.naPagina && f.tag !== 'BODY', 'foco num ponto visível da página: ' + JSON.stringify(f));
    await fim(c); await fim(c2);
  });

  /*==================================================================*/
  console.log('\n== E. Perfis, avisos fixos e resultado do envio (itens 14, 15, 16)');

  await teste('E1. [14] Leitor: Central completa (procedimentos de administrador rotulados), sem gatilhos de controles que ele não tem; abrir a ajuda não mostra etapas nem "Importar arquivo"; nenhuma chamada nova', async () => {
    const c = await montar({ perfil: 'leitor' });
    const p = c.pagina;
    const vis = await p.evaluate(() => {
      const visivel = (el) => !!el && el.getClientRects().length > 0;
      return {
        etapas: visivel(document.getElementById('etapas')), acoes: visivel(document.getElementById('acoesGrade')), importar: !!document.querySelector('[data-abrir-importacao]'),
        gatilhosVisiveis: Array.from(document.querySelectorAll('[data-gradip-help-open]')).filter((b) => !document.getElementById('centralAjuda').contains(b) && visivel(b)).map((b) => b.getAttribute('data-gradip-help-open')).sort()
      };
    });
    igual([vis.etapas, vis.acoes, vis.importar], [false, false, false], 'controles de administrador ocultos');
    verdade(!vis.gatilhosVisiveis.some((d) => /nova-grade|preparar|outros-cursos|lista-grade|previa-grade|envio-grade/.test(d)), 'gatilhos de administrador visíveis: ' + vis.gatilhosVisiveis);
    const n0 = c.chamadas.length;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.click('.centralAjuda__atalho >> nth=4');
    const s = await c.ajuda();
    const perfil = await p.evaluate(() => document.querySelector('#ajuda-preparar .centralAjuda__secaoTitulo .centralAjuda__perfil').textContent);
    igual([s.secoes, perfil], [['ajuda-preparar'], 'Administrador'], 'conteúdo administrativo explicado e rotulado');
    await p.screenshot({ path: path.join(SAIDA, '10-leitor-ajuda.png') });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const depois = await p.evaluate(() => ({ etapas: !document.getElementById('etapas').hidden, importar: !!document.querySelector('[data-abrir-importacao]') }));
    igual([depois, c.chamadas.length - n0], [{ etapas: false, importar: false }, 0], 'sem ampliação de permissão e sem chamadas');
    await fim(c);
  });

  await teste('E2. [14] conta sem acesso: o erro do servidor aparece com o gatilho de ajuda e a Central abre em "Conta e permissões"', async () => {
    const c = await montar({ perfil: 'semAcesso' });
    const p = c.pagina;
    const t = await p.evaluate(() => document.getElementById('estadoBase').textContent);
    verdade(/não tem acesso/.test(t), t);
    await p.click('#estadoBase [data-gradip-help-open="ajuda-acesso"]'); await esperarAberta(p);
    igual((await c.ajuda()).secoes, ['ajuda-acesso'], 'seção');
    await fim(c);
  });

  await teste('E3. [15] ação em lote PENDENTE (falha real injetada): o aviso fixo tem "Concluir" e o gatilho; abrir e fechar a ajuda não conclui, não descarta, não chama o servidor e não muda o aviso', async () => {
    const OU = 'Disciplinas para outros cursos';
    const c = await montar({ preparar: (amb) => { amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === OU, 99); amb.ctx.excluirDisciplinas([E('PST1001'), { origem: 'outros', chave: 'PST2001' }], true); } });
    const p = c.pagina;
    const aviso = () => p.evaluate(() => { const el = document.getElementById('salvamentoPendente'); return { visivel: !el.hidden, texto: el.textContent, concluir: !!el.querySelector('[data-concluir-lote]') }; });
    const a0 = await aviso();
    verdade(a0.visivel && a0.concluir && /Ação em lote pendente/.test(a0.texto), JSON.stringify(a0));
    const n0 = c.chamadas.length;
    await p.click('#salvamentoPendente [data-gradip-help-open="ajuda-pendencias"]'); await esperarAberta(p);
    igual((await c.ajuda()).secoes, ['ajuda-pendencias'], 'seção');
    await p.screenshot({ path: path.join(SAIDA, '11-pendencia-ajuda.png') });
    await p.click('[data-gradip-help-close]'); await esperarFechada(p);
    igual([await aviso(), c.chamadas.length - n0], [a0, 0], 'aviso e servidor intocados');
    await fim(c);
  });

  await teste('E4. [15] ação concluída com leituraFalhou (resposta controlada): aviso "Gravação concluída — Recarregue a página" com o gatilho; a ajuda não o limpa nem recarrega', async () => {
    const OU = 'Disciplinas para outros cursos';
    const c = await montar({ segurar: ['resolverLotePendente'], preparar: (amb) => { amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === OU, 99); amb.ctx.excluirDisciplinas([E('PST1001'), { origem: 'outros', chave: 'PST2001' }], true); } });
    const p = c.pagina;
    await p.click('[data-concluir-lote]');
    await c.esperarFila(1);
    await c.liberar(0, { resposta: { ok: true, dados: { resultado: 'concluido', nome: 'Excluir', preparacao: null, leituraFalhou: true } } });
    const aviso = () => p.evaluate(() => { const el = document.getElementById('salvamentoPendente'); return { visivel: !el.hidden, texto: el.textContent }; });
    const a0 = await aviso();
    verdade(a0.visivel && /Recarregue a página/.test(a0.texto), JSON.stringify(a0));
    const n0 = c.chamadas.length;
    await p.click('#salvamentoPendente [data-gradip-help-open="ajuda-pendencias"]'); await esperarAberta(p);
    await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-pendencias"]');
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual([await aviso(), c.chamadas.length - n0, await p.evaluate(() => document.getElementById('carregando').hidden)], [a0, 0, true], 'aviso intocado, sem recarga');
    await fim(c);
  });

  await teste('E5. [16] resultado REAL do envio: auditoria só como texto (sem link, sem endereço), link https da cópia; gatilhos "Como as secretarias preenchem" e "A cópia e a auditoria" funcionam no resultado', async () => {
    const c = await montar({ grade: true });
    const p = c.pagina;
    await p.click('#etapa-4');
    await p.selectOption('#gradeSemestre', '1'); await p.selectOption('#gradeAno', '2027');
    await p.click('#enviarGradePreenchimento');
    await p.waitForSelector('[data-confirmar-envio]:not([disabled])');
    await p.click('[data-confirmar-envio]');
    await p.waitForFunction(() => !document.getElementById('modalEnvioGrade').hidden && /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
    const r = await p.evaluate(() => {
      const corpo = document.getElementById('envioGradeCorpo');
      return { links: Array.from(corpo.querySelectorAll('a')).map((a) => ({ href: a.getAttribute('href'), texto: a.textContent })), aud: Array.from(corpo.querySelectorAll('p')).map((x) => x.textContent).find((x) => /^Auditoria:/.test(x)) || null, gatilhos: Array.from(corpo.querySelectorAll('[data-gradip-help-open]')).map((b) => b.getAttribute('data-gradip-help-open')) };
    });
    const idAud = (c.amb.indiceGrades().getSheets()[0].getRange(1, 1, 10, 3).getValues().filter((l) => String(l[0]).replace(/^'/, '') === '2027/1' && l[2])[0] || [])[2];
    const endereco = idAud ? c.amb.planilhas.get(idAud).getUrl() : null;
    verdade(r.aud && /Auditoria - Grade Horária - 1º semestre de 2027/.test(r.aud), 'auditoria como texto: ' + r.aud);
    verdade(!r.links.some((l) => /auditoria/i.test(l.texto) || (endereco && l.href === endereco)), 'sem link da auditoria: ' + JSON.stringify(r.links));
    verdade(endereco && !(await p.content()).includes(endereco), 'endereço da auditoria fora da página');
    verdade(r.links.length === 1 && /^https:\/\//.test(r.links[0].href) && /cópia de/.test(r.links[0].texto), 'link da cópia: ' + JSON.stringify(r.links));
    verdade(r.gatilhos.includes('ajuda-secretarias') && r.gatilhos.includes('ajuda-envio-grade-copia'), JSON.stringify(r.gatilhos));
    await p.click('#envioGradeCorpo [data-gradip-help-open="ajuda-secretarias"]'); await esperarAberta(p);
    igual((await c.ajuda()).secoes, ['ajuda-secretarias'], 'guia das secretarias');
    await p.screenshot({ path: path.join(SAIDA, '12-resultado-envio-ajuda.png') });
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual(await p.evaluate(() => !document.getElementById('modalEnvioGrade').hidden), true, 'resultado continua aberto');
    await fim(c);
  });

  /*==================================================================*/
  console.log('\n== F. Larguras, zoom, temas e contraste (item 18)');

  /** Medidas de layout e contraste da Central aberta. */
  const medir = (p) => p.evaluate(() => {
    const lum = (rgb) => { const a = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const cor = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { rgb: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 }; };
    const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const c = cor(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c.rgb; } return [255, 255, 255]; };
    const razao = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
    const texto = (sel) => { const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return null; return Math.round(razao(cor(getComputedStyle(el).color).rgb, fundo(el)) * 100) / 100; };
    const borda = (sel) => { const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return null; return Math.round(razao(cor(getComputedStyle(el).borderTopColor).rgb, fundo(el.parentElement)) * 100) / 100; };
    const j = document.getElementById('centralAjudaJanela').getBoundingClientRect();
    const dentro = (sel) => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
    const transborda = Array.from(document.querySelectorAll('#centralAjuda *')).filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > innerWidth + 1).map((el) => el.className || el.tagName).slice(0, 5);
    return {
      tema: document.documentElement.getAttribute('data-theme'),
      fundoJanela: getComputedStyle(document.getElementById('centralAjudaJanela')).backgroundColor,
      horizontal: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
      transborda, janelaCabe: j.left >= -1 && j.right <= innerWidth + 1 && j.top >= -1 && j.bottom <= innerHeight + 1,
      fecharVisivel: dentro('[data-gradip-help-close]'), buscaVisivel: dentro('#centralAjudaBusca'),
      contraste: {
        titulo: texto('#centralAjudaTitulo'), sobretitulo: texto('.centralAjuda__sobretitulo'), dica: texto('.centralAjuda__dica'),
        corpo: texto('#centralAjudaConteudo [data-gradip-help-section]:not([hidden]) .centralAjuda__item p, #ajuda-inicio > p'),
        link: texto('#centralAjudaConteudo :not([hidden]) > * .centralAjuda__link, #ajuda-inicio .centralAjuda__link'),
        perfil: texto('.centralAjuda__perfil'), atalho: texto('.centralAjuda__atalho'), indiceAtual: texto('#centralAjudaIndice button[aria-current="true"]'),
        indiceGrupo: texto('.centralAjuda__indiceGrupo'), botao: texto('.centralAjuda__fechar'),
        bordaCampo: borda('#centralAjudaBusca'), bordaBotao: borda('.centralAjuda__fechar')
      }
    };
  });

  for (const esquema of ['light', 'dark']) {
    for (const largura of [360, 390, 480, 768, 1280]) {
      await teste('F1. [18] ' + largura + ' px, tema ' + (esquema === 'dark' ? 'escuro' : 'claro') + ': sem rolagem horizontal; janela na tela; "Fechar" e busca alcançáveis; contraste ≥ 4,5:1 (texto) e ≥ 3:1 (bordas de controle); cabeçalho do painel sem transbordar', async () => {
        const c = await montar({ largura, altura: largura < 768 ? 780 : 900, esquema });
        const p = c.pagina;
        const cab = await p.evaluate(() => { const h = document.querySelector('.cabecalho'); const b = document.getElementById('botaoAjuda').getBoundingClientRect(); return { transborda: h.scrollWidth > h.clientWidth + 1, botaoNaTela: b.right <= innerWidth + 1 && b.left >= 0, nome: document.getElementById('botaoAjuda').textContent.replace(/\s+/g, ' ').trim() }; });
        verdade(!cab.transborda && cab.botaoNaTela && /Ajuda/.test(cab.nome), 'cabeçalho: ' + JSON.stringify(cab));
        await p.click('#botaoAjuda'); await esperarAberta(p);
        const vistas = [['inicio', null], ['envio', 'ajuda-envio-grade'], ['problemas', 'ajuda-problemas']];
        for (const [nome, destino] of vistas) {
          if (destino) await p.evaluate((d) => EstruturaAjuda.abrir(d), destino);
          const m = await medir(p);
          const tx = m.contraste;
          const baixos = Object.keys(tx).filter((k) => tx[k] !== null && (/^borda/.test(k) ? tx[k] < 3 : tx[k] < 4.5)).map((k) => k + '=' + tx[k]);
          verdade(!m.horizontal && !m.transborda.length && m.janelaCabe && m.fecharVisivel && m.buscaVisivel, nome + ' layout: ' + JSON.stringify(m));
          igual(baixos, [], nome + ' contraste ' + JSON.stringify(tx));
          igual(m.tema, esquema, 'tema');
          if (nome === 'inicio' || (largura === 360 && nome === 'envio')) await p.screenshot({ path: path.join(SAIDA, 'F-' + largura + '-' + (esquema === 'dark' ? 'escuro' : 'claro') + '-' + nome + '.png') });
        }
        if (largura <= 768) {
          // Índice recolhível nas telas estreitas.
          const fechado = await p.evaluate(() => getComputedStyle(document.getElementById('centralAjudaIndice')).display === 'none' && document.getElementById('centralAjudaAlternarIndice').getAttribute('aria-expanded'));
          igual(fechado, 'false', 'índice recolhido');
          await p.click('#centralAjudaAlternarIndice');
          const aberto = await p.evaluate(() => ({ exp: document.getElementById('centralAjudaAlternarIndice').getAttribute('aria-expanded'), vis: getComputedStyle(document.getElementById('centralAjudaIndice')).display !== 'none', foco: !!document.activeElement.closest('#centralAjudaIndice') }));
          igual(aberto, { exp: 'true', vis: true, foco: true }, 'índice aberto');
          if (largura === 360) await p.screenshot({ path: path.join(SAIDA, 'F-360-' + (esquema === 'dark' ? 'escuro' : 'claro') + '-indice.png') });
          await p.click('#centralAjudaIndice [data-gradip-help-target="ajuda-faq"]');
          igual(await p.evaluate(() => getComputedStyle(document.getElementById('centralAjudaIndice')).display), 'none', 'índice fecha ao navegar');
        }
        await fim(c);
      });
    }
  }

  await teste('F2. [18] zoom de 200% (viewport CSS de 640 × 450 a partir de 1280 × 900): Central utilizável, sem rolagem horizontal, busca e "Fechar" visíveis', async () => {
    const c = await montar({ largura: 640, altura: 450 });
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-envio-grade-resultado'));
    const m = await medir(p);
    verdade(!m.horizontal && !m.transborda.length && m.janelaCabe && m.fecharVisivel && m.buscaVisivel, JSON.stringify(m));
    await p.screenshot({ path: path.join(SAIDA, 'F-zoom200.png') });
    await fim(c);
  });

  await teste('F3. [18] troca de tema COM A CENTRAL ABERTA: Escuro e Claro pela API do tema; em "Sistema", a troca do sistema operacional muda a Central na hora; contraste mantido', async () => {
    const c = await montar({ esquema: 'light' });
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const fundo = () => p.evaluate(() => [document.documentElement.getAttribute('data-theme'), getComputedStyle(document.getElementById('centralAjudaJanela')).backgroundColor]);
    const f0 = await fundo();
    await p.evaluate(() => GradipTheme.setPreference('dark'));
    const f1 = await fundo();
    await p.evaluate(() => GradipTheme.setPreference('system'));
    const f2 = await fundo();
    await p.emulateMedia({ colorScheme: 'dark' });
    await p.waitForTimeout(50);
    const f3 = await fundo();
    const m = await medir(p);
    igual([f0[0], f1[0], f2[0], f3[0]], ['light', 'dark', 'light', 'dark'], 'tema resolvido');
    verdade(f0[1] !== f1[1] && f2[1] === f0[1] && f3[1] === f1[1], 'fundo acompanha: ' + JSON.stringify([f0, f1, f2, f3]));
    const baixos = Object.keys(m.contraste).filter((k) => m.contraste[k] !== null && (/^borda/.test(k) ? m.contraste[k] < 3 : m.contraste[k] < 4.5));
    igual(baixos, [], 'contraste depois da troca: ' + JSON.stringify(m.contraste));
    igual(await p.evaluate(() => EstruturaAjuda.aberta()), true, 'continua aberta');
    await p.screenshot({ path: path.join(SAIDA, 'F-troca-tema-escuro.png') });
    await fim(c);
  });

  await teste('F4. [18] prefers-reduced-motion: o ícone da FAQ não anima', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-faq'));
    const d = await p.evaluate(() => getComputedStyle(document.querySelector('.centralAjuda__faqChevron')).transitionDuration);
    verdade(/^0s|0\.00001s|1e-05s$/.test(d) || parseFloat(d) < 0.001, 'duração: ' + d);
    await fim(c);
  });

  /*==================================================================*/
  // (1.9.1) Navegação por Tab a partir de títulos focados por programa
  // (tabindex="-1") e circulação na Central — Tab/Shift+Tab REAIS do
  // Chromium (page.keyboard.press). O ponto de partida pode ser posto por
  // programa (abrir o assunto, focar um controle); cada passo é uma tecla.
  // As sequências focadas vão para saida/ajuda/sequencias_foco.txt.
  console.log('\n== G. Teclado: Tab e Shift+Tab a partir de títulos e circulação (1.9.1; T01–T07)');
  const SEQ = path.join(SAIDA, 'sequencias_foco.txt');
  fs.writeFileSync(SEQ, '# Sequências de foco (Chromium ' + nav.version() + '; fonte ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src') + '; teclas reais)\n');
  const anotarSeq = (titulo, linhas) => fs.appendFileSync(SEQ, '\n## ' + titulo + '\n' + linhas.map((l) => '  ' + l).join('\n') + '\n');
  /** Elemento focado: descrição e marca de identidade (estável na página). */
  const focado = (p) => p.evaluate(() => {
    const a = document.activeElement, r = document.getElementById('centralAjuda');
    const marca = (el) => el.__marcaFoco || (el.__marcaFoco = 'f' + (window.__nMarca = (window.__nMarca || 0) + 1));
    return { marca: marca(a), tag: a.tagName, id: a.id || null, alvo: a.getAttribute('data-gradip-help-target'), tabindex: a.getAttribute('tabindex'),
      texto: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 48), dentro: r.contains(a), visivel: a.getClientRects().length > 0, emOculto: !!(a.closest('[hidden]')) };
  });
  const rotulo = (f) => (f.dentro ? '' : 'FORA ') + f.tag + (f.id ? '#' + f.id : '') + (f.alvo ? '[' + f.alvo + ']' : '') + (f.tabindex === '-1' ? '(tabindex=-1)' : '') + ' "' + f.texto + '"';
  /**
   * Controle esperado depois (dir = 1) ou antes (dir = -1) do elemento focado,
   * calculado SEM o código do painel: controles da Central que entram na
   * ordem de Tab (sem tabindex="-1", habilitados, visíveis), na ordem do
   * documento; sem nenhum na direção pedida, a outra ponta.
   */
  const esperado = (p, dir) => p.evaluate((d) => {
    const r = document.getElementById('centralAjuda'), a = document.activeElement;
    const marca = (el) => el.__marcaFoco || (el.__marcaFoco = 'f' + (window.__nMarca = (window.__nMarca || 0) + 1));
    const ctl = Array.from(r.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]'))
      .filter((x) => x.getAttribute('tabindex') !== '-1' && !x.disabled && x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden');
    let alvo = null;
    if (d > 0) alvo = ctl.find((x) => a.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING) || ctl[0];
    else alvo = ctl.slice().reverse().find((x) => a.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_PRECEDING) || ctl[ctl.length - 1];
    return { marca: marca(alvo), primeiro: marca(ctl[0]), ultimo: marca(ctl[ctl.length - 1]), total: ctl.length };
  }, dir);
  /** n teclas; cada passo: dentro da Central, visível, fora de [hidden] e diferente do anterior. */
  async function percorrer(p, tecla, n, linhas) {
    let ant = await focado(p);
    const vistos = new Set([ant.marca]);
    for (let k = 0; k < n; k++) {
      await p.keyboard.press(tecla);
      const f = await focado(p);
      linhas.push(tecla + ' → ' + rotulo(f));
      verdade(f.dentro, tecla + ' ' + (k + 1) + ': o foco saiu da Central (' + rotulo(f) + ')');
      verdade(f.visivel && !f.emOculto, tecla + ' ' + (k + 1) + ': foco num elemento oculto (' + rotulo(f) + ')');
      verdade(f.marca !== ant.marca, tecla + ' ' + (k + 1) + ': o foco ficou parado em ' + rotulo(f));
      vistos.add(f.marca); ant = f;
    }
    return vistos.size;
  }
  /** Do título focado: uma tecla leva ao controle esperado. */
  async function passoDoTitulo(p, tecla, linhas) {
    const ini = await focado(p);
    const e = await esperado(p, tecla === 'Tab' ? 1 : -1);
    await p.keyboard.press(tecla);
    const f = await focado(p);
    linhas.push(rotulo(ini) + ' —' + tecla + '→ ' + rotulo(f));
    igual([f.dentro, f.marca], [true, e.marca], tecla + ' a partir de ' + rotulo(ini) + ' devia ir ao controle esperado, foi a ' + rotulo(f));
    return { ini, f, e };
  }

  for (const destino of ['ajuda-glossario-semestre', 'ajuda-curriculos-anteriores', 'ajuda-ajustes-gravando']) {
    await teste('G1. [T01] ' + destino + ': o título focado ao abrir; Tab REAL sai do título para o próximo controle (ou circula) e segue andando; Shift+Tab idem; o foco nunca sai da Central nem fica parado', async () => {
      const c = await montar();
      const p = c.pagina;
      if (destino === 'ajuda-glossario-semestre') await p.click('#filtros [data-gradip-help-open="ajuda-glossario-semestre"]');   // gatilho real
      else await p.evaluate((d) => EstruturaAjuda.abrir(d), destino);                                                                // posição pela API pública
      await esperarAberta(p);
      const t0 = await focado(p);
      igual([t0.tag, t0.tabindex, t0.dentro], ['H4', '-1', true], 'foco inicial no título do assunto');
      const linhas = ['inicial: ' + rotulo(t0)];
      await passoDoTitulo(p, 'Tab', linhas);
      const n1 = await percorrer(p, 'Tab', 8, linhas);
      await p.evaluate((d) => EstruturaAjuda.abrir(d), destino);
      igual((await focado(p)).marca, t0.marca, 'reaberto no mesmo título');
      await passoDoTitulo(p, 'Shift+Tab', linhas);
      const n2 = await percorrer(p, 'Shift+Tab', 8, linhas);
      anotarSeq('G1 ' + destino, linhas);
      verdade(n1 >= 6 && n2 >= 6, 'progresso: ' + n1 + ' e ' + n2 + ' elementos distintos');
      await fim(c);
    });
  }

  await teste('G2. [T02, T04] título COM controles depois dele (ajuda-lista-grade-ficha): Tab vai ao link seguinte do próprio artigo; Shift+Tab ao controle anterior; diálogo focado por programa: Shift+Tab circula para o último controle e Tab para o primeiro', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-lista-grade-ficha'));
    const linhas = [];
    const { f } = await passoDoTitulo(p, 'Tab', linhas);
    igual(f.alvo, 'ajuda-pendencias', 'o link "Pendências e gravações" do artigo');
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-lista-grade-ficha'));
    await passoDoTitulo(p, 'Shift+Tab', linhas);
    // Elemento focado por programa que contém tudo (a janela do diálogo, tabindex=-1).
    await p.evaluate(() => document.getElementById('centralAjudaJanela').focus());
    const r1 = await passoDoTitulo(p, 'Shift+Tab', linhas);
    igual(r1.f.marca, r1.e.ultimo, 'Shift+Tab sem controle antes → último');
    await p.evaluate(() => document.getElementById('centralAjudaJanela').focus());
    const r2 = await passoDoTitulo(p, 'Tab', linhas);
    igual(r2.f.marca, r2.e.primeiro, 'Tab a partir da janela → primeiro controle');
    anotarSeq('G2 títulos com controles e janela', linhas);
    await fim(c);
  });

  await teste('G3. [T03, T05] título SEM controles depois dele: Tab circula para o primeiro controle ("Início"); primeiro e último controles circulam nas duas direções', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-glossario-semestre'));
    const linhas = [];
    const r = await passoDoTitulo(p, 'Tab', linhas);
    igual([r.f.marca, r.f.id], [r.e.primeiro, 'centralAjudaInicio'], 'circula para o primeiro controle');
    // Último controle → Tab → primeiro; primeiro → Shift+Tab → último.
    await p.evaluate(() => { const r = document.getElementById('centralAjuda'); const c = Array.from(r.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')).filter((x) => x.getAttribute('tabindex') !== '-1' && !x.disabled && x.getClientRects().length); c[c.length - 1].focus(); });
    const ult = await focado(p);
    await p.keyboard.press('Tab');
    const prim = await focado(p);
    const e = await esperado(p, 1);
    linhas.push(rotulo(ult) + ' —Tab→ ' + rotulo(prim));
    igual([prim.dentro, prim.id], [true, 'centralAjudaInicio'], 'último → primeiro');
    await p.keyboard.press('Shift+Tab');
    const volta = await focado(p);
    linhas.push(rotulo(prim) + ' —Shift+Tab→ ' + rotulo(volta));
    igual(volta.marca, ult.marca, 'primeiro → último');
    verdade(e.total > 10, 'controles visíveis: ' + e.total);
    anotarSeq('G3 título sem controles depois; pontas', linhas);
    await fim(c);
  });

  await teste('G4. [T06] busca (só resultados visíveis), limpeza, FAQ recolhida/aberta (desktop) e índice recolhido/aberto no celular (390 px): nenhum controle oculto recebe foco', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const linhas = [];
    await buscar(p, 'pendencia');
    await p.focus('#centralAjudaBusca');
    await percorrer(p, 'Tab', 14, linhas);
    await p.fill('#centralAjudaBusca', ''); await p.waitForTimeout(260);
    await p.focus('#centralAjudaBusca');
    await percorrer(p, 'Tab', 4, linhas);
    // FAQ: título da pergunta (botão) recolhida → Tab vai à próxima pergunta; aberta → ao link da resposta.
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-faq-conexao-repetir'));
    igual((await focado(p)).id, 'ajuda-faq-conexao-repetir-p', 'foco na pergunta');
    const r1 = await passoDoTitulo(p, 'Tab', linhas);
    verdade(/^ajuda-faq-.*-p$/.test(r1.f.id || ''), 'recolhida: próxima pergunta, foi ' + rotulo(r1.f));
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-faq-conexao-repetir'));
    await p.keyboard.press('Enter');
    igual(await p.evaluate(() => document.getElementById('ajuda-faq-conexao-repetir-p').getAttribute('aria-expanded')), 'true', 'aberta pelo teclado');
    const r2 = await passoDoTitulo(p, 'Tab', linhas);
    igual(r2.f.alvo, 'ajuda-mensagens-leitura-gravacao', 'aberta: o link da resposta');
    anotarSeq('G4 busca, limpeza e FAQ (1280 px)', linhas);
    await fim(c);
    // Celular: índice recolhido não recebe foco; aberto, recebe.
    const m = await montar({ largura: 390, altura: 780 });
    const q = m.pagina;
    await q.click('#botaoAjuda'); await esperarAberta(q);
    await q.evaluate(() => EstruturaAjuda.abrir('ajuda-glossario-semestre'));
    const lm = [];
    const r3 = await passoDoTitulo(q, 'Tab', lm);
    igual(r3.f.id, 'centralAjudaInicio', 'circula para "Início"');
    const naoIndice = [];
    for (let k = 0; k < 4; k++) { await q.keyboard.press('Tab'); const f = await focado(q); lm.push('Tab → ' + rotulo(f)); naoIndice.push(await q.evaluate(() => !!document.activeElement.closest('#centralAjudaIndice'))); }
    verdade(!naoIndice.some(Boolean), 'índice recolhido recebeu foco');
    await q.focus('#centralAjudaAlternarIndice');
    await q.keyboard.press('Enter');
    const f1 = await focado(q);
    lm.push('Enter no "Índice das seções" → ' + rotulo(f1));
    verdade(await q.evaluate(() => !!document.activeElement.closest('#centralAjudaIndice')), 'índice aberto: foco no primeiro assunto');
    await percorrer(q, 'Tab', 5, lm);
    anotarSeq('G4 celular 390 px: índice recolhido/aberto', lm);
    await fim(m);
  });

  await teste('G5. [T07] TODOS os destinos usados nos gatilhos: abrir põe o foco no título do destino, visível na área de leitura; Tab e Shift+Tab REAIS vão ao controle esperado (sem estacionar nem sair)', async () => {
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const destinos = Object.keys(destinosDaFonte()).filter((d) => d !== '(início)');
    const linhas = [];
    let parados = 0;
    for (const d of destinos) {
      await p.evaluate((x) => EstruturaAjuda.abrir(x), d);
      const pos = await p.evaluate((x) => {
        const a = document.activeElement, alvo = document.getElementById(x), area = document.getElementById('centralAjudaConteudo').getBoundingClientRect(), b = a.getBoundingClientRect();
        return { noAlvo: alvo.contains(a) || (alvo.hasAttribute('data-gradip-help-section') && a === alvo.querySelector('.centralAjuda__secaoTitulo')), titulo: a.getAttribute('tabindex') === '-1' || a.hasAttribute('data-gradip-help-faq-toggle'), naArea: b.top >= area.top - 1 && b.top < area.bottom };
      }, d);
      igual(pos, { noAlvo: true, titulo: true, naArea: true }, d + ': posição e foco');
      const t = await passoDoTitulo(p, 'Tab', linhas);
      if (t.f.marca === t.ini.marca) parados++;
      await p.evaluate((x) => EstruturaAjuda.abrir(x), d);
      await passoDoTitulo(p, 'Shift+Tab', linhas);
    }
    anotarSeq('G5 todos os destinos (' + destinos.length + ')', linhas);
    console.log('     fatos [G5]: ' + JSON.stringify({ destinos: destinos.length, parados }));
    verdade(destinos.length >= 49, 'destinos: ' + destinos.length);
    await fim(c);
  });

  await teste('G6. [T08–T10] com janelas por trás: ficha com rascunho (Tab só na Central, nada da ficha muda); resposta atrasada do "Salvar" (Tab continua andando; retorno seguro); janela aberta e fechada por callback SIMULADO (setTimeout) abaixo da Central: Central no topo, foco nela', async () => {
    const c = await montar({ segurar: ['salvarDisciplina'] });
    const p = c.pagina;
    await c.abrirFicha('PST1001');
    await p.fill('#fichaCampo-nome', 'Rascunho do teclado');
    await p.evaluate(() => { document.getElementById('fichaCampo-nome').__marca = 'mesmo nó'; });
    await p.click('#modalDisciplina .modal__topo [data-gradip-help-open="ajuda-ficha"]'); await esperarAberta(p);
    const linhas = [];
    await passoDoTitulo(p, 'Tab', linhas);
    await percorrer(p, 'Tab', 10, linhas);
    await percorrer(p, 'Shift+Tab', 10, linhas);
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual(await p.evaluate(() => ({ nome: document.getElementById('fichaCampo-nome').value, marca: document.getElementById('fichaCampo-nome').__marca, ficha: !document.getElementById('modalDisciplina').hidden, foco: document.activeElement.getAttribute('data-gradip-help-open') })),
      { nome: 'Rascunho do teclado', marca: 'mesmo nó', ficha: true, foco: 'ajuda-ficha' }, 'ficha intacta e foco no gatilho');
    // T09: resposta atrasada do Salvar com a Central aberta num título.
    await p.click('#fichaSalvar');
    await c.esperarFila(1);
    await p.click('#modalDisciplinaCorpo [data-gradip-help-open="ajuda-ajustes"]'); await esperarAberta(p);
    await c.liberar(0);
    await p.waitForFunction(() => /Alterações salvas/.test(document.getElementById('aviso').textContent));
    await percorrer(p, 'Tab', 6, linhas);
    await p.keyboard.press('Escape'); await esperarFechada(p);
    igual(await p.evaluate(() => document.activeElement.id), 'modalDisciplinaTitulo', 'retorno seguro (gatilho redesenhado)');
    await p.click('#modalDisciplina .modal__fechar');
    // T10: janela operacional aberta e fechada por callback SIMULADO enquanto a Central está no topo.
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-glossario-semestre'));
    await esperarAberta(p);
    await p.evaluate(() => new Promise((ok) => setTimeout(() => { Painel.Modal.abrir(document.getElementById('modalRecomeco')); ok(); }, 0)));
    const s1 = await c.ajuda();
    igual([s1.topo, s1.ativoDentro, await p.evaluate(() => !document.getElementById('modalRecomeco').hidden)], [true, true, true], 'Central no topo e com o foco; janela aberta por baixo');
    await passoDoTitulo(p, 'Tab', linhas);
    await percorrer(p, 'Tab', 4, linhas);
    await p.evaluate(() => new Promise((ok) => setTimeout(() => { Painel.Modal.fechar(document.getElementById('modalRecomeco')); ok(); }, 0)));
    const s2 = await c.ajuda();
    igual([s2.aberta, s2.topo, s2.ativoDentro], [true, true, true], 'fechar a janela de baixo não fecha a Central');
    await percorrer(p, 'Shift+Tab', 4, linhas);
    await p.keyboard.press('Escape'); await esperarFechada(p);
    const fim1 = await p.evaluate(() => { const a = document.activeElement; return { body: a === document.body, visivel: a.getClientRects().length > 0, modal: document.body.classList.contains('modalAberto') }; });
    igual(fim1, { body: false, visivel: true, modal: false }, 'foco num ponto visível; sem bloqueio');
    // A janela operacional continua sem fechar por ESC.
    await p.evaluate(() => Painel.Modal.abrir(document.getElementById('modalRecomeco')));
    await p.keyboard.press('Escape');
    igual(await p.evaluate(() => !document.getElementById('modalRecomeco').hidden), true, 'recomeço não fecha por ESC');
    anotarSeq('G6 janelas por trás', linhas);
    await fim(c);
  });

  /*==================================================================*/
  // (1.9.1) Fatos que as orientações A1–A3 descrevem, pelas funções REAIS do
  // servidor no simulador (sem navegador). A persistência é lida DIRETO da
  // planilha simulada, antes de qualquer abertura do painel.
  console.log('\n== H. Fatos por trás das orientações corrigidas (1.9.1; A1–A3) e texto');
  const metadado = (ss, k) => { const m = ss.meta.find((x) => x.k === k); return m ? m.v : null; };
  const abaEmUso = (amb, nome) => { const ss = amb.estrutura(); const m = JSON.parse(metadado(ss, 'estruturaCurricular.ativa')); return ss.sheets.find((s) => s.getSheetId() === m.abas[nome]); };
  const linhasDe = (aba) => { const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues(); return v.slice(1).map((l) => { const o = {}; v[0].forEach((t, i) => { if (t) o[t] = l[i]; }); return o; }); };
  function persistido(amb, chave) {
    const aj = linhasDe(amb.estrutura().getSheetByName('Ajustes manuais')).filter((a) => String(a['Disciplina (código no Júpiter)']) === chave);
    const d = linhasDe(abaEmUso(amb, 'Disciplinas')).find((x) => String(x['Código']) === chave);
    return { nome: aj[0] ? aj[0]['Nome ajustado'] || '' : '(sem ajuste)', naGrade: aj[0] ? aj[0]['Adicionada à grade horária'] || '' : '(sem ajuste)', obs: d ? String(d['Observações'] || '') : null, pendente: !!metadado(amb.estrutura(), 'estruturaCurricular.salvamento') };
  }
  function fichaCompleta(amb, chave, mudar, obs, extra) {
    const d = pedir(amb.ctx.obterDadosPainel());   // ANTES da falha: não há pendência a concluir
    const base = d.base.disciplinas.find((x) => x.codigo === chave);
    const campos = {};
    ['codigo', 'nome', 'departamento', 'creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'ext', 'atpa', 'versao'].forEach((k) => { const v = base[k]; campos[k] = v === null || v === undefined ? '' : String(v); });
    return Object.assign({ origem: 'estrutura', chave, campos: Object.assign(campos, mudar), oferta: null, observacoes: obs }, extra || {});
  }
  function ambienteH() {
    const amb = criarAmbiente({ dirSrc: FONTE, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
    prepararBase(amb);
    amb.criarPlanilhaGrade();
    return amb;
  }
  const falhaObservacao = (amb) => amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);

  await teste('H1. [A1] "Adicionar à Grade Horária" com nome e observação novos e a escrita da observação falhando: SALVAMENTO_PENDENTE com o nome ajustado e a marca da grade JÁ gravados e a observação faltando; uma recusa antes de gravar não aplica nada', async () => {
    const amb = ambienteH();
    const pedido = fichaCompleta(amb, '4701007', { nome: 'Interdepartamental renomeada' }, 'Observação pendente', { adicionarAGrade: true });
    falhaObservacao(amb);
    const r = amb.ctx.salvarDisciplina(pedido);
    const parcial = persistido(amb, '4701007');
    console.log('     fatos [H1]: ' + JSON.stringify({ resposta: r.codigo, persistido: parcial }));
    igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE'], 'resposta');
    igual(parcial, { nome: 'Interdepartamental renomeada', naGrade: 'Sim', obs: '', pendente: true }, 'parte gravada (nome e grade), observação faltando, pendência registrada');
    amb.limparFalhas();
    pedir(amb.ctx.resolverSalvamentoPendente({ acao: 'concluir' }));
    igual(persistido(amb, '4701007'), { nome: 'Interdepartamental renomeada', naGrade: 'Sim', obs: 'Observação pendente', pendente: false }, '"Concluir" grava só o que faltava');
    // Recusa antes da gravação (código já usado por outra disciplina): nada aplicado.
    const amb2 = ambienteH();
    const antes = persistido(amb2, '4701007');
    const r2 = amb2.ctx.salvarDisciplina(fichaCompleta(amb2, '4701007', { codigo: 'PST1001', nome: 'Não deve gravar' }, 'nem isto', { adicionarAGrade: true }));
    igual([r2.ok, persistido(amb2, '4701007')], [false, antes], 'recusa (' + r2.codigo + ') sem nenhuma escrita');
  });

  await teste('H2. [A2] "conferir o envio" (previaEnvioGrade) com um salvamento pendente e a falha já liberada: a conferência grava a observação que faltava, remove a pendência e devolve "recuperado"; um leitor abrindo o painel não conclui nada', async () => {
    const amb = ambienteH();
    const pedido = fichaCompleta(amb, 'PST1003', { nome: 'Eletiva renomeada' }, 'Observação que faltava');
    falhaObservacao(amb);
    igual(amb.ctx.salvarDisciplina(pedido).codigo, 'SALVAMENTO_PENDENTE');
    amb.limparFalhas();
    const leitor = criarAmbiente({ dirSrc: FONTE, reusar: amb, usuario: LEITOR, dono: ADMIN });
    const dl = pedir(leitor.ctx.obterDadosPainel());
    igual([persistido(amb, 'PST1003').pendente, persistido(amb, 'PST1003').obs, !!dl.salvamentoPendente], [true, '', true], 'leitor: continua pendente');
    const r = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    const depois = persistido(amb, 'PST1003');
    console.log('     fatos [H2]: ' + JSON.stringify({ recuperado: r.recuperado ? { codigo: r.recuperado.codigo, observacao: r.recuperado.observacao } : null, persistido: depois }));
    igual(depois, { nome: 'Eletiva renomeada', naGrade: 'Sim', obs: 'Observação que faltava', pendente: false }, 'a conferência concluiu o pedido anterior');
    verdade(r.recuperado && r.recuperado.codigo === 'PST1003', 'resposta traz recuperado');
    verdade(r.grupos && r.assinatura, 'e a conferência normal');
  });

  await teste('H3. [A3] reenvio do MESMO semestre sem resposta: depois de um envio concluído e de mudar nome/observação/créditos, a nova conferência tem os mesmos códigos e quantidades; sem executar a 2ª tentativa, a planilha tem o nome certo, os mesmos códigos e quantidades — e o conteúdo ANTERIOR', async () => {
    const amb = ambienteH();
    const c1 = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    pedir(amb.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: c1.contagens, assinatura: c1.assinatura }));
    pedir(amb.ctx.salvarDisciplina(fichaCompleta(amb, 'PST1001', { nome: 'Disciplina teste revisada', creditosAula: '4' }, 'Turma única')));
    const c2 = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    // A "falha de conexão antes do reenvio" é representada por NÃO executar a 2ª tentativa.
    const g = amb.grade();
    const lidas = {};
    ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'].forEach((aba) => {
      const s = g.getSheetByName(aba); const out = [];
      for (let r = 4; r < 60; r++) { const cod = s.getRange(r, 3).getValue(); if (cod === '' || cod === null) break; out.push({ codigo: String(cod), nome: String(s.getRange(r, 4).getValue()).replace(/^'/, ''), creditosAula: s.getRange(r, 10).getValue() }); }
      lidas[aba] = out;
    });
    const codigos = (gr) => Object.keys(gr).map((k) => k + ':' + gr[k].map((l) => l.codigo).join(',')).join(' ');
    const gruposPlanilha = { PSA: lidas.PSA, PSC: lidas.PSC, PSE: lidas.PSE, PST: lidas.PST, INTER: lidas.Interdepartamentais, OUTRAS: lidas['Outras Unidades'] };
    const contPlanilha = {}; Object.keys(gruposPlanilha).forEach((k) => { contPlanilha[k] = gruposPlanilha[k].length; });
    const pstConf = c2.grupos.PST.find((l) => l.codigo === 'PST1001'), pstPlan = lidas.PST.find((l) => l.codigo === 'PST1001');
    console.log('     fatos [H3]: ' + JSON.stringify({ arquivo: g.getName(), nomeDaConferencia: c2.nomeNovo, contagensConferencia: c2.contagens, contagensPlanilha: contPlanilha, conferido: pstConf, naPlanilha: pstPlan, assinaturasIguais: c1.assinatura === c2.assinatura }));
    igual(g.getName(), c2.nomeNovo, 'o nome do arquivo já é o do semestre da tentativa');
    igual(Object.values(contPlanilha), Object.values(c2.contagens), 'as quantidades por aba coincidem');
    igual(codigos(gruposPlanilha), codigos(c2.grupos), 'os códigos coincidem, aba por aba');
    verdade(c1.assinatura !== c2.assinatura, 'as duas conferências têm conteúdo diferente');
    verdade(pstConf.nome !== pstPlan.nome && /revisada/.test(pstConf.nome) && !/revisada/.test(pstPlan.nome), 'o NOME conferido não está na planilha (conteúdo anterior): ' + pstConf.nome + ' × ' + pstPlan.nome);
    verdade(String(pstConf.creditosAula) !== String(pstPlan.creditosAula), 'créditos-aula também diferem');
  });

  await teste('H4. [A1–A3; 1.9.2] texto: as afirmações antigas não aparecem mais (HTML e AJUDA.md, fora das tabelas de correções) — inclusive "a tentativa foi concluída" deduzida só da comparação; as novas estão nos dois; no artigo do resultado do envio, "dados presentes ≠ todas as etapas", não confirmado, auditoria, reenvio e Serviço de Graduação; a busca da Central encontra os estados novos', async () => {
    const html = fs.readFileSync(path.join(FONTE, 'EstruturaAjuda.html'), 'utf8');
    const caminhoMd = path.join(FONTE, '..', '..', '..', 'docs', 'sistemas', 'estrutura-curricular', 'AJUDA.md');
    const md = fs.existsSync(caminhoMd) ? fs.readFileSync(caminhoMd, 'utf8').split('## Gatilhos contextuais implementados')[0] : null;
    verdade(md, 'AJUDA.md encontrado ao lado da fonte');
    const planoHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const antigas = ['nada é salvo nem adicionado', 'Nada muda na base', 'repetir não muda nada', 'o envio foi feito: não repita', 'Quando repetir é seguro', 'a tentativa foi concluída: não reenvie'];
    antigas.forEach((a) => { verdade(!planoHtml.includes(a), 'HTML ainda diz: ' + a); verdade(!md.includes(a), 'AJUDA.md ainda diz: ' + a); });
    const novas = ['pode já estar gravada', 'não confirmam uma nova importação nem enviam uma nova grade', 'Repetir uma consulta não confirma uma gravação anterior', 'Envio sem resposta: como conferir', 'o conteúdo das seis abas'];
    novas.forEach((n) => { verdade(planoHtml.includes(n), 'HTML sem: ' + n); verdade(md.replace(/\*\*/g, '').includes(n), 'AJUDA.md sem: ' + n); });
    // (1.9.2) O artigo "Resultados possíveis", nos dois arquivos: nenhuma conclusão de término só pela comparação; os limites e o encaminhamento.
    const artigoHtml = (html.split('id="ajuda-envio-grade-resultado"')[1] || '').split('</article>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const artigoMd = ((md.split('{#ajuda-envio-grade-resultado}')[1] || '').split('\n### ')[0]).replace(/\*\*/g, '').replace(/\s+/g, ' ');
    verdade(artigoHtml.length > 500 && artigoMd.length > 500, 'artigo encontrado nos dois arquivos');
    [['HTML', artigoHtml], ['AJUDA.md', artigoMd]].forEach(([qual, a]) => {
      verdade(!/tentativa foi conclu[ií]da/.test(a), qual + ': conclui que a tentativa terminou');
      ['esses dados estão na planilha', 'não confirma sozinho que todas as etapas do envio terminaram', 'fórmulas de Horário de Fim', 'essa comparação também não mostra qual delas terminou',
        'continua não confirmado até haver evidência suficiente', 'procure o Serviço de Graduação antes de decidir reenviar', 'Auditoria da grade', 'A ausência do evento não prova que nada ocorreu',
        'Num reenvio do mesmo semestre', 'inclusões e as remoções', 'Não repita às cegas', 'outra cópia de segurança', 'apaga e regrava', 'O envio parou no meio', 'A grade não foi enviada', 'enviada para preenchimento']
        .forEach((n) => verdade(a.includes(n), qual + ' sem: ' + n));
    });
    const cartao = (html.split('id="ajuda-problema-envio-incerto"')[1] || '').split('</article>')[0];
    verdade(/data-gradip-help-target="ajuda-envio-grade-resultado"/.test(cartao) && /não que todas as etapas do envio terminaram/.test(cartao), 'cartão do problema: link ao artigo e o mesmo limite');
    const c = await montar();
    const p = c.pagina;
    await p.click('#botaoAjuda'); await esperarAberta(p);
    const achar = async (termo, id) => { await buscar(p, termo); const s = await c.ajuda(); verdade(s.itensIds.includes(id), '"' + termo + '" não achou ' + id + ': ' + s.itensIds.join(',')); };
    await achar('parte gravada inclusao', 'ajuda-lista-grade-ficha');
    await achar('conferir o envio pendente', 'ajuda-mensagens-leitura-gravacao');
    await achar('reenvio sem resposta seis abas', 'ajuda-envio-grade-resultado');
    await achar('dados correspondem etapas formulas', 'ajuda-envio-grade-resultado');
    // O artigo continua alcançável pelo link do cartão de problema e pelo gatilho do resultado do envio (destino).
    await p.evaluate(() => EstruturaAjuda.abrir('ajuda-problema-envio-incerto'));
    await p.click('#ajuda-problema-envio-incerto [data-gradip-help-target="ajuda-envio-grade-resultado"]');
    const s5 = await c.ajuda();
    igual([s5.secoes, s5.ativoTexto], [['ajuda-envio-grade'], 'Resultados possíveis'], 'link do cartão leva ao artigo');
    await fim(c);
  });

  await teste('H5. [A3; 1.9.2] envio INTERROMPIDO depois de gravar os dados conferidos: com a falha na gravação das fórmulas de Horário de Fim no reenvio do mesmo semestre, o servidor responde ENVIO_INCOMPLETO, mas as seis abas têm EXATAMENTE a lista conferida (código, nome com observação, tipo, semestre ideal, créditos-aula; ordem, quantidades, grupos vazios, remoção) e o nome do arquivo é o certo — e falta a fórmula; controle: sem a falha, o envio conclui e grava as fórmulas', async () => {
    const ABAS_ENVIO = [['PSA', 'PSA'], ['PSC', 'PSC'], ['PSE', 'PSE'], ['PST', 'PST'], ['INTER', 'Interdepartamentais'], ['OUTRAS', 'Outras Unidades']];
    /** Linhas gravadas (C, D, E, I, J) e a fórmula de M, a partir da linha 4, até a primeira linha sem código. Só o apóstrofo de texto literal é normalizado. */
    const lerGrade = (amb) => {
      const g = amb.grade(), out = {};
      ABAS_ENVIO.forEach(([grupo, aba]) => {
        const s = g.getSheetByName(aba), linhas = [];
        for (let r = 4; r < 80; r++) {
          const cod = s.getRange(r, 3).getValue();
          if (cod === '' || cod === null) break;
          const texto = (v) => (typeof v === 'string' ? v.replace(/^'/, '') : v);
          linhas.push({ codigo: texto(cod), nome: texto(s.getRange(r, 4).getValue()), tipo: texto(s.getRange(r, 5).getValue()), semestreIdeal: s.getRange(r, 9).getValue(), creditosAula: s.getRange(r, 10).getValue(), formulaFim: s.getRange(r, 13).getFormulas()[0][0] });
        }
        out[grupo] = linhas;
      });
      return out;
    };
    const semFormula = (lidas) => { const o = {}; Object.keys(lidas).forEach((k) => { o[k] = lidas[k].map((l) => ({ codigo: l.codigo, nome: l.nome, tipo: l.tipo, semestreIdeal: l.semestreIdeal, creditosAula: l.creditosAula })); }); return o; };
    const formulas = (lidas) => [].concat(...Object.keys(lidas).map((k) => lidas[k].map((l) => k + ':' + l.codigo + '=' + (l.formulaFim ? 'fórmula' : 'VAZIA'))));
    const amb = ambienteH();
    // A. Envio inicial bem-sucedido (2027/1): fórmula do fim presente.
    const c1 = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    pedir(amb.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: c1.contagens, assinatura: c1.assinatura }));
    const l1 = lerGrade(amb);
    verdade(formulas(l1).length >= 3 && formulas(l1).every((f) => /=fórmula$/.test(f)), 'controle inicial: fórmulas gravadas: ' + formulas(l1).join(' '));
    // B. Mudança real pelo salvamento normal (nome + observação de uma disciplina enviada) e uma remoção da grade; nova conferência.
    pedir(amb.ctx.salvarDisciplina(fichaCompleta(amb, 'PST1001', { nome: 'Disciplina teste revisada' }, 'Turma única')));
    pedir(amb.ctx.removerDaGrade([{ origem: 'estrutura', chave: 'PST1003' }]));
    const c2 = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    verdade(c2.assinatura !== c1.assinatura, 'nova assinatura');
    verdade(JSON.stringify(c2.grupos) !== JSON.stringify(c1.grupos), 'conteúdo conferido diferente do anterior');
    verdade(JSON.stringify(semFormula(l1)) !== JSON.stringify(c2.grupos), 'a planilha (envio anterior) ainda difere da nova lista');
    // C. Falha na gravação das fórmulas (persistente durante o cenário) no reenvio com a assinatura válida.
    const n0 = amb.estado.eventos.length;
    amb.injetarFalha((e) => e.tipo === 'setFormulas', 99);
    const r = amb.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: c2.contagens, assinatura: c2.assinatura });
    const tipos = amb.estado.eventos.slice(n0).map((e) => e.tipo);
    // D. Estado persistido.
    const l2 = lerGrade(amb);
    const dados = semFormula(l2);
    const fato = { ok: r.ok, codigo: r.codigo || null, arquivo: amb.grade().getName(), nomeEsperado: c2.nomeNovo, todasSeisAbasCorrespondem: JSON.stringify(dados) === JSON.stringify(c2.grupos), contagens: Object.keys(dados).map((k) => k + ' ' + dados[k].length).join(', '), formulas: formulas(l2), copiaFeita: tipos.includes('makeCopy') };
    console.log('     fatos [H5]: ' + JSON.stringify(fato));
    igual([r.ok, r.codigo], [false, 'ENVIO_INCOMPLETO'], 'o servidor classificou a tentativa como interrompida');
    igual(Object.keys(dados), ABAS_ENVIO.map(([g]) => g), 'os seis grupos');
    igual(dados, c2.grupos, 'TODOS os campos conferidos, nas seis abas, na mesma ordem (inclusive grupos vazios e a remoção de PST1003)');
    verdade(!dados.PST.some((l) => l.codigo === 'PST1003'), 'a remoção está na planilha');
    igual(fato.arquivo, c2.nomeNovo, 'nome do arquivo = o do semestre');
    verdade(fato.formulas.some((f) => /=VAZIA$/.test(f)), 'pelo menos uma fórmula de Horário de Fim esperada está ausente: ' + fato.formulas.join(' '));
    igual(l2.PST.find((l) => l.codigo === 'PST1001').formulaFim, '', 'M da PST1001 vazia (apagada na limpeza e não regravada)');
    // E. Controle de conclusão: sem a falha, nova conferência pelo fluxo normal e envio bem-sucedido.
    amb.limparFalhas();
    const c3 = pedir(amb.ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }));
    const r3 = amb.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: c3.contagens, assinatura: c3.assinatura });
    const l3 = lerGrade(amb);
    console.log('     fatos [H5 controle]: ' + JSON.stringify({ ok: r3.ok, formulas: formulas(l3) }));
    verdade(r3.ok, 'controle: envio concluído (' + (r3.codigo || '') + ')');
    igual(semFormula(l3), c3.grupos, 'controle: dados');
    verdade(formulas(l3).length > 0 && formulas(l3).every((f) => /=fórmula$/.test(f)), 'controle: todas as fórmulas gravadas');
  });

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO DE INFRAESTRUTURA: ' + (e && e.stack || e)); process.exit(3); });
