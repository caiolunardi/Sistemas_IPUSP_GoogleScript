// Etapa 2 (1.8.2) no navegador real (Chromium): prévia da "Lista de
// disciplinas por unidade" com um CSV MISTO (linhas válidas e inválidas) e
// com um CSV totalmente inválido. Confere: motivos visíveis (lista aberta),
// texto escapado (nenhum HTML do arquivo vira elemento), só as válidas têm
// caixa de seleção, a inclusão grava só as válidas e o arquivo todo
// inválido não oferece "Incluir".
// Estrutura curricular SINTÉTICA (pacotes_sinteticos.js: SIN0001…; o CSV do
// Júpiter só empresta o formato do curso/currículo); CSVs da unidade
// sintéticos, gravados em saida/etapa2/. E-mails .example.
// Uso: node testar_navegador_etapa2.js <grade_curricular.csv>
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath] = process.argv.slice(2);
if (!csvPath) { console.log('Uso: node testar_navegador_etapa2.js <grade_curricular.csv>'); process.exit(2); }
const SAIDA = path.join(__dirname, 'saida', 'etapa2');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

function linhasGravadas(amb) {
  const s = amb.estrutura().getSheetByName('Disciplinas para outros cursos');
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}

const CAB = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho';
const MISTO = [CAB,
  'PST2101;Válida um;01/01/2026;;Semestral;2;1',
  'PST2102;Negativa;01/01/2026;;Semestral;-2;0',
  'PST2103;Texto;01/01/2026;;Semestral;2;abc',
  'PST2104;"Aspas abertas;01/01/2026;;Semestral;2;0',
  '<img src=x onerror=window.__injetado=1>;Código com HTML;01/01/2026;;Semestral;2;0',
  'PST2106;Válida dois;01/01/2026;;Semestral;0;2'].join('\n') + '\n';
// (1.8.3) Escape do motivo de código com HTML, num arquivo à parte (no
// MISTO a linha com <img> ficou dentro do campo aberto na linha 5).
const INJECAO = [CAB, '<img src=x onerror=window.__injetado=1>;Código com HTML;01/01/2026;;Semestral;2;0', 'PST2301;Válida;01/01/2026;;Semestral;2;0'].join('\n') + '\n';
// (1.8.3) Reprodução exata da revisão: PST0999 está dentro do nome de PST0803.
const REPRO = [CAB, 'PST0803;"Nome em várias linhas', 'PST0999;Trecho do nome que parece registro;01/01/2026;;Semestral;2;0', 'fim do nome";01/01/2026;;Semestral;2;0', 'PST0804;Disciplina real;01/01/2026;;Semestral;2;0'].join('\n') + '\n';
const INVALIDO = [CAB, 'PST2201;Negativa;01/01/2026;;Semestral;-1;0', 'PST2202;Fração;01/01/2026;;Semestral;1,5;0'].join('\n') + '\n';

