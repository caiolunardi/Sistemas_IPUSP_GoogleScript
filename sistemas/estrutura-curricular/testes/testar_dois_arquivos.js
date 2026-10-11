// Importação com os dois arquivos de uma vez (1.4.2): CSV e PDF escolhidos
// juntos. O CSV é conferido e gravado primeiro; o PDF é lido em segundo
// plano e, depois de gravar o CSV, "Continuar com o PDF" leva à conferência
// do PDF (complemento).
// Uso: node testar_dois_arquivos.js <csv> <pdf_com_texto> <pdf_sem_texto>
//   pdf_com_texto: saida/grade_curricular_com_texto_sintetico.pdf (gerado por testar_pdf_texto.js)
//   pdf_sem_texto: o PDF do Júpiter (OCR; aqui só para o caso "ainda lendo", cancelado logo)
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');

const [csvPath, pdfTextoPath, pdfOcrPath] = process.argv.slice(2);
const SAIDA = path.join(__dirname, 'saida');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  const t0 = Date.now();
  try { await fn(); ok++; console.log('  ✓', nome, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

const DONO = 'dono@unidade.example';
async function novoPainel(nav) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: DONO, dono: DONO });
  const r = await abrirPainel(nav, { amb, largura: 1280, altura: 900 });
  await esperarCarregado(r.pagina);
  return Object.assign({ amb }, r);
}
async function abrirImportacao(pagina) {
  await pagina.click('[data-abrir-importacao]');
  await pagina.waitForSelector('#modalImportacao:not([hidden]) #entradaArquivo', { state: 'attached' });
}
const corpo = (pagina) => pagina.textContent('#importacaoCorpo');
const importacoes = (amb) => amb.ctx.obterDadosPainel().dados.importacoes.length;

/** Conferência do CSV → prévia → gravar (com o PDF sendo lido em paralelo). */
async function gravarCsv(pagina) {
  await pagina.click('[data-imp="previa"]');
  await pagina.waitForSelector('[data-imp="gravar"]:not([disabled])');
  verdade(/Primeira importação/.test(await corpo(pagina)), 'prévia da primeira carga');
  await pagina.click('[data-imp="gravar"]');
  await pagina.waitForSelector('[data-imp="concluir"]');
  verdade(/Importação gravada/.test(await corpo(pagina)), 'CSV gravado');
}

