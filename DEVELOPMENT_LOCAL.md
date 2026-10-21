# Desenvolvimento local com clasp

Como editar os sistemas no seu computador e levar o código ao Google Apps Script com o [clasp](https://github.com/google/clasp), a ferramenta de linha de comando do Google. Vale para pessoas e para agentes de IA. As regras gerais continuam no [`CLAUDE.md`](CLAUDE.md).

## 1. Cada ferramenta tem um papel

| | Git e GitHub | clasp |
|---|---|---|
| Para que serve | histórico público do código e da documentação, revisão, CI, Releases | levar o código para o projeto Apps Script e trazer de volta |
| Conta | a sua conta do GitHub | a **conta institucional** que é dona do projeto Apps Script |
| O que guarda | código sanitizado (sem IDs reais, sem dados pessoais) | nada no Git: o ID do projeto e o login ficam só no seu computador |
| O que muda nos sistemas em uso | nada. Um push no `main` não altera nenhum sistema | `clasp push` muda o código no editor (o `/dev`); o `/exec` só muda com uma nova implantação |

As duas contas são independentes. Você pode usar o GitHub com uma conta pessoal e o clasp com a conta institucional. O clasp nunca precisa do GitHub, e o Git nunca precisa da conta do Google.

O caminho de uma mudança é sempre o mesmo: **editar num ramo → testar localmente → pull request (a CI confere) → merge pelo responsável → `clasp push` do `main` → conferir no `/dev` → implantação pelo responsável** ([fluxo de mudanças](docs/governanca/FLUXO_DE_MUDANCAS.md#6-do-main-ao-google)). Detalhes da publicação em [versões](docs/VERSOES.md).

## 2. Preparar o computador (uma vez)

1. **Node.js** 22 ou mais novo: baixe em [nodejs.org](https://nodejs.org) (versão LTS). Confira com `node --version`.
2. **clasp**:
   ```bash
   npm install -g @google/clasp
   clasp --version          # verificado com a 3.4.1
   ```
3. **API do Apps Script**: entre em [script.google.com/home/usersettings](https://script.google.com/home/usersettings) com a conta institucional e ligue **API do Google Apps Script**. Sem isso o `clasp push` recusa.
4. **Login**:
   ```bash
   clasp login
   ```
   O navegador abre: escolha a **conta institucional** dona dos projetos, não a pessoal. O token fica em `~/.clasprc.json` (na sua pasta de usuário, fora do repositório). Para conferir com qual conta está: `clasp show-authorized-user`. Para trocar: `clasp logout` e `clasp login` de novo.

## 3. Ligar uma pasta do repositório a um projeto Apps Script

O código de cada sistema fica em `sistemas/<sistema>/src/` (formulários com gerenciador: `sistemas/<sistema>/formulario/src/` e `.../gerenciador/src/`). É ali que o clasp trabalha.

1. Pegue o **ID do script** no editor do Apps Script: **Configurações do projeto → IDs → ID do script**. Ele não vai para o Git, nem em documentação.
2. Crie, dentro da pasta `src/` do sistema, o arquivo `.clasp.json`:
   ```json
   {
     "scriptId": "COLE_AQUI_O_ID_DO_SCRIPT",
     "rootDir": ".",
     "scriptExtensions": [".gs", ".js"]
   }
   ```
   - `rootDir: "."`: o `.clasp.json` e o `.claspignore` ficam na mesma pasta do código.
   - `scriptExtensions` começando por `.gs`: o `clasp pull` grava os arquivos como `.gs`, igual ao repositório. Com o padrão do clasp (`.js` primeiro), o pull criaria `Code.js` ao lado de `Code.gs`.
3. O `.gitignore` da raiz já ignora `.clasp.json`. Confira com `git status`: o arquivo **não** pode aparecer.
4. Confira o que seria enviado, sem enviar nada:
   ```bash
   cd sistemas/<sistema>/src
   clasp status
   ```
   Só devem aparecer `.gs`, `.html` e `appsscript.json` (se houver). `README.md`, testes, `node_modules`, `.clasp.json` e qualquer arquivo oculto ficam na lista de ignorados.

## 4. O dia a dia

| Quero | Comando (dentro da pasta `src/`) | Observação |
|---|---|---|
| Ver o que vai ser enviado | `clasp status` | não muda nada |
| Enviar o código ao editor | `clasp push` | substitui **todos** os arquivos do projeto pelos da pasta. Confira o `clasp status` antes |
| Enviar e trocar também o manifesto | `clasp push --force` | sem `--force` o clasp pergunta antes de mudar o `appsscript.json` |
| Trazer o que alguém mudou no editor | `clasp pull` | sobrescreve os arquivos locais. Faça com o `git status` limpo e confira o `git diff` antes de commitar (pode trazer IDs reais) |
| Abrir o editor | `clasp open-script` | |
| Ver as implantações | `clasp deployments` | só leitura |
| Conferir se o editor tem o mesmo código de um commit | `clasp pull` numa pasta **fora** do repositório e `node ferramentas/conferir_implantacao.js <pasta> sistemas/<sistema>/src --procurar` | só leitura; ver [implantação](docs/IMPLANTACAO.md#4-conferir-o-código-do-editor) |

**Implantar (`clasp deploy`, `clasp redeploy`, `clasp undeploy`) muda o `/exec` que as pessoas usam.** Só o responsável pelo sistema faz isso, depois da homologação no `/dev`, e um agente de IA nunca implanta sem a ordem explícita dele. O mais seguro é implantar pelo editor (**Implantar → Gerenciar implantações → editar → Nova versão**), que mantém a mesma URL.

O que o clasp não faz: não roda funções (`prepararAuditoria…`, diagnósticos), não cria gatilhos, não muda Script Properties e não autoriza escopos novos. Isso continua no editor do Apps Script, como diz o `MANUAL_OPERACAO.md` de cada sistema.

## 5. O `.claspignore`: só código vai ao Google

Cada pasta `src/` tem um `.claspignore` (versionado, igual em todas) que funciona como lista de permitidos: ignora tudo e libera só `.gs`, `.js`, `.html` e `appsscript.json`. Nunca vão ao Google: Markdown, testes, `node_modules`, arquivos do Git e arquivos ocultos (inclusive `.clasp.json` e `.env`).

Sistema novo: copie o `.claspignore` de outro sistema para a pasta `src/` dele. A verificação automática (`node ferramentas/verificar_publicacao.js`, também na CI) acusa pasta `src/` sem `.claspignore`.

## 6. Segurança: o Git não é cofre

O repositório é **público, inclusive o histórico**. Apagar um dado num commit novo não o tira do histórico, de cópias nem de caches ([repositório público](docs/seguranca/REPOSITORIO_PUBLICO.md) e [incidentes](docs/seguranca/INCIDENTES.md)).

- **Nunca vão para o Git**: o `.clasp.json` (ID do script), o `.clasprc.json` e o `creds.json` (token de login, que dá acesso aos projetos da conta), chaves privadas, client secrets, service accounts, senhas e tokens. O `.gitignore` da raiz bloqueia esses nomes; a verificação automática acusa se algum deles for versionado mesmo assim.
- **IDs de planilha, pasta ou formulário de produção não ficam no código.** O código lê a chave lógica no `ID_INDEX` (pela Script Property `ID_INDEX_SPREADSHEET_ID`) ou numa Script Property (**Configurações do projeto → Propriedades do script**). Na documentação, escreva a chave (`AUDITORIA_PAINEL_SERVIDORES`), nunca o valor. Mapa das chaves: [arquitetura geral](docs/ARQUITETURA_GERAL.md). A verificação automática acusa ID escrito direto no código (`openById("…")`, constante com `ID` no nome).
- **URLs `/exec` de ferramentas da equipe** ficam na Script Property `URLS_SISTEMAS_EQUIPE`, não no código.
- **Script Properties tiram os valores do Git, mas não são cofre**: qualquer editor do projeto Apps Script as lê. Não guarde ali senha de terceiros.
- **O `.gitignore` evita o acidente, não substitui a atenção.** Antes de cada commit: `git status` (o que entra), `git diff --staged` (o conteúdo) e `node ferramentas/verificar_publicacao.js`. Um `git add -f` passa por cima do `.gitignore`.
- Dados de teste só fictícios (`@exemplo.usp.br`, `9000001`). Regras completas em [`docs/seguranca/`](docs/seguranca/README.md).

## 7. Princípios de arquitetura para os próximos aplicativos

Valem para todo sistema novo e para cada mudança, e estão também no [`CLAUDE.md`](CLAUDE.md):

- **HTML, CSS e JavaScript nativos.** Sem React, Vue, Angular, jQuery, bundler ou etapa de build: o que está em `src/` é exatamente o que o clasp envia. Bibliotecas externas só com motivo forte e registro no README do sistema.
- **Interface separada da regra de negócio.** Regra, validação, autorização e acesso a planilhas ficam nos `.gs`; telas, estilos e comportamento de página ficam nos `.html` (incluídos com `include_`). A página chama o servidor só por `google.script.run`, e o servidor confere tudo de novo. Uma mudança só visual deixa os `.gs` byte-idênticos.
- **Padrões comuns por cópia de `shared/`** (tema GRADIP, Central de Ajuda), conferidos por `node ferramentas/verificar_copias_shared.js`.
- **Configuração fora do código** (seção 6) e **auditoria** pelo [modelo](docs/auditoria/MODELO.md) quando o sistema grava dados.
- **Testes locais** em `sistemas/<sistema>/testes/`, com o Apps Script simulado e dados sintéticos, incluídos na CI ([`docs/CI.md`](docs/CI.md)).

## 8. Painel dos servidores: IDs saíram do código na 1.4

Até a versão 1.3, o projeto real do Painel dos servidores tinha os IDs das planilhas escritos no código, e o Git tinha marcadores `CONFIGURAR_ID_PLANILHA_…` no lugar deles; por isso ele era enviado de um clone separado, com os IDs recolocados à mão. Desde a 1.4 o painel acha todas as planilhas pelo `ID_INDEX`, e a pasta `sistemas/painel-servidores/src/` vai ao Google como está. O clone antigo deixa de ser necessário depois do primeiro envio da 1.4; não copie arquivos dele de volta para o repositório.

## 9. Manifesto, ambientes e volta atrás

Só o Painel dos servidores tem o `appsscript.json` no repositório. Antes do primeiro `clasp push` de qualquer outro sistema, versione o manifesto dele, e antes de cada push confira se o editor tem algo que não está no Git: [implantação](docs/IMPLANTACAO.md) (inventário, modelo homologação → produção, registro de cada implantação e como voltar atrás).

## 10. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `User has not enabled the Apps Script API` | Ligue a API (seção 2, passo 3) e espere alguns minutos. |
| `Request had insufficient authentication scopes` ou projeto não encontrado | Login com a conta errada. `clasp show-authorized-user`; se for a pessoal, `clasp logout` e `clasp login`. |
| `clasp status` lista `README.md` ou testes | Falta o `.claspignore` na pasta, ou o `.clasp.json` está noutra pasta com outro `rootDir`. |
| Depois do `clasp pull` apareceram `Code.js` e `Code.gs` | Falta `"scriptExtensions": [".gs", ".js"]` no `.clasp.json`. Apague os `.js` duplicados e puxe de novo. |
| `.clasp.json` aparece no `git status` | Ele está fora do padrão ignorado ou foi adicionado com `-f`. `git rm --cached <arquivo>` antes do commit. Se já foi enviado, siga [incidentes](docs/seguranca/INCIDENTES.md). |
| O `/exec` não mudou depois do push | Esperado: o push muda só o `/dev`. O `/exec` muda com a nova versão da implantação. |
