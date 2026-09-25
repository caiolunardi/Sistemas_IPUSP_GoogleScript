# Implementação técnica da Central de Ajuda

## 1. Arquivos no Apps Script

```text
Sistema.html
SistemaAjuda.html
SistemaAjudaEstilos.html
SistemaAjudaUI.html
```

Sistemas já homologados podem manter seus nomes atuais.

## 2. Inclusão

Carregar estilos no `<head>` e conteúdo/UI no `<body>` conforme o helper do projeto.

```html
<head>
  <?!= include_('GradipTema') ?>
  <?!= include_('SistemaAjudaEstilos') ?>
</head>
<body>
  ...
  <?!= include_('SistemaAjuda') ?>
  <?!= include_('SistemaAjudaUI') ?>
</body>
```

Não duplicar helper server-side se o projeto já possui equivalente.

## 3. Contrato de atributos

| Atributo | Função |
|---|---|
| `data-gradip-help-open` | abre a Central; valor opcional = ID de seção |
| `data-gradip-help-overlay` | overlay principal |
| `data-gradip-help-dialog` | diálogo |
| `data-gradip-help-close` | fecha |
| `data-gradip-help-search` | campo de busca |
| `data-gradip-help-search-status` | contagem acessível |
| `data-gradip-help-section` | seção navegável |
| `data-gradip-help-search-item` | unidade filtrável |
| `data-search` | sinônimos/termos adicionais |
| `data-gradip-help-target` | navegação interna |
| `data-gradip-help-faq-toggle` | botão de FAQ |

## 4. IDs de seção

Usar IDs estáveis e semânticos, como `ajuda-inicio`, `ajuda-prazos`, `ajuda-acesso`, `ajuda-problemas`, `ajuda-faq`. Evitar `secao-3`, pois a ordem pode mudar.

## 5. API pública client-side

```js
GradipHelp.open()
GradipHelp.open('ajuda-prazos')
GradipHelp.close()
GradipHelp.clearSearch()
```

A API é opcional; os atributos HTML bastam para o uso comum.

## 6. Busca

Normalização de referência:
```js
text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
```

O corpus é `data-search + texto visível`. Nunca tornar `data-search` uma alternativa que exclui o texto exibido.

## 7. FAQ

```html
<article data-gradip-help-search-item>
  <button type="button" data-gradip-help-faq-toggle aria-expanded="false" aria-controls="faq-resposta-1">
    Pergunta
  </button>
  <div id="faq-resposta-1" hidden>Resposta</div>
</article>
```

## 8. Gatilho contextual

```html
<button type="button" data-gradip-help-open="ajuda-acesso">? Problemas para acessar</button>
```

Não duplicar uma resposta longa ao lado do campo se a Central já contém a explicação completa.

## 9. Dependências

A referência usa HTML/CSS/JS nativos, sem framework, biblioteca ou Apps Script server-side para o mecanismo. Usa tokens de `GradipTema.html` com fallbacks visuais básicos.

## 10. Testes mínimos

- sintaxe JS;
- abertura global e contextual;
- botão fechar, ESC e overlay;
- focus trap e retorno de foco;
- scroll lock/restauração;
- busca com/sem acento;
- termo só em `data-search`;
- texto visível;
- FAQ;
- navegação interna;
- Light/Dark;
- mobile.

## 11. Migração de ajuda existente

Não reescrever conteúdo homologado só para adotar o mecanismo comum. Mapear estrutura, preservar fatos, alinhar modal/busca/FAQ, migrar estilos para tokens, adicionar ajuda contextual onde houver ganho e homologar regressão.