(async () => {
  for (const [rot, arq] of [['CSV', csvPath], ['PDF com texto', pdfTextoPath], ['PDF sem texto', pdfOcrPath]]) {
    if (!arq || !fs.existsSync(arq)) { console.error('arquivo ausente (' + rot + '): ' + arq); process.exit(2); }
  }
  const nav = await abrirNavegador();
  const erros = [];

  console.log('\n== Escolha dos arquivos');
  await teste('a caixa de arquivo aceita mais de um arquivo e diz que pode receber os dois', async () => {
    const p = await novoPainel(nav);
    await abrirImportacao(p.pagina);
    verdade(await p.pagina.getAttribute('#entradaArquivo', 'multiple') !== null, 'input multiple');
    const txt = await corpo(p.pagina);
    verdade(/os dois, CSV e PDF/.test(txt) && /Escolher arquivo\(s\)/.test(txt), txt.slice(0, 300));
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });
  await teste('dois CSV, ou três arquivos: recusados com explicação, nada gravado', async () => {
    const p = await novoPainel(nav);
    await abrirImportacao(p.pagina);
    await p.pagina.setInputFiles('#entradaArquivo', [csvPath, csvPath]);
    await p.pagina.waitForSelector('#importacaoCorpo .alerta--erro');
    verdade(/escolha um CSV e um PDF/.test(await corpo(p.pagina)), 'mensagem de dois do mesmo tipo');
    await p.pagina.setInputFiles('#entradaArquivo', [csvPath, pdfTextoPath, csvPath]);
    await p.pagina.waitForFunction(() => /no máximo dois arquivos/.test(document.getElementById('importacaoCorpo').textContent));
    igual(importacoes(p.amb), 0, 'nada gravado');
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });

  console.log('\n== CSV e PDF juntos (PDF com texto)');
  await teste('PDF antes do CSV na lista: CSV primeiro ("Arquivo 1 de 2"), grava; "Continuar com o PDF" → complemento; duas importações', async () => {
    const p = await novoPainel(nav);
    const pg = p.pagina;
    await abrirImportacao(pg);
    await pg.setInputFiles('#entradaArquivo', [pdfTextoPath, csvPath]);
    await pg.waitForSelector('[data-imp="previa"]');
    const conf = await corpo(pg);
    verdade(/Arquivo 1 de 2: CSV/.test(conf), 'linha de situação do segundo arquivo');
    verdade(/183 disciplinas diferentes/.test(conf), 'conferência é a do CSV: ' + conf.slice(0, 300));
    await pg.waitForFunction(() => /já foi lido/.test((document.getElementById('statusSegundo') || {}).textContent || ''), null, { timeout: 60000 });
    await pg.screenshot({ path: path.join(SAIDA, '40-dois-arquivos-conferencia-csv.png'), fullPage: true });
    await gravarCsv(pg);
    const gravado = await corpo(pg);
    verdade(/Próximo: o PDF/.test(gravado) && /já foi lido/.test(gravado), 'aviso do próximo arquivo');
    verdade(!/Arquivo 1 de 2/.test(gravado), 'sem a linha repetida "Arquivo 1 de 2" na tela de gravado');
    verdade(await pg.isVisible('[data-imp="continuar-pdf"]'), 'botão Continuar com o PDF');
    verdade(/sem o PDF/.test(await pg.textContent('#importacaoRodape')), 'opção de parar no CSV');
    igual(importacoes(p.amb), 1, 'CSV gravado');
    await pg.screenshot({ path: path.join(SAIDA, '41-dois-arquivos-csv-gravado.png'), fullPage: true });

    await pg.click('[data-imp="continuar-pdf"]');
    await pg.waitForSelector('[data-imp="previa"]');
    const confPdf = await corpo(pg);
    verdade(/PDF com texto/.test(confPdf), 'conferência do PDF: ' + confPdf.slice(0, 300));
    verdade(!/Arquivo 1 de 2/.test(confPdf), 'linha "Arquivo 1 de 2" some na vez do PDF');
    await pg.click('[data-imp="previa"]');
    await pg.waitForSelector('[data-imp="gravar"]');
    verdade(/complemento/.test(await corpo(pg)), 'PDF entra como complemento');
    // revisão (se houver): abre todas as páginas e marca a caixa
    if (await pg.$('#confirmarRevisao')) {
      for (let i = 0; i < 50; i++) {
        const prox = await pg.$('#revisaoLista nav:first-of-type [data-imp="rev-proxima"]:not([disabled])');
        if (!prox) break;
        const antes = await pg.textContent('#revisaoLista');
        await prox.click();
        await pg.waitForFunction((a) => { const t = document.getElementById('revisaoLista').textContent; return t !== a && !/Carregando/.test(t); }, antes);
      }
      await pg.check('#confirmarRevisao');
    }
    await pg.waitForSelector('[data-imp="gravar"]:not([disabled])');
    await pg.click('[data-imp="gravar"]');
    await pg.waitForSelector('[data-imp="concluir"]');
    verdade(/Importação gravada/.test(await corpo(pg)), 'PDF gravado');
    verdade(!(await pg.$('[data-imp="continuar-pdf"]')), 'não oferece continuar de novo');
    await pg.click('[data-imp="concluir"]');
    await esperarCarregado(pg);
    const d = p.amb.ctx.obterDadosPainel().dados;
    igual(d.importacoes.length, 2, 'duas importações (CSV + PDF)');
    verdade(d.base.disciplinas.some((x) => x.ext !== '' && x.ext != null), 'EXT veio do PDF');
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });
  await teste('"Ver a estrutura (sem o PDF)": fica só o CSV; a leitura do PDF é abandonada sem erro', async () => {
    const p = await novoPainel(nav);
    const pg = p.pagina;
    await abrirImportacao(pg);
    await pg.setInputFiles('#entradaArquivo', [csvPath, pdfTextoPath]);
    await pg.waitForSelector('[data-imp="previa"]');
    await gravarCsv(pg);
    await pg.click('#importacaoRodape [data-imp="concluir"]');
    await esperarCarregado(pg);
    await pg.waitForTimeout(3000);
    igual(importacoes(p.amb), 1, 'só o CSV');
    await abrirImportacao(pg);
    verdade(!/Arquivo 1 de 2/.test(await corpo(pg)), 'nova importação começa limpa');
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });

  console.log('\n== PDF ainda em leitura (sem texto, OCR)');
  await teste('"Continuar com o PDF" antes do fim da leitura mostra o progresso; "Cancelar leitura" volta à escolha do arquivo', async () => {
    const p = await novoPainel(nav);
    const pg = p.pagina;
    await abrirImportacao(pg);
    await pg.setInputFiles('#entradaArquivo', [csvPath, pdfOcrPath]);
    await pg.waitForSelector('[data-imp="previa"]');
    verdade(/sendo lido enquanto isso/.test(await pg.textContent('#statusSegundo')), 'situação: lendo');
    await gravarCsv(pg);
    verdade(/ainda está sendo lido/.test(await corpo(pg)), 'aviso: ainda lendo');
    await pg.click('[data-imp="continuar-pdf"]');
    await pg.waitForSelector('#barraLeitura');
    await pg.waitForFunction(() => !/Abrindo o PDF/.test(document.getElementById('leituraMensagem').textContent), null, { timeout: 120000 });
    await pg.screenshot({ path: path.join(SAIDA, '42-dois-arquivos-pdf-lendo.png'), fullPage: true });
    await pg.click('[data-imp="cancelar-leitura"]');
    await pg.waitForSelector('#entradaArquivo', { state: 'attached', timeout: 120000 });
    igual(importacoes(p.amb), 1, 'só o CSV gravado');
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });
  await teste('fechar a janela com o PDF em leitura: nada quebra e a próxima importação começa limpa', async () => {
    const p = await novoPainel(nav);
    const pg = p.pagina;
    await abrirImportacao(pg);
    await pg.setInputFiles('#entradaArquivo', [csvPath, pdfOcrPath]);
    await pg.waitForSelector('[data-imp="previa"]');
    await pg.click('#importacaoFechar');
    await pg.waitForSelector('#modalImportacao', { state: 'hidden' });
    await pg.waitForTimeout(2000);
    await abrirImportacao(pg);
    verdade(!/Arquivo 1 de 2/.test(await corpo(pg)), 'sem resto do PDF anterior');
    igual(importacoes(p.amb), 0);
    erros.push(...p.errosPagina);
    await p.contexto.close();
  });

  await teste('nenhum erro de JavaScript nas páginas', async () => { igual(erros, []); });
  await nav.close();
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0` + (falhou.length ? ' — falharam: ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
