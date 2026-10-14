# Ajuda — Estrutura Curricular (texto-fonte da Central de Ajuda, 1.9.3)

> Fonte atual 1.10.0 sobre baseline 1.9.3. Conteúdo da Central preservado byte a byte no app; novo modo de navegação explicado em [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md).

> **Nota editorial.** Este é o texto-fonte revisado da Central de Ajuda do painel (`src/EstruturaAjuda.html`), na mesma organização, com os mesmos títulos e identificadores (`{#ajuda-…}`) usados pelos gatilhos contextuais "?". O padrão segue [docs/ajuda](../../ajuda/README.md) e o [modelo de conteúdo](../../ajuda/HELP_CONTENT_MODEL.md).
>
> - **Público:** equipe do Serviço de Graduação (Administrador), leitores autorizados e Comissão de Graduação (Leitor). Procedimentos só de administrador vêm marcados _(Administrador)_. O trabalho das secretarias é explicado como processo; não existe perfil "Secretaria" no painel.
> - **Linguagem:** efeito para quem usa o painel. Nomes de funções, IDs, chaves de configuração, editor do Apps Script e acionadores ficam na documentação técnica (README do código, ARQUITETURA, HOMOLOGACAO), não aqui.
> - **Manutenção:** ao mudar um texto, mude-o nos dois lugares (aqui e em `EstruturaAjuda.html`). Não renomeie identificadores sem ajustar os gatilhos (ver a tabela no fim) e rodar `testes/testar_ajuda.js`, que confere que todo destino existe.
> - **Fonte dos fatos:** código da 1.8.15/1.9.x e documentação atual (REGRAS, CSV_X_PDF, ARQUITETURA). Onde um texto anterior conflitava com o código, valeu o código (ver "Revisão editorial" no fim).

---

## Início {#ajuda-inicio}

**Como podemos ajudar?** Este painel guarda a estrutura curricular trazida do Júpiter, ajuda a preparar a lista da grade horária de cada semestre, envia essa lista à planilha que as secretarias preenchem e mostra o andamento desse preenchimento.

Atalhos por intenção:

