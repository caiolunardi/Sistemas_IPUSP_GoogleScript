# Contratos públicos do backend — baseline recebida

Inventário extraído das declarações de função dos arquivos `.gs` em `Codigos.zip` (23/10/2026). “Pública” aqui significa **nome de função Apps Script sem sufixo privado**; **não** significa que a função seja autorizada para usuários externos. A autorização por identidade e a exposição efetiva precisam ser auditadas no projeto Google.

## Cadastro, listagem e detalhe — DiplomasBackend.gs

| Endpoint | Parâmetros | Operação no modelo |
|---|---|---|
| `doGet(e)` | Evento HTTP | Entrega UI e pode disparar migração `Registro ID/Versão`; potencial **escrita** |
| `obterColacoes()` | — | Leitura de períodos existentes |
| `obterAlunos(colacao, statusDesejado)` | Colação, etapa/filtro | Lista |
| `obterDetalheAluno(registroId)` | ID do pedido | Dados detalhados |
| `obterTiposDeArquivo()` | — | Tipos disponíveis em INFOS |
| `adicionarAluno(colacao, dados)` | Colação e dados de cadastro | **Cria pedido** |
| `salvarEdicaoAluno(registroId, versaoEsperada, dados)` | ID, versão, valores | **Altera cadastro** |
| `salvarDadosPessoaisEConfirmar(...)` | ID, versão, dados | **Confirma etapa e edita** |
| `confirmarDadosPessoais(registroId, versaoEsperada)` | ID, versão | **Avança** |
| `devolverParaConferencia(registroId, versaoEsperada)` | ID, versão | **Volta etapa** |
| `salvarRequisitosEAvancar(registroId, versaoEsperada, requisitos)` | ID, versão, requisitos | **Confirma histórico e avança** |
| `devolverParaHistorico(registroId, versaoEsperada)` | ID, versão | **Volta etapa** |
| `salvarColacaoEAvancar(registroId, versaoEsperada, colacao)` | ID, versão, por habilitação | **Confirma colação e avança** |
| `devolverParaColacao(registroId, versaoEsperada)` | ID, versão | **Volta etapa** |
| `salvarDiplomaEEnviarEmail(registroId, versaoEsperada, diplomas, reenviar)` | ID, versão, flags e reenvio | **Altera e envia e-mail** |

## Pastas, arquivos, documentos e e-mails

| Endpoint | Operação, risco para homologação |
|---|---|
| `garantirPasta(registroId)` | **Pode criar pasta** e preencher vínculos; não é apenas consulta |
| `uploadArquivo(registroId, tipoArquivo, nomeArquivoOriginal, mimeType, base64)` | **Cria arquivo**; conferir extensões, MIME, tamanho, pasta e autorização |
| `excluirArquivo(registroId, idArquivo)` | **Exclui anexo**, com validação de pertencimento |
| `obterObservacoes(registroId)` | Consulta observações do aluno |
| `salvarObservacoes(registroId, texto, versaoArquivoEsperada)` | **Grava observações** em arquivo controlado |
| `gerarDocumento(registroId, tipoDocumento, dataColacao)` | **Gera/salva PDF** de certificado ou ofício |
| `gerarZipDocumentos(registroIds, tipoDocumento, dataColacao)` | Gera documentos para lote |
| `gerarListaFormandos(registroIds, dataColacao)` | **Gera documento de lote** |
| `enviarEmailColacaoLote(registroIds, dataColacao, horaColacao)` | **Envia mensagens** para lote |
| `enviarEmailColacaoIndividual(registroId, versaoEsperada, dataColacao, horaColacao, reenviar)` | **Envia mensagem** |
| `desmarcarEmailEnviado(registroId, versaoEsperada, tipo)` | **Muda controle de envio** |
| `excluirAluno(registroId, versaoEsperada)` | **Exclusão de pedido e efeitos em arquivos** |
| `excluirAlunosEmLote(registroIds)` | **Exclusão em lote**, risco elevado |

## Histórico — análise e consultas

| Endpoint | Parâmetros | Observação |
|---|---|---|
| `prepararAnaliseHistorico(registroId, versaoEsperada)` | ID/versão | Checa pedido, etapa e documentos |
| `historicoCriarSessaoAnalise(registroId, versaoEsperada)` | ID/versão | Cria UUID e token HMAC |
| `obterDocumentoHistoricoParaAnalise(registroId, versaoEsperada, chaveHabilitacao)` | ID/versão/`psi`,`bach`,`lic` | Retorna documento validado para leitura no cliente |
| `avaliarHistoricoExtraido(registroId, versaoEsperada, chaveHabilitacao, sessaoAnaliseId, dadosExtraidos, arquivoEsperado, tokenSessao)` | Sessão e extração | **Grava auditoria** e devolve parecer; não avança etapa Diplomas |
| `historicoListarSessoesAnalise(registroId)` | ID | Lê histórico |
| `historicoObterSessaoAnalise(registroId, sessaoAnaliseId)` | ID/sessão | Reconstitui sessão, não recalcula |
| `historicoObterUltimaSessaoAnalise(registroId)` | ID | Reconstitui última |
| `historicoVerificarVersaoRelatorioIndividual(registroId, sessaoAnaliseId)` | ID/sessão | Decide necessidade de versionamento |
| `historicoPreflightRelatoriosLote(itens)` | Itens | Verifica lote antes de gerar |
| `historicoGerarRelatorioIndividual(registroId, sessaoAnaliseId, modoVersionamento)` | ID/sessão/modo | **Gera PDF** com versionamento |
| `historicoGerarRelatorioConsolidado(alunos, loteInfo)` | Lote | **Gera PDF consolidado** |

## Administração — atenção crítica

`migrarAnaliseHistoricoRelatoriosV1()`, em `HistoricoAuditoria.gs`, altera o cabeçalho da planilha de regras para garantir `sessao_analise_id`; foi concebida para execução manual única e idempotente. Entretanto o nome público exige **verificação de autorização de invocação**, inclusive pelo cliente. Não executar no âmbito documental.

## Segurança dos contratos

As checagens `Versão` e `Registro ID` evitam várias classes de inconsistência, mas não substituem política de autorização por usuário. O ZIP não fornece manifesto nem evidência de execução/deploy para provar o controle de acesso. Para cada endpoint que lê dados pessoais ou escreve, exigir teste de conta não autorizada e chamada direta no futuro PR operacional. **Nenhum endpoint foi chamado nesta rodada.**
