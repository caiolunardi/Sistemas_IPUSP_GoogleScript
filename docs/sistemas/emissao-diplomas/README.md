# Gerenciador de Colação de Grau e Diplomas

**Versão:** **4.0.0** (05/11/2026), **homologação parcial em 06/11/2026; correções da revisão independente aguardam nova conferência · NÃO IMPLANTADA**. O código está em [`sistemas/emissao-diplomas/`](../../../sistemas/emissao-diplomas/README.md). A versão em uso continua sendo a 3.x do projeto vinculado à planilha de diplomas, que o responsável vai desativar depois da troca. O GitHub não informa o que está implantado no Apps Script.

## Finalidade

Web App da equipe do Serviço de Graduação que acompanha cada aluno da conferência dos dados pessoais até o encaminhamento do diploma, em quatro etapas: Dados Pessoais → Histórico Escolar → Colação de Grau → Emissão de Diploma. Inclui pasta do aluno no Drive com anexos, análise automática do histórico escolar (PDF lido no navegador e avaliado no servidor pelas Regras Curriculares), relatórios de conferência, certificado de conclusão, ofício de diploma, lista de formandos, e-mails de convocação e de aviso de diploma, observações e ações em lote.

## Projetos no Google

| Projeto | Papel |
|---|---|
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · PRODUÇÃO` | autônomo, **projeto final** de produção (recebe a 4.0) |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · HOMOLOGACAO` | autônomo, projeto final de homologação (`AMBIENTE=homologacao`) |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · PRODUÇÃO - Vinculado` | antigo, ligado à planilha de diplomas; fonte da 3.x; sai de uso |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · HOMOLOGACAO - vinculado` | antigo, ligado à cópia de homologação; sai de uso |

Os IDs dos projetos e o endereço `/exec` ficam fora do Git ([repositório público](../../seguranca/REPOSITORIO_PUBLICO.md)). O endereço de produção vai para o card do [Painel dos servidores](../painel-servidores/MANUAL_OPERACAO.md) pela propriedade `URLS_SISTEMAS_EQUIPE`, chave `EMISSAO_DIPLOMAS`.

## O que mudou na 4.0, em resumo

- **Projeto autônomo.** A planilha de diplomas deixa de ser "a planilha do script" (`getActiveSpreadsheet`) e passa a ser aberta pela chave `EMISSAO_DIPLOMAS` do `ID_INDEX`, nas abas `Diplomas` e `INFOS` (coluna Homologação quando `AMBIENTE=homologacao`). As demais chaves já vinham do `ID_INDEX` na 3.x.
- **Acesso conferido no servidor.** A implantação fica aberta ("qualquer pessoa", executando como a conta do Serviço), e quem decide é a aba `EMISSAO_DIPLOMAS` da planilha `PERMISSOES_DE_ACESSO`: e-mail na coluna C, perfil `LEITOR` ou `ADMINISTRADOR` na coluna E. Toda função pública confere o acesso na primeira linha; quem não está na lista vê só um aviso, sem dados.
- **Perfis** (decisão do responsável, 05/11/2026): o **LEITOR** vê colações, alunos, detalhes, anexos e análises já registradas; tudo que grava na planilha, cria arquivo ou pasta no Drive (certificado, ofício, lista, ZIP, relatórios, inclusive o consolidado), registra análise de histórico, envia e-mail, muda etapa ou exclui é só do **ADMINISTRADOR**. Os testes do módulo de histórico e a migração `migrarAnaliseHistoricoRelatoriosV1` também ficaram só para administrador.
- **Abrir a página** só roda a correção automática de Registro ID/Versão depois da conferência de acesso e só para ADMINISTRADOR (decisão de 05/11/2026; antes rodava para qualquer visitante).
- **Identidade visual GRADIP:** tema Sistema/Claro/Escuro com seletor "Aparência", marcas IPUSP e USP por tema, tokens no lugar das cores fixas (também na análise de histórico e na Central de Ajuda), faixa de homologação e aviso de "Somente consulta".
- **Topo da página:** nome da pessoa na primeira linha e observação na segunda, centralizados, sem "olá" nem "bom dia". Sem observação, só o nome; sem nome, o e-mail.
- **Nome na tela:** "Gerenciador de Colação de Grau e Diplomas", como o projeto no Google (antes "Emissão de Diplomas").
- **Central de Ajuda 1.1:** seção "Acesso e perfis", duas perguntas novas e o item "Lista de acesso" em Segurança.

Nada muda nas regras de etapa, documentos, e-mails, análise de histórico nem na auditoria `ANALISE_HISTORICO`.

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Configuração dos projetos autônomos, envio do código, troca do link no painel e volta atrás. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados, recursos, acesso, auditoria existente e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | O que foi testado, roteiro da homologação e o que falta. |
| [AJUDA.md](AJUDA.md) | O que mudou no texto da Central de Ajuda. |
| [dados-ficticios/](dados-ficticios/README.md) | Lista de acesso fictícia para a homologação. |
| [evidencias/4.0.0/](evidencias/4.0.0/README.md) | Capturas com dados fictícios. |

## Versões

| Versão | Situação | O que mudou |
|---|---|---|
| 3.x (até set/2026) | em uso, projeto vinculado, fora do repositório até 05/11/2026 | Endurecimento, análise de histórico, relatórios, Central de Ajuda 1.0. Importada sem mudanças no commit `35e621e` como linha de base. |
| 4.0.0 (05/11/2026) | homologação parcial em 06/11/2026, não implantada | Projeto autônomo, acesso pela aba `EMISSAO_DIPLOMAS`, perfis LEITOR/ADMINISTRADOR, tema GRADIP, identificação no topo. [Notas](../../../notas-de-versao/emissao-diplomas-v4.0.md). |
