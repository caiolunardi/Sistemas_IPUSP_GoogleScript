/*=====================================================================
  LEITURA E ESCRITA DAS ABAS (pelo título das colunas)

  lerAba_()        → lista de objetos { chave: valor } (uma por linha),
                     lida da aba ATIVA indicada pelo manifesto
  escreverAbaObj_() → regrava todas as linhas de dados de uma aba

  Os títulos são comparados sem acento e sem diferença de maiúsculas.
  Colunas desconhecidas (criadas por alguém) são lidas em "_extras" e,
  na aba Disciplinas, devolvidas intactas na regravação.
=====================================================================*/

/**
 * Lê uma aba do esquema. Devolve { linhas: [obj], extrasTitulos: [..] }.
 * Linhas totalmente vazias são ignoradas.
 */
function lerAba_(ss, nomeAba, manifesto) {
  return lerAbaObj_(abaDados_(ss, nomeAba, manifesto), nomeAba);
}

/**
 * Título da planilha (normalizado) → definição da coluna. Inclui os
 * títulos antigos de colunas renomeadas (c.antigos), para que uma aba
 * ainda não atualizada (ou uma cópia "_anterior_…") continue legível.
 */
function mapaDeTitulos_(colunas) {
  var porTitulo = {};
  colunas.forEach(function (c) {
    (c.antigos || []).forEach(function (t) { porTitulo[chaveTitulo_(t)] = c; });
  });
  colunas.forEach(function (c) { porTitulo[chaveTitulo_(c.titulo)] = c; });
  return porTitulo;
}

/** Igual a lerAba_, mas recebe a própria aba (Sheet); nomeAba diz qual esquema usar. */
function lerAbaObj_(aba, nomeAba) {
  var colunas = COLUNAS[nomeAba];
  if (!aba) return { linhas: [], extrasTitulos: [] };
  var ultimaLinha = aba.getLastRow(), ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaColuna < 1) return { linhas: [], extrasTitulos: [] };

  var valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  var titulos = valores[0].map(function (t) { return String(t).trim(); });
  var porTitulo = mapaDeTitulos_(colunas);

  var mapa = titulos.map(function (t) { return t ? porTitulo[chaveTitulo_(t)] || null : null; });
  var extrasTitulos = titulos.filter(function (t, i) { return t && !mapa[i]; });

  var linhas = [];
  for (var r = 1; r < valores.length; r++) {
    var linha = valores[r];
    if (linha.every(function (v) { return v === '' || v === null; })) continue;
    var obj = { _extras: {} };
    colunas.forEach(function (c) { obj[c.chave] = null; });
    linha.forEach(function (v, i) {
      var col = mapa[i];
      if (col) obj[col.chave] = valorLido_(v, col.tipo);
      else if (titulos[i]) obj._extras[titulos[i]] = v;
    });
    linhas.push(obj);
  }
  return { linhas: linhas, extrasTitulos: extrasTitulos };
}

/**
 * Lê só as últimas "quantidade" linhas de uma aba de registro
 * (Importações, Alterações), que crescem a cada importação.
 */
function lerUltimasLinhas_(ss, nomeAba, quantidade) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  var ultimaLinha = aba.getLastRow(), ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return [];
  var colunas = COLUNAS[nomeAba];
  var titulos = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(function (t) { return String(t).trim(); });
  var porTitulo = mapaDeTitulos_(colunas);
  var mapa = titulos.map(function (t) { return t ? porTitulo[chaveTitulo_(t)] || null : null; });
  var inicio = Math.max(2, ultimaLinha - quantidade + 1);
  var valores = aba.getRange(inicio, 1, ultimaLinha - inicio + 1, ultimaColuna).getValues();
  return valores.filter(function (l) { return l.some(function (v) { return v !== '' && v !== null; }); }).map(function (linha) {
    var obj = {};
    colunas.forEach(function (c) { obj[c.chave] = null; });
    linha.forEach(function (v, i) { if (mapa[i]) obj[mapa[i].chave] = valorLido_(v, mapa[i].tipo); });
    return obj;
  });
}

