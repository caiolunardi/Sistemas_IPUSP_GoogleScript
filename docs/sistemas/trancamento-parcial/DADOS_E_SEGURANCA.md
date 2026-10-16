# Dados e segurança — Trancamento Parcial de Matrícula (formulário dos alunos)

**Revisão da fonte para Git:** 16/10/2026 (v1.1). Preflight de conteúdo feito: nenhum ID de planilha, dado pessoal real ou captura de produção foi versionado. O [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente depende da implantação real.

## 1. Escopo

- Sistema: Pedido de Trancamento Parcial de Matrícula (formulário dos alunos), v1.1.
- Público: alunos de graduação com conta `@usp.br`.
- Ambiente: produção existente; v1.1 sem homologação.
- Responsável funcional: Serviço de Graduação — IPUSP (nome não registrado aqui).
- Última revisão: 16/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| E-mail do login | conta `@usp.br` | identificar o solicitante | `Session.getActiveUser()` | planilha de respostas; página do próprio aluno; recibo | permanente na planilha | Pessoal |
| Nome, nº USP | dados de cadastro | identificar o aluno | cadastro de alunos (pré-preenchimento) e digitação do aluno | planilha de respostas; recibo | permanente na planilha | Pessoal |
| Créditos-aula matriculados, menos de 12, conclusão do curso | número e Sim/Não | análise do pedido | aluno | planilha de respostas; recibo | permanente | Pessoal |
| Disciplinas pedidas | `CÓDIGO - Nome` | cadastro do trancamento | aluno + cadastro DISCIPLINAS | planilha de respostas; recibo | permanente | Pessoal (vinculado ao aluno) |
| Justificativa | texto livre, pode citar saúde | análise do pedido | aluno | planilha de respostas; recibo | permanente | Pessoal, **potencialmente sensível** |
| Ciência | `Ciente` | declaração | aluno | planilha de respostas | permanente | Pessoal |
| Pedidos anteriores | data, situação, disciplinas | mostrar ao aluno os próprios pedidos | planilha de respostas | página do próprio aluno | só em memória | Pessoal |
| Cadastro de disciplinas | código, nome, créditos-aula | preencher o nome | planilha DISCIPLINAS | página (todas as disciplinas) | cache de 1 h | Não pessoal (público no Júpiter) |
| Período | datas e horas | abrir/fechar e textos | planilha de Períodos | página | — | Não pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até trocar | Não pessoal |

A página recebe do servidor só os dados do próprio aluno e, do cadastro de disciplinas, só código, nome e créditos-aula. Observações internas e as demais colunas da DISCIPLINAS não saem do servidor (conferido nos testes).

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela conta que implanta |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` | Não | leitura pela conta que implanta; Restrito |
| TRANCAMENTO_PARCIAL_MATRICULA | Google Sheets; respostas | chave `TRANCAMENTO_PARCIAL_MATRICULA` | Não | edição pela conta que implanta e pela equipe; Restrito |
| PERIODOS | Google Sheets; períodos dos formulários | chave `PERIODOS` | Não | leitura pela conta que implanta |
| DISCIPLINAS | Google Sheets; cadastro de disciplinas | chave `DISCIPLINAS` | Não | leitura pela conta que implanta |
| MailApp | envio de e-mail | — | — | conta que implanta (nova autorização na v1.1) |
| Painel de Solicitações | link `/exec` | URL fixa em `TrancamentoParcialApp.html` | Sim (página dos alunos) | link apresentado aos alunos; não concede acesso |
| MARCA_USP_CLARA | PNG externo | URL fixa em `GradipMarcaUSP.html` | Sim | mesma dos outros sistemas |
| Regimento Geral e Resoluções CoG | links públicos | URLs fixas na página | Sim | — |

A v1.0 tinha os IDs das três planilhas literais no código; os originais não foram versionados.

## 4. Web App

- Quem pode acessar: qualquer pessoa da Universidade de São Paulo (confirmado em 16/10/2026).
- Executa como: `USER_DEPLOYING` (confirmado em 16/10/2026).
- Autorização server-side: toda chamada (`obterDadosIniciais`, `obterCatalogoDisciplinas`, `registrarSolicitacao`) exige e-mail de sessão com domínio exato `usp.br`. O e-mail gravado é sempre o da sessão.
- Operações privilegiadas: acrescentar uma linha na planilha de respostas; enviar o recibo.

**Limites conhecidos.**
- Qualquer conta `@usp.br` (não só alunos do IP) consegue enviar um pedido; não há conferência de vínculo. O pedido fica com o e-mail real de quem enviou.
- Sem limite de pedidos por pessoa dentro do prazo (regra do formulário); cada envio manda um recibo, o que limita o uso à cota diária de e-mails da conta.
- Créditos-aula e as respostas Sim/Não são declarados pelo aluno; a equipe confere no Júpiter.
- Código fora do cadastro aceita o nome digitado: a equipe confere a disciplina no Júpiter.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID         (Propriedades do script)
PLANILHA_ALUNOS                 (chave no ID_INDEX)
TRANCAMENTO_PARCIAL_MATRICULA   (chave no ID_INDEX)
PERIODOS                        (chave no ID_INDEX)
DISCIPLINAS                     (chave no ID_INDEX)
```

## 6. Logs

- Eventos registrados: falha ao abrir planilhas, ler períodos, alunos, histórico e cadastro de disciplinas, coluna ausente e falha do recibo, só com a mensagem técnica (nomes de chave/coluna).
- Identificadores registrados: nenhum.
- Proibido em log: e-mails, nomes, nº USP, disciplinas pedidas, justificativa, conteúdo do recibo e IDs de planilha (os testes conferem que nome, e-mail, nº USP e justificativa não aparecem).

## 7. Compartilhamento e acesso

- Planilha de respostas: Restrito; edição para a conta que implanta e para a equipe.
- Planilhas de alunos, Períodos, DISCIPLINAS e `ID_INDEX`: Restrito; leitura para a conta que implanta.
- Revisão de permissões: A VALIDAR INSTITUCIONALMENTE.

## 8. Dados de teste

- Testes em [`formulario/testes/`](../../../sistemas/trancamento-parcial/formulario/testes) com dados 100% sintéticos (nomes inventados, números `9000000+`, disciplinas `TST*`, e-mails fictícios).
- Capturas dos testes vão para uma pasta temporária e não são versionadas.

## 9. Pontos LGPD/institucionais

- Finalidade: receber pedidos de trancamento parcial de matrícula.
- Base legal: A VALIDAR INSTITUCIONALMENTE.
- Retenção: A VALIDAR INSTITUCIONALMENTE (a planilha guarda todos os pedidos, inclusive os concluídos).
- Compartilhamentos externos: nenhum.
- Dados sensíveis: a justificativa pode conter informação de saúde; aparece na planilha, no gerenciador e no recibo.

## 10. Incidentes

- Canal: o vigente na USP (ver [INCIDENTES.md](../../seguranca/INCIDENTES.md)).
- Medidas imediatas: tirar compartilhamento amplo das planilhas, se houver; arquivar a implantação se o envio estiver sendo abusado.

## 11. Exceções

Nenhuma.

## 12. Homologação

Checklist do ambiente pendente até a implantação da v1.1. Verificação local em [HOMOLOGACAO.md](HOMOLOGACAO.md).
