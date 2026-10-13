function TESTE() {
  const resultado = listarRulesetsCurriculares();
  Logger.log("Quantidade: " + resultado.length);
  Logger.log(JSON.stringify(resultado));
}

function TESTE3() {
  const rulesets = repoListarRulesets_();
  const r = rulesets[0];
  Logger.log("ruleset: " + r.ruleset_id);
  Logger.log("tipo ultima_revisao_em: " + (typeof r.ultima_revisao_em) + " | é Date? " + (r.ultima_revisao_em instanceof Date));
};