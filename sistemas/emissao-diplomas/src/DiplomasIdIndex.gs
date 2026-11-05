/* GRADIP — resolução de recursos sem identificadores de produção no Git. */
function obterIdRecursoDiplomas_(chave, tipoEsperado) {
  if (typeof chave !== 'string' || !chave) throw new Error('Chave de recurso inválida.');
  const props = PropertiesService.getScriptProperties();
  const idIndice = String(props.getProperty('ID_INDEX_SPREADSHEET_ID') || '').trim();
  if (!idIndice) throw new Error('Configuração ausente: ID_INDEX_SPREADSHEET_ID.');
  const ambiente = String(props.getProperty('AMBIENTE') || 'producao').trim().toLowerCase();
  if (!['producao', 'produção', 'homologacao', 'homologação'].includes(ambiente)) {
    throw new Error('AMBIENTE inválido.');
  }
  const homologacao = ambiente === 'homologacao' || ambiente === 'homologação';
  const indice = SpreadsheetApp.openById(idIndice);
  const aba = indice.getSheetByName('Página1') || indice.getSheets()[0];
  if (!aba) throw new Error('ID_INDEX sem abas.');
  const linhas = aba.getDataRange().getValues();
  if (linhas.length < 2) throw new Error('ID_INDEX sem dados.');
  const normalizar = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const titulos = linhas[0].map(normalizar);
  const coluna = nome => titulos.indexOf(normalizar(nome));
  const cChave = coluna('Chave');
  const cTipo = coluna('Tipo');
  const cId = homologacao ? titulos.findIndex(t => t.startsWith('homologacao')) : coluna('ID de Produção');
  if (cChave < 0 || cId < 0) throw new Error('Colunas obrigatórias ausentes no ID_INDEX.');
  const correspondencias = linhas.slice(1).filter(l => String(l[cChave] || '').trim() === chave);
  if (correspondencias.length !== 1) throw new Error('Chave ausente ou duplicada no ID_INDEX: ' + chave);
  const linha = correspondencias[0];
  if (cTipo >= 0 && normalizar(linha[cTipo]) !== normalizar(tipoEsperado)) {
    throw new Error('Tipo incorreto no ID_INDEX para: ' + chave);
  }
  const id = String(linha[cId] || '').trim();
  if (!id || !/^[A-Za-z0-9_-]{20,}$/.test(id)) {
    throw new Error('ID ausente ou inválido no ID_INDEX para: ' + chave + (homologacao ? ' (homologação)' : ''));
  }
  return id;
}
