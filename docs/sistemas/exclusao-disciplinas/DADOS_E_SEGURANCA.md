# Dados e segurança — Exclusão de Disciplinas (formulário dos alunos)

**Revisão da fonte para Git:** 16/10/2026 (v1.1). Preflight de conteúdo feito: nenhum ID de planilha, dado pessoal real ou captura de produção foi versionado. O [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente depende da implantação real.

## 1. Escopo

- Sistema: Formulário de Exclusão de Disciplinas (formulário dos alunos), v1.1.
- Público: alunos de graduação com conta `@usp.br`.
- Ambiente: produção existente; v1.1 sem homologação.
- Responsável funcional: Serviço de Graduação — IPUSP (nome não registrado aqui).
- Última revisão: 16/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| E-mail do login | conta `@usp.br` | identificar o solicitante | `Session.getActiveUser()` | planilha de respostas; página do próprio aluno; recibo | permanente na planilha | Pessoal |
| Nome, nº USP, ano de ingresso | dados de cadastro | identificar o aluno | cadastro de alunos (pré-preenchimento) e digitação do aluno | planilha de respostas; recibo | permanente | Pessoal |
| Curso/habilitação, conclusão do curso | opções e Sim/Não | análise do pedido | aluno | planilha de respostas; recibo | permanente | Pessoal |
| Disciplinas e turmas | `CÓDIGO - Nome`, turma | fazer a exclusão | aluno + cadastro DISCIPLINAS | planilha de respostas; recibo | permanente | Pessoal (vinculado ao aluno) |
| Observações | texto livre | informação ao Serviço de Graduação | aluno | planilha de respostas; recibo | permanente | Pessoal, potencialmente sensível |
| Ciência | `Ciente` | declaração | aluno | planilha de respostas | permanente | Pessoal |
| Pedidos anteriores | data, situação, disciplinas, turmas | mostrar ao aluno os próprios pedidos | planilha de respostas | página do próprio aluno | só em memória | Pessoal |
| Cadastro de disciplinas | código, nome, créditos-aula | preencher o nome | planilha DISCIPLINAS | página (todas as disciplinas) | cache de 1 h | Não pessoal (público no Júpiter) |
| Período | datas e horas | abrir/fechar e texto do requerimento | planilha de Períodos | página | — | Não pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até trocar | Não pessoal |

A página recebe do servidor só os dados do próprio aluno e, do cadastro de disciplinas, só código, nome e créditos-aula (conferido nos testes).

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela conta que implanta |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` | Não | leitura; Restrito |
| EXCLUSAO_DISCIPLINAS | Google Sheets; respostas | chave `EXCLUSAO_DISCIPLINAS` | Não | edição pela conta que implanta e pela equipe; Restrito |
| PERIODOS | Google Sheets; períodos dos formulários | chave `PERIODOS` | Não | leitura |
| DISCIPLINAS | Google Sheets; cadastro de disciplinas | chave `DISCIPLINAS` | Não | leitura |
| MailApp | envio de e-mail | — | — | conta que implanta |
| Painel de Solicitações | link `/exec` | URL fixa em `ExclusaoApp.html` | Sim (página dos alunos) | link apresentado aos alunos; não concede acesso |
| MARCA_USP_CLARA | PNG externo | URL fixa em `GradipMarcaUSP.html` | Sim | mesma dos outros sistemas |
| Regimento Geral da USP | link público | URL fixa na página | Sim | — |

A v1.0 tinha os IDs das três planilhas literais no código; os originais não foram versionados. O Painel dos servidores ainda lê a planilha de respostas por um ID próprio (`ID_PLANILHA_EXCLUSAO_DISCIPLINAS`, omitido do Git).

## 4. Web App

- Quem pode acessar: qualquer pessoa da Universidade de São Paulo (A CONFERIR na implantação).
- Executa como: `USER_DEPLOYING` (A CONFERIR na implantação).
- Autorização server-side: toda chamada (`obterDadosIniciais`, `obterCatalogoDisciplinas`, `registrarSolicitacao`) exige e-mail de sessão com domínio exato `usp.br`. O e-mail gravado e o destinatário do recibo são sempre o da sessão.
- Operações privilegiadas: acrescentar linhas na planilha de respostas; enviar o recibo.

**Corrigido em relação à v1.0.** Na v1.0 o e-mail era digitável e gravado como veio da página (pedido em nome de outra pessoa; recibo para qualquer endereço), e `buscarAlunoPorEmail` devolvia nome, nº USP e ano de ingresso de qualquer e-mail a quem chamasse pela página. Na v1.1 essa busca é interna (`buscarAlunoPorEmail_`) e só usa o login.

**Limites conhecidos.**
- Qualquer conta `@usp.br` (não só alunos do IP) consegue enviar um pedido; não há conferência de vínculo. O pedido fica com o e-mail real de quem enviou.
- Sem limite de pedidos por pessoa dentro do prazo (regra do formulário); cada envio manda um recibo, limitado pela cota diária de e-mails da conta.
- Nome, nº USP, ano, curso e turma são declarados pelo aluno; a equipe confere no Júpiter.
- Código fora do cadastro aceita o nome digitado.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID   (Propriedades do script)
PLANILHA_ALUNOS           (chave no ID_INDEX)
EXCLUSAO_DISCIPLINAS      (chave no ID_INDEX)
PERIODOS                  (chave no ID_INDEX)
DISCIPLINAS               (chave no ID_INDEX)
```

## 6. Logs

- Eventos registrados: falha ao abrir planilhas, ler períodos, alunos, histórico e cadastro de disciplinas, aba de respostas inesperada e falha do recibo, só com a mensagem técnica (nomes de chave/coluna).
- Identificadores registrados: nenhum.
- Proibido em log: e-mails, nomes, nº USP, disciplinas pedidas, observações, conteúdo do recibo e IDs de planilha (os testes conferem nome, e-mail, nº USP e observações).

## 7. Compartilhamento e acesso

- Planilha de respostas: Restrito; edição para a conta que implanta e para a equipe.
- Planilhas de alunos, Períodos, DISCIPLINAS e `ID_INDEX`: Restrito; leitura para a conta que implanta.
- Revisão de permissões: A VALIDAR INSTITUCIONALMENTE.

## 8. Dados de teste

- Testes em [`formulario/testes/`](../../../sistemas/exclusao-disciplinas/formulario/testes) com dados 100% sintéticos (nomes inventados, números `9000000+`, disciplinas `TST*`, e-mails fictícios).
- Capturas dos testes vão para uma pasta temporária e não são versionadas.

## 9. Pontos LGPD/institucionais

- Finalidade: receber pedidos de exclusão de matrícula em disciplinas.
- Base legal: A VALIDAR INSTITUCIONALMENTE.
- Retenção: A VALIDAR INSTITUCIONALMENTE (a planilha guarda todos os pedidos, inclusive os concluídos).
- Compartilhamentos externos: nenhum.
- Dados sensíveis: as observações são texto livre e podem conter informação sensível.

## 10. Incidentes

- Canal: o vigente na USP (ver [INCIDENTES.md](../../seguranca/INCIDENTES.md)).
- Medidas imediatas: tirar compartilhamento amplo das planilhas, se houver; arquivar a implantação se o envio estiver sendo abusado.
- Exposição na v1.0: a busca pública de aluno por e-mail permitia consultar nome e nº USP de terceiros. Não há registro de uso indevido; avaliar com o responsável se cabe o procedimento de [INCIDENTES.md](../../seguranca/INCIDENTES.md) (A VALIDAR INSTITUCIONALMENTE).

## 11. Exceções

Colunas da planilha de respostas por posição (não pelo título), porque o Painel dos servidores e o gerenciador já leem assim. Compensação: a gravação confere A1/B1 antes de escrever e o diagnóstico mostra os títulos de A a T.

## 12. Homologação

Checklist do ambiente pendente até a implantação da v1.1. Verificação local em [HOMOLOGACAO.md](HOMOLOGACAO.md).
