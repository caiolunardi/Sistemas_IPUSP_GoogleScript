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

- Código: Implantar → Gerenciar implantações → editar → escolher a versão anterior (a 1.0). Os dados gravados pela 2.0 são compatíveis com a 1.0: mesmas colunas, mesmo `Concluído`/`pendente`; a única diferença é a reserva com data (`ENVIANDO… aaaa-mm-dd hh:mm:ss`). A 1.0 só reconhece a reserva sem data; uma reserva com data que tenha sobrado seria lida por ela como "já avisado" (e mostrada como texto no detalhe). Antes de voltar, confira com `diagnosticarPlanilha` (campo `reservasDeEnvio`) que não há nenhuma; se houver, trate cada pedido pelo gerenciador 2.0 ou limpe a célula depois de confirmar com o aluno se o e-mail chegou.
- Dados: restaurar pelo histórico de versões da planilha ou pela cópia de segurança, depois de anotar o que mudou desde então.
- Acesso: na dúvida, mudar a implantação para "Somente eu".

## 6. Atualizar para versões futuras

1. Conferir o código do editor contra o repositório antes de trocar ([`ferramentas/conferir_implantacao.js`](../../../ferramentas/conferir_implantacao.js), com `clasp pull` feito pelo responsável).
2. Homologar na cópia.
3. Nova versão da mesma implantação; registrar commit e data.
