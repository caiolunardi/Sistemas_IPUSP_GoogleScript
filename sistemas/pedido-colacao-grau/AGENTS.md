# Instruções locais — Formulário de Pedido de Colação de Grau

**Fronteira:** este é um Web App de alunos, projeto Apps Script independente do Gerenciador de Colação de Grau e Diplomas e do Painel dos Servidores. Um comando `clasp` deste projeto não se aplica aos outros.

1. Ler [AGENTS geral](../../AGENTS.md), [CLAUDE](../../CLAUDE.md), [START_HERE](../../START_HERE.md), [STATUS](STATUS.md) e [continuidade](contexto/CONTINUIDADE.md).
2. Código-fonte recebido em 06/11/2026 é **legado não incorporado**. Os arquivos originais contêm referências operacionais internas; hashes e inventário estão em [INVENTARIO_LEGADO](../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md), sem reproduzir conteúdo sensível. Não presumir que o editor Google é idêntico a esses arquivos.
3. Separar estritamente **COMPORTAMENTO OBSERVADO NO CÓDIGO**, **NAO_VERIFICADO NO GOOGLE** e **REQUISITO FUTURO**. A reutilização de anexos pertence ao formulário, mas não está implementada.
4. Segurança é gate crítico: usuários não devem necessitar de edição direta das planilhas institucionais; identidade do login, nº USP, titularidade de pedido e anexos devem ser validados no servidor. Detalhes de vulnerabilidades de titularidade ficam em canal restrito, fora do Git público.
5. A planilha `EMISSAO_DIPLOMAS` e a pasta `PASTA_RAIZ_ALUNOS` são recursos compartilhados. Conferir contratos com a fonte do Gerenciador 4.0 e o configurador do Painel antes de qualquer alteração em coluna, período, Registro ID ou nomenclatura de anexo.
6. Nenhuma migração ou remoção de anexos anteriores sem política de versionamento/retenção, revisão independente, homologação com dados fictícios e aceite humano.
7. `src/` existe desde a 2.0.0 (PR 3 do plano aprovado em 06/11/2026, retomado com o responsável em 09/11/2026): é fonte **reescrita**, nunca cópia dos originais. Antes de mudar, ler [RECEBIMENTO_2_0](../../docs/sistemas/pedido-colacao-grau/RECEBIMENTO_2_0.md). Este projeto só grava em `PEDIDOS_COLACAO` e em `PASTA_PROVISORIOS_COLACAO` (um escritor por recurso). O contexto local continua **PROPOSTA**: não cadastrar o app no `context.config.json` sem decisão específica.
8. Não fazer merge, Release, `clasp push`, deploy, alterações de Script Properties/ACLs, planilhas ou Drive sem autorização humana específica para o ato.

Trabalho em branch própria, PR, testes de publicação e links; estado Google só muda com evidência de execução, não pelo README.
