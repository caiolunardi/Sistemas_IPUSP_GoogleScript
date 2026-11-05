# Compatibilidade de dados — formulário 2.0, Gerenciador 2.1 e Painel

Comparação feita em 05/11/2026 a partir do código: a 1.0 recebida do responsável (fora do repositório), `sistemas/abertura-habilitacoes/gerenciador/src/Planilha.gs` (2.1) e `sistemas/painel-servidores/src/Code.gs`. A planilha real **não** foi aberta. As posições L–O vêm do diagnóstico do Gerenciador na homologação de 21/10/2026 ([MODELO_DE_DADOS.md](../MODELO_DE_DADOS.md)).

## 1. O que cada versão grava numa linha nova

Aba `Respostas ao formulário 2`.

| Col. | Título exato | 1.0 grava | 2.0 grava | Gerenciador 2.1 lê | Painel lê |
|---|---|---|---|---|---|
| A | `Carimbo de data/hora` | `new Date()` | igual | título (obrigatória) | — |
| B | `Endereço de e-mail` | e-mail da sessão | igual | título | — |
| C | `Declaro ter lido as informações da página inicial do formulário, e estar ciente das normas e prazos para fazer a solicitação e atendimento do pedido.` | `Sim` | igual | não usa | — |
| D | `Nº USP` | só algarismos | igual | título (obrigatória) | — |
| E | `Nome` | texto (fórmula neutralizada) | igual | título (obrigatória); linha sem Nome não é pedido | — |
| F | `E-mail USP` | e-mail da sessão | igual | título (obrigatória), destinatário do aviso | — |
| G | `Ano de ingresso` | `AAAA` (texto) | igual | título | — |
| H | `Realizou trancamento total de matrícula em algum semestre?` | `Sim`/`Não` | igual | título | — |
| I | `Deseja solicitar a abertura de qual programa?` | nomes separados por `, ` na ordem em que vieram da página | nomes separados por `, `, sempre Bacharelado antes de Licenciatura | título (obrigatória); conta cada habilitação contida no texto | — |
| J | `Comentários, sugestões, elogios ou críticas.` | observações do aluno (até 2.000, cortava) | observações do aluno (até 2.000, recusa acima) | **posição 10**: observações (o aluno e a equipe dividem a célula) | — |
| K | `Situação` | `pendente`, na coluna achada pelo título (criada no fim se faltasse) | `pendente`, **só na K**, depois de conferir o título | **posição 11**: sem "conclu" = pendente | **posição 11**: conta `pendente` exato (minúsculas, sem espaços) |
| L+ | `Registro ID` | vazio | UUID novo, se as colunas `Registro ID` e `Versão` existirem | título | — |
| L+ | `Versão` | vazio | `1`, nas mesmas condições | título | — |
| L+ | `E-mail Enviado`, `Data de Conclusão` | vazio | vazio | título | — |

Consequências:

- A linha nova da 2.0 é lida pelo Gerenciador **sem "Preparar pedido"** quando a planilha já tem `Registro ID` e `Versão` (caso da produção desde 21/10/2026). Se as colunas não existirem, a linha fica sem ID, como na 1.0, e o Gerenciador continua pedindo "Preparar pedido".
- O Painel conta a linha nova (K = `pendente`), como já acontecia na 1.0. A divergência conhecida (K vazia é pendente no Gerenciador e não no Painel) só atinge linhas antigas do Forms.
- A ordem fixa do texto em I não muda nenhuma contagem: o Gerenciador procura cada habilitação dentro do texto.

## 2. Conferência do esquema antes de gravar

Dentro da trava, antes de cada gravação, `conferirEsquema_` exige:

1. a aba se chamar `Respostas ao formulário 2`;
2. A–K com o **título exato** da tabela acima, na posição da tabela;
3. nenhum título de A–K nem das colunas do Gerenciador repetido na linha 1.

Qualquer diferença recusa o envio. O aluno vê "problema de configuração do formulário"; o registro de execução recebe o motivo (`ESQUEMA: …`, só nomes de coluna). Nada é criado, renomeado, movido ou corrigido. `diagnosticarConfiguracao` mostra o mesmo resultado sem gravar.

Isso fecha dois riscos da 1.0: criar uma coluna `Situação` fora da K (o Gerenciador e o Painel leriam K vazia) e gravar observações e situação deslocadas depois de uma pergunta nova.

## 3. Convivência com os registros antigos

| Registro | Onde | O formulário 2.0 |
|---|---|---|
| Respostas do Google Forms | `Respostas ao formulário 2` e `2021 - 2022` | só lê, para mostrar ao próprio aluno os pedidos com o mesmo e-mail |
| Linhas gravadas pelo Web App 1.0 | `Respostas ao formulário 2` | só lê |
| Colunas do Gerenciador em linhas existentes | L+ | nunca escreve |
| Aba `2021 - 2022` | — | só lê; todos aparecem como **Concluído** (mesma regra do Gerenciador) |

A única escrita é `appendRow` de uma linha nova. Não há migração, nem automática nem manual.

## 4. Critério de pendente

Para o histórico mostrado ao aluno e para a confirmação de pedido repetido, o formulário usa o critério do **Gerenciador**: concluído quando a Situação contém "conclu" (sem acento e caixa); qualquer outro valor, inclusive vazio ou "Em análise", é pendente. A confirmação só aparece quando o pedido pendente é do **mesmo programa** que o aluno marcou.

## 5. Riscos que continuam

| Risco | Efeito | Mitigação |
|---|---|---|
| O Forms original ainda ligado à planilha e aceitando respostas | linha gravada por fora da trava, sem ID | conferir na homologação ([HOMOLOGACAO.md §1](HOMOLOGACAO.md#1-antes-de-começar)); desligar só com autorização específica |
| Trava de script é por projeto | o formulário e o Gerenciador não se coordenam | `appendRow` grava a linha inteira de uma vez; o Gerenciador só altera linhas existentes por Registro ID |
| Edição manual da linha 1 | o formulário passa a recusar envios | intencional; o diagnóstico mostra qual coluna mudou |
| Título real da coluna C ou K diferente do esperado | o formulário recusa todos os envios | conferir com `diagnosticarConfiguracao` na cópia antes de implantar ([DECISOES.md](DECISOES.md), item 2) |

## 6. Testes que cobrem este contrato

Em [`testar_backend.js`](../../../../sistemas/abertura-habilitacoes/formulario/testes/testar_backend.js), grupo "compatibilidade" e "esquema": linha nova com o contrato A–O; registros antigos e aba antiga intactos; critério do Painel e do Gerenciador; Registro ID sem repetição; planilha sem colunas do Gerenciador; colunas do Gerenciador em outra ordem; oito desvios de esquema recusados sem gravar; títulos conferidos contra o código do Gerenciador 2.1 e do Painel; CSV fictício com o cabeçalho real.
