# Regras — leitura, conferência e gravação

> Fonte atual 1.10.0 sobre baseline 1.9.3. Regras e algoritmos preservados; extensão visual documentada em [NAVEGACAO_E_VISUAL_1_10_0.md](NAVEGACAO_E_VISUAL_1_10_0.md). Registros de versões anteriores abaixo conservam seu alcance.

Este documento descreve **o que o sistema faz** com os arquivos do Júpiter e por quê. Cada regra aponta o arquivo em que está implementada. A comparação detalhada dos dois formatos está em [CSV_X_PDF.md](CSV_X_PDF.md).

## 1. Conceitos

| Termo | Significado no sistema |
|---|---|
| **Currículo** | Número de 12 dígitos do Júpiter. Exemplo: `47012 0100 262` = curso `47012` + habilitação `0100` + cadastro `26/2` (ano 2026, 2º semestre). É **sempre texto**: o zero à esquerda faz parte do código. |
| **Habilitação** | Código de 4 dígitos dentro do currículo (`0000` Psicólogo, `0100` Bacharelado, `0200` Licenciatura, no arquivo de exemplo). O sistema guarda um currículo "em uso" por habilitação. |
| **Disciplina** | Código `AAA9999` (ex.: `PSA1302`) ou `9999999` (ex.: `4702893`, `0420130`). A aba Disciplinas tem **uma linha por código** (catálogo). |
| **Vínculo / oferta** | A disciplina **dentro de um currículo**: tipo (obrigatória, optativa eletiva, optativa livre) e período ideal. A mesma disciplina pode ter tipo e período diferentes em cada habilitação. |
| **Requisito** | Disciplina exigida antes de outra, **em uma habilitação**. O `grupo` indica alternativas: mesmo grupo = "ou"; grupos diferentes = "e". |
| **Período ideal** (semestre ideal) | Semestre **do curso** em que a disciplina deve ser cursada: 1º a 10º (o curso tem 5 anos). Pode variar entre habilitações. |
| **Semestre de oferecimento** ("disciplina de semestre") | Semestre **do ano** em que a disciplina é oferecida: 1º, 2º ou os dois. Pelo período ideal: ímpar (1º, 3º, 5º, 7º, 9º) = 1º semestre do ano; par (2º… 10º) = 2º semestre. Pode ser ajustado no painel (ex.: prática oferecida nos dois semestres); nas disciplinas para outros cursos é informado na ficha. |

## 2. Acesso

Implementado em `Acesso.gs`.

1. A conta precisa ser identificada (`Session.getActiveUser`). Com o Web App executando como quem implantou, isso só acontece para contas do mesmo domínio Google Workspace.
2. **(1.7.0) Lista de acesso**: a aba `ESTRUTURA_CURRICULAR` da planilha da chave `PERMISSOES_DE_ACESSO` (ID_INDEX). Linha 1 = títulos; coluna **C = e-mail**, coluna **E = Perfil**. O e-mail é comparado sem diferença de maiúsculas e sem espaços.
3. **Administrador**: Perfil `ADMINISTRADOR`. Só administradores importam, alteram a estrutura (ajustes, exclusões, outros cursos, seleção), enviam a grade e executam as funções do editor.
4. **Leitor**: Perfil `LEITOR` — ou Perfil vazio ou desconhecido (o menor acesso). Consulta a estrutura e a auditoria da grade.
5. E-mail repetido na aba: vale o menor acesso.
6. Qualquer outra conta é recusada (`SEM_ACESSO`) — inclusive o dono da planilha e domínios inteiros. Aba ou chave ausente, ou colunas fora do lugar: ninguém entra (`CONFIGURACAO`).
7. A lista fica em cache por 1 minuto: incluir, tirar ou trocar o perfil de alguém vale em até 1 minuto.

A verificação é feita no servidor em toda chamada.

## 3. Leitura do CSV (`LeitorCsv.html`)

**Como exportar.** Júpiter › Estrutura Curricular › Relatórios, relatório "Grade Curricular":

- curso e currículo vigentes;
- **complemento em branco**, para vir com todas as habilitações;
- tipo "Ativo";
- as três obrigatoriedades marcadas;
- formato CSV.

Importe o arquivo **como veio**, sem abrir e salvar no Excel.

| Regra | Detalhe |
|---|---|
| Codificação | Tenta UTF-8 "estrito". Se houver byte inválido, usa Windows-1252, o padrão do Júpiter. Remove BOM. |
| Separador | O mais frequente na 1ª linha, fora de aspas (`;` no Júpiter; também `,` ou tabulação). Campos entre aspas seguem a RFC 4180. |
| Colunas | 18 colunas, lidas **pela posição**, porque a coluna R também se chama "Nome". O cabeçalho é conferido: menos de 18 colunas ou mais de 3 nomes diferentes → **erro**; de 1 a 3 nomes diferentes → aviso, e a leitura segue a posição. |
| Linhas de requisito | Uma disciplina com N requisitos ocupa N linhas iguais, exceto nas colunas O–R. Ela é contada **uma vez** por currículo; as linhas extras só acrescentam requisitos. |
| Curso | Coluna A, `47012 - Psicologia`. Mais de um curso no arquivo → erro. |
| Currículo | Coluna C, 12 dígitos. Notação científica (`4,7012E+11`) → **erro** com orientação: o arquivo foi salvo no Excel e os dígitos se perderam. |
| Complemento | Coluna B, conferida com os dígitos 6–9 do currículo (diferença → aviso; vale o currículo). |
| AAC | Coluna H, `60 (1.45%)`. É do **currículo**, não da disciplina: repete em todas as linhas e é gravada no currículo. Se variar dentro do currículo, usa o valor mais frequente, com aviso. |
| Código | `AAA9999` ou `9999999`. Código com 6 dígitos (zero perdido numa planilha) → completado com `0`, com aviso. |
| Números | Créditos-aula, créditos-trabalho, CH e período são obrigatórios. CE, CP e AACC vazios valem 0. Aceita `3,0`/`3.0`. |
| Conferência | CH ≠ 15 × aula + 30 × trabalho → aviso. A mesma disciplina com dados diferentes em linhas diferentes → erro. Linhas repetidas com tipo/período diferentes → erro. |
| Versão | A coluna Q é a versão do **requisito**. A versão da disciplina é aproveitada de onde ela aparece como requisito, quando há um só valor (`versaoOrigem = csv-requisito`). |
| Requisito fora | Requisito que não está na estrutura → informação (lista os códigos). |
| "e" / "ou" | O CSV **não informa**. `grupo = null` e, na planilha, relação "Não informado (só CSV)". |

Mensagens do leitor (código → nível):

- **erro:** `CSV_VAZIO`, `CSV_COLUNAS`, `CSV_CABECALHO`, `CSV_CURRICULOCIENTIFICO`, `CSV_CURRICULO`, `CSV_CURSO`, `CSV_CODIGO`, `CSV_NUMERO`, `CSV_PERIODO`, `CSV_TIPO`, `CSV_DISCIPLINADIVERGENTE`, `CSV_LINHAREPETIDADIVERGENTE`, `CSV_CODIGOREQUISITO`, `CSV_VARIOS_CURSOS`, `CSV_SEM_DISCIPLINAS`;
- **aviso:** `CSV_CABECALHO_PARCIAL`, `CSV_CURRICULOCURSO`, `CSV_COMPLEMENTO`, `CSV_AAC`, `CSV_AAC_VARIAVEL`, `CSV_CODIGOZERO`, `CSV_NOME`, `CSV_CARGAHORARIA`, `CSV_REQUISITOREPETIDO`, `CSV_REQUISITOSEMCODIGO`;
- **info:** `CSV_REQUISITO_FORA`.

Problemas repetidos são agrupados em uma mensagem, com até 8 exemplos e o total de ocorrências.

## 4. Leitura do PDF (`LeitorPdfFontes.html` + `LeitorPdf.html`)

### 4.1 De onde vêm as palavras

- **PDF com texto** (ex.: "Salvar como PDF" do Chrome/Edge): a camada de texto é lida com PDF.js. A leitura é exata.
- **PDF sem texto** (ex.: "Microsoft Print to PDF", em que as letras viram desenhos): cada página é lida por OCR no navegador, a 300 dpi, em duas passadas (página inteira; só a faixa dos números, aceitando apenas dígitos).
- Critério: o PDF é "com texto" se ao menos metade das páginas tem 40 ou mais caracteres na camada de texto.

