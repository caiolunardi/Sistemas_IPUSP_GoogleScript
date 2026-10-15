# Painel de Solicitações dos alunos — fonte v1.4

**v1.4 (15/10/2026, ainda não implantada):** link da **Grade horária** visual, como card de consulta em "Matrícula e disciplinas" e atalho no rodapé do menu lateral, ambos em nova aba. Para instalar junto com a v1.3, substitua também `PainelNavegacaoEstilos.html` e `PainelIcones.html` (na lista da v1.3 eles já são arquivos novos). Para trocar o link da grade, edite o item `grade-horaria` de `FERRAMENTAS_PAINEL` em `Codigo.gs`.

**v1.3 (14/10/2026, ainda não implantada nem homologada no `/exec`):** o painel abre com **menu lateral** de categorias (com opção de abas, no mesmo padrão do Painel dos servidores), a busca procura em todas as categorias e "Formação e conclusão" ganhou a **Contagem de créditos**, que lê as Regras Curriculares de cada currículo. Ver [contagem de créditos](../../docs/sistemas/painel-solicitacoes/CONTAGEM_DE_CREDITOS.md) e [testes locais](testes/README.md).

O texto abaixo descreve a origem da fonte: os **nove arquivos Apps Script da UI GRADIP v1.2** aceita em 25/09/2026, em `src/`. A fonte partiu do pacote final revisado. Oito arquivos são byte-idênticos ao ZIP aceito. Em `Codigo.gs`, a planilha de períodos é agora resolvida pela chave `PERIODOS` na planilha mestre `ID_INDEX`, cuja localização fica em `Script Properties`. A cópia do Git **não é byte-idêntica ao backend aceito nem foi implantada/testada no `/exec` real**. As regras de períodos, os sete destinos dos formulários e os fluxos da interface foram preservados.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/painel-solicitacoes/README.md), a [homologação e a diferença exata](../../docs/sistemas/painel-solicitacoes/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/painel-solicitacoes/DADOS_E_SEGURANCA.md).

## Arquivos

| Arquivo | Papel |
|---|---|
| `Codigo.gs` | Catálogo de sete formulários; quatro categorias; períodos simples/compostos; dados para o frontend e `doGet`. |
| `Painel.html` | Estrutura, layout, cards, busca, estados de disponibilidade e carregamento. |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle de aparência. |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas; USP branca incorporada, IPUSP vazado e nomes acessíveis. |
| `PainelAjuda.html`, `PainelAjudaEstilos.html`, `PainelAjudaUI.html` | Conteúdo, estilos e interação da Central de Ajuda/FAQ (v1.3: seção "Contagem de créditos"). |
| `PainelNavegacaoEstilos.html`, `PainelNavegacaoUI.html` | v1.3. Menu lateral (padrão) e abas, como no Painel dos servidores; recolhe em telas ≤ 900 px. |
| `PainelIcones.html` | v1.3. Ícones Lucide do menu (licença em `LICENCA_ICONES.txt`). |
| `ContagemCreditos.gs` | v1.3. Lê as Regras Curriculares (só leitura, só currículos `ATIVO`) e entrega ao navegador o necessário para a contagem; cache de 5 min; `diagnosticarContagemCreditos()` para conferir no editor. |
| `PainelContagemMotor.html`, `PainelContagemUI.html`, `PainelContagemEstilos.html` | v1.3. Conta feita no navegador, janela da contagem e seus estilos. |

## Configuração antes de usar esta cópia

No projeto Apps Script alvo, em **Configurações do projeto → Propriedades do script**, cadastre `ID_INDEX_SPREADSHEET_ID` com o ID da planilha mestre chamada `ID_INDEX`. O valor fica apenas na configuração do Apps Script; não o envie para esta documentação, código, issues ou logs. A identidade de execução do Web App precisa ter permissão para ler essa planilha e a planilha indicada por `PERIODOS`. Esta implementação usa `SpreadsheetApp` e não introduz `DriveApp`.

O backend lê a **primeira aba** de `ID_INDEX`: A = `Chave`, B = `Tipo`, C = `ID de Produção`. Exige exatamente uma linha com A = `PERIODOS` e B = `spreadsheet`; usa C para abrir a planilha de períodos. A coluna D (`Homologação`) nunca é usada. Se faltar a configuração, a chave, o tipo ou o ID de produção, a consulta falha antes da lógica original de tolerância a falhas, sem apresentar todos os cards como abertos por um erro no índice.

Para instalar os nove arquivos, coloque-os no **nível raiz** do projeto Apps Script (o `include_` usa nomes sem o prefixo `src/`), configure a propriedade, confirme o modelo `executeAs` e teste no ambiente de desenvolvimento. Depois crie uma **nova versão da implantação existente**, mantendo a URL `/exec`. Confira a leitura dos períodos, os sete destinos, busca, Ajuda, AccountChooser, loading, marcas e três modos de tema. Um commit no Git não atualiza o Apps Script. O código do repositório é uma proposta de integração ao índice, não uma nova implantação homologada.

## Instalação da v1.3

1. No Apps Script do painel dos alunos, crie os arquivos novos com os mesmos nomes (sem `src/`): `ContagemCreditos.gs`, `PainelNavegacaoEstilos.html`, `PainelNavegacaoUI.html`, `PainelIcones.html`, `PainelContagemEstilos.html`, `PainelContagemMotor.html`, `PainelContagemUI.html`. Substitua o conteúdo de `Codigo.gs`, `Painel.html`, `PainelAjuda.html` e `PainelAjudaUI.html`. Os arquivos `Gradip*` e `PainelAjudaEstilos.html` não mudaram.
2. Na planilha `ID_INDEX`, acrescente uma linha: A = `REGRAS_CURRICULARES`, B = `spreadsheet`, C = ID de produção da planilha de Regras Curriculares (a mesma usada pelo Painel dos servidores). Não registre o valor no Git.
3. A conta que executa o Web App precisa de **leitura** nessa planilha. O painel dos alunos nunca escreve nela.
4. No editor, execute `diagnosticarContagemCreditos()` e confira no registro se os currículos ativos, os critérios e os operadores foram reconhecidos (ele também limpa o cache).
5. Crie uma nova versão da implantação existente e confira no `/exec`.

## Decisão sobre URLs

Os sete links `/exec` de `SISTEMAS` são destinos exibidos aos alunos no próprio painel. Foram conservados como **URLs destinadas ao público do painel**; o ID da planilha, que é um recurso operacional interno, foi omitido. As permissões de cada formulário vinculado são responsabilidade de seu backend e precisam ser verificadas individualmente. A URL não constitui autorização.
