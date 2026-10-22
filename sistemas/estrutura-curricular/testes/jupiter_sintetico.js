// PDF SINTÉTICO MISTO no layout que o LeitorPdfJupiter reconhece (testes
// complementares da Etapa 4). Tudo inventado: curso 99001, currículo
// 99001 0100 261, disciplinas com prefixo TST (escolhido na calibração: ver ETAPA4_TESTES_MISTOS.md); nenhum dado real.
//
// De onde vem o layout: das expressões regulares e dos comentários de
// src/LeitorPdf.html (cabeçalho Curso/Complemento/Currículo, linha de
// colunas "Disciplina Aula Trab. Tot. CH CE CP EXT ATPA Ideal", seções,
// "CÓDIGO(VERSÃO) Nome......", "Requisito - …", "ou", "Subtotal:",
// "Total …:", rodapé "USP/STI - data hora - Pág. n / m"). Não é cópia de
// um relatório real: posições, tamanhos de letra e espaçamentos foram
// escolhidos aqui e podem ser diferentes dos do Júpiter.
//
// Três páginas:
//  1. texto selecionável em Helvetica NÃO incorporada (a condição em que o
//     PDF.js 6.x desenha diferente do 3.11.174, achada no PR #25);
//  2. e 3. imagens em tons de cinza (300 dpi), sem camada de texto, com a
//     continuação da tabela. As imagens são desenhadas no navegador com a
//     LiberationSans-Regular.ttf do pdfjs-dist fixado no package-lock (não
//     dependem das fontes da máquina).
// Como só 1 de 3 páginas tem texto, o leitor escolhe o OCR para as três.
// Os valores esperados ficam em esperado_jupiter_sintetico.js, escritos à mão.
'use strict';
const zlib = require('zlib');

const LARGURA = 595, ALTURA = 842;   // A4 em pontos
const PX_POR_PT = 300 / 72;          // imagens a 300 dpi
const IMG_LARGURA = 2480, IMG_ALTURA = 3508;

// Centro de cada coluna numérica (pt) e rótulos do cabeçalho.
const COLUNAS = [
  ['Aula', 330], ['Trab.', 360], ['Tot.', 390], ['CH', 420], ['CE', 450],
  ['CP', 478], ['EXT', 506], ['ATPA', 536], ['Ideal', 568]
];
const X_CODIGO = 40, X_NOME = 95;
const TAM = 9, TAM_REQ = 8, PASSO = 15;

// Tabela como aparece no relatório, página a página. Cada linha:
//  ['sec', título] · ['disc', código(versão), nome, [aula, trab, tot, ch, ce, cp, ext, atpa, período]]
//  ['req', texto] · ['ou'] · ['sub', [8 números]] · ['tot', rótulo, [8 números]]
const TABELA = [
  [
    ['sec', 'Disciplinas Obrigatórias'],
    ['disc', 'TST0101(1)', 'Fundamentos Sintéticos I', [4, 0, 4, 60, 0, 0, 0, 0, 1]],
    ['disc', 'TST0102(2)', 'Métodos Fictícios', [2, 1, 3, 60, 0, 0, 0, 0, 1]],
    ['sub', [6, 1, 7, 120, 0, 0, 0, 0]],
    ['disc', 'TST0201(1)', 'Laboratório Sintético', [0, 2, 2, 60, 0, 8, 0, 0, 2]],
    ['req', 'Requisito - TST0101(1) Fundamentos Sintéticos I']
  ],
  [
    ['disc', 'TST0205(1)', 'Estatística Fictícia', [4, 0, 4, 60, 0, 0, 0, 0, 2]],
    ['req', 'Requisito - TST0102(2) Métodos Fictícios'],
    ['ou'],
    ['req', 'Requisito - TST0101(1) Fundamentos Sintéticos I'],
    ['sub', [4, 2, 6, 120, 0, 8, 0, 0]],
    ['disc', 'TST0301(1)', 'Pesquisa Sintética', [3, 1, 4, 75, 0, 0, 0, 0, 3]],
    ['req', 'Requisito - TST0201(1) Laboratório Sintético'],
    ['req', 'Requisito - TST0205(1) Estatística Fictícia'],
    ['disc', 'TST0308(1)', 'Seminário Fictício', [1, 0, 1, 15, 0, 0, 5, 0, 3]],
    ['sub', [4, 1, 5, 90, 0, 0, 5, 0]],
    ['tot', 'Total Obrigatórias:', [14, 4, 18, 330, 0, 8, 5, 0]]
  ],
  [
    ['sec', 'Disciplinas Optativas Eletivas'],
    ['disc', 'TST0510(1)', 'Tópicos Fictícios', [2, 0, 2, 30, 0, 0, 0, 0, 5]],
    ['disc', 'TST0511(1)', 'Oficina Sintética', [1, 1, 2, 45, 0, 0, 0, 10, 5]],
    ['req', 'Requisito fraco - TST0301(1) Pesquisa Sintética'],
    ['sub', [3, 1, 4, 75, 0, 0, 0, 10]],
    ['tot', 'Total Optativas Eletivas:', [3, 1, 4, 75, 0, 0, 0, 10]]
  ]
];

