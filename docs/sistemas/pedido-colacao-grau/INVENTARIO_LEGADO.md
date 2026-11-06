# Inventário técnico e proveniência — formulário legado

## Fontes recebidas

Material fornecido em 06/11/2026 pelo responsável, como código atual do formulário. A origem no editor Apps Script, o `scriptId`, o commit correspondente, a versão servida em `/exec` e o manifesto não foram confrontados; **não alegar equivalência com produção**.

| Fonte privada recebida | Tamanho lógico | SHA-256 do arquivo fornecido | Publicação |
| --- | ---: | --- | --- |
| `Codigo(1).gs` | 841 linhas | `5adfcc67c1527be7cfcb937df80b1c5b341635e53ebc0cf2212f3519b6c17364` | **não versionar sem sanitizar** |
| `ColacaoApp.html` | 870 linhas | `4da5594ba5fee0089c228fb52116c3805da22c0d514eab5521b2fba08ca89765` | **não versionar sem sanitizar** |

Os arquivos originais incluem identificadores de planilhas, pasta Drive e endereço de Web App escritos diretamente no código; por política de publicação, seus valores **não são reproduzidos aqui**, nem em anexos, commits, fixtures ou PR. Hashes identificam somente os arquivos entregues, **não** provam implantação nem integridade do editor Google.

## Backend — 28 funções identificadas

**Endpoints globais chamáveis:**
- `doGet(e)`: verifica e-mail institucional e serve HTML ou tela de restrição.
- `obterDadosIniciais()`: lê período, cadastro e pedido anterior; devolve dados para pré-preenchimento ou bloqueio do período.
- `enviarPedidoColacao(dados)`: valida dados no servidor, cadastra/complementa aluno, gere a pasta/anexos e insere/corrige registro na planilha de Diplomas.

**Acesso e validação interna:** `obterAbaDiplomas_`, `mapearCabecalhos_`, `obterOuCriarColuna_`, `sanitizarTextoPlano_`, `normalizarNUsp_`, `validarAnoIngresso_`, `validarSimNao_`, `extrairIdDaUrl_`, `obterPastaRaizId_`, `sanitizarNomeArquivo_`, `obterExtensao_`, `normalizarNome_`.

**Períodos:** `obterLinhaPeriodo_`, `extrairDataDeCelula_`, `extrairHoraDeCelula_`, `montarChaveDataHora_`, `agoraChaveDataHora_`, `obterStatusPeriodo_`.

**Cadastro/pedidos:** `obterAbaAlunos_`, `buscarAlunoPorEmail_`, `buscarAlunoPorNusp_`, `buscarPedidoExistente_`.

**Arquivos/organização:** `garantirPastaAluno_`, `salvarArquivoNaPasta_`, `calcularHabilitacaoTexto_`.

## HTML/cliente — 14 funções identificadas

`mostrarLoadingInicial`, `receberDadosIniciais`, `mostrarTelaErro`, `configurarGrupoSimNao`, `valorGrupoSimNao`, `selecionarGrupoSimNao`, `alternarBlocoProcurador`, `atualizarHabilitacoesPendentes`, `configurarUpload`, `marcarArquivoEscolhido`, `validarEEnviar`, `aoSucessoEnvio`, `mostrarLoading`, `esconderLoading`.

Chamadas `google.script.run` efetivamente utilizadas pelo HTML: `obterDadosIniciais()` na abertura e `enviarPedidoColacao(dados)` no envio. Uploads são convertidos para base64 com `FileReader`; a página dispõe de seleção por clique ou arrastar/soltar.

## Interface recebida

- Cabeçalho IPUSP/USP, barra azul, formulário de coluna central, seções de dados do aluno, documentos, cursos concluídos, continuidade de matrícula, dados complementares.
- Estados: carregando, erro, período fechado, formulário, confirmação; aviso de correção de pedido existente e overlay de processamento.
- Campos condicionais: procurador (quando `SIM`) e habilitações pendentes diferentes das concluídas.
- Nome/e-mail/nº USP e parte do pedido anterior pré-preenchidos a partir do servidor; anexos anteriores **não** são reapresentados para escolher reutilização.
- Usa CSS próprio com cores fixas; não há tema Sistema/Claro/Escuro ou Central de Ajuda contextual no material.
- Mensagem de confirmação na página; **não há envio de recibo por e-mail** no backend recebido.
- Textos sobre diploma digital, 2ª via e atos normativos estão no HTML **como conteúdo legado**; atualização jurídica/editorial não foi verificada.

## Limites de leitura

Análise estática somente desses dois arquivos, comparada pontualmente à fonte versionada do Gerenciador 4.0 e ao módulo de períodos do Painel dos Servidores. Não houve teste de navegador, execução Apps Script, inspeção de planilhas ou Google Drive, auditoria das implantações nem acesso a dados pessoais. A ausência de outro arquivo no material recebido **não prova** sua inexistência no projeto Google. Nenhum teste é declarado aprovado.
