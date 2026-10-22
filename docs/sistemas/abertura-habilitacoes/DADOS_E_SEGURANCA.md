# Dados e segurança — Gerenciador de Abertura de Habilitações

Preenchido a partir do código da 2.0 (21/10/2026), revisto para a 2.1 (22/10/2026, auditoria), segundo [`SYSTEM_SECURITY_TEMPLATE.md`](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md). Não contém IDs reais nem dados pessoais. Este documento descreve controles técnicos; não afirma conformidade legal.

## 1. Escopo

- Sistema: Gerenciador de Abertura de Habilitações (Web App da equipe do Serviço de Graduação, IPUSP).
- Público: equipe do Serviço de Graduação.
- Ambiente: a 2.0 está em produção desde 21/10/2026 (homologação parcial). A 2.1 está só no repositório.
- Responsável funcional: Serviço de Graduação (A VALIDAR INSTITUCIONALMENTE o nome do responsável).
- Última revisão: 21/10/2026, versão 2.0, só de código e testes com dados sintéticos. A planilha real, a configuração real do projeto e a implantação em uso não foram abertas.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Pedido do aluno | nome, Nº USP, e-mail USP, e-mail do formulário, ano de ingresso, trancamento, habilitação pedida, data | atender o pedido | Google Forms | página da equipe (só quem tem perfil) | planilha de respostas | Pessoal |
| Andamento | observações da equipe, situação, data de conclusão, data do aviso | registrar o atendimento | equipe | planilha de respostas; página | grava | Pessoal (as observações podem conter qualquer texto) |
| Identificação técnica | Registro ID (UUID), Versão | achar o pedido, concorrência | gerenciador | planilha; página | grava | Interna |
| Histórico 2021–2022 | mesmos campos do pedido | consulta e relatórios | aba antiga | página (busca) e contagens | só leitura | Pessoal |
| Aviso ao aluno | primeiro nome, habilitação, e-mail | avisar a abertura | planilha | e-mail do aluno (`MailApp`) | caixa de saída da conta que implantou | Pessoal |
| Lista de acesso | e-mail institucional, perfil, nome (B) e observação (D) | autorizar; identificar quem acessou (2.1) | aba `GERENCIADOR_HABILITACOES` | só servidor (cache 60 s); a página recebe só o perfil, o nome e a observação **de quem abriu** | não grava na aba; nome e perfil vão para a auditoria | Pessoal (institucional) |
| Conta de quem usa | e-mail `@usp.br` | conferir a lista; auditoria | `Session.getActiveUser()` | só servidor | auditoria (2.1) | Pessoal |
| Auditoria (2.1) | quem, quando, área, navegador, ação; Registro ID do pedido; antes e depois das células gravadas (inclui o texto das observações); termos de busca; resultado do e-mail (sem o endereço) | rastrear o atendimento | servidor e página | planilha `AUDITORIA_ABERTURA_HABILITACOES` | só acrescenta; nada é apagado automaticamente | Pessoal ([AUDITORIA.md](AUDITORIA.md)) |
| Aparência | `system`/`light`/`dark` | tema | navegador | `localStorage["gradip-theme"]` | navegador | Não pessoal |

Até a 2.0, o gerenciador não registrava quem salvou cada pedido (a 1.0 também não). A 2.1 registra ([AUDITORIA.md](AUDITORIA.md)): nome, Nº USP e e-mail do aluno não são copiados para a auditoria; os termos de busca e o texto das observações são, por escolha confirmada pelo responsável em 22/10/2026.

Base legal e retenção: A VALIDAR INSTITUCIONALMENTE.

## 3. Recursos externos

| Nome lógico | Tipo | Onde está o ID | Público? | Permissão esperada |
|---|---|---|---|---|
| Planilha de respostas | Sheets | chave `ABERTURA_HABILITACOES` no `ID_INDEX` | Não | leitura e escrita pela conta que executa |
| Planilha de permissões | Sheets | chave `PERMISSOES_DE_ACESSO`; aba `GERENCIADOR_HABILITACOES` | Não | leitura pela conta que executa |
| Índice mestre | Sheets | Script Property `ID_INDEX_SPREADSHEET_ID` | Não | leitura |
| Planilha da auditoria (2.1) | Sheets | chave `AUDITORIA_ABERTURA_HABILITACOES` (produção e homologação em planilhas diferentes) | Não | escrita pela conta que executa; aberta só pela conta institucional do Serviço de Graduação |
| Gatilho diário (2.1) | `ScriptApp` | criado por `prepararAuditoriaHabilitacoes` | — | consolida a auditoria às 2h |
| E-mail | `MailApp` | — | — | envio pela conta que executa (cota diária da conta) |
| Marca USP do tema claro | imagem externa | `GradipMarcaUSP.html` (servidor do IP) | Sim | — |

