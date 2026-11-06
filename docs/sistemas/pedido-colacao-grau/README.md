# Formulário de Pedido de Colação de Grau — documentação do legado

**Situação da documentação (06/11/2026):** inventário técnico inicial baseado exclusivamente nos arquivos `Codigo(1).gs` (841 linhas) e `ColacaoApp.html` (870 linhas) entregues pelo responsável. **O código bruto não foi incorporado ao Git público**: contém identificadores operacionais reais e exige preflight de segurança/sanitização. Não há `src/`, `appsscript.json`, testes versionados, projeto de homologação verificado nem versão declarada nesses anexos. A versão efetivamente servida pelo Google está **NAO_VERIFICADA** por esta análise.

**Natureza:** projeto Apps Script independente destinado aos alunos; **não** é o [Gerenciador de Colação de Grau e Diplomas](../emissao-diplomas/README.md), que pertence à equipe. A implantação de um não implanta o outro. O [Painel dos Servidores](../painel-servidores/README.md) apenas configura o período e o semestre do formulário.

## Finalidade observada

Receber solicitações de colação de grau de estudantes autenticados com e-mail institucional, para Bacharelado, Licenciatura e Formação de Psicólogo(a), com dois anexos obrigatórios (RG/CIN e certidão de nascimento). Pré-preenche dados encontrados no cadastro central, consulta o prazo vigente em `PERIODOS`, permite corrigir solicitação da **mesma colação** e registra a solicitação na aba `Diplomas` consumida pelo Gerenciador.

No legado, o formulário também busca/cria a pasta institucional por nº USP, grava arquivos no Drive e pode cadastrar/complementar o cadastro de alunos. **Ele não conduz a conferência administrativa, nem histórico escolar, geração de certificados/ofícios, envio de convocações, emissão de diploma, exclusão administrativa ou alterações de etapas posteriores.**

## Fronteira funcional e responsabilidade acordada

- **Formulário (entrada):** identificar solicitante, consultar período, receber pedido e anexos, lidar com correções do mesmo pedido, validar o vínculo do pedido com a identidade autenticada e encaminhar dados íntegros ao armazenamento compartilhado.
- **Gerenciador (tratamento):** revisar pedidos e documentos, gerir etapas e arquivos administrativos, analisar histórico, registrar resultados, gerar documentos, executar comunicações e concluir o processo.
- **Próxima reformulação do formulário — requisito futuro:** reconhecer documentos de colações anteriores, apresentar proveniência e opções **reutilizar / substituir por nova versão / acrescentar documento**, preservar histórico por pedido e obter confirmação explícita antes de qualquer substituição. **Isso não está implementado no código recebido.**
- **Dado compartilhado:** nº USP identifica a pasta institucional; a solicitação individual é distinta por nº USP e código da colação. Não confundir pasta única com um único processo. Referência canônica: [contrato de integração](CONTRATO_INTEGRACAO.md).

## O que existe e o que falta

| Elemento | Estado verificado |
| --- | --- |
| Dois arquivos do legado enviados em 06/11/2026 | **LIDOS**; proveniência, hashes e funções no [inventário](INVENTARIO_LEGADO.md) |
| Web App de alunos | **DESCRITO PELO CÓDIGO**; publicação real não inspecionada |
| Formulário de correção de pedido | **IMPLEMENTADO NO ANEXO** para a mesma colação |
| Arquivos de colações diferentes na mesma pasta | **IMPLEMENTADO NO ANEXO**, mas o nome dos documentos **não inclui a colação** e pode substituir versões anteriores |
| Escolha de reutilização/atualização de anexos | **REQUISITO FUTURO**, não implementado |
| Identidade visual moderna GRADIP, tema e Central de Ajuda | **NÃO IMPLEMENTADOS** neste legado; ver [ajuda/UX](AJUDA.md) |
| `ID_INDEX`, `AMBIENTE` e testes de homologação isolados | **NÃO IMPLEMENTADOS** no material recebido |
| Segurança do modelo de implantação e vinculação de identidade | **REQUER REVISÃO CRÍTICA** antes de modernizar/publicar; ver [segurança](DADOS_E_SEGURANCA.md) |
| Código-fonte, manifesto, testes, deploy e status do Google | **NÃO PUBLICADOS/NAO_VERIFICADOS** nesta rodada |

## Documentos deste aplicativo

| Arquivo | Conteúdo |
| --- | --- |
| [INVENTARIO_LEGADO.md](INVENTARIO_LEGADO.md) | Proveniência, funções servidor/cliente e limites do acervo recebido |
| [FLUXOS_E_REGRAS.md](FLUXOS_E_REGRAS.md) | Abertura, pré-preenchimento, validação, envio, correção e estados |
| [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md) | Abas, colunas e campos; efeitos nas planilhas/Drive |
| [CONTRATO_INTEGRACAO.md](CONTRATO_INTEGRACAO.md) | Responsabilidades com Gerenciador e futura gestão de anexos |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados pessoais, modelo de execução alegado e riscos |
| [AJUDA.md](AJUDA.md) | Orientações visíveis ao aluno e lacunas da Central de Ajuda |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Testes ainda não executados e critérios de futura reformulação |
| [INSTALACAO.md](INSTALACAO.md) | Restrições de configuração, implantação e retorno |
| [DECISOES.md](DECISOES.md) | Decisões de responsabilidade, diferenças entre atual e futuro |

**Continuidade:** [entrada do aplicativo](../../../sistemas/pedido-colacao-grau/README.md), [STATUS](../../../sistemas/pedido-colacao-grau/STATUS.md) e [contexto local proposto](../../../sistemas/pedido-colacao-grau/contexto/CONTEXT_SYSTEM.md). O contexto está em **PROPOSTA**, sem ativação no `context.config.json` até passar por revisão e adoção específicas.

## Próximo marco

Auditar o vínculo entre conta e nº USP, o modelo de permissões de execução e acesso a recursos, a segurança dos anexos e a integridade de atualização de um pedido. Somente depois criar **código sanitizado**, testes com dados fictícios e projeto separado de homologação. Esta rodada é **somente documental**: nenhuma planilha, pasta, Script Property, código do editor ou deployment foi alterado.
