# Proposta: autorização no servidor para a leitura nas ferramentas da equipe

> **"Somente eu" é contenção, não solução.** Enquanto a implantação estiver em "Quem pode acessar: somente eu", só a conta institucional chama essas funções. Isso protege **por configuração**, que qualquer editor do projeto pode mudar num clique e sem revisão. Não existe hoje, no código, nenhuma barreira de **leitura** entre quem abre a página e os dados (a gravação da Comunidade já confere a conta; o Gerenciador não confere nada). A configuração real não foi conferida por agente: o que está escrito aqui sobre ela é o que o responsável informou em 20/10/2026.

**Situação:** NÃO IMPLEMENTADO / DEPENDE DE DECISÃO. Classe de risco **crítica** ([fluxo](../../governanca/FLUXO_DE_MUDANCAS.md#3-classificação-de-risco)): muda autorização e tratamento de dados pessoais. Nada aqui foi aplicado ao código nem ao Google.

Sistemas: **Comunidade IPUSP** (`sistemas/busca-alunos`) e **Gerenciador de Trancamento Total** (`sistemas/trancamento-total/gerenciador`). Achados S1 e S2 do [diagnóstico](../../governanca/DIAGNOSTICO_2026-10-20.md).

## 1. Comportamento atual

| Sistema | Funções públicas sem conferência da conta | O que devolvem ou fazem |
|---|---|---|
| Comunidade IPUSP | `listarComunidadeParaBusca`, `listarAlunosParaBusca` | nº USP, nome, ingresso e e-mails de **todos** os alunos; nome, nº USP, e-mails e setor de todos os docentes e servidores |
| | `obterFicha`, `obterFichaAluno` | todas as colunas com título de uma linha (inclui a pasta do Drive), para qualquer linha cujo nome e nº USP o chamador informe, o que a lista acima fornece |
| | `gerarPdfListaAlunos` | monta PDF só com o que a página manda; não lê planilha (não é caminho de vazamento, mas aceita qualquer chamador) |
| | `salvarFicha`, `salvarFichaAluno` | gravam; **já conferem** a conta (`usuarioPodeEditar_`: editor ou dono da planilha daquele cadastro; sem e-mail identificado, recusa) |
| | `diagnosticarComunidadeIPUSP` | feita para rodar no editor, mas é pública (sem `_` no fim): qualquer chamador a dispara pela página. Só escreve no log de execuções (nomes de abas e colunas), sem devolver dado |
| Gerenciador | `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `buscarHistorico`, `obterRelatorio` | nome, nº USP, e-mails, ano de ingresso e **justificativa** (texto livre que pode conter dados de saúde) de pedidos de trancamento |
| | `salvarPedido` | marca pedido como concluído e pode **enviar e-mail ao aluno** pela conta institucional; confere só a versão da linha (evita sobrescrever outra pessoa), não quem chama |
| | `diagnosticarPlanilha` | como acima: pública, escreve cabeçalhos e contagens no log |

A gravação da Comunidade IPUSP já confere a conta (`usuarioPodeEditar_`: editor da planilha daquele cadastro). O Gerenciador não lê a conta em nenhuma função.

**Implantação (informada pelo responsável em 20/10/2026):** nos dois, "Executar como: eu (conta institucional)" e "Quem pode acessar: somente eu". Se for isso, só a conta institucional abre as páginas e chama as funções, e não há exposição hoje. A tela de implantação não foi conferida por agente.

## 2. O risco

A fronteira de acesso hoje é **uma opção da implantação**, não o código. Se alguém, para dar acesso a um colega, mudar "Quem pode acessar" para o domínio ou um grupo, com "Executar como: eu":

- qualquer conta com acesso recebe o cadastro inteiro da Comunidade IPUSP e pode ler qualquer ficha, mesmo sem acesso às planilhas;
- qualquer conta com acesso lê as justificativas de trancamento e pode concluir pedidos e mandar e-mail aos alunos em nome do Serviço de Graduação;
- a chamada pode ser feita direto por `google.script.run` no console do navegador, sem usar a tela, então esconder botões não protege.

Condição de exploração: acesso aberto além da conta institucional. Contenção atual: manter "somente eu".

## 3. Proposta

Reaproveitar o padrão que já está em uso e homologado no [Painel dos servidores](../../sistemas/painel-servidores/DADOS_E_SEGURANCA.md#4-web-app) (`AcessoPainel.gs`): uma lista nominal numa aba, lida pelo `ID_INDEX`, e uma guarda chamada na **primeira linha de cada função pública**.

1. **Lista de quem pode usar.** Uma aba por sistema na planilha de permissões que o painel já usa (chave `PERMISSOES_DE_ACESSO`), por exemplo `COMUNIDADE_IPUSP` e `GERENCIADOR_TRANCAMENTO_TOTAL`, com e-mail e perfil (`LEITOR`, `ADMINISTRADOR`). Quem decide o conteúdo é o responsável.
2. **Guarda no servidor.** `exigirAcesso_()` lê `Session.getActiveUser().getEmail()`; sem e-mail identificado ou fora da lista, lança "sem acesso" e não lê nenhum cadastro. `exigirAdmin_()` para o que grava ou envia e-mail.
3. **Por operação:**

   | Função | Perfil mínimo |
   |---|---|
   | Comunidade: listar, ficha, PDF | `LEITOR` |
   | Comunidade: `salvarFicha` | a regra atual (editor da planilha) **e** estar na lista |
   | Gerenciador: listas, detalhe, histórico, relatório | `LEITOR` |
   | Gerenciador: `salvarPedido` (concluir, avisar aluno) | `ADMINISTRADOR` |

4. **`doGet`** mostra uma página de "sem acesso" (como `PainelSemAcesso.html`) sem nenhum dado, para quem não está na lista.
5. **Menor envio de dados (opcional, decisão separada):** na Comunidade, a busca hoje é feita no navegador sobre a lista inteira. Mover a busca para o servidor (devolver só os resultados, com limite) reduz o que cada sessão recebe, mas muda o desempenho e a tela. Fica como segunda etapa, só se o responsável quiser.

O que **não** muda: nomes das funções públicas e chamadas `google.script.run`, colunas lidas, regras de gravação, texto e envio do e-mail, telas (exceto a página de sem acesso).

### 3.1 Identidade e lista: quatro situações, uma só que libera

Com "Executar como: eu", o script roda com a conta institucional, e `Session.getEffectiveUser()` é sempre ela: **nunca** use o usuário efetivo para autorizar. Quem chama é `Session.getActiveUser().getEmail()`. Segundo a documentação do Apps Script, esse e-mail só vem preenchido quando quem acessa é do mesmo domínio Google Workspace da conta dona; de fora (conta pessoal, outro domínio), vem vazio. Comportamento a confirmar no `/dev` na homologação.

| Situação | Como reconhecer | Resposta |
|---|---|---|
| autorizado | e-mail não vazio, normalizado (minúsculas, sem espaços), presente na aba do sistema com perfil válido | segue, com o perfil lido da aba |
| não autorizado | e-mail não vazio, ausente da aba, ou com perfil desconhecido | erro `SEM_ACESSO`; página de sem acesso |
| identidade indisponível | e-mail vazio | erro `SEM_IDENTIFICACAO`, tratado **como negado** (nunca como "talvez seja o dono") |
| lista indisponível | a planilha de permissões não abre, a aba não existe ou está vazia | erro `ACESSO_INDISPONIVEL`, **negado** (falha fechada); o log registra só o código, sem e-mail |

A guarda é a primeira linha de cada função pública, **antes** de abrir qualquer cadastro ou planilha de respostas. As funções `diagnosticar…` também passam por ela (perfil `ADMINISTRADOR`) ou viram privadas.

### 3.2 Contra escalonamento de privilégio

- O perfil vem **só** da aba, lida no servidor. Nenhum parâmetro vindo da página (`perfil`, `admin`, e-mail) é considerado.
- Entradas válidas são e-mails completos. Linhas com domínio inteiro (`*@usp.br`), grupo ou texto livre são ignoradas e contam como erro de configuração no diagnóstico (grupos não são resolvidos pelo `getEditors()`, e coringas abririam o acesso sem decisão nominal).
- Perfis fechados: `LEITOR` e `ADMINISTRADOR`. Qualquer outro valor nega.
- A planilha de permissões só é **editável** pelo responsável; os demais não precisam nem de leitura (o script lê com a conta institucional).
- No Gerenciador, `salvarPedido` exige `ADMINISTRADOR` **e** mantém a conferência de versão e a reserva `ENVIANDO…`. O destinatário do e-mail continua vindo da planilha, nunca da página.
- Na Comunidade, a gravação exige estar na lista **e** a regra atual (editor da planilha). As duas condições, não uma ou outra.

### 3.3 Menos dados por chamada (contra extração em massa)

Hoje a Comunidade manda a lista inteira (nº USP, nome, e-mails de todos) a quem abre a página, e a busca é feita no navegador. Mesmo com a guarda, um leitor autorizado leva tudo de uma vez. Para a etapa 2 (decisão separada, porque muda a tela e o desempenho):

| Hoje | Proposta |
|---|---|
| `listarComunidadeParaBusca` devolve todos os registros com e-mails | `buscarComunidade(termo)` no servidor: termo com pelo menos 3 caracteres, até 50 resultados, só nome, nº USP e cadastro; e-mail só na ficha |
| `obterFicha` devolve todas as colunas com título, incluindo a pasta do Drive | lista explícita de campos por cadastro; a pasta do Drive só para `ADMINISTRADOR` |
| sem registro de leitura | contagem diária de buscas e fichas abertas por pessoa no log de execuções (sem o termo nem a ficha), para notar uso fora do padrão |

No Gerenciador, a justificativa (que pode trazer dado de saúde) só no detalhe do pedido, como hoje, e não nas listas e relatórios.

## 4. Testes exigidos (dados fictícios)

Em `testar_backend.js` de cada sistema, com o Apps Script simulado (`Session.getActiveUser` falso, planilhas falsas, e-mails `@example.invalid`):

| Caso | Esperado |
|---|---|
| conta `LEITOR` | lê; `salvar…` e `diagnosticar…` recusados; nenhum e-mail enviado |
| conta `ADMINISTRADOR` | lê e grava |
| conta fora da lista | **toda** função pública (lista gerada a partir do próprio `Codigo.gs`, para uma função nova não escapar) lança `SEM_ACESSO`, e o simulador registra que **nenhuma** planilha de cadastro ou de respostas foi aberta |
| e-mail vazio | `SEM_IDENTIFICACAO`, mesmo efeito |
| planilha de permissões ausente, aba vazia, perfil inválido, linha `*@usp.br` | negado (`ACESSO_INDISPONIVEL` ou `SEM_ACESSO`) |
| e-mail com maiúsculas ou espaços na aba | reconhecido (normalização) |
| parâmetro forjado (`{perfil:'ADMINISTRADOR'}` no pedido) | ignorado |
| chamada direta a cada função, fora da tela | mesmas respostas |
| `doGet` sem acesso | HTML sem nenhum nº USP, nome ou e-mail dos dados de teste |
| Gerenciador, `LEITOR` chamando `salvarPedido` | recusado antes de reservar a linha; planilha intacta; nenhum e-mail |

Teste de tela: a página de sem acesso nos três temas e em 360 px. Homologação no `/dev` com duas contas reais: a institucional e uma da equipe **fora** da lista (conferir a recusa), sem abrir o acesso da implantação.

## 5. Transição, abertura e recuperação

1. Implementar num ramo, com os testes; PR de classe crítica com parecer de revisão independente.
2. Criar as abas de permissão e preencher (responsável).
3. `clasp push` para o editor e conferir no `/dev` com a conta institucional e com uma conta fora da lista (responsável).
4. Nova versão da implantação, **mantendo "somente eu"** até a conferência terminar. Só depois, se desejado, abrir o acesso.
5. **Antes de abrir o acesso a outra conta**, todos estes itens: guarda em toda função pública com os testes acima verdes; aba de permissões preenchida e revisada; homologação negativa feita; `DADOS_E_SEGURANCA.md` do sistema atualizado (seção 4: quem acessa, autorização por operação); decisão registrada no PR; o manifesto (`appsscript.json`) versionado, para a mudança de acesso aparecer num diff. Abrir para o **domínio** só com a guarda já em produção; nunca para "qualquer pessoa".
6. **Voltar atrás:** em Gerenciar implantações, voltar a implantação para a versão anterior. Como a implantação continua "somente eu", voltar não expõe nada.

## 6. Decisão pedida ao responsável

- Aprovar a abordagem (lista nominal na planilha de permissões) ou escolher outra: "Executar como: usuário que acessa" (a permissão da planilha vira a fronteira, mas cada pessoa precisa de acesso direto aos cadastros e às respostas, e o envio de e-mail sairia da conta de cada um) ou manter "somente eu" indefinidamente e registrar isso como a decisão.
- Prioridade: hoje não há urgência; é **pré-requisito** para abrir qualquer um dos dois a outra conta.
