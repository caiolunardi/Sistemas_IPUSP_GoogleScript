// Roda, fora do Google, a suíte que já vinha no projeto
// (rodarTestesHistorico, HistoricoTestes.gs) com os serviços simulados
// de simulacao.js, como uma conta ADMINISTRADOR fictícia. Serve de
// regressão do módulo de Análise de Histórico: a 4.0 não mudou nenhuma
// regra dele. As duas verificações que precisam da planilha real de
// Regras Curriculares falham aqui por desenho (também falhavam no
// projeto vinculado, fora do ambiente certo) e são as únicas aceitas.
// Uso: node sistemas/emissao-diplomas/testes/testar_historico.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const S = require('./simulacao');

const EMAIL = 'admin.ficticio@exemplo.invalid';
const PERM = 'PERMISSOES_FICTICIA_00000000001';
const amb = S.ambiente({
  usuario: EMAIL,
  propriedades: { ID_INDEX_SPREADSHEET_ID: 'INDICE_FICTICIO_0000000000001' },
  planilhas: {
    INDICE_FICTICIO_0000000000001: { 'Página1': [['Chave', 'Tipo', 'ID de Produção', 'Homologação'], ['PERMISSOES_DE_ACESSO', 'spreadsheet', PERM, '']] },
    [PERM]: { EMISSAO_DIPLOMAS: [['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'], ['', 'Admin Fictício', EMAIL, '', 'ADMINISTRADOR']] }
  }
});

const relatorio = String(S.contexto(amb).rodarTestesHistorico());
const numero = rotulo => Number((relatorio.match(new RegExp(rotulo + ':\\s*(\\d+)')) || [])[1]);
const total = numero('Total de verificações'), passou = numero('Passou'), falhou = numero('Falhou');
const falhas = relatorio.split('\n').filter(l => /^\s*\[FALHOU\]/.test(l));
const aceitas = falhas.filter(l => /Regras Curriculares/.test(l) && /(seleção de ruleset|avaliarHabilitacao_)/.test(l));

console.log(`suíte do projeto: ${total} verificações, ${passou} passaram, ${falhou} falharam (${aceitas.length} dependem da planilha real de Regras).`);
const inesperadas = falhas.filter(l => !aceitas.includes(l));
inesperadas.forEach(l => console.log('FALHA', l.trim().slice(0, 400)));
if (!(total >= 480) || passou + falhou !== total || inesperadas.length || aceitas.length > 2) {
  console.log('FALHA na suíte do projeto.');
  process.exit(1);
}
console.log('ok');