/** Largura aproximada de um texto em Helvetica/Liberation Sans (dígitos = 0,556 em). */
function larguraNumero(texto, tam) { return String(texto).length * 0.556 * tam; }

/**
 * Itens posicionados de uma página (1 a 3): { x, y (linha de base, a partir
 * do topo, em pt), tam, texto }. Os números são centralizados na coluna.
 * mutar (só nos controles negativos): função (item) → item.
 */
function itensDaPagina(numero, mutar) {
  const itens = [];
  const add = (x, y, tam, texto) => itens.push({ x, y, tam, texto });
  const numeros = (y, valores, tam) => valores.forEach((v, i) => {
    const s = String(v);
    add(COLUNAS[i][1] - larguraNumero(s, tam) / 2, y, tam, s);
  });
  add(40, 40, 9, 'Júpiter - Sistema de Gestão Acadêmica (sintético)');
  add(40, 56, 11, 'Grade Curricular');
  add(40, 84, TAM, 'Curso: 99001 - Curso Sintético de Teste');
  add(40, 97, TAM, 'Complemento: 0100 - Habilitação Sintética');
  add(40, 110, TAM, 'Currículo: 99001 0100 261');
  add(320, 134, TAM, 'Créditos');
  add(560, 134, TAM, 'Per.');
  add(X_CODIGO, 147, TAM, 'Disciplina');
  COLUNAS.forEach(([rotulo, x]) => add(x - rotulo.length * 0.28 * TAM, 147, TAM, rotulo));
  let y = 167;
  for (const linha of TABELA[numero - 1]) {
    const [tipo] = linha;
    if (tipo === 'sec') { add(X_CODIGO, y, TAM, linha[1]); }
    else if (tipo === 'disc') {
      add(X_CODIGO, y, TAM, linha[1]);
      add(X_NOME, y, TAM, linha[2]);
      numeros(y, linha[3], TAM);
    } else if (tipo === 'req') { add(X_NOME, y, TAM_REQ, linha[1]); }
    else if (tipo === 'ou') { add(X_NOME, y, TAM_REQ, 'ou'); }
    else if (tipo === 'sub') { add(240, y, TAM, 'Subtotal:'); numeros(y, linha[1], TAM); }
    else if (tipo === 'tot') { add(180, y, TAM, linha[1]); numeros(y, linha[2], TAM); }
    y += PASSO;
  }
  add(40, 815, 7, 'USP/STI - 22/10/2026 10:00 - Pág. ' + numero + ' / 3');
  return mutar ? itens.map(mutar).filter(Boolean) : itens;
}

/** Texto do PDF com ( ) \ escapados; o arquivo é gravado em Latin-1 (WinAnsi). */
function textoPdf(s) {
  if (/[^\x20-\xff]/.test(s)) throw new Error('fora do Latin-1: ' + s);
  return String(s).replace(/[\\()]/g, (c) => '\\' + c);
}

/**
 * Desenha as páginas de imagem no navegador (canvas 2480×3508, fundo
 * branco, texto preto em LiberationSans) e devolve [{ cinza: Buffer, largura, altura }].
 * pagina: página do Playwright; fonte: bytes do .ttf.
 */
