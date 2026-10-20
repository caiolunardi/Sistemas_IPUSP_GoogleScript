# Logs, registros e retenção: inventário e pontos para decisão

**Situação:** inventário feito a partir do código em 20/10/2026. Nenhuma exclusão, anonimização ou mudança de coleta foi implementada; isso depende de decisão institucional. Achado D1 do [diagnóstico](../../governanca/DIAGNOSTICO_2026-10-20.md).

## 1. O que é registrado, onde

| Sistema | Onde | O que guarda de pessoas | Quem lê | Apagado? |
|---|---|---|---|---|
| Painel dos servidores (1.3+) | planilha `AUDITORIA_PAINEL_SERVIDORES` | e-mail, nome, tipo de conta, perfil, sessão, telas, **termos de busca**, navegador, largura da tela, tema, antes/depois das alterações | só a conta institucional (decisão 5 do [README da auditoria](../../auditoria/README.md)) | nunca (decisão 6) |
| Estrutura Curricular | abas de auditoria da grade e do painel; colunas "Alterado por" | e-mail de quem importou, alterou ou abriu a planilha das secretarias | editores das planilhas do sistema | nunca |
| Planilha das secretarias (`Protecao.gs`) | log de execuções (`console.log` do resumo) | e-mails **removidos** das proteções de aba | editores do projeto Apps Script | pela política do Google para logs de execução |
| Formulários (Exclusão, Trancamento Parcial e Total) | planilhas de respostas | o pedido inteiro (nome, nº USP, e-mails, justificativa) | equipe com acesso às planilhas | nunca; os `DADOS_E_SEGURANCA.md` dizem "guarda todos os pedidos" |
| Gerenciador de Trancamento Total | a mesma planilha de respostas | situação, data de conclusão, e-mail enviado | idem | nunca |
| Comunidade IPUSP | nada próprio; o Sheets guarda o histórico de versões | — | editores das planilhas | pelo Sheets |
| Todos | log de execuções do Apps Script (`console.error`) | mensagens técnicas; o código troca sequências longas (IDs) por `[…]` em boa parte dos registros | editores do projeto | pela política do Google |

Nenhum `console.log` encontrado grava payload completo de pedido ou dado de aluno. A conferência foi por busca em `Logger.log` e `console.*` em `sistemas/**/src` e `planilha-grade`; não substitui a leitura de cada caminho de erro.

## 2. Pontos de atenção

1. **Termos de busca e dados do navegador** no Painel dos servidores: o responsável decidiu registrar tudo (decisão 3). Termos digitados podem conter nomes de pessoas. Registro coerente com a decisão, mas é o item mais sensível do ponto de vista de minimização.
2. **Nada é apagado** em nenhuma planilha de pedidos nem de auditoria. Sem prazo de guarda, a quantidade de dados pessoais só cresce.
3. **Log de execuções com e-mails** (`Protecao.gs`): fica fora da planilha da auditoria e com regras de guarda do Google, não do Serviço de Graduação. Já estava registrado como ponto para decisão na documentação da [planilha das secretarias](../../sistemas/planilha-grade-secretarias/DADOS_E_SEGURANCA.md).
4. **Quem lê os registros** é definido pelo compartilhamento das planilhas, não pelo código. Revisão periódica dos editores: `A VALIDAR`.

## 3. Decisões que dependem do Serviço de Graduação e do Encarregado de Dados

- Prazo de guarda de cada tipo de registro (pedidos, auditoria, logs), considerando obrigações de guarda de documentos acadêmicos. **A VALIDAR INSTITUCIONALMENTE.**
- Se termos de busca e dados do navegador precisam ser guardados pelo mesmo prazo que as alterações, ou podem ser resumidos (por exemplo, só na consolidação diária) depois de um tempo.
- Forma de arquivar ou anonimizar sem quebrar a corrente de hashes da auditoria (uma linha apagada aparece como adulteração; o caminho seguro é arquivar abas inteiras de anos fechados, com a conferência de integridade feita antes e o resultado guardado).

**Nenhum agente implementa exclusão automática** antes dessas decisões.
