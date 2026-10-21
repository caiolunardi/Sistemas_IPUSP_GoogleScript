# Manual de operação — Gerenciador de Abertura de Habilitações 2.0

Para a equipe (uso diário) e para quem administra (diagnósticos, migração, recuperação). A versão 2.0 **não está implantada**; este manual vale a partir da implantação. Passo a passo de cada tela: [Central de Ajuda](AJUDA.md).

## 1. Uso diário (equipe)

1. Abrir o gerenciador com a conta `@usp.br` (de preferência numa janela só com ela).
2. Em **Pendentes**, clicar no aluno.
3. Conferir os dados; escrever observações, se houver.
4. Escolher: **Concluir solicitação** e/ou **Avisar aluno por e-mail** (independentes).
5. **Salvar** e confirmar. Esperar o aviso "Pedido salvo" antes de fechar a página.

Situações comuns e o que fazer:

| Mensagem | O que fazer |
|---|---|
| "Este pedido foi alterado em outra sessão…" | **Recarregar pedido**, juntar as observações, salvar de novo. |
| "Outra gravação está em andamento…" | Esperar alguns segundos e salvar de novo. |
| "Esse aluno já foi avisado…" | Confirmar só se quiser mesmo um segundo e-mail. |
| "Um envio anterior… foi interrompido" | Antes de confirmar, se possível, perguntar ao aluno se recebeu. |
| "O pedido foi salvo, mas o e-mail não pôde ser enviado" | Tentar de novo mais tarde; se repetir no mesmo dia, pode ser a cota diária de e-mails da conta. |
| "O e-mail foi enviado, mas não foi possível registrar a data…" ou "…alterado em outra sessão ou na planilha durante o envio…" | **Não reenviar.** Recarregar o pedido, anotar nas observações que o aviso foi enviado (data e hora) e avisar o responsável. |
| Pedido "Sem identificador" | ADMINISTRADOR: **Preparar pedido**. LEITOR: avisar quem administra. |
| "Identificador repetido", "Identificador inválido" ou "Versão inválida" | Avisar o responsável, dizendo qual pedido é (seção 4.2). Não editar as colunas Registro ID e Versão à mão. |
| "Não foi possível conferir o seu acesso" | Tentar em alguns minutos; se continuar, avisar o responsável (seção 3). |

Evite editar a planilha diretamente enquanto alguém usa o gerenciador: a trava do sistema não protege edições manuais.

## 2. Lista de acesso (responsável)

Planilha `PERMISSOES_DE_ACESSO` (pelo `ID_INDEX`), aba `GERENCIADOR_HABILITACOES`: uma linha por pessoa, e-mail completo na coluna C, `LEITOR` ou `ADMINISTRADOR` na coluna E. Mudanças valem em até 1 minuto. Para tirar alguém, apague a linha ou o perfil. Não use coringas nem grupos (são ignorados). Revise a lista quando alguém entrar ou sair da equipe.

## 3. Diagnósticos (editor do Apps Script)

Abrir o projeto, escolher a função na barra e **Executar**; o resultado sai no registro de execução. Nenhum diagnóstico grava na planilha.

| Função | Para quê | Quem pode |
|---|---|---|
| `diagnosticarConfiguracao` | Ambiente, chaves do `ID_INDEX` (nome da planilha, nunca o ID), contagem da lista de acesso. Limpa os caches. | ADMINISTRADOR ou a conta dona do projeto |
| `diagnosticarPlanilha` | Colunas encontradas, títulos de J e K, pendentes/concluídos, valores de situação, reservas de envio, resumo da migração. | ADMINISTRADOR |
| `diagnosticarMigracaoRegistroId` | Simulação da migração e código de confirmação. | ADMINISTRADOR |
| `diagnosticarRecuperacaoRegistro` | Problemas de uma linha (ID, Versão), linhas com o mesmo ID e código de confirmação da recuperação. | ADMINISTRADOR |

Leitura rápida do `diagnosticarConfiguracao`:

- `ambiente: "FALHA: …"` → valor errado em `AMBIENTE`;
- `"FALHA: … não foi encontrada"` → chave ausente no `ID_INDEX`; `"aparece mais de uma vez"` → linha repetida; `"sem ID de Produção/Homologação"` → célula vazia;
- `acesso: "FALHA: … não tem a aba GERENCIADOR_HABILITACOES"` → criar a aba.

## 4. Migração controlada de Registro ID e Versão

### 4.1 Migração em lote

Serve para dar identificador a todos os pedidos de uma vez (por exemplo, na primeira implantação, ou depois de muitas linhas novas) e para corrigir identificadores repetidos. **Não rodar na produção sem autorização expressa do responsável.** Ensaiar antes na cópia de homologação.

