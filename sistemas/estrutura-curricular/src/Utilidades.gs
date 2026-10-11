/*=====================================================================
  UTILIDADES — funções pequenas usadas por todo o backend
  (texto, e-mails, datas, departamentos, hash, respostas de erro)
=====================================================================*/

/** Fuso fixo de São Paulo (não depender do fuso do projeto). */
var FUSO_HORARIO = 'America/Sao_Paulo';

/*---------------------------------------------------------------------
  Respostas para o navegador
  Toda função pública (chamada por google.script.run) devolve
    { ok: true, dados: ... }  ou  { ok: false, erro: "mensagem", codigo }
  Mensagens de erro são orientações para a pessoa; detalhes técnicos
  vão só para o registro de execução (sem dados pessoais nem IDs).
---------------------------------------------------------------------*/
/**
 * Executa fn() e embrulha o resultado no formato de resposta acima.
 * Erros "amigáveis" (erroAmigavel_) voltam com a própria mensagem;
 * qualquer outro erro é registrado (só nome da função + pilha) e volta
 * como mensagem genérica, sem detalhes internos.
 * @param {string} nomeFuncao  usado apenas no registro de execução.
 * @param {function(): *} fn
 * @return {{ok: boolean, dados: *}|{ok: boolean, erro: string, codigo: string}}
 */
function executarComSeguranca_(nomeFuncao, fn) {
  try {
    return { ok: true, dados: fn() };
  } catch (e) {
    if (e && e.amigavel) {
      var resposta = { ok: false, erro: e.message, codigo: e.codigo };
      if (e.dados !== undefined) resposta.dados = e.dados;   // (1.8.5) ex.: o que ficou gravado num salvamento pendente
      return resposta;
    }
    console.error(nomeFuncao + ' falhou: ' + (e && e.stack ? e.stack : e));
    return {
      ok: false,
      codigo: 'INESPERADO',
      erro: 'Ocorreu um erro inesperado. Tente de novo em alguns instantes; se continuar, avise quem mantém o sistema.'
    };
  }
}

/**
 * Erro com mensagem que pode ser mostrada na tela.
 * @param {string} codigo  identificador estável (ex.: SEM_ACESSO,
 *   CONFIGURACAO, PACOTE_INVALIDO) que o painel pode usar para decidir
 *   o que mostrar; a lista completa está na documentação (REGRAS.md).
 * @param {string} mensagem  orientação para a pessoa, sem IDs nem detalhes técnicos.
 */
function erroAmigavel_(codigo, mensagem) {
  var e = new Error(mensagem);
  e.amigavel = true;
  e.codigo = codigo;
  return e;
}

/*---------------------------------------------------------------------
  Texto
---------------------------------------------------------------------*/

/** Tira acentos e cedilha ("Período" → "Periodo"); null/undefined → "". */
function semAcento_(texto) {
  return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Troca qualquer sequência de espaços (inclusive o não separável) por um espaço e apara as pontas. */
function normalizarEspacos_(texto) {
  return String(texto == null ? '' : texto).replace(/[\s ]+/g, ' ').trim();
}

/** Chave de comparação de títulos de coluna: sem acento, minúscula, espaços únicos. */
function chaveTitulo_(texto) {
  return semAcento_(normalizarEspacos_(texto)).toLowerCase();
}

/** Remove caracteres de controle e limita o tamanho (entrada vinda do navegador). */
function limparTexto_(valor, maximo) {
  if (valor == null) return null;
  var t = normalizarEspacos_(String(valor).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''));
  if (maximo && t.length > maximo) t = t.slice(0, maximo);
  return t;
}

/** Igual a limparTexto_, mas preserva quebras de linha (textos longos). */
function limparTextoLongo_(valor, maximo) {
  if (valor == null) return null;
  var t = String(valor).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  t = t.split('\n').map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); }).filter(Boolean).join('\n');
  if (maximo && t.length > maximo) t = t.slice(0, maximo);
  return t;
}

/**
 * Prepara um texto para ir a uma célula SEM ser reinterpretado pela
 * planilha. O apóstrofo inicial é o marcador de "texto" do Google
 * Sheets: ele não aparece na célula nem no valor lido depois. Usado
 * quando o texto parece número, data, hora, porcentagem, booleano ou
 * fórmula (ex.: códigos 0420130, currículo 470120100262, "2026/2",
 * nomes que começam com "=" ou "+").
 */
