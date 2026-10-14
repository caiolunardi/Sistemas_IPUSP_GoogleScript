// (1.11.0) "Cadastrar nova grade" com abas como no Apps Script real.
// Defeito visto em produção (14/10/2026): no Apps Script, cada getSheets()
// devolve objetos NOVOS para as mesmas abas; recomecarPlanilha_ comparava
// abas com "!==", apagava também a aba vazia e, na última aba, o Google
// recusava ("Não é possível remover todas as páginas de um documento").
// O recomeço ficava pendente e o painel não abria para ninguém.
// O simulador passa a reproduzir isso (estado.abasComoNoGoogle e a recusa
// de apagar a última aba). Só dados sintéticos.
// Uso: node testar_recomeco_google.js   (DIR_SRC=/caminho/src para outra fonte)
'use strict';
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
let ok = 0, falhas = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; console.log('  ✗', nome, '\n     ', e && e.message); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }
const ADMIN = 'dono@unidade.example', LEITOR = 'leitor@unidade.example';

function ambiente() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  amb.estado.abasComoNoGoogle = true;
  pedir(amb.ctx.obterDadosPainel());
  return amb;
}
const nomes = (amb) => amb.estrutura().getSheets().map((s) => s.getName());
const visiveis = (amb) => amb.estrutura().getSheets().filter((s) => !s.name.startsWith('_')).map((s) => s.getName());

console.log('\n== Recomeço com abas como no Apps Script (fonte: ' + DIR_SRC + ')');
teste('simulador: cada getSheets() devolve objetos novos e a última aba não pode ser apagada', () => {
  const amb = ambiente();
  const ss = amb.estrutura();
  verdade(ss.getSheets()[0] !== ss.getSheets()[0], 'objetos novos');
  igual(ss.getSheets()[0].getSheetId(), ss.getSheets()[0].getSheetId());
  const so = criarAmbiente({ dirSrc: DIR_SRC }).estrutura();
  let erro = '';
  try { so.deleteSheet(so.getSheets()[0]); } catch (e) { erro = e.message; }
  igual(erro, 'Não é possível remover todas as páginas de um documento.');
});
teste('base preparada do zero: abas na ordem do esquema', () => {
  const amb = ambiente();
  igual(visiveis(amb), amb.ctx.ORDEM_ABAS.slice());
});
teste('"Cadastrar nova grade": conclui, sem marca pendente e com as abas na ordem do esquema', () => {
  const amb = ambiente();
  const r = amb.ctx.cadastrarNovaGrade('APAGAR');
  verdade(r.ok, JSON.stringify(r));
  verdade(!amb.ctx.recomecoPendente_(amb.estrutura()), 'marca removida');
  igual(nomes(amb), amb.ctx.ORDEM_ABAS.slice(), 'só as abas do esquema, na ordem');
  pedir(amb.ctx.obterDadosPainel());
});
teste('estado de produção (recomeço interrompido, uma aba sobrando): o administrador abre o painel e o recomeço termina; o leitor esperava "base não preparada"', () => {
  const amb = ambiente();
  const ss = amb.estrutura();
  amb.ctx.gravarMetadado_(ss, amb.ctx.META_RECOMECO, JSON.stringify({ inicio: 0 }));
  ss.getSheets().slice(1).forEach((s) => ss.deleteSheet(s));   // sobra só a primeira (como na produção)
  igual(ss.getSheets().length, 1);
  amb.trocarUsuario(LEITOR);
  igual(amb.ctx.obterDadosPainel().codigo, 'BASE_NAO_PREPARADA');
  amb.trocarUsuario(ADMIN);
  const r = amb.ctx.obterDadosPainel();
  verdade(r.ok, JSON.stringify(r).slice(0, 300));
  verdade(!amb.ctx.recomecoPendente_(ss));
  igual(nomes(amb), amb.ctx.ORDEM_ABAS.slice());
  amb.trocarUsuario(LEITOR);
  pedir(amb.ctx.obterDadosPainel());
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
