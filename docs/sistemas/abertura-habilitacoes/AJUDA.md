# Central de Ajuda — Gerenciador de Abertura de Habilitações (texto-fonte)

Texto da Central de Ajuda da versão 2.0, em `sistemas/abertura-habilitacoes/gerenciador/src/GerenciadorAjuda.html`. Ao mudar um texto lá, mude aqui também. Público: equipe do Serviço de Graduação. Os IDs entre parênteses são as seções abertas pelos gatilhos da página; "→" indica um atalho para outra seção.

A ajuda usa o componente compartilhado `shared/ajuda/` (busca, índice, perguntas frequentes recolhíveis, foco preso, Esc). Ela abre **por cima** do detalhe de um pedido sem fechá-lo; ao fechar a ajuda, o foco volta para onde estava.

Gatilhos contextuais:

| Onde | Texto | Seção |
|---|---|---|
| Cabeçalho e item do menu | **Ajuda** / **Ajuda e perguntas frequentes** | `ajuda-inicio` |
| Área Pendentes | **? Como atender um pedido** | `ajuda-pendentes` |
| Área Concluídos | **? Sobre o histórico** | `ajuda-historico` |
| Área Relatórios | **? Como ler os números** | `ajuda-relatorios` |
| Detalhe, ao lado de "Concluir solicitação" | **?** | `ajuda-concluir` |
| Detalhe, ao lado de "Avisar aluno por e-mail" | **?** | `ajuda-email` |
| Cartão sem identificador | **? Por que não abre** | `ajuda-sem-identificador` |
| Aviso "somente consulta" | **Como pedir outro perfil** | `ajuda-acesso` |
| Mensagens de erro (link "Saiba mais") | conforme o código: conflito e trava ocupada → `ajuda-conflito`; envio em andamento → `ajuda-reenvio`; sem e-mail → `ajuda-email`; sem identificador, referência desatualizada, ID repetido → `ajuda-sem-identificador`; acesso e configuração → `ajuda-acesso`; e-mail que falhou → `ajuda-email-falhou` | |

O teste de navegador confere que todo gatilho aponta para uma seção que existe e que toda seção tem título.

## Comece aqui (`ajuda-inicio`)

### Para que serve

O gerenciador mostra os pedidos de abertura de habilitação enviados pelos alunos no formulário e permite registrar o atendimento: anotar observações, concluir ou reabrir o pedido e avisar o aluno por e-mail. Também traz a busca no histórico e os relatórios.

_Termos de busca:_ para que serve gerenciador abertura habilitacao bacharelado licenciatura

### O que você quer fazer?

- **Atender um pedido pendente** (→ `ajuda-pendentes`)
- **Encontrar o pedido de um aluno** (→ `ajuda-pesquisar`)
- **Avisar o aluno por e-mail** (→ `ajuda-email`)
- **Reabrir um pedido concluído** (→ `ajuda-reabrir`)
- **Ver os números de pedidos** (→ `ajuda-relatorios`)
- **Resolver um problema** (→ `ajuda-faq`)

_Termos de busca:_ atalhos o que voce quer fazer tarefas

### As três áreas

- **Pendentes**: pedidos que aguardam atendimento, em ordem alfabética, com busca.
- **Concluídos**: os 10 concluídos mais recentes e a busca no histórico (inclui 2021–2022).
- **Relatórios**: totais por habilitação, por ano e por mês.

Cada área carrega quando você a abre. O botão **Atualizar** busca de novo os dados na planilha.

_Termos de busca:_ areas pendentes concluidos relatorios mapa telas

## Pedidos pendentes (`ajuda-pendentes`)

### Localizar os pedidos pendentes

A área **Pendentes** abre primeiro. O número ao lado do título (e no menu) é o total de pedidos ainda não concluídos. A lista está em ordem alfabética de nome.

Um pedido conta como concluído quando a situação registrada na planilha contém “conclu” (por exemplo, “Concluído”); qualquer outra situação, inclusive vazia, aparece aqui.

_Termos de busca:_ localizar pendentes lista ordem alfabetica contador

### Atender um pedido

1. Clique no cartão do aluno (ou selecione-o com Tab e aperte Enter).
2. Confira os dados e escreva observações, se houver.
3. Deixe marcadas as opções que quer: **Concluir solicitação** e/ou **Avisar aluno por e-mail**.
4. Clique em **Salvar** e confirme.

Só quem tem perfil de administrador pode salvar. Quem tem perfil de consulta vê tudo, mas com as ações desativadas.

_Termos de busca:_ atender pedido passo a passo abrir salvar

