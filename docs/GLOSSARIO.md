# Glossário

Termos que aparecem na documentação e nas telas, para quem não é do Serviço de Graduação do IPUSP.

## USP e IP

| Termo | Significado |
|---|---|
| **IP / IPUSP** | Instituto de Psicologia da Universidade de São Paulo. |
| **Serviço de Graduação (GRADIP)** | Setor do IP que atende os alunos de graduação: matrícula, trancamentos, colação de grau, grade horária. "GRADIP" também dá nome ao padrão visual comum dos sistemas. |
| **CG** | Comissão de Graduação, que decide casos como trancamentos fora das regras. |
| **CoG** | Conselho de Graduação da USP, que edita as resoluções citadas nos formulários. |
| **Júpiter** | Sistema acadêmico da USP para a graduação: matrícula, histórico escolar e estrutura curricular. A Estrutura Curricular importa os relatórios dele (CSV e PDF). |
| **Nº USP** | Número de identificação de cada pessoa na USP. É dado pessoal: nunca entra no repositório. |
| **E-mail USP / `@usp.br`** | Conta Google institucional. Os formulários só aceitam quem está logado com ela. |
| **PSA, PSC, PSE, PST** | Os quatro departamentos do IP: Psicologia da Aprendizagem, do Desenvolvimento e da Personalidade (PSA), Psicologia Clínica (PSC), Psicologia Experimental (PSE) e Psicologia Social e do Trabalho (PST). São também as abas da planilha da grade. |
| **Interdepartamentais / Outras Unidades** | Abas da grade para disciplinas de mais de um departamento e para as oferecidas por outras unidades da USP. |
| **Secretarias** | Secretarias dos departamentos, que preenchem dia, horário e sala na planilha da grade. |
| **BUSP** | Bilhete Único USP, o cartão de transporte dos alunos. O Serviço de Graduação recebe os pedidos de 2ª via. |
| **Intercambistas** | Alunos de outras universidades em intercâmbio no IP, com formulário próprio de inclusão e exclusão de disciplinas. |

## Vida acadêmica

| Termo | Significado |
|---|---|
| **Habilitação** | Cada formação do curso de Psicologia: Formação de Psicólogo(a), Bacharelado e Licenciatura. Um aluno pode ter mais de uma aberta. |
| **Estrutura curricular / currículo** | Conjunto de disciplinas, créditos e requisitos de uma habilitação numa versão. O aluno segue a versão do seu ingresso. |
| **Obrigatória, optativa eletiva, optativa livre** | Tipos de disciplina na estrutura curricular. |
| **Semestre ideal** | Semestre do curso em que a disciplina é recomendada. A validação da grade usa esse dado para evitar conflito entre obrigatória e optativa do mesmo semestre. |
| **Créditos-aula / créditos-trabalho** | Unidades de carga horária da USP. 1 crédito-aula equivale a 1 hora semanal de aula. |
| **Trancamento parcial / total** | Interrupção da matrícula em algumas disciplinas ou em todas, no semestre. |
| **Exclusão de disciplina** | Retirada de uma disciplina da matrícula do semestre, dentro do prazo. |
| **Colação de grau** | Ato que conclui o curso. O pedido depende de cumprir os créditos, que a contagem de créditos ajuda a simular. |

## Técnica

| Termo | Significado |
|---|---|
| **ADR** | *Architecture Decision Record*, registro de decisão arquitetural: documento curto que diz o que foi decidido, por quê, quais alternativas havia e quando rever. Ficam em [`arquitetura/`](arquitetura/README.md). |
| **Google Apps Script** | Plataforma do Google para programar sobre Planilhas, Drive e Gmail. Todos os sistemas daqui são feitos nela. |
| **Web App** | Projeto Apps Script publicado como página. **Executar como** diz com que conta o código roda; **Quem pode acessar** diz quem abre a página. |
| **`/exec` e `/dev`** | Endereços de um Web App. O `/exec` é a versão publicada; o `/dev` é o teste do editor, que só quem edita o projeto abre. |
| **Implantação** | Publicação de uma versão do Web App. Editar a implantação existente mantém o endereço; criar uma nova gera outro. Arquivar desativa o endereço. |
| **Script Properties (Propriedades do script)** | Configurações guardadas no projeto, fora do código. É onde ficam o ID do `ID_INDEX` e as URLs internas. |
| **clasp** | Ferramenta de linha de comando do Google que leva o código de uma pasta do computador ao projeto Apps Script (`clasp push`) e traz de volta (`clasp pull`). Usa a conta institucional, independente do GitHub. O `.clasp.json` (ID do projeto) fica fora do Git; o `.claspignore` de cada `src/` diz que só código vai ao Google. Ver [desenvolvimento local](../DEVELOPMENT_LOCAL.md). |
| **`ID_INDEX`** | Planilha mestre que liga cada chave (por exemplo `PERIODOS`) ao ID da planilha correspondente. Ver [arquitetura geral](ARQUITETURA_GERAL.md). |
| **Chave** | Nome estável de um recurso no `ID_INDEX`. A documentação cita a chave, nunca o ID. |
| **Nome do projeto (`GRADIP · <Sistema> · <AMBIENTE>`)** | Nome de cada projeto Apps Script no Google, por exemplo `GRADIP · Gerenciador de Pessoas · PRODUÇÃO`. O nome do Google é o oficial e a documentação usa o mesmo; a lista fica na planilha da chave `SISTEMAS`. Ver [nomes dos projetos](IMPLANTACAO.md#nome-dos-projetos-no-google). |
| **Auditoria** | Registro de quem fez o quê, quando e onde num sistema, numa planilha própria que só acrescenta linhas. Ver [docs/auditoria](auditoria/README.md). |
| **Selo encadeado (hash)** | Código calculado de cada linha da auditoria junto com o da linha anterior. Mudar, apagar ou inserir uma linha à mão quebra a corrente, e a conferência aponta onde. |
| **Sessão (auditoria)** | Uma aba do navegador aberta num sistema, do momento em que abre até a última ação registrada. |
| **Homologação** | Teste com o sistema publicado numa cópia do projeto, que grava em cópias vazias das planilhas (Script Property `AMBIENTE = homologacao`). Ver [ambiente de homologação](sistemas/AMBIENTE_DE_HOMOLOGACAO.md). |
| **Ruleset** | Conjunto versionado de regras de um currículo, usado na contagem de créditos e editado no Painel dos servidores. |
| **Central de Ajuda** | Ajuda dentro de cada tela (botão **Ajuda** e os `?`), com busca e perguntas frequentes. Padrão em [`ajuda/`](ajuda/README.md). |
| **Tema Sistema / Claro / Escuro** | Aparência das telas. "Sistema" segue a configuração do computador ou celular. Padrão em [`THEME_IMPLEMENTATION.md`](THEME_IMPLEMENTATION.md). |
| **Dados fictícios** | Nomes, e-mails e números inventados (`ana@usp.br`, `9000001`, disciplinas `TST0101`) usados em testes e prints. |
