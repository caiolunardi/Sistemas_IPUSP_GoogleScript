/*=====================================================
  ANÁLISE DE HISTÓRICO ESCOLAR — Localização e leitura do
  PDF oficial na pasta do aluno.

  Só mexe em Drive depois que a pasta já foi validada por
  validarPastaGerenciada_/garantirPastaInterno_ (funções que
  já existem em DiplomasBackend.gs — reaproveitadas aqui, não
  reimplementadas). O ID do arquivo NUNCA vem do cliente:
  quem decide qual arquivo é o "histórico oficial" é sempre
  este módulo, procurando pelo nome esperado dentro da pasta
  já validada.

  Além do nome/extensão, também valida MIME real (metadata do
  Drive, nunca declarado pelo cliente) e tamanho antes de qualquer
  transporte/base64/PDF.js — ver historicoValidarMimeETamanho_.
  Qualquer uma dessas validações falhando devolve motivoIndisponivel
  exatamente como "arquivo não encontrado"/"ambíguo" — o mesmo
  mecanismo, sem caminho separado — o que garante que também vira
  CONFERIR auditado (ver HistoricoEndpoints.gs/HistoricoAuditoria.gs),
  nunca um erro silencioso.
=====================================================*/

// Localiza, dentro de uma pasta JÁ VALIDADA, o PDF que corresponde
// ao histórico oficial de uma habilitação — usando exatamente a
// mesma convenção de nome que uploadArquivo já usa em
// DiplomasBackend.gs: "${tipoArquivo} - ${nome} - ${colacao}${extensao}".
// Nunca escolhe "o primeiro parecido": 0 ou mais de 1 candidato
// sempre vira motivoIndisponivel (inconclusivo), nunca uma escolha
// arbitrária.
function historicoLocalizarArquivo_(pastaValidada, nome, colacao, chaveHabilitacao) {

  const cfg = historicoConfigHabilitacao_(chaveHabilitacao);
  const prefixoEsperado = `${cfg.tipoArquivoInfos} - ${nome} - ${colacao}`;
  const prefixoComparacao = prefixoEsperado.trim().toLowerCase();

  const candidatos = [];
  const iterador = pastaValidada.getFiles();

  while (iterador.hasNext()) {
    const arquivo = iterador.next();
    const nomeArquivo = arquivo.getName();

    // Mesmo filtro que listarArquivosPasta_ já usa pra recados
    // internos — não são documento do aluno.
    if (nomeArquivo.startsWith("Observações - ")) continue;

    const semExtensao = historicoRemoverExtensao_(nomeArquivo);
    if (semExtensao.trim().toLowerCase() === prefixoComparacao) {
      candidatos.push(arquivo);
    }
  }

  if (candidatos.length === 0) {
    return {
      arquivo: null,
      motivoIndisponivel: `Histórico oficial não localizado (esperado um arquivo "${prefixoEsperado}.pdf" na pasta do aluno).`
    };
  }

  if (candidatos.length > 1) {
    return {
      arquivo: null,
      motivoIndisponivel:
        `Mais de um arquivo corresponde a "${prefixoEsperado}" na pasta do aluno — não prossegui ` +
        `pra evitar escolher o arquivo errado. Remova o duplicado antes de repetir a análise.`
    };
  }

  const arquivo = candidatos[0];
  const extensao = obterExtensao_(arquivo.getName()).toLowerCase();

  if (extensao !== ".pdf") {
    return {
      arquivo: null,
      motivoIndisponivel:
        `O arquivo "${arquivo.getName()}" foi encontrado, mas não é um PDF — a análise ` +
        `automática só processa arquivos .pdf. Substitua o arquivo pelo histórico em PDF.`
    };
  }

  const validacao = historicoValidarMimeETamanho_(arquivo.getName(), arquivo.getMimeType(), arquivo.getSize());
  if (!validacao.valido) {
    return { arquivo: null, motivoIndisponivel: validacao.motivoIndisponivel };
  }

  return { arquivo: arquivo, motivoIndisponivel: null };

}

// Validação pura de MIME/tamanho — sem falar com Drive — separada só
// pra poder ser testada isoladamente (HistoricoTestes.gs) sem
// precisar de uma pasta real. Usa sempre a metadata que o PRÓPRIO
// Drive devolve (arquivo.getMimeType()/getSize(), lidos só aqui do
// lado de fora) — nunca um MIME/tamanho declarado pelo cliente, que
// nem chega a existir neste ponto (quem localiza o arquivo é sempre
// o servidor). Reaproveita MAX_UPLOAD_BYTES já existente em
// DiplomasBackend.gs em vez de criar um segundo número mágico de
// tamanho pro mesmo projeto.
function historicoValidarMimeETamanho_(nomeArquivo, mimeType, tamanhoBytes) {

  if (mimeType !== MimeType.PDF) {
    return {
      valido: false,
      motivoIndisponivel:
        `O arquivo "${nomeArquivo}" tem extensão .pdf, mas o tipo real do arquivo no Drive (${mimeType}) ` +
        `não é PDF — pode estar corrompido ou ter sido renomeado incorretamente. Substitua pelo histórico em PDF.`
    };
  }

  if (!tamanhoBytes || tamanhoBytes <= 0) {
    return {
      valido: false,
      motivoIndisponivel: `O arquivo "${nomeArquivo}" está vazio (0 bytes) — não é possível processar.`
    };
  }

  if (tamanhoBytes > MAX_UPLOAD_BYTES) {
    return {
      valido: false,
      motivoIndisponivel:
        `O arquivo "${nomeArquivo}" (${(tamanhoBytes / (1024 * 1024)).toFixed(1)}MB) excede o tamanho máximo ` +
        `permitido (${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB) para processamento automático.`
    };
  }

  return { valido: true, motivoIndisponivel: null };

}

// obterExtensao_ já existe em DiplomasBackend.gs — só reaproveita.
function historicoRemoverExtensao_(nomeArquivo) {
  const extensao = obterExtensao_(nomeArquivo);
  return extensao ? nomeArquivo.slice(0, nomeArquivo.length - extensao.length) : nomeArquivo;
}

function historicoMontarMetadadosArquivo_(arquivo) {
  return {
    id: arquivo.getId(),
    nome: arquivo.getName(),
    tamanhoBytes: arquivo.getSize(),
    mimeType: arquivo.getMimeType(),
    modificadoEm: arquivo.getLastUpdated().toISOString()
  };
}

function historicoObterConteudoBase64_(arquivo) {
  return Utilities.base64Encode(arquivo.getBlob().getBytes());
}

// SHA-256 em hexadecimal — grava-se na auditoria junto com o ID/nome
// do arquivo pra que qualquer análise possa ser rastreada de volta
// à versão exata do documento que a gerou.
function historicoCalcularSha256Hex_(bytes) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(b => {
    const valor = b < 0 ? b + 256 : b;
    const hex = valor.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}
