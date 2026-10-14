/*=====================================================================
  ESQUEMA DA PLANILHA ESTRUTURA_CURRICULAR

  A planilha começa vazia. Na primeira vez que um administrador abre o
  painel, garantirEstrutura_() cria todas as abas abaixo, com cabeçalho,
  formatos, larguras e uma nota explicativa em cada coluna (passe o
  mouse sobre o título da coluna para ler).

  Abas:
    Sobre                         o que é cada aba e a última importação
    Disciplinas                   uma linha por disciplina (catálogo)
    Disciplinas por habilitação   tipo e período ideal em cada habilitação
    Requisitos                    requisitos de cada disciplina, por habilitação
    Currículos                    um currículo por habilitação + informações do PDF
    Importações                   registro de cada arquivo importado
    Alterações                    o que mudou em cada importação
    Ajustes manuais               correções feitas no painel sobre a estrutura
                                  do Júpiter (exclusão, campos, oferta) e a
                                  seleção para a grade horária (Preparacao.gs)
    Disciplinas para outros cursos disciplinas do IP ministradas para outros
                                  cursos/unidades (lista por unidade do
                                  Júpiter ou cadastro manual)

  Regras de convivência com quem mexe na planilha:
  - O sistema lê as colunas PELO TÍTULO, não pela posição: dá para
    reordenar colunas. Título apagado ou renomeado é recriado no fim.
  - As abas ficam protegidas "só com aviso": quem editar à mão recebe
    um alerta, porque a próxima importação regrava os dados.
  - Exceção: a coluna "Observações" da aba Disciplinas é livre e nunca é
    apagada pelo sistema; colunas extras que alguém criar na aba
    Disciplinas também são preservadas (por código).
  - As abas "Ajustes manuais" e "Disciplinas para outros cursos" NÃO são
    regravadas pelas importações: são mantidas pelo painel (etapas 1 a 3)
    e a importação seguinte do Júpiter não desfaz o que está nelas.
=====================================================================*/

// 2 = base com "manifesto" (versão ativa apontada por metadado; ver Gravacao.gs).
// 3 = + abas "Ajustes manuais" e "Disciplinas para outros cursos" (versão 1.3.0).
var ESQUEMA_VERSAO = 3;
var META_ESQUEMA = 'estruturaCurricular.esquema';
var META_VERSAO_BASE = 'estruturaCurricular.versaoBase';

var ABAS = {
  SOBRE: 'Sobre',
  DISCIPLINAS: 'Disciplinas',
  OFERTA: 'Disciplinas por habilitação',
  REQUISITOS: 'Requisitos',
  CURRICULOS: 'Currículos',
  IMPORTACOES: 'Importações',
  ALTERACOES: 'Alterações',
  AJUSTES: 'Ajustes manuais',
  OUTROS: 'Disciplinas para outros cursos'
};

// Ordem das abas na planilha.
// As abas da preparação da grade ficam no fim (não mudam a posição das demais).
var ORDEM_ABAS = [ABAS.SOBRE, ABAS.DISCIPLINAS, ABAS.OFERTA, ABAS.REQUISITOS, ABAS.CURRICULOS, ABAS.IMPORTACOES, ABAS.ALTERACOES, ABAS.AJUSTES, ABAS.OUTROS];

/*
 * Colunas de cada aba. Campos:
 *   chave   nome interno (usado no código e enviado ao painel)
 *   titulo  título da coluna na planilha
 *   tipo    texto | inteiro | decimal | dataHora
 *   largura em pixels
 *   nota    explicação (vira nota no cabeçalho — base para a ajuda)
 */
var COLUNAS = {};