### 4.2 Como o relatório é reconhecido

Cada linha é classificada, na ordem das páginas:

- **Rodapé** `USP/STI - dd/mm/aaaa hh:mm:ss - Pág. n/N`: data de geração e total de páginas. Se o total difere do arquivo → aviso.
- **Cabeçalho** `Curso`, `Complemento`, `Currículo … (Ativo)`. **O "Complemento" das páginas da grade vem errado** (sempre o mesmo, defeito do relatório): a habilitação é identificada **pelo número do currículo**. Nas páginas de informações o complemento vem certo.
- **Tabela**: a linha "Disciplina Aula Trab. Tot. CH CE CP EXT ATPA Ideal" dá a posição de cada coluna. Colunas não reconhecidas são estimadas pelo espaçamento regular.
- **Seções**: "Disciplinas Obrigatórias / Optativas Eletivas / Optativas Livres". Disciplina fora de seção → erro.
- **Disciplina**: `CÓDIGO(VERSÃO) Nome……  Aula Trab. Tot. CH CE CP EXT ATPA Per.` O nome termina no pontilhado.
- **Grupos**: as disciplinas de um mesmo período terminam num **Subtotal**. Cada seção termina num **Total**.
- **Requisitos**, logo abaixo da disciplina: `Requisito - CÓDIGO(V) Nome`. Uma linha **"ou"** entre dois requisitos põe os dois no mesmo grupo (alternativos). `(f)` = requisito fraco. O leitor também aceita `Requisito fraco`, `Indicação de conjunto` e `Co-requisito`, variações que não aparecem no arquivo de exemplo.
- **Informações Básicas do Currículo** (últimas páginas):
  - datas de ativação/desativação;
  - duração ideal/mínima/máxima;
  - quadro de carga horária (aula, trabalho e subtotal por tipo);
  - estágio, AAC, AEX Apolo e extensão exigida em optativas;
  - subtotal com AAC, extensão total (h e %) e total geral;
  - texto "Informações Específicas".

  Cada bloco é atribuído à habilitação pelo texto ("Currículo 47012 - 100…") ou pelo cabeçalho da página. No exemplo, o bloco do Psicólogo começa numa página cujo cabeçalho é do Bacharelado. Um bloco sem habilitação identificável é ignorado, com aviso.

### 4.3 Conferência dos números (coerência aritmética)

A ordem é a do código (`analisar`, etapa 4):

1. **Linha**: Tot. = Aula + Trab. e CH = 15 × Aula + 30 × Trab. O par (aula, trab) que concorda com mais números lidos vence; com 3 ou 4 concordâncias, os demais são corrigidos.
2. **Subtotal do grupo**: soma de cada coluna = Subtotal impresso → confirma. Se um único valor da coluna estiver ilegível, ele é recuperado pela diferença. Antes disso, um Subtotal ilegível pode ser recuperado pelo Total da seção, quando é o único ilegível daquela coluna.
3. **Período**: é o mesmo em todo o grupo (maioria clara: ao menos 2 leituras e mais da metade). Sem maioria clara (por exemplo, num grupo de uma disciplina só), o período precisa ficar entre o do grupo anterior e o do seguinte.
4. **Consenso entre habilitações**: um valor confirmado da mesma disciplina em outra habilitação confirma ou corrige as leituras restantes. Esta etapa roda antes e depois da etapa 5.
5. **Total da seção**: soma de todas as linhas da seção = Total impresso → confirma a coluna inteira.

Situação de cada número: **lido** (coerente com as contas), **corrigido** (recuperado por uma conta) ou **conferir** (sem coerência verificada).

**O que isso prova e o que não prova.** As contas mostram **coerência aritmética**: um número mal lido quase sempre quebra alguma conta, mas dois erros que se compensam podem manter uma soma. Por isso o sistema e a documentação não chamam esses números de "comprovados". Nos campos que o CSV também tem, a prévia mostra a **concordância com o CSV** já gravado (segunda fonte). EXT, versões que o CSV não traz e Informações Básicas **não têm segunda fonte** e passam por revisão humana (§5.8).

- Na **camada de texto** a leitura é exata: o sistema não "corrige" o documento, apenas avisa quando as contas do próprio relatório não batem.
- No **OCR**, um número sem coerência verificada **não é gravado**: ele vai em `naoConfirmados`.

### 4.4 Da leitura ao pacote

- **Números da disciplina**: o valor confirmado, desde que único entre as habilitações. Valores diferentes → aviso `PDF_DIVERGENTE_HABILITACOES`, e o campo fica não confirmado. Na camada de texto, vale o primeiro valor lido.
- **Versão**:
  - no OCR, vale quando lida ao menos uma vez sem troca de caracteres, ou ao menos duas vezes com troca;
  - leituras diferentes: vence a mais frequente, se tiver folga; senão, aviso `PDF_VERSAO_DIVERGENTE`.
- **Nome**:
  - o mais longo lido;
  - se um requisito de outra disciplina cita um nome mais completo que começa igual, é usado esse;
  - senão, `nomePodeEstarCortado = true`.
- **Código no OCR**: trocas comuns (`O`/`0`, `I`/`1`, `S`/`5`…) são desfeitas conforme a posição. Um código `AAA9999` tem letras nas 3 primeiras posições e dígitos nas demais. Exemplos reais: `BIOO123` → `BIO0123`, `FLAO106` → `FLA0106`.
- **Nome no OCR**: corte do pontilhado; algarismos romanos lidos como `|`, `Il`, `lll` viram `I`, `II`, `III`; lixo no fim é removido.

Mensagens do leitor:

- **erro:** `PDF_SEM_DISCIPLINAS`, `PDF_SEM_SECAO`;
- **aviso:** `PDF_SEM_CURSO`, `PDF_PAGINAS`, `PDF_OCR_NAO_CONFIRMADOS`, `PDF_LINHAS_NAO_RECONHECIDAS` (mais de 15 linhas), `PDF_DIVERGENTE_HABILITACOES`, `PDF_VERSAO_DIVERGENTE`, `PDF_DISCIPLINA_REPETIDA`, `PDF_INFO_SEM_CURRICULO`;
- **info:** `PDF_COMPLEMENTO_CABECALHO`, `PDF_INFO_ATRIBUICAO`.

## 5. Gravação (`Importacao.gs`)

### 5.1 Modo de cada currículo do arquivo

| Situação | Modo |
|---|---|
| CSV | **completo**: define a estrutura (oferta e requisitos) das habilitações do arquivo |
| PDF de currículo que a base ainda não tem (ou sem oferta gravada) | **completo** |
| PDF do **mesmo** currículo já em uso na base | **complemento** |

Habilitações que não estão no arquivo não são tocadas.

### 5.2 Bloqueios (a prévia mostra; a gravação é recusada)

1. Aviso de nível **erro** vindo do leitor.
2. A base guarda **outro curso**: use uma planilha por curso.
3. Estrutura **mais antiga** que a da base para a mesma habilitação (compara ano/semestre de cadastro).
4. **OCR em modo completo** com algum número (ou período) não confirmado nas disciplinas dessas habilitações. Orientação: importe o CSV primeiro; depois o PDF completa.

### 5.3 Estrutura completa

- Oferta e requisitos das habilitações do arquivo são **substituídos** pelos do arquivo.
- Ao reimportar o CSV depois do PDF, os grupos "ou" que o PDF informou são **mantidos** para o mesmo requisito no mesmo currículo.
- Currículo novo para uma habilitação que já tinha outro:
  - o antigo fica registrado como "Não — substituído por … em dd/mm/aaaa";
  - o novo passa a ser o currículo em uso;
  - a prévia e a aba Alterações registram a substituição.
- Disciplinas:
  - **nova**: incluída;
  - **existente**: os campos nome, créditos, CH, CE, CP e ATPA são atualizados, e cada diferença vira uma "alteração". A versão também, quando o arquivo a traz.

### 5.4 Complemento (PDF depois do CSV)

Acrescenta só o que o CSV não tem:

- versão;
- EXT;
- grupos "ou";
- tipo "fraco" do requisito;
- informações básicas do currículo;
- campos que estavam vazios.

