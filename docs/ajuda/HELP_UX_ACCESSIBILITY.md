# UX e acessibilidade da Central de Ajuda

## 1. Modal/painel

Requisitos: `role="dialog"`, `aria-modal="true"`, título por `aria-labelledby`, botão de fechar real e painel rolável sem fazer a página de fundo rolar.

## 2. Abertura e fechamento

Abre por botão global, gatilho contextual ou API client-side. Fecha por botão, ESC e opcionalmente clique no overlay. Ao fechar, devolver foco ao elemento que abriu a Central.

## 3. Focus trap

Enquanto o diálogo modal estiver aberto, Tab/Shift+Tab permanecem dentro dele.

## 4. Scroll lock

Ao abrir, guardar `document.body.style.overflow` e aplicar `hidden`. Ao fechar, restaurar exatamente o valor anterior.

## 5. Busca

Deve operar localmente, ignorar caixa, ser tolerante a acentos, pesquisar **texto visível + `data-search`**, anunciar quantidade de resultados em `aria-live` e não depender de backend.

Nunca usar `data-search || textContent`; termos extras não podem substituir o texto visível.

## 6. Navegação por seções

No desktop, índice lateral. No mobile, pode virar faixa horizontal/área acima do conteúdo. Ao navegar para uma seção, limpar filtro que impediria sua exibição.

## 7. FAQ

Pergunta = `<button>` real com `aria-expanded`, `aria-controls`, foco visível e alvo confortável. O painel tem ID estável. Chevron é decorativo; ARIA é fonte de verdade.

## 8. Ajuda contextual

Gatilhos pequenos visualmente ainda precisam de área de toque aproximada de 44 px. Não colocar `?` dentro de um label de modo que interfira com o campo; usar wrapper separado quando necessário.

## 9. Light/Dark

A Central usa tokens GRADIP, acompanha troca de tema aberta e no Dark privilegia superfície + borda em vez de sombra/glow.

## 10. Responsividade

Testar 360, 390, 480, 768 px e desktop: zero overflow involuntário, busca/fechar acessíveis, FAQ sem corte, atalhos quebrando linha e conteúdo alcançável até o fim.

## 11. Movimento

Animações opcionais e discretas; respeitar `prefers-reduced-motion`.
