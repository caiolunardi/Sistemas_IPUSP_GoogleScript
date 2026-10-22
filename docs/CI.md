# Verificação automática (CI)

A cada push no `main` e em cada pull request, o GitHub Actions roda a verificação descrita em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). O resultado aparece na aba **Actions** do repositório e como um ✓ ou ✗ ao lado de cada commit. Também dá para rodar à mão em **Actions → CI → Run workflow**.

A CI não acessa o Google, planilhas reais nem a internet (fora a instalação das ferramentas). Ela confere o código do repositório, e não o que está implantado: um ✓ não substitui a homologação no `/exec`.

## O que roda

| Etapa | O que confere | Arquivos |
|---|---|---|
| **Dados sensíveis** | Credenciais, IDs de implantação e do Drive fora da lista pública, ID escrito no código (`openById("…")`, constante `*ID*`), `scriptId`, arquivos locais do clasp (`.clasp.json`, `.clasprc.json`, `creds.json`), pasta `src/` sem `.claspignore`, e-mails fora da lista, planilhas e documentos versionados (exceto os CSVs de `docs/sistemas/<sistema>/dados-ficticios/`, varridos como texto e só com e-mails de domínio fictício), imagens fora de `evidencias/` e `assets/`. | [`ferramentas/verificar_publicacao.js`](../ferramentas/verificar_publicacao.js) e [`ferramentas/publicos.json`](../ferramentas/publicos.json) |
| **Cópias de `shared/`** | As cópias do tema (`GradipTema`, `GradipTemaControle`) e da Central de Ajuda (`*AjudaEstilos`, `*AjudaUI`) em `sistemas/*/src/` são idênticas à origem em `shared/`, ou estão registradas como implementação própria, com o motivo. | [`ferramentas/verificar_copias_shared.js`](../ferramentas/verificar_copias_shared.js) e [`ferramentas/copias_shared.json`](../ferramentas/copias_shared.json) |
| **Servidor** | Suítes de backend com o Apps Script simulado: Comunidade IPUSP, Grade Horária visual, os três formulários, o gerenciador de Trancamento Total e a contagem de créditos. Também os testes das ferramentas do repositório, por exemplo as conferências do workflow Release (com repositórios git temporários e um GitHub falso). | `sistemas/*/testes/testar_backend.js`, `testar_contagem.js`, `ferramentas/testes/*.js` |
| **Tela** | Suítes de navegador em Chromium (tema, contraste, teclado, ajuda, larguras de 360 a 1440 px) dos mesmos sistemas e dos dois painéis. | `sistemas/*/testes/testar_navegador.js` |
| **Estrutura Curricular** | As suítes que usam só dados sintéticos, incluindo as da planilha das secretarias (`Validacoes.gs` e `Protecao.gs`). Inclui a leitura de PDFs sintéticos no Chromium com o PDF.js e o worker reais (`testar_pdf_sintetico.js`: equivalência com o 3.11.174, integridade da biblioteca e do worker, scripts de documento não executados, controles negativos), o OCR de PDF sintético só com imagem (`testar_pdf_ocr_sintetico.js`) e o PDF misto sintético lido pelo OCR e interpretado pelo `LeitorPdfJupiter` no 3.11.174 e no 6.4.299 (`testar_pdf_misto_sintetico.js`). O modelo do OCR (`por.traineddata` do `tessdata_fast` 4.1.0) é baixado do repositório público do Tesseract e só é usado se o SHA-256 conferir. A fonte das páginas escaneadas do PDF misto (Liberation Serif 2.1.5, do pacote `fonts-liberation` 1:2.1.5-3 do arquivo do Ubuntu) segue a mesma regra: pacote e fonte conferidos pelo SHA-256. As que pedem exportações do Júpiter continuam manuais (ver o [README dos testes](../sistemas/estrutura-curricular/testes/README.md)). | `sistemas/estrutura-curricular/testes/` |

Cada suíte roda em paralelo e uma falha não interrompe as outras, para o relatório mostrar tudo de uma vez. A mais lenta (Painel dos servidores) leva cerca de 5 minutos.

No fim, a etapa **CI concluída** fica verde só se todas as outras passaram (uma etapa cancelada ou pulada conta como falha). É essa a verificação que o ruleset do `main` exige ([proteção do `main`](governanca/PROTECAO_DO_MAIN.md)), para que uma suíte nova entre na exigência sem mexer no ruleset.

### Todo commit do `main` tem veredito

Num pull request, um push novo cancela a rodada anterior (só o último commit importa). No `main`, nenhuma rodada é cancelada: cada commit integrado termina com ✓ ou ✗, e o workflow **Release** só aceita commit com ✓ ([versões](VERSOES.md)). Até 20/10/2026 o cancelamento valia também no `main`, e 8 commits ficaram sem veredito ([diagnóstico](governanca/DIAGNOSTICO_2026-10-20.md), achado C2).

## Quando der ✗

1. Abra **Actions**, clique no commit e na etapa com ✗. O log mostra a linha `FALHA` de cada verificação.
2. **Dados sensíveis:** o log mostra o arquivo, a linha e só o começo do valor, para não republicá-lo. Remova o dado do arquivo. Se ele já foi enviado, apagar num commit novo não basta: siga [INCIDENTES.md](seguranca/INCIDENTES.md) e [Repositório público](seguranca/REPOSITORIO_PUBLICO.md). Se o valor for **deliberadamente público** (por exemplo, o link de um formulário novo dos alunos), inclua-o em `ferramentas/publicos.json` e explique o motivo no commit.
3. **Cópias de `shared/`:** se você mudou `shared/`, copie o arquivo para os sistemas listados no log (e registre a mudança no README de cada um, que vai precisar de nova implantação). Se mudou só a cópia de um sistema de propósito, registre o arquivo e o motivo em `proprios` de `copias_shared.json`.
4. **Testes:** rode a mesma suíte no computador (`cd` na pasta `testes` e `node <arquivo>`), corrija e envie de novo.

