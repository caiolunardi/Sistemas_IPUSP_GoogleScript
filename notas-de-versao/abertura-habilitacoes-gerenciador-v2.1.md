**Gerenciador de Abertura de Habilitações (equipe)** — versão 2.1, de 22/10/2026.

**Quem acessou, no cabeçalho.** O gerenciador mostra, no alto da página, o nome completo e a observação da pessoa que entrou (colunas B e D da aba `GERENCIADOR_HABILITACOES` da planilha de permissões), em duas linhas. Sem nome cadastrado, aparece o e-mail.

**Auditoria.** Tudo o que é feito no gerenciador passa a ser registrado na planilha da chave `AUDITORIA_ABERTURA_HABILITACOES` do `ID_INDEX`, no mesmo modelo do Painel dos servidores: acessos e recusas, navegação, listas e pedidos abertos, buscas, ajuda, aparência, erros da página, e cada salvamento com o antes e o depois de cada célula (observações, situação, datas de conclusão e de aviso), o resultado do e-mail ao aluno, Preparar pedido, migração, recuperação e funções de manutenção. Nome, Nº USP e e-mail do aluno não são copiados para a auditoria; o pedido é identificado pelo Registro ID. Se a planilha da auditoria não abrir, nada é gravado e a página avisa; consultas continuam funcionando. Um gatilho diário (2h) consolida sessões e o resumo do dia. O núcleo `Auditoria.gs` passa a morar em `shared/auditoria/`, com a cópia conferida pela CI.

**Implantação:** implantada em 22/10/2026, versão 7 da implantação de produção (commit `8a3aa63`), depois da homologação (seção G de `HOMOLOGACAO.md`) e de `prepararAuditoriaHabilitacoes` em cada projeto. Voltar à 2.0 é escolher a versão anterior da implantação; a planilha de respostas não muda de formato. Esta nota não cria tag nem Release.

Detalhes: [docs/sistemas/abertura-habilitacoes/AUDITORIA.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/abertura-habilitacoes/AUDITORIA.md).