**Nunca muda** oferta, requisitos nem números já gravados. Diferenças aparecem na prévia como "**não serão aplicadas**":

- requisito presente num e ausente noutro;
- tipo/período diferente;
- disciplina ausente;
- número diferente;
- nome diferente, só em PDF com texto, e só quando o nome do PDF não é o começo do nome gravado.

No OCR, nomes não são comparados: erros de leitura como `I`/`l` virariam "divergências" sem significado.

**CSV e PDF escolhidos juntos (1.4.2).** São duas importações, na ordem acima, cada uma com sua conferência, prévia e gravação (dois registros no histórico):

- só vale **um CSV + um PDF** (o tipo do PDF é dado pelos bytes `%PDF`, não pela extensão; o do CSV, pela extensão `.csv`/`.txt`). Dois do mesmo tipo, mais de dois, ou um `.pdf` que não é PDF: recusado, nada é lido;
- o CSV segue direto para a conferência; o PDF é lido **ao mesmo tempo, no navegador** (texto ou OCR) — nada vai ao servidor antes da confirmação de cada um;
- o PDF só é oferecido **depois que o CSV foi gravado** ("Continuar com o PDF"), e então é conferido como complemento dessa base (regras acima). Se o CSV não for gravado, o PDF não é usado;
- "Ver a estrutura (sem o PDF)", "Escolher outro arquivo" ou fechar a janela cancelam a leitura do PDF. Erro na leitura do PDF não impede gravar o CSV: o erro aparece e o PDF pode ser importado depois.

### 5.5 Regras gerais

- O **nome vindo do PDF nunca substitui** um nome já gravado: o PDF corta nomes longos.
- Campo **não confirmado** pelo OCR nunca sobrescreve a base.
- **Situação**: disciplina sem oferta em nenhuma habilitação depois da importação vira "**Fora da estrutura atual**". Ela não é apagada, e a Observação continua. Se voltar a aparecer, volta para "Na estrutura atual". As duas passagens são registradas.
- **Observações** e colunas extras são preservadas.
- **Registros**:
  - uma linha em **Importações**:
    - id `IMP-aaaammdd-hhmmss`, data e hora, quem importou;
    - arquivo, formato, leitura, modo, currículos;
    - contagens e resumo, inclusive a conferência do PDF;
  - linhas em **Alterações**, com tipo, habilitação, campo, antes e depois. Tipos:
    - Carga inicial, Nova disciplina, Dado alterado;
    - Saiu da estrutura, Voltou à estrutura;
    - Removida da habilitação, Incluída na habilitação, Oferta alterada;
    - Requisitos alterados, Currículo substituído, Complemento do PDF;
  - `versaoBase` + 1;
  - aba Sobre reescrita.
