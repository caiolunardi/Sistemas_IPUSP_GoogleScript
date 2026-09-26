# Dados e segurança — Painel de Solicitações

**Revisão da fonte para Git:** 25/09/2026. O preflight de conteúdo foi realizado; o [checklist de segurança do ambiente e dos formulários](../../seguranca/SECURITY_CHECKLIST.md) continua dependente da configuração real.

## Escopo e dados

O painel é uma página de entrada para estudantes. Contém catálogo de formulários, categorias, janelas de abertura e preferência local de tema (`localStorage["gradip-theme"]`). A busca filtra a interface localmente. Não foram adicionados registros de alunos, fixtures reais ou capturas de produção. Os sete formulários vinculados tratam suas próprias solicitações e exigem análise separada.

| Recurso | Tipo / finalidade | Fonte no Git |
|---|---|---|
| ID_INDEX | Google Sheets; índice mestre de recursos | ID fora do Git em `Script Properties["ID_INDEX_SPREADSHEET_ID"]`; requer leitura pela identidade de execução. |
| PERIODOS | Chave do índice mestre | Linha única na primeira aba; A = `PERIODOS`, B = `spreadsheet`, C = ID de produção. A coluna D de homologação não é lida. |
| FORMULARIOS_ALUNOS | Sete Web Apps de destino | URLs `/exec` preservadas como links apresentados aos alunos; URL não concede autorização. |
| MARCA_USP_CLARA/ESCURA | PNG externo e SVG incorporado | Mesmo comportamento visual da v1.2. |

O código não contém o ID literal da planilha de períodos nem o ID da planilha mestre. Também não utiliza `DriveApp`: a leitura do índice ocorre via `SpreadsheetApp.openById` com valor mantido nas Propriedades do script. Script Properties não protege o valor de editores autorizados do projeto.

## Comportamento de falha e acesso

- Se a propriedade, a estrutura do índice, a linha `PERIODOS` ou o ID de produção faltar, o backend falha **antes** do `try/catch` que tolera problemas na planilha de períodos. Isso impede um catálogo todo aberto devido apenas a falha na resolução do índice.
- Falhas posteriores de acesso/leitura da planilha de períodos ainda seguem o comportamento `fail-open` existente no pacote aceito. Essa política requer revisão funcional própria se for alterada.
- Confirmar na implantação quem pode abrir o Web App, `executeAs`, acesso do usuário de execução às duas planilhas e permissões de cada formulário vinculado. O estado visual do card não substitui a validação do formulário de destino.

## Verificação e governança

A verificação local cobriu sintaxe, ausência de IDs literais, oito HTMLs idênticos ao ZIP e cenários simulados do índice; não acessou planilhas reais. Antes de implantar esta variante, cadastrar a propriedade, executar diagnóstico, testar no `/exec` e conferir a linha `PERIODOS` em produção sem publicar seu valor.

- Base legal e retenção: **A VALIDAR INSTITUCIONALMENTE**.
- Incidentes: seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional.
- A homologação da interface v1.2 original não atesta a integração do índice mestre.
