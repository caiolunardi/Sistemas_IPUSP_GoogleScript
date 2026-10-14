# Ajuda — Comunidade IPUSP (texto-fonte da Central de Ajuda, v1.3)

> **Nota editorial.** Este é o texto-fonte da Central de Ajuda do app (`src/BuscaAlunosAjuda.html`), na mesma ordem, com os mesmos títulos e identificadores (`{#ajuda-…}`) usados pelos gatilhos contextuais. O padrão segue [docs/ajuda](../../ajuda/README.md) e o [modelo de conteúdo](../../ajuda/HELP_CONTENT_MODEL.md).
>
> - **Público:** equipe do Serviço de Graduação (triagem dos grupos de atendimento clínico e contatos de docentes, servidores e setores).
> - **Linguagem:** efeito para quem usa a página. Planilhas, IDs, propriedades do script e funções ficam no [manual](MANUAL_OPERACAO.md) e no [README do código](../../../sistemas/busca-alunos/README.md), não aqui.
> - **Mecanismo:** `BuscaAlunosAjudaEstilos.html` e `BuscaAlunosAjudaUI.html` são byte-idênticos a `shared/ajuda/`. Abrir, buscar, navegar e expandir a FAQ não chamam o servidor.
> - **Manutenção:** ao mudar um texto, mude-o nos dois lugares (aqui e em `BuscaAlunosAjuda.html`). Os "termos extras" são o `data-search` de cada item: a busca da Central procura neles **e** no texto visível.
> - **Fonte dos fatos:** script de busca de `BuscaAlunosApp.html` (preservado do original) e `Codigo.gs`. Informações mutáveis citadas: limite de **60** resultados na tela (`MAX_RESULTADOS`), coluna somente leitura **ID da Pasta** (`COLUNAS_SOMENTE_LEITURA`), formato de ingresso **AAAA/S**, regra "só editores da planilha salvam", os quatro selos (`VINCULOS`), o que é **Setor** (campo TIPO), a mensagem de cópia do número USP (3 s), os formatos de `M / F` e `TIPO` e o tratamento Prof./Profª. Não há contato nominal; a ajuda encaminha ao "responsável pelo sistema" e ao "responsável pelo cadastro", sem inventar canal.

## Gatilhos contextuais

| Onde | Texto do gatilho | Abre |
|---|---|---|
| Cabeçalho | **Ajuda** | `ajuda-inicio` |
| Abaixo do campo de busca | Como buscar? | `ajuda-como-buscar` |
| Abaixo do campo de busca | Filtrar e exportar por ingresso | `ajuda-ingresso` |
| Abaixo do campo de busca | Não encontrou a pessoa? | `ajuda-nao-encontrei` |
| Texto de "Comece aqui" | ficha completa / exportar a turma | `ajuda-ficha` / `ajuda-ingresso` |
| Texto de "Entendendo os resultados" | Perguntas frequentes | `ajuda-faq` |
| Texto de "Não encontrou a pessoa?" | Problemas comuns | `ajuda-problemas` |

---


## Comece aqui {#ajuda-inicio}

### Para que serve

Esta página localiza rapidamente uma pessoa do Instituto (aluno, docente, servidor) ou um setor, a partir de um pedaço do nome, do número USP, do e-mail ou do setor. Nasceu para a triagem dos grupos de atendimento clínico, quando o nome do aluno chega incompleto e sem número USP.

<sub>Termos extras da busca: inicio comecar para que serve objetivo triagem atendimento clinico psicologia clinica grupos comunidade pessoas docentes servidores setores</sub>

### Em três passos

1. Espere aparecer a mensagem com o total de pessoas carregadas.
2. Digite no campo **Buscar pessoa** qualquer parte do nome, do número USP, do e-mail ou do setor.
3. Os resultados aparecem enquanto você digita; cada um traz um selo dizendo se é **Aluno**, **Docente**, **Servidor** ou **Setor**. Clique no resultado para ver a ficha; clique no número USP para copiá-lo.

<sub>Termos extras da busca: rapido resumo passo como usar digitar</sub>

