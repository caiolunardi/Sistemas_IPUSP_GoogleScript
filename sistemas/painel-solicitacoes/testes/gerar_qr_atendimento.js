// Gera src/PainelAtendimentoQR.html: o QR code da página Atendimento online,
// como SVG fixo (sem serviço externo nem biblioteca no navegador). O QR leva
// o mesmo link do botão (número + mensagem modelo de ATENDIMENTO_ONLINE em
// Codigo.gs). Rode de novo sempre que mudar o número ou a mensagem modelo;
// testar_navegador.js avisa quando o QR ficou desatualizado.
// Uso: node gerar_qr_atendimento.js   (requer o pacote npm "qrcode")
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregarCodigo, SRC } = require('./pagina.js');
function carregarQrcode() { try { return require('qrcode'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/qrcode'); } }

// Mesma montagem de linkWhatsApp() em PainelAtendimento.html.
function linkAtendimento() {
  const c = vm.runInContext('obterAtendimentoParaFrontend_()', carregarCodigo());
  return 'https://wa.me/' + c.whatsapp + (c.mensagemModelo ? '?text=' + encodeURIComponent(c.mensagemModelo) : '');
}

async function gerar() {
  const link = linkAtendimento();
  const svg = (await carregarQrcode().toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#000000', light: '#ffffff' } }))
    .trim()
    .replace('<svg ', '<svg class="atendimentoQrSvg" role="img" aria-label="QR code do WhatsApp do Serviço de Graduação" ');
  // 3 px por módulo: tamanho inteiro, que a câmera lê bem mesmo em tela comum.
  const modulos = Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
  const svgFinal = svg.replace('<svg ', `<svg width="${modulos * 3}" height="${modulos * 3}" `);
  const html = `<!-- QR code da página Atendimento online (v1.5). ARQUIVO GERADO por
     testes/gerar_qr_atendimento.js a partir de ATENDIMENTO_ONLINE (Codigo.gs);
     não edite à mão. Preto sobre branco nos dois temas, de propósito: é o
     contraste que as câmeras leem. -->
<template id="modeloAtendimentoQr" data-link="${link.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
${svgFinal}
</template>
`;
  return { link, html };
}

module.exports = { gerar, linkAtendimento };

if (require.main === module) {
  gerar().then(({ link, html }) => {
    fs.writeFileSync(SRC + 'PainelAtendimentoQR.html', html);
    console.log('PainelAtendimentoQR.html gerado para ' + link);
  });
}
