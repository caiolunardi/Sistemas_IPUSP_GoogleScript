/*=====================================================================
  ESTRUTURA CURRICULAR — Serviço de Graduação (IPUSP)
  Web App em Google Apps Script (projeto independente)

  PARA QUE SERVE
  Primeira etapa do novo sistema de Grade Horária. O painel:
    1. importa a estrutura curricular do Júpiter — o CSV ou o PDF do
       relatório "Grade Curricular" (Estrutura Curricular › Relatórios);
    2. grava tudo na planilha ESTRUTURA_CURRICULAR (localizada pela
       chave de mesmo nome na planilha mestre ID_INDEX), criando as abas
       na primeira vez;
    3. mostra as disciplinas com busca, filtros e uma ficha completa de
       cada disciplina, além dos currículos e do histórico de importações.

  ARQUIVOS DO PROJETO (todos na raiz do projeto Apps Script)
    Backend
      Codigo.gs         este arquivo: página (doGet) e include_
      Configuracao.gs   Propriedades do script e planilha ID_INDEX
      Acesso.gs         quem pode consultar / importar
      Esquema.gs        abas e colunas da planilha (criação e reparo)
      Planilha.gs       leitura e escrita das abas pelo título das colunas
      Importacao.gs     validação, prévia e plano das importações
      Gravacao.gs       gravação segura: preparação, ativação e recuperação
      Preparacao.gs     preparação da grade: ajustes manuais, exclusão,
                        disciplinas para outros cursos e seleção
      Consulta.gs       dados enviados ao painel
      Utilidades.gs     funções auxiliares
    Página
      Painel.html              estrutura da página
      PainelEstilos.html       aparência (tokens GRADIP, claro/escuro)
      PainelApp.html           lista, busca, filtros, ficha, currículos, histórico
      PainelImportacao.html    tela de importação (leitura, prévia, gravação)
      PainelPreparacao.html    etapas 2 e 3 (outros cursos, lista para a grade),
                               edição da ficha e importação da lista por unidade
      LeitorComum.html         formato do "pacote de importação"
      LeitorCsv.html           leitura do CSV do Júpiter
      LeitorPdf.html           leitura do PDF do Júpiter (a partir das palavras)
      LeitorPdfFontes.html     palavras do PDF: camada de texto (PDF.js) ou OCR (Tesseract.js)
      GradipTema.html, GradipTemaControle.html, GradipMarcaIPUSP.html, GradipMarcaUSP.html
                               tema e marcas compartilhados dos sistemas GRADIP

  CONFIGURAÇÃO: ver Configuracao.gs (Propriedades do script).
  IMPLANTAÇÃO: Implantar › Nova implantação › App da Web
    - Executar como: Eu (a conta que tem acesso às planilhas).
    - Quem pode acessar: Qualquer pessoa da Universidade de São Paulo.
    A autorização de verdade é feita no servidor (Acesso.gs).
=====================================================================*/

/**
 * Versão do sistema, mostrada no fim da página do painel ("Estrutura
 * Curricular · versão …"): serve para conferir qual código está
 * implantado. Suba o número a cada nova implantação.
 */
var VERSAO_SISTEMA = '1.11.1';

/**
 * Ponto de entrada do Web App: devolve a página do painel.
 * A página abre vazia (com "Carregando…") e pede os dados ao servidor
 * com obterDadosPainel() — é lá que o acesso é verificado. Nenhum dado
 * da base vai embutido no HTML.
 * @param {Object} e  parâmetros da URL (não usados).
 * @return {HtmlOutput}
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Painel')
    .evaluate()
    .setTitle('Estrutura Curricular — Serviço de Graduação')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Inclui o conteúdo de outro arquivo HTML do projeto (usado em Painel.html). */
function include_(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}
