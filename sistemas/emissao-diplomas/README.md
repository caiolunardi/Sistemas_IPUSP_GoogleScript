# Gerenciador de Colação de Grau e Diplomas — fonte 4.0.0

Web App interno do Serviço de Graduação que acompanha cada aluno da conferência dos dados pessoais até o encaminhamento do diploma (Dados Pessoais → Histórico Escolar → Colação de Grau → Emissão de Diploma), com pasta do aluno no Drive, análise automática do histórico escolar, relatórios, certificado, ofício, lista de formandos, e-mails e ações em lote.

**Estado:** 4.0.0 de 05/11/2026, **homologada em 06/11/2026 (identidade visual e permissões), não implantada**. Projeto **autônomo** (não vinculado a planilha). A versão em uso é a 3.x do projeto vinculado, importada sem mudanças no commit `35e621e` como linha de base. O GitHub não sincroniza com o Apps Script. Documentação: [`docs/sistemas/emissao-diplomas/`](../../docs/sistemas/emissao-diplomas/README.md).

## Arquivos de `src/` (vão para o Apps Script)

| Arquivo | Papel | Na 4.0 |
|---|---|---|
| `DiplomasBackend.gs` | `doGet`, colações, alunos, etapas, pasta no Drive, documentos, e-mails, lote. | alterado: planilha pelo `ID_INDEX` (`EMISSAO_DIPLOMAS`), `doGet` com conferência de acesso, guardas de perfil, `VERSAO_DIPLOMAS` |
| `DiplomasAcesso.gs` | Lista de acesso (aba `EMISSAO_DIPLOMAS` de `PERMISSOES_DE_ACESSO`), perfis LEITOR e ADMINISTRADOR, página sem acesso. | **novo** |
| `DiplomasIdIndex.gs` | Leitura do `ID_INDEX` e de `AMBIENTE`. | idêntico |
| `DiplomasApp.html` | Página principal. | alterado: tema GRADIP, marcas, identificação no topo, faixas de homologação e de somente consulta, botões de gravação só para ADMINISTRADOR |
| `DiplomasSemAcesso.html` | Página de quem não tem acesso (sem dados). | **novo** |
| `DiplomasAjuda.html`, `DiplomasAjudaUI.html`, `DiplomasAjudaEstilos.html` | Central de Ajuda (1.1). | alterados: seção "Acesso e perfis", tokens GRADIP. São próprios do sistema (`proprios` em `ferramentas/copias_shared.json`) |
| `HistoricoEndpoints.gs`, `HistoricoConsultas.gs`, `HistoricoRelatorios.gs`, `HistoricoAuditoria.gs`, `HistoricoTestes.gs` | Análise de histórico: preparo, sessões, relatórios, auditoria `ANALISE_HISTORICO`, testes. | alterados só na primeira linha de cada função pública (guarda de perfil) |
| `HistoricoConfig.gs`, `HistoricoMotor.gs`, `HistoricoRegrasRepository.gs`, `HistoricoArquivos.gs`, `HistoricoParser.html` | Configuração, motor de avaliação, regras curriculares, arquivos, leitura do PDF no navegador. | idênticos |
| `HistoricoAnaliseUI.html`, `HistoricoAnaliseEstilos.html` | Tela da análise de histórico. | alterados: tokens GRADIP; botões de relatório só para ADMINISTRADOR |
| `GradipTema.html`, `GradipTemaControle.html` | Cópias idênticas de `shared/`. | **novos** |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas, iguais às do Gerenciador de Abertura de Habilitações. | **novos** |
| `appsscript.json` | Fuso `America/Sao_Paulo`, V8; Web App executando como a conta que implanta e acesso `ANYONE`; quem entra é decidido pela aba de acesso. | alterado (antes `MYSELF`) |
| `.claspignore` | Padrão do repositório. | novo |

`testes/` (não vai para o Apps Script): [README](testes/README.md).

## Configuração (sem valores)

Script Properties: `ID_INDEX_SPREADSHEET_ID` (obrigatória), `AMBIENTE` (só na cópia de homologação, valor `homologacao`) e `HISTORICO_CHAVE_ASSINATURA_SESSAO` (criada sozinha na primeira análise; cada projeto tem a sua). No `ID_INDEX`: `EMISSAO_DIPLOMAS`, `PERMISSOES_DE_ACESSO` e as chaves que a 3.x já usava (regras curriculares e pastas do Drive, ver [DADOS_E_SEGURANCA.md](../../docs/sistemas/emissao-diplomas/DADOS_E_SEGURANCA.md)). Na planilha de permissões: aba `EMISSAO_DIPLOMAS`. Passo a passo: [manual de operação](../../docs/sistemas/emissao-diplomas/MANUAL_OPERACAO.md).

Nenhum ID de planilha, script ou implantação fica no código ou nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| 3.x (em uso, projeto vinculado) | Linha de base, commit `35e621e`. |
| 4.0.0 (05/11/2026, homologada em 06/11/2026) | Projeto autônomo, acesso no servidor, perfis, tema GRADIP, identificação no topo, Central de Ajuda 1.1. Nota: [`notas-de-versao/emissao-diplomas-v4.0.md`](../../notas-de-versao/emissao-diplomas-v4.0.md). |
