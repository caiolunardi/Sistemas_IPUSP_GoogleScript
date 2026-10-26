# Arquitetura geral — como os sistemas se ligam

Visão de conjunto para quem vai manter os sistemas ou montá-los em outra unidade. O detalhe de cada sistema (colunas, abas, regras) continua no `MODELO_DE_DADOS.md`, no `DADOS_E_SEGURANCA.md` ou no manual dele; esta página diz **onde procurar** e **em que ordem montar**. Termos desconhecidos: [glossário](GLOSSARIO.md). Por que a plataforma é esta e quais limitações ela tem: [ADR-001](arquitetura/ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md). Para quem herdar ou reconstruir os sistemas: [guia de continuidade](arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md) e [guia de migração](arquitetura/GUIA_DE_MIGRACAO_TECNOLOGICA.md).

## 1. Peças

- **Web Apps em Google Apps Script.** Cada sistema é um projeto separado, publicado com um endereço `/exec`. Não há servidor próprio nem banco de dados.
- **Planilhas Google** guardam os dados: cadastros, pedidos dos alunos, períodos, regras curriculares, grade horária.
- **Planilha mestre `ID_INDEX`.** Liga cada **chave** ao ID de uma planilha ou pasta. Os sistemas guardam só o ID dela (Script Property `ID_INDEX_SPREADSHEET_ID`) e acham o resto pela chave. Trocar uma planilha é trocar uma célula, sem mexer no código.
- **Script Properties** guardam o que não pode ir para o Git: o ID do `ID_INDEX`, o ambiente (`AMBIENTE`) e as URLs internas.

### Formato do `ID_INDEX`

Primeira aba, uma linha por chave:

| A — Chave | B — Tipo | C — ID de Produção | D — Homologação |
|---|---|---|---|
| `PERIODOS` | `spreadsheet` | ID da planilha de produção | ID da cópia de teste |

Alguns sistemas conferem o tipo (`spreadsheet` para planilhas). Nas pastas do Drive e em parte das chaves da grade o tipo não é conferido. Chave repetida ou sem ID é erro de configuração. A coluna D só é lida pelos projetos com `AMBIENTE = homologacao` ([ambiente de homologação](sistemas/AMBIENTE_DE_HOMOLOGACAO.md)).

## 2. Mapa das chaves

**L** = lê, **G** = grava. Nenhum sistema do repositório tem mais ID de planilha no código (o Painel dos servidores foi o último, até a 1.3).

