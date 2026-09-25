# Arquitetura da Central de Ajuda

## 1. Separação em três camadas

```text
<Sistema>Ajuda.html          conteúdo e estrutura semântica
<Sistema>AjudaEstilos.html  apresentação
<Sistema>AjudaUI.html       comportamento client-side
```

Essa divisão permite atualizar texto sem misturar lógica, revisar acessibilidade sem tocar em regra de negócio e reaproveitar comportamento entre sistemas.

## 2. Conteúdo

Responsável por títulos, seções, atalhos, instruções, problemas comuns, FAQ, avisos editoriais e contatos públicos necessários. Não executa regra de negócio.

## 3. Estilos

Responsável por overlay, painel, navegação, busca, cards, FAQ, responsividade, foco/hover e Light/Dark Mode por tokens GRADIP. Não criar paleta paralela.

## 4. UI client-side

Responsável por abrir/fechar, ir para seção, busca, FAQ, ESC, focus trap, retorno de foco, scroll lock, ARIA e contagem de resultados. Não decide elegibilidade, período, status ou resultado de solicitação.

## 5. Zero backend para o mecanismo

Abrir, pesquisar, navegar e expandir FAQ devem funcionar sem `google.script.run`, planilha, Drive, autenticação adicional ou chamada externa. Conteúdo dinâmico é exceção explícita, não padrão.

## 6. Três níveis de orientação

1. **microcopy inline** — texto curto indispensável para a tarefa;
2. **ajuda contextual** — `?`, `Saiba mais` ou equivalente, abrindo a seção certa;
3. **Central de Ajuda** — visão completa, busca, problemas e FAQ.

A ajuda contextual aponta para o conteúdo central em vez de duplicá-lo.

## 7. Gatilho global

```html
<button type="button" data-gradip-help-open>Ajuda</button>
```

Deve ser botão real, acessível por teclado e com alvo de toque confortável.

## 8. Gatilho contextual

```html
<button type="button" data-gradip-help-open="ajuda-prazos">? Entenda os prazos</button>
```

A Central abre posicionada no assunto solicitado.

## 9. Estado local

Estados de aberta/fechada, seção, busca e FAQs expandidas são client-side e não precisam ser persistidos nem enviados ao servidor.

## 10. Tema

A ajuda usa os mesmos tokens da aplicação. Trocar Light/Dark com a Central aberta deve atualizá-la imediatamente.

## 11. Sistemas existentes

Não renomear arquivos e seletores estáveis só para igualar esta referência. O objetivo é convergência de comportamento, com migração incremental e preservação dos contratos homologados.
