/*
 * Etapa 3 — PROTÓTIPO (não usado pelo sistema): carregamento do PDF.js em
 * módulos ES com integridade conferida de verdade, também no worker.
 *
 * O <script integrity> (SRI) não vale para import() dinâmico nem para
 * new Worker(). Aqui o navegador baixa os bytes, calcula o SHA-384 com
 * crypto.subtle e só os executa se forem exatamente os esperados: a
 * biblioteca por import() de um blob: e o worker como Worker de módulo
 * criado de outro blob:, entregue ao PDF.js por GlobalWorkerOptions.workerPort.
 * Se um dos dois não baixar ou não conferir, nada é executado.
 */
var CarregadorPdfVerificado = (function () {
  'use strict';

  function base64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  /** Baixa, confere o SHA-384 e devolve um URL blob: com os mesmos bytes. */
  function baixarConferido(parte, nome) {
    return fetch(parte.url, { credentials: 'omit', cache: 'no-store' }).then(function (resp) {
      if (!resp.ok) throw new Error('Não foi possível baixar ' + nome + ' (HTTP ' + resp.status + ').');
      return resp.arrayBuffer();
    }).then(function (dados) {
      return crypto.subtle.digest('SHA-384', dados).then(function (h) {
        var obtido = 'sha384-' + base64(h);
        if (obtido !== parte.sha384) throw new Error('Integridade: ' + nome + ' diferente do esperado.');
        return URL.createObjectURL(new Blob([dados], { type: 'text/javascript' }));
      });
    });
  }

  /**
   * cfg: { lib: { url, sha384 }, worker: { url, sha384 } }
   * @return {Promise<{ lib: módulo do PDF.js, worker: Worker }>}
   */
  function carregar(cfg) {
    return Promise.all([baixarConferido(cfg.lib, 'a biblioteca do PDF.js'), baixarConferido(cfg.worker, 'o worker do PDF.js')]).then(function (urls) {
      return import(urls[0]).then(function (lib) {
        var worker = new Worker(urls[1], { type: 'module' });
        lib.GlobalWorkerOptions.workerPort = worker;
        return { lib: lib, worker: worker };
      });
    });
  }

  return { carregar: carregar, _base64: base64 };
})();
