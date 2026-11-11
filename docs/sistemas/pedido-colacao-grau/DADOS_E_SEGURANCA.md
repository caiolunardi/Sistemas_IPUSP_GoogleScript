# Dados e segurança — Formulário de Pedido de Colação de Grau (legado)

**Fonte:** arquivos entregues pelo responsável em 06/11/2026; inspeção estática, sem acesso aos recursos reais. Política: [modelo de segurança](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md), [repositório público](../../seguranca/REPOSITORIO_PUBLICO.md). **Revisão de segurança necessária antes de publicar fonte sanitizada ou modernizar o Web App.** Este documento expõe a classificação dos riscos, sem chaves ou detalhes operacionais de acesso indevido.

## 1. Escopo e identidade

- Aplicativo: Formulário de Pedido de Colação de Grau, Web App independente para alunos.
- Público: solicitante com e-mail `@usp.br`; não é o painel de equipe e não reutiliza suas funções privadas.
- A identidade provém de `Session.getActiveUser().getEmail()`. `doGet` e `enviarPedidoColacao` conferem domínio `@usp.br`; `obterDadosIniciais` utiliza a sessão sem a mesma checagem explícita.
- O cabeçalho do legado instrui publicar o Web App **executando como o próprio usuário que acessa**, e conceder a esse usuário **edição** nas planilhas de cadastro, período e diplomas. **Esta é apenas a configuração prescrita no código, não foi inspecionada no projeto Google; não adotá-la como recomendação para a nova versão.**
- A posse da conta, o nº USP informado e a propriedade sobre cada pedido/anexo precisam de **vínculo obrigatório e verificável no servidor**.

## 2. Dados tratados

| Categoria | Conteúdo | Origem | Destino/uso | Classe |
| --- | --- | --- | --- | --- |
| Identidade | e-mail institucional, nº USP, nome e ano de ingresso | sessão, cadastro central, formulário | planilha central e Diplomas | Pessoal |
| Documento civil | RG/CIN, número, certidão de nascimento digitalizada | aluno | Drive institucional + referência indireta pela pasta | **Pessoal/restrito** |
| Solicitação acadêmica | habilitações concluídas/pendentes, semestre, continuidade de matrícula | aluno, período | aba `Diplomas` | Pessoal/restrito |
| Contato e representação | celular, e-mail alternativo, informação de procuração e identificação de procurador | aluno | planilhas e tela | Pessoal |
| Situação particular | antecipação de colação e observações livres | aluno | planilha de Diplomas | Pessoal/restrito |
| Identificação técnica | UUID de `Registro ID`, `Versão`, ID da pasta | servidor/Drive | planilhas | Interna |
| Experiência da interface | nome de arquivo selecionado, tela de erro e confirmação | navegador/servidor | navegador | Pode conter dado pessoal |

Retenção, descarte, base legal, custódia de documentos civis e acesso a pastas: **A VALIDAR INSTITUCIONALMENTE**.

## 3. Recursos e configuração

| Chave lógica pretendida no `ID_INDEX` | Recurso atual identificado no código | Acesso funcional |
| --- | --- | --- |
| `PLANILHA_ALUNOS` | planilha central, aba `Página1` | leitura e escrita |
| `PERIODOS` | primeira aba da planilha de períodos | leitura |
| `EMISSAO_DIPLOMAS` | planilha de Diplomas, aba `Diplomas` | leitura e escrita |
| `PASTA_RAIZ_ALUNOS` | raiz Drive dos alunos | leitura, criação de pasta e arquivos |

No legado **os identificadores estão literais no backend**, e o HTML possui uma URL de navegação escrita diretamente. Na próxima versão, abstrair conforme `ID_INDEX`/Script Properties e isolar `AMBIENTE=homologacao`. Não reproduzir os valores no Git nem em relatório.

## 4. Riscos e medidas necessárias

