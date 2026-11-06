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

O formulário resolve pelo **texto exato da linha 1**, com possibilidade de criar colunas. A ordem física não é codificada, exceto pela procura por título. Contrato dos **25 campos** do objeto `CABECALHOS_DIPLOMAS`:

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
