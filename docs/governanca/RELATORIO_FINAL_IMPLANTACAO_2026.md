# Relatório final da implantação da governança técnica — outubro de 2026

O que foi implantado em 20 e 21/10/2026, com que evidência, e o que ainda fica pendente. O documento é permanente. As regras em vigor estão no [fluxo de mudanças](FLUXO_DE_MUDANCAS.md), e o estado de cada configuração na [proteção do `main`](PROTECAO_DO_MAIN.md#1-situação-em-21102026).

Este relatório foi escrito por um agente de IA, a partir de consultas à API do GitHub e de capturas fornecidas pelo responsável. **Não é uma auditoria independente.**

Classificação das evidências:

| Marca | Significado |
|---|---|
| **API** | consulta só de leitura à API do GitHub |
| **Captura** | tela mostrada pelo responsável, porque a API não é acessível às ferramentas dos agentes |
| **Rodada** | execução real no GitHub Actions |

## 1. Resumo executivo

**Antes (20/10/2026, [diagnóstico](DIAGNOSTICO_2026-10-20.md)):**

- O `main` não tinha nenhuma proteção, e as mudanças entravam por push direto.
- A CI só avisava depois do push e cancelava rodadas no `main`.
- O Release podia ser disparado por uma tag enviada pelo git, sem nenhuma conferência.
- Tags podiam ser movidas.
- Os recursos de segurança do GitHub estavam desligados.

As regras existiam só no papel.

**Depois (21/10/2026):**

- Toda mudança entra no `main` por pull request, com a verificação `CI concluída` verde, vinda do GitHub Actions, e com o ramo atualizado.
- Force push e exclusão do `main` são recusados, e o único método de merge é o merge commit.
- O Release só publica depois de um humano aprovar a rodada no environment `release`, e só a partir de um commit de merge do `main` com CI verde.
- Tags de versão não podem ser movidas nem apagadas.
- Relato privado de vulnerabilidade, secret scanning, push protection e Dependabot estão ligados.
- Os agentes trabalham em ramos e pedem autorização para cada merge.

O que o GitHub **não** garante: que o merge foi autorizado por uma pessoa. Com um único mantenedor, o ruleset exige 0 aprovações, e os agentes usam o acesso dele. A autorização humana é uma obrigação deste processo, não uma trava técnica (seção 8).

## 2. Histórico de implementação

| PR | Conteúdo | Commit de merge | Data (UTC) | CI do push no `main` |
|---|---|---|---|---|
| #8 | Governança, regras dos agentes, proteção do `main` (documentação) | `1409db9aef721b90b82bb1297652abe2847eb2f1` | 20/10 23:51 | rodada 39517652564, 20 de 20 jobs |
| #9 | CI com `CI concluída`, Release com trava, Actions por SHA, Dependabot | `0c6f71ba64b75e6a8f14dd2d5b164bcd21cb1fa1` | 21/10 00:44 | rodada 39523108125, 22 de 22 jobs |
| #10 | Segurança e privacidade: propostas de autorização, auditoria e retenção (documentação) | `6db8409df7c37fd9b49af90fc36272e832cc56e4` | 21/10 01:49 | rodada 39529554247, 22 de 22 jobs |
| #11 | Implantação: inventário, conferência do código do editor, volta atrás | `e3ebebfd7e1ef3b778d599f6c61e356ceebc1bd3` | 21/10 02:19 | rodada 39532361726, 23 de 23 jobs |

Como os PRs foram integrados:

- Antes de cada merge, o ramo foi atualizado com o `main` por merge (sem rebase nem force push) e teve a CI verde no último commit.
- A árvore de cada commit de merge foi conferida como a combinação exata das versões revisadas (`git merge-tree`).
- O Rule insights registra `pass` nos quatro merges.
- O #8 e o #9 foram integrados pelo responsável. O #10 e o #11 foram integrados por um agente, com autorização escrita do responsável para cada um, travados no SHA revisado (`PUT pulls/{n}/merge` com `sha`).

As três rodadas de auditoria anteriores e o passo a passo de cada etapa estão nas descrições dos PRs e no diário da implantação, fora do repositório.

## 3. Proteção do código-fonte

Ruleset `main protegido` (id 25513651), conferido por **API**:

- `enforcement: active`, alvo `~DEFAULT_BRANCH`, `bypass_actors: []`, `current_user_can_bypass: never`;
- `deletion` e `non_fast_forward`;
- `pull_request`:
  - `required_approving_review_count: 0` (modelo A);
  - `required_review_thread_resolution: true`;
  - `dismiss_stale_reviews_on_push: true`;
  - `allowed_merge_methods: ["merge"]`;
  - `require_extra_approval_for_unattributed_changes: true`;
- `required_status_checks`: `CI concluída` com `integration_id: 15368` (o app GitHub Actions) e `strict_required_status_checks_policy: true`.

No repositório (**API**): só merge commit (`allow_squash_merge` e `allow_rebase_merge` desligados), `delete_branch_on_merge: true` e auto-merge desligado.

O que foi comprovado em uso:

- os quatro PRs só entraram depois de atualizados e com a CI verde;
- o #10 e o #11 ficaram `behind` até a atualização;
- os ramos do #10 e do #11 foram apagados pelo GitHub.

O que **não** foi provocado:

- recusa de force push e de exclusão (nenhum teste destrutivo no repositório real; o repositório descartável não foi feito);
- bloqueio de um PR com a CI vermelha.

A opção `require_extra_approval_for_unattributed_changes` está ligada, mas o efeito exato não foi testado. Ela **não** equivale a exigir aprovação humana: o #10 e o #11 tinham commits de autoria não ligada a uma conta do GitHub e entraram `clean`, com 0 aprovações.

## 4. Controle de versões

Ruleset `tags de versão` (id 25519915), conferido por **API**:

- `enforcement: active`, `target: tag`, `include: ["refs/tags/*-v*"]`, `bypass_actors: []`;
- regras `update`, `deletion` e `non_fast_forward`.

Criar uma tag nova continua permitido. O workflow Release cria a tag junto com a Release e nunca atualiza nem apaga uma tag.

Situação em 21/10/2026: **16 tags e 16 Releases**, com os mesmos nomes. Todas seguem o padrão `*-v*` e ficam cobertas pelo ruleset:

`busca-alunos-v1.3`, `estrutura-curricular-v1.11.3`, `estrutura-curricular-v1.12.0`, `exclusao-disciplinas-v1.2`, `grade-horaria-visual-v2.0`, `grade-horaria-visual-v2.1`, `painel-servidores-v1.0` a `v1.4`, `painel-solicitacoes-v1.5`, `planilha-secretarias-v1.1`, `trancamento-parcial-v1.2`, `trancamento-total-gerenciador-v1.1`, `trancamento-total-v1.3`.

Nenhuma tag ou Release foi criada, movida ou apagada durante a implantação. A prova é uma impressão (sha256) da lista de tags lida no GitHub (`git ls-remote --tags`), igual do começo ao fim: `30ef8792d9254bb3…`.

Política: uma versão publicada não muda. Se algo saiu errado, publica-se a versão seguinte ([versões](../VERSOES.md)).

**Pendente de validação:** que o Release continua criando tags novas com o ruleset ativo. Só uma publicação legítima mostra isso.

## 5. Controle de publicação

Environment `release`, conferido por **captura**:

- revisor obrigatório `caiolunardi`;
- *Prevent self-review* desligado (modelo A: o único mantenedor aprova a própria rodada);
- sem bypass de administrador;
- só o ramo `main`, sem tags como origem.

A trava do script (`ferramentas/release/publicar_release.sh`, fase 0) exige que a rodada em andamento tenha uma aprovação `approved`, de um usuário, no environment `release`. Faltando isso, ou se a leitura falhar, o script para antes de qualquer escrita. Uma variável no environment não serve de prova (`docs/VERSOES.md`, seção 6).

| Teste | Rodada | Resultado | Evidência |
|---|---|---|---|
| E2: rejeitar | 39526102748 (`main`, `0c6f71b`) | rejeitada; nada publicado | **API:** aprovação `rejected` por `caiolunardi` no environment `release` |
| E3: aprovar uma versão inválida | 39526964799 (`main`, `0c6f71b`) | aprovada; a trava aceitou; o commit passou nas conferências; a tag `teste-v0.0` foi recusada ("Pasta sistemas/teste não existe"); nada publicado | **API:** aprovação `approved`, `type: User`, environment `release`. Log conferido pelo responsável. `teste-v0.0` inexistente como tag e como Release (404) |

O que foi comprovado:

- a rejeição impede a publicação;
- a aprovação é lida pela trava com o formato real da API;
- depois da aprovação, uma versão inválida é recusada antes de qualquer escrita.

**O que ainda não foi comprovado:** uma publicação legítima de ponta a ponta, com a aprovação, todas as conferências passando e a tag e a Release criadas com os rulesets ativos. Ela acontece na próxima versão real de um sistema, com autorização própria.

## 6. Segurança complementar

| Recurso | Estado | Evidência |
|---|---|---|
| Relato privado de vulnerabilidade | ligado | **API**. O `SECURITY.md` foi atualizado |
| Secret scanning e push protection | ligados | **API**. Complementam a varredura própria (`ferramentas/verificar_publicacao.js`), que continua na CI |
| Atualizações de segurança do Dependabot | ligadas | **API** |
| Alertas do Dependabot e grafo de dependências | ligados | **Captura** |
| Atualizações de versão (`.github/dependabot.yml`) | semanais, para as Actions e para as dependências de teste da Estrutura Curricular | o Dependabot abriu os PRs #12 e #13 |
| Actions: só do dono e do GitHub, SHA completo obrigatório | configurado | **Captura**. A captura do primeiro bloco não foi refeita depois de recarregar a página: é uma limitação da evidência, não um erro encontrado |
| Token padrão só leitura; Actions não criam nem aprovam PR | configurado | **Captura**. A CI pede `contents: read`; o Release pede `contents: write`, `actions: read` e `pull-requests: read` só no job dele |
| Aprovação para rodar workflows de colaborador externo | todos os externos | **Captura** |
| Retenção dos logs do Actions | 90 dias | **Captura** |
| CodeQL, varredura por IA, correção automática, agrupamento de atualizações de segurança | não ligados nesta etapa | decisão do responsável |

A CI do PR de encerramento é a primeira rodada depois das restrições do Actions. A rodada e o resultado estão registrados no próprio PR.

## 7. Integridade dos sistemas Apps Script

A implantação mudou só o repositório e as configurações do GitHub. Nenhum dos quatro PRs, nem o de encerramento, altera arquivo em `sistemas/`.

Durante a implantação não houve:

- `clasp pull`, `push`, `deploy` nem `redeploy`;
- acesso aos projetos Apps Script;
- mudança em implantação `/exec`, Script Properties, gatilhos, planilhas ou permissões de documentos.

As restrições de acesso informadas pelo responsável para a Comunidade IPUSP e o Gerenciador de Trancamento Total ("somente eu") continuam valendo até a autorização no servidor estar implementada e homologada.

## 8. Riscos residuais

Riscos conhecidos e aceitos nesta etapa, não falhas novas.

| # | Risco | Impacto | Prioridade | O que existe hoje |
|---|---|---|---|---|
| R1 | **Identidade compartilhada.** O agente usa as credenciais do responsável, e o GitHub registra as operações dele como feitas por `caiolunardi` (merges do #10 e do #11, pushes, comentários) | alto | alta | a política dos agentes; a autorização escrita, registrada na conversa e no PR |
| R2 | **Sem aprovação independente obrigatória.** O ruleset exige PR e CI, não a aprovação de outra pessoa. Com o mesmo acesso, um agente consegue tecnicamente fazer o merge de um PR verde ou aprovar uma rodada do Release pela API | alto | alta | a regra de que todo merge pede autorização explícita ([fluxo](FLUXO_DE_MUDANCAS.md)). É obrigação do processo, não garantia técnica |
| R3 | **Autorização no servidor** ausente na leitura da Comunidade IPUSP e em todo o Gerenciador de Trancamento Total | alto, se o acesso da implantação for aberto | alta | contenção pela opção "somente eu"; [proposta](../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md) NÃO IMPLEMENTADA |
| R4 | **Equivalência com o Google.** A conferência compara os arquivos do editor; não prova o que o `/exec` executa, nem a configuração do projeto | médio | média | aviso da própria ferramenta e [implantação](../IMPLANTACAO.md), seção 4 |
| R5 | **Publicação legítima não testada** de ponta a ponta com os rulesets ativos | médio | média | trava e conferências testadas (52 casos simulados, E2 e E3 reais); falha fecha sem publicar |
| R6 | **Criação de tags livre.** Quem tem escrita pode criar uma tag `*-v*` e ocupar o nome de uma versão futura. Isso não gera Release aprovada, mas o Release recusa a versão se a tag estiver em outro commit | baixo | baixa | o ruleset impede mover e apagar; o Release confere o commit da tag |
| R7 | **Alertas e PRs do Dependabot** recém-ligados pedem triagem. O #13 sobe o `pdfjs-dist` em versão maior e pode quebrar os testes de PDF | baixo | média | cada PR passa pela CI e pelo merge autorizado; auto-merge desligado |
| R8 | **Evidência por captura.** Environment, permissões do Actions e alertas do Dependabot foram conferidos só pela tela | baixo | baixa | conferir de novo pela tela a cada mudança, registrando na [proteção](PROTECAO_DO_MAIN.md#1-situação-em-21102026) |
| R9 | **Titularidade.** Conta pessoal com um único administrador | médio | média | [decisões pendentes](README.md#3-decisões-pendentes) |

## 9. Projetos futuros

Registrados aqui, não iniciados. Cada um precisa de mandato e PR próprios.

1. **Separar identidades e permissões dos agentes:**
   - uma conta ou um app do GitHub só com escrita em ramos e sem administração;
   - merge e aprovação do environment reservados às pessoas;
   - fecha os riscos R1 e R2.
2. **Autorização efetiva no servidor** da Comunidade IPUSP e do Gerenciador:
   - a proposta do #10, com testes negativos e homologação no `/dev`;
   - só depois disso, avaliar abrir o acesso (risco R3).
3. **Controle institucional de acesso:**
   - repositório numa organização da USP, com dois administradores;
   - segundo responsável e o modelo B ([proteção, seção 4](PROTECAO_DO_MAIN.md#4-quem-publica-e-quem-autoriza-dois-modelos));
   - fecha o risco R9.
4. **Auditoria e retenção de registros:** prazos definidos com o Encarregado de Dados ([proposta](../seguranca/propostas/LOGS_E_RETENCAO.md)).
5. **Reprodutibilidade das implantações:**
   - versionar os manifestos `appsscript.json` que faltam, sistema por sistema;
   - registrar a versão da implantação de cada `/exec` (risco R4).
6. **Revisão independente por múltiplos agentes:** revisor em sessão separada, com parecer publicado no PR ([revisão](REVISAO.md)).
7. **Primeira publicação legítima** acompanhada, para fechar os riscos R5 e o pendente da seção 4.
