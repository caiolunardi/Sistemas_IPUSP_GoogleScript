# Instalação e atualização — Gerenciador de Abertura de Habilitações 2.0

**Nada deste documento foi executado.** A 2.0 não foi copiada para nenhum projeto Apps Script, nenhuma propriedade foi criada, nenhuma aba de permissões foi criada e nenhuma implantação foi feita. Cada passo no Google exige autorização expressa do responsável, na ordem de [`docs/IMPLANTACAO.md`](../../IMPLANTACAO.md) e do [fluxo de mudanças](../../governanca/FLUXO_DE_MUDANCAS.md). Nenhum valor real (ID de planilha, de script ou de implantação, URL `/exec`) deve ser escrito aqui.

## 1. O que a 2.0 precisa

| Item | Onde | Quem cria |
|---|---|---|
| `ID_INDEX_SPREADSHEET_ID` | Script Properties do projeto | responsável |
| `AMBIENTE` = `homologacao` | Script Properties **só** do projeto de homologação | responsável |
| Chave `ABERTURA_HABILITACOES` | `ID_INDEX`, colunas `ID de Produção` e `Homologação` | já existe para produção (usada pelo Painel dos servidores); conferir `Tipo` e a coluna de homologação |
| Chave `PERMISSOES_DE_ACESSO` | `ID_INDEX` | já existe (Painel dos servidores, Estrutura Curricular) |
| Aba `GERENCIADOR_HABILITACOES` | planilha de permissões | **nova**; títulos na linha 1: `N. USP`, `Nome`, `E-mail`, `Observação`, `Perfil` |
| Colunas `Registro ID` e `Versão` | aba atual da planilha de respostas | provavelmente já existem (a 1.0 cria ao abrir a página); conferir com `diagnosticarPlanilha` |
| Permissão da conta que implanta | editar a planilha de respostas; ler `ID_INDEX` e a planilha de permissões | já é o caso da 1.0, a conferir |

Nenhum gatilho é necessário. Escopos pedidos na primeira execução: planilhas, envio de e-mail, `Session` (e-mail do usuário), propriedades e cache.

## 2. Manifesto

`src/appsscript.json`: fuso `America/Sao_Paulo`, V8, registro de exceções no Stackdriver, Web App **Executar como: eu** (`USER_DEPLOYING`) e **Quem pode acessar: Somente eu** (`MYSELF`).

O acesso "Somente eu" é proposital até a homologação: assim nem um `/exec` novo nem o `/dev` ficam abertos antes de a lista de acesso ser conferida. A configuração da 1.0 em uso não é conhecida pelo repositório. Para a equipe usar, o responsável decide o acesso (provavelmente "Qualquer pessoa da USP", `DOMAIN`, como o Painel dos servidores) e muda o manifesto num PR próprio, depois do teste de identidade do [plano de homologação](HOMOLOGACAO.md).

## 3. Montar a homologação (recomendado antes de tudo)

Segue o modelo de [`AMBIENTE_DE_HOMOLOGACAO.md`](../AMBIENTE_DE_HOMOLOGACAO.md):

1. **Planilha de respostas de testes**: cópia com a mesma estrutura (abas `Respostas ao formulário 2` e `2021 - 2022`, mesmos títulos), só com linhas **fictícias**. Não copiar a planilha real inteira; se a cópia for feita por "Fazer uma cópia", apagar as linhas 2 em diante das duas abas antes de compartilhar, e preencher com casos inventados (pendente, concluído, sem ID, ID repetido, sem e-mail, as duas habilitações, data em texto).
2. **Planilha de permissões de testes** (recomendado): cópia só com a aba `GERENCIADOR_HABILITACOES` e as contas de teste. Alternativa: usar a de produção com a aba nova já preenchida.
3. No `ID_INDEX`, coluna `Homologação`: IDs das duas cópias nas linhas `ABERTURA_HABILITACOES` e `PERMISSOES_DE_ACESSO`.
4. **Projeto Apps Script de homologação**: projeto novo e autônomo, com nome que deixe claro que é teste; copiar **todos** os arquivos de `src/` (inclusive `appsscript.json`, pelo editor em "Mostrar o arquivo de manifesto" ou pelo clasp com `.clasp.json` fora do repositório).
5. Propriedades: `ID_INDEX_SPREADSHEET_ID` e `AMBIENTE` = `homologacao`.
6. No editor, rodar `diagnosticarConfiguracao`: deve mostrar `homologacao`, as duas chaves `ok: <nome da cópia>` e a contagem de administradores e leitores.
7. Rodar `diagnosticarPlanilha` e `diagnosticarMigracaoRegistroId` na cópia.
8. Implantar como App da Web para teste; guardar o link fora do repositório.

