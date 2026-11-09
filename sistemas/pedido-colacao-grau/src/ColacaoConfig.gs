/*=====================================================
  PEDIDO DE COLAÇÃO DE GRAU 2.0 — configuração comum

  Projeto Apps Script autônomo, executado como a conta
  institucional ("Executar como: eu", USER_DEPLOYING) e com
  acesso restrito ao domínio. Os alunos não recebem acesso a
  nenhuma planilha nem pasta: quem lê e grava é o projeto.

  Recursos, só pelas chaves lógicas do ID_INDEX (nenhum ID no
  código). Script Properties: ID_INDEX_SPREADSHEET_ID e, na
  homologação, AMBIENTE = homologacao.

    PEDIDOS_COLACAO           (spreadsheet) grava PROTOCOLOS,
                              VERSOES, DOCUMENTOS e EVENTOS;
                              lê DECISOES_CADASTRO e
                              ENCAMINHAMENTOS, quando existirem.
    PASTA_PROVISORIOS_COLACAO (folder) entrada de todos os
                              documentos, uma subpasta por
                              protocolo.
    PLANILHA_ALUNOS           (spreadsheet) só leitura.
    PERIODOS                  (spreadsheet) só leitura.
    EMISSAO_DIPLOMAS          (spreadsheet) só leitura (regra de
                              correção D3).

  Este projeto NUNCA grava na aba Diplomas nem na planilha
  central de alunos: quem leva o pedido à aba Diplomas é o
  encaminhador do Gerenciador de Colação de Grau e Diplomas
  (PR 4 do plano). Um escritor por recurso.
=====================================================*/

const COLACAO = {
  VERSAO: "2.0.0",
  FUSO: "America/Sao_Paulo",
  DOMINIO: "usp.br",
  CHAVES: {
    PEDIDOS: "PEDIDOS_COLACAO",
    PASTA_PROVISORIOS: "PASTA_PROVISORIOS_COLACAO",
    ALUNOS: "PLANILHA_ALUNOS",
    PERIODOS: "PERIODOS",
    DIPLOMAS: "EMISSAO_DIPLOMAS"
  },
  ABA_ALUNOS: "Página1",
  ABA_DIPLOMAS: "Diplomas",
  IDENTIFICADOR_PERIODO: "Pedido de Colação de Grau",
  ESPERA_TRAVA_MS: 30000,
  MAX_ARQUIVO_BYTES: 10 * 1024 * 1024,
  MAX_ARQUIVOS: 5,
  MINUTOS_PEDIDO_PARADO: 15,
  INTERVALO_REENVIO_RECIBO_S: 120
};

// Abas de PEDIDOS_COLACAO. As quatro primeiras são escritas só por
// este projeto; as duas últimas são de outros projetos e aqui só
// lidas (se ainda não existirem, contam como vazias).
const ABAS_PEDIDOS = {
  PROTOCOLOS: {
    nome: "PROTOCOLOS",
    colunas: ["Protocolo", "Protocolo ID", "Chave de envio", "E-mail da sessão", "Recebimento",
      "Cadastro", "Motivo do cadastro", "Recebido em", "Recebimento concluído em", "Colação",
      "Janela do período", "Semestre do período", "Nº USP informado", "Nome informado",
      "Registro ID", "Pasta do protocolo"]
  },
  VERSOES: {
    nome: "VERSOES",
    colunas: ["Protocolo ID", "Versão", "Chave de envio", "E-mail da sessão", "Situação",
      "Enviada em", "Concluída em", "Dados do pedido"]
  },
  DOCUMENTOS: {
    nome: "DOCUMENTOS",
    colunas: ["Documento ID", "Protocolo ID", "Versão", "Chave do documento", "Tipo",
      "ID do arquivo", "Origem", "Documento de origem", "SHA-256", "Tamanho (bytes)",
      "Formato", "Situação", "Registrado em"]
  },
  EVENTOS: {
    nome: "EVENTOS",
    colunas: ["Quando", "Protocolo ID", "Versão", "Evento", "Campos alterados"]
  }
};

const ABAS_SO_LEITURA = {
  DECISOES_CADASTRO: "DECISOES_CADASTRO",
  ENCAMINHAMENTOS: "ENCAMINHAMENTOS"
};

/*----------------------------------------------------
  Ambiente (produção ou homologação)
----------------------------------------------------*/

function ambienteColacao_() {
  const bruto = String(PropertiesService.getScriptProperties().getProperty("AMBIENTE") || "producao")
    .trim().toLowerCase();
  if (bruto === "producao" || bruto === "produção") return "producao";
  if (bruto === "homologacao" || bruto === "homologação") return "homologacao";
  throw new Error("AMBIENTE inválido nas Script Properties (use producao ou homologacao).");
}

