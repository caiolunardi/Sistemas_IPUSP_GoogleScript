// Controles do diagnóstico de fontes naturais (diagnosticar_fontes_naturais.js),
// sem navegador: cada divergência acadêmica fica visível no relatório e nunca é
// classificada como EQUIVALENTE; falhas de execução viram ERRO DE INFRAESTRUTURA.
// Uso: node testar_diagnostico_fontes.js
'use strict';
const { explicar, classificar, relatorio } = require('./diagnosticar_fontes_naturais');
const { ESPERADO } = require('./esperado_jupiter_sintetico');

let ok = 0, falhas = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; console.log('  ✗', nome, '\n     ', String(e && e.message || e)); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

const clonar = (x) => JSON.parse(JSON.stringify(x));
const esperado = () => clonar({
  curso: ESPERADO.curso, curriculos: ESPERADO.curriculos, disciplinas: ESPERADO.disciplinas, naoConfirmados: [],
  vinculos: ESPERADO.vinculos, vinculosNaoConfirmados: [], requisitos: ESPERADO.requisitos, requisitosDeOutroCurriculo: 0,
  avisos: ESPERADO.avisos, conferencia: ESPERADO.conferencia, geradoEm: ESPERADO.geradoEm
});
const linhas = (grupos) => grupos.flatMap(([g, l]) => l.map((x) => g + ' | ' + x));
const difs = (a, b) => (JSON.stringify(a) === JSON.stringify(b) ? [] : ['pacote']);

/** Registro no formato de misto_sintetico_diagnostico.json; alterar(versão, acadêmico) muda uma leitura. */
function registro(alterar) {
  const cenario = (id) => {
    const versoes = {};
    for (const v of ['3.11.174', '6.4.299']) {
      const acad = esperado();
      if (alterar) alterar(id, v, acad);
      versoes[v] = { ok: true, versaoCarregada: v, modo: 'ocr', paginas: 3, academico: acad, diferencasComEsperado: difs(acad, esperado()),
        segundaLeitura: [], confiancaPorPagina: [90, 90, 90], pixelsPagina1: 1 };
    }
    return { id, nome: id, versoes, entreVersoes: { academicas: difs(versoes['3.11.174'].academico, versoes['6.4.299'].academico), pacoteCompleto: [] } };
  };
  return { ambiente: { leitura: 'natural', cenarios: [] }, esperado: esperado(), cenarios: [cenario('A'), cenario('B')], testes: { passaram: 31, falharam: 0, reprovados: [] } };
}

console.log('\n== Diferenças legíveis (explicar)');
teste('resultado igual ao esperado: nenhuma diferença', () => igual(explicar(esperado(), esperado()), []));
teste('disciplina perdida pelo OCR: "faltou" com código e nome, e o vínculo também', () => {
  const o = esperado(); o.disciplinas.splice(4, 1); o.vinculos.splice(4, 1);
  const l = linhas(explicar(esperado(), o));
  verdade(l.includes('Disciplinas e códigos | faltou TST0301 (Pesquisa Sintética)'), l.join('\n'));
  verdade(l.some((x) => /^Vínculos.*faltou o vínculo de TST0301/.test(x)), l.join('\n'));
});
teste('código lido como outro código válido: "faltou" o certo e "a mais" o errado', () => {
  const o = esperado(); o.disciplinas[3][0] = 'TST0206'; o.vinculos[3][0] = 'TST0206';
  const l = linhas(explicar(esperado(), o));
  verdade(l.includes('Disciplinas e códigos | faltou TST0205 (Estatística Fictícia)') && l.includes('Disciplinas e códigos | a mais: TST0206 (Estatística Fictícia)'), l.join('\n'));
});
teste('crédito, CH e período: valor esperado → lido', () => {
  const o = esperado(); o.disciplinas[4][5] = 15; o.vinculos[6][2] = 6;
  const l = linhas(explicar(esperado(), o));
  verdade(l.includes('Créditos e cargas | TST0301: CH 75 → 15'), l.join('\n'));
  verdade(l.includes('Vínculos (tipo e período) | TST0510: OPTATIVA_ELETIVA, período 5 → OPTATIVA_ELETIVA, período 6'), l.join('\n'));
});
teste('requisito ligado à disciplina anterior: "ligado a X em vez de Y"', () => {
  const o = esperado(); o.requisitos[0][0] = 'TST0102';
  const l = linhas(explicar(esperado(), o));
  igual(l, ['Requisitos e grupos | requisito TST0101 v1 (Requisito, grupo 1) ligado a TST0102 em vez de TST0201'], 'linhas');
});
teste('requisito perdido, requisito a mais, grupo "ou" virou "e", tipo trocado', () => {
  const o = esperado(); o.requisitos.pop(); o.requisitos[2][4] = 2; o.requisitos[3][3] = 'Requisito fraco'; o.requisitos.push(['TST0101', 'TST0510', 1, 'Requisito', 1]);
  const l = linhas(explicar(esperado(), o));
  verdade(l.includes('Requisitos e grupos | faltou o requisito de TST0511: TST0301 v1 (Requisito fraco, grupo 1)'), l.join('\n'));
  verdade(l.includes('Requisitos e grupos | requisito a mais em TST0101: TST0510 v1 (Requisito, grupo 1)'), l.join('\n'));
  verdade(l.includes('Requisitos e grupos | requisito TST0101 de TST0205: TST0101 v1 (Requisito, grupo 1) → TST0101 v1 (Requisito, grupo 2)'), l.join('\n'));
  verdade(l.includes('Requisitos e grupos | requisito TST0201 de TST0301: TST0201 v1 (Requisito, grupo 1) → TST0201 v1 (Requisito fraco, grupo 1)'), l.join('\n'));
});
teste('avisos e conferência: cada diferença numa linha', () => {
  const o = esperado(); o.avisos.push('aviso:PDF_LINHAS_NAO_RECONHECIDAS'); o.conferencia.subtotaisConferem = 3;
  const l = linhas(explicar(esperado(), o));
  igual(l, ['Avisos | aviso a mais: aviso:PDF_LINHAS_NAO_RECONHECIDAS', 'Conferência | subtotaisConferem: 4 → 3'], 'linhas');
});

