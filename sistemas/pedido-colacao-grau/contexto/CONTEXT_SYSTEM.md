# Contexto local — Formulário de Pedido de Colação de Grau

- **Identificador:** `pedido-colacao-grau`
- **Protocolo desejado:** `context/v1`
- **Estado da preparação:** `PROPOSTA`
- **Corte documental:** 06/11/2026
- **Adoção e autoridade:** `NAO_ADOTADO`; não está no manifesto `context.config.json`

## Função

Permitir retomada por qualquer agente sem usar a conversa privada: localizar o legado analisado por hashes, ler o contrato de planilhas/anexos, saber que o código não é publicável como recebido e identificar riscos e próximos atos autorizáveis. Não serve como cópia concorrente da documentação de negócio nem como autorização para deploy.

## Fontes de verdade

| Assunto | Fonte |
| --- | --- |
| Normas gerais | [AGENTS](../../../AGENTS.md), [CLAUDE](../../../CLAUDE.md), [fluxo de mudanças](../../../docs/governanca/FLUXO_DE_MUDANCAS.md) |
| Estado documental proposto | [STATUS](../STATUS.md) |
| Origem e hashes | [inventário legado](../../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md) e [MARCO_ZERO](MARCO_ZERO.md) |
| Funcionalidade e campos | [fluxos](../../../docs/sistemas/pedido-colacao-grau/FLUXOS_E_REGRAS.md), [modelo](../../../docs/sistemas/pedido-colacao-grau/MODELO_DE_DADOS.md) |
| Fronteira com Gerenciador | [contrato](../../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md) |
| Segurança | [DADOS_E_SEGURANCA](../../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) |
| Pendências / última rodada | [PENDENCIAS](PENDENCIAS.md), [RODADAS](RODADAS.md) |

## Ciclo de atualização

Após alterações materiais e autorizadas, registrar evidências em rodada nova, atualizar documento canônico afetado e pendências, e ajustar STATUS por último. Nunca inventar teste, commit, implantação ou aceite. Históricos são fotografia com corte, não são reeditados retroativamente. O código original fornecido é privado e não obrigatório para compreensão dos contratos públicos, mas uma nova análise de código exige obter baseline novamente com autorização.

## Gate de adoção

Revisão documental independente, teste a frio, correção de links/afirmações e decisão humana expressa de tornar este contexto `ADOTADO`; só então atualizar `context.config.json`. Não pressupor que esse rito já ocorreu.
