# STATUS — Formulário de Pedido de Colação de Grau

**Fotografia documental:** 06/11/2026, a partir da leitura dos dois arquivos enviados pelo responsável. **Não há código fonte deste formulário no Git nesta rodada.**

| Eixo | Estado | Evidência e limite |
| --- | --- | --- |
| Identificação do app | Formulário de Pedido de Colação de Grau, Web App de alunos | `Codigo(1).gs` e `ColacaoApp.html` fornecidos; [inventário](../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md) |
| Documentação técnica | **PREPARADA EM PR** | [docs específicas](../../docs/sistemas/pedido-colacao-grau/README.md), sem copiar arquivos brutos |
| Código sanitizado no Git | **AUSENTE** | Arquivos recebidos têm referências internas literais; revisão/preflight requerido |
| Autorização e proteção de dados | **REVISÃO CRÍTICA PENDENTE** | [segurança](../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) |
| Integração com Gerenciador 4.0 | **CONTRATO DOCUMENTADO** | [contrato](../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md); funcionamento real Google não testado |
| Reutilização/atualização de anexos | **REQUISITO FUTURO** | Decisão do responsável; legado substitui arquivos por nome |
| Testes locais e no Google | **NAO_EXECUTADOS** | [roteiro](../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md) |
| Implantação atual `/exec` | **NAO_VERIFICADA** | O responsável chamou os arquivos de atuais, mas editor/manifesto/deployment não foram conferidos |
| Contexto local | **PROPOSTA, NÃO ADOTADO** | [CONTEXT_SYSTEM](contexto/CONTEXT_SYSTEM.md); `context.config.json` não alterado |
| Próximo ato permitido | Auditoria documental e proposta de modernização | Código, Google e dados dependem de nova autorização e revisão de segurança |

**Proveniência:** repo `caiolunardi/Sistemas_IPUSP_GoogleScript`, base `main@479266728f3fce424e42483cfef70fcf5677dff4`; origem adicional: dois arquivos privados entregues em 06/11/2026, hashes no inventário. O [PR #43](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/43) documenta a fronteira vista pelo Gerenciador e é independente desta documentação. O [PR #45](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/45) registra informações operacionais do Gerenciador, não prova a implantação deste Formulário.

**Última rodada documental:** [PCG-ROD-20261106-001](contexto/rodadas/PCG-ROD-20261106-001.md). Esta fotografia é uma proposta versionada em branch, não uma declaração de integração ou adoção.
