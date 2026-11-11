# Homologação — Formulário de Pedido de Colação de Grau

**Estado em 06/11/2026:** **NAO_EXECUTADA/NAO_VERIFICADA** nesta documentação. O responsável forneceu dois arquivos de código; não forneceu saída de testes, manifesto, código do editor comparado por hash, projeto de homologação, versão de implantação ou evidências de navegação para este formulário. **Não declarar o legado homologado nem a reformulação pronta.**

## Antes de testar

1. Sanitizar o código, eliminar todos os IDs/URLs internos literais, migrar dependências para `ID_INDEX`/Script Properties e submeter a revisão de segurança.
2. Definir o novo modelo de execução: **não conceder a alunos edição direta de recursos institucionais** como solução de permissão.
3. Isolar um projeto HOMOLOGAÇÃO e recursos sintéticos, incluindo `PLANILHA_ALUNOS`, `PERIODOS`, `EMISSAO_DIPLOMAS` e `PASTA_RAIZ_ALUNOS`, todos sem dados reais.
4. Conferir contratos de colunas e o Gerenciador 4.0 antes de qualquer gravação. Definir recuperação e diferença entre deploy do editor e `/exec`.
5. Criar testes automatizados e `dados-ficticios/` com casos escritos manualmente; **não derivar fixtures de alunos reais**.

## Matriz de testes propostos (não executados)

| ID | Cenário | Resultado exigido |
| --- | --- | --- |
| F01 | Sem conta/e-mail não USP | Recusa sem revelar cadastros ou anexos |
| F02 | Conta USP legítima sem cadastro | Pré-preenchimento vazio; entrada segura e cadastro coerente se autorizado |
| F03 | Nº USP e e-mail com vinculação inconsistente | Recusa antes de criar pasta, enviar arquivo ou alterar registro |
| F04 | Pessoa sem titularidade de um pedido anterior | Nem consultar nem alterar pedido/anexos da outra pessoa |
| F05 | Período fechado, não configurado ou semestre inválido | Nenhuma gravação; explicação compreensível |
| F06 | Semestre `AAAA/S`, fuso e bordas de abertura/fechamento | Código `AAAAS` correto, sem regressão na janela |
| F07 | Novo pedido válido | Um Registro ID, Versão 1, cabeçalhos conforme contrato e arquivos associados corretamente |
| F08 | Reenvio do mesmo pedido | Mesma identidade de registro, versão controlada, sem duplicação de linha |
| F09 | Pedido de outra colação do mesmo nº USP | Outra linha; preservação integral dos anexos/histórico anteriores |
| F10 | Arquivos inválidos, manipulados, vazios, excessivos ou incompatíveis com MIME | Bloqueio ou tratamento explícito, sem estado parcial |
| F11 | Falha entre cadastro, arquivo e pedido | Recuperação verificável ou ausência de efeito parcial |
| F12 | Dois envios concorrentes e concorrência com Gerenciador | Sem perda de dados, troca de titularidade ou sobrescrita silenciosa |
| F13 | Correção de habilitações e etapas já tratadas | Não deixar anos obsoletos nem desfazer decisões da equipe |
| F14 | Link/Drive/permissões do usuário | Não exigir edição direta de planilhas por aluno |
| F15 | Tema, ajuda, contraste, teclado e telas móveis | Padrão GRADIP integral, acessível |
| F16 | Testes de integração do formulário com Gerenciador 4.0 | Respostas, anexos e status lidos sem alteração indevida |
| F17 | Dados da sessão e saída de erros/logs | Nenhum dado pessoal exposto indevidamente |
| F18 | Contas de teste sem registros e contas duplicadas no cadastro | Comportamento determinístico, sem apropriação de registro |

**Gate:** implementação em PR próprio, CI verde no último commit, revisão adversarial de classe crítica, homologação Google isolada e aceite humano explícito. Nenhum teste acima deve ser marcado OK até haver evidência.

## Registro desta rodada documental

