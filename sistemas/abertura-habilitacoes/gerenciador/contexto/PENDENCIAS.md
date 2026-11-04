# Gerenciador de Abertura de Habilitações — pendências

Corte 2026-11-04, baseline `main@5b6aba0ccd4ef7036bc294df769f61fd41994553`. Nenhuma linha é mandato operacional.

| Tema | Evidência | Próximo gate |
| --- | --- | --- |
| Versão ativa do `/exec` | [homologação](../../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md) registra implantação v2.1 versão 7 em 22/10; não houve inspeção direta atual | Conferir em ambiente autorizado, sem publicar IDs |
| Homologação v2.1 | G1–G4 `ok` documentados; G5–G8 não registrados como executados naquela rodada | Decidir se fazer ensaios complementares; não chamar não execução de falha |
| Auditoria sem atomicidade | Planilha indisponível bloqueia escrita prévia, mas falha posterior do evento não desfaz alteração; registra termos de busca e observações | Preservar risco, validar retenção/base legal institucional |
| Forms e planilha | Mudança de perguntas pode deslocar J/K; aba `2021 - 2022` só leitura | Conferir esquema e testar em cópia antes de mudança |
| Contagem do Painel | K vazia é pendente no gerenciador, não contada pelo Painel ([contratos](../../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas)) | Decisão transversal e testes nos dois sistemas |
| E-mail, migração e rollback | Reserva protege incerteza de envio; voltar à 1.0 pode migrar ao abrir; [guia](../../../../docs/sistemas/abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás) | Não executar sem autorização e prova |
| Segurança/institucional | [dados e segurança](../../../../docs/sistemas/abertura-habilitacoes/DADOS_E_SEGURANCA.md) e [decisões](../../../../docs/sistemas/abertura-habilitacoes/VERSOES_E_DECISOES.md) mantêm itens `A VALIDAR` | Responsável funcional |
| Contradições editoriais | [README pai](../../README.md), [arquitetura](../../../../docs/sistemas/abertura-habilitacoes/ARQUITETURA.md) e abertura do [guia de instalação](../../../../docs/sistemas/abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md) trazem estado anterior; [homologação](../../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md) documenta fato posterior | Errata editorial separada, preservar história |
| Adoção do contexto | Local em `PROPOSTA`, sem aceite | CI, auditoria, teste a frio, corte humano |

Google Forms não ganha contexto com este PR; corte da Estrutura Curricular não implica adoção deste app.
