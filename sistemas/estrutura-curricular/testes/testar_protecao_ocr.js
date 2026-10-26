// PROTEÇÃO B2 (validação SINTÉTICA): leituras do OCR que tornam incerta uma
// disciplina ou um requisito viram ERRO e bloqueiam a importação pelas regras
// já existentes (aviso de nível "erro" → "Ver o que vai mudar" desativado no
// painel; bloqueio na prévia e "BLOQUEADA" na gravação, em Importacao.gs, que
// não foi alterado).
//
// Entrada: as palavras das 3 páginas do PDF sintético (jupiter_sintetico.js),
// no modo "ocr", com os casos F1–F8 de investigar_requisitos_ocr.js. Sem
// Tesseract: o que o OCR real devolve para o mesmo PDF é coberto por
// testar_pdf_ocr_sintetico.js e testar_pdf_misto_sintetico.js, que continuam
// exigindo o resultado esperado, sem nenhum erro.
//
// Partes: 1. leitor (F1–F8, falsos positivos, texto, conferência, ordem dos
// avisos); 2. servidor simulado (prévia bloqueada, gravação recusada, planilhas
// intactas); 3. painel no Chromium (a leitura do PDF é substituída pelas
// palavras sintéticas; o resto do painel é o real).
// Os resultados acadêmicos esperados são os de esperado_jupiter_sintetico.js,
// sem ajuste. Controles das mutações: mutacoes_protecao_ocr.js.
// Uso: node testar_protecao_ocr.js [--sem-navegador]
// Opcional: DIR_SRC_ANTERIOR=<src de antes da B2> compara o modo texto (deve ser idêntico).
'use strict';
const fs = require('fs');
const path = require('path');
const { carregar } = require('./carregar_leitores');
const { itensDaPagina } = require('./jupiter_sintetico');
const { ESPERADO, CURRICULO } = require('./esperado_jupiter_sintetico');
const { academico, esperado, trocar, remover, juntos, CASOS } = require('./investigar_requisitos_ocr');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const SEM_NAVEGADOR = process.argv.includes('--sem-navegador');
const leitores = carregar();
const L = leitores.LeitorPdfJupiter;
const C = leitores.EstruturaComum;

let ok = 0, falhas = 0;
const reprovados = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; reprovados.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.message || e).slice(0, 1500)); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// ---------------------------------------------------------------- páginas
/** Palavras (como o OCR devolve) de itens posicionados; mesmo cálculo de investigar_requisitos_ocr.js. */
function palavrasDe(itens) {
  const out = [];
  for (const it of itens) {
    let x = it.x;
    for (const w of it.texto.split(/\s+/).filter(Boolean)) {
      const larg = w.length * (/^\d+$/.test(w) ? 0.556 : 0.5) * it.tam;
      out.push({ texto: w, x0: x, x1: x + larg, y0: it.y - it.tam * 0.72, y1: it.y + it.tam * 0.2, conf: 90 });
      x += larg + 0.28 * it.tam;
    }
  }
  return out;
}
/**
 * Páginas para o leitor. alterar(n, itens) → itens muda a página n;
 * extras = páginas adicionais [itens]. mutar = mutação por item (casos F).
 */
function montar({ mutar, alterar, extras } = {}) {
  const total = 3 + (extras ? extras.length : 0);
  const lista = [];
  for (let n = 1; n <= total; n++) {
    let itens = n <= 3 ? itensDaPagina(n, mutar ? (it) => mutar(n, it) : null) : extras[n - 4];
    if (extras) itens = itens.map((it) => (/^USP\/STI/.test(it.texto) ? Object.assign({}, it, { texto: it.texto.replace(/\/ 3$/, '/ ' + total) }) : it));
    if (alterar) itens = alterar(n, itens);
    const t = palavrasDe(itens);
    lista.push({ numero: n, largura: 595, altura: 842, tokens: t, tokensNumericos: t.filter((x) => /^\d+$/.test(x.texto)) });
  }
  return lista;
}
function analisar(opcoes, modo, leitor) {
  return (leitor || L).analisar(montar(opcoes), { modo: modo || 'ocr', arquivo: 'protecao-ocr.pdf', tamanhoBytes: 1 });
}
const codigos = (p) => p.avisos.map((a) => a.nivel + ':' + a.codigo);
const aviso = (p, codigo) => p.avisos.find((a) => a.codigo === codigo);
const B2 = ['PDF_OCR_DISCIPLINA_ILEGIVEL', 'PDF_OCR_REQUISITO_ILEGIVEL', 'PDF_OCR_REQUISITO_SEM_DISCIPLINA'];
const errosB2 = (p) => p.avisos.filter((a) => a.nivel === 'erro' && B2.includes(a.codigo)).map((a) => a.codigo);
const chaveReq = (q) => q.join('|');
/** Requisitos lidos que NÃO estão no esperado (associação indevida). */
const requisitosIndevidos = (p) => {
  const ok = new Set(ESPERADO.requisitos.map(chaveReq));
  return academico(p).requisitos.filter((q) => !ok.has(chaveReq(q)));
};
const caso = (id) => CASOS.find((c) => c[0] === id)[2];

