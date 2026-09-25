# Checklist de homologação — Central de Ajuda

## Conteúdo
- [ ] Explica tarefas reais.
- [ ] Não inventa política/regra.
- [ ] Termos correspondem à interface.
- [ ] FAQ responde diretamente na primeira frase.
- [ ] Problemas distinguem causa possível de causa confirmada.
- [ ] Informações mutáveis foram comparadas com a fonte vigente.
- [ ] Cobertura relevante sem quota artificial de FAQs.
- [ ] Tom adequado ao público.

## Arquitetura
- [ ] Conteúdo, estilo e UI separados ou equivalentes.
- [ ] Abrir/pesquisar/FAQ não dependem de `google.script.run` sem necessidade.
- [ ] Regra de negócio não foi movida para a ajuda.

## Navegação e busca
- [ ] Botão global funciona.
- [ ] Gatilhos contextuais abrem a seção correta.
- [ ] Navegação interna funciona.
- [ ] Busca vazia restaura conteúdo.
- [ ] Busca ignora acentos/caixa.
- [ ] Busca usa `data-search` + texto visível.
- [ ] Contagem de resultados coerente.

## FAQ
- [ ] Perguntas usam `<button>`.
- [ ] `aria-expanded` acompanha estado.
- [ ] `aria-controls` aponta para painel existente.
- [ ] Chevron acompanha estado visual.
- [ ] Respostas legíveis em Light/Dark.

## Modal e acessibilidade
- [ ] `role="dialog"`/`aria-modal` coerentes.
- [ ] Título associado.
- [ ] ESC fecha.
- [ ] Focus trap funciona.
- [ ] Foco retorna ao gatilho.
- [ ] Scroll do body bloqueado/restaurado.
- [ ] Fechar e gatilhos contextuais têm alvo confortável.
- [ ] Foco visível.

## Responsividade
- [ ] 360 px sem overflow.
- [ ] 390 px sem overflow.
- [ ] 480 px sem overflow.
- [ ] 768 px sem regressão.
- [ ] Desktop sem regressão.
- [ ] Busca/fechar acessíveis no mobile.
- [ ] FAQ/atalhos sem corte.

## Tema
- [ ] Light correto.
- [ ] Dark correto.
- [ ] Troca de tema com ajuda aberta funciona.
- [ ] Sem paleta paralela quando existe token GRADIP.

## Segurança/privacidade
- [ ] Sem IDs internos.
- [ ] Sem URLs privadas.
- [ ] Sem dados pessoais reais.
- [ ] Sem stack trace/mensagem técnica crua.
- [ ] Contatos institucionais adequados.

## Regressão/evidência
- [ ] Ajuda não alterou fluxo principal.
- [ ] Backend byte-idêntico em rodada só de ajuda, salvo justificativa.
- [ ] `google.script.run` não foi alterado incidentalmente.
- [ ] Relatório lista arquivos alterados/preservados.
- [ ] Teste visual real só é alegado se realmente executado.
- [ ] Limitações do ambiente registradas.
