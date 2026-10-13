# Testes locais — Grade Horária visual

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (códigos fictícios, "Docente Teste N", IDs inventados).

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com `SpreadsheetApp`/`PropertiesService`/`CacheService`/`HtmlService`/`Utilities` simulados: `ID_INDEX` lido pelo título das colunas (`ID de Produção` em D), semestre da grade atual pelo nome do arquivo, lista de anteriores (só linhas com ID e semestre AAAA/S, sem o atual, repetido = última linha, ordem decrescente, rótulo "AAAA - Xº Semestre"), regras do que entra (SIM, não Prática, semestre ideal 1–10, dia útil, horário válido), outros cursos fora e outras unidades dentro, botões por paridade + extras, Sala pelo título, tipos antigos e novos, cache, recusas sem abrir nada, mensagens e logs sem ID, diagnóstico e ausência de IDs na fonte. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos, backend simulado e `html2canvas`/`jsPDF` locais, em Chromium: grade atual por padrão, faixa da grade exibida, botões, seletor (ordem e rótulos), troca de semestre sem servidor, aviso de semestre vazio e de horário fora do quadro, escape de HTML, cores, ficha (conteúdo, ×, Esc, Tab, Enter, clique fora, retorno de foco), PDF (uma página por semestre, nome com o semestre), grade anterior (carga, etiqueta, semestre mantido, falha sem perder a tela), Central de Ajuda, contraste ≥ 4,5:1 nos dois temas, marcas, tema Sistema/persistência/mudança com a página aberta e 360/390/480/768/1024/1280 px sem rolagem horizontal da página e com alvos ≥ 44 px. |

```bash
node testar_backend.js
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP e as bibliotecas de PDF do CDN são substituídos por versões locais durante o teste. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
