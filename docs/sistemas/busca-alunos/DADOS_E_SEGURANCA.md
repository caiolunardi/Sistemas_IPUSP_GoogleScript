# Dados e segurança — Gerenciador de Pessoas (antes Comunidade IPUSP e Busca de Alunos)

**Revisão da fonte para Git:** 14/10/2026 (v1.3). O preflight de conteúdo foi realizado; o [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente continua dependente da implantação real.

## 1. Escopo

- Sistema: Comunidade IPUSP (v1.3; até a v1.1, Busca de Alunos).
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
| (v1.2/v1.3) Docentes | nome, nº USP, e-mail e e-mail secundário | localizar e contatar o docente | planilha de docentes | navegador de quem abre a página | só em memória, enquanto a página está aberta | Pessoal |
| (v1.2/v1.3) Servidores | nome, nº USP, e-mail, e-mail secundário e setor | localizar e contatar o servidor | planilha de servidores | navegador | idem | Pessoal |
| (v1.2) Setores | nome do setor e e-mails institucionais da seção | contato com a seção | planilha de servidores | navegador | idem | Não pessoal (conta institucional) |
| (v1.3) Gênero do docente (`M / F`) | M ou F | tratamento Prof./Profª. na ficha | planilha de docentes | navegador, só quando a ficha do docente é aberta | em memória, enquanto a ficha está aberta | Pessoal |
| (v1.3) Ficha completa de docente, servidor ou setor | todas as colunas com título da linha (inclui `ID da Pasta`, `TIPO`) | conferência e correção do cadastro | planilha do cadastro | navegador, só quando a ficha é aberta | idem | Pessoal |
| (v1.3) Alterações dessas fichas | valores novos digitados | correção do cadastro | navegador | planilha de docentes ou de servidores | permanente na planilha (histórico de versões do Sheets) | Pessoal |
| (v1.3) Nº USP copiado | número | colar em outro sistema do atendimento | navegador | área de transferência do computador de quem clicou | até ser substituído na área de transferência | Pessoal |
| E-mail de quem usa | conta @usp.br | decidir se pode salvar | `Session.getActiveUser()` | só no servidor | não guardado | Pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até o usuário trocar | Não pessoal |

A lista de busca leva, de alunos, só as cinco colunas da tabela acima; de docentes, só nº USP, nome e e-mails (o gênero fica de fora); de servidores e setores, só nº USP, nome, e-mails e setor (o `TIPO` vira apenas o selo); as demais colunas (por exemplo, `ID da Pasta`) só vão ao navegador quando a ficha daquela linha é aberta. A coluna `TRATAMENTO` dos docentes não é enviada nem exibida. O PDF é montado com as linhas que a própria página já tem; o servidor não relê a planilha para isso e não grava o arquivo no Drive. Nenhum registro real, fixture real ou captura de produção foi adicionado ao repositório; os testes usam nomes sintéticos e domínio `exemplo.invalid`.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela identidade de execução |
| PLANILHA_ALUNOS | Google Sheets; cadastro de alunos | chave `PLANILHA_ALUNOS` no `ID_INDEX`, coluna `ID de Produção` | Não | leitura **e edição** pela identidade de execução; Restrito |
| (v1.2) SERVIDORES | Google Sheets; cadastro de servidores e setores | chave `SERVIDORES` no `ID_INDEX` | Não | leitura **e edição** (v1.3) pela identidade de execução; colunas pelo título |
| (v1.2) PLANILHA_DOCENTES | Google Sheets; cadastro de docentes | chave `PLANILHA_DOCENTES` no `ID_INDEX` | Não | leitura **e edição** (v1.3) pela identidade de execução; colunas pelo título |
| (v1.5) PEDIDOS_COLACAO | Google Sheets; pedidos de colação gravados pelo Formulário 2.x | chave `PEDIDOS_COLACAO` no `ID_INDEX` | Não | leitura de `PROTOCOLOS`, `VERSOES`, `DOCUMENTOS`; gravação só por inserção em `DECISOES_CADASTRO` (aba criada pelo editor); Restrito |
| (v1.4) PERMISSOES_DE_ACESSO | Google Sheets; lista de quem usa cada sistema | chave `PERMISSOES_DE_ACESSO` no `ID_INDEX`, aba `PESSOAS_IPUSP` | Não | leitura pela identidade de execução (colunas B a E: nome, e-mail, observação, perfil); Restrito |
| MARCA_USP_CLARA | PNG externo (marca institucional) | URL fixa em `GradipMarcaUSP.html` | Sim | mesma usada pelos outros sistemas |

O código versionado não contém o ID do `ID_INDEX` nem os das planilhas de alunos, servidores e docentes. **O código original tinha o ID do `ID_INDEX` como constante literal**; esse valor foi retirado da fonte do Git e não aparece em nenhum arquivo do repositório. Também não utiliza `DriveApp`: a leitura ocorre via `SpreadsheetApp.openById`. Script Properties não protege o valor de editores autorizados do projeto.

## 4. Web App

- Quem pode acessar: **Somente eu** (informado pelo responsável em 20/10/2026). Desde a v1.4 o manifesto versionado diz o mesmo (`"access": "MYSELF"`); abrir o acesso a outras contas é uma mudança separada, num PR próprio, depois da homologação da v1.4.
- Executa como: **eu**, a conta institucional (`USER_DEPLOYING`; informado em 20/10/2026; versionado na v1.4).
- Dados enviados ao cliente: lista com linha, número USP, nome, ingresso, e-mail e e-mail secundário de todos os alunos; (v1.2) (v1.3) linha, nº USP, nome e e-mails de todos os docentes; linha, nº USP, nome, e-mails e setor de todos os servidores e setores; motivo (sem IDs nem e-mails) de cadastro que não abriu; ficha completa de uma linha quando aberta.
- Operações privilegiadas: **gravação** de células das planilhas de alunos, docentes e servidores (`salvarFicha`; `salvarFichaAluno` é atalho para alunos).

### Autorização server-side

| Operação | Regra no servidor |
|---|---|
| `doGet` (v1.4) | perfil LEITOR ou ADMINISTRADOR na aba `PESSOAS_IPUSP`; senão devolve `PessoasSemAcesso` (aviso, nenhum dado, nenhuma chamada ao servidor). Abrir a página não libera nada por si: cada função confere de novo. |
| `listarComunidadeParaBusca` (v1.2), `listarAlunosParaBusca`, `obterFicha` (v1.3), `obterFichaAluno`, `gerarPdfListaAlunos` | (v1.4) `exigirLeitorPessoas_()`: LEITOR ou ADMINISTRADOR, **antes** de abrir qualquer cadastro. Até a v1.3: nenhuma. |
| `salvarFicha` (v1.3), `salvarFichaAluno` | (v1.4) `exigirAdministradorPessoas_()` antes de abrir o cadastro **e**, como desde a v1.1, o e-mail de `Session.getActiveUser()` precisa estar em `getEditors()` da planilha **daquele cadastro** ou ser o dono. `cadastro` só aceita `alunos`, `docentes` ou `servidores`. Conferido a cada gravação, com `LockService`. |
| `obterFilaCadastro` (v1.5) | `exigirLeitorPessoas_()`; LEITOR recebe só `{visivel:false}`, sem abrir nada; ADMINISTRADOR recebe a fila (sem RG; links de documento abrem só com permissão no Drive). |
| `decidirCadastro` (v1.5) | `exigirAdministradorPessoas_()` e editor da planilha de alunos, sob `LockService`; pedido conferido na fila e na versão mostrada; vincular confere a linha pelo nº USP e nome; criar recusa nº USP ou e-mail existentes e relê o nº USP depois de gravar. |
| `prepararDecisoesCadastro` (v1.5) | só no editor (e-mail da sessão igual ao da conta que executa); cria a aba se faltar. |
| `diagnosticarComunidadeIPUSP` | (v1.4) registra ambiente e perfil de quem roda; só lê os cadastros para ADMINISTRADOR. Não devolve dado. |

Regras comuns (v1.4, `PessoasAcesso.gs`, mesmo padrão do Gerenciador de Colação de Grau e Diplomas): identidade só de `Session.getActiveUser()` (nunca da página; `getEffectiveUser()` não autoriza); e-mail normalizado (minúsculas, sem espaços); linhas com coringa, grupo, texto que não é e-mail completo ou perfil diferente de `LEITOR`/`ADMINISTRADOR` não dão acesso; e-mail repetido vale o menor perfil; lista em cache de script por 60 s; falha fechada (`SEM_IDENTIFICACAO`, `SEM_ACESSO`, `ACESSO_INDISPONIVEL`, `SO_LEITURA`); nenhum e-mail no registro de execução. Testes negativos em `sistemas/busca-alunos/testes/testar_acesso.js`.

Além da permissão, a gravação confere que a linha ainda é da mesma pessoa (alunos: número USP + nome; docentes e servidores: nome + e-mail), que cada campo alterado continua igual ao valor de quando a ficha abriu (sem sobrescrever outra pessoa), que a coluna existe, não é `ID da Pasta` nem `TRATAMENTO` e não tem fórmula, e o formato dos campos conhecidos (inclui `M / F` e `TIPO`). Entradas têm caracteres de controle removidos e limite de 500 caracteres. Nada do conteúdo é registrado em log.

Limitações conhecidas: compartilhamento só via **grupo** não aparece em `getEditors()` (a pessoa precisa ser editora individual); a regra vale para o Web App, não substitui a revisão de quem é editor da planilha.

**Leitura (decisão tomada).** Como a busca é feita no navegador, quem tem acesso recebe todo o cadastro (alunos, docentes, servidores e setores), não só o resultado da busca, e pode exportá-lo. Até a v1.3 isso valia para qualquer conta que abrisse a página, e só "Somente eu" continha o risco. A decisão foi a opção 2 da [proposta](../../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md): lista nominal na planilha de permissões, com a execução como implantador (aprovada no plano do Formulário de Pedido de Colação de Grau, 06/11/2026, PR 2; implementada na v1.4). O nome da aba é `PESSOAS_IPUSP`, o já registrado na planilha `SISTEMAS`. Mover a busca para o servidor, para cada sessão receber menos dados, continua sendo uma decisão separada (etapa 2 da proposta). Cadastros pendentes do formulário de colação (v1.5): só ADMINISTRADOR os vê; o perfil LEITOR não recebe a fila nem o contador.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
AMBIENTE            (v1.4, opcional: producao | homologacao)
```

Configurada em **Configurações do projeto → Propriedades do script**. A chave `PLANILHA_ALUNOS` fica no próprio `ID_INDEX`.

## 6. Logs

- Gravações: o próprio Sheets mantém o histórico de versões da planilha (quem executa o Web App aparece como autor quando ele roda como implantador). O app não mantém log próprio de alterações.
- Eventos registrados: só por `diagnosticarComunidadeIPUSP()` (antes `diagnosticarBuscaAlunos()`), executada manualmente — existência da propriedade, nome da aba do índice, chaves encontradas, presença/títulos das colunas usadas, motivo de falha sem IDs nem e-mails e **quantidades** por vínculo. (v1.4) Também o ambiente e o perfil de quem roda (só o código, sem e-mail); e, quando a lista de acesso não abre, uma linha `console.error` com o motivo, sem e-mails nem IDs.
- Identificadores registrados: nenhum.
- Proibido em log: IDs de planilha, nomes, números USP, e-mails, setores, termos digitados na busca, valores da ficha e conteúdo das exportações.
- Estratégia de debug: o diagnóstico acima; mensagens de erro citam nomes de chave/coluna, nunca valores.

- (v1.5) Fila de cadastro: nenhum registro de execução com dados; a trilha das decisões é a própria aba `DECISOES_CADASTRO` (quando, protocolo, versão, decisão, nº USP, ação, troca de e-mail, motivo e e-mail de quem decidiu).

## 7. Compartilhamento e acesso

- Planilhas de alunos, docentes e servidores: Restrito; edição para a identidade de execução e para quem pode corrigir cada cadastro pelo app (editores individuais daquela planilha). `ID_INDEX`: Restrito, leitura pela identidade de execução.
- Grupos/contas autorizados: descrever por papel — A VALIDAR.
- Revisão de permissões: A VALIDAR.

## 8. Dados de teste

- Fixtures sintéticas geradas nos [testes](../../../sistemas/busca-alunos/testes/README.md) (alunos, docentes, servidores e setores inventados, números `9000000+`, e-mails `@exemplo.invalid`).
- Screenshots: nenhum versionado.
- Baseline sem produção: os testes simulam `SpreadsheetApp`, `PropertiesService` e `google.script.run`.

## 9. Pontos LGPD/institucionais

- Finalidades documentadas: identificação de alunos na triagem dos grupos de atendimento clínico; correção do cadastro; listas por ano de ingresso para comunicação institucional; (v1.2) localização e contato de docentes, servidores e setores pela equipe do Serviço de Graduação; (v1.3) correção desses cadastros e cópia do nº USP para uso no atendimento.
- Base legal: **A VALIDAR INSTITUCIONALMENTE**.
- Retenção: **A VALIDAR INSTITUCIONALMENTE** (a página não guarda dados depois de fechada).
- Compartilhamentos externos: nenhum feito pelo sistema. Arquivos exportados saem do controle do sistema; a ajuda orienta envio só a quem pediu, pelo e-mail institucional, e descarte das cópias.
- A Central de Ajuda orienta uso só para o atendimento, sem cópia para outros locais e com cuidado em computadores compartilhados.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional vigente.
- Medida imediata específica: se a lista tiver sido acessada por conta indevida, restringir **Quem pode acessar** ou desativar a implantação e revisar o compartilhamento do `ID_INDEX` e dos três cadastros.
- Gravação indevida ou em massa: desativar a implantação, revisar os editores da planilha afetada (alunos, docentes ou servidores) e restaurar o conteúdo pelo **histórico de versões** do Sheets.

## 11. Exceções

- Até a v1.3, leitura sem autorização server-side, herdada do original. Resolvida na v1.4 (seção 4).
- (v1.3) Servidores e docentes passaram a ser lidos pelo título (na v1.2, pela posição). A auditoria da Estrutura Curricular continua lendo esses cadastros pela posição; o esquema atual é compatível.
- Leitura do `ID_INDEX` mantém as regras do original (aba `Página1` ou primeira aba; colunas por título; sem validação da coluna `Tipo`; chave repetida vale a primeira), diferentemente do Painel de Solicitações e do Gerenciador de Diplomas, para não mudar comportamento. A v1.4 só acrescentou a coluna `Homologação` quando `AMBIENTE=homologacao`.

## 12. Homologação

Verificação local registrada em [HOMOLOGACAO.md](HOMOLOGACAO.md). O `SECURITY_CHECKLIST.md` deve ser concluído na implantação real da v1.4 (roteiro P1–P8 em [HOMOLOGACAO.md](HOMOLOGACAO.md#v14--autorização-no-servidor)).
