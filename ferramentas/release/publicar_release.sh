#!/usr/bin/env bash
# Confere um commit do main e cria a(s) Release(s) de versão de sistema.
# Chamado só pelo workflow .github/workflows/release.yml; testes em
# ferramentas/testes/testar_publicar_release.js. Documentação: docs/VERSOES.md.
#
# Entradas (variáveis de ambiente):
#   REPO           dono/repositório
#   TAGS           tag(s) <sistema>-v<versão>, separadas por espaço
#   COMMIT_PEDIDO  SHA completo do commit
#   GH             comando do GitHub CLI (padrão: gh; os testes trocam por um falso)
#   GITHUB_RUN_ID  rodada do workflow (o GitHub Actions define; fora dele, falta e o script para)
#
# Antes de tudo, a trava (fase 0): sem registro de aprovação humana desta
# rodada no environment "release", nada é conferido nem escrito.
# Depois, duas fases. Na primeira, tudo é conferido e nada é escrito: o commit, o pull
# request, a CI e cada tag. Só se tudo passar, a segunda cria as Releases.
# A tag nasce junto com a Release (uma única chamada à API), então não existe
# tag criada por este script sem Release. Nada é apagado nem movido, nunca.
set -euo pipefail
set -f   # sem expansão de * e ? nas tags informadas

GH="${GH:-gh}"
falhar() { echo "::error::$*"; exit 1; }

# ---------------------------------------------------------------- fase 0: trava
# O GitHub só registra uma aprovação de environment quando o environment tem
# revisores obrigatórios e alguém aprovou ESTA rodada. Sem environment, com
# environment vazio (o GitHub o cria assim na primeira rodada) ou sem
# revisores, não há registro e o script para. Uma variável (vars.*) não serve
# de prova: o contexto vars junta repositório, organização e environment, sem
# dizer de onde veio o valor. Fronteira: a aprovação em si é do GitHub; aqui só
# se confere que ela existe para a rodada em andamento deste workflow no main.
[[ "${GITHUB_RUN_ID:-}" =~ ^[0-9]+$ ]] || falhar "Sem GITHUB_RUN_ID: este script só publica dentro do workflow Release, depois da aprovação no environment \"release\"."
RODADA=$("$GH" api "repos/$REPO/actions/runs/$GITHUB_RUN_ID" --jq \
  'select(.path == ".github/workflows/release.yml" and .head_branch == "main" and .event == "workflow_dispatch" and .status == "in_progress") | .id') \
  || falhar "Não consegui consultar a rodada $GITHUB_RUN_ID."
[ "$RODADA" = "$GITHUB_RUN_ID" ] || falhar "A rodada $GITHUB_RUN_ID não é uma rodada em andamento do workflow Release no main."
APROVADOR=$("$GH" api "repos/$REPO/actions/runs/$GITHUB_RUN_ID/approvals" --jq \
  '[.[] | select(.state == "approved" and .user.type == "User" and any(.environments[]; .name == "release")) | .user.login] | first // empty') \
  || falhar "Não consegui consultar as aprovações da rodada $GITHUB_RUN_ID."
[ -n "$APROVADOR" ] || falhar "A rodada $GITHUB_RUN_ID não tem aprovação humana no environment \"release\". Configure o environment com revisor obrigatório (docs/governanca/PROTECAO_DO_MAIN.md, seção 4) e aprove a rodada."
echo "Rodada $GITHUB_RUN_ID aprovada no environment release por $APROVADOR."

# ---------------------------------------------------------------- fase 1: conferir
[[ "${COMMIT_PEDIDO:-}" =~ ^[0-9a-f]{40}$ ]] || falhar "Informe o SHA completo do commit (40 caracteres hexadecimais)."
COMMIT=$(git rev-parse --verify --end-of-options "${COMMIT_PEDIDO}^{commit}") || falhar "Commit $COMMIT_PEDIDO não encontrado."
git fetch --no-tags -q origin main
MAIN=$(git rev-parse --verify origin/main)

# 1. Linha principal: o commit está na sequência de primeiros pais do main.
#    Um commit que só entrou como segundo pai de um merge (a ponta ou um
#    commit intermediário do ramo do PR) é ancestral do main, mas não é um
#    estado que o main teve; não serve.
#    (Lista em arquivo: com "| grep -q" e pipefail, o SIGPIPE do rev-list
#    faria a conferência falhar para commits recentes.)
git rev-list --first-parent "$MAIN" > "${RUNNER_TEMP:-/tmp}/primeiros-pais"
grep -qx "$COMMIT" "${RUNNER_TEMP:-/tmp}/primeiros-pais" \
  || falhar "O commit $COMMIT não é um estado do main (não está na linha de primeiros pais). Use o commit de merge do PR."

# 2. É o commit que um PR aceito criou no main: merge_commit_sha == COMMIT.
#    O endpoint também devolve o PR para os commits do ramo dele, então só a
#    associação não basta.
PR=$("$GH" api "repos/$REPO/commits/$COMMIT/pulls" --jq \
  "[.[] | select(.merged_at != null and .base.ref == \"main\" and .merge_commit_sha == \"$COMMIT\") | .number] | first // empty") || falhar "Não consegui consultar os pull requests do commit."
[ -n "$PR" ] || falhar "O commit $COMMIT não é o commit de merge de um pull request aceito no main."

