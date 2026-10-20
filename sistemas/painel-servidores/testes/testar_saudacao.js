// Testes da saudação do Painel dos servidores (SaudacaoPainel.gs), sem
// Google: cadastros de servidores e docentes fictícios (nenhum nome ou
// e-mail real). Uso: node testar_saudacao.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');

let ok = 0, fail = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { fail++; console.log('FALHA', n, extra); } };

const SERVIDORES = [
  ['E-MAIL', 'NOME', 'Setor', 'N.USP', 'TIPO', 'ID da Pasta', 'eMail Secundario'],
  ['servidora@exemplo.usp.br', 'MARIA FICTÍCIA DA SILVA', 'Serviço Fictício', '1', 'SERVIDOR', '', 'maria.outra@exemplo.usp.br'],
  ['Setor@Exemplo.USP.br', 'SERVIÇO DE GRADUAÇÃO FICTÍCIO', 'Serviço de Graduação Fictício', '', 'SETOR', '', ''],
  ['semnome@exemplo.usp.br', '', 'Seção Fictícia', '', '', '', ''],
  ['duplo@exemplo.usp.br', 'Joana Fictícia', 'Seção Fictícia', '', 'SERVIDOR', '', ''],
  ['comtag@exemplo.usp.br', '<script>x</script>', 'Seção Fictícia', '', 'SERVIDOR', '', '']
];
const DOCENTES = [
  ['N. USP', 'NOME', 'M / F', 'E-mail', 'TRATAMENTO', 'ID da Pasta', 'eMail Secundario'],
  ['2', 'Ana Fictícia Souza', 'F', 'docente.f@exemplo.usp.br', '', '', ''],
  ['3', 'PEDRO FICTÍCIO', 'M', 'docente.m@exemplo.usp.br', '', '', ''],
  ['4', 'Lia Fictícia', '', 'docente.sem@exemplo.usp.br', '', '', ''],
  ['5', 'Outra Pessoa', 'F', 'duplo@exemplo.usp.br', '', '', 'maria.outra@exemplo.usp.br']
];

function cenario({ email, servidores = SERVIDORES, docentes = DOCENTES, indice } = {}) {
  const logs = [], cache = {}, aberturas = { n: 0 };
  const planilha = valores => ({ getSheets: () => [{ getDataRange: () => ({ getDisplayValues: () => valores }) }] });
  const planilhas = {
    INDICE: planilha(indice || [['Chave', 'ID de Produção'], ['SERVIDORES', 'SERV'], ['PLANILHA_DOCENTES', 'DOC']]),
    SERV: servidores && planilha(servidores),
    DOC: docentes && planilha(docentes)
  };
  const ctx = {
    console: { log: m => logs.push(String(m)), warn: m => logs.push(String(m)), error: m => logs.push(String(m)) },
    JSON,
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'ID_INDEX_SPREADSHEET_ID' ? 'INDICE' : null) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    SpreadsheetApp: { openById: id => { if (id !== 'INDICE') aberturas.n++; if (!planilhas[id]) throw new Error('arquivo indisponível'); return planilhas[id]; } }
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8');
  vm.runInContext(code.match(/function normalizarSemAcento_[\s\S]*?\n\}/)[0], ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'AcessoPainel.gs'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'SaudacaoPainel.gs'), 'utf8'), ctx);
  return { ctx, logs, aberturas };
}
const nome = (email, opcoes) => JSON.parse(cenario(Object.assign({ email }, opcoes)).ctx.saudacaoParaPagina_());

chk('servidor: primeiro nome, maiúsculas viram "Maria"', nome('servidora@exemplo.usp.br') === 'Maria');
chk('setor: nome inteiro, com "de" minúsculo', nome('setor@exemplo.usp.br') === 'Serviço de Graduação Fictício', nome('setor@exemplo.usp.br'));
chk('servidor sem NOME: nome do setor', nome('semnome@exemplo.usp.br') === 'Seção Fictícia', nome('semnome@exemplo.usp.br'));
chk('docente F: Profª. + primeiro nome', nome('docente.f@exemplo.usp.br') === 'Profª. Ana');
chk('docente M em maiúsculas: Prof. Pedro', nome('docente.m@exemplo.usp.br') === 'Prof. Pedro');
chk('docente sem M / F: só o primeiro nome', nome('docente.sem@exemplo.usp.br') === 'Lia');
chk('e-mail nos dois cadastros: vale servidores', nome('duplo@exemplo.usp.br') === 'Joana');
chk('e-mail secundário encontra a pessoa', nome('maria.outra@exemplo.usp.br') === 'Maria');
chk('e-mail com maiúsculas e espaços', nome(' Docente.F@Exemplo.USP.br ') === 'Profª. Ana');
chk('fora dos cadastros: sem nome', nome('ninguem@exemplo.usp.br') === '');
chk('sem conta identificada: sem nome', nome('') === '');
{
  const saida = cenario({ email: 'comtag@exemplo.usp.br' }).ctx.saudacaoParaPagina_();
  chk('"<" escapado para o script da página', saida.indexOf('<') === -1 && JSON.parse(saida) === '<script>x</script>', saida);
}
{
  const { ctx, logs } = cenario({ email: 'servidora@exemplo.usp.br', docentes: null });
  chk('cadastro de docentes indisponível: servidores continuam', JSON.parse(ctx.saudacaoParaPagina_()) === 'Maria');
  chk('falha registrada sem e-mail nem nome', logs.length === 1 && !/@|Maria/.test(logs[0]), logs.join(' | '));
}
{
  const { ctx, logs } = cenario({ email: 'docente.f@exemplo.usp.br', indice: [['Nome', 'Valor']] });
  chk('ID_INDEX sem as colunas: página abre sem nome', JSON.parse(ctx.saudacaoParaPagina_()) === '');
  chk('motivo no log, sem e-mail', logs.length >= 1 && logs.every(l => !/@/.test(l)), logs.join(' | '));
}
{
  const { ctx } = cenario({ email: 'docente.f@exemplo.usp.br', docentes: [['N. USP', 'Nome completo', 'Contato']] });
  chk('docentes sem colunas de e-mail/NOME: ignorado', JSON.parse(ctx.saudacaoParaPagina_()) === '');
}
{
  const { ctx, aberturas } = cenario({ email: 'servidora@exemplo.usp.br' });
  ctx.saudacaoParaPagina_(); ctx.saudacaoParaPagina_();
  chk('nomes em cache: cada cadastro é aberto uma vez', aberturas.n === 2, String(aberturas.n));
}

console.log(`\n${ok} ok, ${fail} falha(s).`);
process.exit(fail ? 1 : 0);
