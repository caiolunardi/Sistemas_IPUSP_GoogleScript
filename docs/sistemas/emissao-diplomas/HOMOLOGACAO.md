# Homologação — Gerenciador de Colação de Grau e Diplomas

## 4.0.0 (05/11/2026) — homologação parcial concluída em 06/11/2026 (commit `4792667`, com as correções da revisão independente); H7 e H8 dispensados

### Testes locais (sem Google)

| Suíte | Resultado | O que confere |
|---|---|---|
| `testar_acesso.js` | 39 ok | nenhuma referência à planilha vinculada; toda função pública com a conferência certa na 1ª linha; manifesto; página de ADMINISTRADOR, LEITOR e setor; sete casos de recusa (sem e-mail, fora da lista, coringa, perfil desconhecido, sem aba, sem ID_INDEX, títulos errados), sem dados nem e-mail no log; menor perfil para e-mail repetido; LEITOR recusado com `SO_LEITURA` em 13 funções antes de abrir a planilha; homologação lendo só a coluna Homologação |
| `testar_historico.js` | 484 de 486 | a suíte que já vinha no projeto (`rodarTestesHistorico`), rodada fora do Google; as 2 que não passam precisam da planilha real de Regras e falham igual na 3.x (conferido na linha de base `35e621e`) |
| `testar_navegador.js` | 21 ok | identificação no topo (centralizada, sem saudação, texto como texto), tema nos 4 casos, persistência e "Sistema" acompanhando o SO, faixa de homologação, ADMINISTRADOR x LEITOR, contraste ≥ 4,5:1 nos dois temas, 360/390/480/768/1280 px sem rolagem horizontal, Central de Ajuda, página sem acesso |

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

- Primeiro envio ao projeto HOMOLOGACAO pelo responsável (`clasp push`, commit `4f78198`); conferência por novo `clasp clone`: os 25 arquivos idênticos (SHA-256) aos de `src/`.
- H1: ok (faixa de homologação, conta do setor com nome e observação no topo, colação da cópia, tema escuro).
- H4: aba anônima sem conta → "Conta não identificada", sem dados. A implantação estava em "Qualquer pessoa" (sem login do Google); a lista de acesso barra do mesmo jeito.
- H3 (lista de colações): ok. H3 (detalhe do aluno): **falhou** — a área "Faça upload de um arquivo" aparecia para LEITOR (o envio era recusado no servidor). Corrigido na tela (a área não é criada para LEITOR); o teste de navegador passou a conferir isso e falha sem a correção. Precisa de novo `clasp push` e de repetir H3.
- Janela de espera ("Carregando aluno"): no tema escuro, a marca IPUSP ficava deslocada para a esquerda. Corrigido (marca centralizada); teste de navegador confere nos dois temas e falha sem a correção.
- **Aprovação do responsável (06/11/2026 15:59 UTC):** identidade visual e permissões aprovadas no projeto HOMOLOGACAO; H5–H8 (fluxo de negócio) não rodados, por decisão dele, porque as regras de negócio não mudaram em relação à 3.x (só a primeira linha de cada função pública, a guarda de perfil, e a planilha aberta pelo `ID_INDEX`). A homologação vale para o commit que estava no projeto; se o ramo mudar, vale só para esse commit.
- As correções `c65a03f` e `a002876` (só `DiplomasApp.html`) foram enviadas pelo responsável, que confirmou o envio de `a002876`; não houve nova conferência por hash depois delas.
- Capturas desta rodada mostram contas reais e ficam fora do repositório.

### Segunda rodada (06/11/2026, depois das correções da revisão)

- PR #42 no `main` (merge commit `4792667`; `src/` idêntico ao do commit `30cd51d`). Envio ao projeto HOMOLOGACAO pelo responsável (`clasp push --force` a partir do `main`); conferência por novo `clasp clone`: os 25 arquivos idênticos (SHA-256) aos de `src/`, sem diferença de fim de linha nem arquivo sobrando no projeto.
- H3: ok. Como LEITOR, o detalhe do aluno abre sem a área de upload, com os campos travados, e o botão Observações abre a janela sem salvar.
- H5: ok. Na aba `Diplomas` da cópia de homologação, o responsável apagou Registro ID e Versão de todas as linhas e abriu a página como ADMINISTRADOR; todas voltaram preenchidas (Versão = 1).
- H6: ok. Com as células vazias, a página aberta como LEITOR não preencheu nada; só a abertura seguinte como ADMINISTRADOR completou as células.

### Revisão técnica independente (06/11/2026) e correções

Parecer no PR #42 (revisor: ChatGPT, a pedido do responsável, commit `115efa1`). Correções no commit seguinte, com teste que falha sem elas:

- **B1** — `obterObservacoes` (consulta de LEITOR) chamava `garantirPastaInterno_`, que pode criar pasta no Drive, cadastrar o aluno na planilha central e gravar colunas. Agora o LEITOR usa `localizarPastaSemGravar_` (só leitura; sem pasta, observações vazias); o ADMINISTRADOR mantém o comportamento da 3.x.
- **C4** — teste novo: toda função pública com guarda de LEITOR é chamada como LEITOR, com e sem pasta, e não pode gravar em nenhuma planilha nem criar nada no Drive; o teste falha se surgir uma consulta nova sem entrar na lista.
- **B2 e C2** — a correção de Registro ID ao abrir regravava a faixa inteira (fórmulas de outras colunas virariam valor) e não persistia a Versão vazia quando os IDs estavam certos. Agora grava só as colunas Registro ID e Versão, e conta a Versão corrigida. Herdado da 3.x.
- **C1** — três registros de execução com nome, Nº USP ou ID saíram. Herdado da 3.x.
- **C3** — sem `AMBIENTE`, o código lê a produção. Antes de qualquer teste que grave, confira que a faixa "Ambiente de homologação" aparece no topo (ela só aparece com `AMBIENTE=homologacao`).
- **B3 e C5** — este documento passou a separar o que foi testado no Google, o que foi dispensado e o que falta.

Situação dos passos no Google:

| Passo | Situação |
|---|---|
| H1, H4 | feitos em 06/11 |
| H2, H9, H10 | visual aprovado pelo responsável em 06/11, sem registro passo a passo |
| H3 | ok em 06/11 depois das correções da revisão (`4792667`) |
| H5, H6 | ok em 06/11 com o código das correções (`4792667`) |
| H7, H8 | dispensados pelo responsável (regras de negócio sem mudança); limitação de cobertura, não aprovação funcional |

### O que falta

- Produção, cada passo com autorização do responsável: `clasp push` para o projeto PRODUÇÃO a partir do `main`, implantação, aba `EMISSAO_DIPLOMAS` da permissão de produção e troca do link no Painel dos servidores (feita por ele).
- Incluir as três suítes na CI (o ramo não altera `.github/workflows/`; ver o PR).
