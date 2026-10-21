# Inventário da versão 1.0 e matriz de equivalência

A versão 1.0 do gerenciador (dois arquivos, `Codigo.gs` e `GerenciadorApp.html`) foi recebida em 21/10/2026 e está em uso fora do repositório. Este documento registra o que ela faz, o que a 2.0 preserva, o que muda e como cada ponto é conferido. **Comportamento antigo não vira regra oficial por estar aqui**: nenhum documento normativo sobre o processo de abertura de habilitação foi fornecido, então as regras de negócio aparecem como "comportamento implementado".

## 1. Origem e integridade

| Arquivo da 1.0 | SHA-256 (recebido) | No repositório |
|---|---|---|
| `Codigo.gs` | `a18648e81414f24c9feb0ee3b5189fd2b5aa9018912a2474c05c9a822b3a765a` | [`testes/baseline/Codigo_v1.0_sanitizado.gs`](../../../sistemas/abertura-habilitacoes/gerenciador/testes/baseline/Codigo_v1.0_sanitizado.gs): **uma** linha alterada, a constante do ID da planilha, trocada pelo marcador `CONFIGURAR_ID_DA_PLANILHA_DE_RESPOSTAS` |
| `GerenciadorApp.html` | `c20efee737b8d25cb6e46cd4d4f4cee7b9de6028b262ef69e9b3e98d60ba9758` | [`testes/baseline/GerenciadorApp_v1.0.html`](../../../sistemas/abertura-habilitacoes/gerenciador/testes/baseline/GerenciadorApp_v1.0.html), sem alteração |

O ID real da planilha e o ID do projeto Apps Script não estão no repositório, nos testes, nos commits nem no PR.

## 2. Funções públicas da 1.0

Toda função sem `_` no fim pode ser chamada por `google.script.run` por quem abre o Web App.

| Função | Lê | Grava | Observação |
|---|---|---|---|
| `doGet` | aba atual (Nome, Registro ID, Versão) | **Registro ID e Versão** de todas as linhas que precisam (migração automática); cria os títulos `Registro ID` e `Versão` | Qualquer visita grava na planilha. Falha da migração só vai para o registro. |
| `obterPendentes` | aba atual inteira (1 `getValues`) | — | |
| `obterConcluidosRecentes` | aba atual inteira | — | Resposta passa por `JSON.parse(JSON.stringify())`. |
| `obterDetalhe(registroId)` | coluna Registro ID + a linha | — | |
| `salvarPedido(registroId, versaoEsperada, dados)` | linha do pedido | J, K, Data de Conclusão, E-mail Enviado, Versão; cria colunas que faltam | Envia e-mail. |
| `buscarHistorico(termo)` | aba atual e aba `2021 - 2022` inteiras | — | |
| `obterRelatorio` | as duas abas inteiras | — | |
| `diagnosticarPlanilha` | aba atual | — | Pensada para o editor, mas também chamável pela página. Escreve **nomes de alunos** no registro. |