- Quero consultar uma disciplina → [Consultar e filtrar](#ajuda-consultar)
- Quero importar a estrutura do Júpiter → [Antes de importar](#ajuda-antes)
- Quero corrigir uma disciplina → [Etapa 1 — corrigir uma disciplina](#ajuda-ajustes)
- Quero incluir disciplinas para outros cursos → [Etapa 2](#ajuda-outros-cursos)
- Quero preparar e enviar a grade → [As quatro etapas](#ajuda-preparar)
- Quero acompanhar o preenchimento → [Auditoria da grade](#ajuda-auditoria)
- Apareceu um aviso ou uma pendência → [Problemas comuns](#ajuda-problemas)

## Comece aqui {#ajuda-comece}

### Quatro coisas diferentes {#ajuda-comece-conceitos}

- **Estrutura curricular**: as disciplinas do curso, as habilitações (Psicólogo, Bacharelado, Licenciatura), créditos, cargas horárias, períodos ideais e requisitos — como estão no Júpiter.
- **Preparação da grade**: a escolha, no painel, das disciplinas que poderão ser oferecidas no semestre, incluindo as que o IP oferece a outros cursos.
- **Preenchimento**: o trabalho das secretarias dos departamentos na planilha da grade horária — docentes, dias, horários, vagas e salas.
- **Auditoria**: o acompanhamento desse preenchimento e o histórico das edições, só para consulta.

### O ciclo da grade, do Júpiter ao acompanhamento {#ajuda-comece-ciclo}

1. **Júpiter**: a estrutura do próximo semestre é fechada no Júpiter, que continua sendo a fonte oficial.
2. **Importação e conferência**: a equipe responsável importa o relatório "Grade Curricular" (CSV e, se quiser, PDF), confere a prévia e grava na base. Veja [Importação passo a passo](#ajuda-importar).
3. **Ajustes** (etapa 1): correções que ainda não estão no Júpiter, observações e exclusões.
4. **Outros cursos** (etapa 2): disciplinas do IP oferecidas a cursos de outras unidades.
5. **Inclusão na grade** (etapa 3): o que vai para a grade em preparação.
6. **Prévia e conferência do envio** (etapa 4): a grade por aba, como as secretarias vão vê-la, e a conferência final antes do envio.
7. **Planilha das secretarias**: o envio grava a lista na planilha de preenchimento; os departamentos preenchem.
8. **Acompanhamento**: a seção "Auditoria da grade" mostra o andamento e o histórico das edições.

No 2º semestre do ano prepara-se a grade do 1º semestre seguinte, e vice-versa.

### O que este sistema não faz {#ajuda-comece-limites}

- Não altera o Júpiter e não substitui o Júpiter como fonte oficial. Correções feitas no painel ficam guardadas à parte.
- Não monta automaticamente os horários: docentes, dias, horários, vagas e salas são informados pelas secretarias na planilha.
- Não publica uma nova grade visual para os alunos.
- Não recebe nem registra as justificativas das disciplinas que não serão oferecidas: elas são encaminhadas à Comissão de Graduação fora do painel.

### Administrador e Leitor {#ajuda-comece-perfis}

- **Leitor**: consulta a estrutura curricular (lista, filtros, ficha, currículos, importações) e a Auditoria da grade. Não altera nada.
- **Administrador**: também importa arquivos do Júpiter, corrige disciplinas, cadastra disciplinas para outros cursos, exclui e restaura, adiciona e remove da grade, envia a grade às secretarias e recomeça a base.

O perfil é definido pelo Serviço de Graduação. Não existe um perfil "Secretaria" neste painel: as secretarias trabalham na planilha da grade horária, e esta Central explica esse trabalho em [Preenchimento pelas secretarias](#ajuda-secretarias). Esconder um botão não é a proteção: cada ação é conferida de novo pelo sistema.

## O que você quer fazer? {#ajuda-tarefas}

### Consultar {#ajuda-tarefas-consultar}

- **Achar uma disciplina**: digite o código (ex.: PSA1302) ou palavras do nome na busca da lista. → [Consultar e filtrar](#ajuda-consultar)
- **Ver tudo sobre ela**: clique na disciplina (ou Enter sobre ela) para abrir a ficha. → [Ficha e requisitos](#ajuda-ficha)
- **Ver o que é obrigatório numa habilitação**: Filtros › Habilitação + Obrigatoriedade = Obrigatória.
- **Ver um departamento**: Filtros › Departamento.
- **Achar disciplinas com estágio, extensão ou práticas**: Filtros › Características.
- **Levar a lista para uma planilha**: filtre e clique em "Baixar lista (CSV)".
- **Ver as estruturas dos currículos** e o que mudou em cada importação: abas Currículos e Importações. → [Currículos](#ajuda-curriculos)

### Atualizar a base  _(Administrador)_ {#ajuda-tarefas-atualizar}

- **Trazer uma estrutura nova do Júpiter**: "Importar arquivo" › CSV do relatório "Grade Curricular". → [Antes de importar](#ajuda-antes)
- **Completar versão, extensão (EXT), requisitos "ou" e informações dos currículos**: "Importar arquivo" › PDF do mesmo relatório.
- **Saber o que mudou**: aba Importações › "Ver mudanças registradas".

### Preparar a grade  _(Administrador)_ {#ajuda-tarefas-preparar}

- **Corrigir ou anotar uma disciplina**: abra a ficha, mude o campo ou as Observações e clique em "Salvar". → [Etapa 1](#ajuda-ajustes)
- **Tirar uma disciplina da lista**: "Excluir disciplina" na ficha, ou caixas da lista › "Excluir". Dá para restaurar.
- **Marcar que é oferecida nos dois semestres**: ficha › "Disciplina de semestre" › "1º e 2º" › Salvar.
- **Incluir disciplinas do IP para outros cursos**: etapa 2. → [Etapa 2](#ajuda-outros-cursos)
- **Pôr disciplinas na grade**: etapa 3 › marque › "Enviar para a Grade Horária". → [Etapa 3](#ajuda-lista-grade)
- **Ver o que cada departamento vai preencher** e tirar da grade: etapa 4. → [Etapa 4](#ajuda-previa-grade)
- **Mandar a grade às secretarias**: etapa 4 › "Enviar Grade para Preenchimento". → [Envio às secretarias](#ajuda-envio-grade)

### Acompanhar {#ajuda-tarefas-acompanhar}

- **Ver o andamento do preenchimento**, quem editou o quê e as disciplinas que não serão oferecidas: "Auditoria da grade", no topo da página. → [Auditoria da grade](#ajuda-auditoria)
- **Entender o que as secretarias fazem na planilha**: → [Preenchimento pelas secretarias](#ajuda-secretarias)
- **Resolver um aviso** que apareceu no painel: → [Problemas comuns](#ajuda-problemas)

## Conta e permissões {#ajuda-acesso}

### Use a conta USP {#ajuda-acesso-conta}

1. Entre no navegador com a sua conta USP.
2. Se houver outras contas Google conectadas ao mesmo tempo (uma conta pessoal, por exemplo), o painel pode não reconhecer você. Saia das outras contas ou abra uma janela anônima e entre só com a conta USP.
3. Se a sessão expirou (o painel ficou aberto muito tempo), recarregue a página e entre de novo.

### Mensagens ao abrir o painel {#ajuda-acesso-mensagens}

- **"Não foi possível identificar sua conta"**: em geral é outra conta Google ativa no navegador ou sessão expirada. Faça o que está em "Use a conta USP" e abra o painel de novo.
- **"Sua conta não tem acesso a este painel"**: a conta ainda não foi liberada. Peça acesso ao Serviço de Graduação e diga se você precisa só consultar ou também importar e preparar a grade.
- **"Não foi possível falar com o servidor"**, ao abrir: verifique a conexão e use "Tentar de novo". Abrir o painel não importa nem envia nada; como administrador, porém, a abertura pode concluir antes um salvamento ou uma ação que já estava pendente — leia o aviso que aparecer (veja [Consulta ou gravação?](#ajuda-mensagens-leitura-gravacao)).
- **Mensagem sobre configuração** ("O sistema ainda não foi configurado", "Não foi possível abrir a planilha…"): não depende de você. Encaminhe a mensagem como apareceu ao Serviço de Graduação, para a equipe que mantém o sistema.

Esta Central funciona mesmo quando o painel não consegue carregar os dados: ela já vem pronta com a página.

### Não vejo "Importar arquivo" nem as etapas {#ajuda-acesso-botoes}

Sua conta tem perfil Leitor: você consulta a estrutura e a auditoria, mas não importa nem altera. Se o seu trabalho exige importar ou preparar a grade, peça ao Serviço de Graduação a mudança de perfil. Mudanças de acesso passam a valer em cerca de um minuto; depois, recarregue a página.

### Painel e arquivos são acessos diferentes {#ajuda-acesso-arquivos}

Ter acesso a este painel não dá acesso às planilhas usadas no trabalho, e conhecer o endereço de um arquivo também não: quem pode abrir cada planilha é definido no compartilhamento do próprio arquivo. As secretarias, por exemplo, editam a planilha da grade horária sem usar este painel. Para pedir ou retirar acesso a um arquivo, procure o Serviço de Graduação.

## Antes de importar  _(Administrador)_ {#ajuda-antes}

### Gerar o relatório no Júpiter {#ajuda-antes-gerar}

Júpiter › Estrutura Curricular › Relatórios › **"Grade Curricular"**, com:

- o curso e o currículo vigentes;
- o **complemento em branco** — assim o relatório traz todas as habilitações;
- tipo **Ativo**;
- as três obrigatoriedades marcadas (obrigatórias, optativas eletivas e optativas livres);
- formato CSV (e, se quiser o complemento, também PDF do mesmo relatório).

Importe quando a estrutura do próximo semestre estiver fechada no Júpiter e antes de preparar a grade.

### CSV ou PDF? {#ajuda-antes-csv-pdf}

- **CSV — recomendado**: nomes completos e todos os números, exatamente como no arquivo. Basta para consultar e para preparar a grade.
- **PDF — complemento**: acrescenta o que o CSV não traz — versão das disciplinas, horas de extensão (EXT), requisitos alternativos ("ou"), requisito fraco e as informações básicas de cada currículo. O PDF corta nomes longos.

**Ordem recomendada:** primeiro o CSV; depois, se quiser, o PDF. Dá para escolher os dois juntos: o sistema segue essa ordem sozinho. Importar só o PDF é possível nas condições explicadas em [Conferência do PDF e OCR](#ajuda-conferencia-pdf).

### Não abra e salve o CSV no Excel {#ajuda-antes-excel}

Importe o arquivo exatamente como veio do Júpiter. Ao abrir e salvar no Excel, o número do currículo vira notação científica (como 4,7012E+11) e perde dígitos, e códigos podem perder zeros à esquerda. Se isso já aconteceu, baixe o CSV de novo no Júpiter.

### Leitura do PDF: texto ou OCR {#ajuda-antes-pdf}

- Se o PDF tem **camada de texto**, a leitura é exata e leva segundos.
- Se o PDF é só imagem (sem camada de texto), o painel lê cada página por **reconhecimento de caracteres (OCR)**. Leva alguns minutos, mostra o progresso e o tempo estimado, e pode ser cancelado ("Cancelar leitura"). A leitura por OCR pode ter erros; por isso há conferências.
- O que decide é existir ou não a camada de texto, e não o nome do programa que gerou o PDF.
- Para ler PDF, o navegador baixa componentes públicos de leitura na primeira vez (e, no OCR, o modelo de português). Rede instável, rede que bloqueia esses endereços ou navegador muito antigo podem impedir a leitura do PDF; o CSV não depende deles.

### Para onde vão o arquivo e os dados {#ajuda-antes-privacidade}

- O arquivo é aberto e lido **no seu navegador**; o arquivo em si não é enviado.
- Para ler um PDF, o navegador baixa componentes públicos de leitura (veja acima).
- Os **dados extraídos** (disciplinas, números, requisitos) são enviados ao sistema para validação e para montar a prévia "O que vai mudar", antes de qualquer gravação.
- A base só é alterada quando você clica em **"Gravar na base"**, depois de conferir a prévia.

## Consultar e filtrar {#ajuda-consultar}

### Buscar uma disciplina {#ajuda-consultar-busca}

1. Na aba Disciplinas, digite no campo "Buscar por código ou nome" um código (ex.: PSA1302) ou palavras do nome.
2. Acentos e maiúsculas não importam: "psicopatologia" acha "Psicopatologia".
3. Com várias palavras, aparecem as disciplinas que têm **todas** elas no código ou no nome.
4. Uma disciplina corrigida no painel também é achada pelo código e pelo nome originais do Júpiter.

### Usar os filtros {#ajuda-consultar-filtros}

1. Escolha os filtros abaixo da busca. No celular, eles ficam no botão "Filtros", ao lado da busca.
2. Cada filtro ativo aparece como uma etiqueta acima da lista; o "×" da etiqueta remove só aquele filtro. "Limpar filtros" volta tudo ao padrão.
  - **Habilitação, Obrigatoriedade, Período ideal** (inclusive "Ímpares" e "Pares") e **Com requisito** — valem juntos, na mesma habilitação (veja abaixo);
  - **Semestre de oferecimento** — o semestre do ano em que a disciplina é oferecida;
  - **Departamento** e **Créditos-aula** (1, 2, 3, 4 ou 5 ou mais);
  - **Situação** — "Na estrutura atual" (padrão), "Fora da estrutura atual", "Todas (menos excluídas)" ou "Excluídas no painel";
  - **Características** — ajustadas no painel, com estágio (CE), com extensão (EXT), com práticas (CP), com requisito e "Tipo ou período diferente entre habilitações".

4. "Ordenar por" ordena por código, nome, período ideal ou créditos-aula (maior primeiro).

### Por que os filtros valem na mesma habilitação {#ajuda-consultar-mesma-habilitacao}

Habilitação, Obrigatoriedade, Período ideal e "Com requisito" precisam ser atendidos **juntos, pela mesma habilitação**. Exemplo: "Bacharelado + Obrigatória + 3º período" mostra as disciplinas obrigatórias **no Bacharelado** no 3º período. Uma disciplina obrigatória no Psicólogo e só eletiva no Bacharelado não aparece. Os selos de oferta que atendem aos filtros ficam em destaque na lista.

Já o Semestre de oferecimento, o departamento, os créditos, a situação e as características olham a disciplina como um todo.

### Oferta por habilitação × semestre de oferecimento {#ajuda-consultar-semestre}

- A coluna **"Oferta por habilitação"** mostra, em cada habilitação, o tipo e o período ideal (ex.: "Bacharelado · Obrigatória · 3º"). O período ideal é o semestre **do curso** (1º a 10º).
- O filtro **Semestre de oferecimento** olha o semestre **do ano** em que a disciplina é oferecida: o ajustado no painel ou, sem ajuste, o calculado pelo período ideal (ímpar = 1º semestre; par = 2º). Uma disciplina "1º e 2º semestres" aparece nos dois.
- Para saber o que entra na grade de um semestre, use o Semestre de oferecimento, não "Período ideal › Ímpares". Veja também o [glossário](#ajuda-glossario-semestre).

### Os selos da lista {#ajuda-consultar-selos}

- **Fora da estrutura atual**: estava numa importação anterior e não veio na última.
- **Excluída**: excluída no painel (só aparece com o filtro "Excluídas no painel").
- **Ajustada**: tem dados corrigidos no painel.
- **Oferta a revisar**: há vínculos de oferta que precisam de revisão (veja [Oferta a revisar](#ajuda-oferta-revisar)).
- **Oferecida: …**: semestre de oferecimento ajustado no painel.
- **✓ Adicionada à Grade Horária** (visto por administradores): já está na grade em preparação.

### Baixar a lista filtrada {#ajuda-consultar-baixar}

"Baixar lista (CSV)" gera um arquivo com **exatamente o que está filtrado na tela**: código, nome, departamento, créditos, CH, CE, CP, EXT, versão, tipo e período em cada habilitação, semestre de oferecimento, situação e observações. O arquivo usa acentos e separador ";" e abre direto no Excel.

Proteção: um valor que começa com =, +, - ou @ recebe um apóstrofo no início, para a planilha não o tratar como fórmula. Ao abrir no Excel, códigos só com números (ex.: 0420130) podem aparecer sem o zero à esquerda; confira o código no painel e nunca use um arquivo salvo pelo Excel para importar.

### Não achei a disciplina {#ajuda-consultar-nao-achei}

1. Veja as etiquetas acima da lista: uma busca ou um filtro pode estar escondendo a disciplina. Use "Limpar filtros".
2. Confira o código: ele pode ter sido corrigido no painel (a busca também acha pelo código original).
3. Mude Situação para "Fora da estrutura atual" ou "Todas (menos excluídas)": a disciplina pode ter saído na última importação.
4. Mude Situação para "Excluídas no painel": ela pode ter sido excluída (dá para restaurar).
5. Disciplinas para outros cursos não aparecem nesta lista: elas ficam nas etapas 2 e 3 (administradores).
6. Se ela deveria estar na estrutura, confira na aba Importações a data da última importação: a estrutura do Júpiter pode ter mudado depois.

## Ficha e requisitos {#ajuda-ficha}

### Como ler a ficha {#ajuda-ficha-ler}

- **Topo**: código, versão (quando conhecida) e departamento.
- **Em resumo**: a disciplina em poucas frases — créditos e horas, cargas especiais, onde é obrigatória, eletiva ou livre, onde não aparece e em que semestre do ano é oferecida.
- **Créditos e carga horária**: créditos-aula, créditos-trabalho, CH, estágio (CE), práticas (CP), extensão (EXT) e ATPA. **"não informado"** quer dizer que o arquivo importado não trouxe o dado (a EXT, por exemplo, só vem no PDF); **0** quer dizer que o arquivo informou zero.
- **Onde aparece**: em cada habilitação, o tipo, o período ideal e o semestre do ano que esse período indica.

Para administradores a ficha abre com campos editáveis; veja [Etapa 1 — corrigir uma disciplina](#ajuda-ajustes).

### Requisitos: "Basta um destes" e "e também" {#ajuda-ficha-requisitos}

- Os requisitos aparecem **por habilitação**; habilitações com a mesma lista aparecem juntas.
- **"Basta um destes"**: requisitos alternativos — cumprir um deles basta ("ou").
- **"e também"**: liga grupos diferentes — todos são exigidos.
- **Requisito fraco**: marcado assim quando o Júpiter o informa (no PDF).
- Clique no código de um requisito para abrir a ficha dele; "← Voltar para …" retorna.
- Se só o CSV foi importado, a ficha avisa que o arquivo não diz se os requisitos valem todos juntos ou se basta um. O CSV não traz essa relação; o PDF do mesmo relatório traz.

Os requisitos vêm só do Júpiter e **não podem ser editados** no painel nesta versão.

### "É requisito para" {#ajuda-ficha-requisito-para}

Lista as disciplinas que exigem esta, com as habilitações em que isso acontece. Clique no código para navegar.

### Observações, histórico da disciplina e histórico da grade {#ajuda-ficha-historicos}

- **Observações do Serviço de Graduação**: anotações da equipe sobre a disciplina (ex.: "disciplina prática"). São informativas e nunca são apagadas pelas importações.
- **Histórico** (na ficha): quando a disciplina entrou na base, quando foi alterada, quando a versão e a extensão foram conferidas no PDF, se foi ajustada no painel e as mudanças registradas nas importações.
- **Histórico da edição da grade**: o que as secretarias fizeram na planilha de preenchimento. Fica na [Auditoria da grade](#ajuda-auditoria), não na ficha.

## Currículos {#ajuda-curriculos}

### Os cartões por habilitação {#ajuda-curriculos-cartoes}

- Há um cartão para cada habilitação, com o **currículo em uso** (número de 12 dígitos: curso, habilitação e ano/semestre de cadastro), a data de cadastro e a situação no Júpiter.
- As contagens mostram quantas disciplinas, obrigatórias, optativas eletivas, optativas livres e requisitos o currículo tem.
- Depois que o PDF é importado, o cartão também mostra: ativo desde, duração ideal, mínima e máxima, o quadro de carga horária exigida (aula, trabalho e total por tipo de disciplina) e as informações específicas da habilitação, quando o relatório as traz.

### Exigências do currículo × dados da disciplina {#ajuda-curriculos-cargas}

- **Do currículo** (aba Currículos): estágio exigido, AAC (atividades acadêmicas complementares, com o percentual), AEX Apolo, extensão exigida e total geral. São exigências da habilitação, não de uma disciplina.
- **Da disciplina** (ficha): CE, CP, EXT e ATPA, a carga que aquela disciplina tem.

### Campos vazios ou que não foram gravados {#ajuda-curriculos-ausentes}

"—" ou "não informado" não significa zero. Um campo das informações do currículo pode faltar porque o PDF ainda não foi importado, porque não foi lido ou porque participa de uma conta do relatório que não fechou — nesse caso ele não é gravado e o valor anterior continua (veja [Conferência do PDF](#ajuda-conferencia-pdf)). Isso descreve a leitura do arquivo; não muda nenhuma regra acadêmica.

### Estruturas anteriores {#ajuda-curriculos-anteriores}

Quando uma importação traz um currículo mais novo para uma habilitação, o anterior continua registrado no fim da aba, em "Estruturas anteriores guardadas na base", com a indicação "substituído por … em …".

## Importações anteriores {#ajuda-historico-importacoes}

### O que cada cartão mostra {#ajuda-historico-importacoes-cartao}

- Data e hora e o nome do arquivo importado, com a forma de leitura (CSV, PDF com texto ou PDF lido por OCR).
- O modo (estrutura completa ou complemento) e os currículos envolvidos. Administradores também veem quem importou.
- Quantas disciplinas havia no arquivo e quantas ficaram novas, alteradas, saíram ou voltaram à estrutura, além das mudanças de oferta.

### "Ver mudanças registradas" {#ajuda-historico-importacoes-mudancas}

Abre a lista do que aquela importação mudou: disciplina, tipo de mudança, habilitação e, quando houver, o campo com o valor de antes e o de depois.

Não há botão para desfazer uma importação nem para voltar a uma importação anterior. Se um arquivo errado foi importado, importe o arquivo certo: a prévia mostra o que vai mudar.

## Importação passo a passo  _(Administrador)_ {#ajuda-importar}

### Os cinco passos da janela {#ajuda-importar-passos}

1. **Arquivo**: clique em "Importar arquivo" (no cartão do topo) e escolha ou arraste o CSV, o PDF ou os dois.
2. **Leitura**: o arquivo é lido no navegador. CSV: na hora. PDF: segundos (com texto) ou minutos (OCR), com progresso e "Cancelar leitura".
3. **Conferência**: quantas disciplinas foram encontradas em cada habilitação e, no PDF, a coerência dos números. **Erros** impedem seguir; **Avisos** e "Para saber" só informam. Clique em "Ver o que vai mudar".
4. **O que vai mudar**: o sistema compara com a base e mostra o que será gravado. **Nada foi gravado ainda.** Confira e clique em "Gravar na base".
5. **Gravado**: a janela confirma a importação. "Ver a estrutura" fecha a janela e atualiza o painel.

Escolher um arquivo, ler, conferir ou ver a prévia **não grava a importação**: só "Gravar na base" grava o arquivo na base. (Ao gerar a prévia, o sistema pode antes terminar a organização das abas de uma importação anterior que foi interrompida — veja [Consulta ou gravação?](#ajuda-mensagens-leitura-gravacao).)

### CSV e PDF de uma vez {#ajuda-importar-dois}

1. Escolha os dois arquivos juntos (na janela de arquivos, segure Ctrl — ou ⌘ no Mac — e clique nos dois) ou arraste os dois.
2. O CSV segue para a conferência e é gravado primeiro. Enquanto isso, o PDF é lido no navegador; a linha "Arquivo 1 de 2: CSV" mostra o andamento.
3. Depois de gravar o CSV, clique em **"Continuar com o PDF"**: vem a conferência do PDF, como complemento do que acabou de ser gravado.
4. **"Ver a estrutura (sem o PDF)"** fica só com o CSV; o PDF pode ser importado depois. "Escolher outro arquivo" ou fechar a janela também deixam o PDF de lado.

Só vale um CSV + um PDF. Dois arquivos do mesmo tipo, ou mais de dois, são recusados com explicação, e nada é lido. Se a leitura do PDF falhar, o CSV pode ser gravado normalmente e o que já foi gravado não é desfeito; importe o PDF outra hora.

### Estrutura completa × complemento {#ajuda-importar-previa}

- **Estrutura completa** (CSV, ou PDF de um currículo que a base ainda não tem): define a oferta e os requisitos das habilitações que estão no arquivo.
- **Complemento** (PDF de um currículo já em uso): acrescenta só o que o CSV não tem e **nunca muda** oferta, requisitos ou números já gravados.
- Habilitações que não estão no arquivo não são tocadas.
- **Substitui o currículo …**: a habilitação ganhou uma estrutura mais nova; a anterior fica registrada na aba Currículos.
- **Novas, alteradas, saem e voltam à estrutura**: disciplinas que entram, mudam, deixam de aparecer em todas as habilitações (ficam como "Fora da estrutura atual", sem ser apagadas) ou voltam a aparecer.
- **Diferenças entre o PDF e a base (não serão aplicadas)**: o PDF discorda do que está gravado; a base fica como está e a diferença serve para conferir no Júpiter.

### O que é preservado ao importar de novo {#ajuda-importar-reimportar}

- As **Observações** e as colunas extras criadas na planilha não são apagadas nem alteradas.
- Os **ajustes feitos no painel** continuam valendo por cima do que vier do Júpiter.
- Ao reimportar o CSV, os grupos "ou" que o PDF já informou são mantidos para o mesmo requisito no mesmo currículo.
- Um nome vindo do PDF nunca substitui um nome já gravado (o PDF corta nomes longos).

### Quando a importação não pode ser gravada {#ajuda-importar-recusas}

- O arquivo tem um **erro** de leitura (aparece na conferência).
- A base guarda **outro curso**: cada base guarda um curso.
- A estrutura do arquivo é **mais antiga** do que a da base para a mesma habilitação: confira se baixou o currículo vigente.
- PDF lido por OCR, como estrutura completa, com números que as contas do relatório não confirmaram: importe o CSV primeiro.

Nesses casos a prévia mostra "A importação não pode ser gravada", com o motivo, e "Gravar na base" fica desativado.

### Prévia que deixou de valer {#ajuda-importar-desatualizada}

Se outra importação foi concluída, ou alguém editou na planilha uma célula mantida pelo sistema, depois da prévia, a gravação é recusada e aparece "Gerar a prévia de novo". Gere a nova prévia, confira outra vez e grave. Editar Observações ou colunas extras não invalida a prévia.

### Depois de "Gravar na base" {#ajuda-importar-resultado}

- **"Importação gravada"**: concluída; "Ver a estrutura" atualiza o painel.
- **"Não foi gravado — a base continua como estava"**: a gravação foi recusada ou interrompida antes de valer. Siga a orientação da mensagem.
- **"Não foi possível confirmar se a importação foi gravada"**: a resposta se perdeu. Clique em **"Verificar agora"** antes de qualquer outra coisa e não importe o arquivo de novo antes de verificar. Veja [Resultado não confirmado](#ajuda-mensagens-importacao-incerta).

## Conferência do PDF e OCR  _(Administrador)_ {#ajuda-conferencia-pdf}

### As cinco partes da conferência {#ajuda-conferencia-pdf-cinco}

- **Leitura**: pela camada de texto (transcrição exata) ou por OCR (pode ter erros de leitura).
- **Coerência aritmética**: números que batem com as contas do próprio relatório — Tot. = Aula + Trab.; CH = 15 h × Aula + 30 h × Trab.; subtotais e totais de seção. "Corrigido" é um número mal lido que foi recuperado pelas contas.
- **Concordância com a base (CSV)**: quantos números e ofertas do PDF são iguais aos já gravados. Diferenças não são aplicadas.
- **Só no PDF**: extensão (EXT), versões que o CSV não traz e informações básicas dos currículos — sem segunda fonte.
- **Exige conferência humana**: o que depende da sua revisão antes de gravar.

### O que a coerência prova e o que não prova {#ajuda-conferencia-pdf-coerencia}

Coerência aritmética mostra consistência, **não prova cada leitura**: dois erros que se compensam mantêm a soma certa. Por isso:

- no OCR, um número sem coerência verificada **não é gravado**;
- se o currículo já está na base (complemento), o valor anterior continua;
- se seria a estrutura completa de uma habilitação, a gravação é bloqueada, com a orientação de importar o CSV primeiro.

### Revisão dos valores só do PDF {#ajuda-conferencia-pdf-revisao}

1. Na prévia, a lista "Valores só do PDF que serão gravados" mostra cada valor com a disciplina (ou o currículo), o campo, o valor do PDF, o valor de antes e a **página do PDF**.
2. A lista vem em páginas de até 100 itens ("‹ Anterior" e "Próxima ›"). O topo diz quantos valores há de cada tipo; os EXT iguais a 0 ficam reunidos no fim.
3. Confira no PDF, pela página indicada, principalmente os valores diferentes de zero e os que mudam um valor já gravado.
4. Se o PDF foi lido por OCR, a caixa "Conferi no PDF os … valores da lista" só é liberada depois de abrir **todas** as páginas da lista, e "Gravar na base" só depois de marcá-la. Em PDF com texto, a lista aparece sem exigir a marcação.

### Revisão incompleta ou expirada {#ajuda-conferencia-pdf-incompleta}

- **"A revisão não foi concluída: … páginas … não foram abertas"**: use "Próxima" até a última página (a mensagem diz quais faltam) e grave de novo. Nada foi gravado.
- **"A lista de valores desta prévia não está mais disponível"**: a prévia ficou aberta por muitas horas ou foi gerada por outra pessoa. Gere a prévia de novo. Nada foi gravado.

### Informações básicas dos currículos {#ajuda-conferencia-pdf-informacoes}

O sistema refaz as contas do quadro do currículo (subtotais, total, AAC, total geral, percentual de extensão, durações e, quando possível, horas obrigatórias pela grade). Para cada currículo, a prévia mostra quantas contas conferem e quais não fecham. Um campo que participa de uma conta que não fecha, ou que não foi lido, **não é gravado**; o valor anterior continua. Campos sem conta possível (como datas e textos) são gravados e entram na revisão quando o PDF foi lido por OCR.

### Importar só o PDF {#ajuda-conferencia-pdf-so-pdf}

É possível. Com camada de texto, a leitura é exata. Por OCR, como estrutura completa de uma habilitação, todos os números lidos precisam estar coerentes com as contas do relatório; caso contrário a gravação é bloqueada. Os nomes longos ficam cortados até que o CSV seja importado. Quando o OCR não confirmar os números, importe o CSV primeiro e depois o PDF, que então só complementa.

## Preparar a grade: as quatro etapas  _(Administrador)_ {#ajuda-preparar}

### As etapas, no topo do painel {#ajuda-preparar-etapas}

1. **Estrutura curricular**: consultar, corrigir, anotar e excluir disciplinas. → [Etapa 1](#ajuda-ajustes)
2. **Disciplinas para outros cursos**: incluir as disciplinas do IP oferecidas a cursos de outras unidades. → [Etapa 2](#ajuda-outros-cursos)
3. **Lista para a grade horária**: escolher o que vai para a grade em preparação. → [Etapa 3](#ajuda-lista-grade)
4. **Prévia da grade horária**: ver a grade do semestre por aba, tirar o que não deve ir e enviar às secretarias. → [Etapa 4](#ajuda-previa-grade)

Cada etapa mostra uma contagem. Só administradores veem as etapas. O que é feito com os botões de ação ("Salvar", "Excluir", "Incluir", "Enviar para a Grade Horária", "Remover da grade") é gravado na base na hora; marcar caixas não grava nada.

### Excluir e restaurar {#ajuda-preparar-excluir}

- **Excluir**: "Excluir disciplina" na ficha, ou marque as caixas na lista e use "Excluir" na barra que aparece. O painel pede confirmação.
- Excluir **não apaga** a disciplina: os dados continuam guardados. Ela some das listas e das contagens e **sai da grade em preparação**, se estava nela.
- **Restaurar**: Filtros › Situação › "Excluídas no painel", marque e clique em "Restaurar" (ou "Restaurar disciplina" na ficha).
- Restaurar **não recoloca** a disciplina na grade. Se ela deve ir para a grade, confira na etapa 3 e envie de novo com "Enviar para a Grade Horária".

### Ações em várias disciplinas de uma vez {#ajuda-preparar-lote}

1. Na lista, marque as caixas das disciplinas. A caixa do cabeçalho marca ou desmarca todas as que estão na lista filtrada.
2. A barra acima da tabela mostra quantas estão selecionadas e as ações possíveis ("Excluir", "Restaurar" ou "Limpar seleção").
3. Mudar o filtro Situação limpa a seleção.

Uma ação em lote pode ficar pendente se a planilha não responder no meio; veja [Ação em lote pendente](#ajuda-pendencias-lote).

## Etapa 1 — corrigir uma disciplina  _(Administrador)_ {#ajuda-ajustes}

### Corrigir e salvar {#ajuda-ajustes-salvar}

1. Abra a ficha da disciplina. Os dados aparecem em campos editáveis: código, nome, departamento, créditos-aula e -trabalho, CH, CE, CP, EXT, ATPA, versão, "Disciplina de semestre" e, em "Onde aparece", o tipo e o período ideal em cada habilitação ("— não faz parte —" tira a disciplina daquela habilitação).
2. Mude o que precisar. O botão **"Salvar"** só se acende quando algo mudou.
3. Clique em "Salvar". O campo corrigido passa a mostrar "Ajustado · Júpiter: …" com o valor original, e a disciplina ganha o selo **Ajustada** na lista.

A correção fica guardada à parte (é um **ajuste**) e continua valendo depois das próximas importações. O Júpiter não muda: o ideal é corrigir também lá.

Regras: o código segue o formato do Júpiter (AAA9999 ou 9999999) e não pode repetir o de outra disciplina, mesmo excluída ou para outros cursos; o nome é obrigatório; números são inteiros de 0 a 9999. Um campo deixado vazio volta a usar o valor do Júpiter: não dá para "apagar" um valor que o Júpiter informa. Se duas pessoas salvarem a mesma disciplina ao mesmo tempo, vale a última gravação.

### Rascunho × alteração gravada {#ajuda-ajustes-rascunho}

Enquanto você não clica em "Salvar", o que foi digitado é só um rascunho na ficha aberta. Ao fechar a ficha com alterações não salvas, o painel pergunta antes de descartar. Depois de "Salvar" e do aviso "Alterações salvas.", a alteração está gravada.

### Mudou os créditos? Confira a CH {#ajuda-ajustes-ch}

A CH não é recalculada sozinha quando os créditos de uma disciplina da estrutura mudam: há disciplinas em que o Júpiter registra outra carga. A ficha avisa "Pelos créditos seriam … h — confira a CH". (No cadastro de disciplina para outros cursos, a CH vazia é calculada como 15 h × aula + 30 h × trabalho.)

### "Voltar aos dados do Júpiter" {#ajuda-ajustes-jupiter}

1. O botão aparece na ficha de uma disciplina ajustada. Ele coloca no formulário os valores do Júpiter — **não grava nada sozinho**.
2. Clique em **"Salvar"** para gravar. O ajuste é removido e a disciplina volta a seguir o Júpiter, inclusive nas próximas importações.
3. Se a oferta ("Onde aparece") estava ajustada, o ajuste de oferta é removido mesmo que o tipo e o período mostrados já sejam iguais aos do Júpiter. Mexer em "Onde aparece" depois do botão vale como nova escolha.
4. Se a disciplina tem vínculos de oferta a revisar, marque também "Descartar os vínculos a revisar ao salvar" (veja [Oferta a revisar](#ajuda-oferta-revisar)).

### Observações {#ajuda-ajustes-observacoes}

Escreva em "Observações" (até 2.000 caracteres) e salve. São só informativas e nunca são apagadas pelas importações. Atenção: as observações vão junto com o nome da disciplina para a planilha das secretarias ("Nome – Observações") quando a grade é enviada.

### Enquanto a ficha está salvando {#ajuda-ajustes-gravando}

- Os campos da ficha ficam travados até a resposta; os botões mostram o andamento ("Salvando…").
- Outra gravação de ficha espera esta terminar: o painel avisa "Aguarde: a gravação de … ainda não terminou".
- Você pode fechar a ficha ou abrir outra. Fechar não cancela o pedido: a gravação continua, e o aviso no rodapé diz, com o código da disciplina, se deu certo.
- A resposta pertence à disciplina que iniciou a gravação: ela não mexe numa outra ficha aberta depois, nem no rascunho dela.
- Se a mesma disciplina for reaberta antes da resposta, a ficha mostra os dados de antes; feche e abra de novo para ver o que foi gravado.

## Oferta ajustada depois de uma troca de currículo {#ajuda-oferta-revisar}

### "Oferta ajustada associada ao currículo atual" {#ajuda-oferta-revisar-associada}

Quando "Onde aparece" foi ajustado no painel e depois foi importada uma estrutura mais nova da mesma habilitação, o sistema leva o tipo e o período ajustados para o currículo em uso, desde que isso seja seguro: a sucessão precisa ser do mesmo curso e da mesma habilitação. A ficha mostra esse aviso para você saber que a associação foi feita. Não é preciso fazer nada.

### "Oferta a revisar" {#ajuda-oferta-revisar-revisar}

Quando a associação não pode ser feita com segurança (por exemplo, o currículo antigo não aparece mais na base, ou dois vínculos chegariam ao mesmo currículo com tipo ou período diferentes), a disciplina ganha o selo **Oferta a revisar** e a ficha mostra cada vínculo com o motivo.

- Esses vínculos continuam guardados, mas **não contam** para os filtros, para o semestre de oferecimento calculado nem para a grade e o envio.
- Salvar outros campos (nome, observações, semestre…) **não descarta** os vínculos a revisar.

### Como resolver  _(Administrador)_ {#ajuda-oferta-revisar-resolver}

1. Na ficha, ajuste "Onde aparece" com a oferta correta para o currículo em uso.
2. Marque **"Descartar os vínculos a revisar ao salvar"**.
3. Clique em "Salvar" e confirme. O descarte não pode ser recuperado pelo painel.

Para voltar à oferta do Júpiter, use "Voltar aos dados do Júpiter", marque a mesma caixa e salve: a restauração também exige o descarte confirmado. Sem a caixa, o painel recusa e nada é salvo. Não tente resolver apagando linhas na planilha.

## Etapa 2 — disciplinas para outros cursos  _(Administrador)_ {#ajuda-outros-cursos}

### Os dois sentidos de "outros" {#ajuda-outros-cursos-o-que}

- **Disciplinas para outros cursos** (esta etapa): disciplinas **do IP** ministradas para cursos de outras unidades (ex.: PST0391, para a FEA). Não estão na estrutura curricular da Psicologia, por isso são incluídas aqui.
- **Outras Unidades** (aba da prévia e da planilha): disciplinas que **outras unidades** oferecem aos alunos do IP. Essas já estão na estrutura curricular.

### Importar a lista da unidade {#ajuda-outros-cursos-lista}

1. No Júpiter: Estrutura Curricular › Relatórios › **"Lista de disciplinas por unidade"** (Unidade: Instituto de Psicologia; Opção: Ativas), em **CSV**. É um relatório diferente da "Grade Curricular".
2. No painel: etapa 2 › **"Importar lista da unidade (CSV)"** e escolha o arquivo. O PDF desse relatório não é aceito: é uma imagem e só acrescentaria a versão, que a grade não usa.
3. Aparecem só as disciplinas cujo código **ainda não está em uso**, todas marcadas.
4. Desmarque as que não devem entrar e clique em **"Incluir"**. Elas ganham o selo "Para outros cursos".

Incluir nesta lista **não** coloca a disciplina na grade: isso é feito na etapa 3.

### "Linhas ignoradas — não serão incluídas" {#ajuda-outros-cursos-ignoradas}

- Linhas com problema aparecem nessa lista, com o número da linha (ou o intervalo, como "Linhas 2 a 4") e o motivo, e **não entram**.
- Motivos comuns: créditos negativos, fracionários ou com texto; aspas abertas ou malformadas; colunas a mais preenchidas; código não reconhecido ou nome vazio.
- Créditos **vazios** são aceitos e ficam como "não informado". Valores como 3,0 também são aceitos; nada é arredondado.
- Se um campo entre aspas não fecha na mesma linha, as linhas que ficam dentro dele também são ignoradas; se não fecha até o fim do arquivo, nada a partir dali é lido.
- As demais linhas podem ser incluídas normalmente. Para incluir uma linha ignorada, corrija o arquivo e escolha-o de novo.
- Se nenhuma linha válida traz disciplina nova, aparece "Nada a incluir" e nada é gravado.

### Códigos já em uso e código antigo que reaparece {#ajuda-outros-cursos-codigos}

A lista compara pelos códigos **em uso**: os da estrutura (já com as correções, inclusive das excluídas e das que saíram da estrutura) e os das disciplinas para outros cursos (inclusive excluídas). Se você corrigiu o código de uma disciplina, o código original pode reaparecer como novo. Se for incluído, vira uma disciplina nova e independente — a corrigida não muda. Na dúvida, desmarque-o antes de incluir.

### Cadastrar uma disciplina avulsa e completar os dados {#ajuda-outros-cursos-cadastro}

1. Etapa 2 › **"+ Cadastrar disciplina"**. Código e nome são obrigatórios.
2. Os campos desse cadastro são próprios: departamento, créditos, CH, **Disciplina de semestre** (1º, 2º ou 1º e 2º), unidade e curso atendidos, ativação e desativação no Júpiter e Observações. Não há tipo, período ideal nem requisitos: ela não faz parte da estrutura da Psicologia.
3. A "Disciplina de semestre" é o que põe a disciplina na grade do semestre certo. Para achar as que estão sem ela: Filtros › Semestre de oferecimento › "Não informado".

Uma disciplina para outros cursos pode ser excluída e restaurada como as da estrutura.

## Etapa 3 — escolher para a grade  _(Administrador)_ {#ajuda-lista-grade}

### Três ações diferentes {#ajuda-lista-grade-tres}

- **Marcar a caixa** de uma disciplina: só uma escolha na tela. Nada é gravado; ao fechar a página, a escolha se perde.
- **"Enviar para a Grade Horária"** (etapa 3): grava as escolhidas na **grade em preparação**, dentro do painel. As secretarias ainda não veem nada.
- **"Enviar Grade para Preenchimento"** (etapa 4): grava a grade do semestre na **planilha das secretarias** — veja [Envio às secretarias](#ajuda-envio-grade).

### Passo a passo {#ajuda-lista-grade-passos}

1. A lista junta a estrutura curricular e as disciplinas para outros cursos (sem as excluídas), com a mesma busca e os mesmos filtros, mais **Origem** e **Grade horária** (adicionadas / ainda não adicionadas).
2. Marque as disciplinas, ou use a caixa do cabeçalho ou "Selecionar todas as filtradas".
3. Clique em **"Enviar para a Grade Horária"**.
4. As adicionadas ficam com a caixa marcada e travada e o rótulo "✓ Adicionada à Grade Horária". Para tirar da grade, use a etapa 4 ou a ficha aberta pela prévia.

### "Não enviadas por falta do semestre de oferecimento" {#ajuda-lista-grade-semestre}

Só entra na grade a disciplina com semestre de oferecimento definido. Nas da estrutura, ele vem do período ideal (ou do ajuste na ficha); nas disciplinas para outros cursos, precisa ser escolhido na ficha. As que ficaram de fora **continuam marcadas** e aparecem listadas na barra. Abra a ficha de cada uma, escolha a "Disciplina de semestre", salve e clique de novo em "Enviar para a Grade Horária".

### Adicionar pela ficha {#ajuda-lista-grade-ficha}

No rodapé da ficha, **"Adicionar à Grade Horária"** fica ativo quando há semestre de oferecimento (o gravado ou o escolhido no formulário). Se houver alterações por salvar, o botão **salva essas alterações e pede a inclusão na grade no mesmo pedido**. O resultado pode ser:

- **Recusa antes da gravação** (por exemplo, um campo inválido ou um código já usado): o pedido não é aplicado — nem as alterações, nem a inclusão. Corrija o que a mensagem indica e tente de novo.
- **"Alterações salvas e disciplina adicionada à Grade Horária."**: tudo gravado.
- **"Salvamento pendente — código"**: o pedido começou e não terminou. **Parte das alterações ou a própria inclusão na grade pode já estar gravada** (a mensagem diz o que já foi). Siga o aviso e use "Concluir salvamento pendente", que grava só o que falta.
- **"Salvamento não confirmado"**: não foi possível saber se terminou. Preserve o que digitou, recarregue e confira os dados gravados antes de repetir.
- **Concluído, com "Recarregue a página"**: está gravado, mas a tela ainda mostra os dados de antes.

Uma falha de conexão não prova que nada foi salvo. Como agir em cada caso: [Pendências e gravações](#ajuda-pendencias). Numa disciplina já adicionada, o botão mostra "✓ Adicionada à Grade Horária" nas etapas 1 a 3 e "Remover da grade" quando a ficha é aberta pela prévia.

## Etapa 4 — prévia da grade horária  _(Administrador)_ {#ajuda-previa-grade}

### Escolher o semestre e o ano {#ajuda-previa-grade-alvo}

No topo da etapa 4, escolha o **semestre da grade** — "1º semestre (ímpar)" ou "2º semestre (par)" — e o **ano**. Exemplo: ímpar + 2027 = grade 2027/1. Por padrão vem o próximo semestre: de julho a dezembro, o 1º semestre do ano seguinte; de janeiro a junho, o 2º semestre do mesmo ano.

A prévia mostra só as disciplinas adicionadas à grade que são oferecidas nesse semestre ou nos dois. O resumo diz quantas adicionadas ficaram de fora por serem só do outro semestre.

### As seis abas {#ajuda-previa-grade-grupos}

- **PSA, PSC, PSE e PST**: pelo prefixo do código em uso. As disciplinas que o IP dá para outros cursos ficam no departamento do código (ex.: PSA0185 no PSA).
- **Interdepartamentais**: códigos que começam por 470.
- **Outras Unidades**: os demais códigos — disciplinas que outras unidades oferecem aos alunos do IP.

Colunas: código, nome, semestre ideal em cada habilitação (ex.: "Psicólogo 7º · Bacharelado 8º") e observações.

### Tirar da grade e abrir a ficha {#ajuda-previa-grade-remover}

- Marque as disciplinas (ou "Selecionar todas", da aba) e clique em **"Remover da grade"**. O painel pede confirmação. Elas voltam a ficar livres na etapa 3 e podem ser enviadas de novo.
- Clique no código para abrir a ficha completa, editável, com "Remover da grade" no rodapé.

### Prévia da página × conferência do envio {#ajuda-previa-grade-local}

A prévia da etapa 4 é montada com os dados carregados nesta página. Ao clicar em "Enviar Grade para Preenchimento", a janela busca no sistema as linhas exatamente como serão gravadas; é essa lista que vale. Se alguém mudou a grade em outra aba ou outro computador, a janela avisa "A lista mudou desde que a página foi carregada".

## Envio às secretarias  _(Administrador)_ {#ajuda-envio-grade}

### Passo a passo {#ajuda-envio-grade-passos}

1. Na etapa 4, escolha o semestre e o ano da grade.
2. Clique em **"Enviar Grade para Preenchimento"**. A janela confere no sistema o que será enviado.
3. Confira as contagens por aba, a lista "Disciplinas que serão gravadas" (aba, código, nome com observações, tipo, semestre ideal e créditos) e o nome que o arquivo vai ganhar.
4. Clique em **"Fazer a cópia e enviar"**.
5. Leia o resultado e os avisos, se houver.

Combine com as secretarias para fazer o envio definitivo **antes** de elas começarem a preencher: um novo envio apaga o preenchimento (veja abaixo).

### O que é gravado em cada linha {#ajuda-envio-grade-linhas}

- **Uma linha por disciplina**, mesmo que ela apareça em mais de uma habilitação: o aluno cursa a disciplina uma vez só.
- **Tipo e semestre ideal**: os do Psicólogo; se a disciplina não está no Psicólogo, os do Bacharelado; depois os da Licenciatura — entre as habilitações em uso. Uma oferta ajustada no painel vale.
- **Disciplinas para outros cursos**: tipo e semestre ideal em branco; ficam no fim da aba.
- **Nome**: o nome em uso; com observação, "Nome – Observações".
- **Créditos-aula** e o **horário de fim automático** (início + créditos-aula, 1 crédito = 1 hora): as secretarias só escolhem o início.
- Ordem: obrigatórias, eletivas, livres e sem tipo; dentro de cada grupo, semestre ideal e código.

### O que o envio apaga e o que preserva {#ajuda-envio-grade-efeitos}

1. Faz uma **cópia de segurança** do arquivo das secretarias, como estava, na pasta das grades anteriores, e a registra no índice.
2. Cria — ou reaproveita, se já existir — a **auditoria** do semestre de destino.
3. **Apaga** o conteúdo das colunas B a S, das linhas 4 a 999, nas seis abas (PSA, PSC, PSE, PST, Interdepartamentais e Outras Unidades) — inclusive o que as secretarias já tinham preenchido e linhas extras feitas à mão.
4. **Preserva** a formatação, as caixas de seleção e as listas suspensas, as colunas das práticas (T em diante), as linhas 1 a 3 e as demais abas. As notas de conflito de horário do semestre anterior são retiradas.
5. Grava as linhas da grade e **renomeia o arquivo** (ex.: "Grade Horária - 1º semestre de 2027").

Nada é apagado antes de a cópia de segurança estar feita e registrada.

### A cópia e a auditoria pertencem a semestres diferentes {#ajuda-envio-grade-copia}

- A **cópia de segurança** guarda o arquivo como estava **antes** do envio. Ela pertence ao semestre que estava no nome do arquivo antes do envio (o que está terminando).
- A **auditoria** criada ou reaproveitada pertence ao semestre **de destino** do envio.

Exemplo: ao enviar a grade 2027/1 sobre um arquivo chamado "Grade Horária - 2º semestre de 2026", a cópia fica registrada como 2026/2 e a auditoria é a de 2027/1. O resultado do envio traz o link da cópia; a auditoria é consultada aqui no painel, em "Auditoria da grade".

### Reenviar o mesmo semestre {#ajuda-envio-grade-reenvio}

É permitido, e cada reenvio faz uma **nova cópia de segurança** e regrava as seis abas — apagando o que as secretarias já preencheram (o que fica só na cópia) e as linhas extras feitas à mão, como uma aula dividida em dois dias. Não existe trava que impeça um reenvio: combine o envio definitivo com as secretarias antes do preenchimento e faça as linhas extras só depois dele.

Cuidado se um reenvio ficar sem resposta: o arquivo já tem o nome do semestre e as mesmas disciplinas do envio anterior, então o nome e os códigos não mostram se a tentativa nova terminou. Veja [Envio sem resposta: como conferir](#ajuda-envio-grade-resultado).

### A confirmação vale para o que você conferiu {#ajuda-envio-grade-conferir}

- O envio só acontece se, na hora de gravar, o conteúdo for **o mesmo** da lista conferida: mesmas disciplinas, códigos, nomes, observações, tipos, semestres ideais, créditos-aula, ordem e semestre/ano.
- Se algo disso mudou depois da conferência (por você, por outra pessoa ou em outra aba), aparece "Os dados mudaram depois desta conferência" ou "A grade não foi enviada", com **"Conferir de novo"**. Confira a lista atualizada e envie.
- Mudanças que não vão para a planilha — a CH, o departamento, disciplinas fora da grade deste semestre, filtros ou seleções — **não** pedem nova conferência.
- Abrir esta Central não invalida a conferência, não busca outra lista e não envia nada.

### Resultados possíveis {#ajuda-envio-grade-resultado}

- **"Grade … enviada para preenchimento"**: concluído. Veja as contagens, o nome novo do arquivo, o link da cópia de segurança e os avisos.
- **"A grade não foi enviada"**: o envio foi recusado antes de mudar a planilha — prévia desatualizada ou não conferida, nome do arquivo sem semestre, planilha fora do formato esperado, falta de acesso a algum recurso. A mensagem diz o motivo e o que fazer.
- **"O envio parou no meio"**: a cópia de segurança foi feita, mas nem todas as etapas do envio foram concluídas; a planilha pode ter ficado incompleta. Envie de novo para refazer o envio (uma nova cópia será feita). A mensagem diz o nome da cópia de antes do envio.
- **"Não sabemos se a grade foi enviada"**: a conexão falhou sem resposta. O resultado continua **não confirmado**: o envio pode ter acontecido, por inteiro ou em parte, ou não ter acontecido. Não repita às cegas — siga "Envio sem resposta: como conferir", abaixo.

**Envio sem resposta: como conferir.**

1. Abra a planilha da grade horária e compare **o conteúdo das seis abas** com a lista que você acabou de conferir para esta tentativa: as disciplinas, os códigos, os nomes com observações, o tipo, o semestre ideal e os créditos-aula. Confira também as inclusões e as remoções (o que entrou e o que saiu), não só a presença de alguns códigos.
2. **Num reenvio do mesmo semestre**, o nome do arquivo, os códigos e as quantidades podem ser os mesmos do envio anterior. Isso, sozinho, não comprova que a tentativa atual terminou: só as diferenças que você fez depois do envio anterior (um nome, uma observação, os créditos) mostram qual conteúdo está na planilha.
3. Na **Auditoria da grade**, um evento "Envio da grade" (origem "Sistema") com a data e a hora da tentativa é uma evidência complementar de que ela chegou ao fim da gravação. A ausência do evento não prova que nada ocorreu: o envio pode ter parado antes, e a anotação pode falhar sem impedir o envio.
4. Se os dados das seis abas correspondem à lista que você conferiu, isso mostra que **esses dados estão na planilha**, mas **não confirma sozinho que todas as etapas do envio terminaram**: etapas posteriores à gravação desses dados podem ter ficado por fazer — por exemplo, as fórmulas de Horário de Fim. Quando as duas tentativas têm conteúdo idêntico, essa comparação também não mostra qual delas terminou.
5. Por isso, o resultado continua **não confirmado** até haver evidência suficiente de que o envio terminou. Se o conteúdo ainda for o anterior, estiver misturado ou a conclusão continuar incerta, procure o Serviço de Graduação antes de decidir reenviar.

Lembre-se: cada envio faz **outra cópia de segurança** e **apaga e regrava** o preenchimento das seis abas.

Se a janela disser que uma gravação pendente foi concluída antes do envio, ela continua gravada; quando o painel não conseguiu atualizar os dados, recarregue a página para ver o que foi gravado e confira o envio de novo.

### Avisos depois de um envio concluído {#ajuda-envio-grade-avisos}

- **Registro das edições e aberturas não está completo**: a grade **foi enviada**; o que falta é ativar o registro da auditoria, uma tarefa da manutenção do sistema. Não é preciso reenviar a grade para ativar. Encaminhe o aviso ao Serviço de Graduação.
- **A coluna Horário de Fim mostra erro em algumas linhas**: o resto foi gravado. Encaminhe as linhas citadas ao Serviço de Graduação para conferência na planilha.
- **A linha do envio não pôde ser anotada na auditoria**: o envio foi concluído; só a anotação do evento faltou.

## Preenchimento pelas secretarias {#ajuda-secretarias}

### Onde cada parte acontece {#ajuda-secretarias-onde}

- A preparação e o envio da grade acontecem **neste painel**, pelo Serviço de Graduação.
- O preenchimento acontece **na planilha da grade horária** que o Serviço de Graduação já disponibilizou às secretarias. As secretarias não usam este painel para preencher.
- Cada departamento trabalha na sua aba (PSA, PSC, PSE ou PST); as abas Interdepartamentais e Outras Unidades seguem a organização combinada com o Serviço de Graduação.

Este guia orienta o processo. Ele não concede acesso à planilha: para isso, procure o Serviço de Graduação.

### O que a secretaria preenche {#ajuda-secretarias-campos}

- **Será oferecida**, **docente(s)**, **modalidade**, **dia da semana** e **horário de início**, **vagas**, **observações** e **sala**.
- Código, nome, tipo, semestre ideal e créditos-aula vêm do envio da grade; o horário de fim é calculado. Esses campos não são para preencher à mão.

### Horário de fim automático {#ajuda-secretarias-fim}

O horário de fim é uma fórmula: início + créditos-aula (1 crédito = 1 hora). A secretaria só escolhe o início; o fim aparece sozinho. Não digite por cima da fórmula. Se o fim parecer errado, confira o início e os créditos-aula da linha e avise o Serviço de Graduação.

### Modalidade "Prática" {#ajuda-secretarias-pratica}

Ao escolher a modalidade "Prática", a planilha preenche sozinha o dia com "Horário Variável" e o início com "-- : --"; o horário de fim acompanha.

### Dia e início apagados por conflito {#ajuda-secretarias-conflito}

Ao escolher o dia ou o início de uma disciplina **Eletiva** ou **Livre**, a planilha procura, nas seis abas, uma **Obrigatória** do mesmo semestre ideal, no mesmo dia, com horário sobreposto. Se encontrar, ela apaga o dia e o início da linha editada e explica o motivo numa nota na célula do dia (código, aba e horários da obrigatória). Escolha outro dia ou horário.

### O que a verificação não cobre {#ajuda-secretarias-limites}

- Ela só compara uma Eletiva ou Livre com Obrigatórias do mesmo semestre ideal, no momento em que o dia, o início ou a modalidade dessa linha são editados.
- Não compara obrigatórias entre si, eletivas entre si, salas ou docentes, e não revisa as linhas já preenchidas quando uma obrigatória muda depois.
- Colagens de mais de 50 linhas de uma vez não passam pela verificação de conflito.

Por isso ela ajuda, mas **não garante** uma grade sem sobreposições: a conferência final continua sendo das pessoas.

### Aula dividida em mais de uma linha {#ajuda-secretarias-linhas}

Uma aula dividida em dois dias pode ocupar uma linha extra criada à mão. Faça isso só depois do envio definitivo: um novo envio da grade apaga as linhas extras e todo o preenchimento das seis abas (o que estava preenchido fica só na cópia de segurança).

### Disciplina marcada "NÃO" em "Será oferecida" {#ajuda-secretarias-nao}

Ao marcar NÃO, o departamento precisa informar o motivo à **Comissão de Graduação**, pelo canal combinado com ela, fora deste painel e da planilha. Na Auditoria da grade, a disciplina aparece como "Aguardando Justificativa" enquanto estiver marcada NÃO; o painel não registra o recebimento da justificativa.

## Auditoria da grade {#ajuda-auditoria}

### Abrir e atualizar {#ajuda-auditoria-abrir}

1. No topo da página, clique em **"Auditoria da grade"** (para voltar, "Estrutura curricular"). Administradores e leitores veem esta seção; ninguém altera nada por ela.
2. Em **Grade**, vem escolhida a grade em preenchimento; as grades anteriores com auditoria aparecem na lista.
3. A linha abaixo mostra a hora da última leitura ("Atualizado às …"). Os dados **não se atualizam sozinhos**: clique em **"Atualizar"** para ler de novo.

A forma de consulta é este painel: não há link nem endereço da planilha de auditoria, para nenhum perfil.

### "Não serão oferecidas" e "Aguardando Justificativa" {#ajuda-auditoria-justificativas}

- Lista as disciplinas marcadas com NÃO em "Será oferecida", em todas as abas, com quem marcou e quando (pelo registro da auditoria; "sem registro na auditoria" quando não há).
- O selo **"Aguardando Justificativa"** aparece em todas enquanto estiverem marcadas NÃO. Ele **não confirma** que uma justificativa foi enviada, recebida ou aprovada: a justificativa vai à Comissão de Graduação fora do painel.

### Preenchimento por aba {#ajuda-auditoria-preenchimento}

- Um cartão por aba da planilha (PSA, PSC, PSE, PST, Interdepartamentais e Outras Unidades) mostra quantas disciplinas já têm **Será oferecida**, **Docente** e **Dia e horário** preenchidos.
- Cada contagem é **por campo**: ela não diz que a disciplina está "completa" nem pronta, e não há uma porcentagem de disciplinas prontas.
- Clique num cartão para ver a tabela da aba: cada disciplina com o que já foi informado e a última edição feita por uma secretaria.

### Histórico de uma disciplina {#ajuda-auditoria-historico}

"Histórico", na tabela, ou o código de uma disciplina na lista de edições abre uma janela com as edições daquela disciplina, da mais recente para a mais antiga — entre as edições carregadas no painel (veja o limite abaixo).

### "Quem mais abre" e "Quem mais edita" {#ajuda-auditoria-graficos}

- Os gráficos mostram a **atividade registrada**: quantas vezes cada pessoa abriu a planilha das secretarias e quantas edições fez, com a data da última; as 10 primeiras aparecem. "ver edições" filtra a lista de edições por aquela pessoa.
- Aberturas só são registradas no navegador; o aplicativo do celular não registra aberturas. E-mails só aparecem para contas USP; os demais aparecem como não identificados.
- Não são medida de produtividade nem prova de ausência de trabalho: uma pessoa pode preencher pelos colegas, combinar por outro meio ou abrir o arquivo de um jeito que não é registrado.

### Nome de quem aparece {#ajuda-auditoria-pessoas}

- Em toda a auditoria (última edição, "Marcada por", gráficos, filtro de pessoa e lista de edições), cada pessoa aparece com o **nome** em destaque e, embaixo, o **setor** (servidores), "Docente" ou "Aluno(a)", junto com o **e-mail**.
- O nome vem dos cadastros do Serviço de Graduação, nesta ordem: servidores, docentes e alunos.
- **"Pessoa não cadastrada com acesso"**, com o selo **"Atenção"**: o e-mail não está em nenhum dos três cadastros. Confira quem é e se essa pessoa deveria ter acesso à planilha das secretarias.
- **"nome não verificado"**: um dos cadastros não pôde ser consultado naquele momento (o painel avisa no topo). Clique em "Atualizar" mais tarde; se continuar, avise o Serviço de Graduação.
- Um cadastro novo ou corrigido pode levar até 10 minutos para aparecer aqui.

### Edições: busca, filtros e limites {#ajuda-auditoria-edicoes}

- A lista vai da edição mais recente para a mais antiga, 50 por vez ("Mostrar mais"). Há busca (código, disciplina, docente, campo, nome, e-mail…) e filtros por aba, pessoa e origem.
- **Origem**: "Secretaria" são edições feitas na planilha; "Sistema" são eventos do próprio sistema, como o envio da grade e o encerramento de um semestre.
- No máximo as **5.000 edições mais recentes** são carregadas; quando há mais, a contagem avisa ("as 5.000 mais recentes de …"). A lista e o histórico mostram o que foi carregado, não necessariamente tudo desde o início.
- Colagens geram uma linha por célula, sem o valor anterior; colagens muito grandes viram uma linha-resumo. Mudanças feitas pela própria planilha (como apagar dia e início por conflito) e mudanças só de formatação não aparecem.

### Grades anteriores {#ajuda-auditoria-anteriores}

Ao escolher uma grade anterior, o painel mostra a mensagem "Grade encerrada", as edições e os gráficos daquele semestre. O preenchimento final não é reconstruído no painel: a situação final daquela grade está na cópia de segurança feita no envio da grade seguinte.

### Limites do registro {#ajuda-auditoria-limites}

A auditoria registra muito, mas não é garantia absoluta. Uma edição ou abertura feita enquanto o sistema está ocupado por mais de cerca de 45 segundos (durante um envio muito demorado, por exemplo) pode ficar sem registro; nenhuma outra linha é apagada por isso. Enquanto o registro não estiver ativado, edições e aberturas não são registradas — a ativação é uma tarefa da manutenção do sistema.

## Pendências e gravações  _(Administrador)_ {#ajuda-pendencias}

### "Gravado" não é o mesmo que "já aparece no painel" {#ajuda-pendencias-gravado}

Uma gravação pode estar **concluída na base** enquanto a tela ainda mostra os dados de antes — por exemplo, quando o painel não conseguiu ler os dados atualizados depois de gravar. Uma falha nessa leitura final **não desfaz** a gravação: recarregue a página e confira. O aviso fixo diz em que situação você está.

### "Salvamento pendente — código" {#ajuda-pendencias-salvamento}

- O salvamento de uma disciplina não terminou (por exemplo, a planilha não respondeu). A mensagem diz o que já foi gravado.
- Clique em **"Concluir salvamento pendente"**. O botão fica no alto do painel, fora da ficha: feche a ficha para alcançá-lo. O sistema também conclui sozinho antes da próxima gravação da preparação, da próxima importação, ao conferir o envio ou quando um administrador abre o painel.
- Enquanto ele estiver pendente, outras gravações esperam (são recusadas com a mesma mensagem).
- **"Descartar salvamento pendente"** só aparece quando a base mudou depois do pedido e ele não pode mais ser aplicado. Descartar encerra a pendência: o que ainda faltava gravar não é aplicado, e o que já tinha sido gravado não é desfeito. Confira a disciplina depois.

### "Salvamento não confirmado" e "Salvamento concluído" {#ajuda-pendencias-incerto}

- **Não confirmado**: o sistema não conseguiu conferir se o salvamento terminou. O que você digitou continua na ficha enquanto ela estiver aberta. Guarde esse texto (veja "Recarregar sem perder o que foi digitado"), recarregue a página, abra a disciplina e confira; só salve de novo o que faltar.
- **Concluído — "Recarregue a página"**: a gravação terminou, mas o painel não conseguiu ler os dados atualizados. Recarregue quando puder.

### "Ação em lote pendente" {#ajuda-pendencias-lote}

- Excluir, restaurar, enviar para a grade ou remover da grade (várias disciplinas, ou uma pela ficha) não terminou. A mensagem diz quantas já estão gravadas e quantas faltam; as disciplinas continuam selecionadas.
- Clique em **"Concluir ação pendente"**. O sistema também conclui sozinho antes da próxima gravação, importação ou recomeço, ao conferir o envio ou quando um administrador abre o painel.
- **"Descartar ação pendente"** só aparece se a base mudou. Descartar encerra a pendência, **não desfaz** o que já foi gravado, e o que faltava não será aplicado. Confira as disciplinas depois.
- **"Ação em lote não confirmada"**: recarregue a página, confira e repita só o que faltar.
- **"Gravação concluída — Recarregue a página"**: a ação terminou, mas a tela ainda mostra os dados de antes.

### Conclusão automática antes de outra ação {#ajuda-pendencias-automatica}

Se havia uma gravação pendente, a sua próxima ação pode concluí-la primeiro — inclusive uma ação que só consulta, como abrir o painel como administrador ou conferir o envio. O aviso dessa ação diz isso ("Antes, foi concluída a ação pendente …"), e as contagens mostradas são só da sua ação. A ação seguinte nunca é desfeita pelo pedido antigo: o antigo é concluído antes, e o que ele gravou continua gravado mesmo que a leitura dos dados atualizados falhe (aí, recarregue e confira).

### Recarregar sem perder o que foi digitado {#ajuda-pendencias-recarregar}

1. Antes de recarregar, copie para um lugar seguro (um bloco de notas, por exemplo) o que ainda não foi salvo — principalmente textos longos, como Observações.
2. Recarregue a página.
3. Abra a disciplina e confira o que já está gravado.
4. Só então digite de novo o que faltar e salve.

Não salve de novo uma ficha que pode estar desatualizada antes de conferir o que já foi gravado: ela enviaria os valores antigos. Esta Central só explica: ela não salva, não descarta, não conclui pendências e não recarrega a página.

## Estados e mensagens {#ajuda-mensagens}

### Consulta ou gravação? Quando repetir {#ajuda-mensagens-leitura-gravacao}

- **Consultas e conferências** — abrir o painel, abrir a Auditoria da grade, gerar a prévia de uma importação ou da lista por unidade, conferir o envio: elas **não confirmam uma nova importação nem enviam uma nova grade às secretarias**. Se a conexão falhar numa delas, "Tentar de novo" (ou repetir a conferência) é adequado.
- **Mas algumas podem concluir antes um pedido anterior.** Se havia um salvamento ou uma ação em lote **pendente**, o sistema pode concluí-lo antes de responder: ao abrir o painel como administrador e ao conferir o envio (e, sempre, antes de uma nova gravação). Ao abrir o painel como administrador ou gerar a prévia de uma importação, ele também pode terminar a organização das abas de uma importação interrompida. Essa conclusão grava o que faltava do pedido antigo, **não o desfaz** e continua gravada mesmo que a leitura seguinte falhe. Leia o aviso que aparece.
- Abrir o painel como leitor e consultar a Auditoria da grade só consultam.
- **Repetir uma consulta não confirma uma gravação anterior.** Um painel que abre normalmente não prova que o salvamento, a importação ou o envio de antes terminou: confira o próprio dado (a disciplina, a importação, a planilha) e os avisos.
- **Gravações e envio** — "Gravar na base", "Salvar", "Adicionar à Grade Horária", ações em lote, "Fazer a cópia e enviar": uma falha de conexão **não quer dizer** que nada foi gravado. A resposta pode ter se perdido depois da gravação. Não repita às cegas: siga o aviso — "Verificar agora" na importação; aviso fixo de pendência na preparação; [conferir a planilha](#ajuda-envio-grade-resultado) no envio.
- Quando a tela não conseguir mostrar os dados atualizados, preserve o rascunho, recarregue e confira ([Recarregar sem perder o que foi digitado](#ajuda-pendencias-recarregar)).

### Importação com resultado não confirmado {#ajuda-mensagens-importacao-incerta}

1. A janela mostra "Não foi possível confirmar se a importação foi gravada".
2. Clique em **"Verificar agora"**. Não importe o arquivo de novo antes disso.
3. Se a verificação disser que foi gravada, a janela mostra "Importação gravada": siga com "Ver a estrutura".
4. Se disser que não foi gravada, a base continua como estava: clique em "Gerar a prévia de novo" e repita a importação.
5. Se a verificação também falhar, a janela continua oferecendo "Verificar agora": tente de novo em instantes.

### Outras mensagens da importação {#ajuda-mensagens-importacao}

- **"A importação não foi gravada… A base continua exatamente como estava"**: uma falha interrompeu a gravação antes de ela valer. "Gravar na base" de novo não duplica nada. Se repetir, encaminhe.
- **"A planilha foi editada durante a gravação"**: nada foi alterado. Gere a prévia de novo e confirme.
- **"Outra importação está sendo gravada agora"** ou **"Outra gravação está em andamento"**: aguarde um pouco e tente de novo.
- **"O painel aberto está desatualizado"**: o sistema foi atualizado com a página aberta. Recarregue a página e importe o arquivo de novo.
- **"A base foi atualizada por outras importações enquanto era lida"**: nada foi alterado; tente de novo em instantes.

### Avisos no cartão do topo {#ajuda-mensagens-topo}

- **"A planilha ainda não mostra a versão em uso"**: a importação foi gravada e o painel já mostra os dados novos, mas a organização das abas da planilha não terminou. Consulte pelo painel, não pelas abas. A correção é tentada sozinha quando um administrador abre o painel ou faz a próxima importação; se o aviso continuar, encaminhe.
- **"Uma gravação foi interrompida antes de terminar"**: o painel mostra a última importação concluída; a limpeza é automática.
- **"Há ajustes de organização da planilha pendentes"**: os dados já estão corretos; a arrumação será tentada de novo.

### Erro, aviso e "Para saber" {#ajuda-mensagens-avisos}

Na conferência de um arquivo, **erros** impedem seguir, **avisos** pedem atenção sem impedir e **"Para saber"** só informa. As mensagens do painel foram escritas para orientar; se uma delas citar algo técnico que você não entende, encaminhe-a como apareceu.

## Recomeçar do zero: "Cadastrar nova grade"  _(Administrador)_ {#ajuda-nova-grade}

### O que é apagado {#ajuda-nova-grade-apaga}

"Cadastrar nova grade" (no topo do painel) **apaga a planilha-base da estrutura curricular** e a recria vazia. Saem: a estrutura importada do Júpiter (CSV e PDF), o histórico de importações e de alterações, as correções e observações feitas no painel, as disciplinas para outros cursos e a grade em preparação — todas as abas da planilha-base, inclusive abas criadas à mão.

**Não é feita cópia de segurança.** Não há como desfazer pelo painel. Para confirmar, digite APAGAR e clique em "Apagar tudo e cadastrar nova grade". Depois, comece importando de novo o CSV da "Grade Curricular".

A planilha das secretarias, as cópias de segurança das grades e as auditorias não são apagadas por esta ação.

### Não é preciso recomeçar para trocar de semestre {#ajuda-nova-grade-quando}

- **Estrutura nova no Júpiter**: importe o arquivo novo. Os ajustes e as observações continuam.
- **Grade de um semestre novo**: na etapa 4, escolha o semestre e o ano e envie.
- **Corrigir um envio**: ajuste a grade e reenvie (veja os cuidados em [Reenviar](#ajuda-envio-grade-reenvio)).
- **Consultar grades anteriores**: "Auditoria da grade" › Grade.

"Cadastrar nova grade" é para quando a base precisa realmente começar vazia. Se o recomeço for interrompido, o próximo administrador que abrir o painel termina o processo; até lá, quem tem perfil Leitor vê que a base está sendo recomeçada.

### "Carregar grade antiga" {#ajuda-nova-grade-antiga}

O botão aparece desativado e não faz nada nesta versão. Para ver grades anteriores, use a Auditoria da grade; a situação final de cada grade enviada está na sua cópia de segurança.

## Problemas comuns {#ajuda-problemas}

Cada cartão segue a ordem: sintoma → possíveis causas → o que fazer → quando encaminhar. As causas são hipóteses comuns, não um diagnóstico: confira a mensagem que apareceu na tela.

### Apareceu um aviso e não sei por onde começar {#ajuda-problema-aviso}

- Aviso fixo no alto das etapas ("Salvamento pendente", "Ação em lote pendente", "Recarregue a página"): veja [Pendências e gravações](#ajuda-pendencias).
- Mensagem dentro da janela de importação: veja [Estados e mensagens](#ajuda-mensagens).
- Mensagem no envio da grade: veja [Resultados do envio](#ajuda-envio-grade-resultado).
- Mensagem ao abrir o painel: veja [Conta e permissões](#ajuda-acesso).

### Não consigo abrir o painel {#ajuda-problema-acesso}

- **Possíveis causas:** Outra conta Google ativa no navegador; sessão expirada; conta ainda não liberada; perfil de consulta quando você esperava alterar.
- **O que fazer:** Entre só com a conta USP (ou use uma janela anônima) e recarregue. Se a mensagem disser que a conta não tem acesso, peça acesso ao Serviço de Graduação, dizendo se precisa só consultar ou também alterar.
- **Quando encaminhar:** Se, com a conta USP certa e acesso liberado, a mensagem continuar.

### "A base ainda não foi preparada" ou mensagem de configuração {#ajuda-problema-base}

- **Possíveis causas:** A base nunca foi aberta por um administrador; a base está sendo recomeçada; a configuração do sistema está incompleta ou um arquivo de trabalho ficou inacessível para o sistema.
- **O que fazer:** "Ainda não foi preparada": peça a um administrador que abra o painel uma vez. "Está sendo recomeçada": tente de novo em alguns minutos. Mensagens sobre configuração não dependem de você.
- **Quando encaminhar:** Mensagens sobre configuração, autorização ou acesso do sistema a arquivos: encaminhe ao Serviço de Graduação para a manutenção do sistema, com a mensagem como apareceu.

### O arquivo foi recusado na conferência {#ajuda-problema-arquivo}

- **Possíveis causas:** Outro relatório do Júpiter; arquivo editado ou salvo no Excel (currículo em notação científica, zeros perdidos); arquivo de outro curso; estrutura mais antiga que a da base.
- **O que fazer:** Gere de novo o relatório "Grade Curricular" com as opções de [Gerar o relatório](#ajuda-antes-gerar) e importe o arquivo original, sem abrir no Excel. Confira se é o currículo vigente do curso certo.
- **Quando encaminhar:** Se um arquivo recém-gerado, com as opções certas, continuar sendo recusado.

### A leitura do PDF não começa, demora ou falha {#ajuda-problema-pdf}

- **Possíveis causas:** PDF sem camada de texto (OCR demora alguns minutos); conexão instável; rede que bloqueia os componentes de leitura; navegador antigo; números que as contas do relatório não confirmaram.
- **O que fazer:** Acompanhe a barra de progresso; tente de novo; use um navegador Chrome ou Edge atualizado. Se a mensagem for "A leitura por OCR não confirmou todos os números", importe o CSV primeiro e depois o PDF. O CSV não depende dos componentes do PDF.
- **Quando encaminhar:** Se o problema se repetir em qualquer rede e navegador atualizado.

### Não consigo marcar "Conferi no PDF" ou a revisão expirou {#ajuda-problema-revisao}

- **Possíveis causas:** Nem todas as páginas da lista de valores foram abertas; a prévia ficou aberta por muitas horas ou foi gerada por outra pessoa.
- **O que fazer:** Use "Próxima ›" até a última página da lista; se a mensagem falar em lista indisponível, gere a prévia de novo. Nada foi gravado. Veja [Revisão dos valores só do PDF](#ajuda-conferencia-pdf-revisao).
- **Quando encaminhar:** Se, com todas as páginas abertas, a gravação continuar recusada.

### "A prévia não vale mais" {#ajuda-problema-previa}

- **Possíveis causas:** Outra importação foi concluída depois da prévia, ou alguém editou na planilha uma célula mantida pelo sistema (a mensagem diz a aba).
- **O que fazer:** Clique em "Gerar a prévia de novo", confira e grave. A nova prévia mostra o que a importação vai fazer sobre a edição feita à mão.
- **Quando encaminhar:** Se a mensagem se repetir sem que ninguém esteja editando a planilha.

### Importação "não gravada" × "não confirmada" {#ajuda-problema-gravacao-importacao}

- **Possíveis causas:** "Não gravada": a gravação foi recusada ou interrompida antes de valer. "Não confirmada": a resposta se perdeu e o resultado é desconhecido.
- **O que fazer:** "Não gravada": siga a mensagem — em geral, gravar de novo ou gerar a prévia de novo. "Não confirmada": clique em "Verificar agora" antes de qualquer outra coisa.
- **Quando encaminhar:** Se a gravação falhar seguidas vezes.

### Importação gravada, mas a planilha "ainda mostra a versão anterior" {#ajuda-problema-organizacao}

- **Possíveis causas:** A importação foi concluída, mas a arrumação das abas da planilha-base (nomes, ordem, abas ocultas) não terminou.
- **O que fazer:** Consulte pelo painel, que já mostra os dados novos. A correção é tentada sozinha quando um administrador abre o painel ou faz a próxima importação. Recarregue em alguns instantes.
- **Quando encaminhar:** Se o aviso continuar depois de recarregar o painel algumas vezes.

### Uma disciplina "sumiu" da lista {#ajuda-problema-sumiu}

- **Possíveis causas:** Busca ou filtro ativo; disciplina excluída no painel; disciplina que saiu da estrutura na última importação; código corrigido no painel.
- **O que fazer:** Siga [Não achei a disciplina](#ajuda-consultar-nao-achei).
- **Quando encaminhar:** Se ela deveria estar na estrutura atual e o Júpiter confirma isso, depois de uma importação recente.

### Requisitos sem "ou", EXT "não informado" ou currículos sem informações {#ajuda-problema-pdf-faltando}

- **Possíveis causas:** Só o CSV foi importado: ele não traz a relação entre requisitos, a extensão nem as informações básicas dos currículos. Um campo também pode não ter sido gravado por não fechar nas contas do relatório.
- **O que fazer:** Importe o PDF do mesmo relatório como complemento. Campos que não fecharam ficam com o valor anterior.
- **Quando encaminhar:** Se o PDF já foi importado e o dado continua ausente, para conferência no Júpiter.

### "Oferta a revisar" {#ajuda-problema-oferta}

- **Possíveis causas:** A oferta foi ajustada no painel e uma estrutura nova trocou o currículo de forma que a associação automática não foi segura.
- **O que fazer:** Siga [Como resolver](#ajuda-oferta-revisar-resolver) (administrador).
- **Quando encaminhar:** Se não estiver claro qual oferta vale para o currículo em uso: confirme no Júpiter ou com o Serviço de Graduação.

### Lista da unidade: linhas ignoradas ou "Nada a incluir" {#ajuda-problema-unidade}

- **Possíveis causas:** Créditos negativos, fracionários ou com texto; aspas malformadas ou abertas; colunas a mais; todas as disciplinas do arquivo já estão em uso.
- **O que fazer:** Leia o motivo de cada linha em "Linhas ignoradas", corrija o arquivo e escolha-o de novo, se for o caso. "Nada a incluir" sem linhas ignoradas quer dizer que não há disciplina nova.
- **Quando encaminhar:** Se o arquivo vem assim do Júpiter e a disciplina precisa entrar: use "Cadastrar disciplina" ou procure o Serviço de Graduação.

### "O código … já é usado por outra disciplina" ou "Já existe uma disciplina para outros cursos…" {#ajuda-problema-codigo}

- **Possíveis causas:** O código está em uso por outra disciplina — da estrutura, para outros cursos ou excluída.
- **O que fazer:** Procure o código com o filtro Situação em "Todas" e em "Excluídas no painel", e nas etapas 2 e 3. Corrija a disciplina certa em vez de criar outra. Nada foi salvo.
- **Quando encaminhar:** Se não encontrar a disciplina que usa o código.

### A disciplina não entrou na grade ou não aparece na prévia {#ajuda-problema-semestre}

- **Possíveis causas:** Falta o semestre de oferecimento; a disciplina é oferecida só no outro semestre; ela foi excluída (o que a tira da grade); ela ainda não foi enviada com "Enviar para a Grade Horária".
- **O que fazer:** Veja [Semestre de oferecimento](#ajuda-lista-grade-semestre) e o resumo da etapa 4, que diz quantas adicionadas são só do outro semestre.
- **Quando encaminhar:** Raramente necessário.

### Gravação pendente, incerta ou concluída sem atualizar a tela {#ajuda-problema-pendencia}

- **Possíveis causas:** A planilha não respondeu no meio da gravação; a resposta se perdeu; a gravação terminou, mas a leitura dos dados novos falhou.
- **O que fazer:** Siga o aviso fixo: "Concluir…", ou recarregar e conferir. Veja [Pendências e gravações](#ajuda-pendencias). Não salve de novo uma ficha antiga antes de conferir.
- **Quando encaminhar:** Se "Concluir" for recusado várias vezes ou o aviso não sair depois de recarregar.

### Envio sem disciplinas, com semestre errado ou com a lista alterada {#ajuda-problema-envio-conteudo}

- **Possíveis causas:** Nenhuma disciplina adicionada à grade para o semestre escolhido; semestre ou ano trocados; a grade mudou depois da conferência.
- **O que fazer:** Feche a janela, confira o semestre e o ano no topo da etapa 4 e a prévia; adicione disciplinas na etapa 3, se faltar. Se aparecer "Conferir de novo", confira a lista atualizada antes de enviar.
- **Quando encaminhar:** Se a lista conferida não corresponder ao que está na prévia depois de recarregar a página.

### "A grade não foi enviada" por nome, formato ou acesso {#ajuda-problema-envio-recusado}

- **Possíveis causas:** O nome atual do arquivo das secretarias não diz de que semestre ele é; uma das seis abas foi renomeada ou o cabeçalho mudou; o sistema não tem a autorização ou o acesso necessários a um arquivo ou pasta.
- **O que fazer:** A mensagem diz o que falta e que nada foi alterado. Nome sem semestre: renomeie o arquivo para o formato "Grade Horária - 1º semestre de AAAA" (o semestre que ele contém hoje) e envie de novo. Aba ou cabeçalho: desfaça a mudança na planilha e envie de novo.
- **Quando encaminhar:** Mensagens sobre autorização, acesso do sistema a arquivos ou configuração: encaminhe ao Serviço de Graduação para a manutenção do sistema.

### Envio com resultado desconhecido ou interrompido {#ajuda-problema-envio-incerto}

- **Possíveis causas:** A conexão caiu sem resposta (o envio pode ter acontecido); uma falha interrompeu a gravação depois da cópia de segurança.
- **O que fazer:** Não repita às cegas. Siga [Envio sem resposta: como conferir](#ajuda-envio-grade-resultado): compare o conteúdo das seis abas com a lista conferida para esta tentativa (nomes com observações, tipo, semestre ideal, créditos-aula, o que entrou e o que saiu). Num reenvio do mesmo semestre, nome do arquivo, códigos e quantidades iguais não bastam; e dados iguais aos da lista mostram que os dados estão lá, não que todas as etapas do envio terminaram. O evento "Envio da grade" na Auditoria da grade ajuda; a falta dele não prova que nada ocorreu.
- **Quando encaminhar:** Se não for possível confirmar a tentativa atual — antes de decidir reenviar —, ou se o envio parar no meio mais de uma vez.

### Dia e início apagados ou horário de fim inesperado {#ajuda-problema-horario}

- **Possíveis causas:** Conflito de uma eletiva ou livre com uma obrigatória do mesmo semestre ideal (a nota na célula do dia explica); créditos-aula da linha diferentes do esperado; fórmula do fim substituída à mão.
- **O que fazer:** Leia a nota e escolha outro dia ou horário. Para o fim, confira o início e os créditos-aula. Veja [Preenchimento pelas secretarias](#ajuda-secretarias).
- **Quando encaminhar:** Se a coluna do horário de fim mostrar erro ou se os créditos-aula da linha estiverem errados.

### Auditoria indisponível, sem edições, registro inativo ou justificativa {#ajuda-problema-auditoria}

- **Possíveis causas:** Falha de leitura ou de conexão; grade recém-enviada, ainda sem edições; registro de edições ou aberturas não ativado; justificativa enviada por fora (o painel não a registra).
- **O que fazer:** "Não foi possível abrir a auditoria": use "Tentar de novo" (é só leitura). Sem edições: confira a grade escolhida e use "Atualizar". O aviso de registro inativo depois de um envio **não quer dizer** que a grade não foi enviada, e não é preciso reenviar. Sobre justificativas, procure a Comissão de Graduação.
- **Quando encaminhar:** Registro inativo, ou auditoria que não abre depois de algumas tentativas: encaminhe ao Serviço de Graduação para a manutenção do sistema.

### Como encaminhar um problema {#ajuda-problema-encaminhar}

Procure o Serviço de Graduação e informe:

- o que você estava fazendo (a ação e a tela);
- quando aconteceu (data e hora aproximadas);
- a versão mostrada no fim da página ("Estrutura Curricular · versão …");
- a mensagem que apareceu, copiada como está.

Não envie senhas, códigos de acesso, endereços ou identificadores de arquivos, nem exportações de dados reais. Se for mandar uma captura de tela, confira antes se ela não mostra dados pessoais.

## Perguntas frequentes {#ajuda-faq}

Clique numa pergunta para ver a resposta. A primeira frase responde; o link leva ao guia completo.

### Consulta e importação {#ajuda-problema-encaminhar}

**Qual é a diferença entre estrutura curricular e grade horária?** {#ajuda-faq-estrutura-grade}  
**A estrutura curricular é o conjunto de disciplinas do curso, com créditos, períodos e requisitos, como está no Júpiter; a grade horária é a lista do semestre, com docentes, dias, horários e salas preenchidos pelas secretarias.** O painel guarda a estrutura e, a partir dela, prepara a lista da grade que vai para a planilha das secretarias.

Veja: [Comece aqui](#ajuda-comece)

**Quem pode consultar e quem pode alterar?** {#ajuda-faq-quem-pode}  
**Administradores e leitores consultam a estrutura e a auditoria; só administradores importam, corrigem, incluem, excluem, enviam a grade e recomeçam a base.** O perfil é definido pelo Serviço de Graduação, e cada ação é conferida de novo pelo sistema.

Veja: [Administrador e Leitor](#ajuda-comece-perfis)

**Por que não vejo "Importar arquivo" ou as etapas?** {#ajuda-faq-nao-vejo-importar}  
**Porque a sua conta tem perfil Leitor, que só consulta.** Se o seu trabalho exige importar ou preparar a grade, peça a mudança de perfil ao Serviço de Graduação.

Veja: [Conta e permissões](#ajuda-acesso-botoes)

**Por que os filtros precisam valer na mesma habilitação?** {#ajuda-faq-filtros-habilitacao}  
**Para que "Bacharelado + Obrigatória" mostre o que é obrigatório no Bacharelado, e não uma disciplina obrigatória em outra habilitação.** Habilitação, Obrigatoriedade, Período ideal e "Com requisito" são atendidos juntos por uma mesma habilitação.

Veja: [Consultar e filtrar](#ajuda-consultar-mesma-habilitacao)

**CSV ou PDF? Preciso dos dois? Posso importar só o PDF?** {#ajuda-faq-csv-pdf}  
**Comece pelo CSV, que é exato e basta para consultar e preparar a grade; o PDF é um complemento opcional.** O PDF acrescenta versão, extensão (EXT), requisitos "ou" e informações dos currículos. Importar só o PDF é possível: por OCR, numa estrutura completa, todos os números precisam estar coerentes com as contas do relatório, e os nomes longos ficam cortados até o CSV ser importado.

Veja: [CSV ou PDF?](#ajuda-antes-csv-pdf)

**Posso selecionar CSV e PDF juntos?** {#ajuda-faq-juntos}  
**Sim: escolha ou arraste os dois; o CSV é conferido e gravado primeiro e o PDF vem depois, com "Continuar com o PDF".** Só vale um CSV e um PDF; dois do mesmo tipo ou mais de dois arquivos são recusados.

Veja: [CSV e PDF de uma vez](#ajuda-importar-dois)

**Se o PDF falhar depois do CSV, o CSV se perde?** {#ajuda-faq-pdf-falhou}  
**Não: o CSV já gravado continua gravado.** O erro do PDF aparece e o PDF pode ser importado outra hora.

Veja: [CSV e PDF de uma vez](#ajuda-importar-dois)

**Por que há nomes cortados ou EXT "não informado"?** {#ajuda-faq-nomes-ext}  
**Nomes cortados vêm do PDF, que corta nomes longos; EXT "não informado" quer dizer que o PDF ainda não foi importado.** O nome completo vem do CSV, e o nome do PDF nunca substitui um nome já gravado. A extensão só vem no PDF.

Veja: [CSV ou PDF?](#ajuda-antes-csv-pdf)

**Por que os requisitos não mostram "ou"?** {#ajuda-faq-requisitos-ou}  
**Porque só o CSV foi importado, e o CSV não diz se os requisitos valem juntos ou se basta um.** Importe o PDF do mesmo relatório para ver "Basta um destes".

Veja: [Ficha e requisitos](#ajuda-ficha-requisitos)

**A coerência do OCR garante a leitura?** {#ajuda-faq-coerencia}  
**Não: ela mostra que os números batem com as contas do relatório, mas dois erros podem se compensar.** Por isso números sem coerência não são gravados e os valores que só o PDF traz passam pela sua revisão.

Veja: [O que a coerência prova](#ajuda-conferencia-pdf-coerencia)

**O arquivo e os dados são enviados para onde?** {#ajuda-faq-dados-para-onde}  
**O arquivo é lido no seu navegador; os dados extraídos vão ao sistema para validação e prévia, e a base só muda quando você clica em "Gravar na base".** Para ler PDF, o navegador baixa componentes públicos de leitura.

Veja: [Para onde vão o arquivo e os dados](#ajuda-antes-privacidade)

**O que acontece com observações e ajustes ao reimportar?** {#ajuda-faq-reimportar}  
**Continuam: observações, colunas extras e ajustes feitos no painel não são apagados pela importação.** Os ajustes continuam valendo por cima do que vier do Júpiter; use "Voltar aos dados do Júpiter" quando o Júpiter passar a ter o valor certo.

Veja: [O que é preservado](#ajuda-importar-reimportar)

**Como vejo as mudanças de uma importação?** {#ajuda-faq-ver-mudancas}  
**Na aba Importações, no cartão da importação, clique em "Ver mudanças registradas".** A lista traz a disciplina, o tipo de mudança e, quando houver, o valor de antes e o de depois.

Veja: [Importações anteriores](#ajuda-historico-importacoes-mudancas)

**Importei o arquivo errado. Existe desfazer?** {#ajuda-faq-desfazer}  
**Não há botão de desfazer: importe o arquivo certo.** A prévia mostra o que vai mudar, e cada mudança fica registrada, com o valor de antes e o de depois.

Veja: [Importações anteriores](#ajuda-historico-importacoes-mudancas)

**Onde vejo quem preencheu o quê na grade?** {#ajuda-faq-quem-preencheu}  
**No painel, na seção "Auditoria da grade": edições, histórico de cada disciplina e quem mais edita.** Não há link para a planilha de auditoria: a consulta é feita pelo painel.

Veja: [Auditoria da grade](#ajuda-auditoria)

### Ajustes e preparação {#ajuda-faq-quem-preencheu}

**Alterar no painel muda o Júpiter?** {#ajuda-faq-muda-jupiter}  
**Não: a correção fica guardada à parte, só neste sistema.** O Júpiter continua sendo a fonte oficial; o ideal é corrigir também lá.

Veja: [Corrigir e salvar](#ajuda-ajustes-salvar)

**"Voltar aos dados do Júpiter" já salva?** {#ajuda-faq-voltar-jupiter-salva}  
**Não: o botão só coloca os valores do Júpiter no formulário; é preciso clicar em "Salvar".** Ao salvar, o ajuste é removido e a disciplina volta a acompanhar as importações.

Veja: [Voltar aos dados do Júpiter](#ajuda-ajustes-jupiter)

**Por que a oferta ficou "a revisar"?** {#ajuda-faq-oferta-revisar}  
**Porque a oferta tinha sido ajustada e uma estrutura nova trocou o currículo de um jeito que não deu para associar com segurança.** Os vínculos continuam guardados, mas não contam para filtros, semestre e grade até serem revisados.

Veja: [Oferta a revisar](#ajuda-oferta-revisar)

**Salvar observações descarta os vínculos a revisar?** {#ajuda-faq-observacoes-vinculos}  
**Não: só a caixa "Descartar os vínculos a revisar ao salvar", com confirmação, descarta.** Salvar nome, observações ou semestre mantém os vínculos guardados.

Veja: [Como resolver](#ajuda-oferta-revisar-resolver)

**Excluir apaga? Restaurar recoloca na grade?** {#ajuda-faq-excluir}  
**Excluir não apaga: a disciplina fica guardada e pode ser restaurada; mas ela sai da grade e restaurar não a recoloca.** Depois de restaurar, confira na etapa 3 e envie para a grade de novo, se for o caso.

Veja: [Excluir e restaurar](#ajuda-preparar-excluir)

**Posso editar requisitos?** {#ajuda-faq-editar-requisitos}  
**Não nesta versão: os requisitos vêm só do Júpiter.** Para mudá-los, corrija no Júpiter e importe de novo.

Veja: [Ficha e requisitos](#ajuda-ficha-requisitos)

**Por que o código antigo reapareceu na lista da unidade?** {#ajuda-faq-codigo-antigo}  
**Porque a lista compara pelos códigos em uso, e o código original deixou de estar em uso quando você o corrigiu.** Desmarque-o antes de incluir; se incluído, vira uma disciplina nova e independente.

Veja: [Códigos já em uso](#ajuda-outros-cursos-codigos)

**"Para outros cursos" e "Outras Unidades" são a mesma coisa?** {#ajuda-faq-outros-outras}  
**Não: "para outros cursos" são disciplinas do IP dadas a outras unidades; "Outras Unidades" são disciplinas de outras unidades dadas aos alunos do IP.** As do IP para outros cursos ficam, na grade, na aba do departamento do código.

Veja: [Os dois sentidos de "outros"](#ajuda-outros-cursos-o-que)

**Marcar a caixa já grava ou envia?** {#ajuda-faq-caixa-grava}  
**Não: marcar é só uma escolha na tela.** Quem grava na grade em preparação é "Enviar para a Grade Horária".

Veja: [Três ações diferentes](#ajuda-lista-grade-tres)

**Qual a diferença entre os dois botões "Enviar"?** {#ajuda-faq-dois-enviar}  
**"Enviar para a Grade Horária" (etapa 3) põe disciplinas na grade em preparação; "Enviar Grade para Preenchimento" (etapa 4) grava a grade na planilha das secretarias.** O segundo apaga e regrava as seis abas da planilha, depois de uma cópia de segurança.

Veja: [Três ações diferentes](#ajuda-lista-grade-tres)

**Por que a disciplina não entrou na grade?** {#ajuda-faq-nao-entrou}  
**Na maioria das vezes falta o semestre de oferecimento.** Abra a ficha, escolha a "Disciplina de semestre", salve e envie de novo.

Veja: [Semestre de oferecimento](#ajuda-lista-grade-semestre)

**Período ideal e semestre de oferecimento são a mesma coisa?** {#ajuda-faq-periodo-semestre}  
**Não: período ideal é o semestre do curso (1º a 10º); semestre de oferecimento é o semestre do ano (1º, 2º ou os dois).** Pelo período: ímpar = 1º semestre do ano; par = 2º.

Veja: [Glossário](#ajuda-glossario-semestre)

**Uma disciplina pode ser oferecida nos dois semestres?** {#ajuda-faq-dois-semestres}  
**Sim: na ficha, "Disciplina de semestre" › "1º e 2º" › Salvar.** Também acontece sozinho quando o período ideal é ímpar numa habilitação e par em outra.

Veja: [Preparar a grade](#ajuda-tarefas-preparar)

### Envio, secretarias e auditoria {#ajuda-faq-dois-semestres}

**Por que vai uma linha só se a disciplina está em várias habilitações?** {#ajuda-faq-uma-linha}  
**Porque o aluno cursa a disciplina uma vez só: as habilitações são simultâneas.** Tipo e semestre ideal seguem a prioridade Psicólogo, Bacharelado, Licenciatura.

Veja: [O que é gravado em cada linha](#ajuda-envio-grade-linhas)

**Qual tipo e período são usados quando as habilitações divergem?** {#ajuda-faq-tipo-divergente}  
**Os do Psicólogo; se a disciplina não está no Psicólogo, os do Bacharelado; depois os da Licenciatura.** Uma oferta ajustada no painel vale.

Veja: [O que é gravado em cada linha](#ajuda-envio-grade-linhas)

**O que o envio apaga e o que preserva?** {#ajuda-faq-apaga-preserva}  
**Apaga o conteúdo das colunas B a S, linhas 4 a 999, das seis abas — inclusive o preenchimento e linhas extras; preserva formatação, listas, colunas das práticas e as demais abas.** Antes de apagar, faz e registra uma cópia de segurança do arquivo inteiro.

Veja: [O que o envio apaga e preserva](#ajuda-envio-grade-efeitos)

**Reenviar faz outra cópia?** {#ajuda-faq-reenviar-copia}  
**Sim: cada envio faz uma nova cópia de segurança e regrava as abas.** Um reenvio apaga o que as secretarias já preencheram: combine o envio definitivo antes do preenchimento. Se um envio ficar sem resposta, não reenvie antes de comparar o conteúdo das abas com a lista conferida: no mesmo semestre, o nome do arquivo e os códigos não mostram se a tentativa nova terminou.

Veja: [Reenviar o mesmo semestre](#ajuda-envio-grade-reenvio)

**A cópia de segurança pertence a qual semestre?** {#ajuda-faq-copia-semestre}  
**Ao semestre que estava no nome do arquivo antes do envio; a auditoria pertence ao semestre de destino.** O resultado do envio traz o link da cópia.

Veja: [A cópia e a auditoria](#ajuda-envio-grade-copia)

**Preciso conferir de novo depois de mudar observações ou créditos?** {#ajuda-faq-conferir-novamente}  
**Sim, se a mudança vai para a planilha (observações, nome, créditos-aula, tipo, semestre ideal, disciplinas); não, se é só a CH ou algo fora do envio.** O painel pede "Conferir de novo" quando é preciso.

Veja: [A confirmação vale para o que você conferiu](#ajuda-envio-grade-conferir)

**A conexão falhou: posso repetir imediatamente?** {#ajuda-faq-conexao-repetir}  
**Numa consulta ou conferência, sim; numa gravação ou no envio, confira antes, porque a ação pode ter acontecido.** Repetir uma consulta não confirma a gravação anterior, e abrir o painel como administrador ou conferir o envio pode concluir antes um pedido que estava pendente. Na importação, use "Verificar agora"; no envio, compare o conteúdo das seis abas com a lista conferida antes de decidir reenviar.

Veja: [Consulta ou gravação?](#ajuda-mensagens-leitura-gravacao)

**Por que a auditoria não tem link de planilha?** {#ajuda-faq-auditoria-link}  
**Porque a consulta é feita pelo painel, que mostra a informação já organizada, para todos os perfis.** O resultado do envio mostra o nome da auditoria como texto e indica a seção "Auditoria da grade".

Veja: [Abrir e atualizar](#ajuda-auditoria-abrir)

**Por que o horário de fim é automático ou o dia e o início desapareceram?** {#ajuda-faq-horario-fim}  
**O fim é uma fórmula (início + créditos-aula); dia e início somem quando há conflito de uma eletiva ou livre com uma obrigatória do mesmo semestre ideal.** A nota na célula do dia explica o conflito.

Veja: [Dia e início apagados por conflito](#ajuda-secretarias-conflito)

**Toda sobreposição de horário é detectada?** {#ajuda-faq-sobreposicao}  
**Não: a verificação cobre só eletivas e livres contra obrigatórias do mesmo semestre ideal, no momento da edição.** Ela não garante uma grade sem sobreposições.

Veja: [O que a verificação não cobre](#ajuda-secretarias-limites)

**"Preenchimento" significa que a disciplina está pronta?** {#ajuda-faq-preenchimento-pronto}  
**Não: as contagens são por campo (Será oferecida, Docente, Dia e horário).** Elas não dizem que uma disciplina está completa.

Veja: [Preenchimento por aba](#ajuda-auditoria-preenchimento)

**"Aguardando Justificativa" indica que o motivo já foi recebido?** {#ajuda-faq-aguardando}  
**Não: o selo aparece em toda disciplina marcada NÃO e não registra recebimento nem aprovação.** A justificativa vai à Comissão de Graduação fora do painel.

Veja: [Não serão oferecidas](#ajuda-auditoria-justificativas)

**A auditoria atualiza sozinha e registra absolutamente tudo?** {#ajuda-faq-atualiza-tudo}  
**Não: clique em "Atualizar" para ler de novo, e o registro tem limites.** São carregadas no máximo as 5.000 edições mais recentes, e uma edição feita com o sistema ocupado pode ficar sem registro.

Veja: [Limites do registro](#ajuda-auditoria-limites)

**O registro da auditoria deixa a planilha das secretarias lenta?** {#ajuda-faq-lenta}  
**Em geral, não: o registro roda nos servidores do Google depois que a edição é salva, e a planilha não espera por ele.** Se a planilha estiver lenta, a causa pode ser outra, como o tamanho do arquivo, a conexão ou muitas pessoas editando ao mesmo tempo.

Veja: [Limites do registro](#ajuda-auditoria-limites)

**Por que as grades antigas não mostram o preenchimento?** {#ajuda-faq-grades-antigas}  
**Porque o painel não reconstrói o preenchimento final a partir da cópia de segurança.** Ele mostra as edições e os gráficos; a situação final está na cópia feita no envio seguinte.

Veja: [Grades anteriores](#ajuda-auditoria-anteriores)

**Como resolvo uma pendência sem repetir ou desfazer o que já foi salvo?** {#ajuda-faq-pendencia-sem-repetir}  
**Use o botão do aviso fixo ("Concluir…"): ele grava só o que falta.** Descartar não desfaz o que já foi gravado. Não salve de novo uma ficha antiga antes de conferir.

Veja: [Pendências e gravações](#ajuda-pendencias)

**Posso editar a planilha-base à mão?** {#ajuda-faq-editar-planilha}  
**Só a coluna Observações e colunas extras que você criar; o resto é mantido pelo sistema.** Editar uma célula mantida pelo sistema depois de uma prévia obriga a gerar a prévia de novo. As abas ocultas "_anterior_…" guardam a versão anterior de cada aba: não as edite.

Veja: [Prévia que deixou de valer](#ajuda-importar-desatualizada)

**"Cadastrar nova grade" faz backup? É obrigatório a cada semestre?** {#ajuda-faq-nova-grade-backup}  
**Não faz cópia de segurança e não é obrigatório.** Ele apaga a planilha-base inteira; para um semestre novo basta enviar a grade desse semestre.

Veja: [Recomeçar do zero](#ajuda-nova-grade)

**"Carregar grade antiga" está disponível?** {#ajuda-faq-carregar-antiga}  
**Não: o botão está desativado nesta versão.** Para consultar grades anteriores, use a Auditoria da grade.

Veja: [Carregar grade antiga](#ajuda-nova-grade-antiga)

### Uso do painel {#ajuda-faq-carregar-antiga}

**Funciona no celular?** {#ajuda-faq-celular}  
**Sim: a lista vira cartões, os filtros ficam no botão "Filtros" e as janelas ocupam a tela toda.** A Central de Ajuda também se adapta à tela do celular.

Veja: [Usar os filtros](#ajuda-consultar-filtros)

**Como mudo a Aparência (tema claro ou escuro)?** {#ajuda-faq-aparencia}  
**No seletor "Aparência", no topo: Sistema (segue o aparelho), Claro ou Escuro.** A escolha fica salva neste navegador.

Veja: [Limites e suporte](#ajuda-sobre)

**Como sei qual versão do painel está no ar?** {#ajuda-faq-versao}  
**A versão aparece no fim da página ("Estrutura Curricular · versão …") depois que o painel carrega.** Informe a versão ao encaminhar um problema.

Veja: [Como encaminhar um problema](#ajuda-problema-encaminhar)

## Glossário {#ajuda-glossario}

### Créditos e CH {#ajuda-glossario-creditos}

- **Crédito-aula**: 1 hora de aula por semana (15 h no semestre).
- **Crédito-trabalho**: 30 h de atividades no semestre, fora da sala de aula.
- **CH**: carga horária total da disciplina no semestre. Referência: CH = 15 × créditos-aula + 30 × créditos-trabalho. Quando o Júpiter registra outra carga, vale a do Júpiter; o painel só avisa a diferença.

### CE, CP, EXT e ATPA {#ajuda-glossario-cargas}

- **CE**: carga horária de estágio da disciplina.
- **CP**: carga horária de práticas como componente curricular (formação de professores).
- **EXT**: carga horária de atividade extensionista da disciplina. Só o PDF do Júpiter informa.
- **ATPA**: Atividades Teórico-Práticas de Aprofundamento — nome da coluna no PDF do Júpiter. O painel mostra nesse campo o valor da coluna ATPA do PDF e, no CSV, o da coluna chamada "AACC", que ocupa a mesma posição. Para a interpretação acadêmica dessa carga, consulte o Serviço de Graduação.

### Currículo, habilitação, AAC e AEX Apolo {#ajuda-glossario-curriculo}

- **Currículo**: número de 12 dígitos do Júpiter — curso (5) + habilitação (4) + ano/semestre de cadastro (3). Ex.: 47012 0100 262 = Psicologia, Bacharelado, cadastrado em 2026/2.
- **Habilitação**: Psicólogo, Bacharelado ou Licenciatura. O painel usa o currículo em uso de cada uma.
- **AAC**: atividades acadêmicas complementares exigidas pelo currículo (não por uma disciplina). Aparece na aba Currículos.
- **AEX Apolo**: atividades de extensão exigidas pelo currículo e registradas no sistema Apolo. Aparece na aba Currículos.

### Obrigatoriedade, requisito fraco e versão {#ajuda-glossario-tipos}

- **Obrigatória / Optativa eletiva / Optativa livre**: o tipo da disciplina **naquela habilitação**. A mesma disciplina pode ter tipos diferentes em cada habilitação. Na planilha das secretarias aparecem como Obrigatória, Eletiva e Livre.
- **Requisito fraco**: requisito marcado como fraco no Júpiter.
- **Versão**: número da versão da disciplina no Júpiter.

### Período ideal × semestre de oferecimento {#ajuda-glossario-semestre}

- **Período ideal** (ou semestre ideal): o semestre **do curso** (1º a 10º) em que a disciplina deve ser cursada naquela habilitação.
- **Semestre de oferecimento** ("Disciplina de semestre", na ficha): o semestre **do ano** em que a disciplina é oferecida — 1º, 2º ou os dois. Pelo período ideal: ímpar = 1º semestre; par = 2º. "1º e 2º semestres" quando o período é ímpar numa habilitação e par em outra, ou quando a equipe marcou na ficha que ela é oferecida nos dois (ex.: uma prática). Nas disciplinas para outros cursos, é informado na ficha.

### Observação, ajuste, excluída e fora da estrutura {#ajuda-glossario-estados}

- **Observação**: anotação informativa do Serviço de Graduação sobre a disciplina; vai junto com o nome no envio da grade.
- **Ajuste**: correção feita no painel sobre um dado do Júpiter; continua valendo depois das importações.
- **Excluída**: retirada da lista e da grade pelo painel, sem apagar os dados; pode ser restaurada.
- **Fora da estrutura atual**: estava numa importação anterior e não veio na última. Continua na base, com as observações, mas não aparece na lista por padrão.

## Limites e suporte {#ajuda-sobre}

### Sobre este sistema {#ajuda-sobre-sistema}

- Guarda uma cópia organizada do relatório "Grade Curricular" do Júpiter, para consulta e para a grade horária. Não altera o Júpiter e não o substitui como fonte oficial.
- A base reflete a última importação; a data aparece no cartão do topo e na aba Importações.
- Cada base guarda um curso.

### Celular, aparência e versão {#ajuda-sobre-uso}

- **Celular**: a lista vira cartões, os filtros ficam no botão "Filtros" e as janelas ocupam a tela toda.
- **Aparência**: no seletor do topo — Sistema (segue o aparelho), Claro ou Escuro. A escolha fica salva neste navegador. Esta Central segue a mesma aparência.
- **Versão**: aparece no fim da página ("Estrutura Curricular · versão …") depois que o painel carrega.

### A quem recorrer {#ajuda-sobre-suporte}

- Dúvidas de uso, acesso ao painel ou a arquivos e problemas no sistema: procure o Serviço de Graduação, pelos canais que você já usa com ele. Ao relatar um problema, siga [Como encaminhar um problema](#ajuda-problema-encaminhar).
- Justificativas de disciplinas que não serão oferecidas: Comissão de Graduação, fora do painel.
- Configuração, autorização e manutenção técnica do sistema são feitas pela equipe que mantém o sistema, a partir do encaminhamento do Serviço de Graduação.

### Como usar esta Central {#ajuda-sobre-ajuda}

- Os botões com "?" espalhados pelo painel abrem a Central já no assunto daquele ponto.
- A busca procura em todas as seções, inclusive nas respostas das perguntas frequentes.
- "Início" volta à página inicial; Esc ou "Fechar" fecha a Central e devolve você ao ponto em que estava. Fechar a Central não muda nada no que estava aberto atrás dela.
- A Central só explica: ela não salva, não envia e não altera nada.

---

## Gatilhos contextuais implementados

Cada botão "?" abre a Central no destino indicado (`data-gradip-help-open`). Os de `Painel.html` são estáticos; os demais são gerados com o conteúdo da tela (ficha, importação, prévia e resultado do envio, avisos fixos, auditoria) e continuam funcionando depois de cada redesenho. O botão "Ajuda" do cabeçalho abre o início.

| Arquivo | Texto do gatilho | Destino |
|---|---|---|
| `Painel.html` | Ajuda | `(início)` |
| `Painel.html` | Como preparar a grade | `ajuda-preparar` |
| `Painel.html` | O que "Cadastrar nova grade" apaga | `ajuda-nova-grade` |
| `Painel.html` | Como buscar e filtrar | `ajuda-consultar` |
| `Painel.html` | Semestre de oferecimento × período ideal | `ajuda-glossario-semestre` |
| `Painel.html` | Como ler os currículos | `ajuda-curriculos` |
| `Painel.html` | Como ler o histórico de importações | `ajuda-historico-importacoes` |
| `Painel.html` | Como incluir disciplinas para outros cursos | `ajuda-outros-cursos` |
| `Painel.html` | Marcar, enviar para a grade e enviar às secretarias: a diferença | `ajuda-lista-grade` |
| `Painel.html` | Como funciona a prévia | `ajuda-previa-grade` |
| `Painel.html` | O que o envio apaga e preserva | `ajuda-envio-grade-efeitos` |
| `Painel.html` | Como ler a auditoria | `ajuda-auditoria` |
| `Painel.html` | Como as secretarias preenchem | `ajuda-secretarias` |
| `Painel.html` | Como ler a ficha | `ajuda-ficha` |
| `Painel.html` | Como funciona a importação | `ajuda-importar` |
| `Painel.html` | O que é apagado | `ajuda-nova-grade` |
| `Painel.html` | Como funciona o envio | `ajuda-envio-grade` |
| `Painel.html` | Como gerar e importar a lista | `ajuda-outros-cursos-lista` |
| `Painel.html` | Sobre o histórico | `ajuda-auditoria-historico` |
| `PainelApp.html` | Problemas para abrir o painel | `ajuda-acesso` |
| `PainelApp.html` | O que este aviso significa | `ajuda-problema-organizacao` |
| `PainelApp.html` | Por que não entraram | `ajuda-lista-grade-semestre` |
| `PainelApp.html` | Entenda a oferta a revisar | `ajuda-oferta-revisar` |
| `PainelApp.html` | O que isto quer dizer | `ajuda-oferta-revisar-associada` |
| `PainelApp.html` | "Basta um destes" e "e também" | `ajuda-ficha-requisitos` |
| `PainelImportacao.html` | Como gerar o arquivo no Júpiter | `ajuda-antes-gerar` |
| `PainelImportacao.html` | Para onde vão o arquivo e os dados | `ajuda-antes-privacidade` |
| `PainelImportacao.html` | Leitura do PDF: texto ou OCR | `ajuda-antes-pdf` |
| `PainelImportacao.html` | O que esta conferência prova | `ajuda-conferencia-pdf` |
| `PainelImportacao.html` | Os passos da importação | `ajuda-importar-passos` |
| `PainelImportacao.html` | Completo, complemento e diferenças | `ajuda-importar-previa` |
| `PainelImportacao.html` | As cinco partes da conferência | `ajuda-conferencia-pdf-cinco` |
| `PainelImportacao.html` | Como fazer a revisão | `ajuda-conferencia-pdf-revisao` |
| `PainelImportacao.html` | O que fazer agora | `ajuda-importar-resultado` |
| `PainelImportacao.html` | Resultado não confirmado: o que fazer | `ajuda-mensagens-importacao-incerta` |
| `PainelPreparacao.html` | Como corrigir e salvar | `ajuda-ajustes` |
| `PainelPreparacao.html` | Campos do cadastro para outros cursos | `ajuda-outros-cursos-cadastro` |
| `PainelPreparacao.html` | Como funciona | `ajuda-ajustes-jupiter` |
| `PainelPreparacao.html` | O que o envio apaga e preserva | `ajuda-envio-grade-efeitos` |
| `PainelPreparacao.html` | Reenviar o mesmo semestre | `ajuda-envio-grade-reenvio` |
| `PainelPreparacao.html` | Por que conferir de novo | `ajuda-envio-grade-conferir` |
| `PainelPreparacao.html` | O que estes avisos significam | `ajuda-envio-grade-avisos` |
| `PainelPreparacao.html` | Como as secretarias preenchem | `ajuda-secretarias` |
| `PainelPreparacao.html` | A cópia e a auditoria | `ajuda-envio-grade-copia` |
| `PainelPreparacao.html` | O que fazer agora | `ajuda-envio-grade-resultado` |
| `PainelPreparacao.html` | Entenda este aviso | `ajuda-pendencias` |
| `PainelPreparacao.html` | Por que linhas são ignoradas | `ajuda-outros-cursos-ignoradas` |
| `PainelAuditoria.html` | O que fazer | `ajuda-problema-auditoria` |
| `PainelAuditoria.html` | Sobre as grades anteriores | `ajuda-auditoria-anteriores` |
| `PainelAuditoria.html` | Como ler as contagens | `ajuda-auditoria-preenchimento` |
| `PainelAuditoria.html` | O que "Aguardando Justificativa" quer dizer | `ajuda-auditoria-justificativas` |
| `PainelAuditoria.html` | O que os gráficos mostram | `ajuda-auditoria-graficos` |
| `PainelAuditoria.html` | Busca, origem e limite de edições | `ajuda-auditoria-edicoes` |
| `PainelAuditoria.html` | Como os nomes são encontrados (gráficos e aviso de nomes incompletos) | `ajuda-auditoria-pessoas` |

## Revisão editorial (1.9.0)

Pontos do texto-base anterior (1.8.x) que não foram transplantados literalmente:

| Item | Texto anterior | Como ficou |
|---|---|---|
| a | "siga as três etapas" | quatro etapas ([ajuda-preparar](#ajuda-preparar)) |
| b | "Onde vejo quem preencheu o quê?" encaminhava à planilha de auditoria | encaminha à seção "Auditoria da grade" do painel ([FAQ](#ajuda-faq-quem-preencheu)); nenhum link ou ID da auditoria |
| c | passos com editor do Apps Script, nomes de funções e IDs (autorização do Drive, ativação da auditoria, compartilhamento com a conta que implantou) | orientação de encaminhar à manutenção ([problemas](#ajuda-problema-envio-recusado), [auditoria](#ajuda-problema-auditoria)); os passos técnicos continuam no README do código |
| d | "Não foi possível falar com o servidor — tente de novo" para tudo | leitura (repetir é seguro) × gravação/envio (conferir antes) ([ajuda-mensagens-leitura-gravacao](#ajuda-mensagens-leitura-gravacao)) |
| e | "recarregue quando puder (salve antes o que estiver digitando)" | guardar o texto não salvo fora da ficha, recarregar, conferir o gravado e só então completar; nunca salvar de novo uma ficha desatualizada ([ajuda-pendencias-recarregar](#ajuda-pendencias-recarregar)) |
| f | "apaga a planilha inteira" | apaga a **planilha-base** da estrutura; a planilha das secretarias, as cópias e as auditorias não são afetadas ([ajuda-nova-grade](#ajuda-nova-grade)) |
| g | "Carregar grade antiga… vai abrir as grades finalizadas, numa próxima versão" | botão desativado, sem promessa; a microcopy "(em breve)" da tela virou "(indisponível nesta versão)" |
| h | "ATPA … no CSV, a coluna equivalente se chama AACC (A VALIDAR)" | descreve os rótulos (coluna ATPA do PDF; coluna "AACC" do CSV na mesma posição) sem afirmar equivalência institucional ([glossário](#ajuda-glossario-cargas)) |
| i | "Histórico: todas as alterações daquela disciplina" | histórico das edições **carregadas** (no máximo as 5.000 mais recentes) ([ajuda-auditoria-edicoes](#ajuda-auditoria-edicoes)) |
| j | "O registro não deixa a planilha lenta"; "nenhum dado sai do navegador"; "a auditoria registra tudo" | formulações sem garantia absoluta: "em geral, não"; dados extraídos vão ao sistema para a prévia; a auditoria tem limites ([ajuda-auditoria-limites](#ajuda-auditoria-limites)) |

Outros ajustes: "O PDF é enviado para algum lugar? Não" passou a explicar com precisão o caminho dos dados ([ajuda-antes-privacidade](#ajuda-antes-privacidade)); "Microsoft Print to PDF não tem texto" passou a "o que decide é existir camada de texto"; "Descartar ação pendente" e "Descartar salvamento pendente" são explicados separadamente; o envio separa recusado, interrompido e resultado desconhecido.

## Correções de conteúdo da 1.9.1

Três orientações da 1.9.0 não correspondiam ao comportamento aprovado do sistema (as regras de negócio não mudaram):

| Ponto | Texto da 1.9.0 | Como ficou |
|---|---|---|
| A1 — "Adicionar à Grade Horária" com alterações por salvar | "se a gravação falhar, nada é salvo nem adicionado" | o salvamento é retomável: separa recusa antes da gravação (nada aplicado), concluído, **pendente com parte já gravada** (inclusive a inclusão na grade), não confirmado e concluído sem atualizar a tela ([ajuda-lista-grade-ficha](#ajuda-lista-grade-ficha)) |
| A2 — consultas e conferências | "Leituras — abrir o painel, … conferir o envio … Nada muda na base"; "Isso é só uma leitura: repetir não muda nada" | consultas não confirmam importação nem enviam grade, mas abrir o painel como administrador e conferir o envio podem concluir antes um salvamento/ação pendente (e a abertura do administrador e a prévia da importação podem terminar a organização de uma importação interrompida); repetir uma consulta não confirma a gravação anterior ([ajuda-mensagens-leitura-gravacao](#ajuda-mensagens-leitura-gravacao), [ajuda-acesso-mensagens](#ajuda-acesso-mensagens), [ajuda-pendencias-automatica](#ajuda-pendencias-automatica), [ajuda-importar-passos](#ajuda-importar-passos), FAQ [conexão](#ajuda-faq-conexao-repetir)) |
| A3 — envio sem resposta | "Se o nome já é o do novo semestre e as linhas estão lá, o envio foi feito: não repita." | resultado não confirmado; comparar o conteúdo das seis abas com a lista conferida para a tentativa (nomes com observações, tipo, semestre ideal, créditos-aula, inclusões e remoções); num reenvio do mesmo semestre, nome, códigos e quantidades não bastam; o evento "Envio da grade" na auditoria é indício, e a falta dele não prova nada; sem confirmação, procurar o Serviço de Graduação antes de reenviar ([ajuda-envio-grade-resultado](#ajuda-envio-grade-resultado), [ajuda-envio-grade-reenvio](#ajuda-envio-grade-reenvio), [ajuda-problema-envio-incerto](#ajuda-problema-envio-incerto), FAQ [reenviar](#ajuda-faq-reenviar-copia)) |

## Correção complementar da 1.9.2

| Ponto | Texto da 1.9.1 | Como ficou |
|---|---|---|
| A3 — conclusão a partir da comparação | "Se o conteúdo das abas corresponde ao que você conferiu agora, a tentativa foi concluída: não reenvie." | dados das seis abas iguais à lista conferida mostram que **esses dados** estão na planilha, mas não confirmam sozinhos que todas as etapas do envio terminaram (podem faltar, por exemplo, as fórmulas de Horário de Fim); com tentativas de conteúdo idêntico, a comparação também não mostra qual terminou; o resultado continua não confirmado até haver evidência suficiente, e na dúvida procura-se o Serviço de Graduação antes de reenviar ([ajuda-envio-grade-resultado](#ajuda-envio-grade-resultado), [ajuda-problema-envio-incerto](#ajuda-problema-envio-incerto)). O evento "Envio da grade" na auditoria passou a ser descrito como evidência complementar |

## Correção editorial da 1.9.3

| Ponto | Texto da 1.9.2 | Como ficou |
|---|---|---|
| "O envio parou no meio" ([ajuda-envio-grade-resultado](#ajuda-envio-grade-resultado)) | "a cópia de segurança foi feita, mas a gravação das abas não terminou" | "a cópia de segurança foi feita, mas nem todas as etapas do envio foram concluídas" — a interrupção pode ocorrer em outra etapa, por exemplo na renomeação do arquivo, depois de gravados os dados e as fórmulas. O restante da orientação não mudou |

**Pendências institucionais (não bloqueiam a Central; ver o relatório da 1.9.0):** canal de contato oficial do Serviço de Graduação (a Central usa a orientação neutra "procure o Serviço de Graduação, pelos canais que você já usa com ele"); canal das justificativas à Comissão de Graduação ("pelo canal combinado com ela"); interpretação acadêmica da carga AACC/ATPA; divisão de responsabilidade pelas abas Interdepartamentais e Outras Unidades entre as secretarias.