/**
 * Converte o valor de uma célula para o tipo da coluna:
 * inteiro/decimal → número (ou null), dataHora → Date (ou null),
 * texto → texto sem o apóstrofo de "forçar texto". Vazio → null.
 */
function valorLido_(v, tipo) {
  if (v === '' || v === null || v === undefined) return null;
  if (tipo === 'inteiro' || tipo === 'decimal') return numeroDaCelula_(v);
  if (tipo === 'dataHora') return Object.prototype.toString.call(v) === '[object Date]' ? v : null;
  return textoDaCelula_(v);
}

/**
 * Caminho inverso de valorLido_: prepara o valor para setValues().
 * Números inválidos viram célula vazia; textos passam por textoSeguro_
 * para não serem reinterpretados (códigos com zero à esquerda, "2026/2"…).
 */
function valorParaCelula_(v, tipo) {
  if (v === null || v === undefined || v === '') return '';
  if (tipo === 'inteiro' || tipo === 'decimal') return typeof v === 'number' && isFinite(v) ? v : '';
  if (tipo === 'dataHora') return Object.prototype.toString.call(v) === '[object Date]' ? v : '';
  return textoSeguro_(String(v));
}

/**
 * Regrava as linhas de dados da aba (a linha 1 é o cabeçalho). Na
 * importação, é chamada só sobre a CÓPIA de preparação (aba oculta
 * "_nova_…"), nunca sobre a aba em uso: ver Gravacao.gs.
 * objetos: lista de { chave: valor }; o objeto pode ter "_extras"
 * { "Título de coluna extra": valor } para colunas criadas por alguém.
 */
function escreverAbaObj_(aba, nomeAba, objetos) {
  var colunas = COLUNAS[nomeAba];
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var porTitulo = mapaDeTitulos_(colunas);
  var mapa = titulos.map(function (t) { return t ? porTitulo[chaveTitulo_(t)] || null : null; });

  var largura = titulos.length;
  var linhas = objetos.map(function (o) {
    return titulos.map(function (t, i) {
      var col = mapa[i];
      if (col) return valorParaCelula_(o[col.chave], col.tipo);
      var extra = o._extras && Object.prototype.hasOwnProperty.call(o._extras, t) ? o._extras[t] : '';
      return extra === null || extra === undefined ? '' : (typeof extra === 'string' ? textoSeguro_(extra) : extra);
    });
  });

  // Garante linhas suficientes e limpa os dados antigos.
  var necessarias = linhas.length + 1;
  if (aba.getMaxRows() < necessarias) aba.insertRowsAfter(aba.getMaxRows(), necessarias - aba.getMaxRows());
  var ultima = aba.getLastRow();
  if (ultima > 1) aba.getRange(2, 1, ultima - 1, Math.max(largura, aba.getLastColumn())).clearContent();
  if (linhas.length) aba.getRange(2, 1, linhas.length, largura).setValues(linhas);
}

/** Acrescenta linhas no fim de uma aba de registro (Importações, Alterações). */
function acrescentarLinhas_(ss, nomeAba, objetos) {
  if (!objetos.length) return;
  var aba = ss.getSheetByName(nomeAba);
  var colunas = COLUNAS[nomeAba];
  var titulos = titulosDaAba_(aba);
  while (titulos.length && !titulos[titulos.length - 1]) titulos.pop();
  var porTitulo = mapaDeTitulos_(colunas);
  var linhas = objetos.map(function (o) {
    return titulos.map(function (t) {
      var col = t ? porTitulo[chaveTitulo_(t)] : null;
      return col ? valorParaCelula_(o[col.chave], col.tipo) : '';
    });
  });
  var inicio = aba.getLastRow() + 1;
  var necessarias = inicio + linhas.length - 1;
  if (aba.getMaxRows() < necessarias) aba.insertRowsAfter(aba.getMaxRows(), necessarias - aba.getMaxRows());
  aba.getRange(inicio, 1, linhas.length, titulos.length).setValues(linhas);
}