COLUNAS[ABAS.DISCIPLINAS] = [
  { chave: 'codigo', titulo: 'Código', tipo: 'texto', largura: 90, nota: 'Código da disciplina no Júpiter. Identifica a linha: não altere.' },
  { chave: 'nome', titulo: 'Nome', tipo: 'texto', largura: 330, nota: 'Nome completo, como no CSV do Júpiter. O PDF corta nomes longos; por isso o nome do CSV tem preferência.' },
  { chave: 'departamento', titulo: 'Departamento', tipo: 'texto', largura: 120, nota: 'PSA, PSC, PSE ou PST pelo prefixo do código; "Interdepartamental" para códigos que começam com 470; "Outra unidade" para as demais.' },
  { chave: 'prefixo', titulo: 'Prefixo', tipo: 'texto', largura: 70, nota: 'Três primeiros caracteres do código (ex.: PSA, EDF, 470). Ajuda a identificar a unidade de origem.' },
  { chave: 'creditosAula', titulo: 'Créditos-aula', tipo: 'inteiro', largura: 95, nota: 'Cada crédito-aula é 1 hora de aula por semana (15 horas no semestre).' },
  { chave: 'creditosTrabalho', titulo: 'Créditos-trabalho', tipo: 'inteiro', largura: 115, nota: 'Cada crédito-trabalho equivale a 30 horas de atividades no semestre.' },
  { chave: 'creditosTotal', titulo: 'Créditos (total)', tipo: 'inteiro', largura: 100, nota: 'Créditos-aula + créditos-trabalho.' },
  { chave: 'ch', titulo: 'CH total (h)', tipo: 'inteiro', largura: 90, nota: 'Carga horária total no semestre: 15 h por crédito-aula + 30 h por crédito-trabalho.' },
  { chave: 'ce', titulo: 'Estágio – CE (h)', tipo: 'inteiro', largura: 110, nota: 'Carga horária de Estágio (legenda do relatório do Júpiter).' },
  { chave: 'cp', titulo: 'Práticas – CP (h)', tipo: 'inteiro', largura: 110, nota: 'Carga horária de Práticas como Componentes Curriculares (legenda do relatório do Júpiter).' },
  { chave: 'ext', titulo: 'Extensão – EXT (h)', tipo: 'inteiro', largura: 120, nota: 'Carga horária de atividade extensionista. Só o PDF traz esta informação; vazio = ainda não informado.' },
  { chave: 'atpa', titulo: 'ATPA (h)', tipo: 'inteiro', largura: 80, nota: 'Atividades Teórico-Práticas de Aprofundamento (legenda do PDF do Júpiter). O CSV traz a coluna na mesma posição com o nome AACC; a equivalência ainda precisa ser confirmada.' },
  { chave: 'versao', titulo: 'Versão', tipo: 'inteiro', largura: 70, nota: 'Versão da disciplina no Júpiter (número entre parênteses no PDF).' },
  { chave: 'versaoOrigem', titulo: 'Origem da versão', tipo: 'texto', largura: 130, nota: '"PDF": lida na linha da própria disciplina. "CSV (requisito)": tirada de outra disciplina que a tem como requisito.' },
  { chave: 'habilitacoes', titulo: 'Habilitações', tipo: 'texto', largura: 220, nota: 'Habilitações em que a disciplina aparece na estrutura atual.' },
  { chave: 'oferta', titulo: 'Tipo e período por habilitação', tipo: 'texto', largura: 360, nota: 'Resumo da aba "Disciplinas por habilitação".' },
  { chave: 'semestreIdeal', titulo: 'Semestre de oferecimento', antigos: ['Semestre ideal'], tipo: 'texto', largura: 170, nota: 'Semestre do ANO em que a disciplina é oferecida, calculado pelo período ideal do Júpiter: período ímpar (1º, 3º… 9º) = 1º semestre; par (2º… 10º) = 2º semestre; "1º e 2º semestres" quando varia entre habilitações. Uma correção feita no painel fica na aba "Ajustes manuais" (não aqui). Até a 1.3.1 esta coluna se chamava "Semestre ideal".' },
  { chave: 'situacao', titulo: 'Situação', tipo: 'texto', largura: 160, nota: '"Na estrutura atual" ou "Fora da estrutura atual" (estava em importação anterior e não veio na última).' },
  { chave: 'incluidaEm', titulo: 'Incluída em', tipo: 'dataHora', largura: 125, nota: 'Primeira importação em que a disciplina apareceu.' },
  { chave: 'alteradaEm', titulo: 'Última alteração', tipo: 'dataHora', largura: 125, nota: 'Última importação que mudou algum dado da disciplina.' },
  { chave: 'complementoPdfEm', titulo: 'Dados do PDF em', tipo: 'dataHora', largura: 125, nota: 'Quando a extensão (EXT) e a versão foram lidas do PDF.' },
  { chave: 'observacoes', titulo: 'Observações', tipo: 'texto', largura: 320, nota: 'Coluna livre do Serviço de Graduação. O sistema nunca apaga o que for escrito aqui.' }
];

COLUNAS[ABAS.OFERTA] = [
  { chave: 'curriculo', titulo: 'Currículo', tipo: 'texto', largura: 115, nota: 'Número do currículo no Júpiter (curso + habilitação + ano/semestre de cadastro).' },
  { chave: 'habilitacao', titulo: 'Habilitação', tipo: 'texto', largura: 120 },
  { chave: 'codigo', titulo: 'Código', tipo: 'texto', largura: 90 },
  { chave: 'nome', titulo: 'Nome', tipo: 'texto', largura: 330 },
  { chave: 'departamento', titulo: 'Departamento', tipo: 'texto', largura: 120 },
  { chave: 'tipo', titulo: 'Tipo', tipo: 'texto', largura: 125, nota: 'Obrigatória, Optativa eletiva ou Optativa livre — nesta habilitação.' },
  { chave: 'periodoIdeal', titulo: 'Período ideal', tipo: 'inteiro', largura: 95, nota: 'Semestre do curso em que a disciplina deve ser cursada nesta habilitação.' },
  { chave: 'semestreIdeal', titulo: 'Semestre de oferecimento', antigos: ['Semestre ideal'], tipo: 'texto', largura: 150, nota: 'Semestre do ANO em que é oferecida nesta habilitação, pelo período ideal: ímpar = 1º semestre; par = 2º semestre. Até a 1.3.1 esta coluna se chamava "Semestre ideal".' },
  { chave: 'creditosAula', titulo: 'Créditos-aula', tipo: 'inteiro', largura: 95 },
  { chave: 'requisitos', titulo: 'Requisitos', tipo: 'texto', largura: 260, nota: 'Resumo dos requisitos nesta habilitação ("ou" = alternativas; "e" = todos).' }
];

