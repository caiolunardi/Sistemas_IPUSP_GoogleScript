# Testes locais — Painel dos servidores

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (formulários e rulesets fictícios, contadores inventados).

| Script | O que confere |
|---|---|
| `testar_navegador.js` | Página montada com os `include_` resolvidos e `google.script.run` simulado, em Chromium: três modos de tema, persistência e mudança do sistema com a página aberta; marcas; contraste de texto ≥ 4,5:1 nas telas, menu, abas, modais, Regras Curriculares e Central de Ajuda; card Pessoas do IPUSP (posição, nome, endereço, teclado); avisos de pendência, inclusive depois de usar a busca; menu lateral (abre por padrão, `aria-current`, botões Voltar) e abas (`tablist`/`tab`/`tabpanel`, setas, Home/End, Enter); modais de Formulários, Colação e Exclusão; Central de Ajuda (seção contextual, busca com e sem acento, FAQ, atalhos, manual das Regras, ESC, foco, rolagem); 360/390/480/768/1024 px sem rolagem horizontal, menu recolhido em tela estreita e alvos ≥ 44 px; movimento reduzido; ausência de erros de JavaScript. |

```bash
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP é substituído por um retângulo de mesmo tamanho durante o teste. `window.open` é interceptado, então nenhum sistema real é aberto. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
