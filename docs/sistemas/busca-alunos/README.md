# Comunidade IPUSP (antiga Busca de Alunos) — equipe

**Versão:** v1.3 (14/10/2026), sobre a v1.2 (Comunidade IPUSP), a v1.1 (ficha, ingresso e exportação) e a v1.0 (tema GRADIP e Central de Ajuda), que partiu do código em uso recebido em 13/10/2026. O [código Apps Script](../../../sistemas/busca-alunos/README.md) está versionado e foi verificado localmente; **ainda não foi homologado no `/exec`**. O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

Ferramenta interna do Serviço de Graduação para localizar, numa única caixa de busca, uma pessoa do IPUSP (aluno, docente ou servidor) ou um setor, por parte do nome, número USP, e-mail ou setor. Cada resultado traz um selo com o vínculo. Para alunos, permite ainda conferir e corrigir o cadastro e tirar listas por ano de ingresso. Nasceu como "Busca de Alunos", para a triagem dos grupos de atendimento clínico (nomes incompletos e sem número USP); a exportação atende pedidos como a lista de e-mails de uma turma para o setor de comunicação. A pasta continua `busca-alunos` e os arquivos mantêm os nomes, para a atualização ser só copiar e colar.

## Funcionamento

- **Carga:** ao abrir, a página chama `google.script.run.listarComunidadeParaBusca()` uma única vez. O servidor resolve três cadastros pelo índice mestre `ID_INDEX` e devolve `{pessoas, indisponiveis}`. Cada pessoa tem `tipo`:
  - `aluno` — chave `PLANILHA_ALUNOS`, colunas pelo título: `linha`, `numeroUsp`, `nome`, `ingresso`, `email`, `emailSecundario`;
  - `docente` — chave `PLANILHA_DOCENTES`, colunas pelo título (v1.3): `linha`, `numeroUsp`, `nome`, `email`, `emailSecundario` (o gênero não vai na lista);
  - `servidor` ou `setor` — chave `SERVIDORES`, colunas pelo título (v1.3): `linha`, `numeroUsp` (vazio para setor), `nome`, `email`, `emailSecundario`, `setor`. O vínculo vem da coluna `TIPO` (`SERVIDOR`/`SETOR`); com `TIPO` vazio, vale a regra antiga (`INICIOS_NOME_SETOR`).
  Um cadastro que não abre vai para `indisponiveis` (`descricao` e `motivo`, sem IDs nem e-mails) e a página mostra um aviso; só se os três falharem a carga dá erro. A auditoria da Estrutura Curricular lê os mesmos cadastros pela posição; o esquema atual é compatível com ela.
