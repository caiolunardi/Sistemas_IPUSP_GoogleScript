# CSV × PDF — como o Júpiter constrói cada arquivo

> Fonte atual 1.10.0 sobre baseline 1.9.3. Regras e algoritmos preservados; extensão visual documentada em [NAVEGACAO_E_VISUAL_1_10_0.md](NAVEGACAO_E_VISUAL_1_10_0.md). Registros de versões anteriores abaixo conservam seu alcance.

Comparação feita com os dois arquivos do relatório **"Grade Curricular"** gerados na mesma consulta. A consulta foi:

- JupiterWeb › Estrutura Curricular › Relatórios;
- curso 47012, currículo vigente;
- complemento em branco;
- as três obrigatoriedades;
- relatório gerado em 26/09/2026, às 22:05.

Os números abaixo foram obtidos pelos leitores do sistema e conferidos por script. No PDF, a leitura foi feita **por OCR**, porque o arquivo não tem texto.

## 1. Resumo

| | CSV | PDF |
|---|---|---|
| Como vem | texto, uma linha por (disciplina × habilitação × requisito) | relatório impresso de 38 páginas; o exemplo foi gerado por "Microsoft Print to PDF" e **não tem camada de texto** (cada letra é desenho) |
| Currículos (habilitações) | 3 | 3 |
| Disciplinas diferentes | 183 | 183 |
| Disciplina × habilitação (tipo e período) | 398 | 398 — **todas iguais** |
| Requisitos (pares disciplina → requisito) | 238 | 238 — **todos iguais** |
| Créditos, CH, CE, CP, ATPA | 1.098 números | **0 diferenças** |
| Nome da disciplina | completo | **36 cortados** (nomes longos); 142 iguais; 5 pequenas diferenças (ponto final e erros de leitura do OCR) |
| Versão da disciplina | só de quem é requisito (46) | **todas (183)**; as 46 do CSV conferem |
| Extensão (EXT) | não tem | **tem** (24 disciplinas com EXT > 0) — sem segunda fonte |
| Requisitos "ou" | não diz se é "e" ou "ou" | **diz**: 19 casos (10 disciplinas) |
| AAC do currículo | sim (horas e %) | sim (horas) |
| Informações básicas do currículo | não tem | **tem** (datas, duração, cargas exigidas, estágio, AEX, extensão, total geral, texto) |
| "Complemento" (habilitação) | certo em todas as linhas | **errado** no cabeçalho das páginas da grade |

**Conclusão adotada no sistema.**

- O **CSV é a fonte principal**: nomes completos, arquivo exato e sem OCR.
- O **PDF complementa** com versão, EXT, grupos "ou" e informações dos currículos.
- O PDF sozinho também pode criar a base, se todos os números compartilhados com o CSV estiverem coerentes com as contas do relatório (no arquivo de exemplo estavam). Nesse caso, os nomes longos ficam cortados até que o CSV seja importado, e os valores só do PDF passam por revisão humana.

## 2. O CSV

- **Arquivo:** `grade_curricular.csv`, Windows-1252 (acentos em 1 byte), sem BOM, separador `;`, quebra de linha LF.
- **Tamanho:** 482 linhas = 1 de cabeçalho + 481 de dados (398 disciplinas-habilitação + 83 linhas extras de requisitos).
- **Ordem:** Bacharelado, Psicólogo, Licenciatura. Dentro de cada um: obrigatórias, eletivas, livres, por período.

