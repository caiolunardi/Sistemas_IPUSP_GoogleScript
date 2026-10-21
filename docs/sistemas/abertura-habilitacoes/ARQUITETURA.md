# Arquitetura — Gerenciador de Abertura de Habilitações 2.0

Projeto Apps Script **autônomo** (não vinculado à planilha), publicado como Web App. Código em [`sistemas/abertura-habilitacoes/gerenciador/src/`](../../../sistemas/abertura-habilitacoes/gerenciador/src/). Estado: NÃO HOMOLOGADO · NÃO IMPLANTADO.

## 1. Visão geral

```text
Google Forms (alunos) ──grava──► planilha ABERTURA_HABILITACOES
                                   ├─ "Respostas ao formulário 2"  (lida e escrita)
                                   └─ "2021 - 2022"                (somente leitura)
                                          ▲
Navegador da equipe ── google.script.run ─┤
  GerenciadorApp.html                     │
                                    Web App (executa como quem implantou)
                                      ├─ Configuracao.gs  ID_INDEX, AMBIENTE
                                      ├─ Acesso.gs        PERMISSOES_DE_ACESSO › GERENCIADOR_HABILITACOES
                                      ├─ Planilha.gs      retrato da aba, escrita, Registro ID
                                      ├─ Pedidos.gs       listas, detalhe, busca, relatórios
                                      ├─ Salvamento.gs    salvar, e-mail, preparar pedido
                                      ├─ Migracao.gs      diagnóstico e migração expressa
                                      └─ MailApp          aviso ao aluno
Painel dos servidores ──lê (só conta)──► mesma planilha (contrato em REGRAS_E_CONTRATOS §6)
```

