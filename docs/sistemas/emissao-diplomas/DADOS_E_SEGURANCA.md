# Dados e segurança — Gerenciador de Colação de Grau e Diplomas

Modelo: [SYSTEM_SECURITY_TEMPLATE.md](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md). Nenhum valor real aqui.

## 1. Escopo

- Sistema: Gerenciador de Colação de Grau e Diplomas 4.0 (projetos autônomos de PRODUÇÃO e HOMOLOGACAO).
- Público: equipe do Serviço de Graduação.
- Responsável funcional: Serviço de Graduação do IPUSP.
- Última revisão: 05/11/2026 (incorporação ao repositório e 4.0).

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Identificação do aluno | nome, Nº USP, e-mail, RG, gênero para concordância | documentos e comunicação da colação e do diploma | planilha de diplomas | tela, documentos, e-mails | planilha de diplomas | Pessoal |
| Situação acadêmica | habilitações, anos, etapas, colação, diploma | acompanhar o processo | planilha de diplomas | tela, documentos | planilha de diplomas | Pessoal |
| Histórico escolar | PDF e dados extraídos (disciplinas, créditos) | conferência de requisitos | pasta do aluno no Drive | navegador (leitura), servidor (regras), auditoria | `ANALISE_HISTORICO` (permanente), relatórios em PDF na pasta | Pessoal/restrito |
| Anexos | documentos enviados pela equipe | instruir o processo | tela | pasta do aluno | Drive | Pessoal |
| Lista de acesso | e-mail, nome, observação, perfil da equipe | autorizar | `PERMISSOES_DE_ACESSO` | servidor; nome e observação vão para o topo da página | cache de 60 s | Pessoal (equipe) |

## 3. Recursos externos

Todos pelo `ID_INDEX` (coluna Homologação quando `AMBIENTE=homologacao`), resolvidos por `obterIdRecursoDiplomas_` em `DiplomasIdIndex.gs`.

| Nome lógico | Tipo | Chave | Uso |
|---|---|---|---|
| Planilha de diplomas | Sheets | `EMISSAO_DIPLOMAS` | abas `Diplomas` (L/G) e `INFOS` (L). Desde a 4.0; na 3.x era a planilha vinculada. |
| Lista de acesso | Sheets | `PERMISSOES_DE_ACESSO` | aba `EMISSAO_DIPLOMAS` (L) |
| Pasta raiz dos alunos | Drive | `PASTA_RAIZ_ALUNOS` | pastas e anexos (L/G) |
| Cadastro central de alunos | Sheets | `PLANILHA_ALUNOS` | pasta por Nº USP (L/G) |
| Modelos | Docs | `TEMPLATE_OFICIO_ID`, `TEMPLATE_CERTIFICADO_ID`, `TEMPLATE_FORMANDOS_ID` | documentos (L) |
| Regras Curriculares | Sheets | `REGRAS_CURRICULARES` | regras (L); auditoria `ANALISE_HISTORICO` (G, só inserção); `AUDITORIA_REGRAS_CURRICULARES` (L) |
| pdf.js 3.11.174 | CDN (cdnjs) | — | leitura do PDF no navegador |

O Painel dos servidores também lê a aba `Diplomas` (coluna "Status — Dados Pessoais") para o aviso do card.

## 4. Web App

