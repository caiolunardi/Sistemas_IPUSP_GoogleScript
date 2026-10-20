# Implantação: do commit aprovado ao Apps Script, com volta garantida

Como se leva um commit do `main` ao Google de modo que dê para provar depois **qual código está rodando** e **voltar atrás**. Complementa o [desenvolvimento local com clasp](../DEVELOPMENT_LOCAL.md) (como usar o clasp) e o [fluxo de mudanças](governanca/FLUXO_DE_MUDANCAS.md#6-do-main-ao-google) (quem autoriza). Nada aqui é feito por agente sem ordem explícita do responsável.

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

## 4. Provar qual código está no Google

A ferramenta [`ferramentas/conferir_implantacao.js`](../ferramentas/conferir_implantacao.js) compara uma pasta trazida pelo `clasp pull` com o repositório **sem mostrar conteúdo** (só nomes, impressões digitais e quantas linhas diferem). Não envia nada e recusa uma pasta de pull dentro do repositório.

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
- O `clasp pull` traz o código do **editor** (o que o `/dev` usa). O `/exec` usa uma versão numerada; para conferir o `/exec`, compare com o commit registrado na implantação (seção 6).

Não apague a pasta de conferência antes de terminar e não a copie para o repositório (pode ter IDs reais, no caso de versões antigas).

## 5. Versionar o manifesto (um sistema por vez)

Para cada projeto sem `appsscript.json` no Git, o responsável (ou um agente com ordem explícita):

1. Faz o `clasp pull` da seção 4 e copia **só** o `appsscript.json` da pasta de conferência para `sistemas/<sistema>/src/`.
2. Confere o arquivo: não deve ter ID de planilha, de pasta nem de script. Se `webapp.access` ou `executeAs` estiverem diferentes do que o `DADOS_E_SEGURANCA.md` do sistema diz, a diferença é um achado.
3. Abre um PR (classe **crítica**: configuração de produção) com o manifesto, atualizando a seção 4 do `DADOS_E_SEGURANCA.md` com o que ele diz.

Depois disso, o `clasp push` daquela pasta envia o manifesto certo e o repositório passa a descrever a configuração do Web App. A configuração da **implantação** (quem acessa) é lida do manifesto da versão implantada, então uma mudança de acesso também passa a ser um diff revisável.

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
| código anterior desconhecido | `conferir_implantacao.js --procurar` numa pasta de pull feita **antes** do push | por isso: puxe e confira antes de cada push |
| dado gravado errado | histórico de versões da planilha | o código não desfaz gravações |

Antes de cada `clasp push` em produção: `clasp pull` numa pasta de conferência e `conferir_implantacao.js --procurar`. Se o editor tiver algo que não está no Git, **pare**: o push apagaria essa alteração.
