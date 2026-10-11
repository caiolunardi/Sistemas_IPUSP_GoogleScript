// Apoio aos testes: abre (pede ao servidor) as páginas da lista de
// revisão de uma prévia, como o painel faz ao navegar, e devolve TODOS
// os itens (página 1 vem na própria prévia).
'use strict';
function abrirPaginasRevisao(amb, previa, ate) {
  const r = previa.revisao;
  if (!r || !r.total) return [];
  const itens = r.itens.slice();
  const ultima = Math.min(ate || r.paginas, r.paginas);
  for (let p = 2; p <= ultima; p++) {
    const res = amb.ctx.obterPaginaRevisao(previa.operacao, p);
    if (!res.ok) throw new Error('página ' + p + ' da revisão: ' + res.codigo + ' ' + res.erro);
    itens.push(...res.dados.itens);
  }
  return itens;
}
module.exports = { abrirPaginasRevisao };
