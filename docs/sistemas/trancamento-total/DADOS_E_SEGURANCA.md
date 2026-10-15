# Dados e segurança — Trancamento Total de Matrícula (formulário dos alunos)

**Revisão da fonte para Git:** 15/10/2026 (v1.2). Preflight de conteúdo feito: nenhum ID de planilha, dado pessoal real ou captura de produção foi versionado. O [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente depende da implantação real.

## 1. Escopo

- Sistema: Pedido de Trancamento Total de Matrícula (formulário dos alunos), v1.2.
- Público: alunos de graduação com conta `@usp.br`.
- Ambiente: produção existente; v1.2 sem homologação.
- Responsável funcional: Serviço de Graduação — IPUSP (nome não registrado aqui).
- Última revisão: 15/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| E-mail do login | conta `@usp.br` | identificar o solicitante | `Session.getActiveUser()` | planilha de respostas; página do próprio aluno | permanente na planilha | Pessoal |
| Nome, nº USP, ano de ingresso | dados de cadastro | identificar o aluno | cadastro de alunos (pré-preenchimento) e digitação do aluno | planilha de respostas; recibo | permanente na planilha | Pessoal |
| E-mail para contato | endereço pessoal ou institucional | contato | digitação do aluno | planilha de respostas; cópia do recibo | permanente na planilha | Pessoal |
| Justificativa | texto livre, pode citar saúde | análise do pedido | digitação do aluno | planilha de respostas; recibo | permanente na planilha | Pessoal, **potencialmente sensível** (saúde) |
| Confirmação | SIM | ciência das regras | aluno | planilha de respostas | permanente | Pessoal |
| Pedidos anteriores | data e situação | mostrar ao aluno os próprios pedidos e exigir confirmação com pendente | planilha de respostas | página do próprio aluno | só em memória | Pessoal |
| Recibo | e-mail com todos os campos enviados | comprovante ao aluno | servidor | caixa do aluno (e do e-mail de contato) | na caixa do destinatário e em Enviados da conta que implanta | Pessoal, potencialmente sensível |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até trocar | Não pessoal |

A página recebe do servidor só os dados do próprio aluno (pré-preenchimento do cadastro e pedidos do próprio e-mail). Nunca recebe dados de outros alunos.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela conta que implanta |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` no `ID_INDEX` | Não | leitura pela conta que implanta; Restrito |
| TRANCAMENTO_TOTAL_MATRICULA | Google Sheets; respostas | chave `TRANCAMENTO_TOTAL_MATRICULA` no `ID_INDEX` | Não | edição pela conta que implanta e pela equipe; Restrito |
| MailApp | envio de e-mail | — | — | conta que implanta (nova autorização na v1.2) |
| MARCA_USP_CLARA | PNG externo | URL fixa em `GradipMarcaUSP.html` | Sim | mesma dos outros sistemas |
| Resolução CoG 3761/1990 | link público | URL fixa na página | Sim | — |

A v1.0 tinha os IDs das duas planilhas literais no código; os originais não foram versionados.

## 4. Web App

- Quem pode acessar: qualquer pessoa da Universidade de São Paulo (confirmado em 15/10/2026).
- Executa como: `USER_DEPLOYING` (a conta do Serviço de Graduação; confirmado em 15/10/2026).
- Autorização server-side: toda chamada exige e-mail de sessão terminado em `@usp.br` (comparação do domínio exato, não "contém"). O e-mail gravado é sempre o da sessão.
- Dados enviados ao cliente: e-mail do login; nome, nº USP e ano de ingresso do próprio cadastro; data e situação dos pedidos do próprio e-mail.
- Operações privilegiadas: acrescentar uma linha na planilha de respostas; enviar o recibo.

**Fronteira de acesso.** Como o app executa como a conta que implanta, os alunos não precisam (e não devem) ter acesso às planilhas. A v1.0 orientava "Executar como: usuário que acessa", o que exigiria compartilhar a planilha de respostas com todo o domínio para edição; a implantação real já usa "Eu". Recomendação: conferir que nem a planilha de respostas nem a de alunos nem o `ID_INDEX` estão compartilhados com "qualquer pessoa da USP" ou "qualquer pessoa com o link".

**Limites conhecidos.**
- Qualquer conta `@usp.br` (não só alunos) consegue enviar um pedido; não há conferência de vínculo de aluno. O pedido fica com o e-mail real de quem enviou.
- Não há limite de quantidade de pedidos por pessoa além da confirmação com pedido pendente. Cada envio manda um recibo, o que limita o uso à cota diária de e-mails da conta.
- O recibo vai também para o e-mail de contato digitado pelo aluno. Um aluno poderia digitar o endereço de outra pessoa; o conteúdo é só o próprio pedido dele, enviado como não responder.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID      (Propriedades do script)
PLANILHA_ALUNOS              (chave no ID_INDEX)
TRANCAMENTO_TOTAL_MATRICULA  (chave no ID_INDEX)
```

## 6. Logs

- Eventos registrados: falha ao abrir planilhas, ao ler o cadastro de alunos, ao ler o histórico e ao enviar o recibo, só com a mensagem técnica (nomes de chave/coluna).
- Identificadores registrados: nenhum.
- Proibido em log: e-mails, nomes, nº USP, justificativa, conteúdo do recibo e IDs de planilha (os testes locais conferem que nome, e-mail e nº USP não aparecem).
- Estratégia de debug: **Execuções** do projeto e a tabela de diagnóstico do [manual](MANUAL_OPERACAO.md).

## 7. Compartilhamento e acesso

- Planilha de respostas: Restrito; edição para a conta que implanta e para a equipe do Serviço de Graduação (o gerenciador lê e grava nela).
- Planilha de alunos e `ID_INDEX`: Restrito; leitura para a conta que implanta.
- Revisão de permissões: A VALIDAR INSTITUCIONALMENTE (periodicidade não definida).

## 8. Dados de teste

- Testes em [`formulario/testes/`](../../../sistemas/trancamento-total/formulario/testes) com dados 100% sintéticos (nomes inventados, números `9000000+`, e-mails `@exemplo.invalid` e `@usp.br` fictícios).
- Capturas de tela dos testes vão para uma pasta temporária e não são versionadas.

## 9. Pontos LGPD/institucionais

- Finalidade: receber e processar pedidos de trancamento total de matrícula.
- Base legal: A VALIDAR INSTITUCIONALMENTE.
- Retenção: A VALIDAR INSTITUCIONALMENTE (a planilha guarda todos os pedidos desde o início, inclusive os concluídos).
- Compartilhamentos externos: nenhum além do e-mail de contato indicado pelo próprio aluno.
- Dados sensíveis: a justificativa pode conter informação de saúde. Ela aparece na planilha, no gerenciador e no recibo.

## 10. Incidentes

- Canal: o vigente na USP (ver [INCIDENTES.md](../../seguranca/INCIDENTES.md)); nenhum contato inventado aqui.
- Medidas imediatas específicas: tirar o compartilhamento amplo das planilhas, se houver; arquivar a implantação do Web App se o envio estiver sendo abusado.

## 11. Exceções

Nenhuma.

## 12. Homologação

Checklist do ambiente pendente até a implantação da v1.2. Verificação local em [HOMOLOGACAO.md](HOMOLOGACAO.md).
