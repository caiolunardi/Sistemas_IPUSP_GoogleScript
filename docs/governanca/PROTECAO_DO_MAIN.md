# Proteção do `main` e configurações do GitHub

O [fluxo de mudanças](FLUXO_DE_MUDANCAS.md) diz o que **deve** acontecer. Este documento diz o que o GitHub **impõe** de fato, e como o responsável aplica o que falta. Só o dono do repositório muda essas configurações: um agente não as altera sem ordem explícita.

## 1. Situação em 21/10/2026

Conferido em 21/10/2026. **API** = consulta só de leitura à API do GitHub; **captura** = tela mostrada pelo responsável (a API não é acessível às ferramentas dos agentes); **rodada** = evidência de uma execução real. O histórico da implantação está no [relatório final](RELATORIO_FINAL_IMPLANTACAO_2026.md).

| Configuração | Situação | Estado | Evidência |
|---|---|---|---|
| Ruleset `main protegido` (id 25513651) | ativo, alvo ramo padrão, bypass vazio (`current_user_can_bypass: never`) | IMPLEMENTADO E VERIFICADO | API |
| Exclusão e force push do `main` | regras `deletion` e `non_fast_forward` | IMPLEMENTADO E VERIFICADO (configuração) | API. A recusa não foi provocada: nenhum teste destrutivo no repositório real, e o repositório descartável (2.B) não foi feito |
| PR obrigatório | `pull_request`: 0 aprovações (modelo A), conversas resolvidas, aprovações antigas descartadas, só `merge` | IMPLEMENTADO E VERIFICADO | API; os PRs #8 a #11 entraram por PR, e o Rule insights registra `pass` em cada merge |
| `CI concluída` obrigatória | `required_status_checks`: `CI concluída` com `integration_id: 15368` (GitHub Actions) e ramo atualizado (`strict`) | IMPLEMENTADO E VERIFICADO | API; o #10 e o #11 ficaram `behind` até a atualização (B4). O bloqueio de um PR com a CI vermelha (B2) não foi exercitado |
| Aprovação extra para mudanças sem autoria reconhecida | `require_extra_approval_for_unattributed_changes: true` | ligado; efeito exato não testado | API. **Não** é aprovação humana obrigatória: o #10 e o #11 ficaram `clean` e entraram com 0 aprovações, com commits de autoria não ligada a uma conta do GitHub |
| Métodos de merge | só merge commit (squash e rebase desligados); auto-merge desligado | IMPLEMENTADO E VERIFICADO | API |
| Apagar o ramo depois do merge | ligado | IMPLEMENTADO E VERIFICADO | API; os ramos do #10 e do #11 foram apagados pelo GitHub |
| Ruleset `tags de versão` (id 25519915) | ativo, `refs/tags/*-v*`, regras `update`, `deletion` e `non_fast_forward`, bypass vazio; criar tag nova continua permitido | IMPLEMENTADO E VERIFICADO (configuração) | API. Que o Release continua criando tags novas com ele: IMPLEMENTADO, PENDENTE DE VALIDAÇÃO até a primeira publicação legítima |
| Environment `release` | revisor obrigatório `caiolunardi`, *Prevent self-review* desligado (modelo A), sem bypass de administrador, só o ramo `main` | IMPLEMENTADO E VERIFICADO | captura (configuração); rodadas E2 e E3 (seção 4) e `actions/runs/{id}/approvals` (API) |
| Relato privado de vulnerabilidade | ligado | IMPLEMENTADO E VERIFICADO | API (`enabled: true`) |
| Secret scanning e push protection | ligados | IMPLEMENTADO E VERIFICADO | API (`security_and_analysis`) |
| Dependabot: atualizações de segurança | ligadas | IMPLEMENTADO E VERIFICADO | API |
| Dependabot: alertas e grafo de dependências | ligados | CONFIRMADO POR CAPTURA | a API de alertas não é acessível aos agentes |
| Atualizações de versão do Dependabot | `.github/dependabot.yml`, semanal | IMPLEMENTADO E VERIFICADO | o Dependabot abriu os PRs #12 e #13, que seguem o fluxo normal |
| Actions: permissões gerais | só Actions do dono e do GitHub, SHA completo obrigatório, token padrão só leitura, Actions sem permissão de criar ou aprovar PR, aprovação para todo colaborador externo | CONFIRMADO POR CAPTURA | a API não é acessível aos agentes. A captura do primeiro bloco não foi refeita depois de recarregar a página: é uma limitação da evidência, não um erro encontrado. A CI verde depois da mudança (PR de encerramento) mostra que os workflows continuam rodando |
| CodeQL, varredura por IA, correção automática | não ligados | NÃO IMPLEMENTADO (decisão do responsável nesta etapa) | captura |
| Licença | nenhuma | depende de decisão institucional ([pendências](README.md#3-decisões-pendentes)) | — |
| Dono | conta pessoal, um único administrador | ver [pendências](README.md#3-decisões-pendentes) | — |

Em 20/10/2026, antes da implantação, nada disso existia: `Branch not protected`, nenhum ruleset, squash e rebase permitidos, recursos de segurança desligados ([diagnóstico](DIAGNOSTICO_2026-10-20.md)).

## 2. Checklist de aplicação e validação

Os passos abaixo foram aplicados pelo responsável em 20 e 21/10/2026 (resultado na seção 1). Ficam como procedimento de referência, para conferir de novo ou refazer a configuração.

**Nenhuma conferência deste documento tenta uma operação destrutiva no repositório institucional.** Não se faz push direto no `main`, force push (nem `--force-with-lease`) contra ele, nem se move ou apaga uma tag real "para ver se é recusado": se a regra estiver errada, o teste é o próprio estrago. A validação tem três partes:

- **A. Inspeção** da configuração real, pela tela e por consultas só de leitura à API (seção 2.A);
- **B. Testes de comportamento**: os destrutivos, só num **repositório descartável** com a mesma configuração; no institucional, só os seguros, feitos com pull requests (seção 2.B);
- **C. Limites** do que cada evidência prova (seção 2.C).

**Por que esta ordem:** a regra "exigir a verificação `CI concluída`" só pode ser ligada depois que essa verificação existir no `main` (ela nasce no PR #9). Exigir um nome que nenhum workflow produz trava todos os merges. Já o bloqueio de force push e de exclusão não depende de nada e pode ser ligado antes.

### Passo 0 — já agora: impedir force push e exclusão do `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

1. **Ruleset name:** `main protegido`. **Enforcement status:** `Active`. **Bypass list:** vazia.
2. **Target branches → Add target → Include default branch.**
3. Marque só **Restrict deletions** e **Block force pushes**. **Create**.

Conferência 0: inspeção A1 a A3 (abaixo) mostra o ruleset ativo, com alvo no ramo padrão, bypass vazio e as regras `deletion` e `non_fast_forward`.

### Passo 1 — integrar os PRs preparatórios

Na ordem da [sequência de integração](#5-sequência-de-integração): #8, depois #9. Cada um pelo botão **Merge pull request** (merge commit), com a CI verde no PR.

Conferência 1: em **Actions → CI**, a rodada do **push** do commit de merge do #9 no `main` termina verde e mostra a etapa **CI concluída** com ✓. Em **Checks** desse commit, o nome aparece exatamente como `CI concluída`, com o app **GitHub Actions**. (Conferido em 20/10/2026 no PR #9: o check run se chama `CI concluída`, app `github-actions`.)

### Passo 2 — exigir PR e a CI

Edite o ruleset `main protegido` e marque também:

- **Require a pull request before merging**, com **Required approvals** `0` (modelo A, seção 4; `1` no modelo B), **Dismiss stale pull request approvals when new commits are pushed**, **Require conversation resolution before merging** e **Allowed merge methods:** só `Merge`;
- **Require status checks to pass**, com **Require branches to be up to date before merging** e, em **Add checks**, `CI concluída` **com a origem `GitHub Actions`** (no seletor ao lado do nome). Sem a origem, qualquer pessoa ou app com escrita poderia criar um *commit status* com o mesmo nome pela API e satisfazer a regra;
- **Require linear history:** **não** marque (o repositório usa merge commit).

Em **Settings → General → Pull Requests:** desmarque **Allow squash merging** e **Allow rebase merging**; marque **Automatically delete head branches**.

Conferência 2: inspeção A1 a A5 e os testes seguros B1 a B4.

### Passo 3 — tags de versão

**Settings → Rules → Rulesets → New tag ruleset:** nome `tags de versão`, `Active`, bypass vazio, **Target tags → Include by pattern** `*-v*`, marque **Restrict updates**, **Restrict deletions** e **Block force pushes**.

Conferência 3: inspeção A6. O bloqueio de mover e apagar tags é testado só no repositório descartável (B6); nenhuma tag real é tocada.

A criação de tags novas continua permitida (o workflow Release cria a tag junto com a Release). Por isso alguém com escrita ainda pode enviar uma tag de versão pelo git: ela **não** gera Release (o Release não tem mais gatilho por tag), mas ocupa o nome. Restringir também a criação exigiria pôr o app do GitHub Actions no bypass, o que não foi possível conferir nesta conta; fica para avaliar depois.

### 2.A Inspeção da configuração real (só leitura)

Feita pelo dono, na tela ou num terminal com o `gh` autenticado. Nenhum comando abaixo muda nada: todos são `GET`. Troque `R` por `caiolunardi/Sistemas_IPUSP_GoogleScript`. Guarde a saída (sem tokens) para registrar na seção 1.

| # | O que conferir | Onde | Esperado |
|---|---|---|---|
| A1 | Rulesets existentes e estado | `gh api repos/R/rulesets` · **Settings → Rules → Rulesets** | `main protegido` (e, no passo 3, `tags de versão`) com `enforcement: "active"` |
| A2 | Alvo e regras do ruleset do `main` | `gh api repos/R/rulesets/<id>` | `target: "branch"`; `conditions.ref_name.include` com `~DEFAULT_BRANCH`; `rules` com `deletion`, `non_fast_forward` e, depois do passo 2, `pull_request` (aprovações `0` no modelo A, `required_review_thread_resolution: true`, `allowed_merge_methods: ["merge"]`) e `required_status_checks` |
| A3 | Bypass | o mesmo `GET` (o campo `bypass_actors` só aparece para administrador) · tela do ruleset | lista vazia; se o campo não vier, confira na tela |
| A4 | Origem confiável da `CI concluída` | o mesmo `GET`, em `required_status_checks` | `context: "CI concluída"` com `integration_id: 15368` (o app GitHub Actions) e `strict_required_status_checks_policy: true` (ramo atualizado). Sem `integration_id`, um *commit status* qualquer com o mesmo nome satisfaria a regra |
| A5 | Regras efetivas no `main` | `gh api repos/R/rules/branches/main` | as mesmas regras de A2, cada uma com `ruleset_id` do `main protegido` (confere que nenhum outro ruleset ou configuração antiga interfere) |
| A6 | Ruleset das tags | `gh api repos/R/rulesets/<id>` | `target: "tag"`; `include` com `refs/tags/*-v*`; regras `update`, `deletion`, `non_fast_forward`; bypass vazio |
| A7 | Registros de bloqueio | **Settings → Rules → Insights** · `gh api "repos/R/rulesets/rule-suites?ref=refs/heads/main"` | lista as avaliações das regras; servem de evidência de tentativas recusadas que **já** aconteceram (não se provoca uma) |
| A8 | Opções de merge | `gh api repos/R --jq '{allow_merge_commit, allow_squash_merge, allow_rebase_merge, delete_branch_on_merge}'` | `true, false, false, true` |

Em 20/10/2026, A1 e A5 responderam `[]` (nenhum ruleset, nenhuma regra efetiva).

### 2.B Testes de comportamento

**No repositório institucional, só testes seguros.** Nenhum deles escreve no `main` sem PR nem toca uma tag.

| # | Teste | Esperado |
|---|---|---|
| B1 | PR legítimo (por exemplo, o que atualiza a seção 1 deste documento) com CI verde | botão **Merge** liberado; o merge funciona |
| B2 | PR de teste com um teste quebrado de propósito, num ramo descartável | **Merge** bloqueado enquanto a CI estiver vermelha. **Não faça o merge**: feche o PR e apague o ramo |
| B3 | PR com uma conversa de revisão aberta | **Merge** bloqueado até resolver |
| B4 | PR atrás do `main` | pede **Update branch** antes do merge |
| B5 | Registros já existentes (A7) | se houver tentativas recusadas, aparecem com a regra que recusou |

**Os destrutivos, só num repositório descartável.** Eles provam que **a configuração** recusa push direto, force push, exclusão e tag movida; o repositório institucional fica intocado.

1. Crie um repositório novo na mesma conta (por exemplo `teste-protecao`, privado), com um commit qualquer no `main` e um workflow mínimo com um job chamado `CI concluída` que só faz `echo ok`. Nenhum dado, código ou segredo do repositório institucional vai para lá.
2. No institucional, **Settings → Rules → Rulesets → main protegido → ⋯ → Export ruleset** (baixa um JSON; exportar é leitura). No descartável, **New ruleset → Import a ruleset** com esse arquivo. Faça o mesmo com `tags de versão`. Confira com A2, A4 e A6 no descartável que as regras ficaram iguais.
3. Ainda no descartável:

| # | Teste (só no descartável) | Esperado |
|---|---|---|
| B6 | num clone **do descartável** (confira `git remote -v` antes): `git push origin main` com um commit novo; `git push --force origin <commit-antigo>:main`; `git push origin :main`; criar uma tag `x-v1.0`, depois `git push --force origin <outro-commit>:refs/tags/x-v1.0` e `git push origin :refs/tags/x-v1.0` | todos recusados (`GH013`); a criação da tag nova passa |
| B7 | criar pela API um *commit status* `CI concluída` = `success` num commit de PR com a CI vermelha (`gh api repos/<descartável>/statuses/<sha> -f state=success -f context="CI concluída"`) | o **Merge** continua bloqueado (a regra exige a origem GitHub Actions) |
| B8 | **Rule insights** do descartável | mostra as recusas de B6 |

4. Registre os resultados na seção 1 e apague o repositório descartável.

### 2.C Limites do que cada evidência prova

- **Inspeção (A)** prova o que está **configurado**, não o comportamento. É a evidência sobre o repositório institucional.
- **O repositório descartável (B6 a B8)** prova o comportamento **daquela** configuração naquele repositório. Vale para o institucional na medida em que A2, A4 e A6 mostrarem regras iguais nos dois; não prova nada sobre configurações que só existem no institucional.
- **`git push --dry-run` não prova nada:** ele não envia o push e o GitHub não avalia as regras. Não use como teste de proteção.
- **Testes seguros (B1 a B4)** provam o caminho por PR; não exercitam push direto nem force push.
- Se um item falhar, o `main` **não** está protegido: corrija a regra e repita a inspeção e o teste correspondente.

## 3. Segurança e Actions

Aplicado em 21/10/2026 (seção 1), com uma diferença em relação ao texto abaixo: além do que está aqui, foram ligados o grafo de dependências, as atualizações de segurança do Dependabot e a exigência de Actions fixadas por SHA completo.

**Settings → Code security**

- **Private vulnerability reporting:** Enable. (Faz funcionar o link do `SECURITY.md` e do formulário de issues.)
- **Secret scanning** e **Push protection:** Enable.
- **Dependabot alerts:** Enable. (As atualizações automáticas vêm do `.github/dependabot.yml`, quando ele estiver no `main`.)

**Settings → Actions → General**

- **Actions permissions:** `Allow caiolunardi, and select non-caiolunardi, actions and reusable workflows`, com `Allow actions created by GitHub` marcado e mais nada.
- **Approval for running fork pull request workflows from contributors:** `Require approval for all external contributors`.
- **Workflow permissions:** `Read repository contents and packages permissions`, e **desmarque** `Allow GitHub Actions to create and approve pull requests`. Cada workflow pede no próprio arquivo só o que precisa (o Release pede `contents: write`).

**Settings → Environments → New environment** `release`: ver o modelo escolhido na seção 4. Configure-o **antes** do primeiro uso do Release: se o environment não existir, o GitHub o cria vazio na primeira rodada, e ela não espera aprovação. Depois do PR #9, o script do Release recusa essa rodada (não há aprovação registrada) e nada é publicado; mas o environment vazio fica criado e precisa ser configurado.

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

### A trava do Release (PR #9)

O script do Release só publica se a rodada em andamento tiver uma aprovação `approved`, de um usuário, no environment `release` (`GET actions/runs/{id}/approvals`). Sem environment, com ele vazio, sem revisor, rejeitado, com erro de leitura ou fora do workflow, ele para antes de conferir ou escrever qualquer coisa. Isso vale nos dois modelos: no A, o dono aprova a própria rodada; no B, a outra pessoa. Uma variável no environment (por exemplo `RELEASE_GOVERNANCE_READY`) **não** é usada como prova, porque o Actions não distingue se ela veio do environment, do repositório ou da organização ([versões](../VERSOES.md), seção 6).

**Validar o environment sem publicar nada** (depois de configurado e com o #9 no `main`):

| # | Teste | Esperado |
|---|---|---|
| E1 | **Settings → Environments → release** | revisor obrigatório, *Prevent self-review* conforme o modelo, administradores sem bypass, só o ramo `main` |
| E2 | **Run workflow** do Release no `main` e, em **Review deployments**, **Reject** | a rodada termina sem executar o job; nenhuma tag nem Release |
| E3 | **Run workflow** com o commit de merge mais recente do `main` e a tag `teste-v0.0` (não existe `sistemas/teste`), e **Approve** | o log mostra "Rodada … aprovada no environment release por …" (a trava leu a aprovação real) e depois "Pasta sistemas/teste não existe"; nenhuma tag nem Release |

E3 é o único teste que confere, com o GitHub real, o formato da resposta de aprovações; a recusa vem das conferências do commit e das tags, então nada é publicado mesmo que a trava aceite.

**Resultado (21/10/2026):**

- **E1:** a configuração foi conferida por captura (seção 1).
- **E2:** rodada 39526102748, no `main`, commit `0c6f71b`. A API de aprovações registra `rejected` por `caiolunardi` no environment `release`. O job não publicou nada.
- **E3:** rodada 39526964799. A API registra `approved` por `caiolunardi` (`type: User`, environment `release`), no formato que os testes simulam. O log, conferido pelo responsável, mostra "Rodada 39526964799 aprovada no environment release por caiolunardi", depois o commit `0c6f71b` aceito (estado do `main`, merge do PR #9, CI verde) e a recusa "Pasta sistemas/teste não existe no commit (tag teste-v0.0)". A tag e a Release `teste-v0.0` não existem (API: 404).
- **Ainda não comprovado:** uma publicação legítima de ponta a ponta, isto é, a aprovação, todas as conferências passando e a criação da tag e da Release com o ruleset das tags ativo.

**Recomendação:** modelo A agora (é seguro contra erro e contra terceiros e não trava a operação) e modelo B quando houver uma segunda pessoa. Criar um segundo usuário só para aprovar não é recomendado: seria a mesma pessoa com duas contas, sem independência real.

## 5. Sequência de integração

Concluída. Feita em 20 e 21/10/2026, nesta ordem, com autorização do responsável para cada merge:

1. Passo 0 (exclusão e force push): ruleset criado em 20/10, às 23:48.
2. PR #8, merge `1409db9`, em 20/10, às 23:51.
3. PR #9, depois de atualizado com o `main` por merge: merge `0c6f71b`, em 21/10, às 00:44. A `CI concluída` passou a existir no `main`.
4. Passo 2 (PR e CI obrigatórios, só merge commit, apagar ramos): última alteração do ruleset em 21/10, às 01:04.
5. Environment `release`, testes E2 e E3 (seção 4).
6. PR #10, merge `6db8409`, em 21/10, às 01:49. PR #11, merge `e3ebebf`, em 21/10, às 02:19. Os dois foram atualizados com o `main` antes do merge.
7. Passo 3 (tags): última alteração do ruleset em 21/10, às 02:32. Segurança e Actions (seção 3) na mesma manhã, pelo responsável.

## 6. Depois de aplicar

Qualquer mudança nessas configurações é registrada na tabela da seção 1 (data, estado e evidência) por um PR. O que ainda está pendente:

- o bloqueio de um PR com a CI vermelha (B2) e de uma conversa aberta (B3), que não foram exercitados;
- o repositório descartável (B6 a B8);
- a primeira publicação legítima com o ruleset das tags ativo.
