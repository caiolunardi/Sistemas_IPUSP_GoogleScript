// Testes do painel "Auditoria da grade" (1.7.0): servidor (obterAuditoriaGrade
// no simulador) e interface (Chromium real), com a planilha das secretarias
// FICTÍCIA do simulador, edições simuladas pelo acionador da auditoria e
// permissões pela planilha PERMISSOES_DE_ACESSO (aba ESTRUTURA_CURRICULAR).
// Uso: node testar_painel_auditoria.js <grade_curricular.csv> <disciplinas_unidade.csv> [--evidencias arquivo]
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');

const [csvPath, unidadePath] = process.argv.slice(2);
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_painel_auditoria.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r.ok) throw new Error(r.codigo + ': ' + r.erro); return r.dados; }

const L = carregar();
const csvBase = L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const textoUnidade = L.LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(unidadePath))).texto;
const GRUPOS = ['PSA', 'PSC', 'PSE', 'PST', 'INTER', 'OUTRAS'];
const ADMIN = 'dono@unidade.example';
const LEITOR = 'prof.comissao@unidade.example';
const SEC_PSA = 'secretaria.psa@usp.example';
const SEC_PSE = 'secretaria.pse@usp.example';
// (1.11.0) Cadastros de pessoas (fictícios): SEC_PSA é servidora; SEC_PSE é docente (e-mail em maiúsculas no cadastro).
const ALUNO = 'aluno.ficticio@usp.example';
const INTRUSO = 'desconhecido@usp.example';
const CADASTROS = {
  servidores: [[SEC_PSA, 'Servidora Fictícia Um', 'Secretaria do PSA'], ['outra.pessoa@usp.example', 'Outra Pessoa Fictícia', 'Setor X']],
  docentes: [['  ' + SEC_PSE.toUpperCase() + ' ', 'Docente Fictícia Dois'], [SEC_PSA, 'Homônimo que não deve vencer']],
  alunos: [['principal@usp.example', 'Aluno Fictício Três', ALUNO]]
};