COLUNAS[ABAS.REQUISITOS] = [
  { chave: 'curriculo', titulo: 'Currículo', tipo: 'texto', largura: 115 },
  { chave: 'habilitacao', titulo: 'Habilitação', tipo: 'texto', largura: 120 },
  { chave: 'codigo', titulo: 'Disciplina', tipo: 'texto', largura: 90 },
  { chave: 'nome', titulo: 'Nome da disciplina', tipo: 'texto', largura: 300 },
  { chave: 'tipoRequisito', titulo: 'Tipo de requisito', tipo: 'texto', largura: 130, nota: 'Como o Júpiter chama o vínculo (ex.: Requisito, Requisito fraco).' },
  { chave: 'requisito', titulo: 'Requisito (código)', tipo: 'texto', largura: 120 },
  { chave: 'versaoRequisito', titulo: 'Versão do requisito', tipo: 'inteiro', largura: 120 },
  { chave: 'nomeRequisito', titulo: 'Nome do requisito', tipo: 'texto', largura: 300 },
  { chave: 'grupo', titulo: 'Grupo', tipo: 'inteiro', largura: 70, nota: 'Requisitos com o mesmo número de grupo são alternativos ("ou"). Vem do PDF; vazio = o arquivo não informou.' },
  { chave: 'relacao', titulo: 'Relação', tipo: 'texto', largura: 210, nota: 'Único; "ou" (basta um do grupo); "e" (todos os grupos); ou "não informado" quando só o CSV foi importado.' },
  { chave: 'naEstrutura', titulo: 'Requisito na estrutura?', tipo: 'texto', largura: 150, nota: 'Não = a disciplina requisito não faz parte da estrutura curricular importada.' }
];

COLUNAS[ABAS.CURRICULOS] = [
  { chave: 'curriculo', titulo: 'Currículo', tipo: 'texto', largura: 115, nota: '12 dígitos: curso (5) + habilitação (4) + ano e semestre de cadastro (3). Ex.: 47012 0100 262.' },
  { chave: 'curso', titulo: 'Curso', tipo: 'texto', largura: 150 },
  { chave: 'habilitacaoCodigo', titulo: 'Cód. habilitação', tipo: 'texto', largura: 110 },
  { chave: 'habilitacao', titulo: 'Habilitação', tipo: 'texto', largura: 200 },
  { chave: 'cadastradoEm', titulo: 'Cadastrado em', tipo: 'texto', largura: 110, nota: 'Ano/semestre em que esta estrutura foi cadastrada (últimos 3 dígitos do currículo).' },
  { chave: 'situacaoJupiter', titulo: 'Situação no Júpiter', tipo: 'texto', largura: 130 },
  { chave: 'vigente', titulo: 'Na base atual', tipo: 'texto', largura: 230, nota: '"Sim" para o currículo em uso; "Não" quando foi substituído por uma estrutura mais nova da mesma habilitação.' },
  { chave: 'disciplinas', titulo: 'Disciplinas', tipo: 'inteiro', largura: 90 },
  { chave: 'obrigatorias', titulo: 'Obrigatórias', tipo: 'inteiro', largura: 95 },
  { chave: 'eletivas', titulo: 'Optativas eletivas', tipo: 'inteiro', largura: 120 },
  { chave: 'livres', titulo: 'Optativas livres', tipo: 'inteiro', largura: 110 },
  { chave: 'requisitos', titulo: 'Requisitos', tipo: 'inteiro', largura: 85 },
  { chave: 'aacHoras', titulo: 'AAC exigida (h)', tipo: 'inteiro', largura: 110, nota: 'Atividades Acadêmicas Complementares exigidas pelo currículo (coluna AAC do CSV; também no PDF).' },
  { chave: 'aacPercentual', titulo: 'AAC (%)', tipo: 'decimal', largura: 75, nota: 'Percentual informado no CSV ao lado da AAC.' },
  { chave: 'dataAtivacao', titulo: 'Ativação', tipo: 'texto', largura: 95 },
  { chave: 'dataDesativacao', titulo: 'Desativação', tipo: 'texto', largura: 95 },
  { chave: 'duracaoIdeal', titulo: 'Duração ideal (sem.)', tipo: 'inteiro', largura: 130 },
  { chave: 'duracaoMinima', titulo: 'Duração mínima (sem.)', tipo: 'inteiro', largura: 140 },
  { chave: 'duracaoMaxima', titulo: 'Duração máxima (sem.)', tipo: 'inteiro', largura: 140 },
  { chave: 'chAulaObrigatoria', titulo: 'Obrigatórias – aula (h)', tipo: 'inteiro', largura: 150 },
  { chave: 'chTrabalhoObrigatoria', titulo: 'Obrigatórias – trabalho (h)', tipo: 'inteiro', largura: 165 },
  { chave: 'chObrigatoria', titulo: 'Obrigatórias – total (h)', tipo: 'inteiro', largura: 150 },
  { chave: 'chAulaEletiva', titulo: 'Eletivas – aula (h)', tipo: 'inteiro', largura: 130 },
  { chave: 'chTrabalhoEletiva', titulo: 'Eletivas – trabalho (h)', tipo: 'inteiro', largura: 145 },
  { chave: 'chEletiva', titulo: 'Eletivas – total (h)', tipo: 'inteiro', largura: 130 },
  { chave: 'chAulaLivre', titulo: 'Livres – aula (h)', tipo: 'inteiro', largura: 120 },
  { chave: 'chTrabalhoLivre', titulo: 'Livres – trabalho (h)', tipo: 'inteiro', largura: 135 },
  { chave: 'chLivre', titulo: 'Livres – total (h)', tipo: 'inteiro', largura: 120 },
  { chave: 'chDisciplinas', titulo: 'CH em disciplinas (h)', tipo: 'inteiro', largura: 140 },
  { chave: 'estagio', titulo: 'Estágio (h)', tipo: 'inteiro', largura: 90 },
  { chave: 'aexApolo', titulo: 'AEX Apolo (h)', tipo: 'inteiro', largura: 105, nota: 'Atividades extensionistas registradas no sistema Apolo, exigidas pelo currículo.' },
  { chave: 'extensaoOptativas', titulo: 'Extensão em optativas (h)', tipo: 'inteiro', largura: 160 },
  { chave: 'chDisciplinasMaisAac', titulo: 'CH disciplinas + AAC (h)', tipo: 'inteiro', largura: 160 },
  { chave: 'extensaoTotal', titulo: 'Extensão exigida (h)', tipo: 'inteiro', largura: 135 },
  { chave: 'extensaoPercentual', titulo: 'Extensão exigida (%)', tipo: 'decimal', largura: 135 },
  { chave: 'totalGeral', titulo: 'Total geral (h)', tipo: 'inteiro', largura: 105 },
  { chave: 'informacoesEspecificas', titulo: 'Informações específicas', tipo: 'texto', largura: 420, nota: 'Texto descritivo da habilitação, do relatório em PDF.' },
  { chave: 'atualizadoEm', titulo: 'Atualizado em', tipo: 'dataHora', largura: 125 },
  { chave: 'infoPdfEm', titulo: 'Informações do PDF em', tipo: 'dataHora', largura: 150 }
];

