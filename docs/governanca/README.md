# Governança técnica

Como as mudanças entram neste repositório, quem decide o quê e o que ainda falta decidir. Vale para pessoas e para agentes de IA.

## 1. Documentos

| Assunto | Fonte de verdade |
|---|---|
| Ramos, pull requests, merge, o que um agente pode fazer, classes de risco | [Fluxo de mudanças](FLUXO_DE_MUDANCAS.md) |
| Como revisar um PR e escrever o parecer | [Revisão](REVISAO.md) |
| O que o GitHub impõe hoje e como conferir ou refazer as proteções | [Proteção do `main`](PROTECAO_DO_MAIN.md) |
| Diagnóstico de 20/10/2026 (achados, evidências, plano) | [Diagnóstico](DIAGNOSTICO_2026-10-20.md) |
| Implantação de 20 e 21/10/2026: o que foi aplicado, evidências e riscos que ficam | [Relatório final](RELATORIO_FINAL_IMPLANTACAO_2026.md) |
| Verificação automática | [CI](../CI.md) |
| Versões, tags e Releases | [Versões](../VERSOES.md) |
| Levar código ao Google (clasp) | [Desenvolvimento local](../../DEVELOPMENT_LOCAL.md) |
| O que pode ser publicado | [Repositório público](../seguranca/REPOSITORIO_PUBLICO.md) |
| Relato de vulnerabilidade | [`SECURITY.md`](../../SECURITY.md) |

Se dois documentos discordarem, vale o da tabela, e a divergência é um achado a corrigir num PR.

## 2. Papéis

| Papel | Quem | Responde por |
|---|---|---|
| Responsável pelo repositório | o mantenedor (dono da conta do GitHub) | merge, configurações do GitHub, Releases |
| Responsável pelos sistemas no Google | o Serviço de Graduação, pela conta institucional dona dos projetos Apps Script | `clasp push`, implantação, Script Properties, planilhas |
| Agente desenvolvedor | qualquer agente de IA a pedido do responsável | ramo, código, testes, documentação, PR |
| Agente revisor | agente de IA em sessão separada | parecer no PR, sem aprovar |
| Colaborador externo | qualquer pessoa, por fork | PR; não recebe segredos nem acesso ao Google |

Hoje o responsável pelo repositório e o responsável pelos sistemas são a mesma pessoa.

## 3. Decisões pendentes

Não são decisões técnicas. Ficam aqui até alguém com autoridade decidir; nenhum agente decide por conta própria.

| Tema | Situação | Quem decide |
|---|---|---|
| **Licença** do código e da documentação | sem `LICENSE`. Sem licença, o código é público para leitura, mas não está licenciado para reuso. A escolha (e se cabe licença aberta) depende de quem é titular do código feito no serviço público | Serviço de Graduação com a instância jurídica/institucional da USP — A VALIDAR INSTITUCIONALMENTE |
| **Marcas USP e IPUSP** em `assets/` | usadas conforme o manual de identidade, sem licença de reuso por terceiros | A VALIDAR INSTITUCIONALMENTE |
| **Contribuições externas** | sem termo de cessão ou de licença de contribuição. Aceitar código de fora antes de definir a licença deixa a titularidade dessa contribuição indefinida | junto com a licença |
| **Código de conduta** | não há `CODE_OF_CONDUCT.md` | o responsável; adotar um texto padrão é decisão de política, não técnica |
| **Titularidade do repositório** | conta pessoal, um único administrador. Se o acesso dessa conta se perder, não há outra pessoa capaz de administrar o repositório | Serviço de Graduação: avaliar uma organização no GitHub com pelo menos dois administradores institucionais. **Não migrar** sem essa decisão |
| **Segundo responsável** | sem ele, o GitHub não consegue exigir aprovação de outra pessoa ([proteção, seção 4](PROTECAO_DO_MAIN.md#4-quem-publica-e-quem-autoriza-dois-modelos)) | Serviço de Graduação |
| **Recuperação de acesso** | conta do GitHub e conta institucional do clasp com recuperação só do titular | o responsável: autenticação em dois fatores, códigos de recuperação guardados em local institucional |
| **Retenção** de planilhas de pedidos, logs e auditoria | `A VALIDAR INSTITUCIONALMENTE` em todos os `DADOS_E_SEGURANCA.md` | Serviço de Graduação com o Encarregado de Dados da USP. Nenhum agente implementa exclusão automática |
| **Base legal** do tratamento de dados de cada sistema | `A VALIDAR INSTITUCIONALMENTE` | idem |
