# STATUS — Formulário de Pedido de Colação de Grau

**Fotografia:** 10/11/2026. Versão **2.0.0 em PR** (fonte reescrita, sem IDs) e **2.1.0 em PR empilhado** (tema GRADIP e Central de Ajuda); o legado continua fora do Git e em uso.

| Eixo | Estado | Evidência e limite |
| --- | --- | --- |
| Identificação do app | Formulário de Pedido de Colação de Grau, Web App de alunos | `Codigo(1).gs` e `ColacaoApp.html` fornecidos; [inventário](../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md) |
| Documentação técnica | **PREPARADA EM PR** | [docs específicas](../../docs/sistemas/pedido-colacao-grau/README.md), sem copiar arquivos brutos |
| Código sanitizado no Git | **2.0.0 EM PR** | `src/` reescrito; IDs só pelo `ID_INDEX`; [recebimento 2.0](../../docs/sistemas/pedido-colacao-grau/RECEBIMENTO_2_0.md) |
| Autorização e proteção de dados | **2.0: IMPLEMENTADA EM PR, revisão independente pendente** | [segurança](../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) |
| Integração com Gerenciador 4.0 | **CONTRATO DOCUMENTADO** | [contrato](../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md); funcionamento real Google não testado |
| Reutilização/atualização de anexos | **REQUISITO FUTURO** | Decisão do responsável; legado substitui arquivos por nome |
| Testes locais e no Google | **2.0: locais 79 + 66 ok; Google EM_ANDAMENTO (H1, H2, H4, H5, H7–H12 ok em 10/11/2026). 2.1: locais 79 + 198 ok; Google: roteiro G1–G8 pendente** | [roteiro](../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md) |
| Implantação atual `/exec` | **NAO_VERIFICADA** | O responsável chamou os arquivos de atuais, mas editor/manifesto/deployment não foram conferidos |
| Contexto local | **PROPOSTA, NÃO ADOTADO** | [CONTEXT_SYSTEM](contexto/CONTEXT_SYSTEM.md); `context.config.json` não alterado |
| Próximo ato permitido | Revisão independente e ok do responsável no PR da 2.0 | Homologação, `clasp`, planilhas e Drive dependem de ordem específica |

**Proveniência:** repo `caiolunardi/Sistemas_IPUSP_GoogleScript`, base `main@479266728f3fce424e42483cfef70fcf5677dff4`; origem adicional: dois arquivos privados entregues em 06/11/2026, hashes no inventário. O [PR #43](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/43) documenta a fronteira vista pelo Gerenciador e é independente desta documentação. O [PR #45](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/45) registra informações operacionais do Gerenciador, não prova a implantação deste Formulário.

**Última rodada documental:** [PCG-ROD-20261106-001](contexto/rodadas/PCG-ROD-20261106-001.md). Esta fotografia é uma proposta versionada em branch, não uma declaração de integração ou adoção.