COLUNAS[ABAS.IMPORTACOES] = [
  { chave: 'id', titulo: 'Importação', tipo: 'texto', largura: 170 },
  { chave: 'dataHora', titulo: 'Data e hora', tipo: 'dataHora', largura: 125 },
  { chave: 'usuario', titulo: 'Quem importou', tipo: 'texto', largura: 220 },
  { chave: 'arquivo', titulo: 'Arquivo', tipo: 'texto', largura: 200 },
  { chave: 'formato', titulo: 'Formato', tipo: 'texto', largura: 70 },
  { chave: 'leitura', titulo: 'Leitura', tipo: 'texto', largura: 140 },
  { chave: 'modo', titulo: 'Gravação', tipo: 'texto', largura: 230, nota: '"Completa": o arquivo definiu a estrutura das habilitações. "Complemento": o PDF só acrescentou o que o CSV não tem.' },
  { chave: 'curriculos', titulo: 'Currículos', tipo: 'texto', largura: 260 },
  { chave: 'disciplinas', titulo: 'Disciplinas', tipo: 'inteiro', largura: 90 },
  { chave: 'novas', titulo: 'Novas', tipo: 'inteiro', largura: 70 },
  { chave: 'alteradas', titulo: 'Alteradas', tipo: 'inteiro', largura: 80 },
  { chave: 'sairam', titulo: 'Saíram', tipo: 'inteiro', largura: 70 },
  { chave: 'voltaram', titulo: 'Voltaram', tipo: 'inteiro', largura: 75 },
  { chave: 'ofertasAlteradas', titulo: 'Ofertas alteradas', tipo: 'inteiro', largura: 120 },
  { chave: 'requisitos', titulo: 'Requisitos', tipo: 'inteiro', largura: 85 },
  { chave: 'avisos', titulo: 'Avisos', tipo: 'inteiro', largura: 65 },
  { chave: 'resumo', titulo: 'Resumo', tipo: 'texto', largura: 420 }
];

COLUNAS[ABAS.ALTERACOES] = [
  { chave: 'importacao', titulo: 'Importação', tipo: 'texto', largura: 170 },
  { chave: 'dataHora', titulo: 'Data e hora', tipo: 'dataHora', largura: 125 },
  { chave: 'codigo', titulo: 'Código', tipo: 'texto', largura: 90 },
  { chave: 'nome', titulo: 'Nome', tipo: 'texto', largura: 300 },
  { chave: 'tipo', titulo: 'O que mudou', tipo: 'texto', largura: 170 },
  { chave: 'habilitacao', titulo: 'Habilitação', tipo: 'texto', largura: 120 },
  { chave: 'campo', titulo: 'Campo', tipo: 'texto', largura: 150 },
  { chave: 'antes', titulo: 'Antes', tipo: 'texto', largura: 260 },
  { chave: 'depois', titulo: 'Depois', tipo: 'texto', largura: 260 }
];

