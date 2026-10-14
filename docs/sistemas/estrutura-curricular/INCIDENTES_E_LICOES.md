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
| 14/10 — 1.10.0 em produção | depois de "Cadastrar nova grade", o painel não abria para ninguém ("erro inesperado"; registro: "Não é possível remover todas as páginas de um documento") | `recomecarPlanilha_` comparava abas com `!==`; no Apps Script cada `getSheets()` devolve objetos novos, então a aba vazia era apagada junto e a última aba era recusada; o recomeço ficava pendente e cada abertura repetia a falha. A mesma comparação deixava as abas de uma base nova em ordem invertida (`Esquema.gs`) e movia abas sem necessidade (`Gravacao.gs`) | 1.11.0 compara abas pelo `getSheetId()` (`posicaoDaAba_`); o simulador passou a devolver objetos novos (`ABAS_COMO_NO_GOOGLE`) e a recusar apagar a última aba; teste `testar_recomeco_google.js` |

## Lições registradas

1. o Sheets real possui comportamentos que simuladores precisam incorporar depois de observados;
2. operações destrutivas devem conferir dependências e fazer backup antes de apagar;
3. mensagens de erro precisam ser diagnósticas sem revelar IDs;
4. localidade e tipos de coluna de Tabelas são parte do contrato real;
5. instalação de acionadores/autorização não deve ser presumida apenas porque o código existe;
6. (1.11.0) objetos do Apps Script (abas, faixas) não têm identidade estável: compare abas pelo `getSheetId()`, nunca com `===`/`!==` ou `indexOf`.

Os incidentes são registros históricos recebidos, não novas ocorrências de produção nesta rodada. As revisões 1.8.x acrescentaram testes sintéticos de recuperação/concorrência/assinaturas; 1.9.1–1.9.3 corrigiram orientações da ajuda que presumiam conclusão integral. Na revisão 1.9.3 foi reproduzida falha de renomeação depois dos dados e fórmulas; a orientação atual reconhece que outras etapas do envio podem faltar. A 1.10.0 mantém essa correção. Ver [Verificação atual](VERIFICACAO_1_10_0.md) e [Continuidade](MANUTENCAO_E_CONTINUIDADE.md).