## Pesquisar um aluno (`ajuda-pesquisar`)

### Entre os pendentes

Digite parte do nome ou do Nº USP no campo de busca da área Pendentes. A lista é filtrada na hora, sem diferença entre maiúsculas e minúsculas nem entre letras com e sem acento.

_Termos de busca:_ buscar pesquisar nome numero usp filtro acento

### Em pedidos antigos ou concluídos

Use a **busca no histórico**, na área Concluídos: ela procura por nome, Nº USP ou e-mail na planilha atual e no histórico 2021–2022. **Saiba mais sobre o histórico** (→ `ajuda-historico`).

_Termos de busca:_ buscar historico antigo concluido email

## Detalhes do pedido (`ajuda-detalhes`)

### O que aparece

Nº USP, E-mail USP, habilitação solicitada, ano de ingresso, se o aluno fez trancamento total, data da solicitação, situação, data de conclusão, quando o aviso por e-mail foi enviado e as observações da equipe.

A janela fecha com **Fechar**, com o × ou com a tecla Esc. Enquanto um salvamento está em andamento, ela só fecha quando ele termina.

_Termos de busca:_ abrir detalhes janela campos dados

### “Conclusão anterior; o pedido foi reaberto”

Quando um pedido é reaberto, a data da conclusão anterior continua registrada na planilha. O gerenciador a mostra com essa observação para não confundir com um pedido concluído.

_Termos de busca:_ data conclusao anterior reaberto

## Observações (`ajuda-observacoes`)

### Salvar observações

O texto do campo **Observações** é gravado toda vez que você clica em Salvar, junto com as outras opções. Para só anotar algo, desmarque “Avisar aluno por e-mail” e mantenha a situação como está (marcado para concluído, desmarcado para pendente).

O limite é de 2.000 caracteres. Texto maior não é cortado: o gerenciador pede para você resumir antes de salvar.

_Termos de busca:_ observacoes anotar recado limite caracteres salvar

## Concluir (`ajuda-concluir`)

### Concluir solicitação

Com **Concluir solicitação** marcado, a situação passa a “Concluído” e a data de conclusão é registrada. O pedido sai de Pendentes e aparece em Concluídos.

Se o pedido já estava concluído, salvar de novo com a opção marcada mantém a data de conclusão original.

_Termos de busca:_ concluir solicitacao marcar concluido data

### Concluir sem avisar

Marque **Concluir solicitação** e desmarque **Avisar aluno por e-mail**. Nenhum e-mail é enviado.

_Termos de busca:_ concluir sem avisar sem email

## Reabrir (`ajuda-reabrir`)

### Reabrir um pedido concluído

1. Em Concluídos (ou pela busca no histórico, para pedidos da planilha atual), abra o pedido.
2. Desmarque **Concluir solicitação** e **Avisar aluno por e-mail**.
3. Clique em Salvar e confirme “Reabrir pedido”.

O pedido volta para Pendentes. Pedidos do histórico 2021–2022 não podem ser reabertos: são somente consulta.

_Termos de busca:_ reabrir desfazer conclusao voltar pendente

## Avisar por e-mail (`ajuda-email`)

### O aviso ao aluno

Com **Avisar aluno por e-mail** marcado, o gerenciador pede confirmação e envia ao E-mail USP do aluno a mensagem “Abertura de Habilitação”, informando que a habilitação solicitada foi aberta, em nome do Serviço de Graduação, com respostas para o endereço da equipe.

A saudação (bom dia, boa tarde ou boa noite) segue o horário de Brasília.

_Termos de busca:_ email aviso enviar aluno mensagem assunto remetente

### Avisar sem concluir

As duas opções são independentes: você pode avisar e deixar o pedido pendente, desmarcando “Concluir solicitação”.

_Termos de busca:_ avisar sem concluir independente pendente

### Opção de e-mail desativada

Se o pedido não tem e-mail cadastrado, a opção fica desativada. Se o e-mail não parece válido, o gerenciador recusa o aviso sem gravar nada; corrija a planilha ou salve sem avisar.

_Termos de busca:_ sem email cadastrado invalido opcao desativada

## Reenviar o aviso (`ajuda-reenvio`)

### Confirmar reenvio

Se o aluno já foi avisado sobre esse pedido, o gerenciador não envia de novo automaticamente: ele mostra a data do aviso anterior e pede confirmação. Até você confirmar, nada é gravado.

_Termos de busca:_ reenviar confirmar reenvio ja avisado duplicado

### “Envio em andamento” ou “envio interrompido”

