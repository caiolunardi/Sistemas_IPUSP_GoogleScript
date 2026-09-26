# Painel de Solicitações dos alunos — fonte v1.2

Esta pasta contém os **nove arquivos Apps Script da UI GRADIP v1.2** aceita em 25/09/2026, em `src/`. A fonte foi copiada do pacote final revisado. Oito arquivos são byte-idênticos ao ZIP aceito; em `Codigo.gs`, somente a configuração da planilha de períodos foi substituída por `Script Properties` e uma guarda para configuração ausente. A cópia do Git, portanto, **não é byte-idêntica ao backend em produção**. O código de renderização, as regras de períodos, os sete destinos dos formulários e os fluxos da interface não foram alterados.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/painel-solicitacoes/README.md), a [homologação e a diferença exata](../../docs/sistemas/painel-solicitacoes/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/painel-solicitacoes/DADOS_E_SEGURANCA.md).

## Arquivos

| Arquivo | Papel |
|---|---|
| `Codigo.gs` | Catálogo de sete formulários; quatro categorias; períodos simples/compostos; dados para o frontend e `doGet`. |
| `Painel.html` | Estrutura, layout, cards, busca, estados de disponibilidade e carregamento. |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle de aparência. |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas; USP branca incorporada, IPUSP vazado e nomes acessíveis. |
| `PainelAjuda.html`, `PainelAjudaEstilos.html`, `PainelAjudaUI.html` | Conteúdo, estilos e interação da Central de Ajuda/FAQ. |

## Configuração necessária antes de usar esta cópia

No **mesmo projeto Apps Script** em que for instalar esta fonte, abra **Configurações do projeto → Propriedades do script** e cadastre a propriedade `PERIODOS_SPREADSHEET_ID` com o ID da planilha de períodos autorizado para aquele ambiente. Use o valor no ambiente Apps Script; não o inclua em commit, arquivo de exemplo preenchido, issue, screenshot ou log. O valor não é fornecido neste repositório.

`Codigo.gs` lê essa propriedade na inicialização. **Se ela estiver ausente, o script falha antes de exibir o painel.** Esta guarda evita que o mecanismo de tolerância a falhas do pacote original indique todos os formulários como abertos por uma simples falta de configuração. Com a propriedade válida, a lógica de disponibilidade é a mesma do pacote aceito. A planilha deve conservar a estrutura esperada na primeira aba e as permissões necessárias para a identidade de execução do Web App.

Para atualizar uma implantação existente, crie os nove arquivos com os nomes acima no **nível raiz** do projeto Apps Script (o `include_` usa os nomes sem o prefixo `src/`), configure a propriedade, teste no ambiente de desenvolvimento e crie uma **nova versão na implantação existente**. Confirme no `/exec` a leitura dos períodos, os sete destinos, busca, Ajuda, AccountChooser, loading, as duas marcas e os três modos de tema antes de trocar a versão em uso. Copiar o Git não publica o Web App.

## Decisão sobre URLs

Os sete links `/exec` de `SISTEMAS` são destinos exibidos aos alunos no próprio painel. Foram conservados como **URLs destinadas ao público do painel**; o ID da planilha, que é um recurso operacional interno, foi omitido. As permissões de cada formulário vinculado são responsabilidade de seu backend e precisam ser verificadas individualmente. A URL não constitui autorização.
