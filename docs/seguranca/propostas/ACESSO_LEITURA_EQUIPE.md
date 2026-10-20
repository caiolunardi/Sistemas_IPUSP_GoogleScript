# Proposta: autorização no servidor para a leitura nas ferramentas da equipe

**Situação:** NÃO IMPLEMENTADO / DEPENDE DE DECISÃO. Classe de risco **crítica** ([fluxo](../../governanca/FLUXO_DE_MUDANCAS.md#3-classificação-de-risco)): muda autorização e tratamento de dados pessoais. Nada aqui foi aplicado ao código nem ao Google.

Sistemas: **Comunidade IPUSP** (`sistemas/busca-alunos`) e **Gerenciador de Trancamento Total** (`sistemas/trancamento-total/gerenciador`). Achados S1 e S2 do [diagnóstico](../../governanca/DIAGNOSTICO_2026-10-20.md).

## 1. Comportamento atual

| Sistema | Funções públicas sem conferência da conta | O que devolvem ou fazem |
|---|---|---|
| Comunidade IPUSP | `listarComunidadeParaBusca`, `listarAlunosParaBusca` | nº USP, nome, ingresso e e-mails de **todos** os alunos; nome, nº USP, e-mails e setor de todos os docentes e servidores |
| | `obterFicha`, `obterFichaAluno` | todas as colunas com título de uma linha (inclui a pasta do Drive), para qualquer linha cujo nome e nº USP o chamador informe, o que a lista acima fornece |
| | `gerarPdfListaAlunos` | monta PDF só com o que a página manda; não lê planilha (não é caminho de vazamento, mas aceita qualquer chamador) |
| Gerenciador | `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `buscarHistorico`, `obterRelatorio` | nome, nº USP, e-mails, ano de ingresso e **justificativa** (texto livre que pode conter dados de saúde) de pedidos de trancamento |
| | `salvarPedido` | marca pedido como concluído e pode **enviar e-mail ao aluno** pela conta institucional |

A gravação da Comunidade IPUSP já confere a conta (`usuarioPodeEditar_`: editor da planilha daquele cadastro). O Gerenciador não lê a conta em nenhuma função.

**Implantação (informada pelo responsável em 20/10/2026):** nos dois, "Executar como: eu (conta institucional)" e "Quem pode acessar: somente eu". Só a conta institucional abre as páginas e chama as funções. **Hoje não há exposição.**

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

## 4. Testes exigidos (dados fictícios)

Em `testar_backend.js` de cada sistema, com o Apps Script simulado:

- conta na lista como `LEITOR`: lê; não grava nem envia e-mail;
- conta `ADMINISTRADOR`: lê e grava;
- conta fora da lista: **toda** função pública lança "sem acesso" e nenhuma planilha de cadastro ou de respostas é aberta;
- sem e-mail identificado (`getActiveUser()` vazio): igual a fora da lista;
- chamada direta de cada função pública (não só pela tela);
- `doGet` de conta sem acesso não inclui dado nenhum no HTML.

Teste de tela: a página de sem acesso nos três temas e em 360 px.

## 5. Transição e recuperação

1. Implementar num ramo, com os testes; PR de classe crítica com parecer de revisão independente.
2. Criar as abas de permissão e preencher (responsável).
3. `clasp push` para o editor e conferir no `/dev` com a conta institucional e com uma conta fora da lista (responsável).
4. Nova versão da implantação, **mantendo "somente eu"** até a conferência terminar. Só depois, se desejado, abrir o acesso.
5. **Voltar atrás:** em Gerenciar implantações, voltar a implantação para a versão anterior. Como a implantação continua "somente eu", voltar não expõe nada.

## 6. Decisão pedida ao responsável

- Aprovar a abordagem (lista nominal na planilha de permissões) ou escolher outra: "Executar como: usuário que acessa" (a permissão da planilha vira a fronteira, mas cada pessoa precisa de acesso direto aos cadastros e às respostas, e o envio de e-mail sairia da conta de cada um) ou manter "somente eu" indefinidamente e registrar isso como a decisão.
- Prioridade: hoje não há urgência; é **pré-requisito** para abrir qualquer um dos dois a outra conta.
