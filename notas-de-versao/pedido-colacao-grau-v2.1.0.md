**Formulário de Pedido de Colação de Grau** — versão 2.1.0, de 10/11/2026 (em PR, sobre a 2.0.0).

Interface no padrão GRADIP (PR 7 do plano). A página ganha o cabeçalho institucional com as marcas do IPUSP e da USP, o seletor **Aparência** (Sistema, Claro ou Escuro, salvo só no navegador) e cores que vêm dos tokens do tema comum, com contraste conferido nos dois modos. A **Central de Ajuda** abre pelo botão do topo ou por links ao lado de cada tela ("Como preencher?", "Quais documentos enviar?", "Por que isso aparece?", "Quando posso pedir?", "O que significa cada situação?"), com busca que ignora acentos e perguntas frequentes. É estática: não consulta o servidor. Inclui "O pedido não foi aprovado", que acompanha o aviso de rejeição com o motivo, trazido da 2.0.

Campos, textos operacionais, telas, validação e chamadas ao servidor são os da 2.0. Os grupos Sim/Não passam a funcionar pelo teclado (Tab e setas), e a opção escolhida mostra uma marca ✓ além da cor. No servidor, só foi acrescentada a função `include_`, que junta à página os arquivos do tema, das marcas e da ajuda.

O que copiar para o Apps Script: tudo de `sistemas/pedido-colacao-grau/src/`, agora com sete arquivos `.html` novos (`GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `ColacaoAjuda`, `ColacaoAjudaEstilos`, `ColacaoAjudaUI`).

**Implantação:** não homologada nem implantada. Vai à produção junto com a 2.0 e os PRs 4 e 5 (virada única, D13). Esta nota não cria tag nem Release.

Detalhes: [docs/sistemas/pedido-colacao-grau/](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/pedido-colacao-grau/AJUDA.md).
