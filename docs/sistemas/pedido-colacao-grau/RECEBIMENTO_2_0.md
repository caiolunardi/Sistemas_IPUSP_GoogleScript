# Formulário 2.0 — recebimento do pedido (PR 3 do plano)

**Estado:** fonte em `sistemas/pedido-colacao-grau/src/`, versão **2.0.0**, em PR. **Não homologada nem implantada.** O legado continua sendo o formulário em uso até a virada única (decisão D13), que depende também dos PRs 4 (encaminhador do Gerenciador de Diplomas), 5 (fila no Gerenciador de Pessoas) e 7 (interface GRADIP).

O plano aprovado está no documento "Plano — novo Formulário de Pedido de Colação de Grau" (versão 2, 06/11/2026, decisões D1 a D15). Esta página descreve o que o PR 3 implementa e o que fica para os seguintes.

## 1. O que muda em relação ao legado

| Tema | Legado (código de 06/11/2026) | 2.0 |
| --- | --- | --- |
| Execução | o cabeçalho prescreve "executar como quem acessa", com alunos editores das planilhas | "Executar como: eu" (conta institucional) e acesso restrito ao domínio; aluno não recebe acesso a planilha nem pasta |
| IDs | literais no código | só chaves do `ID_INDEX`; `AMBIENTE=homologacao` usa só a coluna Homologação |
| Identidade | domínio conferido em `doGet` e no envio; não em `obterDadosIniciais` | e-mail `@usp.br` da sessão conferido na primeira linha de **toda** função pública, antes de abrir qualquer planilha |
| Cadastro | o formulário cria e completa linhas na planilha central | só lê; sem cadastro único confirmado, o pedido entra como **PENDENTE** (D2, requisito 4) |
| Onde grava | aba `Diplomas`, planilha central, pasta do aluno | só `PEDIDOS_COLACAO` (4 abas) e a subpasta do protocolo em `PASTA_PROVISORIOS_COLACAO` |
| Protocolo | não existe | `PCG-AAAAS-NNNNN`, mostrado só depois de gravado e relido |
| Envio repetido | procura nº USP + colação na aba `Diplomas` | chave de envio (UUID) da página: a mesma chave devolve o mesmo protocolo e retoma o que faltou |
| Correção | regrava a linha da aba `Diplomas` e exige os dois anexos | versão nova em `VERSOES`; documento não trocado é mantido (linha REUTILIZADO apontando para o mesmo arquivo); só com prazo aberto e "Status — Dados Pessoais" vazio (D3) |
| Arquivos | lista de extensões proibidas, MIME do navegador, 15 MB, substitui por nome e manda o antigo para a lixeira | PDF/JPEG/PNG pelo conteúdo, 10 MB cada, 5 por envio, SHA-256 registrado; nunca lixeira, nunca renomeia arquivo antigo |
| Recibo | não existe | e-mail ao endereço da sessão, sem RG nem anexos; falha não cancela o protocolo; "Meus pedidos" reenvia |

## 2. Fluxo do envio

1. **Conferir sem gravar:** sessão, chave de envio, campos, documentos (conteúdo, tamanho, quantidade). Erro aqui não abre nenhuma planilha.
2. **Sob o `ScriptLock`:** procurar a chave em `VERSOES` e `PROTOCOLOS`. Se existir e for da mesma conta, retomar (sem conferir o prazo de novo); se for de outra conta, recusar.
3. **Envio novo:** conferir o prazo uma vez, com o "Recebido em" (hora do servidor no início do processamento, fuso de São Paulo). Identificar o cadastro. Se a pessoa já tem pedido ativo nesta colação, é **correção**; senão, protocolo novo: subpasta, linha em `PROTOCOLOS` (RECEBENDO, Registro ID já gerado), linha em `VERSOES` e evento.
4. **Cada documento, sob o lock:** se a chave do documento (chave de envio + tipo + ordem) ainda não está em `DOCUMENTOS`, criar o arquivo e registrar.
5. **Sob o lock:** conferir que todos os documentos da versão estão registrados, marcar RECEBIDO na versão e no protocolo, `flush` e reler. Só então a página recebe o protocolo.
6. **Recibo.** Falha no e-mail vira evento `RECIBO_FALHOU`; o protocolo continua válido.