COLUNAS[ABAS.AJUSTES] = [
  { chave: 'chave', titulo: 'Disciplina (código no Júpiter)', tipo: 'texto', largura: 150, nota: 'Código da disciplina como veio do Júpiter (aba Disciplinas). Identifica a qual disciplina o ajuste se aplica: não altere.' },
  { chave: 'excluida', titulo: 'Excluída', tipo: 'texto', largura: 80, nota: '"Sim" = excluída pelo painel: não aparece na lista nem na grade (pode ser restaurada no painel, filtro Situação › Excluídas).' },
  { chave: 'naGrade', titulo: 'Adicionada à grade horária', antigos: ['Selecionada para a grade'], tipo: 'texto', largura: 170, nota: '"Sim" = enviada para a grade horária (etapa 3 › "Enviar para a Grade Horária", ou "Adicionar à Grade Horária" na ficha). Sai com "Remover da grade" na Prévia da grade horária. Até a 1.3.2 esta coluna se chamava "Selecionada para a grade".' },
  { chave: 'codigo', titulo: 'Código ajustado', tipo: 'texto', largura: 110, nota: 'Vazio = usa o do Júpiter.' },
  { chave: 'nome', titulo: 'Nome ajustado', tipo: 'texto', largura: 300, nota: 'Vazio = usa o do Júpiter.' },
  { chave: 'departamento', titulo: 'Departamento ajustado', tipo: 'texto', largura: 140 },
  { chave: 'creditosAula', titulo: 'Créditos-aula ajustados', tipo: 'inteiro', largura: 140 },
  { chave: 'creditosTrabalho', titulo: 'Créditos-trabalho ajustados', tipo: 'inteiro', largura: 160 },
  { chave: 'ch', titulo: 'CH total ajustada (h)', tipo: 'inteiro', largura: 130 },
  { chave: 'ce', titulo: 'Estágio – CE ajustado (h)', tipo: 'inteiro', largura: 150 },
  { chave: 'cp', titulo: 'Práticas – CP ajustadas (h)', tipo: 'inteiro', largura: 160 },
  { chave: 'ext', titulo: 'Extensão – EXT ajustada (h)', tipo: 'inteiro', largura: 160 },
  { chave: 'atpa', titulo: 'ATPA ajustada (h)', tipo: 'inteiro', largura: 110 },
  { chave: 'versao', titulo: 'Versão ajustada', tipo: 'inteiro', largura: 100 },
  { chave: 'oferecimento', titulo: 'Semestre de oferecimento ajustado', tipo: 'texto', largura: 190, nota: '(1.3.2) "1º semestre", "2º semestre" ou "1º e 2º semestres" escolhido no painel (ex.: disciplina prática oferecida nos dois semestres). Vazio = automático, pelo período ideal.' },
  { chave: 'oferta', titulo: 'Oferta ajustada', tipo: 'texto', largura: 360, nota: 'Tipo e período em cada habilitação, quando foram corrigidos no painel (formato interno; edite pelo painel). Vazio = usa a oferta do Júpiter.' },
  { chave: 'alteradoEm', titulo: 'Alterado em', tipo: 'dataHora', largura: 125 },
  { chave: 'alteradoPor', titulo: 'Alterado por', tipo: 'texto', largura: 220 }
];

COLUNAS[ABAS.OUTROS] = [
  { chave: 'chave', titulo: 'Identificador', tipo: 'texto', largura: 110, nota: 'Código com que a disciplina foi incluída; (1.8.1) se esse identificador já era de outra linha (código alterado no painel), recebe o sufixo -2, -3… Identifica a linha: não altere.' },
  { chave: 'codigo', titulo: 'Código', tipo: 'texto', largura: 90 },
  { chave: 'nome', titulo: 'Nome', tipo: 'texto', largura: 330 },
  { chave: 'departamento', titulo: 'Departamento', tipo: 'texto', largura: 120 },
  { chave: 'creditosAula', titulo: 'Créditos-aula', tipo: 'inteiro', largura: 95 },
  { chave: 'creditosTrabalho', titulo: 'Créditos-trabalho', tipo: 'inteiro', largura: 115 },
  { chave: 'ch', titulo: 'CH total (h)', tipo: 'inteiro', largura: 90, nota: '15 h por crédito-aula + 30 h por crédito-trabalho (calculada na inclusão; pode ser corrigida no painel).' },
  { chave: 'ativacao', titulo: 'Ativação', tipo: 'texto', largura: 95 },
  { chave: 'desativacao', titulo: 'Desativação', tipo: 'texto', largura: 95 },
  { chave: 'unidadeAtendida', titulo: 'Unidade atendida', tipo: 'texto', largura: 180, nota: 'Unidade da USP para a qual a disciplina é ministrada (ex.: FEA). Preenchido no painel.' },
  { chave: 'cursoAtendido', titulo: 'Curso atendido', tipo: 'texto', largura: 200, nota: 'Curso da outra unidade. Preenchido no painel.' },
  { chave: 'oferecimento', titulo: 'Semestre de oferecimento', antigos: ['Semestre ideal'], tipo: 'texto', largura: 170, nota: 'Semestre do ANO em que a disciplina é oferecida ("disciplina de semestre"): "1º semestre", "2º semestre" ou "1º e 2º semestres". Vazio = não informado. Preenchido no painel. Até a 1.3.1 esta coluna se chamava "Semestre ideal".' },
  { chave: 'origem', titulo: 'Origem', tipo: 'texto', largura: 230, nota: '"Lista de disciplinas por unidade (Júpiter)" ou "Cadastro manual".' },
  { chave: 'incluidaEm', titulo: 'Incluída em', tipo: 'dataHora', largura: 125 },
  { chave: 'excluida', titulo: 'Excluída', tipo: 'texto', largura: 80, nota: '"Sim" = excluída pelo painel (pode ser restaurada).' },
  { chave: 'naGrade', titulo: 'Adicionada à grade horária', antigos: ['Selecionada para a grade'], tipo: 'texto', largura: 170, nota: '"Sim" = enviada para a grade horária. Até a 1.3.2 esta coluna se chamava "Selecionada para a grade".' },
  { chave: 'observacoes', titulo: 'Observações', tipo: 'texto', largura: 320 },
  { chave: 'alteradoEm', titulo: 'Alterado em', tipo: 'dataHora', largura: 125 },
  { chave: 'alteradoPor', titulo: 'Alterado por', tipo: 'texto', largura: 220 }
];