async function desenharImagens(pagina, numeros, fonte, mutar) {
  const resultado = [];
  for (const n of numeros) {
    const itens = itensDaPagina(n, mutar);
    const b64 = await pagina.evaluate(async ({ itens, fonteB64, escala, largura, altura }) => {
      if (!document.fonts.check('10px "LiberationFixture"')) {
        const bytes = Uint8Array.from(atob(fonteB64), (c) => c.charCodeAt(0));
        const face = new FontFace('LiberationFixture', bytes.buffer);
        await face.load();
        document.fonts.add(face);
      }
      const c = document.createElement('canvas');
      c.width = largura; c.height = altura;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, largura, altura);
      ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
      for (const it of itens) {
        ctx.font = Math.round(it.tam * escala) + 'px LiberationFixture';
        ctx.fillText(it.texto, Math.round(it.x * escala), Math.round(it.y * escala));
      }
      const d = ctx.getImageData(0, 0, largura, altura).data;
      const cinza = new Uint8Array(largura * altura);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) cinza[j] = d[i];
      let s = '';
      for (let i = 0; i < cinza.length; i += 0x8000) s += String.fromCharCode.apply(null, cinza.subarray(i, i + 0x8000));
      return btoa(s);
    }, { itens, fonteB64: fonte.toString('base64'), escala: PX_POR_PT, largura: IMG_LARGURA, altura: IMG_ALTURA });
    resultado.push({ cinza: Buffer.from(b64, 'base64'), largura: IMG_LARGURA, altura: IMG_ALTURA });
  }
  return resultado;
}

/**
 * PDF de três páginas: a 1 com texto (Helvetica não incorporada, WinAnsi)
 * e as outras com as imagens recebidas (DeviceGray, FlateDecode). Sem data,
 * /ID nem metadados variáveis.
 */
function montarPdfMisto(imagens, mutar) {
  const objetos = [];
  const novo = (corpo) => { objetos.push(corpo); return objetos.length; };
  const catalogo = novo(null);
  const raiz = novo(null);
  const fonte = novo('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const filhos = [];
  const conteudo = 'BT\n' + itensDaPagina(1, mutar).map((it) =>
    '/F1 ' + it.tam + ' Tf\n1 0 0 1 ' + it.x.toFixed(2) + ' ' + (ALTURA - it.y).toFixed(2) + ' Tm\n(' + textoPdf(it.texto) + ') Tj\n').join('') + 'ET\n';
  const fluxo = novo('<< /Length ' + Buffer.byteLength(conteudo, 'latin1') + ' >>\nstream\n' + conteudo + 'endstream');
  filhos.push(novo('<< /Type /Page /Parent ' + raiz + ' 0 R /MediaBox [0 0 ' + LARGURA + ' ' + ALTURA + '] /Resources << /Font << /F1 ' + fonte + ' 0 R >> >> /Contents ' + fluxo + ' 0 R >>'));
  const binarios = {};
  imagens.forEach((img) => {
    const dados = zlib.deflateSync(img.cinza, { level: 9 });
    const imagem = novo(null);
    binarios[imagem] = { cabecalho: '<< /Type /XObject /Subtype /Image /Width ' + img.largura + ' /Height ' + img.altura +
      ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ' + dados.length + ' >>', dados };
    const desenho = 'q ' + LARGURA + ' 0 0 ' + ALTURA + ' 0 0 cm /Im1 Do Q\n';
    const fl = novo('<< /Length ' + desenho.length + ' >>\nstream\n' + desenho + 'endstream');
    filhos.push(novo('<< /Type /Page /Parent ' + raiz + ' 0 R /MediaBox [0 0 ' + LARGURA + ' ' + ALTURA + '] /Resources << /XObject << /Im1 ' + imagem + ' 0 R >> >> /Contents ' + fl + ' 0 R >>'));
  });
  objetos[catalogo - 1] = '<< /Type /Catalog /Pages ' + raiz + ' 0 R >>';
  objetos[raiz - 1] = '<< /Type /Pages /Kids [' + filhos.map((n) => n + ' 0 R').join(' ') + '] /Count ' + filhos.length + ' >>';

  const partes = [];
  let pos = 0;
  const posicoes = [];
  const escrever = (b) => { partes.push(b); pos += b.length; };
  escrever(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));
  objetos.forEach((corpo, i) => {
    posicoes.push(pos);
    const n = i + 1;
    if (binarios[n]) {
      escrever(Buffer.from(n + ' 0 obj\n' + binarios[n].cabecalho + '\nstream\n', 'latin1'));
      escrever(binarios[n].dados);
      escrever(Buffer.from('\nendstream\nendobj\n', 'latin1'));
    } else {
      escrever(Buffer.from(n + ' 0 obj\n' + corpo + '\nendobj\n', 'latin1'));
    }
  });
  const xref = pos;
  escrever(Buffer.from('xref\n0 ' + (objetos.length + 1) + '\n0000000000 65535 f \n' +
    posicoes.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objetos.length + 1) + ' /Root ' + catalogo + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n', 'latin1'));
  return Buffer.concat(partes);
}

module.exports = { TABELA, COLUNAS, itensDaPagina, desenharImagens, montarPdfMisto, IMG_LARGURA, IMG_ALTURA };
