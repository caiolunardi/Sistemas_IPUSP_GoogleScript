# Modelo de auditoria: como levar a outro sistema

Passo a passo para auditar um Web App em Apps Script do mesmo jeito que o [Painel dos servidores](../sistemas/painel-servidores/README.md). Leia antes o [README desta pasta](README.md) (o que é registrado e as decisões) e as regras de [segurança](../seguranca/README.md).

## 1. Peças

| Arquivo | Muda de um sistema para outro? | O que faz |
|---|---|---|
| `Auditoria.gs` | **não**: copie de [`shared/auditoria/`](../../shared/auditoria/README.md) sem mudar e acrescente o sistema à tabela de lá (a CI confere a cópia pelo nome do arquivo) | abas, selo encadeado, antes/depois, recusa se a auditoria não abrir, conferência de integridade, consolidação diária, preparação da planilha |
| `<Sistema>Auditoria.gs` | sim | define `AUDITORIA_CONFIG`, o dicionário de eventos, as funções públicas que gravam (envolvidas) e as de manutenção |
| `<Sistema>AuditoriaUI.html` | sim (o painel serve de exemplo) | fila de eventos da página, enviada em lotes |

Se o núcleo precisar mudar, mude no painel primeiro, rode `testar_auditoria.js` e leve a mesma versão aos outros sistemas. Quando dois ou mais sistemas usarem o núcleo, ele passa para `shared/` e entra em [`ferramentas/copias_shared.json`](../../ferramentas/copias_shared.json).

## 2. Planilha

1. Crie uma planilha nova na conta institucional, **sem compartilhar com ninguém** (decisão 5).
2. Acrescente a chave `AUDITORIA_<SISTEMA>` no `ID_INDEX` (coluna "ID de Produção") e na tabela "Mapa das chaves" de [`ARQUITETURA_GERAL.md`](../ARQUITETURA_GERAL.md). O ID real nunca vai para o Git.
3. Depois de enviar o código, rode `prepararAuditoria<Sistema>` no editor do Apps Script (uma vez; pode repetir).

## 3. `AUDITORIA_CONFIG`

```js
const AUDITORIA_CONFIG = {
  versao: "1.0",                                    // versão do sistema
  get fuso() { return TIMEZONE; },                  // getter: a ordem dos arquivos .gs não é garantida
  idPlanilha: () => idNoIndice_("AUDITORIA_<SISTEMA>"),
  colunasPendencias: null,                          // ou a lista de contadores, se houver aba PENDENCIAS
  dicionario: { "CODIGO.ACAO": { categoria, criticidade, origem, descricao, desde } },
  usuario: () => ({ email, nome, tipo, perfil }),   // nunca lança erro
  leiaMe: () => [["tema", "texto"], ...]            // vira a aba LEIA-ME
};
```

- `usuario()` lê o e-mail com `Session.getActiveUser()` e o perfil da mesma fonte da autorização do sistema. Se a pessoa não tem acesso, devolva o código (`SEM_ACESSO`) no lugar do perfil, sem lançar erro.
- `nome` e `tipo` vêm dos cadastros `SERVIDORES` e `PLANILHA_DOCENTES` (no painel, `pessoaDoPainel_` em `SaudacaoPainel.gs`).

## 4. Códigos de evento

Formato `OBJETO.ACAO`, em maiúsculas, sem acento: `ACESSO.ABRIR`, `FORMULARIO.SALVAR`, `RULESET.INATIVAR_AUTOMATICO`. Cada código tem:

| Campo | Valores |
|---|---|
| categoria | `Acesso`, `Navegação`, `Sistemas`, `Ajuda`, `Leitura`, `Alteração`, `Erro`, `Manutenção` (a consolidação conta `Alteração` e `Erro`) |
| criticidade | `baixa` (navegação), `média` (abrir sistema, erro, manutenção), `alta` (alteração, recusa de acesso) |
| origem | `navegador` (a página pode enviar) ou `servidor` (só o servidor grava) |
| desde | versão em que o código passou a existir |

**Nunca reaproveite nem renomeie um código**: um painel de auditoria antigo continuaria lendo o significado velho. Código que deixou de ser usado fica no dicionário.

## 5. Alterações: envolva cada função pública que grava

A função original perde a guarda e ganha `SemAuditoria_` no nome; a pública, no arquivo de auditoria, confere o acesso e chama `auditarAlteracao_`:

