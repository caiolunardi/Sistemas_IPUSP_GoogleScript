# Contrato entre Formulário e Gerenciador de Colação de Grau

**Decisão funcional do responsável (06/11/2026):** separar o aplicativo voltado ao aluno do Gerenciador interno. A descoberta de documentos de solicitações anteriores, a escolha de reutilização/atualização e o consentimento explícito do aluno pertencem à **futura reformulação do Formulário**. Este documento **não implementa** esse fluxo. O registro complementar da responsabilidade do Gerenciador está no [PR #43](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/43), ainda sujeito ao seu próprio merge.

## 1. Proprietário de cada responsabilidade

| Capacidade | Formulário (aluno) | Gerenciador (equipe) |
| --- | --- | --- |
| Abertura por período acadêmico configurado | Consulta `PERIODOS` e recusa pedido fora da janela | Não controla a tela pública de solicitação |
| Autenticação da solicitação | Confere identidade e titularidade de pedido/anexos no servidor | Confere perfis da equipe nas funções administrativas |
| Novo pedido | Coleta dados e documentos, registra na planilha compartilhada | Lê e processa a linha resultante |
| Correção pelo próprio aluno | Oferece edição do **mesmo pedido/colação**, sem sobrepor terceiros nem decisões administrativas | Revisa dados e administra o estado do processo |
| Pasta institucional | Localiza/associa a pasta correta por nº USP, sem romper vínculo compartilhado | Organiza documentos e pastas de sua competência |
| Reutilização de anexos antigos | **REQUISITO FUTURO:** verificar origem, mostrar escolhas e persistir vínculo por solicitação | Consulta prova apresentada e confirma se atende à etapa |
| Versões, substituições e histórico documental | **REQUISITO FUTURO:** registrar escolha e preservar versões/documentos de outras colações | Não eliminar anexos usados por outro pedido; preservar rastreabilidade |
| Histórico, análise curricular, certificado, ofício, lista e e-mails administrativos | Fora do escopo | Responsabilidade da equipe |
| Auditoria de decisões administrativas | Não cria decisões de conferência | Responsabilidade do Gerenciador; lacunas de auditoria continuam separadas |

### 1.1. Regra para solicitante sem cadastro confirmado (decisão do responsável)

**A ausência de cadastro aprovado não bloqueia o protocolo do pedido.** O formulário deverá aceitar a solicitação de quem conseguiu se autenticar e cumprir as validações aplicáveis, preservando identificador de protocolo e data/hora originais. Quando a correspondência entre conta, nº USP e pessoa não for confirmada, a solicitação fica **provisória/pendente de validação cadastral**, em armazenamento segregado e com acesso restrito; não se cria automaticamente uma linha definitiva em `PLANILHA_ALUNOS`, não se vincula a uma pasta de estudante ainda não autenticado como titular e não se lança pedido definitivo em `EMISSAO_DIPLOMAS` antes da conferência. O Gerenciador de Pessoas deverá oferecer à equipe uma fila de conferência e decisão; somente após confirmação da identidade/titularidade o vínculo definitivo e o encaminhamento ao Gerenciador de Diplomas poderão ocorrer. **Protocolado ≠ cadastro aprovado ≠ colação deferida.**

**Status:** regra de negócio **aprovada em 06/11/2026**, ainda **não implementada**. A opção de persistência, comprovante, notificação interna, prazo de tratamento, privacidade, prevenção de duplicações e tratamento de reprovação é **desenho futuro**, não decisão técnica congelada. A versão do Gerenciador de Pessoas observada no Git apenas busca e edita fichas existentes; a fila de novos cadastros requer evolução própria e autorização separada.

## 2. Contrato de dados do legado (verificado no código)

- **Solicitação:** identificada no formulário por `nº USP + AAAAS`, onde `AAAAS` é derivado de `PERIODOS.M`; se já existe, o formulário atualiza a primeira linha correspondente, mantém `Registro ID` e incrementa `Versão`. Cada nova colação deve ser uma solicitação independente.
- **Pasta:** uma pasta por nº USP na planilha central `PLANILHA_ALUNOS` (coluna E), reutilizável por outros sistemas. Pasta não é sinônimo de pedido.
- **Arquivos do formulário:** nomes `<nome> - <nº USP> - RG<ext>` e `<nome> - <nº USP> - Certidão de Nascimento<ext>`; **não** possuem código de colação, de modo que um envio pode substituir arquivos de outro semestre.
- **Arquivos do Gerenciador:** convenção distinta, com tipo, nome e código da colação. Não normalizar nomes retroativamente sem decisão e plano de migração.
- **Chaves lógicas pretendidas:** `PLANILHA_ALUNOS`, `PERIODOS`, `EMISSAO_DIPLOMAS`, `PASTA_RAIZ_ALUNOS`. O formulário **ainda não usa `ID_INDEX`**; os identificadores operacionais literais foram omitidos desta documentação.

## 3. Exemplo acadêmico (dados fictícios)

Pedido de Bacharelado em **2025/2** seguido de novo pedido de Formação de Psicólogo(a) em **2026/2**. Os dois registros devem ter `Colação` diferentes, podendo compartilhar a mesma pasta institucional. O legado **não isola** os documentos por colação: se os arquivos finais tiverem o mesmo nome, o segundo envio manda o arquivo anterior à lixeira.

**Comportamento desejado na reformulação (não existente):**
1. Identificar o solicitante de forma segura e recuperar documentos da própria pessoa com sua procedência, sem ampliar acesso ao Drive.
2. Mostrar quais anexos anteriores podem ser considerados e oferecer, separadamente por tipo, `Reutilizar anterior`, `Enviar atualizado` ou `Adicionar documento`.
3. Conservar a referência aos documentos efetivamente apresentados em cada solicitação (identificador estável, colação, tipo, origem, versão e data). **Reutilizar não duplica nem altera retroativamente o processo de origem**.
4. A substituição nunca apaga silenciosamente um documento necessário a solicitação anterior. A política de versionamento/retenção e permissões de visualização precisa de decisão institucional.
5. O Gerenciador deve ser capaz de distinguir documento **enviado**, **reutilizado**, **substituído** e **conferido pela equipe**; o formulário não atesta validade jurídica ou acadêmica de um documento.
6. Usar fluxo preparado para falhas e concorrência entre projetos; não presumir `ScriptLock` global.

## 4. Gates para mudar o contrato

Não alterar a planilha de Diplomas, nomenclatura de anexos, `Registro ID`, versões, status ou vínculos do Drive até existir: (a) diagnóstico dos dados reais sob ambiente autorizado, (b) desenho do esquema e transição compatível com o Gerenciador 4.0, (c) testes sintéticos e negativos, (d) homologação isolada, (e) revisão técnica independente e (f) autorização humana de implantação. Não interpretar este documento como autorização de desenvolvimento, deploy ou migração.

## 5. Contrato da versão 2.0 (escritor único)

Na 2.0 o formulário **não grava** na aba `Diplomas` nem na planilha central. O que ele entrega, para o encaminhador do Gerenciador de Diplomas (PR 4) e para a fila do Gerenciador de Pessoas (PR 5), está em [MODELO_DE_DADOS.md, seção F](MODELO_DE_DADOS.md#f-planilha-pedidos_colacao-formulário-20):

- pedido elegível para encaminhar: `PROTOCOLOS.Recebimento = RECEBIDO` e cadastro `CONFIRMADO` (ou `APROVADO` em `DECISOES_CADASTRO`);
- versão a aplicar: a maior `VERSOES.Versão` com `Situação = RECEBIDO`; os dados vêm do JSON com as chaves do legado;
- `Registro ID` já gerado no protocolo, para a inclusão idempotente;
- documentos da versão em `DOCUMENTOS` (`ID do arquivo`), todos na subpasta do protocolo; o encaminhador move com `moveTo` (mesmo ID).

O formulário lê a aba `Diplomas` só para a regra D3 (correção enquanto "Status — Dados Pessoais" estiver vazio na linha do `Registro ID`).
