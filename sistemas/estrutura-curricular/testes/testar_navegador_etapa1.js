// Etapa 1 (1.8.1) no navegador real (Chromium): depois de editar o código
// de uma disciplina para outros cursos (PST0391 → PST0392) e incluir
// PST0391 de novo pela "Lista de disciplinas por unidade", a etapa 2 mostra
// DUAS linhas com identificadores distintos (data-id "O:PST0391" e
// "O:PST0391-2"), cada ficha abre o registro certo e as ações (salvar,
// excluir em lote) atingem só a linha escolhida — conferido na aba gravada.
//
// Estrutura curricular SINTÉTICA (pacotes_sinteticos.js: códigos SIN0001…;
// o CSV do Júpiter só empresta o formato do curso/currículo) e CSV da
// unidade sintético, gravado em saida/. E-mails .example.
// Uso: node testar_navegador_etapa1.js <grade_curricular.csv>
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath] = process.argv.slice(2);
if (!csvPath) { console.log('Uso: node testar_navegador_etapa1.js <grade_curricular.csv>'); process.exit(2); }
const SAIDA = path.join(__dirname, 'saida', 'etapa1');
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

const OBS = 'Observação administrativa que deve sobreviver';
function linhasGravadas(amb) {
  const s = amb.estrutura().getSheetByName('Disciplinas para outros cursos');
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}
const porId = (amb, id) => linhasGravadas(amb).find((l) => l['Identificador'] === id);

(async () => {
  const leitores = carregar();
  const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
  const pacote = parSintetico(modelo, 3).csv;
  const arqUnidade = path.join(SAIDA, 'disciplinas_unidade_sintetica.csv');
  fs.writeFileSync(arqUnidade, 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST0391;Disciplina trazida pelo CSV;01/01/2026;;Ativa;2;0\n');

  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pacote))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pacote)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  // Registro existente: cadastrado como PST0391 e com o código editado para PST0392.
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Disciplina original', oferecimento: '1' }, observacoes: OBS }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { codigo: 'PST0392', nome: 'Disciplina corrigida' } }));
  const antigoAntes = JSON.stringify(porId(amb, 'PST0391'));

  const nav = await abrirNavegador();
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 });
  pagina.on('dialog', (d) => d.accept());
  await esperarCarregado(pagina);
  await pagina.click('#etapa-2');
  await pagina.waitForSelector('#etapaPainel-2:not([hidden])');
  const idsDaLista = () => pagina.$$eval('#oCorpoTabela tr[data-id]', (ts) => ts.map((t) => [t.getAttribute('data-id'), t.getAttribute('data-codigo')]));
  async function abrirPorId(id) {
    await pagina.click('#oCorpoTabela tr[data-id="' + id + '"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
  }
  async function fecharFicha() {
    await pagina.click('#modalDisciplina .modal__fechar');
    await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
  }

  console.log('\n== Etapa 1 no navegador');
  await teste('antes: uma linha O:PST0391 com o código PST0392', async () => {
    igual(await idsDaLista(), [['O:PST0391', 'PST0392']]);
  });

  await teste('lista por unidade mostra PST0391 como nova; incluir cria a segunda linha (O:PST0391-2) sem mexer na primeira', async () => {
    await pagina.click('[data-abrir-unidade]');
    await pagina.setInputFiles('#entradaUnidade', arqUnidade);
    await pagina.waitForSelector('.caixaUnidade');
    igual(await pagina.$$eval('.caixaUnidade', (cs) => cs.map((c) => c.value)), ['PST0391'], 'PST0391 aparece como nova');
    await pagina.click('[data-unidade="incluir"]');
    await pagina.waitForFunction(() => /1 disciplina incluída/.test(document.getElementById('unidadeCorpo').textContent));
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    await pagina.waitForSelector('#modalUnidade', { state: 'hidden' });
    await pagina.waitForFunction(() => document.querySelectorAll('#oCorpoTabela tr[data-id]').length === 2);
    igual((await idsDaLista()).sort(), [['O:PST0391', 'PST0392'], ['O:PST0391-2', 'PST0391']]);
    igual(JSON.stringify(porId(amb, 'PST0391')), antigoAntes, 'registro existente intacto na aba');
    await pagina.screenshot({ path: path.join(SAIDA, 'etapa1-duas-linhas.png') });
  });

  await teste('cada ficha abre o seu registro (código, nome e observações)', async () => {
    await abrirPorId('O:PST0391');
    igual([await pagina.inputValue('#fichaCampo-codigo'), await pagina.inputValue('#fichaCampo-nome'), await pagina.inputValue('#fichaObservacoes')], ['PST0392', 'Disciplina corrigida', OBS]);
    await fecharFicha();
    await abrirPorId('O:PST0391-2');
    igual([await pagina.inputValue('#fichaCampo-codigo'), await pagina.inputValue('#fichaCampo-nome'), await pagina.inputValue('#fichaObservacoes')], ['PST0391', 'Disciplina trazida pelo CSV', '']);
    await fecharFicha();
  });

  await teste('salvar a ficha do novo grava só a linha PST0391-2', async () => {
    await abrirPorId('O:PST0391-2');
    await pagina.fill('#fichaCampo-nome', 'Nova editada no navegador');
    await pagina.fill('#fichaObservacoes', 'Obs do novo');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => document.getElementById('fichaSalvar').disabled);
    await fecharFicha();
    const n = porId(amb, 'PST0391-2');
    igual([n['Código'], n['Nome'], n['Observações']], ['PST0391', 'Nova editada no navegador', 'Obs do novo']);
    igual(JSON.stringify(porId(amb, 'PST0391')), antigoAntes, 'existente intacto');
  });

  await teste('excluir em lote só a linha nova (caixa da linha O:PST0391-2) não exclui a existente', async () => {
    await pagina.check('#oCorpoTabela tr[data-id="O:PST0391-2"] .caixaSelecao');
    await pagina.click('#oBarraLote [data-lote="excluir"]');
    await pagina.waitForFunction(() => document.querySelectorAll('#oCorpoTabela tr[data-id]').length === 1);
    igual(await idsDaLista(), [['O:PST0391', 'PST0392']]);
    igual(porId(amb, 'PST0391-2')['Excluída'], 'Sim');
    igual(JSON.stringify(porId(amb, 'PST0391')), antigoAntes, 'existente intacto');
  });

  await teste('nenhum erro de JavaScript na página', async () => { igual(errosPagina, []); });

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO GERAL:', e && e.stack || e); process.exit(1); });
