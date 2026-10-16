#!/usr/bin/env bash
# Roda TODAS as suítes e guarda os logs em saida/logs/, cada um com o
# comando, a data, a expectativa, o código de saída real, a duração, a
# interpretação e a impressão digital (SHA-256) do conjunto de fontes e
# testes usado — para que o log corresponda aos mesmos bytes entregues.
# Uso:
#   CSV=/caminho/grade_curricular.csv PDF=/caminho/grade_curricular.pdf \
#   UNIDADE=/caminho/disciplinas_unidade.csv \
#   [DIR_SRC_V100=/caminho/fonte-1.0.0/src] [DIR_SRC_ANTERIOR=/caminho/fonte-1.1.0/src] \
#   [DIR_SRC_V124=/caminho/fonte-1.2.4/src] [DIR_SRC_V130=/caminho/fonte-1.3.0/src] [DIR_SRC_V131=/caminho/fonte-1.3.1/src] \
#   [DIR_SRC_V180=/caminho/fonte-1.8.0/src] [DIR_SRC_V181=/caminho/fonte-1.8.1/src] [DIR_SRC_V182=/caminho/fonte-1.8.2/src] \
#   [DIR_SRC_V183=/caminho/fonte-1.8.3/src] [DIR_SRC_V184=/caminho/fonte-1.8.4/src] [DIR_SRC_V185=/caminho/fonte-1.8.5/src] [DIR_SRC_V186=/caminho/fonte-1.8.6/src] [DIR_SRC_V187=/caminho/fonte-1.8.7/src] \
#   [DIR_SRC_V188=/caminho/fonte-1.8.8/src] [DIR_SRC_V189=/caminho/fonte-1.8.9/src] [DIR_SRC_V1810=/caminho/fonte-1.8.10/src] [DIR_SRC_V1811=/caminho/fonte-1.8.11/src] [DIR_SRC_V1812=/caminho/fonte-1.8.12/src] \
#   [DIR_SRC_V1813=/caminho/fonte-1.8.13/src] [DIR_SRC_V1814=/caminho/fonte-1.8.14/src] \
#   ./rodar_suites.sh
# Sem DIR_SRC_V100, DIR_SRC_V124, DIR_SRC_V130 ou DIR_SRC_V131, os testes de migração correspondentes
# são registrados como PULADOS (não aprovados). Com DIR_SRC_V180, as suítes da Etapa 1 rodam
# também na fonte 1.8.0, para mostrar o defeito (lá as falhas são o resultado esperado); com
# DIR_SRC_V181 e DIR_SRC_V182, as da Etapa 2 rodam também na 1.8.1 e na 1.8.2, pelo mesmo motivo;
# com DIR_SRC_V183, a da Etapa 3 roda também na 1.8.3; com DIR_SRC_V184, as da Etapa 4 na 1.8.4;
# com DIR_SRC_V185, as da Etapa 4 (com os casos da correção complementar) também na 1.8.5;
# com DIR_SRC_V186, as da Etapa 5 (ações em lote) também na 1.8.6; com DIR_SRC_V187, a da Etapa 5
# no navegador também na 1.8.7 (aviso de recarga depois de "Concluir ação pendente"); com DIR_SRC_V188,
# as da Etapa 6 (oferta ajustada depois de troca de currículo) também na 1.8.8, e o caso G (base
# legada) usa a 1.8.8 para criar a base — sem ela, G fica PULADO; com DIR_SRC_V189, as da Etapa 6
# também na 1.8.9 (restauração explícita da oferta ao Júpiter, correção complementar 1.8.10); com
# DIR_SRC_V1810, a da Etapa 7 (trava do envio e da auditoria) também na 1.8.10; com DIR_SRC_V1811,
# as da Etapa 8 (confirmação vinculada ao conteúdo da prévia) também na 1.8.11; com DIR_SRC_V1812, a da
# Etapa 8 no navegador (ampliada na correção complementar 1.8.13) também na 1.8.12; com DIR_SRC_V1813,
# as da Etapa 9 (este executor e o resultado do envio sem o link da auditoria) também na 1.8.13 — o
# executor testado é o ../testes/rodar_suites.sh irmão da pasta src —, e o controle C3 de testar_executor.js
# usa esse executor real; com DIR_SRC_V1814, testar_executor.js também contra o executor (e o
# testar_executor.js) da 1.8.14 (correção complementar 1.8.15).
#
# (1.8.14) CONTRATO DO RESULTADO
#   Cada chamada declara o resultado ESPERADO:
#     suite NOME EVIDENCIA comando…            suíte atual ou roteiro descritivo: tem de terminar com 0
#                                              (e, se imprimir o resumo "N ok … M falha", com M = 0);
#     reproducao NOME OK/TOTAL EVIDENCIA comando…
#                                              reprodução de um defeito numa fonte ANTIGA: só é
#                                              "confirmada" se terminar com 1 (convenção das suítes para
#                                              asserções reprovadas) E imprimir o resumo da suíte com
#                                              exatamente OK aprovados em TOTAL — prova de que chegou às
#                                              verificações e mostrou o defeito previsto. Terminar com 0
#                                              ou com outro resumo = DIVERGENTE; outro código ou nenhum
#                                              resumo (módulo ausente, entrada ausente, exceção antes das
#                                              asserções — ainda que com código 1) = ERRO de infraestrutura.
#   EVIDENCIA = arquivo que a suíte grava e que é copiado para saida/logs ("-" = nenhum). Ele é apagado
#   ANTES da suíte: um arquivo de outra rodada nunca passa por evidência atual; se a suíte não o gravar,
#   é ERRO. Fonte histórica opcional ausente = NÃO EXECUTADA (listada, não aprovada); fornecida mas
#   inválida (sem Codigo.gs ou com outra VERSAO_SISTEMA) = ERRO.
#   Código final do processo:
#     0  todas as suítes atuais executadas terminaram com 0, todas as reproduções executadas foram
#        confirmadas e todos os logs, evidências e o resumo foram gravados (verificações opcionais não
#        executadas aparecem no resumo e NÃO contam como aprovadas);
#     1  pelo menos uma suíte atual falhou, uma reprodução divergiu ou teve erro de infraestrutura, uma
#        fonte opcional fornecida é inválida, ou um log/evidência exigida não foi gravado — a rodada
#        continua até o fim para reunir o diagnóstico e só então devolve 1;
#     2  entrada obrigatória (CSV, PDF, UNIDADE) ausente ou ilegível — nada é executado;
#     3  preparação impossível (pasta de saída, limpeza dela, manifesto de hashes ou resumo final).
#   (1.8.15) Uma SUÍTE que termina com 3 declara erro de infraestrutura (convenção de testar_executor.js):
#   é ERRO, tanto como suíte atual quanto como reprodução. A interpretação de cada log é escrita UMA vez,
#   depois de conferir e copiar a evidência; o log traz o código real do processo, o resultado do
#   processo, a situação da evidência e a interpretação final. Se o log não puder ser completado, o erro
#   vai para o stderr e para o resumo.
#   Os códigos individuais ficam em cada log ("# código de saída") e no resumo (saida/logs/resumo.txt).
set -u
cd "$(dirname "$0")" || { echo "rodar_suites: ERRO de preparação — não foi possível entrar na pasta dos testes" >&2; exit 3; }

