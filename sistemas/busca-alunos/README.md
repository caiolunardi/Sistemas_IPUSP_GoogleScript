# Gerenciador de Pessoas (antes Comunidade IPUSP e Busca de Alunos) — fonte v1.5

No Google: `GRADIP · Gerenciador de Pessoas · PRODUÇÃO`.

Esta pasta contém os **doze arquivos Apps Script** da Comunidade IPUSP, em `src/` (onze de código e o manifesto). A pasta e os nomes de arquivo continuam os da Busca de Alunos, para a atualização ser só substituir arquivos. A v1.0 aplicou o tema GRADIP (Sistema/Claro/Escuro) e a Central de Ajuda sobre os dois arquivos em uso (`Codigo.gs` e `BuscaAlunosApp.html`, recebidos em 13/10/2026). A **v1.1** corrige o título da coluna de e-mail para `eMail` e acrescenta, a pedido do Serviço de Graduação:

- **ficha do aluno** em modal, com todas as colunas da planilha, editável e salvando para quem é editor da planilha;
- **filtro por ano e semestre de ingresso** (coluna `Ingresso`, formato AAAA/S), com combobox dos anos existentes;
- **exportação** da lista filtrada em **CSV** ou **PDF**.

A **v1.2** (14/10/2026) muda o nome para **Comunidade IPUSP** e faz a mesma caixa de busca procurar também nos cadastros de **docentes** (`PLANILHA_DOCENTES`) e **servidores** (`SERVIDORES`), com um selo em cada resultado: **Aluno**, **Docente**, **Servidor** ou **Setor**. O filtro de ingresso é só de alunos.

A **v1.3** (14/10/2026) acompanha o novo esquema das planilhas de servidores e docentes (lidas pelo título) e acrescenta: **ficha editável** também para docentes, servidores e setores; **número USP** de toda pessoa no card, **copiado ao clicar** (mensagem de 3 s); **Prof./Profª.** no título da ficha do docente, calculado pela coluna `M / F` (a coluna `TRATAMENTO`, com fórmula, deixa de ser usada).

A **v1.4** (09/11/2026, em PR, não enviada ao Google) põe a **autorização no servidor**: toda função pública confere, antes de abrir qualquer cadastro, o perfil da conta na aba `PESSOAS_IPUSP` da planilha de permissões (`PERMISSOES_DE_ACESSO`). **LEITOR** busca, abre a ficha só para consulta e exporta; **ADMINISTRADOR** também salva a ficha, e continua precisando ser editor da planilha do cadastro. Quem não está na lista recebe só uma página de aviso, sem nenhum dado. A Script Property `AMBIENTE=homologacao` passa a ler a coluna `Homologação` do `ID_INDEX`. A busca, a ficha, a gravação e a exportação não mudaram. É o PR 2 do plano do novo formulário de colação de grau, pré-requisito para abrir a página a outras contas além da institucional.

A busca por texto continua igual: uma única carga da lista, filtragem no navegador, limite de 60 resultados na tela.

O GitHub é a referência de código, mas **não sincroniza automaticamente** com a implantação no Google Apps Script. Consulte a [documentação funcional](../../docs/sistemas/busca-alunos/README.md), o [manual de operação](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md), a [homologação e a diferença exata](../../docs/sistemas/busca-alunos/HOMOLOGACAO.md) e o [inventário de segurança](../../docs/sistemas/busca-alunos/DADOS_E_SEGURANCA.md).

A **v1.5** (10/11/2026, em PR sobre a v1.4, não enviada ao Google) traz a **fila de cadastro** dos pedidos de colação de grau (PR 5 do plano): os pedidos que o Formulário de Pedido de Colação de Grau 2.x protocolou sem conseguir confirmar o cadastro aparecem, só para ADMINISTRADOR, em "Solicitações de cadastro". A equipe vincula a um cadastro existente (podendo trocar o e-mail principal, nunca de forma automática), cria um cadastro novo ou rejeita com motivo; cada decisão vira uma linha na aba `DECISOES_CADASTRO` da planilha `PEDIDOS_COLACAO`, que o Gerenciador de Diplomas lê para levar o pedido aprovado à lista da colação. Arquivos: `PessoasFilaCadastro.gs` (novo), `BuscaAlunosApp.html`, `BuscaAlunosAjuda.html`; `Codigo.gs` só no comentário. Detalhes: [FILA_CADASTRO.md](../../docs/sistemas/busca-alunos/FILA_CADASTRO.md).

