# Gerenciador de Colação de Grau e Diplomas

**Versão:** **4.0.0** (05/11/2026), **homologação parcial concluída em 06/11/2026, com as correções da revisão independente · EM PRODUÇÃO** (implantação confirmada pelo responsável em 06/11/2026). O código está em [`sistemas/emissao-diplomas/`](../../../sistemas/emissao-diplomas/README.md). O código enviado ao projeto PRODUÇÃO foi conferido por hash (commit `4792667`); a versão e o identificador da implantação não foram conferidos por este repositório, e o GitHub não informa o que está implantado no Apps Script. O desligamento da 3.x do projeto vinculado à planilha de diplomas fica com o responsável.

## Finalidade

Web App da equipe do Serviço de Graduação que acompanha cada aluno da conferência dos dados pessoais até o encaminhamento do diploma, em quatro etapas: Dados Pessoais → Histórico Escolar → Colação de Grau → Emissão de Diploma. Inclui pasta do aluno no Drive com anexos, análise automática do histórico escolar (PDF lido no navegador e avaliado no servidor pelas Regras Curriculares), relatórios de conferência, certificado de conclusão, ofício de diploma, lista de formandos, e-mails de convocação e de aviso de diploma, observações e ações em lote.

## Fronteira funcional com o Pedido de Colação de Grau

**Estado do contrato (06/11/2026):** esta seção registra a separação de responsabilidades e o comportamento verificado no código do **Gerenciador** 4.0.0 (no `main` desde o merge `4792667`; implantação em produção confirmada pelo responsável em 06/11/2026). O código do **Formulário de Pedido de Colação de Grau** não está versionado neste repositório nesta data; seu comportamento atual, inclusive recebimento e tratamento de anexos, **não foi auditado**. Os itens destinados ao formulário são requisitos para sua futura análise/reformulação, não funcionalidades comprovadamente disponíveis.

| Atividade | Responsabilidade primária |
|---|---|
| Receber do aluno uma nova solicitação de colação e os documentos exigidos | **Formulário de Pedido de Colação de Grau** — fluxo existente a documentar a partir do código que o responsável fornecer |
| Conferir identidade e vínculo entre solicitante, nº USP, pedido e documentos; evitar acesso indevido aos anexos | **Formulário**, no ingresso dos dados, com validações obrigatórias no servidor — contrato a verificar/definir |
| Detectar documentos de solicitações anteriores e oferecer reutilização ou envio de nova versão, sem substituição silenciosa | **Formulário**, como **requisito futuro não implementado/verificado** |
| Tratar cada registro recebido, conferir dados pessoais e histórico, conduzir etapas, administrar anexos, produzir documentos e relatórios, comunicar e concluir a emissão | **Gerenciador de Colação de Grau e Diplomas** — responsabilidade existente |
| Manter o vínculo correto com a pasta institucional do aluno, aplicar controle de acesso e preservar documentos de outras colações | **Gerenciador** em suas próprias operações; o **Formulário** deverá respeitar o mesmo contrato de armazenamento quando for reformulado |

O Gerenciador também possui a função administrativa **`adicionarAluno`** para cadastrar manualmente registros. Isso não o transforma no formulário de solicitação nem transfere a ele a experiência de envio de documentos pelo aluno.

### Comportamento já observado no Gerenciador