function textoSeguro_(valor) {
  if (valor == null) return '';
  var t = String(valor);
  if (t === '') return '';
  if (/^[=+\-@']/.test(t) ||
      /^\s*[-+]?[\d.,]+\s*%?\s*$/.test(t) ||
      /^\s*\d{1,4}[\/\-.]\d{1,2}([\/\-.]\d{1,4})?\s*$/.test(t) ||
      /^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/.test(t) ||
      /^\s*(true|false|verdadeiro|falso)\s*$/i.test(t)) {
    return "'" + t;
  }
  return t;
}

/** Lê de volta um texto de célula (tira apóstrofo que tenha sobrado). */
function textoDaCelula_(valor) {
  if (valor == null) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') return formatarData_(valor);
  var t = String(valor);
  return t.charAt(0) === "'" ? t.slice(1) : t;
}

/** Número de célula: '' ou texto não numérico → null. */
function numeroDaCelula_(valor) {
  if (valor === '' || valor == null) return null;
  if (typeof valor === 'number') return valor;
  var t = String(valor).replace(',', '.').trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/*---------------------------------------------------------------------
  E-mails e listas de acesso
---------------------------------------------------------------------*/

/** E-mail em minúsculas e sem espaços nas pontas ("" quando vazio). */
function normalizarEmail_(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

/**
 * Lista configurada em Propriedades do script: e-mails separados por
 * vírgula, ponto e vírgula, espaço ou quebra de linha. Um item que
 * começa com "@" vale para o domínio inteiro (ex.: "@usp.br").
 */
function listaDeEmails_(texto) {
  return String(texto == null ? '' : texto)
    .split(/[\s,;]+/)
    .map(normalizarEmail_)
    .filter(function (e) { return e && (e.charAt(0) === '@' || e.indexOf('@') > 0); });
}

/**
 * O e-mail está na lista? Itens "@dominio" valem para qualquer conta
 * terminada nesse domínio; os demais precisam ser iguais ao e-mail.
 * @param {string} email
 * @param {string[]} lista  resultado de listaDeEmails_().
 */
function emailNaLista_(email, lista) {
  email = normalizarEmail_(email);
  if (!email) return false;
  return lista.some(function (item) {
    if (item.charAt(0) === '@') return email.slice(-item.length) === item;
    return item === email;
  });
}

/*---------------------------------------------------------------------
  Datas (sempre no fuso de São Paulo)
---------------------------------------------------------------------*/

/** Date → "dd/MM/yyyy". */
function formatarData_(data) {
  return Utilities.formatDate(data, FUSO_HORARIO, 'dd/MM/yyyy');
}

/** Date → "dd/MM/yyyy HH:mm". */
function formatarDataHora_(data) {
  return Utilities.formatDate(data, FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

/** Valor de célula (Date ou texto) → "dd/MM/yyyy HH:mm" (ou texto original). */
function dataHoraDaCelula_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') return formatarDataHora_(valor);
  return textoDaCelula_(valor);
}

/*---------------------------------------------------------------------
  Domínio: departamentos, tipos, semestres, habilitações
---------------------------------------------------------------------*/

/**
 * Departamento pelo código da disciplina. Mesma regra da planilha
 * antiga da grade horária (abas PSA, PSC, PSE, PST, Interdepartamentais
 * e Outras Unidades): prefixo PSA/PSC/PSE/PST = departamento do IP;
 * código numérico que começa com 470 = interdepartamental do IP;
 * o resto = outra unidade da USP.
 */
var DEPARTAMENTOS = {
  PSA: 'PSA',
  PSC: 'PSC',
  PSE: 'PSE',
  PST: 'PST',
  INTER: 'Interdepartamental',
  OUTRA: 'Outra unidade'
};

/** Departamento de uma disciplina pelo código (regra descrita acima). */
function departamentoDe_(codigo) {
  var c = String(codigo || '').toUpperCase();
  var p = c.slice(0, 3);
  if (p === 'PSA' || p === 'PSC' || p === 'PSE' || p === 'PST') return DEPARTAMENTOS[p];
  if (/^470\d{4}$/.test(c)) return DEPARTAMENTOS.INTER;
  return DEPARTAMENTOS.OUTRA;
}

/** Tipo da disciplina numa habilitação: código interno → texto da planilha e do painel. */
var ROTULO_TIPO = {
  OBRIGATORIA: 'Obrigatória',
  OPTATIVA_ELETIVA: 'Optativa eletiva',
  OPTATIVA_LIVRE: 'Optativa livre'
};

/** "Obrigatória" (texto da planilha) → "OBRIGATORIA". */
function tipoDoRotulo_(rotulo) {
  var t = semAcento_(rotulo).toLowerCase();
  if (/obrigat/.test(t)) return 'OBRIGATORIA';
  if (/eletiv/.test(t)) return 'OPTATIVA_ELETIVA';
  if (/livre/.test(t)) return 'OPTATIVA_LIVRE';
  return null;
}

/** Período ímpar → 1º semestre do ano; par → 2º semestre. */
function semestreDoPeriodo_(periodo) {
  if (!periodo) return '';
  return periodo % 2 === 1 ? '1º semestre' : '2º semestre';
}

/**
 * Nome curto da habilitação: tira o nome do curso do começo
 * ("Psicologia - Bacharelado" → "Bacharelado"). Sem nome, usa o código.
 */
function nomeCurtoHabilitacao_(nome, nomeCurso, codigo) {
  var n = normalizarEspacos_(nome);
  var c = normalizarEspacos_(nomeCurso);
  if (n && c && chaveTitulo_(n).indexOf(chaveTitulo_(c) + ' - ') === 0) n = n.slice(c.length + 3).trim();
  return n || ('Habilitação ' + codigo);
}

/*---------------------------------------------------------------------
  Hash (assinatura da prévia)
---------------------------------------------------------------------*/

/**
 * SHA-256 do texto (UTF-8) em hexadecimal minúsculo. Usado para assinar
 * a prévia: a gravação só é aceita se o pacote e a base não mudaram
 * desde que a prévia foi mostrada (ver Importacao.gs).
 */
function hashTexto_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
