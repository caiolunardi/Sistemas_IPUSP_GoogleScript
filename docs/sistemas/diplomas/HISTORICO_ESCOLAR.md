# Análise de Histórico Escolar — módulo completo

Este documento detalha o motor, parser, auditoria e relatórios encontrados na fonte, sem atribuir ao aplicativo qualquer homologação não demonstrada.

## 1. Tipos de documento e habilitações

| Chave | Habilitação no código | Tipo de arquivo esperado | Motor automático |
|---|---|---|---|
| `psi` | Formação de Psicólogo(a), código de habilitação `0` | Histórico Escolar Completo USP (Psicólogo) | Sim |
| `bach` | Bacharelado, código `100` | Histórico Escolar Completo USP (Bacharelado) | Sim |
| `lic` | Licenciatura, código `200` | Histórico Escolar Completo USP (Licenciatura) | **Não implementado** |

O servidor seleciona o documento pela **convenção exata de tipo + nome + colação** na pasta gerenciada, sem confiar em um ID arbitrário enviado pelo navegador. Candidatos duplicados ou inexistentes geram indisponibilidade. PDF “Final” ou “Sujo” não é fallback para “Completo” nesta baseline.

Para Psicólogo + Bacharelado simultâneos, o módulo lê o PDF de Psicólogo uma única vez, mas produz **duas avaliações** com regras por habilitação.

## 2. Extração, autenticação e reconciliação

PDF.js **3.11.174** opera no navegador e recompõe linhas de texto pela posição X/Y dos itens. Não há caminho de OCR com Tesseract identificado neste parser; arquivo apenas digitalizado pode produzir extração insuficiente. O servidor emite `sessaoAnaliseId` mais token HMAC-SHA256 vinculado a ID e versão do pedido. Para avaliar, verifica token, estado, arquivo resolvido, MIME/tamanho e SHA-256.

A reconciliação verifica dados de identidade (inclusive Nº USP), curso e habilitação, respeitando o cenário em que o documento do Psicólogo serve de base à avaliação de Bacharelado. Os estados de reconciliação incluem `OK`, `ERRO_ASSOCIACAO_DOCUMENTO`, `HABILITACAO_FALTANDO` e `EXTRACAO_INCOMPLETA`.

**Não há validação semântica independente dos dadosExtraidos no servidor.** A integridade SHA-256 do arquivo é necessária, mas não prova que o parser interpretou corretamente créditos e status.

## 3. Seleção das regras e motor

`CURRICULOS` é lida da planilha de Regras Curriculares. O módulo combina **curso do PDF + habilitação alvo + ruleset ATIVO**. Zero regras compatíveis ou pluralidade de regras ativas impedem decisão automática. Versão e revisão são registradas separadamente. A guarda consulta `AUDITORIA_REGRAS_CURRICULARES` para evitar analisar usando regras alteradas durante a execução.

O motor:
- avalia limites de semestres do curso (inclusive verificações de estrutura da extração);
- avalia requisitos numéricos por operador, obrigatoriedade e disponibilidade de campo;
- calcula compensação de créditos eletivos/livres quando o ruleset expressamente permite;
- confere disciplinas individuais por sigla/situação;
- avalia grupos de disciplinas e condições de cumprimento;
- compõe motivação e resultado global.

Valores nulos, campos ausentes, booleanos de configuração ilegíveis e estrutura de extração inconsistente levam a estado **CONFERIR**, nunca a “zero” ou “cumprido” por padrão. `APTO` e `NAO_APTO` expressam aplicação das regras disponíveis, sem substituir ato acadêmico humano.

## 4. Auditoria e sessões

`ANALISE_HISTORICO` registra uma linha por habilitação, com execução e sessão, documento/hash, versões de parser, motor, ruleset e revisão, resultado, razões e detalhes. É append-only. Uma sessão agrupa análises executadas juntas; registros legados sem `sessao_analise_id` não são agrupados artificialmente por horário. Consulta de sessão usa os valores preservados, **não reaplica ruleset atualizado**.

Quando o cálculo é feito mas o registro de auditoria falha, o retorno traz aviso e a trilha não é inventada. Distinguir resultado calculado de resultado auditado.

## 5. Relatórios

Relatório **individual** usa o resultado de uma sessão já persistida e salva PDF com versão no nome do arquivo na pasta validada. Em lote, a UI orienta a análise e a emissão de relatório **consolidado efêmero** para 2–100 registros. O documento é construído em `DocumentApp`, convertido para PDF e armazenado/baixado conforme o fluxo de relatório; não há reanálise nem edição de `ANALISE_HISTORICO`.

## 6. Cobertura de teste e lacunas

`HistoricoTestes.gs` inclui `rodarTestesHistorico` e testes de motor, seleção de ruleset, reconciliação, sessões, relatório e mecanismos de falha simulados. A própria fonte esclarece que não cobre o parser real no navegador, conversão visual de PDF e parte da integração; algumas verificações fazem leitura real da planilha de regras e INFOS quando executadas no projeto original. Portanto **não rodar em produção só para “conferir” esta documentação**.

Antes de operacionalizar a fonte sanitizada: validar URL/MIME/tamanho, extração PDF.js e CSP, julgamento humano em situações `CONFERIR`, proteção de endpoints e eventual necessidade de OCR em demanda futura. Não atribuir a este módulo as melhorias B2/6.4.299 feitas em outro app.