- **Pasta compartilhada por aluno:** `garantirPastaAlunoCentral_` procura o nº USP na planilha central `PLANILHA_ALUNOS` e reutiliza o ID de pasta registrado. Se necessário, uma operação autorizada pode criar a pasta na raiz `PASTA_RAIZ_ALUNOS`. Registros de colações diferentes da mesma pessoa podem, portanto, apontar para a mesma pasta.
- **Nomeação de upload administrativo:** `uploadArquivo` monta o nome `<tipo> - <nome do aluno> - <AAAAS>.<extensão>` com o tipo escolhido na interface, o nome do aluno e o código da colação. O nome original enviado não é usado para identificar substituições, exceto pela extensão.
- **Substituição automática atual:** `substituirArquivoComSeguranca_` cria o novo arquivo e move para a lixeira arquivos da pasta cujo **nome completo gerado seja exatamente igual**. Não solicita confirmação. Uma colação diferente, ou uma extensão diferente, normalmente produz outro nome e mantém ambos os arquivos.
- **Consulta de documentos:** a listagem é feita sobre a pasta compartilhada, não sobre uma pasta exclusiva de cada colação; a simples presença de um documento na pasta não comprova que ele foi apresentado/validado para um pedido específico.
- **Exclusão de registros:** existe uma tentativa de preservar pasta usada por outra linha (`outrosRegistrosUsamPasta_`), mas a proteção depende dos vínculos locais registrados. **Não presumir preservação garantida** quando houver outra colação ainda sem ID de pasta sincronizado; esse cenário precisa de teste de integridade antes de se alterar ou eliminar uma pasta compartilhada.

Exemplo fictício: um aluno concluiu Bacharelado em **2025/2** e apresenta novo pedido para Psicólogo em **2026/2**. O mesmo nº USP deve remeter à mesma pasta institucional, sem sobrescrever o processo anterior. Os anexos administrativos `RG - Aluno Fictício - 20252.pdf` e `RG - Aluno Fictício - 20262.pdf` têm nomes diferentes e coexistem; outro upload com o nome exato `RG - Aluno Fictício - 20262.pdf` substituiria o arquivo dessa colação sem pergunta.

### Requisitos a verificar e especificar na reformulação do Formulário

1. Localizar, **no servidor e após validar a identidade do solicitante**, documentos pré-existentes associados ao nº USP e sua proveniência, sem expor links ou dados de outra pessoa.
2. Distinguir claramente **reutilizar documento já existente**, **enviar versão nova** e **enviar documento adicional**, deixando explícita a escolha do aluno e a conferência exigida pela equipe. Não usar apenas igualdade de nomes como evidência de equivalência documental.
3. Preservar rastreabilidade entre cada solicitação (semestre e habilitação), os documentos efetivamente apresentados e as decisões posteriores da equipe; nenhuma reutilização deve alterar retroativamente uma colação já concluída.
4. Não apagar ou substituir silenciosamente anexos necessários a outra colação. Definir versionamento/retenção e tratamento de conflitos com a equipe antes da implementação.
5. Confirmar, ao receber o código atual do formulário, onde estão as entradas, as gravações, os anexos e os contratos com `ID_INDEX`, `PLANILHA_ALUNOS` e `EMISSAO_DIPLOMAS`. **Não pressupor que o formulário atual já reutilize pastas ou arquivos.**

**Decisão de escopo:** a evolução da experiência de solicitação/reutilização de anexos pertence à próxima reformulação do **Formulário de Pedido de Colação de Grau**, em projeto e documentação próprios. Este registro **não autoriza** implementação, alteração de dados, `clasp push` ou deploy do Gerenciador.

## Projetos no Google

