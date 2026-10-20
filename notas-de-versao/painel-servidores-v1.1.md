**Painel de Sistemas (servidores)** — versão 1.1, de 20/10/2026.

Controle de acesso pela aba `PAINEL_SERVIDORES` da planilha de permissões (chave `PERMISSOES_DE_ACESSO` no `ID_INDEX`):

- `ADMINISTRADOR` vê e altera tudo.
- `LEITOR` (ou perfil vazio/desconhecido) vê tudo; um aviso fixo diz "Somente leitura" e o servidor recusa qualquer gravação com "Você não tem permissão para fazer alterações…".
- Quem está fora da aba vê só a página "Sem acesso a este painel".
- Toda função chamada pela página confere o acesso no servidor; acesso da implantação: Qualquer pessoa da USP (`DOMAIN`).
- Central de Ajuda: problema e pergunta sobre o perfil de leitura.
- Novo teste `testar_acesso.js` (na CI).

**Implantação:** ainda não implantada. Esta Release marca o código do repositório; ela não atualiza o Apps Script. Quando a versão for publicada no Google, edite esta Release e registre a data.

Detalhes: [docs/sistemas/painel-servidores/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/painel-servidores/README.md).
