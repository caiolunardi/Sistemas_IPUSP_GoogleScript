# Manual de operação — versão documental

**Base:** leitura da UI e da Ajuda entregues em `Codigos.zip`. Não houve teste no navegador nem confirmação de ambiente implantado.

## Passo a passo

1. Abra a lista e **selecione a colação** do período pretendido.
2. Localize o aluno por busca/filtro ou adicione um registro; confira Nome, Nº USP, e-mail, RG e habilitações.
3. Na etapa **Dados Pessoais**, corrija informações, confirme e, quando necessário, abra/crie a pasta individual no Drive.
4. Anexe o **Histórico Escolar Completo** correspondente à habilitação. Não substitua por “Final” ou “Sujo”.
5. Na etapa **Histórico Escolar**, confira manualmente requisitos e, se usar a análise automática, leia o resultado completo e os motivos. A análise é consultiva.
6. Consulte a última sessão ou o histórico de análises; para documento individual/consolidado, confira a versão e os critérios já auditados.
7. Na etapa **Colação**, marque as habilitações que de fato tiveram colação realizada; só avance com requisitos completos.
8. Na etapa **Emissão de Diploma**, registre a emissão, emita certificado/ofício e comunique o aluno, quando apropriado.
9. Use **Devolver para...** antes de corrigir uma fase encerrada; a devolução pode invalidar passos posteriores.
10. Em lote, confira se os registros selecionados correspondem aos filtros atuais antes de enviar e-mails ou gerar ZIP.

## Dúvidas e falhas comuns

| Situação | Conferência |
|---|---|
| Aluno não aparece | Colação escolhida, filtro, cadastro, Registro ID |
| “Outra sessão alterou” | Recarregar a tela, revisar e salvar novamente; nunca contornar Versão |
| Não localiza pasta | Verificar cadastro central, conta do projeto, raiz e permissão |
| Histórico não encontrado | Tipo Completo, colação, nome e pasta |
| Dois históricos elegíveis | Eliminar ambiguidade; não escolher o primeiro |
| `CONFERIR` | Examinar arquivo, identidade, qualidade de extração e regras |
| Resultado antigo | Reabertura usa auditoria de então, não as regras de hoje |
| Falha de envio | Verificar status antes de reenviar para evitar duplicidade |
| Falha ao criar PDF | Sessão prévia, pasta, quota/DocumentApp e versionamento |

## Operação técnica — riscos

`doGet` tenta `migrarParaRegistroId_` quando identifica colunas/UUIDs faltantes: **abrir a página pode escrever na planilha**. Não homologar numa cópia ligada à produção. `migrarAnaliseHistoricoRelatoriosV1` é migração de esquema manual e distinta, não acionar sem autorização. `rodarTestesHistorico` contém testes puros e algumas **leituras reais** de rulesets/aba INFOS se executado no projeto institucional; criar ambiente isolado antes.

A versão implantada, acesso, configuração e manifesto **não foram verificados**.
