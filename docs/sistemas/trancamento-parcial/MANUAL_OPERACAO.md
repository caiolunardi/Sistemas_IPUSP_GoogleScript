# Manual de operação — Pedido de Trancamento Parcial (formulário dos alunos)

## Implantação

Configuração confirmada pelo responsável funcional em 16/10/2026:

| Opção | Valor |
|---|---|
| Executar como | **Eu** (a conta do Serviço de Graduação que implanta) |
| Quem pode acessar | **Qualquer pessoa na Universidade de São Paulo** |

O aluno **não** precisa de acesso às planilhas nem ao `ID_INDEX`: quem lê e grava é a conta que implanta. O comentário da v1.0 recomendava "usuário que acessa"; a implantação real já usa "Eu".

## Configuração

1. **Propriedades do script** (Configurações do projeto → Propriedades do script): `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX`.
2. **`ID_INDEX`** (aba `Página1` ou a primeira; colunas `Chave` e `ID de Produção` pelo título):
   - `PLANILHA_ALUNOS`: cadastro de alunos (o mesmo da Comunidade IPUSP). Primeira aba, títulos `Número USP`, `Nome do Aluno`, `eMail` e, opcional, `eMail Secundario`. Só leitura.
   - `TRANCAMENTO_PARCIAL_MATRICULA`: planilha de respostas (criada pelo usuário em 16/10/2026). Primeira aba, títulos `Situação do Pedido`, `Carimbo de data/hora`, `Endereço de e-mail`, a declaração (começando por "Declaro estar ciente"), `Número USP`, `Nome`, `Número de créditos-aula em que está matriculado(a)`, `Após o trancamento, você ficará com menos de 12 créditos-aula?`, `Você concluirá o curso neste semestre?`, `Disciplina 1` a `Disciplina 6` e `Justificativa`.
   - `PERIODOS`: planilha de Períodos (a mesma do Painel de Solicitações). Primeira aba, linha com "Pedido de Trancamento Parcial de Matrícula" na coluna A; colunas C a K com tipo e datas/horas, como o Painel dos servidores grava.
   - `DISCIPLINAS`: cadastro de disciplinas. Aba `DISCIPLINAS`, títulos `codigo`, `nome` e, se houver, `creditos_aula`, `situacao`, `codigos_anteriores`. Só leitura.
3. A conta que implanta precisa de leitura no `ID_INDEX` e nas planilhas de alunos, Períodos e DISCIPLINAS, e de **edição** na planilha de respostas.

Os IDs ficam em cache por 10 minutos e o cadastro de disciplinas por 1 hora: uma disciplina nova cadastrada pode levar até uma hora para aparecer no formulário (até lá, o aluno digita o nome).

## Atualizar para a v1.1

Copie para o projeto Apps Script os nove arquivos de [`formulario/src/`](../../../sistemas/trancamento-parcial/formulario/src), com os mesmos nomes (no editor, o `.html` não aparece no nome do arquivo):

| Arquivo | Situação na v1.1 |
|---|---|
| `Codigo.gs` | substitui o atual |
| `TrancamentoParcialApp.html` | substitui o atual |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | novos (mesmos dos outros sistemas) |
| `TrancamentoParcialAjuda.html`, `TrancamentoParcialAjudaEstilos.html`, `TrancamentoParcialAjudaUI.html` | novos (Central de Ajuda) |

Depois:

1. **Propriedade do script:** confira se `ID_INDEX_SPREADSHEET_ID` existe neste projeto (é por projeto, não vale a do trancamento total).
2. **Autorize de novo.** A v1.1 envia o recibo por e-mail, que é uma permissão nova. No editor, execute qualquer função (por exemplo, `doGet`) e aceite a tela de autorização com a conta que implanta. Sem isso, o pedido é gravado, mas o recibo falha.
3. **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar.** O link do formulário continua o mesmo.
4. Teste com a sua conta durante um período aberto (ou com o tipo Contínuo temporariamente): digite um código do cadastro, um código inventado com nome, envie, confira o recibo e a linha na planilha, e apague a linha de teste.

## Ambiente de homologação

Para testar no `/exec` sem tocar nas planilhas de produção, use uma cópia do projeto com a propriedade `AMBIENTE` = `homologacao` e as planilhas de teste na coluna `Homologação` do `ID_INDEX`. Passo a passo em [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md). O projeto de produção não recebe essa propriedade.

## Uso no dia a dia

O formulário não precisa de operação: abre e fecha pelas datas da planilha de Períodos (editadas no Painel dos servidores), e os pedidos chegam como `pendente` com as disciplinas no formato `CÓDIGO - Nome`. Nenhum e-mail é enviado para a equipe.

## Diagnóstico

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Aluno vê **Login necessário** | conectado com conta que não é `@usp.br`, ou várias contas no navegador | orientar a abrir só com o e-mail USP (está na Central de Ajuda) |
| **Erro ao carregar** para todos | `ID_INDEX_SPREADSHEET_ID` ausente ou errado | conferir a propriedade; ver o registro em **Execuções** |
| **Formulário fechado** dentro do período | datas/horas da linha em Períodos, tipo, ou chave `PERIODOS` | conferir a linha "Pedido de Trancamento Parcial de Matrícula" e o registro em **Execuções** ("períodos") |
| Aviso **O cadastro de disciplinas não carregou** | chave `DISCIPLINAS` ausente, sem acesso, sem aba `DISCIPLINAS` ou sem `codigo`/`nome` | conferir a chave e a aba; o envio continua funcionando com o nome digitado |
| Nome de disciplina não aparece para um código certo | disciplina fora do cadastro ou cadastrada há menos de 1 hora | cadastrar na DISCIPLINAS; o aluno pode digitar o nome |
| Formulário abre sem pré-preencher para todos | chave `PLANILHA_ALUNOS` ausente, sem acesso ou títulos diferentes | conferir a chave e os títulos; o envio continua funcionando |
| Envio falha com "problema de configuração do formulário" | planilha de respostas não abre (chave `TRANCAMENTO_PARCIAL_MATRICULA`, acesso) | conferir a chave e o acesso de edição da conta que implanta |
| Envio falha citando uma coluna | título da planilha de respostas foi alterado | restaurar o título exato da linha 1 |
| Tela de sucesso diz que o recibo não foi enviado | falta de autorização de e-mail ou cota diária | autorizar de novo (ver acima); o pedido foi gravado |

Os detalhes técnicos ficam em **Execuções** do projeto, sem dados pessoais (só nomes de chave e coluna).
