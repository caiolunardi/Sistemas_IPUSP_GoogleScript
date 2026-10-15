# Ajuda — Grade Horária visual (texto-fonte da Central de Ajuda, v2.0)

> **Nota editorial.** Este é o texto-fonte da Central de Ajuda do app (`src/GradeAjuda.html`), na mesma ordem, com os mesmos títulos e identificadores (`{#ajuda-…}`) usados pelos gatilhos. O padrão segue [docs/ajuda](../../ajuda/README.md) e o [modelo de conteúdo](../../ajuda/HELP_CONTENT_MODEL.md).
>
> - **Público:** alunos do IP, docentes e secretarias que consultam a grade.
> - **Linguagem:** efeito para quem usa a página. Planilhas, índices, IDs e funções ficam no [manual](MANUAL_OPERACAO.md), não aqui.
> - **Mecanismo:** `GradeAjudaEstilos.html` e `GradeAjudaUI.html` são byte-idênticos a `shared/ajuda/`. Abrir, buscar, navegar e expandir a FAQ não chamam o servidor.
> - **Manutenção:** ao mudar um texto, mude-o nos dois lugares (aqui e em `GradeAjuda.html`). Os "termos extras" são o `data-search` de cada item: a busca da Central procura neles **e** no texto visível.
> - **Fatos mutáveis citados:** horários do quadro (**08:00–12:00** e **13:30–18:00**, de `criarGrade` em `GradeGrid.html`); cores (verde = obrigatória, azul = eletiva, rosa = livre); grade atual lida a cada carregamento, sem cache do conteúdo (`obterGrade` em `Codigo.gs`, v2.1); paridade dos botões; regras do que entra na grade (`disciplinaDaLinha_`). Não há contato nominal: a ajuda encaminha ao Serviço de Graduação e à secretaria do departamento.

## Gatilhos contextuais

| Onde | Texto do gatilho | Abre |
|---|---|---|
| Cabeçalho | **Ajuda** | `ajuda-inicio` |
| Faixa acima do quadro, ao lado da legenda | Como ler a grade? | `ajuda-ler-grade` |
| Texto de "Comece aqui" | como funciona / detalhes | `ajuda-anteriores` / `ajuda-exportar` |
| Texto de "Não encontro uma disciplina" | o que aparece na grade | `ajuda-o-que-aparece` |

---

## Comece aqui {#ajuda-inicio}

### Para que serve

Esta página mostra a grade horária das disciplinas do curso de Psicologia, semestre a semestre do curso: em que dia e horário cada disciplina acontece, quem ministra e, quando já definida, a sala.

*Termos extras:* inicio comecar para que serve objetivo horario aulas curso psicologia

### Em três passos

1. A página abre na **grade atual**.  
2. Escolha o semestre do curso nos botões acima do quadro (por exemplo, **3º Semestre**).  
3. Clique numa disciplina para ver a ficha completa.

*Termos extras:* rapido resumo passo como usar escolher semestre clicar

### O que mais dá para fazer

