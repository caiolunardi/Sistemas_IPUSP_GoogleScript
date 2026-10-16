# Testes locais — Formulário de Exclusão de Disciplinas

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam só dados sintéticos.

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com Google simulado: login, `ID_INDEX`, período (1º/2º semestre, retificação, fechado, Contínuo, linha ausente, datas como Data), pré-preenchimento com ano de ingresso, histórico agrupado pelo Pedido ID, cadastro de disciplinas, validações, gravação em A–P numa escrita, Q–T intocadas, recibo, trava, logs e diagnóstico. |
| `testar_navegador.js` | Página com os `include_` resolvidos em Chromium: texto do requerimento, disciplinas pelo código, turma, aviso de disciplina já pendente, validação, envio, telas de bloqueio e sucesso, tema, contraste, Central de Ajuda e larguras de 360 a 1280 px. |

```bash
node testar_backend.js
node testar_navegador.js [pasta-para-capturas]   # requer Playwright com Chromium
```

As capturas versionadas ficam em [docs/sistemas/exclusao-disciplinas/evidencias/1.1](../../../../docs/sistemas/exclusao-disciplinas/evidencias/1.1/README.md). Sem rede, a marca USP do tema claro é servida por `assets/usp/logo-usp-preto.svg`.

Os dois scripts também conferem o [ambiente de homologação](../../../../docs/sistemas/AMBIENTE_DE_HOMOLOGACAO.md): leitura da coluna `Homologação` com `AMBIENTE` = `homologacao`, erro sem volta para a produção e a faixa de aviso na página.
