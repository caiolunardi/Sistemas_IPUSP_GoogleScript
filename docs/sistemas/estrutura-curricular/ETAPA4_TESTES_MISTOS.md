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

As imagens são desenhadas no Chromium com a **Liberation Serif 2.1.5** (`LiberationSerif-Regular.ttf` do pacote `fonts-liberation` 1:2.1.5-3, SHA-256 `705903ae…74fb65`), carregada como `FontFace` a partir do arquivo, e não com as fontes do computador. Sem o arquivo conferido, a suíte não roda (código 2) e a CI fica vermelha. Ver a seção 6.1 sobre como essa fonte foi fixada.

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

O `ci.yml` ganhou, no job "Estrutura Curricular", quatro passos:

1. o download do modelo `por.traineddata` de `raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0`, conferido com `sha256sum -c` pelo mesmo hash fixado em `LeitorPdfFontes.html`;
2. `testar_pdf_ocr_sintetico.js`, que antes era só local;
3. o download do `fonts-liberation_2.1.5-3_all.deb` (arquivo do Ubuntu), com o pacote e a `LiberationSerif-Regular.ttf` conferidos pelo SHA-256 (seção 6.1);
4. `testar_pdf_misto_sintetico.js`.

Se o modelo ou a fonte não baixar, ou um hash não conferir, o passo falha. Não há pulo silencioso.

Resultado no GitHub Actions do PR #26:

- o download do modelo, o da fonte e o `testar_pdf_ocr_sintetico.js` passam (4/4);
- a geração do PDF misto é idêntica à local;
- a suíte do PDF misto **reprova**, pelo achado da seção 6.2: 27 passaram e 4 falharam no run 39855238224.

Os resultados locais acima valem para o ambiente local.

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

### 6.1 Fonte das imagens: correção feita na CI do PR #26

A primeira rodada do PR #26 no GitHub Actions reprovou o `testar_pdf_ocr_sintetico.js`. A segunda leitura dos números deu `0 4 0 2 1 0 2`, e o esperado era `4 0 2 1 0 2`. Esse teste desenhava a imagem com `60px Arial, Helvetica, sans-serif`, e cada máquina resolve essa fonte de um jeito. Localmente era a Liberation Sans; no executor da CI era outra.

Ao procurar a causa, achei um defeito no gerador do PDF misto. Ele declarava desenhar com a Liberation Sans do `pdfjs-dist`, mas só carregava a fonte quando `document.fonts.check('10px "LiberationFixture"')` era falso. Para uma família desconhecida, o `check` devolve **verdadeiro** (conferido no Chromium 141), e por isso a fonte nunca era carregada. As imagens saíam na fonte padrão do Chromium: neste computador, a Liberation Serif; em outra máquina, outra fonte. A calibração da seção 6 e os resultados da seção 5 foram obtidos, sem eu saber, com a **Liberation Serif**.

Correções, só em arquivos de teste e na CI:

1. **Gerador:** o `jupiter_sintetico.js` agora procura a face pelo nome e a carrega de fato.
2. **Fonte do PDF misto:** a suíte usa a Liberation Serif 2.1.5 por arquivo conferido.
   - Vale o primeiro arquivo que existir e conferir: `testes/fontes/` ou `/usr/share/fonts/truetype/liberation/`.
   - Na CI, o pacote `fonts-liberation_2.1.5-3_all.deb` é baixado do arquivo do Ubuntu, e o pacote e a fonte são conferidos pelo SHA-256.
   - Com ela, o PDF gerado é **byte a byte o mesmo** da primeira rodada local (SHA-256 `62a33448…69d82`). O documento avaliado nas seções 2 a 6 não mudou, e o esperado também não.
3. **Fonte do OCR sintético:** `testar_pdf_ocr_sintetico.js` passou a desenhar com a `LiberationSans-Regular.ttf` do `pdfjs-dist`, carregada como `FontFace`. O esperado (`4 0 2 1 0 2`) não mudou.
4. **Rasterização do desenho.** Mesmo com a fonte fixa, a CI continuou gerando outros bytes: 34.283 bytes contra 42.623 locais.
   - **Primeiras tentativas, sem efeito na CI.** O canvas por software (`willReadFrequently`) e um `fonts.conf` próprio para o Chromium do desenho não mudaram os bytes. O `fonts.conf` ficou (`fontconfig_desenho.js`), porque neutraliza o antialias desligado pela máquina, o que conferi localmente.
   - **Causa achada.** Um registro das larguras do texto mostrou métricas inteiras na CI (365) e fracionárias aqui (366,88). O Chromium sem tela escolhe o hinting das fontes pela máquina.
   - **Correção.** Com `--font-render-hinting=none` no Chromium que desenha, a CI passou a gerar o mesmo PDF local.
   - **Prova.** Com `HINTING_DESENHO=full`, reproduzi localmente os mesmos 34.283 bytes (`53d1d4c2…`) e a mesma falha da CI.

**Achado:** com o mesmo documento desenhado em **Liberation Sans** a 9 pt, o OCR erra nas duas versões do PDF.js, de forma idêntica. O teste foi feito trocando, numa rodada local temporária, só o arquivo de fonte.

- **Leitura:** na 2ª leitura da página 2 aparece um `7` a mais no início, e o CH `75` de `TST0301` sai como `15`.
- **Interpretação:**
  - o `LeitorPdfJupiter` atribui errado os dois últimos requisitos: `requisitos[4]` e `requisitos[5]` diferem do esperado;
  - a conferência registra subtotais e totais de seção que não conferem;
  - **não há aviso** (`avisos` continua vazio).