console.log('\n== Classificação');
teste('tudo igual e suíte inteira aprovada: EQUIVALENTE', () => igual(classificar(0, null, registro()).classe, 'EQUIVALENTE'));
teste('requisito na disciplina errada só no 3.11.174, conferência intacta: DIVERGÊNCIA ACADÊMICA', () => {
  const c = classificar(1, null, registro((id, v, a) => { if (v === '3.11.174') a.requisitos[0][0] = 'TST0102'; }));
  igual(c.classe, 'DIVERGÊNCIA ACADÊMICA');
  verdade(c.motivos.some((m) => /3\.11\.174: resultado diferente do esperado/.test(m)) && c.motivos.some((m) => /resultados acadêmicos diferentes/.test(m)), c.motivos.join('; '));
});
teste('divergência acadêmica mesmo se a suíte terminar com 0 (não vira aprovação)', () => {
  igual(classificar(0, null, registro((id, v, a) => { if (id === 'B') a.disciplinas.pop(); })).classe, 'DIVERGÊNCIA ACADÊMICA');
});
teste('as duas versões erram igual: DIVERGÊNCIA ACADÊMICA (contra o esperado)', () => {
  igual(classificar(1, null, registro((id, v, a) => { a.disciplinas[4][5] = 15; })).classe, 'DIVERGÊNCIA ACADÊMICA');
});
teste('asserção não acadêmica reprovada: não é EQUIVALENTE', () => {
  const r = registro(); r.testes = { passaram: 30, falharam: 1, reprovados: ['A · 6.4.299: 2ª leitura'] };
  igual(classificar(1, null, r).classe, 'DIVERGÊNCIA ACADÊMICA');
});
teste('suíte não executada (código 2), erro (código 3), sinal ou registro ausente: ERRO DE INFRAESTRUTURA', () => {
  igual(classificar(2, null, null).classe, 'ERRO DE INFRAESTRUTURA', 'código 2');
  igual(classificar(3, null, registro()).classe, 'ERRO DE INFRAESTRUTURA', 'código 3');
  igual(classificar(null, 'SIGKILL', registro()).classe, 'ERRO DE INFRAESTRUTURA', 'sinal');
  igual(classificar(0, null, null).classe, 'ERRO DE INFRAESTRUTURA', 'sem registro');
});
teste('leitura que não terminou, cenário B ausente ou versão errada carregada: ERRO DE INFRAESTRUTURA', () => {
  const r1 = registro(); r1.cenarios[0].versoes['6.4.299'] = { ok: false, mensagem: 'tempo esgotado' };
  igual(classificar(1, null, r1).classe, 'ERRO DE INFRAESTRUTURA', 'leitura');
  const r2 = registro(); r2.cenarios.pop(); r2.ambiente.cenarioBNaoPreparado = 'nenhuma fonte';
  igual(classificar(1, null, r2).classe, 'ERRO DE INFRAESTRUTURA', 'cenário B');
  const r3 = registro(); r3.cenarios[1].versoes['3.11.174'].versaoCarregada = '6.4.299';
  igual(classificar(0, null, r3).classe, 'ERRO DE INFRAESTRUTURA', 'versão');
});
teste('relatório mostra a classificação e a diferença com valores', () => {
  const r = registro((id, v, a) => { if (v === '3.11.174') a.requisitos[0][0] = 'TST0102'; });
  const md = relatorio(classificar(1, null, r), 1, null, r);
  verdade(md.includes('**Classificação: ❌ DIVERGÊNCIA ACADÊMICA**'), 'classificação');
  verdade(md.includes('requisito TST0101 v1 (Requisito, grupo 1) ligado a TST0102 em vez de TST0201'), 'diferença');
  verdade(md.includes('NÃO é teste aprovado'), 'aviso de não bloqueante');
});

console.log('\n' + ok + ' passaram, ' + falhas + ' falharam');
process.exit(falhas ? 1 : 0);
