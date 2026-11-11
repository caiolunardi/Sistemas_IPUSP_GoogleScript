# Testes — Formulário de Pedido de Colação de Grau 2.0

Dados 100% fictícios (nº USP `9000000+`, e-mails de teste da lista de `ferramentas/publicos.json`, `@exemplo.invalid`). Nada aqui toca o Google.

| Suíte | Como rodar | O que cobre |
| --- | --- | --- |
| `testar_backend.js` | `node testar_backend.js` | servidor com o Apps Script simulado (`simulacao.js`): autorização, duplicidade, concorrência, documentos, prazo, recuperação, recibo, homologação, escritor único |
| `testar_navegador.js` | `node testar_navegador.js [pasta-de-capturas]` | página em Chromium (Playwright) com `google.script.run` simulado e os `include_` resolvidos; desde a 2.1, tema Sistema/Claro/Escuro (persistência e mudança do sistema), contraste medido (texto 4,5:1, borda 3:1), marcas por tema, Central de Ajuda (abrir, foco preso, ESC, busca sem acento, FAQ, gatilhos), teclado nos grupos Sim/Não e larguras de 360/390/480/768/1280 px nos dois temas |

A simulação reproduz o apóstrofo inicial do Sheets (texto gravado sem ele), `appendRow`, pastas e arquivos do Drive, `ScriptLock` (livre ou ocupado), relógio controlado (fuso de São Paulo) e falhas injetadas em qualquer gravação (`amb.falhar`). Os IDs (`*_FICTICIO_*`) são inventados.

Os nomes T-AUT, T-DUP, T-CON, T-DOC, T-PRZ e T-REC são os do plano. O que só dá para provar no Google está em [HOMOLOGACAO.md](../../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md#versão-200-pr-3-do-plano--testes-locais-e-roteiro-no-google).
