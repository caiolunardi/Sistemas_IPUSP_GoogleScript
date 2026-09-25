# Instruções para Claude e outros agentes de código

Este repositório é a referência comum dos sistemas do Serviço de Graduação do IPUSP feitos em Google Apps Script.

## Antes de alterar qualquer interface

Leia obrigatoriamente:

1. `docs/UX_DESIGN_SYSTEM.md`
2. `docs/THEME_IMPLEMENTATION.md`
3. `docs/UX_CHECKLIST.md`

Para projetos que usam o tema comum, leia também:

4. `shared/GradipTema.html`
5. `assets/ipusp/README.md`

## Regras de implementação

- Não redesenhe a interface sem pedido explícito.
- Preserve fluxos, textos operacionais, IDs, regras de negócio e chamadas `google.script.run` quando a tarefa for visual.
- Mudança de Light/Dark Mode deve ser tratada como camada de apresentação.
- Tema padrão: **Sistema**.
- Preferências permitidas: `system`, `light`, `dark`.
- Persistência client-side: chave `localStorage["gradip-theme"]`.
- Não criar dependência de servidor para tema.
- Não usar filtro CSS para "recolorir" a marca IPUSP.
- Não inverter imagens globalmente.
- Use a marca azul em fundo claro e a marca branca/negativa em fundo escuro.
- Não introduza novas cores hardcoded se existir token semântico equivalente.
- Não use cor como único indicador de estado.
- Preserve `:focus-visible`, navegação por teclado e alvo de toque mínimo de aproximadamente 44 px para controles importantes.
- Teste 360, 390, 480, 768 px e desktop.
- Em tema escuro, prefira diferença de superfície + borda a sombras fortes.
- Evite preto puro como fundo principal; use os tokens GRADIP.
- Evite branco puro como texto geral; `#F7F3EF` é o foreground principal do dark mode.

## Regra de escopo

Em rodadas de tema/UX, backend deve permanecer byte-idêntico sempre que possível.

Se for necessário alterar backend, explique:
1. por que a mudança visual exige isso;
2. quais funções foram tocadas;
3. quais regressões foram testadas.

## Entrega esperada em mudanças visuais

O relatório deve informar:
- arquivos alterados;
- arquivos byte-idênticos;
- tokens usados;
- comportamento nos três modos;
- teste de preferência do sistema;
- teste de persistência manual;
- teste de mudança do sistema com a página aberta;
- teste de contraste/legibilidade;
- teste mobile;
- confirmação de ausência de regressão funcional.

Não substitua estas diretrizes por preferências estéticas próprias.
