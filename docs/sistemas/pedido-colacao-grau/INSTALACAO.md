# Configuração e implantação — formulário legado e próxima reformulação

**Este documento é um inventário e um roteiro futuro, NÃO uma instrução para publicar o código legado como está.** O código fornecido contém referências operacionais literais e apresenta riscos críticos de autorização e compartilhamento. Não executamos nenhum procedimento no Google nesta rodada.

## Situação identificada nos anexos

- Projeto Apps Script separado, servido por `doGet` com `ColacaoApp.html`.
- O cabeçalho do backend **descreve** uma implantação com execução como usuário que acessa (`USER_ACCESSING`), acesso com conta Google e planilhas compartilhadas com permissão de edição para alunos. **Não foi verificado que esta seja a configuração real do projeto. Não replicar essa combinação na nova implantação.**
- Referências diretas a planilhas/Drive e URL de retorno ao Painel dos Alunos.
- Sem `appsscript.json`, `.claspignore`, `ID_INDEX`, `AMBIENTE`, testes e configuração de homologação fornecidos.
- `PERIODOS` é controlada pela equipe no Painel dos Servidores; o formulário só lê a janela e o semestre.

## Pré-requisitos para construir o projeto novo

1. Preservar os dois arquivos privados de origem fora do Git e comprovar sua correspondência ao editor Google, sem expor IDs/credenciais.
2. Propor a configuração de execução e autorização em conformidade com [segurança](DADOS_E_SEGURANCA.md); não conceder acesso direto de edição das planilhas a alunos.
3. Definir ambiente de homologação segregado e chaves `PLANILHA_ALUNOS`, `PERIODOS`, `EMISSAO_DIPLOMAS` e `PASTA_RAIZ_ALUNOS` no `ID_INDEX`.
4. Criar `sistemas/pedido-colacao-grau/src/` **apenas depois da sanitização e da decisão sobre o desenho**; versionar manifesto e `.claspignore` padrão, nunca `.clasp.json`.
5. Compatibilizar a escrita na aba `Diplomas` e a pasta compartilhada com [contrato de integração](CONTRATO_INTEGRACAO.md), sem migrar dados existentes automaticamente.
6. Implementar suítes sintéticas, conferir UI e segurança, publicar primeiro exclusivamente em projeto de homologação mediante ordem específica.
7. Depois da homologação, registrar separadamente ordem para `clasp push`, implantação `/exec`, troca do link do aluno e eventual rollback.

## Retorno seguro

Antes de substituir a versão usada pelos alunos, registrar versão atual no editor, implantação `/exec` e configuração (sem valores no Git); preservar versão anterior para rollback. O retorno do `/exec` não desfaz modificações já realizadas em planilhas/Drive. Toda migração de dados, exclusão, mudança de ACL ou de Script Properties requer autorização própria.

## Versão 2.0 (em PR)

Fonte em `sistemas/pedido-colacao-grau/src/` (`Codigo.gs`, `ColacaoConfig.gs`, `ColacaoIdentidade.gs`, `ColacaoPlanilha.gs`, `ColacaoPedidos.gs`, `ColacaoDocumentos.gs`, `ColacaoRecibo.gs`, `ColacaoApp.html`, `appsscript.json` e o `.claspignore` padrão). Projetos novos, criados pelo responsável (D14): `GRADIP · Pedido de Colação de Grau · PRODUÇÃO` e `· HOMOLOGAÇÃO`. O projeto do legado não recebe este código.

| Configuração | Valor |
| --- | --- |
| Manifesto | `executeAs: USER_DEPLOYING`, `access: DOMAIN` (versionado) |
| Script Properties | `ID_INDEX_SPREADSHEET_ID`; na homologação `AMBIENTE = homologacao`; opcional `LINK_PAINEL_ALUNOS` (URL `/exec` do Painel de Solicitações, para o botão de voltar) |
| Chaves novas no `ID_INDEX` | `PEDIDOS_COLACAO` (`spreadsheet`), `PASTA_PROVISORIOS_COLACAO` (`folder`), nas duas colunas |
| Chaves existentes lidas | `PLANILHA_ALUNOS`, `PERIODOS`, `EMISSAO_DIPLOMAS` |
| Compartilhamento | nenhum com alunos; `PEDIDOS_COLACAO` e a pasta de entrada só com a conta institucional e quem administra |

Ordem para a homologação: [HOMOLOGACAO.md](HOMOLOGACAO.md#versão-200-pr-3-do-plano--testes-locais-e-roteiro-no-google). A produção só depois dos PRs 4 e 5 homologados juntos e da interface do PR 7 (D13), cada passo (`clasp push`, implantação, troca do link no Painel dos alunos, retirada da edição dos alunos nas planilhas) com ordem separada do responsável.
