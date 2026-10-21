# Modelo de dados — Gerenciador de Abertura de Habilitações 2.0

Os títulos abaixo são os que o código procura. Os da aba atual vêm da 1.0 e foram conferidos só no código, **não** na planilha real (A VALIDAR na homologação com `diagnosticarPlanilha`). Os exemplos são fictícios.

## 1. Planilha `ABERTURA_HABILITACOES`

### Aba `Respostas ao formulário 2` (atual; lida e escrita)

| Col. | Título procurado | Como é achada | Quem grava | Tipo / exemplo | Uso |
|---|---|---|---|---|---|
| A | `Carimbo de data/hora` | título exato (obrigatória) | Forms | `Date` (ou texto `dd/mm/aaaa hh:mm:ss`) | ordem, relatórios, referência de "Preparar pedido" |
| B | `Endereço de e-mail` | título exato | Forms | texto | só exibido no detalhe |
| C | `Nº USP` | título exato (obrigatória) | Forms | número ou texto, `9000001` | lista, busca, referência |
| D | `Nome` | título exato (obrigatória) | Forms | texto | define se a linha é um pedido; ordem; primeiro nome do e-mail |
| E | `E-mail USP` | título exato (obrigatória) | Forms | texto | destinatário do aviso, busca |
| F | `Ano de ingresso` | título exato | Forms | texto/número | detalhe |
| G | `Realizou trancamento total de matrícula em algum semestre?` | título exato | Forms | `Sim`/`Não` | detalhe |
| H | `Deseja solicitar a abertura de qual programa?` | título exato (obrigatória) | Forms | texto; pode ter as duas habilitações separadas por vírgula | lista, e-mail, relatórios |
| I | (declaração) | não usada | Forms | — | — |
| **J** | (qualquer) | **posição 10** | gerenciador | texto até 2.000 caracteres | Observações |
| **K** | (qualquer) | **posição 11** | gerenciador | `Concluído` / `pendente` / vazio / outros textos antigos | Situação (ver [regras](REGRAS_E_CONTRATOS.md#1-situação-do-pedido)) |
| L+ | `Data de Conclusão` | título exato; criada se faltar | gerenciador | `Date` | concluídos, detalhe |
| L+ | `Registro ID` | título exato; criada pela migração | gerenciador | UUID `xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx` | identifica o pedido |
| L+ | `Versão` | título exato; criada pela migração | gerenciador | inteiro ≥ 1 | concorrência |
| L+ | `E-mail Enviado` | título exato; criada se faltar | gerenciador | `Date`, ou reserva `ENVIANDO… 2026-10-21 14:03:00` | aviso por e-mail |

Colunas criadas pelo gerenciador vão para a primeira coluna livre **depois** da última usada e nunca para J ou K. A ordem entre elas depende de qual operação criou primeiro.

Conferências antes de qualquer leitura ou escrita (`ESTRUTURA`):

- título conhecido repetido na linha 1;
- J ou K ocupadas por um título conhecido (sinal de colunas deslocadas);
- falta uma coluna obrigatória (para listas e detalhe).

### Aba `2021 - 2022` (histórica; **somente leitura**)

Nunca é escrita: `gravarCelula_` e `obterOuCriarColuna_` recusam qualquer aba que não seja a atual, e o teste "aba histórica nunca é escrita" usa uma aba simulada que falha em qualquer gravação. Os títulos reais não foram vistos; o código acha as colunas assim:

| Campo | Busca | Relatórios |
|---|---|---|
| Nome | título exato `Nome`, senão o primeiro que contém `nome` | primeiro que contém `nome` |
| Nº USP | `Nº USP`, senão o primeiro que contém `usp` | — |
| E-mail | `E-mail USP`, senão `e-mail usp`/`email usp`, senão `e-mail`/`email` | — |
| Habilitação | título exato, senão `programa`/`habilita` | `programa`/`habilita` |
| Data | `Carimbo de data/hora`, senão `carimbo`/`data` | `carimbo`/`data` |

Todos os pedidos dessa aba aparecem como "Concluído" na busca e não abrem o detalhe. A aba é opcional: sem ela, busca e relatórios usam só a atual.

## 2. Planilha `PERMISSOES_DE_ACESSO`, aba `GERENCIADOR_HABILITACOES`

| Col. | Título (linha 1) | Conteúdo |
|---|---|---|
| A | N. USP | opcional, não usado |
| B | Nome | opcional, não usado |
| C | E-mail (precisa conter "mail") | e-mail completo; espaços e caixa ignorados; coringa, grupo ou texto incompleto são ignorados |
| D | Observação | livre, não usado |
| E | Perfil (precisa conter "perfil") | `LEITOR` ou `ADMINISTRADOR`; vazio ou outro valor = sem acesso |

E-mail repetido: vale o menor perfil. A aba precisa ser criada pelo responsável (não existe hoje; A VALIDAR).

## 3. Planilha `ID_INDEX`

Primeira aba (ou `Página1`). Colunas achadas pelo título, sem diferença de acento e caixa: `Chave`, `Tipo` (opcional; quando preenchido, precisa ser `spreadsheet`), `ID de Produção`, e a primeira que começa com `Homologação`.

## 4. Script Properties

| Propriedade | Obrigatória | Valor |
|---|---|---|
| `ID_INDEX_SPREADSHEET_ID` | sim | ID da planilha `ID_INDEX` |
| `AMBIENTE` | não | vazio/`producao` ou `homologacao` |
| `MIGRACAO_REGISTRO_ID_CONFIRMACAO` | só durante a migração | código `MIGRAR-…` dado pelo diagnóstico; apagada pela execução |
| `RECUPERACAO_REGISTRO` | só durante a recuperação de um pedido | número da linha (para o diagnóstico) e depois o código `RECUPERAR-…` (para a execução); apagada pela execução |

## 5. Cache do script

| Chave | Conteúdo | Validade |
|---|---|---|
| `habilitacoesIndice:<ambiente>` | mapa chave → ID do `ID_INDEX` | 10 min |
| `habilitacoesPermissoes:<ambiente>` | mapa e-mail → perfil | 60 s |

O cache fica no servidor e nunca vai à página. `diagnosticarConfiguracao` limpa os dois.

## 6. Navegador

`localStorage["gradip-theme"]` guarda a aparência (`system`/`light`/`dark`), como nos outros sistemas GRADIP. Nada mais é guardado no navegador.
