# Formulário de Pedido de Colação de Grau — entrada do aplicativo

**Estado:** inventário de legado documentado em 06/11/2026 a partir de **dois arquivos privados fornecidos pelo responsável**. Código atual **não versionado** neste repositório e versão efetivamente servida em Google **NAO_VERIFICADA**. Nenhum `src/`, `appsscript.json`, testes, `.clasp.json` ou ID operacional foi adicionado nesta rodada.

**Este aplicativo é distinto** do [Gerenciador de Colação de Grau e Diplomas](../emissao-diplomas/README.md) e do módulo de configuração de períodos no Painel dos Servidores. É o ponto de entrada dos pedidos dos estudantes. Na próxima modernização, também será dono da experiência de **reutilização ou atualização dos anexos de colações anteriores**, segundo a decisão registrada — ainda não implementada.

## Fontes canônicas

- [Documentação funcional e técnica](../../docs/sistemas/pedido-colacao-grau/README.md).
- [Inventário de código legado](../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md), com hashes dos anexos sem sua publicação.
- [Modelo das planilhas e Drive](../../docs/sistemas/pedido-colacao-grau/MODELO_DE_DADOS.md).
- [Contrato com Gerenciador e anexos](../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md).
- [Riscos de segurança](../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) e [testes ainda pendentes](../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md).
- [STATUS.md](STATUS.md), [continuidade](contexto/CONTINUIDADE.md) e [pendências](contexto/PENDENCIAS.md).

## Fonte de código

Os dois arquivos originais enviados em 06/11/2026 foram analisados, mas **não podem ser copiados integralmente ao Git**, pois trazem IDs/URLs de operação. O diretório `src/` deverá nascer somente depois de preflight de segurança, decisão sobre autorização e isolamento de homologação. Ausência de código no Git **não** significa inexistência do app no Google.

## Atualizações futuras

Regras obrigatórias: [AGENTS local](AGENTS.md) → [AGENTS geral](../../AGENTS.md) → [CLAUDE](../../CLAUDE.md) → [governança](../../docs/governanca/FLUXO_DE_MUDANCAS.md). PR e implantação são gates independentes; nada de mudanças em dados reais/Drive ou `clasp` sem ordem específica.
