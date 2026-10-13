# Painel de Sistemas — servidores

**Estado:** fonte recebida em 13/10/2026 e versionada com a camada visual nova (tema, menu lateral/abas, Pessoas do IPUSP e Central de Ajuda), verificada localmente em Chromium. **Ainda não homologada no `/exec`.** O GitHub não informa qual versão está implantada no Apps Script. [Código](../../../sistemas/painel-servidores/README.md).

## Finalidade e público

Página de entrada da **equipe** do Serviço de Graduação do IPUSP. Não é usada por alunos: o painel dos alunos é o [Painel de Solicitações](../painel-solicitacoes/README.md), um projeto separado.

O painel tem duas partes:

1. **Sistemas**: cards por categoria que abrem os sistemas internos em nova aba, com busca e avisos de pedidos pendentes.
2. **Configurações**: telas que **gravam** em planilhas usadas por outros sistemas.
   - **Formulários**: períodos de abertura e encerramento dos formulários dos alunos (Sazonal ou Contínuo), com telas próprias para Colação de Grau e Exclusão de Disciplinas.
   - **Regras Curriculares**: rulesets por currículo e habilitação (requisitos, disciplinas, grupos), com validação, ativação, versões, correção auditada de ruleset ativo e manual próprio.

## Cards de sistemas

| Categoria | Card | Aviso de pendência |
|---|---|---|
| Pessoas | **Pessoas do IPUSP** (hoje abre a Busca de Alunos) | não tem |
| Diplomas e Colação de Grau | Emissão de Diplomas | conferência de dados pessoais diferente de OK |
| Habilitações e Matrícula | Abertura de Habilitações | situação “pendente” (aba atual e aba 2021–2022) |
| Habilitações e Matrícula | Trancamento Total | situação diferente de “concluído” |
| Habilitações e Matrícula | Trancamento Parcial | situação “pendente” |
| Habilitações e Matrícula | Matrícula de Intercambistas | pendentes de inclusão e de exclusão, em selos separados |
| Habilitações e Matrícula | Exclusão de Disciplinas | alunos com ao menos uma disciplina não concluída |
| Outros Serviços | 2ª Via do BUSP | vermelho: pendente de análise/emissão; amarelo: aguardando o serviço técnico de apoio financeiro |
| Grade Horária | Configurações de Grade Horária | não tem |

O card **Pessoas do IPUSP** tem esse nome por pedido do responsável funcional: a busca de alunos é só a primeira consulta da área, e docentes e servidores devem entrar no mesmo sistema. Os cards ficam declarados no array `SISTEMAS` de `Painel.html`; incluir um sistema é acrescentar um objeto ali.

Os avisos são lidos uma vez, quando a página abre (`obterContadoresPendencias`). Se a contagem de um sistema falhar, ele devolve 0 e o card fica sem selo.

## Interface

- **Aparência:** Sistema (padrão), Claro e Escuro, com `GradipTema`/`GradipTemaControle`. A preferência fica só no navegador (`localStorage["gradip-theme"]`).
- **Navegação:** menu lateral ou abas, com os mesmos botões (Sistemas, Configurações, Formulários, Regras Curriculares), no modelo do Lunaris e da [Estrutura Curricular 1.10.0](../estrutura-curricular/NAVEGACAO_E_VISUAL_1_10_0.md). O painel **sempre abre no menu lateral**; a escolha não é guardada. Até 900 px o menu fica acima do conteúdo e começa recolhido. O item destacado é lido das próprias telas, então os botões Voltar e os cards continuam funcionando como antes.
- **Ajuda:** botão **Ajuda** no cabeçalho, item no menu e gatilhos `?` na lista de sistemas, em Configurações, em Formulários e nas três janelas de período. O manual das Regras Curriculares continua sendo o já existente, e a Central tem botões que o abrem. Conteúdo descrito em [AJUDA.md](AJUDA.md).

## Documentos

- [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md): uso, instalação/atualização e manutenção.
- [AJUDA.md](AJUDA.md): mapa da Central de Ajuda.
- [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md): dados, planilhas, modelo de acesso e pendências de segurança.
- [HOMOLOGACAO.md](HOMOLOGACAO.md): hashes, arquivos alterados e idênticos, testes e o que falta conferir no Google.

## Versões

| Versão | Alterações |
|---|---|
| Recebida (13/10/2026) | 19 arquivos: painel com cards e avisos, Configurações de Formulários e Regras Curriculares. Sem tema escuro, sem Central de Ajuda do painel. |
| Fonte no Git (13/10/2026) | Tema GRADIP, menu lateral/abas, card Pessoas do IPUSP, Central de Ajuda e gatilhos `?`, cards acessíveis por teclado, avisos mantidos ao usar a busca. Backend sem mudança de comportamento. Verificada localmente; implantação pendente. |
| Fonte no Git (13/10/2026, 2ª) | Card Configurações de Grade Horária (categoria Grade Horária, sem aviso de pendência). Só `Painel.html` e `PainelAjuda.html` mudam. |
