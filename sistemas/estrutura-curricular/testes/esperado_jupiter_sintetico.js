// Resultado acadêmico ESPERADO do PDF sintético misto (jupiter_sintetico.js),
// escrito à mão a partir da tabela inventada, antes de qualquer execução, e
// no formato do pacote de LeitorComum.html. Não é gerado pelo leitor e não
// deve ser ajustado para "fazer passar": se o leitor devolver outra coisa,
// o teste reprova e a diferença é analisada.
'use strict';

const CURRICULO = '990010100261';

const ESPERADO = {
  modo: 'ocr',
  paginas: 3,
  curso: { codigo: '99001', nome: 'Curso Sintético de Teste' },
  curriculos: [
    { codigo: CURRICULO, habilitacao: '100', habilitacaoNome: 'Habilitação Sintética', ano: 2026, semestre: 1 }
  ],
  // codigo, nome, versão, créditos-aula, créditos-trabalho, CH, CE, CP, EXT, ATPA
  disciplinas: [
    ['TST0101', 'Fundamentos Sintéticos I', 1, 4, 0, 60, 0, 0, 0, 0],
    ['TST0102', 'Métodos Fictícios', 2, 2, 1, 60, 0, 0, 0, 0],
    ['TST0201', 'Laboratório Sintético', 1, 0, 2, 60, 0, 8, 0, 0],
    ['TST0205', 'Estatística Fictícia', 1, 4, 0, 60, 0, 0, 0, 0],
    ['TST0301', 'Pesquisa Sintética', 1, 3, 1, 75, 0, 0, 0, 0],
    ['TST0308', 'Seminário Fictício', 1, 1, 0, 15, 0, 0, 5, 0],
    ['TST0510', 'Tópicos Fictícios', 1, 2, 0, 30, 0, 0, 0, 0],
    ['TST0511', 'Oficina Sintética', 1, 1, 1, 45, 0, 0, 0, 10]
  ],
  // disciplina, tipo, período ideal (todos confirmados)
  vinculos: [
    ['TST0101', 'OBRIGATORIA', 1],
    ['TST0102', 'OBRIGATORIA', 1],
    ['TST0201', 'OBRIGATORIA', 2],
    ['TST0205', 'OBRIGATORIA', 2],
    ['TST0301', 'OBRIGATORIA', 3],
    ['TST0308', 'OBRIGATORIA', 3],
    ['TST0510', 'OPTATIVA_ELETIVA', 5],
    ['TST0511', 'OPTATIVA_ELETIVA', 5]
  ],
  // disciplina, requisito, versão do requisito, tipo, grupo ("ou" = mesmo grupo)
  requisitos: [
    ['TST0201', 'TST0101', 1, 'Requisito', 1],
    ['TST0205', 'TST0102', 2, 'Requisito', 1],
    ['TST0205', 'TST0101', 1, 'Requisito', 1],
    ['TST0301', 'TST0201', 1, 'Requisito', 1],
    ['TST0301', 'TST0205', 1, 'Requisito', 2],
    ['TST0511', 'TST0301', 1, 'Requisito fraco', 1]
  ],
  // Grupos fechados por Subtotal e seções fechadas por Total: todos conferem.
  conferencia: { linhasDisciplina: 8, subtotais: 4, subtotaisConferem: 4, totaisSecao: 2, totaisSecaoConferem: 2, numerosAConferir: 0 },
  // Nenhum aviso: tudo confirmado, curso no cabeçalho, rodapé com 3 páginas.
  avisos: [],
  geradoEm: '2026-10-22T10:00:00'
};

module.exports = { ESPERADO, CURRICULO };
