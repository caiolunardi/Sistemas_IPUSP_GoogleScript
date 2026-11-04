# Continuidade — Estrutura Curricular

## Entrada sem conversa anterior

1. Leia as [instruções locais](../AGENTS.md) e as [instruções da raiz](../../../CLAUDE.md). Localize o projeto pelo catálogo vigente; não escolha por nome de pasta isoladamente.
2. Abra [STATUS.md](../STATUS.md), [CONTEXT_SYSTEM.md](CONTEXT_SYSTEM.md) e [PENDENCIAS.md](PENDENCIAS.md); recupere a última rodada em [RODADAS.md](RODADAS.md) **se pertinente à tarefa**.
3. Confira o HEAD da `main` e da branch de trabalho, PRs pendentes, CI e versão `VERSAO_SISTEMA` efetiva de [Codigo.gs](../src/Codigo.gs). Distinga **código no Git** de código no Google, versão do editor `/dev` e deployment `/exec`.
4. Use [README técnico](../../../docs/sistemas/estrutura-curricular/README.md), [modelo de dados](../../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md), [contratos](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md) e [segurança](../../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md). Em OCR, ler [B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) e os testes sintéticos; em implantação, leia [HOMOLOGACAO](../../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md) e [IMPLANTACAO](../../../docs/IMPLANTACAO.md).
5. Se envolver `GRADE_HORARIA_PREENCHIMENTO`, chaves `ID_INDEX` ou planilha vinculada, consultar [mapa transversal](../../../docs/ARQUITETURA_GERAL.md) e a responsabilidade do produtor e consumidores.

## Precauções específicas

- A versão **1.13.0 no Git** não é prova de deploy. Existe trabalho em PR separado sobre manifesto `appsscript.json`; conferir seu estado atual, não incorporá-lo por suposição.
- OCR B2 não garante F3, F4 e F7; não remover conferência acadêmica nem afirmar eficácia real baseada só em fixtures.
- Não regravar registros de currículo, ajustar planilhas, enviar e-mail, alterar trigger ou chamar `clasp` por causa de documentação. Ações assim precisam de autorização pontual, escopo e ambiente.
- Divergência entre documentos históricos e estado atual vira nota de proveniência/achado, **não** alteração silenciosa de um contrato antigo. O acervo privado antigo não é fonte obrigatória para operar esta aplicação.
- Não transportar material sensível para Git público. Cuidado também com títulos de PR e mensagens de commit.

## Trabalho e saída

1. Definir objetivo, mudança autorizada e classe de risco; criar branch a partir da `main`, PR e revisão proporcional conforme [governança](../../../docs/governanca/FLUXO_DE_MUDANCAS.md).
2. Salvar evidências de fontes, diff, testes executados e limitações. Não atribuir aprovação à própria implementação.
3. Após marco material, registrar **uma rodada da Estrutura** (prefixo `EC-ROD-`) com fonte SHA/PR, decisão humana existente ou estado não autorizado, resultado, pendências e próximo ato.
4. Atualizar documentos afetados e [PENDENCIAS.md](PENDENCIAS.md); [RODADAS.md](RODADAS.md); [STATUS.md](../STATUS.md) **por último, se mudou**. Não inventar conversas ou decisões antigas.
5. Conferir links, política pública, CI, contexto prospectivo e entrega. Se não pôde gravar, `REGISTRO_PENDENTE` com os fatos e a proposta; se apenas leu, não gerar commit.

## Prontidão de adoção

Este conjunto foi **preparado em PR, não aprovado como instância completa**. O [Marco Zero](MARCO_ZERO.md) fixa a base; ainda falta a aprovação da entrada geral no PR #33, a integração deste PR, o manifesto de caminhos/verificador e um **teste a frio independente recebendo só o repositório**, seguido de decisão humana de corte. Até lá, seu valor é como proposta verificável, sem mudar Google ou código.
