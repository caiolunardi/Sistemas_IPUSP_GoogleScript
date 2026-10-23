# Regras e fluxos operacionais

## Máquina de estados

1. **Dados Pessoais:** cadastro, confirmação, documentação, contato, habilitações e pasta.
2. **Histórico Escolar:** avaliação humana das exigências e análises automáticas **consultivas**, sem avanço automático.
3. **Colação de Grau:** registro da colação realizada nas habilitações ativas.
4. **Emissão de Diploma:** registro de emissão, certificados/ofícios e e-mails.

`obterEtapaAtual_` calcula a etapa pelo conteúdo da planilha. `exigirEtapa_` e `exigirVersaoAtual_` revalidam no servidor antes de prosseguir. “Devolver para...” remove a confirmação do trecho posterior do fluxo para permitir correção. Campos de habilidades e requisitos são tratados por habilitação, com valores `SIM`/`NÃO`.

## Histórico e parecer

O documento operacional é `Histórico Escolar Completo USP (Psicólogo/Bacharelado/Licenciatura)`, conforme tipo de arquivo da aba INFOS. `HistoricoArquivo` exige candidato único com tipo, MIME e tamanho aprovados. O parser extrai texto com PDF.js. O motor compara créditos, semestres, requisitos individuais e grupos; distingue valor ausente (`null`) de zero e de requisito cumprido. O parecer é `APTO`, `NAO_APTO` ou `CONFERIR`. Curso/identidade inconciliáveis, ruleset ambíguo ou extração incompleta exigem conferência, não aprovação presumida. A Licenciatura permanece sem motor automático nesta fonte.

Quando Psicólogo e Bacharelado estão simultaneamente ativos, a análise usa o histórico de Psicólogo uma vez para as duas regras, evitando pedir dois PDFs.

## Análises registradas e PDFs

Uma sessão pode originar mais de uma linha de auditoria (por habilitação). A consulta reconstitui o resultado auditado; abrir uma análise antiga nunca executa novamente o motor. O PDF individual usa versão identificada no nome; o relatório consolidado de lote é efêmero e aceita 2–100 itens no código. O relatório é formatado via `DocumentApp`, convertido para PDF e salvo em pasta gerenciada; não existe novo modelo fixo para o relatório de histórico.

## Anexos e pastas

Pasta individual gerenciada por Nº USP no cadastro central; valida-se pertencimento à raiz. Nome de arquivo é sanitizado, upload tem limite de **15 MB** e rejeita extensões executáveis. A fonte inclui controle para não excluir indevidamente uma pasta referenciada em outro pedido do mesmo aluno. Outros tipos de arquivo são configurados na aba INFOS.

## Comunicações

Convites de colação, e-mail de diploma, lista de formandos, geração de ZIP e envio em lote. Endereços CCO são divididos em lotes de até **49** destinatários mais o destinatário principal. Endpoints de e-mail têm checagens de envio anterior, reenvio e reserva para evitar repetição indevida, sujeitos a homologação real.

## Regras de escrita

`Registro ID` único (UUID) e campo `Versão` para controle otimista, com `LockService` nas operações de escrita. Não equiparar o lock local a transação Sheets+Drive. Exclusão, e-mails e migração de dados são operações de alto impacto/críticas, com validações especiais e autorização separada.
