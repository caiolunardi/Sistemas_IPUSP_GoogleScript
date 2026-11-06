# Homologação — Formulário de Pedido de Colação de Grau

**Estado em 06/11/2026:** **NAO_EXECUTADA/NAO_VERIFICADA** nesta documentação. O responsável forneceu dois arquivos de código; não forneceu saída de testes, manifesto, código do editor comparado por hash, projeto de homologação, versão de implantação ou evidências de navegação para este formulário. **Não declarar o legado homologado nem a reformulação pronta.**

## Antes de testar

1. Sanitizar o código, eliminar todos os IDs/URLs internos literais, migrar dependências para `ID_INDEX`/Script Properties e submeter a revisão de segurança.
2. Definir o novo modelo de execução: **não conceder a alunos edição direta de recursos institucionais** como solução de permissão.
3. Isolar um projeto HOMOLOGAÇÃO e recursos sintéticos, incluindo `PLANILHA_ALUNOS`, `PERIODOS`, `EMISSAO_DIPLOMAS` e `PASTA_RAIZ_ALUNOS`, todos sem dados reais.
4. Conferir contratos de colunas e o Gerenciador 4.0 antes de qualquer gravação. Definir recuperação e diferença entre deploy do editor e `/exec`.
5. Criar testes automatizados e `dados-ficticios/` com casos escritos manualmente; **não derivar fixtures de alunos reais**.

## Matriz de testes propostos (não executados)

| ID | Cenário | Resultado exigido |
| --- | --- | --- |
| F01 | Sem conta/e-mail não USP | Recusa sem revelar cadastros ou anexos |
| F02 | Conta USP legítima sem cadastro | Pré-preenchimento vazio; entrada segura e cadastro coerente se autorizado |
| F03 | Nº USP e e-mail com vinculação inconsistente | Recusa antes de criar pasta, enviar arquivo ou alterar registro |
| F04 | Pessoa sem titularidade de um pedido anterior | Nem consultar nem alterar pedido/anexos da outra pessoa |
| F05 | Período fechado, não configurado ou semestre inválido | Nenhuma gravação; explicação compreensível |
| F06 | Semestre `AAAA/S`, fuso e bordas de abertura/fechamento | Código `AAAAS` correto, sem regressão na janela |
| F07 | Novo pedido válido | Um Registro ID, Versão 1, cabeçalhos conforme contrato e arquivos associados corretamente |
| F08 | Reenvio do mesmo pedido | Mesma identidade de registro, versão controlada, sem duplicação de linha |
| F09 | Pedido de outra colação do mesmo nº USP | Outra linha; preservação integral dos anexos/histórico anteriores |
| F10 | Arquivos inválidos, manipulados, vazios, excessivos ou incompatíveis com MIME | Bloqueio ou tratamento explícito, sem estado parcial |
| F11 | Falha entre cadastro, arquivo e pedido | Recuperação verificável ou ausência de efeito parcial |
| F12 | Dois envios concorrentes e concorrência com Gerenciador | Sem perda de dados, troca de titularidade ou sobrescrita silenciosa |
| F13 | Correção de habilitações e etapas já tratadas | Não deixar anos obsoletos nem desfazer decisões da equipe |
| F14 | Link/Drive/permissões do usuário | Não exigir edição direta de planilhas por aluno |
| F15 | Tema, ajuda, contraste, teclado e telas móveis | Padrão GRADIP integral, acessível |
| F16 | Testes de integração do formulário com Gerenciador 4.0 | Respostas, anexos e status lidos sem alteração indevida |
| F17 | Dados da sessão e saída de erros/logs | Nenhum dado pessoal exposto indevidamente |
| F18 | Contas de teste sem registros e contas duplicadas no cadastro | Comportamento determinístico, sem apropriação de registro |

**Gate:** implementação em PR próprio, CI verde no último commit, revisão adversarial de classe crítica, homologação Google isolada e aceite humano explícito. Nenhum teste acima deve ser marcado OK até haver evidência.

## Registro desta rodada documental

- Fonte: somente os dois anexos fornecidos.
- Técnicas: leitura estática e confronto pontual com código versionado do Gerenciador 4.0/Painel.
- Testes: **0 executados**.
- Google: **nenhum `clasp`, alteração de arquivo, Script Property, planilha, Drive ou implantação executado**.
