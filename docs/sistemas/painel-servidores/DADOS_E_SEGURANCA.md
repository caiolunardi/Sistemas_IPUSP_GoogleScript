# Dados e segurança — Painel dos servidores

Preenchido a partir do código recebido em 13/10/2026, segundo [`SYSTEM_SECURITY_TEMPLATE.md`](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md). Não contém IDs reais nem dados pessoais.

## 1. Escopo

- Sistema: Painel de Sistemas — servidores (Serviço de Graduação, IPUSP).
- Público: equipe.
- Ambiente: produção (implantação `/exec` existente); a fonte do Git ainda não foi implantada.
- Responsável funcional: Serviço de Graduação (A VALIDAR INSTITUCIONALMENTE o nome do responsável).
- Última revisão: 20/10/2026 (versão 1.3, auditoria; 1.1, controle de acesso), com o código do projeto Apps Script lido pelo clasp e a aba de permissões conferida. A revisão de 13/10/2026 foi só de código.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Pedidos de alunos (nome, situação, e-mail, disciplina) | “nome preenchido”, “pendente” | contar pendências | planilhas dos sistemas | só no servidor; o navegador recebe **apenas números** | não grava | Pessoal (lido, não exposto) |
| Períodos de formulários | datas, horários, tipo, link do formulário | abrir/fechar formulários | planilha de períodos | navegador (leitura e edição) | grava na planilha | Interna |
| Regras curriculares | códigos de curso/habilitação, disciplinas, requisitos | conferência de históricos | planilha de regras | navegador (leitura e edição) | grava na planilha | Interna |
| Auditoria de correção | e-mail de quem corrigiu, data, motivo, antes/depois | rastrear correções de ruleset ativo | `Session` | aba `AUDITORIA_REGRAS_CURRICULARES` | grava na planilha | Pessoal (e-mail institucional) |
| Lista de acesso | e-mail institucional e perfil (ADMINISTRADOR/LEITOR) | quem abre e quem altera o painel | aba `PAINEL_SERVIDORES` da planilha de permissões | só no servidor (cache de 60 s); o navegador recebe só o papel (`admin`/`leitor`) | não grava | Pessoal (e-mail institucional) |
| Nome para a saudação (1.2) | primeiro nome, nome do setor, Prof./Profª. | "Bom dia, {nome}" no cabeçalho | cadastros `SERVIDORES` e `PLANILHA_DOCENTES` (e-mail, nome, setor, tipo, M / F) | servidor (cache de 10 min com e-mail e nome de todos); o navegador recebe **só o nome de quem abriu** | não grava | Pessoal (nome institucional) |
| Conta de quem usa | e-mail `@usp.br` | conferir a lista | `Session.getActiveUser()` | só no servidor | não grava (a auditoria das Regras continua gravando, como antes) | Pessoal |
| Preferência de aparência | `system`/`light`/`dark` | tema | navegador | `localStorage["gradip-theme"]` | só no navegador (e na auditoria, quando muda) | Não pessoal |
| Auditoria do painel (1.3) | e-mail, nome completo, tipo de conta e perfil de quem usa; data e hora; tela; sistema aberto (nome do card); termos buscados na lista de sistemas e na ajuda; valores de antes e depois de cada campo alterado em Formulários e Regras; navegador e versão, sistema operacional, largura da tela, aparência; sessão (identificador sorteado por aba aberta) | rastrear quem fez o quê; base para o painel de auditoria | `Session`, aba `PAINEL_SERVIDORES`, cadastros `SERVIDORES`/`PLANILHA_DOCENTES`, a própria página | planilha `AUDITORIA_PAINEL_SERVIDORES` (abas por ano, só acrescenta linhas, protegidas) | grava; nada é apagado automaticamente | Pessoal (institucional) |
| Contagem dos avisos (1.3) | números por sistema | acompanhar a fila de trabalho | `obterContadoresPendencias` | aba `PENDENCIAS` da auditoria, no máximo 1x por hora | grava | Interna |

Base legal e retenção: A VALIDAR INSTITUCIONALMENTE.

## 3. Recursos externos

