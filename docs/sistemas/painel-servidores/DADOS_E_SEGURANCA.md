# Dados e segurança — Painel dos servidores

Preenchido a partir do código recebido em 13/10/2026, segundo [`SYSTEM_SECURITY_TEMPLATE.md`](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md). Não contém IDs reais nem dados pessoais.

## 1. Escopo

- Sistema: Painel de Sistemas — servidores (Serviço de Graduação, IPUSP).
- Público: equipe.
- Ambiente: produção (implantação `/exec` existente); a fonte do Git ainda não foi implantada.
- Responsável funcional: Serviço de Graduação (A VALIDAR INSTITUCIONALMENTE o nome do responsável).
- Última revisão: 13/10/2026, revisão de código, sem acesso ao projeto Apps Script nem às planilhas.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Pedidos de alunos (nome, situação, e-mail, disciplina) | “nome preenchido”, “pendente” | contar pendências | planilhas dos sistemas | só no servidor; o navegador recebe **apenas números** | não grava | Pessoal (lido, não exposto) |
| Períodos de formulários | datas, horários, tipo, link do formulário | abrir/fechar formulários | planilha de períodos | navegador (leitura e edição) | grava na planilha | Interna |
| Regras curriculares | códigos de curso/habilitação, disciplinas, requisitos | conferência de históricos | planilha de regras | navegador (leitura e edição) | grava na planilha | Interna |
| Auditoria de correção | e-mail de quem corrigiu, data, motivo, antes/depois | rastrear correções de ruleset ativo | `Session` | aba `AUDITORIA_REGRAS_CURRICULARES` | grava na planilha | Pessoal (e-mail institucional) |
| Preferência de aparência | `system`/`light`/`dark` | tema | navegador | `localStorage["gradip-theme"]` | só no navegador | Não pessoal |

Base legal e retenção: A VALIDAR INSTITUCIONALMENTE.

## 3. Recursos externos

| Nome lógico | Tipo | Config key (constante no código) | Público? | Permissão esperada |
|---|---|---|---|---|
| Planilha de Diplomas | Sheets | `ID_PLANILHA_DIPLOMAS` (`Code.gs`) | Não | leitura pela conta que executa |
| Planilha de Habilitações | Sheets | `ID_PLANILHA_HABILITACOES` | Não | leitura |
| Planilha de Trancamento Total | Sheets | `ID_PLANILHA_TRANCAMENTO_TOTAL` | Não | leitura |
| Planilha de Trancamento Parcial | Sheets | `ID_PLANILHA_TRANCAMENTO_PARCIAL` | Não | leitura |
| Planilha do BUSP | Sheets | `ID_PLANILHA_BUSP` | Não | leitura |
| Planilha de Intercambistas | Sheets | `ID_PLANILHA_INTERCAMBISTAS` | Não | leitura |
| Planilha de Exclusão de Disciplinas | Sheets | `ID_PLANILHA_EXCLUSAO_DISCIPLINAS` | Não | leitura |
| Planilha de Períodos | Sheets | `ID_PLANILHA_PERIODOS` (`ConfigFormulariosCore.gs`) | Não | leitura e escrita |
| Planilha de Regras Curriculares | Sheets | `ID_PLANILHA_REGRAS_CURRICULARES` (`ConfigRegrasCurricularesRepository.gs`) | Não | leitura e escrita |
| Sistemas da equipe | Web Apps `/exec` | URLs no array `SISTEMAS` (`Painel.html`) | destino de navegação | cada sistema controla o próprio acesso |

No Git, os nove IDs foram trocados por `CONFIGURAR_ID_PLANILHA_<NOME>`. Os valores reais ficam só no projeto Apps Script. As URLs `/exec` dos sistemas foram mantidas, como no [Painel de Solicitações](../painel-solicitacoes/DADOS_E_SEGURANCA.md): são destinos de navegação exibidos a quem usa o painel, não credenciais.

## 4. Web App

- Quem pode acessar: `ANYONE_ANONYMOUS` (`appsscript.json`), ou seja, qualquer pessoa com a URL, sem login.
- Executa como: `USER_DEPLOYING`.
- Autorização server-side: **nenhuma**. Nenhuma função confere quem está chamando.
- Dados enviados ao cliente: contadores numéricos, configuração de períodos (com links de formulários) e regras curriculares.
- Operações privilegiadas expostas a `google.script.run`: salvar e desativar períodos de formulários; criar, editar, validar, ativar, inativar e versionar rulesets; e também `migrarRegrasCurricularesMultiCurriculoERevisaoV1`, `TESTE` e `TESTE3`, que não têm `_` no fim do nome e por isso também podem ser chamadas pelo navegador.

**Risco principal (não corrigido nesta rodada, que foi de interface):** quem tiver a URL `/exec` pode, sem login, alterar os períodos dos formulários dos alunos e as Regras Curriculares, com as permissões de quem implantou. Como o Web App executa como quem implantou e aceita anônimos, a auditoria tende a registrar o e-mail de quem implantou ou `NAO_IDENTIFICADO`, e não o de quem realmente corrigiu.

Recomendações, para decisão do responsável:
1. Mudar o acesso para **“Qualquer pessoa da USP”** (`DOMAIN`) ou contas específicas.
2. Validar no backend uma lista de contas autorizadas (por exemplo, editores de uma planilha de controle) antes de qualquer gravação.
3. Renomear `migrarRegrasCurricularesMultiCurriculoERevisaoV1`, `TESTE` e `TESTE3` com `_` no fim (ou removê-los da implantação), para que não possam ser chamados pelo navegador.
4. Avaliar `USER_ACCESSING` se a auditoria precisar do e-mail real de quem corrigiu.

## 5. Configuração

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

- Eventos registrados: falhas de contagem, falhas de `Session`, `TESTE`/`TESTE3` (lista de rulesets).
- Dados pessoais em log: as funções de contagem registram só mensagens de erro. Não foram vistos logs com nomes ou e-mails de alunos; conferir os registros de execução reais (A VALIDAR).
- O navegador registra no console só a falha de busca dos contadores.

## 7. Compartilhamento e acesso

- Planilhas: a conta que implanta precisa ler as sete planilhas de sistemas e editar as de Períodos e Regras. Revisão de permissões: A VALIDAR.
- Projeto Apps Script: editores do projeto veem os IDs reais.

## 8. Dados de teste

- `testes/testar_navegador.js` usa formulários, rulesets e contadores fictícios, sem planilhas nem rede.
- Capturas de tela ficam na pasta temporária e não são versionadas.

## 9. Pontos LGPD/institucionais

- Finalidade: gestão interna dos pedidos e das configurações do Serviço de Graduação.
- Base legal e retenção: A VALIDAR INSTITUCIONALMENTE.
- Compartilhamentos externos: nenhum identificado.

## 10. Incidentes

Seguir [`docs/seguranca/INCIDENTES.md`](../../seguranca/INCIDENTES.md). Medida imediata específica: se houver alteração indevida de períodos ou regras, restringir o acesso da implantação e restaurar pela versão da planilha (**Arquivo → Histórico de versões**).

## 11. Exceções

- URLs `/exec` dos sistemas mantidas no código, como destinos públicos de navegação.
- Modelo de acesso anônimo mantido sem alteração (fora do escopo da rodada visual), registrado acima para decisão.

## 12. Homologação

Checklist de segurança: IDs removidos, sem dados pessoais, sem segredos no Git, sem segredos enviados ao navegador. Itens pendentes: autorização no backend e modelo de acesso (seção 4), migração dos IDs (seção 5).