| Col. | Título | O que é, de fato (conferido nos dados) | Campo no sistema |
|---|---|---|---|
| A | Curso | `47012 - Psicologia` | curso |
| B | Complemento | habilitação, **coerente** com o currículo em todas as linhas (`0 - Psicólogo`, `100 - Psicologia - Bacharelado`, `200 - Psicologia - Licenciatura`) | nome da habilitação |
| C | Currículo | 12 dígitos gravados como **texto** no arquivo (`470120100262`). A "notação científica" (`4,7012E+11`) é só a forma como o Excel **mostra**. Se o arquivo for **salvo** pelo Excel, os dígitos se perdem de verdade | currículo (texto) |
| D | Disciplina | código; o zero à esquerda faz parte (`0420130`) | código |
| E | Nome | nome completo | nome |
| F | Créditos aula | 1 crédito-aula = 1 h de aula por semana = 15 h no semestre | créditos-aula |
| G | Créditos trabalho | 1 crédito-trabalho = 30 h de atividades no semestre. Entra na CH: `CH = 15 × F + 30 × G` vale para **as 183 disciplinas**. Ex.: PSE1444 tem 4 + 1 → 60 + 30 = 90 h | créditos-trabalho |
| H | AAC | **carga de Atividades Acadêmicas Complementares exigida pelo currículo**, repetida em todas as linhas do currículo: `60 (1.55%)` Psicólogo, `60 (1.45%)` Bacharelado, `0 (0%)` Licenciatura. Não é da disciplina | AAC do currículo (h e %) |
| I | CH | carga horária total da disciplina no semestre | CH |
| J | CE | carga horária de **Estágio** (legenda do PDF). 76 disciplinas com CE > 0 | CE |
| K | CP | carga horária de **Práticas como Componentes Curriculares** (legenda do PDF). 15 disciplinas com CP > 0, todas oferecidas na Licenciatura | CP |
| L | AACC | mesma posição da coluna **ATPA** do PDF; **todas zeradas** nos dois arquivos | ATPA (equivalência a confirmar) |
| M | Tipo | `Obrigatórias`, `Optativas Eletivas`, `Optativas Livres` | tipo (por habilitação) |
| N | Período ideal | período do curso naquela habilitação | período ideal |
| O | Tipo de requisito | `Requisito` (ou vazio). Só "Requisito" no exemplo (238) | tipo do requisito |
| P | Disciplina requisito | código do requisito | requisito |
| Q | Versão | versão **do requisito**, não da disciplina. Ex.: a linha de PSA1302 traz `PSE1140;4`, e o PDF mostra `PSE1140(4)` | versão do requisito |
| R | Nome | nome do requisito (a coluna tem o mesmo título de E; por isso o leitor usa a posição) | nome do requisito |

Uma disciplina com N requisitos aparece em **N linhas seguidas**, iguais em A–N. O CSV **não diz** se esses requisitos valem juntos ou se basta um: PSE2355 tem 4 linhas, e só o PDF mostra que são alternativos ("ou").

## 3. O PDF

**Organização das 38 páginas** (pelo número do currículo no cabeçalho):

| Páginas | Conteúdo |
|---|---|
| 1–14 | Bacharelado (`470120100262`): obrigatórias, eletivas, livres |
| 15–29 | Psicólogo (`470120000262`) |
| 30–34 | Licenciatura (`470120200262`) |
| 35 | Informações Básicas — Licenciatura |
| 36–37 | Informações Básicas — Bacharelado (o bloco do Psicólogo **começa no fim da página 37**, ainda com cabeçalho do Bacharelado) |
| 38 | Informações Básicas — Psicólogo (continuação) |

- **Cabeçalho** de cada página: marca, "Júpiter - Graduação", "Grade Curricular", `Curso`, `Complemento`, `Currículo … (Ativo)`.
  - **Defeito:** nas 34 páginas da grade, o `Complemento` é sempre `200 - Psicologia - Licenciatura`, mesmo nas páginas do Bacharelado e do Psicólogo.
  - A habilitação certa está nos dígitos 6–9 do currículo.
  - Nas páginas de informações, o complemento vem certo.
- **Tabela:** colunas `Disciplina | Créditos: Aula Trab. Tot. | CH CE CP EXT ATPA | Per. Ideal`.
  - Na linha da disciplina vem `CÓDIGO(VERSÃO) Nome……` com pontilhado até os números.
  - Nomes longos são **cortados**: 36 dos 183.
- **Grupos e totais:**
  - as disciplinas de um período terminam num `Subtotal` (68 grupos);
  - cada seção termina num `Total Obrigatórias/Optativas Eletivas/Optativas Livres` (9 totais).
  - São essas somas que permitem conferir o OCR.
- **Requisitos**, logo abaixo da disciplina: `Requisito - CÓDIGO(V) Nome`. Uma linha `ou` entre dois requisitos indica **alternativa**.
- **Legenda** em todas as páginas:
  - CE = Carga horária de Estágio;
  - CP = Carga horária de Práticas como Componentes Curriculares;
  - ATPA = Atividades Teórico-Práticas de Aprofundamento;
  - EXT = Carga horária de Atividade Extensionista;
  - (f) = Requisito fraco.