// Itens a mais numa página (mesmo tamanho de letra da tabela).
const item = (x, y, texto, tam) => ({ x, y, tam: tam || 9, texto });
// Desloca para baixo a tabela de uma página (entre o cabeçalho das colunas e o rodapé).
const descer = (itens, dy) => itens.map((it) => (it.y >= 160 && it.y < 800 ? Object.assign({}, it, { y: it.y + dy }) : it));

async function main() {
  // ================================================================ 1. leitor
  console.log('\n== 1. Leitor: casos negativos F1–F8 (OCR sintético)');
  const r = {};
  for (const [id, , mutar] of CASOS) r[id] = analisar({ mutar });

  await teste('C0 (controle): resultado acadêmico igual ao esperado, sem erro nem aviso', () => {
    igual(academico(r.C0), esperado, 'resultado');
    igual(codigos(r.C0), [], 'avisos');
    igual(r.C0.conferencia.linhasNaoReconhecidas, [], 'linhas não reconhecidas');
  });

  await teste('F1: disciplina ilegível ("TSTO0301") vira ERRO com a página e o texto lido', () => {
    const a = aviso(r.F1, 'PDF_OCR_DISCIPLINA_ILEGIVEL');
    verdade(a && a.nivel === 'erro', codigos(r.F1).join(', '));
    verdade(/página 2\b/.test(a.mensagem), 'página na mensagem: ' + a.mensagem);
    verdade(a.detalhe.includes('Página 2: «TSTO0301(1) Pesquisa Sintética 3 1 4 75 0 0 0 0 3»'), 'texto no detalhe: ' + a.detalhe);
    verdade(a.mensagem.length <= 500, 'a mensagem cabe no limite do servidor (500)');
    verdade(C.temErro(r.F1), 'temErro');
  });
  await teste('F1: est.ultima invalidada — os requisitos de TST0301 não vão para TST0205 (nem para outra disciplina)', () => {
    igual(requisitosIndevidos(r.F1), [], 'requisitos indevidos');
    verdade(!academico(r.F1).requisitos.some((q) => q[0] === q[1]), 'sem autorrequisito');
    const a = aviso(r.F1, 'PDF_OCR_REQUISITO_SEM_DISCIPLINA');
    verdade(a && a.nivel === 'erro', 'requisitos órfãos acusados');
    verdade(a.detalhe.includes('«Requisito - TST0201(1) Laboratório Sintético»') && a.detalhe.includes('«Requisito - TST0205(1) Estatística Fictícia»'), a.detalhe);
  });
  await teste('F1: a linha suspeita fica na lista de linhas não reconhecidas, marcada e no topo', () => {
    const l = r.F1.conferencia.linhasNaoReconhecidas;
    igual(l[0], { pagina: 2, texto: 'TSTO0301(1) Pesquisa Sintética 3 1 4 75 0 0 0 0 3', suspeita: 'disciplina' });
    verdade(l.every((x) => x.suspeita), 'todas são suspeitas neste caso');
  });

  await teste('F2: disciplina eletiva ilegível ("TSTO0511") vira ERRO; o requisito fraco não vai para TST0510', () => {
    const a = aviso(r.F2, 'PDF_OCR_DISCIPLINA_ILEGIVEL');
    verdade(a && a.nivel === 'erro' && /página 3\b/.test(a.mensagem), codigos(r.F2).join(', '));
    verdade(a.detalhe.includes('«TSTO0511(1) Oficina Sintética 1 1 2 45 0 0 0 10 5»'), a.detalhe);
    igual(requisitosIndevidos(r.F2), [], 'requisitos indevidos');
    verdade(aviso(r.F2, 'PDF_OCR_REQUISITO_SEM_DISCIPLINA').detalhe.includes('«Requisito fraco - TST0301(1) Pesquisa Sintética»'), 'requisito fraco órfão acusado');
  });

  await teste('F5: requisito com código ilegível ("TSTO0101") vira ERRO com a página e o texto', () => {
    const a = aviso(r.F5, 'PDF_OCR_REQUISITO_ILEGIVEL');
    verdade(a && a.nivel === 'erro' && /página 1\b/.test(a.mensagem), codigos(r.F5).join(', '));
    verdade(a.detalhe.includes('Página 1: «Requisito - TSTO0101(1) Fundamentos Sintéticos I»'), a.detalhe);
    igual(requisitosIndevidos(r.F5), [], 'nenhum requisito inventado');
  });
  await teste('F5: conferência numérica completa (4/4 e 2/2) NÃO retira o bloqueio', () => {
    const cf = r.F5.conferencia;
    igual([cf.subtotaisConferem, cf.subtotais, cf.totaisSecaoConferem, cf.totaisSecao, cf.numerosAConferir], [4, 4, 2, 2, 0]);
    verdade(C.temErro(r.F5), 'continua com erro');
  });
  await teste('F6: rótulo ilegível ("Reqmsito fraco - …") vira ERRO com a página e o texto', () => {
    const a = aviso(r.F6, 'PDF_OCR_REQUISITO_ILEGIVEL');
    verdade(a && a.nivel === 'erro' && /página 3\b/.test(a.mensagem), codigos(r.F6).join(', '));
    verdade(a.detalhe.includes('«Reqmsito fraco - TST0301(1) Pesquisa Sintética»'), a.detalhe);
    igual(requisitosIndevidos(r.F6), [], 'nenhum requisito inventado');
    verdade(C.temErro(r.F6) && r.F6.conferencia.subtotaisConferem === 4, 'bloqueado com a conferência completa');
  });
  await teste('F8: falhas combinadas — os três erros, nenhuma associação silenciosa', () => {
    igual(errosB2(r.F8).sort(), B2.slice().sort());
    igual(requisitosIndevidos(r.F8), [], 'requisitos indevidos');
  });
  await teste('F1, F2, F5, F6 e F8: o pacote tem erro (a importação não pode seguir)', () => {
    igual(['F1', 'F2', 'F5', 'F6', 'F8'].filter((id) => !C.temErro(r[id])), []);
  });

  console.log('\n   Limitações registradas (a B2 não pretende detectar; NÃO são aprovações):');
  for (const id of ['F3', 'F4', 'F7']) {
    console.log('   - ' + id + ': ' + (C.temErro(r[id]) ? 'ERRO acusado' : 'sem erro (não detectado)') + '; requisitos/disciplinas diferentes do esperado: ' +
      (JSON.stringify(academico(r[id]).requisitos) !== JSON.stringify(ESPERADO.requisitos) || JSON.stringify(academico(r[id]).disciplinas) !== JSON.stringify(ESPERADO.disciplinas) ? 'sim' : 'não'));
  }
  const auto = CASOS.map(([id]) => [id, academico(r[id]).requisitos.filter((q) => q[0] === q[1]).length]).filter((x) => x[1]);
  console.log('   - D4 (informativo): autorrequisitos nos casos F: ' + (auto.length ? JSON.stringify(auto) : 'nenhum'));

  console.log('\n== 1. Leitor: situações legítimas (falsos positivos)');
  await teste('PDF com texto (modo texto): resultado esperado, nenhum aviso', () => {
    const p = analisar({}, 'texto');
    const a = academico(p);
    igual([a.disciplinas, a.vinculos, a.requisitos], [ESPERADO.disciplinas, ESPERADO.vinculos, ESPERADO.requisitos]);
    igual(codigos(p), []);
  });
  await teste('modo texto mantém o comportamento: linha "TSTO0301" fica só como não reconhecida (sem erro B2)', () => {
    const p = analisar({ mutar: caso('F1') }, 'texto');
    igual(errosB2(p), []);
    verdade(!p.avisos.some((a) => /^PDF_OCR_/.test(a.codigo)), codigos(p).join(', '));
    verdade(p.conferencia.linhasNaoReconhecidas.every((l) => !l.suspeita), 'sem marca de suspeita');
  });
  await teste('requisito que continua no topo da página seguinte: ligado à disciplina certa, sem erro', () => {
    const p = analisar({
      alterar: (n, itens) => {
        if (n === 1) return itens.filter((it) => it.texto !== 'Requisito - TST0101(1) Fundamentos Sintéticos I');
        if (n === 2) return descer(itens, 15).concat([item(95, 167, 'Requisito - TST0101(1) Fundamentos Sintéticos I', 8)]);
        return itens;
      }
    });
    igual(academico(p).requisitos, ESPERADO.requisitos);
    igual(codigos(p), []);
  });
  await teste('brasão e texto decorativo antes do cabeçalho (inclusive com jeito de código): ignorados', () => {
    const p = analisar({
      alterar: (n, itens) => (n === 1 ? itens : [item(40, 14, 'UNIVERSIDADE DE SÃO PAULO', 7), item(40, 24, 'TSTO0301(1) ~ 3 1 4 75 0 0 0 0 3', 7), item(300, 24, 'X7Z9001 brasão', 7)].concat(itens))
    });
    igual(academico(p), esperado);
    igual(codigos(p), []);
  });
  await teste('página de "Informações Básicas do Currículo" com códigos no texto: sem erro', () => {
    const info = [
      item(40, 40, 'Júpiter - Sistema de Gestão Acadêmica (sintético)'), item(40, 56, 'Informações Básicas do Currículo', 11),
      item(40, 84, 'Curso: 99001 - Curso Sintético de Teste'), item(40, 97, 'Complemento: 0100 - Habilitação Sintética'),
      item(40, 110, 'Currículo: 99001 0100 261'), item(40, 134, 'Data de ativação: 01/02/2026'),
      item(40, 150, 'Duração (em semestres)'), item(40, 165, 'Ideal: 8 Mínima: 8 Máxima: 12'),
      item(40, 185, 'Informações Específicas'), item(40, 200, 'Recomenda-se cursar TST0101(1) antes de TST0201(1).'),
      item(40, 215, 'XYZ2026(3) observação 1 2 3 4 5 6 7 8'), item(40, 815, 'USP/STI - 22/10/2026 10:00 - Pág. 4 / 4', 7)
    ];
    const p = analisar({ extras: [info] });
    const a = academico(p);
    igual([a.disciplinas, a.vinculos, a.requisitos], [ESPERADO.disciplinas, ESPERADO.vinculos, ESPERADO.requisitos]);
    igual(p.avisos.filter((x) => x.nivel === 'erro'), [], 'erros');
  });
  await teste('texto não acadêmico parecido com código dentro da tabela: não bloqueia, fica listado como não reconhecido', () => {
    const extras = ['Obs.: TST0101 equivale a XYZ1234 (consulte a CG)', 'XYZ2026 nota sem números da tabela', 'ABCDEF(1) rótulo sem dígitos 1 2 3 4 5 6 7',
      'AB123(4) código curto', 'Turma 2026-101 (2) noturno', 'CEP05508-030 (3) endereço', 'Resolução CoG 7734(2) de 2020'];
    const p = analisar({ alterar: (n, itens) => (n === 3 ? itens.concat(extras.map((t, i) => item(95, 270 + 15 * i, t))) : itens) });
    igual(academico(p).requisitos, ESPERADO.requisitos);
    igual(p.avisos.filter((x) => x.nivel === 'erro'), [], 'erros');
    igual(p.conferencia.linhasNaoReconhecidas.map((l) => l.texto), extras, 'listadas, na ordem');
    verdade(p.conferencia.linhasNaoReconhecidas.every((l) => !l.suspeita), 'nenhuma marcada como suspeita');
  });
  await teste('rótulos legítimos ("Co-requisito", "Indicação de conjunto", "Requisito (f)") não são suspeitos', () => {
    const p = analisar({
      mutar: juntos(trocar(2, 'Requisito - TST0201', 'Co-requisito - TST0201'), trocar(2, 'Requisito - TST0205', 'Indicação de conjunto - TST0205'), trocar(1, 'Requisito - TST0101', 'Requisito (f) - TST0101'))
    });
    igual(errosB2(p), []);
    igual(p.conferencia.linhasNaoReconhecidas, []);
    igual(academico(p).requisitos.map((q) => q.slice(0, 2)), ESPERADO.requisitos.map((q) => q.slice(0, 2)), 'mesmos pares disciplina/requisito');
  });
  await teste('"Indicação de conjunto" sem código depois do traço (formato não visto): não bloqueia, fica listada', () => {
    const p = analisar({ alterar: (n, itens) => (n === 2 ? itens.filter((it) => it.texto !== 'Requisito - TST0205(1) Estatística Fictícia').concat([item(95, 272, 'Indicação de conjunto - optativas do núcleo comum', 8)]) : itens) });
    igual(errosB2(p), []);
    verdade(p.conferencia.linhasNaoReconhecidas.some((l) => l.texto === 'Indicação de conjunto - optativas do núcleo comum' && !l.suspeita), JSON.stringify(p.conferencia.linhasNaoReconhecidas));
  });
  await teste('"Requisito - …" sem código legível depois do traço continua ERRO (o requisito sempre tem código)', () => {
    const p = analisar({ mutar: trocar(1, 'Requisito - TST0101(1)', 'Requisito - ver observação') });
    igual(errosB2(p), ['PDF_OCR_REQUISITO_ILEGIVEL']);
  });
  await teste('subtotais, totais e títulos de seção: reconhecidos, nenhuma linha suspeita (C0)', () => {
    igual(r.C0.conferencia.totalLinhasNaoReconhecidas, 0);
  });

  console.log('\n== 1. Leitor: conferência (D5) e ordem dos avisos');
  await teste('subtotal e total que não fecham (F1): AVISO com a página, a conta e os valores', () => {
    const a = aviso(r.F1, 'PDF_OCR_CONTAS_NAO_CONFEREM');
    verdade(a && a.nivel === 'aviso', codigos(r.F1).join(', '));
    verdade(/página 2\b/.test(a.mensagem), a.mensagem);
    verdade(a.detalhe.includes('Página 2, Subtotal (Obrigatórias): créditos-aula: soma das disciplinas 1, impresso 4'), a.detalhe);
    verdade(a.detalhe.includes('Página 2, Total da seção (Obrigatórias): '), a.detalhe);
    igual([r.F1.conferencia.subtotaisConferem, r.F1.conferencia.subtotais, r.F1.conferencia.totaisSecaoConferem, r.F1.conferencia.totaisSecao], [3, 4, 1, 2], 'contagens preservadas');
  });
  await teste('contas completas (C0, F5): nenhum aviso de conta', () => {
    verdade(!aviso(r.C0, 'PDF_OCR_CONTAS_NAO_CONFEREM') && !aviso(r.F5, 'PDF_OCR_CONTAS_NAO_CONFEREM'));
  });
  await teste('os erros vêm antes dos avisos no pacote (o servidor lê só os 100 primeiros)', () => {
    for (const id of ['F1', 'F2', 'F8']) {
      const niveis = r[id].avisos.map((a) => a.nivel);
      igual(niveis.slice().sort((x, y) => (x === 'erro' ? 0 : 1) - (y === 'erro' ? 0 : 1)), niveis, id);
    }
    // F2: PDF_OCR_NAO_CONFIRMADOS é gerado antes dos erros; mesmo assim fica depois.
    igual(codigos(r.F2).indexOf('aviso:PDF_OCR_NAO_CONFIRMADOS') > codigos(r.F2).indexOf('erro:PDF_OCR_REQUISITO_SEM_DISCIPLINA'), true);
  });

  if (process.env.DIR_SRC_ANTERIOR) {
    await teste('modo texto idêntico ao da fonte anterior (DIR_SRC_ANTERIOR) em todas as variações', () => {
      const vm = require('vm');
      const ctx = vm.createContext({ TextDecoder, console, Uint8Array, ArrayBuffer, Math, JSON, Date });
      for (const a of ['LeitorComum.html', 'LeitorCsv.html', 'LeitorPdf.html']) {
        const html = fs.readFileSync(path.join(process.env.DIR_SRC_ANTERIOR, a), 'utf8');
        vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'), ctx, { filename: a });
      }
      const antes = ctx.LeitorPdfJupiter;
      for (const [id, , mutar] of CASOS) {
        igual(JSON.stringify(analisar({ mutar }, 'texto')), JSON.stringify(analisar({ mutar }, 'texto', antes)), 'texto ' + id);
      }
    });
  } else {
    console.log('  – modo texto × fonte anterior: NÃO EXECUTADO (sem DIR_SRC_ANTERIOR; não conta como aprovado)');
  }

  // ================================================================ 2. servidor
  console.log('\n== 2. Servidor simulado (Importacao.gs sem alteração)');
  const { criarAmbiente } = require('./mockGoogle');
  const paraServidor = (p) => { const c = JSON.parse(JSON.stringify(p)); delete c.conferencia.itens; delete c.conferencia.linhasNaoReconhecidas; return c; };
  const novoAmbiente = () => { const amb = criarAmbiente({ dirSrc: DIR_SRC }); amb.ctx.obterDadosPainel(); return amb; };

  await teste('controle: o PDF sintético correto (C0) pode ir para a prévia', () => {
    const amb = novoAmbiente();
    const prev = amb.ctx.prepararImportacao(paraServidor(r.C0));
    verdade(prev.ok, prev.erro);
    igual(prev.dados.bloqueios, [], 'bloqueios');
  });
  for (const id of ['F1', 'F2', 'F5', 'F6', 'F8']) {
    await teste(id + ': prévia bloqueada com a mensagem (e a página), gravação recusada (BLOQUEADA), planilhas intactas', () => {
      const amb = novoAmbiente();
      const pac = paraServidor(r[id]);
      const prev = amb.ctx.prepararImportacao(pac);
      verdade(prev.ok, prev.erro);
      igual(prev.dados.podeGravar, false, 'podeGravar');
      for (const a of r[id].avisos.filter((x) => x.nivel === 'erro')) verdade(prev.dados.bloqueios.includes(a.mensagem), 'bloqueio: ' + a.codigo);
      const antes = JSON.stringify(amb.fotografia());
      const conf = amb.ctx.confirmarImportacao(pac, prev.dados.assinatura, { operacao: prev.dados.operacao, revisaoPdf: true, previa: prev.dados.impressao });
      igual(conf.codigo, 'BLOQUEADA', 'confirmação');
      igual(JSON.stringify(amb.fotografia()), antes, 'planilhas e propriedades depois da tentativa');
    });
  }
  await teste('com mais de 100 avisos, o erro (que o leitor põe primeiro) ainda bloqueia', () => {
    const amb = novoAmbiente();
    const pac = paraServidor(r.F1);
    for (let i = 0; i < 150; i++) pac.avisos.push({ nivel: 'aviso', codigo: 'X', mensagem: 'aviso sintético ' + i, detalhe: '' });
    igual(amb.ctx.prepararImportacao(pac).dados.podeGravar, false);
  });
  await teste('lacuna do servidor documentada: um erro depois do 100º aviso NÃO seria lido (por isso a ordem no leitor)', () => {
    const amb = novoAmbiente();
    const pac = paraServidor(r.F1);
    const erros = pac.avisos.filter((a) => a.nivel === 'erro');
    pac.avisos = Array.from({ length: 150 }, (_, i) => ({ nivel: 'aviso', codigo: 'X', mensagem: 'aviso sintético ' + i, detalhe: '' })).concat(erros);
    const prev = amb.ctx.prepararImportacao(pac);
    verdade(!prev.dados.bloqueios.some((b) => /OCR não conseguiu/.test(b)), 'o erro depois do 100º aviso foi ignorado pelo servidor');
  });

  // ================================================================ 3. painel
  if (SEM_NAVEGADOR) {
    console.log('\n== 3. Painel: NÃO EXECUTADO (--sem-navegador; não conta como aprovado)');
  } else {
    console.log('\n== 3. Painel no Chromium (leitura do PDF substituída pelas palavras sintéticas)');
    const { abrirNavegador, abrirPainel, esperarCarregado } = require('./ambiente_navegador');
    const nav = await abrirNavegador();
    const PDF_FALSO = Buffer.from('%PDF-1.4\n% sintético: a leitura é substituída no teste\n');
    async function conferir(paginas, nome, tela) {
      const amb = criarAmbiente({ dirSrc: DIR_SRC });
      const t = await abrirPainel(nav, Object.assign({ amb, latencia: 0 }, tela || {}));
      await esperarCarregado(t.pagina);
      await t.pagina.evaluate((pags) => { window.LeitorPdfFontes.ler = () => Promise.resolve({ modo: 'ocr', paginas: pags }); }, paginas);
      await t.pagina.click('[data-abrir-importacao]');
      await t.pagina.waitForSelector('#modalImportacao:not([hidden]) #entradaArquivo', { state: 'attached' });
      await t.pagina.setInputFiles('#entradaArquivo', { name: nome, mimeType: 'application/pdf', buffer: PDF_FALSO });
      await t.pagina.waitForSelector('#importacaoRodape [data-imp="previa"], [data-imp="previa"]', { timeout: 20000 });
      return t;
    }
    const estado = (t) => t.pagina.evaluate(() => {
      const corpo = document.getElementById('importacaoCorpo');
      const botao = document.querySelector('[data-imp="previa"]');
      const det = document.getElementById('linhasNaoReconhecidas');
      const caixa = [...corpo.querySelectorAll('.alerta')].find((d) => /coerência com as contas/.test(d.textContent));
      return {
        erro: (corpo.querySelector('.alerta--erro') || {}).textContent || '',
        desativado: botao ? botao.disabled : null,
        classeConferencia: caixa ? caixa.className : '',
        lista: det ? { resumo: det.querySelector('summary').textContent, itens: [...det.querySelectorAll('li')].map((li) => li.textContent), html: det.innerHTML } : null,
        avisos: [...corpo.querySelectorAll('.alerta--aviso li')].map((li) => li.textContent)
      };
    });

    const tF1 = await conferir(montar({ mutar: caso('F1') }), 'f1-sintetico.pdf');
    const eF1 = await estado(tF1);
    await teste('F1 no painel: "O arquivo não pode ser importado" com a página e o texto da linha', () => {
      verdade(/O arquivo não pode ser importado/.test(eF1.erro), eF1.erro);
      verdade(/página 2/.test(eF1.erro) && eF1.erro.includes('«TSTO0301(1) Pesquisa Sintética 3 1 4 75 0 0 0 0 3»'), eF1.erro);
      verdade(!/PDF_OCR_/.test(eF1.erro), 'sem código interno na tela');
    });
    await teste('F1 no painel: "Ver o que vai mudar" desativado e nenhuma chamada ao servidor com o pacote', async () => {
      igual(eF1.desativado, true, 'botão desativado');
      await tF1.pagina.evaluate(() => document.querySelector('[data-imp="previa"]').click());
      await tF1.pagina.waitForTimeout(300);
      igual(tF1.chamadas.filter((c) => c === 'prepararImportacao' || c === 'confirmarImportacao'), [], 'chamadas');
    });
    await teste('F1 no painel: caixa da conferência como AVISO e as contas que não fecharam com a página', () => {
      verdade(/alerta--aviso/.test(eF1.classeConferencia), eF1.classeConferencia);
      verdade(eF1.avisos.some((t) => /Página 2, Subtotal \(Obrigatórias\)/.test(t)), eF1.avisos.join(' | '));
    });
    await teste('F1 no painel: lista recolhível das linhas não reconhecidas, com página, texto, total e "Erro"', () => {
      verdade(eF1.lista, 'lista presente');
      verdade(/\(3; 3 com erro\)/.test(eF1.lista.resumo), eF1.lista.resumo);
      verdade(eF1.lista.itens[0].startsWith('Erro: parece uma disciplina, mas o código não pôde ser lido — página 2: «TSTO0301(1)'), eF1.lista.itens[0]);
      verdade(eF1.lista.itens.slice(1).every((t) => /^Erro: requisito sem uma disciplina reconhecida/.test(t)), eF1.lista.itens.join(' | '));
    });
    await tF1.contexto.close();

    // Texto do PDF com marcação HTML: aparece escapado (não vira elemento).
    const tEsc = await conferir(montar({ alterar: (n, itens) => (n === 3 ? itens.concat([item(95, 280, 'Obs <img src=x onerror=alert(1)> & "nota"')]) : itens) }), 'escape-sintetico.pdf');
    const eEsc = await estado(tEsc);
    await teste('PDF correto com uma linha não acadêmica: sem erro, botão ativo, linha listada e escapada', () => {
      igual(eEsc.erro, '', 'erro');
      igual(eEsc.desativado, false, 'botão ativo');
      verdade(/alerta--info/.test(eEsc.classeConferencia), eEsc.classeConferencia);
      verdade(eEsc.lista && /\(1\)/.test(eEsc.lista.resumo) && !/com erro/.test(eEsc.lista.resumo), eEsc.lista && eEsc.lista.resumo);
      igual(eEsc.lista.itens, ['página 3: «Obs <img src=x onerror=alert(1)> & "nota"»']);
      verdade(!/<img/.test(eEsc.lista.html) && /&lt;img/.test(eEsc.lista.html), 'escapado');
    });
    await tEsc.contexto.close();

    const tC0 = await conferir(montar({}), 'c0-sintetico.pdf');
    const eC0 = await estado(tC0);
    await teste('C0 no painel: sem erro, botão ativo, conferência informativa e sem lista (nada a listar)', () => {
      igual([eC0.erro, eC0.desativado, eC0.lista], ['', false, null]);
      verdade(/alerta--info/.test(eC0.classeConferencia), eC0.classeConferencia);
    });
    await teste('C0 no painel: "Ver o que vai mudar" chega ao servidor (o bloqueio de F1 não é do painel inteiro)', async () => {
      await tC0.pagina.click('[data-imp="previa"]');
      await tC0.pagina.waitForFunction(() => document.getElementById('importacaoCorpo').textContent.length > 0 && !document.querySelector('[data-imp="previa"]'), null, { timeout: 20000 });
      verdade(tC0.chamadas.includes('prepararImportacao'), tC0.chamadas.join(', '));
    });
    await tC0.contexto.close();

    // Larguras do celular ao desktop estreito, nos dois temas: sem rolagem horizontal com a lista aberta.
    const errosTelas = [];
    for (const [largura, esquema] of [[360, 'light'], [390, 'dark'], [480, 'light'], [768, 'dark']]) {
      const tl = await conferir(montar({ mutar: caso('F8') }), 'f8-' + largura + '.pdf', { largura, altura: 800, esquema });
      const resumo = await tl.pagina.$('#linhasNaoReconhecidas summary');
      if (resumo) await resumo.click();
      const m = await tl.pagina.evaluate(() => {
        const det = document.getElementById('linhasNaoReconhecidas');
        const corpo = document.getElementById('importacaoCorpo');
        if (!det) return { aberto: false };
        const s = getComputedStyle(det.querySelector('summary'));
        return { aberto: det.open, pagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          corpo: corpo.scrollWidth - corpo.clientWidth, alturaResumo: det.querySelector('summary').getBoundingClientRect().height, cor: s.color, fundo: getComputedStyle(det).backgroundColor };
      });
      await teste(largura + ' px, tema ' + (esquema === 'dark' ? 'escuro' : 'claro') + ': lista aberta sem rolagem horizontal e resumo com alvo de 44 px', () => {
        verdade(m.aberto, 'lista aberta');
        igual([m.pagina <= 0, m.corpo <= 0], [true, true], 'sobra horizontal ' + JSON.stringify(m));
        verdade(m.alturaResumo >= 44, 'altura do resumo ' + m.alturaResumo);
      });
      errosTelas.push(...tl.errosPagina);
      await tl.contexto.close();
    }
    await teste('sem erro de JavaScript nas telas', () => igual([].concat(tF1.errosPagina, tEsc.errosPagina, tC0.errosPagina, errosTelas), []));
    await nav.close();
  }

  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (reprovados.length ? ' — ' + reprovados.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => { console.error('ERRO na suíte:', e && e.stack || e); process.exit(2); });