| ID | Gravidade | Situação no código recebido | Condição para evolução |
| --- | --- | --- | --- |
| SEG-01 | **CRÍTICA** | Configuração descrita no código pressupõe edição direta de recursos acadêmicos por contas de alunos | Projeto de submissão não deve exigir permissão direta dos alunos aos arquivos institucionais; autorização server-side e privilégios mínimos, com verificação real do Google |
| SEG-02 | **CRÍTICA** | Vínculo de identidade autenticada com nº USP informado e titularidade do registro requer correção/ensaios negativos; a simples validação de domínio é insuficiente | Negar gravação e consulta quando não for possível comprovar titularidade; revisar todos os endpoints |
| SEG-03 | **ALTA** | Anexos de uma colação podem ser substituídos por envio de outro período, sem registro completo de versão/proveniência | Versionamento por pedido e confirmação explícita; sem exclusão silenciosa |
| SEG-04 | **ALTA** | Gravações em cadastro, Drive e Diplomas são separadas, sem rollback; lock não coordena projetos distintos | Preflight/consistência e estratégia de recuperação e concorrência |
| SEG-05 | **ALTA** | Upload usa lista de extensões proibidas e MIME enviado pelo navegador; não comprova tipo real/conteúdo | Política de tipos permitidos, limites e validação de conteúdo, tratamento de arquivos perigosos |
| SEG-06 | **ALTA** | Criação automática de colunas por cabeçalho e alterações em pedido pré-existente não têm gate formal de esquema/estado | Esquema conferido sem autoalteração indevida; transições de estado protegidas |
| SEG-07 | **MÉDIA** | Não há auditoria abrangente do pedido no material; falhas entre duas gravações podem resultar em estado parcial | Registro mínimo de evento, correlação e recuperação, sem dados pessoais em logs |
| SEG-08 | **MÉDIA** | Fonte entregue não traz manifesto, testes ou isolamento de homologação | Implementar e validar antes de qualquer publicação do código |

**Confidencialidade:** achados de segurança detalhados, especialmente reproduções que possibilitem manipulação de dados de terceiros, devem ser tratados em canal restrito, não como passos de exploração em PR/issue públicos. O arquivo bruto não deve ser versionado.

## 5. Ações não cobertas pelo formulário

Não inclui gestão de perfis administrativos, criação de certificados, emissão de ofícios e diplomas, análise curricular, envio de e-mails institucionais ou auditoria administrativa. Essas funções pertencem ao [Gerenciador](../emissao-diplomas/README.md), com política própria.

## 6. Logs e testes

Não encontrei `Logger.log` explícito no backend fornecido. Isso não demonstra ausência de logs automáticos de execução/erros na plataforma. Não incluir payloads inteiros, nº USP, nome, RG, documentos ou e-mails pessoais em logs. Nenhuma suíte foi executada nesta rodada. Testes necessários estão em [HOMOLOGACAO.md](HOMOLOGACAO.md).

## 7. Versão 2.0 (em PR, não implantada)

Fonte em `sistemas/pedido-colacao-grau/src/`; fluxo em [RECEBIMENTO_2_0.md](RECEBIMENTO_2_0.md). Situação dos riscos da seção 4 **no código da 2.0** (a homologação no Google ainda vai confirmar):

| ID | Medida na 2.0 | Teste automático |
| --- | --- | --- |
| SEG-01 | "Executar como: eu", acesso de domínio; aluno não precisa de acesso a planilha nem pasta. Só fecha de fato quando a edição dos alunos for retirada das planilhas, na virada | simulação sem compartilhamento; T-AUT-06 fica para a homologação (H) |
| SEG-02 | sessão conferida em toda função pública; nome e nº USP do cadastro quando confirmado; inconsistência vira PENDENTE sem revelar o motivo; protocolo, chave de envio e "Meus pedidos" só da própria conta | T-AUT-01 a 05 |
| SEG-03 | correção é versão nova; documento antigo nunca vai para a lixeira nem é renomeado | T-DUP-02, T-DUP-03, T-DOC-03 |
| SEG-04 | um escritor por recurso: o formulário só grava em `PEDIDOS_COLACAO` e na entrada; ordem de gravação com retomada pela chave | T-CON-01, T-REC-01, escritor único |
| SEG-05 | lista positiva pelo conteúdo (PDF, JPEG, PNG), 10 MB, 5 arquivos, SHA-256 | T-DOC-06 |
| SEG-06 | não cria coluna; título faltando é falha fechada; correção só com D3 | T-REC-02, D3 |
| SEG-07 | aba `EVENTOS` (sem valores) e diagnóstico de pedidos parados; registros de execução sem nome, nº USP, e-mail, RG ou IDs | T-REC-01, T-REC-03 |
| SEG-08 | manifesto, `.claspignore`, testes e `AMBIENTE` versionados | CI |

**Dados novos tratados:** "Motivo do cadastro" (interno, nunca mostrado ao aluno; o motivo de **rejeição** de `DECISOES_CADASTRO`, ao contrário, é escrito pela equipe para o aluno e aparece só para a própria conta, como texto, até 300 caracteres), chave de envio, hash SHA-256 dos arquivos e o JSON de cada versão, todos em `PEDIDOS_COLACAO` (acesso restrito). O recibo vai só para o e-mail da sessão, sem RG nem anexos. Retenção dos pedidos rejeitados e dos documentos da entrada: sem exclusão automática (D12); prazo **A VALIDAR INSTITUCIONALMENTE**.

**Limite conhecido:** funções do responsável (`diagnosticarConfiguracao`, `prepararPlanilhaPedidosColacao`) recusam quando o e-mail da sessão difere do usuário efetivo. Pela página, com "Executar como: eu", só a própria conta institucional passa nessa conferência.