1. **Simular**: rodar `diagnosticarMigracaoRegistroId`. Conferir no registro:
   - `colunasFaltando`: títulos que serão criados no fim da linha 1;
   - `semIdentificador`, `identificadoresRepetidos`, `versaoAusente`: quantas linhas mudam, com os números de linha (até 50 de cada); `linhasQueSeraoAlteradas`: total de linhas;
   - `versaoMalformada` e `identificadoresForaDoFormato`: só informados; **não** são alterados pela migração (seção 4.2);
   - `codigoConfirmacao`, por exemplo `MIGRAR-3-1-3-0-9f2c4a7e01b85d36`: os quatro números são as contagens acima e as colunas faltando; o final é a impressão digital do plano.
   Se `precisaMigrar` for `false`, parar: não há nada a migrar (veja só se há linhas para a seção 4.2).
2. **Cópia de segurança**: Arquivo → Fazer uma cópia da planilha de respostas, numa pasta restrita; anotar data e hora.
3. **Confirmar**: Configurações do projeto → Propriedades do script → adicionar `MIGRACAO_REGISTRO_ID_CONFIRMACAO` com o código exato.
4. **Executar**: rodar `executarMigracaoRegistroId`. Ele refaz a simulação dentro da trava e só grava se o código for igual. Grava só as colunas Registro ID e Versão e apaga a propriedade.
5. **Conferir**: rodar `diagnosticarMigracaoRegistroId` de novo (deve dar `precisaMigrar: false`) e abrir o gerenciador.

**O código identifica o plano, não só as quantidades.** A impressão digital cobre as posições das colunas, a última linha e, em cada linha com Nome, a posição, o Nome, o Nº USP, o carimbo, o Registro ID e a Versão como estão e o que será feito nela. Se, entre o passo 1 e o 4, um pedido novo chegar, duas linhas trocarem de lugar, uma linha for substituída por outra ou alguém editar um desses campos, o código muda (mesmo com as mesmas contagens) e **nada é gravado**: voltar ao passo 1. Observações, situação e as outras colunas não entram, para que o trabalho da equipe não invalide o código. Para ter o código estável, faça os passos 1 a 4 em seguida, fora do horário de uso, e evite mexer no Forms nesse intervalo. Só a impressão digital (16 dígitos hexadecimais de um SHA-256) aparece no registro; o conteúdo das células não.

Regras aplicadas: só linhas com Nome; ID vazio recebe um novo; em IDs repetidos, a primeira linha (de cima para baixo) fica com o ID e as seguintes recebem novos; **só Versão vazia** recebe 1. Diferença da 1.0: a 1.0 também punha 1 em Versão `0` ou de texto, sem avisar; a 2.0 informa essas linhas e não as altera, porque o valor pode ter sido digitado por alguém. A aba `2021 - 2022` não é tocada. Rodar de novo não muda nada.

Se a primeira ocorrência de um ID repetido não for a que deve ficar com ele, não use a migração para esse caso: use a recuperação (4.2), que deixa escolher a linha.

Desfazer: restaurar a planilha pelo histórico de versões (Arquivo → Histórico de versões) para o momento anterior ao passo 4, ou copiar de volta as duas colunas da cópia de segurança.

### 4.2 Recuperação de um pedido (um por vez)

Para os casos que nem a tela nem a migração corrigem: **ID fora do formato**, **ID repetido** quando é preciso escolher qual pedido fica com ele, **Versão malformada** (`0`, negativa, fracionária, texto) e, se preferir, Versão vazia. Nada é corrigido automaticamente: a decisão é sua, uma linha por vez, e a ferramenta só altera a linha escolhida. **Não rodar na produção sem autorização expressa do responsável.**

O Registro ID só é usado dentro do gerenciador (nenhum outro sistema guarda ou lê esse valor; o Painel dos servidores conta pela coluna K). Por isso, dar um ID novo a uma linha não desfaz vínculo com outro sistema. Mesmo assim, o ID antigo fica só no histórico de versões e na cópia de segurança: anote-o no registro abaixo antes de executar.

1. **Escolher a linha**: na planilha (aba `Respostas ao formulário 2`), ache o pedido pelo nome e anote o número da linha. Em ID repetido, compare as linhas com o mesmo ID (carimbo, Nº USP, observações, situação) e decida **qual** recebe o ID novo; as outras mantêm o atual. Em caso de dúvida sobre qual é o pedido "verdadeiro", pare e consulte a equipe que atendeu.
2. **Diagnosticar**: Propriedades do script → criar `RECUPERACAO_REGISTRO` com o número da linha (por exemplo, `12`) → rodar `diagnosticarRecuperacaoRegistro`. Nada é gravado. O registro mostra:
   - `problemas`: `SEM_IDENTIFICADOR`, `IDENTIFICADOR_FORA_DO_FORMATO`, `IDENTIFICADOR_REPETIDO`, `VERSAO_AUSENTE`, `VERSAO_MALFORMADA`;
   - `acoes`: `NOVO_ID` (um UUID novo, que não existe na coluna) e/ou `VERSAO_1` (Versão passa a 1); vazio = nada a fazer;
   - `linhasComOMesmoIdentificador`: as outras linhas do grupo, que **não** serão alteradas;
   - `codigoConfirmacao`, por exemplo `RECUPERAR-12-4b0e…` (16 dígitos no fim).
