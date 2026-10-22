// PDFs SINTÉTICOS para o teste de leitura de PDF na CI (testar_pdf_sintetico.js).
// Montados aqui, byte a byte, sem biblioteca: texto de verdade (fonte
// Helvetica padrão, codificação WinAnsi), sem data, sem /ID e sem metadados
// de autor — o mesmo conteúdo dá sempre os mesmos bytes. Nenhum dado
// acadêmico real: curso, códigos e nomes são inventados (prefixo ZZZ).
'use strict';
const zlib = require('zlib');

/** Texto do PDF com ( ) \ escapados; o arquivo é gravado em Latin-1 (WinAnsi). */
function textoPdf(s) {
  if (/[^\x20-\xff]/.test(s)) throw new Error('fora do Latin-1: ' + s);
  return String(s).replace(/[\\()]/g, (c) => '\\' + c);
}

/**
 * paginas: [[linha, ...], ...] — cada linha vira um texto posicionado
 * (12 pt, margem de 72 pt, uma linha a cada 18 pt) numa página A4.
 * script (opcional): código JavaScript do documento, ligado à abertura do
 * documento (/OpenAction e /Names /JavaScript), à abertura da página 1
 * (/AA /O) e a um link na página 1. Sem script, os bytes são os de antes.
 * @return {Buffer}
 */
function montarPdf(paginas, titulo, script) {
  const objetos = []; // índice 0 = objeto 1
  const novo = (corpo) => { objetos.push(corpo); return objetos.length; };
  const catalogo = novo(null);
  const raiz = novo(null);
  const fonte = novo('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const acao = script ? novo('<< /Type /Action /S /JavaScript /JS (' + textoPdf(script) + ') >>') : 0;
  const filhos = paginas.map((linhas, n) => {
    const conteudo = 'BT\n/F1 12 Tf\n' + linhas.map((l, i) =>
      '1 0 0 1 72 ' + (770 - i * 18) + ' Tm\n(' + textoPdf(l) + ') Tj\n').join('') + 'ET\n';
    const fluxo = novo('<< /Length ' + Buffer.byteLength(conteudo, 'latin1') + ' >>\nstream\n' + conteudo + 'endstream');
    let extra = '';
    if (acao && n === 0) {
      const link = novo('<< /Type /Annot /Subtype /Link /Rect [72 700 400 790] /Border [0 0 0] /A ' + acao + ' 0 R >>');
      extra = ' /Annots [' + link + ' 0 R] /AA << /O ' + acao + ' 0 R >>';
    }
    return novo('<< /Type /Page /Parent ' + raiz + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + fonte + ' 0 R >> >> /Contents ' + fluxo + ' 0 R' + extra + ' >>');
  });
  objetos[catalogo - 1] = '<< /Type /Catalog /Pages ' + raiz + ' 0 R' +
    (acao ? ' /OpenAction ' + acao + ' 0 R /Names << /JavaScript << /Names [(MarcadorTeste) ' + acao + ' 0 R] >> >>' : '') + ' >>';
  objetos[raiz - 1] = '<< /Type /Pages /Kids [' + filhos.map((n) => n + ' 0 R').join(' ') + '] /Count ' + filhos.length + ' >>';
  const info = novo('<< /Title (' + textoPdf(titulo || 'PDF sintetico') + ') /Producer (GRADIP testes sinteticos) >>');

  let saida = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const posicoes = [];
  objetos.forEach((corpo, i) => {
    posicoes.push(Buffer.byteLength(saida, 'latin1'));
    saida += (i + 1) + ' 0 obj\n' + corpo + '\nendobj\n';
  });
  const xref = Buffer.byteLength(saida, 'latin1');
  saida += 'xref\n0 ' + (objetos.length + 1) + '\n0000000000 65535 f \n' +
    posicoes.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objetos.length + 1) + ' /Root ' + catalogo + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(saida, 'latin1');
}

// Conteúdo esperado. Cada página tem bem mais de 40 caracteres de texto,
// para o leitor escolher a camada de texto (sem OCR).
const PAGINAS = [
  [
    'GRADE CURRICULAR SINTETICA - DOCUMENTO DE TESTE',
    'Curso ficticio ZZZ-0000 - Ciência de Teste',
    'Disciplina ZZZ0001 Fundamentos Sintéticos 4 0 60',
    'Disciplina ZZZ0002 Métodos Fictícios 2 1 45'
  ],
  [
    'Pagina 2 de 2 - conteudo inventado para a CI',
    'Disciplina ZZZ0003 Laboratório Imaginário 0 2 60',
    'Marcador final: PDFJS-SINTETICO-OK'
  ]
];

