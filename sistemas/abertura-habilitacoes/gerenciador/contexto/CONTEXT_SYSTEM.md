# Gerenciador de Abertura de Habilitações — sistema de contexto

- **Sistema:** `abertura-habilitacoes-gerenciador`
- **Protocolo:** `context/v1`
- **Estado da adoção:** `PROPOSTA`
- **Corte:** `2026-11-04`

A memória local orienta a continuidade do **Web App da equipe**, não do Google Forms externo. Não substitui manuais, contratos ou o STATUS de outro sistema.

## Onde ficam as fontes de verdade

| Assunto | Fonte principal |
| --- | --- |
| Entrada e autorização | [comece aqui](../../../../START_HERE.md), [governança](../../../../docs/governanca/FLUXO_DE_MUDANCAS.md) |
| Código/testes | [src](../src/), [testes](../testes/README.md) — confrontar SHA e CI |
| Regras, dados, contratos externos | [regras](../../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md), [modelo](../../../../docs/sistemas/abertura-habilitacoes/MODELO_DE_DADOS.md), [arquitetura geral](../../../../docs/ARQUITETURA_GERAL.md) |
| Segurança e auditoria | [segurança](../../../../docs/sistemas/abertura-habilitacoes/DADOS_E_SEGURANCA.md), [auditoria](../../../../docs/sistemas/abertura-habilitacoes/AUDITORIA.md) |
| Versões e implantação documentada | [homologação](../../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md), [versões](../../../../docs/sistemas/abertura-habilitacoes/VERSOES_E_DECISOES.md), sem inferir `/exec` |
| Contexto e decisões | [status](../STATUS.md), [pendências](PENDENCIAS.md), [rodadas](RODADAS.md), [histórico](HISTORICO_E_PROVENIENCIA.md), [contexto geral](../../../../docs/contexto/README.md) |

## Como é alimentada

Somente por marcos materiais: decisão, contrato, risco, revisão, PR, homologação ou implantação. Após mandato e prova: rodada com origem/SHA → pendências e documentos canônicos afetados → índice → **STATUS por último, se mudou** → validações e handoff. Nada de commit ornamental. Sem escrita autorizada, `REGISTRO_PENDENTE`.

O [marco zero](MARCO_ZERO.md) e [índice histórico](HISTORICO_E_PROVENIENCIA.md) preservam a referência `GRADIP-ROD-20261021-001` e seus PRs públicos #16–#21, sem copiar originais restritos. A nova IA deve trabalhar com este repositório, sem chat nem acervo privado. Verificador estrutural não comprova veracidade, Google, revisão independente ou aprovação. `ADOTADO` exige teste a frio e decisão humana própria.
