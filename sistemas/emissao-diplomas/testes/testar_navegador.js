// Testes de navegador do Gerenciador de Colação de Grau e Diplomas 4.0
// (Chromium real via Playwright). google.script.run é simulado com dados
// fictícios (nenhum servidor, nenhum dado real). Confere: tema GRADIP
// (Sistema/Claro/Escuro, persistência, marca por tema), identificação no
// topo (nome e observação, centralizados, sem saudação), faixa de
// homologação, perfil LEITOR (sem botões que gravam e campos só de
// leitura), página sem acesso, contraste WCAG e larguras de 360 a 1280 px.
// Uso: node testar_navegador.js   (EVIDENCIAS=<pasta> grava as capturas lá)
'use strict';
const fs = require('fs');
const path = require('path');
function carregarPlaywright() { try { return require('playwright'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } }
const { chromium } = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
const MARCA_USP = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'assets', 'usp', 'logo-usp-preto.svg'));
const SAIDA = process.env.EVIDENCIAS ? path.resolve(process.env.EVIDENCIAS) + '/' : null;

function incluir(h) {
  for (let k = 0; k < 5; k++) h = h.replace(/<\?!= include_\('(\w+)'\);? \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  return h;
}
const USUARIO = { nome: 'Pessoa Administradora Fictícia', descricao: 'Equipe Fictícia do Serviço de Graduação' };
function montarPagina(perfil, homologacao, usuario) {
  let h = incluir(fs.readFileSync(SRC + 'DiplomasApp.html', 'utf8'));
  const cfg = { perfil, versao: '4.0.1', homologacao, usuario: usuario || USUARIO };
  h = h.replace(/<\?!= JSON\.stringify\(\{ perfil: perfil[^?]*\?>/, JSON.stringify(cfg).replace(/</g, '\\u003c'));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
function montarSemAcesso() {
  const h = incluir(fs.readFileSync(SRC + 'DiplomasSemAcesso.html', 'utf8'))
    .replace('<?= titulo ?>', 'Sem acesso a este gerenciador')
    .replace('<?= mensagem ?>', 'A sua conta não tem acesso ao Gerenciador de Colação de Grau e Diplomas.');
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}

const ID = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const DADOS = {
  obterColacoes: [{ valor: '20262', rotulo: '2026 — 2º semestre' }, { valor: '20261', rotulo: '2026 — 1º semestre' }],
  obterAlunos: [
    { registroId: ID(1), versao: 1, nome: 'Aluna Fictícia Um', nUsp: '9000001', habilitacao: 'Formação de Psicólogo(a) + Bacharelado', status: 'Pendente', emailEnviado: '' },
    { registroId: ID(2), versao: 2, nome: 'Aluno Fictício Dois', nUsp: '9000002', habilitacao: 'Licenciatura', status: 'OK', emailEnviado: '' }
  ],
  obterTiposDeArquivo: ['Histórico Escolar', 'Documento de Identidade'],
  obterDetalheAluno: {
    registroId: ID(1), versao: 1, nome: 'Aluna Fictícia Um', nUsp: '9000001', email: 'aluna1@exemplo.invalid', genero: 'F', rg: '00.000.000-0',
    status: 'Pendente', statusHistorico: '', statusColacaoEncerramento: '', etapaAtual: 'dados_pessoais', linkPasta: '',
    bachConcluiu: true, licConcluiu: false, psiConcluiu: true, bachAno: '2026', licAno: '', psiAno: '2026',
    requisitos: { bach: false, lic: false, psi: false }, oficioGerado: false, certificadoGerado: false,
    statusColacaoEDiploma: { colacao: { bach: false, lic: false, psi: false }, diploma: { bach: false, lic: false, psi: false } },
    emailDiplomaEnviado: '', emailColacaoEnviado: '',
    arquivos: [{ id: 'ARQ1', nome: 'Histórico Escolar - Aluna Fictícia Um - 20261.pdf', link: 'https://exemplo.invalid/arq1' }]
  },
  obterObservacoes: { texto: 'Observação fictícia.', versaoArquivo: 1 },
  executarEncaminhadorColacao: { encaminhados: 2, retidos: 0, bloqueados: 1, pendencias: [
    { protocolo: 'PCG-20262-00003', nome: '<img src=x onerror="window.__xss=1">Aluna Fictícia Três', colacao: '20262', versao: 1, resultado: 'BLOQUEADO',
      motivoCodigo: 'SEM_CADASTRO_CENTRAL', motivo: 'O Nº USP não tem cadastro na planilha central de alunos. Cadastre pelo Gerenciador de Pessoas.' }] }
};

const simulacao = dados => `
  window.__chamadas = [];
  window.google = { script: { run: (function () {
    const dados = ${JSON.stringify(dados)};
    function novo() {
      let ok = () => {}, falha = () => {};
      const p = new Proxy({}, { get(_, nome) {
        if (nome === 'withSuccessHandler') return f => { ok = f; return p; };
        if (nome === 'withFailureHandler') return f => { falha = f; return p; };
        if (nome === 'withUserObject') return () => p;
        return (...args) => { window.__chamadas.push(nome); setTimeout(() => (dados[nome] && dados[nome].__erro) ? falha(new Error(dados[nome].__erro)) : (nome in dados) ? ok(JSON.parse(JSON.stringify(dados[nome]))) : falha(new Error('sem dado simulado: ' + nome)), 5); };
      } });
      return p;
    }
    return new Proxy({}, { get: (_, nome) => novo()[nome] });
  })() } };`;

let ok = 0, falhas = 0;
async function t(nome, fn) {
  try { await fn(); ok++; console.log('ok   ', nome); }
  catch (e) { falhas++; console.log('FALHA', nome, '\n      ', String(e && e.stack || e).split('\n').slice(0, 6).join('\n       ')); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };

function luminancia(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

(async () => {
  const navegador = await chromium.launch();

  async function abrir({ perfil = 'ADMINISTRADOR', homologacao = false, usuario, tema, esquema = 'light', largura = 1280, dados = DADOS } = {}) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 }, colorScheme: esquema });
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on('pageerror', e => erros.push(String(e)));
    await pagina.addInitScript(simulacao(dados));
    // pdf.js vem de CDN no Google; aqui a rede fica fechada.
    await pagina.addInitScript(() => { Object.defineProperty(window, 'pdfjsLib', { value: { GlobalWorkerOptions: {} }, writable: true }); });
    if (tema) await pagina.addInitScript(t => { try { localStorage.setItem('gradip-theme', t); } catch (e) {} }, tema);
    await pagina.route('**/*', r => {
      const url = r.request().url();
      if (url.startsWith('https://diplomas.exemplo.invalid/')) return r.fulfill({ contentType: 'text/html', body: montarPagina(perfil, homologacao, usuario) });
      // Marca USP clara: no Google vem do site do Instituto; aqui, a cópia do repositório.
      if (/\/usp\.png$/.test(url)) return r.fulfill({ contentType: 'image/svg+xml', body: MARCA_USP });
      return r.abort();
    });
    await pagina.goto('https://diplomas.exemplo.invalid/');
    await pagina.waitForFunction(() => document.querySelectorAll('.botaoColacao').length > 0);
    return { contexto, pagina, erros };
  }
  const captura = async (pagina, nome) => { if (SAIDA) await pagina.screenshot({ path: SAIDA + nome + '.png', fullPage: false }); };

  await t('identificação no topo: nome na 1ª linha, observação na 2ª, centralizadas e sem saudação', async () => {
    const { contexto, pagina, erros } = await abrir();
    const info = await pagina.evaluate(() => {
      const caixa = document.getElementById('identificacaoUsuario');
      const nome = document.getElementById('identificacaoNome'), desc = document.getElementById('identificacaoDescricao');
      const r = caixa.getBoundingClientRect(), rn = nome.getBoundingClientRect(), rd = desc.getBoundingClientRect();
      const cabecalho = document.getElementById('headerSistema').innerText;
      return { visivel: !caixa.hidden, nome: nome.textContent, desc: desc.textContent, centro: (rn.left + rn.right) / 2, centroD: (rd.left + rd.right) / 2, centroCaixa: (r.left + r.right) / 2,
        abaixo: rd.top >= rn.bottom - 1, alinhamento: getComputedStyle(caixa).textAlign, cabecalho };
    });
    assert(info.visivel && info.nome === 'Pessoa Administradora Fictícia' && info.desc === 'Equipe Fictícia do Serviço de Graduação', JSON.stringify(info));
    assert(info.abaixo, 'observação deveria ficar abaixo do nome');
    assert(Math.abs(info.centro - info.centroCaixa) < 2 && Math.abs(info.centroD - info.centroCaixa) < 2 && info.alinhamento === 'center', 'não está centralizado');
    assert(!/\b(olá|ola|bom dia|boa tarde|boa noite)\b/i.test(info.cabecalho), 'saudação no topo: ' + info.cabecalho);
    assert(!erros.length, erros.join('\n'));
    await captura(pagina, 'admin-claro-1280');
    await contexto.close();
  });

  await t('sem observação: só o nome', async () => {
    const { contexto, pagina } = await abrir({ usuario: { nome: 'Pessoa Leitora Fictícia', descricao: '' }, perfil: 'LEITOR' });
    const desc = await pagina.evaluate(() => { const d = document.getElementById('identificacaoDescricao'); return { t: d.textContent, mostra: getComputedStyle(d).display }; });
    assert(desc.t === '' && desc.mostra === 'none', JSON.stringify(desc));
    await contexto.close();
  });

  await t('texto da aba de acesso vai como texto, nunca como HTML', async () => {
    const { contexto, pagina } = await abrir({ usuario: { nome: '<img src=x onerror="window.__xss=1">Nome', descricao: '</script><b>x</b>' } });
    const r = await pagina.evaluate(() => ({ xss: window.__xss, nome: document.getElementById('identificacaoNome').textContent, imgs: document.querySelectorAll('#identificacaoUsuario img, #identificacaoUsuario b').length }));
    assert(!r.xss && r.imgs === 0 && r.nome.startsWith('<img'), JSON.stringify(r));
    await contexto.close();
  });

  for (const [tema, esquema, esperado] of [[null, 'light', 'light'], [null, 'dark', 'dark'], ['light', 'dark', 'light'], ['dark', 'light', 'dark']]) {
    await t(`tema: preferência ${tema || 'system'} com SO ${esquema} → ${esperado}; seletor e marca coerentes`, async () => {
      const { contexto, pagina } = await abrir({ tema, esquema });
      const r = await pagina.evaluate(() => {
        const visivel = sel => [...document.querySelectorAll('#headerSistema ' + sel)].some(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none');
        return { tema: document.documentElement.dataset.theme, seletor: document.querySelector('[data-gradip-theme-select]').value,
          claro: visivel('.gradip-logo-light'), escuro: visivel('.gradip-logo-dark'),
          filtros: [...document.querySelectorAll('svg, img')].some(e => getComputedStyle(e).filter !== 'none') };
      });
      assert(r.tema === esperado, JSON.stringify(r));
      assert(r.seletor === (tema || 'system'), 'seletor mostra ' + r.seletor);
      assert(esperado === 'dark' ? (r.escuro && !r.claro) : (r.claro && !r.escuro), 'marca errada para o tema');
      assert(!r.filtros, 'filtro CSS na marca');
      if (!tema) await captura(pagina, 'admin-' + (esperado === 'dark' ? 'escuro' : 'claro') + '-sistema');
      await contexto.close();
    });
  }

  await t('troca manual persiste após recarregar e "Sistema" volta a seguir o SO', async () => {
    const { contexto, pagina } = await abrir({ esquema: 'light' });
    await pagina.selectOption('[data-gradip-theme-select]', 'dark');
    await pagina.reload(); await pagina.waitForFunction(() => document.querySelectorAll('.botaoColacao').length > 0);
    assert(await pagina.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'não persistiu');
    await pagina.selectOption('[data-gradip-theme-select]', 'system');
    await pagina.emulateMedia({ colorScheme: 'dark' });
    await pagina.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { timeout: 3000 });
    await pagina.emulateMedia({ colorScheme: 'light' });
    await pagina.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { timeout: 3000 });
    // Escolha manual não acompanha o SO.
    await pagina.selectOption('[data-gradip-theme-select]', 'light');
    await pagina.emulateMedia({ colorScheme: 'dark' });
    await pagina.waitForTimeout(300);
    assert(await pagina.evaluate(() => document.documentElement.dataset.theme) === 'light', 'escolha manual seguiu o SO');
    await contexto.close();
  });

  await t('homologação: faixa visível; produção: sem faixa', async () => {
    const h = await abrir({ homologacao: true });
    assert(await h.pagina.isVisible('#faixaHomologacao'), 'faixa ausente');
    await h.contexto.close();
    const p = await abrir();
    assert(!(await p.pagina.isVisible('#faixaHomologacao')), 'faixa na produção');
    await p.contexto.close();
  });

  async function abrirAluno(pagina) {
    await pagina.click('.botaoColacao');
    await pagina.waitForFunction(() => document.querySelectorAll('.cardAluno').length > 0);
    await pagina.click('.cardAluno');
    await pagina.waitForFunction(() => document.getElementById('modalDetalhe').style.display === 'block');
  }

  await t('janela de espera: marca IPUSP centralizada (claro e escuro)', async () => {
    for (const esquema of ['light', 'dark']) {
      const { contexto, pagina } = await abrir({ esquema });
      const r = await pagina.evaluate(() => {
        mostrarLoading('Carregando aluno');
        const caixa = document.getElementById('loadingBox').getBoundingClientRect();
        const marca = [...document.querySelectorAll('#loadingLogo .marcaIpuspSvg')].find(e => e.getClientRects().length > 0).getBoundingClientRect();
        const titulo = document.getElementById('loadingTitulo').getBoundingClientRect();
        esconderLoading();
        return { caixa: (caixa.left + caixa.right) / 2, marca: (marca.left + marca.right) / 2, titulo: (titulo.left + titulo.right) / 2, largura: marca.width };
      });
      assert(Math.abs(r.marca - r.caixa) < 2 && Math.abs(r.titulo - r.caixa) < 2 && r.largura < 80, esquema + ' ' + JSON.stringify(r));
      await contexto.close();
    }
  });

  await t('ADMINISTRADOR: botões que gravam aparecem', async () => {
    const { contexto, pagina, erros } = await abrir();
    assert(await pagina.isVisible('.botaoAdicionarColacao'), 'adicionar colação oculto');
    await abrirAluno(pagina);
    assert(await pagina.isVisible('#btnAcaoDados'), 'salvar oculto');
    assert(await pagina.isVisible('.botaoExcluirAluno'), 'excluir oculto');
    assert(await pagina.isVisible('#modalDetalhe .zonaClique'), 'área de upload oculta para admin');
    assert(!(await pagina.isVisible('#avisoSomenteLeitura')), 'aviso de consulta para admin');
    assert(!erros.length, erros.join('\n'));
    await captura(pagina, 'admin-detalhe-claro');
    await contexto.close();
  });

  await t('LEITOR: aviso de consulta, nenhum botão que grava, campos só de leitura', async () => {
    const { contexto, pagina, erros } = await abrir({ perfil: 'LEITOR', esquema: 'dark', usuario: { nome: 'Pessoa Leitora Fictícia', descricao: '' } });
    assert(await pagina.isVisible('#avisoSomenteLeitura'), 'sem aviso');
    assert(!(await pagina.isVisible('.botaoAdicionarColacao')), 'adicionar colação visível');
    await captura(pagina, 'leitor-colacoes-escuro');
    await abrirAluno(pagina);
    const r = await pagina.evaluate(() => ({
      visiveis: [...document.querySelectorAll('[data-somente-admin]')].filter(e => e.getClientRects().length > 0).map(e => e.textContent.trim().slice(0, 40)),
      editaveis: [...document.querySelectorAll('#modalDetalhe input, #modalDetalhe select, #modalDetalhe textarea')].filter(c => !c.disabled && !c.readOnly).map(c => c.id || c.name || c.type)
    }));
    assert(!r.visiveis.length, 'visíveis para LEITOR: ' + r.visiveis.join(' | '));
    assert(!r.editaveis.length, 'campos editáveis para LEITOR: ' + r.editaveis.join(', '));
    assert(await pagina.textContent('#linkPastaAluno') === 'Pasta ainda não criada no Drive', 'LEITOR vê "Criar pasta"');
    const upload = await pagina.evaluate(() => ({ linhas: document.querySelectorAll('#modalDetalhe .linhaUpload').length, zonaVisivel: [...document.querySelectorAll('#modalDetalhe .zonaClique')].some(e => e.getClientRects().length > 0) }));
    assert(!upload.linhas && !upload.zonaVisivel, 'LEITOR vê a área de upload: ' + JSON.stringify(upload));
    const chamadas = await pagina.evaluate(() => window.__chamadas);
    assert(!chamadas.some(c => /^(salvar|excluir|gerar|enviar|garantir|upload|confirmar|devolver|desmarcar|adicionar)/.test(c)), 'LEITOR chamou ' + chamadas.join(','));
    assert(!erros.length, erros.join('\n'));
    await captura(pagina, 'leitor-detalhe-escuro');
    await contexto.close();
  });

  for (const esquema of ['light', 'dark']) {
    await t(`contraste (${esquema}): textos principais ≥ 4,5:1`, async () => {
      const { contexto, pagina } = await abrir({ esquema });
      const pares = await pagina.evaluate(() => {
        const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
        const fundo = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return rgb(c); } return [255, 255, 255]; };
        return ['.tituloSistema', '.subtituloSistema', '#identificacaoNome', '#identificacaoDescricao', '#telaColacoes h1', '#telaColacoes p', '.botaoColacao', '.ajudaBotaoHeader', '.gradip-theme-control__label']
          .map(s => document.querySelector(s)).filter(Boolean).map(e => ({ s: e.className || e.id || e.tagName, cor: rgb(getComputedStyle(e).color), fundo: fundo(e) }));
      });
      const ruins = pares.map(p => ({ ...p, c: contraste(p.cor, p.fundo) })).filter(p => p.c < 4.5);
      assert(pares.length >= 7, 'poucos elementos medidos');
      assert(!ruins.length, ruins.map(p => `${p.s} ${p.c.toFixed(2)}`).join('; '));
      await contexto.close();
    });
  }

  for (const largura of [360, 390, 480, 768, 1280]) {
    await t(`${largura} px: sem rolagem horizontal; identificação centralizada`, async () => {
      const { contexto, pagina } = await abrir({ largura, esquema: largura === 390 ? 'dark' : 'light' });
      const r = await pagina.evaluate(() => {
        const c = document.getElementById('identificacaoUsuario').getBoundingClientRect();
        const n = document.getElementById('identificacaoNome').getBoundingClientRect();
        return { sobra: document.documentElement.scrollWidth - window.innerWidth, desvio: Math.abs((n.left + n.right) / 2 - (c.left + c.right) / 2) };
      });
      assert(r.sobra <= 0, 'rolagem horizontal de ' + r.sobra + ' px');
      assert(r.desvio < 2, 'nome fora do centro');
      if (largura === 390) await captura(pagina, 'admin-escuro-390');
      await contexto.close();
    });
  }

  await t('Central de Ajuda: abre no tema escuro e acha "Somente consulta" pela busca', async () => {
    const { contexto, pagina, erros } = await abrir({ esquema: 'dark', largura: 1280 });
    await pagina.click('.ajudaBotaoHeader');
    await pagina.waitForSelector('#ajudaBuscaCampo', { state: 'visible' });
    await pagina.fill('#ajudaBuscaCampo', 'somente consulta');
    await pagina.waitForTimeout(400);
    const texto = await pagina.evaluate(() => document.getElementById('ajudaConteudo').innerText);
    assert(/Acesso e perfis|Somente consulta/.test(texto), 'busca não achou: ' + texto.slice(0, 200));
    const fundo = await pagina.evaluate(() => getComputedStyle(document.querySelector('.ajudaConteudo')).backgroundColor);
    assert(!/255, 255, 255/.test(fundo), 'ajuda com fundo branco no tema escuro: ' + fundo);
    assert(!erros.length, erros.join('\n'));
    await captura(pagina, 'ajuda-escuro');
    await contexto.close();
  });

  await t('4.1: ADMINISTRADOR roda o encaminhador ao abrir e vê as pendências como texto, com contraste', async () => {
    for (const esquema of ['light', 'dark']) {
      const { contexto, pagina, erros } = await abrir({ esquema });
      await pagina.waitForSelector('#avisoEncaminhamentos:not([hidden])');
      const r = await pagina.evaluate(() => {
        const f = document.getElementById('avisoEncaminhamentos'), cs = getComputedStyle(f);
        return { texto: f.innerText, img: !!f.querySelector('img'), xss: !!window.__xss, chamadas: window.__chamadas.filter(c => c === 'executarEncaminhadorColacao').length,
          cor: cs.color.match(/\d+/g).slice(0, 3).map(Number), fundo: cs.backgroundColor.match(/\d+/g).slice(0, 3).map(Number) };
      });
      assert(r.chamadas === 1, 'encaminhador deveria rodar uma vez');
      assert(/2 pedidos novos do formulário entraram/.test(r.texto) && /PCG-20262-00003/.test(r.texto) && /Bloqueado/.test(r.texto) && /Gerenciador de Pessoas/.test(r.texto) && /2026 — 2º semestre/.test(r.texto), r.texto);
      assert(!r.img && !r.xss, 'nome entrou como HTML');
      assert(contraste(r.cor, r.fundo) >= 4.5, esquema + ' contraste ' + contraste(r.cor, r.fundo).toFixed(2));
      assert(!erros.length, erros.join('\n'));
      await captura(pagina, 'pendencias-encaminhamento-' + esquema);
      await contexto.close();
    }
  });

  await t('4.1: com pedidos novos, a lista de colações é relida; correção não vira "pedido novo"; sem nada, não relê', async () => {
    const { contexto, pagina, erros } = await abrir();
    await pagina.waitForFunction(() => window.__chamadas.filter(c => c === 'obterColacoes').length === 2);
    await pagina.click('.botaoColacao');
    await pagina.waitForFunction(() => window.__chamadas.includes('obterAlunos'));
    assert(!erros.length, erros.join('\n'));
    await contexto.close();
    const semNovos = Object.assign({}, DADOS, { executarEncaminhadorColacao: { encaminhados: 0, retidos: 0, bloqueados: 0, pendencias: [] } });
    const soCorrecao = Object.assign({}, DADOS, { executarEncaminhadorColacao: { encaminhados: 1, corrigidos: 1, retidos: 0, bloqueados: 0, pendencias: [] } });
    const c = await abrir({ dados: soCorrecao });
    await c.pagina.waitForSelector('#avisoEncaminhamentos:not([hidden])');
    const tc = await c.pagina.textContent('#avisoEncaminhamentos');
    assert(/1 correção do aluno foi aplicada/.test(tc) && !/pedido novo/.test(tc), tc);
    await c.contexto.close();
    const b = await abrir({ dados: semNovos });
    await b.pagina.waitForFunction(() => window.__chamadas.includes('executarEncaminhadorColacao'));
    await b.pagina.waitForTimeout(100);
    const n = await b.pagina.evaluate(() => window.__chamadas.filter(c => c === 'obterColacoes').length);
    const botoes = await b.pagina.$$eval('.botaoColacao', e => e.length);
    assert(n === 1 && botoes === 2, JSON.stringify({ n, botoes }));
    await b.contexto.close();
  });

  await t('erro do servidor aparece sem o prefixo "Error:"', async () => {
    const comErro = Object.assign({}, DADOS, { obterAlunos: { __erro: 'Error: Este Nº USP não tem cadastro na planilha central de alunos.' } });
    const { contexto, pagina } = await abrir({ dados: comErro });
    const espera = pagina.waitForEvent('dialog');
    await pagina.click('.botaoColacao');
    const aviso = await espera;
    const texto = aviso.message();
    await aviso.accept();
    assert(texto === '❌ Erro: Este Nº USP não tem cadastro na planilha central de alunos.', texto);
    await contexto.close();
  });

  await t('4.1: LEITOR não dispara o encaminhador nem vê a faixa', async () => {
    const { contexto, pagina } = await abrir({ perfil: 'LEITOR' });
    await pagina.waitForTimeout(100);
    const r = await pagina.evaluate(() => ({ chamadas: window.__chamadas.filter(c => c === 'executarEncaminhadorColacao').length, oculta: document.getElementById('avisoEncaminhamentos').offsetParent === null }));
    assert(r.chamadas === 0 && r.oculta, JSON.stringify(r));
    await contexto.close();
  });

  await t('página sem acesso: tema e aviso, sem dados', async () => {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const pagina = await contexto.newPage();
    await pagina.route('**/*', r => r.request().url().startsWith('https://diplomas.exemplo.invalid/') ? r.fulfill({ contentType: 'text/html', body: montarSemAcesso() }) : r.abort());
    await pagina.goto('https://diplomas.exemplo.invalid/');
    const r = await pagina.evaluate(() => ({ tema: document.documentElement.dataset.theme, texto: document.body.innerText, sobra: document.documentElement.scrollWidth - innerWidth }));
    assert(r.tema === 'dark' && /Sem acesso/.test(r.texto) && /Colação de Grau e Diplomas/.test(r.texto) && r.sobra <= 0, JSON.stringify(r).slice(0, 200));
    await captura(pagina, 'sem-acesso-escuro-390');
    await contexto.close();
  });

  await navegador.close();
  console.log(`\n${ok} ok, ${falhas} falha(s).`);
  process.exit(falhas ? 1 : 0);
})();
