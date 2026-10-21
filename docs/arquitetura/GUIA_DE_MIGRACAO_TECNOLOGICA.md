# Guia de migração tecnológica

Para quem um dia reconstruir os sistemas GRADIP em outra tecnologia: Python, TypeScript/Node.js, Java, C#, PostgreSQL ou outra infraestrutura **autorizada institucionalmente**. Essas tecnologias são exemplos, não escolhas aprovadas.

**Este guia não implementa nem autoriza uma migração.** Ele descreve as condições para fazê-la sem perder as regras administrativas, a integridade dos registros e a continuidade dos serviços. Por que a plataforma atual foi escolhida: [ADR-001](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md). Como manter o que existe: [guia de continuidade](GUIA_DE_CONTINUIDADE_E_LEGADO.md). As classes de evidência estão no [README desta pasta](README.md#classes-de-evidência).

## 1. Separar regra de negócio de tecnologia

Migrar **não** é traduzir funções Apps Script linha por linha. É reproduzir o **comportamento administrativo esperado**, implementado do jeito adequado na nova plataforma. Antes de escrever código, separe em cada sistema:

| Camada | O que é | Exemplo no GRADIP | Muda na migração? |
|---|---|---|---|
| **Regra administrativa** | o que a instituição decide | quem pode pedir trancamento, até quantas disciplinas, em que período, o que significa "concluído" | **não**, salvo decisão funcional expressa |
| **Algoritmo de validação** | como a regra é conferida | código de disciplina conferido contra `DISCIPLINAS`; pedido pendente do mesmo e-mail pede confirmação | o algoritmo pode mudar; o resultado não |
| **Persistência** | onde e como os dados ficam | linhas de planilha, colunas por título ou por posição | **sim** |
| **Integração externa** | o que vem ou vai para fora | relatórios do Júpiter, e-mail de recibo, pastas do Drive | depende do que a instituição oferecer |
| **Autenticação e autorização** | quem é a pessoa e o que pode fazer | login Google `@usp.br`; listas de `PERMISSOES_DE_ACESSO`; "Executar como" | o mecanismo muda; os critérios de quem pode o quê **não** |
| **Interface** | o que a pessoa vê | HTML Service, tema GRADIP, Central de Ajuda | pode mudar; textos operacionais e acessibilidade devem ser preservados |
| **Publicação e execução** | onde roda e como chega ao usuário | projeto Apps Script, `/exec`, gatilhos | **sim** |

Algumas regras estão misturadas com detalhes da plataforma no código atual (por exemplo, o critério de "concluído" é um teste de texto numa célula). A migração deve extrair a regra e decidir como representá-la, e não copiar o teste de texto.

## 2. Correspondência entre tecnologias

| No ecossistema atual | Responsabilidade | Possível equivalente futuro | Atenção |
|---|---|---|---|
| Google Sheets | Persistência operacional | Banco relacional institucional | planilha não tem tipos, restrições nem transação; o banco terá, e os dados antigos podem não cumpri-los (seção 3) |
| Apps Script `.gs` | Lógica de servidor | API ou serviços de backend | as funções públicas viram rotas; cada rota precisa de autenticação e autorização próprias |
| HTML Service | Interface web | Frontend web | hoje a página fala com o servidor só por `google.script.run`; o novo frontend precisará de outro canal, com proteção contra requisições forjadas |
| Script Properties | Configuração | Gestão de configuração e de segredos | as Script Properties não são cofre; um cofre institucional muda quem pode ler cada valor |
| `LockService` | Coordenação de concorrência | Transações, travas e controle de concorrência do banco | a trava de script serializa o projeto inteiro; o banco permite granularidade por registro |
| Gatilhos do Apps Script | Processamento agendado e reação a edições | Agendador de tarefas ou workers | os gatilhos `onEdit` reagem a edição manual na planilha; sem planilha, esse evento deixa de existir e a regra precisa de outro ponto de entrada |
| `MailApp`/`GmailApp` | Notificações e recibos | Serviço institucional de e-mail | remetente, cota e registro de envio mudam; a reserva `ENVIANDO…` existe para não mandar e-mail duplo |
| Google Drive | Arquivos e documentos | Armazenamento institucional autorizado | permissões do Drive deixam de valer; precisam ser reproduzidas |
| `ID_INDEX` | Descoberta dos recursos de dados | Configuração, catálogo ou registro de recursos | hoje separa produção e homologação pela coluna; o novo ambiente precisa da mesma separação |
| Login Google + `Session.getActiveUser()` | Autenticação | Autenticação institucional da USP | o e-mail do login é o identificador do aluno nos pedidos; o novo mecanismo deve fornecer um identificador equivalente e estável |
| Execução "como quem implantou" | Privilégio do servidor | Conta de serviço com menor privilégio | o mesmo risco: o servidor pode mais que o usuário; a autorização por função continua obrigatória |

**Estas correspondências são conceituais.** Nenhuma é equivalência automática de comportamento nem de segurança.

## 3. Preservação dos dados históricos

Os dados atuais **não são perfeitos** e não devem ser presumidos como tais. Uma migração deve tratar:

| Tema | O que se sabe (EVIDÊNCIA DO REPOSITÓRIO) | Cuidado na migração |
|---|---|---|
| Registros pregressos | planilhas anteriores aos sistemas, com linhas do Google Forms e linhas gravadas pelos Web Apps convivendo | importar tudo, marcando a origem quando for possível inferi-la |
| Ordem e significado de colunas | Exclusão grava por posição (A–T); outros por título; o Painel dos servidores lê por posição ([contratos](GUIA_DE_CONTINUIDADE_E_LEGADO.md#4-o-que-não-se-deve-modificar-inadvertidamente)) | mapear cada coluna real de cada planilha, inclusive colunas acrescentadas à mão |
| Identificadores | `Pedido ID` só existe nas linhas novas da Exclusão; linhas antigas valem cada uma como um pedido; `Registro ID` é preenchido pelo gerenciador | não inventar IDs que reagrupem linhas antigas sem regra aprovada; gerar IDs novos de modo rastreável |
| Valores vazios e incompletos | colunas opcionais, colunas criadas sob demanda (`E-mail Enviado`, `Data de Conclusão`) | distinguir "vazio" de "não se aplica" e de "desconhecido" |
| Duplicidades | possíveis em reenvios (ver [ADR-001, seção 4.3](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md#43-concorrência)); o gerenciador já corrige `Registro ID` duplicado | identificar, relatar e decidir; **não** deduplicar silenciosamente |
| Situações administrativas | texto livre na célula; critérios diferentes entre formulários e Painel dos servidores | levantar todos os valores distintos existentes e pedir ao responsável funcional o significado de cada um |
| Datas e fuso | `America/Sao_Paulo`; carimbos como data da planilha ou texto, conforme a origem | converter com fuso explícito e conferir amostras |
| Relações entre registros e planilhas | pedido ↔ cadastro de alunos pelo e-mail; disciplina pelo código; grade ↔ estrutura curricular ↔ semestre | preservar as chaves de ligação e conferir as que não fecham |
| Anexos e documentos do Drive | cópias da grade por semestre, auditorias por semestre, pastas de ofícios (futuro) | migrar com as permissões, ou registrar que ficam no Drive |
| Trilhas de auditoria | selo encadeado do Painel dos servidores; auditoria por semestre da Estrutura ([auditoria](../auditoria/README.md)) | migrar **sem recalcular nem reordenar**; a conferência do selo deve continuar possível sobre os dados antigos |
| Formatos legados | ingresso `AAAA/S` ou `AAAAS`; disciplina `PSA0101 - Nome` ou, em linhas antigas, `PSA0101 Nome` | aceitar os formatos antigos na importação e registrar a normalização |
| Estratégia de importação | — | importar de **exportações autorizadas**, para o ambiente institucional autorizado; nunca para contas ou serviços pessoais |
| Reconciliação | — | contar registros por planilha e por situação nos dois lados; conferir amostras linha a linha; registrar diferenças |

Toda transformação deve ser **rastreável** (o que foi mudado, por qual regra), **testável** (com dados fictícios que reproduzam os casos reais) e **aprovada** por quem responde pelo processo. Correção silenciosa de registro histórico é proibida.

## 4. Contratos de dados e de comportamento

Uma migração preserva, **salvo decisão funcional expressa de alteração**:

- regras de negócio e critérios de elegibilidade (quem pode pedir o quê);
- validações (domínio `usp.br`, disciplinas existentes, limites de quantidade e de tamanho, cursos permitidos);
- condições de abertura e encerramento dos formulários (`PERIODOS`);
- regras de exclusão de disciplinas, trancamento parcial e trancamento total;
- a contagem de créditos e as regras curriculares versionadas ([contagem de créditos](../sistemas/painel-solicitacoes/CONTAGEM_DE_CREDITOS.md));
- o tratamento dos pedidos pela equipe e os estados administrativos;
- e-mails e comprovantes (conteúdo, destinatário, momento do envio, comportamento quando o envio falha);
- critérios de autorização (quem vê e quem altera cada dado);
- relatórios e documentos gerados (PDFs, exportações, grade horária);
- a leitura dos relatórios do Júpiter e as validações sobre eles;
- as relações entre formulários, painéis e gerenciadores (quem grava, quem lê, quem conta).

**Invariante não é o mesmo que comportamento antigo.** Um comportamento atual pode ser defeito. Exemplos já identificados: critérios de situação diferentes entre sistemas que leem a mesma planilha, ausência de conferência de duplicidade em dois formulários, ausência de autorização no servidor na leitura da Comunidade IPUSP e em todo o Gerenciador de Trancamento Total ([ADR-001, seção 4.8](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md#48-classificação-das-críticas)). **Este guia não determina que um defeito histórico seja preservado.** Cada comportamento problemático deve ser identificado, analisado e decidido por quem responde pelo processo, antes ou durante a migração.

Para cada regra, registre: a fonte (documento do sistema, código, decisão do responsável), se é invariante ou se pode mudar, e o teste que a comprova nas duas implementações.

## 5. Mapeamento por sistema

Fonte: [catálogo](../SISTEMAS.md), estado conferido em 20/10/2026. Detalhes de entradas, saídas e dados de cada sistema estão no `DADOS_E_SEGURANCA.md` e no manual dele; aqui ficam o que uma migração precisa saber primeiro. Os serviços do Apps Script listados são os que aparecem no código do repositório.

### Painel de Solicitações (alunos)

- **Finalidade e atores:** entrada dos alunos para os formulários, contagem de créditos, grade horária e atendimento online. [docs](../sistemas/painel-solicitacoes/README.md)
- **Dados:** lê `PERIODOS` e `REGRAS_CURRICULARES`; não grava.
- **Recursos:** `SpreadsheetApp`, `CacheService`, `PropertiesService`, `Session`, `HtmlService`.
- **Regras críticas:** abertura por período; falha de configuração do índice bloqueia em vez de mostrar tudo aberto ([dados e segurança](../sistemas/painel-solicitacoes/DADOS_E_SEGURANCA.md)); contagem de créditos.
- **Testes:** `testar_contagem.js`, `testar_navegador.js`.
- **Estado:** v1.3/v1.4 implantadas; v1.5 no Git, não implantada.
- **Lacunas:** links dos formulários no código; regras da contagem dependem do `ruleset` mantido no Painel dos servidores.

### Grade Horária visual (alunos)

- **Finalidade:** grade do curso por semestre, grades anteriores e PDF. [docs](../sistemas/grade-horaria-visual/README.md)
- **Dados:** lê `GRADE_HORARIA_PREENCHIMENTO` e `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`; não grava.
- **Recursos:** `SpreadsheetApp`, `CacheService`; PDF no navegador com `html2canvas` e `jspdf` (CDN).
- **Estado:** verificada localmente; homologação no `/exec` pendente.
- **Lacunas:** "Quem pode acessar" A VALIDAR; depende do formato da planilha das secretarias.

### Exclusão de Disciplinas (formulário)

- **Finalidade:** pedido de exclusão de disciplinas do semestre, com recibo. [docs](../sistemas/exclusao-disciplinas/README.md)
- **Dados:** lê `PLANILHA_ALUNOS`, `DISCIPLINAS`, `PERIODOS`; grava `EXCLUSAO_DISCIPLINAS` (uma linha por disciplina, mesmo `Pedido ID`).
- **Recursos:** `SpreadsheetApp`, `LockService`, `MailApp`, `CacheService`, `Session`.
- **Regras críticas:** login `usp.br`; até 6 disciplinas; disciplina pelo código; recibo fora da trava.
- **Testes:** `testar_backend.js`, `testar_navegador.js`.
- **Estado:** v1.2 no Git; homologação pendente; **gerenciador da equipe fora do repositório**.
- **Lacunas:** colunas por posição; sem conferência de duplicidade; o tratamento pela equipe não está documentado aqui e precisa ser levantado antes de migrar.

### Trancamento Parcial de Matrícula (formulário)

- **Finalidade:** pedido de trancamento de disciplinas específicas. [docs](../sistemas/trancamento-parcial/README.md)
- **Dados:** lê `PLANILHA_ALUNOS`, `DISCIPLINAS`, `PERIODOS`; grava `TRANCAMENTO_PARCIAL_MATRICULA`.
- **Recursos:** como a Exclusão.
- **Regras críticas:** créditos restantes, conclusão do curso, justificativa, declaração de ciência com as datas do período.
- **Estado:** v1.2 no Git; homologação pendente; **gerenciador fora do repositório**.
- **Lacunas:** sem identificador de pedido; sem conferência de duplicidade; Painel dos servidores conta só `pendente` exato.

### Trancamento Total de Matrícula (formulário)

- **Finalidade:** pedido de trancamento total, com aviso de pedido pendente. [docs](../sistemas/trancamento-total/README.md)
- **Dados:** lê `PLANILHA_ALUNOS`; grava `TRANCAMENTO_TOTAL_MATRICULA`, sem tocar nas colunas do gerenciador.
- **Recursos:** `SpreadsheetApp`, `LockService`, `MailApp`, `Session`.
- **Regras críticas:** pedido pendente do mesmo e-mail exige confirmação, conferido dentro da trava.
- **Estado:** v1.3 no Git; homologação pendente.

### Gerenciador de Trancamento Total (equipe)

- **Finalidade:** tratar os pedidos de trancamento total: concluir, reabrir, avisar o aluno. [código](../../sistemas/trancamento-total/gerenciador/README.md)
- **Dados:** lê e grava `TRANCAMENTO_TOTAL_MATRICULA` (situação, `Registro ID`, `Versão`, `E-mail Enviado`, `Data de Conclusão`).
- **Recursos:** `SpreadsheetApp`, `LockService`, `MailApp`.
- **Regras críticas:** versão da linha contra sobrescrita; reserva antes do e-mail.
- **Testes:** `testar_backend.js`.
- **Estado:** em uso a **v1.0**, que não está no Git (ID literal no código); a v1.1 do Git não foi implantada, por decisão do responsável funcional.
- **Lacunas:** **nenhuma autorização no servidor** ([dados e segurança](../sistemas/trancamento-total/DADOS_E_SEGURANCA_GERENCIADOR.md)); a migração não pode herdar isso.

### Painel de Sistemas (servidores)

- **Finalidade:** entrada da equipe, pendências, períodos dos formulários e Regras Curriculares. [docs](../sistemas/painel-servidores/README.md)
- **Dados:** lê as planilhas de respostas e quatro planilhas de sistemas fora do repositório (`EMISSAO_DIPLOMAS`, `ABERTURA_HABILITACOES`, `SEGUNDA_VIA_BUSP`, `MATRICULA_INTERCAMBISTAS`); grava `PERIODOS`, `REGRAS_CURRICULARES` e `AUDITORIA_PAINEL_SERVIDORES`.
- **Recursos:** `SpreadsheetApp`, `LockService`, `ScriptApp` (gatilho diário), `Session`, `CacheService`.
- **Regras críticas:** acesso pela aba `PAINEL_SERVIDORES` conferido em toda função; auditoria com selo encadeado.
- **Estado:** 1.3 no `/exec`; 1.4 no editor; manifesto versionado.
- **Lacunas:** contagens por posição de coluna e com critérios próprios de situação; dependência de sistemas que não estão no repositório.

### Estrutura Curricular e Grade Horária (equipe)

- **Finalidade:** importar o Júpiter, preparar e enviar a grade, auditar o preenchimento. [docs](../sistemas/estrutura-curricular/README.md) · [continuidade própria](../sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md)
- **Dados:** `ESTRUTURA_CURRICULAR`, `GRADE_HORARIA_PREENCHIMENTO`, `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`, `BACKUP_GRADES_ANTERIORES`, `AUDITORIA_GRADES_ANTERIORES`, `PERMISSOES_DE_ACESSO`, cadastros (L) ([modelo de dados](../sistemas/estrutura-curricular/MODELO_DE_DADOS.md)).
- **Recursos:** `SpreadsheetApp`, `DriveApp`, `LockService`, `ScriptApp` (gatilhos da auditoria), `CacheService`; no navegador, `pdfjs-dist` e `tesseract.js` (CDN).
- **Regras críticas:** ajustes separados do Júpiter; manifesto de ativação; envio só do conteúdo conferido ([regras](../sistemas/estrutura-curricular/REGRAS.md), [contratos](../sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md)).
- **Testes:** dezenas de suítes; parte depende de exportações reais do Júpiter e roda só à mão.
- **Estado:** documentação até 1.12.0; 1.7.0 instalada em 04/10/2026; homologação das versões seguintes pendente.
- **Lacunas:** o desenho atual (abas `_nova_`, manifesto, diário) existe **para compensar a falta de transação**; num banco, a mesma garantia vem de uma transação, e o desenho não deve ser copiado, mas a garantia deve ser mantida.

### Planilha das secretarias

- **Finalidade:** validações (conflito de horário, modalidade prática) e proteção por e-mail da planilha que as secretarias preenchem. [docs](../sistemas/planilha-grade-secretarias/README.md)
- **Recursos:** gatilho simples `onEdit`, gatilho horário de proteção, `SpreadsheetApp`.
- **Estado:** `Validacoes.gs` 1.1 e `Protecao.gs`; colagem e teste no Google pendentes.
- **Lacunas:** o preenchimento direto na planilha pelas secretarias é parte do processo. Uma migração que tire a planilha precisa de outra forma de preenchimento, combinada com os departamentos.

### Comunidade IPUSP (equipe)

- **Finalidade:** busca de alunos, docentes, servidores e setores; ficha e exportação. [docs](../sistemas/busca-alunos/README.md)
- **Dados:** lê e grava `PLANILHA_ALUNOS`, `PLANILHA_DOCENTES`, `SERVIDORES`.
- **Recursos:** `SpreadsheetApp`, `DriveApp`, `LockService`, `Utilities` (PDF).
- **Regras críticas:** gravação só por editor da planilha daquele cadastro, conferindo que a linha e o valor não mudaram.
- **Estado:** v1.3 no Git; homologação pendente; modelo de acesso à leitura para decisão.
- **Lacunas:** **leitura sem autorização no servidor**, e busca feita no navegador sobre o cadastro inteiro ([dados e segurança](../sistemas/busca-alunos/DADOS_E_SEGURANCA.md#4-web-app)). Uma migração deve fazer a busca no servidor e devolver só o resultado autorizado.

### Sistemas fora do repositório e ideias

- **Fora do repositório:** gerenciadores de Exclusão, Trancamento Parcial, Habilitações, 2ª via do BUSP, Intercambistas e Diplomas; formulários de Habilitação, BUSP, Colação e Intercambistas ([limites conhecidos](../ARQUITETURA_GERAL.md#6-limites-conhecidos)). **Não há código nem regra deles aqui**; o Painel dos servidores só lê as planilhas de alguns. Uma migração começa por incorporá-los ao repositório, com o mesmo cuidado de documentação.
- **Ideia em desenvolvimento, sem código:** [Gerenciador de Ofícios e Modelos](../sistemas/gerenciador-oficios/README.md). Seu estado deve ser preservado como ideia, sem ser tratado como sistema existente.

## 6. Estratégia de migração segura

Abordagem gradual, um sistema (ou um grupo pequeno de sistemas que compartilham uma planilha) por vez:

1. **Levantamento dos processos e sistemas**, incluindo os que não estão no repositório, com o responsável funcional de cada um.
2. **Inventário das fontes de dados:** cada planilha, aba, coluna e valor distinto; quem lê, quem grava; anexos do Drive.
3. **Autorização institucional e definição de responsabilidades:** quem autoriza a nova infraestrutura, quem a opera, quem responde pelos dados, base legal e retenção. Sem isso, não se passa ao passo 6.
4. **Definição dos contratos de dados e das regras** (seção 4), com o que é invariante e o que será decidido.
5. **Preparação do ambiente de homologação** na infraestrutura autorizada, separado da produção.
6. **Construção da nova camada de persistência**, com esquema, restrições e trilha de auditoria.
7. **Migração experimental com dados sintéticos** que reproduzam os casos difíceis (linhas antigas, duplicidades, situações fora do padrão).
8. **Comparação dos resultados das implementações:** as mesmas entradas fictícias nos dois sistemas devem dar as mesmas saídas, salvo as diferenças decididas.
9. **Validação das regras administrativas** com quem responde por cada processo.
10. **Testes de autenticação, autorização e concorrência**, incluindo os negativos (conta sem acesso, chamada direta da rota, envio simultâneo).
11. **Plano de transferência e reconciliação dos dados**, com contagens e conferências por amostra (seção 3).
12. **Estratégia de corte e prevenção de dupla gravação:** um momento em que o sistema antigo deixa de aceitar gravações (formulário fechado ou só leitura) antes da carga final. **Nunca duas fontes de verdade em funcionamento sem sincronização explícita e documentada.**
13. **Homologação institucional** do novo sistema.
14. **Implantação autorizada**, com o mesmo rigor do [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md).
15. **Monitoramento** de erros, volumes e tempos, com os mesmos indicadores usados para justificar a migração.
16. **Plano de reversão e desativação controlada do sistema antigo:** as planilhas antigas ficam guardadas, em modo de leitura, pelo prazo que a instituição definir; a implantação antiga é arquivada só depois da conferência.

**Proibido em qualquer passo:** copiar bases institucionais reais para serviços externos, contas pessoais ou ambientes não autorizados, inclusive para testar.

## 7. Critérios para considerar uma migração necessária

Distinga duas perguntas, avaliadas separadamente:

**Justificativa técnica para migrar** (há um problema que a plataforma não resolve?):

- volumes e latências **medidos** que prejudicam o atendimento, depois de esgotadas as correções do [guia de continuidade, seção 6](GUIA_DE_CONTINUIDADE_E_LEGADO.md#6-como-avaliar-problemas-de-desempenho);
- erros recorrentes por limite de tempo de execução, registrados no painel de execuções;
- exaustão de cotas, registrada;
- problemas de concorrência comprovados (pedido perdido ou sobrescrito), e não só possíveis;
- necessidades de auditoria ou de integridade que a plataforma não atende;
- requisitos institucionais de segurança que a plataforma não atende;
- complexidade de manutenção crescente, medida (tempo de correção, regressões, compensações como o manifesto da Estrutura).

**Viabilidade institucional para executar a migração** (é possível fazê-la de forma legítima?):

- infraestrutura institucional autorizada e disponível ao Serviço de Graduação;
- equipe que vai operar e manter a nova plataforma;
- responsável definido pelos dados e pela operação;
- recursos para a migração gradual da seção 6 sem interromper os serviços.

Uma justificativa técnica forte sem viabilidade institucional leva a corrigir dentro da plataforma atual e a registrar a necessidade. Viabilidade sem justificativa técnica pode ser motivo legítimo (por exemplo, a instituição passar a oferecer um padrão), mas o ganho deve ser registrado num novo ADR.

## 8. Preservação do conhecimento administrativo

**O código-fonte não é a única parte valiosa do legado.** Os sistemas registram conhecimento sobre os processos administrativos da graduação, nas:

- validações (quem pode pedir, o que é aceito);
- fluxos de tratamento (o que a equipe faz com cada pedido);
- formulários e suas declarações de ciência;
- procedimentos das secretarias (preenchimento da grade, prazos);
- regras acadêmicas e estruturas curriculares;
- situações dos pedidos;
- regras de acesso;
- comprovantes e documentos gerados;
- integrações com sistemas institucionais (Júpiter).

Um desenvolvedor futuro conseguirá refazer a interface e a infraestrutura sem grande dificuldade. Ele **não** deve presumir que compreendeu, só pelo código, os procedimentos administrativos que o código implementa.

> Uma migração tecnológica bem-sucedida não é apenas aquela em que o novo sistema executa sem erros. É aquela em que as regras administrativas legítimas, a integridade dos registros, a proteção dos dados e a continuidade dos serviços são preservadas ou alteradas mediante decisão funcional expressa.

**Valide cada regra de negócio com os responsáveis institucionais.** Não infira política acadêmica apenas do comportamento do código: o código pode estar certo, pode estar desatualizado em relação a uma resolução, ou pode conter um defeito. A documentação de cada sistema registra o que foi decidido e por quem; quando ela não registrar, a resposta está com o responsável funcional, e não no código.
