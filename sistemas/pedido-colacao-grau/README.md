# Formulário de Pedido de Colação de Grau — entrada do aplicativo

**Estado:** versão **2.0.0 em PR** em [`src/`](src/) com [testes](testes/README.md): fonte reescrita, sem IDs (tudo pelo `ID_INDEX`), **não homologada nem implantada** ([recebimento 2.0](../../docs/sistemas/pedido-colacao-grau/RECEBIMENTO_2_0.md)). O legado (dois arquivos privados de 06/11/2026) continua fora do Git e em uso; a versão servida pelo Google segue **NAO_VERIFICADA**. Nenhum `.clasp.json` nem ID operacional no repositório.

**Este aplicativo é distinto** do [Gerenciador de Colação de Grau e Diplomas](../emissao-diplomas/README.md) e do módulo de configuração de períodos no Painel dos Servidores. É o ponto de entrada dos pedidos dos estudantes. Na próxima modernização, também será dono da experiência de **reutilização ou atualização dos anexos de colações anteriores**, segundo a decisão registrada — ainda não implementada.

## Fontes canônicas

- [Documentação funcional e técnica](../../docs/sistemas/pedido-colacao-grau/README.md).
- [Inventário de código legado](../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md), com hashes dos anexos sem sua publicação.
- [Modelo das planilhas e Drive](../../docs/sistemas/pedido-colacao-grau/MODELO_DE_DADOS.md).
- [Contrato com Gerenciador e anexos](../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md).
- [Riscos de segurança](../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) e [testes ainda pendentes](../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md).
- [STATUS.md](STATUS.md), [continuidade](contexto/CONTINUIDADE.md) e [pendências](contexto/PENDENCIAS.md).

## Fonte de código

`src/` é a 2.0, reescrita a partir dos originais (que continuam fora do Git por terem IDs e URLs operacionais). Testes em [`testes/`](testes/README.md), na CI exigida. Ausência do legado no Git **não** significa inexistência do app no Google.

## Atualizações futuras

Regras obrigatórias: [AGENTS local](AGENTS.md) → [AGENTS geral](../../AGENTS.md) → [CLAUDE](../../CLAUDE.md) → [governança](../../docs/governanca/FLUXO_DE_MUDANCAS.md). PR e implantação são gates independentes; nada de mudanças em dados reais/Drive ou `clasp` sem ordem específica.
