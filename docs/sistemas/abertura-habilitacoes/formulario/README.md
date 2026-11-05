# Pedido de Abertura de Habilitação — formulário dos alunos

**Versão no repositório:** 2.0, **homologada em 05/11/2026 e não implantada**. A versão em uso é a 1.0, um Web App próprio que está fora do repositório. O código da 2.0 está em [`sistemas/abertura-habilitacoes/formulario/`](../../../../sistemas/abertura-habilitacoes/formulario/README.md).

## Histórico do sistema

| Fase | O que era | O que ficou |
|---|---|---|
| **Origem histórica** | Um Google Forms. As respostas formaram a aba `Respostas ao formulário 2` (e a aba antiga `2021 - 2022`) da planilha `ABERTURA_HABILITACOES`. | Os títulos das colunas A–J são as perguntas do Forms. Os registros antigos continuam nas mesmas abas, sem migração nem transformação. |
| **Aplicação atual (1.0)** | Um Web App próprio em Apps Script, no projeto `GRADIP · Formulário de Abertura de Habilitações · PRODUÇÃO`. Ele substituiu o Forms na operação e grava na mesma aba, com os mesmos títulos. | Em uso. IDs de planilha no código, fora do repositório. |
| **Modernização (2.0)** | Este código: padrão GRADIP, `ID_INDEX`, homologação, conferência do esquema antes de gravar. | No repositório, à espera de homologação e implantação. |

**Atendimento:** o [Gerenciador de Abertura de Habilitações 2.1](../README.md) lê a mesma aba. O Painel dos servidores conta os pendentes. O formulário não lê nem altera nada do Gerenciador além de preencher, numa linha nova, as colunas que um pedido novo precisa.

**Vínculo com o Forms.** O repositório não sabe se o Forms original ainda está ligado à planilha (Forms → Respostas → planilha). Se estiver ligado e aceitando respostas, ele grava na mesma aba por fora da trava do script. A verificação fica na [homologação](HOMOLOGACAO.md#1-antes-de-começar). Este trabalho não altera nem desliga esse vínculo.

## O que mudou da 1.0 para a 2.0

| Tema | 1.0 (em uso) | 2.0 |
|---|---|---|
| Configuração | IDs das três planilhas no código | `ID_INDEX` (`PLANILHA_ALUNOS`, `ABERTURA_HABILITACOES`, `PERIODOS`) e `ID_INDEX_SPREADSHEET_ID` nas propriedades do script |
| Homologação | não havia | `AMBIENTE=homologacao` lê a coluna `Homologação` do `ID_INDEX`, sem volta para a produção, com faixa na página e `[HOMOLOGAÇÃO]` no assunto |
| Esquema da aba | procurava cada título; **criava a coluna `Situação` no fim** se faltasse | confere A–K (título exato e posição) e títulos repetidos; **recusa** qualquer diferença e não cria, renomeia nem move nada |
| Gravação | `getLastRow() + 1` | `appendRow` sob a trava do script |
| Registro ID e Versão | em branco (o Gerenciador pede "Preparar pedido") | UUID novo e Versão 1, só se as duas colunas já existirem |
| Planilha de alunos | colunas A–D pela posição; falha travava a página | colunas pelo título, login também no `eMail Secundario`; falha não impede o preenchimento manual |
| Pedido repetido | só informava o histórico | pede confirmação quando já há pedido pendente para o mesmo programa |
| Recibo | não havia | recibo "não responder" ao e-mail do login; falha no envio não desfaz o pedido |
| Observações | cortava acima de 2.000 caracteres | recusa com mensagem acima de 2.000 (o mesmo limite do Gerenciador) |
| Erros | mostrava o detalhe técnico do período ao aluno | mensagem genérica; o detalhe fica no registro de execução, sem dados pessoais |
| Implantação | "Executar como: eu" (conta do Serviço de Graduação), acesso de qualquer pessoa da USP | igual; o manifesto passa a declarar isso (`USER_DEPLOYING`, `DOMAIN`) |
| Saudação | não havia | "Bom dia/Boa tarde/Boa noite, <primeiro nome>" no topo, com o nome achado na planilha de alunos; some quando o aluno não está cadastrado ou a página está bloqueada |
| Interface | estilo próprio | tema GRADIP (Sistema/Claro/Escuro), Central de Ajuda, validação no campo, teclado e leitores de tela |

Os itens que eram decisão de lógica foram respondidos pelo responsável em 05/11/2026 e estão em [DECISOES.md](DECISOES.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [COMPATIBILIDADE.md](COMPATIBILIDADE.md) | Esquema gravado, comparação com o Gerenciador 2.1 e o Painel, convivência com os registros antigos e riscos. |
| [DECISOES.md](DECISOES.md) | Decisões de lógica, com o que está implementado e o que depende do responsável. |
| [INSTALACAO.md](INSTALACAO.md) | Configuração, homologação, implantação e volta atrás. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Roteiro de testes no Google e o que os testes locais cobrem. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, acesso e registros. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda. |
| [evidencias/formulario-2.0](../evidencias/formulario-2.0/README.md) | Capturas com dados fictícios. |
| [dados-ficticios](../dados-ficticios/README.md) | CSVs para montar as planilhas de homologação. |
