# ADR-001: Google Sheets e Google Apps Script como plataforma institucional do GRADIP

| Campo | Valor |
|---|---|
| **Identificador** | ADR-001 |
| **Título** | Escolha do Google Sheets como persistência operacional e do Google Apps Script como plataforma de desenvolvimento e automação |
| **Estado** | Decisão arquitetural vigente |
| **Tipo de registro** | Retrospectivo: a decisão é anterior a este documento |
| **Data da decisão original** | Não registrada. A decisão foi tomada pelo responsável quando os primeiros sistemas foram concebidos, antes da criação deste repositório (primeiro commit em 25/09/2026). Não houve deliberação formal datada de que este repositório tenha registro |
| **Data deste registro** | 21/10/2026 |
| **Fonte do contexto histórico** | Relato do responsável pelo projeto, feito em 21/10/2026 (seção 2) |
| **Abrangência** | Todos os sistemas em [`sistemas/`](../../sistemas/) e os que vierem a seguir o mesmo modelo |
| **Substitui / substituído por** | — |

As classes de evidência usadas aqui estão definidas no [README desta pasta](README.md#classes-de-evidência).

## Sumário

O GRADIP usa planilhas Google para guardar os dados e Google Apps Script para as telas, as validações e as automações porque **eram esses os recursos efetivamente disponíveis** ao responsável, dentro do ambiente institucional, quando os sistemas nasceram. Bancos relacionais e servidores institucionais existem na USP, mas não estavam ao alcance dele para este projeto. Serviços externos administrados por ele mesmo eram tecnicamente possíveis, mas levariam dados acadêmicos para fora da custódia institucional.

**Esta é uma decisão de adequação ao ambiente institucional, não uma afirmação de que o Google Sheets seja tecnicamente superior a um banco de dados relacional.**

> **Uma tecnologia pode ser tecnicamente superior e, simultaneamente, não ser uma alternativa institucionalmente viável.**

As limitações da plataforma são reais e estão descritas na [seção 4](#4-análise-crítica-das-limitações). Nenhuma delas justifica manter uma vulnerabilidade ou um defeito que possa ser corrigido dentro do próprio Apps Script.

## 1. Princípio da adequação institucional da arquitetura

> **Princípio da adequação institucional da arquitetura**
>
> A arquitetura dos Sistemas GRADIP deve ser compreendida a partir dos recursos tecnológicos efetivamente disponíveis ao Serviço de Graduação do IPUSP, das responsabilidades ligadas ao tratamento de dados institucionais e da necessidade de dar continuidade aos processos administrativos.
>
> A adoção do Google Sheets e do Google Apps Script resultou dessas condições, e não da inexistência de alternativas tecnicamente mais sofisticadas.
>
> A evolução dos sistemas deve priorizar a segurança, a integridade dos dados, a continuidade operacional, a capacidade de manutenção e a governança institucional, dentro dos recursos e das autorizações disponíveis.
>
> A migração para outras tecnologias é admissível e pode vir a ser desejável, mas deve ocorrer quando houver infraestrutura adequada, autorização institucional pertinente e preservação dos contratos de dados e das regras de negócio existentes.

Este princípio orienta a manutenção e as futuras avaliações técnicas do repositório. Ele explica a escolha da plataforma; **não** dispensa nenhuma correção que a própria plataforma permita fazer.

## 2. Contexto histórico da decisão

Toda esta seção é **CONTEXTO RELATADO PELO RESPONSÁVEL**, salvo indicação em contrário. Não há no repositório documento institucional que a comprove ou a conteste.

### 2.1. Quem e para quê

Os sistemas foram desenvolvidos para necessidades reais do Serviço de Graduação do Instituto de Psicologia da USP. O responsável pelo desenvolvimento é um servidor que atua no contexto administrativo do Instituto, e não uma equipe de desenvolvimento com infraestrutura contratável e administrada por ela.

### 2.2. O problema administrativo

O Serviço de Graduação atende os alunos de graduação em processos como exclusão de disciplinas, trancamento parcial e total, colação de grau, 2ª via do BUSP e intercambistas, e organiza a cada semestre a grade horária com as secretarias dos departamentos. Antes dos sistemas, esses processos dependiam de formulários, planilhas e conferências manuais sem integração entre si. Os pedidos chegavam por formulários, eram tratados em planilhas e comunicados aos alunos um a um.

O que os sistemas fazem hoje está no [catálogo](../SISTEMAS.md) (**EVIDÊNCIA DO REPOSITÓRIO**).

### 2.3. Condições de acesso aos dados

- O trabalho envolve dados acadêmicos e administrativos institucionais, incluindo dados pessoais de estudantes.
- Parte relevante desses dados **já estava em planilhas Google**, com registros históricos vindos de formulários e de rotinas anteriores aos sistemas.
- Essas planilhas eram e são instrumentos de trabalho, não arquivos temporários: contêm o histórico de que os processos administrativos dependem.

A existência de planilhas anteriores é coerente com o código: o formulário de Trancamento Total grava numa planilha que também recebia respostas do Google Forms e convive com linhas antigas ([`Codigo.gs`](../../sistemas/trancamento-total/formulario/src/Codigo.gs), comentário sobre `appendRow` e a coluna de ciência "do Forms original"); o de Exclusão trata linhas antigas sem `Pedido ID` ([`Codigo.gs`](../../sistemas/exclusao-disciplinas/formulario/src/Codigo.gs), função `pedidosDoEmail_`) (**EVIDÊNCIA DO REPOSITÓRIO**).

### 2.4. Infraestrutura disponível

O responsável dispunha do Google Drive, de planilhas Google e dos recursos de automação do ecossistema Google Workspace usado no seu trabalho institucional.

### 2.5. Infraestrutura indisponível

O responsável **não** dispunha de:

- credenciais para acessar ou administrar bancos de dados institucionais mantidos pela STI;
- autonomia para provisionar um PostgreSQL, MySQL ou outro banco institucional;
- servidor institucional próprio para executar as aplicações;
- hospedagem institucional sob sua administração;
- autorização ou infraestrutura para implantar livremente aplicações próprias em domínio institucional.

Isso **não** significa que a USP não tenha infraestrutura técnica mais sofisticada. Significa que essa infraestrutura **não estava disponível ao responsável para este projeto**. Este registro não afirma que a STI ou outra instância tenha recusado formalmente algum pedido: não há documento sobre isso no repositório (**NÃO VERIFICADO**).

### 2.6. Restrição à infraestrutura pessoal

O responsável poderia, tecnicamente, construir uma solução em provedores externos (Cloudflare, Supabase, Vercel ou semelhantes). Não o fez porque levar dados acadêmicos institucionais para uma infraestrutura contratada ou administrada por ele próprio criaria problemas de governança, responsabilidade, controle de acesso, continuidade e segurança, e ele não considerou adequado assumir sozinho a custódia técnica desses dados fora do ambiente institucional e sem respaldo institucional.

### 2.7. A alternativa prática

A escolha real não era entre o Google Sheets e um banco relacional institucional pronto para uso. Era entre **automatizar com as ferramentas disponíveis** ou **continuar com rotinas manuais**, planilhas e formulários sem integração.

## 3. Restrições, requisitos e alternativas

### 3.1. Restrições institucionais

| Restrição | Classe |
|---|---|
| Sem acesso a banco relacional nem a servidor institucional para o projeto | CONTEXTO RELATADO PELO RESPONSÁVEL |
| Dados pessoais de estudantes, sujeitos à LGPD e às normas da USP ([segurança](../seguranca/README.md), [LGPD e privacidade](../seguranca/LGPD_E_PRIVACIDADE.md)) | EVIDÊNCIA DO REPOSITÓRIO (diretriz) |
| Dados existentes já em planilhas Google, com histórico | CONTEXTO RELATADO PELO RESPONSÁVEL, coerente com o código (seção 2.3) |
| Equipe pequena, sem desenvolvedores dedicados; um único mantenedor do repositório | EVIDÊNCIA DO REPOSITÓRIO ([riscos residuais R1, R2 e R9](../governanca/RELATORIO_FINAL_IMPLANTACAO_2026.md#8-riscos-residuais)) |
| Base legal, prazos de guarda, responsável formal pelo tratamento | PENDÊNCIA DE VALIDAÇÃO INSTITUCIONAL (marcados `A VALIDAR INSTITUCIONALMENTE` em cada `DADOS_E_SEGURANCA.md`) |

### 3.2. Requisitos funcionais conhecidos

Derivados do código e da documentação dos sistemas (**EVIDÊNCIA DO REPOSITÓRIO**), não de uma especificação formal anterior:

- receber pedidos dos alunos só de contas `@usp.br`, gravando o e-mail do login (formulários de Exclusão, Trancamento Parcial e Total);
- abrir e fechar formulários por período (`PERIODOS`) e mostrar ao aluno o que está aberto (Painel de Solicitações);
- validar disciplinas pelo código contra uma base única (`DISCIPLINAS`);
- emitir recibo por e-mail e avisar o aluno quando o pedido é concluído;
- permitir à equipe tratar os pedidos, com controle de versão da linha para não sobrescrever o trabalho de outra pessoa (Gerenciador de Trancamento Total);
- importar a estrutura curricular do Júpiter (CSV ou PDF), prepará-la, enviar a grade às secretarias e auditar o preenchimento (Estrutura Curricular);
- mostrar a grade horária aos alunos (Grade Horária visual);
- simular a contagem de créditos para formatura a partir de regras curriculares versionadas (Painel de Solicitações e Painel dos servidores);
- buscar pessoas e setores e editar fichas de cadastro (Comunidade IPUSP);
- registrar quem fez o quê num sistema auditado ([auditoria](../auditoria/README.md)).

### 3.3. Requisitos não funcionais conhecidos

- **Privacidade e minimização:** só o necessário vai ao navegador; nada de dados reais no repositório ([classificação de dados](../seguranca/CLASSIFICACAO_DE_DADOS.md)).
- **Autorização no servidor:** o cliente não é fonte de autorização ([Google Workspace e Apps Script](../seguranca/GOOGLE_WORKSPACE_E_APPS_SCRIPT.md)).
- **Continuidade:** os sistemas devem sobreviver à troca de planilha (pelo `ID_INDEX`) e à troca de mantenedor (documentação neste repositório).
- **Manutenção por equipe pequena:** sem etapa de build, sem servidor a administrar, sem dependências que exijam atualização constante.
- **Acessibilidade, tema claro/escuro e uso em celular** ([design system](../UX_DESIGN_SYSTEM.md)).
- **Rastreabilidade das mudanças:** Git, pull request, CI e Releases ([fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md)).

### 3.4. Critérios de decisão

Os nove critérios usados na comparação:

1. viabilidade técnica;
2. disponibilidade efetiva naquele contexto;
3. governança e responsabilidade sobre os dados;
4. necessidade de autorizações;
5. custos operacionais e administrativos;
6. capacidade de manutenção pela equipe;
7. continuidade do serviço;
8. riscos de segurança e privacidade;
9. possibilidades futuras de evolução.

O critério 2 é eliminatório: uma alternativa que não estava disponível não podia ser escolhida, por melhor que fosse nos outros.

### 3.5. Alternativas consideradas

**A. Google Sheets + Google Apps Script** (adotada)
**B. Banco relacional em infraestrutura institucional** (PostgreSQL, MySQL ou outro, mantido pela STI ou por unidade técnica da USP)
**C. Aplicação em servidor institucional** (aplicação própria, em qualquer linguagem, hospedada em servidor ou domínio da USP)
**D. Banco e aplicação em serviços externos contratados ou administrados pessoalmente** (Cloudflare, Supabase, Vercel e semelhantes)
**E. Continuação dos processos exclusivamente manuais**

| Critério | A. Sheets + Apps Script | B. Banco relacional institucional | C. Servidor institucional | D. Serviços externos pessoais | E. Processos manuais |
|---|---|---|---|---|---|
| 1. Viabilidade técnica | Viável, com os limites da seção 4 | **Superior** para integridade, consultas e concorrência | **Superior** para arquitetura web, testes e implantação contínua | **Superior** em ferramentas e escala | Viável, sem automação |
| 2. Disponibilidade efetiva | **Disponível** (2.4) | **Indisponível** ao responsável (2.5) | **Indisponível** ao responsável (2.5) | Disponível tecnicamente, mas fora da custódia institucional (2.6) | Disponível |
| 3. Governança dos dados | Dados permanecem em recursos do ambiente Google usado no contexto institucional; compartilhamento controlado pelas permissões do Drive | Institucional, com administração técnica própria | Institucional | **Custódia pessoal** de dados acadêmicos fora do ambiente institucional | Institucional, mas espalhada em arquivos e e-mails |
| 4. Autorizações necessárias | Nenhuma além das do ambiente já usado; as decisões de tratamento continuam pendentes (3.1) | Credenciais e provisionamento pela STI | Hospedagem, domínio e credenciais | Nenhuma técnica; mas faltaria respaldo institucional para a custódia | Nenhuma |
| 5. Custos | Sem custo adicional de infraestrutura conhecido; custo de manutenção do código | Custo para a instituição e dependência de equipe técnica | Idem | Custo pessoal ou contratual, sem vínculo institucional | Alto custo de trabalho manual e de erros |
| 6. Manutenção pela equipe | Possível: sem build nem servidor; exige conhecer Apps Script | Exige DBA e desenvolvedor | Exige desenvolvedor e operação | Exige o próprio responsável como operador | Exige pessoas, não código |
| 7. Continuidade | Depende das planilhas, da conta institucional e da documentação; o repositório guarda o código e as regras | Boa, se houver equipe responsável | Boa, se houver equipe responsável | **Frágil**: dependente de uma pessoa e de contas pessoais | Depende de quem conhece o processo |
| 8. Segurança e privacidade | Riscos reais e mitigáveis (seção 4.4); não é garantia de conformidade | Controles maduros, se bem administrados | Idem | Exposição de dados fora do controle institucional | Erros manuais, cópias soltas de dados |
| 9. Evolução futura | Limitada para volumes e concorrência altos; migração possível (guia de migração) | Ampla | Ampla | Ampla tecnicamente, frágil institucionalmente | Nenhuma |

Leitura da tabela:

- **B e C são tecnicamente superiores** a A em integridade transacional, concorrência, consultas, testes e implantação. Foram descartadas **só** por não estarem disponíveis ao responsável (critério 2), e não por inadequação técnica.
- **D é tecnicamente viável e superior** em ferramentas, mas foi descartada por governança e responsabilidade (critérios 3, 7 e 8): ela trocaria um limite técnico por um problema institucional.
- **E** é a alternativa real à automação, e o motivo do projeto.
- **A** não vence nos critérios técnicos. Ela é a única que é, ao mesmo tempo, disponível, compatível com a custódia institucional dos dados e capaz de automatizar os processos.

## 4. Análise crítica das limitações

Esta seção responde às críticas que um arquiteto habituado a bancos relacionais e servidores próprios faria ao projeto. Ela não é defesa da plataforma. Onde um problema pode ser resolvido dentro do Apps Script, isso está dito.

**Sobre os números.** Os valores de cotas e limites abaixo vêm de páginas oficiais do Google, listadas na [seção 9](#9-referências). Foram consultados por busca em 21/10/2026, porque o ambiente que redigiu este registro não alcança diretamente os sites do Google. **Confira a página antes de usar qualquer número numa decisão.** O Google declara que as cotas variam por tipo de conta (consumidor ou Google Workspace) e podem mudar a qualquer momento sem aviso. Qual edição do Google Workspace a USP usa, e se há limites específicos dela, **NÃO VERIFICADO**.

### 4.1. Google Sheets como armazenamento

| Aspecto | O que se sabe | Classe |
|---|---|---|
| Capacidade | Uma planilha Google tem até 20 milhões de células. O limite anterior era de 10 milhões; o aumento foi disponibilizado de forma geral em setembro de 2026, para arquivos novos, existentes e importados | LIMITAÇÃO OFICIAL DA PLATAFORMA |
| Volume atual dos sistemas | O repositório não registra quantas linhas ou células cada planilha tem hoje | NÃO VERIFICADO |
| Desempenho | Leituras e escritas são chamadas a um serviço remoto; ler ou escrever célula por célula num laço é muito mais lento do que ler um intervalo de uma vez com `getValues()`/`setValues()`. Os formulários leem intervalos inteiros (por exemplo `pedidosDoEmail_`, que lê da linha 2 à última) | EVIDÊNCIA DO REPOSITÓRIO (forma de acesso); tempo real NÃO VERIFICADO |
| Crescimento do histórico | Funções que leem a aba inteira a cada pedido ficam mais lentas à medida que a aba cresce. Não há medição de que isso já seja um problema | RISCO POTENCIAL |
| Transações | Não há transação entre abas nem entre planilhas, e nenhum `rollback`. Uma sequência de escritas pode parar no meio | LIMITAÇÃO OFICIAL DA PLATAFORMA (o serviço não oferece transação); tratamento descrito em 4.3 |
| Estrutura dependente de abas, cabeçalhos e formatos | O código acha colunas pelo título (Trancamento Total, Gerenciador, `ID_INDEX`) ou **pela posição** (Exclusão grava em colunas fixas A–P e lê a situação na T; o Painel dos servidores lê a situação de cada planilha por número de coluna). Renomear um título, renomear uma aba ou inserir uma coluna pode quebrar um sistema | EVIDÊNCIA DO REPOSITÓRIO (`CABECALHOS_RESPOSTAS` e `COL` nos `Codigo.gs`) |
| Edições manuais | Qualquer editor da planilha pode mudar dados, títulos e formatos por fora do sistema. A Estrutura Curricular registrou incidentes reais de comportamento da planilha que os simuladores não previam: lista suspensa que recusava fórmula, coluna de Tabela tipada, separador de fórmula dependente da localidade ([incidentes e lições](../sistemas/estrutura-curricular/INCIDENTES_E_LICOES.md)) | PROBLEMA COMPROVADO (histórico, já corrigido nas versões citadas) |
| Proteção contra edição manual | Há proteção de abas pelo código na planilha das secretarias (`Protecao.gs`, com validação no `onEdit` em `Validacoes.gs`), em abas mantidas pela Estrutura Curricular (`Esquema.gs`, `BaseDisciplinas.gs`) e nas abas da auditoria do Painel dos servidores (`Auditoria.gs`). Os formulários não protegem as planilhas de respostas pelo código; se há proteção configurada à mão, NÃO VERIFICADO | EVIDÊNCIA DO REPOSITÓRIO |
| Permissões do Drive | Quem é editor da planilha vê e muda tudo, independentemente do sistema. O sistema não substitui a revisão do compartilhamento | LIMITAÇÃO OFICIAL DA PLATAFORMA ([compartilhamento do Drive](../seguranca/GOOGLE_WORKSPACE_E_APPS_SCRIPT.md#2-compartilhamento-é-a-fronteira-de-acesso-do-drive)) |

Não há evidência de colapso iminente. Crescimento é um risco a medir (ver [guia de continuidade, seção 6](GUIA_DE_CONTINUIDADE_E_LEGADO.md#6-como-avaliar-problemas-de-desempenho)), não um fato demonstrado.

### 4.2. Google Apps Script

| Aspecto | O que se sabe | Classe |
|---|---|---|
| Tempo por execução | 6 minutos por execução, para contas de consumidor e Workspace | LIMITAÇÃO OFICIAL DA PLATAFORMA |
| Execuções simultâneas | 30 por usuário e 1.000 por script | LIMITAÇÃO OFICIAL DA PLATAFORMA |
| E-mail | Destinatários por dia com `MailApp`: 100 em conta de consumidor e 1.500 em Workspace (valores marcados com ressalva na própria página) | LIMITAÇÃO OFICIAL DA PLATAFORMA |
| Tempo total de gatilhos por dia | 90 minutos por dia em contas de consumidor e 6 horas por dia em Google Workspace. As cotas podem mudar, e a edição e a política efetivamente aplicáveis à conta institucional usada pelos sistemas não foram confirmadas | LIMITAÇÃO OFICIAL DA PLATAFORMA (valores publicados); aplicação à conta institucional NÃO VERIFICADO |
| Ao estourar uma cota | O script lança exceção e a execução para | LIMITAÇÃO OFICIAL DA PLATAFORMA |
| Processamento em lote | Trabalho longo precisa ser dividido em partes que caibam numa execução e possam ser retomadas. A Estrutura Curricular faz isso: importação preparada em abas ocultas, ativada por uma escrita única e recuperada por um diário quando para no meio ([`Gravacao.gs`](../../sistemas/estrutura-curricular/src/Gravacao.gs)) | EVIDÊNCIA DO REPOSITÓRIO |
| Gatilhos | Gatilho simples (`onEdit` em `Validacoes.gs`) roda com limites próprios e sem autorização ampla; gatilho instalável (auditoria diária do Painel dos servidores, verificação horária de `Protecao.gs`, `onEdit`/`onOpen` da auditoria da grade) roda com a conta de quem o instalou e **não existe só porque o código existe**: precisa ser instalado. A Estrutura Curricular registrou auditoria sem edições porque o acionador não tinha sido instalado | EVIDÊNCIA DO REPOSITÓRIO e PROBLEMA COMPROVADO (histórico, 03/10) |
| Dependência do ambiente Google | Execução, cotas, autenticação e implantação são do Google. Mudança de política do Google ou da conta institucional afeta todos os sistemas | RISCO POTENCIAL |
| Implantação e configuração | Configuração do Web App ("Executar como", "Quem pode acessar") fica no manifesto e na implantação. Só o Painel dos servidores tem `appsscript.json` no Git; nos demais, essa configuração não está versionada ([implantação, seção 2](../IMPLANTACAO.md#2-inventário-20102026)) | EVIDÊNCIA DO REPOSITÓRIO; achado P1 do [diagnóstico](../governanca/DIAGNOSTICO_2026-10-20.md) |
| Autenticação | O login é o da conta Google. `Session.getActiveUser()` só devolve o e-mail de quem acessa em certas combinações de conta e implantação (mesmo domínio); fora delas, devolve vazio | LIMITAÇÃO OFICIAL DA PLATAFORMA ([Web Apps](https://developers.google.com/apps-script/guides/web?hl=pt-br)); os formulários recusam e-mail vazio ou fora de `usp.br` (`DOMINIO_PERMITIDO`) |
| Consequência para Web Apps | Toda função de servidor não terminada em `_` pode ser chamada pela página por `google.script.run`, inclusive por quem manipula o navegador. Cada uma precisa conferir quem chama | LIMITAÇÃO OFICIAL DA PLATAFORMA; ver 4.4 |

### 4.3. Concorrência

**Banco relacional:** uma transação agrupa leituras e escritas; ou tudo é gravado, ou nada. O banco isola transações simultâneas e garante unicidade por restrição.

**Planilha:** cada escrita é independente. Não há isolamento, não há restrição de unicidade e não há `rollback`. Duas execuções ao mesmo tempo podem ler a mesma "última linha" e gravar uma por cima da outra, se nada as coordenar.

**LockService:** trava uma seção de código para que só uma execução do script (`getScriptLock`), do documento (`getDocumentLock`) ou do usuário (`getUserLock`) a percorra por vez. A trava só é obtida com `tryLock` ou `waitLock`. **Ela não desfaz nada, não protege contra quem edita a planilha à mão e não coordena projetos diferentes que gravam na mesma planilha** (LIMITAÇÃO OFICIAL DA PLATAFORMA; a última parte é consequência de a trava de script valer só dentro de um projeto).

O que o código faz, conferido em 21/10/2026 (**EVIDÊNCIA DO REPOSITÓRIO**):

| Sistema | Coordenação | Identificador | Gravação parcial e recuperação | Testes |
|---|---|---|---|---|
| Exclusão de Disciplinas | `LockService.getScriptLock().tryLock(15000)`; recusa com mensagem clara se ocupada | `Pedido ID` por `Utilities.getUuid()`, um por envio, repetido em cada linha de disciplina | Todas as linhas do pedido num único `setValues`; recibo **fora** da trava; se o recibo falhar, o pedido continua gravado e a página avisa | `testar_backend.js` simula a trava ocupada |
| Trancamento Parcial | `tryLock(15000)` | — (não há ID próprio no pedido) | `appendRow`; recibo fora da trava | idem |
| Trancamento Total (formulário) | `tryLock(15000)`; dentro da trava confere de novo se o aluno já tem pedido pendente | `Registro ID` é preenchido pelo gerenciador, não pelo formulário | `appendRow`; recibo fora da trava | idem |
| Gerenciador de Trancamento Total | `tryLock` com mensagem clara | `Registro ID` (UUID) e `Versão` por linha; duplicatas de ID corrigidas | Conferência de versão antes de salvar (concorrência otimista); reserva `ENVIANDO…` com data antes do e-mail, desfeita se o envio falhar; linha relocalizada pelo `Registro ID` depois do envio | `testar_backend.js` cobre versão, reserva e reenvio |
| Comunidade IPUSP (gravação da ficha) | `tryLock(15000)` | linha conferida pela identidade da pessoa | só as células alteradas; recusa se o valor mudou desde que a ficha abriu | `testar_backend.js` |
| Painel dos servidores | `waitLock` nas gravações de períodos, Regras Curriculares e auditoria | `evento_id`, `ruleset_id` | migração idempotente; auditoria em duas fases, **não atômica** ([modelo, seção 5](../auditoria/MODELO.md)) | `testar_auditoria.js` e demais |
| Estrutura Curricular | trava do sistema em importação, envio e auditoria | identificador da importação `IMP-…`; a mesma operação nunca é gravada duas vezes | manifesto + abas `_nova_` + diário; falha antes da ativação não muda o que está em uso; resultado incerto tem verificação própria | suítes de gravação, lotes e trava (`testar_gravacao.js`, `testar_etapa7_trava_auditoria.js` e outras) |

Limites que continuam valendo:

- **Os testes simulam o Apps Script.** Eles provam a lógica, não o comportamento real do serviço sob carga. Concorrência real **NÃO VERIFICADO** em produção.
- **Idempotência do envio dos alunos:** não há chave de idempotência enviada pela página. Um duplo clique é evitado na tela (`btnEnviar.disabled = true`); dois envios deliberados (outra aba, recarga) gravam dois pedidos. No Trancamento Total, o segundo pede confirmação se o primeiro estiver pendente. Nos outros dois, **não há conferência de duplicidade** no servidor (RISCO POTENCIAL; solucionável dentro do Apps Script).
- **O formulário e o Google Forms** que ainda grave na mesma planilha são processos diferentes; a trava de script não os coordena. `appendRow` reduz o risco de sobrescrita, mas a exclusividade não é garantida pela trava (RISCO POTENCIAL).
- **A trava não protege contra edição manual.** A Estrutura Curricular confere de novo as abas em uso antes de ativar; os formulários não (RISCO POTENCIAL).

### 4.4. Segurança

| Camada | O que é | Situação |
|---|---|---|
| Autenticação | Quem é a pessoa: login na conta Google | O Google autentica. Os formulários exigem e-mail `@usp.br` no servidor e gravam o e-mail do login, nunca um digitado (EVIDÊNCIA DO REPOSITÓRIO) |
| Autorização | O que a pessoa pode fazer | Precisa ser conferida **no servidor, em cada função pública**. Existe no Painel dos servidores (`AcessoPainel.gs`, lista na aba `PAINEL_SERVIDORES` de `PERMISSOES_DE_ACESSO`), na Estrutura Curricular (`Acesso.gs`) e na gravação da Comunidade IPUSP (editores da planilha). **Falta** na leitura da Comunidade IPUSP e em todo o Gerenciador de Trancamento Total (abaixo) |
| Permissões das planilhas | Quem abre a planilha diretamente no Drive | Fronteira independente do sistema. Com "Executar como: eu", o Web App lê com a conta que implantou, então **a permissão da planilha não protege o que o Web App entrega** ([Google Workspace e Apps Script, seção 3](../seguranca/GOOGLE_WORKSPACE_E_APPS_SCRIPT.md#3-web-app-pode-ter-mais-privilégio-que-o-usuário)) |
| Implantação do Web App | "Quem pode acessar" e "Executar como" | Configuração fora do Git na maioria dos projetos (4.2). Os valores informados pelo responsável estão no `DADOS_E_SEGURANCA.md` de cada sistema, vários marcados `A CONFERIR` ou `A VALIDAR` |
| Validação no backend | Conferir formato, tamanho, período e estado no servidor | Os formulários validam período, disciplinas contra `DISCIPLINAS`, tamanhos e caracteres de controle no servidor (EVIDÊNCIA DO REPOSITÓRIO) |
| `google.script.run` | Chamada da página ao servidor | Qualquer função pública pode ser chamada diretamente; o botão escondido não protege nada. As funções privadas terminam em `_` |
| Script Properties | Configuração fora do Git | Tira valores do repositório público, mas **não é cofre**: qualquer editor do projeto as lê ([segredos e configuração, seção 3](../seguranca/SEGREDOS_E_CONFIGURACAO.md#3-limite-do-script-properties)) |

**Lacunas conhecidas de autorização** (PROBLEMA COMPROVADO pelo código e pela documentação de segurança; risco residual R3 do [relatório final](../governanca/RELATORIO_FINAL_IMPLANTACAO_2026.md#8-riscos-residuais)):

- **Comunidade IPUSP:** as funções de leitura (`listarComunidadeParaBusca`, `obterFicha` e outras) não conferem quem chama. Quem abre a página recebe o cadastro completo de alunos, docentes e servidores ([dados e segurança, seção 4](../sistemas/busca-alunos/DADOS_E_SEGURANCA.md#4-web-app)).
- **Gerenciador de Trancamento Total:** nenhuma função confere a conta, nem a leitura das justificativas nem o envio de e-mail ([dados e segurança do gerenciador, seção 4](../sistemas/trancamento-total/DADOS_E_SEGURANCA_GERENCIADOR.md#4-web-app)).

Os dois estão contidos hoje pela opção de implantação "Somente eu", informada pelo responsável em 20/10/2026. **Contenção não é correção.** Ambas as lacunas são corrigíveis dentro do Apps Script, com o mesmo padrão já usado no Painel dos servidores; a proposta está em [autorização de leitura nas ferramentas da equipe](../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md) (não implementada). A restrição institucional da seção 2 **não** é motivo para mantê-las.

Este registro **não** afirma que:

- o Google Workspace garante, por si, conformidade com a LGPD;
- a USP homologou ou aprovou formalmente algum dos sistemas ou esta arquitetura (não há registro disso no repositório);
- usar uma conta institucional elimina os riscos;
- as Script Properties são um cofre de segredos;
- o responsável individual está isento de responsabilidades.

O que existe é: **infraestrutura usada no contexto institucional** (Drive, Sheets, Apps Script da conta institucional); **permissões efetivamente concedidas** (as do Drive e das implantações, registradas por sistema, várias ainda a conferir); **controles técnicos** (os descritos acima e em cada `DADOS_E_SEGURANCA.md`); e **decisões que dependem de instâncias competentes** (base legal, retenção, responsável pelo tratamento, aprovação de acesso), todas PENDÊNCIA DE VALIDAÇÃO INSTITUCIONAL.

### 4.5. Implantação e manutenção

Detalhe em [Implantação](../IMPLANTACAO.md). Resumo:

| Onde | O que é | Muda com |
|---|---|---|
| Git (`main`) | o código revisado e testado | pull request e merge |
| Editor do Apps Script | o código que o projeto tem | `clasp push` ou edição no editor |
| `/dev` | o código do editor, para quem edita o projeto | o mesmo |
| `/exec` | uma **versão numerada** da implantação, que pode ser anterior ao editor | nova versão da implantação |
| Gatilhos | rodam o código do **editor**, não a versão do `/exec` | `clasp push` e instalação do gatilho |
| Configuração externa | Script Properties, `ID_INDEX`, permissões das planilhas, gatilhos instalados, manifesto não versionado | só no Google |

**A CI não implanta nada.** Ela confere o código do repositório; um ✓ não prova o que está no `/exec` ([CI](../CI.md)). Levar código ao Google exige autorização própria para cada `clasp push` e cada implantação ([fluxo, seção 6](../governanca/FLUXO_DE_MUDANCAS.md#6-do-main-ao-google)). A ferramenta [`conferir_implantacao.js`](../../ferramentas/conferir_implantacao.js) prova a igualdade do código do editor, e não a do `/exec` nem a da configuração.

Divergências conhecidas entre Git e Google estão no [inventário](../IMPLANTACAO.md#2-inventário-20102026). Exemplo: o Gerenciador de Trancamento Total em uso é a v1.0, com ID literal no código; a v1.1 do Git não foi implantada.

### 4.6. Interface e dependências

As telas usam HTML, CSS e JavaScript nativos servidos pelo HTML Service, sem framework nem etapa de build ([desenvolvimento local](../../DEVELOPMENT_LOCAL.md)). Benefícios: nenhuma ferramenta de compilação para manter, código que o editor do Apps Script aceita como está, e menos dependências a atualizar. Limites: interfaces grandes ficam em arquivos HTML longos, sem componentes reutilizáveis além das cópias de `shared/`, e a página roda dentro do iframe do Apps Script.

"Sem dependências" não é absoluto (**EVIDÊNCIA DO REPOSITÓRIO**): a Estrutura Curricular carrega `pdfjs-dist` e `tesseract.js` de `cdn.jsdelivr.net`, com versão fixa, para ler e fazer OCR do PDF do Júpiter no navegador ([`LeitorPdfFontes.html`](../../sistemas/estrutura-curricular/src/LeitorPdfFontes.html)); a Grade Horária visual carrega `html2canvas` e `jspdf` de `cdnjs.cloudflare.com` para exportar PDF; e as marcas USP e IP de várias telas vêm de um servidor da USP. Carregar uma biblioteca não implica, por si, enviar documentos ou dados acadêmicos ao provedor do CDN. Mas um script externo executado na página é uma **fronteira de confiança**: ele roda com os mesmos poderes do código da própria página, pode ler os dados disponíveis no navegador naquele momento (por exemplo, o conteúdo do PDF do Júpiter que está sendo lido ou a grade que está sendo exportada) e pode fazer requisições de rede. Se a dependência ou o endereço de onde ela vem for comprometido, isso pode acontecer sem nenhuma mudança no código do GRADIP. É um **RISCO POTENCIAL de cadeia de suprimentos**; não há evidência de vazamento. A versão fixa reduz a chance de receber uma versão nova inesperada, mas não garante que o arquivo servido seja o esperado; mitigações possíveis estão no [guia da OWASP sobre JavaScript de terceiros](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html). Também há dependência da disponibilidade desses endereços.

Frameworks e bibliotecas **não estão proibidos por princípio.** Adotar um é uma decisão (um novo ADR) que pesa segurança (origem, integridade, atualização), manutenção pela equipe, empacotamento (o Apps Script não tem build), compatibilidade com o HTML Service e as condições institucionais.

### 4.7. Integração com o Júpiter

| Elemento | Natureza |
|---|---|
| Regras próprias dos sistemas (ajustes manuais, oferta, grade, conflitos) | do GRADIP; documentadas em [Regras](../sistemas/estrutura-curricular/REGRAS.md) |
| Dados importados do Júpiter | do Júpiter; a Estrutura Curricular guarda uma cópia organizada e **não substitui o Júpiter como fonte oficial** ([README](../sistemas/estrutura-curricular/README.md)) |
| Formatos de exportação | relatórios "Grade Curricular" (CSV ou PDF) e "Lista de disciplinas por unidade" (CSV); comparação em [CSV x PDF](../sistemas/estrutura-curricular/CSV_X_PDF.md) |
| Dependência de mudanças externas | uma mudança no layout do relatório do Júpiter quebra a leitura, em qualquer tecnologia (RISCO POTENCIAL) |
| Validação dos dados recebidos | o navegador lê e confere o arquivo; o servidor valida de novo antes de gravar; créditos negativos, fracionários ou malformados são recusados (EVIDÊNCIA DO REPOSITÓRIO, versão 1.8.2) |
| Testes | parte depende de exportações reais do Júpiter, que não vão para o Git, e roda só à mão ([testes](../../sistemas/estrutura-curricular/testes/README.md)) |

Não há integração automática com o Júpiter (nem API nem acesso ao banco dele). **Uma migração de linguagem não elimina essa dependência**: o novo sistema continuará lendo os mesmos relatórios, ou precisará de uma integração institucional que hoje não existe.

### 4.8. Classificação das críticas

| Crítica | Natureza | Limitação real? | Evidência no repositório | Mitigação atual | Risco residual | Migração resolveria? |
|---|---|---|---|---|---|---|
| "Planilha não é banco de dados" | Decisão arquitetural | Sim | Toda a persistência em Sheets ([arquitetura geral](../ARQUITETURA_GERAL.md)) | Chaves no `ID_INDEX`, cabeçalhos conferidos antes de gravar | Integridade depende de disciplina de quem edita | Sim, se houver banco institucional autorizado |
| Sem transações ACID | Limitação da plataforma | Sim | `Gravacao.gs` documenta o problema | Manifesto + diário na Estrutura; uma escrita por pedido nos formulários; auditoria em duas fases | Falha entre escritas em sistemas sem diário; auditoria não atômica | Sim |
| Concorrência entre gravações | Limitação da plataforma | Sim | `LockService` em todos os sistemas que gravam (4.3) | Trava de script, versão por linha no gerenciador | Trava não cobre Forms nem edição manual; comportamento real sob carga NÃO VERIFICADO | Em grande parte |
| Pedido duplicado por reenvio | Débito técnico | Não é da plataforma | Sem conferência de duplicidade em Exclusão e Trancamento Parcial | Botão desabilitado durante o envio | Dois pedidos iguais na planilha | Não por si: precisa de regra de idempotência, possível já no Apps Script |
| Limite de 6 min por execução | Limitação da plataforma | Sim | Estrutura divide em etapas recuperáveis | Preparação em cópias, retomada pelo diário | Lote muito grande ainda pode falhar; frequência NÃO VERIFICADO | Sim |
| Cotas de e-mail e de serviços | Limitação da plataforma | Sim | `MailApp` nos formulários e no gerenciador | Recibo fora da trava; falha do recibo não perde o pedido | Exaustão da cota em pico NÃO VERIFICADO | Depende do serviço institucional de e-mail |
| Critérios de situação diferentes entre sistemas que leem a mesma planilha | Débito técnico | Não é da plataforma | Formulários: `estaConcluido_` (contém `conclu`); Painel dos servidores: igualdade exata com `concluído` ou `pendente` ([contratos](GUIA_DE_CONTINUIDADE_E_LEGADO.md#4-o-que-não-se-deve-modificar-inadvertidamente)) | Nenhuma específica | Contagem de pendências pode divergir do histórico do aluno; efeito real NÃO VERIFICADO | Não por si: exige definir um conjunto fechado de situações, possível já no Apps Script |
| Estrutura frágil a renomear coluna/aba | Decisão arquitetural / débito técnico | Sim | `COL` por posição (Exclusão); `CABECALHOS_RESPOSTAS` por título | Conferência do cabeçalho antes de gravar; erro bloqueia em vez de gravar errado | Edição de cabeçalho para o sistema | Parcialmente: esquema de banco é mais rígido |
| Edição manual corrompe dados | Governança institucional | Sim | Incidentes da Estrutura; `Protecao.gs` só na planilha das secretarias | Proteção de abas pelo código na grade, na Estrutura e na auditoria; conferências antes de ativar | Planilhas de respostas sem proteção pelo código | Parcialmente: depende de quem terá acesso direto ao banco |
| Leitura sem autorização na Comunidade IPUSP | Risco de segurança | **Não é limitação da plataforma** | [DADOS_E_SEGURANCA, seção 4](../sistemas/busca-alunos/DADOS_E_SEGURANCA.md#4-web-app) | Implantação "Somente eu" | Alto, se o acesso for aberto | Não: precisa de autorização no servidor, possível já no Apps Script |
| Gerenciador sem nenhuma autorização | Risco de segurança | **Não é limitação da plataforma** | [DADOS_E_SEGURANCA_GERENCIADOR, seção 4](../sistemas/trancamento-total/DADOS_E_SEGURANCA_GERENCIADOR.md#4-web-app) | Implantação "Somente eu" | Alto, se o acesso for aberto | Não: idem |
| "Executar como eu" dá ao Web App mais privilégio que ao usuário | Limitação da plataforma / decisão arquitetural | Sim | `USER_DEPLOYING` na maioria dos sistemas | Autorização no servidor onde existe | Onde a autorização falta (acima) | Não automaticamente: qualquer backend com conta de serviço tem o mesmo problema |
| Configuração da implantação fora do Git | Débito técnico | Parcial | Só o Painel dos servidores versiona `appsscript.json` | Procedimento da [implantação, seção 5](../IMPLANTACAO.md#5-versionar-o-manifesto-um-sistema-por-vez) | Configuração real desconhecida pelo repositório | Não por si |
| Git diferente do que está no Google | Governança / débito técnico | Sim | [Inventário](../IMPLANTACAO.md#2-inventário-20102026) | `conferir_implantacao.js`, registro por implantação | `/exec`, propriedades e gatilhos não conferidos | Não por si: implantação contínua exigiria infraestrutura autorizada |
| Sem implantação contínua | Limitação da plataforma / governança | Sim | CI só testa | Implantação manual com autorização | Erro humano no push | Possível em infraestrutura própria, se autorizada |
| Testes simulam o Google | Limitação da plataforma | Sim | `mockGoogle.js` e simuladores nas suítes | Lições incorporadas aos simuladores | Diferenças ainda não observadas | Em parte: banco e API locais são mais fáceis de testar |
| Dependência do Júpiter por arquivo | Dependência externa | Sim | Importação CSV/PDF | Validação no navegador e no servidor; comparação CSV x PDF | Mudança de layout do relatório | **Não** |
| Bibliotecas por CDN | Dependência externa / risco potencial de cadeia de suprimentos | Sim | `LeitorPdfFontes.html`, `GradeGrid.html` | Versões fixas | Indisponibilidade; script comprometido lendo dados do navegador ou fazendo requisições (sem evidência de ocorrência) | Não por si |
| Mantenedor único e identidade compartilhada com agentes | Governança institucional | Sim | [Riscos R1, R2, R9](../governanca/RELATORIO_FINAL_IMPLANTACAO_2026.md#8-riscos-residuais) | Fluxo de mudanças, ruleset, autorização escrita | Continuidade depende de uma pessoa | **Não** |
| Base legal e retenção indefinidas | Governança institucional | — | `A VALIDAR INSTITUCIONALMENTE` em cada `DADOS_E_SEGURANCA.md` | — | Tratamento sem definição formal registrada | **Não** |
| Desempenho com o crescimento do histórico | Risco potencial | NÃO VERIFICADO | Leituras de aba inteira nos formulários | Cache do catálogo de disciplinas (`CacheService`) | Lentidão futura | Sim, se o problema se confirmar |

## 5. Solução adotada

- **Google Sheets** como mecanismo operacional de armazenamento e consulta, aproveitando as planilhas preexistentes e o histórico delas.
- **Google Apps Script** para automações, validações, integrações (e-mail, Drive) e interfaces (HTML Service).
- **Google Drive** para os artefatos e recursos dos fluxos (cópias da grade, auditorias por semestre, futura pasta de ofícios).
- **`ID_INDEX` e Script Properties** para que nenhum ID de produção fique no código, e para separar produção e homologação ([arquitetura geral](../ARQUITETURA_GERAL.md)).
- **Um projeto Apps Script por sistema**, que conversam pelas planilhas e por links, e não por chamadas diretas.
- **Git público, CI e pull request** como registro de engenharia; o Google como ambiente de execução ([fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md)).
- Os dados permanecem em recursos do ecossistema Google usado no contexto institucional, sem transferência para infraestrutura pessoal.

## 6. Benefícios e custos aceitos

**Benefícios** (EVIDÊNCIA DO REPOSITÓRIO, salvo indicação):

- automação real de processos antes manuais, com recibo, controle de período e histórico do aluno;
- aproveitamento das planilhas e do histórico existentes, sem migração de dados;
- nenhum servidor a administrar e nenhum custo de infraestrutura adicional conhecido (CONTEXTO RELATADO PELO RESPONSÁVEL);
- dados mantidos no ambiente institucional, e não em contas pessoais;
- troca de planilha sem mudar o código (`ID_INDEX`), e ambiente de homologação pela mesma chave;
- código, regras e decisões documentados e testados com dados fictícios num repositório público.

**Custos e limitações aceitos:**

- sem transação, sem restrição de unicidade e com concorrência coordenada só por trava de script (4.3);
- cotas e tempo por execução (4.2);
- integridade dependente de quem edita as planilhas (4.1);
- implantação manual e configuração parcialmente fora do Git (4.5);
- testes que simulam o Google, e não o reproduzem (4.8);
- dependência do Google, da conta institucional e de uma pessoa (4.8).

**Não aceitos como custo da plataforma:** as lacunas de autorização da seção 4.4 e os débitos técnicos da matriz 4.8. São defeitos a corrigir.

## 7. Consequências para a manutenção

- Toda mudança segue o [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md); levar código ao Google pede autorização separada.
- Cabeçalhos, nomes de abas, chaves do `ID_INDEX` e valores de situação são **contratos** ([guia de continuidade, seção 4](GUIA_DE_CONTINUIDADE_E_LEGADO.md#4-o-que-não-se-deve-modificar-inadvertidamente)).
- Toda função pública confere quem chama; toda gravação usa trava; trabalho longo é dividido e retomável.
- Sistema que grava dados pessoais ou de decisão segue o [modelo de auditoria](../auditoria/MODELO.md).
- Antes de concluir que a plataforma não basta, meça ([guia de continuidade, seção 6](GUIA_DE_CONTINUIDADE_E_LEGADO.md#6-como-avaliar-problemas-de-desempenho)).

## 8. Condições para revisão desta decisão

Esta decisão deve ser revista (num novo ADR) quando ocorrer **qualquer uma** destas condições:

1. a instituição disponibilizar ao Serviço de Graduação um banco de dados ou servidor institucional, com responsabilidade técnica definida;
2. houver medição de que cotas, tempo de execução ou concorrência estão causando falhas recorrentes ou perda de pedidos ([critérios do guia de migração](GUIA_DE_MIGRACAO_TECNOLOGICA.md#7-critérios-para-considerar-uma-migração-necessária));
3. uma instância competente definir requisitos de segurança, auditoria ou retenção que a plataforma não consiga atender;
4. a USP passar a oferecer integração oficial com o Júpiter ou outro sistema institucional que mude o desenho dos fluxos;
5. a conta institucional, a edição do Google Workspace ou as políticas do Google mudarem de modo que afete os sistemas;
6. a manutenção deixar de ser possível com a equipe disponível.

A revisão pode concluir por manter a plataforma, migrar parte dos sistemas ou migrar todos. A justificativa técnica para migrar e a viabilidade institucional de migrar são avaliadas separadamente.

## 9. Referências

**Documentos deste repositório:** [arquitetura geral](../ARQUITETURA_GERAL.md) · [catálogo](../SISTEMAS.md) · [implantação](../IMPLANTACAO.md) · [CI](../CI.md) · [versões](../VERSOES.md) · [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md) · [relatório final da governança](../governanca/RELATORIO_FINAL_IMPLANTACAO_2026.md) · [diagnóstico de 20/10/2026](../governanca/DIAGNOSTICO_2026-10-20.md) · [segurança](../seguranca/README.md) · [repositório público](../seguranca/REPOSITORIO_PUBLICO.md) · [proposta de autorização](../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md) · [auditoria](../auditoria/MODELO.md) · [desenvolvimento local](../../DEVELOPMENT_LOCAL.md) · [guia de continuidade](GUIA_DE_CONTINUIDADE_E_LEGADO.md) · [guia de migração](GUIA_DE_MIGRACAO_TECNOLOGICA.md)

**Fontes oficiais do Google** (consultadas por busca em 21/10/2026; conferir a versão vigente):

- Cotas do Apps Script (tempo por execução, execuções simultâneas, destinatários de e-mail, tempo total diário de gatilhos, variação por tipo de conta e possibilidade de mudança sem aviso): https://developers.google.com/apps-script/guides/services/quotas
- Arquivos que podem ser armazenados no Google Drive (limite de 20 milhões de células por planilha): https://support.google.com/drive/answer/37603

**Outras fontes:**

- OWASP, *Third Party JavaScript Management Cheat Sheet* (scripts de terceiros como fronteira de confiança): https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html
- Lock Service (tipos de trava, `tryLock`/`waitLock`): https://developers.google.com/apps-script/reference/lock/lock-service
- Web Apps e identidade de execução: https://developers.google.com/apps-script/guides/web?hl=pt-br
- Properties Service: https://developers.google.com/apps-script/guides/properties?hl=pt-br