Toda mudança entra no `main` por pull request ([fluxo de mudanças](governanca/FLUXO_DE_MUDANCAS.md)), e um PR com ✗ não recebe merge. Desde 21/10/2026, o GitHub impõe isso: o ruleset do `main` exige `CI concluída` verde, vinda do GitHub Actions, com o ramo atualizado ([proteção do `main`](governanca/PROTECAO_DO_MAIN.md#1-situação-em-21102026)). Não implante no Apps Script uma versão com ✗.

## Rodar no computador antes do push

```bash
node ferramentas/verificar_publicacao.js
node ferramentas/verificar_copias_shared.js
cd sistemas/<sistema>/testes && node testar_backend.js && node testar_navegador.js
```

Para os testes de tela: `npm install -g playwright@1.56.0` e `playwright install chromium`.

## Segurança dos workflows

- **Permissões mínimas:** a CI só lê o repositório (`contents: read`) e não guarda o token no clone (`persist-credentials: false`). O Release pede `contents: write` (criar a Release, que cria a tag junto), `actions: read` e `pull-requests: read`, só no seu job, e também não guarda o token no clone: nada é enviado pelo git. Ele só roda pelo **Run workflow** a partir do `main` (sem gatilho por push de tag) e só publica se a rodada tiver aprovação humana registrada no environment `release` ([versões](VERSOES.md), seção 6).
- **Actions fixadas por SHA:** `uses:` aponta para o commit da Action, com a versão em comentário (`# v4`). Uma tag como `v4` pode ser movida por quem mantém a Action; o SHA não. Só Actions publicadas pelo próprio GitHub (`actions/*`).
- **Sem segredos:** nenhum workflow usa segredo do repositório. Os testes não acessam o Google. A CI roda em `pull_request` (nunca `pull_request_target`), então o PR de um fork roda sem acesso de escrita e sem segredos. Nunca acrescente credencial do Google, do clasp ou de serviço de IA à CI.
- **Dependabot** (`.github/dependabot.yml`): toda segunda-feira propõe, por PR, a atualização das Actions e das dependências de teste da Estrutura Curricular. O PR passa pela CI e pelo merge humano como qualquer outro. O Playwright fica de fora porque muda junto com `PLAYWRIGHT_VERSAO` (abaixo). Os alertas e as atualizações de segurança do Dependabot estão ligados desde 21/10/2026 ([proteção](governanca/PROTECAO_DO_MAIN.md#1-situação-em-21102026)). Nenhum PR do Dependabot entra sozinho: o auto-merge está desligado.
- **Instalação das suítes de tela:** `npm install -g playwright@<versão fixa>`, sem lockfile das dependências transitivas. A Estrutura Curricular usa `npm ci` com `package-lock.json`. Aceitável por enquanto (só testes, nada vai ao Google); se um dia der diferença entre rodadas, passar as suítes de tela para um `package.json` com lockfile.

## Manutenção

- **Suíte nova:** acrescente o caminho na lista (`matrix.suite`) da etapa certa em `ci.yml`, e registre no `testes/README.md` do sistema. Job novo: inclua-o em `needs` da etapa **CI concluída**. Siga o [roteiro de atualização](ATUALIZAR_DOCUMENTACAO.md).
- **Formulário novo dos alunos com link `/exec` no código:** o ID da implantação vai em `implantacoes_publicas` de `publicos.json`. Ferramentas da equipe nunca entram ali (elas usam `URLS_SISTEMAS_EQUIPE`).
- **PDF.js dos testes da Estrutura Curricular (desde a Etapa 4, 1.12.1, 22/10/2026):** o `pdfjs-dist` do `package.json` é o espelho do PDF.js que o `LeitorPdfFontes.html` baixa do jsDelivr (6.4.299, build `legacy`); mude os dois juntos, com os SHA-384 do leitor, e regrave a referência só se a mudança for intencional (`prototipo-pdfjs`). O 6.x não depende de `canvas` nem de `tar`, por isso o override de `@mapbox/node-pre-gyp` da Etapa 2 saiu. O opcional `@napi-rs/canvas` (binário pronto, sem script de instalação, cerca de 36 MB) é instalado pelo `npm ci`, mas não é usado: o PDF.js roda no Chromium. O `pdfjs-dist` 6.x exige Node 22.13 ou mais novo.
- **Playwright:** a versão está em `PLAYWRIGHT_VERSAO` no `ci.yml` e no `package.json` da Estrutura Curricular. Mude as duas juntas.
- **Custo:** em repositório público, o GitHub Actions é gratuito. Em privado, cada rodada consome cerca de 50 minutos da cota mensal da conta.

Limite da varredura: ela não reconhece nomes de pessoas nem números USP (que se confundem com códigos de disciplina) e não lê o conteúdo de imagens. Para isso continuam valendo o [checklist](seguranca/REPOSITORIO_PUBLICO.md#antes-de-cada-commit) e a revisão de cada print.
