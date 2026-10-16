# Manual de operação — Exclusão de Disciplinas (formulário dos alunos)

## Implantação

| Opção | Valor |
|---|---|
| Executar como | **Eu** (a conta do Serviço de Graduação que implanta) |
| Quem pode acessar | **Qualquer pessoa na Universidade de São Paulo** |

O aluno **não** precisa de acesso às planilhas nem ao `ID_INDEX`: quem lê e grava é a conta que implanta. Confira esses dois valores em **Implantar → Gerenciar implantações** (não foram confirmados para este formulário).

## Configuração

1. **Propriedades do script** (Configurações do projeto → Propriedades do script): `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX` (o responsável funcional informou em 16/10/2026 que já está configurada neste projeto).
2. **`ID_INDEX`** (aba `Página1` ou a primeira; colunas `Chave` e `ID de Produção` pelo título):
   - `PLANILHA_ALUNOS`: cadastro de alunos (o mesmo da Comunidade IPUSP). Primeira aba, títulos `Número USP`, `Nome do Aluno`, `eMail` e, opcionais, `eMail Secundario` e `Ingresso`. Só leitura.
   - `EXCLUSAO_DISCIPLINAS`: planilha de respostas (chave criada pelo responsável funcional em 16/10/2026). Aba `Respostas ao formulário 1` (ou a primeira), colunas por posição — ver a tabela no [README](README.md#planilha-de-respostas-posições). A1 precisa começar com "Carimbo" e B1 conter "mail".
   - `PERIODOS`: planilha de Períodos. Primeira aba, linha com "Formulário de Exclusão de Disciplinas" na coluna A; C a K e N a Q como o Painel dos servidores grava.
   - `DISCIPLINAS`: cadastro de disciplinas. Aba `DISCIPLINAS`, títulos `codigo`, `nome` e, se houver, `creditos_aula`, `situacao`, `codigos_anteriores`. Só leitura.
3. A conta que implanta precisa de leitura no `ID_INDEX` e nas planilhas de alunos, Períodos e DISCIPLINAS, e de **edição** na planilha de respostas.

Os IDs ficam em cache por 10 minutos e o cadastro de disciplinas por 1 hora.

## Atualizar para a v1.1

Copie para o projeto Apps Script os nove arquivos de [`formulario/src/`](../../../sistemas/exclusao-disciplinas/formulario/src), com os mesmos nomes (no editor, o `.html` não aparece no nome do arquivo):

| Arquivo | Situação na v1.1 |
|---|---|
| `Codigo.gs` | substitui o atual |
| `ExclusaoApp.html` | substitui o atual |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | novos (mesmos dos outros sistemas) |
| `ExclusaoAjuda.html`, `ExclusaoAjudaEstilos.html`, `ExclusaoAjudaUI.html` | novos (Central de Ajuda) |

Depois:

1. No editor, selecione `diagnosticarConfiguracao` e clique em **Executar**. Em **Registro de execução**, todos os passos devem sair `OK`; confira também os títulos de A a T da planilha de respostas.
2. Se aparecer tela de autorização, aceite com a conta que implanta (o recibo usa envio de e-mail).
3. **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar.** O link do formulário continua o mesmo, e o Painel de Solicitações não precisa mudar.
4. Teste com a sua conta durante um período aberto: um código do cadastro e um inventado com nome, envie, confira o recibo, as linhas na planilha (mesmo Pedido ID) e o selo no Painel dos servidores; depois apague as linhas de teste.

## Ambiente de homologação

Para testar no `/exec` sem tocar nas planilhas de produção, use uma cópia do projeto com a propriedade `AMBIENTE` = `homologacao` e as planilhas de teste na coluna `Homologação` do `ID_INDEX`. Passo a passo em [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md). O projeto de produção não recebe essa propriedade.

## Uso no dia a dia

O formulário não precisa de operação: abre e fecha pelas datas da tela "Formulário de Exclusão de Disciplinas" do Painel dos servidores. As linhas chegam com a Situação (T) vazia, o que o Painel conta como pendente. Nenhum e-mail é enviado para a equipe.

## Diagnóstico

Rode `diagnosticarConfiguracao` no editor: ele mostra cada passo com `OK` ou o erro, sem dados pessoais nem IDs.

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Aluno vê **Login necessário** | conectado com conta que não é `@usp.br`, ou várias contas no navegador | orientar a abrir só com o e-mail USP (está na Central de Ajuda) |
| **Formulário fechado** para todos dentro do período | falta `ID_INDEX_SPREADSHEET_ID`, chave `PERIODOS`, a linha, o tipo Sazonal ou as datas de retificação da janela | rodar o diagnóstico; preencher a tela do Painel dos servidores |
| Aviso **O cadastro de disciplinas não carregou** | chave `DISCIPLINAS` ausente, sem acesso ou sem a aba | conferir a chave e a aba; o envio continua com o nome digitado |
| Formulário abre sem pré-preencher para todos | chave `PLANILHA_ALUNOS` ausente, sem acesso ou títulos diferentes | conferir a chave e os títulos; o envio continua funcionando |
| Envio falha com "problema de configuração do formulário" | planilha de respostas não abre, ou A1/B1 diferentes do esperado | conferir a chave `EXCLUSAO_DISCIPLINAS`, o acesso de edição e os títulos |
| Tela de sucesso diz que o recibo não foi enviado | falta de autorização de e-mail ou cota diária | autorizar de novo; o pedido foi gravado |

Os detalhes técnicos ficam em **Execuções** do projeto, sem dados pessoais (só nomes de chave e coluna).
