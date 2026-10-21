# Manual de operação — Gerenciador de Abertura de Habilitações 2.0

Para a equipe (uso diário) e para quem administra (diagnósticos, migração, recuperação). A versão 2.0 **não está implantada**; este manual vale a partir da implantação. Passo a passo de cada tela: [Central de Ajuda](AJUDA.md).

## 1. Uso diário (equipe)

1. Abrir o gerenciador com a conta `@usp.br` (de preferência numa janela só com ela).
2. Em **Pendentes**, clicar no aluno.
3. Conferir os dados; escrever observações, se houver.
4. Escolher: **Concluir solicitação** e/ou **Avisar aluno por e-mail** (independentes).
5. **Salvar** e confirmar. Esperar o aviso "Pedido salvo" antes de fechar a página.

Situações comuns e o que fazer:

| Mensagem | O que fazer |
|---|---|
| "Este pedido foi alterado em outra sessão…" | **Recarregar pedido**, juntar as observações, salvar de novo. |
| "Outra gravação está em andamento…" | Esperar alguns segundos e salvar de novo. |
| "Esse aluno já foi avisado…" | Confirmar só se quiser mesmo um segundo e-mail. |
| "Um envio anterior… foi interrompido" | Antes de confirmar, se possível, perguntar ao aluno se recebeu. |
| "O pedido foi salvo, mas o e-mail não pôde ser enviado" | Tentar de novo mais tarde; se repetir no mesmo dia, pode ser a cota diária de e-mails da conta. |
| "O e-mail foi enviado, mas não foi possível registrar a data…" | **Não reenviar.** Avisar o responsável. |
| Pedido "Sem identificador" | ADMINISTRADOR: **Preparar pedido**. LEITOR: avisar quem administra. |
| "Identificador repetido/inválido" | Avisar o responsável (seção 4). |
| "Não foi possível conferir o seu acesso" | Tentar em alguns minutos; se continuar, avisar o responsável (seção 3). |

Evite editar a planilha diretamente enquanto alguém usa o gerenciador: a trava do sistema não protege edições manuais.

## 2. Lista de acesso (responsável)

Planilha `PERMISSOES_DE_ACESSO` (pelo `ID_INDEX`), aba `GERENCIADOR_HABILITACOES`: uma linha por pessoa, e-mail completo na coluna C, `LEITOR` ou `ADMINISTRADOR` na coluna E. Mudanças valem em até 1 minuto. Para tirar alguém, apague a linha ou o perfil. Não use coringas nem grupos (são ignorados). Revise a lista quando alguém entrar ou sair da equipe.

## 3. Diagnósticos (editor do Apps Script)

Abrir o projeto, escolher a função na barra e **Executar**; o resultado sai no registro de execução. Nenhum diagnóstico grava na planilha.

| Função | Para quê | Quem pode |
|---|---|---|
| `diagnosticarConfiguracao` | Ambiente, chaves do `ID_INDEX` (nome da planilha, nunca o ID), contagem da lista de acesso. Limpa os caches. | ADMINISTRADOR ou a conta dona do projeto |
| `diagnosticarPlanilha` | Colunas encontradas, títulos de J e K, pendentes/concluídos, valores de situação, reservas de envio, resumo da migração. | ADMINISTRADOR |
| `diagnosticarMigracaoRegistroId` | Simulação da migração e código de confirmação. | ADMINISTRADOR |

Leitura rápida do `diagnosticarConfiguracao`:

- `ambiente: "FALHA: …"` → valor errado em `AMBIENTE`;
- `"FALHA: … não foi encontrada"` → chave ausente no `ID_INDEX`; `"aparece mais de uma vez"` → linha repetida; `"sem ID de Produção/Homologação"` → célula vazia;
- `acesso: "FALHA: … não tem a aba GERENCIADOR_HABILITACOES"` → criar a aba.

## 4. Migração controlada de Registro ID e Versão

Serve para dar identificador a todos os pedidos de uma vez (por exemplo, na primeira implantação, ou depois de muitas linhas novas) e para corrigir identificadores repetidos. **Não rodar na produção sem autorização expressa do responsável.** Ensaiar antes na cópia de homologação.

