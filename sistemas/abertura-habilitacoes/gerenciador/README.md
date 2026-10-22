# Gerenciador de Abertura de Habilitações — fonte v2.1

Web App interno do Serviço de Graduação para tratar os pedidos de abertura de habilitação: pendentes, dez concluídos mais recentes, busca no histórico (inclui a aba 2021–2022, só consulta), relatórios e, em cada pedido, observações, **Concluir solicitação** (ou reabrir) e **Avisar aluno por e-mail**.

**Estado:** implantado em 21/10/2026 (versão 6 da implantação de produção, commit `314fbef`), com homologação parcial. A **v2.1** desta pasta (nome e observação de quem acessou no cabeçalho, [auditoria](../../../docs/sistemas/abertura-habilitacoes/AUDITORIA.md)) ainda não foi implantada. O GitHub não sincroniza com o Apps Script: o registro de implantação fica em [`docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md`](../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md).

## Arquivos de `src/` (vão para o Apps Script)

| Arquivo | Papel |
|---|---|
| `Codigo.gs` | `doGet`, `include_`, `diagnosticarConfiguracao` e `diagnosticarPlanilha`. |
| `Configuracao.gs` | `ID_INDEX`, `AMBIENTE` (produção/homologação), erros com código, cache. |
| `Acesso.gs` | Lista de acesso (aba `GERENCIADOR_HABILITACOES` de `PERMISSOES_DE_ACESSO`), perfis LEITOR e ADMINISTRADOR, página sem acesso. |
| `Planilha.gs` | Leitura em lote, conferência de títulos e de J/K, escrita só na aba atual, Registro ID. |
| `Pedidos.gs` | Pendentes, concluídos, detalhe, busca no histórico e relatórios (só leitura). |
| `Salvamento.gs` | `salvarPedido` (observações, concluir/reabrir, e-mail com reserva) e `atribuirIdentificador`. |
| `Migracao.gs` | Diagnóstico e migração controlada de Registro ID e Versão; recuperação de um pedido. |
| `AuditoriaHabilitacoes.gs` | (2.1) Funções públicas de consulta e gravação com registro na auditoria, dicionário de eventos, lote da página, preparar/conferir/consolidar a auditoria. |
| `Auditoria.gs` | (2.1) Núcleo da auditoria, cópia idêntica de [`shared/auditoria/Auditoria.gs`](../../../shared/auditoria/README.md). |
| `Utilidades.gs` | Texto, datas, trava e preparo da resposta para a página. |
| `GerenciadorApp.html` | Página principal. |
| `GerenciadorAppUI.html` | Comportamento da página (navegação, listas, detalhe, salvamento, nome no cabeçalho). |
| `AuditoriaHabilitacoesUI.html` | (2.1) Eventos da página para a auditoria, em lotes. |
| `GerenciadorEstilos.html` | Estilos com os tokens GRADIP. |
| `GerenciadorAjuda.html` | Conteúdo da Central de Ajuda. |
| `GerenciadorIcones.html` | Ícones Lucide (lucide-static 1.55.0, licença em [`LICENCA_ICONES.txt`](LICENCA_ICONES.txt)). |
| `GerenciadorSemAcesso.html` | Página de quem não tem acesso (sem dados). |
| `GradipTema.html`, `GradipTemaControle.html` | Cópias idênticas de `shared/`. |
| `GerenciadorAjudaEstilos.html`, `GerenciadorAjudaUI.html` | Cópias idênticas de `shared/ajuda/GradipAjudaEstilos.html` e `GradipAjudaUI.html`. |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas, iguais às do Painel dos servidores. |
| `appsscript.json` | Fuso `America/Sao_Paulo`, V8; Web App "Executar como: eu" e acesso **Qualquer pessoa da USP** (`DOMAIN`); quem entra é decidido pela aba de acesso. |
| `.claspignore` | Padrão do repositório. |

`testes/` (não vai para o Apps Script): [README](testes/README.md).

## Configuração (sem valores)

Script Properties: `ID_INDEX_SPREADSHEET_ID` (obrigatória) e `AMBIENTE` (só na cópia de homologação, valor `homologacao`). No `ID_INDEX`: `ABERTURA_HABILITACOES`, `PERMISSOES_DE_ACESSO` e, desde a 2.1, `AUDITORIA_ABERTURA_HABILITACOES`. Na planilha de permissões: aba `GERENCIADOR_HABILITACOES`. Passo a passo: [instalação e atualização](../../../docs/sistemas/abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md).

Nenhum ID de planilha, script ou implantação fica no código ou nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| v1.0 (substituída em 21/10/2026, fora do repositório) | ID da planilha literal no código; sem autorização no servidor; abrir a página atribuía Registro ID e Versão; nomes de alunos no registro de execução. SHA-256 `Codigo.gs` `a18648e8…3a765a`, `GerenciadorApp.html` `c20efee7…ba9758`. Cópia sanitizada para testes em `testes/baseline/`. |
| v2.0 (21/10/2026, implantada em 21/10/2026) | `ID_INDEX` e homologação; perfis LEITOR/ADMINISTRADOR conferidos no servidor; abrir a página não grava; migração expressa com código que identifica o plano; recuperação de um pedido; critério único de versão; recusas antes de gravar; reserva de envio com data e marca, confirmada só sobre ela; resultados distintos para e-mail que falhou e e-mail sem registro; interface GRADIP com menu lateral/abas e Central de Ajuda. Diferenças: [inventário do legado](../../../docs/sistemas/abertura-habilitacoes/INVENTARIO_LEGADO.md). |
| v2.1 (22/10/2026, não implantada) | Nome completo e observação de quem acessou no cabeçalho (colunas B e D da aba de acesso); auditoria completa no modelo do Painel dos servidores (acessos e recusas, navegação, consultas, buscas, ajuda, cada célula alterada com antes e depois, e-mail ao aluno, preparar pedido, migração, recuperação, manutenção), na planilha `AUDITORIA_ABERTURA_HABILITACOES`; gravação recusada se a auditoria não abrir. Nota: [`notas-de-versao/abertura-habilitacoes-gerenciador-v2.1.md`](../../../notas-de-versao/abertura-habilitacoes-gerenciador-v2.1.md). |
