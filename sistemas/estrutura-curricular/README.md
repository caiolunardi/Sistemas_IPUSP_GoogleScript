# Estrutura Curricular e Grade Horária — 1.12.1

Web App interno do Serviço de Graduação do IPUSP. Importa a estrutura do Júpiter, mantém ajustes operacionais, prepara a grade e acompanha o preenchimento pelas secretarias.

A versão no código (`VERSAO_SISTEMA` em `Codigo.gs`) é a **1.12.1** (22/10/2026: leitor de PDF no PDF.js 6.4.299 com biblioteca e worker conferidos por SHA-384, sobre a 1.12.0 da base única `DISCIPLINAS`); o que mudou em cada versão desde a 1.10.0 está no [índice da documentação](../../docs/sistemas/estrutura-curricular/README.md). A fonte parte do pacote **1.9.3 auditado**, com a camada visual **1.10.0**. Abre com menu lateral e permite alternar para abas, com ícones Lucide, brilho discreto e elevação no hover. Os controladores de negócio e as regras do servidor permanecem iguais à baseline; `Codigo.gs` muda apenas a versão.

**Em PR, sem versão (23/10/2026):** proteção B2 do OCR em `LeitorPdf.html`, `PainelImportacao.html` e `EstruturaAjuda.html`; os outros 32 arquivos de `src/`, inclusive todos os `.gs`, ficam idênticos ([Proteção B2](../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md)).

**Estado:** código e verificações locais versionados. Implantação e homologação desta versão no Google Workspace ainda pendentes. Código publicado no Git não atualiza automaticamente o `/exec`.

| Pasta/arquivo | Conteúdo |
|---|---|
| [`src/`](src/) | 35 arquivos para a raiz do projeto Apps Script do Web App |
| [`planilha-grade/`](planilha-grade/README.md) | `Validacoes.gs` 1.1 e `Protecao.gs`, para o projeto vinculado à planilha das secretarias; implantação separada ([documentação da planilha](../../docs/sistemas/planilha-grade-secretarias/README.md)) |
| [`testes/`](testes/README.md) | simulador de Apps Script, testes de servidor e Chromium com dados sintéticos |
| [`LICENCA_ICONES.txt`](LICENCA_ICONES.txt) | licença do catálogo Lucide Static 1.55.0 |

Comece pelo [índice completo da documentação](../../docs/sistemas/estrutura-curricular/README.md). Para atualizar um projeto existente, siga [Instalação e atualização](../../docs/sistemas/estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md). Para retomar o trabalho em outra conversa, leia [Manutenção e continuidade](../../docs/sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md).

Os IDs operacionais são configurados fora do Git, por `ID_INDEX_SPREADSHEET_ID` e pelas chaves do índice. Este pacote não inclui `.clasp.json`, credenciais ou planilhas de produção.
