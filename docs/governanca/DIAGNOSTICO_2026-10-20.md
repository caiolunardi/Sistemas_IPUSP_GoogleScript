# Diagnóstico de governança técnica — 20/10/2026

Fase 0 do mandato de governança do responsável. Base: `main` em `71f6a25` (20/10/2026, 19:30 UTC), API do GitHub, histórico de 20 rodadas da CI e leitura do código. Nenhum dado pessoal, ID ou URL interna neste documento.

Estados usados: **IMPLEMENTADO E VERIFICADO**, **IMPLEMENTADO, MAS PENDENTE DE VALIDAÇÃO**, **NÃO IMPLEMENTADO / DEPENDE DE DECISÃO**. "Confirmado" ou "descartado" se refere ao achado da auditoria externa anterior.

## 1. Resumo

O repositório tem boas bases (CI com 30 suítes, varredura de dados sensíveis, `.claspignore`, documentação de segurança por sistema, auditoria com selo encadeado no Painel dos servidores). As lacunas principais são de **controle efetivo**, não de documentação:

1. Nada no GitHub impede push direto, force push ou merge com CI vermelha. Até hoje todas as mudanças do dia entraram por push direto no `main`.
2. **Dois sistemas da equipe não conferem no servidor quem lê os dados**: Comunidade IPUSP (já documentado) e Gerenciador de Trancamento Total (não documentado, e lê justificativas que podem conter dados de saúde). Hoje os dois estão implantados com acesso "somente eu" (informado pelo responsável em 20/10/2026), então só a conta institucional os abre: o risco é **latente** e volta a ser crítico se o acesso for aberto ao domínio ou a um grupo sem a autorização no servidor.
3. Tags e Releases não têm vínculo verificável com um commit aprovado e com CI verde.
4. O repositório não reproduz o código implantado em 8 dos 9 projetos: falta o manifesto `appsscript.json`.

## 2. Matriz de achados

Gravidade: crítica / alta / média / baixa. Confiança: alta (verificado), média (inferido do código), baixa (depende de informação externa).

