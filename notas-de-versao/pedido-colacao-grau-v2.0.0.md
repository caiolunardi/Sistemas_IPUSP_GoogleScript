**Formulário de Pedido de Colação de Grau** — versão 2.0.0, de 09/11/2026 (em PR).

Núcleo do novo formulário (PR 3 do plano). O pedido passa a ser gravado numa planilha própria, `PEDIDOS_COLACAO`, com protocolo `PCG-AAAAS-NNNNN`. O protocolo só aparece para o aluno depois de gravado e conferido, com a data e a hora do início do envio. Enviar de novo, inclusive depois de uma queda de conexão, não duplica o pedido: o envio continua de onde parou. Sem cadastro confirmado, o pedido é recebido do mesmo jeito e fica para conferência da equipe; a página não revela dados de outra pessoa. O aluno corrige o próprio pedido enquanto o prazo estiver aberto e a equipe não tiver começado a conferência, sem perder os documentos já enviados. Documentos só em PDF, JPG ou PNG (conferidos pelo conteúdo), até 10 MB. Recibo por e-mail e "Meus pedidos", com reenvio do comprovante.

O formulário não grava mais na aba `Diplomas` nem na planilha central de alunos: o projeto roda como a conta institucional e os alunos não precisam de acesso às planilhas. Quem levará o pedido ao Gerenciador de Colação de Grau e Diplomas é o encaminhador do PR 4.

O que copiar para o Apps Script: tudo de `sistemas/pedido-colacao-grau/src/`, num projeto **novo** (`GRADIP · Formulário de Pedido de Colação de Grau · HOMOLOGACAO`), com as chaves `PEDIDOS_COLACAO` e `PASTA_PROVISORIOS_COLACAO` no `ID_INDEX`.

**Implantação:** não homologada nem implantada. Não vai para a produção sozinha: depende dos PRs 4 e 5 e da interface do PR 7. Esta nota não cria tag nem Release.

Detalhes: [docs/sistemas/pedido-colacao-grau/](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/pedido-colacao-grau/RECEBIMENTO_2_0.md).
