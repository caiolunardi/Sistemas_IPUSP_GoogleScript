# Testes locais — Busca de Alunos

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (nomes inventados, números `9000000+`, e-mails `@exemplo.invalid`).

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com `SpreadsheetApp`/`PropertiesService`/`HtmlService`/`Session`/`LockService`/`Utilities` simulados: lista (campos, `linha`, `ingresso`, sem `ID da Pasta`), títulos de coluna, configuração do índice, ficha (colunas, somente leitura, fórmulas, permissão de edição, linha conferida), gravação (só o que mudou, tipo numérico, conflito, validações, limites, trava), PDF (escape, nome, limites), diagnóstico e ausência de logs com dados. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos e um backend simulado no navegador, em Chromium: busca, destaque, limite 60, erro; filtro por ano/semestre de ingresso; exportação CSV e PDF (downloads reais); ficha do aluno (abrir, editar, salvar, validação, foco, ESC, conta sem permissão); três modos de tema, persistência e mudança do sistema com a página aberta; marcas; contraste (texto ≥ 4,5:1, borda do campo ≥ 3:1); Central de Ajuda; 360/390/480/768 px sem rolagem horizontal e com alvos ≥ 44 px. |

```bash
node testar_backend.js
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP é substituído por um retângulo de mesmo tamanho durante o teste, para não depender da rede. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
