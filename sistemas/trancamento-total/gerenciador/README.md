# Gerenciador de Trancamento Total de Matrícula — fonte v1.1

Web App interno do Serviço de Graduação para tratar as respostas do formulário de trancamento total de matrícula: lista de pendentes, últimos concluídos, busca no histórico, relatórios e, em cada pedido, **Concluir solicitação** e/ou **Avisar aluno** por e-mail.

O GitHub é a referência de código, mas **não sincroniza** com o Apps Script: a atualização é copiar os arquivos de `src/` para o projeto.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | Backend: `ID_INDEX`, Registro ID + Versão, listas, detalhe, `salvarPedido`, busca, relatório e `diagnosticarPlanilha`. |
| `src/TrancamentoApp.html` | Interface (byte-idêntica à v1.0 recebida em 15/10/2026). |
| `testes/testar_backend.js` | Testes locais com dados sintéticos (`node testes/testar_backend.js`). Não vão para o Apps Script. |

## Configuração

1. **Configurações do projeto → Propriedades do script:** `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX` (o mesmo valor usado nos outros sistemas).
2. **Planilha `ID_INDEX`** (aba `Página1` ou a primeira; colunas `Chave` e `ID de Produção` pelo título): linha com a chave `TRANCAMENTO_TOTAL_MATRICULA` apontando para a planilha de respostas do formulário.
3. A conta que executa o Web App precisa ter acesso de **Editor** à planilha de respostas e de leitura ao `ID_INDEX`.

Nenhum ID de planilha fica no código. Não registre os valores nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| v1.0 (em uso) | ID da planilha literal no código. SHA-256 `Codigo.gs` `8f0b24ae…0618a`, `TrancamentoApp.html` `dff45d41…4675d`. |
| v1.1 | ID pelo `ID_INDEX`; versão sobe antes do envio do e-mail; linha relocalizada pelo Registro ID depois do envio; reserva `ENVIANDO…` com data (presa há mais de 10 min pede confirmação de reenvio); reabrir limpa a Data de Conclusão; e-mail validado antes do envio; mensagem clara com trava ocupada; nomes fora do registro de execução. Interface inalterada. |
