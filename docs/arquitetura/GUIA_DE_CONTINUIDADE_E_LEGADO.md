# Guia de continuidade e legado

Para quem recebe a responsabilidade pelos sistemas GRADIP: um servidor, analista ou desenvolvedor que talvez conheça engenharia de software, mas não o funcionamento da graduação, nem o Google Apps Script, nem as contas e planilhas em uso. Este guia diz **por onde começar, o que não quebrar e como trabalhar sem pôr em risco os pedidos dos alunos**.

Por que a arquitetura é esta: [ADR-001](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md). Como reconstruir em outra tecnologia: [guia de migração](GUIA_DE_MIGRACAO_TECNOLOGICA.md). As classes de evidência estão no [README desta pasta](README.md#classes-de-evidência).

**Pressuponha que o código do Git e o do Google podem ser diferentes** até conferir (seção 5). O repositório guarda o código, as regras e as decisões; as planilhas, as implantações e a configuração estão só no Google.

## 1. O que é o GRADIP

GRADIP é o conjunto de sistemas web do **Serviço de Graduação do Instituto de Psicologia da USP**, e também o nome do padrão visual comum deles. Os sistemas automatizam processos administrativos da graduação:

- **pedidos dos alunos:** exclusão de disciplinas, trancamento parcial e total de matrícula, com recibo por e-mail e período de abertura;
- **tratamento pela equipe:** conferência dos pedidos, conclusão e aviso ao aluno;
- **grade horária:** importação da estrutura curricular do Júpiter, preparação da grade, preenchimento pelas secretarias dos departamentos, auditoria e publicação aos alunos;
- **apoio:** contagem de créditos para formatura, busca de alunos, docentes e servidores, configuração de períodos e de regras curriculares.

**Públicos:** alunos de graduação (contas `@usp.br`), a equipe do Serviço de Graduação e as secretarias dos departamentos (PSA, PSC, PSE, PST). Lista completa e estado de cada sistema: [catálogo](../SISTEMAS.md). Termos da graduação e da plataforma: [glossário](../GLOSSARIO.md).

Vários processos ainda dependem de sistemas que **não estão neste repositório** (gerenciadores de Exclusão e Trancamento Parcial, formulários de Habilitação, BUSP, Colação e Intercambistas, entre outros; ver [limites conhecidos](../ARQUITETURA_GERAL.md#6-limites-conhecidos)). Não presuma que o repositório cobre todo o trabalho do Serviço.

## 2. Onde estão as informações

| Procura | Onde |
|---|---|
| Catálogo dos sistemas e estado de cada um | [`docs/SISTEMAS.md`](../SISTEMAS.md) |
| Arquitetura geral, chaves do `ID_INDEX`, Script Properties, ordem de montagem | [`docs/ARQUITETURA_GERAL.md`](../ARQUITETURA_GERAL.md) |
| Decisões arquiteturais | esta pasta ([ADR-001](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md)) |
| Modelos de dados | `DADOS_E_SEGURANCA.md` de cada sistema em [`docs/sistemas/`](../sistemas/README.md); o modelo completo da Estrutura Curricular em [`MODELO_DE_DADOS.md`](../sistemas/estrutura-curricular/MODELO_DE_DADOS.md); as constantes de colunas no início de cada `Codigo.gs` |
| Regras de negócio | `README.md` e `MANUAL_OPERACAO.md` de cada sistema; [`REGRAS.md`](../sistemas/estrutura-curricular/REGRAS.md) e [`CONTRATOS_E_FLUXOS.md`](../sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md) da Estrutura; [contagem de créditos](../sistemas/painel-solicitacoes/CONTAGEM_DE_CREDITOS.md) |
| Segurança e dados pessoais | [`docs/seguranca/`](../seguranca/README.md) e o `DADOS_E_SEGURANCA.md` de cada sistema |
| Testes | pasta `testes/` de cada sistema em [`sistemas/`](../../sistemas/), com README; o que a CI roda em [`docs/CI.md`](../CI.md) |
| Estado de implantação | README de cada sistema; [inventário da implantação](../IMPLANTACAO.md#2-inventário-20102026) |
| Histórico das versões | [`docs/VERSOES.md`](../VERSOES.md), aba **Releases** do GitHub e [`notas-de-versao/`](../../notas-de-versao/) |
| Como as mudanças entram | [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md) e [governança](../governanca/README.md) |
| Ajuda que o usuário vê | `AJUDA.md` de cada sistema e [`docs/ajuda/`](../ajuda/README.md) |
| Auditoria | [`docs/auditoria/`](../auditoria/README.md) |
| Ponto de entrada da Estrutura Curricular (o maior sistema) | [`MANUTENCAO_E_CONTINUIDADE.md`](../sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md) |

O que **não** está no repositório, de propósito: dados reais, IDs de planilhas e de implantações, URLs `/exec` das ferramentas da equipe, credenciais ([repositório público](../seguranca/REPOSITORIO_PUBLICO.md)). Esses valores estão nas planilhas e nas configurações do Google, sob a conta institucional.

## 3. Como os sistemas se relacionam

O GRADIP **não é um monólito.** Cada sistema é um **projeto Apps Script independente**, com código, implantação, Script Properties e gatilhos próprios. Os projetos **não chamam uns aos outros**: dependem uns dos outros pelos dados.

- **Planilhas compartilhadas.** Um formulário grava na planilha de respostas; o Painel dos servidores lê a mesma planilha para contar pendências; o gerenciador lê e grava a situação nela. O Painel de Solicitações e os formulários leem `PERIODOS`, que o Painel dos servidores grava. Mudar uma planilha afeta todos os projetos que a usam. O mapa de quem lê e grava cada chave está em [arquitetura geral, seção 2](../ARQUITETURA_GERAL.md#2-mapa-das-chaves).
- **`ID_INDEX`.** Planilha mestre que liga cada chave lógica (`PERIODOS`, `DISCIPLINAS`…) ao ID da planilha ou pasta de produção e ao da cópia de homologação. Cada projeto guarda só o ID do `ID_INDEX`. Trocar uma planilha é trocar uma célula, e a troca vale para **todos** os projetos ao mesmo tempo.
- **Script Properties.** Por projeto: `ID_INDEX_SPREADSHEET_ID` em todos; `AMBIENTE = homologacao` só nas cópias de teste dos formulários; `URLS_SISTEMAS_EQUIPE` no Painel dos servidores ([arquitetura geral, seção 3](../ARQUITETURA_GERAL.md#3-script-properties)).
- **Links entre aplicações.** O Painel de Solicitações leva os alunos aos formulários por endereços públicos que estão no código; o Painel dos servidores leva a equipe às ferramentas internas pelos endereços em `URLS_SISTEMAS_EQUIPE`. Uma nova implantação muda o endereço e exige atualizar o link.
- **Código comum copiado, não compartilhado.** O tema e a Central de Ajuda vêm de [`shared/`](../../shared/) e são **copiados** para cada projeto; a CI confere que as cópias são iguais à origem ([CI](../CI.md)). Mudar `shared/` exige reimplantar cada sistema que usa a cópia.

Consequência: uma mudança "local" a um sistema pode quebrar outro que lê a mesma planilha. Antes de mexer num formato, procure a chave no mapa e em todos os `Codigo.gs`.

## 4. O que não se deve modificar inadvertidamente

Os contratos abaixo estão no código e na documentação (**EVIDÊNCIA DO REPOSITÓRIO**, conferida em 21/10/2026). Mudá-los exige pull request, decisão de quem responde pelo processo e, quase sempre, mudança coordenada em mais de um projeto e nas planilhas reais.

| Contrato | Onde está definido | Por que importa |
|---|---|---|
| Formato do `ID_INDEX`: primeira aba, colunas `Chave`, `Tipo`, `ID de Produção`, `Homologação` | [arquitetura geral, seção 1](../ARQUITETURA_GERAL.md#formato-do-id_index) | todos os projetos acham as planilhas por ela; chave repetida ou sem ID é erro |
| **Nomes das chaves** do `ID_INDEX` | [arquitetura geral, seção 2](../ARQUITETURA_GERAL.md#2-mapa-das-chaves) | renomear uma chave desliga todos os projetos que a usam |
| Nomes das **Script Properties** e o valor `homologacao` | [arquitetura geral, seção 3](../ARQUITETURA_GERAL.md#3-script-properties), [ambiente de homologação](../sistemas/AMBIENTE_DE_HOMOLOGACAO.md) | valor desconhecido de `AMBIENTE` é erro, nunca volta sozinho para produção |
| **Colunas por posição** na planilha de Exclusão: A–P gravadas pelo formulário (A carimbo, B e-mail, J disciplina como `CÓDIGO - Nome`, K turma, L `Pedido ID`, P observações) e a situação lida na **T** | `COL` e `COLUNAS_GRAVADAS` em [`exclusao-disciplinas/.../Codigo.gs`](../../sistemas/exclusao-disciplinas/formulario/src/Codigo.gs) | inserir ou mover uma coluna faz o formulário gravar no lugar errado; o código só confere o começo dos títulos de A e B |
| **Cabeçalhos por título** no Trancamento Total (`Situação`, `Carimbo de data/hora`, `Endereço de e-mail`, `Nome Completo`, `Número USP`, `Ano de Ingresso`, `E-mail para contato`, `Justificativa`) e as colunas 10 `Registro ID` e 11 `Versão`, de uso exclusivo do gerenciador | `CABECALHOS_RESPOSTAS` no [formulário](../../sistemas/trancamento-total/formulario/src/Codigo.gs) e `CABECALHOS` no [gerenciador](../../sistemas/trancamento-total/gerenciador/src/Codigo.gs) | renomear um título bloqueia o formulário (de propósito); o gerenciador cria `E-mail Enviado` e `Data de Conclusão` se faltarem |
| **Cabeçalhos por título** no Trancamento Parcial (`Situação do Pedido`, `Disciplina 1` a `Disciplina 6` e outros) | `CABECALHOS_RESPOSTAS` no [formulário](../../sistemas/trancamento-parcial/formulario/src/Codigo.gs) | idem |
| Cadastro de alunos: primeira aba, `Número USP`, `Nome do Aluno`, `Ingresso` (`AAAA/S`), `eMail`, `eMail Secundario` | `CABECALHOS_ALUNOS` nos formulários | os formulários acham o aluno pelo e-mail do login |
| `DISCIPLINAS`: aba `DISCIPLINAS`, títulos em `snake_case`, situação `substituida` | `ABA_DISCIPLINAS` e `SITUACAO_SUBSTITUIDA` nos formulários; [base de disciplinas](../sistemas/estrutura-curricular/BASE_DISCIPLINAS.md) | validação das disciplinas dos pedidos |
| **Valores de situação.** Os formulários de Trancamento gravam `pendente`; o gerenciador grava `Concluído` ou `Pendente`. Nos três formulários, um pedido conta como concluído quando a situação **contém** `conclu` (sem acento, sem diferença de maiúsculas) e qualquer outro valor conta como pendente | `estaConcluido_` nos três formulários; `salvarPedido` no gerenciador | escrever "Finalizado" ou "OK" à mão deixa o pedido pendente para sempre no histórico do aluno e no aviso de pedido pendente |
| **Contagem de pendências no Painel dos servidores**, com critério **diferente** dos formulários: Trancamento Total e Exclusão contam como pendente tudo o que não for exatamente `concluído` (sem espaços nas pontas, minúsculas); Trancamento Parcial conta só o que for exatamente `pendente`. A situação é lida **por posição**: coluna 1 (A) no Trancamento Total e no Parcial, coluna 20 (T) na Exclusão, na aba `Respostas ao formulário 1` | constantes `COLUNA_SITUACAO_*` e `VALOR_SITUACAO_*` no início de [`painel-servidores/src/Code.gs`](../../sistemas/painel-servidores/src/Code.gs) | um valor como `Concluido` (sem acento) ou `Concluída` conta como concluído no formulário e como pendente no Painel; um valor como `Em análise` no Parcial conta como pendente no formulário e não aparece no Painel. O comentário da Exclusão que diz usar "o mesmo critério do Painel dos servidores" não corresponde ao código. Se essa divergência já produziu contagens erradas, NÃO VERIFICADO: depende dos valores reais nas planilhas |
| **Identificadores:** `Pedido ID` (UUID) na Exclusão, `Registro ID` (UUID) e `Versão` no Trancamento Total, `IMP-…` nas importações da Estrutura, `evento_id` e `ruleset_id` no Painel dos servidores | constantes e funções citadas | ligam linhas de um mesmo pedido, impedem gravação dupla e servem à auditoria; não se apagam nem se reaproveitam |
| Reserva `ENVIANDO…` com data na coluna `E-mail Enviado` | `PREFIXO_RESERVA` no gerenciador | marca envio de e-mail em andamento; apagá-la à mão pode gerar e-mail duplicado |
| Manifesto e diário da Estrutura (`estruturaCurricular.ativa`, `estruturaCurricular.gravacao`) e abas ocultas `_nova_…`/`_anterior_…` | [`Gravacao.gs`](../../sistemas/estrutura-curricular/src/Gravacao.gs), [modelo de dados](../sistemas/estrutura-curricular/MODELO_DE_DADOS.md) | é o manifesto que diz quais abas estão em uso; apagar ou renomear abas ocultas à mão quebra a recuperação |
| Abas da planilha das secretarias (PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades) e suas colunas | [modelo de dados](../sistemas/estrutura-curricular/MODELO_DE_DADOS.md#índices-e-planilha-das-secretarias), [planilha das secretarias](../sistemas/planilha-grade-secretarias/README.md) | envio, validação, proteção, auditoria e a Grade Horária visual dependem delas |
| `PERMISSOES_DE_ACESSO`: uma aba por sistema (`ESTRUTURA_CURRICULAR`, `PAINEL_SERVIDORES`) | [Estrutura, dados e segurança](../sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md), [Painel dos servidores](../sistemas/painel-servidores/DADOS_E_SEGURANCA.md) | é a lista de quem entra; um nome fora dela perde o acesso |
| **Regras de validação** dos formulários (domínio `usp.br`, período aberto, até 6 disciplinas, tamanhos máximos, cursos permitidos) | constantes no início de cada `Codigo.gs`; manual de cada sistema | são regras administrativas, não detalhes técnicos (seção 5 e [guia de migração](GUIA_DE_MIGRACAO_TECNOLOGICA.md#8-preservação-do-conhecimento-administrativo)) |
| **Permissões:** "Executar como" e "Quem pode acessar" de cada implantação; compartilhamento das planilhas | `DADOS_E_SEGURANCA.md` de cada sistema, seção 4 | abrir a Comunidade IPUSP ou o Gerenciador de Trancamento Total a outras contas **sem antes corrigir a autorização no servidor** expõe dados ([ADR-001, seção 4.4](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md#44-segurança)) |
| **Gatilhos instaláveis:** auditoria diária do Painel dos servidores; verificação horária de `Protecao.gs`; `onEdit` e `onOpen` da auditoria da grade (instalados pela Estrutura); `onEdit` simples de `Validacoes.gs` | `ScriptApp.newTrigger` nos arquivos citados | gatilho não existe só porque o código existe; e roda o código do **editor**, não o do `/exec` |
| **Formatos do Júpiter:** "Grade Curricular" (CSV ou PDF) e "Lista de disciplinas por unidade" (CSV) | [CSV x PDF](../sistemas/estrutura-curricular/CSV_X_PDF.md), [regras](../sistemas/estrutura-curricular/REGRAS.md) | a importação depende do layout desses relatórios |
| Fuso `America/Sao_Paulo` | constante `TIMEZONE` nos `Codigo.gs` | datas de carimbo, períodos e reservas |

Se um contrato não estiver nesta tabela nem na documentação do sistema, **não presuma que ele não exista**: procure no código antes de mudar.

## 5. Como assumir a manutenção

Sequência segura. Não pule etapas, e não faça nada no Google sem a autorização prevista no [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md).

1. **Leia** o [README](../../README.md), o [ADR-001](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md), este guia, a [arquitetura geral](../ARQUITETURA_GERAL.md), o [catálogo](../SISTEMAS.md), o [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md), a [implantação](../IMPLANTACAO.md) e a pasta [`docs/seguranca/`](../seguranca/README.md). Se for alterar telas, as regras do [`CLAUDE.md`](../../CLAUDE.md) valem para pessoas também.
2. **Confirme quem responde** por cada processo (o responsável funcional) e quem é dono da conta institucional que tem os projetos e as planilhas. Sem isso, não altere nada. Responsável formal pelo tratamento, base legal e retenção são PENDÊNCIA DE VALIDAÇÃO INSTITUCIONAL em todos os sistemas.
3. **Obtenha acesso legítimo:** à conta ou aos projetos Apps Script, às planilhas e ao repositório, pelo responsável. Não copie planilhas reais para contas pessoais nem para serviços externos, nem para "testar".
4. **Faça o inventário** de cada projeto, preenchendo o [inventário da implantação](../IMPLANTACAO.md#2-inventário-20102026): qual versão está no `/exec`, quem pode acessar, com que conta executa, quais Script Properties existem (os nomes, não os valores), quais gatilhos estão instalados e quem é editor de cada planilha. Registre no README do sistema; valores sensíveis não entram.
5. **Compare o Git com o Google** com [`conferir_implantacao.js`](../../ferramentas/conferir_implantacao.js), numa pasta fora do clone ([implantação, seção 4](../IMPLANTACAO.md#4-conferir-o-código-do-editor)). O `clasp pull` lê o projeto real e só é feito por quem tem a autorização para isso. Se o editor tiver alterações que não estão no Git, registre a divergência antes de qualquer push: o próximo push as apagaria.
6. **Rode os testes** com dados fictícios: as suítes de cada `sistemas/*/testes/`, `node ferramentas/verificar_publicacao.js` e `node ferramentas/verificar_copias_shared.js` ([CI](../CI.md)). Testes passando provam a lógica no simulador, não o comportamento no Google.
7. **Revise as permissões** antes de abrir qualquer sistema a mais contas: leia a seção 4 do `DADOS_E_SEGURANCA.md` dele. A Comunidade IPUSP e o Gerenciador de Trancamento Total **não têm autorização no servidor** e só são seguros com "Somente eu" ([proposta de correção](../seguranca/propostas/ACESSO_LEITURA_EQUIPE.md)).
8. **Homologue** cada mudança numa cópia do projeto, com planilhas de teste e `AMBIENTE = homologacao` quando o sistema já suportar ([ambiente de homologação](../sistemas/AMBIENTE_DE_HOMOLOGACAO.md)), seguindo o `HOMOLOGACAO.md` do sistema.

**Antes de qualquer implantação, confirme:**

- o commit vem do `main`, com a CI verde ([fluxo, seção 6](../governanca/FLUXO_DE_MUDANCAS.md#6-do-main-ao-google));
- o código do editor foi conferido antes do push, e nada do editor se perderá;
- a homologação foi feita e registrada naquele commit;
- as Script Properties e as chaves do `ID_INDEX` que a versão nova exige já existem, nos dois ambientes;
- "Executar como" e "Quem pode acessar" correspondem ao `DADOS_E_SEGURANCA.md`;
- os gatilhos necessários estão instalados;
- há um jeito de voltar atrás ([implantação, seção 7](../IMPLANTACAO.md#7-voltar-atrás));
- a autorização para aquele push e para aquela implantação foi dada.

## 6. Como avaliar problemas de desempenho

Antes de concluir que a plataforma precisa ser substituída, **meça e localize**. Nenhuma medição de desempenho está registrada neste repositório (**NÃO VERIFICADO**); a primeira investigação começa do zero.

**Onde medir.** O painel **Execuções** do projeto Apps Script mostra a duração e o erro de cada execução, inclusive as de gatilhos. Para separar etapas, registre durações com `console.time`/`console.timeEnd` ou diferenças de `Date.now()` numa cópia de homologação, **sem registrar dados pessoais** ([minimização](../seguranca/MINIMIZACAO_E_DADOS_DE_TESTE.md)). Compare a mesma operação com planilhas de tamanhos diferentes (dados fictícios).

| Hipótese | Sinais | Como confirmar | Correção dentro do Apps Script |
|---|---|---|---|
| **Algoritmo** | lento mesmo com poucos dados; tempo cresce mais que o volume | medir com dados pequenos e grandes; procurar laços aninhados sobre a aba inteira | rever o algoritmo, usar mapas por chave |
| **Acesso ineficiente à planilha** | muitas chamadas `getValue`/`setValue` em laço; `getRange` célula a célula | contar chamadas ao serviço por execução | ler e gravar intervalos de uma vez (`getValues`/`setValues`), limitar às colunas necessárias, usar `CacheService` para dados que mudam pouco (como o catálogo de disciplinas da Exclusão) |
| **Crescimento do volume** | piora gradual ao longo dos semestres | relacionar duração e número de linhas no histórico de execuções | ler só o necessário, arquivar abas antigas **por decisão funcional** e sem apagar histórico |
| **Concorrência** | erro "Muitos pedidos sendo gravados ao mesmo tempo" ou equivalente em horários de pico | contar as falhas de `tryLock` no painel Execuções e cruzar com a abertura dos formulários | encurtar a seção travada (o recibo já fica fora dela), revisar o tempo de espera com cuidado |
| **Cota de serviços** | exceção de cota; falhas que voltam depois de 24 horas | mensagem do erro no painel Execuções; comparar com a [página oficial de cotas](https://developers.google.com/apps-script/guides/services/quotas) | reduzir chamadas, agrupar e-mails, dividir lotes |
| **Tempo máximo de execução** | execução interrompida perto de 6 minutos | duração no painel Execuções | dividir em etapas retomáveis, como a Estrutura faz |
| **Integração externa** | lentidão só ao ler arquivo do Júpiter, ao fazer OCR ou ao carregar biblioteca de CDN | medir no navegador (ferramentas do desenvolvedor) | depende do caso; parte do trabalho já roda no navegador |

Só depois de localizar a causa faz sentido avaliar uma migração, pelos [critérios do guia de migração](GUIA_DE_MIGRACAO_TECNOLOGICA.md#7-critérios-para-considerar-uma-migração-necessária). A maior parte dos problemas da tabela tem correção dentro da plataforma.