var COR_CABECALHO = '#00509D';
var COR_TEXTO_CABECALHO = '#FFFFFF';

/*---------------------------------------------------------------------
  Metadados da planilha (invisíveis na interface)
  Guardados como "Developer Metadata" da planilha: não aparecem em
  nenhuma célula e não são apagados por quem edita as abas.
    estruturaCurricular.esquema     versão do esquema de abas/colunas
    estruturaCurricular.ativa       MANIFESTO da versão ativa (Gravacao.gs):
                                    quais abas (por ID interno da aba) têm os
                                    dados em uso, versão da base e lista das
                                    importações concluídas
    estruturaCurricular.gravacao    diário da gravação em andamento
    estruturaCurricular.salvamento  (1.8.5) salvamento de disciplina da estrutura
                                    ainda não concluído (Preparacao.gs)
    (1.8.7) A ação em lote ainda não concluída NÃO fica aqui (os 30.000
    caracteres de metadados da planilha não comportam 6.000 itens): fica
    nas Propriedades do script, chave estruturaCurricular.lote (Preparacao.gs).
    estruturaCurricular.versaoBase  (esquema 1, legado) lido só na migração
---------------------------------------------------------------------*/

/** Valor (texto) do metadado "chave" da planilha, ou null se não existir. */
function lerMetadado_(ss, chave) {
  var achado = ss.getDeveloperMetadata().filter(function (m) { return m.getKey() === chave; })[0];
  return achado ? achado.getValue() : null;
}

/** Cria ou atualiza o metadado "chave" da planilha (sempre como texto). */
function gravarMetadado_(ss, chave, valor) {
  var achado = ss.getDeveloperMetadata().filter(function (m) { return m.getKey() === chave; })[0];
  if (achado) achado.setValue(String(valor));
  else ss.addDeveloperMetadata(chave, String(valor));
}

/** Apaga o metadado "chave" (se existir). */
function removerMetadado_(ss, chave) {
  ss.getDeveloperMetadata().filter(function (m) { return m.getKey() === chave; }).forEach(function (m) { m.remove(); });
}

/** Versão do esquema já aplicada na planilha (0 = planilha nunca preparada). */
function versaoEsquemaDaPlanilha_(ss) {
  var v = lerMetadado_(ss, META_ESQUEMA);
  return v ? parseInt(v, 10) : 0;
}

/** Número que cresce a cada importação concluída (vem do manifesto; usado na assinatura da prévia). */
function versaoDaBase_(ss) {
  var m = lerManifesto_(ss);
  if (m) return m.versaoBase || 0;
  var v = lerMetadado_(ss, META_VERSAO_BASE);
  return v ? parseInt(v, 10) : 0;
}

/**
 * A planilha já tem as abas desta versão do esquema e o manifesto?
 * As abas de dados são conferidas pelo ID interno registrado no
 * manifesto (não pelo nome); as de registro, pelo nome.
 */
function estruturaPronta_(ss) {
  if (versaoEsquemaDaPlanilha_(ss) < ESQUEMA_VERSAO) return false;
  var m = lerManifesto_(ss);
  if (!m) return false;
  return [ABAS.SOBRE, ABAS.IMPORTACOES, ABAS.ALTERACOES].every(function (nome) { return !!ss.getSheetByName(nome); });
}

/*---------------------------------------------------------------------
  Criação e reparo das abas
---------------------------------------------------------------------*/

/**
 * Cria o que faltar e acrescenta colunas que não existam. Nunca apaga
 * dados. Devolve { criadas: [abas], colunasAcrescentadas: n }.
 */
