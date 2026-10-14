// Testes da contagem de créditos sem navegador: leitura das Regras
// Curriculares (ContagemCreditos.gs, com planilhas simuladas) e a conta
// (PainelContagemMotor.html), executados no Node. Dados 100% fictícios.
// Uso: node testar_contagem.js
const fs = require('fs');
const vm = require('vm');
const { carregarCodigo, SRC } = require('./pagina.js');
const D = require('./dados_ficticios.js');

let ok = 0, falha = 0;
function chk(nome, cond, extra) {
  if (cond) { ok++; console.log('ok', nome); } else { falha++; console.log('FALHA', nome, extra === undefined ? '' : JSON.stringify(extra)); }
}

/*---------------- Backend ----------------*/

const c = carregarCodigo({ planilhas: D.PLANILHAS, propriedades: D.PROPRIEDADES });
const r = vm.runInContext('obterCurriculosContagem()', c);
const ids = r.curriculos.map(x => x.id);
chk('só currículos ATIVOS', JSON.stringify(ids) === JSON.stringify(['RS-A-V2', 'RS-A2-V1', 'RS-B-V1', 'RS-C-V1']), ids);
const texto = JSON.stringify(r);
chk('observação interna não vaza', !texto.includes('NOTA INTERNA'));
chk('IDs de planilha não vazam', !/ID-REGRAS|ID-INDEX|ID-PERIODOS/.test(texto));
const A = r.curriculos[0];
chk('requisito inativo fica de fora', A.requisitos.map(q => q.id).join() === 'R1,R2,R3,R4', A.requisitos.map(q => q.id));
chk('tipos de crédito classificados', A.requisitos.map(q => q.tipoCredito).join() === 'OBRIGATORIA,ELETIVA,LIVRE,OUTRO');
chk('operador GTE vira >=', A.requisitos.every(q => q.operador === '>='));
chk('rótulo vem do DICIONARIO', A.requisitos[0].rotulo === 'Créditos obrigatórios');
chk('disciplinas obrigatórias ativas', A.disciplinas.map(d => d.sigla).join() === 'TST0001,TST0002');
chk('grupos com suas disciplinas', A.grupos.length === 2 && A.grupos.find(g => g.id === 'G1').disciplinas.length === 3);
chk('compensação SIM/NAO/vazio', r.curriculos.map(x => x.excedenteEletivasCompensaLivres).join('|') === 'SIM|NAO|NAO|');
chk('operador desconhecido fica sem conta', r.curriculos[3].requisitos.find(q => q.id === 'R10').operador === '');
chk('semestres', A.semestresMinimos === 8 && A.semestresMaximos === 14);

// cache: segunda chamada não lê a planilha
c.SpreadsheetApp.openById = () => { throw new Error('não deveria ler'); };
chk('segunda chamada usa o cache', vm.runInContext('obterCurriculosContagem()', c).curriculos.length === 4);

// interpretação de operadores
const op = (cod, rot) => vm.runInContext(`interpretarOperador_(${JSON.stringify(cod)}, ${JSON.stringify(rot)})`, c);
chk('operadores reconhecidos', [op('>=', ''), op('MAIOR_IGUAL', ''), op('X', 'Maior ou igual'), op('GT', ''), op('=', ''), op('LTE', ''), op('<', '')].join() === '>=,>=,>=,>,=,<=,<');
const cl = (a, b, d) => vm.runInContext(`classificarCriterio_(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${JSON.stringify(d)})`, c);
chk('classificação de critérios', [cl('CRED_ELET', '', 'Créditos eletivos'), cl('CH_ESTAGIO', '', 'Estágio'), cl('CREDITOS_TOTAIS', '', 'Créditos totais'), cl('X', 'creditos_livres', '')].join() === 'ELETIVA,OUTRO,OUTRO,LIVRE');

// sem a chave no índice: erro claro
const semChave = JSON.parse(JSON.stringify(D.PLANILHAS));
semChave['ID-INDEX-FICTICIO']['Página1'].pop();
const c2 = carregarCodigo({ planilhas: semChave, propriedades: D.PROPRIEDADES });
let erro = '';
try { vm.runInContext('obterCurriculosContagem()', c2); } catch (e) { erro = e.message; }
chk('sem REGRAS_CURRICULARES no índice: erro claro', erro === 'A chave REGRAS_CURRICULARES não foi encontrada na planilha ID_INDEX.', erro);
chk('PERIODOS continua funcionando', vm.runInContext('obterIdPeriodos_()', c2) === 'ID-PERIODOS-FICTICIO');

// coluna ausente
const semColuna = JSON.parse(JSON.stringify(D.PLANILHAS));
semColuna['ID-REGRAS-FICTICIO'].CURRICULOS[0][8] = 'situacao';
const c3 = carregarCodigo({ planilhas: semColuna, propriedades: D.PROPRIEDADES });
erro = '';
try { vm.runInContext('obterCurriculosContagem()', c3); } catch (e) { erro = e.message; }
chk('coluna ausente: erro claro', /não tem a coluna "status"/.test(erro), erro);