function prefixoAmbienteColacao_() {
  return ambienteColacao_() === "homologacao" ? "[HOMOLOGAÇÃO] " : "";
}

/*----------------------------------------------------
  ID_INDEX: chave lógica → ID, na coluna do ambiente.
  Na homologação usa só a coluna "Homologação", sem
  recorrer à de produção.
----------------------------------------------------*/

let idsDaExecucaoColacao_ = null;

function obterIdColacao_(chave, tipoEsperado) {
  if (!idsDaExecucaoColacao_) idsDaExecucaoColacao_ = {};
  if (idsDaExecucaoColacao_[chave]) return idsDaExecucaoColacao_[chave];
  const props = PropertiesService.getScriptProperties();
  const idIndice = String(props.getProperty("ID_INDEX_SPREADSHEET_ID") || "").trim();
  if (!idIndice) throw new Error("Configuração ausente: ID_INDEX_SPREADSHEET_ID.");
  const homologacao = ambienteColacao_() === "homologacao";
  const indice = SpreadsheetApp.openById(idIndice);
  const aba = indice.getSheetByName("Página1") || indice.getSheets()[0];
  if (!aba) throw new Error("ID_INDEX sem abas.");
  const linhas = aba.getDataRange().getValues();
  if (linhas.length < 2) throw new Error("ID_INDEX sem dados.");
  const titulos = linhas[0].map(normalizarTituloColacao_);
  const cChave = titulos.indexOf("chave");
  const cTipo = titulos.indexOf("tipo");
  const cId = homologacao ? titulos.findIndex(t => t.indexOf("homologacao") === 0) : titulos.indexOf("id de producao");
  if (cChave < 0 || cId < 0) throw new Error("Colunas obrigatórias ausentes no ID_INDEX.");
  const achadas = linhas.slice(1).filter(l => String(l[cChave] || "").trim() === chave);
  if (achadas.length !== 1) throw new Error("Chave ausente ou duplicada no ID_INDEX: " + chave);
  if (cTipo >= 0 && normalizarTituloColacao_(achadas[0][cTipo]) !== normalizarTituloColacao_(tipoEsperado)) {
    throw new Error("Tipo incorreto no ID_INDEX para: " + chave);
  }
  const id = String(achadas[0][cId] || "").trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) {
    throw new Error("ID ausente ou inválido no ID_INDEX para: " + chave + (homologacao ? " (homologação)" : ""));
  }
  idsDaExecucaoColacao_[chave] = id;
  return id;
}

/*----------------------------------------------------
  Utilidades
----------------------------------------------------*/

function normalizarTituloColacao_(valor) {
  return String(valor == null ? "" : valor).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizarEmailColacao_(valor) {
  return String(valor || "").replace(/[\s ​-‍﻿]+/g, "").toLowerCase();
}

// Texto livre para célula de planilha: sem caracteres de controle e
// sem começar por = + - @ (não vira fórmula).
function textoSeguroColacao_(valor, limite) {
  let texto = valor == null ? "" : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  texto = texto.slice(0, limite || 500);
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto;
}

function agoraIsoColacao_(data) {
  return Utilities.formatDate(data || new Date(), COLACAO.FUSO, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
}

function dataHoraLegivelColacao_(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}:${m[6]}` : "";
}

function colacaoLegivel_(codigo) {
  const m = String(codigo || "").match(/^(\d{4})(\d)$/);
  return m ? `${m[1]}/${m[2]}` : String(codigo || "");
}

// Mensagem de erro sem e-mail, nº USP nem IDs, para o registro de
// execução.
function mensagemSeguraColacao_(erro) {
  return String((erro && erro.message) || erro || "erro")
    .replace(/[^\s@]+@[^\s@]+/g, "<e-mail>")
    .replace(/[A-Za-z0-9_-]{25,}/g, "<id>")
    .replace(/\d{5,}/g, "<número>")
    .slice(0, 300);
}

// Erro mostrado à pessoa: a mensagem é a que ela vê; o código
// distingue os casos nos testes e no registro.
function erroColacao_(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigoColacao = codigo;
  return erro;
}

const MENSAGENS_COLACAO = {
  SEM_IDENTIFICACAO: "Não foi possível identificar a sua conta. Entre com a sua conta institucional @usp.br no navegador (saia das outras contas Google, se for preciso) e abra a página de novo.",
  INDISPONIVEL: "Não foi possível concluir agora. Tente de novo em alguns minutos; se continuar, avise o Serviço de Graduação.",
  OCUPADO: "Muitos envios ao mesmo tempo. Aguarde alguns segundos e envie de novo: o seu pedido não será duplicado.",
  NAO_ENCONTRADO: "Pedido não encontrado entre os seus pedidos."
};
