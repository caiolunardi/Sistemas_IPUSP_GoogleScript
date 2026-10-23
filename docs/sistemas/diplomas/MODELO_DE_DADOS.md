# Modelo de dados e integração

Fonte dos cabeçalhos: objeto `CABECALHOS` em `DiplomasBackend.gs`. Títulos devem corresponder **exatamente** à linha 1 da aba `Diplomas`; são expectativa do código, **não conferência das planilhas reais**.

## Aba Diplomas — grupos e títulos de coluna

| Grupo | Cabeçalhos esperados |
|---|---|
| Controle | `Registro ID`; `Versão` |
| Identidade | `Nome completo`; `Nº USP`; `E-mail`; `M/F`; `Nº RG` |
| Pedidos | `Habilitação(ões) solicitada(s)`; `Colação` |
| Formação | `Bacharelado — concluiu?`; `Bacharelado — ano`; `Licenciatura — concluiu?`; `Licenciatura — ano`; `Formação de Psicólogo(a) — concluiu?`; `Formação de Psicólogo(a) — ano` |
| Pasta | `Link da pasta no Drive`; `ID da Pasta` |
| Documentos | `Ofício gerado?`; `Certificado gerado?`; `Diploma Expedido` |
| Colação por habilitação | `Colação Bacharelado Realizada`; `Colação Licenciatura Realizada`; `Colação Psicólogo Realizada` |
| Diploma por habilitação | `Diploma Bacharelado Emitido`; `Diploma Licenciatura Emitido`; `Diploma Psicólogo Emitido` |
| Mensagens | `E-mail Diploma Enviado`; `E-mail Colação Enviado` |
| Etapas/requisitos | `Status — Dados Pessoais`; `Status — Histórico Escolar`; `Status — Colação e Encerramento`; `Bacharelado — Cumpre Requisitos`; `Licenciatura — Cumpre Requisitos`; `Formação de Psicólogo(a) — Cumpre Requisitos` |

A inicialização pode criar `Registro ID` e `Versão`; outras rotinas criam colunas opcionais, quando aplicável.

## Aba INFOS

Define tipos de arquivo/nomes esperados para upload e histórico. Campos do(a) Secretário(a) Geral usado(a) em ofício são lidos por **posição fixa** (nome em C, gênero em D, linha configurada). Alterações manuais no layout podem afetar documentos.

## Planilha central de Alunos

A fonte espera aba `Página1` e usa colunas fixas: Nº USP=A, nome=B, e-mail institucional=D e ID da pasta=E. É a referência para a pasta do aluno; a planilha de Diplomas contém cache de pasta. Concorrência entre projetos Apps Script diferentes não é integralmente coberta pelo ScriptLock local.

## Planilha Regras Curriculares

| Aba | Papel |
|---|---|
| `README` | Metadados da planilha; não é fonte autoritativa do ID operacional |
| `CURRICULOS` | Rulesets, curso/habilitação, estrutura, status, versão/revisão, vigência e limites de semestres |
| `REQUISITOS_NUMERICOS` | Critérios quantitativos, operadores e obrigatoriedade |
| `DISCIPLINAS` | Siglas/status acadêmicos de disciplinas |
| `GRUPOS_REGRAS` | Grupos e respectivas condições |
| `DICIONARIO` | Vocabulários/resultados |
| `AUDITORIA_REGRAS_CURRICULARES` | Histórico de mudanças dos rulesets, lido como guarda |
| `ANALISE_HISTORICO` | Auditoria de análises: uma linha por habilitação; append-only |

`ANALISE_HISTORICO` contém vínculo a arquivo/hash, código do curso, versão de parser/motor, ruleset/revisão, resultado, motivos, execução e sessão. Campos `confirmado`, `confirmado_em`, `confirmado_por`, `observacao` são reservados a preenchimento manual da equipe. Migração `migrarAnaliseHistoricoRelatoriosV1` cria a coluna `sessao_analise_id`, sem backfill.

**Não confundir:** `AUDITORIA_REGRAS_CURRICULARES` registra edição das regras; `ANALISE_HISTORICO` registra aplicação das regras ao histórico de um aluno.

Qualquer migração futura entre planilhas deve usar mapeamento explícito por cabeçalho e distinguir identidade do aluno, pedido de colação e sessão de análise; não deduplicar por nome nem por linha.