### O que mais dá para fazer

Clique num resultado para abrir a [ficha completa](#ajuda-ficha) e, se você for editor do cadastro, corrigir dados. Escolha um **Ano de ingresso** para ver e [exportar a turma](#ajuda-ingresso) em CSV ou PDF.

<sub>Termos extras da busca: o que da para fazer editar exportar lista ano ingresso ficha</sub>

## Como buscar {#ajuda-como-buscar}

### Por nome, mesmo incompleto

Digite as partes do nome que você tem, em qualquer ordem. "silva ana" encontra "Ana Paula da Silva". Pedaços de palavra também valem: "fern" encontra "Fernanda" e "Fernandes".

<sub>Termos extras da busca: nome parcial incompleto sobrenome ordem palavras primeiro nome</sub>

### Por número USP

Digite o número USP inteiro ou só uma parte dele. Quanto mais dígitos, menos resultados.

<sub>Termos extras da busca: numero usp nusp n usp codigo matricula digitos</sub>

### Por e-mail

A busca procura no e-mail de todos e, para alunos, também no e-mail secundário. Pode digitar só o começo, como "ana.silva", sem o domínio.

<sub>Termos extras da busca: email e-mail correio usp.br secundario pessoal gmail</sub>

### Por setor

Para servidores e setores, a busca também olha o nome do setor. Digite, por exemplo, "graduacao" para ver quem trabalha no Serviço de Graduação e o e-mail do próprio setor.

<sub>Termos extras da busca: setor secao servico secretaria biblioteca onde trabalha servidor departamento</sub>

### Várias palavras ao mesmo tempo

Cada palavra separada por espaço precisa aparecer na mesma pessoa: no nome, no número USP, nos e-mails ou no setor. Por isso, acrescentar uma palavra sempre reduz a lista. Se a lista ficar vazia, tire uma palavra.

<sub>Termos extras da busca: varias palavras espaco combinar todas termos e ou</sub>

### Acentos e maiúsculas não importam

"Claudia" encontra "Cláudia", e "JOAO" encontra "João". Não é preciso acertar acentos nem maiúsculas.

<sub>Termos extras da busca: acento acentuacao maiuscula minuscula cedilha caixa alta</sub>

## Entendendo os resultados {#ajuda-resultados}

### O que cada resultado mostra

Primeiro, o selo do vínculo; depois, em negrito, o nome. Embaixo, o e-mail, o e-mail marcado "(secundário)", se houver, e, no servidor, o setor. Nos alunos aparece também o ingresso. À direita, o número USP de alunos, docentes e servidores (setores não têm).

<sub>Termos extras da busca: card resultado nome email selo numero usp direita</sub>

### Copiar o número USP

Clique no número USP à direita do resultado (ou use Tab até ele e aperte Enter). Ele é copiado e aparece, embaixo da tela, por alguns segundos, a mensagem "Número USP copiado para área de transferência". Depois é só colar onde precisar.

<sub>Termos extras da busca: copiar numero usp clicar area de transferencia colar ctrl c</sub>

### Selo Aluno, Docente, Servidor ou Setor

**Aluno** vem do cadastro de alunos; **Docente**, do cadastro de docentes; **Servidor** e **Setor**, do cadastro de servidores. **Setor** é o contato de uma seção do Instituto (por exemplo, o e-mail de uma secretaria), e não de uma pessoa. A mesma pessoa pode aparecer duas vezes se estiver em dois cadastros.

<sub>Termos extras da busca: selo vinculo indicador tipo aluno docente servidor setor professor funcionario cor</sub>

### Trechos destacados

As partes que combinaram com o que você digitou ficam destacadas. Se um aluno aparece sem destaque no nome, a combinação está no e-mail ou no número USP.

<sub>Termos extras da busca: destaque marcado amarelo grifado sublinhado onde combinou</sub>

### "sem nº USP", "sem e-mail cadastrado", "(sem nome cadastrado)"

Esse dado está em branco no cadastro de origem. A busca não completa nem corrige informações; veja [Perguntas frequentes](#ajuda-faq) para saber a quem pedir a correção.

<sub>Termos extras da busca: sem numero usp sem e-mail sem nome cadastrado vazio faltando</sub>

### "Mostrando os primeiros 60 de..."

A tela mostra no máximo 60 resultados de cada vez. Quando houver mais, digite outra parte do nome, do número, do e-mail ou do setor para refinar.

<sub>Termos extras da busca: 60 sessenta limite primeiros mostrando refinar muitos resultados</sub>

### Contagem embaixo do campo

Com o campo vazio, aparece quantos alunos, docentes, servidores e setores foram carregados. Durante a busca, aparece quantos resultados foram encontrados.

<sub>Termos extras da busca: contador quantos encontrados resultados alunos docentes servidores setores carregados total</sub>

## Ficha e edição {#ajuda-ficha}

### Abrir a ficha

Clique no nome ou no e-mail do resultado (ou use Tab até ele e aperte Enter). Funciona para alunos, docentes, servidores e setores. A ficha mostra todas as informações daquele cadastro, inclusive as que não aparecem na lista. Para fechar, use **Fechar**, o × ou a tecla Esc.

<sub>Termos extras da busca: abrir ficha clicar aluno docente servidor setor detalhes todos os dados modal</sub>

### Corrigir um dado

1. Altere o campo; ele fica marcado e o rodapé mostra quantos campos mudaram.
2. Clique em **Salvar alterações**.
3. Espere "Alterações salvas na planilha." Só os campos que você mudou são gravados, e a lista de busca já passa a mostrar o dado novo.

<sub>Termos extras da busca: editar corrigir alterar salvar mudar dados email nome numero</sub>

### Quem pode editar

Só quem é editor do cadastro daquela pessoa (de alunos, de docentes ou de servidores, que inclui os setores). Para as demais contas a ficha abre só para consulta, com um aviso no topo. Se precisar editar, peça acesso de editor ao responsável pelo cadastro.

<sub>Termos extras da busca: quem pode editar permissao editor somente consulta nao consigo salvar campos bloqueados</sub>

### Campos "somente leitura"

Alguns campos, como o ID da Pasta, são usados por outros sistemas e não podem ser alterados por aqui. Eles aparecem com borda tracejada e a indicação "(somente leitura)".

<sub>Termos extras da busca: somente leitura id da pasta bloqueado nao edita tracejado</sub>

### Formatos aceitos

Número USP: só dígitos. Ingresso: ano e semestre com barra, como 2024/1 ou 2024/2. E-mails: no formato nome@dominio. O nome não pode ficar vazio. Docentes, campo M / F: só M ou F. Servidores, campo TIPO: só SERVIDOR ou SETOR (é ele que define o selo). Se algo estiver fora do formato, a ficha avisa e nada é gravado.

<sub>Termos extras da busca: formato ingresso 2024/1 numero usp digitos email invalido regra m f genero tipo servidor setor</sub>

### Prof. ou Profª. no título da ficha do docente

O título da ficha do docente já vem com **Prof.** ou **Profª.**, conforme o campo M / F. Para corrigir o tratamento, corrija o M / F e salve.

<sub>Termos extras da busca: prof profa professora professor tratamento titulo docente genero masculino feminino</sub>

## Filtrar por ingresso e exportar {#ajuda-ingresso}

### Ver os alunos de um ano de ingresso

O filtro vale só para alunos: ao escolher um ano, docentes, servidores e setores saem da lista. Em **Ano de ingresso**, escolha o ano; a lista mostra todos os alunos que entraram nele, em ordem alfabética. O número entre parênteses é quantos alunos há naquele ano. Depois, se quiser, escolha o **Semestre** (1º ou 2º). O ano vem dos quatro primeiros dígitos do ingresso e o semestre do número depois da barra: 2024/1 é o 1º semestre de 2024.

<sub>Termos extras da busca: ano de ingresso turma filtro combobox semestre 2024/1 lista do ano</sub>

### Combinar com a busca

O filtro de ingresso funciona junto com o texto digitado: escolha 2023 e digite "ana" para ver só as Anas que entraram em 2023. Para voltar a buscar em todos, escolha "Todos os anos".

<sub>Termos extras da busca: combinar filtro busca texto nome ano juntos</sub>

### Exportar em CSV

**Exportar CSV** baixa um arquivo com vínculo, nome, setor, número USP, ingresso e e-mails de todas as pessoas da lista atual, não só das 60 da tela. Ele abre no Excel ou no Google Planilhas; para montar uma lista de e-mails, copie a coluna E-mail.

<sub>Termos extras da busca: exportar csv excel planilha baixar download lista de emails comunicacao</sub>

### Exportar em PDF

**Exportar PDF** gera uma tabela com as mesmas colunas, em folha deitada, com título, quantidade e data. Pode levar alguns segundos; o botão mostra "Gerando PDF..." enquanto isso.

<sub>Termos extras da busca: exportar pdf imprimir baixar documento relatorio</sub>

### Aluno sem ingresso no filtro

Quem está com o ingresso em branco ou fora do formato AAAA/S só aparece em "Todos os anos". Abra a ficha e corrija o ingresso para que ele entre no ano certo.

<sub>Termos extras da busca: ingresso vazio sem ano formato diferente nao aparece no filtro</sub>

### Cuidado com os arquivos exportados

CSV e PDF contêm dados pessoais. Envie só para quem pediu e para a finalidade informada, prefira compartilhar pelo e-mail institucional e apague as cópias que não forem mais necessárias.

<sub>Termos extras da busca: compartilhar arquivo exportado lgpd envio setor comunicacao cuidado</sub>

## Não encontrou a pessoa? {#ajuda-nao-encontrei}

### Apareceu "Nenhuma pessoa encontrada..."

Ninguém tem todas as palavras digitadas. Se um **Ano de ingresso** estiver escolhido, só alunos são procurados: volte para "Todos os anos". Tente nesta ordem:
1. Use menos palavras, por exemplo só o sobrenome mais raro.
2. Tire abreviações e iniciais ("M." ou "Ma.").
3. Experimente outra grafia ("Luiz"/"Luis", "Tereza"/"Teresa", "Thais"/"Tais").
4. Confira se não há um número ou letra trocada.

<sub>Termos extras da busca: nenhuma pessoa encontrada nenhum aluno encontrado vazio sem resultado nao aparece</sub>

### A pessoa foi cadastrada agora há pouco

A lista é carregada uma vez, quando a página abre. Recarregue a página para ver cadastros feitos depois disso.

<sub>Termos extras da busca: cadastro recente novo aluno acabou cadastrar recarregar atualizar pagina</sub>

### Aparecem resultados demais

Palavras curtas e muito comuns, como "de", "da" ou "silva", combinam com muita gente. Prefira partes mais distintivas do nome ou acrescente outra palavra.

<sub>Termos extras da busca: muitos resultados palavras curtas de da dos silva comum</sub>

### Ainda assim não aparece

Uma causa possível é a pessoa ainda não estar no cadastro usado por esta busca (de alunos, de docentes ou de servidores). Nesse caso, confirme a situação com o responsável por aquele cadastro. Se apareceu o aviso "não consegui ler o cadastro de...", veja [Problemas comuns](#ajuda-problemas).

<sub>Termos extras da busca: nao esta no cadastro fora da lista aluno de outro curso docente servidor novo procurar responsavel</sub>

## Problemas comuns {#ajuda-problemas}

### A página fica em "Carregando a lista de pessoas..."

O campo só libera depois que a lista termina de carregar, o que pode levar alguns segundos. Se demorar muito, recarregue a página. Se continuar, verifique sua conexão e tente de novo mais tarde.

<sub>Termos extras da busca: carregando demora lento travado campo desabilitado cinza nao deixa digitar</sub>

### Apareceu "Não consegui carregar a lista de pessoas..."

A página abriu, mas nenhum cadastro pôde ser lido. Causas comuns: uma falha momentânea, a conta usada não ter permissão ou uma mudança recente na configuração. Recarregue a página uma vez. Se a mensagem continuar, envie o texto que apareceu (sem dados pessoais) ao responsável pelo sistema no Serviço de Graduação.

<sub>Termos extras da busca: erro nao consegui carregar a lista de pessoas alunos mensagem vermelha falha</sub>

### Aviso "Atenção: não consegui ler o cadastro de..."

Um dos cadastros (alunos, docentes ou servidores) não pôde ser lido; as pessoas dos outros aparecem normalmente. Recarregue a página uma vez. Se o aviso continuar, envie o texto dele ao responsável pelo sistema.

<sub>Termos extras da busca: atencao nao consegui ler o cadastro de docentes servidores alunos aviso amarelo faltando</sub>

### "Não foi possível abrir o arquivo" ou acesso negado

Uma causa comum é estar conectado no navegador com outra conta Google. Entre com a sua conta institucional @usp.br (ou abra a página numa janela anônima e faça login só com ela) e abra o endereço de novo. Se o acesso continuar negado, peça liberação ao responsável pelo sistema.

<sub>Termos extras da busca: conta google errada login usp.br nao foi possivel abrir o arquivo acesso negado permissao</sub>

### "Sua conta não tem permissão para alterar a planilha de..."

A sua conta não está entre os editores daquele cadastro (acesso dado só por grupo também não conta). Você continua podendo consultar e exportar. Para editar, peça acesso de editor individual ao responsável pelo cadastro.

<sub>Termos extras da busca: sua conta nao tem permissao alterar planilha salvar bloqueado editor</sub>

### A exportação não baixou

Confira se o navegador bloqueou o download (ícone na barra de endereço) e tente de novo. Listas muito grandes podem ser recusadas no PDF; filtre por ano ou semestre, ou use o CSV.

<sub>Termos extras da busca: nao consegui gerar o pdf erro exportacao download nao baixou</sub>

## Uso responsável dos dados {#ajuda-privacidade}

### São dados pessoais

Nome, número USP e e-mail de alunos, docentes e servidores são dados pessoais. Use-os só para o atendimento em andamento. Não copie a lista para outros arquivos, mensagens ou grupos, e evite capturas de tela com resultados.

<sub>Termos extras da busca: privacidade lgpd dados pessoais sigilo compartilhar copiar print captura tela</sub>

### Ao terminar

Feche a página quando acabar, principalmente em computadores compartilhados: enquanto ela estiver aberta, a lista carregada continua disponível nela.

<sub>Termos extras da busca: fechar pagina computador compartilhado sair sessao aberta</sub>

## Aparência {#ajuda-aparencia}

### Sistema, Claro ou Escuro

No seletor **Aparência**, no topo, escolha **Sistema** para seguir a configuração do seu computador ou celular, ou fixe **Claro** ou **Escuro**. A escolha fica guardada só neste navegador.

<sub>Termos extras da busca: tema claro escuro modo noturno dark light sistema cores aparencia</sub>

## Perguntas frequentes {#ajuda-faq}

### Preciso digitar o nome completo? {#busca-faq-nome-completo}

Não. Basta um pedaço de qualquer parte do nome, em qualquer ordem. Duas partes distintivas, como um prenome e um sobrenome, costumam bastar.

<sub>Termos extras da busca: nome completo inteiro precisa</sub>

### Por que apareceu alguém cujo nome não tem o que eu digitei? {#busca-faq-por-que-apareceu}

Porque a busca também olha o número USP, os e-mails e o setor. O trecho destacado mostra onde houve a combinação.

<sub>Termos extras da busca: por que apareceu pessoa aluno sem termo nome combinou email numero setor</sub>

### Posso buscar só uma parte do número USP? {#busca-faq-parte-numero}

Sim. Qualquer sequência de dígitos é procurada dentro dos números USP e dos e-mails. Poucos dígitos trazem muitos resultados; digite mais para refinar.

<sub>Termos extras da busca: parte do numero usp digitos incompleto</sub>

### Alguém acabou de ser cadastrado e não aparece. Por quê? {#busca-faq-novo-cadastro}

A lista é carregada quando a página abre. Recarregue a página para incluir os cadastros feitos depois disso.

<sub>Termos extras da busca: cadastrado hoje novo nao aparece atualizar recarregar</sub>

### Por que só aparecem 60 resultados? {#busca-faq-limite}

Para manter a lista legível, a tela mostra no máximo 60 resultados. O total encontrado aparece embaixo do campo. Digite mais alguma coisa para chegar à pessoa certa. A exportação em CSV ou PDF sempre inclui todos os encontrados.

<sub>Termos extras da busca: 60 limite todos mostrar mais resultados lista completa</sub>

### Como copio o e-mail ou o número USP? {#busca-faq-copiar}

Para o número USP, basta clicar nele: ele é copiado e aparece a mensagem "Número USP copiado para área de transferência". Para o e-mail, selecione o texto na ficha e copie normalmente (Ctrl+C, ou Cmd+C no Mac). Copie só o que for usar no atendimento.

<sub>Termos extras da busca: copiar e-mail numero usp colar selecionar clicar area de transferencia nao copiou</sub>

### Encontrei um dado errado. Posso corrigir por aqui? {#busca-faq-corrigir}

Sim, se a sua conta for editora daquele cadastro (alunos, docentes ou servidores): abra a ficha, altere o campo e clique em **Salvar alterações**. Se a ficha abrir só para consulta, informe a correção ao responsável pelo cadastro.

<sub>Termos extras da busca: dado errado corrigir atualizar email nome errado desatualizado quem editar</sub>

### Funciona no celular? {#busca-faq-celular}

Sim. Em telas estreitas, o número USP passa para uma linha própria embaixo do nome. Lembre-se de que dados pessoais no celular pedem o mesmo cuidado que no computador.

<sub>Termos extras da busca: celular telefone tablet mobile smartphone</sub>

### A página ficou escura (ou clara) sozinha. É normal? {#busca-faq-tema}

Sim, se a **Aparência** estiver em **Sistema**: a página acompanha o modo claro/escuro do seu aparelho. Para fixar um dos dois, escolha **Claro** ou **Escuro**.

<sub>Termos extras da busca: tema escuro mudou sozinho noite claro</sub>

### Como tiro a lista de e-mails de uma turma? {#busca-faq-lista-emails}

Escolha o ano (e, se quiser, o semestre) em **Ano de ingresso**, deixe o campo de busca vazio e clique em **Exportar CSV**. No arquivo, a coluna E-mail tem o e-mail principal de cada aluno; a coluna E-mail secundário, o alternativo, quando houver.

<sub>Termos extras da busca: lista emails setor comunicacao turma ano exportar</sub>

### Qual a diferença entre Servidor e Setor? {#busca-faq-setor}

**Servidor** é uma pessoa, com o setor onde trabalha embaixo do nome. **Setor** é o contato da própria seção (por exemplo, o e-mail de uma secretaria), útil quando não importa quem vai atender. Se um contato aparecer com o selo errado, abra a ficha e corrija o campo TIPO (SERVIDOR ou SETOR).

<sub>Termos extras da busca: setor o que e selo setor conta institucional secao email do setor diferente servidor</sub>

### Cliquei no número USP e apareceu "Não consegui copiar". E agora? {#busca-faq-copiar-usp}

Alguns navegadores bloqueiam a cópia automática. Abra a ficha (clique no nome), selecione o número no campo do número USP e use Ctrl+C (ou Cmd+C no Mac).

<sub>Termos extras da busca: clicar numero usp abre ficha nao copiou copiar mensagem nao apareceu</sub>

### Apareceu "foi alterado por outra pessoa" ou "a planilha mudou". O que faço? {#busca-faq-conflito}

Recarregue a página, abra o aluno de novo e refaça a alteração. A gravação é recusada quando a planilha mudou depois que você abriu a página ou a ficha, para que você não sobrescreva o trabalho de outra pessoa nem grave no aluno errado.

<sub>Termos extras da busca: alguem mudou outra pessoa conflito planilha mudou recarregue erro salvar</sub>
