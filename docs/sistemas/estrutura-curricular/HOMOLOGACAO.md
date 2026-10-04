# Homologação — Estrutura Curricular e Grade Horária 1.8.0

> **Importante:** esta página registra o que o pacote/descritivo **declara ter sido testado**. A auditoria independente do ZIP ainda não foi executada nesta conversa. Portanto, os números abaixo não são apresentados como verificação independente.

## Situação declarada

O documento recebido informa que, em 04/10/2026, a 1.7.0 estava instalada e a 1.8.0 havia sido testada localmente, ainda sem implantação/homologação final no `/exec`.

## Suítes declaradas

| Suíte | Testes declarados |
|---|---:|
| `testar_backend.js` | 42 |
| `testar_gravacao.js` | 57 |
| `testar_preparacao.js` | 34 |
| `testar_envio_grade.js` | 31 |
| `testar_auditoria_grade.js` | 19 |
| `testar_painel_auditoria.js` | 19 |
| `testar_navegador.js` | 19 |
| `testar_navegador_preparacao.js` | 25 |
| `testar_visual.js` | 24 |
| `testar_dois_arquivos.js` | 7 |
| `testar_pdf_texto.js` | descrito como OK |

O pacote também descreve simulador de APIs Apps Script e Chromium real via Playwright.

## O que os testes locais não provam

O próprio descritivo ressalva comportamento real do Google Sheets em falha parcial, `Session.getActiveUser`, permissões, cotas/tempo, acionadores reais, cálculo real de fórmula, rede USP para bibliotecas, exatidão de OCR sem segunda fonte e outros efeitos dependentes do serviço Google.

## Homologação real mínima

Antes de considerar 1.8.0 implantada, verificar no `/exec`/Sheets real:

1. identificação e perfis ADMINISTRADOR/LEITOR;
2. acesso via `ID_INDEX` sem IDs expostos;
3. importação CSV e PDF;
4. OCR na rede institucional, quando necessário;
5. revisão humana;
6. preparação etapas 1–4;
7. backup real do Drive;
8. envio para as seis abas;
9. fórmula M no locale real;
10. `Validacoes.gs` na Tabela real;
11. acionadores de edição e abertura;
12. painel de auditoria 1.8.0;
13. ausência de links/IDs indevidos no cliente;
14. Light/Dark e viewports críticos.

## Próxima etapa deste repositório

A auditoria independente vai confrontar o ZIP de código com o descritivo, revisar segurança, funções públicas, gravação, envio, acionadores, interface e testes. Só depois o snapshot será promovido para `sistemas/estrutura-curricular/src/`.
