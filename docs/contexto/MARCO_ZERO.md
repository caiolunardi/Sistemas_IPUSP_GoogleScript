# Marco Zero documental — entrada geral GRADIP

- **Corte:** 2026-11-04, America/Sao_Paulo.
- **Escopo:** somente navegação e documentação geral, sem instalação de contextos individuais, sem `clasp`, alteração de apps, workflow, planilhas, dados ou implantação.
- **Baseline consultada:** `caiolunardi/Sistemas_IPUSP_GoogleScript@a8af8e4b49519640d23ded7f99cbe87749162fbf` (`main` antes deste PR).
- **Protocolo documental aplicado:** `context/v1`; ainda não houve execução do checker por app.
- **Mandato:** solicitação do responsável para criar o contexto geral e usar, como referência, documentação do repositório e acervo histórico, sem promoção automática de decisões antigas.
- **Redação:** ChatGPT GPT-6; não é revisão independente do próprio PR.

## Evidência do corte

A [árvore de código](../../sistemas/) continha **nove pastas de sistema** e o repositório **674 arquivos**; sistemas podem ter projetos Apps Script separados por formulário/gerenciador. Consultados [AGENTS](../../AGENTS.md), [CLAUDE](../../CLAUDE.md), [SISTEMAS](../SISTEMAS.md), [arquitetura](../ARQUITETURA_GERAL.md), [continuidade](../arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md), [governança](../governanca/FLUXO_DE_MUDANCAS.md), [CI](../CI.md), [segurança](../seguranca/REPOSITORIO_PUBLICO.md) e documentação pertinente.

A CI de push mais recente observada na baseline foi [40395963163](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40395963163), **success**, em 26/10/2026. Não é CI deste PR. PRs que estavam abertos no corte: [#27](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/27) (Dependabot), [#29](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/29) (documentação de Diplomas, não integrada) e [#32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) (manifesto da Estrutura Curricular). Trata-se de **fotografia histórica**, não índice vivo.

O acervo histórico de continuidade do GRADIP foi consultado para verificar diretrizes de apps separados, governança de PRs, provas por SHA e minimização de dados. **Nenhum conteúdo bruto, link privado ou identificador sensível foi copiado**, e seus checkpoints antigos não foram promovidos a estado atual.

## Decisão de arquitetura documental

A raiz disponibiliza [START_HERE](../../START_HERE.md), sem duplicar [SISTEMAS](../SISTEMAS.md). O [contexto geral](README.md) e a [continuidade](CONTINUIDADE.md) descrevem o processo, mas **não criam STATUS geral** nem reescrevem as decisões dos sistemas. `context.config.json` e o checker estrutural ficam deliberadamente para o primeiro app com contexto local completo: configuração vazia falharia, e configuração inventada seria enganosa.

## Próximo passo possível

Autorizar, em trabalho separado, o Marco Zero local da **Estrutura Curricular**, confrontando fonte, PR/CI, estado de homologação e autorização Google. Só depois registrar seu STATUS, continuidade e rodadas com teste a frio. Esta página não concede merge, alteração de dados ou deploy.
