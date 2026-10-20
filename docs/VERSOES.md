# Versões e Releases

Cada sistema tem a própria versão, porque cada um é um projeto Apps Script independente. No GitHub, uma versão vira uma **tag** e uma **Release**: a aba **Releases** do repositório mostra, por sistema, o que mudou e qual commit tem o código daquela versão.

Uma Release **marca o código do repositório**. Ela não publica nada no Google, e o GitHub não sabe o que está implantado. Quem implanta registra isso na Release (seção 4).

## 1. Formato da tag

`<sistema>-v<versão>`, com o nome da pasta em `sistemas/`:

| Sistema | Exemplo de tag |
|---|---|
| Painel de Solicitações | `painel-solicitacoes-v1.5` |
| Painel de Sistemas (servidores) | `painel-servidores-v1.3` |
| Grade Horária visual | `grade-horaria-visual-v2.0` |
| Estrutura Curricular e Grade Horária | `estrutura-curricular-v1.11.3` |
| Comunidade IPUSP | `busca-alunos-v1.3` |
| Exclusão de Disciplinas (formulário) | `exclusao-disciplinas-v1.2` |
| Trancamento Parcial (formulário) | `trancamento-parcial-v1.2` |
| Trancamento Total (formulário) | `trancamento-total-v1.3` |
| Gerenciador de Trancamento Total | `trancamento-total-gerenciador-v1.1` |
| Planilha das secretarias | `planilha-secretarias-v1.1` |

Gerenciadores usam o sufixo `-gerenciador` (código em `sistemas/<sistema>/gerenciador/`). Os formulários com gerenciador usam o nome do sistema sem sufixo.

A **Planilha das secretarias** tem código em `sistemas/estrutura-curricular/planilha-grade/` e documentação em `docs/sistemas/planilha-grade-secretarias/`; o workflow conhece esse caminho.

## 2. Quando subir a versão