- **Resultado:** a suíte reprovou 8 testes, porque o resultado diferiu do esperado. Nenhuma diferença acadêmica passou em silêncio pelo teste.

Isso confirma, para outra fonte, os riscos residuais 1 e 2 da seção 6. A precisão do OCR depende da tipografia da digitalização, e o leitor não transforma toda divergência numérica em aviso próprio.

Não é diferença entre o 3.11.174 e o 6.4.299: o resultado foi igual nas duas versões. Também não ajustei o esperado nem o documento para essa fonte. Tentei ainda 10 pt, só para entender o problema, e foi pior: as colunas, separadas por 30 pt, emendaram números (`71200`). Essa tentativa foi revertida.

### 6.2 Achado na CI do PR #26: a leitura da página 1 depende do hinting de fontes da máquina

Depois da seção 6.1, a CI gera exatamente o mesmo PDF misto que o ambiente local: SHA-256 `62a33448…`, conferido no log. O que muda entre as máquinas é a **leitura**.

A página 1 tem texto em Helvetica não incorporada. O leitor a desenha com o PDF.js a 300 dpi e a passa ao OCR.

- **6.4.299:** pede `"Helvetica"` ao sistema, e o desenho usa a fonte da máquina com o hinting da máquina.
- **3.11.174:** usa a fonte substituta do próprio PDF.js. Ela também passa pelo hinting que o Chromium escolhe.

| Ambiente | 3.11.174 | 6.4.299 |
|---|---|---|
| Local: fontconfig sem hinting, "Helvetica" = Liberation Sans | igual ao esperado | igual ao esperado |
| CI, run 39855238224: "Helvetica" = Liberation Sans, `hintstyle` slight do sistema | igual ao esperado | **errado** (detalhes abaixo) |
| CI, run 39854073159: igual ao anterior e sem fixar o hinting do Chromium | **errado** (detalhes abaixo) | **errado** |
| Local, reprodução com o fontconfig da CI (hinting slight e subpixel) | igual ao esperado | **errado**, igual à CI (62.497 pixels escuros) |
| Local, só subpixel, sem hinting | igual ao esperado | igual ao esperado |
| Local, `HINTING_LEITURA=full` | **errado** (requisitos) | igual ao esperado |

**Erros do 6.4.299 no ambiente da CI:**

- a 2ª leitura da página 1 traz um `7` a mais;
- o `LeitorPdfJupiter` desloca os números das disciplinas: códigos, nomes, créditos, CH, CP e vínculos das seis primeiras saem errados, e as duas últimas somem;
- a conferência mostra linhas, subtotais e totais que não batem, mas não há aviso próprio.

**Erros do 3.11.174 com hinting `full`:**

- o `7` a mais também aparece;
- todos os requisitos ficam atribuídos à disciplina errada;
- não há **aviso nem divergência na conferência**: é um erro silencioso para o usuário.

Conclusões:

1. **O resultado acadêmico do OCR de uma página com fonte não incorporada depende do ambiente de fontes da máquina, nas duas versões.** O fator que pesou foi o hinting: só o subpixel não mudou nada.
2. **No ambiente da CI, o 6.4.299 erra onde o 3.11.174 acerta.** É uma diferença de comportamento da migração, e foi detectada.
3. Com hinting completo, o 3.11.174, que está em produção, erra sem aviso.
4. As máquinas da equipe (Windows ou macOS) têm outro motor de fontes, que não foi testado. Nenhum destes cenários prova como será lá.

O que **não** fiz:

- não afrouxei asserções;
- não mudei o esperado;
- não alterei o leitor nem o carregamento do PDF.js;
- não fixei o ambiente da leitura para esconder a diferença.

Com isso, **a CI do PR #26 fica vermelha** nesta suíte, pelos testes "A · 6.4.299" (2ª leitura e resultado acadêmico) e "A: 3.11.174 × 6.4.299". Também reprova "B: 3.11.174 × 6.4.299": no cenário B, o resultado acadêmico é igual nas duas versões, mas o pacote completo difere nos campos de processo da conferência (`numerosLidos`, `numerosCorrigidos`, `subtotaisRecuperados`, `itens`). A asserção de pacote completo idêntico foi definida antes da execução e não foi relaxada. O que fazer com isso é decisão do responsável.

Para investigar localmente:

- `HINTING_LEITURA=full node testar_pdf_misto_sintetico.js` fixa o hinting do Chromium que lê;
- `FONTCONFIG_FILE=<arquivo>` troca as regras de fontes.

## 7. Limites

A aprovação destes testes **não** significa que:

- todos os PDFs reais do Júpiter foram validados (o layout é inferido do código, seção 2);
- o OCR funcionará bem com qualquer digitalização: as imagens aqui são limpas, sem ruído, inclinação ou compressão;
- todos os ambientes de fontes darão o mesmo resultado. Na CI, o 6.4.299 errou a página 1 (seção 6.2), e as máquinas Windows e macOS da equipe não foram testadas;
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
| `testes/testar_pdf_ocr_sintetico.js` | desenho com fonte e hinting fixados (seção 6.1) |
| `testes/fontconfig_desenho.js` | fontconfig próprio do Chromium que desenha as imagens |
| `testes/ambiente_navegador.js` | `abrirNavegador` aceita argumentos extras do Chromium |
| `.github/workflows/ci.yml` | modelo do OCR e fonte das imagens conferidos, e os dois testes de OCR |
| `.gitignore`, `testes/.gitignore` | `testes/fontes/` fora do Git |

Não foram tocados `src/` (nenhum arquivo do sistema), o `LeitorPdfJupiter`, o `PainelImportacao.html`, o carregamento do PDF.js, regras, planilhas, Script Properties, permissões nem o Google.