(async () => {
  const leitores = carregar();
  const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
  const pacote = parSintetico(modelo, 3).csv;
  const arqMisto = path.join(SAIDA, 'unidade_mista_sintetica.csv');
  const arqInvalido = path.join(SAIDA, 'unidade_toda_invalida_sintetica.csv');
  fs.writeFileSync(arqMisto, MISTO);
  fs.writeFileSync(arqInvalido, INVALIDO);
  const arqInjecao = path.join(SAIDA, 'unidade_injecao_sintetica.csv');
  const arqRepro = path.join(SAIDA, 'unidade_pst0999_sintetica.csv');
  fs.writeFileSync(arqInjecao, INJECAO);
  fs.writeFileSync(arqRepro, REPRO);

  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pacote))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pacote)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Pré-existente' }, observacoes: 'não pode mudar' }));
  const preexistente = JSON.stringify(linhasGravadas(amb)[0]);

  const nav = await abrirNavegador();
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 });
  await esperarCarregado(pagina);
  await pagina.click('#etapa-2');
  await pagina.waitForSelector('#etapaPainel-2:not([hidden])');

  console.log('\n== Etapa 2 no navegador');
  // (1.8.3) Ajustado: a linha 5 abre aspas que não fecham até o fim, então
  // as linhas 6 e 7 estão DENTRO desse campo (a 1.8.2 oferecia PST2106 — era
  // o defeito). Um motivo cobre as linhas 5 a 7.
  await teste('CSV misto: resumo com 3 linhas ignoradas, lista ABERTA com os motivos (inclusive a faixa 5 a 7), só PST2101 com caixa de seleção', async () => {
    await pagina.click('[data-abrir-unidade]');
    await pagina.setInputFiles('#entradaUnidade', arqMisto);
    await pagina.waitForSelector('.caixaUnidade');
    const resumo = await pagina.textContent('#unidadeCorpo p');
    verdade(/3 linhas ignoradas/.test(resumo), resumo);
    verdade(await pagina.$eval('#unidadeCorpo details', (d) => d.open), 'lista de ignoradas aberta');
    igual((await pagina.textContent('#unidadeCorpo details summary')).trim(), 'Linhas ignoradas — não serão incluídas (3)');
    const itens = await pagina.$$eval('#unidadeCorpo details li', (ls) => ls.map((l) => l.textContent));
    igual(itens.length, 3);
    verdade(itens.some((t) => t === 'Linha 3: PST2102 — Créditos-aula: valor negativo (-2)'), JSON.stringify(itens));
    verdade(itens.some((t) => t === 'Linha 4: PST2103 — Créditos-trabalho: valor inválido (abc)'), JSON.stringify(itens));
    verdade(itens.some((t) => /^Linhas 5 a 7: aspas não encerradas/.test(t)), JSON.stringify(itens));
    igual(await pagina.$$eval('.caixaUnidade', (cs) => cs.map((c) => c.value)), ['PST2101']);
    await pagina.screenshot({ path: path.join(SAIDA, 'etapa2-previa-mista.png') });
  });

  await teste('incluir: grava só PST2101; a pré-existente fica intacta', async () => {
    await pagina.click('[data-unidade="incluir"]');
    await pagina.waitForFunction(() => /1 disciplina incluída/.test(document.getElementById('unidadeCorpo').textContent));
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    await pagina.waitForSelector('#modalUnidade', { state: 'hidden' });
    const g = linhasGravadas(amb);
    igual(g.map((l) => [l['Código'], l['Créditos-aula'], l['Créditos-trabalho'], l['CH total (h)']]), [['PST0391', '', '', ''], ['PST2101', 2, 1, 60]]);
    igual(JSON.stringify(g[0]), preexistente, 'pré-existente intacta');
  });

  await teste('(1.8.3) reprodução PST0999: aviso "Linhas 2 a 4" e só PST0804 selecionável; PST0999 não aparece como opção', async () => {
    await pagina.click('[data-abrir-unidade]');
    await pagina.setInputFiles('#entradaUnidade', arqRepro);
    await pagina.waitForSelector('.caixaUnidade');
    const itens = await pagina.$$eval('#unidadeCorpo details li', (ls) => ls.map((l) => l.textContent));
    igual(itens.length, 1);
    verdade(/^Linhas 2 a 4: aspas não encerradas na mesma linha: campo entre aspas com quebra de linha \(linhas 2 a 4\) não é aceito; o registro inteiro foi descartado$/.test(itens[0]), itens[0]);
    igual(await pagina.$$eval('.caixaUnidade', (cs) => cs.map((c) => c.value)), ['PST0804']);
    verdade(!/PST0999/.test(await pagina.textContent('#unidadeCorpo table')), 'PST0999 fora da tabela de opções');
    await pagina.screenshot({ path: path.join(SAIDA, 'etapa2-pst0999.png') });
    await pagina.click('#unidadeRodape [data-unidade="outro"]');
  });

  await teste('texto do arquivo não vira HTML (motivo com <img> do arquivo aparece como texto; nenhum <img> injetado, nenhum script executado)', async () => {
    await pagina.setInputFiles('#entradaUnidade', arqInjecao);
    await pagina.waitForSelector('.caixaUnidade');
    const itens = await pagina.$$eval('#unidadeCorpo details li', (ls) => ls.map((l) => l.textContent));
    verdade(itens.some((t) => /^Linha 2: código "<img/.test(t)), 'HTML aparece como texto: ' + JSON.stringify(itens));
    igual(await pagina.$$eval('#unidadeCorpo img', (is) => is.length), 0);
    igual(await pagina.evaluate(() => window.__injetado || null), null);
    await pagina.click('#unidadeRodape [data-unidade="outro"]');   // com disciplinas novas, o rodapé não tem "Fechar"
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    await pagina.waitForSelector('#modalUnidade', { state: 'hidden' });
  });

  await teste('arquivo todo inválido: "Nada a incluir" (aviso) explica as ignoradas, sem botão Incluir e sem escrita', async () => {
    const antes = JSON.stringify(linhasGravadas(amb));
    const escritas = amb.estado.escritas;
    await pagina.click('[data-abrir-unidade]');
    await pagina.setInputFiles('#entradaUnidade', arqInvalido);
    await pagina.waitForFunction(() => /Nada a incluir/.test(document.getElementById('unidadeCorpo').textContent));
    const corpo = await pagina.textContent('#unidadeCorpo');
    verdade(/Nenhuma linha válida traz disciplina nova/.test(corpo), corpo);
    verdade(!/Todas as disciplinas do arquivo já estão na lista/.test(corpo), 'não diz que todas já estão');
    verdade(await pagina.$('#unidadeCorpo .alerta--aviso'), 'alerta de aviso');
    igual(await pagina.$$eval('#unidadeCorpo details li', (ls) => ls.map((l) => l.textContent)), ['Linha 2: PST2201 — Créditos-aula: valor negativo (-1)', 'Linha 3: PST2202 — Créditos-aula: valor fracionário (1,5)']);
    igual(await pagina.$$('[data-unidade="incluir"]').then((b) => b.length), 0, 'sem "Incluir"');
    await pagina.screenshot({ path: path.join(SAIDA, 'etapa2-toda-invalida.png') });
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    igual(JSON.stringify(linhasGravadas(amb)), antes, 'aba inalterada');
    igual(amb.estado.escritas, escritas, 'nenhuma escrita');
  });

  await teste('nenhum erro de JavaScript na página', async () => { igual(errosPagina, []); });

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO GERAL:', e && e.stack || e); process.exit(1); });
