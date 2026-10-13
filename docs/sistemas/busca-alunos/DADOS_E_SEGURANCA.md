# Dados e segurança — Busca de Alunos

**Revisão da fonte para Git:** 13/10/2026. O preflight de conteúdo foi realizado; o [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente continua dependente da implantação real.

## 1. Escopo

- Sistema: Busca de Alunos (GRADIP UI v1.0).
- Público: equipe do Serviço de Graduação (triagem dos grupos de atendimento clínico).
- Ambiente: fonte Git; implantação em produção existente, sem homologação desta versão.
- Responsável funcional: Serviço de Graduação — A VALIDAR (nome do responsável não registrado aqui).
- Última revisão: 13/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Identificador acadêmico | Nº USP | localizar o aluno | planilha de alunos | navegador de quem abre a página | só em memória, enquanto a página está aberta | Pessoal |
| Nome | nome completo | localizar o aluno | planilha de alunos | navegador | idem | Pessoal |
| E-mail principal e secundário | endereço institucional/pessoal | contato no atendimento | planilha de alunos | navegador | idem | Pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até o usuário trocar | Não pessoal |

Outras colunas da planilha de alunos (por exemplo, ID de pasta) **não** são enviadas ao navegador. Nenhum registro real, fixture real ou captura de produção foi adicionado ao repositório; os testes usam nomes sintéticos e domínio `exemplo.invalid`.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela identidade de execução |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` no `ID_INDEX`, coluna `ID de Produção` | Não | leitura pela identidade de execução; Restrito |
| MARCA_USP_CLARA | PNG externo (marca institucional) | URL fixa em `GradipMarcaUSP.html` | Sim | mesma usada pelos outros sistemas |

O código versionado não contém o ID do `ID_INDEX` nem o da planilha de alunos. **O código original tinha o ID do `ID_INDEX` como constante literal**; esse valor foi retirado da fonte do Git e não aparece em nenhum arquivo do repositório. Também não utiliza `DriveApp`: a leitura ocorre via `SpreadsheetApp.openById`. Script Properties não protege o valor de editores autorizados do projeto.

## 4. Web App

- Quem pode acessar: **A VALIDAR** na implantação.
- Executa como: **A VALIDAR** (`USER_DEPLOYING` ou `USER_ACCESSING`).
- Autorização server-side: **não há** no código (comportamento original preservado nesta rodada visual). `listarAlunosParaBusca()` devolve a lista inteira a qualquer conta que consiga abrir o Web App.
- Dados enviados ao cliente: lista completa com número USP, nome, e-mail e e-mail secundário de todas as linhas não vazias.
- Operações privilegiadas: nenhuma escrita; apenas leitura das duas planilhas.

**Ponto de atenção (decisão pendente).** Como a busca é feita no navegador, quem abre a página recebe todo o cadastro, não só o resultado da busca. Se a implantação executar como quem implantou e estiver aberta a todo o domínio, qualquer conta desse domínio obtém a lista completa, mesmo sem acesso à planilha. Opções, para decisão do responsável funcional:

1. executar como **usuário que acessa** — a permissão de leitura da planilha de alunos passa a ser a fronteira de acesso;
2. manter a execução como implantador e acrescentar uma lista nominal validada no servidor, no mesmo padrão de `PERMISSOES_DE_ACESSO` da Estrutura Curricular;
3. restringir **Quem pode acessar** a um grupo específico, quando disponível.

Qualquer uma delas muda backend ou implantação e precisa de rodada própria; esta entrega não a aplicou.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
```

Configurada em **Configurações do projeto → Propriedades do script**. A chave `PLANILHA_ALUNOS` fica no próprio `ID_INDEX`.

## 6. Logs

- Eventos registrados: só por `diagnosticarBuscaAlunos()`, executada manualmente — existência da propriedade, nome da aba do índice, chave encontrada, presença das colunas e **quantidade** de alunos.
- Identificadores registrados: nenhum.
- Proibido em log: IDs de planilha, nomes, números USP, e-mails, termos digitados na busca.
- Estratégia de debug: o diagnóstico acima; mensagens de erro citam nomes de chave/coluna, nunca valores.

## 7. Compartilhamento e acesso

- Planilha de alunos e `ID_INDEX`: Restrito; leitura apenas para a identidade de execução e para quem administra o cadastro.
- Grupos/contas autorizados: descrever por papel — A VALIDAR.
- Revisão de permissões: A VALIDAR.

## 8. Dados de teste

- Fixtures sintéticas geradas nos [testes](../../../sistemas/busca-alunos/testes/README.md) (nomes inventados, números `9000000+`, e-mails `@exemplo.invalid`).
- Screenshots: nenhum versionado.
- Baseline sem produção: os testes simulam `SpreadsheetApp`, `PropertiesService` e `google.script.run`.

## 9. Pontos LGPD/institucionais

- Finalidade documentada: identificação de alunos na triagem dos grupos de atendimento clínico.
- Base legal: **A VALIDAR INSTITUCIONALMENTE**.
- Retenção: **A VALIDAR INSTITUCIONALMENTE** (a página não guarda dados de alunos depois de fechada).
- Compartilhamentos externos: nenhum feito pelo sistema.
- A Central de Ajuda orienta uso só para o atendimento, sem cópia para outros locais e com cuidado em computadores compartilhados.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional vigente.
- Medida imediata específica: se a lista tiver sido acessada por conta indevida, restringir **Quem pode acessar** ou desativar a implantação e revisar o compartilhamento das duas planilhas.

## 11. Exceções

- Ausência de autorização server-side, herdada do original (seção 4), registrada para decisão.
- Leitura do `ID_INDEX` mantém as regras do original (aba `Página1` ou primeira aba; colunas por título; sem validação da coluna `Tipo`), diferentemente do Painel de Solicitações, para não mudar comportamento nesta rodada.

## 12. Homologação

Verificação local registrada em [HOMOLOGACAO.md](HOMOLOGACAO.md). O `SECURITY_CHECKLIST.md` deve ser concluído na implantação real, junto com a decisão da seção 4.