Durante o envio, o pedido fica reservado por alguns minutos para que duas pessoas não avisem o mesmo aluno ao mesmo tempo. Se outra pessoa está enviando, aguarde alguns minutos e tente de novo.

Se um envio foi interrompido antes de terminar, não dá para saber se o e-mail saiu. Nesse caso, o gerenciador pede confirmação antes de enviar outra vez.

_Termos de busca:_ envio em andamento interrompido outra sessao aguarde

## Salvo, mas o e-mail falhou (`ajuda-email-falhou`)

### “O pedido foi salvo, mas o e-mail não foi enviado”

As observações e a situação foram gravadas; só o aviso não saiu. O gerenciador não registra o e-mail como enviado. A janela continua aberta: você pode tentar de novo mais tarde, com “Avisar aluno por e-mail” marcado.

_Termos de busca:_ email falhou nao enviado salvo erro cota

### “O e-mail foi enviado, mas a data do envio não foi registrada”

O aluno recebeu o aviso, mas a planilha ficou sem a data. Não reenvie: a opção de aviso é desmarcada para evitar um segundo e-mail. Avise o responsável pelo sistema para conferir o registro.

_Termos de busca:_ email enviado data nao registrada nao reenviar

## Últimos concluídos (`ajuda-concluidos`)

### Os 10 concluídos mais recentes

A área Concluídos mostra os 10 pedidos da planilha atual concluídos mais recentemente, pela data de conclusão. Pedidos sem data de conclusão usam a data da solicitação.

Cada cartão diz se o aluno foi avisado por e-mail. “Sem confirmação de envio” quer dizer que um envio começou e não foi confirmado.

_Termos de busca:_ 10 dez concluidos recentes ordem data conclusao

## Histórico 2021–2022 (`ajuda-historico`)

### Pesquisar solicitações antigas

Na área Concluídos, digite pelo menos 2 caracteres (nome, Nº USP ou e-mail) e clique em **Buscar**. Os resultados vêm da planilha atual e do histórico 2021–2022, do mais recente para o mais antigo, com a origem indicada em cada cartão.

**Voltar aos 10 mais recentes** limpa a busca.

_Termos de busca:_ pesquisar antigas historico 2021 2022 busca nome usp email

### O histórico é somente consulta

Os pedidos de 2021–2022 ficam numa aba separada que o gerenciador apenas lê. Eles aparecem nas buscas e nos relatórios, mas não abrem para edição e nunca são alterados pelo sistema.

Resultados da planilha atual abrem normalmente, como em Pendentes.

_Termos de busca:_ historico somente leitura consulta nao editar

## Relatórios (`ajuda-relatorios`)

### Como ler os números

- **Total**: todos os pedidos com nome, da planilha atual e do histórico 2021–2022.
- **Por habilitação**: um pedido que marcou mais de uma habilitação conta uma vez em cada; respostas que não citam uma habilitação conhecida aparecem como “Outro / não identificado”.
- **Por ano e por mês**: pela data da solicitação. Pedidos sem data reconhecível ficam de fora dessas duas contagens, e o total informa quantos são.

Os critérios são os mesmos da versão anterior do gerenciador.

_Termos de busca:_ relatorios total habilitacao ano mes contagem

## Pedido sem identificador (`ajuda-sem-identificador`)

### Por que o pedido não abre

Cada pedido precisa de um identificador interno para ser alterado com segurança. Pedidos recém-chegados pelo formulário podem ainda não ter um. Eles continuam na lista, marcados como “Sem identificador”, mas não abrem até serem preparados.

Quem tem perfil de administrador vê o botão **Preparar pedido**: ele cria o identificador só daquele pedido, sem mudar mais nada. Depois disso, o pedido abre normalmente.

_Termos de busca:_ sem identificador registro id nao abre preparar pedido

### Identificador repetido ou inválido

Esses casos não são corrigidos pela tela, para não alterar o pedido errado. Avise o responsável pelo sistema, que faz a conferência e, se preciso, a preparação controlada de todos os pedidos (procedimento no manual de operação).

_Termos de busca:_ identificador repetido invalido migracao responsavel

## Conflito de edição (`ajuda-conflito`)

### “Este pedido mudou em outra sessão”

Outra pessoa (ou outra janela sua) salvou o mesmo pedido depois que você o abriu. Para não apagar o trabalho dela, nada foi gravado.

1. Clique em **Recarregar pedido**.
2. O gerenciador mostra as observações gravadas agora na planilha. O que você digitou continua no campo.
3. Junte as informações, confira as opções e salve de novo.

