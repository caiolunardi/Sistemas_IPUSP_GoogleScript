# Ambiente de homologação dos formulários

Vale para os formulários dos alunos que leem as planilhas pelo `ID_INDEX`: [Exclusão de Disciplinas](exclusao-disciplinas/README.md) (v1.2), [Trancamento Parcial](trancamento-parcial/README.md) (v1.2) e [Trancamento Total](trancamento-total/README.md) (v1.3).

A homologação é uma **cópia do projeto Apps Script** que grava em **cópias das planilhas**. Assim dá para enviar pedidos de verdade pelo `/exec`, conferir o recibo e o que foi gravado, sem tocar nas planilhas de produção e sem pedido falso aparecendo para a equipe.

## Como o código escolhe a planilha

| Propriedade `AMBIENTE` no projeto | Coluna lida no `ID_INDEX` | Página e recibo |
|---|---|---|
| ausente ou `producao` | `ID de Produção` | como sempre |
| `homologacao` | a coluna cujo título começa por `Homologação` (sem diferença de acento ou maiúscula) | faixa "Ambiente de homologação" no topo; `[HOMOLOGAÇÃO]` no título da aba e no assunto do recibo |
| qualquer outro valor | nenhuma: erro de configuração | `[CONFIGURAÇÃO INVÁLIDA]` e a faixa |

Garantias, cobertas pelos testes de cada formulário:

- Na homologação, uma chave com a célula `Homologação` vazia é **erro**; o código nunca volta para a planilha de produção.
- Um valor digitado errado em `AMBIENTE` (por exemplo `homolog`) não abre nenhuma planilha de dados.
- Sem a propriedade, o comportamento de produção é o mesmo da versão anterior, mesmo que a coluna `Homologação` esteja preenchida.

O `ID_INDEX` é o mesmo nos dois ambientes; só muda a coluna. Nenhum ID vai para o repositório.

## Montar o ambiente (uma vez)

### 1. Planilhas de homologação

Crie no Drive, numa pasta própria de testes, cópias **sem dados pessoais**:

| Chave no `ID_INDEX` | O que criar |
|---|---|
| `PLANILHA_ALUNOS` | Mesmos títulos da original, com poucas linhas **fictícias** e a linha da conta de quem vai testar (para o caminho "aluno encontrado"). Não copie a planilha de produção inteira. |
| `PERIODOS` | Cópia da planilha de Períodos. As datas podem ser mudadas à vontade para abrir o formulário fora do calendário real. |
| `DISCIPLINAS` | Cópia do cadastro de disciplinas (não tem dado pessoal). |
| `EXCLUSAO_DISCIPLINAS` | Só a linha 1 (títulos A–T) da planilha de respostas, na aba `Respostas ao formulário 1`. |
| `TRANCAMENTO_PARCIAL_MATRICULA` | Só a linha de títulos da planilha de respostas, com o mesmo nome de aba. |
| `TRANCAMENTO_TOTAL_MATRICULA` | Só a linha de títulos da planilha de respostas, com o mesmo nome de aba. |

Para fazer cópia vazia: **Arquivo → Fazer uma cópia** e apague as linhas 2 em diante **antes** de compartilhar a cópia com qualquer pessoa.

Cole o ID de cada cópia na coluna `Homologação` do `ID_INDEX`, na linha da chave.

### 2. Projeto Apps Script de homologação (um por formulário)

1. No Drive, **Fazer uma cópia** do projeto do formulário e dê um nome que deixe claro que é teste.
2. Copie para a cópia os arquivos de `sistemas/<formulário>/formulario/src/` da versão a homologar.
3. **Configurações do projeto → Propriedades do script:** `ID_INDEX_SPREADSHEET_ID` (o mesmo da produção) e `AMBIENTE` = `homologacao`.
4. Rode `diagnosticarConfiguracao` (Exclusão e Trancamento Parcial): a primeira linha deve dizer `homologacao`, e todas as chaves devem sair `OK`.
5. **Implantar → Nova implantação → App da Web**, com as mesmas opções da produção. Guarde o link `/exec` de homologação fora do repositório e não divulgue para alunos.

O projeto de produção **não** recebe a propriedade `AMBIENTE`.

## Roteiro de teste

1. Abra o `/exec` de homologação e confira a faixa de aviso e o `[HOMOLOGAÇÃO]` na aba do navegador.
2. Envie pedidos cobrindo os casos do formulário (código do cadastro, código antigo, código fora do cadastro, mais de uma disciplina, pedido repetido).
3. Confira o recibo (assunto com `[HOMOLOGAÇÃO]`) e as linhas gravadas na planilha de respostas de homologação: posição das colunas, carimbo, Pedido ID, texto da disciplina.
4. Mude as datas na planilha de Períodos de homologação para conferir abertura e fechamento.
5. Registre o resultado na `HOMOLOGACAO.md` do formulário. Capturas para o repositório continuam sendo as dos testes com dados fictícios: telas do `/exec` mostram o e-mail de quem testou.

## Limites

- O Painel dos servidores e os gerenciadores ainda leem só a produção (exceção: o [Gerenciador de Abertura de Habilitações](abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md#3-montar-a-homologação-recomendado-antes-de-tudo) 2.0, ainda não implantado, já aceita `AMBIENTE=homologacao`). Para ver um pedido de homologação no Painel, eles também precisariam de uma cópia com `AMBIENTE`.
- Os caches são separados por ambiente, mas valem por projeto: depois de trocar um ID na coluna `Homologação`, rode `diagnosticarConfiguracao` (que limpa o cache) ou espere 10 minutos.