## Arquivos

| Arquivo | Papel | Origem |
|---|---|---|
| `PessoasAcesso.gs` | Quem pode usar e com que perfil: lê a aba `PESSOAS_IPUSP`, `exigirLeitorPessoas_`/`exigirAdministradorPessoas_`, página de quem não tem acesso. | v1.4 |
| `PessoasSemAcesso.html` | Aviso para quem não tem acesso (tema GRADIP, marcas, nenhum dado e nenhuma chamada ao servidor). | v1.4 |
| `PessoasFilaCadastro.gs` | Fila de cadastro dos pedidos de colação: `obterFilaCadastro` (ADMINISTRADOR; LEITOR recebe só `visivel: false`), `decidirCadastro` (vincular, criar, rejeitar; ADMINISTRADOR editor da planilha de alunos) e `prepararDecisoesCadastro` (só pelo editor). | v1.5 |
| `appsscript.json` | Manifesto: executa como quem implanta, **Quem pode acessar: somente eu** (o que o responsável informou em 20/10/2026). Abrir o acesso é uma mudança separada, depois da homologação. | v1.4 (antes não versionado) |
| `Codigo.gs` | `doGet` (template), `include_`, `ID_INDEX`, lista da comunidade (`listarComunidadeParaBusca`: alunos, docentes, servidores e setores), ficha dos três cadastros (`obterFicha`/`salvarFicha`; `obterFichaAluno`/`salvarFichaAluno` como atalhos), PDF (`gerarPdfListaAlunos`) e diagnóstico (`diagnosticarComunidadeIPUSP`). v1.4: conferência de perfil em toda função pública e `AMBIENTE`. | original + v1.0 a v1.4 |
| `BuscaAlunosApp.html` | Cabeçalho GRADIP, busca, selos de vínculo, nº USP copiável, filtros de ingresso, exportação, resultados e ficha. | original + v1.0 a v1.3 |
| `GradipTema.html`, `GradipTemaControle.html` | Tokens, alternância Sistema/Claro/Escuro e controle **Aparência**. | byte-idênticos às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | Marcas para os dois temas. | byte-idênticos às cópias dos dois sistemas |
| `BuscaAlunosAjuda.html` | Conteúdo da Central de Ajuda/FAQ. | v1.0, ampliado na v1.1 a v1.3 |
| `BuscaAlunosAjudaEstilos.html`, `BuscaAlunosAjudaUI.html` | Estilos e comportamento da Central. | byte-idênticos a `shared/ajuda/` |

Os testes locais estão em [`testes/`](testes/README.md) e não vão para o Apps Script.

## Configuração antes de usar esta cópia

No projeto Apps Script, em **Configurações do projeto → Propriedades do script**, cadastre:

| Propriedade (nome) | Valor |
|---|---|
| `ID_INDEX_SPREADSHEET_ID` | o ID da planilha mestre `ID_INDEX` |
| `AMBIENTE` (v1.4, opcional) | `producao` (padrão, se vazia) ou `homologacao`; em homologação os IDs vêm da coluna `Homologação` do `ID_INDEX`, e coluna vazia é erro (nunca cai para a produção) |

O nome vai no campo **Propriedade** e o ID no campo **Valor**; no código, a constante `PROPRIEDADE_ID_INDICE` deve continuar com o **nome** `"ID_INDEX_SPREADSHEET_ID"`. O valor fica só no Apps Script: não o envie para esta documentação, código, issues ou logs.

