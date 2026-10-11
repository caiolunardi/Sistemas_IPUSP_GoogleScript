// Homologação visual: larguras 360/390/480/768/1280, temas claro/escuro/sistema,
// contraste, transbordamento horizontal, marca por tema, foco e persistência.
// Uso: node testar_visual.js <csv> <paginas_ocr.json> [<disciplinas_unidade.csv>]
// Com o CSV da unidade, confere também as telas da preparação da grade (1.3.0).
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { abrirPaginasRevisao } = require('./apoio_revisao');

const [csvPath, paginasJson, unidadePath] = process.argv.slice(2);
const SAIDA = path.join(__dirname, 'saida', 'visual');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// Base pronta: CSV + PDF (palavras do OCR feito no navegador).
function ambienteComDados() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC });
  amb.ctx.obterDadosPainel();
  const L = carregar();
  const csv = JSON.parse(JSON.stringify(L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv')));
  let p = amb.ctx.prepararImportacao(csv); amb.ctx.confirmarImportacao(csv, p.dados.assinatura, { operacao: p.dados.operacao });
  const r = JSON.parse(fs.readFileSync(paginasJson, 'utf8'));
  const pdf = JSON.parse(JSON.stringify(L.LeitorPdfJupiter.analisar(r.paginas, { modo: r.modo, arquivo: 'grade_curricular.pdf' })));
  delete pdf.conferencia.itens; delete pdf.conferencia.linhasNaoReconhecidas;
  p = amb.ctx.prepararImportacao(pdf);
  abrirPaginasRevisao(amb, p.dados);
  const c = amb.ctx.confirmarImportacao(pdf, p.dados.assinatura, { operacao: p.dados.operacao, revisaoPdf: true });
  if (!c.ok) throw new Error(c.erro);
  // uma observação para aparecer na ficha
  const s = amb.estrutura().getSheetByName('Disciplinas');
  const cab = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  const cods = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map((l) => l[0]);
  s.getRange(cods.indexOf('PSC1322') + 2, cab.indexOf('Observações') + 1).setValue('Exemplo de observação do Serviço de Graduação.');
  return amb;
}

/** Aceita o "Descartar as alterações?" da ficha editável. */
function respostaDescartar(pagina) { pagina.once('dialog', (d) => d.accept()); }

// Contraste WCAG entre duas cores CSS rgb()/rgba() (fundo opaco).
function luminancia(rgb) {
  const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

(async () => {
  const nav = await abrirNavegador();
  const amb = ambienteComDados();
  const LARGURAS = [360, 390, 480, 768, 1280];
  const relatorioContraste = [];

  for (const tema of ['light', 'dark']) {
    console.log('\n== Tema', tema === 'light' ? 'claro' : 'escuro', '(preferência Sistema, SO em ' + tema + ')');
    for (const largura of LARGURAS) {
      await teste(`${largura}px: sem rolagem horizontal na lista, ficha, filtros, currículos e importação`, async () => {
        const { pagina, errosPagina, contexto } = await abrirPainel(nav, { amb, largura, altura: largura < 768 ? 800 : 900, esquema: tema, latencia: 0 });
        await esperarCarregado(pagina);
        const temaResolvido = await pagina.evaluate(() => document.documentElement.getAttribute('data-theme'));
        verdade(temaResolvido === tema, 'tema resolvido ' + temaResolvido);
        const excesso = async (onde) => {
          const r = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
          verdade(r.sw <= r.iw, `${onde}: scrollWidth ${r.sw} > ${r.iw}`);
        };
        await excesso('lista');
        const pref = `${tema}-${largura}`;
        await pagina.screenshot({ path: path.join(SAIDA, `${pref}-lista.png`) });
        if (largura < 768) {
          await pagina.click('#botaoFiltros');
          await excesso('filtros abertos');
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-filtros.png`) });
          await pagina.click('#botaoFiltros');
        }
        // Ficha
        await pagina.fill('#campoBusca', 'PSC1322');
        await pagina.waitForTimeout(250);
        await pagina.click('#corpoTabela [data-abrir-ficha="PSC1322"]');
        await pagina.waitForSelector('#modalDisciplina:not([hidden])');
        await excesso('ficha');
        const painelFicha = await pagina.$('#modalDisciplina .modal__painel');
        const larguraPainel = await painelFicha.evaluate((el) => el.scrollWidth - el.clientWidth);
        verdade(larguraPainel <= 0, 'conteúdo da ficha mais largo que o painel: ' + larguraPainel);
        await painelFicha.screenshot({ path: path.join(SAIDA, `${pref}-ficha.png`) });
        await pagina.click('#modalDisciplina .modal__fechar');
        await pagina.fill('#campoBusca', '');
        await pagina.waitForTimeout(250);
        // Currículos
        await pagina.click('#aba-curriculos');
        await excesso('currículos');
        await pagina.screenshot({ path: path.join(SAIDA, `${pref}-curriculos.png`), fullPage: largura >= 768 });
        await pagina.click('#aba-disciplinas');
        // Importação (passo 1)
        await pagina.click('[data-abrir-importacao]');
        await pagina.waitForSelector('#modalImportacao:not([hidden])');
        await excesso('importação');
        await (await pagina.$('#modalImportacao .modal__painel')).screenshot({ path: path.join(SAIDA, `${pref}-importacao.png`) });
        await pagina.click('[data-imp="fechar"]');
        verdade(errosPagina.length === 0, 'erros: ' + errosPagina.join(' | '));
        await contexto.close();
      });
    }

    await teste('prévia do PDF (conferência, informações e revisão) em 360 e 1280 px, sem rolagem horizontal', async () => {
      const ambCsv = criarAmbiente({ dirSrc: DIR_SRC });
      ambCsv.ctx.obterDadosPainel();
      const Lx = carregar();
      const csv = JSON.parse(JSON.stringify(Lx.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv')));
      const pr = ambCsv.ctx.prepararImportacao(csv); ambCsv.ctx.confirmarImportacao(csv, pr.dados.assinatura, { operacao: pr.dados.operacao });
      const paginas = JSON.parse(fs.readFileSync(paginasJson, 'utf8')).paginas;
      for (const largura of [360, 1280]) {
        const { pagina, errosPagina, contexto } = await abrirPainel(nav, { amb: ambCsv, largura, altura: 800, esquema: tema, latencia: 0 });
        await esperarCarregado(pagina);
        await pagina.evaluate((pgs) => { window.Importacao.abrirComPacote(LeitorPdfJupiter.analisar(pgs, { modo: 'ocr', arquivo: 'grade_curricular.pdf' })); }, paginas);
        await pagina.click('[data-imp="previa"]');
        await pagina.waitForSelector('#confirmarRevisao');
        const r = await pagina.evaluate(() => {
          const p = document.querySelector('#modalImportacao .modal__painel');
          return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, painel: p.scrollWidth - p.clientWidth };
        });
        verdade(r.sw <= r.iw && r.painel <= 0, `${largura}px: ${JSON.stringify(r)}`);
        verdade(await pagina.isDisabled('[data-imp="gravar"]'), 'gravar bloqueado até a revisão');
        verdade(/Página 1 de 4/.test(await pagina.textContent('#revisaoLista')), 'paginação da revisão');
        await pagina.evaluate(() => { const h = Array.from(document.querySelectorAll('#importacaoCorpo h3')).find((x) => /Conferência do PDF/.test(x.textContent)); h.scrollIntoView(); });
        await pagina.screenshot({ path: path.join(SAIDA, `${tema}-${largura}-previa-pdf.png`) });
        await pagina.evaluate(() => document.getElementById('confirmarRevisao').scrollIntoView({ block: 'center' }));
        await pagina.screenshot({ path: path.join(SAIDA, `${tema}-${largura}-previa-pdf-revisao.png`) });
        verdade(errosPagina.length === 0, 'erros: ' + errosPagina.join(' | '));
        await contexto.close();
      }
    });
    await teste('marca correta no tema e contraste das combinações principais', async () => {
      const { pagina, contexto } = await abrirPainel(nav, { amb, largura: 1280, esquema: tema, latencia: 0 });
      await esperarCarregado(pagina);
      const marca = await pagina.evaluate(() => {
        const vis = (el) => el && getComputedStyle(el).display !== 'none';
        return { clara: vis(document.querySelector('.cabecalho .gradip-logo-light')), escura: vis(document.querySelector('.cabecalho .gradip-logo-dark')) };
      });
      verdade(tema === 'light' ? marca.clara && !marca.escura : !marca.clara && marca.escura, 'marca: ' + JSON.stringify(marca));
      // abre a ficha para medir também as cores do modal
      await pagina.click('#corpoTabela [data-abrir-ficha="PSC1322"]');
      await pagina.waitForSelector('#modalDisciplina:not([hidden])');
      const pares = await pagina.evaluate(() => {
        function rgb(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return p.length === 4 && p[3] === 0 ? null : p.slice(0, 3); }
        function fundo(el) { while (el) { const b = rgb(getComputedStyle(el).backgroundColor); if (b) return b; el = el.parentElement; } return [255, 255, 255]; }
        function par(sel, nome, tipo) {
          const el = document.querySelector(sel);
          if (!el) return { nome, falta: true };
          const cs = getComputedStyle(el);
          return { nome, tipo: tipo || 'texto', cor: rgb(tipo === 'borda' ? cs.borderTopColor : cs.color), fundo: fundo(tipo === 'borda' ? el.parentElement : el) };
        }
        return [
          par('.estadoBase__titulo', 'título sobre cartão'),
          par('.estadoBase__meta', 'texto secundário sobre cartão'),
          par('.cabecalho__subtitulo', 'subtítulo do cabeçalho'),
          par('.abas__aba[aria-selected="true"]', 'aba ativa'),
          par('.abas__aba[aria-selected="false"]', 'aba inativa'),
          par('.tabela__codigo', 'código (link) na tabela'),
          par('.tabela__nome', 'nome na tabela'),
          par('.selo', 'selo de oferta'),
          par('.botao--primario', 'botão primário'),
          par('.campo__rotulo', 'rótulo de campo'),
          par('#campoBusca', 'borda do campo de busca', 'borda'),
          par('.marcador', 'borda do marcador', 'borda'),
          par('.resumoDidatico p', 'resumo didático'),
          par('.numero__explicacao', 'explicação dos números'),
          par('.linkDisciplina', 'link de requisito'),
          par('.alerta--info p, #fichaObservacoes', 'observações (alerta informativo ou campo da ficha editável)'),
          par('.modal__subtitulo', 'subtítulo do modal'),
          par('#versaoSistema', 'versão no fim da página')
        ];
      });
      for (const p of pares) {
        if (p.falta) throw new Error('elemento ausente: ' + p.nome);
        const r = contraste(p.cor, p.fundo);
        const minimo = p.tipo === 'borda' ? 3 : 4.5;
        relatorioContraste.push({ tema, nome: p.nome, razao: Math.round(r * 100) / 100, minimo });
        verdade(r >= minimo, `${p.nome}: ${r.toFixed(2)} < ${minimo}`);
      }
      await contexto.close();
    });
  }

  if (unidadePath) {
    console.log('\n== Preparação da grade (etapas, ficha editável, lista por unidade, lista final)');
    // Base com um ajuste, uma exclusão, as disciplinas da unidade e uma seleção.
    const ambP = ambienteComDados();
    const textoUnidade = carregar().LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(unidadePath))).texto;
    const pv = ambP.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv').dados;
    verdade(ambP.ctx.incluirDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv', pv.assinatura, pv.novas.map((d) => d.codigo)).ok, 'incluir');
    verdade(ambP.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Psicopatologia (ajuste de exemplo)' } }).ok, 'ajuste');
    verdade(ambP.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { unidadeAtendida: 'Unidade fictícia', cursoAtendido: 'Curso fictício', oferecimento: '1' } }).ok, 'outros');
    verdade(ambP.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSE2355' }], true).ok, 'excluir');
    verdade(ambP.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PSC1322' }, { origem: 'estrutura', chave: 'PSA1302' }, { origem: 'estrutura', chave: '4701381' }, { origem: 'estrutura', chave: '0420130' }, { origem: 'outros', chave: 'PST0391' }]).ok, 'adicionar à grade');
    for (const tema of ['light', 'dark']) {
      for (const largura of [360, 768, 1280]) {
        await teste(`${tema === 'light' ? 'claro' : 'escuro'} ${largura}px: etapas, lote, ficha editável, lista da unidade e lista final sem rolagem horizontal; contraste dos selos e avisos novos`, async () => {
          const { pagina, errosPagina, contexto } = await abrirPainel(nav, { amb: ambP, largura, altura: largura < 768 ? 800 : 900, esquema: tema, latencia: 0 });
          await esperarCarregado(pagina);
          const pref = `${tema}-${largura}-prep`;
          const excesso = async (onde) => {
            const r = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, modais: Array.from(document.querySelectorAll('.modal:not([hidden]) .modal__painel')).map((p) => p.scrollWidth - p.clientWidth) }));
            verdade(r.sw <= r.iw && r.modais.every((x) => x <= 0), `${onde}: ${JSON.stringify(r)}`);
          };
          // Etapa 1 com duas caixas marcadas (barra de lote)
          const caixas = pagina.locator('#corpoTabela .caixaSelecao');
          await caixas.nth(0).check(); await caixas.nth(1).check();
          await excesso('etapa 1 com seleção');
          await pagina.evaluate(() => document.getElementById('barraLote').scrollIntoView({ block: 'center' }));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-1-lote.png`) });
          await pagina.click('#barraLote [data-lote="limpar"]');
          // Ficha editável
          await pagina.fill('#campoBusca', 'PSC1322');
          await pagina.waitForTimeout(250);
          await pagina.click('#corpoTabela [data-abrir-ficha="PSC1322"]');
          await pagina.waitForSelector('#modalDisciplina:not([hidden]) #fichaCampo-nome');
          await pagina.fill('#fichaCampo-creditosAula', '9');
          await excesso('ficha editável');
          // Tela visível (o painel da ficha rola dentro da janela fixa).
          await pagina.evaluate(() => document.getElementById('fichaCampo-creditosAula').scrollIntoView({ block: 'center' }));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-2-ficha.png`) });
          const medir = (sel, nome, tipo) => pagina.evaluate(([sel, nome, tipo]) => {
            function rgb(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return p.length === 4 && p[3] === 0 ? null : p.slice(0, 3); }
            function fundo(el) { while (el) { const b = rgb(getComputedStyle(el).backgroundColor); if (b) return b; el = el.parentElement; } return [255, 255, 255]; }
            const el = document.querySelector(sel);
            if (!el) return { nome, falta: true };
            const cs = getComputedStyle(el);
            return { nome, tipo: tipo || 'texto', cor: rgb(tipo === 'borda' ? cs.borderTopColor : cs.color), fundo: fundo(tipo === 'borda' ? el.parentElement : el) };
          }, [sel, nome, tipo]);
          const pares = [
            await medir('#fichaCampo-nome-dica', 'dica "Ajustado · Júpiter"'),
            await medir('#fichaChAviso', 'aviso de CH'),
            await medir('#fichaExcluir', 'botão Excluir (perigo)'),
            await medir('#fichaSalvar', 'botão Salvar'),
            await medir('.campoFicha__dica--neutra', 'dica neutra do campo')
          ];
          respostaDescartar(pagina);
          await pagina.click('#modalDisciplina .modal__fechar');
          await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
          await pagina.fill('#campoBusca', '');
          await pagina.waitForTimeout(250);
          pares.push(await medir('#corpoTabela .selo--ajustada', 'selo Ajustada'));
          pares.push(await medir('.etapas__contagem', 'contagem da etapa'));
          pares.push(await medir('.etapas__etapa[aria-selected="true"] .etapas__titulo', 'etapa ativa'));
          pares.push(await medir('.etapas__etapa[aria-selected="false"]', 'borda da etapa inativa', 'borda'));
          if (largura <= 768) await pagina.click('#botaoFiltros');
          await pagina.selectOption('#filtroSituacao', 'EXCLUIDA');
          pares.push(await medir('#corpoTabela .selo--excluida', 'selo Excluída'));
          await pagina.selectOption('#filtroSituacao', 'NA');
          if (largura <= 768) await pagina.click('#botaoFiltros');
          // Etapa 2
          await pagina.click('#etapa-2');
          await excesso('etapa 2');
          pares.push(await medir('#oCorpoTabela .selo--OUTROS', 'selo Para outros cursos'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-3-outros.png`) });
          await pagina.click('[data-abrir-unidade]');
          await pagina.setInputFiles('#entradaUnidade', unidadePath);
          await pagina.waitForSelector('#unidadeCorpo');
          await pagina.waitForFunction(() => /ainda não estão na lista|Nada a incluir/.test(document.getElementById('unidadeCorpo').textContent));
          await excesso('lista da unidade');
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-4-unidade.png`) });
          await pagina.click('#unidadeRodape [data-fechar-unidade]');
          // Cadastro
          await pagina.click('[data-cadastrar-outros]');
          await pagina.waitForSelector('#modalDisciplina:not([hidden]) #fichaCampo-codigo');
          await excesso('cadastro');
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-5-cadastro.png`) });
          await pagina.click('#modalDisciplina .modal__fechar');
          // Etapa 3
          await pagina.click('#etapa-3');
          await excesso('etapa 3');
          pares.push(await medir('#gBarraLote .barraLote__texto', 'texto da barra de seleção'));
          pares.push(await medir('#gCorpoTabela tr.linhaMarcada .tabela__nome', 'nome em linha selecionada'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-6-grade.png`) });
          pares.push(await medir('#gCorpoTabela .selo--grade', 'rótulo "Adicionada à Grade Horária"'));
          // Escolha para enviar (1.4.0) e aviso das sem semestre de oferecimento.
          await pagina.click('#gBarraLote [data-lote="selecionar"]');   // no celular o cabeçalho da tabela fica oculto
          await excesso('etapa 3 com escolhas');
          pares.push(await medir('#gBarraLote [data-lote="enviarGrade"]', 'botão Enviar para a Grade Horária'));
          await pagina.evaluate(() => document.getElementById('gBarraLote').scrollIntoView({ block: 'center' }));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-7-grade-escolha.png`) });
          await pagina.click('#gBarraLote [data-lote="limpar"]');
          if (largura <= 768) await pagina.click('#gBotaoFiltros');
          await pagina.fill('#gCampoBusca', '4702522');
          await pagina.waitForTimeout(250);
          await pagina.check('#gCorpoTabela .caixaSelecao');
          await pagina.click('#gBarraLote [data-lote="enviarGrade"]');
          await pagina.waitForSelector('#gBarraLote .barraLote__aviso');
          await excesso('etapa 3 com aviso');
          pares.push(await medir('#gBarraLote .barraLote__aviso', 'aviso "sem semestre de oferecimento"'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-8-grade-aviso.png`) });
          await pagina.click('#gBarraLote [data-lote="limpar"]');
          await pagina.fill('#gCampoBusca', '');
          await pagina.waitForTimeout(250);
          if (largura <= 768) await pagina.click('#gBotaoFiltros');
          // Etapa 4: prévia
          await pagina.click('#etapa-4');
          await pagina.click('#previa-aba-PST');
          await excesso('prévia');
          pares.push(await medir('#previa-aba-PST', 'aba ativa da prévia'));
          await pagina.locator('#previaPaineis .caixaPrevia').first().check();
          pares.push(await medir('[data-previa-remover]', 'botão Remover da grade'));
          pares.push(await medir('#previaPaineis .selo--OUTROS', 'selo Para outros cursos na prévia'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-9-previa.png`) });
          await pagina.locator('#previaPaineis .caixaPrevia').first().uncheck();
          // Cadastrar nova grade (janela)
          await pagina.click('[data-cadastrar-nova-grade]');
          await pagina.waitForSelector('#modalRecomeco:not([hidden])');
          await excesso('cadastrar nova grade');
          pares.push(await medir('#modalRecomeco .alerta__titulo', 'título do alerta de recomeço'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-10-nova-grade.png`) });
          await pagina.click('#recomecoRodape [data-fechar-recomeco]');
          // Enviar Grade para Preenchimento (1.5.0): janela de confirmação
          await pagina.click('#enviarGradePreenchimento');
          await pagina.waitForSelector('#modalEnvioGrade:not([hidden])');
          await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');   // (1.8.12) prévia do envio carregada
          await excesso('confirmação do envio da grade');
          pares.push(await medir('#envioGradeCorpo .tabelaEnvio__total td', 'total da tabela do envio'));
          pares.push(await medir('#envioGradeCorpo .alerta__titulo', 'título do aviso do envio'));
          pares.push(await medir('[data-confirmar-envio]', 'botão Fazer a cópia e enviar'));
          await pagina.screenshot({ path: path.join(SAIDA, `${pref}-11-envio-grade.png`) });
          await pagina.click('#envioGradeRodape [data-fechar-envio]');
          for (const p of pares) {
            if (p.falta) throw new Error('elemento ausente: ' + p.nome);
            const r = contraste(p.cor, p.fundo);
            const minimo = p.tipo === 'borda' ? 3 : 4.5;
            if (largura === 1280) relatorioContraste.push({ tema, nome: p.nome, razao: Math.round(r * 100) / 100, minimo });
            verdade(r >= minimo, `${p.nome}: ${r.toFixed(2)} < ${minimo}`);
          }
          verdade(errosPagina.length === 0, 'erros: ' + errosPagina.join(' | '));
          await contexto.close();
        });
      }
    }
  }

  console.log('\n== Preferência de tema');
  await teste('alerta "planilha desatualizada" e paginação da revisão em 360 px, claro e escuro: sem rolagem horizontal, contraste do alerta ≥ 4,5:1', async () => {
    const ambA = ambienteComDados();
    const alt = JSON.parse(JSON.stringify(carregar().LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv')));
    alt.disciplinas.find((d) => d.codigo === 'PSC1322').nome = 'Nome alterado';
    const pr = ambA.ctx.prepararImportacao(alt);
    let armado = false;
    ambA.injetarFalha((e) => { if (e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') { armado = true; return false; } return armado && e.tipo === 'setName'; }, 1000);
    verdade(ambA.ctx.confirmarImportacao(alt, pr.dados.assinatura, { operacao: pr.dados.operacao }).ok);
    for (const tema of ['light', 'dark']) {
      const { pagina, errosPagina, contexto } = await abrirPainel(nav, { amb: ambA, largura: 360, altura: 800, esquema: tema, latencia: 0 });
      await esperarCarregado(pagina);
      await pagina.waitForSelector('.avisoPlanilha');
      const r = await pagina.evaluate(() => {
        const el = document.querySelector('.avisoPlanilha');
        const cor = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
        const lum = (rgb) => { const a = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
        const est = getComputedStyle(el), p = getComputedStyle(el.querySelector('p')), t = getComputedStyle(el.querySelector('.alerta__titulo'));
        const fundo = lum(cor(est.backgroundColor));
        const razao = (c) => { const l = lum(cor(c)); return (Math.max(l, fundo) + 0.05) / (Math.min(l, fundo) + 0.05); };
        return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, texto: razao(p.color), titulo: razao(t.color) };
      });
      verdade(r.sw <= r.iw, tema + ' rolagem: ' + JSON.stringify(r));
      verdade(r.texto >= 4.5 && r.titulo >= 4.5, tema + ' contraste: ' + JSON.stringify(r));
      await pagina.screenshot({ path: path.join(SAIDA, `${tema}-360-alerta-planilha.png`) });
      verdade(errosPagina.length === 0, 'erros: ' + errosPagina.join(' | '));
      await contexto.close();
    }
  });

  await teste('Sistema acompanha o SO com a página aberta; manual persiste e não acompanha', async () => {
    const { pagina, contexto } = await abrirPainel(nav, { amb, largura: 1280, esquema: 'light', latencia: 0 });
    await esperarCarregado(pagina);
    const tema = () => pagina.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const pref = () => pagina.evaluate(() => document.querySelector('[data-gradip-theme-select]').value);
    verdade((await tema()) === 'light' && (await pref()) === 'system', 'início');
    await pagina.emulateMedia({ colorScheme: 'dark' });
    await pagina.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark', null, { timeout: 3000 }).catch(() => {});
    verdade((await tema()) === 'dark', 'acompanhou o SO');
    verdade((await pref()) === 'system', 'controle continua em Sistema');
    await pagina.selectOption('[data-gradip-theme-select]', 'light');
    verdade((await tema()) === 'light', 'claro manual');
    await pagina.reload();
    await esperarCarregado(pagina);
    verdade((await tema()) === 'light' && (await pref()) === 'light', 'persistiu após recarregar');
    await pagina.emulateMedia({ colorScheme: 'light' });
    await pagina.waitForTimeout(200);
    await pagina.emulateMedia({ colorScheme: 'dark' });
    await pagina.waitForTimeout(300);
    verdade((await tema()) === 'light', 'manual não acompanha o SO');
    await pagina.selectOption('[data-gradip-theme-select]', 'system');
    await pagina.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark', null, { timeout: 3000 }).catch(() => {});
    verdade((await tema()) === 'dark', 'voltou a acompanhar');
    await contexto.close();
  });
  await teste('localStorage indisponível não quebra a página (fica em Sistema)', async () => {
    const { pagina, contexto, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, esquema: 'dark', latencia: 0 });
    await pagina.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
    await pagina.reload();
    await esperarCarregado(pagina);
    verdade((await pagina.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'tema');
    verdade(errosPagina.length === 0, 'erros: ' + errosPagina.join(' | '));
    await contexto.close();
  });

  console.log('\n== Teclado e foco');
  await teste('foco visível e ordem de tabulação até a lista', async () => {
    const { pagina, contexto } = await abrirPainel(nav, { amb, largura: 1280, esquema: 'light', latencia: 0 });
    await esperarCarregado(pagina);
    await pagina.keyboard.press('Tab');
    verdade(/Pular para o conteúdo/.test(await pagina.evaluate(() => document.activeElement.textContent)), 'primeiro Tab = pular para o conteúdo');
    const vistos = [];
    for (let i = 0; i < 40; i++) {
      await pagina.keyboard.press('Tab');
      const info = await pagina.evaluate(() => {
        const el = document.activeElement;
        const cs = getComputedStyle(el);
        // Caixa de seleção dentro de <label>: o alvo de toque é o rótulo inteiro.
        const alvoEl = el.type === 'checkbox' && el.closest('label') ? el.closest('label') : el;
        return { id: el.id || el.getAttribute('data-abrir-ficha') || el.getAttribute('data-filtro') || el.tagName, contorno: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, alvo: alvoEl.getBoundingClientRect().height };
      });
      vistos.push(info);
    }
    verdade(vistos.every((v) => v.contorno), 'sem contorno de foco em: ' + vistos.filter((v) => !v.contorno).map((v) => v.id).join(', '));
    verdade(vistos.some((v) => v.id === 'campoBusca'), 'busca alcançável');
    verdade(vistos.some((v) => /^[A-Z0-9]{7}$/.test(v.id)), 'lista alcançável');
    const pequenos = vistos.filter((v) => v.alvo < 40 && !/^[A-Z0-9]{7}$/.test(v.id));
    verdade(!pequenos.length, 'alvos menores que 40 px: ' + pequenos.map((v) => v.id + '=' + v.alvo).join(', '));
    await contexto.close();
  });

  fs.writeFileSync(path.join(SAIDA, 'contraste.json'), JSON.stringify(relatorioContraste, null, 1));
  console.log('\nContraste (menor razão por tema):');
  ['light', 'dark'].forEach((t) => {
    const l = relatorioContraste.filter((r) => r.tema === t).sort((a, b) => (a.razao / a.minimo) - (b.razao / b.minimo));
    l.slice(0, 4).forEach((r) => console.log('  ', t, r.nome, r.razao + ':1 (mín. ' + r.minimo + ')'));
  });
  await nav.close();
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0`);
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
