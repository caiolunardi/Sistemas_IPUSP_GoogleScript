# Dados e segurança — Gerenciador de Trancamento Total

**Criado em 20/10/2026** a partir da leitura do código (`sistemas/trancamento-total/gerenciador/src/Codigo.gs`, v1.1) e da configuração informada pelo responsável. O formulário dos alunos tem documento próprio: [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md).

## 1. Escopo

- Sistema: Gerenciador de Trancamento Total de Matrícula (v1.1 no repositório; v1.0 em uso, segundo o [README do código](../../../sistemas/trancamento-total/gerenciador/README.md)).
- Público: equipe do Serviço de Graduação.
- Ambiente: produção existente; sem ambiente de homologação.
- Responsável funcional: Serviço de Graduação — A VALIDAR (nome não registrado aqui).

## 2. Dados tratados

| Categoria | Origem | Destino | Classe |
|---|---|---|---|
| Nome, nº USP, ano de ingresso | planilha de respostas do formulário | navegador de quem abre o gerenciador | Pessoal |
| E-mail do formulário e e-mail de contato | idem | navegador; destinatário do aviso | Pessoal |
| **Justificativa** (texto livre) | idem | navegador, no detalhe do pedido | Pessoal; **pode conter dado de saúde** (sensível) |
| Situação, data de conclusão, e-mail enviado, versão | gravados pelo gerenciador na planilha | planilha | Administrativo ligado à pessoa |
| Relatórios | contagens por ano, mês e ingresso | navegador | Agregado |

## 3. Recursos externos

| Nome lógico | Config key | Permissão esperada |
|---|---|---|
| `ID_INDEX` | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | leitura pela identidade de execução |
| Planilha de respostas | chave `TRANCAMENTO_TOTAL_MATRICULA` no `ID_INDEX` | **edição** pela identidade de execução |
| Envio de e-mail | `MailApp` (conta de execução), resposta para o e-mail institucional | conta institucional |

## 4. Web App

- Quem pode acessar: **Somente eu** (informado pelo responsável em 20/10/2026).
- Executa como: **eu**, a conta institucional (informado em 20/10/2026).
- Manifesto `appsscript.json`: **não versionado** (ver [diagnóstico](../../governanca/DIAGNOSTICO_2026-10-20.md), achado P1).

### Autorização server-side

| Operação | Regra no servidor |
|---|---|
| `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `buscarHistorico`, `obterRelatorio`, `diagnosticarPlanilha` | **nenhuma** |
| `salvarPedido` (concluir, reabrir, avisar o aluno por e-mail) | **nenhuma** além da conferência de versão da linha (evita sobrescrever outra pessoa) e da reserva `ENVIANDO…` (evita e-mail duplo) |

**A fronteira de acesso é só a opção "Somente eu" da implantação.** Enquanto ela valer, ninguém além da conta institucional chama essas funções. Abrir o acesso a outra conta ou ao domínio, sem antes pôr autorização no servidor, entregaria as justificativas e o envio de e-mail a quem tiver o link. Proposta: [autorização de leitura nas ferramentas da equipe](../../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md).

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
```

## 6. Logs

- Log de execuções: falha da migração automática do Registro ID (mensagem técnica). Nomes ficam fora do registro de execução (v1.1, segundo o README do código).
- Proibido em log: nome, nº USP, e-mails, justificativa.

## 7. Compartilhamento e acesso

- Planilha de respostas: Restrito; edição para a conta institucional e para a equipe. A VALIDAR a lista.
- Revisão de permissões: A VALIDAR.

## 8. Dados de teste

`testes/testar_backend.js`: Apps Script simulado com pedidos inventados; nenhum dado real.

## 9. Pontos LGPD/institucionais

- Finalidade: tratar os pedidos de trancamento total e avisar o aluno.
- Base legal: **A VALIDAR INSTITUCIONALMENTE**.
- Retenção: **A VALIDAR INSTITUCIONALMENTE** (a planilha guarda todos os pedidos).
- Dado sensível: a justificativa pode trazer informação de saúde; acesso deve ser o mínimo necessário.

## 10. Incidentes

Se o acesso tiver sido aberto a outras contas: voltar "Quem pode acessar" para "Somente eu", revisar quem abriu (histórico de versões da planilha, log de e-mails enviados) e seguir [INCIDENTES.md](../../seguranca/INCIDENTES.md).

## 11. Exceções

- Ausência de autorização no servidor, aceita enquanto a implantação for "Somente eu" (seção 4).

## 12. Homologação

Sem homologação da v1.1 registrada. O `SECURITY_CHECKLIST.md` depende da implantação real.
