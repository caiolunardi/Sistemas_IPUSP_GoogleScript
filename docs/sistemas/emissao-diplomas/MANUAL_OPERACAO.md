# Manual de operação — Gerenciador de Colação de Grau e Diplomas 4.0

Nada aqui é feito por agente de IA sem ordem explícita do responsável para aquela ação ([fluxo de mudanças](../../governanca/FLUXO_DE_MUDANCAS.md)). O `clasp push` é rodado pelo responsável.

## 1. Configuração dos projetos autônomos (uma vez)

Em **Configurações do projeto → Propriedades do script** de cada projeto:

| Propriedade | PRODUÇÃO | HOMOLOGACAO |
|---|---|---|
| `ID_INDEX_SPREADSHEET_ID` | ID do `ID_INDEX` | ID do `ID_INDEX` |
| `AMBIENTE` | (não criar) | `homologacao` |
| `HISTORICO_CHAVE_ASSINATURA_SESSAO` | criada sozinha na primeira análise de histórico | idem |

O responsável informou em 05/11/2026 que `ID_INDEX_SPREADSHEET_ID` e `AMBIENTE` já estão configurados. A chave de assinatura é própria de cada projeto: uma análise de histórico que estivesse aberta no projeto vinculado na hora da troca precisa ser refeita.

No `ID_INDEX` (colunas "ID de Produção" e "Homologação"), o app usa: `EMISSAO_DIPLOMAS` (abas `Diplomas` e `INFOS`), `PERMISSOES_DE_ACESSO` (aba `EMISSAO_DIPLOMAS`), `PASTA_RAIZ_ALUNOS`, `PLANILHA_ALUNOS`, `TEMPLATE_OFICIO_ID`, `TEMPLATE_CERTIFICADO_ID`, `TEMPLATE_FORMANDOS_ID` e `REGRAS_CURRICULARES`. Chave ausente, repetida ou de outro tipo dá erro; na homologação, célula vazia dá erro e nunca cai na produção.

Implantação: App da Web, **Executar como: eu** (a conta do Serviço), **Quem pode acessar: qualquer pessoa**. O `appsscript.json` do repositório reproduz isso (`USER_DEPLOYING`, `ANYONE`). A conferência de quem entra é a lista da aba `EMISSAO_DIPLOMAS`; contas fora do domínio de quem implantou chegam sem e-mail e são recusadas.

### 1.1 Encaminhador dos pedidos de colação (4.1.0)

Antes do primeiro uso, em cada projeto, com a ordem do responsável:

1. No `ID_INDEX`, as chaves `PEDIDOS_COLACAO` (planilha) e `PASTA_PROVISORIOS_COLACAO` (pasta) já existem para o formulário 2.x; o Gerenciador passa a lê-las (coluna Homologação na cópia de teste). A conta que executa o Gerenciador precisa de edição na planilha `PEDIDOS_COLACAO` e na pasta de entrada.
2. No editor, rodar `prepararEncaminhamentosColacao`: cria a aba `ENCAMINHAMENTOS` (títulos na linha 1) se faltar. A primeira execução pede autorização nova, por causa dos gatilhos.
3. `diagnosticarEncaminhamentosColacao` mostra as contagens, sem nomes.
4. Gatilho de 5 minutos (D15, só com autorização): `instalarGatilhoEncaminhadorColacao`; para tirar, `removerGatilhoEncaminhadorColacao`. Sem gatilho, os pedidos entram quando um ADMINISTRADOR abre a página.

Pendências aparecem numa faixa no topo, só para ADMINISTRADOR. Motivos e como resolver: [ENCAMINHADOR_COLACAO.md](ENCAMINHADOR_COLACAO.md#5-motivos-de-bloqueio). Desde a 4.1.0, "Abrir/criar pasta" não cria mais cadastro na planilha central (D6): o aluno é cadastrado pelo Gerenciador de Pessoas.

## 2. Lista de acesso

Aba `EMISSAO_DIPLOMAS` da planilha `PERMISSOES_DE_ACESSO`, linha 1 com os títulos e uma pessoa ou setor por linha:

| Coluna | Conteúdo |
|---|---|
| A — N. USP | número USP; vazio para conta de setor |
| B — Nome | nome da pessoa ou do setor (1ª linha do topo da página) |
| C — e-mail | e-mail completo; é por ele que o acesso é conferido |
| D — Observação | 2ª linha do topo da página |
| E — Perfil | `ADMINISTRADOR` ou `LEITOR` |

Linhas com coringa, grupo ou texto que não é e-mail completo são ignoradas; e-mail repetido vale o menor perfil. Uma mudança na lista vale em até 60 segundos.

## 3. Enviar o código

1. Na pasta `sistemas/emissao-diplomas/src/` do clone, com o `.clasp.json` apontando para o projeto **HOMOLOGACAO** autônomo: `clasp status` (confere a lista de arquivos) e, com a ordem do responsável, `clasp push`.
2. Homologar ([HOMOLOGACAO.md](HOMOLOGACAO.md)).
3. Repetir no projeto **PRODUÇÃO** autônomo a partir do commit do `main`, com ordem própria.
4. Criar a implantação (ou nova versão) pelo editor. O endereço `/exec` novo não entra no Git.

## 4. Link no Painel dos servidores

O card "Diplomas e Colação de Grau" do [Painel dos servidores](../painel-servidores/MANUAL_OPERACAO.md) lê o endereço da propriedade `URLS_SISTEMAS_EQUIPE` do projeto do painel. Trocar o valor da chave `EMISSAO_DIPLOMAS` pelo `/exec` novo, rodar `diagnosticarUrlsSistemas` e, se quiser, atualizar a coluna `LINK_EXEC` da planilha `SISTEMAS`. Não precisa reimplantar o painel: o endereço é lido a cada abertura.

## 5. Voltar atrás

Enquanto o código do projeto vinculado existir, voltar é trocar de novo o endereço do card. Como a trava contra gravação simultânea vale só dentro de cada projeto, **não use os dois projetos ao mesmo tempo**. O responsável informou (05/11/2026) que vai apagar o código do vinculado depois da troca; a 3.x continua no Git (commit `35e621e`) para recriar o projeto, se necessário.

## 6. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Não foi possível conferir o seu acesso agora" | `ID_INDEX_SPREADSHEET_ID` ausente, chave `PERMISSOES_DE_ACESSO` com problema, aba `EMISSAO_DIPLOMAS` ausente ou títulos de C/E errados. |
| "Sem acesso a este gerenciador" | e-mail fora da aba ou perfil diferente de `LEITOR`/`ADMINISTRADOR`. |
| "Conta não identificada" | navegador com conta de fora do domínio institucional. |
| Lista de alunos não abre | chave `EMISSAO_DIPLOMAS` sem ID (ou sem ID de homologação) ou sem a aba `Diplomas`. |
| Faixa "pedidos do formulário com pendência" | ver o motivo de cada linha em [ENCAMINHADOR_COLACAO.md](ENCAMINHADOR_COLACAO.md#5-motivos-de-bloqueio); resolvida a causa, o pedido entra na próxima abertura (ou no gatilho). |
| Pedidos do formulário não entram e não há faixa | aba `ENCAMINHAMENTOS` ausente ou sem uma coluna, chave `PEDIDOS_COLACAO`/`PASTA_PROVISORIOS_COLACAO` sem ID, ou cadastro ainda `PENDENTE` sem decisão do Gerenciador de Pessoas; rodar `diagnosticarEncaminhamentosColacao`. |
| "Somente consulta" para quem deveria administrar | perfil `LEITOR` na coluna E, ou e-mail repetido com uma linha `LEITOR`. |
