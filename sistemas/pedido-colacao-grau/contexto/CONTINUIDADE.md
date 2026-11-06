# Continuidade — Pedido de Colação de Grau

## Entrada a frio

1. Ler [AGENTS local](../AGENTS.md), [STATUS](../STATUS.md) e [normas gerais](../../../CLAUDE.md), sem usar memórias externas como substituto.
2. Confirmar `main`, PRs em aberto, CI e o estado operacional, sem confundir `/exec`, `/dev`, editor ou Git. O Formulário não tem código versionado até a data deste corte.
3. Abrir [inventário do legado](../../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md): hashes dos dois arquivos privados analisados. Não copiá-los para repositório público.
4. Ler [fluxos](../../../docs/sistemas/pedido-colacao-grau/FLUXOS_E_REGRAS.md), [modelo](../../../docs/sistemas/pedido-colacao-grau/MODELO_DE_DADOS.md), [contrato](../../../docs/sistemas/pedido-colacao-grau/CONTRATO_INTEGRACAO.md), [segurança](../../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) e [homologação](../../../docs/sistemas/pedido-colacao-grau/HOMOLOGACAO.md).
5. Identificar sistemas diferentes: formulário de alunos, Gerenciador de Diplomas 4.0 e configurador de períodos do Painel de Servidores. Conferir produtores/consumidores antes de alterar planilha compartilhada.
6. Conferir [pendências](PENDENCIAS.md) e a última rodada pelo [índice](RODADAS.md). Registrar hipótese como hipótese, nunca marcar código futuro como implementado.

## Limites específicos

- O legado usa referências literais a recursos privados, não `ID_INDEX`; não versionar arquivos recebidos até o preflight e a decisão de segurança.
- A configuração recomendada nos comentários do legado sobre dar edição de planilhas a alunos **não é um padrão aprovado para a reformulação**. A definição das permissões reais do projeto Google exige auditoria.
- Revisar titularidade do pedido no servidor e o acesso a anexos; não divulgar detalhes de exploração em PR público.
- O formulário hoje substitui anexos com nome coincidente **sem colação no nome**; reutilização e escolha de versão são somente requisitos futuros.
- `ScriptLock` não coordena com outro projeto Apps Script; não migrar arquivos ou colunas sem plano e autorização.
- `STATUS=PROPOSTA`, manifesto não atualizado, sem evidência de deploy, teste ou aceitação.

## Saída

Trabalhar em branch própria e PR, registrar arquivos e resultado de validação; nova rodada com estado, fonte, decisões e próximo ato. Sem testes/Google realizados, declarar `NAO_VERIFICADO`. Sem autorização para código/produção, concluir apenas a documentação.
