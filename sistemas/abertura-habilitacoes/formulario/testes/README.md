# Testes locais — formulário de Pedido de Abertura de Habilitação

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam só dados fictícios.

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com Google simulado: login, período, `ID_INDEX`, alunos, histórico, validações, gravação A–O, conferência do esquema, compatibilidade com o Gerenciador 2.1 e o Painel (lê o código deles), pedido repetido, recibo, trava, logs, homologação e os CSVs fictícios. |
| `testar_navegador.js` | Página com os `include_` resolvidos em Chromium: carga, bloqueios, validação, pendente por programa, envio, recibo, tema, contraste, teclado, Central de Ajuda e larguras de 360 a 1280 px. |

```bash
node testar_backend.js
node testar_navegador.js [pasta-para-capturas]   # requer Playwright com Chromium
```

Capturas versionadas: [docs/sistemas/abertura-habilitacoes/evidencias/formulario-2.0](../../../../docs/sistemas/abertura-habilitacoes/evidencias/formulario-2.0/README.md).
