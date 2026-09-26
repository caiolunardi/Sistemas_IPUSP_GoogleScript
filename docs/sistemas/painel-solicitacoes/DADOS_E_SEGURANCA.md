# Dados e segurança — Painel de Solicitações

**Revisão da fonte para Git:** 25/09/2026. O preflight de conteúdo do pacote foi realizado para publicação do código; o [checklist de segurança do ambiente e dos formulários](../../seguranca/SECURITY_CHECKLIST.md) não está integralmente concluído.

## Escopo e dados

O painel é uma página de entrada para estudantes. Contém catálogo de formulários, categorias, janelas de abertura obtidas de uma planilha e uma preferência local de tema (`localStorage["gradip-theme"]`). O texto de busca filtra a interface localmente. Não foram adicionados dados de alunos, fixtures reais nem capturas de produção ao Git. Os formulários vinculados tratam suas próprias solicitações e exigem análise separada.

| Recurso | Tipo / finalidade | Estado da fonte no Git |
|---|---|---|
| PLANILHA_PERIODOS | Google Sheets; janelas de abertura | O ID literal foi retirado. `Codigo.gs` exige `Script Properties["PERIODOS_SPREADSHEET_ID"]` e bloqueia inicialização se faltar. |
| FORMULARIOS_ALUNOS | Sete Web Apps de destino | URLs `/exec` preservadas porque o próprio painel as fornece aos alunos. São links de navegação, não autorização. |
| MARCA_USP_CLARA | PNG institucional hospedado externamente | URL já entregue ao navegador na v1.2; disponibilidade deve ser conferida no ambiente real. |
| MARCA_USP_ESCURA | SVG institucional incorporado | Ativo de `assets/usp/`, sem busca ao GitHub em tempo de execução. |

A revisão do pacote encontrou **um ID de planilha literal**, removido da fonte versionada; não encontrou e-mails pessoais no código. Links públicos destinados aos alunos, URL institucional da imagem e URL do AccountChooser foram mantidos. Nenhum valor de `Script Properties` foi commitado. O pacote original com o ID literal não foi publicado no Git.

## Configuração e execução

O administrador da implantação precisa cadastrar `PERIODOS_SPREADSHEET_ID` nas Propriedades do script do **projeto Apps Script alvo**, com o valor pertinente ao ambiente. Não registrar o valor em issues, documentação ou logs. Script Properties evita o valor no Git, mas não é cofre contra editores autorizados do projeto.

**A validar na implantação:** quem pode abrir o Web App, identidade `executeAs`, permissões de leitura da planilha e compartilhamento. Os estados do card não garantem a autorização dos formulários de destino; cada backend deve validar acesso e período conforme suas regras. O código original tolera falhas de leitura da planilha assumindo formulários abertos; a cópia no Git bloqueia a inicialização se a propriedade estiver ausente, mas ainda exige monitoramento dos demais erros de acesso.

## Logs, testes e governança

`diagnosticarPeriodos()` registra os nomes e estados dos formulários para diagnóstico. Verificar sua execução e retenção de logs conforme regras institucionais. A verificação local da fonte Git cobriu sintaxe, diferença byte a byte, varredura de identificadores longos e leitura da propriedade com valor fictício/ausente. Não houve acesso à planilha real nesta rodada.

- Base legal e retenção: **A VALIDAR INSTITUCIONALMENTE**.
- Canal de incidentes: seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional vigente.
- Antes de implantar a versão do Git: validar propriedade, `executeAs`, acesso à planilha e disponibilidade real; repetir o smoke funcional/visual. A homologação de interface da v1.2 original não é uma homologação automática desta configuração sanitizada.
