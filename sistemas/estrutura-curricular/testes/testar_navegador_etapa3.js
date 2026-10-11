// Etapa 3 (1.8.4) — estado assíncrono da ficha, no navegador real
// (Chromium), com o painel real e o servidor real no simulador. As
// respostas do servidor são CONTROLADAS (ambiente_navegador.js, opção
// "portao"): o teste decide quando cada chamada termina e com que
// resultado, sem depender de tempo de espera.
//
// Reprodução da revisão: a ficha A pede para salvar PST1001; antes da
// resposta a pessoa passa para a ficha B (PST1002); a resposta de A chega.
// Na 1.8.3 o callback redesenha B com os dados de A.
//
// Estrutura curricular SINTÉTICA (SIN0001…; SIN0002 tem SIN0001 como
// requisito) e disciplinas para outros cursos fictícias. E-mails .example.
// Uso: node testar_navegador_etapa3.js <grade_curricular.csv>
//   (o CSV só empresta o formato do curso/currículo ao pacote sintético)
//   DIR_SRC=/caminho/fonte/src … para rodar em outra fonte.
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath] = process.argv.slice(2);
if (!csvPath) { console.log('Uso: node testar_navegador_etapa3.js <grade_curricular.csv>'); process.exit(2); }
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa3_ficha.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  ev('\n--- ' + nome);
  let cena = null;
  try { cena = await fn(); ok++; console.log('  ✓', nome); ev('RESULTADO: ok'); }
  catch (e) {
    falhas++; falhou.push(nome);
    console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      '));
    ev('RESULTADO: FALHOU — ' + String(e && e.message || e).split('\n')[0]);
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

// ---------------------------------------------------------------- dados
const leitores = carregar();
const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
function pacoteComRequisito() {
  const p = parSintetico(modelo, 4).csv;
  const curr = p.curriculos[0].codigo;
  p.requisitos = [{ curriculo: curr, disciplina: 'SIN0002', requisito: 'SIN0001', versaoRequisito: 1, nomeRequisito: 'Disciplina Sintética 1', tipoRequisito: 'Requisito', grupo: null }];
  p.resumoLeitura.requisitos = 1;
  p.resumoLeitura.porCurriculo[curr].requisitos = 1;
  return p;
}
function linhasOutros(amb) {
  const s = amb.estrutura().getSheetByName('Disciplinas para outros cursos');
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}
const linhaOutros = (amb, chave) => linhasOutros(amb).find((l) => l['Identificador'] === chave);
function ajusteGravado(amb, chave) {
  const s = amb.estrutura().getSheetByName('Ajustes manuais');
  if (!s || s.getLastRow() < 2) return null;
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  const l = v.slice(1).find((x) => x[0] === chave);
  if (!l) return null;
  const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o;
}
/** Releitura com um contexto novo sobre as mesmas planilhas. */
function reaberto(amb) {
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  return pedir(novo.ctx.obterDadosPainel());
}

// ---------------------------------------------------------------- cena
let nav;
/**
 * Página nova com a base sintética, PST1001 ("Disciplina A", 1º sem.) e
 * PST1002 ("Disciplina B", 2º sem.). Chamadas cujos nomes estão em
 * "segurar" ficam na fila até o teste liberar.
 */
async function montar(segurar) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  const pacote = pacoteComRequisito();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pacote))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pacote)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST1001', nome: 'Disciplina A', oferecimento: '1' }, observacoes: 'obs A' }));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST1002', nome: 'Disciplina B', oferecimento: '2' }, observacoes: 'obs B' }));
  const fila = [];
  const nomes = new Set(segurar || []);
  const enviados = [];
  const portao = (nome, args) => {
    if (!/^(salvarDisciplina|cadastrarDisciplinaOutros|adicionarAGrade|removerDaGrade|excluirDisciplinas)$/.test(nome)) return null;
    enviados.push({ nome, args });
    if (!nomes.has(nome)) return null;
    return new Promise((liberar) => fila.push({ nome, args, liberar }));
  };
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const dialogos = [];
  pagina.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await esperarCarregado(pagina);
  const c = { amb, pagina, errosPagina, fila, enviados, dialogos, entregues: 0 };
  c.etapa = async (n) => { await pagina.click('#etapa-' + n); await pagina.waitForSelector('#etapaPainel-' + n + ':not([hidden])'); };
  c.abrir = async (id, lista) => {
    await pagina.click('#' + (lista || 'oCorpoTabela') + ' tr[data-id="' + id + '"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
  };
  c.fechar = async () => { await pagina.click('#modalDisciplina .modal__fechar'); await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' }); };
  /** Libera a i-ésima chamada segurada (decisão: null = executa; {resposta}; {falhar}) e espera a página tratar a resposta. */
  c.liberar = async (i, decisao) => {
    c.fila[i].liberar(decisao || null);
    c.entregues++;
    await pagina.waitForFunction((n) => (window.__gasRespondidas || 0) >= n, c.entregues, { timeout: 15000 });
    await pagina.evaluate(() => new Promise((r) => setTimeout(r, 0)));
  };
  c.esperarFila = async (n) => { const t0 = Date.now(); while (c.fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou ao servidor (fila ' + c.fila.length + ' < ' + n + ')'); await new Promise((r) => setTimeout(r, 20)); } };
  /** Tudo o que importa da tela, para comparar. */
  c.tela = () => pagina.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const m = $('modalDisciplina');
    return {
      aberta: !m.hidden, fichaAtual: Painel.estado.fichaAtual, pilha: Painel.estado.pilhaFicha.slice(),
      titulo: $('modalDisciplinaTitulo').textContent, codigoCampo: $('fichaCampo-codigo') ? $('fichaCampo-codigo').value : null,
      nome: $('fichaCampo-nome') ? $('fichaCampo-nome').value : null, nomeTravado: $('fichaCampo-nome') ? $('fichaCampo-nome').disabled : null,
      obs: $('fichaObservacoes') ? $('fichaObservacoes').value : null, obsTravada: $('fichaObservacoes') ? $('fichaObservacoes').disabled : null,
      salvarTexto: $('fichaSalvar').textContent, salvarTravado: $('fichaSalvar').disabled,
      gradeTexto: $('fichaGrade').textContent, gradeTravado: $('fichaGrade').disabled, excluirTravado: $('fichaExcluir').disabled,
      alterada: window.Preparacao.fichaAlterada(),
      foco: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
      focoNaFicha: !!(document.activeElement && m.contains(document.activeElement)),
      aviso: $('aviso').hidden ? '' : $('aviso').textContent,
      carregando: !$('carregando').hidden
    };
  });
  c.item = (id) => pagina.evaluate((x) => { const d = Painel.estado.idx.itens[x]; return d ? { codigo: d.codigo, nome: d.nome, observacoes: d.observacoes, naGrade: d._naGrade, excluida: d._excluida } : null; }, id);
  c.chamadas = (nome) => c.enviados.filter((e) => e.nome === nome);
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }
/** Edita o nome (ou outro campo) como a pessoa faria. */
async function digitar(c, id, valor) { await c.pagina.fill('#' + id, valor); }

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  ev('=== Etapa 3 — estado assíncrono da ficha (navegador, respostas controladas) ===');
  ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
  try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

  console.log('\n== R. Reprodução A → B (só registra)');
  {
    ev('\n--- R. Reprodução: salvar A (PST1001), passar para B (PST1002), resposta de A chega');
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    ev('Pedido enviado: ' + c.fila[0].nome + ' ' + JSON.stringify({ origem: c.fila[0].args[0].origem, chave: c.fila[0].args[0].chave, nome: c.fila[0].args[0].campos.nome }));
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B rascunho');
    const antes = await c.tela();
    ev('Antes da resposta: ' + JSON.stringify({ fichaAtual: antes.fichaAtual, titulo: antes.titulo, nome: antes.nome, alterada: antes.alterada }));
    await c.liberar(0);
    const depois = await c.tela();
    ev('Depois da resposta de A: ' + JSON.stringify({ aberta: depois.aberta, fichaAtual: depois.fichaAtual, titulo: depois.titulo, codigo: depois.codigoCampo, nome: depois.nome, alterada: depois.alterada, aviso: depois.aviso }));
    ev('Gravado: PST1001 = ' + JSON.stringify(linhaOutros(c.amb, 'PST1001')['Nome']) + ' · PST1002 = ' + JSON.stringify(linhaOutros(c.amb, 'PST1002')['Nome']));
    ev(depois.fichaAtual !== 'O:PST1002' || depois.nome !== 'B rascunho' ? '→ o pedido salvou PST1001, mas o callback redesenhou a ficha B (defeito)' : '→ a ficha B e o rascunho ficaram intactos');
    await c.pagina.context().close();
  }

  console.log('\n== Testes');
  await teste('1. salvar A normalmente: pedido certo, ficha redesenhada com o gravado, mensagem, botões e foco', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await digitar(c, 'fichaObservacoes', 'obs A nova');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    const p = c.fila[0].args[0];
    igual([p.origem, p.chave, p.campos.nome, p.campos.codigo, p.observacoes, !!p.adicionarAGrade], ['outros', 'PST1001', 'A editada', 'PST1001', 'obs A nova', false], 'pedido');
    const durante = await c.tela();
    igual([durante.salvarTexto, durante.salvarTravado], ['Salvando…', true], 'botão durante a gravação');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.titulo, t.nome, t.obs, t.alterada, t.salvarTexto, t.salvarTravado, t.aviso, t.foco],
      [true, 'O:PST1001', 'A editada', 'A editada', 'obs A nova', false, 'Salvar', true, 'Alterações salvas.', 'modalDisciplinaTitulo']);
    igual([linhaOutros(c.amb, 'PST1001')['Nome'], linhaOutros(c.amb, 'PST1001')['Observações']], ['A editada', 'obs A nova'], 'gravado');
    igual(reaberto(c.amb).preparacao.outros.find((o) => o.chave === 'PST1001').nome, 'A editada', 'após reabrir');
    await fim(c);
  });

  await teste('2. salvar A, passar para B e responder com SUCESSO: B e seu rascunho intactos; A atualizada nos dados confirmados', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B rascunho');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.titulo, t.codigoCampo, t.nome, t.obs, t.alterada, t.salvarTravado, t.salvarTexto],
      [true, 'O:PST1002', 'Disciplina B', 'PST1002', 'B rascunho', 'obs B', true, false, 'Salvar'], 'ficha B');
    verdade(!t.focoNaFicha || t.foco !== 'modalDisciplinaTitulo', 'foco não foi puxado para o título por causa de A');
    verdade(/PST1001/.test(t.aviso), 'mensagem identifica A: ' + t.aviso);
    igual((await c.item('O:PST1001')).nome, 'A editada', 'lista: A confirmada');
    igual([linhaOutros(c.amb, 'PST1001')['Nome'], linhaOutros(c.amb, 'PST1002')['Nome']], ['A editada', 'Disciplina B'], 'gravado');
    await fim(c);
  });

  await teste('3. mesmo cenário com resposta de ERRO: B intacta e utilizável, nenhum erro de JavaScript', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B rascunho');
    await c.liberar(0, { resposta: { ok: false, erro: 'Falha simulada no servidor.', codigo: 'OCUPADO' } });
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.titulo, t.nome, t.alterada, t.salvarTravado, t.salvarTexto], [true, 'O:PST1002', 'Disciplina B', 'B rascunho', true, false, 'Salvar'], 'ficha B');
    verdade(/PST1001/.test(t.aviso), 'erro identifica A: ' + t.aviso);
    igual(linhaOutros(c.amb, 'PST1001')['Nome'], 'Disciplina A', 'A não gravada');
    // B continua salvável
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(2);
    await c.liberar(1);
    const t2 = await c.tela();
    igual([t2.nome, t2.alterada, t2.aviso], ['B rascunho', false, 'Alterações salvas.']);
    igual(linhaOutros(c.amb, 'PST1002')['Nome'], 'B rascunho');
    await fim(c);
  });

  for (const tipo of ['sucesso', 'erro', 'falha de rede']) {
    await teste('4. salvar A e FECHAR antes da resposta (' + tipo + '): a janela não reaparece, sem foco indevido nem erro', async () => {
      const c = await montar(['salvarDisciplina']);
      await c.etapa(2);
      await c.abrir('O:PST1001');
      await digitar(c, 'fichaCampo-nome', 'A editada');
      await c.pagina.click('#fichaSalvar');
      await c.esperarFila(1);
      await c.fechar();
      await c.liberar(0, tipo === 'sucesso' ? null : tipo === 'erro' ? { resposta: { ok: false, erro: 'Falha simulada.', codigo: 'OCUPADO' } } : { falhar: 'rede caiu' });
      const t = await c.tela();
      igual([t.aberta, t.fichaAtual, t.pilha, t.focoNaFicha], [false, null, [], false], 'janela fechada e estado limpo');
      verdade(/PST1001/.test(t.aviso), 'mensagem identifica A: ' + t.aviso);
      igual(linhaOutros(c.amb, 'PST1001')['Nome'], tipo === 'sucesso' ? 'A editada' : 'Disciplina A');
      // o painel continua utilizável: abrir B funciona
      await c.abrir('O:PST1002');
      igual((await c.tela()).nome, 'Disciplina B');
      await fim(c);
    });
  }

  await teste('5. salvar A, fechar e REABRIR A com nova edição: a resposta antiga não substitui a nova instância (mesmo id)', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A primeira');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaObservacoes', 'rascunho da nova instância');
    const antes = await c.tela();
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.nome, t.obs, t.alterada], [true, 'O:PST1001', antes.nome, 'rascunho da nova instância', true], 'nova instância intacta');
    igual(linhaOutros(c.amb, 'PST1001')['Nome'], 'A primeira', 'a 1ª gravação foi feita');
    await fim(c);
  });

  for (const tipo of ['sucesso', 'erro']) {
    await teste('6. editar DURANTE a espera (' + tipo + '): a edição posterior não se perde (política: campos travados durante a gravação e liberados no fim)', async () => {
      const c = await montar(['salvarDisciplina']);
      await c.etapa(2);
      await c.abrir('O:PST1001');
      await digitar(c, 'fichaCampo-nome', 'A editada');
      await c.pagina.click('#fichaSalvar');
      await c.esperarFila(1);
      const durante = await c.tela();
      let editou = false;
      if (!durante.obsTravada) { await digitar(c, 'fichaObservacoes', 'escrito durante a espera'); editou = true; }
      ev('Durante a espera: campos travados = ' + JSON.stringify([durante.nomeTravado, durante.obsTravada]) + (editou ? ' (a edição foi aceita pelo formulário)' : ''));
      await c.liberar(0, tipo === 'sucesso' ? null : { resposta: { ok: false, erro: 'Falha simulada.', codigo: 'OCUPADO' } });
      const t = await c.tela();
      if (editou) {
        igual([t.obs, t.alterada], ['escrito durante a espera', true], 'edição posterior preservada e marcada como não salva');
      } else {
        igual([durante.nomeTravado, durante.obsTravada], [true, true], 'campos travados durante a gravação');
        igual([t.nomeTravado, t.obsTravada], [false, false], 'campos liberados no fim');
        igual(t.nome, 'A editada', 'rascunho enviado continua no formulário');
        igual(t.alterada, tipo === 'erro', 'alterações não salvas só se a gravação falhou');
        igual([t.salvarTexto, t.salvarTravado], ['Salvar', tipo === 'sucesso'], 'botão Salvar');
      }
      await fim(c);
    });
  }

  await teste('7. dois pedidos rápidos da mesma ficha: uma gravação só; controles liberados no fim', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    // Segundo pedido: mesmo se o botão voltar a ficar habilitado (ex.: por um evento de edição), o clique não pode gerar outra gravação.
    await c.pagina.evaluate(() => { const b = document.getElementById('fichaSalvar'); b.disabled = false; b.click(); });
    await c.pagina.evaluate(() => { const n = document.getElementById('fichaCampo-nome'); if (!n.disabled) { n.value = 'A editada 2'; n.dispatchEvent(new Event('input', { bubbles: true })); } const b = document.getElementById('fichaSalvar'); b.disabled = false; b.click(); });
    await c.pagina.waitForTimeout(200);
    igual(c.chamadas('salvarDisciplina').length, 1, 'uma chamada só');
    await c.liberar(0);
    const t = await c.tela();
    igual(c.chamadas('salvarDisciplina').length, 1, 'continua uma chamada');
    igual([t.salvarTexto, t.salvarTravado, t.nomeTravado, t.excluirTravado], ['Salvar', !t.alterada, false, false], 'controles liberados');
    igual(linhaOutros(c.amb, 'PST1001')['Nome'], 'A editada');
    await fim(c);
  });

  await teste('8. cadastro manual pendente, com fechamento e troca para B: disciplina criada, B e o rascunho preservados, mensagem do cadastro', async () => {
    const c = await montar(['cadastrarDisciplinaOutros']);
    await c.etapa(2);
    await c.pagina.click('[data-cadastrar-outros]');
    await c.pagina.waitForSelector('#modalDisciplina:not([hidden]) #fichaCampo-codigo');
    await digitar(c, 'fichaCampo-codigo', 'PST1003');
    await digitar(c, 'fichaCampo-nome', 'Nova C');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    igual([c.fila[0].args[0].campos.codigo, c.fila[0].args[0].campos.nome], ['PST1003', 'Nova C'], 'pedido do cadastro');
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B rascunho');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.titulo, t.nome, t.alterada, t.salvarTexto], [true, 'O:PST1002', 'Disciplina B', 'B rascunho', true, 'Salvar'], 'ficha B');
    verdade(/PST1003/.test(t.aviso) && /cadastrada/i.test(t.aviso), 'mensagem do cadastro original: ' + t.aviso);
    igual((await c.item('O:PST1003')).nome, 'Nova C', 'nova disciplina na lista');
    igual(linhaOutros(c.amb, 'PST1003')['Nome'], 'Nova C');
    await fim(c);
  });

  await teste('8b. cadastro pendente com a janela ainda aberta: a resposta mostra a disciplina criada (chave do servidor)', async () => {
    const c = await montar(['cadastrarDisciplinaOutros']);
    await c.etapa(2);
    await c.pagina.click('[data-cadastrar-outros]');
    await c.pagina.waitForSelector('#modalDisciplina:not([hidden]) #fichaCampo-codigo');
    await digitar(c, 'fichaCampo-codigo', 'PST1003');
    await digitar(c, 'fichaCampo-nome', 'Nova C');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.titulo, t.codigoCampo, t.salvarTexto, t.alterada, t.aviso], [true, 'O:PST1003', 'Nova C', 'PST1003', 'Salvar', false, 'Disciplina cadastrada.']);
    await fim(c);
  });

  await teste('9. salvar com adicionarAGrade: pedido e retorno certos; trocar para B antes da resposta não apaga B', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaObservacoes', 'obs A para a grade');
    await c.pagina.click('#fichaGrade');
    await c.esperarFila(1);
    const p = c.fila[0].args[0];
    igual([p.chave, p.observacoes, p.adicionarAGrade], ['PST1001', 'obs A para a grade', true], 'pedido');
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B rascunho');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.fichaAtual, t.titulo, t.nome, t.alterada, t.gradeTexto], ['O:PST1002', 'Disciplina B', 'B rascunho', true, 'Adicionar à Grade Horária'], 'ficha B');
    verdade(/PST1001/.test(t.aviso), t.aviso);
    const a = await c.item('O:PST1001');
    igual([a.naGrade, a.observacoes], [true, 'obs A para a grade'], 'A confirmada na lista');
    igual([linhaOutros(c.amb, 'PST1001')['Adicionada à grade horária'], linhaOutros(c.amb, 'PST1001')['Observações']], ['Sim', 'obs A para a grade']);
    await fim(c);
  });

  await teste('9b. salvar com adicionarAGrade, com a ficha aberta: retorno aplicado à própria ficha', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaObservacoes', 'obs A para a grade');
    await c.pagina.click('#fichaGrade');
    await c.esperarFila(1);
    await c.liberar(0);
    const t = await c.tela();
    igual([t.fichaAtual, t.obs, t.alterada, t.gradeTexto, t.gradeTravado, t.aviso], ['O:PST1001', 'obs A para a grade', false, '✓ Adicionada à Grade Horária', true, 'Alterações salvas e disciplina adicionada à Grade Horária.']);
    await fim(c);
  });

  await teste('10. navegação por requisito e "Voltar" durante a gravação: a resposta não muda a ficha atual nem a pilha', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.abrir('SIN0002', 'corpoTabela');
    await digitar(c, 'fichaCampo-nome', 'SIN0002 editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.pagina.click('#modalDisciplinaCorpo [data-abrir-ficha="SIN0001"]');
    await c.pagina.waitForFunction(() => Painel.estado.fichaAtual === 'SIN0001');
    await digitar(c, 'fichaObservacoes', 'rascunho em SIN0001');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.fichaAtual, t.pilha, t.codigoCampo, t.obs, t.alterada], ['SIN0001', ['SIN0002'], 'SIN0001', 'rascunho em SIN0001', true], 'ficha de destino intacta');
    verdade(/SIN0002/.test(t.aviso), t.aviso);
    igual(ajusteGravado(c.amb, 'SIN0002')['Nome ajustado'], 'SIN0002 editada', 'gravado');
    igual(reaberto(c.amb).preparacao.ajustes.find((a) => a.chave === 'SIN0002').campos.nome, 'SIN0002 editada', 'após reabrir');
    // "Voltar" (descarta o rascunho de SIN0001, como antes) leva à SIN0002 com o que foi gravado
    await c.pagina.click('#modalDisciplinaCorpo [data-voltar-ficha]');
    await c.pagina.waitForFunction(() => Painel.estado.fichaAtual === 'SIN0002');
    const v = await c.tela();
    igual([v.fichaAtual, v.pilha, v.nome, v.alterada], ['SIN0002', [], 'SIN0002 editada', false]);
    await fim(c);
  });

  await teste('11. operações sobrepostas: com A pendente, "Salvar" de B não envia nada (aviso); depois da resposta de A, B salva normalmente', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await digitar(c, 'fichaCampo-nome', 'A editada');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('O:PST1002');
    await digitar(c, 'fichaCampo-nome', 'B editada');
    await c.pagina.click('#fichaSalvar');
    await c.pagina.waitForTimeout(200);
    igual(c.chamadas('salvarDisciplina').length, 1, 'B não enviou enquanto A está pendente');
    const t0 = await c.tela();
    verdade(/aguarde/i.test(t0.aviso), 'aviso de espera: ' + t0.aviso);
    igual([t0.nome, t0.alterada, t0.salvarTexto], ['B editada', true, 'Salvar'], 'B intacta');
    await c.liberar(0);
    igual((await c.tela()).nome, 'B editada', 'B intacta depois da resposta de A');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(2);
    igual(c.fila[1].args[0].chave, 'PST1002', 'pedido de B para B');
    await c.liberar(1);
    const t = await c.tela();
    igual([t.fichaAtual, t.nome, t.alterada, t.aviso], ['O:PST1002', 'B editada', false, 'Alterações salvas.']);
    igual([linhaOutros(c.amb, 'PST1001')['Nome'], linhaOutros(c.amb, 'PST1002')['Nome']], ['A editada', 'B editada']);
    await fim(c);
  });

  for (const tipo of ['sucesso', 'erro']) {
    await teste('12a. "Adicionar à Grade" da ficha pendente e troca para B (' + tipo + '): B intacta; A marcada só no sucesso', async () => {
      const c = await montar(['adicionarAGrade']);
      await c.etapa(2);
      await c.abrir('O:PST1001');
      await c.pagina.click('#fichaGrade');
      await c.esperarFila(1);
      igual(c.fila[0].args[0], [{ origem: 'outros', chave: 'PST1001' }], 'pedido');
      await c.fechar();
      await c.abrir('O:PST1002');
      await digitar(c, 'fichaCampo-nome', 'B rascunho');
      await c.liberar(0, tipo === 'sucesso' ? null : { resposta: { ok: false, erro: 'Falha simulada.', codigo: 'OCUPADO' } });
      const t = await c.tela();
      igual([t.fichaAtual, t.titulo, t.nome, t.alterada, t.gradeTexto, t.salvarTexto, t.excluirTravado], ['O:PST1002', 'Disciplina B', 'B rascunho', true, 'Adicionar à Grade Horária', 'Salvar', false], 'ficha B');
      verdade(/PST1001/.test(t.aviso), t.aviso);
      igual(linhaOutros(c.amb, 'PST1001')['Adicionada à grade horária'], tipo === 'sucesso' ? 'Sim' : '');
      await fim(c);
    });
  }

  await teste('12b. "Adicionar à Grade" com a ficha aberta: campos travados durante a espera e ficha atualizada no fim', async () => {
    const c = await montar(['adicionarAGrade']);
    await c.etapa(2);
    await c.abrir('O:PST1001');
    await c.pagina.click('#fichaGrade');
    await c.esperarFila(1);
    const d = await c.tela();
    igual([d.gradeTexto, d.gradeTravado, d.nomeTravado], ['Adicionando…', true, true], 'durante');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.fichaAtual, t.gradeTexto, t.nomeTravado, t.aviso], ['O:PST1001', '✓ Adicionada à Grade Horária', false, 'Adicionada à Grade Horária.']);
    await fim(c);
  });

  for (const tipo of ['sucesso', 'erro']) {
    await teste('12c. excluir pela ficha (' + tipo + '): tela de espera bloqueia o painel; segundo clique não repete o pedido; fim correto', async () => {
      const c = await montar(['excluirDisciplinas']);
      await c.etapa(2);
      await c.abrir('O:PST1001');
      await c.pagina.click('#fichaExcluir');
      await c.esperarFila(1);
      igual(c.fila[0].args, [[{ origem: 'outros', chave: 'PST1001' }], true], 'pedido');
      const d = await c.tela();
      igual(d.carregando, true, 'tela "Excluindo…" visível');
      await c.pagina.evaluate(() => { const b = document.getElementById('fichaExcluir'); b.disabled = false; b.click(); });
      await c.pagina.waitForTimeout(200);
      igual(c.chamadas('excluirDisciplinas').length, 1, 'uma chamada só');
      await c.liberar(0, tipo === 'sucesso' ? null : { resposta: { ok: false, erro: 'Falha simulada.', codigo: 'OCUPADO' } });
      const t = await c.tela();
      if (tipo === 'sucesso') {
        igual([t.aberta, t.fichaAtual, t.carregando], [false, null, false]);
        igual(linhaOutros(c.amb, 'PST1001')['Excluída'], 'Sim');
      } else {
        igual([t.aberta, t.fichaAtual, t.titulo, t.carregando, t.excluirTravado], [true, 'O:PST1001', 'Disciplina A', false, false]);
        igual(linhaOutros(c.amb, 'PST1001')['Excluída'], '');
      }
      await fim(c);
    });
  }

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  ev('\n=== TOTAL: ' + ok + ' ok, ' + falhas + ' falha(s) ===');
  try { fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true }); fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n'); } catch (e) { /* */ }
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO GERAL:', e && e.stack || e); process.exit(1); });
