**Gerenciador de Colação de Grau e Diplomas** — versão 4.1.0, de 10/11/2026.

Encaminhador dos pedidos do novo Formulário de Pedido de Colação de Grau (PR 4 do plano):

- **Pedidos do formulário entram sozinhos na aba `Diplomas`.** O Formulário 2.x grava só na planilha `PEDIDOS_COLACAO` e na pasta de entrada; o Gerenciador é o único que leva o pedido à lista, sob a mesma trava das ações da equipe. Entra o pedido recebido com o cadastro confirmado (pelo formulário ou por decisão `APROVADO` do Gerenciador de Pessoas), na última versão concluída.
- **Tudo conferido antes de gravar:** cadastro único na planilha central, colunas da aba `Diplomas`, `Registro ID` sem repetição, nenhum outro registro do mesmo Nº USP na mesma colação e documentos na subpasta do protocolo. Os documentos vão para a pasta do aluno com o mesmo ID. A linha é gravada de uma vez e conferida depois.
- **Correção do aluno:** aplicada só enquanto "Status — Dados Pessoais" estiver vazio, e só nas colunas que o aluno pode corrigir; depois disso fica retida.
- **Registro na aba `ENCAMINHAMENTOS`** (`ENCAMINHADO`, `CORRECAO RETIDA` ou `BLOQUEADO`, com motivo), que o formulário lê para mostrar a situação ao aluno.
- **Faixa de pendências** no topo, só para ADMINISTRADOR, com o motivo de cada pedido que não entrou.
- **Sem autocadastro na planilha central (D6):** "Abrir/criar pasta" e o envio de anexo param, sem criar nada, quando o Nº USP não tem cadastro, e pedem o cadastro pelo Gerenciador de Pessoas.
- Funções pelo editor para criar a aba, diagnosticar e instalar ou remover o gatilho de 5 minutos, que fica sem uso: na D15 o responsável escolheu só ao abrir a página.
- Central de Ajuda 1.3: dois problemas comuns e uma pergunta nova.

**Implantação:** homologada em 10/11/2026 no projeto HOMOLOGACAO (roteiro E1–E10 e E4b; E8 adiado para a homologação do Gerenciador de Pessoas 1.5; E11 fora, sem gatilho). Produção depende de autorização do responsável. Detalhes: [ENCAMINHADOR_COLACAO.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/emissao-diplomas/ENCAMINHADOR_COLACAO.md).
