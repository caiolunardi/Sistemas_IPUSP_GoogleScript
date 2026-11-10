# Gerenciador de Colação de Grau e Diplomas — fonte 4.1.0

Web App interno do Serviço de Graduação que acompanha cada aluno da conferência dos dados pessoais até o encaminhamento do diploma (Dados Pessoais → Histórico Escolar → Colação de Grau → Emissão de Diploma), com pasta do aluno no Drive, análise automática do histórico escolar, relatórios, certificado, ofício, lista de formandos, e-mails e ações em lote.

**Estado:** 4.0.0 de 05/11/2026, **homologação parcial concluída em 06/11/2026 (identidade visual, permissões e correções da revisão independente; fluxo de negócio dispensado); em produção, com implantação confirmada pelo responsável em 06/11/2026** (versão 4 da implantação ativa, de 09/11/2026 15:04 (horário de Brasília), informada pelo responsável; três implantações anteriores arquivadas; reconfirmado por ele em 09/11/2026). Projeto **autônomo** (não vinculado a planilha). A 3.x do projeto vinculado, cujo desligamento fica com o responsável, foi importada sem mudanças no commit `35e621e` como linha de base. O GitHub não sincroniza com o Apps Script. Documentação: [`docs/sistemas/emissao-diplomas/`](../../docs/sistemas/emissao-diplomas/README.md).

## Responsabilidade deste aplicativo

Este projeto é o **Gerenciador interno**: trata registros de colação e diploma, confere dados e histórico, conduz etapas, administra documentos do aluno, gera relatórios e documentos e realiza comunicações autorizadas. Possui inclusão manual administrativa de aluno, mas **não substitui** o Formulário de Pedido de Colação de Grau voltado ao estudante.

**Comportamento existente de anexos (4.0.0):** o gerenciador resolve a pasta institucional por nº USP na planilha central `PLANILHA_ALUNOS`; em upload administrativo usa nome gerado por tipo de documento + nome do aluno + colação + extensão, e substitui arquivos com nome completo idêntico **sem pedir confirmação**. Isso não comprova reutilização de anexos pelo formulário, cujo código ainda não foi incorporado e auditado.

**Fronteira aprovada para documentação:** receber uma nova solicitação e oferecer ao aluno reutilização ou atualização de documentos anteriores pertencem ao **Formulário**, como **requisitos para a próxima reformulação**, ainda não implementados/verificados. O gerenciador permanece responsável pelo processamento administrativo, pela autorização de suas operações e pela proteção da pasta compartilhada entre diferentes colações. Ver os detalhes, limites e requisitos futuros em [Fronteira funcional com o Pedido de Colação de Grau](../../docs/sistemas/emissao-diplomas/README.md#fronteira-funcional-com-o-pedido-de-colação-de-grau).

**4.0.1 (06/11/2026, em PR, não enviada ao Google):** correção de integridade. Excluir um registro não manda mais a pasta do aluno para a lixeira nem apaga o "ID da Pasta" da planilha central; a inclusão manual recusa um segundo registro do mesmo Nº USP na mesma colação, grava a linha numa chamada só e confere depois de gravar; a criação de pasta e o autocadastro temporário param quando o Nº USP está repetido na planilha central e não sobrescrevem a pasta gravada por outro sistema. Arquivos alterados: `DiplomasBackend.gs`, `DiplomasApp.html` (textos de exclusão), `DiplomasAjuda.html`; os demais idênticos à 4.0.0. Revisão: [REVISAO_4.0.1.md](../../docs/sistemas/emissao-diplomas/REVISAO_4.0.1.md).

**4.1.0 (10/11/2026, em PR sobre a 4.0.1, não enviada ao Google):** encaminhador dos pedidos do novo Formulário de Pedido de Colação de Grau. O formulário grava só na planilha `PEDIDOS_COLACAO` e na pasta de entrada; este gerenciador confere cada pedido recebido e com cadastro confirmado, move os documentos para a pasta do aluno, grava a linha na aba `Diplomas` (ou aplica a correção enquanto a conferência não começou) e registra o resultado na aba `ENCAMINHAMENTOS`. Roda ao abrir a página (ADMINISTRADOR) e, se o responsável instalar, num gatilho de 5 minutos. A pasta não cria mais cadastro na planilha central (D6). Arquivos: `DiplomasEncaminhador.gs` (novo), `DiplomasBackend.gs`, `DiplomasApp.html` (faixa de pendências), `DiplomasAjuda.html` e `DiplomasAjudaUI.html` (Central de Ajuda 1.3). Contrato e motivos: [ENCAMINHADOR_COLACAO.md](../../docs/sistemas/emissao-diplomas/ENCAMINHADOR_COLACAO.md).

## Arquivos de `src/` (vão para o Apps Script)

| Arquivo | Papel | Na 4.0 |
|---|---|---|
| `DiplomasBackend.gs` | `doGet`, colações, alunos, etapas, pasta no Drive, documentos, e-mails, lote. | alterado: planilha pelo `ID_INDEX` (`EMISSAO_DIPLOMAS`), `doGet` com conferência de acesso, guardas de perfil, `VERSAO_DIPLOMAS` |
| `DiplomasAcesso.gs` | Lista de acesso (aba `EMISSAO_DIPLOMAS` de `PERMISSOES_DE_ACESSO`), perfis LEITOR e ADMINISTRADOR, página sem acesso. | **novo** |
| `DiplomasIdIndex.gs` | Leitura do `ID_INDEX` e de `AMBIENTE`. | idêntico |
| `DiplomasEncaminhador.gs` | Encaminhador dos pedidos do formulário de colação (`PEDIDOS_COLACAO` → aba `Diplomas`), aba `ENCAMINHAMENTOS`, gatilho e diagnóstico pelo editor. | **novo na 4.1.0** |
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
| 4.0.0 (05/11/2026, homologação parcial em 06/11/2026) | Projeto autônomo, acesso no servidor, perfis, tema GRADIP, identificação no topo, Central de Ajuda 1.1. Nota: [`notas-de-versao/emissao-diplomas-v4.0.md`](../../notas-de-versao/emissao-diplomas-v4.0.md). |