O número é o mesmo do código (constante ou rodapé, quando existir) e dos documentos do sistema ([roteiro](ATUALIZAR_DOCUMENTACAO.md#2-em-todo-sistema-alterado)).

- **Último número** (1.11.2 → 1.11.3): correção ou ajuste que não muda o uso.
- **Número do meio** (1.4 → 1.5): função nova, tela nova ou mudança de regra que quem usa percebe.
- **Primeiro número** (1.x → 2.0): o sistema foi refeito, ou a mudança exige outra planilha, outra configuração ou outro modo de uso.

Mudança só em documentação ou em testes não sobe a versão nem gera tag.

## 3. Como criar uma versão

Uma Release só marca código **integrado e aprovado**. O workflow **Release** ([`release.yml`](../.github/workflows/release.yml), que chama [`ferramentas/release/publicar_release.sh`](../ferramentas/release/publicar_release.sh)) confere tudo antes de escrever qualquer coisa e, se uma conferência falhar, nada é criado e o log diz qual (seção 6).

1. A mudança, a documentação, os testes e `notas-de-versao/<tag>.md` (o que mudou para quem usa, o que copiar para o Apps Script e a linha **Implantação: ainda não implantada**) entram no `main` **pelo mesmo pull request**. Sem as notas naquele commit, a Release é recusada.
2. Depois do merge, espere a CI do **commit de merge** no `main` ficar ✓ (com a etapa **CI concluída**) e copie o SHA completo dele (na página do PR, "merged commit …", ou na página do commit).
3. **Actions → Release → Run workflow**, com o ramo `main` selecionado. Informe a tag (por exemplo `exclusao-disciplinas-v1.3`; várias, separadas por espaço) e o **commit**. Se o environment `release` estiver configurado ([proteção](governanca/PROTECAO_DO_MAIN.md#4-quem-publica-e-quem-autoriza-dois-modelos)), a rodada espera a aprovação em **Review deployments**.
4. A Release usa o texto de `notas-de-versao/<tag>.md` **daquele commit** e acrescenta no fim o SHA, o número do PR e a rodada da CI conferidos. A tag é criada pela própria Release, no commit informado (tag leve).

Tag enviada pelo git (`git push origin <tag>`) **não** gera Release: o gatilho por push de tag foi retirado em 20/10/2026, porque a tag já existiria antes de qualquer conferência. Não envie tags de versão pelo git.

Rodar de novo com as mesmas entradas não muda o que já existe e completa o que faltou. Uma tag que já existe em outro commit é recusada. Não mova nem apague uma tag já enviada; se algo saiu errado, crie a versão seguinte. Um agente de IA não roda o Release sem ordem explícita do responsável para aquela versão ([fluxo](governanca/FLUXO_DE_MUDANCAS.md)).

## 4. Quando a versão for implantada no Google

Edite a Release no GitHub (**Releases → a versão → editar**) e troque a linha de implantação por **Implantada em DD/MM/AAAA** (e, se houver, "homologada no `/exec` de homologação em …"). Atualize também o README do sistema em `docs/sistemas/<sistema>/`, que é onde o estado de implantação fica registrado.

## 5. Primeiras tags (20/10/2026)

As tags abaixo foram criadas de uma vez pelo **Run workflow**, quando o versionamento começou, e todas apontam para o mesmo commit do `main` (posterior ao `release.yml`). As notas de cada uma dizem em que commit anterior a versão foi concluída. As versões seguintes apontam para o próprio commit.

| Tag | Versão concluída no commit |
|---|---|
| `painel-solicitacoes-v1.5` | `6d702d3` |
| `painel-servidores-v1.0` | `8ba2026` (primeiro número dado a este painel) |
| `grade-horaria-visual-v2.0` | `a01b8ec` |
| `estrutura-curricular-v1.11.3` | `4ce9137` |
| `busca-alunos-v1.3` | `226d8c0` |
| `exclusao-disciplinas-v1.2` | `d127b0c` |
| `trancamento-parcial-v1.2` | `d127b0c` |
| `trancamento-total-v1.3` | `d127b0c` |
| `trancamento-total-gerenciador-v1.1` | `519ee25` |

### Tags anteriores à verificação (registro)

As tags criadas antes da verificação acima não passaram por ela ([diagnóstico](governanca/DIAGNOSTICO_2026-10-20.md), achados R2 e R3) e **não são movidas**:

- as 9 tags da tabela acima apontam para `a7c3120`, cuja rodada da CI foi cancelada por um push seguinte (sem veredito);
- `estrutura-curricular-v1.12.0`, `grade-horaria-visual-v2.1` e `planilha-secretarias-v1.1` apontam para `930e677`, cuja CI falhou num teste de tela intermitente de outro sistema (corrigido em `fa89877`);
- `painel-servidores-v1.1` e `v1.2` apontam para `a36a33f`, que já contém o código da 1.3. O código de cada versão está em `9a3d6fb` (1.1) e `03617d0` (1.2).

## 6. O que o workflow Release confere (e o que não confere)

Testes: [`ferramentas/testes/testar_publicar_release.js`](../ferramentas/testes/testar_publicar_release.js), na CI, com repositórios git temporários e um GitHub falso que responde no formato da API real. Nada é criado no GitHub pelos testes.

| Conferência | Como | Por que assim |
|---|---|---|
| SHA completo e existente | 40 caracteres hexadecimais; `git rev-parse` | SHA curto pode ficar ambíguo |
| **Estado do `main`** | o commit está na linha de **primeiros pais** do `main` | a ponta e os commits intermediários do ramo de um PR também são ancestrais do `main`, mas nunca foram o `main` nem tiveram CI de push |
| **Commit de merge de PR aceito** | em `commits/{sha}/pulls`, um PR com `merged_at`, base `main` e `merge_commit_sha` **igual ao commit** | a API devolve o PR também para os commits do ramo dele (abaixo); só "há um PR associado" não prova nada |
| **CI do SHA exato** | rodada de `.github/workflows/ci.yml` com `head_sha` = commit, evento `push`, ramo `main`, `status: completed`, `conclusion: success`; os filtros são repetidos no código, não só na consulta | não depender de a API aplicar os filtros |
| **Etapa "CI concluída" verde** | nos jobs da última rodada que passou | garante que a rodada é do `ci.yml` com a etapa agregada; rodadas anteriores a ela não servem |
| Tags | formato, sem repetição, pasta do sistema e `notas-de-versao/<tag>.md` **no commit**; estado da tag lido do GitHub na hora (`git ls-remote`), seja leve ou anotada | tudo antes de qualquer escrita: uma tag inválida no meio da lista impede todas |
| Escrita | `gh release create --target <commit>`: a tag nasce com a Release, numa só chamada; depois, confere onde a tag ficou | não existe "tag criada, Release não"; se a API usar uma tag que surgiu entre a conferência e a criação, o erro aparece |

**Comportamento real da API neste repositório** (consultado em 20/10/2026, só leitura):

| Commit | Tipo | `commits/{sha}/pulls` | Primeiros pais do `main`? | Resultado |
|---|---|---|---|---|
| `0468ed6` | merge commit do PR #4 | PR #4, `merge_commit_sha` = `0468ed6` | sim | elegível, se tiver CI verde (não tem: rodada cancelada) |
| `19b4a78` | ponta do ramo do PR #4 (2º pai do merge) | **PR #4 também** | não | recusado |
| `68daeee`, `4b7a5d4` | squash dos PRs #7 e #3 | o PR, `merge_commit_sha` = o commit | sim | elegível, se tiver CI |
| `fa89877`, `71f6a25` | push direto no `main` | `[]` | sim | recusado |

Nenhum PR deste repositório foi integrado por rebase; os testes cobrem o caso com a regra acima (só o último commit, que é o `merge_commit_sha`, passa). Os merges dos PRs #4 e #6 chegaram ao `main` num mesmo push (mesmo horário de `merged_at`, e o `4baf790` não teve rodada própria da CI), e a API registrou o `merge_commit_sha` de cada um corretamente.

**O que fica fora:**

- O conteúdo da CI é o do `ci.yml` **daquele commit**. Um PR que enfraqueça a CI e seja aceito produz commits "verdes". A defesa é a revisão (`.github/` tem dono no `CODEOWNERS` e é classe crítica), não o Release.
- Uma reexecução manual que passou conta como verde (a rodada guarda o resultado da última tentativa, e as notas registram a rodada). Reexecutar até passar não é aceito pelo [fluxo](governanca/FLUXO_DE_MUDANCAS.md); o Release não tem como distinguir.
- Commits anteriores à etapa "CI concluída" (antes deste PR) não são elegíveis. Uma versão antiga só pode virar Release com um commit novo no `main` (por exemplo, o das notas), ou criada à mão pelo responsável em **Releases → Draft a new release**, registrando o motivo.
- O workflow não confere se o número da versão bate com a constante no código; confere que as notas daquela tag estão no commit.
- Sem o environment `release` configurado, ninguém aprova a rodada: quem pode rodar o workflow (escrita no repositório) publica.

**Falha no meio de várias tags:** todas são conferidas antes; se a API falhar ao criar a segunda Release, a primeira fica (nada é apagado automaticamente, para não destruir uma versão válida por um erro de rede) e o erro diz o que foi criado. Rodar de novo com as mesmas entradas cria só o que faltou.

