# Homologação — Gerenciador de Abertura de Habilitações

## Estado

| Versão | Estado | Data |
|---|---|---|
| v2.0 | **EM HOMOLOGAÇÃO · NÃO IMPLANTADO**. Código do merge commit `fe8411a` no projeto de homologação desde 21/10/2026 (conferido idêntico ao Git); itens em andamento no [registro](#registro). | 21/10/2026 |
| v1.0 | Em uso, fora do repositório; nunca homologada por este processo. | — |

No Google, até 21/10/2026: projeto de homologação criado e com o código enviado por `clasp push` (sem implantação); propriedades `ID_INDEX_SPREADSHEET_ID` e `AMBIENTE=homologacao` criadas pelo responsável. O projeto da 1.0 em produção não foi alterado.

## Baseline

A 1.0 recebida em 21/10/2026 (SHA-256 no [inventário](INVENTARIO_LEGADO.md#1-origem-e-integridade)). A equivalência com ela foi conferida em `testar_equivalencia.js`, rodando a cópia sanitizada lado a lado com a 2.0 sobre as mesmas planilhas simuladas.

## Dados de teste

A cópia da planilha de respostas é montada com o [CSV de dados fictícios](dados-ficticios/README.md), que lista os casos e o resultado esperado de cada diagnóstico.

## Pré-requisitos

1. PR revisado por auditoria independente e autorização do responsável para homologar.
2. Ambiente de homologação montado conforme [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md#3-montar-a-homologação-recomendado-antes-de-tudo), com planilha de respostas **fictícia**.
3. Duas contas de teste do domínio institucional (uma ADMINISTRADOR, uma LEITOR) e, se possível, uma terceira fora da lista.
4. Caixa de e-mail de teste como "E-mail USP" das linhas fictícias (os avisos de homologação vão para ela, com `[HOMOLOGAÇÃO]` no assunto).

## Roteiro

Marcar cada item com resultado, data e quem conferiu. Capturas para o repositório só com dados fictícios.

### A. Configuração e acesso

| # | Passo | Esperado |
|---|---|---|
| A1 | `diagnosticarConfiguracao` | `homologacao`; duas chaves `ok`; contagem de perfis certa |
| A2 | Abrir o `/exec` com a conta ADMINISTRADOR | Faixa de homologação; `[HOMOLOGAÇÃO]` no título; Pendentes carregam |
| A3 | Abrir com a conta LEITOR | Faixa "Somente consulta"; ações do detalhe desativadas |
| A4 | Abrir com a conta fora da lista | Página "Sem acesso", sem dados |
| A5 | **Identidade**: com "Executar como: eu" e o acesso que se pretende usar na produção, abrir com uma conta da equipe que não é a dona do projeto | A conta é reconhecida (não aparece "Conta não identificada"). Decide se o acesso `DOMAIN` funciona |
| A6 | Chamar `salvarPedido` pelo console do navegador com a conta LEITOR | Recusado (`SO_LEITURA`), nada gravado |
| A7 | Tirar a conta LEITOR da lista e esperar 1 minuto | Perde o acesso |

### B. Listas e consulta

| # | Passo | Esperado |
|---|---|---|
| B1 | Pendentes | Mesmos pedidos que a 1.0 mostraria; ordem alfabética; linha sem ID marcada |
| B2 | Busca por nome com e sem acento, por Nº USP | Filtra igual |
| B3 | Concluídos | 10 mais recentes, com a situação do aviso |
| B4 | Busca no histórico (nome que existe nas duas abas) | Resultados das duas abas, mais novo primeiro; os de 2021–2022 sem ação |
| B5 | Relatórios | Totais iguais aos contados à mão na cópia |

### C. Salvar e avisar

| # | Passo | Esperado |
|---|---|---|
| C1 | Só observações (desmarcar as duas opções num pendente) | J gravada; K = `pendente`; Versão +1 |
| C2 | Concluir sem avisar | K = `Concluído`; Data de Conclusão; nenhum e-mail |
| C3 | Concluir e avisar | Confirmação; e-mail com `[HOMOLOGAÇÃO] Abertura de Habilitação`, texto da 1.0; `E-mail Enviado` com data |
| C4 | Avisar de novo o mesmo pedido | Pede confirmação de reenvio; sem confirmar, nada gravado |
| C5 | Reabrir | Confirmação; K = `pendente`; Data de Conclusão anterior mantida |
| C6 | Duas janelas no mesmo pedido; salvar nas duas | A segunda recebe conflito, mantém o texto e recarrega |
| C7 | Pedido com e-mail vazio | Opção de aviso desativada |
| C8 | Colar mais de 2.000 caracteres nas observações; e, pelo console, chamar `salvarPedido` com texto maior | O campo para em 2.000; o servidor recusa o texto maior com mensagem, nada gravado |
| C9 | Pedido sem identificador → **Preparar pedido** | Só aquela linha recebe ID e Versão 1; passa a abrir |
| C10 | Avisar um pedido e, enquanto o e-mail sai, escrever um texto na célula `E-mail Enviado` dessa linha na planilha (difícil de cronometrar; se não der, registrar "não executado") | E-mail chega uma vez; mensagem "e-mail enviado… data não registrada"; a célula fica com o texto escrito; Versão não sobe de novo |
| C11 | Linha fictícia com Versão `0` e outra com `abc` | Marcadas "Versão inválida"; não abrem; nada gravado ao listar |

### D. Migração na cópia

| # | Passo | Esperado |
|---|---|---|
| D1 | `diagnosticarMigracaoRegistroId` | Contagens batem com as linhas fictícias preparadas (sem ID, repetido, versão vazia, versão malformada); dois diagnósticos seguidos dão o mesmo código |
| D2 | `executarMigracaoRegistroId` sem a propriedade | Recusa, nada gravado |
| D3 | Com a propriedade e uma linha nova acrescentada depois do diagnóstico | Recusa (plano mudou), nada gravado |
| D4 | Com o código atual | Só as colunas Registro ID e Versão mudam (comparar com a cópia de segurança); propriedade apagada |
| D5 | Rodar de novo | "Nada a fazer" |
| D6 | Conferir a aba `2021 - 2022` | Nenhuma célula alterada (histórico de versões) |
| D7 | Diagnosticar, trocar de lugar duas linhas fictícias (mesmas contagens) e executar | Recusa, nada gravado; novo diagnóstico dá outro código |
| D8 | Versões malformadas depois da migração | Continuam como estavam; `versaoMalformada` informa as linhas |
| D9 | Recuperação: `RECUPERACAO_REGISTRO` = linha com ID fora do formato → diagnosticar → código → executar | Só o Registro ID daquela linha muda; propriedade apagada; pedido abre |
| D10 | Recuperação de um ID repetido escolhendo a **segunda** linha do grupo | Só ela recebe ID novo; a primeira mantém o ID |
| D11 | Recuperação com a linha editada depois do diagnóstico | Recusa, nada gravado |
| D12 | Recuperação de Versão `0` | Versão passa a 1; ID mantido |
| D13 | Ensaio da volta à 1.0 num projeto de homologação com a 1.0 sanitizada apontando para a cópia (opcional) | Com as condições de [INSTALACAO_E_ATUALIZACAO.md §5](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás) cumpridas, a primeira visita não altera nada no histórico de versões |

### E. Página

| # | Passo | Esperado |
|---|---|---|
| E1 | Tema claro e escuro; menu lateral e abas; celular | Como nas [capturas](evidencias/2.0/README.md) |
| E2 | Teclado: Tab, Enter, Esc, setas nas abas | Foco visível, diálogo preso, foco devolvido |
| E3 | Central de Ajuda: busca, FAQ, ajuda por cima do detalhe | Funciona |
| E4 | Registro de execução depois do roteiro | Sem nomes, e-mails ou Nº USP |

### F. Painel dos servidores (só observação)

| # | Passo | Esperado |
|---|---|---|
| F1 | Comparar a contagem de pendências do painel (se houver cópia do painel em homologação) com a do gerenciador | Diferença explicada pelo [contrato](REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas); registrar números |

## Critério para recomendar a implantação

Todos os itens de A a E conferidos sem falha; A5 decidido; decisões da [lista](VERSOES_E_DECISOES.md#decisões-pendentes) que afetam a produção (acesso, lista de perfis, quando migrar) tomadas pelo responsável. A implantação em produção é etapa separada, com autorização própria.

## Registro

| Data | Quem | Itens | Resultado | Observações |
|---|---|---|---|---|
| 21/10/2026 | responsável | A1 | **ok** | `homologacao`; `ABERTURA_HABILITACOES` abre a cópia de teste; `PERMISSOES_DE_ACESSO` abre a planilha de permissões **real** (decisão do responsável: o gerenciador só lê essa planilha), aba `GERENCIADOR_HABILITACOES` com 1 administrador e 1 leitor. Antes da produção, deixar nela só quem deve ter acesso. |
| 21/10/2026 | responsável | estrutura (`diagnosticarPlanilha`) | **ok, com achados** | Nenhuma coluna obrigatória ausente; nenhuma reserva de envio. A ordem real difere da documentada até então: há uma coluna C sem uso, Nº USP em D, programa em I, e J é a pergunta "Comentários, sugestões, elogios ou críticas." do formulário, usada como Observações (como na 1.0). [Modelo de dados](MODELO_DE_DADOS.md) corrigido. |
| 21/10/2026 | responsável | dados | **corrigido** | A primeira cópia nasceu com todos os pedidos reais (473 linhas, todas concluídas); foi limpa antes de qualquer gravação. Nada foi gravado nem enviado. Na leitura dessa cópia, as linhas 190, 191 e 192 tinham Versão malformada e nenhuma outra precisava de migração: provavelmente o mesmo vale para a produção, e esses três pedidos exigirão a [recuperação](MANUAL_OPERACAO.md) antes ou depois da implantação. |