# ---------------------------------------------------------------- entradas obrigatórias
entrada_invalida() { echo "rodar_suites: ERRO de entrada — $1" >&2; exit 2; }
for VAR in CSV PDF UNIDADE; do
  VAL="${!VAR:-}"
  [ -n "$VAL" ] || entrada_invalida "$VAR não definido (veja o uso no início deste arquivo)"
  { [ -f "$VAL" ] && [ -r "$VAL" ]; } || entrada_invalida "$VAR=$VAL não é um arquivo legível"
done

# ---------------------------------------------------------------- preparação
preparacao_impossivel() { echo "rodar_suites: ERRO de preparação — $1" >&2; exit 3; }
OUT=saida/logs
mkdir -p "$OUT" || preparacao_impossivel "não foi possível criar $OUT"
# Logs, evidências e resumo de rodadas anteriores saem antes (só a pasta de trabalho saida/logs;
# os logs entregues ficam em docs/…/evidencias e não são tocados).
rm -f "$OUT"/*.txt "$OUT"/fontes.sha256 || preparacao_impossivel "não foi possível limpar $OUT"
( cd .. && sha256sum src/* planilha-grade/*.gs testes/*.js testes/*.sh ) > "$OUT/fontes.sha256" || preparacao_impossivel "não foi possível gerar $OUT/fontes.sha256"
[ -s "$OUT/fontes.sha256" ] || preparacao_impossivel "manifesto $OUT/fontes.sha256 vazio"
CONJUNTO=$(sha256sum "$OUT/fontes.sha256" | cut -c1-16)
[ -n "$CONJUNTO" ] || preparacao_impossivel "não foi possível calcular a impressão digital do manifesto"

# ---------------------------------------------------------------- registro dos resultados
APROVADAS=(); FALHAS=(); CONFIRMADAS=(); DIVERGENTES=(); ERROS=(); NAO_EXECUTADAS=(); PULADOS_INTERNOS=()
erro() { ERROS+=("$1: $2"); echo "$1: ERRO — $2"; }
nao_executada() { NAO_EXECUTADAS+=("$1 — $2"); echo "$1: NÃO EXECUTADA — $2"; }

# executar NOME ESPERADO EVIDENCIA comando…   (ESPERADO = "0" ou "falha:OK/TOTAL")
executar() {
  local nome="$1" esperado="$2" evid="$3"; shift 3
  local arq="$OUT/$nome.txt" descricao
  if [ "$esperado" = 0 ]; then descricao="código 0 (suíte atual ou roteiro descritivo)"
  else descricao="reprodução de defeito: código 1 e resumo da suíte com ${esperado#falha:} aprovados"; fi
  if [ "$evid" != "-" ] && ! rm -f "$evid"; then erro "$nome" "não foi possível apagar a evidência anterior $evid"; return; fi
  # (1.8.15) Status da escrita capturado À PARTE: no bash, "if ! { …; } > arq" não detecta a falha
  # do redirecionamento (a negação dá verdadeiro mesmo quando o arquivo não pôde ser aberto).
  local st
  {
    echo "# suíte: $nome"
    echo "# comando: $*"
    echo "# data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# conjunto de fontes e testes (sha256 de fontes.sha256): $CONJUNTO"
    echo "# esperado: $descricao"
    echo
  } > "$arq"
  st=$?
  if [ "$st" -ne 0 ]; then erro "$nome" "não foi possível gravar o log $arq (a suíte não foi executada)"; return; fi
  local t0 rc dur
  t0=$(date +%s)
  "$@" >> "$arq" 2>&1
  rc=$?   # código REAL do processo filho (sem pipeline)
  dur=$(( $(date +%s) - t0 ))
  # Resumo impresso pela suíte ("N ok · M falhas", "N ok, M falha(s)"): o último.
  local linha ok="" nf="" pul="" res cat
  linha=$(grep -E '[0-9]+ ok[^0-9]{1,6}[0-9]+ falha' "$arq" | tail -1)
  if [[ "$linha" =~ ([0-9]+)\ ok[^0-9]+([0-9]+)\ falha ]]; then ok=${BASH_REMATCH[1]}; nf=${BASH_REMATCH[2]}; fi
  pul=$(grep -oE 'pulados: [0-9]+|[0-9]+ pulados' "$arq" | tail -1 | grep -oE '[0-9]+')
  # (1.8.15) Três etapas, nesta ordem, antes de escrever a interpretação (uma só) no log:
  #   1. resultado do PROCESSO: o código real do filho e o resumo que ele imprimiu;
  #   2. EVIDÊNCIA exigida: gravada nesta rodada e copiada para $OUT;
  #   3. classificação FINAL = a do processo, ou ERRO se a evidência faltou ou não foi copiada
  #      (o código do filho continua registrado como ele terminou).
  # Código 3 de uma suíte = erro de infraestrutura declarado por ela (convenção de testar_executor.js:
  # o executor testado não pôde ser preparado ou executado) — nunca é aprovação nem defeito demonstrado.
  if [ "$esperado" = 0 ]; then
    if [ "$rc" -eq 3 ]; then cat=ERRO; res="ERRO de infraestrutura declarado pela suíte (código 3): a verificação não pôde ser feita"
    elif [ "$rc" -ne 0 ]; then cat=FALHA; res="FALHA — código $rc$([ "$rc" -ge 126 ] && echo ' (comando não executável)')"
    elif [ -n "$nf" ] && [ "$nf" -ne 0 ]; then cat=ERRO; res="ERRO — código 0, mas o resumo da suíte diz $nf falha(s)"
    else cat=APROVADA; res="aprovada"; fi
  else
    local eok="${esperado#falha:}"; local etot="${eok#*/}"; eok="${eok%/*}"
    if [ "$rc" -eq 0 ]; then cat=DIVERGENTE; res="DIVERGENTE — terminou com 0; devia demonstrar o defeito ($eok/$etot)"
    elif [ "$rc" -ne 1 ] || [ -z "$ok" ]; then cat=ERRO; res="ERRO de infraestrutura — código $rc$([ "$rc" -eq 3 ] && echo ' (declarado pela suíte)')$([ -z "$ok" ] && echo ', sem o resumo da suíte'): a verificação não chegou a ser feita; NÃO conta como defeito demonstrado"
    elif [ "$ok" -ne "$eok" ] || [ $(( ok + nf )) -ne "$etot" ]; then cat=DIVERGENTE; res="DIVERGENTE — resumo $ok/$(( ok + nf )), esperado $eok/$etot"
    else cat=CONFIRMADA; res="defeito demonstrado como previsto ($ok/$(( ok + nf )))"; fi
  fi
  local resprocesso="$res" resevid="não exigida"
  if [ "$evid" != "-" ]; then
    if [ ! -s "$evid" ]; then resevid="AUSENTE — evidência $evid não foi gravada nesta rodada"
    elif ! cp "$evid" "$OUT/$(basename "$evid")"; then resevid="FALHOU a cópia — não foi possível copiar a evidência $evid para $OUT/$(basename "$evid")"
    else resevid="gravada nesta rodada e copiada para $OUT/$(basename "$evid")"; fi
    case "$resevid" in
      AUSENTE*|FALHOU*) cat=ERRO; res="ERRO de evidência — ${resevid#* — } (o processo terminou com código $rc: $resprocesso)" ;;
    esac
  fi
  { echo; echo "# código de saída: $rc  (duração: $dur s)"; echo "# resultado do processo: $resprocesso"; echo "# evidência: $resevid"; echo "# interpretação: $res"; } >> "$arq"
  st=$?
  if [ "$st" -ne 0 ]; then
    cat=ERRO; res="ERRO de log — não foi possível completar o log $arq (sem a interpretação final); resultado antes disso: $res"
    echo "rodar_suites: $nome: $res" >&2
  fi
  case "$cat" in
    APROVADA) APROVADAS+=("$nome") ;;
    FALHA) FALHAS+=("$nome: $res") ;;
    CONFIRMADA) CONFIRMADAS+=("$nome: $res") ;;
    DIVERGENTE) DIVERGENTES+=("$nome: $res") ;;
    *) ERROS+=("$nome: $res") ;;
  esac
  [ -n "$pul" ] && [ "$pul" -ne 0 ] && PULADOS_INTERNOS+=("$nome: $pul caso(s) PULADO(s) dentro da suíte (ver o log)")
  echo "$nome: código $rc — ${linha:-sem resumo de contagem} — $res"
}
suite() { local nome="$1" evid="$2"; shift 2; executar "$nome" 0 "$evid" "$@"; }
reproducao() { local nome="$1" esp="$2" evid="$3"; shift 3; executar "$nome" "falha:$esp" "$evid" "$@"; }
# exigir_arquivo NOME ARQUIVO: arquivo que uma suíte devia gerar para as seguintes.
exigir_arquivo() { [ -s "$2" ] || erro "$1" "não gerou $2 nesta rodada"; }

# ---------------------------------------------------------------- fontes históricas opcionais
# fonte VAR VERSAO → 0 fornecida e válida; 1 ausente; 2 fornecida e inválida (ERRO registrado uma vez).
fonte() {
  local val="${!1:-}" memo="FONTE_${1}"
  [ -n "$val" ] || return 1
  if [ -z "${!memo:-}" ]; then
    if [ -f "$val/Codigo.gs" ] && grep -q "VERSAO_SISTEMA = '$2'" "$val/Codigo.gs"; then printf -v "$memo" '%s' ok
    else printf -v "$memo" '%s' invalida; erro "$1" "fonte fornecida inválida: $val (esperada a pasta src da versão $2)"; fi
  fi
  [ "${!memo}" = ok ] && return 0 || return 2
}
# Fontes repassadas a suítes ATUAIS (casos de migração internos, já opcionais): ausente → a suíte pula
# esses casos (listados como não executados); inválida → ERRO e a suíte recebe vazio.
interna() {
  if fonte "$1" "$2"; then printf -v "REPASSE_$1" '%s' "${!1}"
  else local st=$?; printf -v "REPASSE_$1" '%s' ''; [ "$st" -eq 1 ] && nao_executada "$3" "$1 não definido"; fi
}
interna DIR_SRC_V100 1.0.0 "testar_gravacao (migração da base 1.0.0)"
interna DIR_SRC_V124 1.2.4 "testar_preparacao (migração 1.2.4)"
interna DIR_SRC_V130 1.3.0 "testar_preparacao (migração 1.3.0)"
interna DIR_SRC_V131 1.3.1 "testar_preparacao (migração 1.3.1)"
interna DIR_SRC_V188 1.8.8 "testar_etapa6_oferta (caso G, base legada 1.8.8)"

# ---------------------------------------------------------------- suítes da fonte atual
# (1.8.15) O controle C3 de testar_executor.js usa o executor REAL da 1.8.13 quando a fonte foi fornecida
# (o irmão ../testes/rodar_suites.sh; se faltar, testar_executor.js termina com 3 = ERRO).
EXECUTOR_1813=""
if fonte DIR_SRC_V1813 1.8.13; then EXECUTOR_1813="$DIR_SRC_V1813/../testes/rodar_suites.sh"; fi
suite testar_executor - env EXECUTOR_1813="$EXECUTOR_1813" node testar_executor.js
rm -f saida/paginas_ocr_navegador.json || erro gerar_paginas_ocr "não foi possível apagar as páginas da rodada anterior"
suite gerar_paginas_ocr - node gerar_paginas_ocr.js "$PDF"
exigir_arquivo gerar_paginas_ocr saida/paginas_ocr_navegador.json
suite testar_backend - node testar_backend.js "$CSV" saida/paginas_ocr_navegador.json
suite testar_gravacao saida/evidencias_gravacao.txt env DIR_SRC_V100="$REPASSE_DIR_SRC_V100" node testar_gravacao.js "$CSV" saida/paginas_ocr_navegador.json
suite testar_preparacao saida/evidencias_preparacao.txt env DIR_SRC_V124="$REPASSE_DIR_SRC_V124" DIR_SRC_V130="$REPASSE_DIR_SRC_V130" DIR_SRC_V131="$REPASSE_DIR_SRC_V131" node testar_preparacao.js "$CSV" "$UNIDADE"
suite testar_envio_grade saida/evidencias_envio_grade.txt node testar_envio_grade.js "$CSV" "$UNIDADE"
suite testar_auditoria_grade saida/evidencias_auditoria_grade.txt node testar_auditoria_grade.js "$CSV" "$UNIDADE"
suite testar_painel_auditoria saida/evidencias_painel_auditoria.txt node testar_painel_auditoria.js "$CSV" "$UNIDADE"
suite testar_etapa1_identidade_outros saida/evidencias_etapa1_identidade_outros.txt node testar_etapa1_identidade_outros.js
suite testar_navegador_etapa1 - node testar_navegador_etapa1.js "$CSV"
suite testar_etapa2_csv_unidade saida/evidencias_etapa2_csv_unidade.txt node testar_etapa2_csv_unidade.js
suite testar_navegador_etapa2 - node testar_navegador_etapa2.js "$CSV"
suite testar_navegador_etapa3 saida/evidencias_etapa3_ficha.txt node testar_navegador_etapa3.js "$CSV"
suite testar_etapa4_salvamento saida/evidencias_etapa4_salvamento.txt node testar_etapa4_salvamento.js "$CSV"
suite testar_navegador_etapa4 - node testar_navegador_etapa4.js "$CSV"
suite testar_etapa5_lotes saida/evidencias_etapa5_lotes.txt node testar_etapa5_lotes.js "$CSV"
suite testar_navegador_etapa5 - node testar_navegador_etapa5.js "$CSV"
suite testar_etapa6_oferta saida/evidencias_etapa6_oferta.txt env DIR_SRC_LEGADO="$REPASSE_DIR_SRC_V188" node testar_etapa6_oferta.js
suite testar_navegador_etapa6 - node testar_navegador_etapa6.js
suite testar_etapa7_trava_auditoria saida/evidencias_etapa7_trava_auditoria.txt node testar_etapa7_trava_auditoria.js
suite testar_etapa8_previa_envio saida/evidencias_etapa8_previa_envio.txt node testar_etapa8_previa_envio.js
suite testar_navegador_etapa8 - node testar_navegador_etapa8.js
suite testar_etapa9_auditoria_envio saida/evidencias_etapa9_auditoria_envio.txt node testar_etapa9_auditoria_envio.js
suite testar_navegador_etapa9 - node testar_navegador_etapa9.js

# ---------------------------------------------------------------- reproduções históricas (defeito ESPERADO)
# (1.8.1) Reprodução do defeito na fonte 1.8.0.
if fonte DIR_SRC_V180 1.8.0; then
  reproducao etapa1_fonte_1.8.0_antes 5/17 saida/evidencias_etapa1_fonte_1.8.0_antes.txt env DIR_SRC="$DIR_SRC_V180" node testar_etapa1_identidade_outros.js --evidencias saida/evidencias_etapa1_fonte_1.8.0_antes.txt
  reproducao navegador_etapa1_fonte_1.8.0_antes 2/6 - env DIR_SRC="$DIR_SRC_V180" node testar_navegador_etapa1.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa1_fonte_1.8.0_antes, navegador_etapa1_fonte_1.8.0_antes" "DIR_SRC_V180 não definido"; fi
# (1.8.2) Reprodução das falhas da etapa 2 na fonte 1.8.1.
if fonte DIR_SRC_V181 1.8.1; then
  reproducao etapa2_fonte_1.8.1_antes 8/31 saida/evidencias_etapa2_fonte_1.8.1_antes.txt env DIR_SRC="$DIR_SRC_V181" node testar_etapa2_csv_unidade.js --evidencias saida/evidencias_etapa2_fonte_1.8.1_antes.txt
  reproducao navegador_etapa2_fonte_1.8.1_antes 1/6 - env DIR_SRC="$DIR_SRC_V181" node testar_navegador_etapa2.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa2_fonte_1.8.1_antes, navegador_etapa2_fonte_1.8.1_antes" "DIR_SRC_V181 não definido"; fi
# (1.8.3) Reprodução das duas falhas da correção complementar na fonte 1.8.2.
if fonte DIR_SRC_V182 1.8.2; then
  reproducao etapa2_fonte_1.8.2_antes 23/31 saida/evidencias_etapa2_fonte_1.8.2_antes.txt env DIR_SRC="$DIR_SRC_V182" node testar_etapa2_csv_unidade.js --evidencias saida/evidencias_etapa2_fonte_1.8.2_antes.txt
  reproducao navegador_etapa2_fonte_1.8.2_antes 1/6 - env DIR_SRC="$DIR_SRC_V182" node testar_navegador_etapa2.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa2_fonte_1.8.2_antes, navegador_etapa2_fonte_1.8.2_antes" "DIR_SRC_V182 não definido"; fi
# (1.8.4) Reprodução do estado assíncrono da ficha na fonte 1.8.3.
if fonte DIR_SRC_V183 1.8.3; then
  reproducao navegador_etapa3_fonte_1.8.3_antes 3/21 saida/evidencias_etapa3_fonte_1.8.3_antes.txt env DIR_SRC="$DIR_SRC_V183" node testar_navegador_etapa3.js "$CSV" --evidencias saida/evidencias_etapa3_fonte_1.8.3_antes.txt
elif [ $? -eq 1 ]; then nao_executada "navegador_etapa3_fonte_1.8.3_antes" "DIR_SRC_V183 não definido"; fi
# (1.8.5) Reprodução da gravação parcial do salvamento individual na fonte 1.8.4.
if fonte DIR_SRC_V184 1.8.4; then
  reproducao etapa4_fonte_1.8.4_antes 3/39 saida/evidencias_etapa4_fonte_1.8.4_antes.txt env DIR_SRC="$DIR_SRC_V184" node testar_etapa4_salvamento.js "$CSV" --evidencias saida/evidencias_etapa4_fonte_1.8.4_antes.txt
  reproducao navegador_etapa4_fonte_1.8.4_antes 2/10 - env DIR_SRC="$DIR_SRC_V184" node testar_navegador_etapa4.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa4_fonte_1.8.4_antes, navegador_etapa4_fonte_1.8.4_antes" "DIR_SRC_V184 não definido"; fi
# (1.8.6) Reprodução dos três defeitos da revisão da 1.8.5 (casos 16–18 e 14d/14g–14j).
if fonte DIR_SRC_V185 1.8.5; then
  reproducao etapa4_fonte_1.8.5_antes 28/39 saida/evidencias_etapa4_fonte_1.8.5_antes.txt env DIR_SRC="$DIR_SRC_V185" node testar_etapa4_salvamento.js "$CSV" --evidencias saida/evidencias_etapa4_fonte_1.8.5_antes.txt
  reproducao navegador_etapa4_fonte_1.8.5_antes 5/10 - env DIR_SRC="$DIR_SRC_V185" node testar_navegador_etapa4.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa4_fonte_1.8.5_antes, navegador_etapa4_fonte_1.8.5_antes" "DIR_SRC_V185 não definido"; fi
# (1.8.7) Reprodução das gravações parciais das ações em lote mistas na fonte 1.8.6.
if fonte DIR_SRC_V186 1.8.6; then
  reproducao etapa5_fonte_1.8.6_antes 4/45 saida/evidencias_etapa5_fonte_1.8.6_antes.txt env DIR_SRC="$DIR_SRC_V186" node testar_etapa5_lotes.js "$CSV" --evidencias saida/evidencias_etapa5_fonte_1.8.6_antes.txt
  reproducao navegador_etapa5_fonte_1.8.6_antes 1/11 - env DIR_SRC="$DIR_SRC_V186" node testar_navegador_etapa5.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "etapa5_fonte_1.8.6_antes, navegador_etapa5_fonte_1.8.6_antes" "DIR_SRC_V186 não definido"; fi
# (1.8.8) Reprodução do aviso de recarga apagado por "Concluir ação pendente" na fonte 1.8.7 (16i).
if fonte DIR_SRC_V187 1.8.7; then
  reproducao navegador_etapa5_fonte_1.8.7_antes 9/11 - env DIR_SRC="$DIR_SRC_V187" node testar_navegador_etapa5.js "$CSV"
elif [ $? -eq 1 ]; then nao_executada "navegador_etapa5_fonte_1.8.7_antes" "DIR_SRC_V187 não definido"; fi
# (1.8.9) Reprodução da oferta ajustada lida de jeitos diferentes depois de troca de currículo na fonte 1.8.8.
if fonte DIR_SRC_V188 1.8.8; then
  reproducao etapa6_fonte_1.8.8_antes 8/35 saida/evidencias_etapa6_fonte_1.8.8_antes.txt env DIR_SRC="$DIR_SRC_V188" DIR_SRC_LEGADO="$DIR_SRC_V188" node testar_etapa6_oferta.js --evidencias saida/evidencias_etapa6_fonte_1.8.8_antes.txt
  reproducao navegador_etapa6_fonte_1.8.8_antes 1/13 - env DIR_SRC="$DIR_SRC_V188" node testar_navegador_etapa6.js
elif [ $? -eq 1 ]; then nao_executada "etapa6_fonte_1.8.8_antes, navegador_etapa6_fonte_1.8.8_antes" "DIR_SRC_V188 não definido"; fi
# (1.8.10) Reprodução da restauração ao Júpiter que conservava o ajuste de oferta, na fonte 1.8.9.
if fonte DIR_SRC_V189 1.8.9; then
  reproducao etapa6_fonte_1.8.9_antes 31/35 saida/evidencias_etapa6_fonte_1.8.9_antes.txt env DIR_SRC="$DIR_SRC_V189" DIR_SRC_LEGADO="$REPASSE_DIR_SRC_V188" node testar_etapa6_oferta.js --evidencias saida/evidencias_etapa6_fonte_1.8.9_antes.txt
  reproducao navegador_etapa6_fonte_1.8.9_antes 7/13 - env DIR_SRC="$DIR_SRC_V189" node testar_navegador_etapa6.js
elif [ $? -eq 1 ]; then nao_executada "etapa6_fonte_1.8.9_antes, navegador_etapa6_fonte_1.8.9_antes" "DIR_SRC_V189 não definido"; fi
# (1.8.11) Reprodução da trava liberada pela auditoria no meio do envio, na fonte 1.8.10.
if fonte DIR_SRC_V1810 1.8.10; then
  reproducao etapa7_fonte_1.8.10_antes 5/19 saida/evidencias_etapa7_fonte_1.8.10_antes.txt env DIR_SRC="$DIR_SRC_V1810" node testar_etapa7_trava_auditoria.js --evidencias saida/evidencias_etapa7_fonte_1.8.10_antes.txt
elif [ $? -eq 1 ]; then nao_executada "etapa7_fonte_1.8.10_antes" "DIR_SRC_V1810 não definido"; fi
# (1.8.12) Reprodução do envio de conteúdo diferente do conferido (mesmas contagens), na fonte 1.8.11.
if fonte DIR_SRC_V1811 1.8.11; then
  reproducao etapa8_fonte_1.8.11_antes 8/26 saida/evidencias_etapa8_fonte_1.8.11_antes.txt env DIR_SRC="$DIR_SRC_V1811" node testar_etapa8_previa_envio.js --evidencias saida/evidencias_etapa8_fonte_1.8.11_antes.txt
  reproducao navegador_etapa8_fonte_1.8.11_antes 1/27 - env DIR_SRC="$DIR_SRC_V1811" node testar_navegador_etapa8.js
elif [ $? -eq 1 ]; then nao_executada "etapa8_fonte_1.8.11_antes, navegador_etapa8_fonte_1.8.11_antes" "DIR_SRC_V1811 não definido"; fi
# (1.8.13) Reprodução da confirmação invalidada sem mudança do conteúdo e da nota "já aparece no painel", na fonte 1.8.12.
if fonte DIR_SRC_V1812 1.8.12; then
  reproducao navegador_etapa8_fonte_1.8.12_antes 16/27 - env DIR_SRC="$DIR_SRC_V1812" node testar_navegador_etapa8.js
elif [ $? -eq 1 ]; then nao_executada "navegador_etapa8_fonte_1.8.12_antes" "DIR_SRC_V1812 não definido"; fi
# (1.8.14) Reprodução do executor que terminava com 0 depois de uma falha (A8) e do link da auditoria
# no resultado do envio (A9), na fonte 1.8.13 (o executor testado é o rodar_suites.sh da 1.8.13).
if fonte DIR_SRC_V1813 1.8.13; then
  reproducao executor_fonte_1.8.13_antes 0/20 - env RODAR_SUITES_TESTADO="$DIR_SRC_V1813/../testes/rodar_suites.sh" node testar_executor.js
  reproducao etapa9_fonte_1.8.13_antes 3/8 saida/evidencias_etapa9_fonte_1.8.13_antes.txt env DIR_SRC="$DIR_SRC_V1813" node testar_etapa9_auditoria_envio.js --evidencias saida/evidencias_etapa9_fonte_1.8.13_antes.txt
  reproducao navegador_etapa9_fonte_1.8.13_antes 2/5 - env DIR_SRC="$DIR_SRC_V1813" node testar_navegador_etapa9.js
elif [ $? -eq 1 ]; then nao_executada "executor_fonte_1.8.13_antes, etapa9_fonte_1.8.13_antes, navegador_etapa9_fonte_1.8.13_antes, testar_executor (controle C3)" "DIR_SRC_V1813 não definido"; fi
# (1.8.15) Reprodução, com o executor e o testar_executor.js da 1.8.14, da infraestrutura ausente aceita
# como defeito histórico (C1/C2) e da interpretação gravada antes da evidência (C4–C9).
if fonte DIR_SRC_V1814 1.8.14; then
  reproducao executor_fonte_1.8.14_antes 13/20 - env RODAR_SUITES_TESTADO="$DIR_SRC_V1814/../testes/rodar_suites.sh" node testar_executor.js
elif [ $? -eq 1 ]; then nao_executada "executor_fonte_1.8.14_antes" "DIR_SRC_V1814 não definido"; fi

# ---------------------------------------------------------------- demais suítes da fonte atual e roteiros descritivos
suite testar_navegador - node testar_navegador.js "$CSV" "$PDF"
suite testar_navegador_preparacao - node testar_navegador_preparacao.js "$CSV" "$UNIDADE" "$PDF"
suite testar_visual - node testar_visual.js "$CSV" saida/paginas_ocr_navegador.json "$UNIDADE"
rm -f saida/grade_curricular_com_texto_sintetico.pdf || erro testar_pdf_texto "não foi possível apagar o PDF sintético da rodada anterior"
suite testar_pdf_texto - node testar_pdf_texto.js "$CSV" saida/paginas_ocr_navegador.json
exigir_arquivo testar_pdf_texto saida/grade_curricular_com_texto_sintetico.pdf
suite testar_dois_arquivos - node testar_dois_arquivos.js "$CSV" saida/grade_curricular_com_texto_sintetico.pdf "$PDF"

suite testar_protecao_grade - node testar_protecao_grade.js
# reproduzir_auditoria.js é um roteiro DESCRITIVO: imprime os fatos e termina com 0 nas duas fontes.
if fonte DIR_SRC_ANTERIOR 1.1.0; then
  suite reproduzir_auditoria_antes - env DIR_SRC="$DIR_SRC_ANTERIOR" node reproduzir_auditoria.js "$CSV" saida/paginas_ocr_navegador.json
elif [ $? -eq 1 ]; then nao_executada "reproduzir_auditoria_antes" "DIR_SRC_ANTERIOR não definido"; fi
suite reproduzir_auditoria_depois - node reproduzir_auditoria.js "$CSV" saida/paginas_ocr_navegador.json

# ---------------------------------------------------------------- resumo e código final
listar() { local titulo="$1"; shift; echo "$titulo ($#):"; local x; for x in "$@"; do echo "  - $x"; done; }
PROBLEMAS=$(( ${#FALHAS[@]} + ${#DIVERGENTES[@]} + ${#ERROS[@]} ))
FINAL=0; [ "$PROBLEMAS" -gt 0 ] && FINAL=1
RESUMO=$(
  echo "# resumo de rodar_suites.sh — conjunto de fontes e testes $CONJUNTO — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  listar "Suítes atuais aprovadas (código 0)" ${APROVADAS[@]+"${APROVADAS[@]}"}
  listar "FALHAS inesperadas de suítes atuais" ${FALHAS[@]+"${FALHAS[@]}"}
  listar "Reproduções de defeitos antigos confirmadas (falha prevista demonstrada)" ${CONFIRMADAS[@]+"${CONFIRMADAS[@]}"}
  listar "Reproduções DIVERGENTES (resultado diferente do previsto)" ${DIVERGENTES[@]+"${DIVERGENTES[@]}"}
  listar "ERROS (infraestrutura, fonte inválida, log ou evidência)" ${ERROS[@]+"${ERROS[@]}"}
  listar "Não executadas (fonte opcional ausente; não contam como aprovadas)" ${NAO_EXECUTADAS[@]+"${NAO_EXECUTADAS[@]}"}
  listar "Casos pulados dentro de suítes (não contam como aprovados)" ${PULADOS_INTERNOS[@]+"${PULADOS_INTERNOS[@]}"}
  if [ "$FINAL" -eq 0 ]; then echo "Resultado geral: APROVADO — código 0 (alcance: só as verificações executadas acima)"
  else echo "Resultado geral: REPROVADO — código 1 ($PROBLEMAS problema(s): ${#FALHAS[@]} falha(s), ${#DIVERGENTES[@]} divergência(s), ${#ERROS[@]} erro(s))"; fi
)
echo
echo "$RESUMO"
printf '%s\n' "$RESUMO" > "$OUT/resumo.txt" || { echo "rodar_suites: ERRO de preparação — não foi possível gravar $OUT/resumo.txt" >&2; exit 3; }
exit "$FINAL"
