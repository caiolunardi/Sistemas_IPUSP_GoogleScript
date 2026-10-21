# Homologação — Gerenciador de Abertura de Habilitações

## Estado

| Versão | Estado | Data |
|---|---|---|
| v2.0 | **NÃO HOMOLOGADO · NÃO IMPLANTADO**. Só testes locais com dados sintéticos ([TESTES.md](TESTES.md)). | 21/10/2026 |
| v1.0 | Em uso, fora do repositório; nunca homologada por este processo. | — |

Nada foi feito no Google: nenhum projeto, propriedade, aba, gatilho, implantação ou e-mail.

## Baseline

A 1.0 recebida em 21/10/2026 (SHA-256 no [inventário](INVENTARIO_LEGADO.md#1-origem-e-integridade)). A equivalência com ela foi conferida em `testar_equivalencia.js`, rodando a cópia sanitizada lado a lado com a 2.0 sobre as mesmas planilhas simuladas.

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

### D. Migração na cópia

| # | Passo | Esperado |
|---|---|---|
| D1 | `diagnosticarMigracaoRegistroId` | Contagens batem com as linhas fictícias preparadas (sem ID, repetido, versão inválida) |
| D2 | `executarMigracaoRegistroId` sem a propriedade | Recusa, nada gravado |
| D3 | Com a propriedade e uma linha nova acrescentada depois do diagnóstico | Recusa (plano mudou), nada gravado |
| D4 | Com o código atual | Só as colunas Registro ID e Versão mudam (comparar com a cópia de segurança); propriedade apagada |
| D5 | Rodar de novo | "Nada a fazer" |
| D6 | Conferir a aba `2021 - 2022` | Nenhuma célula alterada (histórico de versões) |

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
| — | — | — | — | Homologação não iniciada |
