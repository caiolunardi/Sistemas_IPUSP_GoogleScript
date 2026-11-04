# Próxima etapa — plano de migração de planilha legada

**Estado:** plano preliminar; nenhum script criado, nenhuma planilha alterada. Migração real é **risco crítico** e terá PR/autorização próprios.

Há referência anterior de migração de respostas do formulário de colação para a base Diplomas, com conciliação pela planilha de Alunos, relatório prévio e anexos. O código executável dessa migração **não integra os 17 arquivos recebidos**. As duas funções de migração encontradas no backend são de **esquema interno**, não de transferência de pedidos entre planilhas.

## Fluxo de implementação proposto

1. **Parâmetros:** confirmar origem, destino, cabeçalhos/abas, período e correspondência campo a campo; IDs só em configuração externa ao repositório.
2. **Dry-run:** ler origem/destino sem escrita; validar cabeçalhos, duplicidades, dados faltantes, aluno encontrado, informações divergentes, anexos inacessíveis, pedidos já existentes; gerar contagem e relatório de impedimentos, sem dados pessoais no Git.
3. **Decisão:** apresentar relatório antes de qualquer escrita. Correspondência ambígua exige decisão humana, não heurística silenciosa.
4. **Migração idempotente:** chave estável da resposta original + pedido, não apenas nome; impedir duplicação por reexecução, usar lock/lotes, registrar progresso e retomada após falha.
5. **Pastas/arquivos:** verificar vínculo central; não duplicar pasta por colação, preservar anexos válidos e registrar arquivos ausentes sem falhar silenciosamente; considerar que Drive e Sheets não compartilham transação.
6. **Reconciliação:** conferir lidos, elegíveis, já existentes, gravados, recusados e pendentes. Guardar backup controlado e plano de recuperação, nunca apagar a origem na primeira execução.

**Falta definir:** qual planilha antiga é a nova origem, formato/campos reais do destino, regras para atualizar vs. inserir, e limites para movimentar anexos. Não há autorização para executar migração real nem para modificar o código de produção.
