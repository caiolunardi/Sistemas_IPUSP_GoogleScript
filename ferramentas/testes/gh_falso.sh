#!/usr/bin/env bash
# GitHub CLI falso para testar_publicar_release.js. Lê respostas gravadas em
# $GH_FALSO/api/<caminho com / ? & = trocados por _>.json, no formato da API
# real (só os campos usados). Arquivo .erro no lugar do .json: HTTP 500.
# "release create" cria a tag (leve) no repositório de origem, como a API faz.
set -euo pipefail
chave() { printf '%s' "$1" | tr '/?&=' '____'; }
log() { printf '%s\n' "$*" >> "$GH_FALSO/chamadas.log"; }
case "$1 $2" in
  "api "*)
    caminho=$2; shift 2; jqexpr=""
    while [ $# -gt 0 ]; do case "$1" in --jq) jqexpr=$2; shift 2 ;; *) shift ;; esac; done
    log "api $caminho"
    f="$GH_FALSO/api/$(chave "$caminho")"
    if [ -e "$f.erro" ]; then echo "gh: Server Error (HTTP 500)" >&2; exit 1; fi
    if [ ! -e "$f.json" ]; then echo "gh: Not Found (HTTP 404)" >&2; exit 1; fi
    if [ -n "$jqexpr" ]; then jq -r "$jqexpr" "$f.json"; else cat "$f.json"; fi ;;
  "release create")
    tag=$3; shift 3; alvo=""; notas=""
    while [ $# -gt 0 ]; do case "$1" in --target) alvo=$2; shift 2 ;; --notes-file) notas=$2; shift 2 ;; *) shift ;; esac; done
    log "release create $tag $alvo"
    if [ -e "$GH_FALSO/falhar_release_$tag" ]; then echo "gh: Server Error (HTTP 502)" >&2; exit 1; fi
    # Como a API: se a tag não existe, nasce no alvo; se existe, o alvo é ignorado.
    git -C "$GH_ORIGEM" rev-parse -q --verify "refs/tags/$tag" >/dev/null || git -C "$GH_ORIGEM" tag "$tag" "$alvo"
    printf '{"tag_name":"%s"}' "$tag" > "$GH_FALSO/api/$(chave "repos/$GH_REPO/releases/tags/$tag").json"
    cp "$notas" "$GH_FALSO/notas_$tag" ;;
  *) echo "gh falso: comando não previsto: $*" >&2; exit 2 ;;
esac
