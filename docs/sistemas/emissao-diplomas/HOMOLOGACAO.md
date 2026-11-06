# Homologação — Gerenciador de Colação de Grau e Diplomas

## 4.0.0 (05/11/2026) — NÃO HOMOLOGADA

### Testes locais (sem Google)

| Suíte | Resultado | O que confere |
|---|---|---|
| `testar_acesso.js` | 32 ok | nenhuma referência à planilha vinculada; toda função pública com a conferência certa na 1ª linha; manifesto; página de ADMINISTRADOR, LEITOR e setor; sete casos de recusa (sem e-mail, fora da lista, coringa, perfil desconhecido, sem aba, sem ID_INDEX, títulos errados), sem dados nem e-mail no log; menor perfil para e-mail repetido; LEITOR recusado com `SO_LEITURA` em 13 funções antes de abrir a planilha; homologação lendo só a coluna Homologação |
| `testar_historico.js` | 484 de 486 | a suíte que já vinha no projeto (`rodarTestesHistorico`), rodada fora do Google; as 2 que não passam precisam da planilha real de Regras e falham igual na 3.x (conferido na linha de base `35e621e`) |
| `testar_navegador.js` | 20 ok | identificação no topo (centralizada, sem saudação, texto como texto), tema nos 4 casos, persistência e "Sistema" acompanhando o SO, faixa de homologação, ADMINISTRADOR x LEITOR, contraste ≥ 4,5:1 nos dois temas, 360/390/480/768/1280 px sem rolagem horizontal, Central de Ajuda, página sem acesso |

Capturas: [evidencias/4.0.0](evidencias/4.0.0/README.md).

Limites: o Apps Script não roda aqui. Documentos, e-mails, Drive, leitura de PDF real e o comportamento de `Session.getActiveUser()` na implantação só se conferem no Google.

### Roteiro no projeto HOMOLOGACAO autônomo

Antes: código enviado da branch do PR, `AMBIENTE=homologacao`, aba `EMISSAO_DIPLOMAS` da permissão de homologação com as contas de teste (modelo em [dados-ficticios](dados-ficticios/README.md)) e a cópia da planilha de diplomas só com alunos fictícios.

| # | Passo | Esperado |
|---|---|---|
| H1 | Abrir o `/exec` de homologação com conta ADMINISTRADOR | faixa "Ambiente de homologação"; topo com nome e observação; colações da cópia |
| H2 | Mesma conta, Aparência: Claro, Escuro, Sistema; recarregar | tema muda e persiste; marca IPUSP azul no claro e branca no escuro |
| H3 | Conta LEITOR | faixa "Somente consulta"; sem adicionar, salvar, gerar, enviar, excluir; campos travados |
| H4 | Conta fora da lista | página "Sem acesso a este gerenciador", sem dados |
| H5 | ADMINISTRADOR: acrescentar à mão uma linha sem Registro ID na cópia e abrir a página | Registro ID e Versão preenchidos |
| H6 | LEITOR: mesmo caso de H5 | linha continua sem Registro ID |
| H7 | ADMINISTRADOR: fluxo de um aluno fictício nas 4 etapas (anexo, análise de histórico, certificado, e-mail de colação, ofício, e-mail de diploma) | igual à 3.x; a análise grava na `ANALISE_HISTORICO` da cópia de Regras |
| H8 | Ações em lote (ZIP, lista de formandos, análise em lote, relatório consolidado) | igual à 3.x |
| H9 | Central de Ajuda: "Acesso e perfis" e busca | conteúdo confere com a tela |
| H10 | Celular (largura de 390 px), claro e escuro | sem rolagem horizontal; topo legível |

### Registro da homologação (06/11/2026, responsável)

- Código enviado ao projeto HOMOLOGACAO pelo responsável (`clasp push`, commit `4f78198`); conferência por novo `clasp clone`: os 25 arquivos idênticos (SHA-256) aos de `src/`.
- H1: ok (faixa de homologação, conta do setor com nome e observação no topo, colação da cópia, tema escuro).
- H4: aba anônima sem conta → "Conta não identificada", sem dados. A implantação estava em "Qualquer pessoa" (sem login do Google); a lista de acesso barra do mesmo jeito.
- H3 (lista de colações): ok. H3 (detalhe do aluno): **falhou** — a área "Faça upload de um arquivo" aparecia para LEITOR (o envio era recusado no servidor). Corrigido na tela (a área não é criada para LEITOR); o teste de navegador passou a conferir isso e falha sem a correção. Precisa de novo `clasp push` e de repetir H3.
- Janela de espera ("Carregando aluno"): no tema escuro, a marca IPUSP ficava deslocada para a esquerda. Corrigido (marca centralizada); teste de navegador confere nos dois temas e falha sem a correção.
- Capturas desta rodada mostram contas reais e ficam fora do repositório.

### O que falta

- Rodar H1–H10 (responsável).
- Incluir as três suítes na CI (o ramo não altera `.github/workflows/`; ver o PR).
