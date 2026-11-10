**Gerenciador de Pessoas (Comunidade IPUSP)** — versão 1.5, de 10/11/2026.

Fila de cadastro dos pedidos de colação de grau (PR 5 do plano do novo formulário):

- **Solicitações de cadastro**, só para ADMINISTRADOR: os pedidos que o Formulário de Pedido de Colação de Grau 2.x protocolou sem confirmar o cadastro do aluno, com os documentos e os cadastros parecidos (mesmo nº USP ou mesmo e-mail). Para o LEITOR a fila não aparece.
- **Vincular** a um cadastro existente, com a opção de trocar o e-mail principal pelo do pedido (nunca automática; recusada se o e-mail estiver em outra linha); **criar** um cadastro novo (recusado se o nº USP ou o e-mail já existirem); **rejeitar** com motivo. Decidir exige ser editor da planilha de alunos.
- Cada decisão é uma linha na aba `DECISOES_CADASTRO` da planilha `PEDIDOS_COLACAO`. O Gerenciador de Diplomas leva o pedido aprovado à lista da colação.
- Central de Ajuda: seção "Solicitações de cadastro".

O que copiar para o Apps Script: `BuscaAlunosApp.html`, `BuscaAlunosAjuda.html`, `Codigo.gs` (só o comentário) e o novo `PessoasFilaCadastro.gs`. Antes de usar a fila: chave `PEDIDOS_COLACAO` no `ID_INDEX`, edição nessa planilha para a conta que executa o projeto e `prepararDecisoesCadastro` pelo editor.

**Implantação:** não enviada ao Google. Homologação (roteiro F1–F8) depende de autorização do responsável. Detalhes: [FILA_CADASTRO.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/busca-alunos/FILA_CADASTRO.md).