function garantirEstrutura_(ss) {
  var resultado = { criadas: [], colunasAcrescentadas: 0 };
  if (estruturaPronta_(ss) && !abasComColunasFaltando_(ss).length) return resultado;

  // Planilha nova: aproveita a aba vazia padrão ("Página1") como "Sobre".
  var abas = ss.getSheets();
  if (!ss.getSheetByName(ABAS.SOBRE) && abas.length === 1 && abas[0].getLastRow() === 0 && ORDEM_ABAS.indexOf(abas[0].getName()) < 0) {
    abas[0].setName(ABAS.SOBRE);
    resultado.criadas.push(ABAS.SOBRE);
  }

  var m = lerManifesto_(ss);
  ORDEM_ABAS.forEach(function (nome, indice) {
    // Com manifesto, a aba de dados em uso é a do ID registrado; se ela
    // sumiu, NÃO é recriada vazia (isso esconderia a perda dos dados).
    var aba = m && m.abas[nome] != null ? abaDados_(ss, nome, m) : ss.getSheetByName(nome);
    if (!aba) {
      // Logo depois da aba anterior da ordem (as cópias ocultas "_anterior_…"
      // podem estar no meio; a posição absoluta não serve).
      var posicao = Math.min(indice, ss.getSheets().length);
      var anterior = indice > 0 ? ss.getSheetByName(ORDEM_ABAS[indice - 1]) : null;
      if (anterior) posicao = posicaoDaAba_(ss, anterior) + 1;   // (1.11.0) pelo ID
      aba = ss.insertSheet(nome, posicao);
      resultado.criadas.push(nome);
    }
    if (nome === ABAS.SOBRE) return;
    resultado.colunasAcrescentadas += prepararCabecalho_(aba, COLUNAS[nome], resultado.criadas.indexOf(nome) >= 0);
  });

  // Aba Sobre: criada agora, vazia, ou de um esquema anterior (lista de abas mudou).
  var esquemaAntes = versaoEsquemaDaPlanilha_(ss);
  if (resultado.criadas.indexOf(ABAS.SOBRE) >= 0 || !ss.getSheetByName(ABAS.SOBRE).getLastRow() || (esquemaAntes && esquemaAntes < ESQUEMA_VERSAO)) {
    escreverSobre_(ss, m && m.ultimaTexto ? { texto: m.ultimaTexto } : null);
  }
  // Manifesto por último: a base só é considerada pronta quando ele existe.
  if (!m) criarManifestoInicial_(ss);
  gravarMetadado_(ss, META_ESQUEMA, ESQUEMA_VERSAO);
  return resultado;
}

/**
 * Nomes das abas de dados que não existem ou em que falta alguma coluna
 * do esquema (comparando títulos sem acento/maiúsculas). Lista vazia =
 * planilha completa. A aba Sobre não entra na conta (é só texto).
 */
function abasComColunasFaltando_(ss) {
  var m = lerManifesto_(ss);
  return ORDEM_ABAS.filter(function (nome) {
    if (nome === ABAS.SOBRE) return false;
    var porId = m && m.abas[nome] != null;
    var aba = porId ? abaPorId_(ss, m.abas[nome]) : ss.getSheetByName(nome);
    // Aba em uso que não existe NÃO é "coluna faltando": pode ser uma
    // importação que terminou agora (a leitura repete) ou uma aba apagada
    // (a leitura acusa BASE_INCONSISTENTE). Ver lerVersaoConsistente_.
    if (!aba) return !porId;
    var titulos = titulosDaAba_(aba).map(chaveTitulo_);
    return COLUNAS[nome].some(function (c) { return titulos.indexOf(chaveTitulo_(c.titulo)) < 0; });
  });
}

/** Títulos da linha 1 da aba, como aparecem na tela (sem espaços nas pontas). */
function titulosDaAba_(aba) {
  var ultima = aba.getLastColumn();
  if (!ultima) return [];
  return aba.getRange(1, 1, 1, ultima).getDisplayValues()[0].map(function (t) { return String(t).trim(); });
}

/**
 * Coluna renomeada numa versão nova (c.antigos): se a aba ainda tem o
 * título antigo e não tem o novo, troca só o texto (e a nota) do
 * cabeçalho — os dados da coluna ficam onde estão. Devolve quantas
 * colunas foram renomeadas.
 */
function renomearTitulosAntigos_(aba, colunas) {
  var titulos = titulosDaAba_(aba);
  var chaves = titulos.map(chaveTitulo_);
  var n = 0;
  colunas.forEach(function (c) {
    if (!c.antigos || chaves.indexOf(chaveTitulo_(c.titulo)) >= 0) return;
    for (var i = 0; i < c.antigos.length; i++) {
      var pos = chaves.indexOf(chaveTitulo_(c.antigos[i]));
      if (pos < 0) continue;
      var cel = aba.getRange(1, pos + 1);
      cel.setValue(c.titulo);
      if (c.nota) cel.setNote(c.nota);
      chaves[pos] = chaveTitulo_(c.titulo);
      n++;
      return;
    }
  });
  return n;
}

/**
 * Escreve o cabeçalho (aba nova) ou acrescenta no fim as colunas que
 * faltam (aba existente). Antes, renomeia as colunas que mudaram de
 * nome (renomearTitulosAntigos_). Devolve quantas colunas foram
 * acrescentadas.
 */
function prepararCabecalho_(aba, colunas, nova) {
  if (!nova) renomearTitulosAntigos_(aba, colunas);
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var chaves = titulos.map(chaveTitulo_);
  var faltando = colunas.filter(function (c) { return chaves.indexOf(chaveTitulo_(c.titulo)) < 0; });
  if (!faltando.length && !nova) return 0;

  var inicio = titulos.length + 1;
  var necessarias = titulos.length + faltando.length;
  if (aba.getMaxColumns() < necessarias) aba.insertColumnsAfter(aba.getMaxColumns(), necessarias - aba.getMaxColumns());

  faltando.forEach(function (c, i) {
    var col = inicio + i;
    var cel = aba.getRange(1, col);
    cel.setValue(c.titulo);
    if (c.nota) cel.setNote(c.nota);
    aba.setColumnWidth(col, c.largura || 120);
    var formato = c.tipo === 'inteiro' ? '0' : c.tipo === 'decimal' ? '0.00' : c.tipo === 'dataHora' ? 'dd/MM/yyyy HH:mm' : null;
    if (formato) aba.getRange(2, col, Math.max(1, aba.getMaxRows() - 1), 1).setNumberFormat(formato);
  });

  var total = titulos.length + faltando.length;
  var cabecalho = aba.getRange(1, 1, 1, total);
  cabecalho.setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor(COR_TEXTO_CABECALHO)
    .setVerticalAlignment('middle').setWrap(true);
  aba.setFrozenRows(1);
  if (nova) {
    aba.setRowHeight(1, 40);
    if (aba.getName() === ABAS.DISCIPLINAS) aba.setFrozenColumns(2);
    protegerAba_(aba);
  }
  return nova ? 0 : faltando.length;
}