```js
function salvarAlgo(dados) {
  exigirAdmin_();                                   // guarda continua a primeira linha
  return auditarAlteracao_({
    evento: "ALGO.SALVAR", alvo_tipo: "algo", alvo_id: dados.id, planilha: "CHAVE_LOGICA",
    estado: () => lerEstadoDoAlgo_(dados.id),       // lido antes e depois; objeto simples
    mapearAlteracao: a => a,                        // opcional: ajusta alvo/campo de cada diferença
    detalhes: resultado => ({ ... }),               // opcional
    efeitos: (alteracoes, eventoId) => [ ... ]      // opcional: eventos filhos (evento_pai_id)
  }, () => salvarAlgoSemAuditoria_(dados));
}
```

- `estado` devolve um objeto; listas viram mapa **por id** (`{ "REQ-1": {...} }`), para excluir um item não deslocar todos os outros na comparação.
- Erro dentro da função: o evento é gravado com `resultado` `RECUSADO` (validação), `CONFLITO` (alguém mudou antes) ou `NEGADO`, e o erro volta igual para a página.
- Se a gravação final da auditoria falhar depois que a alteração já foi feita, a alteração não é desfeita; o erro vai para o log de execuções ("evento não foi gravado"). Confira esse log na homologação.
- Durante a função, `eventoAuditoriaAtual_()` devolve o `evento_id`, para registros próprios do sistema se ligarem a ele (como a coluna `evento_id` da aba das Regras Curriculares).

## 6. Eventos da página

- Envie em lotes (no máximo 50) para `registrarEventos<Sistema>(lote)`, com `{ sessao_id, contexto, eventos }`. O servidor confere o acesso, aceita só códigos de origem `navegador` e descarta qualquer e-mail ou perfil vindo da página.
- A sessão (`sessao_id`) é sorteada pelo servidor no `doGet` e entra na página por scriptlet no HTML principal (os arquivos incluídos com `include_` não passam pelo template).
- Abertura e cliques que levam para fora vão na hora; o resto, a cada 10 s e quando a aba fica escondida. Falhou: os eventos ficam na fila (até 200) e são tentados de novo, cada vez mais espaçados. Conta sem acesso: a página para de enviar.
- Envolva as funções globais que já existem (`window[nome]`) em vez de editar as telas. Nada da auditoria pode quebrar a página: `try/catch` em volta de tudo.
- Termos de busca: espere a pessoa parar de digitar (1,5 s) e grave só o último.
- Não grave URLs internas, IDs de planilha, conteúdo de campos com dado de aluno nem texto digitado em formulários.

## 7. Recusas de acesso

Na guarda (`exigirAcesso_`/`exigirAdmin_`), antes de lançar o erro, grave `ACESSO.NEGAR` ou `PERMISSAO.RECUSAR` com `registrarEventoSemFalhar_`, dentro de `try/catch`: a recusa continua igual mesmo sem auditoria. O nome da função chamada sai da pilha (a primeira sem `_` no fim). No `doGet`, a página de "sem acesso" também grava `ACESSO.NEGAR`.

## 8. Manutenção

| Função (rodar no editor) | O que faz |
|---|---|
| `prepararAuditoria<Sistema>` | cria as abas, reescreve `DICIONARIO` e `LEIA-ME`, apaga a `Página1` vazia e instala o gatilho diário |
| `verificarIntegridadeAuditoria` | refaz a corrente de hashes; `ok: true` ou a lista do que foi mexido |
| `consolidar...` | o gatilho diário; à mão, só administrador. A guarda aceita o gatilho só se o `triggerUid` for de um gatilho do projeto |

## 9. Testes

Copie [`testar_auditoria.js`](../../sistemas/painel-servidores/testes/testar_auditoria.js) (planilhas em memória, relógio controlado) e ajuste a parte do sistema. O mínimo: corrente de hashes e adulteração apontada (célula, linha apagada, linha inserida, ALTERACOES), antes/depois, recusa com a auditoria fora do ar, lote da página (código proibido, lote grande, e-mail falso ignorado), recusas de acesso, virada do ano, consolidação idempotente e preparação. No teste de navegador, simule `registrarEventos<Sistema>` e confira os eventos enviados e que a página segue igual quando a auditoria falha. Inclua a suíte no `.github/workflows/ci.yml`.

## 10. Documentação do sistema

- `DADOS_E_SEGURANCA.md`: o que a auditoria grava, quem lê a planilha, retenção `A VALIDAR INSTITUCIONALMENTE`.
- `MANUAL_OPERACAO.md`: preparar, conferir a integridade, o gatilho e o que fazer se a auditoria ficar indisponível.
- Central de Ajuda: uma pergunta "O sistema registra o que eu faço?", em linguagem de quem usa.
- Tabela "Sistemas auditados" no [README desta pasta](README.md).