- Quem pode acessar a implantação: qualquer pessoa com conta Google; na prática, só quem está na aba `EMISSAO_DIPLOMAS`.
- Executa como: `USER_DEPLOYING` (conta do Serviço).
- Autorização no servidor (`DiplomasAcesso.gs`): identidade só por `Session.getActiveUser()`; toda função pública começa com `exigirLeitorDiplomas_()` ou `exigirAdministradorDiplomas_()` (o `testar_acesso.js` confere; as suítes novas ainda não estão na CI, ver o PR #42). Desde a revisão independente, o mesmo teste chama cada consulta como LEITOR e exige zero gravações em planilha e no Drive: o `obterObservacoes` do LEITOR localiza a pasta sem criá-la. Recusas: `SEM_IDENTIFICACAO`, `SEM_ACESSO`, `ACESSO_INDISPONIVEL` (falha fechada) e `SO_LEITURA`. Esconder botões na página é só conveniência.
- Dados enviados ao cliente: os do aluno aberto e das listas; do usuário, só nome, observação (ou o e-mail, sem nome) e perfil.
- Operações privilegiadas (ADMINISTRADOR): gravar e excluir na planilha, criar pastas e arquivos, upload e exclusão de anexos, documentos, ZIP, lista de formandos, análise e relatórios de histórico, e-mails, testes e migração do módulo de histórico.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
AMBIENTE                              (só na homologação: homologacao)
HISTORICO_CHAVE_ASSINATURA_SESSAO     (criada pelo próprio app; segredo, nunca sai do servidor)
```

Em **Configurações do projeto → Propriedades do script**. Sem valores aqui.

## 6. Logs e auditoria

- Registro de execução: falhas técnicas; a recusa de acesso registra só o motivo técnico, sem e-mail.
- **Auditoria existente:** só a análise de histórico, na aba `ANALISE_HISTORICO` da planilha de Regras (uma linha por tentativa legítima, só inserção, com sessão assinada). **Não registra quem fez.** As demais ações (status, e-mails, documentos, exclusões) não têm auditoria. A 4.0 não mudou a auditoria; o modelo do [docs/auditoria](../../auditoria/MODELO.md) fica para a próxima etapa, por decisão do responsável.
- Proibido em log: e-mails, conteúdo de histórico, IDs.

## 7. Compartilhamento e acesso

- **Integridade de gravação (4.0.1).** O `ScriptLock` só coordena este projeto; a planilha central também é gravada pelo Gerenciador de Pessoas e direto na planilha. Por isso: a exclusão de um registro remove só a linha daquela colação e nunca mexe na pasta do aluno nem no "ID da Pasta" da central (a pasta é do Nº USP); a inclusão manual recusa Nº USP repetido na mesma colação, confere todas as colunas antes de gravar, grava a linha numa chamada só e confere depois pelo Registro ID; a criação de pasta e o autocadastro temporário param com Nº USP repetido na central, relêem a coluna E antes e depois de gravar e descartam só uma pasta criada na mesma execução e ainda vazia. Detalhes e riscos residuais: [REVISAO_4.0.1.md](REVISAO_4.0.1.md).
- Planilhas e pastas: compartilhadas com a conta do Serviço, que executa o app; a lista de acesso não muda permissões do Drive.
- Abrir a pasta do aluno ou um anexo pelo link exige permissão no Drive para a conta de quem clica (o app não compartilha nada).

## 8. Dados de teste

- Testes automáticos só com dados inventados (`exemplo.invalid`); lista de acesso fictícia em [dados-ficticios/](dados-ficticios/README.md).
- Na homologação, a cópia da planilha de diplomas deve ter só alunos fictícios: os e-mails de colação e de diploma são enviados de verdade para o endereço da linha.

## 9. Pontos LGPD/institucionais

- Base legal e retenção: `A VALIDAR INSTITUCIONALMENTE`.
- Compartilhamento externo: só o CDN do pdf.js recebe a requisição do script (não o PDF).

## 10. Pendências e riscos conhecidos

- **pdf.js 3.11.174 pelo CDN, sem `isEvalSupported: false`.** Versões anteriores à 4.2.67 têm a falha CVE-2024-4367 (execução de código a partir de um PDF malicioso). Correção fora do escopo da 4.0; precisa de decisão do responsável (atualizar a versão ou desligar o `eval`, e homologar a leitura dos históricos).
- E-mails da homologação não levam `[HOMOLOGAÇÃO]` no assunto, ao contrário dos formulários.
- Auditoria geral das ações (próxima etapa).
- Os dois projetos (vinculado e autônomo) não podem gravar ao mesmo tempo ([manual §5](MANUAL_OPERACAO.md#5-voltar-atrás)).
