# Catálogo de sistemas — GRADIP / IPUSP

Este catálogo apresenta os sistemas já incorporados ao repositório central e separa claramente **documentação**, **fonte versionada** e **estado de homologação**.

| Sistema | Público | Finalidade | Documentação | Fonte no Git | Estado documentado |
|---|---|---|---|---|---|
| Painel de Solicitações | alunos | entrada para 7 formulários acadêmicos e contagem de créditos por currículo | [docs](sistemas/painel-solicitacoes/README.md) | [fonte](../sistemas/painel-solicitacoes/README.md) | v1.3/v1.4 implantadas em 15/10/2026; fonte v1.5 (Atendimento online pelo WhatsApp) ainda não implantada |
| Estrutura Curricular e Grade Horária | equipe / CG autorizada | importar Júpiter, preparar/enviar grade e auditar preenchimento | [docs](sistemas/estrutura-curricular/README.md) | [fonte 1.10.0](../sistemas/estrutura-curricular/README.md) | baseline 1.9.3 auditada; pacote visual 1.10.0 verificado localmente; implantação e homologação no Google pendentes |
| Painel de Sistemas (servidores) | equipe | entrada para os sistemas internos, avisos de pendência, períodos dos formulários e Regras Curriculares | [docs](sistemas/painel-servidores/README.md) | [fonte](../sistemas/painel-servidores/README.md) | fonte recebida em 13/10/2026 com nova camada visual verificada localmente; implantação e homologação no Google pendentes |

## Ideias em desenvolvimento

| Ideia | Público | Finalidade | Documentação | Estado |
|---|---|---|---|---|
| Gerenciador de Ofícios e Modelos | equipe | numerar, gerar e arquivar ofícios a partir de modelos, com rascunho de e-mail | [ideia](sistemas/gerenciador-oficios/README.md) | ideia em desenvolvimento, sem código |

## Regra de promoção

Um sistema pode ter a documentação incorporada antes da fonte quando o material ainda estiver aguardando auditoria independente. A pasta `sistemas/<nome>/` deve deixar esse estado explícito para não confundir **pacote recebido** com **baseline auditada**.
