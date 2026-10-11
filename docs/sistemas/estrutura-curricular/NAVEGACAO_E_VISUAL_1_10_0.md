# Navegação e pacote visual — 1.10.0

## Resultado e referência

Abre em **Menu lateral** a cada carga. **Abas / Menu lateral** alternam os mesmos tablists, conservando estado e rascunhos. Layout não persiste nem chama servidor; esquema não muda.

Referência: menu/abas e refinamento 0.4.2 do [Lunaris_APPSCRIPT](https://github.com/caiolunardi/Lunaris_APPSCRIPT), `docs/REFINO_NAVEGACAO_0_4_2.md` e `appsscript/Index.html`. Usa tokens/tema da Estrutura Curricular, sem copiar regras de Licita/Lunaris. O pedido autorizou ícones padronizados, brilho e elevação, mantendo lógica de Claude.

## Arquivos

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `Painel.html` | composição | quatro includes novos, wrappers e ID das consultas |
| `Codigo.gs` | versão | somente `1.9.3` → `1.10.0` |
| `EstruturaNavegacao.html` | controle de modo | botões com `aria-pressed` |
| `EstruturaNavegacaoEstilos.html` | layouts/hover/foco/responsivo | CSS isolado depois dos estilos existentes |
| `EstruturaIcones.html` | catálogo inerte | Lucide Static 1.55.0 e licença |
| `EstruturaNavegacaoUI.html` | posição/visibilidade/teclado | último include, depois dos controladores |

`PainelApp`, Preparação, Importação, Auditoria, leitores, tema, ajuda e demais `.gs` permanecem byte a byte iguais à baseline. Não há segundo conjunto de formulários ou listeners de negócio.

## Visibilidade e preservação

| Tablist | Sidebar | Condição |
|---|---|---|
| `visoes` | Seções do sistema | visibilidade original definida pela carga |
| `etapas` | Preparação da grade | original visível + `visaoEstrutura`; leitores/base vazia sem etapas |
| `abasEstrutura` | Consultas da estrutura | `visaoEstrutura`, `areaDados`, `etapaPainel-1` visíveis |
| `previaAbas` | permanece junto da prévia | condição original da etapa 4; ícones nos botões recriados |

Cada tablist tem marcador na posição original. Sidebar move o nó para slot; abas devolve ao marcador. Observer de `hidden` preserva condições dos ancestrais originais. Não toca filtros ou respostas assíncronas. Os botões conservam identidade, IDs, seleção, foco e eventos existentes.

## Catálogo

SVGs decorativos de catálogo, `aria-hidden=true`, `focusable=false`, `currentColor`, sem fonte/CDN/runtime de ícones. Rótulos, contagens e números permanecem.

| Opção | Ícone Lucide |
|---|---|
| Menu lateral / Abas | `panel-left` / `panels-top-left` |
| Estrutura / Auditoria | `graduation-cap` / `clipboard-check` |
| Etapas 1 / 2 | `library-big` / `users-round` |
| Etapas 3 / 4 | `list-checks` / `calendar-days` |
| Disciplinas / Currículos / Importações | `book-open` / `network` / `history` |
| Abas da prévia | `table-2` |

**Lucide Static 1.55.0**. Licença ISC e aviso MIT para derivados Feather no comentário do arquivo e em [`LICENCA_ICONES.txt`](../../../sistemas/estrutura-curricular/LICENCA_ICONES.txt). Nenhum símbolo novo foi desenhado.

## Tema, efeito e transição

Tema GRADIP preservado, inclusive correção local de `--gradip-border-strong`. `shared/` não é atualizado. Marcas IPUSP/USP conservam arquivos, proporções e variantes, sem filtros/inversão.

Pointer fino com hover: elevação **3 px**, transição **180 ms**, brilho azul discreto; pressionado fica em 1 px. Escuro usa sombra escura/brilho azul claro. Foco tem contorno independente de 3 px. Troca de modo anima entrada leve do conteúdo em 180 ms sem desmontá-lo.

`prefers-reduced-motion:reduce` desativa elevação/transições/animação. Toque não recebe hover elevado. Impressão oculta navegação e usa uma coluna.

**Exceção explícita ao padrão central:** brilho/elevação foram solicitados pelo responsável funcional e limitados à navegação. Não são regra global para cartões, tabelas, modais ou status. A seleção permanece legível sem sombra/movimento.

## Responsividade e teclado

Acima de 900 px: menu lateral sticky com scroll próprio quando necessário. Até 900 px: menu no fluxo acima do conteúdo, recolhimento explícito. Voltar ao desktop reabre o menu; não há overlay/novo modal.

Nas abas, etapas usam quatro/duas/uma colunas conforme largura; consultas têm scroll local se necessário. `min-width:0` evita expansão da página por tabelas. O CSS antigo continua transformando tabelas em cartões móveis.

Tablists na sidebar têm `aria-orientation=vertical`; ↑/↓ encaminham à rotina existente de ←/→. Home/End permanecem do controlador. Abas restauram orientação original. Foco é preservado ao mover nós; status acessível anuncia modo.

## Verificação/extensão

Ver [VERIFICACAO_1_10_0.md](VERIFICACAO_1_10_0.md) e [`testar_navegacao_visual.js`](../../../sistemas/estrutura-curricular/testes/testar_navegacao_visual.js). Fórmulas reais, Workspace, Drive, acionadores e `/exec` precisam de homologação Google.

Nova opção exige ID único, rótulo, `aria-controls`, rotina de seleção e condições de visibilidade. Revise `configs` e catálogo. Não acrescentar persistência do modo sem nova decisão: a abertura requerida é sidebar.