- **Rodapé:** `USP/STI - 26/09/2026 22:05:45 - Pág. n/38`. O sistema guarda a data de geração.
- **Informações Básicas do Currículo**:
  - data de ativação;
  - duração ideal/mínima/máxima;
  - quadro de carga horária (aula/trabalho/subtotal por tipo);
  - estágio, AAC, AEX Apolo e extensão exigida em optativas;
  - subtotal com AAC;
  - total exigido em extensão (h e %);
  - total geral;
  - texto "Informações Específicas".

| Informações básicas | Psicólogo | Bacharelado | Licenciatura |
|---|---|---|---|
| Ativação | 15/07/2026 | 15/07/2026 | 15/07/2026 |
| Duração ideal / mínima / máxima (sem.) | 10 / 10 / 15 | 8 / 8 / 12 | 10 / 10 / 15 |
| CH em disciplinas (h) | 4.560 | 4.500 | 3.165 |
| Estágio (h) | 680 | 360 | 400 |
| AAC (h) | 60 | 60 | 0 |
| AEX Apolo (h) | 341 | 335 | 0 |
| Extensão exigida (h e %) | 471 (10,19%) | 465 (10,20%) | 335 (10,58%) |
| Total geral (h) | 4.961 | 4.895 | 3.165 |

Nos três currículos, as somas internas do quadro de carga horária batem (aula + trabalho = subtotal; subtotais = total em disciplinas).

## 4. Leitura do PDF sem texto (OCR)

No navegador, com Tesseract.js e o modelo `tessdata_fast` 4.1.0 de português, a leitura das 38 páginas levou cerca de **2 minutos**. Resultado:

- 398 linhas de disciplina reconhecidas; nenhuma linha não reconhecida;
- **3.582 números coerentes com as contas do relatório**: 3.576 lidos já coerentes; 6 mal lidos e corrigidos pelas contas;
- **0 sem coerência verificada**;
- subtotais: 57 de 68 conferem; os 11 restantes ficaram ilegíveis no OCR (em geral, o "0" em negrito), e as colunas deles ficaram coerentes pelos totais das seções;
- totais das seções: 9 de 9 conferem;
- **concordância com o CSV** (segunda fonte, só nos campos que os dois têm): 398/398 ofertas, 238/238 requisitos e 1.098/1.098 números (créditos, CH, CE, CP, ATPA) iguais;
- **sem segunda fonte**: EXT (183 valores, 24 > 0), as 137 versões que o CSV não traz e as Informações Básicas dos 3 currículos. Para as Informações Básicas, o servidor refaz 11 contas por currículo (todas fecharam, inclusive aula/trabalho obrigatórios × grade do CSV e AAC × CSV); para EXT e versões não há conta nenhuma. Esses valores vão para a revisão humana na prévia, com a página do PDF.

O que as contas mostram e o que não mostram: em cada linha, `Tot. = Aula + Trab.` e `CH = 15 × Aula + 30 × Trab.` amarram quatro números; subtotais e totais amarram as colunas; a mesma disciplina aparece em até três habilitações. Um número mal lido **quase sempre** quebra alguma dessas contas e é recuperado pelas outras; quando não dá, fica "sem coerência verificada" e não é gravado. Mas coerência não é prova: dois erros que se compensam mantêm um subtotal. A prova independente, neste arquivo, veio da comparação com o CSV — que só existe para os campos compartilhados. EXT, por exemplo, só aparece no PDF e não tem comparação independente.

## 5. Onde os arquivos diferem da descrição inicial

Pontos da descrição das colunas que os próprios arquivos mostram de outra forma:

1. **AAC (coluna H) não é a extensão (EXT) do PDF.**
   - A AAC é uma exigência **do currículo**: o mesmo valor em todas as linhas do currículo (60 h no Psicólogo e no Bacharelado, 0 na Licenciatura). O PDF a mostra no quadro do currículo como `(AAC: 60)`.
   - A **EXT** é **da disciplina**: varia de 3 a 150 h, em 24 disciplinas.
   - São coisas diferentes, e o sistema grava cada uma no lugar certo: AAC no currículo; EXT na disciplina.
2. **CP (coluna K)**:
   - a legenda do PDF define CP como "Carga horária de **Práticas como Componentes Curriculares**", e não "créditos de trabalho no exterior";
   - as 15 disciplinas com CP > 0 são todas oferecidas na Licenciatura (várias da Faculdade de Educação: EDF, EDM, EDA). Isso é coerente com as práticas exigidas na formação de professores.
3. **Versão (coluna Q)**:
   - é a versão da disciplina **requisito** (fica vazia quando não há requisito);
   - a versão da própria disciplina só aparece no PDF, entre parênteses após o código;
   - quando a disciplina é requisito de outra, o sistema aproveita a versão do CSV (46 casos, todos iguais ao PDF).
