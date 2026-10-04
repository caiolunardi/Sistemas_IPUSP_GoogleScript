# Arquitetura — Estrutura Curricular e Grade Horária 1.8.0

## Plataforma

Projeto **independente** em Google Apps Script, implantado como Web App. O material recebido especifica fuso `America/Sao_Paulo`, V8, execução como a conta que implantou, frontend via `HtmlService` e comunicação por `google.script.run`.

Como o App executa como a conta do implantador, usuários autorizados não precisam receber acesso direto às planilhas. A autorização no backend é, portanto, parte da fronteira de segurança.

## Organização do código

O snapshot 1.8.0 declara **27 arquivos na raiz do Apps Script**.

### Servidor

| Arquivo | Responsabilidade |
|---|---|
| `Codigo.gs` | `doGet`, `include_`, versão |
| `Configuracao.gs` | Script Properties, `ID_INDEX`, cache e diagnóstico |
| `Acesso.gs` | identificação e perfis |
| `Esquema.gs` | abas, colunas, formatos, proteções e metadados |
| `Planilha.gs` | leitura/escrita por título de coluna |
| `Importacao.gs` | validação, prévia e confirmação |
| `Gravacao.gs` | manifesto, diário, preparação, ativação, arrumação e recuperação |
| `Consulta.gs` | dados da estrutura para o painel |
| `Preparacao.gs` | ajustes, exclusões, outros cursos e seleção |
| `EnvioGrade.gs` | backup, índice, envio e fórmula de horário |
| `AuditoriaGrade.gs` | auditoria por semestre e acionadores |
| `AuditoriaPainel.gs` | agregação para o painel de auditoria |
| `Utilidades.gs` | respostas, erros, texto seguro, datas, e-mail e hash |

### Interface

`Painel.html`, `PainelEstilos.html`, `PainelApp.html`, `PainelImportacao.html`, `PainelPreparacao.html`, `PainelAuditoria.html`, `LeitorComum.html`, `LeitorCsv.html`, `LeitorPdf.html`, `LeitorPdfFontes.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html` e `GradipMarcaUSP.html`.

Na planilha das secretarias existe um projeto separado mínimo com `Validacoes.gs`.

## Configuração por índice

Nenhum ID operacional deve ficar no código. A única propriedade direta é `ID_INDEX_SPREADSHEET_ID`; a partir dela, o sistema procura chaves na primeira aba do índice.

Chaves documentadas:

- `ESTRUTURA_CURRICULAR`;
- `GRADE_HORARIA_PREENCHIMENTO`;
- `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`;
- `BACKUP_GRADES_ANTERIORES`;
- `AUDITORIA_GRADES_ANTERIORES`;
- `PERMISSOES_DE_ACESSO`.

## Perfis

A partir da 1.7.0, os perfis vêm da aba `ESTRUTURA_CURRICULAR` de `PERMISSOES_DE_ACESSO`. `ADMINISTRADOR` grava; `LEITOR` consulta estrutura e auditoria; conta fora da lista recebe `SEM_ACESSO`. E-mail repetido deve resultar no menor privilégio.

## Planilha-base

O esquema atual é **3**, com nove abas de negócio: `Sobre`, `Disciplinas`, `Disciplinas por habilitação`, `Requisitos`, `Currículos`, `Importações`, `Alterações`, `Ajustes manuais` e `Disciplinas para outros cursos`.

A leitura/escrita usa **títulos de coluna**, permitindo reordenar colunas e preservar colunas extras. `Observações` é preservada.

## Metadados de controle

- `estruturaCurricular.esquema`;
- `estruturaCurricular.ativa` — manifesto da versão ativa;
- `estruturaCurricular.gravacao` — diário de gravação;
- `estruturaCurricular.recomeco` — recomeço da base.

## Gravação segura

O Sheets não oferece transação entre abas. O desenho documentado prepara cópias `_nova_*`, registra diário, confere a base, ativa tudo com **uma escrita do manifesto** e só depois arruma nomes/visibilidade/proteção. O manifesto é a fonte de verdade para leitores.

Falhas são distinguidas em `NAO_GRAVADA`, `RESULTADO_INCERTO` e conclusão com arrumação pendente.

## Leitura consistente

Painel e prévia leem manifesto → dados por ID → manifesto novamente. Se o manifesto mudar, repetem; após tentativas documentadas, retornam `BASE_EM_ATUALIZACAO` em vez de misturar versões.

## Funções públicas principais

`obterDadosPainel`, `prepararImportacao`, `confirmarImportacao`, `obterPaginaRevisao`, `verificarImportacao`, `salvarDisciplina`, `excluirDisciplinas`, `adicionarAGrade`, `removerDaGrade`, `cadastrarNovaGrade`, `cadastrarDisciplinaOutros`, `previaDisciplinasUnidade`, `incluirDisciplinasUnidade`, `enviarGradeParaPreenchimento`, `obterAuditoriaGrade`, `registrarEdicaoGrade`, `registrarAberturaGrade`, `ativarAuditoriaGrade`, `desativarAuditoriaGrade`, `diagnosticarConfiguracao` e `diagnosticarEnvioGrade`.

Auxiliares terminam em `_`; acionadores públicos precisam validar eventos reais do Google.

## Auditoria

Cada semestre tem uma planilha própria. O índice relaciona semestre, cópia de segurança e auditoria. Dois acionadores instaláveis registram edição e abertura. Eventos do próprio sistema são anotados explicitamente.

## Dependências no navegador

PDF com texto usa PDF.js. PDF sem texto usa Tesseract.js e modelo português `tessdata_fast`. O OCR roda no navegador; o arquivo não é enviado ao Drive para reconhecimento.