| Nome lógico | Tipo | Chave do `ID_INDEX` (desde a 1.4; constante no código) | Público? | Permissão esperada |
|---|---|---|---|---|
| Planilha de Diplomas | Sheets | `EMISSAO_DIPLOMAS` (`CHAVE_PLANILHA_DIPLOMAS`, `Code.gs`) | Não | leitura pela conta que executa |
| Planilha de Habilitações | Sheets | `ABERTURA_HABILITACOES` (`CHAVE_PLANILHA_HABILITACOES`) | Não | leitura (a mesma planilha é gravada pelo [Gerenciador de Abertura de Habilitações](../abertura-habilitacoes/REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas), que mantém a situação na coluna K e o valor `pendente`) |
| Planilha de Trancamento Total | Sheets | `TRANCAMENTO_TOTAL_MATRICULA` (`CHAVE_PLANILHA_TRANCAMENTO_TOTAL`) | Não | leitura |
| Planilha de Trancamento Parcial | Sheets | `TRANCAMENTO_PARCIAL_MATRICULA` (`CHAVE_PLANILHA_TRANCAMENTO_PARCIAL`) | Não | leitura |
| Planilha do BUSP | Sheets | `SEGUNDA_VIA_BUSP` (`CHAVE_PLANILHA_BUSP`) | Não | leitura |
| Planilha de Intercambistas | Sheets | `MATRICULA_INTERCAMBISTAS` (`CHAVE_PLANILHA_INTERCAMBISTAS`) | Não | leitura |
| Planilha de Exclusão de Disciplinas | Sheets | `EXCLUSAO_DISCIPLINAS` (`CHAVE_PLANILHA_EXCLUSAO_DISCIPLINAS`) | Não | leitura |
| Planilha de Períodos | Sheets | `PERIODOS` (`CHAVE_PLANILHA_PERIODOS`, `ConfigFormulariosCore.gs`) | Não | leitura e escrita |
| Planilha de Regras Curriculares | Sheets | `REGRAS_CURRICULARES` (`CHAVE_PLANILHA_REGRAS_CURRICULARES`, `ConfigRegrasCurricularesRepository.gs`) | Não | leitura e escrita |
| Índice mestre | Sheets | Script Property `ID_INDEX_SPREADSHEET_ID` | Não | leitura (primeira aba, colunas "Chave" e "ID de Produção") |
| Cadastros de servidores e de docentes | Sheets | chaves `SERVIDORES` e `PLANILHA_DOCENTES` no `ID_INDEX` (primeira aba) | Não | leitura pela conta que executa (1.2, só para a saudação) |
| Planilha de permissões | Sheets | chave `PERMISSOES_DE_ACESSO` no `ID_INDEX`; aba `PAINEL_SERVIDORES` | Não | leitura pela conta que executa |
| Planilha da auditoria (1.3) | Sheets | chave `AUDITORIA_PAINEL_SERVIDORES` no `ID_INDEX` | Não | escrita pela conta que executa; **só ela abre** (decisão de 20/10/2026) |
| Sistemas da equipe | Web Apps `/exec` | Script Property `URLS_SISTEMAS_EQUIPE` (JSON lido por `UrlsSistemas.gs`) | Não | cada sistema controla o próprio acesso |

Desde a 1.4 nenhum ID de planilha fica no código, nem no Git nem no projeto Apps Script: o painel lê a chave no `ID_INDEX` (`idNoIndicePainel_`, em `AcessoPainel.gs`). O índice é lido uma vez por execução e o mapa chave → ID fica no cache do script por 10 minutos (servidor, nunca vai à página); uma chave que não está no mapa guardado força uma leitura nova. `diagnosticarPlanilhasPainel` (só administrador, no editor) confere as 13 chaves e mostra o nome de cada planilha, nunca o ID. Até a 1.3, os nove IDs ficavam em constantes do código, trocados no Git por marcadores `CONFIGURAR_ID_PLANILHA_<NOME>`.

