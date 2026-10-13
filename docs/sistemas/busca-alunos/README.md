# Busca de Alunos — equipe

**Versão:** v1.1, sobre a v1.0 (tema GRADIP e Central de Ajuda), que partiu do código em uso recebido em 13/10/2026. O [código Apps Script](../../../sistemas/busca-alunos/README.md) está versionado e foi verificado localmente; **ainda não foi homologado no `/exec`**. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

Ferramenta interna do Serviço de Graduação para localizar um aluno por parte do nome, número USP ou e-mail, conferir e corrigir o cadastro dele e tirar listas por ano de ingresso. Foi criada para a triagem dos grupos de atendimento clínico, que chegam da Psicologia Clínica com nomes incompletos e sem número USP; a exportação atende pedidos como a lista de e-mails de uma turma para o setor de comunicação.

## Funcionamento

- **Carga:** ao abrir, a página chama `google.script.run.listarAlunosParaBusca()` uma única vez. O servidor resolve a planilha de alunos pela chave `PLANILHA_ALUNOS` no índice mestre `ID_INDEX` e devolve, para cada linha não vazia, `linha`, `numeroUsp`, `nome`, `ingresso`, `email` e `emailSecundario`.
- **Busca:** feita no navegador (espera de 120 ms após a digitação). O texto é dividido por espaços; cada termo precisa aparecer, sem acento e sem diferença de caixa, no nome, no número USP ou num dos e-mails. A ordem não importa. São exibidos no máximo 60 resultados, com destaque (`<mark>`) dos trechos que combinaram.
- **Ingresso:** o combobox **Ano de ingresso** lista, do mais recente ao mais antigo, os anos presentes na coluna `Ingresso` (quatro primeiros dígitos), com a quantidade de alunos. **Semestre** (1º/2º, o dígito depois da barra) fica disponível depois de escolher o ano. O filtro combina com o texto. Ano escolhido e texto vazio = turma inteira, em ordem alfabética. Ingresso vazio ou fora do formato só aparece em "Todos os anos".
- **Exportação:** **Exportar CSV** e **Exportar PDF** saem do resultado atual inteiro (não só dos 60 da tela), com as colunas Nome do Aluno, Número USP, Ingresso, eMail e eMail Secundario. O CSV é gerado no navegador (UTF-8 com BOM, separador `;`, proteção contra fórmula). O PDF é gerado no servidor por `gerarPdfListaAlunos()` a partir das linhas enviadas pela página, sem gravar nada no Drive; limite de 5.000 linhas.
- **Ficha do aluno:** clicar num resultado (ou Enter) abre um modal com todas as colunas com título da linha do aluno (`obterFichaAluno()`). Quem é editor da planilha pode alterar e **Salvar alterações** (`salvarFichaAluno()`); só as células modificadas são gravadas. `ID da Pasta` e células com fórmula são somente leitura. Antes de gravar, o servidor confere permissão, se a linha ainda é do mesmo aluno, se ninguém mudou o campo nesse meio-tempo e o formato (Número USP só dígitos, Ingresso AAAA/1 ou AAAA/2, e-mails válidos, nome não vazio). Após salvar, a lista da página é atualizada sem recarregar.
- Cadastros feitos por outras pessoas depois que a página abriu só aparecem ao recarregá-la.
- **Tema:** Sistema, Claro e Escuro; preferência local ao navegador (`gradip-theme`). Sistema acompanha `prefers-color-scheme`, inclusive com a página aberta.
- **Ajuda:** Central estática e client-side (botão **Ajuda** e gatilhos abaixo da busca). Texto-fonte em [AJUDA.md](AJUDA.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Uso, instalação/atualização, configuração, diagnóstico e manutenção. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda, FAQ e gatilhos contextuais. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, gravação, exportação, acesso e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Diferenças em relação ao original e à v1.0, hashes e verificação local. |

## Arquivos e dependências

Os nove arquivos em [`src/`](../../../sistemas/busca-alunos/src) são `Codigo.gs`, `BuscaAlunosApp.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `BuscaAlunosAjuda.html`, `BuscaAlunosAjudaEstilos.html` e `BuscaAlunosAjudaUI.html`. Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

| Versão | Alterações |
|---|---|
| Original (em uso) | `Codigo.gs` + `BuscaAlunosApp.html`. Cores fixas, sem Dark Mode, sem ajuda; ID do `ID_INDEX` literal no código; título de e-mail `Tr eMail`. |
| v1.0 | Tema Sistema/Claro/Escuro com tokens, cabeçalho GRADIP com marcas IPUSP/USP, rótulo visível no campo, Central de Ajuda/FAQ, ID do `ID_INDEX` em `Script Properties`, `diagnosticarBuscaAlunos()`. Script da busca byte-idêntico. |
| v1.1 | Título `eMail`; coluna `Ingresso`; ficha do aluno editável com controle de permissão e conflito; filtro por ano/semestre de ingresso; exportação CSV/PDF; ajuda ampliada. Exige nova autorização do script. Não homologado no `/exec`. |