Chamadas da página 1.0: `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `salvarPedido`, `buscarHistorico`, `obterRelatorio`. A página recarregava a lista a cada troca de aba e a cada fechamento do detalhe.

## 3. Dados

- **Planilha:** uma, pelo ID literal. Abas `Respostas ao formulário 2` (atual) e `2021 - 2022` (antiga, opcional).
- **Colunas da aba atual:** A–I do Forms, achadas pelo título; **J = Observações** e **K = Situação** pela posição fixa; `Data de Conclusão`, `Registro ID`, `Versão`, `E-mail Enviado` pelo título, criadas no fim da linha 1 se faltarem. Título repetido: vale o **último**. Detalhe em [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md).
- **Aba antiga:** colunas por palavra-chave (`nome`, `usp`, `e-mail usp`/`e-mail`, `programa`/`habilita`, `carimbo`/`data`), só leitura.
- **Dados pessoais expostos:** à página, nome, Nº USP, e-mails, habilitação, ano de ingresso, trancamento, observações; ao registro de execução, **nome do aluno** (migração, pendentes sem ID, diagnóstico); à página em caso de erro, a mensagem crua do servidor (que pode trazer detalhes internos ou, na falha de e-mail, o texto do erro do MailApp).

## 4. Efeitos colaterais e falhas parciais da 1.0

- `doGet` grava IDs e versões e cria colunas sem ninguém pedir, com a conta de quem implantou.
- `salvarPedido` grava as observações (J) **antes** de conferir "já avisado", "envio em andamento" e "sem e-mail". Quando recusa, as observações ficam gravadas e a Versão não sobe.
- A reserva `ENVIANDO…` não tem data: se a execução morrer entre a reserva e a confirmação, o pedido fica bloqueado para sempre ("envio em andamento").
- E-mail enviado e falha ao gravar a data: erro genérico, reserva presa.
- Concluir de novo um pedido já concluído troca a Data de Conclusão.
- `versaoEsperada` vazia ou ausente pula a conferência de versão.
- Observações acima de 2.000 caracteres são cortadas sem aviso.
- Sem `SpreadsheetApp.flush()` antes de soltar a trava.

## 5. Dependências do Google Workspace

`SpreadsheetApp`, `LockService` (trava do script), `MailApp` (cota diária da conta), `Utilities` (UUID, datas), `HtmlService`, e a imagem da marca IPUSP num servidor do IP. A 2.0 acrescenta `PropertiesService`, `CacheService` e `Session`.

## 6. Classificação usada na matriz

| Sigla | Significado |
|---|---|
| **RA** | Regra administrativa comprovada por documento institucional. *Nenhum item foi classificado assim: não houve documento normativo.* |
| **CI** | Comportamento implementado sem validação normativa. Preservado; mudar exige decisão humana. |
| **PT** | Problema técnico demonstrável (há teste que o reproduz). Corrigido. |
| **RP** | Risco potencial (depende de condições não reproduzidas aqui). Mitigado ou registrado. |
| **DH** | Decisão que exige validação humana. A 2.0 adota uma opção provisória e registra em [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md). |

Testes: **B** = `testar_backend.js`, **E** = `testar_equivalencia.js`, **N** = `testar_navegador.js` (nomes dos casos entre aspas).

## 7. Matriz: comportamento atual → esperado → teste

### Configuração, acesso e registros

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 1 | ID da planilha literal no código | Chave `ABERTURA_HABILITACOES` no `ID_INDEX`; propriedade, chave ou ID ausente/repetido/de outro tipo = erro, nunca um padrão | PT | B "sem ID_INDEX…", "chave de pedidos com problema…", "nenhum ID literal…" |
| 2 | Sem ambiente de teste | `AMBIENTE=homologacao` lê a coluna Homologação; sem ID nela, falha (não cai na produção); prefixo no título e no assunto | RP | B "homologação: …" (2 casos) |
| 3 | Nenhuma autorização no servidor: qualquer pessoa que abra o `/exec` lê e grava tudo | Lista `GERENCIADOR_HABILITACOES`; LEITOR consulta, ADMINISTRADOR grava; toda função pública confere antes de abrir os pedidos | PT, DH (lista e perfis) | B "conta fora da lista…", "sessão sem e-mail…", "LEITOR…", "funções públicas são exatamente…" |
| 4 | `diagnosticarPlanilha` chamável pela página e com nomes no registro | Só ADMINISTRADOR; contagens sem nomes; `diagnosticarConfiguracao` sem IDs | PT | B "diagnosticarConfiguracao…", "registros de execução sem…" |
| 5 | Nome do aluno no registro de execução | Registros com contagens e números de linha; e-mails, números longos e IDs removidos | PT | B "registros de execução sem nomes…" |
| 6 | Erro do servidor mostrado cru na página | Mensagens com código; códigos internos (configuração, serialização, sem código) viram texto genérico | PT | N "erro de configuração mostra mensagem genérica…", "erro sem código…" |

### Abrir a página e identificadores

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 7 | `doGet` atribui Registro ID/Versão e cria colunas | `doGet` só confere o acesso e serve a página; não abre os pedidos | PT | B "doGet: … sem migração automática"; E "DIFERENÇA: abrir a página…" |
| 8 | Migração: ID vazio → UUID; repetido → mantém o 1º, os seguintes recebem UUID; Versão vazia/inválida → 1; grava só as duas colunas | Regras de ID iguais, em três passos: diagnóstico (só leitura), código de confirmação com impressão digital do plano numa Script Property, execução que refaz o plano dentro da trava e recusa se qualquer linha envolvida mudou (mesmo com as mesmas contagens); idempotente. Versão: só vazia vira 1; malformada é informada e preservada (item 49) | CI (ID), PT (Versão), DH (quando rodar) | B "diagnóstico da migração…", "migração: …" (9 casos); E "DIFERENÇA: migração com versão malformada…" |
| 9 | Linha sem Registro ID aparece na lista sem ação até a próxima visita | Continua na lista, marcada "Sem identificador"; ADMINISTRADOR pode **Preparar pedido** (só aquela linha, conferindo carimbo e Nº USP) | CI, DH | B "pendentes: sem identificador…", "atribuirIdentificador…" (2); N "preparar envia a referência…" |
| 10 | ID repetido ou fora do formato aparece clicável e falha ao abrir | Marcado "Identificador repetido/inválido", sem ação; a migração corrige o repetido (mantém o 1º), o inválido só é informado (como na 1.0); os dois podem ser resolvidos um a um pela recuperação administrativa, com escolha humana da linha | PT | E "DIFERENÇA: ID repetido…"; B "migração: grava só…", "recuperação: …" (7 casos) |
| 11 | Colunas novas criadas em `getLastColumn()+1` | Criadas só em operação expressa e nunca em J ou K | RP | B "migração cria as colunas… depois de K", "pedido sem coluna E-mail Enviado…" |
| 12 | Título repetido: vale o último | Título conhecido repetido ou J/K ocupadas por um título conhecido (colunas deslocadas) param tudo antes de ler | RP | B "estrutura: …" |

### Listas, detalhe, busca e relatórios

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 13 | Pendente = linha com Nome e K sem "conclu" (qualquer caixa); ordem alfabética pt-BR | Igual | CI | E "pendentes: mesmos pedidos…"; B "pendentes: ordem…" |
| 14 | Concluídos: 10 mais recentes da aba atual, por Data de Conclusão, senão carimbo (Date ou texto) | Igual | CI | E "concluídos recentes…"; B "concluídos: 10 mais recentes…" |
| 15 | Concluídos mostram `ENVIANDO…` como se fosse a data do aviso | Reserva nunca aparece como aviso; selo "sem confirmação de envio" | PT | E "DIFERENÇA: reserva…"; B "concluídos: reserva…" |
| 16 | Detalhe: Nome, Nº USP, E-mail USP, e-mail do formulário, habilitação, ano, trancamento, carimbo, situação, concluído, observações, data de conclusão, e-mail enviado | Mesmos campos e valores; acrescenta `envioReservado` e `envioInterrompido` | CI | E "detalhe: mesmos campos…"; B "detalhe: …" (2) |
| 17 | Datas: `Date` vira texto `dd/MM/yyyy HH:mm` em Brasília; nenhum `Date` sai do servidor só nas funções blindadas | Todas as respostas passam pela mesma blindagem | PT | B (`ultimoRetornoTinhaData` em listas, detalhe e busca) |
| 18 | Busca: nome, Nº USP ou e-mail, ≥ 2 caracteres, nas duas abas; com acento; ordem só por carimbo `Date` | Sem diferença de acento; carimbo em texto também ordena; termo limitado a 100 caracteres; resultados da aba atual com ID único abrem o detalhe | PT (ordem), CI | E "busca no histórico: mesmos resultados…", "DIFERENÇA: busca sem acento…"; B "busca: …" (2) |
| 19 | Aba antiga por palavra-chave (`usp` pode pegar `E-mail USP` se vier antes) | Busca: título exato primeiro, palavra-chave depois. Relatórios: **só** palavra-chave, como na 1.0, para não mudar contagens | RP | E "relatório: mesmas contagens…" |
| 20 | Aba `2021 - 2022` nunca escrita | Igual, reforçado: toda escrita recusa outra aba | CI | B "aba histórica nunca é escrita…", "gravarCelula_ recusa…" |
| 21 | Relatórios: total de linhas com Nome nas duas abas; cada habilitação conhecida conta separado (múltipla seleção); texto sem nenhuma conhecida = "Outro / não identificado"; ano e mês pelo carimbo | Iguais; acrescenta "sem data" e o total por aba. Qualquer mudança de critério é decisão humana | CI, DH | E "relatório: …" (2); B "relatório: totais…" |

### Salvar, concluir, reabrir e avisar

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 22 | Opções independentes: observações sempre; "Concluir" → K `Concluído` + data; desmarcado → K `pendente`; "Avisar" → e-mail | Igual | CI | E "concluir sem avisar", "avisar sem concluir, só observações e reabrir" |
| 23 | Recusas (já avisado, envio em andamento, sem e-mail) depois de gravar J | Tudo conferido antes; recusa não grava nada | PT | E "DIFERENÇA: já avisado…", "DIFERENÇA: sem e-mail…"; B "já avisado…", "sem e-mail…" |
| 24 | `versaoEsperada` ausente pula a conferência | Versão obrigatória (inteiro ≥ 1) | PT | E "DIFERENÇA: versão omitida…"; B "versão antiga, ausente…" |
| 25 | Versão sobe dentro da mesma trava que conferiu (já corrigido na 1.0) | Igual, e sobe **antes** das outras gravações; `flush` antes de soltar a trava | CI, RP | B "concluir sem avisar…" (escritas e flush dentro da trava), "outra sessão com a versão antiga…" |
| 26 | Reserva `ENVIANDO…` sem data; presa para sempre se a execução morrer | `ENVIANDO… aaaa-mm-dd hh:mm:ss #marca` (marca aleatória por salvamento); com mais de 10 min (ou a da 1.0, sem data) conta como interrompida e pede confirmação | PT | B "reserva recente bloqueia…", "reserva tem marca própria…" |
| 27 | Habilitação do e-mail lida fora da trava, depois da reserva | Nome e habilitação capturados dentro da trava | RP | B "planilha reordenada durante o envio…" |
| 28 | E-mail: assunto "Abertura de Habilitação"; "Bom dia/Boa tarde/Boa noite" (Brasília), primeiro nome, texto fixo; remetente "Serviço de Graduação — IPUSP", resposta para o endereço da equipe | Igual, byte a byte; em homologação, `[HOMOLOGAÇÃO]` no assunto | CI | E "concluir e avisar: mesmo e-mail…"; B "concluir e avisar: e-mail com o texto da 1.0…" |
| 29 | E-mail só conferido como não vazio | Também conferido o formato; inválido recusa sem gravar | PT | B "sem e-mail ou e-mail inválido…" |
| 30 | Falha no envio: erro `PEDIDO_SALVO_EMAIL_FALHOU` com o texto do MailApp; reserva desfeita | Resultado `email: "FALHOU"` com versão nova e mensagem própria; reserva desfeita só se ainda for a nossa | CI (estado), PT (mensagem) | E "falha no envio: mesmas células…"; B "falha no envio…", "falha no reenvio…" |
| 31 | E-mail enviado e falha ao registrar a data: erro genérico | Resultado `ENVIADO_SEM_REGISTRO` (motivo `REGISTRO_FALHOU`); a reserva com data fica e impede reenvio sem confirmação | PT | B "e-mail enviado mas confirmação falha…"; N (opção de aviso desmarcada) |
| 32 | Já avisado → pede confirmação de reenvio | Igual, sem gravar antes | CI | E "reenvio confirmado…"; N "reenvio pede confirmação…" |
| 33 | Concluir de novo troca a Data de Conclusão | Mantém a data original | PT/DH | E "DIFERENÇA: concluído salvo de novo…" |
| 34 | Reabrir: K `pendente`, Data de Conclusão anterior **mantida** | Igual (o Gerenciador de Trancamento Total 1.1 limpa; aqui fica como na 1.0) | CI, DH | B "reabrir…"; E "avisar sem concluir, só observações e reabrir" |
| 35 | `pendente` em minúsculas | Igual: é o valor que o Painel dos servidores conta | CI | B "só observações…" |
| 36 | Observações: controle removido, `'` antes de `= + - @`, cortadas em 2.000 | Igual, mas texto acima de 2.000 é recusado com mensagem | CI, PT | E "observações com fórmula…", "DIFERENÇA: observações acima…"; B "observações: …" |
| 37 | Trava ocupada: erro técnico do `waitLock` | `TRAVA_OCUPADA` com mensagem clara, sem gravar | PT | B "trava ocupada…" |