4. **Créditos trabalho (coluna G)**: entram na carga horária, com 30 h cada. É por isso que uma disciplina de 4 créditos-aula pode ter 90 h: 4 × 15 + 1 × 30.
5. **AACC (coluna L) × ATPA (PDF)**:
   - ocupam a mesma posição e estão zeradas nos dois arquivos;
   - AACC (Atividades Acadêmico-Científico-Culturais) é o nome usado para esse tipo de exigência em normas anteriores da formação de professores, e ATPA é o nome da legenda atual. Parece ser o mesmo campo com nomes diferentes, mas **isso precisa ser confirmado**. Até lá, o sistema grava os dois no campo "ATPA", com nota explicando a dúvida.
6. **Bacharelado × Psicólogo**:
   - têm 167 disciplinas em comum. Só no Psicólogo: PSC2532 e 4701980. Só no Bacharelado: PSA3713;
   - das comuns, **34 mudam de tipo**: 2 são obrigatórias no Bacharelado e eletivas no Psicólogo (4701784 e 4701885, também em períodos diferentes: 7º/9º e 8º/10º); as outras 32 são optativas livres no Bacharelado e eletivas no Psicólogo.
7. **Complemento**: no CSV está certo. No cabeçalho das páginas da grade do PDF está errado (ver §3).

## 6. Observações sobre os dados (para conferir no Júpiter)

Não são erros do sistema. São situações que importam para a grade horária ou que parecem inconsistências do cadastro:

- **Paridade do período diferente entre habilitações**: PST1767 (8º no Psicólogo e no Bacharelado; 7º na Licenciatura) e PSE5140 (4º no Psicólogo e no Bacharelado; 1º na Licenciatura). Pelo período ideal, entram tanto na grade do 1º quanto na do 2º semestre. O painel mostra "1º e 2º semestres".
- **Período diferente entre habilitações** (7 disciplinas): 4701784, 4701885, PST1767, PSC2937, PSA5100, PSE5140, PSC2031.
- **Tipo diferente entre habilitações**: 42 disciplinas. Ex.: 4705291 é optativa livre no Bacharelado, eletiva no Psicólogo e obrigatória na Licenciatura. O filtro "Tipo ou período diferente entre habilitações" lista todas.
- **Requisito fora da estrutura**: 4705282 (Estágio Supervisionado I: Compreensão do Ambiente Escolar) é requisito, mas não faz parte da estrutura importada.
- **Texto descritivo do Bacharelado × quadro do mesmo relatório**:
  - o texto fala em 146 créditos-aula obrigatórios (2.190 h) e 2.760 h de aula no total; o quadro de carga horária e o CSV somam 2.160 h de aula obrigatória (144 créditos) e 2.730 h;
  - o texto fala em 320 h de estágio; o quadro diz 360 h;
  - vale conferir qual está atualizado.

## 7. Siglas

| Sigla | Significado | Onde aparece | Nível |
|---|---|---|---|
| CH | Carga horária total | CSV e PDF | disciplina |
| CE | Carga horária de Estágio | CSV e PDF | disciplina |
| CP | Carga horária de Práticas como Componentes Curriculares | CSV e PDF | disciplina |
| EXT | Carga horária de Atividade Extensionista | só PDF | disciplina |
| ATPA | Atividades Teórico-Práticas de Aprofundamento | PDF (no CSV, provavelmente AACC) | disciplina |
| AACC | Atividades Acadêmico-Científico-Culturais | CSV | disciplina (zerada no exemplo) |
| AAC | Atividades Acadêmicas Complementares | CSV (coluna H) e PDF (quadro do currículo) | **currículo** |
| AEX Apolo | atividades de extensão registradas no sistema Apolo, exigidas à parte das disciplinas | PDF (quadro do currículo) | **currículo** |
| (f) | Requisito fraco | PDF | requisito |

Fontes consultadas sobre as siglas (além das legendas do próprio relatório):

- [Poli-USP — páginas sobre AAC e AEX](https://www.poli.usp.br/comunicados-internos/avisos/avisos-para-a-comunidade-politecnica/servico-de-cultura-e-extensao-da-poli-usp-lanca-paginas-no-site-para-divulgacao-de-informacoes-sobre-aac-e-aex/)
- [IGc-USP — AACC](https://igc.usp.br/graduacao/aacc/)