- Fonte: somente os dois anexos fornecidos.
- Técnicas: leitura estática e confronto pontual com código versionado do Gerenciador 4.0/Painel.
- Testes: **0 executados**.
- Google: **nenhum `clasp`, alteração de arquivo, Script Property, planilha, Drive ou implantação executado**.

## Versão 2.0.0 (PR 3 do plano) — testes locais e roteiro no Google

**Estado:** testes automáticos executados localmente e na CI; **homologação no Google NAO_EXECUTADA**. Nada foi enviado ao Google (`clasp`), nenhuma planilha, pasta, Script Property ou implantação foi criada ou alterada.

### Testes automáticos (CI exigida)

| Suíte | O que cobre | Resultado local |
| --- | --- | --- |
| `sistemas/pedido-colacao-grau/testes/testar_backend.js` | servidor com o Apps Script simulado: T-AUT-01 a 05, T-DUP-01/02/03/06, T-CON-01, T-DOC-03/06, T-PRZ-01/02/03/05/06, T-REC-01/02/03, D3, recibo (D9), homologação, escritor único, diagnóstico e preparação, motivo e aviso de rejeição, pasta própria mesmo com a numeração recomeçando | 81 ok |
| `sistemas/pedido-colacao-grau/testes/testar_navegador.js` | página em Chromium: telas por situação, validação (campo do problema destacado, focado e com a mensagem ao lado), chave de envio (mesma no reenvio, nova na correção, a do servidor na retomada), duplo clique, "Meus pedidos" sem HTML injetado, aviso de rejeição com o motivo como texto, 360 a 1280 px | 70 ok |

Fora do alcance local (só no Google): T-AUT-06 e H1 (e-mail da sessão com "Executar como: eu"), cotas de e-mail, tempo real de gravação de arquivos de 10 MB, `appendRow` com o apóstrofo inicial, `noReply`, comportamento do `ScriptLock` com vários alunos ao mesmo tempo. Os casos T-CON-02 a 06, T-DUP-04/05, T-DOC-01/02/04/05/07/08 e T-PRZ-04 dependem dos PRs 1, 4, 5 e 6.

### Montar a homologação (com ordem do responsável)

1. Projeto `GRADIP · Formulário de Pedido de Colação de Grau · HOMOLOGACAO` (D14, já criado pelo responsável). Nele, o responsável configura as Script Properties `ID_INDEX_SPREADSHEET_ID` e `AMBIENTE = homologacao`.
2. Criar, numa pasta de testes, as cópias **fictícias**: `PEDIDOS_COLACAO` (rodar `prepararPlanilhaPedidosColacao` pelo editor, que cria as quatro abas), uma pasta vazia para `PASTA_PROVISORIOS_COLACAO`, `PLANILHA_ALUNOS`, `PERIODOS` e a aba `Diplomas` a partir de [dados-ficticios/](dados-ficticios/README.md). Na `PLANILHA_ALUNOS` de teste, trocar os e-mails `exemplo.usp.br` pelas contas de teste reais **só na cópia**.
3. Preencher a coluna **Homologação** do `ID_INDEX` para `PEDIDOS_COLACAO`, `PASTA_PROVISORIOS_COLACAO`, `PLANILHA_ALUNOS`, `PERIODOS` e `EMISSAO_DIPLOMAS`.
4. `clasp status` e `clasp push` deste ramo **só para o projeto de homologação**, com ordem específica. Rodar `diagnosticarConfiguracao` pelo editor: todas as chaves "ok", período aberto, nenhuma aba com erro.
5. Implantar como Web App: **Executar como: eu** e **Quem pode acessar: qualquer pessoa na USP** (domínio). Não compartilhar planilha nem pasta com as contas de teste.

### Roteiro

