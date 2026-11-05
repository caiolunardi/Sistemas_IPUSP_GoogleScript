# Decisões do formulário 2.0

O responsável pediu, na retificação de escopo de 05/11/2026, para ser consultado antes de qualquer decisão de lógica. As perguntas abaixo foram feitas a ele no mesmo dia. Enquanto não há resposta, o código implementa a opção **recomendada**, que pode ser trocada no mesmo pull request antes do merge.

| # | Pergunta | Recomendado e implementado | Estado |
|---|---|---|---|
| 1 | Preencher `Registro ID` e `Versão` na linha nova? | Sim: UUID novo (sem repetir os da coluna) e Versão 1, só quando as duas colunas já existem; o formulário nunca as cria. | AGUARDA RESPOSTA |
| 2 | Exigir J = `Comentários, sugestões, elogios ou críticas.` e K = `Situação`, e recusar se não for? | Sim, com A–K completas (título e posição). Falta ele confirmar que a K da planilha real se chama `Situação` e que a C tem o texto da declaração. | AGUARDA RESPOSTA |
| 3 | Implantar com "Executar como: eu"? | Sim (`appsscript.json`: `USER_DEPLOYING`, `DOMAIN`). A troca na implantação é feita pelo responsável. | AGUARDA RESPOSTA |
| 4 | Recibo "não responder" ao aluno? | Sim; pede nova autorização do script (envio de e-mail). | AGUARDA RESPOSTA |
| 5 | Pedido pendente do mesmo programa pede confirmação? | Sim, só confirmação; outro programa passa sem aviso. | AGUARDA RESPOSTA |
| 6 | A planilha de alunos e a de períodos são as das chaves `PLANILHA_ALUNOS` e `PERIODOS`? | Lidas pelo `ID_INDEX`; alunos pelos títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail`, `eMail Secundario`. | AGUARDA RESPOSTA |
| 7 | Gravar com `appendRow`? | Sim. | AGUARDA RESPOSTA |

## Mantido da 1.0 sem mudança

- Regra do período: linha `Pedido de Abertura de Habilitação` na coluna A da primeira aba de Períodos; `Contínuo` abre sempre; `Sazonal` abre dentro de D–G ou H–K; linha ausente ou planilha inacessível **bloqueia**.
- Validações: Nº USP só algarismos (até 15); ano de ingresso entre 2000 e o ano atual; trancamento `Sim`/`Não`; ao menos um programa; declaração obrigatória.
- Texto da seção "Sobre a solicitação", inclusive a grafia "O prazo máximo de 15 semestre é para…", que está assim na 1.0. Corrigir é decisão editorial do responsável.
- Mensagem da tela de sucesso: "O Serviço de Graduação atenderá o seu pedido no prazo de até 10 dias úteis…".

## Fora deste trabalho

- Desligar ou alterar o vínculo do Forms original com a planilha.
- Unificar o critério de pendente do Painel (K = `pendente`) com o do Gerenciador.
- Qualquer mudança no Gerenciador 2.1.
