# Painel de Sistemas — servidores (fonte)

Esta pasta contém o código Apps Script do **Painel de Sistemas dos servidores** do Serviço de Graduação, em [`src/`](src). É a página de entrada da equipe: abre os sistemas internos, mostra os avisos de pedidos pendentes de cada um e reúne as **Configurações** de períodos dos formulários dos alunos e das **Regras Curriculares**.

A fonte foi recebida em 13/10/2026 (19 arquivos). Nesta versão foram acrescentados, só na camada de interface:

- tema **Sistema / Claro / Escuro** com os tokens GRADIP;
- navegação por **menu lateral** ou **abas**, com o painel sempre abrindo no menu lateral;
- card **Pessoas do IPUSP**, que abre a busca de alunos e vai reunir as futuras consultas de docentes e servidores;
- **Central de Ajuda** com guia, solução de problemas, FAQ e ajuda contextual (`?`) nas telas.

Na versão 1.1 (20/10/2026) entrou o controle de acesso: `AcessoPainel.gs` e uma linha de guarda no início de cada função pública dos `.gs`. Fora isso, os `.gs` não mudaram em comportamento. Três deles diferem da fonte recebida apenas porque os IDs reais das planilhas foram trocados por marcadores (`CONFIGURAR_ID_PLANILHA_*`). **No Apps Script, mantenha os `.gs` atuais, que já têm os IDs reais.** Veja [DADOS_E_SEGURANCA.md](../../docs/sistemas/painel-servidores/DADOS_E_SEGURANCA.md).

O GitHub não sincroniza com o Apps Script. Documentação: [visão geral](../../docs/sistemas/painel-servidores/README.md), [manual de operação e instalação](../../docs/sistemas/painel-servidores/MANUAL_OPERACAO.md), [Central de Ajuda](../../docs/sistemas/painel-servidores/AJUDA.md), [homologação](../../docs/sistemas/painel-servidores/HOMOLOGACAO.md).

## Arquivos

| Arquivo | Papel | Situação nesta versão |
|---|---|---|
| `Code.gs` | `doGet`, `include_`, contagem dos avisos de pendência | IDs trocados por marcadores; resto idêntico |
| `AcessoPainel.gs` | quem abre e quem altera o painel (aba `PAINEL_SERVIDORES`); `diagnosticarAcessoPainel` | novo (1.1) |
| `PainelSemAcesso.html` | página de quem não tem acesso | novo (1.1) |
| `UrlsSistemas.gs` | lê as URLs dos sistemas da Script Property `URLS_SISTEMAS_EQUIPE`; `diagnosticarUrlsSistemas` | novo (20/10/2026) |
| `ConfigFormulariosCore.gs` | Leitura e gravação dos períodos dos formulários | IDs trocados por marcadores; resto idêntico |
| `ConfigRegrasCurricularesRepository.gs` | Acesso à planilha das Regras Curriculares | IDs trocados por marcadores; resto idêntico |
| `ConfigCore.gs`, `ConfigFormularioColacaoGrau.gs`, `ConfigFormularioExclusaoDisciplinas.gs`, `ConfigRegrasCurriculares.gs`, `ConfigRegrasCurricularesAuditoria.gs`, `ConfigRegrasCurricularesMigracao.gs`, `ConfigRegrasCurricularesValidacao.gs`, `teste.gs` | Backend | byte-idênticos à fonte recebida |
| `appsscript.json` | Manifesto | idêntico (era `appscript.json` no pacote) |
| `ConfigRegrasCurricularesAjuda.html` | Manual e FAQ das Regras Curriculares | byte-idêntico |
| `Painel.html` | Página principal | alterado: tema, cabeçalho, navegação, card Pessoas do IPUSP, ajuda |
| `ConfigHomeUI.html` | Tela de Configurações | alterado: um gatilho `?` de ajuda (era `ConfirHomeUI.html` no pacote) |
| `ConfigFormulariosUI.html`, `ConfigRegrasCurricularesUI.html`, `ConfigRegrasCurricularesEstilos.html`, `ConfigRegrasCurricularesAjudaEstilos.html` | Telas de Configurações e estilos | alterados: cores trocadas por tokens; gatilhos `?` |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Tema e marcas | novos; cópias idênticas às da Busca de Alunos |
| `PainelAjudaEstilos.html`, `PainelAjudaUI.html` | Estilos e comportamento da Central de Ajuda | novos; idênticos a `shared/ajuda/` |
| `PainelAjuda.html` | Conteúdo da Central de Ajuda | novo |
| `PainelNavegacaoEstilos.html`, `PainelNavegacaoUI.html` | Menu lateral / abas | novos |
| `PainelIcones.html` | Ícones Lucide do menu ([licença](LICENCA_ICONES.txt)) | novo |

Os testes locais estão em [`testes/`](testes/README.md) e não vão para o Apps Script.

## Instalação resumida

1. Guarde uma cópia do projeto atual (**Arquivo → Fazer uma cópia**, ou baixe os arquivos).
2. Controle de acesso (1.1): preencha a aba `PAINEL_SERVIDORES` antes e siga o [passo 2b do manual](../../docs/sistemas/painel-servidores/MANUAL_OPERACAO.md#instalar-ou-atualizar). Fora as linhas de guarda, **não substitua os `.gs` que já existem**: os do projeto têm os IDs reais. Crie o script novo `UrlsSistemas` com o conteúdo de `src/UrlsSistemas.gs` e a propriedade `URLS_SISTEMAS_EQUIPE` com as URLs dos sistemas ([manual, passo 2a](../../docs/sistemas/painel-servidores/MANUAL_OPERACAO.md#instalar-ou-atualizar)). As URLs dos sistemas da equipe não ficam no Git.
3. Substitua o conteúdo de `Painel`, `ConfigHomeUI`, `ConfigFormulariosUI`, `ConfigRegrasCurricularesUI`, `ConfigRegrasCurricularesEstilos` e `ConfigRegrasCurricularesAjudaEstilos` pelos desta pasta.
4. Crie os arquivos HTML novos (**+ → HTML**), com estes nomes exatos e sem extensão: `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `PainelAjuda`, `PainelAjudaEstilos`, `PainelAjudaUI`, `PainelNavegacaoEstilos`, `PainelNavegacaoUI`, `PainelIcones`.
5. Teste pela URL `/dev` e depois publique uma **nova versão da implantação existente**, mantendo a URL `/exec`.

Passo a passo e o que conferir: [manual](../../docs/sistemas/painel-servidores/MANUAL_OPERACAO.md#instalar-ou-atualizar).
