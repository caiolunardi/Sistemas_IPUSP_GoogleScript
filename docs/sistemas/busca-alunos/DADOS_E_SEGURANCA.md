# Dados e segurança — Comunidade IPUSP (antiga Busca de Alunos)

**Revisão da fonte para Git:** 14/10/2026 (v1.2). O preflight de conteúdo foi realizado; o [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente continua dependente da implantação real.

## 1. Escopo

- Sistema: Comunidade IPUSP (v1.2; até a v1.1, Busca de Alunos).
- Público: equipe do Serviço de Graduação (triagem dos grupos de atendimento clínico; contato com docentes, servidores e setores).
- Ambiente: fonte Git; implantação em produção existente, sem homologação desta versão.
- Responsável funcional: Serviço de Graduação — A VALIDAR (nome do responsável não registrado aqui).
- Última revisão: 14/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Identificador acadêmico | Nº USP | localizar o aluno | planilha de alunos | navegador de quem abre a página | só em memória, enquanto a página está aberta | Pessoal |
| Nome | nome completo | localizar o aluno | planilha de alunos | navegador | idem | Pessoal |
| Ingresso | ano/semestre (AAAA/S) | filtro e listas por turma | planilha de alunos | navegador | idem | Pessoal (acadêmico) |
| E-mail principal e secundário | endereço institucional/pessoal | contato no atendimento; listas por turma | planilha de alunos | navegador | idem | Pessoal |
| Ficha completa de um aluno | todas as colunas com título da linha (inclui ID da Pasta) | conferência e correção do cadastro | planilha de alunos | navegador, só quando a ficha é aberta | em memória, enquanto a ficha está aberta | Pessoal |
| Alterações da ficha | valores novos digitados | correção do cadastro | navegador | planilha de alunos | permanente na planilha (histórico de versões do Sheets) | Pessoal |
| Arquivos exportados | CSV/PDF com vínculo, nome, setor, nº USP, ingresso, e-mails | atender pedidos de listas (ex.: setor de comunicação) | navegador / servidor (PDF) | computador de quem exporta | fora do sistema; responsabilidade de quem exporta | Pessoal |
| (v1.2) Docentes | nome e e-mail institucional | localizar e contatar o docente | planilha de docentes (B, D) | navegador de quem abre a página | só em memória, enquanto a página está aberta | Pessoal |
| (v1.2) Servidores | nome, e-mail e setor | localizar e contatar o servidor | planilha de servidores (A, B, C) | navegador | idem | Pessoal |
| (v1.2) Setores | nome do setor e e-mail institucional da seção | contato com a seção | planilha de servidores | navegador | idem | Não pessoal (conta institucional) |
| E-mail de quem usa | conta @usp.br | decidir se pode salvar | `Session.getActiveUser()` | só no servidor | não guardado | Pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até o usuário trocar | Não pessoal |

A lista de busca leva, de alunos, só as cinco colunas da tabela acima; de docentes, só nome e e-mail; de servidores, só nome, e-mail e setor (as demais colunas dessas planilhas não são lidas); as demais colunas (por exemplo, `ID da Pasta`) só vão ao navegador quando a ficha daquele aluno é aberta. O PDF é montado com as linhas que a própria página já tem; o servidor não relê a planilha para isso e não grava o arquivo no Drive. Nenhum registro real, fixture real ou captura de produção foi adicionado ao repositório; os testes usam nomes sintéticos e domínio `exemplo.invalid`.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela identidade de execução |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` no `ID_INDEX`, coluna `ID de Produção` | Não | leitura **e edição** pela identidade de execução; Restrito |
| (v1.2) SERVIDORES | Google Sheets; cadastro de servidores e setores | chave `SERVIDORES` no `ID_INDEX` | Não | leitura pela identidade de execução (primeira aba: A e-mail, B nome, C setor) |
| (v1.2) PLANILHA_DOCENTES | Google Sheets; cadastro de docentes | chave `PLANILHA_DOCENTES` no `ID_INDEX` | Não | leitura pela identidade de execução (primeira aba: B nome, D e-mail) |
| MARCA_USP_CLARA | PNG externo (marca institucional) | URL fixa em `GradipMarcaUSP.html` | Sim | mesma usada pelos outros sistemas |

O código versionado não contém o ID do `ID_INDEX` nem os das planilhas de alunos, servidores e docentes. **O código original tinha o ID do `ID_INDEX` como constante literal**; esse valor foi retirado da fonte do Git e não aparece em nenhum arquivo do repositório. Também não utiliza `DriveApp`: a leitura ocorre via `SpreadsheetApp.openById`. Script Properties não protege o valor de editores autorizados do projeto.

## 4. Web App

- Quem pode acessar: **A VALIDAR** na implantação.
- Executa como: **A VALIDAR** (`USER_DEPLOYING` ou `USER_ACCESSING`).
- Dados enviados ao cliente: lista com linha, número USP, nome, ingresso, e-mail e e-mail secundário de todos os alunos; (v1.2) linha, nome e e-mail de todos os docentes; linha, nome, e-mail e setor de todos os servidores e setores; motivo (sem IDs nem e-mails) de cadastro que não abriu; ficha completa de um aluno quando aberta.
- Operações privilegiadas: **gravação** de células da planilha de alunos (`salvarFichaAluno`).

### Autorização server-side

| Operação | Regra no servidor |
|---|---|
| `listarComunidadeParaBusca` (v1.2), `listarAlunosParaBusca`, `obterFichaAluno`, `gerarPdfListaAlunos` | **nenhuma** além do acesso ao Web App (comportamento original da leitura preservado). |
| `salvarFichaAluno` | o e-mail de `Session.getActiveUser()` precisa estar em `getEditors()` da planilha de alunos ou ser o dono. Sem e-mail identificado → recusa. Conferido a cada gravação, com `LockService`. |

Além da permissão, a gravação confere que a linha ainda é do mesmo aluno (número USP + nome), que cada campo alterado continua igual ao valor de quando a ficha abriu (sem sobrescrever outra pessoa), que a coluna existe, não é `ID da Pasta` e não tem fórmula, e o formato dos campos conhecidos. Entradas têm caracteres de controle removidos e limite de 500 caracteres. Nada do conteúdo é registrado em log.

Limitações conhecidas: compartilhamento só via **grupo** não aparece em `getEditors()` (a pessoa precisa ser editora individual); a regra vale para o Web App, não substitui a revisão de quem é editor da planilha.

**Ponto de atenção (decisão pendente) — leitura.** Como a busca é feita no navegador, quem abre a página recebe todo o cadastro, não só o resultado da busca, e pode exportá-lo. A v1.2 amplia esse alcance aos cadastros de docentes e servidores (nome, e-mail e setor), o que torna a decisão abaixo mais relevante. Se a implantação executar como quem implantou e estiver aberta a todo o domínio, qualquer conta desse domínio obtém a lista completa, mesmo sem acesso à planilha. Opções, para decisão do responsável funcional:

1. executar como **usuário que acessa** — a permissão de leitura de cada planilha passa a ser a fronteira de acesso (quem não lê o cadastro de docentes, por exemplo, vê o aviso de cadastro indisponível e os demais) (e a de edição continua conferida pelo servidor);
2. manter a execução como implantador e aplicar à leitura a mesma regra da gravação (só editores/leitores da planilha), ou uma lista nominal como `PERMISSOES_DE_ACESSO` da Estrutura Curricular;
3. restringir **Quem pode acessar** a um grupo específico, quando disponível.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
```

Configurada em **Configurações do projeto → Propriedades do script**. A chave `PLANILHA_ALUNOS` fica no próprio `ID_INDEX`.

## 6. Logs

- Gravações: o próprio Sheets mantém o histórico de versões da planilha (quem executa o Web App aparece como autor quando ele roda como implantador). O app não mantém log próprio de alterações.
- Eventos registrados: só por `diagnosticarComunidadeIPUSP()` (antes `diagnosticarBuscaAlunos()`), executada manualmente — existência da propriedade, nome da aba do índice, chaves encontradas, presença/títulos das colunas usadas, motivo de falha sem IDs nem e-mails e **quantidades** por vínculo.
- Identificadores registrados: nenhum.
- Proibido em log: IDs de planilha, nomes, números USP, e-mails, setores, termos digitados na busca, valores da ficha e conteúdo das exportações.
- Estratégia de debug: o diagnóstico acima; mensagens de erro citam nomes de chave/coluna, nunca valores.

## 7. Compartilhamento e acesso

- Planilha de alunos: Restrito; edição para a identidade de execução e para quem pode corrigir o cadastro pelo app (editores individuais). `ID_INDEX`, planilhas de servidores e de docentes: Restrito, leitura pela identidade de execução (o app não grava nelas).
- Grupos/contas autorizados: descrever por papel — A VALIDAR.
- Revisão de permissões: A VALIDAR.

## 8. Dados de teste

- Fixtures sintéticas geradas nos [testes] (alunos, docentes, servidores e setores inventados)(../../../sistemas/busca-alunos/testes/README.md) (nomes inventados, números `9000000+`, e-mails `@exemplo.invalid`).
- Screenshots: nenhum versionado.
- Baseline sem produção: os testes simulam `SpreadsheetApp`, `PropertiesService` e `google.script.run`.

## 9. Pontos LGPD/institucionais

- Finalidades documentadas: identificação de alunos na triagem dos grupos de atendimento clínico; correção do cadastro; listas por ano de ingresso para comunicação institucional; (v1.2) localização e contato de docentes, servidores e setores pela equipe do Serviço de Graduação.
- Base legal: **A VALIDAR INSTITUCIONALMENTE**.
- Retenção: **A VALIDAR INSTITUCIONALMENTE** (a página não guarda dados depois de fechada).
- Compartilhamentos externos: nenhum feito pelo sistema. Arquivos exportados saem do controle do sistema; a ajuda orienta envio só a quem pediu, pelo e-mail institucional, e descarte das cópias.
- A Central de Ajuda orienta uso só para o atendimento, sem cópia para outros locais e com cuidado em computadores compartilhados.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional vigente.
- Medida imediata específica: se a lista tiver sido acessada por conta indevida, restringir **Quem pode acessar** ou desativar a implantação e revisar o compartilhamento do `ID_INDEX` e dos três cadastros.
- Gravação indevida ou em massa: desativar a implantação, revisar os editores da planilha de alunos e restaurar o conteúdo pelo **histórico de versões** do Sheets.

## 11. Exceções

- Leitura sem autorização server-side, herdada do original (seção 4), registrada para decisão. A gravação, nova na v1.1, já nasce com autorização no servidor.
- (v1.2) Servidores e docentes são lidos pela posição da coluna, como na Estrutura Curricular 1.11.0, sem conferir títulos; o diagnóstico mostra os títulos para conferência.
- Leitura do `ID_INDEX` mantém as regras do original (aba `Página1` ou primeira aba; colunas por título; sem validação da coluna `Tipo`), diferentemente do Painel de Solicitações, para não mudar comportamento nesta rodada.

## 12. Homologação

Verificação local registrada em [HOMOLOGACAO.md](HOMOLOGACAO.md). O `SECURITY_CHECKLIST.md` deve ser concluído na implantação real, junto com a decisão da seção 4.
