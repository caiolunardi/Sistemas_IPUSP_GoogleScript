# Regras e contratos — Gerenciador de Abertura de Habilitações 2.0

**Natureza das regras.** Nenhum documento normativo sobre o processo de abertura de habilitação foi fornecido. Tudo o que está abaixo é **comportamento implementado** (herdado da 1.0 ou proposto na 2.0), não regra administrativa comprovada. Mudar qualquer item marcado "1.0" exige decisão humana; os itens "2.0" são propostas técnicas a validar na homologação. A classificação de cada item está no [inventário](INVENTARIO_LEGADO.md#6-classificação-usada-na-matriz).

## 1. Situação do pedido

| Regra | Origem |
|---|---|
| A Situação fica na coluna **K**, pela posição, seja qual for o título. | 1.0 |
| Concluído = K contém "conclu", sem diferença de maiúsculas (`Concluído`, `concluido`, `CONCLUÍDO`…). Qualquer outro valor, inclusive vazio ou "Em análise", é **pendente** no gerenciador. | 1.0 |
| Linha sem Nome não é pedido: não aparece em listas, busca nem relatórios. | 1.0 |
| Concluir grava K = `Concluído` (com acento, maiúscula inicial). | 1.0 |
| Salvar sem **Concluir** grava K = `pendente` (minúsculas), inclusive num pedido que estava vazio ou "Em análise". | 1.0 |
| Concluir grava a **Data de Conclusão** (agora). Concluir de novo um pedido já concluído **mantém** a data existente. | 2.0 (a 1.0 trocava) — decisão pendente |
| Reabrir mantém a Data de Conclusão anterior. | 1.0 — decisão pendente |

## 2. Observações

| Regra | Origem |
|---|---|
| Coluna **J**, pela posição. Gravadas a cada salvamento (o texto da tela substitui o anterior). | 1.0 |
| Caracteres de controle removidos; espaços nas pontas removidos; texto que começa com `= + - @` recebe `'` na frente (não vira fórmula). | 1.0 |
| Limite de 2.000 caracteres. Acima disso, o salvamento é **recusado** com mensagem (a 1.0 cortava sem avisar). | 2.0 |

## 3. Aviso por e-mail

| Regra | Origem |
|---|---|
| Opção independente de concluir: dá para avisar sem concluir e concluir sem avisar. | 1.0 |
| Destinatário: coluna `E-mail USP`. Vazio ou fora do formato de endereço de e-mail (texto, arroba, domínio com ponto): recusado sem gravar. | 1.0 (vazio); 2.0 (formato) |
| Assunto: `Abertura de Habilitação` (em homologação, `[HOMOLOGAÇÃO] Abertura de Habilitação`). | 1.0 |
| Corpo: `Bom dia`/`Boa tarde`/`Boa noite` pela hora de Brasília (0–11, 12–17, 18–23), primeiro nome (até o primeiro espaço), "Informo que sua habilitação de {texto da coluna de habilitação} foi aberta conforme solicitado.", "Atenciosamente, Equipe do Serviço de Graduação". | 1.0, idêntico |
| Remetente exibido "Serviço de Graduação — IPUSP"; respostas vão para o endereço institucional da equipe; a conta que envia é a de quem implantou (`MailApp`). | 1.0 |
| Já avisado (E-mail Enviado com data): novo aviso só com confirmação expressa. | 1.0 |
| `E-mail Enviado` só recebe a data **depois** que o `MailApp` aceitou o envio. Antes, guarda a reserva `ENVIANDO… aaaa-mm-dd hh:mm:ss`. | 1.0 (reserva); 2.0 (data na reserva) |
| Reserva com menos de 10 minutos bloqueia outro envio; mais velha, ou sem data (deixada pela 1.0), é envio interrompido e pede confirmação. | 2.0 |
| A reserva nunca aparece na tela como data de aviso. | 2.0 |

O texto do e-mail é dado como "texto da 1.0", não como modelo aprovado. Alterar o texto é decisão humana.

## 4. Relatórios

Mesmos critérios da 1.0 (conferidos pelo teste de equivalência):

- conta toda linha com Nome, **das duas abas** (atual e `2021 - 2022`), concluída ou não;
- **por habilitação**: cada habilitação conhecida (`Bacharelado em Psicologia`, `Licenciatura em Psicologia`) contida no texto conta 1; um pedido com as duas conta 1 em cada (por isso a soma por habilitação pode passar do total); texto sem nenhuma das duas vai para "Outro / não identificado"; vazio não conta;
- **por ano e por mês**: pelo carimbo, `Date` ou texto com `dd/mm/aaaa`;
- na aba antiga, as colunas são achadas por palavra-chave, como na 1.0.

A 2.0 acrescenta, sem mudar as contagens: linhas **sem data** reconhecível e o total de cada aba.

## 5. Identificação dos pedidos

| Regra | Origem |
|---|---|
| Cada pedido da aba atual é achado pelo `Registro ID` (UUID), nunca pela posição. | 1.0 |
| `Versão` (inteiro) sobe a cada gravação; a página manda a versão que viu e a gravação é recusada se mudou. | 1.0 |
| Versão ausente ou inválida enviada pela página: recusa (a 1.0 pulava a conferência). | 2.0 |
| ID vazio, repetido ou fora do formato: o pedido aparece, marcado, e não abre. | 2.0 |
| Abrir a página não atribui IDs. A atribuição é feita por **Preparar pedido** (uma linha) ou pela migração controlada (lote). | 2.0 |
| Migração: só linhas com Nome; ID vazio → UUID; ID repetido → a primeira ocorrência fica, as seguintes recebem UUID novo; Versão vazia ou não numérica → 1; ID fora do formato é só informado. | 1.0 (regras), 2.0 (forma) |

## 6. Contratos com outros sistemas

### Google Forms (alunos)

- Grava a aba `Respostas ao formulário 2`, colunas A–I. O gerenciador acha essas colunas pelo **título exato** da linha 1 (ver [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md)). Renomear uma pergunta no Forms muda o título e pode parar o gerenciador (`ESTRUTURA`).
- Uma pergunta nova no Forms entra como coluna nova e pode empurrar Observações (J) e Situação (K). O gerenciador recusa trabalhar quando J ou K contêm um título conhecido; um título desconhecido nessas posições **não** é detectado. Antes de mexer no Forms, siga o [manual](MANUAL_OPERACAO.md#7-problemas-comuns).
- O Forms grava por fora da trava do script.

### Painel dos servidores

Lê a mesma planilha pela chave `ABERTURA_HABILITACOES` para contar pendências (`contarPendentesHabilitacoes_`, em `sistemas/painel-servidores/src/Code.gs`):

- aba atual: conta as linhas em que a coluna **11 (K)**, sem espaços nas pontas e em minúsculas, é exatamente `pendente`;
- aba `2021 - 2022`: mesma regra na primeira coluna cujo título contém "situa".

Consequência: um pedido novo do Forms (K vazia) **aparece como pendente no gerenciador, mas não é contado pelo painel** até alguém salvar o pedido sem concluir. Os dois critérios já eram diferentes na 1.0; nenhum dos dois sistemas foi mudado aqui. Unificar é decisão humana (ver [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md)). Para não piorar a divergência, a 2.0 continua gravando `pendente` em minúsculas e mantém K na posição 11.

A URL do gerenciador aparece no Painel dos servidores pela chave `GERENCIADOR_HABILITACOES` da Script Property `URLS_SISTEMAS_EQUIPE` do painel. Uma nova implantação do gerenciador (nova URL) exige atualizar essa propriedade, o que é tarefa do responsável.

### ID_INDEX e planilha de permissões

- `ID_INDEX`: chaves `ABERTURA_HABILITACOES` e `PERMISSOES_DE_ACESSO`, colunas `Chave`, `Tipo` (opcional), `ID de Produção`, `Homologação…`.
- Planilha de permissões: aba nova `GERENCIADOR_HABILITACOES`, mesmo formato da `PAINEL_SERVIDORES` (A N. USP, B Nome, C e-mail, D Observação, E Perfil). As outras abas não são lidas.

### Respostas à página (`google.script.run`)

Toda resposta é JSON puro (texto, número, booleano, listas e objetos). Datas chegam como texto `dd/MM/yyyy HH:mm` (Brasília). Erros chegam como mensagem `CODIGO: texto`. Os códigos e o que a página faz com eles estão em [UX_E_NAVEGACAO.md](UX_E_NAVEGACAO.md#5-mensagens-de-erro).
