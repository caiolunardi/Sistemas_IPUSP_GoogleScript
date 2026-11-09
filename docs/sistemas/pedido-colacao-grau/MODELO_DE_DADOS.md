# Modelo de dados e efeitos colaterais — formulário legado

**Fonte:** `Codigo(1).gs` recebido em 06/11/2026. Sem inspeção de dados/abas reais; títulos e posições abaixo são os definidos no **código enviado**, não certificação de esquema implantado.

## A. Planilha `PLANILHA_ALUNOS`

Aba `Página1` no legado, colunas **fixas por posição**, lidas e parcialmente escritas:

| Coluna | Conteúdo esperado | Leitura/escrita |
| --- | --- | --- |
| A | Nº USP | busca por aluno; insere quando não encontrou e-mail |
| B | Nome | pré-preenchimento; insere no novo cadastro |
| C | Ingresso | lê os primeiros 4 dígitos; se vazio, grava o ano + `/1` |
| D | E-mail USP | localização por e-mail; insere para novo cadastro |
| E | ID da Pasta | reutiliza; cria pasta se não existir e grava novo ID |
| F | E-mail secundário | pré-preenche; grava quando preenchido |

Há código para autocadastro e recuperação de pasta sob trava. A consistência entre cadastro encontrado pelo e-mail, nº USP informado e pasta efetivamente utilizada **precisa de validação específica**. O Gerenciador compartilha a pasta central pelo nº USP.

## B. Planilha `PERIODOS`

