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
