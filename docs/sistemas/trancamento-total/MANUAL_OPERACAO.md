# Manual de operação — Pedido de Trancamento Total (formulário dos alunos)

## Implantação

Configuração confirmada pelo responsável funcional em 15/10/2026:

| Opção | Valor |
|---|---|
| Executar como | **Eu** (a conta do Serviço de Graduação que implanta) |
| Quem pode acessar | **Qualquer pessoa na Universidade de São Paulo** |

Com "Executar como: Eu", o aluno **não** precisa de acesso às planilhas nem ao `ID_INDEX`: quem lê e grava é a conta que implanta. Por isso as planilhas devem ficar restritas à equipe (ver [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md)). O login continua obrigatório, e `Session.getActiveUser()` devolve o e-mail do aluno porque a conta que implanta é do mesmo domínio.

## Configuração

1. **Propriedades do script** (Configurações do projeto → Propriedades do script): `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX`.
2. **`ID_INDEX`** (aba `Página1` ou a primeira; colunas `Chave` e `ID de Produção` pelo título):
   - `PLANILHA_ALUNOS`: o cadastro de alunos (o mesmo da Comunidade IPUSP). Primeira aba, títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail` e, opcional, `eMail Secundario`.
   - `TRANCAMENTO_TOTAL_MATRICULA`: a planilha de respostas. Primeira aba, títulos `Situação`, `Carimbo de data/hora`, `Endereço de e-mail`, `Nome Completo`, `Número USP`, `Ano de Ingresso`, `E-mail para contato`, `Justificativa` e a pergunta de confirmação (começando por "Está ciente").
3. A conta que implanta precisa de leitura no `ID_INDEX` e na planilha de alunos, e de **edição** na planilha de respostas.

Os IDs ficam em cache por 10 minutos: depois de trocar um ID no `ID_INDEX`, a mudança pode levar esse tempo para valer.

## Atualizar para a v1.2

Copie para o projeto Apps Script os nove arquivos de [`formulario/src/`](../../../sistemas/trancamento-total/formulario/src), com os mesmos nomes (no editor, o `.html` não aparece no nome do arquivo):

| Arquivo | Situação na v1.2 |
|---|---|
| `Codigo.gs` | substitui o atual |
| `TrancamentoFormApp.html` | substitui o atual |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | novos (mesmos dos outros sistemas) |
| `TrancamentoFormAjuda.html`, `TrancamentoFormAjudaEstilos.html`, `TrancamentoFormAjudaUI.html` | novos (Central de Ajuda) |

Depois:

1. **Autorize de novo.** A v1.2 envia o recibo por e-mail, que é uma permissão nova. No editor, execute qualquer função (por exemplo, `doGet`) e aceite a tela de autorização com a conta que implanta. Sem isso, o pedido é gravado, mas o recibo falha.
2. **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar.** O link do formulário continua o mesmo.
3. Teste com a sua própria conta: abra o link, envie um pedido de teste, confira o recibo e apague a linha de teste da planilha.

## Ambiente de homologação

Para testar no `/exec` sem tocar nas planilhas de produção, use uma cópia do projeto com a propriedade `AMBIENTE` = `homologacao` e as planilhas de teste na coluna `Homologação` do `ID_INDEX`. Passo a passo em [Ambiente de homologação](../AMBIENTE_DE_HOMOLOGACAO.md). O projeto de produção não recebe essa propriedade.

## Uso no dia a dia

O formulário não precisa de operação: os pedidos chegam à planilha como `pendente` e aparecem no gerenciador e no painel do Serviço de Graduação. Nenhum e-mail é enviado para a equipe; o recibo vai só para o aluno, como não responder.

## Diagnóstico

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Aluno vê **Login necessário** | conectado com conta que não é `@usp.br`, ou várias contas no navegador | orientar a abrir só com o e-mail USP (está na Central de Ajuda) |
| **Erro ao carregar** para todos | `ID_INDEX_SPREADSHEET_ID` ausente ou errado | conferir a propriedade; ver o registro em **Execuções** |
| Formulário abre sem pré-preencher para todos | chave `PLANILHA_ALUNOS` ausente, sem acesso ou títulos diferentes | conferir a chave e os títulos; o envio continua funcionando |
| Envio falha com "problema de configuração do formulário" | planilha de respostas não abre (chave `TRANCAMENTO_TOTAL_MATRICULA`, acesso) | conferir a chave e o acesso de edição da conta que implanta |
| Envio falha citando uma coluna | título da planilha de respostas foi alterado | restaurar o título exato da linha 1 |
| Tela de sucesso diz que o recibo não foi enviado | falta de autorização de e-mail ou cota diária | autorizar de novo (ver acima); o pedido foi gravado |

Os detalhes técnicos de cada falha ficam em **Execuções** do projeto, sem dados pessoais (só nomes de chave e coluna).
