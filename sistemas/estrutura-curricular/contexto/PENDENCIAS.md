# Estrutura Curricular — pendências verificáveis no Marco Zero

**Corte:** 2026-11-04. Os estados abaixo foram confrontados com o repositório público no `main@a8af8e4b49519640d23ded7f99cbe87749162fbf`, e com PRs abertos neste corte. **Não equivalem a autorização de trabalho.**

| Item | Situação e prova | Gate seguinte |
| --- | --- | --- |
| Homologação e publicação da versão 1.13.0 | `Codigo.gs` e [README](../../../docs/sistemas/estrutura-curricular/README.md) descrevem 1.13.0 no Git, não implantada; sem verificação Google neste corte | Ambiente de homologação isolado e autorização específica; testar HtmlService, importação, perfis, resultados e rollback |
| PDFs escaneados reais do Júpiter | Testes B2 43/43 e mutações 14/14 relatados e integrados à CI do PR #30; [limitações B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) | Conferência humana de documentos reais no ambiente autorizado; **não** incluir os arquivos no Git |
| Riscos OCR F3/F4/F7 | Erros não detectados por B2 em [PROTECAO_B2_OCR](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) | Manter conferência da prévia; mudança de algoritmo requer decisão de escopo e ensaios próprios |
| Manifesto do editor `appsscript.json` | [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32), **aberto**, classe crítica, independente deste contexto | Revisar e deliberar PR #32 conforme governança, sem incorporar ao Marco Zero por inferência |
| Documentos históricos com título antigo | [MANUTENCAO_E_CONTINUIDADE 1.10.0](../../../docs/sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md), [INSTALACAO_E_ATUALIZACAO 1.11.3](../../../docs/sistemas/estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md) | Avaliar futura errata/ponte editorial, preservando proveniência; não revisitar 1.13.0 por reflexo |
| Segurança, autenticação e perfil | [DADOS_E_SEGURANCA](../../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md) possui itens `A VALIDAR`; `Session.getActiveUser` pode ficar indisponível conforme implantação | Somente revisão com dados/ambiente autorizados; backend deve negar acesso se identidade não verificada |
| Etapa 5 / integridade de dependências | Plano de aperfeiçoamento futuro em [ETAPA4](../../../docs/sistemas/estrutura-curricular/ETAPA4_PDFJS_MIGRACAO.md) e testes; não concluído | Nova decisão específica; não bloquear a documentação do contexto |
| Contexto individual e general | [PR #33](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/33) preparou entrada geral; este PR prepara contexto local; ambos ainda dependem de revisão/merge | Aprovações específicas, depois manifesto de contexto e teste a frio sem chat prévio |

**B3 (alterações adicionais no tratamento OCR) não está autorizada por esta documentação.** Decisões de corrigir ou aceitar riscos acadêmicos dependem do responsável. CI sintética, PR verde e STATUS documental nunca comprovam a implantação.