No `ID_INDEX`, o backend lê a aba `Página1` (ou a primeira aba), encontra as colunas `Chave` e `ID de Produção` pelo título e usa as linhas `PLANILHA_ALUNOS`, `SERVIDORES` e `PLANILHA_DOCENTES`. Na planilha de alunos, lê a primeira aba e exige os títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail` e `eMail Secundario` (espaços nas pontas são ignorados; o ícone "Tт" das colunas de texto da tabela do Sheets não faz parte do nome). `ID da Pasta` aparece na ficha, mas é somente leitura.

Nas planilhas de servidores e de docentes, lê a primeira aba **pelo título** (acento, espaço e maiúscula não importam):

- servidores: `E-MAIL` e `NOME` (obrigatórias), `Setor`, `N.USP`, `TIPO` (`SERVIDOR` ou `SETOR`), `ID da Pasta` (só leitura), `eMail Secundario`;
- docentes: `NOME` e `E-mail` (obrigatórias), `N. USP`, `M / F`, `ID da Pasta` (só leitura), `eMail Secundario`. `TRATAMENTO` é ignorada e pode ser apagada.

Se um desses cadastros não abrir, os outros aparecem com um aviso.

**Acesso (v1.4).** No `ID_INDEX`, a chave `PERMISSOES_DE_ACESSO` aponta para a planilha de permissões; nela, a aba `PESSOAS_IPUSP` tem os títulos na linha 1 e, da linha 2 em diante: A = N. USP (vazio para conta de setor), B = Nome, C = e-mail, D = Observação, E = Perfil (`LEITOR` ou `ADMINISTRADOR`). Linha sem e-mail completo, com coringa ou com perfil diferente desses dois não dá acesso; e-mail repetido vale o menor perfil. Se a planilha ou a aba não abrir, ninguém entra (falha fechada). A lista fica em cache por 60 s. Modelo fictício: [`dados-ficticios/PESSOAS_IPUSP.csv`](../../docs/sistemas/busca-alunos/dados-ficticios/PESSOAS_IPUSP.csv).

Para **salvar** alterações, a conta precisa ter o perfil **ADMINISTRADOR** e ser **editora da planilha daquele cadastro** (alunos, docentes ou servidores), individualmente (compartilhamento só por grupo não é reconhecido). As demais contas com acesso consultam e exportam.

## Instalação (copiar e colar)

1. Abra o projeto Apps Script da Busca de Alunos e guarde uma cópia da versão atual.
2. Substitua o conteúdo de `Codigo.gs`, `BuscaAlunosApp.html` e `BuscaAlunosAjuda.html` pelos desta pasta e crie `PessoasAcesso.gs` e `PessoasSemAcesso.html` (v1.4); os outros seis arquivos não mudaram. **Antes**, crie e preencha a aba `PESSOAS_IPUSP` (acima): sem ela, nem a conta institucional abre a página.
3. Instalação nova: crie os outros sete arquivos HTML (**+ → HTML**) na raiz do projeto, com os nomes **exatos e sem extensão**: `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `BuscaAlunosAjuda`, `BuscaAlunosAjudaEstilos`, `BuscaAlunosAjudaUI`.
4. Cadastre a propriedade `ID_INDEX_SPREADSHEET_ID` (acima).
5. Execute `diagnosticarComunidadeIPUSP` no editor (até a v1.1 chamava-se `diagnosticarBuscaAlunos`) e **autorize** se o Google pedir. Confira em **Registros de execução** o ambiente, o perfil da sua conta (v1.4: o restante só roda para ADMINISTRADOR), se as três chaves foram encontradas, os títulos das colunas e as quantidades.
6. Teste pela URL de teste (`/dev`). Depois crie uma **nova versão da implantação existente** (**Implantar → Gerenciar implantações → editar → Nova versão**), mantendo a URL `/exec`.

Um commit no Git não atualiza o Apps Script. O passo a passo completo, com o que conferir no `/exec`, está no [manual](../../docs/sistemas/busca-alunos/MANUAL_OPERACAO.md#instalar-ou-atualizar).
