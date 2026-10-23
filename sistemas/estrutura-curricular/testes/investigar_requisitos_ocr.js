// INVESTIGAÇÃO (não é suíte e não entra na CI): como o LeitorPdfJupiter reage a
// erros típicos do OCR na tabela do PDF sintético (jupiter_sintetico.js), sem
// navegador e sem Tesseract. As palavras de cada página vêm de itensDaPagina()
// (as mesmas posições do PDF misto), no modo "ocr", e cada caso altera UMA
// palavra ou linha, imitando o que o OCR fez nas rodadas reais da Etapa 4
// (ex.: "TSTO0101", 8 caracteres, lido no hinting completo).
//
// Para cada caso mostra: o que muda no resultado acadêmico (com os valores),
// os avisos, a conferência numérica e as linhas não reconhecidas.
// Serve à proposta de proteção (ETAPA4_TESTES_MISTOS.md, seção 9); o leitor
// (src/) não é alterado.
// Uso: node investigar_requisitos_ocr.js [--json]
'use strict';
const { carregar } = require('./carregar_leitores');
const { itensDaPagina } = require('./jupiter_sintetico');
const { ESPERADO, CURRICULO } = require('./esperado_jupiter_sintetico');
const { explicar } = require('./diagnosticar_fontes_naturais');

const ctx = carregar();
const L = ctx.LeitorPdfJupiter;

/** Palavras de uma página em pontos, como o OCR devolve (uma por palavra, conf 90). */
function palavras(numero, mutar) {
  const out = [];
  for (const it of itensDaPagina(numero, mutar)) {
    let x = it.x;
    for (const w of it.texto.split(/\s+/).filter(Boolean)) {
      const larg = w.length * (/^\d+$/.test(w) ? 0.556 : 0.5) * it.tam;
      out.push({ texto: w, x0: x, x1: x + larg, y0: it.y - it.tam * 0.72, y1: it.y + it.tam * 0.2, conf: 90 });
      x += larg + 0.28 * it.tam;
    }
  }
  return out;
}

function ler(mutar) {
  const paginas = [1, 2, 3].map((n) => {
    const t = palavras(n, mutar ? (it) => mutar(n, it) : null);
    return { numero: n, largura: 595, altura: 842, tokens: t, tokensNumericos: t.filter((x) => /^\d+$/.test(x.texto)) };
  });
  return L.analisar(paginas, { modo: 'ocr', arquivo: 'investigacao.pdf', tamanhoBytes: 1 });
}

function academico(p) {
  return {
    curso: p.curso,
    curriculos: p.curriculos.map((c) => ({ codigo: c.codigo, habilitacao: c.habilitacao, habilitacaoNome: c.habilitacaoNome, ano: c.ano, semestre: c.semestre })),
    disciplinas: p.disciplinas.map((d) => [d.codigo, d.nome, d.versao, d.creditosAula, d.creditosTrabalho, d.ch, d.ce, d.cp, d.ext, d.atpa]),
    naoConfirmados: p.disciplinas.filter((d) => d.naoConfirmados.length).map((d) => d.codigo + ':' + d.naoConfirmados.join(',')),
    vinculos: p.vinculos.map((v) => [v.disciplina, v.tipo, v.periodoIdeal]),
    vinculosNaoConfirmados: p.vinculos.filter((v) => !v.periodoConfirmado || v.curriculo !== CURRICULO).map((v) => v.disciplina),
    requisitos: p.requisitos.map((q) => [q.disciplina, q.requisito, q.versaoRequisito, q.tipoRequisito, q.grupo]),
    requisitosDeOutroCurriculo: p.requisitos.filter((q) => q.curriculo !== CURRICULO).length,
    avisos: p.avisos.map((a) => a.nivel + ':' + a.codigo),
    conferencia: Object.fromEntries(Object.keys(ESPERADO.conferencia).map((k) => [k, p.conferencia[k]])),
    geradoEm: p.origem.geradoEm
  };
}
const esperado = {
  curso: ESPERADO.curso, curriculos: ESPERADO.curriculos, disciplinas: ESPERADO.disciplinas, naoConfirmados: [],
  vinculos: ESPERADO.vinculos, vinculosNaoConfirmados: [], requisitos: ESPERADO.requisitos, requisitosDeOutroCurriculo: 0,
  avisos: ESPERADO.avisos, conferencia: ESPERADO.conferencia, geradoEm: ESPERADO.geradoEm
};

// Troca uma palavra (texto exato) numa página.
const trocar = (pagina, de, para) => (n, it) => (n === pagina && it.texto.startsWith(de) ? Object.assign({}, it, { texto: para + it.texto.slice(de.length) }) : it);
const remover = (pagina, inicio) => (n, it) => (n === pagina && it.texto.startsWith(inicio) ? null : it);
const juntos = (...fs) => (n, it) => fs.reduce((acc, f) => (acc ? f(n, acc) : acc), it);

