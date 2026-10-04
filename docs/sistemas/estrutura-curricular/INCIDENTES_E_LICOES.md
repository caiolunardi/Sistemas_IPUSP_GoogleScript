# Incidentes e lições — Estrutura Curricular e Grade Horária

O histórico fornecido registra falhas reais que mudaram o desenho do sistema.

| Data / versão | Sintoma | Causa | Correção incorporada |
|---|---|---|---|
| 01/10 — 1.5.0 | pasta de backup não abria apesar do ID correto | nova autorização Drive ainda não concedida | 1.5.1 separou autorização de acesso e criou diagnóstico |
| 03/10 — 1.6.0 | envio parava depois de PSA | lista suspensa em M recusava fórmula | 1.6.1 remove validação de M antes de gravar |
| 03/10 — 1.6.1 | `setNumberFormat` falhava | coluna pertence a Tabela tipada | 1.6.2 deixou de mudar formato e passou a devolver texto |
| 03/10 — 1.6.2 | fórmula em M virava erro de análise | planilha pt_BR exige separador compatível com locale | 1.6.3 detecta locale, tenta separador alternativo e confere resultado |
| 03/10 — 1.6.3 | auditoria sem edições | acionador não havia sido instalado | ativação explícita e avisos melhores |
| 03/10 — 1.6.3 | horário auditado como fração decimal com vírgula | parser só reconhecia ponto | 1.6.4 aceita ponto/vírgula e converte para `HH:mm` |

## Lições registradas

1. o Sheets real possui comportamentos que simuladores precisam incorporar depois de observados;
2. operações destrutivas devem conferir dependências e fazer backup antes de apagar;
3. mensagens de erro precisam ser diagnósticas sem revelar IDs;
4. localidade e tipos de coluna de Tabelas são parte do contrato real;
5. instalação de acionadores/autorização não deve ser presumida apenas porque o código existe.

Esses incidentes serão usados como pontos de atenção na auditoria independente.