| # | Achado | Gravidade | Confiança | Evidência | Situação | Tratamento |
|---|---|---|---|---|---|---|
| G1 | `main` sem proteção e sem rulesets | alta | alta | `GET /branches/main/protection` → 404 "Branch not protected"; `GET /rulesets` → `[]` | confirmado | procedimento em [Proteção do `main`](PROTECAO_DO_MAIN.md); aplicar depende do responsável |
| G2 | Commits de agentes direto no `main` | alta | alta | 20 de 20 rodadas da CI no `main` são `push`; os commits de 20/10 são de sessões de agente | confirmado | regra revogada; [fluxo](FLUXO_DE_MUDANCAS.md), `CLAUDE.md`, `AGENTS.md` |
| G3 | PRs sem revisão formal | média | alta | os 7 PRs do repositório (#1 a #7) estão fechados **sem merge** pelo GitHub e sem review; o conteúdo de #4 e #6 entrou por push direto no `main`. Todos aparecem como autor `caiolunardi`, inclusive os abertos por agentes | confirmado | modelo de PR e [revisão](REVISAO.md); com um só mantenedor o GitHub não exige aprovação ([seção 4](PROTECAO_DO_MAIN.md#4-quem-publica-e-quem-autoriza-dois-modelos)) |
| G4 | Política declarada mais rígida que a aplicada | alta | alta | `CONTRIBUTING.md` dizia "PR com ✗ não é aceito"; `CI.md` dizia "o fluxo do mantenedor é commitar direto no `main`" | confirmado | textos alinhados; a diferença só some com G1 aplicado |
| G5 | Merge squash/rebase permitidos e ramos não apagados | baixa | alta | `allow_squash_merge`, `allow_rebase_merge` = true; `delete_branch_on_merge` = false | novo | configuração na [proteção](PROTECAO_DO_MAIN.md#passo-2--exigir-pr-e-a-ci) |
| C1 | Teste `[dark] busca sem acento` intermitente | média | alta | rodada 15 (`47516e2`): espera de 5 s esgotada; rodadas 9, 13: mesmo teste nos formulários de Exclusão e Trancamento Parcial | confirmado; **causa: teste** | ver seção 3 |
| C2 | Commits do `main` sem veredito da CI | alta | alta | `concurrency: cancel-in-progress` vale também para o `main`: 8 das 20 rodadas foram canceladas por um push seguinte (por exemplo, `a7c3120`, onde estão 9 tags) | novo | CI só cancela em PR (PR de CI) |
| C3 | Falha da varredura em `9a3d6fb` | baixa | alta | rodada 11: e-mails de teste fora da lista; corrigido em `03617d0` (domínio fictício) | resolvido antes deste diagnóstico | — |
| C4 | Actions referenciadas por tag móvel (`@v4`), sem Dependabot | média | alta | `ci.yml`, `release.yml`; aviso do runner: Node 20 obsoleto em `checkout@v4`/`setup-node@v4` | confirmado | pinagem por SHA e Dependabot (PR de CI) |
| C5 | Playwright global sem lockfile nas suítes de tela | baixa | alta | `npm install -g playwright@${PLAYWRIGHT_VERSAO}` (versão fixa, dependências transitivas não travadas) | novo | registrado; a Estrutura usa `npm ci` com lockfile |
| C6 | Sem um único check obrigatório | média | alta | 30 jobs com nomes de matriz; um ruleset teria de listar todos | novo | job `CI concluída` (PR de CI) |
| R1 | Release aceita qualquer commit | alta | alta | `release.yml`: `workflow_dispatch` cria a tag no HEAD do `main` sem conferir a CI; `push` de tag aceita tag em commit fora do `main` | confirmado | release confere SHA, ancestralidade e CI (PR de CI) |
| R2 | Tags sobre commits sem CI verde | média | alta | 9 tags em `a7c3120` (CI cancelada); 3 em `930e677` (CI falhou: C1) | novo | não mover tags ([versões](../VERSOES.md)); registrado |
| R3 | Tags de versão apontando para código posterior | média | alta | `painel-servidores-v1.1` e `v1.2` em `a36a33f`, que já tem o código da 1.3 | novo | registrado; a nota de cada Release deve citar o commit da versão |
| R4 | Tags podem ser movidas ou apagadas | média | alta | sem ruleset de tags | novo | ruleset de tags na [proteção](PROTECAO_DO_MAIN.md) |
| S1 | Comunidade IPUSP: leitura sem autorização no servidor | **latente** (seria crítica com acesso aberto ao domínio) | alta: o responsável informou em 20/10/2026 "Executar como: eu" e "Quem pode acessar: somente eu" | `listarComunidadeParaBusca`, `listarAlunosParaBusca`, `obterFicha`, `obterFichaAluno` não leem a conta; `DADOS_E_SEGURANCA.md` §4 "A VALIDAR" | confirmado | proposta no PR de segurança; configuração a informar pelo responsável |
| S2 | Gerenciador de Trancamento Total: nenhuma função confere a conta | **latente** (idem) | alta: mesma configuração informada (somente a conta institucional) | `obterPendentes`, `obterConcluidosRecentes`, `obterDetalhe`, `salvarPedido`, `buscarHistorico`, `obterRelatorio` sem `Session.getActiveUser`; `salvarPedido` envia e-mail ao aluno; não há `DADOS_E_SEGURANCA.md` do gerenciador | **novo** | idem |
| S3 | `gerarPdfListaAlunos` | baixa | alta | monta o PDF só com as linhas enviadas pela página; não lê planilha. Não é caminho de vazamento, mas aceita até 5.000 linhas de qualquer chamador | parcialmente descartado | coberto pela mesma guarda de S1 |
| S4 | Painel dos servidores: documentação atrasada | média | alta | código: toda função pública chama a guarda (`exigirAcessoPainel_`/`exigirAdminPainel_`); `REPOSITORIO_PUBLICO.md` ainda diz "aceita acesso anônimo e não confere quem chama"; `HOMOLOGACAO.md` idem | confirmado | textos corrigidos (PR de segurança) |
| S5 | `SECURITY.md` aponta para um canal desligado | média | alta | `private-vulnerability-reporting` → `enabled: false`; o formulário de issues aponta para `security/advisories/new` | novo | ligar na [proteção](PROTECAO_DO_MAIN.md#3-segurança-e-actions); `SECURITY.md` ganha o e-mail como canal enquanto isso |
| S6 | Secret scanning e push protection desligados | média | alta | `security_and_analysis` | novo | ligar na [proteção](PROTECAO_DO_MAIN.md#3-segurança-e-actions) |
| A1 | Auditoria: alteração feita sem registro em falha parcial | média | alta | `auditarAlteracao_` confere a planilha **antes**; se a gravação final falhar, só `console.error`. `CLAUDE.md` e `docs/auditoria/README.md` diziam "a alteração é recusada se a auditoria não puder gravar" | confirmado | documentação corrigida; melhoria proposta (PR de segurança) |
| A2 | Diferença antes/depois pode incluir mudança de outra pessoa | baixa | média | o estado "antes" é lido fora do `LockService` que a gravação usa | novo | registrado na proposta de auditoria |
| P1 | 8 de 9 projetos sem `appsscript.json` no repositório | alta | alta | só `sistemas/painel-servidores/src/appsscript.json` existe | novo | inventário e plano (PR de clasp); `clasp pull` do manifesto depende do responsável |
| P2 | Configuração do Web App (executar como, acesso) fora do repositório | alta | alta | consequência de P1; os `DADOS_E_SEGURANCA.md` dizem "A VALIDAR" | confirmado | idem |
| P3 | Painel dos servidores: IDs reais só no clone do PC | — | alta | resolvido na 1.4 (`3de7219`): IDs pelo `ID_INDEX`; `DEVELOPMENT_LOCAL.md` §8 | resolvido no código; implantação da 1.4 no `/exec` pendente | — |
| L1 | Sem `LICENSE`, `CODE_OF_CONDUCT.md`, `CODEOWNERS` | média | alta | API: `license: null` | confirmado | `CODEOWNERS` criado; licença e conduta são [decisões pendentes](README.md#3-decisões-pendentes) |
| L2 | Um único administrador em conta pessoal | média | alta | `owner.type: User`; colaboradores não listáveis por este acesso | confirmado | [decisões pendentes](README.md#3-decisões-pendentes) |
| D1 | Logs e retenção | média | média | auditoria do painel registra e-mail, nome, termos de busca, navegador e largura de tela, sem prazo de retenção; `Protecao.gs` registra e-mails removidos | confirmado | análise na proposta de privacidade (PR de segurança); retenção depende de decisão institucional |

## 3. CI: o teste intermitente

Teste: `[dark] busca sem acento`, nos três formulários (`sistemas/*/formulario/testes/testar_navegador.js`).

- **Sintoma** (rodada 15): o teste preenche a busca da Central de Ajuda e espera até 5 s pelo resultado; a espera esgota.
- **Causa**: `openHelp()` (em `*AjudaUI.html`, cópia de `shared/ajuda/GradipAjudaUI.html`) agenda `focusSection()` num `requestAnimationFrame`, e `focusSection()` chama `clearSearch()`. Quando o teste digitava antes desse quadro, a busca era apagada depois de preenchida e nunca dava resultado. Por isso aumentar a espera (correção de `0b0a26e`) não resolveu.
- **Classificação**: problema do **teste**. No produto, a janela é de um quadro de tela (cerca de 16 ms) depois de abrir a ajuda; uma pessoa não digita tão rápido. Não muda o comportamento.
- **Correção**: `fa89877` (no `main` antes deste diagnóstico) espera dois quadros antes de digitar. Rodadas 16 e 17 verdes; as seguintes foram canceladas por pushes (C2).
- **Demonstração da causa** (segunda rodada, 20/10/2026): na página do formulário de Trancamento Total, com o Chromium dos testes, abrir a ajuda e digitar no mesmo quadro (como o teste antigo podia fazer) deu, nas 20 de 20 tentativas, "1 resultado" logo depois de digitar e campo vazio um quadro depois; abrir, esperar dois quadros e digitar manteve "comprovacao" e "1 resultado" nas 20. É determinístico, não estatístico.
- **Por que a correção elimina a corrida** (e não só a torna rara): `openHelp()` mostra o quadro e agenda o `requestAnimationFrame` na mesma chamada, de forma síncrona. O teste só segue depois de ver o quadro visível, então o quadro de `focusSection()` já está agendado; os callbacks de `requestAnimationFrame` rodam na ordem em que foram agendados, e o teste espera dois. Se um dia `openHelp()` passar a agendar com `setTimeout` ou em dois níveis, a espera precisa ser revista: o comentário no teste aponta isso.
- **O que o teste continua cobrindo**: a busca sem acento, o resultado na seção certa, a FAQ, o ESC e o gatilho contextual. O comportamento do produto não mudou (a correção é só no teste) e, no produto, quem abre a ajuda precisa clicar no campo de busca antes de digitar, o que leva bem mais que um quadro.
- **Verificação local**: ver [seção 6](#6-verificações-executadas).

## 4. Inventário dos projetos Apps Script

| Pasta | Público | Manifesto no Git | Autorização no servidor | Ambiente de homologação |
|---|---|---|---|---|
| `painel-servidores/src` | equipe | sim (`DOMAIN`, `USER_DEPLOYING`) | sim, toda função pública | não |
| `busca-alunos/src` (Comunidade IPUSP) | equipe | **não** | só na gravação | não |
| `trancamento-total/gerenciador/src` | equipe | **não** | **nenhuma** | não |
| `estrutura-curricular/src` | equipe | **não** | sim (`Acesso.gs`, aba de permissões) | não |
| `estrutura-curricular/planilha-grade` | secretarias (script da planilha) | **não** | proteção de abas por e-mail | não |
| `painel-solicitacoes/src` | alunos | **não** | página pública de links | não |
| `grade-horaria-visual/src` | alunos | **não** | página pública, documentada | não |
| `exclusao-disciplinas/formulario/src` | alunos | **não** | login USP; qualquer conta `@usp.br` envia (documentado) | sim (`AMBIENTE`) |
| `trancamento-parcial/formulario/src` | alunos | **não** | idem | sim |
| `trancamento-total/formulario/src` | alunos | **não** | idem | sim |

Conta das implantações: institucional, segundo `DEVELOPMENT_LOCAL.md` e o manual de cada sistema. Não verificável pelo repositório.

## 5. Depende de autorização ou informação do responsável

1. Informar "Executar como" e "Quem pode acessar" das demais ferramentas da equipe (P2). Comunidade IPUSP e Gerenciador: informados em 20/10/2026 ("eu" / "somente eu").
2. Aplicar o ruleset do `main`, o de tags, as opções de merge e de segurança ([procedimento](PROTECAO_DO_MAIN.md)) (G1, G5, R4, S5, S6).
3. Fazer `clasp pull` (ou autorizar) só do manifesto de cada projeto, para versioná-lo (P1).
4. Decidir a correção de acesso da Comunidade IPUSP e do Gerenciador (S1, S2): mudança de comportamento, classe crítica.
5. Decisões institucionais: licença, titularidade, retenção, segundo responsável (L1, L2, D1).

## 6. Verificações executadas

No container do agente, Node 22.22, Playwright 1.56.1, sobre `71f6a25`:

| Comando | Resultado |
|---|---|
| `node ferramentas/verificar_publicacao.js` | saída 0 |
| `node ferramentas/verificar_copias_shared.js` | saída 0 |
| 10 suítes de servidor da CI | todas com 0 falha |
| 7 suítes de tela da CI | todas com 0 falha (Comunidade 268, Grade 148, Exclusão 197, Parcial 183, Total 149, Painel dos alunos 246, Painel dos servidores 365 verificações) |
| `trancamento-total/formulario` `testar_navegador.js`, 10 vezes seguidas | 10 de 10 com 149 ok, 0 falha |
| Segunda rodada: os três formulários (`testar_navegador.js`) **em paralelo**, 5 rodadas | 15 de 15 sem falha (197, 183 e 149 ok) |
| Segunda rodada: abrir a ajuda e digitar no mesmo quadro × esperar dois quadros, 20 vezes cada | 20 de 20 com a busca apagada × 20 de 20 com a busca mantida |

Limites: os testes simulam o Apps Script e as planilhas. Nenhum deles mostra a configuração da implantação, o código que está no editor nem o comportamento no `/exec`.

## 7. Plano

Ordem por risco e dependência. Cada item é um PR separado, para o responsável avaliar.

1. **Governança do `main` e dos agentes** (este PR): fluxo, classes de risco, revisão, modelo de PR, `CODEOWNERS`, procedimento de proteção, este diagnóstico.
2. **CI e Releases**: veredito em todo commit do `main`, job único obrigatório, Actions por SHA, Dependabot, Release só sobre commit do `main` com CI verde.
3. **Segurança e privacidade**: proposta de autorização de leitura (Comunidade IPUSP, Gerenciador), documentação do gerenciador, correções de documentação (S4, S5, A1), análise de logs e retenção.
4. **Reprodutibilidade com clasp**: inventário, modelo GitHub → homologação → produção, vínculo commit-implantação, rollback, plano para os manifestos.

Depois, com as respostas do responsável: aplicar as proteções, versionar os manifestos e implementar a correção de acesso escolhida (classe crítica, com testes negativos e homologação).
