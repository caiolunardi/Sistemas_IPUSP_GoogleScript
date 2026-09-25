# Receitas de componentes — GRADIP UI

Versão: 1.0 — 2026-09-25

Este documento transforma os tokens de `shared/GradipTema.html` em padrões práticos de implementação. Ele é referência para sistemas novos e para migrações graduais; **os nomes de classes não são obrigatórios**.

A regra principal é preservar a estrutura e a lógica já homologadas. Em sistemas legados, prefira trocar valores visuais por tokens antes de reescrever HTML.

---

## 1. Base da página

```css
body {
  background: var(--gradip-bg);
  color: var(--gradip-text);
}

a { color: var(--gradip-link); }
a:hover { color: var(--gradip-link-hover); }
```

Não crie uma segunda árvore DOM para o Dark Mode.

## 2. Cabeçalho institucional

```css
.headerSistema {
  background: var(--gradip-header-bg);
  color: var(--gradip-text);
  border-bottom: 4px solid var(--gradip-header-accent);
}
.headerSistema .subtitulo { color: var(--gradip-text-muted); }
```

Use duas variantes reais da marca:

```html
<img class="gradip-logo-light" src="LOGO_AZUL" alt="Instituto de Psicologia da USP">
<img class="gradip-logo-dark" src="LOGO_BRANCO" alt="Instituto de Psicologia da USP">
```

Não use `filter: invert()`.

## 3. Card/painel

```css
.card {
  background: var(--gradip-surface);
  color: var(--gradip-text);
  border: 1px solid var(--gradip-border);
  border-radius: 10px;
  box-shadow: var(--gradip-shadow);
}
```

No Dark Mode, a separação visual deve vir principalmente de superfície + borda. Não acrescente glow.

## 4. Botão primário

```css
.botaoPrimario {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--gradip-primary);
  color: var(--gradip-on-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.botaoPrimario:hover { background: var(--gradip-primary-hover); }
.botaoPrimario:focus-visible {
  outline: 3px solid var(--gradip-focus);
  outline-offset: 2px;
}
.botaoPrimario:disabled {
  background: var(--gradip-disabled-bg);
  color: var(--gradip-disabled-text);
  cursor: not-allowed;
}
```

## 5. Botão secundário

```css
.botaoSecundario {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--gradip-border-strong);
  border-radius: 8px;
  background: var(--gradip-surface);
  color: var(--gradip-text);
  font: inherit;
  cursor: pointer;
}
.botaoSecundario:hover { background: var(--gradip-surface-2); }
```

## 6. Ação destrutiva

```css
.botaoPerigo {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--gradip-danger);
  color: var(--gradip-on-danger);
  font: inherit;
  font-weight: 600;
}
```

A ação precisa continuar explicitamente rotulada como destrutiva; vermelho sozinho não basta.

## 7. Inputs, selects e textareas

```css
input, select, textarea {
  background: var(--gradip-input-bg);
  color: var(--gradip-input-text);
  border: 1px solid var(--gradip-border);
  border-radius: 8px;
  font: inherit;
}
input::placeholder, textarea::placeholder {
  color: var(--gradip-input-placeholder);
}
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 3px solid var(--gradip-focus);
  outline-offset: 1px;
}
```

Não remova o foco sem substituto. Teste autofill real do navegador quando o sistema tiver campos relevantes.

## 8. Alertas e caixas semânticas

Padrão: fundo sutil + borda + texto/ícone. O status deve estar escrito.

```css
.alerta { border: 1px solid; border-radius: 8px; padding: 12px 14px; }
.alerta--sucesso {
  background: var(--gradip-success-bg);
  border-color: var(--gradip-success-border);
  color: var(--gradip-success);
}
.alerta--aviso {
  background: var(--gradip-warning-bg);
  border-color: var(--gradip-warning-border);
  color: var(--gradip-warning);
}
.alerta--erro {
  background: var(--gradip-danger-bg);
  border-color: var(--gradip-danger-border);
  color: var(--gradip-danger);
}
.alerta--info {
  background: var(--gradip-info-bg);
  border-color: var(--gradip-info-border);
  color: var(--gradip-info);
}
```

Se o corpo do alerta tiver muito texto, é aceitável usar `var(--gradip-text)` no parágrafo e reservar a cor semântica para título, ícone e borda.

## 9. Badges/status

Badges devem combinar texto + cor. Em mobile, não force `white-space: nowrap` quando o status puder ser longo.

## 10. Tabelas

```css
.tabelaScroll { max-width: 100%; overflow-x: auto; }
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--gradip-surface);
  color: var(--gradip-text);
}
th { background: var(--gradip-surface-2); }
th, td { border-bottom: 1px solid var(--gradip-border); }
```

Não comprima colunas até tornar o conteúdo ilegível apenas para evitar scroll horizontal de uma tabela genuinamente larga.

## 11. Modal e Central de Ajuda

```css
.modalOverlay { background: var(--gradip-overlay); }
.modalPainel {
  background: var(--gradip-surface-elevated);
  color: var(--gradip-text);
  border: 1px solid var(--gradip-border);
  border-radius: 12px;
}
```

Tema não substitui requisitos do modal: focus trap, ESC, retorno de foco, scroll lock e semântica continuam independentes.

## 12. Controle de tema

A implementação reutilizável está em `shared/GradipTemaControle.html`. Ela deve ser incluída somente depois de `GradipTema.html`.

Se o sistema já possui um menu de configurações, é válido integrar a API `GradipTheme` ao controle existente em vez de inserir o componente compartilhado.

## 13. Responsividade

Testar 360, 390, 480, 768 px e desktop com engine real de layout quando disponível. Nenhum componente novo pode introduzir overflow horizontal involuntário.

## 14. Impressão

Dark Mode não deve ser assumido como estilo de impressão. Sistemas que possuam fluxo relevante de impressão devem definir e homologar `@media print` separadamente, normalmente com superfícies claras e sem o controle de tema.

Não force uma regra de impressão global em todos os Web Apps: relatórios e telas operacionais possuem necessidades diferentes.

## 15. Migração segura de sistema legado

1. inventariar cores hardcoded e seletores afetados;
2. incluir `GradipTema.html`;
3. migrar body/header/superfícies;
4. migrar texto/bordas/links;
5. migrar formulários;
6. migrar status/alertas;
7. migrar modal e Central de Ajuda;
8. adicionar controle de tema somente se fizer parte do escopo;
9. testar Light antes de considerar o Dark concluído;
10. executar regressão funcional.

Em rodada puramente visual, backend e contratos de dados devem permanecer byte-idênticos sempre que possível.
