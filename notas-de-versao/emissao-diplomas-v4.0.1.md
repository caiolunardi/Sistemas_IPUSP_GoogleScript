**Gerenciador de Colação de Grau e Diplomas** — versão 4.0.1, de 06/11/2026.

Correção de integridade, sem mudança de fluxo nem de visual além dos textos de exclusão:

- **Exclusão de registro preserva a pasta do aluno.** Antes, a pasta ia para a lixeira (e o "ID da Pasta" era apagado da planilha central) quando nenhuma outra linha tinha o link da pasta preenchido, o que acontece com linhas criadas pelo formulário ou digitadas. Agora só a linha da colação sai; pasta, arquivos e cadastro central ficam (decisão D5 do responsável, 06/11/2026).
- **Inclusão manual sem duplicidade e conferida.** "+ Adicionar Aluno" recusa um segundo registro do mesmo Nº USP na mesma colação, confere todas as colunas antes de gravar (antes podia deixar uma linha pela metade), grava a linha numa chamada só e confere depois pelo Registro ID.
- **Pasta e cadastro central com outros sistemas gravando ao mesmo tempo.** Nº USP repetido na planilha central faz a operação parar sem gravar; o autocadastro temporário (mantido até a integração com o Formulário de Pedido de Colação, decisão D6) grava a linha numa chamada só e confere; a pasta nova só é gravada depois de reler a central, e a gravada por outro sistema nunca é sobrescrita.
- Central de Ajuda 1.2 com os textos novos de exclusão e inclusão.

**Implantação:** não enviada ao Google. Envio à homologação, roteiro I1–I6 e produção dependem de autorização do responsável. Detalhes: [REVISAO_4.0.1.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/emissao-diplomas/REVISAO_4.0.1.md).
