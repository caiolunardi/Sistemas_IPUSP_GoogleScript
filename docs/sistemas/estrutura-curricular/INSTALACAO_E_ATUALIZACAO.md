# Instalação e atualização — 1.11.0

Esta entrega publica código/documentação no Git. Não altera um projeto Apps Script ou uma planilha automaticamente. A fonte está em [`src/`](../../../sistemas/estrutura-curricular/src/).

## Atualizar um Web App 1.10.0 para 1.11.0

1. Guarde a versão da implantação ativa para retorno.
2. **Substitua** o conteúdo de oito arquivos: `AuditoriaPainel.gs`, `Codigo.gs`, `Esquema.gs`, `Gravacao.gs`, `Preparacao.gs`, `PainelAuditoria.html`, `PainelEstilos.html` e `EstruturaAjuda.html`. Nenhum arquivo novo; os outros 26 continuam iguais. `Esquema.gs`, `Gravacao.gs` e `Preparacao.gs` trazem a correção do "Cadastrar nova grade" ([incidente de 14/10](INCIDENTES_E_LICOES.md)): se um recomeço ficou pendente, a primeira abertura do painel por um administrador o termina.
3. Confira no `ID_INDEX` as chaves `SERVIDORES`, `PLANILHA_DOCENTES` e `PLANILHA_ALUNOS` (coluna C com o ID; Tipo `spreadsheet`, não conferido) e dê à conta que executa o Web App **acesso de leitura** às três planilhas.
4. Rode `diagnosticarNomesAuditoria` no editor: para cada cadastro, mostra se abriu, a aba lida, o número de linhas e os títulos das colunas usadas (esperado: servidores A `E-MAIL`, B `NOME`, C `SETOR`; docentes e alunos B nome e D e-mail; alunos também a coluna "eMail Secundario"; se ela faltar, `colunaNaoEncontrada`). Não registra nomes, e-mails nem IDs.
5. Teste no `/dev` (rodapé **1.11.0**): na Auditoria da grade, pessoas com nome e e-mail; quem não está nos cadastros aparece como "Pessoa não cadastrada com acesso".
6. Promova a implantação existente (nova versão).

Sem nova aba, coluna, acionador ou migração; a auditoria continua gravando só o e-mail. Não é preciso reenviar a grade nem reativar a auditoria.

## Atualizar um Web App 1.9.3 para 1.10.0

Guarde a versão anterior do projeto/implantação para retorno. Substitua **`Painel.html`** e **`Codigo.gs`** e crie quatro arquivos HTML na raiz do mesmo projeto:

| Nome no editor (sem extensão) | Conteúdo |
|---|---|
| `EstruturaNavegacao` | controle Menu lateral/Abas |
| `EstruturaNavegacaoEstilos` | layouts, ícones e efeitos |
| `EstruturaIcones` | catálogo e licença |
| `EstruturaNavegacaoUI` | adaptador dos mesmos botões |

Os outros **28 arquivos** são iguais à baseline 1.9.3; a fonte completa tem **34 arquivos**. Não cole testes, documentação ou `Validacoes.gs` no Web App. `include_()` usa nomes sem extensão, com grafia exata.

Não há nova configuração, aba, coluna, cache, acionador ou migração. Tema continua em `gradip-theme`; modo não persiste. Atualizar o visual não exige cadastrar nova grade, reenviar ou reinstalar auditoria.

Salve e confira `/dev` autorizado antes de promover a implantação existente. O rodapé carregado deve mostrar **1.10.0**. Alterar arquivos não atualiza sozinho `/exec` fixado numa versão anterior; promova somente depois de homologar.

## Instalar projeto novo

1. Crie um projeto Apps Script **independente**.
2. Copie os `.gs` como Script e `.html` como HTML, todos na raiz. Ative V8 e confira o fuso esperado `America/Sao_Paulo` no editor.
3. Configure `ID_INDEX_SPREADSHEET_ID` nas Propriedades do script com o índice do ambiente pretendido.
4. Configure índice/lista de acesso abaixo. Inclua explicitamente a conta implantadora como `ADMINISTRADOR`: propriedade da planilha não concede papel.
5. Execute `diagnosticarConfiguracao()` como essa conta e confira o resultado, sem registrar valores de IDs no Git.
6. Implante como **App da Web**, executando como **Eu / quem implantou**, com acesso ao domínio institucional conforme as opções disponíveis. A lista nominal no servidor continua obrigatória. Confirme identificação real de usuários pelo Workspace.
7. Abra como administrador para preparar as nove abas; confira leitor e conta sem acesso.