1. **Simular**: rodar `diagnosticarMigracaoRegistroId`. Conferir no registro:
   - `colunasFaltando`: títulos que serão criados no fim da linha 1;
   - `semIdentificador`, `identificadoresRepetidos`, `versaoInvalida`: quantas linhas mudam, com os números de linha (até 50 de cada);
   - `identificadoresForaDoFormato`: só informados; **não** são trocados (conferir à mão);
   - `codigoConfirmacao`, por exemplo `MIGRAR-3-1-3-0-120`.
   Se `precisaMigrar` for `false`, parar: não há nada a fazer.
2. **Cópia de segurança**: Arquivo → Fazer uma cópia da planilha de respostas, numa pasta restrita; anotar data e hora.
3. **Confirmar**: Configurações do projeto → Propriedades do script → adicionar `MIGRACAO_REGISTRO_ID_CONFIRMACAO` com o código exato.
4. **Executar**: rodar `executarMigracaoRegistroId`. Ele refaz a simulação dentro da trava; se a planilha mudou desde o passo 1 (um pedido novo chegou, por exemplo), o código não bate e **nada é gravado**: voltar ao passo 1. Se bater, grava só as colunas Registro ID e Versão e apaga a propriedade.
5. **Conferir**: rodar `diagnosticarMigracaoRegistroId` de novo (deve dar `precisaMigrar: false`) e abrir o gerenciador.

Regras aplicadas (as mesmas da 1.0): só linhas com Nome; ID vazio recebe um novo; em IDs repetidos, a primeira linha fica com o ID e as seguintes recebem novos; Versão vazia ou não numérica vira 1. A aba `2021 - 2022` não é tocada. Rodar de novo não muda nada.

Desfazer: restaurar a planilha pelo histórico de versões (Arquivo → Histórico de versões) para o momento anterior ao passo 4, ou copiar de volta as duas colunas da cópia de segurança.

## 5. Cópia de segurança e restauração

- Antes de qualquer migração, implantação ou mudança de estrutura (Forms, colunas): Arquivo → Fazer uma cópia, numa pasta restrita (a cópia tem dados pessoais).
- O histórico de versões da planilha guarda as alterações; para restaurar uma célula ou uma linha, prefira copiar do histórico em vez de restaurar a planilha inteira (que desfaz também o que outras pessoas fizeram depois).
- Apagar as cópias quando não forem mais necessárias. Prazo de guarda: A VALIDAR INSTITUCIONALMENTE.

## 6. Voltar à 1.0

Ver [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás).

## 7. Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| "A coluna J (Observações)/K (Situação) está ocupada por…" | Uma pergunta foi acrescentada ou movida no Forms e as colunas andaram. | Não usar o gerenciador. Restaurar as colunas para J e K (mover a coluna nova para o fim da planilha), conferir com `diagnosticarPlanilha`. |
| "Não encontrei a coluna …" | Pergunta do Forms renomeada; título da linha 1 mudou. | Voltar o título ao texto exato (ver [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md)) ou mudar `CABECALHOS` em `Planilha.gs` num PR. |
| "A aba … tem título repetido" | Duas colunas com o mesmo título. | Renomear ou remover a duplicada. |
| Pendentes no gerenciador ≠ número do Painel dos servidores | Critérios diferentes: o painel só conta K = `pendente` ([contrato](REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas)). | Esperado enquanto houver pedidos com K vazia. Decisão pendente. |
| Pedidos novos sempre "Sem identificador" | Não há gatilho que atribua ID às respostas novas (a 1.0 atribuía ao abrir a página). | **Preparar pedido** um a um, ou a migração (seção 4). |
| Ninguém consegue entrar | Lista de acesso ilegível, propriedade ou chave faltando. | `diagnosticarConfiguracao`. |
| "Conta não identificada" para uma pessoa da equipe | Conta de outro domínio, ou várias contas no navegador. | Janela só com a conta `@usp.br`. |
| E-mails falhando o dia todo | Cota diária de e-mails da conta que implantou. | Esperar o dia seguinte; avisar alunos por outro canal se for urgente. |
| Reserva de envio presa | Execução interrompida durante o envio. | Depois de 10 minutos, o gerenciador pede confirmação para reenviar; confirme com o aluno se recebeu. |