- **Selo:** cada card começa com **Aluno**, **Docente**, **Servidor** ou **Setor** (texto + cor de token semântico). Servidor mostra o setor; aluno, o ingresso.
- **Nº USP (v1.3):** pessoas mostram o número USP à direita (setor não). O selo é um botão: o clique copia o número (API de área de transferência; se bloqueada, método alternativo) e mostra por 3 s "Número USP copiado para área de transferência", sem abrir a ficha.
- **Busca:** feita no navegador (espera de 120 ms após a digitação). O texto é dividido por espaços; cada termo precisa aparecer, sem acento e sem diferença de caixa, no nome, no número USP, num dos e-mails ou no setor. A ordem não importa. São exibidos no máximo 60 resultados, com destaque (`<mark>`) dos trechos que combinaram.
- **Ingresso:** filtro só de alunos (com ano escolhido, os demais vínculos saem da lista). O combobox **Ano de ingresso** lista, do mais recente ao mais antigo, os anos presentes na coluna `Ingresso` (quatro primeiros dígitos), com a quantidade de alunos. **Semestre** (1º/2º, o dígito depois da barra) fica disponível depois de escolher o ano. O filtro combina com o texto. Ano escolhido e texto vazio = turma inteira, em ordem alfabética. Ingresso vazio ou fora do formato só aparece em "Todos os anos".
- **Exportação:** **Exportar CSV** e **Exportar PDF** saem do resultado atual inteiro (não só dos 60 da tela), com as colunas Vínculo, Nome, Setor, Número USP, Ingresso, E-mail e E-mail secundário. O CSV é gerado no navegador (UTF-8 com BOM, separador `;`, proteção contra fórmula). O PDF é gerado no servidor por `gerarPdfListaAlunos()` a partir das linhas enviadas pela página, sem gravar nada no Drive; limite de 5.000 linhas.
- **Ficha (v1.3: todos os vínculos):** clicar no nome (ou Enter) abre um modal com todas as colunas com título da linha (`obterFicha({cadastro, linha, ...})`, `cadastro` = `alunos`, `docentes` ou `servidores`). Quem é editor da planilha daquele cadastro pode alterar e **Salvar alterações** (`salvarFicha()`); só as células modificadas são gravadas. `ID da Pasta` e células com fórmula são somente leitura; `TRATAMENTO` dos docentes não aparece, e o título da ficha leva Prof./Profª. pela coluna `M / F`. Antes de gravar, o servidor confere permissão, se a linha ainda é da mesma pessoa (alunos: nº USP + nome; demais: nome + e-mail), se ninguém mudou o campo nesse meio-tempo e o formato (número USP só dígitos, Ingresso AAAA/1 ou AAAA/2, e-mails válidos, nome não vazio, `M / F` só M ou F, `TIPO` só SERVIDOR ou SETOR). `obterFichaAluno`/`salvarFichaAluno` continuam como atalhos para alunos. Após salvar, a lista da página é atualizada sem recarregar.
- Cadastros feitos por outras pessoas depois que a página abriu só aparecem ao recarregá-la.
- **Tema:** Sistema, Claro e Escuro; preferência local ao navegador (`gradip-theme`). Sistema acompanha `prefers-color-scheme`, inclusive com a página aberta.
- **Ajuda:** Central estática e client-side (botão **Ajuda** e gatilhos abaixo da busca). Texto-fonte em [AJUDA.md](AJUDA.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Uso, instalação/atualização, configuração, diagnóstico e manutenção. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda, FAQ e gatilhos contextuais. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, gravação, exportação, acesso e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Diferenças em relação ao original, à v1.0 e à v1.1, hashes e verificação local. |

## Arquivos e dependências

Os nove arquivos em [`src/`](../../../sistemas/busca-alunos/src) são `Codigo.gs`, `BuscaAlunosApp.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`, `BuscaAlunosAjuda.html`, `BuscaAlunosAjudaEstilos.html` e `BuscaAlunosAjudaUI.html`. Ativos centrais: [IPUSP](../../../assets/ipusp/README.md) e [USP](../../../assets/usp/README.md). Padrões: [tema](../../THEME_IMPLEMENTATION.md), [design system](../../UX_DESIGN_SYSTEM.md) e [ajuda](../../ajuda/README.md).

| Versão | Alterações |
|---|---|
| Original (em uso) | `Codigo.gs` + `BuscaAlunosApp.html`. Cores fixas, sem Dark Mode, sem ajuda; ID do `ID_INDEX` literal no código; título de e-mail `Tr eMail`. |
| v1.0 | Tema Sistema/Claro/Escuro com tokens, cabeçalho GRADIP com marcas IPUSP/USP, rótulo visível no campo, Central de Ajuda/FAQ, ID do `ID_INDEX` em `Script Properties`, `diagnosticarBuscaAlunos()`. Script da busca byte-idêntico. |
| v1.1 | Título `eMail`; coluna `Ingresso`; ficha do aluno editável com controle de permissão e conflito; filtro por ano/semestre de ingresso; exportação CSV/PDF; ajuda ampliada. Exige nova autorização do script. |
| v1.2 | **Comunidade IPUSP**: busca também nos cadastros de docentes (`PLANILHA_DOCENTES`) e servidores (`SERVIDORES`); selo Aluno/Docente/Servidor/Setor; cadastro indisponível não derruba os outros; exportação com Vínculo e Setor; diagnóstico `diagnosticarComunidadeIPUSP`. |
| v1.3 | Novo esquema de servidores (com `N.USP`, `TIPO`, `ID da Pasta`, `eMail Secundario`) e docentes (com `N. USP`, `M / F`, `ID da Pasta`, `eMail Secundario`), lidos pelo título; ficha editável para docentes, servidores e setores; número USP das pessoas no card, copiado ao clicar; Prof./Profª. pelo `M / F` no lugar da fórmula `TRATAMENTO`. Não homologado no `/exec`. |