Falha em qualquer ponto depois do passo 3 deixa o pedido em RECEBENDO. A página guarda a chave em `sessionStorage` e o botão "Enviar" usa a mesma chave; se a pessoa fechou a aba, `obterDadosIniciais` devolve a chave do envio incompleto **da própria conta** e a página retoma. O diagnóstico lista pedidos parados há mais de 15 minutos.

## 3. Identidade (D2)

| Planilha central (coluna D = e-mail da sessão) | Cadastro no protocolo | O que a página mostra |
| --- | --- | --- |
| uma linha, nº USP preenchido e sem repetição na coluna A, nome preenchido | `CONFIRMADO` | nome e nº USP do cadastro, só leitura; campo opcional para apontar divergência |
| aluno confirmado aponta divergência | `PENDENTE` (`DIVERGENCIA_APONTADA`) | o mesmo protocolo, "cadastro em conferência" |
| nenhuma linha | `PENDENTE` (`SEM_CADASTRO`) | campos livres e aviso de conferência |
| nº USP digitado já é de outro e-mail | `PENDENTE` (`CONFLITO_NUSP`) | **a mesma tela e a mesma resposta** do caso anterior |
| e-mail repetido, nº USP vazio ou repetido, nome vazio | `PENDENTE` (motivo correspondente) | idem |
| planilha central não abre | `PENDENTE` (`CADASTRO_INDISPONIVEL`) | idem; o pedido é protocolado no prazo (requisito 4) |

O motivo fica só na coluna "Motivo do cadastro" de `PROTOCOLOS`, para a fila do Gerenciador de Pessoas (PR 5); nunca vai para a página nem para o recibo. Um protocolo PENDENTE com o nº USP de outra pessoa não aparece para a dona do número.

## 4. Estados (requisito 5)

| Estado | Valores | Quem grava |
| --- | --- | --- |
| Recebimento | RECEBENDO, RECEBIDO (`PROTOCOLOS` e, por versão, `VERSOES`) | este formulário |
| Cadastro | CONFIRMADO ou PENDENTE na entrada | este formulário; depois APROVADO/REJEITADO/DUPLICIDADE em `DECISOES_CADASTRO` (Gerenciador de Pessoas, PR 5) |
| Encaminhamento | AGUARDANDO, ENCAMINHADO, BLOQUEADO, CORREÇÃO RETIDA em `ENCAMINHAMENTOS` | Gerenciador de Diplomas (PR 4) |

"Meus pedidos" mostra recebimento, cadastro e andamento. O formulário nunca diz "deferido". Enquanto `DECISOES_CADASTRO` e `ENCAMINHAMENTOS` não existirem, contam como vazias.

## 5. Funções

| Função | Quem chama | Observação |
| --- | --- | --- |
| `doGet` | navegador | conta fora de `@usp.br` vê só um aviso |
| `obterDadosIniciais` | página | período, identidade (sem motivo), pedido ativo desta colação, chave de envio incompleto |
| `enviarPedidoColacao` | página | seção 2 |
| `listarMeusPedidos` | página | pedidos da conta, sem IDs internos |
| `reenviarComprovanteColacao` | página | só para pedido da própria conta, uma vez a cada 2 minutos; sempre para o e-mail da sessão |
| `diagnosticarConfiguracao` | editor | recusa quando a sessão difere do usuário efetivo (quem abre pela página) |
| `prepararPlanilhaPedidosColacao` | editor | cria só as abas que faltam, com títulos; nunca altera aba existente |

## 6. O que não está neste PR

- Levar o pedido à aba `Diplomas` e os documentos à pasta do aluno: encaminhador do Gerenciador de Diplomas (PR 4). Até lá, um pedido recebido pela 2.0 **não aparece para a equipe**; por isso a 2.0 não vai para a produção sozinha.
- Fila de cadastro e decisões: Gerenciador de Pessoas (PR 5).
- Reutilizar documentos de outra colação e documento legado conferido: PR 6. Aqui, "manter" vale só dentro do mesmo protocolo.
- Interface GRADIP, tema, Central de Ajuda: PR 7. A tela é a legada, com os ajustes funcionais (aviso inline em vez de `alert`, com o campo do problema destacado em vermelho, focado e com a mensagem logo abaixo, tela de pedido existente em vez de `confirm`, faixa de homologação, "Meus pedidos").
- A ligação para a Portaria GR nº 8066 saiu da tela (o endereço tem um identificador longo); o texto continua. Volta no PR 7 com o endereço registrado em `ferramentas/publicos.json`.