- **Gravação**: preparação em cópias, ativação por uma escrita e recuperação; ver [ARQUITETURA.md §7](ARQUITETURA.md#7-gravação-preparação-ativação-e-recuperação).

### 5.6 Informações Básicas do Currículo (conferidas no servidor)

O servidor ignora o "conferido" calculado no navegador e refaz as contas possíveis (`conferirInfoCurriculo_`):

| Conta | Campos |
|---|---|
| aula + trabalho = subtotal (obrigatórias, eletivas, livres) | 3 × 3 campos |
| subtotais = total em disciplinas | obrigatória, eletiva, livre, total |
| total em disciplinas + AAC = subtotal com AAC | 3 campos |
| subtotal com AAC + AEX Apolo + extensão em optativas = total geral | 4 campos |
| percentual de extensão = extensão exigida ÷ subtotal com AAC (±0,01) | 3 campos |
| duração mínima ≤ ideal ≤ máxima | 3 campos |
| aula obrigatória = 15 h × créditos-aula das obrigatórias da grade; trabalho = 30 h × créditos-trabalho (quando a grade tem todos os números) | 1 campo cada |
| AAC = AAC já gravada pelo CSV (quando existe) | AAC |

Situação de cada campo e comportamento:

- **coerente** (passou em ao menos uma conta, nenhuma falhou) → gravado;
- **sem conta possível** (estágio, datas, texto; ou parceiro da conta ausente) → gravado;
- **inconsistente** (participa de uma conta que falhou) → **não gravado**; todos os campos daquela conta ficam de fora, porque não dá para saber qual está errado;
- **ausente** → não gravado.

Campo não gravado mantém o valor anterior (num complemento) ou fica vazio (primeira gravação). A prévia mostra, por currículo, as contas que conferem, as que não fecham (com a conta) e os campos bloqueados. Numa leitura por OCR, os campos gravados entram na revisão humana (§5.8). A AAC do currículo vem do CSV; a do PDF só é gravada se o currículo ainda não tiver AAC e passar nas contas.

### 5.7 Prévia × edições manuais

A confirmação refaz o plano e só grava se ele for **igual ao da prévia aprovada**:

- **células mantidas pelo sistema** (todas as colunas do esquema, exceto Observações), nas quatro abas de dados: qualquer edição depois da prévia **invalida** a prévia (`PREVIA_DESATUALIZADA`, dizendo a aba). É preciso gerar outra prévia, que mostrará a mudança que a importação fará sobre a edição;
- **Observações e colunas extras**: podem ser editadas depois da prévia sem invalidá-la. A importação não as altera: os valores lidos no início da confirmação são preservados;
- **durante a gravação** (entre a leitura inicial e a ativação): se qualquer célula das abas em uso mudar, inclusive Observações e extras, a gravação é cancelada (`EDICAO_DURANTE_GRAVACAO`) e nada muda;
- **no instante da ativação** (depois da última conferência): a importação é concluída e a resposta traz um aviso; a edição fica na cópia oculta `_anterior_<aba>`.

### 5.8 Revisão humana dos valores só do PDF

A prévia lista **todos** os valores que só o PDF traz e que vão ser gravados (novos ou diferentes do atual): EXT, versão (quando o CSV não a corrobora) e campos das Informações Básicas, com disciplina/currículo, valor, valor anterior e **página do PDF**. Nada é cortado: a lista vem em páginas de 100, com "Anterior/Próxima" e a indicação "Página k de n · itens a–b de N". No topo, um resumo por tipo diz quantos valores há, quantos EXT são iguais a 0 e em que páginas eles estão (reunidos no fim da lista). A coerência aritmética não substitui esta conferência: estes valores não têm segunda fonte.

Quando o PDF foi lido **por OCR**, a caixa "Conferi no PDF os N valores da lista" só é liberada depois de abrir **todas** as páginas, e "Gravar" só depois de marcá-la. O servidor confere de novo: sem a caixa → `REVISAO_PENDENTE`; com a caixa, mas com páginas não entregues a quem confirma, lista expirada, de outra pessoa ou diferente da que seria gravada → `REVISAO_INCOMPLETA` (a mensagem diz quais páginas faltam). O resumo da importação registra que a revisão foi confirmada. Em PDF com camada de texto (transcrição exata), a lista é mostrada sem exigir a marcação. Capacidade: 7.000 valores (acima de qualquer pacote válido); acima disso a importação é bloqueada com mensagem.

### 5.9 Identificador da importação

`IMP-aaaammdd-hhmmss-xxxxxxxx`, em que `xxxxxxxx` vem do identificador aleatório da operação criado na prévia; se já existir, recebe `-2`, `-3`…. A data legível fica na coluna "Data e hora". O painel agrupa as alterações por esse identificador. A mesma operação confirmada duas vezes não gera segunda linha (`jaGravada`).

## 6. Campos calculados

| Onde | Campo | Regra |
|---|---|---|
| Disciplinas | Departamento | prefixo `PSA`/`PSC`/`PSE`/`PST` → o próprio; código `470` + 4 dígitos → "Interdepartamental"; demais → "Outra unidade". É a mesma regra das abas da planilha antiga da grade. |
| Disciplinas | Prefixo | 3 primeiros caracteres do código |
| Disciplinas | Créditos (total) | aula + trabalho |
| Disciplinas | Habilitações / Tipo e período por habilitação | resumo das ofertas em uso, por ordem de habilitação. Disciplina fora da estrutura mantém o último resumo |
| Disciplinas | Semestre de oferecimento ("Semestre ideal" até a 1.3.1) | pelo período ideal: "1º semestre", "2º semestre" ou "1º e 2º semestres", quando a paridade do período varia entre habilitações. Um ajuste do painel não é gravado aqui, e sim em "Ajustes manuais" |
| Disciplinas | Origem da versão | "PDF" ou "CSV (requisito)" |
| Disciplinas por habilitação | Semestre de oferecimento ("Semestre ideal" até a 1.3.1) | pela paridade do período ideal nesta habilitação |
| Disciplinas por habilitação | Requisitos | resumo: `(A ou B) e C`; sem grupos: `A, B (relação não informada)` |
| Requisitos | Relação | "Único"; "Ou — basta um do grupo n"; "E — exigido junto com os demais"; "Não informado (só CSV)" |
| Requisitos | Requisito na estrutura? | "Sim"/"Não" (se o requisito tem oferta na base) |
| Currículos | Disciplinas, Obrigatórias, Optativas eletivas/livres, Requisitos | contagens do currículo em uso |
| Currículos | Na base atual | "Sim" ou "Não — substituído por … em …" |

## 7. Painel (`PainelApp.html`)

- **Busca**: por código ou nome, sem diferença de acentos e maiúsculas. Várias palavras: todas precisam aparecer.
- **Filtros de oferta**: habilitação, obrigatoriedade, período ideal (inclusive "Ímpares"/"Pares") e "Com requisito" valem **juntos para a mesma habilitação**. Assim, "Bacharelado + Obrigatória + Ímpares" lista o que é obrigatório **no Bacharelado** em período ímpar. Os selos atendidos ficam em destaque.
- **Filtros da disciplina**: departamento, créditos-aula (1, 2, 3, 4, 5 ou mais), situação (padrão: "Na estrutura atual"), "Com estágio (CE)", "Com extensão (EXT)", "Com práticas (CP)", "Tipo ou período diferente entre habilitações".
- **Ordenação**: código, nome, período ideal (menor período entre as ofertas filtradas) ou créditos-aula (maior primeiro).
- **Baixar lista (CSV)**: exatamente o que está filtrado. UTF-8 com BOM, separador `;`, proteção contra fórmula. Colunas:
  - código, nome e departamento;
  - créditos, CH, CE, CP, EXT e versão;
  - tipo e período em cada habilitação;
  - semestre de oferecimento (o que vale: ajustado ou pelo período; em outros cursos, o informado), situação e observações.
- **Semestre de oferecimento** (filtro): vale para a **disciplina**, não para uma habilitação: o ajustado no painel ou, sem ajuste, o calculado pelo período ideal ("1º e 2º semestres" entra nos dois); nas disciplinas para outros cursos, o informado na ficha. É o filtro para "tudo o que entra na grade do 1º semestre".
- **Ficha da disciplina**:
  - resumo em linguagem simples;
  - quadros de créditos e cargas;
  - "Onde aparece" (habilitação, tipo, período e semestre);
  - requisitos por habilitação (habilitações com a mesma lista aparecem juntas; "Basta um destes" / "e também"; navegação para o requisito com "Voltar");
  - "É requisito para";
  - Observações;
  - histórico da disciplina.
- **Currículos**: um cartão por habilitação em uso e, no fim, as estruturas anteriores guardadas.
- **Importações**: um cartão por importação, com as mudanças registradas.
- **Selos de estado** (1.3.0; todos em balão elíptico desde a 1.4.1): "Excluída" (vermelho), "Ajustada" (corrigida no painel) e "Para outros cursos" (âmbar, sem conflito com o verde/azul/rosa dos tipos). O texto sempre diz o estado.

## 8. Preparação da grade horária (`Preparacao.gs` + `PainelPreparacao.html`, 1.3.0)

Só administradores veem as etapas e as caixas de seleção. O servidor confere o papel, os campos e a existência da disciplina em toda chamada.

### 8.1 Ajustes na estrutura curricular (etapa 1)

1. A ficha abre com os campos editáveis: código, nome, departamento, créditos-aula e -trabalho, CH, CE, CP, EXT, ATPA, versão, **disciplina de semestre** (semestre de oferecimento: "Automático — pelo período" ou 1º, 2º, 1º e 2º; 1.3.2) e, em "Onde aparece", o tipo e o período ideal em cada habilitação em uso ("— não faz parte —" tira a disciplina da habilitação).
2. "Salvar" só fica ativo quando algo mudou. Ao salvar, o servidor compara com o Júpiter e guarda em "Ajustes manuais" **só os campos diferentes**; se tudo voltar a ser igual ao Júpiter (inclusive por "Voltar aos dados do Júpiter"), a linha do ajuste é removida.
3. Cada campo ajustado aparece com "Ajustado · Júpiter: <valor>"; a oferta ajustada, com a oferta do Júpiter ao lado.
4. Validação: código `AAA9999` ou `9999999` (maiúsculas), único entre todas as disciplinas em uso, excluídas ou para outros cursos (`CODIGO_REPETIDO`); nome obrigatório (até 300 caracteres); números inteiros de 0 a 9999; período ideal de 1 a 20; habilitação da oferta precisa estar na base.
5. A CH não é recalculada sozinha quando os créditos mudam (há disciplinas em que o Júpiter registra outra carga): a ficha avisa "Pelos créditos seriam N h — confira a CH".
6. **Observações**: texto livre de até 2.000 caracteres, só informativo. Nas disciplinas da estrutura fica na coluna "Observações" da aba Disciplinas (a mesma de antes); nas de outros cursos, na própria aba.
7. Limites conhecidos: os **requisitos** não são editáveis no painel; um campo vazio na ficha significa "usar o valor do Júpiter" (não dá para "apagar" um valor que o Júpiter informa); se duas pessoas salvarem a mesma disciplina ao mesmo tempo, vale a última gravação.
8a. **(1.8.4) Gravação em andamento na ficha** (salvar, cadastrar, adicionar/remover da grade, excluir/restaurar):
   - Durante a espera, os campos da ficha que enviou ficam **travados** e os botões mostram o andamento ("Salvando…", "Adicionando…"); excluir/restaurar usa a tela "Excluindo…" do painel. No fim, com sucesso ou erro, tudo volta; no erro, o que foi digitado continua no formulário.
   - Fechar a ficha e navegar (requisitos, "Voltar") continuam liberados. Fechar durante a gravação pergunta antes (a gravação continua; se falhar, o aviso diz e as alterações não ficam guardadas).
   - **Uma operação de ficha por vez**: com uma em andamento, outro "Salvar", "Cadastrar", botão da grade ou "Excluir" — da mesma ficha ou de outra — não envia nada e avisa "Aguarde: a gravação de … ainda não terminou". Não há reenvio automático depois de uma falha.
   - A resposta só redesenha a ficha, move o foco e muda a ficha atual se a **mesma ficha** que pediu (a mesma abertura; fechar e reabrir a disciplina conta como outra) ainda estiver aberta. Senão, só atualiza as listas e avisa com o código da disciplina de origem ("PST1001 — Alterações salvas."; "Não foi possível salvar PST1001: …"). A outra ficha aberta, seu rascunho, seus botões e a navegação não mudam.
   - Limite: uma ficha da mesma disciplina aberta de novo **antes** da resposta mostra os dados de antes da gravação e não é atualizada sozinha; feche e abra de novo para ver o gravado.
8b. **(1.8.5) Salvar uma disciplina da estrutura é retomável.** O salvamento grava em dois lugares (aba "Ajustes manuais": campos, oferta, semestre e marca de grade; coluna Observações da aba Disciplinas em uso) e o Sheets não tem transação entre abas. Por isso:
   - Tudo é validado antes de qualquer escrita (erro de validação: nada muda).
   - O pedido validado é registrado na planilha (metadado `estruturaCurricular.salvamento`: disciplina pela chave original, linha de ajuste pretendida, observação pretendida, aba Disciplinas em uso e importação ativa, data, e-mail de quem salvou). Só depois vêm as escritas, uma conferência na planilha e a remoção do registro.
   - **Resultados:** *concluído* ("Alterações salvas."); *não concluído* (`NAO_SALVO`: a planilha recusou o registro; nada foi gravado; as alterações continuam na ficha); *pendente* (`SALVAMENTO_PENDENTE`: o registro ficou e parte pode estar gravada; a mensagem diz o quê). Uma falha numa escrita leva a uma segunda tentativa na mesma chamada, a partir do que está na planilha.
   - **Pendência:** aparece num aviso fixo acima das etapas ("Salvamento pendente — PST1001", com **Concluir salvamento pendente**). Ela é concluída automaticamente antes da próxima gravação da preparação, da próxima importação ou quando um administrador abre o painel. Se não der, essas ações são recusadas com a mesma mensagem (nada mais muda) e a pendência continua. Reaplicar é seguro: escreve só o que falta, da mesma disciplina.
   - Se a base mudou depois do registro (outra aba Disciplinas em uso ou outra importação), o pedido **não** é aplicado e aparece **Descartar salvamento pendente** (só nesse caso).
   - Leitores veem a planilha como está; o painel só informa que há um salvamento em andamento.
   - Disciplinas para outros cursos continuam com uma escrita só (a linha inteira).
   - **(1.8.6) Pendência concluída por outra ação** (gravação de outra disciplina, ação em lote, grade, outros cursos, lista por unidade, importação): a resposta — ou a recusa, se a ação em si não puder ser feita — traz o que ficou conferido da disciplina concluída (`recuperado`: chave, código e a observação lida; sem observação quando o salvamento pendente não a mudava). O painel aplica isso aos dados confirmados **antes** dos dados da própria ação (que são mais recentes: um novo salvamento da mesma disciplina vence). Formulários e rascunhos abertos não são tocados. Se a releitura falhar, o aviso fixo pede para recarregar.
   - **(1.8.6) Exceção depois do encerramento do registro** (a remoção foi feita e o erro veio depois, ou no flush seguinte): o sistema confere o próprio pedido na planilha. Conferido → *concluído*, com o que foi lido (observação inclusive). Não conferido ou sem conseguir ler → *não confirmado* (`SALVAMENTO_INCERTO`, com a disciplina identificada): aviso fixo "Salvamento não confirmado" sem botão, o rascunho continua na ficha; recarregue e confira, e salve de novo se faltar algo. O registro não é recriado e nada é reaplicado. Falha **antes** da remoção continua *pendente* (registro presente).
   - **(1.8.6) Colunas extras de "Ajustes manuais"** (criadas por alguém na planilha): ao aplicar um salvamento, valem as da linha atual, com o tipo e o valor que têm (data continua data; texto parecido com data continua texto). O registro do pedido não guarda colunas extras.
   - Limite (como na etapa 3): uma ficha aberta **enquanto** o salvamento da mesma disciplina estava pendente mostra o que estava gravado naquela hora; se a pendência for concluída depois, feche e abra a ficha de novo antes de salvar (salvar dali envia os valores mostrados).
8c. **(1.8.7) Ações em lote são retomáveis.** Excluir, restaurar, "Enviar para a Grade Horária"/"Adicionar à Grade Horária" e "Remover da grade" — nas listas, na Prévia e na ficha (um item) — podem gravar em duas abas ("Ajustes manuais" para a estrutura e "Disciplinas para outros cursos"). Por isso:
   - O pedido inteiro é validado antes de qualquer escrita (lista vazia, origem inválida, item inexistente em qualquer posição: nada muda). Itens repetidos contam uma vez. As regras funcionais (excluída, sem semestre de oferecimento, já na grade) não recusam o pedido: entram nas contagens.
   - O pedido validado (ação, itens que mudam por origem e chave original, contagens, base em uso, data, e-mail) é registrado nas Propriedades do script antes das escritas. As escritas mudam só as marcas da ação ("Excluída", "Adicionada à grade horária" e, em excluir/restaurar, "alterado em/por"), a partir da leitura atual das abas; depois cada item é conferido na planilha e o registro é removido.
   - **Resultados:** *concluído*; *não alterado* (`NAO_SALVO`: o registro foi recusado, nada mudou); *pendente* (`LOTE_PENDENTE`: o pedido continua registrado; a mensagem diz quantas já estão gravadas por origem e quais faltam); *não confirmado* (`LOTE_INCERTO`: o registro já foi encerrado, mas a conferência não confirmou ou não leu a planilha). Uma falha numa escrita leva a uma nova tentativa na mesma chamada, só do que falta.
   - **Pendência:** aviso fixo "Ação em lote pendente — <ação> (N disciplinas)" com **Concluir ação pendente**; concluída automaticamente antes da próxima gravação (inclusive salvar uma ficha, cadastrar, lista por unidade, envio da grade), da importação, do recomeço ou na abertura do painel por um administrador; se não der, essas ações são recusadas e a pendência continua. A seleção nas listas e na Prévia continua para conferir ou repetir. A ação seguinte nunca é desfeita pelo pedido antigo: o antigo é concluído antes.
   - Se a base mudou (outra planilha, aba Disciplinas, importação ou item que não existe mais), o pedido não é aplicado e aparece **Descartar ação pendente**: descartar encerra a pendência, **não desfaz** o que já foi gravado.
   - (1.8.8) Se a ação é concluída (por "Concluir ação pendente" ou por outra gravação) mas o painel não consegue ler os dados atualizados, aparece o aviso fixo "Gravação concluída — Recarregue a página", sem botões, e os dados da tela continuam os de antes até a página ser recarregada; nada recarrega sozinho (fichas e rascunhos abertos ficam).
   - Quando uma ação pendente é concluída durante outro pedido, o aviso do pedido traz a nota "(Antes, foi concluída a ação pendente …)"; as contagens do pedido são só dele.
   - Gravações parciais de lotes feitas antes da 1.8.7 não são detectadas nem reparadas.
8d. **(1.8.9) Oferta ajustada depois de uma troca de currículo.** A oferta ajustada ("Onde aparece" salvo na ficha; coluna "Oferta ajustada" de "Ajustes manuais") é uma lista de vínculos `currículo · tipo · período` que **substitui a oferta do Júpiter inteira**. Quando uma importação traz uma estrutura mais nova de uma habilitação, o currículo antigo fica "Não — substituído por <novo> em <data>" na aba Currículos, e a lista guardada continua com o número antigo. Regras:
   - **A lista guardada não é reescrita** — nem pela importação, nem ao abrir o painel. A cada leitura, o sistema calcula a **oferta efetiva** (a que vale) a partir da lista guardada e da aba Currículos da base ativa. A mesma oferta efetiva vale em todo lugar: ficha ("Onde aparece"), filtros, semestre de oferecimento calculado pelo período, "Adicionar à Grade Horária" (lista, Prévia, ficha, "Salvar e adicionar") e linhas da grade enviada (tipo e semestre ideal).
   - **Associação automática** (só quando não há dúvida): vínculo de currículo em uso vale como está; vínculo de currículo substituído segue a cadeia "substituído por" até o currículo em uso, e cada passo precisa ser do **mesmo curso e da mesma habilitação** (números de 12 dígitos presentes na base; curso e habilitação conferidos pelos dígitos e pelas colunas Curso e Cód. habilitação). O **tipo e o período ajustados são mantidos**. Duas trocas seguidas (262 → 271 → 272) também associam.
   - **A revisar** (o vínculo continua guardado, aparece na ficha com o motivo e **não conta** no semestre, nos filtros nem na grade): currículo desconhecido na base ou número fora do padrão; currículo fora de uso sem sucessor registrado; sucessor ausente, de outra habilitação ou de outro curso; cadeia circular; vínculo ilegível; **conflito** — dois vínculos que chegariam ao mesmo currículo em uso com tipo/período diferentes (se um deles já é do currículo em uso, ele vale e os outros ficam a revisar; senão, todos ficam a revisar). Vínculos que chegariam ao mesmo currículo com tipo e período iguais contam uma vez.
   - Uma disciplina cuja oferta ajustada tem **só** vínculos a revisar fica sem oferta efetiva (não volta sozinha para a oferta do Júpiter); um semestre de oferecimento escolhido à mão continua valendo, como sempre.
   - Três situações distintas: **sem ajuste** (vale a oferta do Júpiter nos currículos em uso); **ajuste `[]`** (retirada intencional de todas as habilitações: sem oferta e sem nada a revisar); **ajuste com vínculos a revisar** (selo "Oferta a revisar" na lista e aviso na ficha com cada vínculo e o motivo). Quando há vínculos associados, a ficha mostra "Oferta ajustada associada ao currículo atual".
   - **Ficha:** salvar outros campos (nome, observações, semestre…) sem mexer em "Onde aparece" **não descarta nem converte** a lista guardada. Gravar uma oferta diferente quando há vínculos a revisar exige marcar **"Descartar os vínculos a revisar ao salvar"** e confirmar; sem isso, o servidor recusa (`OFERTA_A_REVISAR`) e nada é salvo (o rascunho continua na ficha). Com a caixa marcada, a lista guardada passa a ser a da tabela (só currículos em uso; igual à do Júpiter = coluna vazia). "Voltar aos dados do Júpiter" também exige a caixa quando há vínculos a revisar.
   - Bases criadas antes da 1.8.9 funcionam sem reimportar e sem nenhuma gravação: o cálculo é só de leitura.
   - **(1.8.10) "Voltar aos dados do Júpiter" é uma intenção, não uma coincidência de valores.** Numa disciplina com oferta ajustada, o botão marca *nesta ficha aberta* o pedido de restaurar a oferta (e "Salvar" fica ativo mesmo que tipo e período mostrados já sejam iguais aos do Júpiter, como acontece quando a oferta ajustada foi associada ao sucessor e coincide com o Júpiter novo). Ao salvar, o ajuste de oferta é **removido** (coluna vazia; a linha some se não restar outro ajuste) e as importações seguintes voltam a mudar tipo, período e semestre automático. Nada é gravado só por clicar no botão; fechar a ficha ou cancelar descarta a intenção. Mexer em "Onde aparece" depois do botão cancela a intenção: vale a oferta escolhida por último. A intenção não passa para outra ficha, para a mesma reaberta nem para o salvamento seguinte. Salvar outros campos **sem** o botão continua conservando a lista guardada, mesmo quando a oferta mostrada coincide com a do Júpiter. Com vínculos a revisar, restaurar continua exigindo "Descartar os vínculos a revisar" e a confirmação; sem isso, é recusado (`OFERTA_A_REVISAR`), mesmo que a parte efetiva já seja igual ao Júpiter. Se o Júpiter da base mudou depois de a ficha ser aberta, a restauração é recusada (recarregar e repetir).
8. Os ajustes **sobrevivem às importações**: a importação regrava só as abas do Júpiter. O painel sempre mostra Júpiter + ajustes.

### 8.2 Exclusão

- Pela ficha ("Excluir disciplina", com confirmação) ou em lote (caixas da lista › "Excluir").
- Excluir não apaga nada: marca "Excluída = Sim". A disciplina some das listas, das contagens e da lista para a grade, e sai da grade horária (se estava adicionada).
- Restaurar: filtro Situação › "Excluídas no painel" › caixas › "Restaurar" (ou "Restaurar disciplina" na ficha).
- Leitores não veem as excluídas.

### 8.3 Disciplinas para outros cursos (etapa 2)

1. **Lista de disciplinas por unidade** do Júpiter (Estrutura Curricular › Relatórios; Unidade: Instituto de Psicologia; Opção: Ativas), **em CSV**. O PDF do mesmo relatório é uma imagem (exigiria OCR) e só acrescenta a versão, que a grade não usa; por isso o painel recusa o PDF com essa explicação.
2. O arquivo é decodificado no navegador (UTF-8 ou Windows-1252) e enviado como texto. O servidor exige as colunas Disciplina, Nome e Ativação, recusa o CSV da "Grade Curricular" (coluna Currículo) e aceita até 5.000 linhas / 2 MB.
2a. **(1.8.2) Validação de cada linha** (no servidor, na prévia e de novo na inclusão). Uma linha é **ignorada**, com número e motivo na prévia (lista "Linhas ignoradas — não serão incluídas", aberta), e nunca é gravada quando:
   - **Créditos aula / Créditos trabalho** não estão vazios e não são um inteiro de 0 a 9999. Aceitos: vazio ou só espaços (= não informado, como antes), `0`, `2`, `02`, e o inteiro com parte decimal **só de zeros**, com quantos zeros vierem (`3,0`, `3.00`; desde a 1.8.3 também `3.000`, `3,000`, `0002.0000`, `0.0000`, `9999.000`). Ponto e vírgula são separadores **decimais** no valor, nunca de milhar; num arquivo separado por vírgula, o valor com vírgula precisa estar entre aspas (`"3,000"`). A decisão é feita pelo texto, sem arredondar: `3.001`, `2,0001` ou `1.0000000000000000000001` são frações. Recusados com motivo: negativo (`-2` → "valor negativo"), fração (`1,5`, `1.5` → "valor fracionário"), texto ou número escrito pela metade (`abc`, `2abc`, `2 créditos`, `1/2`, `NaN`, `Infinity`, `+2`, `1e1` → "valor inválido"), acima de 9999. Nada é arredondado, truncado ou trocado por vazio/zero. A CH só é calculada com créditos válidos (15 × aula + 30 × trabalho; os dois vazios = CH vazia, como antes).
   - **Aspas malformadas**: aspas no meio de um campo sem aspas, ou texto depois das aspas de fechamento.
   - **(1.8.3) Campo entre aspas com quebra de linha** (aspas que não fecham na mesma linha): este leitor não aceita esses campos, mas acompanha as aspas pelas linhas seguintes, como no CSV, para saber onde o registro termina. Se o campo fecha adiante e o registro termina bem, o registro **inteiro** é descartado ("Linhas 2 a 4: …") e a leitura continua no registro seguinte. Se as aspas não fecham até o fim do arquivo, ou fecham de forma inválida (fim do registro ambíguo), **nada a partir da linha de abertura é lido** ("Linhas N a última: …"); as linhas anteriores continuam valendo. Nenhuma linha de dentro do campo é lida como disciplina, mesmo que pareça uma (antes da 1.8.3, uma linha assim podia ser oferecida e gravada). Aspas escapadas (`""`) dentro do campo não o fecham. Continuam aceitos: campo inteiro entre aspas (com o separador dentro, ex.: `"Nome; com ponto e vírgula"`), aspas duplicadas dentro do campo (`""` = `"`) e espaços antes/depois das aspas.
   - **Colunas a mais preenchidas** além das do cabeçalho (ex.: `1,5` num arquivo separado por vírgula). Colunas finais vazias a mais e colunas finais ausentes continuam aceitas.
   - Código não reconhecido ou nome vazio (como antes).
   A validação vem **antes** da classificação "já está na lista"/"repetida no arquivo": uma linha inválida aparece como ignorada, nunca como conhecida ou repetida. Linhas válidas de um arquivo misto podem ser incluídas normalmente; um arquivo sem nenhuma linha válida nova mostra "Nada a incluir" com as ignoradas e não grava nada. O **cabeçalho** com aspas malformadas (ou com campo que quebra a linha) recusa o arquivo inteiro (`PACOTE_INVALIDO`). Separadores aceitos: ponto e vírgula, vírgula e tabulação; BOM, LF/CRLF e linhas vazias como antes.
3. A prévia mostra **só os códigos que ainda não estão em uso**: códigos efetivos da estrutura (com os ajustados, inclusive excluídas e fora da estrutura) e das disciplinas para outros cursos (inclusive excluídas). Linhas com código inválido ou repetido no arquivo aparecem como ignoradas.
4. Todas vêm marcadas; a pessoa desmarca as que não quer. A inclusão confere a assinatura da prévia (`PREVIA_DESATUALIZADA` se a lista mudou) e grava tudo numa escrita. CH = 15 × aula + 30 × trabalho.
5. Se o código de uma disciplina da estrutura foi ajustado, o código original do Júpiter reaparece como "novo" na lista por unidade: basta desmarcá-lo (ou excluí-lo depois).
5a. **(1.8.1)** O mesmo vale para uma disciplina para outros cursos cujo código foi alterado no painel (ex.: incluída como PST0391, corrigida para PST0392): PST0391 reaparece como novo. Se for incluído, vira um **registro novo e independente**; como a chave "PST0391" (coluna Identificador) já é da disciplina corrigida, o novo recebe `PST0391-2` (`-3`, `-4`… se também ocupada, inclusive por excluída). A disciplina existente não muda (antes da 1.8.1, era sobrescrita). O cadastro manual continua recusando o código cuja chave está ocupada (`DISCIPLINA_EXISTENTE`).
6. **Cadastro manual**: código e nome obrigatórios; disciplina de semestre, unidade e curso atendidos, ativação/desativação e Observações opcionais.
6a. **Disciplina de semestre** (semestre de oferecimento; 1.3.1, renomeado na 1.3.2): 1º, 2º ou 1º e 2º semestres do ano, escolhido na ficha; vazio = não informado (a lista mostra "Semestre de oferecimento não informado", e o filtro Semestre de oferecimento › "Não informado" da etapa 2 lista as que faltam). É o que coloca a disciplina na grade do 1º ou do 2º semestre.
7. Disciplinas incluídas entram **fora** da grade horária (o envio é feito na etapa 3).

### 8.4 Lista para a grade horária (etapa 3)

- Estrutura + outros cursos, sem as excluídas; por padrão, sem as que saíram da estrutura ("Em uso").
- Mesmos filtros da etapa 1, mais **Origem** (estrutura / outros cursos) e **Grade horária** (adicionadas / ainda não adicionadas).
- **Período ideal "Ímpares" / "Pares"** (1.3.1): disciplinas da estrutura com oferta em período ideal ímpar (1º, 3º, 5º, 7º, 9º) ou par (2º… 10º), junto com os demais filtros de oferta na mesma habilitação. Olha **só o período ideal**: as disciplinas para outros cursos, que não têm período, não entram (para elas, use o filtro Semestre de oferecimento).
- **Enviar para a Grade Horária** (1.4.0): a caixa de cada linha, a do cabeçalho e "Selecionar todas as filtradas" **escolhem** (só na tela, sem chamar o servidor); "Enviar para a Grade Horária" grava de uma vez. As já adicionadas aparecem com a caixa marcada e travada e o rótulo **"✓ Adicionada à Grade Horária"** embaixo do nome.
- **Semestre de oferecimento obrigatório**: só entra na grade a disciplina com semestre de oferecimento em vigor (estrutura: ajustado ou pelo período ideal; outros cursos: o informado na ficha). As que não têm não são gravadas: continuam escolhidas e a barra lista os códigos ("Não enviadas por falta do semestre de oferecimento…"). O servidor confere de novo.
- **Na ficha**: "Adicionar à Grade Horária" (rodapé) fica ativo com o semestre de oferecimento definido — o gravado ou o escolhido no formulário. Com alterações por salvar, o clique **salva e adiciona numa só gravação** (1.4.3; na 1.4.1–1.4.2 eram duas chamadas ao servidor); se a gravação falhar, nada é salvo nem adicionado. Se, com as alterações, a disciplina ficar sem semestre de oferecimento, as alterações são salvas e ela não entra na grade (o aviso diz). Numa disciplina já adicionada, o botão mostra "✓ Adicionada à Grade Horária" (etapas 1–3) ou "Remover da grade" (etapa 4).
- O CSV baixado nas etapas 2 e 3 traz também origem, unidade e curso atendidos e se está na grade horária.
- A marca fica na coluna "Adicionada à grade horária" (abas "Ajustes manuais" e "Disciplinas para outros cursos"; até a 1.3.2, "Selecionada para a grade").

### 8.5 Prévia da grade horária (etapa 4, 1.4.0)

- **Semestre e ano da grade** (1.4.1): "1º semestre (ímpar)" ou "2º semestre (par)" e o ano (ano atual −1 a +3). Padrão: o próximo semestre (de julho a dezembro, 1º semestre do ano seguinte; de janeiro a junho, 2º semestre do mesmo ano). A prévia mostra só as disciplinas cujo semestre de oferecimento é o escolhido ou os dois, e diz quantas adicionadas ficaram de fora por serem só do outro semestre. Ex.: ímpar + 2027 = grade 2027/1. "Enviar Grade para Preenchimento" (1.5.0) usa esse semestre e ano (§8.7).
- Só as disciplinas **adicionadas à grade horária** (e não excluídas), em seis abas, como a planilha das secretarias: **PSA**, **PSC**, **PSE**, **PST** (pelos três primeiros caracteres do código em uso — as disciplinas que o IP dá para outros cursos, como PSA0185, ficam no seu departamento), **Interdepartamentais** (código começando por 470) e **Outras Unidades** (qualquer outro código: disciplinas que outras unidades dão aos alunos do IP).
- Colunas: Código, Nome, Semestre ideal (período ideal **por habilitação**, ex.: "Psicólogo 7º · Bacharelado 8º"; "—" nas disciplinas para outros cursos, que não têm período) e Observações.
- Em cada aba: caixa por disciplina, "Selecionar todas" (da aba) e **"Remover da grade"** (com confirmação), que tira a marca na planilha; a disciplina continua na lista da etapa 3 e pode ser enviada de novo.
- Clicar numa disciplina abre a ficha completa, editável, com **"Remover da grade"** no rodapé.

### 8.6 Cadastrar nova grade (1.4.0)

- Botão no topo do painel (só administradores), ao lado de "Carregar grade antiga" (desativado: as regras serão definidas depois).
- **Apaga a planilha inteira**: estrutura importada (CSV/PDF), histórico de importações e de alterações, ajustes e observações do painel, disciplinas para outros cursos e a grade em preparação. Sem cópia de segurança (decisão do Serviço de Graduação; só as grades finalizadas terão cópia, em fase futura).
- Confirmação: digitar **APAGAR** (o servidor confere). Roda sob a trava; com outra gravação em andamento, recusa (`OCUPADO`).
- A planilha continua sendo a mesma (o `ID_INDEX` não muda): as abas são recriadas vazias, como numa planilha nova. Depois, importe o CSV da "Grade Curricular" de novo.
- Se falhar no meio, o próximo administrador que abrir o painel termina o recomeço; até lá, leitores veem "base não preparada" e nenhuma gravação da preparação é aceita.

### 8.7 Enviar Grade para Preenchimento (1.5.0)

- **O que vai**: exatamente as disciplinas da prévia do semestre escolhido (adicionadas à grade, não excluídas, oferecidas nesse semestre ou nos dois), cada aba da prévia para a aba de mesmo nome da planilha das secretarias (PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades).
- **Uma linha por disciplina**, mesmo que ela apareça em mais de uma habilitação: as habilitações são simultâneas e o aluno cursa a disciplina uma vez só.
- **Colunas gravadas** (a partir da linha 4): C = código em uso; D = nome em uso, ou `Nome – Observações` quando há observação (ex.: "Avaliação da Inteligência – Para o Curso de enfermagem"); E = tipo (`Obrigatória`, `Eletiva` ou `Livre`, como a formatação da planilha espera); I = semestre ideal, só o número (ex.: 4); J = créditos-aula; **M = Horário de Fim automático** (1.6.0): fórmula início (L) + créditos-aula (J) horas — 1 crédito = 1 hora; o resultado é texto "HH:mm" (1.6.2), com o início em hora ou em texto ("08:00"); "-- : --" e outros textos em L são repetidos; sem início ou sem créditos, vazio. O envio não muda o formato nem o tipo da coluna M (1.6.2). A fórmula vai com o separador da localidade da planilha (1.6.3: ";" em português do Brasil); se M mostrar erro, o envio tenta o outro separador e, se ainda assim houver erro, o resultado avisa as linhas. As notas da coluna K (avisos de conflito do semestre anterior) são apagadas e a lista suspensa da coluna M é retirada (1.6.1: ela recusava a fórmula).
- **Tipo e semestre ideal quando as habilitações divergem**: valem os do **Psicólogo**; se a disciplina não está no Psicólogo, os do Bacharelado; depois os da Licenciatura. Ex.: 4701784 (Obrigatória no 7º no Bacharelado, Eletiva no 9º no Psicólogo) → Eletiva, 9. Oferta ajustada no painel vale.
- **Disciplinas para outros cursos** (ex.: PST0391, para a FEA): E e I em branco (não têm tipo nem semestre ideal no curso de Psicologia); ficam no fim da aba.
- **Ordem**: Obrigatórias, Eletivas, Livres, depois as sem tipo; dentro de cada bloco, semestre ideal e código.
- **Antes de mudar qualquer coisa**: confirmação na tela, com o número de disciplinas por aba e o nome novo do arquivo; o servidor confere que a grade é a mesma que a pessoa viu, que a planilha tem as 6 abas e o cabeçalho esperado e que o nome atual do arquivo diz o semestre.
- **(1.8.12) A confirmação vale para o conteúdo conferido.** A janela de confirmação busca no servidor a **prévia do envio** do semestre e ano escolhidos — as linhas exatamente como serão gravadas (aba, código, nome com observações, tipo, semestre ideal, créditos-aula) — e é isso que a pessoa confere. O envio só acontece se, no momento de gravar, o conteúdo for **o mesmo** (mesmas linhas, na mesma ordem, com os mesmos valores, para o mesmo ano/semestre). Se algo mudou depois da conferência — inclusive com as mesmas contagens (um nome, uma observação, créditos, código, tipo, semestre ideal, troca de uma disciplina por outra), por outra pessoa, outra aba do navegador ou uma gravação pendente concluída —, nada é copiado, apagado, gravado nem renomeado: aparece "A grade não foi enviada" com **Conferir de novo**. Mudanças que não vão para a planilha (CH, departamento, disciplinas fora da grade do semestre, filtros, seleção) não invalidam a conferência. Se os dados da própria página mudarem com a janela aberta, ela pede nova conferência antes de habilitar o envio — (1.8.13) só quando muda **o que será enviado** (disciplinas da grade do semestre, código, nome, observações, tipo, semestre ideal, créditos-aula, ordem ou ano/semestre); receber os mesmos dados de novo, salvar CH ou mudar uma disciplina fora da grade do semestre não pede. Se o pedido de envio concluiu antes uma gravação pendente, a janela diz que ela continua gravada e, quando o painel não conseguiu ler os dados atualizados, pede para recarregar a página (sem dizer que a mudança já aparece no painel).
- **Cópia de segurança**: o arquivo inteiro, como estava, vai para a pasta das grades anteriores com o nome atual + "(cópia de dd/mm/aaaa hh:mm)", e uma linha é acrescentada na planilha-índice: A = semestre do nome atual (ex.: "Grade Horária - 1º Semestre de 2026" → 2026/1), B = ID da cópia. Sem cópia registrada, nada é apagado.
- **O que é apagado**: o conteúdo das colunas B a S, linhas 4 a 999, das 6 abas — inclusive o que as secretarias já preencheram (fica na cópia). Formatação, caixas de seleção e listas suspensas ficam; colunas das práticas (T em diante), linhas 1–3 e as abas Informações, DataBase e a oculta "Disciplinas" não mudam.
- **Nome novo do arquivo**: "Grade Horária - 1º semestre de 2027" (semestre e ano escolhidos na prévia).
- **Reenviar** é permitido: cada envio faz uma nova cópia (e uma nova linha no índice) e regrava as abas. Linhas criadas à mão na planilha (ex.: disciplina dividida em dois dias) somem num reenvio: faça-as depois do envio definitivo.
- Só administradores. Leva alguns segundos (cópia do arquivo + 6 abas).

### 8.8 Auditoria da grade (1.6.0)

- **Uma auditoria por semestre**: ao enviar a grade de um semestre novo, é criada "Auditoria - Grade Horária - 1º semestre de 2027" na pasta das auditorias e o ID vai para a coluna C (Auditoria_ID) da linha desse semestre no índice. Reenviar o mesmo semestre continua na mesma auditoria.
- **Cópia de segurança no índice** (coluna B): na linha do semestre que está terminando (a do nome atual da planilha), a primeira com B vazia; se já tiver cópia (reenvio), numa linha nova. Assim, ao começar 2027/1, a linha de 2027/1 ganha a auditoria e a de 2026/2 ganha a cópia.
- **O que é registrado**: cada edição feita na planilha das secretarias — quem, quando, onde (aba e célula), qual campo, qual disciplina, o valor anterior e o novo. Colagens geram uma linha por célula (o Google não dá o valor anterior); colagens com mais de 300 células geram uma linha-resumo. O sistema também anota o envio da grade, o encerramento do semestre anterior e a ativação da auditoria.
- **O que não é registrado**: alterações feitas por scripts (por exemplo, a validação de conflito apagando dia e início — a nota explica na própria planilha) e mudanças só de formato.
- **E-mail**: aparece para contas @usp.br; outras aparecem como "(não identificado)".
- **Ativação**: uma vez, no editor (`ativarAuditoriaGrade`). Enquanto não for feita, o envio avisa.
- **(1.8.11) Trava do sistema nas escritas da auditoria.** Toda escrita na auditoria (aba Edições por posição, aba Aberturas, índice e criação de abas pela ativação) roda sob a trava do script — a mesma do envio, da preparação e das importações; contas diferentes disputam a mesma trava. O envio da grade anota "Envio da grade" e "Grade encerrada" com a **própria** trava e a mantém até o fim (conferência das fórmulas do Horário de Fim e gravação final); a anotação não a libera. O acionador de edição e o de abertura esperam a trava até 45 s; se não conseguirem, **não gravam** (nada de linha de reserva) e registram a falha no log de execução: aquela edição ou abertura fica sem registro (não há fila nem nova tentativa automática). A ativação espera até 10 s; depois, recusa com "Outra gravação está em andamento". Se a anotação do envio falhar, a grade continua enviada e a resposta traz o aviso de sempre ("…a linha do envio não pôde ser anotada…"); nada é desfeito nem repetido. A trava só exclui execuções do sistema: ela não impede ninguém de editar a planilha de auditoria à mão no Google Sheets.

### 8.9 Planilha das secretarias (1.6.0)

- **Horário de Fim** não é digitado: é a fórmula gravada pelo envio (início + créditos-aula), com resultado em texto "HH:mm". A coluna M deve ficar protegida e, na Tabela, com o tipo **Texto** (ou sem tipo).
- **Modalidade "Prática"**: Dia = "Horário Variável", Início = "-- : --".
- **Conflito de horário**: disciplina Eletiva ou Livre no mesmo dia e com horário sobreposto a uma Obrigatória do mesmo semestre ideal (em qualquer das 6 abas) → o dia e o início são apagados e a célula do dia ganha uma nota com a obrigatória em conflito. (Até a 1.5.x a verificação procurava "Obrigatórias"/"Optativas…" e nunca disparava.)

### 8.10 Painel da auditoria da grade (1.7.0)

- **Quem vê:** administradores e leitores (ex.: Comissão de Graduação). Só leitura: nada é gravado.
- **Grades:** abre na grade que está no nome da planilha das secretarias ("em preenchimento"); a lista traz as grades do índice que têm auditoria (coluna C), da mais nova para a mais antiga.
- **Preenchimento** (só na grade em preenchimento): para cada aba (PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades), quantas disciplinas têm **Será oferecida** (coluna G) preenchida, **Docente** (H) preenchido e **Dia e horário** (K e L) preenchidos — contagens do que está na planilha, sem julgar se a linha está "completa". A tabela da aba mostra cada disciplina com essas informações e a última edição feita por uma secretaria.
- **Grade encerrada:** sem a parte de preenchimento (a situação final está na cópia de segurança); só as edições.
- **(1.8.0) Não serão oferecidas** (no topo, só na grade em preenchimento): toda disciplina com "Será oferecida" = NÃO (com ou sem acento) aparece com o selo **Aguardando Justificativa** — na lista (com quem marcou e quando, pela auditoria), no cartão da aba e na tabela da aba. O departamento informa o motivo à Comissão de Graduação **fora da planilha**; o painel não marca a justificativa como recebida (o selo some só se a disciplina deixar de estar NÃO).
- **(1.8.0) Gráficos:** "Quem mais abre a planilha" (aberturas da planilha das secretarias no navegador, por e-mail; o aplicativo do celular não dispara o registro) e "Quem mais edita" (edições das secretarias por e-mail, contadas em todas as linhas da auditoria). Barras do maior para o menor, as 10 primeiras; "ver edições" filtra a linha do tempo. Substituem a tabela "Quem editou" da 1.7.0.
- **Edições:** da mais recente para a mais antiga, 50 por vez; busca (sem diferença de acento) e filtros por aba, pessoa e origem (secretarias/sistema). No máximo as 5.000 mais recentes vão ao navegador (o total aparece).
- **Histórico:** todas as edições de uma disciplina, numa janela.
- (1.8.0) Nenhum link para a planilha de auditoria, nem para administradores: o painel é a forma de consulta. (1.8.14) Vale também para o resultado de "Enviar Grade para Preenchimento": a resposta do servidor traz só o nome da auditoria, se foi criada agora e se o registro está ativo — sem endereço nem ID —, e a janela mostra o nome como texto, indicando a seção "Auditoria da grade". A cópia de segurança continua com o seu link.