### Página

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 38 | Dados da planilha na tela por `textContent` | Igual (nenhum `innerHTML` com dados) | CI | N "nome com HTML aparece como texto" |
| 39 | `confirm()`/`alert()` do navegador | Diálogos acessíveis (foco, Esc, retorno de foco) | PT (acessibilidade) | N "confirmação antes do e-mail…", "reabrir pede confirmação" |
| 40 | Pendente abre com Concluir e Avisar marcados; concluído com Concluir marcado e Avisar desmarcado | Igual; sem e-mail cadastrado, Avisar desativado | CI | N "pendente abre…", "concluído abre…" |
| 41 | Sobreposição de carregamento em tela cheia; listas recarregadas a cada troca de aba e ao fechar o detalhe | Carregamento por área; dados reaproveitados por 60 s; recarga depois de salvar | PT (desempenho) | N "só uma chamada na abertura…", "voltar à área reaproveita…" |
| 42 | Resposta que não é lista vira erro; `null` em outras respostas não é tratado | Toda resposta validada; nula ou malformada vira erro visível; respostas fora de ordem descartadas | PT | N "resposta nula…", "resposta malformada…", "resposta atrasada…" |
| 43 | Sem tema, sem ajuda, abas fixas | Tema GRADIP, marcas, menu lateral ou abas, Central de Ajuda | — | N (tema, abas, ajuda) |