const CASOS = [
  ['C0', 'controle: tabela sem alteração', null],
  ['F1', 'disciplina perdida: código TST0301 lido com 8 caracteres ("TSTO0301")', trocar(2, 'TST0301(1)', 'TSTO0301(1)')],
  ['F2', 'disciplina perdida na seção eletiva: "TSTO0511" (a linha seguinte é um requisito fraco)', trocar(3, 'TST0511(1)', 'TSTO0511(1)')],
  ['F3', 'código lido como outro código válido: disciplina TST0205 → TST0206', trocar(2, 'TST0205(1)', 'TST0206(1)')],
  ['F4', 'código lido como outro código válido: requisito TST0102 → TST0182', trocar(2, 'Requisito - TST0102', 'Requisito - TST0182')],
  ['F5', 'requisito perdido: "TSTO0101" na linha de requisito (a leitura real do hinting completo)', trocar(1, 'Requisito - TST0101', 'Requisito - TSTO0101')],
  ['F6', 'requisito perdido: rótulo ilegível ("Reqmsito - …")', trocar(3, 'Requisito fraco', 'Reqmsito fraco')],
  ['F7', 'linha "ou" perdida: alternativa vira exigência ("e")', remover(2, 'ou')],
  ['F8', 'requisito perdido E disciplina perdida na mesma página', juntos(trocar(2, 'TST0301(1)', 'TSTO0301(1)'), trocar(2, 'Requisito - TST0102', 'Requisito - TSTO0102'))]
];

const saida = [];
for (const [id, nome, mutar] of CASOS) {
  const p = ler(mutar);
  const a = academico(p);
  const dif = explicar(esperado, a);
  const cf = p.conferencia;
  saida.push({
    id, nome,
    diferencas: dif,
    avisos: p.avisos.map((x) => x.nivel + ':' + x.codigo),
    conferencia: { linhasDisciplina: cf.linhasDisciplina, subtotais: cf.subtotaisConferem + '/' + cf.subtotais, totais: cf.totaisSecaoConferem + '/' + cf.totaisSecao, numerosAConferir: cf.numerosAConferir },
    conferenciaAcusa: cf.subtotaisConferem !== cf.subtotais || cf.totaisSecaoConferem !== cf.totaisSecao || cf.numerosAConferir > 0 || cf.linhasDisciplina !== ESPERADO.conferencia.linhasDisciplina,
    linhasNaoReconhecidas: cf.linhasNaoReconhecidas
  });
}

// lerCodigo isolado: leituras do OCR que viram OUTRO código válido sem marca de correção.
const codigos = [['TSTO101', 'O no lugar do 0 (corrigido pela posição)'], ['TST0I01', 'I no lugar do 1'], ['TST0206', '5 lido como 6'], ['TST0Z01', 'Z no lugar do 2'],
  ['2Z20101', 'prefixo ZZZ lido como 2Z2'], ['2220101', 'prefixo ZZZ lido inteiro como 222'], ['5IN0101', 'prefixo SIN com S lido como 5'], ['TSTO0101', '8 caracteres'], ['TST0B01', 'B no lugar do 8']]
  .map(([bruto, nota]) => { const r = L._lerCodigo(bruto, 'ocr'); return { bruto, nota, codigo: r ? r.codigo : null, corrigido: r ? r.corrigido : null }; });

if (process.argv.includes('--json')) { console.log(JSON.stringify({ casos: saida, codigos }, null, 1)); process.exit(0); }
for (const c of saida) {
  console.log('\n== ' + c.id + ' — ' + c.nome);
  if (!c.diferencas.length) console.log('   resultado acadêmico igual ao esperado');
  for (const [g, linhas] of c.diferencas) { console.log('   ' + g + ':'); linhas.forEach((l) => console.log('     - ' + l)); }
  console.log('   avisos: ' + (c.avisos.join(', ') || 'nenhum') + ' · conferência: ' + c.conferencia.linhasDisciplina + ' linhas, subtotais ' + c.conferencia.subtotais + ', totais ' + c.conferencia.totais +
    ' · a conferência numérica ' + (c.conferenciaAcusa ? 'ACUSA' : 'NÃO acusa'));
  c.linhasNaoReconhecidas.forEach((n) => console.log('   linha não reconhecida, página ' + n.pagina + ': "' + n.texto + '"'));
}
console.log('\n== lerCodigo no modo OCR');
codigos.forEach((c) => console.log('   ' + c.bruto.padEnd(9) + ' → ' + String(c.codigo).padEnd(8) + (c.codigo ? (c.corrigido ? ' (marcado como corrigido)' : ' (SEM marca de correção)') : ' (rejeitado)') + ' · ' + c.nota));
