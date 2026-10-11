// Reprodução dos três achados da auditoria da 1.1.0, sem asserções:
// imprime FATOS observados, para comparar "antes" (fonte 1.1.0) e
// "depois" (fonte atual) com o MESMO roteiro.
// Uso: DIR_SRC=<pasta src> node reproduzir_auditoria.js <csv> <paginas_ocr.json>
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const [csvPath, paginasJson] = process.argv.slice(2);
const L = carregar();
const limpar = (pac) => { const c = JSON.parse(JSON.stringify(pac)); if (c.conferencia) { delete c.conferencia.itens; delete c.conferencia.linhasNaoReconhecidas; } return c; };
const csv = limpar(L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv'));
const pdf = limpar(L.LeitorPdfJupiter.analisar(JSON.parse(fs.readFileSync(paginasJson, 'utf8')).paginas, { modo: 'ocr', arquivo: 'grade_curricular.pdf' }));
const clone = (x) => JSON.parse(JSON.stringify(x));
const meta = (amb, k) => { const m = amb.estrutura().getDeveloperMetadata().find((x) => x.getKey() === k); return m ? JSON.parse(m.getValue()) : null; };

function novo() { const a = criarAmbiente({ dirSrc: DIR_SRC }); a.ctx.obterDadosPainel(); return a; }
function importar(amb, pac, revisao) {
  const p = amb.ctx.prepararImportacao(pac);
  if (!p.ok) return { prev: p };
  const r = amb.ctx.confirmarImportacao(pac, p.dados.assinatura, { operacao: p.dados.operacao, revisaoPdf: revisao === undefined ? true : revisao, previa: p.dados.impressao });
  return { prev: p, res: r };
}
function abasVisiveis(amb) {
  const m = meta(amb, 'estruturaCurricular.ativa');
  return ['Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos'].map((n) => {
    const s = amb.estrutura().getSheetByName(n);
    const ativa = amb.estrutura().getSheets().find((x) => x.getSheetId() === m.abas[n]);
    return n + ': visível id=' + (s ? s.getSheetId() : '—') + (s && s.isSheetHidden() ? ' (OCULTA)' : '') + ' | manifesto id=' + m.abas[n] + ' "' + (ativa ? ativa.getName() : 'APAGADA') + '"' + (ativa && ativa.isSheetHidden() ? ' (oculta)' : '') + (s && s.getSheetId() === m.abas[n] ? ' OK' : ' DIVERGE');
  });
}
function nomePSC1322Visivel(amb) {
  const s = amb.estrutura().getSheetByName('Disciplinas');
  const v = s.getRange(1, 1, s.getLastRow(), 3).getValues();
  const l = v.find((x) => x[0] === 'PSC1322');
  return l ? l[1] : null;
}

console.log('Fonte: ' + DIR_SRC);
console.log('\n### ACHADO 1 — falha em setName depois da ativação');
{
  const amb = novo();
  importar(amb, clone(csv));
  const alt = clone(csv); alt.disciplinas.find((d) => d.codigo === 'PSC1322').nome = 'Introdução à Psicopatologia (nova ementa)';
  let armado = false;
  amb.injetarFalha((e) => { if (e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') { armado = true; return false; } return armado && e.tipo === 'setName'; }, 1);
  const r = importar(amb, alt);
  console.log('confirmarImportacao: ok=' + r.res.ok + ' pendencias=' + JSON.stringify(r.res.dados && r.res.dados.pendencias) + ' planilhaDesatualizada=' + JSON.stringify(r.res.dados && r.res.dados.planilhaDesatualizada));
  console.log('manifesto.versaoBase=' + meta(amb, 'estruturaCurricular.ativa').versaoBase + ' diário presente=' + !!meta(amb, 'estruturaCurricular.gravacao'));
  abasVisiveis(amb).forEach((l) => console.log('  ' + l));
  console.log('nome de PSC1322 na aba visível "Disciplinas": ' + nomePSC1322Visivel(amb));
  amb.limparFalhas();
  const amb2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb });
  const d = amb2.ctx.obterDadosPainel();
  console.log('reinício + obterDadosPainel (admin): ok=' + d.ok + ' versão no painel=' + (d.ok && d.dados.base.versao) + ' nome no painel=' + (d.ok && d.dados.base.disciplinas.find((x) => x.codigo === 'PSC1322').nome) + ' gravacao=' + JSON.stringify(d.ok && d.dados.gravacao));
  abasVisiveis(amb2).forEach((l) => console.log('  ' + l));
  console.log('nome de PSC1322 na aba visível "Disciplinas": ' + nomePSC1322Visivel(amb2));
}

console.log('\n### ACHADO 2 — revisão humana com 1.102 valores (pacote sintético de 551 disciplinas)');
{
  const par = parSintetico(pdf, 551);
  const amb = novo();
  const a = importar(amb, par.csv);
  console.log('CSV sintético: ok=' + (a.res && a.res.ok) + (a.res && !a.res.ok ? ' ' + a.res.erro : '') + (a.prev && !a.prev.ok ? ' prévia: ' + a.prev.erro : ''));
  const p = amb.ctx.prepararImportacao(par.pdfOcr);
  if (!p.ok) console.log('prévia falhou: ' + p.erro);
  else {
    const rv = p.dados.revisao;
    console.log('prévia: podeGravar=' + p.dados.podeGravar + ' revisao.total=' + rv.total + ' itens enviados nesta resposta=' + rv.itens.length + (rv.paginas ? ' páginas=' + rv.paginas + ' (tamanho ' + rv.tamanhoPagina + ')' : ' (sem paginação)'));
    const r = amb.ctx.confirmarImportacao(par.pdfOcr, p.dados.assinatura, { operacao: p.dados.operacao, revisaoPdf: true, previa: p.dados.impressao });
    console.log('confirmar com a caixa marcada, sem abrir as demais páginas: ok=' + r.ok + (r.ok ? ' (GRAVOU)' : ' codigo=' + r.codigo + ' — ' + r.erro));
    if (r.ok) {
      const d = amb.ctx.obterDadosPainel().dados;
      console.log('EXT gravados na base (valores não nulos): ' + d.base.disciplinas.filter((x) => x.ext !== '' && x.ext !== null && x.ext !== undefined).length);
    }
  }
}

console.log('\n### ACHADO 3 — duas importações intercaladas entre o manifesto e lerBase_');
{
  const amb = novo();
  importar(amb, clone(csv));
  const alt = (nome) => { const x = clone(csv); x.disciplinas.find((d) => d.codigo === 'PSC1322').nome = nome; return x; };
  const original = amb.ctx.lerBase_;
  let disparou = false;
  amb.ctx.lerBase_ = function (ss, m) {
    if (!disparou) {
      disparou = true;
      // As duas importações são feitas pelo administrador, "em outra execução".
      const quem = amb.opcoes.usuario;
      amb.trocarUsuario('dono@unidade.example');
      const r1 = importar(amb, alt('Nome v2')).res;
      const r2 = importar(amb, alt('Nome v3')).res;
      amb.trocarUsuario(quem);
      console.log('intercaladas: v2 ok=' + r1.ok + ' v3 ok=' + r2.ok);
    }
    return original.apply(this, arguments);
  };
  amb.trocarUsuario('leitor@unidade.example');
  amb.permitir('leitor@unidade.example', 'LEITOR');
  const d = amb.ctx.obterDadosPainel();
  console.log('obterDadosPainel: ok=' + d.ok + (d.ok ? ' versão=' + d.dados.base.versao + ' importação=' + d.dados.base.importacao + ' nome PSC1322=' + d.dados.base.disciplinas.find((x) => x.codigo === 'PSC1322').nome + ' última no histórico=' + (d.dados.importacoes[0] && d.dados.importacoes[0].id) : ' codigo=' + d.codigo + ' — ' + d.erro));
  amb.ctx.lerBase_ = original;
  const m = meta(amb, 'estruturaCurricular.ativa');
  console.log('manifesto depois: versaoBase=' + m.versaoBase + ' importacao=' + m.importacao);
}
