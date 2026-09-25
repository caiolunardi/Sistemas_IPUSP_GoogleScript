# Logotipo USP — variantes vetoriais para interfaces

Estes SVGs são derivados do arquivo vetorial disponibilizado pela
[Superintendência de Comunicação Social da USP](https://scs.usp.br/identidadevisual/logotipos/)
como **Logotipo USP — Versão Vetor (.eps)**. A fonte consultada foi
`usp-logo-eps.zip` (`usp-logo-eps.eps`; SHA-256
`99468d9904ea4a0c146ae9d3a6b05f9de6d2982f992e16ebb11531bff14ca622`).

## Arquivos

- `logo-usp-preto.svg`: marca preta, sobre fundo claro;
- `logo-usp-branco.svg`: marca branca, sobre fundo escuro.

O contorno vetorial veio do EPS institucional, convertido em PDF com
Ghostscript (`-dEPSCrop`) e extraído como SVG com Poppler (`pdftocairo -svg`).
Os dois arquivos compartilham o mesmo único caminho vetorial, o mesmo
`viewBox` e fundo transparente. Apenas a cor de preenchimento muda para
preto ou branco. Não há bitmap incorporado, filtro CSS ou dependência de rede.

As [recomendações de uso da USP](https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/logotipo_usp.pdf)
orientam o uso da marca preta e, em fundo escuro, branca, sem deformação,
efeitos ou estilização. Preserve proporção, legibilidade e área de respiro.

## Google Apps Script

Estes arquivos são ativos de referência do repositório. Um Web App em Apps
Script pode incorporar o SVG aprovado ao seu HTML para não depender do GitHub
em tempo de execução. A cópia inline deve preservar o `viewBox`, o caminho,
`fill-rule="evenodd"` e o preenchimento correspondente; não use filtros CSS
para converter uma variante na outra.

No Painel de Solicitações, a marca azul externa atualmente usada no tema
claro só deve ser substituída por decisão visual própria. A inclusão destes
ativos não altera automaticamente o Painel nem sua implantação.
