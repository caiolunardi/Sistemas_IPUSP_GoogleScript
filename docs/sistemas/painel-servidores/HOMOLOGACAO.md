# Homologação — Painel dos servidores

**Estado:** verificado localmente em Chromium (Playwright) em 13/10/2026. **Não implantado nem conferido no `/exec`.** Depois de implantar, registre aqui a data, a versão da implantação e o resultado do roteiro do [manual](MANUAL_OPERACAO.md#instalar-ou-atualizar).

## Versão 1.4: planilhas pelo ID_INDEX (20/10/2026)

**Estado:** verificada localmente; **não enviada ao editor**. As quatro chaves novas foram criadas no `ID_INDEX` pelo responsável em 20/10/2026.

- `testar_acesso.js` (113 ok): nenhum ID nem marcador no código; as 9 planilhas abertas por `idNoIndicePainel_`; índice lido uma vez por execução, cache do script reaproveitado, chave recém-criada relida, erro com o nome da chave; `diagnosticarPlanilhasPainel` mostra nomes e nunca IDs, aponta a chave que falta e é só para administrador.
- `testar_auditoria.js` (69 ok), `testar_saudacao.js` (18 ok) e `testar_navegador.js` sem mudança de resultado.
- A conferir no `/dev`: `diagnosticarPlanilhasPainel` com 13 `ok`; os oito avisos dos cards com os mesmos números da 1.3; Configurações de Formulários e Regras abrindo e salvando (com a auditoria registrando).

## Versão 1.3: auditoria (20/10/2026)

**Estado:** enviada ao editor pelo clasp (36 arquivos, IDs reais mantidos) e **publicada no `/exec` em 20/10/2026** pelo responsável. Conferido na planilha da auditoria, com a conta institucional:

- `prepararAuditoriaPainel` criou as abas, o `DICIONARIO` (37 códigos) e o `LEIA-ME`; a aba vazia da planilha nova se chamava "Página 1" (com espaço) e não foi apagada — corrigido depois (o código passa a reconhecer os dois nomes);
- `FORMULARIO.SALVAR` com nome, tipo de conta, perfil e duração, e em `ALTERACOES_2026` o campo "C tipo" de `Continuo` para `continuo`;
- `verificarIntegridadeAuditoria`: `ok: true`;
- `PENDENCIAS` gravada;
- pelo `/exec` publicado: `ACESSO.ABRIR` e dois `CARD.ABRIR` (pelo nome do sistema), com sessão, navegador, largura, tema e modo. No primeiro teste, pelo editor, os eventos da página não chegaram; pelo `/exec` chegaram. A conferir: abrir de novo pelo `/dev` com F12 aberto.
- `duracao_ms` do `ACESSO.ABRIR` mede só a página do painel dentro da moldura do Google (dezenas de ms), não o tempo total até aparecer.

A conferir ainda: LEITOR gerando `PERMISSAO.RECUSAR`; `evento_id` na aba das Regras numa correção de ruleset ativo; `SESSOES` e `RESUMO_DIARIO` no dia seguinte.

- Novos: `Auditoria.gs` (núcleo genérico), `AuditoriaPainel.gs`, `AuditoriaPainelUI.html`, `testes/testar_auditoria.js`, [docs/auditoria](../../auditoria/README.md).
- Alterados:
  - as 16 funções públicas que gravam (`salvarConfigFormulario`, `salvarConfigColacao`, `salvarConfigExclusaoDisciplinas`, `desativarFormulario`, as dez das Regras Curriculares, `criarRulesetParaOutroCurriculo` e a migração) passam para `AuditoriaPainel.gs`, com a mesma guarda. A original ganha `SemAuditoria_` no nome e perde só a linha de guarda: `ConfigFormulariosCore.gs`, `ConfigFormularioColacaoGrau.gs`, `ConfigFormularioExclusaoDisciplinas.gs`, `ConfigRegrasCurriculares.gs`, `ConfigRegrasCurricularesMigracao.gs`;
  - `ConfigRegrasCurriculares.gs`: `validarRulesetCurricular` registra a validação;
  - `ConfigRegrasCurricularesRepository.gs`: `repoInserirAuditoria_` preenche a coluna `evento_id` (criada no fim da aba se faltar);
  - `AcessoPainel.gs`: recusas vão para a auditoria, sem mudar a resposta;
  - `Code.gs`: `obterContadoresPendencias` grava a aba `PENDENCIAS` (1x por hora);
  - `SaudacaoPainel.gs`: o cache guarda também nome completo e tipo de conta (`pessoaDoPainel_`); a saudação não muda;
  - `UrlsSistemas.gs`: o diagnóstico é registrado;
  - `Painel.html`: `SESSAO_AUDITORIA` e o include de `AuditoriaPainelUI`;
  - `PainelAjuda.html`: pergunta "O painel registra o que eu faço?" e o problema "A auditoria está indisponível".
- Byte-idênticos à 1.2: todas as telas (`ConfigFormulariosUI`, `ConfigRegrasCurricularesUI`, `PainelNavegacaoUI` etc.), o tema, a ajuda comum e `appsscript.json`. Nada visual muda.
- Testes:
  - `testar_auditoria.js`: **69 checagens, 0 falhas**;
  - `testar_acesso.js`: **99, 0 falhas** (novas: toda função que grava passa pela auditoria; guarda do gatilho diário);
  - `testar_saudacao.js`: 18, 0 falhas;
  - `testar_navegador.js`: **365 checagens, 0 falhas** (novas: os eventos que a página envia, e a página igual com a auditoria fora do ar).

A conferir no `/dev`, depois do `prepararAuditoriaPainel`:

- abrir o painel cria a linha `ACESSO.ABRIR` com o seu nome e perfil;
- um card gera `CARD.ABRIR`;
- salvar um formulário de teste gera `FORMULARIO.SALVAR` e as linhas de antes/depois em `ALTERACOES_2026`;
- com o perfil trocado para LEITOR, Salvar gera `PERMISSAO.RECUSAR`;
- uma correção de ruleset ativo preenche `evento_id` na aba das Regras;
- `verificarIntegridadeAuditoria` dá `ok: true`;
- no dia seguinte, `SESSOES` e `RESUMO_DIARIO` aparecem.

## Versão 1.2: saudação (20/10/2026)

**Estado:** enviada ao editor pelo clasp e conferida no `/dev` em 20/10/2026, nos dois temas. Publicação no `/exec` pendente.

- Novo: `SaudacaoPainel.gs`, `testes/testar_saudacao.js`.
- Alterados: `Painel.html` (elemento `#saudacaoUsuario`, CSS e script), `AcessoPainel.gs` (a leitura do `ID_INDEX` passa a servir para qualquer chave, `idNoIndicePainel_`; mesmo comportamento), `PainelAjuda.html` (pergunta sobre a saudação).
- Token usado: `--gradip-text`.
- `testar_saudacao.js`: **18 checagens, 0 falhas**. `testar_acesso.js`: 77, 0 falhas. `testar_navegador.js`: **342 checagens, 0 falhas** (saudação com e sem nome, período pela hora do navegador, contraste ≥ 4,5:1 nos dois temas, inteira e sem rolagem horizontal em 360 a 1024 px).

A conferir no `/dev`: o nome certo para uma conta de servidor, uma de setor e uma de docente.

## Versão 1.1: controle de acesso (20/10/2026)

**Estado:** enviada ao editor pelo clasp em 20/10/2026 (32 arquivos, IDs reais mantidos) e conferida no `/dev` pelo responsável. Publicação no `/exec` pendente.

- Arquivos novos: `AcessoPainel.gs`, `PainelSemAcesso.html`, `testes/testar_acesso.js`.
- Alterados: `Code.gs` (`doGet` confere o acesso antes de montar o painel), `Painel.html` (aviso "Somente leitura" e `PAPEL_USUARIO`), `PainelAjuda.html` (problema e pergunta sobre o perfil de leitura), `appsscript.json` (`DOMAIN`), e a primeira linha das funções públicas de `ConfigFormularioColacaoGrau.gs`, `ConfigFormularioExclusaoDisciplinas.gs`, `ConfigFormulariosCore.gs`, `ConfigRegrasCurriculares.gs`, `ConfigRegrasCurricularesMigracao.gs`, `UrlsSistemas.gs`, `teste.gs` e `Code.gs` (31 guardas com a de `diagnosticarAcessoPainel`). Nenhuma outra linha desses `.gs` muda.
- Byte-idênticos à 1.0: os demais arquivos, inclusive o JavaScript das telas de Configurações. Os botões de gravar continuam iguais; a recusa vem do servidor e aparece onde já aparecia qualquer erro (aviso do modal ou caixa de alerta).
- Tokens usados no que é novo: `--gradip-info-bg`, `--gradip-info-border` (aviso), `--gradip-warning-border` (página sem acesso), `--gradip-surface`, `--gradip-text`, `--gradip-text-muted`, `--gradip-link`, `--gradip-link-hover`, `--gradip-focus`.

Testes locais:

- `testar_acesso.js`: **77 checagens, 0 falhas** (perfis; e-mail com maiúsculas, espaço e tab; perfil vazio, desconhecido ou repetido; fora da aba; sem conta; cinco falhas de configuração que fecham o painel; cache; diagnóstico sem e-mails; guarda em todas as funções públicas).
- `testar_navegador.js`: **322 checagens, 0 falhas**. Novas: aviso escondido para administrador; para leitor, aviso visível com contraste ≥ 4,5:1 nos dois temas, cards e Regras visíveis, Salvar mostra a recusa no modal e o botão volta; página sem acesso em 360 px e 1280 px, nos dois temas, com marca certa, contraste ≥ 4,5:1 e sem rolagem horizontal.

A conferir no `/dev` com contas reais: administrador salva; leitor vê o aviso e é recusado; conta fora da aba vê a página de sem acesso; a auditoria das Regras registra o e-mail de quem corrigiu.

## Baseline

Pacote “dashboard - servidores.zip”, recebido em 13/10/2026, 19 arquivos em CRLF, convertidos para LF antes de versionar. Dois nomes foram corrigidos: `ConfirHomeUI.html` virou `ConfigHomeUI.html` (o nome que `Painel.html` inclui) e `appscript.json` virou `appsscript.json`. Commit da baseline sanitizada: `Painel dos servidores: fonte recebida em 13/10/2026, sem IDs de planilha`.

## Escopo da mudança

Rodada de interface. Backend sem mudança de comportamento:

- 9 arquivos byte-idênticos à fonte recebida: `ConfigCore.gs`, `ConfigFormularioColacaoGrau.gs`, `ConfigFormularioExclusaoDisciplinas.gs`, `ConfigRegrasCurriculares.gs`, `ConfigRegrasCurricularesAuditoria.gs`, `ConfigRegrasCurricularesMigracao.gs`, `ConfigRegrasCurricularesValidacao.gs`, `teste.gs`, `appsscript.json`, além de `ConfigRegrasCurricularesAjuda.html`.
- 3 `.gs` com diferença **apenas** nas linhas `ID_PLANILHA_*` (conferido por `diff`: nenhuma outra linha muda): `Code.gs`, `ConfigFormulariosCore.gs`, `ConfigRegrasCurricularesRepository.gs`.
- 6 HTML alterados e 10 HTML novos (tabela abaixo).

### O que mudou em cada HTML alterado

| Arquivo | Mudança |
|---|---|
| `Painel.html` | Documento completo com `GradipTema` no `<head>`; cores trocadas por tokens; cabeçalho com marca IPUSP, Aparência, Ajuda, Configurações e marca USP; barra Navegação; menu lateral/abas; card Pessoas do IPUSP no início de `SISTEMAS`; gatilho `?` dos avisos; estilos do conteúdo da ajuda; `fecharTelaConfiguracoes`/`abrirSubTelaConfig` passam a sincronizar o menu; avisos de pendência reaplicados depois da busca (antes, digitar na busca apagava os selos até recarregar). |
| `ConfigHomeUI.html` | Gatilho `? O que muda quando altero uma configuração`. |
| `ConfigFormulariosUI.html` | Cores por tokens (inclusive campos e área de texto da Colação); quatro gatilhos `?`. |
| `ConfigRegrasCurricularesUI.html` | Três cores fixas trocadas por tokens; selo “falhou” do histórico passa a usar classe em vez de estilo inline. |
| `ConfigRegrasCurricularesEstilos.html` | Cores por tokens; borda nos selos de status (o status continua escrito); selo `falhou`; abas do editor com 44 px de altura. |
| `ConfigRegrasCurricularesAjudaEstilos.html` | Cores do manual das Regras por tokens, inclusive busca e seletor do celular. |

IDs de elementos, textos operacionais, fluxos e chamadas `google.script.run` foram mantidos.

### Divergências registradas para decisão

- O manual das Regras Curriculares (já existente) não fecha com ESC; foi mantido como estava.
- A busca de sistemas continua sensível a acentos; a ajuda explica isso. Tornar a busca tolerante a acentos é uma mudança de comportamento e não foi feita.
- Modelo de acesso anônimo sem autorização no backend: ver [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md#4-web-app).

## Tokens usados

`--gradip-bg`, `surface`, `surface-2`, `surface-elevated`, `text`, `text-muted`, `border`, `border-strong`, `link`, `link-hover`, `focus`, `header-bg`, `header-accent`, `primary`, `primary-hover`, `on-primary`, `info`/`info-bg`/`info-border`, `success`/`-bg`/`-border`, `warning`/`-bg`/`-border`, `danger`/`-bg`/`-border`, `disabled-bg`, `disabled-text`, `input-bg`, `input-text`, `input-placeholder`, `overlay`, `shadow`. Única exceção: o brilho do hover no menu (`rgba`), a mesma já aceita na Estrutura Curricular 1.10.0.

## Testes locais

`node sistemas/painel-servidores/testes/testar_navegador.js`: **258 checagens, 0 falhas** (Chromium do Playwright, `google.script.run` simulado com dados fictícios).

| Item do checklist | Resultado |
|---|---|
| Três modos | Sistema resolve para Claro e Escuro conforme `prefers-color-scheme`; Claro e Escuro manuais aplicados. Marcas IPUSP e USP trocam de versão. |
| Preferência do sistema | Com Sistema, mudar o esquema do navegador com a página aberta troca o tema. |
| Persistência manual | Escuro escolhido continua após recarregar (`localStorage["gradip-theme"]`); preferência manual ignora mudança do sistema. |
| Contraste | Texto ≥ 4,5:1 em 43 combinações por tema (cabeçalho, cards, selos, menu, abas, modais, Regras, ajuda). Menor valor: 4,71:1 no Claro (selos amarelos) e 5,10:1 no Escuro. |
| Navegação | Abre no menu lateral; `aria-current` no item atual; Voltar sincroniza; abas com `tablist`/`tab`/`tabpanel`, setas, Home/End e Enter; troca anunciada; modo não persiste. |
| Teclado | Cards focáveis (link ou botão) e abertos com Enter. |
| Pessoas do IPUSP | Primeiro card, categoria Pessoas, abre o endereço da busca de alunos. |
| Configurações de Grade Horária | Card na categoria Grade Horária abre o endereço informado. |
| Ajuda | Seção contextual, foco, bloqueio de rolagem, busca com e sem acento, sem resultado, FAQ com `aria-expanded`, atalhos internos, abertura do manual das Regras, ESC com retorno do foco, ajuda por cima de modal. |
| Mobile | 360, 390, 480, 768 e 1024 px nos dois temas: sem rolagem horizontal (lista, Formulários, abas e ajuda), menu recolhido até 900 px, alvos ≥ 44 px. |
| Movimento reduzido | Transições do menu anuladas. |
| Regressão funcional | Contadores, busca, Configurações, três modais de Formulários e lista de Regras funcionando; nenhum erro de JavaScript. |

Não testado localmente: gravação real nas planilhas, editor de ruleset com dados reais, Safari e Firefox, leitor de tela real. Esses itens ficam para a conferência no `/dev` e no `/exec`.

## Arquivos e hashes

| Arquivo | Situação | SHA-256 atual | SHA-256 recebido (LF) |
|---|---|---|---|
| `Code.gs` | só IDs trocados por marcadores | `cc5d98c2e75d6b1c6c4aecbe0a01e2b001c67c32ed28c984a80b62f8e6847c78` | `cf83e1fbeedb1f39a6e503640970f95c60b9e4699c4b9578eceefd594f9f36c2` |
| `ConfigCore.gs` | byte-idêntico | `9711bb7089c2747be0eaecc9a95f1d10bcf5a982cbfa928f8ca46ce7d3574b62` | igual |
| `ConfigFormularioColacaoGrau.gs` | byte-idêntico | `5bd520786a604f73c551a165e871cbd7466456424e72af5cff7d58929d485089` | igual |
| `ConfigFormularioExclusaoDisciplinas.gs` | byte-idêntico | `f6841eabef4edd6cc8b59566874a7a3cb6dce78b1e71907a6a3b17ed4b9bf63c` | igual |
| `ConfigFormulariosCore.gs` | só IDs trocados por marcadores | `cf0f781a8b33924f2f88211047e881b4caf75caf8e2e2d7b2fe99dfdcaf7782f` | `176b3352efb5b3351c9f151de037e9b4ee4414bf54f6ec6369e8a2840abbfa29` |
| `ConfigFormulariosUI.html` | alterado | `ee184a2d1d8a36eaec91f6e2184d8fe95aa68a4ddec088c97c1ca7c5bf10d423` | `aefb917cc75334ead1f60dfba4aff643cc0aa67ad6d9a248be480b4fba9e2515` |
| `ConfigHomeUI.html` | alterado | `c81c268bc42b97b277b873245fcdcbfab6fe25f5b982b9d1c75f7bc9226c1b40` | `c0f9efd258d78715d0fae63557867e80dda12c7ec86adbdbe01c5b977ca1b446` |
| `ConfigRegrasCurriculares.gs` | byte-idêntico | `6073f84b388c9f29311d66a2d25b0e21d87fc7fc5b8423c55bb3859d9fb84b9f` | igual |
| `ConfigRegrasCurricularesAjuda.html` | byte-idêntico | `bfbdc0941aa569db0217e04da1f377dcb4c9f319ae04ff1a9bd3056a7ed75412` | igual |
| `ConfigRegrasCurricularesAjudaEstilos.html` | alterado | `078fbbd609a82cdaf999729cbaafc9727230dba3694bf8f0497823f4a37d8e28` | `73755f146e922892f1bcf2c0f39fc493f1c7a75eff8d041afb0c87c386fd9507` |
| `ConfigRegrasCurricularesAuditoria.gs` | byte-idêntico | `0aa6abb8b4210cc953981173f146f0daf1fc187559273062f15610d31ae72f00` | igual |
| `ConfigRegrasCurricularesEstilos.html` | alterado | `0a97ed2fec3b91846867472b912998bb9aca758cd7c7fb04746d9e8d9c169b5b` | `c7b685c628806768feb2e90498559672dd3a54976225227509610f05f4b5aafe` |
| `ConfigRegrasCurricularesMigracao.gs` | byte-idêntico | `5e5047e270b9c0bcecfa45f884debefc4588884dd1464fae0ad37cf8b996e9e1` | igual |
| `ConfigRegrasCurricularesRepository.gs` | só IDs trocados por marcadores | `d6843c69beab198a9c93020140b441edc6600c500f11e09d3dda56b8c50c6cbf` | `58e5fb10b19788dbc8f28bb8aadf9c81af2ca0c0b75cb3133686950f26957166` |
| `ConfigRegrasCurricularesUI.html` | alterado | `83b4a6d49de24b6a3dfa1fa5f538ea4b3ba59747a3bacfd1b877bd8e65715aa7` | `693d29b8f7c5f556b7a5931314581888baefad65a8e0faf97b4a72049a6e1d5e` |
| `ConfigRegrasCurricularesValidacao.gs` | byte-idêntico | `d2dd86d1550ae4393946ede9ffafc8f6eea63bda96d222d6d2e5bbea9e233134` | igual |
| `GradipMarcaIPUSP.html` | novo | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` | — |
| `GradipMarcaUSP.html` | novo | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` | — |
| `GradipTema.html` | novo | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` | — |
| `GradipTemaControle.html` | novo | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` | — |
| `Painel.html` | alterado | `6aa1d31c8c42c2379266485ff4873493ae2727558b226fba1f23d1b5ae97aaf4` | `b697f7a4e93f92f8ceec45c2c4da4515599d8d3d36b056d30d61dbcfa4407678` |
| `PainelAjuda.html` | novo | `23535249e3da6ce76491a96de8cf7139a1f1ec6ce20f3e5c6003212642714d98` | — |
| `PainelAjudaEstilos.html` | novo | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` | — |
| `PainelAjudaUI.html` | novo | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` | — |
| `PainelIcones.html` | novo | `c52a0f5a39e3d3565409a13efd4563defb1089403168c7d45fa9acd56f79509c` | — |
| `PainelNavegacaoEstilos.html` | novo | `c92e5188bb9e1b8a177c022f43211778608b1a6f8f8565df8e85ec960cf4a73f` | — |
| `PainelNavegacaoUI.html` | novo | `ef351eed17cfc99e81f9e934de44d0b6869ef99497aca66f81880fe754518490` | — |
| `appsscript.json` | byte-idêntico | `b3b1a4ae145bf7e4c052b296620fef1ce3225d1d83404231319e8ccc6b46e192` | igual |
| `teste.gs` | byte-idêntico | `cc6452accf6db2d39f942c42d799e8939375398597a4e00287e2fc79b1e8a5a7` | igual |
