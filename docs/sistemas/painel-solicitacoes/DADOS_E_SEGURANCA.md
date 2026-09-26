# Dados e segurança — Painel de Solicitações

**Revisão:** 25/09/2026. **Escopo:** inventário preliminar do pacote v1.2 recebido; revisão institucional e de implantação pendente.

## 1. Escopo

- Sistema: painel de entrada para estudantes.
- Ambiente: pacote associado à implantação `/exec` aceita visualmente; configuração exata da implantação não disponível neste registro.
- Responsável funcional: Serviço de Graduação do IPUSP; nomeação formal a validar.

## 2. Dados tratados

| Categoria | Finalidade | Origem e destino | Persistência | Classe |
|---|---|---|---|---|
| Catálogo de formulários e categorias | Exibir opções aos alunos | `Codigo.gs` → navegador | Código/configuração | Informação de serviço |
| Janelas de abertura | Informar disponibilidade | Planilha de períodos → backend → navegador | Planilha; retenção a validar | Operacional |
| Preferência de tema | Restaurar aparência | Navegador | `localStorage["gradip-theme"]` | Preferência local |
| Texto de busca | Filtrar cards | Navegador | Sem persistência identificada no painel | Entrada local |

O tratamento de dados pessoais ocorre nos formulários de destino e requer documentação própria. Não inferir que esses formulários compartilham o modelo de acesso do painel.

## 3. Recursos externos e configuração

| Nome lógico | Tipo | Configuração atual no pacote | Situação |
|---|---|---|---|
| PLANILHA_PERIODOS | Google Sheets | `PERIODOS_SPREADSHEET_ID` com valor literal | Migrar para configuração fora do Git antes de versionar backend |
| FORMULARIOS_ALUNOS | Web Apps vinculados | URLs `/exec` no catálogo | Decidir e documentar quais URLs são deliberadamente públicas aos alunos |
| MARCA_USP_CLARA | Imagem institucional externa | URL da imagem no frontend | Verificar disponibilidade e política de uso |
| MARCA_USP_ESCURA | SVG incorporado | Ativo do repositório central | Sem busca ao GitHub em runtime |

IDs e URLs operacionais não estão reproduzidos nesta documentação.

## 4. Web App e autorização

- Quem pode abrir e identidade de execução (`executeAs`): **A VALIDAR NA IMPLANTAÇÃO**.
- O painel consulta a planilha para obter períodos e entrega estados de disponibilidade ao cliente. Confirmar em revisão específica as permissões do recurso e a validação server-side dos parâmetros dos formulários de destino.
- O fato de um botão estar oculto ou de um card indicar indisponibilidade não deve ser tratado como autorização para os formulários vinculados.

## 5–8. Configuração, logs, acesso e testes

- Chave lógica proposta para a planilha: `PERIODOS_SPREADSHEET_ID`; usar Script Properties ou mecanismo institucional aprovado, sem valor no Git. A migração ainda não foi feita no pacote homologado.
- Revisar logs, mensagens de erro, permissões da planilha, herança de acesso e identidade de execução antes da incorporação do backend.
- Fixtures e capturas versionadas devem ser sintéticas ou revisadas para não conter dados pessoais nem IDs internos.

## 9–11. Governança e exceções

- Base legal e retenção: **A VALIDAR INSTITUCIONALMENTE**.
- Canal de incidente: seguir a orientação institucional vigente e [procedimento comum](../../seguranca/INCIDENTES.md).
- Exceção temporária de versionamento: o pacote operacional permanece fora deste Git até substituir o identificador literal, classificar as URLs e concluir revisão do modelo de acesso. Isso não desfaz a aceitação visual da v1.2.

## 12. Estado do checklist

O [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) está **pendente** para incorporação do código: identificador operacional literal, `executeAs` e permissões do recurso não foram validados. Não registrar como concluída a homologação de segurança.