/*---------------- Motor ----------------*/

const motorHtml = fs.readFileSync(SRC + 'PainelContagemMotor.html', 'utf8');
const m = vm.createContext({});
vm.runInContext(motorHtml.replace(/<\/?script>/g, ''), m);
const calc = (cur, ent, op) => m.calcularContagemCreditos(cur, ent, op);
const req = (vals) => ({ requisitos: vals });
const B = r.curriculos[2], C = r.curriculos[3];

// Curriculo A (compensa SIM): eletivas 20 (sobra 5) cobrem livres 44 (falta 3)
let x = calc(A, { requisitos: { R1: '138', R2: '20', R3: '44', R4: '500' }, disciplinas: { TST0001: true, TST0002: true, TST0010: true, TST0011: true }, grupos: { G2: '8' } });
chk('A: eletivas a mais completam livres', x.requisitos[2].situacao === 'OK_COMPENSADO' && x.requisitos[2].compensado === 3, x.requisitos[2]);
chk('A: tudo cumprido', x.situacao === 'CUMPRIDO' && x.pendentes === 0, x.situacao);
x = calc(A, { requisitos: { R1: '138', R2: '20', R3: '40', R4: '500' }, disciplinas: { TST0001: true, TST0002: true, TST0010: true, TST0011: true }, grupos: { G2: '8' } });
chk('A: sobra insuficiente deixa falta', x.requisitos[2].situacao === 'FALTA' && x.requisitos[2].falta === 2 && x.pendentes === 1, x.requisitos[2]);
chk('A: obrigatórias a mais não compensam (modo currículo)', calc(A, req({ R1: '150', R2: '15', R3: '40', R4: '500' })).requisitos[2].falta === 7);

// Curriculo B (NAO): sem compensação
x = calc(B, req({ R6: '30', R7: '5' }));
chk('B: NÃO não compensa', x.requisitos[1].falta === 5 && x.situacao === 'FALTA');

// Curriculo C (vazio): aviso e sem compensação; operador desconhecido sem conta
x = calc(C, req({ R8: '15', R9: '5', R10: '60' }));
chk('C: vazio não compensa e avisa', x.requisitos[1].falta === 5 && x.avisos.length === 1);
chk('C: operador desconhecido fica SEM_CONTA', x.requisitos[2].situacao === 'SEM_CONTA' && x.semConta === 1);

// Campo em branco
x = calc(A, req({}));
chk('em branco conta como zero (padrão)', x.requisitos[0].informado === 0 && x.requisitos[0].falta === 138);
x = calc(A, req({}), { vazioComoZero: false });
chk('em branco sem zero: NAO_INFORMADO', x.requisitos[0].situacao === 'NAO_INFORMADO' && x.naoInformados === 5, x.naoInformados);
chk('vírgula decimal aceita', calc(A, req({ R4: '499,5' })).requisitos[3].falta === 0.5);

// Modo planilha antiga: mesmas contas do Excel do site
const planilha = (o, e, l) => {
  const cur = { requisitos: A.requisitos.slice(0, 3), disciplinas: [], grupos: [], excedenteEletivasCompensaLivres: 'NAO' };
  const y = calc(cur, req({ R1: o, R2: e, R3: l }), { compensacao: 'PLANILHA' });
  return y.requisitos.map(q => q.falta);
};
// Excel: B12/C12/D12 negativos = falta
chk('planilha: obrigatórias a mais cobrem eletivas', planilha(148, 5, 47).join() === '0,0,0');
chk('planilha: livres a mais cobrem eletivas', planilha(138, 10, 52).join() === '0,0,0');
chk('planilha: sobra cobre livres', planilha(140, 18, 42).join() === '0,0,0');
chk('planilha: falta parcial', planilha(140, 10, 40).join() === '0,3,7', planilha(140, 10, 40));
chk('planilha: obrigatórias nunca recebem', planilha(130, 30, 60).join() === '8,0,0');
x = calc(A, req({ R1: '138', R2: '0', R3: '0' }), { compensacao: 'NENHUMA' });
chk('modo nenhuma', x.requisitos[1].falta === 15 && x.requisitos[2].falta === 47);

// Grupos
x = calc(A, { requisitos: {}, disciplinas: { TST0010: true }, grupos: { G2: '3' } });
const g1 = x.grupos.find(g => g.id === 'G1'), g2 = x.grupos.find(g => g.id === 'G2');
chk('MIN_COUNT conta marcadas', g1.informado === 1 && g1.falta === 1);
chk('MIN_CREDITS usa o número informado', g2.falta === 5);

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
