# Painel de Solicitações dos alunos — fonte v1.2

Esta pasta contém os **nove arquivos Apps Script da UI GRADIP v1.2** aceita em 25/09/2026, em `src/`. A fonte partiu do pacote final revisado. Oito arquivos são byte-idênticos ao ZIP aceito. Em `Codigo.gs`, a planilha de períodos é agora resolvida pela chave `PERIODOS` na planilha mestre `ID_INDEX`, cuja localização fica em `Script Properties`. A cópia do Git **não é byte-idêntica ao backend aceito nem foi implantada/testada no `/exec` real**. As regras de períodos, os sete destinos dos formulários e os fluxos da interface foram preservados.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/painel-solicitacoes/README.md), a [homologação e a diferença exata](../../docs/sistemas/painel-solicitacoes/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/painel-solicitacoes/DADOS_E_SEGURANCA.md).

## Arquivos

| Arquivo | Papel |
|---|---|
| `Codigo.gs` | Catálogo de sete formulários; quatro categorias; períodos simples/compostos; dados para o frontend e `doGet`. |
| `Painel.html` | Estrutura, layout, cards, busca, estados de disponibilidade e carregamento. |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle de aparência. |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas; USP branca incorporada, IPUSP vazado e nomes acessíveis. |
| `PainelAjuda.html`, `PainelAjudaEstilos.html`, `PainelAjudaUI.html` | Conteúdo, estilos e interação da Central de Ajuda/FAQ. |

## Configuração antes de usar esta cópia

No projeto Apps Script alvo, em **Configurações do projeto → Propriedades do script**, cadastre `ID_INDEX_SPREADSHEET_ID` com o ID da planilha mestre chamada `ID_INDEX`. O valor fica apenas na configuração do Apps Script; não o envie para esta documentação, código, issues ou logs. A identidade de execução do Web App precisa ter permissão para ler essa planilha e a planilha indicada por `PERIODOS`. Esta implementação usa `SpreadsheetApp` e não introduz `DriveApp`.

O backend lê a **primeira aba** de `ID_INDEX`: A = `Chave`, B = `Tipo`, C = `ID de Produção`. Exige exatamente uma linha com A = `PERIODOS` e B = `spreadsheet`; usa C para abrir a planilha de períodos. A coluna D (`Homologação`) nunca é usada. Se faltar a configuração, a chave, o tipo ou o ID de produção, a consulta falha antes da lógica original de tolerância a falhas, sem apresentar todos os cards como abertos por um erro no índice.

Para instalar os nove arquivos, coloque-os no **nível raiz** do projeto Apps Script (o `include_` usa nomes sem o prefixo `src/`), configure a propriedade, confirme o modelo `executeAs` e teste no ambiente de desenvolvimento. Depois crie uma **nova versão da implantação existente**, mantendo a URL `/exec`. Confira a leitura dos períodos, os sete destinos, busca, Ajuda, AccountChooser, loading, marcas e três modos de tema. Um commit no Git não atualiza o Apps Script. O código do repositório é uma proposta de integração ao índice, não uma nova implantação homologada.

## Decisão sobre URLs

Os sete links `/exec` de `SISTEMAS` são destinos exibidos aos alunos no próprio painel. Foram conservados como **URLs destinadas ao público do painel**; o ID da planilha, que é um recurso operacional interno, foi omitido. As permissões de cada formulário vinculado são responsabilidade de seu backend e precisam ser verificadas individualmente. A URL não constitui autorização.
