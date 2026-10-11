// Pacotes SINTÉTICOS (dados fictícios) para testar volumes que o arquivo
// real não tem: por exemplo, a revisão humana com mais de 1.000 valores.
// Os pacotes seguem o formato de LeitorComum.html e passam pela mesma
// validação do servidor (validarPacote_). Códigos de disciplina "SIN0001"
// em diante; currículo e nomes fictícios.
'use strict';

/**
 * Par de pacotes com N disciplinas num currículo fictício:
 *  - csv: primeira importação (sem EXT e sem versão, como o CSV real);
 *  - pdfOcr: o mesmo conteúdo "lido por OCR", com EXT e versão só do PDF.
 * Cada disciplina gera 2 valores só do PDF (EXT e Versão), então
 * N = 551 → 1.102 valores a revisar. EXT > 0 em uma de cada 7.
 */
function parSintetico(modelo, n) {
  const curr = JSON.parse(JSON.stringify(modelo.curriculos[0]));
  curr.info = null;
  const codigoCurr = curr.codigo;
  const disc = [];
  const vinc = [];
  for (let i = 1; i <= n; i++) {
    const codigo = 'SIN' + String(i).padStart(4, '0');
    disc.push({ codigo, nome: 'Disciplina Sintética ' + i, versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 });
    vinc.push({ curriculo: codigoCurr, disciplina: codigo, tipo: i % 5 === 0 ? 'OPTATIVA_LIVRE' : 'OBRIGATORIA', periodoIdeal: i % 5 === 0 ? null : ((i % 10) + 1) });
  }
  const base = {
    versaoPacote: modelo.versaoPacote,
    curso: modelo.curso,
    curriculos: [curr],
    disciplinas: disc,
    vinculos: vinc,
    requisitos: [],
    avisos: [],
    resumoLeitura: null,
    conferencia: null
  };
  const porCurriculo = {};
  porCurriculo[codigoCurr] = { disciplinas: n, OBRIGATORIA: vinc.filter((v) => v.tipo === 'OBRIGATORIA').length, OPTATIVA_LIVRE: vinc.filter((v) => v.tipo === 'OPTATIVA_LIVRE').length, requisitos: 0 };
  base.resumoLeitura = { curriculos: 1, disciplinas: n, vinculos: n, requisitos: 0, porCurriculo };
  const csv = JSON.parse(JSON.stringify(base));
  csv.origem = { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null };
  const pdf = JSON.parse(JSON.stringify(base));
  pdf.origem = { formato: 'pdf', leitura: 'ocr', arquivo: 'sintetico.pdf', tamanhoBytes: null, geradoEm: '2026-09-26T10:00:00', paginas: Math.ceil(n / 15) };
  pdf.disciplinas.forEach((d, i) => {
    d.versao = 1 + (i % 3);
    d.versaoOrigem = 'pdf';
    d.ext = i % 7 === 0 ? 15 : 0;
    d.naoConfirmados = [];
    d.paginas = [1 + Math.floor(i / 15)];
    d.nomePodeEstarCortado = false;
  });
  pdf.vinculos.forEach((v) => { v.periodoConfirmado = true; });
  pdf.resumoLeitura.paginas = pdf.origem.paginas;
  pdf.conferencia = { modo: 'ocr', paginas: pdf.origem.paginas, linhasDisciplina: n, numerosLidos: n * 6, numerosCorrigidos: 0, numerosAConferir: 0, subtotais: 0, subtotaisConferem: 0, subtotaisNaoConferem: 0, totaisSecao: 0, totaisSecaoConferem: 0, totaisSecaoNaoConferem: 0 };
  return { csv, pdfOcr: pdf };
}

module.exports = { parSintetico };
