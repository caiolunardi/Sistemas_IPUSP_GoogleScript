# Testes locais — Busca de Alunos

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (nomes inventados, números `9000000+`, e-mails `@exemplo.invalid`).

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com `SpreadsheetApp`/`PropertiesService`/`HtmlService` simulados: lista devolvida só com os quatro campos, linhas vazias ignoradas, propriedade ausente, chave ausente, ID vazio, aba `Página1` ou primeira aba, coluna faltando, planilha vazia, `doGet` por template, `include_` e diagnóstico sem dados pessoais. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos e `google.script.run` simulado, em Chromium: busca (ordem livre, sem acento, limite 60, e-mail secundário, vazio, erro), destaque, três modos de tema, persistência, mudança do sistema com a página aberta, marcas por tema, contraste (texto ≥ 4,5:1; borda do campo ≥ 3:1), Central de Ajuda (gatilhos, busca, FAQ, ESC, foco, scroll) e 360/390/480/768 px sem rolagem horizontal e com alvos ≥ 44 px. |

```bash
node testar_backend.js
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP é substituído por um retângulo de mesmo tamanho durante o teste, para não depender da rede. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
