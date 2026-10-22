# Versões e decisões — Gerenciador de Abertura de Habilitações

## Versões

| Versão | Data | Estado | Resumo |
|---|---|---|---|
| v1.0 | recebida em 21/10/2026 | substituída em 21/10/2026, fora do repositório | Pendentes, 10 concluídos, busca no histórico (com 2021–2022), detalhe, observações, concluir/reabrir, aviso por e-mail com reserva, relatórios. ID da planilha no código, sem autorização no servidor, migração de IDs a cada visita, nomes de alunos no registro. |
| v2.0 | 21/10/2026 | implantada em 21/10/2026 (versão 6), homologação parcial | Mesmas funções; `ID_INDEX` com homologação; perfis no servidor; abrir a página não grava; migração expressa com código que identifica o plano; recuperação de um pedido; critério único de versão; recusas antes de gravar; reserva com data e marca, confirmada só sobre ela; resultados distintos para falhas de e-mail; interface GRADIP e Central de Ajuda. Nota: [`notas-de-versao/abertura-habilitacoes-gerenciador-v2.0.md`](../../../notas-de-versao/abertura-habilitacoes-gerenciador-v2.0.md). Sem tag nem Release. |
| v2.1 | 22/10/2026 | **não homologada, não implantada** | Nome e observação de quem acessou no cabeçalho; [auditoria](AUDITORIA.md) completa no modelo do Painel dos servidores, com gravação recusada se a auditoria não abrir. Nota: [`notas-de-versao/abertura-habilitacoes-gerenciador-v2.1.md`](../../../notas-de-versao/abertura-habilitacoes-gerenciador-v2.1.md). |

Diferenças item a item: [INVENTARIO_LEGADO.md](INVENTARIO_LEGADO.md).

## Decisões tomadas na 2.0 (técnicas)

| Decisão | Motivo |
|---|---|
| Planilhas pelo `ID_INDEX` (`ABERTURA_HABILITACOES`, `PERMISSOES_DE_ACESSO`), falha fechada, `AMBIENTE=homologacao` | Padrão do repositório; repositório público; homologação sem tocar a produção |
| Autorização no servidor com lista em planilha | A 1.0 não tinha nenhuma; mesmo formato do Painel dos servidores |
| `doGet` não grava; migração em três passos com confirmação | Visitas não devem alterar dados; alteração em lote só com conferência e cópia de segurança |
| Recusas antes de gravar; versão obrigatória; reserva com data; resultados `FALHOU` e `ENVIADO_SEM_REGISTRO` | Problemas demonstrados por teste na 1.0 |
| Observações acima de 2.000 caracteres recusadas, não cortadas | Evitar perda silenciosa de texto |
| Busca sem diferença de acentos | Problema de uso demonstrável; não muda listas nem relatórios |
| Colunas novas sempre depois de K | Evitar ocupar J/K numa planilha com colunas vazias |
| Mensagens de erro técnicas genéricas na página | Não expor detalhes internos |
| Sem auditoria em planilha, sem gatilho (2.0) | Exigiam recursos novos ou ações proibidas naquela tarefa. Substituída na 2.1 |
| Código de confirmação da migração com impressão digital do plano (SHA-256 de posições, identificação, ID, Versão e operações de cada linha com Nome), em vez de só contagens | Auditoria de 21/10/2026: com as mesmas contagens, linhas trocadas ou substituídas passavam pela confirmação |
| Data do envio gravada só sobre a reserva do próprio salvamento (marca aleatória na reserva); se a célula mudou, nada é gravado e o e-mail não é reenviado | Auditoria de 21/10/2026: a confirmação apagava alterações feitas durante o envio |
| Contrato único de Versão (inteiro ≥ 1); ausente ou malformada bloqueia o pedido; migração e Preparar pedido só preenchem a vazia | Auditoria de 21/10/2026: critérios diferentes entre leitura, salvamento e migração; a 1.0 trocava valores ruins por 1 sem avisar |
| Recuperação administrativa de uma linha, com diagnóstico, código, escolha humana da linha e registro manual, em vez de correção automática de ID fora do formato e de repetidos | Auditoria de 21/10/2026: não há como saber, pelo código, qual pedido é o "certo" num ID repetido nem o que um valor digitado significava |
| Migração grava só as células do plano, em blocos de linhas seguidas; falha no meio é `GRAVACAO_PARCIAL` | Auditoria de 21/10/2026: regravar as colunas inteiras trocava fórmulas por valores e mexia em linhas fora do plano |
| Volta à 1.0 condicionada a diagnóstico limpo, sem reservas, cópia de segurança e acesso "Somente eu" durante a troca | A 1.0 roda a migração automática a cada visita |