## 4. Atualizar a produção da 1.0 para a 2.0

Pré-requisitos: PR aprovado e com merge, homologação registrada em [HOMOLOGACAO.md](HOMOLOGACAO.md), autorização expressa do responsável para cada passo.

1. **Cópia de segurança** da planilha de respostas (**Arquivo → Fazer uma cópia**, numa pasta restrita) e anote a data e a hora. Registre também a versão da implantação da 1.0 em uso (Implantar → Gerenciar implantações), para poder voltar.
2. Criar e preencher a aba `GERENCIADOR_HABILITACOES` na planilha de permissões com a lista decidida pelo responsável.
3. No projeto da 1.0: guardar uma cópia dos dois arquivos atuais **fora do repositório** (o ID está neles).
4. Substituir o código pelo de `src/` (todos os arquivos, inclusive o manifesto) e criar `ID_INDEX_SPREADSHEET_ID`. **Não** criar `AMBIENTE`.
5. Rodar `diagnosticarConfiguracao` e `diagnosticarPlanilha`. Conferir: J e K com os títulos esperados, colunas obrigatórias encontradas, contagem de pendentes igual à da 1.0.
6. Rodar `diagnosticarMigracaoRegistroId`. Se pedir migração, seguir o [manual](MANUAL_OPERACAO.md#4-migração-controlada-de-registro-id-e-versão).
7. Testar pelo `/dev` com uma conta ADMINISTRADOR e uma LEITOR, **sem** salvar pedidos reais além do necessário.
8. **Nova versão** da implantação existente (Implantar → Gerenciar implantações → editar → Nova versão), para manter a URL que o Painel dos servidores usa. Ajustar "Quem pode acessar" conforme a decisão do item 2.
9. Registrar em [`docs/VERSOES.md`](../../VERSOES.md) o commit implantado e a data.

Uma implantação **nova** (em vez de nova versão) muda a URL: atualizar a chave `GERENCIADOR_HABILITACOES` da propriedade `URLS_SISTEMAS_EQUIPE` do Painel dos servidores.

## 5. Voltar atrás

Voltar à 1.0 **não é inofensivo**. A 1.0 roda a migração automática de Registro ID e Versão a cada abertura da página, por qualquer pessoa que tenha o link, sem conferência nem confirmação. Se a planilha tiver algo que essa migração "corrige", a primeira visita depois da volta altera dados sozinha.

### O que a 1.0 faz ao abrir a página

Conferido no código da 1.0 (`testes/baseline/`) e pelo teste de equivalência "volta à 1.0…":

| Situação na planilha | O que a 1.0 faz na primeira visita |
|---|---|
| Pedido sem Registro ID (por exemplo, chegou pelo Forms depois da última migração) | Dá um ID novo. Esperado, mas sem registro de quem fez. |
| Registro ID repetido | Troca o ID das ocorrências seguintes; mantém a primeira. Não pergunta qual pedido fica com o ID. Grava o **nome do aluno** no registro de execução. |
| Versão vazia, `0` ou texto (`abc`, `#NUM!`) | Troca por `1`, sem avisar. É o caso que a 2.0 deixou de corrigir sozinha. |
| Versão negativa ou fracionária (`-2`, `1.5`) | Mantém e passa a usá-la como versão; os salvamentos seguintes continuam com valores sem sentido. |
| Reserva de envio da 2.0 (`ENVIANDO… data #marca`) | Lê como "já avisado" e mostra o texto da reserva no lugar da data do aviso. |
| Qualquer um dos três primeiros casos | Reescreve as colunas Registro ID e Versão **inteiras** (todas as linhas, inclusive as que não mudam), o que transforma fórmulas dessas colunas em valores. |

Além disso, a 1.0 não confere quem acessa: quem tiver o link lê e grava tudo, conforme o acesso da implantação.

### Condições para voltar

Só volte quando **todas** forem verdadeiras, conferidas no editor da 2.0 logo antes da troca:

1. `diagnosticarMigracaoRegistroId` → `precisaMigrar: false` **e** `versaoMalformada: 0`. Se não, rode a migração controlada e a recuperação de cada linha informada ([manual](MANUAL_OPERACAO.md#4-migração-controlada-de-registro-id-e-versão), seções 4.1 e 4.2). `identificadoresForaDoFormato` deve ser 0 também: a 1.0 aceita esses pedidos, mas a 2.0, se voltar depois, não.
2. `diagnosticarPlanilha` → `reservasDeEnvio: 0`. Se houver, trate cada pedido pelo gerenciador 2.0 (o envio interrompido pede confirmação) ou, depois de confirmar com o aluno se o e-mail chegou, limpe a célula `E-mail Enviado` e anote nas observações.
3. Cópia de segurança da planilha feita agora (Arquivo → Fazer uma cópia, pasta restrita), com data e hora anotadas.
4. As propriedades `MIGRACAO_REGISTRO_ID_CONFIRMACAO` e `RECUPERACAO_REGISTRO` não existem (apague se sobraram).
5. Autorização expressa do responsável para a volta, registrada.

### Procedimento

1. Mude o acesso da implantação para **Somente eu** (Implantar → Gerenciar implantações → editar → Quem pode acessar). Assim ninguém abre a 1.0 antes da conferência.
2. Refaça as conferências 1 e 2 acima (pedidos novos podem ter chegado).
3. Na mesma tela, escolha a versão anterior da implantação (a 1.0) e salve. A URL não muda.
4. Abra a página **uma vez**, com a sua conta.
5. Na planilha, abra Arquivo → Histórico de versões e confira que essa visita não alterou nada. Se alterou (por exemplo, um pedido chegou entre o passo 2 e o 4 e ganhou ID), confira as células alteradas contra a cópia do passo 3 antes de seguir.
6. Volte o acesso da implantação ao que o responsável decidir. Lembre que a 1.0 não tem autorização no servidor (decisão 13 de [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md)).
7. Registre a volta em [`docs/VERSOES.md`](../../VERSOES.md) (data, motivo, versão em uso).

Pedidos que chegarem depois da volta recebem ID na primeira visita, como sempre aconteceu na 1.0.

**Se as condições não puderem ser cumpridas a tempo** (por exemplo, a 2.0 precisa sair do ar já): não volte à 1.0. Mude a implantação para **Somente eu**. Isso tira o gerenciador do ar sem alterar dados e pode ser desfeito; a equipe fica sem a ferramenta até a correção ou até a volta conferida.

### Dados e acesso

- Dados: restaurar pelo histórico de versões da planilha ou pela cópia de segurança, depois de anotar o que mudou desde então. Prefira restaurar células ou linhas a restaurar a planilha inteira.
- Acesso: na dúvida, mudar a implantação para "Somente eu".

## 6. Atualizar para versões futuras

1. Conferir o código do editor contra o repositório antes de trocar ([`ferramentas/conferir_implantacao.js`](../../../ferramentas/conferir_implantacao.js), com `clasp pull` feito pelo responsável).
2. Homologar na cópia.
3. Nova versão da mesma implantação; registrar commit e data.
