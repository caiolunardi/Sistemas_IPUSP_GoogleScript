# Comece aqui — GRADIP / Sistemas IPUSP

**Esta é a porta de entrada de navegação, não um STATUS geral e nem autorização para executar ações.**

## Quando uma IA recebe uma tarefa sem conhecer a conversa anterior

1. Leia [AGENTS.md](AGENTS.md) e [CLAUDE.md](CLAUDE.md): regras obrigatórias de autorização, segurança e alteração.
2. Localize a responsabilidade solicitada no **catálogo oficial** [docs/SISTEMAS.md](docs/SISTEMAS.md). Este arquivo não replica versões ou situações de implantação.
3. Leia a documentação específica em [docs/sistemas/](docs/sistemas/README.md) e a fonte correspondente em `sistemas/`, **se incorporada ao repositório**. Confirme qual projeto Apps Script é afetado.
4. Confira branch/HEAD, PRs, CI, código e registros de homologação/implantação. Um commit no Git **não** implica mudança no editor do Google nem na versão `/exec`.
5. Se o assunto cruzar sistemas, consulte o [mapa de contratos e chaves](docs/ARQUITETURA_GERAL.md) e o [guia de continuidade](docs/arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md). Identifique quem lê, quem grava e a responsabilidade por cada contrato.
6. Use o [contexto geral](docs/contexto/README.md) e a [continuidade](docs/contexto/CONTINUIDADE.md) para executar o mandato e deixar evidências para a próxima IA.

## Atalhos por nome ou atividade — somente ponteiros

| Tarefa ou nome informal | Documentação original |
| --- | --- |
| Estrutura Curricular, importação Júpiter, preparação da grade | [Estrutura Curricular](docs/sistemas/estrutura-curricular/README.md); contexto local `ADOTADO`: [instruções da Estrutura](sistemas/estrutura-curricular/AGENTS.md) |
| Grade horária pública dos alunos | [Grade Horária visual](docs/sistemas/grade-horaria-visual/README.md) |
| Formulários de Exclusão e Trancamento | [Sistemas dos alunos](docs/SISTEMAS.md#alunos) |
| Painel interno e regras/períodos de solicitação | [Painel dos servidores](docs/sistemas/painel-servidores/README.md) |
| Busca de pessoas, cadastro de alunos/docentes/servidores | [Gerenciador de Pessoas](docs/sistemas/busca-alunos/README.md) |
| Gerenciador de Abertura de Habilitações (equipe) | [documentação](docs/sistemas/abertura-habilitacoes/README.md); contexto local em **proposta**: [instruções do gerenciador](sistemas/abertura-habilitacoes/gerenciador/AGENTS.md) |
| Validação e proteção da planilha das secretarias | [Planilha das secretarias](docs/sistemas/planilha-grade-secretarias/README.md) |
| Diplomas, colação, BUSP ou módulos ainda não incorporados | [Limites do acervo](docs/ARQUITETURA_GERAL.md#6-limites-conhecidos); conferir PRs/documentos autorizados antes de assumir código na main |

**Abertura de Habilitações:** o formulário dos alunos é um Google Forms externo; não tem contexto de código neste PR. O gerenciador interno é o Web App acima.

**Desambiguação:** nomes de processos acadêmicos podem corresponder a formulário, gerenciador e/ou script vinculado a planilha, com implantações independentes. Não escolher o primeiro caminho encontrado sem identificar o componente.

## Fronteiras

Cada Web App é um projeto Google Apps Script independente. A integração ocorre por planilhas, chaves `ID_INDEX` e links; a camada visual comum está em [shared/](shared/). Não há autorização para unificar backends.

Repositório **público**: nunca publicar dados reais de estudantes/servidores, IDs internos, URLs de ferramentas internas, segredos, valores de Script Properties ou logs privados. Leia a [política de publicação](docs/seguranca/REPOSITORIO_PUBLICO.md) e o [fluxo de mudanças](docs/governanca/FLUXO_DE_MUDANCAS.md).

**Adoção de contexto:** a estrutura geral está preparada. Estrutura Curricular: contexto `ADOTADO`, a partir das [instruções da Estrutura](sistemas/estrutura-curricular/AGENTS.md). Gerenciador de Abertura de Habilitações: contexto local `PROPOSTA`, pendente de revisão, teste a frio e decisão humana; os demais ainda não possuem contexto local. O acervo anterior ao contexto fica congelado como histórico desde 04/11/2026. Cada aplicativo manterá STATUS e histórico próprios. Esta entrada não duplica nenhum estado vigente.