## Decisões tomadas na 2.1

| Decisão | Motivo |
|---|---|
| Cabeçalho mostra nome (B) e observação (D) de quem acessou, lidos pelo servidor; sem nome, o e-mail | Pedido do responsável (22/10/2026) |
| Auditoria com o núcleo `Auditoria.gs` sem mudança, agora em `shared/auditoria/` e conferido pela verificação de cópias | Um núcleo só para os sistemas auditados |
| Gravação recusada se a planilha da auditoria não abrir; consultas nunca bloqueadas | Mesma regra aprovada para o Painel dos servidores (decisão 1) |
| Consultas que mostram pedidos (listas, detalhe, busca, relatório) gravadas pelo servidor; o pedido identificado pelo Registro ID, sem nome nem Nº USP do aluno | A página não consegue esconder uma leitura; não duplicar dados de alunos na auditoria |
| Funções públicas embrulham as internas `…SemAuditoria_` | Nenhuma gravação escapa do registro; o teste de funções públicas impede atalho |

## Decisões pendentes

Precisam de validação humana (responsável pelo Serviço de Graduação ou instância institucional). Até lá, a 2.0 usa a opção provisória indicada.

| # | Pergunta | Opção provisória da 2.0 | Onde muda |
|---|---|---|---|
| 1 | Quem tem acesso e com qual perfil? Os perfis LEITOR/ADMINISTRADOR servem? | Lista vazia até o responsável preencher; dois perfis como proposta | aba `GERENCIADOR_HABILITACOES`; `Acesso.gs` |
| 2 | Com que acesso o Web App será implantado ("Somente eu", "Qualquer pessoa da USP")? | **Decidido (21/10/2026):** `DOMAIN` (Qualquer pessoa da USP), com a lista da aba conferida no servidor | `appsscript.json` |
| 3 | Reabrir deve limpar a Data de Conclusão? | Mantém (como na 1.0) | `Salvamento.gs` |
| 4 | Concluir de novo deve trocar a Data de Conclusão? | Mantém a original (a 1.0 trocava) | `Salvamento.gs` |
| 5 | Quando rodar a migração em lote na produção, e se pedidos novos devem ganhar ID por gatilho do Forms | Sem gatilho; **Preparar pedido** por linha e migração expressa | `Migracao.gs`; gatilho novo |
| 6 | Unificar o critério de pendência com o Painel dos servidores (K vazia conta?) | Nenhum dos dois sistemas mudado | os dois sistemas |
| 7 | Registrar quem concluiu, reabriu ou avisou (auditoria)? | **Decidido (22/10/2026):** sim, tudo, no modelo do Painel dos servidores (2.1); detalhes a confirmar na [seção 5 de AUDITORIA.md](AUDITORIA.md#5-escolhas-a-confirmar-pelo-responsável) | `AuditoriaHabilitacoes.gs`; chave `AUDITORIA_ABERTURA_HABILITACOES` |
| 8 | O texto do e-mail está aprovado? Deve mencionar algo mais? | Texto da 1.0, sem mudança | `Salvamento.gs` |
| 9 | Critérios dos relatórios (múltipla seleção conta em cada; total inclui concluídos e pendentes) | Os da 1.0 | `Pedidos.gs` |
| 10 | Base legal, retenção das abas (atual e 2021–2022) e das cópias de segurança | A VALIDAR INSTITUCIONALMENTE | — |
| 11 | Títulos reais das colunas e da aba `2021 - 2022`; `Tipo` da chave no `ID_INDEX` | Os do código da 1.0; não conferidos | homologação (`diagnosticarPlanilha`) |
| 12 | Proteger as colunas do gerenciador contra edição manual? | Não | planilha |
| 13 | O que fazer com a 1.0 enquanto a 2.0 não é implantada (restringir o acesso da implantação?) | Nada alterado | implantação da 1.0 |
