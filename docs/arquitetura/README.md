# Arquitetura: decisões, continuidade e migração

Esta pasta guarda as **decisões arquiteturais** do GRADIP e os guias para quem herdar ou reconstruir os sistemas. Ela responde a três perguntas:

1. **Por que o GRADIP foi construído dessa maneira?** → [ADR-001: escolha da plataforma institucional](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md)
2. **Como manter os sistemas dentro das condições institucionais existentes?** → [Guia de continuidade e legado](GUIA_DE_CONTINUIDADE_E_LEGADO.md)
3. **Como reconstruí-los em outra tecnologia sem perder as regras administrativas, a integridade dos dados e a continuidade operacional?** → [Guia de migração tecnológica](GUIA_DE_MIGRACAO_TECNOLOGICA.md)

A visão técnica de como os sistemas se ligam hoje (planilhas, chaves do `ID_INDEX`, Script Properties, ordem de montagem) continua em [Arquitetura geral](../ARQUITETURA_GERAL.md). Esta pasta não repete esse conteúdo: explica o porquê, o que preservar e como mudar com segurança.

## Documentos

| Documento | Para quem | O que traz |
|---|---|---|
| [ADR-001](ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md) | quem avalia ou revisa a arquitetura | contexto institucional, alternativas comparadas, princípio da adequação institucional, limitações aceitas e análise crítica (seção 4) |
| [Guia de continuidade e legado](GUIA_DE_CONTINUIDADE_E_LEGADO.md) | quem assume a manutenção | onde está cada informação, como os projetos se relacionam, contratos que não se mudam sem querer, como assumir e como investigar lentidão |
| [Guia de migração tecnológica](GUIA_DE_MIGRACAO_TECNOLOGICA.md) | quem um dia reconstruir os sistemas | separação entre regra e tecnologia, correspondências conceituais, dados históricos, contratos, mapa por sistema, estratégia em 16 passos e critérios para migrar |

## Classes de evidência

Os três documentos separam a origem de cada afirmação. As classes não se misturam numa mesma frase:

| Classe | Significado |
|---|---|
| **CONTEXTO RELATADO PELO RESPONSÁVEL** | condição institucional descrita pelo responsável pelo projeto, sem documento comprobatório no repositório |
| **EVIDÊNCIA DO REPOSITÓRIO** | arquivo, função, teste ou documento que existe neste repositório e pode ser conferido |
| **LIMITAÇÃO OFICIAL DA PLATAFORMA** | restrição documentada pelo Google, com fonte identificável |
| **RISCO POTENCIAL** | problema que pode ocorrer, mas não foi demonstrado nos sistemas atuais |
| **PROBLEMA COMPROVADO** | defeito demonstrado por código, teste, histórico ou registro de incidente |
| **PENDÊNCIA DE VALIDAÇÃO INSTITUCIONAL** | decisão que depende de autorização ou interpretação de instância competente |
| **NÃO VERIFICADO** | ponto sem evidência suficiente para afirmar presença ou ausência |

## Como registrar uma nova decisão

Uma decisão arquitetural nova (trocar a persistência de um sistema, adotar uma biblioteca, mudar o modelo de autorização) ganha um arquivo `ADR-NNN_<TEMA>.md` nesta pasta, com o próximo número, e entra por pull request como qualquer mudança ([fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md)). Um ADR não é alterado para refletir uma decisão nova: ele é marcado como **substituído por ADR-NNN** e o novo explica o que mudou.

Estrutura mínima: identificador, título, estado, data do registro, contexto, decisão, alternativas, consequências, condições de revisão e referências. Separe as classes de evidência acima.

## O que estes documentos não são

- Não são homologação, certificação de conformidade com a LGPD nem aprovação institucional da arquitetura.
- Não autorizam refatoração, migração nem implantação. Cada uma segue o [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md) e pede autorização própria.
- Não substituem a documentação de cada sistema em [`docs/sistemas/`](../sistemas/README.md), que continua sendo a fonte de verdade das regras e dos dados de cada um.

Registro criado em 21/10/2026, depois do [encerramento da implantação da governança técnica](../governanca/RELATORIO_FINAL_IMPLANTACAO_2026.md), como registro documental independente dela.
