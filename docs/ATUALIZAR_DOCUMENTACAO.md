# Roteiro de atualização da documentação

Toda mudança num sistema, por pessoa ou por agente de IA, termina com a documentação em dia. Este roteiro diz **o que atualizar e onde**, para que tudo fique no mesmo padrão. Ele complementa o [`CLAUDE.md`](../CLAUDE.md) (regras de código, visual, ajuda e segurança) e o [`CONTRIBUTING.md`](../CONTRIBUTING.md) (como enviar a mudança).

Regra geral: **uma informação mora num lugar só**, e os outros documentos apontam para ela. Se o mesmo dado precisar aparecer em dois lugares (por exemplo, o prazo de um formulário na tela e no `AJUDA.md`), confira os dois na homologação.

## 1. Que tipo de mudança é?

| Mudança | Vá para |
|---|---|
| Correção ou melhoria num sistema que já existe | seção 2 |
| Sistema novo (ou um sistema que está em uso e entra agora no repositório) | seções 2 e 3 |
| Chave nova no `ID_INDEX`, planilha nova, Script Property nova | seção 4 |
| Só texto da Central de Ajuda | seção 2, linhas `AJUDA.md` e `*Ajuda.html` |
| Padrão comum (tema, ajuda, segurança, `shared/`) | seção 5 |

## 2. Em todo sistema alterado

Os arquivos ficam em `docs/sistemas/<sistema>/` e `sistemas/<sistema>/` (formulários com gerenciador usam `sistemas/<sistema>/formulario/` e `.../gerenciador/`).

