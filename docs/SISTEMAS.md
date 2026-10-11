# Catálogo de sistemas — GRADIP / IPUSP

Este catálogo apresenta os sistemas já incorporados ao repositório central e separa claramente **documentação**, **fonte versionada** e **estado de homologação**.

| Sistema | Público | Finalidade | Documentação | Fonte no Git | Estado documentado |
|---|---|---|---|---|---|
| Painel de Solicitações | alunos | entrada para 7 formulários acadêmicos | [docs](sistemas/painel-solicitacoes/README.md) | [fonte](../sistemas/painel-solicitacoes/README.md) | UI v1.2 aceita; backend do Git possui integração ao `ID_INDEX` separada da implantação homologada |
| Estrutura Curricular e Grade Horária | equipe / CG autorizada | importar Júpiter, preparar/enviar grade e auditar preenchimento | [docs](sistemas/estrutura-curricular/README.md) | [fonte 1.10.0](../sistemas/estrutura-curricular/README.md) | baseline 1.9.3 auditada; pacote visual 1.10.0 verificado localmente; implantação e homologação no Google pendentes |

## Regra de promoção

Um sistema pode ter a documentação incorporada antes da fonte quando o material ainda estiver aguardando auditoria independente. A pasta `sistemas/<nome>/` deve deixar esse estado explícito para não confundir **pacote recebido** com **baseline auditada**.
