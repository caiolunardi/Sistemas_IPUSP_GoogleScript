# Auditoria dos sistemas

Registro de **quem fez o quê, onde, quando e como** nos sistemas da equipe do Serviço de Graduação. O primeiro sistema auditado é o [Painel de Sistemas dos servidores](../sistemas/painel-servidores/README.md) (versão 1.3). Ele serve de modelo para os outros: o núcleo `Auditoria.gs` fica em [`shared/auditoria/`](../../shared/auditoria/README.md) e é copiado sem mudança (a CI confere), e cada sistema escreve só a sua configuração ([MODELO.md](MODELO.md)).

## O que é registrado

| Tipo | Exemplos (Painel dos servidores) | De onde vem |
|---|---|---|
| Acesso | abriu o painel (com o tempo de carga), conta sem acesso, LEITOR tentando gravar | servidor e página |
| Navegação | troca de tela, menu lateral ou abas, aparência, janelas abertas e fechadas | página |
| Sistemas | card clicado (pelo nome, nunca pela URL), busca na lista de sistemas | página |
| Ajuda | Central de Ajuda aberta (e em qual seção), busca com o termo, pergunta do FAQ aberta | página |
| Alteração | períodos dos formulários, Regras Curriculares, ativação e inativação de rulesets, com **antes e depois de cada campo** | servidor |
| Erro | erro de JavaScript na página | página |
| Manutenção | preparar e conferir a auditoria, consolidação, diagnósticos | servidor |

Cada linha leva e-mail, nome completo, tipo de conta (servidor, setor, docente), perfil, sessão, tela, navegador, largura da tela, aparência e modo de navegação. O e-mail e o perfil são sempre lidos pelo servidor; a página não consegue informar outra pessoa.

## Decisões (20/10/2026)

Propostas no documento "Auditoria do Painel dos servidores: proposta" e aprovadas pelo responsável funcional:

1. **Se a auditoria não puder gravar, a alteração é recusada** e nada muda ("A auditoria está indisponível no momento, então nada foi alterado…"). Navegação, leitura e ajuda nunca são bloqueadas.
   *Limite da implementação (registrado em 20/10/2026):* a recusa vale quando a planilha da auditoria não abre **antes** da alteração. Se ela abrir, a alteração for feita e o registro final falhar (trava ocupada por mais de 20 s, cota, erro do Sheets), a alteração **fica feita sem evento** e só o log de execuções guarda o aviso. Não há atomicidade entre a planilha alterada e a planilha da auditoria. Análise e opções: [falhas parciais da auditoria](../seguranca/propostas/AUDITORIA_FALHAS_PARCIAIS.md).
2. **Tudo é registrado**: telas, janelas, abas do editor, ajuda e aparência.
3. **Os termos de busca são gravados** (lista de sistemas e Central de Ajuda).
4. A aba `AUDITORIA_REGRAS_CURRICULARES` (planilha das Regras Curriculares, com os snapshots completos das correções de ruleset ativo) **continua**. Uma coluna nova `evento_id`, no fim, liga cada linha dela ao evento da auditoria geral. A visualização do histórico de revisões não muda.
5. **Só a conta institucional do Serviço de Graduação abre a planilha da auditoria.**
6. **Nada é apagado automaticamente.** Prazo de guarda: `A VALIDAR INSTITUCIONALMENTE`.
7. **Sem sinal periódico de "ainda estou aqui"**: a duração da sessão é estimada pelo último evento.

## Como funciona

```
página (AuditoriaPainelUI.html)          servidor (Apps Script)
 fila de eventos ── lote a cada 10 s ──▶ registrarEventosPainel
 card e abertura: na hora                  confere acesso, aceita só códigos "navegador"
 aba escondida: envia                      │
                                           ▼
 função que grava (ex.: salvarRequisito) ─▶ auditarAlteracao_
                                           1. abre a planilha da auditoria (falhou? recusa)
                                           2. lê o estado antes
                                           3. executa a alteração
                                           4. lê o estado depois e compara
                                           5. grava EVENTOS + ALTERACOES numa escrita só
```

- **Só acrescenta linhas.** Nenhum código altera ou apaga uma linha já gravada.
- **Selo encadeado.** Cada evento tem `seq` e `hash` = SHA-256 da linha + hash do evento anterior; `hash_alteracoes` resume as linhas do evento em ALTERACOES. `verificarIntegridadeAuditoria` refaz a conta e aponta a primeira linha editada, apagada ou inserida à mão. A corrente passa de um ano para o outro.
- **Abas protegidas**, gravadas como texto puro (formato `@`). Um texto que começa com `=`, `+`, `-` ou `@` ganha um espaço na frente, para nunca virar fórmula.
- **Uma escrita por aba, sob trava** (`LockService`), para dois servidores ao mesmo tempo não embaralharem a sequência.
- **Uma aba por ano** (`EVENTOS_2026`, `ALTERACOES_2026`…), para a planilha não ficar lenta.
- **Consolidação de madrugada** (gatilho diário, 2h): `SESSOES` (uma linha por sessão: início, fim, duração, telas, alterações, recusas) e `RESUMO_DIARIO` (acessos, pessoas, cards por sistema, alterações, recusas, erros, tempo médio de carga). É dali que um futuro painel de auditoria, no modelo do da grade, lê os números.
- `PENDENCIAS`: a contagem dos avisos dos cards, no máximo uma vez por hora, para acompanhar a fila de trabalho ao longo do tempo.
- `DICIONARIO` (o que cada código significa) e `LEIA-ME` (como ler a planilha) são reescritos a cada preparação.

## O que não é registrado

- **IP**: o Apps Script não informa.
- **URLs dos sistemas** (`/exec`): o card é identificado pelo nome.
- Conteúdo de solicitações de alunos: o painel só mostra contagens.
- `/exec` ou `/dev`: o Apps Script não diz qual dos dois foi aberto.

## Onde está

| O quê | Onde |
|---|---|
| Núcleo genérico | [`shared/auditoria/Auditoria.gs`](../../shared/auditoria/Auditoria.gs), copiado em cada sistema |
| Configuração do painel | [`AuditoriaPainel.gs`](../../sistemas/painel-servidores/src/AuditoriaPainel.gs) e [`AuditoriaPainelUI.html`](../../sistemas/painel-servidores/src/AuditoriaPainelUI.html) |
| Planilha | chave `AUDITORIA_PAINEL_SERVIDORES` do `ID_INDEX` ([mapa das chaves](../ARQUITETURA_GERAL.md)) |
| Instalação e conferência | [MANUAL_OPERACAO do painel](../sistemas/painel-servidores/MANUAL_OPERACAO.md) |
| Dados pessoais e acesso | [DADOS_E_SEGURANCA do painel](../sistemas/painel-servidores/DADOS_E_SEGURANCA.md) |
| Como levar a outro sistema | [MODELO.md](MODELO.md) |
| Testes | [`testar_auditoria.js`](../../sistemas/painel-servidores/testes/testar_auditoria.js) (planilhas em memória) e [`testar_navegador.js`](../../sistemas/painel-servidores/testes/testar_navegador.js) |

## Sistemas auditados

| Sistema | Versão | Planilha (chave) | Estado |
|---|---|---|---|
| Painel de Sistemas dos servidores | 1.3 | `AUDITORIA_PAINEL_SERVIDORES` | publicado em 20/10/2026 |
| Gerenciador de Abertura de Habilitações | 2.1 | `AUDITORIA_ABERTURA_HABILITACOES` | publicado em 22/10/2026; [o que registra](../sistemas/abertura-habilitacoes/AUDITORIA.md) |