### Riscos que dependem do ambiente

| # | Situação | Tratamento | Classe |
|---|---|---|---|
| 44 | O Forms ganha uma pergunta e empurra J/K | Detecção de J/K ocupadas por título conhecido (item 12); procedimento no manual | RP |
| 45 | A trava do script não protege contra edição manual da planilha nem contra o Forms | Registrado na ajuda e no manual; versão e reserva reduzem o impacto | RP |
| 46 | Cota diária de e-mail da conta | Falha de envio tratada (item 30); cota não verificada aqui | RP |
| 47 | O Painel dos servidores conta só K = `pendente` (linha nova do Forms, com K vazia, não conta) | Não alterado aqui (outro sistema); registrado em [REGRAS_E_CONTRATOS.md](REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas) | RP, DH |
| 48 | `Session.getActiveUser()` só vem preenchido para contas do mesmo domínio de quem implantou | Sem e-mail = negado; acesso "Somente eu" até a homologação | DH |

### Itens da revisão de 21/10/2026

| # | 1.0 | 2.0 | Classe | Teste |
|---|---|---|---|---|
| 49 | Versão lida por `v && !isNaN(Number(v)) ? Number(v) : 1`: vazia, `0` e texto viram 1 em silêncio; `-2` e `1.5` são usadas como versão; a migração troca `0` e texto por 1 | Contrato único (`versaoValida_`): inteiro ≥ 1. Ausente ou malformada: marcada "Versão inválida" nas listas, recusa no detalhe e no salvamento (`VERSAO_INVALIDA`), sem gravar; migração e "Preparar pedido" só preenchem a vazia; malformada só pela recuperação | PT | B "versaoValida_ e estadoDaVersao_…", "leitura: versão malformada…", "salvamento: versão malformada…", "migração: só versão vazia…", "atribuirIdentificador: versão válida…"; E "DIFERENÇA: versão malformada…" |
| 50 | A confirmação do envio grava a data em `E-mail Enviado` sem conferir o que há na célula: apaga o que foi escrito nela durante o envio | Só grava se a célula ainda tiver a reserva daquele salvamento (marca própria) e a Versão for válida; senão, nada é gravado e o resultado é `ENVIADO_SEM_REGISTRO`/`RESERVA_ALTERADA`, sem reenvio | PT | B "reserva alterada durante o envio…", "reserva de outra operação…", "versão invalidada durante o envio…"; E "DIFERENÇA: reserva alterada…" |
| 51 | ID fora do formato e ID repetido em que a 1ª ocorrência não é a certa não têm correção prevista | Recuperação administrativa de uma linha (`diagnosticarRecuperacaoRegistro`/`executarRecuperacaoRegistro`, Script Property `RECUPERACAO_REGISTRO`): diagnóstico, código da linha e das outras linhas do mesmo ID, no máximo duas células gravadas, registro manual da decisão | PT, DH (cada uso) | B "recuperação: …" (7 casos) |
| 52 | — | Voltar à 1.0 reativa a migração automática a cada visita; condições e procedimento documentados ([INSTALACAO_E_ATUALIZACAO.md §5](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás)) | RP, DH | E "volta à 1.0: com o diagnóstico da 2.0 limpo…" |
| 53 | Migração regrava as colunas Registro ID e Versão inteiras com `setValues` (todas as linhas, inclusive as que não mudam; fórmulas viram valores) | Grava só as células do plano, um `setValues` por bloco de linhas seguidas em cada coluna; títulos que faltam na linha 1; falha no meio = `GRAVACAO_PARCIAL`, nunca sucesso | PT | B "migração: grava só as células do plano…", "fórmula numa célula do plano…", "linhas seguidas…", "colunas ausentes…", "só a coluna Versão…", "só títulos a criar…", "falha no meio…", "falha ao criar o título…"; E "DIFERENÇA: migração — a 1.0 regrava…" |