| Projeto | Papel |
|---|---|
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · PRODUÇÃO` | autônomo, **projeto final** de produção (recebe a 4.0) |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · HOMOLOGACAO` | autônomo, projeto final de homologação (`AMBIENTE=homologacao`) |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · PRODUÇÃO - Vinculado` | antigo, ligado à planilha de diplomas; fonte da 3.x; sai de uso |
| `GRADIP · Gerenciador de Colação de Grau e Diplomas · HOMOLOGACAO - vinculado` | antigo, ligado à cópia de homologação; sai de uso |

Os IDs dos projetos e o endereço `/exec` ficam fora do Git ([repositório público](../../seguranca/REPOSITORIO_PUBLICO.md)). O endereço de produção vai para o card do [Painel dos servidores](../painel-servidores/MANUAL_OPERACAO.md) pela propriedade `URLS_SISTEMAS_EQUIPE`, chave `EMISSAO_DIPLOMAS`.

## O que mudou na 4.0, em resumo

- **Projeto autônomo.** A planilha de diplomas deixa de ser "a planilha do script" (`getActiveSpreadsheet`) e passa a ser aberta pela chave `EMISSAO_DIPLOMAS` do `ID_INDEX`, nas abas `Diplomas` e `INFOS` (coluna Homologação quando `AMBIENTE=homologacao`). As demais chaves já vinham do `ID_INDEX` na 3.x.
- **Acesso conferido no servidor.** A implantação fica aberta ("qualquer pessoa", executando como a conta do Serviço), e quem decide é a aba `EMISSAO_DIPLOMAS` da planilha `PERMISSOES_DE_ACESSO`: e-mail na coluna C, perfil `LEITOR` ou `ADMINISTRADOR` na coluna E. Toda função pública confere o acesso na primeira linha; quem não está na lista vê só um aviso, sem dados.
- **Perfis** (decisão do responsável, 05/11/2026): o **LEITOR** vê colações, alunos, detalhes, anexos e análises já registradas; tudo que grava na planilha, cria arquivo ou pasta no Drive (certificado, ofício, lista, ZIP, relatórios, inclusive o consolidado), registra análise de histórico, envia e-mail, muda etapa ou exclui é só do **ADMINISTRADOR**. Os testes do módulo de histórico e a migração `migrarAnaliseHistoricoRelatoriosV1` também ficaram só para administrador.
- **Abrir a página** só roda a correção automática de Registro ID/Versão depois da conferência de acesso e só para ADMINISTRADOR (decisão de 05/11/2026; antes rodava para qualquer visitante).
- **Identidade visual GRADIP:** tema Sistema/Claro/Escuro com seletor "Aparência", marcas IPUSP e USP por tema, tokens no lugar das cores fixas (também na análise de histórico e na Central de Ajuda), faixa de homologação e aviso de "Somente consulta".
- **Topo da página:** nome da pessoa na primeira linha e observação na segunda, centralizados, sem "olá" nem "bom dia". Sem observação, só o nome; sem nome, o e-mail.
- **Nome na tela:** "Gerenciador de Colação de Grau e Diplomas", como o projeto no Google (antes "Emissão de Diplomas").
- **Central de Ajuda 1.1:** seção "Acesso e perfis", duas perguntas novas e o item "Lista de acesso" em Segurança.

Nada muda nas regras de etapa, documentos, e-mails, análise de histórico nem na auditoria `ANALISE_HISTORICO`.

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Configuração dos projetos autônomos, envio do código, troca do link no painel e volta atrás. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados, recursos, acesso, auditoria existente e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | O que foi testado, roteiro da homologação e o que falta. |
| [AJUDA.md](AJUDA.md) | O que mudou no texto da Central de Ajuda. |
| [dados-ficticios/](dados-ficticios/README.md) | Lista de acesso fictícia para a homologação. |
| [evidencias/4.0.0/](evidencias/4.0.0/README.md) | Capturas com dados fictícios. |

## Versões

| Versão | Situação | O que mudou |
|---|---|---|
| 3.x (até set/2026) | em uso, projeto vinculado, fora do repositório até 05/11/2026 | Endurecimento, análise de histórico, relatórios, Central de Ajuda 1.0. Importada sem mudanças no commit `35e621e` como linha de base. |
| 4.0.0 (05/11/2026) | homologação parcial e implantação em produção confirmada pelo responsável em 06/11/2026 | Projeto autônomo, acesso pela aba `EMISSAO_DIPLOMAS`, perfis LEITOR/ADMINISTRADOR, tema GRADIP, identificação no topo. [Notas](../../../notas-de-versao/emissao-diplomas-v4.0.md). |
| 4.0.1 (06/11/2026) | em PR, não enviada ao Google | Exclusão preserva a pasta compartilhada do aluno; inclusão manual sem duplicidade e conferida depois de gravar; criação de pasta segura quando outro sistema grava a planilha central ao mesmo tempo. [Revisão](REVISAO_4.0.1.md), [notas](../../../notas-de-versao/emissao-diplomas-v4.0.1.md). |
