/*=====================================================
  CONFIG CORE — utilitários compartilhados por TODOS os
  módulos da área "⚙️ Configurações" (Formulários e Regras
  Curriculares). Nada aqui é específico de um formulário
  ou da planilha de Regras — é o que os dois lados
  genuinamente compartilham.

  Nada disso é novo comportamento: são funções que já
  existiam em Code.gs, só movidas pra cá durante a
  modularização (ver Instruções.txt, item 50 — mover sem
  duplicar, sem deixar duas versões da mesma função).
=====================================================*/

/*-----------------------------------------------------
  DATA / HORA — validação e formatação
------------------------------------------------------*/

// dd/mm/aaaa -> valida se a data existe de verdade no calendário e
// devolve um objeto Date (só a parte da data, sem hora). Usado onde
// a coluna de destino deve guardar um Date de verdade (o motor
// genérico de Formulários faz isso hoje).
function validarDataBrParaDate_(valor, rotuloCampo) {

  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`Data inválida em "${rotuloCampo}". Use o formato dd/mm/aaaa.`);

  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);

  const data = new Date(ano, mes - 1, dia);
  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;

  if (!valida) throw new Error(`Data inválida em "${rotuloCampo}": ${texto} não existe no calendário.`);

  return data;

}

// Mesma validação, mas devolve o texto normalizado dd/mm/aaaa em vez
// de um Date — usado onde a célula precisa ficar como texto puro
// (Exclusão de Disciplinas, hoje; potencialmente outros no futuro).
function validarDataBrTexto_(valor, rotuloCampo) {

  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`Data inválida em "${rotuloCampo}". Use o formato dd/mm/aaaa.`);

  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);

  const data = new Date(ano, mes - 1, dia);
  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;

  if (!valida) throw new Error(`Data inválida em "${rotuloCampo}": ${texto} não existe no calendário.`);

  const doisDigitos = n => String(n).padStart(2, "0");
  return `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;

}

function validarHoraHhMm_(valor, rotuloCampo) {
  const texto = String(valor || "").trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(texto)) {
    throw new Error(`Horário inválido em "${rotuloCampo}". Use o formato hh:mm (24 horas).`);
  }
  return texto;
}

// Converte o valor de uma célula (pode vir como Date do Sheets, como
// texto já formatado, ou vazia) pro formato dd/mm/aaaa usado nos
// campos de texto do cliente.
function formatarCelulaData_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, TIMEZONE, "dd/MM/yyyy");
  }
  const texto = String(valor).trim();
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto) ? texto : texto;
}

// Idem, mas pro formato hh:mm.
function formatarCelulaHora_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, TIMEZONE, "HH:mm");
  }
  return String(valor).trim();
}

// Grava um valor como texto puro numa célula, forçando o formato "@"
// antes do setValue — necessário porque o Sheets, por padrão,
// reinterpreta strings "parecidas com data" (inclusive coisas como
// "2026/2") como um valor de Data/Hora de verdade, mesmo quando o
// valor chega via Apps Script (não só digitação manual). Se a coluna
// tiver um "tipo de coluna" travado (recurso do Sheets que impede
// mudar o formato daquela coluna inteira), a chamada de
// setNumberFormat lança erro — não deixamos isso travar o
// salvamento: tentamos, e se falhar, gravamos mesmo assim (quem lê
// depois — formatarCelulaData_/formatarCelulaHora_/
// formatarSemestreAaaaS_ — sabe reconstruir o texto original mesmo
// que a célula acabe virando um Date por causa dessa trava).
function gravarCelulaTexto_(range, valorTexto) {
  try {
    range.setNumberFormat("@");
  } catch (err) {
    Logger.log("Não consegui forçar texto puro numa célula (provável 'tipo de coluna' travando o formato): " + err);
  }
  range.setValue(valorTexto);
}

/*-----------------------------------------------------
  SEMESTRE "aaaa/s" — usado hoje pela Colação de Grau;
  função genérica o bastante pra qualquer formulário
  futuro que precise do mesmo formato.
------------------------------------------------------*/

// Aceita "aaaas" (5 dígitos corridos) ou "aaaa/s" (com barra) — o
// dígito de semestre só pode ser 1 ou 2. Devolve sempre "aaaa/s".
// "rotulo" só entra na mensagem de erro, pra identificar de qual
// campo se trata quando mais de um formulário usa essa checagem.
function normalizarSemestreAaaaS_(valor, rotulo) {

  const texto = String(valor || "").trim();
  const m = texto.match(/^(\d{4})\/?([12])$/);

  if (!m) {
    throw new Error(
      `${rotulo} inválido. Digite no formato aaaas ou aaaa/s (ex: "20262" ou "2026/2").`
    );
  }

  return `${m[1]}/${m[2]}`;

}

// Idem a formatarCelulaData_/formatarCelulaHora_, mas pro padrão
// "aaaa/s": se a célula já tiver virado um Date (efeito colateral do
// Sheets auto-detectando "2026/2" como data ano/mês antes da
// proteção de texto puro existir), reconstrói "aaaa/s" a partir do
// ano/mês do próprio Date em vez de mostrar a data crua pro usuário.
function formatarSemestreAaaaS_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return `${valor.getFullYear()}/${valor.getMonth() + 1}`;
  }
  return String(valor).trim();
}

/*-----------------------------------------------------
  SEMESTRE (bloco Abertura/Encerramento de 4 campos) —
  usado pelo motor genérico de Formulários E pelo
  Formulário de Exclusão de Disciplinas.
------------------------------------------------------*/

function semestreVazio_(sem) {
  return !sem.aberturaData && !sem.aberturaHora && !sem.fechamentoData && !sem.fechamentoHora;
}

function semestreCompleto_(sem) {
  return !!(sem.aberturaData && sem.aberturaHora && sem.fechamentoData && sem.fechamentoHora);
}

/*-----------------------------------------------------
  CABEÇALHOS — versão RIGOROSA de mapearCabecalhos_
  (que continua em Code.gs, tolerante, pro domínio de
  badges). Esta aqui EXIGE que cada cabeçalho da lista
  exista, exatamente com esse nome, e recusa se houver
  duplicata — é o que Regras Curriculares usa, conforme
  Instruções.txt item 2 e 23.
------------------------------------------------------*/

function mapearCabecalhosObrigatorios_(aba, cabecalhosObrigatorios) {

  const ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) {
    throw new Error(`A aba "${aba.getName()}" está vazia (sem linha de cabeçalho).`);
  }

  const linhaCabecalho = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];
  const mapa = {};
  const contagem = {};

  linhaCabecalho.forEach((titulo, indice) => {
    const chave = String(titulo || "").trim();
    if (!chave) return;
    contagem[chave] = (contagem[chave] || 0) + 1;
    // Em caso de duplicata, mantém a primeira ocorrência no mapa —
    // mas o erro abaixo já recusa a operação antes de isso importar.
    if (!mapa[chave]) mapa[chave] = indice + 1;
  });

  const duplicados = Object.keys(contagem).filter(k => contagem[k] > 1);
  if (duplicados.length > 0) {
    throw new Error(
      `A aba "${aba.getName()}" tem cabeçalho(s) duplicado(s): ${duplicados.join(", ")}. ` +
      `Corrija a planilha (cada cabeçalho precisa ser único) antes de continuar.`
    );
  }

  const faltando = cabecalhosObrigatorios.filter(c => !mapa[c]);
  if (faltando.length > 0) {
    throw new Error(
      `A aba "${aba.getName()}" está sem o(s) cabeçalho(s) obrigatório(s): ${faltando.join(", ")}. ` +
      `Confira se o nome está exatamente igual ao esperado (sem espaços extras, maiúsculas/minúsculas corretas).`
    );
  }

  return mapa;

}