Primeira aba, colunas A–M. A = identificador do formulário; C = tipo; D–G = primeira janela; H–K = segunda janela; M = semestre. A coluna L não é utilizada pelo leitor do formulário. O código `AAAAS` fica na planilha de Diplomas, derivado de M. Ver [fluxos](FLUXOS_E_REGRAS.md#2-período-e-semestre) e módulo de configuração do Painel dos Servidores.

## C. Planilha `EMISSAO_DIPLOMAS` — aba `Diplomas`

O formulário resolve pelo **texto exato da linha 1**, com possibilidade de criar colunas. A ordem física não é codificada, exceto pela procura por título. Contrato dos **24 campos** do objeto `CABECALHOS_DIPLOMAS`:

| Chave interna | Cabeçalho exato | Novo pedido | Correção do pedido |
| --- | --- | --- | --- |
| `registroId` | `Registro ID` | UUID | preserva |
| `versao` | `Versão` | 1 | incrementa |
| `nome` | `Nome completo` | nome informado | regrava |
| `nUsp` | `Nº USP` | nº USP | regrava |
| `email` | `E-mail` | login institucional | regrava |
| `habilitacaoTexto` | `Habilitação(ões) solicitada(s)` | texto legível derivado | regrava |
| `rg` | `Nº RG` | número digitado | regrava |
| `status` | `Status — Dados Pessoais` | vazio | preserva |
| `colacao` | `Colação` | `AAAAS` | regrava |
| `bachConcluiu` | `Bacharelado — concluiu?` | SIM/NÃO | regrava |
| `bachAno` | `Bacharelado — ano` | ano se SIM | grava se SIM; não limpa quando NÃO |
| `licConcluiu` | `Licenciatura — concluiu?` | SIM/NÃO | regrava |
| `licAno` | `Licenciatura — ano` | ano se SIM | grava se SIM; não limpa quando NÃO |
| `psiConcluiu` | `Formação de Psicólogo(a) — concluiu?` | SIM/NÃO | regrava |
| `psiAno` | `Formação de Psicólogo(a) — ano` | ano se SIM | grava se SIM; não limpa quando NÃO |
| `telefone` | `Telefone Celular` | contato | regrava |
| `emailAlternativo` | `E-mail Alternativo` | contato alternativo | regrava |
| `procuracao` | `Colação por Procuração?` | SIM/NÃO | regrava |
| `procuradorNome` | `Procurador(a) — Nome` | se SIM, senão vazio | regrava |
| `procuradorRg` | `Procurador(a) — RG/CIN` | se SIM, senão vazio | regrava |
| `colacaoAntecipada` | `Colação Antecipada?` | SIM/NÃO | regrava |
| `observacoesAluno` | `Observações do Aluno` | texto opcional | regrava |
| `permaneceMatriculado` | `Permanecerá Matriculado?` | SIM/NÃO | regrava |
| `habilitacaoPendente` | `Habilitação(ões) Pendente(s)` | texto separado por vírgula | regrava |

**Compatibilidade:** os cabeçalhos acadêmicos básicos coincidem com os homônimos encontrados no Gerenciador 4.0 (repo, `DiplomasBackend.gs`); os campos extras do formulário são criados quando não existem. Divergência de acento, travessão ou espaço pode criar uma coluna duplicada. A matriz é a fonte documental do contrato de escrita do **legado**; não autoriza mudança de cabeçalho, dado real ou migração. O formulário não grava os status de Histórico Escolar, Colação/Encerramento ou Diploma.

## D. Pasta Drive e anexos

A pasta raiz compartilhada é a chave lógica **`PASTA_RAIZ_ALUNOS`**, mas o legado a referencia por URL/ID literal no código. A pasta do aluno é reutilizada pelo ID guardado em `PLANILHA_ALUNOS` (E) ou criada sob a raiz, com nome composto por aluno e nº USP.

**Nome final de arquivos no formulário legado:** `<nome> - <nº USP> - RG<ext>` e `<nome> - <nº USP> - Certidão de Nascimento<ext>`. Não inclui `Colação`, `Registro ID` nem habilitação. Em mesmo nome final, grava o novo arquivo e envia o antigo à lixeira **automaticamente**; extensão distinta gera nome diferente, sem política de versões. O fluxo não grava, na linha de pedido, IDs individuais dos anexos enviados.

**Diferença frente ao Gerenciador:** o upload administrativo usa outra convenção, `<tipo> - <nome> - <colação>.<ext>`. Os dois aplicativos atuam sobre a pasta compartilhada; não é seguro inferir que arquivos com nomes diferentes representem a mesma prova documental ou que uma substituição no formulário seja isolada de colações anteriores.

## E. Consistência e transações

Gravação fracionada: cadastro central → pasta → primeiro arquivo → segundo arquivo → linha de pedido. Sem transação única, sem rollback e com `ScriptLock` apenas dentro deste projeto. Não pressupor integridade caso haja exceção ou concorrência com o Gerenciador.

## F. Planilha `PEDIDOS_COLACAO` (formulário 2.0)

Planilha nova, chave `PEDIDOS_COLACAO` do `ID_INDEX`, com acesso só da conta institucional e de quem administra. Colunas localizadas pelo **título** da linha 1 (ordem livre); falta de aba ou de título é falha fechada, sem gravar. Todo texto é gravado com o apóstrofo inicial do Sheets, para data/hora, `2026/2`, nº USP e colação não virarem data ou número. Linhas nunca são apagadas; a única mudança em linha existente é RECEBENDO → RECEBIDO (com a hora da conclusão).

| Aba | Quem grava | Uma linha por | Colunas |
| --- | --- | --- | --- |
| `PROTOCOLOS` | formulário | pedido | Protocolo, Protocolo ID, Chave de envio, E-mail da sessão, Recebimento, Cadastro, Motivo do cadastro, Recebido em, Recebimento concluído em, Colação, Janela do período, Semestre do período, Nº USP informado, Nome informado, Registro ID, Pasta do protocolo |
| `VERSOES` | formulário | versão do pedido (1 no envio, +1 a cada correção) | Protocolo ID, Versão, Chave de envio, E-mail da sessão, Situação, Enviada em, Concluída em, Dados do pedido (JSON) |
| `DOCUMENTOS` | formulário | documento apresentado numa versão | Documento ID, Protocolo ID, Versão, Chave do documento, Tipo (`RG`, `CERTIDAO`), ID do arquivo, Origem (`ENVIADO`, `REUTILIZADO`), Documento de origem, SHA-256, Tamanho (bytes), Formato (`PDF`, `JPEG`, `PNG`), Situação, Registrado em |
| `EVENTOS` | formulário | evento | Quando, Protocolo ID, Versão, Evento (`PROTOCOLO_CRIADO`, `CORRECAO_INICIADA`, `RETOMADA`, `RECEBIDO`, `CORRECAO_RECEBIDA`, `RECIBO_ENVIADO`, `RECIBO_FALHOU`), Campos alterados (só os nomes) |
| `DECISOES_CADASTRO` | Gerenciador de Pessoas (PR 5) | decisão | o formulário lê `Protocolo ID` e `Decisão`, se a aba existir |
| `ENCAMINHAMENTOS` | Gerenciador de Diplomas (PR 4) | tentativa de encaminhamento | o formulário lê `Protocolo ID` e `Resultado`, se a aba existir |

**Datas e horas:** ISO 8601 com o fuso (`2026-11-30T23:59:58.000-03:00`). "Recebido em" é gravado uma vez e nunca reescrito; a correção tem a própria hora em "Enviada em".

**"Dados do pedido" (JSON da versão):** usa as chaves internas do legado (`nome`, `nUsp`, `anoIngresso`, `rg`, `telefone`, `emailAlternativo`, `bachConcluiu`, `licConcluiu`, `psiConcluiu`, `permaneceMatriculado`, `habilitacaoPendente` (lista), `procuracao`, `procuradorNome`, `procuradorRg`, `colacaoAntecipada`, `observacoesAluno`) mais `divergenciaApontada`, `cadastro`, `colacao` e `ano`. Assim o encaminhador do PR 4 monta a linha da aba `Diplomas` com os mesmos 24 cabeçalhos da seção C. Texto que começaria por `=`, `+`, `-` ou `@` já vem com o apóstrofo.

**Pasta `PASTA_PROVISORIOS_COLACAO`:** uma subpasta por protocolo, com o nome do protocolo. Arquivos novos: `<Tipo> - <nome> - <AAAAS> - <protocolo> - v<n>.<ext>` (`RG-CIN` ou `Certidão de Nascimento`), que nunca coincide com o nome gerado pelo Gerenciador. Na correção, o documento não trocado é registrado de novo como `REUTILIZADO`, apontando para o mesmo arquivo; nada é copiado, movido, renomeado ou mandado para a lixeira.

Dados fictícios para montar a homologação: [dados-ficticios/](dados-ficticios/README.md).
