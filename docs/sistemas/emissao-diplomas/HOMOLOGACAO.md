# Homologação — Gerenciador de Colação de Grau e Diplomas

## 4.1.0 (10/11/2026) — em PR sobre a 4.0.1, não enviada ao Google

Testes locais: `testar_encaminhador.js` 22 ok (novo), `testar_acesso.js` 40 ok, `testar_integridade.js` 20 ok, `testar_navegador.js` 23 ok, `testar_historico.js` ok (as 2 de sempre aceitas pelo nome). Na integridade, o teste do autocadastro virou o teste do D6 (sem cadastro na central, nada é criado) e o do autocadastro simultâneo saiu, porque o autocadastro não existe mais. Contrato e motivos: [ENCAMINHADOR_COLACAO.md](ENCAMINHADOR_COLACAO.md).

| Suíte | O que confere na 4.1.0 |
|---|---|
| `testar_encaminhador.js` | inclusão com a linha inteira e os documentos movidos (mesmo ID); segunda execução sem nada novo; retomada depois de um bloqueio resolvido; `RECEBENDO` não entra; `PENDENTE` espera, `APROVADO` entra com o Nº USP decidido, `REJEITADO` não entra; cada bloqueio (sem cadastro, Nº USP repetido na central, Registro ID repetido ou divergente, duplicidade na colação, coluna ausente, documento fora da entrada, dados ilegíveis), sem gravar na aba `Diplomas`; correção aplicada só nas colunas do aluno e retida com o status preenchido; `BLOQUEADO` repetido sem linha nova; pendências sem IDs; LEITOR recusado; origem `GATILHO` só no contexto do dono; trava ocupada; vários pedidos numa execução; nenhum dado pessoal no registro de execução |
| `testar_acesso.js` | as funções do editor e do gatilho recusam quem abre a página, mesmo ADMINISTRADOR |
| `testar_navegador.js` | faixa de pendências do ADMINISTRADOR (nome como texto, contraste nos dois temas); LEITOR não dispara o encaminhador |

Roteiro no projeto HOMOLOGACAO, depois de autorização para o `clasp push` e com o formulário 2.x de homologação gravando na cópia de `PEDIDOS_COLACAO`. Preparação: chaves `PEDIDOS_COLACAO` e `PASTA_PROVISORIOS_COLACAO` com o ID de homologação no `ID_INDEX` (as mesmas do formulário); rodar `prepararEncaminhamentosColacao` pelo editor (pede a autorização nova do Drive e dos gatilhos); linhas de [dados fictícios da 4.1.0](dados-ficticios/README.md#410--encaminhador-roteiro-e1e11-do-homologacaomd).

| # | Passo | Esperado |
|---|---|---|
| E1 | Aluno fictício com cadastro envia um pedido pelo formulário; ADMINISTRADOR abre o Gerenciador | linha nova na colação com os dados do pedido e o "Status — Dados Pessoais" vazio; documentos na pasta do aluno; `ENCAMINHADO` em `ENCAMINHAMENTOS`; o formulário mostra "Em análise pela equipe" |
| E2 | Abrir de novo | nada muda; nenhuma linha nova em `ENCAMINHAMENTOS` |
| E3 | O aluno corrige o pedido; abrir | dados corrigidos na mesma linha, Versão +1, `ENCAMINHADO` com `CORRECAO_APLICADA` |
| E4 | Preencher o "Status — Dados Pessoais"; o aluno corrige de novo; abrir | linha sem mudança; `CORRECAO RETIDA`; faixa com o pedido; o formulário mostra "Correção em conferência" |
| E5 | Pedido de 9000201 (conta sem cadastro: o formulário protocola como `PENDENTE`); abrir | nada na aba `Diplomas`, nada em `ENCAMINHAMENTOS`, nenhuma faixa: espera a decisão do cadastro |
| E6 | Digitar `APROVADO` para esse protocolo em `DECISOES_CADASTRO`, ainda sem linha na central; abrir | `BLOQUEADO` `SEM_CADASTRO_CENTRAL`; nada na aba `Diplomas`; faixa com o motivo |
| E7 | Cadastrar 9000201 na central; abrir | entra como em E1; a faixa some |
| E8 | Incluir à mão 9000202 na colação e depois o pedido dele | `BLOQUEADO` `DUPLICIDADE_DIPLOMAS`; a linha manual não muda |
| E9 | Conta LEITOR abre | nenhuma faixa; nada encaminhado |
| E10 | "Abrir/criar pasta" de um registro sem cadastro na central | mensagem pedindo o cadastro pelo Gerenciador de Pessoas; nada criado |
| E11 | Só com a autorização do D15: `instalarGatilhoEncaminhadorColacao`, um pedido novo e esperar 5 minutos sem abrir a página | entra com origem `GATILHO`; rodar de novo a instalação não duplica o gatilho |

## 4.0.1 (06/11/2026) — em PR, não enviada ao Google

Testes locais: `testar_integridade.js` 21 ok (novo), `testar_acesso.js` 39 ok, `testar_historico.js` 484 de 486 (as 2 de sempre), `testar_navegador.js` 21 ok. Revisão para auditoria: [REVISAO_4.0.1.md](REVISAO_4.0.1.md).

Roteiro no projeto HOMOLOGACAO, com as linhas de [dados fictícios da 4.0.1](dados-ficticios/README.md#401--integridade-roteiro-i1i6-do-homologacaomd), depois de autorização para o `clasp push`:

| # | Passo | Esperado |
|---|---|---|
| I1 | ADMINISTRADOR exclui o registro de 2026/2 de 9000101 | a pasta de teste continua no Drive com os arquivos; o "ID da Pasta" da central não muda; o registro de 2025/2 continua |
| I2 | Exclusão em lote de um registro com pasta | nenhuma pasta vai para a lixeira |
| I3 | "+ Adicionar Aluno" com 9000101 na colação 20262 | recusado; nenhuma linha nova |
| I4 | "+ Adicionar Aluno" válido | uma linha completa, Registro ID e Versão 1, etapa Pendente |
| I5 | Abrir/criar pasta de 9000102 (repetido na central) | mensagem de Nº USP repetido; nenhuma pasta; nada gravado |
| I6 | Abrir/criar pasta de 9000103 (sem cadastro) | uma linha nova na central e uma pasta nova com o ID gravado |

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

- Produção, cada passo com autorização do responsável. Feito e conferido: `clasp push` do `main` (`4792667`) para o projeto PRODUÇÃO autônomo em 06/11/2026, com a autorização dele, enviado por ele; conferência por novo `clasp clone`: 25/25 arquivos idênticos (SHA-256), sem arquivo sobrando. Feito, confirmado pelo responsável em 06/11/2026 e não conferido por este repositório: implantação em produção. Implantação ativa: versão 4 da implantação ativa, de 09/11/2026 15:04 (horário de Brasília), informada pelo responsável; três implantações anteriores arquivadas. Não registrados aqui: identificador da implantação (fica fora do repositório), aba `EMISSAO_DIPLOMAS` da permissão de produção e troca do link no Painel dos servidores (feita por ele); conferir na próxima atualização desta página, sem copiar IDs nem URLs.
- Incluir as três suítes na CI: feito no PR da 4.0.1 (#47), junto com `testar_integridade.js`.
