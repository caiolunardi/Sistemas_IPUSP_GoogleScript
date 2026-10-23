// fontconfig próprio para o Chromium que DESENHA as imagens dos testes de OCR.
// A família vem de um arquivo de fonte carregado como FontFace, mas o
// Chromium no Linux pede ao fontconfig como rasterizar o texto (antialias e
// outras opções), e as regras de /etc/fonts mudam de máquina para máquina:
// na CI do PR #26 o mesmo desenho, com a mesma fonte, deu outros bytes e
// outra leitura do OCR. Esta configuração não inclui as regras do sistema
// (só as pastas de fontes) e fixa a rasterização: tons de cinza, sem
// hinting, sem subpixel.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PROPRIEDADES = [
  ['antialias', '<bool>true</bool>'],
  ['hinting', '<bool>false</bool>'],
  ['hintstyle', '<const>hintnone</const>'],
  ['autohint', '<bool>false</bool>'],
  ['rgba', '<const>none</const>'],
  ['lcdfilter', '<const>lcdnone</const>'],
  ['embeddedbitmap', '<bool>false</bool>'],
  ['embolden', '<bool>false</bool>']
];

/** Escreve o fonts.conf num diretório temporário e devolve { arquivo, dir }. */
function prepararFontconfigDesenho() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fontconfig-desenho-'));
  const arquivo = path.join(dir, 'fonts.conf');
  const edicoes = PROPRIEDADES.map(([nome, valor]) => '    <edit name="' + nome + '" mode="assign" binding="strong">' + valor + '</edit>\n').join('');
  fs.writeFileSync(arquivo, '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
    '  <dir>/usr/share/fonts</dir>\n  <cachedir>' + path.join(dir, 'cache') + '</cachedir>\n' +
    '  <match target="pattern">\n' + edicoes + '  </match>\n' +
    '  <match target="font">\n' + edicoes + '  </match>\n</fontconfig>\n');
  return { arquivo, dir };
}

/** Opções de rasterização que o fontconfig devolve para a família (só para o registro). */
function opcoesDeRasterizacao(familia, arquivo) {
  const env = Object.assign({}, process.env);
  if (arquivo) env.FONTCONFIG_FILE = arquivo; else delete env.FONTCONFIG_FILE;
  try {
    return execFileSync('fc-match', ['-f', 'antialias=%{antialias} hinting=%{hinting} hintstyle=%{hintstyle} rgba=%{rgba} lcdfilter=%{lcdfilter} autohint=%{autohint} embeddedbitmap=%{embeddedbitmap}', familia], { encoding: 'utf8', env }).trim();
  } catch (e) { return 'fc-match indisponível'; }
}

/**
 * fontconfig para os Chromium que LEEM o PDF misto: mantém as famílias e regras da
 * configuração vigente (incluída) e só desliga o hinting, que mudava o desenho da
 * página com fonte não incorporada e o resultado do OCR (ETAPA4_TESTES_MISTOS.md, 6.2).
 * regrasAntes: regras que precisam vir antes da configuração do sistema (aliases).
 */
function prepararFontconfigLeitura(regrasAntes) {
  const base = process.env.FONTCONFIG_FILE || '/etc/fonts/fonts.conf';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fontconfig-leitura-'));
  const arquivo = path.join(dir, 'fonts.conf');
  const edicoes = ['    <edit name="hinting" mode="assign" binding="strong"><bool>false</bool></edit>\n',
    '    <edit name="hintstyle" mode="assign" binding="strong"><const>hintnone</const></edit>\n',
    '    <edit name="autohint" mode="assign" binding="strong"><bool>false</bool></edit>\n'].join('');
  fs.writeFileSync(arquivo, '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
    (regrasAntes || '') +
    '  <include ignore_missing="yes">' + base + '</include>\n' +
    '  <match target="pattern">\n' + edicoes + '  </match>\n' +
    '  <match target="font">\n' + edicoes + '  </match>\n</fontconfig>\n');
  return { arquivo, dir };
}

module.exports = { prepararFontconfigDesenho, prepararFontconfigLeitura, opcoesDeRasterizacao };
