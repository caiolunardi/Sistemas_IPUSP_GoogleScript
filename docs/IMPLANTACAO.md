# Implantação: do commit aprovado ao Apps Script, e como voltar atrás

Como se leva um commit do `main` ao Google de modo que fique registrado **qual commit foi para o editor e para cada versão da implantação**, e que dê para **voltar atrás**. A conferência automática alcança só o código do editor (seção 4); o resto depende do registro (seção 6). Complementa o [desenvolvimento local com clasp](../DEVELOPMENT_LOCAL.md) (como usar o clasp) e o [fluxo de mudanças](governanca/FLUXO_DE_MUDANCAS.md#6-do-main-ao-google) (quem autoriza). Nada aqui é feito por agente sem ordem explícita do responsável.

## 1. Três coisas diferentes

| Ação | O que muda | Quem vê |
|---|---|---|
| merge no `main` | só o GitHub | ninguém que usa os sistemas |
| `clasp push` | o código do projeto Apps Script (editor e `/dev`); gatilhos e execuções pelo editor passam a usar esse código | quem abre o `/dev` e qualquer gatilho do projeto |
| nova versão da implantação (`clasp deploy`/editor) | o `/exec` | todos os usuários |

Por isso o `clasp push` também é uma ação de produção quando o projeto tem gatilhos (Estrutura Curricular, Painel dos servidores) ou quando a equipe usa o `/dev`.

## 2. Inventário (20/10/2026)

| Projeto (pasta) | Manifesto no Git | Configuração fora do código | Homologação | Divergência conhecida entre Git e Google |
|---|---|---|---|---|
| `painel-servidores/src` | **sim** | `ID_INDEX_SPREADSHEET_ID`, `URLS_SISTEMAS_EQUIPE`; chaves no `ID_INDEX` | não | `/exec` na 1.3; editor com a 1.4 (`3de7219` + correção `a36a33f`); `36266d6` ainda não enviado. Até a 1.3, IDs reais só no clone do PC (resolvido na 1.4) |
| `busca-alunos/src` | não | `ID_INDEX_SPREADSHEET_ID` | não | a conferir (seção 4) |
| `trancamento-total/gerenciador/src` | não | idem | não | em uso a v1.0 (ID literal no código, segundo o README do código); a v1.1 do Git não foi implantada |
| `estrutura-curricular/src` | não | idem + gatilhos | não | a conferir |
| `estrutura-curricular/planilha-grade` | não | script da planilha das secretarias | não | a conferir |
| `painel-solicitacoes/src` | não | `ID_INDEX_SPREADSHEET_ID` | não | a conferir |
| `grade-horaria-visual/src` | não | idem | não | a conferir |
| `exclusao-disciplinas/formulario/src` | não | idem + `AMBIENTE` | sim | a conferir |
| `trancamento-parcial/formulario/src` | não | idem + `AMBIENTE` | sim | a conferir |
| `trancamento-total/formulario/src` | não | idem + `AMBIENTE` | sim | a conferir |
| `abertura-habilitacoes/gerenciador/src` (21/10/2026) | **sim** (acesso "Somente eu" até a homologação) | `ID_INDEX_SPREADSHEET_ID`; chaves `ABERTURA_HABILITACOES` e `PERMISSOES_DE_ACESSO` + `AMBIENTE` | prevista ([plano](sistemas/abertura-habilitacoes/HOMOLOGACAO.md)) | em uso a v1.0 (ID literal no código, fora do repositório); a v2.0 do Git não foi implantada |

Conta dona dos projetos: a institucional do Serviço de Graduação (segundo `DEVELOPMENT_LOCAL.md`). O repositório não guarda IDs de script nem de implantação, de propósito.

**Risco principal (P1 do [diagnóstico](governanca/DIAGNOSTICO_2026-10-20.md)):** sem `appsscript.json`, o repositório não diz com que opções o Web App roda (executar como, quem acessa, escopos, fuso). E um `clasp push` a partir dessas pastas não deve funcionar: o clasp substitui todos os arquivos do projeto pelos da pasta, e o Apps Script exige o manifesto entre eles (comportamento a confirmar com `clasp status` no primeiro uso; se o push passar, o manifesto do projeto pode ser trocado ou perdido). Não faça push dessas pastas antes da seção 5.

## 3. Modelo de ambientes

```
ramo do PR ──(ordem explícita)──▶ projeto de HOMOLOGAÇÃO (cópia, AMBIENTE=homologacao, planilhas de teste)
     │
   merge
     ▼
commit do main com CI ✓ ──(ordem explícita)──▶ projeto de PRODUÇÃO: clasp push → /dev → nova versão → /exec
```

- **Configuração por ambiente:** o código é o mesmo; o que muda fica no projeto, nunca no Git. IDs pelo `ID_INDEX` (coluna `ID de Produção` ou `Homologação`), escolha pela Script Property `AMBIENTE` ([ambiente de homologação](sistemas/AMBIENTE_DE_HOMOLOGACAO.md)), URLs da equipe em `URLS_SISTEMAS_EQUIPE`. Script Properties não são cofre: qualquer editor do projeto as lê.
- **Manifesto por ambiente:** o mesmo `appsscript.json` vale para os dois projetos. Se a homologação precisar de opção diferente (por exemplo, acesso mais restrito), registre a diferença no README do sistema em vez de manter dois manifestos.
- **Migração gradual:** os três formulários já seguem o modelo. Os outros entram um por vez, quando cada um tiver mudança a implantar: primeiro o manifesto (seção 5), depois, se fizer sentido, a coluna `Homologação` e a propriedade `AMBIENTE`.

### Nome dos projetos no Google

Decisão do responsável (21/10/2026), para **padronizar os nomes e facilitar a localização dos scripts na hora de criar e alterar** sistemas: todo projeto Apps Script do setor se chama

```
GRADIP · <Sistema> · <AMBIENTE>
```

| Parte | Regra |
|---|---|
| `GRADIP` | Prefixo fixo. Agrupa os projetos do setor na lista do Google e os separa de projetos pessoais ou antigos. |
| `<Sistema>` | O nome do sistema, sem número de versão (a versão fica no Git e nas Releases). **O nome que está no Google é o oficial** (decisão do responsável, 26/10/2026): o [catálogo](SISTEMAS.md) e a documentação usam o mesmo nome, e os nomes antigos são trocados aos poucos, à medida que cada sistema for desenvolvido. Formulário e gerenciador do mesmo assunto são sistemas diferentes. |
| `<AMBIENTE>` | Em maiúsculas: `PRODUÇÃO` (o `/exec` que a equipe ou os alunos usam), `HOMOLOGAÇÃO` (testes, com `AMBIENTE=homologacao` e planilhas fictícias), `LEGADO` (versão antiga guardada para consulta ou para voltar atrás) ou `ARQUIVADO` (fora de uso; fica guardado em vez de ser apagado). |

Separador: espaço, ponto médio (`·`) e espaço. Exemplos:

- `GRADIP · Gerenciador de Abertura de Habilitações · PRODUÇÃO`
- `GRADIP · Gerenciador de Abertura de Habilitações · HOMOLOGAÇÃO`
- `GRADIP · Exclusão de Disciplinas · PRODUÇÃO`

Projetos registrados em 26/10/2026, com o nome exatamente como está no Google. A lista completa, com o endereço `/exec` e a aba de permissões de cada um, fica na planilha da chave `SISTEMAS` do `ID_INDEX` (fora do Git); aqui vão só os nomes.

| Projeto no Google | Documentação | Aba em `PERMISSOES_DE_ACESSO` |
|---|---|---|
| `GRADIP · Painel Alunos · PRODUÇÃO` | [Painel de Solicitações](sistemas/painel-solicitacoes/README.md) | (público aos alunos) |
| `GRADIP · Painel Servidores · PRODUÇÃO` | [Painel de Sistemas](sistemas/painel-servidores/README.md) | `PAINEL_SERVIDORES` |
| `GRADIP · Gerenciador de Pessoas · PRODUÇÃO` | [Gerenciador de Pessoas](sistemas/busca-alunos/README.md) (antes Comunidade IPUSP) | `PESSOAS_IPUSP` (o código atual não confere a aba) |
| `GRADIP · Grade Horaria - Config · PRODUÇÃO` | [Grade Horaria - Config](sistemas/estrutura-curricular/README.md) (Estrutura Curricular e Grade Horária) | `ESTRUTURA_CURRICULAR` |
| `GRADIP · Gerenciador de Abertura de Habilitações · PRODUÇÃO` | [Gerenciador de Abertura de Habilitações](sistemas/abertura-habilitacoes/README.md) | `GERENCIADOR_HABILITACOES` |
| `GRADIP · Gerenciador de Abertura de Habilitações · HOMOLOGAÇÃO` | idem | `GERENCIADOR_HABILITACOES`, na planilha da coluna Homologação |
| `GRADIP · Gerenciador de Trancamento Total de Matricula · PRODUÇÃO` | fora do repositório (o [gerenciador 1.1](sistemas/trancamento-total/README.md) do repositório não está implantado) | `GERENCIADOR_TRANCAMENTO_TOTAL` |
| `GRADIP · Gerenciador de Trancamento Parcial de Matricula · PRODUÇÃO` | fora do repositório | `GERENCIADOR_TRANCAMENTO_PARCIAL` |
| `GRADIP · Gerenciador de exclusão de disciplinas · PRODUÇÃO` | fora do repositório | `GERENCIADOR_EXCLUSAO_DISCIPLINAS` |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · PRODUÇÃO` | fora do repositório | `EMISSAO_DIPLOMAS` |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · HOMOLOGACAO` | fora do repositório | `EMISSAO_DIPLOMAS` |
| `GRADIP · Gerenciador BUSP · PRODUÇÃO` | fora do repositório | `GERENCIADOR_BUSP` |
| `GRADIP · Gerenciador de Matrícula dos Intercambistas · PRODUÇÃO` | fora do repositório | `GERENCIADOR_INTERCAMBISTAS` |

A coluna da aba diz qual lista o sistema deveria usar; só o Painel dos servidores, a Grade Horaria - Config e o Gerenciador de Abertura de Habilitações conferem essa lista no servidor. Diferenças de grafia que ainda existem no Google (`HOMOLOGACAO`, `Matricula`, `Horaria`, `exclusão` em minúsculas) ficam como estão até o responsável renomear o projeto; a documentação acompanha o nome do Google.

Como aplicar:

- **Projeto novo:** já nasce com o nome no padrão (`clasp create-script --title "GRADIP · … · HOMOLOGAÇÃO"` ou o nome dado no editor).
- **Projeto existente:** no editor, clique no nome do projeto, no alto da página, e troque. Vale também para scripts ligados a uma planilha ou formulário. O clasp não renomeia projetos. Renomear **não** muda o ID do script, a URL `/exec`, as implantações, os gatilhos nem as permissões.
- **O nome serve para achar, não para provar.** Quem liga a pasta ao projeto é o `.clasp.json`, que fica só no computador (o ID nunca vai para o Git nem para a documentação). Antes de qualquer `clasp push`, confira o conteúdo do projeto (seção 4), mesmo que o nome esteja certo.
- **Dúvida sobre qual projeto é qual** (nomes antigos parecidos): quem decide é o responsável, pela URL `/exec` em uso. Ninguém renomeia nem envia código por suposição.

## 4. Conferir o código do editor

A ferramenta [`ferramentas/conferir_implantacao.js`](../ferramentas/conferir_implantacao.js) compara uma pasta trazida pelo `clasp pull` com o repositório **sem mostrar conteúdo** (só nomes, impressões digitais e quantas linhas diferem). Testes: [`ferramentas/testes/testar_conferir_implantacao.js`](../ferramentas/testes/testar_conferir_implantacao.js), na CI.

**O `clasp pull` só é feito pelo responsável, ou por um agente com ordem explícita para aquele pull**, porque lê o projeto real com a conta institucional. Ele não muda nada no Google, mas traz para o computador código que pode ter IDs reais (versões antigas).

No computador com o clasp, **fora do clone do repositório**:

```bash
mkdir -p ~/conferencia/<sistema> && cd ~/conferencia/<sistema>
# .clasp.json com o scriptId do projeto, rootDir ".", scriptExtensions [".gs",".js"]
clasp pull                                   # só lê do Google; nada muda lá
cd <clone-do-repositório>
node ferramentas/conferir_implantacao.js ~/conferencia/<sistema> sistemas/<sistema>/src --procurar
```

- `--procurar`: diz qual commit do histórico tem exatamente o código do editor. Se nenhum tiver, o editor tem alterações que não estão no Git: **registre como divergência** no README do sistema (sem colar o código) e decida, num PR, se elas entram no repositório ou se o próximo push as substitui.
- `--commit <sha>`: compara com um commit específico (por exemplo, o da Release).
- Código de saída: `0` idêntico (incluindo o manifesto), `1` há diferença ou o manifesto não pôde ser comparado, `2` erro de uso. Erro nunca vira "idêntico".

### O que a ferramenta prova e o que não prova

| Prova (equivalência do código-fonte do editor) | Não prova (configuração e comportamento do ambiente) |
|---|---|
| os `.gs`/`.js`/`.html` do editor são iguais, linha a linha, aos do repositório naquele commit, com as mesmas exclusões do `.claspignore` (ocultos, `testes/`, `node_modules/`), incluindo subpastas | que o `/exec` roda esse código: ele usa uma **versão numerada** da implantação, que pode ser anterior ao editor |
| o `appsscript.json` do editor é igual ao do repositório, **quando o repositório o versiona** | Script Properties (`ID_INDEX_SPREADSHEET_ID`, `AMBIENTE`, `URLS_SISTEMAS_EQUIPE`…) e os IDs que elas apontam |
| qual commit do histórico da pasta (até 300) tem exatamente esse código | identidade de execução e quem pode acessar, se o manifesto não estiver versionado; escopos já autorizados |
| | gatilhos instaláveis, permissões das planilhas e pastas, ID e versão da implantação |

Regras que evitam falso "idêntico" (cada uma tem teste):

- `.gs` e `.js` são o mesmo arquivo no Apps Script; se os dois existirem com o mesmo nome, é **erro**, não escolha silenciosa.
- Finais de linha (`CRLF`/`LF`) e espaços no **fim do arquivo** são ignorados; qualquer outra diferença de espaço ou linha em branco conta.
- Arquivo de um lado só aparece como `SÓ NO GOOGLE` ou `SÓ NO REPOSITÓRIO`. Pasta vazia, inexistente ou sem código é erro.
- Manifesto ausente no repositório: a comparação direta acusa `SÓ NO GOOGLE appsscript.json (manifesto não versionado)`; o `--procurar` compara só o código e diz que o manifesto **não foi comparado** (saída `1`).
- Links simbólicos não são seguidos. A pasta do `clasp pull` dentro do repositório é recusada.
- A ferramenta só lê arquivos e roda `git` (sem rede, sem clasp, sem escrever nada); um teste confere isso no código.

Limites conhecidos: se a pasta `src/` mudou de lugar no histórico, o `--procurar` não olha os commits de antes da mudança (rode com o caminho antigo e `--commit`); nomes que só diferem em maiúsculas podem colidir num sistema de arquivos que não diferencia (macOS, Windows).

Não apague a pasta de conferência antes de terminar e não a copie para o repositório.

## 5. Versionar o manifesto (um sistema por vez)

Para cada projeto sem `appsscript.json` no Git, **com autorização específica do responsável para aquele projeto**:

1. `clasp pull` numa pasta de conferência isolada, fora do repositório (seção 4). Nada é enviado ao Google.
2. Copie **só** o `appsscript.json` para `sistemas/<sistema>/src/` e inspecione antes de qualquer `git add`: não pode ter ID de planilha, pasta, script ou implantação, nem e-mail ou URL privada. O manifesto costuma ter `timeZone`, `runtimeVersion`, `webapp` (`executeAs`, `access`), `oauthScopes`, `dependencies`; nenhum deles é segredo, mas um valor inesperado é achado e vai para o PR (sem colar dados sensíveis).
3. Compare `webapp.access` e `executeAs` com o `DADOS_E_SEGURANCA.md` do sistema; diferença é achado.
4. Abra um PR (classe **crítica**: configuração de produção) só com o manifesto e a seção 4 do `DADOS_E_SEGURANCA.md` atualizada. `node ferramentas/verificar_publicacao.js` precisa passar.

Limites do procedimento:

- Pôr o manifesto no Git **não muda nada no Google**: nem permissões, nem implantações. Ele só passa a valer no próximo `clasp push` daquela pasta, que já exige ordem explícita.
- Depois desse push, uma **nova versão** da implantação usaria o manifesto do push. As versões já implantadas não mudam.
- O manifesto não diz quem pode acessar uma implantação **já existente** se ela foi criada antes com outra configuração; isso só se confere na tela **Gerenciar implantações**.
- Nenhum projeto é sobrescrito por este procedimento: ele só lê (pull) e escreve no clone local.

## 6. Registro de cada implantação

No README do sistema (`docs/sistemas/<sistema>/README.md`), uma linha por implantação, e a mesma informação na Release:

| Data | Versão do sistema | Commit | Para onde | Versão da implantação | Quem autorizou | Conferência |
|---|---|---|---|---|---|---|
| DD/MM/AAAA | 1.4 | `abc1234` | editor (`clasp push`) | — | responsável | `conferir_implantacao.js --commit abc1234`: idêntico |
| DD/MM/AAAA | 1.4 | `abc1234` | `/exec` | nº da versão no editor | responsável | homologação no `/dev` em DD/MM |

O número da versão da implantação não é segredo (é um inteiro do projeto); o ID da implantação é, e não entra.

## 7. Voltar atrás

| O que deu errado | Como voltar | Observação |
|---|---|---|
| `/exec` com problema depois de nova versão | **Implantar → Gerenciar implantações → editar → Versão:** escolher a anterior | imediato; mesma URL. Não precisa do Git |
| editor/`/dev` com problema depois do `clasp push` | `clasp push` do commit anterior registrado (seção 6), com `clasp status` antes | só com ordem explícita; os gatilhos usam o código do editor |
| código anterior desconhecido | `conferir_implantacao.js --procurar` numa pasta de pull feita **antes** do push | por isso: puxe e confira antes de cada push (o pull também é com autorização) |
| dado gravado errado | histórico de versões da planilha | o código não desfaz gravações |

Antes de cada `clasp push` em produção: `clasp pull` numa pasta de conferência e `conferir_implantacao.js --procurar`. Se o editor tiver algo que não está no Git, **pare**: o push apagaria essa alteração.
