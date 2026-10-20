# Testes locais — Painel de Solicitações

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (curso `99999`, habilitações e rulesets fictícios, disciplinas `TST*`, IDs `ID-*-FICTICIO`).

| Script | O que confere |
|---|---|
| `testar_contagem.js` | Sem navegador. `ContagemCreditos.gs` com planilhas simuladas: só currículos `ATIVO`, itens inativos fora, observação interna e IDs não vazam, rótulos e operadores do DICIONARIO, compensação SIM/NAO/vazio, cache, erro claro sem a chave no índice ou com coluna ausente, `PERIODOS` intacto. O motor (`PainelContagemMotor.html`): eletivas a mais completam livres só quando o currículo diz SIM, obrigatórias nunca recebem nem doam, branco vale zero, vírgula decimal, operador desconhecido fica sem conta, grupos `MIN_COUNT`/`MIN_CREDITS`, e o modo da planilha antiga reproduzindo as fórmulas do Excel do site. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos e `google.script.run` simulado, em Chromium: abre no menu lateral, categorias com `aria-current`, alternância para abas (`tablist`/`tab`/`tabpanel`, setas, Home/End), busca em todas as categorias, cards fechados acessíveis por teclado; página Atendimento online (menu e abas, link `wa.me` com mensagem modelo em nova aba, QR code igual ao link e atualizado, horário de São Paulo, busca por "whatsapp", atalho da Central de Ajuda); janela da contagem (marcar habilitações, uma seção por habilitação, escolha da estrutura quando há mais de uma, disciplinas ligadas por sigla, rascunho preservado, resultado por habilitação, Limpar, ESC, focus trap, retorno de foco, ajuda contextual por cima); Central de Ajuda; três modos de tema; contraste ≥ 4,5:1; 360/390/480/768/1280 px sem rolagem horizontal e alvos ≥ 44 px; movimento reduzido; ausência de erros de JavaScript. |

```bash
node testar_contagem.js
node testar_navegador.js   # requer Playwright com Chromium
```

`pagina.js` monta a página como o HtmlService montaria e simula `SpreadsheetApp`, `PropertiesService` e `CacheService`. `dados_ficticios.js` contém as planilhas inventadas. Capturas de tela vão para a pasta temporária do sistema; `node testar_navegador.js <pasta>` grava na pasta indicada (as da v1.5 estão em `docs/sistemas/painel-solicitacoes/evidencias/1.5/`).

`gerar_qr_atendimento.js` refaz `src/PainelAtendimentoQR.html` a partir de `ATENDIMENTO_ONLINE` (`Codigo.gs`); requer o pacote npm `qrcode` (`npm i -g qrcode`). Rode sempre que mudar o número ou a mensagem modelo; `testar_navegador.js` falha se o QR versionado estiver desatualizado.