## 2. Módulos do servidor

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `Configuracao.gs` | `VERSAO_GERENCIADOR`, `CONFIG`, ambiente (`AMBIENTE`), leitura do `ID_INDEX` com cache de 10 min por ambiente, abertura de planilha por chave (uma vez por execução), erros com código (`erroGerenciador_`), limpeza de IDs e dados pessoais em mensagens de log. | `PropertiesService`, `CacheService`, `SpreadsheetApp` |
| `Acesso.gs` | Identidade (`Session.getActiveUser()`), lista de acesso com cache de 60 s, `exigirLeitor_`/`exigirAdministrador_`, página sem acesso. | `Configuracao.gs` |
| `Planilha.gs` | Contrato da aba atual: colunas por título, J e K por posição; retrato em lote (`lerTabela_`), conferências de estrutura (`lerTabelaAtual_`), escrita só na aba atual (`gravarCelula_`), criação de coluna depois de K (`obterOuCriarColuna_`), Registro ID. | `Configuracao.gs` |
| `Utilidades.gs` | Sanitização de texto, critério "concluído", saudação e datas no fuso de Brasília, ordenação de datas em texto, `paraPagina_` (resposta só com JSON), `travar_`. | `Utilities`, `LockService` |
| `Pedidos.gs` | Funções de consulta (`obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `buscarHistorico`, `obterRelatorio`) e reserva de envio (`ENVIANDO…`). Nunca grava. | `Planilha.gs`, `Acesso.gs` |
| `Salvamento.gs` | `salvarPedido` em três fases (conferir e gravar na trava → enviar fora da trava → confirmar em nova trava), `desfazerReserva_`, `atribuirIdentificador`. | `Pedidos.gs`, `MailApp` |
| `Migracao.gs` | `diagnosticarMigracaoRegistroId` (só leitura) e `executarMigracaoRegistroId` (com confirmação). | `Planilha.gs`, `PropertiesService` |
| `Codigo.gs` | `doGet`, `include_`, `diagnosticarConfiguracao`, `diagnosticarPlanilha`. | todos |

Funções públicas (sem `_` no fim, chamáveis por `google.script.run`): `doGet`, `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `buscarHistorico`, `obterRelatorio`, `salvarPedido`, `atribuirIdentificador`, `diagnosticarConfiguracao`, `diagnosticarPlanilha`, `diagnosticarMigracaoRegistroId`, `executarMigracaoRegistroId`. O teste "funções públicas são exatamente…" falha se aparecer outra.

## 3. Página

`GerenciadorApp.html` é um modelo do `HtmlService` que recebe `perfil`, `versao` e `homologacao` (nada de dados de pedidos) e inclui:

| Arquivo | Papel |
|---|---|
| `GradipTema.html`, `GradipTemaControle.html` | Tokens e seletor de aparência (cópias de `shared/`). |
| `GerenciadorEstilos.html` | Estilos do gerenciador, só com tokens GRADIP. |
| `GerenciadorAjudaEstilos.html`, `GerenciadorAjudaUI.html` | Central de Ajuda (cópias de `shared/ajuda/`). |
| `GerenciadorAjuda.html` | Conteúdo da ajuda (seções e FAQ). |
| `GerenciadorIcones.html` | Ícones Lucide embutidos (sem CDN). |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas. |
| `GerenciadorAppUI.html` | Comportamento: `window.GerenciadorApp`. |

Dentro de `GerenciadorAppUI.html`:

- **`chamar(funcao, args, validar)`** embrulha `google.script.run` numa Promise; resposta que não passa no validador (nula, de outro formato) vira erro `RESPOSTA_INVALIDA`;
- **`interpretarErro`** lê o código no começo da mensagem (`CODIGO: texto`). Só os códigos pensados para a equipe mostram o texto do servidor; os demais (configuração, serialização, erro sem código) mostram uma mensagem genérica e o link da ajuda certa;
- **estado por área** (pendentes, concluídos/busca, relatórios), com um número de sequência por pedido: uma resposta atrasada de uma busca antiga é descartada. Dados de uma área ficam válidos por 60 s; voltar à área dentro desse tempo não chama o servidor;
- **detalhe** num diálogo modal (foco preso, Esc, foco devolvido ao cartão, rolagem do fundo travada), com o formulário de observações e as duas opções;
- **navegação**: menu lateral (padrão a cada abertura) ou abas, escolhida pela pessoa durante a sessão; só o tema fica guardado no navegador (ver [UX_E_NAVEGACAO.md](UX_E_NAVEGACAO.md)).

Nenhum dado da planilha entra na página por `innerHTML`: tudo por `textContent` ou atributos.

## 4. Leitura, escrita e desempenho

- Cada função lê a aba inteira com **um** `getRange(...).getValues()` e trabalha sobre o retrato. Nenhuma leitura célula a célula.
- Planilhas são abertas uma vez por execução; o `ID_INDEX` vem do cache (10 min) e a lista de acesso também (60 s).
- Escritas são pontuais (`setValue` nas células do pedido); a migração grava duas colunas inteiras com `setValues`.
- Teste com 3.000 linhas (simulado, em `testar_backend.js`): pendentes e concluídos com 1 `getValues` e 0 `getValue`; `salvarPedido` com concluir e avisar faz 2 leituras em lote (uma em cada trava) e 7 `setValue`. O tempo real no Google depende da planilha e não foi medido.
- Respostas passam por `paraPagina_` (ciclo JSON). Um `Date` numa resposta de `google.script.run` faz a página receber `null` sem erro; por isso datas viram texto `dd/MM/yyyy HH:mm` no servidor.

## 5. Concorrência

- `LockService.getScriptLock()` com `tryLock`: 15 s para salvar e preparar pedido, 10 s para confirmar o envio e desfazer a reserva, 30 s para a migração. Trava ocupada = `TRAVA_OCUPADA`, nada gravado.
- **Versão otimista**: a página manda a Versão que viu; o servidor confere dentro da trava. Diferente = `CONFLITO_VERSAO`. A Versão sobe antes das outras gravações e `SpreadsheetApp.flush()` roda antes de soltar a trava.
- **Reserva de envio**: `E-mail Enviado` recebe `ENVIANDO… aaaa-mm-dd hh:mm:ss` antes do envio, que acontece fora da trava. Reserva com menos de 10 min bloqueia outro envio; mais velha (ou a da 1.0, sem data) é tratada como envio interrompido e só é refeita com confirmação expressa.
- **Linha achada de novo pelo Registro ID** depois do envio: se a planilha foi reordenada no meio, a confirmação vai para a linha certa.
- Limites: a trava é do script. Ela não segura edição manual na planilha nem gravações do Google Forms. Ver [MANUTENCAO_E_CONTINUIDADE.md](MANUTENCAO_E_CONTINUIDADE.md#riscos).

## 6. Configuração e falha fechada

Resumo (detalhe em [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md)):

| Situação | Resultado |
|---|---|
| Sem `ID_INDEX_SPREADSHEET_ID`, índice que não abre, chave ausente, repetida, sem ID ou com Tipo diferente de `spreadsheet` | Erro `CONFIGURACAO`. Para a equipe, aparece como "não foi possível conferir o seu acesso" (a lista de acesso é a primeira coisa lida). Quem é dono do projeto vê a causa em `diagnosticarConfiguracao`. |
| `AMBIENTE` vazio ou `producao` | Coluna "ID de Produção". |
| `AMBIENTE=homologacao` | Coluna "Homologação…"; sem ID nela, erro (nunca usa a produção no lugar). Título e assunto do e-mail com `[HOMOLOGAÇÃO]`. |
| Outro valor de `AMBIENTE` | Erro `CONFIGURACAO`. |
| Aba de permissões ausente ou com títulos errados | `ACESSO_INDISPONIVEL`: ninguém entra. |

Mensagens de configuração citam nomes de chave e de propriedade, nunca IDs.

## 7. Escolhas e alternativas descartadas

| Escolha | Motivo | Alternativa descartada |
|---|---|---|
| Lista de acesso numa aba da planilha de permissões já usada pelo Painel dos servidores | Mesmo formato, mantido pela equipe, sem código novo de cadastro | Lista no código (exige nova versão para mudar) |
| Migração em três passos com código de confirmação | Abre espaço para conferir o diagnóstico e fazer cópia de segurança; uma planilha que mudou no meio invalida o código | Migração automática no `doGet` (1.0): grava a cada visita, com quem implantou |
| J e K por posição | Contrato da 1.0 e do Painel dos servidores; o título dessas colunas não é garantido | Achar J/K pelo título (mudaria o contrato) |
| Sem auditoria em planilha própria | Exigiria nova chave no `ID_INDEX` e nova planilha, que dependem de decisão do responsável | `Auditoria.gs` como no Painel dos servidores (registrado como decisão pendente) |
| Sem gatilho `onFormSubmit` | Criar gatilho é proibido nesta tarefa; a preparação expressa cobre as linhas novas | Gatilho que atribui ID a cada resposta (opção futura, a decidir) |
