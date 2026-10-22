// Etapa 3 — baixa os pacotes candidatos do PDF.js (e a referência 3.11.174) para o protótipo isolado.
// Usa `npm pack` (proxy e registro do npm configurados na máquina), confere
// o .tgz contra a integridade fixada em candidatos.json (SHA-512) e extrai
// só a biblioteca e o worker de cada candidato para pacotes/<versão>/.
// Depois confere o SHA-384 de cada arquivo extraído. Nada é instalado no
// node_modules dos testes nem entra no package.json/package-lock.json.
// Uso: node preparar.js               (referência e candidatos)
//      node preparar.js --referencia  (só o 3.11.174; a suíte testar_pdf_sintetico.js usa assim na CI)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const AQUI = __dirname;
const PACOTES = path.join(AQUI, 'pacotes');
const config = JSON.parse(fs.readFileSync(path.join(AQUI, 'candidatos.json'), 'utf8'));
// A referência (3.11.174) vem do npm como os candidatos: o node_modules dos testes já está na versão nova.
const candidatos = process.argv.includes('--referencia') ? [config.referencia] : [config.referencia, ...config.candidatos];
const hash = (alg, buf) => alg + '-' + crypto.createHash(alg).update(buf).digest('base64');

fs.mkdirSync(PACOTES, { recursive: true });
const versoes = [...new Set(candidatos.map((c) => c.versao))];
for (const versao of versoes) {
  const doVersao = candidatos.filter((c) => c.versao === versao);
  const esperado = doVersao[0].integridadeNpm;
  const tgz = path.join(PACOTES, 'pdfjs-dist-' + versao + '.tgz');
  if (!fs.existsSync(tgz)) {
    execFileSync('npm', ['pack', 'pdfjs-dist@' + versao, '--pack-destination', PACOTES, '--silent'], { stdio: ['ignore', 'ignore', 'inherit'] });
  }
  const obtido = hash('sha512', fs.readFileSync(tgz));
  if (obtido !== esperado) throw new Error('pdfjs-dist ' + versao + ': integridade do pacote ' + obtido + ' ≠ ' + esperado);
  const destino = path.join(PACOTES, versao);
  fs.mkdirSync(destino, { recursive: true });
  const arquivos = [...new Set(doVersao.flatMap((c) => ['package/' + c.lib.caminho, 'package/' + c.worker.caminho]))];
  execFileSync('tar', ['-xzf', tgz, '-C', destino, ...arquivos]);
  for (const c of doVersao) {
    for (const parte of [c.lib, c.worker]) {
      const h = hash('sha384', fs.readFileSync(path.join(destino, 'package', parte.caminho)));
      if (h !== parte.sha384) throw new Error(c.id + ' ' + parte.caminho + ': ' + h + ' ≠ ' + parte.sha384);
    }
  }
  console.log('ok: pdfjs-dist ' + versao + ' (' + obtido.slice(0, 24) + '…) — ' + arquivos.length + ' arquivos conferidos');
}
