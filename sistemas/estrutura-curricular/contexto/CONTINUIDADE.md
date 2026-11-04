# Continuidade — Estrutura Curricular

## Entrada sem conversa anterior

1. Leia as [instruções locais](../AGENTS.md) e as [instruções da raiz](../../../CLAUDE.md). Localize o projeto pelo catálogo vigente; não escolha por nome de pasta isoladamente.
2. Abra o [STATUS](../STATUS.md), o [sistema de contexto](CONTEXT_SYSTEM.md) e as [pendências](PENDENCIAS.md); recupere a última rodada no [índice de rodadas](RODADAS.md) **se pertinente à tarefa**.
3. Confira o HEAD do `main` e da branch de trabalho, os PRs pendentes (em especial o [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32), com corpo e comentários), a CI e a versão `VERSAO_SISTEMA` efetiva de [Codigo.gs](../src/Codigo.gs). Distinga **código no Git**, código no editor do Google (produção ou homologação), `/dev` e deployment `/exec`.
4. Use o [README técnico](../../../docs/sistemas/estrutura-curricular/README.md), o [modelo de dados](../../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md), os [contratos](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), a [arquitetura](../../../docs/sistemas/estrutura-curricular/ARQUITETURA.md) §7 (gravação e recuperação) e a [segurança](../../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md). Em OCR, leia a [proteção B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) (§7 e §9) e os testes sintéticos; em implantação, leia a [implantação](../../../docs/IMPLANTACAO.md) e os requisitos do PR #32. O [roteiro de homologação antigo](../../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md) é histórico (1.9.3).
5. Se envolver `GRADE_HORARIA_PREENCHIMENTO`, chaves `ID_INDEX` ou planilha vinculada, consulte o [mapa transversal](../../../docs/ARQUITETURA_GERAL.md) e a responsabilidade do produtor e dos consumidores.

## Precauções específicas

- A versão **1.13.0 no Git** não é prova de deploy. Segundo a A1 relatada no PR #32, o editor de produção tem o código da 1.12.0 com rótulo `1.11.3`; a homologação da 1.13.0 está PARCIAL/BLOQUEADA. Confira o estado atual do PR #32 e não mude seu HEAD congelado por suposição.
- **Homologação:** a Estrutura ignora `AMBIENTE`; só projeto separado com `ID_INDEX` fictício ([AGENTS local](../AGENTS.md)). Nunca apontar uma cópia para o `ID_INDEX` de produção.
- OCR B2 não garante F3, F4 e F7, roda só no navegador e convive com o limite de 100 avisos no servidor; não remover a conferência acadêmica nem afirmar eficácia real baseada só em fixtures.
- CI: só "CI concluída" é obrigatória. O diagnóstico `diagnostico-fontes.yml` é vermelho por desenho desde o PR #26 ([integração contínua](../../../docs/CI.md)); um vermelho ali não é aprovação, e uma mudança no resultado é achado a analisar.
- Não regravar registros de currículo, ajustar planilhas, enviar e-mail, alterar gatilho ou chamar `clasp` por causa de documentação. Ações assim precisam de autorização pontual, escopo e ambiente.
- Divergência entre documentos históricos e estado atual vira nota de proveniência/achado, **não** alteração silenciosa de um contrato antigo. O acervo privado antigo não é fonte obrigatória para operar esta aplicação.
- Não transportar material sensível para o Git público. Cuidado também com títulos de PR e mensagens de commit.

## Trabalho e saída

1. Definir objetivo, mudança autorizada e classe de risco; criar branch a partir do `main`, PR e revisão proporcional conforme a [governança](../../../docs/governanca/FLUXO_DE_MUDANCAS.md).
2. Salvar evidências de fontes, diff, testes executados e limitações. Não atribuir aprovação à própria implementação.
3. Após marco material, registrar **uma rodada da Estrutura** (prefixo `EC-ROD-`, trailer `EC-Round:`) com fonte SHA/PR, decisão humana existente ou estado não autorizado, resultado, pendências e próximo ato.
4. Atualizar os documentos afetados e as [pendências](PENDENCIAS.md); o [índice de rodadas](RODADAS.md); o [STATUS](../STATUS.md) **por último, se mudou**. Não inventar conversas ou decisões antigas.
5. Conferir links, política pública, CI, contexto prospectivo e entrega. Se não pôde gravar, `REGISTRO_PENDENTE` com os fatos e a proposta; se apenas leu, não gerar commit.

## Prontidão de adoção

Este conjunto está **no `main` desde 04/11/2026, com estado `ADOTADO`** desde a [rodada 006](rodadas/EC-ROD-20261104-006.md). O [Marco Zero](MARCO_ZERO.md) fixa a base; a entrada geral leva a este contexto, e o manifesto `context.config.json` foi criado na rodada 005. O teste a frio por outra IA que só recebeu o repositório passou, e o responsável fez o corte de autoridade: a referência é este repositório, e o acervo anterior fica congelado como histórico. Adotado não quer dizer completo: cada rodada nova continua sendo conferida com Git, PR e CI, e nada aqui muda Google ou código.