/**
 * Proteção "só com aviso": ninguém é impedido de editar, mas recebe um
 * alerta. Na aba Disciplinas a coluna Observações fica fora do aviso.
 */
function protegerAba_(aba, nomeLogico) {
  var existentes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  var p = existentes.length ? existentes[0] : aba.protect();
  p.setDescription('Dados mantidos pelo sistema Estrutura Curricular. A próxima importação regrava esta aba.');
  p.setWarningOnly(true);
  if ((nomeLogico || aba.getName()) === ABAS.DISCIPLINAS) {
    var titulos = titulosDaAba_(aba).map(chaveTitulo_);
    var col = titulos.indexOf(chaveTitulo_('Observações')) + 1;
    if (col > 0) p.setUnprotectedRanges([aba.getRange(2, col, Math.max(1, aba.getMaxRows() - 1), 1)]);
  }
}

/*---------------------------------------------------------------------
  Aba "Sobre"
---------------------------------------------------------------------*/

/** (Re)escreve a aba Sobre. ultima = resumo da última importação ou null. */
function escreverSobre_(ss, ultima) {
  var aba = ss.getSheetByName(ABAS.SOBRE);
  if (!aba) return;
  var linhas = [
    ['Estrutura Curricular — base de dados da Grade Horária', ''],
    ['Serviço de Graduação — Instituto de Psicologia da USP', ''],
    ['', ''],
    ['Esta planilha é mantida pelo sistema "Estrutura Curricular". Os dados vêm do relatório "Grade Curricular" do Júpiter (CSV ou PDF), importado pelo painel.', ''],
    ['', ''],
    ['Aba', 'O que guarda'],
    [ABAS.DISCIPLINAS, 'Uma linha por disciplina: créditos, cargas horárias, versão, onde aparece e situação. A coluna "Observações" é livre.'],
    [ABAS.OFERTA, 'Tipo (obrigatória, eletiva, livre) e período ideal de cada disciplina em cada habilitação.'],
    [ABAS.REQUISITOS, 'Requisitos de cada disciplina, por habilitação, com a indicação de "ou" quando o PDF informa.'],
    [ABAS.CURRICULOS, 'Um currículo por habilitação: código de 12 dígitos, contagens e as informações básicas do PDF.'],
    [ABAS.IMPORTACOES, 'Cada arquivo importado: quem, quando, formato e o que mudou.'],
    [ABAS.ALTERACOES, 'Cada mudança encontrada ao comparar uma importação com a base anterior.'],
    [ABAS.AJUSTES, 'Correções feitas no painel sobre os dados do Júpiter (disciplinas excluídas, campos e oferta ajustados) e a seleção de disciplinas para a grade horária. Não é regravada pelas importações.'],
    [ABAS.OUTROS, 'Disciplinas do IP ministradas para cursos de outras unidades (lista de disciplinas por unidade do Júpiter ou cadastro manual). Não é regravada pelas importações.'],
    ['', ''],
    ['Importante', 'As abas de dados do Júpiter (Disciplinas, Disciplinas por habilitação, Requisitos, Currículos) são regravadas a cada importação. Não edite os dados à mão (exceto "Observações" e colunas extras): corrija pelo painel (os ajustes ficam na aba "Ajustes manuais" e continuam valendo depois das importações) ou no Júpiter. Uma edição feita depois da prévia de uma importação obriga a gerar a prévia de novo. Abas ocultas "_anterior_…" guardam a versão anterior de cada aba (cópia de segurança da última importação).'],
    ['', ''],
    ['Última importação', ultima ? ultima.texto : 'Nenhuma importação ainda.'],
    ['Versão do esquema', String(ESQUEMA_VERSAO)]
  ];
  aba.clearContents();
  aba.getRange(1, 1, linhas.length, 2).setValues(linhas.map(function (l) { return [textoSeguro_(l[0]), textoSeguro_(l[1])]; }));
  aba.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  aba.getRange(2, 1).setFontColor('#5F6B76');
  aba.getRange(6, 1, 1, 2).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor(COR_TEXTO_CABECALHO);
  // Primeira coluna em negrito: nomes das abas, "Importante" e as duas últimas linhas.
  var numAbas = 8;
  aba.getRange(7, 1, numAbas, 1).setFontWeight('bold');
  aba.getRange(7 + numAbas + 1, 1).setFontWeight('bold');
  aba.getRange(linhas.length - 1, 1, 2, 1).setFontWeight('bold');
  aba.setColumnWidth(1, 260);
  aba.setColumnWidth(2, 720);
  aba.getRange(1, 1, linhas.length, 2).setWrap(true).setVerticalAlignment('top');
  var p = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (!p.length) aba.protect().setDescription('Texto mantido pelo sistema Estrutura Curricular.').setWarningOnly(true);
}