/** PDF válido de duas páginas com o texto de PAGINAS. */
function pdfValido() {
  return montarPdf(PAGINAS, 'PDF sintetico de teste');
}

// Script benigno do PDF com JavaScript: só tenta deixar um marcador. Se o
// código rodasse no sandbox de scripts do PDF.js, app.alert abriria um
// diálogo; se rodasse na própria página, criaria window.__marcadorScriptPdf.
// O leitor não deve executar nenhum dos dois.
const MARCADOR_SCRIPT = 'MARCADOR-SCRIPT-PDF';
const SCRIPT_BENIGNO = 'try { app.alert("' + MARCADOR_SCRIPT + '"); } catch (e) {} try { globalThis.__marcadorScriptPdf = "' + MARCADOR_SCRIPT + '"; } catch (e) {}';

/** PDF válido (mesmo texto de PAGINAS) com JavaScript de documento benigno. */
function pdfComScript() {
  return montarPdf(PAGINAS, 'PDF sintetico com script de teste', SCRIPT_BENIGNO);
}

/** Começa como PDF (%PDF-) mas o resto é lixo: sem objetos nem xref. */
function pdfCorrompido() {
  const lixo = Buffer.alloc(2048);
  for (let i = 0; i < lixo.length; i++) lixo[i] = (i * 37 + 11) & 0xff; // determinístico
  return Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), lixo]);
}

/** Nem começa como PDF. */
function naoPdf() {
  return Buffer.from('Este arquivo nao e um PDF: e texto puro sintetico.\n', 'latin1');
}

/** PDF de uma página A4 só com uma imagem cinza (largura×altura px, 1 byte por pixel). */
function pdfDeImagem(cinza, largura, altura) {
  const dados = zlib.deflateSync(cinza);
  const conteudo = 'q 595 0 0 842 0 0 cm /Im1 Do Q\n';
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>',
    null,
    '<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo + 'endstream'
  ];
  const partes = [];
  let pos = 0;
  const posicoes = [];
  const escrever = (b) => { partes.push(b); pos += b.length; };
  escrever(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));
  objetos.forEach((corpo, i) => {
    posicoes.push(pos);
    if (i === 3) {
      escrever(Buffer.from('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + largura + ' /Height ' + altura +
        ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ' + dados.length + ' >>\nstream\n', 'latin1'));
      escrever(dados);
      escrever(Buffer.from('\nendstream\nendobj\n', 'latin1'));
    } else {
      escrever(Buffer.from((i + 1) + ' 0 obj\n' + corpo + '\nendobj\n', 'latin1'));
    }
  });
  const xref = pos;
  escrever(Buffer.from('xref\n0 6\n0000000000 65535 f \n' + posicoes.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n', 'latin1'));
  return Buffer.concat(partes);
}

/**
 * PDF só com imagem (sem texto nem fonte), como um relatório escaneado: blocos
 * pretos e cinzas desenhados pelo próprio código, 1240×1754 px (A4 a 150 dpi).
 * O desenho não depende das fontes da máquina.
 */
function pdfSoImagem() {
  const largura = 1240, altura = 1754;
  const cinza = Buffer.alloc(largura * altura, 255);
  const bloco = (x, y, l, a, v) => { for (let j = y; j < y + a; j++) cinza.fill(v, j * largura + x, j * largura + x + l); };
  for (let linha = 0; linha < 30; linha++) {
    const y = 150 + linha * 48;
    let x = 120;
    for (let palavra = 0; palavra < 8; palavra++) {
      const l = 40 + ((linha * 7 + palavra * 13) % 9) * 12;
      bloco(x, y, l, 22, palavra % 3 === 2 ? 110 : 0); // 110 conta como escuro (< 128)
      x += l + 24;
      if (x > 1100) break;
    }
  }
  bloco(120, 1650, 1000, 3, 150); // linha cinza-clara: não conta como escura
  return pdfDeImagem(cinza, largura, altura);
}

module.exports = { montarPdf, pdfValido, pdfCorrompido, naoPdf, pdfComScript, pdfDeImagem, pdfSoImagem, PAGINAS, MARCADOR_SCRIPT, SCRIPT_BENIGNO };