Nenhum ID fica no código, na documentação, nos testes ou nos commits. A 1.0 tinha o ID da planilha numa constante; a cópia guardada para os testes tem essa linha trocada por um marcador. Ícones e scripts vêm embutidos (sem CDN).

## 4. Web App

- Quem pode acessar: `DOMAIN` (**Qualquer pessoa da USP**) no `appsscript.json`, decisão do responsável ao implantar em 21/10/2026. A implantação só deixa a pessoa chegar à página; o acesso aos dados depende da aba `GERENCIADOR_HABILITACOES`, conferida no servidor a cada chamada. O teste com outra conta da equipe cadastrada passou logo depois da publicação ([registro](HOMOLOGACAO.md#registro)).
- Executa como: `USER_DEPLOYING`. Toda leitura, gravação e e-mail sai da conta de quem implantou.
- Identidade: só `Session.getActiveUser()`. Com "Executar como: eu", o e-mail só vem preenchido para contas do mesmo domínio de quem implantou; vazio = acesso negado. `Session.getEffectiveUser()` nunca autoriza (só identifica a conta dona do projeto em `diagnosticarConfiguracao`).
- Autorização no servidor (`Acesso.gs`): toda função pública começa com `exigirLeitor_()` ou `exigirAdministrador_()`, **antes** de abrir a planilha de respostas. Vale para chamadas diretas a `google.script.run`, não só para os botões. O teste "funções públicas são exatamente…" impede função nova sem guarda.
  - LEITOR: listas, busca, detalhe, relatórios.
  - ADMINISTRADOR: além disso, salvar, concluir, reabrir, avisar, preparar pedido, diagnósticos e migração.
  - Fora da lista, perfil vazio ou desconhecido: `SEM_ACESSO`. Lista ilegível, sem a aba ou com títulos errados: `ACESSO_INDISPONIVEL` (fica fechado).
  - Perfis são proposta técnica; quem decide a lista e o que cada perfil faz é o responsável.
- Dados enviados ao cliente: só os campos do pedido que a tela mostra, como texto. Nenhum ID de planilha, nenhuma lista de acesso, nenhum e-mail de outra pessoa da equipe. Na página sem acesso, nenhum dado.
- Entrada da página: Registro ID conferido pelo formato UUID; Versão inteira ≥ 1; observações texto com limite; termo de busca até 100 caracteres; referência de "Preparar pedido" conferida contra a linha. Booleanos só valem se forem `true` de fato.
- Saída na página: dados da planilha só por `textContent` (inclusive o nome e a observação do cabeçalho, que chegam num JSON com `<` escapado); mensagens de erro técnicas viram texto genérico.

## 5. Configuração

Script Properties (valores fora do Git):

```text
ID_INDEX_SPREADSHEET_ID            ID da planilha ID_INDEX
AMBIENTE                           vazio/producao, ou homologacao (cópia de testes)
MIGRACAO_REGISTRO_ID_CONFIRMACAO   só durante a migração controlada
RECUPERACAO_REGISTRO               só durante a recuperação de um pedido (número da linha, depois o código)
```

Os códigos de confirmação (`MIGRAR-…`, `RECUPERAR-…`) terminam com 16 dígitos hexadecimais de um SHA-256 calculado sobre o plano, que inclui Nome, Nº USP e carimbo das linhas envolvidas. Só esse trecho do resumo sai do servidor; com 64 bits e muitas linhas misturadas, ele não permite reconstruir os dados, mas também não é um segredo: serve para conferir que o plano não mudou, não para proteger nada.

Falha fechada: propriedade ausente, chave ausente, repetida, sem ID, de outro tipo, ou `AMBIENTE` desconhecido param o sistema. Em homologação, uma chave sem ID de homologação **não** cai na produção. Mensagens citam nomes de chaves, nunca IDs; `semIds_` ainda remove textos com cara de ID das mensagens do Google.

## 6. Logs

- Registram contagens, números de linha e o tipo de falha. `textoParaLog_` remove IDs, e-mails e números longos (Nº USP) das mensagens de erro.
- A 1.0 registrava nomes de alunos (migração, pendentes sem ID, diagnóstico). A 2.0 não; conferido pelo teste "registros de execução sem nomes…", que inclui a migração e a recuperação.
- Migração e recuperação registram números de linha, contagens, problemas, ações e o código; nunca o conteúdo das células (nem o ID antigo de uma linha recuperada, que pode ter sido digitado à mão). O ID antigo fica no histórico de versões da planilha e no registro manual do responsável ([manual](MANUAL_OPERACAO.md#42-recuperação-de-um-pedido-um-por-vez)), guardado fora do repositório.
- "E-mail enviado sem registro" é registrado como aviso, sem destinatário.
- O console do navegador não recebe dados pessoais (conferido no teste de navegador).

## 7. Compartilhamento e acesso

- Planilha de respostas: a conta que implanta precisa editar. Quem tem acesso direto à planilha vê tudo e pode editar fora do gerenciador; a lista do gerenciador não restringe isso. Revisão do compartilhamento: A VALIDAR.
- Planilha de permissões: quem edita a aba `GERENCIADOR_HABILITACOES` decide quem entra; manter essa edição restrita ao Serviço de Graduação. Desde a 2.1, o nome e a observação dessa aba aparecem no cabeçalho para a própria pessoa: não escrever ali nada que ela não deva ver.
- Planilha da auditoria (2.1): **não compartilhar**. Só a conta institucional do Serviço de Graduação; tem nomes da equipe, termos de busca e o texto das observações. Editores do projeto Apps Script podem rodar as funções de manutenção, mas não alteram linhas gravadas sem que `verificarIntegridadeAuditoria` aponte.
- Projeto Apps Script: editores veem as Script Properties e podem rodar a migração.
- Cópia de homologação: planilha de respostas de testes **com dados fictícios** e, se possível, uma cópia da planilha de permissões só com as contas de teste.

## 8. Dados de teste

`testes/` usa dados sintéticos: nomes inventados, e-mails `.invalid`, Nº USP 9000xxx, IDs de planilha sem formato de ID do Google. A cópia da 1.0 em `testes/baseline/` tem o ID trocado por marcador. As capturas em `evidencias/2.0/` têm só dados fictícios.

## 9. Pontos institucionais

- Finalidade: atender os pedidos de abertura de habilitação.
- Base legal, retenção da aba atual e da aba 2021–2022, e quem pode ver o histórico: A VALIDAR INSTITUCIONALMENTE.
- Rastreabilidade: a 2.1 registra quem concluiu, reabriu, avisou, preparou, migrou ou recuperou, com antes e depois ([AUDITORIA.md](AUDITORIA.md)), na planilha da chave `AUDITORIA_ABERTURA_HABILITACOES`, criada pelo responsável em 22/10/2026. Prazo de guarda da auditoria: A VALIDAR INSTITUCIONALMENTE.
- Texto do e-mail: herdado da 1.0, não aprovado formalmente.
- Compartilhamentos externos: nenhum identificado além do e-mail ao próprio aluno.

## 10. Incidentes

Seguir [`docs/seguranca/INCIDENTES.md`](../../seguranca/INCIDENTES.md). Medidas específicas:

- acesso indevido: tirar a linha da aba `GERENCIADOR_HABILITACOES` (vale em até 1 minuto) ou mudar a implantação para "Somente eu";
- alteração indevida de pedidos: restaurar pela versão da planilha (**Arquivo → Histórico de versões**), depois de anotar o que mudou;
- e-mail em duplicidade ou errado: o gerenciador não desfaz envios; avisar o aluno pelo canal da equipe.

## 11. Exceções

- (1.0, substituída em 21/10/2026) ID da planilha no código, sem autorização no servidor, nomes no registro. Corrigidos na 2.0. A versão 5 da implantação (1.0) continua disponível para a volta, nas condições de [INSTALACAO_E_ATUALIZACAO.md §5](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás).

## 12. Homologação

Checklist técnico: sem IDs, sem dados pessoais, sem segredos no Git, autorização em toda função pública, falha fechada, logs sem dados pessoais. Falta conferir no Google, com a cópia de homologação ([HOMOLOGACAO.md](HOMOLOGACAO.md)): identidade com "Executar como: eu" para contas da equipe, lista de acesso, envio de e-mail com prefixo, migração na cópia.