3. **Registrar a decisão** (tabela abaixo) e fazer a cópia de segurança, se ainda não houver uma do dia.
4. **Confirmar**: trocar o valor de `RECUPERACAO_REGISTRO` pelo código exato.
5. **Executar**: rodar `executarRecuperacaoRegistro`. Ele refaz o diagnóstico dentro da trava e só grava se o código for igual. A impressão digital cobre a linha inteira e as outras linhas do mesmo ID: se qualquer uma mudou depois do passo 2 (inclusive observações ou situação daquela linha), nada é gravado; volte ao passo 2. Se bater, grava no máximo duas células (Registro ID e Versão) daquela linha e apaga a propriedade. O resultado traz `novoRegistroId`.
6. **Conferir**: rodar o diagnóstico de novo para a mesma linha (deve dar `acoes: []`), abrir o pedido no gerenciador e completar o registro.

Por que Versão 1 é segura: com a Versão malformada, ninguém consegue abrir nem salvar o pedido (o gerenciador recusa), então não há página aberta com uma versão antiga que possa gravar por cima.

**Registro das recuperações** (guarde fora do repositório, junto das cópias de segurança; tem dados pessoais):

| Data e hora | Quem executou | Linha | Pedido (nome) | Problemas | Ações | ID anterior | ID novo | Motivo da escolha (em ID repetido) | Código usado |
|---|---|---|---|---|---|---|---|---|---|

Rastros que a ferramenta deixa sozinha: o registro de execução do Apps Script (conta que rodou, data, linha, problemas, ações e código; sem nomes nem valores das células) e o histórico de versões da planilha (células alteradas e valores anteriores).

Desfazer: copiar de volta as duas células pelo histórico de versões ou pela cópia de segurança (o pedido volta a ficar marcado e sem abrir). Quem estava com o gerenciador aberto só precisa recarregar a lista: antes da recuperação, o pedido não abria.

## 5. Cópia de segurança e restauração

- Antes de qualquer migração, implantação ou mudança de estrutura (Forms, colunas): Arquivo → Fazer uma cópia, numa pasta restrita (a cópia tem dados pessoais).
- O histórico de versões da planilha guarda as alterações; para restaurar uma célula ou uma linha, prefira copiar do histórico em vez de restaurar a planilha inteira (que desfaz também o que outras pessoas fizeram depois).
- Apagar as cópias quando não forem mais necessárias. Prazo de guarda: A VALIDAR INSTITUCIONALMENTE.

## 6. Voltar à 1.0

Ver [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás).

## 7. Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| "A coluna J (Observações)/K (Situação) está ocupada por…" | Uma pergunta foi acrescentada ou movida no Forms e as colunas andaram. | Não usar o gerenciador. Restaurar as colunas para J e K (mover a coluna nova para o fim da planilha), conferir com `diagnosticarPlanilha`. |
| "Não encontrei a coluna …" | Pergunta do Forms renomeada; título da linha 1 mudou. | Voltar o título ao texto exato (ver [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md)) ou mudar `CABECALHOS` em `Planilha.gs` num PR. |
| "A aba … tem título repetido" | Duas colunas com o mesmo título. | Renomear ou remover a duplicada. |
| Pendentes no gerenciador ≠ número do Painel dos servidores | Critérios diferentes: o painel só conta K = `pendente` ([contrato](REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas)). | Esperado enquanto houver pedidos com K vazia. Decisão pendente. |
| Pedidos novos sempre "Sem identificador" | Não há gatilho que atribua ID às respostas novas (a 1.0 atribuía ao abrir a página). | **Preparar pedido** um a um, ou a migração (seção 4). |
| Ninguém consegue entrar | Lista de acesso ilegível, propriedade ou chave faltando. | `diagnosticarConfiguracao`. |
| "Conta não identificada" para uma pessoa da equipe | Conta de outro domínio, ou várias contas no navegador. | Janela só com a conta `@usp.br`. |
| E-mails falhando o dia todo | Cota diária de e-mails da conta que implantou. | Esperar o dia seguinte; avisar alunos por outro canal se for urgente. |
| Reserva de envio presa | Execução interrompida durante o envio. | Depois de 10 minutos, o gerenciador pede confirmação para reenviar; confirme com o aluno se recebeu. |
