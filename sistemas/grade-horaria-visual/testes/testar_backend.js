// Testes do backend da Grade Horária visual (Codigo.gs) com SpreadsheetApp,
// PropertiesService, CacheService, HtmlService e Utilities simulados.
// Dados 100% sintéticos (docentes "Docente Teste N", IDs inventados).
// Uso: node testar_backend.js
const fs = require('fs'), vm = require('vm');
const SRC = require('path').join(__dirname, '..', 'src') + '/';

// Aba simulada: matriz de valores já como texto (getDisplayValues).
function sheet(name, vals) {
  return {
    getName: () => name,
    getLastRow: () => vals.length,
    getLastColumn: () => Math.max(0, ...vals.map(l => l.length)),
    getDataRange() { return this.getRange(1, 1, vals.length, this.getLastColumn()); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getDisplayValues: () => {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const l = vals[r - 1 + i] || [];
          const linha = [];
          for (let j = 0; j < nc; j++) { const v = l[c - 1 + j]; linha.push(v == null ? '' : String(v)); }
          out.push(linha);
        }
        return out;
      }
    })
  };
}
function planilha(nome, abas) {
  return { getName: () => nome, getSheets: () => abas, getSheetByName: n => abas.find(a => a.getName() === n) || null };
}
function run(props, files, opts = {}) {
  const logs = [], erros = [], cache = {}, aberturas = [];
  const ctx = {
    console: { error: m => erros.push(String(m)), log() {}, warn() {} },
    Logger: { log: m => logs.push(String(m)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    CacheService: { getScriptCache: () => ({
      get: k => opts.semCache ? null : (cache[k] || null),
      put: (k, v) => { if (v.length > 100000) throw new Error('grande'); cache[k] = v; },
      removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    SpreadsheetApp: { openById: id => { aberturas.push(id); if (!files[id]) throw new Error('Você não tem permissão para acessar o documento ' + id + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'); return files[id]; } },
    Utilities: { formatDate: (d, tz, fmt) => '13/10/2026 às 19:40' + (/:ss/.test(fmt) ? ':05' : '') },
    HtmlService: {
      createTemplateFromFile: n => ({ evaluate: () => ({ setTitle() { return this; }, addMetaTag() { return this; }, arquivo: n }) }),
      createHtmlOutputFromFile: n => ({ getContent: () => fs.readFileSync(SRC + n + '.html', 'utf8') })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC + 'Codigo.gs', 'utf8'), ctx);
  ctx.logs = logs; ctx.erros = erros; ctx.cache = cache; ctx.aberturas = aberturas;
  return ctx;
}

const T3 = ['', 'Cadastro', 'Código', 'Nome', 'Tipo', 'Modalidade', 'Será oferecida', 'Docente(s) ministrante(s)', 'Semestre Ideal', 'Créditos Aula', 'Dia da semana', 'Horário de Início', 'Horário de Fim', 'Vagas', 'Vagas', 'Vagas', 'Vagas', 'Observações', 'Sala'];
const T3semSala = T3.slice(0, 18);
const vazias = [[], []];
//          C          D            E              F          G       H                  I    J    K               L        M
const L = (cod, nome, tipo, mod, of, doc, sem, cr, dia, ini, fim, sala) => ['', '', cod, nome, tipo, mod, of, doc, sem, cr, dia, ini, fim, '', '', '', '', '', sala == null ? '' : sala];

function gradeAtual(nome = 'Grade Horária - 1º Semestre de 2027') {
  return planilha(nome, [
    sheet('PSA', vazias.concat([T3,
      L('PSA1001', 'Disciplina Um', 'Obrigatória', 'Teórica', 'SIM', 'Docente Teste 1, Docente Teste 2', '1', '2', 'Segunda-Feira', '08:00', '10:00', 'Sala 1'),
      L('PSA1002', 'Disciplina Dois <b>', 'Eletiva', '', 'sim', 'Docente Teste 3', '3', '4', 'Terça-Feira', '14:00', '18:00:00', ''),
      L('PSA1003', 'Prática', 'Obrigatória', 'Prática', 'SIM', 'Docente', '3', '2', 'Horário Variável', '-- : --', '-- : --'),
      L('PSA1004', 'Não oferecida', 'Livre', '', 'NÃO', '', '5', '2', 'Quarta-Feira', '08:00', '10:00'),
      L('PSA1005', 'Sem horário', 'Livre', '', 'SIM', '', '5', '2', '', '', ''),
      L('PSA1006', 'Do 4º num semestre ímpar', 'Livre', '', 'SIM', 'Docente Teste 4', '4', '2', 'quarta-feira', '8:00', '10:00'),
      L('PST0391', 'Para outros cursos', '', '', 'SIM', 'Docente', '', '4', 'Quinta-Feira', '08:00', '12:00'),
      L('PSA1007', 'Fim antes do início', 'Livre', '', 'SIM', '', '5', '2', 'Quinta-Feira', '10:00', '08:00'),
      L('PSA1008', 'Sábado', 'Livre', '', 'SIM', '', '5', '2', 'Sábado', '08:00', '10:00'),
      L('', '', '', '', '', '', '', '', '', '', '')])),
    sheet('PSC', vazias.concat([T3semSala,
      L('PSC1001', 'Antiga', 'Optativas Livres', '', 'SIM', 'Docente Teste 5', '7', '2', 'Sexta-Feira', '16:00', '18:00', 'NÃO DEVE LER (sem título Sala)')])),
    sheet('Outras Unidades', vazias.concat([T3,
      L('MAE0116', 'Estatística', 'Obrigatórias', '', 'SIM', 'Docente Teste 6', '1', '4', 'Quinta-Feira', '08:00', '12:00', 'Sala MAE')])),
    sheet('Informações', [['Grade']])
  ]);
}
const indiceMestre = () => planilha('ID_INDEX', [sheet('Página1', [
  ['Chave', 'Tipo', 'Homologação', 'ID de Produção'],
  ['OUTRA', 'planilha', '', 'x'],
  ['GRADE_HORARIA_PREENCHIMENTO', 'planilha', 'h', 'ATUAL'],
  ['INDEX_GRADE_HORARIA_VERSOES_ANTERIORES', 'planilha', '', 'IDX']])]);
const indiceAnteriores = () => planilha('Índice', [sheet('Página1', [
  ['Semestre', 'ID', 'Auditoria_ID'],
  ['2025/2', 'B252', 'a'],
  ['2026/1', 'B261-velho', 'a'],
  ['2026/2', 'B262', 'a'],
  ['2026/1', 'B261', 'a'],
  ['2027/1', '', 'aud'],          // semestre atual ainda sem cópia
  ['2027/1x', 'lixo', ''],
  ['', 'sem semestre', '']])]);
function arquivos() {
  return { MESTRE: indiceMestre(), ATUAL: gradeAtual(), IDX: indiceAnteriores(),
    B261: gradeAtual('Cópia de segurança'), B262: gradeAtual('Grade Horária - 2º Semestre de 2026'), B252: gradeAtual('x') };
}
const PROPS = { ID_INDEX_SPREADSHEET_ID: 'MESTRE' };

let ok = 0, falhas = 0;
function chk(nome, cond, extra = '') { if (cond) { ok++; console.log('ok', nome); } else { falhas++; console.log('FALHA', nome, extra); } }
function lanca(fn, re) { try { fn(); return false; } catch (e) { return re.test(e.message) ? e.message : false; } }
const json = v => JSON.stringify(v);

// ---------- página ----------
{
  const c = run(PROPS, arquivos());
  chk('doGet usa GradeGrid como template', c.doGet().arquivo === 'GradeGrid');
  const tpl = fs.readFileSync(SRC + 'GradeGrid.html', 'utf8');
  const incluidos = [...tpl.matchAll(/include_\('(\w+)'\)/g)].map(m => m[1]);
  chk('todos os include_ existem', incluidos.every(n => fs.existsSync(SRC + n + '.html')), incluidos.join(','));
  chk('página não chama funções que não existem', [...tpl.matchAll(/\.(obter\w+)\(/g)].every(m => typeof c[m[1]] === 'function'));
}

// ---------- configuração ----------
{
  const c = run(PROPS, arquivos());
  const cfg = c.obterConfiguracaoGrade();
  chk('semestre atual pelo nome do arquivo', cfg.atual.semestre === '2027/1' && cfg.atual.rotulo === '2027 - 1º Semestre', json(cfg.atual));
  chk('anteriores: só com ID e formato certo, sem o atual, mais recentes primeiro',
    json(cfg.anteriores.map(a => a.semestre)) === json(['2026/2', '2026/1', '2025/2']), json(cfg.anteriores));
  chk('rótulo "Ano - Xº Semestre"', cfg.anteriores[0].rotulo === '2026 - 2º Semestre');
  chk('nenhum ID vai ao navegador', !/B26|B25|ATUAL|IDX|MESTRE/.test(json(cfg)));
}
{
  const f = arquivos(); delete f.IDX;
  const c = run(PROPS, f);
  const cfg = c.obterConfiguracaoGrade();
  chk('índice das anteriores inacessível: grade atual segue, aviso amigável', cfg.anteriores.length === 0 && /grades anteriores/.test(cfg.avisoAnteriores) && cfg.atual.semestre === '2027/1');
  chk('log sem ID', c.erros.length > 0 && c.erros.every(e => !/ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(e)), json(c.erros));
}

// ---------- grade atual ----------
{
  const c = run(PROPS, arquivos());
  const g = c.obterGrade('');
  const cods = g.disciplinas.map(d => d.codigo).sort();
  chk('grade atual: entram só as válidas', json(cods) === json(['MAE0116', 'PSA1001', 'PSA1002', 'PSA1006', 'PSC1001']), json(cods));
  chk('outros cursos (sem semestre ideal) ficam de fora', !cods.includes('PST0391'));
  chk('outras unidades para o IP entram', cods.includes('MAE0116'));
  chk('botões: ímpares + o 4º extra', json(g.semestresIdeais) === json([1, 3, 4, 5, 7, 9]), json(g.semestresIdeais));
  const d1 = g.disciplinas.find(d => d.codigo === 'PSA1001');
  chk('campos da disciplina', d1.nome === 'Disciplina Um' && d1.tipo === 'Obrigatória' && d1.docentes === 'Docente Teste 1, Docente Teste 2' && d1.semestre === 1 && d1.creditos === '2' && d1.dia === 'Segunda-Feira' && d1.inicio === '08:00' && d1.fim === '10:00' && d1.sala === 'Sala 1', json(d1));
  const d6 = g.disciplinas.find(d => d.codigo === 'PSA1006');
  chk('dia em minúsculas e hora "8:00" normalizados', d6.dia === 'Quarta-Feira' && d6.inicio === '08:00');
  chk('fim "18:00:00" vira "18:00"', g.disciplinas.find(d => d.codigo === 'PSA1002').fim === '18:00');
  const psc = g.disciplinas.find(d => d.codigo === 'PSC1001');
  chk('tipo antigo "Optativas Livres" vira "Livre"', psc.tipo === 'Livre');
  chk('aba sem título "Sala": sala vazia', psc.sala === '');
  chk('"Obrigatórias" vira "Obrigatória"', g.disciplinas.find(d => d.codigo === 'MAE0116').tipo === 'Obrigatória');
  chk('marcada como atual, com rótulo', g.atual === true && g.semestre === '2027/1' && g.rotulo === '2027 - 1º Semestre' && g.lidaEm);
  chk('nenhum ID na resposta', !/ATUAL|IDX|MESTRE|B26/.test(json(g)));
}

// ---------- grade atual sempre fresca ----------
{
  const f = arquivos();
  const c = run(PROPS, f);
  c.obterGrade('');
  // A secretaria edita a planilha: nova disciplina na PSA.
  f.ATUAL = planilha('Grade Horária - 1º Semestre de 2027', [sheet('PSA', vazias.concat([T3,
    L('PSA2000', 'Recém-incluída', 'Livre', '', 'SIM', 'Docente', '3', '2', 'Sexta-Feira', '08:00', '10:00')]))]);
  const antes = c.aberturas.length;
  const g2 = c.obterGrade('');
  const novas = c.aberturas.slice(antes);
  chk('edição na planilha aparece na leitura seguinte (sem cache do conteúdo)', g2.disciplinas.some(d => d.codigo === 'PSA2000') && !g2.disciplinas.some(d => d.codigo === 'PSA1001'), json(g2.disciplinas.map(d => d.codigo)));
  chk('leitura seguinte não reabre o ID_INDEX (referência em cache)', json(novas) === json(['ATUAL']), json(novas));
  chk('conteúdo da grade atual não vai para o cache', !Object.keys(c.cache).some(k => /^grade:.*atual/.test(k)), json(Object.keys(c.cache)));
  chk('lidaEm com segundos', /\d{2}:\d{2}:\d{2}$/.test(g2.lidaEm), g2.lidaEm);
  const c2 = run(PROPS, arquivos());
  c2.obterGrade('2026/2'); const a2 = c2.aberturas.length; c2.obterGrade('2026/2');
  chk('grade anterior continua em cache', c2.aberturas.length === a2);
}

// ---------- grade anterior ----------
{
  const c = run(PROPS, arquivos());
  const g = c.obterGrade('2026/2');
  chk('anterior: semestre do índice, não do nome', g.semestre === '2026/2' && g.atual === false && g.rotulo === '2026 - 2º Semestre');
  chk('anterior: botões pares + extras com aula', json(g.semestresIdeais) === json([1, 2, 3, 4, 6, 7, 8, 10]), json(g.semestresIdeais));
  chk('semestre repetido no índice: vale a última linha', run(PROPS, arquivos(), { semCache: true }).obterGrade('2026/1') && (() => { const c2 = run(PROPS, arquivos(), { semCache: true }); c2.obterGrade('2026/1'); return c2.aberturas.includes('B261') && !c2.aberturas.includes('B261-velho'); })());
  chk('semestre fora do índice recusado', lanca(() => c.obterGrade('2019/1'), /Não encontrei a grade de 2019 - 1º Semestre/));
  chk('formato inválido recusado sem abrir nada', (() => { const c2 = run(PROPS, arquivos()); const r = lanca(() => c2.obterGrade('B262'), /Semestre inválido/); return r && c2.aberturas.length === 0; })());
}

// ---------- sem semestre no nome ----------
{
  const f = arquivos(); f.ATUAL = gradeAtual('Grade sem semestre no nome');
  const g = run(PROPS, f).obterGrade('');
  chk('nome sem semestre: só botões com aula', g.semestre === null && json(g.semestresIdeais) === json([1, 3, 4, 7]), json(g.semestresIdeais));
}

// ---------- configuração ausente / erros ----------
{
  chk('sem propriedade: mensagem amigável', lanca(() => run({}, arquivos()).obterGrade(''), /ainda não foi configurada/));
  const f = arquivos(); delete f.ATUAL;
  const c = run(PROPS, f);
  chk('planilha atual sem acesso: mensagem sem ID', lanca(() => c.obterGrade(''), /^Não foi possível abrir a grade atual\./));
  const f2 = arquivos(); f2.MESTRE = planilha('ID', [sheet('Página1', [['Chave', 'ID de Produção'], ['GRADE_HORARIA_PREENCHIMENTO', '']])]);
  chk('chave sem ID de Produção', lanca(() => run(PROPS, f2).obterGrade(''), /sem ID de Produção/));
  const f3 = arquivos(); f3.MESTRE = planilha('ID', [sheet('Página1', [['Key', 'Id'], ['x', 'y']])]);
  chk('índice sem colunas certas', lanca(() => run(PROPS, f3).obterGrade(''), /"Chave" e "ID de Produção"/));
}

// ---------- diagnóstico ----------
{
  const c = run(PROPS, arquivos());
  c.obterGrade('');
  c.diagnosticarGradeVisual();
  const tudo = c.logs.join('\n');
  chk('diagnóstico lista abas, contagem e anteriores', /aba PSA: ok/.test(tudo) && /aba PSE: AUSENTE/.test(tudo) && /disciplinas na grade visual: 5/.test(tudo) && /2026\/2, 2026\/1, 2025\/2/.test(tudo), tudo);
  chk('diagnóstico sem IDs', !/MESTRE|ATUAL|IDX|B26/.test(tudo));
  chk('diagnóstico limpa o cache da referência à grade atual', !Object.keys(c.cache).some(k => /atual|anteriores/i.test(k)), json(Object.keys(c.cache)));
}

// ---------- fonte sem IDs reais ----------
{
  const fonte = fs.readdirSync(SRC).map(n => fs.readFileSync(SRC + n, 'utf8')).join('\n');
  chk('nenhum ID de planilha do Google na fonte', !/[A-Za-z0-9_-]{40,}/.test(fonte.replace(/data:image[^"')]+/g, '')));
}

console.log(`\n${ok} ok · ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
