# Instruções para Claude e outros agentes de código

Este repositório é a referência comum dos sistemas do Serviço de Graduação do IPUSP feitos em Google Apps Script.

## Antes de alterar qualquer interface

Leia obrigatoriamente:

1. `docs/UX_DESIGN_SYSTEM.md`
2. `docs/UX_COMPONENT_RECIPES.md`
3. `docs/THEME_IMPLEMENTATION.md`
4. `docs/UX_CHECKLIST.md`

Para projetos que usam o tema comum, leia também:

5. `shared/GradipTema.html`
6. `shared/GradipTemaControle.html`, se houver seletor de aparência na interface
7. `assets/ipusp/README.md`

Se a tarefa tocar Central de Ajuda, FAQ, guia do usuário, solução de problemas ou gatilhos `?`, leia também:

8. `docs/ajuda/README.md`
9. `docs/ajuda/HELP_ARCHITECTURE.md`
10. `docs/ajuda/HELP_CONTENT_MODEL.md`
11. `docs/ajuda/HELP_UX_ACCESSIBILITY.md`
12. `docs/ajuda/HELP_IMPLEMENTATION.md`
13. `docs/ajuda/HELP_SECURITY_PRIVACY.md`
14. `docs/ajuda/HELP_CHECKLIST.md`
15. `shared/ajuda/README.md`

## Fonte de verdade e precedência

Ao implementar ou revisar UX, use esta ordem:

1. requisitos funcionais e de negócio do sistema;
2. identidade institucional e ativos em `assets/ipusp/`;
3. `docs/UX_DESIGN_SYSTEM.md`;
4. `docs/THEME_IMPLEMENTATION.md`;
5. `docs/UX_COMPONENT_RECIPES.md`;
6. particularidades já homologadas do sistema.

Não "corrija" silenciosamente uma particularidade funcional ou editorial para fazê-la caber no design system. Quando houver conflito real, preserve o comportamento e registre a divergência para decisão humana.

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
- Em alertas e estados, use também os tokens de fundo e borda semânticos; não invente pastéis claros para o Dark Mode.
- O controle de tema, quando existir, deve exibir a **preferência** (`system`, `light`, `dark`), não apenas o tema resolvido naquele instante.
- Não use cor como único indicador de estado.
- Preserve `:focus-visible`, navegação por teclado e alvo de toque mínimo de aproximadamente 44 px para controles importantes.
- Teste 360, 390, 480, 768 px e desktop.
- Em tema escuro, prefira diferença de superfície + borda a sombras fortes.
- Evite preto puro como fundo principal; use os tokens GRADIP.
- Evite branco puro como texto geral; `#F7F3EF` é o foreground principal do dark mode.

## Regras específicas da Central de Ajuda

- Ajuda do usuário não é documentação técnica.
- O mecanismo deve ser client-side e estático sempre que o conteúdo não depender de dados em tempo real.
- Não adicionar `google.script.run` apenas para abrir, pesquisar, navegar ou expandir FAQ.
- Não expor IDs de planilha/Drive, URLs privadas, nomes internos de funções, chaves, IDs de implantação ou detalhes de arquitetura.
- Ajuda contextual deve abrir diretamente a seção pertinente, sem duplicar grandes blocos na tela principal.
- Busca deve ser tolerante a acentos e consultar **metadados de busca + texto visível**.
- FAQ usa controles reais e semânticos; `aria-expanded`/`aria-controls` refletem o estado.
- Modal de ajuda deve suportar ESC, focus trap, retorno de foco e bloqueio/restauração do scroll do `body`.
- Conteúdo explica o que fazer, o que esperar e como resolver problemas; não ensina o funcionamento interno do Apps Script.
- Quantidade de FAQs/problemas não é meta. Cobertura das dúvidas reais é o critério.
- Informações operacionais mutáveis não devem ser copiadas em vários lugares sem necessidade; duplicações inevitáveis devem ser conferidas na homologação.

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
- teste de contraste/legibilidade com critérios mensuráveis de acessibilidade;
- teste mobile;
- confirmação de ausência de regressão funcional.

Não substitua estas diretrizes por preferências estéticas próprias.
