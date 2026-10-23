# Dados e segurança — baseline Emissão de Diplomas

**Data:** 23/10/2026. **Estado:** inspeção estática, sem auditoria completa da implantação. Referência: `docs/seguranca/SYSTEM_SECURITY_TEMPLATE.md`.

## 1. Escopo

Ferramenta da equipe GRADIP. Identidade de execução, acesso do deploy, contas efetivamente autorizadas e ambiente real: **A VALIDAR NO GOOGLE**.

## 2. Categorias tratadas

| Dados | Origem/destino | Proteção |
|---|---|---|
| Nome, Nº USP, e-mail, RG, gênero e identificação | Diplomas/Alunos, UI, documentos e e-mails | Pessoal/restrito |
| Habilitações, períodos, histórico, requisitos, avaliações | Planilhas, PDF do aluno, auditoria | Pessoal de alto impacto |
| Arquivos de RG, certidões, Histórico Completo, relatórios | Drive gerenciado, transitoriamente no cliente | Pessoal de alto impacto |
| Sessões, hash, versões de regra, motivos, timestamps | `ANALISE_HISTORICO` | Pessoal/restrito |
| Tokens de sessão/HMAC | Script Properties; token efêmero de navegação | Segredo operacional |

Jamais registrar dados reais desse tipo em Git, fixtures, commits, PRs, prints ou logs.

## 3. Recursos e configuração

| Recurso | Nome lógico proposto (não implantado) |
|---|---|
| Planilha principal/abas Diplomas e INFOS | `SPREADSHEET_ID` ou planilha vinculada |
| Cadastro central de alunos | `PLANILHA_ALUNOS` |
| Regras curriculares | `REGRAS_CURRICULARES` |
| Pasta raiz | `DRIVE_ROOT_FOLDER_ID` |
| Modelos de certificado, ofício e lista | `TEMPLATE_CERTIFICADO_ID`, `TEMPLATE_OFICIO_ID`, `TEMPLATE_FORMANDOS_ID` |
| Chave HMAC | `HISTORICO_CHAVE_ASSINATURA_SESSAO` |

**Achado bloqueante para publicação de fonte:** `DiplomasBackend.gs` e `HistoricoConfig.gs` têm **IDs operacionais reais fixos**, incluindo URL da pasta. Esses valores **não foram copiados** a esta documentação e os arquivos foram deixados fora do Git. Converter configuração exige PR específico, teste e aprovação.

## 4. Web App, autorização e chamadas

O cliente invoca funções de leitura e gravação via `google.script.run`, incluindo upload, emissão de documentos, mensagens e exclusão. `Registro ID`, `Versão` e verificação de pasta não provam autorização da pessoa que chamou. Na inspeção dos arquivos `.gs` enviados, **não se identificou uma checagem centralizada explícita de `Session.getActiveUser`** em todas as funções privilegiadas. Não é prova de acesso indevido em produção: o deploy pode ser restrito. **A VALIDAR:** quem acessa, como executa, autorização server-side de cada endpoint e possibilidade de invocação direta, sobretudo da função administrativa de migração.

A sessão da análise usa HMAC vinculado ao registro e versão; isso não substitui controle de acesso. O arquivo é reconciliado por hash, mas a correção da interpretação do PDF continua dependente do parser no navegador.

## 5. Integridade e logs

O backend utiliza `LockService` e `Versão` para concorrência. `doGet` pode executar uma migração interna de ID/Versão; a migração de `sessao_analise_id` é pública e manual. O motor grava auditoria em outra planilha; cálculo e registro não formam transação atômica. Nenhuma leitura de logs institucionais ocorreu. Não registrar payloads, IDs ou nomes individuais no debugging.

## 6. Compartilhamento, retenção e LGPD

Permissões efetivas de Sheets/Drive, destinatários, retenção, base legal e procedimentos institucionais: **A VALIDAR INSTITUCIONALMENTE**. Não inferir prazo de conservação ou base legal. Para incidentes seguir `docs/seguranca/INCIDENTES.md`.

## 7. Homologação, dados fictícios e exceções

Nenhum teste funcional/segurança foi executado. Para publicação da fonte exigir: dados fictícios, autenticação/autorização por função pública, ausência de ID/credencial, upload fora da raiz, concorrência, migração administrativa, envio e exclusão, e verificação `ferramentas/verificar_publicacao.js`.

**Pendências bloqueantes para incorporação da fonte:** IDs fixos; manifesto/deploy desconhecidos; autorização backend não comprovada; efeitos de migração em `doGet`; sem suíte CI desta baseline. A documentação por si pode ser revisada; o código bruto não deve ser publicado.