| Chave | O que é | Quem usa | Onde está o formato |
|---|---|---|---|
| `PLANILHA_ALUNOS` | cadastro dos alunos (nº USP, nome, ingresso, e-mails) | Comunidade IPUSP (L/G ficha); formulários de Exclusão, Trancamento Parcial e Total (L); Estrutura Curricular, auditoria (L) | [Comunidade IPUSP](sistemas/busca-alunos/DADOS_E_SEGURANCA.md) |
| `PLANILHA_DOCENTES` | cadastro dos docentes | Comunidade IPUSP (L/G); Estrutura Curricular, auditoria (L); Painel dos servidores 1.2, saudação, e 1.3, auditoria (L) | idem |
| `SERVIDORES` | cadastro de servidores e setores | Comunidade IPUSP (L/G); Estrutura Curricular, auditoria (L); Painel dos servidores 1.2, saudação, e 1.3, auditoria (L) | idem |
| `PERIODOS` | abertura e fechamento de cada formulário | Painel de Solicitações (L); Exclusão e Trancamento Parcial (L); Painel dos servidores (L/G) | [Painel de Solicitações](sistemas/painel-solicitacoes/DADOS_E_SEGURANCA.md) |
| `REGRAS_CURRICULARES` | regras de cada currículo para a contagem de créditos (a aba `AUDITORIA_REGRAS_CURRICULARES` ganha `evento_id` na 1.3 do Painel dos servidores) | Painel de Solicitações (L); Painel dos servidores (L/G) | [Contagem de créditos](sistemas/painel-solicitacoes/CONTAGEM_DE_CREDITOS.md) |
| `DISCIPLINAS` | cadastro de disciplinas (código, nome, créditos) | Exclusão e Trancamento Parcial (L) | [Exclusão](sistemas/exclusao-disciplinas/DADOS_E_SEGURANCA.md) |
| `EXCLUSAO_DISCIPLINAS` | respostas do formulário de exclusão | formulário (G); Painel dos servidores (L); gerenciador (fora do repositório) | [Exclusão](sistemas/exclusao-disciplinas/README.md) |
| `TRANCAMENTO_PARCIAL_MATRICULA` | respostas do trancamento parcial | formulário (G); Painel dos servidores (L); gerenciador (fora do repositório) | [Trancamento Parcial](sistemas/trancamento-parcial/README.md) |
| `TRANCAMENTO_TOTAL_MATRICULA` | respostas do trancamento total | formulário (G); gerenciador (L/G); Painel dos servidores (L) | [Trancamento Total](sistemas/trancamento-total/README.md) |
| `ESTRUTURA_CURRICULAR` | base curricular importada do Júpiter, ajustes e histórico | Estrutura Curricular (L/G) | [modelo de dados](sistemas/estrutura-curricular/MODELO_DE_DADOS.md) |
| `PERMISSOES_DE_ACESSO` | quem entra em cada sistema da equipe e com que perfil, uma aba por sistema (`ESTRUTURA_CURRICULAR`, `PAINEL_SERVIDORES`, ...) | Estrutura Curricular (L); Painel dos servidores 1.1 (L, aba `PAINEL_SERVIDORES`); Gerenciador de Abertura de Habilitações 2.0 (L, aba `GERENCIADOR_HABILITACOES`; na 2.1 também nome e observação, colunas B e D) | [Estrutura Curricular](sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md) |
| `GRADE_HORARIA_PREENCHIMENTO` | planilha que as secretarias preenchem | Estrutura Curricular (G no envio, L na auditoria); Grade Horária visual (L); código da própria planilha (validação e proteção) | [modelo de dados](sistemas/estrutura-curricular/MODELO_DE_DADOS.md#índices-e-planilha-das-secretarias) |
| `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` | índice das cópias de semestres anteriores | Estrutura Curricular (G); Grade Horária visual (L) | idem |
| `BACKUP_GRADES_ANTERIORES` | pasta das cópias da grade | Estrutura Curricular (G) | idem |
| `AUDITORIA_GRADES_ANTERIORES` | pasta das auditorias por semestre | Estrutura Curricular (G) | [modelo de dados](sistemas/estrutura-curricular/MODELO_DE_DADOS.md#auditoria-por-semestre) |
| `AUDITORIA_PAINEL_SERVIDORES` | auditoria do Painel dos servidores: eventos, alterações (antes/depois), sessões, resumo diário, pendências | Painel dos servidores 1.3 (G) | [docs/auditoria](auditoria/README.md) |
| `AUDITORIA_ABERTURA_HABILITACOES` | auditoria do Gerenciador de Abertura de Habilitações: eventos, alterações (antes/depois), sessões, resumo diário; a cópia de homologação usa uma planilha de auditoria própria na coluna Homologação | Gerenciador de Abertura de Habilitações 2.1 (G) | [docs/auditoria](auditoria/README.md) |
| `SISTEMAS` | lista dos projetos Apps Script do setor, de produção e de homologação: nome no Google, aba em `PERMISSOES_DE_ACESSO` e endereço `/exec` (aba `Página1`, colunas `SISTEMA`, `ABA_PERMISSOES`, `LINK_EXEC`) | nenhum sistema lê; é consultada pela equipe | [nomes dos projetos](IMPLANTACAO.md#nome-dos-projetos-no-google) |
| `OFICIOS` | pasta do futuro Gerenciador de Ofícios | ainda sem código | [ideia](sistemas/gerenciador-oficios/README.md) |

O Painel dos servidores também lê, desde a 1.4 pelo `ID_INDEX`, as planilhas de quatro sistemas cujos formulários estão fora do repositório:

| Chave | O que é | Quem usa |
|---|---|---|
| `EMISSAO_DIPLOMAS` | pedidos de emissão de diploma (aba `Diplomas`) | Painel dos servidores 1.4 (L, aviso do card) |
| `ABERTURA_HABILITACOES` | pedidos de abertura de habilitação (abas `Respostas ao formulário 2` e `2021 - 2022`) | Painel dos servidores 1.4 (L); Gerenciador de Abertura de Habilitações 2.0 (L/G; a aba `2021 - 2022` só L) — [modelo de dados](sistemas/abertura-habilitacoes/MODELO_DE_DADOS.md) |
| `SEGUNDA_VIA_BUSP` | pedidos de 2ª via do BUSP | Painel dos servidores 1.4 (L) |
| `MATRICULA_INTERCAMBISTAS` | pedidos de inclusão e exclusão de intercambistas | Painel dos servidores 1.4 (L) |

## 3. Script Properties

| Propriedade | Projetos | Conteúdo |
|---|---|---|
| `ID_INDEX_SPREADSHEET_ID` | todos (no Painel dos servidores, desde a 1.1, para achar `PERMISSOES_DE_ACESSO`, na 1.2, os cadastros da saudação e, na 1.3, a planilha da auditoria) | ID da planilha mestre |
| `AMBIENTE` | Exclusão, Trancamento Parcial e Total; Gerenciador de Abertura de Habilitações 2.0 (só nas cópias de teste) | `homologacao` |
| `MIGRACAO_REGISTRO_ID_CONFIRMACAO` | Gerenciador de Abertura de Habilitações 2.0, só durante a migração controlada | código dado pelo diagnóstico |
| `RECUPERACAO_REGISTRO` | Gerenciador de Abertura de Habilitações 2.0, só durante a recuperação de um pedido | número da linha, depois o código dado pelo diagnóstico |
| `URLS_SISTEMAS_EQUIPE` | Painel dos servidores | JSON com as URLs `/exec` das ferramentas da equipe |

## 4. Como os sistemas conversam

Os sistemas não chamam uns aos outros: **conversam pelas planilhas** e por links.

- **Pedidos dos alunos.** O aluno abre o Painel de Solicitações, que consulta `PERIODOS` para mostrar o que está aberto e leva ao formulário. O formulário confere o login `@usp.br`, lê `PLANILHA_ALUNOS` e `DISCIPLINAS`, grava na planilha de respostas e manda o recibo. A equipe vê a contagem no Painel dos servidores e trata o pedido no gerenciador, que grava a situação na mesma planilha.
- **Grade horária, a cada semestre.** A Estrutura Curricular importa o Júpiter para `ESTRUTURA_CURRICULAR`, prepara a lista e envia a grade para `GRADE_HORARIA_PREENCHIMENTO`, guardando uma cópia do semestre anterior. As secretarias preenchem dia, horário e sala, com validação e proteção da própria planilha. A auditoria acompanha o preenchimento e a Grade Horária visual mostra o resultado aos alunos.
- **Contagem de créditos.** A equipe mantém as Regras Curriculares pelo Painel dos servidores, e o Painel de Solicitações as lê para o aluno simular quanto falta para se formar.

## 5. Ordem para montar em outra unidade

1. Crie a planilha `ID_INDEX` (seção 1).
2. Monte os cadastros: `PLANILHA_ALUNOS`, `PLANILHA_DOCENTES`, `SERVIDORES` e `DISCIPLINAS`.
3. Monte `PERIODOS` e o **Painel de Solicitações**. Ele já funciona com qualquer formulário que tenha uma linha em `PERIODOS`.
4. Instale um formulário de cada vez (Exclusão, Trancamento Parcial, Trancamento Total), cada um com a planilha de respostas e uma cópia de homologação.
5. Instale o **Painel dos servidores** e a **Comunidade IPUSP** para a equipe. Leia antes a seção 4 do `DADOS_E_SEGURANCA.md` de cada um: há decisões de acesso pendentes.
6. Se a unidade organiza a grade como o IP, instale a **Estrutura Curricular**, a planilha das secretarias e a **Grade Horária visual**.
7. Opcional: `REGRAS_CURRICULARES` e a contagem de créditos.

Passo a passo de cada projeto: [Como reaproveitar](COMO_REAPROVEITAR.md) e o manual de cada sistema.

## 6. Limites conhecidos

- Os gerenciadores de Exclusão, Trancamento Parcial, 2ª via do BUSP, Intercambistas e Diplomas, e os formulários de Habilitação, BUSP, Colação e Intercambistas, **ainda não estão no repositório**.
- O Painel dos servidores lê todas as planilhas pelo `ID_INDEX` desde a 1.4 (seção 2). A 1.3, que está no `/exec`, ainda tem IDs literais, mantidos fora do Git ([inventário](IMPLANTACAO.md#2-inventário-20102026)). O Gerenciador de Trancamento Total em uso (v1.0) também tem ID literal e não está no repositório; a v1.1 do Git usa o `ID_INDEX`. O Gerenciador de Abertura de Habilitações usa o `ID_INDEX` desde a v2.0, implantada em 21/10/2026 no lugar da v1.0 (que tinha ID literal).
- A contagem de pendências do Painel dos servidores lê a situação por posição de coluna e com critério próprio, diferente do critério dos formulários ([contratos](arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md#4-o-que-não-se-deve-modificar-inadvertidamente)). Em Habilitações, o painel conta só a situação `pendente`, enquanto o gerenciador trata como pendente tudo o que não contém "conclu" ([contrato](sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas)).
- Parte dos testes da Estrutura Curricular depende de exportações reais do Júpiter, que não vão para o Git. As outras suítes usam dados sintéticos.