_Termos de busca:_ conflito edicao outra sessao versao recarregar mudou

### “Outra gravação está em andamento”

Outra pessoa está salvando um pedido neste instante. Aguarde alguns segundos e clique em Salvar de novo; nada foi gravado.

_Termos de busca:_ outra gravacao em andamento aguarde trava ocupada

### “Não foi possível confirmar o salvamento”

A resposta do servidor não chegou ou chegou incompleta, então não dá para saber o que foi gravado. Recarregue o pedido e confira antes de tentar de novo, para não enviar um segundo e-mail.

_Termos de busca:_ nao foi possivel confirmar salvamento parcial recarregar conferir

## Acesso e configuração (`ajuda-acesso`)

### Perfis

- **Consulta**: vê pendentes, concluídos, histórico, detalhes e relatórios.
- **Administrador**: além disso, salva observações, conclui, reabre, avisa alunos e prepara pedidos sem identificador.

Para pedir acesso ou mudar de perfil, fale com o responsável pelo Serviço de Graduação.

_Termos de busca:_ perfil leitor administrador somente consulta pedir acesso

### “Sem acesso” ou “conta não identificada”

O gerenciador confere a conta com que você entrou no navegador. Use a conta institucional @usp.br; se tiver várias contas abertas, abra o gerenciador numa janela em que só ela esteja conectada.

_Termos de busca:_ sem acesso conta nao identificada login usp

### Falha de configuração

Se aparecer que o sistema está sem configuração válida, ou que uma coluna da planilha não foi encontrada, nada foi alterado. Avise o responsável pelo sistema: a correção é feita na configuração ou na planilha, não na tela.

_Termos de busca:_ falha configuracao planilha nao abre erro sistema responsavel

### Faixa “Ambiente de homologação”

Indica uma cópia de testes, ligada a planilhas de teste. Não use essa cópia para atender pedidos reais.

_Termos de busca:_ homologacao faixa teste ambiente

## Menu, abas e aparência (`ajuda-navegacao`)

### Menu lateral ou abas

O gerenciador abre com o **menu lateral**. Use os botões **Menu lateral** e **Abas** para alternar; a escolha vale até você fechar a página. Nas abas, as setas do teclado movem entre as áreas e Enter abre a escolhida.

Em telas estreitas, o menu lateral pode ser recolhido com **Recolher menu**.

_Termos de busca:_ menu lateral abas alternar navegacao teclado setas

### Tema claro, escuro ou do sistema

O seletor de tema no cabeçalho muda as cores. A escolha fica guardada neste navegador e vale também para os outros sistemas GRADIP.

_Termos de busca:_ tema claro escuro sistema aparencia

## Perguntas frequentes (`ajuda-faq`)

### A lista se atualiza sozinha?

Não em tempo real. Cada área é lida quando você a abre e reaproveitada por até um minuto; depois de salvar um pedido, a lista é lida de novo. Para ver na hora o que outra pessoa fez, clique em **Atualizar**.

_Termos de busca:_ atualizar lista sozinha recarregar tempo real

### Um pedido sumiu da lista de pendentes. O que houve?

Provavelmente alguém o concluiu. Procure o aluno pela busca no histórico, na área Concluídos. Pedidos com problema de identificador não somem: aparecem marcados na lista.

_Termos de busca:_ sumiu pedido nao aparece lista

### Como sei se o aviso foi enviado?

No detalhe do pedido, “Aviso por e-mail” mostra a data do envio. Ela só é registrada depois que o envio foi aceito; uma tentativa que falhou não conta como enviada.

_Termos de busca:_ email chegou aluno confirmar enviado

### E se duas pessoas abrirem o mesmo pedido?

A primeira a salvar grava normalmente. A segunda recebe o aviso de conflito e pode recarregar o pedido sem perder o que digitou. **Ver conflito de edição** (→ `ajuda-conflito`).

_Termos de busca:_ duas pessoas mesmo pedido ao mesmo tempo

### Posso editar a planilha diretamente?

Evite. As proteções contra gravação simultânea valem só para quem usa o gerenciador; uma edição direta na planilha pode se cruzar com um salvamento. Se precisar corrigir algo na planilha, avise a equipe antes.

_Termos de busca:_ editar planilha direto manual formulario

### Por que o botão Salvar está desativado?

Ou o seu perfil é de consulta, ou um salvamento ainda está em andamento, ou o pedido não terminou de carregar. **Ver perfis** (→ `ajuda-acesso`).


_Termos de busca:_ botao salvar desativado nao clica

