# Implementação do tema GRADIP em Google Apps Script

Este documento descreve o contrato técnico para Light Mode / Dark Mode dos Web Apps IPUSP.

A implementação de referência está em:

`shared/GradipTema.html`

---

## 1. Arquitetura

O tema possui duas camadas:

1. **preferência** — `system`, `light` ou `dark`;
2. **tema resolvido** — `light` ou `dark`.

A preferência é salva em:

```text
localStorage["gradip-theme"]
```

O DOM recebe:

```html
<html data-theme="dark" data-theme-preference="system">
```

`data-theme` sempre contém o tema efetivamente renderizado.

`data-theme-preference` informa se o usuário escolheu Sistema, Claro ou Escuro.

---

## 2. Detecção do sistema

Usar:

```js
window.matchMedia("(prefers-color-scheme: dark)")
```

Quando a preferência for `system`, uma mudança do sistema operacional/navegador deve atualizar a interface sem recarregar.

---

## 3. Integração mínima

Copiar `shared/GradipTema.html` para o projeto Apps Script como:

```text
GradipTema.html
```

No HTML principal, incluir no `<head>`, cedo o suficiente para reduzir flash de tema incorreto:

```html
<?!= include_('GradipTema') ?>
```

O projeto precisa ter seu helper de include já existente, por exemplo:

```js
function include_(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}
```

Não duplicar helper se o projeto já usa outra função equivalente.

---

## 4. API pública

Depois de incluído:

```js
GradipTheme.getPreference()
GradipTheme.getResolvedTheme()
GradipTheme.setPreference("system")
GradipTheme.setPreference("light")
GradipTheme.setPreference("dark")
```

Evento disparado após mudança:

```js
document.addEventListener("gradipthemechange", (event) => {
  console.log(event.detail.preference);
  console.log(event.detail.theme);
});
```

---

## 5. Controle de interface

Exemplo simples:

```html
<select
  aria-label="Aparência"
  onchange="GradipTheme.setPreference(this.value)"
>
  <option value="system">Sistema</option>
  <option value="light">Claro</option>
  <option value="dark">Escuro</option>
</select>
```

Ao renderizar o controle, sincronizar seu valor com:

```js
GradipTheme.getPreference()
```

Pode-se usar botão/ciclo de tema, mas a interface deve permitir distinguir claramente "Sistema" de uma escolha manual.

---

## 6. Logo por tema

Padrão recomendado:

```html
<img
  class="gradip-logo gradip-logo-light"
  src="CAMINHO_LOGO_AZUL"
  alt="Instituto de Psicologia da USP"
>

<img
  class="gradip-logo gradip-logo-dark"
  src="CAMINHO_LOGO_BRANCO"
  alt="Instituto de Psicologia da USP"
>
```

O arquivo compartilhado já define:

```css
.gradip-logo-dark { display: none; }

[data-theme="dark"] .gradip-logo-light { display: none; }
[data-theme="dark"] .gradip-logo-dark { display: block; }
```

Se o projeto usa uma única `<img>` e trocar o `src` for menos invasivo, isso também é aceitável. Não aplicar filtros à marca.

---

## 7. Tokens

O `GradipTema.html` fornece tokens semânticos.

Exemplo:

```css
body {
  background: var(--gradip-bg);
  color: var(--gradip-text);
}

.card {
  background: var(--gradip-surface);
  border: 1px solid var(--gradip-border);
}

a {
  color: var(--gradip-link);
}
```

Não é necessário renomear todos os seletores existentes. Migre apenas valores de apresentação.

---

## 8. Sistemas legados com cores hardcoded

Há duas estratégias aceitáveis.

### Estratégia A — preferida
Substituir gradualmente cores literais por tokens.

### Estratégia B — transição
Adicionar overrides específicos:

```css
[data-theme="dark"] .cardAntigo {
  background: var(--gradip-surface);
  color: var(--gradip-text);
  border-color: var(--gradip-border);
}
```

Não usar uma regra genérica agressiva como:

```css
[data-theme="dark"] * {
  color: white !important;
}
```

Isso quebra hierarquia, estados e componentes.

---

## 9. Ordem de inclusão e flash

A resolução do tema deve ocorrer o mais cedo possível no `<head>`.

O arquivo de referência executa a leitura do tema imediatamente.

Evite esperar por:
- `window.onload`;
- chamada ao servidor;
- retorno de `google.script.run`.

Tema não depende de dados.

---

## 10. Segurança e privacidade

O tema:
- usa apenas `localStorage`;
- não contém dado pessoal;
- não envia preferência ao servidor;
- não precisa de cookie;
- não precisa de autenticação.

Se `localStorage` estiver indisponível, o fallback deve continuar funcional em modo Sistema.

---

## 11. Compatibilidade

A implementação de referência possui fallback para APIs antigas de `MediaQueryList`:

- `addEventListener("change", ...)`;
- `addListener(...)`, quando necessário.

O sistema não deve falhar se `localStorage` lançar exceção.

---

## 12. reduced motion

Transições de cor são opcionais.

Se adicionadas, respeitar:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
```

Evite transicionar propriedades de layout.

---

## 13. Testes obrigatórios

### Preferência
- storage vazio + SO claro → light;
- storage vazio + SO escuro → dark;
- preferência light + SO escuro → light;
- preferência dark + SO claro → dark;
- preferência system + mudança do SO → acompanha;
- preferência manual + mudança do SO → não acompanha até voltar para system.

### Persistência
Recarregar a página e conferir que Claro/Escuro permanecem.

### Falha de storage
Simular indisponibilidade e verificar fallback para Sistema.

### Visual
Validar os estados reais do projeto, não apenas a home.

### Regressão
Tema não pode alterar:
- payloads;
- chamadas server-side;
- validações;
- status;
- planilha;
- e-mails;
- regras de permissão.

---

## 14. Regra para agentes de código

Em tarefa exclusivamente visual, liste explicitamente os arquivos de backend que permaneceram byte-idênticos.

Se o projeto possuir Central de Ajuda em arquivos separados, ela também deve receber o tema, mas não deve ter seu conteúdo funcional reescrito apenas para suportar Dark Mode.
