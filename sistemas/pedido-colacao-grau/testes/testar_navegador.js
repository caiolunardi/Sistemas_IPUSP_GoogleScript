// Testes de navegador do Formulário de Pedido de Colação de Grau 2.0
// (Chromium real via Playwright). Simula google.script.run com dados
// 100% fictícios e confere: telas por situação, validação na página,
// chave de envio (mesma chave ao enviar de novo, chave nova na
// correção), protocolo só com resposta do servidor, "Meus pedidos"
// sem HTML injetado e larguras de 360 a 1280 px. Desde a 2.1 (PR 7):
// tema GRADIP (Sistema/Claro/Escuro, persistência, mudança do sistema),
// contraste, marcas, Central de Ajuda (ESC, foco, busca, gatilhos) e
// alvos de toque. A página é montada com os include_ resolvidos.
// Uso: node testar_navegador.js [pasta-para-capturas]
'use strict';
const fs = require('fs');
const path = require('path');
function carregarPlaywright() {
  try { return require('playwright'); } catch (e) {
    return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  }
}
const { chromium } = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
const MARCA_USP_OFFLINE = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'assets', 'usp', 'logo-usp-preto.svg'), 'utf8');
function montar() {
  let h = fs.readFileSync(SRC + 'ColacaoApp.html', 'utf8');
  for (let k = 0; k < 3; k++) h = h.replace(/<\?!= include_\('(\w+)'\) \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
const HTML = montar();
function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const a = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const CAPTURAS = process.argv[2] || null;

const CONFIRMADA = { situacao: 'CONFIRMADO', nome: 'Aluna Fictícia Um', nUsp: '9000001', anoIngresso: '2021', emailSecundario: 'um@exemplo.invalid' };
const BASE = { tituloSemestre: 'Segundo Semestre de 2026', emailUsp: 'ana@usp.br', homologacao: true, linkPainel: '', temPedidos: false, identidade: CONFIRMADA };
const RECEBIDO = { protocolo: 'PCG-20262-00001', recebidoEm: '20/11/2026 às 12:00:00', correcaoEnviadaEm: '', versao: 1, correcao: false, colacao: '2026/2', cadastro: 'CONFIRMADO', reciboEnviado: true };
const CENARIOS = {
  confirmada: { dados: BASE, envio: [RECEBIDO] },
  provisoria: { dados: Object.assign({}, BASE, { identidade: { situacao: 'PROVISORIO' } }), envio: [Object.assign({}, RECEBIDO, { cadastro: 'PENDENTE', reciboEnviado: false })] },
  falhaDepoisOk: { dados: BASE, envio: ['Error: O envio não terminou. Envie de novo pelo mesmo botão.', RECEBIDO] },
  existente: {
    dados: Object.assign({}, BASE, { temPedidos: true, pedidoAtual: { protocolo: 'PCG-20262-00001', recebidoEm: '20/11/2026 às 12:00:00', recebido: true, podeCorrigir: true, chaveIncompleta: '', documentosMantidos: ['RG', 'CERTIDAO'],
      dados: { rg: '00.000.000-0', telefone: '11900000000', emailAlternativo: 'um@exemplo.invalid', bachConcluiu: true, psiConcluiu: false, licConcluiu: false, permaneceMatriculado: 'NÃO', habilitacaoPendente: [], procuracao: 'NÃO', colacaoAntecipada: 'NÃO', observacoesAluno: 'Obs fictícia' } } }),
    envio: [Object.assign({}, RECEBIDO, { versao: 2, correcao: true, correcaoEnviadaEm: '21/11/2026 às 09:00:00' })]
  },
  encerrada: { dados: Object.assign({}, BASE, { temPedidos: true, pedidoAtual: { protocolo: 'PCG-20262-00001', recebidoEm: '20/11/2026 às 12:00:00', recebido: true, podeCorrigir: false, chaveIncompleta: '', documentosMantidos: [], dados: {} } }) },
  incompleto: { dados: Object.assign({}, BASE, { temPedidos: true, pedidoAtual: { protocolo: 'PCG-20262-00001', recebidoEm: '20/11/2026 às 12:00:00', recebido: false, podeCorrigir: true, chaveIncompleta: '11111111-2222-4333-8444-555555555555', documentosMantidos: [], dados: { rg: '1' } } }), envio: [RECEBIDO] },
  fechado: { dados: { tituloSemestre: 'Segundo Semestre de 2026', periodoFechado: true, temPedidos: true, homologacao: false },
    lista: [{ protocolo: '<img src=x onerror="window.__xss=1">PCG', colacao: '2026/2', recebidoEm: '20/11/2026 às 12:00:00', versao: 2, recebimento: 'Recebido', correcaoIncompleta: false, cadastro: 'Cadastro confirmado', andamento: 'Aguardando encaminhamento à equipe', podeReenviarRecibo: true }] },
  erroCarga: { erroCarga: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' }
};

const stub = c => `(function(){var C=${JSON.stringify(c)};window.__chamadas=[];var envios=0,reenvios=0;
var API={obterDadosIniciais:function(){if(C.erroCarga)throw new Error(C.erroCarga);return C.dados},
 enviarPedidoColacao:function(d){var r=(C.envio||[])[Math.min(envios,(C.envio||[]).length-1)];envios++;if(typeof r==='string')throw new Error(r);return r},
 listarMeusPedidos:function(){return C.lista||[]},
 reenviarComprovanteColacao:function(){if(++reenvios>1)throw new Error('Error: O comprovante acabou de ser enviado. Tente de novo em alguns minutos.');return {enviado:true}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,arg===undefined?null:JSON.parse(JSON.stringify(arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},30)}});return o}
window.google={script:{get run(){return runner()}}};})();`;

let ok = 0, falhas = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; } else { falhas++; console.log('FALHA', n, extra); } };

async function abrir(ctx, cen) {
  if (!CENARIOS[cen]) throw new Error('cenário ' + cen);
  const p = await ctx.newPage();
  p.__erros = [];
  p.on('pageerror', e => p.__erros.push(e.message));
  await p.route('https://form.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8',
    body: HTML.replace('<head>', '<head><script>' + stub(CENARIOS[cen]) + '</script>') }));
  await p.route('**/*', r => (r.request().url().startsWith('https://form.teste/') ? r.fallback()
    : r.fulfill(/datagrad\.sistemas\.ip\.usp\.br/.test(r.request().url()) ? { contentType: 'image/svg+xml', body: MARCA_USP_OFFLINE } : { body: '' })));
  await p.goto('https://form.teste/');
  await p.waitForFunction(() => document.getElementById('telaCarregando').hidden);
  return p;
}
const visivel = (p, s) => p.$eval(s, e => !e.hidden && e.offsetParent !== null).catch(() => false);
const envios = p => p.evaluate(() => window.__chamadas.filter(c => c[0] === 'enviarPedidoColacao').map(c => c[1]));
const PDF = { name: 'rg.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fictício') };
const PNG = { name: 'certidao.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2]) };

async function preencher(p) {
  await p.setInputFiles('#inputArquivoRg', PDF);
  await p.setInputFiles('#inputArquivoCertidao', PNG);
  await p.waitForFunction(() => document.querySelectorAll('.linhaUpload.comArquivo').length === 2);
  await p.fill('#campoRg', '00.000.000-0');
  await p.check('#ccBach');
  await p.click('#grupoPermanece label:has-text("Não")');
  await p.fill('#campoTelefone', '11900000000');
  await p.fill('#campoEmailAlternativo', 'um@exemplo.invalid');
  await p.click('#grupoProcuracao label:has-text("Não")');
  await p.click('#grupoAntecipada label:has-text("Não")');
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });

  // Confirmada: nome e nº USP do cadastro, só leitura.
  let p = await abrir(ctx, 'confirmada');
  chk('confirmada: formulário aberto', await visivel(p, '#telaFormulario'));
  chk('confirmada: nome do cadastro, só leitura', await p.$eval('#campoNome', e => e.value === 'Aluna Fictícia Um' && e.readOnly));
  chk('confirmada: nº USP só leitura', await p.$eval('#campoNUsp', e => e.value === '9000001' && e.readOnly));
  chk('confirmada: campo de divergência visível', await visivel(p, '#blocoDivergencia'));
  chk('confirmada: aviso de provisório escondido', !(await visivel(p, '#avisoProvisorio')));
  chk('homologação: faixa visível', await visivel(p, '#faixaHomologacao'));
  await p.click('#botaoEnviar');
  chk('validação: nada enviado sem documentos', (await envios(p)).length === 0 && /CIN\/RG/.test(await p.textContent('#caixaErro')));
  chk('validação: zona do RG destacada', await p.$eval('#linhaUploadRg', e => e.classList.contains('campoInvalido') && e.getAttribute('aria-invalid') === 'true'));
  chk('validação: foco na zona do RG', await p.evaluate(() => document.activeElement === document.querySelector('#linhaUploadRg .zonaClique')));
  chk('validação: mensagem ao lado do campo', /CIN\/RG/.test(await p.textContent('#erroCampo')));
  await preencher(p);
  chk('validação: destaque some ao anexar', await p.$eval('#linhaUploadRg', e => !e.classList.contains('campoInvalido')) && !(await p.$('#erroCampo')));
  // Só falta o e-mail alternativo: borda, foco e texto no próprio campo.
  await p.fill('#campoEmailAlternativo', '');
  await p.click('#botaoEnviar');
  chk('validação: nada enviado sem e-mail alternativo', (await envios(p)).length === 0);
  chk('validação: e-mail alternativo destacado e focado', await p.evaluate(() => {
    const c = document.getElementById('campoEmailAlternativo');
    return c.classList.contains('campoInvalido') && c.getAttribute('aria-invalid') === 'true' &&
      c.getAttribute('aria-describedby') === 'erroCampo' && document.activeElement === c;
  }));
  chk('validação: aviso no topo e no campo', /e-mail alternativo/.test(await p.textContent('#caixaErro')) && /e-mail alternativo/.test(await p.textContent('#erroCampo')));
  chk('validação: borda na cor de perigo do tema', await p.$eval('#campoEmailAlternativo', e => {
    const t = document.createElement('span'); t.style.color = 'var(--gradip-danger)'; document.body.appendChild(t);
    const cor = getComputedStyle(t).color; t.remove(); return getComputedStyle(e).borderTopColor === cor; }));
  if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, 'campo-invalido.png') });
  await p.fill('#campoEmailAlternativo', 'um@exemplo.invalid');
  chk('validação: destaque some ao digitar', await p.$eval('#campoEmailAlternativo', e => !e.classList.contains('campoInvalido') && !e.hasAttribute('aria-invalid')) && !(await p.$('#erroCampo')));
  // Grupo Sim/Não (rádios escondidos): o grupo recebe o foco.
  await p.evaluate(() => { document.querySelectorAll('#grupoAntecipada input').forEach(i => { i.checked = false; }); document.querySelectorAll('#grupoAntecipada .opcaoSimNao').forEach(l => l.classList.remove('selecionada')); });
  await p.click('#botaoEnviar');
  chk('validação: grupo Sim/Não destacado, foco no rádio', await p.evaluate(() => { const g = document.getElementById('grupoAntecipada'); return g.classList.contains('campoInvalido') && g.contains(document.activeElement) && document.activeElement.type === 'radio'; }));
  // Teclado: a seta troca a opção do grupo (rádio focável desde a 2.1).
  await p.keyboard.press('ArrowRight');
  chk('teclado: seta escolhe no grupo Sim/Não', await p.evaluate(() => document.querySelectorAll('#grupoAntecipada .opcaoSimNao.selecionada').length === 1));
  await p.click('#grupoAntecipada label:has-text("Não")');
  chk('validação: destaque do grupo some ao escolher', await p.$eval('#grupoAntecipada', e => !e.classList.contains('campoInvalido')));
  await p.click('#botaoEnviar');
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  const [e1] = await envios(p);
  chk('envio: chave de envio no formato UUID', /^[0-9a-f-]{36}$/.test(e1.chaveEnvio));
  chk('envio: documentos sem nome nem MIME do navegador', e1.documentos.length === 2 && e1.documentos.every(d => !('mimeType' in d) && !('nome' in d) && d.base64));
  chk('envio: divergência vazia', e1.divergenciaApontada === '');
  chk('confirmação: protocolo do servidor', (await p.textContent('#confProtocolo')) === 'PCG-20262-00001');
  chk('confirmação: data e hora', /20\/11\/2026 às 12:00:00/.test(await p.textContent('#confRecebido')));
  chk('confirmação: não diz deferido', !/deferido\b/i.test((await p.textContent('#telaConfirmacao')).replace('não é deferimento', '')));
  chk('confirmação: chave descartada', await p.evaluate(() => !sessionStorage.getItem('pcg-chave-envio')));
  if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, 'confirmacao.png'), fullPage: true });
  await p.close();

  // Falha no envio: a chave fica e o reenvio usa a mesma.
  p = await abrir(ctx, 'falhaDepoisOk');
  await preencher(p);
  await p.click('#botaoEnviar');
  await p.waitForSelector('#caixaErro:not([hidden])');
  chk('falha: sem protocolo na tela', !(await visivel(p, '#telaConfirmacao')));
  chk('falha: mensagem sem o prefixo "Error:"', (await p.textContent('#caixaErro')) === 'O envio não terminou. Envie de novo pelo mesmo botão.');
  chk('falha: botão liberado', await p.$eval('#botaoEnviar', e => !e.disabled));
  await p.click('#botaoEnviar');
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  const [f1, f2] = await envios(p);
  chk('falha: reenvio com a mesma chave', f1.chaveEnvio === f2.chaveEnvio);
  await p.close();

  // Duplo clique: uma chamada só.
  p = await abrir(ctx, 'confirmada');
  await preencher(p);
  await p.evaluate(() => { const b = document.getElementById('botaoEnviar'); b.click(); b.click(); validarEEnviar(); });
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  chk('duplo clique: um envio', (await envios(p)).length === 1);
  await p.close();

  // Provisória: campos livres e aviso.
  p = await abrir(ctx, 'provisoria');
  chk('provisória: aviso visível', await visivel(p, '#avisoProvisorio'));
  chk('provisória: nome editável e vazio', await p.$eval('#campoNome', e => !e.readOnly && e.value === ''));
  chk('provisória: sem campo de divergência', !(await visivel(p, '#blocoDivergencia')));
  await preencher(p);
  await p.fill('#campoNome', 'Pessoa Fictícia Nova');
  await p.fill('#campoNUsp', '9099999');
  await p.fill('#campoAnoIngresso', '2022');
  await p.click('#botaoEnviar');
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  chk('provisória: situação em conferência', /em conferência/.test(await p.textContent('#confSituacao')));
  chk('provisória: recibo que falhou leva a "Meus pedidos"', /Meus pedidos/.test(await p.textContent('#confRecibo')));
  await p.close();

  // Pedido existente: corrigir usa chave nova e mantém documentos.
  p = await abrir(ctx, 'existente');
  chk('existente: tela do pedido', await visivel(p, '#telaPedidoExistente') && (await p.textContent('#existenteProtocolo')) === 'PCG-20262-00001');
  await p.evaluate(() => sessionStorage.setItem('pcg-chave-envio', '99999999-9999-4999-8999-999999999999'));
  await p.click('#botaoCorrigir');
  chk('correção: dados anteriores', (await p.$eval('#campoObservacoes', e => e.value)) === 'Obs fictícia' && await p.$eval('#ccBach', e => e.checked));
  chk('correção: documentos mantidos', await visivel(p, '#manterRg') && await visivel(p, '#manterCertidao'));
  await p.click('#botaoEnviar');
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  const [c1] = await envios(p);
  chk('correção: chave nova', c1.chaveEnvio !== '99999999-9999-4999-8999-999999999999');
  chk('correção: sem arquivos novos', c1.documentos.length === 0);
  chk('correção: título', (await p.textContent('#tituloConfirmacao')) === 'Correção recebida' && await visivel(p, '#confCorrecao'));
  await p.close();

  p = await abrir(ctx, 'encerrada');
  chk('encerrada: sem botão de corrigir', !(await visivel(p, '#botaoCorrigir')) && /fale com o Serviço/.test(await p.textContent('#existenteTexto')));
  await p.close();

  // Envio incompleto: retoma com a chave do servidor.
  p = await abrir(ctx, 'incompleto');
  chk('incompleto: aviso de retomada', await visivel(p, '#avisoRetomada') && await visivel(p, '#telaFormulario'));
  await preencher(p);
  await p.click('#botaoEnviar');
  await p.waitForSelector('#telaConfirmacao:not([hidden])');
  chk('incompleto: mesma chave do servidor', (await envios(p))[0].chaveEnvio === '11111111-2222-4333-8444-555555555555');
  await p.close();

  // Fechado + Meus pedidos sem HTML injetado.
  p = await abrir(ctx, 'fechado');
  chk('fechado: tela e botão de pedidos', await visivel(p, '#telaFechado') && await visivel(p, '#botaoMeusPedidosFechado'));
  chk('produção: sem faixa', !(await visivel(p, '#faixaHomologacao')));
  await p.click('#botaoMeusPedidosFechado');
  await p.waitForSelector('#telaMeusPedidos:not([hidden])');
  chk('meus pedidos: texto, não HTML', await p.evaluate(() => !window.__xss && !document.querySelector('#listaMeusPedidos img')));
  chk('meus pedidos: andamento sem "deferido"', /Aguardando encaminhamento/.test(await p.textContent('#listaMeusPedidos')));
  await p.click('#listaMeusPedidos button');
  await p.waitForFunction(() => /reenviado/.test(document.querySelector('#listaMeusPedidos button').textContent));
  chk('meus pedidos: reenviar comprovante', true);
  chk('meus pedidos: confirmação ao lado do botão', /enviado para o seu e-mail USP/.test(await p.textContent('#listaMeusPedidos .statusReenvio')) &&
    await p.$eval('#listaMeusPedidos button', b => b.disabled));
  // Segundo pedido logo depois (lista desenhada de novo): o aviso de espera aparece ao lado do botão.
  await p.click('#botaoVoltarInicio');
  await p.click('#botaoMeusPedidosFechado');
  await p.waitForSelector('#telaMeusPedidos:not([hidden])');
  await p.click('#listaMeusPedidos button');
  await p.waitForFunction(() => { const s = document.querySelector('#listaMeusPedidos .statusReenvio'); return s && s.classList.contains('statusReenvioErro'); });
  chk('meus pedidos: aviso de espera visível ao lado do botão', (await p.textContent('#listaMeusPedidos .statusReenvio')) === 'O comprovante acabou de ser enviado. Tente de novo em alguns minutos.');
  chk('meus pedidos: botão liberado depois do aviso', await p.$eval('#listaMeusPedidos button', b => !b.disabled));
  await p.close();

  p = await abrir(ctx, 'erroCarga');
  chk('erro de carga: mensagem', await visivel(p, '#telaErro') && /Tente de novo/.test(await p.textContent('#textoErro')));
  await p.close();

  // Arquivo grande recusado na página.
  p = await abrir(ctx, 'confirmada');
  await p.setInputFiles('#inputArquivoRg', { name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  chk('arquivo > 10 MB: aviso', /10 MB/.test(await p.textContent('#caixaErro')));
  await p.setInputFiles('#inputArquivoRg', { name: 'x.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  chk('formato errado: aviso', /PDF, JPG ou PNG/.test(await p.textContent('#caixaErro')));
  chk('sem erros de script', p.__erros.length === 0, p.__erros.join('; '));
  await p.close();

  // ---------- 2.1: tema GRADIP e Central de Ajuda ----------
  const corToken = (p, token) => p.evaluate(t => { const x = document.createElement('span'); x.style.color = `var(${t})`; document.body.appendChild(x); const c = getComputedStyle(x).color; x.remove(); return c; }, token);
  for (const scheme of ['light', 'dark']) {
    const T = `[${scheme}]`;
    const cx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    let p = await abrir(cx, 'provisoria');
    chk(`${T} tema Sistema resolvido`, await p.evaluate(s => document.documentElement.dataset.theme === s && document.documentElement.dataset.themePreference === 'system', scheme));
    chk(`${T} seletor mostra Sistema`, await p.$eval('[data-gradip-theme-select]', e => e.value === 'system'));
    chk(`${T} marca IPUSP certa para o tema`, await p.evaluate(s => { const l = document.querySelector('.marcaIpuspSvg.gradip-logo-light'), d = document.querySelector('.marcaIpuspSvg.gradip-logo-dark'); return s === 'dark' ? getComputedStyle(l).display === 'none' && getComputedStyle(d).display !== 'none' : getComputedStyle(d).display === 'none' && getComputedStyle(l).display !== 'none'; }, scheme));
    chk(`${T} marcas sem filtro CSS`, await p.$$eval('.marcaIpuspSvg, .logoUSP', e => e.length >= 2 && e.every(x => getComputedStyle(x).filter === 'none')));
    chk(`${T} fundo da página é o token`, await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === await corToken(p, '--gradip-bg'));
    // Preenche e marca um erro para medir também o texto de erro e a opção escolhida.
    await p.click('#grupoPermanece label:has-text("Não")');
    await p.click('#botaoEnviar');
    const pares = await p.evaluate(() => {
      const cs = e => getComputedStyle(typeof e === 'string' ? document.querySelector(e) : e); const bg = e => cs(e).backgroundColor;
      const secao = bg('.secao'), pag = getComputedStyle(document.body).backgroundColor;
      return { texto: [cs('.secao label').color, secao], ajudaCampo: [cs('.secao .ajuda').color, secao], titulo: [cs('.secao h3').color, secao],
        link: [cs('.ajuda a').color, secao], linkAjuda: [cs('#telaFormulario .linkAjudaContextual').color, pag],
        aviso: [cs('#avisoProvisorio').color, bg('#avisoProvisorio')], erroTopo: [cs('#caixaErro').color, bg('#caixaErro')],
        erroCampo: [cs('#erroCampo').color, bg('#erroCampo').replace(/rgba\(0, 0, 0, 0\)/, '') || secao],
        opcao: [cs('#grupoPermanece .opcaoSimNao.selecionada').color, bg('#grupoPermanece .opcaoSimNao.selecionada')],
        campo: [cs('#campoNome').color, bg('#campoNome')], somenteLeitura: [cs('#campoEmailUsp').color, bg('#campoEmailUsp')],
        zona: [cs('#linhaUploadRg .zonaClique').color, bg('#linhaUploadRg')],
        botao: [cs('#botaoEnviar').color, bg('#botaoEnviar')], secundario: [cs('#botaoMeusPedidosForm').color, bg('#botaoMeusPedidosForm')],
        cabecalho: [cs('.subtituloSistema').color, bg('#headerSistema')], ajudaBotao: [cs('.botaoAjuda').color, bg('.botaoAjuda')], rodape: [cs('.rodape').color, pag],
        borda: [cs('#campoNome').borderTopColor, bg('#campoNome')] };
    });
    for (const [k, [c, f]] of Object.entries(pares)) { const r = cr(c, f); const alvo = k === 'borda' ? 3 : 4.5; chk(`${T} contraste ${k} ≥ ${alvo}`, r >= alvo, r.toFixed(2)); }
    chk(`${T} placeholder com contraste`, cr(await p.$eval('#campoAnoIngresso', e => getComputedStyle(e, '::placeholder').color), await p.$eval('#campoAnoIngresso', e => getComputedStyle(e).backgroundColor)) >= 4.5);
    chk(`${T} opção escolhida não depende só da cor`, await p.$eval('#grupoPermanece .opcaoSimNao.selecionada', e => getComputedStyle(e, '::before').content.includes('✓')));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `formulario-${scheme}.png`), fullPage: true });

    // Central de Ajuda: abre, scroll lock, busca sem acento, FAQ, ESC, foco.
    await p.click('.botaoAjuda'); await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    chk(`${T} ajuda abre com scroll lock`, await p.evaluate(() => document.body.style.overflow === 'hidden'));
    chk(`${T} ajuda: foco dentro do diálogo`, await p.evaluate(() => document.querySelector('[data-gradip-help-dialog]').contains(document.activeElement)));
    for (let i = 0; i < 40; i++) await p.keyboard.press('Tab');
    chk(`${T} ajuda: Tab não sai do diálogo`, await p.evaluate(() => document.querySelector('[data-gradip-help-dialog]').contains(document.activeElement)));
    await p.fill('[data-gradip-help-search]', 'certidao');
    chk(`${T} busca sem acento acha a certidão`, await p.waitForFunction(() => document.querySelectorAll('#ajuda-documentos [data-gradip-help-search-item]:not([hidden])').length >= 1, null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('[data-gradip-help-search]', 'PROCURAÇÃO');
    chk(`${T} busca com acento e maiúsculas`, await p.waitForFunction(() => /^\d+ resultados?$/.test(document.querySelector('[data-gradip-help-search-status]').textContent), null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('[data-gradip-help-search]', 'xyzsemresultado');
    chk(`${T} busca sem resultado avisa`, await p.waitForFunction(() => !document.querySelector('[data-gradip-help-no-results]').hidden, null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('[data-gradip-help-search]', '');
    const faq = await p.$('#ajuda-faq .gradip-help-faq-toggle'); await faq.click();
    chk(`${T} FAQ expande com aria-expanded`, await faq.getAttribute('aria-expanded') === 'true' && await visivel(p, '#faq-garantido'));
    const helpC = await p.evaluate(() => { const c = document.querySelector('.gradip-help-card p'); return [getComputedStyle(c).color, getComputedStyle(c.closest('.gradip-help-card')).backgroundColor]; });
    chk(`${T} contraste da ajuda ≥ 4.5`, cr(...helpC) >= 4.5, cr(...helpC).toFixed(2));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `ajuda-${scheme}.png`) });
    await p.keyboard.press('Escape');
    chk(`${T} ESC fecha, devolve foco e solta o scroll`, await p.evaluate(() => document.querySelector('[data-gradip-help-overlay]').hidden && document.activeElement.classList.contains('botaoAjuda') && document.body.style.overflow === ''));
    await p.click('#avisoProvisorio [data-gradip-help-open]'); await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])'); await p.waitForTimeout(100);
    chk(`${T} gatilho contextual abre na seção`, await p.evaluate(() => document.activeElement && document.activeElement.closest('#ajuda-cadastro') !== null));
    await p.keyboard.press('Escape');
    chk(`${T} gatilho no formulário não envia`, (await envios(p)).length === 0);
    chk(`${T} todos os gatilhos têm seção`, await p.evaluate(() => [...document.querySelectorAll('[data-gradip-help-open]')].every(b => b.type === 'button' && document.getElementById(b.getAttribute('data-gradip-help-open') || 'ajuda-inicio'))));
    chk(`${T} cada seção da ajuda tem item no menu`, await p.evaluate(() => [...document.querySelectorAll('[data-gradip-help-section]')].every(s => document.querySelector(`[data-gradip-help-target="${s.id}"]`))));
    chk(`${T} ajuda sem chamada ao servidor`, await p.evaluate(() => window.__chamadas.every(c => c[0] === 'obterDadosIniciais')));
    chk(`${T} sem erros de script`, p.__erros.length === 0, p.__erros.join('; '));
    await p.close();

    // Telas centrais e Meus pedidos no tema.
    p = await abrir(cx, 'fechado');
    chk(`${T} fechado: ajuda leva a "Quando posso pedir"`, await p.$eval('#telaFechado [data-gradip-help-open]', e => e.getAttribute('data-gradip-help-open')) === 'ajuda-prazo');
    const fc = await p.evaluate(() => [getComputedStyle(document.querySelector('#telaFechado p')).color, getComputedStyle(document.getElementById('telaFechado')).backgroundColor]);
    chk(`${T} contraste tela fechada ≥ 4.5`, cr(...fc) >= 4.5, cr(...fc).toFixed(2));
    await p.click('#botaoMeusPedidosFechado'); await p.waitForSelector('#telaMeusPedidos:not([hidden])');
    const li = await p.evaluate(() => { const e = document.querySelector('#listaMeusPedidos li'); return [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]; });
    chk(`${T} contraste Meus pedidos ≥ 4.5`, cr(...li) >= 4.5, cr(...li).toFixed(2));
    await p.click('#listaMeusPedidos button');
    await p.waitForSelector('#listaMeusPedidos .statusReenvio');
    const st = await p.evaluate(() => { const e = document.querySelector('#listaMeusPedidos .statusReenvio'); return [getComputedStyle(e).color, getComputedStyle(e.closest('li')).backgroundColor]; });
    chk(`${T} contraste do aviso de reenvio ≥ 4.5`, cr(...st) >= 4.5, cr(...st).toFixed(2));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `meus-pedidos-${scheme}.png`), fullPage: true });
    await p.close();
    p = await abrir(cx, 'confirmada');
    const fh = await p.evaluate(() => { const e = document.getElementById('faixaHomologacao'); return [getComputedStyle(e).color, getComputedStyle(e.querySelector('strong')).color, getComputedStyle(e).backgroundColor]; });
    chk(`${T} faixa de homologação com contraste AA`, cr(fh[0], fh[2]) >= 4.5 && cr(fh[1], fh[2]) >= 4.5, `${cr(fh[0], fh[2]).toFixed(2)} / ${cr(fh[1], fh[2]).toFixed(2)}`);
    await preencher(p); await p.click('#botaoEnviar'); await p.waitForSelector('#telaConfirmacao:not([hidden])');
    const pc = await p.evaluate(() => [getComputedStyle(document.getElementById('confProtocolo')).color, getComputedStyle(document.getElementById('telaConfirmacao')).backgroundColor]);
    chk(`${T} contraste do protocolo ≥ 4.5`, cr(...pc) >= 4.5, cr(...pc).toFixed(2));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `confirmacao-${scheme}.png`) });
    await p.close(); await cx.close();
  }

  // Tema manual: persistência e mudança do sistema com a página aberta.
  {
    const cx = await b.newContext({ colorScheme: 'light' }); const p = await abrir(cx, 'confirmada');
    await p.selectOption('[data-gradip-theme-select]', 'dark');
    chk('manual Escuro aplica e salva', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && localStorage.getItem('gradip-theme') === 'dark'));
    await p.reload(); await p.waitForFunction(() => document.getElementById('telaCarregando').hidden);
    chk('Escuro persiste após recarregar', await p.evaluate(() => document.documentElement.dataset.theme === 'dark') && await p.$eval('[data-gradip-theme-select]', e => e.value === 'dark'));
    await p.emulateMedia({ colorScheme: 'light' });
    chk('manual ignora mudança do sistema', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
    await p.selectOption('[data-gradip-theme-select]', 'light');
    chk('manual Claro aplica e salva', await p.evaluate(() => document.documentElement.dataset.theme === 'light' && localStorage.getItem('gradip-theme') === 'light'));
    await p.selectOption('[data-gradip-theme-select]', 'system'); await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(50);
    chk('Sistema acompanha mudança com a página aberta', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.dataset.themePreference === 'system'));
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(50);
    chk('Sistema volta para Claro', await p.evaluate(() => document.documentElement.dataset.theme === 'light'));
    chk('tema não chama o servidor', await p.evaluate(() => window.__chamadas.every(c => c[0] === 'obterDadosIniciais')));
    await cx.close();
  }

  // Larguras: sem rolagem horizontal, alvos de toque e ajuda utilizável.
  for (const largura of [360, 390, 480, 768, 1280]) {
    for (const scheme of ['light', 'dark']) {
      const c2 = await b.newContext({ colorScheme: scheme, viewport: { width: largura, height: 800 }, hasTouch: largura < 1000 });
      const q = await abrir(c2, 'provisoria');
      const L = `largura ${largura} ${scheme}`;
      chk(`${L}: sem rolagem horizontal`, await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      const pequenos = await q.$$eval('#botaoEnviar,#botaoMeusPedidosForm,.botaoAjuda,[data-gradip-theme-select],.itemCheckbox:not([style*="none"]),.opcaoSimNao,.zonaClique,#campoNome,#campoTelefone',
        e => e.filter(x => x.offsetParent !== null).filter(x => { const r = x.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(x => x.id || x.className));
      chk(`${L}: alvos ≥ 44 px`, pequenos.length === 0, pequenos.join());
      const cab = await q.evaluate(() => [...document.querySelectorAll('#headerSistema *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > window.innerWidth + 0.5 || r.left < -0.5); }).length);
      chk(`${L}: cabeçalho dentro da tela`, cab === 0, cab);
      if (scheme === 'light' || largura === 360) {
        await q.click('.botaoAjuda'); await q.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
        chk(`${L}: ajuda com botão fechar visível`, await q.$eval('.gradip-help-close', e => { const r = e.getBoundingClientRect(); return r.right <= window.innerWidth && r.top >= 0; }));
        const ov2 = await q.evaluate(() => { const d = document.querySelector('[data-gradip-help-dialog]'); return d.scrollWidth - d.clientWidth; });
        chk(`${L}: ajuda sem rolagem horizontal`, ov2 <= 0, ov2);
        if (CAPTURAS && largura === 360) await q.screenshot({ path: path.join(CAPTURAS, `ajuda-360-${scheme}.png`) });
        await q.keyboard.press('Escape');
      }
      if (CAPTURAS && (largura === 360 || largura === 768)) await q.screenshot({ path: path.join(CAPTURAS, `formulario-${largura}-${scheme}.png`), fullPage: true });
      await c2.close();
    }
  }

  await b.close();
  console.log(`${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