Em **Consultar Grades Anteriores**, no topo, você abre a grade de um semestre que já passou ([como funciona](#ajuda-anteriores)). O botão **Exportar PDF** gera um arquivo com todos os semestres do curso da grade que está na tela ([detalhes](#ajuda-exportar)).

*Termos extras:* o que mais da para fazer anteriores pdf exportar outros semestres

## Como ler a grade {#ajuda-ler-grade}

### O quadro

As colunas são os dias da semana, de segunda a sexta. As linhas são intervalos de meia hora, das 08:00 às 12:00 e das 13:30 às 18:00, com o intervalo de almoço entre os dois períodos.

*Termos extras:* quadro colunas dias semana linhas horarios meia hora segunda sexta

### Cada bloco é uma disciplina

O bloco mostra o código, o nome e o horário de início e fim. Ele começa na linha do horário de início, e a altura dele corresponde à duração da aula.

*Termos extras:* cartao bloco post-it disciplina codigo nome horario altura duracao

### As cores

**Verde**: obrigatória. **Azul**: optativa eletiva. **Rosa**: optativa livre. A legenda fica acima do quadro, e o tipo também aparece escrito na ficha da disciplina.

*Termos extras:* cores verde azul rosa obrigatoria eletiva livre legenda tipo optativa

### Blocos sobrepostos

Quando duas ou mais disciplinas acontecem no mesmo dia e horário, os blocos ficam levemente deslocados, um sobre o outro, em escada. Passe o mouse sobre um bloco para trazê-lo à frente, ou clique para abrir a ficha.

*Termos extras:* sobreposto empilhado mesmo horario conflito escada deslocado varias disciplinas

### Qual grade está na tela

Acima do quadro aparecem o ano e o semestre da grade, com a etiqueta **Grade atual** ou **Grade anterior**, e o horário em que os dados foram lidos.

*Termos extras:* titulo faixa grade atual anterior etiqueta dados de horario leitura

## Semestres do curso {#ajuda-semestres}

### Por que aparecem só alguns semestres

Os botões mostram os semestres do curso oferecidos naquela grade. Na grade do 1º semestre do ano aparecem os semestres ímpares do curso (1º, 3º, 5º, 7º e 9º); na do 2º semestre do ano, os pares (2º, 4º, 6º, 8º e 10º).

*Termos extras:* botoes semestre 1 3 5 7 9 2 4 6 8 10 impar par periodo ideal

### Um botão a mais

Se uma disciplina de outro semestre do curso também for oferecida naquela grade (por exemplo, uma do 4º semestre na grade do 1º semestre do ano), aparece um botão para esse semestre também.

*Termos extras:* botao extra semestre a mais 4 semestre impar diferente oferecida dois semestres

### Trocar de semestre

Clique no botão do semestre desejado. O botão escolhido fica destacado, e o quadro mostra só as disciplinas desse semestre do curso.

*Termos extras:* trocar semestre clicar botao destacado sublinhado ativo

## Ficha da disciplina {#ajuda-ficha}

### Abrir a ficha

Clique no bloco da disciplina. Pelo teclado, use Tab até o bloco e aperte Enter.

*Termos extras:* abrir ficha clicar detalhes informacoes teclado enter

### O que a ficha mostra

Código, nome, departamento ou unidade responsável, tipo (obrigatória, eletiva ou livre), créditos-aula, dia, horário, docentes e sala.

*Termos extras:* docente professor sala creditos tipo departamento unidade dia horario

### Sala "A definir"

A sala ainda não foi informada. Ela costuma ser definida depois da matrícula, conforme o número de matriculados. Volte a consultar mais perto do início das aulas.

*Termos extras:* sala a definir sem sala ainda nao definida reserva

### Fechar a ficha

Use o **×** no canto, a tecla Esc ou clique fora da ficha.

*Termos extras:* fechar ficha sair esc x clicar fora

## Consultar grades anteriores {#ajuda-anteriores}

### Abrir a grade de um semestre que já passou

No topo da página, em **Consultar Grades Anteriores**, escolha o semestre na lista. Os semestres aparecem como "2026 - 1º Semestre", do mais recente para o mais antigo. O quadro passa a mostrar a grade escolhida, com a etiqueta **Grade anterior**.

*Termos extras:* grade anterior antiga semestre passado consultar lista seletor historico

### Voltar para a grade atual

Escolha a primeira opção da lista, **Grade atual**. Ao abrir a página de novo, ela sempre começa na grade atual.

*Termos extras:* voltar grade atual retornar padrao abrir pagina

### A lista está desativada

Ainda não há grades anteriores guardadas, ou a lista não pôde ser carregada naquele momento. A grade atual continua funcionando; recarregue a página mais tarde para tentar de novo.

*Termos extras:* lista desativada cinza nao abre nenhuma grade anterior vazia

### Um semestre não está na lista

A lista mostra os semestres cuja grade foi guardada pelo Serviço de Graduação. Se faltar um semestre de que você precisa, fale com o Serviço de Graduação.

*Termos extras:* semestre faltando grade antiga nao aparece lista

## Exportar PDF {#ajuda-exportar}

### O que vai no arquivo

Uma página para cada semestre do curso da grade que está na tela, com o título do semestre e o ano. Se você estiver vendo uma grade anterior, o PDF é dessa grade.

*Termos extras:* pdf exportar baixar imprimir arquivo download todos semestres

### Diferenças em relação à tela

O PDF sai sempre com fundo claro, mesmo com a página no modo escuro. Disciplinas no mesmo horário ficam lado a lado, em vez de sobrepostas, e por isso podem aparecer com letra menor.

*Termos extras:* pdf claro tema escuro branco impressao lado a lado conflito compacto

### Durante a exportação

Aparece "Exportando Grade Horária.." com o andamento (por exemplo, 2/5). Espere terminar; o arquivo é baixado sozinho.

*Termos extras:* demora espera exportando aguarde tempo

## O que aparece na grade {#ajuda-o-que-aparece}

### Disciplinas que aparecem

As disciplinas do curso de Psicologia que serão oferecidas no semestre e já têm dia e horário definidos, inclusive as de outras unidades da USP ministradas para o IP (por exemplo, Estatística).

*Termos extras:* quais disciplinas aparecem oferecida dia horario definido

### Disciplinas práticas

Disciplinas práticas têm horário variável, combinado com cada turma, e por isso não aparecem no quadro.

*Termos extras:* nao aparece pratica horario variavel estagio atendimento

### Disciplinas do IP para outros cursos

Disciplinas que o IP oferece a outros cursos da USP não fazem parte desta grade, que é a dos alunos do IP.

*Termos extras:* outros cursos outras unidades fea disciplina do ip para fora nao aparece

### Aviso "fora dos horários da grade"

O quadro vai das 08:00 às 12:00 e das 13:30 às 18:00. Uma disciplina que comece em outro horário não cabe no quadro; o aviso acima dele diz quantas estão nessa situação naquele semestre.

*Termos extras:* fora do horario noite antes das 8 aviso nao aparecem no quadro

### A grade atual pode mudar

A grade atual é montada pelos departamentos e pode ser completada ou corrigida até o início do semestre. Cada vez que a página é aberta ou recarregada, ela lê a planilha naquele momento: recarregue para ver a versão mais recente.

*Termos extras:* grade atual em preenchimento incompleta mudando atualizacao provisoria

## Problemas comuns {#ajuda-problemas}

### A página fica em "Organizando disciplinas..."

A grade está sendo lida. Isso costuma levar alguns segundos. Se passar de um minuto, recarregue a página.

*Termos extras:* carregando organizando disciplinas demora travou parado

### Apareceu "Não foi possível carregar a grade"

Recarregue a página e tente de novo. Se você estava trocando para uma grade anterior, a tela continua mostrando a grade de antes. Se o erro persistir, avise o Serviço de Graduação dizendo qual grade tentou abrir.

*Termos extras:* erro nao foi possivel carregar a grade mensagem vermelha falha

### O semestre aparece vazio

Ainda não há disciplinas daquele semestre do curso com dia e horário definidos nessa grade. Na grade atual, isso costuma mudar conforme os departamentos completam o preenchimento.

*Termos extras:* semestre vazio nenhuma disciplina sem disciplinas quadro vazio

### Não encontro uma disciplina

Confira o semestre do curso escolhido nos botões e veja [o que aparece na grade](#ajuda-o-que-aparece): práticas, disciplinas sem horário definido e disciplinas para outros cursos não aparecem. Se a dúvida continuar, procure o departamento responsável ou o Serviço de Graduação.

*Termos extras:* disciplina sumiu nao encontro faltando onde esta

### O PDF não baixou

Confira se o navegador bloqueou o download (geralmente aparece um aviso na barra de endereço) e tente de novo. Em celulares, o arquivo vai para a pasta de downloads do aparelho.

*Termos extras:* pdf nao baixou download bloqueado navegador

## Aparência {#ajuda-aparencia}

### Sistema, Claro ou Escuro

Em **Aparência**, no topo, **Sistema** acompanha o modo claro/escuro do seu aparelho; **Claro** e **Escuro** fixam um dos dois. A escolha fica guardada neste navegador. O PDF sai sempre claro.

*Termos extras:* tema escuro claro sistema aparencia noite modo

## Perguntas frequentes {#ajuda-faq}

### Esta grade substitui o Júpiter? {#grade-faq-oficial}

Não. Ela ajuda a visualizar os horários. Para matrícula, turmas e vagas, vale o que estiver no Júpiter.

*Termos extras:* oficial vale matricula jupiter confirmar

### Um horário mudou e a grade ainda mostra o antigo. Por quê? {#grade-faq-atualizacao}

A grade atual é lida na hora, a cada vez que a página abre. Recarregue a página (F5) e confira o horário da leitura, que aparece acima do quadro. Se o horário for recente e o antigo continuar, a mudança ainda não foi feita na planilha do departamento.

*Termos extras:* atualiza quando mudou demora minutos recarregar

### As grades anteriores podem mudar? {#grade-faq-anterior}

Não. Cada grade anterior é uma cópia guardada pelo Serviço de Graduação antes de começar a montagem da grade seguinte, e fica como estava naquele momento.

*Termos extras:* grade anterior mudou editar corrigir antiga

### Encontrei uma informação errada. A quem aviso? {#grade-faq-erro}

À secretaria do departamento responsável pela disciplina (o departamento aparece na ficha) ou ao Serviço de Graduação. Esta página só mostra a grade; não é possível corrigir nada por aqui.

*Termos extras:* erro horario errado docente errado corrigir quem avisar

### Funciona no celular? {#grade-faq-celular}

Sim. Em telas estreitas, o quadro com os cinco dias rola para o lado: arraste-o com o dedo para ver quinta e sexta-feira. Com o celular deitado, cabe mais coisa na tela.

*Termos extras:* celular telefone tablet mobile rolar lado arrastar

### Duas disciplinas estão no mesmo horário. Posso cursar as duas? {#grade-faq-conflito}

Não ao mesmo tempo. Os blocos sobrepostos mostram opções no mesmo horário; escolha uma. Na dúvida sobre o seu percurso, fale com o Serviço de Graduação.

*Termos extras:* mesmo horario duas disciplinas escolher conflito optativa obrigatoria

### A página ficou escura (ou clara) sozinha. É normal? {#grade-faq-tema}

Sim, se a **Aparência** estiver em **Sistema**: a página acompanha o modo claro/escuro do seu aparelho. Para fixar um dos dois, escolha **Claro** ou **Escuro**.

*Termos extras:* tema escuro mudou sozinho noite claro
