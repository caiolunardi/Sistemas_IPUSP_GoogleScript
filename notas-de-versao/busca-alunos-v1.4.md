**Gerenciador de Pessoas (Comunidade IPUSP)** — versão de 09/11/2026.

Autorização no servidor. A página e todas as suas funções passam a conferir, antes de abrir qualquer cadastro, se a conta está na aba `PESSOAS_IPUSP` da planilha de permissões. O perfil **LEITOR** busca, abre a ficha só para consulta e exporta. O perfil **ADMINISTRADOR** também salva a ficha, desde que a conta seja editora da planilha daquele cadastro, como antes. Quem não está na lista vê só um aviso, sem nenhum dado. A Central de Ajuda explica o aviso. A propriedade `AMBIENTE=homologacao` passa a usar as planilhas de homologação. Busca, ficha, gravação e exportação não mudaram.

O que copiar para o Apps Script: `Codigo.gs`, `BuscaAlunosApp.html`, `BuscaAlunosAjuda.html` e os novos `PessoasAcesso.gs` e `PessoasSemAcesso.html`. O manifesto `appsscript.json` agora está no repositório, com acesso "somente eu". **Antes** de enviar, crie e preencha a aba `PESSOAS_IPUSP`; sem ela ninguém abre a página, nem a conta institucional.

**Implantação:** ainda não implantada. Esta nota não cria tag nem Release; a Release só é criada depois do merge, por decisão do responsável.

Detalhes, roteiro de homologação e pendências: [docs/sistemas/busca-alunos/](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/busca-alunos/README.md).
