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

## 2. Ruleset do `main` (passo a passo)

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

1. **Ruleset name:** `main protegido`. **Enforcement status:** `Active`.
2. **Bypass list:** deixe **vazia**. (Ver seção 4 sobre o mantenedor único.)
3. **Target branches → Add target → Include default branch.**
4. Marque:
   - **Restrict deletions**;
   - **Block force pushes**;
   - **Require linear history**: **não** marque (o repositório usa merge commit);
   - **Require a pull request before merging**, com:
     - **Required approvals:** `0` (ver seção 4);
     - **Dismiss stale pull request approvals when new commits are pushed:** marcado;
     - **Require conversation resolution before merging:** marcado;
     - **Allowed merge methods:** só `Merge`;
   - **Require status checks to pass**, com:
     - **Require branches to be up to date before merging:** marcado;
     - em **Add checks**, a verificação `CI concluída` (o job que resume a CI; aparece na lista depois da primeira rodada com ela). Se ainda não existir, adicione `Dados sensíveis` e `Cópias de shared/` e troque depois;
5. **Create**.

Para conferir: tente `git push origin main` com um commit qualquer num clone de teste. O GitHub deve recusar com `GH013: Repository rule violations`.

### Também em Settings → General → Pull Requests

- desmarque **Allow squash merging** e **Allow rebase merging**, deixe **Allow merge commits**;
- marque **Automatically delete head branches**.

### Settings → Rules → Rulesets → New tag ruleset (tags de versão)

1. Nome `tags de versão`, `Active`, bypass vazio.
2. **Target tags → Include by pattern:** `*-v*`.
3. Marque **Restrict updates**, **Restrict deletions** e **Block force pushes**.

Assim uma tag já publicada não pode ser movida nem apagada ([versões](../VERSOES.md)). O workflow **Release** cria tags novas, o que continua permitido.

## 3. Segurança e Actions

**Settings → Code security**

- **Private vulnerability reporting:** Enable. (Faz funcionar o link do `SECURITY.md` e do formulário de issues.)
- **Secret scanning** e **Push protection:** Enable.
- **Dependabot alerts:** Enable. (As atualizações automáticas vêm do `.github/dependabot.yml`, quando ele estiver no `main`.)

**Settings → Actions → General**

- **Actions permissions:** `Allow caiolunardi, and select non-caiolunardi, actions and reusable workflows`, com `Allow actions created by GitHub` marcado e mais nada.
- **Approval for running fork pull request workflows from contributors:** `Require approval for all external contributors`.
- **Workflow permissions:** `Read repository contents and packages permissions`, e **desmarque** `Allow GitHub Actions to create and approve pull requests`. Cada workflow pede no próprio arquivo só o que precisa (o Release pede `contents: write`).

**Settings → Environments → New environment** `release` (usado pelo workflow Release quando a versão com verificação estiver no `main`, ver [versões](../VERSOES.md)):

- **Required reviewers:** `caiolunardi`;
- **Deployment branches and tags:** `Selected branches and tags` → o ramo `main` e o padrão de tag `*-v*` (a rodada disparada por envio de tag roda sobre a tag).

Assim cada rodada do Release espera um clique de aprovação do responsável, registrado no GitHub.

## 4. Mantenedor único: o limite das aprovações

O GitHub não deixa o autor de um PR aprovar o próprio PR. Os PRs abertos por agentes nesta conta aparecem como sendo do próprio `caiolunardi`, porque usam o acesso dele. Com **Required approvals = 1**, nenhum desses PRs poderia ser aceito sem um segundo administrador, ou sem bypass, o que anularia a proteção.

Por isso, com um só mantenedor:

- a proteção exige PR, CI verde, conversas resolvidas e proíbe push direto e force push;
- a **autorização humana** é o próprio merge, feito pelo mantenedor na interface do GitHub, mais o comentário de aprovação nas classes alta e crítica ([fluxo](FLUXO_DE_MUDANCAS.md#merge));
- o `CODEOWNERS` pede revisão do mantenedor automaticamente, mas **Require review from Code Owners** fica desligado até existir um segundo responsável.

Quando houver um segundo responsável com acesso de escrita: suba **Required approvals** para `1`, ligue **Require review from Code Owners** e acrescente essa pessoa no `CODEOWNERS`. Aí o merge passa a exigir uma aprovação de alguém que não é o autor.

Bypass de administrador: deixe a lista vazia. Numa emergência real, o dono pode desativar o ruleset (Enforcement `Disabled`), fazer a correção e reativá-lo; esse ato fica no log de auditoria do GitHub e deve ser registrado num PR ou issue em seguida.

## 5. Depois de aplicar

Atualize a tabela da seção 1 (estado **IMPLEMENTADO E VERIFICADO**, com a data e como foi conferido) num PR.
