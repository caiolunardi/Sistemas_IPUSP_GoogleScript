# Arquitetura e limites de confiança

## Camadas

**Apresentação:** `DiplomasApp.html`, os três módulos de ajuda, `HistoricoAnaliseUI.html` e estilos. **Operação:** `DiplomasBackend.gs` (planilha Diplomas, INFOS, Alunos, Drive, e-mails, modelos Docs). **Histórico:** `HistoricoArquivo.gs`/`HistoricoConfig.gs` → `HistoricoParser.html` no navegador → `HistoricoEndpoints.gs` → `HistoricoRegrasRepository.gs` → `HistoricoMotor.gs` → `HistoricoAuditoria.gs`; consulta em `HistoricoConsulta.gs`, PDFs em `HistoricoRelatorio.gs`.

**PDF.js do aplicativo Diplomas:** `3.11.174`, escrito também no parser incluído como HTML. Não confundir com PDF.js 6.4.299 da Estrutura Curricular.

## Análise de histórico

1. Servidor confirma registro, versão e etapa; obtém habilitações ativas.
2. Localiza **Histórico Escolar Completo** por nome convencionado na pasta validada. Nunca escolhe arbitrariamente entre documentos duplicados.
3. Cria `sessaoAnaliseId` e token HMAC-SHA256 ligado ao Registro ID e à Versão; chave da sessão fica em Script Properties.
4. Envia PDF autorizado ao navegador para extração PDF.js de texto/semestres/disciplinas.
5. Recebe dados extraídos e revalida arquivo, MIME, tamanho e SHA-256, identidade/Nº USP, curso e habilitação; lê regras vigentes, aplica o motor e registra auditoria.
6. Retorna `APTO`, `NAO_APTO` ou `CONFERIR` com motivos. A análise **não avança o aluno automaticamente**.

**Limite explícito do código:** o SHA-256 vincula a análise ao arquivo presente no Drive, **não confirma que o navegador extraiu corretamente cada dado**. O servidor não replica o parser. A Licenciatura está configurada, porém `implementado: false` nesta baseline.

Quando Psicólogo e Bacharelado estão ativos juntos, o sistema usa o PDF de Psicólogo uma vez para duas avaliações, cada uma com seu ruleset. Não há fallback automático para históricos “Final” ou “Sujo”.

## Regras curriculares

A seleção depende de **curso extraído do PDF + habilitação alvo + ruleset ATIVO**. Nenhum ou mais de um candidato produz resultado não verificável; não escolhe por ordem. Regras são lidas por nome de coluna em `CURRICULOS`, `REQUISITOS_NUMERICOS`, `DISCIPLINAS` e `GRUPOS_REGRAS`. `AUDITORIA_REGRAS_CURRICULARES` testemunha estabilidade da revisão e é lida, não editada pelo app. Versão do ruleset e revisão do mesmo ruleset são distintas.

## Concorrência e persistência

Registro ID identifica o pedido; número de linha nunca é aceito como identificador do cliente. `Versão` + `LockService` evitam sobrescrita concorrente nas operações suportadas. A pasta central é localizada por Nº USP; registros de colações diferentes podem compartilhar pasta. Arquivo de histórico é selecionado no servidor. A auditoria de análises é append-only, uma linha por habilitação por sessão. Sessões legadas não são agrupadas por aproximação de horário.

Consultas reconstroem dados auditados sem reexecutar PDF.js ou o motor. Relatórios geram documentos via `DocumentApp`, conversão PDF e armazenamento `DriveApp`, não reavaliam critérios.

**Riscos a validar:** autorização server-side/conta do deploy; `doGet` pode escrever IDs/Versões; migração administrativa pública de cabeçalho; ausência de transação atômica entre Sheets e Drive; relatório PDF temporário e suas falhas.
