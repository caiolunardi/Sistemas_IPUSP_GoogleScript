# Etapa 4 — testes complementares com PDF sintético misto

Estrutura Curricular · 22/10/2026 · só testes, sem mudança no sistema (a versão continua 1.12.1).

Relatório da migração: [ETAPA4_PDFJS_MIGRACAO.md](ETAPA4_PDFJS_MIGRACAO.md).

## 1. Por que estes testes

A [seção 7 da Etapa 4](ETAPA4_PDFJS_MIGRACAO.md#7-conferência-com-pdfs-reais-do-júpiter-responsável-no-computador-autorizado) previa comparar as duas versões do PDF.js com PDFs reais do Júpiter. O responsável não tem esses documentos disponíveis agora. Por isso a validação foi feita com um **documento sintético representativo**, sem dado real nenhum.

O objetivo é mostrar, nos cenários exercitados, que a diferença de desenho com fonte não incorporada (achada no PR #25) não muda o resultado acadêmico lido pelo `LeitorPdfFontes` e interpretado pelo `LeitorPdfJupiter`.

**Isto não comprova compatibilidade com os PDFs reais do Júpiter.** A seção 7 continua valendo quando houver documentos.

## 2. O PDF sintético misto

O PDF é gerado por `testes/jupiter_sintetico.js`, de forma determinística: gerado duas vezes na mesma execução, dá os mesmos bytes. Localmente, o arquivo tem 153.298 bytes, com SHA-256 `62a33448…69d82`.

Todos os dados são inventados:

- curso `99001` (Curso Sintético de Teste);
- currículo `99001 0100 261` (habilitação 100, 2026, 1º semestre);
- disciplinas `TST0101` … `TST0511`;
- rodapé `USP/STI - 22/10/2026 10:00 - Pág. n / 3`.

| Página | Conteúdo | Como é feita |
|---|---|---|
| 1 | Cabeçalho, linha de colunas, seção Obrigatórias, `TST0101` e `TST0102` (período 1), Subtotal, `TST0201` (período 2) e o requisito dela | **Texto selecionável** em Helvetica **não incorporada** (WinAnsi), 9 pt. É a condição em que o 6.x desenha diferente do 3.11.174. |
| 2 | Continuação do grupo do período 2 (`TST0205`, com dois requisitos ligados por "ou"), Subtotal, `TST0301` (dois requisitos "e") e `TST0308` (período 3, EXT 5), Subtotal e Total Obrigatórias | **Imagem** em tons de cinza, 2480×3508 px (300 dpi), sem camada de texto |
| 3 | Seção Optativas Eletivas: `TST0510`, `TST0511` (ATPA 10, "Requisito fraco"), Subtotal e Total | **Imagem**, como a página 2 |

As imagens são desenhadas no Chromium com a `LiberationSans-Regular.ttf` do `pdfjs-dist` fixado no `package-lock.json`, e não com as fontes do computador.

Na camada de texto há 436 / 0 / 0 caracteres por página. Pela regra atual (`MIN_FRACAO_PAGINAS_COM_TEXTO = 0.5`, sem mudança), o leitor escolhe o **OCR para as três páginas**.

Os números exercitam:

- zeros (a maioria das células);
- `1`, `5` e `8`, que o OCR costuma confundir com letras;
- `10`, `60`, `75`, `90`, `120` e `330`;
- códigos com `0` depois das letras (`TST0…`).

**De onde veio o layout.** Ele segue as expressões regulares e os comentários de `src/LeitorPdf.html`:

- cabeçalho `Curso:` / `Complemento:` / `Currículo:`;
- linha `Disciplina Aula Trab. Tot. CH CE CP EXT ATPA Ideal` e linha `Créditos Per.`;
- seções `Disciplinas …`;
- linhas `CÓDIGO(VERSÃO) Nome`;
- `Requisito - …`, `Requisito fraco - …` e `ou`;
- `Subtotal:` e `Total …:`;
- o rodapé.

Posições, tamanhos de letra e espaçamentos foram escolhidos aqui e **podem ser diferentes do relatório real**. Lacunas deixadas de propósito, para não inventar sintaxe do Júpiter:

- o pontilhado entre o nome e os números (seção 6);
- a legenda do rodapé;
- a situação do currículo entre parênteses;
- as páginas de "Informações Básicas do Currículo";
- a seção Optativas Livres, cujo período no relatório real não está documentado.

## 3. Resultado esperado (escrito à mão)

O arquivo é `testes/esperado_jupiter_sintetico.js`. Ele foi escrito a partir da tabela inventada, antes das execuções, e não foi ajustado depois.

| Código | Nome | Versão | Aula | Trab. | CH | CE | CP | EXT | ATPA | Tipo | Período |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TST0101 | Fundamentos Sintéticos I | 1 | 4 | 0 | 60 | 0 | 0 | 0 | 0 | Obrigatória | 1 |
| TST0102 | Métodos Fictícios | 2 | 2 | 1 | 60 | 0 | 0 | 0 | 0 | Obrigatória | 1 |
| TST0201 | Laboratório Sintético | 1 | 0 | 2 | 60 | 0 | 8 | 0 | 0 | Obrigatória | 2 |
| TST0205 | Estatística Fictícia | 1 | 4 | 0 | 60 | 0 | 0 | 0 | 0 | Obrigatória | 2 |
| TST0301 | Pesquisa Sintética | 1 | 3 | 1 | 75 | 0 | 0 | 0 | 0 | Obrigatória | 3 |
| TST0308 | Seminário Fictício | 1 | 1 | 0 | 15 | 0 | 0 | 5 | 0 | Obrigatória | 3 |
| TST0510 | Tópicos Fictícios | 1 | 2 | 0 | 30 | 0 | 0 | 0 | 0 | Optativa eletiva | 5 |
| TST0511 | Oficina Sintética | 1 | 1 | 1 | 45 | 0 | 0 | 0 | 10 | Optativa eletiva | 5 |

Requisitos ("ou" = mesmo grupo):

- `TST0201` ← `TST0101`(1), grupo 1;
- `TST0205` ← `TST0102`(2) **ou** `TST0101`(1), grupo 1;
- `TST0301` ← `TST0201`(1), grupo 1, **e** `TST0205`(1), grupo 2;
- `TST0511` ← `TST0301`(1), "Requisito fraco", grupo 1.

Também se espera:

- os 4 subtotais e os 2 totais conferem;
- 0 números a conferir e nenhum aviso;
- `geradoEm` 2026-10-22T10:00;
- currículo `990010100261`, com habilitação "Habilitação Sintética".

## 4. Como a comparação é feita

O teste é `testes/testar_pdf_misto_sintetico.js` e roda na CI desde este PR. As duas versões usam o mesmo Chromium, o mesmo arquivo e o mesmo modelo do Tesseract (tessdata_fast 4.1.0, com SHA-256 conferido). Cada versão roda com o comportamento natural dela:

- **3.11.174:** o leitor congelado (`prototipo-pdfjs/referencia/`), com o pacote do npm conferido por `preparar.js --referencia`;
- **6.4.299:** o leitor atual.

Há dois cenários de fontes. Nenhum deles força as duas versões a usar a mesma fonte:

- **A:** as fontes do sistema, como estão.
- **B:** um fontconfig temporário que leva "Helvetica" a outra fonte instalada (DejaVu Sans, aqui). O teste confere que o cenário mudou mesmo a fonte do 6.4.299: os pixels da página 1 ficam diferentes dos do cenário A.

O que o teste exige:

- **leitura:**
  - modo `ocr`;
  - 3 páginas de 595×842, todas passando pelo OCR;
  - 2ª leitura só de dígitos (`tokensNumericos`) com **exatamente** os números da tabela, na ordem;
  - nenhum erro de JavaScript;
- **interpretação:** o resultado do `LeitorPdfJupiter` **igual ao esperado** (seção 3), campo a campo: códigos, nomes, versões, créditos, CH, CE, CP, EXT, ATPA, tipos, períodos e sua confirmação, requisitos, grupos, conferência e avisos;
- **entre versões:** o pacote do `LeitorPdfJupiter` **inteiro** igual nas duas versões e a mesma 2ª leitura dos números;
- **registrado sem reprovar** (só diagnóstico, impresso a cada execução):
  - palavras do OCR que mudam entre versões, uma a uma e com a confiança;
  - confiança média por página;
  - fontes pedidas ao canvas;
  - pixels escuros da página 1;
  - como o OCR escreveu cada código.

O arquivo `saida/misto_sintetico_registro.json` guarda esse registro.

## 5. Resultados

### Local (22/10/2026, Chromium 141.0.7390.37, Node 22.22.0)

`node testar_pdf_misto_sintetico.js`: **31 passaram, 0 falharam**.

| | Cenário A (fontes do sistema) | Cenário B ("Helvetica" → DejaVu Sans) |
|---|---|---|
| Fontes pedidas, página 1 | 3.11.174: `g_dN,sans-serif` · 6.4.299: `"Helvetica",g_dN,sans-serif` | as mesmas |
| Pixels escuros da página 1 (300 dpi) | 62.231 × 62.231 (iguais) | 62.231 × **68.982** (diferença de 6.751) |
| Palavras do OCR diferentes entre versões | nenhuma | só na página 1: `Júpiter`(93) → `)`(34) `úpiter`(93); `Tot.` → `Tot`; `(0)`(72) → `0`(88), duas vezes |
| 2ª leitura dos números | igual nas 3 páginas | igual nas 3 páginas |
| Confiança média por página (3.11.174 / 6.4.299) | 92 / 91,8 / 92,3 nas duas | página 1: 92 → 91,8; páginas 2 e 3 iguais |
| Resultado do `LeitorPdfJupiter` | igual ao esperado nas duas versões; pacotes idênticos | igual ao esperado nas duas versões; pacotes idênticos |

As palavras que mudaram no cenário B não afetam o resultado acadêmico:

- o título é ignorado pelo leitor;
- `Tot` é aceito como rótulo da coluna;
- `(0)` e `0` são lidos como zero, e a 2ª leitura dá os mesmos números.

Como o OCR escreveu os códigos (nas duas versões e nos dois cenários): da 3ª disciplina em diante saiu `TSTO201(1)`, com a letra O no lugar do zero. O `LeitorPdfJupiter` corrige isso pelo formato do código, como já fazia com os PDFs reais.

### Mutações temporárias

`node mutacoes_pdf_misto.js` aplica cada mutação numa cópia de `src/`, ou do próprio teste, num diretório temporário. **Todas as 8 reprovaram a suíte (código 1)**:

| Mutação | Testes reprovados |
|---|---|
| limiar de texto 0,5 → 0,3 (o leitor escolhe a camada de texto) | 8 |
| o OCR deixa de ler a última página | 6 |
| código de disciplina alterado (último dígito) | 4 |
| crédito-trabalho +1 | 4 |
| "Requisito fraco" deixa de ser reconhecido (requisito some) | 4 |
| "ou" deixa de juntar requisitos (grupo muda) | 4 |
| comparador entre versões sempre vazio | 10 |
| comparador com o esperado sempre vazio | 10 |

Além disso, a cada execução, 10 controles conferem que o comparador acusa estas alterações, tanto contra o esperado quanto entre versões:

- modo texto em vez de OCR;
- página a menos;
- código trocado;
- código perdido;
- crédito-trabalho errado;
- período errado;
- requisito perdido;
- "ou" virando "e";
- aviso a mais;
- subtotal que não confere.

### CI

O `ci.yml` ganhou, no job "Estrutura Curricular", três passos:

1. o download do modelo `por.traineddata` de `raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0`, conferido com `sha256sum -c` pelo mesmo hash fixado em `LeitorPdfFontes.html`;
2. `testar_pdf_ocr_sintetico.js`, que antes era só local;
3. `testar_pdf_misto_sintetico.js`.

Se o modelo não baixar ou o hash não conferir, o passo falha. Não há pulo silencioso.

## 6. Achados da calibração do documento

Antes de fixar o documento, gerei algumas variantes para ter um OCR legível nas duas versões. As tentativas foram estas, sempre com o leitor atual (6.4.299):

| Variante | O que aconteceu |
|---|---|
| Prefixo `ZZZ` (o habitual dos dados fictícios do repositório), 8 pt, com pontilhado | O OCR leu `ZZZ` como `Z77`, `ZZ2`, `Z22`. O parser aceitou **códigos só de dígitos errados** (ex.: `2770101`), porque o formato `\d{7}` também é válido. O pontilhado virou letras e entrou nos nomes. |
| Prefixo `SIN`, 8 pt, sem pontilhado | Uma linha `SIN0O201` (8 caracteres) foi descartada. **O requisito dela foi atribuído à disciplina anterior**, sem nenhum aviso: a única pista foi um Subtotal que não conferiu. Conferido também com o 3.11.174, com resultado idêntico. |
| Prefixo `SIN`, 9 pt | O mesmo problema na página 2 (imagem), com `SIN0O205`. |
| Prefixos `KXW` e `GRD`, 9 pt | O OCR inseriu um `O` entre as letras e o zero (`KXWO0205`, `GRDO0O101`), e as linhas foram descartadas. |
| Prefixos `SIM` e `TST`, 9 pt | Nenhuma linha perdida. Escolhi `TST` ("teste"). |

Essas variações vêm do OCR (Tesseract com tessdata_fast) e do formato do código, não da versão do PDF.js. Elas não reprovam a migração, mas são **riscos residuais do leitor**, registrados para decisão. Não mudei o `LeitorPdfJupiter`, porque a mudança está fora do escopo autorizado:

1. Uma linha de disciplina perdida pelo OCR faz os requisitos seguintes caírem na disciplina anterior, sem aviso próprio. Hoje aparece só como "subtotal não confere" na conferência.
2. Código só de dígitos lido de um código com letras é aceito como válido.

Os dois reforçam que **a primeira importação com documento real deve ter conferência humana** antes de aceitar o resultado.

## 7. Limites

A aprovação destes testes **não** significa que:

- todos os PDFs reais do Júpiter foram validados (o layout é inferido do código, seção 2);
- o OCR funcionará bem com qualquer digitalização: as imagens aqui são limpas, sem ruído, inclinação ou compressão;
- todos os ambientes de fontes darão o mesmo resultado: foram exercitados dois cenários, e o desenho da página 1 muda com as fontes;
- o HtmlService do Google foi homologado;
- o sistema está autorizado para implantação em produção.

Na implantação controlada, a primeira importação com documento real deve receber conferência humana antes de os resultados serem aceitos.

## 8. Arquivos

| Arquivo | Papel |
|---|---|
| `testes/jupiter_sintetico.js` | layout e gerador do PDF misto |
| `testes/esperado_jupiter_sintetico.js` | resultado acadêmico esperado, escrito à mão |
| `testes/testar_pdf_misto_sintetico.js` | a suíte (CI) |
| `testes/mutacoes_pdf_misto.js` | as 8 mutações temporárias (local) |
| `.github/workflows/ci.yml` | modelo do OCR conferido e os dois testes de OCR |

Não foram tocados `src/` (nenhum arquivo do sistema), o `LeitorPdfJupiter`, o `PainelImportacao.html`, o carregamento do PDF.js, regras, planilhas, Script Properties, permissões nem o Google.
