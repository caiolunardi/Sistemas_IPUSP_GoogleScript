# Pendências — Formulário de Pedido de Colação de Grau

**Base:** inventário privado de 06/11/2026, ainda sem código versionado. Classificações são de triagem, não constatação dinâmica de exploração.

| ID | Prioridade | Pendência / evidência | Próximo gate |
| --- | --- | --- | --- |
| PCG-01 | **CRÍTICA** | Modelo de execução/compartilhamento do legado pressupõe contas de alunos com edição direta das planilhas institucionais | Verificar projeto real e desenhar mínimo privilégio; nenhuma ampliação de acesso |
| PCG-02 | **CRÍTICA** | Vínculo de identidade institucional com nº USP, pedido e anexos necessita revisão server-side | Revisão de segurança restrita + testes negativos isolados |
| PCG-03 | **ALTA** | Substituição automática de documentos entre colações por nome sem semestre, sem histórico de versão | Decisão sobre versionamento/proveniência + testes de coexistência |
| PCG-04 | **ALTA** | Gravação fracionada entre cadastro, Drive e Diplomas, sem recuperação transacional | Plano de consistência e concorrência entre projetos |
| PCG-05 | **ALTA** | Cabeçalhos criados sob demanda e correção de pedido sem gate das etapas administrativas | Compatibilidade de esquema/estado com Gerenciador 4.0 |
| PCG-06 | **ALTA** | Arquivos recebidos contêm URLs/IDs operacionais; nenhum manifesto/sanitização | Preflight, `ID_INDEX`, `AMBIENTE`, projeto de homologação |
| PCG-07 | **MODERADA** | Tema/ajuda/UX e orientação normativa/recibo ainda no modelo legado | Projeto visual GRADIP e aprovação editorial |
| PCG-08 | **ALTA** | Testes, fixtures e conformidade com runtime Google ainda não demonstrados | Suítes sintéticas, CI e homologação documentada |
| PCG-09 | **PENDENTE** | Originais não confrontados com editor/implantação `/exec` | Baseline do Google por fluxo autorizado e sem publicar identificadores |
| PCG-10 | **PENDENTE** | Contexto local está em proposta, não em `context.config.json` | Revisão independente, teste a frio e autorização de adoção |
| PCG-11 | **ALTA** | Decisão PCG-DEC-007: protocolo não pode ser bloqueado por falta de cadastro confirmado; legado não implementa fluxo provisório com verificação humana no Gerenciador de Pessoas | Definir armazenamento isolado, identidade/titularidade, protocolo/data original, fila no Gerenciador de Pessoas, retomada após aprovação, rejeição e testes de isolamento e prazo |

**Próxima decisão funcional:** confirmar como versionar/reutilizar documentos e como conferir que pertencem ao solicitante, sem alterar dados reais. Nenhuma pendência autoriza ações sobre recursos.
