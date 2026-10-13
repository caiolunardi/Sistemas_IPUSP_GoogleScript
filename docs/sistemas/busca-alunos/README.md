# Busca de Alunos — equipe

**Versão da interface:** GRADIP UI v1.0, sobre o código em uso recebido em 13/10/2026. O [código Apps Script](../../../sistemas/busca-alunos/README.md) está versionado e foi verificado localmente; **ainda não foi implantado nem homologado no `/exec`**. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

Ferramenta interna do Serviço de Graduação para localizar um aluno por parte do nome, número USP ou e-mail. Foi criada para a triagem dos grupos de atendimento clínico, que chegam da Psicologia Clínica com nomes incompletos e sem número USP. Só consulta: não grava, não altera e não envia dados.

## Funcionamento

- Ao abrir, a página chama `google.script.run.listarAlunosParaBusca()` uma única vez. O servidor resolve a planilha de alunos pela chave `PLANILHA_ALUNOS` no índice mestre `ID_INDEX` e devolve, para cada linha não vazia, só `numeroUsp`, `nome`, `email` e `emailSecundario`.
- Toda a filtragem acontece no navegador, sem nova chamada ao servidor a cada tecla (espera de 120 ms após a digitação). O texto digitado é dividido por espaços; cada termo precisa aparecer, sem acento e sem diferença de caixa, em algum dos quatro campos. A ordem dos termos não importa.
- São exibidos no máximo 60 resultados, com aviso quando houver mais. Os trechos que combinaram ficam destacados (`<mark>`). Campos vazios aparecem como "(sem nome cadastrado)", "sem e-mail cadastrado" ou "sem nº USP".
- Cadastros feitos depois que a página abriu só aparecem ao recarregá-la.
- O tema oferece Sistema, Claro e Escuro; a preferência é local ao navegador (`gradip-theme`). Sistema acompanha `prefers-color-scheme`, inclusive com a página aberta.
- A Central de Ajuda (botão **Ajuda** e gatilhos "Como buscar?" / "Não encontrou o aluno?") é estática e client-side. O texto-fonte está em [AJUDA.md](AJUDA.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Uso, instalação/atualização, configuração, diagnóstico e manutenção. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda, FAQ e gatilhos contextuais. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, configuração, acesso e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Diferença exata em relação ao código original, hashes e verificação local. |

## Arquivos e dependências

Os nove arquivos em [`src/`](../../../sistemas/busca-alunos/src) são `Codigo.gs`, `BuscaAlunosApp.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `BuscaAlunosAjuda.html`, `BuscaAlunosAjudaEstilos.html` e `BuscaAlunosAjudaUI.html`. Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

| Versão | Alterações |
|---|---|
| Original (em uso) | `Codigo.gs` + `BuscaAlunosApp.html`. Cores fixas, sem Dark Mode, sem ajuda; ID do `ID_INDEX` literal no código. |
| GRADIP UI v1.0 (Git) | Tema Sistema/Claro/Escuro com tokens, cabeçalho GRADIP com marcas IPUSP/USP, rótulo visível no campo, Central de Ajuda/FAQ, ID do `ID_INDEX` em `Script Properties`, `diagnosticarBuscaAlunos()`. Script da busca byte-idêntico. Exige `ID_INDEX_SPREADSHEET_ID`. Não homologado no `/exec`. |
