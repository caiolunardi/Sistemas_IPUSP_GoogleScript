**Estrutura Curricular e Grade Horária** — versão 1.12.1 (sobre a 1.12.0). Etapa 4 da modernização do PDF.js.

O leitor de PDF da importação passa a usar o **PDF.js 6.4.299** (build `legacy`), no lugar do 3.11.174, que tinha um aviso de segurança conhecido (GHSA-wgrm-67xf-hhpq, mitigado no código). A biblioteca e o worker continuam vindo do jsDelivr em versão fixa, mas agora os dois são conferidos pelo SHA-384 no navegador antes de executar; se um deles vier diferente, nada é executado e a tela explica. Scripts embutidos em PDF não são executados. Para quem usa, a importação é a mesma: com o PDF sintético de teste, as palavras, as posições e o desenho da página são iguais aos do 3.11.174.

Mensagens novas, só em caso de falha: "Um componente de leitura de PDF veio diferente do esperado e não foi usado…" e "O componente de leitura de PDF não pôde ser iniciado neste navegador…". A Central de Ajuda cita essas causas.

**No Apps Script:** trocar `LeitorPdfFontes.html`, `EstruturaAjuda.html` e `Codigo.gs` (só o número da versão muda nele). Antes da produção: conferência com PDFs reais do Júpiter e homologação no Google, conforme [ETAPA4_PDFJS_MIGRACAO.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/estrutura-curricular/ETAPA4_PDFJS_MIGRACAO.md).

**Implantação:** ainda não implantada. Esta Release marca o código do repositório; ela não atualiza o Apps Script. Quando a versão for publicada no Google, edite esta Release e registre a data.

Detalhes e histórico: [docs/sistemas/estrutura-curricular/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/estrutura-curricular/README.md).