**URLs dos sistemas internos (20/10/2026).** Até esta data as nove URLs `/exec` dos sistemas da equipe ficavam escritas no `Painel.html`. Com o repositório público, elas saíram do Git: o `Painel.html` recebe as URLs do servidor (`urlsSistemasParaPagina_()`, em `UrlsSistemas.gs`), que lê a Script Property `URLS_SISTEMAS_EQUIPE`. Diferente das URLs do [Painel de Solicitações](../painel-solicitacoes/DADOS_E_SEGURANCA.md), que são destinos divulgados aos alunos, estas levam a ferramentas internas (por exemplo, a Comunidade IPUSP, que envia o cadastro completo a quem abre a página; ver [seção 4 da Comunidade IPUSP](../busca-alunos/DADOS_E_SEGURANCA.md#4-web-app)). URL não é credencial, mas publicá-la tira a única barreira que hoje existe nesses sistemas sem autorização no backend. As URLs antigas continuam no histórico do Git; a forma de invalidá-las (nova implantação) está em [`docs/seguranca/REPOSITORIO_PUBLICO.md`](../../seguranca/REPOSITORIO_PUBLICO.md).

## 4. Web App

- Quem pode acessar: **Qualquer pessoa da USP** (`DOMAIN`, `appsscript.json`), desde 20/10/2026. Antes era `ANYONE_ANONYMOUS`, sem login.
- Executa como: `USER_DEPLOYING`. Como quem acessa e quem implantou são do mesmo domínio, `Session.getActiveUser()` devolve o e-mail de quem está usando, e é ele que vai para a auditoria das Regras.
- Autorização server-side (versão 1.1, `AcessoPainel.gs`):
  - o `doGet` confere o e-mail na aba `PAINEL_SERVIDORES`. Fora da aba, ou sem conta identificada, a pessoa vê `PainelSemAcesso.html`, que não traz nada do painel. Se a lista não puder ser lida (propriedade, chave, aba ou títulos faltando), o painel **fica fechado** e o motivo vai para o log;
  - toda função pública chamada pela página começa com `exigirAcessoPainel_()` (leitura) ou `exigirAdminPainel_()` (gravação). A conferência vale para chamadas diretas a `google.script.run`, não só para os botões;
  - Perfil `ADMINISTRADOR`: vê e altera tudo. Perfil `LEITOR`, vazio ou desconhecido: vê tudo e recebe "Você não tem permissão para fazer alterações…" ao tentar salvar, excluir, ativar, inativar, desativar ou criar. E-mail repetido na aba: vale o menor acesso;
  - a lista fica em cache por 60 s: tirar ou rebaixar alguém vale em até 1 minuto;
  - `migrarRegrasCurricularesMultiCurriculoERevisaoV1`, `TESTE`, `TESTE3`, `diagnosticarUrlsSistemas` e `diagnosticarAcessoPainel` exigem administrador.
- O aviso "Somente leitura" na tela é só informação; quem protege é o servidor. `testes/testar_acesso.js` confere que nenhuma função pública fica sem guarda.
- Auditoria (1.3, `Auditoria.gs` e `AuditoriaPainel.gs`): toda função que grava passa por `auditarAlteracao_`, que abre a planilha da auditoria **antes** de alterar; se não abrir, a alteração é recusada. A página envia os eventos dela por `registrarEventosPainel`, que confere o acesso, aceita só os códigos de origem "navegador" (até 50 por lote) e grava e-mail, nome e perfil lidos no servidor, ignorando o que a página mandar. Recusas de acesso (`ACESSO.NEGAR`, `PERMISSAO.RECUSAR`) são gravadas sem mudar a resposta. `consolidarAuditoriaPainel` só roda pelo gatilho do projeto (o `triggerUid` é conferido) ou por administrador.
- Integridade: cada evento leva `seq` e `hash` (SHA-256 da linha + hash anterior). Quem edita a planilha consegue mudar uma linha, mas não sem a conferência apontar. A proteção das abas e o compartilhamento restrito são a primeira barreira; o selo é a segunda. Não é cofre contra a conta dona do projeto.
- Dados enviados ao cliente: contadores numéricos, configuração de períodos (com links de formulários), regras curriculares, o papel (`admin`/`leitor`) e o nome da própria pessoa para a saudação. Nenhum e-mail da lista nem nome de outras pessoas.

## 5. Configuração

Script Properties (valores fora do Git):

```text
ID_INDEX_SPREADSHEET_ID   ID da planilha ID_INDEX; dela sai a planilha de
                          permissões (chave PERMISSOES_DE_ACESSO)
```

Formato de `URLS_SISTEMAS_EQUIPE` em `UrlsSistemas.gs`:

```text
URLS_SISTEMAS_EQUIPE   JSON com as chaves PESSOAS_IPUSP, EMISSAO_DIPLOMAS,
                       GERENCIADOR_HABILITACOES, GERENCIADOR_TRANCAMENTO_TOTAL,
                       GERENCIADOR_TRANCAMENTO_PARCIAL, GERENCIADOR_BUSP,
                       GERENCIADOR_INTERCAMBISTAS, GERENCIADOR_EXCLUSAO_DISCIPLINAS,
                       CONFIGURACOES_GRADE_HORARIA
```

Constantes nos `.gs`:

```text
ID_PLANILHA_DIPLOMAS
ID_PLANILHA_HABILITACOES
ID_PLANILHA_TRANCAMENTO_TOTAL
ID_PLANILHA_TRANCAMENTO_PARCIAL
ID_PLANILHA_BUSP
ID_PLANILHA_INTERCAMBISTAS
ID_PLANILHA_EXCLUSAO_DISCIPLINAS
ID_PLANILHA_PERIODOS
ID_PLANILHA_REGRAS_CURRICULARES
```

Hoje são constantes no código do projeto Apps Script. Pendência: migrar para o índice mestre `ID_INDEX` (como o Painel de Solicitações e a Busca de Alunos) ou para Propriedades do script, para que a fonte do Git possa ser copiada sem edição.

## 6. Logs

- A auditoria (1.3) vai para a planilha própria, não para o log. No log ficam só as falhas dela ("Auditoria indisponível", "evento ... não gravado", "pendências não gravadas"), sem e-mail nem nome. Se aparecer "alteração ... feita, mas o evento não foi gravado", a alteração aconteceu sem registro: anote data e hora a partir do log de execuções.
- Eventos registrados: falhas de contagem, falhas de `Session`, `TESTE`/`TESTE3` (lista de rulesets), falha ao ler a lista de acesso ou um cadastro da saudação (só a mensagem técnica) e `diagnosticarAcessoPainel` (contagem por perfil, sem e-mails).
- Dados pessoais em log: as funções de contagem registram só mensagens de erro. Não foram vistos logs com nomes ou e-mails de alunos; conferir os registros de execução reais (A VALIDAR).
- O navegador registra no console só a falha de busca dos contadores.

## 7. Compartilhamento e acesso

- Planilhas: a conta que implanta precisa ler as sete planilhas de sistemas e editar as de Períodos e Regras. Revisão de permissões: A VALIDAR.
- Projeto Apps Script: editores do projeto veem os IDs reais.
- Planilha da auditoria: só a conta institucional do Serviço de Graduação; não compartilhar. Quem tiver de consultar recebe um relatório ou o futuro painel de auditoria, não a planilha. O `LEIA-ME` dela explica as abas.
- Coluna `evento_id` (1.3) na aba `AUDITORIA_REGRAS_CURRICULARES`: liga a correção de ruleset ativo ao evento da auditoria geral. Criada sozinha na primeira correção; o histórico de revisões não muda.
- Lista de acesso: aba `PAINEL_SERVIDORES` (A N. USP, B Nome, C e-mail, D Observação, E Perfil). Quem edita a planilha de permissões decide quem abre e quem altera o painel; mantenha essa edição restrita ao Serviço de Graduação. Revisão periódica: A VALIDAR.

## 8. Dados de teste

- `testes/testar_navegador.js` usa formulários, rulesets e contadores fictícios, sem planilhas nem rede.
- `testes/testar_acesso.js`, `testes/testar_saudacao.js` e `testes/testar_auditoria.js` usam e-mails do domínio fictício `exemplo.usp.br` e nomes inventados ("Pessoa Fictícia A", "Maria Fictícia").
- Capturas de tela ficam na pasta temporária e não são versionadas.

## 9. Pontos LGPD/institucionais

- Finalidade: gestão interna dos pedidos e das configurações do Serviço de Graduação.
- Base legal e retenção: A VALIDAR INSTITUCIONALMENTE. A auditoria não apaga nada sozinha; o prazo de guarda dela também está A VALIDAR INSTITUCIONALMENTE.
- Transparência: a Central de Ajuda tem a pergunta "O painel registra o que eu faço?", que diz o que é anotado e quem vê.
- Compartilhamentos externos: nenhum identificado.

## 10. Incidentes

Seguir [`docs/seguranca/INCIDENTES.md`](../../seguranca/INCIDENTES.md). Medida imediata específica: se houver alteração indevida de períodos ou regras, restringir o acesso da implantação e restaurar pela versão da planilha (**Arquivo → Histórico de versões**).

## 11. Exceções

- (até 20/10/2026) URLs `/exec` dos sistemas no código; desde então ficam na Script Property `URLS_SISTEMAS_EQUIPE`.
- (até 20/10/2026) Acesso anônimo sem autorização no backend; resolvido na versão 1.1 (seção 4), depois de implantada.

## 12. Homologação

Checklist de segurança: IDs e URLs internas removidos, sem dados pessoais, sem segredos no Git, sem segredos enviados ao navegador. Autorização no backend e acesso `DOMAIN`: feitos na 1.1, a conferir no `/dev` ([HOMOLOGACAO.md](HOMOLOGACAO.md)). Pendente: migração dos IDs (seção 5).