| ID | Passo | Esperado |
| --- | --- | --- |
| H1 | abrir com uma conta `@usp.br` que **não** é a institucional | formulário abre; o e-mail da conta aparece no campo "E-mail USP" (prova de que a sessão chega com "Executar como: eu") |
| H2 | abrir com conta fora do domínio | só o aviso de conta não identificada |
| H3 | conta de teste sem nenhum acesso às planilhas (T-AUT-06) envia com o cadastro confirmado | protocolo `PCG-20262-00001`, data e hora; linha em `PROTOCOLOS` com RECEBIDO; dois arquivos na subpasta; recibo com `[HOMOLOGAÇÃO]` |
| H4 | clicar duas vezes em "Enviar", recarregar no meio do envio e enviar de novo | um protocolo, uma versão, dois arquivos |
| H5 | conta sem linha na planilha de teste | protocolo com "cadastro em conferência"; `Cadastro = PENDENTE` |
| H6 | conta sem cadastro digita o nº USP de outra pessoa de teste | mesma tela e mesmo recibo do H5; `Motivo do cadastro = CONFLITO_NUSP`; nenhum dado da outra pessoa na página |
| H7 | corrigir o pedido do H3 trocando só o RG | versão 2; certidão como `REUTILIZADO` com o mesmo ID de arquivo; o RG antigo continua na pasta, fora da lixeira |
| H8 | preencher "Conferido" em "Status — Dados Pessoais" da linha com o Registro ID do H3 na aba `Diplomas` de teste | o formulário não oferece correção |
| H9 | arquivos inválidos: `.exe` renomeado para `.pdf`, arquivo de 11 MB, HTML | recusados com mensagem; nada gravado |
| H10 | "Meus pedidos": ver os pedidos e reenviar o comprovante | chega um segundo recibo; outra tentativa em menos de 2 minutos é recusada |
| H11 | fechar o período em `PERIODOS` de teste e abrir a página | tela de formulário fechado com "Meus pedidos" |
| H12 | ver o registro de execução do projeto | sem nome, nº USP, e-mail, RG ou IDs |

### Rodada 1 (10/11/2026, código `ece028c`)

Projeto `GRADIP · Formulário de Pedido de Colação de Grau · HOMOLOGACAO`, recursos da coluna Homologação, implantação de teste com "Executar como: eu" e acesso restrito à USP. Conferência pelo responsável com cópias da `PEDIDOS_COLACAO`, prints e o registro de execuções.

| ID | Resultado |
| --- | --- |
| H1 | ok: e-mail da sessão chega com "Executar como: eu"; cadastro confirmado só leitura; faixa de homologação |
| H2 | ok nas duas camadas: com acesso USP o Google barra; com "qualquer pessoa" o servidor recebe e-mail vazio e mostra só o aviso |
| H3 | ok: protocolo CONFIRMADO, quatro abas e subpasta corretas, recibo `[HOMOLOGAÇÃO]` sem RG; caso com divergência apontada deu `DIVERGENCIA_APONTADA` |
| H4 | ok: um envio, uma versão. Achado: correção idêntica virava versão nova (corrigido em `ca5472f`) |
| H5 | ok: `SEM_CADASTRO`, mesma tela de cadastro em conferência |
| H6 | ok: `CONFLITO_NUSP`, mesma tela; pedido não bloqueado (requisito 4) |
| H7 | ok: versão 2, certidão `REUTILIZADO` com o mesmo arquivo, RG antigo mantido na subpasta |
| H8 | ok: com "Status — Dados Pessoais" preenchido, sem botão de correção |
| H9 | ok: `.txt` renomeado, arquivo de 11 MB e HTML recusados. Achado: prefixo "Error:" no aviso (corrigido em `a4b2163`) |
| H10 | ok no servidor (um reenvio a cada 2 minutos). Achado: aviso de espera só no topo da página (corrigido em `d0dd822`) |
| H11 | ok: tela de período fechado com "Meus pedidos" |
| H12 | ok: registro sem dados pessoais nem IDs |

Pedido do responsável na rodada: destacar o campo do problema na validação (`3d4898a`). Observação sem correção: `obterDadosIniciais` levou cerca de 10 s. Pendente: push dos ajustes e nova conferência de H10 e da validação.

**Retorno:** a 2.0 não substitui nada em uso; desfazer a homologação é arquivar a implantação de teste. Nenhum dado de produção é tocado: o projeto de homologação lê só a coluna Homologação.
