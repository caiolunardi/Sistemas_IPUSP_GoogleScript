# Auditoria: falhas parciais e o que ela garante

**Situação:** análise feita; melhoria NÃO IMPLEMENTADA / DEPENDE DE DECISÃO. Classe **alta** (muda o mecanismo de auditoria, que o responsável aprovou em 20/10/2026). Achados A1 e A2 do [diagnóstico](../../governanca/DIAGNOSTICO_2026-10-20.md).

Código: `sistemas/painel-servidores/src/Auditoria.gs`, função `auditarAlteracao_` (modelo para os outros sistemas, ver [MODELO.md](../../auditoria/MODELO.md)).

## 1. O que acontece hoje, passo a passo

| Passo | O que o código faz | Se falhar aqui |
|---|---|---|
| 1. Conferir a auditoria | abre a aba `EVENTOS_<ano>` | **recusa**: nada é alterado, erro "auditoria indisponível" |
| 2. Estado antes | `def.estado()` lê o alvo | o erro vira `{erro_ao_ler_estado}` no estado; segue |
| 3. Executar | a função original grava na planilha | evento com `RECUSADO`/`CONFLITO`/`NEGADO` (se a auditoria ainda gravar) e o erro volta à página |
| 4. Estado depois e diferenças | relê o alvo, compara | cai no passo 6 |
| 5. Registrar | `registrarEventosAuditoria_`: trava (até 20 s), grava `ALTERACOES`, grava `EVENTOS`, guarda o último hash | cai no passo 6 |
| 6. Falha depois de executar | `console.error("…feita, mas o evento não foi gravado")` | **a alteração fica feita, sem evento** |

Distinções que o mandato pede:

- **Intenção:** não é registrada. Não existe linha "vou alterar X" antes do passo 3.
- **Execução:** passo 3, na planilha do sistema (fora da trava da auditoria).
- **Confirmação de sucesso:** o retorno da função original.
- **Persistência do log:** passo 5, depois da execução.
- **Reversão:** não existe. O código não desfaz a alteração se o passo 5 falhar, e isso é deliberado: desfazer automaticamente pode apagar o trabalho de outra pessoa que gravou entre um passo e outro.
- **Falha parcial no próprio registro:** o passo 5 grava `ALTERACOES` antes de `EVENTOS`. Se a segunda escrita falhar, ficam linhas de alteração sem o evento correspondente; a conferência de integridade (`verificarIntegridadeAuditoria_`) acusa a diferença de `hash_alteracoes` só para eventos que existem.
- **Idempotência:** cada alteração tem `evento_id` novo; repetir o pedido gera outro evento. As funções do painel conferem versão/linha antes de gravar, então uma repetição costuma dar `CONFLITO`, não gravação dupla.
- **Recuperação:** hoje, manual: procurar no log de execuções do Apps Script a mensagem do passo 6 e reconstituir o evento a partir do histórico de versões da planilha.

**Diferença antes/depois (A2):** o estado "antes" é lido no passo 2, fora da trava. Se outra pessoa alterar o mesmo alvo entre os passos 2 e 3, a diferença registrada mistura as duas alterações. Na prática, raro (uma equipe pequena), e as funções que conferem versão recusam o segundo salvamento.

**Garantia real:** a auditoria registra toda alteração **quando a planilha da auditoria está acessível e o registro final não falha**. Não é transacional: o Apps Script não oferece transação entre duas planilhas.

## 2. Opções de melhoria

| Opção | O que muda | Ganho | Custo |
|---|---|---|---|
| **A. Só documentar** (feito neste PR) | `docs/auditoria/README.md` e `CLAUDE.md` deixam de afirmar mais do que o código faz | nenhuma afirmação falsa | a lacuna continua |
| **B. Registro de intenção** | antes do passo 3, gravar um evento `<CODIGO>` com resultado `INICIADO`; depois, o evento final com `evento_pai_id` apontando para ele | uma alteração sem evento final aparece como `INICIADO` sem desfecho, e a conferência de integridade pode listá-las | uma escrita a mais por alteração (≈1 s); novo valor em `AUDITORIA_RESULTADOS`; testes novos; muda o mecanismo aprovado |
| **C. Fila de reenvio** | se o passo 5 falhar, guardar o evento numa Script Property e regravar na próxima execução ou no gatilho diário | menos eventos perdidos | Script Properties têm limite de tamanho (9 KB por valor); ordem dos hashes muda; mais código |
| **D. Ordem das escritas** | gravar `EVENTOS` antes de `ALTERACOES` | um evento nunca fica sem existir quando há alterações gravadas | linhas de alteração podem faltar para um evento existente (detectável pelo `hash_alteracoes`, que já é conferido) |

**Recomendação:** B, com D, numa versão futura do painel, como PR de classe alta com testes (`testar_auditoria.js`: falha simulada no passo 5 deixa `INICIADO` sem desfecho; integridade lista a pendência). Não usar compensação automática (desfazer a alteração). Até a decisão, vale A.

## 3. Decisão pedida ao responsável

Escolher entre manter A (só documentação) ou implementar B + D numa versão do painel e, depois, no núcleo que os outros sistemas copiarão.
