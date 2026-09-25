# Checklist UX — Sistemas IPUSP

Use esta lista antes de homologar qualquer alteração visual.

## Tema
- [ ] Preferência padrão é Sistema.
- [ ] `prefers-color-scheme` funciona.
- [ ] Claro manual funciona.
- [ ] Escuro manual funciona.
- [ ] Preferência manual persiste após reload.
- [ ] Voltar para Sistema volta a acompanhar o SO.
- [ ] Troca do SO com a página aberta atualiza apenas quando a preferência é Sistema.
- [ ] Falha de `localStorage` não quebra a aplicação.

## Marca
- [ ] Logo azul em fundo claro.
- [ ] Logo branca/negativa em fundo escuro.
- [ ] Sem filtros CSS na marca.
- [ ] Sem deformação ou corte.
- [ ] `alt` coerente.
- [ ] Falha de imagem não prejudica o restante do cabeçalho.

## Componentes
- [ ] Header.
- [ ] Cards.
- [ ] Botões.
- [ ] Links.
- [ ] Inputs.
- [ ] Selects.
- [ ] Textareas.
- [ ] Tabelas.
- [ ] Badges.
- [ ] Alertas.
- [ ] Loading.
- [ ] Modais.
- [ ] Central de Ajuda.
- [ ] Estados vazios.
- [ ] Estados de erro.
- [ ] Estados disabled.
- [ ] Hover.
- [ ] Focus-visible.

## Acessibilidade
- [ ] Contraste legível.
- [ ] Estado não depende só de cor.
- [ ] Navegação por teclado funciona.
- [ ] Foco é visível nos dois temas.
- [ ] Alvos de toque importantes têm aproximadamente 44 px.
- [ ] ARIA continua coerente.
- [ ] `prefers-reduced-motion` respeitado se houver transições.

## Responsividade
- [ ] 360 px sem overflow horizontal.
- [ ] 390 px sem overflow horizontal.
- [ ] 480 px sem overflow horizontal.
- [ ] 768 px sem overflow horizontal.
- [ ] Desktop sem regressão.
- [ ] Badges longos quebram corretamente.
- [ ] Header não expulsa botões da viewport.
- [ ] Modal/ajuda continua usável no mobile.

## Regressão funcional
- [ ] Nenhuma regra de negócio mudou.
- [ ] Nenhuma chamada `google.script.run` mudou sem necessidade.
- [ ] Nenhum ID/URL funcional foi alterado por acidente.
- [ ] Fluxos de envio continuam funcionando.
- [ ] Mensagens operacionais permanecem corretas.
- [ ] Backend permaneceu byte-idêntico quando a tarefa era somente visual.

## Relatório
- [ ] Lista de arquivos alterados.
- [ ] Lista de arquivos preservados.
- [ ] Evidência de testes.
- [ ] Limitações do ambiente declaradas.
- [ ] Nenhum teste visual foi alegado sem engine real de layout.
