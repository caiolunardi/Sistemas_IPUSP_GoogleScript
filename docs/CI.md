# Verificação automática (CI)

A cada push no `main` e em cada pull request, o GitHub Actions roda a verificação descrita em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). O resultado aparece na aba **Actions** do repositório e como um ✓ ou ✗ ao lado de cada commit. Também dá para rodar à mão em **Actions → CI → Run workflow**.

A CI não acessa o Google, planilhas reais nem a internet (fora a instalação das ferramentas). Ela confere o código do repositório, e não o que está implantado: um ✓ não substitui a homologação no `/exec`.

## O que roda

| Etapa | O que confere | Arquivos |
|---|---|---|
| **Dados sensíveis** | Credenciais, IDs de implantação e do Drive fora da lista pública, e-mails fora da lista, planilhas e documentos versionados, imagens fora de `evidencias/` e `assets/`. | [`ferramentas/verificar_publicacao.js`](../ferramentas/verificar_publicacao.js) e [`ferramentas/publicos.json`](../ferramentas/publicos.json) |
| **Cópias de `shared/`** | As cópias do tema (`GradipTema`, `GradipTemaControle`) e da Central de Ajuda (`*AjudaEstilos`, `*AjudaUI`) em `sistemas/*/src/` são idênticas à origem em `shared/`, ou estão registradas como implementação própria, com o motivo. | [`ferramentas/verificar_copias_shared.js`](../ferramentas/verificar_copias_shared.js) e [`ferramentas/copias_shared.json`](../ferramentas/copias_shared.json) |
| **Servidor** | Suítes de backend com o Apps Script simulado: Comunidade IPUSP, Grade Horária visual, os três formulários, o gerenciador de Trancamento Total e a contagem de créditos. | `sistemas/*/testes/testar_backend.js`, `testar_contagem.js` |
| **Tela** | Suítes de navegador em Chromium (tema, contraste, teclado, ajuda, larguras de 360 a 1440 px) dos mesmos sistemas e dos dois painéis. | `sistemas/*/testes/testar_navegador.js` |
| **Estrutura Curricular** | As suítes que usam só dados sintéticos, incluindo as da planilha das secretarias (`Validacoes.gs` e `Protecao.gs`). As que pedem exportações do Júpiter continuam manuais (ver o [README dos testes](../sistemas/estrutura-curricular/testes/README.md)). | `sistemas/estrutura-curricular/testes/` |

Cada suíte roda em paralelo e uma falha não interrompe as outras, para o relatório mostrar tudo de uma vez. A mais lenta (Painel dos servidores) leva cerca de 5 minutos.

## Quando der ✗

1. Abra **Actions**, clique no commit e na etapa com ✗. O log mostra a linha `FALHA` de cada verificação.
2. **Dados sensíveis:** o log mostra o arquivo, a linha e só o começo do valor, para não republicá-lo. Remova o dado do arquivo. Se ele já foi enviado, apagar num commit novo não basta: siga [INCIDENTES.md](seguranca/INCIDENTES.md) e [Repositório público](seguranca/REPOSITORIO_PUBLICO.md). Se o valor for **deliberadamente público** (por exemplo, o link de um formulário novo dos alunos), inclua-o em `ferramentas/publicos.json` e explique o motivo no commit.
3. **Cópias de `shared/`:** se você mudou `shared/`, copie o arquivo para os sistemas listados no log (e registre a mudança no README de cada um, que vai precisar de nova implantação). Se mudou só a cópia de um sistema de propósito, registre o arquivo e o motivo em `proprios` de `copias_shared.json`.
4. **Testes:** rode a mesma suíte no computador (`cd` na pasta `testes` e `node <arquivo>`), corrija e envie de novo.

Como o fluxo do mantenedor é commitar direto no `main`, a CI avisa **depois** do push. Não implante no Apps Script uma versão com ✗.

## Rodar no computador antes do push

```bash
node ferramentas/verificar_publicacao.js
node ferramentas/verificar_copias_shared.js
cd sistemas/<sistema>/testes && node testar_backend.js && node testar_navegador.js
```

Para os testes de tela: `npm install -g playwright@1.56.0` e `playwright install chromium`.

## Manutenção

- **Suíte nova:** acrescente o caminho na lista (`matrix.suite`) da etapa certa em `ci.yml`, e registre no `testes/README.md` do sistema. Siga o [roteiro de atualização](ATUALIZAR_DOCUMENTACAO.md).
- **Formulário novo dos alunos com link `/exec` no código:** o ID da implantação vai em `implantacoes_publicas` de `publicos.json`. Ferramentas da equipe nunca entram ali (elas usam `URLS_SISTEMAS_EQUIPE`).
- **Playwright:** a versão está em `PLAYWRIGHT_VERSAO` no `ci.yml` e no `package.json` da Estrutura Curricular. Mude as duas juntas.
- **Custo:** em repositório público, o GitHub Actions é gratuito. Em privado, cada rodada consome cerca de 50 minutos da cota mensal da conta.

Limite da varredura: ela não reconhece nomes de pessoas nem números USP (que se confundem com códigos de disciplina) e não lê o conteúdo de imagens. Para isso continuam valendo o [checklist](seguranca/REPOSITORIO_PUBLICO.md#antes-de-cada-commit) e a revisão de cada print.
