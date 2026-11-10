// Testes de navegador do Formulário de Pedido de Colação de Grau 2.0
// (Chromium real via Playwright). Simula google.script.run com dados
// 100% fictícios e confere: telas por situação, validação na página,
// chave de envio (mesma chave ao enviar de novo, chave nova na
// correção), protocolo só com resposta do servidor, "Meus pedidos"
// sem HTML injetado e larguras de 360 a 1280 px.
// A interface GRADIP (tema, ajuda) é o PR 7; aqui a tela é a legada.
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
const HTML = fs.readFileSync(path.join(__dirname, '..', 'src', 'ColacaoApp.html'), 'utf8');
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

const stub = c => `(function(){var C=${JSON.stringify(c)};window.__chamadas=[];var envios=0;
var API={obterDadosIniciais:function(){if(C.erroCarga)throw new Error(C.erroCarga);return C.dados},
 enviarPedidoColacao:function(d){var r=(C.envio||[])[Math.min(envios,(C.envio||[]).length-1)];envios++;if(typeof r==='string')throw new Error(r);return r},
 listarMeusPedidos:function(){return C.lista||[]},
 reenviarComprovanteColacao:function(){return {enviado:true}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,arg===undefined?null:JSON.parse(JSON.stringify(arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},30)}});return o}
window.google={script:{get run(){return runner()}}};})();`;

let ok = 0, falhas = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; } else { falhas++; console.log('FALHA', n, extra); } };

async function abrir(ctx, cen) {
  const p = await ctx.newPage();
  p.__erros = [];
  p.on('pageerror', e => p.__erros.push(e.message));
  await p.route('https://form.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8',
    body: '<!DOCTYPE html><html><head><meta charset="utf-8"><script>' + stub(CENARIOS[cen]) + '</script></head><body>' + HTML + '</body></html>' }));
  await p.route('**/*', r => (r.request().url().startsWith('https://form.teste/') ? r.fallback() : r.fulfill({ body: '' })));
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
  chk('validação: borda vermelha', (await p.$eval('#campoEmailAlternativo', e => getComputedStyle(e).borderTopColor)) === 'rgb(198, 40, 40)');
  if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, 'campo-invalido.png') });
  await p.fill('#campoEmailAlternativo', 'um@exemplo.invalid');
  chk('validação: destaque some ao digitar', await p.$eval('#campoEmailAlternativo', e => !e.classList.contains('campoInvalido') && !e.hasAttribute('aria-invalid')) && !(await p.$('#erroCampo')));
  // Grupo Sim/Não (rádios escondidos): o grupo recebe o foco.
  await p.evaluate(() => { document.querySelectorAll('#grupoAntecipada input').forEach(i => { i.checked = false; }); document.querySelectorAll('#grupoAntecipada .opcaoSimNao').forEach(l => l.classList.remove('selecionada')); });
  await p.click('#botaoEnviar');
  chk('validação: grupo Sim/Não destacado e focado', await p.evaluate(() => { const g = document.getElementById('grupoAntecipada'); return g.classList.contains('campoInvalido') && document.activeElement === g; }));
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

  // Larguras: sem rolagem horizontal.
  for (const largura of [360, 390, 480, 768, 1280]) {
    const c2 = await b.newContext({ viewport: { width: largura, height: 800 } });
    const q = await abrir(c2, 'provisoria');
    chk(`largura ${largura}: sem rolagem horizontal`, await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    chk(`largura ${largura}: botão de envio ≥ 44 px`, await q.$eval('#botaoEnviar', e => e.getBoundingClientRect().height >= 44));
    if (CAPTURAS) await q.screenshot({ path: path.join(CAPTURAS, `formulario-${largura}.png`), fullPage: true });
    await c2.close();
  }

  await b.close();
  console.log(`${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