# 3. CI: rodada do ci.yml, evento push, ramo main, este SHA, concluída com
#    sucesso, e com a etapa agregada "CI concluída" verde. Os filtros da
#    consulta são repetidos no jq: não dependemos de a API aplicá-los.
RUN=$("$GH" api "repos/$REPO/actions/workflows/ci.yml/runs?head_sha=$COMMIT&event=push&branch=main&per_page=100" --jq \
  "[.workflow_runs[] | select(.head_sha == \"$COMMIT\" and .event == \"push\" and .head_branch == \"main\"
     and .path == \".github/workflows/ci.yml\" and .status == \"completed\" and .conclusion == \"success\")]
   | max_by(.id) // empty | \"\(.id) \(.run_attempt)\"") || falhar "Não consegui consultar as rodadas da CI."
[ -n "$RUN" ] || falhar "Não há rodada concluída e verde da CI (push no main) para o commit $COMMIT."
RUN_ID=${RUN% *}; RUN_TENTATIVA=${RUN#* }
CONCLUIDA=$("$GH" api "repos/$REPO/actions/runs/$RUN_ID/jobs?per_page=100" --jq \
  '[.jobs[] | select(.name == "CI concluída" and .status == "completed" and .conclusion == "success")] | length') || falhar "Não consegui consultar as etapas da rodada $RUN_ID."
[ "$CONCLUIDA" = "1" ] || falhar "A rodada $RUN_ID da CI não tem a etapa \"CI concluída\" verde (CI anterior à verificação agregada?)."
echo "Commit $COMMIT: estado do main, merge do PR #$PR, CI verde (rodada $RUN_ID, tentativa $RUN_TENTATIVA)."

# 4. Cada tag, antes de qualquer escrita.
read -r -a LISTA <<< "${TAGS:-}"
[ "${#LISTA[@]}" -gt 0 ] || falhar "Nenhuma tag informada."
declare -A VISTA=()
CRIAR=()
for TAG in "${LISTA[@]}"; do
  [[ "$TAG" =~ ^[a-z0-9]+(-[a-z0-9]+)*-v[0-9]+(\.[0-9]+)*$ ]] || falhar "Tag fora do formato <sistema>-v<versão>: $TAG"
  [ -z "${VISTA[$TAG]:-}" ] || falhar "Tag repetida: $TAG"
  VISTA[$TAG]=1
  sistema="${TAG%-v*}"
  pasta="sistemas/${sistema}"
  case "$sistema" in
    *-gerenciador) pasta="sistemas/${sistema%-gerenciador}/gerenciador" ;;
    planilha-secretarias) pasta="sistemas/estrutura-curricular/planilha-grade" ;;
  esac
  git cat-file -e "$COMMIT:$pasta" 2>/dev/null || falhar "Pasta $pasta não existe no commit (tag $TAG)."
  git cat-file -e "$COMMIT:notas-de-versao/$TAG.md" 2>/dev/null \
    || falhar "Faltam as notas notas-de-versao/$TAG.md no commit: a versão não foi preparada nele."

  # Estado remoto da tag, lido do GitHub agora (não do clone).
  remoto=$(git ls-remote --tags origin "refs/tags/$TAG" "refs/tags/$TAG^{}") || falhar "Não consegui ler as tags do GitHub."
  if [ -n "$remoto" ]; then
    alvo=$(awk -v t="refs/tags/$TAG^{}" '$2 == t {print $1}' <<< "$remoto")
    [ -n "$alvo" ] || alvo=$(awk '{print $1; exit}' <<< "$remoto")   # tag leve
    [ "$alvo" = "$COMMIT" ] || falhar "A tag $TAG já existe em outro commit ($alvo). Tags não são movidas: use a versão seguinte."
  fi
  if saida=$("$GH" api "repos/$REPO/releases/tags/$TAG" --jq '.tag_name' 2>&1); then
    [ -n "$remoto" ] || falhar "Existe Release $TAG sem tag no GitHub. Confira à mão."
    echo "$TAG: tag e Release já existem neste commit; nada a fazer."
    continue
  elif ! grep -q "HTTP 404" <<< "$saida"; then
    falhar "Não consegui conferir a Release $TAG: $saida"
  fi
  CRIAR+=("$TAG")
done

[ "${#CRIAR[@]}" -gt 0 ] || { echo "Nada a criar."; exit 0; }
echo "Conferido. Vou criar: ${CRIAR[*]}"

# ---------------------------------------------------------------- fase 2: criar
# Se uma Release falhar no meio, as anteriores ficam (não apagamos nada) e o
# erro diz quais faltam. Rodar de novo com as mesmas entradas completa o que
# faltou: as já criadas caem em "nada a fazer".
FEITAS=()
for TAG in "${CRIAR[@]}"; do
  notas="${RUNNER_TEMP:-/tmp}/notas-$TAG.md"
  {
    git show "$COMMIT:notas-de-versao/$TAG.md"
    echo
    echo "---"
    echo "Commit da versão: \`$COMMIT\` · merge do PR #$PR · CI verde na rodada $RUN_ID · publicação aprovada por $APROVADOR na rodada $GITHUB_RUN_ID do workflow Release."
  } > "$notas"
  if ! "$GH" release create "$TAG" --repo "$REPO" --target "$COMMIT" --title "$TAG" --notes-file "$notas"; then
    falhar "Falhou ao criar $TAG. Criadas nesta rodada: ${FEITAS[*]:-nenhuma}. Rode de novo com as mesmas entradas para completar."
  fi
  # A API ignora o --target se a tag já existir; confere onde ela ficou.
  alvo=$(git ls-remote --tags origin "refs/tags/$TAG" "refs/tags/$TAG^{}" | awk -v t="refs/tags/$TAG^{}" '$2 == t {p=$1} {f=f?f:$1} END {print p?p:f}')
  [ "$alvo" = "$COMMIT" ] || falhar "A Release $TAG ficou numa tag em $alvo, não em $COMMIT. Não apaguei nada: confira à mão."
  FEITAS+=("$TAG")
  echo "$TAG criada no commit $COMMIT."
done
