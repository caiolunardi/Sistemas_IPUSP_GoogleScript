# Proteção do `main` e configurações do GitHub

O [fluxo de mudanças](FLUXO_DE_MUDANCAS.md) diz o que **deve** acontecer. Este documento diz o que o GitHub **impõe** de fato, e como o responsável aplica o que falta. Só o dono do repositório muda essas configurações: um agente não as altera sem ordem explícita.

## 1. Situação em 20/10/2026

Conferido pela API do GitHub nesta data.

| Configuração | Situação | Estado |
|---|---|---|
| Proteção do ramo `main` | nenhuma (`Branch not protected`) | NÃO IMPLEMENTADO |
| Rulesets | nenhum | NÃO IMPLEMENTADO |
| Merge permitido | merge commit, squash e rebase | o `CONTRIBUTING.md` pede só merge commit |
| Apagar o ramo depois do merge | desligado | o `CONTRIBUTING.md` pede apagar |
| Relato privado de vulnerabilidade | desligado | o `SECURITY.md` manda usar; o link não funciona para quem não é mantenedor |
| Secret scanning e push protection | desligados | gratuitos em repositório público |
| Alertas e atualizações do Dependabot | desligados | ver [CI](../CI.md) |
| Licença | nenhuma | depende de decisão institucional ([pendências](README.md#3-decisões-pendentes)) |
| Dono | conta pessoal, um único administrador | ver [pendências](README.md#3-decisões-pendentes) |

Enquanto a proteção não for aplicada, nada impede um push direto no `main`, um `push --force` ou um merge com a CI vermelha: as regras são apenas documentais.

## 2. Checklist de aplicação e validação

Nada nesta seção está aplicado. Cada passo tem uma **conferência**: o `main` só conta como protegido depois que todas passarem, registradas na seção 1 (data e resultado).

**Por que esta ordem:** a regra "exigir a verificação `CI concluída`" só pode ser ligada depois que essa verificação existir no `main` (ela nasce no PR #9). Exigir um nome que nenhum workflow produz trava todos os merges. Já o bloqueio de force push e de exclusão não depende de nada e pode ser ligado antes.

### Passo 0 — já agora: impedir force push e exclusão do `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

1. **Ruleset name:** `main protegido`. **Enforcement status:** `Active`. **Bypass list:** vazia.
2. **Target branches → Add target → Include default branch.**
3. Marque só **Restrict deletions** e **Block force pushes**. **Create**.

Conferência 0: num clone de teste, `git push --force-with-lease origin <commit-antigo>:main` deve ser recusado com `GH013`. (Push normal ainda passa neste passo.)

### Passo 1 — integrar os PRs preparatórios

Na ordem da [sequência de integração](#5-sequência-de-integração): #8, depois #9. Cada um pelo botão **Merge pull request** (merge commit), com a CI verde no PR.

Conferência 1: em **Actions → CI**, a rodada do **push** do commit de merge do #9 no `main` termina verde e mostra a etapa **CI concluída** com ✓. Em **Checks** desse commit, o nome aparece exatamente como `CI concluída`, com o app **GitHub Actions**. (Conferido em 20/10/2026 no PR #9: o check run se chama `CI concluída`, app `github-actions`.)

### Passo 2 — exigir PR e a CI

Edite o ruleset `main protegido` e marque também:

- **Require a pull request before merging**, com **Required approvals** `0` (modelo A, seção 4; `1` no modelo B), **Dismiss stale pull request approvals when new commits are pushed**, **Require conversation resolution before merging** e **Allowed merge methods:** só `Merge`;
- **Require status checks to pass**, com **Require branches to be up to date before merging** e, em **Add checks**, `CI concluída` **com a origem `GitHub Actions`** (no seletor ao lado do nome). Sem a origem, qualquer pessoa ou app com escrita poderia criar um *commit status* com o mesmo nome pela API e satisfazer a regra;
- **Require linear history:** **não** marque (o repositório usa merge commit).

Em **Settings → General → Pull Requests:** desmarque **Allow squash merging** e **Allow rebase merging**; marque **Automatically delete head branches**.

### Passo 3 — validar com testes reais

| # | Teste | Resultado esperado |
|---|---|---|
| 3.1 | `git push origin main` com um commit qualquer num clone de teste | recusado (`GH013`, "Changes must be made through a pull request") |
| 3.2 | PR legítimo (por exemplo, a atualização da seção 1 deste documento) com CI verde | botão **Merge** liberado; o merge funciona |
| 3.3 | PR de teste com um teste quebrado de propósito (num ramo descartável, sem merge) | **Merge** bloqueado até a CI passar; feche o PR e apague o ramo |
| 3.4 | PR com uma conversa de revisão aberta | **Merge** bloqueado até resolver |
| 3.5 | **Settings → Rules → Rulesets → main protegido** | **Bypass list** vazia; **Rule insights** mostra os pushes recusados |
| 3.6 | PR atrás do `main` | pede **Update branch** antes do merge |

Se um teste falhar, o `main` **não** está protegido: corrija a regra e repita o teste.

### Passo 4 — tags de versão

**Settings → Rules → Rulesets → New tag ruleset:** nome `tags de versão`, `Active`, bypass vazio, **Target tags → Include by pattern** `*-v*`, marque **Restrict updates**, **Restrict deletions** e **Block force pushes**.

Conferência 4: `git push --force origin <outro-commit>:refs/tags/<tag existente>` e `git push origin :refs/tags/<tag existente>` são recusados.

A criação de tags novas continua permitida (o workflow Release cria a tag junto com a Release). Por isso alguém com escrita ainda pode enviar uma tag de versão pelo git: ela **não** gera Release (o Release não tem mais gatilho por tag), mas ocupa o nome. Restringir também a criação exigiria pôr o app do GitHub Actions no bypass, o que não foi possível conferir nesta conta; fica para avaliar depois.

## 3. Segurança e Actions

**Settings → Code security**

- **Private vulnerability reporting:** Enable. (Faz funcionar o link do `SECURITY.md` e do formulário de issues.)
- **Secret scanning** e **Push protection:** Enable.
- **Dependabot alerts:** Enable. (As atualizações automáticas vêm do `.github/dependabot.yml`, quando ele estiver no `main`.)

**Settings → Actions → General**

- **Actions permissions:** `Allow caiolunardi, and select non-caiolunardi, actions and reusable workflows`, com `Allow actions created by GitHub` marcado e mais nada.
- **Approval for running fork pull request workflows from contributors:** `Require approval for all external contributors`.
- **Workflow permissions:** `Read repository contents and packages permissions`, e **desmarque** `Allow GitHub Actions to create and approve pull requests`. Cada workflow pede no próprio arquivo só o que precisa (o Release pede `contents: write`).

**Settings → Environments → New environment** `release`: ver o modelo escolhido na seção 4. Configure-o **antes** do primeiro uso do Release: se o environment não existir, o GitHub o cria vazio na primeira rodada, e ela não espera aprovação.

## 4. Quem publica e quem autoriza: dois modelos

O que a documentação do GitHub diz (consultada em 20/10/2026; não foi possível conferir a tela desta conta, porque a API de environments não é acessível daqui): em repositório **público**, environments com **Required reviewers** e restrição de ramos estão disponíveis em todos os planos, inclusive Free e conta pessoal; numa conta pessoal, só o dono configura environments; a opção **Prevent self-review** impede que quem disparou a rodada a aprove. Confira, ao configurar, se as opções abaixo aparecem; se alguma não aparecer, registre na seção 1.

### Modelo A — um único responsável (a situação atual)

| | |
|---|---|
| Ruleset do `main` | passos 0 a 2, **Required approvals `0`** |
| Environment `release` | **Required reviewers:** `caiolunardi`; **Prevent self-review:** **desmarcado** (marcado, o único revisor nunca poderia aprovar e o Release ficaria travado); **Allow administrators to bypass configured protection rules:** desmarcado; **Deployment branches and tags:** `Selected branches and tags` → só o ramo `main` |
| Quem inicia a publicação | quem tem escrita no repositório (hoje, só o dono e as ferramentas que usam o acesso dele) |
| Quem autoriza | o dono, com um clique em **Review deployments**, registrado no GitHub |
| Proteções efetivas | nada entra no `main` sem PR e sem a CI verde; sem force push; a Release só sai de commit de merge com CI verde (conferido pelo script); tags não se movem; o workflow só roda a cópia do `main` |
| Riscos que ficam | não há aprovação **independente**: o mesmo humano propõe, integra e autoriza. Um agente que use o acesso do dono pode tecnicamente fazer merge de PR (0 aprovações) e até aprovar a rodada pela API; contra isso só valem a regra de agentes ([fluxo](FLUXO_DE_MUDANCAS.md)) e dar aos agentes um acesso **sem** administração. O valor do clique de aprovação é evitar publicação por engano ou por quem não é o dono, não substituir um revisor |
| Como não travar | não marcar **Prevent self-review**; não exigir aprovações no ruleset; em emergência, o dono desativa o ruleset (**Enforcement: Disabled**), corrige, reativa e registra num PR. Se o Release falhar por limitação da conta, a Release pode ser criada à mão em **Releases → Draft a new release**, registrando o motivo |

### Modelo B — dois responsáveis

| | |
|---|---|
| Pré-requisito | uma segunda pessoa do Serviço de Graduação como colaboradora com **Write** (não Admin), com 2FA, e no `CODEOWNERS` |
| Ruleset do `main` | passos 0 a 2 com **Required approvals `1`** e **Require review from Code Owners** |
| Environment `release` | **Required reviewers:** as duas pessoas; **Prevent self-review:** **marcado**; administradores sem bypass; só o ramo `main` |
| Quem inicia | qualquer uma das duas |
| Quem autoriza | **a outra**: o GitHub não aceita aprovação de quem disparou a rodada nem de quem abriu o PR |
| Proteções efetivas | as do modelo A, mais aprovação humana independente do merge e da publicação. Um PR aberto por agente com o acesso do dono só entra com a aprovação da segunda pessoa |
| Riscos que ficam | o dono continua administrador e pode desligar as regras (fica no log de auditoria); a conta pessoal continua sendo ponto único de recuperação ([pendências](README.md#3-decisões-pendentes)) |
| Como não travar | com uma pessoa ausente, nada é integrado nem publicado. Combine quem cobre férias; em emergência, o dono desliga a regra, registra e religa. Repositório numa organização da USP resolveria a titularidade, mas é decisão institucional |

**Recomendação:** modelo A agora (é seguro contra erro e contra terceiros e não trava a operação) e modelo B quando houver uma segunda pessoa. Criar um segundo usuário só para aprovar não é recomendado: seria a mesma pessoa com duas contas, sem independência real.

## 5. Sequência de integração

1. Passo 0 (força e exclusão), a qualquer momento.
2. Merge do #8 (só documentação; não muda nenhum workflow).
3. Atualizar o ramo do #9 com o `main` (botão **Update branch**, que faz um merge; sem rebase), esperar a CI verde e fazer o merge.
4. Conferência 1 e passo 2; validação do passo 3.
5. #10 e #11: **Update branch**, CI verde, merge. Com "up to date" ligado, cada merge pede atualizar o seguinte.
6. Environment `release` (seção 4) e passo 4.

Os quatro PRs saíram do mesmo commit do `main`. Em 20/10/2026 foi conferido, num clone local, que eles se integram nessa ordem sem conflito (merge de cada um sobre o anterior).

## 6. Depois de aplicar

Atualize a tabela da seção 1 (estado **IMPLEMENTADO E VERIFICADO**, com a data e o resultado de cada conferência) num PR.