O pacote não traz `appsscript.json` nem `.clasp.json`. Manifest não foi reconstruído nesta entrega; fuso, escopos, acesso e identidade de execução dependem do projeto real. Registre esses parâmetros de implantação sem credenciais/IDs no Git.

## Recursos e permissões

Na primeira aba do índice, A–C são exatamente `Chave`, `Tipo`, `ID de Produção`. Uma linha por chave. Coluna D de homologação **não é lida**: testes isolados precisam de índice próprio configurado na propriedade.

| Chave | Recurso | Conta executora precisa |
|---|---|---|
| `ESTRUTURA_CURRICULAR` | planilha-base; tipo obrigatório `spreadsheet` | ler/editar e preparar abas |
| `PERMISSOES_DE_ACESSO` | planilha; tipo obrigatório `spreadsheet` | ler `ESTRUTURA_CURRICULAR` |
| `GRADE_HORARIA_PREENCHIMENTO` | planilha fixa das secretarias | ler/editar/renomear/copiar |
| `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` | índice de cópias/auditorias | ler/registrar |
| `BACKUP_GRADES_ANTERIORES` | pasta de cópias | criar cópias |
| `AUDITORIA_GRADES_ANTERIORES` | pasta de auditorias | criar/acessar auditorias |
| (1.11.0) `SERVIDORES` | cadastro de servidores e setores (A e-mail, B nome, C setor) | ler a primeira aba |
| (1.11.0) `PLANILHA_DOCENTES` | cadastro de docentes (B nome, D e-mail) | ler a primeira aba |
| (1.11.0) `PLANILHA_ALUNOS` | cadastro de alunos (B nome, D e-mail e a coluna "eMail Secundario", achada pelo título) | ler a primeira aba |

Os recursos de envio/auditoria são abertos pelo serviço correspondente sem a mesma validação de Tipo das duas primeiras chaves. Use rótulos coerentes e confira diagnósticos. ID da estrutura tem cache de 600 s; permissões, 60 s.

Na aba de permissões, linha 1 é cabeçalho; C é e-mail e E é Perfil. A/B/D são N. USP/nome/observação; autorização lê C/E. `ADMINISTRADOR` altera; `LEITOR`, vazio ou desconhecido consultam. Duplicatas prevalecem com menor acesso. `ESTRUTURA_ADMINS`/`ESTRUTURA_LEITORES` antigas não são lidas.

Índice de grades: `Semestre`, `ID`, `Auditoria_ID`. Secretarias: seis abas, cabeçalho na linha 3 e nome com semestre, como **Grade Horária - 1º semestre de AAAA**. Veja [Modelo de dados](MODELO_DE_DADOS.md).

## Projeto vinculado das secretarias

[`Validacoes.gs`](../../../sistemas/estrutura-curricular/planilha-grade/Validacoes.gs) pertence ao projeto **vinculado à planilha das secretarias**. O [README recebido](../../../sistemas/estrutura-curricular/planilha-grade/README.md) registra uma migração antiga com remoção de arquivos/acionadores legados; não repita essa limpeza para instalar o visual.

Instalação nova exige validar as regras locais e a proteção da fórmula M conforme a responsabilidade institucional. No Web App independente, `ativarAuditoriaGrade()` cria/reusa auditoria e instala os **dois acionadores**, edição e abertura, sob trava. `desativarAuditoriaGrade()` remove-os, conservando planilhas. Confira identidade proprietária e autorização Drive da conta ativadora.

## Homologação e retorno

Em cópias do ambiente: sidebar inicial, alternância, etapas/consultas, perfis, teclado/foco, temas, celular/desktop, rascunhos e ajuda. Faça ciclo controlado de importação/preparação. Para ponta a ponta, confira backup, fórmulas reais, renomeação e acionadores. [Verificação](VERIFICACAO_1_10_0.md) separa testes locais do que depende do Google.

Se necessário, volte `/exec` à versão anterior. A 1.10.0 não muda o esquema e não exige conversão de dados para retornar o visual. Não apague pedidos pendentes para facilitar retorno; conclua/confira pelos fluxos existentes.
