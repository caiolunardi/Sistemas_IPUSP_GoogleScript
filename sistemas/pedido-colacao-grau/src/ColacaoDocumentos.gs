/*=====================================================
  DOCUMENTOS — conferência no servidor e gravação na entrada

  Lista positiva (decisão D11, a validar no Apps Script real):
  PDF, JPEG e PNG, reconhecidos pelos primeiros bytes do
  conteúdo (o tipo e o nome informados pelo navegador não
  contam), até 10 MB cada e 5 por envio. Tudo é conferido
  ANTES de gravar qualquer coisa.

  Todo arquivo entra na subpasta do protocolo, dentro de
  PASTA_PROVISORIOS_COLACAO (sem acesso dos alunos). Quem leva
  os arquivos para a pasta do aluno é o encaminhador do
  Gerenciador de Diplomas (moveTo, mesmo ID). Este projeto
  nunca manda arquivo para a lixeira, nunca renomeia nem move
  arquivo antigo.

  Nome dos arquivos novos:
    <Tipo> - <nome> - <AAAAS> - <protocolo> - v<n>.<ext>
  (nunca coincide com o nome gerado pelo Gerenciador.)
=====================================================*/

const TIPOS_DOCUMENTO_COLACAO = {
  RG: { rotulo: "RG-CIN", obrigatorio: true },
  CERTIDAO: { rotulo: "Certidão de Nascimento", obrigatorio: true }
};

const FORMATOS_COLACAO = [
  { formato: "PDF", mime: "application/pdf", ext: "pdf", assinatura: [0x25, 0x50, 0x44, 0x46, 0x2D] },
  { formato: "JPEG", mime: "image/jpeg", ext: "jpg", assinatura: [0xFF, 0xD8, 0xFF] },
  { formato: "PNG", mime: "image/png", ext: "png", assinatura: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
];

function formatoPorConteudoColacao_(bytes) {
  return FORMATOS_COLACAO.find(f => bytes.length >= f.assinatura.length &&
    f.assinatura.every((b, i) => (bytes[i] & 0xFF) === b)) || null;
}

function hexSha256Colacao_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(b => ((b & 0xFF) + 0x100).toString(16).slice(1)).join("");
}

/**
 * Confere os documentos enviados pela página, sem gravar nada.
 * @param {Array} lista [{tipo, ordem, base64}]
 * @return {Array} [{tipo, ordem, bytes, formato, mime, ext, sha256, tamanho}]
 */
function validarDocumentosColacao_(lista) {
  if (lista == null) return [];
  if (!Array.isArray(lista)) throw erroColacao_("DOCUMENTO_INVALIDO", "Documentos em formato inesperado. Recarregue a página e tente de novo.");
  if (lista.length > COLACAO.MAX_ARQUIVOS) {
    throw erroColacao_("DOCUMENTO_INVALIDO", `Envie no máximo ${COLACAO.MAX_ARQUIVOS} arquivos por vez.`);
  }
  const vistos = {};
  const limiteBase64 = Math.ceil(COLACAO.MAX_ARQUIVO_BYTES / 3) * 4 + 8;
  return lista.map(item => {
    const tipo = String(item && item.tipo || "");
    if (!Object.prototype.hasOwnProperty.call(TIPOS_DOCUMENTO_COLACAO, tipo)) {
      throw erroColacao_("DOCUMENTO_INVALIDO", "Tipo de documento não reconhecido.");
    }
    const ordem = Number(item.ordem || 1);
    if (!Number.isInteger(ordem) || ordem < 1 || ordem > COLACAO.MAX_ARQUIVOS) {
      throw erroColacao_("DOCUMENTO_INVALIDO", "Documento em formato inesperado. Recarregue a página e tente de novo.");
    }
    if (vistos[tipo + ":" + ordem]) throw erroColacao_("DOCUMENTO_INVALIDO", "Documento repetido no mesmo envio.");
    vistos[tipo + ":" + ordem] = true;
    const rotulo = TIPOS_DOCUMENTO_COLACAO[tipo].rotulo;
    const base64 = item.base64;
    if (typeof base64 !== "string" || !base64) throw erroColacao_("DOCUMENTO_INVALIDO", `O arquivo de ${rotulo} está vazio.`);
    if (base64.length > limiteBase64) {
      throw erroColacao_("DOCUMENTO_INVALIDO", `O arquivo de ${rotulo} passa de 10 MB. Envie um arquivo menor.`);
    }
    let bytes;
    try {
      bytes = Utilities.base64Decode(base64);
    } catch (erro) {
      throw erroColacao_("DOCUMENTO_INVALIDO", `Não foi possível ler o arquivo de ${rotulo}.`);
    }
    if (!bytes || bytes.length === 0) throw erroColacao_("DOCUMENTO_INVALIDO", `O arquivo de ${rotulo} está vazio.`);
    if (bytes.length > COLACAO.MAX_ARQUIVO_BYTES) {
      throw erroColacao_("DOCUMENTO_INVALIDO", `O arquivo de ${rotulo} passa de 10 MB. Envie um arquivo menor.`);
    }
    const formato = formatoPorConteudoColacao_(bytes);
    if (!formato) {
      throw erroColacao_("DOCUMENTO_INVALIDO", `O arquivo de ${rotulo} precisa ser PDF, JPG ou PNG.`);
    }
    return {
      tipo: tipo, ordem: ordem, bytes: bytes, formato: formato.formato, mime: formato.mime,
      ext: formato.ext, sha256: hexSha256Colacao_(bytes), tamanho: bytes.length
    };
  });
}

function nomeArquivoColacao_(doc, nome, colacao, protocolo, versao) {
  const limpar = t => String(t || "").replace(/[\u0000-\u001F\u007F\/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  const nomeSeguro = limpar(nome).slice(0, 120) || "Sem nome";
  return `${TIPOS_DOCUMENTO_COLACAO[doc.tipo].rotulo} - ${nomeSeguro} - ${colacao} - ${protocolo} - v${versao}.${doc.ext}`;
}

/** Subpasta do protocolo (reaproveita se já existir uma só com o nome). */
function pastaDoProtocoloColacao_(protocolo) {
  const raiz = DriveApp.getFolderById(obterIdColacao_(COLACAO.CHAVES.PASTA_PROVISORIOS, "folder"));
  const existentes = raiz.getFoldersByName(protocolo);
  const achadas = [];
  while (existentes.hasNext()) achadas.push(existentes.next());
  if (achadas.length === 1) return achadas[0];
  if (achadas.length > 1) throw new Error("Mais de uma pasta com o mesmo protocolo na entrada.");
  return raiz.createFolder(protocolo);
}

function chaveDocumentoColacao_(chaveEnvio, tipo, ordem) {
  return chaveEnvio + ":" + tipo + ":" + ordem;
}