| Arquivo | Atualize quando | O que escrever |
|---|---|---|
| `sistemas/<sistema>/README.md` | sempre | Versão nova no topo, lista de arquivos (novo, alterado, idêntico) e o que copiar para o Apps Script. |
| `docs/sistemas/<sistema>/README.md` | sempre | Linha de versão com data, se já foi implantada ou não e o que mudou para quem usa. Tabela "Versões" no fim. |
| `MANUAL_OPERACAO.md` | mudou o uso, a instalação ou a configuração | Passo a passo de instalar e atualizar, problemas comuns e soluções. |
| `AJUDA.md` **e** o `*Ajuda.html` do sistema | a tela, um prazo, uma regra ou uma mensagem mudou | O mesmo conteúdo nos dois, no padrão de [`ajuda/HELP_CONTENT_MODEL.md`](ajuda/HELP_CONTENT_MODEL.md). Linguagem de quem usa, sem detalhe técnico. |
| `DADOS_E_SEGURANCA.md` | mudou o que é lido, gravado, mostrado ou enviado; quem acessa; uma configuração | Seguindo o [modelo](seguranca/SYSTEM_SECURITY_TEMPLATE.md). Nada de valor real; base legal sem fonte = `A VALIDAR INSTITUCIONALMENTE`. |
| `HOMOLOGACAO.md` | sempre que houver teste | O que foi testado, onde (local, `/dev`, `/exec` de homologação), com que resultado e o que falta. |
| `evidencias/<versão>/` | a tela mudou | Prints gerados pelos testes, só com dados fictícios, e um `README.md` com legenda. Link a partir do `HOMOLOGACAO.md`. |
| `sistemas/<sistema>/testes/README.md` | teste novo ou comando novo | Comando, o que confere e a contagem de resultados. Suíte nova também entra no `.github/workflows/ci.yml` ([CI](CI.md#manutenção)). |
| Documentos próprios (`ARQUITETURA.md`, `REGRAS.md`, `MODELO_DE_DADOS.md`, `VERSOES_E_DECISOES.md` etc.) | a mudança toca o assunto deles | Só nos sistemas que já têm esses arquivos. Não crie arquivo novo se um existente cobre o assunto. |

Versão: suba a versão no código (constante ou rodapé, quando existir) e use o mesmo número em todos os documentos acima. Escreva `notas-de-versao/<sistema>-v<versão>.md` e crie a tag, que gera a Release no GitHub ([versões](VERSOES.md)). Quando a versão for implantada, edite a Release com a data.

## 3. Sistema novo: além da seção 2

1. Crie `docs/sistemas/<sistema>/` com `README.md`, `MANUAL_OPERACAO.md`, `AJUDA.md`, `DADOS_E_SEGURANCA.md` e `HOMOLOGACAO.md`, e `sistemas/<sistema>/` com `README.md`, `src/` e `testes/`. Siga a [regra de origem e o preflight](sistemas/README.md).
2. Inclua o sistema em:
   - [`README.md`](../README.md) geral: tabela "Para os alunos" ou "Para a equipe";
   - [`docs/SISTEMAS.md`](SISTEMAS.md): catálogo com estado;
   - [`docs/sistemas/README.md`](sistemas/README.md): lista de sistemas documentados;
   - [`docs/ARQUITETURA_GERAL.md`](ARQUITETURA_GERAL.md): chaves que ele usa, seção "Como os sistemas conversam" e, se for o caso, "Ordem para montar". Tire-o de "Limites conhecidos" se estava lá.
3. Se for formulário dos alunos: inclua-o no [ambiente de homologação](sistemas/AMBIENTE_DE_HOMOLOGACAO.md) (Script Property `AMBIENTE`), no Painel de Solicitações (card e linha em `PERIODOS`) e na contagem do Painel dos servidores, com a documentação desses dois painéis.
4. Se for ferramenta da equipe: a URL `/exec` entra em `URLS_SISTEMAS_EQUIPE` do Painel dos servidores (nova chave em `UrlsSistemas.gs` e no manual), **nunca no código**.

## 4. Integrações: chaves, planilhas e propriedades

| Mudou | Atualize |
|---|---|
| Chave nova ou removida no `ID_INDEX` | Tabela "Mapa das chaves" em [`ARQUITETURA_GERAL.md`](ARQUITETURA_GERAL.md) e o `DADOS_E_SEGURANCA.md` de **cada** sistema que lê ou grava a planilha. |
| Colunas ou abas de uma planilha compartilhada | O documento indicado na coluna "Onde está o formato" do mapa e o `DADOS_E_SEGURANCA.md` dos outros sistemas que a usam. |
| Script Property nova | Tabela "Script Properties" em `ARQUITETURA_GERAL.md`, `DADOS_E_SEGURANCA.md` (seção Configuração) e o `MANUAL_OPERACAO.md` do sistema. |
| Planilha nova que precisa de cópia de teste | Tabela de planilhas em [`AMBIENTE_DE_HOMOLOGACAO.md`](sistemas/AMBIENTE_DE_HOMOLOGACAO.md). |

## 5. Termos e padrões comuns

- **Termo novo** (sigla, nome de setor, conceito acadêmico ou técnico) que alguém de outra unidade não conheceria: acrescente no [`GLOSSARIO.md`](GLOSSARIO.md) e use sempre o mesmo nome em telas e documentos.
- **Mudança num padrão comum** (`shared/`, tema, ajuda, segurança): atualize o documento do padrão em `docs/` e liste os sistemas que precisam receber a mudança. As cópias em `sistemas/*/src/` (por exemplo `GradipTema.html`) devem continuar idênticas a `shared/`, ou a diferença deve ser explicada no README do sistema e registrada em `proprios` de [`ferramentas/copias_shared.json`](../ferramentas/copias_shared.json); a CI confere (`node ferramentas/verificar_copias_shared.js`). Uma correção feita primeiro na cópia de um sistema (por exemplo, um ajuste de contraste) volta para `shared/` e para as outras cópias na mesma rodada.
- **Decisão que vale para todos** (por exemplo, como guardar URLs internas): registre no documento comum de `docs/` e, se agentes de IA precisarem segui-la, também no [`CLAUDE.md`](../CLAUDE.md).

## 6. Antes de enviar

- [ ] Os documentos das seções que se aplicam foram atualizados, com a mesma versão e data.
- [ ] Os links novos funcionam (caminhos relativos ao arquivo).
- [ ] Nenhum dado real, ID ou URL interna ([checklist do repositório público](seguranca/REPOSITORIO_PUBLICO.md#antes-de-cada-commit)); `node ferramentas/verificar_publicacao.js` sem achados.
- [ ] A implantação no Google está descrita como **pendente** até alguém confirmar que publicou. O Git não informa o que está em uso.
- [ ] A mensagem de commit ou o pull request diz o sistema, a versão, o que mudou e o que fazer no Apps Script.
