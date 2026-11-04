# Homologação — Emissão de Diplomas

## Evidências de 23/10/2026

**Executado:** inventário do ZIP, leitura estática dos 17 módulos, mapeamento de fluxo, regras, planilhas e riscos. **Não executado:** Apps Script, `rodarTestesHistorico`, parser PDF.js em navegador, acesso ao deployment, qualquer mudança em Google Sheets/Drive, e-mails, uploads ou PDFs institucionais. Logo, **não homologado**.

## Roteiro para ambiente isolado

1. Confirmar manifesto, edição efetivamente implantada e configuração do projeto Google.
2. Criar planilhas/pastas de homologação sem dados reais; aba Diplomas com todos os cabeçalhos, INFOS, Alunos, Regras Curriculares e documentos inventados.
3. Com configuração apontando **somente** a cópias isoladas, verificar `doGet` e a criação idempotente de Registro ID/Versão.
4. Rodar `rodarTestesHistorico` em ambiente isolado; parte dos testes lê a planilha de regras e INFOS, portanto não apontar para produção.
5. Testar arquivo Histórico **Completo** com texto selecionável, PDF inválido, dois PDFs elegíveis, hash diferente, Nº USP/curso conflitante e permissões negadas.
6. Conferir `APTO`, `NAO_APTO`, `CONFERIR`, campos null, ruleset inexistente/múltiplo, Psicólogo+Bacharelado e Licenciatura não implementada.
7. Conferir sessão HMAC, auditoria append-only, abertura de histórico anterior sem recálculo e geração individual/consolidada de PDF (2–100 itens).
8. Testar concorrência Versão, uploads 15 MB/extensões perigosas, pasta fora da raiz, duplicidades, anexos e exclusões somente em cópia.
9. Testar e-mails individuais/lote com destinatários de teste, idempotência e simulação de erro.
10. Executar testes negativos de autorização: conta não autorizada, chamada direta ao servidor, função de migração administrativa e Registro ID forjado.
11. Registrar rollback e readback de dados sintéticos; sem publicação Google até autorização explícita.

| Caso sintético | Resultado esperado |
|---|---|
| Histórico não encontrado | CONFERIR, sem escolha arbitrária |
| Outro Nº USP no documento | Falha de reconciliação |
| Exigência incompleta | NAO_APTO ou CONFERIR segundo regra |
| Campo extraído ausente | CONFERIR, nunca zero inventado |
| Duas regras ativas | CONFERIR, não escolher primeira |
| Versão concorrente | Rejeitar mutação |
| Pasta inválida | Rejeitar acesso/escrita |
| Sessão HMAC inválida | Rejeitar avaliação |
| Pedido legítimo | Parecer consultivo; etapa não muda automaticamente |

A versão realmente implantada, taxa de falhas reais e controles de acesso **não foram validados**. Documentar achados antes de qualquer promoção.