function contagens(amb, sem) {
  const g = amb.ctx.linhasDaGrade_(amb.ctx.contextoPreparacao_(amb.estrutura()), sem);
  const r = {}; GRUPOS.forEach((k) => { r[k] = g[k].length; }); return r;
}
// (1.8.12) O envio exige a identificação da prévia conferida: obtida na preparação do cenário,
// por um contexto de administrador sobre a mesma persistência (sem as falhas injetadas).
function comPrevia(a, semestre, ano, esperado) {
  const falhas = a.estado.falhas; a.estado.falhas = [];
  try {
    const adm = criarAmbiente({ dirSrc: DIR_SRC, reusar: a, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
    const r = typeof adm.ctx.previaEnvioGrade === 'function' ? adm.ctx.previaEnvioGrade({ semestre, ano }) : null;
    return Object.assign({ semestre, ano }, esperado ? { esperado } : {}, r && r.ok ? { assinatura: r.dados.assinatura } : {});
  } finally { a.estado.falhas = falhas; }
}
const enviar = (amb, sem, ano) => pedir(amb.ctx.enviarGradeParaPreenchimento(comPrevia(amb, sem, ano, contagens(amb, sem))));

/**
 * Base importada, grade 2027/1 enviada, auditoria ativa e algumas edições das secretarias.
 * (1.11.0) op: { cadastros (padrão CADASTROS; null = sem chaves), semChaves, aberturasExtras: [email] }.
 */
function ambiente(nEdicoesExtras, op) {
  op = op || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, agora: new Date('2026-10-04T12:00:00Z'), usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  amb.ctx.obterDadosPainel();
  const prev = amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(csvBase)));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(csvBase)), prev.dados.assinatura, { operacao: prev.dados.operacao, previa: prev.dados.impressao }));
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'u.csv', p.assinatura, p.novas.map((x) => x.codigo)));
  const d = amb.ctx.obterDadosPainel().dados;
  pedir(amb.ctx.adicionarAGrade(d.base.disciplinas.map((x) => ({ origem: 'estrutura', chave: x.codigo }))));
  amb.criarPlanilhaGrade();
  enviar(amb, '1', 2027);
  pedir(amb.ctx.ativarAuditoriaGrade());
  const g = amb.grade();
  const editar = (aba, l, c, valor, email, antes) => {
    const s = g.getSheetByName(aba);
    s.set(l, c, valor);
    amb.ctx.registrarEdicaoGrade({ range: s.getRange(l, c), source: g, user: { getEmail: () => email }, value: valor === '' ? undefined : String(valor).replace(/^'/, ''), oldValue: antes });
  };
  amb.congelarRelogio(new Date('2026-10-04T13:00:00Z'));
  editar('PSA', 4, 7, 'SIM', SEC_PSA);
  editar('PSA', 4, 8, 'Docente Fictício Um', SEC_PSA);
  editar('PSA', 4, 11, 'Terça-Feira', SEC_PSA);
  editar('PSA', 4, 12, "'08:00", SEC_PSA);
  amb.congelarRelogio(new Date('2026-10-04T14:00:00Z'));
  editar('PSA', 4, 11, 'Quarta-Feira', SEC_PSA, 'Terça-Feira');
  editar('PSE', 4, 7, 'NÃO', SEC_PSE);
  for (let i = 0; i < (nEdicoesExtras || 0); i++) editar('PSE', 5, 18, 'obs ' + i, SEC_PSE, i ? 'obs ' + (i - 1) : undefined);
  // 1.8.0: aberturas da planilha das secretarias (acionador de abertura)
  const abrir = (email) => amb.ctx.registrarAberturaGrade({ source: g, user: { getEmail: () => email } });
  [SEC_PSA, SEC_PSE, SEC_PSA, SEC_PSA].concat(op.aberturasExtras || []).forEach(abrir);
  if (op.cadastros !== null) amb.criarCadastrosPessoas(Object.assign({}, op.cadastros || CADASTROS, { semChaves: op.semChaves || [] }));
  return amb;
}

(async () => {
  console.log('\n== Servidor: obterAuditoriaGrade');
  const amb = ambiente();
  await teste('leitor (Comissão de Graduação) lê a auditoria: grade em preenchimento, edições da mais recente para a mais antiga, situação das 6 abas; sem IDs e sem link da planilha', () => {
    amb.trocarUsuario(LEITOR);
    const d = pedir(amb.ctx.obterAuditoriaGrade({}));
    igual([d.semestre, d.atual, d.nomeGrade], ['2027/1', true, 'Grade Horária - 1º semestre de 2027']);
    igual(d.semestres, [{ semestre: '2027/1', atual: true }], 'só semestres com auditoria (o 2025/2 do índice não tem)');
    const sec = d.edicoes.filter((l) => l[1] === 'Secretaria');
    igual(sec.length, 6);
    igual(sec.map((l) => [l[2], l[3], l[4], l[5], l[8], l[9], l[10]])[0], [SEC_PSE, 'PSE', 'G4', 'Será oferecida', '', 'NÃO', 'Preencheu'], 'mais recente primeiro');
    igual(sec[1].slice(4, 11), ['K4', 'Dia da semana', sec[1][6], sec[1][7], 'Terça-Feira', 'Quarta-Feira', 'Alterou']);
    verdade(d.edicoes.some((l) => l[1] === 'Sistema' && l[10] === 'Envio da grade') && d.edicoes.some((l) => l[10] === 'Auditoria ativada'), 'eventos do sistema');
    igual(d.edicoes[0][0], '04/10/2026 11:00:00', 'data como está na planilha (São Paulo)');
    igual(d.andamento.map((a) => a.aba), ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades']);
    const psa4 = d.andamento[0].disciplinas[0];
    igual([psa4[4], psa4[5], psa4[8], psa4[9]], ['SIM', 'Docente Fictício Um', 'Quarta-Feira', '08:00']);
    igual(d.andamento.map((a) => a.disciplinas.length), Object.values(contagens(amb, '1')), 'disciplinas por aba = as enviadas');
    verdade(!('linkAuditoria' in d) && !/docs\.google\.com/.test(JSON.stringify(d)), '(1.8.0) nenhum link de planilha');
    igual(d.pessoas.map((p) => [p.email, p.edicoes]), [[SEC_PSA, 5], [SEC_PSE, 1]], '(1.8.0) edições por pessoa, maior primeiro');
    igual([d.aberturas.map((p) => [p.email, p.aberturas]), d.totalAberturas], [[[SEC_PSA, 3], [SEC_PSE, 1]], 4], '(1.8.0) aberturas por pessoa');
    igual(d.aberturas[0].ultima, '04/10/2026 11:00:00');
    verdade(!/ID_[A-Z_]+/.test(JSON.stringify(d)), 'sem IDs');
    ev('[leitor] 2027/1: ' + d.edicoes.length + ' linhas (' + sec.length + ' das secretarias), 6 abas, sem IDs e sem link');
  });
  await teste('(1.8.0) nem o administrador recebe link da planilha de auditoria', () => {
    amb.trocarUsuario(ADMIN);
    const d = pedir(amb.ctx.obterAuditoriaGrade({}));
    verdade(!('linkAuditoria' in d) && !/docs\.google\.com/.test(JSON.stringify(d)));
  });
  await teste('(1.8.0) auditoria sem a aba Aberturas (criada antes da 1.8.0): aberturas = null, o resto funciona', () => {
    const a = ambiente();
    const idAud = a.indiceGrades().getSheets()[0].getRange(3, 3).getValue() || [...a.planilhas.keys()].find((k) => a.planilhas.get(k).getName().startsWith('Auditoria'));
    const aud = a.planilhas.get(idAud);
    aud.deleteSheet(aud.getSheetByName('Aberturas'));
    a.trocarUsuario(LEITOR);
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual([d.aberturas, d.totalAberturas, d.pessoas.length], [null, 0, 2]);
  });
  await teste('fora da aba de permissões → SEM_ACESSO; só leitura: nada muda nas planilhas', () => {
    const antes = JSON.stringify([...amb.planilhas.values()].map((p) => [p.getName(), p.getSheets().map((s) => [...s.cells.entries()])]));
    amb.trocarUsuario('curioso@unidade.example');
    igual(amb.ctx.obterAuditoriaGrade({}).codigo, 'SEM_ACESSO');
    amb.trocarUsuario(LEITOR);
    pedir(amb.ctx.obterAuditoriaGrade({ semestre: '2027/1' }));
    igual(JSON.stringify([...amb.planilhas.values()].map((p) => [p.getName(), p.getSheets().map((s) => [...s.cells.entries()])])), antes, 'nada gravado');
  });
  await teste('semestre que não tem auditoria → SEMESTRE_INVALIDO', () => {
    amb.trocarUsuario(LEITOR);
    igual(amb.ctx.obterAuditoriaGrade({ semestre: '2025/2' }).codigo, 'SEMESTRE_INVALIDO');
    igual(amb.ctx.obterAuditoriaGrade({ semestre: 'x' }).codigo, 'SEMESTRE_INVALIDO');
  });
  await teste('muitas edições: só as mais recentes vão ao navegador, com o total', () => {
    amb.trocarUsuario(LEITOR);
    const max = amb.ctx.PAINEL_AUDITORIA.MAX_EDICOES;
    amb.ctx.PAINEL_AUDITORIA.MAX_EDICOES = 3;
    try {
      const d = pedir(amb.ctx.obterAuditoriaGrade({}));
      igual([d.edicoes.length, d.limitadas, d.totalEdicoes > 3, d.edicoes[0][2]], [3, true, true, SEC_PSE]);
    } finally { amb.ctx.PAINEL_AUDITORIA.MAX_EDICOES = max; }
  });
  await teste('depois do envio da 2027/2: lista as duas grades; a 2027/1 aparece encerrada (sem situação das abas, com "Grade encerrada")', () => {
    amb.trocarUsuario(ADMIN);
    amb.congelarRelogio(new Date('2027-03-01T12:00:00Z'));
    enviar(amb, '2', 2027);
    amb.trocarUsuario(LEITOR);
    const atual = pedir(amb.ctx.obterAuditoriaGrade({}));
    igual(atual.semestres, [{ semestre: '2027/2', atual: true }, { semestre: '2027/1', atual: false }]);
    igual(atual.edicoes.filter((l) => l[1] === 'Secretaria').length, 0, 'auditoria nova, sem edições');
    const velha = pedir(amb.ctx.obterAuditoriaGrade({ semestre: '2027/1' }));
    igual([velha.atual, velha.andamento, velha.nomeGrade], [false, null, 'Grade Horária - 1º semestre de 2027']);
    igual(velha.edicoes[0][10], 'Grade encerrada');
    ev('[2027/2] semestres: ' + atual.semestres.map((s) => s.semestre).join(', ') + '; 2027/1 encerrada com ' + velha.edicoes.length + ' linhas');
  });
  await teste('registros sem e-mails', () => {
    const logs = amb.estado.logs.concat(amb.estado.erros).join('\n');
    verdade(!/@/.test(logs), logs.slice(0, 300));
  });

  console.log('\n== Servidor: nome de quem aparece na auditoria (1.11.0)');
  await teste('(1.11.0) servidores → docentes → alunos: nome, vínculo e setor; e-mail comparado sem maiúsculas e espaços; o primeiro cadastro vence', () => {
    const a = ambiente(0, { aberturasExtras: [ALUNO, INTRUSO] });
    a.trocarUsuario(LEITOR);
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual(d.identificacao.indisponiveis, []);
    igual(d.identificacao.pessoas[SEC_PSA], { nome: 'Servidora Fictícia Um', vinculo: 'servidor', setor: 'Secretaria do PSA' }, 'servidor (o homônimo nos docentes não vence)');
    igual(d.identificacao.pessoas[SEC_PSE], { nome: 'Docente Fictícia Dois', vinculo: 'docente', setor: '' }, 'docente, e-mail em maiúsculas e com espaços no cadastro');
    igual(d.identificacao.pessoas[ALUNO], { nome: 'Aluno Fictício Três', vinculo: 'aluno', setor: '' }, 'aluno pelo e-mail secundário (achado pelo título, depois de "ID da Pasta")');
    igual(d.identificacao.pessoas[INTRUSO], { nome: '', vinculo: 'nao_cadastrado', setor: '' }, 'fora dos três cadastros');
    verdade(!JSON.stringify(d).includes('Outra Pessoa Fictícia') && !JSON.stringify(d).includes('principal@usp.example'), 'só vão ao navegador as pessoas que aparecem na auditoria');
    verdade(!/ID_(SERVIDORES|DOCENTES|ALUNOS)_TESTE/.test(JSON.stringify(d)), 'sem IDs dos cadastros');
    ev('[nomes] ' + Object.keys(d.identificacao.pessoas).length + ' pessoas identificadas: ' + Object.values(d.identificacao.pessoas).map((p) => p.vinculo).join(', '));
  });
  await teste('(1.11.0) cadastro de alunos sem chave no ID_INDEX: só é procurado se falta alguém; quem falta fica "sem confirmação" (não "não cadastrado") e o aviso diz qual cadastro não abriu; sem e-mails nem IDs no registro', () => {
    const todos = ambiente(0, { semChaves: ['PLANILHA_ALUNOS'] });
    todos.trocarUsuario(LEITOR);
    const d1 = pedir(todos.ctx.obterAuditoriaGrade({}));
    igual([d1.identificacao.indisponiveis, Object.keys(d1.identificacao.pessoas).sort()], [[], [SEC_PSA, SEC_PSE].sort()], 'todos achados antes dos alunos: sem aviso');
    const a = ambiente(0, { semChaves: ['PLANILHA_ALUNOS'], aberturasExtras: [INTRUSO] });
    a.trocarUsuario(LEITOR);
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual(d.identificacao.indisponiveis, ['alunos']);
    verdade(!(INTRUSO in d.identificacao.pessoas), 'sem confirmação: fora do mapa');
    igual(d.identificacao.pessoas[SEC_PSA].vinculo, 'servidor');
    const logs = a.estado.logs.concat(a.estado.erros).join('\n');
    verdade(/identificarPessoas_ PLANILHA_ALUNOS/.test(logs) && !/@/.test(logs) && !/ID_[A-Z]+_TESTE/.test(logs), logs.slice(0, 300));
    // a chave volta: na próxima leitura o intruso é confirmado como não cadastrado
    a.planilhas.get('ID_INDEX_TESTE').getSheets()[0].appendRow(['PLANILHA_ALUNOS', 'spreadsheet', 'ID_ALUNOS_TESTE', '', '']);
    const d2 = pedir(a.ctx.obterAuditoriaGrade({}));
    igual([d2.identificacao.indisponiveis, d2.identificacao.pessoas[INTRUSO].vinculo], [[], 'nao_cadastrado']);
  });
  await teste('(1.11.0) sem nenhum cadastro configurado: o painel abre; todos "sem confirmação", com os três cadastros no aviso', () => {
    const a = ambiente(0, { cadastros: null });
    a.trocarUsuario(LEITOR);
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual([d.identificacao.indisponiveis, d.identificacao.pessoas], [['servidores', 'docentes', 'alunos'], {}]);
    igual(d.pessoas.length, 2, 'o resto da auditoria continua');
  });
  await teste('(1.11.0) nome em cache por 10 min: a segunda leitura não depende dos cadastros', () => {
    const a = ambiente(0);
    a.trocarUsuario(LEITOR);
    pedir(a.ctx.obterAuditoriaGrade({}));
    const idx = a.planilhas.get('ID_INDEX_TESTE').getSheets()[0];
    for (let r = 2; r <= idx.getLastRow(); r++) if (/^(SERVIDORES|PLANILHA_DOCENTES|PLANILHA_ALUNOS)$/.test(String(idx.get(r, 1)))) idx.set(r, 1, 'REMOVIDA');
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual([d.identificacao.indisponiveis, d.identificacao.pessoas[SEC_PSE].nome], [[], 'Docente Fictícia Dois']);
  });
  await teste('(1.11.1) "não cadastrado" não fica em cache: setor incluído no cadastro aparece na leitura seguinte, mesmo com espaço não separável e caractere invisível colados no e-mail', () => {
    const a = ambiente(0, { aberturasExtras: [INTRUSO] });
    a.trocarUsuario(LEITOR);
    igual(pedir(a.ctx.obterAuditoriaGrade({})).identificacao.pessoas[INTRUSO].vinculo, 'nao_cadastrado');
    a.planilhas.get('ID_SERVIDORES_TESTE').getSheets()[0].appendRow(['\u200B ' + INTRUSO.toUpperCase() + '\u00A0', 'Secretaria Fictícia Nova', 'PSN']);
    igual(pedir(a.ctx.obterAuditoriaGrade({})).identificacao.pessoas[INTRUSO], { nome: 'Secretaria Fictícia Nova', vinculo: 'servidor', setor: 'PSN' });
  });
  await teste('(1.11.0) cadastro de alunos sem a coluna "eMail Secundario": busca só pela D; "ID da Pasta" (E) nunca é tratado como e-mail; o diagnóstico avisa', () => {
    const a = ambiente(0, { aberturasExtras: [ALUNO, 'principal@usp.example', 'PASTA_FICTICIA_0'] });
    const alunos = a.planilhas.get('ID_ALUNOS_TESTE').getSheets()[0];
    for (let r = 1; r <= alunos.getLastRow(); r++) alunos.set(r, 6, '');
    a.trocarUsuario(LEITOR);
    const d = pedir(a.ctx.obterAuditoriaGrade({}));
    igual([d.identificacao.pessoas[ALUNO].vinculo, d.identificacao.pessoas['principal@usp.example'].nome], ['nao_cadastrado', 'Aluno Fictício Três']);
    verdade(!('pasta_ficticia_0' in d.identificacao.pessoas), 'texto sem @ não é procurado');
    a.trocarUsuario(ADMIN);
    igual(pedir(a.ctx.diagnosticarNomesAuditoria())[2].colunaNaoEncontrada, ['eMail Secundario']);
  });
  await teste('(1.11.0) diagnosticarNomesAuditoria: títulos das colunas usadas e número de linhas, sem nomes, e-mails nem IDs', () => {
    const a = ambiente(0, { semChaves: ['PLANILHA_DOCENTES'] });
    a.trocarUsuario(ADMIN);
    const r = pedir(a.ctx.diagnosticarNomesAuditoria());
    igual(r.map((x) => [x.chave, x.aberta]), [['SERVIDORES', true], ['PLANILHA_DOCENTES', false], ['PLANILHA_ALUNOS', true]]);
    igual([r[0].titulos, r[0].linhas], [{ A: 'E-MAIL', B: 'NOME', C: 'SETOR' }, 2]);
    igual(r[2].titulos, { D: 'eMail', F: 'eMail  Secundário', B: 'Nome do Aluno' }, 'e-mail secundário pelo título (sem acento/espaços/maiúsculas), não a coluna E');
    verdade(!('colunaNaoEncontrada' in r[2]));
    const texto = JSON.stringify(r) + a.estado.logs.join('\n');
    verdade(!/@/.test(texto) && !/Fictíci/.test(texto) && !/ID_[A-Z]+_TESTE/.test(texto), texto.slice(0, 300));
    a.trocarUsuario(LEITOR);
    igual(a.ctx.diagnosticarNomesAuditoria().codigo, 'SO_ADMIN');
  });

  console.log('\n== Interface (Chromium)');
  const nav = await abrirNavegador();
  try {
    const amb2 = ambiente(60);
    amb2.trocarUsuario(LEITOR);
    const { pagina, errosPagina, chamadas } = await abrirPainel(nav, { amb: amb2, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pagina);
    await teste('leitor vê as seções "Estrutura curricular" e "Auditoria da grade"; a auditoria só é pedida ao servidor quando aberta', async () => {
      igual(await pagina.$$eval('#visoes [role="tab"]', (b) => b.map((x) => [x.textContent.trim(), x.getAttribute('aria-selected')])), [['Estrutura curricular', 'true'], ['Auditoria da grade', 'false']]);
      verdade(await pagina.isHidden('#etapas'), 'sem etapas para o leitor');
      verdade(!chamadas.includes('obterAuditoriaGrade'), 'não pediu ainda');
      await pagina.click('#visao-auditoria');
      await pagina.waitForSelector('.auditoriaAba');
      verdade(await pagina.isHidden('#visaoEstrutura'), 'estrutura escondida');
      igual(chamadas.filter((c) => c === 'obterAuditoriaGrade').length, 1);
    });
    await teste('cartões por aba com as contagens; tabela da aba escolhida com a situação e a última edição', async () => {
      const psa = await pagina.textContent('[data-aud-aba="PSA"]');
      verdade(/PSA/.test(psa) && /Será oferecida\s*1 de \d+/.test(psa) && /Docente\s*1 de/.test(psa) && /Dia e horário\s*1 de/.test(psa), psa);
      igual(await pagina.getAttribute('[data-aud-aba="PSA"]', 'aria-pressed'), 'true');
      const primeira = await pagina.textContent('#audTabelaAba tbody tr');
      verdade(/SIM/.test(primeira) && /Docente Fictício Um/.test(primeira) && /Quarta-Feira/.test(primeira) && /08:00/.test(primeira) && new RegExp(SEC_PSA).test(primeira), primeira);
      // (1.11.0) última edição: nome em destaque, setor · e-mail e a data embaixo
      igual(await pagina.$$eval('#audTabelaAba tbody tr:first-child td[data-rotulo="Última edição"] .pessoaAud > span', (t) => t.map((x) => x.textContent)),
        ['Servidora Fictícia Um', 'Secretaria do PSA · ' + SEC_PSA, '04/10/2026 11:00:00']);
      await pagina.click('[data-aud-aba="PSE"]');
      igual(await pagina.getAttribute('[data-aud-aba="PSE"]', 'aria-pressed'), 'true');
      verdade(/NÃO/.test(await pagina.textContent('#audTabelaAba tbody tr')), 'PSE');
    });
    await teste('(1.8.0) "Não serão oferecidas": PSE "NÃO" com "Aguardando Justificativa" (cartão, tabela da aba e lista com quem marcou)', async () => {
      verdade(/1 não será oferecida — aguardando justificativa/.test(await pagina.textContent('[data-aud-aba="PSE"]')), await pagina.textContent('[data-aud-aba="PSE"]'));
      verdade(!/aguardando/.test(await pagina.textContent('[data-aud-aba="PSA"]')), 'PSA sem aviso');
      verdade(/NÃO\s*Aguardando Justificativa/.test(await pagina.textContent('#audTabelaAba tbody tr')), 'selo na tabela da aba');
      const linhas = await pagina.$$eval('#audNaoTitulo ~ .tabelaScroll tbody tr', (t) => t.map((x) => Array.from(x.cells).map((c) => c.textContent.trim())));
      igual(linhas.length, 1);
      verdade(/^PSE\d{4}/.test(linhas[0][0]) && linhas[0][1] === 'PSE' && linhas[0][2].indexOf(SEC_PSE) >= 0 && linhas[0][2].indexOf('Docente Fictícia Dois') === 0 && /Docente · /.test(linhas[0][2]) && linhas[0][3] === 'Aguardando Justificativa', JSON.stringify(linhas));
      verdade(/\(1\)/.test(await pagina.textContent('#audNaoTitulo')));
    });
    await teste('(1.11.2) seções da auditoria: submenu no menu lateral abaixo de "Auditoria da grade", uma seção aberta por vez, contagem das não oferecidas', async () => {
      const visiveis = () => pagina.$$eval('#visaoAuditoria [role="tabpanel"]', (t) => t.filter((x) => !x.hidden).map((x) => x.id));
      verdade(await pagina.isVisible('#estruturaGrupoAuditoria') && !!(await pagina.$('#estruturaSlotAuditoria #abasAuditoria')), 'submenu no menu lateral');
      igual(await pagina.$$eval('#abasAuditoria [role="tab"]', (b) => b.map((x) => [x.textContent.trim(), x.getAttribute('aria-selected'), !!x.querySelector('.estruturaIcone svg[aria-hidden="true"]')])),
        [['Preenchimento', 'true', true], ['Panorama', 'false', true], ['Não serão oferecidas (1)', 'false', true], ['Quem abre e edita', 'false', true], ['Edições', 'false', true]], '(1.11.3) Panorama; primeira visita: nenhuma edição "nova"');
      igual(await visiveis(), ['audSecao-preenchimento']);
      for (const [aba, painel] of [['panorama', 'audSecao-panorama'], ['nao', 'audSecao-nao'], ['pessoas', 'audSecao-pessoas'], ['edicoes', 'audSecao-edicoes'], ['preenchimento', 'audSecao-preenchimento']]) {
        await pagina.click('#aud-secao-' + aba);
        igual(await visiveis(), [painel], 'só ' + painel);
        igual(await pagina.getAttribute('#aud-secao-' + aba, 'aria-selected'), 'true');
      }
      igual(chamadas.filter((c) => c === 'obterAuditoriaGrade').length, 1, 'trocar de seção não chama o servidor');
      await pagina.focus('#aud-secao-preenchimento');
      await pagina.keyboard.press('ArrowDown');
      igual([await pagina.evaluate(() => document.activeElement.id), await visiveis()], ['aud-secao-panorama', ['audSecao-panorama']], 'seta para baixo no menu lateral');
      await pagina.keyboard.press('End');
      igual(await visiveis(), ['audSecao-edicoes']);
      await pagina.keyboard.press('ArrowDown');
      igual(await visiveis(), ['audSecao-preenchimento'], 'volta ao início');
      await pagina.click('#visao-estrutura');
      verdade(await pagina.isHidden('#estruturaGrupoAuditoria'), 'submenu some na estrutura');
      await pagina.click('#visao-auditoria');
      verdade(await pagina.isVisible('#estruturaGrupoAuditoria'));
      await pagina.evaluate(() => EstruturaNavegacao.setModo('abas'));
      verdade(!!(await pagina.$('#visaoAuditoria > #abasAuditoria')) && await pagina.isHidden('#estruturaSidebar'), 'modo Abas: barra acima do conteúdo');
      await pagina.click('#aud-secao-pessoas');
      igual(await visiveis(), ['audSecao-pessoas']);
      await pagina.evaluate(() => EstruturaNavegacao.setModo('sidebar'));
      igual([await visiveis(), await pagina.getAttribute('#aud-secao-pessoas', 'aria-selected')], [['audSecao-pessoas'], 'true'], 'seção mantida ao trocar o modo');
    });
    await teste('(1.11.3) Preenchimento: "Ver as edições da aba" abre Edições filtrada pela aba e pelas secretarias', async () => {
      await pagina.click('#aud-secao-preenchimento');
      await pagina.click('[data-aud-aba="PSA"]');
      const rotulo = (await pagina.textContent('[data-aud-edicoes-aba]')).trim();
      igual(rotulo, 'Ver as 5 edições da aba PSA');
      await pagina.click('[data-aud-edicoes-aba]');
      verdade(await pagina.isVisible('#audSecao-edicoes') && await pagina.isHidden('#audSecao-preenchimento'), 'abre Edições');
      igual([await pagina.inputValue('#audFiltroAba'), await pagina.inputValue('#audFiltroOrigem')], ['PSA', 'Secretaria']);
      verdade(/^5 de/.test(await pagina.textContent('#audContagem')), await pagina.textContent('#audContagem'));
      await pagina.click('[data-aud-limpar]');
      await pagina.click('#aud-secao-preenchimento');
      await pagina.click('[data-aud-aba="PSC"]');
      verdade(await pagina.isDisabled('[data-aud-edicoes-aba]') && /Nenhuma edição na aba PSC/.test(await pagina.textContent('[data-aud-edicoes-aba]')), 'aba sem edições: botão desativado');
    });
    await teste('(1.11.3) Panorama: quatro resumos, um detalhe por vez (Mapa da semana, Ritmo, Por departamento, Sem movimento)', async () => {
      const txt = async (sel) => (await pagina.textContent(sel)).replace(/\s+/g, ' ').trim();
      await pagina.click('#aud-secao-panorama');
      igual(await pagina.$$eval('#audSecao-panorama [data-aud-panorama]', (b) => b.map((x) => [x.getAttribute('data-aud-panorama'), x.getAttribute('aria-pressed')])),
        [['semana', 'true'], ['ritmo', 'false'], ['departamentos', 'false'], ['parados', 'false']]);
      const sem = await txt('[data-aud-panorama="semana"]');
      verdade(/1 aula no mapa/.test(sem) && /Horário mais cheio: Quarta, 8h \(1 disciplina\)/.test(sem), sem);
      igual(await pagina.$$eval('#audMapaSemana thead th', (t) => t.map((x) => x.textContent.trim()).slice(1)), ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], 'sem sábado');
      await pagina.click('[data-aud-semana="qua|8"]');
      verdade(/Quarta, 8h: 1 disciplina/.test(await txt('#audSemanaDetalhe')) && /Docente Fictício Um/.test(await txt('#audSemanaDetalhe')), await txt('#audSemanaDetalhe'));
      igual(await pagina.evaluate(() => document.activeElement.getAttribute('data-aud-semana')), 'qua|8', 'foco volta à célula');
      await pagina.click('[data-aud-semana="qua|8"]');
      verdade(!(await pagina.$('#audSemanaDetalhe')), 'segundo clique esconde');
      await pagina.click('[data-aud-panorama="ritmo"]');
      igual(await pagina.evaluate(() => document.activeElement.getAttribute('data-aud-panorama')), 'ritmo', 'foco no resumo escolhido');
      verdade(!(await pagina.$('#audMapaSemana')) && !!(await pagina.$('#audRitmo')), 'só o detalhe escolhido');
      verdade(/Dia com mais edições: 04\/10 \(66 edições\)/.test(await txt('#audPanoramaDetalhe')), await txt('#audPanoramaDetalhe'));
      await pagina.click('[data-aud-panorama="departamentos"]');
      const ordem = await pagina.$$eval('#audDepartamentos .departamentos__nome', (b) => b.map((x) => x.textContent));
      igual(ordem[0], 'PSA', 'mais adiantado primeiro');
      await pagina.click('[data-aud-ir-aba="PSE"]');
      verdade(await pagina.isVisible('#audSecao-preenchimento') && await pagina.isHidden('#audSecao-panorama'), 'o departamento abre o Preenchimento');
      igual([await pagina.getAttribute('[data-aud-aba="PSE"]', 'aria-pressed'), await pagina.evaluate(() => document.activeElement.getAttribute('data-aud-aba'))], ['true', 'PSE']);
      await pagina.click('#aud-secao-panorama');
      igual(await pagina.getAttribute('[data-aud-panorama="departamentos"]', 'aria-pressed'), 'true', 'o panorama lembra o detalhe escolhido');
      const par = await txt('[data-aud-panorama="parados"]');
      const n = Number(par.match(/(\d+) disciplinas? parada/)[1]);
      await pagina.click('[data-aud-panorama="parados"]');
      const linhas = await pagina.$$eval('#audTabelaParados tbody tr', (t) => t.map((x) => x.cells[0].textContent));
      igual(linhas.length, n, 'resumo e tabela batem');
      igual(n, Object.values(contagens(amb2, '1')).reduce((a, b) => a + b, 0) - 3, 'todas menos as 3 editadas (PSA linha 4, PSE linhas 4 e 5)');
      igual(chamadas.filter((c) => c === 'obterAuditoriaGrade').length, 1, 'tudo no navegador');
    });
    await teste('(1.8.0) gráficos "Quem mais abre a planilha" e "Quem mais edita": barras do maior para o menor, valores em texto; "ver edições" filtra a lista', async () => {
      await pagina.click('#aud-secao-pessoas');
      const ab = await pagina.$$eval('#audGrafAberturas .graficoBarras__item', (t) => t.map((x) => [x.querySelector('.graficoBarras__nome').textContent, x.querySelector('.graficoBarras__quem').textContent, x.querySelector('.graficoBarras__valor').firstChild.textContent, x.querySelector('.graficoBarras__barra').style.width]));
      igual(ab, [['Servidora Fictícia Um', 'Secretaria do PSA · ' + SEC_PSA, '3', '100%'], ['Docente Fictícia Dois', 'Docente · ' + SEC_PSE, '1', '33%']], '(1.11.0) nome; embaixo, vínculo · e-mail');
      verdade(/4 aberturas/.test(await pagina.textContent('#audGrafAberturasTitulo')));
      const ed = await pagina.$$eval('#audGrafEdicoes .graficoBarras__item', (t) => t.map((x) => [x.querySelector('.graficoBarras__nome').textContent, x.querySelector('.graficoBarras__valor').firstChild.textContent]));
      igual(ed, [['Docente Fictícia Dois', '61'], ['Servidora Fictícia Um', '5']]);
      verdade(/66 edições/.test(await pagina.textContent('#audGrafEdicoesTitulo')));
      await pagina.click('[data-aud-pessoa="' + SEC_PSA + '"]');
      verdade(await pagina.isVisible('#audSecao-edicoes') && await pagina.isHidden('#audSecao-pessoas'), '(1.11.2) "ver edições" abre a seção Edições');
      verdade(/^5 de \d+ edições/.test(await pagina.textContent('#audContagem')), await pagina.textContent('#audContagem'));
      igual(await pagina.inputValue('#audFiltroPessoa'), SEC_PSA);
      igual(await pagina.$$eval('#audFiltroPessoa option', (o) => o.map((x) => x.textContent)),
        ['Todas', 'Docente Fictícia Dois (Docente · ' + SEC_PSE + ')', 'Servidora Fictícia Um (Secretaria do PSA · ' + SEC_PSA + ')'], '(1.11.0) filtro pelo nome, valor = e-mail');
    });
    await teste('edições: busca sem acento, filtros, "Mostrar mais" de 50 em 50, limpar filtros', async () => {
      await pagina.click('[data-aud-limpar]');
      const total = Number((await pagina.textContent('#audContagem')).match(/^(\d+)/)[1]);
      verdade(total >= 66, 'total ' + total);
      igual(await pagina.$$eval('#audListaEdicoes tbody tr', (t) => t.length), 50);
      await pagina.click('[data-aud-mais]');
      igual(await pagina.$$eval('#audListaEdicoes tbody tr', (t) => t.length), Math.min(100, total));
      await pagina.fill('#audBusca', 'quarta feira');
      await pagina.fill('#audBusca', 'quarta');
      verdade(/^1 de/.test(await pagina.textContent('#audContagem')), await pagina.textContent('#audContagem'));
      verdade(/Terça-Feira\s*→\s*depois: Quarta-Feira|Terça-Feira.*Quarta-Feira/.test(await pagina.textContent('#audListaEdicoes tbody tr')), 'mudança antes → depois');
      await pagina.fill('#audBusca', 'docente ficticio um');
      verdade(/^1 de/.test(await pagina.textContent('#audContagem')), 'busca sem acento');
      await pagina.fill('#audBusca', 'servidora ficticia');
      verdade(/^5 de/.test(await pagina.textContent('#audContagem')), '(1.11.0) busca pelo nome: ' + await pagina.textContent('#audContagem'));
      await pagina.fill('#audBusca', 'secretaria do psa');
      verdade(/^5 de/.test(await pagina.textContent('#audContagem')), '(1.11.0) busca pelo setor');
      igual(await pagina.$eval('#audListaEdicoes tbody tr td[data-rotulo="Quem"] .pessoaAud__nome', (x) => x.textContent), 'Servidora Fictícia Um', '(1.11.0) coluna Quem com o nome');
      await pagina.fill('#audBusca', '');
      await pagina.selectOption('#audFiltroOrigem', 'Sistema');
      verdade(/^[23] de/.test(await pagina.textContent('#audContagem')), await pagina.textContent('#audContagem'));
      await pagina.selectOption('#audFiltroOrigem', '');
      await pagina.selectOption('#audFiltroAba', 'PSA');
      verdade(/^5 de/.test(await pagina.textContent('#audContagem')), await pagina.textContent('#audContagem'));
      await pagina.click('[data-aud-limpar]');
    });
    await teste('histórico da disciplina: janela com todas as edições dela; fecha só pelo botão e devolve o foco', async () => {
      await pagina.click('#aud-secao-preenchimento');
      const cod = await pagina.$eval('#audTabelaAba [data-aud-historico]', (b) => b.getAttribute('data-aud-historico'));
      await pagina.click('[data-aud-aba="PSA"]');
      await pagina.click('#audTabelaAba tbody tr:first-child [data-aud-historico]');
      await pagina.waitForSelector('#modalHistoricoAuditoria:not([hidden])');
      verdade(/Histórico — PSA/.test(await pagina.textContent('#historicoAuditoriaTitulo')), await pagina.textContent('#historicoAuditoriaTitulo'));
      igual(await pagina.$$eval('#historicoAuditoriaCorpo tbody tr', (t) => t.length), 5);
      await pagina.keyboard.press('Escape');
      verdade(await pagina.isVisible('#modalHistoricoAuditoria'), 'ESC não fecha');
      await pagina.click('#modalHistoricoAuditoria .modal__rodape [data-fechar-historico-auditoria]');
      verdade(await pagina.isHidden('#modalHistoricoAuditoria'));
      verdade(await pagina.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-aud-historico')), 'foco volta ao botão');
      verdade(cod, 'código');
    });
    await teste('"Atualizar" busca de novo e mantém a aba, os filtros e (1.11.2) a seção aberta; teclado alterna as seções; voltar à estrutura', async () => {
      await pagina.click('#aud-secao-edicoes');
      await pagina.selectOption('#audFiltroAba', 'PSE');
      await pagina.click('#auditoriaAtualizar');
      await pagina.waitForFunction(() => /Atualizado/.test(document.getElementById('auditoriaSituacao').textContent));
      igual(chamadas.filter((c) => c === 'obterAuditoriaGrade').length, 2);
      igual(await pagina.inputValue('#audFiltroAba'), 'PSE');
      verdade(await pagina.isVisible('#audSecao-edicoes') && await pagina.isHidden('#audSecao-preenchimento'), 'seção Edições mantida');
      await pagina.focus('#visao-auditoria');
      await pagina.keyboard.press('ArrowLeft');
      verdade(await pagina.isVisible('#visaoEstrutura') && await pagina.isHidden('#visaoAuditoria'));
      igual(await pagina.evaluate(() => document.activeElement.id), 'visao-estrutura');
      verdade(await pagina.isVisible('#tabelaDisciplinas'), 'lista da estrutura de volta');
      await pagina.keyboard.press('ArrowRight');
      verdade(await pagina.isVisible('#visaoAuditoria'));
      igual(chamadas.filter((c) => c === 'obterAuditoriaGrade').length, 2, 'não busca de novo ao voltar');
    });
    await teste('(1.11.3) edições novas desde a última visita: contagem no menu, selo "Nova" nas linhas, vistas ao abrir Edições; sem armazenamento, nada quebra', async () => {
      const vistos = () => pagina.evaluate(() => JSON.parse(localStorage.getItem('estrutura-auditoria-visto') || '{}'));
      igual(Object.keys(await vistos()), ['2027/1'], 'primeira visita grava a mais recente');
      const g = amb2.grade(), s = g.getSheetByName('PSA');
      amb2.congelarRelogio(new Date('2026-10-05T15:00:00Z'));
      for (const [col, valor] of [[8, 'Docente Fictício Novo'], [18, 'obs nova']]) {
        s.set(4, col, valor);
        amb2.ctx.registrarEdicaoGrade({ range: s.getRange(4, col), source: g, user: { getEmail: () => SEC_PSA }, value: valor, oldValue: undefined });
      }
      await pagina.click('#aud-secao-preenchimento');
      await pagina.click('#auditoriaAtualizar');
      await pagina.waitForFunction(() => /\(2 novas\)/.test(document.getElementById('audContagemEdicoes').textContent));
      fs.mkdirSync(path.join(__dirname, 'saida', 'visual'), { recursive: true });
      await pagina.screenshot({ path: path.join(__dirname, 'saida', 'visual', 'light-1280-auditoria-menu-novas.png') });
      await pagina.click('#aud-secao-edicoes');
      igual(await pagina.textContent('#audContagemEdicoes'), '', 'contagem some ao abrir Edições');
      await pagina.click('[data-aud-limpar]');
      igual(await pagina.$$eval('#audListaEdicoes tbody tr.edicaoNova', (t) => t.length), 2, 'duas linhas com o selo');
      igual(await pagina.$$eval('#audListaEdicoes tbody tr.edicaoNova .seloNova', (t) => t.map((x) => x.textContent)), ['Nova', 'Nova']);
      await pagina.mouse.move(0, 0); await pagina.waitForTimeout(300);
      await pagina.screenshot({ path: path.join(__dirname, 'saida', 'visual', 'light-1280-auditoria-edicoes-novas.png') });
      igual((await vistos())['2027/1'], '2026-10-05 12:00:00', 'vista: a mais recente (horário de São Paulo)');
      await pagina.click('#auditoriaAtualizar');
      await pagina.waitForFunction(() => /Atualizado/.test(document.getElementById('auditoriaSituacao').textContent) && !document.getElementById('auditoriaAtualizar').disabled);
      igual([await pagina.textContent('#audContagemEdicoes'), await pagina.$$eval('#audListaEdicoes tbody tr.edicaoNova', (t) => t.length)], ['', 0], 'depois de vistas, nada é novo');
      // localStorage indisponível: o painel continua funcionando, só sem a contagem
      await pagina.evaluate(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
      await pagina.click('#auditoriaAtualizar');
      await pagina.waitForFunction(() => !document.getElementById('auditoriaAtualizar').disabled);
      igual(await pagina.textContent('#audContagemEdicoes'), '');
      await pagina.click('#aud-secao-preenchimento');
    });
    await teste('nenhum erro de JavaScript; sem link da planilha para o leitor', async () => {
      igual(errosPagina, []);
      igual(await pagina.$$eval('#visaoAuditoria a[href]', (x) => x.length), 0);
    });

    await teste('360, 768 e 1280 px, claro e escuro: sem rolagem horizontal (também com o histórico aberto) e contraste ≥ 4,5:1 nos textos da seção', async () => {
      const SAIDA = path.join(__dirname, 'saida', 'visual');
      fs.mkdirSync(SAIDA, { recursive: true });
      const piores = [];
      for (const tema of ['light', 'dark']) {
        for (const largura of [360, 768, 1280]) {
          const ambV = ambiente(3, { aberturasExtras: [INTRUSO] });
          ambV.trocarUsuario(LEITOR);
          const { pagina: pg, errosPagina: erros, contexto } = await abrirPainel(nav, { amb: ambV, largura, altura: 900, esquema: tema, latencia: 0 });
          await esperarCarregado(pg);
          await pg.click('#visao-auditoria');
          await pg.waitForSelector('.auditoriaAba');
          await pg.evaluate(() => { const td = document.querySelector('#audMapaSemana td'); [1, 2, 3, 4].forEach((n) => { const b = document.createElement('button'); b.className = 'mapaSemana__celula mapaSemana__celula--n' + n + ' teste-n' + n; b.textContent = '9'; td.appendChild(b); }); });
          const r = await pg.evaluate(() => {
            const cor = (c) => c.match(/\d+(\.\d+)?/g).map(Number);
            const lum = (rgb) => { const a = rgb.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
            const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const c = cor(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > 0.95) return c; } return [255, 255, 255]; };
            const razao = (el) => { const a = lum(cor(getComputedStyle(el).color)), b = lum(fundo(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
            const alvos = ['.visoes__botao[aria-selected="true"]', '.visoes__botao[aria-selected="false"]', '#auditoriaSubtitulo', '.auditoriaAba[aria-pressed="true"] .medida__rotulo', '.auditoriaAba[aria-pressed="false"] .medida__valor',
              '.auditoriaAba__total', '.tabelaAuditoria .texto-suave', '[data-aud-historico]', '.mudanca__antes', '.mudanca__depois', '#audContagem', '.linkDisciplina',
              '.auditoriaAba__nao', '.seloJustificativa', '.graficoBarras__nome', '.graficoBarras__detalhe', '.graficoBarras__valor', '.graficoBarras__acao',
              '.graficoBarras__quem', '.pessoaAud__nome', '.pessoaAud__detalhe', '.seloPessoaNaoCadastrada',
              // (1.11.3) panorama: resumos, mapa da semana (os quatro níveis) e o atalho do preenchimento
              '.cartaoAud[aria-pressed="true"] .cartaoAud__titulo', '.cartaoAud[aria-pressed="false"] .cartaoAud__titulo', '.cartaoAud__valor', '.cartaoAud__detalhe',
              '.mapaSemana th', '.mapaSemana__vazia', '.teste-n1', '.teste-n2', '.teste-n3', '.teste-n4', '[data-aud-edicoes-aba]'];
            // barra do gráfico contra o fundo do cartão: ≥ 3:1 (elemento gráfico)
            const barra = document.querySelector('.graficoBarras__barra');
            const lb = lum(cor(getComputedStyle(barra).backgroundColor)), lf = lum(fundo(barra.parentElement));
            return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, barra: Math.round((Math.max(lb, lf) + 0.05) / (Math.min(lb, lf) + 0.05) * 100) / 100,
              razoes: alvos.map((s) => { const el = document.querySelector(s); return [s, el ? Math.round(razao(el) * 100) / 100 : null]; }) };
          });
          await pg.evaluate(() => document.querySelectorAll('[class*="teste-n"]').forEach((b) => b.remove()));   // só para medir o contraste
          verdade(r.sw <= r.iw, tema + ' ' + largura + ': scrollWidth ' + r.sw + ' > ' + r.iw);
          verdade(r.barra >= 3, tema + ' barra do gráfico ' + r.barra + ':1');
          r.razoes.forEach(([sel, v]) => { verdade(v !== null, 'não achou ' + sel); piores.push([tema, largura, sel, v]); verdade(v >= 4.5, tema + ' ' + largura + ' ' + sel + ' = ' + v + ':1'); });
          await pg.screenshot({ path: path.join(SAIDA, `${tema}-${largura}-auditoria.png`), fullPage: largura === 1280 });
          // (1.11.2) cada seção, aberta pelo submenu
          for (const secao of ['panorama', 'nao', 'pessoas', 'edicoes']) {
            await pg.click('#aud-secao-' + secao);
            await pg.mouse.move(0, 0);
            await pg.waitForTimeout(450);   // fim da transição do menu e da rolagem suave até a seção
            const o = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            verdade(o <= 0, tema + ' ' + largura + ' seção ' + secao + ': rolagem horizontal ' + o);
            await pg.screenshot({ path: path.join(SAIDA, `${tema}-${largura}-auditoria-${secao}.png`), fullPage: largura === 1280 });
          }
          await pg.click('#aud-secao-preenchimento');
          await pg.click('[data-aud-historico]');
          await pg.waitForSelector('#modalHistoricoAuditoria:not([hidden])');
          const m = await pg.evaluate(() => { const p = document.querySelector('#modalHistoricoAuditoria .modal__painel'); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, painel: p.scrollWidth - p.clientWidth }; });
          verdade(m.sw <= m.iw && m.painel <= 0, tema + ' ' + largura + ' histórico: ' + JSON.stringify(m));
          await pg.screenshot({ path: path.join(SAIDA, `${tema}-${largura}-auditoria-historico.png`) });
          igual(erros, []);
          await contexto.close();
        }
      }
      piores.sort((a, b) => a[3] - b[3]);
      ev('[visual] menor contraste: ' + piores.slice(0, 3).map((p) => p.join(' ') + ':1').join(' | '));
    });
    await pagina.context().close();

    await teste('(1.11.0) pessoa fora dos cadastros: "Pessoa não cadastrada com acesso" com selo "Atenção" e o e-mail embaixo; cadastro indisponível: aviso "Nomes incompletos" e "nome não verificado"', async () => {
      const a = ambiente(0, { aberturasExtras: [INTRUSO], semChaves: ['PLANILHA_ALUNOS'] });
      a.trocarUsuario(LEITOR);
      const r = await abrirPainel(nav, { amb: a, largura: 1280, altura: 900, latencia: 0 });
      await esperarCarregado(r.pagina);
      await r.pagina.click('#visao-auditoria');
      await r.pagina.waitForSelector('.auditoriaAba');
      const aviso = await r.pagina.textContent('#auditoriaConteudo .alerta--aviso');
      verdade(/Nomes incompletos/.test(aviso) && /cadastro de alunos/.test(aviso), aviso);
      const intruso = await r.pagina.$$eval('#audGrafAberturas .graficoBarras__item', (t) => t.map((x) => [x.querySelector('.graficoBarras__nome').textContent, (x.querySelector('.graficoBarras__quem') || {}).textContent]));
      verdade(intruso.some((x) => x[0] === INTRUSO && x[1] === 'nome não verificado'), 'sem confirmação: o e-mail no lugar do nome ' + JSON.stringify(intruso));
      await r.pagina.context().close();

      const b = ambiente(0, { aberturasExtras: [INTRUSO, INTRUSO] });
      b.trocarUsuario(LEITOR);
      const r2 = await abrirPainel(nav, { amb: b, largura: 1280, altura: 900, latencia: 0 });
      await esperarCarregado(r2.pagina);
      await r2.pagina.click('#visao-auditoria');
      await r2.pagina.waitForSelector('.auditoriaAba');
      verdade(!(await r2.pagina.$('#auditoriaConteudo .alerta--aviso')), 'sem aviso com os três cadastros lidos');
      const item = await r2.pagina.$$eval('#audGrafAberturas .graficoBarras__item--naoCadastrada', (t) => t.map((x) => [x.querySelector('.graficoBarras__nome').textContent, x.querySelector('.graficoBarras__quem').textContent, x.getAttribute('title')]));
      igual(item.length, 1);
      igual(item[0].slice(0, 2), ['Pessoa não cadastrada com acesso Atenção', INTRUSO]);
      verdade(item[0][2].indexOf('Pessoa não cadastrada com acesso (' + INTRUSO + '): 2 aberturas') === 0, item[0][2]);
      igual(r2.errosPagina, []);
      await r2.pagina.context().close();
    });

    const amb3 = ambiente(0);
    const r3 = await abrirPainel(nav, { amb: amb3, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(r3.pagina);
    await teste('administrador: mesma seção, (1.8.0) sem link da planilha de auditoria; etapas continuam na estrutura', async () => {
      verdade(await r3.pagina.isVisible('#etapas'), 'etapas do admin');
      await r3.pagina.click('#visao-auditoria');
      await r3.pagina.waitForSelector('.auditoriaAba');
      igual(await r3.pagina.$$eval('#visaoAuditoria a[href]', (x) => x.length), 0, 'nenhum link');
      verdade(!/Abrir a planilha de auditoria/.test(await r3.pagina.textContent('#visaoAuditoria')));
      igual(r3.errosPagina, []);
    });
    await teste('erro do servidor: mensagem e "Tentar de novo"', async () => {
      const orig = amb3.ctx.obterAuditoriaGrade;
      amb3.ctx.obterAuditoriaGrade = () => ({ ok: false, codigo: 'AUDITORIA_INACESSIVEL', erro: 'Não foi possível abrir a planilha de auditoria de 2027/1. Avise o Serviço de Graduação.' });
      await r3.pagina.click('#auditoriaAtualizar');
      await r3.pagina.waitForSelector('[data-aud-tentar]');
      verdade(/Não foi possível abrir a planilha de auditoria/.test(await r3.pagina.textContent('#auditoriaConteudo')));
      verdade(await r3.pagina.isHidden('#abasAuditoria') && await r3.pagina.isHidden('#estruturaGrupoAuditoria') && await r3.pagina.isHidden('#audSecao-preenchimento'), '(1.11.2) sem seções enquanto a carga falha');
      amb3.ctx.obterAuditoriaGrade = orig;
      await r3.pagina.click('[data-aud-tentar]');
      await r3.pagina.waitForSelector('.auditoriaAba');
      verdade(await r3.pagina.isVisible('#estruturaGrupoAuditoria'), '(1.11.2) submenu de volta');
    });
    await r3.pagina.context().close();
  } finally {
    await nav.close();
  }

  ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: 0');
  fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
  fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})();
