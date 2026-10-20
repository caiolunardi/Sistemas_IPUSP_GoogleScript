# Catálogo de sistemas — GRADIP / IPUSP

Este catálogo apresenta os sistemas incorporados ao repositório e separa **documentação**, **fonte versionada** e **estado de implantação**. A versão implantada de cada sistema é a que está publicada no Google; o Git não a atualiza sozinho. Estado conferido em 20/10/2026.

## Alunos

| Sistema | Finalidade | Documentação | Fonte no Git | Estado documentado |
|---|---|---|---|---|
| Painel de Solicitações | entrada para os formulários acadêmicos, contagem de créditos, grade horária e atendimento online | [docs](sistemas/painel-solicitacoes/README.md) | [fonte v1.5](../sistemas/painel-solicitacoes/README.md) | v1.3/v1.4 implantadas em 15/10/2026; v1.5 (Atendimento online pelo WhatsApp) ainda não implantada |
| Grade Horária visual | grade do curso por semestre, grades anteriores e PDF | [docs](sistemas/grade-horaria-visual/README.md) | [fonte v2.0](../sistemas/grade-horaria-visual/README.md) | verificada localmente; homologação no `/exec` pendente |
| Exclusão de Disciplinas | pedido de exclusão de disciplinas do semestre | [docs](sistemas/exclusao-disciplinas/README.md) | [formulário v1.2](../sistemas/exclusao-disciplinas/README.md) | verificado localmente; homologação pendente; gerenciador da equipe fora do repositório |
| Trancamento Parcial de Matrícula | pedido de trancamento de disciplinas específicas | [docs](sistemas/trancamento-parcial/README.md) | [formulário v1.2](../sistemas/trancamento-parcial/README.md) | verificado localmente; homologação pendente; gerenciador da equipe fora do repositório |
| Trancamento Total de Matrícula | pedido de trancamento total | [docs](sistemas/trancamento-total/README.md) | [formulário v1.3](../sistemas/trancamento-total/README.md) | verificado localmente; homologação pendente |

## Equipe do Serviço de Graduação

| Sistema | Finalidade | Documentação | Fonte no Git | Estado documentado |
|---|---|---|---|---|
| Painel de Sistemas (servidores) | entrada para os sistemas internos, avisos de pendência, períodos dos formulários e Regras Curriculares | [docs](sistemas/painel-servidores/README.md) | [fonte](../sistemas/painel-servidores/README.md) | camada visual verificada localmente; implantação pendente; URLs dos sistemas em Script Property desde 20/10/2026 |
| Estrutura Curricular e Grade Horária | importar o Júpiter, preparar e enviar a grade, auditar o preenchimento | [docs](sistemas/estrutura-curricular/README.md) | [fonte](../sistemas/estrutura-curricular/README.md) | documentação até 1.11.3; homologação no Google pendente |
| Planilha das secretarias | validações e proteção da planilha que as secretarias preenchem | [código e instruções](../sistemas/estrutura-curricular/planilha-grade/README.md) | [fonte](../sistemas/estrutura-curricular/planilha-grade/README.md) | `Validacoes.gs` e `Protecao.gs` |
| Comunidade IPUSP (antiga Busca de Alunos) | busca de alunos, docentes, servidores e setores; ficha e exportação | [docs](sistemas/busca-alunos/README.md) | [fonte v1.3](../sistemas/busca-alunos/README.md) | verificada localmente; homologação pendente; modelo de acesso à leitura para decisão |
| Gerenciador de Trancamento Total | tratamento dos pedidos de trancamento total | [docs](sistemas/trancamento-total/README.md) | [fonte v1.1](../sistemas/trancamento-total/gerenciador/README.md) | não implantado, por decisão do responsável funcional |

## Ideias em desenvolvimento

| Ideia | Público | Finalidade | Documentação | Estado |
|---|---|---|---|---|
| Gerenciador de Ofícios e Modelos | equipe | numerar, gerar e arquivar ofícios a partir de modelos, com rascunho de e-mail | [ideia](sistemas/gerenciador-oficios/README.md) | ideia em desenvolvimento, sem código |

## Guias comuns

- [Arquitetura geral](ARQUITETURA_GERAL.md) e [glossário](GLOSSARIO.md)
- [Como participar](../CONTRIBUTING.md)
- [Como reaproveitar um sistema em outro setor](COMO_REAPROVEITAR.md)
- [Ambiente de homologação dos formulários](sistemas/AMBIENTE_DE_HOMOLOGACAO.md)
- [Repositório público: o que pode entrar](seguranca/REPOSITORIO_PUBLICO.md)

## Regra de promoção

Um sistema pode ter a documentação incorporada antes da fonte quando o material ainda estiver aguardando auditoria independente. A pasta `sistemas/<nome>/` deve deixar esse estado explícito para não confundir **pacote recebido** com **baseline auditada**.
