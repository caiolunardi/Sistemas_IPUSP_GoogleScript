# Dados e segurança — formulário de Abertura de Habilitação 2.0

## 1. Escopo

- Sistema: Pedido de Abertura de Habilitação (formulário dos alunos), `sistemas/abertura-habilitacoes/formulario/`
- Público: alunos
- Ambiente: produção e homologação (`AMBIENTE`)
- Responsável funcional: Serviço de Graduação (A VALIDAR INSTITUCIONALMENTE o nome do responsável)
- Última revisão: 05/11/2026, só código e testes com dados fictícios

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Identidade do login | e-mail `@usp.br` | identificar quem pede | `Session.getActiveUser()` | colunas B e F; recibo | planilha de respostas | Pessoal |
| Pré-preenchimento | Nº USP, nome, ano de ingresso | facilitar o preenchimento | planilha de alunos | só a página de quem abriu | não grava, salvo o que o aluno enviar | Pessoal |
| Pedido | declaração, Nº USP, nome, ano, trancamento, programa(s), observações | atender o pedido | página | planilha de respostas (A–K) | planilha | Pessoal |
| Identificação técnica | Registro ID (UUID), Versão | o Gerenciador achar o pedido | servidor | colunas do Gerenciador | planilha | Interna |
| Histórico do próprio aluno | programa, data, situação | mostrar os pedidos anteriores | as duas abas (só leitura) | só a página do próprio aluno | não grava | Pessoal |
| Recibo | nome, Nº USP, ano, programa, observações | confirmar o recebimento | servidor | e-mail do login (`MailApp`, `noReply`) | caixa de saída da conta que implantou | Pessoal |
| Aparência | `system`/`light`/`dark` | tema | navegador | `localStorage["gradip-theme"]` | navegador | Não pessoal |

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| `ID_INDEX` | Google Sheets | `ID_INDEX_SPREADSHEET_ID` (Script Property) | Não | leitura pela conta que implanta |
| `PLANILHA_ALUNOS` | Google Sheets | chave do `ID_INDEX` | Não | leitura |
| `PERIODOS` | Google Sheets | chave do `ID_INDEX` | Não | leitura |
| `ABERTURA_HABILITACOES` | Google Sheets | chave do `ID_INDEX` | Não | leitura e escrita (só `appendRow` na aba atual) |

## 4. Web App

- Quem pode acessar: qualquer pessoa da USP (`DOMAIN`).
- Executa como: `USER_DEPLOYING`. Os alunos não precisam de acesso às planilhas ([DECISOES.md](DECISOES.md), item 3).
- Autorização no servidor: e-mail da sessão com domínio exatamente `usp.br`, conferido de novo em cada gravação; nunca o e-mail mandado pela página.
- Dados enviados à página: só os do próprio login (pré-preenchimento e pedidos com o mesmo e-mail). Nenhum ID, nome de coluna ou detalhe técnico.
- Operações privilegiadas: `diagnosticarConfiguracao`, só pelo editor; não grava.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID   (Script Property)
AMBIENTE                  (Script Property, só na homologação)
PLANILHA_ALUNOS, PERIODOS, ABERTURA_HABILITACOES   (chaves do ID_INDEX)
```

## 6. Logs

- Registrados: falhas de configuração, de esquema (`ESQUEMA: …`, só nomes de coluna), de período, de leitura e de envio do recibo.
- Proibido em log: nome, Nº USP, e-mail e texto das observações. Conferido pelo teste "log sem dados pessoais".

## 7. Compartilhamento e acesso

- Planilhas: só a equipe e a conta que implanta. Com "Executar como: eu", os alunos deixam de precisar de acesso.

## 8. Pendências institucionais

- Base legal e prazo de retenção dos pedidos: A VALIDAR INSTITUCIONALMENTE.
